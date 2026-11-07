// "the torch trick never gets old 😭" (~30 s): four sand towers in a row, each bigger. The bot breaks
// the bottom block and puts a torch in its place, so the column falls onto the torch and every
// block pops into an item: a 1x1 tower, a tall one, a 3x3 (nine columns, one after another), and a
// 4x4 giant that caves in column by column. An Efficiency V shovel insta-breaks sand (vanilla:
// speed 34 >= 30 x hardness 0.5), so each column is one click and one torch.
const D = 12                 // the bot walks along a line this far in front of the towers
const TOWERS = [
  { dx: -12, w: 1, h: 8 },
  { dx: -6, w: 1, h: 20 },
  { dx: 1, w: 3, h: 16 },
  { dx: 9, w: 4, h: 14 }
]

module.exports = {
  name: 'sand_tower',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the torch trick never gets old 😭',
  edit: {
    caption: 'the torch trick never gets old 😭', red: 'torch', song: 'songs/funk_abnormal.mp3', dropAt: 'tower3',
    startAt: 'tower0:-0.4', endAfter: 'gone:0.9'
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let y0 = floor + 1; y0 <= floor + 29; y0 += 7) await ctx.cmd(`/fill ${x - 20} ${y0} ${z - D - 8} ${x + 20} ${y0 + 6} ${z + 6} air`)
    await ctx.cmd(`/fill ${x - 20} ${floor} ${z - D - 8} ${x + 20} ${floor} ${z + 6} grass_block`)
    await ctx.cmd(`/fill ${x - 20} ${floor - 3} ${z - D - 8} ${x + 20} ${floor - 1} ${z + 6} dirt`)
    this.tz = z - D                                  // front face of every tower
    for (const t of TOWERS) {
      t.x0 = x + t.dx; t.z0 = this.tz - t.w + 1
      await ctx.cmd(`/fill ${t.x0} ${floor + 1} ${t.z0} ${t.x0 + t.w - 1} ${floor + t.h} ${t.z0 + t.w - 1} sand`)
    }
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 20')
    await ctx.hotbar(['diamond_shovel[enchantments={efficiency:5}]', ['torch', 64], ['sand', 64], ['bread', 12]])
    const t0 = TOWERS[0]
    await ctx.tpCheck(t0.x0 + 0.5, floor + 1, z + 0.5, 180, -12)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { floor } = this
    let aim = null
    const look = async (target, k = 0.3) => {
      aim = aim ? aim.plus(target.minus(aim).scaled(k)) : target.clone()
      const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
      await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
    }
    const glide = async (target, ticks, k = 0.2) => { for (let i = 0; i < ticks; i++) { await look(target, k); await bot.waitForTicks(1) } }
    let tgtX = null
    const steer = () => {
      if (tgtX === null) return
      const dx = tgtX - bot.entity.position.x
      bot.setControlState('right', dx > 0.3); bot.setControlState('left', dx < -0.3)
    }
    bot.on('physicsTick', steer)
    let lastSwing = -99
    // one column: insta-break the bottom block, a torch in its place (the column lands on it)
    const torchColumn = async (cx, cz) => {
      const loc = { x: cx, y: floor + 1, z: cz }
      ctx.select(0)
      bot._client.write('block_dig', { status: 0, location: loc, face: 3, sequence: 0 })
      ctx.sound('block.sand.break', 1); ctx.particles('block', new Vec3(cx, floor + 1, cz), { block: 'sand' })
      if (ctx.tick - lastSwing >= 3) { bot.swingArm(); lastSwing = ctx.tick }   // ctx.tick: bot.time.age only updates once a second
      ctx.select(1)
      bot._client.write('block_place', { hand: 0, location: { x: cx, y: floor, z: cz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      ctx.sound('block.wood.place', 1)
    }
    const sandLeft = (t) => {
      let n = 0
      for (let ix = 0; ix < t.w; ix++) for (let iz = 0; iz < t.w; iz++) for (let y = 1; y <= t.h; y++) if (bot.blockAt(new Vec3(t.x0 + ix, floor + y, t.z0 + iz)).name === 'sand') n++
      return n
    }
    const falling = () => Object.values(bot.entities).some(e => e.name === 'falling_block')

    await bot.waitForTicks(4)
    for (let ti = 0; ti < TOWERS.length; ti++) {
      const t = TOWERS[ti]
      const cx = t.x0 + t.w / 2, front = new Vec3(cx, floor + 1.5, this.tz + 1)
      const mid = new Vec3(cx, floor + Math.min(t.h, 14) * 0.55, this.tz - t.w / 2 + 1)
      tgtX = cx
      // walk over (looking up the tower), then down to its base
      if (ti === 0) aim = mid.clone()
      await glide(mid, ti === 0 ? 4 : 16)
      for (let i = 0; i < 40 && Math.abs(bot.entity.position.x - cx) > 0.4; i++) { await look(mid, 0.2); await bot.waitForTicks(1) }
      await glide(front, 8, 0.3)
      ctx.mark(`tower${ti}`)
      // the bottom layer, front row first, column by column (the camera on each)
      const cols = []
      for (let iz = t.w - 1; iz >= 0; iz--) for (let ix = 0; ix < t.w; ix++) cols.push([t.x0 + ix, t.z0 + iz])
      for (const [colX, colZ] of cols) {
        await look(new Vec3(colX + 0.5, floor + 1.5, colZ + 0.5), 0.45)
        await torchColumn(colX, colZ)
        await bot.waitForTicks(t.w > 1 ? 3 : 1)
      }
      // follow the collapse: up the tower and back down as it comes down onto the torches
      for (let i = 0; i < 160; i++) {
        const k = i / 40
        await look(new Vec3(cx, floor + 1.5 + Math.max(0, Math.min(t.h * 0.5, 8) * Math.sin(Math.min(1, k) * Math.PI)), this.tz - t.w / 2 + 1), 0.15)
        if (i % 3 === 0) ctx.sound('block.sand.place', 0.6, 0.8 + (i % 5) * 0.05)
        await bot.waitForTicks(1)
        if (i > 20 && !falling() && sandLeft(t) === 0) break
      }
      ctx.mark(ti === TOWERS.length - 1 ? 'gone' : 'done', { tower: ti, left: sandLeft(t) })
      ctx.log('tower', ti, 'sand left', sandLeft(t))
    }
    bot.removeListener('physicsTick', steer)
    for (const c of ['left', 'right']) bot.setControlState(c, false)
    await glide(new Vec3(this.x + 8, floor + 1, this.tz - 1), 24, 0.12)   // the item pile
    let left = 0
    for (const t of TOWERS) left += sandLeft(t)
    return left === 0
  }
}
