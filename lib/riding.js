// Riders, boats and leads: the vanilla numbers the harness (recording) and render.js (drawing) share.
// docs/engine_features.md "Boats, leads and passengers". Java 1.21.11 (client jar, Mojang mappings):
//   AbstractBoat.getPassengerAttachmentPoint: (0, height / 3, f).yRot(-yRot) (BambooRaft: height x 0.8888889),
//     f = 0 alone; with two riders 0.2 for the first, -0.6 for the second, + 0.2 more for an Animal
//   Entity.positionRider: rider = vehicle + that point - the rider's VEHICLE attachment (Player: (0, 0.6, 0),
//     Player.DEFAULT_VEHICLE_ATTACHMENT; a villager: 0, measured on the server: kid y = boat y + 0.1875)
//   AbstractBoat.getLeashOffset: (0, 0.88 x height, 0.64 x width) (the bow); Leashable default: (0, eyeHeight,
//     0.4 x width); both turned by -yRot (EntityRenderer.extractRenderState)
//   Player.getRopeHoldPosition: pos + (0.22 x (main arm right ? -1 : 1), bbHeight - 1, crouching ? -0.2 : 0.07)
//     .yRot(-bodyYaw); LeashFenceKnotEntity: pos + (0, 0.2, 0); Entity default: pos + (0, 0.7 x eyeHeight, 0)
//   LeashFeatureRenderer.renderLeash / addVertexPair: 24 segments, two crossed ribbons 0.05 wide, colour
//     (0.5, 0.4, 0.3) x (0.7 on every other segment), the sag dy x t^2 (holder above) or dy - dy (1 - t)^2, light
//     levels lerped from the leashed entity's to the holder's
// Yaw here is mineflayer's (radians, 0 = facing -z, the recording's convention): forward = (-sin yaw, -cos yaw).

const BOAT = /(^|_)(boat|raft)$/
const isBoat = (name) => BOAT.test(String(name || ''))
// EntityType dimensions [width, height] of the vehicles and leashables we place offsets on
const DIMS = { boat: [1.375, 0.5625], minecart: [0.98, 0.7], player: [0.6, 1.8], villager: [0.6, 1.95], leash_knot: [0.375, 0.5] }
const dimsOf = (name) => DIMS[name] || (isBoat(name) ? DIMS.boat : null)
// the rider's VEHICLE attachment (EntityAttachments): the player's 0.6 is Player.DEFAULT_VEHICLE_ATTACHMENT; the rest
// default to 0 (a villager measured exactly 0)
const VEHICLE_ATTACH = { player: 0.6 }
// Animal subclasses that sit 0.2 further forward as the second rider (AbstractBoat: instanceof Animal)
const ANIMAL = /^(cow|mooshroom|pig|sheep|chicken|rabbit|wolf|cat|ocelot|fox|panda|polar_bear|bee|goat|frog|axolotl|turtle|parrot|llama|trader_llama|horse|donkey|mule|camel|sniffer|armadillo|strider|hoglin)$/

const forward = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)]

// where a rider stands: [x, y, z] from the vehicle's position and yaw. index/count: its place among the riders.
function riderPos (vehicle, rider, index = 0, count = 1) {
  const vd = dimsOf(vehicle.name)
  let up, f = 0
  if (isBoat(vehicle.name)) {
    const h = vd[1]
    up = /raft$/.test(vehicle.name) ? h * 0.8888889 : h / 3
    if (count > 1) { f = index === 0 ? 0.2 : -0.6; if (ANIMAL.test(rider.name)) f += 0.2 }
  } else up = vd ? vd[1] : 0   // Entity.getPassengerAttachmentPoint default: (0, height, 0) (a fallback for other vehicles)
  const [fx, fz] = forward(vehicle.yaw || 0)
  return [vehicle.x + fx * f, vehicle.y + up - (VEHICLE_ATTACH[rider.name] ?? 0), vehicle.z + fz * f]
}

// the lead's end on the leashed entity: { x, y, z, yaw, name, extra }
function leashPoint (e) {
  const d = dimsOf(e.name) || [0.6, 1.8], s = e.extra && e.extra.baby ? 0.5 : 1
  const [fx, fz] = forward(e.yaw || 0)
  if (isBoat(e.name)) return [e.x + fx * 0.64 * d[0], e.y + 0.88 * d[1], e.z + fz * 0.64 * d[0]]
  const eye = (e.eye ?? d[1] * 0.85) * s, w = d[0] * s * 0.4   // Leashable default: (0, eyeHeight, 0.4 x width)
  return [e.x + fx * w, e.y + eye, e.z + fz * w]
}
// ...and on the holder
function ropeHold (h) {
  if (h.name === 'leash_knot') return [h.x, h.y + 0.2, h.z]
  if (h.name === 'player' || h.name === 'mannequin') {
    const crouch = !!(h.extra && h.extra.sneak), bb = crouch ? 1.5 : 1.8
    const side = -0.22, fwd = crouch ? -0.2 : 0.07           // main arm right: x = 0.22 x -1, the right hand
    // Vec3(side, _, fwd).yRot(-mcYaw) = side x (cos, sin) + fwd x forward; with forward (fx, fz) = (-sin, cos) the
    // first axis is (fz, -fx) (the body's left). Facing +z (fx 0, fz 1): x - 0.22, the right hand.
    const [fx, fz] = forward(h.yaw || 0)
    return [h.x + side * fz + fwd * fx, h.y + bb - 1, h.z - side * fx + fwd * fz]
  }
  const d = dimsOf(h.name) || [0.6, 1.8], s = h.extra && h.extra.baby ? 0.5 : 1
  return [h.x, h.y + (h.eye ?? d[1] * 0.85) * s * 0.7, h.z]
}

// The lead between them as triangles: LeashFeatureRenderer's two ribbons (each a strip of 25 pairs), colours lit by the
// light levels lerped from start to end. a, b: [x, y, z]; la, lb: [sky, block]; light(sky, block) -> [r, g, b].
// Returns { pos: [...], col: [...] } (non-indexed triangles).
function leashMesh (a, b, la, lb, light) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]
  const k = 0.05 / 2 / Math.max(1e-6, Math.hypot(dx, dz))
  const ox = dz * k, oz = dx * k
  const ribbon = (w, reverse) => {
    const pts = []
    for (let s = 0; s <= 24; s++) {
      const i = reverse ? 24 - s : s, t = i / 24
      const sky = Math.floor(la[0] + (lb[0] - la[0]) * t), blk = Math.floor(la[1] + (lb[1] - la[1]) * t)
      const L = light(sky, blk), g = i % 2 === (reverse ? 1 : 0) ? 0.7 : 1
      const c = [0.5 * g * L[0], 0.4 * g * L[1], 0.3 * g * L[2]]
      const x = a[0] + dx * t, y = a[1] + (dy > 0 ? dy * t * t : dy - dy * (1 - t) * (1 - t)), z = a[2] + dz * t
      pts.push([[x - ox, y + w, z + oz], c], [[x + ox, y + 0.05 - w, z - oz], c])
    }
    return pts
  }
  const pos = [], col = []
  for (const [w, rev] of [[0.05, false], [0, true]]) {
    const p = ribbon(w, rev)
    for (let i = 0; i + 2 < p.length; i++) for (const q of [p[i], p[i + 1], p[i + 2]]) { pos.push(...q[0]); col.push(...q[1]) }
  }
  return { pos, col }
}

module.exports = { isBoat, riderPos, leashPoint, ropeHold, leashMesh, dimsOf }
