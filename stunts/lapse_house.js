// "building a house in 1 second vs 1 minute vs 1 hour 💀" (lib/time_lapse.js): a dirt hut, a little
// plank cottage (roofed from inside), then a three-storey quartz mansion rising as a time-lapse in stages: a pool and a
// road that runs up between the two small builds, three floors with window bands, two side wings,
// a roof with a glass penthouse, a garden of trees and hedges, and last a gold crown on top.
const { makeStunt } = require('../lib/time_lapse')

// 1 second: a dirt hut (two stubs and a lintel)
const small = { blocks: [[0, 0, 0, 'dirt'], [2, 0, 0, 'dirt'], [0, 1, 0, 'dirt'], [2, 1, 0, 'dirt'], [1, 1, 0, 'dirt']], slots: { dirt: 0 } }

// 1 minute: a 5x5 plank cottage a player can build from the ground: log corners, walls two high
// with a doorway and windows, and a flat spruce roof put on from inside (lib/time_lapse.js roofY)
function cottage () {
  const out = []
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 5; x++) {
      for (let z = 0; z < 5; z++) {
        const ex = x === 0 || x === 4, ez = z === 0 || z === 4
        if (!ex && !ez) continue
        if (z === 4 && x === 2) continue                                   // doorway
        const corner = ex && ez
        const win = !corner && y === 1 && ((z === 4 && (x === 1 || x === 3)) || (ex && z === 2) || (z === 0 && x === 2))
        out.push([x, y, z, corner ? 'oak_log' : win ? 'glass' : 'oak_planks'])
      }
    }
  }
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) out.push([x, 2, z, 'spruce_planks'])   // the roof
  return out
}

// 1 hour: the mansion, local to its centre (front faces +z, toward the camera)
function mansion () {
  const out = new Map()
  const put = (x, y, z, name, stage) => { const k = `${x},${y},${z}`; if (!out.has(k)) out.set(k, [x, y, z, name, stage]) }
  const X = 18, Z = 10
  // stage 0: the pool in front (quartz rim, water), and the road in
  for (let x = -9; x <= 9; x++) {
    for (let z = 13; z <= 21; z++) {
      const rim = Math.abs(x) === 9 || z === 13 || z === 21
      put(x, -1, z, rim ? 'smooth_quartz' : 'water', 0)
      if (!rim) put(x, -2, z, 'water', 0)
    }
  }
  for (let z = 22; z <= 46; z++) for (let x = -1; x <= 1; x++) put(x, -1, z, 'smooth_stone', 0)
  for (let z = 11; z <= 12; z++) for (let x = -1; x <= 1; x++) put(x, -1, z, 'smooth_stone', 0)
  for (let x = -12; x <= 12; x++) for (let z = 11; z <= 22; z++) if (Math.abs(x) >= 10 || z === 22) if (!(Math.abs(x) <= 1)) put(x, -1, z, 'smooth_stone', 0)
  // stages 1-3: three floors, 5 high each: quartz walls, pillar corners and ribs, window bands
  for (let f = 0; f < 3; f++) {
    for (let y = f * 5; y < f * 5 + 5; y++) {
      for (let x = -X; x <= X; x++) {
        for (let z = -Z; z <= Z; z++) {
          const ex = Math.abs(x) === X, ez = Math.abs(z) === Z
          const slab = y === f * 5
          if (slab) { put(x, y, z, ex || ez ? 'polished_andesite' : 'quartz_block', 1 + f); continue }
          if (!ex && !ez) continue
          const along = ex ? z : x
          const rib = (ex && ez) || Math.abs(along) % 4 === 0
          if (f === 0 && ez && z > 0 && Math.abs(x) <= 1 && y <= f * 5 + 3) continue          // the front door
          const win = !rib && y >= f * 5 + 1 && y <= f * 5 + 3
          put(x, y, z, rib ? 'quartz_pillar' : win ? 'glass' : 'quartz_block', 1 + f)
        }
      }
    }
  }
  // stage 4: two-storey wings either side, with their own window bands and a dark roof
  for (const side of [-1, 1]) {
    for (let y = 0; y <= 10; y++) {
      for (let ax = X + 1; ax <= X + 10; ax++) {
        for (let z = -8; z <= 8; z++) {
          const x = side * ax
          const ex = ax === X + 10, ez = Math.abs(z) === 8
          if (y === 10) { put(x, y, z, ex || ez ? 'dark_oak_planks' : 'quartz_block', 4); continue }
          if (y % 5 === 0) { put(x, y, z, ex || ez ? 'polished_andesite' : 'quartz_block', 4); continue }
          if (!ex && !ez) continue
          const along = ex ? z : ax
          const rib = (ex && ez) || Math.abs(along) % 3 === 0
          put(x, y, z, rib ? 'quartz_pillar' : (y % 5 >= 1 && y % 5 <= 3) ? 'glass' : 'quartz_block', 4)
        }
      }
    }
  }
  // stage 5: the roof (a dark rim, a flat top) and a glass penthouse
  for (let x = -X - 1; x <= X + 1; x++) {
    for (let z = -Z - 1; z <= Z + 1; z++) {
      const rim = Math.abs(x) === X + 1 || Math.abs(z) === Z + 1
      put(x, 15, z, rim ? 'dark_oak_planks' : 'quartz_block', 5)
      if (rim) put(x, 16, z, 'dark_oak_planks', 5)
    }
  }
  for (let y = 16; y <= 19; y++) {
    for (let x = -6; x <= 6; x++) {
      for (let z = -5; z <= 3; z++) {
        const ex = Math.abs(x) === 6, ez = z === -5 || z === 3
        if (!ex && !ez) continue
        put(x, y, z, (ex && ez) ? 'quartz_pillar' : 'glass', 5)
      }
    }
  }
  for (let x = -7; x <= 7; x++) for (let z = -6; z <= 4; z++) put(x, 20, z, 'dark_oak_planks', 5)
  // stage 5: the garden - hedges along the road and the pool, four trees
  for (let z = 24; z <= 33; z++) for (const x of [-3, 3]) if (z % 4 !== 0) put(x, 0, z, 'oak_leaves', 4)   // stops short of the two small builds
  for (let x = -12; x <= 12; x++) if (Math.abs(x) >= 3) put(x, 0, 23, 'oak_leaves', 4)
  for (const [tx, tz] of [[-34, 18], [34, 18], [-15, 27], [15, 27]]) {
    for (let y = 0; y < 5; y++) put(tx, y, tz, 'oak_log', 4)
    for (let y = 3; y <= 7; y++) {
      const r = y <= 5 ? 2 : 1
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (!(x === 0 && z === 0 && y < 5) && Math.abs(x) + Math.abs(z) < r + 2) put(tx + x, y, tz + z, 'oak_leaves', 4)
    }
  }
  // stage 6: a rooftop infinity pool on the west half; stage 7: a helipad on the east wing
  for (let x = -16; x <= -8; x++) {
    for (let z = -8; z <= 8; z++) {
      const rim = x === -16 || x === -8 || Math.abs(z) === 8
      put(x, 16, z, rim ? 'glass' : 'water', rim ? 5 : 6)   // the rim before the water (it spilled over the roof)
    }
  }
  for (let x = 21; x <= 27; x++) {
    for (let z = -3; z <= 3; z++) {
      const dx = x - 24, H = (Math.abs(dx) === 2 && Math.abs(z) <= 2) || (z === 0 && Math.abs(dx) <= 2)
      put(x, 11, z, H ? 'yellow_concrete' : 'gray_concrete', 7)
    }
  }
  // stage 8: a wall round the grounds, the gates opening onto the road (the hut and the cottage stand
  // just outside them): quartz, pillar posts with lanterns, tall gate posts with gold tops
  for (let x = -46; x <= 46; x++) for (let z = -20; z <= 36; z++) {
    if (Math.abs(x) !== 46 && z !== -20 && z !== 36) continue
    if (z === 36 && Math.abs(x) <= 2) continue                                         // the gateway
    const post = (x + z) % 6 === 0 || (Math.abs(x) === 46 && (z === -20 || z === 36))
    for (let y = 0; y <= 2; y++) put(x, y, z, post ? 'quartz_pillar' : 'quartz_block', 8)
    if (post) put(x, 3, z, 'sea_lantern', 8)
  }
  for (const gx of [-3, 3]) { for (let y = 0; y <= 4; y++) put(gx, y, 36, 'quartz_pillar', 8); put(gx, 5, 36, 'gold_block', 8) }
  // stage 9: a gold crown round the penthouse roof, the last blocks of all
  for (let x = -7; x <= 7; x++) for (let z = -6; z <= 4; z++) {
    if (Math.abs(x) !== 7 && z !== -6 && z !== 4) continue
    put(x, 21, z, 'gold_block', 9)
    if ((x + z) % 2 === 0) put(x, 22, z, 'gold_block', 9)
  }
  return [...out.values()]
}

module.exports = makeStunt({
  name: 'lapse_house',
  recordRadius: 200,          // the whole loaded area: the 8-chunk fog from any camera ends inside recorded terrain
  endAfter: 'big_done:0.5',
  bigCuts: [6, 0.6, 57],
  payoffFlash: true, song: null,   // pace: a flash + punch + dip/impact on 60:00 (no picture change on the payoff), NCS at publish
  botTimeout: 300,   // ~100 s of stunt after the set-up: the default 180 s killed 3 tries on a busy box   // jump cuts through the 1-hour round (a steady angle with no cut for 5+ s read as dead air)
  caption: 'building a house in 1 second vs 1 minute vs 1 hour 💀',
  red: 'hour',
  hotbar: [['dirt', 64], ['oak_log', 64], ['oak_planks', 64], ['glass', 64], ['spruce_planks', 64], ['quartz_block', 64]],
  small,
  // the opening (r:r0f3da0): frame 0 0.2 s into the 1-second build, with its first blocks up (at -0.1 it was a flat
  // field of grass: the opening check's BLOCK); the 1-second clock opens at 0:00.20
  startAt: 'small_start:0.1',
  // roofFrom: the roof cut starts once the last wall block's swing is over and the view rests (action_cuts: 18.5 s was 0.1 s into it; the view turns until 18.8)
  mid: { blocks: cottage(), w: 5, d: 5, roofY: 2, door: 2, perTick: 2, speed: 3, roofSpeed: 'cut', roofFrom: 'roof_start:0.35', backTicks: 12, slots: { oak_log: 1, oak_planks: 2, glass: 3, spruce_planks: 4 } },
  big: {
    blocks: mansion(),
    hold: 'quartz_block', slot: 5,
    // ticks each stage gets: pool + road, floors 1-3 (short, each its own camera move), wings + garden,
    // roof + penthouse, the rooftop pool, the helipad, the wall round the grounds, the crown
    stageTicks: { 0: 105, 1: 105, 2: 105, 3: 105, 4: 390, 5: 180, 6: 110, 7: 100, 8: 200, 9: 70 },   // (30 s: helipad, wall, crown longer; the faster 1-minute round came in at 28.7 s)
    // several clearly different steady angles joined by hard cuts (owner r:r66efa4, 2026-11-11: "we should have more
    // angles when we're showing the last thing"), each one slow and straight so its own jump cuts carry it on
    // (r:r200cfe); the changes sit in the jump cuts' gaps (lib/time_lapse.js angleShots), the showcase's in real time.
    // [tick of the build, [camera, look-at] at its start, [camera, look-at] at its end, name], local to the mansion
    angles: [
      [0, [[-2, 13, 27], [0, -1, 15]], [[-4, 13, 28], [0, -1, 14]], 'down on the pool'],          // the pool fills the frame
      [126, [[-29, 6, 39], [0, 5, 2]], [[-33, 9, 40], [0, 10, 0]], 'low front three-quarter'],     // floors 1-3
      [372, [[46, 12, 10], [0, 7, 0]], [[44, 16, 2], [0, 9, 0]], 'side'],                          // floor 3, the wings
      [612, [[0, 24, 48], [0, 6, 0]], [[0, 26, 42], [0, 7, 0]], 'high front, over the garden'],     // the wings, the garden, the roof going on (a close facade angle showed a wall of windows while they rose out of frame: review)
      [852, [[-50, 55, 60], [0, 10, 0]], [[-44, 57, 54], [0, 12, -2]], 'high wide'],                // roof, penthouse, rooftop pool
      // the showcase: the finished mansion from three angles, the helipad, the wall and the crown going on
      [1092, [[55, 12, 30], [8, 14, 0]], [[52, 13, 32], [8, 14, 0]], 'low right'],
      [1210, [[50, 34, -38], [0, 6, 4]], [[47, 35, -34], [0, 6, 4]], 'high from the back corner'],
      [1330, [[-2, 11, 72], [0, 10, 0]], [[-4, 11.5, 62], [0, 10, 0]], 'the hero wide, through the gates']
    ]
  }
})
