// "minecraft but it rains anvils 💀": anvils start dropping out of the sky around the bot. It
// dodges, strafes and sprints between them... until one lands right on it. Death screen:
// "HelloBuh was squashed by a falling anvil". Falling anvils are real falling_block entities.
module.exports = {
  name: 'anvil_rain',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'minecraft but it rains anvils 💀',
  edit: { caption: 'minecraft but it rains anvils 💀', red: 'anvils', song: 'songs/funk_abnormal.mp3', dropAt: 'rain', start: 0.5, deathScreen: true },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    const R = 18
    await ctx.cmd(`/fill ${x - R} ${floor + 1} ${z - R} ${x + R} ${floor + 26} ${z + R} air`)
    await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R} grass_block`)
    await ctx.cmd(`/fill ${x - R} ${floor - 3} ${z - R} ${x + R} ${floor - 1} ${z + R} dirt`)
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, -5)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const H = 22
    let seed = 5
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const landed = (o, n) => { if (n && /anvil/.test(n.name) && !(o && /anvil/.test(o.name))) ctx.sound('block.anvil.land', 0.5, 0.9 + rnd() * 0.2) }
    bot.on('blockUpdate', landed)
    const drop = (ax, az) => bot.chat(`/summon falling_block ${ax.toFixed(1)} ${this.floor + H} ${az.toFixed(1)} {BlockState:{Name:"minecraft:anvil"},Time:1,HurtEntities:1b,FallHurtAmount:2f,FallHurtMax:40}`)
    await bot.waitForTicks(10)
    await ctx.easeLook(Math.PI, 0.6, 600)                     // something in the sky?
    ctx.mark('rain')
    // the rain: a few anvils every few ticks, never within 1.6 blocks of where the bot will be
    let n = 0
    const rain = () => {
      if (n++ % 3) return
      const p = bot.entity.position, v = bot.entity.velocity
      for (let k = 0; k < 2; k++) {
        const a = rnd() * Math.PI * 2, d = 1.8 + rnd() * 7
        const ax = p.x + v.x * 10 + Math.cos(a) * d, az = p.z + v.z * 10 + Math.sin(a) * d
        drop(ax, az)
      }
    }
    bot.on('physicsTick', rain)
    await ctx.easeLook(Math.PI, -0.15, 500)
    // dodge: sprint, strafe, turn
    bot.setControlState('sprint', true); bot.setControlState('forward', true)
    await ctx.easeLook(Math.PI + 0.8, -0.1, 900)
    bot.setControlState('left', true); await ctx.easeLook(Math.PI - 0.4, -0.05, 900); bot.setControlState('left', false)
    await ctx.easeLook(Math.PI - 1.4, -0.1, 900)
    bot.setControlState('right', true); await ctx.easeLook(Math.PI - 0.6, 0.2, 800); bot.setControlState('right', false)
    bot.setControlState('forward', false); bot.setControlState('sprint', false)
    bot.removeListener('physicsTick', rain)
    // phew... then the one with its name on it
    await ctx.easeLook(bot.entity.yaw, -0.2, 500)
    ctx.mark('phew')
    const p = bot.entity.position
    drop(p.x, p.z)
    await ctx.easeLook(bot.entity.yaw, 1.3, 700)              // look up: oh no
    for (let i = 0; i < 80 && !ctx.died; i++) await bot.waitForTicks(1)
    await bot.waitForTicks(50)                                // the death screen
    bot.removeListener('blockUpdate', landed)
    return ctx.died
  }
}
