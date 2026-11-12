// The dwell check (scripts/dwell.py, owner r:r188b46 2026-11-11: "we blow up the TNT, wait for what feels like forever,
// then we cut... boom, boom, boom, fast pace"): pace warns on a result held over 1.0 s with nothing new, and on an end
// over 0.9 s after the payoff's result (a blocker over 1.2 s); smoke and particles never hold a cut.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')
const ROOT = path.join(__dirname, '..', '..', '..')

test('the Python side: dwell beats, busy, thresholds (scripts/test_dwell.py)', () => {
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_dwell.py'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 })
  assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''))
})

test('pace runs the dwell check (its own module, so the opening check and others merge cleanly)', () => {
  const src = require('fs').readFileSync(path.join(ROOT, 'scripts', 'pace.py'), 'utf8')
  assert.match(src, /import dwell as DW/)
  assert.match(src, /add\(lvl, "dwell"/)
})
