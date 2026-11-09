// Story Short "the sun hasn't set in 300 days 💀" (stories/sun_wont_set, premise #10 in docs/stories.md).
// The sun has hung low over the narrator's village for 300 days. Nobody has slept: the farmer walks
// into his own fence, the butcher sleeps standing up, every bed is still made, and the zombies have
// waited under one tree the whole time. Every day grandpa asks "is tonight the night?" and every day
// the narrator says "not yet". It isn't a curse: it's a lever, and he pulled it, because zombies come
// out at night and grandpa is too slow to run. Today grandpa asks him to let it come. He pulls the
// lever back, the sun goes down, the zombies come out, he yells "run, grandpa!" and grandpa is
// already gone. "Then who was too slow to run?" The game answers: HelloBuh was slain by Zombie.
// The death loops into line 1 (that's why the sun never sets here).
//
// The plants: grandpa "always gets there first" (L09, he pulls away from the camera), and he strides
// up the street at a brisk walk while the narrator calls him too slow (L11).
//
// One scene per line (docs/stories.md): each lasts its spoken length + gap, and actions land on
// caption chunks (at(k)). The sun is frozen at 11500 (low in the west, the street runs toward it);
// the sunset is a run of `time` marks; the zombies are NoAI and hit with /damage ... by <zombie>.
const path = require('path')
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'sun_wont_set')
const DAY = 11500, DUSK = 12950

// the cast's fixed spots (set-relative x, z)
const ZA = [[2.7, 29.3], [3.2, 31.9], [5.5, 28.5], [5.8, 31.6], [5.9, 29.9], [4.4, 32.6]]   // under the tree
const ZF = [6.6, 30.7]                                                                       // the one who tries the sun
const ZB = [[8.0, 0.4, 1.25], [8.8, -1.2, 1.7], [9.2, 1.6, 1.5], [10.6, 0.2, 2.2], [11.0, -1.4, 2.6], [11.4, 1.2, 2.4]]   // x, z, how close each gets
const GAZE = [[-9.2, -1.6, 'cleric'], [-10.8, -0.7, 'mason'], [-9.9, 1.9, 'shepherd'], [-11.4, 2.3, 'fletcher']]

module.exports = {
  name: 'story_sun_wont_set',
  biome: process.env.BIOME || 'minecraft:plains',
  time: DAY,
  brightness: 1,             // Options > Brightness: Bright, so the dusk scenes read
  caption: "the sun hasn't set in 300 days 💀",
  edit: { caption: "the sun hasn't set in 300 days 💀", red: 'sun', story: 'stories/sun_wont_set', startAt: 'line:0', endAfter: 'death:1.35', zoom: [['death:0.1', 'death:1.35', 1.1]], deathScreen: true, sfx: [['riser', 'lever', 'dusk', { gain: 0.5 }], ['impact', 'dusk', { gain: 0.6 }]] },
  expectDeath: true,
  botTimeout: 300,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const c = (s) => ctx.cmd(s)
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')            // per-tick `execute as` tps flood the bot with op broadcasts
    await c('/gamerule natural_health_regeneration false')   // a heart came back between the zombies' hits
    await c('/gamerule mob_griefing false')
    await c('/difficulty hard')                              // a zombie's hit is 4.5 on hard: five of them kill
    await clearSet(ctx, A, 64, 24)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 24)

    // --- the street: east-west, straight at the low sun in the west
    await c(`/fill ${A(-34, 0, -1)} ${A(31, 0, 1)} dirt_path`)
    for (const x0 of [14, 5, -4, -13, -22]) await house(ctx, A, x0, -9, x0 + 1, -4, 'north')   // north side, doors on the street (-4..1 is grandpa's)
    for (const x0 of [10, 0, -10, -19]) await house(ctx, A, x0, 4, x0 + 1, 4, 'south')         // south side
    for (const [dx, dz] of [[20, -2], [14, 2], [3, 2], [-6, 2], [-16, -2], [-26, 2]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    for (const [dx, dz, b] of [[18, 2, 'poppy'], [12, -2, 'dandelion'], [2, 2, 'cornflower'], [-7, -2, 'oxeye_daisy'], [-14, 3, 'poppy'], [22, 3, 'azure_bluet'], [-20, -3, 'dandelion']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // the butcher's stall, in the gap between two south houses
    await c(`/setblock ${A(7, 1, 3)} smoker[facing=north]`); await c(`/setblock ${A(6, 1, 3)} barrel[facing=up]`)

    // --- the farm (L02), north-east: wheat round a water row, fenced
    await c(`/fill ${A(23, 0, -23)} ${A(29, 0, -17)} farmland[moisture=7]`)
    await c(`/fill ${A(23, 1, -23)} ${A(29, 1, -17)} wheat[age=7]`)
    await c(`/fill ${A(23, 0, -20)} ${A(29, 0, -20)} water`)
    await c(`/fill ${A(23, 1, -20)} ${A(29, 1, -20)} air`)
    await c(`/fill ${A(22, 1, -24)} ${A(22, 1, -16)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(30, 1, -24)} ${A(30, 1, -16)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(23, 1, -24)} ${A(29, 1, -24)} oak_fence[east=true,west=true]`)
    await c(`/fill ${A(23, 1, -16)} ${A(29, 1, -16)} oak_fence[east=true,west=true]`)
    await c(`/setblock ${A(22, 1, -24)} oak_fence[south=true,east=true]`); await c(`/setblock ${A(30, 1, -24)} oak_fence[south=true,west=true]`)
    await c(`/setblock ${A(22, 1, -16)} oak_fence[north=true,east=true]`); await c(`/setblock ${A(30, 1, -16)} oak_fence[north=true,west=true]`)
    await c(`/fill ${A(24, 1, -18)} ${A(25, 1, -18)} air`)   // where the farmer paces: trodden clear
    await c(`/fill ${A(23, 1, -19)} ${A(25, 1, -19)} air`)
    await c(`/setblock ${A(28, 1, -17)} hay_block`); await c(`/setblock ${A(29, 1, -17)} composter`)

    // --- the bunkhouse (L04), at the east end of the street: eight beds, all made
    await c(`/fill ${A(32, 0, -3)} ${A(41, 4, 3)} oak_planks hollow`)
    await c(`/fill ${A(32, 0, -3)} ${A(41, 0, 3)} spruce_planks`)
    for (const [x, z] of [[32, -3], [41, -3], [32, 3], [41, 3]]) await c(`/fill ${A(x, 1, z)} ${A(x, 3, z)} oak_log`)
    await c(`/fill ${A(31, 4, -4)} ${A(42, 4, 4)} spruce_planks`)
    await c(`/fill ${A(32, 5, -3)} ${A(41, 5, 3)} spruce_slab`)
    for (const x of [34, 37, 40]) await c(`/setblock ${A(x, 4, 0)} glowstone`)
    for (const x of [35, 38]) for (const z of [-3, 3]) await c(`/setblock ${A(x, 2, z)} glass`)
    await c(`/fill ${A(41, 2, -1)} ${A(41, 2, 1)} glass`)
    await c(`/setblock ${A(32, 2, 0)} oak_door[half=upper,facing=east,open=true]`); await c(`/setblock ${A(32, 1, 0)} oak_door[half=lower,facing=east,open=true]`)
    const beds = ['red', 'white', 'yellow', 'light_blue']
    for (let i = 0; i < 4; i++) {
      const x = 34 + i * 2
      await c(`/setblock ${A(x, 1, -1)} ${beds[i]}_bed[facing=north,part=foot]`); await c(`/setblock ${A(x, 1, -2)} ${beds[i]}_bed[facing=north,part=head]`)
      await c(`/setblock ${A(x, 1, 1)} ${beds[3 - i]}_bed[facing=south,part=foot]`); await c(`/setblock ${A(x, 1, 2)} ${beds[3 - i]}_bed[facing=south,part=head]`)
    }

    // --- the lever (L10, L13): a command block behind the bunkhouse, a lamp on it, the lever on its east face
    await c(`/fill ${A(27, 1, 11)} ${A(27, 2, 13)} stone_bricks`)
    await c(`/fill ${A(27, 3, 11)} ${A(27, 3, 13)} stone_brick_slab`)
    await c(`/fill ${A(26, 0, 10)} ${A(29, 0, 14)} cobblestone`)
    await c(`/setblock ${A(27, 1, 12)} command_block`)
    await c(`/setblock ${A(28, 1, 12)} lever[face=wall,facing=east,powered=true]`)
    await c(`/setblock ${A(27, 2, 12)} redstone_lamp[lit=true]`)

    // --- the one tree (L05, L11, L14), south of the village: a wide canopy, shade for seven
    await c(`/fill ${A(1, 4, 27)} ${A(7, 5, 33)} oak_leaves[persistent=true]`)
    await c(`/fill ${A(2, 6, 28)} ${A(6, 6, 32)} oak_leaves[persistent=true]`)
    await c(`/fill ${A(3, 7, 29)} ${A(5, 7, 31)} oak_leaves[persistent=true]`)
    for (const [x, z] of [[1, 27], [7, 27], [1, 33], [7, 33]]) await c(`/setblock ${A(x, 5, z)} air`)
    await c(`/fill ${A(4, 1, 30)} ${A(4, 6, 30)} oak_log`)

    // --- the cast, all NoAI: moved only by the scenes
    const vil = (x, z, yaw, prof, tag, type = 'plains', y = 1) => c(`/summon villager ${(X + x).toFixed(2)} ${F + y} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[${yaw}f,0f],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:${type}",level:2},Xp:1}`)
    const zom = (x, y, z, yaw, tags) => c(`/summon zombie ${(X + x).toFixed(2)} ${F + y} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,CanPickUpLoot:0b,Tags:[${tags.map(t => `"${t}"`).join(',')}],Rotation:[${yaw}f,0f]}`)
    await vil(-1.5, -6.5, 0, 'librarian', 'gp')              // grandpa, at home until L05
    await vil(8.5, 2.6, -90, 'butcher', 'butcher')
    await vil(23.9, -18.5, 90, 'farmer', 'farmer')
    await vil(13.0, -0.5, -90, 'toolsmith', 'w1', 'taiga'); await vil(9.6, 0.9, -90, 'leatherworker', 'w2', 'savanna')
    for (let i = 0; i < GAZE.length; i++) await vil(GAZE[i][0], GAZE[i][1], 90, GAZE[i][2], 'gaze', ['plains', 'desert', 'plains', 'taiga'][i])
    for (let i = 0; i < ZA.length; i++) await zom(ZA[i][0], 1, ZA[i][1], -90 + (i % 3 - 1) * 14, ['za'])
    await zom(ZF[0], 1, ZF[1], -90, ['za', 'zf'])
    for (let i = 0; i < ZB.length; i++) await zom(ZB[i][0], -3, ZB[i][1], 90, ['zb', `zb${i}`])   // the street's zombies wait under it, out of the sun

    await c('/clear @s')
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X + 24.5, F + 1, Z + 0.5, 90, -14)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, say, look, cut } = K
    const go = (on) => bot.setControlState('forward', on)
    const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2 }
    const yawOf = (dx, dz) => Math.atan2(-dx, dz) * 180 / Math.PI   // Minecraft yaw (degrees) of a walking direction
    const setTime = (n) => { n = Math.round(n); if (n === ctx.dayTime) return; ctx.dayTime = n; say(`/time set ${n}`); ctx.mark('time', { time: n }) }

    // the actors the scenes move: one /tp a tick each, so their turn and head pitch reach the recording at once
    // (a mob that stood still for long shows its first move ~1 s late)
    const G = { x: -1.5, z: -6.5, yaw: 0, pitch: 0, y: 1 }           // grandpa
    const B = { x: 8.5, z: 2.6, yaw: -90, pitch: 0, on: true }       // the butcher, asleep on his feet
    const W = [{ x: 13.0, z: -0.5, on: true }, { x: 9.6, z: 0.9, on: true }]   // L01's walkers
    let zaMode = 'idle', zbUp = false, gazeOn = true
    const nod = (t) => { const u = (t % 56) / 56; return u < 0.62 ? 52 * ease(u / 0.62) : u < 0.7 ? 52 * (1 - (u - 0.62) / 0.08) : 0 }   // droop, droop, snap awake
    let bPitch = null
    const ambient = () => {
      const j = ctx.tick % 2 ? 0.002 : -0.002
      say(`/tp @e[tag=gp,limit=1] ${(X + G.x + j).toFixed(3)} ${F + G.y} ${(Z + G.z).toFixed(3)} ${G.yaw.toFixed(1)} ${G.pitch.toFixed(1)}`)
      if (B.on) say(`/tp @e[tag=butcher,limit=1] ${(X + B.x + j).toFixed(3)} ${F + 1} ${(Z + B.z).toFixed(3)} ${B.yaw} ${(bPitch ?? nod(ctx.tick)).toFixed(1)}`)
      if (gazeOn) say(`/execute as @e[tag=gaze] at @s run tp @s ~${j} ~ ~ 90 ${(-30 + Math.sin(ctx.tick / 23) * 4).toFixed(1)}`)   // staring up at the sun
      if (zaMode === 'idle') say(`/execute as @e[tag=za,tag=!out] at @s run tp @s ~${j} ~ ~`)                             // shuffling in the shade
      if (zaMode === 'stare') say(`/execute as @e[tag=za,tag=!out] at @s run tp @s ~${j} ~ ~ facing entity ${bot.username} eyes`)
      if (zbUp === 'wait') say(`/execute as @e[tag=zb] at @s run tp @s ~${j} ~ ~`)
    }
    const line = (id, scene, extra = 0) => K.line(id, async (k, at) => { ambient(); await scene(k, at) }, extra)
    const groan = (v = 0.7, p = 1) => ctx.sound('entity.zombie.ambient', v, p)

    // ---- L01: the sun, low over the street, where it has been for 300 days
    await cut(24.5, 0.5, P(-75.5, 28, 0.5))
    const walkers = () => W.forEach((w, i) => { if (!w.on) return; w.x += 0.03; say(`/tp @e[tag=w${i + 1},limit=1] ${(X + w.x).toFixed(3)} ${F + 1} ${(Z + w.z + Math.sin((ctx.tick + i * 30) / 14) * 0.25).toFixed(3)} ${(-90 + Math.cos((ctx.tick + i * 30) / 14) * 22).toFixed(1)} ${(28 + Math.sin((ctx.tick + i * 17) / 9) * 10).toFixed(1)}`) })
    for (let k = 0; k < 10; k++) { ambient(); walkers(); look(k); await bot.waitForTicks(1) }   // moving on the first frame
    await line('L01', async (k, at) => {
      walkers()
      go(k > 5 && k < 30)
      // from the sun down to the street under it, as the walk starts
      const u = ease((k - at(2)) / 24)
      K.base = K.aim(P(bot.entity.position.x - X - 100, 1.62 + 26.4 - 17 * u, 0.5)); look(k)
    })
    go(false)

    // ---- L02: the farmer keeps walking into his own fence
    await cut(19.9, -18.5, P(23.6, 2.5, -18.5))
    W.forEach((w, i) => { w.on = false; say(`/tp @e[tag=w${i + 1}] ${X + 20} ${F - 8} ${Z - 40}`) })   // the walkers leave the street
    let fx = 23.9, fk = 0
    await line('L02', async (k, at) => {
      // a cycle: shuffle up to the fence, thump, rock back, stand a moment, again
      fk = (k + 13) % 20
      if (fk < 11) fx = Math.max(22.95, fx - 0.1); else if (fk < 16) fx += 0.2 * (1 - (fk - 11) / 5)   // bounces off it
      say(`/tp @e[tag=farmer,limit=1] ${(X + fx).toFixed(3)} ${F + 1} ${Z - 18.5} 90 ${(fk >= 10 && fk < 15 ? -14 : 24).toFixed(0)}`)
      K.base = K.aim(P(fx, 2.5, -18.5)); look(k)
    })

    // ---- L03: the butcher fell asleep standing up (the sun behind his head)
    await cut(11.3, 2.2, P(8.5, 2.7, 2.6))
    await line('L03', async (k, at) => {
      // nods off as I step up; on "standing UP" his head jerks up, and sinks again
      const up = at(2) + 2
      bPitch = k < up ? 50 * ease((k + 8) / (up + 6)) : k < up + 3 ? 50 - 62 * (k - up + 1) / 3 : -12 + 50 * ease((k - up - 3) / 16)
      if (k === up) ctx.sound('entity.villager.ambient', 0.8, 0.9)
      bot.setControlState('right', k > 3 && k < 10)   // a step round him, for a better look
      K.base = K.aim(P(8.5, 2.7, 2.6)); look(k)
    })
    bot.setControlState('right', false); bPitch = null

    // ---- L04: every bed in the village is still made
    await cut(39.5, 0.5, P(33, 2.3, 0.5))
    let from4 = null
    await line('L04', async (k, at) => {
      go(k > 2 && k < 15)
      if (k >= at(3) - 4) { from4 = from4 || { ...K.base }; K.turnTo(from4, P(35.9, 1.45, -1.3), (k - at(3) + 4) / 12) }   // down at the nearest one on "MADE"
      look(k)
    })
    go(false)

    // ---- L05: the zombies have been hiding under one tree since it started
    await cut(13.2, 28.2, P(4.6, 2.5, 30.3))
    G.x = 8.0; G.z = 0.5; G.yaw = -90   // grandpa comes out to the street, out of shot
    await line('L05', async (k, at) => {
      go(k > 2 && k < at(3))
      if (k === 4) groan(0.6, 0.9)
      if (k === at(3)) groan(0.7, 1.1)
      look(k)
    })
    go(false)

    // ---- L06: and every day my grandpa asks me the same thing (he walks up, the sun behind him)
    await cut(15.5, 0.5, P(9, 2.5, 0.5))
    await line('L06', async (k) => {
      G.x = Math.min(13.3, G.x + 0.135)
      K.base = K.aim(P(G.x, 2.55, 0.5)); look(k)
    })
    // ---- L07: "is tonight the night?" (close on him)
    await cut(14.75, 0.95, P(13.3, 2.72, 0.5))
    await line('L07', async (k) => {
      if (k === 1) ctx.sound('entity.villager.trade', 1, 0.9)
      G.x = Math.min(13.5, G.x + 0.035); G.pitch = -6 * ease(k / 8)   // leans in, chin up
      K.base = K.aim(P(G.x, 2.72, 0.5)); look(k)
    })
    // ---- L08: and every day I tell him, not yet (I shake my head; his sinks; he turns for home)
    const T8 = Math.round((S.line('L08').dur + S.gap) * 20)
    await line('L08', async (k, at) => {
      const no = at(2)
      const shake = k >= no ? Math.sin((k - no) * 0.82) * 0.2 * Math.max(0, 1 - (k - no) / 16) : 0
      G.pitch = k < no + 3 ? -6 : -6 + 36 * ease((k - no - 3) / 7)
      if (k === no + 5) ctx.sound('entity.villager.no', 1, 0.9)
      if (k >= T8 - 6) { G.yaw = -90 - 180 * ease((k - T8 + 7) / 5); G.pitch = 20 }   // turns away
      K.base = K.aim(P(G.x, 2.72, 0.5)); look(k, shake)
    })
    // ---- L09: then I walk him home. He always gets there first (he pulls away down the street)
    G.yaw = 90; G.pitch = 0
    await cut(16.4, 0.5, P(G.x - 4, 2.4, 0.5))
    const door = { x: -2.5, z: -2.7 }
    let home = false
    await line('L09', async (k, at) => {
      go(true)
      const dx = door.x - G.x, dz = door.z - G.z, d = Math.hypot(dx, dz)
      const v = Math.min(0.42, 0.12 + k * 0.05)   // off he goes
      if (d > v) { G.x += dx / d * v; G.z += dz / d * v; G.yaw = yawOf(dx, dz) } else if (!home) { home = true; G.x = door.x; G.z = door.z }
      if (home) { const p = bot.entity.position; G.yaw = yawOf(p.x - X - G.x, p.z - Z - G.z) }   // at his door, looking back for me
      K.base = K.aim(P(Math.min(G.x, bot.entity.position.x - X - 4), 2.4, G.z * 0.6 + 0.2)); look(k)
    })
    go(false)

    // ---- L10: everyone thinks it's a curse (the villagers stare at the sun). It's not. It's a lever. And I pulled it
    await cut(-3.8, 0.5, P(-43.8, 13.5, 0.5))
    let rig = false
    await line('L10', async (k, at) => {
      if (!rig && k >= at(3) - 1) { rig = true; go(false); await cut(32.0, 12.5, P(28.0, 1.7, 12.5)) }
      if (!rig) { go(k > 2 && k < 8); look(k) } else { go(bot.entity.position.x > X + 30.9); K.sway = 0.5; look(k) }
    })
    go(false); K.sway = 1

    // ---- L11: because at night the zombies come out (one tries it now, and catches fire). And grandpa is too slow to run
    //      (grandpa, striding up the street)
    await cut(10.4, 32.3, P(5.6, 2.4, 30.5))
    G.x = -8.0; G.z = 0.5; G.yaw = -90; G.pitch = 0
    zaMode = 'stare'
    say('/tag @e[tag=zf] add out')
    let zx = ZF[0], lit = false, street = false
    await line('L11', async (k, at) => {
      const out = at(3) - 8
      if (!street) {
        // he shuffles out past the leaves, burns, and scrambles back under
        if (k >= out && k < out + 7) zx = Math.min(8.75, zx + 0.36)
        if (k >= out + 11) zx = Math.max(ZF[0], zx - 0.36)
        say(`/tp @e[tag=zf,limit=1] ${(X + zx).toFixed(3)} ${F + 1} ${(Z + ZF[1] + (ctx.tick % 2 ? 0.002 : -0.002)).toFixed(3)} ${k >= out + 11 && zx > ZF[0] ? 90 : -90} 0`)
        // sunlight sets a zombie alight on a random tick (~4% a tick): this one catches at once
        if (k === out + 4 && !lit) { lit = true; say('/data merge entity @e[tag=zf,limit=1] {Fire:200s}') }
        if (k === out + 6) ctx.sound('entity.zombie.hurt', 0.9, 1)
        if (k === 2) groan(0.6, 1)
      }
      if (!street && k >= at(4) - 1) {
        street = true
        say('/tag @e[tag=zf] remove out'); say(`/tp @e[tag=zf,limit=1] ${X + ZF[0]} ${F + 1} ${Z + ZF[1]} -90 0`)
        zaMode = 'idle'
        await cut(4.6, 1.3, P(-6, 2.5, 0.5))
        say('/data merge entity @e[tag=zf,limit=1] {Fire:0s}')   // he's out by the time they leave the shade
      }
      if (street) { G.x = Math.min(1.6, G.x + 0.27); K.base = K.aim(P(G.x, 2.55, 0.5)) } else K.base = K.aim(P(5.6 + (zx - ZF[0]) * 0.7, 2.4, 30.5))
      look(k)
    })

    // ---- L12: but today he said, let it come. I'm tired, kid (close, the sun right behind his head)
    await cut(3.45, 0.2, P(1.6, 2.74, 0.5))
    await line('L12', async (k, at) => {
      G.x = Math.min(1.6, G.x + 0.27)
      if (k === 1) ctx.sound('entity.villager.trade', 1, 0.8)
      G.pitch = k < at(3) ? -5 * ease(k / 6) : -5 + 33 * ease((k - at(3)) / 9)   // his head sinks on "TIRED"
      if (k === at(3) + 3) ctx.sound('entity.villager.no', 0.9, 0.8)
      K.base = K.aim(P(G.x, 2.74, 0.5)); look(k)
    })

    // ---- L13: so I pulled it back (the lever clicks, the lamp goes out)
    await cut(31.0, 12.5, P(28.0, 1.6, 12.5))
    G.yaw = 90; G.pitch = -14      // grandpa turns to watch the sun
    B.on = false; say(`/tp @e[tag=butcher] ${X + 20} ${F - 8} ${Z - 40}`)   // the butcher goes in for the night
    K.sway = 0.4
    ctx.mark('lever')
    await line('L13', async (k, at) => {
      go(bot.entity.position.x > X + 29.9)
      if (k === at(2)) {
        bot._client.write('block_place', { hand: 0, location: { x: X + 28, y: F + 1, z: Z + 12 }, direction: 5, cursorX: 0.2, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        bot.swingArm(); ctx.sound('block.lever.click', 0.6, 0.5)
      }
      look(k)
    })
    go(false); K.sway = 1

    // ---- L14: the sun went down (it sinks at the end of the street, grandpa watching). The zombies came out
    await cut(5.6, 0.5, P(-60, 9.5, 0.5))
    let tree = false, k14 = 0
    await line('L14', async (k, at) => {
      const end = at(2) - 2
      if (!tree) setTime(DAY + (DUSK - DAY) * Math.min(1, (k + 1) / end))   // ~20 ticks from late afternoon to dusk: a time-lapse of the first sunset in 300 days
      if (!tree && k >= at(2) - 1) {
        tree = true; k14 = k; setTime(DUSK)
        say('/tag @e[tag=za] add out')
        await cut(11.6, 29.3, P(5.2, 2.4, 30.3))
        for (let i = 0; i < ZB.length; i++) say(`/tp @e[tag=zb${i}] ${X + ZB[i][0]} ${F + 1} ${Z + ZB[i][1]} 90 0`)   // the street's zombies climb out, out of shot
        zbUp = 'wait'
        say(`/tp @e[tag=gaze] ${X + 20} ${F - 8} ${Z - 40}`); gazeOn = false   // the sun-watchers have gone in
        ctx.mark('dusk')
        groan(0.9, 0.9)
      }
      if (tree) {
        say(`/execute as @e[tag=za] at @s run tp @s ~0.1 ~ ~ -90 0`)   // out from under the leaves, toward me
        if (k === k14 + 8) groan(0.8, 1.1)
      } else K.base = K.aim(P(-60, 9.5 - 5 * ease(k / end), 0.5))        // the camera sinks with it
      look(k)
    })

    // ---- L15: I yelled, run, grandpa! He was already gone
    G.x = 1.6; G.z = 0.5
    await cut(3.0, 0.5, P(9.5, 2.4, 0.5))
    zbUp = 'go'
    const T15 = Math.round((S.line('L15').dur + S.gap) * 20), T16 = Math.round((S.line('L16').dur + S.gap) * 20)
    const D = T16 - 3                                         // the killing hit, on the last word
    const hits16 = [D, D - 11, D - 22, D - 33].filter(t => t >= 0)
    const hits15 = [D - 33, D - 44].filter(t => t < 0).map(t => T15 + t)
    // the street's zombies: each makes for its own place in an arc in front of me (straight at me they piled
    // into one green wall), at a zombie's walk, and they follow when a hit knocks me back
    const SLOT = [[1.6, 0], [1.9, -34], [1.9, 34], [2.9, -17], [2.9, 17], [3.7, -2]]
    const Zs = ZB.map(([x, z]) => ({ x, z }))
    let me = { x: 3.0, z: 0.5 }, close = 1
    const zombies = () => {
      if (!ctx.died) me = { x: bot.entity.position.x - X, z: bot.entity.position.z - Z }
      Zs.forEach((q, i) => {
        const a = SLOT[i][1] * Math.PI / 180, r = SLOT[i][0] * close
        const dx = me.x + r * Math.cos(a) - q.x, dz = me.z + r * Math.sin(a) - q.z, d = Math.hypot(dx, dz)
        if (d > 0.02) { const v = Math.min(0.105, d); q.x += dx / d * v; q.z += dz / d * v }
        const j = d > 0.02 ? 0 : (ctx.tick % 2 ? 0.002 : -0.002)
        say(`/tp @e[tag=zb${i},limit=1] ${(X + q.x + j).toFixed(3)} ${F + 1} ${(Z + q.z).toFixed(3)} ${yawOf(me.x - q.x, me.z - q.z).toFixed(1)} 8`)
      })
    }
    const hit = () => say(`/damage @s 3 minecraft:mob_attack by @e[tag=zb0,limit=1]`)
    const front = () => P(Math.max(Zs[0].x, me.x + 1.2), 2.55, Zs[0].z * 0.5 + me.z * 0.5)
    let fromA = null, fromB = null, kB = 0
    await line('L15', async (k, at) => {
      zombies()
      G.x -= Math.min(0.42, 0.2 + k * 0.05); G.yaw = 90; G.pitch = 0   // grandpa, flat out, from the first word
      if (k === 3) groan(0.9, 1)
      const turn = at(1) + 2
      if (k >= turn && !fromB) { fromA = fromA || { ...K.base }; K.turnTo(fromA, P(G.x, 2.4, 0.9), (k - turn) / 11) }   // round to where grandpa was... he's a dot down the street
      if (hits15.includes(k)) { hit(); fromB = { ...K.base }; kB = k }
      if (fromB) K.turnTo(fromB, front(), (k - kB - 1) / 8)                                                          // the hit from behind: back round to them
      if (!fromA) K.base = K.aim(front())
      look(k)
    })
    // ---- L16: wait. Then who was too slow to run?
    let dead = false
    await line('L16', async (k) => {
      zombies()
      if (!ctx.died) {
        if (hits16.includes(k)) hit()
        if (k === 6 || k === 20) groan(1, k === 6 ? 1 : 0.85)
        K.base = K.aim(front())
        look(k, Math.sin(k * 0.9) * 0.035, Math.sin(k * 0.7 + 1) * 0.025)
      } else if (!dead) { dead = true; ctx.mark('slain') }
    })
    for (let i = 0; i < 40 && !ctx.died; i++) { ambient(); zombies(); if (i % 11 === 0) hit(); await bot.waitForTicks(1) }
    if (!dead) { dead = true; ctx.mark('slain') }
    // behind the death screen they close in a little (their moves reach a dead player for ~0.9 s)
    for (let i = 0; i < 44; i++) { close = Math.max(0.8, close - 0.012); zombies(); await bot.waitForTicks(1) }
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return ctx.died
  }
}
