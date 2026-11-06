// "1 in a million landing... x6 😳" (~30 s, escalating): the 1x1 water hole, six drops from a
// glass block: 30, 60, 100, 150 and 200 blocks land; 250 blocks (clouds off: the fall crosses the cloud layer)
// misses by a block (death screen, "HelloBuh hit the ground too hard").
const DROPS = [   // six drops, ~30 s (owner: 30 s minimum); the last misses by a block
  { h: 30, off: 0, sub: '30 blocks' },
  { h: 60, off: 0, sub: '60 blocks' },
  { h: 100, off: 0, sub: '100 blocks' },
  { h: 150, off: 0, sub: '150 blocks' },
  { h: 200, off: 0, sub: '200 blocks' },
  { h: 250, off: 1.6, sub: '250 blocks...' }
]

module.exports = {
  name: 'drops',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 in a million landing... x6 😳',
  edit: {
    caption: '1 in a million landing... x6 😳', red: 'x6', song: 'songs/misery.mp3', dropAt: 'drop', startAt: 'drop:-0.4',
    subs: DROPS.map((d, i) => ['drop', d.sub, 1.8, i]), deathScreen: true, endAfter: 'death:1.1'
  },
  expectDeath: true,
  clouds: false,                // the 200-250 block falls cross y 192: the camera went through a white cloud wall

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
    const H = Math.min(DROPS[DROPS.length - 1].h + 4, 318 - floor)
    for (let y0 = floor + 1; y0 <= floor + H; y0 += 40) await ctx.cmd(`/fill ${x - 2} ${y0} ${z - 2} ${x + 2} ${Math.min(y0 + 39, floor + H)} ${z + 2} air`)
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
      const gx = x + Math.floor(0.5 + d.off)        // the glass sits under the bot (the offset drop missed its block and fell)
      await ctx.cmd(`/setblock ${gx} ${top} ${z} glass`)
      // on the glass, looking straight down. A fast tp: tpCheck's 1 s settle was a 1.8 s still between drops
      const tx = x + 0.5 + d.off, ty = top + 1, tz = z + 0.5
      for (let a = 0; ; a++) {
        bot.chat(`/tp @s ${tx} ${ty} ${tz} 0 89`)
        let ok = false
        for (let t = 0; t < 10 && !ok; t++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.y - ty) < 0.1 && Math.abs(bot.entity.position.x - tx) < 0.1 }
        if (ok) { await bot.waitForTicks(1); if (Math.abs(bot.entity.position.y - ty) < 0.1) break }
        if (a === 4) throw new Error('teleport did not stick')
      }
      bot.chat('/effect give @s instant_health 1 5 true')
      await bot.waitForTicks(4)
      ctx.mark('drop', { n: i, h: d.h }); ctx.sound('block.glass.break', 1)
      ctx.particles('block', { x: gx, y: top, z }, { block: 'glass' })
      await ctx.cmd(`/setblock ${gx} ${top} ${z} air`)
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
      await bot.waitForTicks(4)
      await ctx.easeLook(bot.entity.yaw, 0.9, 450)                       // look up: from up there?!
    }
    for (let k = 0; k < 40 && !ctx.died; k++) await bot.waitForTicks(1)
    await bot.waitForTicks(50)                                           // the death screen
    return ctx.died
  }
}
