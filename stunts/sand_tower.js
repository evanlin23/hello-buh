// "the torch trick never gets old 😭": a tall sand tower; the bot breaks the bottom block and
// instantly places a torch there, so every sand block that falls onto the torch pops into an
// item - the tower melts into the ground (falling-block entities + item drops).
const H = Number(process.env.TOWER || 22)

module.exports = {
  name: 'sand_tower',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the torch trick never gets old 😭',
  edit: { caption: 'the torch trick never gets old 😭', red: 'torch', song: 'songs/funk_abnormal.mp3', dropAt: 'break', start: 0.4 },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 6} ${floor - 2} ${z - 8} ${x + 6} ${floor - 1} ${z + 3} dirt`)
    await ctx.cmd(`/fill ${x - 6} ${floor} ${z - 8} ${x + 6} ${floor} ${z + 3} grass_block`)
    await ctx.cmd(`/fill ${x - 6} ${floor + 1} ${z - 8} ${x + 6} ${floor + H + 6} ${z + 3} air`)
    this.tz = z - 3
    // a fat 2x2 sand tower with a sandstone cap so it reads as built, not natural
    await ctx.cmd(`/fill ${x} ${floor + 1} ${this.tz} ${x} ${floor + H} ${this.tz} sand`)
    await ctx.hotbar(['diamond_shovel', ['torch', 64], ['sand', 64], ['bread', 12]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, -40)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    await ctx.easeLookAt(new Vec3(this.x + 0.5, this.floor + H * 0.8, this.tz + 0.5), 900)   // look up the tower
    await bot.waitForTicks(6)
    await ctx.easeLookAt(new Vec3(this.x + 0.5, this.floor + 1.5, this.tz + 0.5), 700)
    const b = bot.blockAt(new Vec3(this.x, this.floor + 1, this.tz))
    ctx.mark('break')
    try { await bot.dig(b, true) } catch (e) { ctx.log('dig', e.message) }
    ctx.sound('block.sand.break', 1); ctx.particles('block', b.position, { block: 'sand' })
    // sand checks for a free space 2 ticks after the update: let the column start falling, then put
    // the torch in the gap so each falling block lands on it and pops off as an item
    await bot.waitForTicks(3)
    bot.setQuickBarSlot(1)
    bot._client.write('block_place', { hand: 0, location: { x: this.x, y: this.floor, z: this.tz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('block.wood.place', 1)
    // follow the column down; each landing makes a sound
    let last = null
    for (let i = 0; i < 90; i++) {
      await bot.waitForTicks(1)
      const top = bot.blockAt(new Vec3(this.x, this.floor + 1, this.tz))
      if (i % 3 === 0) ctx.sound('block.sand.place', 0.7, 0.8 + (i % 5) * 0.05)
      if (i === 8) await ctx.easeLookAt(new Vec3(this.x + 0.5, this.floor + 3.5, this.tz + 0.5), 400)   // the torch and the column coming down onto it
      last = top
    }
    await ctx.easeLookAt(new Vec3(this.x + 0.5, this.floor + 1.5, this.tz + 0.5), 600)
    await bot.waitForTicks(20)
    return true
  }
}
