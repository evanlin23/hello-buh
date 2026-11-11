// Boats, leads and passengers (docs/engine_features.md "Boats, leads and passengers"): the vanilla numbers in
// lib/riding.js (riders, lead ends, the rope mesh), the row planner in lib/boats.js and the motion check's mount rule.
const test = require('node:test')
const assert = require('node:assert')
const R = require('../../riding')
const { planRow, THRUST, FRICTION } = require('../../boats')
const MO = require('../motion')

const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e

test('riders sit where Entity.positionRider puts them (measured on the 1.21.11 server)', () => {
  const boat = { name: 'oak_boat', x: 10, y: 66.523, z: 5, yaw: 1.2 }
  // a villager alone: boat y + height / 3 (0.1875), no vehicle attachment (server: kid 66.7117 over boat 66.5242)
  assert.deepStrictEqual(R.riderPos(boat, { name: 'villager' }).map(v => +v.toFixed(4)), [10, 66.7105, 5])
  // a player: minus Player.DEFAULT_VEHICLE_ATTACHMENT 0.6 (server: Man 66.11076 over boat 66.52326)
  assert.ok(near(R.riderPos(boat, { name: 'player' })[1], 66.523 + 0.1875 - 0.6))
  // two riders: 0.2 forward and 0.6 back along the bow (+0.2 for an animal); yaw PI faces +z
  const b2 = { ...boat, yaw: Math.PI }
  assert.ok(near(R.riderPos(b2, { name: 'player' }, 0, 2)[2], 5.2))
  assert.ok(near(R.riderPos(b2, { name: 'villager' }, 1, 2)[2], 4.4))
  assert.ok(near(R.riderPos(b2, { name: 'pig' }, 1, 2)[2], 4.6))
  // a bamboo raft sits riders higher (height x 0.8888889)
  assert.ok(near(R.riderPos({ ...boat, name: 'bamboo_raft' }, { name: 'villager' })[1], 66.523 + 0.5625 * 0.8888889))
})

test('lead ends: the boat bow (0.88 h, 0.64 w), a player\'s right hand, a fence knot', () => {
  // facing +z (mineflayer yaw PI): the bow is 0.88 forward, 0.495 up
  const p = R.leashPoint({ name: 'oak_boat', x: 0, y: 64, z: 0, yaw: Math.PI })
  assert.ok(near(p[0], 0, 1e-9) && near(p[1], 64.495) && near(p[2], 0.88))
  // Player.getRopeHoldPosition facing +z: x - 0.22 (the right hand), 0.8 up, 0.07 forward; crouching 0.5 up, 0.2 back
  const h = R.ropeHold({ name: 'player', x: 0, y: 64, z: 0, yaw: Math.PI })
  assert.ok(near(h[0], -0.22) && near(h[1], 64.8) && near(h[2], 0.07))
  const c = R.ropeHold({ name: 'player', x: 0, y: 64, z: 0, yaw: Math.PI, extra: { sneak: true } })
  assert.ok(near(c[1], 64.5) && near(c[2], -0.2))
  // facing east (+x, mineflayer yaw -PI/2): the right hand is to the south (+z)
  const e = R.ropeHold({ name: 'player', x: 0, y: 64, z: 0, yaw: -Math.PI / 2 })
  assert.ok(near(e[0], 0.07) && near(e[2], 0.22))
  assert.deepStrictEqual(R.ropeHold({ name: 'leash_knot', x: 1.5, y: 64.375, z: 2.5 }), [1.5, 64.575, 2.5])
})

test('the rope: LeashFeatureRenderer\'s two ribbons of 24 segments, the sag, the shades', () => {
  const m = R.leashMesh([0, 64, 0], [4, 65, 0], [15, 0], [15, 0], () => [1, 1, 1])
  assert.strictEqual(m.pos.length / 9, 2 * 48)   // 50 vertices a ribbon as a strip: 48 triangles each
  // the holder above: the curve is flat at the leashed end (dy t^2): the middle sits 1/4 of the way up
  const ys = []
  for (let i = 0; i < m.pos.length; i += 3) if (near(m.pos[i], 2, 0.02)) ys.push(m.pos[i + 1])
  assert.ok(ys.some(y => near(y, 64.25, 0.06)), `mid-rope heights ${ys}`)
  // colours: (0.5, 0.4, 0.3) and x 0.7 on every other segment
  const reds = new Set(); for (let i = 0; i < m.col.length; i += 3) reds.add(+m.col[i].toFixed(2))
  assert.deepStrictEqual([...reds].sort(), [0.35, 0.5])
  // the light levels are lerped end to end
  const lit = R.leashMesh([0, 64, 0], [4, 64, 0], [0, 0], [15, 0], (s) => [s / 15, s / 15, s / 15])
  assert.ok(lit.col[0] < 0.05 && Math.max(...lit.col) > 0.45)
})

test('K.row plans a vanilla row: 0.4 top speed, eased start, a glide onto the last point, no snapped turns', () => {
  const r = planRow([5.2, 0.5], -90, [[9, 0.5], [16, -3], [24, 0], [32, -2]])
  const t = r.ticks, last = t[t.length - 1]
  assert.ok(near(last.x, 32, 0.05) && near(last.z, -2, 0.05), `ends at ${last.x}, ${last.z}`)
  const sp = t.map((q, i) => i ? Math.hypot(q.x - t[i - 1].x, q.z - t[i - 1].z) : Math.hypot(q.x - 5.2, q.z - 0.5))
  assert.ok(near(sp[0], THRUST, 1e-3), 'the first tick moves 0.04')
  assert.ok(Math.max(...sp) <= THRUST / (1 - FRICTION) + 1e-3, `top speed ${Math.max(...sp)}`)
  // oars out, then shipped for the glide (never back out)
  const off = t.findIndex(q => !q.paddle)
  assert.ok(off > 0 && t.slice(off).every(q => !q.paddle))
  // the bow turns at most 9 degrees a tick
  for (let i = 1; i < t.length; i++) assert.ok(Math.abs(t[i].yaw - t[i - 1].yaw) <= 9 + 1e-9)
  assert.ok(r.maxTurn < 9.5)
  // a slow row (o.speed) scales the thrust
  const slow = planRow([0, 0], -90, [[20, 0]], { speed: 0.2 }).ticks
  const v = Math.max(...slow.map((q, i) => i ? Math.hypot(q.x - slow[i - 1].x, q.z - slow[i - 1].z) : 0))
  assert.ok(v <= 0.2 + 1e-3 && v > 0.18)
})

test('the motion check: getting into a boat is vanilla\'s one-tick move, not a teleport', () => {
  // a player walks to the shore, then sits in a boat 1.6 blocks on and 0.9 down (the ride flag changes)
  const rows = []
  for (let k = 0; k < 10; k++) rows.push([k, 7, 'player', k * 0.2, 65, 0, 0, 0, null, null])
  for (let k = 10; k < 20; k++) rows.push([k, 7, 'player', 3.4, 64.1, 0, 0, 0, null, { ride: 9 }])
  const seen = () => 'seen'
  const opts = { seen }
  assert.strictEqual(MO.visibleJumps(rows, null, opts).length, 0)
  const noRide = MO.visibleJumps(rows.map(r => r.slice(0, 9).concat([null])), null, opts)
  assert.ok(noRide.some(f => f.kind === 'visible_jump'), 'the same jump without the ride flag is still caught')
})
