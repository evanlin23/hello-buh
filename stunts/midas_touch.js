// "POV: you got the midas touch 🤑": in a forest, everything the bot looks at turns to gold.
// Each couple of ticks the block under the crosshair (and a 3x3x3 blob around it) becomes gold:
// ground, logs, leaves, stone. ~30 s: the bot looks around, walks on through the forest (the touch
// gets stronger), past a cabin that goes gold too, and ends turning round on its golden trail as one
// last wave turns everything in sight to gold.
module.exports = {
  name: 'midas_touch',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'POV: you got the midas touch 🤑',
  edit: { caption: 'POV: you got the midas touch 🤑', red: 'midas', song: 'songs/funk_abnormal.mp3', dropAt: 'touch', startAt: 'touch:-0.35', endAfter: 'wave:0.9' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 1} ${floor + 1} ${z - 1} ${x + 1} ${floor + 6} ${z + 1} air`)
    // the walk (south, +z) goes through here: no tree trunks to walk face-first into (trees beside it stay)
    for (const t of ['#minecraft:logs', '#minecraft:leaves']) await ctx.cmd(`/fill ${x - 2} ${floor + 1} ${z + 1} ${x + 3} ${floor + 14} ${z + 30} air replace ${t}`)
    // a little cabin beside the path, on the ground there
    const cg = ctx.surface(x + 7, z + 16)
    const cy = cg ? cg.position.y : floor
    this.cabin = { x: x + 7, y: cy + 1, z: z + 16 }
    await ctx.cmd(`/fill ${x + 4} ${cy + 1} ${z + 13} ${x + 10} ${cy + 7} ${z + 19} air`)
    await ctx.cmd(`/fill ${x + 5} ${cy} ${z + 14} ${x + 9} ${cy} ${z + 18} cobblestone`)
    await ctx.cmd(`/fill ${x + 5} ${cy + 1} ${z + 14} ${x + 9} ${cy + 3} ${z + 18} oak_planks hollow`)
    for (const [cx, cz] of [[5, 14], [9, 14], [5, 18], [9, 18]]) await ctx.cmd(`/fill ${x + cx} ${cy + 1} ${z + cz} ${x + cx} ${cy + 3} ${z + cz} oak_log`)
    await ctx.cmd(`/fill ${x + 4} ${cy + 4} ${z + 13} ${x + 10} ${cy + 4} ${z + 19} spruce_planks`)
    await ctx.cmd(`/fill ${x + 5} ${cy + 5} ${z + 14} ${x + 9} ${cy + 5} ${z + 18} spruce_planks`)
    await ctx.cmd(`/setblock ${x + 5} ${cy + 2} ${z + 16} glass`)
    await ctx.cmd(`/fill ${x + 5} ${cy + 1} ${z + 15} ${x + 5} ${cy + 2} ${z + 15} air`)
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
    // every few ticks the block under the crosshair starts a blob that grows outward a ring a tick
    // (all at once in one frame read as a swap, not a spread)
    const blobs = []
    const touch = () => {
      if (on && n++ % 4 === 0) {
        const b = bot.blockAtCursor(48)
        if (b && b.name !== 'gold_block') {
          blobs.push({ p: b.position, r: 0, max: n < 140 ? 1 : n < 380 ? 2 : 3 })   // it gets stronger
          ctx.sound('block.amethyst_block.chime', 1, 0.8 + (n % 7) * 0.08)
        }
      }
      for (const bl of blobs) {
        const { p, r } = bl
        for (const t of tags) bot.chat(`/fill ${p.x - r} ${p.y - r} ${p.z - r} ${p.x + r} ${p.y + r} ${p.z + r} gold_block replace ${t}`)
        if (r === bl.max) {   // ground cover on top would stay green on the gold (leaf litter, grass): clear it
          for (const c of ['leaf_litter', 'short_grass', 'fern', 'bush']) bot.chat(`/fill ${p.x - r} ${p.y - r} ${p.z - r} ${p.x + r} ${p.y + r + 1} ${p.z + r} air replace ${c}`)
        }
        bl.r++
      }
      for (let i = blobs.length - 1; i >= 0; i--) if (blobs[i].r > blobs[i].max) blobs.splice(i, 1)
    }
    bot.on('physicsTick', touch)
    // walking through a forest: hop over whatever we bump into instead of standing against it
    const hop = () => bot.setControlState('jump', !!(bot.controlState.forward && bot.entity.isCollidedHorizontally))
    bot.on('physicsTick', hop)
    await bot.waitForTicks(10)
    await ctx.easeLook(Math.PI + 0.2, -0.3, 700)              // a normal day in the forest...
    on = true; ctx.mark('touch')
    ctx.sound('entity.player.levelup', 0.7)
    ctx.sound('entity.player.levelup', 0.7)
    await ctx.easeLook(Math.PI + 0.6, -0.45, 1680)            // the ground in front
    await ctx.easeLook(Math.PI + 0.9, 0.15, 1819)             // up a tree
    await ctx.easeLook(Math.PI - 0.6, 0.05, 3080)             // sweep across the trees
    bot.setControlState('forward', true)
    await ctx.easeLook(Math.PI - 0.3, -0.25, 2520)            // walk on, gilding the path
    await ctx.easeLook(Math.PI + 0.7, 0.05, 2800)             // ...and the trees alongside
    await ctx.easeLook(Math.PI - 0.5, -0.1, 2520)
    // the cabin beside the path
    const cab = new ctx.Vec3(this.cabin.x + 0.5, this.cabin.y + 1.5, this.cabin.z + 0.5)
    await ctx.easeLookAt(cab, 1680)
    bot.setControlState('forward', false)
    ctx.mark('cabin')
    const cyaw = bot.entity.yaw
    await ctx.easeLook(cyaw - 0.35, bot.entity.pitch + 0.15, 1819)
    await ctx.easeLook(cyaw + 0.35, bot.entity.pitch - 0.25, 2100)
    // on: it's stronger now, whole trees at a glance
    bot.setControlState('forward', true)
    await ctx.easeLook(Math.PI + 0.5, 0.25, 2520)
    await ctx.easeLook(Math.PI - 0.6, 0.3, 2800)
    await ctx.easeLook(Math.PI, -0.2, 2100)
    bot.setControlState('forward', false)
    // turn round: the golden trail behind... and one last wave
    await ctx.easeLook(Math.PI + 2.6, -0.3, 2520)
    const b = bot.blockAtCursor(48)
    ctx.mark('wave')
    if (b) {   // the wave grows out from where it looks, a ring every couple of ticks
      const p = b.position
      for (const r of [2, 3, 4, 5, 6]) {
        for (const t of tags) bot.chat(`/fill ${p.x - r} ${p.y - 4} ${p.z - r} ${p.x + r} ${p.y + r + 2} ${p.z + r} gold_block replace ${t}`)
        await bot.waitForTicks(2)
      }
    }
    ctx.sound('entity.player.levelup', 1, 0.8); ctx.sound('block.amethyst_block.chime', 1, 0.6)
    await ctx.easeLook(Math.PI + 2.9, -0.18, 1000)            // drifting over it
    on = false
    await bot.waitForTicks(24)
    bot.removeListener('physicsTick', touch); bot.removeListener('physicsTick', hop)
    return true
  }
}
