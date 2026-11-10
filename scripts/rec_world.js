// World checks for scripts/rec_check.py (set and staging edges), read from a recording's chunks and block changes.
// Reads JSON on stdin: { rec: <path .rec.json[.gz]>, radius: 16, samples: [[tick, x, eyeY, z, yaw, pitch], ...],
// digs: [[tick, x, y, z, item, enchanted], ...] } (camera samples in output order, i.e. rising source ticks).
// Prints JSON on stdout: { found: [{ kind, block, x, y, z, ticks: [first, last], seen: <samples in view>, dist }],
//   digs: [{ block, ms }] } (ms: vanilla dig time on the ground with that item, Efficiency V if it's enchanted)
// kinds:
//   floating  a falling block (sand, gravel, concrete powder, anvil...) with air or a fluid under it: vanilla drops it
//   loose     a liquid that should have flowed and didn't: a source with air beside or under it, or any liquid over air
//             (a liquid that is still spreading is skipped: it has to stay like that for 2 s of water, 4 s of lava)
// Only blocks the camera can see count: within `radius`, inside a 40-degree cone around the view, and with no
// opaque block on the line from the eye.
// terrain: with `cleared: [{ x0, x1, z0, z1, y0, y1 }]` (lib/story.js clearSet records each cleared box: y0 the
//   first air layer over the set floor), natural terrain still standing in the box at the start of the recording
//   (stone, dirt, snow, gravel, ores...: a /fill layer that failed), grouped into connected lumps:
//   { block, n, x, y, z, box: [x0, y0, z0, x1, y1, z1], ticks, seen, dist } (seen: camera samples in view)
const fs = require('fs')
const zlib = require('zlib')

const inp = JSON.parse(fs.readFileSync(0, 'utf8'))
const buf = fs.readFileSync(inp.rec)
const rec = JSON.parse((inp.rec.endsWith('.gz') ? zlib.gunzipSync(buf) : buf).toString())
const R = inp.radius || 16
const samples = inp.samples || []
const Chunk = require('prismarine-chunk')(rec.version)
const md = require('minecraft-data')(rec.version)
const { Vec3 } = require('vec3')

const cols = new Map()
for (const c of rec.columns || []) cols.set(`${c.x},${c.z}`, Chunk.fromJson(c.chunk))
// the start state for the terrain check (cols gets the block changes applied as the samples go)
const start = new Map()
if ((inp.cleared || []).length) for (const c of rec.columns || []) start.set(`${c.x},${c.z}`, Chunk.fromJson(c.chunk))
let minY = -64, maxY = 320
{ const f = cols.values().next().value; if (f && typeof f.minY === 'number') { minY = f.minY; maxY = f.minY + f.worldHeight } }
const colOf = (x, z) => cols.get(`${Math.floor(x / 16) * 16},${Math.floor(z / 16) * 16}`)
const get = (x, y, z) => {
  if (y < minY || y >= maxY) return 0
  const c = colOf(x, z)
  return c ? c.getBlockStateId(new Vec3(x & 15, y, z & 15)) : -1   // -1: not loaded
}
const set = (x, y, z, s) => { const c = colOf(x, z); if (c && y >= minY && y < maxY) c.setBlockStateId(new Vec3(x & 15, y, z & 15), s) }

const B = md.blocksByName
const range = (n) => B[n] ? [B[n].minStateId, B[n].maxStateId] : [-9, -9]
const inR = (s, r) => s >= r[0] && s <= r[1]
const WATER = range('water'), LAVA = range('lava')
const AIRS = new Set(['air', 'cave_air', 'void_air'].filter(n => B[n]).map(n => B[n].minStateId))
const FALLING = new Set()
for (const b of md.blocksArray) if (/^(sand|red_sand|gravel|suspicious_sand|suspicious_gravel|\w+_concrete_powder|anvil|chipped_anvil|damaged_anvil|dragon_egg)$/.test(b.name)) for (let s = b.minStateId; s <= b.maxStateId; s++) FALLING.add(s)
// FallingBlock.isFree: air, fire, liquids, replaceable plants
const FREE = new Set(AIRS)
for (const n of ['fire', 'soul_fire', 'short_grass', 'fern', 'dead_bush']) if (B[n]) for (let s = B[n].minStateId; s <= B[n].maxStateId; s++) FREE.add(s)
const isLiquid = (s) => inR(s, WATER) || inR(s, LAVA)
const OPAQUE = new Uint8Array(md.blocksArray.reduce((m, b) => Math.max(m, b.maxStateId + 1), 0))
for (const b of md.blocksArray) if (b.boundingBox === 'block' && !b.transparent) for (let s = b.minStateId; s <= b.maxStateId; s++) OPAQUE[s] = 1
const nameOf = (s) => (md.blocksByStateId[s] || {}).name || String(s)

// is the block at p in a bad state now? -> kind or null
function bad (x, y, z) {
  const s = get(x, y, z)
  if (s < 0) return null
  if (FALLING.has(s)) { const u = get(x, y - 1, z); return (u >= 0 && (FREE.has(u) || isLiquid(u))) ? 'floating' : null }
  if (isLiquid(s)) {
    const lvl = s - (inR(s, WATER) ? WATER[0] : LAVA[0])
    if (AIRS.has(get(x, y - 1, z))) return 'loose'   // any liquid over air falls
    if (lvl === 0) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (AIRS.has(get(x + dx, y, z + dz))) return 'loose'
  }
  return null
}
const holdTicks = (s) => inR(s, LAVA) ? 80 : 40

// candidates: positions near any camera sample, scanned once from the start state; block changes re-check
// the changed block and its neighbours
const cand = new Map()   // key -> { x, y, z, kind, since, seen, first, last, dist, block }
const key = (x, y, z) => `${x},${y},${z}`
function check (x, y, z, tick) {
  const k = key(x, y, z), kind = bad(x, y, z), c = cand.get(k)
  if (!kind) { if (c) c.kind = null; return }
  if (c && c.kind === kind) return
  if (c) { c.kind = kind; c.since = tick; c.block = nameOf(get(x, y, z)) } else cand.set(k, { x, y, z, kind, since: tick, seen: 0, first: null, last: null, dist: 1e9, block: nameOf(get(x, y, z)) })
}
{
  const done = new Set()
  let y0 = Infinity, y1 = -Infinity
  for (const s of samples) { y0 = Math.min(y0, s[2]); y1 = Math.max(y1, s[2]) }
  y0 = Math.max(minY, Math.floor(y0 - R)); y1 = Math.min(maxY - 1, Math.ceil(y1 + R))
  for (const s of samples) {
    for (let cx = Math.floor((s[1] - R) / 16) * 16; cx <= s[1] + R; cx += 16) {
      for (let cz = Math.floor((s[3] - R) / 16) * 16; cz <= s[3] + R; cz += 16) {
        const k = `${cx},${cz}`
        if (done.has(k) || !cols.has(k)) continue
        done.add(k)
        const c = cols.get(k)
        for (let y = y0; y <= y1; y++) for (let dx = 0; dx < 16; dx++) for (let dz = 0; dz < 16; dz++) {
          const st = c.getBlockStateId(new Vec3(dx, y, dz))
          if (FALLING.has(st) || isLiquid(st)) check(cx + dx, y, cz + dz, -1e9)
        }
      }
    }
  }
}

// line of sight from the eye to a point: no opaque block between (the target block itself excluded)
function los (ex, ey, ez, tx, ty, tz, bx, by, bz) {
  const dx = tx - ex, dy = ty - ey, dz = tz - ez, n = Math.ceil(Math.hypot(dx, dy, dz) * 4)
  for (let i = 1; i < n; i++) {
    const u = i / n, x = Math.floor(ex + dx * u), y = Math.floor(ey + dy * u), z = Math.floor(ez + dz * u)
    if (x === bx && y === by && z === bz) continue
    const s = get(x, y, z)
    if (s > 0 && OPAQUE[s]) return false
  }
  return true
}
const COS = Math.cos(40 * Math.PI / 180)
function visible (c, s, RR = R) {
  const [, ex, ey, ez, yaw, pitch] = s
  const vx = -Math.sin(yaw) * Math.cos(pitch), vy = Math.sin(pitch), vz = -Math.cos(yaw) * Math.cos(pitch)
  // the faces a viewer could see: the bottom one for a floating block, every exposed side
  const pts = [[c.x + 0.5, c.y + 0.02, c.z + 0.5], [c.x + 0.5, c.y + 0.98, c.z + 0.5], [c.x + 0.02, c.y + 0.5, c.z + 0.5], [c.x + 0.98, c.y + 0.5, c.z + 0.5], [c.x + 0.5, c.y + 0.5, c.z + 0.02], [c.x + 0.5, c.y + 0.5, c.z + 0.98]]
  let best = null
  for (const [tx, ty, tz] of pts) {
    const dx = tx - ex, dy = ty - ey, dz = tz - ez, d = Math.hypot(dx, dy, dz)
    if (d > RR || d < 0.3) continue
    if ((dx * vx + dy * vy + dz * vz) / d < COS) continue
    if (los(ex, ey, ez, tx, ty, tz, c.x, c.y, c.z)) { best = Math.min(best ?? d, d) }
  }
  return best
}

const blocks = (rec.blocks || []).slice().sort((a, b) => a[0] - b[0])
let bi = 0
function applyBlock ([t, x, y, z, st]) {
  set(x, y, z, st)
  for (const [dx, dy, dz] of [[0, 0, 0], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
    const ss = get(x + dx, y + dy, z + dz)
    if (FALLING.has(ss) || isLiquid(ss) || cand.has(key(x + dx, y + dy, z + dz))) check(x + dx, y + dy, z + dz, t)
  }
}
// dig times: the block as it is when the dig starts (changes before that tick applied). Vanilla's formula
// (Player.getDestroySpeed / BlockBehaviour.getDestroyProgress) on the ground, out of water: the right tool's
// tier speed (+ Efficiency V = +26 if the item is enchanted), / hardness / 30 (or / 100 without a tool that can
// harvest it). prismarine-block's digTime can't be used: minecraft-data 1.21.11 gives ores the material
// 'incorrect_for_wooden_tool', so a diamond pickaxe counted as a bare hand (4.55 s for copper ore).
const TIER = { wooden: 2, stone: 4, copper: 5, iron: 6, diamond: 8, netherite: 9, golden: 12 }
function vanillaDigMs (block, itemName, enchanted) {
  const h = block.hardness
  if (h === null || h === undefined || h < 0) return null   // unbreakable
  if (h === 0) return 0
  const mat = block.material || ''
  const cats = new Set(mat.split(';').filter(m => m.startsWith('mineable/')).map(m => m.slice(9)))
  if (mat.startsWith('incorrect_for_')) cats.add('pickaxe')
  let speed = 1
  const m = /^(\w+?)_(pickaxe|shovel|axe|hoe|sword)$/.exec(itemName || '')
  if (m && cats.has(m[2]) && TIER[m[1]]) speed = TIER[m[1]]
  else if (m && m[2] === 'sword') speed = block.name === 'cobweb' ? 15 : /leaves|plant|gourd|vine/.test(mat) ? 1.5 : 1
  else if (itemName === 'shears') speed = block.name === 'cobweb' || /leaves/.test(mat) ? 15 : /wool/.test(mat) ? 5 : /vine/.test(mat) ? 2 : 1
  if (enchanted && speed > 1) speed += 26
  const it = itemName ? md.itemsByName[itemName] : null
  const canHarvest = !block.harvestTools || (it && block.harvestTools[it.id])
  const per = speed / h / (canHarvest ? 30 : 100)
  return per >= 1 ? 0 : Math.ceil(1 / per) * 50
}
const digs = (inp.digs || []).map((d, i) => ({ d, i })).sort((a, b) => a.d[0] - b.d[0])
const digOut = new Array(digs.length).fill(null)
let di = 0
function doDigs (upTo) {
  while (di < digs.length && digs[di].d[0] <= upTo) {
    const { d, i } = digs[di++]
    while (bi < blocks.length && blocks[bi][0] < d[0]) applyBlock(blocks[bi++])
    const st = get(d[1], d[2], d[3])
    if (st <= 0) continue
    const b = md.blocksByStateId[st]
    if (b) digOut[i] = { block: b.name, ms: vanillaDigMs(b, d[4], d[5]) }
  }
}
for (const s of samples) {
  const tick = s[0]
  doDigs(tick)
  while (bi < blocks.length && blocks[bi][0] <= tick) applyBlock(blocks[bi++])
  for (const c of cand.values()) {
    if (!c.kind || tick - c.since < (c.kind === 'loose' ? holdTicks(get(c.x, c.y, c.z)) : 10)) continue
    if (Math.abs(c.x - s[1]) > R + 1 || Math.abs(c.z - s[3]) > R + 1 || Math.abs(c.y - s[2]) > R + 1) continue
    const d = visible(c, s)
    if (d === null) continue
    c.seen++; c.dist = Math.min(c.dist, d); if (c.first === null) c.first = tick; c.last = tick
    c.seenKind = c.kind; c.seenBlock = c.block
  }
}
// ---- terrain left inside the cleared boxes (from the start state: the columns as recorded)
const TERRAIN = new Set()
const TERRAIN_RE = /^(stone|deepslate|tuff|granite|diorite|andesite|calcite|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|grass_block|gravel|sand|red_sand|clay|snow|snow_block|powder_snow|packed_ice|\w+_ore|mud|dripstone_block|pointed_dripstone|moss_block|bedrock)$/
for (const b of md.blocksArray) if (TERRAIN_RE.test(b.name)) for (let s = b.minStateId; s <= b.maxStateId; s++) TERRAIN.add(s)
const terrainOut = []
const TERRAIN_R = 48   // a lump of hill reads from much further than a floating sand block
for (const bx of inp.cleared || []) {
  const X0 = Math.min(bx.x0, bx.x1), X1 = Math.max(bx.x0, bx.x1), Z0 = Math.min(bx.z0, bx.z1), Z1 = Math.max(bx.z0, bx.z1)
  const Y0 = Math.max(minY, bx.y0), Y1 = Math.min(maxY - 1, bx.y1)
  if (X1 < X0 || Z1 < Z0 || Y1 < Y0) continue
  const SX = X1 - X0 + 1, SZ = Z1 - Z0 + 1, SY = Y1 - Y0 + 1
  const st0 = new Int32Array(SX * SY * SZ)   // the start state (the columns), before any block change
  const idx = (x, y, z) => ((y - Y0) * SZ + (z - Z0)) * SX + (x - X0)
  const p = new Vec3(0, 0, 0)
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    const c = start.get(`${Math.floor(x / 16) * 16},${Math.floor(z / 16) * 16}`)
    if (!c) continue
    p.x = x & 15; p.z = z & 15
    for (let y = Y0; y <= Y1; y++) { p.y = y; st0[idx(x, y, z)] = c.getBlockStateId(p) }
  }
  const seenCell = new Uint8Array(st0.length)
  for (let i = 0; i < st0.length; i++) {
    if (seenCell[i] || !TERRAIN.has(st0[i])) continue
    // a connected lump (6-neighbours)
    const q = [i]; seenCell[i] = 1
    const cells = []
    const names = new Map()
    while (q.length) {
      const j = q.pop(); cells.push(j)
      const nm = nameOf(st0[j]); names.set(nm, (names.get(nm) || 0) + 1)
      const x = X0 + j % SX, z = Z0 + Math.floor(j / SX) % SZ, y = Y0 + Math.floor(j / (SX * SZ))
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx, ny = y + dy, nz = z + dz
        if (nx < X0 || nx > X1 || ny < Y0 || ny > Y1 || nz < Z0 || nz > Z1) continue
        const k = idx(nx, ny, nz)
        if (!seenCell[k] && TERRAIN.has(st0[k])) { seenCell[k] = 1; q.push(k) }
      }
    }
    const xyz = cells.map(j => [X0 + j % SX, Y0 + Math.floor(j / (SX * SZ)), Z0 + Math.floor(j / SX) % SZ])
    const box = [0, 1, 2].map(a => Math.min(...xyz.map(v => v[a]))).concat([0, 1, 2].map(a => Math.max(...xyz.map(v => v[a]))))
    // up to 16 blocks of it, spread out, as the points the camera may see
    const probes = []
    for (let k = 0; k < xyz.length && probes.length < 16; k += Math.max(1, Math.floor(xyz.length / 16))) probes.push({ x: xyz[k][0], y: xyz[k][1], z: xyz[k][2] })
    terrainOut.push({ block: [...names.entries()].sort((a, b) => b[1] - a[1]).map(([nm, n]) => `${nm} x${n}`).join(', '), n: cells.length, x: xyz[0][0], y: xyz[0][1], z: xyz[0][2], box, probes, seen: 0, dist: 1e9, ticks: [null, null] })
  }
}
if (terrainOut.length) {
  // seen from the camera, in the world as it is at each sample (the lump may be dug out later)
  for (const [k, c] of start) cols.set(k, c)
  let bj = 0
  for (const s of samples) {
    while (bj < blocks.length && blocks[bj][0] <= s[0]) { const [, x, y, z, st] = blocks[bj++]; set(x, y, z, st) }
    for (const tr of terrainOut) {
      if (Math.max(tr.box[0] - s[1], s[1] - tr.box[3], tr.box[2] - s[3], s[3] - tr.box[5]) > TERRAIN_R + 1) continue
      let best = null
      for (const pr of tr.probes) { if (!TERRAIN.has(get(pr.x, pr.y, pr.z))) continue; const d = visible(pr, s, TERRAIN_R); if (d !== null) best = Math.min(best ?? d, d) }
      if (best === null) continue
      tr.seen++; tr.dist = Math.min(tr.dist, best); if (tr.ticks[0] === null) tr.ticks[0] = s[0]; tr.ticks[1] = s[0]
    }
  }
}
const out = [...cand.values()].filter(c => c.seen > 0).map(c => ({ kind: c.seenKind, block: c.seenBlock, x: c.x, y: c.y, z: c.z, ticks: [c.first, c.last], seen: c.seen, dist: +c.dist.toFixed(1) }))
doDigs(Infinity)
process.stdout.write(JSON.stringify({ found: out, digs: digOut, terrain: terrainOut.map(({ probes, ...t }) => ({ ...t, dist: +t.dist.toFixed(1) })), clearedBoxes: (inp.cleared || []).length }))
