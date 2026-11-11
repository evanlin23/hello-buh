// "hide and seek but the villagers cheated 😭" (~33 s, worker 16): first person from the seeker, in a
// plains village built from vanilla's own village templates (/place template). It opens on a villager
// running off to hide behind a tree. Five rounds, each on a countdown: the seeker checks doors, the
// well, the hay, behind trees... nothing. Then something on screen gives the hider away, and every
// spot is more impossible than the last:
//   1. inside a 2x2 dark oak trunk (the leaves shake): two chops, face to face
//   2. down a 1x1 shaft under the pond (bubbles): he rises out of the water
//   3. right under the spot where the seeker started (crumbs knocked up from below): dig, a face looking up
//   4. in the lava pool (it pops, a burning head peeks out): he rises out of it, on fire
//   5. on a 1x1 pillar up to build limit, right beside the start (an emerald falls from the sky): the
//      camera follows the pillar up, and a third-person zoom-out at y 320 shows him up there
// Hiders are NoAI, Invulnerable, NoGravity villagers; the sets are built with commands before the
// recording (the pillar is built in the cut before round 5, so it never shows earlier). Between
// rounds the bot teleports (a cut) and the set-up time is cut from the video (speed 'cut').
const hs = require('../lib/hide_seek')
const ROUNDS = 5
const R = [1, 2, 3, 4, 5]

module.exports = {
  name: 'hide_seek',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'hide and seek but the villagers cheated 😭',
  renderDistance: 17, recordRadius: 280,   // the build-limit pillar: its top is ~250 blocks up (fog is max(xz, |y|))
  chunkStops: set => [{ x: set.x + 150, z: set.z }, { x: set.x - 150, z: set.z }, { x: set.x, z: set.z + 150 }, { x: set.x, z: set.z - 150 }],
  clouds: false,   // Video Settings > Clouds: OFF (vanilla): at y 192 they'd hide the top of the pillar
  botTimeout: 900,
  time: 1500,      // morning: at noon the sun sat right at the top of the pillar shot
  // sharp zooms (narrower FOV) on each giveaway
  fovZoom: [['r1_zoom', 'r1_chop:-0.3', 1.6], ['r2_zoom', 'r2_found:0.6', 1.7], ['r3_zoom', 'r3_found:0.7', 1.8],
    ['r4_zoom', 'r4_found:0.7', 1.7], ['r5_zoom', 'r5_found:0.3', 4]],
  edit: {
    caption: 'hide and seek but the villagers cheated 😭', red: 'cheated',
    song: null, dropAt: 'r5_zoom',
    startAt: 'r1_go:0', endAfter: 'r5_found:-0.3',   // (cut to the y 320 shot as the look up the pillar ends: the tip held still 0.4 s)
    // the zoom-out: a fixed camera up at y 320 beside him, appended after the look up the pillar
    replay: { at: 'r5_found', before: 0.05, after: 0.85, cam: '1.5,324.5,10.5,45,-35', speed: 1, label: 'MEANWHILE AT Y 320' },
    // round 1's 3 s of door-to-door searching cut (r1_go+1.3..4.3: pace saw 4.5 s with nothing new right after the hook;
    // the viewer swipes at 1.3-1.5 s, Studio 2026-11-11): the villager runs off, then the search is already at its end
    // (2026-11-11, the followable camera, r:r38374d: slower, eased looks made the searches longer; the pace comes back
    // through cuts, not whips: round 2's and round 3's door-to-door middles and most of round 5's tilt up the pillar, pace dead 3.6 / 4.4 / 3.2 s)
    // Each cut inside a round starts and ends where the view is still (review 2026-11-11: r1 1.3..4.3 and r3 1.8..4.4
    // joined a 180 deg/s pan one way to one the other way, a snap; ./hb check's edit-cut test, lib/hb/owner.js
    // editCutSnaps): r1 rests at +0.2..1.0 and +3.5..3.9, r2 +2.5..2.9 and +5.05..5.55, r3 +1.25..1.5 and +3.55..3.95.
    // Round 5's cut stays inside its one tilt up the pillar (the same way, 24 deg apart: reads as one tilt).
    speed: [['r1_go:1.0', 'r1_go:3.85', 'cut'], ['r2_go:2.95', 'r2_go:5.5', 'cut'], ['r3_go:1.5', 'r3_go:3.9', 'cut'], ['r5_end:0.5', 'r5_end:2.4', 'cut'],
      ...[1, 2, 3, 4].map(n => [`cut${n}a`, `cut${n}b`, 'cut'])],
    clock: R.map((n, i) => [`r${n}_go`, `r${n}_end`, [5, 4, 4, 4, 3][i], `ROUND ${n}`, 'down']),
    counter: { at: [...R.slice(0, 4).map(n => `r${n}_found`), 'r5_zoom'], total: ROUNDS },
    cards: [['r1_found', 'IN A TREE 😭', 0.8, 'yellow'], ['r2_found', 'IN THE POND 😭', 0.7, 'blue'],
      ['r3_found', 'UNDER ME 😭', 0.9, 'orange'], ['r4_found', 'IN LAVA 🔥', 0.9, 'gold']],
    punch: [...R.slice(0, 4).map(n => `r${n}_found`), 'r5_zoom'],
    subs: [['r1_end', 'where did he go', 0.9], ['r2_end', 'nothing again', 0.9], ['r3_end', 'I give up', 0.9],
      ['r4_end', 'not again', 0.9], ['r5_end', 'seriously?', 0.9]],
    subsY: 0.62,
    sfx: [['whoosh', 'r1_go']]   // pace: sound by 0.3 s (the song comes in at the remix; the opening was silent on the render)
  },

  // ---------------------------------------------------------------- set
  // (the site: lib/hide_seek.js findFlat: hills sliced by the clearing fill showed as cut cliffs)
  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const site = await hs.findSite(ctx, 'minecraft:plains')
    const { X, Z, F } = site
    Object.assign(this, { X, Z, F })
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/gamerule random_tick_speed 0')
    await ctx.cmd('/gamerule fire_spread_radius_around_player 0')
    await ctx.cmd('/difficulty peaceful')
    await hs.clearField(ctx, site, { taper: 6 })
    const P = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    // streets
    await ctx.cmd(`/fill ${P(-1, 0, -26)} ${P(1, 0, 26)} dirt_path`)
    await ctx.cmd(`/fill ${P(-10, 0, -1)} ${P(26, 0, 1)} dirt_path`)
    // vanilla village pieces. rot: none | 180. jig: the jigsaw blocks' final states (template coords)
    const tpl = async (piece, dx, dz, rot, jig) => {
      await ctx.cmd(`/place template minecraft:village/plains/${piece} ${P(dx, 0, dz)} ${rot}`)
      for (const [lx, ly, lz, b] of jig) {
        const [wx, wz] = rot === '180' ? [dx - lx, dz - lz] : [dx + lx, dz + lz]
        await ctx.cmd(`/setblock ${P(wx, ly, wz)} ${b}`)
      }
    }
    const house = [[0, 0, 3, 'dirt_path'], [3, 0, 3, 'oak_planks']]
    await tpl('town_centers/plains_fountain_01', -4, -4, 'none', [[0, 0, 6, 'dirt_path'], [1, 0, 2, 'dirt_path'], [2, 0, 1, 'dirt_path'], [2, 0, 7, 'dirt_path'], [7, 0, 2, 'dirt_path'], [7, 0, 7, 'dirt_path'], [0, 1, 4, 'air'], [4, 1, 0, 'air'], [4, 1, 8, 'air'], [8, 1, 4, 'air']])
    await tpl('houses/plains_small_house_1', -3, -8, '180', house)    // H1: x -9..-3, z -14..-8, door (-4, -11)
    await tpl('houses/plains_small_house_2', 3, -14, 'none', house)   // H2: x 3..9, z -14..-8, door (4, -11)
    await tpl('houses/plains_small_house_3', -3, 14, '180', house)    // H3: x -9..-3, z 8..14, door (-4, 11)
    await tpl('houses/plains_small_house_4', 3, 8, 'none', house)     // H4: x 3..9, z 8..14, door (4, 11)
    await tpl('houses/plains_meeting_point_5', -21, -5, 'none', [[2, 0, 6, 'dirt_path'], [7, 0, 2, 'dirt'], [8, 0, 8, 'dirt'], [0, 1, 5, 'air']])   // the bell stall, x -21..-12
    await tpl('houses/plains_small_farm_1', 13, -13, 'none', [[0, 0, 4, 'oak_log']])   // x 13..19, z -13..-5
    // oak trees: trunk + a rounded leaf blob (persistent, or they decay)
    const tree = async (dx, dz, h) => {
      await ctx.cmd(`/fill ${P(dx - 2, h - 2, dz - 2)} ${P(dx + 2, h - 1, dz + 2)} oak_leaves[persistent=true]`)
      await ctx.cmd(`/fill ${P(dx - 1, h, dz - 1)} ${P(dx + 1, h + 1, dz + 1)} oak_leaves[persistent=true]`)
      for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) await ctx.cmd(`/setblock ${P(dx + a, h - 1, dz + b)} air`)
      for (const [a, b] of [[-1, -1], [1, 1]]) await ctx.cmd(`/setblock ${P(dx + a, h + 1, dz + b)} air`)
      await ctx.cmd(`/fill ${P(dx, 1, dz)} ${P(dx, h - 1, dz)} oak_log`)
    }
    // T1, the hider's tree (round 1): a 2x2 dark oak, trunk (6..7, -5..-4), so the villager fits inside;
    // a rounded canopy (corners and edges trimmed)
    await ctx.cmd(`/fill ${P(3, 5, -8)} ${P(10, 6, -1)} dark_oak_leaves[persistent=true]`)
    await ctx.cmd(`/fill ${P(4, 7, -7)} ${P(9, 7, -2)} dark_oak_leaves[persistent=true]`)
    await ctx.cmd(`/fill ${P(5, 8, -6)} ${P(8, 8, -3)} dark_oak_leaves[persistent=true]`)
    for (const [a, b] of [[3, -8], [10, -8], [3, -1], [10, -1], [4, -8], [3, -7], [9, -1], [10, -2]]) await ctx.cmd(`/fill ${P(a, 5, b)} ${P(a, 6, b)} air`)
    for (const [a, b] of [[4, -7], [9, -7], [4, -2], [9, -2]]) await ctx.cmd(`/setblock ${P(a, 7, b)} air`)
    await ctx.cmd(`/fill ${P(6, 1, -5)} ${P(7, 6, -4)} dark_oak_log`)
    await tree(-15, 8, 6)       // round 3's look-behind
    await tree(13, 16, 5)
    await tree(-13, -18, 5)     // round 4's look-up
    // hay (round 2's look-behind)
    await ctx.cmd(`/fill ${P(9, 1, 4)} ${P(10, 1, 5)} hay_block`)
    await ctx.cmd(`/setblock ${P(9, 2, 4)} hay_block`)
    // the pond (round 2): 2 deep, uneven edges, a 1x1 shaft 3 deeper in the middle
    await ctx.cmd(`/fill ${P(11, -3, 5)} ${P(21, -1, 13)} dirt`)
    await ctx.cmd(`/fill ${P(12, -2, 6)} ${P(20, -2, 12)} sand`)
    await ctx.cmd(`/fill ${P(16, -5, 9)} ${P(16, -3, 9)} air`)
    await ctx.cmd(`/fill ${P(15, -6, 8)} ${P(17, -6, 10)} stone`)
    await ctx.cmd(`/fill ${P(12, -1, 6)} ${P(20, 0, 12)} water`)
    await ctx.cmd(`/fill ${P(13, 0, 5)} ${P(17, 0, 5)} water`)
    await ctx.cmd(`/fill ${P(14, 0, 13)} ${P(19, 0, 13)} water`)
    await ctx.cmd(`/fill ${P(21, 0, 8)} ${P(21, 0, 10)} water`)
    await ctx.cmd(`/fill ${P(16, -5, 9)} ${P(16, -3, 9)} water`)
    for (const [a, b] of [[12, 6], [20, 6], [12, 12], [20, 12], [19, 6], [12, 11]]) await ctx.cmd(`/setblock ${P(a, 0, b)} grass_block`)
    // the lava pool (round 4): x -21..-16, z -15..-11, 2 deep, 3 in the middle
    await ctx.cmd(`/fill ${P(-22, -4, -16)} ${P(-15, -1, -10)} stone`)
    await ctx.cmd(`/fill ${P(-21, -2, -15)} ${P(-16, 0, -11)} lava`)
    await ctx.cmd(`/fill ${P(-19, -3, -14)} ${P(-18, -3, -12)} lava`)
    for (const [a, b] of [[-21, -15], [-16, -15], [-21, -11], [-16, -11]]) await ctx.cmd(`/setblock ${P(a, 0, b)} grass_block`)
    await ctx.cmd(`/fill ${P(-20, 0, -16)} ${P(-17, 0, -16)} lava`)
    // round 3's hole under the start spot (covered by the path block)
    await ctx.cmd(`/fill ${P(-9, -2, -1)} ${P(-9, -1, -1)} air`)
    await hs.fixGround(ctx, { X, Z, F })
    // the hiders
    await ctx.cmd('/kill @e[type=villager]')
    const hider = (tag, x, y, z, yaw, pitch, prof) => ctx.cmd(`/summon villager ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} {NoAI:1b,NoGravity:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b,Rotation:[${yaw}f,${pitch}f],Tags:["${tag}"],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1}`)
    // 0: the runner in the opening, who hides behind the tree
    await hider('h0', 3.5, 1, -5.2, -36, 0, 'farmer')
    // 1: in the middle of the 2x2 trunk, facing north, its head in the trunk's F+2 row
    await hider('h1', 7.0, 0.55, -4.0, 180, 0, 'farmer')
    // 2: at the bottom of the shaft (he rises on the reveal), facing west, toward the seeker
    await hider('h2', 16.5, -5, 9.5, 90, 0, 'fisherman')
    // 3: in the hole under the start spot, looking up
    await hider('h3', -8.5, -2.05, -0.5, 180, -85, 'nitwit')
    // 4: under the lava (he rises on the reveal), facing east, toward the seeker
    await hider('h4', -18.5, -3, -12.5, -90, 0, 'armorer')
    this.hider = hider
    await ctx.hotbar(['diamond_axe', 'diamond_shovel', ['bread', 12], ['torch', 16]])
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
    // the start: facing the tree, the runner in front
    await ctx.tpCheck(X + 0.5, F + 1, Z - 6.5, -69, 0)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x: X, y: 0, z: Z }   // y 0: edit.replay's fixed camera is relative to this, so its height is absolute (y 322)
  },

  // ---------------------------------------------------------------- the rounds
  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F } = this
    const W = (dx, dy, dz) => new Vec3(X + dx, F + dy, Z + dz)
    // the moves (lib/hide_seek.js): governed, eased looks that rest on each hiding spot (owner 2026-11-11, r:r38374d:
    // "the camera moves around so quickly ... confusing to try and follow"); doors and digs gated on the crosshair
    const M = hs.moves(ctx, { X, Z, F })
    const { go, look, openDoor, dig, hmm, found, drift, everyTick, rise } = M
    const tp = async (dx, dz, yaw, pitch) => { await ctx.tpCheck(X + dx, F + 1, Z + dz, yaw, pitch) }

    // ---- the opening: a villager runs off and hides behind the tree
    // (a few ticks of tiny moves first: a mob that hasn't moved reaches the client late)
    for (let i = 0; i < 6; i++) { bot.chat(`/execute as @e[tag=h0,limit=1] at @s run tp @s ~0.01 ~ ~0.005`); await bot.waitForTicks(1) }
    ctx.mark('r1_go')
    const path = [[3.5, -5.2], [5.6, -2.3], [9.4, -2.7]]
    const runner = everyTick(26, (i) => {
      const u = Math.min(1, i / 24) * 2, k = Math.min(1, Math.floor(u)), f = u - k   // two legs, 12 ticks each
      const x = path[k][0] + (path[k + 1][0] - path[k][0]) * f, z = path[k][1] + (path[k + 1][1] - path[k][1]) * f
      bot.chat(`/tp @e[tag=h0,limit=1] ${(X + x).toFixed(3)} ${F + 1} ${(Z + z).toFixed(3)}`)
    })
    for (let i = 0; i < 22; i++) { await bot.look(bot.entity.yaw + 0.004, bot.entity.pitch, true); await bot.waitForTicks(1) }   // watches him go, until he's behind the trunk
    await go(-2.5, -10.3)                        // H1's door
    await runner
    bot.chat(`/tp @e[tag=h0,limit=1] ${X + 300} ${F + 1} ${Z}`)   // (off camera: he's in the trunk now)
    await openDoor(-4, -11)
    await look(-7, 1.4, -11.5, 240)              // peek: an empty bed
    await bot.waitForTicks(4)
    await go(2.6, -10.3)                         // across the street: H2's door
    await openDoor(4, -11)
    await look(7, 1.4, -10.5, 240)
    await bot.waitForTicks(3)
    await go(2.6, -6.9, { pitch: -0.05, stop: 0.4 })   // back out into the street
    ctx.mark('r1_end')
    // the giveaway: the tree rustles and an apple drops out of it (dark oak leaves drop apples)
    bot.chat(`/summon item ${X + 5.2} ${F + 4.6} ${Z - 5.6} {Item:{id:"minecraft:apple",count:1},PickupDelay:400,Motion:[-0.04,0.05,-0.03]}`)
    const shake = everyTick(20, (i) => { if (i % 4 === 0) ctx.sound('block.grass.hit', 0.7, 0.8 + 0.05 * (i % 3)) })
    await look(5.6, 3.4, -5.9, 380)
    hmm(1)
    ctx.mark('r1_zoom')
    await go(5.6, -7.0, { stop: 0.3, face: [7.0, 2.4, -5.0] })
    await shake
    await look(6.5, 2.5, -5, 160)
    ctx.mark('r1_chop'); ctx.select(0)
    await dig(6, 2, -5, 8, 'dark_oak_log', 'wood')
    await look(7.5, 2.5, -5, 140)
    await dig(7, 2, -5, 8, 'dark_oak_log', 'wood')
    hmm(1.1)
    found(1)
    await look(7.0, 2.4, -4.3, 260)
    await drift(12)

    // ---- round 2: the pond (south-east)
    ctx.mark('cut1a')
    await tp(0.5, 6.5, 180, 10)
    await bot.waitForTicks(6)
    ctx.mark('cut1b')
    ctx.mark('r2_go')
    await go(2.4, 11.5)                          // H4's door (in line with the doorway, so the peek sees the room)
    await openDoor(4, 11)
    await look(7, 1.4, 11.5, 240)
    await bot.waitForTicks(3)
    await go(2.4, 6.9)                           // (round H4's corner)
    await go(8.0, 7.2)                           // behind the hay
    await look(9.5, 0.8, 5.5, 240)
    await bot.waitForTicks(3)
    ctx.mark('r2_end')
    await look(16.5, 0.9, 9.5, 360)              // ...bubbles on the pond
    const bubbles = everyTick(40, (i) => {
      if (i % 2 === 0) ctx.particles('bubble', W(16.5, 0.2, 9.5), { count: 4, spread: 0.3 })
      if (i % 3 === 0) ctx.particles('bubble_pop', W(16.5, 0.9, 9.5), { count: 3, spread: 0.35 })
      if (i % 6 === 0) ctx.sound('block.bubble_column.upwards_ambient', 0.8, 0.9 + 0.05 * (i % 4))
    })
    ctx.mark('r2_zoom')
    const up2 = rise('h2', 4.4, 26)             // he rises out of the shaft as the seeker walks up
    await go(11.6, 9.5, { sprint: false, stop: 0.35, face: [16.5, 1.3, 9.5] })
    await up2
    ctx.particles('splash', W(16.5, 1, 9.5), { count: 24 }); ctx.sound('entity.player.splash', 0.8, 1.2)
    hmm(0.8)
    found(2)
    await drift(14)
    await bubbles

    // ---- round 3: under my feet (west, by the bell stall)
    ctx.mark('cut2a')
    await ctx.cmd('/gamerule block_drops false')   // the path's dirt drop floated over his face
    await tp(-8.5, -0.5, 90, 0)
    await bot.waitForTicks(6)
    ctx.mark('cut2b')
    ctx.mark('r3_go')
    await go(-10.8, -0.5)                        // the stall
    await look(-14, 3.2, -0.5, 240)              // up at the bell
    await look(-17.5, 1.0, 2.5, 240)
    await go(-10.8, 6.6)                         // behind the tree
    await look(-15, 1.2, 9.5, 240)
    await bot.waitForTicks(3)
    await go(-8.5, -0.3, { stop: 0.3 })          // back to the start
    ctx.mark('r3_end')
    await M.turn(Math.PI / 2 + 0.4, 0)   // looks around: nobody
    // the giveaway: something knocks under the path block, crumbs jump up
    const knock = everyTick(16, (i) => { if (i % 5 === 0) { ctx.particles('block', W(-9, 0, -1), { block: 'dirt_path' }); ctx.sound('block.grass.hit', 0.9, 0.7) } })
    await look(-8.5, 0, -0.5, 280)
    ctx.mark('r3_zoom')
    bot.setControlState('back', true); await bot.waitForTicks(4); bot.setControlState('back', false)   // a step back off it
    await knock
    hmm(0.7)
    ctx.select(1)
    ctx.mark('r3_dig')
    await dig(-9, 0, -1, 3, 'dirt_path', 'grass')
    hmm(1.2)
    found(3)
    // a step forward to the hole's edge (still on the block beside it), and straight down at his face
    for (let i = 0; i < 8 && bot.entity.position.z > Z + 0.33; i++) { bot.setControlState('forward', true); bot.setControlState('sneak', true); await bot.waitForTicks(1) }
    bot.setControlState('forward', false); bot.setControlState('sneak', false)
    await look(-8.5, -0.3, -0.55, 220)
    await drift(10, 0.08)

    // ---- round 4: the lava pool (north-west)
    ctx.mark('cut3a')
    await ctx.cmd('/gamerule block_drops true')
    await tp(-10.5, -5.5, 180, 0)
    await bot.waitForTicks(6)
    ctx.mark('cut3b')
    ctx.mark('r4_go')
    await go(-11.0, -12.5)                       // up the side of H1
    await look(-13, 4.0, -18, 280)               // up into the tree ahead
    await go(-11.5, -15.3, { face: [-13, 4.0, -18], stop: 0.4 })   // ...walking under it, still looking up
    await bot.waitForTicks(3)
    ctx.mark('r4_end')
    // the giveaway: the lava pops, and a burning head peeks out of it and sinks back
    const pops = everyTick(40, (i) => {
      if (i % 5 === 0) { ctx.sound('block.lava.pop', 1, 0.8 + 0.1 * (i % 3)); ctx.particles('lava', W(-18.5, 0.95, -12.5), { count: 2, spread: 1.6 }) }
    })
    const peek = (async () => { await rise('h4', 1.5, 6); await bot.waitForTicks(6); await rise('h4', -1.5, 6) })()
    await look(-18.5, 0.8, -12.5, 300)
    ctx.mark('r4_zoom')
    const walk = go(-14.2, -13.0, { sprint: false, stop: 0.35, face: [-18.5, 1.2, -12.5] })   // walking over while the head peeks
    await peek
    await rise('h4', 2.6, 18)                   // ...and he comes up, on fire
    await walk
    hmm(0.9)
    found(4)
    await pops
    await drift(18)

    // ---- round 5: the pillar (built now, off camera)
    ctx.mark('cut4a')
    await ctx.cmd('/gamemode creative')
    // the pillar: (-3, 6), from the ground to build limit (y 319); the villager stands on top, looking down
    for (let y = 1; y <= 319 - F; y += 100) await ctx.cmd(`/fill ${X - 3} ${F + y} ${Z + 6} ${X - 3} ${Math.min(319, F + y + 99)} ${Z + 6} dirt`)
    await this.hider('h5', -2.5, 320 - F, 6.5, -135, 40, 'librarian')   // side-on to the replay camera, looking down
    await tp(-0.5, 5.5, 70, 0)                   // the pillar ahead on the right: it's in shot from the start
    await ctx.cmd('/gamemode survival')
    await bot.waitForTicks(20)
    ctx.select(0)
    ctx.mark('cut4b')
    ctx.mark('r5_go')
    await go(-1.4, 11.5)                         // H3's door (in line with the doorway)
    await openDoor(-4, 11)
    await look(-7, 1.4, 11.5, 240)
    await bot.waitForTicks(3)
    await go(0.5, 7.4, { stop: 0.4 })            // back to the start
    ctx.mark('r5_end')
    // an emerald drops out of the sky, right beside the pillar
    bot.chat(`/summon item ${X - 1.6} ${F + 7} ${Z + 6.5} {Item:{id:"minecraft:emerald",count:1},PickupDelay:200,Motion:[0.0,-0.3,0.0]}`)
    ctx.sound('entity.item.pickup', 0.6, 0.5)   // (a cue for the turn: the falling emerald whooshes past)
    await look(-1.6, 4.5, 6.5, 260)
    await look(-1.6, 0.3, 6.5, 300)
    // ...and up the pillar, fast
    await look(-2.5, 30, 6.5, 260)
    ctx.mark('r5_zoom')
    await look(-1.6, 321.0 - F, 6.5, 300)
    hmm(0.9)
    found(5)
    // up there (seen in the zoom-out replay): he tosses emeralds down, laughing (happy particles), and
    // turns his head from the seeker below to the camera
    // (thrown at the replay camera, so they fly past the lens: a fixed shot of a still villager read as a pause)
    const up = everyTick(24, (i) => {
      if (i % 4 === 0) bot.chat(`/summon item ${X - 1.8 + 0.15 * (i % 3)} ${321.0 + 0.3 * (i % 2)} ${Z + 6.9} {Item:{id:"minecraft:${['emerald', 'diamond', 'gold_ingot', 'apple', 'bread', 'iron_ingot'][i / 4]}",count:1},PickupDelay:200,Motion:[${(0.24 + 0.03 * (i % 3)).toFixed(2)},0.3,${(0.25 + 0.02 * (i % 5)).toFixed(2)}]}`)
      if (i % 6 === 0) ctx.particles('happy', W(-2.5, 322.4 - F, 6.5))
    })
    for (let i = 0; i < 24; i++) {
      if (i === 8) ctx.mark('face_on', { near: [X - 2.5, Z + 6.5, 1.5] })   // ...and he turns round to the camera
      await bot.look(bot.entity.yaw + 0.004 * Math.sin(i / 3), bot.entity.pitch, true); await bot.waitForTicks(1)
    }
    await up
    return true
  }
}
