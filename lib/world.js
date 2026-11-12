// The HelloBuh shared world (docs/world/canon.md, docs/world/map.json): every story happens in one persistent world,
// seed "hellobuh", and every place in it has ONE canonical spot. run.sh wipes the server's world at the start of every
// run; the seed regenerates the terrain and the vanilla villages exactly, and this module rebuilds our additions (set
// pieces, the dog on his hill, the boxed bell, the totem wall...) at their canonical coordinates, as they stand on a
// given day of the world's timeline. So a recording made today and one made in a month show the same place.
//
//   const world = require('../lib/world')
//   // in setup (op, creative):
//   const W = await world.build(ctx, { story: 'dog_hill' })              // the story's places, as of its date
//   const W = await world.build(ctx, { places: ['hushwell', 'dog_hill'], day: 2400 })
//   const D = W.places.dog_hill.origin                                   // { x, y, z } the place's canonical origin
//   W.places.hushwell.pieces.tavern.anchors.door                         // a built piece (lib/sets place() result)
//   W.cameos                                                             // the easter eggs in view of these places (built)
//   world.origin('dog_hill')                                             // { x, y, z } without building anything
//
// A place in another dimension says so: `dimension: "the_nether"` (or "the_end"; none = the Overworld), its x, z are
// that dimension's own coordinates, and its footprint only clashes with places in the same dimension. world.build takes
// the bot there first (world.enter) and reads the ground under the Nether's roof (lib/sets/site.js column).
//
// A canonical place never moves: after world.build (or world.canon(ctx)), sets.planSite / findSite / findShore refuse
// to choose ground, because a place chosen per run would land somewhere else next time. A new place is claimed in
// docs/world/map.json first (node scripts/world.js claim ...), then built here like the others.
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.join(__dirname, '..')
const MAP_FILE = process.env.HB_WORLD_MAP ? path.resolve(process.env.HB_WORLD_MAP) : path.join(ROOT, 'docs', 'world', 'map.json')   // (HB_WORLD_MAP: a test map)
const DIMENSIONS = ['overworld', 'the_nether', 'the_end']
// a place's dimension (map.json `dimension`; none = the Overworld), as the server names it without "minecraft:"
const dimName = (d) => String(d || 'overworld').replace(/^minecraft:/, '')
const dimOf = (name) => dimName(place(name).dimension)
const SERVER_WORLD = () => process.env.MC_WORLD || path.join(ROOT, 'work', 'server', 'world')
const MARK = 'hellobuh_world.json'      // what the builder has already put into this server world (a restored snapshot)

let _map = null
function loadMap (fresh = false) {
  if (!_map || fresh) _map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'))
  return _map
}
function cacheDir (name) { return path.join(process.env.HB_WORLD_CACHE || path.join(os.homedir(), '.cache', 'hellobuh', 'world'), name) }

function place (name) {
  const p = loadMap().places[name]
  if (!p) throw new Error(`world: no place "${name}" in docs/world/map.json (have: ${Object.keys(loadMap().places).join(', ')})`)
  return p
}
const origin = (name) => { const a = place(name).at; return { x: a[0], y: a[1], z: a[2] } }

// a story's places and date (map.json `stories`)
function storyOf (story) {
  const s = loadMap().stories[story]
  if (!s) throw new Error(`world: story "${story}" isn't in docs/world/map.json "stories": claim its place and date first (docs/world/canon.md, "Add a story")`)
  return s
}

// the place whose footprint holds (x, z) in that dimension (default the Overworld), or null
function at (x, z, dimension = 'overworld') {
  // the most specific place: the smallest footprint holding the point (a landmark inside a village inside a region)
  let best = null, area = Infinity
  for (const [k, p] of Object.entries(loadMap().places)) {
    if (dimName(p.dimension) !== dimName(dimension)) continue
    const f = p.footprint
    if (!f || x < f[0] || x > f[2] || z < f[1] || z > f[3]) continue
    const a = (f[2] - f[0] + 1) * (f[3] - f[1] + 1)
    if (a < area) { best = k; area = a }
  }
  return best
}

const live = (item, day) => (item.since ?? -Infinity) <= day && day < (item.until ?? Infinity)

// mark the context as building in the shared world: lib/sets' site searches refuse from here on
function canon (ctx, info = {}) {
  ctx.world = { ...(ctx.world || {}), ...info, canon: true }
  return ctx.world
}

function hashOf (obj) { return crypto.createHash('sha1').update(JSON.stringify(obj)).digest('hex').slice(0, 12) }

function readMark () {
  try { return JSON.parse(fs.readFileSync(path.join(SERVER_WORLD(), MARK), 'utf8')) } catch (e) { return { seed: null, built: {} } }
}
function writeMark (m) {
  try { fs.mkdirSync(SERVER_WORLD(), { recursive: true }); fs.writeFileSync(path.join(SERVER_WORLD(), MARK), JSON.stringify(m)) } catch (e) {}
}

// one stamp: a small deterministic operation at absolute coordinates (map.json places[].stamps[])
function stampCmds (s) {
  const P = (p) => p.join(' ')
  switch (s.do) {
    case 'summon': return [`/summon ${s.mob} ${P(s.pos)} ${s.nbt || ''}`.trim()]
    case 'setblock': return [`/setblock ${P(s.pos)} ${s.block}`]
    case 'fill': return [`/fill ${P(s.from)} ${P(s.to)} ${s.block}${s.mode ? ' ' + s.mode : ''}`]
    case 'frame': return [`/summon item_frame ${s.pos.map((v, i) => i === 1 ? v : v + 0.5).join(' ')} {Facing:${s.facing ?? 3}b,Fixed:1b,Invulnerable:1b${s.item ? `,Item:{id:"${s.item}",count:1}` : ''}}`]
    case 'sign': {
      const lines = (s.text || '').split('|').slice(0, 4)
      while (lines.length < 4) lines.push('')
      const msgs = lines.map(t => `'${JSON.stringify(t)}'`).join(',')
      return [`/setblock ${P(s.pos)} ${s.block || 'oak_sign'}[rotation=${s.rotation ?? 0}]`, `/data merge block ${P(s.pos)} {front_text:{messages:[${msgs}]}}`]
    }
    case 'cmds': return s.cmds
    case 'ravine': return ravineCmds(s)
    case 'crater': return craterCmds(s)
    case 'rails': return []   // laid on the terrain by sets.dress.rails in build() (it reads the ground)
    case 'torches': return []   // a torch on every sturdy top in the box, by sets.dress.torches in build() (it reads what's built)
    default: throw new Error(`world: unknown stamp "${s.do}" (${s.id})`)
  }
}

// A dry ravine cut across a plateau along x from x0 to x1 (deterministic, so the same every run): its centre line
// meanders round z, its floor (y0 at x0 falling `fall` blocks per block eastward, never under `min`) is `floor` wide
// with gravel and coarse dirt, its walls climb `wall` blocks per block out from the floor; everything above to `top`
// is air. s: { x0, x1, z, y0, fall, min, floor, wall, top, wiggle }
function ravineCmds (s) {
  const out = []
  const half = (s.floor || 6) / 2, wall = s.wall || 2.2, top = s.top || 126
  for (let x = s.x0; x <= s.x1; x++) {
    const zc = s.z + (s.wiggle ?? 2) * Math.sin((x - s.x0) / 9) + Math.sin((x - s.x0) / 3.3) * 0.6
    const fy = Math.max(s.min ?? 60, Math.round(s.y0 - (x - s.x0) * (s.fall ?? 0.35)))
    // narrower at its western head, where it starts
    const head = Math.min(1, (x - s.x0 + 2) / 12)
    const reach = Math.ceil((half + (top - fy) / wall) * head) + 1
    for (let z = Math.floor(zc - reach); z <= Math.ceil(zc + reach); z++) {
      const d = Math.abs(z - zc) / head
      const y = Math.round(d <= half ? fy : fy + (d - half) * wall)
      if (y >= top) continue
      out.push(`/fill ${x} ${y + 1} ${z} ${x} ${top} ${z} air`)
      if (d <= half) out.push(`/setblock ${x} ${y} ${z} ${((x * 7 + z * 13) & 3) === 0 ? 'coarse_dirt' : ((x * 5 + z * 3) & 7) === 1 ? 'mossy_cobblestone' : 'gravel'}`)
    }
  }
  return out
}

// A creeper crater, long grown over: a bowl `r` across at (x, y, z) (y = the surface it was blown into), `depth`
// deep, all grass, with ferns, short grass and a few dandelions (deterministic). s: { pos: [x, y, z], r, depth }
function craterCmds (s) {
  const [cx, cy, cz] = s.pos, r = s.r || 3.6, D = s.depth || 3, out = []
  const R = Math.ceil(r) + 1
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -R; dz <= R; dz++) {
      const d = Math.hypot(dx, dz)
      if (d > r) continue
      const fy = cy - Math.max(0, Math.round(D * Math.sqrt(Math.max(0, 1 - (d / (r + 0.6)) ** 2))))
      out.push(`/fill ${cx + dx} ${fy + 1} ${cz + dz} ${cx + dx} ${cy + 4} ${cz + dz} air`)
      out.push(`/fill ${cx + dx} ${fy - 2} ${cz + dz} ${cx + dx} ${fy - 1} ${cz + dz} dirt`)
      out.push(`/setblock ${cx + dx} ${fy} ${cz + dz} grass_block`)
      const k = ((dx + 7) * 31 + (dz + 7) * 17) % 11
      if (k < 3) out.push(`/setblock ${cx + dx} ${fy + 1} ${cz + dz} short_grass`)
      else if (k < 5) out.push(`/setblock ${cx + dx} ${fy + 1} ${cz + dz} fern`)
    }
  }
  for (const [dx, dz] of s.flowers || [[-1, 1], [2, -1]]) out.push(`/setblock ${cx + dx} ${cy - D + 1} ${cz + dz} dandelion`)
  return out
}

// Take the bot to (x, y, z) in another dimension (/execute in ... run tp: no portal, no loading screen) and wait until
// the client is there with the chunks around it. Commands from the bot run in its dimension from then on (/fill,
// /forceload, /summon, the recording: rec.dimension). dim: 'the_nether' | 'the_end' | 'overworld'.
async function enter (ctx, dim, x, y, z, ms = 90000) {
  const { bot } = ctx
  const want = dimName(dim)
  if (!DIMENSIONS.includes(want)) throw new Error(`world.enter: no dimension "${dim}" (${DIMENSIONS.join(', ')})`)
  const here = () => dimName(bot.game && bot.game.dimension)
  await ctx.cmd(`/execute in minecraft:${want} run tp @s ${x} ${y} ${z}`)
  const t0 = Date.now()
  while (here() !== want) {
    if (Date.now() - t0 > ms) throw new Error(`world.enter: still in ${here()} after ${ms / 1000} s (wanted ${want})`)
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (ctx.waitChunks) await ctx.waitChunks({ x0: x - 24, z0: z - 24, x1: x + 24, z1: z + 24 }, ms)
  await bot.waitForTicks(10)
  ctx.log(`world: in ${want} at ${x} ${y} ${z}`)
}

// Build places at their canonical spots. opts: { story } (its places + date + cameos from map.json), or
// { places: [...], day: N }; cameos: false to skip the easter eggs; check: true (default) compares the ground under
// each piece with the surveyed height (a different seed or a changed piece shows up as a mismatch).
async function build (ctx, opts = {}) {
  const sets = require('./sets')
  const M = loadMap(true)
  let names = opts.places, day = opts.day, cameoNames = opts.cameos
  if (opts.story) {
    const s = storyOf(opts.story)
    names = names || s.places
    day = day ?? s.day
    if (cameoNames === undefined) cameoNames = s.cameos || []
  }
  if (!names || !names.length) throw new Error('world.build: no places (pass { story } or { places, day })')
  if (day === undefined) throw new Error('world.build: no day (the world timeline, docs/world/canon.md)')
  canon(ctx, { story: opts.story || null, day, places: names })
  const mark = readMark()
  if (mark.seed && mark.seed !== M.seed) ctx.log(`world: this server world was built for seed ${mark.seed}, the map says ${M.seed}`)
  mark.seed = M.seed
  const out = { day, places: {}, cameos: [] }
  const want = [...names]
  for (const c of cameoNames || []) { const cm = M.cameos[c]; if (!cm) throw new Error(`world: no cameo "${c}"`); if (!want.includes(cm.place)) want.push(cm.place) }
  // the area to load: every footprint we touch (in the bot's dimension now; another dimension's once the bot is there)
  const here = () => dimName(ctx.bot.game && ctx.bot.game.dimension)
  for (const name of want) {
    if (dimOf(name) !== here()) continue
    const p = place(name)
    const f = p.footprint || [p.at[0] - 16, p.at[2] - 16, p.at[0] + 16, p.at[2] + 16]
    await sets.forceload(ctx, f[0] - 8, f[1] - 8, f[2] + 8, f[3] + 8)
  }
  for (const name of want) {
    const p = place(name)
    const full = names.includes(name)
    // the bot reads the natural ground for the terrain fit: be over the place with its chunks in
    const f = p.footprint || [p.at[0] - 16, p.at[2] - 16, p.at[0] + 16, p.at[2] + 16]
    const dim = dimOf(name)
    if (dim !== here()) {
      // another dimension: go there (over the place, under the Nether's roof), then load its footprint
      await enter(ctx, dim, p.at[0], dim === 'overworld' ? p.at[1] + 40 : p.at[1] + 2, p.at[2])
      await sets.forceload(ctx, f[0] - 8, f[1] - 8, f[2] + 8, f[3] + 8)
    }
    // the Nether's ground is under its bedrock roof: the ground readings start from just above the place
    ctx.groundTop = dim === 'the_nether' ? p.at[1] + 24 : undefined
    const me = ctx.bot.entity.position
    if (Math.abs(me.x - p.at[0]) > 48 || Math.abs(me.z - p.at[2]) > 48) { await ctx.cmd(`/tp @s ${p.at[0]} ${dim === 'overworld' ? p.at[1] + 40 : p.at[1] + 2} ${p.at[2]}`); await new Promise(resolve => setTimeout(resolve, 1500)) }
    if (ctx.waitChunks) await ctx.waitChunks({ x0: f[0] - 12, z0: f[1] - 12, x1: f[2] + 12, z1: f[3] + 12 }, 90000)
    const res = { name, origin: origin(name), pieces: {}, stamps: [] }
    // a cameo-only place builds just what its cameos need (and what they stand on)
    const need = full ? null : new Set((cameoNames || []).filter(c => M.cameos[c].place === name).flatMap(c => M.cameos[c].needs || []))
    // terrain-shaping stamps (`first: true`: a ravine a bridge spans) go before the pieces, the rest after them
    const stamp = async (st) => {
      if (!live(st, day) || (need && !need.has(st.id))) return
      const key = `${name}/${st.id}`, h = hashOf(st)
      if (mark.built[key] === h && !st.live) return   // mobs (live) are summoned every run: entities aren't in region files' blocks
      if (st.do === 'rails') await sets.dress.rails(ctx, st.pts, st.opts || {})
      else if (st.do === 'torches') { const [x0, z0, x1, z1] = st.box; await sets.dress.torches(ctx, { x0, z0, x1, z1, yTop: st.yTop ?? 160, skip: new Set(st.skip || []) }) }
      else await sets.burst(ctx, stampCmds(st))
      if (!st.live) mark.built[key] = h
      res.stamps.push(st.id)
    }
    for (const st of (p.stamps || []).filter(st => st.first)) await stamp(st)
    for (const pc of p.pieces || []) {
      if (!live(pc, day) || (need && !need.has(pc.id))) continue
      const key = `${name}/${pc.id}`, h = hashOf(pc)
      if (opts.check !== false) {
        const g = sets.ground(ctx, { x0: pc.x - 2, x1: pc.x + 2, z0: pc.z - 2, z1: pc.z + 2 }, 0.5)
        if (g !== null && mark.built[key] !== h && Math.abs(g - pc.y) > 3) ctx.log(`world: ${key} ground ${g} here, the map says ${pc.y} (seed or terrain changed? fix map.json)`)
      }
      if (mark.built[key] === h) { ctx.log(`world: ${key} already built (snapshot)`); res.pieces[pc.id] = placedSet(sets, pc); continue }
      res.pieces[pc.id] = await sets.place(ctx, pc.piece, { x: pc.x, z: pc.z, y: pc.y, facing: pc.facing || 'south', variant: pc.variant || {}, fit: pc.fit !== false, margin: pc.margin, banks: pc.banks })
      mark.built[key] = h
    }
    for (const st of (p.stamps || []).filter(st => !st.first)) await stamp(st)
    out.places[name] = res
    ctx.groundTop = undefined
  }
  for (const c of cameoNames || []) out.cameos.push({ id: c, ...M.cameos[c] })
  writeMark(mark)
  if (process.env.WORLD_SAVE_SNAPSHOT) await snapshot(ctx, process.env.WORLD_SAVE_SNAPSHOT)   // run.sh WORLD_SNAPSHOT=<name> restores it
  ctx.log(`world: built ${want.join(', ')} as of day ${day}${(cameoNames || []).length ? ` (cameos: ${cameoNames.join(', ')})` : ''}`)
  return out
}

// a piece's set object (anchors, shots) without placing it again: the same maths place() uses
function placedSet (sets, pc) {
  const vox = sets.build(pc.piece, pc.variant || {})
  const { lo, hi } = vox.bounds()
  const FACES = ['south', 'west', 'north', 'east']
  const k = Math.max(0, FACES.indexOf(pc.facing || 'south'))
  const [ox, oz] = sets.rotXZ(Math.floor((hi[0] - lo[0]) / 2), Math.floor((hi[2] - lo[2]) / 2), k)
  const px = pc.x - ox, pz = pc.z - oz
  const W = (lx, lz) => { const [a, b] = sets.rotXZ(lx - lo[0], lz - lo[2], k); return [px + a, pz + b] }
  const anchors = {}
  for (const [n, a] of Object.entries(vox.anchors)) { const [x, z] = W(a.x, a.z); anchors[n] = { x: x + 0.5, y: pc.y + a.y, z: z + 0.5 } }
  return { name: pc.piece, anchors, restored: true }
}

// after building: save this server world's region files for the next run (run.sh WORLD_SNAPSHOT=<name> restores it)
async function snapshot (ctx, name) {
  await ctx.cmd('/save-all flush')
  await new Promise(resolve => setTimeout(resolve, 6000))
  const src = SERVER_WORLD(), dst = cacheDir(path.join('snap', name))
  fs.rmSync(dst, { recursive: true, force: true })
  fs.cpSync(src, dst, { recursive: true, filter: (f) => !/session\.lock$|playerdata|advancements|stats/.test(f) })
  ctx.log(`world: snapshot ${dst}`)
  return dst
}

// validate map.json (node scripts/world.js check): required fields, footprints that overlap, pieces that exist,
// stories that name unknown places, cameos that point nowhere. Returns a list of problems.
function check (M = loadMap(true)) {
  const errs = []
  let PIECES = {}
  try { PIECES = require('./sets/pieces') } catch (e) {}
  const P = Object.entries(M.places || {})
  for (const [k, p] of P) {
    if (!p.name) errs.push(`${k}: no name`)
    if (!Array.isArray(p.at) || p.at.length !== 3) errs.push(`${k}: at must be [x, y, z]`)
    if (p.dimension !== undefined && !DIMENSIONS.includes(dimName(p.dimension))) errs.push(`${k}: dimension must be one of ${DIMENSIONS.join(', ')} (got "${p.dimension}")`)
    if (p.footprint && (p.footprint.length !== 4 || p.footprint[0] > p.footprint[2] || p.footprint[1] > p.footprint[3])) errs.push(`${k}: footprint must be [x0, z0, x1, z1]`)
    if (p.at && p.footprint && !(p.at[0] >= p.footprint[0] && p.at[0] <= p.footprint[2] && p.at[2] >= p.footprint[1] && p.at[2] <= p.footprint[3])) errs.push(`${k}: at is outside its footprint`)
    for (const pc of p.pieces || []) {
      if (!pc.id || !pc.piece) errs.push(`${k}: a piece without id/piece`)
      else if (Object.keys(PIECES).length && !PIECES[pc.piece]) errs.push(`${k}/${pc.id}: no set piece "${pc.piece}"`)
      for (const f of ['x', 'y', 'z']) if (typeof pc[f] !== 'number') errs.push(`${k}/${pc.id}: ${f} must be a number (canonical, never searched for)`)
    }
    for (const st of p.stamps || []) { try { stampCmds(st) } catch (e) { errs.push(`${k}: ${e.message}`) } }
  }
  // footprints of different places overlap only when one is a region holding the other
  for (let i = 0; i < P.length; i++) {
    for (let j = i + 1; j < P.length; j++) {
      const [a, pa] = P[i], [b, pb] = P[j]
      const fa = pa.footprint, fb = pb.footprint
      if (!fa || !fb || pa.kind === 'region' || pb.kind === 'region' || pa.within === b || pb.within === a) continue
      if (dimName(pa.dimension) !== dimName(pb.dimension)) continue   // the Nether's (-16, -118) is not the Overworld's
      if (fa[0] <= fb[2] && fb[0] <= fa[2] && fa[1] <= fb[3] && fb[1] <= fa[3]) errs.push(`${a} and ${b}: footprints overlap (set "within" if one is part of the other)`)
    }
  }
  for (const [s, st] of Object.entries(M.stories || {})) {
    for (const p of st.places || []) if (!M.places[p]) errs.push(`story ${s}: no place "${p}"`)
    for (const c of st.cameos || []) if (!(M.cameos || {})[c]) errs.push(`story ${s}: no cameo "${c}"`)
    if (typeof st.day !== 'number') errs.push(`story ${s}: day must be a number (the world timeline)`)
  }
  for (const [c, cm] of Object.entries(M.cameos || {})) if (!M.places[cm.place]) errs.push(`cameo ${c}: no place "${cm.place}"`)
  // a place inside another (`within`, a region) is in the same dimension
  for (const [k, p] of P) { const w = p.within && M.places[p.within]; if (w && dimName(w.dimension) !== dimName(p.dimension)) errs.push(`${k}: within ${p.within}, but in ${dimName(p.dimension)} and it in ${dimName(w.dimension)}`) }
  return errs
}

module.exports = { ravineCmds, craterCmds, loadMap, cacheDir, place, origin, storyOf, at, canon, build, enter, snapshot, check, stampCmds, MAP_FILE, DIMENSIONS, dimName, dimOf }
