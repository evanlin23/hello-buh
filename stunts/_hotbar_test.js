// The story hotbar's live test (story.json "hotbar", docs/STANDARDS.md 3.6, docs/engine_features.md "The story's
// hotbar"): on a real server, the harness applies lib/hb/test/fixtures/hotbar_story/story.json's hotbar after the
// set-up (an enchanted pickaxe, 67 eggs over the egg's 16 with max_stack_size, milk and water buckets, a cake), the
// first recorded frame already has it, then the held item follows the selected slot (a bucket in hand, the eggs),
// and a stunt's own ctx.hotbar wins from its moment (merged with the story's: mergeHotbar). Marks to still at:
// t_full (slot 0, the glint), t_milk, t_eggs, t_own (an iron sword over slot 0).
//   ./hb record _hotbar_test && ./hb still _hotbar_test t_full+0.5 t_milk+0.5 t_eggs+0.5 t_own+0.5
const { mergeHotbar } = require('../lib/story')

module.exports = {
  name: '_hotbar_test',
  biome: 'minecraft:plains',
  botTimeout: 240,
  edit: { caption: 'hotbar test', story: 'lib/hb/test/fixtures/hotbar_story' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    await ctx.defaultRules()
    await ctx.cmd('/clear @s')
    await ctx.tpCheck(g.x + 0.5, g.y + 1, g.z + 0.5, 180, 10)
    await bot.waitForChunksToLoad()
    await ctx.cmd('/gamemode survival')
    await bot.waitForTicks(20)
    return { x: g.x, y: g.y, z: g.z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const items = bot.inventory.slots.slice(36, 45).map(it => it ? `${it.name} x${it.count}` : '-')
    ctx.log('hotbar at the start:', items.join(', '))
    ctx.mark('t_full'); await bot.waitForTicks(30)
    ctx.select(6); ctx.mark('t_milk'); await bot.waitForTicks(30)
    ctx.select(7); ctx.mark('t_eggs'); await bot.waitForTicks(30)
    ctx.select(0)
    await ctx.hotbar(mergeHotbar(ctx.storyHotbar, ['iron_sword']))
    ctx.mark('t_own'); await bot.waitForTicks(30)
    const eggs = bot.inventory.slots[43]
    const ok = items.filter(x => x !== '-').length === 9 && !!eggs && eggs.name === 'egg' && eggs.count === 67 && bot.inventory.slots[36]?.name === 'iron_sword'
    ctx.log(ok ? 'hotbar test OK' : `hotbar test FAILED: ${items.join(', ')} / slot 7 ${eggs ? eggs.name + ' x' + eggs.count : 'empty'}`)
    return ok
  }
}
