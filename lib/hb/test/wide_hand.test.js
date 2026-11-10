'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { handX, wideHandX, restPixels } = require('../../wide_hand')

test('a 16:9 or wider frame keeps vanilla (handX 1); the Short game view moves it in', () => {
  assert.strictEqual(handX(1920, 1080), 1)
  assert.ok(handX(1797, 1011) > 0.999)   // 1797 = round(1011 * 16 / 9)
  assert.ok(Math.abs(handX(1080, 1011) - 0.6008) < 1e-3)
})

test('published recordings (no wideHand flag) keep the master placement: null', () => {
  assert.strictEqual(wideHandX({ outW: 1080, masterW: 1797, H: 1011, rec: { engine: 2 } }), null)
  assert.strictEqual(wideHandX({ outW: 1080, masterW: 1797, H: 1011, rec: { engine: 3 }, stunt: { wideMaster: true } }), null)
})

test('no wide master: nothing changes, flag or not', () => {
  assert.strictEqual(wideHandX({ outW: 1080, masterW: 1080, H: 1011, rec: { wideHand: true } }), null)
})

test('flagged recordings, stunt.wideHand and WIDE_HAND=1 turn it on; WIDE_HAND=0 turns it off', () => {
  const x = handX(1080, 1011)
  assert.strictEqual(wideHandX({ outW: 1080, masterW: 1797, H: 1011, rec: { wideHand: true } }), x)
  assert.strictEqual(wideHandX({ outW: 1080, masterW: 1797, H: 1011, stunt: { wideHand: true } }), x)
  assert.strictEqual(wideHandX({ outW: 1080, masterW: 1797, H: 1011, env: { WIDE_HAND: '1' } }), x)
  assert.strictEqual(wideHandX({ outW: 1080, masterW: 1797, H: 1011, rec: { wideHand: true }, env: { WIDE_HAND: '0' } }), null)
})

test('the fix puts the hand on the same pixel as a render at the output size, inside the crop', () => {
  const out = restPixels(handX(1080, 1011), 1080, 1011)     // a plain 1080x1011 render
  const fixed = restPixels(handX(1080, 1011), 1797, 1011)  // the wide master with the output's handX
  const old = restPixels(handX(1797, 1011), 1797, 1011)    // the wide master before the fix
  assert.ok(Math.abs(out - fixed) < 1e-6)
  assert.ok(fixed < 540 - 150, `rest point ${fixed.toFixed(0)} px from the centre: well inside the 540 px half-crop`)
  assert.ok(old > 540 - 60, `before the fix the rest point sat ${old.toFixed(0)} px out: at the crop's edge`)
})
