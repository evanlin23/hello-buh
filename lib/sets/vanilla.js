// Vanilla structures as sets: /place structure puts a whole generated structure down (a village with its streets,
// houses, farms, villagers and bell; an outpost; a ruined portal...) fitted to the terrain by the game's own jigsaw
// and terrain adaptation. Our pieces and dressing can then be built onto it (a cottage at the edge, a market in the
// square, lamps along the streets).
//   const v = await sets.vanilla(ctx, 'village_plains', { x, z })
//   v.anchors.bell, v.anchors.beds[], v.anchors.doors[], v.anchors.work[] ({ name, x, y, z }), v.box
const { ground, forceload } = require('./site')

// structure id -> what it is and where it belongs (the game generates it anywhere /place puts it; the biome only
// changes the grass colour round it, so pick a matching biome for the stunt)
const VANILLA = {
  village_plains: 'oak village: streets, houses, farms, a bell, villagers (plains, meadow)',
  village_taiga: 'spruce village with mossy cobble (taiga)',
  village_savanna: 'acacia village with terracotta (savanna)',
  village_desert: 'sandstone village (desert)',
  village_snowy: 'snowy village (snowy plains)',
  pillager_outpost: 'dark oak watchtower with pillagers and cages',
  ruined_portal: 'a broken nether portal with netherrack and gold blocks (also ruined_portal_mountain, _swamp, _jungle, _desert, _ocean)',
  igloo: 'igloo (with its hidden basement)',
  swamp_hut: 'witch hut on stilts',
  desert_pyramid: 'desert temple',
  jungle_pyramid: 'jungle temple',
  trail_ruins: 'buried terracotta ruins (mostly underground)',
  shipwreck_beached: 'a wrecked ship on a beach',
  mansion: 'woodland mansion (huge: give it room and a forest)'
}

const MOBS = ['villager', 'iron_golem', 'cat', 'pillager', 'witch', 'wandering_trader', 'allay']

// place a vanilla structure with its start at (x, z) (y: the ground there). opts:
//   radius   the area to load and scan (default 96: a village reaches ~80 from its start)
//   mobs     'freeze' (default: NoAI, silent, invulnerable, so the cast stays where it stood; continuity across cuts),
//            'kill' (an empty set to cast yourself), 'keep' (they wander: lived-in, but you can't stage them)
//   scan     false: don't collect anchors (a scan sends the bot away and back so the chunks come again)
async function vanilla (ctx, id, { x, z, y, radius = 96, mobs = 'freeze', scan = true } = {}) {
  const { bot } = ctx
  const me = bot.entity.position
  x = x ?? Math.floor(me.x); z = z ?? Math.floor(me.z)
  await forceload(ctx, x - radius, z - radius, x + radius, z + radius)
  await bot.waitForTicks(20)
  if (y === undefined) y = ground(ctx, { x0: x - 2, x1: x + 2, z0: z - 2, z1: z + 2 }) ?? Math.floor(me.y)
  // the game says where it went (and whether it failed); feedback on for this one command
  const said = new Promise((resolve) => {
    const on = (m) => { if (/Generated structure|not loaded|Failed|Invalid|Unknown/.test(m)) { bot.removeListener('messagestr', on); resolve(m) } }
    bot.on('messagestr', on); setTimeout(() => { bot.removeListener('messagestr', on); resolve(null) }, 30000)
  })
  await ctx.cmd('/gamerule send_command_feedback true')
  bot.chat(`/place structure minecraft:${id} ${x} ${y} ${z}`)
  const msg = await said
  await ctx.cmd('/gamerule send_command_feedback false')
  ctx.log('vanilla:', id, msg)
  if (!msg || !/Generated/.test(msg)) throw new Error(`/place structure ${id} failed: ${msg}`)
  const sel = (t) => `@e[type=${t},x=${x},y=${y},z=${z},distance=..${radius + 32}]`
  for (const t of MOBS) {
    if (mobs === 'kill') await ctx.cmd(`/kill ${sel(t)}`)
    else if (mobs === 'freeze') await ctx.cmd(`/execute as ${sel(t)} run data merge entity @s {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b}`)
  }
  const out = { id, x, y, z, radius, anchors: {} }
  if (scan) out.anchors = await scanAnchors(ctx, x, y, z, radius)
  return out
}

// beds, doors, the bell and job sites near (x, z), read from fresh chunks (mineflayer misses the block updates of
// big placements: the bot goes away and comes back so the server sends every chunk again)
async function scanAnchors (ctx, x, y, z, r) {
  const { bot, Vec3 } = ctx
  const back = bot.entity.position.clone()
  await ctx.cmd(`/tp @s ${x + 4000} 250 ${z}`); await bot.waitForTicks(30)
  await ctx.cmd(`/tp @s ${x + 0.5} ${y + 40} ${z + 0.5}`)
  try { await bot.waitForChunksToLoad() } catch (e) {}
  await bot.waitForTicks(30)
  const names = (re) => Object.values(bot.registry.blocksByName).filter(b => re.test(b.name)).map(b => b.id)
  const find = (re, count = 64) => bot.findBlocks({ matching: names(re), maxDistance: r, count, point: new Vec3(x, y, z) })
  const pt = (p, extra = {}) => ({ x: p.x + 0.5, y: p.y, z: p.z + 0.5, ...extra })
  const anchors = {}
  const bell = find(/^bell$/, 1)[0]
  if (bell) anchors.bell = pt(bell)
  // a bed is two blocks: keep the heads; a door is two: keep the lower halves
  anchors.beds = find(/_bed$/).filter(p => bot.blockAt(p).getProperties().part === 'head').map(p => pt(p, { facing: bot.blockAt(p).getProperties().facing }))
  anchors.doors = find(/_door$/).filter(p => bot.blockAt(p).getProperties().half === 'lower').map(p => pt(p, { facing: bot.blockAt(p).getProperties().facing }))
  anchors.work = find(/^(composter|lectern|barrel|smoker|blast_furnace|cartography_table|fletching_table|grindstone|loom|smithing_table|stonecutter|brewing_stand|cauldron)$/).map(p => pt(p, { name: bot.blockAt(p).name }))
  ctx.log(`vanilla anchors: bell ${!!bell}, ${anchors.beds.length} beds, ${anchors.doors.length} doors, ${anchors.work.length} job sites`)
  await ctx.cmd(`/tp @s ${back.x.toFixed(3)} ${back.y.toFixed(3)} ${back.z.toFixed(3)}`)
  await bot.waitForTicks(10)
  return anchors
}

module.exports = { vanilla, scanAnchors, VANILLA }
