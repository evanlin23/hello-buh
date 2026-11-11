// Format "mega", time-lapse variant, ridiculously big (owner, 2026-11-11, r:rf8524b "huge mega build, like ridiculously
// big", r:rce78c5 the ticking block count): the caption asks for "a small fox statue"; a drone time-lapse builds a
// sleeping fox 177 blocks long and 62 high in a clearing of a real taiga forest, a "blocks used" total ticking in the
// corner. The paws and the snout go in beside 56e (a statue his size, for a second), then the head, the body and the
// curled tail, each from its own drone angle, the spruce forest round it for scale. On the cut to the high reveal the
// ears, the closed eyes and the nose land (flash, punch, the drop; the total turns gold), and the last shot is a close,
// low pass beside the tiny player, the fox's face towering over him, as it snores.
// Our own design: a sleeping fox (not a grass block, not a golem, not a nether boss); lib/mega_lapse.js does the work.
//
// Beats (Short seconds, ~13.1 s): 0 low by the paws, the paws and the snout rise | 2.2 the head, from
// the front and to the side | 4.7 the body, high from behind | 7.5 the tail, over the forest | 9.7 the reveal: the
// face lands, high over the forest (the drop) | 11.5 the close pass beside 56e (a snore; "SMALL") | end 1.6 s later.
const L = require('../lib/mega_lapse')

const OR = 'orange_wool', WH = 'white_wool', BK = 'black_wool'
// the fox is drawn in its own coordinates (head to the west, -x; its tail curled round the south side, +z), then
// shifted so the field's centre is the middle of its footprint
const OX = 24, OZ = -12
const PLAYER = [-140 + OX, 0 + OZ]        // 56e: 28 blocks in front of the snout, on its axis (the whole face behind him)

// the fox is voxels: each part a shape test + its colouring, swept over its bounds a layer (y) at a time; the lapse
// compresses each layer to /fill boxes. Rounded forms (superellipsoids), fur tufts and overhangs, a darker spine and
// tail rings, cheek tufts and a brow (owner r:r13865d: depth and detail, never flat)
const DK = 'orange_terracotta'
const se = (dx, dy, dz, a, b, c, p = 4) => Math.abs(dx / a) ** p + Math.abs(dy / b) ** p + Math.abs(dz / c) ** p <= 1
const ell = (dx, dy, dz, a, b, c) => (dx / a) ** 2 + (dy / b) ** 2 + (dz / c) ** 2 <= 1
function vox (name, ticks, [x0, x1, y0, y1, z0, z1], fn, step = (y) => y) {
  const cells = []
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const blk = fn(x, y, z)
    if (blk) cells.push([x + OX, y, z + OZ, blk, step(y)])
  }
  return { name, ticks, cells }
}

// the shapes (fox coordinates)
const inBody = (x, y, z) => y >= 1 && se(x - 4, y - 1, z, 46, 41, 25, 3)
const inHaunch = (x, y, z) => y >= 1 && ell(x - 24, y - 6, z + 18, 22, 20, 14)
const inHead = (x, y, z) => y >= 1 && se(x + 64, y - 1, z, 25, 44, 33, 4)
const inSnout = (x, y, z) => y >= 1 && se(x + 100, y - 1, z, 13, 16, 16, 3)
const TZ = 41                                           // the tail's run along the south side
const tailR = (x) => x > 40 ? 11 : 11 + 5 * Math.sin(Math.PI * Math.min(1, (40 - x) / 120))  // fat in the middle
function inTail (x, y, z) {
  if (y < 1) return false
  if (x >= 40 && x <= 64 && z >= 6 && z <= TZ && ell(x - 52, y - 11, 0, 12, 11, 1)) return true   // the root, round the back
  if (x > 60 || x < -96) return false
  const r = tailR(x), cx = Math.max(x, -92 + r)        // a round end at the tip
  return ell(x - cx, y - r, z - TZ, x < -92 + r ? r : 1e9, r, r * 1.1)
}

// 1. the front legs and paws: orange forelegs from the chest, black paws with toes, either side of the snout
function paws () {
  return vox('paws', 18, [-106, -38, 1, 11, -32, 32], (x, y, z) => {
    const az = Math.abs(z)
    if (az < 18 || az > 31) return null
    if (x <= -92) return (y <= 7 && (x > -105 || (az % 4) !== 1)) ? BK : null   // toes: a notch every 4
    return se(x + 66, y - 1, az - 24.5, 27, 10, 6.5, 4) ? OR : null
  })
}

// 2. the snout: white, rounded, resting on the ground between the paws
function snout () {
  return vox('snout', 26, [-114, -86, 1, 17, -17, 17], (x, y, z) => inSnout(x, y, z) ? WH : null, (y) => 20 + y)
}

// 3. the head: orange, a white face and cheeks, cheek tufts flaring out, a brow over the eyes, a darker crown
function head () {
  return vox('head', 50, [-92, -36, 1, 45, -40, 40], (x, y, z) => {
    const az = Math.abs(z)
    if (inHead(x, y, z)) {
      if (y >= 37 && az < 9) return DK                             // the crown
      if (y <= 18 && (x < -84 || az > 28)) return WH                // the face and cheeks
      return OR
    }
    // cheek tufts: white fur flaring out from the jaw, ragged at the edge
    if (az >= 30 && az <= 38 && y >= 2 && y <= 16 && x >= -88 && x <= -66 && (38 - az) > ((y + x) % 4) && (x + 88) > (az - 30) * 1.5) return WH
    // the brow: a ledge over each eye
    if (x >= -91 && x <= -89 && y >= 30 && y <= 31 && az >= 11 && az <= 28 && inHead(x + 3, y, z)) return DK
    return null
  })
}

// 4. the body: a long rounded loaf, the haunch bulging on the north side with its black paw, a white chest, a darker
// spine with tufts of fur standing up along it
function body () {
  return vox('body', 56, [-44, 52, 1, 46, -38, 26], (x, y, z) => {
    const inB = inBody(x, y, z), inH = inHaunch(x, y, z)
    if (inB || inH) {
      if (x < -28 && y <= 22 && Math.abs(z) > 14) return WH         // the chest
      if (y >= 36 && Math.abs(z) < 7) return DK                     // the spine
      return OR
    }
    // the hind paw, tucked under the haunch
    if (x >= 28 && x <= 46 && z >= -35 && z <= -26 && y <= 6) return BK
    // tufts: every 9 blocks along the spine a ragged ridge standing 2-4 above the back (overhangs at the ends)
    const k = ((x + 400) % 9)
    if (k <= 4 && Math.abs(z) <= 5 - (k === 0 || k === 4 ? 2 : 0) && inBody(x, y - 2 - (k === 2 ? 2 : k % 2), z) && !inBody(x, y, z)) return DK
    return null
  })
}

// 5. the tail: a fat brush curled round the south side to the paws, darker rings along it, a white ragged tip
function tail () {
  return vox('tail', 44, [-96, 64, 1, 33, 4, 60], (x, y, z) => {
    if (!inTail(x, y, z)) return null
    if (x < -64 + ((y + z) % 3)) return WH
    if (x <= 40 && ((x + 400) % 26) < 3) return DK                  // the rings
    return OR
  })
}

// 6. the payoff, in one tick on the reveal cut: the ears (black tips, white inside), the closed eyes, the nose
function face () {
  const c = []
  const put = (x, y, z, b) => c.push([x + OX, y, z + OZ, b, 0])
  for (const s of [-1, 1]) {
    for (let y = 44; y <= 64; y++) {
      const h = (y - 44) / 20, half = Math.round(9 - 6 * h), cz = 22 * s
      for (let x = -76; x <= -70; x++) for (let z = cz - half; z <= cz + half; z++) {
        if (!(y > 44 || inHead(x, y - 1, z))) continue
        put(x, y, z, y >= 58 ? BK : (x === -76 && Math.abs(z - cz) < half - 1 && y < 56) ? WH : OR)
      }
    }
  }
  // eyes shut: on the face's front surface, two black lines
  for (const s of [-1, 1]) for (let y = 25; y <= 27; y++) for (let a = 13; a <= 25; a++) {
    const z = a * s
    let x = -100
    while (x < -60 && !inHead(x, y, z)) x++
    put(x, y, z, BK)
  }
  for (let y = 9; y <= 14; y++) for (let z = -6; z <= 6; z++) {   // the nose, on the snout's tip
    let x = -120
    while (x < -90 && !inSnout(x, y, z)) x++
    put(x, y, z, BK); put(x + 1, y, z, BK)
  }
  return { name: 'face', ticks: 1, cells: c }
}

// the clearing dressed like the taiga round it (r:r13865d: a real world, not a lawn): podzol and coarse dirt patches,
// ferns and grass, mossy boulders, and real spruces round the edge (none in a camera's path or on 56e's spot)
function dress () {
  const d = [], rnd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v) }
  const W = 120, D = 54                                // the field's half-size (shifted coordinates), inside the taper
  // clear of 56e, the line from him to the snout (the pass looks along it) and the opening's camera (shifted -100..-110, -50)
  const clearOf = (x, z, r) => Math.hypot(x - PLAYER[0], z - PLAYER[1]) > r && !(x < -60 && Math.abs(z - PLAYER[1]) < r + 4) && Math.hypot(x + 106, z + 54) > r + 14
  for (let i = 0; i < 70; i++) {
    const x = Math.round((rnd(i, 1) * 2 - 1) * W), z = Math.round((rnd(i, 2) * 2 - 1) * D), r = 2 + Math.floor(rnd(i, 3) * 4)
    d.push([x - r, 0, z - r, x + r, 0, z + r, (i % 3 ? 'podzol' : 'coarse_dirt') + ' replace grass_block'])
  }
  for (let i = 0; i < 260; i++) {
    const x = Math.round((rnd(i, 4) * 2 - 1) * W), z = Math.round((rnd(i, 5) * 2 - 1) * D)
    if (!clearOf(x, z, 3)) continue
    d.push([x, 1, z, i % 3 ? 'fern' : 'short_grass'])
  }
  for (let i = 0; i < 8; i++) {
    const x = Math.round((rnd(i, 6) * 2 - 1) * W), z = Math.round((rnd(i, 7) * 2 - 1) * D)
    if (!clearOf(x, z, 10)) continue
    d.push([x - 1, 1, z - 1, x + 1, 2, z + 1, 'mossy_cobblestone'], [x, 3, z, x, 3, z, 'mossy_cobblestone'])
  }
  // spruces along the edges of the clearing, clear of the fox (its footprint is x -92..92, z -44..45 shifted)
  for (const [x, z] of [[-118, -46], [-104, 50], [-120, 30], [-60, -52], [-20, 52], [10, -53], [60, -50], [96, 50], [112, -40], [118, 20], [80, 53], [-86, -53], [40, 53], [-40, -54]]) {
    if (clearOf(x, z, 8)) d.push([x, 1, z, 'tree:minecraft:spruce'])
  }
  return d
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
  field: [124, 56],                      // the clearing: the fox's footprint (177 x 90) plus room for 56e in front
  height: 80,
  clearTrees: 3,                         // no half-cut trees at the clearing's edge; the forest beyond stays
  renderDistance: 16, recordRadius: 256, // the reveal looks out over the forest: no missing chunks at the frame's edge
  chunkStops: [[-160, -160], [160, -160], [-160, 160], [160, 160]],
  botTimeout: 1200,
  player: { at: PLAYER, yaw: -90, pitch: -20 },   // facing east, up at the fox (mineflayer yaw -90 = east)
  tally: 'blocks used',
  dress: dress(),
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
    // the payoff's hit on the final mix (mixcheck): the drop on the reveal with a dip and an impact; on the pass a
    // second dip and impact under the snore (the snore alone is no hit: pace r1), and the punchline card
    sfx: [['dip', 'reveal', 0.4], ['impact', 'reveal', { gain: 1.3 }], ['dip', 'pass', 0.4], ['impact', 'pass', { gain: 1.4 }]],
    dropAt: 'pass',                      // the NCS drop on the last payoff (mixcheck r1: under the bed the pass had no hit)
    cards: [['pass', 'SMALL', 1.6, 'yellow', 0, null, { y: 0.24 }]]
  },
  shots: {
    // (every point in the fox's own coordinates; 56e stands at (-140, 1, 0), facing east up at the snout)
    // 1. low and close off the north paw: the paws and the snout rise from the first frame, the drone easing back and up
    close: { path: [cam(0, P(-124, 3.5, -42)), cam(2.2, P(-134, 9, -48))], lookPath: [cam(0, P(-98, 5, -14)), cam(2.2, P(-100, 9, -6))], fov: 66, dof: false, drift: 0.4, scenery: true, subject: [P(-96, 4, -31), P(-113, 8, 0)] },
    // 2. out in front and to the north: the head rises behind the snout, 56e a speck in front of it
    front: { path: [cam(0, P(-150, 28, -64)), cam(2.5, P(-156, 34, -68))], lookPath: [cam(0, P(-80, 18, 0)), cam(2.5, P(-76, 22, 0))], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [P(-94, 34, -10)] },
    // 3. high behind it, the forest round the clearing: the long body fills in behind the head
    back: { path: [cam(0, P(120, 74, -86)), cam(2.8, P(112, 78, -96))], lookPath: [cam(0, P(-14, 14, 0)), cam(2.8, P(-18, 14, 0))], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [P(10, 41, 0)] },
    // 4. over the spruces on the south side: the tail curls round across the frame
    forest: { path: [cam(0, P(30, 46, 160)), cam(2.2, P(14, 48, 162))], lookPath: [cam(0, P(-12, 12, 36)), cam(2.2, P(-20, 12, 36))], fov: 62, dof: false, drift: 0.4, scenery: true, subject: [P(-10, 16, 63)] },
    // 5. the reveal: high to the south-west over the forest (under the clouds), the whole fox and the taiga, a slow push
    reveal: { path: [cam(0, P(-150, 104, 104)), cam(1.8, P(-143, 99, 98))], lookPath: [cam(0, P(-30, 12, 8)), cam(1.8, P(-30, 12, 8))], fov: 62, dof: false, drift: 0.3, scenery: true, subject: [P(-30, 41, 0)] },
    // 6. the close pass: low behind 56e, sliding from his left to his right, the fox's whole face towering over him
    pass: { path: [cam(0, P(-147, 2.6, -3)), cam(2.0, P(-147, 2.8, 4))], lookPath: [cam(0, P(-100, 20, -1)), cam(2.0, P(-100, 20, 1))], fov: 74, dof: false, drift: 0.2, scenery: true, subject: [P(-140, 1.8, 0), P(-89, 30, -10)] }
  }
})
