// Story Short "the nitwit finally said something 😳" (stories/nitwit, premise #11 in docs/stories.md).
// The village nitwit only ever says "hmm" (a HMMS meter: 4,096). He always stands where something bad is about
// to happen: under the tree before lightning splits it, in the wheat before a creeper blows it up, at the well
// before it turns to lava; the villagers walk away from him and even the golem goes around him. One night I follow
// him past the last torch to another village: mine, burned and empty. He's from a world that already ended, sent
// back to warn this one, and "hmm" is all the game lets a nitwit say. Today he's standing right next to ME (the
// clue: he stands where the bad thing is about to happen). He says my name, then the date of the end: today.
// Bolts and blasts; end on the flash. The ending loops: line 1 is the "hmm" counter.
//
// Map (relative to the set's origin; all daytime shots look south/east/west so the ruin up north never shows):
//   village street x -1..1, z 8..56; houses west x -9..-4 and east x 4..9 at z 14, 26, 38; the well z 50..53
//   tree east (20, 26); wheat west x -26..-17, z 18..30; torch path north z 8 -> -26, the last torch at z 3
//   the ruin (the burned copy) north: street z -28..-62, houses at z -40 and -54, dead tree (12, -46), the well z -31
const path = require('path')
const { storyLines, storyKit, setKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'nitwit')
const CAPTION = 'the nitwit finally said something 😳'
const DAY = 6000, NIGHT = 14500   // 14500: dark, but the ruin still reads (18000 was near-black in the stills)

module.exports = {
  name: 'story_nitwit',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: {
    caption: CAPTION, red: 'nitwit', story: 'stories/nitwit', startAt: 'line:0', endAfter: 'story_end:0',
    punch: ['name_word', 'today_word'],
    cards: [['hmm', 'HMM.', 0.9, 'white']]
  },
  hideHand: true,
  brightness: 1.0,   // vanilla's Bright: the night ruin read near-black at the default 0.5 in the stills

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const { c, A, mob, vil } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')
    await c('/difficulty normal')
    await c('/gamerule mob_griefing true')
    await clearSet(ctx, A, 64, 24)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 28)

    // --- the village
    await c(`/fill ${A(-1, 0, 8)} ${A(1, 0, 56)} dirt_path`)
    for (const z0 of [14, 26, 38]) {
      await house(ctx, A, -9, z0, -4, z0 + 2, 'west')
      await house(ctx, A, 4, z0, 4, z0 + 2, 'east')
    }
    // the tree (L04), built by hand so the split is known: trunk y1-5, a leaf crown y4-7
    await c(`/fill ${A(18, 4, 24)} ${A(22, 5, 28)} oak_leaves[persistent=true]`)
    await c(`/fill ${A(19, 6, 25)} ${A(21, 7, 27)} oak_leaves[persistent=true]`)
    await c(`/fill ${A(20, 1, 26)} ${A(20, 6, 26)} oak_log`)
    // the wheat (L05): farmland with a water row, ripe wheat
    await c(`/fill ${A(-26, 0, 18)} ${A(-17, 0, 30)} farmland[moisture=7]`)
    await c(`/fill ${A(-22, 0, 18)} ${A(-22, 0, 30)} water`)
    await c(`/fill ${A(-26, 1, 18)} ${A(-23, 1, 30)} wheat[age=7]`)
    await c(`/fill ${A(-21, 1, 18)} ${A(-17, 1, 30)} wheat[age=7]`)
    // the well (L06): a cobblestone ring, water, fence posts and a slab roof
    await c(`/fill ${A(-2, 0, 50)} ${A(1, 1, 53)} cobblestone`)
    await c(`/fill ${A(-1, 0, 51)} ${A(0, 1, 52)} water`)
    for (const [dx, dz] of [[-2, 50], [1, 50], [-2, 53], [1, 53]]) await c(`/fill ${A(dx, 2, dz)} ${A(dx, 3, dz)} oak_fence`)
    await c(`/fill ${A(-2, 4, 50)} ${A(1, 4, 53)} cobblestone_slab`)
    await c(`/setblock ${A(-1, 3, 51)} lantern[hanging=true]`)   // lights the well's inside (the new lava read black: review 1)
    // the torch path north (L09-L10): torches on fence posts, the last one at z 3
    await c(`/fill ${A(0, 0, -26)} ${A(0, 0, 7)} dirt_path`)
    for (const dz of [12, 7, 3]) { await c(`/setblock ${A(2, 1, dz)} oak_fence`); await c(`/setblock ${A(2, 2, dz)} torch`) }

    // --- the ruin: the same village after the end (burned, empty), north past the torches
    await c(`/fill ${A(-1, 0, -62)} ${A(1, 0, -28)} coarse_dirt`)
    await c(`/fill ${A(-16, 0, -64)} ${A(16, 0, -27)} coarse_dirt replace grass_block`)
    for (const [dx, dz] of [[-5, -30], [6, -36], [-12, -44], [9, -58], [3, -50], [-3, -60], [13, -33]]) await c(`/setblock ${A(dx, 1, dz)} dead_bush`)
    for (const z0 of [-42, -56]) {
      for (const x0 of [-9, 4]) {
        await c(`/fill ${A(x0, 0, z0)} ${A(x0 + 5, 3, z0 + 5)} blackstone hollow`)
        await c(`/fill ${A(x0, 0, z0)} ${A(x0 + 5, 0, z0 + 5)} netherrack`)
        await c(`/fill ${A(x0 + 1, 3, z0 + 1)} ${A(x0 + 4, 3, z0 + 4)} air`)
        for (const [x, z] of [[x0, z0], [x0 + 5, z0], [x0, z0 + 5], [x0 + 5, z0 + 5]]) await c(`/fill ${A(x, 1, z)} ${A(x, 3, z)} coal_block`)
        // the walls broken open: holes, a missing corner
        await c(`/fill ${A(x0 + 2, 2, z0)} ${A(x0 + 4, 3, z0)} air`)
        await c(`/fill ${A(x0 + 5, 2, z0 + 1)} ${A(x0 + 5, 3, z0 + 3)} air`)
        await c(`/fill ${A(x0, 1, z0 + 2)} ${A(x0, 2, z0 + 2)} air`)
        await c(`/fill ${A(x0 + 1, 3, z0 + 5)} ${A(x0 + 3, 3, z0 + 5)} air`)
        await c(`/setblock ${A(x0 + 2, 1, z0 + 2)} campfire[lit=true]`)   // still burning (review 1: nothing read as burned)
      }
    }
    for (const [dx, dz] of [[-2.5, -34], [2.5, -47], [-2.5, -57], [10, -44], [-17, -42], [4, -30]]) await c(`/setblock ${A(Math.floor(dx), 1, dz)} campfire[lit=true]`)
    // the dead tree: a bare charred trunk, split
    await c(`/fill ${A(12, 1, -46)} ${A(12, 4, -46)} stripped_dark_oak_log`)
    await c(`/setblock ${A(11, 4, -46)} stripped_dark_oak_log[axis=x]`)
    await c(`/setblock ${A(13, 3, -46)} stripped_dark_oak_log[axis=x]`)
    // the well: dry, magma at the bottom
    await c(`/fill ${A(5, 0, -32)} ${A(8, 1, -29)} cobbled_deepslate`)
    await c(`/fill ${A(6, 0, -31)} ${A(7, 1, -30)} air`)
    await c(`/fill ${A(6, -1, -31)} ${A(7, -1, -30)} magma_block`)
    await c(`/fill ${A(5, 2, -32)} ${A(5, 3, -32)} deepslate_brick_wall`)
    await c(`/setblock ${A(8, 2, -29)} deepslate_brick_wall`)
    // the crater where the wheat was (west)
    await c(`/fill ${A(-24, -1, -48)} ${A(-18, 0, -42)} air`)
    await c(`/fill ${A(-23, -2, -47)} ${A(-19, -2, -43)} netherrack`)

    // --- the cast (NoAI, tagged per scene). The nitwit has a twin at every place he stands, so no one hops
    await vil(0.5, 28.5, 90, 'nitwit', ['nS'])                // the street nitwit: L01-L02, L07-L08, L14-L17
    await vil(4.6, 40.5, 0, 'nitwit', ['nRoof', 'warm'], { y: 5.5 })   // L03, L07: on my roof
    await vil(19.5, 24.2, 0, 'nitwit', ['nTree', 'warm'])     // L04: under the tree
    await vil(-18.5, 20.5, -45, 'nitwit', ['nWheat', 'warm'])   // L05: in the wheat
    await vil(-2.6, 51.5, -90, 'nitwit', ['nWell', 'warm'])     // L06: at the well, looking in
    await vil(0.5, 1.5, 180, 'nitwit', ['nPath'])             // L09-L10: walking north at night
    await vil(0.5, -28.5, 180, 'nitwit', ['nRuin'])           // L11-L15: in the ruin
    // the crowd (L07): five villagers in the street south of the nitwit
    const crowd = [['farmer', -0.8, 44.5, 160], ['librarian', 1.6, 46.0, -170], ['fisherman', -1.4, 47.5, 20], ['butcher', 0.9, 49.0, 135], ['cleric', 2.2, 44.0, 60]]
    for (let i = 0; i < crowd.length; i++) await vil(crowd[i][1], crowd[i][2], crowd[i][3], crowd[i][0], [`v${i}`])
    await mob('iron_golem', 0.5, 1, 55.5, 180, ['golem'])
    await mob('creeper', -29.5, 1, 26.5, -90, ['creeper'])

    await c('/clear @s')
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X + 0.5, F + 1, Z + 22.5, 0, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await c('/effect give @s minecraft:resistance 600 4 true')   // the blasts at the end shake him, never kill him
    await bot.waitForTicks(40)
    this.crowd = crowd
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, look, line, cut } = K
    const say = K.say
    const hmm = (vol = 1) => ctx.sound('entity.villager.ambient', vol, 1)
    const away = (a) => { a.y = 90 }   // an actor out of sight: a hop past 64 blocks snaps (no glide)
    const bolt = (x, y, z) => {
      ctx.mark('lightning', { x: X + x, y: F + y, z: Z + z })
      ctx.sound('entity.lightning_bolt.thunder', 2, 0.9)
      ctx.sound('entity.lightning_bolt.impact', 1.5, 1)
    }
    const boom = (x, y, z) => say(`/summon tnt ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {fuse:0s}`)

    // the actors (tp'd every tick from these objects)
    const nS = K.actor('nS', { x: 0.5, z: 28.5, yaw: 90 })
    const crowd = this.crowd.map((v, i) => K.actor(`v${i}`, { x: v[1], z: v[2], yaw: v[3] }))
    let meter = 4093
    K.setMeter(meter)

    // L01: the hook. The nitwit in the street, head bobbing on each "hmm", the counter ticking up to 4,096
    await cut(0.5, 22.5, P(0.5, 2.2, 28.5))
    await K.preroll(6, () => { nS.yaw = 90 + Math.sin(ctx.tick / 6) * 25 })
    await line('L01', async (k, at) => {
      nS.yaw = 90 + Math.sin(ctx.tick / 6) * 25
      nS.pitch = k % 20 < 6 ? 20 : 0   // the nod a villager does when it grunts
      if (k === 1 || k === at(2) || k === at(3)) { hmm(); K.setMeter(++meter) }
      K.go(k > 2 && k < 12)   // a few steps (to k 26 it walked into him)
      K.base = K.aim(P(0.5, 2.1, 28.5)); look(k)
    })
    K.go(false)
    if (meter < 4096) K.setMeter(meter = 4096)

    // L02: closer. He turns his head to me on "my NAME"
    await cut(0.5, 25.8, P(0.5, 2.2, 28.5))
    await line('L02', async (k, at) => {
      const u = K.ease((k - at(2) + 6) / 8)
      nS.yaw = 90 + 90 * u; nS.pitch = 0                  // west -> north (facing me)
      if (k === at(2)) { ctx.mark('name_word'); ctx.sound('entity.villager.yes', 1, 0.8) }
      look(k)
    })

    // L03: always somewhere weird: on a roof
    // he stands on the roof's street edge: in the middle of it the eaves hid all but his head from the street
    await cut(-2.5, 34.0, P(4.6, 6.8, 40.5))
    const nRoof = K.actor('nRoof', { x: 4.6, y: 5.5, z: 40.5, yaw: 90 })
    await line('L03', async (k, at) => {
      if (k === at(3)) hmm(0.6)
      nRoof.yaw = 90 + Math.sin(ctx.tick / 6) * 35; nRoof.pitch = k >= at(3) ? 25 : 0   // looking about up there, then down at me
      look(k, 0, 0.06 * K.ease(k / 30))   // a slow tilt up to him (walking, it hit the wall)
    })

    // L04: under a tree; that night, lightning split it
    const nTree = K.actor('nTree', { x: 19.5, z: 24.2, yaw: 0 })
    await cut(11.5, 18.5, P(20, 4, 26))
    let night4 = false, struck = false
    await line('L04', async (k, at) => {
      if (!night4 && k === at(1) - 1) { night4 = true; away(nTree); await cut(13.5, 15.5, P(20, 4.5, 26), 1, { time: NIGHT }) }
      if (!struck && k === at(2)) {
        struck = true
        bolt(20.5, 7, 26.5)
        // split: the crown blown off, the trunk snapped at 3, a fire at its foot (review 1: the tree read whole)
        say(`/fill ${X + 18} ${F + 4} ${Z + 24} ${X + 22} ${F + 7} ${Z + 28} air`)
        say(`/fill ${X + 20} ${F + 4} ${Z + 26} ${X + 20} ${F + 6} ${Z + 26} air`)
        say(`/setblock ${X + 21} ${F + 1} ${Z + 26} oak_log[axis=x]`); say(`/setblock ${X + 22} ${F + 1} ${Z + 26} oak_log[axis=x]`)
        say(`/setblock ${X + 19} ${F + 1} ${Z + 26} campfire[lit=true]`)
      }
      if (struck && k % 3 === 0) ctx.particles('smoke', P(20.5 + (Math.random() - 0.5), 3.5, 26.5 + (Math.random() - 0.5)))
      K.go(k > 2)   // keeps creeping toward it at night too (0.9 s near-still: review 1)
      look(k)
    })
    K.go(false)

    // L05: in the wheat; a creeper walked in and BOOM (day again on the cut)
    nS.x = 3.5; nS.z = 36.0; nS.yaw = 45   // the street nitwit to the crowd's end of the street, out of every shot (L08 brings him in)
    const nWheat = K.actor('nWheat', { x: -18.5, z: 20.5, yaw: -45 })
    const creeper = K.actor('creeper', { x: -29.5, y: 90, z: 26.5, yaw: -90 })   // out of sight until its cut
    await cut(-12.5, 15.5, P(-19, 1.6, 21.5), 1, { time: DAY })
    let boomed = false, cut5 = false
    await line('L05', async (k, at) => {
      nWheat.yaw = -45 + Math.sin(ctx.tick / 7) * 20
      if (!cut5 && k === at(1) - 3) { Object.assign(creeper, { x: -27.5, y: 1 }); away(nWheat) }   // both hops land on the cut frame (~2 ticks)
      if (!cut5 && k === at(1) - 1) { cut5 = true; await cut(-12.0, 16.5, P(-22, 1.2, 24)) }
      if (cut5 && !boomed) K.step(creeper, 0.11, -0.04)
      if (!boomed && k === at(3)) {
        boomed = true
        boom(creeper.x, 1, creeper.z); away(creeper)
        ctx.mark('flash')
      }
      look(k)
    })

    // L06: by the well; the water turned to lava
    const nWell = K.actor('nWell', { x: -2.6, z: 51.5, yaw: -90, pitch: 40 })
    await cut(2.5, 51.4, P(-0.6, 1.4, 51.5))   // at the rim, looking down in (review 1: villagers hid it, the lava read black)
    let lava = false
    await line('L06', async (k, at) => {
      nWell.pitch = 40 + Math.sin(ctx.tick / 5) * 8
      if (!lava && k === at(3)) {
        lava = true
        say(`/fill ${X - 1} ${F} ${Z + 51} ${X} ${F + 1} ${Z + 52} lava replace water`)
        ctx.sound('item.bucket.empty_lava', 1, 1); ctx.sound('block.lava.pop', 1, 1)
      }
      look(k, 0, -0.08 * K.ease(k / 20))
      return
      look(k)
    })
    K.go(false)
    away(nWell)

    // L07: on MY roof; the next day it rained anvils (the L03 roof again, then anvils from the sky)
    await cut(-2.0, 33.5, P(4.6, 6.6, 40.5))
    let next7 = false, rained = 0
    const anvil = (x, z) => say(`/summon falling_block ${(X + x).toFixed(2)} ${F + 12} ${(Z + z).toFixed(2)} {BlockState:{Name:"minecraft:anvil"},Time:1,DropItem:0b}`)
    const drops = [[6.5, 40.5], [4.5, 38.5], [8.5, 42.5], [4.2, 36.5], [7.5, 37.5], [5.5, 43.5], [9.5, 39.5], [4.0, 41.5], [6.0, 35.5], [8.8, 36.4]]
    await line('L07', async (k, at) => {
      nRoof.yaw = 90 + Math.sin(ctx.tick / 9) * 30
      if (!next7 && k === at(1) - 1) { next7 = true; away(nRoof); await cut(1.5, 31.5, P(6.0, 5.0, 40.5)) }
      // they fall 12 blocks (~1 s): the first ones drop in before the word so they hit the roof on it
      if (next7 && k >= at(3) - 16 && rained < drops.length && (k - at(3)) % 2 === 0) { anvil(...drops[rained]); rained++ }
      look(k)
    }, 0.15)
    away(nRoof)

    // L08: the villagers walk away when he comes
    await cut(-1.8, 32.5, P(0.5, 1.6, 43))
    await K.preroll(6, () => K.step(nS, -0.05, 0.08))
    await line('L08', async (k, at) => {
      if (nS.z < 40.5) K.step(nS, -0.05 * (nS.x > 0.5 ? 1 : 0), 0.09)
      if (k >= at(2)) {
        for (const v of crowd) {
          const dx = v.x - nS.x, dz = v.z - nS.z, d = Math.hypot(dx, dz) || 1
          K.step(v, dx / d * 0.1, dz / d * 0.1)
        }
      }
      K.base = K.aim(P(0.5, 1.6, Math.max(43, nS.z + 2))); look(k)
    })

    // L09: even the iron golem goes around him (walking up the street toward me, an arc round the nitwit)
    const golem = K.actor('golem', { x: 0.5, z: 47.5, yaw: 180 })
    nS.x = 0.5; nS.z = 40.5; nS.yaw = 0
    await cut(-1.5, 35.5, P(0.5, 2, 44))
    await K.preroll(4, () => K.step(golem, 0, -0.12))
    await line('L09', async (k) => {
      // z 55 -> ~36 over the line; x bulges 2.6 blocks east past the nitwit at z 40.5
      const nz = golem.z - 0.14
      const nx = 0.5 + 2.6 * Math.exp(-Math.pow((nz - 40.5) / 3.2, 2))
      K.step(golem, nx - golem.x, nz - golem.z)
      nS.yaw = K.mcYaw(golem.x - nS.x, golem.z - nS.z)
      look(k)
    })
    away(golem)

    // L10: so one night, I followed him (walking the torch path behind him; no sneak: a crouch changed on a cut
    // eases the eye height into the new shot, rec_check blocker)
    const nPath = K.actor('nPath', { x: 0.5, z: 1.5, yaw: 180 })
    await cut(0.5, 9.5, P(0.5, 1.6, 0), 1, { time: NIGHT })
    await line('L10', async (k) => {
      K.step(nPath, 0, -0.12)
      K.go(true)
      K.base = K.aim(P(0.5, 1.7, nPath.z - 3)); look(k)
    })
    // L11: past the last torch was ANOTHER village (cut: the ruin's street, him walking into it)
    let ruinCut = false
    const nRuin = K.actor('nRuin', { x: 0.5, z: -28.5, yaw: 180 })
    await line('L11', async (k, at) => {
      if (!ruinCut) { K.step(nPath, 0, -0.12); K.go(true); K.base = K.aim(P(0.5, 1.7, nPath.z - 3)) }
      if (!ruinCut && k === at(2) - 1) {
        ruinCut = true
        await cut(0.5, -24.5, P(0.5, 1.5, -44), 1, { stop: false })
        away(nPath)
      }
      if (ruinCut) { K.step(nRuin, 0, -0.1); K.go(false) }   // he walks off into it (walking, the camera ran into his head: review 1)
      look(k)
    })
    K.go(false)

    // L12: MY village. BURNED. EMPTY. (jump cuts on each word)
    // up on a ruined wall's corner: the street, the broken houses and their fires against the sky (review 1)
    await K.cutTo(4.5, F + 4, -36.5, P(-3, 1.5, -54))
    let c12 = 0
    await line('L12', async (k, at) => {
      if (c12 === 0 && k === at(1) - 1) { c12 = 1; await cut(-5.5, -38.5, P(-7, 1.3, -40.5)) }   // inside a roofless room, its fire
      if (c12 === 1 && k === at(2) - 1) { c12 = 2; away(nRuin); await cut(0.5, -35.5, P(0.5, 1.6, -62)) }
      K.go(c12 === 2)
      look(k)
    })
    K.go(false)

    // L13: the tree, the wheat, the well: all gone (each place he stood, already destroyed here)
    await cut(7.5, -42.5, P(12, 2.5, -46))
    nRuin.x = 0.5; nRuin.y = 1; nRuin.z = -42.5; nRuin.yaw = 0   // back in the street for L14 (out of these shots)
    let c13 = 0
    await line('L13', async (k, at) => {
      if (c13 === 0 && k === at(1) - 1) { c13 = 1; await cut(-15.5, -40.5, P(-21, -0.5, -45)) }
      if (c13 === 1 && k === at(2) - 1) { c13 = 2; await cut(2.5, -24.0, P(6.5, -0.5, -30.5)) }
      look(k)
    })

    // L14: he's not from here; his world already ended (he turns to me; a bolt behind him on "ENDED")
    await cut(0.5, -37.0, P(0.5, 2.2, -42.5))
    let b14 = false
    await line('L14', async (k, at) => {
      nRuin.yaw = 180 * K.ease((k - at(1) + 4) / 10)   // north -> facing me
      if (!b14 && k === at(3)) { b14 = true; bolt(-6, 8, -58) }
      K.go(k > at(2) && k < at(3)); look(k)
    })
    K.go(false)

    // L15: they sent him back to warn us (behind him, our village's torches far ahead)
    nRuin.z = -43.5; nRuin.yaw = 0
    await cut(0.5, -47.5, P(0.5, 1.4, -20))
    await line('L15', async (k, at) => {
      if (k >= at(1) - 4) K.step(nRuin, 0, 0.09)
      look(k)
    })

    // L16: but a nitwit can only say one word (day, his face). The word: "hmm", with the card
    away(nRuin)
    nS.x = 0.5; nS.z = 40.5; nS.yaw = 180; nS.pitch = 0
    await cut(0.5, 38.3, P(0.5, 2.2, 40.5), 1, { time: DAY })
    let said = false
    await line('L16', async (k, at, n) => {
      if (!said && k === n - 14) { said = true; hmm(1.2); ctx.mark('hmm'); K.setMeter(4097) }
      nS.pitch = said ? 18 : 0
      look(k)
    }, 0.6)

    // L17: and today, he's standing right next to ME (looking down the street, then turn: he's right there)
    nS.yaw = 90; nS.pitch = 0
    await cut(-0.7, 39.4, P(-0.7, 1.6, 52))
    let from17 = null
    await line('L17', async (k, at) => {
      for (const v of crowd) if (v.z < 60) K.step(v, 0, 0.03)
      if (k >= at(2) - 2) { from17 = from17 || { ...K.base }; K.turnTo(from17, P(0.9, 2.1, 42.0), (k - at(2) + 2) / 9) }   // him on the left, the street (the blasts) on the right
      look(k)
    })

    // L18: he said my name; then the date of the end (the sky darkens as he talks)
    await line('L18', async (k, at, n) => {
      if (k % 6 === 0) hmm(0.35)
      K.setTime(DAY + (12800 - DAY) * K.ease(k / n))
      if (k === at(3)) bolt(-4, 10, 62)
      look(k)
    })

    // L19: it's TODAY (bolts and blasts behind him, the flash; end on it)
    await line('L19', async (k, at) => {
      // down the street behind him (the house right behind him hid them in the stills)
      if (k === at(1)) { ctx.mark('today_word'); bolt(2, 8, 50); bolt(-5, 8, 58); boom(3, 1, 54); ctx.mark('flash') }
      if (k === at(1) + 4) { bolt(6, 8, 62); boom(-3, 1, 58) }
      look(k)
    }, 0.5)
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return true

  }
}
