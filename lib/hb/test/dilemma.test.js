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

test('slowmo: one window per beat, starting on its own mark, lasting its ticks', () => {
  assert.deepStrictEqual(D.slowmo(BEATS), [['beat0', 0, 0.2999, 0.12], ['beat1', 0, 0.1999, 0.1], ['beat2', 0, 0.1499, 0.06]])
  assert.ok(Math.abs(D.screenSeconds(BEATS) - (2.5 + 2 + 2.5)) < 1e-9)
})

test('edit: choice cards on the first beats, the twist card + flash on the reveal, the hit on the landing, hardcore HUD', () => {
  const e = D.edit({ beats: BEATS, caption: 'x', start: 'drop:-0.2', choices: [['HIT', 'green'], ['DIE', 'red']], land: 'land', reveal: 'rv', card: ['TWIST', 'blue'], hardcore: true, armor: 16 })
  assert.strictEqual(e.endAfter, 'rv:1.5')
  assert.strictEqual(e.startAt, 'drop:-0.2')
  assert.deepStrictEqual(e.cards, [['beat0', 'HIT', 2.5, 'green'], ['beat1', 'DIE', 2, 'red'], ['rv', 'TWIST', 1.6, 'blue']])
  assert.deepStrictEqual(e.flash, ['rv'])
  assert.ok(e.sfx.some(s => s[0] === 'impact' && s[1] === 'land'))
  assert.ok(e.sfx.some(s => s[0] === 'dip' && s[1] === 'rv'))
  assert.ok(e.sfx.some(s => s[0] === 'impact' && s[1] === 'rv'), 'the twist lands on a sound hit (pace)')
  assert.strictEqual(e.sfx.filter(s => s[0] === 'heart').length, BEATS.length)
  assert.strictEqual(e.hardcore, true)
  assert.strictEqual(e.armor, 16)
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
