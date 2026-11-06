// "satisfying lava cast 😌" (~33 s, two layers): a grassy 45° staircase hill. Behind its lip (row z,
// top T) is a one-block channel row (z-1, top T+1, rails at both ends) and behind that a raised
// platform (top T+2) the bot works from. A walkway runs down the hill's east side behind a stone
// brick rail. Every use is within vanilla reach.
//  Layer 1: the bot walks along the platform's edge pouring five lava buckets onto the lip below
//  (five streams side by side make one sheet), goes down to the walkway and strafes down the stairs
//  beside the sheet, looks back up it and climbs back. It pours water on the channel row, one block
//  above the lava: the water runs over the top of the flow and casts it from above (vanilla: water
//  touching flowing lava -> cobblestone, a source -> obsidian), it watches the cast run down from
//  the top, then scoops the water back up: it drains off and the cobblestone shell is left.
//  Layer 2: back up on the platform it pours three more buckets onto the obsidian line, the lava runs
//  down over the shell, and water from the platform (one block higher again) casts the second layer.
//  Scoop, drain, the thicker shell.
// The lava runs with /tick rate LAVA_RATE (vanilla lava moves 1 block per 1.5 s, too slow for a
// Short), the water at 2x, the drains at 3x.
const STEPS = 9, LAVA_RATE = Number(process.env.LAVA_RATE || 150), STREAMS = [-2, -1, 0, 1, 2]
const HW = 3, WALK = 5   // hill from x-HW to x+WALK: the streams take x-2..x+2, a rail x+3, the bot walks x+4

module.exports = {
  name: 'lava_cast',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'satisfying lava cast 😌',
  edit: {
    caption: 'satisfying lava cast 😌', red: 'lava', song: 'songs/misery.mp3', dropAt: 'water:0', startAt: 'pour:-0.3', endAfter: 'final:1.0',
    subs: [['pour', 'layer 1', 1.4, 0], ['pour', 'layer 2', 1.4, 1]]
  },

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
    // raised platform (rows z-5..z-2, top T+2) and the channel row z-1 (top T+1)
    await ctx.cmd(`/fill ${x - HW} ${floor} ${z - 5} ${x + WALK} ${T + 1} ${z - 2} dirt`)
    await ctx.cmd(`/fill ${x - HW} ${T + 2} ${z - 5} ${x + WALK} ${T + 2} ${z - 2} grass_block`)
    await ctx.cmd(`/fill ${x - HW} ${floor} ${z - 1} ${x + WALK} ${T} ${z - 1} dirt`)
    await ctx.cmd(`/fill ${x - HW} ${T + 1} ${z - 1} ${x + WALK} ${T + 1} ${z - 1} grass_block`)
    // the lip (row z, top T) and the steps down south, one block lower each
    for (let k = 0; k < STEPS; k++) {
      if (T - k - 1 >= floor) await ctx.cmd(`/fill ${x - HW} ${floor} ${z + k} ${x + WALK} ${T - k - 1} ${z + k} dirt`)
      await ctx.cmd(`/fill ${x - HW} ${T - k} ${z + k} ${x + WALK} ${T - k} ${z + k} grass_block`)
    }
    // stone-brick rails: on every step between the hill and the walkway (x+3), keeping the lava and
    // the water off the walkway; and closing both ends of the channel row (the second layer's water
    // fills it and must not run out onto the walkway)
    for (let k = 1; k < STEPS; k++) await ctx.cmd(`/setblock ${x + 3} ${T - k + 1} ${z + k} stone_bricks`)   // not on the lip: the pours aim over it
    await ctx.cmd(`/setblock ${x + 3} ${T + 2} ${z - 1} stone_bricks`)
    await ctx.cmd(`/setblock ${x - 3} ${T + 2} ${z - 1} stone_bricks`)
    await ctx.cmd('/gamerule fire_spread_radius_around_player 0')
    await ctx.hotbar([...STREAMS.map(() => 'lava_bucket'), 'water_bucket', ...STREAMS.slice(0, 3).map(() => 'lava_bucket')])
    // on the platform's edge above the west end of the lip, facing south down the hill
    // mineflayer misses the updates of big /fills (its copy of the world, and so the recording's
    // snapshot, kept the old terrain): go far away and back so the client gets fresh chunks
    await ctx.cmd(`/tp @s ${x + 3000} 200 ${z}`); await bot.waitForTicks(40)
    await ctx.tpCheck(x - 1.5, T + 3, z - 1.3, 0, 55)
    await bot.waitForChunksToLoad()   // not x-2.5: from there the first pour's ray clipped the channel's west rail
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(10)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, T } = this
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
    const keysFor = (moveYaw) => {   // movement keys for a wanted direction, whatever the look
      let rel = moveYaw - bot.entity.yaw; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI
      const oct = Math.round(rel / (Math.PI / 4))
      bot.setControlState('forward', [-1, 0, 1].includes(oct)); bot.setControlState('back', [3, 4, -4, -3].includes(oct))
      bot.setControlState('left', [1, 2, 3].includes(oct)); bot.setControlState('right', [-1, -2, -3].includes(oct))
    }
    const lookStep = async (p, ease) => {
      const e = bot.entity, eye = e.position.offset(0, 1.62, 0), d = p.minus(eye)
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = yaw - e.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      await bot.look(e.yaw + dy * ease, e.pitch + (pitch - e.pitch) * ease, true)
    }
    // walk to (tx, tz) with eyes on lookAt (jump held for steps up)
    const goTo = async (tx, tz, lookAt, { jump = false, ease = 0.25, tol = 0.2 } = {}) => {
      for (let k = 0; k < 120 && Math.hypot(bot.entity.position.x - tx, bot.entity.position.z - tz) > tol; k++) {
        await lookStep(lookAt, ease)
        const e = bot.entity
        keysFor(Math.atan2(-(tx - e.position.x), -(tz - e.position.z)))
        if (jump) bot.setControlState('jump', true)
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
    }
    // the walkway's stairs at x+4.9 by strafing, eyes on the sheet: dir +1 = down (south), -1 = up
    const strafe = async (dir, toZ, lookK) => {
      for (let k = 0; k < 140 && (dir > 0 ? bot.entity.position.z < toZ : bot.entity.position.z > toZ); k++) {
        await lookStep(step(lookK(bot.entity.position.z - z)), 0.15)
        keysFor(Math.atan2(-(x + 4.9 - bot.entity.position.x) * 0.8, -dir))
        if (dir < 0) { bot.setControlState('jump', true); bot.setControlState('sprint', true) }
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
    }
    // follow something growing down the hill with slow looks until it stops (no change for 12 ticks)
    const watch = async (names, legs, minK = 8) => {
      let last = ctx.tick
      const on = (o, n) => { if ((n && names.includes(n.name)) || (o && names.includes(o.name))) last = ctx.tick }
      bot.on('blockUpdate', on)
      for (const [k, ms] of legs) {
        await ctx.easeLookAt(step(k).offset(-1, -1, 0), ms)
        if (k >= minK && ctx.tick - last > 12) break
      }
      bot.removeListener('blockUpdate', on)
      return ctx.tick - last
    }
    const pourRow = async (xs, slots, edgeZ, tgtY, tgtZ) => {   // walk the platform edge east, a bucket at each stream
      for (let i = 0; i < xs.length; i++) {
        const tgt = new Vec3(x + xs[i] + 0.5, tgtY - 0.02, tgtZ)
        if (i > 0) await goTo(x + xs[i] + 0.5, edgeZ, tgt, { ease: 0.3, tol: 0.15 })
        ctx.sound('item.bucket.empty_lava')
        await aimUse(tgt, slots[i], i === 0 ? 200 : 120)
      }
    }

    // ---- layer 1 ----
    await ctx.cmd(`/tick rate ${LAVA_RATE}`)
    ctx.mark('pour', { n: 0 })
    await pourRow(STREAMS, [0, 1, 2, 3, 4], z - 1.3, T + 1, z + 0.8)
    ctx.select(5)
    // down to the walkway: platform -> channel row -> lip (one block each)
    await goTo(x + 4.6, z - 1.3, step(2), { ease: 0.2 })
    await goTo(x + 4.6, z - 0.5, step(3), { ease: 0.2 })
    await goTo(x + 4.9, z + 0.5, step(3), { ease: 0.2 })
    ctx.mark('down')
    await strafe(+1, z + STEPS - 0.6, (dz) => Math.min(STEPS, dz + 3))
    // at the bottom: look back up the whole sheet, then climb back
    await ctx.easeLookAt(step(4).offset(0, -1, 0), 500)
    await ctx.easeLookAt(step(1), 600)
    await ctx.cmd('/tick rate 20')
    ctx.mark('up')
    await ctx.easeLook(W, -0.45, 250)
    await strafe(-1, z + 0.6, (dz) => Math.max(0, dz - 3))
    // water on the channel row right above the lava sources: it casts the flow from above
    await ctx.cmd('/tick rate 40')
    ctx.mark('water', { n: 0 }); ctx.sound('item.bucket.empty')
    await aimUse(new Vec3(x + 2.5, T + 2 - 0.02, z - 1 + 0.75), 5, 350)
    ctx.mark('follow', { n: 0 })
    ctx.log('cast 1 settled', await watch(['cobblestone', 'obsidian'], [[2, 600], [4, 600], [6, 600], [8, 600], [9, 600], [7, 600], [9, 600], [6, 600]]), 'ticks ago')
    ctx.mark('scoop', { n: 0 }); ctx.sound('item.bucket.fill')
    await aimUse(new Vec3(x + 2.5, T + 2.4, z - 1 + 0.6), 5, 350)
    await ctx.cmd('/tick rate 60')
    await watch(['water'], [[3, 450], [5, 450], [7, 450], [8, 450], [6, 450]], 3)
    ctx.mark('reveal', { n: 0 })

    // ---- layer 2 ----
    // back up: lip -> channel row -> platform, then along the edge to the west end
    await goTo(x + 4.6, z - 0.5, step(1), { jump: true, ease: 0.2 })
    await goTo(x + 4.4, z - 1.4, step(1), { jump: true, ease: 0.2 })
    await goTo(x - 0.5, z - 1.4, step(2).offset(-2, 0, 0), { ease: 0.15, tol: 0.2 })
    await ctx.cmd(`/tick rate ${LAVA_RATE}`)
    ctx.mark('pour', { n: 1 })
    // three more buckets (slots 6-8; the hotbar has no room for five) onto the middle of the obsidian
    // line (top T+2): they run down over the first shell
    await pourRow([-1, 0, 1], [6, 7, 8], z - 1.4, T + 2, z + 0.6)
    ctx.select(5)
    await goTo(x + 3.9, z - 1.4, step(4), { ease: 0.2 })
    for (const [k, ms] of [[6, 500], [8, 500]]) await ctx.easeLookAt(step(k).offset(-1, -1, 0), ms)
    await ctx.cmd('/tick rate 40')
    // water on the platform's edge, one block above the new lava (it drops into the channel row)
    ctx.mark('water', { n: 1 }); ctx.sound('item.bucket.empty')
    await aimUse(new Vec3(x + 2.5, T + 3 - 0.02, z - 2 + 0.75), 5, 350)
    ctx.mark('follow', { n: 1 })
    ctx.log('cast 2 settled', await watch(['cobblestone', 'obsidian'], [[2, 600], [4, 600], [6, 600], [8, 600], [9, 600], [7, 600], [9, 600]]), 'ticks ago')
    ctx.mark('scoop', { n: 1 }); ctx.sound('item.bucket.fill')
    await aimUse(new Vec3(x + 2.5, T + 3.4, z - 2 + 0.6), 5, 350)
    await ctx.cmd('/tick rate 60')
    await watch(['water'], [[3, 450], [5, 450], [7, 450], [8, 450], [6, 450]], 3)
    ctx.mark('final')
    await ctx.easeLookAt(step(5).offset(-1.5, 0, 0), 1000)
    await ctx.cmd('/tick rate 20')
    return !ctx.died
  }
}
