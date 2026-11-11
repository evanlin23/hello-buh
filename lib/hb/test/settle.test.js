// The payoff settle (lib/settle.js; owner r:r24d99a): the harness marks when TNT, falling blocks, blast debris and a
// death puff have stopped, so endAfter 'settle:0.6' never cuts mid-payoff; the motion lint names raw actions (owner
// r:rffba12) and a blast / fall Short that doesn't end on the settle.
const test = require('node:test')
const assert = require('node:assert')
const S = require('../../settle')
const L = require('../../hb/motion_lint')

test('settle: a lit TNT, its blast and the falling sand after it are one window; the settle is when the last moves', () => {
  const entities = []
  for (let t = 10; t < 90; t++) entities.push([t, 1, 'tnt', 0, 64, 0])          // the fuse
  for (let t = 92; t < 130; t++) entities.push([t, 2, 'falling_block', 0, 70 - (t - 92) * 0.15, 0])   // sand knocked loose
  const timeline = [{ t: 90 * 50, event: 'particles', type: 'explosion' }, { t: 200 * 50, event: 'end' }]
  const w = S.motionWindows({ entities }, timeline)
  assert.strictEqual(w.length, 1)
  assert.deepStrictEqual([w[0].from, w[0].to], [10, 134])   // the blast's rendered smoke (90 + 44) outlasts the sand
  assert.deepStrictEqual(w[0].kinds, ['explosion', 'falling_block', 'tnt'])
  const marks = S.settleMarks(w, 200)
  const settle = marks.find(m => m.event === 'settle')
  assert.strictEqual(settle.t, 134 * 50)
  assert.strictEqual(marks.filter(m => m.event === 'settle').length, 1)
})

test('settle: two blasts far apart are two windows, and `settle` is the last one; a blast counts 44 ticks, a death 20', () => {
  const timeline = [{ t: 100 * 50, event: 'particles', type: 'explosion' }, { t: 300 * 50, event: 'mob_death' }]
  const w = S.motionWindows({ entities: [] }, timeline)
  assert.deepStrictEqual(w.map(x => [x.from, x.to]), [[100, 144], [300, 320]])
  const tl = [{ t: 0, event: 'start' }, { t: 400 * 50, event: 'end' }]
  S.insertMarks(tl, S.settleMarks(w, 400))
  assert.deepStrictEqual(tl.map(m => m.event), ['start', 'motion_start', 'motion_settled', 'motion_start', 'motion_settled', 'settle', 'end'])
  assert.strictEqual(tl.find(m => m.event === 'settle').t, 320 * 50)
})

test('settle: a recording that ends mid-motion says so (cut: true)', () => {
  const entities = []; for (let t = 0; t < 50; t++) entities.push([t, 2, 'falling_block', 0, 70, 0])
  const m = S.settleMarks(S.motionWindows({ entities }, []), 30)
  assert.strictEqual(m.find(x => x.event === 'settle').cut, true)
})

test('settle: resting items are not motion; items flying out of a blast are debris', () => {
  const entities = [[100, 5, 'item', 0, 64, 0], [101, 5, 'item', 0, 64, 0], [102, 5, 'item', 0, 64, 0]]
  assert.strictEqual(S.motionWindows({ entities }, []).length, 0)
  const fly = [[100, 5, 'item', 0, 64, 0], [101, 5, 'item', 0.5, 64.3, 0], [140, 5, 'item', 2, 64, 0], [141, 5, 'item', 2.4, 64, 0]]
  const w = S.motionWindows({ entities: fly }, [{ t: 100 * 50, event: 'particles', type: 'explosion' }])
  assert.ok(w.some(x => x.kinds.includes('debris') && x.to >= 142))
})

test('liveBusy: a primed TNT or a falling block in the world, or a blast / death in the last second, is still moving', () => {
  assert.strictEqual(S.liveBusy([{ name: 'tnt' }], 100), true)
  assert.strictEqual(S.liveBusy([{ name: 'sheep' }], 100, 90), true)
  assert.strictEqual(S.liveBusy([{ name: 'sheep' }], 100, 70), true)   // 1.5 s after a blast its smoke still moves
  assert.strictEqual(S.liveBusy([{ name: 'sheep' }], 100, 50, 70), false)
})

// which_door (independent review 2026-11-11): the harness settled 20 ticks after the last blast and stopped recording
// 0.15 s later, while the RENDERER's smoke, poof clouds and crumbs were still flying past "You Died!"
test('settle: the blast window outlasts the renderer\'s explosion particles (renderer/particles.js)', () => {
  const P = require('../../../renderer/particles')
  const motionAt = (ps, T0, a) => ps.reduce((m, p) => {
    const s0 = P.state(p, T0 + a, () => false), s1 = P.state(p, T0 + a + 1, () => false)
    return s0 && s1 ? m + Math.hypot(s1.x - s0.x, s1.y - s0.y, s1.z - s0.z) * p.size : m
  }, 0)
  let peak = 0, at = 0
  for (let k = 0; k < 40; k++) {
    const ev = { t: 1000 * k, type: 'explosion', x: 3 * k, y: 64, z: 7 * k, blocks: 32, radius: 4, particle: 'explosion_emitter' }
    const ps = P.spawn(ev, null), T0 = ev.t / 50
    let pk = 0; for (let a = 0; a < 20; a++) pk = Math.max(pk, motionAt(ps, T0, a))
    peak += pk; at += motionAt(ps, T0, S.EXPLOSION_TICKS)
  }
  assert.ok(at < 0.15 * peak, `renderer explosion motion at ${S.EXPLOSION_TICKS} ticks: ${(100 * at / peak).toFixed(1)}% of its peak`)
  assert.ok(S.EXPLOSION_TICKS >= 40, 'the smoke and the crumbs live up to 40 ticks')
  // the Python end checks (owner_checks.PUFF_TICKS) use the same window
  const py = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'scripts', 'owner_checks.py'), 'utf8')
  assert.strictEqual(Number((py.match(/^PUFF_TICKS = (\d+)/m) || [])[1]), S.EXPLOSION_TICKS)
  assert.ok(S.SETTLE_TAIL_TICKS / 20 >= S.SETTLE_PAD + 1, 'the recording runs past settle + the edit\'s tail')
})

test('settle: which_door\'s published recording ends inside the rendered blast smoke (rec_check BLOCK)', (t) => {
  const { spawnSync } = require('child_process')
  const path = require('path'), fs = require('fs'), os = require('os')
  const ROOT = path.join(__dirname, '..', '..', '..')
  const VIDEOS = process.env.HB_VIDEOS || path.join(ROOT, '..', 'hb-videos')
  const commit = 'ba04419a'   // Package which_door, 2026-11-11 10:14 (the render the review sent back)
  const blob = spawnSync('git', ['-C', VIDEOS, 'show', `${commit}:shorts/which_door/recording.json.gz`], { maxBuffer: 1 << 28 })
  if (blob.status !== 0) return t.skip(`no ${commit}:shorts/which_door/recording.json.gz in ${VIDEOS}`)
  const stunt = spawnSync('git', ['-C', VIDEOS, 'show', `${commit}:shorts/which_door/source/which_door.js`], { maxBuffer: 1 << 24 })
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wd-settle-'))
  const rec = path.join(dir, 'which_door.rec.json.gz'), sf = path.join(dir, 'which_door.js')
  fs.writeFileSync(rec, blob.stdout); fs.writeFileSync(sf, stunt.stdout)
  const r = spawnSync('python3', [path.join(ROOT, 'scripts', 'rec_check.py'), 'which_door', rec, '--stunt-file', sf, '--no-owner'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 })
  fs.rmSync(dir, { recursive: true, force: true })
  if (/No module named 'numpy'/.test(r.stderr)) return t.skip('numpy missing')
  assert.match(r.stdout, /\[settle \].*ends while .*blast smoke and debris \(rendered particles\)/, r.stdout.slice(-2000) + r.stderr.slice(-1000))
})

test('motion lint: raw places, digs and uses on a mob are action errors that name lib/act.js', () => {
  const src = `module.exports = { async perform (ctx) {
    bot._client.write('block_place', { hand: 0, location: q, direction: 1 })
    bot._client.write('block_dig', { status: 0, location: p, face: 1, sequence: 0 })
    bot._client.write('block_dig', { status: 4, location: p, face: 0, sequence: 0 })
    bot.activateEntity(sheep)
    await bot.dig(b, 'ignore')
    await bot.dig(b2, 'ignore')   // motion-ok: off screen, under the floor
  } }`
  const hits = L.lintSource(src).filter(h => h.kind === 'action')
  assert.deepStrictEqual(hits.map(h => h.line), [2, 3, 5, 6])   // the drop-item packet (status 4) and the motion-ok line are not
  assert.ok(hits.every(h => /lib\/act\.js/.test(h.use)))
})

test('motion lint: a blast / fall Short that does not end on the settle gets the hint', () => {
  assert.ok(L.settleHint("edit: { endAfter: 'boom:0.8' }, async perform () { ctx.cmd('/summon tnt ~ ~ ~') }"))
  assert.strictEqual(L.settleHint("edit: { endAfter: 'settle:0.6' }, async perform () { ctx.cmd('/summon tnt ~ ~ ~') }"), null)
  assert.strictEqual(L.settleHint("edit: { endAfter: 'boom:0.8' } // settle-ok: reviewed\n ctx.cmd('/summon tnt ~ ~ ~')"), null)
  assert.strictEqual(L.settleHint("edit: { endAfter: 'done:0.8' }, async perform () { ctx.cmd('/setblock ~ ~ ~ oak_planks') }"), null)
})
