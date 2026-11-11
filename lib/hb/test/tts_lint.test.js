// tts.py's pre-send prompt lint (docs/voices.md "Prompt lint"; 2026-11-11: 3.8-flash-tts read long character directions
// aloud). Python side: scripts/test_tts_lint.py, request() mocked (no Gemini request).
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')

test('python: the prompt lint refuses long/multi-clause character brackets before any request (scripts/test_tts_lint.py)', (t) => {
  const py = spawnSync('python3', ['-c', 'import numpy'])
  if (py.status !== 0) return t.skip('python3 with numpy not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_tts_lint.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8', timeout: 300000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})
