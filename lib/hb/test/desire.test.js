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

test('desire_town: every round moves the path, the flood brings it back straight', () => {
  const rounds = require('../../../stunts/desire_town').rounds
  const sim = D.simulate(rounds)
  assert.strictEqual(sim.length, rounds.length + 1)
  for (const r of sim.slice(1)) {
    assert.ok(r.path, `${r.id}: no way round`)
    assert.ok(r.moved >= 4, `${r.id} moved only ${r.moved} cells`)
    if (r.blocks) for (const [x, z] of r.path.cells) assert.ok(!r.blocks.some(b => b[0] === x && b[2] === z), `${r.id}: path through it`)
  }
  assert.strictEqual(sim[sim.length - 1].path.poly.length, 2, 'straight across the flood')
})
