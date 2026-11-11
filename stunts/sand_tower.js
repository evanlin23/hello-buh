// "the torch trick never gets old 😭": four sand towers in a row, each bigger, 1x1 up to a 4x4 26 high. The bot runs
// up to each and does the torch trick one column at a time with the crosshair on it (owner r:rffba12): break the
// bottom block, a torch into the gap, so the column falls onto the torch and every block pops into an item; it
// sidesteps along the wide ones and backs off as each comes down, and the Short ends once the last block of the
// 4x4 has landed (owner r:r24d99a). An Efficiency V shovel insta-breaks sand (vanilla: speed 34 >= 30 x hardness
// 0.5), so each column is one click.
const MOTION = require('../lib/motion')
const D = 8                  // it backs off to this far in front of the towers
const TOWERS = [   // one column at a time with the crosshair on each (r:rffba12): 30 columns, not 91
  { dx: -20, w: 1, h: 8, near: 3.5 },
  { dx: -15, w: 2, h: 12, near: 3 },
  { dx: -9, w: 3, h: 16, near: 3 },
  { dx: -1, w: 4, h: 26, near: 3 }
]

module.exports = {
  name: 'sand_tower',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the torch trick never gets old 😭',
  edit: {
    caption: 'the torch trick never gets old 😭', red: 'torch', dropAt: 'drop_final',
    // opens on the first break (sound on frame 0: pace), a punch + shake as the 6x6 crashes (the payoff's picture change)
    // the end counts from the last block landing (r:r24d99a): a shake as the 4x4 crashes down, then the hit, a punch and
    // the song's dip on 'settled' (the payoff: pace wants a sound and a picture change on it), out 0.6 s later
    startAt: 'walk0:0.45', endAfter: 'settle:0.6', shake: [['crash', 0, 8]], punch: [['settle', 0, 1.06]],
    sfx: [['dip', 'settle', 0.35], ['impact', 'settle']]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    for (let i = 0; i < 12; i++) { try { await bot.waitForTicks(2); break } catch (e) { ctx.log('server busy', i) } }
    await ctx.defaultRules()
    // wide and deep, r 64 (a cut dirt block showed on the horizon with a 20-block margin). Big fills
    // stall the server past mineflayer's tick wait: send each, then wait until it ticks again
    const bigFill = async (c) => {
      bot.chat(c)
      await new Promise(r => setTimeout(r, 400))
      for (let i = 0; i < 10; i++) { try { await bot.waitForTicks(1); break } catch (e) { ctx.log('fill still running', i) } }
    }
    const z0 = z - D - 64, z1 = z + 8          // 81 deep
    for (const [xa, xb] of [[x - 64, x - 1], [x, x + 64]]) {        // under the 32768 cap: 65 x 6 x 81
      for (let y0 = floor + 1; y0 <= floor + 36; y0 += 6) await bigFill(`/fill ${xa} ${y0} ${z0} ${xb} ${y0 + 5} ${z1} air`)
      await bigFill(`/fill ${xa} ${floor} ${z0} ${xb} ${floor} ${z1} grass_block`)
      await bigFill(`/fill ${xa} ${floor - 3} ${z0} ${xb} ${floor - 1} ${z1} dirt`)
    }
    this.tz = z - D                                  // front face of every tower
    for (const t of TOWERS) {
      t.x0 = x + t.dx; t.z0 = this.tz - t.w + 1
      await ctx.cmd(`/fill ${t.x0} ${floor + 1} ${t.z0} ${t.x0 + t.w - 1} ${floor + t.h} ${t.z0 + t.w - 1} sand`)
    }
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 20')
    await ctx.hotbar(['diamond_shovel[enchantments={efficiency:5}]', ['torch', 64], ['bread', 12], 'water_bucket'])
    // two blocks back from the first tower, looking at its base: it walks in from frame 0
    const t0 = TOWERS[0]
    await ctx.tpCheck(t0.x0 + 0.5, floor + 1, this.tz + 1 + t0.near + 2.5, 180, 5)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { floor } = this
    const farZ = this.tz + 1 + D + 0.5
    // every look is a target for the aim governor (lib/motion.js stepTurn: a hand on a mouse, top speed and
    // acceleration, braking onto the target). Raw per-tick looks whipped at up to 620 deg/s and zig-zagged
    // between columns (rec_check, 2026-11-11)
    let aim = null
    const gov = { cur: { yaw: bot.entity.yaw, pitch: bot.entity.pitch }, vel: { yaw: 0, pitch: 0 }, target: null }
    const LIM = { speed: 200 * MOTION.DEG / 20, accel: 1500 * MOTION.DEG / 400 }
    const govTick = () => {
      if (!gov.target) return
      const r = MOTION.stepTurn(gov.cur, gov.vel, gov.target, LIM)
      gov.cur = r.cur; gov.vel = r.vel
      bot.look(gov.cur.yaw, gov.cur.pitch, true)   // motion-ok: the follow-governor's own eased step (lib/motion stepTurn), for the walks and the watch
    }
    bot.on('physicsTick', govTick)
    const look = async (target, k = 0.3) => {
      aim = aim ? aim.plus(target.minus(aim).scaled(k)) : target.clone()
      const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
      gov.target = { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
    }
    const settled = () => !gov.target || (Math.abs(MOTION.wrap(gov.target.yaw - gov.cur.yaw)) < 0.05 && Math.abs(gov.target.pitch - gov.cur.pitch) < 0.05)
    // walk to a ground point whatever way it's looking (the controls are relative to the yaw); sprint
    // when it's heading forward
    let goal = null, run = false
    const steer = () => {
      const keys = { forward: false, back: false, left: false, right: false }
      if (goal) {
        const p = bot.entity.position, dx = goal.x - p.x, dz = goal.z - p.z
        if (Math.hypot(dx, dz) > 0.35) {
          const fx = -Math.sin(bot.entity.yaw), fz = -Math.cos(bot.entity.yaw)
          const f = dx * fx + dz * fz, r = dx * -fz + dz * fx, m = Math.hypot(f, r)
          if (f / m > 0.38) keys.forward = true; if (f / m < -0.38) keys.back = true
          if (r / m > 0.38) keys.right = true; if (r / m < -0.38) keys.left = true
        }
      }
      for (const c in keys) bot.setControlState(c, keys[c])
      bot.setControlState('sprint', run && keys.forward && !keys.back)
    }
    bot.on('physicsTick', steer)
    const arrived = () => goal && Math.hypot(goal.x - bot.entity.position.x, goal.z - bot.entity.position.z) <= 0.4
    const bottom = (cx, cz) => new Vec3(cx + 0.5, floor + 1.5, cz + 0.5)   // the crosshair on the block it breaks
    // every break and torch through lib/act.js: the crosshair lands on the block before it acts (owner r:rffba12)
    const A = require('../lib/act')(ctx)
    const sandLeft = (t) => {
      let n = 0
      for (let ix = 0; ix < t.w; ix++) for (let iz = 0; iz < t.w; iz++) for (let y = 1; y <= t.h; y++) if (bot.blockAt(new Vec3(t.x0 + ix, floor + y, t.z0 + iz)).name === 'sand') n++
      return n
    }
    const falling = () => Object.values(bot.entities).filter(e => e.name === 'falling_block').length
    // A.dig / A.place turn the view themselves: our follow-governor lets go of the view while they act, and picks it up
    // again from wherever they left it
    const column = async (cx, cz, mark) => {
      gov.target = null
      ctx.select(0)
      const b = bot.blockAt(new Vec3(cx, floor + 1, cz))
      if (b && b.name === 'sand') {
        try { await A.dig(b, { instant: true, delay: 1, sound: 'block.sand.break' }) } catch (e) { ctx.log('dig', cx, cz, e.message) }
        ctx.particles('block', new Vec3(cx, floor + 1, cz), { block: 'sand' })
      }
      const tb = ctx.tick
      if (mark) ctx.mark(mark)
      ctx.select(1)
      // the torch into the gap, on the top face of the ground block the crosshair is already on, 5 ticks after the break
      while (ctx.tick < tb + 4) await bot.waitForTicks(1)   // (a torch in before the sand starts to fall holds it up)
      try { await A.place(new Vec3(cx, floor + 1, cz), { against: new Vec3(cx, floor, cz), block: 'torch', delay: 4, sound: 'block.wood.place' }) } catch (e) { ctx.log('torch', cx, cz, e.message) }
      gov.cur = { yaw: bot.entity.yaw, pitch: bot.entity.pitch }; gov.vel = { yaw: 0, pitch: 0 }
      aim = bottom(cx, cz)
      setTimeout(() => ctx.log('column', cx, cz, 'now', bot.blockAt(new Vec3(cx, floor + 1, cz)).name), 500)
    }

    for (let ti = 0; ti < TOWERS.length; ti++) {
      const t = TOWERS[ti], last = ti === TOWERS.length - 1
      const cx = t.x0 + t.w / 2, nearZ = this.tz + 1 + t.near + 0.5
      const mid = new Vec3(cx, floor + Math.min(t.h, 16) * 0.5, this.tz - t.w / 2 + 1)
      const firstCol = bottom(t.x0, this.tz)
      // run up to it (looking up the tower), eyes down to its base on the way in
      ctx.mark(`walk${ti}`)
      goal = new Vec3(t.x0 + 0.5, 0, nearZ); run = ti > 0
      if (ti === 0) aim = firstCol.clone()
      for (let i = 0; i < 70 && !arrived(); i++) { await look(ti > 0 && i < 14 ? mid : firstCol, 0.14); await bot.waitForTicks(1) }
      run = false
      ctx.mark(`tower${ti}`)
      // the bottom layer, front row first, left to right; on the wide ones it sidesteps along the row so it's in
      // front of what it's breaking
      let k = 0
      for (let iz = t.w - 1; iz >= 0; iz--) {
        for (let ix = 0; ix < t.w; ix++) {
          if (t.w >= 3) goal = new Vec3(t.x0 + ix + 0.5, 0, nearZ)
          await column(t.x0 + ix, t.z0 + iz, last && k === 0 ? 'drop_final' : null)
          k++
        }
      }
      // back off while it comes down onto the torches, the camera up the tower and back down. The last one: every
      // block lands before the end (owner, r:r24d99a: "let the last pillar of sand all fall before we end/cut")
      goal = new Vec3(cx, 0, farZ)
      const top = Math.min(t.h * 0.5, 10), total = t.w * t.w * t.h
      let crashed = false
      for (let i = 0; i < 300; i++) {
        const kk = Math.min(1, i / (22 + t.h))
        await look(new Vec3(cx, floor + 2 + top * (last ? Math.max(0.15, Math.sin(kk * Math.PI)) : Math.sin(kk * Math.PI)), this.tz - t.w / 2 + 1), 0.12)
        await bot.waitForTicks(1)
        if (i % 2 === 0) {
          const left = sandLeft(t)
          if (last && !crashed && left < total * 0.3) { crashed = true; ctx.mark('crash', { left }) }
          if (last && left === 0 && !falling()) { ctx.mark('settled'); break }
          if (!last && i > 16 && left < total * 0.12) break
        }
      }
      ctx.log('tower', ti, 'sand left', sandLeft(t), 'falling', falling())
    }
    // the settled pile: the Short ends ~0.6 s after 'settled'
    for (let i = 0; i < 24; i++) { await look(new Vec3(TOWERS[TOWERS.length - 1].x0 + 2, floor + 1.5, this.tz - 1), 0.08); await bot.waitForTicks(1) }
    bot.removeListener('physicsTick', steer); bot.removeListener('physicsTick', govTick)
    for (const c of ['forward', 'back', 'left', 'right', 'sprint']) bot.setControlState(c, false)
    await bot.waitForTicks(10)
    let left = 0
    for (const t of TOWERS) left += sandLeft(t)
    ctx.log('sand left at the end', left)
    return left === 0
  }
}
