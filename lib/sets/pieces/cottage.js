// A one-room cottage with depth: log posts on the outer line and plank panels set back between them (so the
// windows sit recessed, with slab sills and trapdoor heads), a stone plinth course, a stair roof with a one-block
// overhang, eave brackets and a contrasting dark-oak verge trim, a stone chimney, flower shelves, a lit furnished
// interior, and a front garden (fence, gate lanterns, flower beds, a vegetable patch, a woodpile, a rain barrel).
const { Voxels } = require('../voxel')
const { palette } = require('../palette')

module.exports = {
  name: 'cottage',
  about: 'one-room cottage with garden, chimney and a furnished, lit interior',
  variants: { palette: ['oak', 'spruce', 'birch', 'plaster', 'stone'], garden: [true, false], bed: 'red (bed colour)', trim: 'verge trim wood (default dark_oak)' },
  build (v = {}) {
    const P = palette(v), b = new Voxels('cottage').seed(v.seed || 7)
    const garden = v.garden !== false
    const X0 = 1, X1 = 11, Z0 = 1, Z1 = 9, top = 4   // the post line; panels one in; walls y 1..4
    const W = 15, D = garden ? 16 : 12             // the lot x -1..13
    const trim = v.trim || (P.roof.startsWith('dark_oak') ? 'spruce' : 'dark_oak')

    b.fill(-1, 0, 0, W - 2, 0, D - 1, 'grass_block')
    b.fill(-1, 1, 0, W - 2, 12, D - 1, 'air')
    const r = b.framed(X0, Z0, X1, Z1, top, {
      post: P.frame, beam: P.beam, every: 5,
      panel: b.mix({ [P.wall]: 6, [P.wall === 'oak_planks' ? 'stripped_oak_wood[axis=y]' : P.wall]: 1 }),
      lower: b.mix({ [P.footing]: 2, [P.footing2]: 1 }), lowerTop: 1,
      footing: b.mix({ [P.footing]: 3, [P.footing2]: 2, andesite: 1 })
    })
    b.fill(r.x0, 0, r.z0, r.x1, 0, r.z1, P.floor)
    // a tie beam across the room to hang the lantern from
    b.fill(6, top + 1, r.pz0, 6, top + 1, r.pz1, `${P.beam}[axis=z]`)
    // the roof over the post line, ridge along x, overhang 1, with brackets under the eaves and a contrasting verge
    b.roof(X0, Z0, X1, Z1, top + 2, { along: 'x', stair: P.roof, gable: P.gable, over: 1 })
    b.verge(X0, Z0, X1, Z1, top + 2, { along: 'x', over: 1, trim })
    for (const x of [X0, 6, X1]) { b.set(x, top + 1, Z1 + 1, `${trim}_stairs[facing=north,half=top]`); b.set(x, top + 1, Z0 - 1, `${trim}_stairs[facing=south,half=top]`) }

    // the front (panel line z = 8): a door in the left bay, a small window beside it, a wide window in the right bay
    b.door(3, 1, r.pz1, 's', P.door)
    b.set(3, 1, Z1, 'air'); b.set(3, 0, Z1, `${P.footing}`)
    b.set(3, 3, Z1, `${trim}_trapdoor[facing=south,half=top,open=false]`)
    b.sill(5, 2, r.pz1, 's', { w: 1, glass: P.glass, sill: `${P.slab}[type=top]`, head: P.trap })
    b.sill(8, 2, r.pz1, 's', { w: 2, glass: P.glass, sill: `${P.slab}[type=top]`, head: P.trap })
    b.set(8, 2, Z1, `potted_${b.pick(['poppy', 'azure_bluet', 'cornflower'])}`); b.set(9, 2, Z1, `potted_${b.pick(['red_tulip', 'oxeye_daisy', 'allium'])}`)
    b.set(7, 2, Z1, `${P.trap}[facing=west,open=true,half=bottom]`); b.set(10, 2, Z1, `${P.trap}[facing=east,open=true,half=bottom]`)
    b.set(7, 3, Z1, `${P.trap}[facing=west,open=true,half=bottom]`); b.set(10, 3, Z1, `${P.trap}[facing=east,open=true,half=bottom]`)
    // the sides and the back
    b.sill(r.px0, 2, 3, 'w', { w: 2, glass: P.glass, sill: `${P.slab}[type=top]`, head: P.trap })
    b.sill(r.px1, 2, 7, 'e', { w: 1, glass: P.glass, sill: `${P.slab}[type=top]`, head: P.trap })
    b.sill(3, 2, r.pz0, 'n', { w: 2, glass: P.glass, sill: `${P.slab}[type=top]`, head: P.trap })

    // the chimney: a stone breast in the east panel, a stack outside up past the roof, a hearth fire
    b.fill(r.px1, 1, 3, r.px1, top, 5, b.mix({ cobblestone: 3, stone_bricks: 1 }))
    b.fill(X1 + 1, 0, 3, X1 + 1, 3, 5, b.mix({ cobblestone: 3, mossy_cobblestone: 2 }))
    b.fill(X1, 1, 3, X1, 3, 5, b.mix({ cobblestone: 3, mossy_cobblestone: 1 }))
    b.fill(X1 + 1, 4, 4, X1 + 1, 12, 4, b.mix({ cobblestone: 2, stone_bricks: 1 }))
    b.fill(X1, 4, 4, X1, 12, 4, b.mix({ cobblestone: 2, stone_bricks: 1, mossy_cobblestone: 1 }))
    b.set(X1, 13, 4, 'campfire[lit=true,facing=south]'); b.set(X1 + 1, 13, 4, 'cobblestone_wall')   // smoke from the chimney
    b.set(r.x1, 1, 4, 'campfire[lit=true,facing=west]'); b.set(r.x1, 1, 5, 'furnace[facing=west]'); b.set(r.x1, 2, 5, 'flower_pot')

    // inside (x 3..9, z 3..7): bed, shelves, table and chairs on a rug, a chest, the lantern
    b.bed(4, 1, r.z0, 's', v.bed || 'red')
    b.set(5, 1, r.z0, 'barrel[facing=up]'); b.set(5, 2, r.z0, 'potted_fern')
    b.fill(7, 1, r.z0, 8, 2, r.z0, 'bookshelf')
    b.set(r.x1, 1, r.z0, 'chest[facing=west]')
    b.fill(5, 1, 5, 7, 1, 7, 'brown_carpet')
    b.table(6, 1, 6, { leg: P.fence, top: 'oak_pressure_plate' })
    b.chair(5, 1, 6, 'e', P.stair); b.chair(7, 1, 6, 'w', P.stair)
    b.set(r.x0, 1, r.z1, 'crafting_table')
    b.hang(6, top, 5, 0)
    // a woodpile under the west eave, a rain barrel and a cauldron at the back
    b.fill(X0 - 1, 1, 6, X0 - 1, 2, 8, 'oak_log[axis=z]'); b.set(X0 - 1, 3, 7, 'oak_log[axis=z]')
    b.set(9, 1, Z0 - 1, 'barrel[facing=up]'); b.set(10, 1, Z0 - 1, 'water_cauldron[level=3]'); b.set(8, 1, Z0 - 1, 'composter[level=4]')

    // the front garden: path with a stepping-stone edge, fence, gate lanterns, beds of flowers, a vegetable patch
    for (let z = Z1 + 1; z < D; z++) { b.set(3, 0, z, b.pick(['dirt_path', 'dirt_path', 'coarse_dirt'])); if (b.rand() < 0.5) b.set(b.rand() < 0.5 ? 2 : 4, 0, z, b.pick(['dirt_path', 'cobblestone', 'gravel'])) }
    if (garden) {
      const g = D - 1
      b.fill(-1, 1, g, W - 2, 1, g, P.fence); b.fill(-1, 1, Z1 + 2, -1, 1, g, P.fence); b.fill(W - 2, 1, Z1 + 2, W - 2, 1, g, P.fence)
      b.set(3, 1, g, `${P.gate}[facing=south,open=false]`)
      b.fill(2, 1, g, 2, 2, g, P.footing); b.fill(4, 1, g, 4, 2, g, P.footing)
      b.set(2, 3, g, 'lantern'); b.set(4, 3, g, 'lantern')
      const flowers = ['poppy', 'dandelion', 'azure_bluet', 'oxeye_daisy', 'cornflower', 'allium', 'red_tulip', 'white_tulip', 'lily_of_the_valley']
      for (let x = 0; x < W - 2; x++) for (let z = Z1 + 2; z < g; z++) {
        if (Math.abs(x - 3) <= 1) continue
        if (x >= 8 && z <= Z1 + 4) continue   // the vegetable patch
        const q = b.rand()
        if (q < 0.4) b.set(x, 1, z, b.pick(flowers))
        else if (q < 0.58) b.set(x, 1, z, 'short_grass')
        else if (q < 0.66) b.tall(x, 1, z, b.pick(['rose_bush', 'peony', 'lilac']))
        else if (q < 0.7) b.set(x, 1, z, 'sweet_berry_bush[age=3]')
      }
      b.fill(8, 0, Z1 + 2, 11, 0, Z1 + 4, 'farmland[moisture=7]')
      b.fill(8, 1, Z1 + 2, 11, 1, Z1 + 2, 'carrots[age=7]'); b.fill(8, 1, Z1 + 3, 11, 1, Z1 + 3, 'potatoes[age=5]'); b.fill(8, 1, Z1 + 4, 11, 1, Z1 + 4, 'beetroots[age=3]')
      b.fill(7, 0, Z1 + 2, 7, 0, Z1 + 4, `${P.trap}[facing=west,half=top,open=false]`)
      b.set(12, 1, Z1 + 2, 'composter[level=7]')
    }

    // plants against the walls: bushes and flowers along the sides and the back, with gaps
    const edge = []
    for (let x = X0; x <= X1; x++) edge.push([x, Z0 - 1])
    for (let z = Z0; z <= Z1; z++) { edge.push([X0 - 1, z]); edge.push([X1 + 2, z]) }
    for (const [x, z] of edge) {
      if (b.has(x, 1, z) || b.rand() < 0.35) continue
      const q = b.rand()
      if (q < 0.3) b.set(x, 1, z, b.pick(['bush', 'fern', 'sweet_berry_bush[age=2]', 'azalea']))
      else if (q < 0.45) b.tall(x, 1, z, b.pick(['rose_bush', 'lilac', 'peony', 'large_fern']))
      else b.set(x, 1, z, b.pick(['poppy', 'azure_bluet', 'oxeye_daisy', 'short_grass', 'short_grass', 'dandelion']))
    }

    b.anchor('door', 3, 1, r.pz1, 's')              // standing in the doorway, looking out
    b.anchor('doorstep', 3, 1, Z1 + 3, 'n')         // outside, looking at the door
    b.anchor('gate', 3, 1, D - 1, 's')
    b.anchor('street', 5, 1, D + 4, 'n')            // past the gate, the whole house in front
    b.anchor('bed', 4, 1, r.z0, 's')                // the bed's head block (head here, feet south)
    b.anchor('table', 6, 1, 6, 's')
    b.anchor('seat_w', 5, 1, 6, 'e'); b.anchor('seat_e', 7, 1, 6, 'w')
    b.anchor('hearth', r.x1, 1, 4, 'e')
    b.anchor('window_in', 8, 1, r.z1, 's')          // inside, looking out of the front window
    b.anchor('window_out', 8, 1, Z1 + 3, 'n')       // outside, looking in
    b.anchor('inside', 4, 1, 7, 'n', { look: [9, 1, 3] })
    b.anchor('chimney', X1 + 1, 14, 4, 'up')
    b.anchor('garden', 0, 1, Z1 + 5, 'e')
    return b
  }
}
