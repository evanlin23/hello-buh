// "building a house in 1 second vs 1 minute vs 1 hour 💀" (lib/time_lapse.js): a dirt hut, a little
// plank cottage (roofed from inside), then a three-storey quartz mansion rising as a time-lapse in stages: a pool and a
// road that runs up between the two small builds, three floors with pilasters and cornices, a columned portico, corner
// turrets, two wings with balconies and hip roofs, a roof terrace with a glass penthouse and a pool, a formal garden,
// the wall round the grounds, and last the gold crown. On a real plain (owner r2: "doesnt need to be superflat").
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

// 1 hour: the mansion, local to its centre (front faces +z, toward the camera). Owner on take 1 (2026-11-12, at 22.3 s):
// "make the house more fancy, and it doesnt need to be superflat": nothing here is a flat box now. Pilasters stand out
// from every wall, a cornice juts out at each floor, a columned portico with a balcony on top covers the door, round
// turrets with balconies and slate cones stand on the four corners, the wings get balconies and hip roofs, the roof a
// balustrade, and the grounds a formal garden (a fountain, hedges, flower beds, trees, lamp posts); it stands on a real
// plain, only its own grounds levelled (stage numbers as before: the angles' timing still fits).
const { kit } = require('../lib/mega_lapse')
function mansion () {
  const out = new Map()
  const put = (x, y, z, name, stage) => { const k = `${x},${y},${z}`; if (!out.has(k)) out.set(k, [x, y, z, name, stage]) }
  // a mega_lapse kit shape (y = 0 the ground's top, 1 the first block) -> this build's cells (y = 0 the first block)
  const kitPut = (cells, stageOf) => { for (const c of cells) put(c[0], c[1] - 1, c[2], c[3], stageOf(c[1] - 1)) }
  const X = 18, Z = 10
  const floorStage = (y) => y < 5 ? 1 : y < 10 ? 2 : y < 15 ? 3 : 5
  // the corner turrets first (they win over the walls they stand in): radius 3, to y 20, a balcony ring, slate cones;
  // the cone and its tip go on with the rooftop stage (6)
  for (const [tx, tz] of [[-X, -Z], [X, -Z], [-X, Z], [X, Z]]) {
    kitPut(kit.tower([], tx, tz, 3, 1, 21, { wall: 'quartz_block', base: 'polished_andesite', glass: 'glass', roof: 'deepslate_tiles', roofH: 7, win: 5, balcony: 15, balconyBlock: 'polished_andesite' }), (y) => y > 21 ? 6 : floorStage(y))
  }
  // the portico: six columns, an entablature carrying a balcony with a balustrade, steps up to the door
  for (const cx of [-9, -6, -3, 3, 6, 9]) for (let y = 0; y <= 8; y++) put(cx, y, Z + 4, y === 0 ? 'chiseled_quartz_block' : 'quartz_pillar', y < 5 ? 1 : 2)
  for (let x = -10; x <= 10; x++) for (let z = Z + 1; z <= Z + 5; z++) {
    put(x, 9, z, z === Z + 5 || Math.abs(x) === 10 ? 'chiseled_quartz_block' : 'smooth_quartz', 2)
    if ((z === Z + 5 || Math.abs(x) === 10) && (x + z) % 2 === 0) put(x, 10, z, 'quartz_pillar', 3)
    else if (z === Z + 5 || Math.abs(x) === 10) put(x, 10, z, 'quartz_slab', 3)
  }
  for (let z = Z + 1; z <= Z + 6; z++) for (let x = -3; x <= 3; x++) put(x, -1, z, 'smooth_stone', 0)
  // three floors, 5 high each: quartz walls with window bands, pilasters standing a block out, a cornice ring
  // jutting out at each floor line
  for (let f = 0; f < 3; f++) {
    for (let y = f * 5; y < f * 5 + 5; y++) {
      for (let x = -X - 1; x <= X + 1; x++) {
        for (let z = -Z - 1; z <= Z + 1; z++) {
          const ox = Math.abs(x) === X + 1, oz = Math.abs(z) === Z + 1          // the ring a block outside the walls
          const ex = Math.abs(x) === X, ez = Math.abs(z) === Z
          const along = ex || ox ? z : x
          const rib = Math.abs(along) % 4 === 0
          if (ox || oz) {
            if (ox && oz) continue
            if (y === f * 5 + 4) put(x, y, z, 'smooth_quartz', 1 + f)                       // the cornice
            else if (rib && !(f === 0 && oz && z > 0 && Math.abs(x) <= 10)) put(x, y, z, 'quartz_pillar', 1 + f)   // pilasters (not inside the portico)
            continue
          }
          const slab = y === f * 5
          if (slab) { put(x, y, z, ex || ez ? 'polished_andesite' : 'quartz_block', 1 + f); continue }
          if (!ex && !ez) continue
          if (f === 0 && ez && z > 0 && Math.abs(x) <= 1 && y <= f * 5 + 3) continue          // the front door
          const win = !rib && y >= f * 5 + 1 && y <= f * 5 + 3
          put(x, y, z, rib ? 'quartz_pillar' : win ? 'glass' : 'quartz_block', 1 + f)
        }
      }
    }
  }
  // stage 4: two-storey wings either side, pilasters, a balcony along each front, a stepped hip roof
  for (const side of [-1, 1]) {
    for (let y = 0; y <= 9; y++) {
      for (let ax = X + 1; ax <= X + 10; ax++) {
        for (let z = -8; z <= 8; z++) {
          const x = side * ax
          const ex = ax === X + 10, ez = Math.abs(z) === 8
          if (y % 5 === 0) { put(x, y, z, ex || ez ? 'polished_andesite' : 'quartz_block', 4); continue }
          if (!ex && !ez) continue
          const along = ex ? z : ax
          const rib = (ex && ez) || Math.abs(along) % 3 === 0
          put(x, y, z, rib ? 'quartz_pillar' : (y % 5 >= 1 && y % 5 <= 3) ? 'glass' : 'quartz_block', 4)
        }
      }
    }
    for (let ax = X + 2; ax <= X + 9; ax++) {                                            // the balcony on the upper floor
      put(side * ax, 5, 9, 'polished_andesite', 4); put(side * ax, 5, 10, 'polished_andesite', 4)
      put(side * ax, 6, 10, ax % 2 ? 'quartz_pillar' : 'quartz_slab', 4)
    }
    for (let k = 0; k <= 5; k++) {                                                      // the hip roof
      for (let ax = X + 1 + k - 1; ax <= X + 11 - k; ax++) for (let z = -9 + k; z <= 9 - k; z++) put(side * ax, 10 + k, z, 'deepslate_tiles', 4)
    }
  }
  // stage 0: the pool in front (quartz rim, water) and the road in, lantern posts along it
  for (let x = -9; x <= 9; x++) {
    for (let z = 17; z <= 25; z++) {
      const rim = Math.abs(x) === 9 || z === 17 || z === 25
      put(x, -1, z, rim ? 'smooth_quartz' : 'water', 0)
      if (!rim) put(x, -2, z, 'water', 0)
    }
  }
  for (let z = 26; z <= 46; z++) for (let x = -1; x <= 1; x++) if (z < 28 || z > 32) put(x, -1, z, 'smooth_stone', 0)
  for (let x = -12; x <= 12; x++) for (let z = 14; z <= 16; z++) put(x, -1, z, 'smooth_stone', 0)
  for (const z of [27, 33]) for (const x of [-3, 3]) { put(x, 0, z, 'polished_andesite', 0); put(x, 1, z, 'polished_andesite', 0); put(x, 2, z, 'sea_lantern', 0) }
  // stage 5: the roof: a jutting dark rim, a balustrade, the glass penthouse
  for (let x = -X - 2; x <= X + 2; x++) {
    for (let z = -Z - 2; z <= Z + 2; z++) {
      const rim = Math.abs(x) >= X + 1 || Math.abs(z) >= Z + 1
      put(x, 15, z, rim ? 'dark_oak_planks' : 'quartz_block', 5)
      if (Math.abs(x) === X + 2 || Math.abs(z) === Z + 2) put(x, 16, z, (x + z) % 2 === 0 ? 'quartz_pillar' : 'quartz_slab', 5)
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
  for (let k = 0; k <= 3; k++) for (let x = -7 + k; x <= 7 - k; x++) for (let z = -6 + k; z <= 4 - k; z++) put(x, 20 + k, z, k === 0 ? 'dark_oak_planks' : 'deepslate_tiles', 5)
  // stage 6: a rooftop infinity pool on the west half (with the turret cones, above)
  for (let x = -16; x <= -8; x++) {
    for (let z = -8; z <= 8; z++) {
      const rim = x === -16 || x === -8 || Math.abs(z) === 8
      put(x, 16, z, rim ? 'glass' : 'water', rim ? 5 : 6)
    }
  }
  // stage 7: the helipad on the east wing's roof ridge is gone (a hip roof now): the formal garden instead, either side
  // of the road: hedges round flower beds, a small fountain, trees
  for (const sx of [-1, 1]) {
    for (let ax = 6; ax <= 26; ax++) for (let z = 28; z <= 34; z++) {
      const edge = ax === 6 || ax === 26 || z === 28 || z === 34
      if (edge && !(z === 31 && ax === 6)) put(sx * ax, 0, z, 'oak_leaves', 7)
      else if (!edge) put(sx * ax, 0, z, ['poppy', 'allium', 'cornflower', 'oxeye_daisy'][(ax + z) % 4], 7)
    }
    for (const [tx, tz] of [[30, 20], [34, 30], [40, 8], [40, -12]]) kitPut(kit.tree([], sx * tx, 1, tz, 5, 2.2, { leaves: 'oak_leaves' }), () => 7)
  }
  // the fountain on the road between the beds (the hut and the cottage stand just outside the gates: nothing past z 34)
  for (let x = -2; x <= 2; x++) for (let z = 28; z <= 32; z++) {
    if (Math.abs(x) <= 1 && z >= 29 && z <= 31) { if (!(x === 0 && z === 30)) put(x, 0, z, 'water', 7) } else put(x, 0, z, 'chiseled_stone_bricks', 7)
  }
  for (let y = 0; y <= 2; y++) put(0, y, 30, y === 2 ? 'sea_lantern' : 'chiseled_stone_bricks', 7)
  // stage 8: a wall round the grounds, the gates opening onto the road: quartz, pillar posts with lanterns, tall gate
  // posts with gold tops
  for (let x = -46; x <= 46; x++) for (let z = -20; z <= 36; z++) {
    if (Math.abs(x) !== 46 && z !== -20 && z !== 36) continue
    if (z === 36 && Math.abs(x) <= 2) continue
    const post = (x + z) % 6 === 0 || (Math.abs(x) === 46 && (z === -20 || z === 36))
    for (let y = 0; y <= 2; y++) put(x, y, z, post ? 'quartz_pillar' : 'quartz_block', 8)
    if (post) put(x, 3, z, 'sea_lantern', 8)
  }
  for (const gx of [-3, 3]) { for (let y = 0; y <= 4; y++) put(gx, y, 36, 'quartz_pillar', 8); put(gx, 5, 36, 'gold_block', 8) }
  // stage 9: the gold crown: a gold tip on every turret and a gold ring on the penthouse roof, the last blocks of all
  for (const [tx, tz] of [[-X, -Z], [X, -Z], [-X, Z], [X, Z]]) for (let k = 0; k < 3; k++) put(tx, 29 + k, tz, 'gold_block', 9)
  for (let x = -4; x <= 4; x++) for (let z = -3; z <= 1; z++) if (Math.abs(x) === 4 || z === -3 || z === 1) put(x, 24, z, 'gold_block', 9)
  for (let y = 24; y <= 27; y++) put(0, y, -1, 'gold_block', 9)
  return [...out.values()]
}

// the levelled site planted like the plain round it (lib/time_lapse.js S.dress, from spawn; the mansion's centre is
// z - 45, its grounds x -46..46, z -65..-9): grass and flower patches everywhere but the two small plots and the road
// (the 1-second and 1-minute builds and the bot's walk round them stay clear), oak trees round the site's edges, off
// every camera's line
function dress () {
  const d = []
  for (let dx = -56; dx <= 56; dx += 7) for (let dz = -74; dz <= 30; dz += 7) {
    const jx = dx + Math.round(Math.sin(dx * 3.1 + dz) * 2), jz = dz + Math.round(Math.cos(dz * 2.3 + dx) * 2)
    if (jx >= -14 && jx <= 16 && jz >= -16 && jz <= 12) continue          // the small plots, the bot's walk round them
    if (Math.abs(jx) <= 4 && jz > -66) continue                            // the road up the middle
    d.push([jx, jz, (jx + jz) % 3 === 0 ? 'minecraft:flower_plain' : 'minecraft:patch_grass'])
  }
  for (const [tx, tz] of [[-54, -70], [-55, -40], [-56, -12], [54, -72], [55, -44], [56, -16], [-30, -74], [26, -75], [-50, 8], [52, 6]]) d.push([tx, tz, 'minecraft:fancy_oak'])
  return d
}

module.exports = makeStunt({
  name: 'lapse_house',
  recordRadius: 200,          // the whole loaded area: the 8-chunk fog from any camera ends inside recorded terrain
  // a real plain round it (owner 2026-11-12 on take 1: "it doesnt need to be superflat"): only the grounds and the two
  // small plots are levelled (x -60..60, z -78..14 from spawn; the mansion's centre is z - 45), the trees within 16 of
  // the taper go, the land beyond keeps its own ground, trees and water
  site: [-60, 60, -78, 34], clearTrees: 16,   // (to z + 34: the hero wide's camera at z + 27 was inside the land past a z + 14 edge)
  dress: dress(),
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
