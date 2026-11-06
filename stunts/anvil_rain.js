// "minecraft but it rains anvils 💀": anvils start dropping out of the sky around the bot. It
// dodges, strafes and sprints between them... until one lands right on it. Death screen:
// "HelloBuh was squashed by a falling anvil". Falling anvils are real falling_block entities.
module.exports = {
  name: 'anvil_rain',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'minecraft but it rains anvils 💀',
  edit: { caption: 'minecraft but it rains anvils 💀', red: 'anvils', song: 'songs/funk_abnormal.mp3', dropAt: 'rain', deathScreen: true , startAt: 'rain:0.2', endAfter: 'death:1.8'},
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
    // /fill caps at 32768 blocks: clear the air in slabs
    for (let y0 = floor + 1; y0 <= floor + 26; y0 += 12) await ctx.cmd(`/fill ${x - R} ${y0} ${z - R} ${x + R} ${Math.min(y0 + 11, floor + 26)} ${z + R} air`)
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
    const H = 14   // anvils from 22 up were dots that barely moved; 14 reads (and lands in ~1.4 s)
    let seed = 5
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const landed = (o, n) => { if (n && /anvil/.test(n.name) && !(o && /anvil/.test(o.name))) ctx.sound('block.anvil.land', 0.5, 0.9 + rnd() * 0.2) }
    bot.on('blockUpdate', landed)
    const drop = (ax, az) => bot.chat(`/summon falling_block ${ax.toFixed(1)} ${this.floor + H} ${az.toFixed(1)} {BlockState:{Name:"minecraft:anvil"},Time:1,HurtEntities:1b,FallHurtAmount:2f,FallHurtMax:40}`)
    await bot.waitForTicks(10)
    await ctx.easeLook(Math.PI, 0.6, 600)                     // something in the sky?
    ctx.mark('rain')
    // the rain: a few anvils every few ticks, mostly in front of the camera so they land in shot,
    // never close to the bot
    let n = 0
    const rain = () => {
      if (n++ % 3) return
      const p = bot.entity.position, yaw = bot.entity.yaw
      for (let k = 0; k < 2; k++) {
        // 9-15 blocks out and inside the view cone: with the camera pitched ~0.3 up, an anvil from 14
        // up is in frame for its whole fall (closer ones started above the top edge, so they seemed
        // to pop onto the ground: "the anvils aren't actually falling")
        const a = yaw + Math.PI + (rnd() - 0.5) * (rnd() < 0.8 ? 1.1 : 2.2), d = 9 + rnd() * 6
        drop(p.x - Math.sin(a + Math.PI) * d, p.z - Math.cos(a + Math.PI) * d)
      }
    }
    bot.on('physicsTick', rain)
    // frozen in place, looking around as they slam down; the pitch stays 0.2-0.4 up so each anvil
    // is seen from the sky to the ground. One quick sidestep.
    await ctx.easeLook(Math.PI, 0.35, 500)                    // they're coming down
    await ctx.easeLook(Math.PI + 0.35, 0.25, 800)
    await ctx.easeLook(Math.PI + 0.7, 0.3, 900)
    await ctx.easeLook(Math.PI + 0.2, 0.4, 800)
    bot.setControlState('left', true); await bot.waitForTicks(6); bot.setControlState('left', false)
    await ctx.easeLook(Math.PI - 0.6, 0.25, 900)
    await ctx.easeLook(Math.PI - 0.2, 0.3, 800)
    bot.removeListener('physicsTick', rain)
    await bot.waitForTicks(30)                                // let the last ones land
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
