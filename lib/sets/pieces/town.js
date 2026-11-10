// Town pieces: a market square, a church with a bell tower, a watchtower.
const { Voxels } = require('../voxel')
const { palette } = require('../palette')

const market = {
  name: 'market',
  about: 'market square: patterned paving, a fountain, four striped stalls with goods, benches, lamps, trees',
  variants: { goods: 'list of 4 stall kinds: produce, fish, smith, books, flowers' },
  build (v = {}) {
    const b = new Voxels('market').seed(v.seed || 21)
    const N = 27, c = 13
    b.fill(0, 1, 0, N - 1, 8, N - 1, 'air')
    // paving: a rough circle of mixed stone, a ring of darker stone round the fountain, grass at the corners
    for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
      const d = Math.hypot(x - c, z - c)
      if (d > 13.6) { b.set(x, 0, z, 'grass_block'); continue }
      if (d > 12.8 && b.rand() < 0.5) { b.set(x, 0, z, b.pick(['dirt_path', 'coarse_dirt'])); continue }
      if (d > 4.5 && d < 5.6) { b.set(x, 0, z, 'polished_andesite'); continue }
      b.set(x, 0, z, b.pick(['stone_bricks', 'cobblestone', 'andesite', 'stone_bricks', 'cracked_stone_bricks', 'mossy_stone_bricks', 'gravel']))
    }
    // the fountain: a basin of water, a pillar, a basin on top, lanterns
    b.fill(c - 3, 0, c - 3, c + 3, 1, c + 3, 'stone_bricks')
    b.fill(c - 2, 0, c - 2, c + 2, 0, c + 2, 'water'); b.fill(c - 2, 1, c - 2, c + 2, 1, c + 2, 'water')
    b.fill(c - 3, 1, c - 3, c + 3, 1, c + 3, 'stone_brick_slab[type=bottom]', 'walls')
    b.fill(c - 2, -1, c - 2, c + 2, -1, c + 2, 'stone_bricks')
    b.fill(c, 0, c, c, 4, c, 'chiseled_stone_bricks'); b.set(c, 1, c, 'stone_bricks'); b.set(c, 2, c, 'stone_brick_wall')
    b.fill(c - 1, 4, c - 1, c + 1, 4, c + 1, 'stone_brick_slab[type=top]'); b.set(c, 4, c, 'water')
    b.set(c, 5, c, 'lantern')
    // stalls at the four quarter points facing the fountain
    const goods = v.goods || ['produce', 'fish', 'smith', 'flowers']
    const awn = [['red_wool', 'white_wool'], ['blue_wool', 'white_wool'], ['green_wool', 'yellow_wool'], ['orange_wool', 'white_wool']]
    const stalls = [[c - 9, c - 9, 's'], [c + 5, c - 9, 's'], [c - 9, c + 6, 'n'], [c + 5, c + 6, 'n']]
    stalls.forEach(([x, z, face], i) => {
      const front = face === 's' ? z + 2 : z, back = face === 's' ? z : z + 2
      for (const px of [x, x + 4]) for (const pz of [z, z + 2]) b.fill(px, 1, pz, px, 3, pz, 'spruce_fence')
      for (let k = 0; k <= 4; k++) for (let j = 0; j <= 2; j++) b.set(x + k, 4, z + j, awn[i][k % 2])
      for (let k = 0; k <= 4; k++) b.set(x + k, 3, front + (face === 's' ? 1 : -1), `${awn[i][k % 2].replace('_wool', '_carpet')}`)
      // the counter along the front and the goods on it
      for (let k = 1; k <= 3; k++) b.set(x + k, 1, front, 'barrel[facing=up]')
      const g = goods[i % goods.length]
      const top = {
        produce: ['pumpkin', 'melon', 'hay_block[axis=x]'],
        fish: ['blue_carpet', 'water_cauldron[level=3]', 'light_blue_carpet'],
        smith: ['anvil[facing=east]', 'grindstone[face=floor,facing=north]', 'smithing_table'],
        books: ['bookshelf', 'lectern[facing=south]', 'bookshelf'],
        flowers: ['potted_red_tulip', 'potted_allium', 'potted_cornflower']
      }[g] || ['pumpkin', 'melon', 'hay_block[axis=x]']
      for (let k = 1; k <= 3; k++) b.set(x + k, 2, front, top[k - 1])
      b.set(x + 1, 1, back, 'barrel[facing=north]'); b.set(x + 3, 1, back, g === 'smith' ? 'blast_furnace[facing=south]' : 'chest[facing=south]')
      b.anchor(`stall_${i}`, x + 2, 1, back + (face === 's' ? 1 : -1), face)                 // the seller, behind the counter
      b.anchor(`buyer_${i}`, x + 2, 1, front + (face === 's' ? 2 : -2), face === 's' ? 'n' : 's')   // a customer in front
    })
    // benches round the fountain, lamp posts, trees in planters
    for (const [x, z, f] of [[c - 6, c, 'e'], [c + 6, c, 'w']]) for (const dz of [-1, 0, 1]) b.chair(x, 1, z + dz, f, 'spruce_stairs')
    for (const [x, z] of [[c - 6, c - 4], [c + 6, c - 4], [c - 6, c + 4], [c + 6, c + 4], [c, 1], [c, N - 2]]) b.post(x, 1, z, 3, 'dark_oak_fence')
    for (const [x, z] of [[2, c], [N - 3, c]]) {
      b.fill(x - 1, 1, z - 1, x + 1, 1, z + 1, 'spruce_trapdoor[facing=north,open=false,half=top]', 'outline')
      b.set(x, 0, z, 'grass_block'); b.fill(x, 1, z, x, 4, z, 'oak_log[axis=y]')
      b.fill(x - 2, 5, z - 2, x + 2, 6, z + 2, 'oak_leaves[persistent=true]'); b.fill(x - 1, 7, z - 1, x + 1, 7, z + 1, 'oak_leaves[persistent=true]')
      b.set(x, 5, z, 'oak_log[axis=y]')
    }
    b.set(c - 1, 1, c + 6, 'hay_block[axis=x]'); b.set(c + 9, 1, c + 1, 'barrel[facing=up]'); b.set(c + 9, 1, c + 2, 'barrel[facing=up]')
    b.anchor('center', c, 1, c + 4, 'n')
    b.anchor('fountain', c, 1, c, 's')
    b.anchor('bench_w', c - 6, 1, c, 'e'); b.anchor('bench_e', c + 6, 1, c, 'w')
    b.anchor('entrance', c, 1, N - 1, 'n')
    return b
  }
}

const church = {
  name: 'church',
  about: 'stone church: a nave with stained-glass windows and pews, an altar, a bell tower with a spire and a bell',
  variants: { glass: 'stained glass colour (default light_blue)' },
  build (v = {}) {
    const b = new Voxels('church').seed(v.seed || 17)
    const x0 = 1, x1 = 11, z0 = 1, z1 = 20, top = 6
    const stone = b.mix({ stone_bricks: 5, mossy_stone_bricks: 1, cracked_stone_bricks: 1 })
    b.fill(0, 0, 0, 12, 0, 27, 'grass_block')
    b.fill(0, 1, 0, 12, 30, 27, 'air')
    b.fill(x0, 0, z0, x1, 0, z1, 'polished_andesite')
    b.fill(x0, 1, z0, x1, top, z1, stone, 'walls')
    b.fill(x0 + 1, 1, z0 + 1, x1 - 1, top, z1 - 1, 'air')
    // buttresses and a plinth course
    for (let z = z0; z <= z1; z += 4) for (const x of [x0 - 1, x1 + 1]) { b.fill(x, 0, z, x, 3, z, 'stone_bricks'); b.set(x, 4, z, `stone_brick_stairs[facing=${x < 6 ? 'east' : 'west'}]`) }
    b.fill(x0, 1, z0, x1, 1, z1, 'cobblestone', { replace: ['stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks'] })
    // tall stained-glass windows between the buttresses, a round window over the altar
    const glass = `${v.glass || 'light_blue'}_stained_glass_pane`
    for (let z = z0 + 2; z < z1; z += 4) for (const x of [x0, x1]) b.fill(x, 2, z, x, 5, z, glass)
    b.fill(5, 3, z0, 7, 5, z0, glass); b.set(5, 5, z0, stone()); b.set(7, 5, z0, stone()); b.set(5, 3, z0, stone()); b.set(7, 3, z0, stone())
    b.roof(x0, z0, x1, z1, top + 1, { along: 'z', stair: 'deepslate_tile_stairs', gable: 'stone_bricks', over: 1 })
    b.fill(x0, top + 1, z0, x0, top + 1, z1, 'stone_bricks'); b.fill(x1, top + 1, z0, x1, top + 1, z1, 'stone_bricks')
    // inside: a red carpet aisle, pews either side, the altar on a step, candles, chandeliers
    b.fill(6, 0, z0 + 4, 6, 0, z1 - 1, 'polished_andesite'); b.fill(6, 1, z0 + 4, 6, 1, z1 - 1, 'red_carpet')
    for (let z = z0 + 6; z <= z1 - 3; z += 2) { b.fill(2, 1, z, 5, 1, z, 'dark_oak_stairs[facing=south]'); b.fill(7, 1, z, 10, 1, z, 'dark_oak_stairs[facing=south]') }
    b.fill(2, 1, z0 + 1, 10, 1, z0 + 3, 'polished_andesite_slab[type=bottom]')
    b.fill(5, 1, z0 + 2, 7, 1, z0 + 2, 'chiseled_stone_bricks'); b.fill(5, 2, z0 + 2, 7, 2, z0 + 2, 'white_carpet')
    b.set(5, 2, z0 + 2, 'candle[candles=3,lit=true]'); b.set(7, 2, z0 + 2, 'candle[candles=3,lit=true]')
    b.set(6, 1, z0 + 4, 'lectern[facing=south]')
    for (const z of [z0 + 6, z0 + 12, z0 + 17]) b.hang(6, top + 2, z, 1)
    b.set(2, 2, z0 + 1, 'candle[candles=4,lit=true]'); b.set(10, 2, z0 + 1, 'candle[candles=4,lit=true]')
    // the bell tower over the entrance: x 3..9, z 19..25, 22 high, open belfry, spire
    const t0 = 3, t1 = 9, s0 = 19, s1 = 25, tt = 17
    b.fill(t0, 0, s0, t1, tt, s1, stone, 'walls'); b.fill(t0 + 1, 1, s0 + 1, t1 - 1, tt, s1 - 1, 'air')
    b.fill(t0 + 1, 0, s0 + 1, t1 - 1, 0, s1 - 1, 'polished_andesite')
    for (const [x, z] of [[t0, s0], [t1, s0], [t0, s1], [t1, s1]]) b.fill(x, 0, z, x, tt + 1, z, 'chiseled_stone_bricks')
    b.fill(5, 1, s0, 7, 4, s0, 'air')   // open into the nave
    b.fill(5, 1, z1, 7, 4, z1, 'air')
    b.door(6, 1, s1, 's', 'dark_oak'); b.set(5, 1, s1, 'stone_bricks'); b.fill(5, 3, s1, 7, 3, s1, 'stone_brick_stairs[facing=south,half=top]', { replace: ['stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks'] })
    b.fill(5, 0, s1 + 1, 7, 0, s1 + 2, 'stone_bricks'); b.set(6, 0, s1 + 1, 'stone_brick_slab[type=top]')
    b.fill(5, 7, s1, 7, 9, s1, glass); b.fill(t0, 7, 22, t0, 9, 22, glass); b.fill(t1, 7, 22, t1, 9, 22, glass)
    // the belfry: open arches on all four sides, the bell hanging from a beam
    for (const [a, bb, c0, c1, side] of [[t0, t0, s0 + 2, s1 - 2, 'x'], [t1, t1, s0 + 2, s1 - 2, 'x'], [s0, s0, t0 + 2, t1 - 2, 'z'], [s1, s1, t0 + 2, t1 - 2, 'z']]) {
      if (side === 'x') b.fill(a, 13, c0, bb, 16, c1, 'air'); else b.fill(c0, 13, a, c1, 16, bb, 'air')
    }
    b.fill(t0 + 1, 12, s0 + 1, t1 - 1, 12, s1 - 1, 'spruce_planks')
    b.fill(t0 + 1, 17, 22, t1 - 1, 17, 22, 'dark_oak_log[axis=x]')
    b.set(6, 16, 22, 'bell[attachment=ceiling,facing=north]')
    b.fill(t0, tt + 1, s0, t1, tt + 1, s1, 'stone_brick_slab[type=bottom]', 'walls')
    // the spire: a steep pyramid of stairs and a cross on top
    for (let i = 0; i < 4; i++) b.fill(t0 + i, tt + 1 + 2 * i, s0 + i, t1 - i, tt + 2 + 2 * i, s1 - i, 'deepslate_tiles', 'walls')
    b.fill(6, tt + 9, 22, 6, tt + 11, 22, 'dark_oak_fence'); b.set(5, tt + 10, 22, 'dark_oak_fence'); b.set(7, tt + 10, 22, 'dark_oak_fence')
    b.post(3, 1, 27, 3, 'dark_oak_fence'); b.post(9, 1, 27, 3, 'dark_oak_fence')
    b.anchor('door', 6, 1, s1, 's'); b.anchor('doorstep', 6, 1, s1 + 3, 'n')
    b.anchor('altar', 6, 1, z0 + 3, 's'); b.anchor('pulpit', 6, 1, z0 + 5, 's')
    b.anchor('aisle', 6, 1, z1 - 2, 'n'); b.anchor('pew', 3, 1, 12, 'n')
    b.anchor('bell', 6, 16, 22, 'up'); b.anchor('belfry', 6, 13, 21, 's')
    return b
  }
}

const watchtower = {
  name: 'watchtower',
  about: 'timber watchtower on a stone base: ladder, a railed lookout, a bell, a pyramid roof, banners',
  variants: { height: 'lookout floor height (default 14)', palette: ['spruce (default)', 'oak', 'birch'] },
  build (v = {}) {
    const P = palette({ palette: 'spruce', ...v }), b = new Voxels('watchtower').seed(v.seed || 4)
    const H = v.height || 14
    b.fill(0, 1, 0, 8, H + 9, 8, 'air')
    for (let x = 0; x <= 8; x++) for (let z = 0; z <= 8; z++) if (Math.hypot(x - 4, z - 4) < 4.8) b.set(x, 0, z, b.pick(['coarse_dirt', 'gravel', 'dirt_path', 'grass_block']))
    // a stone base room (x 1..7, z 1..7, 4 high) with a door
    b.fill(1, 0, 1, 7, 4, 7, b.mix({ cobblestone: 3, mossy_cobblestone: 1, stone_bricks: 1 }), 'walls')
    b.fill(2, 1, 2, 6, 4, 6, 'air'); b.fill(2, 0, 2, 6, 0, 6, P.floor)
    b.door(4, 1, 7, 's', P.door); b.window(1, 2, 4, 'w', { w: 1, shutter: null, glass: 'iron_bars' }); b.window(7, 2, 4, 'e', { w: 1, shutter: null, glass: 'iron_bars' })
    // four log legs from the base to the lookout, cross braces of fences
    for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]]) b.fill(x, 0, z, x, H + 4, z, `${P.beam}[axis=y]`)
    for (let y = 8; y < H; y += 4) {
      b.fill(2, y, 1, 6, y, 1, `${P.frame}[axis=x]`); b.fill(2, y, 7, 6, y, 7, `${P.frame}[axis=x]`)
      b.fill(1, y, 2, 1, y, 6, `${P.frame}[axis=z]`); b.fill(7, y, 2, 7, y, 6, `${P.frame}[axis=z]`)
    }
    b.fill(1, 5, 1, 7, 5, 7, P.floor); b.fill(1, 5, 1, 7, 5, 7, `${P.beam}[axis=x]`, 'outline')
    // the ladder up a spine in the middle, through hatches
    b.fill(4, 1, 3, 4, H, 3, `${P.frame}[axis=y]`)
    b.fill(4, 1, 4, 4, H, 4, 'ladder[facing=south]')
    b.set(4, 5, 4, `${P.trap}[facing=south,open=true,half=bottom]`)
    // the lookout: a deck overhanging the legs, railing, lanterns, a bell, banners
    b.fill(0, H, 0, 8, H, 8, P.floor); b.fill(0, H, 0, 8, H, 8, `${P.frame}[axis=x]`, 'outline')
    b.set(4, H, 4, `${P.trap}[facing=south,open=true,half=bottom]`)
    b.fill(0, H + 1, 0, 8, H + 1, 8, P.fence, 'walls')
    b.set(4, H + 1, 8, 'air')
    b.hipRoof(1, 1, 7, 7, H + 5, { stair: P.roof, cap: `${P.slab}[type=bottom]`, over: 1 })
    b.fill(2, H + 4, 2, 6, H + 4, 6, P.floor)
    b.fill(1, H + 2, 1, 1, H + 3, 1, P.fence); b.fill(7, H + 2, 1, 7, H + 3, 1, P.fence); b.fill(1, H + 2, 7, 1, H + 3, 7, P.fence); b.fill(7, H + 2, 7, 7, H + 3, 7, P.fence)
    b.set(4, H + 3, 4, 'bell[attachment=ceiling,facing=south]')
    b.hang(2, H + 3, 2, 0); b.hang(6, H + 3, 6, 0)
    b.set(4, H - 1, 0, 'red_wall_banner[facing=north]'); b.set(4, H - 1, 8, 'red_wall_banner[facing=south]')
    b.set(0, H - 1, 4, 'red_wall_banner[facing=west]'); b.set(8, H - 1, 4, 'red_wall_banner[facing=east]')
    b.set(2, 1, 6, 'barrel[facing=up]'); b.set(6, 1, 6, 'chest[facing=west]'); b.set(2, 1, 2, 'hay_block[axis=y]')
    b.post(2, 1, 9, 2); b.post(6, 1, 9, 2)
    b.anchor('door', 4, 1, 7, 's'); b.anchor('doorstep', 4, 1, 10, 'n')
    b.anchor('ladder', 4, 1, 5, 'n'); b.anchor('top', 4, H + 1, 7, 's'); b.anchor('lookout', 4, H + 1, 6, 's')
    b.anchor('bell', 4, H + 3, 4, 'up'); b.anchor('base', 9, 1, 12, 'n')
    return b
  }
}

module.exports = { market, church, watchtower }
