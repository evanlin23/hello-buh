// "POV: your job is filling end portals" (~40 s): a row of empty end portal rings on a field. The bot
// works them like a shift worker, within vanilla reach. It stands in the middle of a ring and puts
// eyes of ender into 11 frames, turning round the ring (real block_place with the eye, vanilla fill
// sound, the look held on each frame until its eye shows). Then it backs out over the south frame and
// puts the 12th eye in from outside: the portal opens in front of it (the server builds the
// end_portal blocks). A jump cut to the next ring, and again, faster each time: seven rings (from the
// fifth, the hop out is cut too). Eyes stack to 16, so it runs through six stacks. It ends looking
// down the row: empty rings on into the fog. The job never ends.
const RINGS = Array.from({ length: 15 }, (_, i) => i * 7)
// each shift faster: the turn to the next frame (ms), then the look held on it while the eye goes in
// (ticks: the eye shows once the server's update is back, 2-3 ticks after the click)
const FILL = [{ ms: 230, hold: 3 }, { ms: 180, hold: 3 }, { ms: 140, hold: 2 }, { ms: 110, hold: 2 }, { ms: 90, hold: 2 }, { ms: 75, hold: 2 }, { ms: 60, hold: 2 }]
const N = FILL.length

module.exports = {
  name: 'end_portal_job',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: your job is filling end portals',
  edit: {
    caption: 'POV: your job is filling end portals', red: 'job', song: 'songs/payphone.mp3', dropAt: 'portal', startAt: 'start:0', endAfter: 'outro:1.4',
    subsY: 0.15,   // up in the sky, off the frames being filled
    subs: [['ring', 'getting faster', 1.6, 1], ['ring', 'speedrun', 1.6, 2], ['ring', 'world record pace', 1.6, 3], ['ring', 'overtime', 1.6, 4], ['ring', 'double shift', 1.6, 5], ['ring', 'no breaks', 1.6, 6]],
    cards: [['outro', 'IT NEVER ENDS 💀', 1.4, 'red']],
    // the walks between rings are cut, and from ring 5 on the hop out too (the shift speeds up)
    speed: [1, 2, 3, 4, 5, 6].flatMap(r => [[`walk${r}`, `in${r}`, 'cut'], ...(r >= 4 ? [[`hopA${r}`, `hopB${r}`, 'cut']] : [])])
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    // a wide, high clear: its cut edges stay out of the shots (in the fog)
    const X0 = x - 40, X1 = x + 130, Z0 = z - 64, Z1 = z + 56   // 171 x 121
    const nap = () => new Promise(resolve => setTimeout(resolve, 150))   // a breath for the server between big fills
    await ctx.cmd(`/tp @s ${x + 45} ${floor + 2} ${z + 2}`); await bot.waitForTicks(20)   // the set's middle: every fill is in loaded chunks
    await ctx.cmd('/kill @e[type=!player,distance=..150]')
    for (let y0 = floor + 1; y0 <= floor + 44; y0++) { await ctx.cmd(`/fill ${X0} ${y0} ${Z0} ${X1} ${y0} ${Z1} air`); await nap() }   // 1 high: < the 32768 cap
    for (let y0 = floor - 3; y0 <= floor - 1; y0++) await ctx.cmd(`/fill ${X0} ${y0} ${Z0} ${X1} ${y0} ${Z1} dirt`)
    await ctx.cmd(`/fill ${X0} ${floor} ${Z0} ${X1} ${floor} ${Z1} grass_block`)
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
    await ctx.hotbar([...[16, 16, 16, 16, 16, 4].map(n => ['ender_eye', n]), 'iron_pickaxe', ['bread', 7]])   // 7 rings x 12 eyes = 84: eyes stack to 16
    await ctx.cmd('/gamemode survival')
    // in the middle of the first ring, facing its first frame (north-west)
    await ctx.tpCheck(x + 2.5, floor + 1, z + 2.5, 160, 40)
    ctx.select(0)
    return { x: x + 45, y: floor, z }   // the row's middle: the harness records the world around it
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
    const goTo = async (tx, tz, lookAt, jump = false, ease = 0.2, sprint = false) => {
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
        bot.setControlState('sprint', sprint && oct === 0)
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
    }
    let used = 0
    const eye = async ([fx, fy, fz], ms, wait, settle = 0) => {
      if (used % 16 === 0) ctx.select(used / 16)   // a stack ran out: straight onto the next
      used++
      await ctx.easeLookAt(new Vec3(fx + 0.5, fy + 0.8, fz + 0.5), ms)
      if (settle) await bot.waitForTicks(settle)   // the look on the frame before the click
      ctx.sound('block.end_portal_frame.fill')
      ctx.mark('place', { x: fx, y: fy, z: fz, eye: true })   // vanilla timing: the eye shows 1 tick after the use
      bot._client.write('block_place', { hand: 0, location: { x: fx, y: fy, z: fz }, direction: 1, cursorX: 0.5, cursorY: 0.8125, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm()
      if (wait) await bot.waitForTicks(wait)
    }
    const { x, z, floor } = this
    ctx.mark('start')
    for (let r = 0; r < N; r++) {
      const X = x + RINGS[r], fr = this.frames(RINGS[r]), { ms, hold } = FILL[r]
      if (r > 0) {
        // walk east along the front of the row to the next ring, then hop in over its south frame
        ctx.mark('walk', { n: r }); ctx.mark(`walk${r}`)
        await goTo(X + 2.5, z + 5.6, new Vec3(X + 2.5, floor + 1.4, z + 2.5), false, 0.25, true)
        ctx.mark(`in${r}`)   // the walk is cut out in the edit: a jump cut to stepping into the next ring
        await goTo(X + 2.5, z + 2.5, new Vec3(X + 0.5, floor + 1.5, z + 4.5), true, 0.3)
      }
      ctx.mark('ring', { n: r })
      portalAt = null
      for (let k = 0; k < 11; k++) await eye(fr[k], k === 0 && r === 0 ? 200 : ms, hold)
      // backwards out over the south frame, eyes on the far side of the ring (no look straight down),
      // and the 12th eye from outside
      ctx.mark('hop', { n: r }); ctx.mark(`hopA${r}`)
      await goTo(X + 2.5, z + 5.6, new Vec3(X + 2.5, floor + 1.4, z - 0.5), true, 0.35)
      for (let k = 0; k < 4 && Math.hypot(bot.entity.velocity.x, bot.entity.velocity.z) > 0.03; k++) await bot.waitForTicks(1)
      ctx.mark(`hopB${r}`)
      await eye(fr[11], 200, 2, 1)
      const c = new Vec3(X + 2.5, floor + 1.75, z + 2.5)
      await ctx.easeLookAt(c, 250)
      for (let k = 0; k < 20 && portalAt === null; k++) await bot.waitForTicks(1)
      ctx.log('ring', r, 'portal', portalAt !== null, 'at', bot.entity.position)
      if (portalAt === null) return false
      await ctx.easeLookAt(c.offset(0.8, 0, -0.6), r >= 2 ? 300 : 500)
    }
    // the rest of the row: empty rings on and on into the fog
    ctx.mark('outro')
    await ctx.easeLookAt(new Vec3(x + RINGS[10] + 2.5, floor + 1, z + 2.5), 700)
    await ctx.easeLookAt(new Vec3(x + RINGS[14] + 2.5, floor + 1.5, z + 2.5), 1000)
    bot.removeListener('blockUpdate', onBlock)
    return !ctx.died
  }
}
