// Location scout (docs/movie_engine.md, "Shots an agent can trust"), not a scene: scripts/scout.sh runs it. The seed is
// fixed (server.properties level-seed), so /locate from spawn always finds the same spot; this tries each biome from
// several start points and scores a 96-block radius around what it finds (snow, ice, water, grass, the spread of
// heights), so a scene can pick a `near: [x, z]` whose surroundings look right from a high camera.
//   SCOUT_BIOMES=minecraft:plains,minecraft:forest SCOUT_STARTS='[[1200,0],[-1200,0]]' ./scripts/scout.sh
module.exports = {
  name: 'scout', biome: null, botTimeout: 1800,
  async setup (ctx) { await ctx.cmd('/gamemode creative'); return { x: 0, y: 100, z: 0 } },
  async perform (ctx) {
    const { bot } = ctx
    const biomes = (process.env.SCOUT_BIOMES || 'minecraft:plains').split(',')
    const starts = JSON.parse(process.env.SCOUT_STARTS || '[[0,0],[1200,0],[-1200,0],[0,1200],[0,-1200],[1200,1200],[-1200,-1200],[2400,600]]')
    for (const st of starts) {
      for (const b of biomes) {
        try {
          await ctx.cmd(`/tp @s ${st[0]} 200 ${st[1]}`); await bot.waitForTicks(10)
          const loc = await ctx.locateBiome(b)
          if (!loc) { ctx.log('SCOUT', JSON.stringify({ near: st, biome: b, found: null })); continue }
          await bot.waitForTicks(80); await bot.waitForChunksToLoad()
          const cnt = {}; let n = 0; const ys = []
          for (let dx = -96; dx <= 96; dx += 8) {
            for (let dz = -96; dz <= 96; dz += 8) {
              if (Math.hypot(dx, dz) > 96) continue
              const s = ctx.surface(loc[0] + dx, loc[1] + dz); if (!s) continue
              const above = bot.blockAt(s.position.offset(0, 1, 0))
              const k = (above && above.name === 'snow') ? 'snow' : s.name
              cnt[k] = (cnt[k] || 0) + 1; n++; ys.push(s.position.y)
            }
          }
          ys.sort((a, c) => a - c)
          // local flatness: the height spread within 40 blocks (a set needs flat ground; cutting a hill leaves a pit)
          const near = []
          for (let dx = -40; dx <= 40; dx += 5) for (let dz = -40; dz <= 40; dz += 5) { if (Math.hypot(dx, dz) > 40) continue; const s2 = ctx.surface(loc[0] + dx, loc[1] + dz); if (s2) near.push(s2.position.y) }
          near.sort((a, c) => a - c)
          const flat = near.length ? near[Math.floor(near.length * 0.9)] - near[Math.floor(near.length * 0.1)] : 99
          const pc = (k) => Math.round(100 * (cnt[k] || 0) / Math.max(1, n))
          const green = pc('grass_block') + pc('leaf_litter') + pc('podzol') + pc('moss_block')
          const cold = pc('snow') + pc('ice') + pc('packed_ice') + pc('powder_snow')
          ctx.log('SCOUT', JSON.stringify({ near: st, biome: b, found: loc, green, cold, water: pc('water'), flat, y: [ys[0], ys[Math.floor(ys.length / 2)], ys[ys.length - 1]], top: Object.entries(cnt).sort((a, c) => c[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${Math.round(100 * v / n)}%`) }))
        } catch (e) { ctx.log('SCOUT', JSON.stringify({ near: st, biome: b, error: e.message })) }
      }
    }
    return false   // nothing to record
  }
}
