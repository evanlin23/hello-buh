// Not a Short: re-record a set that is already built in the running server's world, for stills rendered with fixed
// cameras (render.js CAM=dx,dy,dz,yaw,pitch over this recording). Optionally re-grade the ground round some boxes
// first (lib/sets fitGround). Day for 2 s, then dusk (time 12900) for 2 s.
//   AT=x,z REGRADE="x0,z0,x1,z1,y;..." STUNT=_sets_view RECORD=work/_sets_view.rec.json node bot.js   (server running)
const sets = require('../lib/sets')
const AT = (process.env.AT || '0,0').split(',').map(Number)
module.exports = {
  name: '_sets_view',
  hideHand: true,
  botTimeout: 900,
  time: 6500,
  recordRadius: 208,
  chunkStops (set) { return [[80, 0], [-80, 0], [0, 80], [0, -80], [0, -150]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },
  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    await ctx.cmd(`/tp @s ${AT[0]} 120 ${AT[1]}`); await ctx.sleep(6000)
    for (const b of (process.env.REGRADE || '').split(';').filter(Boolean)) {
      const [x0, z0, x1, z1, y] = b.split(',').map(Number)
      await sets.forceload(ctx, x0 - 16, z0 - 16, x1 + 16, z1 + 16)
      await sets.fitGround(ctx, { x0, z0, x1, z1 }, y, 12)
    }
    await ctx.cmd('/kill @e[type=item]')
    const g = sets.ground(ctx, { x0: AT[0], x1: AT[0], z0: AT[1], z1: AT[1] }, 1)
    await ctx.cmd(`/tp @s ${AT[0] + 0.5} ${g + 1} ${AT[1] + 0.5}`); await ctx.sleep(3000)
    try { await bot.waitForTicks(10) } catch (e) {}
    return { x: AT[0], y: g, z: AT[1] }
  },
  async perform (ctx) {
    await ctx.cmd('/gamemode spectator')
    await ctx.bot.waitForTicks(40)
    ctx.dayTime = 12900; ctx.bot.chat('/time set 12900'); ctx.mark('time', { time: 12900 })
    await ctx.bot.waitForTicks(40)
    return true
  }
}
