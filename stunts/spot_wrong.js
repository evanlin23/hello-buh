// "find the mistake 🤔" #1 (worker 12, lib/spot_wrong.js): three builds, one wrong block each.
//  1 EASY    a village house: one oak plank in the birch wall
//  2 MEDIUM  a farm and barn: one log in the corner post laid on its side
//  3 "only 1% can find it"  a bedroom: a lantern hanging from nothing, then "wait, there's another
//            one": the double door's right half has its hinge on the wrong side, so both handles
//            sit on the right.
const spotWrong = require('../lib/spot_wrong')

// --- round 1: a house front (front wall z 0, depth to z -6, x 0..8) ---
function house (b) {
  b.fill(0, 0, -6, 8, 0, 0, 'cobblestone')
  b.fill(0, 1, -6, 8, 3, 0, 'birch_planks')
  b.fill(1, 0, -5, 7, 3, -1, 'air')
  for (const [cx, cz] of [[0, 0], [8, 0], [0, -6], [8, -6]]) b.fill(cx, 0, cz, cx, 3, cz, 'oak_log')
  b.fill(0, 4, 0, 8, 4, 0, 'oak_log[axis=x]'); b.fill(0, 4, -6, 8, 4, -6, 'oak_log[axis=x]')
  b.fill(0, 4, -5, 0, 4, -1, 'oak_log[axis=z]'); b.fill(8, 4, -5, 8, 4, -1, 'oak_log[axis=z]')
  // windows and the door
  b.fill(1, 1, 0, 2, 2, 0, 'glass_pane[east=true,west=true]'); b.fill(6, 1, 0, 7, 2, 0, 'glass_pane[east=true,west=true]')
  b.set(4, 0, 0, 'air'); b.set(4, 0, 0, 'oak_door[facing=south,half=lower,hinge=left]'); b.set(4, 1, 0, 'oak_door[facing=south,half=upper,hinge=left]')
  b.fill(1, 3, 0, 7, 3, 0, 'birch_planks')
  // roof: brick slabs, alternating bottom and top halves (a 1-in-2 pitch), ridge along x
  // (stairs don't render yet: reported to worker 11)
  const rows = [[4, 1, 'bottom'], [4, 0, 'top'], [5, -1, 'bottom'], [5, -2, 'top'], [6, -3, 'bottom'], [5, -4, 'top'], [5, -5, 'bottom'], [4, -6, 'top'], [4, -7, 'bottom']]
  for (const [y, z, h] of rows) b.fill(-1, y, z, 9, y, z, `brick_slab[type=${h}]`)
  for (const gx of [0, 8]) { b.fill(gx, 4, -5, gx, 4, -1, 'birch_planks'); b.fill(gx, 5, -3, gx, 5, -3, 'birch_planks') }
  b.fill(1, 4, -5, 7, 4, -1, 'spruce_planks')
  // inside: a lit room behind the windows (it read as a black hole otherwise)
  b.fill(1, 0, -5, 7, 0, -1, 'oak_planks'); b.set(4, 3, -3, 'glowstone'); b.set(1, 3, -1, 'glowstone'); b.set(7, 3, -1, 'glowstone')
  b.set(2, 1, -2, 'crafting_table'); b.set(6, 1, -2, 'barrel[facing=up]')
  // the mistake: one oak plank in the birch wall
  b.set(5, 2, 0, 'oak_planks')
  // the yard: a path to the door, lantern posts, flowers, a tree
  b.fill(4, -1, 1, 4, -1, 11, 'dirt_path')
  for (const lx of [2, 6]) { b.set(lx, 0, 2, 'oak_fence'); b.set(lx, 1, 2, 'lantern') }
  const flowers = ['poppy', 'dandelion', 'oxeye_daisy', 'cornflower', 'allium', 'poppy', 'azure_bluet']
  for (let fx = 0; fx <= 8; fx++) if (fx !== 4) b.set(fx, 0, 1, flowers[fx % flowers.length])
  b.fill(12, 0, -3, 12, 4, -3, 'oak_log')
  b.fill(10, 4, -5, 14, 5, -1, 'oak_leaves[persistent=true]'); b.fill(11, 6, -4, 13, 6, -2, 'oak_leaves[persistent=true]')
  b.set(12, 4, -3, 'oak_log'); b.set(12, 5, -3, 'oak_log')
  b.set(-2, 0, 0, 'composter'); b.set(-2, 0, -1, 'hay_block')
  for (const [gx, gz] of [[-4, 4], [10, 3], [13, 6], [-3, 8], [7, 7], [1, 6]]) b.set(gx, 0, gz, 'short_grass')
}

// --- round 2: a wheat farm and a barn (barn x 0..6, z 0..-8, ridge along z) ---
function farm (b) {
  b.fill(0, 0, -8, 6, 0, 0, 'cobblestone')
  b.fill(0, 1, -8, 6, 3, 0, 'spruce_planks')
  b.fill(1, 0, -7, 5, 4, -1, 'air')
  for (const [cx, cz] of [[0, 0], [6, 0], [0, -8], [6, -8], [0, -4], [6, -4]]) b.fill(cx, 0, cz, cx, 3, cz, 'dark_oak_log')
  b.fill(0, 4, 0, 6, 4, 0, 'dark_oak_log[axis=x]')
  b.fill(2, 0, 0, 4, 2, 0, 'air')                                       // the big doorway
  b.fill(1, -1, -7, 5, -1, -1, 'spruce_planks')
  b.set(1, 0, -6, 'hay_block'); b.set(1, 1, -6, 'hay_block'); b.set(2, 0, -6, 'hay_block'); b.set(5, 0, -6, 'hay_block'); b.set(5, 0, -5, 'hay_block')
  b.set(3, 3, -3, 'glowstone'); b.set(3, 3, -6, 'glowstone')
  // front and back gables
  for (const [gx, top] of [[1, 4], [2, 4], [3, 5], [4, 4], [5, 4]]) { b.fill(gx, 4, 0, gx, top, 0, 'spruce_planks'); b.fill(gx, 4, -8, gx, top, -8, 'spruce_planks') }
  b.set(3, 4, 0, 'glass_pane[east=true,west=true]')
  // roof: dark oak slabs, alternating halves, ridge along z
  const rows = [[-1, 4, 'bottom'], [0, 4, 'top'], [1, 5, 'bottom'], [2, 5, 'top'], [3, 6, 'bottom'], [4, 5, 'top'], [5, 5, 'bottom'], [6, 4, 'top'], [7, 4, 'bottom']]
  for (const [rx, y, h] of rows) b.fill(rx, y, 1, rx, y, -9, `dark_oak_slab[type=${h}]`)
  // the mistake: one log in the front-right corner post laid on its side (its end grain shows)
  b.set(6, 2, 0, 'dark_oak_log[axis=z]')
  // the field: farmland and ripe wheat west of the barn, a water channel, a fence, a scarecrow
  b.fill(-12, -1, 1, -3, -1, 9, 'farmland[moisture=7]')
  b.fill(-12, 0, 1, -3, 0, 9, 'wheat[age=7]')
  b.fill(-12, -1, 5, -3, -1, 5, 'water'); b.fill(-12, 0, 5, -3, 0, 5, 'air')
  b.fill(-13, 0, 0, -2, 0, 0, 'oak_fence[east=true,west=true]'); b.fill(-13, 0, 10, -2, 0, 10, 'oak_fence[east=true,west=true]')
  b.fill(-13, 0, 1, -13, 0, 9, 'oak_fence[north=true,south=true]'); b.fill(-2, 0, 1, -2, 0, 4, 'oak_fence[north=true,south=true]'); b.fill(-2, 0, 6, -2, 0, 9, 'oak_fence[north=true,south=true]')
  b.set(-13, 0, 0, 'oak_fence[east=true,south=true]'); b.set(-2, 0, 0, 'oak_fence[west=true,south=true]'); b.set(-13, 0, 10, 'oak_fence[east=true,north=true]'); b.set(-2, 0, 10, 'oak_fence[west=true,north=true]')
  b.set(-2, 0, 5, 'oak_fence_gate[facing=east]')
  b.set(-7, 0, 3, 'oak_fence'); b.set(-7, 1, 3, 'hay_block'); b.set(-7, 2, 3, 'carved_pumpkin[facing=south]')
  // the yard: hay bales, a water trough, a chest, a lantern
  b.set(7, 0, 1, 'hay_block'); b.set(8, 0, 1, 'hay_block'); b.set(7, 1, 1, 'hay_block'); b.set(8, 0, 2, 'hay_block')
  b.set(-1, 0, 1, 'water_cauldron[level=3]'); b.set(1, 0, 1, 'barrel[facing=up]'); b.set(1, 1, 1, 'lantern')
  b.set(5, 0, 1, 'oak_fence'); b.set(5, 1, 1, 'lantern')
  for (const [gx, gz] of [[10, 5], [3, 6], [12, 9], [6, 9], [9, 12]]) b.set(gx, 0, gz, 'short_grass')
}

// --- round 3: a bedroom (inside x 1..10, z -1..-8; walls x 0 / 11, z 0 / -9; floor y -1, ceiling y 4) ---
function bedroom (b) {
  b.fill(0, -1, -9, 11, 4, 0, 'oak_planks')
  b.fill(1, 0, -8, 10, 3, -1, 'air')
  b.fill(1, -1, -8, 10, -1, -1, 'dark_oak_planks')
  b.fill(0, 4, -9, 11, 4, 0, 'spruce_planks')
  for (const [cx, cz] of [[0, 0], [11, 0], [0, -9], [11, -9]]) b.fill(cx, -1, cz, cx, 4, cz, 'stripped_dark_oak_log')
  for (const [gx, gz] of [[3, -3], [8, -3], [3, -6], [8, -6]]) b.set(gx, 4, gz, 'glowstone')
  // north wall: two windows and a double door
  b.fill(2, 1, -9, 3, 2, -9, 'glass_pane[east=true,west=true]'); b.fill(8, 1, -9, 9, 2, -9, 'glass_pane[east=true,west=true]')
  b.fill(5, 0, -9, 6, 1, -9, 'air')
  b.set(5, 0, -9, 'spruce_door[facing=south,half=lower,hinge=right]'); b.set(5, 1, -9, 'spruce_door[facing=south,half=upper,hinge=right]')
  // the second mistake: the right door's hinge is on the same side as the left one's
  b.set(6, 0, -9, 'spruce_door[facing=south,half=lower,hinge=right]'); b.set(6, 1, -9, 'spruce_door[facing=south,half=upper,hinge=right]')
  b.set(4, 2, -8, 'wall_torch[facing=south]'); b.set(7, 2, -8, 'wall_torch[facing=south]')
  // hanging lanterns; the first mistake: one hangs from nothing, a block below the ceiling
  b.set(2, 3, -3, 'lantern[hanging=true]'); b.set(9, 3, -3, 'lantern[hanging=true]')
  b.set(8, 2, -6, 'lantern[hanging=true]')
  // the bed, a nightstand, bookshelves, a carpet, a work corner and chests
  b.set(2, 0, -8, 'red_bed[facing=north,part=head]'); b.set(2, 0, -7, 'red_bed[facing=north,part=foot]')
  b.set(3, 0, -8, 'barrel[facing=up]'); b.set(3, 1, -8, 'lantern')
  b.set(1, 0, -8, 'potted_poppy')
  b.fill(0, 0, -6, 0, 2, -3, 'bookshelf')
  b.fill(4, -0, -6, 7, 0, -4, 'red_carpet'); b.fill(5, 0, -5, 6, 0, -5, 'white_carpet')
  b.set(10, 0, -2, 'furnace[facing=west]'); b.set(10, 0, -3, 'crafting_table'); b.set(10, 1, -3, 'potted_dandelion')
  b.set(10, 0, -5, 'chest[facing=west,type=right]'); b.set(10, 0, -6, 'chest[facing=west,type=left]')
}

module.exports = spotWrong({
  name: 'spot_wrong',
  caption: 'find the mistake 🤔',
  searchFrom: [1600, 1600],
  rounds: [
    { at: [-45, -12], build: house, seconds: 7,
      cam: { pos: [0, 13], walk: 'right' },
      scan: [[0, [3.5, 3.5, 0]], [2.5, [1, 2, 1]], [5, [6, 4.5, 0]], [7, [5.5, 3, 0]]],
      tag: 'EASY',
      reveals: [{ at: [5.5, 2.5, 1.0], zoom: 3, sub: 'oak plank in birch', check: [[5, 2, 0], 'oak_planks'] }] },
    { at: [0, -12], build: farm, seconds: 8,
      cam: { pos: [15, 21], walk: 'forward' },
      scan: [[0, [-6, 1, 4]], [2.5, [0, 2, 0]], [5, [3, 4.5, -3]], [8, [5, 3, 0]]],
      tag: 'MEDIUM', hint: [4, 'hint: not the field'],
      reveals: [{ at: [6.5, 2.5, 1.0], zoom: 3.2, sub: 'a sideways log', check: [[6, 2, 0], 'dark_oak_log'] }] },
    { at: [45, -12], build: bedroom, seconds: 9,
      cam: { pos: [5.5, -1.5] },
      scan: [[0, [2, 1, -8]], [2.2, [0.5, 1.5, -4.5]], [4.2, [5, 1.3, -9]], [6.2, [10, 1, -4.5]], [9, [7, 1.5, -8.5]]],
      tag: 'only 1% can find it', hint: [4, 'hint: not the bed'],
      reveals: [
        { at: [8.5, 2.35, -5.5], zoom: 3.2, sub: 'it hangs on nothing', check: [[8, 2, -6], 'lantern'] },
        { pre: 'wait... there is another one', at: [6.5, 1.1, -8.6], zoom: 2.6, ring: 170, sub: 'hinge on the wrong side', check: [[6, 0, -9], 'spruce_door'] }
      ] }
  ]
})
