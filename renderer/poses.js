// Poses for player actors (and mannequins): data, not engine code. docs/engine_features.md "Add a pose".
//
// A stunt stages one with lib/movie.js:  M.pose(ctx, 'Grandpa', 'sit')  /  M.pose(ctx, 'Boy', ['sit', 'drink'])
// (or ctx.mark('pose', { ids, pose: 'wave' })) until M.poseOff(ctx, 'Grandpa'). render.js (ACT_POSE) eases each
// pose in over its `blend` ticks and out again after the pose_off, and renderer/entities.js applies them, in order,
// on top of the walk, the held-item arm, the crouch and the swing (HumanoidModel.setupAnim's order).
//
// A pose:
//   blend: ticks to ease in and out (default 4)
//   limbs: { bone: { set: [x, y, z] } | { add: [x, y, z] } }   radians, Java's ModelPart xRot/yRot/zRot (same signs as
//          HumanoidModel: x negative = arm forward/up, legs forward). `set` replaces (walk swing and all), `add` adds.
//          bones: head, body, rightArm, leftArm, rightLeg, leftLeg. A value may be a function of c:
//          c.age (ticks), c.head.x / c.head.y (the head's look, after idle life), c.q (the mark's params: seat, ...)
//   pos:   { bone: [x, y, z] }  the bone's pivot in model px (y down; rest: head/body 0,0,0, arms -+5,2,0,
//          legs -+1.9,12,0), for crouches and kneels
//   drop:  blocks the whole model moves down (a function of c for params: sit's `seat`)
//   root:  { rot: [x, y, z], off: [x, y, z] }  turn the whole body (radians, about the feet, in the body's own
//          frame: x tips it forward) and move it (blocks, in its own frame: z is forward): lying down
// Params on the mark: off: true mirrors the arms (the off hand does it); anything else reaches the functions as c.q.
// Vanilla references are in the comments: copy the numbers from HumanoidModel / PlayerModel / AnimationUtils.

const PI = Math.PI
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
// ArmPose.TOOT_HORN's arm: the item at the mouth (a horn; we use it for drinking and eating too)
const toMouth = (c) => clamp(c.head.x, -1.2, 1.2) - 1.4835298
// thighs rest `seat` blocks above the feet: the hip pivot is 12 of the model's 32 px up (x 0.9375 = 0.704 blocks),
// the thigh's underside 2 px under the pivot (0.117)
const seatDrop = (c) => 0.704 - 0.117 - (Number(c.q.seat) || 0)

export const POSES = {
  // HumanoidModel.setupAnim, riding: arms forward 36 degrees, legs out in front, splayed 18 degrees. Stand the actor
  // ON the seat (a slab, a stair; or { seat: 0.5 } in front of one) and mark.
  sit: {
    blend: 4,
    limbs: { rightArm: { add: [-PI / 5, 0, 0] }, leftArm: { add: [-PI / 5, 0, 0] }, rightLeg: { set: [-1.4137167, PI / 10, 0.07853982] }, leftLeg: { set: [-1.4137167, -PI / 10, -0.07853982] } },
    drop: seatDrop
  },
  // on the floor, legs flat out in front, hands in the lap: against a door frame or a wall
  sit_ground: {
    blend: 4,
    limbs: { rightArm: { add: [-0.45, 0, 0.1] }, leftArm: { add: [-0.45, 0, -0.1] }, rightLeg: { set: [-PI / 2, 0.12, 0] }, leftLeg: { set: [-PI / 2, -0.12, 0] } },
    drop: seatDrop
  },
  // sitting on the floor with the knees drawn up (legs are one piece: they point up and forward), back to a wall
  crouch_sit: {
    blend: 5,
    limbs: { body: { set: [0.2, 0, 0] }, rightArm: { set: [-0.9, -0.2, 0.15] }, leftArm: { set: [-0.9, 0.2, -0.15] }, rightLeg: { set: [-2.1, 0.25, 0] }, leftLeg: { set: [-2.1, -0.25, 0] } },
    drop: (c) => 0.704 - (Number(c.q.seat) || 0) - 0.05
  },
  // a drink: the bottle up to the mouth, the head tipped back, a slow gulping bob
  drink: {
    blend: 3,
    limbs: { head: { add: [-0.25, 0, 0] }, rightArm: { set: [(c) => toMouth(c) + Math.sin(c.age * 0.9) * 0.04, (c) => c.head.y - PI / 6, 0] } }
  },
  // eating: the food at the mouth, chewing faster
  eat: {
    blend: 3,
    limbs: { rightArm: { set: [(c) => toMouth(c) + Math.sin(c.age * 1.6) * 0.07, (c) => c.head.y - PI / 6, 0] } }
  },
  // ArmPose.TOOT_HORN exactly: an item held to the face (a goat horn, a spyglass-ish look)
  use: {
    blend: 3,
    limbs: { rightArm: { set: [toMouth, (c) => c.head.y - PI / 6, 0] } }
  },
  // the right arm straight out along the look (ArmPose.BOW_AND_ARROW's right arm)
  point: {
    blend: 3,
    limbs: { rightArm: { set: [(c) => -PI / 2 + c.head.x, (c) => -0.1 + c.head.y, 0] } }
  },
  // the right arm up and waving side to side
  wave: {
    blend: 4,
    limbs: { rightArm: { set: [-2.9, 0, (c) => 0.25 + Math.sin(c.age * 0.7) * 0.35] } }
  },
  // both hands up (surrender, cheering)
  hands_up: {
    blend: 4,
    limbs: { rightArm: { set: [-PI + 0.15, 0, 0.25] }, leftArm: { set: [-PI + 0.15, 0, -0.25] } }
  },
  // looking down at something held in both hands in front (a map, a letter, an item)
  look_item: {
    blend: 4,
    limbs: { head: { add: [0.55, 0, 0] }, rightArm: { set: [-0.95, -0.35, 0] }, leftArm: { set: [-0.95, 0.35, 0] } }
  },
  // kneeling on one knee: the right leg folded back under, the left forward
  kneel: {
    blend: 5,
    limbs: { rightLeg: { set: [-0.15, 0, 0] }, leftLeg: { set: [-1.45, 0, 0] } },
    pos: { rightLeg: [-1.9, 12, 3] },
    drop: 0.45
  },
  // the sneak crouch (HumanoidModel crouching + PlayerRenderer's 0.125 drop), staged: the recorded one comes by itself
  crouch: {
    blend: 2,
    limbs: { body: { set: [0.5, 0, 0] }, rightArm: { add: [0.4, 0, 0] }, leftArm: { add: [0.4, 0, 0] } },
    pos: { rightLeg: [-1.9, 12.2, 4], leftLeg: [1.9, 12.2, 4], head: [0, 4.2, 0], body: [0, 3.2, 0], rightArm: [-5, 5.2, 0], leftArm: [5, 5.2, 0] },
    drop: 0.125
  },
  // lying on the back (a sleeping player is turned 90 degrees on the bed): the actor's feet where the body's
  // middle should be, facing where the head goes
  lie: {
    blend: 6,
    limbs: { head: { set: [0, 0, 0] }, rightArm: { set: [0, 0, 0.08] }, leftArm: { set: [0, 0, -0.08] }, rightLeg: { set: [0, 0, 0] }, leftLeg: { set: [0, 0, 0] } },
    root: { rot: [-PI / 2, 0, 0], off: [0, 0.2, -0.9] }
  }
}

// the arms swapped and y/z mirrored (off: true)
const MIRROR = { rightArm: 'leftArm', leftArm: 'rightArm', rightLeg: 'leftLeg', leftLeg: 'rightLeg' }
const val = (v, c) => (typeof v === 'function' ? v(c) : v)

// Apply a list of poses ({ name, k: 0..1, ...params }) to a player model's bones (renderer/entities.js posePlayer).
// Returns { drop, root } for the caller to move the whole model.
export function applyPoses (B, list, age) {
  let drop = 0, root = null
  for (const q of list || []) {
    const def = POSES[q.name]
    if (!def) continue
    const k = q.k ?? 1, mir = !!q.off
    const c = { age, q, head: { x: B.head.rotation.x, y: mir ? -B.head.rotation.y : B.head.rotation.y } }
    for (const [limb, spec] of Object.entries(def.limbs || {})) {
      const bone = B[mir ? (MIRROR[limb] || limb) : limb]
      if (!bone) continue
      const v = (spec.set || spec.add).map(x => val(x, c))
      if (mir) { v[1] = -v[1]; v[2] = -v[2] }
      const r = bone.rotation
      if (spec.set) { r.x += (v[0] - r.x) * k; r.y += (v[1] - r.y) * k; r.z += (v[2] - r.z) * k } else { r.x += v[0] * k; r.y += v[1] * k; r.z += v[2] * k }
    }
    for (const [limb, p] of Object.entries(def.pos || {})) {
      const bone = B[mir ? (MIRROR[limb] || limb) : limb]
      if (!bone) continue
      const x = mir ? -p[0] : p[0]
      bone.position.x += (x - bone.position.x) * k; bone.position.y += (p[1] - bone.position.y) * k; bone.position.z += (p[2] - bone.position.z) * k
    }
    if (def.drop) drop += val(def.drop, c) * k
    if (def.root) root = { rot: def.root.rot.map(x => val(x, c) * k), off: (def.root.off || [0, 0, 0]).map(x => val(x, c) * k) }
  }
  return { drop, root }
}

export const POSE_NAMES = Object.keys(POSES)
export const blendOf = (name) => (POSES[name] && POSES[name].blend) || 4
