// "the torch trick never gets old 😭" (~31 s): five sand towers in a row, each bigger: 1x1, 2x2, 4x4,
// 5x5 and a 6x6 giant 26 high. The bot runs up to each, breaks bottom blocks and puts a torch in each
// gap, so the column falls onto the torch and every block pops into an item. It works a few columns at
// a time (break, break, break, then torch, torch, torch), sidestepping along the big ones, and backs
// off as each comes down; it ends just after the 6x6 pours down. An Efficiency V shovel insta-breaks
// sand (vanilla: speed 34 >= 30 x hardness 0.5), so each column is one click.
const D = 8                  // it backs off to this far in front of the towers
const TOWERS = [
  { dx: -22, w: 1, h: 8, near: 4 },
  { dx: -16, w: 2, h: 12, near: 3.5 },
  { dx: -9, w: 4, h: 18, near: 2.5 },
  { dx: 0, w: 5, h: 22, near: 2.5 },
  { dx: 10, w: 6, h: 26, near: 2.5, slot: 2 }   // a second torch stack for the last one
]

module.exports = {
  name: 'sand_tower',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the torch trick never gets old 😭',
  edit: {
    caption: 'the torch trick never gets old 😭', red: 'torch', song: 'songs/funk_abnormal.mp3', dropAt: 'drop_final',
    startAt: 'walk0:0.05', endAfter: 'crash:0.8'
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
    await ctx.hotbar(['diamond_shovel[enchantments={efficiency:5}]', ['torch', 64], ['torch', 64], ['bread', 12]])
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
    let aim = null
    const look = async (target, k = 0.3) => {
      aim = aim ? aim.plus(target.minus(aim).scaled(k)) : target.clone()
      const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
      await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
    }
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
    let lastSwing = -99
    const breakCol = async (cx, cz) => {
      const blk = bot.blockAt(new Vec3(cx, floor + 1, cz))
      try { await bot.dig(blk, 'ignore') } catch (e) { ctx.log('dig', cx, cz, e.message) }
      ctx.sound('block.sand.break', 1); ctx.particles('block', new Vec3(cx, floor + 1, cz), { block: 'sand' })
      if (ctx.tick - lastSwing >= 3) { bot.swingArm(); lastSwing = ctx.tick }   // ctx.tick: bot.time.age only updates once a second
      return ctx.tick
    }
    const torch = (cx, cz) => {
      bot._client.write('block_place', { hand: 0, location: { x: cx, y: floor, z: cz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm()
      ctx.sound('block.wood.place', 1)
    }
    // a few columns: break them one a tick, switch to the torches at once (the hand needs ~3 ticks to
    // come back up, or the swing happens below the frame), then each torch 6 ticks after its own break:
    // sand only falls 2 ticks after the update (a torch in the gap before then holds it up), and the
    // falling block needs ~7 more ticks to drop a whole block, so the torch is in before it lands
    const batch = async (cols, slot, first) => {
      const ticks = []
      ctx.select(0)
      for (const [cx, cz] of cols) {
        await look(bottom(cx, cz), 0.5)
        ticks.push(await breakCol(cx, cz))
        if (first && ticks.length === 1) ctx.mark('drop_final')
        await bot.waitForTicks(1)
      }
      ctx.select(slot)
      for (let i = 0; i < cols.length; i++) {
        await look(bottom(cols[i][0], cols[i][1]), 0.5)
        while (ctx.tick < ticks[i] + 6) await bot.waitForTicks(1)
        if (ctx.tick > ticks[i] + 7) ctx.log('late torch', ctx.tick - ticks[i])
        torch(cols[i][0], cols[i][1])
        await bot.waitForTicks(1)
      }
      const [cx, cz] = cols[cols.length - 1]
      setTimeout(() => ctx.log('column', cx, cz, 'now', bot.blockAt(new Vec3(cx, floor + 1, cz)).name), 500)
    }
    const sandLeft = (t) => {
      let n = 0
      for (let ix = 0; ix < t.w; ix++) for (let iz = 0; iz < t.w; iz++) for (let y = 1; y <= t.h; y++) if (bot.blockAt(new Vec3(t.x0 + ix, floor + y, t.z0 + iz)).name === 'sand') n++
      return n
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
      // the bottom layer, front row first, a few columns at a time; on the wide ones it sidesteps along
      // the row so it's in front of what it's breaking
      const cols = []
      for (let iz = t.w - 1; iz >= 0; iz--) for (let ix = 0; ix < t.w; ix++) cols.push([t.x0 + ix, t.z0 + iz])
      const per = t.w >= 4 ? 3 : 2
      for (let k = 0; k < cols.length; k += per) {
        const b = cols.slice(k, k + per)
        if (t.w >= 4) goal = new Vec3(b[0][0] + 0.5, 0, nearZ)
        await batch(b, t.slot || 1, last && k === 0)
      }
      // back off while it comes down onto the torches, the camera up the tower and back down; the
      // run to the next one starts while the last few blocks are still falling
      goal = new Vec3(cx, 0, farZ)
      const top = Math.min(t.h * 0.5, 10), total = t.w * t.w * t.h
      for (let i = 0; i < 200; i++) {
        const k = Math.min(1, i / (22 + t.h))
        await look(new Vec3(cx, floor + 2 + top * Math.sin(k * Math.PI), this.tz - t.w / 2 + 1), 0.12)
        await bot.waitForTicks(1)
        if (i % 3 === 0) {
          const left = sandLeft(t)
          if (last && left < total * 0.4) { ctx.mark('crash', { left }); break }   // the mass of it has come down
          if (!last && i > 16 && left < total * 0.12) break
        }
      }
      ctx.log('tower', ti, 'sand left', sandLeft(t))
    }
    // a moment more on the pile as the rest of it pours down (the Short ends 0.8 s after 'crash')
    for (let i = 0; i < 40; i++) { await look(new Vec3(TOWERS[4].x0 + 3, floor + 3, this.tz - 2), 0.08); await bot.waitForTicks(1) }
    bot.removeListener('physicsTick', steer)
    for (const c of ['forward', 'back', 'left', 'right', 'sprint']) bot.setControlState(c, false)
    await bot.waitForTicks(30)
    let left = 0
    for (const t of TOWERS) left += sandLeft(t)
    ctx.log('sand left at the end', left)
    return left === 0
  }
}
