// "POV: you got the midas touch 🤑": in a forest, everything the bot looks at turns to gold.
// Each couple of ticks the block under the crosshair (and a 3x3x3 blob around it) becomes gold:
// ground, logs, leaves, stone. ~30 s: the bot looks around, walks on through the forest (the touch
// gets stronger), past a cabin that goes gold too, and ends turning round on its golden trail as one
// last wave turns everything in sight to gold.
module.exports = {
  name: 'midas_touch',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'POV: you got the midas touch 🤑',
  edit: { caption: 'POV: you got the midas touch 🤑', red: 'midas', dropAt: 'touch', startAt: 'touch:-0.35', endAfter: 'wave:1.0' },

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
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 0, 15)   // already facing south (the opening was the end of a 170° spin)
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
    // ground cover goes first: it would stay green on the gold, and a plant whose block turns gold
    // pops off and drops seeds (they littered the gold and filled the hotbar)
    const COVER = ['leaf_litter', 'short_grass', 'fern', 'bush', 'tall_grass', 'large_fern', '#minecraft:small_flowers']
    const clearCover = (x0, y0, z0, x1, y1, z1) => { for (const c of COVER) bot.chat(`/fill ${x0} ${y0} ${z0} ${x1} ${y1} ${z1} air replace ${c}`) }
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
        clearCover(p.x - r, p.y - r, p.z - r, p.x + r, p.y + r + 1, p.z + r)
        for (const t of tags) bot.chat(`/fill ${p.x - r} ${p.y - r} ${p.z - r} ${p.x + r} ${p.y + r} ${p.z + r} gold_block replace ${t}`)
        bl.r++
      }
      for (let i = blobs.length - 1; i >= 0; i--) if (blobs[i].r > blobs[i].max) blobs.splice(i, 1)
    }
    bot.on('physicsTick', touch)
    // walking is steered toward waypoints on the cleared path, whatever the camera looks at (moving
    // along the look direction walked the bot off the path into walls and a pit)
    let wp = null
    const steer = () => {
      for (const c of ['forward', 'back', 'left', 'right']) bot.setControlState(c, false)
      bot.setControlState('jump', false)
      if (!wp) return
      const dx = wp.x - bot.entity.position.x, dz = wp.z - bot.entity.position.z
      if (Math.hypot(dx, dz) < 0.4) { wp = null; return }
      let rel = Math.atan2(-dx, -dz) - bot.entity.yaw
      while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI
      const a = Math.abs(rel)
      if (a < 1.2) bot.setControlState('forward', true); else if (a > 1.95) bot.setControlState('back', true)
      if (rel > 0.4 && rel < 2.75) bot.setControlState('left', true); else if (rel < -0.4 && rel > -2.75) bot.setControlState('right', true)
      if (bot.entity.isCollidedHorizontally) bot.setControlState('jump', true)
    }
    bot.on('physicsTick', steer)
    const P = (dz) => ({ x: this.x + 0.5, z: this.z + 0.5 + dz })
    await bot.waitForTicks(10)
    await ctx.easeLook(Math.PI + 0.2, -0.3, 700)              // a normal day in the forest...
    on = true; ctx.mark('touch')
    ctx.sound('entity.player.levelup', 0.7)
    await ctx.easeLook(Math.PI - 0.5, -0.55, 1800)            // across the ground in front (fresh ground all the way)
    await ctx.easeLook(Math.PI + 0.9, 0.15, 2000)             // up a tree
    await ctx.easeLook(Math.PI - 0.6, -0.25, 3000)            // sweep back across, low: near ground, bushes
    wp = P(8); ctx.mark('walk')                               // walk on, gilding the path and the trees alongside
    await ctx.easeLook(Math.PI - 0.3, -0.3, 1600)
    // the trees on the left (looking right from here, PI + 0.7, gilded the cabin 7 s early)
    await ctx.easeLook(Math.PI - 0.8, 0.05, 1800)
    await ctx.easeLook(Math.PI - 1.0, 0.3, 2000)
    await ctx.easeLook(Math.PI - 0.7, -0.25, 1500)
    // on toward the cabin, stopping back from it so it's all in frame, and it goes gold
    wp = P(12)
    const cab = new ctx.Vec3(this.cabin.x + 0.5, this.cabin.y + 1.5, this.cabin.z + 0.5)
    await ctx.easeLookAt(cab, 1100)
    ctx.mark('cabin')
    const cyaw = bot.entity.yaw, cp = bot.entity.pitch
    await ctx.easeLook(cyaw - 0.25, cp + 0.25, 1200)
    await ctx.easeLook(cyaw + 0.25, cp - 0.1, 1200)
    await ctx.easeLook(cyaw, cp + 0.15, 1000)
    // on: it's stronger now, whole trees at a glance
    wp = P(27); ctx.mark('stronger')
    await ctx.easeLook(Math.PI + 0.5, 0.25, 2400)
    await ctx.easeLook(Math.PI - 0.6, 0.3, 2600)
    await ctx.easeLook(Math.PI + 0.9, -0.2, 2000)
    await ctx.easeLook(Math.PI, -0.1, 1000)
    wp = null
    // turn round to the untouched forest to the side (the touch held back so it stays green)... and
    // one last wave, while the camera drifts
    on = false
    await ctx.easeLook(Math.PI / 2 + 0.3, -0.2, 1300)          // west-ish, down onto the land (level, it saw only sky over the crest)
    let b = bot.blockAtCursor(64)
    if (!b) { b = ctx.surface(this.x - 12, this.z + 27); ctx.log('wave: cursor missed, fixed centre', !!b) }
    if (!b) throw new Error('no wave target')
    ctx.mark('wave')
    ctx.sound('entity.player.levelup', 1, 0.8); ctx.sound('block.amethyst_block.chime', 1, 0.6)
    const drift = ctx.easeLook(Math.PI / 2 + 0.6, -0.05, 1600)
    const p = b.position
    for (const r of [2, 4, 6, 8, 10, 12, 14, 16]) {   // a ring every couple of ticks; each /fill under the 32768 cap
      clearCover(p.x - r, p.y - 5, p.z - r, p.x + r, p.y + r + 2, p.z + r)
      for (const t of tags) bot.chat(`/fill ${p.x - r} ${p.y - 5} ${p.z - r} ${p.x + r} ${p.y + r + 2} ${p.z + r} gold_block replace ${t}`)
      if (r % 4 === 0) ctx.sound('block.amethyst_block.chime', 0.8, 0.7 + r * 0.03)
      await bot.waitForTicks(2)
    }
    await drift
    await bot.waitForTicks(24)
    bot.removeListener('physicsTick', touch); bot.removeListener('physicsTick', steer)
    return true
  }
}
