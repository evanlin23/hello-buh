// "water bucket vs everything 💀" (docs/ideas.md #19, ~20 s): five stations in a field, a real
// survival water-bucket use at each (the server raytraces from where the bot looks):
//   1. me on fire: walk through fire, pour at my feet, out
//   2. a lava pool: one pour, the whole pool turns to obsidian (steam)
//   3. a burning house: pour on the roof, the waterfalls wash the fire off the walls
//   4. TNT: pour into the TNT pit, light it, back away facing it: it goes off, no crater
//   5. fall damage: off a 50-block pillar, water clutch at the bottom
// A teleport (hard cut) takes the bot to each station.
const STATIONS = ['fire', 'lava', 'house', 'tnt', 'fall']
const GAP = 16
const HEIGHT = 50

module.exports = {
  name: 'water_everything',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'water bucket vs everything 💀',
  edit: {
    caption: 'water bucket vs everything 💀', red: 'everything', song: 'songs/funk_abnormal.mp3', dropAt: 'landed',
    startAt: 'beat:-0.1', endAfter: 'landed:1.2', onFire: 'burning:extinguished',
    subs: [
      ['done', 'vs fire: out', 1.6, 0], ['done', 'vs lava: obsidian', 1.6, 1], ['done', 'vs a burning house: saved', 1.6, 2],
      ['done', 'vs TNT: no crater', 1.6, 3], ['beat', 'vs a 50 block fall...', 9, 4], ['landed', 'vs fall damage: 0', 2, 0]
    ]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: F } = g
    Object.assign(this, { x, z, F })
    await ctx.defaultRules()
    await ctx.cmd('/gamerule fire_spread_radius_around_player 0')
    await ctx.cmd('/gamerule fall_damage true')
    const x2 = x + GAP * STATIONS.length
    for (let y0 = F + 1; y0 <= F + 12; y0 += 6) await ctx.cmd(`/fill ${x - 12} ${y0} ${z - 14} ${x2} ${y0 + 5} ${z + 10} air`)
    await ctx.cmd(`/fill ${x - 12} ${F} ${z - 14} ${x2} ${F} ${z + 10} grass_block`)
    await ctx.cmd(`/fill ${x - 12} ${F - 4} ${z - 14} ${x2} ${F - 1} ${z + 10} dirt`)
    this.sx = (i) => x + i * GAP
    // 1. fire: a strip of fire on netherrack right in front of the start (z-1)
    let s = this.sx(0)
    await ctx.cmd(`/fill ${s - 1} ${F} ${z - 1} ${s + 1} ${F} ${z - 1} netherrack`)
    await ctx.cmd(`/fill ${s - 1} ${F + 1} ${z - 1} ${s + 1} ${F + 1} ${z - 1} fire`)
    // 2. lava: a 3x3 pool, one deep, 3 blocks ahead
    s = this.sx(1)
    await ctx.cmd(`/fill ${s - 1} ${F - 1} ${z - 4} ${s + 1} ${F - 1} ${z - 2} stone`)
    await ctx.cmd(`/fill ${s - 1} ${F} ${z - 4} ${s + 1} ${F} ${z - 2} lava`)
    // 3. a little oak house (5x5, 3 high walls, flat plank roof), fire on its front wall
    s = this.sx(2)
    const hz = z - 6
    await ctx.cmd(`/fill ${s - 2} ${F + 1} ${hz - 2} ${s + 2} ${F + 3} ${hz + 2} oak_planks`)
    await ctx.cmd(`/fill ${s - 1} ${F + 1} ${hz - 1} ${s + 1} ${F + 3} ${hz + 1} air`)
    await ctx.cmd(`/fill ${s - 2} ${F + 4} ${hz - 2} ${s + 2} ${F + 4} ${hz + 2} oak_planks`)
    await ctx.cmd(`/setblock ${s} ${F + 2} ${hz + 2} glass_pane`)
    await ctx.cmd(`/fill ${s - 2} ${F + 1} ${hz + 3} ${s + 2} ${F + 1} ${hz + 3} fire`)
    for (const dx of [-2, -1, 1, 2]) await ctx.cmd(`/setblock ${s + dx} ${F + 2} ${hz + 3} fire[south=false,north=true]`)
    await ctx.cmd(`/fill ${s - 2} ${F + 5} ${hz - 2} ${s + 2} ${F + 5} ${hz + 2} fire`)
    this.house = { x: s, z: hz }
    // 4. TNT at the bottom of a 3x3 pit, two deep
    s = this.sx(3)
    await ctx.cmd(`/fill ${s - 1} ${F - 1} ${z - 5} ${s + 1} ${F} ${z - 3} air`)
    await ctx.cmd(`/fill ${s - 2} ${F - 2} ${z - 6} ${s + 2} ${F - 2} ${z - 2} stone`)
    await ctx.cmd(`/setblock ${s} ${F - 1} ${z - 4} tnt`)
    // 5. the pillar
    s = this.sx(4)
    await ctx.cmd(`/fill ${s} ${F + 1} ${z} ${s} ${F + HEIGHT} ${z} cobblestone`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 7')
    await ctx.hotbar(['water_bucket', 'water_bucket', 'water_bucket', 'water_bucket', 'flint_and_steel', 'water_bucket'])
    await ctx.tpCheck(this.sx(0) + 0.5, F + 1, z + 2.5, 180, 25)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x: x + GAP * 2, y: F, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { z, F } = this
    const N = 0
    const pour = (bx, by, bz) => {          // use the bucket on the top face of block (bx, by, bz)
      process.nextTick(() => bot.activateItem())
      bot.swingArm(); ctx.sound('item.bucket.empty', 1)
      ctx.mark('pour')
    }
    const lookAt = (x, y, z, ms) => ctx.easeLookAt(new Vec3(x, y, z), ms)
    const station = async (i, yawDeg, pitchDeg, dz = 2.5, y = F + 1) => {
      await ctx.tpCheck(this.sx(i) + 0.5, y, z + dz, yawDeg, pitchDeg)
    }

    // 1. on fire
    let s = this.sx(0)
    ctx.mark('beat', { n: 0 })
    bot.setControlState('forward', true)
    let burning = false
    for (let k = 0; k < 40; k++) {
      await bot.waitForTicks(1)
      if (!burning && bot.entity.position.z < z + 0.3) { burning = true; ctx.mark('burning'); ctx.sound('entity.player.hurt_on_fire', 1) }
      if (bot.entity.position.z < z - 2.0) break
    }
    bot.setControlState('forward', false)
    await ctx.easeLook(N + 0.2, -1.5, 300)          // look down at my feet
    ctx.select(0); await bot.waitForTicks(2)
    pour()
    await bot.waitForTicks(3)
    ctx.mark('extinguished'); ctx.sound('block.fire.extinguish', 1)
    ctx.particles('smoke', bot.entity.position.offset(0, 0.6, 0), { count: 10 })
    ctx.mark('done', { n: 0 })
    await ctx.easeLook(N + Math.PI, -0.45, 500)     // turn back: the fire I walked through
    await bot.waitForTicks(4)

    // 2. lava
    s = this.sx(1)
    await station(1, 180, 35)
    ctx.mark('beat', { n: 1 })
    ctx.select(1)
    await lookAt(s + 0.5, F + 1, z - 2.5, 300)
    pour()
    for (let k = 0; k < 14; k++) {
      await bot.waitForTicks(1)
      if (k % 3 === 0) { ctx.sound('block.lava.extinguish', 0.6, 1 + k * 0.02); ctx.particles('smoke', { x: s + 0.5 + (k % 2 ? -1 : 1) * 0.6, y: F + 1.2, z: z - 3 + (k % 3) * 0.3 }, { count: 6 }) }
    }
    ctx.mark('done', { n: 1 })
    await lookAt(s + 0.5, F + 0.5, z - 3.5, 500)
    await bot.waitForTicks(4)

    // 3. the burning house
    const h = this.house
    await station(2, 180, -5, 2.5)
    ctx.mark('beat', { n: 2 })
    ctx.select(2)
    await lookAt(h.x + 0.5, F + 3, h.z + 0.5, 300)
    await lookAt(h.x + 0.5, F + 5, h.z + 0.5, 400)   // up at the roof
    pour()
    for (let k = 0; k < 24; k++) {
      await bot.waitForTicks(1)
      if (k % 4 === 0) ctx.sound('block.fire.extinguish', 0.5, 1 + k * 0.01)
      if (k === 10) lookAt(h.x + 0.5, F + 2, h.z + 2.5, 500)
    }
    ctx.mark('done', { n: 2 })
    await bot.waitForTicks(8)

    // 4. TNT in water
    s = this.sx(3)
    await station(3, 180, 45, -1.3)
    ctx.mark('beat', { n: 3 })
    ctx.select(3)
    await lookAt(s + 0.5, F - 0.5, z - 3.6, 250)
    pour()
    await bot.waitForTicks(8)
    ctx.select(4); await bot.waitForTicks(3)
    await lookAt(s + 0.5, F - 0.5, z - 3.5, 200)
    bot.swingArm(); ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
    bot.chat(`/setblock ${s} ${F - 1} ${z - 4} water`)
    bot.chat(`/summon tnt ${s + 0.5} ${F - 1} ${z - 3.5} {fuse:34}`)
    // back away facing it
    bot.setControlState('back', true)
    let boom = false
    const onBoom = () => { boom = true }
    bot._client.on('explosion', onBoom)
    for (let k = 0; k < 60 && !boom; k++) {
      await bot.waitForTicks(1)
      if (k === 10) bot.setControlState('back', false)
      if (k % 3 === 0) await bot.look(bot.entity.yaw + (k % 6 === 0 ? 0.01 : -0.01), Math.atan2((F - 0.5) - (bot.entity.position.y + 1.62), Math.hypot(s + 0.5 - bot.entity.position.x, z - 3.5 - bot.entity.position.z)), true)
    }
    bot.setControlState('back', false)
    bot._client.removeListener('explosion', onBoom)
    ctx.mark('boom')
    await bot.waitForTicks(14)
    ctx.mark('done', { n: 3 })
    await lookAt(s + 0.5, F - 1, z - 4, 400)          // the pit: still there, no crater
    await bot.waitForTicks(6)

    // 5. the fall
    s = this.sx(4)
    await station(4, 0, 50, 0.5, F + HEIGHT + 1)
    ctx.mark('beat', { n: 4 })
    ctx.select(5)
    await bot.waitForTicks(6)
    bot.setControlState('forward', true); bot.setControlState('jump', true)
    await bot.waitForTicks(5)
    bot.setControlState('jump', false)
    await bot.waitForTicks(5)
    bot.setControlState('forward', false)
    ctx.easeLook(bot.entity.yaw, -Math.PI / 2 + 0.01, 500)
    let placed = false, landed = false
    const onTick = () => {
      const p = bot.entity.position, vy = bot.entity.velocity.y, above = p.y - (F + 1)
      if (!placed && vy < -0.5 && above + 1.62 < 4.45) {
        placed = true
        bot.entity.pitch = -Math.PI / 2
        ctx.sound('item.bucket.empty')
        process.nextTick(() => bot.activateItem())
      }
      if (placed && !landed && (bot.entity.onGround || bot.entity.isInWater || above < 1.2)) {
        landed = true
        ctx.mark('landed')
        ctx.sound('entity.player.splash.high_speed'); ctx.particles('splash', { x: p.x, y: F + 1.9, z: p.z }, { count: 30 })
      }
    }
    bot.on('physicsTick', onTick)
    for (let k = 0; k < 200 && !landed && !ctx.died; k++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', onTick)
    await bot.waitForTicks(8)
    await ctx.easeLook(bot.entity.yaw + 0.4, -0.3, 700)
    await bot.waitForTicks(6)
    return landed && !ctx.died
  }
}
