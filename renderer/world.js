// Vendored from prismarine-viewer (MIT, see LICENSE.prismarine-viewer).
const Chunks = require('prismarine-chunk')
const mcData = require('minecraft-data')

function columnKey (x, z) {
  return `${x},${z}`
}

function posInChunk (pos) {
  pos = pos.floored()
  pos.x &= 15
  pos.z &= 15
  return pos
}

function isCube (shapes) {
  if (!shapes || shapes.length !== 1) return false
  const shape = shapes[0]
  return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
}

class World {
  constructor (version) {
    this.Chunk = Chunks(version)
    this.columns = {}
    this.blockCache = {}
    this.biomeCache = mcData(version).biomes
  }

  addColumn (x, z, json) {
    const chunk = this.Chunk.fromJson(json)
    this.columns[columnKey(x, z)] = chunk
    return chunk
  }

  removeColumn (x, z) {
    delete this.columns[columnKey(x, z)]
  }

  getColumn (x, z) {
    return this.columns[columnKey(x, z)]
  }

  setBlockStateId (pos, stateId) {
    const key = columnKey(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return false

    column.setBlockStateId(posInChunk(pos.floored()), stateId)

    return true
  }

  // Sky/block light levels (0-15). Unloaded columns count as open daylight.
  getLight (pos) {
    if (this.light) {
      const l = this.light.get(pos)
      if (l[0] || l[1]) return l
      // light was computed before the stunt changed blocks: a cell that was solid then (0) and is
      // open now (a torch placed, a block broken) takes its brightest neighbour, less one
      const b = this.getBlock(pos)
      if (!b || (b.isCube && !b.transparent)) return l
      let sky = 0, blk = 0
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const n = this.light.get(pos.offset(dx, dy, dz))
        sky = Math.max(sky, n[0] - 1); blk = Math.max(blk, n[1] - 1)
      }
      if (b.name === 'torch' || b.name === 'wall_torch') blk = Math.max(blk, 14)
      return [Math.max(0, sky), Math.max(0, blk)]
    }
    const column = this.columns[columnKey(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)]
    if (!column) return [15, 0]
    const p = posInChunk(pos.floored())
    return [column.getSkyLight(p), column.getBlockLight(p)]
  }

  getBlock (pos) {
    const key = columnKey(Math.floor(pos.x / 16) * 16, Math.floor(pos.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return null

    const loc = pos.floored()
    const locInChunk = posInChunk(loc)
    const stateId = column.getBlockStateId(locInChunk)

    if (!this.blockCache[stateId]) {
      const b = column.getBlock(locInChunk)
      b.isCube = isCube(b.shapes)
      this.blockCache[stateId] = b
    }

    const block = this.blockCache[stateId]
    block.position = loc
    block.biome = this.biomeCache[column.getBiome(locInChunk)]
    if (block.biome === undefined) {
      block.biome = this.biomeCache[1]
    }
    return block
  }
}

module.exports = { World }
