// A country rail station at the end of a line (first used by stories/broken_rail): the line's last stretch running
// south from a buffer stop, a slab platform on its west side with a north apron, lamp posts, a bench, a destination
// sign, crates; two short sidings on the east side branching off the line, each ending in its own buffer stop with a
// name sign over it. The last rail before the main buffer is an activator rail kept powered by a redstone torch.
// Facing 'south' = the line leaves to the south (local +z). Anchors (block coords, y = rail level):
//   buffer, mark (on the apron just north of the buffer: where someone waits), activator, line_end (the last rail of
//   the piece: the line goes on from the block south of it), siding_a / siding_b (their buffers), bench, sign
const { Voxels } = require('../voxel')

const station = {
  name: 'station',
  about: 'rail station at the end of a line: buffer stop with a lantern, powered activator rail, slab platform with lamps, bench, sign and crates, two sidings with their own buffers and name signs',
  variants: { length: 'line length inside the piece, from the buffer (default 21)', sign: 'destination sign lines, "|"-separated (default "ELMWATER|4500 ->")', a: 'siding A name (west spur)', b: 'siding B name (east spur)', cart: 'a minecart on siding A (default true)', canopy: 'the pitched canopy over the platform (default true)' },
  build (v = {}) {
    const b = new Voxels('station').seed(v.seed || 61)
    const L = v.length || 21
    const BX = 8, BZ = 3, Z1 = BZ + L                      // the main line runs x = 8 from the buffer south to Z1
    const ballast = b.mix({ gravel: 6, coarse_dirt: 2, andesite: 1 })
    // the bed: ballast under every track, grass shoulders
    b.fill(4, -1, 0, 14, -1, Z1, 'dirt')
    b.fill(4, 0, 0, 14, 0, Z1, 'grass_block')
    b.fill(1, 1, 0, 15, 4, Z1, 'air')
    b.fill(BX - 1, 0, BZ, BX + 1, 0, Z1, ballast)
    // the main line: activator rail first (powered by a redstone torch beside it), then plain rail
    b.set(BX, 1, BZ + 1, 'activator_rail[shape=north_south,powered=true]')
    b.set(BX + 1, 1, BZ + 1, 'redstone_torch[lit=true]')
    b.fill(BX, 1, BZ + 2, BX, 1, Z1, 'rail[shape=north_south]')
    // the buffer stop: a wall block with a lantern on it, ballast around
    b.set(BX, 0, BZ, 'stone_bricks'); b.set(BX, 1, BZ, 'stone_brick_wall'); b.set(BX, 2, BZ, 'lantern')
    // the platform: west of the line, smooth stone slabs on a stone-brick edge, with a north apron round the buffer
    b.fill(5, 0, 1, 7, 0, 17, 'stone_bricks')
    b.fill(5, 1, 1, 7, 1, 17, 'smooth_stone_slab[type=bottom]')
    b.fill(5, 0, 1, BX, 0, 2, 'stone_bricks'); b.fill(5, 1, 1, BX, 1, 2, 'smooth_stone_slab[type=bottom]')
    b.fill(4, 0, 1, 4, 0, 17, 'stone_bricks'); b.fill(4, 1, 1, 4, 1, 17, 'stone_brick_wall')   // the back wall
    b.set(4, 1, 6, 'smooth_stone_slab[type=bottom]'); b.set(4, 0, 6, 'stone_bricks')            // a gap in it: the way on
    // the canopy over the platform's middle (v.canopy !== false): spruce log posts, a pitched spruce roof with a
    // ridge, a lantern hanging under it
    if (v.canopy !== false) {
      for (const [x, z] of [[5, 7], [7, 7], [5, 12], [7, 12]]) b.fill(x, 1, z, x, 3, z, 'spruce_log[axis=y]')
      b.fill(4, 4, 6, 4, 4, 13, 'spruce_stairs[facing=east]'); b.fill(7, 4, 6, 7, 4, 13, 'spruce_stairs[facing=west]')
      b.fill(5, 4, 6, 6, 4, 13, 'spruce_planks'); b.fill(5, 5, 6, 6, 5, 13, 'spruce_slab[type=bottom]')
      for (const z of [6, 13]) { b.set(4, 4, z, 'spruce_stairs[facing=east]'); b.set(7, 4, z, 'spruce_stairs[facing=west]') }
      b.hang(6, 3, 9, 0)
    }
    // lamps, the bench, the sign, crates
    b.post(5, 1, 5, 3, 'spruce_fence'); b.post(5, 1, 13, 3, 'spruce_fence')
    b.chair(6, 1, 1, 'e', 'spruce_stairs'); b.chair(5, 1, 1, 'e', 'spruce_stairs')
    const sign = String(v.sign ?? 'ELMWATER|4500 ->').split('|')   // '' = no destination sign
    if (sign.some(Boolean)) { b.fill(5, 1, 9, 5, 2, 9, 'spruce_fence'); b.sign(5, 3, 9, sign, { rotation: 8, wood: 'spruce' }) }
    for (const [x, z, blk] of [[5, 15, 'barrel[facing=up]'], [5, 16, 'barrel[facing=up]'], [6, 16, 'spruce_planks'], [5, 17, 'composter']]) b.set(x, 1, z, blk)
    // the sidings: A branches off at z 16 (x 9..10, north up x 10), B at z 19 (x 9..12, north up x 12)
    const spur = (row, x, name) => {
      b.fill(BX + 1, 0, row, x, 0, row, ballast); b.fill(x - 1, 0, 6, x + 1, 0, row, ballast)
      b.fill(BX + 1, 1, row, x - 1, 1, row, 'rail[shape=east_west]')
      b.set(x, 1, row, 'rail[shape=north_west]')
      b.fill(x, 1, 8, x, 1, row - 1, 'rail[shape=north_south]')
      b.set(x, 1, 7, 'stone_brick_wall'); b.set(x, 0, 7, 'stone_bricks')
      if (name) { b.set(x, 2, 7, 'spruce_fence'); b.sign(x, 3, 7, ['', name, '', ''], { rotation: 0 }) }   // '' = no name sign
    }
    spur(16, 10, v.a ?? 'OTTO'); spur(19, 12, v.b ?? 'JUNE')
    if (v.cart !== false) b.extra(10, 1, 10, (p) => `/summon minecart ${p.x} ${p.y} ${p.z} {Tags:["station_cart"]}`)
    // flowers and grass on the shoulders east of the sidings and along the line's far side
    for (let z = 2; z <= Z1; z++) for (const x of [13, 14]) {
      if (b.has(x, 0, z) && !/grass/.test(b.get(x, 0, z).name)) continue
      const r = b.rand()
      if (r < 0.18) b.set(x, 1, z, b.pick(['poppy', 'dandelion', 'oxeye_daisy', 'cornflower']))
      else if (r < 0.5) b.set(x, 1, z, 'short_grass')
    }
    b.anchor('buffer', BX, 1, BZ, 'n'); b.anchor('mark', BX, 1, BZ - 1, 's'); b.anchor('activator', BX, 1, BZ + 1, 's')
    b.anchor('line_end', BX, 1, Z1, 's'); b.anchor('siding_a', 10, 1, 7, 's'); b.anchor('siding_b', 12, 1, 7, 's')
    b.anchor('bench', 6, 1, 1, 'e'); b.anchor('sign', 5, 3, 9, 'n')
    return b
  }
}

module.exports = { station }
