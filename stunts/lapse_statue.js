// "building a statue in 1 second vs 1 minute vs 1 hour 💀" (lib/time_lapse.js), in a desert: a
// hay-bale scarecrow with a pumpkin head, a little villager statue on a plinth (its head rows built
// from a dirt pillar the bot towers up and then digs away), then a 53-block giant villager statue
// rising as a time-lapse: plinth and steps, legs, robe, crossed arms, head, the face (emerald eyes,
// the unibrow, the nose), sandstone obelisks and an oasis around it, a pyramid behind it, and last
// a gold crown.
const { makeStunt } = require('../lib/time_lapse')

// 1 second: two hay bales and a pumpkin (the bot jumps for the head)
const small = { blocks: [[1, 0, 0, 'hay_block'], [1, 1, 0, 'hay_block'], [1, 2, 0, 'carved_pumpkin']], slots: { hay_block: 0, carved_pumpkin: 1 } }

// 1 minute: a 3x2 villager statue, 6 high, front row z = 1: plinth, robe, head with eyes, brow, nose
function mini () {
  const out = []
  for (let y = 0; y <= 5; y++) {
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 2; z++) {
        const front = z === 1
        let name = 'stone_bricks'
        if (y >= 1 && y <= 2) name = 'brown_concrete'
        if (y >= 3) name = 'terracotta'
        if (y === 4 && front && x !== 1) name = 'emerald_block'
        if (y === 5 && front) name = 'dark_oak_planks'
        out.push([x, y, z, name])
      }
    }
  }
  out.push([1, 3, 2, 'terracotta'])                                          // the nose
  return out
}

// 1 hour: the giant, local to its centre (front faces +z), y from the ground; surfaces only
function giant () {
  const out = new Map()
  const put = (x, y, z, name, stage) => { const k = `${x},${y},${z}`; if (!out.has(k)) out.set(k, [x, y, z, name, stage]) }
  // a hollow box (its shell), x0..x1, y0..y1, z0..z1
  const box = (x0, x1, y0, y1, z0, z1, name, stage, paint) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      if (x !== x0 && x !== x1 && y !== y0 && y !== y1 && z !== z0 && z !== z1) continue
      put(x, y, z, paint ? paint(x, y, z) || name : name, stage)
    }
  }
  // stage 0: a stepped sandstone plinth
  for (let s = 0; s < 3; s++) {
    const r = 15 - s * 2
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      const edge = Math.abs(x) === r || Math.abs(z) === r
      put(x, s, z, edge ? 'chiseled_sandstone' : 'cut_sandstone', 0)
    }
  }
  // stage 1: the legs (robe brown, as a villager's are)
  box(-6, -1, 3, 16, -3, 2, 'brown_concrete', 1)
  box(1, 6, 3, 16, -3, 2, 'brown_concrete', 1)
  // stage 2: the robe
  box(-7, 6, 17, 36, -5, 4, 'brown_concrete', 2, (x, y, z) => y === 17 && 'brown_terracotta')
  // stage 3: the arms crossed in front, hands in skin colour at the middle
  box(-8, 7, 26, 31, 5, 10, 'brown_concrete', 3, (x, y, z) => Math.abs(x + 0.5) <= 2.5 && 'terracotta')
  // stage 4: the head
  box(-7, 6, 37, 52, -7, 6, 'terracotta', 4)
  // stage 5: the face - eyes (white and emerald), the unibrow, the big nose
  for (const [x0, x1] of [[-6, -3], [2, 5]]) for (let x = x0; x <= x1; x++) for (let y = 45; y <= 46; y++) {
    const inner = x0 < 0 ? x >= -4 : x <= 3
    put(x, y, 7, inner ? 'emerald_block' : 'white_concrete', 5)
  }
  for (let x = -7; x <= 6; x++) for (let y = 47; y <= 48; y++) put(x, y, 7, 'dark_oak_planks', 5)
  box(-2, 1, 36, 43, 7, 10, 'terracotta', 5)
  // stage 6: four obelisks at the plinth corners, and an oasis on each side
  for (const [ox, oz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) {
    box(ox - 1, ox + 1, 3, 16, oz - 1, oz + 1, 'smooth_sandstone', 6)
    put(ox, 17, oz, 'chiseled_sandstone', 6); put(ox, 18, oz, 'gold_block', 6)
  }
  for (const side of [-1, 1]) {
    const cx = side * 30
    for (let x = cx - 5; x <= cx + 5; x++) for (let z = -6; z <= 6; z++) {
      const d = Math.hypot(x - cx, z * 0.9)
      if (d < 5.5) put(x, -1, z, 'water', 6)
      else if (d < 6.6) put(x, 0, z, 'grass_block', 6)
    }
    for (const [px, pz] of [[cx - 6, -5], [cx + 6, 4]]) {                     // two palms
      for (let y = 0; y < 7; y++) put(px + (y > 4 ? side : 0), y, pz, 'jungle_log', 6)
      const tx = px + side, ty = 7
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) put(tx + dx, ty, pz + dz, 'jungle_leaves', 6)
      for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) put(tx + dx, ty - 1, pz + dz, 'jungle_leaves', 6)
    }
  }
  for (let z = 16; z <= 52; z++) for (let x = -1; x <= 1; x++) put(x, -1, z, 'smooth_sandstone', 6)   // the road in
  // stage 7: a stepped sandstone pyramid behind it, for scale
  for (let s = 0; s <= 15; s++) {
    const r = 15 - s
    for (let x = -r; x <= r; x++) for (let z = -40 - r; z <= -40 + r; z++) {
      if (Math.abs(x) !== r && Math.abs(z + 40) !== r && s !== 15) continue
      put(x, s, z, s === 15 ? 'gold_block' : 'sandstone', 7)
    }
  }
  // stage 8: a gold crown on the head, the last blocks
  for (let x = -7; x <= 6; x++) for (const z of [-7, 6]) if ((x + 7) % 3 !== 1) put(x, 53, z, 'gold_block', 8)
  for (let z = -6; z <= 5; z++) for (const x of [-7, 6]) if ((z + 7) % 3 !== 1) put(x, 53, z, 'gold_block', 8)
  return [...out.values()]
}

module.exports = makeStunt({
  name: 'lapse_statue',
  biomeSearch: 'minecraft:desert',
  caption: 'building a statue in 1 second vs 1 minute vs 1 hour 💀',
  red: 'hour',
  recordRadius: 200,
  endAfter: 'big_done:0.5',
  field: { top: 'sand', under: 'sandstone', biome: 'minecraft:desert' },
  hotbar: [['hay_block', 64], ['carved_pumpkin', 64], ['stone_bricks', 64], ['brown_concrete', 64], ['terracotta', 64], ['emerald_block', 64], ['dark_oak_planks', 64], ['dirt', 64], 'diamond_shovel'],
  small,
  mid: { blocks: mini(), w: 3, d: 2, towerY: 3, towerH: 3, towerSlot: 7, digSlot: 8, perTick: 2, speed: 4, backTicks: 14,
    slots: { stone_bricks: 2, brown_concrete: 3, terracotta: 4, emerald_block: 5, dark_oak_planks: 6 } },
  big: {
    blocks: giant(),
    hold: 'terracotta', slot: 4,
    // plinth, legs, robe, arms, head, face, obelisks + oases, the pyramid, crown
    stageTicks: { 0: 150, 1: 150, 2: 180, 3: 120, 4: 180, 5: 150, 6: 180, 7: 150, 8: 40 },
    keys: [
      [0, [-24, 10, 40], [0, 1, 0]],
      [150, [-30, 14, 34], [0, 8, 0]],
      [300, [-20, 22, 40], [0, 20, 0]],
      [480, [18, 30, 36], [0, 28, 4]],
      [600, [26, 40, 30], [0, 40, 0]],
      [780, [10, 46, 34], [0, 44, 6]],       // the face going on
      [930, [4, 42, 32], [0, 44, 6]],
      [1030, [-44, 24, 30], [-24, 6, 0]],    // the obelisks and the west oasis
      [1130, [-40, 34, -10], [0, 14, -40]],  // the pyramid rising behind
      [1180, [-6, 66, -16], [0, 20, -40]],   // over the head, looking down at the pyramid
      [1225, [24, 52, 14], [0, 30, -30]],
      [1265, [-14, 60, 22], [0, 52, 0]],     // over the crown
      [1292, [-1, 16, 86], [0, 24, 0]],      // the pull-back arrives early and creeps into 60:00
      [1308, [0, 14, 82], [0, 24, 0]]
    ],
    reveal: [
      [8, [-4, 15, 76], [0, 24, 0]],
      [16, [-8, 17, 70], [-1, 24, 0]]
    ]
  }
})
