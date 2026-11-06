// "pouring water on a lava lake 😳": a 15x15 lava lake sits one block down in a field. The bot
// walks along the south edge emptying water buckets (real survival bucket use: the server
// raytraces from where it looks) onto the far rims, then two more right in front of it. Every
// lava source the water reaches turns to obsidian with a fizz and steam. Then it scoops the five
// sources back up (refilling every bucket), the water drains away and leaves an obsidian field.
//
// Lake cells (lx, lz) 0..14; lava at y = G-1, air above it at G (G = ground level), so poured
// water at G spreads across the lake but never over the rim into the field. A full bucket ignores
// fluids, so a pour clicks either a rim block's inner face or the top of obsidian already made.
// Pours at W rim (0,7), N rim (7,0), E rim (14,7), then on obsidian at (10,10) and (4,10):
// five radius-7 diamonds cover all 225 cells.
const POURS = [
  // [lake cell where the water lands, bot x (lake coords) to stand at, click point offset]
  { cell: [0, 7], at: 3, click: [-0.04, 0.5, 0.5] },     // west rim, its east face
  { cell: [7, 0], at: 7, click: [0.5, 0.5, -0.04] },     // north rim, its south face
  { cell: [14, 7], at: 11, click: [1.04, 0.5, 0.5] },    // east rim, its west face
  { cell: [4, 10], at: 11, click: [0.5, -0.05, 0.5] },   // top of fresh obsidian
  { cell: [10, 10], at: 11, click: [0.5, -0.05, 0.5] }   // right in front: fizz up close
]

module.exports = {
  name: 'water_vs_lava',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'pouring water on a lava lake 😳',
  edit: {
    caption: 'pouring water on a lava lake 😳', red: 'lava', song: 'songs/misery.mp3', dropAt: 'reveal',
    startAt: 'go:-0.3', endAfter: 'end_look:2.3'
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: G } = g
    this.G = G
    await ctx.defaultRules()
    for (let y0 = G + 1; y0 <= G + 13; y0 += 7) await ctx.cmd(`/fill ${x - 22} ${y0} ${z - 30} ${x + 22} ${y0 + 6} ${z + 8} air`)
    await ctx.cmd(`/fill ${x - 22} ${G} ${z - 30} ${x + 22} ${G} ${z + 8} grass_block`)
    await ctx.cmd(`/fill ${x - 22} ${G - 4} ${z - 30} ${x + 22} ${G - 1} ${z + 8} dirt`)
    const x0 = x - 7, z0 = z - 20
    this.x0 = x0; this.z0 = z0
    await ctx.cmd(`/fill ${x0} ${G - 2} ${z0} ${x0 + 14} ${G - 2} ${z0 + 14} stone`)
    await ctx.cmd(`/fill ${x0} ${G} ${z0} ${x0 + 14} ${G} ${z0 + 14} air`)
    await ctx.cmd(`/fill ${x0} ${G - 1} ${z0} ${x0 + 14} ${G - 1} ${z0 + 14} lava`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 24')
    await ctx.hotbar(['water_bucket', 'water_bucket', 'water_bucket', 'water_bucket', 'water_bucket'])
    await ctx.tpCheck(x0 + POURS[0].at + 0.5, G + 1, z0 + 15.6, 180, 30)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y: G, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x0, z0, G } = this
    const cell = (lx, lz, dy = 0) => new Vec3(x0 + lx + 0.5, G + dy, z0 + lz + 0.5)

    // steam: every lava -> obsidian/cobblestone the client sees fizzes (vanilla level event 1501:
    // block.lava.extinguish 0.5, 2.6 + (r - r) * 0.8, plus smoke). Sounds capped at 2 a tick.
    let fizzTick = -1, fizzN = 0, converted = 0, puff = 0
    const onBlock = (o, n) => {
      if (!o || !n || o.name !== 'lava' || !/obsidian|cobblestone|stone/.test(n.name)) return
      converted++
      const p = n.position
      const tk = bot.time.age
      if (tk !== fizzTick) { fizzTick = tk; fizzN = 0 }
      if (fizzN++ < 2) ctx.sound('block.lava.extinguish', 0.5, 2.6 + (Math.random() - Math.random()) * 0.8)
      ctx.particles('splash', new Vec3(p.x + 0.5, p.y + 1.15, p.z + 0.5), { count: 6 })
      // a few smoke puffs, never close to the camera (they fill the screen)
      if (bot.entity.position.distanceTo(p) > 9 && puff++ % 10 === 0) ctx.particles('smoke', new Vec3(p.x + 0.5, p.y + 1.1, p.z + 0.5), { count: 8 })
    }
    bot.on('blockUpdate', onBlock)

    const aimAt = async (pt, ms) => { await ctx.easeLookAt(pt, ms); await bot.waitForTicks(1) }
    const strafeTo = async (lx, lookPt) => {
      const tx = x0 + lx + 0.5
      const dir = tx > bot.entity.position.x ? 'right' : 'left'   // facing north: right = +x
      bot.setControlState(dir, true)
      for (let i = 0; i < 80 && Math.abs(bot.entity.position.x - tx) > 0.25; i++) {
        const eye = bot.entity.position.offset(0, 1.62, 0), d = lookPt.minus(eye)
        const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        await bot.look(bot.entity.yaw + (yaw - bot.entity.yaw) * 0.2, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.2, true)
        await bot.waitForTicks(1)
      }
      bot.setControlState(dir, false)
      await bot.waitForTicks(3)
    }
    const pour = async (k, ms) => {
      const p = POURS[k]
      const [lx, lz] = p.cell
      ctx.select(k)
      if (p.click[1] < 0) {          // pouring on obsidian: it has to be obsidian already
        for (let i = 0; i < 40 && bot.blockAt(new Vec3(x0 + lx, G - 1, z0 + lz)).name !== 'obsidian'; i++) await bot.waitForTicks(1)
      }
      await aimAt(new Vec3(x0 + lx + p.click[0], G + p.click[1], z0 + lz + p.click[2]), ms)
      bot.activateItem(); bot.swingArm()
      ctx.sound('item.bucket.empty', 1, 1)
      ctx.mark('pour', { k })
      ctx.log('pour', k, 'converted so far', converted)
      await bot.waitForTicks(2)
      ctx.particles('splash', cell(lx, lz, 0.6), { count: 20 })
    }

    await bot.waitForTicks(6)
    ctx.mark('go')
    await pour(0, 450)
    for (let i = 0; i < 26; i++) { await bot.waitForTicks(1) }   // the first flow eats the west side
    await strafeTo(POURS[1].at, cell(7, 4))
    await pour(1, 350)
    await bot.waitForTicks(18)
    await strafeTo(POURS[2].at, cell(11, 6))
    await pour(2, 300)
    await bot.waitForTicks(22)
    await pour(3, 350)
    await bot.waitForTicks(10)
    await pour(4, 300)
    await ctx.easeLookAt(cell(7, 7), 900)
    await bot.waitForTicks(26)
    ctx.log('converted after pours', converted)

    // refill every bucket: scoop the five sources back up, the flows drain away
    const order = [4, 3, 2, 1, 0]
    for (const k of order) {
      const [lx, lz] = POURS[k].cell
      ctx.select(k)
      await aimAt(cell(lx, lz, 0.45), k >= 3 ? 280 : 320)
      bot.activateItem(); bot.swingArm()
      ctx.sound('item.bucket.fill', 1, 1)
      ctx.mark('scoop', { k })
      setTimeout(() => ctx.log('scoop', k, 'buckets', bot.inventory.items().filter(i => i.name === 'water_bucket').length), 200)
      await bot.waitForTicks(3)
    }
    ctx.mark('reveal')
    await ctx.easeLookAt(cell(4, 6, -0.5), 1000)
    // slow pan across the finished field while the last of the water drains
    for (let i = 0; i < 90; i++) {
      const f = i / 89, e = f * f * (3 - 2 * f)
      const pt = cell(4 + 7 * e, 6 - 1.5 * e, -0.5), eye = bot.entity.position.offset(0, 1.62, 0), d = pt.minus(eye)
      await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
      if (i === 40) ctx.mark('end_look')
      await bot.waitForTicks(1)
    }
    await bot.waitForTicks(10)
    bot.removeListener('blockUpdate', onBlock)

    let lava = 0, water = 0, obs = 0
    for (let lx = 0; lx < 15; lx++) {
      for (let lz = 0; lz < 15; lz++) {
        const b = bot.blockAt(new Vec3(x0 + lx, G - 1, z0 + lz)), w = bot.blockAt(new Vec3(x0 + lx, G, z0 + lz))
        if (b.name === 'lava') { lava++; ctx.log('lava left at', lx, lz) } if (b.name === 'obsidian') obs++; if (w.name === 'water') water++
      }
    }
    const buckets = bot.inventory.items().filter(i => i.name === 'water_bucket').length
    ctx.log(`lake: obsidian ${obs}, lava left ${lava}, water left ${water}, water buckets ${buckets}`)
    return lava === 0 && water <= 3 && buckets >= 4 && !ctx.died
  }
}
