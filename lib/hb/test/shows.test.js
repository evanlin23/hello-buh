// Everything the narration names is on screen while it's said (owner 2026-11-11, r:r65ef27: "when we say "string"
// in the piglin short, no string is on screen"). lib/hb/owner.js reads story.json lines[].shows and BLOCKs a named
// item, block or mob that isn't in frame (dropped, worn or held, in the first-person hand, or in an open container).
const test = require('node:test')
const assert = require('node:assert')
const { showsSpec, showsChunk, shownBy, showsMissed } = require('../owner')

test('a shows entry: an id, alternatives, and the word that says it', () => {
  assert.deepStrictEqual(showsSpec('string').names, ['string'])
  assert.strictEqual(showsSpec('ender_pearl').word, 'ender pearl')
  const g = showsSpec({ what: ['minecraft:gold_ingot', 'gold_block'], word: 'GOLD' })
  assert.deepStrictEqual(g.names, ['gold_ingot', 'gold_block']); assert.strictEqual(g.word, 'gold')
})

test('the chunk that names it: its word, else a part of its id', () => {
  const chunks = ['Some OBSIDIAN.', 'A little STRING.', 'Ender PEARLS.', 'A FIREPROOF potion.']
  assert.strictEqual(showsChunk(chunks, showsSpec('string')), 1)
  assert.strictEqual(showsChunk(chunks, showsSpec('ender_pearl')), 2)   // 'ender' / 'pearl' in the chunk
  assert.strictEqual(showsChunk(chunks, showsSpec({ what: 'potion', word: 'FIREPROOF' })), 3)
  assert.strictEqual(showsChunk(chunks, showsSpec('piglin')), -1)       // not named in this line: the whole line
})

test('a moment shows it: in the first-person hand, in an open container, or in frame', () => {
  const names = ['string'], no = () => false
  assert.strictEqual(shownBy({ names, pov: true, held: 'string', gui: null, visible: no }), true)
  assert.strictEqual(shownBy({ names, pov: false, held: 'string', gui: null, visible: no }), false)   // a camera shot: the hand isn't the view
  assert.strictEqual(shownBy({ names, pov: true, held: null, gui: ['obsidian', 'string'], visible: no }), true)
  assert.strictEqual(shownBy({ names, pov: true, held: null, gui: null, visible: () => true }), true)
  assert.strictEqual(shownBy({ names, pov: true, held: 'obsidian', gui: ['gravel'], visible: no }), false)
})

test('a BLOCK when it is missing for more than half of its words', () => {
  assert.strictEqual(showsMissed(2, 5), true)    // "A little STRING" with the string picked up 0.6 s in
  assert.strictEqual(showsMissed(3, 5), false)
  assert.strictEqual(showsMissed(0, 2), false)   // too short to judge
})
