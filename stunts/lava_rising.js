// "the lava stopped 1 block below me 😳": the floor is lava and it's rising. The bot pillars up
// (jump + place under its feet, a real survival pillar) while the lava climbs a layer every 16
// ticks... the bot runs out of nerve, looks down, and the lava stops exactly one block below it.
const LAYERS = 11

module.exports = {
  name: 'lava_rising',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the lava stopped 1 block below me 😳',
  edit: { caption: 'the lava stopped 1 block below me 😳', red: '1 block', song: 'songs/misery.mp3', dropAt: 'stopped', start: 0.5 },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    const R = 20
    await ctx.cmd(`/fill ${x - R} ${floor + 1} ${z - R} ${x + R} ${floor + 16} ${z + R} air`)
    await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R} grass_block`)
    await ctx.cmd(`/fill ${x - R} ${floor - 3} ${z - R} ${x + R} ${floor - 1} ${z + R} dirt`)
    this.R = R
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16], 'water_bucket'])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 20)
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor, R } = this
    let layer = 0, t = 0, rising = false
    const rise = () => {
      if (!rising || t++ < 30 || t % 16) return            // a head start, then a layer per 16 ticks
      if (layer >= LAYERS) return
      const y = floor + 1 + layer++
      bot.chat(`/fill ${x - R} ${y} ${z - R} ${x + R} ${y} ${z + R} lava replace air`)
      ctx.sound('block.lava.pop', 1, 0.8 + (layer % 3) * 0.1)
      if (layer === LAYERS) ctx.mark('stopped')
    }
    bot.on('physicsTick', rise)
    await bot.waitForTicks(8)
    await ctx.easeLook(Math.PI, -0.2, 500)
    rising = true; ctx.mark('rising')
    ctx.sound('block.lava.ambient', 1)
    await ctx.easeLook(Math.PI, -0.95, 600)                   // look down and out: pillar!
    // pillar: jump, and at the top of the jump place cobblestone where the feet were
    for (let k = 0; k < LAYERS; k++) {
      const base = floor + k                                   // block we stand on
      bot.setControlState('jump', true)
      ctx.easeLook(Math.PI + 0.35 * Math.sin(k * 0.7), -0.95 - 0.1 * Math.cos(k * 0.5), 500)   // keep glancing at the lava sea
      for (let i = 0; i < 20 && bot.entity.position.y < base + 2.1; i++) await bot.waitForTicks(1)
      bot.setControlState('jump', false)
      bot._client.write('block_place', { hand: 0, location: { x, y: base, z }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.stone.place', 1, 0.9)
      for (let i = 0; i < 20 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
    }
    ctx.mark('top')
    // nerves: look around at the lava sea, then down as the last layers come up
    await ctx.easeLook(Math.PI + 0.9, -0.35, 900)
    await ctx.easeLook(Math.PI - 0.9, -0.4, 1100)
    await ctx.easeLook(Math.PI, -1.35, 700)
    for (let i = 0; i < 200 && layer < LAYERS; i++) await bot.waitForTicks(1)
    await bot.waitForTicks(30)
    bot.removeListener('physicsTick', rise)
    await ctx.easeLook(Math.PI + 0.4, -0.2, 900)
    await bot.waitForTicks(12)
    return !ctx.died && bot.entity.position.y > floor + LAYERS
  }
}
