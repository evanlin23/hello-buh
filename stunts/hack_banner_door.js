// hack #1, "POV: you realized banners have no hitbox" (family hack, lib/hack.js; owner r:rc15847).
// The trick (vanilla 1.21, true in survival): a standing banner has no collision box (BannerBlock is noCollission),
// so a banner in a 1x2 opening reads as wall decor and you walk straight through it. In a cosy den the player walks
// into the middle banner of a bookshelf wall (~0.9 s) and comes out in a hidden stash; every secret room hides the
// next banner door, deeper each time: the stash (a chest of diamonds) -> a stair down -> an underground farm -> a
// hidden library whose wall has five banners (only one is a door) -> a mine tunnel (a diamond ore on the way) -> the
// vault. Everything on screen is walking, opening a chest and mining; commands only build the set.
// Local frame (lib/hack.js): floor y 0, the den x 1..11 z 1..9, the trick wall z 0, mineflayer yaw 0 = north (-z).
const { makeStunt, bannerDoor } = require('../lib/hack')

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
  // the stair down from the landing: step k at x 11 + k, y 1 - k (high side west), 3 of headroom, 1 wide (z -3)
  for (let k = 1; k <= 9; k++) {
    const x = 11 + k, y = 1 - k
    b.fill(x, y - 3, -4, x, 5 - k, -2, rock)                      // the shell round this slice
    b.set(x, y, -3, 'deepslate_brick_stairs[facing=west]')
    b.fill(x, y + 1, -3, x, 4 - k, -3, 'air')
  }
  for (const k of [2, 4, 6, 8]) for (const z of [-4, -2]) b.set(11 + k, 3 - k, z, 'lantern')   // lanterns in niches in the stair's walls (a hanging one is in the head's way; shroomlights read as lava)
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

  // ---- the vault: x 55..75, z -10..12, floor -17, inside -16..-2, ceiling -1; the balcony x 55..57, z 0..2 at -9
  b.fill(54, -17, -11, 76, -1, 13, rock, 'hollow')
  b.fill(55, -17, -10, 75, -17, 12, b.mix({ smooth_quartz: 4, quartz_bricks: 2, chiseled_quartz_block: 1 }))
  for (let x = 57; x <= 73; x += 4) for (let z = -8; z <= 10; z += 4) b.set(x, -17, z, 'sea_lantern')
  b.fill(55, -1, -10, 75, -1, 12, 'polished_blackstone_bricks')
  for (let x = 56; x <= 74; x += 3) for (let z = -9; z <= 11; z += 3) b.set(x, -1, z, 'shroomlight')
  for (let z = -9; z <= 11; z += 4) for (const y of [-12, -6]) { b.set(75, y, z, 'shroomlight'); b.set(55, y, z, 'shroomlight') }
  for (let x = 58; x <= 74; x += 4) for (const y of [-12, -6]) { b.set(x, y, -10, 'shroomlight'); b.set(x, y, 12, 'shroomlight') }
  b.fill(55, -17, 1, 75, -17, 1, 'gold_block')                              // a gold aisle down the middle
  // the balcony: a deepslate tower with a railed top
  b.fill(55, -16, -1, 57, -9, 3, DS); b.fill(55, -9, -1, 57, -9, 3, 'polished_deepslate')
  b.fill(55, -8, -1, 56, -8, -1, 'dark_oak_fence'); b.fill(55, -8, 3, 56, -8, 3, 'dark_oak_fence')
  b.set(56, -7, -1, 'lantern'); b.set(56, -7, 3, 'lantern')
  bannerDoor(b, 54, -8, 1, 'light_blue', 4)
  // pillars with lanterns
  for (const [x, z] of [[63, -9], [63, 11], [72, -9], [72, 11]]) b.fill(x, -16, z, x, -2, z, 'quartz_pillar[axis=y]')
  // the beacon on a gold / diamond / emerald pyramid (no beam: underground, as in vanilla)
  const tier = b.mix({ gold_block: 3, diamond_block: 2, emerald_block: 1, iron_block: 1 })
  b.fill(63, -16, -1, 67, -16, 3, tier); b.fill(64, -15, 0, 66, -15, 2, tier); b.set(65, -14, 1, 'beacon')
  // hoards: heaps of gold, diamonds, emeralds; netherite and ancient debris; chests along the walls
  const heap = (x, z, blk, r = 2) => { for (let y = 0; y <= r; y++) b.fill(x - r + y, -16 + y, z - r + y, x + r - y, -16 + y, z + r - y, blk) }
  heap(60, -5, b.mix({ gold_block: 5, raw_gold_block: 1 }), 3); heap(70, -5, 'diamond_block', 3); heap(60, 7, 'emerald_block', 3); heap(70, 7, b.mix({ gold_block: 3, diamond_block: 1 }), 3)
  heap(66, -8, 'gold_block', 1); heap(66, 10, 'diamond_block', 1); b.set(63, -16, 6, 'netherite_block'); b.set(68, -16, -4, 'ancient_debris')
  for (let x = 57; x <= 73; x += 2) { b.set(x, -16, -10, 'chest[facing=south]'); b.set(x, -16, 12, 'chest[facing=north]') }
  // a lit nether portal on the far wall
  b.fill(75, -16, -1, 75, -12, 3, 'obsidian'); b.fill(75, -15, 0, 75, -13, 2, 'nether_portal[axis=z]')
  for (const [x, z] of [[60, 1], [70, 1], [65, -5], [65, 7]]) b.hang(x, -4, z, 2)
}

const SUBS = [
  ['reveal', 'secret room 1', 1.6, 0],
  ['lookback', 'banners have NO hitbox', 1.6, 0],
  ['reveal', 'secret room 2', 1.6, 1],
  ['reveal', 'secret room 3', 1.6, 2],
  ['reveal', 'secret room 4', 1.4, 3],
  ['which', 'but which one is real?', 1.8, 0],
  ['reveal', 'secret room 5', 1.6, 4],
  ['nope', 'nope', 0.9, 0],
  ['reveal', 'secret room 6', 1.6, 5]
]

module.exports = makeStunt({
  name: 'hack_banner_door',
  caption: 'POV: you realized banners have no hitbox',
  red: 'hitbox',
  reveals: 6,
  subs: SUBS,
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
    ctx.mark('go')
    // 1. the den: straight into the middle banner -> the stash
    await through([[6.5, 1, -2.4]], 6, 0)
    ctx.mark('stash')
    await K.open(H.at(6, 1, -5))
    ctx.mark('open_chest')
    await bot.waitForTicks(22)
    K.close()
    // the how: a look back at the door from inside (the banner's back, the den's light round it)
    await H.look(6.5, 1.6, 0.5, { max: 30 })
    ctx.mark('lookback')
    await H.hold(8)
    // 2. the blue banner on the stash's east wall -> the stair down
    await H.look(9.5, 1.8, -2.5, { max: 22 })
    await through([[8.2, 1, -2.5], [11.9, 1, -2.5], [12.0, 1.85, -2.5], [21.0, -7.15, -2.5], [21.9, -7.6, -2.5], [22.4, -8, -2.5]], 9, -3, { pitch: -0.55 })
    // 3. the lime banner at the bottom -> the farm
    await H.look(24.5, -6.6, -2.5, { max: 12 })
    await through([[24.4, -8, -2.5], [27.5, -8, -2.5]], 23, -3)
    await H.look(28.5, -7.0, -6.5, { max: 16 })     // the pasture
    await H.look(33.5, -6.6, -2.5, { max: 16 })   // eyes back down the walk
    await through([[33.4, -8, -2.5], [35.5, -8, -2.5]], 33, -3, { during: async (k) => { if (k === 6) ctx.mark('farm_walk') } })
    // 4. the library: the enchanting table, then straight at the wall of five banners (the diagonal keeps it ahead)
    await H.look(38.5, -7.6, -5.5, { max: 14 })
    await H.look(41.5, -6.6, -1.0, { max: 14 })
    await H.walk([[41.4, -8, -2.5]])
    ctx.mark('which')
    await H.look(43.5, -7.0, -6.5, { max: 18 })     // the sweep: purple, orange ...
    await H.look(43.5, -7.0, 1.5, { max: 24 })      // ... magenta, yellow
    await H.look(43.5, -7.0, -2.5, { max: 14 })     // the obvious one, in the middle
    // try it: the black banner is a decoy, rock behind the cloth (a real, deliberate bump: nothing breaks)
    ctx.mark('nope_try')
    K.go(true); for (let k = 0; k < 9; k++) { K.look(k); await bot.waitForTicks(1) } K.go(false)
    ctx.mark('nope')
    await H.hold(8)
    K.go(true, 'back'); for (let k = 0; k < 6; k++) { K.look(k); await bot.waitForTicks(1) } K.go(false, 'back')
    // sidestep along the wall, eyes on the banners, to the yellow one
    await H.look(60, -6.8, -2.5, { max: 10 })        // square to the wall (due east): 'right' is then a sidestep south along it
    K.go(true, 'right')
    for (let k = 0; k < 40 && bot.entity.position.z < H.O.z + 1.05; k++) { K.look(k); await bot.waitForTicks(1) }
    K.go(false, 'right')
    for (let k = 0; k < 5; k++) { K.look(k); await bot.waitForTicks(1) }   // (the sidestep's momentum carries ~0.4 block: release early, settle on z 1.5)
    await H.look(44.5, -6.6, 1.5, { max: 12 })
    // 5. through it into the mine; a diamond on the way
    await through([[44.6, -8, 1.5], [47.3, -8, 1.5]], 43, 1)
    ctx.select(0)
    // vanilla: deepslate diamond ore (hardness 4.5) with a diamond pickaxe (speed 8) breaks in 17 ticks
    await K.dig(bot.blockAt(H.at(48, -7, 3)), 850)
    ctx.mark('diamond')
    await K.dig(bot.blockAt(H.at(48, -6, 3)), 850)
    ctx.mark('diamond')
    await H.look(52.5, -6.6, 1.5, { max: 14 })
    await H.walk([[48.9, -8, 1.5]])
    // 6. the white banner -> the vault (the payoff), the look out over it from the balcony
    await H.look(54.5, -7.2, 1.5, { max: 10 })
    K.base.pitch = 0.05
    await through([[52.5, -8, 1.5], [56.9, -8, 1.5]], 54, 1)
    await H.hold(12)
    // the payoff: the look down off the balcony at the hoard
    H.payoff()
    await H.look(66, -15, 1.5, { max: 24 })
    await H.hold(10)
    return true
  }
})
