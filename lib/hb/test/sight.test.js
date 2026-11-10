// Line of sight to what the player digs and places on (owner, 2026-11-10: "we need to ensure there is a clear line of
// sight to the stuff we are placing or breaking", STANDARDS 3b.4): lib/sight.js and the story kit's K.dig / K.place
const test = require('node:test')
const assert = require('node:assert')
const { Vec3 } = require('vec3')
const S = require('../../sight')
const { storyKit } = require('../../story')

// a world of full blocks from a list of "x,y,z"
const world = (cells) => { const W = new Set(cells.map((c) => c.join(','))); return { W, at: (x, y, z) => W.has(`${x},${y},${z}`) ? [[0, 0, 0, 1, 1, 1]] : null } }
const floor = (y = 63, r = 6) => { const c = []; for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) c.push([x, y, z]); return c }

test('rayFirst: the first block along the ray, its distance and the face it enters', () => {
  const w = world([[0, 64, -3]])
  const h = S.rayFirst([0.5, 64.5, 0.5], [0, 0, -1], 6, w.at)
  assert.deepStrictEqual([h.x, h.y, h.z, h.normal], [0, 64, -3, [0, 0, 1]])
  assert.ok(Math.abs(h.t - 2.5) < 1e-9)
  assert.strictEqual(S.rayFirst([0.5, 64.5, 0.5], [0, 0, -1], 2, w.at), null)
  assert.strictEqual(S.rayFirst([0.5, 64.5, 0.5], [0, 0, -1], 6, w.at, (x, y, z) => z === -3), null)
})

test('visiblePoint: a block with another in front of it is seen on a face that is clear, not through the blocker', () => {
  // target 3 blocks north, under the eye; a block right in front of it (its south side): its top is still in view
  const eye = [0.5, 65.62, 0.5]
  const w = world([[0, 64, -3], [0, 64, -2]])
  const r = S.visiblePoint(eye, { pos: [0, 64, -3] }, w.at)
  assert.ok(r.point, 'a face is visible')
  assert.deepStrictEqual(r.normal, [0, 1, 0], 'its top, not the south face (behind the blocker)')
  const d = [r.point[0] - eye[0], r.point[1] - eye[1], r.point[2] - eye[2]], L = Math.hypot(...d)
  assert.strictEqual(S.rayFirst(eye, d.map((q) => q / L), L - 1e-4, w.at, (x, y, z) => x === 0 && y === 64 && z === -3), null)
  // the old aim, the block's centre, went through the blocker
  const c = [0.5 - eye[0], 64.5 - eye[1], -2.5 - eye[2]], Lc = Math.hypot(...c)
  assert.ok(S.rayFirst(eye, c.map((q) => q / Lc), Lc, w.at, (x, y, z) => x === 0 && y === 64 && z === -3))
})

test('visiblePoint: the face toward the eye wins when it is clear', () => {
  const w = world([[0, 64, -3]])
  const r = S.visiblePoint([0.5, 64.62, 0.5], { pos: [0, 64, -3] }, w.at)
  assert.deepStrictEqual(r.normal, [0, 0, 1])
})

test('visiblePoint: a block walled in on every side the eye could see is not visible, and the blocker is named', () => {
  const eye = [0.5, 65.62, 0.5]
  const cells = [[0, 64, -3], [0, 64, -2], [0, 65, -3], [1, 64, -3], [-1, 64, -3], [0, 63, -3], [0, 64, -4]]
  const w = world(cells)
  const r = S.visiblePoint(eye, { pos: [0, 64, -3] }, w.at)
  assert.strictEqual(r.point, null)
  assert.ok(r.blocker && cells.some((c) => c[0] === r.blocker.x && c[1] === r.blocker.y && c[2] === r.blocker.z))
})

test('crosshair: on the block when nothing is in front, blocked when the ray passes through another block first', () => {
  const eye = [0.5, 64.62, 0.5]
  const clear = world([[0, 64, -3]]), wall = world([[0, 64, -3], [0, 64, -2]])
  assert.strictEqual(S.crosshair(eye, 0, -0.05, [[0, 64, -3]], clear.at).on, true)
  const c = S.crosshair(eye, 0, -0.05, [[0, 64, -3]], wall.at)
  assert.strictEqual(c.on, false)
  assert.deepStrictEqual([c.blocker.x, c.blocker.y, c.blocker.z], [0, 64, -2])
  assert.strictEqual(S.crosshair(eye, Math.PI, 0, [[0, 64, -3]], clear.at).enters, false)
})

test('a place goes against a support whose clicked face (the one toward the spot) is visible', () => {
  const eye = [0.5, 65.62, 0.5]
  const w = world([...floor(63), [0, 64, -3]])
  const sup = S.supportsOf([0, 64, -2], w.at)
  assert.deepStrictEqual(sup.map((s) => s.pos), [[0, 63, -2], [0, 64, -3]])
  const r = S.bestOf(eye, sup, w.at)
  assert.ok(r.point)
  // the clicked face is the one toward the spot
  const n = r.target.faces[0]
  assert.deepStrictEqual([r.target.pos[0] + n[0], r.target.pos[1] + n[1], r.target.pos[2] + n[2]], [0, 64, -2])
})

test('standSpot: the nearest place to stand from which a hidden block is seen', () => {
  // the target sits behind a wall 2 high, 3 wide; from beside the wall it is in reach and in view
  const cells = [...floor(63), [0, 64, -3], [-1, 64, -2], [0, 64, -2], [1, 64, -2], [-1, 65, -2], [0, 65, -2], [1, 65, -2]]
  const w = world(cells)
  const t = [{ pos: [0, 64, -3] }]
  assert.strictEqual(S.bestOf([0.5, 65.62, 0.5], t, w.at).point, null)
  const s = S.standSpot([0.5, 64, 0.5], 1.62, t, w.at)
  assert.ok(s, 'a spot is found')
  assert.ok(Math.abs(s.feet[0] - 0.5) >= 2 || s.feet[2] <= -2.5, `the spot ${s.feet} is around the wall`)
})

// ---- the kit
const kit = (cells, stunt = {}) => {
  const W = new Set(cells.map((c) => c.join(',')))
  const marks = []
  const bot = {
    entity: { position: new Vec3(0.5, 64, 0.5), yaw: 0, pitch: 0, velocity: new Vec3(0, 0, 0) },
    controlState: {},
    look () {}, chat () {}, on () {}, removeListener () {}, swingArm () {},
    blockAt: (p) => { const k = `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`; return { name: W.has(k) ? 'stone' : 'air', position: new Vec3(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)), shapes: W.has(k) ? [[0, 0, 0, 1, 1, 1]] : [], boundingBox: W.has(k) ? 'block' : 'empty' } }
  }
  const ctx = { bot, stunt, tick: 0, Vec3, mark: (e, d) => marks.push([e, d]), log () {} }
  const K = storyKit(ctx, { line: () => ({ dur: 1 }), gap: 0.1 }, { X: 0, Z: 0, F: 63 })
  return { K, bot, marks }
}

test('K.reachSight: a dig aims at a visible point, and a hidden block throws naming it and where to stand', () => {
  const open = kit([...floor(63), [0, 64, -3]])
  const s = open.K.reachSight('K.dig', [{ pos: new Vec3(0, 64, -3) }])
  assert.ok(s.point)
  const hidden = kit([...floor(63), [0, 64, -3], [-1, 64, -2], [0, 64, -2], [1, 64, -2], [-1, 65, -2], [0, 65, -2], [1, 65, -2]])
  assert.throws(() => hidden.K.reachSight('K.dig', [{ pos: new Vec3(0, 64, -3) }]), /K\.dig: no face of stone at 0 64 -3 is visible.*stone at 0 6[45] -2 is in the way.*stand at/)
})

test('K.place marks the block it goes against (the floor under the spot), and an against block behind a wall throws', async () => {
  const k = kit(floor(63))
  k.bot.waitForTicks = async () => {}
  await k.K.place(new Vec3(0, 64, -2), 'oak_planks', { sound: null })
  const m = k.marks.find((x) => x[0] === 'place_on')
  assert.deepStrictEqual(m && [m[1].x, m[1].y, m[1].z, m[1].ax, m[1].ay, m[1].az], [0, 64, -2, 0, 63, -2])
  const w = kit([...floor(63), [0, 64, -4], [-1, 64, -3], [0, 64, -3], [1, 64, -3], [-1, 65, -3], [0, 65, -3], [1, 65, -3]])
  w.bot.waitForTicks = async () => {}
  // placing on the far side of the wall, against (0, 64, -4)'s south face: the wall hides it
  await assert.rejects(w.K.place(new Vec3(0, 65, -4), 'torch', { against: new Vec3(0, 64, -4) }), /K\.place: no face to place torch at 0 65 -4 against \(stone at 0 64 -4\) is visible.*is in the way.*stand at/)
})
