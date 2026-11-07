// Node-side meshing: chunk columns from a bot recording -> per-section geometry for the page.
// Uses the same prismarine-chunk/minecraft-data as the bot, so any version mineflayer supports
// works, and the block models/textures resolved from that version's client jar.
const fs = require('fs')
const path = require('path')
const { Vec3 } = require('vec3')
const { World } = require('./world')
const { getSectionGeometry, setBiomeColors, lightmap } = require('./models')
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
    // the dimension's own height (the Nether and the End are y 0..256; the overworld -64..320):
    // with the overworld's numbers every section index was off by four and the Nether drew nothing
    const first = Object.values(this.world.columns)[0]
    if (first && typeof first.minY === 'number' && first.worldHeight) { this.minY = first.minY; this.height = first.worldHeight }
  }

  // Lowest block you can see from above anywhere in the area (ocean floors included): the top
  // solid, non-fluid block of each column, sampled every 2 blocks. Meshing starts below it.
  lowestSurface () {
    const { Vec3 } = require('vec3')
    let low = Infinity
    for (const key of Object.keys(this.world.columns)) {
      const [x0, z0] = key.split(',').map(Number)
      for (let dz = 0; dz < 16; dz += 2) {
        for (let dx = 0; dx < 16; dx += 2) {
          for (let y = this.minY + this.height - 1; y > this.minY; y--) {
            const b = this.world.getBlock(new Vec3(x0 + dx, y, z0 + dz))
            if (!b || b.name === 'air' || b.name === 'water' || b.name === 'lava' || b.name === 'cave_air' || b.name === 'kelp' || b.name === 'kelp_plant' || b.name === 'seagrass' || b.name === 'tall_seagrass' || b.name.endsWith('_leaves')) continue
            if (y < low) low = y
            break
          }
        }
      }
    }
    return low
  }

  // One block on its own (for falling-block entities): geometry relative to the block's min
  // corner, fully lit, plains tint.
  meshSingle (stateId, biome = 'plains') {
    const Chunk = require('prismarine-chunk')(this.version)
    const mcData = require('minecraft-data')(this.version)
    const w = new World(this.version)
    const col = new Chunk({ minY: this.minY, worldHeight: this.height })
    const p = new Vec3(8, 64, 8)
    col.setBlockStateId(p, stateId)
    for (let y = 48; y < 80; y++) for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) col.setSkyLight(new Vec3(x, y, z), 15)
    // the biome for tinted faces (grass, leaves): a falling grass block takes its spot's colour
    // (FallingBlockRenderer uses the level's BlockColors at the entity's position)
    const plains = (mcData.biomesByName[biome] || mcData.biomesByName.plains).id
    for (let y = 48; y < 80; y += 4) for (let x = 0; x < 16; x += 4) for (let z = 0; z < 16; z += 4) col.setBiome(new Vec3(x, y, z), plains)
    w.addColumn(0, 0, col.toJson())
    const g = getSectionGeometry(0, 64, 0, w, this.blockStates)
    // translucent blocks (honey, slime, stained glass, ice) have all their quads in the t_ arrays:
    // append them, and flag the model so it draws blended (the held honey block was invisible)
    const nv = g.positions.length / 3
    const pos = Array.from(g.positions).concat(Array.from(g.t_positions || []))
    for (let i = 0; i < pos.length; i += 3) { pos[i] += 0; pos[i + 1] += 8; pos[i + 2] += 0 }   // -> block min corner at 0
    const tIdx = Array.from(g.t_indices || []).map(i => i + nv)
    // the faces were lit with lightmap(15, 0) at the current time of day; divide it out so only the
    // face shading and tint stay. The caller multiplies by the light where the block is (held item,
    // falling block): at night the held cobblestone was lit twice, near black (worker 18, worse_lava)
    const lm = lightmap(15, 0)
    const cols = Array.from(g.colors).concat(Array.from(g.t_colors || [])).map((c, i) => Math.min(1, c / Math.max(0.01, lm[i % 3])))
    return { positions: pos, colors: cols, uvs: Array.from(g.uvs).concat(Array.from(g.t_uvs || [])), indices: Array.from(g.indices).concat(tIdx), translucent: tIdx.length > 0 }
  }

  // Compute our own light for everything from minVisibleY up (see light.js).
  // Later calls with the same area only refresh the cells setBlock changed, then propagate again.
  computeLight (minVisibleY) {
    const t = Date.now()
    const eng = this.lightEngine
    if (eng && eng.yMinArg === minVisibleY) {
      for (const [x, y, z] of this.changed) eng.update(x, y, z)
      eng.propagate()
    } else {
      this.lightEngine = new LightEngine(this.world, require('minecraft-data')(this.version), minVisibleY - 16, this.minY + this.height)
      this.lightEngine.noSky = !!this.noSky
      this.lightEngine.yMinArg = minVisibleY
      this.lightEngine.compute()
    }
    this.changed = []
    this.world.light = this.lightEngine
    return Date.now() - t
  }

  setBlock (x, y, z, stateId) {
    this.world.setBlockStateId(new Vec3(x, y, z), stateId)
    ;(this.changed || (this.changed = [])).push([x, y, z])
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

  // pack(list) split over worker threads (renderer/mesh_worker.js), in order: one blob per slice.
  // opts: { recPath, minVisibleY, brightness, dayTime, rain, thunder }
  async packParallel (list, n, opts) {
    const { Worker } = require('worker_threads')
    const per = Math.ceil(list.length / n), parts = []
    for (let i = 0; i < list.length; i += per) parts.push(list.slice(i, i + per))
    return Promise.all(parts.map(part => new Promise((resolve, reject) => {
      const w = new Worker(path.join(__dirname, 'mesh_worker.js'), { workerData: { ...opts, list: part } })
      w.once('message', (ab) => resolve(Buffer.from(ab)))
      w.once('error', reject)
      w.once('exit', (code) => { if (code) reject(new Error(`mesh worker exited ${code}`)) })
    })))
  }

  // Pack sections into one binary blob for the page: a JSON header, then for each section
  // positions/colors/uvs (float32) + indices (uint32), opaque then translucent.
  pack (list) {
    const header = [], chunks = []
    let offset = 0
    const put = (arr, T) => { const a = new T(arr); const b = Buffer.from(a.buffer, a.byteOffset, a.byteLength); const o = offset; chunks.push(b); offset += b.length; return [o, arr.length] }
    for (const { key, sx, sy, sz } of list) {
      // Vertices go out in absolute world coordinates (group at the origin): neighbouring
      // sections then share bit-identical edge vertices, so no hairline cracks between them.
      const h = { key, x: 0, y: 0, z: 0 }
      if (this.world.getColumn(sx, sz)) {
        const g = getSectionGeometry(sx, sy, sz, this.world, this.blockStates)
        const shift = (a) => { for (let i = 0; i < a.length; i += 3) { a[i] += sx + 8; a[i + 1] += sy + 8; a[i + 2] += sz + 8 } return a }
        g.positions = shift(Array.from(g.positions)); g.t_positions = shift(g.t_positions)
        h.o = [put(g.positions, Float32Array), put(g.colors, Float32Array), put(g.uvs, Float32Array), put(g.indices, Uint32Array)]
        h.t = [put(g.t_positions, Float32Array), put(g.t_colors, Float32Array), put(g.t_uvs, Float32Array), put(g.t_indices, Uint32Array)]
        if (g.e_positions.length) {
          const ei = []; for (let q = 0; q < g.e_positions.length / 12; q++) ei.push(q * 4, q * 4 + 2, q * 4 + 1, q * 4 + 1, q * 4 + 2, q * 4 + 3)
          h.e = [put(shift(g.e_positions), Float32Array), put(ei, Uint32Array)]
        }
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
