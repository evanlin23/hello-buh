// Format "mega", time-lapse variant (owner, 2026-11-11, r:r4449f0: "this gimmick is like ridiculous megabuild"),
// Short 1: the caption asks for "a small fountain at spawn"; it stands beside 56e at frame 0, then the drone
// time-lapse keeps going: a plaza, a ring wall with towers of two heights, a ring of houses (some two storeys, the upper
// one jutting out), a terrace with an arcade and buttresses round it all, gardens and houses on it, a second terrace set
// back on the first, corner and gate towers, then four great towers of four heights with balconies; on the cut to the
// high reveal every tower gets its gold tip and the lanterns come on, the "blocks used" count stops, and the last shot
// is a low pass beside 56e and the small fountain, the city towering over them.
// Owner, 2026-11-11 (r:r13865d) on take 1: "make the build more complicated, it looks a bit flat ... put it in a real
// world, not superflat": the city stands in a real flower forest among hills (only its own site cleared), and nothing
// is a flat wall or a flat tier: arches with dark recesses, buttresses, overhanging cornices and parapets, jettied upper
// storeys, trees, mixed stone, quartz, timber and three roof colours, towers of different heights.
// Our own take (lib/mega_lapse.js): our city (white quartz, teal and slate roofs, a round core in a stepped square town),
// our caption, our angles; not the reference's tiered mountain city.
const L = require('../lib/mega_lapse')
const { kit } = L

const W = 'smooth_quartz', B = 'stone_bricks', R = 'dark_prismarine', SL = 'deepslate_tiles', PB = 'prismarine_bricks'
const GOLD = 'gold_block', LAMP = 'sea_lantern', PAVE = 'polished_andesite'
const ROOFS = [R, SL, PB]
// the terraces (half-sizes of the square rings round the centre; y from the ground)
const T1 = { in: [37, 39], out: [72, 74], top: 12 }     // tier 1: the ledge outside tier 2 is a 66..71 (trees)
const T2 = { in: [50, 52], out: [62, 64], top: 26 }     // tier 2, set back on tier 1
const GIANTS = [[-57, -57, 74, R], [57, -57, 86, SL], [-57, 57, 80, SL], [57, 57, 68, R]]   // x, z, top, roof: four heights
const CORNERS = [[-73, -73], [73, -73], [-73, 73], [73, 73]]
const GATES = [[0, -73], [73, 0], [0, 73], [-73, 0]]
const PLAYER = [-4, 2]                                   // 56e on the plaza, beside the fountain (r1: at -4, -5 it hid behind it)

// a stable pseudo-random number per lot (the same city every take)
const rnd = (i, k = 1) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v) }
// lots along the four sides of a square ring at half-size `a`, every `step` blocks, |t| <= lim, skipping |t| < gap
const sides = (a, step, lim, gap) => {
  const out = []
  for (let side = 0; side < 4; side++) for (let t = -lim; t <= lim; t += step) {
    if (Math.abs(t) < gap) continue
    out.push({ side, t, xz: side === 0 ? [t, -a] : side === 1 ? [a, t] : side === 2 ? [-t, a] : [-a, -t] })
  }
  return out
}

function fountain () {
  const c = []
  kit.ring(c, 0, 3.65, 0, B, 0)                                        // the basin's floor
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {       // the rim, swept round in four quarters
    const d = Math.hypot(x, z)
    if (d >= 2.6 && d <= 3.65) c.push([x, 1, z, 'chiseled_stone_bricks', 1 + Math.floor(((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * 4) % 4])
  }
  kit.ring(c, 0.9, 2.5, 1, 'water', 5)
  c.push([0, 1, 0, 'chiseled_stone_bricks', 6], [0, 2, 0, 'chiseled_stone_bricks', 7], [0, 3, 0, LAMP, 8])
  return { name: 'fountain', ticks: 26, cells: c }
}

function plaza () {
  const c = []
  for (let x = -16; x <= 16; x++) for (let z = -16; z <= 16; z++) {
    const d = Math.hypot(x, z)
    if (d < 3.7 || d > 15.6) continue
    c.push([x, 0, z, d > 15 ? B : (d >= 8 && d < 9) ? 'smooth_stone' : PAVE, 10 + Math.floor(d)])
  }
  for (let k = 0; k < 8; k++) {                                        // lamp posts
    const a = k * Math.PI / 4 + Math.PI / 8, x = Math.round(Math.cos(a) * 12), z = Math.round(Math.sin(a) * 12)
    c.push([x, 1, z, PAVE, 27], [x, 2, z, PAVE, 27], [x, 3, z, LAMP, 28])
  }
  return { name: 'plaza', ticks: 24, cells: c }   // (from tick 0: the first ring lands on frame 1)
}

// the ring wall: arched gates on the four streets, merlons, eight towers of two heights with balconies
function walls () {
  const c = []
  for (let x = -20; x <= 20; x++) for (let z = -20; z <= 20; z++) {
    const d = Math.hypot(x, z)
    if (d < 17 || d > 18.6) continue
    const off = Math.min(Math.abs(x), Math.abs(z))                    // distance from the street's middle line
    for (let y = 1; y <= 8; y++) {
      if (off <= 1 && y <= 3) continue                                 // the gate: 3 wide, an arched top
      if (off === 0 && y === 4) continue
      c.push([x, y, z, y <= 1 ? B : y === 8 ? 'chiseled_quartz_block' : W, y])
    }
    if ((x + z) % 2 === 0) c.push([x, 9, z, W, 9])
  }
  // a walkway corbelled out round the inside of the wall top (a shadow line)
  kit.ring(c, 15.8, 16.9, 7, B, 7)
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8, tall = k % 2 === 0
    kit.tower(c, Math.round(Math.cos(a) * 17.8), Math.round(Math.sin(a) * 17.8), tall ? 2.8 : 2.4, 1, tall ? 17 : 11,
      { roofH: tall ? 6 : 4, win: 5, roof: tall ? R : SL, balcony: tall ? 9 : 0 })
  }
  return { name: 'walls', ticks: 44, cells: c }
}

// the houses round the wall: two rings of lots swept round as a wave, heights and roofs varied, some with a jettied
// timber upper storey, a tree in every few gaps
function houses () {
  const c = [], lots = []
  for (const [r, n] of [[24, 16], [30.5, 22]]) for (let k = 0; k < n; k++) lots.push({ r, a: (k + (r > 25 ? 0.5 : 0)) * 2 * Math.PI / n - Math.PI })
  lots.sort((p, q) => p.a - q.a)
  lots.forEach((l, i) => {
    const cx = Math.round(Math.cos(l.a) * l.r), cz = Math.round(Math.sin(l.a) * l.r)
    if (Math.abs(cx) <= 3 || Math.abs(cz) <= 3) return                 // the streets out of the four gates
    const two = rnd(i, 6) < 0.35, h = two ? 4 : 4 + Math.floor(rnd(i) * 3)
    kit.house(c, cx - 2, cz - 2, 5, 5, 1, h, { step: (y) => i * 3 + (y < 1 + h ? 0 : 1), roof: ROOFS[Math.floor(rnd(i, 2) * 3)], upper: two ? { h: 3 } : null })
    if (l.r < 25 && i % 3 === 1) {                                      // a tree in the gap after it
      const ta = l.a + Math.PI / 16
      kit.tree(c, Math.round(Math.cos(ta) * 27), 1, Math.round(Math.sin(ta) * 27), 4, 2, { step: i * 3 + 2 })
    }
  })
  return { name: 'houses', ticks: 44, cells: c }
}

// tier 1: both faces dressed (arcade, buttresses, cornice, parapet), rising two layers a step, then the garden top
function tier1 () {
  const c = [], b = []
  const st = (y) => Math.floor(y / 2)
  // the faces go down 6 into the real ground (no gap under them where the land dips; r2: the city stands in the forest,
  // not on a cleared field), their stone base at ground level
  kit.squareFace(c, T1.out[0], T1.out[1], -6, T1.top, { side: 'out', every: 9, arch: [3, 7], arch2: [9, 10], lowerTo: 2, step: st })
  kit.squareFace(c, T1.in[0], T1.in[1], -6, T1.top, { side: 'in', every: 8, arch: [2, 5], arch2: [7, 9], lowerTo: 2, step: st })
  kit.squareRing(b, T1.in[1] + 1, T1.out[0] - 1, T1.top, T1.top, 'grass_block', () => 8)
  return { name: 'tier1', ticks: 44, cells: c, boxes: b }
}

// the garden town on tier 1: a ring of houses (half with a jettied upper storey), trees between them and along the
// outer ledge, swept round side by side
function town1 () {
  const c = []
  const y0 = T1.top + 1
  sides(46, 9, 40, 4).forEach((l, i) => {
    const [cx, cz] = l.xz, two = rnd(i, 7) < 0.5
    kit.house(c, cx - 3, cz - 3, 6, 6, y0, two ? 4 : 4 + Math.floor(rnd(i, 3) * 4), { step: l.side * 100 + l.t + 50, roof: ROOFS[Math.floor(rnd(i, 4) * 3)], upper: two ? { h: 3 } : null })
  })
  sides(42, 9, 40, 4).forEach((l, i) => { const [x, z] = l.xz; const s = Math.sign(l.t) * 4; kit.tree(c, x + (l.side % 2 ? 0 : s), y0, z + (l.side % 2 ? s : 0), 4, 2, { step: l.side * 100 + l.t + 52 }) })
  // the outer ledge (a 65..71): a garden on two levels, not a flat strip: trees, small ponds in stone rims, raised
  // flower planters, and a hedge along the parapet
  sides(68, 8, 64, 3).forEach((l, i) => {
    const [x, z] = l.xz, st = l.side * 100 + l.t + 54, along = l.side % 2 === 0
    const k = i % 3
    if (k === 0) kit.tree(c, x, y0, z, 5, 2.2, { step: st })
    else if (k === 1) {                                                // a pond: a stone rim, water a block down
      for (let u = -2; u <= 2; u++) for (let v = -1; v <= 1; v++) {
        const [px, pz] = along ? [x + u, z + v] : [x + v, z + u], rim = Math.abs(u) === 2 || Math.abs(v) === 1
        c.push([px, T1.top, pz, rim ? 'mossy_stone_bricks' : 'water', st], [px, y0, pz, rim ? 'stone_brick_wall' : 'air', st])
      }
    } else {                                                           // a raised planter of flowers
      for (let u = -2; u <= 2; u++) for (let v = -1; v <= 1; v++) {
        const [px, pz] = along ? [x + u, z + v] : [x + v, z + u], rim = Math.abs(u) === 2 || Math.abs(v) === 1
        c.push([px, y0, pz, rim ? B : 'grass_block', st])
        if (!rim) c.push([px, y0 + 1, pz, ['poppy', 'cornflower', 'oxeye_daisy'][(u + 2) % 3], st])
      }
    }
  })
  for (const a of [71]) for (const [x0, z0, x1, z1] of [[-a, -a, a, -a], [-a, a, a, a], [-a, -a, -a, a], [a, -a, a, a]]) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) if ((x + z) % 9) c.push([x, y0, z, 'oak_leaves[persistent=true]', 400])
  }
  return { name: 'town1', ticks: 30, cells: c }
}

// tier 2, set back on tier 1, its faces dressed the same way; the corner and gate towers rise from the ground with it
function tier2 () {
  const c = [], b = []
  const st = (y) => Math.floor(y / 2)
  kit.squareFace(c, T2.out[0], T2.out[1], T1.top + 1, T2.top, { side: 'out', every: 8, arch: [T1.top + 3, T1.top + 7], arch2: [T1.top + 9, T1.top + 11], step: st })
  kit.squareFace(c, T2.in[0], T2.in[1], T1.top + 1, T2.top, { side: 'in', every: 7, arch: [T1.top + 2, T1.top + 5], arch2: [T1.top + 8, T1.top + 10], step: st })
  kit.squareRing(b, T2.in[1] + 1, T2.out[0] - 1, T2.top, T2.top, 'grass_block', () => 13)
  for (const [x, z] of CORNERS) kit.tower(c, x, z, 6, -6, 44, { roofH: 10, win: 7, balcony: 13, roof: R, step: (y) => Math.floor((y + 6) / 3) })
  for (const [x, z] of GATES) kit.tower(c, x, z, 4.5, -6, 32, { roofH: 7, win: 6, balcony: 11, roof: SL, step: (y) => Math.floor((y + 6) / 3) })
  return { name: 'tier2', ticks: 66, cells: c, boxes: b }
}

// the top town on tier 2: taller blocks, heights 7 to 13, roofs varied, a few slender towers between them
function town2 () {
  const c = []
  const y0 = T2.top + 1
  sides(57, 11, 44, 5).forEach((l, i) => {
    const [cx, cz] = l.xz
    if (i % 4 === 2) kit.tower(c, cx, cz, 2.5, y0, y0 + 10 + Math.floor(rnd(i, 8) * 6), { roofH: 5, win: 5, roof: ROOFS[i % 3], step: () => l.side * 100 + l.t + 50 })
    else kit.house(c, cx - 3, cz - 3, 7, 7, y0, 6 + Math.floor(rnd(i, 5) * 6), { step: l.side * 100 + l.t + 50, roof: ROOFS[Math.floor(rnd(i, 9) * 3)], upper: rnd(i, 10) < 0.4 ? { h: 3, wall: 'stripped_spruce_wood', post: 'spruce_log' } : null })
  })
  return { name: 'town2', ticks: 28, cells: c }
}

// the four great towers, four heights, a balcony every 12 layers; in two stages (the lower and the upper half), each
// with its own angle
function greatTowers () {
  const c = []
  for (const [x, z, top, roof] of GIANTS) kit.tower(c, x, z, 5.5, T2.top + 1, top, { roofH: 12, win: 6, balcony: 12, roof, step: (y) => Math.floor(y / 2) })
  return c
}
const SPLIT = 52
const giants = () => ({ name: 'giants', ticks: 30, cells: greatTowers().filter(q => q[1] <= SPLIT) })
const giants2 = () => ({ name: 'giants2', ticks: 30, cells: greatTowers().filter(q => q[1] > SPLIT) })

// the payoff, all in one tick on the reveal cut: a gold spire on every tower, the lanterns along both terraces' edges
function lights () {
  const c = []
  for (const [x, z, top] of GIANTS) {
    for (let k = 0; k < 6; k++) c.push([x, top + 14 + k, z, GOLD])
    for (const p of kit.ring([], 6.6, 7.3, top + 1, LAMP)) c.push([x + p[0], p[1], z + p[2], LAMP])
  }
  for (const [x, z] of CORNERS) for (let k = 0; k < 4; k++) c.push([x, 44 + 12 + k, z, GOLD])
  for (const [x, z] of GATES) for (let k = 0; k < 3; k++) c.push([x, 32 + 9 + k, z, GOLD])
  for (const [a, y] of [[T1.out[1] + 1, T1.top + 2], [T2.out[1] + 1, T2.top + 2]]) for (let t = -a + 4; t <= a - 4; t += 6) c.push([t, y + 1, -a, LAMP], [t, y + 1, a, LAMP], [-a, y + 1, t, LAMP], [a, y + 1, t, LAMP])
  c.push([0, 4, 0, GOLD])                                               // and a gold block on the fountain
  return { name: 'lights', ticks: 1, cells: c }
}

// camera points: [seconds, x, y, z] (output seconds; y from the ground)
module.exports = L.makeLapse({
  name: 'mega_lapse_fountain',
  caption: 'bro asked for a SMALL fountain at spawn 😭',   // (a reaction, not a label: r:r0f3da0; take 2's 'the server asked me for a small fountain at spawn')
  red: 'SMALL',
  // real land round it (r:r13865d). r2: only the core (plaza and houses, half-size 38) is cleared and levelled;
  // the terraces rise out of the forest floor on sunk foundations (the hilly flower-forest site of take 3 was cut into
  // stepped stone faces, and a 172-block cleared lawn read as superflat)
  // (r2 take 1: the nearest forest stood on a hill by snowy slopes, cut into steps; the plains near spawn are flat, with
  // their own grass, flowers and trees: real land the city rises out of)
  biome: 'minecraft:plains',
  fieldBiome: 'minecraft:plains',
  time: 11000,                            // late afternoon: a low warm sun raking the arcades
  look: { mood: 'golden_hour', bloom: 0.35, bloomThreshold: 0.86, bloomPasses: 1, sharpen: 0.4, rays: 0.4, raysOverBlocks: 0.3, shadows: true, vignette: 0.25, grain: 0.01 },
  field: 38,                              // the core only; the taper (16) runs under tier 1
  height: 100,
  clearTrees: 28,                         // no trees inside the walls (to half-size 82): the forest stands outside them
  renderDistance: 16, recordRadius: 256,
  chunkStops: [[-160, -160], [160, -160], [-160, 160], [160, 160]],
  botTimeout: 1500,
  player: { at: PLAYER, yaw: -63, pitch: 0 },   // facing the fountain (mineflayer yaw: atan2(-dx, -dz))
  tally: 'blocks used',
  startSound: 'block.stone.place',        // a hit on frame 1 (mixcheck: the hook's sound under the music)
  // the small fountain is already standing at frame 0, 56e beside it in the flower forest, and the plaza starts
  // spreading round it on the first tick (owner r:r0f3da0: the subject in view at frame 0, moving by 0.5 s; take 2
  // opened on 1.3 s of an empty grass square while the fountain went in)
  dress: L.steps(fountain()).flat().map(({ box, block }) => [...box, block]),
  stages: [plaza(), walls(), houses(), tier1(), tier2(), town1(), town2(), giants(), giants2(), lights()],   // (r2: tier 2 before the tier-1 town: the town shot showed tier 1's top as a bare 30-block ring)
  perTick: 60,
  // each stage its own steady drone angle, joined by hard cuts (r:r66efa4); every move slow and even
  angles: [['plaza', 'close'], ['walls', 'ring'], ['houses', 'houses'], ['tier1', 'face'], ['tier2', 'far'], ['town1', 'town'], ['town2', 'roofs'], ['giants', 'giants'], ['giants2', 'scale']],
  // the reveal holds 0.6 s, then straight to the pass (owner r:r188b46: cut 0.3-0.6 s after a result reads); a short
  // firework blast on it, not the beacon's chime or the toast's fanfare (they rang over the pass: no hit there)
  payoff: { stage: 'lights', shot: 'reveal', hold: 12, toast: false, sound: 'entity.firework_rocket.blast' },
  // the close pass beside 56e and the small fountain, the city towering over them (r:rf8524b); the water splashes
  outro: [{
    shot: 'pass', mark: 'pass', ticks: 30,
    async at (ctx) { ctx.sound('entity.generic.splash', 1, 1.0); ctx.sound('block.water.ambient', 1, 1.1) }
  }],
  endAfter: 0.8,                          // the end 0.8 s after the pass lands (r:r188b46: 0.5-0.8 s)
  edit: {
    // one hit, on the pass (the last beat, which pace and mixcheck measure): the bed dips under it, an impact, the NCS drop.
    // The reveal keeps its flash, punch and the firework blast, without an edit hit: 0.6 s before the pass its impact
    // and the music held the level at -6..-8 dB, and the pass's own hit couldn't rise over it (mixcheck)
    sfx: [['dip', 'pass', 0.5], ['impact', 'pass', { gain: 1.8 }]],
    // the NCS drop on the pass, the last beat (mixcheck: dropped on the reveal, the bed was at full level 0.6 s later
    // and the pass's hit didn't stand out); no card: at 0.8 s it couldn't be read (r:r188b46 ends fast)
    dropAt: 'pass'
  },
  shots: {
    // 1. close and low on the fountain (56e beside it), pulling back and up as the plaza spreads round it
    close: { path: [[0, 6.5, 3.6, 8.5], [1.2, 10.5, 6.5, 11]], lookPath: [[0, -1.5, 1.6, -1.5], [1.2, -1.5, 1.0, -1.5]], fov: 66, dof: false, drift: 0.4, scenery: true, subject: [[0, 4.5, 0]] },
    // 2. a three-quarter angle on the ring wall as it rises, its towers of two heights
    ring: { path: [[0, 30, 18, 36], [2.2, 23, 17, 40]], lookPath: [[0, 0, 6, 0], [2.2, 0, 6, 0]], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [[16, 25, 7]] },
    // 3. high, sliding round: the houses fill the ring outside the wall
    houses: { path: [[0, -44, 36, 30], [2.2, -50, 33, 16]], lookPath: [[0, 0, 3, 0], [2.2, 0, 3, 0]], fov: 64, dof: false, drift: 0.4, scenery: true, subject: [[-20, 8, 14]] },
    // 4. outside on the real hillside, low: the terrace's arcade rises across the town, the forest round it
    face: { path: [[0, 30, 22, 112], [2.2, 42, 24, 106]], lookPath: [[0, 6, 8, 40], [2.2, 10, 9, 40]], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [[0, 15.5, 75]] },
    // 5. high over the south-east corner: the garden town spreading over the terrace
    town: { path: [[0, 94, 56, 94], [1.8, 88, 52, 100]], lookPath: [[0, 30, 10, 30], [1.8, 28, 10, 32]], fov: 60, dof: false, drift: 0.4, scenery: true, subject: [[46, 18, 46]] },
    // 6. high over the west side: the second terrace, the corner and gate towers rise in view
    far: { path: [[0, -124, 58, -20], [2.0, -120, 62, -36]], lookPath: [[0, -56, 22, -48], [2.0, -56, 24, -50]], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [[-73, 57, -73]] },
    // 7. skimming low over the north terraces: the top town fills in, the ledge gardens below
    roofs: { path: [[0, -30, 44, -100], [1.5, -10, 44, -100]], lookPath: [[0, -10, 26, -50], [1.5, 10, 26, -50]], fov: 64, dof: false, drift: 0.4, scenery: true, subject: [[0, 34, -57]] },
    // 8. from the plaza, 56e and the fountain in front: the great towers rise behind the walls
    giants: { path: [[0, -9.5, 5, -9.5], [1.5, -8.5, 4.6, -8.5]], lookPath: [[0, 24, 18, 24], [1.5, 24, 21, 24]], fov: 72, dof: false, drift: 0.3, scenery: true, subject: [[0, 4.5, 0]] },
    // 9. far out over the forest and the river: the whole city against the hills, the great towers topping out
    scale: { path: [[0, 150, 40, -118], [1.5, 142, 42, -130]], lookPath: [[0, 0, 36, 0], [1.5, 0, 38, 0]], fov: 60, dof: false, drift: 0.3, scenery: true, subject: [[73, 57, -73]] },
    // 10. the reveal: the whole city from high on its south axis, the forest and hills round it (1x: the drift after)
    reveal: { path: [[0, 0, 112, 128], [1.5, 0, 107, 121]], lookPath: [[0, 0, 10, -2], [1.5, 0, 10, -2]], fov: 62, dof: false, drift: 0.3, scenery: true, subject: [[0, 5.5, 0]] },   // (under the clouds: at 130 up the frame was in them, a white haze)
    // 11. the close pass: low beside 56e and the fountain, sliding past, the towers over them (1x)
    pass: { path: [[0, -8.5, 2.2, 0.5], [2.0, -8.2, 2.3, 3.0]], lookPath: [[0, 10, 12, -2], [2.0, 10, 13, -1]], fov: 70, dof: false, drift: 0.3, scenery: true, subject: [[-4, 2.5, 2]] }   // (between two lamp posts, clear of both: r1)
  }
})
