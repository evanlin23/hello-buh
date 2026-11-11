// Re-renders of recordings made by the old 'HelloBuh' bot draw the player as 56e (owner 2026-11-11, r:r52f94c: "all of
// these still say hellobuh instead of 56e"): every text from the recording, the skin, and nothing for stories.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const L = require('../../legacy_player')
const S = require('../../skins')

const ROOT = path.join(__dirname, '..', '..', '..')
// the death message as the 1.21.11 client records it (cave_reveal, creeper...: a player component with a click event,
// an insertion and a hover)
const who = (n) => ({ click_event: { action: 'suggest_command', command: `/tell ${n} ` }, insertion: n, text: n, hover_event: { name: n, action: 'show_entity', id: 'minecraft:player', uuid: [1, 2, 3, 4] } })
const creeperRec = (user) => ({
  stunt: 'creeper', ...(user ? { user } : {}), poses: [], entities: [],
  timeline: [
    { t: 0, event: 'start' },
    { t: 8650, event: 'syschat', text: '<HelloBuh> hi', lines: [['HelloBuh joined the game', 'yellow']] },
    { t: 8700, event: 'death_message', message: { translate: 'death.attack.explosion.player', with: [who('HelloBuh'), { translate: 'entity.minecraft.creeper' }] } },
    { t: 8700, event: 'death' }
  ]
})

test('a HelloBuh stunt recorded by the old bot is drawn as 56e; stories and other users keep their names', () => {
  assert.strictEqual(L.legacySelf({ rec: creeperRec(), name: 'creeper', stunt: {} }), '56e')
  assert.strictEqual(L.legacySelf({ rec: creeperRec('HelloBuh'), name: 'creeper', stunt: {} }), '56e')
  assert.strictEqual(L.legacySelf({ rec: creeperRec('56e'), name: 'creeper', stunt: {} }), null)       // already 56e: nothing to do
  assert.strictEqual(L.legacySelf({ rec: creeperRec('Buh'), name: 'creeper', stunt: {} }), null)
  assert.strictEqual(L.legacySelf({ rec: creeperRec(), name: 'story_runaway', stunt: {} }), null)
  assert.strictEqual(L.legacySelf({ rec: creeperRec(), name: 'x', stunt: { botName: 'Buh' } }), null)
  assert.strictEqual(L.legacySelf({ rec: creeperRec(), name: 'x', stunt: { channel: 'buhstories' } }), null)
  assert.strictEqual(L.legacySelf({ rec: creeperRec(), name: 'x', stunt: { edit: { story: 'stories/x' } } }), null)
  assert.strictEqual(L.legacySelf({ rec: creeperRec(), name: 'creeper', stunt: {}, env: { HB_LEGACY_NAME: '0' } }), null)
})

test('render.js: every name in the recording\'s texts becomes 56e, and the player wears 56e\'s own skin', () => {
  const rec = creeperRec()
  const before = JSON.parse(JSON.stringify(rec))
  assert.strictEqual(L.applyToRec(rec, { name: 'creeper', stunt: {} }), '56e')
  assert.ok(!JSON.stringify(rec).includes('HelloBuh'))
  assert.strictEqual(rec.timeline[2].message.with[0].text, '56e')
  assert.strictEqual(rec.timeline[1].text, '<56e> hi')
  // nothing else changes: the same events at the same times, the same non-name fields
  assert.deepStrictEqual(rec.timeline.map(e => [e.t, e.event]), before.timeline.map(e => [e.t, e.event]))
  assert.deepStrictEqual(rec.timeline[2].message.with[1], before.timeline[2].message.with[1])
  // the skin: rec.user is now 56e, so lib/skins.js picks 56e's real skin (wide arms) when work/skins has it
  const sk = S.selfSkin({ user: rec.user, have: (n) => n === '56e' ? { slim: true, model: 'wide' } : null })
  assert.deepStrictEqual(sk, { skin: 'real/56e', slim: true, model: 'wide', real: '56e' })
  assert.deepStrictEqual(S.wantedSkins({ user: rec.user }), ['56e'])
  // a story's recording is left alone
  const story = creeperRec()
  assert.strictEqual(L.applyToRec(story, { name: 'story_runaway', stunt: {} }), null)
  assert.deepStrictEqual(story, creeperRec())
})

test('edit_args asks edit.py for 56e on HelloBuh stunts only', () => {
  const args = (name, env = {}) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'edit_args.js'), name], { encoding: 'utf8', env: { ...process.env, ...env } }).stdout.split('\n')
  const a = args('creeper'); assert.strictEqual(a[a.indexOf('--self_name') + 1], '56e')
  assert.ok(!args('creeper', { HB_LEGACY_NAME: '0' }).includes('--self_name'))
  const story = fs.readdirSync(path.join(ROOT, 'stunts')).find(f => /^story_.*\.js$/.test(f))
  if (story) assert.ok(!args(story.slice(0, -3)).includes('--self_name'))
})

test('edit.py: the recorded death message "HelloBuh was blown up by Creeper" renders as "56e was blown up by Creeper"', (t) => {
  if (spawnSync('python3', ['-c', 'import PIL, numpy']).status !== 0) return t.skip('python3 with Pillow and numpy not found')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb_legacy_'))
  const rp = path.join(dir, 'creeper.rec.json')
  fs.writeFileSync(rp, JSON.stringify(creeperRec()))
  const r = spawnSync('python3', ['-c', `
import sys, json, pathlib, zipfile; sys.path.insert(0, ${JSON.stringify(ROOT)}); import edit
rec = json.loads(pathlib.Path(${JSON.stringify(rp)}).read_text())
out = {}
for k, to in (('old', None), ('new', '56e')):
    r = edit.apply_self_name(rec, to) if to else rec
    msg = [e for e in r['timeline'] if e['event'] == 'death_message'][0]['message']
    if edit.CLIENT_JAR.exists():
        with zipfile.ZipFile(edit.CLIENT_JAR) as jar:
            out[k] = edit.death_message(jar, msg)
    else:   # no client jar here: the en_us format of death.attack.explosion.player
        out[k] = '%s was blown up by %s'.replace('%s', msg['with'][0]['text'], 1).replace('%s', 'Creeper', 1)
    out[k + '_has_old'] = 'HelloBuh' in json.dumps(r)
out['story'] = edit.apply_self_name(dict(rec, user='Buh'), '56e')
print(json.dumps(out))
`], { encoding: 'utf8' })
  fs.rmSync(dir, { recursive: true, force: true })
  assert.strictEqual(r.status, 0, r.stderr)
  const o = JSON.parse(r.stdout)
  assert.strictEqual(o.old, 'HelloBuh was blown up by Creeper')
  assert.strictEqual(o.new, '56e was blown up by Creeper')
  assert.strictEqual(o.new_has_old, false)
  assert.strictEqual(o.story, null)   // another user (a story's Buh): untouched
})
