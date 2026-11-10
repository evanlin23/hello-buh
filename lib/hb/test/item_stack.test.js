'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { renderedAmount, stackOffsets } = require('../../item_stack')

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
