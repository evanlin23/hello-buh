// A recording, read without rendering: the world (chunks + block changes), the camera, the entities, time of
// day, weather, HUD and marks at any tick. hb describe / continuity / framing are built on it, so an agent can
// reason about a shot in a second instead of a still render (~30 s) or a preview (~10+ min).
//
// The camera is the first-person camera render.js draws (poses, sneak eye height, fovZoom) and, for movie-engine
// `shot` marks (docs/movie_engine.md), the fixed `at` cameras; other camera shots (auto-framed, paths, follow) are
// only computed by render.js itself: `cameraAt` returns { known: false } for those and the tools say so.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { Vec3 } = require('vec3')

const ROOT = path.join(__dirname, '..', '..')
const EYE = 1.62, SNEAK_EYE = 1.27
const VIEW_ASPECT = 1080 / 1011   // the Shorts game view (render.js default size)

function loadRec (p) {
  const buf = fs.readFileSync(p)
  return JSON.parse((p.endsWith('.gz') ? zlib.gunzipSync(buf) : buf).toString())
}

// The stunt module, loudly: a stunt that doesn't load is an error, never an empty {} (render.js used to drop
// hideHand, brightness, fovZoom... silently when the require threw).
function loadStunt (name) {
  const f = path.join(ROOT, 'stunts', `${name}.js`)
  if (!fs.existsSync(f)) return { mod: null, error: `no stunts/${name}.js in this checkout (made on another branch? git log --all --oneline -- stunts/${name}.js; --stunt NAME reads it with another module)` }
  try { return { mod: require(f), error: null } } catch (e) { return { mod: null, error: `stunts/${name}.js failed to load: ${e.stack.split('\n').slice(0, 3).join(' | ')}` } }
}

const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
const lerpAngle = (a, b, f) => a + wrap(b - a) * f

function dayLabel (t) {
  const d = ((t % 24000) + 24000) % 24000
  if (d < 1000) return 'sunrise'
  if (d < 11500) return d < 5000 ? 'morning' : d < 7000 ? 'noon' : 'afternoon'
  if (d < 13000) return 'sunset'
  if (d < 23000) return d > 17000 && d < 19000 ? 'midnight' : 'night'
  return 'dawn'
}

class Scene {
  constructor (rec, opts = {}) {
    this.rec = rec
    this.stunt = opts.stunt || {}
    this.md = require('minecraft-data')(rec.version)
    const Chunk = require('prismarine-chunk')(rec.version)
    this.cols = new Map()
    for (const c of rec.columns || []) this.cols.set(`${c.x},${c.z}`, Chunk.fromJson(c.chunk))
    const f = this.cols.values().next().value
    this.minY = f && typeof f.minY === 'number' ? f.minY : -64
    this.maxY = f ? this.minY + f.worldHeight : 320
    this.blocks = (rec.blocks || []).slice().sort((a, b) => a[0] - b[0])
    this.bi = 0; this.worldTick = -1
    this.P = rec.poses
    this.tl = rec.timeline || []
    // entities: tick -> Map(id -> row)
    this.ENT = new Map()
    for (const r of rec.entities || []) { if (!this.ENT.has(r[0])) this.ENT.set(r[0], new Map()); this.ENT.get(r[0]).set(r[1], r) }
    const B = this.md.blocksArray
    const n = B.reduce((m, b) => Math.max(m, b.maxStateId + 1), 0)
    this.OPAQUE = new Uint8Array(n); this.NAME = new Array(n)
    for (const b of B) for (let s = b.minStateId; s <= b.maxStateId; s++) { this.NAME[s] = b.name; if (b.boundingBox === 'block' && !b.transparent) this.OPAQUE[s] = 1 }
    // registries (villager professions/types) from the renderer's assets, if built
    this.regs = {}
    try { this.regs = JSON.parse(fs.readFileSync(path.join(ROOT, 'work', 'assets', rec.version, 'registries.json'))) } catch (e) {}
    this.TIMES = [[0, rec.time ?? 6000], ...this.tl.filter(e => e.event === 'time').map(e => [e.t / 50, e.time])]
    this.WEATHER = [[0, rec.weather || this.stunt.weather || 'clear'], ...this.tl.filter(e => e.event === 'weather').map(e => [e.t / 50, e.weather])]
    this.shots = this.stunt.shots || null
    this.shotMarks = this.tl.filter(e => e.event === 'shot').map(e => ({ t: e.t / 50, name: e.name }))
    this.fovZoom = []
    for (const [sa, sb, sc] of this.stunt.fovZoom || []) {
      const at = (spec) => { const [ev, off] = String(spec).split(':'); const e = this.tl.find(m => m.event === ev); return e ? e.t / 50 + Number(off || 0) * 20 : null }
      const a = at(sa), b = at(sb)
      if (a !== null && b !== null && b > a) this.fovZoom.push([a, b, Number(sc)])
    }
    this.F1 = []
    { let on = null; for (const e of this.tl) { if (e.event === 'f1_on' && on === null) on = e.t / 50; if (e.event === 'f1_off' && on !== null) { this.F1.push([on, e.t / 50]); on = null } } if (on !== null) this.F1.push([on, Infinity]) }
  }

  get lastTick () { return this.P.length - 1 }

  // --- the world
  colOf (x, z) { return this.cols.get(`${Math.floor(x / 16) * 16},${Math.floor(z / 16) * 16}`) }
  state (x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z)
    if (y < this.minY || y >= this.maxY) return 0
    const c = this.colOf(x, z)
    return c ? c.getBlockStateId(new Vec3(x & 15, y, z & 15)) : -1
  }
  blockName (x, y, z) { const s = this.state(x, y, z); return s < 0 ? null : this.NAME[s] || String(s) }
  // block changes are applied forward; going back in time reloads the chunks
  worldAt (tick) {
    if (tick < this.worldTick) {
      const Chunk = require('prismarine-chunk')(this.rec.version)
      for (const c of this.rec.columns || []) this.cols.set(`${c.x},${c.z}`, Chunk.fromJson(c.chunk))
      this.bi = 0
    }
    while (this.bi < this.blocks.length && this.blocks[this.bi][0] <= tick) {
      const [, x, y, z, s] = this.blocks[this.bi++]
      const c = this.colOf(x, z)
      if (c && y >= this.minY && y < this.maxY) c.setBlockStateId(new Vec3(x & 15, y, z & 15), s)
    }
    this.worldTick = tick
  }
  blockChanges (t0, t1) { return this.blocks.filter(b => b[0] > t0 && b[0] <= t1) }

  // --- time, weather, HUD
  dayTime (tick) { let v = this.TIMES[0][1]; for (const [a, d] of this.TIMES) if (tick >= a) v = d; return v }
  weather (tick) { let v = this.WEATHER[0][1]; for (const [a, w] of this.WEATHER) if (tick >= a) v = w; return v }
  hud (tick) {
    let hb = null, slot = 0, health = 20
    for (const e of this.tl) {
      if (e.t / 50 > tick) break
      if (e.event === 'hotbar' && e.items) hb = e.items
      if (typeof e.slot === 'number') slot = e.slot
      if (typeof e.health === 'number') health = e.health
    }
    const i = Math.min(this.P.length - 1, Math.max(0, Math.round(tick)))
    if (this.P[i] && typeof this.P[i][6] === 'number') slot = this.P[i][6]
    const it = hb && hb[slot]
    return { health, slot, held: it ? (Array.isArray(it) ? it[0] : it) : null, hotbar: hb ? hb.map(x => x ? (Array.isArray(x) ? x[0] : x) : null) : null, f1: this.F1.some(([a, b]) => tick >= a && tick < b) || this.stunt.hud === false || !!((this.shotAt(tick) || {}).spec && !this.shotAt(tick).spec.pov), hideHand: !!this.stunt.hideHand }
  }

  // --- the camera
  pose (tick) {
    const P = this.P, i = Math.min(P.length - 2, Math.max(0, Math.floor(tick))), f = Math.min(1, Math.max(0, tick - i))
    let a = P[i], b = P[i + 1] || a
    if (Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) > 0.8) b = a   // a cut: no glide
    const sneak = (a[7] || 0) & 1
    return { x: a[1] + (b[1] - a[1]) * f, feetY: a[2] + (b[2] - a[2]) * f, z: a[3] + (b[3] - a[3]) * f, yaw: lerpAngle(a[4], b[4], f), pitch: a[5] + (b[5] - a[5]) * f, sneak: !!sneak, sprint: !!((a[7] || 0) & 2) }
  }
  shotAt (tick) {
    if (!this.shots || !this.shotMarks.length) return null
    let s = null
    for (const m of this.shotMarks) if (m.t <= tick) s = m
    return s ? { name: s.name, since: s.t, spec: this.shots[s.name] || { pov: true } } : null
  }
  target (spec, tick) {   // a movie-engine TARGET: [dx, dy, dz] from the set, 'self', 'actor:NAME', { of, offset }
    const S = this.rec.set || { x: 0, y: 0, z: 0 }
    if (Array.isArray(spec)) return { x: S.x + spec[0], y: S.y + spec[1], z: S.z + spec[2] }
    if (spec === 'self') { const p = this.pose(tick); return { x: p.x, y: p.feetY + EYE, z: p.z } }
    if (typeof spec === 'string' && spec.startsWith('actor:')) {
      const e = this.entities(tick).find(e => e.user === spec.slice(6) || e.label === spec.slice(6))
      return e ? { x: e.x, y: e.y + 1.62, z: e.z } : null
    }
    if (spec && spec.of) { const b = this.target(spec.of, tick); const o = spec.offset || [0, 0, 0]; return b && { x: b.x + o[0], y: b.y + o[1], z: b.z + o[2] } }
    return null
  }
  // cameras from render.js itself (CAM_PROBE=all: one per tick), for movie-engine shots and stunt.self
  setProbe (rows) { this.probe = new Map(rows.map(r => [r.t, r])) }
  probeAt (tick) {
    const a = this.probe.get(Math.floor(tick)), b = this.probe.get(Math.floor(tick) + 1)
    if (!a) return null
    const f = tick - Math.floor(tick)
    const same = b && b.mode === a.mode && Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) < 0.8
    const L = (k) => same ? a[k] + (b[k] - a[k]) * f : a[k]
    return { known: true, mode: a.mode, shot: /^shot (\S+)/.exec(a.mode)?.[1] || null, x: L('x'), y: L('y'), z: L('z'), yaw: same ? lerpAngle(a.yaw, b.yaw, f) : a.yaw, pitch: L('pitch'), fov: a.fov, probed: true }
  }
  cameraAt (tick, opts = {}) {
    if (this.probe && !opts.cam) { const c = this.probeAt(tick); if (c) return c }
    let fov = 70, mode = 'pov', shot = null
    const sh = this.shotAt(tick)
    if (opts.cam) {
      const m = /^(back|front)(?::([\d.]+))?$/.exec(opts.cam)
      const p = this.pose(tick)
      if (m) {
        const d = Number(m[2] || 4), s = m[1] === 'back' ? 1 : -1
        const fx = -Math.sin(p.yaw) * Math.cos(p.pitch), fy = Math.sin(p.pitch), fz = -Math.cos(p.yaw) * Math.cos(p.pitch)
        const yaw = m[1] === 'back' ? p.yaw : p.yaw + Math.PI, pitch = m[1] === 'back' ? p.pitch : -p.pitch
        return { known: true, mode: `cam ${opts.cam}`, x: p.x - fx * d * s, y: p.feetY + EYE - fy * d * s, z: p.z - fz * d * s, yaw, pitch, fov }
      }
      const [dx, dy, dz, yw, pt] = opts.cam.split(',').map(Number)
      const S = this.rec.set
      return { known: true, mode: `cam ${opts.cam}`, x: S.x + dx, y: S.y + dy, z: S.z + dz, yaw: yw * Math.PI / 180, pitch: pt * Math.PI / 180, fov }
    }
    if (sh && !sh.spec.pov) {
      const sp = sh.spec
      shot = sh.name
      if (Array.isArray(sp.at) && !sp.path && !sp.follow && !sp.orbit) {
        const c = this.target(sp.at, tick)
        let yaw = (sp.yaw || 0) * Math.PI / 180, pitch = (sp.pitch || 0) * Math.PI / 180
        const lk = sp.look !== undefined ? this.target(sp.look, tick) : null
        if (lk) { const dx = lk.x - c.x, dy = lk.y - c.y, dz = lk.z - c.z; yaw = Math.atan2(-dx, -dz); pitch = Math.atan2(dy, Math.hypot(dx, dz)) }
        return { known: true, mode: `shot ${sh.name} (at)`, shot, x: c.x, y: c.y, z: c.z, yaw, pitch, fov: sp.fov || fov, approx: !!sp.drift || sp.drift === undefined }
      }
      return { known: false, mode: `shot ${sh.name}`, shot, spec: sp }
    }
    if (sh) { shot = sh.name; mode = `shot ${sh.name} (pov)` }
    const p = this.pose(tick)
    let z = 1
    for (const [a0, b0, sc] of this.fovZoom) {
      const u = tick < a0 ? 0 : tick < a0 + 8 ? (tick - a0) / 8 : tick <= b0 ? 1 : tick < b0 + 5 ? 1 - (tick - b0) / 5 : 0
      z = Math.max(z, 1 + (sc - 1) * u * u * (3 - 2 * u))
    }
    if (p.sprint) fov *= 1.15
    if (z > 1) fov = 2 * Math.atan(Math.tan(fov * Math.PI / 360) / z) * 180 / Math.PI
    return { known: true, mode, shot, x: p.x, y: p.feetY + (p.sneak ? SNEAK_EYE : EYE), z: p.z, yaw: p.yaw, pitch: p.pitch, fov, zoom: z > 1 ? +z.toFixed(2) : undefined, sneak: p.sneak }
  }
  basis (cam) {
    const cp = Math.cos(cam.pitch)
    const f = [-Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), -Math.cos(cam.yaw) * cp]
    const r = [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)]
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
    return { f, r, u }
  }
  // a point on screen: sx, sy in 0..1 from the top left (inside the frame when both are in 0..1), depth in blocks
  project (cam, p, aspect = VIEW_ASPECT) {
    const { f, r, u } = cam._b || (cam._b = this.basis(cam))
    const d = [p.x - cam.x, p.y - cam.y, p.z - cam.z]
    const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]
    if (z <= 0.05) return null
    const tv = Math.tan(cam.fov * Math.PI / 360), th = tv * aspect
    const x = (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / z / th, y = (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z / tv
    return { sx: (x + 1) / 2, sy: (1 - y) / 2, depth: z }
  }
  // first opaque block on the segment a -> b (DDA), or null if clear
  occluder (a, b, skipNear = 0) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz)
    if (L < 1e-6) return null
    const steps = Math.ceil(L * 4)
    let last = ''
    for (let i = 1; i < steps; i++) {
      const s = i / steps
      if (s * L < skipNear || L - s * L < 0.4) continue
      const x = Math.floor(a.x + dx * s), y = Math.floor(a.y + dy * s), z = Math.floor(a.z + dz * s), k = `${x},${y},${z}`
      if (k === last) continue
      last = k
      if (x === Math.floor(b.x) && y === Math.floor(b.y) && z === Math.floor(b.z)) continue   // the target's own block doesn't hide it
      const st = this.state(x, y, z)
      if (st > 0 && this.OPAQUE[st]) return { block: this.NAME[st], x, y, z, dist: +(s * L).toFixed(1) }
    }
    return null
  }
  ray (cam, sx, sy, maxD = 96, aspect = VIEW_ASPECT) {
    const { f, r, u } = cam._b || (cam._b = this.basis(cam))
    const tv = Math.tan(cam.fov * Math.PI / 360), th = tv * aspect
    const x = (sx * 2 - 1) * th, y = (1 - sy * 2) * tv
    let d = [f[0] + r[0] * x + u[0] * y, f[1] + r[1] * x + u[1] * y, f[2] + r[2] * x + u[2] * y]
    const n = Math.hypot(...d); d = d.map(v => v / n)
    for (let s = 0.2; s < maxD; s += 0.25) {
      const px = cam.x + d[0] * s, py = cam.y + d[1] * s, pz = cam.z + d[2] * s
      const st = this.state(px, py, pz)
      if (st < 0) return { block: null, dist: s, unloaded: true }
      const name = st ? this.NAME[st] : 'air'
      if (st && name !== 'air' && name !== 'cave_air' && name !== 'light' && name !== 'barrier' && (this.OPAQUE[st] || /water|lava|leaves|glass|fence|wall|door|slab|stairs|path|farmland|wheat|grass|flower|torch|lantern|campfire|fire|carpet|sign|bed|chest|bell|pane|bars|log|crop|carrots|potatoes|beetroots|sugar_cane|fern|bush|vine|snow/.test(name))) return { block: name, dist: +s.toFixed(1), x: Math.floor(px), y: Math.floor(py), z: Math.floor(pz) }
    }
    return { block: null, dist: maxD, sky: true }
  }

  // --- entities
  entities (tick) {
    const i = Math.floor(tick), f = tick - i
    const a = this.ENT.get(i) || new Map(), b = this.ENT.get(i + 1) || a
    const out = []
    const regs = this.regs, md = this.md
    for (const [id, ra] of a) {
      let rb = b.get(id) || ra
      if (Math.hypot(rb[3] - ra[3], rb[4] - ra[4], rb[5] - ra[5]) > 4) rb = ra
      const L = (k) => ra[k] + (rb[k] - ra[k]) * f
      const ex = ra[9] || {}
      const def = md.entitiesByName[ra[2]] || {}
      let label = ra[2]
      if (ra[2] === 'villager' || ra[2] === 'zombie_villager') {
        const prof = regs['minecraft:villager_profession']?.[String(ex.profession)]
        if (prof && prof !== 'none') label = `${ra[2]} (${prof})`
      }
      if (ex.user) label = `player ${ex.user}`
      if (ex.name) label += ` "${ex.name}"`
      if (ra[2] === 'item' && ex.item) label = `item ${ex.item}`
      if (ra[2] === 'falling_block' || ra[2] === 'moving_block') label = `${ra[2]} ${this.NAME[ex.state] || ''}`.trim()
      out.push({ id, type: ra[2], label, x: L(3), y: L(4), z: L(5), yaw: lerpAngle(ra[6], rb[6], f), h: def.height || 1, w: def.width || 0.6, extra: ex, user: ex.user, held: ex.held, sneak: ex.sneak, fire: !!ex.fire, baby: !!ex.baby })
    }
    return out
  }
  // what the camera sees of each entity: screen position, size, visibility
  view (cam, tick, opts = {}) {
    const maxD = opts.maxD || 96, aspect = opts.aspect || VIEW_ASPECT
    const out = []
    const list = this.entities(tick)
    // a camera shot draws the narrator from outside (the player, or stunt.self.model)
    if (cam.mode && /^shot /.test(cam.mode) && !/\(pov\)/.test(cam.mode)) {
      const p = this.pose(tick), m = (this.stunt.self && this.stunt.self.model) || 'player'
      const def = this.md.entitiesByName[m] || {}
      list.push({ id: 'self', type: m, label: `the narrator (${m})`, x: p.x, y: p.feetY, z: p.z, yaw: p.yaw, h: def.height || 1.8, w: def.width || 0.6, extra: {} })
    }
    for (const e of list) {
      if (e.type === 'item' && !opts.items) continue
      const h = e.h * (e.baby ? 0.5 : 1)
      const mid = { x: e.x, y: e.y + h * 0.5, z: e.z }, head = { x: e.x, y: e.y + h * 0.9, z: e.z }
      const d = Math.hypot(mid.x - cam.x, mid.y - cam.y, mid.z - cam.z)
      if (d > maxD) continue
      const pm = this.project(cam, mid, aspect), pt = this.project(cam, { x: e.x, y: e.y + h, z: e.z }, aspect), pb = this.project(cam, { x: e.x, y: e.y, z: e.z }, aspect)
      const tv = Math.tan(cam.fov * Math.PI / 360)
      const frac = pm ? h / (2 * pm.depth * tv) : 0   // share of the frame height the entity spans
      const inFrame = !!(pm && pm.sx > -0.05 && pm.sx < 1.05 && ((pt && pt.sy < 1) || false) && ((pb && pb.sy > 0) || false))
      let hidden = null
      if (inFrame) {
        const o1 = this.occluder(cam, head, 0.3), o2 = this.occluder(cam, mid, 0.3)
        if (o1 && o2) hidden = o1
      }
      out.push({ ...e, dist: +d.toFixed(1), screen: pm ? { x: +pm.sx.toFixed(2), y: +pm.sy.toFixed(2) } : null, frac: +frac.toFixed(2), inFrame, hidden, visible: inFrame && !hidden })
    }
    return out.sort((a, b) => a.dist - b.dist)
  }
  // a grid of view rays: which blocks fill the frame, how much is sky, how far the view reaches
  survey (cam, n = 13, aspect = VIEW_ASPECT) {
    const hist = new Map(), dists = []
    let sky = 0, total = 0
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const r = this.ray(cam, (i + 0.5) / n, (j + 0.5) / n, 96, aspect)
      total++
      if (r.sky) { sky++; continue }
      if (r.block) { hist.set(r.block, (hist.get(r.block) || 0) + 1); dists.push(r.dist) }
    }
    dists.sort((a, b) => a - b)
    const center = this.ray(cam, 0.5, 0.5, 96, aspect)
    return {
      sky: +(sky / total).toFixed(2),
      medianDist: dists.length ? dists[Math.floor(dists.length / 2)] : null,
      nearShare: +(dists.filter(d => d < 3).length / total).toFixed(2),   // share of the frame closer than 3 blocks
      blocks: [...hist.entries()].sort((a, b) => b[1] - a[1]).map(([b, c]) => ({ block: b, share: +(c / total).toFixed(2) })),
      center
    }
  }
  // light sources and props near the camera that are in the frame and not hidden
  props (cam, radius = 24, aspect = VIEW_ASPECT) {
    const RE = /^(lava|fire|soul_fire|campfire|soul_campfire|torch|wall_torch|soul_torch|lantern|soul_lantern|glowstone|sea_lantern|jack_o_lantern|redstone_lamp|shroomlight|bell|chest|barrel|crafting_table|furnace|anvil|tnt|\w+_bed|\w+_door|composter|cauldron|water_cauldron|lectern|end_portal_frame|nether_portal|spawner|enchanting_table|beacon|\w+_sign|\w+_wall_sign|\w+_banner|\w+_wall_banner|player_head|\w+_skull|\w+_head|flower_pot|potted_\w+|hay_block|bookshelf|brewing_stand|grindstone|smithing_table|loom|stonecutter|cartography_table|fletching_table|blast_furnace|smoker)$/
    const out = new Map()
    const R = radius, cx = Math.floor(cam.x), cy = Math.floor(cam.y), cz = Math.floor(cam.z)
    for (let x = cx - R; x <= cx + R; x++) for (let z = cz - R; z <= cz + R; z++) for (let y = cy - 12; y <= cy + 12; y++) {
      const st = this.state(x, y, z)
      if (st <= 0) continue
      const name = this.NAME[st]
      if (!RE.test(name)) continue
      const p = { x: x + 0.5, y: y + 0.5, z: z + 0.5 }
      const pr = this.project(cam, p, aspect)
      if (!pr || pr.sx < 0 || pr.sx > 1 || pr.sy < 0 || pr.sy > 1) continue
      if (this.occluder(cam, p, 0.3)) continue
      const kind = name.replace(/^(\w+)_(bed|door|sign|wall_sign|banner|wall_banner)$/, '$2').replace('wall_torch', 'torch')
      const d = Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z)
      const o = out.get(kind) || { block: kind, count: 0, nearest: Infinity }
      o.count++
      if (d < o.nearest) { o.nearest = +d.toFixed(1); o.at = [x, y, z]; o.screen = { x: +pr.sx.toFixed(2), y: +pr.sy.toFixed(2) } }
      out.set(kind, o)
    }
    return [...out.values()].sort((a, b) => a.nearest - b.nearest)
  }
}

module.exports = { Scene, loadRec, loadStunt, dayLabel, ROOT, VIEW_ASPECT, EYE }
