// Format "mega", time-lapse variant, ridiculously big (owner, 2026-11-11, r:rf8524b "huge mega build, like ridiculously
// big", r:rce78c5 the ticking block count): the caption asks for "a small fox statue"; a drone time-lapse builds a
// sleeping fox 177 blocks long and 62 high in a clearing of a real taiga forest, a "blocks used" total ticking in the
// corner. The paws and the snout go in beside 56e (a statue his size, for a second), then the head, the body and the
// curled tail, each from its own drone angle, the spruce forest round it for scale. On the cut to the high reveal the
// ears, the closed eyes and the nose land (flash, punch, the drop; the total turns gold), and the last shot is a close,
// low pass beside the tiny player, the fox's face towering over him, as it snores.
// Our own design: a sleeping fox (not a grass block, not a golem, not a nether boss); lib/mega_lapse.js does the work.
//
// Beats (Short seconds, ~13.6 s): 0 low behind 56e, the paws and the snout rise in front of him | 2.2 the head, from
// the front and to the side | 4.7 the body, high from behind | 7.5 the tail, over the forest | 9.7 the reveal: the
// face lands, high over the forest (the drop) | 11.5 the close pass beside 56e (a snore; "SMALL") | end 1.6 s later.
const L = require('../lib/mega_lapse')

const OR = 'orange_wool', WH = 'white_wool', BK = 'black_wool'
// the fox is drawn in its own coordinates (head to the west, -x; its tail curled round the south side, +z), then
// shifted so the field's centre is the middle of its footprint
const OX = 24, OZ = -12
const PLAYER = [-120 + OX, 0 + OZ]        // 56e: 8 blocks in front of the snout, on its axis

// a box in fox coordinates -> a lapse box in the field's, its step the layer (y) it rises with
const bx = (out, x0, y0, z0, x1, y1, z1, block, step) => {
  for (let y = y0; y <= y1; y++) out.push({ box: [x0 + OX, y, z0 + OZ, x1 + OX, y, z1 + OZ], block, step: step ? step(y) : y })
  return out
}
// a block of fur with its top three layers stepped in (a rounded back, not a crate)
const loaf = (out, x0, z0, x1, z1, top, block, step) => {
  bx(out, x0, 1, z0, x1, top - 3, z1, block, step)
  for (let k = 1; k <= 3; k++) bx(out, x0 + k, top - 3 + k, z0 + k, x1 - k, top - 3 + k, z1 - k, block, step)
  return out
}

// 1. the front paws (black), either side of where the snout goes: the "small statue" for a second
function paws () {
  const b = []
  bx(b, -104, 1, -30, -89, 8, -20, BK); bx(b, -104, 1, 20, -89, 8, 30, BK)
  return { name: 'paws', ticks: 18, boxes: b }
}

// 2. the snout (white), resting on the ground between the paws
function snout () {
  const b = []
  loaf(b, -112, -16, -89, 16, 16, WH, (y) => 20 + y)
  return { name: 'snout', ticks: 26, boxes: b }
}

// 3. the head: orange, a white face and cheeks below the eyes
function head () {
  const b = []
  for (let y = 1; y <= 44; y++) {
    const k = Math.max(0, y - 41)                       // the stepped-in top
    bx(b, -88 + k, y, -32 + k, -40 - k, y, 32 - k, OR)
    if (y <= 18) {                                      // the white face (2 deep) and cheeks on both sides
      bx(b, -88, y, -32, -87, y, 32, WH)
      bx(b, -86, y, -32, -70, y, -31, WH); bx(b, -86, y, 31, -70, y, 32, WH)
    }
  }
  return { name: 'head', ticks: 50, boxes: b }
}

// 4. the body: lying low behind the head, a white chest on both sides at the front, a black hind paw on the north side
function body () {
  const b = []
  for (let y = 1; y <= 40; y++) {
    const k = Math.max(0, y - 37)
    bx(b, -40 + k, y, -24 + k, 48 - k, y, 24 - k, OR)
    if (y <= 20) { bx(b, -40, y, -24, -24, y, -24, WH); bx(b, -40, y, 24, -24, y, 24, WH) }
    if (y <= 8) bx(b, 28, y, -32, 44, y, -25, BK)
  }
  return { name: 'body', ticks: 56, boxes: b }
}

// 5. the tail: a fat round brush curled from the back round the south side to the paws, its tip white
function tail () {
  const b = []
  const R = 15, CY = 15                                 // the cross-section: 15 up, 16 across, centred 15 up
  for (let y = 1; y <= 30; y++) {
    const w = Math.floor(16 * Math.sqrt(Math.max(0, 1 - ((y - CY) / R) ** 2)))
    if (w < 1) continue
    // the root: across the back of the body (x 40..64), from the middle of the back out to the side
    const wx = Math.floor(12 * Math.sqrt(Math.max(0, 1 - ((y - CY) / R) ** 2)))
    bx(b, 52 - wx, y, 10, 52 + wx, y, 41, OR)
    // the long run along the south side, toward the paws, the last 26 blocks white
    bx(b, -65, y, 41 - w, 56, y, 41 + w, OR)
    bx(b, -92, y, 41 - w, -66, y, 41 + w, WH)
  }
  return { name: 'tail', ticks: 44, boxes: b }
}

// 6. the payoff, in one tick on the reveal cut: the ears (black tips, white inside), the closed eyes, the nose
function face () {
  const c = []
  const cells = (x0, y0, z0, x1, y1, z1, block) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) c.push([x + OX, y, z + OZ, block, 0])
  }
  for (const [z0, z1] of [[-29, -16], [16, 29]]) {
    cells(-76, 45, z0, -68, 56, z1, OR)
    cells(-76, 57, z0, -68, 62, z1, BK)
    cells(-77, 47, z0 + 3, -77, 55, z1 - 3, WH)       // the inside of the ear, on its front face
  }
  cells(-88, 26, -26, -88, 28, -13, BK); cells(-88, 26, 13, -88, 28, 26, BK)   // eyes shut: two black lines
  cells(-112, 8, -6, -111, 13, 6, BK)                                          // the nose
  return { name: 'face', ticks: 1, cells: c }
}

// the camera's points, in the field's coordinates
const P = (x, y, z) => [x + OX, y, z + OZ]
const cam = (t, [x, y, z]) => [t, x, y, z]

module.exports = L.makeLapse({
  name: 'mega_lapse_fox',
  caption: 'my friend asked for a small fox statue',
  red: 'small',
  biome: 'minecraft:taiga',
  fieldBiome: 'minecraft:taiga',
  time: 6500,                            // midday: the orange fur bright against the dark spruces
  look: { mood: 'golden_hour', bloom: 0.3, bloomThreshold: 0.88, bloomPasses: 1, sharpen: 0.4, rays: 0.3, raysOverBlocks: 0.2, shadows: true, vignette: 0.2, grain: 0.01 },
  field: [104, 56],                      // the clearing: the fox's footprint (177 x 90) plus room for 56e at the snout
  height: 80,
  clearTrees: 6,                         // no half-cut trees at the clearing's edge; the forest beyond stays
  renderDistance: 16, recordRadius: 256, // the reveal looks out over the forest: no missing chunks at the frame's edge
  chunkStops: [[-160, -160], [160, -160], [-160, 160], [160, 160]],
  botTimeout: 1200,
  player: { at: PLAYER, yaw: -90, pitch: -20 },   // facing east, up at the fox (mineflayer yaw -90 = east)
  tally: 'blocks used',
  stages: [paws(), snout(), head(), body(), tail(), face()],
  perTick: 60,
  angles: [['paws', 'close'], ['head', 'front'], ['body', 'back'], ['tail', 'forest']],
  payoff: { stage: 'face', shot: 'reveal', hold: 36, sound: 'block.beacon.activate' },
  // the close pass beside the tiny player, the face towering over him; the fox snores (a vanilla sleeping fox's sound)
  outro: [{
    shot: 'pass', mark: 'pass', ticks: 40,
    async at (ctx) { ctx.sound('entity.fox.sleep', 1, 0.55); ctx.sound('entity.fox.sleep', 0.8, 0.5) }
  }],
  endAfter: 1.6,
  edit: {
    // the payoff's hit on the final mix (mixcheck): the drop on the reveal with a dip and an impact; a second dip
    // under the snore on the pass, and the punchline card there
    sfx: [['dip', 'reveal', 0.4], ['impact', 'reveal', { gain: 1.3 }], ['dip', 'pass', 0.5]],
    cards: [['pass', 'SMALL', 1.6, 'yellow', 0, null, { y: 0.24 }]]
  },
  shots: {
    // (every point in the fox's own coordinates; 56e stands at (-120, 1, 0), facing east up at the snout)
    // 1. low behind 56e's left shoulder: the paws and the snout rise in front of him, the drone easing back and up
    close: { path: [cam(0, P(-134, 3.4, -9)), cam(2.2, P(-142, 9, -16))], lookPath: [cam(0, P(-100, 5, 0)), cam(2.2, P(-98, 9, 0))], fov: 66, dof: false, drift: 0.4, scenery: true, subject: [P(-120, 1.8, 0), P(-113, 8, 0)] },
    // 2. out in front and to the north: the head rises behind the snout, 56e a speck at its foot
    front: { path: [cam(0, P(-184, 26, -80)), cam(2.5, P(-190, 34, -84))], lookPath: [cam(0, P(-74, 18, 0)), cam(2.5, P(-70, 22, 0))], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [P(-89, 30, -10)] },
    // 3. high behind it, the forest round the clearing: the long body fills in behind the head
    back: { path: [cam(0, P(170, 96, -110)), cam(2.8, P(160, 100, -124))], lookPath: [cam(0, P(-14, 12, 0)), cam(2.8, P(-18, 12, 0))], fov: 60, dof: false, drift: 0.4, scenery: true, subject: [P(10, 41, 0)] },
    // 4. over the spruces on the south side: the tail curls round across the frame
    forest: { path: [cam(0, P(30, 46, 160)), cam(2.2, P(14, 48, 162))], lookPath: [cam(0, P(-12, 12, 36)), cam(2.2, P(-20, 12, 36))], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [P(-10, 15, 58)] },
    // 5. the reveal: high to the south-west over the forest, the whole fox and the taiga round it, a slow push
    reveal: { path: [cam(0, P(-176, 130, 120)), cam(1.8, P(-168, 124, 113))], lookPath: [cam(0, P(-30, 10, 8)), cam(1.8, P(-30, 10, 8))], fov: 60, dof: false, drift: 0.3, scenery: true, subject: [P(-30, 41, 0)] },
    // 6. the close pass: low, sliding behind 56e from his left to his right, the fox's face filling the sky above him
    pass: { path: [cam(0, P(-128, 2.4, -6)), cam(2.0, P(-128, 2.6, 6))], lookPath: [cam(0, P(-96, 18, -2)), cam(2.0, P(-96, 18, 2))], fov: 74, dof: false, drift: 0.2, scenery: true, subject: [P(-120, 1.8, 0), P(-88, 40, 0)] }
  }
})
