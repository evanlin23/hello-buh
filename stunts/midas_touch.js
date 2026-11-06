// "POV: you got the midas touch 🤑": in a forest, everything the bot looks at turns to gold.
// Each couple of ticks the block under the crosshair (and a 3x3x3 blob around it) becomes gold:
// ground, logs, leaves, stone. The bot looks around and walks on, leaving a golden trail.
module.exports = {
  name: 'midas_touch',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'POV: you got the midas touch 🤑',
  edit: { caption: 'POV: you got the midas touch 🤑', red: 'midas', song: 'songs/funk_abnormal.mp3', dropAt: 'touch', startAt: 'touch:-0.35', endAfter: 'touch:7.6' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 1} ${floor + 1} ${z - 1} ${x + 1} ${floor + 6} ${z + 1} air`)
    await ctx.hotbar(['diamond_sword', 'diamond_pickaxe', ['bread', 16], ['gold_ingot', 7]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 15)
    await ctx.cmd('/gamemode survival')
    ctx.select(3)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    let on = false, n = 0
    const tags = ['#minecraft:mineable/shovel', '#minecraft:mineable/axe', '#minecraft:leaves', '#minecraft:mineable/pickaxe']
    const touch = () => {
      if (!on || n++ % 2) return
      const b = bot.blockAtCursor(48)
      if (!b || b.name === 'gold_block') return
      const p = b.position
      const r = n > 120 ? 2 : 1                                  // it gets stronger
      for (const t of tags) bot.chat(`/fill ${p.x - r} ${p.y - r} ${p.z - r} ${p.x + r} ${p.y + r} ${p.z + r} gold_block replace ${t}`)
      // ground cover sitting on top would stay green on the gold (leaf litter, grass): clear it
      for (const c of ['leaf_litter', 'short_grass', 'fern', 'bush']) bot.chat(`/fill ${p.x - r} ${p.y - r} ${p.z - r} ${p.x + r} ${p.y + r + 1} ${p.z + r} air replace ${c}`)
      ctx.sound('block.amethyst_block.chime', 1, 0.8 + (n % 7) * 0.08)
    }
    bot.on('physicsTick', touch)
    // walking through a forest: hop over whatever we bump into instead of standing against it
    const hop = () => bot.setControlState('jump', !!(bot.controlState.forward && bot.entity.isCollidedHorizontally))
    bot.on('physicsTick', hop)
    await bot.waitForTicks(10)
    await ctx.easeLook(Math.PI + 0.2, -0.3, 700)              // a normal day in the forest...
    on = true; ctx.mark('touch')
    ctx.sound('entity.player.levelup', 0.7)
    await ctx.easeLook(Math.PI + 0.6, -0.45, 900)             // the ground in front
    await ctx.easeLook(Math.PI + 0.9, 0.15, 900)              // up a tree
    await ctx.easeLook(Math.PI - 0.6, 0.05, 1600)             // sweep across the trees
    bot.setControlState('forward', true)
    await ctx.easeLook(Math.PI - 0.3, -0.25, 1200)            // walk on, gilding the path
    await ctx.easeLook(Math.PI + 0.7, 0.05, 1400)             // ...and the trees alongside
    bot.setControlState('forward', false)
    await ctx.easeLook(Math.PI + 2.4, 0.0, 1800)              // turn round: the golden trail behind
    on = false
    await bot.waitForTicks(24)
    bot.removeListener('physicsTick', touch); bot.removeListener('physicsTick', hop)
    return true
  }
}
