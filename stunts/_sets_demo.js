// Not a Short: the set library's proof (docs/sets.md "Demo"). A small village built from lib/sets on natural plains
// terrain: a market square as the focal point, a church behind it, houses round it each on its own ground and
// facing the square, a well, a graveyard, a farm and a watchtower at the edges, worn paths from every door, lamps,
// tree clumps, boulders and flowers, villagers in the market, and a vanilla village beyond the church for the
// distance. Then four stills: the establishing shot, a street at eye level, the market, and the same village at dusk.
//   RECORD_ONLY=1 STUNT=_sets_demo TRIES=2 ./run.sh && node scripts/set_stills.js _sets_demo docs/sets/demo
const sets = require('../lib/sets')
const { dress } = sets

module.exports = {
  name: '_sets_demo',
  biome: process.env.BIOME || 'minecraft:plains',
  hideHand: true,
  botTimeout: 1500,
  time: 6500,
  recordRadius: 208,

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/gamerule random_tick_speed 0')
    if (process.env.DEMO_AT) { const [x, z] = process.env.DEMO_AT.split(',').map(Number); await ctx.cmd(`/tp @s ${x} 120 ${z}`); await ctx.sleep(8000) }
    else if (process.env.FRESH) await sets.freshLand(ctx, module.exports.biome, process.env.FRESH === '1' ? {} : { starts: [process.env.FRESH.split(',').map(Number)] })
    await ctx.sleep(5000)
    try { await bot.waitForChunksToLoad() } catch (e) {}
    const site = await sets.findSite(ctx, { w: 64, d: 64, reach: 64, stride: 16, maxRange: 10, maxTrees: 0.4, ring: 56 })
    const p = bot.entity.position.floored()
    // DEMO_AT=x,z: build the village there (reuse a stretch of land already generated: new land is slow to make)
    const O = site ? { x: site.x, z: site.z } : { x: p.x, z: p.z }
    this.O = O
    // each piece on the flattest ground within a few blocks of where the plan puts it (organic, fitted to the land)
    const taken = []
    const at = (dx, dz, name) => {
      const want = { x: O.x + dx, z: O.z + dz }
      if (!name) return want
      const { size } = sets.build(name).bounds()
      return (async () => {
        const s = await sets.findSite(ctx, { w: size[0] + 4, d: size[2] + 4, near: want, reach: 12, stride: 4, maxRange: 6, maxTrees: 0.6, ring: 20, avoid: taken }) ||
          await sets.findSite(ctx, { w: size[0] + 4, d: size[2] + 4, near: want, reach: 16, stride: 4, maxRange: 30, maxTrees: 1, ring: 20, avoid: taken })   // the least bad
        const p = s ? { x: s.x, z: s.z } : want
        taken.push({ x: p.x, z: p.z, w: size[0] + 6, d: size[2] + 6 })
        return p
      })()
    }
    const S = this.S = {}
    // the plan: the market in the middle, everything else facing it, each on its own ground
    S.market = await sets.place(ctx, 'market', { ...(await at(0, 0, 'market')), facing: 'south' })
    O.x = Math.round((S.market.box.x0 + S.market.box.x1) / 2); O.z = Math.round((S.market.box.z0 + S.market.box.z1) / 2)   // the square is the centre
    S.church = await sets.place(ctx, 'church', { ...(await at(2, -36, 'church')), facing: 'south' })
    S.graveyard = await sets.place(ctx, 'graveyard', { ...(await at(24, -38, 'graveyard')), facing: 'west' })
    S.cottageA = await sets.place(ctx, 'cottage', { ...(await at(-31, 4, 'cottage')), facing: 'east', variant: { palette: 'oak', seed: 3 } })
    S.cottageB = await sets.place(ctx, 'cottage', { ...(await at(31, 2, 'cottage')), facing: 'west', variant: { palette: 'spruce', seed: 8, bed: 'blue' } })
    S.houseA = await sets.place(ctx, 'house2', { ...(await at(-27, -21, 'house2')), facing: 'east' })
    S.houseB = await sets.place(ctx, 'house2', { ...(await at(28, 26, 'house2')), facing: 'north', variant: { palette: 'birch', seed: 4 } })
    S.well = await sets.place(ctx, 'well', { ...(await at(-2, 23, 'well')), facing: 'north' })
    S.farm = await sets.place(ctx, 'farmhouse', { ...(await at(-30, 46, 'farmhouse')), facing: 'north' })
    S.tower = await sets.place(ctx, 'watchtower', { ...(await at(50, -10, 'watchtower')), facing: 'west' })
    // a vanilla village beyond the church: roofs and a bell in the distance
    if (process.env.VILLAGE !== '0') try { S.village = await sets.vanilla(ctx, 'village_plains', { ...at(-10, -135), radius: 80, scan: false }) } catch (e) { ctx.log('village:', e.message) }

    // worn paths from every door to the square
    const door = (s, a = 'doorstep') => [Math.round(s.anchors[a].x), Math.round(s.anchors[a].z)]
    const m = S.market.anchors
    const edgeW = [O.x - 14, O.z + 1], edgeE = [O.x + 14, O.z], edgeN = [O.x, O.z - 14], edgeS = [O.x + 1, O.z + 14]
    await dress.path(ctx, [door(S.cottageA, 'street'), [O.x - 20, O.z + 3], edgeW], { w: 3 })
    await dress.path(ctx, [door(S.cottageB, 'street'), [O.x + 20, O.z + 1], edgeE], { w: 3 })
    await dress.path(ctx, [door(S.houseA, 'street'), [O.x - 18, O.z - 12], [O.x - 9, O.z - 10]], { w: 3 })
    await dress.path(ctx, [door(S.houseB, 'street'), [O.x + 18, O.z + 16], [O.x + 9, O.z + 11]], { w: 3 })
    await dress.path(ctx, [door(S.church), edgeN], { w: 4, blocks: ['dirt_path', 'gravel', 'dirt_path', 'cobblestone'] })
    await dress.path(ctx, [edgeS, [O.x, O.z + 20], door(S.farm, 'doorstep')], { w: 3 })
    await dress.path(ctx, [edgeE, [O.x + 36, O.z - 6], door(S.tower, 'doorstep')], { w: 2 })
    // lamps along the paths and at the square's corners
    for (const [x, z] of [[-20, 6], [20, -3], [-17, -15], [17, 18], [4, -18], [5, 18], [36, -2]]) await dress.lamp(ctx, O.x + x, O.z + z, { h: 3, fence: 'dark_oak_fence' })
    // tree clumps round the village (big ones for the skyline), boulders, flowers and long grass in the gaps
    dress.seed(7)
    for (const [x, z, n] of [[-52, -30, 4], [-55, 14, 3], [52, 28, 4], [12, 55, 3], [-8, -60, 2], [42, -46, 3], [60, -20, 2]]) await dress.grove(ctx, { x: O.x + x, z: O.z + z, r: 9, n, kinds: ['fancy_oak', 'oak', 'birch', 'fancy_oak', 'dark_oak'] })
    for (const [x, z] of [[-40, -8], [38, 14], [14, -24], [-14, 30], [46, 6]]) await dress.rocks(ctx, O.x + x, O.z + z, { r: 1.4 + (x % 3 ? 0.6 : 0) })
    for (const [x, z] of [[-18, 14], [16, -16], [-40, 22], [38, -24], [8, 34], [-8, -28]]) { await dress.flowers(ctx, { x: O.x + x, z: O.z + z, r: 5, n: 18 }); await dress.grass(ctx, { x: O.x + x + 3, z: O.z + z - 2, r: 6, n: 20 }) }
    await dress.clutter(ctx, O.x - 18, O.z - 3, 'crates'); await dress.clutter(ctx, O.x + 16, O.z + 9, 'market'); await dress.clutter(ctx, O.x - 22, O.z - 26, 'logs')

    // life: villagers at the stalls and a few customers, a cat by the well, cows in the paddock (NoAI: they stay put)
    const nb = '{NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b'
    const vil = (a, prof, yaw) => ctx.cmd(`/summon villager ${a.x.toFixed(2)} ${a.y} ${a.z.toFixed(2)} ${nb},Rotation:[${yaw}f,0f],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2}}`)
    const profs = ['farmer', 'fisherman', 'armorer', 'librarian']
    for (let i = 0; i < 4; i++) { const st = m[`stall_${i}`]; await vil(st, profs[i], st.yaw) }
    await vil(m.buyer_0, 'none', m.buyer_0.yaw); await vil(m.buyer_3, 'cleric', m.buyer_3.yaw); await vil(m.bench_w, 'nitwit', m.bench_w.yaw)
    await vil(S.well.anchors.rim, 'shepherd', S.well.anchors.rim.yaw)
    const pd = S.farm.anchors.paddock
    for (const [dx, dz] of [[0, 0], [2, 3], [-2, 1]]) await ctx.cmd(`/summon cow ${(pd.x + dx).toFixed(2)} ${pd.y} ${(pd.z + dz).toFixed(2)} ${nb},Rotation:[${dx * 40}f,0f]}`)
    await ctx.cmd('/kill @e[type=item]')
    // stand on the square's paving (the harness's chunk refresh brings the bot back to exactly here)
    const st = S.market.anchors.entrance
    await ctx.cmd(`/tp @s ${st.x} ${st.y} ${st.z - 3}`)
    await ctx.sleep(3000)
    try { await bot.waitForTicks(20) } catch (e) {}
    return { x: O.x, y: S.market.y, z: O.z }
  },

  async perform (ctx) {
    const { O, S } = this
    const y0 = S.market.y
    await ctx.cmd('/gamemode spectator')
    const church = { x: S.church.anchors.belfry.x, y: S.church.anchors.belfry.y, z: S.church.anchors.belfry.z }
    // 1. establishing: high over the south-east, the whole village to the church and the woods beyond
    const establish = { pos: { x: O.x + 46, y: y0 + 26, z: O.z + 62 }, look: { x: O.x - 4, y: y0 + 2, z: O.z - 16 } }
    await sets.shoot(ctx, sets.frame(ctx, { shots: { wide: establish } }), 10, 'establish')
    // 2. a street at eye level: from cottage A's garden gate toward the square (the clearest line near there)
    const a = S.cottageA.anchors.street
    const sq = { x: O.x, y: y0 + 2, z: O.z }
    await sets.shoot(ctx, sets.frame(ctx, { shots: { wide: { pos: { x: a.x, y: a.y, z: a.z }, look: sq } } }), 10, 'street')
    // 3. the market: from the south entrance past a stall, the fountain, the church
    const e = S.market.anchors.entrance
    await sets.shoot(ctx, { pos: { x: e.x + 7, y: e.y + 0.5, z: e.z + 5 }, look: { x: church.x, y: y0 + 6, z: church.z } }, 10, 'market')
    // 4. the establishing shot again at dusk: lamps, windows and the hearths lit
    ctx.dayTime = 12900; ctx.bot.chat('/time set 12900'); ctx.mark('time', { time: 12900 })
    await sets.shoot(ctx, sets.frame(ctx, { shots: { wide: establish } }), 10, 'dusk')
    return true
  },
  chunkStops (set) { return [{ x: set.x - 10, z: set.z - 120 }, ...Object.values(module.exports.S || {}).filter(s => s && s.box).map(s => ({ x: Math.round((s.box.x0 + s.box.x1) / 2), z: Math.round((s.box.z0 + s.box.z1) / 2) }))] }
}
