// The story mix (scripts/story_audio.py, docs/audio.md; owner, 2026-11-10: "The sound effects need work as well, and I
// dont hear any music", "the woosh is too jarring and loud"): the score in the edit, out before the payoff with no
// sting after it, ~13.5 dB under the voice; no whoosh by default; the clarity guard; the on-screen sound check.
// The Python side is scripts/test_story_audio.py, run from here.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')

test('python: score, design, clarity guard and on-screen sounds (scripts/test_story_audio.py)', (t) => {
  const py = spawnSync('python3', ['-c', 'import numpy'])
  if (py.status !== 0) return t.skip('python3 with numpy not found')
  const ff = spawnSync('ffmpeg', ['-version'])
  if (ff.status !== 0) return t.skip('ffmpeg not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_story_audio.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8', timeout: 300000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})
