// Finding and reading natural ground for a set (from the bot's loaded chunks, so call these before building).
const SKIP = /^(air|cave_air|void_air|short_grass|tall_grass|fern|large_fern|snow|dandelion|poppy|bush|vine|sugar_cane|pumpkin|melon|sweet_berry_bush|lily_pad|leaf_litter|wildflowers|firefly_bush|short_dry_grass|tall_dry_grass|dead_bush|seagrass|tall_seagrass|kelp|kelp_plant)$|_leaves$|_log$|flower|tulip|orchid|allium|azure|oxeye|cornflower|lily_of|mushroom|_sapling$/

// the ground at (x, z): { y, name } of the top solid block, ignoring plants and trees; null if not loaded
function column (ctx, x, z) {
  const { bot, Vec3 } = ctx
  let tree = false
  for (let y = 220; y > -60; y--) {
    const b = bot.blockAt(new Vec3(x, y, z))
    if (!b) return null
    if (/_leaves$|_log$/.test(b.name)) tree = true
    if (SKIP.test(b.name)) continue
    return { y, name: b.name, tree }
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
async function findSite (ctx, { w = 32, d = 32, reach = 96, stride = 8, maxRange = 4, ring = 40, near = null, avoid = [], maxTrees = 0.15 } = {}) {
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

module.exports = { column, ground, findSite, forceload, freshLand }
