// The owner's review notes as automated checks (owner, 2026-11-10: 22 timestamped notes on 6 published stories).
// Four checks, each reported in seconds of the Short with the story line it falls in:
//   flat     the shot's visible world is mostly a flat cleared plain ("not superflat world", "the hill is just a 3x3
//            and the rest is super flat"); plus the set's footprint, the clearing and the terrain relief around it
//   subject  a line names a subject (story.json v2 `lines[].look`, or a key word the vocabulary or the story maps:
//            TORCH, MOM, LIBRARIAN...) and the camera isn't on it: out of frame, hidden, off centre, too close or a
//            speck ("why are we staring down instead of at the librarian's face"); or it sits too low: a first-person
//            look landing under its eyes, a face in the caption band ("it feels we are looking slightly too low")
//   sync     the picture ahead of the words (the dig before "DUG", already in the hole when the line says it), a fall
//            with no cause ("why do we start falling without us digging?"), a line that says "never X" over X
//   glitch   doors that open or close with nobody using them, the player stuck walking into a block, camera jitter
//            or start-stop stutter, and a story about fog / night / rain whose recording has none
// Shots rendered as wide (16:9) masters are judged in the delivered middle frame: the 1080x1011 crop (centre, or
// shots[].cropX). Everything is geometry from the recording (lib/hb/scene.js), no rendering.
const fs = require('fs')
const path = require('path')
const { VIEW_ASPECT, dayLabel, ROOT } = require('./scene')

const FINE = []   // (debug) per-sample rows when OWNER_DEBUG=1
const DEBUG = !!process.env.OWNER_DEBUG
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
const pct = (v) => `${Math.round(v * 100)}%`
// a subject sitting too low: a first-person look landing more than LOW_AIM degrees under its eyes (5 stories, 2026-11-10:
// median 1.9, the worst quarter above 5.5), or its face below LOW_FACE of the frame (the caption band starts there)
const LOW_AIM = 4, LOW_FACE = 0.62

// ------------------------------------------------------------------ the delivered frame (crop of a wide master)
// A POV shot is drawn straight into the 1080x1011 game view. A camera shot rendered as a 1920x1080 master
// (stunt.shots[name].master = 'wide', story shots[].master = 'wide', or stunt.master = 'wide') is cropped to the
// middle 1080x1011, shifted by cropX (pixels of the master, or a fraction of its width when |cropX| <= 1).
const MW = 1920, MH = 1080, FW = 1080, FH = 1011
function frameFor (scene, ctx, tick) {
  const sh = scene.shotAt ? scene.shotAt(tick) : null
  const spec = (sh && sh.spec) || {}
  const plan = ctx.shotPlanAt ? ctx.shotPlanAt(tick) : null
  const master = spec.master || (plan && plan.master) || (scene.stunt && scene.stunt.master) || null
  if (master !== 'wide' && master !== '16:9') return { aspect: VIEW_ASPECT, crop: null }
  let cx = spec.cropX ?? (plan && plan.cropX) ?? 0
  if (Math.abs(cx) <= 1) cx *= MW
  const x0 = (MW - FW) / 2 + cx, y0 = (MH - FH) / 2
  return { aspect: MW / MH, crop: { x0: x0 / MW, x1: (x0 + FW) / MW, y0: y0 / MH, y1: (y0 + FH) / MH }, cropX: cx }
}
// a world point -> { x, y } in the delivered frame (0..1 inside), depth; null behind the camera
function toFrame (scene, cam, fr, p) {
  const q = scene.project(cam, p, fr.aspect)
  if (!q) return null
  if (!fr.crop) return { x: q.sx, y: q.sy, depth: q.depth }
  const c = fr.crop
  return { x: (q.sx - c.x0) / (c.x1 - c.x0), y: (q.sy - c.y0) / (c.y1 - c.y0), depth: q.depth }
}
// a ray through the delivered frame
function rayFrame (scene, cam, fr, fx, fy, maxD) {
  const c = fr.crop
  const sx = c ? c.x0 + fx * (c.x1 - c.x0) : fx, sy = c ? c.y0 + fy * (c.y1 - c.y0) : fy
  return scene.ray(cam, sx, sy, maxD, fr.aspect)
}
// the vertical half-angle the delivered frame covers (for sizes)
const tanHalf = (cam, fr) => Math.tan(cam.fov * Math.PI / 360) * (fr.crop ? (fr.crop.y1 - fr.crop.y0) : 1)

// ------------------------------------------------------------------ world: surface heights, the clearing
const GROUND = /^(grass_block|dirt|coarse_dirt|podzol|rooted_dirt|mud|mycelium|moss_block|sand|red_sand|gravel|clay|stone|granite|diorite|andesite|deepslate|tuff|calcite|cobblestone|mossy_cobblestone|sandstone|red_sandstone|snow_block|snow|powder_snow|ice|packed_ice|blue_ice|terracotta|\w+_terracotta|dirt_path|farmland|water|lava|bedrock|\w+_ore)$/
const NATURAL = /^(grass_block|dirt|coarse_dirt|podzol|rooted_dirt|mud|mycelium|moss_block|sand|red_sand|gravel|clay|stone|granite|diorite|andesite|deepslate|tuff|calcite|sandstone|red_sandstone|snow_block|terracotta|\w+_terracotta|\w+_ore|water)$/
const PLANT = /^(air|cave_air|void_air|light|barrier|short_grass|tall_grass|fern|large_fern|dandelion|poppy|\w+_tulip|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|allium|blue_orchid|sunflower|lilac|rose_bush|peony|dead_bush|snow|vine|\w+_sapling|sweet_berry_bush|seagrass|tall_seagrass|kelp|kelp_plant|torch|wall_torch|soul_torch|soul_wall_torch|redstone_wire|\w+_carpet|\w+_button|lever|\w+_pressure_plate|bush|firefly_bush|leaf_litter|\w+_petals|short_dry_grass|tall_dry_grass|cactus_flower)$/
const TREE = /(_leaves|_log|_wood|mangrove_roots|bamboo|mushroom_block|_stem)$/
class Surface {
  constructor (scene) { this.s = scene; this.H = new Map(); this.y0 = (scene.rec.set || { y: 64 }).y }
  // the top non-air, non-plant block of a column (null when the column isn't loaded); world as of scene.worldTick
  top (x, z) {
    const k = `${x},${z},${this.s.worldTick}`
    if (this.H.has(k)) return this.H.get(k)
    let v = null
    if (this.s.colOf(x, z)) for (let y = this.y0 + 48; y > this.y0 - 64; y--) { const n = this.s.blockName(x, y, z); if (n && !PLANT.test(n)) { v = { y, n }; break } }
    if (this.H.size > 400000) this.H.clear()
    this.H.set(k, v)
    return v
  }
}

// the cleared plain the set stands on: cells whose top is the set's ground level and with no natural ground above it
// (houses on it count; a hill doesn't). Flood fill from the set, out to `R` blocks.
function clearingOf (scene, R = 128) {
  const S = scene.rec.set
  if (!S) return null
  const sf = new Surface(scene)
  // the ground level: the most common top height of natural ground within 12 blocks of the set
  const hist = new Map()
  for (let dx = -12; dx <= 12; dx++) for (let dz = -12; dz <= 12; dz++) { const t = sf.top(S.x + dx, S.z + dz); if (t && NATURAL.test(t.n)) hist.set(t.y, (hist.get(t.y) || 0) + 1) }
  if (!hist.size) return null
  const g = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const onPlain = (x, z) => {
    const n = scene.blockName(x, g, z)
    if (!n || !/^(grass_block|dirt|coarse_dirt|dirt_path|farmland|podzol|sand|gravel|mud|moss_block|snow_block)$/.test(n)) return false
    for (let y = g + 1; y <= g + 3; y++) { const m = scene.blockName(x, y, z); if (m && NATURAL.test(m) && m !== 'water') return false }
    return true
  }
  let st0 = null
  for (let r = 0; r <= 16 && !st0; r++) for (let dx = -r; dx <= r && !st0; dx++) for (const dz of [-r, r]) if (onPlain(S.x + dx, S.z + dz)) { st0 = [S.x + dx, S.z + dz]; break }
  for (let r = 0; r <= 16 && !st0; r++) for (let dz = -r; dz <= r && !st0; dz++) for (const dx of [-r, r]) if (onPlain(S.x + dx, S.z + dz)) { st0 = [S.x + dx, S.z + dz]; break }
  if (!st0) return null
  const seen = new Set(), q = [st0]
  seen.add(`${st0[0]},${st0[1]}`)
  let area = 0, minx = S.x, maxx = S.x, minz = S.z, maxz = S.z
  let bminx = Infinity, bmaxx = -Infinity, bminz = Infinity, bmaxz = -Infinity, built = 0
  while (q.length) {
    const [x, z] = q.pop()
    if (!onPlain(x, z)) continue
    area++
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (z < minz) minz = z; if (z > maxz) maxz = z
    const t = sf.top(x, z)
    if (t && t.y > g && !TREE.test(t.n) && !NATURAL.test(t.n)) { built++; if (x < bminx) bminx = x; if (x > bmaxx) bmaxx = x; if (z < bminz) bminz = z; if (z > bmaxz) bmaxz = z }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, k = `${nx},${nz}`
      if (seen.has(k) || Math.abs(nx - S.x) > R || Math.abs(nz - S.z) > R) continue
      seen.add(k); q.push([nx, nz])
    }
  }
  let edge
  // relief: the spread of natural ground heights within 96 blocks, outside the plain (every 4th column)
  const hs = []
  for (let dx = -96; dx <= 96; dx += 4) for (let dz = -96; dz <= 96; dz += 4) {
    const x = S.x + dx, z = S.z + dz
    if (seen.has(`${x},${z}`) && onPlain(x, z)) continue
    const t = sf.top(x, z)
    if (t && (NATURAL.test(t.n) || TREE.test(t.n))) hs.push(t.y)
  }
  const mean = hs.reduce((a, b) => a + b, 0) / Math.max(1, hs.length)
  const sd = Math.sqrt(hs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, hs.length))
  edge = Math.min(S.x - minx, maxx - S.x, S.z - minz, maxz - S.z)
  return { level: g, area, w: maxx - minx + 1, d: maxz - minz + 1, edge, built, footprint: built ? { w: bmaxx - bminx + 1, d: bmaxz - bminz + 1, x0: bminx - S.x, z0: bminz - S.z } : null, relief: +sd.toFixed(1), outside: hs.length }
}

// what fills the delivered frame: a grid of rays sorted into sky / flat ground / relief / trees / water / set / near
function frameFill (scene, sf, cam, fr, n = 17) {
  const c = { sky: 0, flat: 0, relief: 0, trees: 0, water: 0, set: 0, near: 0, far: 0 }
  let total = 0
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    total++
    const r = rayFrame(scene, cam, fr, (i + 0.5) / n, (j + 0.5) / n, 128)
    if (r.sky || r.unloaded) { c.sky++; continue }
    if (!r.block) { c.sky++; continue }
    if (r.dist < 2.5) { c.near++; continue }
    if (TREE.test(r.block)) { c.trees++; continue }
    if (r.block === 'water') { c.water++; continue }
    if (!GROUND.test(r.block)) { c.set++; continue }
    // ground: flat if the surface around the hit (7x7 columns) is all at the hit's height
    const t0 = sf.top(r.x, r.z)
    if (!t0 || t0.y !== r.y) { c.relief++; continue }   // a wall of ground (a hill side)
    let off = 0
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { const t = sf.top(r.x + dx, r.z + dz); if (t && !NATURAL.test(t.n) && !TREE.test(t.n) && t.y > r.y) continue; if (!t || Math.abs(t.y - r.y) > 1 || TREE.test(t.n)) off++ }   // built things on it don't count; 1-block steps do (a terrace)
    if (off <= 3) { c.flat++; if (r.dist > 24) c.far++ } else c.relief++
  }
  for (const k in c) c[k] = +(c[k] / total).toFixed(3)
  return c
}

// ------------------------------------------------------------------ the story: lines, words, subjects
const SUBJECT_WORDS = [
  [/^torch(es)?$/, { block: /^(torch|wall_torch|soul_torch|soul_wall_torch)$/, what: 'torch', h: 0.6 }],
  [/^lanterns?$/, { block: /^(lantern|soul_lantern)$/, what: 'lantern', h: 0.5 }],
  [/^doors?$/, { block: /_door$/, what: 'door', h: 2 }],
  [/^beds?$/, { block: /_bed$/, what: 'bed', h: 0.6 }],
  [/^chests?$/, { block: /^(chest|trapped_chest)$/, what: 'chest', h: 0.9 }],
  [/^furnaces?$/, { block: /^furnace$/, what: 'furnace', h: 1 }],
  [/^bells?$/, { block: /^bell$/, what: 'bell', h: 1 }],
  [/^signs?$/, { block: /_sign$/, what: 'sign', h: 1 }],
  [/^lever$/, { block: /^lever$/, what: 'lever', h: 0.5 }],
  [/^composter$/, { block: /^composter$/, what: 'composter', h: 1 }],
  [/^(cauldron)$/, { block: /cauldron$/, what: 'cauldron', h: 1 }],
  [/^(lectern)$/, { block: /^lectern$/, what: 'lectern', h: 1 }],
  [/^(golem)$/, { entity: /^iron_golem$/, what: 'iron golem' }],
  [/^(dog|wolf|puppy)$/, { entity: /^wolf$/, what: 'dog' }],
  [/^(sheep)$/, { entity: /^sheep$/, what: 'sheep' }],
  [/^(creeper)$/, { entity: /^creeper$/, what: 'creeper' }],
  [/^(zombie)$/, { entity: /^(zombie|zombie_villager|husk|drowned)$/, what: 'zombie' }],
  [/^(skeleton)$/, { entity: /^(skeleton|stray|bogged)$/, what: 'skeleton' }],
  [/^(cat|kitten)$/, { entity: /^cat$/, what: 'cat' }],
  [/^(cow)$/, { entity: /^cow$/, what: 'cow' }],
  [/^(pig)$/, { entity: /^pig$/, what: 'pig' }],
  [/^(chicken)$/, { entity: /^chicken$/, what: 'chicken' }],
  [/^(horse)$/, { entity: /^horse$/, what: 'horse' }],
  [/^(enderman)$/, { entity: /^enderman$/, what: 'enderman' }],
  [/^(witch)$/, { entity: /^witch$/, what: 'witch' }],
  [/^(villager)$/, { entity: /^villager$/, what: 'villager' }],
  [/^(librarian|farmer|fisherman|shepherd|fletcher|cleric|armorer|weaponsmith|toolsmith|butcher|leatherworker|mason|cartographer|nitwit)$/, { prof: true }],
  // family and people: a person on screen (villager, zombie villager, an actor); the bible can name exactly who
  [/^(mom|mother|mum|dad|father|grandpa|grandma|grandad|granny|brother|sister|wife|husband|son|daughter|neighbou?r|uncle|aunt)$/, { person: true, what: 'a person (villager, zombie villager or actor)' }]
]
const PERSON = /^(villager|zombie_villager|player|mannequin|witch|wandering_trader|pillager|vindicator|evoker)$/
const NOT_A_SUBJECT_AFTER = /^(of|for|from)$/   // "sixty four TORCHES" is still the torches; kept simple

function storyLines (story) {
  if (!story) return []
  const L = []
  for (const def of story.st.lines || []) {
    const vo = story.vo && story.vo.lines && story.vo.lines[def.id]
    const chunks = (def.text || '').split('/').map(s => s.trim()).filter(Boolean)
    const times = vo && vo.chunks ? vo.chunks.map(c => c[0]) : null
    L.push({ id: def.id, text: def.text || '', def, chunks, times, dur: vo ? vo.dur : null })
  }
  return L
}
const words = (s) => s.split(/\s+/).map(w => w.replace(/[^A-Za-z']/g, '')).filter(Boolean)

// the subjects a line names, each with the chunk (word) it is named in
function subjectsOf (line, story, notes) {
  const def = line.def || {}
  const out = []
  if (def.look === false) return out
  const looks = def.look === undefined ? [] : Array.isArray(def.look) && typeof def.look[0] !== 'number' ? def.look : [def.look]
  for (const lk of looks) {
    const spec = typeof lk === 'object' && !Array.isArray(lk) ? lk : { what: lk }
    const sub = resolveLook(spec.what, story)
    if (!sub) { notes.push(`${line.id}: look ${JSON.stringify(spec.what)} names nothing the checker knows (actor:NAME, an entity type, block:NAME, prop:ID, [dx,dy,dz])`); continue }
    let k = 0
    if (spec.word) { const i = line.chunks.findIndex(c => c.toLowerCase().includes(String(spec.word).toLowerCase())); if (i >= 0) k = i }
    out.push({ ...sub, chunk: k, explicit: true, size: spec.size || null })
  }
  if (out.length) return out
  // inferred: key words of the line the vocabulary, the cast or the props map
  const cast = (story && story.st.cast) || {}
  const props = (story && story.st.props) || {}
  line.chunks.forEach((c, k) => {
    for (const w0 of words(c)) {
      const w = w0.toLowerCase().replace(/'s$/, '')
      if (props[w]) { const s = resolveLook(`prop:${w}`, story); if (s) { out.push({ ...s, chunk: k, word: w0 }); continue } }
      const cm = Object.values(cast).find(m => m && m.name && m.name.toLowerCase() === w && m.role !== 'narrator')
      if (cm) { const s = castSubject(cm); if (s) { out.push({ ...s, chunk: k, word: w0, from: 'cast' }); continue } }
      for (const [re, s] of SUBJECT_WORDS) if (re.test(w)) {
        if (s.prof) out.push({ entity: /^(villager|zombie_villager)$/, prof: w, what: w, chunk: k, word: w0 })
        else out.push({ ...s, chunk: k, word: w0 })
        break
      }
    }
  })
  // one subject per chunk, the same subject named again in a row counts once
  const dedup = []
  for (const s of out) { const p = dedup[dedup.length - 1]; if (p && p.what === s.what) continue; dedup.push(s) }
  return dedup
}
function castSubject (m) {
  const os = String(m.on_screen || '').toLowerCase()
  const t = /^(\w+)/.exec(os)
  if (!t || t[1] === 'pov') return null
  const prof = /(librarian|farmer|fisherman|shepherd|fletcher|cleric|armorer|weaponsmith|toolsmith|butcher|leatherworker|mason|cartographer|nitwit)/.exec(os)
  return { entity: new RegExp(`^${t[1]}$`), prof: prof ? prof[1] : null, name: m.name, what: m.name }
}
function resolveLook (what, story) {
  if (Array.isArray(what) && what.length === 3) return { at: what, what: `[${what.join(', ')}]` }
  if (typeof what !== 'string') return null
  const [kind, rest] = what.includes(':') ? what.split(/:(.*)/s) : [null, what]
  if (kind === 'actor') return { actor: rest, what: rest }
  if (kind === 'block') return { block: new RegExp(`^(${rest}|wall_${rest}|${rest.replace(/^(\w+)_?/, '$1_wall_')})$`), what: rest, h: 1 }
  if (kind === 'prop') {
    const p = story && story.st.props && story.st.props[rest]
    if (!p) return null
    if (p.at) return { at: p.at, what: rest, h: p.h || 1 }
    if (p.block) return resolveLook(`block:${p.block}`, story)
    if (p.actor) return { actor: p.actor, what: rest }
    return null
  }
  if (kind === 'entity') return { entity: new RegExp(`^${rest}$`), what: rest }
  const cast = (story && story.st.cast) || {}
  const cm = cast[what] || Object.values(cast).find(m => m && m.name === what)
  if (cm) return castSubject(cm)
  for (const [re, s] of SUBJECT_WORDS) if (re.test(what.toLowerCase())) return s.prof ? { entity: /^(villager|zombie_villager)$/, prof: what.toLowerCase(), what } : s.person ? { person: true, what } : { ...s }
  return { actor: what, what }   // a name tag or an actor's name
}

// ------------------------------------------------------------------ the opening shot (owner 2026-11-11, Good Boy)
// span: the first seconds of the Short judged; x0..x1: the subject's median screen-x (the middle third); minFrac: its
// height as a share of the frame that reads at phone size (a WS or closer; under it an EWS speck): BLOCK when it never
// gets there in the span, WARN when frame 1 is under it but a push or swoop brings it there (a point subject, a bare
// [dx, dy, dz], has no size: centre only); motionSpan: the first seconds that must move; a camera moving
// camSpeed blocks/s, turning turn deg/s or pushing grow (|d ln size|/s), or the subject / anything in frame moving
// subSpeed blocks/s counts. Calibrated on the five held stories (2026-11-11; numbers in docs/STANDARDS.md 1).
const OPEN = { span: 1.5, x0: 1 / 3, x1: 2 / 3, minFrac: 0.08, seen: 0.5, motionSpan: 0.5, camSpeed: 0.4, turn: 4, grow: 0.15, subSpeed: 0.6 }
const ACTION = /^(ent_swing|swing|place|dig|break|use|vel|hit|throw)$/
const selfModel = (scene) => (scene.stunt && scene.stunt.self && scene.stunt.self.model) || 'player'
const selfHeight = (scene) => { const m = selfModel(scene); const d = scene.md && scene.md.entitiesByName[m]; return (d && d.height) || 1.8 }
// a shot's `subject` entry ('self', 'actor:NAME', 'entity:TYPE', 'prop:ID', [dx, dy, dz]) -> a judge() subject
function subjectSpec (v, story) {
  if (v === 'self') return { self: true, what: 'the narrator' }
  if (Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number')) return { at: v, what: `[${v.join(', ')}]`, point: true }
  if (typeof v === 'string') return resolveLook(v, story)
  return null
}
// what the opening frames: the camera shot's `subject` (stunt.shots[name].subject, its first entry: the lint's list),
// else the story plan's shots[].subject, else line 1's look (explicit, then a key word), else the narrator when a
// camera shot shows them from outside. null: a first-person opening that names nothing (a place).
function openingSubject (scene, ctx, story, lines, notes, tick) {
  const first = (s) => Array.isArray(s) && !(s.length === 3 && s.every(n => typeof n === 'number')) ? s[0] : s
  const sh = scene.shotAt ? scene.shotAt(tick) : null
  if (sh && sh.spec && sh.spec.subject && !sh.spec.pov) { const sb = subjectSpec(first(sh.spec.subject), story); if (sb) return { sb, src: `shots.${sh.name}.subject` } }
  const plan = ctx.shotPlanAt ? ctx.shotPlanAt(tick) : null
  if (plan && plan.subject) { const sb = subjectSpec(first(plan.subject), story); if (sb) return { sb, src: `story shots ${plan.id}.subject` } }
  const L1 = lines[0]
  if (L1) {
    const subs = subjectsOf(L1, story, [])
    if (subs.length) return { sb: subs[0], src: `${L1.id} ${subs[0].explicit ? 'look' : `"${subs[0].word || subs[0].what}"`}` }
  }
  const cam = scene.cameraAt(tick)
  if (cam && /^shot /.test(cam.mode || '') && !/\(pov\)/.test(cam.mode || '')) return { sb: { self: true, what: 'the narrator' }, src: 'the narrator (a camera shot, no subject named)' }
  return null
}
// the verdict on the sampled opening (pure; rows from run(): out, cam, pov, and for the subject x, y, frac, inF,
// hidden, at, label | none; ents in frame { id, x, y, z })
function openingVerdict (rows, { subject = null, actions = 0 } = {}, T = OPEN) {
  const F = []
  const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : null }
  const stats = { subject: subject ? subject.sb.what : null, src: subject ? subject.src : null, n: rows.length }
  if (!rows.length) return { findings: F, stats }
  const r0 = rows[0]
  // motion in the first motionSpan s (rates per second of the Short)
  const mv = rows.filter(r => r.out - r0.out <= T.motionSpan + 1e-6)
  const dt = mv.length > 1 ? mv[mv.length - 1].out - mv[0].out : 0
  let travel = 0, turn = 0, subPath = 0, other = 0
  const paths = new Map()
  const ang = (a, b) => Math.abs(wrap(a - b)) * 180 / Math.PI
  for (let i = 1; i < mv.length; i++) {
    const a = mv[i - 1], b = mv[i]
    travel += Math.hypot(b.cam.x - a.cam.x, b.cam.y - a.cam.y, b.cam.z - a.cam.z)
    turn += Math.hypot(ang(b.cam.yaw, a.cam.yaw), ang(b.cam.pitch, a.cam.pitch))
    if (a.at && b.at) subPath += Math.hypot(b.at.x - a.at.x, b.at.y - a.at.y, b.at.z - a.at.z)
    // each other thing in frame: its path over the samples it is seen in (a jump over 2 blocks is a teleport, not motion)
    for (const e of b.ents || []) { const p = (a.ents || []).find(x => x.id === e.id); const d = p ? Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z) : 0; if (p && d < 2) { const o = paths.get(e.id) || { d: 0, t: 0 }; o.d += d; o.t += b.out - a.out; paths.set(e.id, o) } }
  }
  for (const o of paths.values()) if (o.t >= Math.min(0.2, dt / 2)) other = Math.max(other, o.d / o.t)
  const fr = mv.filter(r => r.frac > 0)
  const grow = dt > 0 && fr.length > 1 ? Math.abs(Math.log(fr[fr.length - 1].frac / fr[0].frac)) / dt : 0
  const m = dt > 0 ? { cam: travel / dt, turn: turn / dt, grow, sub: subPath / dt, other } : { cam: 0, turn: 0, grow: 0, sub: 0, other: 0 }
  for (const k in m) m[k] = +m[k].toFixed(2)
  m.actions = actions
  stats.motion = m
  const moving = m.cam >= T.camSpeed || m.turn >= T.turn || m.grow >= T.grow || m.sub >= T.subSpeed || m.other >= T.subSpeed || actions > 0
  const motionTxt = `camera ${m.cam} blocks/s, turn ${m.turn} deg/s, push ${m.grow}/s, subject ${m.sub} blocks/s, anything else in frame ${m.other} blocks/s, ${actions} action(s)`
  if (!moving && dt > 0) F.push({ level: 'WARN', msg: `static opening: nothing moves in the first ${T.motionSpan} s (${motionTxt}; moving = camera >= ${T.camSpeed} blocks/s, turn >= ${T.turn} deg/s, push >= ${T.grow}/s a subject >= ${T.subSpeed} blocks/s, or an action: a swing, a throw, a block placed). Owner: "The opening scene is not very exciting?": open mid-action (the subject already moving, or a push in)` })
  // the subject
  if (!subject) {
    if (r0.pov) F.push({ level: 'NOTE', msg: `opening (first person) names no subject: line 1 has no look and no key word the checker knows; set lines[0].look or the shot's subject to check its framing (${motionTxt})` })
    else F.push({ level: 'WARN', msg: `opening camera shot names no subject: set its subject (stunt.shots[name].subject or lines[0].look) so the check can see the story's subject is centred and big from frame 1 (${motionTxt})` })
    return { findings: F, stats }
  }
  if (subject.sb.self && r0.pov) { F.push({ level: 'NOTE', msg: `opening is first person: the narrator is the camera (${motionTxt})` }); return { findings: F, stats }}
  const what = subject.sb.what + (subject.src ? ` (${subject.src})` : '')
  const seen = rows.filter(r => r.inF && !r.hidden)
  stats.seen = +(seen.length / rows.length).toFixed(2)
  const where = (r) => r.none ? 'not in the scene' : !r.inF ? `out of frame${r.x !== null && r.x !== undefined ? ` (${pct(r.x)} across)` : ' (behind the camera)'}` : r.hidden ? 'hidden behind the set' : `${pct(r.x)} across`
  if (!r0.inF || r0.hidden || r0.none || seen.length / rows.length < T.seen) {
    F.push({ level: 'BLOCK', msg: `opening: ${what} is not on screen from frame 1 (frame 1: ${where(r0)}; seen in ${pct(seen.length / rows.length)} of the first ${T.span} s). The first frame is the hook: the story's subject in frame, centred and big. Owner: "The opening scene is not very exciting? Also not centered."` })
    return { findings: F, stats }
  }
  const x = med(seen.map(r => r.x)), h0 = r0.frac, hMax = Math.max(...seen.map(r => r.frac))
  const sized = !subject.sb.point
  stats.x = +x.toFixed(2); stats.h0 = +h0.toFixed(3); stats.hMax = +hMax.toFixed(3); stats.label = r0.label
  const nums = `${r0.label === subject.sb.what ? 'at' : r0.label + ':'} ${pct(x)} across (middle third ${pct(T.x0)}-${pct(T.x1)})${sized ? `, ${pct(h0)} of the frame height on frame 1, ${pct(hMax)} at most (readable from ${pct(T.minFrac)})` : ' (a point: no size)'}, first ${T.span} s`
  const bad = []
  if (x < T.x0 || x > T.x1) bad.push(`off centre toward the ${x < 0.5 ? 'left' : 'right'} edge`)
  if (sized && hMax < T.minFrac) bad.push('too small to read at phone size')
  const OWN = 'Owner: "The opening scene is not very exciting? Also not centered."'
  if (bad.length) F.push({ level: 'BLOCK', msg: `opening: ${what} is ${bad.join(' and ')} (${nums}; ${motionTxt}). ${OWN}: ${[bad.some(b => /centre/.test(b)) ? 'put it in the middle third of the frame' : '', bad.some(b => /small/.test(b)) ? `bring it to ${pct(T.minFrac * 2)}+ of the frame height (FS or closer)` : ''].filter(Boolean).join(', ')} from frame 1` })
  else if (sized && h0 < T.minFrac) F.push({ level: 'WARN', msg: `opening: ${what} is a speck on frame 1 and only reads at phone size later (${nums}; ${motionTxt}). Frame 1 is the thumbnail: start the push closer` })
  else F.push({ level: 'NOTE', msg: `opening OK: ${what} ${nums}; ${motionTxt}` })
  return { findings: F, stats }
}

// ------------------------------------------------------------------ the checks
// the shows check's rules (r:r65ef27), pure so they can be tested on their own
const showsNorm = (x) => String(x || '').replace(/^minecraft:/, '').toLowerCase()
// a `shows` entry: 'string' | { what: 'ender_pearl' | ['gold_ingot', 'gold_block'], word: 'PEARLS' }
function showsSpec (s0) {
  const spec = typeof s0 === 'string' ? { what: s0 } : s0
  const names = [].concat(spec.what).map(showsNorm)
  return { ...spec, names, word: String(spec.word || names[0].replace(/_/g, ' ')).toLowerCase() }
}
// the caption chunk that names it: its word, else a part of its id (ender_pearl -> 'pearl'), else -1 (the whole line)
function showsChunk (chunks, spec) {
  let k = chunks.findIndex(c => c.toLowerCase().includes(spec.word))
  if (k < 0) k = chunks.findIndex(c => spec.names[0].split('_').some(w => w.length > 3 && c.toLowerCase().includes(w)))
  return k
}
// one moment shows it: the first-person hand holds it, an open container has it, or it is in frame (visible())
function shownBy ({ names, pov, held, gui, visible }) {
  return !!((pov && names.includes(held)) || (gui && names.some(x => gui.includes(x))) || visible())
}
// a BLOCK when it's missing for more than half of its words (3 moments at least)
const showsMissed = (good, n) => n >= 3 && good / n < 0.5

function run (scene, ctx) {
  const F = []
  const notes = []
  const tickOut = ctx.tickOut   // source tick -> seconds of the Short (null outside)
  const outOf = (tick) => { const i = Math.max(0, Math.min(tickOut.length - 1, Math.round(tick))); return tickOut[i] }
  const N = scene.P.length
  const lineMarks = scene.tl.filter(e => e.event === 'line').map(e => ({ id: e.id, tick: e.t / 50 }))
  const lineAt = (tick) => { let id = null; for (const m of lineMarks) if (m.tick <= tick + 1e-6) id = m.id; return id }
  const inShort = (tick) => outOf(tick) !== null && outOf(tick) !== undefined
  const add = (level, check, tick, msg, extra = {}) => F.push({ level, check, out: tick === null ? null : outOf(tick), tick: tick === null ? null : +tick.toFixed(1), line: tick === null ? null : lineAt(tick), msg, ...extra })
  const camShot = (tick) => { const c = scene.cameraAt(tick); return c }
  // (a K.blink of the player itself is a jump of the camera like a cut: no aim-snap or jump findings on it)
  const cutTicks = scene.tl.filter(e => ['cut', 'respawn', 'teleported', 'shot'].includes(e.event) || (e.event === 'teleport_ok' && e.self)).map(e => e.t / 50)
  const nearCut = (tick, w = 2) => cutTicks.some(c => Math.abs(c - tick) <= w)
  const deaths = []
  { let d = null; for (const e of scene.tl) { if (e.event === 'death' && d === null) d = e.t / 50; if (e.event === 'respawn' && d !== null) { deaths.push([d, e.t / 50 + 2]); d = null } } if (d !== null) deaths.push([d, Infinity]) }
  const dead = (tick) => deaths.some(([a, b]) => tick >= a && tick < b)
  const pose = (i) => scene.P[Math.max(0, Math.min(N - 1, i))]
  const step = (i) => Math.hypot(pose(i + 1)[1] - pose(i)[1], pose(i + 1)[2] - pose(i)[2], pose(i + 1)[3] - pose(i)[3])
  const isJump = (i) => step(i) > 4 || (nearCut(i + 1, 1) && step(i) > 0.8)
  const sh0 = Math.max(0, tickOut.findIndex(v => v !== null)), sh1 = tickOut.length - 1 - [...tickOut].reverse().findIndex(v => v !== null)
  const story = ctx.story
  const lines = storyLines(story)
  const lineSpan = (id) => {
    const m = lineMarks.find(x => x.id === id)
    if (!m) return null
    const nxt = lineMarks.find(x => x.tick > m.tick + 0.5)
    const L = lines.find(l => l.id === id)
    const end = L && L.dur ? m.tick + L.dur * 20 : nxt ? nxt.tick : m.tick + 60
    return [m.tick, Math.min(end, nxt ? nxt.tick : end)]
  }
  const wordTick = (L, k) => { const m = lineMarks.find(x => x.id === L.id); if (!m) return null; const t = L.times && L.times[k] !== undefined ? L.times[k] : (L.dur ? L.dur * k / Math.max(1, L.chunks.length) : k * 0.4); return m.tick + t * 20 }

  // ---------------------------------------------------------------- (a) flat world
  const sf = new Surface(scene)
  scene.worldAt(Math.max(0, sh0))
  const clr = story ? clearingOf(scene) : null
  if (clr) {
    ctx.world = clr
    const fp = clr.footprint ? `${clr.footprint.w} x ${clr.footprint.d}` : 'nothing built'
    const msg = `the set stands on a flat cleared plain ${clr.w} x ${clr.d} blocks (ground y ${clr.level}; its edge ${clr.edge ?? '>128'} blocks from the set's origin); built footprint ${fp}; terrain relief around it sd ${clr.relief} blocks`
    const superflat = clr.w >= 60 && clr.d >= 60 && clr.area > 2500
    add(superflat ? 'WARN' : 'NOTE', 'flat', null, superflat ? `${msg}: reads as a superflat world. docs/story_craft.md 9: build into natural ground (a hill, trees, water in view), fill to the fog` : msg, { world: clr })
  }
  // stories only: a stunt Short's set is its own business (a build lapse on a plain is fine)
  for (const s of story ? ctx.shots || [] : []) {
    if (s.ticks[0] === null) continue
    const t0 = s.ticks[0] + 1, t1 = Math.max(t0, s.ticks[1] - 1)
    const samples = [0.1, 0.3, 0.5, 0.7, 0.9].map(u => t0 + (t1 - t0) * u)
    const rows = []
    for (const t of samples) {
      if (dead(t) || !inShort(t)) continue
      scene.worldAt(Math.floor(t))
      const cam = scene.cameraAt(t)
      if (!cam.known) continue
      const fr = frameFor(scene, ctx, t)
      const f = frameFill(scene, sf, cam, fr)
      f.view = f.flat + f.relief + f.trees + f.water + f.set
      f.scen = f.relief + f.trees + f.water
      f.t = t
      // superflat at this moment: flat ground is a big part of the frame and most of the world in view, few trees
      f.hard = f.flat >= 0.25 && f.view >= 0.3 && f.flat / f.view >= 0.5 && f.trees < 0.12
      f.soft = f.flat >= 0.18 && f.view >= 0.25 && f.flat / f.view >= 0.4 && f.trees < 0.15
      rows.push(f)
    }
    if (!rows.length) continue
    const avg = (k) => rows.reduce((a, r) => a + r[k], 0) / rows.length
    const sh = { n: s.n, out: s.out, line: s.line, flat: +avg('flat').toFixed(2), scenery: +avg('scen').toFixed(2), trees: +avg('trees').toFixed(2), set: +avg('set').toFixed(2), sky: +avg('sky').toFixed(2), near: +avg('near').toFixed(2), hard: rows.filter(r => r.hard).length, of: rows.length }
    ;(ctx.flatRows = ctx.flatRows || []).push(sh)
    const hard = rows.filter(r => r.hard), soft = rows.filter(r => r.soft)
    const w = (hard.length ? hard : soft).sort((x, y) => y.flat - x.flat)[0]
    if (!w) continue
    const what = `flat ground fills ${pct(w.flat)} of the frame (${pct(w.flat / w.view)} of the world in view; hills/trees/water ${pct(w.scen)}, the set ${pct(w.set)}, sky ${pct(w.sky)}) at ${(outOf(w.t) ?? s.out[0]).toFixed(2)} s`
    const tail = clr ? `; the plain is ${clr.w} x ${clr.d}, the set's footprint ${clr.footprint ? clr.footprint.w + ' x ' + clr.footprint.d : '-'}, relief around it sd ${clr.relief}` : ''
    if (hard.length >= Math.max(2, Math.ceil(rows.length * 0.4))) F.push({ level: 'BLOCK', check: 'flat', out: s.out[0], tick: s.ticks[0], line: s.line, msg: `superflat shot (${hard.length}/${rows.length} moments): ${what}${tail}. Owner: "not superflat world": stage it against natural ground (a hill, trees, water), or fill the view (docs/story_craft.md 9)` })
    else if (soft.length >= Math.max(1, Math.ceil(rows.length * 0.4))) F.push({ level: 'WARN', check: 'flat', out: s.out[0], tick: s.ticks[0], line: s.line, msg: `mostly flat ground (${soft.length}/${rows.length} moments): ${what}${tail}` })
  }

  // ---------------------------------------------------------------- (b) the named subject
  const blockCache = new Map()
  const blocksNear = (re, cam, tick) => {
    const key = `${re}|${Math.floor(cam.x / 8)},${Math.floor(cam.y / 8)},${Math.floor(cam.z / 8)}|${Math.floor(tick / 100)}`
    if (blockCache.has(key)) return blockCache.get(key)
    const out = [], R = 24, cx = Math.floor(cam.x), cy = Math.floor(cam.y), cz = Math.floor(cam.z)
    for (let x = cx - R; x <= cx + R; x++) for (let z = cz - R; z <= cz + R; z++) { if (!scene.colOf(x, z)) continue; for (let y = cy - 16; y <= cy + 16; y++) { const n = scene.blockName(x, y, z); if (n && n !== 'air' && re.test(n)) out.push([x, y, z, n]) } }
    blockCache.set(key, out)
    return out
  }
  // the story kit's cast: K.actor marks 'actor' { tag, id } (a tagged mob is 'actor:TAG', as in render.js)
  const kitTag = new Map(scene.tl.filter(e => e.event === 'actor' && e.tag && e.id !== undefined).map(e => [String(e.id), e.tag]))
  const lookShots = []
  // one subject at one moment: the best placed candidate and what's wrong with it (null = fine)
  const judge = (sb, t, cam, fr) => {
    const th = tanHalf(cam, fr)
    let cands = []
    if (sb.self) {
      // the narrator seen from a camera shot (the player, or stunt.self.model: Good Boy's wolf)
      const q = scene.pose(t), h = selfHeight(scene)
      cands = [{ kind: 'entity', label: `the narrator (${selfModel(scene)})`, focus: { x: q.x, y: q.feetY + h * 0.85, z: q.z }, mid: { x: q.x, y: q.feetY + h / 2, z: q.z }, h }]
    } else if (sb.entity || sb.person || sb.actor) {
      const ents = scene.entities(t).filter(e => {
        if (sb.actor) return e.user === sb.actor || (e.extra && e.extra.name === sb.actor) || e.label === sb.actor || kitTag.get(String(e.id)) === sb.actor
        if (sb.person) return PERSON.test(e.type)
        if (!sb.entity.test(e.type)) return false
        if (sb.prof) return e.label.includes(`(${sb.prof})`)
        return true
      })
      cands = ents.map(e => { const h = e.h * (e.baby ? 0.5 : 1); return { kind: 'entity', label: `${e.label} #${e.id}`, focus: { x: e.x, y: e.y + h * 0.85, z: e.z }, mid: { x: e.x, y: e.y + h / 2, z: e.z }, h } })
    } else if (sb.block) {
      cands = blocksNear(sb.block, cam, t).filter(([x, y, z]) => sb.block.test(scene.blockName(x, y, z) || '')).map(([x, y, z, nm]) => ({ kind: 'block', label: `${nm} at ${x} ${y} ${z}`, focus: { x: x + 0.5, y: y + (sb.h || 1) / 2, z: z + 0.5 }, mid: { x: x + 0.5, y: y + (sb.h || 1) / 2, z: z + 0.5 }, h: sb.h || 1 }))
    } else if (sb.at) {
      const S = scene.rec.set || { x: 0, y: 0, z: 0 }
      const p = { x: S.x + sb.at[0] + 0.5, y: S.y + sb.at[1] + 0.5, z: S.z + sb.at[2] + 0.5 }
      cands = [{ kind: 'block', label: `[${sb.at.join(', ')}]`, focus: p, mid: p, h: 1 }]
    }
    if (!cands.length) return { bad: 'none' }
    const pov = !/^shot /.test(cam.mode || '') || /\(pov\)/.test(cam.mode || '')
    const { f, u } = scene.basis(cam)
    let best = null
    for (const c of cands) {
      const p = toFrame(scene, cam, fr, c.focus)
      const d = Math.hypot(c.mid.x - cam.x, c.mid.y - cam.y, c.mid.z - cam.z)
      if (d > 64) continue
      const inF = !!(p && p.x > 0.03 && p.x < 0.97 && p.y > 0.03 && p.y < 0.97)
      const v = [c.focus.x - cam.x, c.focus.y - cam.y, c.focus.z - cam.z], vn = Math.hypot(...v) || 1
      const ang = Math.acos(Math.max(-1, Math.min(1, (v[0] * f[0] + v[1] * f[1] + v[2] * f[2]) / vn))) * 180 / Math.PI
      const off = p ? Math.hypot(p.x - 0.5, p.y - 0.42) : 9
      const frac = p ? c.h / (2 * p.depth * th) : 0
      let hidden = null
      // a block subject is never hidden by itself (the ray stops 0.4 short of its centre, still inside it: "chest hidden
      // behind chest", story_names_in_the_woods)
      const self = (o) => o && c.kind === 'block' && o.x === Math.floor(c.focus.x) && o.y === Math.floor(c.focus.y) && o.z === Math.floor(c.focus.z) ? null : o
      if (inF) { const o1 = self(scene.occluder(cam, c.focus, 0.3)), o2 = self(scene.occluder(cam, c.mid, 0.3)); if (o1 && (o2 || c.kind === 'block')) hidden = o1 }
      const score = (inF ? 0 : 2) + (hidden ? 1 : 0) + ang / 90
      // how far above the aim (the frame's centre ray) its face/top sits, in degrees: + = the look lands below it
      const vang = Math.atan2(v[0] * u[0] + v[1] * u[1] + v[2] * u[2], v[0] * f[0] + v[1] * f[1] + v[2] * f[2]) * 180 / Math.PI
      if (!best || score < best.score) best = { ...c, p, d, inF, off, ang, vang, frac, hidden, score }
    }
    if (!best) return { bad: 'none' }
    // POV: "looking at X" is the aim, within 18 degrees of its face; a camera shot composes: within the middle of the frame
    const offBad = pov ? best.ang > 18 : best.off > 0.24
    const tooClose = best.kind === 'block' ? best.d < 2.5 && sb.size !== 'cu' && sb.size !== 'ecu' : best.frac > 0.9
    const speck = best.kind === 'block' ? best.d > 28 : best.frac < 0.05
    best.bad = !best.inF ? 'out' : best.hidden ? 'hidden' : offBad ? 'off' : tooClose ? 'close' : speck ? 'speck' : null
    best.pov = pov
    return best
  }
  const describeBad = (sb, ex, main) => {
    const where = ex && ex.p ? `${pct(ex.p.x)} across, ${pct(ex.p.y)} down` : ''
    return main === 'none' ? `no ${sb.what} anywhere near the camera`
      : main === 'out' ? `${ex.label} is out of frame${ex.p ? ` (${where})` : ' (behind the camera)'}`
        : main === 'hidden' ? `${ex.label} is hidden behind ${ex.hidden.block} ${ex.hidden.dist} blocks out`
          : main === 'off' ? `${ex.label} is off centre (${ex.kind === 'entity' ? 'its face' : 'it'} at ${where}, ${Math.round(ex.ang)} deg from the aim)`
            : main === 'close' ? `${ex.label} is too close (${ex.d.toFixed(1)} blocks${ex.kind === 'entity' ? `, ${pct(ex.frac)} of the frame height` : ''}): show where it is`
              : `${ex.label} is a speck (${ex.d.toFixed(1)} blocks, ${pct(ex.frac)} of the frame height)`
  }
  for (const L of lines) {
    const span = lineSpan(L.id)
    if (!span) continue
    const subs = subjectsOf(L, story, notes).map(sb => ({ ...sb, from: wordTick(L, sb.chunk) })).filter(sb => sb.from !== null)
    if (!subs.length) continue
    // from the first subject's word (+0.25 s to turn to it) to the end of the line: a moment is fine when any subject
    // named so far is framed well (the camera can stay on the librarian while she sells the torches)
    const a = subs[0].from + 5, b = span[1]
    if (b - a < 8) continue
    let good = 0, n = 0
    const per = subs.map(() => ({ why: {}, ex: {} }))
    const lows = []   // framed moments of a named subject: { pov, vang, y, label, d } (where the look lands on it)
    for (let t = a; t <= b; t += 2) {
      if (dead(t) || !inShort(t)) continue
      scene.worldAt(Math.floor(t))
      const cam = scene.cameraAt(t)
      if (!cam.known) continue
      const fr = frameFor(scene, ctx, t)
      n++
      let ok = false
      subs.forEach((sb, i) => {
        if (sb.from + 5 > t) return
        const r = judge(sb, t, cam, fr)
        if (DEBUG) FINE.push({ line: L.id, what: sb.what, t: +t.toFixed(1), out: outOf(t), best: r.label, pov: r.pov, vang: r.vang !== undefined ? +r.vang.toFixed(1) : null, x: r.p && +r.p.x.toFixed(2), y: r.p && +r.p.y.toFixed(2), ang: r.ang && Math.round(r.ang), frac: r.frac && +r.frac.toFixed(2), d: r.d && +r.d.toFixed(1), hidden: r.hidden && r.hidden.block, bad: r.bad })
        if (!r.bad) ok = true
        else { per[i].why[r.bad] = (per[i].why[r.bad] || 0) + 1; if (!per[i].ex[r.bad]) per[i].ex[r.bad] = r }
        if (r.p && r.inF && !r.hidden && r.kind === 'entity') lows.push({ pov: r.pov, vang: r.vang, y: r.p.y, label: r.label, d: r.d, what: sb.word || sb.what })
      })
      if (ok) good++
    }
    if (n < 4) continue
    const share = good / n
    // too low (owner, 2026-11-10: "when we 'look' at things, it feels we are looking slightly too low"):
    //   first person: the look lands below the face (median > LOW_AIM deg under its eyes: aim at K.face, not the chest/feet)
    //   any shot: the face sits in the caption band (below 62% down; captions at 70%, eyes belong on the upper third)
    const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor((b.length - 1) / 2)] }
    const pv = lows.filter(m => m.pov)
    if (pv.length >= 4 && med(pv.map(m => m.vang)) > LOW_AIM) {
      const dg = med(pv.map(m => m.vang)), ex = pv[Math.floor(pv.length / 2)], blk = Math.tan(dg * Math.PI / 180) * ex.d
      F.push({ level: 'WARN', check: 'subject', out: outOf(a), tick: +a.toFixed(1), line: L.id, low: +dg.toFixed(1), msg: `looking below "${ex.what}": the first-person look lands a median ${dg.toFixed(1)} deg under ${ex.label}'s eyes (~${blk.toFixed(2)} blocks at ${ex.d.toFixed(1)}), its face ${pct(med(pv.map(m => m.y)))} down. Aim at K.face(feet, type) (lib/story.js), not its chest, feet or a block's middle. Owner: "it feels we are looking slightly too low"` })
    }
    if (lows.length >= 4 && lows.filter(m => m.y > LOW_FACE).length >= lows.length / 2) {
      const ex = lows.find(m => m.y > LOW_FACE)
      F.push({ level: 'WARN', check: 'subject', out: outOf(a), tick: +a.toFixed(1), line: L.id, msg: `"${ex.what}" sits too low: ${ex.label}'s face ${pct(med(lows.map(m => m.y)))} down the frame, in the caption band (captions at 70%: eyes on the upper third, nothing important below ${pct(LOW_FACE)})` })
    }
    lookShots.push({ line: L.id, what: subs.map(s => s.what), share, aimBelow: pv.length ? +med(pv.map(m => m.vang)).toFixed(1) : null, faceY: lows.length ? +med(lows.map(m => m.y)).toFixed(2) : null })
    if (share >= 0.5) continue
    const details = subs.map((sb, i) => {
      const e = Object.entries(per[i].why).sort((x, y) => y[1] - x[1])[0]
      return e ? describeBad(sb, per[i].ex[e[0]], e[0]) : null
    }).filter(Boolean)
    const explicit = subs.some(s => s.explicit)
    const named = subs.map(s => s.word ? `"${s.word}"` : s.what).join(', ')
    F.push({ level: explicit ? 'BLOCK' : 'WARN', check: 'subject', out: outOf(a), tick: +a.toFixed(1), line: L.id, msg: `the line names ${named} but the camera is on ${subs.length > 1 ? 'them' : 'it'} only ${pct(share)} of ${((b - a) / 20).toFixed(1)} s: ${details.join('; ')}${explicit ? '' : ' (inferred from the words: set lines[].look to make it exact and a blocker, or look: false)'}. Owner: "talking about X while looking elsewhere"` })
  }
  ctx.lookShots = lookShots

  // ---------------------------------------------------------------- (b2) every thing the narration names is on screen
  // (owner 2026-11-11, r:r65ef27: "when we say "string" in the piglin short, no string is on screen"). A line's
  // `shows: ['string', { what: 'ender_pearl', word: 'PEARLS' }, ...]` (item or block ids, or a mob type) must be in the
  // picture, readable at phone size, from its word to the next chunk: as a dropped item, a block, a mob, something an
  // entity wears or holds, the item in the first-person hand, or a slot of an open container screen.
  {
    const norm = showsNorm
    const tl = scene.tl
    const stateAt = (t) => {   // the first-person hand and an open container at tick t
      let items = null, slot = 0, gui = null
      for (const e of tl) {
        if (e.t / 50 > t) break
        if (e.event === 'hotbar' && e.items) items = e.items
        if (e.slot !== undefined) slot = e.slot
        if (e.event === 'container') gui = e
        if (e.event === 'container_close') gui = null
      }
      const it = items && items[slot]
      return { held: it ? norm(Array.isArray(it) ? it[0] : it) : null, gui: gui && (gui.slots || []).filter(Boolean).map(x => norm(Array.isArray(x) ? x[0] : x)) }
    }
    const visible = (names, t, cam, fr, held, pov) => {   // a thing named in `names` in the frame, unhidden, not a speck
      const th = tanHalf(cam, fr)
      const pts = []
      if (!pov && held && names.includes(held)) { const q = scene.pose(t); pts.push({ x: q.x, y: q.feetY + 1.1, z: q.z, h: 0.45 }) }   // the narrator, seen from a camera, holding it
      for (const name of names) for (const e of scene.entities(t)) {
        const ex = e.extra || {}
        // the narrator seen from a camera holds what the hotbar's selected slot holds
        const wears = (ex.armor || []).map(norm).includes(name) || norm(ex.held) === name || (e.id === 'self' && held === name)
        // render.js hides a dropped item within 1.2 blocks of the camera (a death's scatter from the eyes), so one
        // that close is not on screen (gold_for_the_portal s04b: the string 0.79 from the lens, check OK, no string)
        if (e.type === 'item' && Math.hypot(e.x - cam.x, e.y + 0.25 - cam.y, e.z - cam.z) < 1.2) continue
        if (norm(e.type) === name || (e.type === 'item' && norm(ex.item) === name)) pts.push({ x: e.x, y: e.y + Math.min(e.h, 2) / 2, z: e.z, h: e.type === 'item' ? 0.35 : e.h })
        else if (wears) pts.push({ x: e.x, y: e.y + e.h * 0.9, z: e.z, h: 0.5 })
      }
      // a block: its centre or a point near any edge (a stack at the frame's edge still shows)
      for (const name of names) for (const [x, y, z] of blocksNear(new RegExp(`^${name}$`), cam, t)) for (const [dx, dz] of [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5], [0.5, 0.15], [0.5, 0.85]]) pts.push({ x: x + dx, y: y + 0.5, z: z + dz, h: 1, block: [x, y, z] })
      for (const c of pts) {
        const p = toFrame(scene, cam, fr, c)
        if (!p || p.x < 0.03 || p.x > 0.97 || p.y < 0.03 || p.y > 0.97) continue
        if (c.h / (2 * p.depth * th) < 0.03) continue   // a speck at phone size
        const o = scene.occluder(cam, c, 0.3)
        if (o && !(c.block && o.x === c.block[0] && o.y === c.block[1] && o.z === c.block[2])) continue
        return true
      }
      return false
    }
    for (const L of lines) {
      const shows = (L.def && L.def.shows) || []
      const span = shows.length && lineSpan(L.id)
      if (!span) continue
      for (const s0 of shows) {
        const spec = showsSpec(s0), names = spec.names, name = names[0]
        const k = showsChunk(L.chunks, spec)
        const from = k >= 0 ? wordTick(L, k) : span[0]
        const nextAt = k >= 0 && L.times && L.times[k + 1] !== undefined ? wordTick(L, k + 1) : span[1]
        const to = Math.max(from + 8, Math.min(nextAt, span[1]))
        let n = 0, good = 0
        for (let t = from; t <= to; t += 2) {
          if (dead(t) || !inShort(t)) continue
          scene.worldAt(Math.floor(t))
          const cam = scene.cameraAt(t)
          if (!cam.known) continue
          const fr = frameFor(scene, ctx, t)
          const pov = !/^shot /.test(cam.mode || '') || /\(pov\)/.test(cam.mode || '')
          const st = stateAt(t)
          n++
          if (shownBy({ names, pov, held: st.held, gui: st.gui, visible: () => visible(names, t, cam, fr, st.held, pov) })) good++
        }
        if (showsMissed(good, n)) add('BLOCK', 'shows', from, `${L.id}: "${spec.word || name}" is said but no ${name} is on screen for ${pct(1 - good / n)} of its words (no dropped item, block, mob, worn or held item, first-person hand or container slot in frame, readable). Owner: "when we say "string" ... no string is on screen" (r:r65ef27): stage it in frame while it's said`)
      }
    }
  }

  // ---------------------------------------------------------------- (b3) the opening shot
  // (owner 2026-11-11 on Good Boy's voiced preview: "The opening scene is not very exciting? Also not centered.": 4 s of
  // Buh walking a dirt road, the dog, the story's subject and narrator, small at the right edge.) The first OPEN.span s of
  // the Short: its subject in frame from frame 1, near the horizontal centre, big enough to read at phone size; and
  // something story-relevant already moving (the subject, or the camera pushing / travelling / turning) in the first
  // OPEN.motionSpan s. BLOCK on a missing / edge / tiny subject, WARN on a static opening.
  if (story && sh0 < N) {
    const ticks = []
    for (let t = sh0; t < N; t++) { const o = outOf(t); if (o === null || o === undefined) continue; if (o > OPEN.span + 1e-6) break; if (!dead(t)) ticks.push(t) }
    const pick = openingSubject(scene, ctx, story, lines, notes, ticks[0] ?? sh0)
    const rows = []
    for (const t of ticks) {
      scene.worldAt(Math.floor(t))
      const cam = scene.cameraAt(t)
      if (!cam.known) continue
      const fr = frameFor(scene, ctx, t)
      const pov = !/^shot /.test(cam.mode || '') || /\(pov\)/.test(cam.mode || '')
      const row = { t, out: outOf(t), cam: { x: cam.x, y: cam.y, z: cam.z, yaw: cam.yaw, pitch: cam.pitch, fov: cam.fov }, pov }
      if (pick && !(pick.sb.self && pov)) {
        const r = judge(pick.sb, t, cam, fr)
        if (r.bad === 'none') row.none = true
        else {
          row.x = r.p ? r.p.x : null; row.y = r.p ? r.p.y : null; row.frac = r.frac; row.inF = r.inF; row.hidden = !!r.hidden; row.label = r.label
          row.at = { x: r.mid.x, y: r.mid.y, z: r.mid.z }
        }
      }
      // anything else moving in frame (a thrown ingot, a mob): the subject's surroundings count as motion too
      row.ents = scene.entities(t).filter(e => Math.hypot(e.x - cam.x, e.y - cam.y, e.z - cam.z) < 32).map(e => ({ id: e.id, x: e.x, y: e.y, z: e.z, p: toFrame(scene, cam, fr, { x: e.x, y: e.y + e.h / 2, z: e.z }) })).filter(e => e.p && e.p.x > 0 && e.p.x < 1 && e.p.y > 0 && e.p.y < 1)
      rows.push(row)
    }
    // actions in the motion window (a swing, a throw, a placed or broken block): story-relevant motion too
    const t1 = ticks.find(t => outOf(t) > OPEN.motionSpan + 1e-6) ?? (ticks[ticks.length - 1] ?? sh0)
    const actions = scene.tl.filter(e => ACTION.test(e.event) && e.t / 50 >= (ticks[0] ?? sh0) - 1 && e.t / 50 <= t1).length
    const v = openingVerdict(rows, { subject: pick, actions })
    if (DEBUG) v.rows = rows.map(r => ({ out: +r.out.toFixed(2), x: r.x && +r.x.toFixed(2), frac: r.frac && +r.frac.toFixed(3), inF: r.inF, hidden: r.hidden, mode: r.pov ? 'pov' : 'shot' }))
    ctx.opening = v
    for (const f of v.findings) add(f.level, 'opening', rows.length ? rows[0].t : sh0, f.msg, { opening: v.stats })
  }

  // ---------------------------------------------------------------- (c) word / picture sync
  // actions in the recording
  const acts = []
  const tl = scene.tl
  for (let i = 0; i < tl.length; i++) {
    const e = tl[i]
    if (e.event === 'dig' && e.x !== undefined) {
      const end = tl.slice(i + 1).find(x => x.event === 'dig_end' || x.event === 'dig')
      const p = pose(Math.round(e.t / 50))
      const under = Math.abs(e.x + 0.5 - p[1]) < 0.9 && Math.abs(e.z + 0.5 - p[3]) < 0.9 && e.y < p[2]
      acts.push({ kind: 'dig', tick: e.t / 50, end: end && end.event === 'dig_end' ? end.t / 50 : e.t / 50, at: [e.x, e.y, e.z], under })
    }
    if (e.event === 'place' || e.event === 'placed') acts.push({ kind: 'place', tick: e.t / 50 })
    if (e.word) acts.push({ kind: 'marked', tick: e.t / 50, word: String(e.word), name: e.event })
  }
  // falls: the feet dropping 1.5+ blocks with no teleport
  const falls = []
  for (let i = 1; i < N - 2; i++) {
    if (isJump(i) || dead(i)) continue
    if (pose(i + 1)[2] < pose(i)[2] - 0.05 && !(pose(i)[2] < pose(i - 1)[2] - 0.05 && !isJump(i - 1))) {
      let j = i
      while (j + 1 < N - 1 && pose(j + 1)[2] <= pose(j)[2] + 0.001 && !isJump(j + 1) && (pose(j + 1)[2] < pose(j)[2] - 0.001 || pose(j + 2)[2] < pose(j + 1)[2] - 0.001)) j++
      const drop = pose(i)[2] - pose(j + 1)[2]
      if (drop >= 1.5 || (drop >= 0.9 && j + 1 - i >= 4)) falls.push({ start: i, end: j + 1, drop, from: pose(i).slice(1, 4) })
      i = j
    }
  }
  // door state changes
  const doors = []
  try {
    const Block = require('prismarine-block')(scene.rec.version)
    const last = new Map()
    for (const b of scene.blocks) {
      const nm = scene.NAME[b[4]] || ''
      if (!/(_door|_trapdoor|fence_gate)$/.test(nm)) continue
      const pr = Block.fromStateId(b[4], 0).getProperties()
      if (pr.half === 'upper') continue
      const k = `${b[1]},${b[2]},${b[3]}`
      let before = last.get(k)
      if (before === undefined) { const c = scene.colOf(b[1], b[3]); before = null; if (c) { /* initial state from the chunks */ } }
      last.set(k, pr.open)
      doors.push({ tick: b[0], at: [b[1], b[2], b[3]], name: nm, open: pr.open, powered: pr.powered, was: before })
    }
    // the first change of a door: compare with the chunk snapshot
    const Chunk = require('prismarine-chunk')(scene.rec.version)
    const { Vec3 } = require('vec3')
    const first = new Map()
    for (const c of scene.rec.columns || []) first.set(`${c.x},${c.z}`, c)
    for (const d of doors) {
      if (d.was !== null && d.was !== undefined) continue
      const col = first.get(`${Math.floor(d.at[0] / 16) * 16},${Math.floor(d.at[2] / 16) * 16}`)
      if (!col) continue
      const ch = (col._ch = col._ch || Chunk.fromJson(col.chunk))
      const s0 = ch.getBlockStateId(new Vec3(d.at[0] & 15, d.at[1], d.at[2] & 15))
      const n0 = scene.NAME[s0] || ''
      d.was = /(_door|_trapdoor|fence_gate)$/.test(n0) ? Block.fromStateId(s0, 0).getProperties().open : null
    }
  } catch (e) { notes.push(`door states could not be read: ${e.message}`) }
  const doorMoves = doors.filter(d => d.was !== null && d.was !== undefined && d.was !== d.open)

  const verbs = {
    dig: /^(dig|dug|digging|digs|mine|mined|mining)$/i,
    fall: /^(fall|fell|falling|falls|drop|dropped|dropping)$/i,
    place: /^(place|placed|placing|put)$/i,
    door: /^(open|opened|opens|opening|close|closed|closes|shut|slam|slammed|knock|knocked)$/i
  }
  const NEG = /^(never|don't|dont|do|not|didn't|didnt|can't|cant|won't|wont|no)$/i
  for (const L of lines) {
    const span = lineSpan(L.id)
    if (!span) continue
    const ws = []   // [chunk, word]
    L.chunks.forEach((c, k) => words(c).forEach(w => ws.push([k, w])))
    // the action words and their first chunk
    for (const [kind, re] of Object.entries(verbs)) {
      const hit = ws.findIndex(([, w]) => re.test(w))
      if (hit < 0) continue
      const k = ws[hit][0]
      const prev = ws.slice(Math.max(0, hit - 3), hit).map(x => x[1])
      const negated = prev.some(w => NEG.test(w) && !/^do$/i.test(w)) || (prev.length >= 2 && /^do$/i.test(prev[prev.length - 2]) && /^not$/i.test(prev[prev.length - 1]))
      const wt = wordTick(L, k)
      const word = ws[hit][1]
      const evs = kind === 'dig' ? acts.filter(a => a.kind === 'dig').map(a => ({ tick: a.tick, what: `the dig at ${a.at.join(' ')}`, under: a.under }))
        : kind === 'place' ? acts.filter(a => a.kind === 'place').map(a => ({ tick: a.tick, what: 'a block placed' }))
          : kind === 'fall' ? falls.map(f => ({ tick: f.start, what: `a ${f.drop.toFixed(1)}-block fall` }))
            : doorMoves.map(d => ({ tick: d.tick, what: `the ${d.name} at ${d.at.join(' ')} ${d.open ? 'opening' : 'closing'}` }))
      if (negated) {
        // "never dig straight down" over a dig straight down
        const down = ws.slice(hit + 1, hit + 4).some(([, w]) => /^down$/i.test(w))
        const inLine = evs.filter(e => e.tick >= span[0] - 2 && e.tick <= span[1] + 20 && (!down || e.under))
        if (inLine.length) add(prev.some(w => /^never$/i.test(w)) ? 'BLOCK' : 'WARN', 'sync', inLine[0].tick, `the line says "${prev.join(' ')} ${word}${down ? ' ... down' : ''}" and the picture shows it: ${inLine[0].what} at ${(outOf(inLine[0].tick) ?? 0).toFixed(2)} s. Owner: "you dig straight down when you say 'never dig straight down'"`)
        continue
      }
      // the action before its word (from 1 s before the line)
      const early = evs.filter(e => e.tick >= span[0] - 20 && e.tick < wt - 10 && inShort(e.tick))
      if (early.length) add(L.times ? 'BLOCK' : 'WARN', 'sync', early[0].tick, `the picture is ahead of the words: ${early[0].what} at ${outOf(early[0].tick).toFixed(2)} s, the word "${word}" at ${(outOf(wt) ?? 0).toFixed(2)} s. Start the action on the word (stunt: wait for the line's word time)`)
      // dig: already down the hole when the line says it
      if (kind === 'dig' && wt !== null) {
        scene.worldAt(Math.floor(wt))
        const p = pose(Math.round(wt))
        const fx = Math.floor(p[1]), fy = Math.floor(p[2] + 0.01), fz = Math.floor(p[3])
        const solid = (x, y, z) => { const s = scene.state(x, y, z); return s > 0 && scene.OPAQUE[s] }
        const walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => solid(fx + dx, fy, fz + dz) && solid(fx + dx, fy + 1, fz + dz)).length
        if (walls >= 3 && inShort(wt)) add('BLOCK', 'sync', wt, `the line says "${word}" and the player is already down a hole (walls on ${walls} sides at head height, feet at y ${fy}). Owner: "when we say 'dug under it' we are already in the hole": start on the surface and dig on the word`)
      }
    }
  }
  // explicit stunt marks with a `word`: never before that word in their line
  for (const a of acts.filter(a => a.kind === 'marked')) {
    const id = lineAt(a.tick)
    const L = lines.find(l => l.id === id)
    const nextL = lines[lines.indexOf(L) + 1]
    const find = (LL) => LL ? LL.chunks.findIndex(c => c.toLowerCase().includes(a.word.toLowerCase())) : -1
    let k = find(L), LL = L
    if (k < 0 && nextL) { k = find(nextL); LL = nextL }
    if (k < 0) { notes.push(`mark ${a.name} has word "${a.word}" that no nearby line says`); continue }
    const wt = wordTick(LL, k)
    if (wt !== null && a.tick < wt - 5 && inShort(a.tick)) add('BLOCK', 'sync', a.tick, `${a.name} at ${outOf(a.tick).toFixed(2)} s comes before its word "${a.word}" (${(outOf(wt) ?? 0).toFixed(2)} s, ${LL.id})`)
  }
  // a fall needs a cause: a dig/break under the player, a block gone under the feet, a hit, a walk off an edge, a jump
  const hurts = tl.filter(e => ['hurt', 'hurt_dir', 'knockback', 'explosion', 'boom'].includes(e.event)).map(e => e.t / 50)
  for (const f of story ? falls : []) {
    if (!inShort(f.start)) continue
    const p = pose(f.start)
    const fx = Math.floor(p[1]), fz = Math.floor(p[3]), fy = Math.floor(p[2] + 0.01)
    const dug = acts.some(a => a.kind === 'dig' && a.end <= f.start + 2 && a.end >= f.start - 25 && Math.abs(a.at[0] - fx) <= 1 && Math.abs(a.at[2] - fz) <= 1 && a.at[1] <= fy)
    // a block that just vanishes (a /fill) is no cause: only a dig, a 'broke' mark, an explosion or a trapdoor opening
    const gone = tl.some(e => ['broke', 'explosion', 'boom', 'break'].includes(e.event) && e.t / 50 >= f.start - 25 && e.t / 50 <= f.start + 2) ||
      doorMoves.some(d => d.open && d.tick >= f.start - 25 && d.tick <= f.start + 2 && Math.abs(d.at[0] - fx) <= 1 && Math.abs(d.at[2] - fz) <= 1 && d.at[1] < fy && d.at[1] >= fy - 2)
    const hit = hurts.some(h => h >= f.start - 25 && h <= f.start + 2)
    const walk = Math.hypot(pose(f.start)[1] - pose(f.start - 4)[1], pose(f.start)[3] - pose(f.start - 4)[3]) / 4 > 0.08
    let rose = false
    for (let i = Math.max(1, f.start - 14); i < f.start; i++) if (pose(i + 1)[2] > pose(i)[2] + 0.05 && !isJump(i)) rose = true
    if (dug || gone || hit || walk || rose) continue
    add('BLOCK', 'sync', f.start, `the player falls ${f.drop.toFixed(1)} blocks (y ${p[2].toFixed(1)} -> ${pose(f.end)[2].toFixed(1)}) with no cause in the 1.25 s before: no dig or broken block under the feet, no hit, no step off an edge. Owner: "why do we start falling without us digging?"`)
  }

  // ---------------------------------------------------------------- (d) glitches
  // doors that move with nobody using them
  const USE = /^(use|use_start|activate|interact|door|open|close|knock|right_click|click|swing)$/
  const OPENERS = /^(villager|player|mannequin|piglin|piglin_brute|vindicator|evoker|pillager|wandering_trader|zombie|zombie_villager|husk|witch)$/
  for (const d of doorMoves) {
    if (!inShort(d.tick) || d.powered) continue
    const c = { x: d.at[0] + 0.5, y: d.at[1] + 1, z: d.at[2] + 0.5 }
    const p = pose(Math.round(d.tick))
    const pd = Math.hypot(p[1] - c.x, p[2] + 1.6 - c.y, p[3] - c.z)
    const used = tl.some(e => USE.test(e.event) && Math.abs(e.t / 50 - d.tick) <= 6) && pd < 5
    const camP = scene.cameraAt(d.tick)
    if (camP.known && Math.hypot(camP.x - c.x, camP.y - c.y, camP.z - c.z) > 24) continue   // a village door far off: its villagers
    const mob = [-10, -5, 0, 5].flatMap(dt => scene.entities(Math.max(0, d.tick + dt))).filter(e => OPENERS.test(e.type) && Math.hypot(e.x - c.x, e.z - c.z) < 3 && Math.abs(e.y - d.at[1]) < 2)
    const redstone = scene.blocks.some(b => Math.abs(b[0] - d.tick) <= 2 && Math.abs(b[1] - d.at[0]) <= 2 && Math.abs(b[2] - d.at[1]) <= 2 && Math.abs(b[3] - d.at[2]) <= 2 && /(lever|button|pressure_plate|redstone)/.test(scene.NAME[b[4]] || ''))
    if (used || mob.length || redstone) continue
    scene.worldAt(Math.floor(d.tick))
    const cam = scene.cameraAt(d.tick)
    let seen = false
    if (cam.known) { const fr = frameFor(scene, ctx, d.tick); const q = toFrame(scene, cam, fr, c); seen = !!(q && q.x > 0 && q.x < 1 && q.y > 0 && q.y < 1 && q.depth < 48 && !scene.occluder(cam, c, 0.3)) }
    add(seen ? 'BLOCK' : 'WARN', 'glitch', d.tick, `the ${d.name} at ${d.at.join(' ')} ${d.open ? 'opens' : 'closes'} by itself${seen ? ' in view' : ' (out of view, but heard)'}: no use mark, no villager or actor next to it (nearest ${(() => { const e = scene.entities(d.tick).filter(x => x.type !== 'item').map(x => [x.label, Math.hypot(x.x - c.x, x.z - c.z)]).sort((a, b) => a[1] - b[1])[0]; return e ? `${e[0]} ${e[1].toFixed(1)} blocks` : 'nobody' })()}, player ${pd.toFixed(1)} blocks). Owner: "the door closes automatically without pressing it": have someone use it (ctx.mark('use')) or leave it`)
  }
  // stuck: walking, then stopped dead against a block for 0.3 s+ (or pressing forward with no speed: pose flag 4)
  const hs = (i) => Math.hypot(pose(i + 1)[1] - pose(i)[1], pose(i + 1)[3] - pose(i)[3])
  for (let i = 4; i < N - 8; i++) {
    if (isJump(i) || dead(i) || !inShort(i)) continue
    const fwd = (pose(i)[8] || 0) & 3   // forward/back held (recordings from 2026-11-10 on)
    const before = (hs(i - 3) + hs(i - 2) + hs(i - 1)) / 3
    const walking = [i - 3, i - 2, i - 1].every(k => hs(k) > 0.08 && hs(k) < 0.5 && !isJump(k))
    const abrupt = walking && hs(i) < 0.6 * before && hs(i + 1) < 0.01
    if (!abrupt && !(fwd && hs(i) < 0.005)) continue
    let j = i + 1
    while (j < N - 2 && hs(j) < 0.01 && !isJump(j)) j++
    if (j - i < 6 && !(fwd && j - i >= 6)) continue
    // what is ahead in the direction of travel
    const dx = pose(i)[1] - pose(i - 3)[1], dz = pose(i)[3] - pose(i - 3)[3], m = Math.hypot(dx, dz) || 1
    const still = Math.hypot(dx, dz) < 0.05
    const ux = still ? -Math.sin(pose(i)[4]) : dx / m, uz = still ? -Math.cos(pose(i)[4]) : dz / m
    const p = pose(i + 1)
    scene.worldAt(i + 1)
    let ahead = null
    for (const dy of [0.2, 1.2]) for (const s of [0.35, 0.5]) {
      const x = Math.floor(p[1] + ux * s), y = Math.floor(p[2] + dy), z = Math.floor(p[3] + uz * s)
      const n = scene.blockName(x, y, z)
      if (n && !PLANT.test(n) && n !== 'water') { ahead = `${n} at ${x} ${y} ${z}`; break }
      if (ahead) break
    }
    if (!ahead && !fwd) continue
    // facing the way it walked (not a turn-and-stop)
    const yawMove = Math.atan2(-ux, -uz)
    if (Math.abs(wrap(pose(i)[4] - yawMove)) > 1.0 && !fwd) continue
    const lvl = /(_door|fence|_gate|_wall|pane|bars)/.test(ahead || '') ? 'BLOCK' : 'WARN'
    add(lvl, 'glitch', i, `the player walks into ${ahead || 'something'} and stops dead for ${((j - i) / 20).toFixed(2)} s (${(before * 20).toFixed(1)} blocks/s -> 0): reads as stuck. Owner: "when we walk out we keep getting stuck on the door": open it first, path around it, or cut before contact`)
    i = j
  }
  // jitter: the aim or the position zig-zagging (3+ reversals within 0.4 s, each step over the threshold), and
  // one-tick snaps. F1 drone cameras and movie-engine camera shots are not the player's eye: skipped.
  const rate = (i, k) => k === 'yaw' ? wrap(pose(i + 1)[4] - pose(i)[4]) : k === 'pitch' ? pose(i + 1)[5] - pose(i)[5] : pose(i + 1)[k === 'x' ? 1 : k === 'y' ? 2 : 3] - pose(i)[k === 'x' ? 1 : k === 'y' ? 2 : 3]
  const TH = { yaw: 0.07, pitch: 0.07, x: 0.08, y: 0.08, z: 0.08 }
  const F1 = scene.F1 || []
  const inF1 = (i) => F1.some(([x, y]) => i >= x - 1 && i < y + 1)
  // a sped-up span (a time-lapse: 1 s of source in under 0.6 s of the Short) skips ticks anyway
  const fast = (i) => { const a = outOf(i), b = outOf(i + 20); return a !== null && a !== undefined && b !== null && b !== undefined && b - a < 0.6 }
  const camOK = (i) => !isJump(i) && !dead(i) && inShort(i) && !inF1(i) && !fast(i) && !(scene.shotAt && scene.shotAt(i) && !scene.shotAt(i).spec.pov)
  let lastJ = -99
  for (const k of ['yaw', 'pitch', 'x', 'y', 'z']) {
    const rev = []
    for (let i = 1; i < N - 2; i++) {
      if (!camOK(i) || !camOK(i - 1)) continue
      const a = rate(i - 1, k), b = rate(i, k)
      if (Math.abs(a) > TH[k] && Math.abs(b) > TH[k] && Math.sign(a) !== Math.sign(b)) rev.push(i)
    }
    for (let q = 0; q + 2 < rev.length; q++) {
      if (rev[q + 2] - rev[q] > 8 || rev[q] - lastJ <= 40) continue
      const win = rev.filter(r => r >= rev[q] && r < rev[q] + 20)
      lastJ = rev[q]
      add(win.length >= 4 ? 'BLOCK' : 'WARN', 'glitch', rev[q], `camera jitter: the ${k === 'yaw' || k === 'pitch' ? k : k + ' position'} zig-zags ${win.length} times in 1 s (3 within ${((rev[q + 2] - rev[q]) / 20).toFixed(2)} s, steps over ${k === 'yaw' || k === 'pitch' ? Math.round(TH[k] * 180 / Math.PI) + ' deg' : TH[k] + ' blocks'} a tick). Owner: "looks like it's glitching a bunch"`)
    }
  }
  // whip pans (owner 2026-11-11 on hide_seek: "the camera moves around so quickly some of the time. It's a little bit
  // confusing to try and follow", r:r38374d): lib/hb/owner.js whipCheck, on the view's ON-SCREEN turn speed (the source
  // speed x the edit's speed factor, so a x3 time-lapse of 220 deg/s turns is 660 deg/s on the phone: heart_art and
  // sword_art's review, 2026-11-11), everywhere the Short shows it, outside hard cuts.
  {
    const camYP = (i) => { const c = scene.cameraAt(i); return c && c.known ? c : null }
    const LAND = /^(landed\d*|placed\d*|clutch\d*|land\d*)$/   // a clutch's landing marks (boat_clutch landed, clutch_harder placed<N>)
    const W = whipCheck({ N, sh0, sh1, outOf, camAt: camYP, cutTicks, skip: (i) => isJump(i) || nearCut(i + 1, 1) || dead(i),
      landings: scene.tl.filter(e => LAND.test(e.event)).map(e => e.t / 50), whipOk: scene.tl.filter(e => e.event === 'whip_ok').map(e => e.t / 50) })
    for (const w of W.allowed) notes.push(`whip allowed at ${(outOf(w.tick) ?? 0).toFixed(2)} s (${Math.round(w.speed)} deg/s for ${w.secs.toFixed(2)} s): the clutch's look-down at the landing (${w.why}), owner r:r258d1b`)
    ctx.whip = W.stats
    for (const w of W.whips) add('BLOCK', 'whip', w.tick, `whip pan: the ${camShot(w.tick) && camShot(w.tick).shot ? `shot ${camShot(w.tick).shot}` : 'view'} turns at up to ${Math.round(w.speed)} deg/s on screen for ${w.secs.toFixed(2)} s of the Short${w.factor > 1.2 ? ` (inside a x${+w.factor.toFixed(1)} sped-up span: ${Math.round(w.speed / w.factor)} deg/s in the recording)` : ''} (cap ${WHIP.cap} deg/s, ${WHIP.ticks} ticks). Owner: "the camera moves around so quickly ... it's a little bit confusing to try and follow": ease the turn and slow it (lib/act.js turns at <= 220 deg/s${w.factor > 1.2 ? `; in a time-lapse at <= 220 / x${+w.factor.toFixed(1)} = ${Math.round(220 / w.factor)} deg/s, or film it from one steady camera (r:r200cfe)` : ''}), or cut instead of whipping (r:r38374d)`, { speed: Math.round(w.speed), factor: +w.factor.toFixed(2) })
    for (const t of W.unrested) add('WARN', 'whip', t.tick, `the view swings ${Math.round(t.a)} deg then ${Math.round(t.b)} deg with ${t.rest.toFixed(2)} s at rest between (want ${WHIP.rest} s on something to read it, r:r38374d)`)
  }
  // edit cuts inside one shot: editCutSnaps below (hide_seek review 2026-11-11, r:r38374d)
  {
    const camAt = (i) => { const c = scene.cameraAt(i); return c && c.known ? c : null }
    ctx.editCuts = editCutSnaps({ N, sh0, sh1, outOf, camAt, cutTicks, other: (i) => dead(i) || inF1(i) })
    for (const r of ctx.editCuts) if (r.level) add(r.level, 'whip', r.tick, r.msg, { speedOut: r.speedOut, speedIn: r.speedIn })
  }
  // one-tick snaps of the aim (a pose that disagrees with both neighbours)
  for (let i = 1; i < N - 2; i++) {
    if (!inShort(i) || dead(i) || isJump(i) || inF1(i) || fast(i)) continue
    const a = pose(i - 1), b = pose(i), c = pose(i + 1)
    if (step(i - 1) > 4 && !isJump(i)) continue
    const dy1 = Math.abs(wrap(b[4] - a[4])), dy2 = Math.abs(wrap(c[4] - b[4])), dyac = Math.abs(wrap(c[4] - a[4]))
    const dp1 = Math.abs(b[5] - a[5]), dp2 = Math.abs(c[5] - b[5]), dpac = Math.abs(c[5] - a[5])
    const cutBefore = isJump(i - 1)
    // after a cut: the landing tick's aim is not the next tick's (the /tp landed with another aim)
    // isolated: the ticks around the spike are calm (a fast whip that overshoots isn't a snap)
    const calm = (j) => Math.abs(wrap(pose(j + 1)[4] - pose(j)[4])) < 0.05 && Math.abs(pose(j + 1)[5] - pose(j)[5]) < 0.05
    const isolated = (cutBefore || calm(i - 2)) && calm(i + 1)
    if (isolated && (cutBefore ? (dy2 > 0.12 || dp2 > 0.12) && camOK(i) : ((dy1 > 0.1 && dy2 > 0.1 && dyac < 0.4 * Math.min(dy1, dy2)) || (dp1 > 0.1 && dp2 > 0.1 && dpac < 0.4 * Math.min(dp1, dp2))))) {
      if (cutBefore) {
        // a fast pan right after a cut is not a snap: only when the next ticks are calm
        const after = Math.abs(wrap(pose(i + 2)[4] - c[4])) + Math.abs(pose(i + 2)[5] - c[5])
        if (after > 0.05) continue
      }
      if (i - lastJ <= 20) continue
      lastJ = i
      add('BLOCK', 'glitch', i, `one-tick aim snap${cutBefore ? ' right after a cut' : ''}: yaw ${Math.round(a[4] * 57.3)} -> ${Math.round(b[4] * 57.3)} -> ${Math.round(c[4] * 57.3)} deg, pitch ${Math.round(a[5] * 57.3)} -> ${Math.round(b[5] * 57.3)} -> ${Math.round(c[5] * 57.3)} deg: a frame of the wrong view${cutBefore ? ' (put the shot\'s yaw/pitch in the /tp itself)' : ''}`)
    }
  }
  // motion (owner, 2026-11-10: "The movement sometimes still feels jerky and botlike"; lib/hb/motion.js): the view moving
  // under an open container, mobs teleporting, whips and kicks of the aim, sliding along a block, and the kit's own
  // record-time marks (stuck, motion_warn). The renderer's engine-3 motion fixes (render.js MOTION_FIXES) hold the view
  // under a container and snap a cast member moved with a cut onto it: those findings drop to a note there.
  {
    const MO = require('./motion')
    const fixes = process.env.MOTION_FIXES ? process.env.MOTION_FIXES === '1' : !!((scene.stunt && scene.stunt.motionFixes) ?? ((scene.rec.engine || 0) >= 3))
    for (const f of MO.guiMotion(scene.P, scene.tl)) if (inShort(f.tick)) add(fixes ? 'NOTE' : 'BLOCK', 'glitch', f.at, fixes ? `${f.msg.split(':')[0]} in the recording; the renderer's motion fixes hold it still` : f.msg)
    // where a jump is, against the view (MO.viewClass): in the frame and not behind blocks: BLOCK; just off it, behind
    // blocks under 32 blocks, or within 8 blocks of the camera: WARN; far away or hidden far away (dog_hill's village
    // 40-60 blocks behind the hill): not a finding
    const viewAt = (tick, p) => {
      scene.worldAt(Math.floor(tick))
      const cam = scene.cameraAt(tick)
      if (!cam.known) return null
      const fr = frameFor(scene, ctx, tick), pt = { x: p[0], y: p[1] + 1, z: p[2] }, q = toFrame(scene, cam, fr, pt)
      const inFrame = !!(q && q.x > 0 && q.x < 1 && q.y > 0 && q.y < 1)
      const margin = !!(q && q.x > -0.25 && q.x < 1.25 && q.y > -0.25 && q.y < 1.25)
      const occluded = inFrame && !!scene.occluder(cam, pt, 0.3) && !!scene.occluder(cam, { x: p[0], y: p[1] + 0.3, z: p[2] }, 0.3)
      return MO.viewClass({ inFrame, margin, depth: q ? q.depth : Infinity, dist: Math.hypot(pt.x - cam.x, pt.y - cam.y, pt.z - cam.z), occluded })
    }
    const rank = { seen: 2, near: 1 }
    for (const f of MO.teleports(scene.rec.entities || [], cutTicks, { snapped: fixes, ok: MO.teleportOk(scene.tl) })) {
      if (!inShort(f.tick + 1) || dead(f.tick)) continue
      const v = [viewAt(f.tick + 1, f.from), viewAt(f.tick + 1, f.to)].sort((a, b) => (rank[b] || 0) - (rank[a] || 0))[0]
      if (!v) continue
      add(v === 'seen' ? 'BLOCK' : 'WARN', 'glitch', f.tick + 1, `${f.msg}${v === 'seen' ? '' : ' (just out of view)'}`)
    }
    for (const f of MO.headSnaps(scene.P, (i) => camOK(i) && !nearCut(i, 2))) add('WARN', 'glitch', f.tick, f.msg)
    for (const f of MO.stalls(scene.P, (i) => camOK(i) && !nearCut(i, 2))) add('WARN', 'glitch', f.tick, f.msg)
    for (const e of scene.tl.filter(m => m.event === 'stuck' || m.event === 'motion_warn')) {
      const tk = e.t / 50
      if (!inShort(tk)) continue
      add('WARN', 'glitch', tk, e.event === 'stuck' ? `the story kit saw the player walk into something here (${e.x} ${e.y} ${e.z}): K.walkTo with a point around it` : `the story kit refused a ${e.kind === 'actor_jump' ? `${e.blocks}-block jump of ${e.tag} with no cut (walked it instead)` : e.kind}: move it with a cut, or K.warp it off screen`)
    }
  }
  // start-stop stutter: dropping in steps (fall, land, fall, land: 3+ drops in 1.5 s with short stops between),
  // e.g. digging down a block at a time. Jumps (up and down) don't count.
  let lastS = -99
  for (let i = 1; i < N - 30; i++) {
    if (!camOK(i) || i - lastS <= 40) continue
    let drops = 0, inDrop = false, stop = 0, ok = true
    for (let j = i; j < i + 30; j++) {
      if (dead(j) || !inShort(j) || inF1(j) || fast(j)) { ok = false; break }
      if (isJump(j)) { inDrop = false; continue }
      const v = rate(j, 'y')
      if (v > 0.05) { ok = false; break }   // going up: a jump, not a stutter
      if (v < -0.05) { if (!inDrop) { drops++; inDrop = true; stop = 0 } } else if (inDrop) { inDrop = false } else stop++
      if (stop > 8) { if (drops < 3) { drops = 0 } }
    }
    if (ok && drops >= 3) {
      lastS = i
      add('WARN', 'glitch', i, `start-stop stutter: the camera drops in ${drops} steps within 1.5 s (fall, stop, fall: digging down a block at a time): reads as a glitch. Owner: "looks like it's glitching a bunch": one smooth move, or cut between`)
    }
  }
  // the story's look: fog / night / rain promised by the bible keys or the words, missing from the recording
  checkLook(scene, ctx, story, add, notes)

  F.sort((a, b) => (a.out ?? -1) - (b.out ?? -1))
  return { findings: F, notes, world: clr, flatRows: ctx.flatRows || [], editCuts: ctx.editCuts || [], lookShots, opening: ctx.opening || null, debug: DEBUG ? FINE : undefined }
}

// story.json v2 `look` / `weather` (top level, or per shot in shots[]): { fog: true, time: 'night'|ticks } and
// 'rain'|'thunder'|'clear'. Without keys, the caption, logline, question, premise and the bible's World section
// are read for the words (a warning; the caption naming it is a blocker: the title promises it).
function checkLook (scene, ctx, story, add, notes) {
  if (!story) return
  const st = story.st
  const keys = { fog: null, night: null, rain: null }
  const lk = st.look || {}
  if (lk.fog !== undefined) keys.fog = { want: !!lk.fog, src: 'look.fog', hard: true }
  const tm = lk.time ?? st.time
  if (tm !== undefined) keys.night = { want: typeof tm === 'number' ? tm >= 13000 && tm < 23000 : /night|midnight|dark/.test(String(tm)), src: 'look.time', hard: true }
  const w = lk.weather ?? st.weather
  if (w !== undefined) keys.rain = { want: /rain|thunder|storm/.test(String(w)), src: 'weather', hard: true }
  // per shot (shots[].look / shots[].weather): any shot that asks for it
  for (const sh of st.shots || []) {
    const l2 = sh.look || {}
    if (l2.fog && !keys.fog) keys.fog = { want: true, src: `shot ${sh.id} look.fog`, hard: true }
    const t2 = l2.time ?? sh.time
    if (t2 !== undefined && !keys.night && (typeof t2 === 'number' ? t2 >= 13000 && t2 < 23000 : /night|midnight|dark/.test(String(t2)))) keys.night = { want: true, src: `shot ${sh.id} look.time`, hard: true }
    const w2 = l2.weather ?? sh.weather
    if (w2 !== undefined && !keys.rain && /rain|thunder|storm/.test(String(w2))) keys.rain = { want: true, src: `shot ${sh.id} weather`, hard: true }
  }
  let bible = ''
  if (st.bible) { try { bible = fs.readFileSync(path.isAbsolute(st.bible) ? st.bible : path.join(ctx.storyRoot || ROOT, st.bible), 'utf8') } catch (e) {} }
  const world = (/## World([\s\S]*?)(\n## |$)/.exec(bible) || [])[1] || ''
  // the promise to the viewer (caption, logline, question) and the bible's World section; not the premise, which
  // talks about what doesn't happen too ("the sun won't set": no night)
  const texts = [['the caption', st.caption || ''], ['the logline', st.logline || ''], ['the question', st.question || ''], ['the bible', world]]
  const RE = { fog: /\b(fog|foggy|mist|misty|haze)\b/i, night: /\b(night|midnight|nightfall|dark)\b/i, rain: /\b(rain|raining|rainy|storm|thunder|thunderstorm)\b/i }
  for (const k of Object.keys(keys)) {
    if (keys[k]) continue
    const hit = texts.find(([, t]) => RE[k].test(t))
    if (hit) keys[k] = { want: true, src: hit[0], hard: hit[0] === 'the caption', word: RE[k].exec(hit[1])[0] }
  }
  const S = ctx.stunt || {}
  const rec = scene.rec
  const has = {
    // the Darkness effect (a warden, a sculk shrieker) draws its own 15-block black fog (render.js DARK, page.js
    // DarknessFogFunction): light_sleeper's "fog" is that, and it was flagged as missing (visual audit 2026-11-10)
    fog: !!(S.fogSea || (S.look && (S.look.fog || S.look.haze || S.look.mist)) || ((rec && rec.timeline) || []).some(e => e.event === 'effect' && e.effect === 'darkness')),
    night: scene.TIMES.some(([t, d]) => { const x = ((d % 24000) + 24000) % 24000; return x >= 13000 && x < 23000 }),
    rain: scene.WEATHER.some(([, v]) => /rain|thunder/.test(v))
  }
  const fix = { fog: 'stunt.fogSea (docs/movie_engine.md) or a look with fog; render distance alone draws no fog', night: 'a night time on the shots (K.cut(..., { time: 18000 }))', rain: "stunt.weather 'rain' or ctx.setWeather" }
  for (const [k, v] of Object.entries(keys)) {
    if (!v || !v.want || has[k]) continue
    add(v.hard ? 'BLOCK' : 'WARN', 'glitch', null, `the story is about ${k === 'night' ? 'the night' : k} (${v.src}${v.word ? `: "${v.word}"` : ''}) and the recording has none: ${fix[k]}. Owner: "there's no fog" (the story is about fog)`)
  }
}

// ---------------------------------------------------------------- whip pans
// The view's turn speed as the viewer sees it (owner r:r38374d, "the camera moves around so quickly ... confusing to
// follow"). Each tick's turn is divided by the output time it takes in the Short (outOf), so a speed span multiplies
// it: heart_art's x2 and sword_art's x3 time-lapses ran the pixel-art governor's 220 deg/s turns at p90 343-554 deg/s,
// 30-deg flicks out and back several times a second (review 2026-11-11), which the old check skipped as "sped up".
// Hard cuts are not turns: a speed 'cut' span (a tick that takes no output time) and the ticks either side of it, and
// whatever skip(i) says (camera cut marks, deaths). Slow-mo lowers the speed the same way.
//   BLOCK: over WHIP.cap deg/s on screen for more than WHIP.ticks recording ticks in a row (the same thresholds as at
//          x1: creeper_art / lapse_statue's eased 220 deg/s turns pass, hide_seek's p95 364 deg/s doesn't).
//   WARN:  two big turns (>= WHIP.big deg at over WHIP.bigSpeed deg/s) with under WHIP.rest s of the Short at rest
//          between them.
// Returns { sp (deg/s on screen per tick, null where not measured), whips [{tick, ticks, secs, speed, factor}],
// unrested [{tick, a, b, rest}], stats {p50, p90, p95, max, sped (ticks measured inside speed spans)} }.
const WHIP = { cap: 240, ticks: 3, big: 60, bigSpeed: 90, rest: 0.3, restSpeed: 45, win: 3, cutRun: 4, landWin: 20, downPitch: -60 }   // rest 0.3: creeper_art (the owner's reference) rests 0.35 s between its wall turns
//   allowed: the owner's one exception (r:r258d1b, 2026-11-11 "All ok"): a clutch Short's single quick look-down at the
//          landing may run over the cap. Given landing ticks (`landings`: a clutch's landed / placed<N> marks) and
//          `whipOk` ticks (a stunt's explicit ctx.mark('whip_ok') on that look), a whip starting within WH.landWin ticks of
//          one, whose view is (or comes from) steeply down (pitch under WH.downPitch deg somewhere in it or the 6 ticks
//          before), is listed in `allowed` instead of `whips`; one per landing mark. Every other turn keeps the rule.
function whipCheck ({ N, sh0 = 0, sh1 = N - 1, outOf, camAt, cutTicks = [], skip = () => false, landings = [], whipOk = [] }, WH = WHIP) {
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  const has = (v) => v !== null && v !== undefined
  // a hard cut: WH.cutRun+ ticks in a row on the same frame of the Short (a speed 'cut' span; even a x8 roof lapse
  // shows a new frame every 3 ticks). The step into it and the hidden ticks inside it are not turns.
  const cut = new Array(N).fill(false)
  for (let i = Math.max(0, sh0); i < Math.min(N - 1, sh1); i++) {
    const o = outOf(i)
    if (!has(o)) continue
    let j = i
    while (j + 1 < N && has(outOf(j + 1)) && Math.abs(outOf(j + 1) - o) < 0.004) j++
    if (j - i + 1 >= WH.cutRun) for (let k = Math.max(0, i - 1); k < j; k++) cut[k] = true   // the frame shows tick j (timewarp: a cut's start maps to its end): j -> j+1 is the shot going on
    i = j
  }
  // the speed factor at tick i: recording time over Short time across +-WH.win ticks (output times sit on 60 fps frames,
  // so one tick of a x2 span is 1 or 2 frames), the window stopping at a cut
  const factor = (i) => {
    let a = i, b = i + 1
    while (a > i - WH.win && a > 0 && !cut[a - 1] && has(outOf(a - 1))) a--
    while (b < i + 1 + WH.win && b < N - 1 && !cut[b] && has(outOf(b + 1))) b++
    const d = outOf(b) - outOf(a)
    return d > 1e-6 ? (b - a) * 0.05 / d : null
  }
  const dt = (i) => { const f = fac[i]; return f ? 0.05 / f : 0 }
  const sp = new Array(N).fill(null), fac = new Array(N).fill(1)
  for (let i = Math.max(1, sh0 - 1); i < Math.min(N - 1, sh1 + 1); i++) {
    if (!has(outOf(i)) || !has(outOf(i + 1)) || cut[i] || skip(i)) continue
    const f = factor(i)
    if (!f) continue
    const a = camAt(i), b = camAt(i + 1)
    if (!a || !b || a.mode !== b.mode || Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 4) continue
    sp[i] = Math.hypot(wrap(b.yaw - a.yaw) * Math.cos(a.pitch), b.pitch - a.pitch) * 180 / Math.PI * 20 * f
    fac[i] = f
  }
  let run = 0, worst = 0, wf = 1, secs = 0, lastW = -99
  const whips = [], allowed = [], used = new Set()
  const downAt = (a, b) => { for (let k = Math.max(0, a - 6); k <= Math.min(N - 1, b); k++) { const c = camAt(k); if (c && c.pitch * 180 / Math.PI < WH.downPitch) return true } return false }
  const exempt = (t, n) => {
    const near = [...whipOk.map(m => ['whip_ok', m]), ...landings.map(m => ['landing', m])].filter(([, m]) => !used.has(m) && Math.abs(t - m) <= WH.landWin)
    if (!near.length || !downAt(t, t + n)) return null
    used.add(near[0][1])
    return near[0][0]
  }
  for (let i = 0; i < N; i++) {
    if (sp[i] !== null && sp[i] > WH.cap) { run++; secs += dt(i); if (sp[i] > worst) { worst = sp[i]; wf = fac[i] } } else {
      if (run > WH.ticks && i - run - lastW > 20) {
        const w = { tick: i - run, ticks: run, secs, speed: worst, factor: wf }
        const why = exempt(w.tick, run)
        if (why) allowed.push({ ...w, why }); else { whips.push(w); lastW = i - run }
      }
      run = 0; worst = 0; wf = 1; secs = 0
    }
  }
  // big turns with no rest between (rest counted in seconds of the Short)
  const turns = []
  let s0 = -1, acc = 0
  for (let i = 0; i <= N; i++) {
    const v = sp[i]
    if (has(v) && v > WH.bigSpeed) { if (s0 < 0) { s0 = i; acc = 0 } acc += v * dt(i) } else { if (s0 >= 0 && acc >= WH.big) turns.push([s0, i, acc]); s0 = -1 }
  }
  const unrested = []
  for (let q = 1; q < turns.length; q++) {
    const a = turns[q - 1][1], b = turns[q][0]
    if (cutTicks.some(c => c > a && c <= b + 1)) continue
    let r = 0, best = 0
    for (let i = a; i < b; i++) { if (has(sp[i]) && sp[i] < WH.restSpeed) { r += dt(i); best = Math.max(best, r) } else r = 0 }
    if (best < WH.rest - 1e-6) unrested.push({ tick: b, a: turns[q - 1][2], b: turns[q][2], rest: best })
  }
  const all = sp.filter(has).sort((x, y) => x - y)
  const q = (p) => all.length ? Math.round(all[Math.min(all.length - 1, Math.floor(p * all.length))]) : null
  return { sp, whips, allowed, unrested, stats: { p50: q(0.5), p90: q(0.9), p95: q(0.95), max: all.length ? Math.round(all[all.length - 1]) : null, sped: fac.filter((f, i) => has(sp[i]) && f > 1.05).length } }
}

// ---------------------------------------------------------------- edit cuts inside one shot
// hide_seek review 2026-11-11 (r:r38374d): a speed 'cut' span removes source time but keeps the camera, so the frames
// either side are the same continuous shot. If the view is turning at either edge, the cut splices two pans into one
// snap (hide_seek 1.27 s: 180 deg/s one way -> 175 deg/s the other) that the whip check can't see (it skips the ticks
// around cut spans). The edge speed is the view's turn over the EC.win ticks next to the cut (the last ones shown
// before it, the first ones after). BLOCK when either edge turns faster than EC.cap deg/s. A cut inside one pan that
// goes on the same way with the view barely moved across it (EC.match deg: hide_seek round 5's tilt up the pillar,
// 24 deg) reads as one pan: a WARN to look at. A cut whose removed span holds a camera cut (cut / respawn / teleport /
// shot mark), that changes the camera shot or mode, or that lands EC.place+ blocks away (villager_crowd's 7.8 s and
// 20 s skips, 46 and 68 blocks down the road) is a cut to another shot: fine. Tuned on the ready Shorts, 2026-11-11:
// their still edges measure 0-25 deg/s; the kit's eased turns step 45 deg/s a tick, so a cut one tick into a turn is
// already over the cap.
const EDIT_CUT = { cap: 30, win: 2, minTicks: 4, match: 35, sameDir: 0.3, place: 16 }
// N ticks; outOf(tick) -> seconds of the Short (null outside); camAt(tick) -> {x,y,z,yaw,pitch,mode?,shot?} or null;
// cutTicks: camera cut marks (ticks); other(tick): true where the view isn't the shot's (dead, F1). Returns a row per
// edit cut, with level/msg on the ones that snap.
function editCutSnaps ({ N, sh0 = 0, sh1 = N - 1, outOf, camAt, cutTicks = [], other = () => false }, EC = EDIT_CUT) {
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  const has = (v) => v !== null && v !== undefined
  const vel = (i) => {
    const a = camAt(i), b = camAt(i + 1)
    if (!a || !b || a.mode !== b.mode || Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 4) return null
    return [wrap(b.yaw - a.yaw) * Math.cos(a.pitch) * 180 / Math.PI * 20, (b.pitch - a.pitch) * 180 / Math.PI * 20]
  }
  const edge = (from, to) => {
    const v = []
    for (let i = from; i <= to; i++) { const s = vel(i); if (s) v.push(s) }
    if (!v.length) return null
    return { speed: v.reduce((x, y) => x + Math.hypot(y[0], y[1]), 0) / v.length, dir: [v.reduce((x, y) => x + y[0], 0) / v.length, v.reduce((x, y) => x + y[1], 0) / v.length] }
  }
  const look = (c) => [-Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), -Math.cos(c.yaw) * Math.cos(c.pitch)]
  const spans = []
  for (let i = Math.max(0, sh0); i < Math.min(N - 1, sh1); i++) {
    const o = outOf(i)
    if (!has(o)) continue
    let j = i
    while (j + 1 < N && has(outOf(j + 1)) && Math.abs(outOf(j + 1) - o) < 0.004) j++
    if (j - i >= EC.minTicks) spans.push([i, j])
    i = j
  }
  const rows = []
  for (const [a, b] of spans) {
    const A = camAt(a), B = camAt(b)
    const dist = A && B ? Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z) : null
    const otherShot = cutTicks.some(c => c > a - 0.5 && c <= b + 0.5) || !A || !B || A.mode !== B.mode || (A.shot || null) !== (B.shot || null) ||
      other(a) || other(b) || (dist !== null && dist >= EC.place)
    const eo = edge(a - EC.win, a - 1), ei = edge(b, b + EC.win - 1)
    const vOut = eo ? eo.speed : 0, vIn = ei ? ei.speed : 0
    const no = eo && Math.hypot(...eo.dir), ni = ei && Math.hypot(...ei.dir)
    const cos = no && ni ? (eo.dir[0] * ei.dir[0] + eo.dir[1] * ei.dir[1]) / (no * ni) : null
    const jump = A && B ? Math.acos(Math.max(-1, Math.min(1, look(A).reduce((x, v, k) => x + v * look(B)[k], 0)))) * 180 / Math.PI : null
    const row = { tick: a, toTick: b, out: outOf(a), removed: +((b - a) / 20).toFixed(2), speedOut: Math.round(vOut), speedIn: Math.round(vIn), sameWay: cos === null ? null : +cos.toFixed(2), viewJump: jump === null ? null : Math.round(jump), moved: dist === null ? null : +dist.toFixed(1), otherShot }
    rows.push(row)
    if (otherShot || Math.max(vOut, vIn) <= EC.cap) continue
    const onePan = cos !== null && cos >= EC.sameDir && jump !== null && jump <= EC.match && (dist || 0) < 1
    const what = `edit cut inside one shot while the view turns: ${row.speedOut} deg/s out, ${row.speedIn} deg/s in (cap ${EC.cap}, over the ${EC.win} ticks either side; ${row.removed} s of source cut, the view ${row.viewJump} deg and the camera ${row.moved} blocks on)`
    if (onePan) Object.assign(row, { level: 'WARN', msg: `${what}, the same way on both sides from about the same view: reads as one pan. Look at it; still edges are safer (r:r38374d)` })
    else Object.assign(row, { level: 'BLOCK', msg: `${what}: on a phone the two pans read as one snap. Put the speed 'cut' span's edges on rests (the view still for ${EC.win}+ ticks either side), or cut to another shot. Owner: "the camera moves around so quickly ... it's a little bit confusing to try and follow" (r:r38374d)` })
  }
  return rows
}

module.exports = { run, openingVerdict, openingSubject, OPEN, whipCheck, WHIP, editCutSnaps, EDIT_CUT, frameFor, toFrame, clearingOf, subjectsOf, storyLines, showsSpec, showsChunk, shownBy, showsMissed }
