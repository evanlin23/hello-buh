// Not a Short: build (or restore) the shared world's places at their canonical spots (docs/world/map.json) as of one
// day of the world timeline, and record the area for establishing stills (scripts/world_stills.sh) and set checks.
//   RECORD_ONLY=1 STUNT=_world_build ./run.sh
//   WORLD_PLACES=hushwell,dog_hill,tidewater  WORLD_DAY=4299  WORLD_AT=x,z (the recording's centre; default the
//   first place)  WORLD_RADIUS=176   WORLD_SAVE_SNAPSHOT=<name> (lib/world.js snapshot; run.sh WORLD_SNAPSHOT=<name>)
// The same build in a story: `await world.build(ctx, { story: '<name>' })` in its setup (lib/world.js).
const world = require('../lib/world')

const PLACES = (process.env.WORLD_PLACES || 'hushwell,dog_hill,tidewater').split(',').filter(Boolean)
const DAY = Number(process.env.WORLD_DAY || 4299)
const R = Number(process.env.WORLD_RADIUS || 176)
const AT = process.env.WORLD_AT ? process.env.WORLD_AT.split(',').map(Number) : null

module.exports = {
  name: '_world_build',
  time: 6000,
  hideHand: true,
  botTimeout: 1500,
  recordRadius: R,
  renderDistance: 12,
  shots: {}, edit: {},
  chunkStops (set) { const d = Math.round(R * 0.6); return [[d, 0], [-d, 0], [0, d], [0, -d], [0, 0]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },
  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    for (const g of ['log_admin_commands false', 'random_tick_speed 0', 'mob_griefing false', 'fire_damage false']) await ctx.cmd(`/gamerule ${g}`)
    await ctx.cmd('/kill @e[type=!player]')
    const c = AT || [world.origin(PLACES[0]).x, world.origin(PLACES[0]).z]
    const W = await world.build(ctx, { places: PLACES, day: DAY })
    for (const [k, p] of Object.entries(W.places)) ctx.log(`world place ${k}: origin ${JSON.stringify(p.origin)}, pieces ${Object.keys(p.pieces).join(' ') || '-'}, stamps ${p.stamps.join(' ') || '-'}`)
    await ctx.cmd('/kill @e[type=item]')
    const y = ctx.surface(c[0], c[1])
    await ctx.cmd(`/tp @s ${c[0]} ${(y ? y.position.y : 70) + 40} ${c[1]}`)
    await ctx.cmd('/gamemode spectator')
    await bot.waitForTicks(20)
    return { x: c[0], y: y ? y.position.y : 70, z: c[1] }
  },
  async perform (ctx) { for (let k = 0; k < 60; k++) await ctx.bot.waitForTicks(1); return true }
}
