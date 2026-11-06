// "building a castle in 1 second vs 1 minute vs 1 hour 💀" (lib/time_lapse.js): a dirt arch, a
// little cobblestone tower, then a 49x49 castle (curtain walls, four round towers with blue cone
// roofs, a keep with a spire and a red flag) rising as a time-lapse.
const { makeStunt } = require('../lib/time_lapse')

// 1 second: a dirt "castle" (two stubby pillars with a lintel)
const small = { blocks: [[0, 0, 0, 'dirt'], [2, 0, 0, 'dirt'], [0, 1, 0, 'dirt'], [2, 1, 0, 'dirt'], [1, 1, 0, 'dirt'], [1, 2, 0, 'dirt']], slots: { dirt: 0 } }

// 1 minute: a 5x5 cobblestone tower with a doorway, a window band, a crenellated top
function tower () {
  const out = []
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 5; x++) {
      for (let z = 0; z < 5; z++) {
        const ex = x === 0 || x === 4, ez = z === 0 || z === 4
        if (!ex && !ez) continue
        if (z === 4 && x === 2 && y < 2) continue                        // doorway
        const corner = ex && ez
        const win = !corner && y === 3 && (x === 2 || z === 2)
        out.push([x, y, z, corner ? 'stone_bricks' : win ? 'glass' : 'cobblestone'])
      }
    }
  }
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) out.push([x, 6, z, 'stone_bricks'])     // floor of the top
  for (let x = 0; x < 5; x++) {
    for (let z = 0; z < 5; z++) {
      const ex = x === 0 || x === 4, ez = z === 0 || z === 4
      if ((ex || ez) && (x + z) % 2 === 0) out.push([x, 7, z, 'stone_bricks'])                // merlons
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
        for (let y = 0; y < 20; y++) if (d >= 4.4 && d < 5.6) put(x, y, z, y % 6 === 5 ? 'chiseled_stone_bricks' : 'stone_bricks', 0)
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
        put(x, y, z, win ? 'black_stained_glass' : (y % 7 === 6 ? 'chiseled_stone_bricks' : 'stone_bricks'), 1)
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
  return [...out.values()]
}

module.exports = makeStunt({
  name: 'lapse_castle',
  caption: 'building a castle in 1 second vs 1 minute vs 1 hour 💀',
  red: 'hour',
  hotbar: [['dirt', 64], ['cobblestone', 64], ['stone_bricks', 64], ['glass', 64], ['cobblestone', 64]],
  small,
  mid: { blocks: tower(), w: 5, d: 5, perTick: 2, slots: { cobblestone: [1, 4], stone_bricks: 2, glass: 3 } },
  big: {
    blocks: castle(),
    hold: 'stone_bricks', slot: 2,
    ticks: 540,
    // [s of the build 0..1, camera, look-at], local to the castle centre (y from the ground)
    keys: [
      [0.0, [-34, 10, 42], [0, 3, 0]],
      [0.3, [-14, 15, 50], [0, 8, 0]],
      [0.55, [10, 22, 46], [0, 12, -2]],
      [0.8, [20, 33, 33], [0, 22, -3]],
      [1.0, [16, 42, 19], [0, 38, -3]]
    ],
    // [ticks after the build, camera, look-at]: pull back over the walls to the small builds
    reveal: [
      [30, [12, 30, 52], [0, 22, -5]],
      [60, [2, 20, 90], [0, 20, -4]],
      [100, [1, 20.6, 94], [0, 20, -4]]
    ]
  }
})
