// Aim on the action (owner, 2026-11-11, r:rffba12: "for the torch, we need to look where we are placing/breaking, its
// fine to be fast but right now it just looks like hacking"; "the rainbow sheep we are not looking at the right sheep
// when we dye"). For every player action in a recording (a block placed, a block broken, a block used, an entity used:
// dye, shear, name tag, feed, tame...) the aim error at that tick: the angle between the crosshair's ray and the
// target (the block's cell, or the entity's bounding box), 0 when the ray goes through it. Pure geometry over a
// recording (poses, timeline, entities, blocks); the world lookups come in as functions (scripts/rec_sight.js builds
// them from the chunks, the same world the sight check uses). lib/sight.js is the ray maths.
//   actions(rec, w)   the player's actions: [{ kind, tick, ticks, target: { box, what, x, y, z, id }, source }]
//   measure(rec, a)   -> { deg (the error, the best tick of a.ticks), tick, onScreen }
//   run(rec, w)       both, with the threshold: { actions, found (over AIM_MAX_DEG or off-screen), worst, ... }
// Angles in radians inside, degrees out. mineflayer's yaw/pitch convention (lib/sight.js dirOf).
const SIGHT = require('./sight')

// over this (degrees) the action reads as off-aim (hacking). Tuned 2026-11-11 on creeper_art (owner: "tracks where
// we're placing the blocks the best": its places sit at 0, all within 2 deg) against sand_tower's torches, the
// rainbow_sheep dyes and heart_art/sword_art's places (owner: "doesn't really track"); docs/STANDARDS.md r:rffba12
const AIM_MAX_DEG = 6
// the first-person picture: 70 deg vertical FOV on render.js's 1080x1011 frame, so about 36 deg each side horizontally
const HALF_V = 35, HALF_H = 36

// entity hitboxes (vanilla EntityType sizes: width, height); babies are half
const SIZE = {
  sheep: [0.9, 1.3], cow: [0.9, 1.4], mooshroom: [0.9, 1.4], pig: [0.9, 0.9], chicken: [0.4, 0.7], wolf: [0.6, 0.85],
  cat: [0.6, 0.7], ocelot: [0.6, 0.7], fox: [0.6, 0.7], rabbit: [0.4, 0.5], goat: [0.9, 1.3], llama: [0.9, 1.87],
  trader_llama: [0.9, 1.87], horse: [1.3965, 1.6], donkey: [1.3965, 1.5], mule: [1.3965, 1.6], camel: [1.7, 2.375],
  villager: [0.6, 1.95], wandering_trader: [0.6, 1.95], iron_golem: [1.4, 2.7], snow_golem: [0.7, 1.9],
  zombie: [0.6, 1.95], husk: [0.6, 1.95], drowned: [0.6, 1.95], zombie_villager: [0.6, 1.95], skeleton: [0.6, 1.99],
  stray: [0.6, 1.99], creeper: [0.6, 1.7], spider: [1.4, 0.9], cave_spider: [0.7, 0.5], enderman: [0.6, 2.9],
  axolotl: [0.75, 0.42], turtle: [1.2, 0.4], panda: [1.3, 1.25], polar_bear: [1.4, 1.4], parrot: [0.5, 0.9],
  bee: [0.7, 0.6], frog: [0.5, 0.5], sniffer: [1.9, 1.75], armadillo: [0.7, 0.65], strider: [0.9, 1.7],
  piglin: [0.6, 1.95], hoglin: [1.3965, 1.4], allay: [0.35, 0.6], warden: [0.9, 2.9], witch: [0.6, 1.95], blaze: [0.6, 1.8], item_frame: [0.75, 0.75], armor_stand: [0.5, 1.975]
}
// the entity state a player's use changes (dye: color, shears: sheared, a name tag: name, a bone: tame/sitting/collar,
// a saddle: saddled). A change near the player on a swing is a use on that entity
const USE_KEYS = ['color', 'sheared', 'name', 'tame', 'sitting', 'collar', 'saddled', 'saddle', 'chest']
// marks a stunt writes for a use on an entity (with `id` when it knows which)
const ENTITY_MARKS = /^(dye|shear|feed|name_tag|nametag|tag|interact|use_entity|breed|tame|milk|saddle|leash)$/
const DEG = 180 / Math.PI
const AIRY = /^(air|cave_air|void_air|short_grass|tall_grass|fern|large_fern|snow|water|lava|bubble_column|dead_bush|seagrass|tall_seagrass)$/
const FLUID = /^(water|lava|bubble_column|fire|soul_fire)$/

const cellBox = (x, y, z) => [x, y, z, x + 1, y + 1, z + 1]
function entBox (row) {
  const [w0, h0] = SIZE[row[2]] || [0.6, 1.8]
  const s = row[9] && row[9].baby ? 0.5 : 1, w = w0 * s / 2, h = h0 * s
  return [row[3] - w, row[4], row[5] - w, row[3] + w, row[4] + h, row[5] + w]
}

// the eye and aim at tick k: the recorded pose, 1.62 over the feet (1.27 crouched, a 'self' mark's eye)
function eyeFn (rec) {
  const P = rec.poses
  const selfEyes = (rec.timeline || []).filter((e) => e.event === 'self' && e.eye !== undefined).map((e) => [e.t / 50, e.eye]).sort((a, b) => a[0] - b[0])
  return (k) => {
    const q = P[Math.max(0, Math.min(P.length - 1, Math.round(k)))]
    let h = 1.62
    for (const [t, e] of selfEyes) if (t <= k) h = e
    if ((q[7] || 0) & 1) h -= 0.35
    return { eye: [q[1], q[2] + h, q[3]], yaw: q[4], pitch: q[5] }
  }
}

// the angle (radians) between the ray (o, unit d) and box b: 0 when the ray enters it ahead of the eye, else the least
// angle to a point of the box (its surface, a 9x9 grid on each face: within ~1 deg at arm's length)
function angleToBox (o, d, b) {
  let t0 = -Infinity, t1 = Infinity, hit = true
  for (let k = 0; k < 3 && hit; k++) {
    if (Math.abs(d[k]) < 1e-12) { if (o[k] < b[k] || o[k] > b[k + 3]) hit = false; continue }
    let u = (b[k] - o[k]) / d[k], v = (b[k + 3] - o[k]) / d[k]
    if (u > v) [u, v] = [v, u]
    t0 = Math.max(t0, u); t1 = Math.min(t1, v)
    if (t0 > t1) hit = false
  }
  if (hit && t1 >= 0) return 0
  let best = Math.PI
  const N = 8
  for (let ax = 0; ax < 3; ax++) {
    const [a1, a2] = [0, 1, 2].filter((q) => q !== ax)
    for (const side of [0, 3]) {
      for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= N; j++) {
          const p = [0, 0, 0]
          p[ax] = b[ax + side]; p[a1] = b[a1] + (b[a1 + 3] - b[a1]) * i / N; p[a2] = b[a2] + (b[a2 + 3] - b[a2]) * j / N
          const v = [p[0] - o[0], p[1] - o[1], p[2] - o[2]], L = Math.hypot(...v) || 1e-9
          const c = (v[0] * d[0] + v[1] * d[1] + v[2] * d[2]) / L
          const ang = Math.acos(Math.max(-1, Math.min(1, c)))
          if (ang < best) best = ang
        }
      }
    }
  }
  return best
}

// is the box's centre inside the first-person picture? (projected on the camera's axes against the half-FOVs)
function onScreen (o, yaw, pitch, b) {
  const v = [(b[0] + b[3]) / 2 - o[0], (b[1] + b[4]) / 2 - o[1], (b[2] + b[5]) / 2 - o[2]]
  const f = SIGHT.dirOf(yaw, pitch), r = [-Math.cos(yaw), 0, Math.sin(yaw)]   // forward, and right (yaw 0: north, right is east)
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
  const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2]
  const z = dot(v, f)
  if (z <= 0) return false
  return Math.abs(Math.atan2(dot(v, r), z)) * DEG <= HALF_H && Math.abs(Math.atan2(dot(v, u), z)) * DEG <= HALF_V
}

// the player's actions. w (optional): { nameBefore(x, y, z, tick) -> the block's name just before that tick's change }
// for the places and block uses read from block changes; without it only the marked ones are found.
function actions (rec, w = {}) {
  const tl = [...(rec.timeline || [])].sort((a, b) => a.t - b.t)
  const out = []
  const eyeAt = eyeFn(rec)
  const near = (b, k, r = 6) => { const { eye } = eyeAt(k); const c = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2]; return Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]) <= r }
  const swings = tl.filter((e) => e.event === 'swing').map((e) => e.t / 50)
  const swingNear = (k, lo = -4, hi = 1) => { let s = null; for (const t of swings) if (t >= k + lo && t <= k + hi) s = t; return s }
  // digs: the harness's dig mark (x, y, z) to its dig_end; an instant break (no dig mark: under 50 ms) is a dig_end
  // with the block's particles that tick
  const digCells = []
  for (let i = 0; i < tl.length; i++) {
    const e = tl[i], k = e.t / 50
    if (e.event === 'dig' && Number.isFinite(e.x)) {
      const end = tl.slice(i + 1).find((x) => x.event === 'dig_end' || (x.event === 'dig' && Number.isFinite(x.x)))
      const ke = end && end.event === 'dig_end' ? end.t / 50 : null
      if (ke !== null && end.ok === false) continue   // cancelled: nothing broke
      const b = cellBox(e.x, e.y, e.z)
      if (!near(b, k, 7)) continue
      // the break is the moment that shows: the crosshair at the dig's start and at its end
      out.push({ kind: 'break', tick: ke ?? k, ticks: [[k, k + 1], ...(ke !== null ? [[ke - 1, ke]] : [])], target: { box: b, what: 'block', x: e.x, y: e.y, z: e.z }, source: 'dig' })
      digCells.push([ke ?? k, e.x, e.y, e.z])
    } else if (e.event === 'dig_end' && e.ok !== false) {
      const p = tl.find((x) => x.event === 'particles' && x.type === 'block' && Math.abs(x.t - e.t) <= 50 && Number.isFinite(x.x))
      if (!p) continue
      const [x, y, z] = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)]
      if (digCells.some((d) => Math.abs(d[0] - k) <= 2 && d[1] === x && d[2] === y && d[3] === z)) continue
      const b = cellBox(x, y, z)
      if (!near(b, k, 7)) continue
      out.push({ kind: 'break', tick: k, ticks: [[k - 1, k]], target: { box: b, what: p.block || 'block', x, y, z }, source: 'dig_end' })
      digCells.push([k, x, y, z])
    }
  }
  // places: the kit's place_on mark, a stunt's place mark, else a block from air near the player on a swing
  const marked = []
  for (const e of tl) {
    const k = e.t / 50
    if ((e.event === 'place_on' || (e.event === 'place' && !e.eye)) && Number.isFinite(e.x)) {
      const [x, y, z] = [Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)], b = cellBox(x, y, z)
      marked.push([k, x, y, z])
      if (!near(b, k, 64)) continue   // (a marked place is the player's, whatever the reach: pixel art builds from 12+ blocks)
      out.push({ kind: 'place', tick: k, ticks: [[k - 1, k + 1]], target: { box: b, what: 'block', x, y, z }, source: e.event })
    }
  }
  const B = [...(rec.blocks || [])].sort((a, b) => a[0] - b[0])
  if (w.nameBefore && w.nameOf) {
    // only real changes count (the log repeats a neighbour's unchanged state on an update: pixel art's backing wall)
    const real = B.filter((b) => w.nameBefore(b) !== w.nameOf(b[4]))
    const perTick = new Map()
    for (const b of real) perTick.set(b[0], (perTick.get(b[0]) || 0) + 1)
    for (const b of real) {
      const [k, x, y, z, s] = b, was = w.nameBefore(b), now = w.nameOf(s)
      if (perTick.get(k) > 3) continue
      // another block beside it changed the same tick: a command building a piece, not one place (a door's halves
      // and a bed's are the same block: they count once, below)
      if (real.some((q) => q[0] === k && q !== b && Math.abs(q[1] - x) + Math.abs(q[2] - y) + Math.abs(q[3] - z) === 1 && w.nameOf(q[4]) !== now)) continue
      const box = cellBox(x, y, z)
      if (!near(box, k, 16)) continue   // (pixel art places from 12+ blocks out; past 16 it's a prop, not the player's)
      if (AIRY.test(was) && !AIRY.test(now) && !FLUID.test(now)) {
        // (a sand/gravel landing is a falling block, not a place: no swing at it)
        const sw = swingNear(k)
        if (sw === null) continue
        if (marked.some((m) => Math.abs(m[0] - k) <= 6 && m[1] === x && m[2] === y && m[3] === z)) continue
        if (real.some((q) => q[0] === k && q !== b && q[1] === x && q[3] === z && q[2] === y - 1 && w.nameOf(q[4]) === now)) continue   // a door/tall plant's top half
        out.push({ kind: 'place', tick: sw, ticks: [[sw - 1, sw]], target: { box, what: now, x, y, z }, source: 'inferred' })
      } else if (!AIRY.test(was) && !AIRY.test(now) && was === now) {
        // the same block in another state on a swing: a door, a trapdoor, a lever, a button... used (one per cell a swing)
        const sw = swingNear(k, -2, 0)
        if (sw === null || out.some((a) => a.kind === 'use' && a.tick === sw)) continue
        if (real.some((q) => q[0] === k && q !== b && q[1] === x && q[3] === z && q[2] === y - 1 && w.nameOf(q[4]) === now)) continue   // a door's top half: its bottom counts
        out.push({ kind: 'use', tick: sw, ticks: [[sw - 1, sw]], target: { box, what: now, x, y, z }, source: 'state' })
      }
    }
  }
  // entities: a use's state change (USE_KEYS) on a swing within 6 blocks, and the stunt's marks that name an id
  const E = rec.entities || []
  const byId = new Map()
  for (const r of E) { if (!byId.has(r[1])) byId.set(r[1], []); byId.get(r[1]).push(r) }
  const rowAt = (id, k) => { const rs = byId.get(id); if (!rs) return null; let best = null; for (const r of rs) { if (r[0] <= k) best = r; else break } return best || rs[0] }
  const seen = new Set()
  for (const [id, rs] of byId) {
    for (let i = 1; i < rs.length; i++) {
      const a = rs[i - 1][9] || {}, b = rs[i][9] || {}
      const ch = USE_KEYS.filter((q) => JSON.stringify(a[q]) !== JSON.stringify(b[q]) && (q in b))
      if (!ch.length) continue
      const k = rs[i][0], sw = swingNear(k, -4, 0)
      if (sw === null) continue
      const box = entBox(rowAt(id, sw))
      if (!near(box, sw, 6)) continue
      seen.add(`${id},${sw}`)
      out.push({ kind: 'entity', tick: sw, ticks: [[sw - 1, sw]], target: { box, what: `${rs[i][2]} #${id} (${ch.join(', ')})`, id, entity: rs[i][2] }, source: 'state', id })
    }
  }
  for (const e of tl) {
    if (!ENTITY_MARKS.test(e.event) || e.id === undefined || !byId.has(e.id)) continue
    const k = e.t / 50
    if ([...seen].some((s) => s.startsWith(`${e.id},`) && Math.abs(Number(s.split(',')[1]) - k) <= 4)) continue
    const r = rowAt(e.id, k), box = entBox(r)
    if (!near(box, k, 6)) continue
    out.push({ kind: 'entity', tick: k, ticks: [[k - 1, k]], target: { box, what: `${r[2]} #${e.id} (${e.event})`, id: e.id, entity: r[2] }, source: e.event })
  }
  return out.sort((a, b) => a.tick - b.tick)
}

// the aim error of one action: the worst of its moments, each the best tick of its window (a tick's slack either way)
function measure (rec, a, eyeAt = eyeFn(rec)) {
  let worst = null
  for (const [k0, k1] of a.ticks) {
    let best = null
    for (let k = Math.max(0, Math.round(k0)); k <= Math.min(rec.poses.length - 1, Math.round(k1)); k++) {
      const q = eyeAt(k), d = SIGHT.dirOf(q.yaw, q.pitch)
      // an entity moves: its box at this tick
      const box = a.target.id !== undefined ? entBoxAt(rec, a.target.id, k) || a.target.box : a.target.box
      const deg = angleToBox(q.eye, d, box) * DEG
      if (!best || deg < best.deg) best = { deg, tick: k, onScreen: onScreen(q.eye, q.yaw, q.pitch, box) }
    }
    if (best && (!worst || best.deg > worst.deg)) worst = best
  }
  return worst || { deg: null, tick: a.tick, onScreen: false }
}
let _rowsCache = null
function entBoxAt (rec, id, k) {
  if (!_rowsCache || _rowsCache.rec !== rec) {
    const m = new Map()
    for (const r of rec.entities || []) m.set(`${r[1]},${r[0]}`, r)
    _rowsCache = { rec, m }
  }
  const r = _rowsCache.m.get(`${id},${Math.round(k)}`)
  return r ? entBox(r) : null
}

// 'Look at' beats (owner 2026-11-11, r:r52f94c, guess_sound_2: "when we look over at the mob, we arent looking directly
// at it"): a turn onto a mob or a thing must END with it centred, the crosshair on its body or head. A stunt marks the
// landing with ctx.mark('look_at', { id }) (an entity id; or { name } for the nearest of that kind; or { x, y, z } for
// a point); lib/guess_sound.js recordings from before the mark are read from their reveal { mob } -> react pair (the
// tilt up onto what the torch shows ends on 'react'). The error is the angle from the view's centre to the nearer of
// the target's eye point (0.85 of its height, the vanilla eye for most mobs) and its body's middle, the worst over the
// landing tick and the LOOK_HOLD ticks after (the view has to stay on it, not drift off).
const LOOK_MAX_DEG = 6
const LOOK_HOLD = 4
function rowsById (rec) {
  const m = new Map()
  for (const r of rec.entities || []) { if (!m.has(r[1])) m.set(r[1], []); m.get(r[1]).push(r) }
  for (const rs of m.values()) rs.sort((a, b) => a[0] - b[0])
  return m
}
function rowNear (rs, k) { let best = null; for (const r of rs || []) { if (r[0] <= k) best = r; else break } return best || (rs && rs[0]) || null }
function lookAts (rec) {
  const tl = [...(rec.timeline || [])].sort((a, b) => a.t - b.t)
  const byId = rowsById(rec), eyeAt = eyeFn(rec), out = []
  const nearestNamed = (name, k) => {
    const { eye } = eyeAt(k); let best = null
    for (const [id, rs] of byId) {
      const r = rowNear(rs, k); if (!r || r[2] !== name) continue
      const d = Math.hypot(r[3] - eye[0], r[4] - eye[1], r[5] - eye[2])
      if (d <= 24 && (!best || d < best.d)) best = { id, d }
    }
    return best && best.id
  }
  const marked = tl.filter((e) => e.event === 'look_at')
  for (const e of marked) {
    const k = e.t / 50
    if (Number.isFinite(e.x) && e.id === undefined && !e.name) { out.push({ tick: k, point: [e.x, e.y, e.z], what: `the point ${e.x} ${e.y} ${e.z}`, source: 'look_at' }); continue }
    const id = e.id !== undefined && byId.has(e.id) ? e.id : (e.name ? nearestNamed(e.name, k) : null)
    if (id === null || id === undefined) continue
    out.push({ tick: k, id, what: `${rowNear(byId.get(id), k)[2]} #${id}`, source: 'look_at' })
  }
  for (let i = 0; i < tl.length; i++) {
    const e = tl[i]
    if (e.event !== 'reveal' || !e.mob) continue
    const react = tl.slice(i + 1).find((x) => x.event === 'react' || x.event === 'reveal')
    if (!react || react.event !== 'react' || react.t - e.t > 3000) continue
    const k = react.t / 50
    if (marked.some((m) => Math.abs(m.t / 50 - k) <= 20)) continue
    const id = nearestNamed(e.mob, k)
    if (id === null || id === undefined) continue
    out.push({ tick: k, id, what: `${e.mob} #${id}`, source: 'reveal' })
  }
  return out.sort((a, b) => a.tick - b.tick)
}
function measureLook (rec, L, eyeAt = eyeFn(rec), byId = rowsById(rec), hold = LOOK_HOLD) {
  let worst = null
  for (let k = Math.round(L.tick); k <= Math.min(rec.poses.length - 1, Math.round(L.tick) + hold); k++) {
    const q = eyeAt(k), d = SIGHT.dirOf(q.yaw, q.pitch)
    let pts
    if (L.point) pts = [L.point]
    else {
      const r = rowNear(byId.get(L.id), k); if (!r) continue
      const b = entBox(r), h = b[4] - b[1], cx = (b[0] + b[3]) / 2, cz = (b[2] + b[5]) / 2
      pts = [[cx, b[1] + 0.85 * h, cz], [cx, b[1] + 0.5 * h, cz]]
    }
    let deg = 180
    for (const p of pts) {
      const v = [p[0] - q.eye[0], p[1] - q.eye[1], p[2] - q.eye[2]], n = Math.hypot(...v) || 1e-9
      deg = Math.min(deg, Math.acos(Math.max(-1, Math.min(1, (v[0] * d[0] + v[1] * d[1] + v[2] * d[2]) / n))) * DEG)
    }
    if (!worst || deg > worst.deg) worst = { deg, at: k }
  }
  return worst
}

function run (rec, w = {}, o = {}) {
  const max = o.max ?? AIM_MAX_DEG
  const eyeAt = eyeFn(rec)
  const acts = actions(rec, w).map((a) => ({ ...a, ...measure(rec, a, eyeAt) })).filter((a) => a.deg !== null)
  const found = acts.filter((a) => a.deg > max || !a.onScreen)
  const degs = acts.map((a) => a.deg).sort((x, y) => x - y)
  const pct = (p) => degs.length ? degs[Math.min(degs.length - 1, Math.floor(p * degs.length))] : null
  return {
    max, n: acts.length, over: found.length, worst: degs.length ? degs[degs.length - 1] : null, median: pct(0.5), p90: pct(0.9),
    onAim: acts.filter((a) => a.deg === 0).length,
    lookMax: LOOK_MAX_DEG,
    looks: (() => { const e = eyeFn(rec), b = rowsById(rec); return lookAts(rec).map((L) => ({ L, m: measureLook(rec, L, e, b) })).filter((x) => x.m).map(({ L, m }) => ({ tick: L.tick, deg: +m.deg.toFixed(1), at: m.at, what: L.what, source: L.source })) })(),
    actions: acts.map((a) => ({ kind: a.kind, tick: a.tick, deg: +a.deg.toFixed(1), onScreen: a.onScreen, what: a.target.what, x: a.target.x, y: a.target.y, z: a.target.z, source: a.source }))
  }
}

module.exports = { LOOK_MAX_DEG, LOOK_HOLD, lookAts, measureLook, AIM_MAX_DEG, HALF_H, HALF_V, SIZE, actions, measure, run, angleToBox, onScreen, entBox, eyeFn }
