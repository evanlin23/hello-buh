// The live test of the story-kit extras (docs/engine_features.md "Entity scale, skin swaps, trails, block changes,
// head turns, display props"), ~16 s on a real 1.21.11 server:
//   1. the card table (Sorry, Dear): the aunt (a player actor) at minecraft:scale 0.3 on the cloth beside a mug as tall
//      as her, a teacup, her emerald heap and two fans of flat cards (block_display / item_display props, no bob or
//      spin); her name tag rides at her scaled height. She shrinks to 0.286 (eased 0.25 s), then S02's three jump-cut
//      sizes (1.22, 0.8, 0.3), and the kid seated at the table shrinks 1.0 -> 0.986                 t_table .. t_kid
//   2. the statue wall (The Statue Gets Younger): a trail from Mom's head into the stone, a wrinkle row turns to calcite
//      on the mark and her skin swaps (neighbour -> spare_girl), then the reverse trail and a second swap (miner_girl)
//                                                                                                  t_trail .. t_skin2
//   3. Dad, seated on the bench, turns his head to Mom (an eased 0.8 s head turn)                   t_head
//   ./hb record _test_story_kit_extras --no-strict && ./hb still _test_story_kit_extras t_table+0.5 t_jump1+0.3 ...
const { storyKit, setKit } = require('../lib/story')
const KX = require('../lib/kit_extras')
const M = require('../lib/movie')

module.exports = {
  name: '_test_story_kit_extras',
  biome: 'minecraft:plains',
  botTimeout: 300,
  hideHand: true,
  hud: false,
  edit: { caption: 'story-kit extras' },
  cast: { Aunt: 'grandma_island', Kid: 'spare_boy', Mom: 'neighbour', Dad: 'grandpa_gullwick' },
  nameTags: ['Aunt'],
  shots: {
    // the tabletop from the south-east, a little above her: the heap, the mug, the aunt, the teacup in a row
    table: { at: [3.3, 3.0, 3.1], look: [1.3, 2.25, 0.6], fov: 44, push: 0, drift: 0, dof: false },
    // the wall: Mom at the stone, Dad on the bench to the right
    statue: { at: [11.0, 3.3, 7.5], look: [11.4, 2.8, -1.5], fov: 62, push: 0, drift: 0, dof: false }
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const { c, A } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    await c('/time set 6000')
    await c(`/fill ${A(-6, 1, -8)} ${A(20, 14, 12)} air`)
    await c(`/fill ${A(-6, -2, -8)} ${A(20, 0, 12)} grass_block`)
    // 1. the card table: 3 x 2 of top slabs (top at F + 2) under a white cloth; the kid's chair on the south side
    await c(`/fill ${A(0, 1, 0)} ${A(2, 1, 1)} spruce_slab[type=top]`)
    await c(`/fill ${A(0, 2, 0)} ${A(2, 2, 1)} white_carpet`)
    await c(`/setblock ${A(1, 1, 3)} spruce_stairs[facing=south]`)
    const top = F + 2 + 1 / 16
    const prop = async (name, dx, dz, o) => { for (const cmd of KX.propCommands(name, X + dx, top, Z + dz, o)) await c(cmd) }
    await prop('mug', 1.0, 0.55, { tag: 'mug' })
    await prop('teacup', 2.35, 0.75, { tag: 'cup' })
    await prop('heap', 0.45, 0.35, { tag: 'pile', h: 0.7 })
    await prop('cards', 1.7, 1.15, { tag: 'herfan', n: 6, yaw: 180 })
    await prop('cards', 1.4, 1.7, { tag: 'hisfan', n: 4 })
    // 2. the statue wall (stone, a cobbled deepslate wrinkle row) and 3. the bench (two oak stairs)
    await c(`/fill ${A(8, 1, -3)} ${A(15, 7, -3)} stone`)
    await c(`/fill ${A(9, 4, -3)} ${A(13, 4, -3)} cobbled_deepslate`)
    await c(`/fill ${A(13, 1, 0)} ${A(14, 1, 0)} oak_stairs[facing=north]`)
    // the cast: player actors; the aunt at minecraft:scale 0.3 (vanilla 1.20.5+ attribute)
    this.cast = await M.spawnActors(ctx, ['Aunt', 'Kid', 'Mom', 'Dad'])
    for (const n of ['Aunt', 'Kid', 'Mom', 'Dad']) await c(`/gamemode adventure ${n}`)
    await c('/attribute Aunt minecraft:scale base set 0.3')
    await M.place(ctx, 'Aunt', X + 1.6, top, Z + 0.65, 0, 0)
    await M.place(ctx, 'Kid', X + 1.5, F + 1.5, Z + 3.5, 180, 15)
    await M.place(ctx, 'Mom', X + 11.5, F + 1, Z - 1.6, 180, -20)
    await M.place(ctx, 'Dad', X + 13.5, F + 1.5, Z + 0.5, 0, 0)
    await ctx.tpCheck(X + 5, F + 1, Z + 8, 180, 0)
    await bot.waitForTicks(30)
    this.K = storyKit(ctx, { line: () => ({ dur: 1, gap: 0 }), gap: 0 }, { X, Z, F })
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { K, F } = this
    const wait = (n) => bot.waitForTicks(n)
    M.pose(ctx, 'Kid', 'sit')
    M.pose(ctx, 'Dad', 'sit')
    // 1. the table
    M.shot(ctx, 'table')
    ctx.mark('t_table')
    await wait(30)
    ctx.mark('t_aunt'); K.scale('Aunt', 0.286, { secs: 0.25 })   // "one inch less", eased
    await wait(25)
    // S02's jump cuts: the same locked-off frame, three sizes (at once, as the attribute does)
    ctx.mark('t_jump1'); K.scale('Aunt', 1.22); await wait(14)
    ctx.mark('t_jump2'); K.scale('Aunt', 0.8); await wait(14)
    ctx.mark('t_jump3'); K.scale('Aunt', 0.3); await wait(14)
    ctx.mark('t_kid'); K.scale('Kid', 0.986, { secs: 0.25 })
    await wait(25)
    // 2. the statue
    M.shot(ctx, 'statue')
    ctx.mark('t_statue')
    await wait(15)
    const head = [11.5, F + 2.6 - F, -1.6], stone = [11.5, 4.5, -2.45]
    ctx.mark('t_trail'); K.trail(head, stone, { secs: 1, dur: 20, color: [0.6, 0.6, 0.6] })
    await wait(30)
    ctx.mark('t_wrinkle'); K.setBlocks([9, 4, -3], [13, 4, -3], 'calcite')
    ctx.mark('t_skin1'); K.skin('Mom', 'spare_girl')
    await wait(20)
    ctx.mark('t_reverse'); K.trail(stone, head, { secs: 1, dur: 20, color: [0.6, 0.6, 0.6] })
    await wait(25)
    ctx.mark('t_skin2'); K.skin('Mom', 'miner_girl')
    await wait(15)
    // 3. Dad turns his head to Mom, eased over 0.8 s
    ctx.mark('t_head'); M.headTo(ctx, 'Dad', 'Mom', { secs: 0.8 })
    await wait(40)
    return true
  }
}
