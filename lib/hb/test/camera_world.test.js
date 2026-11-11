// camera_world (docs/engine_features.md "Flying-mob POV, the crane, the Nether"): the flight planner and hover bob of
// lib/mobpov.js, the Nether in lib/world.js (dimension in check / at), lib/sets/site.js reading ground under a roof.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { flightPlan, hoverSpec, hoverAt, HOVER } = require('../../mobpov')

const D = 180 / Math.PI
const step = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)

test('flightPlan: through every point, ends on the last, never faster than its speed', () => {
  const pts = [{ x: -10, y: 2, z: -5 }, { x: -20, y: 2, z: 5 }, { x: -30, y: 2, z: 0 }]
  const p = flightPlan({ x: 0, y: 2, z: 0 }, pts, { speed: 0.5, accel: 6, decel: 6 })
  const last = p.ticks[p.ticks.length - 1]
  assert.ok(step(last, pts[2]) < 1e-6)
  for (const q of pts.slice(0, 2)) assert.ok(Math.min(...p.ticks.map(t => step(t, q))) < 0.3, 'passes near each middle point')
  let prev = { x: 0, y: 2, z: 0 }, maxv = 0
  for (const t of p.ticks) { maxv = Math.max(maxv, step(prev, t)); prev = t }
  assert.ok(maxv <= 0.5 + 1e-3, `max step ${maxv}`)
  // eased: the first and last steps are small
  assert.ok(step({ x: 0, y: 2, z: 0 }, p.ticks[0]) < 0.15)
  assert.ok(step(p.ticks[p.ticks.length - 2], last) < 0.2)
})

test('flightPlan: the view looks ahead along the curve and its peak turn is reported', () => {
  // a straight line north: yaw 0 (mineflayer: 0 = north), no turn at all
  const s = flightPlan({ x: 0, y: 2, z: 0 }, [{ x: 0, y: 2, z: -20 }], { speed: 0.5 })
  for (const t of s.ticks) assert.ok(Math.abs(t.yaw) < 1e-9 && Math.abs(t.pitch) < 1e-9)
  assert.ok(s.peakTurn < 1e-6)
  // a right-angle bend flown fast turns hard; wide and slow turns gently
  const tight = flightPlan({ x: 0, y: 2, z: 0 }, [{ x: 0, y: 2, z: -6 }, { x: -6, y: 2, z: -6 }], { speed: 0.8, lead: 1 })
  const wide = flightPlan({ x: 0, y: 2, z: 0 }, [{ x: 0, y: 2, z: -20 }, { x: -20, y: 2, z: -20 }], { speed: 0.4, lead: 4 })
  assert.ok(tight.peakTurn > wide.peakTurn * 2, `${tight.peakTurn} vs ${wide.peakTurn}`)
  assert.ok(wide.peakTurn < 150)
})

test('flightPlan: a look target, a blended start and a joining speed', () => {
  const giant = { x: 10, y: 3.4, z: -30 }
  const p = flightPlan({ x: 0, y: 2, z: 0 }, [{ x: 4, y: 2, z: -20 }], { speed: 0.4, look: giant, yaw0: Math.PI / 2, pitch0: 0, blend: 10, v0: 0.4, accel: 10 })
  const t = p.ticks[p.ticks.length - 1]
  assert.ok(Math.abs(t.yaw - Math.atan2(-(giant.x - t.x), -(giant.z - t.z))) < 1e-9, 'ends looking at him')
  assert.ok(Math.abs(p.ticks[0].yaw - Math.PI / 2) < 0.1, 'starts from the view it had')
  assert.ok(step({ x: 0, y: 2, z: 0 }, p.ticks[0]) > 0.35, 'already at speed (v0)')
})

test('flightPlan: above keeps it over the ground, lifting before a rise', () => {
  const groundAt = (x) => (x < -15 ? 6 : 1)   // a 5-block rise at x -15
  const p = flightPlan({ x: 0, y: 2.5, z: 0 }, [{ x: -30, y: 2.5, z: 0 }], { speed: 0.5, above: 1.5, lead: 4 }, groundAt)
  for (const t of p.ticks) assert.ok(t.y >= groundAt(t.x) + 0.4, `at x ${t.x.toFixed(1)} y ${t.y.toFixed(2)} skims the ground`)
  assert.ok(Math.abs(p.ticks[0].y - 2.5) < 0.6 && Math.abs(p.ticks[p.ticks.length - 1].y - 7.5) < 1e-6)
  let mx = 0; for (let i = 1; i < p.ticks.length; i++) mx = Math.max(mx, Math.abs(p.ticks[i].y - p.ticks[i - 1].y))
  assert.ok(mx < 1.0, `the climb is spread (max ${mx.toFixed(2)} a tick)`)
})

test('hover: the vanilla bee bob (BeeModel: cos(age x 0.18) x 0.9 px), ramped in, scaled', () => {
  assert.strictEqual(HOVER.bee.rate, 0.18)
  assert.ok(Math.abs(HOVER.bee.amp - 0.9 / 16) < 1e-12)
  const h = hoverSpec('bee', { scale: 1, nod: 1, drift: 0, t0: 100 })
  for (const v of Object.values(hoverAt(h, 100))) assert.ok(Math.abs(v) < 1e-12)   // nothing on the first tick
  const ys = []; for (let k = 120; k < 160; k++) ys.push(hoverAt(h, k).y)
  assert.ok(Math.abs(Math.max(...ys) - 0.9 / 16) < 0.003 && Math.abs(Math.min(...ys) + 0.9 / 16) < 0.003)
  // the period: 2 PI / 0.18 = 34.9 ticks
  assert.ok(Math.abs(hoverAt(h, 130).y - hoverAt(h, 130 + 2 * Math.PI / 0.18).y) < 1e-9)
  const def = hoverSpec('bee', { t0: 0 })
  assert.ok(Math.abs(def.amp - 1.6 * 0.9 / 16) < 1e-12 && def.nod < HOVER.bee.nod)
  let mx = 0; for (let k = 1; k < 200; k++) mx = Math.max(mx, Math.abs(hoverAt(def, k).pitch - hoverAt(def, k - 1).pitch) * 20 * D)
  assert.ok(mx < 20, `the nod turns at most ${mx.toFixed(1)} deg/s`)
  assert.throws(() => hoverSpec('ghast'))
})

test('world: a Nether place clashes only with the Nether; at() and where in a dimension', () => {
  const world = require('../../world')
  const M = { seed: 's', places: {
    a: { name: 'A', at: [0, 70, 0], footprint: [-10, -10, 10, 10] },
    n: { name: 'N', at: [0, 80, 0], footprint: [-10, -10, 10, 10], dimension: 'the_nether' },
    n2: { name: 'N2', at: [5, 80, 5], footprint: [0, 0, 12, 12], dimension: 'minecraft:the_nether' },
    bad: { name: 'B', at: [500, 70, 500], footprint: [490, 490, 510, 510], dimension: 'the_moon' }
  }, stories: {}, cameos: {} }
  const errs = world.check(M)
  assert.ok(!errs.some(e => /^a and n:|^n and a:/.test(e)), errs.join('\n'))
  assert.ok(errs.some(e => /n and n2: footprints overlap/.test(e)), errs.join('\n'))
  assert.ok(errs.some(e => /bad: dimension must be one of/.test(e)))
  assert.strictEqual(world.dimName('minecraft:the_nether'), 'the_nether')
  assert.strictEqual(world.dimName(undefined), 'overworld')
  // the fixture map (stunts/_test_camera_world_nether.js) is valid
  const fx = require('./fixtures/world_nether_map.json')
  assert.deepStrictEqual(world.check(fx), [])
  assert.strictEqual(fx.places.portal_cottage_nether.dimension, 'the_nether')
})

test('world.at: the real map, Overworld by default; a Nether point finds no Overworld place', () => {
  const world = require('../../world')
  const M = world.loadMap(true)
  const [k, p] = Object.entries(M.places).find(([, p]) => p.footprint && p.kind !== 'region')
  const x = Math.round((p.footprint[0] + p.footprint[2]) / 2), z = Math.round((p.footprint[1] + p.footprint[3]) / 2)
  assert.ok(world.at(x, z))
  assert.strictEqual(world.at(x, z, 'the_nether'), null, `${k}'s spot in the Nether is no place`)
})

test('sets ground under a roof: the first floor with open space over it', () => {
  const site = require('../../sets/site')
  const { Vec3 } = require('vec3')
  // a column: bedrock roof 123-127, netherrack 100-122, air 82-99, netherrack shelf 70-81, lava 60-69
  const at = (y) => y > 127 ? 'air' : y >= 123 ? 'bedrock' : y >= 100 ? 'netherrack' : y >= 82 ? 'air' : y >= 70 ? 'netherrack' : y >= 60 ? 'lava' : 'netherrack'
  const bot = { blockAt: (v) => { const n = at(v.y); return { name: n, boundingBox: n === 'air' || n === 'lava' ? 'empty' : 'block' } } }
  const ctx = { bot, Vec3, groundTop: 104 }
  assert.strictEqual(site.ground(ctx, { x0: 0, x1: 0, z0: 0, z1: 0 }), 81)
  delete ctx.groundTop
  assert.strictEqual(site.ground(ctx, { x0: 0, x1: 0, z0: 0, z1: 0 }), 127, 'without groundTop: the old top-down reading (the roof)')
})

test('the test map path is overridable (HB_WORLD_MAP) and the default is docs/world/map.json', () => {
  const world = require('../../world')
  if (!process.env.HB_WORLD_MAP) assert.strictEqual(world.MAP_FILE, path.join(__dirname, '..', '..', '..', 'docs', 'world', 'map.json'))
})
