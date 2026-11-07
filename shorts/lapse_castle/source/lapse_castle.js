// "building a castle in 1 second vs 1 minute vs 1 hour 💀" (lib/time_lapse.js): a dirt arch, a
// little cobblestone fort, then a 49x49 castle rising as a time-lapse in stages: a moat floods in,
// curtain walls and four round towers, the keep and its spire, blue cone roofs, a village of
// houses around the moat, flags on every tower and last the keep's red flag.
const { makeStunt } = require('../lib/time_lapse')

// 1 second: a dirt "castle" (two stubby pillars with a lintel)
const small = { blocks: [[0, 0, 0, 'dirt'], [2, 0, 0, 'dirt'], [0, 1, 0, 'dirt'], [2, 1, 0, 'dirt'], [1, 1, 0, 'dirt'], [1, 2, 0, 'dirt']], slots: { dirt: 0 } }

// 1 minute: a 7x7 cobblestone fort, three blocks high (a player can top it from the ground with a
// jump), a doorway, stone-brick corners and a crenellated top row
function fort () {
  const out = []
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 7; x++) {
      for (let z = 0; z < 7; z++) {
        const ex = x === 0 || x === 6, ez = z === 0 || z === 6
        if (!ex && !ez) continue
        if (z === 6 && x === 3 && y < 2) continue                        // doorway
        const corner = ex && ez
        if (y === 2 && !corner && (ez ? x : z) % 2 === 1) continue          // crenels
        out.push([x, y, z, corner || y === 2 ? 'stone_bricks' : 'cobblestone'])
      }
    }
  }
  return out
}

// 1 hour: the castle, local to its centre; stage 0 = curtain walls and tower shafts, 1 = keep and
// spire, 2 = roofs, crenellations and the flag
function castle () {
  const out = new Map()
  const put = (x, y, z, name, stage) => { const k = `${x},${y},${z}`; if (!out.has(k)) out.set(k, [x, y, z, name, stage]) }
  const R = 24
  const TOW = [[-R, -R], [R, -R], [-R, R], [R, R]]
  const inTower = (x, z, r) => TOW.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < r)
  // tower shafts (hollow rings) and their roofs
  for (const [tx, tz] of TOW) {
    for (let x = tx - 7; x <= tx + 7; x++) {
      for (let z = tz - 7; z <= tz + 7; z++) {
        const d = Math.hypot(x - tx, z - tz)
        for (let y = 0; y < 20; y++) if (d >= 4.4 && d < 5.6) put(x, y, z, y % 6 === 5 ? 'chiseled_stone_bricks' : 'stone_bricks', y >= 12 ? 9 : 0)
        if (d < 6.2) put(x, 20, z, d >= 5.0 ? 'stone_bricks' : 'spruce_planks', 2)         // corbel ring + floor
        for (let y = 21; y <= 33; y++) {                                                   // cone
          const r = 6.0 - (y - 21) * 0.5
          if (d < r && (d >= r - 1.6 || y >= 31)) put(x, y, z, 'blue_concrete', 2)
        }
      }
    }
  }
  // curtain walls, 2 thick, with a gate and merlons
  for (let x = -R; x <= R; x++) {
    for (let z = -R; z <= R; z++) {
      const m = Math.max(Math.abs(x), Math.abs(z))
      if (m < R - 1 || inTower(x, z, 5.0)) continue
      for (let y = 0; y < 12; y++) {
        if (z >= R - 1 && Math.abs(x) <= 2 && (y < 5 || (y === 5 && Math.abs(x) <= 1))) continue     // gate
        put(x, y, z, y === 0 ? 'cobblestone' : 'stone_bricks', 0)
      }
      if (m === R && ((Math.abs(z) === R ? x : z) % 2 === 0)) put(x, 12, z, 'stone_bricks', 2)
    }
  }
  // the keep: 15x15, hollow, windows, a floor on top, merlons
  const KZ = -3
  for (let x = -7; x <= 7; x++) {
    for (let z = KZ - 7; z <= KZ + 7; z++) {
      const edge = Math.abs(x) === 7 || Math.abs(z - KZ) === 7
      const corner = Math.abs(x) === 7 && Math.abs(z - KZ) === 7
      for (let y = 0; y < 22; y++) {
        if (!edge) continue
        const along = Math.abs(x) === 7 ? z - KZ : x
        const win = !corner && (y % 7 === 3 || y % 7 === 4) && Math.abs(along) % 4 === 2
        put(x, y, z, win ? 'glass' : (y % 7 === 6 ? 'chiseled_stone_bricks' : 'stone_bricks'), 1)
      }
      put(x, 22, z, 'stone_bricks', 1)
      if (edge && (x + z) % 2 === 0) put(x, 23, z, 'stone_bricks', 2)
    }
  }
  // the spire on the keep: 5x5 shaft, a blue pyramid, a flag
  for (let y = 23; y <= 33; y++) for (let x = -2; x <= 2; x++) for (let z = KZ - 2; z <= KZ + 2; z++) if (Math.abs(x) === 2 || Math.abs(z - KZ) === 2) put(x, y, z, 'stone_bricks', 1)
  const pyr = [[34, 3], [35, 2], [36, 2], [37, 1], [38, 1], [39, 0], [40, 0], [41, 0]]
  for (const [y, r] of pyr) for (let x = -r; x <= r; x++) for (let z = KZ - r; z <= KZ + r; z++) put(x, y, z, 'blue_concrete', 2)
  for (let y = 42; y <= 45; y++) put(0, y, KZ, 'oak_fence', 3)
  for (let y = 44; y <= 45; y++) for (let x = 1; x <= 3; x++) put(x, y, KZ, 'red_wool', 3)
  const STAGE = { 0: 1, 9: 2, 1: 3, 2: 4, 3: 7 }   // walls 1, towers above the walls 2, keep 3, roofs 4, (village 5, courtyard 6), flags 7
  for (const b of out.values()) b[4] = STAGE[b[4]]
  // stage 0: the moat, flooded into the ground around everything, with a plank bridge at the gate
  for (let x = -35; x <= 35; x++) {
    for (let z = -35; z <= 35; z++) {
      if (Math.max(Math.abs(x), Math.abs(z)) < 33) continue
      const bridge = z > 0 && Math.abs(x) <= 2
      for (const y of [-1, -2]) put(x, y, z, bridge ? (y === -1 ? 'spruce_planks' : 'dirt') : 'water', 0)
      if (z > 0 && Math.abs(x) === 3) put(x, 0, z, 'oak_fence', 5)                                  // bridge rails
    }
  }
  for (let z = 36; z <= 52; z++) for (let x = -1; x <= 1; x++) put(x, -1, z, 'dirt_path', 5)        // the road in
  for (let z = 25; z <= 32; z++) for (let x = -1; x <= 1; x++) put(x, -1, z, 'dirt_path', 5)
  // stage 5: a village around the moat (sides and back; the front stays open for the reveal)
  const HOUSES = [[-46, -22], [-46, 4], [41, -22], [41, 4], [-20, -44], [15, -44], [-46, 28], [41, 28]]
  for (const [hx, hz] of HOUSES) {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 5; x++) {
        for (let z = 0; z < 5; z++) {
          const ex = x === 0 || x === 4, ez = z === 0 || z === 4
          if (!ex && !ez) continue
          if (z === 4 && x === 2 && y < 2) continue
          const corner = ex && ez
          const win = !corner && y === 1 && (x === 1 || x === 3 || z === 2)
          put(hx + x, y, hz + z, corner ? 'oak_log' : win ? 'glass' : 'oak_planks', 5)
        }
      }
    }
    for (const [y, lo, hi] of [[4, -1, 5], [5, 0, 4], [6, 1, 3], [7, 2, 2]]) for (let z = lo; z <= hi; z++) for (let x = -1; x <= 5; x++) put(hx + x, y, hz + z, 'spruce_planks', 5)
    for (const [y, lo, hi] of [[4, 0, 4], [5, 1, 3], [6, 2, 2]]) for (let z = lo; z <= hi; z++) for (const x of [0, 4]) put(hx + x, y, hz + z, 'oak_planks', 5)
  }
  // stage 6: the courtyard - trees, a well and gravel paths from the gate to the keep
  for (let z = 4; z <= 22; z++) for (let x = -1; x <= 1; x++) put(x, -1, z, 'gravel', 6)
  for (const [tx, tz] of [[-14, 12], [14, 12], [-15, -12], [15, -12], [-14, -1], [14, -1]]) {
    for (let y = 0; y < 4; y++) put(tx, y, tz, 'oak_log', 6)
    for (let y = 2; y <= 5; y++) {
      const r = y <= 3 ? 2 : 1
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (!(x === 0 && z === 0 && y < 4) && Math.abs(x) + Math.abs(z) <= r + 1) put(tx + x, y, tz + z, 'oak_leaves', 6)
    }
  }
  for (let x = -2; x <= 2; x++) {
    for (let z = 13; z <= 17; z++) {
      const rim = Math.abs(x) === 2 || z === 13 || z === 17
      if (rim) { put(x, 0, z, 'cobblestone', 6); if ((Math.abs(x) === 2) && (z === 13 || z === 17)) for (let y = 1; y <= 2; y++) put(x, y, z, 'oak_fence', 6) } else put(x, -1, z, 'water', 6)
    }
  }
  for (let x = -2; x <= 2; x++) for (let z = 13; z <= 17; z++) put(x, 3, z, 'spruce_planks', 6)
  // stage 7: a flag on every tower (the keep's flag is the last block of all)
  for (const [tx, tz] of TOW) {
    for (let y = 33; y <= 36; y++) put(tx, y, tz, 'oak_fence', 7)
    for (let y = 35; y <= 36; y++) for (let x = 1; x <= 2; x++) put(tx + x, y, tz, 'red_wool', 7)
  }
  const list = [...out.values()]
  const last = list.filter(b => b[4] === 7 && b[1] >= 42)                                          // the keep's flag goes in last
  return list.filter(b => !last.includes(b)).concat(last.map(b => [b[0], b[1], b[2], b[3], 8]))
}

module.exports = makeStunt({
  name: 'lapse_castle',
  // the recording reaches the bot's whole loaded area (12 chunks ~ 192 blocks), and the default 8-chunk
  // fog (128) from cameras up to ~60 blocks off the set then always ends inside recorded terrain. At
  // renderDistance 12 the high shots saw past the recorded edge: a hard terrain edge and a dark band
  recordRadius: 200,
  caption: 'building a castle in 1 second vs 1 minute vs 1 hour 💀',
  red: 'hour',
  hotbar: [['dirt', 64], ['cobblestone', 64], ['stone_bricks', 64]],
  small,
  endAfter: 'big_done:0.5',   // the wide shot is up from ~0.2 s before 60:00: end before it reads as held
  mid: { blocks: fort(), w: 7, d: 7, front: -1, perTick: 2, speed: 3, backTicks: 14, slots: { cobblestone: 1, stone_bricks: 2 } },
  big: {
    blocks: castle(),
    hold: 'stone_bricks', slot: 2,
    // ticks of the build each stage gets (each 3 s or less on screen): moat, walls, towers, keep, roofs,
    // village, courtyard, tower flags, the last flag
    stageTicks: { 0: 60, 1: 180, 2: 120, 3: 180, 4: 180, 5: 180, 6: 180, 7: 60, 8: 40 },
    // [tick of the build, camera, look-at], local to the castle centre (y from the ground)
    keys: [
      [0, [-24, 13, 52], [0, -1, 26]],
      [60, [-34, 14, 46], [0, 3, 0]],
      [150, [-38, 10, 36], [-12, 4, 12]],   // low along the west wall as it rises
      [240, [-30, 18, 40], [0, 8, 0]],
      [300, [-40, 24, 42], [-22, 16, 22]],   // a tower rising above the finished walls
      [360, [10, 22, 46], [0, 12, -2]],
      [540, [6, 30, 50], [20, 26, 20]],      // the cones growing on the front towers
      [680, [10, 34, 30], [0, 32, -3]],      // then the keep's pyramid
      [745, [-18, 40, 54], [-20, 10, 10]],   // round in front of the south-west tower, not past its cone
      [810, [-58, 30, 40], [-36, 4, 6]],     // the village rising beside the castle
      [960, [-6, 44, 46], [-2, 0, 4]],       // over the front wall into the courtyard as it fills
      [1080, [16, 40, 40], [0, 10, -3]],
      [1140, [8, 40, 50], [0, 34, -3]],      // the flags going up
      [1182, [-1, 14, 84], [0, 21, 0]],     // arrive early, then creep: at 3x the pull-back would otherwise
      [1188, [0, 12, 78], [0, 21, 0]]       // hit 60:00 at full speed and drop to real time in one frame
    ],
    // [ticks after the build, camera, look-at]: the pull-back lands on the wide shot at 60:00 (the
    // castle behind the dirt arch and the fort) and pushes in and round to the end (backwards it ran
    // into the fog: the renderer's 8-chunk fog starts ~115 blocks out and faded the rear towers)
    reveal: [
      [8, [-5, 14, 72], [0, 21, 0]],
      [16, [-10, 17, 64], [-1, 21, 0]]
    ]
  }
})
