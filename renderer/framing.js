// Auto-framed shots (docs/movie_engine.md, "Shots an agent can trust"): the camera is placed from where the actors
// actually stand, so a scene can be written without hand-tuned coordinates. Every hand-placed camera in reels 1-2
// needed a re-take (inside a roof, behind a lantern post, a head hiding the other actor, the 180-degree line crossed);
// these can't do any of that.
//
//   { two: ['self', 'actor:Highkeeper'], size: 'medium' }     both in frame, side-on to the line between them
//   { ots: 'actor:Highkeeper', over: 'self' }                  over `over`'s shoulder onto the subject
//   { single: 'self', toward: 'actor:Highkeeper', size: 'close' }   a clean single, from near the other one's eyeline
//
// Shared keys: side - which side of the line the camera keeps, a compass word ('south', 'north', 'east', 'west';
// default stunt.coverage.side, else 'south'): every shot of a conversation on one side = the 180-degree rule, for
// free. size: 'close' | 'medium' (default) | 'wide'. height: blocks above eye level (default 0.15). fov (default 50).
// anchor: 'start' (default: placed from where they stand as the shot starts, then held, with the usual push-in) or
// 'live' (re-placed every frame: for walking). The camera swings around the subject (on its own side) or rises until
// nothing solid is between it and every subject's eyes; another actor in the way of a `two` or `single` counts too.
//
// frame(sh, t, h) -> { pos, look, focus, subjects } | null, where h = { targetAt, solidAt, actors(t) -> [{ name, eye }],
// side } (render.js and renderer/lint.js pass the same helpers, so the lint checks exactly what renders).

const SIZES = {
  two: { close: 1.15, medium: 1.5, wide: 2.4 },
  ots: { close: 1.25, medium: 1.7, wide: 2.6 },
  single: { close: 2.0, medium: 3.0, wide: 5.5 }
}
const LOOK_DROP = { close: 0.05, medium: 0.3, wide: 0.6 }   // where the camera aims below the eyes (eyes on the upper third)
const COMPASS = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] }

const cache = new Map()

function sideVec (side) {
  if (Array.isArray(side)) return side
  return COMPASS[String(side || 'south').toLowerCase()] || COMPASS.south
}

// the perpendicular to a->b (horizontal) pointing to `side`
function perpTo (a, b, side) {
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1
  const u = [dx / L, dz / L], p = [-u[1], u[0]], s = sideVec(side)
  const dot = p[0] * s[0] + p[1] * s[1]
  return { u, p: Math.abs(dot) < 1e-3 ? p : dot > 0 ? p : [-p[0], -p[1]] }
}

// is the straight line from c to e clear of solid blocks (the last 0.4 blocks, the subject's own head, excluded)?
function clear (c, e, solidAt) {
  const dx = e.x - c.x, dy = e.y - c.y, dz = e.z - c.z, L = Math.hypot(dx, dy, dz)
  for (let s = 0.2; s < L - 0.4; s += 0.2) {
    const k = s / L
    if (solidAt(c.x + dx * k, c.y + dy * k, c.z + dz * k)) return false
  }
  return true
}

// distance from point q to the segment c->e
function segDist (c, e, q) {
  const vx = e.x - c.x, vy = e.y - c.y, vz = e.z - c.z, L2 = vx * vx + vy * vy + vz * vz || 1
  const k = Math.max(0, Math.min(1, ((q.x - c.x) * vx + (q.y - c.y) * vy + (q.z - c.z) * vz) / L2))
  return Math.hypot(c.x + vx * k - q.x, c.y + vy * k - q.y, c.z + vz * k - q.z)
}

// an actor (not one of the subjects) standing in the way of the line c->e: their head or chest within 0.4
function blockedBy (c, e, others) {
  for (const o of others) {
    if (segDist(c, e, o.eye) < 0.4 || segDist(c, e, { x: o.eye.x, y: o.eye.y - 0.7, z: o.eye.z }) < 0.35) return o.name
  }
  return null
}

function place (sh, t, h) {
  const size = sh.size || 'medium', side = sh.side || h.side || 'south', lift = sh.height ?? 0.15
  const vf = (sh.fov || 50) * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * 16 / 9)
  let subjects, pivot, pos, look, focus, others = [], excl = []
  if (sh.two) {
    const [A, B] = sh.two.map(n => h.targetAt(n, t))
    if (!A || !B) return null
    subjects = [A, B]; excl = sh.two
    const { p } = perpTo(A, B, side)
    const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 }
    const sep = Math.hypot(B.x - A.x, B.z - A.z)
    const k = SIZES.two[size] || SIZES.two.medium
    // both fit across (with margins), and a wide shows them head to foot
    let d = Math.max((sep / 2 + 0.6) * k / Math.tan(hf / 2), size === 'wide' ? 2.2 / Math.tan(vf / 2 * 0.75) : 0, 2.2)
    pos = { x: mid.x + p[0] * d, y: mid.y + lift, z: mid.z + p[1] * d }
    look = { x: mid.x, y: mid.y - (LOOK_DROP[size] ?? 0.3), z: mid.z }
    pivot = mid; focus = mid
  } else if (sh.ots) {
    const S = h.targetAt(sh.ots, t), O = h.targetAt(sh.over, t)
    if (!S || !O) return null
    subjects = [S]; excl = [sh.ots, sh.over]
    const { u, p } = perpTo(O, S, side)
    const back = SIZES.ots[size] || SIZES.ots.medium
    look = { x: S.x, y: S.y - (LOOK_DROP[size] ?? 0.3) * 0.5, z: S.z }
    // behind the near one's shoulder, far enough to the side that his head stays at the frame's edge, not over the face
    for (let off = 0.7; off <= 1.8; off += 0.1) {
      pos = { x: O.x - u[0] * back + p[0] * off, y: O.y + lift, z: O.z - u[1] * back + p[1] * off }
      if (segDist(pos, S, O) >= 0.5) break
    }
    pivot = S; focus = S
  } else if (sh.single) {
    const S = h.targetAt(sh.single, t), T = sh.toward ? h.targetAt(sh.toward, t) : null
    if (!S) return null
    subjects = [S]; excl = [sh.single, sh.toward].filter(Boolean)
    const ref = T || { x: S.x, y: S.y, z: S.z + 1 }
    const { u, p } = perpTo(S, ref, side)
    const d = SIZES.single[size] || SIZES.single.medium
    pos = { x: S.x + (u[0] * 0.94 + p[0] * 0.34) * d, y: S.y + lift, z: S.z + (u[1] * 0.94 + p[1] * 0.34) * d }
    look = { x: S.x, y: S.y - (LOOK_DROP[size] ?? 0.3), z: S.z }
    pivot = S; focus = S
  } else return null
  others = (h.actors ? h.actors(t) : []).filter(a => !excl.includes(a.name))
  // swing around the pivot (on the same side: at most 50 degrees) or rise, until every subject is in clear view
  const ok = (c) => !h.solidAt(c.x, c.y, c.z) && subjects.every(s => clear(c, s, h.solidAt)) && (sh.ots || !subjects.some(s => blockedBy(c, s, others)))
  if (!ok(pos)) {
    const rx = pos.x - pivot.x, rz = pos.z - pivot.z
    let best = null
    for (const up of [0, 0.5, 1.0, 1.6]) {
      for (const deg of [8, -8, 16, -16, 24, -24, 32, -32, 40, -40, 50, -50]) {
        if (!up && !deg) continue
        const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
        const q = { x: pivot.x + rx * c - rz * s, y: pos.y + up, z: pivot.z + rx * s + rz * c }
        if (ok(q)) { best = q; break }
      }
      if (best) break
      if (up) { const q = { x: pos.x, y: pos.y + up, z: pos.z }; if (ok(q)) { best = q; break } }
    }
    if (best) pos = best
  }
  return { pos, look, focus, subjects }
}

function frame (sh, t, h) {
  if (!(sh.two || sh.ots || sh.single)) return null
  if ((sh.anchor || 'start') === 'live') return place(sh, t, h)
  const key = `${sh.name}@${sh.t0}`
  if (!cache.has(key)) cache.set(key, place(sh, sh.t0 + 1, h))
  return cache.get(key)
}

module.exports = { frame, place, clear, segDist, perpTo, sideVec }
