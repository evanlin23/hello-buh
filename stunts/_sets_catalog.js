// Not a Short: the set library's catalog stills (docs/sets.md). Places every piece of lib/sets on natural plains
// terrain, each on its own site, then cuts to each piece's establishing shot. Marks 'shot' { name } per still.
//   RECORD_ONLY=1 STUNT=_sets_catalog TRIES=2 ./run.sh
//   then: node scripts/set_stills.js _sets_catalog docs/sets   (renders each 'shot' mark at 540x506 as a jpg)
// PIECES=cottage,well limits the run.
const sets = require('../lib/sets')

const ALL = ['cottage', 'house2', 'farmhouse', 'well', 'camp', 'graveyard', 'market', 'church', 'watchtower', 'lighthouse', 'bridge', 'mine', 'basement', 'room']
const ONLY = process.env.PIECES ? process.env.PIECES.split(',') : ALL

module.exports = {
  name: '_sets_catalog',
  biome: process.env.BIOME || 'minecraft:plains',
  hideHand: true,
  botTimeout: 1500,
  time: 6500,
  recordRadius: 176,

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/gamerule random_tick_speed 0')      // crops, leaves and grass stay as built
    // a fresh stretch of land (FAR=x,z: go there first and look for the biome from there)
    if (process.env.FRESH) await sets.freshLand(ctx, module.exports.biome, process.env.FRESH === '1' ? {} : { starts: [process.env.FRESH.split(',').map(Number)] })
    await bot.waitForChunksToLoad()
    await bot.waitForTicks(40)
    const p0 = bot.entity.position.floored()
    this.placed = []
    const taken = []
    for (const name of ONLY) {
      const { size } = sets.build(name).bounds()
      const w = size[0] + 8, d = size[2] + 8
      const site = await sets.findSite(ctx, { w, d, reach: 88, stride: 8, maxRange: name === 'mine' || name === 'lighthouse' ? 6 : 4, near: p0, avoid: taken }) ||
        await sets.findSite(ctx, { w, d, reach: 88, stride: 8, maxRange: 8, maxTrees: 0.5, near: p0, avoid: taken })
      let at = site
      for (let i = 0; !at && i < 64; i++) {   // nothing good left: the first free spot on a spiral
        const c = { x: p0.x + Math.round(Math.cos(i * 0.9) * (30 + i * 1.5)), z: p0.z + Math.round(Math.sin(i * 0.9) * (30 + i * 1.5)) }
        if (!taken.some(a => Math.abs(a.x - c.x) < (a.w + w) / 2 && Math.abs(a.z - c.z) < (a.d + d) / 2)) at = c
      }
      taken.push({ x: at.x, z: at.z, w: w + 6, d: d + 6 })
      const facing = ['south', 'east', 'west', 'south'][taken.length % 4]
      const set = await sets.place(ctx, name, { x: at.x, z: at.z, facing })
      this.placed.push(set)
      // a little landscaping round each so the stills show the pieces as meant (trees and rocks behind)
      const back = { x: (set.box.x0 + set.box.x1) / 2 - set.front.x * (size[2] / 2 + 8), z: (set.box.z0 + set.box.z1) / 2 - set.front.z * (size[2] / 2 + 8) }
      await sets.dress.grove(ctx, { x: Math.round(back.x), z: Math.round(back.z), r: 10, n: 3, kinds: ['fancy_oak', 'oak', 'birch'] })
      await sets.dress.grass(ctx, { x: Math.round(set.shots.low.pos.x), z: Math.round(set.shots.low.pos.z), r: 4, n: 14 })
    }
    await ctx.cmd('/kill @e[type=item]')
    // stand on the ground at the start (the harness's chunk refresh checks the bot comes back to this spot)
    const g = sets.ground(ctx, { x0: p0.x, x1: p0.x, z0: p0.z, z1: p0.z }) ?? p0.y
    await ctx.cmd(`/tp @s ${p0.x + 0.5} ${g + 12} ${p0.z + 0.5}`)
    await bot.waitForTicks(60)
    return { x: p0.x, y: g, z: p0.z }
  },

  // every piece's chunks go into the recording (a piece past the bot's view at the snapshot rendered as sky)
  chunkStops () { return (module.exports.placed || []).map(s => ({ x: Math.round((s.box.x0 + s.box.x1) / 2), z: Math.round((s.box.z0 + s.box.z1) / 2) })) },

  async perform (ctx) {
    await ctx.cmd('/gamemode spectator')
    for (const s of this.placed) {
      const shots = [['wide', sets.frame(ctx, s, 'wide')]]
      if (s.name === 'basement') shots.splice(0, 1, ['corner', sets.anchorShot(s.anchors.corner)])
      if (s.name === 'room') shots.push(['inside', sets.anchorShot(s.anchors.wide)])
      if (s.name === 'cottage') shots.push(['inside', sets.anchorShot(s.anchors.inside)])
      if (s.name === 'mine') shots.push(['deep', sets.anchorShot(s.anchors.deep)])
      if (s.name === 'church') shots.push(['aisle', sets.anchorShot(s.anchors.aisle, { back: 3, up: 1 })])
      for (const [n, shot] of shots) await sets.shoot(ctx, shot, 8, `${s.name}_${n}`)
    }
    return true
  }
}
