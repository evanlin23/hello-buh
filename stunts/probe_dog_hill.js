// Site probe for story_dog_hill: the plains village at (-160, -864) and the hills north-west of it. Logs a heightmap
// (HMAP lines) and records a few seconds with candidate cameras for scripts/shot_sheet.py.
const M = require('../lib/movie')
const O = [-160, 83, -864]
module.exports = {
  name: 'probe_dog_hill', biome: null, near: [-160, -864], botTimeout: 400, renderDistance: 10, recordRadius: 128,
  time: 12000, idleLife: true, cast: { self: 'steve' },
  look: { grade: 'dawn', bloom: 0.5, vignette: 0.35, shadows: true, rays: 0.5 },
  shots: {
    a: { at: [-5, 12, 10], look: [-50, 27, -32], fov: 55, dof: false },
    b: { at: [-30, 30, -10], look: [-55, 27, -36], fov: 55, dof: false },
    c: { at: [-62, 31, -40], look: [10, 0, 0], fov: 60, dof: false },
    d: { at: [-50, 29, -50], look: [0, -4, -10], fov: 60, dof: false },
    e: { at: [-40, 29, -20], look: [-60, 26, -45], fov: 60, dof: false },
    f: { at: [-20, 60, 30], look: [-40, 10, -30], fov: 70, dof: false }
  },
  async setup (ctx) {
    const { bot } = ctx
    await ctx.cmd('/gamemode spectator')
    await ctx.cmd(`/tp @s ${O[0]} ${O[1] + 60} ${O[2]}`); await bot.waitForTicks(80); await bot.waitForChunksToLoad()
    const rows = []; if (process.env.NO_HMAP) return { x: O[0], y: O[1], z: O[2] }
    for (let dz = -90; dz <= 30; dz += 4) {
      const r = []
      for (let dx = -90; dx <= 40; dx += 4) { const s = ctx.surface(O[0] + dx, O[2] + dz); r.push(s ? `${s.position.y}${s.name[0]}` : '?') }
      rows.push(`dz ${dz}: ${r.join(' ')}`)
    }
    ctx.log('HMAP dx -90..40 step 4\n' + rows.join('\n'))
    return { x: O[0], y: O[1], z: O[2] }
  },
  async perform (ctx) {
    for (const s of Object.keys(this.shots)) { M.shot(ctx, s); await ctx.bot.waitForTicks(12) }
    return true
  }
}
