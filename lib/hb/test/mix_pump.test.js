// The stunt mix masters the game + sfx first and lays the song under it (scripts/add_song.py, scripts/loud.py
// tame_gain / limit_peaks), and mixcheck BLOCKs a pumping bed or music on top of the game (scripts/mix_pump.py):
// owner 2026-11-12 on desire_town, "the music jumps too much". The Python side is scripts/test_mix_pump.py.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')

test('python: a pumped bed and music over the game fail, a steady mix passes (scripts/test_mix_pump.py)', (t) => {
  if (spawnSync('python3', ['-c', 'import numpy']).status !== 0) return t.skip('python3 with numpy not found')
  if (spawnSync('ffmpeg', ['-version']).status !== 0) return t.skip('ffmpeg not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_mix_pump.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8', timeout: 300000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})
