// Not a Short: scout Larkfield for Six Thousand Torches. Places the vanilla village at the canonical spot, logs its
// anchors to work/torches_scout.json and records ~3 s overhead so ./hb map / ./hb still can read the set.
const fs = require('fs')
const path = require('path')
const sets = require('../lib/sets')
const world = require('../lib/world')
module.exports = {
  name: '_torches_scout',
  time: 6000, hideHand: true, recordRadius: 96, renderDistance: 10,
  shots: {}, edit: {},
  async setup (ctx) {
    await ctx.defaultRules()
    const O = world.origin('larkfield')
    await ctx.cmd(`/tp @s ${O.x} ${O.y + 40} ${O.z}`)
    await ctx.bot.waitForTicks(40)
    const v = await sets.vanilla(ctx, 'village_plains', { x: O.x, z: O.z, radius: 80 })
    const bx = Math.floor(v.anchors.bell.x), bz = Math.floor(v.anchors.bell.z)
    const pc = {}
    const PL = JSON.parse(process.env.PIECES || '[]')
    for (const [id, piece, dx, dz, facing, variant] of PL) {
      const r = await sets.place(ctx, piece, { x: bx + dx, z: bz + dz, facing, variant })
      pc[id] = { anchors: r.anchors, shots: r.shots, piece, dx, dz, facing, variant }
      ctx.log('piece', id, JSON.stringify(r.anchors).slice(0, 400))
    }
    v.pieces = pc
    fs.writeFileSync(path.join(__dirname, '..', 'work', 'torches_scout.json'), JSON.stringify(v, null, 1))
    await ctx.cmd(`/tp @s ${v.anchors.bell.x} ${v.anchors.bell.y + 1} ${v.anchors.bell.z + 2}`)
    await ctx.bot.waitForTicks(40)
    return { x: O.x, y: O.y, z: O.z }
  },
  async perform (ctx) {
    const { bot, Vec3 } = ctx
    try { await bot.waitForChunksToLoad() } catch (e) {}
    const B = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'work', 'torches_scout.json'), 'utf8')).anchors.bell
    const bx = Math.floor(B.x), bz = Math.floor(B.z), out = { bell: [bx, B.y, bz], cols: {} }
    for (let dz = -70; dz <= 70; dz++) {
      for (let dx = -64; dx <= 64; dx++) {
        for (let y = 100; y > 50; y--) {
          const b = bot.blockAt(new Vec3(bx + dx, y, bz + dz))
          if (b && b.name !== 'air' && b.name !== 'cave_air') { out.cols[`${dx},${dz}`] = [y, b.name]; break }
        }
      }
    }
    fs.writeFileSync(path.join(__dirname, '..', 'work', 'torches_cols.json'), JSON.stringify(out))
    ctx.log('cols', Object.keys(out.cols).length)
    await bot.waitForTicks(20); return true
  }
}
