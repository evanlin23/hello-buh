'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { renderedAmount, stackOffsets, droppedItemForm } = require('../../item_stack')

test('vanilla getRenderedAmount: 1 / 2 / 3 / 4 / 5 copies', () => {
  assert.deepStrictEqual([undefined, 1, 2, 16, 17, 32, 33, 48, 49, 64].map(renderedAmount), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
})

test('one item (or an old recording with no count) draws exactly as before: no offsets', () => {
  assert.strictEqual(stackOffsets(undefined, 7), null)
  assert.strictEqual(stackOffsets(1, 7), null)
})

test('a flat stack fans out along its depth, centred, 0.09375 x scale apart; the first copy is not jittered', () => {
  const o = stackOffsets(64, 42, [0.5, 0.5, 0.5])
  assert.strictEqual(o.length, 5)
  assert.deepStrictEqual(o[0].slice(0, 2), [0, 0])
  for (let i = 1; i < 5; i++) assert.ok(Math.abs(o[i][2] - o[i - 1][2] - 0.046875) < 1e-3)
  assert.ok(Math.abs(o[0][2] + o[4][2]) < 1e-3, 'centred')
  for (const p of o) assert.ok(Math.abs(p[0]) <= 0.0375 + 1e-9 && Math.abs(p[1]) <= 0.0375 + 1e-9)
})

test('deterministic per entity, different between entities', () => {
  assert.deepStrictEqual(stackOffsets(20, 5), stackOffsets(20, 5))
  assert.notDeepStrictEqual(stackOffsets(20, 5), stackOffsets(20, 6))
})

test('dropped items are the upright model for every recording, older ones too (fortune: "The items are all upsidedown??", r:r52f94c)', () => {
  // vanilla ItemEntityRenderer never billboards: a flat item is its extruded model with the ground display (upright,
  // spinning about y), a block item a small block, a bed/chest its block-entity model
  assert.strictEqual(droppedItemForm({ sprite: true, env: {} }), 'model')
  assert.strictEqual(droppedItemForm({ sprite: true, env: { MOTION_FIXES: '0' } }), 'model', 'no longer gated on the motion fixes')
  assert.strictEqual(droppedItemForm({ sprite: false, special: true, env: {} }), 'special')
  assert.strictEqual(droppedItemForm({ sprite: false, block: true, env: {} }), 'block')
  assert.strictEqual(droppedItemForm({ sprite: false, env: {} }), 'hidden')
  assert.strictEqual(droppedItemForm({ sprite: true, env: { DROPPED_MODEL: '0' } }), 'sprite', 'the escape hatch')
})

test('render.js draws dropped items through droppedItemForm, not behind MOTION_FIXES; item sprites are flipped upright always', () => {
  const fs = require('fs'), path = require('path')
  const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'render.js'), 'utf8')
  assert.ok(/droppedItemForm\(\{ sprite: !!spriteOf\(it\) \}\) === 'model'/.test(src))
  assert.ok(!/spriteOf\(it\) && MOTION_FIXES/.test(src), 'the dropped model must not depend on the recording\'s engine')
  const ent = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'renderer', 'entities.js'), 'utf8')
  assert.ok(!/if \(this\.motionFixes\) obj\.scale\.y \*= -1/.test(ent), 'the sprite flip must not depend on the motion fixes')
})
