// A farmstead: a long farmhouse with a porch, a barn with open doors and a hayloft, fenced fields of wheat, carrots,
// potatoes and beetroot on irrigation channels, a scarecrow, haystacks, a composter, a cart of pumpkins.
const { Voxels } = require('../voxel')
const { palette } = require('../palette')

module.exports = {
  name: 'farmhouse',
  about: 'farmhouse, barn and fenced crop fields with water channels and a scarecrow',
  variants: { palette: ['spruce (default)', 'oak', 'birch'], crops: 'list of 4: wheat, carrots, potatoes, beetroots' },
  build (v = {}) {
    const P = palette({ palette: 'spruce', ...v }), b = new Voxels('farmhouse').seed(v.seed || 5)
    const W = 35, D = 30
    b.fill(0, 0, 0, W - 1, 0, D - 1, 'grass_block')
    b.fill(0, 1, 0, W - 1, 12, D - 1, 'air')

    // --- the farmhouse (x 1..11, z 1..7), porch on the front, ridge along x
    const h = { x0: 1, x1: 11, z0: 1, z1: 7, top: 4 }
    const r = b.framed(h.x0, h.z0, h.x1, h.z1, h.top, { post: P.frame, beam: P.beam, every: 5, panel: b.mix({ [P.wall]: 5, stripped_spruce_wood: 1 }), lower: b.mix({ cobblestone: 2, mossy_cobblestone: 1 }) })
    b.fill(r.x0, 0, r.z0, r.x1, 0, r.z1, P.floor)
    b.roof(h.x0, h.z0, h.x1, h.z1, h.top + 2, { along: 'x', stair: P.roof, gable: P.gable, over: 1 })
    b.verge(h.x0, h.z0, h.x1, h.z1, h.top + 2, { along: 'x', over: 1, trim: 'spruce' })
    for (const x of [h.x0, 6, h.x1]) { b.set(x, h.top + 1, h.z1 + 1, 'spruce_stairs[facing=north,half=top]'); b.set(x, h.top + 1, h.z0 - 1, 'spruce_stairs[facing=south,half=top]') }
    b.door(4, 1, r.pz1, 's', P.door); b.set(4, 1, h.z1, 'air')
    b.sill(3, 2, r.pz1, 's', { w: 1, glass: P.glass, head: P.trap })
    b.sill(8, 2, r.pz1, 's', { w: 2, glass: P.glass, head: P.trap })
    b.sill(r.px0, 2, 3, 'w', { w: 2, glass: P.glass, head: P.trap })
    b.sill(r.px1, 2, 3, 'e', { w: 2, glass: P.glass, head: P.trap })
    // the porch: a plank deck, posts, a lean-to roof of slabs, a bench and a lantern
    b.fill(h.x0, 0, h.z1 + 1, h.x1, 0, h.z1 + 3, `${P.floor}`)
    for (const x of [h.x0, 6, h.x1]) b.fill(x, 1, h.z1 + 3, x, 3, h.z1 + 3, P.fence)
    b.fill(h.x0, 4, h.z1 + 2, h.x1, 4, h.z1 + 3, `${P.slab}[type=top]`)
    b.chair(7, 1, h.z1 + 1, 's', P.stair); b.chair(8, 1, h.z1 + 1, 's', P.stair)
    b.set(10, 1, h.z1 + 1, 'barrel[facing=up]'); b.set(10, 2, h.z1 + 1, 'potted_dandelion')
    b.hang(4, 3, h.z1 + 2, 0)
    // inside: bed, table, stove, shelves
    b.bed(3, 1, 3, 'e', 'yellow'); b.table(6, 1, 4); b.chair(5, 1, 4, 'e', P.stair); b.chair(7, 1, 4, 'w', P.stair)
    b.set(9, 1, 3, 'furnace[facing=west]'); b.set(9, 1, 4, 'smoker[facing=west]'); b.set(9, 1, 5, 'crafting_table')
    b.fill(7, 1, 3, 8, 2, 3, 'bookshelf')
    b.hang(6, h.top, 4, 0)
    b.fill(6, h.top + 1, r.pz0, 6, h.top + 1, r.pz1, `${P.beam}[axis=z]`)

    // --- the barn (x 22..32, z 1..11), gable to the front, big open doors, a hayloft window
    const n = { x0: 22, x1: 32, z0: 1, z1: 11, top: 6 }
    b.fill(n.x0, 0, n.z0, n.x1, 0, n.z1, 'coarse_dirt')
    b.fill(n.x0, 1, n.z0, n.x1, n.top, n.z1, 'spruce_planks', 'walls')
    b.fill(n.x0 + 1, 1, n.z0 + 1, n.x1 - 1, n.top, n.z1 - 1, 'air')
    for (const x of [n.x0, n.x1]) for (const z of [n.z0, 6, n.z1]) b.fill(x, 0, z, x, n.top, z, 'stripped_spruce_log[axis=y]')
    for (const z of [n.z0, n.z1]) for (const x of [26, 28]) b.fill(x, 0, z, x, n.top, z, 'stripped_spruce_log[axis=y]')
    b.fill(n.x0, n.top + 1, n.z0, n.x0, n.top + 1, n.z1, 'stripped_spruce_log[axis=z]')
    b.fill(n.x1, n.top + 1, n.z0, n.x1, n.top + 1, n.z1, 'stripped_spruce_log[axis=z]')
    b.roof(n.x0, n.z0, n.x1, n.z1, n.top + 1, { along: 'z', stair: 'dark_oak_stairs', gable: 'spruce_planks', over: 1 })
    b.verge(n.x0, n.z0, n.x1, n.z1, n.top + 1, { along: 'z', over: 1, trim: 'stripped_spruce'.replace('stripped_', '') })
    b.fill(n.x0 + 1, 1, n.z0, n.x1 - 1, 2, n.z0, b.mix({ cobblestone: 2, mossy_cobblestone: 1 }), { replace: 'spruce_planks' })
    b.fill(n.x0, 1, n.z0 + 1, n.x0, 2, n.z1 - 1, b.mix({ cobblestone: 2, mossy_cobblestone: 1 }), { replace: 'spruce_planks' })
    b.fill(n.x1, 1, n.z0 + 1, n.x1, 2, n.z1 - 1, b.mix({ cobblestone: 2, mossy_cobblestone: 1 }), { replace: 'spruce_planks' })
    // open doors (a 3-wide opening) with the door leaves swung back as trapdoors on the wall
    b.fill(26, 1, n.z1, 28, 4, n.z1, 'air')
    b.fill(26, 1, n.z1, 28, 1, n.z1, 'air')
    b.fill(25, 1, n.z1 + 1, 25, 4, n.z1 + 1, 'spruce_trapdoor[facing=west,open=true]')
    b.fill(29, 1, n.z1 + 1, 29, 4, n.z1 + 1, 'spruce_trapdoor[facing=east,open=true]')
    b.fill(26, 5, n.z1, 28, 5, n.z1, 'stripped_spruce_log[axis=x]')
    b.fill(27, 9, n.z1, 27, 10, n.z1, 'air')   // the hayloft window
    b.set(27, 9, n.z1 + 1, 'hay_block[axis=x]')
    // inside: a hayloft, hay, a stall with a cow's trough, tools
    b.fill(n.x0 + 1, 5, n.z0 + 1, n.x1 - 1, 5, 6, 'spruce_planks')
    b.fill(n.x0 + 1, 6, n.z0 + 1, n.x1 - 1, 7, 4, 'hay_block[axis=y]', 'keep')
    b.fill(n.x0 + 1, 1, n.z0 + 1, 24, 2, 3, 'hay_block[axis=x]')
    b.fill(30, 1, n.z0 + 1, 31, 1, 9, 'spruce_fence')
    b.fill(31, 1, n.z0 + 1, 31, 1, 9, 'air')
    b.set(31, 1, 3, 'composter[level=0]'); b.set(31, 1, 6, 'water_cauldron[level=3]')
    b.hang(27, 4, 6, 0)

    // --- fields (x 1..20, z 13..28): four plots on channels, a fence round them, a gate on the path
    const crops = v.crops || ['wheat', 'carrots', 'potatoes', 'beetroots']
    const age = { wheat: 7, carrots: 7, potatoes: 7, beetroots: 3 }
    const fz0 = 13, fz1 = 28, fx0 = 1, fx1 = 20
    b.fill(fx0, 1, fz0, fx1, 1, fz1, P.fence, 'walls')
    b.set(10, 1, fz0, `${P.gate}[facing=south,open=true]`)
    const plots = [[2, 9, 14, 20], [11, 19, 14, 20], [2, 9, 22, 27], [11, 19, 22, 27]]
    plots.forEach(([a0, a1, c0, c1], i) => {
      const crop = crops[i % crops.length]
      b.fill(a0, 0, c0, a1, 0, c1, 'farmland[moisture=7]')
      b.fill(a0, 1, c0, a1, 1, c1, `${crop}[age=${age[crop] ?? 7}]`)
      // a channel down the middle of each plot
      const mx = Math.floor((a0 + a1) / 2)
      b.fill(mx, 0, c0, mx, 0, c1, 'water'); b.fill(mx, 1, c0, mx, 1, c1, 'air')
      b.fill(mx, -1, c0, mx, -1, c1, 'dirt')
    })
    // paths between the plots
    b.fill(10, 0, fz0 + 1, 10, 0, fz1 - 1, 'dirt_path'); b.fill(fx0 + 1, 0, 21, fx1 - 1, 0, 21, 'dirt_path')
    // the scarecrow in the wheat
    b.set(5, 1, 17, 'oak_fence'); b.set(5, 2, 17, 'hay_block[axis=y]'); b.set(5, 3, 17, 'carved_pumpkin[facing=south]')
    b.set(4, 2, 17, 'oak_fence'); b.set(6, 2, 17, 'oak_fence')
    b.set(4, 1, 17, 'wheat[age=7]'); b.set(6, 1, 17, 'wheat[age=7]')

    // --- the yard: a path from the porch to the barn and the field gate, haystacks, a cart, a well trough
    for (let x = 4; x <= 27; x++) b.set(x, 0, 11, b.pick(['dirt_path', 'dirt_path', 'coarse_dirt', 'dirt_path']))
    for (let z = h.z1 + 4; z <= 12; z++) b.set(4, 0, z, 'dirt_path')
    for (let z = 12; z <= fz0; z++) b.set(10, 0, z, 'dirt_path')
    for (let z = 12; z <= n.z1; z++) b.set(27, 0, z, 'dirt_path')
    b.fill(14, 1, 2, 15, 1, 3, 'hay_block[axis=y]'); b.set(14, 2, 2, 'hay_block[axis=y]'); b.set(16, 1, 2, 'hay_block[axis=x]')
    b.set(18, 1, 7, 'barrel[facing=up]'); b.set(19, 1, 7, 'barrel[facing=up]'); b.set(18, 2, 7, 'pumpkin'); b.set(19, 1, 8, 'pumpkin')
    b.fill(17, 1, 8, 17, 1, 8, 'oak_trapdoor[facing=west,open=true]')
    b.post(21, 1, 12, 3); b.post(13, 1, 12, 3)
    b.set(15, 1, 5, 'composter[level=7]')
    b.fill(24, 1, 13, 32, 1, 26, 'spruce_fence', 'walls')   // a paddock (cast its animals)
    b.set(27, 1, 13, 'spruce_fence_gate[facing=south,open=false]')
    b.set(30, 1, 24, 'water_cauldron[level=3]'); b.fill(25, 1, 25, 26, 1, 25, 'hay_block[axis=x]')

    b.anchor('door', 4, 1, h.z1, 's')
    b.anchor('porch', 7, 1, h.z1 + 2, 's')
    b.anchor('doorstep', 4, 1, h.z1 + 5, 'n')
    b.anchor('field_gate', 10, 1, fz0, 's')
    b.anchor('field', 10, 1, 21, 'w')
    b.anchor('scarecrow', 5, 1, 17, 's')
    b.anchor('scarecrow_view', 5, 1, 21, 'n')
    b.anchor('barn_door', 27, 1, n.z1, 'n')
    b.anchor('barn_inside', 27, 1, 8, 'n')
    b.anchor('hayloft', 27, 6, 9, 's')
    b.anchor('paddock', 28, 1, 20, 'n')
    b.anchor('yard', 16, 1, 9, 'e')
    return b
  }
}
