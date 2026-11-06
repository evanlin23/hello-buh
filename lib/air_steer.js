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

function steer (s) {
  const left = Math.max(1, ticksToFall(s.y, s.vy, s.floorY))
  const f = Math.min(1, Math.max(0, (s.startY - s.y) / Math.max(1, s.startY - s.floorY)))
  // drift toward the side for the first 60% of the fall, back to centre after
  const drift = (s.bias || 0) * Math.sin(Math.PI * Math.min(1, f / 0.6))
  const fwd = { x: -Math.sin(s.yaw), z: -Math.cos(s.yaw) }, right = { x: Math.cos(s.yaw), z: -Math.sin(s.yaw) }
  const tx = s.tx + right.x * drift, tz = s.tz + right.z * drift
  // the keys act a tick late (physicsTick runs before the move is sent): aim from where we'll be
  const ex = tx - (s.px + s.vx), ez = tz - (s.pz + s.vz)
  // desired velocity: cover the error in the time left (a bit early), capped at air speed
  const lead = Math.max(1, left - 3)
  const cap = 0.3
  let dvx = Math.max(-cap, Math.min(cap, ex / lead)) - s.vx, dvz = Math.max(-cap, Math.min(cap, ez / lead)) - s.vz
  const df = dvx * fwd.x + dvz * fwd.z, dr = dvx * right.x + dvz * right.z
  const dead = 0.004
  return { forward: df > dead, back: df < -dead, right: dr > dead, left: dr < -dead }
}

module.exports = { steer, ticksToFall }
