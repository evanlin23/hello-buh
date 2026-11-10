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

module.exports = { stepTurn, stepActor, rayHitsBlock, wrap, TURN, ACTOR, DEG, DESTROY_DELAY, USE_DELAY }
