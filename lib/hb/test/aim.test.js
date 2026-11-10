// The story kit's look lands on faces (owner, 2026-11-10: "when we 'look' at things, it feels we are looking slightly too low")
const test = require('node:test')
const assert = require('node:assert')
const { Vec3 } = require('vec3')
const { storyKit, AIM_LIFT } = require('../../story')

const kit = (stunt = {}, sneak = false) => {
  const bot = { entity: { position: new Vec3(0.5, 64, 0.5), yaw: 0, pitch: 0 }, controlState: { sneak }, look () {}, chat () {}, on () {}, removeListener () {} }
  const ctx = { bot, stunt, tick: 0, Vec3, mark () {}, log () {} }
  return storyKit(ctx, { line: () => ({ dur: 1 }), gap: 0.1 }, { X: 0, Z: 0, F: 63 })
}
const deg = (r) => r * 180 / Math.PI

test('K.face is a villager\'s eyes, exact: a look at it is level from a standing eye 4 blocks away', () => {
  const K = kit()
  const p = K.face(new Vec3(0.5, 64, -3.5), 'villager')
  assert.strictEqual(p.y, 64 + 1.62)
  assert.ok(Math.abs(K.aim(p).pitch) < 1e-9)
})

test('a plain point is lifted AIM_LIFT degrees; stunt.aimLift 0 and a per-call lift 0 turn it off', () => {
  const p = new Vec3(0.5, 65.62, -3.5)
  assert.ok(Math.abs(deg(kit().aim(p).pitch) - AIM_LIFT) < 1e-9)
  assert.ok(Math.abs(kit({ aimLift: 0 }).aim(p).pitch) < 1e-9)
  assert.ok(Math.abs(kit().aim(p, 0).pitch) < 1e-9)
})

test('sneaking aims from the crouched eye (1.27), the one the renderer draws', () => {
  const K = kit({}, true)
  const p = K.face(new Vec3(0.5, 64, -3.5), 'player', { sneak: true })
  assert.ok(Math.abs(p.y - (64 + 1.27)) < 1e-9)
  assert.ok(Math.abs(K.aim(p).pitch) < 1e-9)
})

test('a zombie\'s eyes are at 1.74; a block below the eye is looked at on its top face', () => {
  const K = kit()
  assert.ok(Math.abs(K.face(new Vec3(0, 64, 0), 'zombie').y - 65.74) < 1e-9)
  const t = K.top(2, 64, -3)
  assert.deepStrictEqual([t.x, t.y, t.z, t.exact], [2.5, 65, -2.5, true])
})
