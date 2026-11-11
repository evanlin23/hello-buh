// Packages target a channel (lib/channel.js; scripts/youtube_upload.py YT_CHANNEL): story Shorts go to Buh Stories,
// everything else stays on HelloBuh; a package or stunt that names its channel keeps it.
const test = require('node:test')
const assert = require('node:assert')
const cp = require('child_process')
const path = require('path')
const { channelFor } = require('../../channel')

test('channelFor: story_* -> buhstories, others hellobuh, an existing package or the stunt wins, unknown throws', () => {
  assert.strictEqual(channelFor('story_dog_hill'), 'buhstories')
  assert.strictEqual(channelFor('creeper_art'), 'hellobuh')
  assert.strictEqual(channelFor('story_dog_hill', {}, { channel: 'hellobuh' }), 'hellobuh')   // published before: kept
  assert.strictEqual(channelFor('lapse_castle', { channel: 'buhstories' }), 'buhstories')
  assert.throws(() => channelFor('x', { channel: 'nope' }), /not one of/)
})

test('the uploader picks only its own channel\'s Shorts (scripts/test_upload_channel.py)', () => {
  const r = cp.spawnSync('python3', ['-m', 'unittest', 'scripts/test_upload_channel.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stdout + r.stderr)
})
