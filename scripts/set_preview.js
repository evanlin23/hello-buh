// Preview a set piece without the Minecraft server: stamps the piece's voxels into a recording (a flat grass world,
// or the natural terrain of an existing recording with --base) and renders its shots with render.js.
//   node scripts/set_preview.js cottage                       -> work/set_preview/cottage_{wide,front,low}.jpg
//   node scripts/set_preview.js cottage --variant '{"palette":"spruce"}' --facing east --size 540x506
//   node scripts/set_preview.js church --base work/some.rec.json   (on that recording's terrain, at its set)
//   node scripts/set_preview.js cottage --shots door,inside    (anchor shots: stand at the anchor, look its way)
// Close enough to judge looks and staging, not proof: fence/pane/wall connections are worked out here roughly
// (the game recomputes them when /place template lands), and nothing grades the terrain (place's `fit`).
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { Vec3 } = require('vec3')
const sets = require('../lib/sets')

const args = process.argv.slice(2)
const name = args[0]
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const variant = JSON.parse(opt('variant', '{}'))
const facing = opt('facing', 'south')
const [W, H] = opt('size', '540x506').split('x').map(Number)
const outDir = opt('out', path.join(__dirname, '..', 'work', 'set_preview'))
const tag = opt('tag', name)
const VER = '1.21.11'
const Chunk = require('prismarine-chunk')(VER)
const Block = require('prismarine-block')(VER)
const md = require('minecraft-data')(VER)

let rec, X, Y, Z
const cols = new Map()
if (opt('base')) {
  rec = JSON.parse(fs.readFileSync(opt('base'), 'utf8'))
  for (const c of rec.columns) cols.set(`${c.x},${c.z}`, Chunk.fromJson(c.chunk))
  rec.poses = []; rec.timeline = []; rec.blocks = []; rec.entities = []
  X = Number(opt('x', rec.set.x)); Z = Number(opt('z', rec.set.z)); Y = null
} else {
  // a flat grass world, ±96 blocks
  const g = Block.fromProperties('grass_block', {}, 0).stateId, d = Block.fromProperties('dirt', {}, 0).stateId, s = Block.fromProperties('stone', {}, 0).stateId
  for (let cx = -96; cx < 96; cx += 16) for (let cz = -96; cz < 96; cz += 16) {
    const c = new Chunk({ minY: -64, worldHeight: 384 })
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) { for (let y = 40; y < 60; y++) c.setBlockStateId(new Vec3(x, y, z), s); for (let y = 60; y < 64; y++) c.setBlockStateId(new Vec3(x, y, z), d); c.setBlockStateId(new Vec3(x, 64, z), g); for (let y = -64; y < 40; y++) c.setBlockStateId(new Vec3(x, y, z), s) }
    const plains = md.biomesByName.plains.id
    try { for (let x = 0; x < 16; x += 4) for (let z = 0; z < 16; z += 4) for (let y = 0; y < 160; y += 4) c.setBiome(new Vec3(x, y, z), plains) } catch (e) { console.log('biome', e.message) }
    cols.set(`${cx},${cz}`, c)
  }
  rec = { version: VER, stunt: '_set_preview', grass: true, time: 6000, keepInventory: false, weather: 'clear', dimension: 'overworld', columns: [], poses: [], blocks: [], entities: [], timeline: [] }
  X = 0; Z = 0; Y = 64
}
const colAt = (x, z) => cols.get(`${Math.floor(x / 16) * 16},${Math.floor(z / 16) * 16}`)
const nameAt = (x, y, z) => { const c = colAt(x, z); if (!c) return 'air'; const id = c.getBlockStateId(new Vec3(((x % 16) + 16) % 16, y, ((z % 16) + 16) % 16)); return Block.fromStateId(id, 0).name }
// the natural ground height of a column (lib/sets/site.js GROUND), for the base terrain
const { GROUND } = require('../lib/sets/site')
const Hnat = (x, z) => { if (!colAt(x, z)) return null; for (let y = 220; y > -60; y--) { const n = nameAt(x, y, z); if (GROUND.test(n)) return /water|lava/.test(n) ? null : y } return null }

// a fake ctx: place()'s maths without a server (we only need the voxels and the world positions)
const vox = sets.build(name, variant)
const { lo, hi } = vox.bounds()
const k = Math.max(0, sets.FACES.indexOf(facing))
const [ox, oz] = sets.rotXZ(Math.floor((hi[0] - lo[0]) / 2), Math.floor((hi[2] - lo[2]) / 2), k)
const px = X - ox, pz = Z - oz
const Wd = (lx, lz) => { const [a, b] = sets.rotXZ(lx - lo[0], lz - lo[2], k); return [px + a, pz + b] }
const corners0 = [[lo[0], lo[2]], [hi[0], lo[2]], [lo[0], hi[2]], [hi[0], hi[2]]].map(([a, b]) => Wd(a, b))
const fbox = { x0: Math.min(...corners0.map(c => c[0])), x1: Math.max(...corners0.map(c => c[0])), z0: Math.min(...corners0.map(c => c[1])), z1: Math.max(...corners0.map(c => c[1])) }
if (Y === null) {   // place()'s choice: a low percentile of the ground over the footprint
  const ys = []
  for (let x = fbox.x0; x <= fbox.x1; x += 2) for (let z = fbox.z0; z <= fbox.z1; z += 2) { const h = Hnat(x, z); if (h !== null) ys.push(h) }
  ys.sort((a, b) => a - b); Y = ys[Math.floor((ys.length - 1) * 0.35)]
  console.log('ground y', Y, 'range', ys[0], '..', ys[ys.length - 1])
}
if (k !== 0) console.log('note: --facing rotates positions only; block states are not turned in this preview (the game does it on /place)')

// the stamped world: voxels by world position
const world = new Map()
// place()'s terrain fit (lib/sets/terrain.js) over the base recording's land
if (opt('base') && opt('fit', '1') !== '0') {
  const { planFit } = require('../lib/sets/terrain')
  const { parse } = require('../lib/sets/voxel')
  // the ways in (as place() works them out): door-side anchors walked out to the box edge
  const entries = []
  const FACES = ['south', 'west', 'north', 'east'], VV = { south: [0, 1], west: [-1, 0], north: [0, -1], east: [1, 0] }
  for (const n of ['doorstep', 'street', 'gate', 'entrance', 'approach', 'mouth', 'outside', 'approach_b', 'end_a']) {
    const a = vox.anchors[n]; if (!a || !VV[a.face]) continue
    const face = FACES[(FACES.indexOf(a.face) + k) & 3], v = VV[face]
    let [cx, cz] = Wd(a.x, a.z)
    const sgn = (v[0] * (cx - (fbox.x0 + fbox.x1) / 2) + v[1] * (cz - (fbox.z0 + fbox.z1) / 2)) >= 0 ? 1 : -1
    const fx = v[0] * sgn, fz = v[1] * sgn
    for (let i = 0; i < 40 && cx >= fbox.x0 && cx <= fbox.x1 && cz >= fbox.z0 && cz <= fbox.z1; i++) { cx += fx; cz += fz }
    if (!entries.some(e => e.x === cx && e.z === cz)) entries.push({ x: cx, z: cz, fx, fz })
  }
  const ops = planFit(Hnat, fbox, Y, { margin: 7, seed: (fbox.x0 * 31 + fbox.z0) | 0, entries })
  // trees on and next to the footprint go (as place() clears them)
  for (let x = fbox.x0 - 2; x <= fbox.x1 + 2; x++) for (let z = fbox.z0 - 2; z <= fbox.z1 + 2; z++) for (let y = Y - 4; y <= Y + 40; y++) if (/_log$|_leaves$/.test(nameAt(x, y, z))) world.set(`${x},${y},${z}`, { name: 'air', props: {} })
  for (const o of ops) for (let y = o.y0; y <= o.y1; y++) world.set(`${o.x},${y},${o.z}`, parse(o.block))
  console.log('fit ops', ops.length)
}
for (const [key, st] of vox.cells) {
  const [lx, ly, lz] = key.split(',').map(Number)
  const [x, z] = Wd(lx, lz)
  world.set(`${x},${Y + ly},${z}`, { ...st, props: { ...st.props } })
}
const get = (x, y, z) => world.get(`${x},${y},${z}`)?.name ?? nameAt(x, y, z)
// rough shape updates: fences, panes, bars and walls connect to their own kind and to full blocks
const SOLID = (n) => !/air|fence|pane|bars|wall$|door|trapdoor|slab|stairs|carpet|lantern|torch|sign|banner|flower|potted|grass$|fern|bush|campfire|bed$|chest|candle|rail|ladder|water|lava|cobweb|button|plate|chain|bell|leaves|tulip|poppy|dandelion|crop|wheat|carrots|potatoes|beetroots|composter|cauldron|anvil|grindstone|lectern|brewing|frame/.test(n)
const DIRS = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }
for (const [key, st] of world) {
  const [x, y, z] = key.split(',').map(Number)
  const fam = /_fence$/.test(st.name) ? 'fence' : /pane$|iron_bars/.test(st.name) ? 'pane' : /_wall$/.test(st.name) ? 'wall' : null
  if (!fam) continue
  for (const [d, [dx, dz]] of Object.entries(DIRS)) {
    const n = get(x + dx, y, z + dz)
    const on = SOLID(n) || (fam === 'fence' && /_fence$|fence_gate/.test(n)) || (fam === 'pane' && /pane$|iron_bars/.test(n)) || (fam === 'wall' && /_wall$/.test(n))
    st.props[d] = fam === 'wall' ? (on ? 'low' : 'none') : String(on)
  }
  if (fam === 'wall') st.props.up = 'true'
}
const defaults = new Map()
function stateId (st) {
  if (!defaults.has(st.name)) { const b = md.blocksByName[st.name]; defaults.set(st.name, Block.fromStateId(b.defaultState, 0).getProperties()) }
  const props = { ...defaults.get(st.name), ...st.props }
  for (const k of Object.keys(props)) props[k] = String(props[k])
  return Block.fromProperties(st.name, props, 0).stateId
}
for (const [key, st] of world) {
  const [x, y, z] = key.split(',').map(Number)
  colAt(x, z)?.setBlockStateId(new Vec3(((x % 16) + 16) % 16, y, ((z % 16) + 16) % 16), stateId(st))
}
// block entities with NBT (signs): render.js reads them from the chunk's block entities or block_entity marks
for (const [key, st] of world) {
  if (!st.nbt) continue
  const [x, y, z] = key.split(',').map(Number)
  const simple = require('prismarine-nbt').simplify({ type: 'compound', value: st.nbt })
  rec.timeline.push({ t: 0, event: 'block_entity', x, y, z, nbt: simple })
}

// the shots: place()'s three, plus anchors asked for
const set = { box: null }
const corners = [[lo[0], lo[2]], [hi[0], lo[2]], [lo[0], hi[2]], [hi[0], hi[2]]].map(([a, b]) => Wd(a, b))
const box = { x0: Math.min(...corners.map(c => c[0])), x1: Math.max(...corners.map(c => c[0])), z0: Math.min(...corners.map(c => c[1])), z1: Math.max(...corners.map(c => c[1])), y0: Y + lo[1], y1: Y + hi[1] }
set.box = box
const fx = [0, -1, 0, 1][k], fz = [1, 0, -1, 0][k], sx = -fz, sz = fx
const cx = (box.x0 + box.x1 + 1) / 2, cz = (box.z0 + box.z1 + 1) / 2, h = box.y1 - Y, s = Math.max(box.x1 - box.x0, box.z1 - box.z0) + 1
const shot = (dist, side, up, lookUp) => ({ pos: { x: cx + fx * dist + sx * side, y: Y + up, z: cz + fz * dist + sz * side }, look: { x: cx, y: Y + lookUp, z: cz } })
const shots = { wide: shot(Math.max(s, h * 1.15) * 0.95 + 6, s * 0.45, Math.max(4, h * 0.45), h * 0.3), front: shot(Math.max(s, h * 0.9) * 0.75 + 4, 0, 2.2, h * 0.3), low: shot(s * 0.55 + 3, -s * 0.35, 1.1, h * 0.45) }
const want = opt('shots', 'wide,front,low').split(',')
const YAWV = { south: [0, 1], west: [-1, 0], north: [0, -1], east: [1, 0], up: [0, 1] }
for (const n of want) {
  if (shots[n]) continue
  const a = vox.anchors[n]; if (!a) { console.log('no anchor', n); continue }
  const [x, z] = Wd(a.x, a.z), p = { x: x + 0.5, y: Y + a.y, z: z + 0.5 }
  const look = a.look ? (() => { const [lx, lz] = Wd(a.look[0], a.look[2]); return { x: lx + 0.5, y: Y + a.look[1] + 1, z: lz + 0.5 } })() : { x: p.x + YAWV[a.face][0] * 10, y: p.y + 1.4, z: p.z + YAWV[a.face][1] * 10 }
  shots[n] = { pos: { ...p, y: p.y }, look, eye: true }
}
// poses: 6 ticks per shot (a cut between)
let t = 0
const ticks = []
for (const n of want) {
  const sh = shots[n]; if (!sh) continue
  const eyeY = sh.pos.y + 1.62
  const d = { x: sh.look.x - sh.pos.x, y: sh.look.y - eyeY, z: sh.look.z - sh.pos.z }
  const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
  rec.timeline.push({ t: t * 50, event: 'cut' })
  for (let i = 0; i < 6; i++) rec.poses.push([t++, sh.pos.x, sh.pos.y, sh.pos.z, yaw, pitch, 0, 0])
  ticks.push([n, t - 2])
}
rec.columns = [...cols].map(([key, c]) => { const [x, z] = key.split(',').map(Number); return { x, z, chunk: c.toJson() } })
rec.set = { x: X, y: Y, z: Z }
rec.stunt = '_set_preview'; rec.entities = []; rec.blocks = []
rec.poses.push([t, rec.poses[t - 1][1], rec.poses[t - 1][2], rec.poses[t - 1][3], rec.poses[t - 1][4], rec.poses[t - 1][5], 0, 0])
fs.mkdirSync(outDir, { recursive: true })
const recPath = path.join(outDir, `${tag}.rec.json`), frames = path.join(outDir, `${tag}.frames`)
fs.writeFileSync(recPath, JSON.stringify(rec))
fs.rmSync(frames, { recursive: true, force: true })
execFileSync('node', [path.join(__dirname, '..', 'render.js'), recPath, frames, '20', String(W), String(H)], { env: { ...process.env, ONLY: ticks.map(x => x[1]).join(','), STUNT: '' }, stdio: ['ignore', 'inherit', 'inherit'] })
for (const [i, [n]] of ticks.entries()) {
  const f = path.join(frames, `f${String(i).padStart(5, '0')}.png`)   // ONLY renders name frames by their order
  const out = path.join(outDir, `${tag}_${n}.jpg`)
  if (fs.existsSync(f)) { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-q:v', '5', out]); console.log(out) } else console.log('missing frame', f)
}
fs.rmSync(frames, { recursive: true, force: true }); fs.rmSync(recPath, { force: true })
