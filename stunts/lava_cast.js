// "satisfying lava cast 😌" (~22 s): a grassy 45° staircase hill with a raised platform behind its
// top. The bot stands on the top step at the hill's east side and pours five lava buckets along the
// lip (five streams side by side make one sheet), then strafes down the stairs beside the sheet as
// it runs down, looks back up it from the bottom, climbs back up and pours water on the platform's
// edge, one block above the lava: the water runs over the top of the flow and casts it from above
// (vanilla: water touching flowing lava -> cobblestone, a source -> obsidian). It follows the
// cast down the stairs, looks back up it, climbs back up and scoops the water: it drains off and the
// cobblestone shell is left, seen from the top.
// The lava phase runs with /tick rate LAVA_RATE (vanilla lava moves 1 block per 1.5 s, too slow
// for a Short); the water at 2x, about the bot's walking pace down the stairs.
const STEPS = 9, LAVA_RATE = Number(process.env.LAVA_RATE || 150), STREAMS = [2, 1, 0, -1, -2]
const HW = 3, WALK = 5   // hill from x-HW to x+WALK: the streams take x-2..x+2, a rail x+3, the bot walks x+4

module.exports = {
  name: 'lava_cast',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'satisfying lava cast 😌',
  edit: { caption: 'satisfying lava cast 😌', red: 'lava', song: 'songs/misery.mp3', dropAt: 'water:0', startAt: 'pour:-0.3', endAfter: 'reveal:2.0' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    const T = floor + STEPS          // the lip row's surface block (row z)
    this.x = x; this.z = z; this.floor = floor; this.T = T
    await ctx.defaultRules()
    const R = 16
    for (let y0 = floor + 1; y0 <= T + 12; y0 += 12) await ctx.cmd(`/fill ${x - R} ${y0} ${z - R} ${x + R} ${Math.min(y0 + 11, T + 12)} ${z + R + 8} air`)
    await ctx.cmd(`/fill ${x - R} ${floor - 4} ${z - R} ${x + R} ${floor - 1} ${z + R + 8} dirt`)
    await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R + 8} grass_block`)
    // platform behind the lip, one block higher (top T+1): the water goes on its edge
    await ctx.cmd(`/fill ${x - HW} ${floor} ${z - 4} ${x + WALK} ${T} ${z - 1} dirt`)
    await ctx.cmd(`/fill ${x - HW} ${T + 1} ${z - 4} ${x + WALK} ${T + 1} ${z - 1} grass_block`)
    // the lip (row z, top T) and the steps down south, one block lower each
    for (let k = 0; k < STEPS; k++) {
      if (T - k - 1 >= floor) await ctx.cmd(`/fill ${x - HW} ${floor} ${z + k} ${x + WALK} ${T - k - 1} ${z + k} dirt`)
      await ctx.cmd(`/fill ${x - HW} ${T - k} ${z + k} ${x + WALK} ${T - k} ${z + k} grass_block`)
    }
    // a one-block stone-brick rail on every step between the hill and the walkway (x+3): it keeps the
    // lava and the cast's water off the walkway (the water spread onto it and walled the bot in)
    for (let k = 1; k < STEPS; k++) await ctx.cmd(`/setblock ${x + 3} ${T - k + 1} ${z + k} stone_bricks`)   // not on the lip: the pours aim over it
    await ctx.cmd('/gamerule fire_spread_radius_around_player 0')
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 7')
    await ctx.hotbar([...STREAMS.map(() => 'lava_bucket'), 'water_bucket'])
    // on the lip at the walkway side, facing west along the lip
    await ctx.tpCheck(x + 4.9, T + 1, z + 0.5, 90, 40)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(10)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, T, floor } = this
    const W = Math.PI / 2   // yaw facing west
    ctx.mark('start')
    const aimUse = async (pt, slot, ms) => {
      ctx.select(slot)
      await ctx.easeLookAt(pt, ms)
      await bot.waitForTicks(1)
      bot.activateItem(); bot.swingArm()
      await bot.waitForTicks(2)
    }
    const step = (k) => new Vec3(x + 0.5, T - k + 1, z + k + 0.5)   // on the slope's centre line, k steps down
    // walk the stairs at x+4.5 by strafing, eyes on the sheet: dir +1 = down (south), -1 = up
    const strafe = async (dir, toZ, lookK) => {
      if (dir < 0) { bot.setControlState('jump', true); bot.setControlState('sprint', true) }
      let k = 0
      while (k++ < 140 && (dir > 0 ? bot.entity.position.z < toZ : bot.entity.position.z > toZ)) {
        const e = bot.entity
        const p = step(lookK(e.position.z - z)), eye = e.position.offset(0, 1.62, 0), d = p.minus(eye)
        const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        let dy = yaw - e.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        await bot.look(e.yaw + dy * 0.15, e.pitch + (pitch - e.pitch) * 0.15, true)
        // keys for the wanted move (along z, pulled back to the walkway line x+4.9), whatever the look
        const mx = (x + 4.9 - e.position.x) * 0.8, mz = dir
        const moveYaw = Math.atan2(-mx, -mz)
        let rel = moveYaw - e.yaw; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI
        const oct = Math.round(rel / (Math.PI / 4))   // 0 fwd, 2 left, -2 right, ±4 back
        bot.setControlState('forward', [-1, 0, 1].includes(oct))
        bot.setControlState('back', [3, 4, -4, -3].includes(oct))
        bot.setControlState('left', [1, 2, 3].includes(oct))
        bot.setControlState('right', [-1, -2, -3].includes(oct))
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
    }
    // climbing: look up the slope ahead (the keys then are mostly forward, and sprinting works)

    // 1. five pours along the lip, nearest first
    await ctx.cmd(`/tick rate ${LAVA_RATE}`)
    ctx.mark('pour')
    for (let i = 0; i < STREAMS.length; i++) {
      ctx.sound('item.bucket.empty_lava')
      await aimUse(new Vec3(x + STREAMS[i] + 0.5, T + 1 - 0.02, z + 0.5), i, i === 0 ? 250 : 140)
    }
    ctx.select(5)
    // 2. down the stairs beside the lava, watching it run a little ahead
    ctx.mark('down')
    await strafe(+1, z + STEPS - 0.6, (dz) => Math.min(STEPS, dz + 3))
    // 3. at the bottom: turn and look back up the whole sheet
    await ctx.easeLookAt(step(4).offset(0, -1, 0), 600)
    await ctx.easeLookAt(step(1), 700)
    await ctx.cmd('/tick rate 20')
    // 4. back up to the top
    ctx.mark('up')
    await ctx.easeLook(W, -0.45, 300)
    await strafe(-1, z + 0.6, (dz) => Math.max(0, dz - 3))
    // 5. water on the platform's edge right above the lava: it runs over the flow and casts it
    let lastCast = ctx.tick
    const onCast = (o, n) => { if (n && (n.name === 'cobblestone' || n.name === 'obsidian')) lastCast = ctx.tick }
    bot.on('blockUpdate', onCast)
    await ctx.cmd('/tick rate 40')   // the cast at 2x, about walking pace
    ctx.mark('water'); ctx.sound('item.bucket.empty')
    await aimUse(new Vec3(x + 2.5, T + 2 - 0.02, z - 1 + 0.75), 5, 350)
    // 6. follow the cast down the stairs
    await ctx.easeLookAt(step(1), 400)
    ctx.mark('follow')
    await strafe(+1, z + STEPS - 2.6, (dz) => Math.min(STEPS, dz + 1.5))   // stop above the water pooling at the bottom
    // 7. the bottom: look back up the shell while the last of it sets
    await ctx.easeLookAt(step(5).offset(0, -1, 0), 600)
    for (const [k, ms] of [[7, 700], [4, 700], [6, 700], [3, 700]]) {
      if (ctx.tick - lastCast > 12) break
      await ctx.easeLookAt(step(k).offset(k % 2 ? -1 : 0, -1, 0), ms)
    }
    bot.removeListener('blockUpdate', onCast)
    ctx.log('cast settled', ctx.tick - lastCast, 'ticks ago')
    await ctx.cmd('/tick rate 20')
    // 8. back up, scoop the water source: the water drains off the shell (quicker at 3x)
    ctx.mark('climb')
    await ctx.easeLook(Math.PI / 2, -0.4, 300)
    await strafe(-1, z + 0.6, (dz) => Math.max(0, dz - 3))
    ctx.mark('scoop'); ctx.sound('item.bucket.fill')
    await aimUse(new Vec3(x + 2.5, T + 2.4, z - 1 + 0.6), 5, 350)
    await ctx.cmd('/tick rate 60')
    await ctx.easeLookAt(step(3), 600)
    ctx.mark('reveal')
    await ctx.easeLookAt(step(7), 1100)
    await ctx.easeLookAt(step(5).offset(-1.5, 0, 0), 1000)
    await ctx.cmd('/tick rate 20')
    ctx.log('done at', bot.entity.position, 'floor', floor)
    return !ctx.died
  }
}
