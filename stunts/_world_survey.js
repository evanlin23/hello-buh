// Not a Short: survey the HelloBuh shared world (docs/world/). Flies the bot over a grid so the server generates every
// chunk of the map's area, saves, and copies the region files out of work/server/world (run.sh deletes that world at
// the start of the next run) into the world cache outside git, where scripts/world_survey.py reads heights, top
// blocks, biomes and structure starts for docs/world/survey.json and the world map (out/world/world_map.png).
//   RECORD_ONLY=1 STUNT=_world_survey ./run.sh
//   AREA=x0,z0,x1,z1 (default: docs/world/map.json `survey.area`), STEP=384 (blocks between stops)
// Nothing here is a Mojang asset: region files are the world this seed generates on our own server (never commit them).
const fs = require('fs')
const path = require('path')
const world = require('../lib/world')

const MAP = world.loadMap()
const AREA = (process.env.AREA ? process.env.AREA.split(',').map(Number) : MAP.survey.area)
const STEP = Number(process.env.STEP || 384)

function copyDir (src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f)
    if (fs.statSync(s).isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

module.exports = {
  name: '_world_survey',
  time: 6000,
  hideHand: true,
  recordRadius: 16,
  noChunkRefresh: true,
  botTimeout: 2400,
  shots: {}, edit: {},
  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    await ctx.cmd('/gamemode spectator')
    const [x0, z0, x1, z1] = AREA
    const stops = []
    for (let z = z0 + STEP / 2; z < z1 + STEP / 2; z += STEP) for (let x = x0 + STEP / 2; x < x1 + STEP / 2; x += STEP) stops.push([Math.round(Math.min(x, x1)), Math.round(Math.min(z, z1))])
    ctx.log(`survey: ${stops.length} stops over ${x0},${z0} .. ${x1},${z1} (seed ${MAP.seed})`)
    const t0 = Date.now()
    for (let i = 0; i < stops.length; i++) {
      const [x, z] = stops[i]
      await ctx.cmd(`/tp @s ${x} 260 ${z}`)
      // the server generates as the bot views: wait for the chunk ring (view distance 12 = 400 blocks across)
      const until = Date.now() + 45000
      for (;;) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        let have = 0, want = 0
        for (let dx = -11; dx <= 11; dx += 2) for (let dz = -11; dz <= 11; dz += 2) { want++; if (bot.world.getColumnAt(new ctx.Vec3(x + dx * 16, 0, z + dz * 16))) have++ }
        if (have >= want * 0.97 || Date.now() > until) { ctx.log(`stop ${i + 1}/${stops.length} (${x}, ${z}): ${have}/${want} columns, ${((Date.now() - t0) / 1000).toFixed(0)} s`); break }
      }
    }
    await ctx.cmd('/save-all flush')
    await new Promise(resolve => setTimeout(resolve, 8000))
    // copy the region files (and the level's own data) out while this run still holds the server lock
    const src = path.join(__dirname, '..', 'work', 'server', 'world')
    const dst = world.cacheDir('survey')
    fs.rmSync(dst, { recursive: true, force: true })
    copyDir(path.join(src, 'region'), path.join(dst, 'region'))
    fs.copyFileSync(path.join(src, 'level.dat'), path.join(dst, 'level.dat'))
    fs.writeFileSync(path.join(dst, 'survey.json'), JSON.stringify({ seed: MAP.seed, area: AREA, at: new Date().toISOString() }))
    ctx.log(`survey: region files copied to ${dst}`)
    const p = bot.entity.position
    return { x: Math.floor(p.x), y: 100, z: Math.floor(p.z) }
  },
  async perform (ctx) { for (let k = 0; k < 10; k++) await ctx.bot.waitForTicks(1); return true }
}
