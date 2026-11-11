const test = require('node:test')
const assert = require('node:assert')
const cp = require('child_process')
const path = require('path')
test('the owner-OK gate: nothing uploads without the owner\'s OK for that exact cut (scripts/test_owner_ok.py)', () => {
  const r = cp.spawnSync('python3', ['-m', 'unittest', 'scripts/test_owner_ok.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stderr)
})
