// voice contrast (STANDARDS 2.7; owner r:rc31bfe "The moms voice is too similar to narrator", r:rf8060c "Grandma
// sounds like a dude still"): runs in ./hb voice and ./hb check. The python tests are scripts/test_voice_contrast.py.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const ROOT = path.join(__dirname, '..', '..', '..')

test('python: contrast and read verdicts on the measured takes (scripts/test_voice_contrast.py)', (t) => {
  if (spawnSync('python3', ['-c', 'import numpy']).status !== 0) return t.skip('python3 with numpy not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_voice_contrast.py'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-20).join('\n'))
})

test('voice contrast is a step of ./hb check (pre-record and full) and of ./hb voice', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'hb', 'cli.js'), 'utf8')
  assert.match(src, /CHECK_STEPS_PRE = \[[^\]]*'voice contrast'/)
  assert.match(src, /CHECK_STEPS = \[[^\]]*'voice contrast'/)
  assert.match(src, /steps\.push\(\{ name: 'voice contrast', \.\.\.voiceContrastStep\(dir\) \}\)/)
  assert.match(src, /step\('voice contrast', vc\.exit/)
  const voice = src.slice(src.indexOf('function cmdVoice'), src.indexOf('function cmdPreview'))
  assert.ok(voice.indexOf('voice_contrast.py') > voice.indexOf('voice_drift.py'), 'runs after the take gate, speaker and drift checks')
})

test('the cast says how each recurring voice must read (voices/cast.json reads_as)', () => {
  const cast = JSON.parse(fs.readFileSync(path.join(ROOT, 'voices', 'cast.json'), 'utf8'))
  assert.deepStrictEqual(cast.grandma.reads_as.sex, 'female')
  assert.deepStrictEqual(cast.mom.reads_as.sex, 'female')
  assert.deepStrictEqual(cast.elder.reads_as.sex, 'male')
  for (const k of Object.keys(cast).filter(k => !k.startsWith('_') && cast[k].voice)) assert.ok(cast[k].reads_as && cast[k].reads_as.age, `${k}: reads_as.age`)
})
