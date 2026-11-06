// "satisfying lava cast 😌" (~21 s): a grassy 45° staircase hill with a raised platform behind its
// top. The bot walks along the platform's edge pouring five lava buckets onto the lip below (five
// streams side by side make one sheet), steps down onto a walkway on the hill's east side (a stone
// brick rail between it and the lava), strafes down the stairs beside the sheet as it runs down,
// looks back up it and climbs back up. Then it pours water on the platform's edge, one block above
// the lava: the water runs over the top of the flow and casts it from above (vanilla: water touching
// flowing lava -> cobblestone, a source -> obsidian). It watches the cast run down from the top,
// then scoops the water back up: it drains off and the cobblestone shell is left. Every use is
// within vanilla reach.
// The lava phase runs with /tick rate LAVA_RATE (vanilla lava moves 1 block per 1.5 s, too slow
// for a Short); the water at 2x, about the bot's walking pace down the stairs.
const STEPS = 9, LAVA_RATE = Number(process.env.LAVA_RATE || 150), STREAMS = [2, 1, 0, -1, -2]
const HW = 3, WALK = 5   // hill from x-HW to x+WALK: the streams take x-2..x+2, a rail x+3, the bot walks x+4

module.exports = {
  name: 'lava_cast',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'satisfying lava cast 😌',
  edit: { caption: 'satisfying lava cast 😌', red: 'lava', song: 'songs/misery.mp3', dropAt: 'water:0', startAt: 'pour:-0.3', endAfter: 'reveal:1.0' },

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
    await ctx.hotbar([...STREAMS.map(() => 'lava_bucket'), 'water_bucket'])
    // on the platform's edge above the west end of the lip, facing south down the hill
    await ctx.tpCheck(x - 2.5, T + 2, z - 0.45, 0, 50)
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

    // 1. strafe east along the platform's edge and pour a bucket onto the lip below at each of the
    // five spots as it passes (all within ~2 blocks): five streams side by side make one sheet
    await ctx.cmd(`/tick rate ${LAVA_RATE}`)
    ctx.mark('pour')
    const along = async (tx, lookAt, ease = 0.3) => {   // strafe along the edge (z - 0.45) to x = tx
      for (let k = 0; k < 80 && Math.abs(bot.entity.position.x - tx) > 0.15; k++) {
        const e = bot.entity, eye = e.position.offset(0, 1.62, 0), d = lookAt.minus(eye)
        const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        let dy = yaw - e.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        await bot.look(e.yaw + dy * ease, e.pitch + (pitch - e.pitch) * ease, true)
        const moveYaw = Math.atan2(-(tx - e.position.x), -(z - 0.45 - e.position.z) * 3)
        let rel = moveYaw - e.yaw; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI
        const oct = Math.round(rel / (Math.PI / 4))
        bot.setControlState('forward', [-1, 0, 1].includes(oct)); bot.setControlState('back', [3, 4, -4, -3].includes(oct))
        bot.setControlState('left', [1, 2, 3].includes(oct)); bot.setControlState('right', [-1, -2, -3].includes(oct))
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
    }
    const order = [-2, -1, 0, 1, 2]
    for (let i = 0; i < order.length; i++) {
      const tgt = new Vec3(x + order[i] + 0.5, T + 1 - 0.02, z + 0.5)
      if (i > 0) await along(x + order[i] + 0.5, tgt)
      ctx.sound('item.bucket.empty_lava')
      await aimUse(tgt, i, i === 0 ? 200 : 120)
    }
    ctx.select(5)
    // on along the edge to the walkway, then down onto the lip beside the rail
    await along(x + 4.9, step(2), 0.2)
    await strafe(+1, z + 0.5, (dz) => 3)
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
    // 6. watch the cast run down the stairs from the top, until it stops growing
    ctx.mark('follow')
    for (const [k, ms] of [[2, 600], [4, 600], [6, 600], [8, 600], [9, 600], [7, 600], [9, 600], [6, 600]]) {
      await ctx.easeLookAt(step(k).offset(-1, -1, 0), ms)
      if (k >= 8 && ctx.tick - lastCast > 12) break
    }
    bot.removeListener('blockUpdate', onCast)
    ctx.log('cast settled', ctx.tick - lastCast, 'ticks ago')
    // 7. scoop the water source back up: the water drains off the shell (quicker at 3x)
    ctx.mark('scoop'); ctx.sound('item.bucket.fill')
    await aimUse(new Vec3(x + 2.5, T + 2.4, z - 1 + 0.6), 5, 350)
    await ctx.cmd('/tick rate 60')
    // follow the drain down the shell; the reveal is when the water has run off (no water change
    // for 6 ticks)
    let lastWater = ctx.tick
    const onWater = (o, n) => { if ((o && o.name === 'water') || (n && n.name === 'water')) lastWater = ctx.tick }
    bot.on('blockUpdate', onWater)
    for (const [k, ms] of [[3, 500], [5, 500], [7, 500], [8, 500], [6, 500]]) {
      await ctx.easeLookAt(step(k).offset(-0.5, -0.5, 0), ms)
      if (ctx.tick - lastWater > 6) break
    }
    bot.removeListener('blockUpdate', onWater)
    ctx.mark('reveal')
    await ctx.easeLookAt(step(5).offset(-1.5, 0, 0), 1000)
    await ctx.cmd('/tick rate 20')
    ctx.log('done at', bot.entity.position, 'floor', floor)
    return !ctx.died
  }
}
