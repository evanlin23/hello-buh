// "building a statue in 1 second vs 1 minute vs 1 hour 💀" (lib/time_lapse.js), in a desert: a
// hay-bale scarecrow with a pumpkin head, a little villager statue on a plinth (its head rows built
// from a dirt pillar the bot towers up and then digs away), then a 53-block giant villager statue
// rising as a time-lapse: plinth and steps, legs, robe, crossed arms, head, the face (emerald eyes,
// the unibrow, the nose), blackstone obelisks and an oasis around it, a pyramid behind it, and last
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
  // stage 0: a stepped blackstone plinth with gold edges (sandstone vanished on the sand)
  for (let s = 0; s < 3; s++) {
    const r = 15 - s * 2
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      const edge = Math.abs(x) === r || Math.abs(z) === r
      put(x, s, z, edge ? 'gold_block' : 'polished_blackstone_bricks', 0)
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
  for (const [ox, oz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    box(ox - 1, ox + 1, 2, 16, oz - 1, oz + 1, 'polished_blackstone', 6)   // on the y 1 step (from y 3 it floated)
    put(ox, 17, oz, 'polished_blackstone', 6); put(ox, 18, oz, 'gold_block', 6)
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
  for (let z = 16; z <= 52; z++) for (let x = -1; x <= 1; x++) put(x, -1, z, 'polished_blackstone_bricks', 6)   // the road in
  // stage 7: a stepped red sandstone pyramid behind it for scale, off to the right so it shows beside
  // the statue in the final wide shot (straight behind, the legs hid it); solid layers (hollow rings
  // read as a flat orange frame from above while it rose)
  const PX = 24, PZ = -34
  for (let s = 0; s <= 15; s++) {
    const r = 15 - s
    for (let x = PX - r; x <= PX + r; x++) for (let z = PZ - r; z <= PZ + r; z++) {
      put(x, s, z, s === 15 ? 'gold_block' : (s & 1 ? 'cut_red_sandstone' : 'red_sandstone'), 7)
    }
  }
  // stage 8: a gold crown on the head, the last blocks
  // a full band with points every third block (gaps alone read as four loose gold blocks)
  for (let x = -7; x <= 6; x++) for (const z of [-7, 6]) { put(x, 53, z, 'gold_block', 8); if ((x + 7) % 3 === 0) { put(x, 54, z, 'gold_block', 8); put(x, 55, z, 'gold_block', 8) } }
  for (let z = -6; z <= 5; z++) for (const x of [-7, 6]) { put(x, 53, z, 'gold_block', 8); if ((z + 7) % 3 === 0) { put(x, 54, z, 'gold_block', 8); put(x, 55, z, 'gold_block', 8) } }
  return [...out.values()]
}

module.exports = makeStunt({
  name: 'lapse_statue',
  biomeSearch: 'minecraft:desert',
  caption: 'building a statue in 1 second vs 1 minute vs 1 hour 💀',
  red: 'hour',
  recordRadius: 200,
  botTimeout: 300,   // ~100 s of stunt after the set-up: the default 180 s killed 4 of 5 tries on a busy box
  endAfter: 'big_done:0.5',
  bigCuts: [6, 1.2, 63], payoffFlash: true, song: null,   // pace: jump cuts through the 1-hour round, a flash + punch on 60:00
  field: { top: 'sand', under: 'sandstone', biome: 'minecraft:desert' },
  hotbar: [['hay_block', 64], ['carved_pumpkin', 64], ['stone_bricks', 64], ['brown_concrete', 64], ['terracotta', 64], ['emerald_block', 64], ['dark_oak_planks', 64], ['dirt', 64], 'diamond_shovel'],
  small,
  mid: { blocks: mini(), w: 3, d: 2, towerY: 3, towerH: 3, towerSlot: 7, digSlot: 8, perTick: 2, speed: 3, oneSide: 'S', backTicks: 12, out: 3.0,   // oneSide: all from the front, the back row first: no walk round its back (r:r478786: it stalled 1.3-1.6 s)
    slots: { stone_bricks: 2, brown_concrete: 3, terracotta: 4, emerald_block: 5, dark_oak_planks: 6 } },
  big: {
    blocks: giant(),
    hold: 'terracotta', slot: 4,
    // plinth, legs, robe, arms, head, face, obelisks + oases, the pyramid, crown
    stageTicks: { 0: 100, 1: 100, 2: 140, 3: 120, 4: 160, 5: 180, 6: 220, 7: 210, 8: 80 },
    // one smooth move for the whole round (owner r:r200cfe, on lapse_rocket's lapse: "a ton of jerking around between
    // shots"; this round's own rail swung 8-28 deg and moved 6-18 blocks across its jump cuts): a slow crane-out from
    // low in front of the plinth to the wide of the finished statue, the look rising with the build so the head stays
    // under the clock. Across a 1.2 s jump cut the camera moves under a block and turns under a degree.
    keys: [
      [0, [-8, 12, 52], [0, 8, 0]],
      [660, [-4, 15, 74], [0, 26, 0]],
      [1318, [0, 17, 96], [0, 31, 0]]          // the pull-back lands on 60:00: the crown under the clock, the pyramid beside
    ],
    reveal: [
      [8, [0.05, 17.03, 96.27], [0, 31, 0]],   // on along the same line, as slowly
      [16, [0.1, 17.06, 96.54], [0, 31, 0]]
    ]
  }
})
