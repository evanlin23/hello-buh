// Line of sight to every dig and place in a recording (owner, 2026-11-10: "sometimes there will be a block in the way.
// we need to ensure there is a clear line of sight to the stuff we are placing or breaking", STANDARDS 3b.4).
//   node scripts/rec_sight.js <rec.json[.gz]> [--json]
// For each dig (the harness's dig mark, to its dig_end) and each place (the kit's place_on mark, a stunt's place mark,
// or a block that appears from air within 4 ticks of a swing, near the player), in the world as it stands then (the
// recording's chunks with its block changes applied), from the recorded eye (1.62 over the feet, 1.27 crouched, a
// 'self' mark's eye) and aim:
//   hidden     no point on the block's faces (a place: the clicked face of any block it can go against) is visible
//              from the eye: another block is in between
//   crosshair  the crosshair reaches the block, but another block is hit first (counted over the dig's ticks; a place:
//              on its swing tick)
// The geometry is lib/sight.js, the same the story kit (K.dig / K.place) aims with. scripts/rec_check.py runs this
// ("sight") and turns the findings into blockers. --json: { digs, places, found: [{ kind, problem, tick, x, y, z,
// block, blocker: { name, x, y, z }, n, of, source }] }
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')
const SIGHT = require(path.join(__dirname, '..', 'lib', 'sight'))

const args = process.argv.slice(2)
const recP = args.find((a) => !a.startsWith('--'))
if (!recP) { console.error('usage: node scripts/rec_sight.js <rec.json[.gz]> [--json]'); process.exit(2) }
const buf = fs.readFileSync(recP)
const rec = JSON.parse((recP.endsWith('.gz') ? zlib.gunzipSync(buf) : buf).toString())
const out = { digs: 0, places: 0, found: [] }
if (!(rec.columns || []).length || !(rec.poses || []).length) {
  if (args.includes('--json')) console.log(JSON.stringify({ ...out, skipped: 'no chunk columns or poses in the recording' }))
  else console.log('rec_sight: no chunk columns or poses in the recording')
  process.exit(0)
}
const Chunk = require('prismarine-chunk')(rec.version)
const Block = require('prismarine-block')(rec.version)
const { Vec3 } = require('vec3')

const cols = new Map()
for (const c of rec.columns) cols.set(`${c.x},${c.z}`, Chunk.fromJson(c.chunk))
let minY = -64, maxY = 320
{ const f = cols.values().next().value; if (f && typeof f.minY === 'number') { minY = f.minY; maxY = f.minY + f.worldHeight } }
const colOf = (x, z) => cols.get(`${Math.floor(x / 16) * 16},${Math.floor(z / 16) * 16}`)
const get = (x, y, z) => { if (y < minY || y >= maxY) return 0; const c = colOf(x, z); return c ? c.getBlockStateId(new Vec3(x & 15, y, z & 15)) : 0 }
const put = (x, y, z, s) => { const c = colOf(x, z); if (c && y >= minY && y < maxY) c.setBlockStateId(new Vec3(x & 15, y, z & 15), s) }
const SH = new Map(), NM = new Map()
const info = (s) => {
  if (!SH.has(s)) { let b = null; try { b = Block.fromStateId(s, 0) } catch (e) {} SH.set(s, b && b.shapes && b.shapes.length ? b.shapes : null); NM.set(s, b ? b.name : String(s)) }
  return SH.get(s)
}
const shapesAt = (x, y, z) => info(get(x, y, z))
const nameAt = (x, y, z) => { const s = get(x, y, z); info(s); return NM.get(s) }
const AIRY = /^(air|cave_air|void_air|short_grass|tall_grass|fern|large_fern|snow|water|lava|bubble_column|dead_bush|seagrass|tall_seagrass)$/
const FLUID = /^(water|lava|bubble_column|fire|soul_fire)$/

// the eye and aim at tick k
const P = rec.poses
const tl = [...(rec.timeline || [])].sort((a, b) => a.t - b.t)
const selfEyes = tl.filter((e) => e.event === 'self' && e.eye !== undefined).map((e) => [e.t / 50, e.eye])
const eyeAt = (k) => {
  const q = P[Math.max(0, Math.min(P.length - 1, Math.round(k)))]
  let h = 1.62
  for (const [t, e] of selfEyes) if (t <= k) h = e
  if ((q[7] || 0) & 1) h -= 0.35
  return { eye: [q[1], q[2] + h, q[3]], yaw: q[4], pitch: q[5] }
}

// events, in time order
const ev = []
const marked = []   // [tick, x, y, z] of the places the timeline names (an inferred place there is the same one)
for (let i = 0; i < tl.length; i++) {
  const e = tl[i], k = e.t / 50
  if (e.event === 'dig' && Number.isFinite(e.x)) {
    const end = tl.slice(i + 1).find((x) => x.event === 'dig_end' || (x.event === 'dig' && Number.isFinite(x.x)))
    ev.push({ kind: 'dig', source: 'dig', k, end: Math.min(k + 100, end ? end.t / 50 : k + 40), pos: [e.x, e.y, e.z] })
  } else if (e.event === 'place_on' && Number.isFinite(e.x)) {
    ev.push({ kind: 'place', source: 'place_on', k, pos: [e.x, e.y, e.z], against: [e.ax, e.ay, e.az] }); marked.push([k, e.x, e.y, e.z])
  } else if (e.event === 'place' && Number.isFinite(e.x) && !e.eye) {
    const p = [Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)]
    ev.push({ kind: 'place', source: 'place', k, pos: p }); marked.push([k, ...p])
  }
}
// a block appearing from air near the player within 4 ticks of a swing, and not one of many that tick (a /fill)
{
  const swings = tl.filter((e) => e.event === 'swing').map((e) => e.t / 50)
  const B = [...(rec.blocks || [])].sort((a, b) => a[0] - b[0])
  const perTick = new Map()
  for (const b of B) perTick.set(b[0], (perTick.get(b[0]) || 0) + 1)
  // the state before each change: replay the changes on a copy of the state (the chunks are applied again below)
  const before = new Map()
  const prev = (x, y, z) => before.has(`${x},${y},${z}`) ? before.get(`${x},${y},${z}`) : get(x, y, z)
  for (const b of B) {
    const [k, x, y, z, s] = b, was = prev(x, y, z)
    before.set(`${x},${y},${z}`, s)
    info(was); info(s)
    if (!AIRY.test(NM.get(was)) || AIRY.test(NM.get(s)) || FLUID.test(NM.get(s)) || perTick.get(k) > 3) continue
    // another block beside it set the same tick: a command building a piece (a door's two halves too), not one place
    if (B.some((q) => q[0] === k && q !== b && Math.abs(q[1] - x) + Math.abs(q[2] - y) + Math.abs(q[3] - z) === 1)) continue
    const sw = swings.filter((t) => t <= k && t >= k - 4).pop()
    if (sw === undefined) continue
    if (marked.some((m) => Math.abs(m[0] - k) <= 6 && m[1] === x && m[2] === y && m[3] === z)) continue
    const { eye } = eyeAt(sw)
    if (Math.hypot(x + 0.5 - eye[0], y + 0.5 - eye[1], z + 0.5 - eye[2]) > 6) continue
    ev.push({ kind: 'place', source: 'inferred', k: sw, at: k, pos: [x, y, z], block: NM.get(s) })
  }
}
ev.sort((a, b) => (a.at ?? a.k) - (b.at ?? b.k))

// walk the block changes forward with the events (the world just before each)
const B = [...(rec.blocks || [])].sort((a, b) => a[0] - b[0])
let bi = 0
const near = (p, q, d) => Math.hypot(p[0] + 0.5 - q[0], p[1] + 0.5 - q[1], p[2] + 0.5 - q[2]) <= d
for (const e of ev) {
  const T = e.at ?? e.k
  while (bi < B.length && B[bi][0] < (e.kind === 'dig' ? e.k : T)) { const b = B[bi++]; put(b[1], b[2], b[3], b[4]) }
  const { eye } = eyeAt(e.k)
  if (!near(e.pos, eye, 8)) continue   // not the player's (a stunt's prop far away)
  const blocker = (b) => b && { name: nameAt(b.x, b.y, b.z), x: b.x, y: b.y, z: b.z }
  if (e.kind === 'dig') {
    out.digs++
    const name = nameAt(...e.pos)
    const t = [{ pos: e.pos }]
    const s = SIGHT.bestOf(eye, t, shapesAt)
    if (!s.point) { out.found.push({ kind: 'dig', problem: 'hidden', tick: e.k, x: e.pos[0], y: e.pos[1], z: e.pos[2], block: name, blocker: blocker(s.blocker), source: e.source }); continue }
    let n = 0, of = 0, first = null
    for (let k = Math.ceil(e.k); k <= e.end; k++) {
      const a = eyeAt(k), c = SIGHT.crosshair(a.eye, a.yaw, a.pitch, [e.pos], shapesAt)
      if (!c.enters) continue
      of++
      if (!c.on) { n++; if (!first) first = { k, b: c.blocker } }
    }
    if (n) out.found.push({ kind: 'dig', problem: 'crosshair', tick: first.k, x: e.pos[0], y: e.pos[1], z: e.pos[2], block: name, blocker: blocker(first.b), n, of, source: e.source })
  } else {
    out.places++
    let cands
    if (e.against) {
      const n = e.pos.map((v, i) => v - e.against[i])
      cands = [{ pos: e.against, faces: Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]) === 1 ? [n] : null, skip: [e.pos] }]
    } else cands = SIGHT.supportsOf(e.pos, shapesAt)
    if (!cands.length) cands = [{ pos: e.pos }]
    const name = e.block || 'block'
    const s = SIGHT.bestOf(eye, cands, shapesAt)
    if (!s.point) { out.found.push({ kind: 'place', problem: 'hidden', tick: e.k, x: e.pos[0], y: e.pos[1], z: e.pos[2], block: name, against: cands.map((c) => `${nameAt(...c.pos)} at ${c.pos.join(' ')}`), blocker: blocker(s.blocker), source: e.source }); continue }
    const a = eyeAt(e.k), c = SIGHT.crosshair(a.eye, a.yaw, a.pitch, [...cands.map((q) => q.pos), e.pos], shapesAt)
    if (c.enters && !c.on) out.found.push({ kind: 'place', problem: 'crosshair', tick: e.k, x: e.pos[0], y: e.pos[1], z: e.pos[2], block: name, blocker: blocker(c.blocker), n: 1, of: 1, source: e.source })
  }
}

if (args.includes('--json')) console.log(JSON.stringify(out))
else {
  console.log(`rec_sight ${path.basename(recP)}: ${out.digs} dig(s), ${out.places} place(s), ${out.found.length} problem(s)`)
  for (const f of out.found) {
    const by = f.blocker ? `${f.blocker.name} at ${f.blocker.x} ${f.blocker.y} ${f.blocker.z}` : 'nothing faces the eye'
    console.log(`  src ${(f.tick / 20).toFixed(2)}s (tick ${Math.round(f.tick)}) ${f.kind} ${f.block} at ${f.x} ${f.y} ${f.z} [${f.source}]: ` +
      (f.problem === 'hidden' ? `no face visible from the eye (${by} in the way)` : `the crosshair hits ${by} first on ${f.n}/${f.of} tick(s)`))
  }
}
