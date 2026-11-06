// "building a house in 1 second vs 1 minute vs 1 hour 💀" (lib/time_lapse.js): a dirt hut, a little
// plank cottage, then a three-storey quartz mansion rising as a time-lapse in stages: a pool and a
// road that runs up between the two small builds, three floors with window bands, two side wings,
// a roof with a glass penthouse, a garden of trees and hedges, and last a gold crown on top.
const { makeStunt } = require('../lib/time_lapse')

// 1 second: a dirt hut (two stubs and a lintel)
const small = { blocks: [[0, 0, 0, 'dirt'], [2, 0, 0, 'dirt'], [0, 1, 0, 'dirt'], [2, 1, 0, 'dirt'], [1, 1, 0, 'dirt']], slots: { dirt: 0 } }

// 1 minute: a 5x5 plank cottage, log corners, windows, a stepped roof
function cottage () {
  const out = []
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 5; x++) {
      for (let z = 0; z < 5; z++) {
        const ex = x === 0 || x === 4, ez = z === 0 || z === 4
        if (!ex && !ez) continue
        if (z === 4 && x === 2 && y < 2) continue
        const corner = ex && ez
        const win = !corner && y === 1 && ((z === 4 && (x === 1 || x === 3)) || (ex && z === 2))
        out.push([x, y, z, corner ? 'oak_log' : win ? 'glass' : 'oak_planks'])
      }
    }
  }
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) out.push([x, 3, z, 'spruce_planks'])
  for (let x = 1; x < 4; x++) for (let z = 1; z < 4; z++) out.push([x, 4, z, 'spruce_planks'])
  out.push([2, 5, 2, 'spruce_planks'])
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
  for (let z = 24; z <= 33; z++) for (const x of [-3, 3]) if (z % 4 !== 0) put(x, 0, z, 'oak_leaves', 6)   // stops short of the two small builds
  for (let x = -12; x <= 12; x++) if (Math.abs(x) >= 3) put(x, 0, 23, 'oak_leaves', 6)
  for (const [tx, tz] of [[-34, 18], [34, 18], [-15, 27], [15, 27]]) {
    for (let y = 0; y < 5; y++) put(tx, y, tz, 'oak_log', 6)
    for (let y = 3; y <= 7; y++) {
      const r = y <= 5 ? 2 : 1
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (!(x === 0 && z === 0 && y < 5) && Math.abs(x) + Math.abs(z) < r + 2) put(tx + x, y, tz + z, 'oak_leaves', 6)
    }
  }
  // stage 6: a gold crown on the penthouse, the last blocks of all
  for (const [x, y] of [[-1, 21], [0, 21], [1, 21], [-1, 22], [1, 22], [0, 23]]) put(x, y, -1, 'gold_block', 7)
  return [...out.values()]
}

module.exports = makeStunt({
  name: 'lapse_house',
  caption: 'building a house in 1 second vs 1 minute vs 1 hour 💀',
  red: 'hour',
  hotbar: [['dirt', 64], ['oak_log', 64], ['oak_planks', 64], ['glass', 64], ['spruce_planks', 64], ['spruce_planks', 64], ['quartz_block', 64]],
  small,
  mid: { blocks: cottage(), w: 5, d: 5, perTick: 2, slots: { oak_log: 1, oak_planks: 2, glass: 3, spruce_planks: [4, 5] } },
  big: {
    blocks: mansion(),
    hold: 'quartz_block', slot: 6,
    // ticks each stage gets: pool + road, floor 1, floor 2, floor 3, wings, roof + penthouse, garden, crown
    stageTicks: { 0: 110, 1: 200, 2: 180, 3: 180, 4: 150, 5: 180, 6: 180, 7: 40 },
    // [tick of the build, camera, look-at], local to the mansion centre (y from the ground)
    keys: [
      [0, [-26, 11, 44], [0, -1, 15]],
      [110, [-32, 9, 36], [0, 2, 0]],
      [310, [-12, 12, 42], [0, 5, 0]],
      [490, [12, 16, 40], [0, 8, 0]],
      [670, [26, 22, 32], [6, 10, 0]],
      [820, [42, 18, 30], [22, 5, 0]],
      [1000, [12, 34, 26], [0, 17, -1]],
      [1180, [-30, 16, 40], [-15, 3, 20]],
      [1228, [-6, 30, 16], [0, 21, -1]]
    ],
    // [ticks after the build, camera, look-at]: pull back down the road to the hut and the cottage
    reveal: [
      [30, [8, 24, 46], [0, 10, 0]],
      [60, [1, 14, 76], [0, 8, 0]],
      [100, [0.5, 14.4, 80], [0, 8, 0]]
    ]
  }
})
