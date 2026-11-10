// The story's hotbar (story.json "hotbar", docs/STANDARDS.md 3.6): the kit applies it once through ctx.hotbar (a fake
// ctx here), ./hb check validates it against minecraft-data, and rec_check counts the recording's filled slots.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const cp = require('child_process')
const S = require('../../story')
const { storyHotbarFindings } = require('../hotbar')

const ROOT = path.join(__dirname, '..', '..', '..')
const FULL = [['iron_pickaxe', 1, true], ['torch', 32], 'iron_shovel', ['bread', 12], 'lantern', ['oak_planks', 64], 'milk_bucket', ['egg', 67], 'cake']

function fakeCtx () {
  const calls = [], logs = []
  return { calls, logs, ctx: { hotbar: async (items) => { calls.push(items) }, log: (...a) => logs.push(a.join(' ')) } }
}

test('applyStoryHotbar: one ctx.hotbar call with the story\'s 9 slots, components added where vanilla needs them', async () => {
  const { ctx, calls } = fakeCtx()
  const items = await S.applyStoryHotbar(ctx, { lines: [], hotbar: FULL })
  assert.strictEqual(calls.length, 1)
  assert.deepStrictEqual(calls[0], [
    ['iron_pickaxe[enchantment_glint_override=true]', 1], ['torch', 32], ['iron_shovel', 1], ['bread', 12], ['lantern', 1],
    ['oak_planks', 64], ['milk_bucket', 1], ['egg[max_stack_size=99]', 67], ['cake', 1]])
  assert.strictEqual(ctx.storyHotbar, items)
  assert.ok(!('select' in ctx), 'the selected slot is the stunt\'s')
})

test('applyStoryHotbar: 67 eggs (owner: "make it 67 eggs") go over the egg\'s 16 with max_stack_size; within it, no component', () => {
  assert.deepStrictEqual(S.hotbarItems([['egg', 67], ['egg', 16], ['milk_bucket', 3], ['minecraft:cake', 2]]),
    [['egg[max_stack_size=99]', 67], ['egg', 16], ['milk_bucket[max_stack_size=99]', 3], ['cake[max_stack_size=99]', 2]])
  assert.deepStrictEqual(S.hotbarItems([{ item: 'diamond_sword', enchanted: 'sharpness:5' }, null, 'stick']),
    [['diamond_sword[enchantments={sharpness:5}]', 1], null, ['stick', 1]])
})

test('applyStoryHotbar: no "hotbar" (or an empty one) leaves the stunt alone; a bad id throws before any command', async () => {
  const { ctx, calls } = fakeCtx()
  assert.strictEqual(await S.applyStoryHotbar(ctx, { lines: [] }), null)
  assert.strictEqual(await S.applyStoryHotbar(ctx, { hotbar: [null, null] }), null)
  await assert.rejects(S.applyStoryHotbar(ctx, { hotbar: ['milk_bukkit'] }), /milk_bukkit/)
  assert.strictEqual(calls.length, 0)
  // from a story dir
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-hotbar-'))
  fs.writeFileSync(path.join(dir, 'story.json'), JSON.stringify({ hotbar: FULL }))
  assert.strictEqual((await S.applyStoryHotbar(ctx, dir)).length, 9)
  assert.strictEqual(calls.length, 1)
})

test('mergeHotbar: a stunt\'s own slots win, the story\'s fill the rest', () => {
  const base = S.hotbarItems(FULL)
  const m = S.mergeHotbar(base, ['iron_sword', null, ['bucket', 1]])
  assert.strictEqual(m.length, 9)
  assert.deepStrictEqual(m.slice(0, 3), ['iron_sword', ['torch', 32], ['bucket', 1]])
  assert.deepStrictEqual(m[8], ['cake', 1])
})

test('checkHotbar: BLOCK on an unknown 1.21 id, a bad count, a stacked tool, >9 entries; WARN on none or < 7 filled', () => {
  assert.deepStrictEqual(S.checkHotbar(FULL), [])
  const lv = (h) => S.checkHotbar(h).map(f => f.level)
  assert.deepStrictEqual(lv(undefined), ['WARN'])
  assert.deepStrictEqual(lv(FULL.slice(0, 6)), ['WARN'])
  assert.deepStrictEqual(lv(FULL.slice(0, 7)), [])
  assert.deepStrictEqual(lv([...FULL.slice(0, 8), 'milk_bkt']), ['BLOCK'])
  assert.deepStrictEqual(lv([...FULL.slice(0, 8), ['egg', 100]]), ['BLOCK'])
  assert.deepStrictEqual(lv([...FULL.slice(0, 8), ['egg', 99]]), [])
  assert.deepStrictEqual(lv([...FULL.slice(0, 8), ['diamond_pickaxe', 2]]), ['BLOCK'])
  assert.deepStrictEqual(lv([...FULL.slice(0, 8), ['diamond_pickaxe', 1, 'not_an_enchantment:1']]), ['BLOCK'])
  assert.deepStrictEqual(lv([...FULL, 'stick']), ['BLOCK'])
  assert.deepStrictEqual(lv([...FULL.slice(0, 8), 42]), ['BLOCK'])
})

test('./hb check: story_* stunts only, story.json from edit.story', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-hotbar-'))
  fs.mkdirSync(path.join(root, 'stories', 'milk'), { recursive: true })
  fs.writeFileSync(path.join(root, 'stories', 'milk', 'story.json'), JSON.stringify({ lines: [], hotbar: ['milk_bucket'] }))
  assert.strictEqual(storyHotbarFindings('creeper', { edit: {} }, root).applies, false)
  const r = storyHotbarFindings('story_x', { edit: { story: 'stories/milk' } }, root)
  assert.deepStrictEqual(r.findings.map(f => f.level), ['WARN'])
  fs.writeFileSync(path.join(root, 'stories', 'milk', 'story.json'), JSON.stringify({ lines: [], hotbar: ['milk_bucket', 'not_an_item'] }))
  assert.deepStrictEqual(storyHotbarFindings('story_milk', null, root).findings.map(f => f.level), ['BLOCK', 'WARN'])
})

test('rec_check hotbar_coverage: < 7 filled on the frames the HUD shows; hidden frames don\'t count', () => {
  const tl = [{ t: 0, event: 'hotbar', items: [] }, { t: 50 * 10, event: 'hotbar', items: S.hotbarItems(FULL) },
    { t: 50 * 30, event: 'hotbar', items: ['iron_sword', null, null] }]
  // ticks 0-39, 3 frames a tick; ticks 30-39 (the low ones) hidden (a camera shot): only 0-9 are low
  const frames = []
  for (let k = 0; k < 120; k++) frames.push([k / 3, !(k / 3 >= 30)])
  const run = (fr) => JSON.parse(cp.execFileSync('python3', ['-c', "import json,sys; sys.path.insert(0, 'scripts'); from rec_check import hotbar_coverage; a = json.load(sys.stdin); print(json.dumps(hotbar_coverage(a['tl'], a['frames'])))"],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify({ tl, frames: fr }) }))
  const r = run(frames)
  assert.strictEqual(r.visible, 90)
  assert.strictEqual(r.low, 30)
  assert.ok(r.frac > 0.2)
  assert.strictEqual(r.min_filled, 0)
  // all hidden: nothing to flag
  const none = run(frames.map(([t]) => [t, false]))
  assert.strictEqual(none.visible, 0)
})
