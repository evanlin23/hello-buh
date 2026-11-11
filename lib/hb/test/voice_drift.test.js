// voice_drift (./hb drift): a one_take request's lines warn on WOBBLE / OFFREF instead of blocking; lines from
// different requests keep every rule. The python tests are scripts/test_voice_drift.py.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')

test('python: one_take lines warn, other requests block (scripts/test_voice_drift.py)', (t) => {
  if (spawnSync('python3', ['-c', 'import numpy']).status !== 0) return t.skip('python3 with numpy not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_voice_drift.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8', timeout: 120000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-20).join('\n'))
})
