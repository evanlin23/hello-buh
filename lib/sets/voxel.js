// A set piece as voxels, in the piece's own frame, written out as a vanilla structure template (.nbt).
//
// The frame: x runs left to right across the front, y is up (y 0 = the ground layer: floors replace the grass),
// z runs from the back (z 0) to the front (z = depth - 1). The front faces local south (+z), so a door that opens
// to the street is `facing=south`. place() turns the whole template with /place template, so block states
// (stairs, doors, logs, signs) are rotated by the game itself, and shapes (fences, panes, walls, stair corners) are
// recomputed from their neighbours when it lands (StructureTemplate.placeInWorld: knownShape false).
//
// Cells never written are left out of the template (the terrain there stays as it is); write 'air' to clear.
const zlib = require('zlib')
const nbt = require('prismarine-nbt')
const mcData = require('minecraft-data')('1.21.11')

const DATA_VERSION = mcData.version.dataVersion   // 4671 for 1.21.11

// 'oak_stairs[facing=north,half=top]' -> { name, props }
function parse (s) {
  if (typeof s === 'object') return s
  const m = /^(?:minecraft:)?([a-z0-9_]+)(?:\[(.*)\])?$/.exec(s)
  if (!m) throw new Error(`bad block "${s}"`)
  const props = {}
  if (m[2]) for (const kv of m[2].split(',')) { const [k, v] = kv.split('='); props[k.trim()] = v.trim() }
  return { name: m[1], props }
}

// check a state against minecraft-data, so a typo fails at build time, not as a missing block on screen
const checked = new Map()
function validate (st) {
  const key = st.name + JSON.stringify(st.props)
  if (checked.has(key)) return
  const b = mcData.blocksByName[st.name]
  if (!b) throw new Error(`unknown block "${st.name}"`)
  for (const [k, v] of Object.entries(st.props)) {
    const s = (b.states || []).find(x => x.name === k)
    if (!s) throw new Error(`${st.name} has no property "${k}"`)
    const ok = s.type === 'bool' ? ['true', 'false'].includes(v) : (s.values || []).map(String).includes(String(v))
    if (!ok) throw new Error(`${st.name}[${k}=${v}]: not one of ${s.type === 'bool' ? 'true,false' : s.values}`)
  }
  checked.set(key, true)
}

const DIRS = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }
const FACE = { n: 'north', s: 'south', w: 'west', e: 'east', north: 'north', south: 'south', west: 'west', east: 'east' }
const OPP = { north: 'south', south: 'north', east: 'west', west: 'east' }
const CW = { north: 'east', east: 'south', south: 'west', west: 'north' }
const CCW = { north: 'west', west: 'south', south: 'east', east: 'north' }
const VEC = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }

class Voxels {
  constructor (name = 'piece') {
    this.name = name
    this.cells = new Map()   // 'x,y,z' -> { name, props, nbt }
    this.anchors = {}        // name -> { x, y, z, face } (local; face: the way someone standing there looks)
    this.entities = []       // live extras place() summons after the template lands: { x, y, z, cmd(pos) }
    this.rng = mulberry32(1)
  }

  seed (n) { this.rng = mulberry32(n); return this }
  rand () { return this.rng() }
  pick (arr) { return arr[Math.floor(this.rng() * arr.length)] }

  set (x, y, z, block, blockNbt) {
    const st = { ...parse(block) }
    validate(st)
    if (blockNbt) st.nbt = blockNbt
    this.cells.set(`${x},${y},${z}`, st)
    return this
  }

  get (x, y, z) { return this.cells.get(`${x},${y},${z}`) }
  has (x, y, z) { const c = this.get(x, y, z); return !!c && c.name !== 'air' }
  del (x, y, z) { this.cells.delete(`${x},${y},${z}`); return this }

  // fill a box; mode: undefined (everything), 'hollow' (shell, air inside), 'outline' (shell only),
  // 'keep' (only cells not written yet or air), 'walls' (the four sides, no top or bottom),
  // { replace: 'name' | ['a', 'b'] } (only cells holding one of those blocks)
  fill (x0, y0, z0, x1, y1, z1, block, mode) {
    ;[x0, x1] = [Math.min(x0, x1), Math.max(x0, x1)]; [y0, y1] = [Math.min(y0, y1), Math.max(y0, y1)]; [z0, z1] = [Math.min(z0, z1), Math.max(z0, z1)]
    const rep = mode && typeof mode === 'object' && mode.replace ? [].concat(mode.replace) : null
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const edgeX = x === x0 || x === x1, edgeY = y === y0 || y === y1, edgeZ = z === z0 || z === z1
      const shell = edgeX || edgeY || edgeZ
      const blk = typeof block === 'function' ? () => block(x, y, z) : () => block
      if (mode === 'hollow') { this.set(x, y, z, shell ? blk() : 'air'); continue }
      if (mode === 'outline' && !shell) continue
      if (mode === 'walls' && !(edgeX || edgeZ)) continue
      if (mode === 'keep') { const c = this.get(x, y, z); if (c && c.name !== 'air') continue }
      if (rep) { const c = this.get(x, y, z); if (!c || !rep.includes(c.name)) continue }
      this.set(x, y, z, blk())
    }
    return this
  }

  // pick per cell from a weighted mix: mix({ cobblestone: 3, mossy_cobblestone: 1 })
  mix (weights) {
    const tot = Object.values(weights).reduce((a, b) => a + b, 0)
    return () => { let r = this.rng() * tot; for (const [k, w] of Object.entries(weights)) { if ((r -= w) < 0) return k } return Object.keys(weights)[0] }
  }

  anchor (name, x, y, z, face = 's', extra = {}) { this.anchors[name] = { x, y, z, face: FACE[face] || face, ...extra }; return this }

  // a live extra: cmd(at) gets world-position helpers and returns a command (entities can't ride in our templates)
  extra (x, y, z, cmd) { this.entities.push({ x, y, z, cmd }); return this }

  // ---- building kit -------------------------------------------------------------------------------

  // a door; face = the side it opens onto (the outside)
  door (x, y, z, face, wood = 'oak', { open = false, hinge = 'left' } = {}) {
    const f = FACE[face]
    this.set(x, y, z, `${wood}_door[facing=${OPP[f]},half=lower,hinge=${hinge},open=${open}]`)
    this.set(x, y + 1, z, `${wood}_door[facing=${OPP[f]},half=upper,hinge=${hinge},open=${open}]`)
    return this
  }

  // a bed with its head at (x, y, z) and its foot one step toward `toFoot`
  bed (x, y, z, toFoot, color = 'red') {
    const f = FACE[toFoot], [dx, dz] = VEC[f]
    this.set(x, y, z, `${color}_bed[facing=${OPP[f]},part=head]`)
    this.set(x + dx, y, z + dz, `${color}_bed[facing=${OPP[f]},part=foot]`)
    return this
  }

  tall (x, y, z, plant) { this.set(x, y, z, `${plant}[half=lower]`); this.set(x, y + 1, z, `${plant}[half=upper]`); return this }

  // a gable roof over the walls x0..x1, z0..z1 whose tops are at y - 1; the ridge runs along `along`.
  // stairs, the ridge block, the gable-end fill, and `over` blocks of overhang (eaves and verges)
  roof (x0, z0, x1, z1, y, { along = 'x', stair = 'spruce_stairs', ridge = null, gable = 'oak_planks', over = 1, trim = true } = {}) {
    const slab = ridge || stair.replace('_stairs', '_slab')
    if (along === 'x') {
      let i = 0
      for (; ; i++) {
        const zf = z1 + over - i, zb = z0 - over + i, yy = y + i
        if (zb > zf) break
        if (zb === zf) { this.fill(x0 - over, yy, zb, x1 + over, yy, zb, slab.endsWith('_slab') ? `${slab}[type=bottom]` : slab); break }
        this.fill(x0 - over, yy, zf, x1 + over, yy, zf, `${stair}[facing=north]`)
        this.fill(x0 - over, yy, zb, x1 + over, yy, zb, `${stair}[facing=south]`)
        // the gable ends: the triangle of wall under this layer's slope
        const g0 = Math.max(z0, zb + 1), g1 = Math.min(z1, zf - 1)
        if (g0 <= g1) for (const gx of [x0, x1]) this.fill(gx, yy, g0, gx, yy, g1, gable)
        // an upside-down stair under the first overhang reads as a proper eave (not a floating step)
        if (trim && i === 0 && over > 0) {
          this.fill(x0 - over, yy - 1, zf, x1 + over, yy - 1, zf, `${stair}[facing=north,half=top]`, 'keep')
          this.fill(x0 - over, yy - 1, zb, x1 + over, yy - 1, zb, `${stair}[facing=south,half=top]`, 'keep')
        }
      }
      return y + i
    }
    let i = 0
    for (; ; i++) {
      const xe = x1 + over - i, xw = x0 - over + i, yy = y + i
      if (xw > xe) break
      if (xw === xe) { this.fill(xw, yy, z0 - over, xw, yy, z1 + over, slab.endsWith('_slab') ? `${slab}[type=bottom]` : slab); break }
      this.fill(xe, yy, z0 - over, xe, yy, z1 + over, `${stair}[facing=west]`)
      this.fill(xw, yy, z0 - over, xw, yy, z1 + over, `${stair}[facing=east]`)
      const g0 = Math.max(x0, xw + 1), g1 = Math.min(x1, xe - 1)
      if (g0 <= g1) for (const gz of [z0, z1]) this.fill(g0, yy, gz, g1, yy, gz, gable)
      if (trim && i === 0 && over > 0) {
        this.fill(xe, yy - 1, z0 - over, xe, yy - 1, z1 + over, `${stair}[facing=west,half=top]`, 'keep')
        this.fill(xw, yy - 1, z0 - over, xw, yy - 1, z1 + over, `${stair}[facing=east,half=top]`, 'keep')
      }
    }
    return y + i
  }

  // walls with depth: log posts on the outer line every `every` blocks (and at the corners), the panels between them
  // set back one block (so windows and doors sit recessed), a beam course on top of the posts, and a footing
  // course of mixed stone under everything. Box x0..x1, z0..z1 is the OUTER line (the posts); y 1..top are walls.
  // Returns the inner box { x0, x1, z0, z1 } (the room, inside the set-back panels).
  framed (x0, z0, x1, z1, top, { post = 'oak_log', panel = 'oak_planks', beam = 'stripped_oak_log', footing = null, every = 4, lower = null, lowerTop = 1 } = {}) {
    const foot = footing || this.mix({ cobblestone: 3, mossy_cobblestone: 2, andesite: 1 })
    this.fill(x0, 0, z0, x1, 0, z1, foot)
    // the panels one in from the posts' line
    const pz0 = z0 + 1, pz1 = z1 - 1, px0 = x0 + 1, px1 = x1 - 1
    this.fill(px0, 1, pz0, px1, top, pz1, typeof panel === 'function' ? panel : panel, 'walls')
    if (lower) this.fill(px0, 1, pz0, px1, lowerTop, pz1, lower, 'walls')   // a stone skirt: a texture gradient up the wall
    this.fill(px0 + 1, 1, pz0 + 1, px1 - 1, top, pz1 - 1, 'air')
    // posts on the outer line
    const along = (a0, a1) => { const out = [a0]; for (let a = a0 + every; a < a1 - 1; a += every) out.push(a); out.push(a1); return out }
    for (const x of along(x0, x1)) for (const z of [z0, z1]) this.fill(x, 0, z, x, top, z, `${post}[axis=y]`)
    for (const z of along(z0, z1)) for (const x of [x0, x1]) this.fill(x, 0, z, x, top, z, `${post}[axis=y]`)
    // the beam course on the outer line, and the footing ledge under the panels' outside (stairs as a plinth)
    this.fill(x0, top + 1, z0, x1, top + 1, z0, `${beam}[axis=x]`); this.fill(x0, top + 1, z1, x1, top + 1, z1, `${beam}[axis=x]`)
    this.fill(x0, top + 1, z0 + 1, x0, top + 1, z1 - 1, `${beam}[axis=z]`); this.fill(x1, top + 1, z0 + 1, x1, top + 1, z1 - 1, `${beam}[axis=z]`)
    for (let x = x0 + 1; x < x1; x++) { if (!this.has(x, 1, z0)) this.set(x, 1, z0, 'cobblestone_stairs[facing=south]'.replace('south', 'south')); if (!this.has(x, 1, z1)) this.set(x, 1, z1, 'cobblestone_stairs[facing=north]') }
    for (let z = z0 + 1; z < z1; z++) { if (!this.has(x0, 1, z)) this.set(x0, 1, z, 'cobblestone_stairs[facing=east]'); if (!this.has(x1, 1, z)) this.set(x1, 1, z, 'cobblestone_stairs[facing=west]') }
    // upper beams between posts on the outer line make the frame read as a frame (a lintel row)
    return { x0: px0 + 1, x1: px1 - 1, z0: pz0 + 1, z1: pz1 - 1, px0, px1, pz0, pz1 }
  }

  // a recessed opening in a set-back panel wall: clears the post-line cell in front so the window reads deep,
  // with a slab sill and a trapdoor lintel. (x, z) is the panel cell, outside = the face it looks out to
  sill (x, y, z, outside, { w = 1, h = 2, glass = 'glass_pane', sill = 'spruce_slab[type=top]', head = 'spruce_trapdoor' } = {}) {
    const f = FACE[outside], [ox, oz] = VEC[f], alongX = oz !== 0
    for (let i = 0; i < w; i++) {
      const cx = alongX ? x + i : x, cz = alongX ? z : z + i
      this.fill(cx, y, cz, cx, y + h - 1, cz, glass)
      this.set(cx + ox, y - 1, cz + oz, sill)
      for (let j = 0; j < h; j++) if (this.get(cx + ox, y + j, cz + oz)?.name?.endsWith('_stairs')) this.del(cx + ox, y + j, cz + oz)
      this.set(cx + ox, y + h, cz + oz, `${head}[facing=${f},half=top,open=false]`)
    }
    return this
  }

  // a contrasting trim along a gable roof's verges (the sloped edges at its two ends) and its ridge
  verge (x0, z0, x1, z1, y, { along = 'x', over = 1, trim = 'dark_oak' } = {}) {
    if (along === 'x') {
      for (let i = 0; ; i++) {
        const zf = z1 + over - i, zb = z0 - over + i, yy = y + i
        if (zb > zf) break
        for (const x of [x0 - over - 1, x1 + over + 1]) {
          if (zb === zf) { this.set(x, yy, zb, `${trim}_slab[type=bottom]`); break }
          this.set(x, yy, zf, `${trim}_stairs[facing=north]`); this.set(x, yy, zb, `${trim}_stairs[facing=south]`)
        }
        if (zb === zf) break
      }
    } else {
      for (let i = 0; ; i++) {
        const xe = x1 + over - i, xw = x0 - over + i, yy = y + i
        if (xw > xe) break
        for (const z of [z0 - over - 1, z1 + over + 1]) {
          if (xw === xe) { this.set(xw, yy, z, `${trim}_slab[type=bottom]`); break }
          this.set(xe, yy, z, `${trim}_stairs[facing=west]`); this.set(xw, yy, z, `${trim}_stairs[facing=east]`)
        }
        if (xw === xe) break
      }
    }
    return this
  }

  // a pyramid (hip) roof of stairs over a square or near-square plan, capped with `cap`
  hipRoof (x0, z0, x1, z1, y, { stair = 'dark_oak_stairs', cap = 'dark_oak_slab[type=bottom]', over = 1 } = {}) {
    let i = 0
    for (; ; i++) {
      const a0 = x0 - over + i, a1 = x1 + over - i, b0 = z0 - over + i, b1 = z1 + over - i, yy = y + i
      if (a0 > a1 || b0 > b1) break
      if (a0 === a1 || b0 === b1) { this.fill(a0, yy, b0, a1, yy, b1, cap); break }
      this.fill(a0, yy, b1, a1, yy, b1, `${stair}[facing=north]`)
      this.fill(a0, yy, b0, a1, yy, b0, `${stair}[facing=south]`)
      this.fill(a0, yy, b0 + 1, a0, yy, b1 - 1, `${stair}[facing=east]`)
      this.fill(a1, yy, b0 + 1, a1, yy, b1 - 1, `${stair}[facing=west]`)
      // corners: outer stair shapes come from the neighbours when the template lands
      if (a1 - a0 <= 1 && b1 - b0 <= 1) { i++; this.fill(a0 + 0, y + i, b0, a1, y + i, b1, cap); break }
    }
    return y + i
  }

  // a window `w` wide in a wall at y..y+h-1 running along x (at z) or along z (at x), with open trapdoor
  // shutters either side and a flower box under it when `box` (outside = the face it looks out to)
  window (x, y, z, outside, { w = 2, h = 2, glass = 'glass_pane', shutter = 'spruce_trapdoor', box = false, flowers = ['poppy', 'azure_bluet', 'cornflower', 'oxeye_daisy'] } = {}) {
    const f = FACE[outside], [ox, oz] = VEC[f], alongX = oz !== 0
    const cells = []
    for (let i = 0; i < w; i++) cells.push(alongX ? [x + i, z] : [x, z + i])
    for (const [cx, cz] of cells) this.fill(cx, y, cz, cx, y + h - 1, cz, glass)
    if (shutter) {
      const [ax, az] = alongX ? [x - 1, z] : [x, z - 1], [bx, bz] = alongX ? [x + w, z] : [x, z + w]
      const sideA = alongX ? 'west' : 'north', sideB = alongX ? 'east' : 'south'
      for (let j = 0; j < h; j++) {
        this.set(ax + ox, y + j, az + oz, `${shutter}[facing=${sideA},open=true,half=bottom]`)
        this.set(bx + ox, y + j, bz + oz, `${shutter}[facing=${sideB},open=true,half=bottom]`)
      }
    }
    if (box) {
      // a shelf (a closed top-half trapdoor) under the window, outside, with potted flowers on it
      for (const [cx, cz] of cells) {
        this.set(cx + ox, y - 1, cz + oz, `${shutter || 'spruce_trapdoor'}[facing=${f},open=false,half=top]`)
        this.set(cx + ox, y, cz + oz, `potted_${this.pick(flowers)}`)
      }
    }
    return this
  }

  // a hanging lantern on a chain (len chain links above it)
  hang (x, y, z, len = 1, lantern = 'lantern') {
    this.set(x, y, z, `${lantern}[hanging=true]`)
    for (let i = 1; i <= len; i++) this.set(x, y + i, z, 'iron_chain[axis=y]')
    return this
  }

  // a lamp post: fence posts and a lantern on top
  post (x, y, z, h = 3, fence = 'spruce_fence', lantern = 'lantern') {
    this.fill(x, y, z, x, y + h - 1, z, fence); this.set(x, y + h, z, lantern)
    return this
  }

  // a standing or wall sign; lines: up to 4 strings
  sign (x, y, z, lines, { wood = 'oak', wall = null, rotation = 0, color = 'black', glow = false, hanging = false } = {}) {
    const st = hanging ? `${wood}_hanging_sign[rotation=${rotation},attached=false]` : wall ? `${wood}_wall_sign[facing=${FACE[wall]}]` : `${wood}_sign[rotation=${rotation}]`
    return this.set(x, y, z, st, signNbt(lines, color, glow))
  }

  // a table of a fence and a pressure plate (or a slab: `top`)
  table (x, y, z, { leg = 'oak_fence', top = 'oak_pressure_plate' } = {}) { this.set(x, y, z, leg); this.set(x, y + 1, z, top); return this }
  chair (x, y, z, face, stair = 'oak_stairs') { this.set(x, y, z, `${stair}[facing=${OPP[FACE[face]]}]`); return this }   // face: the way the sitter looks

  // ---- out ----------------------------------------------------------------------------------------

  bounds () {
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
    for (const k of this.cells.keys()) {
      const p = k.split(',').map(Number)
      for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]) }
    }
    return { lo, hi, size: [hi[0] - lo[0] + 1, hi[1] - lo[1] + 1, hi[2] - lo[2] + 1] }
  }

  // the structure template (gzipped NBT), with its origin at the lowest corner (bounds().lo)
  toNbt () {
    const { lo, size } = this.bounds()
    const palette = [], index = new Map(), blocks = []
    for (const [k, st] of this.cells) {
      const key = st.name + JSON.stringify(Object.entries(st.props).sort())
      if (!index.has(key)) {
        index.set(key, palette.length)
        const e = { Name: { type: 'string', value: `minecraft:${st.name}` } }
        if (Object.keys(st.props).length) e.Properties = { type: 'compound', value: Object.fromEntries(Object.entries(st.props).map(([a, b]) => [a, { type: 'string', value: String(b) }])) }
        palette.push(e)
      }
      const p = k.split(',').map(Number)
      const b = { pos: { type: 'list', value: { type: 'int', value: [p[0] - lo[0], p[1] - lo[1], p[2] - lo[2]] } }, state: { type: 'int', value: index.get(key) } }
      if (st.nbt) b.nbt = { type: 'compound', value: st.nbt }
      blocks.push(b)
    }
    const root = {
      type: 'compound',
      name: '',
      value: {
        DataVersion: { type: 'int', value: DATA_VERSION },
        size: { type: 'list', value: { type: 'int', value: size } },
        palette: { type: 'list', value: { type: 'compound', value: palette } },
        blocks: { type: 'list', value: { type: 'compound', value: blocks } },
        entities: { type: 'list', value: { type: 'end', value: [] } }
      }
    }
    return zlib.gzipSync(nbt.writeUncompressed(root, 'big'))
  }

  count () { let n = 0; for (const c of this.cells.values()) if (c.name !== 'air') n++; return n }
}

// sign block-entity NBT (1.21.11: messages are text components; a plain string tag is literal text)
function signNbt (lines, color = 'black', glow = false) {
  const msgs = [0, 1, 2, 3].map(i => String(lines[i] || ''))
  const side = (m) => ({ type: 'compound', value: { messages: { type: 'list', value: { type: 'string', value: m } }, color: { type: 'string', value: color }, has_glowing_text: { type: 'byte', value: glow ? 1 : 0 } } })
  return { front_text: side(msgs), back_text: side(['', '', '', '']), is_waxed: { type: 'byte', value: 1 } }
}

function mulberry32 (a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}

module.exports = { Voxels, parse, validate, signNbt, mulberry32, FACE, OPP, CW, CCW, VEC, DIRS, DATA_VERSION }
