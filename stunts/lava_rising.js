// "the lava stopped 1 block below me 😳": the floor is lava and it's rising. The bot pillars up
// (jump + place under its feet, a real survival pillar) while the lava climbs a layer every 16
// ticks... the bot runs out of nerve, looks down, and the lava stops exactly one block below it.
const LAYERS = 9          // pillar blocks placed; the lava stops LAYERS - 1 layers up, one block under the feet' block

module.exports = {
  name: 'lava_rising',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the lava stopped 1 block below me 😳',
  edit: { caption: 'the lava stopped 1 block below me 😳', red: '1 block', song: 'songs/misery.mp3', dropAt: 'stopped' , startAt: 'rising:-0.2', endAfter: 'stopped:2.0'},

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
    // the stunt reads from frame 0: already on a 2-high pillar, lava all round it
    await ctx.cmd(`/fill ${x} ${floor + 1} ${z} ${x} ${floor + 2} ${z} cobblestone`)
    await ctx.cmd(`/fill ${x - R} ${floor + 1} ${z - R} ${x + R} ${floor + 1} ${z + R} lava replace air`)
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16], 'water_bucket'])
    await ctx.tpCheck(x + 0.5, floor + 3, z + 0.5, 180, 20)
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor, R } = this
    const TOP = floor + 2 + LAYERS                             // the top pillar block
    let lavaY = floor + 1, t = 0, rising = false
    const rise = () => {
      if (!rising || t++ < 10 || t % 14) return                // a layer every 14 ticks (0.7 s)
      if (lavaY >= TOP - 1) return
      lavaY++
      bot.chat(`/fill ${x - R} ${lavaY} ${z - R} ${x + R} ${lavaY} ${z + R} lava replace air`)
      ctx.sound('block.lava.pop', 1, 0.8 + (lavaY % 3) * 0.1)
      if (lavaY === TOP - 1) ctx.mark('stopped')
    }
    bot.on('physicsTick', rise)
    await bot.waitForTicks(4)
    rising = true; ctx.mark('rising')
    ctx.sound('block.lava.ambient', 1)
    // pillar while looking down the side of the column: each block appears under the feet, the
    // lava climbs the cobblestone below (the old version looked out at the horizon and never
    // showed a block placed or the pillar)
    await ctx.easeLook(Math.PI + 0.25, -1.3, 350)
    for (let k = 0; k < LAYERS; k++) {
      const base = floor + 2 + k                               // block we stand on
      bot.setControlState('jump', true)
      ctx.easeLook(Math.PI + 0.25 + 0.2 * Math.sin(k * 0.9), -1.3 + 0.08 * Math.cos(k * 0.7), 450)
      for (let i = 0; i < 20 && bot.entity.position.y < base + 2.1; i++) await bot.waitForTicks(1)
      bot.setControlState('jump', false)
      bot._client.write('block_place', { hand: 0, location: { x, y: base, z }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.stone.place', 1, 0.9)
      for (let i = 0; i < 20 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
    }
    ctx.mark('top')
    // out of blocks... nervous glances, then straight down at the last layers coming up
    await ctx.easeLook(Math.PI + 0.8, -0.6, 600)
    await ctx.easeLook(Math.PI - 0.6, -0.7, 700)
    ctx.easeLook(Math.PI + 0.2, -1.25, 600)
    for (let i = 0; i < 200 && lavaY < TOP - 1; i++) await bot.waitForTicks(1)
    // it stopped: one cobblestone face between the lava and the feet. Hold on it, drifting.
    ctx.easeLook(Math.PI + 0.35, -1.15, 1800)
    await bot.waitForTicks(40)
    bot.removeListener('physicsTick', rise)
    return !ctx.died && bot.entity.position.y > TOP
  }
}
