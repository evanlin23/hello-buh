// "POV: you're on half a heart 💀" (~18 s): one hit from anything kills, and the HUD shows the half
// heart the whole time. A real survival run north through a forest lane, every danger survived by
// the vanilla trick for it... until the most harmless thing on the course:
//   1. a water bucket clutch off a 30-block pillar (the old 6 s cut was only this)
//   2. a strip of magma blocks: crossed sneaking (sneaking stops magma damage)
//   3. a 3-block drop: 0 fall damage (it starts at 4)
//   4. a one-wide bridge over lava, sneaking
//   5. a sweet berry bush in the path: "HelloBuh was poked to death by a sweet berry bush"
// As long as it needs and no longer (lead, 2026-11-11): the stunt from the first frame, no dead time.
const clutch = require('./water_clutch')

// the course, in blocks north of the pillar (z - N); the bot lands ~7 north
const C = { magma0: 12, magma1: 14, drop: 17, bridge0: 20, bridge1: 24, bush: 27, end: 32 }

module.exports = {
  ...clutch,
  name: 'half_heart',
  height: 30,
  fast: true,
  caption: "POV: you're on half a heart 💀",
  expectDeath: true,
  edit: {
    caption: "POV: you're on half a heart 💀", red: 'half', dropAt: 'placed',
    startAt: 'jump:-0.5', endAfter: 'death:1.6', deathScreen: true,
    // sound from frame 0: the wind up on the pillar and the fall's rising wind (the 2.3 s fall is silent in vanilla)
    sfx: [['air', 'start', 'jump', { gain: 0.25 }], ['wind', 'jump', 'placed', { gain: 0.5 }],
      // over the NCS bed the bridge's lava pops don't count: a whoosh on 'almost there...' (the 15th sound), and a
      // song dip + impact on the death (v2 gates on the packaged mix: 4.45 s dead on the bridge, no hit on the payoff)
      ['whoosh', 'sound', { nth: 14 }], ['dip', 'death', 0.3], ['impact', 'death']],
    subs: [
      ['jump', 'water clutch', 2.4], ['magma', 'magma: sneak', 2.0],
      ['drop', '3 blocks = 0 damage', 1.6], ['bridge', 'lava bridge', 2.8],
      // on the bridge's last blocks (the 15th sound: a lava pop, 0.3 s before the bush), so it's gone before the
      // death screen; on 'bush' it ran 0.25 s and then sat over "You Died!" (re-record: give it its own mark)
      ['sound', 'almost there...', 1.6, 14]
    ],
    // the look up the pillar holds 1.45 s (the camera parked: review); 1.0 s of it cut, an invisible cut on the same view
    speed: [['placed:1.25', 'placed:2.25', 'cut']]
  },

  async setup (ctx) {
    const set = await clutch.setup.call(this, ctx)
    const { x, z, floor: F } = this
    const { bot } = ctx
    await ctx.forceload({ x0: x - 8, z0: z - C.end - 6, x1: x + 8, z1: z + 4 })
    // the course: a cleared 9-wide lane through the forest, north of the pad
    const z0 = z - C.end, z1 = z - 10
    await ctx.cmd(`/fill ${x - 4} ${F + 1} ${z0} ${x + 4} ${F + 14} ${z1} air`)
    await ctx.cmd(`/fill ${x - 4} ${F - 5} ${z0} ${x + 4} ${F - 1} ${z1} dirt`)
    await ctx.cmd(`/fill ${x - 4} ${F} ${z0} ${x + 4} ${F} ${z1} grass_block`)
    // 2. magma strip
    await ctx.cmd(`/fill ${x - 3} ${F} ${z - C.magma1} ${x + 3} ${F} ${z - C.magma0} magma_block`)
    // 5. the drop: everything north of it is 3 lower
    await ctx.cmd(`/fill ${x - 4} ${F - 2} ${z0} ${x + 4} ${F} ${z - C.drop - 1} air`)
    await ctx.cmd(`/fill ${x - 4} ${F - 3} ${z0} ${x + 4} ${F - 3} ${z - C.drop - 1} grass_block`)
    // 6. a lava pool across the lane, a one-wide stone brick bridge over it
    const L = F - 3
    await ctx.cmd(`/fill ${x - 4} ${L - 1} ${z - C.bridge1} ${x + 4} ${L - 1} ${z - C.bridge0} stone`)
    await ctx.cmd(`/fill ${x - 4} ${L} ${z - C.bridge1} ${x + 4} ${L} ${z - C.bridge0} lava`)
    await ctx.cmd(`/fill ${x} ${L} ${z - C.bridge1} ${x} ${L} ${z - C.bridge0} stone_bricks`)
    // 7. the bush (fully grown: age 3)
    await ctx.cmd(`/setblock ${x} ${L + 1} ${z - C.bush} sweet_berry_bush[age=3]`)
    for (const dx of [-2, 2]) await ctx.cmd(`/setblock ${x + dx} ${L + 1} ${z - C.bush - 1} sweet_berry_bush[age=2]`)
    await ctx.cmd('/gamerule natural_health_regeneration false')        // or full saturation heals it right back
    await ctx.cmd('/damage @s 19 minecraft:generic')
    await bot.waitForTicks(30)
    return set
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor: F } = this
    ctx.log('health at the start', bot.health)
    if (!await clutch.perform.call(this, ctx)) return false
    ctx.log('health after the clutch', bot.health)
    // steer: strafe onto the lane's middle (x + 0.5) while facing north (yaw 0; right = +x), so the
    // camera's looks stay the stunt's own
    let steerOn = true
    const steer = () => {
      const dx = x + 0.5 - bot.entity.position.x
      bot.setControlState('right', steerOn && dx > 0.06); bot.setControlState('left', steerOn && dx < -0.06)
    }
    const zz = () => z + 0.5 - bot.entity.position.z            // blocks north of the pillar
    const until = async (n, ticks = 200) => { for (let w = 0; w < ticks && zz() < n && !ctx.died; w++) { steer(); await bot.waitForTicks(1) } }
    ctx.select(2)                                                  // cobblestone in hand (the bucket's put away)
    await ctx.easeLook(0, -0.35, 450)                             // and north: the course
    bot.setControlState('forward', true)
    // 2. magma: sneak from a block before it to a block after
    await until(C.magma0 - 1.3)
    ctx.mark('magma'); bot.setControlState('sneak', true)
    ctx.easeLook(0.05, -0.6, 500)                                  // eyes on the magma underfoot
    await until(C.magma1 + 1.4, 400)
    bot.setControlState('sneak', false)
    ctx.easeLook(0, -0.25, 400)
    // 5. the drop
    await until(C.drop + 0.2)
    ctx.mark('drop'); ctx.easeLook(0, -0.7, 300)
    for (let w = 0; w < 30 && !bot.entity.onGround; w++) { steer(); await bot.waitForTicks(1) }
    for (let w = 0; w < 30 && bot.entity.position.y > F - 1.9; w++) { steer(); await bot.waitForTicks(1) }
    ctx.sound('entity.player.small_fall', 0.8)
    ctx.log('health after the drop', bot.health)
    if (ctx.died) return false
    // 6. the lava bridge, sneaking, eyes down on it
    await until(C.bridge0 - 1.4)
    ctx.mark('bridge'); bot.setControlState('sneak', true)
    ctx.easeLook(0, -0.75, 500)
    let amb = 0
    for (let w = 0; w < 400 && zz() < C.bridge1 + 1.3 && !ctx.died; w++) { steer(); if (++amb % 14 === 0) ctx.sound('block.lava.pop', 0.6, 0.9 + (amb % 3) * 0.1); await bot.waitForTicks(1) }
    bot.setControlState('sneak', false)
    ctx.easeLook(0, -0.3, 400)
    // 7. made it... into the bush
    await until(C.bush - 2.2)
    ctx.mark('bush')
    for (let w = 0; w < 80 && !ctx.died; w++) { steer(); await bot.waitForTicks(1) }
    steerOn = false
    bot.clearControlStates()
    if (!ctx.died) return false
    await bot.waitForTicks(40)                                     // the death screen
    return true
  }
}
