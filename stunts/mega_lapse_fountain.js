// Format "mega", time-lapse variant (owner, 2026-11-11, r:r4449f0: "this gimmick is like ridiculous megabuild"),
// Short 1: the caption asks for "a small fountain at spawn"; the fountain goes in (1 s), then the drone time-lapse keeps
// going: a plaza, a ring wall with eight towers, a ring of houses, a square terrace 12 blocks high round it all, a town
// on the terrace, a second terrace, corner towers, four 70-block towers, and on the cut to the wide reveal every tower
// gets its gold tip and the lanterns come on. The fountain is still there in the middle of the last shot: the joke.
// Our own take (lib/mega_lapse.js): our city (white quartz, teal roofs, garden terraces, a round core in a square
// town), our caption, our angles; not the reference's tiered mountain city.
//
// Beats (Short seconds, ~17.5 s; the build is the recording, in real time): 0 close and low on the fountain going in,
// pulling back as the plaza spreads | 2.5 the ring wall and its towers (a three-quarter angle) | 4.9 the houses (high,
// sliding round) | 7.3 outside, low: the terrace's outer face rises across the frame | 9.3 high over the corner: the town
// on the terrace | 11.1 the far side, low: the second terrace and the corner towers | 13.1 from the plaza, the
// fountain in front: the four great towers rise behind the walls | 15.8 the wide reveal from high (gold tips, lanterns:
// flash, punch, the drop), the fountain small in the middle | end 1 s later.
const L = require('../lib/mega_lapse')
const { kit } = L

const W = 'smooth_quartz', B = 'stone_bricks', R = 'dark_prismarine', G = 'light_blue_stained_glass'
const GOLD = 'gold_block', LAMP = 'sea_lantern', PAVE = 'polished_andesite'
const A1 = 38, A2 = 58, AO = 76          // the terraces: tier 1 from half-size A1 to AO (top y 12), tier 2 from A2 (top y 26)
const T1 = 12, T2 = 26
const GIANTS = [[-56, -56], [56, -56], [-56, 56], [56, 56]]
const CORNERS = [[-AO, -AO], [AO, -AO], [-AO, AO], [AO, AO]]
const GIANT_TOP = 72

// a stable pseudo-random number per lot (the same city every take)
const rnd = (i, k = 1) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v) }

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
  return { name: 'plaza', ticks: 26, cells: c }
}

function walls () {
  const c = []
  for (let x = -19; x <= 19; x++) for (let z = -19; z <= 19; z++) {
    const d = Math.hypot(x, z)
    if (d < 17 || d > 18.6) continue
    const gate = (Math.abs(x) <= 1 || Math.abs(z) <= 1)
    for (let y = 1; y <= 8; y++) {
      if (gate && y <= 4) continue
      c.push([x, y, z, y <= 1 ? B : y === 8 ? 'chiseled_quartz_block' : W, y])
    }
    if ((x + z) % 2 === 0) c.push([x, 9, z, W, 9])                      // merlons
  }
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8
    kit.tower(c, Math.round(Math.cos(a) * 17.8), Math.round(Math.sin(a) * 17.8), 2.6, 1, 12, { roofH: 5, win: 5 })
  }
  return { name: 'walls', ticks: 48, cells: c }
}

function houses () {
  const c = [], lots = []
  for (const [r, n] of [[24, 16], [30.5, 22]]) for (let k = 0; k < n; k++) lots.push({ r, a: (k + (r > 25 ? 0.5 : 0)) * 2 * Math.PI / n - Math.PI })
  lots.sort((p, q) => p.a - q.a)                                       // a wave round the ring
  lots.forEach((l, i) => {
    const cx = Math.round(Math.cos(l.a) * l.r), cz = Math.round(Math.sin(l.a) * l.r)
    if (Math.abs(cx) <= 3 || Math.abs(cz) <= 3) return                 // the streets out of the four gates
    const w = 5, d = 5, h = 4 + Math.floor(rnd(i) * 3)
    kit.house(c, cx - 2, cz - 2, w, d, 1, h, { step: (y) => i * 3 + (y < 1 + h ? 0 : 1), roof: rnd(i, 2) < 0.75 ? R : 'prismarine_bricks' })
  })
  return { name: 'houses', ticks: 48, cells: c }
}

function tier1 () {
  const b = []
  // the inner and the outer face rise together, a layer at a time: a stone base, quartz, a window band, a cornice
  const blk = (y) => y <= 2 ? B : y === 6 ? G : y === T1 - 1 ? 'chiseled_quartz_block' : W
  for (let y = 1; y <= T1 - 1; y++) { kit.squareRing(b, A1 - 1, A1, y, y, blk(y)); kit.squareRing(b, AO - 1, AO, y, y, blk(y)) }
  kit.squareRing(b, A1 - 1, AO, T1, T1, 'grass_block', () => T1)     // the garden top
  kit.squareRing(b, A1 - 1, A1, T1 + 1, T1 + 1, W, () => T1 + 1)      // a parapet round the inner edge
  return { name: 'tier1', ticks: 40, boxes: b }
}

function town1 () {
  const c = []
  let i = 0
  const y0 = T1 + 1
  // two rows of houses along each side (the four corners keep room for the great towers), swept round
  for (const off of [44, 52]) {
    for (let side = 0; side < 4; side++) {
      for (let t = -42; t <= 42; t += 10) {
        if (Math.abs(t) < 4) continue                                   // the avenue to the middle
        const [cx, cz] = side === 0 ? [t, -off] : side === 1 ? [off, t] : side === 2 ? [-t, off] : [-off, -t]
        const h = 4 + Math.floor(rnd(i, 3) * 4)
        kit.house(c, cx - 3, cz - 3, 6, 6, y0, h, { step: side * 100 + (t + 50) + (off > 48 ? 5 : 0), roof: rnd(i, 4) < 0.7 ? R : 'prismarine_bricks' })
        i++
      }
    }
  }
  return { name: 'town1', ticks: 36, cells: c }
}

function tier2 () {
  const b = []
  const blk = (y) => y === T1 + 1 ? B : y === 19 ? G : y === T2 - 1 ? 'chiseled_quartz_block' : W
  for (let y = T1 + 1; y <= T2 - 1; y++) { kit.squareRing(b, A2 - 1, A2, y, y, blk(y)); kit.squareRing(b, AO - 1, AO, y, y, blk(y)) }
  kit.squareRing(b, A2 - 1, AO, T2, T2, 'grass_block', () => T2)
  kit.squareRing(b, A2 - 1, A2, T2 + 1, T2 + 1, W, () => T2 + 1)
  const c = []
  // the corner towers, from the ground up past the terraces, rising with them two layers a step
  for (const [x, z] of CORNERS) kit.tower(c, x, z, 6, 1, 40, { roofH: 10, win: 7, step: (y) => T1 + 1 + Math.floor(y / 2) })
  // tall blocks of houses on the top terrace
  let i = 0
  for (let side = 0; side < 4; side++) {
    for (let t = -50; t <= 50; t += 11) {
      if (Math.abs(t) < 5) continue
      const [cx, cz] = side === 0 ? [t, -67] : side === 1 ? [67, t] : side === 2 ? [-t, 67] : [-67, -t]
      kit.house(c, cx - 3, cz - 3, 7, 7, T2 + 1, 6 + Math.floor(rnd(i, 5) * 5), { step: 60 + side * 3 + Math.floor((t + 50) / 30) })
      i++
    }
  }
  return { name: 'tier2', ticks: 40, boxes: b, cells: c }
}

function giants () {
  const c = []
  for (const [x, z] of GIANTS) kit.tower(c, x, z, 6, T1 + 1, GIANT_TOP, { roofH: 12, win: 6, step: (y) => Math.floor(y / 2) })
  return { name: 'giants', ticks: 54, cells: c }
}

// the payoff, all in one tick on the reveal cut: a gold spire on every tower, the lanterns along both terraces' edges
function lights () {
  const c = []
  for (const [x, z] of GIANTS) {
    for (let k = 0; k < 6; k++) c.push([x, GIANT_TOP + 14 + k, z, GOLD])
    for (const p of kit.ring([], 6.6, 7.3, GIANT_TOP + 1, LAMP)) c.push([x + p[0], p[1], z + p[2], LAMP])
  }
  for (const [x, z] of CORNERS) for (let k = 0; k < 4; k++) c.push([x, 40 + 12 + k, z, GOLD])
  for (const [a, y] of [[A1, T1 + 1], [A2, T2 + 1]]) for (let t = -a; t <= a; t += 4) c.push([t, y, -a, LAMP], [t, y, a, LAMP], [-a, y, t, LAMP], [a, y, t, LAMP])
  c.push([0, 4, 0, GOLD])                                               // and a gold block on the fountain
  return { name: 'lights', ticks: 1, cells: c }
}

module.exports = L.makeLapse({
  name: 'mega_lapse_fountain',
  caption: 'the server asked me for a small fountain at spawn',
  red: 'small',
  time: 11300,                           // late afternoon: a low warm sun across the white walls (mega_sponge's light)
  look: { mood: 'golden_hour', bloom: 0.35, bloomThreshold: 0.86, bloomPasses: 1, sharpen: 0.4, rays: 0.4, raysOverBlocks: 0.3, shadows: true, vignette: 0.25, grain: 0.01 },
  stages: [fountain(), plaza(), walls(), houses(), tier1(), town1(), tier2(), giants(), lights()],
  perTick: 60,
  // each stage its own steady drone angle, joined by hard cuts (r:r66efa4); every move slow and even
  angles: [['fountain', 'close'], ['walls', 'ring'], ['houses', 'houses'], ['tier1', 'face'], ['town1', 'town'], ['tier2', 'far'], ['giants', 'giants']],
  payoff: { stage: 'lights', shot: 'reveal', hold: 30 },
  shots: {
    // 1. close and low on the fountain, pulling back and up as the plaza spreads round it
    close: { path: [[0, 5.5, 3.2, 7.5], [2.6, 10, 6.5, 13.5]], lookPath: [[0, 0, 1.2, 0], [2.6, 0, 0.5, 0]], fov: 64, dof: false, drift: 0.4, scenery: true, subject: [[0, 1.5, 0]] },
    // 2. a three-quarter angle on the ring wall as it rises, its towers and their roofs
    ring: { path: [[0, 30, 17, 36], [2.4, 22, 16, 40]], lookPath: [[0, 0, 5, 0], [2.4, 0, 5, 0]], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [[0, 6, 0]] },
    // 3. high, sliding round: the houses fill the ring outside the wall
    houses: { path: [[0, -44, 36, 30], [2.4, -50, 33, 16]], lookPath: [[0, 0, 2, 0], [2.4, 0, 2, 0]], fov: 64, dof: false, drift: 0.4, scenery: true, subject: [[0, 4, 0]] },
    // 4. outside, low: the terrace's outer face rises across the frame and shuts the town out of view
    face: { path: [[0, 22, 6, 112], [2.0, 30, 8, 106]], lookPath: [[0, 4, 9, 0], [2.0, 8, 10, 0]], fov: 60, dof: false, drift: 0.4, scenery: true, subject: [[0, 8, 76]] },
    // 5. high over the south-east corner: the town spreading over the terrace
    town: { path: [[0, 92, 58, 92], [1.8, 86, 54, 98]], lookPath: [[0, 10, 8, 10], [1.8, 8, 8, 12]], fov: 60, dof: false, drift: 0.4, scenery: true, subject: [[50, 16, 50]] },
    // 6. the far (north-west) side, low: the second terrace and the corner towers going up
    far: { path: [[0, -104, 12, -58], [2.0, -98, 14, -70]], lookPath: [[0, 0, 24, 0], [2.0, 0, 24, 0]], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [[-76, 30, -76]] },
    // 7. from the plaza, the fountain in front: the four great towers rise behind the walls
    giants: { path: [[0, -12, 5, -12], [2.7, -10, 4.5, -10]], lookPath: [[0, 24, 18, 24], [2.7, 24, 20, 24]], fov: 72, dof: false, drift: 0.3, scenery: true, subject: [[0, 2, 0], [56, 50, 56]] },
    // 8. the reveal: the whole city from high, the fountain small in the middle, a slow push
    reveal: { path: [[0, 70, 118, 100], [1.6, 64, 112, 92]], lookPath: [[0, 0, 4, 0], [1.6, 0, 4, 0]], fov: 64, dof: false, drift: 0.3, scenery: true, subject: [[0, 4, 0]] }
  }
})
