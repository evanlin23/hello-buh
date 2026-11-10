// Scouting only: find the nearest plains village to spawn and record a wide radius around it, so stills
// (scripts/still.py) can plan a story set on real terrain. Prints the village's position.
module.exports = {
  name: 'scout_village',
  time: 6000, renderDistance: 12, recordRadius: 128, botTimeout: 300,
  shots: {}, edit: {},
  async setup (ctx) {
    const { bot } = ctx
    await ctx.cmd('/gamerule send_command_feedback true')
    const loc = await new Promise((resolve) => {
      const on = (m) => { const r = /nearest .* is at \[(-?\d+), [^,]+, (-?\d+)\]/.exec(m); if (r) { bot.removeListener('messagestr', on); resolve([+r[1], +r[2]]) } }
      bot.on('messagestr', on); setTimeout(() => resolve(null), 20000)
      bot.chat('/locate structure minecraft:village_plains')
    })
    if (!loc) throw new Error('no village')
    await ctx.defaultRules()
    ctx.log('VILLAGE', loc)
    await ctx.cmd(`/tp @s ${loc[0]} 200 ${loc[1]}`); await bot.waitForTicks(60)
    await bot.waitForChunksToLoad()
    const g = ctx.surface(loc[0], loc[1])
    ctx.log('SURFACE', g && g.position)
    await ctx.cmd(`/tp @s ${loc[0]} ${g.position.y + 40} ${loc[1]}`); await bot.waitForTicks(40)
    return { x: loc[0], y: g.position.y, z: loc[1] }
  },
  async perform (ctx) { ctx.mark('f1_on'); for (let k = 0; k < 60; k++) await ctx.bot.waitForTicks(1); return true }
}
