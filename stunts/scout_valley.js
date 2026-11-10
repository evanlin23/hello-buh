// Scouting only (no Short): find plains villages from several start points and dump each one's surface heightmap and
// top-block grid (a 160 x 160 square, every 2 blocks) as SCOUT_HM lines, so a story set can pick a village with
// relief (a slope above the centre, a valley) instead of a flat plain. scripts/scout_valley.py draws them.
//   SCOUT_STARTS='[[0,0],[1500,0]]' STUNT=scout_valley TRIES=1 ./scripts/record.sh
module.exports = {
  name: 'scout_valley', botTimeout: 1500, shots: {}, edit: {},
  async setup (ctx) { await ctx.cmd('/gamemode creative'); await ctx.cmd('/gamerule send_command_feedback true'); return { x: 0, y: 100, z: 0 } },
  async perform (ctx) {
    const { bot } = ctx
    const starts = JSON.parse(process.env.SCOUT_STARTS || '[[0,0],[1500,0],[-1500,0],[0,1500],[0,-1500],[1500,1500],[-1500,1500],[1500,-1500],[-1500,-1500],[3000,0]]')
    const seen = []
    for (const st of starts) {
      try {
        await ctx.cmd(`/tp @s ${st[0]} 200 ${st[1]}`); await bot.waitForTicks(20)
        const loc = await new Promise((resolve) => {
          const on = (m) => { const r = /nearest .* is at \[(-?\d+), [^,]+, (-?\d+)\]/.exec(m); if (r) { bot.removeListener('messagestr', on); resolve([+r[1], +r[2]]) } }
          bot.on('messagestr', on); setTimeout(() => resolve(null), 30000)
          bot.chat('/locate structure minecraft:village_plains')
        })
        if (!loc || seen.some(s => Math.hypot(s[0] - loc[0], s[1] - loc[1]) < 100)) { ctx.log('SCOUT_HM', JSON.stringify({ near: st, found: loc, dup: !!loc })); continue }
        seen.push(loc)
        await ctx.cmd(`/tp @s ${loc[0]} 200 ${loc[1]}`); await bot.waitForTicks(100); await bot.waitForChunksToLoad()
        const R = +(process.env.SCOUT_R || 80), step = +(process.env.SCOUT_STEP || 2), ys = [], names = []
        for (let dz = -R; dz < R; dz += step) {
          const ry = [], rn = []
          for (let dx = -R; dx < R; dx += step) { const s = ctx.surface(loc[0] + dx, loc[1] + dz); ry.push(s ? s.position.y : -1); rn.push(s ? s.name : '?') }
          ys.push(ry); names.push(rn)
        }
        ctx.log('SCOUT_HM', JSON.stringify({ near: st, found: loc, R, step, ys, names }))
      } catch (e) { ctx.log('SCOUT_HM', JSON.stringify({ near: st, error: e.message })) }
    }
    return false
  }
}
