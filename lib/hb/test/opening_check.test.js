// The opening check (owner r:r0f3da0, scripts/opening.py, run by ./hb pace): frame 0 not a flat view, motion by 0.5 s,
// a sound hit, the caption on frame 0, no still hold. Calibrated on the owner's 32 references and our weak/strong
// openers (lib/hb/test/fixtures/opening_calibration.json): scripts/test_opening.py.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const cp = require('child_process')
const ROOT = path.join(__dirname, '..', '..', '..')

test('python: the opening check keeps every reference and strong opener, blocks the flat weak ones (scripts/test_opening.py)', () => {
  const r = cp.spawnSync('python3', ['-m', 'unittest', 'scripts/test_opening.py'], { cwd: ROOT, encoding: 'utf8', timeout: 180000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})
