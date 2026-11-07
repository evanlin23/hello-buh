// "building a treehouse in 1 second vs 1 minute vs 1 hour 💀" (lib/time_lapse.js), in a jungle clearing:
// a log stick with a leaf on top, a little treehouse (log posts and a trunk, a plank deck, a leaf roof,
// its deck and roof built from a dirt pillar the bot towers up and digs away), then a giant jungle tree
// rising as a time-lapse: roots and trunk, branches, a wrap-round deck, huts on it, a spiral stair, two
// smaller trees joined by rope bridges, the crown, and last a lookout with a lantern on the very top.
const { makeStunt } = require('../lib/time_lapse')

// 1 second: two logs and a leaf block (the bot jumps for the leaf)
const small = { blocks: [[1, 0, 0, 'jungle_log'], [1, 1, 0, 'jungle_log'], [1, 2, 0, 'jungle_leaves']], slots: { jungle_log: 0, jungle_leaves: 2 } }

// 1 minute: a 3x3 treehouse, 4 high: log posts at the corners and a log trunk in the middle (rows 0-1),
// a plank deck (row 2), a leaf roof (row 3); front row z = 2
function mini () {
  const out = []
  for (let y = 0; y <= 3; y++) {
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        const corner = x !== 1 && z !== 1, centre = x === 1 && z === 1
        if (y <= 1 && !(corner || centre)) continue
        out.push([x, y, z, y <= 1 ? 'jungle_log' : y === 2 ? 'oak_planks' : 'jungle_leaves'])
      }
    }
  }
  return out
}

// 1 hour: the tree village, local to the big trunk's axis (front faces +z), y from the ground
function village () {
  const out = new Map()
  const put = (x, y, z, name, stage) => { const k = `${x},${y},${z}`; if (!out.has(k)) out.set(k, [x, y, z, name, stage]) }
  const blob = (cx, cy, cz, rx, ry, rz, name, stage) => {     // a lumpy ellipsoid shell, 2 thick
    for (let x = -rx; x <= rx; x++) for (let y = -ry; y <= ry; y++) for (let z = -rz; z <= rz; z++) {
      const d = Math.hypot(x / rx, y / ry, z / rz)
      if (d <= 1 && d > 1 - 2.2 / Math.max(rx, ry, rz)) put(cx + x, cy + y, cz + z, name, stage)
    }
  }
  // stage 0: a pond in front with a lily-pad-green rim, and a mossy path to the tree
  for (let x = -10; x <= 10; x++) for (let z = 14; z <= 24; z++) {
    const d = Math.hypot(x / 10, (z - 19) / 5)
    if (d <= 0.85) { put(x, -1, z, 'water', 0); put(x, -2, z, 'water', 0) } else if (d <= 1) put(x, -1, z, 'moss_block', 0)
  }
  for (let z = 25; z <= 46; z++) for (let x = -1; x <= 1; x++) put(x, -1, z, 'mossy_cobblestone', 0)
  for (let z = 6; z <= 13; z++) for (const x of [-12, -11, 11, 12]) put(x, -1, z, 'mossy_cobblestone', 0)
  // stage 1: the trunk, 7 across with the corners cut, to y 34, and root flares
  for (let y = 0; y <= 34; y++) for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
    if (Math.abs(x) === 3 && Math.abs(z) === 3) continue
    if (Math.abs(x) < 3 && Math.abs(z) < 3) continue           // a shell
    put(x, y, z, 'jungle_log', 1)
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    for (let k = 4; k <= 8; k++) for (let y = 0; y <= Math.max(0, 6 - k); y++) put(Math.round(dx * k * (dz ? 0.75 : 1)), y, Math.round(dz * k * (dx ? 0.75 : 1)), 'jungle_log', 1)
  }
  // stage 2: four branches out and up, each ending in a leaf blob
  const tips = []
  for (const [dx, dz, y0] of [[1, 0, 22], [-1, 0, 26], [0, -1, 24], [0.7, 0.7, 28]]) {
    for (let k = 3; k <= 12; k++) put(Math.round(dx * k), y0 + Math.floor(k / 3), Math.round(dz * k), 'jungle_log', 2)
    tips.push([Math.round(dx * 13), y0 + 4, Math.round(dz * 13)])
  }
  for (const [x, y, z] of tips) blob(x, y, z, 6, 3, 6, 'jungle_leaves', 2)
  // stage 3: the deck round the trunk at y 14, radius 6-11, on log posts, with a plank rail
  const DY = 14
  for (let x = -11; x <= 11; x++) for (let z = -11; z <= 11; z++) {
    const r = Math.hypot(x, z)
    if (r < 3.5 || r > 11.5) continue
    put(x, DY, z, 'oak_planks', 3)
    if (r > 10.5) put(x, DY + 1, z, 'stripped_jungle_log', 3)
  }
  for (const [px, pz] of [[8, 8], [-8, 8], [8, -8], [-8, -8], [11, 0], [-11, 0], [0, -11]]) for (let y = 0; y < DY; y++) put(px, y, pz, 'jungle_log', 3)
  // stage 4: three huts on the deck (spruce walls, a window, a dark oak roof)
  for (const [hx, hz] of [[-7, 4], [6, -5], [-6, -6]]) {
    for (let y = DY + 1; y <= DY + 5; y++) for (let x = hx - 2; x <= hx + 2; x++) for (let z = hz - 2; z <= hz + 2; z++) {
      const edge = Math.abs(x - hx) === 2 || Math.abs(z - hz) === 2
      if (y <= DY + 3 && edge) put(x, y, z, (y === DY + 2 && (x === hx || z === hz)) ? 'glass' : 'spruce_planks', 4)
      if (y >= DY + 4) { const w = 2 - (y - DY - 4); if (Math.abs(x - hx) <= w + 1 && Math.abs(z - hz) <= w + 1 && (Math.abs(x - hx) === w + 1 || Math.abs(z - hz) === w + 1)) put(x, y, z, 'dark_oak_planks', 4) }
    }
    put(hx, DY + 6, hz, 'dark_oak_planks', 4)
  }
  // stage 5: a spiral stair round the trunk from the ground to the deck
  for (let s = 0; s < DY; s++) {                                // two wide, clear of the trunk wall (r 4 sat in it)
    const a = s * Math.PI / 7
    for (const r of [5, 6]) put(Math.round(Math.cos(a) * r), s, Math.round(Math.sin(a) * r), 'spruce_planks', 5)
  }
  // stage 6: two smaller trees, east and west, with their own decks, and rope bridges to the big deck
  for (const side of [-1, 1]) {
    const tx = side * 30, tz = -2
    for (let y = 0; y <= 24; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) if (Math.abs(x) + Math.abs(z) < 2) put(tx + x, y, tz + z, 'jungle_log', 6)
    for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (Math.hypot(x, z) <= 5.3 && Math.hypot(x, z) > 1.5) put(tx + x, DY, tz + z, 'oak_planks', 6)
    blob(tx, 27, tz, 6, 4, 6, 'jungle_leaves', 6)
    for (let x = 12; x <= 24; x++) {                           // the bridge, sagging, with rope rails
      const sag = Math.round(Math.sin((x - 12) / 12 * Math.PI) * 2)
      put(side * x, DY - sag, tz, 'spruce_planks', 6)
      for (const rz of [tz - 1, tz + 1]) put(side * x, DY + 1 - sag, rz, 'brown_wool', 6)
    }
  }
  // stage 7: the crown - a huge leaf canopy over everything
  blob(0, 38, 0, 14, 6, 14, 'jungle_leaves', 7)
  blob(5, 44, -3, 8, 4, 8, 'jungle_leaves', 7)
  // stage 8: a lookout on the very top - a plank crow's nest, a rail and a lantern
  for (let y = 35; y <= 47; y++) put(0, y, 0, 'jungle_log', 8)
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
    if (Math.hypot(x, z) > 3.3) continue
    put(x, 48, z, 'oak_planks', 8)
    if (Math.hypot(x, z) > 2.3) put(x, 49, z, 'stripped_jungle_log', 8)
  }
  put(0, 49, 0, 'jungle_log', 8); put(0, 50, 0, 'jungle_log', 8); put(0, 51, 0, 'glowstone', 8); put(0, 52, 0, 'gold_block', 8)
  return [...out.values()]
}

module.exports = makeStunt({
  name: 'lapse_treehouse',
  biomeSearch: 'minecraft:jungle',
  caption: 'building a treehouse in 1 second vs 1 minute vs 1 hour 💀',
  red: 'hour',
  recordRadius: 200,
  endAfter: 'big_done:0.5',
  field: { top: 'grass_block', under: 'dirt', biome: 'minecraft:jungle' },
  hotbar: [['jungle_log', 64], ['oak_planks', 64], ['jungle_leaves', 64], ['dirt', 64], 'diamond_shovel'],
  small,
  mid: { blocks: mini(), w: 3, d: 3, towerY: 2, towerH: 2, towerSlot: 3, digSlot: 4, perTick: 2, speed: 3, backTicks: 12,
    slots: { jungle_log: 0, oak_planks: 1, jungle_leaves: 2 } },
  big: {
    blocks: village(),
    hold: 'jungle_log', slot: 0,
    // pond + path, trunk, branches, deck, huts, stair, side trees + bridges, crown, lookout
    stageTicks: { 0: 110, 1: 190, 2: 150, 3: 180, 4: 150, 5: 120, 6: 220, 7: 170, 8: 90 },
    keys: [
      [0, [-10, 9, 34], [0, -1, 18]],        // the pond from the cut
      [110, [-22, 12, 32], [0, 8, 0]],       // the trunk rising
      [300, [-14, 26, 36], [0, 22, 0]],      // the branches
      [450, [18, 22, 30], [0, 14, 0]],       // the deck going round
      [630, [22, 24, 18], [-2, 16, -2]],     // the huts
      [780, [12, 10, 22], [0, 6, 0]],        // down for the stair
      [900, [0, 20, 44], [0, 14, 0]],        // wide for the side trees and bridges
      [1120, [-30, 40, 40], [0, 34, 0]],     // up for the crown
      [1290, [-10, 58, 24], [0, 48, 0]],     // over the top for the lookout
      [1350, [-2, 24, 92], [0, 26, 0]],      // the pull-back lands and creeps into 60:00
      [1388, [0, 22, 88], [0, 27, 0]]
    ],
    reveal: [
      [8, [-2, 22, 84], [0, 27, 0]],
      [16, [-6, 23, 80], [-1, 27, 0]]
    ]
  }
})
