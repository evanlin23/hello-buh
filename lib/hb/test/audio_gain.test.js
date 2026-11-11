// audio.py plays each sound at min(volume x its sounds.json volume, 1) like vanilla and limits a pile-up instead of
// turning the whole track down to it (chain_reaction: -56 to -68 dB under 500 blasts); edit.py caps the edit sfx's
// share of the game track's loudness (mislabel_grandma: one impact pushed the game ~28 dB down).
// The Python side is scripts/test_audio_gain.py, run from here.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')

test('python: vanilla gain clamp, pile-up limiter, sfx share cap (scripts/test_audio_gain.py)', (t) => {
  const py = spawnSync('python3', ['-c', 'import numpy, PIL'])
  if (py.status !== 0) return t.skip('python3 with numpy and pillow not found')
  const ff = spawnSync('ffmpeg', ['-version'])
  if (ff.status !== 0) return t.skip('ffmpeg not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_audio_gain.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8', timeout: 300000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})
