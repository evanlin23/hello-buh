// "1 in a million landing 😳": 100 blocks up on a single glass block above a 1x1 water hole.
// The block vanishes and the bot falls straight down into the hole (vanilla: landing in water
// cancels fall damage). Looking down the whole way, the tiny target grows.
const HEIGHT = Number(process.env.FALL_HEIGHT || 100)

module.exports = {
  name: 'one_in_a_million',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 in a million landing 😳',
  edit: { caption: '1 in a million landing 😳', song: 'songs/misery.mp3', dropAt: 'splash' , startAt: 'drop:-1.2', endAfter: 'splash:0.9'},

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    const R = 12
    await ctx.cmd(`/fill ${x - R} ${floor - 3} ${z - R} ${x + R} ${floor - 1} ${z + R} dirt`)
    await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R} grass_block`)
    for (let y0 = floor + 1; y0 <= floor + HEIGHT + 4; y0 += 30) await ctx.cmd(`/fill ${x - R} ${y0} ${z - R} ${x + R} ${Math.min(y0 + 29, floor + HEIGHT + 4)} ${z + R} air`)
    // the 1x1 hole: one block deep, water source
    await ctx.cmd(`/setblock ${x} ${floor} ${z} water`)
    await ctx.cmd(`/setblock ${x} ${floor - 1} ${z} stone`)
    this.top = floor + HEIGHT
    await ctx.cmd(`/setblock ${x} ${this.top} ${z} glass`)
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16], 'diamond_pickaxe'])
    await ctx.tpCheck(x + 0.5, this.top + 1, z + 0.5, 0, 30)
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    await bot.waitForTicks(14)
    await ctx.easeLook(0.6, -0.4, 500)                      // look around: very high up
    await ctx.easeLook(-0.6, -0.6, 600)
    // down at the tiny hole, slightly off straight-down so the target sits just above the crosshair
    // (retention review: dead centre, the 4 px hole hid under the crosshair until the last second)
    await ctx.easeLook(bot.entity.yaw, -Math.PI / 2 + 0.1, 700)
    await bot.waitForTicks(4)                              // no held shot before the drop (beat audit: 0.5 s PAUSE)
    ctx.mark('drop'); ctx.sound('block.glass.break', 1)
    ctx.particles('block', { x: this.x, y: this.top, z: this.z }, { block: 'glass' })
    await ctx.cmd(`/setblock ${this.x} ${this.top} ${this.z} air`)
    let splashed = false
    for (let i = 0; i < 200 && !ctx.died; i++) {
      await bot.waitForTicks(1)
      if (!splashed && bot.entity.position.y < this.floor + 1.2) {
        splashed = true; ctx.mark('splash'); ctx.sound('entity.player.splash.high_speed')
        ctx.particles('splash', { x: this.x + 0.5, y: this.floor + 0.95, z: this.z + 0.5 }, { count: 30 })
      }
      if (splashed && i > 4 && (bot.entity.onGround || bot.entity.isInWater)) break
    }
    // straight into a look-up: a held shot on the water after the splash read as a freeze (review:
    // 0.8 s frozen); the Short ends ~0.9 s after the splash, mid-move
    await ctx.easeLook(bot.entity.yaw + 0.5, -0.35, 900)
    await bot.waitForTicks(6)
    return splashed && !ctx.died
  }
}
