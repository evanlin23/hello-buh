// Key sounds over the music (scripts/key_sounds.py; owner, 2026-11-11, on guess_sound: "had super loud music"): the
// song ducks under each edit.keySounds clip and the gate BLOCKs a mix where a key sound is < 8 dB over the music.
// The Python side is scripts/test_key_sounds.py, run from here.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')

test('python: key sounds duck the song and the gate catches loud music (scripts/test_key_sounds.py)', (t) => {
  if (spawnSync('python3', ['-c', 'import numpy']).status !== 0) return t.skip('python3 with numpy not found')
  if (spawnSync('ffmpeg', ['-version']).status !== 0) return t.skip('ffmpeg not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_key_sounds.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8', timeout: 300000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})
