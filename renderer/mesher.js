// Node-side meshing: chunk columns from a bot recording -> per-section geometry for the page.
// Uses the same prismarine-chunk/minecraft-data as the bot, so any version mineflayer supports
// works, and the block models/textures resolved from that version's client jar.
const fs = require('fs')
const path = require('path')
const { Vec3 } = require('vec3')
const { World } = require('./world')
const { getSectionGeometry, setBiomeColors } = require('./models')
const { LightEngine } = require('./light')

class Mesher {
  constructor (version) {
    this.version = version
    this.world = new World(version)
    const dir = path.join(__dirname, '..', 'work', 'assets', version)
    this.blockStates = JSON.parse(fs.readFileSync(path.join(dir, 'resolved.json')))
    this.biomes = JSON.parse(fs.readFileSync(path.join(dir, 'biomes.json')))
    setBiomeColors(this.biomes)
    this.minY = require('minecraft-data')(version).version['>=']('1.18') ? -64 : 0
    this.height = this.minY === -64 ? 384 : 256
  }

  addColumns (columns) {
    for (const c of columns) this.world.addColumn(c.x, c.z, c.chunk)
  }

  // Compute our own light for everything from minVisibleY up (see light.js).
  computeLight (minVisibleY) {
    const t = Date.now()
    const eng = new LightEngine(this.world, require('minecraft-data')(this.version), minVisibleY - 16, this.minY + this.height)
    this.world.light = eng.compute()
    return Date.now() - t
  }

  setBlock (x, y, z, stateId) {
    this.world.setBlockStateId(new Vec3(x, y, z), stateId)
  }

  // Sections that hold anything; returns [{key, sx, sy, sz}]. minVisibleY skips the deep
  // underground (invisible from the surface, and most of the vertex count).
  sections (minVisibleY = -Infinity) {
    const out = []
    for (const key of Object.keys(this.world.columns)) {
      const [x, z] = key.split(',').map(Number)
      const col = this.world.columns[key]
      for (let sy = this.minY; sy < this.minY + this.height; sy += 16) {
        const sec = col.sections ? col.sections[(sy - this.minY) >> 4] : null
        if (sec && sec.solidBlockCount === 0) continue
        if (sy + 16 < minVisibleY) continue
        out.push({ key: `${x},${sy},${z}`, sx: x, sy, sz: z })
      }
    }
    return out
  }

  // Pack sections into one binary blob for the page: a JSON header, then for each section
  // positions/colors/uvs (float32) + indices (uint32), opaque then translucent.
  pack (list) {
    const header = [], chunks = []
    let offset = 0
    const put = (arr, T) => { const a = new T(arr); const b = Buffer.from(a.buffer, a.byteOffset, a.byteLength); const o = offset; chunks.push(b); offset += b.length; return [o, arr.length] }
    for (const { key, sx, sy, sz } of list) {
      const h = { key, x: sx + 8, y: sy + 8, z: sz + 8 }
      if (this.world.getColumn(sx, sz)) {
        const g = getSectionGeometry(sx, sy, sz, this.world, this.blockStates)
        h.o = [put(g.positions, Float32Array), put(g.colors, Float32Array), put(g.uvs, Float32Array), put(g.indices, Uint32Array)]
        h.t = [put(g.t_positions, Float32Array), put(g.t_colors, Float32Array), put(g.t_uvs, Float32Array), put(g.t_indices, Uint32Array)]
      }
      header.push(h)
    }
    const hb = Buffer.from(JSON.stringify(header))
    const len = Buffer.alloc(4); len.writeUInt32LE(hb.length)
    const pad = Buffer.alloc((4 - ((4 + hb.length) % 4)) % 4)   // keep the data 4-byte aligned
    return Buffer.concat([len, hb, pad, ...chunks])
  }
}

module.exports = { Mesher }
