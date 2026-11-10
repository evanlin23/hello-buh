// Finding and reading natural ground for a set (from the bot's loaded chunks, so call these before building).

// what counts as the ground: natural terrain blocks only. Anything else in a column (trees, plants, bee nests,
// mushrooms, snow layers, a build) is passed over: a bee nest in a canopy once read as the ground 20 blocks up and a
// watchtower stood on air over the hill (demo, 2026-11-10)
const GROUND = /^(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|mud|muddy_mangrove_roots|clay|sand|red_sand|gravel|suspicious_sand|suspicious_gravel|stone|andesite|diorite|granite|tuff|deepslate|calcite|dripstone_block|terracotta|[a-z_]+_terracotta|sandstone|red_sandstone|snow_block|powder_snow|ice|packed_ice|blue_ice|water|lava|moss_block|pale_moss_block|bedrock|coal_ore|iron_ore|copper_ore|gold_ore|emerald_ore|lapis_ore|redstone_ore|diamond_ore|obsidian|magma_block|farmland|dirt_path)$/

// the ground at (x, z): { y, name, tree } of the top natural ground block (tree: a trunk or leaves stood over it);
// null if not loaded
function column (ctx, x, z) {
  const { bot, Vec3 } = ctx
  let tree = false, snow = false
  for (let y = 220; y > -60; y--) {
    const b = bot.blockAt(new Vec3(x, y, z))
    if (!b) return null
    if (/_leaves$|_log$/.test(b.name)) tree = true
    if (b.name === 'snow') snow = true
    if (!GROUND.test(b.name)) continue
    return { y, name: b.name, tree, snow: snow || /snow|ice/.test(b.name) }
  }
  return null
}

// the ground height over a box { x0, x1, z0, z1 } (sampled every 2 blocks): a low-ish percentile (default 0.35), so a
// piece on a slope sits a little into the hill (graded away) rather than up on a tall pad over the low side
function ground (ctx, box, q = 0.35) {
  const ys = []
  for (let x = box.x0; x <= box.x1; x += 2) for (let z = box.z0; z <= box.z1; z += 2) { const c = column(ctx, x, z); if (c) ys.push(c.y) }
  if (!ys.length) return null
  ys.sort((a, b) => a - b)
  return ys[Math.floor((ys.length - 1) * q)]
}

// The best spot for a w x d set within `reach` of `near` (default: the bot): dry, nearly level ground (height range
// <= maxRange), no trees on the footprint itself, and, around it (a ring out to `ring` blocks), some trees and some
// relief for the background: a set in the middle of a featureless plain looks as fake as a superflat.
// Returns { x, z, y, range, trees, relief, score } (x, z: the footprint's centre) or null.
async function findSite (ctx, { w = 32, d = 32, reach = 96, stride = 8, maxRange = 4, ring = 40, near = null, avoid = [], maxTrees = 0.15, minRange = 0 } = {}) {
  const p = near || ctx.bot.entity.position
  const ox = Math.round(p.x / stride) * stride, oz = Math.round(p.z / stride) * stride
  const cache = new Map()
  const col = (x, z) => { const k = x * 100000 + z; if (!cache.has(k)) cache.set(k, column(ctx, x, z)); return cache.get(k) }
  let best = null
  const why = { unloaded: 0, wet: 0, steep: 0, trees: 0, ok: 0 }
  for (let cx = ox - reach; cx <= ox + reach; cx += stride) {
    await new Promise(resolve => setImmediate(resolve))
    for (let cz = oz - reach; cz <= oz + reach; cz += stride) {
      if (avoid.some(a => Math.abs(a.x - cx) < (a.w || 0) / 2 + w / 2 && Math.abs(a.z - cz) < (a.d || 0) / 2 + d / 2)) continue
      let lo = Infinity, hi = -Infinity, ok = true, inTrees = 0, samples = 0
      const ys = []
      for (let x = cx - w / 2; x <= cx + w / 2 && ok; x += 3) for (let z = cz - d / 2; z <= cz + d / 2 && ok; z += 3) {
        const c = col(Math.round(x), Math.round(z))
        if (!c) { why.unloaded++; ok = false; break }
        if (c.y < 62 || /water|ice|lava|snow|sand$/.test(c.name)) { why.wet++; ok = false; break }
        samples++; if (c.tree) inTrees++
        lo = Math.min(lo, c.y); hi = Math.max(hi, c.y); ys.push(c.y)
      }
      // a tree or two on the footprint is fine (place() clears logs and leaves there); a wood is not
      if (!ok) continue
      if (hi - lo > maxRange) { why.steep++; continue }
      if (hi - lo < minRange) continue   // asked for a slope (to show a fit)
      if (inTrees > samples * maxTrees) { why.trees++; continue }
      why.ok++
      // the surroundings: trees and relief in a ring (background depth), water a plus too (a lake in the distance)
      let trees = 0, relief = 0, water = 0, n = 0, snow = 0
      for (let a = 0; a < 24; a++) for (const r of [w / 2 + 10, w / 2 + 22, ring]) {
        const x = Math.round(cx + Math.cos(a / 24 * 2 * Math.PI) * r), z = Math.round(cz + Math.sin(a / 24 * 2 * Math.PI) * r)
        const c = col(x, z); if (!c) continue
        n++; if (c.tree) trees++; if (/water/.test(c.name)) water++; if (/snow|ice/.test(c.name)) snow++
        relief += Math.min(12, Math.abs(c.y - lo))
      }
      if (!n) continue
      ys.sort((a, b) => a - b)
      const score = (hi - lo) * 3 + inTrees / samples * 20 - Math.min(trees, n * 0.4) / n * 30 - Math.min(relief / n, 6) * 2 - Math.min(water, 6) + snow * 2 + Math.hypot(cx - p.x, cz - p.z) / 40
      if (!best || score < best.score) best = { x: cx, z: cz, y: ys[Math.floor(ys.length / 2)], range: hi - lo, trees, relief: +(relief / n).toFixed(1), score: +score.toFixed(2) }
    }
  }
  ctx.log('site:', JSON.stringify(best), JSON.stringify(why))
  return best
}

// The best place for a whole layout: plan = [{ name or w/d, dx, dz }] (footprints relative to the layout's centre;
// sizes from sets.build(name).bounds() when a name is given). Every candidate centre within `reach` (on a `stride`
// grid) is scored by what building there would cost: the height range under each footprint (squared: a 6-block
// slope is much worse than two 3s), water or sand under any of it (ruled out), trees on footprints, and the height
// differences between neighbouring pieces (a village spread over a hillside reads as terraces). Lowest cost wins.
// Returns { x, z, cost, worst } or null (nothing loaded and dry).
async function planSite (ctx, plan, { reach = 128, stride = 8, near = null, sizes = {} } = {}) {
  const p = near || ctx.bot.entity.position
  const cache = new Map()
  const col = (x, z) => { const k = x * 100000 + z; if (!cache.has(k)) cache.set(k, column(ctx, x, z)); return cache.get(k) }
  const ox = Math.round(p.x / stride) * stride, oz = Math.round(p.z / stride) * stride
  let best = null
  for (let cx = ox - reach; cx <= ox + reach; cx += stride) {
    await new Promise(resolve => setImmediate(resolve))
    for (let cz = oz - reach; cz <= oz + reach; cz += stride) {
      let cost = 0, worst = 0, ok = true
      const meds = []
      for (const it of plan) {
        const [w, d] = sizes[it.name] || [it.w, it.d]
        const ys = []
        let trees = 0, wet = 0
        for (let x = cx + it.dx - w / 2; x <= cx + it.dx + w / 2 && ok; x += 3) for (let z = cz + it.dz - d / 2; z <= cz + it.dz + d / 2; z += 3) {
          const c = col(Math.round(x), Math.round(z))
          if (!c) { ok = false; break }
          if (c.y < 62 || /water|ice|lava|sand$/.test(c.name)) { wet++; continue }   // costly, not ruled out: a pond can be bridged
          ys.push(c.y); if (c.tree) trees++; if (c.snow) trees += 4
        }
        if (!ok) break
        if (ys.length < 3) { ok = false; break }
        cost += wet * 25
        ys.sort((a, b) => a - b)
        const range = ys[ys.length - 1] - ys[0]
        worst = Math.max(worst, range)
        cost += range * range + trees * 2
        meds.push(ys[Math.floor(ys.length / 2)])
      }
      if (!ok) continue
      for (let i = 1; i < meds.length; i++) cost += Math.abs(meds[i] - meds[0]) * 1.5
      cost += Math.hypot(cx - p.x, cz - p.z) / 30
      if (!best || cost < best.cost) best = { x: cx, z: cz, cost: +cost.toFixed(1), worst }
    }
  }
  ctx.log('planSite:', JSON.stringify(best))
  return best
}

// A shore for a dock: a dry column at sea level or a little above with open water straight out from it for at least
// `len` blocks (and land behind it). Returns { x, z, y, facing } (facing: the way out over the water) or null.
async function findShore (ctx, { reach = 96, len = 22, near = null, stride = 4 } = {}) {
  const p = near || ctx.bot.entity.position
  const DIRS = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] }
  let best = null
  for (let x = Math.round(p.x) - reach; x <= Math.round(p.x) + reach; x += stride) {
    await new Promise(resolve => setImmediate(resolve))
    for (let z = Math.round(p.z) - reach; z <= Math.round(p.z) + reach; z += stride) {
      const c = column(ctx, x, z)
      if (!c || /water|ice/.test(c.name) || c.y > 64 || c.y < 62) continue
      for (const [f, [dx, dz]] of Object.entries(DIRS)) {
        let ok = true
        for (let k = 2; k <= len && ok; k += 2) { const w = column(ctx, x + dx * k, z + dz * k); ok = !!w && w.name === 'water'; for (const s of [-6, 6]) { const q = column(ctx, x + dx * k - dz * s, z + dz * k + dx * s); if (!q || q.name !== 'water') ok = ok && k < 6 } }
        const back = column(ctx, x - dx * 6, z - dz * 6)
        if (!ok || !back || back.name === 'water') continue
        const d = Math.hypot(x - p.x, z - p.z)
        if (!best || d < best.d) best = { x, z, y: c.y, facing: f, d }
      }
    }
  }
  ctx.log('shore:', JSON.stringify(best))
  return best
}

// keep the chunks under a set loaded (/place refuses unloaded chunks: "That position is not loaded"),
// in blocks of at most 256 chunks
async function forceload (ctx, x0, z0, x1, z1) {
  for (let a = x0; a <= x1; a += 256) for (let b = z0; b <= z1; b += 256) await ctx.cmd(`/forceload add ${a} ${b} ${Math.min(x1, a + 255)} ${Math.min(z1, b + 255)}`)
}

// Go and find dry land in `biome`: from each start point in turn (default: far out in four directions) locate the
// biome, and keep the first where at least `land` of the columns within `r` are dry ground above sea level.
// For a fresh stretch of the world when the land near spawn is used up (the server's world is kept between runs
// only if run.sh isn't used). Returns the bot's position there, or null.
async function freshLand (ctx, biome = 'minecraft:plains', { starts = [[2400, 0], [0, 2400], [-2400, 0], [0, -2400], [2400, 2400], [-2400, -2400]], r = 80, land = 0.8 } = {}) {
  const { bot } = ctx
  await ctx.cmd('/gamerule send_command_feedback true')   // /locate answers in chat
  try { return await seek() } finally { await ctx.cmd('/gamerule send_command_feedback false') }
  async function seek () {
  for (const [sx, sz] of starts) {
    // new land generates slowly: the server stalls and tick waits time out, so wait on the wall clock too
    const wait = async (ms) => { await ctx.sleep(ms); try { await bot.waitForTicks(5) } catch (e) {} }
    await ctx.cmd(`/tp @s ${sx} 220 ${sz}`).catch(() => {}); await wait(4000)
    let loc = null
    try { loc = await ctx.locateBiome(biome) } catch (e) { ctx.log('freshLand:', e.message); await wait(8000); loc = await ctx.locateBiome(biome).catch(() => null) }
    if (!loc) continue
    await wait(6000)
    try { await bot.waitForChunksToLoad() } catch (e) {}
    let dry = 0, n = 0
    for (let dx = -r; dx <= r; dx += 10) for (let dz = -r; dz <= r; dz += 10) {
      const c = column(ctx, loc[0] + dx, loc[1] + dz); if (!c) continue
      n++; if (c.y >= 63 && !/water|ice/.test(c.name)) dry++
    }
    ctx.log(`fresh land? ${loc} dry ${dry}/${n}`)
    if (n > 20 && dry / n >= land) return { x: loc[0], z: loc[1] }
  }
  return null
  }
}

module.exports = { findShore, planSite, GROUND, column, ground, findSite, forceload, freshLand }
