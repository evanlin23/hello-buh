// AI-dilemma test: the five TV-head characters (skins/, scripts/make_skins.py) as Mannequins in a row on snow at dusk,
// a slow track along the row. Proves the skins, the glowing screens and the look before a real episode is staged.
const M = require('../lib/movie')

const ROW = [['GPT', 'ai_gpt'], ['DeepSeek', 'ai_deep'], ['Claude', 'ai_claude'], ['Gemini', 'ai_gemini'], ['Grok', 'ai_grok']]

module.exports = {
  name: 'ai_lineup',
  biome: 'minecraft:snowy_plains',
  time: 12800,                 // dusk: the screens should read as lit
  renderDistance: 8, recordRadius: 96,
  botTimeout: 300,
  look: { grade: 'dawn', bloom: 0.6, bloomThreshold: 0.7, vignette: 0.4, grain: 0.03, dof: { aperture: 0.6 } },
  cast: { self: 'steve', ...Object.fromEntries(ROW) },
  idleLife: true,
  shots: {
    track: { dof: false, path: [[0, -2, 2.6, 5], [6, 10, 2.2, 5]], lookPath: [[0, 1, 1.6, 0], [6, 9, 1.6, 0]], fov: 50 },
    close: { at: [10.0, 2.7, 2.6], look: [10.5, 2.5, 0.5], fov: 40 }
  },
  edit: { startAt: 'start:0.2', endAfter: 'end:0.2' },

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const p = bot.entity.position.floored()
    const g = ctx.findLand(p.x, p.z) || p
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/difficulty peaceful')
    await ctx.cmd('/kill @e[type=!minecraft:player]')
    await ctx.cmd(`/fill ${X - 4} ${F + 1} ${Z - 4} ${X + 16} ${F + 8} ${Z + 8} air`)
    await ctx.cmd(`/fill ${X - 4} ${F} ${Z - 4} ${X + 16} ${F} ${Z + 8} snow_block`)
    for (let i = 0; i < ROW.length; i++) {
      await ctx.cmd(`/summon minecraft:mannequin ${X + 2.5 * i + 0.5} ${F + 1} ${Z + 0.5} {CustomName:"${ROW[i][0]}",Rotation:[0f,0f],immovable:1b}`)
    }
    await ctx.tpCheck(X - 3.5, F + 1, Z + 6.5, 180, 0)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    M.shot(ctx, 'track')
    await bot.waitForTicks(120)
    M.shot(ctx, 'close')
    await bot.waitForTicks(50)
    ctx.mark('end')
    return true
  }
}
