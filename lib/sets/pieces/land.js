// Landmark pieces: a lighthouse, a bridge, a mine entrance.
const { Voxels } = require('../voxel')

const lighthouse = {
  name: 'lighthouse',
  about: 'striped round lighthouse on a rocky base: a door, a ladder up the middle, a railed gallery, a lit lantern room',
  variants: { height: 'tower height (default 22)', stripe: 'stripe block (default red_concrete)' },
  build (v = {}) {
    const b = new Voxels('lighthouse').seed(v.seed || 31)
    const H = v.height || 22, c = 7, R = 4
    const stripe = v.stripe || 'red_concrete', white = v.white || 'white_concrete'
    const inR = (x, z, r) => Math.hypot(x - c, z - c) <= r + 0.35
    b.fill(0, 1, 0, 14, H + 10, 14, 'air')
    // a rocky base, boulders round it
    for (let x = 0; x <= 14; x++) for (let z = 0; z <= 14; z++) {
      const d = Math.hypot(x - c, z - c)
      if (d > 7.2) continue
      const hgt = Math.max(0, Math.round((7 - d) * 0.6 + (b.rand() - 0.5)))
      for (let y = -2; y <= hgt; y++) b.set(x, y, z, b.pick(['stone', 'andesite', 'cobblestone', 'mossy_cobblestone', 'stone', 'gravel']))
      if (d > 5.5 && b.rand() < 0.3) b.set(x, hgt + 1, z, b.pick(['cobblestone_wall', 'mossy_cobblestone', 'andesite']))
    }
    // the tower: a ring, striped every 4, hollow
    for (let y = 1; y <= H; y++) {
      const blk = Math.floor((y - 1) / 4) % 2 ? stripe : white
      for (let x = c - R; x <= c + R; x++) for (let z = c - R; z <= c + R; z++) {
        if (!inR(x, z, R)) continue
        b.set(x, y, z, inR(x, z, R - 1) ? 'air' : blk)
      }
    }
    for (let x = c - R; x <= c + R; x++) for (let z = c - R; z <= c + R; z++) if (inR(x, z, R - 1)) b.set(x, 1, z, 'spruce_planks')
    // windows up the front and sides
    for (let y = 6; y < H - 2; y += 5) { b.set(c, y, c + R, 'glass_pane'); b.set(c, y + 1, c + R, 'glass_pane'); b.set(c - R, y + 2, c, 'glass_pane'); b.set(c + R, y + 2, c, 'glass_pane') }
    // the door, a step, a lamp each side
    b.fill(c, 2, c + R, c, 3, c + R, 'air'); b.door(c, 2, c + R, 's', 'spruce')
    b.fill(c - 1, 1, c + R + 1, c + 1, 1, c + R + 2, 'stone_bricks'); b.set(c, 1, c + R + 3, 'stone_brick_stairs[facing=north]')
    b.post(c - 2, 2, c + R + 1, 2); b.post(c + 2, 2, c + R + 1, 2)
    // a ladder up a spine in the middle
    b.fill(c, 2, c - 1, c, H, c - 1, 'stripped_spruce_log[axis=y]'); b.fill(c, 2, c, c, H, c, 'ladder[facing=south]')
    // the gallery: a ring deck one wider than the tower, iron railing
    for (let x = c - R - 1; x <= c + R + 1; x++) for (let z = c - R - 1; z <= c + R + 1; z++) {
      if (!inR(x, z, R + 1)) continue
      b.set(x, H + 1, z, 'smooth_stone_slab[type=top]')
      if (!inR(x, z, R)) b.set(x, H + 2, z, 'iron_bars')
    }
    b.set(c, H + 1, c, 'spruce_trapdoor[facing=south,open=true,half=top]')
    // the lantern room: glass round a light, a dark copper-green roof
    for (let x = c - 2; x <= c + 2; x++) for (let z = c - 2; z <= c + 2; z++) {
      if (!inR(x, z, 2)) continue
      const edge = !inR(x, z, 1)
      for (let y = H + 2; y <= H + 4; y++) b.set(x, y, z, edge ? 'glass' : 'air')
      b.set(x, H + 5, z, 'oxidized_cut_copper')
    }
    b.set(c, H + 2, c, 'polished_andesite'); b.set(c, H + 3, c, 'sea_lantern'); b.set(c - 1, H + 3, c, 'glowstone'); b.set(c + 1, H + 3, c, 'glowstone')
    for (let x = c - 1; x <= c + 1; x++) for (let z = c - 1; z <= c + 1; z++) b.set(x, H + 6, z, 'oxidized_cut_copper_slab[type=bottom]')
    b.set(c, H + 6, c, 'oxidized_cut_copper'); b.set(c, H + 7, c, 'lightning_rod[facing=up]')
    b.anchor('door', c, 2, c + R, 's'); b.anchor('doorstep', c, 2, c + R + 3, 'n'); b.anchor('approach', c, 1, c + R + 9, 'n')
    b.anchor('gallery', c, H + 2, c + R + 1, 's'); b.anchor('gallery_side', c + R + 1, H + 2, c, 'e')
    b.anchor('light', c, H + 3, c, 'up'); b.anchor('inside', c + 1, 2, c + 2, 'n')
    return b
  }
}

const bridge = {
  name: 'bridge',
  about: 'stone arch bridge with a plank-and-stone deck, low walls, lamp posts, piers going down into the gap',
  variants: { length: 'span along z (default 25)', width: 'deck width incl. walls (default 7)', drop: 'how far the piers go down (default 12)' },
  build (v = {}) {
    const b = new Voxels('bridge').seed(v.seed || 41)
    const L = v.length || 25, Wd = v.width || 7, drop = v.drop || 12
    const stone = b.mix({ stone_bricks: 5, mossy_stone_bricks: 2, cracked_stone_bricks: 1 })
    b.fill(0, 1, 0, Wd - 1, 5, L - 1, 'air')
    // the deck: stone edges, planks down the middle, a gravel shoulder
    b.fill(0, 0, 0, Wd - 1, 0, L - 1, stone)
    b.fill(1, 0, 0, Wd - 2, 0, L - 1, (x, y, z) => b.pick(['spruce_planks', 'spruce_planks', 'oak_planks', 'stripped_spruce_wood[axis=z]']))
    b.fill(0, 1, 0, 0, 1, L - 1, 'stone_brick_wall'); b.fill(Wd - 1, 1, 0, Wd - 1, 1, L - 1, 'mossy_stone_brick_wall')
    // the arch: underside of the deck stepped down to the piers
    const piers = [Math.floor(L / 4), L - 1 - Math.floor(L / 4)]
    b.fill(0, -1, 0, Wd - 1, -1, L - 1, stone)
    for (const p of piers) {
      b.fill(0, -drop, p - 1, Wd - 1, -1, p + 1, stone)
      b.fill(-1, -drop, p, -1, -2, p, 'stone_bricks'); b.fill(Wd, -drop, p, Wd, -2, p, 'stone_bricks')   // cutwaters
      b.set(-1, -1, p, 'stone_brick_stairs[facing=east,half=top]'); b.set(Wd, -1, p, 'stone_brick_stairs[facing=west,half=top]')
      for (const dz of [-2, 2]) b.fill(0, -2, p + dz, Wd - 1, -2, p + dz, `stone_brick_stairs[facing=${dz < 0 ? 'south' : 'north'},half=top]`)
    }
    // abutments at both ends going down
    for (const z of [0, L - 1]) b.fill(0, -drop, z, Wd - 1, -1, z, stone)
    // lamp posts on the walls at the piers and the middle, banners at the ends
    for (const z of [...piers, Math.floor(L / 2)]) for (const x of [0, Wd - 1]) { b.fill(x, 1, z, x, 2, z, 'stone_bricks'); b.post(x, 3, z, 1, 'dark_oak_fence') }
    for (const x of [0, Wd - 1]) { b.fill(x, 1, 0, x, 3, 0, 'stone_bricks'); b.set(x, 4, 0, 'stone_brick_slab[type=bottom]'); b.fill(x, 1, L - 1, x, 3, L - 1, 'stone_bricks'); b.set(x, 4, L - 1, 'stone_brick_slab[type=bottom]') }
    b.set(0, 3, L - 2, 'blue_wall_banner[facing=south]'); b.set(Wd - 1, 3, L - 2, 'blue_wall_banner[facing=south]')
    const m = Math.floor(Wd / 2)
    b.anchor('end_a', m, 1, 1, 's'); b.anchor('end_b', m, 1, L - 2, 'n'); b.anchor('middle', m, 1, Math.floor(L / 2), 'e')
    b.anchor('rail', Wd - 2, 1, Math.floor(L / 2) - 2, 'e'); b.anchor('approach_b', m, 1, L + 6, 'n')
    return b
  }
}

const mine = {
  name: 'mine',
  about: 'mine entrance cut into a rocky hill: a timber portal, a framed tunnel with rails, lanterns and ore, spoil heaps, a cart',
  variants: { depth: 'tunnel length (default 16)' },
  build (v = {}) {
    const b = new Voxels('mine').seed(v.seed || 51)
    const W = 21, Dp = v.depth || 16, D = Dp + 6, cx = 10
    // the hill: a dome higher at the back, grass on top, stone where it is steep
    const hgt = (x, z) => {
      const dx = (x - cx) / 10.5, dz = (z - Dp * 0.45) / (Dp * 0.75)
      const d = dx * dx + dz * dz
      return d >= 1 ? -1 : Math.round(11 * Math.sqrt(1 - d))
    }
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
      const h = hgt(x, z)
      if (h < 0) continue
      const steep = Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, c]) => Math.abs(h - Math.max(0, hgt(x + a, z + c))))) > 1
      for (let y = 0; y <= h; y++) {
        let blk = b.pick(['stone', 'stone', 'andesite', 'stone', 'cobblestone', 'gravel', 'tuff'])
        if (y === h && !steep) blk = 'grass_block'
        else if (y >= h - 2 && !steep) blk = 'dirt'
        b.set(x, y, z, blk)
      }
      if (!steep && h > 0 && b.rand() < 0.3) b.set(x, h + 1, z, b.pick(['short_grass', 'fern', 'short_grass', 'sweet_berry_bush[age=3]', 'poppy']))
    }
    // the tunnel: 3 wide x 3 high inside timber frames every 3, from the face back
    const mz = Dp + 1   // the mouth
    for (let z = 1; z <= mz + 2; z++) b.fill(cx - 2, 1, z, cx + 2, 4, z, 'air')
    for (let z = 1; z <= mz + 2; z++) b.fill(cx - 2, 0, z, cx + 2, 0, z, b.pick(['gravel', 'stone', 'cobblestone', 'gravel']))
    for (let z = mz; z >= 2; z -= 3) {
      b.fill(cx - 2, 1, z, cx - 2, 3, z, 'stripped_spruce_log[axis=y]'); b.fill(cx + 2, 1, z, cx + 2, 3, z, 'stripped_spruce_log[axis=y]')
      b.fill(cx - 2, 4, z, cx + 2, 4, z, 'spruce_log[axis=x]')
      if ((mz - z) % 6 === 0) b.hang(cx, 3, z, 0)
    }
    // rock above the frames between them, ore in the walls, cobwebs deeper in
    for (let z = 1; z < mz; z++) for (const x of [cx - 3, cx + 3]) for (let y = 1; y <= 4; y++) if (b.rand() < 0.12) b.set(x, y, z, b.pick(['coal_ore', 'iron_ore', 'coal_ore', 'copper_ore']))
    b.set(cx - 1, 4, 3, 'cobweb'); b.set(cx + 1, 3, 2, 'cobweb'); b.fill(cx - 2, 1, 1, cx + 2, 4, 1, 'stone')
    // rails down the middle
    for (let z = 2; z <= mz + 2; z++) b.set(cx, 1, z, 'rail[shape=north_south]')
    // the portal: a heavier frame at the face, a sign
    b.fill(cx - 3, 1, mz + 1, cx - 3, 4, mz + 1, 'spruce_log[axis=y]'); b.fill(cx + 3, 1, mz + 1, cx + 3, 4, mz + 1, 'spruce_log[axis=y]')
    b.fill(cx - 4, 5, mz + 1, cx + 4, 5, mz + 1, 'spruce_log[axis=x]')
    b.set(cx - 4, 4, mz + 1, 'spruce_stairs[facing=east,half=top]'); b.set(cx + 4, 4, mz + 1, 'spruce_stairs[facing=west,half=top]')
    b.fill(cx - 2, 1, mz + 1, cx + 2, 4, mz + 1, 'air')
    b.sign(cx, 6, mz + 1, ['', 'MINE', 'KEEP OUT', ''], { wood: 'spruce', wall: 's' }); b.set(cx, 6, mz, 'stone')
    b.hang(cx - 3, 4, mz + 2, 0, 'lantern'); b.set(cx - 3, 5, mz + 2, 'spruce_planks'); b.hang(cx + 3, 4, mz + 2, 0); b.set(cx + 3, 5, mz + 2, 'spruce_planks')
    // spoil heaps, a cart, a barrel of picks
    for (const [x, z, r] of [[3, D - 2, 2], [17, D - 3, 2]]) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const hh = r - Math.round(Math.hypot(dx, dz))
      for (let y = 1; y <= hh; y++) b.set(x + dx, y, z + dz, b.pick(['gravel', 'cobblestone', 'gravel', 'andesite']))
    }
    b.set(cx + 4, 1, D - 1, 'barrel[facing=up]'); b.set(cx + 5, 1, D - 1, 'chest[facing=south]'); b.set(cx - 4, 1, D - 1, 'hay_block[axis=x]')
    b.extra(cx, 1, mz + 2, (p) => `/summon minecart ${p.x} ${p.y} ${p.z}`)
    b.anchor('mouth', cx, 1, D + 2, 'n'); b.anchor('portal', cx, 1, mz + 1, 'n')
    b.anchor('inside', cx, 1, Math.floor(mz / 2), 'n'); b.anchor('deep', cx, 1, 2, 's')
    b.anchor('cart', cx, 1, mz + 2, 'n'); b.anchor('hilltop', cx, hgt(cx, 5) + 1, 5, 's')
    return b
  }
}

module.exports = { lighthouse, bridge, mine }
