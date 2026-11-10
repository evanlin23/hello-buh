// Dressing: the small things that make a set look lived in, put on the real terrain by the server itself
// (`execute positioned over motion_blocking_no_leaves`: the ground height is read where the block goes, so it is
// right on slopes and after other builds, with no stale client copy of the world).
//   const { dress } = require('../lib/sets')
//   await dress.flowers(ctx, { x, z, r: 14, n: 80 })
//   await dress.path(ctx, [[x0, z0], [x1, z1], [x2, z2]], { w: 3 })
//   await dress.lamp(ctx, x, z)            a lantern on a fence post
//   await dress.tree(ctx, x, z, 'fancy_oak')
//   await dress.rocks(ctx, x, z)           a mossy boulder
//   await dress.clutter(ctx, x, z, 'crates')
//   await dress.sign(ctx, { x, y, z }, ['HELLO', 'WORLD'], { rotation: 8 })
//   await dress.banner(ctx, { x, y, z }, 'red', { wall: 'south' })
//   await dress.frame(ctx, { x, y, z }, 'south', 'clock')
//   await dress.crops(ctx, { x0, z0, x1, z1 }, 'wheat')
//   await dress.fence(ctx, [[x0, z0], [x1, z1], ...])
const { mulberry32 } = require('./voxel')

const FLOWERS = ['poppy', 'dandelion', 'azure_bluet', 'oxeye_daisy', 'cornflower', 'allium', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'lily_of_the_valley']
const GRASS = ['short_grass', 'short_grass', 'short_grass', 'fern', 'tall_grass', 'bush']
const TALL = new Set(['tall_grass', 'large_fern', 'rose_bush', 'peony', 'lilac', 'sunflower'])
const FACING_BYTE = { down: 0, up: 1, north: 2, south: 3, west: 4, east: 5 }

let rng = mulberry32(12345)
const pick = (a) => a[Math.floor(rng() * a.length)]
const seed = (n) => { rng = mulberry32(n) }

async function burst (ctx, cmds) {
  let i = 0
  for (const c of cmds) { ctx.bot.chat(c); if (++i % 40 === 0) await ctx.bot.waitForTicks(1) }
  await ctx.bot.waitForTicks(4)
}
// a command at the ground of column (x, z): ~ is the first free cell above the ground, ~-1 the ground
const over = (x, z, cond, cmd) => `/execute positioned ${x} 0 ${z} positioned over motion_blocking_no_leaves ${cond ? cond + ' ' : ''}run ${cmd}`
const plantCmd = (x, z, plant) => TALL.has(plant)
  ? over(x, z, 'if block ~ ~-1 ~ grass_block if block ~ ~1 ~ air', `fill ~ ~ ~ ~ ~ ~ ${plant}[half=lower] replace #minecraft:replaceable`)
  : over(x, z, 'if block ~ ~-1 ~ grass_block', `setblock ~ ~ ~ ${plant}`)
const tallTop = (x, z, plant) => TALL.has(plant) ? [over(x, z, `if block ~ ~-1 ~ ${plant}`, `setblock ~ ~ ~ ${plant}[half=upper]`)] : []
// a disc of random columns
function disc (x, z, r, n) {
  const out = []
  for (let i = 0; i < n; i++) { const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r; out.push([Math.round(x + Math.cos(a) * d), Math.round(z + Math.sin(a) * d)]) }
  return out
}

// flowers on grass in a disc (patchy: kinds come in small clumps, as they grow)
async function flowers (ctx, { x, z, r = 10, n = 40, kinds = FLOWERS, clump = 3 } = {}) {
  const cmds = []
  let k = pick(kinds)
  disc(x, z, r, n).forEach(([a, b], i) => { if (i % clump === 0) k = pick(kinds); cmds.push(plantCmd(a, b, k)) })
  await burst(ctx, cmds)
}

// grass, ferns, bushes and the odd tall plant
async function grass (ctx, { x, z, r = 12, n = 60, kinds = GRASS, tall = 0.15 } = {}) {
  const cmds = [], tops = []
  for (const [a, b] of disc(x, z, r, n)) {
    const p = rng() < tall ? pick(['tall_grass', 'large_fern', 'tall_grass']) : pick(kinds)
    cmds.push(plantCmd(a, b, p)); tops.push(...tallTop(a, b, p))
  }
  await burst(ctx, [...cmds, ...tops])
}

// a worn path along a polyline of [x, z] points: dirt path in the middle, coarse dirt and gravel at the frayed edges
async function path (ctx, pts, { w = 3, blocks = ['dirt_path', 'dirt_path', 'dirt_path', 'coarse_dirt'], edge = ['coarse_dirt', 'gravel', 'dirt_path', 'grass_block'] } = {}) {
  const cells = new Map()
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / (L || 1), nz = (x1 - x0) / (L || 1)
    for (let t = 0; t <= L; t += 0.5) {
      const cx = x0 + (x1 - x0) * t / (L || 1), cz = z0 + (z1 - z0) * t / (L || 1)
      const wob = (rng() - 0.5) * 0.8
      for (let s = -w / 2; s <= w / 2; s += 0.5) {
        const px = Math.round(cx + nx * (s + wob)), pz = Math.round(cz + nz * (s + wob))
        const isEdge = Math.abs(s) > w / 2 - 0.6
        const key = `${px},${pz}`
        if (!cells.has(key) || !isEdge) cells.set(key, isEdge ? pick(edge) : pick(blocks))
      }
    }
  }
  const cmds = []
  for (const [k, b] of cells) {
    const [px, pz] = k.split(',').map(Number)
    if (b === 'grass_block') continue
    cmds.push(over(px, pz, 'if block ~ ~-1 ~ #minecraft:dirt', `setblock ~ ~-1 ~ ${b}`))
    cmds.push(over(px, pz, 'unless block ~ ~ ~ air if block ~ ~ ~ #minecraft:replaceable', 'setblock ~ ~ ~ air'))
  }
  await burst(ctx, cmds)
}

// a lamp post: a fence post h high with a lantern on top (style 'hang': an arm with a hanging lantern)
async function lamp (ctx, x, z, { h = 3, fence = 'spruce_fence', lantern = 'lantern', style = 'post' } = {}) {
  const cmds = [over(x, z, null, `fill ~ ~ ~ ~ ~${h - 1} ~ ${fence}`)]
  if (style === 'hang') cmds.push(over(x, z, null, `setblock ~ ~${h} ~ ${fence}`), over(x, z, null, `setblock ~1 ~${h} ~ ${fence}`), over(x, z, null, `setblock ~1 ~${h - 1} ~ ${lantern}[hanging=true]`))
  else cmds.push(over(x, z, null, `setblock ~ ~${h} ~ ${lantern}`))
  await burst(ctx, cmds)
}

// a vanilla tree (or any configured feature): oak, birch, spruce, fancy_oak, dark_oak, cherry, azalea_tree,
// pine, mega_spruce, jungle_bush, ... (`/place feature minecraft:<kind>`)
async function tree (ctx, x, z, kind = 'oak') {
  await burst(ctx, [over(x, z, 'if block ~ ~-1 ~ #minecraft:dirt', `place feature minecraft:${kind} ~ ~ ~`)])
}

// a few trees scattered in a ring (a treeline for the distance, or a copse)
async function grove (ctx, { x, z, r = 20, n = 6, kinds = ['oak', 'fancy_oak', 'birch', 'oak'], minR = 0 } = {}) {
  const cmds = []
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, d = minR + Math.sqrt(rng()) * (r - minR)
    cmds.push(over(Math.round(x + Math.cos(a) * d), Math.round(z + Math.sin(a) * d), 'if block ~ ~-1 ~ #minecraft:dirt', `place feature minecraft:${pick(kinds)} ~ ~ ~`))
  }
  await burst(ctx, cmds)
}

// a boulder: a lump of stone, andesite and mossy cobble, sunk a block into the ground, moss and ferns round it
async function rocks (ctx, x, z, { r = 1.6, kinds = ['stone', 'andesite', 'mossy_cobblestone', 'cobblestone', 'stone', 'tuff'] } = {}) {
  const cmds = []
  const R = Math.ceil(r)
  for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
    const d = Math.hypot(dx, dz) + rng() * 0.6
    if (d > r + 0.4) continue
    const h = Math.max(0, Math.round((r - d) * 1.2))
    cmds.push(over(x + dx, z + dz, null, `fill ~ ~-1 ~ ~ ~${h} ~ ${pick(kinds)}`))
    if (h > 0 && rng() < 0.3) cmds.push(over(x + dx, z + dz, null, 'setblock ~ ~ ~ moss_carpet'))
  }
  for (const [a, b] of disc(x, z, r + 2, 5)) cmds.push(plantCmd(a, b, pick(['fern', 'short_grass', 'bush'])))
  await burst(ctx, cmds)
}

// lived-in clutter on the ground at (x, z): 'crates' (barrels and hay), 'logs' (a woodpile), 'pots' (flower pots
// and a composter), 'cart' (a minecart with a chest), 'well' (a cauldron and buckets of water), 'market' (pumpkins,
// melons, hay)
async function clutter (ctx, x, z, kind = 'crates') {
  const S = {
    crates: [[0, 0, 'barrel[facing=up]'], [1, 0, 'barrel[facing=north]'], [0, 1, 'hay_block'], [0, 0, 'barrel[facing=up]', 1]],
    logs: [[0, 0, 'oak_log[axis=x]'], [1, 0, 'oak_log[axis=x]'], [0, 1, 'oak_log[axis=x]'], [1, 1, 'oak_log[axis=x]'], [0, 0, 'oak_log[axis=x]', 1], [0, 1, 'oak_log[axis=x]', 1]],
    pots: [[0, 0, 'composter[level=6]'], [1, 0, 'potted_red_tulip'], [0, 1, 'potted_fern'], [1, 1, 'flower_pot']],
    well: [[0, 0, 'water_cauldron[level=3]'], [1, 0, 'barrel[facing=up]']],
    market: [[0, 0, 'pumpkin'], [1, 0, 'melon'], [0, 1, 'hay_block'], [1, 1, 'carved_pumpkin[facing=south]'], [0, 0, 'pumpkin', 1]]
  }[kind] || []
  const cmds = S.map(([dx, dz, b, up]) => over(x + dx, z + dz, null, `setblock ~ ~${up || 0} ~ ${b}`))
  if (kind === 'cart') cmds.push(over(x, z, null, 'summon chest_minecart ~0.5 ~ ~0.5'))
  await burst(ctx, cmds)
}

// a sign at an exact spot: standing (rotation 0-15, 0 = facing south) or on a wall (wall: the way it faces)
async function sign (ctx, { x, y, z }, lines, { wood = 'oak', rotation = 0, wall = null, color = 'black', glow = false } = {}) {
  const msgs = [0, 1, 2, 3].map(i => `'${String(lines[i] || '').replace(/'/g, '')}'`).join(',')
  const st = wall ? `${wood}_wall_sign[facing=${wall}]` : `${wood}_sign[rotation=${rotation}]`
  await ctx.cmd(`/setblock ${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)} ${st}{front_text:{color:"${color}",has_glowing_text:${glow ? 1 : 0}b,messages:[${msgs}]}}`)
}

// a banner: standing (rotation) or on a wall (wall: the way it faces); patterns aren't drawn by our renderer yet
async function banner (ctx, { x, y, z }, color = 'red', { rotation = 0, wall = null } = {}) {
  await ctx.cmd(`/setblock ${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)} ${wall ? `${color}_wall_banner[facing=${wall}]` : `${color}_banner[rotation=${rotation}]`}`)
}

// an item frame on the face of a block: (x, y, z) is the frame's own (air) cell, facing the way it looks out
async function frame (ctx, { x, y, z }, facing, item = 'clock', { glow = false } = {}) {
  await ctx.cmd(`/summon ${glow ? 'glow_item_frame' : 'item_frame'} ${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)} {Facing:${FACING_BYTE[facing]}b,Fixed:1b,Invulnerable:1b,Item:{id:"minecraft:${item}",count:1}}`)
}

// a crop field on the ground over a box: farmland rows on the terrain, a water channel every 8, ripe crops
async function crops (ctx, { x0, z0, x1, z1 }, crop = 'wheat', { age = null } = {}) {
  const ripe = age ?? ({ beetroots: 3, nether_wart: 3 }[crop] ?? 7)
  const cmds = []
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if ((x - x0) % 8 === 4) { cmds.push(over(x, z, 'if block ~ ~-1 ~ #minecraft:dirt', 'setblock ~ ~-1 ~ water')); continue }
    cmds.push(over(x, z, 'if block ~ ~-1 ~ #minecraft:dirt', 'setblock ~ ~-1 ~ farmland[moisture=7]'))
    cmds.push(over(x, z, 'if block ~ ~-1 ~ farmland', `setblock ~ ~ ~ ${crop}[age=${ripe}]`))
  }
  await burst(ctx, cmds)
}

// a fence along a polyline on the ground (fences connect when they land next to each other)
async function fence (ctx, pts, { block = 'oak_fence', posts = null } = {}) {
  const cells = new Set()
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0))
    for (let t = 0; t <= n; t++) cells.add(`${Math.round(x0 + (x1 - x0) * t / (n || 1))},${Math.round(z0 + (z1 - z0) * t / (n || 1))}`)
  }
  const cmds = [...cells].map(k => { const [x, z] = k.split(',').map(Number); return over(x, z, null, `setblock ~ ~ ~ ${block}`) })
  await burst(ctx, cmds)
}

// a light at an exact spot: a lantern standing, or hanging under a block
async function light (ctx, { x, y, z }, { hanging = false, kind = 'lantern' } = {}) {
  await ctx.cmd(`/setblock ${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)} ${kind}[hanging=${hanging}]`)
}

// clear the trees (logs and leaves, whole) out of an area, in /fill-sized slabs: a village is built in a clearing
// someone made, not in a wood (plant the trees you want back with grove/tree afterwards)
async function clearTrees (ctx, { x0, z0, x1, z1, y0, y1 }) {
  const cmds = []
  const step = Math.max(1, Math.floor(32768 / ((z1 - z0 + 1) * (y1 - y0 + 1))))
  for (let x = x0; x <= x1; x += step) for (const t of ['#minecraft:logs', '#minecraft:leaves', 'vine', 'bee_nest']) cmds.push(`/fill ${x} ${y0} ${z0} ${Math.min(x1, x + step - 1)} ${y1} ${z1} air replace ${t}`)
  await burst(ctx, cmds)
}


// A rail line laid on the real terrain along a polyline of axis-aligned legs [[x, z], ...] (each corner a curve).
// The bed follows the ground, smoothed so it never climbs more than 1 block per block (ascending rails), on an
// embankment where the ground dips and in a cutting where it rises, 3 wide, ballast under the rail.
//   opts: { y0, y1 (the rail's y at the ends: fixed, e.g. a station or a bridge deck), fixed: {index: y},
//           boost: 8 (a powered rail every 8, a redstone torch beside it: side 'left'|'right' of the direction),
//           smooth: 4 (the ground is averaged over +-4 blocks first), ballast: [...], skip: (x, z) => true to lay nothing }
// Returns { cells: [{x, y, z, dir}] } (y = the rail's block).
// JSON-friendly forms (map.json stamps): fixed_range [[i0, i1, y], ...] pins cells i0..i1; skipz [z0, z1] lays nothing there.
async function rails (ctx, pts, { y0 = null, y1 = null, fixed = {}, fixed_range: fr = [], skipz = null, boost = 0, side = 'left', smooth = 4, ballast = ['gravel', 'gravel', 'gravel', 'coarse_dirt', 'andesite'], skip = null } = {}) {
  fixed = { ...fixed }
  for (const [i0, i1, y] of fr) for (let i = i0; i <= i1; i++) fixed[i] = y
  if (skipz && !skip) skip = (x, z) => z >= Math.min(...skipz) && z <= Math.max(...skipz)
  const cells = []
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1]
    if (ax !== bx && az !== bz) throw new Error(`rails: leg ${i} is not axis-aligned`)
    const n = Math.max(Math.abs(bx - ax), Math.abs(bz - az)), sx = Math.sign(bx - ax), sz = Math.sign(bz - az)
    const dir = sx > 0 ? 'east' : sx < 0 ? 'west' : sz > 0 ? 'south' : 'north'
    for (let k = i === 0 ? 0 : 1; k <= n; k++) cells.push({ x: ax + sx * k, z: az + sz * k, dir })
  }
  if (ctx.forceload) {
    const xs = cells.map(c => c.x), zs = cells.map(c => c.z)
    await ctx.forceload({ x0: Math.min(...xs) - 2, z0: Math.min(...zs) - 2, x1: Math.max(...xs) + 2, z1: Math.max(...zs) + 2 }, 180000)
  }
  const g = cells.map(c => { const b = ctx.surface(c.x, c.z); return b ? b.position.y + (/water|lava/.test(b.name) ? 0 : 1) : null })
  for (let i = 0; i < g.length; i++) if (g[i] === null) g[i] = g[i - 1] ?? 64
  // smoothed ground -> the rail's y, clamped to 1 per block from both fixed ends and every fixed point
  let h = g.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - smooth); j <= Math.min(g.length - 1, i + smooth); j++) { s += g[j]; n++ } return Math.round(s / n) })
  const fix = { ...fixed }; if (y0 !== null) fix[0] = y0; if (y1 !== null) fix[cells.length - 1] = y1
  for (const [i, y] of Object.entries(fix)) h[+i] = y
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < h.length; i++) if (!((i) in fix)) h[i] = Math.max(h[i - 1] - 1, Math.min(h[i - 1] + 1, h[i]))
    for (let i = h.length - 2; i >= 0; i--) if (!((i) in fix)) h[i] = Math.max(h[i + 1] - 1, Math.min(h[i + 1] + 1, h[i]))
  }
  // a corner and its neighbours stay level (a curve can't climb)
  for (let i = 1; i + 1 < cells.length; i++) if (cells[i + 1].dir !== cells[i].dir) { h[i + 1] = h[i]; h[i - 1] = h[i] }
  const cmds = []
  const perp = (d) => (d === 'north' || d === 'south') ? [1, 0] : [0, 1]
  const OPPD = { north: 'south', south: 'north', east: 'west', west: 'east' }
  const RIGHT = { north: 'east', east: 'south', south: 'west', west: 'north' }
  const STEP = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i], y = h[i], [px, pz] = perp(c.dir)
    c.y = y
    if (skip && skip(c.x, c.z)) continue
    const ground = g[i] - 1
    for (const o of [-1, 0, 1]) {
      const x = c.x + px * o, z = c.z + pz * o
      if (ground < y - 2) cmds.push(`/fill ${x} ${ground + 1} ${z} ${x} ${y - 2} ${z} dirt`)
      cmds.push(`/setblock ${x} ${y - 1} ${z} ${o === 0 ? pick(ballast) : 'grass_block'}`)
      cmds.push(`/fill ${x} ${y} ${z} ${x} ${y + (o === 0 ? 10 : 8)} ${z} air`)   // a cutting open to the sky (a 4-high one left rock overhangs the walker hit)
    }
    // the shape: a curve at a corner, ascending where the next/previous block is higher, else straight
    const next = cells[i + 1], prev = cells[i - 1]
    let shape
    if (next && next.dir !== c.dir) {
      const a = OPPD[c.dir], b = next.dir           // comes in from `a`, leaves toward `b`
      const ns = [a, b].find(d => d === 'north' || d === 'south'), ew = [a, b].find(d => d === 'east' || d === 'west')
      shape = `${ns}_${ew}`
    } else if (next && h[i + 1] > y) shape = `ascending_${c.dir}`
    else if (prev && h[i - 1] > y) shape = `ascending_${OPPD[c.dir]}`
    else shape = (c.dir === 'north' || c.dir === 'south') ? 'north_south' : 'east_west'
    const boosted = boost && i % boost === Math.floor(boost / 2)
    if (boosted && !/^(north|south)_(east|west)$/.test(shape)) {
      cmds.push(`/setblock ${c.x} ${y} ${c.z} powered_rail[shape=${shape},powered=true]`)
      const sd = side === 'right' ? RIGHT[c.dir] : RIGHT[OPPD[c.dir]], [tx, tz] = STEP[sd]
      cmds.push(`/setblock ${c.x + tx} ${y} ${c.z + tz} redstone_torch[lit=true]`)
      c.boost = { torch: [c.x + tx, y, c.z + tz] }
    } else cmds.push(`/setblock ${c.x} ${y} ${c.z} rail[shape=${shape}]`)
  }
  await burst(ctx, cmds)
  return { cells }
}

module.exports = { rails, clearTrees, flowers, grass, path, lamp, tree, grove, rocks, clutter, sign, banner, frame, crops, fence, light, seed, burst, over, FLOWERS }
