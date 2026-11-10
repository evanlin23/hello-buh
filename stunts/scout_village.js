// Scout for story_dog_hill: plains villages (from several start points) with a hill beside them. For each village:
// its centre height, and the highest ground 20-70 blocks out in 16 directions (a hill to put the dog on, looking down
// on the roofs). Prints SCOUTV {...} lines; run with STUNT=scout_village TRIES=1 BOT_TIMEOUT=1500 ./scripts/record.sh
module.exports = {
  name: 'scout_village', biome: null, botTimeout: 1500,
  async setup (ctx) { await ctx.cmd('/gamemode creative'); return { x: 0, y: 100, z: 0 } },
  async perform (ctx) {
    const { bot } = ctx
    const starts = JSON.parse(process.env.SCOUT_STARTS || '[[0,0],[1500,0],[-1500,0],[0,1500],[0,-1500],[1500,1500],[-1500,-1500],[1500,-1500],[-1500,1500],[3000,0]]')
    const seen = new Set()
    for (const st of starts) {
      try {
        await ctx.cmd(`/tp @s ${st[0]} 200 ${st[1]}`); await bot.waitForTicks(10)
        const loc = await new Promise((resolve) => {
          const on = (m) => { const r = /nearest .* is at \[(-?\d+), [^,]+, (-?\d+)\]/.exec(m); if (r) { bot.removeListener('messagestr', on); resolve([+r[1], +r[2]]) } }
          bot.on('messagestr', on); setTimeout(() => { bot.removeListener('messagestr', on); resolve(null) }, 30000)
          bot.chat('/locate structure minecraft:village_plains')
        })
        if (!loc || seen.has(loc.join(','))) { ctx.log('SCOUTV', JSON.stringify({ st, loc, dup: !!loc })); continue }
        seen.add(loc.join(','))
        await ctx.cmd(`/tp @s ${loc[0]} 200 ${loc[1]}`); await bot.waitForTicks(100); await bot.waitForChunksToLoad()
        const c = ctx.surface(loc[0], loc[1]); const cy = c ? c.position.y : null
        const dirs = []
        for (let k = 0; k < 16; k++) {
          const an = k / 16 * 2 * Math.PI; let best = null
          for (let r = 20; r <= 70; r += 5) {
            const s = ctx.surface(Math.round(loc[0] + r * Math.sin(an)), Math.round(loc[1] + r * Math.cos(an)))
            if (s && (!best || s.position.y > best.y)) best = { y: s.position.y, r, b: s.name, x: s.position.x, z: s.position.z }
          }
          dirs.push(best)
        }
        const top = dirs.filter(Boolean).sort((a, b) => b.y - a.y)[0]
        let snow = 0, water = 0, n = 0
        for (let dx = -60; dx <= 60; dx += 10) for (let dz = -60; dz <= 60; dz += 10) { const s = ctx.surface(loc[0] + dx, loc[1] + dz); if (!s) continue; n++; if (/snow|ice/.test(s.name)) snow++; if (s.name === 'water') water++ }
        ctx.log('SCOUTV', JSON.stringify({ st, loc, cy, top, rise: top && cy ? top.y - cy : null, snow, water, n, dirs: dirs.map(d => d && `${d.y}@${d.r}`) }))
      } catch (e) { ctx.log('SCOUTV', JSON.stringify({ st, error: e.message })) }
    }
  }
}
