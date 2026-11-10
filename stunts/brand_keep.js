// Channel art (brand/): a castle built to docs/building_guide.md (the "Stone keep / castle" palette) on a rocky crag
// rising out of the fog sea, for the banner and the avatar. Not a Short: a few seconds of the set, rendered as stills
// with scripts/cinematic.py (brand/*_scene.json) at any hour and look.
//
// Origin O = (X, 150, Z) over deep ocean; the plateau top is O.y (grass), the castle is centred on O.
// - curtain wall 31 x 27 (x -15..15, z -13..13), 9 high, buttresses, a corbel band (machicolations), merlons
// - four round towers of different heights with overhanging stepped cone roofs and spires
// - a gatehouse on the east wall (two square towers, an arched gate, red banners, lanterns on chains)
// - the keep: a 13 x 11 hall with a stair gable roof (1-block overhang, trimmed) and a tall 7 x 7 tower with a hip roof
// - lit windows (lanterns behind recessed panes), trees and rocks on the plateau, a path from the gate
// - the avatar's two pairs: a Mannequin "Buh" (Steve) and a creeper, east of the castle facing east (shot from the
//   east with the sunset behind them) and west of it facing west (the sunrise or moonrise behind them)
// The sun and moon move in the x-y plane: a backlit shot looks along x.
const Y = 150

// a small seeded RNG (frames and re-records stay identical)
function rng (seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

// scripts/cinematic.py passes each clip's look and fog sea in CINE_CLIP (as stunts/cinematic_keep.js)
const clip = process.env.CINE_CLIP ? JSON.parse(process.env.CINE_CLIP) : {}
const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? merge(a[k], v) : v; return o }
const LOOK = { grade: 'dawn', bloom: 0.5, bloomThreshold: 0.9, vignette: 0.35, grain: 0, dof: false, shadows: { radius: 96, size: 2048, strength: 0.75 }, rays: 0.8, cloudNight: 0.32,
  shade: { ao: 0.7, haze: 0.18, hazeDist: 90, split: 0.35, glow: 0.6 } }
const FOG = { y0: 118, y1: 148, layers: 16, density: 0.985, fade: 5, night: 0.55 }   // (top 2 below the plateau: the crag rises out of it)

const EAST = 150.5, WEST = -150.5      // the pairs' x (from O), each on its own rock, behind the banner cameras (x +-120); the creeper floats 0.24 up (NoAI) so their faces sit level

module.exports = {
  name: 'brand_keep',
  biome: 'minecraft:deep_ocean',
  time: 12000,
  renderDistance: 12, recordRadius: 176,
  botTimeout: 600,
  fogSea: clip.fogSea || FOG,
  look: merge(LOOK, clip.look),
  cast: { self: 'steve', Buh: 'steve' },
  idleLife: false,
  shots: {},
  edit: {},
  pairs: { east: EAST, west: WEST },

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const p = bot.entity.position.floored()
    const X = p.x, Z = p.z
    Object.assign(this, { X, Z })
    const A = (dx, dy, dz) => `${X + dx} ${Y + dy} ${Z + dz}`
    const R = rng(7)
    let n = 0
    const q = async (s) => { bot.chat(s); if (++n % 25 === 0) await bot.waitForTicks(1) }
    const fill = (a, b, c, d, e, f, blk, extra = '') => q(`/fill ${A(a, b, c)} ${A(d, e, f)} ${blk}${extra ? ' ' + extra : ''}`)
    const set = (a, b, c, blk) => q(`/setblock ${A(a, b, c)} ${blk}`)
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/difficulty normal')
    await ctx.cmd('/tick freeze')

    // ---- the crag: an elongated plateau (x -40..40, z -26..26), cliffs of stone/andesite/tuff tapering into the fog
    const RX = 42, RZ = 27
    for (let dx = -RX; dx <= RX; dx++) {
      const wob = 1 + 0.1 * Math.sin(dx * 0.37) + 0.06 * Math.sin(dx * 1.3 + 2)
      const hz = Math.floor(RZ * Math.sqrt(Math.max(0, 1 - (dx / RX) ** 2)) * wob)
      for (let dz = -hz; dz <= hz; dz++) {
        const r = Math.hypot(dx / RX, dz / RZ)
        const depth = Math.max(4, Math.round(6 + 38 * (1 - r) + 4 * Math.sin(dx * 0.5 + dz * 0.7)))
        const band = Math.sin(dx * 0.21 + dz * 0.33) + 0.6 * Math.sin(dx * 0.7 - dz * 0.4)
        const rock = band > 0.7 ? 'andesite' : band < -0.8 ? 'tuff' : 'stone'
        await fill(dx, -depth, dz, dx, -3, dz, rock)
        await fill(dx, -2, dz, dx, -1, dz, r > 0.93 ? rock : 'dirt')
        const top = r > 0.95 ? rock : (Math.sin(dx * 0.9) * Math.sin(dz * 1.1) > 0.75 ? 'coarse_dirt' : (Math.sin(dx * 0.5 + 1) * Math.cos(dz * 0.6) > 0.8 ? 'podzol' : 'grass_block'))
        await set(dx, 0, dz, top)
      }
    }
    await bot.waitForTicks(10)

    // texture: clusters of variants scattered into a box's surface (rule 10), darker low
    const weather = async (x0, y0, z0, x1, y1, z1, count) => {
      for (let k = 0; k < count; k++) {
        const x = Math.round(x0 + R() * (x1 - x0)), z = Math.round(z0 + R() * (z1 - z0))
        const low = R() < 0.6
        const y = Math.round(low ? y0 + R() * Math.min(4, y1 - y0) : y0 + R() * (y1 - y0))
        const v = low ? (R() < 0.55 ? 'mossy_stone_bricks' : 'cracked_stone_bricks') : (R() < 0.5 ? 'cracked_stone_bricks' : 'andesite')
        const s = 1 + Math.floor(R() * 2)
        await fill(x - s, y - 1, z - s, x + s, y, z + s, v, 'replace stone_bricks')
      }
    }

    // ---- curtain wall: 2 thick, 9 high, plinth of cobbled deepslate, corbels, merlons
    const W0 = -15, W1 = 15, D0 = -13, D1 = 13, WH = 9
    await fill(W0 - 1, 0, D0 - 1, W1 + 1, 1, D1 + 1, 'cobbled_deepslate')
    await fill(W0 + 1, 0, D0 + 1, W1 - 1, 1, D1 - 1, 'air')
    await fill(W0 + 1, 0, D0 + 1, W1 - 1, 0, D1 - 1, 'grass_block')
    await fill(W0, 2, D0, W1, WH, D1, 'stone_bricks')
    await fill(W0 + 2, 1, D0 + 2, W1 - 2, WH + 3, D1 - 2, 'air')
    await fill(W0 + 2, 0, D0 + 2, W1 - 2, 0, D1 - 2, 'grass_block')
    await weather(W0, 2, D0, W1, WH, D1, 70)
    // corbel band (upside-down stairs one block proud, rule 5) and merlons on the outer edge
    await fill(W0 - 1, WH, D0 - 1, W1 + 1, WH, D0 - 1, 'stone_brick_stairs[facing=south,half=top]')
    await fill(W0 - 1, WH, D1 + 1, W1 + 1, WH, D1 + 1, 'stone_brick_stairs[facing=north,half=top]')
    await fill(W0 - 1, WH, D0, W0 - 1, WH, D1, 'stone_brick_stairs[facing=east,half=top]')
    await fill(W1 + 1, WH, D0, W1 + 1, WH, D1, 'stone_brick_stairs[facing=west,half=top]')
    await fill(W0 - 1, WH + 1, D0 - 1, W1 + 1, WH + 1, D1 + 1, 'stone_bricks')
    await fill(W0 + 1, WH + 1, D0 + 1, W1 - 1, WH + 1, D1 - 1, 'air')
    await fill(W0, WH + 1, D0, W1, WH + 1, D1, 'stone_brick_slab', 'replace air')        // the wall walk
    await fill(W0 + 1, WH + 1, D0 + 1, W1 - 1, WH + 1, D1 - 1, 'air')
    for (let x = W0 - 1; x <= W1 + 1; x += 2) { await set(x, WH + 2, D0 - 1, 'stone_bricks'); await set(x, WH + 2, D1 + 1, 'stone_bricks') }
    for (let z = D0 - 1; z <= D1 + 1; z += 2) { await set(W0 - 1, WH + 2, z, 'stone_bricks'); await set(W1 + 1, WH + 2, z, 'stone_bricks') }
    // buttresses every 6 (1 proud, stepped top)
    for (let x = W0 + 4; x <= W1 - 4; x += 6) for (const [z, f] of [[D0 - 1, 'north'], [D1 + 1, 'south']]) {
      await fill(x, 2, z, x, WH - 3, z, 'polished_andesite'); await set(x, WH - 2, z, `stone_brick_stairs[facing=${f === 'north' ? 'south' : 'north'}]`)
    }
    for (let z = D0 + 4; z <= D1 - 4; z += 6) for (const [x, f] of [[W0 - 1, 'east'], [W1 + 1, 'west']]) {
      if (x === W1 + 1 && Math.abs(z) < 5) continue   // (the gatehouse)
      await fill(x, 2, z, x, WH - 3, z, 'polished_andesite'); await set(x, WH - 2, z, `stone_brick_stairs[facing=${f}]`)
    }

    // ---- round towers: radius 4.5, different heights, stepped cone roofs of deepslate tiles (1 overhang), spires
    const disc = async (cx, cy, cz, r, blk, extra = '') => {
      for (let dz = -Math.floor(r); dz <= Math.floor(r); dz++) {
        const w = Math.floor(Math.sqrt(Math.max(0, r * r - dz * dz)))
        await fill(cx - w, cy, cz + dz, cx + w, cy, cz + dz, blk, extra)
      }
    }
    const tower = async (cx, cz, h, rr) => {
      for (let y = 0; y <= 1; y++) await disc(cx, y, cz, rr + 1, 'cobbled_deepslate')
      for (let y = 2; y <= h; y++) await disc(cx, y, cz, rr, 'stone_bricks')
      await weather(cx - rr, 2, cz - rr, cx + rr, h, cz + rr, 14)
      await disc(cx, h + 1, cz, rr + 1, 'stone_bricks')                          // the parapet ring, 1 proud
      await disc(cx, h, cz, rr + 1, 'stone_brick_slab[type=top]', 'replace air') // corbel under it
      // lit arrow slits on two levels (a lantern behind each opening)
      for (const [yy, a0] of [[Math.round(h * 0.45), 0.4], [Math.round(h * 0.75), 1.2]]) for (let k = 0; k < 4; k++) {
        const a = a0 + k * Math.PI / 2, ox = Math.round(Math.cos(a) * rr), oz = Math.round(Math.sin(a) * rr)
        await fill(cx + ox, yy, cz + oz, cx + ox, yy + 1, cz + oz, 'glass_pane')
        await set(cx + Math.round(Math.cos(a) * (rr - 1)), yy, cz + Math.round(Math.sin(a) * (rr - 1)), 'lantern')
      }
      // the cone: discs shrinking 1 every level from rr + 1.5, with tiles, then a spire
      let r = rr + 1.5, y = h + 2
      while (r >= 0.8) { await disc(cx, y, cz, r, 'deepslate_tiles'); r -= 0.75; y++ }
      await fill(cx, y, cz, cx, y + 2, cz, 'deepslate_tile_wall'); await set(cx, y + 3, cz, 'lightning_rod')
    }
    await tower(W0, D0, 15, 4.5); await tower(W1, D0, 13, 4.5); await tower(W0, D1, 12, 4.5); await tower(W1, D1, 16, 4.5)

    // ---- the gatehouse on the east wall: two 5 x 5 towers flanking a 3-wide arched gate
    for (const gz of [-4, 4]) {
      await fill(W1 - 1, 0, gz - 2, W1 + 3, 1, gz + 2, 'cobbled_deepslate')
      await fill(W1 - 1, 2, gz - 2, W1 + 3, 13, gz + 2, 'stone_bricks')
      await weather(W1 - 1, 2, gz - 2, W1 + 3, 13, gz + 2, 10)
      await fill(W1 + 4, 13, gz - 3, W1 + 4, 13, gz + 3, 'stone_brick_stairs[facing=west,half=top]')
      await fill(W1 - 2, 14, gz - 3, W1 + 4, 14, gz + 3, 'stone_bricks')
      await fill(W1 - 1, 14, gz - 2, W1 + 3, 14, gz + 2, 'stone_brick_slab')
      for (let z = gz - 3; z <= gz + 3; z += 2) await set(W1 + 4, 15, z, 'stone_bricks')
      await fill(W1 + 3, 9, gz, W1 + 3, 10, gz, 'glass_pane'); await set(W1 + 2, 9, gz, 'lantern')
    }
    await fill(W1 - 1, 2, -2, W1 + 3, 11, 2, 'stone_bricks')     // the block over the gate
    await fill(W1 - 1, 1, -1, W1 + 3, 5, 1, 'air')               // the passage
    await fill(W1 - 1, 0, -1, W1 + 3, 0, 1, 'cobblestone')
    await fill(W1 + 3, 6, -1, W1 + 3, 6, 1, 'stone_brick_stairs[facing=east,half=top]')   // the arch
    await set(W1 + 3, 5, -1, 'stone_brick_stairs[facing=south,half=top]'); await set(W1 + 3, 5, 1, 'stone_brick_stairs[facing=north,half=top]')
    await fill(W1 + 3, 2, -1, W1 + 3, 4, 1, 'iron_bars')         // the portcullis, half down
    await fill(W1 + 3, 1, -1, W1 + 3, 1, 1, 'air')
    await set(W1 + 4, 10, -2, 'red_wall_banner[facing=east]'); await set(W1 + 4, 10, 2, 'red_wall_banner[facing=east]')
    for (const gz of [-3, 3]) { await set(W1 + 4, 6, gz, 'iron_chain'); await set(W1 + 4, 5, gz, 'lantern[hanging=true]') }
    await set(W1 + 4, 7, -3, 'stone_brick_wall'); await set(W1 + 4, 7, 3, 'stone_brick_wall')

    // ---- the keep: a 13 x 11 hall (x -9..3, z -8..2) 16 high, buttress pillars, a stair gable roof along x
    const K0 = -9, K1 = 3, KZ0 = -8, KZ1 = 2, KH = 16
    await fill(K0 - 1, 0, KZ0 - 1, K1 + 1, 1, KZ1 + 1, 'cobbled_deepslate')
    await fill(K0, 2, KZ0, K1, KH, KZ1, 'stone_bricks')
    await weather(K0, 2, KZ0, K1, KH, KZ1, 30)
    for (const x of [K0, K0 + 4, K0 + 8, K1]) for (const z of [KZ0 - 1, KZ1 + 1]) await fill(x, 2, z, x, KH - 1, z, 'polished_andesite')
    for (const z of [KZ0, KZ0 + 5, KZ1]) for (const x of [K0 - 1, K1 + 1]) await fill(x, 2, z, x, KH - 1, z, 'polished_andesite')
    await fill(K0 - 1, KH, KZ0 - 1, K1 + 1, KH, KZ1 + 1, 'dark_oak_log[axis=x]')    // the top plate, a beam line
    // tall lit windows centred in each bay, recessed (pane 1 behind the face), sills
    for (const x of [K0 + 2, K0 + 6, K0 + 10]) for (const [z, back, f] of [[KZ0, KZ0 + 1, 'north'], [KZ1, KZ1 - 1, 'south']]) for (const wy of [5, 11]) {
      await fill(x, wy, z, x, wy + 2, z, 'air'); await fill(x, wy, back, x, wy + 2, back, 'glass_pane'); await set(x, wy, back + (f === 'north' ? 1 : -1), 'lantern')
      await set(x, wy - 1, z + (f === 'north' ? -1 : 1), `stone_brick_stairs[facing=${f === 'north' ? 'south' : 'north'},half=top]`)
    }
    for (const [x, back, f] of [[K0, K0 + 1, 'west'], [K1, K1 - 1, 'east']]) for (const wy of [5, 11]) for (const z of [KZ0 + 2, KZ1 - 2]) {
      await fill(x, wy, z, x, wy + 2, z, 'air'); await fill(back, wy, z, back, wy + 2, z, 'glass_pane'); await set(back + (f === 'west' ? 1 : -1), wy, z, 'lantern')
    }
    // gable roof: courses of deepslate tile stairs from the eaves (1 over every wall) to a ridge slab
    const half = (KZ1 - KZ0) / 2 + 1   // 6
    for (let i = 0; i < half; i++) {
      const y = KH + 1 + i
      await fill(K0 - 1, y, KZ0 - 1 + i, K1 + 1, y, KZ0 - 1 + i, 'deepslate_tile_stairs[facing=south]')
      await fill(K0 - 1, y, KZ1 + 1 - i, K1 + 1, y, KZ1 + 1 - i, 'deepslate_tile_stairs[facing=north]')
      await fill(K0, y, KZ0 + i, K0, y, KZ1 - i, 'stone_bricks'); await fill(K1, y, KZ0 + i, K1, y, KZ1 - i, 'stone_bricks')   // gable ends
    }
    await fill(K0 - 1, KH + 1 + half, KZ0 + half - 1, K1 + 1, KH + 1 + half, KZ0 + half - 1, 'deepslate_tile_slab')
    await fill(K0 - 1, KH, KZ0 - 1, K0 - 1, KH, KZ1 + 1, 'deepslate_tile_stairs[facing=east,half=top]')   // soffit at the gables
    await fill(K0 + 0, KH + 3, KZ0 + half - 1, K0, KH + 4, KZ0 + half - 1, 'glass_pane'); await set(K0 + 1, KH + 3, KZ0 + half - 1, 'lantern')
    // the keep tower: 7 x 7 (x 1..7, z -1..5: off-centre, overlapping the hall's east end), 30 high, hip roof, spire
    const T0 = 1, T1 = 7, TZ0 = -1, TZ1 = 5, TH = 30
    await fill(T0 - 1, 0, TZ0 - 1, T1 + 1, 1, TZ1 + 1, 'cobbled_deepslate')
    await fill(T0, 2, TZ0, T1, TH, TZ1, 'stone_bricks')
    await weather(T0, 2, TZ0, T1, TH, TZ1, 22)
    for (const [x, z] of [[T0 - 1, TZ0 - 1], [T1 + 1, TZ0 - 1], [T0 - 1, TZ1 + 1], [T1 + 1, TZ1 + 1]]) await fill(x, 2, z, x, TH - 2, z, 'polished_andesite')
    await fill(T0 - 1, TH - 1, TZ0 - 1, T1 + 1, TH - 1, TZ1 + 1, 'stone_brick_slab[type=top]', 'replace air')
    await fill(T0 - 1, TH, TZ0 - 1, T1 + 1, TH + 1, TZ1 + 1, 'stone_bricks')
    for (let x = T0 - 1; x <= T1 + 1; x += 2) { await set(x, TH + 2, TZ0 - 1, 'stone_bricks'); await set(x, TH + 2, TZ1 + 1, 'stone_bricks') }
    for (let z = TZ0 - 1; z <= TZ1 + 1; z += 2) { await set(T0 - 1, TH + 2, z, 'stone_bricks'); await set(T1 + 1, TH + 2, z, 'stone_bricks') }
    for (const wy of [14, 20, 25]) for (const [x, z, bx, bz] of [[T1, 2, T1 - 1, 2], [T0, 2, T0 + 1, 2], [4, TZ0, 4, TZ0 + 1], [4, TZ1, 4, TZ1 - 1]]) {
      await fill(x, wy, z, x, wy + 1, z, 'air'); await fill(bx, wy, bz, bx, wy + 1, bz, 'glass_pane'); await set((bx + 4) / 2 | 0, wy, (bz + 2) / 2 | 0, 'lantern')
    }
    // hip roof inside the parapet: steep (two courses a step), then the spire
    for (let i = 0; i <= 3; i++) {
      const y = TH + 2 + i * 2, a = T0 + i, b = T1 - i, c = TZ0 + i, d = TZ1 - i
      if (a > b) break
      await fill(a, y, c, b, y + 1, d, 'deepslate_tiles')
      await fill(a, y + 1, c, b, y + 1, c, 'deepslate_tile_stairs[facing=south]'); await fill(a, y + 1, d, b, y + 1, d, 'deepslate_tile_stairs[facing=north]')
      await fill(a, y + 1, c + 1, a, y + 1, d - 1, 'deepslate_tile_stairs[facing=east]'); await fill(b, y + 1, c + 1, b, y + 1, d - 1, 'deepslate_tile_stairs[facing=west]')
    }
    await fill(4, TH + 10, 2, 4, TH + 13, 2, 'deepslate_tile_wall'); await set(4, TH + 14, 2, 'lightning_rod')
    await set(4, TH + 13, 3, 'red_wall_banner[facing=south]')

    // ---- the courtyard and the plateau: a cobble path through the gate east to the pairs' ledge, trees, rocks
    for (let x = W1 + 4; x <= 36; x++) {
      const zc = Math.round(Math.sin(x * 0.35) * 1.2)
      for (let dz = -1; dz <= 1; dz++) await set(x, 0, zc + dz, R() < 0.3 ? 'gravel' : (R() < 0.3 ? 'coarse_dirt' : 'dirt_path'))
    }
    for (const [f, dx, dz] of [['fancy_oak', 22, -14], ['oak', 25, -10], ['fancy_oak', 21, 15], ['birch', 25, 19], ['spruce', -24, -15], ['fancy_oak', -22, 14], ['oak', -27, 9],
      ['spruce', -20, -21], ['oak', 4, 20], ['fancy_oak', -4, -20], ['birch', 10, -21], ['oak', 33, -16], ['fancy_oak', -35, -12], ['oak', 34, 14]]) await ctx.cmd(`/place feature minecraft:${f} ${A(dx, 1, dz)}`)
    for (const [dx, dz] of [[20, -6], [24, 7], [-21, -4], [-19, 6], [30, -21], [-30, 18]]) {
      await fill(dx, 1, dz, dx + 1, 1, dz + 1, 'mossy_cobblestone'); await set(dx, 2, dz, 'andesite'); await set(dx + 1, 1, dz + 2, 'cobblestone')
    }
    for (let k = 0; k < 120; k++) {
      const dx = Math.round(-38 + 76 * R()), dz = Math.round(-22 + 44 * R())
      if (dx > W0 - 6 && dx < W1 + 6 && dz > D0 - 6 && dz < D1 + 6) continue
            await set(dx, 1, dz, ['short_grass', 'short_grass', 'fern', 'poppy', 'dandelion', 'cornflower', 'bush'][Math.floor(R() * 7)] + ' keep')
    }
    await bot.waitForTicks(20)

    // ---- two small rocks off the crag (x +-75), each with a pair on it: far enough out that the castle sits behind them
    const rock = async (cx, r) => {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        const d = Math.hypot(dx, dz) / (r + 0.5); if (d > 1) continue
        const depth = Math.max(2, Math.round((1 - d) * r * 2.2 + 2))
        await fill(cx + dx, -depth, dz, cx + dx, -1, dz, (dx + dz) % 3 ? 'stone' : 'andesite')
        await set(cx + dx, 0, dz, d > 0.85 ? 'stone' : 'grass_block')
      }
    }
    await rock(Math.floor(EAST), 5); await rock(Math.floor(WEST), 5)
    await bot.waitForTicks(10)

    // ---- the pairs: Buh (a Mannequin, Steve's skin) on the left of each frame, the creeper on the right
    const pair = async (x, face, side) => {
      const rot = face === 'east' ? -90 : 90
      await ctx.cmd(`/summon minecraft:mannequin ${X + x} ${Y + 1} ${Z + 0.5 + 0.33 * side} {CustomName:"Buh",Rotation:[${rot - 18}f,0f],immovable:1b}`)
      await ctx.cmd(`/summon creeper ${X + x} ${Y + 1.24} ${Z + 0.5 - 0.33 * side} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Rotation:[${rot + 17}f,0f]}`)
    }
    await pair(EAST, 'east', 1)
    await pair(WEST, 'west', -1)
    await bot.waitForTicks(40)
    return { x: X, y: Y, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    ctx.mark('f1_on')
    // the server only sends entities near the bot: visit each pair (cinematic.py hides the bot itself)
    for (const [x, m] of [[EAST - 8, 'east'], [WEST + 8, 'west']]) {
      await ctx.cmd(`/tp @s ${this.X + x} ${Y + 1} ${this.Z + 6.5}`)
      await bot.waitForTicks(40)
      ctx.mark(m)
      await bot.waitForTicks(40)
    }
    return true
  }
}
