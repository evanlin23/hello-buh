// "POV: you're on half a heart 💀" - the water clutch, but at half a heart (the HUD shows it).
const clutch = require('./water_clutch')
module.exports = {
  ...clutch,
  name: 'half_heart',
  caption: "POV: you're on half a heart 💀",
  edit: { caption: "POV: you're on half a heart 💀", red: 'half', song: 'songs/misery.mp3', dropAt: 'placed', start: 1.2 },
  async setup (ctx) {
    const set = await clutch.setup.call(this, ctx)
    await ctx.cmd('/gamerule natural_health_regeneration false')        // or full saturation heals it right back
    await ctx.cmd('/damage @s 19 minecraft:generic')
    await ctx.bot.waitForTicks(30)
    return set
  }
}
