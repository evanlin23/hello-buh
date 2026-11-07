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

async function findFlat (ctx, area, { reach = 128, step = 4, stride = 16, noTrees = false } = {}) {
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
      if (noTrees && /_leaves$|_log$/.test(b.name)) { v = -1; break }   // a clear would slice the tree
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

// findSite: findFlat around the bot once its chunks have loaded; if nothing fits, hop 256 blocks
// along a ring and look again (still in creative, high up)
async function findSite (ctx, area, opts = {}) {
  const { bot } = ctx
  const hops = [[0, 0], [256, 0], [0, 256], [-256, 0], [0, -256], [512, 0], [0, 512], [-512, 0], [0, -512], [384, 384], [-384, -384]]
  const flatEnough = opts.flatEnough ?? 8
  let best = null
  const p0 = bot.entity.position.clone()
  for (const [dx, dz] of hops) {
    if (dx || dz) await ctx.cmd(`/tp @s ${Math.round(p0.x + dx)} 180 ${Math.round(p0.z + dz)}`)
    let n = -1
    for (let k = 0; k < 30; k++) {   // until the loaded chunks stop growing (max ~15 s)
      await bot.waitForTicks(10)
      const m = bot.world.getColumns().length
      if (m === n) break
      n = m
    }
    const g = await findFlat(ctx, area, opts)
    ctx.log('findSite at', dx, dz, g)
    if (g && (!best || g.range < best.range)) best = g
    if (best && best.range <= flatEnough) return best
  }
  return best   // the flattest seen
}

async function clearFlat (ctx, x, z, y, area, height = 24) {
  const [X0, X1, Z0, Z1] = [x + area[0], x + area[1], z + area[2], z + area[3]]
  const per = Math.max(1, Math.floor(32768 / ((X1 - X0 + 1) * (Z1 - Z0 + 1))))   // layers per /fill under the cap
  const nap = () => new Promise(resolve => setTimeout(resolve, 120))           // a breath for the server
  for (let y0 = y + 1; y0 <= y + height; y0 += per) { await ctx.cmd(`/fill ${X0} ${y0} ${Z0} ${X1} ${Math.min(y0 + per - 1, y + height)} ${Z1} air`); await nap() }
  for (let y0 = y - 3; y0 <= y - 1; y0 += per) await ctx.cmd(`/fill ${X0} ${y0} ${Z0} ${X1} ${Math.min(y0 + per - 1, y - 1)} ${Z1} dirt`)
  await ctx.cmd(`/fill ${X0} ${y} ${Z0} ${X1} ${y} ${Z1} grass_block`)
}

// openSpots: build on the natural ground instead of a cleared box. Walks from (x, z) along `axis`
// ('x' or 'z') and returns `heights.length` spots { x, z, floor }, each at least `gap` past the last.
// The spot's footprint [dx0, dx1, dz0, dz1] must be grass within a block of floor (`level`, a sub-box,
// exactly at floor) with nothing but air or small plants above it up to floor + heights[i] + 4 (no
// trees, no overhangs).
// The bot is moved along so the chunks ahead stay loaded (creative, high up).
const PLANT = /^(air|short_grass|tall_grass|fern|large_fern|dandelion|poppy|bush|leaf_litter|wildflowers|short_dry_grass|tall_dry_grass)$|flower|tulip|orchid|allium|azure|oxeye|cornflower|lily_of/
async function openSpots (ctx, x, z, heights, { axis = 'x', gap = 9, foot = [-1, 1, -1, 1], level = null, side = [0, 4, -4, 8, -8, 12, -12, 16, -16, 20, -20, 24, -24, 28, -28], tries = 120, min = Infinity } = {}) {
  const { bot, Vec3 } = ctx
  const at = (a, b) => axis === 'x' ? [a, b] : [b, a]   // (along, across) -> (x, z)
  const lv = level   // the part of the footprint that must be exactly at floor (where it lands); the rest within a block
  const open = (sx, sz, floor, h) => {
    for (let dx = foot[0]; dx <= foot[1]; dx++) {
      for (let dz = foot[2]; dz <= foot[3]; dz++) {
        const b = ctx.surface(sx + dx, sz + dz)
        const exact = !lv || (dx >= lv[0] && dx <= lv[1] && dz >= lv[2] && dz <= lv[3])
        if (!b || !/^(grass_block|dirt)$/.test(b.name) || (exact ? b.position.y !== floor : Math.abs(b.position.y - floor) > 1)) return false
        for (let y = floor + 1; y <= floor + h + 4; y++) { const a = bot.blockAt(new Vec3(sx + dx, y, sz + dz)); if (!a || !PLANT.test(a.name)) return false }
      }
    }
    return true
  }
  // each spot: the first open one from the start of the line (in order along it), at least `gap` from
  // every spot taken so far, so a hard spot doesn't push the rest of the set far away
  const out = []
  const A0 = axis === 'x' ? x : z, B0 = axis === 'x' ? z : x
  const free = (sx, sz) => out.every(o => Math.max(Math.abs(o.x - sx), Math.abs(o.z - sz)) >= gap)
  const [tx, tz] = at(A0 + 60, B0)
  await ctx.cmd(`/tp @s ${tx} 140 ${tz}`); await bot.waitForTicks(20)   // over the line: its chunks loaded
  try { await bot.waitForChunksToLoad() } catch (e) {}
  for (const h of heights) {
    let spot = null
    for (let t = 0, a = A0; t < tries && !spot; t++, a += 2) {
      for (const d of side) {
        const [sx, sz] = at(a, B0 + d)
        if (!free(sx, sz)) continue
        const b = ctx.surface(sx, sz)
        if (b && b.name === 'grass_block' && b.position.y >= 63 && open(sx, sz, b.position.y, h)) { spot = { x: sx, z: sz, floor: b.position.y }; break }
      }
    }
    if (!spot && out.length >= min) break   // enough: the rest were optional
    if (!spot) throw new Error(`no open ground for spot ${out.length} (height ${h})`)
    out.push(spot)
  }
  return out
}

module.exports = { findFlat, findSite, clearFlat, openSpots }
