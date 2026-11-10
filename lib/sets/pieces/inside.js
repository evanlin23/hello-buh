// Interior sets: a basement under the ground, and a furnished room to film interiors in.
const { Voxels } = require('../voxel')
const { palette } = require('../palette')

const basement = {
  name: 'basement',
  about: 'stone cellar under the ground: a hatch and ladder, beams, shelves, barrels, cobwebs, dim lanterns; variants: an end portal frame, or a lit nether portal in the east wall',
  variants: { eyes: 'portal eyes 0-12 (default: no portal, a storage cellar)', hatch: [true, false], shaft: 'N: the ladder goes N blocks higher, the hatch at y N (a cellar deeper than the floor above it)', portal: ['nether'], gifts: 'with portal nether: years of barters stored by it (obsidian patching the north-east wall, soul sand, a gifts barrel, a gold chest, candles)' },
  build (v = {}) {
    const b = new Voxels('basement').seed(v.seed || 61)
    const X1 = 12, Z1 = 10, F = -6, C = -1   // floor y -6, ceiling y -1 (room y -5..-2)
    const stone = b.mix({ cobblestone: 4, mossy_cobblestone: 2, stone_bricks: 2, cracked_stone_bricks: 1, tuff: 1 })
    b.fill(0, F, 0, X1, C, Z1, stone, 'hollow')
    b.fill(1, F, 1, X1 - 1, F, Z1 - 1, b.mix({ stone_bricks: 3, cracked_stone_bricks: 1, cobblestone: 1, gravel: 1 }))
    b.fill(1, C, 1, X1 - 1, C, Z1 - 1, 'spruce_planks')
    // ceiling beams and posts (depth along the walls)
    for (const x of [3, 6, 9]) { b.fill(x, C, 1, x, C, Z1 - 1, 'dark_oak_log[axis=z]'); for (const z of [1, Z1 - 1]) b.fill(x, F + 1, z, x, C - 1, z, 'stripped_dark_oak_log[axis=y]') }
    // the hatch and the ladder down in the back-left corner
    // shaft: N more blocks of ladder above the ceiling (a cellar sunk deeper than a house's floor, on a slope)
    const top = v.shaft || 0
    if (v.hatch !== false) {
      b.fill(1, C, 1, 1, top, 1, 'air'); b.fill(1, F + 1, 1, 1, top, 1, 'ladder[facing=south]'); b.set(1, F + 1, 0, 'stone')
      if (top) b.fill(1, 0, 0, 1, top - 1, 0, 'stone')
      b.set(1, top, 1, 'spruce_trapdoor[facing=south,half=top,open=true]')
    }
    // shelves of barrels and chests along the back, crates, a workbench, a bed in the corner
    b.fill(4, F + 1, 1, 5, F + 2, 1, 'barrel[facing=south]'); b.set(7, F + 1, 1, 'chest[facing=south]'); b.set(8, F + 1, 1, 'chest[facing=south]')
    b.fill(7, F + 2, 1, 8, F + 2, 1, 'spruce_slab[type=bottom]'); b.set(10, F + 1, 1, 'crafting_table'); b.set(11, F + 1, 1, 'furnace[facing=south]')
    const nether = v.portal === 'nether'
    if (!nether) { b.fill(X1 - 1, F + 1, 3, X1 - 1, F + 3, 4, 'bookshelf'); b.set(X1 - 1, F + 1, 6, 'brewing_stand'); b.set(X1 - 1, F + 1, 7, 'cauldron') }
    b.bed(2, F + 1, Z1 - 1, 'e', 'gray'); b.set(1, F + 1, Z1 - 2, 'barrel[facing=up]'); b.set(1, F + 2, Z1 - 2, 'candle[candles=2,lit=true]')
    b.set(1, F + 1, 5, 'hay_block[axis=x]'); b.set(1, F + 1, 6, 'barrel[facing=east]'); b.set(1, F + 2, 6, 'barrel[facing=up]')
    for (const [x, y, z] of [[1, C - 1, Z1 - 1], [X1 - 1, C - 1, 1], [X1 - 1, C - 1, Z1 - 1], [5, C - 1, Z1 - 1], [2, F + 1, 3]]) if (!(nether && x === 2 && z === 3)) b.set(x, y, z, 'cobweb')
    b.hang(4, C - 1, 5, 0); b.hang(8, C - 1, 5, 0, v.eyes !== undefined ? 'soul_lantern' : 'lantern')
    if (nether) {
      // a lit nether portal against the east wall (inner face x 11): obsidian 4 wide (z 4..7) x 5 tall, its bottom row
      // sunk into the floor (y F) so it fits under the ceiling; the purple sheet 2 x 3 (z 5..6, y F+1..F+3)
      b.fill(X1 - 1, F, 4, X1 - 1, F + 4, 7, 'obsidian')
      b.fill(X1 - 1, F + 1, 5, X1 - 1, F + 3, 6, 'nether_portal[axis=z]')
      b.anchor('portal', X1 - 1, F + 1, 6, 'w')
      b.fill(5, F + 1, 4, 7, F + 1, 6, 'gray_carpet')
      if (v.gifts) {
        // years of barters: obsidian and crying obsidian patching the north-east wall, soul sand under the shelf,
        // the gifts barrel by the portal, Grandpa's gold chest on the north wall with a lantern over it, candles
        for (const [x, y, z, blk] of [[9, F + 1, 0, 'obsidian'], [10, F + 2, 0, 'crying_obsidian'], [11, F + 1, 0, 'obsidian'], [9, F + 3, 0, 'obsidian'], [11, F + 3, 0, 'crying_obsidian'],
          [X1, F + 1, 1, 'obsidian'], [X1, F + 2, 2, 'obsidian'], [X1, F + 3, 1, 'crying_obsidian'], [X1, F + 1, 9, 'obsidian'], [X1, F + 2, 8, 'crying_obsidian']]) b.set(x, y, z, blk)
        b.fill(7, F + 1, 9, 8, F + 1, 9, 'soul_sand')   // against the south wall (under the shelf it blocked the walk to the portal)
        b.set(10, F + 1, 3, 'barrel[facing=up]'); b.set(10, F + 2, 3, 'candle[candles=3,lit=true]')
        b.set(10, F + 1, 1, 'barrel[facing=up]'); b.set(10, F + 2, 1, 'candle[candles=2,lit=true]')
        b.set(11, F + 1, 1, 'air'); b.set(10, F + 1, 2, 'obsidian'); b.set(11, F + 1, 2, 'crying_obsidian'); b.set(11, F + 2, 2, 'obsidian')
        b.hang(8, C - 1, 2, 0); b.hang(10, C - 1, 8, 0)
        b.anchor('gifts', 10, F + 1, 3, 'w')
      }
    } else if (v.eyes !== undefined) {
      // an end portal frame in the middle of the floor, `eyes` of its 12 frames filled
      const cx = 6, cz = 5; let k = 0
      const frames = []
      for (let i = -1; i <= 1; i++) { frames.push([cx + i, cz - 2, 'south'], [cx + 2, cz + i, 'west'], [cx - i, cz + 2, 'north'], [cx - 2, cz - i, 'east']) }
      for (const [x, z, f] of frames) b.set(x, F + 1, z, `end_portal_frame[facing=${f},eye=${k++ < v.eyes}]`)
      b.anchor('portal', cx, F + 1, cz + 4, 'n')
    } else {
      b.fill(5, F + 1, 4, 7, F + 1, 6, 'gray_carpet'); b.table(6, F + 1, 5, { leg: 'spruce_fence', top: 'spruce_pressure_plate' })
    }
    b.anchor('hatch', 1, top + 1, 2, 'n'); b.anchor('ladder_bottom', 2, F + 1, 2, 's')
    b.anchor('center', 6, F + 1, 5, 's'); b.anchor('corner', X1 - 2, F + 1, Z1 - 2, 'n', { look: [2, F + 1, 2] })
    b.anchor('bed', 2, F + 1, Z1 - 1, 'e')
    return b
  }
}

const room = {
  name: 'room',
  about: 'a furnished living room set (fireplace, armchairs, rug, dining table, bed nook, kitchen corner, bookshelves), with a ceiling and windows',
  variants: { palette: ['oak', 'spruce', 'birch', 'plaster', 'stone'] },
  build (v = {}) {
    const P = palette({ palette: 'spruce', ...v }), b = new Voxels('room').seed(v.seed || 71)
    const X1 = 12, Z1 = 10, H = 5   // walls x 0..12, z 0..10, ceiling at y 5
    b.fill(-1, 0, -1, X1 + 1, 0, Z1 + 1, 'grass_block')
    b.fill(-1, 1, -1, X1 + 1, H + 6, Z1 + 1, 'air')
    b.fill(0, 0, 0, X1, H, Z1, P.wall, 'hollow')
    b.fill(0, 0, 0, X1, 0, Z1, b.mix({ [P.footing]: 2, [P.footing2]: 1 }))
    b.fill(1, 0, 1, X1 - 1, 0, Z1 - 1, b.mix({ [P.floor]: 5, [P.floor.replace('planks', 'planks')]: 1 }))
    b.fill(0, 1, 0, X1, 1, Z1, b.mix({ [P.footing]: 2, [P.footing2]: 1 }), 'walls')   // a stone skirting course
    b.fill(1, 1, 1, X1 - 1, H - 1, Z1 - 1, 'air')
    // posts on the walls every 4 and ceiling beams (depth on every wall)
    for (let x = 0; x <= X1; x += 4) for (const z of [0, Z1]) b.fill(x, 1, z, x, H - 1, z, `${P.frame}[axis=y]`)
    for (let z = 0; z <= Z1; z += 5) for (const x of [0, X1]) b.fill(x, 1, z, x, H - 1, z, `${P.frame}[axis=y]`)
    for (let x = 4; x < X1; x += 4) b.fill(x, H - 1, 1, x, H - 1, Z1 - 1, `${P.beam}[axis=z]`)
    b.fill(0, H, 0, X1, H, Z1, `${P.beam}[axis=x]`, 'walls')
    b.roof(0, 0, X1, Z1, H + 1, { along: 'x', stair: P.roof, gable: P.wall, over: 1 })
    // fireplace on the back wall: a brick breast with a fire, a mantel, bookshelves either side
    b.fill(5, 1, 1, 7, H - 1, 1, 'bricks'); b.fill(5, 1, 0, 7, H + 6, 0, 'bricks')
    b.set(6, 1, 1, 'campfire[lit=true,facing=south]'); b.set(6, 2, 1, 'air'); b.set(6, 0, 2, 'bricks')
    b.fill(5, 3, 2, 7, 3, 2, 'spruce_slab[type=top]'); b.set(5, 4, 2, 'candle[candles=2,lit=true]'); b.set(7, 4, 2, 'potted_fern')
    b.fill(2, 1, 1, 3, 3, 1, 'bookshelf'); b.fill(9, 1, 1, 10, 3, 1, 'bookshelf')
    // armchairs and a rug in front of the fire
    b.fill(4, 1, 3, 8, 1, 6, 'red_carpet'); b.fill(5, 1, 4, 7, 1, 5, 'white_carpet')
    b.chair(4, 1, 5, 'n', 'spruce_stairs'); b.chair(8, 1, 5, 'n', 'spruce_stairs')
    b.set(4, 1, 4, `${P.trap}[facing=north,open=true]`); b.set(8, 1, 4, `${P.trap}[facing=north,open=true]`)
    // a dining table with chairs on the left, a kitchen corner on the front-left
    b.table(2, 1, 6, { leg: P.fence, top: 'oak_pressure_plate' }); b.table(2, 1, 7, { leg: P.fence, top: 'oak_pressure_plate' })
    b.chair(1, 1, 6, 'e', P.stair); b.chair(3, 1, 6, 'w', P.stair); b.chair(3, 1, 7, 'w', P.stair)
    b.set(1, 1, 9, 'smoker[facing=east]'); b.set(2, 1, 9, 'barrel[facing=up]'); b.set(3, 1, 9, 'water_cauldron[level=3]'); b.set(1, 1, 8, 'crafting_table')
    b.set(2, 2, 9, 'potted_red_tulip')
    // a bed nook on the right behind a half wall
    b.bed(11, 1, 7, 'w', 'cyan'); b.set(11, 1, 6, 'barrel[facing=up]'); b.set(11, 2, 6, 'lantern')
    b.fill(9, 1, 6, 9, 2, 6, `${P.fence}`); b.set(11, 1, 9, 'chest[facing=west]')
    // windows on the front either side of the door, and on both sides, with sills
    b.door(6, 1, Z1, 's', P.door)
    for (const x of [3, 9]) { b.fill(x - 1, 2, Z1, x, 3, Z1, P.glass); b.set(x - 1, 1, Z1 + 1, `${P.trap}[facing=south,half=top]`); b.set(x, 1, Z1 + 1, `${P.trap}[facing=south,half=top]`) }
    b.fill(0, 2, 3, 0, 3, 3, P.glass); b.fill(X1, 2, 3, X1, 3, 3, P.glass)
    // lanterns on chains from the beams
    b.hang(4, H - 2, 4, 0); b.hang(8, H - 2, 7, 0)
    b.anchor('door', 6, 1, Z1 - 1, 'n'); b.anchor('doorstep', 6, 1, Z1 + 2, 'n')
    b.anchor('fire', 6, 1, 2, 's'); b.anchor('armchair_l', 4, 1, 5, 'n'); b.anchor('armchair_r', 8, 1, 5, 'n')
    b.anchor('table', 2, 1, 6, 'w'); b.anchor('bed', 11, 1, 7, 'w'); b.anchor('kitchen', 2, 1, 8, 's')
    b.anchor('wide', 10, 1, 9, 'n', { look: [3, 1, 2] }); b.anchor('reverse', 6, 1, 3, 's', { look: [6, 1, 10] })
    return b
  }
}

module.exports = { basement, room }
