// mobpov #1 (family `mobpov`, owner r:r8048f1; docs/formats.md): "no wall can stop a baby zombie". The narrator is a
// baby zombie (stunt.self: its model and its 0.93 eye), and its one annoying trait, the speed, is blown up to absurd:
// it runs a straight line at ~25 blocks/s and nothing slows it. A stone wall, a pig pen, a queue of villagers, cows and
// an iron golem, a house (in through the door, out through the back wall), then straight DOWN through dirt, stone,
// deepslate and bedrock into a Nether cave, where 56e thought he was safe by his portal. One punch, and 56e goes
// flying, clean past his own portal.
//
// The camera (owner r:r38374d): the speed is all TRAVEL (lib/mobpov.js dash); the view never turns fast. Every leg runs
// dead straight east, the legs are joined by hard cuts (and two fixed outside shots that show how tiny it is), and the
// one turn (the look up from the dive) is eased at under 150 deg/s.
//
// The course, one set (lib/sets: fitted to real plains, real terrain round it), local frame: facing south, so local x
// = world x (east, the way it runs), y 0 = the ground block, feet at y 1, the lane along z 0 (block centres z 0.5).
//   x 14..16   a stone-brick wall, 5 high, 19 wide
//   x 28..40   a fenced pig pen (6 pigs, 3 of them in the lane), hay and a trough
//   x 54..71   a dirt road with a queue on it: villager, cow, chicken, sheep, iron golem, villager
//   x 74..84   a timber house, the door facing the zombie; table, crafting table, chest, bed, bookshelves inside
//   x 98       the dive: a layered column (dirt, stone, deepslate, bedrock) down into a netherrack cave
//   cave       x 80..122, z -16..16, floor y -47 (feet -46), ceiling y -31: lava lake, glowstone, crimson fungus,
//              two zombified piglins, and 56e (a Mannequin in his real skin) in front of his portal at x 114
const sets = require('../lib/sets')
const PIECES = require('../lib/sets/pieces')
const { Voxels } = require('../lib/sets/voxel')
const { rusher, mobpovEdit } = require('../lib/mobpov')

const CAPTION = 'this baby zombie will NOT stop 😭'   // a reaction, not a label (owner r:r0f3da0, docs/lessons.md "Openings"); our own words, not the reference's "POV: A baby zombie found you"
const EAST = -Math.PI / 2
const DEG = Math.PI / 180
const GUY = { x: 112.3, z: 3.9 }   // 56e, just right of his portal (its frame is z -2..2 at x 114): he flies past it

function register (name, buildFn) {
  PIECES[name] = { name, about: `mobpov piece ${name}`, variants: {}, build: (v = {}) => { const b = new Voxels(name).seed(v.seed || 11); buildFn(b, v); return b } }
  return name
}

function tree (b, x, z, h = 5) {
  b.fill(x, 1, z, x, h, z, 'oak_log[axis=y]')
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let y = h - 1; y <= h + 1; y++) {
    const r = Math.abs(dx) + Math.abs(dz) + (y === h + 1 ? 1 : 0)
    if (r <= 3 && !(dx === 0 && dz === 0 && y < h + 1) && b.rand() > 0.12) b.set(x + dx, y, z + dz, 'oak_leaves[persistent=true]')
  }
  b.set(x, h + 2, z, 'oak_leaves[persistent=true]')
}

// the surface course
function course (b) {
  const X0 = -6, X1 = 106, Z0 = -14, Z1 = 14
  b.fill(X0, -3, Z0, X1, -1, Z1, 'dirt')
  b.fill(X0, 0, Z0, X1, 0, Z1, 'grass_block')
  b.fill(X0, 1, Z0, X1, 22, Z1, 'air')
  // meadow: tufts and flowers off the lane
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    if (Math.abs(z) <= 1) continue
    const r = b.rand()
    if (r < 0.10) b.set(x, 1, z, 'short_grass')
    else if (r < 0.12) b.set(x, 1, z, b.pick(['poppy', 'dandelion', 'oxeye_daisy', 'cornflower', 'azure_bluet']))
  }
  // the wall
  b.fill(14, 1, -9, 16, 5, 9, b.mix({ stone_bricks: 6, mossy_stone_bricks: 2, cracked_stone_bricks: 1, cobblestone: 1 }))
  for (let z = -9; z <= 9; z += 2) b.set(15, 6, z, 'stone_brick_wall')
  // the pig pen
  b.fill(28, 1, -6, 40, 1, -6, 'oak_fence'); b.fill(28, 1, 6, 40, 1, 6, 'oak_fence')
  b.fill(28, 1, -6, 28, 1, 6, 'oak_fence'); b.fill(40, 1, -6, 40, 1, 6, 'oak_fence')
  b.set(28, 1, 4, 'oak_fence_gate[facing=west]')
  b.fill(29, 0, -5, 39, 0, 5, b.mix({ coarse_dirt: 2, dirt: 1, grass_block: 2 }))
  b.set(38, 1, 4, 'hay_block'); b.set(38, 1, 3, 'hay_block'); b.set(38, 2, 4, 'hay_block')   // (the back corner: out of the pen shot's line)
  b.fill(31, 0, 4, 33, 0, 4, 'water'); b.set(30, 1, 4, 'composter')
  // the road and its lamp posts
  b.fill(46, 0, -1, 72, 0, 1, b.mix({ dirt_path: 5, coarse_dirt: 1 }))
  for (const x of [48, 58, 68]) { b.fill(x, 1, -3, x, 3, -3, 'spruce_fence'); b.set(x, 4, -3, 'lantern') }
  // a market stall beside the queue (what they queue for)
  b.fill(56, 1, 3, 60, 1, 3, 'barrel[facing=up]'); b.fill(56, 2, 3, 56, 3, 3, 'spruce_fence'); b.fill(60, 2, 3, 60, 3, 3, 'spruce_fence')
  b.fill(56, 4, 2, 60, 4, 4, 'red_wool'); b.set(58, 2, 3, 'melon'); b.set(57, 2, 3, 'pumpkin')
  // the house
  b.fill(74, 0, -5, 84, 0, 5, 'cobblestone')
  b.fill(74, 1, -5, 84, 4, 5, 'oak_planks', 'hollow')
  b.fill(74, 1, -5, 84, 1, 5, 'cobblestone', 'walls')
  for (const [x, z] of [[74, -5], [74, 5], [84, -5], [84, 5]]) b.fill(x, 1, z, x, 4, z, 'oak_log[axis=y]')
  b.fill(75, 1, -4, 83, 4, 4, 'air')
  b.fill(75, 0, -4, 83, 0, 4, b.mix({ oak_planks: 4, spruce_planks: 1 }))
  b.roof(74, -5, 84, 5, 5, { along: 'x', stair: 'spruce_stairs', gable: 'oak_planks' })
  b.fill(75, 5, -4, 83, 5, 4, 'oak_planks')
  for (const x of [77, 81]) { b.fill(x, 2, -5, x + 1, 3, -5, 'glass_pane'); b.fill(x, 2, 5, x + 1, 3, 5, 'glass_pane') }
  b.fill(84, 2, -3, 84, 3, -2, 'glass_pane'); b.fill(84, 2, 2, 84, 3, 3, 'glass_pane')
  b.door(74, 1, 0, 'w', 'oak')
  b.set(73, 0, 0, 'cobblestone_slab[type=top]'); b.set(73, 0, -1, 'dirt_path'); b.set(73, 0, 1, 'dirt_path')
  // inside: a table and chairs in the middle, a work corner, a bed, shelves, torches
  b.table(79, 1, 0, { leg: 'oak_fence', top: 'oak_pressure_plate' }); b.chair(78, 1, 0, 'e', 'oak_stairs'); b.chair(80, 1, 0, 'w', 'oak_stairs')
  b.set(75, 1, -4, 'crafting_table'); b.set(76, 1, -4, 'furnace[facing=south]'); b.set(77, 1, -4, 'chest[facing=south]')
  b.bed(82, 1, 3, 'w', 'red'); b.set(83, 1, 1, 'barrel[facing=up]')
  b.fill(83, 1, -4, 83, 3, -2, 'bookshelf'); b.set(82, 1, -1, 'potted_red_tulip')
  b.set(75, 3, -3, 'wall_torch[facing=east]'); b.set(75, 3, 3, 'wall_torch[facing=east]'); b.set(83, 3, 0, 'wall_torch[facing=west]')
  b.set(79, 1, 2, 'white_carpet'); b.set(79, 1, -2, 'white_carpet')
  // trees on the flanks (depth), a few bushes
  for (const [x, z, h] of [[6, -10, 5], [21, 10, 6], [44, -11, 5], [52, 11, 5], [70, -10, 6], [90, 10, 5], [96, -11, 6], [-3, 9, 5]]) tree(b, x, z, h)
  for (const [x, z] of [[11, 7], [25, -9], [64, 9], [88, -6], [102, 6]]) { b.set(x, 1, z, 'oak_leaves[persistent=true]'); b.set(x + 1, 1, z, 'oak_leaves[persistent=true]') }
  b.anchor('start', 2, 1, 0, 'w')
}

// the underground: the layered dive column and the Nether cave (stamped without fitting, in the same frame)
function cave (b) {
  // the column the dive bores through (5x5: the bore is 3x3, so its walls show the layers)
  const C0 = 96, C1 = 100
  b.fill(C0, -3, -2, C1, -1, 2, 'dirt')
  b.fill(C0, -15, -2, C1, -4, 2, b.mix({ stone: 12, andesite: 2, coal_ore: 1, iron_ore: 1, gravel: 1 }))
  b.fill(C0, -23, -2, C1, -16, 2, b.mix({ deepslate: 10, cobbled_deepslate: 1, deepslate_diamond_ore: 1, deepslate_redstone_ore: 1 }))
  b.fill(C0, -25, -2, C1, -24, 2, 'bedrock')
  // the cave: a netherrack shell, hollowed
  const X0 = 78, X1 = 124, Z0 = -18, Z1 = 18
  b.fill(X0, -50, Z0, X1, -26, Z1, b.mix({ netherrack: 30, nether_quartz_ore: 1, nether_gold_ore: 1, blackstone: 1 }))
  b.fill(X0 + 2, -46, Z0 + 2, X1 - 2, -31, Z1 - 2, 'air')
  // a rough ceiling and walls (bumps hanging down, ledges)
  for (let x = X0 + 2; x <= X1 - 2; x++) for (let z = Z0 + 2; z <= Z1 - 2; z++) {
    const edge = Math.min(x - X0 - 2, X1 - 2 - x, z - Z0 - 2, Z1 - 2 - z)
    if (Math.abs(x - 98) <= 2 && Math.abs(z) <= 2) continue   // the dive hole stays clean
    const r = b.rand()
    if (r < 0.18) b.set(x, -31, z, 'netherrack')
    if (r < 0.06) b.set(x, -32, z, 'netherrack')
    if (edge <= 1 && r < 0.5) b.fill(x, -46, z, x, -46 + Math.floor(b.rand() * 6), z, 'netherrack')
  }
  // the floor: bumps, soul sand, magma, crimson patches
  for (let x = X0 + 2; x <= X1 - 2; x++) for (let z = Z0 + 2; z <= Z1 - 2; z++) {
    const r = b.rand()
    const lane = z >= -2 && z <= 6 && x >= 94 && x <= 119
    if (!lane && r < 0.07) b.set(x, -46, z, 'netherrack')
    else if (r < 0.10) b.set(x, -47, z, 'soul_sand')
    else if (r < 0.12) b.set(x, -47, z, 'magma_block')
  }
  b.fill(100, -47, -12, 108, -47, -6, 'crimson_nylium')
  for (const [x, z, p] of [[101, -10, 'crimson_fungus'], [103, -8, 'crimson_roots'], [105, -11, 'crimson_fungus'], [106, -7, 'crimson_roots'], [102, -7, 'crimson_roots']]) b.set(x, -46, z, p)
  // the lava lake (south), lit
  b.fill(82, -48, 6, 120, -48, 16, 'netherrack')
  b.fill(83, -47, 7, 119, -47, 15, 'lava')
  // glowstone clusters and shroomlights on the ceiling
  for (const [x, z] of [[86, -8], [92, 8], [104, -4], [110, 10], [118, -10], [96, -12], [112, -14], [88, 12]]) {
    b.fill(x, -32, z, x + 1, -31, z + 1, 'glowstone'); b.set(x, -33, z, 'glowstone')
  }
  for (const [x, z] of [[108, 4], [90, -2], [116, 2]]) b.set(x, -31, z, 'shroomlight')
  // 56e's portal (x 114, along z): obsidian frame 5 wide, 6 tall; the portal 3 x 4
  b.fill(114, -47, -2, 114, -41, 2, 'obsidian')
  // (the portal itself is lit in setup, once the frame stands: portal blocks in the template broke on placement)
  b.set(114, -46, -2, 'crying_obsidian'); b.set(114, -43, 2, 'crying_obsidian')
  // light round the portal and over 56e (the far end read too dark)
  for (const [x, z] of [[110, -5], [110, 5], [116, -6], [116, 6]]) b.fill(x, -46, z, x, -45, z, 'glowstone')
  for (const [x, z] of [[108, -2], [112, 2], [104, 1]]) b.fill(x, -32, z, x + 1, -31, z + 1, 'glowstone')
  b.fill(110, -47, -3, 119, -47, 6, 'netherrack')
  b.fill(115, -46, -3, 119, -41, 6, 'air')
}

const COURSE = register('mobpov_course', course)
const CAVE = register('mobpov_cave', cave)

module.exports = {
  name: 'mobpov_baby_zombie',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  time: 6000,
  botTimeout: 300,
  hideHand: true,
  hud: false,
  outline: false,          // no block-selection box: a mob's eyes, not a player's crosshair
  self: { model: 'zombie', eye: 0.93, extra: { baby: true } },
  cast: { '56e': '@56e' },
  look: { mood: 'bright_stunt', motionBlur: 0.5 },
  shots: {
    pov: { pov: true },
    // the hook: low in the grass beside the start, on the baby zombie; it bolts past the lens
    intro: { at: [6.2, 1.35, 1.9], look: [2.4, 1.15, 0.5], fov: 55, push: 0, drift: 0.4 },
    // the pen from the side, high: a tiny zombie through a pen of pigs
    pen: { at: [34.5, 3.4, -8.8], look: [34.5, 0.6, 0.5], fov: 70, push: 0, drift: 0.3 }
  },
  edit: mobpovEdit({
    caption: CAPTION,
    red: 'baby zombie',
    whooshes: 3,
    subs: [['found', 'found you.', 0.65, 0]],   // gone before the rush-in: up to the punch it sat on 56e (review r3)
    extra: { subsY: 0.12, sfx: [['impact', 'smash', { nth: 0, gain: 0.5 }]] }   // the sub up in the cave's ceiling: at 0.42 it sat on 56e (review)
  }),

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    await ctx.cmd('/gamerule random_tick_speed 0')
    await ctx.cmd('/gamerule block_drops false', { mayFail: true })
    await ctx.cmd('/gamerule mob_drops false', { mayFail: true })
    await ctx.cmd('/gamerule fall_damage false', { mayFail: true })
    // the portal is scenery: 56e flies through it and lands behind (a mannequin taken to the real Nether mid-arc
    // froze in the portal: the client kept its last spot)
    await ctx.cmd('/gamerule allow_entering_nether_using_portals false', { mayFail: true })
    await ctx.cmd('/difficulty easy')
    await ctx.cmd('/kill @e[type=!player]')
    const site = await sets.findSite(ctx, { w: 114, d: 30, maxRange: 6, maxTrees: 0.4, reach: 160 })
    const home = await sets.place(ctx, COURSE, { ...(site ? { x: site.x, z: site.z } : {}), facing: 'south', banks: true })
    const o = home.at(0, 0, 0)
    const O = this.O = { x: Math.floor(o.x), y: o.y, z: Math.floor(o.z) }
    // the cave, in the same frame, not fitted
    const vox = sets.build(CAVE)
    const { lo, hi } = vox.bounds()
    const tid = sets.install(CAVE, vox)
    await sets.forceload(ctx, O.x + lo[0] - 4, O.z + lo[2] - 4, O.x + hi[0] + 4, O.z + hi[2] + 4)
    await ctx.cmd(`/place template ${tid} ${O.x + lo[0]} ${O.y + lo[1]} ${O.z + lo[2]}`)
    await ctx.cmd(`/fill ${O.x + 114} ${O.y - 46} ${O.z - 1} ${O.x + 114} ${O.y - 42} ${O.z + 1} nether_portal[axis=z]`)
    ctx.log(`mobpov: cave (${vox.count()} blocks) at ${O.x + lo[0]} ${O.y + lo[1]} ${O.z + lo[2]}`)
    const A = (x, y, z) => `${(O.x + x).toFixed(2)} ${(O.y + y).toFixed(2)} ${(O.z + z).toFixed(2)}`
    // the cast: held still (NoAI) until the zombie reaches them
    const mob = (type, x, z, nbt = '', y = 1) => ctx.cmd(`/summon minecraft:${type} ${A(x, y, z)} {NoAI:1b,PersistenceRequired:1b,Rotation:[${90 + Math.round((ctx.bot.entity.id * 37 + x * 13 + z * 7) % 60) - 30}f,0f]${nbt}}`)
    for (const [x, z] of [[31.5, 0.6], [34.5, 0.2], [37.5, 0.9], [31.5, -3.2], [36.5, 3.4], [38.5, -3.8]]) await mob('pig', x, z)
    await mob('villager', 54.5, 0.5, ',VillagerData:{profession:"minecraft:farmer",level:2,type:"minecraft:plains"}')
    await mob('cow', 58.0, 0.4)
    await mob('chicken', 61.0, 0.8)
    await mob('sheep', 64.0, 0.4, ',Color:0b')
    await mob('iron_golem', 67.0, 0.5)
    await mob('villager', 70.5, 0.5, ',VillagerData:{profession:"minecraft:librarian",level:2,type:"minecraft:plains"}')
    await mob('zombified_piglin', 92.5, -9.5, ',Rotation:[200f,0f]', -46)
    await mob('zombified_piglin', 106.5, -13.5, ',Rotation:[150f,0f]', -46)
    // 56e by his portal, facing the way the zombie will come from
    await ctx.cmd(`/summon minecraft:mannequin ${A(GUY.x, -46, GUY.z)} {CustomName:"56e",Rotation:[104f,0f],immovable:0b,Invulnerable:0b}`)
    await ctx.cmd('/kill @e[type=item]')
    await ctx.hotbar([])
    const s = home.at(2, 1, 0)
    await ctx.tpCheck(s.x, s.y, s.z, -90, 0)
    await bot.waitForTicks(20)
    return { x: O.x, y: O.y, z: O.z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const O = this.O
    const at = (x, y, z) => new Vec3(O.x + x, O.y + y, O.z + z)
    const R = rusher(ctx)
    await R.start(at(52, 26, 0.5))
    bot.setControlState('sprint', true)            // the sprint FOV kick (render.js reads the flag while moving)
    ctx.mark('f1_on'); ctx._f1 = true
    // 1. the hook: it sees you, it squeaks, it's gone
    R.cut(at(2.5, 1, 0.5), EAST, 0)
    R.shot('intro')
    await R.hold(2)                                // (the edit opens 1 frame before 'go': keep the parked view out of it)
    ctx.mark('go')
    ctx.sound('entity.zombie.ambient', 1, 1.75, { key: true })
    await R.hold(3)
    await R.dash(at(5.0, 1, 0.5), { speed: 1.25, accel: 4, bore: null })
    // 2. its eyes: straight through the wall
    R.shot('pov')
    await R.dash(at(25.5, 1, 0.5), { speed: 1.25, accel: 1, bore: { w: 3, h: 3, lead: 2.2 } })
    // 3. from the side: through the pig pen
    ctx.mark('leg'); R.cut(at(23.5, 1, 0.5), EAST, 0); R.shot('pen')
    await R.dash(at(47.5, 1, 0.5), { speed: 1.25, accel: 1, bore: { w: 3, h: 2, lead: 1.6 } })
    // 4. its eyes again: the queue, then the house (in by the door, out by the back wall)
    ctx.mark('leg'); R.cut(at(45.5, 1, 0.5), EAST, 0); R.shot('pov')
    await R.dash(at(93.5, 1, 0.5), { speed: 1.25, accel: 1, bore: { w: 3, h: 3, lead: 2.2 } })
    // 5. down: through dirt, stone, deepslate and bedrock, into the cave
    ctx.mark('leg'); R.cut(at(98.5, 4.6, 0.5), EAST, -62 * DEG)
    await R.hold(3)
    ctx.sound('entity.zombie.ambient', 1, 1.9)
    // once through the cave's ceiling (y -31) it starts lifting its eyes off the floor: the pitch rate builds 1.5 deg a
    // tick up to 6 (120 deg/s), toward -30
    let lift = 0
    const lookUp = (k, p) => { if (p.y < O.y - 31) { lift = Math.min(6, lift + 1.5); R.pitch = Math.min(-30 * DEG, R.pitch + lift * DEG) } }
    await R.dash(at(98.5, -46, 0.5), { speed: 1.4, accel: 3, decel: 4, bore: { w: 3, lead: 2.0 }, knock: false, steps: 0, faceIt: false, onTick: lookUp })
    ctx.mark('landed')
    ctx.sound('entity.generic.big_fall', 1, 1.3)
    ctx.sound('block.netherrack.break', 0.8, 0.8)
    ctx.particles('block', at(98, -47, 0), { block: 'netherrack' })
    // 6. it looks up: 56e, by his portal (a little to the right: the look-up turns onto him, eased)
    const land = at(98.5, -46, 0.5), guy = at(GUY.x, -46, GUY.z), toGuy = guy.minus(land)
    const yawGuy = Math.atan2(-toGuy.x, -toGuy.z)
    await R.turn(yawGuy, -4 * DEG, 10)
    ctx.mark('found')
    ctx.sound('entity.zombie.ambient', 1, 1.8, { key: true })
    await R.hold(5)
    await R.dash(land.plus(toGuy.scaled((toGuy.norm() - 1.3) / toGuy.norm())), { speed: 1.25, accel: 2, decel: 3, bore: null, knock: false })
    // 7. the punch: 56e goes flying past his own portal
    const me = Object.values(bot.entities).find(e => e.name === 'mannequin')
    ctx.mark('payoff')
    ctx.sound('entity.player.attack.strong', 1, 0.9, { key: true })
    ctx.sound('entity.player.attack.knockback', 1, 1)
    // flung straight back past the right side of his portal frame, landing behind it 0.7 s later (0.3 s before
    // the end: nothing still moving when it cuts). Through the portal itself the server took him to the real Nether
    // mid-arc and the client froze him there. Smoothstep, 14 ticks: under 0.72 blocks a tick, ratio < 2 per sync, no jump from rest
    const p0 = me ? me.position.clone() : guy
    if (me) R.fling(me, (u) => { const e = u * u * (3 - 2 * u); return p0.offset(6.5 * e, 1.8 * Math.sin(Math.PI * e), 0) }, 14)
    else ctx.log('mobpov: no mannequin to hit')
    await R.hold(30)
    return true
  }
}
