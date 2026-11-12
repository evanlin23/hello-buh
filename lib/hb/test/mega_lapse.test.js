// Mega build, time-lapse variant (lib/mega_lapse.js, r:r4449f0): cells compress to boxes that rebuild exactly those
// cells, the schedule keeps the server under its per-tick budget, every stage starts on its angle, and no stretch of
// the build goes without a new block (r:r478786).
const test = require('node:test')
const assert = require('node:assert')
const mega = require('../../mega')
const L = require('../../mega_lapse')

const paint = (boxes) => {
  const g = new Map()
  for (const { box: b, block } of boxes) for (let x = b[0]; x <= b[3]; x++) for (let y = b[1]; y <= b[4]; y++) for (let z = b[2]; z <= b[5]; z++) g.set(`${x},${y},${z}`, block)
  return g
}

test('runs: the boxes paint exactly the cells (the last cell at a spot wins), merged along x, z and y', () => {
  const cells = []
  for (let y = 0; y < 4; y++) for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) cells.push([x, y, z, 'stone'])
  cells.push([0, 2, 0, 'gold_block'])
  L.kit.ring(cells, 5, 6.5, 1, 'quartz_block')
  const boxes = mega.runs(cells)
  const want = new Map()
  for (const [x, y, z, b] of cells) want.set(`${x},${y},${z}`, b)
  assert.deepStrictEqual(paint(boxes), want)
  const solid = boxes.filter(b => b.block === 'stone')
  assert.ok(solid.length <= 6, `a 7x4x5 block with one cell swapped is a few boxes, got ${solid.length}`)
  for (const { box: b } of boxes) assert.ok((b[3] - b[0] + 1) * (b[4] - b[1] + 1) * (b[5] - b[2] + 1) <= mega.FILL_MAX)
})

test('a square ring layer is 4 boxes', () => {
  const boxes = L.kit.squareRing([], 9, 10, 3, 3, 'stone_bricks')
  assert.strictEqual(boxes.length, 4)
  const g = paint(boxes)
  assert.strictEqual(g.size, 21 * 21 - 17 * 17)
})

const S = {
  speed: 2, perTick: 10,
  stages: [
    { name: 'a', ticks: 10, cells: L.kit.ring([], 0, 4, 0, 'stone').map(c => [...c.slice(0, 4), Math.floor(Math.hypot(c[0], c[2]))]) },
    { name: 'b', ticks: 20, boxes: L.kit.squareRing([], 8, 9, 1, 12, 'stone_bricks') },
    { name: 'pay', ticks: 1, cells: [[0, 5, 0, 'gold_block']] }
  ],
  payoff: { stage: 'pay' }
}

test('the schedule: stage starts in recording ticks (output ticks x speed), the payoff whole on its tick, the budget kept', () => {
  const P = L.plan(S)
  assert.deepStrictEqual(P.stageAt, { a: 0, b: 20, pay: 60 })
  const pay = P.ticks.find(t => t.cmds.some(c => c[2] === 'pay'))
  assert.strictEqual(pay.tick, 60)
  for (const t of P.ticks) if (t !== pay) assert.ok(t.cmds.length <= 10)
  const sent = P.ticks.reduce((a, t) => a + t.cmds.length, 0)
  assert.strictEqual(sent, L.steps(S.stages[0]).flat().length + 12 * 4 + 1)
  // blocks keep landing: no gap over 1 s of output (S.speed x 20 recording ticks) before the payoff
  let last = 0
  for (const t of P.ticks) if (t.cmds.length) { assert.ok(t.tick - last <= 20 * S.speed, `gap ${last}..${t.tick}`); last = t.tick }
})

test('the episode: every angle starts on a stage, the payoff lands on the reveal, the server never gets over its budget', () => {
  const st = require('../../../stunts/mega_lapse_fountain')
  const P = st.lapsePlan
  const pay = P.stageAt.lights
  for (const t of P.ticks) if (t.tick !== pay) assert.ok(t.cmds.length <= 60, `tick ${t.tick}: ${t.cmds.length} commands`)
  let last = 0
  for (const t of P.ticks) if (t.cmds.length && t.tick <= pay) { assert.ok(t.tick - last <= 30, `no block ${last}..${t.tick}`); last = t.tick }
  assert.deepStrictEqual(st.edit.speed, [['build_start', 'reveal', 2]])
  for (const name of Object.keys(st.shots)) assert.ok(st.shots[name].path, name)
})

test('the blocks-used tally (r:rce78c5): each cell counted once, painted-over cells add nothing, it only rises', () => {
  const T = {
    speed: 1, perTick: 2,
    stages: [
      { name: 'a', ticks: 4, boxes: [{ box: [0, 1, 0, 2, 1, 2], block: 'stone', step: 1 }, { box: [0, 1, 0, 0, 1, 0], block: 'gold_block', step: 1 }, { box: [0, 2, 0, 1, 2, 0], block: 'stone', step: 2 }] },
      { name: 'pay', ticks: 1, boxes: [{ box: [5, 1, 5, 5, 3, 5], block: 'lantern' }, { box: [0, 1, 1, 0, 1, 1], block: 'air' }] }
    ],
    payoff: { stage: 'pay' }
  }
  const P = L.plan(T)
  assert.strictEqual(P.blocks, 9 + 2 + 3)
  let prev = 0
  for (const t of P.ticks) { assert.ok(t.count >= prev); prev = t.count }
  assert.strictEqual(P.ticks[P.ticks.length - 1].count, P.blocks)
})

test('the fox (r:rf8524b): hundreds of blocks across, the player in the field, a close pass after the reveal, the total on screen', () => {
  const st = require('../../../stunts/mega_lapse_fox')
  const P = st.lapsePlan
  const xs = P.ticks.flatMap(t => t.cmds.map(c => c[0])).flatMap(b => [b[0], b[3]])
  assert.ok(Math.max(...xs) - Math.min(...xs) >= 150, 'the build spans 150+ blocks')
  assert.ok(P.blocks > 200000, `${P.blocks} blocks`)
  for (const t of P.ticks) if (t.tick !== P.stageAt.face) assert.ok(t.cmds.length <= 60, `tick ${t.tick}`)
  let last = 0
  for (const t of P.ticks) if (t.cmds.length && t.tick <= P.stageAt.face) { assert.ok(t.tick - last <= 30, `no block ${last}..${t.tick}`); last = t.tick }
  assert.strictEqual(st.edit.endAfter, 'pass:0.8')
  assert.deepStrictEqual(st.edit.tally, { event: 'blocks', label: 'blocks used', done: 'reveal' })
  // the outro shots play at 1x: their keyframes are not stretched by the build's speed
  assert.strictEqual(st.shots.pass.path[1][0], 2.0)
  assert.strictEqual(st.shots.rise.path[1][0], 5.0)
  assert.strictEqual(st.edit.startAt, 'open:0')
})
