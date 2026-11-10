// Our own sky/block light engine for the recorded area, so lighting never depends on light
// packets the bot may have missed. Same rules as vanilla's light engine:
//  - sky light enters from above at 15 and travels straight down without loss through clear
//    blocks; every other step (sideways, or through a dampening block) costs max(1, opacity)
//  - opaque full cubes block light (15); leaves, water and ice dampen it by 1
//  - block light spreads from emitting blocks (torches, glowstone, lava...) the same way
const { Vec3 } = require('vec3')

// Light emission that depends on the block state (Blocks.java lightLevel functions); minecraft-data
// has one value per block (a lit redstone lamp gave 0, an unlit redstone torch 7: worker 17).
// Returns undefined for blocks whose emission doesn't depend on state.
const truthy = (v) => v === true || v === 'true'
const COPPER_BULB = { copper_bulb: 15, exposed_copper_bulb: 12, weathered_copper_bulb: 8, oxidized_copper_bulb: 4 }
function stateEmit (name, p) {
  const lit = truthy(p.lit)
  if (name === 'redstone_lamp') return lit ? 15 : 0
  const bulb = COPPER_BULB[name.replace(/^waxed_/, '')]
  if (bulb !== undefined) return lit ? bulb : 0
  if (name === 'redstone_torch' || name === 'redstone_wall_torch') return lit ? 7 : 0
  if (name === 'furnace' || name === 'blast_furnace' || name === 'smoker') return lit ? 13 : 0
  if (name === 'redstone_ore' || name === 'deepslate_redstone_ore') return lit ? 9 : 0
  if (name === 'campfire') return lit ? 15 : 0
  if (name === 'soul_campfire') return lit ? 10 : 0
  if (name === 'sea_pickle') return truthy(p.waterlogged) ? 3 + 3 * Number(p.pickles || 1) : 0
  if (name === 'light') return Number(p.level ?? 15)
  if (/candle_cake$/.test(name)) return lit ? 3 : 0
  if (/candle$/.test(name)) return lit ? 3 * Number(p.candles || 1) : 0
  if (name === 'respawn_anchor') return Math.floor(Number(p.charges || 0) / 4 * 15)
  if (name === 'cave_vines' || name === 'cave_vines_plant') return truthy(p.berries) ? 14 : 0
  return undefined
}

class LightEngine {
  constructor (world, mcData, yMin, yMax) {
    this.world = world
    this.yMin = Math.max(yMin, world.minY ?? -64)
    this.yMax = yMax
    const keys = Object.keys(world.columns).map(k => k.split(',').map(Number))
    this.x0 = Math.min(...keys.map(k => k[0])); this.z0 = Math.min(...keys.map(k => k[1]))
    this.SX = Math.max(...keys.map(k => k[0])) + 16 - this.x0
    this.SZ = Math.max(...keys.map(k => k[1])) + 16 - this.z0
    this.SY = this.yMax - this.yMin
    const n = this.SX * this.SZ * this.SY
    this.sky = new Uint8Array(n)
    this.blk = new Uint8Array(n)
    this.op = new Uint8Array(n)     // opacity per cell
    this.emit = new Uint8Array(n)
    this.mcData = mcData
    this.stateInfo = new Map()
  }

  idx (x, y, z) { return ((y - this.yMin) * this.SZ + (z - this.z0)) * this.SX + (x - this.x0) }
  inside (x, y, z) { return x >= this.x0 && x < this.x0 + this.SX && z >= this.z0 && z < this.z0 + this.SZ && y >= this.yMin && y < this.yMax }

  info (stateId, col, p) {
    let v = this.stateInfo.get(stateId)
    if (v) return v
    const b = col.getBlock(p)
    const name = b.name
    let op = 0
    if (b.isCube === undefined) b.isCube = !!(b.shapes && b.shapes.length === 1 && b.shapes[0].join() === '0,0,0,1,1,1')
    if (b.isCube && !b.transparent) op = 15
    else if (name.endsWith('_leaves') || name === 'water' || name === 'ice' || name === 'frosted_ice' || name === 'cobweb' || name === 'bubble_column') op = 1
    const md = this.mcData.blocksByName[name]
    const st = stateEmit(name, b.getProperties ? b.getProperties() : {})
    v = { op, emit: st ?? ((md && md.emitLight) || 0) }
    this.stateInfo.set(stateId, v)
    return v
  }

  compute () {
    this.fill()
    return this.propagate()
  }

  // a block changed: refresh its cell's opacity/emission (then propagate() again). Refilling the
  // whole area from the chunks was ~60% of every relight while blocks changed.
  update (x, y, z) {
    if (!this.inside(x, y, z)) return
    const cx = Math.floor(x / 16) * 16, cz = Math.floor(z / 16) * 16
    const col = this.world.columns[`${cx},${cz}`]
    if (!col) return
    const p = new Vec3(x - cx, y, z - cz)
    const s = col.getBlockStateId(p)
    const inf = s ? this.info(s, col, p) : { op: 0, emit: 0 }
    const i = this.idx(x, y, z)
    this.op[i] = inf.op; this.emit[i] = inf.emit
  }

  fill () {
    const { op, emit } = this
    const p = new Vec3(0, 0, 0)
    // fill opacity/emission from the chunks
    for (const key of Object.keys(this.world.columns)) {
      const [cx, cz] = key.split(',').map(Number)
      const col = this.world.columns[key]
      for (let y = this.yMin; y < this.yMax; y++) {
        for (let lz = 0; lz < 16; lz++) {
          for (let lx = 0; lx < 16; lx++) {
            p.x = lx; p.y = y; p.z = lz
            const s = col.getBlockStateId(p)
            if (!s) continue
            const inf = this.info(s, col, p)
            const i = this.idx(cx + lx, y, cz + lz)
            op[i] = inf.op; emit[i] = inf.emit
          }
        }
      }
    }
  }

  // sky and block light from op/emit, into fresh arrays (callers may still hold the previous ones)
  propagate () {
    const { SX, SZ, SY, op, emit } = this
    const sky = this.sky = new Uint8Array(SX * SZ * SY)
    const blk = this.blk = new Uint8Array(SX * SZ * SY)
    // the ring buffer is reused: a fresh 140 MB array per relight was a good part of each relight's time
    const queue = this.queue && this.queue.length === SX * SZ * SY + 16 ? this.queue : (this.queue = new Int32Array(SX * SZ * SY + 16))
    // sky: straight down from the top
    let qh = 0, qt = 0
    const plane = SX * SZ
    for (let z = 0; z < SZ; z++) {
      for (let x = 0; x < SX; x++) {
        let l = this.noSky ? 0 : 15   // the Nether and the End have no sky light
        for (let yy = SY - 1; yy >= 0; yy--) {
          const i = yy * plane + z * SX + x
          const o = op[i]
          if (o) l = Math.max(0, l - Math.max(1, o))
          sky[i] = l
          if (l === 0) { for (let k = yy - 1; k >= 0; k--) sky[k * plane + z * SX + x] = 0; break }
        }
      }
    }
    // seed the spread with every lit cell next to a darker one
    const nb = [1, -1, SX, -SX, plane, -plane]
    const spread = (arr) => {
      while (qh !== qt) {
        const i = queue[qh++]; if (qh === queue.length) qh = 0
        const l = arr[i]
        if (l <= 1) continue
        const x = i % SX, z = Math.floor(i / SX) % SZ, y = Math.floor(i / plane)
        for (let d = 0; d < 6; d++) {
          if ((d === 0 && x === SX - 1) || (d === 1 && x === 0) || (d === 2 && z === SZ - 1) || (d === 3 && z === 0) || (d === 4 && y === SY - 1) || (d === 5 && y === 0)) continue
          const j = i + nb[d]
          const o = op[j]
          if (o === 15) continue
          const nl = l - Math.max(1, o)
          if (nl > arr[j]) { arr[j] = nl; queue[qt++] = j; if (qt === queue.length) qt = 0 }
        }
      }
    }
    for (let i = 0; i < sky.length; i++) {
      if (sky[i] > 1) {
        const x = i % SX, z = Math.floor(i / SX) % SZ
        if ((x > 0 && sky[i - 1] < sky[i] - 1) || (x < SX - 1 && sky[i + 1] < sky[i] - 1) ||
            (z > 0 && sky[i - SX] < sky[i] - 1) || (z < SZ - 1 && sky[i + SX] < sky[i] - 1) ||
            (i >= plane && sky[i - plane] < sky[i] - 1)) { queue[qt++] = i; if (qt === queue.length) qt = 0 }
      }
    }
    spread(sky)
    for (let i = 0; i < emit.length; i++) if (emit[i]) { blk[i] = emit[i]; queue[qt++] = i; if (qt === queue.length) qt = 0 }
    spread(blk)
    return this
  }

  get (pos) {
    const x = Math.floor(pos.x), y = Math.floor(pos.y), z = Math.floor(pos.z)
    if (!this.inside(x, y, z)) return [y >= this.yMax || !this.inside(x, this.yMin, z) ? 15 : 0, 0]
    const i = this.idx(x, y, z)
    return [this.sky[i], this.blk[i]]
  }
}

module.exports = { LightEngine }
