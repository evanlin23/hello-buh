// "find the mistake 🤔" #2 (worker 12, lib/spot_wrong.js): three new builds, one wrong block each.
//  1 EASY    a striped lighthouse by a pond: one white block in a red stripe
//  2 MEDIUM  a cobblestone cottage: one roof stair placed backwards
//  3 "only 1% can find it"  a storage room: one barrel in a stack lies on its side, then "wait,
//            there's another one": the sign says DONT TOUHC
const spotWrong = require('../lib/spot_wrong')

// --- round 1: a lighthouse (5x5 tower, x 0..4, z 0..-4), a pond and a dock in front of it ---
function lighthouse (b) {
  for (let y = 0; y <= 13; y++) {
    const band = Math.floor(y / 2) % 2 === 0 ? 'red_concrete' : 'white_concrete'
    b.fill(0, y, -4, 4, y, 0, band)
    b.fill(1, y, -3, 3, y, -1, 'air')
  }
  b.fill(0, 0, -4, 4, 0, 0, 'stone_bricks')
  b.set(2, 0, 0, 'air'); b.set(2, 1, 0, 'air')
  b.set(2, 0, 0, 'oak_door[facing=south,half=lower,hinge=left]'); b.set(2, 1, 0, 'oak_door[facing=south,half=upper,hinge=left]')
  b.set(2, 5, 0, 'glass_pane[east=true,west=true]'); b.set(2, 9, 0, 'glass_pane[east=true,west=true]')
  // the lamp room: a stone brick gallery, glass, a glowstone lamp, a cap
  b.fill(-1, 14, -5, 5, 14, 1, 'stone_brick_slab[type=top]')
  b.fill(0, 15, -4, 4, 17, 0, 'glass'); b.fill(1, 15, -3, 3, 17, -1, 'air')
  b.set(2, 15, -2, 'glowstone'); b.set(2, 16, -2, 'glowstone')
  b.fill(0, 18, -4, 4, 18, 0, 'red_concrete'); b.fill(1, 19, -3, 3, 19, -1, 'red_concrete'); b.set(2, 20, -2, 'lightning_rod')
  for (const [cx, cz] of [[-1, -5], [5, -5], [-1, 1], [5, 1]]) b.set(cx, 15, cz, 'stone_brick_wall')
  // the mistake: one white block in a red stripe
  b.set(1, 12, 0, 'white_concrete')
  // the shore: sand, a pond, a dock, reeds
  b.fill(-8, -1, 1, 12, -1, 4, 'sand')
  b.fill(-8, -3, 5, 12, -1, 11, 'sand'); b.fill(-7, -2, 5, 11, -1, 10, 'water')
  b.fill(-6, 0, 5, -5, 0, 9, 'oak_planks'); b.fill(-6, -2, 6, -6, -1, 6, 'oak_fence'); b.fill(-5, -2, 9, -5, -1, 9, 'oak_fence')
  for (const [sx, sz] of [[-5, 5], [-4, 5], [10, 5], [-7, 7]]) { b.set(sx, -1, sz, 'sand'); b.set(sx, 0, sz, 'sugar_cane'); b.set(sx, 1, sz, 'sugar_cane') }
  b.set(-3, 0, 2, 'barrel[facing=up]'); b.set(-3, 0, 1, 'barrel[facing=up]'); b.set(-2, 0, 1, 'oak_fence'); b.set(-2, 1, 1, 'lantern')
}

// --- round 2: a cobblestone cottage (x 0..8, z 0..-6), oak stair roof with its ridge along x ---
function cottage (b) {
  b.fill(0, 0, -6, 8, 3, 0, 'cobblestone')
  b.fill(1, 0, -5, 7, 3, -1, 'air')
  for (const [cx, cz] of [[0, 0], [8, 0], [0, -6], [8, -6]]) b.fill(cx, 0, cz, cx, 3, cz, 'oak_log')
  b.fill(0, 4, 0, 8, 4, 0, 'oak_log[axis=x]'); b.fill(0, 4, -6, 8, 4, -6, 'oak_log[axis=x]')
  b.fill(1, 1, 0, 2, 2, 0, 'glass_pane[east=true,west=true]'); b.fill(6, 1, 0, 7, 2, 0, 'glass_pane[east=true,west=true]')
  b.set(4, 0, 0, 'spruce_door[facing=south,half=lower,hinge=left]'); b.set(4, 1, 0, 'spruce_door[facing=south,half=upper,hinge=left]')
  b.fill(1, -1, -5, 7, -1, -1, 'spruce_planks'); b.set(4, 3, -3, 'glowstone'); b.set(2, 3, -2, 'glowstone'); b.set(6, 3, -2, 'glowstone')
  b.set(2, 0, -4, 'crafting_table'); b.set(6, 0, -4, 'furnace[facing=south,lit=true]')
  const rows = [[4, 1, 'south'], [5, 0, 'south'], [6, -1, 'south'], [7, -2, 'south'], [7, -4, 'north'], [6, -5, 'north'], [5, -6, 'north'], [4, -7, 'north']]
  for (const [y, z, f] of rows) b.fill(-1, y, z, 9, y, z, `oak_stairs[facing=${f}]`)
  b.fill(-1, 8, -3, 9, 8, -3, 'oak_slab')
  for (const gx of [0, 8]) { b.fill(gx, 5, -5, gx, 5, -1, 'oak_planks'); b.fill(gx, 6, -4, gx, 6, -2, 'oak_planks'); b.set(gx, 7, -3, 'oak_planks') }
  b.fill(1, 4, -5, 7, 4, -1, 'oak_planks')
  // the chimney
  b.fill(7, 4, -4, 7, 9, -4, 'bricks'); b.set(7, 10, -4, 'campfire[lit=true,signal_fire=false]')
  // the mistake: one stair in the second row turned the wrong way
  b.set(3, 5, 0, 'oak_stairs[facing=north]')
  // the porch and the garden
  b.fill(-1, 0, 1, -1, 0, 3, 'oak_fence[north=true,south=true]'); b.fill(9, 0, 1, 9, 0, 3, 'oak_fence[north=true,south=true]')
  b.fill(0, -1, 1, 8, -1, 3, 'cobblestone'); b.fill(4, -1, 4, 4, -1, 12, 'dirt_path')
  b.set(1, 0, 2, 'potted_red_tulip'); b.set(7, 0, 2, 'potted_oxeye_daisy'); b.set(3, 0, 3, 'oak_fence'); b.set(3, 1, 3, 'lantern'); b.set(5, 0, 3, 'oak_fence'); b.set(5, 1, 3, 'lantern')
  b.fill(-6, -1, 4, -2, -1, 8, 'farmland[moisture=7]'); b.fill(-6, 0, 4, -2, 0, 8, 'carrots[age=7]'); b.fill(-6, 0, 6, -2, 0, 6, 'potatoes[age=7]')
  b.fill(-6, -1, 9, -2, -1, 9, 'water')
  b.fill(13, 0, -2, 13, 4, -2, 'birch_log'); b.fill(11, 4, -4, 15, 5, 0, 'birch_leaves[persistent=true]'); b.fill(12, 6, -3, 14, 6, -1, 'birch_leaves[persistent=true]'); b.set(13, 4, -2, 'birch_log'); b.set(13, 5, -2, 'birch_log')
  for (const [gx, gz] of [[10, 6], [-8, 2], [12, 10], [7, 9], [1, 8]]) b.set(gx, 0, gz, 'short_grass')
}

// --- round 3: a storage room (inside x 1..10, z -1..-8; walls x 0 / 11, z 0 / -9) ---
function storage (b) {
  b.fill(0, -1, -9, 11, 4, 0, 'oak_planks')
  b.fill(1, 0, -8, 10, 3, -1, 'air')
  b.fill(1, -1, -8, 10, -1, -1, 'stone_bricks')
  b.fill(0, 4, -9, 11, 4, 0, 'dark_oak_planks')
  for (const [cx, cz] of [[0, 0], [11, 0], [0, -9], [11, -9], [0, -5], [11, -5]]) b.fill(cx, -1, cz, cx, 4, cz, 'stripped_spruce_log')
  for (const [gx, gz] of [[2, -2], [5, -2], [9, -2], [2, -6], [5, -6], [9, -6]]) b.set(gx, 4, gz, 'glowstone')
  // the north wall: chests and barrels in a row, a sign above
  const row = ['chest', 'barrel', 'chest', 'barrel', 'chest', 'barrel', 'chest', 'barrel', 'chest', 'barrel']
  row.forEach((n, i) => b.set(1 + i, 0, -8, n === 'barrel' ? 'barrel[facing=up]' : 'chest[facing=south,type=single]'))
  for (const i of [1, 3, 5, 7, 9]) b.set(1 + i, 1, -8, 'barrel[facing=up]')
  // the first mistake: one barrel in the top row lies on its side (its lid faces the room)
  b.set(8, 1, -8, 'barrel[facing=south]')
  b.set(5, 2, -8, `oak_wall_sign[facing=south]{front_text:{messages:['DONT TOUHC','MY STUFF','','- buh']}}`)
  b.set(2, 2, -8, 'wall_torch[facing=south]'); b.set(9, 2, -8, 'wall_torch[facing=south]')
  // west wall: a smoker, furnaces, a crafting table; east wall: shelves of hay and melons
  b.set(1, 0, -2, 'crafting_table'); b.set(1, 0, -3, 'furnace[facing=east]'); b.set(1, 0, -4, 'smoker[facing=east]'); b.set(1, 0, -6, 'blast_furnace[facing=east]')
  b.set(10, 0, -2, 'hay_block'); b.set(10, 1, -2, 'hay_block'); b.set(10, 0, -3, 'melon'); b.set(10, 0, -4, 'pumpkin'); b.set(10, 1, -4, 'melon')
  b.set(10, 0, -6, 'composter'); b.set(9, 0, -6, 'cauldron')
  b.fill(4, -1, -6, 7, -1, -4, 'polished_andesite')
  b.set(5, 3, -5, 'lantern[hanging=true]')
}

module.exports = spotWrong({
  name: 'spot_wrong_2',
  caption: 'find the mistake 🤔',
  searchFrom: [1600, 1600],
  rounds: [
    { at: [45, -12], build: lighthouse, seconds: 7,
      cam: { pos: [-1, 17], walk: 'right' },
      scan: [[0, [2.5, 6, 0]], [2.5, [0, 3, 2]], [5, [2.5, 13, 0]], [7, [2, 10, 0]]],
      tag: 'EASY',
      reveals: [{ at: [1.5, 12.5, 1.0], zoom: 3.4, sub: 'white in a red stripe', check: [[1, 12, 0], 'white_concrete'] }] },
    { at: [0, -12], build: cottage, seconds: 8,
      cam: { pos: [-6, 15], walk: 'right' },
      scan: [[0, [-4, 1, 6]], [2.5, [4, 2, 0]], [5, [4, 6, -1]], [8, [5, 4.5, 0]]],
      tag: 'MEDIUM', hint: [4, 'hint: not the garden'],
      reveals: [{ at: [3.5, 5.5, 0.5], zoom: 3.2, sub: 'a backwards stair', check: [[3, 5, 0], 'oak_stairs'] }] },
    { at: [-45, 40], build: storage, seconds: 9,
      cam: { pos: [5.5, -1.5] },
      scan: [[0, [3, 0.5, -8]], [2.2, [1, 0.8, -4]], [4.2, [6, 1, -8.5]], [6.2, [10, 0.8, -3.5]], [9, [8, 0.6, -8]]],
      tag: 'only 1% can find it', hint: [4.5, 'hint: not the chests'],
      reveals: [
        { at: [8.5, 1.5, -7.0], zoom: 3.2, sub: 'a barrel on its side', check: [[8, 1, -8], 'barrel'] },
        { pre: 'wait... there is another one', at: [5.5, 2.5, -7.9], zoom: 3, ring: 190, hold: 2.3, tail: 1.5, sub: 'it says TOUHC', check: [[5, 2, -8], 'oak_wall_sign'] }
      ] }
  ]
})
