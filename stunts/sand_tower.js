// "the torch trick never gets old 😭" (~31 s): five sand towers in a row, each bigger. The bot walks
// up to each, breaks the bottom block and puts a torch in its place, so the column falls onto the torch
// and every block pops into an item: a 1x1, a tall 1x1, a 3x3, a 4x4 and a 5x5 giant (24 high). On
// the wide ones it works three columns at a time (break, break, break, then torch, torch, torch) so a
// whole strip of the tower drops together. It backs off while each tower comes down. An Efficiency V
// shovel insta-breaks sand (vanilla: speed 34 >= 30 x hardness 0.5), so each column is one click.
const D = 11                 // the far line (where it backs off to) is this far in front of the towers
const NEAR = 4               // ...and it clicks from this far in front of the front face
const TOWERS = [
  { dx: -16, w: 1, h: 8 },
  { dx: -12, w: 1, h: 20 },
  { dx: -7, w: 3, h: 14 },
  { dx: 0, w: 4, h: 18 },
  { dx: 8, w: 5, h: 24 }
]

module.exports = {
  name: 'sand_tower',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the torch trick never gets old 😭',
  edit: {
    caption: 'the torch trick never gets old 😭', red: 'torch', song: 'songs/funk_abnormal.mp3', dropAt: 'drop4',
    startAt: 'tower0:-0.4', endAfter: 'gone:1.3'
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    // wide and deep (the old x±20 clearing left a cut dirt cliff in frame). Big fills stall the
    // server past mineflayer's tick wait: send each, then wait until it ticks again
    const bigFill = async (c) => {
      bot.chat(c)
      await new Promise(r => setTimeout(r, 400))
      for (let i = 0; i < 8; i++) { try { await bot.waitForTicks(1); break } catch (e) { ctx.log('fill still running', i) } }
    }
    const z0 = z - D - 20, z1 = z + 6
    for (let y0 = floor + 1; y0 <= floor + 36; y0 += 7) await bigFill(`/fill ${x - 40} ${y0} ${z0} ${x + 40} ${y0 + 6} ${z1} air`)
    await bigFill(`/fill ${x - 40} ${floor} ${z0} ${x + 40} ${floor} ${z1} grass_block`)
    await bigFill(`/fill ${x - 40} ${floor - 3} ${z0} ${x + 40} ${floor - 1} ${z1} dirt`)
    this.tz = z - D                                  // front face of every tower
    for (const t of TOWERS) {
      t.x0 = x + t.dx; t.z0 = this.tz - t.w + 1
      await ctx.cmd(`/fill ${t.x0} ${floor + 1} ${t.z0} ${t.x0 + t.w - 1} ${floor + t.h} ${t.z0 + t.w - 1} sand`)
    }
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 20')
    await ctx.hotbar(['diamond_shovel[enchantments={efficiency:5}]', ['torch', 64], ['sand', 64], ['bread', 12]])
    const t0 = TOWERS[0]
    await ctx.tpCheck(t0.x0 + 0.5, floor + 1, this.tz + 1 + NEAR + 0.5, 180, -30)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { floor } = this
    const nearZ = this.tz + 1 + NEAR + 0.5, farZ = this.tz + 1 + D + 0.5
    let aim = null
    const look = async (target, k = 0.3) => {
      aim = aim ? aim.plus(target.minus(aim).scaled(k)) : target.clone()
      const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
      await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
    }
    const glide = async (target, ticks, k = 0.2) => { for (let i = 0; i < ticks; i++) { await look(target, k); await bot.waitForTicks(1) } }
    // walk to a ground point whatever way it's looking (the controls are relative to the yaw)
    let goal = null
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
    }
    bot.on('physicsTick', steer)
    const arrived = () => goal && Math.hypot(goal.x - bot.entity.position.x, goal.z - bot.entity.position.z) <= 0.4
    let lastSwing = -99
    const breakCol = async (cx, cz) => {
      const blk = bot.blockAt(new Vec3(cx, floor + 1, cz))
      try { await bot.dig(blk, 'ignore') } catch (e) { ctx.log('dig', cx, cz, e.message) }   // mineflayer's own dig: raw packets only worked for the first tower
      ctx.sound('block.sand.break', 1); ctx.particles('block', new Vec3(cx, floor + 1, cz), { block: 'sand' })
      if (ctx.tick - lastSwing >= 3) { bot.swingArm(); lastSwing = ctx.tick }   // ctx.tick: bot.time.age only updates once a second
      return ctx.tick
    }
    const torch = (cx, cz) => {
      bot._client.write('block_place', { hand: 0, location: { x: cx, y: floor, z: cz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm()
      ctx.sound('block.wood.place', 1)
    }
    // up to three columns: break them one a tick, then each torch 3 ticks after its own break (sand
    // checks for a free space 2 ticks after the update, and a torch isn't one; the falling block needs
    // ~7 more ticks to drop a whole block, so the torch is in the gap before it lands)
    const batch = async (cols, k0) => {
      const ticks = []
      ctx.select(0)
      for (const [cx, cz] of cols) {
        await look(new Vec3(cx + 0.5, floor + 3, cz + 0.5), 0.35)
        ticks.push(await breakCol(cx, cz))
        if (k0 === 0 && ticks.length === 1 && this.mark4) { ctx.mark('drop4'); this.mark4 = false }
        await bot.waitForTicks(1)
      }
      ctx.select(1)
      for (let i = 0; i < cols.length; i++) {
        while (ctx.tick < ticks[i] + 3) await bot.waitForTicks(1)
        if (ctx.tick > ticks[i] + 6) ctx.log('late torch', ctx.tick - ticks[i])
        torch(cols[i][0], cols[i][1])
        await look(new Vec3(cols[i][0] + 0.5, floor + 3, cols[i][1] + 0.5), 0.25)
        await bot.waitForTicks(1)
      }
      const [cx, cz] = cols[cols.length - 1]
      setTimeout(() => ctx.log('column', cx, cz, 'now', bot.blockAt(new Vec3(cx, floor + 1, cz)).name), 400)
    }
    const sandLeft = (t) => {
      let n = 0
      for (let ix = 0; ix < t.w; ix++) for (let iz = 0; iz < t.w; iz++) for (let y = 1; y <= t.h; y++) if (bot.blockAt(new Vec3(t.x0 + ix, floor + y, t.z0 + iz)).name === 'sand') n++
      return n
    }
    const falling = () => Object.values(bot.entities).some(e => e.name === 'falling_block')

    await bot.waitForTicks(4)
    for (let ti = 0; ti < TOWERS.length; ti++) {
      const t = TOWERS[ti], last = ti === TOWERS.length - 1
      const cx = t.x0 + t.w / 2
      const mid = new Vec3(cx, floor + Math.min(t.h, 16) * 0.55, this.tz - t.w / 2 + 1)
      const base = new Vec3(cx, floor + 3, this.tz + 0.5)
      // walk up to it (looking up the tower), eyes down to its base on the way in
      goal = new Vec3(cx, 0, nearZ)
      if (ti === 0) aim = mid.clone()
      for (let i = 0; i < 70 && !arrived(); i++) { await look(i < 22 ? mid : base, 0.12); await bot.waitForTicks(1) }
      goal = null
      await glide(base, ti === 0 ? 3 : 5, 0.3)
      ctx.mark(`tower${ti}`)
      if (last) this.mark4 = true
      // the bottom layer, front row first, three columns at a time
      const cols = []
      for (let iz = t.w - 1; iz >= 0; iz--) for (let ix = 0; ix < t.w; ix++) cols.push([t.x0 + ix, t.z0 + iz])
      for (let k = 0; k < cols.length; k += 3) await batch(cols.slice(k, k + 3), k)
      // back off while it comes down onto the torches, the camera up the tower and back down
      goal = new Vec3(cx + (last ? -2 : 1.5), 0, farZ)
      const top = Math.min(t.h * 0.55, 11), total = t.w * t.w * t.h
      let crashed = false
      for (let i = 0; i < 180; i++) {
        const k = Math.min(1, i / (24 + t.h * 1.2))
        await look(new Vec3(cx, floor + 2 + top * Math.sin(k * Math.PI), this.tz - t.w / 2 + 1), 0.12)
        await bot.waitForTicks(1)
        if (last && !crashed && i % 4 === 0 && sandLeft(t) < total * 0.25) { crashed = true; ctx.mark('crash') }
        if (i > 20 && arrived() && !falling() && sandLeft(t) === 0) break
      }
      goal = null
      ctx.mark(last ? 'collapsed' : 'done', { tower: ti, left: sandLeft(t) })
      ctx.log('tower', ti, 'sand left', sandLeft(t))
    }
    // the closing look back along the row: torches where the towers stood, the item piles
    goal = new Vec3(this.x + 4, 0, farZ + 1)
    ctx.mark('gone')
    await glide(new Vec3(this.x - 4, floor + 1, this.tz - 1), 34, 0.07)
    bot.removeListener('physicsTick', steer)
    for (const c of ['forward', 'back', 'left', 'right']) bot.setControlState(c, false)
    let left = 0
    for (const t of TOWERS) left += sandLeft(t)
    return left === 0
  }
}
