// The payoff settle (lib/settle.js; owner r:r24d99a): the harness marks when TNT, falling blocks, blast debris and a
// death puff have stopped, so endAfter 'settle:0.6' never cuts mid-payoff; the motion lint names raw actions (owner
// r:rffba12) and a blast / fall Short that doesn't end on the settle.
const test = require('node:test')
const assert = require('node:assert')
const S = require('../../settle')
const L = require('../../hb/motion_lint')

test('settle: a lit TNT, its blast and the falling sand after it are one window; the settle is when the last lands', () => {
  const entities = []
  for (let t = 10; t < 90; t++) entities.push([t, 1, 'tnt', 0, 64, 0])          // the fuse
  for (let t = 92; t < 130; t++) entities.push([t, 2, 'falling_block', 0, 70 - (t - 92) * 0.15, 0])   // sand knocked loose
  const timeline = [{ t: 90 * 50, event: 'particles', type: 'explosion' }, { t: 200 * 50, event: 'end' }]
  const w = S.motionWindows({ entities }, timeline)
  assert.strictEqual(w.length, 1)
  assert.deepStrictEqual([w[0].from, w[0].to], [10, 130])
  assert.deepStrictEqual(w[0].kinds, ['explosion', 'falling_block', 'tnt'])
  const marks = S.settleMarks(w, 200)
  const settle = marks.find(m => m.event === 'settle')
  assert.strictEqual(settle.t, 130 * 50)
  assert.strictEqual(marks.filter(m => m.event === 'settle').length, 1)
})

test('settle: two blasts far apart are two windows, and `settle` is the last one; a death puff counts 20 ticks', () => {
  const timeline = [{ t: 100 * 50, event: 'particles', type: 'explosion' }, { t: 300 * 50, event: 'mob_death' }]
  const w = S.motionWindows({ entities: [] }, timeline)
  assert.deepStrictEqual(w.map(x => [x.from, x.to]), [[100, 120], [300, 320]])
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
  assert.strictEqual(S.liveBusy([{ name: 'sheep' }], 100, 70, 70), false)
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
