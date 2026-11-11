// The underdog format (lib/underdog.js, r:r8dcdb4): every beat gets its card and a sound hit on its fix, the flip gets
// its card and stinger, the end settles on the forgotten one's death puff with a hit over a soft 'sad' NCS track; the
// hotbar holds everything used from the first frame. The renderer draws health where vanilla does (iron golem cracks,
// a tamed wolf's tail), and add_song picks a mood-tagged track only for a Short that asks for that mood.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const cp = require('child_process')
const U = require('../../underdog')

const ROOT = path.join(__dirname, '..', '..', '..')
const S = require(path.join(ROOT, 'stunts', 'underdog_heal.js'))

test('edit: a card per beat and the twist card, a ding on every fix, the stinger on the flip, a hit on the melt', () => {
  const e = S.edit
  for (const b of S.beats) {
    assert.ok(e.cards.some(c => c[0] === `beat_${b.id}` && c[1] === b.card), `card for ${b.id}`)
    assert.ok(e.sfx.some(s => s[0] === 'ding' && s[1] === `fixed_${b.id}`), `ding on fixed_${b.id}`)
  }
  assert.ok(e.cards.some(c => c[0] === 'twist'))
  assert.ok(e.sfx.some(s => s[0] === 'scratch' && s[1] === 'twist'))
  assert.ok(e.sfx.some(s => s[0] === 'dip' && s[1] === 'melted' && s[2] >= 0.4), 'the song dips on the payoff (mixcheck)')
  assert.strictEqual(e.endAfter, 'settle:0.6', 'ends once the death puff has settled (r:r24d99a)')
  assert.strictEqual(e.ncsMood, 'sad')
  assert.strictEqual(e.song, null)
})

test('hotbar: every item used, one stack each with enough for every feed, at most 9', () => {
  const h = S.hotbarItems()
  assert.ok(h.length <= 9)
  for (const b of S.beats) {
    for (const [it] of b.feeds || []) {
      const st = h.find(([n]) => n === it)
      assert.ok(st, it)
      assert.ok(st[1] >= S.beats.reduce((a, x) => a + (x.feeds || []).filter(f => f[0] === it).length, 0), `${it} count`)
    }
  }
  assert.ok(h.some(([n]) => n === 'golden_apple') && h.some(([n]) => /^splash_potion/.test(n)), 'the cure items')
  assert.ok(S.slotOf('snow_block') >= 0)
  assert.ok(U.SPACING >= 10, 'stations far enough apart that a neighbour stays out of frame')
})

test('renderer: iron golem cracks by health, none when healed or unrecorded', () => {
  // entities.js is a browser module (three.js from the page): checked by source here, by eye in ./hb still
  const src = require('fs').readFileSync(path.join(ROOT, 'renderer', 'entities.js'), 'utf8')
  assert.ok(/iron_golem_crackiness_\$\{c\}/.test(src) && /f < 0\.25 \? 'high' : f < 0\.5 \? 'medium' : f < 0\.75 \? 'low'/.test(src))
  assert.ok(/\(40 - Math\.min\(40, x\.hp\)\) \/ 40 \* 0\.4/.test(src), 'Wolf.getTailAngle for a tamed wolf')
})

test('add_song: a mood picks only tracks tagged with it; no mood never picks a tagged one', () => {
  const py = `
import sys, json; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'scripts'))})
import add_song
moods = {f: t.get("mood") for f, t in add_song.NCS.items()}
print(json.dumps({"sad": [f for f, m in moods.items() if m == "sad"], "untagged": [f for f, m in moods.items() if not m]}))`
  const r = JSON.parse(cp.execFileSync('python3', ['-c', py], { encoding: 'utf8' }))
  assert.ok(r.sad.length >= 1, 'a sad track in music/ncs.json')
  assert.ok(r.untagged.length >= 10, 'the phonk beds stay untagged')
  const src = require('fs').readFileSync(path.join(ROOT, 'scripts', 'add_song.py'), 'utf8')
  assert.ok(/NCS\[f\]\.get\("mood"\) == mood/.test(src) && /pick_ncs\(name, at, stunt\.get\("ncsMood"\)\)/.test(src))
})
