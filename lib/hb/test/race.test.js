// Format "race" (lib/race.js, r:rbe60ef): the edit block a race stunt gets, and the live score bar it draws
// (scripts/retention.py score_track / score_at / score_img)
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')
const { makeRace } = require('../../race')

const race = makeRace({ name: 'race_t', a: { block: 'grass_block', label: 'GRASS', color: 'green' }, b: { block: 'mycelium', label: 'MYCELIUM', color: 'purple' }, caption: 'x' })

test('a race starts on the race, plays the race sped up and its last-dirt hunt faster, and ends on a text payoff', () => {
  const e = race.edit
  assert.strictEqual(e.startAt, 'race_start:0')
  assert.deepStrictEqual(e.speed, [['race_start', 'last', 3], ['last', 'done', 6]])
  assert.strictEqual(e.endAfter, 'done:1.6')
  assert.ok(e.cards.some(c => c[0] === 'win_a' && c[1] === 'GRASS WINS') && e.cards.some(c => c[0] === 'win_b' && c[1] === 'MYCELIUM WINS'))
  assert.deepStrictEqual(e.keySounds, ['done'])
  assert.strictEqual(e.song, null)   // publish adds the NCS bed
})

test('the camera looks straight down with no drift (drift turned a top-down view\'s yaw), and both seeds are ringed in the frame', () => {
  const s = race.shots.top
  assert.strictEqual(s.drift, 0)
  assert.ok(s.at[1] > 40 && s.look[1] === 0)
  assert.strictEqual(race.edit.ring.length, 2)
  const [[, , ax, ay], [, , bx, by]] = race.edit.ring
  for (const v of [ax, ay, bx, by]) assert.ok(v > 0.05 && v < 0.98, `ring at ${v} is off the game view`)
  assert.ok(ax < 0.5 && ay < 0.5 && bx > 0.5 && by > 0.5)   // A top-left, B bottom-right
  assert.ok(ay > 0.19)   // below the score bar (the top ~19 % of the game view)
})

test('the score bar interpolates the marks and draws both sides', () => {
  const py = `
import sys; sys.path.insert(0, ${JSON.stringify(path.join(__dirname, '..', '..', '..', 'scripts'))})
import retention as r
tl = [{"event": "score", "t": 1000, "a": 0.1, "b": 0.2}, {"event": "score", "t": 3000, "a": 0.3, "b": 0.6}, {"event": "x", "t": 0}]
pts, sp = r.score_track({"event": "score", "a": ["GRASS", "green"], "b": ["MYCELIUM", "purple"]}, tl, 1.0)
assert [p[0] for p in pts] == [0.0, 2.0], pts
a, b = r.score_at(pts, 1.0); assert abs(a - 0.2) < 1e-9 and abs(b - 0.4) < 1e-9, (a, b)
assert r.score_at(pts, -5) == (0.1, 0.2) and r.score_at(pts, 9) == (0.3, 0.6)
im = r.score_img(sp, 30, 60)
px = im.getpixel((60, r.BAND + 22 + 120))      # the bar's left end: A's green
assert px[1] > 200 and px[0] < 150, px
px = im.getpixel((r.W - 60, r.BAND + 22 + 120))  # the right end: B's purple
assert px[2] > 200 and px[1] < 160, px
print("ok")
`
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stderr)
  assert.match(r.stdout, /ok/)
})
