// "POV: the floor is TNT 💀": a wave of TNT going off across a field, coming straight at the bot.
// The bot backs away watching it (moving follows the view, so it can't sprint and look back), the
// blasts gain a little every second... and the last one catches it. Death screen.
module.exports = {
  name: 'tnt_run',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: the floor is TNT 💀',
  edit: { caption: 'POV: the floor is TNT 💀', red: 'TNT', song: 'songs/funk_abnormal.mp3', dropAt: 'wave', start: 0.4, deathScreen: true, endAfter: 'death:1.8' },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let y0 = floor + 1; y0 <= floor + 12; y0 += 6) await ctx.cmd(`/fill ${x - 12} ${y0} ${z - 30} ${x + 12} ${y0 + 5} ${z + 30} air`)
    await ctx.cmd(`/fill ${x - 12} ${floor} ${z - 30} ${x + 12} ${floor} ${z + 30} grass_block`)
    await ctx.cmd(`/fill ${x - 12} ${floor - 4} ${z - 30} ${x + 12} ${floor - 1} ${z + 30} dirt`)
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 8)          // facing north: the wave comes from there
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, floor } = this
    let front = this.z - 18, n = 0
    // every 3 ticks a primed TNT (10-tick fuse) lands at the wave front, a little wider each time;
    // the front advances 1 block per 3 ticks (~6.7 b/s) and the bot backs off at ~4.3 b/s
    const wave = () => {
      if (n++ % 3) return
      const w = 2 + Math.min(4, Math.floor(n / 30))
      const pz = bot.entity.position.z
      if (pz - front < 4) {   // caught up (the blasts knock the bot back, so it'd escape otherwise)
        const px = bot.entity.position.x
        for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1]]) bot.chat(`/summon tnt ${(px + dx).toFixed(1)} ${floor + 1} ${(pz + dz).toFixed(1)} {fuse:6}`)
        front = pz - 1
        return
      }
      for (const dx of [-w, 0, w]) bot.chat(`/summon tnt ${x + dx + 0.5} ${floor + 1} ${front + 0.5} {fuse:10}`)
      front += 1
    }
    await bot.waitForTicks(10)
    ctx.mark('wave')
    bot.on('physicsTick', wave)
    await bot.waitForTicks(14)
    bot.setControlState('back', true)
    for (let i = 0; i < 240 && !ctx.died; i++) {
      await bot.waitForTicks(1)
      if (i % 30 === 0) ctx.easeLook(Math.PI + (i % 60 ? 0.15 : -0.15), -0.05, 600)
    }
    bot.setControlState('back', false)
    bot.removeListener('physicsTick', wave)
    await bot.waitForTicks(50)                                   // the death screen
    return ctx.died
  }
}
