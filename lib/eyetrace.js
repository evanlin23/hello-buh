// Eye-trace across cuts (docs/cinematic.md "Invisible cuts", STANDARDS 3b.3). Owner, 2026-11-10: "the cuts don't seem
// to be correct, because i keep noticing them". A cut goes unnoticed when the thing the eye is on lands where the eye
// already is: the viewer finds it in ~600 ms instead of ~1000 ms (Valuch et al. 2017) and a third of matched cuts are
// not seen at all (Smith & Henderson 2008). Pure geometry, shared by render.js (eyeTrace: the new camera shot is
// re-aimed so its subject lands where the previous shot's subject was) and lib/hb/cuts.js (the check), so the check
// measures exactly what the renderer builds.
//
//   geom({ W, H, MW, cropX })                 the delivered frame: a W x H crop (cropX -1..1) of an MW x H render
//   project(cam, p, g) -> { x, y, depth }      a world point in the delivered frame (0..1 from the top left)
//   attention(cam, g, o) -> { x, y, label, kind, frac, score, point }   where the eye goes on this frame
//   aimOffset(cam, g, point, target) -> { dyaw, dpitch }   the turn that puts `point` on `target` (screen 0..1)
//
// Where the eye goes (attention): the most salient of the cast in the frame (faces and bodies pull the eye: size,
// then closeness to the frame's centre), the shot's own `subject` first when it names one; with no one big enough,
// the shot's aim point (what its `look` frames: the centre of a camera shot, the crosshair of a first-person view).

const SIGMA = 0.3          // centre weighting (fraction of the frame): a face at the edge counts ~ 1/3 of one in the middle
const MIN_FRAC = 0.05      // a body under 5 % of the frame height is a speck: it doesn't take the eye
const AIM_FRAC = 0.12      // the aim point competes as if it were a body 12 % of the frame high
const CENTRE = [0.5, 0.42] // the eye's resting place in the game view (the upper-middle: faces, the rule-of-thirds line)
const NOT_CAST = /^(item|experience_orb|arrow|spectral_arrow|trident|snowball|egg|ender_pearl|potion|fireball|small_fireball|wither_skull|area_effect_cloud|marker|interaction|\w+_display|lightning_bolt|falling_block|moving_block|tnt|\w*minecart|\w*boat|\w*_raft|item_frame|glow_item_frame|painting|leash_knot|firework_rocket|fishing_bobber|eye_of_ender|evoker_fangs|shulker_bullet|llama_spit|dragon_fireball|wind_charge|breeze_wind_charge|end_crystal|armor_stand)$/
// the framing box a re-aimed subject must stay in (STANDARDS 4.1 "near centre", 4.3; the caption band starts ~62 % down)
const BOX = { x0: 0.3, x1: 0.7, y0: 0.28, y1: 0.58 }
const MAX_DEG = 14         // the most a shot is re-aimed (degrees, each axis)

function geom ({ W = 1080, H = 1011, MW = W, cropX = 0 } = {}) {
  const left = (MW - W) / 2 * (1 + Math.max(-1, Math.min(1, cropX || 0)))
  return { W, H, MW, left }
}

function basis (cam) {
  const cp = Math.cos(cam.pitch)
  const f = [-Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), -Math.cos(cam.yaw) * cp]
  const r = [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)]
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
  return { f, r, u }
}

function project (cam, p, g) {
  const { f, r, u } = basis(cam)
  const d = [p.x - cam.x, p.y - cam.y, p.z - cam.z]
  const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]
  if (z <= 0.05) return null
  const tv = Math.tan((cam.fov || 70) * Math.PI / 360), th = tv * g.MW / g.H
  const nx = (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / z / th, ny = (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z / tv
  const mx = (nx + 1) / 2 * g.MW
  return { x: (mx - g.left) / g.W, y: (1 - ny) / 2, depth: z }
}

// the share of the frame height a body of height h at depth d spans
const fracOf = (cam, h, depth) => h / (2 * depth * Math.tan((cam.fov || 70) * Math.PI / 360))
const centreW = (x, y) => Math.exp(-((x - CENTRE[0]) ** 2 + (y - CENTRE[1]) ** 2) / (2 * SIGMA * SIGMA))

// o: { entities: [{ id, type, label, x, y, z, h, baby }], aim: world point | null (null: the frame's centre),
//      subject: (e) => bool | { x, y, z } | null, occluded: (cam, p) => bool, minFrac }
function attention (cam, g, o = {}) {
  const cands = []
  for (const e of o.entities || []) {
    if (NOT_CAST.test(e.type || '')) continue
    const h = (e.h || 1.8) * (e.baby ? 0.5 : 1)
    const head = { x: e.x, y: e.y + h * 0.85, z: e.z }, mid = { x: e.x, y: e.y + h * 0.5, z: e.z }
    const p = project(cam, head, g)
    if (!p || p.x < 0.02 || p.x > 0.98 || p.y < 0.02 || p.y > 0.98) continue
    const frac = fracOf(cam, h, p.depth)
    const explicit = typeof o.subject === 'function' && o.subject(e)
    if (frac < (o.minFrac ?? MIN_FRAC) && !explicit) continue
    if (o.occluded && o.occluded(cam, head) && o.occluded(cam, mid)) continue
    const score = Math.sqrt(Math.min(1, frac)) * centreW(p.x, p.y) * (explicit ? 3 : 1)
    cands.push({ x: p.x, y: p.y, kind: explicit ? 'subject' : 'cast', label: e.label || e.type, frac, score, point: head, id: e.id })
  }
  if (o.subject && typeof o.subject === 'object') {
    const p = project(cam, o.subject, g)
    if (p) cands.push({ x: p.x, y: p.y, kind: 'subject', label: 'subject', frac: null, score: 9, point: o.subject })
  }
  let ap = o.aim ? project(cam, o.aim, g) : null
  const aimPt = o.aim || null
  if (!ap) ap = project(cam, ahead(cam), g)
  if (ap) cands.push({ x: ap.x, y: ap.y, kind: 'aim', label: 'the aim', frac: AIM_FRAC, score: Math.sqrt(AIM_FRAC) * centreW(ap.x, ap.y), point: aimPt || ahead(cam) })
  cands.sort((a, b) => b.score - a.score)
  return cands.length ? { ...cands[0], cands } : null
}
// a point 8 blocks along the view (the centre of the master frame)
function ahead (cam) { const { f } = basis(cam); return { x: cam.x + f[0] * 8, y: cam.y + f[1] * 8, z: cam.z + f[2] * 8 } }

const clampBox = (t, box = BOX) => ({ x: Math.max(box.x0, Math.min(box.x1, t.x)), y: Math.max(box.y0, Math.min(box.y1, t.y)) })

// the yaw/pitch change (radians) that moves `point` to screen `target` (0..1), Newton on the projection, each axis
// clamped to maxDeg
function aimOffset (cam, g, point, target, maxDeg = MAX_DEG) {
  let dyaw = 0, dpitch = 0
  const lim = maxDeg * Math.PI / 180, e = 1e-3
  const at = (a, b) => project({ ...cam, yaw: cam.yaw + a, pitch: cam.pitch + b }, point, g)
  for (let i = 0; i < 6; i++) {
    const p = at(dyaw, dpitch)
    if (!p) break
    const ex = p.x - target.x, ey = p.y - target.y
    if (Math.abs(ex) < 1e-4 && Math.abs(ey) < 1e-4) break
    const px = at(dyaw + e, dpitch), py = at(dyaw, dpitch + e)
    if (!px || !py) break
    const jx = (px.x - p.x) / e, jy = (py.y - p.y) / e
    if (Math.abs(jx) > 1e-6) dyaw -= ex / jx
    if (Math.abs(jy) > 1e-6) dpitch -= ey / jy
    dyaw = Math.max(-lim, Math.min(lim, dyaw)); dpitch = Math.max(-lim, Math.min(lim, dpitch))
  }
  return { dyaw, dpitch }
}

// a shot's `subject` (the lint's list of TARGETs, renderer/lint.js: ['self', 'actor:Grok']; or one of them) -> what
// attention() takes: 'self' (the narrator), 'actor:NAME', 'entity:TYPE' (the cast of that type), a bare [dx, dy, dz]
// (a point from the set origin). Any cast member the list names counts as the subject; { of } targets are skipped.
function subjectOf (spec, set) {
  const s = spec && spec.subject
  if (!s) return null
  if (Array.isArray(s) && s.length === 3 && s.every(v => typeof v === 'number')) return { x: set.x + s[0], y: set.y + s[1], z: set.z + s[2] }
  const tests = [].concat(s).filter(v => typeof v === 'string').map(v => {
    if (v === 'self') return (e) => e.id === 'self'
    const m = /^(actor|entity):(.+)$/.exec(v)
    if (m && m[1] === 'actor') return (e) => e.user === m[2] || e.label === m[2]
    return (e) => e.type === (m ? m[2] : v)
  })
  return tests.length ? (e) => tests.some(f => f(e)) : null
}

module.exports = { geom, project, attention, aimOffset, clampBox, fracOf, subjectOf, BOX, MAX_DEG, NOT_CAST, MIN_FRAC }
