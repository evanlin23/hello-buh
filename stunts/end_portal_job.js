// "POV: your job is filling end portals" (~30 s): a row of empty end portal rings on a field. The bot
// works them like a shift worker, within vanilla reach. It stands in the middle of a ring and puts
// eyes of ender into 11 frames, turning round the ring (real block_place with the eye, vanilla fill
// sound). Then it hops out over the south frame, turns and puts the 12th eye in from outside: the
// portal opens in front of it (the server builds the end_portal blocks). Then it walks to the next
// ring and does it again, faster each time, five rings. It ends looking down the row:
// more empty rings. The job never ends.
const RINGS = [0, 7, 14, 21, 28, 35, 42]   // ring origins along x (each ring is 5x5 with a 3x3 portal inside)
const FILL = [{ ms: 230, wait: 2 }, { ms: 140, wait: 1 }, { ms: 80, wait: 0 }, { ms: 50, wait: 0 }, { ms: 35, wait: 0 }]   // each shift faster

module.exports = {
  name: 'end_portal_job',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: your job is filling end portals',
  edit: {
    caption: 'POV: your job is filling end portals', red: 'job', song: 'songs/payphone.mp3', dropAt: 'portal', startAt: 'start:0', endAfter: 'outro:1.4',
    subs: [['ring', 'getting faster', 1.6, 1], ['ring', 'speedrun', 1.6, 2], ['ring', 'world record pace', 1.6, 3], ['ring', 'overtime', 1.6, 4], ['outro', 'it never ends', 1.6, 0]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let y0 = floor + 1; y0 <= floor + 16; y0 += 8) await ctx.cmd(`/fill ${x - 14} ${y0} ${z - 12} ${x + 56} ${y0 + 7} ${z + 18} air`)
    await ctx.cmd(`/fill ${x - 14} ${floor - 3} ${z - 12} ${x + 56} ${floor - 1} ${z + 18} dirt`)
    await ctx.cmd(`/fill ${x - 14} ${floor} ${z - 12} ${x + 56} ${floor} ${z + 18} grass_block`)
    // empty rings, every frame facing the middle (vanilla needs that for the portal to form)
    for (const rx of RINGS) {
      const X = x + rx, y = floor + 1
      for (let i = 1; i <= 3; i++) {
        await ctx.cmd(`/setblock ${X + i} ${y} ${z} end_portal_frame[facing=south,eye=false]`)
        await ctx.cmd(`/setblock ${X + i} ${y} ${z + 4} end_portal_frame[facing=north,eye=false]`)
        await ctx.cmd(`/setblock ${X} ${y} ${z + i} end_portal_frame[facing=east,eye=false]`)
        await ctx.cmd(`/setblock ${X + 4} ${y} ${z + i} end_portal_frame[facing=west,eye=false]`)
      }
    }
    await ctx.hotbar([['ender_eye', 64], 'iron_pickaxe', ['bread', 7]])
    await ctx.cmd('/gamemode survival')
    // in the middle of the first ring, facing its first frame (north-west)
    await ctx.tpCheck(x + 2.5, floor + 1, z + 2.5, 160, 40)
    ctx.select(0)
    return { x, y: floor, z }
  },

  // ring frames in fill order: round the ring clockwise from the south-west, ending on the
  // south-middle frame (the 12th, filled from outside)
  frames (rx) {
    const X = this.x + rx, z = this.z, y = this.floor + 1, out = []
    out.push([X + 1, y, z + 4])
    for (let i = 3; i >= 1; i--) out.push([X, y, z + i])
    for (let i = 1; i <= 3; i++) out.push([X + i, y, z])
    for (let i = 1; i <= 3; i++) out.push([X + 4, y, z + i])
    out.push([X + 3, y, z + 4])
    out.push([X + 2, y, z + 4])
    return out
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    let portalAt = null
    const onBlock = (o, n) => {
      if (n && n.name === 'end_portal' && portalAt === null) { portalAt = ctx.tick; ctx.mark('portal'); ctx.sound('block.end_portal.spawn', 1) }
    }
    bot.on('blockUpdate', onBlock)
    // walk to (tx, tz) with eyes on lookAt: the keys are picked for the wanted move, whatever the look;
    // jump held while crossing a frame
    const goTo = async (tx, tz, lookAt, jump = false, ease = 0.2) => {
      if (jump) bot.setControlState('jump', true)
      for (let k = 0; k < 140 && Math.hypot(bot.entity.position.x - tx, bot.entity.position.z - tz) > 0.3; k++) {
        const e = bot.entity, eye = e.position.offset(0, 1.62, 0), d = lookAt.minus(eye)
        const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        let dy = yaw - e.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        await bot.look(e.yaw + dy * ease, e.pitch + (pitch - e.pitch) * ease, true)
        const moveYaw = Math.atan2(-(tx - e.position.x), -(tz - e.position.z))
        let rel = moveYaw - e.yaw; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI
        const oct = Math.round(rel / (Math.PI / 4))
        bot.setControlState('forward', [-1, 0, 1].includes(oct)); bot.setControlState('back', [3, 4, -4, -3].includes(oct))
        bot.setControlState('left', [1, 2, 3].includes(oct)); bot.setControlState('right', [-1, -2, -3].includes(oct))
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
    }
    const eye = async ([fx, fy, fz], ms, wait) => {
      await ctx.easeLookAt(new Vec3(fx + 0.5, fy + 0.8, fz + 0.5), ms)
      ctx.sound('block.end_portal_frame.fill')
      bot._client.write('block_place', { hand: 0, location: { x: fx, y: fy, z: fz }, direction: 1, cursorX: 0.5, cursorY: 0.8125, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm()
      if (wait) await bot.waitForTicks(wait)
    }
    const { x, z, floor } = this
    ctx.mark('start')
    for (let r = 0; r < FILL.length; r++) {
      const X = x + RINGS[r], fr = this.frames(RINGS[r]), { ms, wait } = FILL[r]
      if (r > 0) {
        // walk east along the front of the row to the next ring, then hop in over its south frame
        ctx.mark('walk', { n: r })
        await goTo(X + 2.5, z + 5.6, new Vec3(X + 2.5, floor + 1.4, z + 2.5), false, 0.25)
        await goTo(X + 2.5, z + 2.5, new Vec3(X + 0.5, floor + 1.5, z + 4.5), true, 0.25)
      }
      ctx.mark('ring', { n: r })
      portalAt = null
      for (let k = 0; k < 11; k++) await eye(fr[k], k === 0 && r === 0 ? 200 : ms, wait)
      // out over the south frame, turn, and the 12th eye from outside
      ctx.mark('hop', { n: r })
      await goTo(X + 2.5, z + 5.6, new Vec3(X + 2.5, floor + 1.5, z + 8), true, 0.3)
      await eye(fr[11], 300, 0)
      const c = new Vec3(X + 2.5, floor + 1.75, z + 2.5)
      await ctx.easeLookAt(c, 350)
      for (let k = 0; k < 20 && portalAt === null; k++) await bot.waitForTicks(1)
      ctx.log('ring', r, 'portal', portalAt !== null, 'at', bot.entity.position)
      if (portalAt === null) return false
      await ctx.easeLookAt(c.offset(0.8, 0, -0.6), r >= 2 ? 400 : 600)
    }
    // the rest of the row: more empty rings waiting
    ctx.mark('outro')
    await ctx.easeLookAt(new Vec3(x + RINGS[6] + 2.5, floor + 1, z + 2.5), 900)
    await ctx.easeLookAt(new Vec3(x + RINGS[5] + 2.5, floor + 1, z + 2.5), 800)
    bot.removeListener('blockUpdate', onBlock)
    return !ctx.died
  }
}
