// Small pieces: a well, a campfire camp, a graveyard.
const { Voxels } = require('../voxel')
const { palette } = require('../palette')

const well = {
  name: 'well',
  about: 'stone well with a roof, a hanging bucket lantern, paving and a trough',
  variants: { palette: ['oak', 'spruce', 'birch'] },
  build (v = {}) {
    const P = palette(v), b = new Voxels('well').seed(v.seed || 3)
    b.fill(0, 1, 0, 8, 7, 8, 'air')
    // paving round it, irregular at the edge
    for (let x = 0; x <= 8; x++) for (let z = 0; z <= 8; z++) {
      const d = Math.hypot(x - 4, z - 4)
      if (d > 4.6 && b.rand() < 0.6) continue
      b.set(x, 0, z, b.pick(['cobblestone', 'gravel', 'andesite', 'dirt_path', 'cobblestone', 'mossy_cobblestone']))
    }
    // the shaft: water three deep inside a stone-brick ring
    b.fill(2, -4, 2, 6, 1, 6, b.mix({ stone_bricks: 3, mossy_stone_bricks: 1, cracked_stone_bricks: 1 }))
    b.fill(3, -3, 3, 5, 0, 5, 'water'); b.fill(3, 1, 3, 5, 1, 5, 'air')
    b.fill(2, 1, 2, 6, 1, 6, 'stone_brick_wall', 'walls')
    b.set(4, 1, 6, 'stone_brick_slab[type=bottom]')   // a low lip at the front to lean over
    // posts, a roof, a crank beam and the bucket (a lantern on a chain)
    for (const [x, z] of [[2, 2], [6, 2], [2, 6], [6, 6]]) b.fill(x, 2, z, x, 3, z, P.fence)
    b.fill(2, 4, 2, 6, 4, 6, `${P.beam}[axis=x]`, 'outline')
    b.fill(3, 4, 3, 5, 4, 5, 'air')
    b.fill(2, 4, 4, 6, 4, 4, `${P.beam}[axis=x]`)
    b.roof(2, 2, 6, 6, 5, { along: 'x', stair: P.roof, gable: P.wall, over: 1 })
    b.hang(4, 2, 4, 1)
    // a trough and a bucket stand
    b.set(7, 1, 4, 'water_cauldron[level=3]'); b.set(7, 1, 5, 'barrel[facing=up]')
    b.set(1, 1, 3, 'oak_trapdoor[facing=east,open=false,half=bottom]')
    b.anchor('rim', 4, 1, 7, 'n')        // standing at the lip, looking in
    b.anchor('water', 4, 0, 4, 'up')
    b.anchor('center', 4, 1, 4, 's')
    b.anchor('side', 8, 1, 2, 'w')
    return b
  }
}

const camp = {
  name: 'camp',
  about: 'campfire camp: a stone fire ring, log seats, two canvas tents, supplies, lanterns, a flag',
  variants: { tents: '1-2 (default 2)' },
  build (v = {}) {
    const b = new Voxels('camp').seed(v.seed || 9)
    b.fill(-1, 1, -1, 17, 6, 17, 'air')
    // trampled ground round the fire
    for (let x = 3; x <= 13; x++) for (let z = 3; z <= 13; z++) {
      const d = Math.hypot(x - 8, z - 8)
      if (d < 4.5 + b.rand()) b.set(x, 0, z, b.pick(['coarse_dirt', 'dirt_path', 'grass_block', 'coarse_dirt', 'podzol']))
    }
    b.set(8, 0, 8, 'cobblestone'); b.set(8, 1, 8, 'campfire[lit=true,facing=south]')
    for (const [x, z] of [[7, 7], [9, 7], [7, 9], [9, 9]]) b.set(x, 1, z, 'cobblestone_slab[type=bottom]')
    for (const [x, z] of [[8, 7], [8, 9], [7, 8], [9, 8]]) b.set(x, 0, z, 'cobblestone')
    // log seats round it
    b.fill(6, 1, 5, 10, 1, 5, 'stripped_spruce_log[axis=x]')
    b.fill(6, 1, 11, 9, 1, 11, 'stripped_oak_log[axis=x]')
    b.fill(5, 1, 7, 5, 1, 9, 'stripped_spruce_log[axis=z]')
    b.set(11, 1, 9, 'spruce_stairs[facing=east]'); b.set(11, 1, 7, 'barrel[facing=up]')
    // tents: an A frame of wool, open at the front, with a bedroll
    const tent = (x, z, wool, face) => {
      // a ridge tent along z from z to z+4: canvas sloping in from x +-2 at y1 to the ridge pole at y3, open at the front
      for (let zz = z; zz <= z + 4; zz++) {
        b.set(x - 2, 1, zz, wool); b.set(x + 2, 1, zz, wool); b.set(x - 1, 2, zz, wool); b.set(x + 1, 2, zz, wool)
        b.set(x, 3, zz, 'stripped_spruce_log[axis=z]')
        b.fill(x - 1, 1, zz, x + 1, 1, zz, 'air'); b.set(x, 2, zz, 'air')
      }
      b.fill(x - 1, 1, z, x + 1, 1, z, wool); b.set(x, 2, z, wool)                 // the closed back
      b.set(x, 3, z - 1, 'spruce_fence'); b.fill(x, 0, z + 5, x, 3, z + 5, 'spruce_fence'); b.set(x, 3, z + 5, 'stripped_spruce_log[axis=z]')
      b.set(x - 1, 1, z + 1, 'white_carpet'); b.set(x, 1, z + 1, 'brown_carpet'); b.set(x - 1, 1, z + 2, 'white_carpet')
      b.set(x + 1, 1, z + 1, 'barrel[facing=up]'); b.set(x, 1, z + 2, 'lantern')
      b.set(x - 3, 1, z + 5, 'spruce_fence'); b.set(x + 3, 1, z + 5, 'spruce_fence')   // guy-rope stakes
      return face
    }
    tent(2, 0, 'white_wool', 's')
    if ((v.tents ?? 2) > 1) tent(14, 0, 'brown_wool', 's')
    // supplies: crates, a chest, a crafting table, firewood, a hanging pot
    b.set(6, 1, 2, 'chest[facing=south]'); b.set(7, 1, 2, 'barrel[facing=up]'); b.set(7, 2, 2, 'lantern')
    b.set(10, 1, 2, 'crafting_table'); b.set(9, 1, 2, 'barrel[facing=north]')
    b.fill(14, 1, 10, 15, 1, 12, 'oak_log[axis=z]'); b.set(14, 2, 11, 'oak_log[axis=z]'); b.set(13, 1, 12, 'oak_log[axis=y]')
    b.set(15, 1, 8, 'hay_block[axis=y]')
    // lanterns on poles and a flag
    b.post(4, 1, 12, 3); b.post(11, 1, 4, 3)
    b.fill(12, 1, 13, 12, 5, 13, 'spruce_fence'); b.set(12, 6, 13, 'red_banner[rotation=0]')
    b.anchor('fire', 8, 1, 8, 's')
    b.anchor('seat_n', 8, 1, 6, 's'); b.anchor('seat_s', 8, 1, 10, 'n'); b.anchor('seat_w', 6, 1, 8, 'e'); b.anchor('seat_e', 10, 1, 8, 'w')
    b.anchor('tent_a', 2, 1, 3, 's'); b.anchor('tent_b', 14, 1, 3, 's')
    b.anchor('edge', 8, 1, 15, 'n')
    return b
  }
}

const graveyard = {
  name: 'graveyard',
  about: 'walled graveyard: rows of headstones (some with names), a crypt, a dead tree, lanterns at the gate',
  variants: { names: 'list of names for the signed headstones' },
  build (v = {}) {
    const b = new Voxels('graveyard').seed(v.seed || 13)
    const W = 19, D = 17
    b.fill(0, 1, 0, W - 1, 7, D - 1, 'air')
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) b.set(x, 0, z, b.pick(['grass_block', 'grass_block', 'grass_block', 'podzol', 'coarse_dirt']))
    // the wall: mossy cobble walls with posts, a gate in the front
    const wallB = b.mix({ mossy_cobblestone_wall: 2, cobblestone_wall: 1 })
    b.fill(0, 1, 0, W - 1, 1, D - 1, wallB, 'walls')
    for (let x = 0; x < W; x += 3) for (const z of [0, D - 1]) b.set(x, 2, z, 'mossy_cobblestone_wall')
    for (let z = 0; z < D; z += 3) for (const x of [0, W - 1]) b.set(x, 2, z, 'mossy_cobblestone_wall')
    const gx = 9
    b.fill(gx - 1, 1, D - 1, gx + 1, 2, D - 1, 'air')
    b.set(gx, 1, D - 1, 'dark_oak_fence_gate[facing=south,open=true]')
    b.fill(gx - 2, 1, D - 1, gx - 2, 3, D - 1, 'stone_bricks'); b.fill(gx + 2, 1, D - 1, gx + 2, 3, D - 1, 'stone_bricks')
    b.set(gx - 2, 4, D - 1, 'soul_lantern'); b.set(gx + 2, 4, D - 1, 'soul_lantern')
    // the path up the middle to the crypt
    for (let z = 4; z < D; z++) b.set(gx, 0, z, b.pick(['gravel', 'dirt_path', 'gravel', 'cobblestone']))
    // headstones in rows either side: a stone stone, a mound in front, sometimes a name, a candle, a flower
    const names = v.names || ['HERE LIES|STEVE', 'R.I.P.|ALEX', 'HERE LIES|NOTCH?', 'BELOVED|VILLAGER', 'HE PLACED|THE TNT', 'NEVER DUG|STRAIGHT DOWN']
    let ni = 0, gi = 0
    const graves = []
    for (const row of [5, 9, 13]) {
      for (const x of [2, 4, 6, 12, 14, 16]) {
        if (b.rand() < 0.12) continue
        const stone = b.pick(['stone_brick_wall', 'andesite_wall', 'cobblestone_wall', 'mossy_stone_brick_wall', 'stone_bricks', 'chiseled_stone_bricks'])
        b.set(x, 1, row, stone)
        if (/wall$/.test(stone) && b.rand() < 0.4) b.set(x, 2, row, 'stone_brick_slab[type=bottom]')
        b.set(x, 0, row + 1, 'coarse_dirt'); b.set(x, 0, row + 2, b.pick(['coarse_dirt', 'podzol', 'rooted_dirt']))
        if (!/wall$/.test(stone) && ni < names.length) { const [l1, l2] = names[ni++].split('|'); b.sign(x, 1, row + 1, ['', l1, l2, ''], { wood: 'spruce', wall: 's' }) }
        else if (b.rand() < 0.4) b.set(x, 1, row + 1, b.pick(['candle[candles=2,lit=true]', 'poppy', 'dead_bush', 'white_tulip', 'candle[candles=1,lit=true]']))
        graves.push([x, row]); b.anchor(`grave_${gi++}`, x, 1, row + 3, 'n')
      }
    }
    // a dead tree in the corner, ferns and dead bushes, cobwebs on the wall
    b.fill(16, 1, 2, 16, 6, 2, 'stripped_dark_oak_log[axis=y]')
    b.fill(15, 5, 2, 14, 5, 2, 'stripped_dark_oak_log[axis=x]'); b.set(17, 6, 2, 'stripped_dark_oak_log[axis=x]'); b.fill(16, 6, 3, 16, 7, 3, 'stripped_dark_oak_log[axis=z]')
    for (let i = 0; i < 18; i++) { const x = 1 + Math.floor(b.rand() * (W - 2)), z = 1 + Math.floor(b.rand() * (D - 2)); if (!b.has(x, 1, z) && x !== gx) b.set(x, 1, z, b.pick(['fern', 'dead_bush', 'short_grass', 'fern'])) }
    b.set(1, 2, 1, 'cobweb'); b.set(W - 2, 1, D - 2, 'cobweb')
    // the crypt at the back: stone bricks, a deepslate roof, a dark door, columns
    b.fill(6, 0, 0, 12, 0, 3, 'stone_bricks')
    b.fill(7, 1, 0, 11, 4, 3, b.mix({ stone_bricks: 3, mossy_stone_bricks: 2, cracked_stone_bricks: 1 }))
    b.fill(8, 1, 0, 10, 3, 2, 'air')
    b.roof(7, 0, 11, 3, 5, { along: 'z', stair: 'deepslate_tile_stairs', gable: 'stone_bricks', over: 1 })
    b.door(9, 1, 3, 's', 'dark_oak'); b.set(8, 1, 4, 'stone_brick_wall'); b.set(10, 1, 4, 'stone_brick_wall')
    b.set(8, 2, 4, 'soul_lantern'); b.set(10, 2, 4, 'soul_lantern')
    b.sign(9, 4, 4, ['', 'FAMILY', 'CRYPT', ''], { wood: 'dark_oak', wall: 's', color: 'white', glow: true })
    b.anchor('gate', gx, 1, D - 1, 's'); b.anchor('outside', gx, 1, D + 3, 'n')
    b.anchor('center', gx, 1, 9, 'n'); b.anchor('crypt', 9, 1, 5, 'n'); b.anchor('tree', 15, 1, 4, 'n')
    return b
  }
}

module.exports = { well, camp, graveyard }
