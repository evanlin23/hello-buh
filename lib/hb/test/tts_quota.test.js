// tts.py reads a 429 (per-minute: wait and retry the same model; per-day: next model, reset at midnight Pacific) and
// paces its requests (2026-11-10). Python side: scripts/test_tts_quota.py, urlopen mocked (no Gemini request).
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')

test('python: 429 per-minute vs per-day, retries, pacing (scripts/test_tts_quota.py)', (t) => {
  const py = spawnSync('python3', ['-c', 'import numpy'])
  if (py.status !== 0) return t.skip('python3 with numpy not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_tts_quota.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8', timeout: 300000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})
