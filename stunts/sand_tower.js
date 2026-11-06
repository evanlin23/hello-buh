// "the torch trick never gets old 😭": a tall sand tower; the bot breaks the bottom block and
// instantly places a torch there, so every sand block that falls onto the torch pops into an
// item - the tower melts into the ground (falling-block entities + item drops).
const H = Number(process.env.TOWER || 14)
const BACK = 10   // the bot stands this far from the tower: base and top both in frame

module.exports = {
  name: 'sand_tower',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the torch trick never gets old 😭',
  edit: { caption: 'the torch trick never gets old 😭', red: 'torch', song: 'songs/funk_abnormal.mp3', dropAt: 'break', startAt: 'tower:-0.1', endAfter: 'gone:0.4' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 6} ${floor - 2} ${z - 14} ${x + 6} ${floor - 1} ${z + 3} dirt`)
    await ctx.cmd(`/fill ${x - 6} ${floor} ${z - 14} ${x + 6} ${floor} ${z + 3} grass_block`)
    await ctx.cmd(`/fill ${x - 6} ${floor + 1} ${z - 14} ${x + 6} ${floor + H + 6} ${z + 3} air`)
    this.tz = z - BACK
    await ctx.cmd(`/fill ${x} ${floor + 1} ${this.tz} ${x} ${floor + H} ${this.tz} sand`)
    await ctx.hotbar(['diamond_shovel', ['torch', 64], ['sand', 64], ['bread', 12]])
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 14')
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, -19)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const mid = new Vec3(this.x + 0.5, this.floor + 6.2, this.tz + 0.5)   // whole tower + its base in frame
    await ctx.easeLookAt(mid, 100)
    ctx.mark('tower')
    const b = bot.blockAt(new Vec3(this.x, this.floor + 1, this.tz))
    await ctx.easeLookAt(new Vec3(this.x + 0.5, this.floor + 1.5, this.tz + 0.5), 450)   // down to the base (bot.dig would snap there)
    ctx.mark('break')
    try { await bot.dig(b, false) } catch (e) { ctx.log('dig', e.message) }
    ctx.sound('block.sand.break', 1); ctx.particles('block', b.position, { block: 'sand' })
    // sand checks for a free space 2 ticks after the update: let the column start falling, then put
    // the torch in the gap so each falling block lands on it and pops off as an item
    await bot.waitForTicks(3)
    bot.setQuickBarSlot(1)
    bot._client.write('block_place', { hand: 0, location: { x: this.x, y: this.floor, z: this.tz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('block.wood.place', 1)
    // follow the column down; each landing makes a sound
    // watch the column come down onto the torch, the camera easing down with it
    let gone = false
    for (let i = 0; i < 120; i++) {
      await bot.waitForTicks(1)
      if (i % 3 === 0) ctx.sound('block.sand.place', 0.7, 0.8 + (i % 5) * 0.05)
      // ease from the base up to the falling column, then follow it down
      if (i < 50) {
        const t = (i + 1) / 50, e = t * t * (3 - 2 * t)
        const aimY = i < 18 ? 1.5 + 3.5 * Math.sin((i + 1) / 18 * Math.PI / 2) : 5 - 2.5 * ((i - 17) / 32)
        const want = Math.atan2(this.floor + aimY - (this.floor + 2.62), BACK - 0.5)
        await bot.look(bot.entity.yaw, bot.entity.pitch + (want - bot.entity.pitch) * (0.25 + 0.5 * e), true)
      }
      const left = Object.values(bot.entities).some(en => en.name === 'falling_block')
      let sand = 0
      for (let y = 1; y <= H; y++) if (bot.blockAt(new Vec3(this.x, this.floor + y, this.tz)).name === 'sand') sand++
      if (i > 10 && !left && sand === 0) { gone = true; break }
    }
    ctx.mark('gone')
    ctx.log('tower gone:', gone)
    await bot.waitForTicks(30)
    return gone
  }
}
