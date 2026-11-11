// Buh Stories upload text from one source (story.json `upload`; lib/buhstories_upload.js): publish.js writes it,
// the uploader rebuilds it, ./hb paste prints it; a package with HelloBuh hashtags or no music credit BLOCKs.
// HelloBuh packages are never touched.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const BS = require('../../buhstories_upload')

const ROOT = path.join(__dirname, '..', '..', '..')
const FIX = path.join(__dirname, 'fixtures')
const gold = () => JSON.parse(fs.readFileSync(path.join(FIX, 'buhstories_gold_metadata.json'), 'utf8'))
const anvil = () => JSON.parse(fs.readFileSync(path.join(FIX, 'hellobuh_anvil_rain_metadata.json'), 'utf8'))
const FIVE = { light_sleeper: 'story_light_sleeper', good_boy: 'story_good_boy', thirty_one_raids: 'story_thirty_one_raids', gold_for_the_portal: 'story_gold_for_the_portal', dog_hill: 'story_dog_hill' }
const DARKEST = '"Darkest Child" Kevin MacLeod (incompetech.com)\nLicensed under Creative Commons: By Attribution 4.0 License\nhttp://creativecommons.org/licenses/by/4.0/'

test('buhstories: the packaged HelloBuh-style text BLOCKs (HelloBuh hashtags), the built one passes', () => {
  const m = gold()
  const before = BS.check(m)
  assert.ok(before.some(b => /HelloBuh hashtag #minecraftmemes/.test(b)), before.join('\n'))
  assert.ok(before.some(b => /HelloBuh hashtag #funny/.test(b)))
  const built = BS.apply(m)
  assert.deepStrictEqual(BS.check(built), [])
})

test('buhstories: the built text is the brand format (title, hook / question / credit / hashtags, tags, pinned, playlist)', () => {
  const y = BS.apply(gold()).youtube
  assert.strictEqual(y.title, 'my grandma has thrown 9,000 gold into a portal 🪙 #minecraft #shorts')
  assert.strictEqual(y.description, `My grandma has thrown 9,000 gold into a portal\n\nWhat would YOU send through the portal to Grandpa?\n\n${DARKEST}\n\n#minecraft #shorts #minecraftstory #buhstories`)
  assert.strictEqual(y.pinned_comment, 'What would YOU send through the portal to Grandpa? 👇')
  assert.strictEqual(y.playlist, 'All Buh Stories')
  assert.strictEqual(y.made_for_kids, false)
  assert.strictEqual(y.altered_content, false)
  for (const k of BS.KEYWORDS) assert.ok(y.tags.includes(k), k)
  assert.ok(y.tags.includes('minecraft nether portal'))
  assert.ok(!/#minecraftmemes|#funny/.test(y.title + y.description))
})

test('buhstories: a missing music credit BLOCKs', () => {
  const m = BS.apply(gold())
  m.youtube.description = m.youtube.description.replace(DARKEST + '\n\n', '')
  assert.ok(BS.check(m).some(b => /lacks the music credit/.test(b)))
  const n = BS.apply(gold())
  n.song = { title: 'Mystery', tracks: ['not_a_track'] }   // no credit anywhere -> "Song: Mystery" fallback must be there
  assert.ok(BS.check(n).some(b => /lacks the music credit \(Song: Mystery\)/.test(b)))
})

test('buhstories: a story with no upload block BLOCKs (no title, no pinned question)', () => {
  const m = BS.apply({ name: 'story_nope', channel: 'buhstories', caption: 'x' }, {})
  const b = BS.check(m)
  assert.ok(b.some(x => /no title/.test(x)) && b.some(x => /no pinned comment/.test(x)), b.join('\n'))
})

test('the five stories: story.json upload titles match docs/brand.md\'s table (Raids: the corrected title + question)', () => {
  const brand = fs.readFileSync(path.join(ROOT, 'docs', 'brand.md'), 'utf8')
  for (const [dir, stunt] of Object.entries(FIVE)) {
    const u = BS.uploadOf(stunt, {}, {})
    assert.ok(u.title, `${dir}: no upload.title`)
    assert.ok(u.title.length <= 100)
    assert.match(u.title, /^[^A-Z]+ \S+ #minecraft #shorts$/u, `${dir}: lowercase hook + emoji + #minecraft #shorts`)
    assert.ok(brand.includes(`| ${u.title} |`), `${dir}: title not in the brand table: ${u.title}`)
    assert.ok(u.pinned && !/👇$/u.test(u.pinned), `${dir}: pinned is the question without the 👇`)
  }
  const r = BS.uploadOf('story_thirty_one_raids', {}, {})
  assert.strictEqual(r.title, 'thirty-one raids. every one started the night grandpa came home 😳 #minecraft #shorts')
  assert.strictEqual(r.pinned, 'Should anyone ever tell Grandpa where raid 32 came from?')
})

test('a stunt edit.youtube wins over story.json upload, field by field', () => {
  const u = BS.uploadOf('story_dog_hill', {}, { edit: { story: 'stories/dog_hill', youtube: { pinned: 'Other?' } } })
  assert.strictEqual(u.pinned, 'Other?')
  assert.match(u.title, /900 days/)
})

test('HelloBuh packages are untouched (byte-identical metadata) and never checked', () => {
  const a = anvil()
  const s = JSON.stringify(a)
  assert.strictEqual(JSON.stringify(BS.apply(a)), s)
  assert.strictEqual(JSON.stringify(BS.apply({ ...a, channel: 'hellobuh' })), JSON.stringify({ ...a, channel: 'hellobuh' }))
  assert.deepStrictEqual(BS.check(a), [])
  // publish.js only calls the builder inside the buhstories branch; its HelloBuh youtube block is as before
  const pub = fs.readFileSync(path.join(ROOT, 'scripts', 'publish.js'), 'utf8')
  assert.ok(pub.includes("if (meta.channel === 'buhstories') {\n    const BS = require('../lib/buhstories_upload')"))
  assert.ok(pub.includes("const HASHTAGS = ['#minecraft', '#shorts', '#minecraftmemes', '#funny']"))
  assert.ok(pub.includes('title: `${caption} ${HASHTAGS.slice(0, 2).join(\' \')}`.slice(0, 100),'))
  assert.ok(pub.includes('description: `${caption}${credit}\\n\\n${HASHTAGS.join(\' \')}`,'))
})

test('./hb paste prints the paste-ready block from a package (exit 0) and the CLI exits 1 on a BLOCK', () => {
  const r = cp.spawnSync('node', ['hb', 'paste', 'gold_for_the_portal', '--meta', path.join(FIX, 'buhstories_gold_metadata.json')], { cwd: ROOT, encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stdout + r.stderr)
  for (const s of ['TITLE\nmy grandma has thrown 9,000 gold into a portal 🪙 #minecraft #shorts', 'DESCRIPTION\nMy grandma', 'TAGS\nminecraft story,', 'PINNED COMMENT', 'What would YOU send through the portal to Grandpa? 👇', 'playlist: All Buh Stories', 'not made for kids', 'altered content: No']) assert.ok(r.stdout.includes(s), s)
  const j = cp.spawnSync('node', ['hb', 'paste', 'gold_for_the_portal', '--meta', path.join(FIX, 'buhstories_gold_metadata.json'), '--json'], { cwd: ROOT, encoding: 'utf8' })
  const o = JSON.parse(j.stdout)
  assert.strictEqual(o.ok, true)
  assert.strictEqual(o.shorts[0].youtube.pinned_comment, 'What would YOU send through the portal to Grandpa? 👇')
  const td = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bs-'))
  const f = path.join(td, 'm.json')
  fs.writeFileSync(f, JSON.stringify({ name: 'story_nope', channel: 'buhstories', caption: 'x', song: gold().song }))
  const b = cp.spawnSync('node', ['lib/buhstories_upload.js', f, '--json'], { cwd: ROOT, encoding: 'utf8' })
  assert.strictEqual(b.status, 1)
  assert.ok(JSON.parse(b.stdout).blocks.some(x => /no title/.test(x)))
  fs.rmSync(td, { recursive: true })
})

test('the uploader: HelloBuh body unchanged; Buh Stories rebuilds, checks, playlists and comments (scripts/test_upload_buhstories.py)', () => {
  const r = cp.spawnSync('python3', ['-m', 'unittest', 'scripts/test_upload_buhstories.py'], { cwd: ROOT, encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stdout + r.stderr)
})

test('HelloBuh unchanged: family_scores ranking, gates/stale skipping, "# first" pins, release-asset download (scripts/test_upload_hellobuh_unchanged.py)', () => {
  const r = cp.spawnSync('python3', ['-m', 'unittest', '-v', 'scripts/test_upload_hellobuh_unchanged.py'], { cwd: ROOT, encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stdout + r.stderr)
})
