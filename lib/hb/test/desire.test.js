// lib/desire.js (format "desire", r:r2e0a32): the path planner and the round choreography, without a server.
const test = require('node:test')
const assert = require('node:assert')
const D = require('../../desire')

const K = (x, z) => `${x},${z}`

test('the first path runs straight from door to door, on grass only', () => {
  const p = D.plan(new Set())
  assert.strictEqual(p.poly.length, 2)
  assert.deepStrictEqual(p.poly[0], D.HOUSES[0].out)
  assert.deepStrictEqual(p.poly[1], D.HOUSES[1].out)
  assert.ok(p.cells.length > 20)
  for (const [x, z] of p.cells) assert.ok(!D.ROAD(x, z) && !D.inHouse(x, z), `path cell ${x},${z} on the road or a house`)
})

test('the path bends round an obstacle and never crosses it', () => {
  const blocked = new Set()
  for (let x = -7; x <= -2; x++) blocked.add(K(x, -5))
  const p = D.plan(blocked)
  assert.ok(p.poly.length > 2, 'it bends')
  for (const [x, z] of p.cells) assert.ok(!blocked.has(K(x, z)), `path on the obstacle at ${x},${z}`)
})

test('cells come in walking order (the path wears in from the first door)', () => {
  const p = D.plan(new Set())
  const d0 = (c) => Math.hypot(c[0] - D.HOUSES[0].out[0], c[1] - D.HOUSES[0].out[1])
  assert.ok(d0(p.cells[0]) < d0(p.cells[p.cells.length - 1]))
})

test('cutThrough: only blocks on the path, above ground to air, the ground row to path, a pond floor to dirt', () => {
  const cells = [[0, 0], [1, 1]]
  const cut = D.cutThrough([[0, 1, 0, 'oak_fence'], [0, 2, 0, 'oak_fence'], [5, 1, 5, 'stone'], [1, 0, 1, 'water'], [1, -1, 1, 'water'], [1, -1, 0, 'stone']], cells)
  assert.deepStrictEqual(cut.map(b => [b.x, b.y, b.z, b.to]), [[0, 2, 0, 'air'], [0, 1, 0, 'air'], [1, 0, 1, 'dirt_path'], [1, -1, 1, 'dirt']])
})

test('desire_town: every obstacle lands on the path and is broken through (r:r81cb9c)', () => {
  const rounds = require('../../../stunts/desire_town').rounds
  const sim = D.simulate(rounds)
  assert.strictEqual(sim.length, rounds.length + 1)
  for (const r of sim.slice(1)) {
    if (r.flood) continue
    assert.ok(r.cut.length >= 4, `${r.id}: only ${r.cut.length} blocks broken through`)
    assert.ok(r.blocks.length > r.cut.length, `${r.id}: nothing left standing beside the path`)
  }
  assert.strictEqual(sim[sim.length - 1].path.poly.length, 2, 'the path stays straight, door to door')
})
