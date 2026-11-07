// Shared set helpers for my stunts (not a stunt itself; nothing loads stunts/ by listing it).
//
// findFlat: the flattest dry grassland near the bot for a set, so the clear around the set doesn't
// cut a box into hills (reviewers: "a dug-out box with dirt walls"). `area` is the set's clear area
// relative to its origin: [dx0, dx1, dz0, dz1]. Every 4th block of the area is sampled (the ground
// under plants and trees); an unloaded chunk or the sea (ground below y 63) anywhere in it rules a
// spot out. A pond or a sand patch doesn't: clearFlat grasses the whole area over. Returns
// { x, z, y, range }: the origin, the median ground height and the height range over the area.
//
// clearFlat: level the area at y: air from y+1 up over everything that stands on it (hills, trees),
// grass at y and dirt below it. On flat land the cuts at its edges are a block or two.
const SKIP = /^(air|cave_air|short_grass|tall_grass|fern|large_fern|snow|dandelion|poppy|bush|vine|sugar_cane|pumpkin|melon|sweet_berry_bush|lily_pad|leaf_litter|wildflowers|firefly_bush|short_dry_grass|tall_dry_grass)$|_leaves$|_log$|flower|tulip|orchid|allium|azure|oxeye|cornflower|lily_of|mushroom/

async function findFlat (ctx, area, { reach = 128, step = 4, stride = 16 } = {}) {
  const { bot, Vec3 } = ctx
  const p = bot.entity.position.floored()
  const r4 = (v) => Math.floor(v / step) * step
  const [a0, a1, b0, b1] = [r4(area[0]), r4(area[1]), r4(area[2]), r4(area[3])]
  const H = new Map()
  const h = (x, z) => {   // ground height, -1 for bad ground, null for unloaded
    const k = x * 65536 + z
    if (H.has(k)) return H.get(k)
    let v = null
    for (let y = 120; y > 50; y--) {
      const b = bot.blockAt(new Vec3(x, y, z))
      if (!b) break
      if (SKIP.test(b.name)) continue
      v = y >= 63 ? y : -1
      break
    }
    H.set(k, v)
    return v
  }
  let best = null
  const ox = r4(p.x), oz = r4(p.z)
  for (let cx = ox - reach; cx <= ox + reach; cx += stride) {
    await new Promise(resolve => setImmediate(resolve))   // a long search: keep the bot's ticks going
    for (let cz = oz - reach; cz <= oz + reach; cz += stride) {
      let lo = Infinity, hi = -Infinity, ok = true
      const ys = []
      for (let dx = a0; dx <= a1 && ok; dx += step) {
        for (let dz = b0; dz <= b1; dz += step) {
          const v = h(cx + dx, cz + dz)
          if (v === null || v < 0) { ok = false; break }
          if (v < lo) lo = v
          if (v > hi) hi = v
          if (best && hi - lo >= best.range) { ok = false; break }
          ys.push(v)
        }
      }
      if (!ok) continue
      ys.sort((a, b) => a - b)
      best = { x: cx, z: cz, y: ys[ys.length >> 1], range: hi - lo }
      if (best.range <= 1) return best
    }
  }
  if (!best) {   // why: unloaded vs sea, over a grid around the bot
    let nul = 0, sea = 0, ok = 0
    for (let dx = -reach; dx <= reach; dx += 8) for (let dz = -reach; dz <= reach; dz += 8) { const v = h(ox + dx, oz + dz); if (v === null) nul++; else if (v < 0) sea++; else ok++ }
    ctx.log('findFlat: nothing; around the bot', { unloaded: nul, sea, ground: ok, at: p.toString() })
  }
  return best
}

async function clearFlat (ctx, x, z, y, area, height = 24) {
  const [X0, X1, Z0, Z1] = [x + area[0], x + area[1], z + area[2], z + area[3]]
  const per = Math.max(1, Math.floor(32768 / ((X1 - X0 + 1) * (Z1 - Z0 + 1))))   // layers per /fill under the cap
  const nap = () => new Promise(resolve => setTimeout(resolve, 120))           // a breath for the server
  for (let y0 = y + 1; y0 <= y + height; y0 += per) { await ctx.cmd(`/fill ${X0} ${y0} ${Z0} ${X1} ${Math.min(y0 + per - 1, y + height)} ${Z1} air`); await nap() }
  for (let y0 = y - 3; y0 <= y - 1; y0 += per) await ctx.cmd(`/fill ${X0} ${y0} ${Z0} ${X1} ${Math.min(y0 + per - 1, y - 1)} ${Z1} dirt`)
  await ctx.cmd(`/fill ${X0} ${y} ${Z0} ${X1} ${y} ${Z1} grass_block`)
}

module.exports = { findFlat, clearFlat }
