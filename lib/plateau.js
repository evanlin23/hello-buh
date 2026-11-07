// A flat field that never sits in a pit. Clearing a field down to the start point's height left
// sheer dirt/stone walls wherever the terrain around was higher, and they showed in every wide or
// spinning shot (tnt_1000, it_rains reviews). Instead the field is levelled at a high percentile
// of the terrain inside it: lower ground is filled up with dirt (the edges drop away like a
// plateau, with real terrain below and beyond), higher ground is cleared.
//   const floor = await plateau(ctx, { x0, x1, z0, z1, biome: 'minecraft:plains' })   // absolute block coords, inclusive
async function plateau (ctx, { x0, x1, z0, z1, pct = 0.85, above = 34, below = 14, minY = 63, biome = null }) {
  // load the whole field first: a /fill that touches an unloaded chunk fails whole ("That position
  // is not loaded"), and tnt_1000's far end kept its forest (docs/lessons.md, big /fill builds)
  await ctx.cmd(`/forceload add ${x0} ${z0} ${x1} ${z1}`)
  await ctx.bot.waitForTicks(40)
  const hs = []
  for (let x = x0; x <= x1; x += 6) {
    for (let z = z0; z <= z1; z += 6) {
      const b = ctx.surface(x, z)
      if (b) hs.push(b.position.y)
    }
  }
  if (!hs.length) throw new Error('plateau: no terrain loaded')
  hs.sort((a, b) => a - b)
  const floor = Math.max(minY, hs[Math.min(hs.length - 1, Math.floor(hs.length * pct))])
  ctx.log('plateau floor', floor, 'terrain', hs[0], '..', hs[hs.length - 1])
  const area = (x1 - x0 + 1) * (z1 - z0 + 1)
  const rows = Math.max(1, Math.floor(32000 / area))     // /fill caps at 32768 blocks
  const slabs = async (ya, yb, block) => {
    for (let y = ya; y <= yb; y += rows) await ctx.cmd(`/fill ${x0} ${y} ${z0} ${x1} ${Math.min(yb, y + rows - 1)} ${z1} ${block}`)
  }
  await slabs(floor + 1, floor + above, 'air')
  await slabs(floor - below, floor - 1, 'dirt')
  await ctx.cmd(`/fill ${x0} ${floor} ${z0} ${x1} ${floor} ${z1} grass_block`)
  if (biome) {
    // one biome over the field (one grass colour). /fillbiome counts whole 4x4x4 cells against the
    // 32768 cap, so 76x76 tiles (84x84 rounded out) and one 4-aligned row of cells at a time stay under it
    for (let tx = x0; tx <= x1; tx += 76) {
      for (let tz = z0; tz <= z1; tz += 76) {
        for (let y = (floor - 8) & ~3; y <= floor + 24; y += 4) await ctx.cmd(`/fillbiome ${tx} ${y} ${tz} ${Math.min(x1, tx + 75)} ${y + 3} ${Math.min(z1, tz + 75)} ${biome}`)
      }
    }
  }
  return floor
}

module.exports = { plateau }
