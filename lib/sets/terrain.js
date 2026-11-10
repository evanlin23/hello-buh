// Fitting a set piece to the land the way a builder would (owner/lead, 2026-11-10: the stepped grass rings round
// the first version "read as man-made pyramids").
//   - the piece sinks a little into a slope (place() picks a low percentile of the ground under it)
//   - uphill, the hill is cut back and held by a retaining wall of weathered stone where the cut is 3+ high, and
//     above the wall the ground rises back to the natural slope over a few blocks
//   - downhill, a stone foundation shows under the building, a retaining wall holds the lot where the drop is 3+,
//     and small drops become an earth bank
//   - every edge is irregular (value noise on the blend distance), and the reworked ground is mixed: grass, coarse
//     dirt, the odd gravel and rooted dirt, a few stones poking out, plants on top
// No concentric 1-block steps: the blend follows the natural height, not the distance to the box.
//
// planFit(H, box, y, opts) is pure (H(x, z) -> natural ground height or null), so the same plan runs on the server
// (fitGround) and in scripts/set_preview.js over a recording's terrain.

// a smooth value noise in 0..1 (scale in blocks), deterministic per seed
function noise2 (x, z, scale = 6, seed = 1) {
  const h = (i, j) => { let n = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296 }
  const fx = x / scale, fz = z / scale, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j
  const s = (t) => t * t * (3 - 2 * t)
  const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1)
  return a + (b - a) * s(u) + (c - a) * s(v) + (a - b - c + d) * s(u) * s(v)
}
const hash01 = (x, z, k = 0) => { let n = (x * 73856093) ^ (z * 19349663) ^ (k * 83492791); n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296 }
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t) }
const pickW = (weights, r) => { const tot = weights.reduce((a, w) => a + w[1], 0); let q = r * tot; for (const [b, w] of weights) { if ((q -= w) < 0) return b } return weights[0][0] }

const WALL = [['stone_bricks', 4], ['mossy_stone_bricks', 3], ['cracked_stone_bricks', 2], ['cobblestone', 2], ['mossy_cobblestone', 2], ['andesite', 1]]
const SURFACE = [['grass_block', 80], ['coarse_dirt', 8], ['rooted_dirt', 3], ['gravel', 2], ['moss_block', 3], ['mossy_cobblestone', 2], ['podzol', 2]]
const PLANTS = [['short_grass', 10], ['fern', 3], ['bush', 2], ['dandelion', 1], ['poppy', 1]]

// the plan: a list of fills { x, z, y0, y1, block } (one column each; 'air' clears)
function planFit (H, box, y, { margin = 7, wallMax = 5, seed = 1, plants = true, entries = [] } = {}) {
  let ops = []
  const { x0, x1, z0, z1 } = box
  const M = margin
  const fill = (x, z, a, b, block) => { if (b >= a) ops.push({ x, z, y0: a, y1: b, block }) }
  for (let x = x0 - M - 3; x <= x1 + M + 3; x++) {
    for (let z = z0 - M - 3; z <= z1 + M + 3; z++) {
      const h = H(x, z)
      if (h === null || h === undefined) continue
      const ddx = Math.max(x0 - x, 0, x - x1), ddz = Math.max(z0 - z, 0, z - z1), d = Math.hypot(ddx, ddz)
      const r = hash01(x, z, seed)
      const stone = pickW(WALL, hash01(x, z, seed + 7))
      if (d === 0) {
        // the footprint: the hill cut away above the floor; under it, a stone foundation at the edge, earth inside
        if (h > y) fill(x, z, y + 1, h + 2, 'air')
        if (h < y) {
          const edge = x === x0 || x === x1 || z === z0 || z === z1
          fill(x, z, h + 1, y - 1, edge ? stone : 'dirt')
          ops.push({ x, z, y0: y, y1: y, block: edge ? stone : 'grass_block', soft: true })   // the template overwrites where it builds
        }
        continue
      }
      // outside: how far the reworked ground reaches here (irregular), and the height it blends to
      const reach = M * (0.55 + 0.75 * noise2(x, z, 7, seed))
      if (d > reach + 0.5) continue
      const dh = h - y
      if (dh === 0) continue
      const t = smooth((d - 1) / Math.max(1, reach - 1))
      let T = Math.round(y + dh * t)
      if (dh > 0) {
        // uphill: a retaining wall on the first ring where the cut is 3+, the slope coming back behind it
        const wallH = Math.min(dh, wallMax)
        if (dh >= 3 && d <= 1.6) {
          fill(x, z, y + 1, y + wallH, stone)
          if (wallH < dh) fill(x, z, y + wallH + 1, h + 2, 'air')
          else fill(x, z, y + wallH + 1, h + 2, 'air')
          if (r < 0.25) ops.push({ x, z, y0: y + wallH + 1, y1: y + wallH + 1, block: 'mossy_cobblestone_wall', cap: true })
          continue
        }
        if (dh >= 3) T = Math.max(T, y + wallH)
        if (T >= h) continue
        fill(x, z, T + 1, h + 2, 'air')
        ops.push({ x, z, y0: T, y1: T, block: pickW(SURFACE, r), top: true })
      } else {
        // downhill: a retaining wall on the first ring where the drop is 3+, else an earth bank to the blend height
        const drop = -dh
        if (drop >= 3 && d <= 1.6) {
          fill(x, z, h + 1, y, stone)
          if (r < 0.2) ops.push({ x, z, y0: y + 1, y1: y + 1, block: 'mossy_cobblestone_wall', cap: true })
          continue
        }
        if (drop >= 3) continue   // past the wall the land falls away naturally
        if (T <= h) continue
        fill(x, z, h + 1, T - 1, 'dirt')
        ops.push({ x, z, y0: T, y1: T, block: pickW(SURFACE, r), top: true })
      }
    }
  }
  // steps where a way in crosses a retaining wall or a bank: from the lot's edge, a 3-wide flight of stone-brick
  // stairs down (or up) to the natural ground, with stone cheeks either side; entries: [{ x, z, fx, fz }] with
  // (x, z) the first column outside the box and (fx, fz) the way out
  const FACE = (fx, fz) => fz > 0 ? 'south' : fz < 0 ? 'north' : fx > 0 ? 'east' : 'west'
  for (const e of entries) {
    const out = FACE(e.fx, e.fz), back = FACE(-e.fx, -e.fz)
    const sx = -e.fz, sz = e.fx
    const h0 = H(e.x, e.z)
    if (h0 === null || h0 === undefined || Math.abs(h0 - y) < 2) continue
    const down = h0 < y
    const run = []
    for (let k = 0; k < 14; k++) {
      const cx = e.x + e.fx * k, cz = e.z + e.fz * k, h = H(cx, cz)
      if (h === null || h === undefined) break
      const step = down ? y - (k + 1) : y + (k + 1)
      if (down ? step < h : step > h) break
      run.push({ cx, cz, step })
    }
    const cells = new Set()
    for (const r of run) for (let w = -2; w <= 2; w++) cells.add(`${r.cx + sx * w},${r.cz + sz * w}`)
    ops = ops.filter(o => !cells.has(`${o.x},${o.z}`))
    for (const r of run) {
      for (let w = -2; w <= 2; w++) {
        const x = r.cx + sx * w, z = r.cz + sz * w, h = H(x, z)
        if (h === null || h === undefined) continue
        const stone = pickW(WALL, hash01(x, z, seed + 11))
        if (Math.abs(w) === 2) {   // the cheeks
          const top = down ? r.step + 1 : r.step + 1
          if (top > h) fill(x, z, h + 1, top, stone); else fill(x, z, top + 1, h + 2, 'air')
          if (!down) fill(x, z, Math.min(top, h) - 1, top, stone)
          continue
        }
        if (down) { fill(x, z, h + 1, r.step - 1, stone); ops.push({ x, z, y0: r.step, y1: r.step, block: `stone_brick_stairs[facing=${back}]` }); fill(x, z, r.step + 1, r.step + 4, 'air') } else { ops.push({ x, z, y0: r.step, y1: r.step, block: `stone_brick_stairs[facing=${out}]` }); fill(x, z, r.step + 1, h + 2, 'air') }
      }
    }
  }
  // plants on the reworked grass
  if (plants) {
    for (const o of ops.filter(o => o.top && o.block === 'grass_block')) {
      const q = hash01(o.x, o.z, seed + 3)
      if (q < 0.3) ops.push({ x: o.x, z: o.z, y0: o.y1 + 1, y1: o.y1 + 1, block: pickW(PLANTS, q / 0.3), plant: true })
    }
  }
  return ops
}

module.exports = { planFit, noise2, hash01, WALL, SURFACE }
