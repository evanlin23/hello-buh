// The scene lint's near-plane check (renderer/lint.js nearPlaneClips): a camera whose centre is clear but sits a few
// centimetres off a block face still shows the block's inside (owner, 2026-11-11, Good Boy 0.6 s: a follow camera
// dipping toward the road). shotCam pushes the centre out of blocks, so the centre test alone never fired.
const test = require('node:test')
const assert = require('node:assert')
const { nearPlaneClips } = require('../../../renderer/lint')

// the ground: every block with y < 0 is solid
const ground = (x, y, z) => Math.floor(y) < 0

test('nearPlaneClips: a camera 2 cm over the ground, looking down, clips; 1 block up it does not', () => {
  const down = { yaw: 0, pitch: -0.6, fov: 50 }
  assert.strictEqual(ground(0.5, 0.02, 0.5), false)   // the centre itself is clear: the old check passed it
  assert.strictEqual(nearPlaneClips({ x: 0.5, y: 0.02, z: 0.5, ...down }, ground), true)
  assert.strictEqual(nearPlaneClips({ x: 0.5, y: 1.0, z: 0.5, ...down }, ground), false)
})

test('nearPlaneClips: level, a wall 3 cm ahead clips; one 0.5 block ahead does not; a wall behind never does', () => {
  // yaw 0 looks toward -z: a wall filling z < -0.03 (just ahead), and one at z < -0.5
  const level = { x: 0.5, y: 1.5, z: 0, yaw: 0, pitch: 0, fov: 70 }
  assert.strictEqual(nearPlaneClips(level, (x, y, z) => z < -0.03), true)
  assert.strictEqual(nearPlaneClips(level, (x, y, z) => z < -0.5), false)
  assert.strictEqual(nearPlaneClips(level, (x, y, z) => z > 0.03), false)
})
