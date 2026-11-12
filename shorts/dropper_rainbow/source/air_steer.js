// Mid-air steering for drops onto a small target (one_in_a_million): real survival air-strafing,
// i.e. only the movement keys, the way a player lines up a water landing. While falling the camera
// faces straight down with a fixed yaw; each tick we pick forward/back/left/right so the horizontal
// velocity approaches err / ticksLeft. A sideways "drift" bias early in the fall (toward the pool edge,
// or the lava) is corrected late, so it looks like it might miss: tension.
//   steer({ yaw, px, pz, vx, vz, y, vy, tx, tz, floorY, startY, bias }) -> { forward, back, left, right }
function ticksToFall (y, vy, floorY) {
  // vanilla fall: vy = (vy - 0.08) * 0.98 each tick
  let t = 0
  while (y > floorY && t < 400) { vy = (vy - 0.08) * 0.98; y += vy; t++ }
  return t
}

// The drift, by ticks left to the landing: it builds through the high part of the fall, peaks
// LP ticks out (low: a few blocks are a big angle there), and the steer target is back on centre
// LE ticks out, which leaves air control (~0.29 b/tick, a few ticks behind the target) time to land
// it. The first version peaked 30% into the fall and was gone by 60%: from 170 blocks up 3 blocks
// is 1 degree, and the review saw a straight drop (owner: "no tension about making it").
const LP = Number(process.env.STEER_LP || 36), LE = Number(process.env.STEER_LE || 18)
function driftShape (left, total) {
  const lp = Math.min(LP, 0.6 * total), le = Math.min(LE, 0.3 * total)
  if (left >= total) return 0
  if (left > lp) return Math.sin(Math.PI / 2 * (total - left) / (total - lp))
  if (left > le) return Math.sin(Math.PI / 2 * (left - le) / (lp - le))
  return 0
}

function steer (s) {
  const left = Math.max(1, ticksToFall(s.y, s.vy, s.floorY))
  const drift = (s.bias || 0) * driftShape(left, ticksToFall(s.startY, 0, s.floorY))
  const fwd = { x: -Math.sin(s.yaw), z: -Math.cos(s.yaw) }, right = { x: Math.cos(s.yaw), z: -Math.sin(s.yaw) }
  const tx = s.tx + right.x * drift, tz = s.tz + right.z * drift
  // the keys act a tick late (physicsTick runs before the move is sent): aim from where we'll be
  const ex = tx - (s.px + s.vx), ez = tz - (s.pz + s.vz)
  // desired velocity: cover the error in the time left (a bit early), capped at air speed
  const lead = Math.max(1, Math.min(left - 3, Number(process.env.STEER_LEAD || 8)))   // a short horizon: follow the drift closely (covering the error over all the time left barely moved: review)
  const cap = 0.3
  let dvx = Math.max(-cap, Math.min(cap, ex / lead)) - s.vx, dvz = Math.max(-cap, Math.min(cap, ez / lead)) - s.vz
  const df = dvx * fwd.x + dvz * fwd.z, dr = dvx * right.x + dvz * right.z
  const dead = 0.004
  return { forward: df > dead, back: df < -dead, right: dr > dead, left: dr < -dead }
}

module.exports = { steer, ticksToFall, driftShape }
