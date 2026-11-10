// Scouting only (story_thirty_one_raids): pillager outposts near spawn, and the nearest village to each, with the
// ground heights, so the story's village can have the outpost on a ridge above it. Prints SCOUTR lines.
module.exports = {
  name: 'scout_raids',
  time: 6000, renderDistance: 8, recordRadius: 32, botTimeout: 600,
  shots: {}, edit: {}, noChunkRefresh: true,
  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    await ctx.cmd('/gamerule send_command_feedback true')
    const locate = (what) => new Promise((resolve) => {
      const on = (m) => { const r = /nearest .* is at \[(-?\d+), ([^,]+), (-?\d+)\]/.exec(m); if (r) { bot.removeListener('messagestr', on); resolve([+r[1], +r[3]]) } }
      bot.on('messagestr', on); setTimeout(() => { bot.removeListener('messagestr', on); resolve(null) }, 30000)
      bot.chat(`/locate structure ${what}`)
    })
    const seen = new Set()
    const starts = [[0, 0], [600, 0], [-600, 0], [0, 600], [0, -600], [600, 600], [-600, -600], [600, -600], [-600, 600]]
    for (const [sx, sz] of starts) {
      await ctx.cmd(`/tp @s ${sx} 220 ${sz}`); await bot.waitForTicks(20)
      const o = await locate('minecraft:pillager_outpost')
      if (!o || seen.has(o.join())) continue
      seen.add(o.join())
      await ctx.cmd(`/tp @s ${o[0]} 220 ${o[1]}`); await bot.waitForTicks(20)
      const v = await locate('#minecraft:village')
      ctx.log('SCOUTR', JSON.stringify({ outpost: o, village: v, dist: v ? Math.round(Math.hypot(v[0] - o[0], v[1] - o[1])) : null }))
    }
    await ctx.cmd('/tp @s 0 200 0'); await bot.waitForTicks(20)
    return { x: 0, y: 100, z: 0 }
  },
  async perform (ctx) { for (let k = 0; k < 10; k++) await ctx.bot.waitForTicks(1); return true }
}
