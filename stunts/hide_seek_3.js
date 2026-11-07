// "hide and seek but the villagers cheated (desert) 😭" (~32 s, worker 16): the series' third Short
// (hide_seek.js, hide_seek_2.js), in a desert village from vanilla's desert village templates.
// It opens on a villager running off to hide behind the hay. Five rounds on a countdown; each time
// something on screen gives the hider away, and every spot is more impossible:
//   1. inside the hay stack (2x2): it rustles; two cuts with the hoe, a face
//   2. buried in a sand mound: sand trickles off it; one dig, a face looking up out of the sand
//   3. down the well (a shaft under the meeting point's pool): bubbles, he rises out of the water
//   4. INSIDE the iron golem: the golem says "hmm"; one hit, the golem falls over and he's standing there
//   5. up in the clouds: a wheat item drifts down out of the sky; a third-person shot up at y 197 shows him
//      sitting on top of the cloud layer (an edit.replay with a fixed camera)
// Hiders are NoAI, Invulnerable, NoGravity villagers (lib/hide_seek.js); the set is built with
// commands before the recording.
const hs = require('../lib/hide_seek')
const R = [1, 2, 3, 4, 5]
const CLOUD = 196.4              // the top of vanilla's fancy clouds (192.33 + 4) and a little

module.exports = {
  name: 'hide_seek_3',
  biome: process.env.BIOME || 'minecraft:desert',
  caption: 'hide and seek but the villagers cheated (desert) 😭',
  renderDistance: 12, recordRadius: 200,
  botTimeout: 900,
  time: 3000,
  fovZoom: [['r1_zoom', 'r1_dig:-0.3', 1.6], ['r2_zoom', 'r2_found:0.6', 1.8], ['r3_zoom', 'r3_found:0.6', 1.7],
    ['r4_zoom', 'r4_found:0.7', 1.6], ['r5_zoom', 'r5_found:0.3', 3]],
  edit: {
    caption: 'hide and seek but the villagers cheated (desert) 😭', red: 'desert',
    song: 'songs/funk_abnormal.mp3', dropAt: 'r5_found',
    startAt: 'r1_go:0', endAfter: 'r5_found:0.25',
    // up on the clouds, from a fixed camera beside him (absolute y: the set origin's y is 0)
    replay: { at: 'r5_found', before: 0.05, after: 0.85, cam: '9.5,199.5,10.5,45,-30', speed: 1, label: 'MEANWHILE ON A CLOUD' },
    speed: [1, 2, 3, 4].map(n => [`cut${n}a`, `cut${n}b`, 'cut']),
    clock: R.map((n, i) => [`r${n}_go`, `r${n}_end`, [5, 4, 4, 4, 3][i], `ROUND ${n}`, 'down']),
    counter: { at: R.map(n => `r${n}_found`), total: R.length },
    cards: [['r1_found', 'IN THE HAY 😭', 0.8, 'yellow'], ['r2_found', 'IN THE SAND 😭', 0.8, 'gold'],
      ['r3_found', 'DOWN THE WELL 😭', 0.8, 'blue'], ['r4_found', 'INSIDE THE GOLEM 💀', 0.9, 'red']],
    punch: R.map(n => `r${n}_found`),
    subs: [['r1_end', 'where did he go', 0.9], ['r2_end', 'empty', 0.9], ['r3_end', 'nope', 0.9],
      ['r4_end', 'where is he', 0.9], ['r5_end', 'huh?', 0.9]],
    subsY: 0.62
  },

  // ---------------------------------------------------------------- set
  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const site = await hs.findSite(ctx, 'minecraft:desert')
    const { X, Z, F } = site
    Object.assign(this, site)
    for (const c of ['/gamerule log_admin_commands false', '/gamerule random_tick_speed 0', '/gamerule fire_spread_radius_around_player 0', '/difficulty peaceful']) await ctx.cmd(c)
    await hs.clearField(ctx, site, { biome: 'minecraft:desert', top: 'sand', under: 'sandstone', taper: 6 })
    const S = hs.set(ctx, site), P = S.P
    // streets of smooth sandstone (round the meeting point)
    await ctx.cmd(`/fill ${P(-1, 0, -26)} ${P(1, 0, -5)} smooth_sandstone`); await ctx.cmd(`/fill ${P(-1, 0, 5)} ${P(1, 0, 26)} smooth_sandstone`)
    await ctx.cmd(`/fill ${P(-26, 0, -1)} ${P(-9, 0, 1)} smooth_sandstone`); await ctx.cmd(`/fill ${P(9, 0, -1)} ${P(26, 0, 1)} smooth_sandstone`)
    // the meeting point (bell and the well's pool), x -8..8, z -4..4; the pool at (3..5, -1..1)
    await S.tpl('desert/town_centers/desert_meeting_point_1', -8, -4, 'none', [[8, 0, 4, 'smooth_sandstone'], [9, 0, 1, 'smooth_sandstone'], [11, 0, 0, 'smooth_sandstone'], [15, 0, 1, 'smooth_sandstone'], [15, 0, 7, 'smooth_sandstone'], [9, 1, 6, 'air'],
      [7, 1, 2, 'air'], [7, 1, 3, 'air'], [7, 1, 4, 'air'], [7, 1, 5, 'air'], [7, 1, 6, 'air'], [12, 1, 0, 'air'], [12, 1, 8, 'air'], [16, 1, 4, 'air']])
    await S.tpl('desert/houses/desert_small_house_1', -3, -9, '180', [[3, 0, 2, 'smooth_sandstone']])   // H1: x -8..-3, z -13..-9, door (-4, -11)
    await S.tpl('desert/houses/desert_small_house_1', 3, -13, 'none', [[3, 0, 2, 'smooth_sandstone']])  // H2: x 3..8, z -13..-9, door (4, -11)
    await S.tpl('desert/houses/desert_small_house_2', -2, 13, '180', [[0, 0, 3, 'sand'], [1, 0, 1, 'sand']])   // H3: x -8..-2, z 9..13, door (-4, 11)
    await S.tpl('desert/houses/desert_small_house_2', 2, 9, 'none', [[0, 0, 3, 'sand'], [1, 0, 1, 'sand']])    // H4: x 2..8, z 9..13, door (4, 11)
    // cacti and dead bushes about
    for (const [a, b, h] of [[-15, -8, 3], [14, 6, 2], [-17, 12, 3], [17, -14, 2], [11, 17, 3], [-12, -17, 2]]) await ctx.cmd(`/fill ${P(a, 1, b)} ${P(a, h, b)} cactus`)
    for (const [a, b] of [[-6, 6], [10, -4], [-14, 3], [6, 18], [-19, -3]]) await ctx.cmd(`/setblock ${P(a, 1, b)} dead_bush`)
    // 1: the hay stack, 2x2x2 (6..7, -6..-5)
    await ctx.cmd(`/fill ${P(6, 1, -6)} ${P(7, 2, -5)} hay_block`)
    // 2: the sand mound (west), 3x3 + a plus on top
    await ctx.cmd(`/fill ${P(-12, 1, -14)} ${P(-10, 1, -12)} sand`)
    for (const [a, b] of [[-11, -14], [-12, -13], [-11, -13], [-10, -13], [-11, -12]]) await ctx.cmd(`/setblock ${P(a, 2, b)} sand`)
    // 3: the well: a shaft under the middle of the pool (4, 0)
    await ctx.cmd(`/fill ${P(3, -6, -1)} ${P(5, -1, 1)} sandstone`)
    await ctx.cmd(`/fill ${P(4, -5, 0)} ${P(4, 0, 0)} water`)
    await hs.fixGround(ctx, site, { top: 'sand' })
    await ctx.cmd('/kill @e[type=villager]'); await ctx.cmd('/kill @e[type=iron_golem]')
    await S.hider('h0', 3.5, 1, -7.2, -40, 0, 'farmer', 'desert')                // the runner
    await S.hider('h1', 7.0, 0.55, -5.0, 180, 0, 'farmer', 'desert')             // in the hay
    await S.hider('h2', -10.5, 0.05, -12.5, 0, -85, 'shepherd', 'desert')        // in the sand, looking up
    await S.hider('h3', 4.5, -5, 0.5, -90, 0, 'fisherman', 'desert')             // down the well
    await S.hider('h4', -12.5, 1, 5.5, -90, 0, 'mason', 'desert')                // inside the golem
    await ctx.cmd(`/summon iron_golem ${X - 12.5} ${F + 1} ${Z + 5.5} {NoAI:1b,PersistenceRequired:1b,PlayerCreated:1b,Rotation:[-90f,0f],Tags:["golem"]}`)
    this.S = S
    await ctx.hotbar(['diamond_hoe', 'diamond_shovel', 'diamond_axe', ['bread', 12]])
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
    await ctx.tpCheck(X + 0.5, F + 1, Z - 7.5, -69, 0)   // facing the hay, the runner in front
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x: X, y: 0, z: Z }   // y 0: edit.replay's fixed camera is relative to this, so its height is absolute
  },

  // ---------------------------------------------------------------- the rounds
  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const m = hs.moves(ctx, this), { go, look, W } = m

    // ---- the opening: a villager runs off and hides behind the hay
    for (let i = 0; i < 6; i++) { bot.chat(`/execute as @e[tag=h0,limit=1] at @s run tp @s ~0.01 ~ ~0.005`); await bot.waitForTicks(1) }
    ctx.mark('r1_go')
    const path = [[3.5, -7.2], [5.2, -3.3], [9.8, -4.2]]
    const runner = m.everyTick(26, (i) => {
      const u = Math.min(1, i / 24) * 2, k = Math.min(1, Math.floor(u)), f = u - k
      bot.chat(`/tp @e[tag=h0,limit=1] ${(X + path[k][0] + (path[k + 1][0] - path[k][0]) * f).toFixed(3)} ${F + 1} ${(Z + path[k][1] + (path[k + 1][1] - path[k][1]) * f).toFixed(3)}`)
    })
    for (let i = 0; i < 22; i++) { await bot.look(bot.entity.yaw + 0.004, bot.entity.pitch, true); await bot.waitForTicks(1) }
    await go(-1.6, -10.5)                        // H1's door
    await runner
    bot.chat(`/tp @e[tag=h0,limit=1] ${X + 300} ${F + 1} ${Z}`)   // (off camera: he's in the hay now)
    await m.openDoor(-4, -11)
    await look(-7, 1.4, -10.5, 240)
    await bot.waitForTicks(4)
    await go(1.6, -10.5)                         // across the street: H2's door
    await m.openDoor(4, -11)
    await look(7, 1.4, -10.5, 240)
    await bot.waitForTicks(3)
    await go(1.6, -7.6, { pitch: -0.05, stop: 0.4 })
    ctx.mark('r1_end')
    // the giveaway: the hay rustles and a straw puff comes off it
    const rustle = m.everyTick(20, (i) => { if (i % 5 === 0) { ctx.particles('block', W(6, 2, -6), { block: 'hay_block' }); ctx.sound('block.grass.hit', 0.8, 0.8 + 0.05 * (i % 3)) } })
    await look(7.0, 2.2, -6.0, 360)
    m.hmm(1)
    ctx.mark('r1_zoom')
    await go(5.6, -8.0, { stop: 0.3, face: [7.0, 2.4, -6.0] })
    await rustle
    await look(6.5, 2.5, -6, 160)
    ctx.mark('r1_dig'); ctx.select(0)
    await m.dig(6, 2, -6, 2, 'hay_block', 'grass')
    await look(7.5, 2.5, -6, 140)
    await m.dig(7, 2, -6, 2, 'hay_block', 'grass')
    m.hmm(1.1)
    m.found(1)
    await look(7.0, 2.4, -5.3, 260)
    await m.drift(12)

    // ---- round 2: the sand mound (north-west)
    await m.cut(1, -1.5, -6.5, 90, 0, () => ctx.cmd('/gamerule block_drops false'))
    ctx.mark('r2_go')
    await go(-9.6, -7.4)                         // behind H1
    await look(-6, 1.2, -15, 240)
    await bot.waitForTicks(3)
    await go(-13.4, -8.4)                        // the cactus (not touching it: cactus hurts)
    await look(-15.5, 1.5, -6.5, 240)
    await bot.waitForTicks(3)
    ctx.mark('r2_end')
    const trickle = m.everyTick(24, (i) => { if (i % 4 === 0) { ctx.particles('block', W(-11, 2, -13), { block: 'sand' }); ctx.sound('block.sand.hit', 0.9, 0.8 + 0.1 * (i % 3)) } })
    await look(-10.5, 2.2, -12.5, 340)
    ctx.mark('r2_zoom')
    await go(-11.2, -10.6, { sprint: false, stop: 0.3, face: [-10.5, 2.4, -12.5] })
    await trickle
    ctx.select(1)
    await look(-10.5, 2.5, -12.5, 140)
    await m.dig(-11, 2, -13, 2, 'sand', 'sand')
    m.hmm(1.2)
    m.found(2)
    await look(-10.5, 1.6, -12.5, 220)
    await m.drift(12, 0.08)

    // ---- round 3: the well (the meeting point)
    await m.cut(2, -1.5, 6.5, 180, 0, () => ctx.cmd('/gamerule block_drops true'))
    ctx.mark('r3_go')
    await go(-1.4, 11.5)                         // H3's door (in line with the doorway)
    await m.openDoor(-4, 11)
    await look(-7, 1.4, 11.5, 240)
    await bot.waitForTicks(3)
    await go(1.4, 11.5)                          // across: H4's door
    await m.openDoor(4, 11)
    await look(7, 1.4, 11.5, 240)
    await bot.waitForTicks(3)
    await go(1.4, 6.8, { stop: 0.4 })
    ctx.mark('r3_end')
    const bubbles = m.everyTick(36, (i) => {
      if (i % 2 === 0) ctx.particles('bubble', W(4.5, 0.6, 0.5), { count: 4, spread: 0.3 })
      if (i % 3 === 0) ctx.particles('bubble_pop', W(4.5, 1.9, 0.5), { count: 3, spread: 0.3 })
      if (i % 6 === 0) ctx.sound('block.bubble_column.upwards_ambient', 0.8, 0.9 + 0.05 * (i % 4))
    })
    await look(4.5, 1.8, 0.5, 320)
    ctx.mark('r3_zoom')
    const up3 = m.rise('h3', 5.2, 26)
    await go(4.5, 4.2, { sprint: false, stop: 0.35, face: [4.5, 2.2, 0.5] })
    await up3
    ctx.particles('splash', W(4.5, 2, 0.5), { count: 24 }); ctx.sound('entity.player.splash', 0.8, 1.2)
    m.hmm(0.8)
    m.found(3)
    await m.drift(12)
    await bubbles

    // ---- round 4: the iron golem (south-west)
    await m.cut(3, -9.5, 2.5, 90, 0)
    ctx.mark('r4_go')
    await go(-12.0, 7.6, { face: [-10, 1.5, 11] })   // past the golem, checking behind H3
    await look(-9.5, 1.2, 15, 240)
    await bot.waitForTicks(3)
    await go(-15.5, 9.8)                         // the cactus
    await look(-17, 1.5, 12.5, 240)
    await bot.waitForTicks(3)
    ctx.mark('r4_end')
    // the giveaway: the golem says "hmm" (a villager's voice) and turns its head to look at him
    m.hmm(0.9)
    ctx.mark('face_on', { near: [X - 12.5, Z + 5.5, 1.2], head: true })
    await look(-12.5, 2.4, 5.5, 360)
    ctx.mark('r4_zoom')
    await go(-12.5, 7.9, { sprint: false, stop: 0.3, face: [-12.5, 2.0, 5.5] })
    ctx.select(2)
    bot.swingArm(); ctx.sound('entity.iron_golem.hurt', 1, 1)
    await ctx.cmd('/kill @e[tag=golem]')        // (one hit: it falls over and poofs, and there he is)
    ctx.sound('entity.iron_golem.death', 1, 1)
    ctx.mark('face_off')
    await bot.waitForTicks(6)
    m.hmm(1.2)
    m.found(4)
    await m.drift(16)

    // ---- round 5: the cloud (he's up there now)
    await m.cut(4, 8.5, 2.5, 90, 0, async () => {
      await ctx.cmd(`/summon villager ${X + 5.5} ${CLOUD} ${Z + 6.5} {NoAI:1b,NoGravity:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b,Rotation:[-135f,30f],Tags:["h5"],VillagerData:{profession:"minecraft:cartographer",type:"minecraft:desert",level:2},Xp:1}`)
    })
    ctx.select(0)
    ctx.mark('r5_go')
    await go(9.6, 6.6)                           // round the back of H4
    await look(9.2, 1.2, 14, 240)
    await bot.waitForTicks(3)
    await go(9.6, 3.6)                           // the pool
    await look(4.5, 1.6, 0.5, 240)
    ctx.mark('r5_end')
    // a wheat item drifts down out of the sky, right in front of him
    bot.chat(`/summon item ${X + 6.0} ${F + 9} ${Z + 5.6} {Item:{id:"minecraft:wheat",count:1},PickupDelay:400,Motion:[0.0,-0.25,0.0]}`)
    ctx.sound('entity.item.pickup', 0.6, 0.5)
    await look(6.0, 6, 5.6, 280)
    await look(6.0, 0.5, 5.6, 260)
    // ...and straight up, where it came from
    await look(6.0, 40, 6.0, 300)
    ctx.mark('r5_zoom')
    await look(5.5, CLOUD + 1 - F, 6.5, 320)
    m.hmm(0.7)
    m.found(5)
    // up there (seen in the replay): he drops wheat, laughs (happy particles), turns to the camera
    const up = m.everyTick(24, (i) => {
      if (i % 4 === 0) bot.chat(`/summon item ${X + 5.8 + 0.1 * (i % 3)} ${CLOUD + 1.2} ${Z + 6.8} {Item:{id:"minecraft:${['wheat', 'bread', 'emerald', 'wheat', 'apple', 'carrot'][i / 4]}",count:1},PickupDelay:400,Motion:[${(0.22 + 0.03 * (i % 3)).toFixed(2)},0.3,${(0.24 + 0.02 * (i % 5)).toFixed(2)}]}`)
      if (i % 3 === 0) ctx.particles('happy', new ctx.Vec3(X + 5.5, CLOUD + 2.0, Z + 6.5))
      if (i === 8) ctx.mark('face_on', { near: [X + 5.5, Z + 6.5, 1.2] })
    })
    for (let i = 0; i < 24; i++) { await bot.look(bot.entity.yaw + 0.004 * Math.sin(i / 3), bot.entity.pitch, true); await bot.waitForTicks(1) }
    await up
    return true
  }
}
