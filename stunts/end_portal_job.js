// "POV: your job is filling end portals" (~40 s): a row of empty end portal rings on a field. The bot
// works them like a shift worker, within vanilla reach. It stands in the middle of a ring and puts
// eyes of ender into 11 frames, turning round the ring (real block_place with the eye, vanilla fill
// sound, the look held on each frame until its eye shows). Then it backs out over the south frame and
// puts the 12th eye in from outside: the portal opens in front of it (the server builds the
// end_portal blocks). A jump cut to the next ring, and again, faster each time: seven rings (from the
// fifth, the hop out is cut too). Eyes stack to 16, so it runs through six stacks. It ends looking
// down the row: empty rings on into the fog. The job never ends.
const RINGS = 12   // 7 to fill, 5 more waiting
const { openSpots, clearPlants } = require('./_site')
// each shift faster: the turn to the next frame (ms), then the look held on it while the eye goes in
// (ticks: the eye shows once the server's update is back, 2-3 ticks after the click)
const FILL = [{ ms: 230, hold: 3 }, { ms: 180, hold: 2 }, { ms: 140, hold: 2 }, { ms: 110, hold: 2 }, { ms: 90, hold: 2 }, { ms: 75, hold: 2 }, { ms: 60, hold: 2 }]   // the eye shows a tick after the click: the look holds 2 ticks so it's still there
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
    speed: [...[0, 1, 2, 3, 4, 5, 6].flatMap(r => [...(r ? [[`walk${r}`, `in${r}`, 'cut']] : []), [`hopA${r}`, `hopB${r}`, 'cut']]), ['outroA', 'outroB', 'cut']]
  },

  async setup (ctx) {
    const { bot, Vec3 } = ctx
    // no cleared box: each ring on its own patch of the natural ground (within a block of level, the
    // ring's 5x5 then levelled: at most a one-block step), nothing overhead
    // a retry respawns wherever the last attempt ended (once underground): back to the biome first
    await ctx.locateBiome(this.biome)
    const g = ctx.findLand(bot.entity.position.x | 0, bot.entity.position.z | 0)
    if (!g) throw new Error('no dry land')
    await ctx.defaultRules()
    await ctx.cmd('/kill @e[type=!player,distance=..150]')
    // the plains patch is small and the located point moves between runs: a few starts around it
    let lastErr = null
    this.spots = null   // not a previous attempt's
    for (const [dx, dz] of [[0, 0], [-24, 0], [0, -24], [-24, -24], [24, 24], [-48, 0], [0, 24]]) {
      try { this.spots = await openSpots(ctx, g.x + dx, g.z + dz, Array(RINGS).fill(2), { axis: 'x', gap: 8, foot: [0, 4, 0, 6], side: Array.from({ length: 41 }, (_, i) => (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 4), tries: 140, min: N, spread: 96 }); break } catch (e) { lastErr = e; ctx.log('rings from', dx, dz, ':', e.message) }
    }
    if (!this.spots) throw lastErr
    // the last ring filled next to a spare empty ring that can be seen from in front of it (the ending
    // looks at it: a spare hidden behind a step left IT NEVER ENDS over finished portals)
    if (this.spots.length > N) {
      const seen = (A, B) => {   // a clear line from A's front, eye height, to B's middle
        const fy = (ctx.surface(A.x + 2, A.z + 5) || { position: { y: A.floor } }).position.y
        const a = new Vec3(A.x + 2.5, fy + 2.62, A.z + 5.6), b = new Vec3(B.x + 2.5, B.floor + 1.5, B.z + 2.5)
        const n = Math.ceil(a.distanceTo(b) * 4)
        for (let i = 1; i < n; i++) { const p = a.plus(b.minus(a).scaled(i / n)); const k = bot.blockAt(p.floored()); if (k && k.boundingBox === 'block' && !/end_portal/.test(k.name)) return false }
        return true
      }
      let best = null
      for (let i = 0; i < N; i++) for (let j = N; j < this.spots.length; j++) {
        const A = this.spots[i], B = this.spots[j], d = Math.hypot(A.x - B.x, A.z - B.z)
        if (d <= 40 && (!best || d < best.d) && seen(A, B)) best = { i, j, d }
      }
      if (best) {
        const A = this.spots[best.i], B = this.spots[best.j]
        this.spots = [...this.spots.slice(0, N).filter((_, k) => k !== best.i), A, B, ...this.spots.slice(N).filter((_, k) => k + N !== best.j)]
        ctx.log('last ring', A, 'next to spare', B, 'seen, distance', best.d.toFixed(1))
      } else ctx.log('no spare ring in sight of a filled one')
    }
    // empty rings, every frame facing the middle (vanilla needs that for the portal to form)
    for (const S of this.spots) {
      const X = S.x, z = S.z, y = S.floor + 1
      ctx.log('ring at', S)
      await clearPlants(ctx, X - 1, y - 1, z - 1, X + 5, y + 2, z + 7)   // the grass and flowers on the patch (plants only)
      // the ring's 5x5 level with its floor: a block of ground off where it stood a block higher, filled
      // where it stood a block lower (the patch was within a block of level)
      await ctx.cmd(`/fill ${X} ${y} ${z} ${X + 4} ${y + 1} ${z + 4} air`)
      await ctx.cmd(`/fill ${X} ${y - 1} ${z} ${X + 4} ${y - 1} ${z + 4} grass_block`)
      await ctx.cmd(`/fill ${X} ${y - 2} ${z} ${X + 4} ${y - 2} ${z + 4} dirt replace air`)
      for (let i = 1; i <= 3; i++) {
        await ctx.cmd(`/setblock ${X + i} ${y} ${z} end_portal_frame[facing=south,eye=false]`)
        await ctx.cmd(`/setblock ${X + i} ${y} ${z + 4} end_portal_frame[facing=north,eye=false]`)
        await ctx.cmd(`/setblock ${X} ${y} ${z + i} end_portal_frame[facing=east,eye=false]`)
        await ctx.cmd(`/setblock ${X + 4} ${y} ${z + i} end_portal_frame[facing=west,eye=false]`)
      }
    }
    const S0 = this.spots[0]
    const n = this.spots.length, mx = Math.round(this.spots.reduce((a, S) => a + S.x, 0) / n), mz = Math.round(this.spots.reduce((a, S) => a + S.z, 0) / n)
    await ctx.hotbar([...[16, 16, 16, 16, 16, 4].map(n => ['ender_eye', n]), 'iron_pickaxe', ['bread', 7]])   // 7 rings x 12 eyes = 84: eyes stack to 16
    await ctx.cmd('/gamemode survival')
    // in the middle of the first ring, facing its first frame (north-west)
    await ctx.tpCheck(S0.x + 2.5, S0.floor + 1, S0.z + 2.5, 160, 40)
    ctx.select(0)
    return { x: mx, y: S0.floor, z: mz }   // the rings' middle: the harness records the world around it
  },

  // ring frames in fill order: round the ring clockwise from the south-west, ending on the
  // south-middle frame (the 12th, filled from outside)
  frames (S) {
    const X = S.x, z = S.z, y = S.floor + 1, out = []
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
      const tgt = new Vec3(fx + 0.5, fy + 0.8, fz + 0.5)
      if (settle) for (let k = 0; k < 10 && (Math.hypot(bot.entity.velocity.x, bot.entity.velocity.z) > 0.01 || !bot.entity.onGround); k++) await bot.waitForTicks(1)   // still from the hop in
      await ctx.easeLookAt(tgt, ms)
      await bot.lookAt(tgt, true)   // exactly on the frame (the ease aims from where it started)
      if (settle) await bot.waitForTicks(settle)   // the look on the frame before the click
      ctx.sound('block.end_portal_frame.fill')
      ctx.mark('place', { x: fx, y: fy, z: fz, eye: true })   // vanilla timing: the eye shows 1 tick after the use
      bot._client.write('block_place', { hand: 0, location: { x: fx, y: fy, z: fz }, direction: 1, cursorX: 0.5, cursorY: 0.8125, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm()
      if (wait) await bot.waitForTicks(wait)
    }
    ctx.mark('start')
    for (let r = 0; r < N; r++) {
      const S = this.spots[r], X = S.x, z = S.z, floor = S.floor, fr = this.frames(S), { ms, hold } = FILL[r]
      const fg = ctx.surface(X + 2, z + 5), front = (fg ? fg.position.y : floor) + 1   // the ground south of the ring (within a block of its floor)
      if (r > 0) {
        // to the next ring (a jump cut in the edit: walk<r>..in<r>), then hop in over its south frame
        ctx.mark('walk', { n: r }); ctx.mark(`walk${r}`)
        for (let t = 0; ; t++) {
          await ctx.cmd(`/tp @s ${X + 2.5} ${front} ${z + 5.6} 180 35`)
          if (Math.abs(bot.entity.position.x - (X + 2.5)) < 0.1 && Math.abs(bot.entity.position.z - (z + 5.6)) < 0.1) break
          if (t > 20) throw new Error('teleport did not stick')
        }
        ctx.mark(`in${r}`)
        await goTo(X + 2.5, z + 2.5, new Vec3(X + 0.5, floor + 1.5, z + 4.5), true, 0.3)
      }
      ctx.mark('ring', { n: r })
      portalAt = null
      for (let k = 0; k < 11; k++) await (k === 0 ? eye(fr[k], 250, hold, 1) : eye(fr[k], ms, hold))   // the first one a full turn (from the ring's middle) and a settle
      // backwards out over the south frame, eyes on the far side of the ring (no look straight down),
      // and the 12th eye from outside
      ctx.mark('hop', { n: r }); ctx.mark(`hopA${r}`)
      // out over the south frame: a jump cut (the backing-out hop stalled on uneven ground and once left
      // the bot standing in the ring as its portal opened)
      for (let t = 0; ; t++) {
        await ctx.cmd(`/tp @s ${X + 2.5} ${front} ${z + 5.6} 180 40`)
        if (Math.abs(bot.entity.position.z - (z + 5.6)) < 0.1 && Math.abs(bot.entity.position.x - (X + 2.5)) < 0.1) break
        if (t > 20) throw new Error('teleport did not stick')
      }
      for (let k = 0; k < 10 && !bot.entity.onGround; k++) await bot.waitForTicks(1)
      ctx.mark(`hopB${r}`)
      await eye(fr[11], 200, 2, 1)
      const c = new Vec3(X + 2.5, floor + 1.75, z + 2.5)
      await ctx.easeLookAt(c, 250)
      for (let k = 0; k < 20 && portalAt === null; k++) await bot.waitForTicks(1)
      ctx.log('ring', r, 'portal', portalAt !== null, 'at', bot.entity.position)
      if (portalAt === null) return false
      await ctx.easeLookAt(c.offset(0.8, 0, -0.6), r >= 2 ? 300 : 500)
    }
    // the rest of the field: empty rings waiting, near and far
    // the ending: a jump cut to the next empty ring (outroA..outroB), standing at it as at every other
    // ring, and a slow push across its empty frames (from 24 blocks off the spare didn't read on screen)
    const sp = this.spots[N]
    if (sp) {
      const g2 = ctx.surface(sp.x + 2, sp.z + 5), fy = (g2 ? g2.position.y : sp.floor) + 1
      ctx.mark('outroA')
      for (let t = 0; ; t++) {
        await ctx.cmd(`/tp @s ${sp.x + 2.5} ${fy} ${sp.z + 6.6} 180 35`)
        if (Math.abs(bot.entity.position.z - (sp.z + 6.6)) < 0.1) break
        if (t > 20) throw new Error('teleport did not stick')
      }
      for (let k = 0; k < 10 && !bot.entity.onGround; k++) await bot.waitForTicks(1)
      ctx.mark('outroB')
      ctx.mark('outro')
      await ctx.easeLookAt(new Vec3(sp.x + 1.5, sp.floor + 1.5, sp.z + 2.5), 700)
      await ctx.easeLookAt(new Vec3(sp.x + 3.5, sp.floor + 1.5, sp.z + 1.5), 1300)
    } else {   // no spare: across the filled ones
      ctx.mark('outro')
      const here = bot.entity.position
      const others = this.spots.slice(0, N - 1).map(S => new Vec3(S.x + 2.5, S.floor + 1, S.z + 2.5)).sort((a, b) => b.distanceTo(here) - a.distanceTo(here))
      await ctx.easeLookAt(others[others.length - 1], 700)
      await ctx.easeLookAt(others[0], 1300)
    }
    bot.removeListener('blockUpdate', onBlock)
    return !ctx.died
  }
}
