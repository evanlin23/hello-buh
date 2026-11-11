// Motion that reads as a player, by construction (owner, 2026-11-10: "The movement sometimes still feels jerky and
// botlike" ... "the processes should be such that the movement is [smooth] in the first place"). Pure functions,
// used by the story kit (lib/story.js) every tick and by the tests (lib/hb/test/motion.test.js):
//   stepTurn     the camera's aim follows its target like a hand on a mouse: a top speed, an acceleration, and
//                braking in time to land on the target (no overshoot), so every look change is an eased turn
//   stepActor    a cast member moves toward where a scene put it at walking speed and turns its head at a mob's
//                rate: a scene that sets an actor 6 blocks away gets a walk, not a pop (warps only on a cut)
//   rayHitsBlock does the crosshair from `eye` along (yaw, pitch) enter block (bx, by, bz) within `reach`?
// Angles in radians, mineflayer's convention (yaw 0 = north (-z), increasing to the west; pitch up positive).

const DEG = Math.PI / 180
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a }

// Defaults (chosen, not measured: a calm, deliberate mouse): a turn tops out at 180 deg/s and gets there in a fifth of
// a second (900 deg/s^2), so a 50-degree turn takes ~0.45 s (light_sleeper's jukebox whip did it in 0.25 s at 285 deg/s). stunt.motion { turnSpeed, turnAccel } (deg/s, deg/s^2)
// override them per story.
const TURN = { speed: 180 * DEG / 20, accel: 900 * DEG / 400 }   // rad/tick, rad/tick^2
// A cast member (K.actor): vanilla walk 0.216 blocks/tick (sprint 0.28); /tp'd mobs that move faster than a sprint
// read as a glide or a pop. Heads turn at most ~20 deg a tick (LookControl turns 10 a tick; a /tp turn is eased over
// 3 ticks by the client).
const ACTOR = { step: 0.3, yaw: 20, pitch: 15 }   // blocks/tick, deg/tick, deg/tick

// One tick of the aim governor. cur/vel/target: { yaw, pitch }; lim: { speed, accel } (rad/tick, rad/tick^2).
// The aim moves along the straight line (in yaw-pitch) to the target. Its speed eases up at `accel`, never passes
// `speed`, and brakes so that it stops on the target (v = min(speed, what still stops in d, d)). Returns { cur, vel }.
function stepTurn (cur, vel, target, lim = TURN) {
  const dy = wrap(target.yaw - cur.yaw), dp = target.pitch - cur.pitch
  const d = Math.hypot(dy, dp)
  if (d < 1e-6) return { cur: { yaw: target.yaw, pitch: target.pitch }, vel: { yaw: 0, pitch: 0 } }
  // the speed this tick wants: what still stops in time, no more than the top speed, no more than what's left
  // (discrete braking: speeds v, v - a, v - 2a ... cover v^2 / 2a + v / 2, so v = sqrt(a^2/4 + 2ad) - a/2)
  const want = Math.min(lim.speed, Math.sqrt(lim.accel * lim.accel / 4 + 2 * lim.accel * d) - lim.accel / 2 + 1e-9, d)
  // the velocity's change is limited too (a turn that reverses eases through zero)
  const ux = dy / d, uy = dp / d
  let vx = ux * want, vy = uy * want
  const ax = vx - vel.yaw, ay = vy - vel.pitch, a = Math.hypot(ax, ay)
  const amax = Math.hypot(vx, vy) > Math.hypot(vel.yaw, vel.pitch) ? lim.accel : lim.accel * 1.5   // braking a little firmer
  if (a > amax) { vx = vel.yaw + ax / a * amax; vy = vel.pitch + ay / a * amax }
  // never step past the target (the braking curve's last tick)
  const s = Math.hypot(vx, vy)
  if (s > d) { vx = vx / s * d; vy = vy / s * d }
  return { cur: { yaw: wrap(cur.yaw + vx), pitch: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cur.pitch + vy)) }, vel: { yaw: vx, pitch: vy } }
}

// One tick of a cast member. at: the state sent last tick { x, y, z, yaw, pitch } (yaw/pitch in mc degrees);
// want: the state the scene wants; warp: true on a cut / a first placement / K.warp (moves at once).
// -> { at, clamped }: clamped = how far the scene asked it to jump (blocks) when that was more than a step.
function stepActor (at, want, warp = false, lim = ACTOR) {
  if (!at || warp) return { at: { x: want.x, y: want.y, z: want.z, yaw: want.yaw, pitch: want.pitch }, clamped: 0 }
  const dx = want.x - at.x, dy = want.y - at.y, dz = want.z - at.z, d = Math.hypot(dx, dy, dz)
  let x = want.x, y = want.y, z = want.z, clamped = 0
  if (d > lim.step) { const k = lim.step / d; x = at.x + dx * k; y = at.y + dy * k; z = at.z + dz * k; clamped = d }
  const turn = (a, b, m) => { let e = b - a; while (e > 180) e -= 360; while (e < -180) e += 360; return a + Math.max(-m, Math.min(m, e)) }
  return { at: { x, y, z, yaw: turn(at.yaw, want.yaw, lim.yaw), pitch: turn(at.pitch, want.pitch, lim.pitch) }, clamped }
}

// slab test: does the ray from eye o = [x, y, z] along (yaw, pitch) enter the block within reach? `shrink` keeps the
// crosshair off the edges (the renderer's dig smoothing uses 0.1)
function rayHitsBlock (o, yaw, pitch, bx, by, bz, reach = 6, shrink = 0.05) {
  const d = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)], lo = [bx + shrink, by + shrink, bz + shrink], hi = [bx + 1 - shrink, by + 1 - shrink, bz + 1 - shrink]
  let t0 = 0, t1 = reach
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo[k] || o[k] > hi[k]) return false; continue }
    let u = (lo[k] - o[k]) / d[k], v = (hi[k] - o[k]) / d[k]
    if (u > v) [u, v] = [v, u]
    t0 = Math.max(t0, u); t1 = Math.min(t1, v)
    if (t0 > t1) return false
  }
  return true
}

// Vanilla's gaps between block actions (MultiPlayerGameMode / Minecraft): after a block breaks in survival the next
// dig starts no sooner than destroyDelay = 5 ticks; a block placed (or any use) waits rightClickDelay = 4 ticks.
// The bot did neither: 3 wool blocks broke in 15 ticks back to back ("sped up", light_sleeper L06).
const DESTROY_DELAY = 5, USE_DELAY = 4


// ---- walking a path (K.walkTo): one steering rule for the walk and for its dry run
// Waypoints are passed, not only reached: the steering looks ahead and cuts corners, so a walker can go by a waypoint
// more than 0.6 from it; one that was only "reached" turned the walker back toward it, and the look-ahead then
// pointed at the walker's own feet: it spun in place for 20 s (motiontest, 2026-11-10).
const WALK_LOOK = 2   // blocks ahead along the path, from the walker's projection on its leg
const WALK = { accel: 0.098, sprint: 0.1274, friction: 0.546, half: 0.3 }   // vanilla on grass: v' = 0.546 v + 0.098 (0.216 b/tick)

// -> { i, ahead }: i the waypoint the walker heads for (pts.length: arrived), ahead the point to steer at.
// start, pts: { x, y, z } (feet); p: { x, z } the walker now
function walkSteer (start, pts, i, p, look = WALK_LOOK) {
  const n = pts.length
  while (i < n) {
    const q = pts[i], last = i === n - 1
    if (Math.hypot(q.x - p.x, q.z - p.z) < (last ? 0.25 : 0.6)) { i++; continue }
    // passed: beyond the waypoint along the next leg (a corner cut short)
    if (!last && (p.x - q.x) * (pts[i + 1].x - q.x) + (p.z - q.z) * (pts[i + 1].z - q.z) > 0) { i++; continue }
    break
  }
  if (i >= n) return { i, ahead: null }
  const a = i === 0 ? start : pts[i - 1], b = pts[i]
  const ux = b.x - a.x, uz = b.z - a.z, L2 = ux * ux + uz * uz
  const t = L2 > 1e-9 ? Math.max(0, Math.min(1, ((p.x - a.x) * ux + (p.z - a.z) * uz) / L2)) : 1
  let c = { x: a.x + ux * t, z: a.z + uz * t }, rem = look, ahead = { x: b.x, y: b.y, z: b.z }
  for (let j = i; j < n; j++) {
    const d = Math.hypot(pts[j].x - c.x, pts[j].z - c.z)
    if (d >= rem) { const f = rem / d; ahead = { x: c.x + (pts[j].x - c.x) * f, y: pts[j].y, z: c.z + (pts[j].z - c.z) * f }; break }
    rem -= d; c = pts[j]; ahead = { x: pts[j].x, y: pts[j].y, z: pts[j].z }
  }
  // the last stretch: steer at the end point itself (a point 2 blocks "ahead" of it doesn't exist)
  return { i, ahead }
}

// The walk's dry run: the same steering, the aim governor and vanilla's ground movement, in 2D. -> null when the walker
// gets there without pushing into a block, else what stops it ("stone at x y z" / "doesn't arrive in N ticks").
// solid(x, y, z) -> a block's name when it is a full block there, else null. gov: { cur, vel } the aim now; o: { sprint,
// pitch, max, lim }. Heights: on a leg that climbs (a full-block step) only the head is tested (the walker jumps it).
function walkPlan (start, pts, gov, solid, o = {}) {
  let x = start.x, z = start.z, vx = 0, vz = 0, i = 0
  let cur = { ...gov.cur }, vel = { ...gov.vel }
  const acc = o.sprint ? WALK.sprint : WALK.accel, h = WALK.half * 0.99
  for (let k = 0; k < (o.max ?? 400); k++) {
    const s = walkSteer(start, pts, i, { x, z }); i = s.i
    if (i >= pts.length) return null
    const yaw = Math.atan2(-(s.ahead.x - x), -(s.ahead.z - z))
    const r = stepTurn(cur, vel, { yaw, pitch: o.pitch ?? cur.pitch }, o.lim || TURN); cur = r.cur; vel = r.vel
    const fwd = Math.abs(wrap(yaw - cur.yaw)) < 0.6
    vx = vx * WALK.friction + (fwd ? -Math.sin(cur.yaw) * acc : 0)
    vz = vz * WALK.friction + (fwd ? -Math.cos(cur.yaw) * acc : 0)
    x += vx; z += vz
    const a = i === 0 ? start : pts[i - 1], b = pts[i]
    const ux = b.x - a.x, uz = b.z - a.z, L2 = ux * ux + uz * uz
    const t = L2 > 1e-9 ? Math.max(0, Math.min(1, ((x - a.x) * ux + (z - a.z) * uz) / L2)) : 1
    const y = a.y + (b.y - a.y) * t
    for (const dy of b.y > a.y + 0.5 ? [1.2, 1.7] : [0.55, 1.2, 1.7]) {
      for (const [sx, sz] of [[-h, -h], [-h, h], [h, -h], [h, h]]) {
        const hit = solid(x + sx, y + dy, z + sz)
        if (hit) return `${hit} at ${Math.floor(x + sx)} ${Math.floor(y + dy)} ${Math.floor(z + sz)} (the walk reaches it at ${x.toFixed(1)} ${y.toFixed(1)} ${z.toFixed(1)}, cutting the corner toward waypoint ${i + 1})`
      }
    }
  }
  return `doesn't arrive in ${o.max ?? 400} ticks`
}

// A mob's position as the vanilla client draws it (InterpolationHandler): the server's tracker sends a mob's move only
// every 3rd tick, and the client eases toward each new position over 3 ticks, a third, a half, then all of what's
// left. l: this mob's state from the last tick (null on its first), p: the position mineflayer has now (a Vec3).
// Returns the new state; draw l.pos. A jump over 8 blocks snaps. Used by lib/harness.js for stunt.lerpMobs.
function lerpStep (l, p) {
  if (!l || l.pos.distanceTo(p) > 8) return { pos: p.clone(), target: p.clone(), steps: 0 }
  let { pos, target, steps } = l
  if (!target.equals(p)) { target = p.clone(); steps = 3 }
  if (steps > 0) { pos = pos.plus(target.minus(pos).scaled(1 / steps)); steps-- }
  return { pos, target, steps }
}

module.exports = { lerpStep, stepTurn, stepActor, rayHitsBlock, walkSteer, walkPlan, wrap, TURN, ACTOR, WALK, WALK_LOOK, DEG, DESTROY_DELAY, USE_DELAY }
