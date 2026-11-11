// Scouting only: record a wide radius around SCOUT_AT="x,z" (default: thirty_one_raids' village and outpost) for
// top-down stills (scripts/still.py) and hb describe. Prints the ground height at the centre.
const [SX, SZ] = (process.env.SCOUT_AT || '-2020,-450').split(',').map(Number)
module.exports = {
  name: 'scout_site',
  time: 6000, renderDistance: 12, recordRadius: 176, botTimeout: 300, noChunkRefresh: true,
  shots: {}, edit: {},
  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    await ctx.cmd(`/tp @s ${SX} 200 ${SZ}`); await bot.waitForTicks(60)
    try { await ctx.waitChunks({ x0: SX - 140, z0: SZ - 140, x1: SX + 140, z1: SZ + 140 }, 90000) } catch (e) { ctx.log("partial", e.message) }
    const g = ctx.surface(SX, SZ)
    ctx.log('SURFACE', g && g.position)
    await ctx.cmd(`/tp @s ${SX} ${g.position.y + 60} ${SZ} 0 90`); await bot.waitForTicks(40)
    return { x: SX, y: g.position.y, z: SZ }
  },
  async perform (ctx) { ctx.mark('f1_on'); for (let k = 0; k < 40; k++) await ctx.bot.waitForTicks(1); return true }
}
