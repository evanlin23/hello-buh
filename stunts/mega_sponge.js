// Format "mega" (owner, 2026-11-11, r:r8bb1e3: "new format to try"): "rate my starter house" over a level-4 Menger sponge,
// 81 blocks a side and 160,000 blocks. v4, owner 2026-11-12 on v3 at 18.3 s: "i feel like im wasting my time watching
// this. maybe we should be like building it and then just zoom out." So the long elytra fly-through is gone: a fast
// drone time-lapse of the sponge being built (lib/mega_lapse.js), then one big zoom out from 56e at its foot to the
// whole thing over the forest, then the end.
//
// The build reads as the fractal appearing: the 20 sub-cubes rise from the ground together, three layers a step; then
// the holes cut through them level by level (27 big tunnels, 243 smaller, 2187 smallest), so it sharpens into the
// sponge; on the cut to the zoom the glowing edges and the little froglight sponge in the hollow middle come on (the
// payoff: flash, punch, the drop) and the camera pulls back from beside 56e until he is a speck at its corner.
//
// Beats (Short seconds, ~10 s): 0 low off the south-west corner, the cubes rising | 2.7 a face head-on, the big and
// middle holes cut through | 4.9 high off the south-east, the smallest holes | 7.4 the zoom: the lights on, from beside
// 56e out to the whole sponge over the forest, him a speck | end 1.0 s later.
// Local coordinates (lib/mega_lapse.js): x/z from the sponge's middle, y 0 the ground's top; the sponge spans x/z
// -40..40, y 1..81; 56e stands outside its south-west corner, looking up at it.
const L = require('../lib/mega_lapse')
const mega = require('../lib/mega')

const LV = 4, N = 81, H = 40
const BODY = 'deepslate_tiles'
const at = (b) => [b[0] - H, b[1] + 1, b[2] - H, b[3] - H, b[4] + 1, b[5] - H]   // sponge cells -> local

// the solid sub-cubes of side 27 (level 1: no position with two 1-digits)
const CUBES = []
for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) if ([a, b, c].filter(v => v === 1).length < 2) CUBES.push([a, b, c])

// 1. the 20 cubes rise from the ground together, three layers a step
function rise () {
  const boxes = []
  for (const [a, b, c] of CUBES) for (let y = 0; y < 27; y += 3) {
    const y0 = b * 27 + y
    if (y0 === 0) continue                                 // (the first slab stands at frame 0: FIRST, placed in setup)
    boxes.push({ box: at([a * 27, y0, c * 27, a * 27 + 26, y0 + 2, c * 27 + 26]), block: BODY, step: Math.floor(y0 / 3) })
  }
  return { name: 'rise', ticks: 54, boxes }
}

// the carve prisms of digit position j (menger(): cells whose j-th digits are both 1 on two axes), sweeping along the face
function carves (j) {
  const s = 3 ** (LV - 1 - j), cells = 3 ** j, ones = [], boxes = []
  for (let c = 0; c < cells; c++) ones.push([c * 3 * s + s, c * 3 * s + 2 * s - 1])
  ones.forEach(([a0, a1], ia) => ones.forEach(([b0, b1], ib) => {
    const step = ia * cells + ib
    for (const b of [[a0, b0, 0, a1, b1, N - 1], [a0, 0, b0, a1, N - 1, b1], [0, a0, b0, N - 1, a1, b1]]) for (const p of mega.split(b)) boxes.push({ box: at(p), block: 'air', step })
  }))
  return boxes
}
// the first three layers of the 8 bottom cubes, placed in setup (owner r:r0f3da0: frame 0 shows the subject; v4 take 1
// opened on an empty lawn, the first slab landing a tick later)
const FIRST = CUBES.filter(([, b]) => b === 0).map(([a, , c]) => [...at([a * 27, 0, c * 27, a * 27 + 26, 2, c * 27 + 26]), BODY])
const carve2 = () => ({ name: 'carve2', ticks: 12, boxes: carves(1) })
const carve3 = () => ({ name: 'carve3', ticks: 30, boxes: carves(2) })
const carve4 = () => ({ name: 'carve4', ticks: 50, boxes: carves(3) })

// the payoff, in one tick on the cut: the glowing edges of the 20 cubes (no carve ever reaches an edge cell) and the small
// froglight sponge hung in the hollow middle
function lights () {
  const boxes = []
  for (const [a, b, c] of CUBES) {
    const x0 = a * 27, y0 = b * 27, z0 = c * 27, x1 = x0 + 26, y1 = y0 + 26, z1 = z0 + 26
    for (const p of [x0, x1]) for (const q of [y0, y1]) boxes.push({ box: at([p, q, z0, p, q, z1]), block: 'sea_lantern' })
    for (const p of [x0, x1]) for (const r of [z0, z1]) boxes.push({ box: at([p, y0, r, p, y1, r]), block: 'sea_lantern' })
    for (const q of [y0, y1]) for (const r of [z0, z1]) boxes.push({ box: at([x0, q, r, x1, q, r]), block: 'sea_lantern' })
  }
  const core = mega.menger(2, { body: 'ochre_froglight' }), off = (N - 9) / 2
  for (const p of core.plan) boxes.push({ box: at(p.box.map((v) => v + off)), block: p.block })
  return { name: 'lights', ticks: 1, boxes }
}

module.exports = L.makeLapse({
  name: 'mega_sponge',
  caption: 'rate my starter house',
  biome: 'minecraft:flower_forest',
  near: [-2757, -206],                  // the flower forest of every earlier take (ground 63-83)
  fieldBiome: 'minecraft:flower_forest',
  time: 11300,                          // late afternoon, a low warm sun on the west face
  look: { mood: 'golden_hour', bloom: 0.35, bloomThreshold: 0.86, bloomPasses: 1, sharpen: 0.4, rays: 0.5, raysOverBlocks: 0.3, shadows: true, vignette: 0.3, grain: 0.01 },
  field: 46, height: 100, clearTrees: 6,   // only the sponge's own ground levelled; the forest stands round it
  renderDistance: 16, recordRadius: 256,
  chunkStops: [[-160, -160], [160, -160], [-160, 160], [160, 160]],
  botTimeout: 1200,
  player: { at: [-44, 44], yaw: -45, pitch: -30 },   // 56e just off the south-west corner, inside the levelled ground, looking up at it
  startSound: 'block.stone.place',
  dress: FIRST,
  stages: [rise(), carve2(), carve3(), carve4(), lights()],
  perTick: 60,
  angles: [['rise', 'rise'], ['carve2', 'face'], ['carve4', 'high']],
  payoff: { stage: 'lights', shot: 'zoom', hold: 40, toast: false, sound: 'block.beacon.activate' },
  endAfter: 1.0,
  shots: {
    // 1. high off the south-west over the forest: the footprint at frame 0, the cubes rising, the drone easing up with them
    rise: { path: [[0, -100, 60, 100], [2.7, -92, 64, 92]], lookPath: [[0, 0, 6, 0], [2.7, 0, 34, 0]], fov: 60, dof: false, drift: 0.4, scenery: true, subject: [[0, 10, 0]] },   // (high over the forest, above every hill: from the levelled ground the rising corner column filled the frame)
    // 2. the west face head-on, pushing in a little: the big and middle tunnels cut through it
    face: { path: [[0, -128, 44, 10], [2.2, -116, 44, 4]], lookPath: [[0, 0, 41, 0], [2.2, 0, 41, 0]], fov: 58, dof: false, drift: 0.3, scenery: true, subject: [[-41, 41, 0]] },
    // 3. high off the south-east, down across the top: the smallest holes sharpen it
    high: { path: [[0, 98, 116, 82], [2.5, 90, 110, 74]], lookPath: [[0, 4, 62, -2], [2.5, 0, 60, -4]], fov: 62, dof: false, drift: 0.3, scenery: true, subject: [[0, 82, 0]] },
    // 4. the zoom (1x): from just behind 56e at the corner's foot, looking up, out fast to the whole sponge over the forest
    zoom: { path: [[0, -46.5, 3.4, 46.5], [0.95, -112, 62, 118], [2.0, -118, 66, 124]], lookPath: [[0, -24, 7, 24], [0.95, 0, 44, 0], [2.0, 0, 44, 0]], fov: 66, dof: false, drift: 0.2, scenery: true, subject: ['self'] }   // (starts inside the levelled ground, 56e in the lower frame)
  }
})
