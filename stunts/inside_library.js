// "inside" #1 (lib/inside.js; docs/formats.md, r:r9a54b2): a walk down a two-storey library hall (bookshelf walls, a
// stone fireplace, lantern chandeliers, a dining table, a balcony over the entry) to the front door, out, and a turn
// round to the house: a 5x5 plank hut with a flat roof. The cut hides on the closed door (lib/inside.js).
//
// Room coords A(dx, dy, dz): dx east, dy up from the floor, dz south; the hall is dx -7..7, dz -21..-1, dy 1..10, the
// entry (the hut's inside) dx -1..1, dz -3..-1 under the balcony (dy 4, dz -4..-1). Lights stay 6+ blocks (manhattan)
// from the cells in front of the door, so it is lit by the entry's lantern and the sky only, like the hut's.
const inside = require('../lib/inside')

async function room (ctx, A) {
  const c = (s) => ctx.cmd(s)
  const fill = (a, b, block) => c(`/fill ${A(...a)} ${A(...b)} ${block}`)
  const set = (a, block) => c(`/setblock ${A(...a)} ${block}`)
  // ---- walls: bookshelves in two tiers on the west, back and east, a dark oak beam between them
  await fill([-7, 1, -21], [-7, 9, -2], 'bookshelf')
  await fill([-6, 1, -21], [6, 9, -21], 'bookshelf')
  await fill([7, 1, -21], [7, 9, -2], 'bookshelf')
  await fill([-7, 5, -21], [-7, 5, -1], 'stripped_dark_oak_log[axis=z]')
  await fill([7, 5, -21], [7, 5, -1], 'stripped_dark_oak_log[axis=z]')
  await fill([-7, 5, -21], [7, 5, -21], 'stripped_dark_oak_log[axis=x]')
  for (const dz of [-20, -16, -12, -8, -4]) {
    await fill([-7, 1, dz], [-7, 10, dz], 'dark_oak_log')
    if (dz !== -12 && dz !== -8 && dz !== -4) await fill([7, 1, dz], [7, 10, dz], 'dark_oak_log')
    await fill([-7, 10, dz], [7, 10, dz], 'dark_oak_log[axis=x]')                 // ceiling beams
  }
  // ---- the fireplace on the east wall: a stone brick breast, a campfire hearth, a flue, a mantel with candles
  await fill([5, 1, -14], [7, 10, -10], 'stone_bricks')
  await fill([5, 4, -14], [5, 4, -10], 'chiseled_stone_bricks')
  await fill([5, 0, -13], [6, 0, -11], 'bricks')
  await fill([5, 1, -13], [6, 2, -11], 'air')
  await set([6, 1, -12], 'campfire[lit=true,facing=west]')
  await fill([6, 3, -12], [6, 10, -12], 'air')
  await fill([4, 3, -13], [4, 3, -11], 'spruce_slab[type=top]')
  await set([4, 4, -13], 'candle[candles=3,lit=true]')
  await set([4, 4, -11], 'candle[candles=2,lit=true]')
  await set([4, 4, -12], 'potted_fern')
  // the rug and two armchairs facing each other by the fire
  await fill([2, 1, -13], [4, 1, -11], 'brown_carpet')
  await set([3, 1, -14], 'spruce_stairs[facing=north]')
  await set([3, 1, -10], 'spruce_stairs[facing=south]')
  // ---- the long red runner down the middle (it stops at the entry: the hut has bare boards)
  await fill([-1, 1, -21], [1, 1, -5], 'red_carpet')
  // ---- a dining table on the west side: slab top, stair chairs, a cake and candles
  await fill([-5, 1, -11], [-4, 1, -9], 'spruce_slab[type=top]')
  await fill([-6, 1, -11], [-6, 1, -9], 'spruce_stairs[facing=west]')
  await fill([-3, 1, -11], [-3, 1, -9], 'spruce_stairs[facing=east]')
  await set([-4, 2, -9], 'cake')
  await set([-5, 2, -10], 'candle[candles=3,lit=true]')
  await set([-4, 2, -11], 'potted_flowering_azalea_bush')
  // ---- two chandeliers: chains from the beams, a dark oak cross, five lanterns
  for (const dz of [-8, -15]) {
    for (let dy = 8; dy <= (dz === -8 ? 9 : 10); dy++) await set([0, dy, dz], 'iron_chain[axis=y]')
    await set([0, 7, dz], 'dark_oak_fence[north=true,south=true,east=true,west=true]')
    await set([1, 7, dz], 'dark_oak_fence[west=true]')
    await set([-1, 7, dz], 'dark_oak_fence[east=true]')
    await set([0, 7, dz - 1], 'dark_oak_fence[south=true]')
    await set([0, 7, dz + 1], 'dark_oak_fence[north=true]')
    for (const [ax, az] of [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1]]) await set([ax, 6, dz + az], 'lantern[hanging=true]')
  }
  // ---- the balcony over the entry, its railing, the stairs up the east side
  await fill([-7, 4, -4], [7, 4, -1], 'spruce_planks')
  await fill([-7, 4, -4], [4, 4, -4], 'stripped_dark_oak_log[axis=x]')
  for (const dx of [-5, 5]) await fill([dx, 1, -4], [dx, 3, -4], 'dark_oak_log')
  await set([-7, 5, -4], 'spruce_fence[east=true,west=true]')
  await fill([-6, 5, -4], [3, 5, -4], 'spruce_fence[east=true,west=true]')
  await set([4, 5, -4], 'spruce_fence[west=true]')
  await set([-6, 6, -4], 'lantern[hanging=false]')
  await set([3, 6, -4], 'lantern[hanging=false]')
  for (let k = 0; k < 4; k++) {
    if (k > 0) await fill([5, 1, -8 + k], [6, k, -8 + k], 'spruce_planks')
    await fill([5, 1 + k, -8 + k], [6, 1 + k, -8 + k], 'spruce_stairs[facing=south]')
  }
  // upstairs: shelves along the front wall, a chest, a barrel, plants
  await fill([-7, 5, -1], [7, 8, -1], 'bookshelf')
  await set([-5, 5, -2], 'chest[facing=south]')
  await set([-4, 5, -2], 'barrel[facing=up]')
  await set([1, 5, -2], 'potted_flowering_azalea_bush')
  await set([-2, 5, -2], 'decorated_pot')
  // ---- under the balcony: a kitchen corner (west) and a bed (east), each with its lantern
  await set([-7, 1, -2], 'smoker[facing=east,lit=true]')
  await set([-7, 1, -3], 'barrel[facing=up]')
  await set([-7, 1, -1], 'crafting_table')
  await set([-6, 1, -1], 'barrel[facing=up]')
  await set([-6, 2, -1], 'potted_red_tulip')
  await set([-5, 3, -2], 'lantern[hanging=true]')
  await set([4, 1, -3], 'red_bed[facing=south,part=foot]')
  await set([4, 1, -2], 'red_bed[facing=south,part=head]')
  await set([6, 1, -1], 'chest[facing=west]')
  await set([5, 3, -2], 'lantern[hanging=true]')
  // ---- corners and odd spots
  await set([-6, 1, -20], 'potted_flowering_azalea_bush')
  await set([6, 1, -20], 'flowering_azalea')
  await set([6, 1, -16], 'decorated_pot')
  await set([-6, 1, -14], 'flowering_azalea')
  await set([-6, 1, -6], 'barrel[facing=up]')
  await set([-6, 2, -6], 'lantern[hanging=false]')
}

module.exports = inside.make({
  name: 'inside_library',
  caption: 'rate my tiny house 🏠',
  red: 'tiny',
  // the opening (owner r:r0f3da0: never a still room): frame 0 is already mid-turn across the hall's best side, the
  // fireplace, both chandeliers and the two tiers of shelves, looking up at them; the turn sweeps on to the door. The
  // walk's eased sway started from a standstill (0 deg/s on frame 0), so the edit starts 0.3 s in (the turn at speed,
  // ~55 deg/s, frame 0 on the chandelier, the fireplace's edge and both tiers; a wider sweep opened on the bare chimney)
  sway: [[-0.3, 0.75], [1.4, -0.45], [2.7, 0]],
  pitch: [[-0.3, 0.46], [1.4, 0.14], [2.7, 0.02]],
  // (the pop moves with the start: it is the first sound hit, louder than the 0.35 that pace didn't count)
  // the end (owner r:r188b46, fast ends): 0.7 s after the turn lands on the hut
  edit: { startAt: 'beat:0.3', endAfter: 'reveal:0.7', sfx: [['pop', 'beat:0.32', { gain: 0.7 }], ['dip', 'reveal', 0.35], ['impact', 'reveal']] },
  room
})
