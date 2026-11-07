// "find the mistake 🤔" #3 (worker 12, lib/spot_wrong.js): three new builds, one wrong block each.
//  1 EASY    a pumpkin patch by a shed: one of the pumpkins is a melon
//  2 MEDIUM  a stone bridge over a stream: one deck slab is in the top half
//  3 "only 1% can find it"  a nether portal room: one of the two gold blocks by the portal is raw
//            gold, then "wait, there's another one": one frame block is crying obsidian, and a
//            frame with crying obsidian can never be lit (text payoff, read time 1.6 s)
const spotWrong = require('../lib/spot_wrong')

// --- round 1: a pumpkin patch (x -6..6, z 0..8) in front of a spruce shed ---
function patch (b) {
  b.fill(-6, -1, 0, 6, -1, 8, 'farmland[moisture=7]')
  for (let x = -6; x <= 6; x++) for (let z = 0; z <= 8; z++) {
    if (z % 2 === 0) b.set(x, 0, z, (x + z) % 3 === 0 ? 'pumpkin' : 'pumpkin_stem[age=7]')
    else b.set(x, -1, z, 'grass_block')
  }
  for (let x = -6; x <= 6; x += 3) for (const z of [0, 2, 4, 6, 8]) b.set(x, 0, z, 'pumpkin')
  // the mistake: one melon among the pumpkins
  b.set(0, 0, 4, 'melon')
  b.fill(-7, 0, -1, 7, 0, -1, 'spruce_fence[east=true,west=true]'); b.fill(-7, 0, 9, 7, 0, 9, 'spruce_fence[east=true,west=true]')
  // the shed behind the patch (x -3..3, z -2..-6)
  b.fill(-3, 0, -6, 3, 3, -2, 'spruce_planks'); b.fill(-2, 0, -5, 2, 3, -3, 'air')
  for (const [cx, cz] of [[-3, -2], [3, -2], [-3, -6], [3, -6]]) b.fill(cx, 0, cz, cx, 3, cz, 'stripped_spruce_log')
  b.fill(-4, 4, -7, 4, 4, -1, 'spruce_slab'); b.fill(-3, 4, -6, 3, 4, -2, 'spruce_planks'); b.fill(-2, 5, -5, 2, 5, -3, 'spruce_slab')
  b.set(0, 0, -2, 'spruce_door[facing=south,half=lower,hinge=left]'); b.set(0, 1, -2, 'spruce_door[facing=south,half=upper,hinge=left]')
  b.set(-2, 1, -2, 'glass_pane[east=true,west=true]'); b.set(2, 1, -2, 'glass_pane[east=true,west=true]')
  b.set(-2, 2, -4, 'glowstone')
  // a scarecrow, hay, a cart of pumpkins, lanterns
  b.set(4, 0, 4, 'oak_fence'); b.set(4, 1, 4, 'hay_block'); b.set(4, 2, 4, 'carved_pumpkin[facing=south]')
  b.set(5, 0, -2, 'hay_block'); b.set(6, 0, -2, 'hay_block'); b.set(5, 1, -2, 'hay_block'); b.set(-5, 0, -2, 'composter'); b.set(-6, 0, -2, 'barrel[facing=up]'); b.set(-6, 1, -2, 'lantern')
  b.set(-7, 1, 9, 'lantern'); b.set(7, 1, 9, 'lantern')
  b.fill(9, 0, -4, 9, 4, -4, 'oak_log'); b.fill(7, 4, -6, 11, 5, -2, 'orange_wool'); b.set(9, 4, -4, 'oak_log')   // an autumn tree
}

// --- round 2: a stream (x -20..20, z 0..4) and a stone brick bridge across it (x -1..1) ---
function bridge (b) {
  b.fill(-24, -4, -1, 24, -1, 5, 'dirt'); b.fill(-24, -3, 0, 24, -1, 4, 'water'); b.fill(-24, -4, 0, 24, -4, 4, 'gravel')
  b.fill(-24, -1, -1, 24, -1, -1, 'grass_block'); b.fill(-24, -1, 5, 24, -1, 5, 'grass_block')
  // the arch: stone bricks, a slab deck, walls for rails
  b.fill(-2, -1, -1, 2, -1, -1, 'stone_bricks'); b.fill(-2, -1, 5, 2, -1, 5, 'stone_bricks')
  b.fill(-1, 0, -1, 1, 0, 5, 'stone_brick_slab[type=bottom]')
  b.fill(-2, 0, 0, -2, 0, 4, 'stone_brick_wall'); b.fill(2, 0, 0, 2, 0, 4, 'stone_brick_wall')
  b.fill(-2, -1, 0, 2, -1, 4, 'stone_bricks'); b.fill(-1, -3, 1, 1, -2, 3, 'water')
  b.fill(-2, -3, 0, 2, -2, 0, 'stone_bricks'); b.fill(-2, -3, 4, 2, -2, 4, 'stone_bricks')
  b.set(-2, 1, 0, 'lantern'); b.set(2, 1, 0, 'lantern'); b.set(-2, 1, 4, 'lantern'); b.set(2, 1, 4, 'lantern')
  // the mistake: one deck slab in the top half
  b.set(0, 0, 3, 'stone_brick_slab[type=top]')
  // the banks: a path, reeds, lily pads, a willow-ish tree, flowers
  b.fill(0, -1, -12, 0, -1, -2, 'dirt_path'); b.fill(0, -1, 6, 0, -1, 14, 'dirt_path')
  for (const [sx, sz] of [[-6, 0], [-5, 0], [7, 4], [8, 4], [-12, 4], [12, 0]]) { b.set(sx, -1, sz, 'sand'); b.set(sx, 0, sz, 'sugar_cane'); b.set(sx, 1, sz, 'sugar_cane') }
  for (const [lx, lz] of [[-8, 2], [5, 1], [10, 3], [-3, 3]]) b.set(lx, 0, lz, 'lily_pad')
  b.fill(-9, 0, -5, -9, 4, -5, 'oak_log'); b.fill(-11, 4, -7, -7, 5, -3, 'oak_leaves[persistent=true]'); b.fill(-10, 6, -6, -8, 6, -4, 'oak_leaves[persistent=true]'); b.set(-9, 4, -5, 'oak_log'); b.set(-9, 5, -5, 'oak_log')
  const fl = ['poppy', 'dandelion', 'cornflower', 'oxeye_daisy', 'allium']
  ;[[-4, 7], [3, 8], [6, 7], [-7, 8], [9, 9], [-2, -4], [4, -3]].forEach(([fx, fz], i) => b.set(fx, 0, fz, fl[i % fl.length]))
}

// --- round 3: a portal room (inside x 1..10, z -1..-8; walls x 0 / 11, z 0 / -9) ---
function portal (b) {
  b.fill(0, -1, -9, 11, 5, 0, 'polished_blackstone_bricks')
  b.fill(1, 0, -8, 10, 4, -1, 'air')
  b.fill(1, -1, -8, 10, -1, -1, 'polished_blackstone')
  b.fill(4, -1, -8, 7, -1, -3, 'netherrack')
  for (const [gx, gz] of [[3, -3], [8, -3], [3, -6], [8, -6]]) b.set(gx, 5, gz, 'shroomlight')
  for (const [cx, cz] of [[0, -9], [11, -9], [0, 0], [11, 0]]) b.fill(cx, -1, cz, cx, 5, cz, 'gilded_blackstone')
  // the portal frame against the north wall (x 4..7, y 0..4), lit
  b.fill(4, 0, -8, 7, 4, -8, 'obsidian')
  // the mistake: one frame block is crying obsidian (set before the portal: a frame change next to
  // a lit portal would break it)
  b.set(7, 2, -8, 'crying_obsidian')
  b.fill(5, 1, -8, 6, 3, -8, 'nether_portal[axis=x]')
  // gold blocks either side; the second mistake: one is raw gold
  b.set(2, 0, -8, 'gold_block'); b.set(9, 0, -8, 'raw_gold_block')
  b.set(2, 1, -8, 'lantern'); b.set(9, 1, -8, 'lantern')
  b.set(1, 2, -8, 'wall_torch[facing=south]'); b.set(10, 2, -8, 'wall_torch[facing=south]')
  // the rest: chests, a smithing table, a respawn anchor, crimson stems
  b.set(1, 0, -4, 'chest[facing=east]'); b.set(1, 0, -5, 'barrel[facing=up]'); b.set(1, 0, -6, 'smithing_table')
  b.set(10, 0, -4, 'respawn_anchor[charges=2]'); b.set(10, 0, -6, 'crimson_planks'); b.set(10, 1, -6, 'crimson_planks'); b.set(10, 0, -5, 'anvil[facing=north]')
  b.set(3, 0, -2, 'magma_block')
}

module.exports = spotWrong({
  name: 'spot_wrong_3',
  caption: 'find the mistake 🤔',
  searchFrom: [1600, 1600],
  rounds: [
    { at: [-45, -12], build: patch, seconds: 7,
      cam: { pos: [-3, 16], walk: 'right' },
      scan: [[0, [-2, 0.5, 4]], [3, [1, 0.5, 4]], [6, [2, 0.8, 2]]],
      tag: 'EASY',
      reveals: [{ at: [0.5, 0.6, 4.5], zoom: 3.2, sub: 'a melon', check: [[0, 0, 4], 'melon'] }] },
    { at: [0, -12], build: bridge, seconds: 8,
      cam: { pos: [-14, 14], walk: 'right' },
      scan: [[0, [-9, 3, -5]], [2.5, [0, 0.5, 0]], [5, [0, 0.5, 2.5]], [8, [1, 0.5, 2]]],
      tag: 'MEDIUM', hint: [4, 'hint: not the tree'],
      reveals: [{ at: [0.5, 0.75, 3.5], zoom: 3.2, sub: 'an upside-down slab', check: [[0, 0, 3], 'stone_brick_slab'] }] },
    { at: [45, -12], build: portal, seconds: 9,
      cam: { pos: [5.5, -1.5] },
      scan: [[0, [5.5, 2, -8]], [2.2, [1, 0.8, -5]], [4.2, [6, 3, -8.5]], [6.2, [10, 0.8, -5]], [9, [5, 2, -8]]],
      tag: 'only 1% can find it', hint: [4.5, 'hint: look closer'],
      reveals: [
        { at: [9.5, 0.5, -7.0], zoom: 3, strafe: 'left', sub: 'that is raw gold', check: [[9, 0, -8], 'raw_gold_block'] },
        { pre: 'wait... there is another one', at: [7.5, 2.5, -7.0], zoom: 3.2, ring: 130, hold: 2.4, tail: 1.6, sub: 'crying obsidian: it could never light', check: [[7, 2, -8], 'crying_obsidian'] }
      ] }
  ]
})
