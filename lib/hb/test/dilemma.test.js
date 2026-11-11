// The dilemma format (lib/dilemma.js): the slow beats become back-to-back slow-motion windows, one camera shot each,
// marked on the server's ticks; the edit block carries the choice cards, the twist card and the hardcore HUD; and
// edit.py draws hardcore hearts and the armour row when asked.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const cp = require('child_process')
const D = require('../../dilemma')

const ROOT = path.join(__dirname, '..', '..', '..')
const BEATS = [{ shot: 'a', ticks: 6, factor: 0.12 }, { shot: 'b', ticks: 4, factor: 0.1 }, { shot: 'c', ticks: 3, factor: 0.06 }]

test('spans: one slow span per beat, mark to mark (the last to beats_end)', () => {
  assert.deepStrictEqual(D.spans(BEATS), [['beat0', 'beat1', 0.12], ['beat1', 'beat2', 0.1], ['beat2', 'beats_end', 0.06]])
  assert.ok(Math.abs(D.screenSeconds(BEATS) - (2.5 + 2 + 2.5)) < 1e-9)
})

test('edit: choice cards on the first beats, the twist card + flash on the reveal, the hit on the landing, hardcore HUD', () => {
  const e = D.edit({ beats: BEATS, caption: 'x', start: 'drop:-0.2', choices: [['HIT', 'green'], ['DIE', 'red']], land: 'land', reveal: 'rv', card: ['TWIST', 'blue'], hardcore: true, armor: 16 })
  assert.strictEqual(e.endAfter, 'rv:1.5')
  assert.strictEqual(e.startAt, 'drop:-0.2')
  assert.deepStrictEqual(e.cards, [['beat0', 'HIT', 2.5, 'green'], ['beat1', 'DIE', 2, 'red'], ['rv', 'TWIST', 1.6, 'blue']])
  assert.deepStrictEqual(e.flash, ['rv'])
  assert.ok(e.sfx.some(s => s[0] === 'dip' && s[1] === 'land'))
  assert.ok(!e.sfx.some(s => s[0] === 'impact' && s[1] === 'land'), 'no boom tail into the reveal\'s dip')
  assert.ok(e.sfx.some(s => s[0] === 'dip' && s[1] === 'rv'))
  assert.ok(e.sfx.some(s => s[0] === 'impact' && s[1] === 'rv' && s[2].gain >= 1.4), 'the twist lands on a loud hit (pace, over the NCS bed)')
  assert.ok(e.sfx.some(s => s[0] === 'dip' && s[1] === 'rv' && s[2] >= 0.4))
  assert.strictEqual(e.dropAt, 'rv')
  assert.strictEqual(e.sfx.filter(s => s[0] === 'heart').length, BEATS.length)
  assert.strictEqual(e.hardcore, true)
  assert.strictEqual(e.armor, 16)
  assert.deepStrictEqual(e.speed, D.spans(BEATS))
  assert.deepStrictEqual(e.slowmo, [], 'an empty slowmo key: finish_render.sh runs the real-frame pass for the speed spans')
})

test('runBeats until(): the freeze ends early, the beats left are marked on that tick, no shot switch', async () => {
  const marks = []
  let tick = 0
  const ctx = { stunt: { shots: { a: {}, b: {}, c: { pov: true } } }, mark: (ev, x = {}) => marks.push([tick, ev, x.name || '']), bot: { waitForTicks: async (n) => { tick += n } }, log: () => {} }
  await D.runBeats(ctx, BEATS, null, { until: () => tick >= 8 })
  assert.deepStrictEqual(marks.filter(m => /^beat\d$|^beats_end$/.test(m[1])).map(m => [m[0], m[1]]), [[0, 'beat0'], [6, 'beat1'], [8, 'beat2'], [8, 'beats_end']])
  assert.deepStrictEqual(marks.filter(m => m[1] === 'shot').map(m => m[2]), ['a', 'b'])
})

test('edit.py: with a real slow-motion pass every in-between frame comes from it (no hold, no snap back at a span end)', () => {
  const src = require('fs').readFileSync(path.join(ROOT, 'edit.py'), 'utf8')
  assert.match(src, /mid = \(frac > 1e-6 and 1 - frac > 1e-6\) if slow_fps else \(0\.2 < frac < 0\.8\)/)
})

test('runBeats: marks beat<i> and its shot on the tick each beat starts', async () => {
  const marks = []
  let tick = 0
  const ctx = { stunt: { shots: { a: {}, b: {}, c: { pov: true } } }, mark: (ev, x = {}) => marks.push([tick, ev, x.name || x.shot || '']), bot: { waitForTicks: async (n) => { tick += n } }, log: () => {} }
  await D.runBeats(ctx, BEATS)
  const beats = marks.filter(m => /^beat\d$/.test(m[1])).map(m => [m[0], m[1]])
  assert.deepStrictEqual(beats, [[0, 'beat0'], [6, 'beat1'], [10, 'beat2']])
  assert.deepStrictEqual(marks.filter(m => m[1] === 'shot').map(m => m[2]), ['a', 'b', 'c'])
  assert.deepStrictEqual(marks.filter(m => /^beat\dh$/.test(m[1])).map(m => m[0]), [3, 8, 11])   // each beat's middle (its heartbeat)
  assert.deepStrictEqual(marks[marks.length - 1].slice(0, 2), [13, 'beats_end'])
})

test('edit_args passes hardcore and armor to edit.py; edit.py draws the hardcore hearts and the armour row', () => {
  const args = cp.execFileSync('node', ['scripts/edit_args.js', 'dilemma_mace'], { cwd: ROOT, encoding: 'utf8' }).split('\n')
  assert.ok(args.includes('--hardcore'))
  assert.strictEqual(args[args.indexOf('--armor') + 1], '16')
  const py = `
import sys, zipfile, tempfile, os, edit
from PIL import Image
if not edit.CLIENT_JAR.exists(): print('skip'); sys.exit(0)
jar = zipfile.ZipFile(edit.CLIENT_JAR)
def hud(hc, arm, p):
    edit.HUD_STYLE.update(hardcore=hc, armor=arm)
    edit.hud_png(jar, 0, [('mace', 1)], 20, p)
    return Image.open(p).convert('RGBA')
d = tempfile.mkdtemp()
a, b, c = (hud(h, n, os.path.join(d, f'{k}.png')) for k, (h, n) in enumerate([(False, 0), (True, 0), (True, 16)]))
print('hearts', a.tobytes() != b.tobytes(), 'armor', b.tobytes() != c.tobytes())
`
  const out = cp.execFileSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' }).trim()
  if (out === 'skip') return
  assert.match(out, /hearts True armor True/)
})

test('edit.py: a real slow-motion frame takes the sequence\'s pixel format (no ffmpeg re-init dropping the overlays)', () => {
  const src = require('fs').readFileSync(path.join(ROOT, 'edit.py'), 'utf8')
  assert.match(src, /im\.convert\(seq_mode\)/)
})
