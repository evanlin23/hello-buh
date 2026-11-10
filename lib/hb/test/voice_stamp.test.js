// A story recording is stamped with the voice it was staged to (lib/story.js voiceStamp, written by the harness);
// ./hb check BLOCKs a recording whose stamp no longer matches voice/voice.json: its cuts and holds were timed to line
// lengths that changed (record AFTER the final voice, as Runaway was).
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { voiceStamp } = require('../../story')
const { voiceStampCheck } = require('../cli')._internal

function story (voice) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-vs-'))
  if (voice) { fs.mkdirSync(path.join(d, 'voice')); fs.writeFileSync(path.join(d, 'voice', 'voice.json'), JSON.stringify(voice)) }
  return d
}

test('voiceStamp: a stable hash of voice.json, null without one', () => {
  const d = story({ lines: { L01: { dur: 2.5 } } })
  assert.strictEqual(voiceStamp(d), voiceStamp(d))
  assert.match(voiceStamp(d), /^[0-9a-f]{12}$/)
  assert.strictEqual(voiceStamp(story(null)), null)
})

test('voiceStampCheck: same voice passes, a changed voice blocks, an unstamped recording warns, no voice blocks', () => {
  const d = story({ lines: { L01: { dur: 2.5 } } })
  const t = (voice) => ({ stunt: { edit: { story: d } }, rec: voice === undefined ? {} : { voice } })
  assert.strictEqual(voiceStampCheck(t(voiceStamp(d))).code, 0)
  fs.writeFileSync(path.join(d, 'voice', 'voice.json'), JSON.stringify({ lines: { L01: { dur: 2.9 } } }))   // a re-take
  const changed = voiceStampCheck(t('000000000000'))
  assert.strictEqual(changed.code, 1)
  assert.match(changed.summary, /re-record/)
  assert.strictEqual(voiceStampCheck(t(undefined)).code, 0)
  assert.match(voiceStampCheck(t(undefined)).summary, /WARN/)
  assert.strictEqual(voiceStampCheck({ stunt: { edit: { story: story(null) } }, rec: {} }).code, 1)
  assert.strictEqual(voiceStampCheck({ stunt: { edit: {} }, rec: {} }), null)   // not a story stunt
})
