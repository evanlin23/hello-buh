// MLG water clutch: jump off a 60-block pillar in a forest, place water one tick before landing,
// scoop it back up, turn around and look up the pillar. See docs/clutch-timing.md.
const HEIGHT = Number(process.env.FALL_HEIGHT || 60)
const LAYERS = Number(process.env.TOP_LAYERS || 5)   // snow cap: shifts the fall phase by (LAYERS-1)/8 block

module.exports = {
  name: 'water_clutch',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'water bucket clutch 💀',
  // edit.py settings for this format (song files are owner-supplied, in songs/)
  edit: { caption: 'water bucket clutch 💀', song: 'songs/misery.mp3', dropAt: 'placed' , startAt: 'jump:-0.8', endAfter: 'placed:2.4'},

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const ground = ctx.findLand(sp.x, sp.z)
    if (!ground) throw new Error('no dry land near spawn')
    const { x, z } = ground, floor = ground.y, top = floor + (this.height || HEIGHT)
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    // flattened pad: the bot lands ~7 blocks out and water flows toward any drop within 4 blocks
    // a round clearing, not a 33x33 square: the sharp-edged square pad read as command-built in
    // every fall (worker 3, tries review)
    const R = 12
    for (let dz = -R; dz <= R; dz++) {
      const w = Math.floor(Math.sqrt(R * R - dz * dz + R)), zz = z + dz
      await ctx.cmd(`/fill ${x - w} ${floor - 3} ${zz} ${x + w} ${floor - 1} ${zz} dirt`)
      await ctx.cmd(`/fill ${x - w} ${floor} ${zz} ${x + w} ${floor} ${zz} grass_block`)
      for (let y0 = floor + 1; y0 <= top + 4; y0 += 30) await ctx.cmd(`/fill ${x - w} ${y0} ${zz} ${x + w} ${Math.min(y0 + 29, top + 4)} ${zz} air`)
    }
    await ctx.cmd(`/fill ${x} ${floor + 1} ${z} ${x} ${top} ${z} cobblestone`)
    if (LAYERS > 0) await ctx.cmd(`/setblock ${x} ${top + 1} ${z} snow[layers=${LAYERS}]`)
    await ctx.hotbar(['diamond_sword', 'water_bucket', ['cobblestone', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, top + 1 + Math.max(0, LAYERS - 1) / 8, z + 0.5, 0, 20)
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    ctx.select(1)   // the bucket from the first frame (0.85 s of a sword first: review)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const floor = this.floor
    const mode = this.mode || 'ok'                     // ok | skip (never places) | late (too late)
    await bot.waitForTicks(this.fast ? 1 : 30)         // standing on the pillar (fast: in a series the cut opens looking down already)
    // peek straight down the pillar (at -0.6 from 60 up the view was just the horizon: the frame
    // review read 1 s of ocean as "idle, can't tell you're on a pillar")
    if (!this.fast) await ctx.easeLook(0, -1.35, 500)
    await ctx.easeLook(0, -1.45, this.fast ? 250 : 300)      // eyes straight down the pillar while jumping off (at -1.0 the pillar was out of shot: review)
    ctx.select(1)                                      // pull out the water bucket
    await bot.waitForTicks(this.fast ? 2 : 6)
    ctx.mark('jump')
    bot.setControlState('forward', true); bot.setControlState('jump', true)
    await bot.waitForTicks(6)
    bot.setControlState('jump', false)
    await bot.waitForTicks(8)
    // drift forward for the first ~14 blocks so we come down clear of the pillar
    const stopDrift = () => { if (bot.entity.position.y - (floor + 1) < (this.height || HEIGHT) - 14) { bot.setControlState('forward', false); bot.removeListener('physicsTick', stopDrift) } }
    bot.on('physicsTick', stopDrift)
    ctx.easeLook(bot.entity.yaw, -Math.PI / 2 + 0.01, 500)
    let placed = false, landed = false, splashed = false, lateSecond = false
    const onTick = () => {
      const p = bot.entity.position, vy = bot.entity.velocity.y, above = p.y - (floor + 1)
      const inReach = above + 1.62 < 4.45
      // too late: any water that lands before the player saves them (the server sees it first), so
      // a real "too late" never gets the water down - just the swing as the ground arrives
      // too late: frantic clicks out of reach from ~10 blocks, then again right at the ground. One swing at
      // 2.2 landed 1-2 frames before the death cut and read as 'forgot' (tries reviews)
      if (mode === 'late' && !placed && above < 10) { placed = true; bot.swingArm(); ctx.mark('too_late') }
      if (mode === 'late' && placed && !lateSecond && above < 3.5) { lateSecond = true; bot.swingArm() }
      if (mode === 'late') return
      if (!placed && mode !== 'skip' && vy < -0.5 && inReach) {
        ctx.select(1)
        bot.entity.pitch = -Math.PI / 2
        placed = true
        ctx.mark('placed', { above }); ctx.sound('item.bucket.empty')
        // physicsTick fires BEFORE mineflayer sends this tick's position: defer the use
        process.nextTick(() => bot.activateItem())
        ctx.log('water placed at height', above.toFixed(2))
      }
      if (placed && !splashed && above < 1.0) { splashed = true; ctx.sound('entity.player.splash.high_speed'); ctx.particles('splash', { x: p.x, y: floor + 1.9, z: p.z }, { count: 60, spread: 2.6 }) }   // wide: particles within 1 block of the eye are culled, and the eye is right above the water
      if ((placed || mode !== 'ok') && (bot.entity.onGround || bot.entity.isInWater)) landed = true
    }
    bot.on('physicsTick', onTick)
    for (let i = 0; i < 200 && !landed && !ctx.died; i++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', onTick)
    // a failed attempt: nothing more to film (tries respawns). The ground can register a tick
    // before the death does, so wait for it on purpose-failed modes
    if (mode !== 'ok') { for (let i = 0; i < 10 && !ctx.died; i++) await bot.waitForTicks(1); return false }
    if (ctx.died) return false
    await bot.waitForTicks(8)
    const below = bot.blockAt(bot.entity.position.floored())
    if (below && below.name === 'water') {
      await bot.look(bot.entity.yaw, -Math.PI / 2, true); bot.activateItem(); await bot.waitForTicks(4)
      ctx.sound('item.bucket.fill')   // no splash: vanilla doesn't splash on a fill (blue squares on dry grass: review)
    }
    await bot.waitForTicks(6)
    const dx = this.x + 0.5 - bot.entity.position.x, dz = this.z + 0.5 - bot.entity.position.z
    await ctx.easeLook(Math.atan2(-dx, -dz), 1.0, 1200)   // look up the pillar
    await bot.waitForTicks(30)
    return placed && bot.health > 0
  }
}
