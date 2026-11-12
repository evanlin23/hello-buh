// hack #1, "POV: you realized banners have no hitbox" (family hack, lib/hack.js; owner r:rc15847).
// The trick (vanilla 1.21, true in survival): a standing banner has no collision box (BannerBlock is noCollission),
// so a banner in a 1x2 opening reads as wall decor and you walk straight through it. In a cosy den the player walks
// into the middle banner of a bookshelf wall (~0.9 s) and comes out in a hidden stash; every secret room hides the
// next banner door, deeper each time: the stash (a chest of diamonds) -> a stair down -> an underground farm -> a
// hidden library whose wall has five banners (only one is a door) -> a mine tunnel (a diamond ore on the way) -> the
// vault: a cathedral-size treasure hall seen from a balcony on a cliff, then a camera pull-back off the player's face to
// the hall's far end (the no-op audit's fix, r:r4607fa: the scale is the payoff). Everything on screen is walking, opening a chest and mining; commands only build the set.
// Local frame (lib/hack.js): floor y 0, the den x 1..11 z 1..9, the trick wall z 0, mineflayer yaw 0 = north (-z).
const { makeStunt, bannerDoor } = require('../lib/hack')
const M = require('../lib/movie')

const DS = 'deepslate_bricks'
const ROCK = (b) => b.mix({ deepslate_bricks: 5, cracked_deepslate_bricks: 1, deepslate_tiles: 2, polished_deepslate: 1 })

// the den's trick wall (z 0): bookshelves with three banner niches; the middle one is the door (A) into the stash
function wall (b) {
  b.fill(1, 1, 0, 11, 4, 0, 'bookshelf')
  for (const x of [1, 11]) b.fill(x, 1, 0, x, 4, 0, 'stripped_spruce_log[axis=y]')
  b.fill(1, 4, 0, 11, 4, 0, 'spruce_log[axis=x]')
  bannerDoor(b, 3, 1, 0, 'red', 0); bannerDoor(b, 6, 1, 0, 'red', 0); bannerDoor(b, 9, 1, 0, 'red', 0)
  b.hang(4, 4, 1, 0); b.hang(8, 4, 1, 0)                 // lanterns from the ceiling over the shelves
  // the stash behind it: x 4..8, z -5..-1, y 1..3 (the decoys' backs, x 3 and 9, stay solid)
  b.fill(4, 1, -5, 8, 3, -1, 'air')
  b.fill(4, 0, -5, 8, 0, -1, 'spruce_planks')
  b.set(6, 1, -5, 'chest[facing=south]'); b.set(5, 1, -5, 'barrel[facing=up]'); b.set(5, 2, -5, 'barrel[facing=up]')
  b.set(7, 1, -5, 'barrel[facing=south]'); b.set(8, 1, -5, 'chest[facing=west]'); b.set(4, 1, -5, 'barrel[facing=up]')
  b.set(8, 3, -5, 'cobweb'); b.set(4, 3, -1, 'cobweb'); b.hang(6, 3, -3, 0)
  b.set(4, 1, -2, 'gold_block'); b.set(4, 1, -3, 'iron_block'); b.set(4, 2, -3, 'candle[candles=4,lit=true]')
  // door B on the stash's east wall (x 9), facing west, and the landing behind it (x 10..11, z -3)
  bannerDoor(b, 9, 1, -3, 'blue', 4)
  b.fill(10, 1, -3, 11, 3, -3, 'air'); b.fill(10, 0, -3, 11, 0, -3, 'polished_deepslate')
}

// everything under the ground, in the den's frame: the stair, the farm, the library, the tunnel, the vault
function under (b) {
  const rock = ROCK(b)
  // the stair down from the landing: step k at x 11 + k, y 1 - k (high side west), 3 of headroom, 3 wide (z -4..-2;
  // 1 wide, the player's shoulders caught the side walls on every step: rec_check "stops dead", a stutter)
  for (let k = 1; k <= 9; k++) {
    const x = 11 + k, y = 1 - k
    b.fill(x, y - 3, -5, x, 5 - k, -1, rock)                      // the shell round this slice
    b.fill(x, y, -4, x, y, -2, 'deepslate_brick_stairs[facing=west]')
    b.fill(x, y + 1, -4, x, 4 - k, -2, 'air')
  }
  for (const k of [2, 4, 6, 8]) for (const z of [-5, -1]) b.set(11 + k, 3 - k, z, 'lantern')   // lanterns in niches in the stair's walls (a hanging one is in the head's way; shroomlights read as lava)
  // the bottom landing x 21..22 (floor -9, feet -8)
  b.fill(21, -10, -4, 22, -5, -2, rock); b.fill(21, -8, -3, 22, -6, -3, 'air'); b.fill(21, -9, -3, 22, -9, -3, 'polished_deepslate')
  b.set(22, -7, -4, 'lantern')

  // ---- the farm: x 24..32, z -8..2, floor -9, inside -8..-4, ceiling -3; door C in its west wall (x 23)
  b.fill(23, -10, -9, 33, -3, 3, rock, 'hollow')
  b.fill(24, -9, -8, 32, -9, 2, 'grass_block')
  b.fill(24, -3, -8, 32, -3, 2, 'moss_block')
  for (let x = 25; x <= 31; x += 3) for (const z of [-6, -1]) b.set(x, -3, z, 'ochre_froglight')   // lit like day
  b.fill(24, -9, -3, 32, -9, -3, b.mix({ coarse_dirt: 2, rooted_dirt: 1, mud_bricks: 0 }))   // the walk (full blocks: a dirt path's 1/16 lip under a 2-high banner door stopped the walk)
  b.fill(24, -8, -4, 32, -8, -4, 'oak_fence'); b.fill(24, -8, -2, 32, -8, -2, 'oak_fence')
  // north: a pasture (cows and sheep, live); south: crops on farmland with a water channel
  b.fill(24, -9, -8, 32, -9, -5, b.mix({ grass_block: 6, moss_block: 1, coarse_dirt: 1 }))
  b.set(26, -8, -7, 'hay_block'); b.set(31, -8, -8, 'composter'); b.set(25, -8, -8, 'water_cauldron[level=3]')
  b.fill(24, -9, -1, 32, -9, 2, 'farmland[moisture=7]'); b.fill(24, -9, 0, 32, -9, 0, 'water')
  for (let x = 24; x <= 32; x++) { b.set(x, -8, -1, 'wheat[age=7]'); b.set(x, -8, 1, x % 3 ? 'carrots[age=7]' : 'potatoes[age=7]'); b.set(x, -8, 2, 'beetroots[age=3]') }
  bannerDoor(b, 23, -8, -3, 'lime', 4)

  // ---- the hidden library: x 34..42, z -8..2; door D in its west wall (x 33)
  b.fill(33, -10, -9, 43, -3, 3, rock, 'hollow')
  b.fill(34, -9, -8, 42, -9, 2, b.mix({ dark_oak_planks: 4, spruce_planks: 1 }))
  b.fill(34, -4, -8, 42, -4, 2, 'dark_oak_planks'); b.fill(34, -3, -8, 42, -3, 2, rock)
  for (const z of [-6, 0]) b.fill(34, -4, z, 42, -4, z, 'stripped_dark_oak_log[axis=x]')
  b.fill(34, -9, -3, 42, -9, -3, 'red_wool')                         // a red runner
  b.fill(35, -8, -8, 41, -7, -8, 'bookshelf'); b.fill(34, -8, -7, 34, -7, -5, 'bookshelf')
  b.set(38, -8, -6, 'enchanting_table'); b.set(36, -8, -5, 'candle[candles=3,lit=true]')
  b.set(36, -8, 1, 'brewing_stand'); b.set(37, -8, 2, 'cauldron'); b.set(38, -8, 2, 'chest[facing=north]')
  b.set(39, -8, 2, 'lectern[facing=north,has_book=true]'); b.set(35, -8, 1, 'anvil[facing=east]')
  b.set(35, -8, 2, 'bookshelf'); b.set(35, -7, 2, 'bookshelf')
  b.hang(36, -5, -3, 0); b.hang(40, -5, -3, 0)
  bannerDoor(b, 33, -8, -3, 'cyan', 4)
  // its east wall (x 43): five banners, one is a door (E, at z 1); the others are backed by rock
  b.fill(43, -8, -8, 43, -5, 2, 'bookshelf'); b.fill(43, -5, -8, 43, -5, 2, 'stripped_dark_oak_log[axis=z]')
  const FIVE = [[-7, 'purple'], [-5, 'orange'], [-3, 'black'], [-1, 'magenta'], [1, 'yellow']]
  for (const [z, c] of FIVE) bannerDoor(b, 43, -8, z, c, 4, z === 1 ? {} : { back: { at: [44, z], block: DS } })
  b.set(42, -8, -6, 'lantern'); b.set(34, -8, 0, 'lantern')

  // ---- the mine tunnel: x 44..53, z 0..2 (walk z 1), floor -9, inside -8..-6; door F in the vault's wall (x 54)
  b.fill(44, -10, -1, 53, -5, 3, rock, 'hollow')
  b.fill(44, -10, 4, 53, -5, 4, rock)                                 // rock behind the ores (a mined ore opened onto daylight)
  b.fill(44, -8, 0, 53, -6, 2, 'air')                                  // (the shell's ends are the library's and the vault's walls)
  b.fill(44, -9, 0, 53, -9, 2, b.mix({ deepslate: 3, cobbled_deepslate: 2, gravel: 1 }))
  const ORE = { 46: [-1, -7, 'deepslate_iron_ore'], 47: [3, -8, 'deepslate_coal_ore'], 49: [-1, -6, 'deepslate_gold_ore'], 51: [3, -6, 'deepslate_redstone_ore'], 52: [-1, -8, 'deepslate_lapis_ore'] }
  for (const [x, [z, y, o]] of Object.entries(ORE)) b.set(+x, y, z, o)
  b.set(48, -7, 3, 'deepslate_diamond_ore'); b.set(48, -6, 3, 'deepslate_diamond_ore')     // the one he mines (y -7)
  b.fill(44, -8, 0, 53, -8, 0, 'rail[shape=east_west]')
  for (const x of [45, 50]) { b.fill(x, -8, -1, x, -6, -1, 'stripped_spruce_log[axis=y]'); b.fill(x, -8, 3, x, -6, 3, 'stripped_spruce_log[axis=y]'); b.fill(x, -5, -1, x, -5, 3, 'stripped_spruce_log[axis=z]') }
  b.set(45, -6, 2, 'lantern[hanging=true]'); b.set(50, -6, 2, 'lantern[hanging=true]'); b.set(51, -8, 2, 'lantern')
  b.set(53, -8, 2, 'cobweb'); b.set(44, -6, 0, 'cobweb')

  // ---- the vault (the payoff; no-op audit r:r4607fa: "a jaw-drop vault or a pull-back reveal"): a treasure hall the
  // size of a cathedral, x 55..115, z -24..26, floor -40, inside -39..-3, ceiling -2; the balcony x 55..57, z -1..3 at
  // -9 on top of a 31-block deepslate cliff. Lit for a far camera: sea lanterns in the floor, glowstone in the heaps,
  // shroomlights in every wall and the ceiling (light 15 dies out in 15 blocks: every surface needs its own)
  const VX1 = 115, VZ0 = -24, VZ1 = 26, VF = -40, VC = -2
  b.fill(54, VF - 1, VZ0 - 1, VX1 + 1, VC + 1, VZ1 + 1, rock, 'hollow')
  b.fill(55, VF, VZ0, VX1, VF, VZ1, b.mix({ gold_block: 7, raw_gold_block: 1, diamond_block: 1 }))
  for (let x = 58; x <= VX1 - 2; x += 6) for (let z = VZ0 + 2; z <= VZ1 - 2; z += 6) b.set(x, VF, z, 'sea_lantern')
  b.fill(55, VC, VZ0, VX1, VC, VZ1, 'polished_blackstone_bricks')
  for (let x = 57; x <= VX1 - 1; x += 4) for (let z = VZ0 + 1; z <= VZ1 - 1; z += 4) b.set(x, VC, z, 'shroomlight')
  for (let y = VF + 5; y <= VC - 3; y += 7) {
    for (let z = VZ0 + 1; z <= VZ1 - 1; z += 5) { b.set(55, y, z, 'shroomlight'); b.set(VX1, y, z, 'shroomlight') }
    for (let x = 57; x <= VX1 - 1; x += 5) { b.set(x, y, VZ0, 'shroomlight'); b.set(x, y, VZ1, 'shroomlight') }
  }
  // gold bands round the walls (the hall's scale reads off them from the far end)
  for (const y of [VF + 12, VF + 26]) { b.fill(55, y, VZ0, 55, y, VZ1, 'gold_block'); b.fill(VX1, y, VZ0, VX1, y, VZ1, 'gold_block'); b.fill(55, y, VZ0, VX1, y, VZ0, 'gold_block'); b.fill(55, y, VZ1, VX1, y, VZ1, 'gold_block') }
  // giant quartz columns, floor to ceiling
  for (const x of [72, 90, 108]) for (const z of [-15, 17]) { b.fill(x - 1, VF + 1, z - 1, x + 1, VC - 1, z + 1, 'quartz_pillar[axis=y]'); b.fill(x - 1, VF + 1, z - 1, x + 1, VF + 1, z + 1, 'chiseled_quartz_block'); b.fill(x - 1, VC - 1, z - 1, x + 1, VC - 1, z + 1, 'chiseled_quartz_block') }
  // the balcony: a deepslate cliff from the floor with a railed top, the banner door behind it
  b.fill(55, VF + 1, -1, 57, -9, 3, DS); b.fill(55, -9, -1, 57, -9, 3, 'polished_deepslate')
  b.fill(55, -8, -1, 56, -8, -1, 'dark_oak_fence'); b.fill(55, -8, 3, 56, -8, 3, 'dark_oak_fence')
  b.set(56, -7, -1, 'lantern'); b.set(56, -7, 3, 'lantern')
  for (const y of [-30, -20]) { b.set(57, y, 0, 'shroomlight'); b.set(57, y, 2, 'shroomlight') }   // the cliff's face lit
  bannerDoor(b, 54, -8, 1, 'light_blue', 4)
  // mountains of treasure: stepped heaps (glowstone in the mix lights their slopes)
  const heap = (x, z, r, blk) => { for (let y = 0; y <= r; y++) b.fill(x - r + y, VF + 1 + y, z - r + y, x + r - y, VF + 1 + y, z + r - y, blk) }
  const GOLD = b.mix({ gold_block: 8, raw_gold_block: 2, glowstone: 1 })
  const GEMS = b.mix({ diamond_block: 6, emerald_block: 2, gold_block: 2, glowstone: 1 })
  const EMER = b.mix({ emerald_block: 6, gold_block: 2, glowstone: 1 })
  heap(86, 1, 10, GOLD)                                                     // the great pile in the middle ...
  b.fill(85, VF + 12, 0, 87, VF + 12, 2, 'diamond_block'); b.set(86, VF + 13, 1, 'beacon')   // ... crowned with a beacon
  for (const [x, z, r, m] of [[68, -12, 6, GEMS], [68, 14, 6, EMER], [100, -10, 7, GEMS], [102, 13, 7, GOLD], [76, 2, 4, GEMS],
    [95, 2, 4, EMER], [110, 0, 5, GEMS], [79, -20, 4, GOLD], [79, 22, 4, GOLD], [95, -21, 3, EMER], [95, 23, 3, GEMS], [62, 0, 3, GOLD]]) heap(x, z, r, m)
  b.set(66, VF + 1, 5, 'netherite_block'); b.set(70, VF + 1, -4, 'ancient_debris'); b.set(92, VF + 1, -6, 'netherite_block')
  for (let x = 60; x <= VX1 - 2; x += 3) { b.set(x, VF + 1, VZ0 + 1, 'chest[facing=south]'); b.set(x, VF + 1, VZ1 - 1, 'chest[facing=north]') }
  // a lit nether portal on the far wall
  b.fill(VX1, VF + 1, -1, VX1, VF + 7, 3, 'obsidian'); b.fill(VX1, VF + 2, 0, VX1, VF + 6, 2, 'nether_portal[axis=z]')
}

const SUBS = [
  ['reveal', 'secret room 1', 1.6, 0],
  ['lookback', 'banners have NO hitbox', 1.6, 0],
  ['reveal', 'secret room 2', 1.6, 1],
  ['deeper', 'how deep does this go?', 1.8, 0],
  ['reveal', 'secret room 3', 1.6, 2],
  ['reveal', 'secret room 4', 1.4, 3],
  ['which', 'but which one is real?', 1.8, 0],
  ['reveal', 'secret room 5', 1.6, 4],
  ['nope', 'nope', 0.9, 0],
  ['reveal', 'secret room 6', 1.2, 5]   // (gone before the pull-back: at 1.6 s it sat on the player's face)
]

module.exports = makeStunt({
  name: 'hack_banner_door',
  caption: 'POV: you realized banners have no hitbox',
  red: 'hitbox',
  reveals: 6,
  subs: SUBS,
  // (pace: a hit by 0.5 s and in the first 1.5 s over the NCS bed: a light impact on frame 0 under the format's pop and
  // on the first banner; a pop as he commits to the middle banner, inside the 2.2 s library sweep)
  edit: { sfx: [['impact', 'go', { gain: 0.7 }], ['impact', 'reveal', { nth: 0, gain: 0.8 }], ['pop', 'deeper', { gain: 0.45 }],
    ['pop', 'nope_try', { gain: 0.5 }], ['whoosh', 'payoff', { gain: 0.6 }]],
    // the pull-back plays 1.0 s, tilting down onto the treasure as it goes; the end lands 0.85 s in, the camera easing out (the payoff is
    // the move itself: the scale reads as it pulls away; pace: 0.5-0.8 s after the result, WARN over 0.9)
    endAfter: 'payoff:0.85',
    // r:r188b46 (no-op audit: trim rooms 2-5): the straight walks sped up mark to mark, no turn inside a span (whip
    // cap); the farm's pasture look, the library's enchanting-table look and the second diamond are gone
    speed: [['stair_a', 'stair_b', 2.2], ['farm_a', 'farm_b', 1.8], ['lib_a', 'lib_b', 1.6], ['side_a', 'side_b', 2], ['diamond:0.3', 'mine_b', 'cut']] },
  // the payoff camera (local frame - the start (6.5, 1, 5.3)): from 2.5 blocks in front of the player's face on the
  // balcony (57.3, -6.4, 1.5) back and up to the hall's far end (105, -4.2, 1.5), tilting down onto the treasure below the cliff
  shots: {
    pull: { path: [[0, 53.3, -7.4, -3.8], [1.0, 98.5, -5.2, -3.8]], lookPath: [[0, 50.8, -7.5, -3.8], [1.0, 55.5, -29, -3.8]], fov: 72, dof: false, drift: 0, subject: ['self'] }
  },
  wall,
  pieces: { under },
  hotbar: ['diamond_pickaxe', ['white_banner', 16], ['red_banner', 16], ['lantern', 32], ['bookshelf', 64], ['torch', 64], ['cookie', 64], 'cake', ['oak_sign', 16]],
  select: 0,
  pitch: 6,

  async dress (ctx, H) {
    // the stash chest: diamonds; the vault's chests stay closed
    for (const [slot, item, n] of [[10, 'diamond', 64], [11, 'diamond', 64], [12, 'diamond', 41], [13, 'emerald', 32], [14, 'gold_ingot', 50], [3, 'golden_apple', 3], [22, 'diamond_sword', 1]]) {
      await H.cmd(`/item replace block ${H.A(6, 1, -5)} container.${slot} with ${item} ${n}`)
    }
    // the farm's animals (live, in their pasture behind the fence)
    for (const [t, x, z] of [['cow', 26.5, -6.5], ['sheep', 29.5, -7.0], ['cow', 31.0, -5.5], ['chicken', 25.5, -5.0]]) {
      await H.cmd(`/summon ${t} ${H.O.x + x} ${H.O.y - 8} ${H.O.z + z} {PersistenceRequired:1b,NoAI:1b,Rotation:[${t === 'cow' ? 90 : 200}f,0f]}`)
    }
  },

  async perform (ctx, H) {
    const { bot } = ctx
    const K = H.K
    const inBlock = (x, z) => { const p = bot.entity.position; return Math.floor(p.x) === H.O.x + x && Math.floor(p.z) === H.O.z + z }
    // walk, marking the reveal the first tick the player is inside the banner's block
    const through = async (pts, bx, bz, o = {}) => {
      let done = false
      await H.walk(pts, { ...o, during: async (k) => { if (!done && inBlock(bx, bz)) { done = true; o.payoff ? H.payoff() : H.reveal() } if (o.during) await o.during(k) } })
      if (!done) throw new Error(`hack_banner_door: never passed the banner at ${bx} ${bz}`)
    }
    // one-shot marks at an x along a walk (the edit's speed spans run mark to mark: r:r188b46, trim rooms 2-5)
    const atX = (marks) => async () => { const x = bot.entity.position.x - H.O.x; for (const m of marks) if (!m.done && x >= m.x) { m.done = true; ctx.mark(m.ev) } }
    ctx.mark('go')
    // 1. the den: straight into the middle banner -> the stash
    await through([[6.5, 1, -2.4]], 6, 0)
    ctx.mark('stash')
    await K.open(H.at(6, 1, -5))
    ctx.mark('open_chest')
    await bot.waitForTicks(16)
    K.close()
    // the how: a look back at the door from inside (the banner's back, the den's light round it)
    await H.look(6.5, 1.6, 0.5, { max: 30 })
    ctx.mark('lookback')
    await H.hold(8)
    // 2. the blue banner on the stash's east wall -> the stair down (its straight middle at x2.2)
    await H.look(9.5, 1.8, -2.5, { max: 22 })
    const stair = atX([{ x: 13.5, ev: 'stair_a' }, { x: 16, ev: 'deeper' }, { x: 20.2, ev: 'stair_b' }])
    await through([[8.2, 1, -2.5], [11.9, 1, -2.5], [12.0, 1.85, -2.5], [21.0, -7.15, -2.5], [21.9, -7.6, -2.5], [22.4, -8, -2.5]], 9, -3, { pitch: -0.55, during: stair })
    // 3. the lime banner at the bottom -> the farm, walked straight through (the middle at x1.8)
    await H.look(24.5, -6.6, -2.5, { max: 12 })
    // (one walk through both banners, no stop between: the lime one's reveal, then the cyan one's)
    const farm = atX([{ x: 26.2, ev: 'farm_a' }, { x: 31.6, ev: 'farm_b' }])
    let r3 = false, r4 = false
    await H.walk([[24.4, -8, -2.5], [33.4, -8, -2.5], [35.5, -8, -2.5]], { during: async () => {
      if (!r3 && inBlock(23, -3)) { r3 = true; H.reveal() }
      if (!r4 && inBlock(33, -3)) { r4 = true; H.reveal() }
      await farm()
    } })
    if (!r3 || !r4) throw new Error('hack_banner_door: never passed the farm\'s banners')
    // 4. the library: straight at the wall of five banners (the walk at x1.6)
    await H.look(41.5, -6.6, -1.0, { max: 12 })
    const lib = atX([{ x: 36.4, ev: 'lib_a' }, { x: 40.4, ev: 'lib_b' }])
    await H.walk([[41.4, -8, -2.5]], { during: lib })
    ctx.mark('which')
    await H.look(43.5, -7.0, -6.5, { max: 18 })     // the sweep: purple, orange ...
    await H.look(43.5, -7.0, 1.5, { max: 24 })      // ... magenta, yellow
    await H.hold(5)                                  // (a rest on the yellow one before swinging back: r:r38374d)
    await H.look(43.5, -7.0, -2.5, { max: 14 })     // the obvious one, in the middle
    // try it: the black banner is a decoy, rock behind the cloth (a real, deliberate bump: nothing breaks)
    ctx.mark('nope_try')
    K.go(true); for (let k = 0; k < 9; k++) { K.look(k); await bot.waitForTicks(1) } K.go(false)
    ctx.mark('nope')
    await H.hold(8)
    K.go(true, 'back'); for (let k = 0; k < 6; k++) { K.look(k); await bot.waitForTicks(1) } K.go(false, 'back')
    // sidestep along the wall, eyes on the banners, to the yellow one (at x2: no turn in it)
    await H.look(60, -6.8, -2.5, { max: 10 })        // square to the wall (due east): 'right' is then a sidestep south along it
    K.go(true, 'right')
    ctx.mark('side_a')
    for (let k = 0; k < 40 && bot.entity.position.z < H.O.z + 1.05; k++) { K.look(k); await bot.waitForTicks(1) }
    K.go(false, 'right')
    ctx.mark('side_b')
    for (let k = 0; k < 5; k++) { K.look(k); await bot.waitForTicks(1) }   // (the sidestep's momentum carries ~0.4 block: release early, settle on z 1.5)
    await H.look(44.5, -6.6, 1.5, { max: 12 })
    // 5. through it into the mine; a diamond on the way
    await through([[44.6, -8, 1.5], [47.3, -8, 1.5]], 43, 1)
    ctx.select(0)
    // vanilla: deepslate diamond ore (hardness 4.5) with a diamond pickaxe (speed 8) breaks in 17 ticks
    await K.dig(bot.blockAt(H.at(48, -7, 3)), 850)
    ctx.mark('diamond')
    await H.hold(8)   // still on the mined hole (the diamond pops out and is picked up): the edit cuts away 0.3 s in
    // 6. the light blue banner -> the vault. The turn and the walk to it are cut out (r:r188b46: pace's 1.7 s dwell
    // after the dig): a jump cut from the still hole to standing still in front of the banner ('mine_b')
    await H.look(52.5, -6.6, 1.5, { max: 12 })
    K.base.pitch = 0.05
    await H.walk([[52.2, -8, 1.5]])
    await H.hold(5)
    ctx.mark('mine_b')
    await H.hold(3)   // (still on both sides of the cut: the whip check's 2 ticks)
    await through([[56.9, -8, 1.5]], 54, 1)
    // out on the balcony: the eyes drop to the hall below (POV), settle, then the payoff: a pull-back off the player's
    // face to the far end of the hall, the player a speck on the cliff (no-op audit r:r4607fa: the scale reveal)
    await H.look(72, -22, 1.5, { max: 12 })
    await H.hold(4)
    H.payoff()
    M.shot(ctx, 'pull')
    await H.hold(34)
    return true
  }
})
