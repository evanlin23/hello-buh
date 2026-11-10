// Multi-volume pieces: a tavern with a wing, a windmill with its granary, a dock.
const { Voxels } = require('../voxel')
const { palette } = require('../palette')

const tavern = {
  name: 'tavern',
  about: 'two-storey tavern with a one-storey wing (L plan, cross gable): stone ground floor, jettied timber-and-plaster upper floor, a signboard, a bar, a hearth, rooms upstairs, a beer garden',
  variants: { palette: ['plaster (default)', 'oak', 'spruce', 'birch'], name: 'signboard lines, "THE|CRAFTY|CREEPER"' },
  build (v = {}) {
    const P = palette({ palette: 'plaster', ...v }), b = new Voxels('tavern').seed(v.seed || 23)
    const stone = b.mix({ stone_bricks: 4, cobblestone: 3, mossy_cobblestone: 2, cracked_stone_bricks: 1, andesite: 1 })
    // the lot
    b.fill(-11, 0, -1, 14, 0, 18, 'grass_block'); b.fill(-11, 1, -1, 14, 16, 18, 'air')

    // --- the wing (west, one storey, ridge along z: a cross gable against the hall), built first so the hall wins
    const wr = b.framed(-9, 2, -1, 10, 3, { post: P.frame, beam: P.beam, every: 4, panel: b.mix({ [P.wall]: 4, [P.wall === 'calcite' ? 'white_terracotta' : P.wall]: 1 }), lower: stone })
    b.fill(wr.x0, 0, wr.z0, wr.x1, 0, wr.z1, P.floor)
    b.roof(-9, 2, -1, 10, 5, { along: 'z', stair: P.roof, gable: P.wall, over: 1 })
    b.verge(-9, 2, -1, 10, 5, { along: 'z', over: 1, trim: 'spruce' })
    b.sill(-5, 2, wr.pz1, 's', { w: 1, glass: P.glass, head: P.trap }); b.sill(wr.px0, 2, 5, 'w', { w: 2, glass: P.glass, head: P.trap })
    b.door(-3, 1, wr.pz1, 's', P.door); b.set(-3, 1, 10, 'air')
    // inside the wing: the kitchen and the cellar barrels
    b.set(-7, 1, 4, 'smoker[facing=east]'); b.set(-7, 1, 5, 'furnace[facing=east]'); b.set(-7, 1, 6, 'barrel[facing=east]'); b.set(-7, 2, 6, 'barrel[facing=east]')
    b.set(-7, 1, 8, 'crafting_table'); b.set(-4, 1, 4, 'water_cauldron[level=3]'); b.hang(-5, 3, 6, 0)
    b.fill(-6, 1, 8, -4, 1, 8, 'barrel[facing=up]')

    // --- the hall: stone ground floor (framed), a jettied timber upper floor, a steep roof along x
    const r = b.framed(0, 0, 12, 10, 4, { post: P.frame, beam: P.beam, every: 4, panel: stone, footing: b.mix({ cobblestone: 3, mossy_cobblestone: 2 }) })
    b.fill(r.x0, 0, r.z0, r.x1, 0, r.z1, b.mix({ spruce_planks: 3, dark_oak_planks: 1 }))
    const up = 5, ut = 9, jz = 11
    b.fill(0, up, 0, 12, up, jz, P.floor); b.fill(0, up, jz, 12, up, jz, `${P.beam}[axis=x]`)
    b.fill(0, 4, jz, 12, 4, jz, `${P.stair}[facing=north,half=top]`)
    b.fill(0, up + 1, 0, 12, ut, jz, P.wall, 'walls'); b.fill(1, up + 1, 1, 11, ut, jz - 1, 'air')
    for (const x of [0, 4, 8, 12]) for (const z of [0, jz]) b.fill(x, up + 1, z, x, ut, z, `${P.frame}[axis=y]`)
    for (const z of [4, 8]) for (const x of [0, 12]) b.fill(x, up + 1, z, x, ut, z, `${P.frame}[axis=y]`)
    b.fill(0, ut + 1, 0, 12, ut + 1, 0, `${P.beam}[axis=x]`); b.fill(0, ut + 1, jz, 12, ut + 1, jz, `${P.beam}[axis=x]`)
    b.roof(0, 0, 12, jz, ut + 1, { along: 'x', stair: P.roof, gable: P.wall, over: 1 })
    b.verge(0, 0, 12, jz, ut + 1, { along: 'x', over: 1, trim: 'spruce' })
    b.fill(6, ut + 1, 5, 6, ut + 5, 5, `${P.frame}[axis=y]`)
    // the front: double doors in the middle bay, wide windows, lanterns under the jetty, the signboard
    b.door(6, 1, r.pz1, 's', P.door, { hinge: 'left' }); b.door(5, 1, r.pz1, 's', P.door, { hinge: 'right' })
    b.fill(5, 1, 10, 6, 1, 10, 'air'); b.set(4, 3, 10, `${P.stair}[facing=east,half=top]`); b.set(7, 3, 10, `${P.stair}[facing=west,half=top]`)
    b.sill(2, 2, r.pz1, 's', { w: 2, glass: P.glass, head: P.trap }); b.sill(9, 2, r.pz1, 's', { w: 2, glass: P.glass, head: P.trap })
    b.window(2, 7, jz, 's', { w: 1, glass: P.glass, shutter: null, box: true }); b.window(5, 7, jz, 's', { w: 3, glass: P.glass, shutter: null, box: true }); b.window(10, 7, jz, 's', { w: 1, glass: P.glass, shutter: null, box: true })
    b.sill(r.px1, 2, 4, 'e', { w: 2, glass: P.glass, head: P.trap }); b.window(12, 7, 6, 'e', { w: 2, glass: P.glass, shutter: null })
    b.hang(3, 4, 12, 0); b.hang(9, 4, 12, 0)
    const lines = (v.name || 'THE|CRAFTY|CREEPER').split('|')
    b.set(8, 4, 13, 'spruce_fence'); b.set(8, 4, 12, 'spruce_fence')
    b.sign(8, 3, 13, lines.slice(0, 4), { wood: 'dark_oak', hanging: true, rotation: 4 })   // hangs from the bracket, readable from the street
    // the chimney up the east gable, the hearth inside
    b.fill(13, 0, 4, 13, 15, 6, 'bricks'); b.fill(13, 16, 5, 13, 16, 5, 'campfire[lit=true,facing=south]'); b.set(13, 16, 4, 'brick_wall'); b.set(13, 16, 6, 'brick_wall')
    b.fill(r.px1, 1, 5, r.px1, 3, 6, 'bricks'); b.set(r.x1, 1, 5, 'campfire[lit=true,facing=west]'); b.set(r.x1, 1, 6, 'campfire[lit=true,facing=west]')
    b.fill(r.x1, 3, 4, r.x1, 3, 7, 'spruce_slab[type=top]')
    // inside: the bar along the back, barrels behind it, tables and stools, a passage to the wing
    b.fill(3, 1, 3, 8, 1, 3, 'stripped_spruce_wood[axis=x]'); b.fill(3, 2, 3, 8, 2, 3, 'spruce_slab[type=bottom]')
    b.fill(3, 1, 2, 8, 2, 2, 'barrel[facing=south]'); b.set(5, 3, 2, 'barrel[facing=south]')
    b.set(4, 3, 3, 'candle[candles=2,lit=true]'); b.set(7, 3, 3, 'potted_red_tulip')
    for (const x of [4, 6, 8]) b.chair(x, 1, 4, 'n', 'spruce_stairs')
    for (const [x, z] of [[3, 7], [8, 7]]) { b.table(x, 1, z, { leg: 'spruce_fence', top: 'spruce_pressure_plate' }); b.chair(x - 1, 1, z, 'e', 'spruce_stairs'); b.chair(x + 1, 1, z, 'w', 'spruce_stairs') }
    b.fill(2, 0, 5, 9, 0, 8, 'dark_oak_planks', { replace: ['spruce_planks'] })
    b.fill(-2, 1, 6, 2, 2, 6, 'air')   // through to the wing
    b.hang(4, 4, 6, 0); b.hang(8, 4, 6, 0)
    for (const x of [2, 6, 10]) b.fill(x, 4, 1, x, 4, 9, `${P.beam}[axis=z]`)
    // stairs up in the back-east corner, rooms upstairs
    for (let i = 0; i < 4; i++) b.set(10 - i, 1 + i, 2, `spruce_stairs[facing=west]`)
    b.fill(7, 1, 2, 10, 2, 2, 'air', { replace: ['barrel'] })
    b.fill(7, up, 1, 10, up, 2, 'air'); b.set(9, 1, 2, 'spruce_stairs[facing=west]')
    b.bed(2, up + 1, 1, 's', 'red'); b.bed(10, up + 1, 9, 'n', 'green'); b.set(3, up + 1, 1, 'barrel[facing=up]'); b.set(3, up + 2, 1, 'candle[candles=1,lit=true]')
    b.fill(5, up + 1, 1, 5, up + 3, 9, P.wall); b.door(5, up + 1, 6, 'w', P.door)
    b.hang(3, ut, 5, 0); b.hang(9, ut, 6, 0)
    // the beer garden in front of the wing: tables under a lantern string, barrels, a fence
    b.fill(-10, 1, 12, -1, 1, 17, P.fence, 'walls'); b.fill(-10, 1, 12, -1, 1, 12, 'air'); b.set(-3, 1, 17, `${P.gate}[facing=south,open=true]`)
    for (let x = -10; x <= -1; x++) for (let z = 13; z <= 16; z++) if (b.rand() < 0.35) b.set(x, 0, z, b.pick(['coarse_dirt', 'dirt_path', 'gravel']))
    for (const [x, z] of [[-7, 14], [-4, 15]]) { b.table(x, 1, z, { leg: 'spruce_fence', top: 'spruce_pressure_plate' }); b.chair(x, 1, z - 1, 's', 'spruce_stairs'); b.chair(x, 1, z + 1, 'n', 'spruce_stairs') }
    b.post(-10, 1, 12, 3, P.fence); b.post(-1, 1, 17, 3, P.fence); b.post(-10, 1, 17, 3, P.fence)
    b.set(-9, 1, 16, 'barrel[facing=up]'); b.set(-9, 2, 16, 'barrel[facing=up]'); b.set(-8, 1, 16, 'barrel[facing=north]')
    // the front step and path, barrels and a cart by the door
    for (let z = 12; z <= 18; z++) { b.set(5, 0, z, 'dirt_path'); b.set(6, 0, z, b.pick(['dirt_path', 'dirt_path', 'coarse_dirt'])) }
    b.set(1, 1, 12, 'barrel[facing=up]'); b.set(2, 1, 12, 'barrel[facing=north]'); b.set(1, 2, 12, 'barrel[facing=up]')
    b.set(11, 1, 12, 'hay_block[axis=x]'); b.set(11, 1, 13, 'composter[level=5]')
    b.anchor('door', 6, 1, r.pz1, 's'); b.anchor('doorstep', 6, 1, 13, 'n'); b.anchor('street', 6, 1, 18, 'n')
    b.anchor('bar', 5, 1, 2, 's'); b.anchor('bar_front', 6, 1, 4, 'n'); b.anchor('table', 3, 1, 7, 's'); b.anchor('hearth', r.x1 - 1, 1, 6, 'e')
    b.anchor('inside', 2, 1, 8, 'n', { look: [9, 2, 2] }); b.anchor('wing_door', -3, 1, 11, 'n'); b.anchor('kitchen', -5, 1, 5, 'w')
    b.anchor('garden', -5, 1, 14, 'e'); b.anchor('upstairs', 7, up + 1, 4, 's')
    return b
  }
}

const windmill = {
  name: 'windmill',
  about: 'stone tower windmill with a timber cap and four canvas sails, a granary shed, sacks and a cart',
  variants: { height: 'tower height (default 12)' },
  build (v = {}) {
    const b = new Voxels('windmill').seed(v.seed || 29)
    const H = v.height || 12, c = 5, R = 4
    const inR = (x, z, r) => Math.hypot(x - c, z - c) <= r + 0.4
    b.fill(-1, 1, -1, 18, H + 16, 13, 'air')
    for (let x = -1; x <= 11; x++) for (let z = -1; z <= 11; z++) if (Math.hypot(x - c, z - c) < 6.5) b.set(x, 0, z, b.pick(['gravel', 'coarse_dirt', 'dirt_path', 'cobblestone', 'grass_block']))
    // the tower: a tapering ring of mixed stone, darker at the foot
    for (let y = 0; y <= H; y++) {
      const rr = R - (y > H * 0.6 ? 1 : 0)
      for (let x = c - R; x <= c + R; x++) for (let z = c - R; z <= c + R; z++) {
        if (!inR(x, z, rr)) continue
        const shell = !inR(x, z, rr - 1)
        b.set(x, y, z, shell ? (y < 3 ? b.pick(['mossy_cobblestone', 'cobblestone', 'mossy_stone_bricks']) : b.pick(['stone_bricks', 'stone_bricks', 'cracked_stone_bricks', 'andesite', 'cobblestone'])) : (y === 0 || y === 6 ? 'spruce_planks' : 'air'))
      }
    }
    b.set(c, 6, c, 'air'); b.fill(c, 1, c - 2, c, H, c - 2, 'ladder[facing=south]'); b.set(c, 6, c - 2, 'ladder[facing=south]')
    b.fill(c - 1, 1, c - 3, c + 1, H, c - 3, 'stone_bricks', { replace: ['air'] })
    b.door(c, 1, c + R, 's', 'spruce'); b.set(c - 1, 3, c + R + 1, 'lantern'); b.set(c - 1, 2, c + R + 1, 'spruce_fence'); b.set(c - 1, 1, c + R + 1, 'spruce_fence')
    for (const [x, y, z] of [[c, 8, c + R], [c - R, 4, c], [c + R, 9, c], [c - R + 1, 10, c]]) b.set(x, y, z, 'glass_pane')
    // inside: millstones, sacks
    b.set(c + 1, 1, c, 'grindstone[face=floor,facing=east]'); b.fill(c - 2, 1, c + 1, c - 1, 1, c + 2, 'hay_block[axis=y]'); b.set(c + 2, 1, c - 1, 'barrel[facing=up]')
    b.hang(c, 5, c + 1, 0)
    // the cap: a timber box with a pitched roof, facing the sails (front, +z)
    const y0 = H + 1
    b.fill(c - 3, y0, c - 3, c + 3, y0, c + 3, 'spruce_planks')
    b.fill(c - 2, y0 + 1, c - 3, c + 2, y0 + 3, c + 3, 'spruce_planks', 'walls'); b.fill(c - 1, y0 + 1, c - 2, c + 1, y0 + 3, c + 2, 'air')
    for (const [x, z] of [[c - 2, c - 3], [c + 2, c - 3], [c - 2, c + 3], [c + 2, c + 3]]) b.fill(x, y0 + 1, z, x, y0 + 3, z, 'stripped_spruce_log[axis=y]')
    b.roof(c - 2, c - 3, c + 2, c + 3, y0 + 4, { along: 'z', stair: 'dark_oak_stairs', gable: 'spruce_planks', over: 1 })
    b.set(c, y0 + 2, c - 3, 'glass_pane')
    // the sails: an axle out of the cap's front, four arms of fence with wool canvas, turned 45 degrees (an X)
    const ay = y0 + 2, az = c + 4
    b.fill(c, ay, c + 3, c, ay, az, 'stripped_oak_log[axis=z]'); b.set(c, ay, az + 1, 'oak_planks')
    const L = 9
    for (let i = 1; i <= L; i++) {
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const x = c + sx * i, y = ay + sy * i
        if (y < 2) continue
        b.set(x, y, az + 1, 'oak_fence')
        if (i >= 3) {
          // the canvas: a strip beside the arm, on its trailing side
          const cx = x - sy, cy = y + sx
          if (cy >= 2) b.set(cx, cy, az + 1, i % 2 ? 'white_wool' : 'white_wool')
          const cx2 = x - 2 * sy, cy2 = y + 2 * sx
          if (cy2 >= 2 && i >= 4) b.set(cx2, cy2, az + 1, 'white_wool')
        }
      }
    }
    // the granary: a small shed to the east with a lean-to roof, sacks and a cart
    b.fill(11, 0, 1, 16, 0, 7, 'spruce_planks'); b.fill(11, 1, 1, 16, 4, 7, 'spruce_planks', 'walls'); b.fill(12, 1, 2, 15, 4, 6, 'air')
    for (const [x, z] of [[11, 1], [16, 1], [11, 7], [16, 7]]) b.fill(x, 0, z, x, 4, z, 'stripped_spruce_log[axis=y]')
    for (let z = 0; z <= 8; z++) for (let x = 10; x <= 17; x++) b.set(x, 5 - (z > 4 ? 1 : 0), z, `dark_oak_slab[type=${z > 4 ? 'top' : 'bottom'}]`)
    b.fill(13, 1, 7, 14, 3, 7, 'air'); b.fill(12, 1, 3, 13, 2, 4, 'hay_block[axis=y]'); b.set(15, 1, 3, 'barrel[facing=up]'); b.set(15, 2, 3, 'barrel[facing=up]')
    b.set(12, 1, 9, 'barrel[facing=up]'); b.set(13, 1, 9, 'hay_block[axis=x]'); b.set(12, 2, 9, 'potted_poppy'); b.set(16, 1, 9, 'composter[level=7]')
    b.extra(14, 1, 10, (p) => `/summon chest_minecart ${p.x} ${p.y} ${p.z}`)
    b.post(8, 1, 11, 3)
    b.anchor('door', c, 1, c + R, 's'); b.anchor('doorstep', c, 1, c + R + 3, 'n'); b.anchor('approach', c + 2, 1, 16, 'n')
    b.anchor('inside', c, 1, c + 2, 'n'); b.anchor('cap', c, y0 + 1, c, 's'); b.anchor('granary', 13, 1, 9, 'n'); b.anchor('sails', c, ay, az + 1, 's')
    return b
  }
}

const dock = {
  name: 'dock',
  about: 'a timber dock out over the water: log piles, a plank walk with a rail, a T-head with a fishing shack, crates, barrels, lanterns, a bell',
  variants: { length: 'walk length over the water (default 18)', depth: 'how far the piles go down (default 8)' },
  build (v = {}) {
    const b = new Voxels('dock').seed(v.seed || 37)
    const L = v.length || 18, D = v.depth || 8, z1 = 3 + L
    // the shore end: a stone landing with steps, a lamp
    b.fill(-1, 0, 0, 5, 0, 2, b.mix({ cobblestone: 3, mossy_cobblestone: 2, stone_bricks: 1 })); b.fill(-1, -3, 0, 5, -1, 2, 'cobblestone')
    b.fill(-1, 1, 0, 5, 6, 2, 'air')
    b.post(-1, 1, 2, 3, 'spruce_fence'); b.post(5, 1, 2, 3, 'spruce_fence')
    // the walk: planks (a few missing boards replaced by slabs), log piles every 4 down into the water, a rail
    for (let z = 3; z <= z1; z++) {
      for (let x = 0; x <= 4; x++) b.set(x, 0, z, b.rand() < 0.08 ? 'spruce_slab[type=top]' : (x === 0 || x === 4 ? 'stripped_spruce_log[axis=z]' : b.pick(['spruce_planks', 'spruce_planks', 'oak_planks'])))
      b.fill(0, 1, z, 4, 4, z, 'air')
      if ((z - 3) % 4 === 0) for (const x of [0, 4]) { b.fill(x, -D, z, x, -1, z, 'spruce_log[axis=y]'); b.set(x, 1, z, 'spruce_fence') }
      else if (z % 2) { b.set(0, 1, z, 'spruce_fence'); b.set(4, 1, z, 'spruce_fence') }
    }
    // the T-head: a wider platform with a fishing shack
    const t0 = z1 - 6
    for (let x = -4; x <= 8; x++) for (let z = t0; z <= z1; z++) { b.set(x, 0, z, b.pick(['spruce_planks', 'spruce_planks', 'oak_planks', 'dark_oak_planks'])); b.fill(x, 1, z, x, 5, z, 'air') }
    for (const x of [-4, 0, 4, 8]) for (const z of [t0, z1]) b.fill(x, -D, z, x, -1, z, 'spruce_log[axis=y]')
    b.fill(-4, 1, z1, 8, 1, z1, 'spruce_fence'); b.fill(-4, 1, t0, -4, 1, z1, 'spruce_fence'); b.fill(8, 1, t0, 8, 1, z1, 'spruce_fence')
    b.fill(-1, 1, t0, -4, 1, t0, 'spruce_fence'); b.fill(5, 1, t0, 8, 1, t0, 'spruce_fence')
    // the shack in the west corner of the T
    b.fill(-3, 1, t0 + 1, 0, 3, t0 + 4, 'spruce_planks', 'walls'); b.fill(-2, 1, t0 + 2, -1, 3, t0 + 3, 'air')
    for (const [x, z] of [[-3, t0 + 1], [0, t0 + 1], [-3, t0 + 4], [0, t0 + 4]]) b.fill(x, 1, z, x, 3, z, 'stripped_spruce_log[axis=y]')
    b.door(0, 1, t0 + 3, 'e', 'spruce'); b.set(-3, 2, t0 + 2, 'glass_pane')
    b.roof(-3, t0 + 1, 0, t0 + 4, 4, { along: 'x', stair: 'dark_oak_stairs', gable: 'spruce_planks', over: 1 })
    b.set(-2, 1, t0 + 2, 'barrel[facing=up]'); b.set(-1, 1, t0 + 2, 'chest[facing=south]'); b.hang(-1, 3, t0 + 3, 0)
    // cargo: crates, barrels, a net (cobweb), a bell on a post, lanterns
    b.set(6, 1, t0 + 1, 'barrel[facing=up]'); b.set(7, 1, t0 + 1, 'barrel[facing=north]'); b.set(6, 2, t0 + 1, 'barrel[facing=up]')
    b.set(7, 1, t0 + 2, 'hay_block[axis=x]'); b.set(6, 1, z1 - 1, 'cobweb'); b.set(3, 1, z1 - 1, 'barrel[facing=up]')
    b.fill(8, 2, z1, 8, 3, z1, 'spruce_fence'); b.set(8, 4, z1, 'spruce_planks'); b.set(8, 3, z1 - 1, 'air'); b.set(7, 4, z1, 'spruce_fence'); b.set(7, 3, z1, 'bell[attachment=ceiling,facing=south]')
    b.post(-4, 2, z1, 2, 'spruce_fence'); b.post(4, 2, t0 - 4, 2, 'spruce_fence')
    b.anchor('shore', 2, 1, 1, 's'); b.anchor('walk', 2, 1, 3 + Math.floor(L / 2), 's'); b.anchor('end', 2, 1, z1 - 1, 's')
    b.anchor('shack', 1, 1, t0 + 3, 'w'); b.anchor('moor', 6, 1, z1 - 2, 'e'); b.anchor('approach', 2, 1, -4, 's')
    return b
  }
}

module.exports = { tavern, windmill, dock }
