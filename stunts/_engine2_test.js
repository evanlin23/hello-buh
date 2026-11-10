// The live test of the visual audit's engine items (docs/engine_features.md "Potions, phone-readable screens, K.blink,
// the Darkness phase, lightning light"): on a real server
//   - potions in the hotbar and a barrel: the harness records each potion's potion_contents colour (the log prints the
//     component as mineflayer gives it), edit.py tints the overlay (t_hud, t_bar)
//   - a chat line (t_chat) for edit.chatScale
//   - a lightning mark at night (t_bolt): lights the world on an engine-3 recording without look.smoothLight
//   - a wolf actor blinks from behind the player to beside him (t_blink): K.blink, a teleport_ok mark, no cut
//   - the Darkness with K.darkPeak(30): the pulse peaks 30 ticks after t_dark
//   ./hb record _engine2_test && ./hb still _engine2_test t_bolt+0.15 t_blink-0.2 t_blink+0.3 ...
const { storyKit, setKit } = require('../lib/story')

const POTIONS = [
  'potion[potion_contents={potion:"minecraft:fire_resistance"}]',
  'splash_potion[potion_contents={potion:"minecraft:weakness"}]',
  'potion[potion_contents={potion:"minecraft:strong_turtle_master"}]',
  'lingering_potion[potion_contents={potion:"minecraft:poison"}]',
  'tipped_arrow[potion_contents={potion:"minecraft:healing"}] 16',
  'potion',
  'potion[potion_contents={custom_color:16711935}]',
  'golden_apple 3',
  'oak_planks 64'
]

module.exports = {
  name: '_engine2_test',
  biome: 'minecraft:plains',
  botTimeout: 300,
  hideHand: false,
  edit: { caption: 'engine test', guiScale: 4, chatScale: 5 },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const { c, A, mob } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    await c(`/fill ${A(-12, 1, -12)} ${A(12, 8, 12)} air`)
    await c(`/fill ${A(-12, 0, -12)} ${A(12, 0, 12)} grass_block`)
    await c(`/setblock ${A(0, 1, -3)} barrel[facing=south]`)
    for (let i = 0; i < POTIONS.length; i++) await c(`/item replace block ${A(0, 1, -3)} container.${i} with ${POTIONS[i]}`)
    await c(`/setblock ${A(3, 1, -6)} lantern`)
    await mob('wolf', 0.5, 1, 12.5, 180, ['dog'], 'Owner:[I;0,0,0,1],CollarColor:14b')
    await c('/clear @s')
    for (let i = 0; i < POTIONS.length; i++) await c(`/item replace entity @s hotbar.${i} with ${POTIONS[i]}`)
    await ctx.tpCheck(X + 0.5, F + 1, Z + 0.5, 180, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(30)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const S = { line: () => ({ dur: 1, gap: 0 }), gap: 0 }
    const K = storyKit(ctx, S, { X, Z, F })
    const shape = (it) => it ? JSON.stringify({ name: it.name, components: it.components }) : '-'
    ctx.log('component shape (hotbar 0):', shape(bot.inventory.slots[36]))
    ctx.log('component shape (hotbar 6):', shape(bot.inventory.slots[42]))
    K.actor('dog', { x: 0.5, y: 1, z: 12.5, yaw: 180 })
    ctx.mark('t_hud'); await bot.waitForTicks(20)
    const w = await K.open(K.P(0, 1, -3))
    await bot.waitForTicks(4)
    ctx.log('component shape (barrel 0):', shape(w.slots[0]))
    ctx.mark('t_bar'); await bot.waitForTicks(30)
    K.close(w); await bot.waitForTicks(10)
    ctx.mark('syschat', { text: 'Buh left the game', color: 'yellow' })
    ctx.mark('t_chat'); await bot.waitForTicks(30)
    K.setTime(18000); await bot.waitForTicks(10)
    await K.aimAt(K.P(0.5, 1.6, -8))
    ctx.mark('lightning', { x: X + 4.5, y: F + 1, z: Z - 9.5 })
    ctx.mark('t_bolt'); await bot.waitForTicks(30)
    K.setTime(6000); await bot.waitForTicks(10)
    const to = await K.blink('dog', { x: 1.5, y: 1, z: -2.5, yaw: 0 })
    ctx.log('blink to', JSON.stringify(to))
    ctx.mark('t_blink'); await bot.waitForTicks(30)
    await ctx.cmd('/effect give @s minecraft:darkness 10 0 true')
    K.darkPeak(30)
    ctx.mark('t_dark'); await bot.waitForTicks(100)
    const tint = (bot.inventory.slots[36] && bot.inventory.slots[36].components) || []
    const ok = tint.some(x => /potion_contents/.test(String(x.type)))
    ctx.log(ok ? 'engine2 test OK' : 'engine2 test: no potion_contents component on the hotbar potion')
    return true
  }
}
