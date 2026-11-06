// "1 in a million landing... x3 😳" (~14 s, escalating): the 1x1 water hole, three drops from a
// glass block: 30 blocks (lands), 80 blocks (lands), 160 blocks, falling through the cloud
// layer (misses by a block: death screen, "HelloBuh hit the ground too hard").
const DROPS = [
  { h: 30, off: 0, sub: '30 blocks' },
  { h: 80, off: 0, sub: '80 blocks' },
  { h: 160, off: 1.6, sub: '160 blocks...' }
]

module.exports = {
  name: 'drops',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 in a million landing... x3 😳',
  edit: {
    caption: '1 in a million landing... x3 😳', red: 'x3', song: 'songs/misery.mp3', dropAt: 'drop', startAt: 'drop:-1.0',
    subs: DROPS.map((d, i) => ['drop', d.sub, 1.8, i]), deathScreen: true, endAfter: 'death:1.8'
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    const R = 10
    await ctx.cmd(`/fill ${x - R} ${floor - 3} ${z - R} ${x + R} ${floor - 1} ${z + R} dirt`)
    await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R} grass_block`)
    for (let y0 = floor + 1; y0 <= floor + 164; y0 += 40) await ctx.cmd(`/fill ${x - 2} ${y0} ${z - 2} ${x + 2} ${Math.min(y0 + 39, floor + 164)} ${z + 2} air`)
    await ctx.cmd(`/fill ${x - R} ${floor + 1} ${z - R} ${x + R} ${floor + 8} ${z + R} air`)
    await ctx.cmd(`/setblock ${x} ${floor} ${z} water`)
    await ctx.cmd(`/setblock ${x} ${floor - 1} ${z} stone`)
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16], 'diamond_pickaxe'])
    await ctx.cmd('/gamemode survival')
    await bot.waitForTicks(10)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor } = this
    for (let i = 0; i < DROPS.length; i++) {
      const d = DROPS[i], top = floor + d.h
      await ctx.cmd(`/setblock ${x} ${top} ${z} glass`)
      await ctx.tpCheck(x + 0.5 + d.off, top + 1, z + 0.5, 0, 89)       // on the glass, looking straight down
      await ctx.cmd(`/effect give @s instant_health 1 5 true`)
      await bot.waitForTicks(8)
      ctx.mark('drop', { n: i, h: d.h }); ctx.sound('block.glass.break', 1)
      ctx.particles('block', { x, y: top, z }, { block: 'glass' })
      await ctx.cmd(`/setblock ${x} ${top} ${z} air`)
      let splashed = false
      for (let k = 0; k < 260 && !ctx.died; k++) {
        await bot.waitForTicks(1)
        if (!splashed && bot.entity.position.y < floor + 1.2) {
          splashed = true
          if (!d.off) { ctx.mark('splash', { n: i }); ctx.sound('entity.player.splash.high_speed'); ctx.particles('splash', { x: x + 0.5, y: floor + 0.95, z: z + 0.5 }, { count: 30 }) }
        }
        if (splashed && k > 4 && (bot.entity.onGround || bot.entity.isInWater)) break
      }
      if (ctx.died) break
      await bot.waitForTicks(10)
      await ctx.easeLook(bot.entity.yaw, 0.9, 500)                       // look up: from up there?!
      await bot.waitForTicks(6)
    }
    for (let k = 0; k < 40 && !ctx.died; k++) await bot.waitForTicks(1)
    await bot.waitForTicks(50)                                           // the death screen
    return ctx.died
  }
}
