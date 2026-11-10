// A cut inside a line starts on at.cut(i) so the picture lands just before chunk i's first word, after its landing
// latency, and never inside the previous word (lib/story.js cutTick). Gold take 1: cuts on at(i) split 6 words.
const test = require('node:test')
const assert = require('node:assert')
const { cutTick } = require('../../story')

// L03 of Gold: 'Some OBSIDIAN.' 0.105-0.9, 'A little STRING.' 1.16-2.0, 'Ender PEARLS.' 2.26-3.0, 'A FIREPROOF potion.' 3.24-4.3
const CH = [[0.105, 0.9], [1.16, 2.0], [2.26, 3.0], [3.24, 4.3]]

test('cutTick: lands lead seconds before the word, earlier by the landing latency', () => {
  const t = cutTick(CH, 3, 0.033, 0)
  assert.ok(t / 20 <= 3.24 - 0.033 && t / 20 > 3.24 - 0.033 - 0.05)   // within one tick before the target
  const wide = [[0.1, 1.0], [2.0, 3.0]]                                  // a 1 s pause: room for the latency
  assert.strictEqual(cutTick(wide, 1, 0.033, 4), cutTick(wide, 1, 0.033, 0) - 4)   // 4 ticks to land: start 4 earlier
  assert.ok(cutTick(CH, 3, 0.033, 4) < Math.round(3.24 * 20))           // at(3) alone would be too late
  assert.strictEqual(cutTick(CH, 3, 0.033, 4), Math.ceil((3.0 + 0.03) * 20))   // ...but not inside 'PEARLS.' 
})

test('cutTick: never before the previous word has ended (+30 ms), never negative, k clamped', () => {
  const tight = [[0.1, 1.0], [1.05, 1.6]]                                // a 50 ms gap: the floor wins
  assert.strictEqual(cutTick(tight, 1, 0.033, 4), Math.ceil((1.0 + 0.03) * 20))
  assert.strictEqual(cutTick(CH, 0, 0.033, 4), 0)
  assert.strictEqual(cutTick(CH, 9, 0.033, 0), cutTick(CH, 3, 0.033, 0))
})
