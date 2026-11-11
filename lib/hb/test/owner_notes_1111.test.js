// The owner's four notes of 2026-11-11 on ready Shorts, each an automatic check (docs/STANDARDS.md):
//   r:r478786 build stall (pace), r:r4df33c banned sound (lint), r:r32b983 timer resets (lint),
//   r:r200cfe time-lapse camera jump (rec_check cuts). The Python halves run from here.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const L = require('../stunt_lint')

const ROOT = path.join(__dirname, '..', '..', '..')
const ring = (t) => ({ t: t * 1000, event: 'ring' })
const portal = (t) => ({ t: t * 1000, event: 'portal' })
const RINGS = [ring(1), portal(5), ring(6), portal(10), ring(11), portal(15), { t: 16000, event: 'outro' }]

test('timer resets: one timer across several attempts blocks (end_portal_job, r:r32b983)', () => {
  const F = L.timerResets({ stunt: { edit: { timer: 'ring:outro' } }, rec: { timeline: RINGS } })
  assert.ok(F.some(f => f.level === 'BLOCK' && /without resetting/.test(f.msg)), JSON.stringify(F))
})

test('timer resets: edit.splits resets on every attempt, so it is quiet', () => {
  const F = L.timerResets({ stunt: { edit: { attempts: 'ring', splits: { reset: 'ring', split: 'portal', of: 3, endless: 'outro' } } }, rec: { timeline: RINGS } })
  assert.deepStrictEqual(F, [])
})

test('timer resets: one clock per attempt is quiet; a missing one blocks', () => {
  const ok = { clock: [['ring', 'portal', 4, 'A'], ['ring', 'portal', 4, 'B'], ['ring', 'portal', 4, 'C']] }
  assert.deepStrictEqual(L.timerResets({ stunt: { edit: ok }, rec: { timeline: RINGS } }), [])
  const short = { clock: [['ring', 'portal', 4, 'A'], ['ring', 'portal', 4, 'B']] }
  assert.ok(L.timerResets({ stunt: { edit: short }, rec: { timeline: RINGS } }).some(f => /no timer reset/.test(f.msg)))
})

test('timer resets: a timer overlay added outside the edit (a package script) blocks', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-lint-'))
  fs.mkdirSync(path.join(d, 'source'))
  fs.writeFileSync(path.join(d, 'source', 'timer_overlay.py'), '# a strip that never resets\n')
  fs.writeFileSync(path.join(d, 'metadata.json'), '{}')
  const F = L.timerResets({ stunt: { edit: {} }, rec: { timeline: RINGS }, pkgDir: d })
  assert.ok(F.some(f => /outside the edit/.test(f.msg)))
  fs.rmSync(d, { recursive: true })
})

test('timer resets: a single build with one clock (a time-lapse) is not an attempt series', () => {
  const tl = [{ t: 0, event: 'small_start' }, { t: 1000, event: 'small_done' }, { t: 2000, event: 'mid_start' }, { t: 9000, event: 'mid_done' }]
  assert.deepStrictEqual(L.timerResets({ stunt: { edit: { clock: [['small_start', 'small_done', 1], ['mid_start', 'mid_done', 60]] } }, rec: { timeline: tl } }), [])
})

test('banned sound: a bucket pour with no bucket in the hotbar blocks (boat_clutch, r:r4df33c); with a bucket it is vanilla', () => {
  const pour = { t: 3000, event: 'sound', sound: 'item.bucket.empty' }
  const boat = { t: 2900, event: 'hotbar', items: [['diamond_sword', 1], ['oak_boat', 1]] }
  const F = L.bannedSounds({ stunt: { edit: {} }, rec: { timeline: [boat, pour] } })
  assert.ok(F.some(f => f.level === 'BLOCK' && /bucketless_pour/.test(f.msg)), JSON.stringify(F))
  const bucket = { t: 2900, event: 'hotbar', items: [['water_bucket', 1]] }
  assert.deepStrictEqual(L.bannedSounds({ stunt: { edit: {} }, rec: { timeline: [bucket, pour] } }), [])
})

test('banned sound: every entry of lib/hb/banned_sfx.json names the owner, the rule and what it bans', () => {
  for (const b of L.BANNED) {
    assert.ok(b.id && b.owner && /^r:r[0-9a-f]{6}$/.test(b.rule) && b.date, JSON.stringify(b))
    assert.ok((b.sounds || []).length || (b.files || []).length)
  }
})

test("banned sound: audio.py's old-recording rebuild gives a boat recording no bucket pour", (t) => {
  if (!fs.existsSync(path.join(ROOT, 'work', 'client', 'assets.json'))) return t.skip('no work/client/assets.json (run ./run.sh once)')
  const poses = Array.from({ length: 60 }, (_, i) => [i, 0, i < 40 ? 80 - i * 2 : 0, 0, 0, 0, 0, 0])
  const rec = { poses, timeline: [{ t: 1900, event: 'placed' }, { t: 1900, event: 'mounted' }, { t: 2000, event: 'landed' }] }
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hb-rec-')), 'boat.rec.json')
  fs.writeFileSync(f, JSON.stringify(rec))
  assert.ok(!L.soundsOf(rec, f).some(s => s.sound === 'item.bucket.empty'))
  rec.timeline = rec.timeline.filter(e => e.event !== 'mounted')        // a water clutch keeps its pour
  fs.writeFileSync(f, JSON.stringify(rec))
  assert.ok(L.soundsOf(rec, f).some(s => s.sound === 'item.bucket.empty'))
  fs.rmSync(path.dirname(f), { recursive: true })
})

for (const [what, file] of [['build stall (pace, r:r478786)', 'scripts/test_pace_build.py'], ['time-lapse camera jump (cuts, r:r200cfe)', 'scripts/test_lapse_cuts.py']]) {
  test(`python: ${what} (${file})`, (t) => {
    if (spawnSync('python3', ['-c', 'import numpy']).status !== 0) return t.skip('python3 with numpy not found')
    const r = spawnSync('python3', ['-m', 'unittest', file], { cwd: ROOT, encoding: 'utf8', timeout: 120000 })
    assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
  })
}

test('banned sound: a pour while a pond fills (water placed within a second) is vanilla (desire_town)', () => {
  let md
  try { md = require('minecraft-data')('1.21.11') } catch (e) { return }
  const water = md.blocksByName.water.defaultState
  const rec = { version: '1.21.11', blocks: [[140, 0, 64, 0, water]], timeline: [{ t: 7200, event: 'sound', sound: 'item.bucket.empty' }] }
  assert.deepStrictEqual(L.bannedSounds({ stunt: { edit: {} }, rec }), [])
})
