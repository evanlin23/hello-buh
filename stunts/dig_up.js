// "never dig straight up 💀" (pairs with cave_reveal's "never dig straight down"): a torch-lit
// strip-mine tunnel, the bot finds a diamond, feels great, mines the block above its head...
// and a lava pocket pours in. Death screen: "HelloBuh tried to swim in lava".
module.exports = {
  name: 'dig_up',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'never dig straight up 💀',
  edit: { caption: 'never dig straight up 💀', red: 'never', song: 'songs/funk_abnormal.mp3', dropAt: 'opened', onFire: 'hurt:death', deathScreen: true , endAfter: 'death:1.8'},
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    const y = g.y - 14                                        // tunnel floor (feet level)
    this.x = x; this.z = z; this.y = y
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 6} ${y - 3} ${z - 14} ${x + 6} ${y + 6} ${z + 3} stone`)
    // ores scattered through the rock (some show in the tunnel walls)
    let seed = 3
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const ores = ['coal_ore', 'coal_ore', 'iron_ore', 'copper_ore', 'iron_ore', 'gold_ore', 'redstone_ore', 'lapis_ore']
    for (let i = 0; i < 30; i++) {
      const ox = x + (rnd() < 0.5 ? -1 : 1), oy = y + Math.floor(rnd() * 2), oz = z - Math.floor(rnd() * 12)
      await ctx.cmd(`/setblock ${ox} ${oy} ${oz} ${ores[Math.floor(rnd() * ores.length)]}`)
    }
    await ctx.cmd(`/fill ${x} ${y} ${z - 12} ${x} ${y + 1} ${z + 2} air`)          // the tunnel
    await ctx.cmd(`/setblock ${x} ${y} ${z - 13} stone`)
    await ctx.cmd(`/setblock ${x + 1} ${y + 1} ${z - 6} diamond_ore`)               // the find
    for (const dz of [1, -4, -10]) await ctx.cmd(`/setblock ${x - 1} ${y + 1} ${z + dz} wall_torch[facing=east]`)
    // the lava pocket over the spot the bot will stand
    this.sz = z - 7
    await ctx.cmd(`/fill ${x - 1} ${y + 3} ${this.sz - 2} ${x + 1} ${y + 4} ${this.sz + 2} lava`)
    await ctx.hotbar(['diamond_pickaxe', ['torch', 40], ['cobblestone', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, y, z + 1.5, 180, 0)
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s haste infinite 2 true')   // strip-mining pace (no particles)
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, y } = this
    await bot.waitForTicks(8)
    // strip-mining along
    ctx.log('start', bot.entity.position.toString(), 'yaw', bot.entity.yaw.toFixed(2), 'ahead', bot.blockAt(bot.entity.position.offset(0, 0, -1)).name, bot.blockAt(bot.entity.position.offset(0, 1, -1)).name)
    bot.setControlState('forward', true)
    for (let i = 0; i < 120 && bot.entity.position.z > this.z - 5.2; i++) { await bot.waitForTicks(1); if (i % 30 === 29) ctx.log('walk', bot.entity.position.toString()) }
    bot.setControlState('forward', false)
    // the diamond
    const d = bot.blockAt(new Vec3(x + 1, y + 1, this.z - 6))
    await ctx.easeLookAt(d.position.offset(0.5, 0.5, 0.5), 500)
    ctx.mark('diamond')
    // a few swings, then the server breaks it with drops (bot.dig took ~3 s here even with haste)
    for (let i = 0; i < 4; i++) { bot.swingArm(); ctx.sound('block.stone.hit', 0.5, 0.5); await bot.waitForTicks(2) }
    bot.chat(`/setblock ${d.position.x} ${d.position.y} ${d.position.z} air destroy`)
    ctx.sound('block.stone.break', 1); ctx.particles('block', d.position, { block: 'diamond_ore' })
    ctx.sound('entity.experience_orb.pickup', 0.8)
    await bot.waitForTicks(6)
    await ctx.easeLook(0, -0.05, 300)                         // back down the tunnel
    // one more step, then up
    bot.setControlState('forward', true)
    for (let i = 0; i < 80 && bot.entity.position.z > this.sz + 0.6; i++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)
    await bot.waitForTicks(4)
    const up = bot.blockAt(new Vec3(x, y + 2, Math.floor(bot.entity.position.z)))   // right above the head
    await ctx.easeLookAt(up.position.offset(0.5, 0, 0.5), 600)
    try { await bot.dig(up, true) } catch (e) { ctx.log('dig', e.message) }
    ctx.sound('block.stone.break', 1); ctx.particles('block', up.position, { block: 'stone' })
    ctx.mark('opened')
    ctx.sound('block.lava.pop', 1)
    // frozen, staring up as it pours down (lava spreads a block every 30 ticks, so it takes a
    // moment), then panicking in place; in lava you barely move anyway
    for (let i = 0; i < 70 && !ctx.died; i++) await bot.waitForTicks(1)
    const yaw = bot.entity.yaw
    for (const [dy, p] of [[0.6, 0.2], [-0.7, 0.1], [0.3, -0.3]]) { if (!ctx.died) await ctx.easeLook(yaw + dy, p, 450) }
    for (let i = 0; i < 160 && !ctx.died; i++) await bot.waitForTicks(1)
    await bot.waitForTicks(50)                                // the death screen
    return ctx.died
  }
}
