// Caption timing (docs/voices.md "Caption timing"): the python tests in scripts/test_caption_sync.py (caption words
// matched to timed words by text, the CTC Viterbi, the hiss rule, frame rounding), run from here.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..', '..', '..')

test('python: caption words by text, the aligner and the caption frames (scripts/test_caption_sync.py)', (t) => {
  const py = spawnSync('python3', ['-c', 'import numpy, PIL'])
  if (py.status !== 0) return t.skip('python3 with numpy and Pillow not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_caption_sync.py'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})

test('hb review runs the caption timing check as a blocker', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'hb', 'cli.js'), 'utf8')
  assert.match(src, /scripts\/caption_av_check\.py/)
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts', 'caption_av_check.py')))
})
