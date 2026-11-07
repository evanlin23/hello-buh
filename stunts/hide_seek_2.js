// "hide and seek but the villagers cheated again 😭" (~32 s, worker 16): the series' second Short
// (stunts/hide_seek.js was the first), in a snowy village from vanilla's snowy village templates.
// It opens on a villager running off to hide behind the snowman. Five rounds on a countdown; each
// time something on screen gives the hider away, and every spot is more impossible:
//   1. inside the (2x2) snowman: its pumpkin head turns to look at the seeker; two shovel digs, a face
//   2. under the frozen lake: knocking under the ice, a face looking up through it; break the ice, he bobs up
//   3. sunk in powder snow: puffs of snow, he rises out of it
//   4. frozen inside the ice statue, in plain sight all round: his head turns inside the ice
//   5. at the bottom of a 1x1 hole to bedrock: a snowball flies up out of it; a third-person shot at
//      the bottom shows him down there (an edit.replay with a fixed camera)
// Hiders are NoAI, Invulnerable, NoGravity villagers (lib/hide_seek.js); the sets are built with
// commands before the recording (the hole is dug in the cut before round 5).
const hs = require('../lib/hide_seek')
const R = [1, 2, 3, 4, 5]
const BOTTOM = -59                 // the cave at the bottom of the hole: floor (bedrock) at y -60

module.exports = {
  name: 'hide_seek_2',
  biome: process.env.BIOME || 'minecraft:snowy_plains',
  caption: 'hide and seek but the villagers cheated again 😭',
  recordRadius: 150,   // (the default 8-chunk view; the bot visits the cave in a cut so the renderer meshes down to it)
  botTimeout: 900,
  time: 2500,
  fovZoom: [['r1_zoom', 'r1_dig:-0.3', 1.6], ['r2_zoom', 'r2_found:0.6', 1.8], ['r3_zoom', 'r3_found:0.7', 1.7],
    ['r4_zoom', 'r4_found:0.7', 2.2], ['r5_zoom', 'r5_found:0.3', 3]],
  edit: {
    caption: 'hide and seek but the villagers cheated again 😭', red: 'again',
    song: 'songs/funk_abnormal.mp3', dropAt: 'r5_found',
    startAt: 'r1_go:0', endAfter: 'r5_found:0.25',
    // the bottom of the hole, from a fixed camera in the little cave (absolute y: the set origin's y is 0)
    replay: { at: 'r5_found', before: 0.05, after: 0.85, cam: '8.3,-57.4,8.3,45,-12', speed: 1, label: 'MEANWHILE AT BEDROCK' },
    speed: [1, 2, 3, 4].map(n => [`cut${n}a`, `cut${n}b`, 'cut']),
    clock: R.map((n, i) => [`r${n}_go`, `r${n}_end`, [5, 4, 4, 4, 3][i], `ROUND ${n}`, 'down']),
    counter: { at: R.map(n => `r${n}_found`), total: R.length },
    cards: [['r1_found', 'IN THE SNOWMAN 😭', 0.9, 'yellow'], ['r2_found', 'UNDER THE ICE 🥶', 0.9, 'blue'],
      ['r3_found', 'IN THE SNOW 😭', 0.9, 'white'], ['r4_found', 'FROZEN SOLID 🥶', 0.9, 'blue']],
    punch: R.map(n => `r${n}_found`),
    subs: [['r1_end', 'where did he go', 0.9], ['r2_end', 'nobody', 0.9], ['r3_end', 'not here either', 0.9],
      ['r4_end', 'come on', 0.9], ['r5_end', 'what was that', 0.9]],
    subsY: 0.62
  },

  // ---------------------------------------------------------------- set
  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const site = await hs.findFlat(ctx)
    const { X, Z, F } = site
    Object.assign(this, site)
    for (const c of ['/gamerule log_admin_commands false', '/gamerule random_tick_speed 0', '/gamerule fire_spread_radius_around_player 0', '/difficulty peaceful']) await ctx.cmd(c)
    await hs.clearField(ctx, site, { biome: 'minecraft:snowy_plains', taper: 6 })
    const S = hs.set(ctx, site), P = S.P
    // a thin snow cover everywhere (before the pieces: their own air clears it inside them)
    for (let z0 = Z - 72; z0 <= Z + 72; z0 += 24) { bot.chat(`/fill ${X - 72} ${F + 1} ${z0} ${X + 72} ${F + 1} ${Math.min(Z + 72, z0 + 23)} snow`); await ctx.sleep(300) }
    // streets (no snow on them)
    await ctx.cmd(`/fill ${P(-1, 0, -26)} ${P(1, 0, 26)} dirt_path`); await ctx.cmd(`/fill ${P(-1, 1, -26)} ${P(1, 1, 26)} air`)
    await ctx.cmd(`/fill ${P(-10, 0, -1)} ${P(26, 0, 1)} dirt_path`); await ctx.cmd(`/fill ${P(-10, 1, -1)} ${P(26, 1, 1)} air`)
    await S.tpl('snowy/town_centers/snowy_meeting_point_3', -3, -3, 'none', [[0, 0, 1, 'grass_block'], [1, 0, 0, 'grass_block'], [1, 0, 1, 'dirt_path'], [1, 0, 5, 'dirt_path'], [6, 0, 6, 'grass_block'], [0, 1, 3, 'air'], [3, 1, 0, 'air'], [3, 1, 6, 'air'], [6, 1, 3, 'air']])
    await S.tpl('snowy/houses/snowy_small_house_6', -3, -8, '180', [[0, 0, 3, 'dirt_path'], [3, 0, 3, 'spruce_planks']])   // H1: x -9..-3, z -14..-8, door (-4, -11)
    await S.tpl('snowy/houses/snowy_small_house_7', 3, -14, 'none', [[0, 0, 3, 'dirt_path'], [2, 0, 3, 'stripped_spruce_log']])   // H2: x 3..8, door (4, -11)
    await S.tpl('snowy/houses/snowy_fletcher_house_1', -3, 14, '180', [[0, 0, 3, 'dirt_path']])   // H3: x -11..-3, z 8..14, door (-4, 11)
    await S.tpl('snowy/houses/snowy_armorer_house_1', 3, 8, 'none', [[0, 0, 3, 'dirt_path']])     // H4: x 3..10, z 8..14, door (4, 11)
    // spruce trees
    const spruce = async (dx, dz, h) => {
      for (let k = 0; k < 3; k++) {
        const y = h - 4 + k * 2, r = 2 - k
        await ctx.cmd(`/fill ${P(dx - r, y, dz - r)} ${P(dx + r, y, dz + r)} spruce_leaves[persistent=true]`)
        if (r > 0) for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r]]) await ctx.cmd(`/setblock ${P(dx + a, y, dz + b)} air`)
      }
      await ctx.cmd(`/setblock ${P(dx, h, dz)} spruce_leaves[persistent=true]`)
      await ctx.cmd(`/fill ${P(dx, 1, dz)} ${P(dx, h - 2, dz)} spruce_log`)
    }
    await spruce(-15, 8, 8); await spruce(13, 17, 7); await spruce(-14, -17, 7); await spruce(16, -6, 8)
    // barrels and a woodpile (round 2's look-behind)
    await ctx.cmd(`/fill ${P(9, 1, 4)} ${P(10, 1, 4)} barrel[facing=up]`); await ctx.cmd(`/setblock ${P(9, 2, 4)} barrel[facing=up]`)
    await ctx.cmd(`/fill ${P(9, 1, 5)} ${P(10, 1, 5)} stripped_spruce_log[axis=x]`)
    // 1: the snowman, 2x2 snow blocks, 2 high, a carved pumpkin head (facing west to start)
    // (the top layer is full snow layers, not snow blocks: a carved pumpkin on two stacked snow blocks
    // turns into a real snow golem, as in vanilla, and it walked off with the snowman)
    await ctx.cmd(`/fill ${P(6, 1, -5)} ${P(7, 1, -4)} snow_block`)
    await ctx.cmd(`/fill ${P(6, 2, -5)} ${P(7, 2, -4)} snow[layers=8]`)
    await ctx.cmd(`/setblock ${P(7, 3, -5)} carved_pumpkin[facing=west]`)
    // 2: the frozen lake (ice over 2 of water), uneven edges
    await ctx.cmd(`/fill ${P(11, -3, 5)} ${P(21, -1, 13)} dirt`); await ctx.cmd(`/fill ${P(11, 1, 5)} ${P(21, 1, 13)} air`)
    await ctx.cmd(`/fill ${P(12, -3, 6)} ${P(20, -3, 12)} gravel`)
    await ctx.cmd(`/fill ${P(12, -2, 6)} ${P(20, -1, 12)} water`)
    await ctx.cmd(`/fill ${P(12, 0, 6)} ${P(20, 0, 12)} ice`)
    await ctx.cmd(`/fill ${P(13, 0, 5)} ${P(17, 0, 5)} ice`); await ctx.cmd(`/fill ${P(14, 0, 13)} ${P(19, 0, 13)} ice`)
    for (const [a, b] of [[12, 6], [20, 6], [12, 12], [20, 12], [19, 6]]) await ctx.cmd(`/setblock ${P(a, 0, b)} grass_block`)
    // 3: the powder snow patch (west, by H1), 3x3, 2 deep
    await ctx.cmd(`/fill ${P(-13, -1, -4)} ${P(-11, 0, -2)} powder_snow`); await ctx.cmd(`/fill ${P(-13, 1, -4)} ${P(-11, 1, -2)} air`)
    // 4: the ice statue (south-west), 3x3x4 of ice
    await ctx.cmd(`/fill ${P(-14, 1, 3)} ${P(-12, 4, 5)} ice`)
    await hs.fixGround(ctx, site)
    await ctx.cmd('/kill @e[type=villager]'); await ctx.cmd('/kill @e[type=snow_golem]')
    await S.hider('h0', 3.5, 1.06, -6.2, -55, 0, 'farmer', 'snow')               // the runner
    await S.hider('h1', 7.0, 0.55, -4.0, 180, 0, 'farmer', 'snow')               // in the snowman
    await S.hider('h2', 16.5, -2.0, 9.5, 90, -60, 'fisherman', 'snow')           // under the ice, looking up
    await S.hider('h3', -11.5, -1.9, -2.5, 90, 0, 'shepherd', 'snow')            // in the powder snow
    await S.hider('h4', -12.5, 1.6, 4.5, -90, 0, 'cleric', 'snow')               // in the ice statue
    this.S = S
    await ctx.hotbar(['diamond_shovel', 'diamond_pickaxe', ['bread', 12], ['torch', 16]])
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
    await ctx.tpCheck(X + 0.5, F + 1, Z - 6.5, -69, 0)   // facing the snowman, the runner in front
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x: X, y: 0, z: Z }   // y 0: edit.replay's fixed camera is relative to this, so its height is absolute
  },

  // ---------------------------------------------------------------- the rounds
  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F, S } = this
    const m = hs.moves(ctx, this), { go, look, W } = m

    // ---- the opening: a villager runs off and hides behind the snowman
    for (let i = 0; i < 6; i++) { bot.chat(`/execute as @e[tag=h0,limit=1] at @s run tp @s ~0.01 ~ ~0.005`); await bot.waitForTicks(1) }
    ctx.mark('r1_go')
    const path = [[3.5, -6.2], [5.3, -2.6], [9.4, -2.7]]
    const runner = m.everyTick(26, (i) => {
      const u = Math.min(1, i / 24) * 2, k = Math.min(1, Math.floor(u)), f = u - k   // two legs, 12 ticks each
      bot.chat(`/tp @e[tag=h0,limit=1] ${(X + path[k][0] + (path[k + 1][0] - path[k][0]) * f).toFixed(3)} ${F + 1.06} ${(Z + path[k][1] + (path[k + 1][1] - path[k][1]) * f).toFixed(3)}`)
    })
    for (let i = 0; i < 16; i++) { await bot.look(bot.entity.yaw + 0.004, bot.entity.pitch, true); await bot.waitForTicks(1) }
    await go(-2.5, -10.3)                        // H1's door
    await runner
    bot.chat(`/tp @e[tag=h0,limit=1] ${X + 300} ${F + 1} ${Z}`)   // (off camera: he's in the snowman now)
    await m.openDoor(-4, -11)
    await look(-7, 1.4, -11.5, 240)
    await bot.waitForTicks(4)
    await go(2.6, -10.3)                         // across the street: H2's door
    await m.openDoor(4, -11)
    await look(6.5, 1.4, -10.5, 240)
    await bot.waitForTicks(3)
    await go(1.7, -9.6, { pitch: -0.05, stop: 0.4 })   // back out onto the street (H2's porch has a lantern and slabs)
    await go(2.0, -6.5, { pitch: -0.05, stop: 0.4 })
    ctx.mark('r1_end')
    // the giveaway: the snowman's head turns to look at him
    await ctx.cmd(`/setblock ${X + 7} ${F + 3} ${Z - 5} carved_pumpkin[facing=north]`)
    ctx.sound('block.wood.place', 0.8, 0.7)
    await look(7.5, 3.5, -4.5, 360)
    m.hmm(1)
    ctx.mark('r1_zoom')
    await go(5.6, -6.5, { stop: 0.3, face: [7.0, 2.4, -5.0] })
    await look(6.5, 2.5, -5, 160)
    ctx.mark('r1_dig'); ctx.select(0)
    await m.dig(6, 2, -5, 2, 'snow', 'snow')
    await look(7.5, 2.5, -5, 140)
    await m.dig(7, 2, -5, 2, 'snow', 'snow')
    m.hmm(1.1)
    m.found(1)
    await look(7.0, 2.4, -4.3, 260)
    await m.drift(14)

    // ---- round 2: the frozen lake (south-east)
    await m.cut(1, 0.5, 6.5, 180, 10)
    ctx.mark('r2_go')
    await go(2.4, 11.5)                          // H4's door (in line with the doorway, so the peek sees the room)
    await m.openDoor(4, 11)
    await look(7, 1.4, 11.5, 240)
    await bot.waitForTicks(3)
    await go(2.4, 6.6)                           // (round H4's corner)
    await go(8.0, 6.6)                           // behind the barrels
    await look(9.5, 0.8, 5.0, 240)
    await bot.waitForTicks(3)
    ctx.mark('r2_end')
    // the giveaway: something knocks under the ice
    const knock = m.everyTick(30, (i) => { if (i % 6 === 0) { ctx.particles('block', W(16, 0, 9), { block: 'ice' }); ctx.sound('block.glass.hit', 1, 0.8 + 0.05 * (i % 3)) } })
    await look(16.5, 0.9, 9.5, 360)
    await go(11.4, 6.9, { sprint: false, stop: 0.4, face: [16.5, 0.6, 9.5] })
    await go(13.8, 9.5, { sprint: false, stop: 0.35, face: [16.5, 0.6, 9.5] })   // out onto the ice
    ctx.mark('r2_zoom')
    await knock
    ctx.select(1)
    await look(16.5, 0.6, 9.5, 160)
    await m.dig(16, 0, 9, 2, 'ice', 'glass')     // the ice breaks into water
    await m.rise('h2', 1.4, 12)
    m.hmm(0.8)
    m.found(2)
    await m.drift(16)

    // ---- round 3: the powder snow (west)
    await m.cut(2, -6.5, -0.5, 90, 0, () => ctx.cmd('/gamerule block_drops false'))
    ctx.mark('r3_go')
    await go(-10.8, -6.8)                        // behind H1
    await look(-6, 1.2, -15.5, 240)
    await bot.waitForTicks(3)
    await go(-1.8, -2.4)                         // the bell
    await look(0, 3.2, 0, 260)
    await bot.waitForTicks(3)
    ctx.mark('r3_end')
    const puffs = m.everyTick(30, (i) => { if (i % 5 === 0) { ctx.particles('block', W(-12, 0, -3), { block: 'powder_snow' }); ctx.sound('block.powder_snow.step', 1, 0.8 + 0.1 * (i % 3)) } })
    await look(-11.5, 0.8, -2.5, 380)
    ctx.mark('r3_zoom')
    await go(-8.6, -2.5, { sprint: false, stop: 0.35, face: [-11.5, 1.0, -2.5] })
    await puffs
    await m.rise('h3', 1.9, 18)                  // he rises out of the snow
    ctx.particles('block', W(-12, 0, -3), { block: 'powder_snow' })
    m.hmm(0.9)
    m.found(3)
    await m.drift(14)

    // ---- round 4: the ice statue (south-west)
    await m.cut(3, -1.5, 4.5, 90, 0, () => ctx.cmd('/gamerule block_drops true'))
    ctx.mark('r4_go')
    await go(-1.4, 11.5)                         // H3's door (in line with the doorway)
    await m.openDoor(-4, 11)
    await look(-7, 1.4, 11.5, 240)
    await bot.waitForTicks(3)
    await go(-1.2, 9.6, { stop: 0.4 })            // back out onto the street
    await go(-1.6, 6.9)                          // (round H3's corner)
    await go(-12.6, 6.9)                         // along the front of H3
    await look(-12.2, 1.2, 15, 240)
    await bot.waitForTicks(3)
    ctx.mark('r4_end')
    // the giveaway: inside the ice statue, a head turns to look at him
    ctx.mark('face_on', { near: [X - 12.5, Z + 4.5, 1.2], head: true })
    m.hmm(0.8)
    await look(-12.5, 2.9, 4.5, 360)
    ctx.mark('r4_zoom')
    await go(-12.5, 6.4, { sprint: false, stop: 0.3, face: [-12.5, 2.9, 4.5] })
    m.found(4)
    ctx.sound('block.glass.hit', 0.8, 0.6)
    await m.drift(18)

    // ---- round 5: the hole to bedrock (dug now, off camera)
    ctx.mark('face_off')
    await m.cut(4, 8.5, 1.5, 90, 0, async () => {
      await ctx.cmd('/gamemode creative')
      // a little cave at the bottom: bedrock floor, torches, a lava pocket; the hole up to the village
      await ctx.cmd(`/fill ${X + 3} ${BOTTOM - 1} ${Z + 3} ${X + 9} ${BOTTOM + 4} ${Z + 9} stone`)
      await ctx.cmd(`/fill ${X + 4} ${BOTTOM - 1} ${Z + 4} ${X + 8} ${BOTTOM - 1} ${Z + 8} bedrock`)
      await ctx.cmd(`/fill ${X + 4} ${BOTTOM} ${Z + 4} ${X + 8} ${BOTTOM + 3} ${Z + 8} air`)
      await ctx.cmd(`/fill ${X + 4} ${BOTTOM} ${Z + 4} ${X + 4} ${BOTTOM} ${Z + 5} lava`)
      for (const [a, b] of [[8, 4], [4, 8], [8, 8]]) await ctx.cmd(`/setblock ${X + a} ${BOTTOM} ${Z + b} torch`)
      await ctx.cmd(`/fill ${X + 5} ${BOTTOM + 4} ${Z + 5} ${X + 5} ${F} ${Z + 5} air`)
      // the bot pops down to the cave and back (cut from the video): render.js meshes from 24 below the lowest
      // point the bot ever stands, and without this the cave wasn't meshed at all
      await ctx.cmd(`/tp @s ${X + 7.5} ${BOTTOM} ${Z + 7.5}`); await bot.waitForTicks(10)
      await ctx.cmd(`/summon villager ${X + 5.5} ${BOTTOM} ${Z + 5.5} {NoAI:1b,NoGravity:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b,Rotation:[-45f,-60f],Tags:["h5"],VillagerData:{profession:"minecraft:mason",type:"minecraft:snow",level:2},Xp:1}`)
    })
    await ctx.cmd('/gamemode survival')
    await bot.waitForTicks(20)
    ctx.select(1)
    ctx.mark('r5_go')
    await go(3.6, 0.3)                           // the bell
    await look(0, 3.2, 0, 240)
    await bot.waitForTicks(3)
    await go(8.2, 6.2)                           // behind the barrels again
    await look(9.5, 0.8, 4.4, 240)
    ctx.mark('r5_end')
    // a snowball flies up out of the hole
    bot.chat(`/summon snowball ${X + 5.5} ${F - 3} ${Z + 5.5} {Motion:[0.0,1.4,0.0]}`)
    ctx.sound('entity.snowball.throw', 0.7, 0.6)
    await look(5.5, 6, 5.5, 280)
    await look(5.5, 1.5, 5.5, 240)
    await go(6.8, 6.6, { sprint: false, stop: 0.3, face: [5.5, 0, 5.5] })   // to the hole's edge
    ctx.mark('r5_zoom')
    await look(5.5, -20, 5.5, 300)               // ...straight down it
    m.hmm(0.7)
    m.found(5)
    // down there (seen in the replay): he throws snowballs up the shaft, then turns to the camera
    const down = m.everyTick(24, (i) => {
      if (i % 5 === 0) bot.chat(`/summon snowball ${X + 5.5} ${BOTTOM + 1.6} ${Z + 5.5} {Motion:[0.0,1.3,0.0]}`)
      if (i % 3 === 0) ctx.particles('happy', new ctx.Vec3(X + 5.5, BOTTOM + 2.1, Z + 5.5))
      if (i % 4 === 0) ctx.particles('lava', new ctx.Vec3(X + 4.5, BOTTOM + 0.95, Z + 5.0), { count: 2, spread: 0.6 })
      if (i === 8) ctx.mark('face_on', { near: [X + 5.5, Z + 5.5, 1.2] })
    })
    for (let i = 0; i < 24; i++) { await bot.look(bot.entity.yaw + 0.004 * Math.sin(i / 3), bot.entity.pitch, true); await bot.waitForTicks(1) }
    await down
    return true
  }
}
