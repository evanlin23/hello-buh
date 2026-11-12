// The gui_tags engine piece's live test (docs/engine_features.md "Trade screen, tooltip, caption chunks, hidden name
// tags"; docs/engine_briefs/gui_tags.md): on a real server,
//   - two player actors stand in front of the camera with vanilla player names on (stunt.playerNames): Pia's plate
//     shows, Jonah's doesn't (lib/hb/test/fixtures/gui_tags_story/story.json cast "Giant": "name_tag": false, as The
//     Honey Thief's);
//   - the bot opens a librarian's trade screen (K.trade), selects the Frost Walker II book (K.pick: the server moves
//     27 emeralds and a book into the payment slots), hovers the result (K.hover: the tooltip "Enchanted Book" /
//     "Frost Walker II"), with "Frost Walker II" also as a caption chunk in the key colour (K.onscreen, 1.3 s), then
//     completes the trade and closes the screen, as The Walk's S10.
// Marks to look at: t_tags, t_open, t_tip, t_traded, t_closed.
//   ./hb record _test_gui_tags --no-strict && PREVIEW_W=1080 scripts/preview.sh _test_gui_tags
const path = require('path')
const { storyKit } = require('../lib/story')
const M = require('../lib/movie')

const STUB = { gap: 0, ids: [], line () { throw new Error('_test_gui_tags has no lines') } }

module.exports = {
  name: '_test_gui_tags',
  biome: 'minecraft:plains',
  botTimeout: 240,
  renderDistance: 4, recordRadius: 32,
  hideHand: false,
  playerNames: true,
  cast: { Jonah: 'kai', Pia: 'alex' },
  edit: { caption: 'gui tags test', story: path.join('lib', 'hb', 'test', 'fixtures', 'gui_tags_story') },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    await ctx.defaultRules()
    await ctx.cmd('/gamerule log_admin_commands false')
    await bot.waitForChunksToLoad()
    await ctx.cmd(`/fill ${X - 8} ${F + 1} ${Z - 8} ${X + 8} ${F + 6} ${Z + 12} air`)
    await ctx.cmd(`/fill ${X - 8} ${F - 3} ${Z - 8} ${X + 8} ${F - 1} ${Z + 12} dirt`)
    await ctx.cmd(`/fill ${X - 8} ${F} ${Z - 8} ${X + 8} ${F} ${Z + 12} grass_block`)
    await ctx.cmd(`/kill @e[type=!player,x=${X},y=${F},z=${Z},distance=..40]`)
    await ctx.cmd(`/setblock ${X + 3} ${F + 1} ${Z + 3} lectern[facing=west]`)
    // a Novice librarian: paper for an emerald, and The Walk's book (27 emeralds + a book -> Frost Walker II)
    const book = '{id:"minecraft:enchanted_book",count:1,components:{"minecraft:stored_enchantments":{"minecraft:frost_walker":2}}}'
    await ctx.cmd(`/summon villager ${X + 2.5} ${F + 1} ${Z + 3.5} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Rotation:[90f,0f],Tags:["librarian"],VillagerData:{type:"minecraft:plains",profession:"minecraft:librarian",level:1},Xp:0,Offers:{Recipes:[{buy:{id:"minecraft:paper",count:24},sell:{id:"minecraft:emerald",count:1},maxUses:16,xp:2,rewardExp:1b},{buy:{id:"minecraft:emerald",count:27},buyB:{id:"minecraft:book",count:1},sell:${book},maxUses:12,xp:1,rewardExp:1b},{buy:{id:"minecraft:emerald",count:9},sell:{id:"minecraft:bookshelf",count:1},maxUses:12,xp:1,rewardExp:1b}]}}`)
    this.cast = await M.spawnActors(ctx, ['Jonah', 'Pia'])
    await M.place(ctx, 'Jonah', X - 1.2, F + 1, Z + 4.5, 180)
    await M.place(ctx, 'Pia', X + 0.4, F + 1, Z + 4.5, 180)
    await ctx.cmd('/gamemode survival')
    await ctx.tpCheck(X - 0.5, F + 1, Z + 0.5, 0, 5)
    await bot.waitForChunksToLoad()
    await bot.waitForTicks(20)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { X, Z, F } = this
    const { bot } = ctx
    const K = storyKit(ctx, STUB, { X, Z, F }, { warm: null })
    const run = async (n) => { for (let k = 0; k < n; k++) { K.look(k); await bot.waitForTicks(1) } }
    // the two actors: Pia's name over her head, Jonah's hidden
    await K.aimAt(new ctx.Vec3(X - 0.4, F + 2.2, Z + 4.5))
    ctx.mark('t_tags')
    await run(30)
    const lib = bot.nearestEntity(e => e.name === 'villager')
    if (!lib) throw new Error('no librarian')
    const v = await K.trade(lib)
    ctx.mark('t_open')
    await run(8)
    await K.pick(v, 1)
    K.hover('result')
    K.onscreen('Frost Walker II', { hold: 1.3 })
    ctx.mark('t_tip')
    await run(22)
    await K.takeResult(v)
    ctx.mark('t_traded')
    await run(8)
    K.hover(null)
    K.close(v)
    ctx.mark('t_closed')
    await run(20)
    const boots = bot.inventory.items().find(it => it.name === 'enchanted_book')
    ctx.log(boots ? '_test_gui_tags: traded for the book OK' : '_test_gui_tags: no book in the inventory after the trade')
    M.quitActors(ctx)
    return !!boots
  }
}
