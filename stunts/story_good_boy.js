// Story Short "i can't get away from this guy 😭" (stories/good_boy, story.json v2): the cinematic pilot
// (docs/stories.md "Cinematic stories"). The narrator has tried to leave an old man 37 times; every time he gets
// twelve blocks away he is standing next to him again. Raw porkchops, "Sit." and he sits, everyone is tall, a dog
// that is always already there, he can't open doors, he waits by the door all day, skeletons run from him. A zombie
// comes for the man at night, and he doesn't remember what happened next. "Easy... easy. It's gone." "Good boy."
// The camera pulls out of his head for the first time: he is the man's dog, a tamed wolf (vanilla: tamed wolves
// teleport to their owner from 12+ blocks, sit on command, can't open doors, scare skeletons and attack whatever
// hurts their owner). "Tomorrow, I'm leaving. For real." loops into line 1.
//
// The cinematic trick: first-person shots hide who "I" am (stunt.self.eye: a wolf's eye height, 0.68), every camera
// shot shows the truth (stunt.self.model: the narrator drawn as a wolf with a red collar, always at the man's side).
//
// The set is a real generated plains village (seed hellobuh, the nearest village_plains to spawn, centre O =
// (-304, -384)): hills, farms, the road through it, the sea to the east and snowy mountains north. Added: the old
// man's cottage on a levelled pad at the village's east edge above the sea (x 34..39, z 20..25 from O, door north),
// its yard and lanterns, a path up to the road. The man is an actor bot (lib/movie.js) moved by /tp.
const path = require('path')
const M = require('../lib/movie')
const { storyLines, storyKit, setKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'good_boy')
const CAPTION = "i can't get away from this guy 😭"
const GOLD = 12300, NIGHT = 18000, DUSK = 12900
const GUY = 'Sam'
const SIT_EYE = 0.5, EYE = 0.68
const VX = -304, VZ = -384          // the village (scripts: /locate structure minecraft:village_plains from spawn)

module.exports = {
  name: 'story_good_boy',
  near: [VX, VZ],
  caption: CAPTION,
  time: GOLD,
  botTimeout: 480,
  renderDistance: 10, recordRadius: 160,
  hideHand: true,          // no first-person arm
  hud: false,              // and no HUD (lib/story.js K.shot keeps F1 on for POV shots too)
  self: { model: 'wolf', eye: EYE, extra: { tame: true, collar: 14 } },
  cast: { [GUY]: 'steve' },
  idleLife: true,
  look: { grade: { lift: [0.02, 0.01, 0.018], gamma: [0.97, 1.0, 1.04], gain: [1.12, 1.02, 0.88], sat: 1.14, contrast: 0.12, exposure: 1.06 }, bloom: 0.5, bloomThreshold: 0.72, vignette: 0.38, grain: 0.02, dof: { aperture: 0.9 }, shadows: true, rays: 0.5, cloudNight: 0.42 },
  // camera shots (positions are offsets from O; y from the village centre's ground). Set in setup once the pad's
  // height is known: see shotsFor()
  shots: {},
  edit: { caption: CAPTION, red: 'guy', story: 'stories/good_boy', startAt: 'line:0', endAfter: 'story_end:0',
    // the reveal's sound: a whoosh as the camera leaves his head (L14 is the 13th line mark), a hit on the bark
    sfx: [['whoosh', 'line', { nth: 12, gain: 0.45 }], ['impact', 'bark', { gain: 0.5 }]],
    punch: [['bark', 0, 0.1]] },   // a push-in on the bark: the payoff's picture hit (./hb pace)

  async setup (ctx) {
    const { bot } = ctx
    const X = VX, Z = VZ
    // the set's origin height is the cottage pad's: the natural ground where the yard goes (all shots are relative to it)
    const F = groundAt(ctx, X + 37, Z + 16)
    const Y = F
    Object.assign(this, { X, Z, F, Y })
    const { c } = setKit(ctx, { X, Z, F })
    const A = (dx, dy, dz) => `${X + dx} ${Y + dy} ${Z + dz}`   // pad-relative
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')
    await c('/gamerule random_tick_speed 0')
    await c('/difficulty normal')
    await c('/kill @e[type=iron_golem]')           // the village golem would hunt the story's zombie and skeletons
    await c('/kill @e[type=item]')
    await c(`/kill @e[type=!player,type=!villager,x=${X + 36},y=${F},z=${Z + 18},distance=..40]`)   // the village's pigs and cows wandered through the yard
    // the pad: level ground for the cottage and the yard, its edges stepped down into the hill
    await c(`/fill ${A(29, 1, 9)} ${A(44, 16, 33)} air`)
    await c(`/fill ${A(29, -4, 9)} ${A(44, -1, 33)} dirt`)
    await c(`/fill ${A(29, 0, 9)} ${A(44, 0, 33)} grass_block`)
    for (let k = 1; k <= 4; k++) await c(`/fill ${A(29 - k, -k, 9 - k)} ${A(44 + k, -k, 33 + k)} grass_block replace air`)
    // the cottage (docs/building_guide.md): 7 x 9 with a cobble plinth, an oak-plank body in a proud spruce frame,
    // recessed windows with shutters, a dark oak stair roof with overhangs and plank gables, a chimney, the door north
    await cottage(c, A)
    // the yard: a fence line with a gate, lantern posts at the gate, a curving gravel-edged path up to the road
    await c(`/fill ${A(30, 1, 12)} ${A(30, 1, 29)} spruce_fence`); await c(`/fill ${A(43, 1, 12)} ${A(43, 1, 29)} spruce_fence`)
    await c(`/fill ${A(30, 1, 12)} ${A(34, 1, 12)} spruce_fence`); await c(`/fill ${A(38, 1, 12)} ${A(43, 1, 12)} spruce_fence`)
    for (const [dx, dz] of [[34, 12], [38, 12]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} spruce_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    for (const [x, z] of [[36, 19], [36, 18], [36, 17], [35, 16], [35, 15], [35, 14], [36, 13], [36, 12], [36, 11], [37, 10], [37, 9]]) {
      await c(`/setblock ${A(x, 0, z)} dirt_path`); await c(`/setblock ${A(x - 1, 0, z)} coarse_dirt keep`); await c(`/setblock ${A(x + 1, 0, z)} gravel`)
    }
    for (const [dx, dz, b] of [[32, 19, 'poppy'], [40, 19, 'dandelion'], [31, 22, 'cornflower'], [41, 23, 'oxeye_daisy'], [32, 14, 'allium'], [41, 15, 'poppy'], [31, 17, 'azure_bluet']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    for (const [dx, dz] of [[32, 20], [40, 27], [32, 28]]) await c(`/setblock ${A(dx, 1, dz)} flowering_azalea`)
    await c(`/setblock ${A(38, 1, 19)} barrel[facing=up]`); await c(`/setblock ${A(39, 1, 19)} hay_block`)
    await c(`/place feature minecraft:fancy_oak ${A(31, 1, 31)}`); await c(`/place feature minecraft:oak ${A(43, 1, 31)}`)
    for (const [f, dx, dz] of [['birch', 46, 10], ['oak', 27, 9], ['fancy_oak', 47, 22], ['birch', 26, 30]]) await c(`/place feature minecraft:${f} ${A(dx, 1, dz)}`)
    for (const [dx, dz] of [[31, 15], [42, 21], [41, 13], [32, 25]]) await c(`/setblock ${A(dx, 1, dz)} azalea`)
    for (const [dx, dz] of [[44, 14], [45, 15], [28, 20], [28, 21]]) await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} mossy_cobblestone`)
    // the village farms are wheat (the narrator runs through it)
    // a wheat field west of the yard (this village has no farms): farmland on the natural ground, a water channel
    for (let dx = 12; dx <= 27; dx++) for (let dz = 15; dz <= 27; dz++) {
      const gy0 = groundAt(ctx, X + dx, Z + dz)
      if (dz === 21) { bot.chat(`/setblock ${X + dx} ${gy0} ${Z + dz} water`); continue }
      bot.chat(`/setblock ${X + dx} ${gy0} ${Z + dz} farmland[moisture=7]`); bot.chat(`/setblock ${X + dx} ${gy0 + 1} ${Z + dz} wheat[age=7]`)
      if (dz % 3 === 0) await bot.waitForTicks(1)
    }
    // the village lamp post and fence on the walk out of the gate (L02)
    await c(`/fill ${A(35, 1, -3)} ${A(37, 6, 11)} air replace oak_fence`); await c(`/fill ${A(35, 1, -3)} ${A(37, 6, 11)} air replace stripped_oak_wood`)
    await c(`/fill ${A(35, 1, -3)} ${A(37, 6, 11)} air replace lantern`)

    // the cast: three villagers for the square (L08), the skeletons and the zombie waiting high above out of view
    const mob = (type, x, y, z, yaw, tag, more = '') => c(`/summon ${type} ${(X + x).toFixed(2)} ${y.toFixed(2)} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,${tag === 'zom' ? '' : 'Invulnerable:1b,'}Tags:["${tag}"],Rotation:[${yaw}f,0f]${more ? ',' + more : ''}}`)
    await c(`/fill ${X - 6} ${F + 60} ${Z - 6} ${X + 6} ${F + 60} ${Z + 6} barrier`)   // the waiting room floor
    await c(`/fill ${X - 6} ${F + 64} ${Z - 6} ${X + 6} ${F + 64} ${Z + 6} stone`)     // and its roof: skeletons and the zombie burned in the time-lapse's daylight
    for (const [tag, prof] of [['v1', 'farmer'], ['v2', 'librarian'], ['v3', 'fisherman']]) await mob('villager', 0, F + 61, 0, 0, tag, `VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1`)
    await mob('skeleton', 2, F + 61, 2, 0, 'sk1', 'equipment:{mainhand:{id:"minecraft:bow",count:1}}')
    await mob('skeleton', -2, F + 61, 2, 0, 'sk2', 'equipment:{mainhand:{id:"minecraft:bow",count:1}}')
    await mob('zombie', 0, F + 61, -3, 0, 'zom')

    // the man joins at the world spawn: put it on the pad first (a spawn 400 blocks away stalled the server)
    await c(`/setworldspawn ${A(37, 1, 15)}`)
    await c('/gamerule respawn_radius 0')
    this.cast = await M.spawnActors(ctx, [GUY])
    await c(`/gamemode survival ${GUY}`)
    await c(`/effect give ${GUY} resistance infinite 2 true`)
    await M.place(ctx, GUY, X + 37.5, Y + 1, Z + 15.5, 180, 20)
    await M.give(ctx, GUY, 'porkchop')
    await c('/clear @s')
    await ctx.tpCheck(X + 36.5, Y + 1, Z + 15.5, 0, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await c('/effect give @s resistance infinite 255 true')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F, Y } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F }, { warm: null })
    const { look, line, say } = K
    ctx.mark('f1_on'); ctx._f1 = true   // a wolf has no HUD
    K.shot('pov')
    const H = Y - F                     // the pad over the village ground
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz) + 1 - F   // feet height (from F) of the ground at a spot
    const P = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
    const cutG = (dx, dz, target, o) => K.cut(dx, dz, target, gy(dx, dz), o)
    // the man, set-relative, every tick while he moves (on the pad, y = H + 1)
    const guy = { x: 37.5, z: 15.5, yaw: 180, pitch: 20, y: H + 1 }
    const placeGuy = () => say(`/tp ${GUY} ${(X + guy.x).toFixed(3)} ${(F + guy.y).toFixed(3)} ${(Z + guy.z).toFixed(3)} ${guy.yaw.toFixed(1)} ${guy.pitch.toFixed(1)}`)
    const putGuy = async (x, z, yaw, pitch = 0, y = H + 1) => {   // a hop out past 64 blocks and back: it snaps (a short one glides)
      say(`/tp ${GUY} ${X} ${F + 60} ${Z + 90}`); await bot.waitForTicks(2)
      Object.assign(guy, { x, z, yaw, pitch, y }); placeGuy()
    }
    const putMob = async (tag, x, z, yaw) => { say(`/tp @e[tag=${tag}] ${X} ${F + 61} ${Z}`); await bot.waitForTicks(2); K.tp(tag, x, gy(x, z), z, yaw) }
    const actorG = (tag, s) => { const a = K.actor(tag, { ...s, y: gy(s.x, s.z) }); return a }
    const stepG = (a, dx, dz) => { K.step(a, dx, dz); a.y = gy(a.x, a.z) }
    const swingGuy = () => this.cast[GUY].swingArm('right')
    const yawTo = (fx, fz, tx, tz) => K.mcYaw(tx - fx, tz - fz)
    const shake = (k, a = 0.02) => [Math.sin(k * 1.9) * a, Math.cos(k * 2.3) * a]
    const eyeY = (dy) => H + 1 + dy   // a height over the pad's feet level

    // auto-jump: a one-block step ahead while running (mineflayer doesn't step up)
    const autoJump = () => {
      const p = bot.entity.position, yw = bot.entity.yaw, ax = p.x - Math.sin(yw) * 0.8, az = p.z - Math.cos(yw) * 0.8
      const b = bot.blockAt(new ctx.Vec3(Math.floor(ax), Math.floor(p.y + 0.1), Math.floor(az)))
      K.ctl('jump', !!(b && b.boundingBox === 'block'))
    }
    // L01: POV, low, sprinting west down the village's main road at golden hour (the sun ahead), past the houses
    const roadZ = -5.5
    await cutG(44.5, roadZ, P(-10, gy(10, roadZ) + 0.6, roadZ))
    K.ctl('sprint', true); K.go(true)
    await K.preroll(8, autoJump)
    await line('L01', async (k) => { autoJump(); K.base = K.aim(P(bot.entity.position.x - X - 20, gy(Math.max(8, bot.entity.position.x - X - 20), roadZ) + 0.6, roadZ)); look(k) })
    // L02: out of his yard through the gate, walking north: about twelve blocks from him, on "standing", he's next
    // to the man again: the establishing crane, his dog beside him, the sea behind
    K.stop()
    await putGuy(37.5, 15.5, 0, 10)
    await K.cut(36.5, 14.0, P(36.6, 1.6, -10), 1)
    K.go(true)
    await line('L02', async (k, at) => {
      if (k < at(3)) { autoJump(); K.base = K.aim(P(36.6, gy(36.6, -10) + 0.6, -10)); look(k) }
      if (k === at(3)) { K.stop(); guy.yaw = yawTo(37.5, 15.5, 36.4, 14.9); guy.pitch = 30; placeGuy(); K.shot('est'); await K.cut(36.4, 14.9, P(37.5, eyeY(1.6), 15.5), H + 1) }
      if (k > at(3)) { K.base = K.aim(P(37.5, eyeY(1.55), 15.5)); look(k) }
    })
    await line('L03', async (k) => { guy.pitch = 32 + Math.sin(k / 9) * 4; placeGuy(); look(k) })

    // L04: the tries. At night up the north road into the hills; through the wheat; swimming in the sea
    K.shot('pov')
    await cutG(7.5, 34, P(7.5, gy(7.5, 14) + 0.6, 0), { time: NIGHT })
    K.ctl('sprint', true); K.go(true)
    await line('L04', async (k, at) => {
      if (k === at(2)) { await cutG(27.5, 19.5, P(0, gy(14, 19.5) + 0.6, 19.5), { time: GOLD }); K.ctl('sprint', true); K.go(true) }
      if (k === at(3)) {
        K.self({}, 1.3)   // a swimming wolf's head is just over the water
        await K.cutTo(55.5, 62.4, 13.5, new ctx.Vec3(X + 90, 63.2, Z + 13.5)); K.go(true); K.ctl('jump', true)
        ctx.sound('entity.generic.splash', 0.5, 1.2)
      }
      if (k < at(3)) autoJump()
      look(k)
    })
    K.stop()

    // L05: in the yard, looking up at him. He holds out a raw porkchop and drops it in front of me
    K.self({}, EYE)
    await putGuy(37.4, 14.6, yawTo(37.4, 14.6, 36.4, 15.6), 42)
    await K.cut(36.4, 15.6, P(37.4, eyeY(1.6), 14.6), H + 1)
    let looking = K.base
    await line('L05', async (k, at) => {
      if (k === at(1)) { swingGuy(); say(`/summon item ${(X + 36.9).toFixed(2)} ${F + H + 1.9} ${(Z + 15.0).toFixed(2)} {Item:{id:"minecraft:porkchop",count:1},PickupDelay:32767}`) }
      if (k >= at(2) && k < at(4)) K.turnTo(looking, P(36.9, H + 1, 15.0), (k - at(2)) / 10)
      if (k === at(4)) looking = K.base
      if (k >= at(4)) K.turnTo(looking, P(37.4, eyeY(1.6), 14.6), (k - at(4)) / 8)
      look(k)
    })
    // L06: on the village road: villagers pass close and look down at me
    K.self({ sitting: false }, EYE)
    const v1 = actorG('v1', { x: 27.6, z: -5.2, yaw: 90, pitch: 30 }), v2 = actorG('v2', { x: 21.4, z: -6.0, yaw: -90, pitch: 30 })
    const v3 = actorG('v3', { x: 30.2, z: -6.1, yaw: 90, pitch: 25 })
    await cutG(24.4, -5.6, P(27.6, gy(27.6, -5.2) + 2.4, -5.2))   // (aimed along the road: at z -8 it looked into the road's fence)
    looking = K.base
    looking = K.base
    await line('L06', async (k, at) => {
      stepG(v1, -0.045, 0.002); v1.pitch = 28
      stepG(v2, 0.04, 0); v2.pitch = 25
      stepG(v3, -0.035, 0); v3.pitch = 20
      if (k >= at(1)) K.turnTo(looking, P(v2.x, v2.y + 2.5, v2.z), (k - at(1)) / 16)
      look(k)
    })
    for (const t of ['v1', 'v2', 'v3']) K.bury(t, -60)

    // L07: "And there's this DOG." Camera shots: walking the road beside him (a follow, low, ahead of them); then on
    // the yard's sea edge, already sitting there as he walks up
    await putGuy(31.6, 14.4, -90, 5)
    await bot.waitForTicks(3)   // (the follow opened on him still at the hop: a red blur)
    K.shot('dog_walk')
    await K.cut(31.8, 15.5, P(50, eyeY(0.4), 15.5), H + 1)
    K.go(true)
    await line('L07', async (k, at) => {
      if (k < at(2)) { guy.x += 0.215; guy.yaw = -90; guy.pitch = 8; placeGuy() }
      if (k === at(2)) {
        K.stop()
        K.self({ sitting: true }, SIT_EYE)
        await putGuy(34.0, 13.8, -60)
        K.shot('dog_sea')
        await K.cut(41.5, 16.5, P(60, eyeY(0.4), 18), H + 1)
      }
      if (k > at(2)) { if (guy.x < 40.4) { guy.x += 0.19; guy.z += 0.07; guy.yaw = -70; guy.pitch = 10; placeGuy() } else { guy.yaw = yawTo(guy.x, guy.z, 41.5, 16.5); guy.pitch = 35; placeGuy() } }
      if (k > at(2) + 8) K.base = K.aim(P(guy.x, eyeY(1.5), guy.z))
      look(k)
    })

    // L08: dusk, sitting at the shut door looking up at it (no bump: the owner's "stuck on the door"); after the line
    // he opens it from inside (no line: narrator-first) and I trot in
    K.self({ sitting: true }, SIT_EYE)
    await putGuy(36.5, 22.2, 180, 30)
    await K.cut(36.5, 18.4, P(36.5, eyeY(1.4), 20.6), H + 1, { time: DUSK })
    K.shot('pov')
    looking = K.base
    const opensAt = K.T('L08') + 2
    await line('L08', async (k) => {
      if (k === opensAt) {
        this.cast[GUY].swingArm('right')
        say(`/setblock ${X + 36} ${Y + 2} ${Z + 20} spruce_door[half=upper,facing=north,open=true]`); say(`/setblock ${X + 36} ${Y + 1} ${Z + 20} spruce_door[half=lower,facing=north,open=true]`)
        ctx.sound('block.wooden_door.open', 0.8, 1)
      }
      if (k === opensAt + 4) K.self({ sitting: false }, EYE)
      if (k > opensAt) K.turnTo(looking, P(36.5, eyeY(1.6), 22.2), (k - opensAt) / 8)
      if (k > opensAt + 6) { guy.pitch = 30 + Math.sin((k - opensAt) / 5) * 6; placeGuy() }   // he looks down at me (no walk-in: the open door's panel stopped him dead)
      look(k, 0, Math.sin(k / 6) * 0.03)
    }, 1.2)
    K.stop()

    K.self({ sitting: false }, EYE)

    // L10: night on the north road in the hills: two skeletons see me, turn and run (skeletons flee from wolves)
    await putMob('sk1', 23.5, -18.2, 90); await putMob('sk2', 21.5, -16.8, 90)
    const sk1 = actorG('sk1', { x: 23.5, z: -18.2, yaw: -90 }), sk2 = actorG('sk2', { x: 21.5, z: -16.8, yaw: -90 })
    await cutG(30.5, -17.5, P(23, gy(23, -17.5) + 1.6, -17.5), { time: NIGHT })
    K.go(true)
    await line('L10', async (k, at) => {
      if (k < at(1)) { sk1.yaw = -90; sk2.yaw = -95 }
      if (k >= at(1)) { stepG(sk1, -0.2, 0.02); stepG(sk2, -0.22, -0.02) }
      autoJump()
      if (k === at(1)) ctx.sound('entity.skeleton.ambient', 0.6, 1.2)
      look(k)
    })
    K.stop(); K.bury('sk1', -60); K.bury('sk2', -60)

    // L11: night, the yard: the zombie walks in from the road. L12: "Hey! Get back!" it hits him; the wolf at his
    // side gets up, eyes red. A camera shot from the yard's west corner
    await putGuy(37.5, 15.2, 0, 0)
    await putMob('zom', 36.6, 6.0, 0)
    const zom = actorG('zom', { x: 36.6, z: 6.0, yaw: 0 })
    K.self({ sitting: true }, SIT_EYE)
    await bot.waitForTicks(3)
    K.shot('night_yard')
    await K.cut(36.4, 15.6, P(37.5, eyeY(1.6), 15.2), H + 1)
    const zWalk = (speed) => { const dx = 37.6 - zom.x, dz = 14.0 - zom.z, d = Math.hypot(dx, dz); if (d > 0.15) stepG(zom, dx / d * speed, dz / d * speed); zom.yaw = K.mcYaw(dx, dz) }
    await line('L11', async (k) => {
      zWalk(0.12)
      if (k === 6) ctx.sound('entity.zombie.ambient', 0.8, 1)
      if (k > 10) { guy.yaw = yawTo(37.5, 15.2, zom.x, zom.z); placeGuy() }
      K.base = K.aim(P(zom.x, zom.y + 1.5, zom.z)); look(k)
    })
    await line('L12', async (k) => {
      zWalk(0.08)
      if (k === 2) { say(`/damage ${GUY} 4 minecraft:mob_attack by @e[tag=zom,limit=1]`); K.self({ sitting: false, angry: true }, EYE); ctx.sound('entity.wolf.growl', 0.9, 1) }
      guy.yaw = yawTo(37.5, 15.2, zom.x, zom.z); placeGuy()
      K.base = K.aim(P(zom.x, zom.y + 1.4, zom.z)); look(k)
    })

    // L13: POV: "And I just... LOST it." Two bites and it's down
    K.shot('pov')
    K.ctl('sprint', true); K.go(true)
    const zEnt = () => Object.values(bot.entities).find(e => e.name === 'zombie')
    await line('L13', async (k, at) => {
      const [sy, sp] = shake(k, 0.035)
      if (k === at(0) + 4 || k === at(1) + 2) { const z = zEnt(); if (z) bot.attack(z); ctx.sound('entity.wolf.growl', 1, 1.1) }
      if (k === at(1) + 10) { say('/damage @e[tag=zom,limit=1] 100 minecraft:mob_attack by @s'); K.stop() }
      if (k < at(1) + 10) { const z = zEnt(); if (z && bot.entity.position.distanceTo(z.position) < 1.3) K.go(false) }
      const zp = P(zom.x, zom.y + 1.0, zom.z); if (bot.entity.position.distanceTo(zp) > 1.6) K.base = K.aim(zp); look(k, sy, sp)
    })
    K.stop(); K.actors.delete('zom')

    // L14: "GOOD BOY!" Cheerful and loud, a pat on the head, and the camera pulls out of my head: a wolf with a red
    // collar, wagging, barking. Hard cut (owner: the payoff is physical and funny, never tender)
    K.self({ sitting: true, angry: false }, SIT_EYE)
    await putGuy(38.7, 16.2, 90, 40)
    this.cast[GUY].setControlState('sneak', true)
    await bot.waitForTicks(3)
    K.shot('reveal')
    await K.cut(37.5, 16.2, P(38.7, eyeY(1.25), 16.2), H + 1)
    await line('L14', async (k) => {
      if (k === 0 || k === 6) swingGuy()   // the pat
      if (k === 4) K.self({ wag: true })
      if (k === 10) ctx.mark('particles', { type: 'heart', x: X + 37.5, y: Y + 1, z: Z + 16.2, count: 7 })
      guy.pitch = 40 + Math.sin(k / 3) * 4; placeGuy()
      look(k, 0, Math.sin(k / 2) * 0.03)
    }, 0.35)
    ctx.sound('entity.wolf.ambient', 1, 1.05)   // the bark: the hard cut lands on it
    ctx.mark('bark')
    for (let k = 0; k < 10; k++) { look(k, 0, k < 3 ? 0.12 : 0); await bot.waitForTicks(1) }
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    this.cast[GUY].setControlState('sneak', false)
    M.quitActors(ctx)
    return true
  }
}

// The old man's cottage, pad-relative (floor at dy 0): x 33..39, z 20..28, the door at (36, 20) facing north
async function cottage (c, A) {
  const f = (a, b, blk) => c(`/fill ${A(...a)} ${A(...b)} ${blk}`)
  const set = (a, blk) => c(`/setblock ${A(...a)} ${blk}`)
  await f([33, -3, 20], [39, 0, 28], 'cobblestone')                      // foundation into the pad
  await f([33, 1, 20], [39, 1, 28], 'cobblestone')                       // the plinth row...
  await f([34, 1, 21], [38, 1, 27], 'air')
  for (const [x, z] of [[33, 21], [39, 25], [35, 28], [33, 26]]) await set([x, 1, z], 'mossy_cobblestone')
  await f([33, 2, 20], [39, 4, 28], 'oak_planks hollow')                   // ...the plank body
  await f([34, 2, 21], [38, 4, 27], 'air')
  await f([34, 0, 21], [38, 0, 27], 'spruce_planks')                     // the floor
  for (const [x, z] of [[33, 20], [39, 20], [33, 28], [39, 28], [33, 24], [39, 24]]) await f([x, 1, z], [x, 4, z], 'spruce_log')   // the frame
  for (const [x, z] of [[32, 24], [40, 24]]) await f([x, 1, z], [x, 3, z], 'stripped_spruce_log')                                 // proud mid pillars
  await f([33, 4, 20], [39, 4, 20], 'spruce_log[axis=x]'); await f([33, 4, 28], [39, 4, 28], 'spruce_log[axis=x]')                  // the top beams
  await f([33, 4, 21], [33, 4, 27], 'spruce_log[axis=z]'); await f([39, 4, 21], [39, 4, 27], 'spruce_log[axis=z]')
  // windows: the wall opened, panes set one block in (a recess), shutters beside them
  for (const z of [22, 26]) for (const [wx, px, sx, face] of [[33, 34, 32, 'west'], [39, 38, 40, 'east']]) {
    await f([wx, 2, z], [wx, 3, z], 'air'); await f([px, 2, z], [px, 3, z], 'glass_pane')
    for (const dz of [-1, 1]) await f([sx, 2, z + dz], [sx, 3, z + dz], `spruce_trapdoor[facing=${face},open=true,half=bottom]`)
  }
  for (const x of [34, 38]) { await f([x, 2, 20], [x, 3, 20], 'air'); await f([x, 2, 21], [x, 3, 21], 'glass_pane') }
  await set([36, 1, 20], 'spruce_door[half=lower,facing=north,open=false]'); await set([36, 2, 20], 'spruce_door[half=upper,facing=north,open=false]')
  await set([36, 4, 19], 'spruce_slab[type=top]'); await set([35, 3, 19], 'lantern[hanging=false]'); await set([35, 2, 19], 'air')
  await f([35, 1, 19], [35, 2, 19], 'spruce_fence'); await set([37, 1, 19], 'spruce_fence'); await set([37, 2, 19], 'lantern')
  // the roof: dark oak stairs from the eaves (one block out) to the ridge at x 36, one block past each gable
  for (let k = 0; k <= 3; k++) {
    await f([32 + k, 4 + k, 19], [32 + k, 4 + k, 29], 'dark_oak_stairs[facing=east]')
    await f([40 - k, 4 + k, 19], [40 - k, 4 + k, 29], 'dark_oak_stairs[facing=west]')
  }
  await f([36, 8, 19], [36, 8, 29], 'dark_oak_slab[type=bottom]')
  await f([36, 7, 19], [36, 7, 29], 'dark_oak_planks')
  for (const z of [20, 28]) { await f([34, 5, z], [38, 5, z], 'oak_planks'); await f([35, 6, z], [37, 6, z], 'oak_planks'); await set([36, 6, z], 'spruce_trapdoor[facing=north,half=bottom,open=true]') }
  await set([36, 7, 20], 'dark_oak_planks'); await set([36, 7, 28], 'dark_oak_planks')
  // the chimney, smoking, and a warm light inside
  await f([38, 1, 26], [38, 9, 26], 'cobblestone'); await set([38, 10, 26], 'campfire[lit=true]')
  for (const [x, z] of [[34, 22], [38, 22], [34, 27]]) { await set([x, 1, z], 'spruce_fence'); await set([x, 2, z], 'lantern') }
}

// The ground's top solid block at (x, z), ignoring plants, crops, leaves, logs, fences and lanterns
function groundAt (ctx, x, z) {
  const { bot } = ctx
  for (let y = Math.floor(ctx.bot.entity.position.y) + 40; y > 40; y--) {
    const b = bot.blockAt(new ctx.Vec3(Math.floor(x), y, Math.floor(z)))
    if (!b) continue
    if (b.boundingBox !== 'block' || /_leaves$|_log$|fence|lantern|^farmland$|^barrier$/.test(b.name)) { if (b.name === 'farmland' || b.name === 'dirt_path') return y; continue }
    return y
  }
  return 70
}

// The camera shots: offsets from O = (X, F, Z), F the pad's floor (rec.set.y)
const H = 0
module.exports.shots = {
  pov: { pov: true },
  // L02-L03: back next to him. A crane down onto the yard at golden hour from the west (the sun behind the camera):
  // the cottage, the sea behind, the man, and his "dog" beside him
  est: { dof: false, path: [[0, 24, H + 13, 4], [3.6, 31.5, H + 3.6, 11.5]], lookPath: [[0, 37, H + 1.0, 16], [3.6, 37, H + 1.4, 15.2]], ease: true },
  // L09: walking the road beside him: a follow ahead of them and low (they walk east, toward it)
  dog_walk: { follow: `actor:${GUY}`, offset: [3.4, -1.15, 2.2], look: { of: `actor:${GUY}`, offset: [0.0, -0.1, 0.5] }, lag: 2, fov: 54 },   // (low, looking up: the yard grass filled 47% of the frame)
  // L09: on the yard's sea edge, sitting there already as he walks up (from the south-east, the sea behind them)
  dog_sea: { at: [42.4, H + 1.3, 21.0], look: [39.6, H + 1.5, 15.0], fov: 46, push: 0.3, dof: { aperture: 0.8, focus: { of: 'self', offset: [0, -1.1, 0] } } },
  // L14-L15: night, the yard from its south-west corner: the road, the zombie walking in, the man and the wolf
  night_yard: { at: [33.4, H + 1.5, 19.2], look: [37.6, H + 1.9, 11.0], fov: 56, push: 0.35, dof: { aperture: 0.7, focus: { of: 'self', offset: [0, -1.1, 0] } } },
  // L18-L19: the reveal. From the narrator's eye (sitting, looking up at him) back and out to a low three-quarter
  // shot of the wolf at his feet, then up into a crane over the yard, the village and the sea as the night turns
  reveal: { path: [[0, 37.5, H + 1.5, 16.2], [0.45, 36.6, H + 1.6, 17.5], [1.2, 35.4, H + 1.75, 18.4], [2.6, 35.2, H + 1.5, 18.2]], lookPath: [[0, 38.7, H + 2.3, 16.2], [0.45, 38.0, H + 1.5, 16.2], [1.2, 37.8, H + 1.5, 16.0], [2.6, 38.2, H + 1.9, 15.6]], ease: true, dof: { aperture: 0.7, focus: { of: 'self', offset: [0, -1.1, 0] } } }
}
