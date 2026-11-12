// The "desire" format (docs/formats.md, r:r2e0a32): one LOCKED high-angle camera on two houses either side of a
// road. A dirt shortcut (dirt_path) is worn across the grass from one front door to the other; each round the "town"
// drops an ever more absurd obstacle on it and the path comes straight back around it. Real blocks, placed by
// commands; no player in frame (the recording bot stands well outside the shot).
//
// A subject module gives the rounds; this file does the set, the path planner and the beats:
//   makeStunt({ name, caption, red, rounds: [ROUND...], ... })
//   ROUND = { id, card: 'TREE 🌳', color, sound: [name, vol, pitch] | [[...], ...], shape: SHAPE,
//             where: c: [x, z] (fixed) | near: [x, z] (the path cell nearest it) | at: 0..1 (along the path) | 'cross',
//             hold: ticks the obstacle sits on the old path before the new one wears in (default 7) }
//   SHAPE(c, dir) -> [[dx, dy, dz, block], ...] around the cell c = [x, z] it is centred on (dy 0 = the ground row,
//   1 = on top of it); dir = the path's direction there ([ux, uz], unit). The last round may be { flood: 'lava' }: the
//   whole lawn floods (obstacles sink) and the path comes back straight across it, door to door.
//
// Layout (cells in set offsets; +x east, +z south; the camera looks north and down): road rows z -1..1, sidewalks z -2
// and 2, house N at x -13..-7 z -16..-11 (door south at x -10), house S at x 7..13 z 11..16 (door north at x 10); the
// lawn the path may use is x -18..18, z -16..16 off the road.

const B = { x0: -18, x1: 18, z0: -16, z1: 16 }          // the lawn the planner may use (and the flood fills)
const ROAD = (x, z) => Math.abs(z) <= 2
const HOUSES = [{ x0: -13, x1: -7, z0: -16, z1: -11, door: [-10, -11], out: [-10, -10] },
  { x0: 7, x1: 13, z0: 11, z1: 16, door: [10, 11], out: [10, 10] }]
const nearDoor = (x, z) => HOUSES.some(h => Math.abs(x - h.out[0]) <= 1 && Math.abs(z - h.out[1]) <= 1)
const inHouse = (x, z) => HOUSES.some(h => x >= h.x0 && x <= h.x1 && z >= h.z0 && z <= h.z1)
const K = (x, z) => `${x},${z}`

// ---------------------------------------------------------------- the planner (pure: lib/hb/test/desire.test.js)
// A* on the 8-connected grid (no corner cutting), obstacles inflated by `clear` cells (never over the two door cells),
// then string-pulled to straight runs (a worn path is a straight line that bends only round what's in its way), then
// rasterised `width` wide on grass. Returns { poly: [[x, z]...], cells: [[x, z]...] in walking order } or null.
function plan (blocked, { from = HOUSES[0].out, to = HOUSES[1].out, clear = 1, width = 1.05, bounds = B, walk = null } = {}) {
  const hard = new Set()
  for (const k of blocked) {
    const [x, z] = k.split(',').map(Number)
    for (let a = -clear; a <= clear; a++) for (let b = -clear; b <= clear; b++) hard.add(K(x + a, z + b))
  }
  for (let x = bounds.x0 - 1; x <= bounds.x1 + 1; x++) for (let z = bounds.z0 - 1; z <= bounds.z1 + 1; z++) if (inHouse(x, z)) hard.add(K(x, z))
  const keep = new Set([K(...from), K(...to)])
  const free = (x, z) => x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1 &&
    (keep.has(K(x, z)) || (!hard.has(K(x, z)) && (!walk || walk(x, z))))
  // A*
  const h = (x, z) => { const dx = Math.abs(x - to[0]), dz = Math.abs(z - to[1]); return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz) }
  const open = [[h(...from), 0, from[0], from[1]]], g = new Map([[K(...from), 0]]), prev = new Map()
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i
    const [, gc, x, z] = open.splice(bi, 1)[0]
    if (gc > g.get(K(x, z))) continue
    if (x === to[0] && z === to[1]) break
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      if (!a && !b) continue
      const nx = x + a, nz = z + b
      if (!free(nx, nz)) continue
      if (a && b && (!free(x + a, z) || !free(x, z + b))) continue
      const ng = gc + (a && b ? Math.SQRT2 : 1)
      if (ng < (g.get(K(nx, nz)) ?? Infinity)) { g.set(K(nx, nz), ng); prev.set(K(nx, nz), [x, z]); open.push([ng + h(nx, nz), ng, nx, nz]) }
    }
  }
  if (!g.has(K(...to))) return null
  const grid = [to]
  while (grid[0][0] !== from[0] || grid[0][1] !== from[1]) grid.unshift(prev.get(K(...grid[0])))
  // string pulling: the farthest node still in sight (the segment sampled every 0.2 cells, with a 0.35 half-width)
  const sees = (p, q) => {
    const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.2)
    for (let i = 0; i <= n; i++) {
      const x = p[0] + (q[0] - p[0]) * i / n, z = p[1] + (q[1] - p[1]) * i / n
      for (const [ox, oz] of [[0, 0], [0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]]) if (!free(Math.round(x + ox), Math.round(z + oz))) return false
    }
    return true
  }
  const poly = [grid[0]]
  let i = 0
  while (i < grid.length - 1) {
    let j = grid.length - 1
    while (j > i + 1 && !sees(grid[i], grid[j])) j--
    poly.push(grid[j]); i = j
  }
  return { poly, cells: raster(poly, width, (x, z) => !ROAD(x, z) && !blocked.has(K(x, z)) && !inHouse(x, z) && x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1) }
}

// cells within `width` of the polyline, ordered by how far along it they are (the order the path wears in)
function raster (poly, width, ok) {
  const out = []
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z) }
  for (let x = Math.floor(x0 - width - 1); x <= x1 + width + 1; x++) {
    for (let z = Math.floor(z0 - width - 1); z <= z1 + width + 1; z++) {
      if (!ok(x, z)) continue
      let best = Infinity, along = 0, acc = 0
      for (let s = 0; s < poly.length - 1; s++) {
        const [ax, az] = poly[s], [bx, bz] = poly[s + 1], L = Math.hypot(bx - ax, bz - az) || 1e-9
        const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L)))
        const d = Math.hypot(ax + u * (bx - ax) - x, az + u * (bz - az) - z)
        if (d < best) { best = d; along = acc + u * L }
        acc += L
      }
      if (best <= width) out.push([x, z, along])
    }
  }
  return out.sort((a, b) => a[2] - b[2]).map(([x, z]) => [x, z])
}

// the path's point at fraction f of its length (on grass), and its direction there
function pointAt (poly, f) {
  const segs = []; let tot = 0
  for (let s = 0; s < poly.length - 1; s++) { const L = Math.hypot(poly[s + 1][0] - poly[s][0], poly[s + 1][1] - poly[s][1]); segs.push(L); tot += L }
  let d = f * tot
  for (let s = 0; s < segs.length; s++) {
    if (d <= segs[s] || s === segs.length - 1) {
      const u = segs[s] ? Math.min(1, d / segs[s]) : 0, [ax, az] = poly[s], [bx, bz] = poly[s + 1]
      return { p: [ax + u * (bx - ax), az + u * (bz - az)], dir: [(bx - ax) / (segs[s] || 1), (bz - az) / (segs[s] || 1)] }
    }
    d -= segs[s]
  }
}

// ---------------------------------------------------------------- shapes (reusable obstacles)
const SHAPES = {
  // a fence across the path, n long, two rows, h high (one row from up high read as a thin line)
  fence: (n = 7, block = 'oak_fence', h = 1) => ([cx, cz], [ux, uz]) => {
    const along = Math.abs(ux) > Math.abs(uz) ? [0, 1] : [1, 0], out = []
    for (let i = -(n >> 1); i <= n >> 1; i++) for (let y = 1; y <= h; y++) for (const o of [0, 1]) out.push([cx + along[0] * i + along[1] * o, y, cz + along[1] * i + along[0] * o, block])
    return out
  },
  // a round blob of `block` (bushes, boulders), r across, h high
  blob: (r, h, blocks) => ([cx, cz]) => {
    const out = []
    for (let a = -Math.ceil(r); a <= Math.ceil(r); a++) {
      for (let b = -Math.ceil(r); b <= Math.ceil(r); b++) {
        const d = Math.hypot(a, b)
        for (let y = 1; y <= h; y++) {
          const rr = r * Math.sqrt(Math.max(0, 1 - ((y - 0.5) / (h + 0.3)) ** 2))   // a dome
          if (d <= rr) out.push([cx + a, y, cz + b, Array.isArray(blocks) ? blocks[(Math.abs(a * 7 + b * 13 + y * 5)) % blocks.length] : blocks])
        }
      }
    }
    return out
  },
  // an oak tree: trunk then a round canopy (the planner keeps the path out from under the leaves)
  tree: (log = 'oak_log', leaves = 'oak_leaves[persistent=true]') => ([cx, cz]) => {
    const out = []
    for (let y = 1; y <= 5; y++) out.push([cx, y, cz, log])
    for (let y = 4; y <= 7; y++) {
      const r = y <= 5 ? 2.4 : y === 6 ? 1.6 : 1
      for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (Math.hypot(a, b) <= r && !(a === 0 && b === 0 && y <= 5)) out.push([cx + a, y, cz + b, leaves])
    }
    return out
  },
  // a pond dug into the lawn (dy 0 replaces the grass; a sand rim)
  pond: (r = 3) => ([cx, cz]) => {
    const out = []
    for (let a = -Math.ceil(r + 1); a <= Math.ceil(r + 1); a++) {
      for (let b = -Math.ceil(r + 1); b <= Math.ceil(r + 1); b++) {
        const d = Math.hypot(a * 0.85, b)
        if (d <= r) { out.push([cx + a, 0, cz + b, 'water']); out.push([cx + a, -1, cz + b, 'water']) } else if (d <= r + 0.9) out.push([cx + a, 0, cz + b, 'sand'])
      }
    }
    return out
  },
  // walls along both sides of the road (rows -3 and 3) from x0 to x1, h high: only the gap past them is left
  roadWalls: (x0 = -17, x1 = 13, h = 3, block = 'stone_bricks') => () => {
    const out = []
    for (const z of [-3, 3]) for (let x = x0; x <= x1; x++) for (let y = 1; y <= h; y++) out.push([x, y, z, block])
    return out
  },
  // a whole little house plonked on the path (w x d, walls h high, a flat roof)
  shed: (w = 7, d = 5, h = 3) => ([cx, cz]) => {
    const out = [], x0 = cx - (w >> 1), z0 = cz - (d >> 1)
    for (let a = 0; a < w; a++) {
      for (let b = 0; b < d; b++) {
        const edge = a === 0 || b === 0 || a === w - 1 || b === d - 1, corner = (a === 0 || a === w - 1) && (b === 0 || b === d - 1)
        for (let y = 1; y <= h; y++) if (edge) out.push([x0 + a, y, z0 + b, corner ? 'spruce_log' : y === 2 && (a + b) % 2 ? 'glass_pane' : 'spruce_planks'])
        out.push([x0 + a, h + 1, z0 + b, (a + b) % 2 ? 'dark_oak_planks' : 'dark_oak_slab[type=bottom]'])
      }
    }
    return out
  }
}

// ---------------------------------------------------------------- the walker (opt-in: S.walker)
// Who keeps wearing the path in? After the lava round the player (56e) runs out of house N's open door and straight
// along the new path over the lava into house S (owner r:r4607fa, docs/noop_audit_2026-11-12.md: "show someone walking
// the lava path, with a hit"). Real player movement: the forward key, the head eased onto the path ahead (lib/motion.js
// stepTurn + walkSteer). Marks: walk_start (he starts running inside), out (through the door), walker (the reveal:
// the cut to a chase camera, S.walker.cam false keeps the top shot), road (on the road), home (on house S's doorstep),
// walk_done.
//   S.walker = { sprint: true, wait: ticks after the path is back, card: 'IT WAS HIM', tail: ticks after home }
const WALK_FROM = [-9.5, -13.5]   // inside house N, out of sight of its open door (2.5 blocks back)
function walkPoints () {
  const [a, b] = HOUSES
  // through house N's doorway, the path's two ends (door to door, straight over the lava), house S's doorway, inside
  // (into house S straight on through the middle of its doorway, not cutting the corner)
  return [[a.door[0] + 0.5, a.door[1] + 0.5], [a.out[0] + 0.5, a.out[1] + 0.5], [b.out[0] + 0.3, b.out[1] + 0.3], [b.door[0] + 0.5, b.door[1] - 0.2], [b.door[0] + 0.5, b.door[1] + 2.5]]
}

// The cameras of the run. walk: rides beside him on his left (north-east of the path, a little above his eye),
// looking a little ahead of him, so he runs across the frame; review r1: from behind and above, the top of 56e's head
// (eyes painted on the top of the frog-green skin, it seems: a Steve-textured test render from the same camera shows
// the back of the head) read as his face turned to the lens, as if he ran backwards. door: from NEAR_Z on, the camera
// stops (lib/movie crane from the walk shot, its motion eased out) a little further on, looking at house S's
// doorstep, so the end shows him reaching the door with the front of the house (review r1: the follow camera rode
// up over the roof and covered him)
const NEAR_Z = 8
const WALK_OFF = [3.5, 3.5, -3.5]
function walkShots (W = {}) {
  const off = W.offset || WALK_OFF, lag = 4, sprint = 0.28
  // where the walk camera is when he crosses NEAR_Z (on the path's diagonal x = z, `lag` ticks back), carried on
  // a little along his line so the crane eases out instead of stopping dead
  const h = NEAR_Z - lag * sprint / Math.SQRT2, carry = 0.8
  const at = [h + off[0] + carry, 2.56 + off[1], h + off[2] + carry]
  const door = [HOUSES[1].door[0] + 0.5, 1.6, HOUSES[1].door[1] + 0.2]
  const dx = door[0] - at[0], dy = door[1] - at[1], dz = door[2] - at[2]
  const yaw = Math.atan2(-dx, -dz) * 180 / Math.PI, pitch = Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI
  return {
    walk: { follow: 'self', offset: off, lag, look: { of: 'self', offset: [1.4, -0.7, 1.4] }, fov: 70, drift: 0, push: 0, dof: false, eyeTrace: false },
    door: { crane: { from: 'prev', to: at.map(v => +v.toFixed(2)), yaw: +yaw.toFixed(1), pitch: +pitch.toFixed(1), fov: 70, secs: 0.8, tilt: 1 }, drift: 0, push: 0, dof: false, eyeTrace: false }
  }
}

async function walkPath (ctx, { X, Z, F }, W = {}) {
  const { bot } = ctx
  const MOTION = require('./motion'), M = require('./movie')
  await bot.waitForTicks(W.wait ?? 4)
  const pts = walkPoints().map(([x, z]) => ({ x: X + x, y: F + 1, z: Z + z }))
  const start = { x: bot.entity.position.x, y: F + 1, z: bot.entity.position.z }
  const lim = { speed: 200 * MOTION.DEG / 20, accel: 900 * MOTION.DEG / 400 }
  let gov = { cur: { yaw: bot.entity.yaw, pitch: bot.entity.pitch }, vel: { yaw: 0, pitch: 0 } }, i = 0
  const seen = { out: false, walker: false, road: false, near: false, home: false }
  let stuck = 0, last = bot.entity.position.clone()
  ctx.mark('walk_start')
  for (let k = 0; k < 400; k++) {
    const p = bot.entity.position
    const near = i >= pts.length - 2   // the last legs, into house S: walk, steer close (no corner cut into the door)
    const s = MOTION.walkSteer(start, pts, i, p, near ? 0.6 : MOTION.WALK_LOOK); i = s.i
    const rz = p.z - Z
    // out: through house N's door (seen from the top shot); walker: 3.5 blocks on, the cut to the chase camera (its
    // offset clears house N's roof from there; take 7 cut at the door and opened on the roof); home: on house S's
    // doorstep, before the eave hides him (take 7 ended on its roof)
    if (!seen.out && rz > HOUSES[0].door[1] + 1) { seen.out = true; ctx.mark('out') }
    if (!seen.walker && rz > HOUSES[0].door[1] + (W.cutAfter ?? 4.5)) { seen.walker = true; ctx.mark('walker'); if (W.cam !== false) M.shot(ctx, 'walk') }
    if (!seen.road && Math.abs(rz) <= 2) { seen.road = true; ctx.mark('road') }
    if (!seen.near && rz > NEAR_Z && W.cam !== false) { seen.near = true; ctx.mark('near'); M.shot(ctx, 'door') }
    if (!seen.home && rz > HOUSES[1].door[1] - 0.7) { seen.home = true; ctx.mark('home') }
    if (!s.ahead) break
    const want = { yaw: Math.atan2(-(s.ahead.x - p.x), -(s.ahead.z - p.z)), pitch: -0.15 }
    const r = MOTION.stepTurn(gov.cur, gov.vel, want, lim); gov = r
    await bot.look(r.cur.yaw, r.cur.pitch, true)   // motion-ok: the governed step (lib/motion.js stepTurn)
    const go = Math.abs(MOTION.wrap(want.yaw - r.cur.yaw)) < 0.6
    bot.setControlState('sprint', go && W.sprint !== false && !near)   // motion-ok: a straight run along the path, steered above
    bot.setControlState('forward', go)   // motion-ok: as above
    // (a step he can't walk up: a player hops it; never stands stuck against it)
    stuck = go && bot.entity.onGround && Math.hypot(p.x - last.x, p.z - last.z) < 0.02 ? stuck + 1 : 0
    last = p.clone()
    bot.setControlState('jump', stuck >= 3)   // motion-ok: as above
    await bot.waitForTicks(1)
  }
  bot.setControlState('forward', false); bot.setControlState('sprint', false); bot.setControlState('jump', false)   // motion-ok: the run ends inside house S
  if (!seen.home) ctx.log('desire: WARNING the walker never got home')
  ctx.mark('walk_done')
  await bot.waitForTicks(W.tail ?? 30)
}

// the edit for a walker ending: the path back keeps a small hit; the reveal (the cut to the chase) gets the drop, the
// dip and the big hit plus a card; home (the far doorstep) a dip, an impact, a ding, a punch and a flash, then the end
function walkerEdit (S) {
  const W = S.walker
  return {
    endAfter: `home:${W.endHold ?? 0.5}`,
    dropAt: 'walker',
    punch: ['flood', 'final', 'walker', 'home'],
    sfx: [['impact', 'flood', { gain: 0.7 }], ['riser', 'flood', 'final_a'], ['impact', 'final', { gain: 0.9 }], ['ding', 'final'],
      ['whoosh', 'out'], ['dip', 'walker', 0.4], ['impact', 'walker', { gain: 1.4 }], ['boom', 'walker'], ['dip', 'home', 0.4], ['impact', 'home', { gain: 1.4 }], ['ding', 'home'], ...(W.sfx || [])],
    cards: [...S.rounds.filter(r => r.card).map(r => [`ob_${r.id}`, r.card, r.cardSecs || 0.75, r.color || 'white', 0, null,
      { y: r.cardY ?? (r.flood ? 0.36 : ((r.c || r.near || [0, 1])[1] < 0 ? 0.8 : 0.17)) }]),
    ...(W.card ? [['walker', W.card, W.cardSecs || 1.2, W.cardColor || 'yellow', 0, null, { y: W.cardY ?? 0.84 }]] : []), ...(W.cards || [])],
    flash: [['home', 0, 0.3]],
    ...(W.speed ? { speed: W.speed } : {})
  }
}

// ---------------------------------------------------------------- the stunt
function makeStunt (S) {
  const rounds = S.rounds
  const flood = rounds.find(r => r.flood)
  const wear = S.wearTicks || 9            // ticks the new path takes to wear in, door to door
  const after = S.afterTicks || 9          // ticks the new path sits before the next obstacle
  const camera = S.camera || { at: [0, 31, 4.5], look: [0, 0, 0.3], fov: 70 }   // near top-down (a lower tilt squeezed the near lawn)
  return {
    name: S.name,
    rounds,
    biome: process.env.BIOME || S.biome || 'minecraft:plains',
    caption: S.caption,
    time: S.time ?? 5000,
    renderDistance: 8, recordRadius: 96,
    clouds: false,
    botTimeout: 900,      // the site search alone can take 3-4 min
    shots: {
      top: { ...camera, push: 0, drift: 0, dof: false, eyeTrace: false, subject: [[0, 1.5, 0]], size: 'wide' },
      // the walker's run (S.walker): from the top shot the player is a speck (take 7's review frames), so on his way
      // out of the door the camera cuts to ride along beside him, then settles in front of house S (walkShots)
      ...(S.walker ? walkShots(S.walker) : {})
    },
    edit: {
      caption: S.caption, red: S.red, song: null,
      startAt: 'start:0', endAfter: `final:${S.endHold ?? 1.0}`,
      dropAt: 'final',   // the song's drop on the payoff (the path back), not the flood
      keySounds: ['obstacle', 'break'],
      // each card on the far side of the road from its obstacle (one fixed spot covered the fence and the tree as
      // they landed: review r1); r.cardY overrides (0 top .. 1 bottom of the game view)
      cards: rounds.filter(r => r.card).map(r => [`ob_${r.id}`, r.card, r.cardSecs || 0.75, r.color || 'white', 0, null,
        { y: r.cardY ?? (r.flood ? 0.36 : ((r.c || r.near || [0, 1])[1] < 0 ? 0.8 : 0.17)) }]),
      punch: flood ? ['flood', 'final'] : ['final'],
      // the flood gets a short hit; the big one is saved for the payoff (a boom on the flood rang on through the
      // final path and buried its hit: pace saw no hit on 'final')
      // (a riser over the flood's hold: the lava sat in near silence and pace saw the last third sag; it ends at
      // final_a, 0.45 s before the payoff, so it never fills the dip). On the payoff: the song dips 0.4 s, then an
      // impact over the boom + ding (the NCS bed buried boom + ding alone: mixcheck, lead 2026-11-11)
      sfx: [...(flood ? [['impact', 'flood', { gain: 0.7 }], ['riser', 'flood', 'final_a']] : []),
        ['dip', 'final', 0.4], ['impact', 'final', { gain: 1.4 }], ['boom', 'final'], ['ding', 'final'], ...(S.sfx || [])],
      ...(S.walker ? walkerEdit(S) : {}),
      ...(S.edit || {})
    },

    async setup (ctx) {
      const { bot } = ctx
      await ctx.defaultRules()
      const hs = require('./hide_seek')
      const site = await hs.findSite(ctx, this.biome)
      const { X, Z, F } = site
      Object.assign(this, { X, Z, F })
      for (const r of ['random_tick_speed 0', 'fire_spread_radius_around_player 0', 'log_admin_commands false']) await ctx.cmd(`/gamerule ${r}`, { mayFail: true })
      await ctx.cmd('/difficulty peaceful')
      await hs.clearField(ctx, site, { r: 56, taper: 6 })
      await ctx.cmd('/kill @e[type=!minecraft:player]', { mayFail: true })
      const P = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
      // the road: sidewalks, asphalt, a dashed centre line, curbs
      await ctx.cmd(`/fill ${P(-40, 0, -2)} ${P(40, 0, 2)} smooth_stone`)
      await ctx.cmd(`/fill ${P(-40, 0, -1)} ${P(40, 0, 1)} gray_concrete`)
      for (let x = -40; x <= 40; x += 4) await ctx.cmd(`/fill ${P(x, 0, 0)} ${P(x + 1, 0, 0)} white_concrete`)
      // the two houses (S.house(ctx, P, h) to build your own)
      for (const [i, h] of HOUSES.entries()) await (S.house || house)(ctx, P, h, i)
      // a few flowers and trees round the edges of the frame (life, scale), never on the lawn the path uses
      // (bulk /setblocks go out 8 a tick: ctx.cmd's 4-tick wait each made set-up outlast the bot timeout)
      const bulk = async (list) => { for (let i = 0; i < list.length; i++) { bot.chat(list[i]); if (i % 8 === 7) await bot.waitForTicks(1) } await ctx.cmd('/time query daytime') }
      await bulk([[-21, -8], [22, 6], [-22, 10], [21, -12]].flatMap(([x, z]) => SHAPES.tree()([x, z]).map(([dx, dy, dz, b]) => `/setblock ${P(dx, dy, dz)} ${b}`)))
      // the first path (straight, door to door)
      this.blocked = new Set(); this.path = plan(this.blocked)
      await bulk(this.path.cells.map(([x, z]) => `/setblock ${P(x, 0, z)} dirt_path`))
      // the bot waits well out of the shot (east, on the road); with S.walker, in the back of house N, out of sight
      // of the open door: he is who keeps wearing the path, and walks it at the end
      await ctx.forceload({ x0: X - 60, z0: Z - 40, x1: X + 60, z1: Z + 40 })
      if (S.walker) {
        // (the houses read as solid planks in the recording: hollow them out, so he has a room to run out of)
        for (const h of HOUSES) await ctx.cmd(`/fill ${P(h.x0 + 1, 1, h.z0 + 1)} ${P(h.x1 - 1, 3, h.z1 - 1)} air`)
        // house N's door stands open; house S's doorway is left empty (takes 2-4: the bot's physics kept colliding with
        // its open north-facing door as if it were shut, and he stood stuck on the doorstep)
        for (const half of ['lower', 'upper']) await ctx.cmd(`/setblock ${P(HOUSES[0].door[0], half === 'lower' ? 1 : 2, HOUSES[0].door[1])} oak_door[half=${half},facing=south,open=true]`)
        await ctx.cmd(`/fill ${P(HOUSES[1].door[0], 1, HOUSES[1].door[1])} ${P(HOUSES[1].door[0], 2, HOUSES[1].door[1])} air`)
        // (and the path runs on into it: a dirt path floor through the doorway and the room, level with the path
        // outside; take 5 stopped dead at the 1/16 step up from the path onto the cobblestone sill)
        const hs = HOUSES[1]
        await ctx.cmd(`/setblock ${P(hs.door[0], 0, hs.door[1])} dirt_path`)
        await ctx.cmd(`/fill ${P(hs.x0 + 1, 0, hs.z0 + 1)} ${P(hs.x1 - 1, 0, hs.z1 - 1)} dirt_path`)
        await ctx.tpCheck(X + WALK_FROM[0], F + 1, Z + WALK_FROM[1], 0, 0)
      } else await ctx.tpCheck(X + 44.5, F + 1, Z + 0.5, 90, 0)
      await bot.waitForTicks(30)
      return { x: X, y: F, z: Z }
    },

    async perform (ctx) {
      const { bot } = ctx
      const { X, Z, F } = this
      const P = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
      const M = require('./movie')
      M.shot(ctx, 'top')
      ctx.mark('start')
      await bot.waitForTicks(S.leadTicks ?? 6)
      let path = this.path
      const blocked = this.blocked, placed = [], slots = new Map(), owner = new Map()
      const at = (x, z, y = 0) => bot.blockAt(new (ctx.Vec3)(X + x, F + y, Z + z))
      const sounds = (s) => { for (const [n, v, p] of (Array.isArray(s[0]) ? s : [s])) ctx.sound(n, v ?? 1, p ?? 1) }
      // the path wears in along its length (`wear` ticks); grass grows back on what it left
      const wearIn = async (cells, { onLava = false } = {}) => {
        const old = new Set(path ? path.cells.map(c => K(...c)) : []), now = new Set(cells.map(c => K(...c)))
        const fresh = cells.filter(c => !old.has(K(...c)) || onLava)
        const regrow = [...old].filter(k => !now.has(k)).map(k => k.split(',').map(Number)).filter(([x, z]) => at(x, z)?.name === 'dirt_path')
        ctx.mark('path')
        for (let t = 0; t < wear; t++) {
          const a = Math.floor(fresh.length * t / wear), b = Math.floor(fresh.length * (t + 1) / wear)
          for (const [x, z] of fresh.slice(a, b)) bot.chat(`/setblock ${P(x, 0, z)} dirt_path`)
          const ra = Math.floor(regrow.length * t / wear), rb = Math.floor(regrow.length * (t + 1) / wear)
          for (const [x, z] of regrow.slice(ra, rb)) bot.chat(`/setblock ${P(x, 0, z)} grass_block`)
          if (t % 3 === 0) ctx.sound('item.shovel.flatten', 1, 0.9 + 0.08 * t)
          await bot.waitForTicks(1)
        }
      }
      for (const r of rounds) {
        if (r.flood) {
          // the flood: every obstacle sinks, the whole lawn turns to `flood`; then the path comes straight back
          ctx.mark('obstacle'); ctx.mark(`ob_${r.id}`); ctx.mark('flood')
          sounds(r.sound || [['item.bucket.empty_lava', 1, 0.8], ['block.lava.pop', 1, 1]])
          for (const k of new Set(placed.filter(b => b[1] > 0).map(b => `${b[0]} ${b[1]} ${b[2]}`))) { const [x, y, z] = k.split(' ').map(Number); bot.chat(`/setblock ${P(x, y, z)} air`) }
          await bot.waitForTicks(1)
          const strips = []
          for (let x = B.x0; x <= B.x1; x += 12) for (const [z0, z1] of [[B.z0, -3], [3, B.z1]]) strips.push([x, Math.min(B.x1, x + 11), z0, z1])
          for (const [x, x1, z0, z1] of strips) {
              // (water goes to dirt/grass before any lava: /fill places cell by cell, and lava set next to water still
              // there turns to obsidian on the spot: a black blob where the pond was)
              bot.chat(`/fill ${P(x, -1, z0)} ${P(x1, -1, z1)} dirt replace water`)
              bot.chat(`/fill ${P(x, 0, z0)} ${P(x1, 0, z1)} grass_block replace water`)
          }
          for (const [x, x1, z0, z1] of strips) for (const b of ['grass_block', 'dirt_path', 'sand', 'dirt']) bot.chat(`/fill ${P(x, 0, z0)} ${P(x1, 0, z1)} ${r.flood} replace ${b}`)
          if (S.walker) {
            // (in the same tick: house S's dirt path floor (the walker's way in) is not lawn; take 6 flooded it and he
            // ran into a room of lava)
            const hs = HOUSES[1]
            bot.chat(`/fill ${P(hs.x0 + 1, 0, hs.z0 + 1)} ${P(hs.x1 - 1, 0, hs.z1 - 1)} dirt_path replace ${r.flood}`)
            bot.chat(`/setblock ${P(hs.door[0], 0, hs.door[1])} dirt_path`)
          }
          await bot.waitForTicks(r.hold ?? 14)
          blocked.clear(); path = { cells: [] }
          const np = plan(blocked)
          ctx.mark('final_a')
          await wearIn(np.cells, { onLava: true })
          path = np
          ctx.mark('final')
          if (S.walker) await walkPath(ctx, { X, Z, F }, S.walker)
          else await bot.waitForTicks(Math.round((S.endHold ?? 1.0) * 20) + 6)
          break
        }
        // the obstacle lands ON the path (owner r:r81cb9c: the path breaks through it, never goes round): a slot of
        // the town's earlier obstacle is cleared first when this one takes its place (r.slot)
        const { c, blocks } = drop(r, path)
        if (r.slot && slots.has(r.slot)) {
          const onPath = new Set(path.cells.map(q => K(...q)))
          // (only blocks it still owns: walls built later over the same cells stay up)
          for (const [x, y, z] of slots.get(r.slot).filter(([x, y, z]) => owner.get(`${x},${y},${z}`) === slots.get(r.slot).id)) bot.chat(`/setblock ${P(x, y, z)} ${y > 0 ? 'air' : y === 0 ? (onPath.has(K(x, z)) ? 'dirt_path' : 'grass_block') : 'dirt'}`)
          await bot.waitForTicks(1)
        }
        ctx.mark('obstacle'); ctx.mark(`ob_${r.id}`, { c })
        sounds(r.sound || ['block.stone.place', 1, 1])
        // grow it layer by layer (one layer a tick: a tree rises, a wall goes up)
        const ys = [...new Set(blocks.map(b => b[1]))].sort((a, b) => a - b)
        for (const y of ys) {
          for (const [x, yy, z, b] of blocks) if (yy === y) bot.chat(`/setblock ${P(x, yy, z)} ${b}`)
          await bot.waitForTicks(1)
        }
        if (r.slot) slots.set(r.slot, Object.assign(blocks.slice(), { id: r.id }))
        for (const [x, y, z] of blocks) owner.set(`${x},${y},${z}`, r.id)
        placed.push(...blocks)
        await bot.waitForTicks(r.hold ?? 8)
        // the break-through: every block of it on the path's line goes, in walking order, `wear` ticks door to door;
        // the ground under it becomes path (a pond gets a dirt causeway)
        const cut = cutThrough(blocks, path.cells)
        ctx.log(`desire: ${r.id} at ${c} -> ${blocks.length} blocks, ${cut.length} broken through`)
        if (cut.length < 2) ctx.log(`desire: WARNING ${r.id} is barely on the path`)
        ctx.mark('break')
        const steps = Math.max(1, Math.min(wear, cut.length))
        for (let t = 0; t < steps; t++) {
          const part = cut.slice(Math.floor(cut.length * t / steps), Math.floor(cut.length * (t + 1) / steps))
          const heard = new Set()
          for (const b of part) {
            bot.chat(`/setblock ${P(b.x, b.y, b.z)} ${b.to}`)
            if (b.from !== 'water' && b.y >= 0) ctx.particles('block', { x: X + b.x, y: F + b.y, z: Z + b.z }, { block: b.from.replace(/\[.*$/, '') })
            const g = b.from === 'water' ? 'water' : ctx.soundGroup(b.from)
            if (!heard.has(g) && heard.size < 2) { heard.add(g); ctx.sound(g === 'water' ? 'item.bucket.fill' : /leaves/.test(b.from) ? 'block.grass.break' : `block.${g}.break`, 1, 0.85 + 0.1 * (t % 3)) }
          }
          if (t % 3 === 1) ctx.sound('item.shovel.flatten', 0.8, 0.95 + 0.05 * t)
          await bot.waitForTicks(1)
        }
        await bot.waitForTicks(r.after ?? after)
      }
      ctx.log('desire: done')
      return true
    }
  }
}

// the break-through (pure): the obstacle's blocks on the path's cells, each with what it turns into, in walking order
// (the path's cell order), top down within a cell. Above the ground: air. The ground row: dirt_path (water and sand
// too: a causeway across a pond). Under it: water becomes dirt (a causeway needs a floor).
function cutThrough (blocks, cells) {
  const order = new Map(cells.map((q, i) => [K(...q), i]))
  return blocks.filter(([x, , z]) => order.has(K(x, z)))
    .map(([x, y, z, from]) => ({ x, y, z, from, to: y > 0 ? 'air' : y === 0 ? 'dirt_path' : 'dirt', i: order.get(K(x, z)) }))
    .filter(b => !(b.y < 0 && b.from !== 'water'))
    .sort((a, b) => a.i - b.i || b.y - a.y)
}

// a round's obstacle on the path as it is: its centre cell and its blocks (clipped off the houses and the road)
function drop (r, path) {
  // `at`: a fraction of the path's grass cells in walking order (0 = the first door, 1 = the other), or 'cross'
  let where
  if (r.at === 'cross') where = crossing(path.poly)
  else {
    const n = path.cells.length
    let i = Math.max(0, Math.min(n - 1, Math.round((r.at ?? 0.5) * (n - 1))))
    // `near: [x, z]`: on the path where it passes closest to that point (a choreography that survives re-routes)
    // (never within 4 cells of a front door: an obstacle on the doorstep walls the door in)
    const away = ([x, z]) => HOUSES.every(h => Math.hypot(x - h.out[0], z - h.out[1]) > 4)
    if (r.near) { let bd = Infinity; path.cells.forEach(([x, z], j) => { const d = Math.hypot(x - r.near[0], z - r.near[1]); if (d < bd && away([x, z])) { bd = d; i = j } }) }
    const a = path.cells[Math.max(0, i - 2)], b = path.cells[Math.min(n - 1, i + 2)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    where = { p: path.cells[i], dir: [(b[0] - a[0]) / L, (b[1] - a[1]) / L] }
  }
  const c = r.c || [Math.round(where.p[0] + (r.shift?.[0] || 0)), Math.round(where.p[1] + (r.shift?.[1] || 0))]
  const blocks = r.shape(c, where.dir).filter(([x, , z]) => x >= B.x0 && x <= B.x1 && z >= B.z0 && z <= B.z1 && !inHouse(x, z) && !nearDoor(x, z) && (r.onRoad || !ROAD(x, z)))
  return { c, blocks }
}

// every round without a server (tests, tuning): [{ id, c, blocks, cut, path }] and an ASCII map per round. The path
// never moves (owner r:r81cb9c): each obstacle lands on it and is cut through.
function simulate (rounds) {
  const path = plan(new Set()), out = [{ id: 'start', path }], slots = new Map(), live = new Set(), own = new Map()
  for (const r of rounds) {
    if (r.flood) { out.push({ id: r.id, path, flood: true }); break }
    const { c, blocks } = drop(r, path)
    if (r.slot && slots.has(r.slot)) for (const [x, y, z] of slots.get(r.slot)) if (own.get(`${x},${y},${z}`) === slots.get(r.slot).id) { own.delete(`${x},${y},${z}`) }
    if (r.slot) slots.set(r.slot, Object.assign(blocks.slice(), { id: r.id }))
    for (const [x, y, z] of blocks) own.set(`${x},${y},${z}`, r.id)
    live.clear(); for (const k of own.keys()) { const [x, , z] = k.split(',').map(Number); live.add(K(x, z)) }
    const cut = cutThrough(blocks, path.cells)
    for (const q of cut) { own.delete(`${q.x},${q.y},${q.z}`); if (![...own.keys()].some(k => k.startsWith(`${q.x},`) && k.endsWith(`,${q.z}`))) live.delete(K(q.x, q.z)) }
    out.push({ id: r.id, c, blocks, cut, path, map: map(live, path) })
  }
  return out
}

function map (blocked, path) {
  const on = new Set(path ? path.cells.map(c => K(...c)) : []), rows = []
  for (let z = B.z0; z <= B.z1; z++) {
    let row = ''
    for (let x = B.x0; x <= B.x1; x++) row += inHouse(x, z) ? 'H' : blocked.has(K(x, z)) ? '#' : on.has(K(x, z)) ? 'o' : ROAD(x, z) ? (z === 0 ? '-' : '=') : '.'
    rows.push(row)
  }
  return rows.join('\n')
}

// where the path crosses the road (the middle of its road run)
function crossing (poly) {
  for (let s = 0; s < poly.length - 1; s++) {
    const [ax, az] = poly[s], [bx, bz] = poly[s + 1]
    if ((az <= 0 && bz >= 0) || (az >= 0 && bz <= 0)) {
      const u = az === bz ? 0 : (0 - az) / (bz - az), L = Math.hypot(bx - ax, bz - az) || 1
      return { p: [ax + u * (bx - ax), 0], dir: [(bx - ax) / L, (bz - az) / L] }
    }
  }
  return pointAt(poly, 0.5)
}

// a small cottage: cobble base, plank walls with log corners, glass, a door to the road and a stair roof (seen from
// above: two roof slopes and a ridge)
async function house (ctx, P, h, i) {
  const { x0, x1, z0, z1, door } = h
  const wood = i ? ['birch_planks', 'birch_log'] : ['oak_planks', 'spruce_log']
  await ctx.cmd(`/fill ${P(x0, 0, z0)} ${P(x1, 0, z1)} cobblestone`)
  await ctx.cmd(`/fill ${P(x0, 1, z0)} ${P(x1, 3, z1)} ${wood[0]} hollow`)
  for (const [x, z] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]]) await ctx.cmd(`/fill ${P(x, 1, z)} ${P(x, 3, z)} ${wood[1]}`)
  for (const x of [x0 + 2, x1 - 2]) for (const z of [z0, z1]) if (x !== door[0]) await ctx.cmd(`/setblock ${P(x, 2, z)} glass_pane`)
  const facing = door[1] === z1 ? 'south' : 'north'
  await ctx.cmd(`/setblock ${P(door[0], 1, door[1])} oak_door[half=lower,facing=${facing}]`)
  await ctx.cmd(`/setblock ${P(door[0], 2, door[1])} oak_door[half=upper,facing=${facing}]`)
  // a gable roof: stairs up from the north and south eaves to a ridge along x
  const roof = i ? 'dark_oak' : 'spruce'
  const mid = (z0 + z1) / 2
  for (let k = 0; z0 - 1 + k <= mid; k++) {
    const zn = z0 - 1 + k, zs = z1 + 1 - k
    if (zn >= zs) { await ctx.cmd(`/fill ${P(x0 - 1, 4 + k, zn)} ${P(x1 + 1, 4 + k, zn)} ${roof}_slab`); break }
    await ctx.cmd(`/fill ${P(x0 - 1, 4 + k, zn)} ${P(x1 + 1, 4 + k, zn)} ${roof}_stairs[facing=south]`)
    await ctx.cmd(`/fill ${P(x0 - 1, 4 + k, zs)} ${P(x1 + 1, 4 + k, zs)} ${roof}_stairs[facing=north]`)
    if (zs - zn <= 1) break
    await ctx.cmd(`/fill ${P(x0, 4 + k, zn + 1)} ${P(x1, 4 + k, zs - 1)} ${roof}_planks`)
  }
}

module.exports = { makeStunt, walkPoints, walkerEdit, walkShots, simulate, cutThrough, drop, map, plan, pointAt, raster, crossing, SHAPES, HOUSES, B, inHouse, ROAD }
