// Not a Short: the live test of the Nether in the world tools (docs/engine_features.md "Flying-mob POV, the crane, the
// Nether"; brief docs/engine_briefs/camera_world.md), and the survey of the Nether below the Portal Cottage (the
// claim portal_cottage_nether, Saving Up for a Bastion: about (-16, 80, -118) in Nether coordinates).
//   - world.build of a Nether place (dimension: "the_nether") from a test map (HB_WORLD_MAP, default
//     lib/hb/test/fixtures/world_nether_map.json): the bot is taken there (world.enter), the footprint is forceloaded
//     there, the ground is read under the roof (lib/sets/site.js columnUnder) and the place's stamps go down there;
//   - the survey: /locate of the nearest bastion remnant and fortress, and every column's floors and lava in
//     SURVEY (x0, z0, x1, z1) -> work/nether_survey.json (scripts/nether_survey.py draws it);
//   - the recording is made in the Nether (rec.dimension 'the_nether'): a POV look round and two camera shots.
//   ./hb record _test_camera_world_nether && ./hb still _test_camera_world_nether look+1 wide+1 shelf+1
const fs = require('fs')
const path = require('path')
if (!process.env.HB_WORLD_MAP) process.env.HB_WORLD_MAP = path.join(__dirname, '..', 'lib', 'hb', 'test', 'fixtures', 'world_nether_map.json')
const world = require('../lib/world')

const PLACE = 'portal_cottage_nether'
const SURVEY = (process.env.SURVEY || '-88,-188,56,-48').split(',').map(Number)
const DEG = Math.PI / 180

module.exports = {
  name: '_test_camera_world_nether',
  botTimeout: 600,
  hideHand: true,
  recordRadius: 72,
  renderDistance: 8,
  noChunkRefresh: false,
  shots: {
    pov: { pov: true },
    wide: { at: [24, 14, 22], look: [0, 0, 0], fov: 70, push: 0.3 },
    shelf: { at: [-6, 3, 6], look: [4, 1, -4], fov: 60 }
  },
  edit: { caption: 'nether test' },

  async setup (ctx) {
    const { bot, Vec3 } = ctx
    await ctx.defaultRules()
    await ctx.cmd('/gamemode creative')
    const P = world.place(PLACE)
    const W = await world.build(ctx, { places: [PLACE], day: 5000, cameos: [] })
    ctx.log(`nether test: built ${Object.keys(W.places).join(', ')} in ${bot.game.dimension}; stamps ${W.places[PLACE].stamps.join(' ') || '-'}`)
    // the survey: the nearest bastion and fortress (the server's own /locate), every column's floors and lava
    const locate = async (what) => {
      const got = new Promise((resolve) => {
        const on = (m) => { const r = /nearest .* is at \[(-?\d+), [^,]+, (-?\d+)\] \((\d+) blocks away\)/.exec(m) || (/Could not find/.test(m) ? [] : null); if (r) { bot.removeListener('messagestr', on); resolve(r.length ? [+r[1], +r[2], +r[3]] : null) } }
        bot.on('messagestr', on); setTimeout(() => { bot.removeListener('messagestr', on); resolve(null) }, 30000)
      })
      bot.chat(`/locate structure ${what}`)
      return got
    }
    await ctx.cmd('/gamerule send_command_feedback true')   // (defaultRules turned it off: /locate answers in chat)
    const bastion = await locate('minecraft:bastion_remnant')
    const fortress = await locate('minecraft:fortress')
    await ctx.cmd('/gamerule send_command_feedback false')
    ctx.log(`nether survey: nearest bastion_remnant ${JSON.stringify(bastion)}, fortress ${JSON.stringify(fortress)}`)
    const [x0, z0, x1, z1] = SURVEY
    await ctx.forceload({ x0, z0, x1, z1 }, 180000)
    const cols = []
    const solid = (b) => b && b.boundingBox === 'block'
    for (let z = z0; z <= z1; z++) {
      const row = []
      for (let x = x0; x <= x1; x++) {
        const floors = []
        let lava = null, open = 0, top = null
        for (let y = 122; y >= 1; y--) {
          const b = bot.blockAt(new Vec3(x, y, z))
          if (!b) break
          if (b.name === 'lava' && lava === null && open >= 1) lava = y
          if (solid(b)) { if (open >= 2) floors.push([y, b.name.replace(/^minecraft:/, '')]); if (top === null && open >= 1) top = y; open = 0 } else if (b.name !== 'lava') open++
          else open = 0
        }
        row.push({ floors: floors.slice(0, 4), lava })
      }
      cols.push(row)
    }
    const bAt = bot.blockAt(new Vec3(P.at[0], P.at[1], P.at[2]))
    const biome = bAt && bAt.biome ? bAt.biome.name : null
    ctx.log(`nether survey: biome at the origin ${biome}`)
    const out = { place: PLACE, at: P.at, area: SURVEY, bastion, fortress, biome, cols, made: new Date().toISOString() }
    fs.writeFileSync(path.join(__dirname, '..', 'work', 'nether_survey.json'), JSON.stringify(out))
    // the set: the place's origin, on the floor nearest y 80 there
    const c = cols[P.at[2] - z0][P.at[0] - x0]
    const f = (c.floors || []).slice().sort((a, b) => Math.abs(a[0] - P.at[1]) - Math.abs(b[0] - P.at[1]))[0]
    const y = f ? f[0] : P.at[1]
    ctx.log(`nether survey: at the place's origin (${P.at[0]}, ${P.at[2]}) the floors are ${JSON.stringify(c.floors)}, lava ${c.lava}; set y ${y}`)
    this.F = y
    await ctx.tpCheck(P.at[0] + 0.5, y + 1, P.at[2] + 0.5, 90, 0)
    await bot.waitForTicks(20)
    return { x: P.at[0], y, z: P.at[2] }
  },

  async perform (ctx) {
    const { bot } = ctx
    ctx.mark('wide'); ctx.mark('shot', { name: 'wide' })
    await bot.waitForTicks(50)
    ctx.mark('shelf'); ctx.mark('shot', { name: 'shelf' })
    await bot.waitForTicks(50)
    ctx.mark('look'); ctx.mark('shot', { name: 'pov' })
    // a slow look round (eased, under 60 deg/s)
    const y0 = bot.entity.yaw
    for (let k = 1; k <= 80; k++) { const u = k / 80, e = u * u * (3 - 2 * u); await bot.look(y0 + e * 150 * DEG, -8 * DEG, true); await bot.waitForTicks(1) }   // motion-ok: a test stunt's slow pan
    return true
  }
}
