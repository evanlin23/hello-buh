// A two-storey town house: a stone ground floor, a timber-framed upper floor jettied out over the street on
// upside-down stairs, a steep slate roof, a brick chimney, lanterns under the jetty, flower shelves, and a lit,
// furnished interior on both floors joined by a staircase.
const { Voxels } = require('../voxel')
const { palette } = require('../palette')

module.exports = {
  name: 'house2',
  about: 'two-storey timber-framed town house with a jettied upper floor',
  variants: { palette: ['plaster (default)', 'oak', 'spruce', 'birch'] },
  build (v = {}) {
    const P = palette({ palette: 'plaster', ...v }), b = new Voxels('house2').seed(v.seed || 11)
    const x0 = 1, x1 = 11, z0 = 1, z1 = 8        // ground floor walls (11 x 8)
    const jz = z1 + 1                              // the upper floor's front wall, one out over the street
    const g = 4, up = 5, ut = 9                    // ground walls y 1..4, upper floor at y 5, upper walls y 6..9
    b.fill(0, 0, 0, 12, 0, 12, 'grass_block')
    b.fill(0, 1, 0, 12, 14, 12, 'air')

    // ground floor: stone walls (mixed), log corners, a plank floor
    b.fill(x0, 0, z0, x1, 0, z1, P.footing)
    b.fill(x0 + 1, 0, z0 + 1, x1 - 1, 0, z1 - 1, P.floor)
    b.fill(x0, 1, z0, x1, g, z1, b.mix({ stone_bricks: 4, cobblestone: 2, mossy_stone_bricks: 1, cracked_stone_bricks: 1 }), 'walls')
    b.fill(x0 + 1, 1, z0 + 1, x1 - 1, g, z1 - 1, 'air')
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.fill(x, 1, z, x, g, z, `${P.frame}[axis=y]`)
    // the upper floor deck (jettied 1 to the front) on upside-down stairs
    b.fill(x0, up, z0, x1, up, jz, P.floor)
    b.fill(x0, up, z0, x1, up, z0, `${P.beam}[axis=x]`)
    b.fill(x0, up, jz, x1, up, jz, `${P.beam}[axis=x]`)
    b.fill(x0, g, jz, x1, g, jz, `${P.stair}[facing=north,half=top]`)   // brackets: the tall side against the wall
    // upper walls: plaster panels in a dark timber frame (posts every 2-3, a rail at sill height)
    b.fill(x0, up + 1, z0, x1, ut, jz, P.wall, 'walls')
    b.fill(x0 + 1, up + 1, z0 + 1, x1 - 1, ut, jz - 1, 'air')
    for (const x of [x0, 4, 8, x1]) for (const z of [z0, jz]) b.fill(x, up + 1, z, x, ut, z, `${P.frame}[axis=y]`)
    for (const z of [z0 + 3, jz - 3]) for (const x of [x0, x1]) b.fill(x, up + 1, z, x, ut, z, `${P.frame}[axis=y]`)
    b.fill(x0, ut + 1, z0, x1, ut + 1, z0, `${P.beam}[axis=x]`)
    b.fill(x0, ut + 1, jz, x1, ut + 1, jz, `${P.beam}[axis=x]`)
    // the roof: steep, ridge along x, overhang 1
    b.roof(x0, z0, x1, jz, ut + 1, { along: 'x', stair: P.roof, gable: P.wall, over: 1 })
    b.verge(x0, z0, x1, jz, ut + 1, { along: 'x', over: 1, trim: 'dark_oak' })
    // stone pilasters standing proud of the ground-floor wall (depth), capped with stairs under the jetty
    for (const x of [5, 7]) { b.fill(x, 0, z1 + 1, x, 3, z1 + 1, 'stone_bricks'); b.set(x, g, z1 + 1, 'stone_brick_stairs[facing=north,half=top]') }
    for (const z of [6]) for (const [x, f] of [[x0 - 1, 'east'], [x1 + 1, 'west']]) { b.fill(x, 0, z, x, 3, z, 'stone_bricks'); b.set(x, g, z, `stone_brick_stairs[facing=${f},half=top]`) }
    // a timber post up the middle of each gable
    for (const x of [x0, x1]) b.fill(x, ut + 1, 5, x, ut + 4, 5, `${P.frame}[axis=y]`)

    // the front: a door in the middle, windows, lanterns under the jetty, a bench
    b.door(6, 1, z1, 's', P.door)
    b.set(6, 0, z1 + 1, 'stone_brick_slab[type=top]')
    b.window(2, 2, z1, 's', { w: 2, glass: P.glass, shutter: P.trap })
    b.window(9, 2, z1, 's', { w: 2, glass: P.glass, shutter: P.trap })
    b.window(2, 7, jz, 's', { w: 1, glass: P.glass, shutter: null, box: true })
    b.window(5, 7, jz, 's', { w: 3, glass: P.glass, shutter: null, box: true })
    b.window(10, 7, jz, 's', { w: 1, glass: P.glass, shutter: null, box: true })
    b.window(x0, 7, 4, 'w', { w: 2, glass: P.glass, shutter: null })
    b.window(x1, 2, 3, 'e', { w: 2, glass: P.glass, shutter: P.trap })
    b.window(x1, 7, 4, 'e', { w: 2, glass: P.glass, shutter: null })
    b.window(5, 2, z0, 'n', { w: 2, glass: P.glass, shutter: P.trap })
    b.window(6, 7, z0, 'n', { w: 2, glass: P.glass, shutter: null })
    b.hang(4, g, jz, 0); b.hang(8, g, jz, 0)
    b.chair(9, 1, z1 + 2, 's', `${P.stair}`); b.chair(10, 1, z1 + 2, 's', `${P.stair}`)
    b.set(2, 1, z1 + 1, 'barrel[facing=up]'); b.set(3, 1, z1 + 1, 'potted_red_tulip')
    b.set(2, 2, z1 + 1, 'potted_azure_bluet')

    // the chimney up the west gable, brick
    b.fill(x0 - 1, 0, 2, x0 - 1, 15, 3, 'bricks')
    b.fill(x0 - 1, 16, 2, x0 - 1, 16, 3, 'brick_wall')

    // ground floor inside: kitchen (west), a table, the stairs up along the back wall
    b.set(x0 + 1, 1, 3, 'furnace[facing=east]'); b.set(x0 + 1, 1, 4, 'smoker[facing=east]')
    b.set(x0 + 1, 1, 5, 'barrel[facing=east]'); b.set(x0 + 1, 2, 5, 'potted_fern')
    b.set(x0 + 1, 1, 6, 'crafting_table')
    b.table(5, 1, 5); b.chair(4, 1, 5, 'e', P.stair); b.chair(6, 1, 5, 'w', P.stair)
    b.fill(4, 0, 4, 6, 0, 6, 'spruce_planks'); b.fill(4, 1, 4, 6, 1, 6, 'red_carpet', 'keep')
    b.hang(5, g, 5, 0)
    // stairs: up along the back wall from x 10 (bottom) to x 7 (top), the floor opened over them
    for (let i = 0; i < 4; i++) b.set(10 - i, 1 + i, z0 + 1, `spruce_stairs[facing=west]`)
    b.fill(7, up, z0 + 1, 10, up, z0 + 1, 'air')
    b.fill(7, up + 1, z0 + 2, 10, up + 1, z0 + 2, P.fence)   // a banister
    b.set(10, 1, z0 + 2, 'chest[facing=west]'); b.set(10, 1, z0 + 3, 'chest[facing=west]')
    b.fill(10, 1, 6, 10, 2, 7, 'bookshelf')

    // upstairs: two beds, a rug, shelves, a desk at the front window, lanterns
    b.bed(2, up + 1, z0 + 1, 's', v.bed || 'blue'); b.bed(4, up + 1, z0 + 1, 's', v.bed2 || 'light_gray')
    b.set(3, up + 1, z0 + 1, 'barrel[facing=up]'); b.set(3, up + 2, z0 + 1, 'candle[candles=3,lit=true]')
    b.fill(3, up + 1, 4, 6, up + 1, 6, 'white_carpet')
    b.fill(x1 - 1, up + 1, 7, x1 - 1, up + 2, 8, 'bookshelf')
    b.table(6, up + 1, jz - 1, { top: 'spruce_pressure_plate' }); b.chair(6, up + 1, jz - 2, 's', P.stair)
    b.hang(3, ut, 5, 0); b.hang(8, ut, 5, 0)
    // floor support beams over the ground floor show as a ceiling
    for (const x of [3, 7]) b.fill(x, g, z0 + 1, x, g, z1 - 1, `${P.beam}[axis=z]`)

    b.anchor('door', 6, 1, z1, 's')
    b.anchor('doorstep', 6, 1, z1 + 3, 'n')
    b.anchor('street', 6, 1, 15, 'n')
    b.anchor('stairs_bottom', 10, 1, z0 + 2, 'w')
    b.anchor('stairs_top', 6, up + 1, z0 + 1, 'e')
    b.anchor('bed', 2, up + 1, z0 + 1, 's')
    b.anchor('upper_window', 6, up + 1, jz - 1, 's')   // upstairs at the big front window, looking down the street
    b.anchor('table', 5, 1, 5, 's')
    b.anchor('kitchen', x0 + 2, 1, 4, 'w')
    b.anchor('inside', 9, 1, 7, 'n', { look: [2, 2, 2] })
    b.anchor('chimney', x0 - 1, 17, 2, 'up')
    return b
  }
}
