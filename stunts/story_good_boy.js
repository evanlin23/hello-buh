// Story Short "i can't get away from this guy 😭" (stories/good_boy): the cinematic pilot (docs/stories.md "Cinematic
// stories"). The narrator has tried to run away from a guy 37 times; every time he gets twelve blocks away he is
// right back next to him. He's fed raw porkchops, sits when told, everyone is tall, sheep look delicious, he can't
// open doors, skeletons run from him, and there's a dog that is always exactly where he is. A zombie hits the guy
// and he goes crazy. In the morning the guy scratches his ears, and the camera pulls out of his head for the reveal:
// he IS the dog (a tamed wolf: vanilla tamed wolves teleport to their owner from 12+ blocks away, are fed meat,
// sit on command, can't open doors, scare skeletons and attack whatever hurts their owner). Last line: "Tomorrow
// I'm leaving for real." loops into "I've tried to run away from this guy thirty-seven times."
//
// The cinematic trick: first-person shots hide who "I" am (a low camera, stunt.self.eye 0.68: a wolf's eye height),
// and every camera shot shows the truth from the second line on (stunt.self.model: the narrator drawn as a wolf with
// a red collar, always at the guy's side). Rewatch: the "dog" is wherever the narrator is because it's him.
//
// Set (plains, origin O): the guy's cottage (x 0..5, z 0..5, door north at x 2), the yard north of it, a path north
// through the village (two houses, lantern posts), a sheep pen west of the path, a wheat field west of the cottage,
// a lake east of it. The guy is an actor bot (lib/movie.js), moved by /tp.
const path = require('path')
const M = require('../lib/movie')
const { storyLines, storyKit, setKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'good_boy')
const CAPTION = "i can't get away from this guy 😭"
const GOLD = 12300, NIGHT = 18000, DUSK = 12900, DAWN = 23600
const GUY = 'Sam'
const SIT_EYE = 0.5, EYE = 0.68

module.exports = {
  name: 'story_good_boy',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  time: GOLD,
  botTimeout: 420,
  hideHand: true,          // no first-person arm
  hud: false,              // and no HUD (lib/story.js K.shot keeps F1 on for POV shots too)
  // the narrator from outside: a tamed wolf with a red collar (render.js stunt.self); the POV camera at its eye
  self: { model: 'wolf', eye: EYE, extra: { tame: true, collar: 14 } },
  cast: { [GUY]: 'steve' },
  idleLife: true,
  // the cinematic look: warm grade, bloom on the lanterns and the sky, depth of field on camera shots, sun shadows,
  // god rays. No letterbox: the Short's game view is the frame
  look: { grade: { lift: [0.02, 0.01, 0.018], gamma: [0.97, 1.0, 1.04], gain: [1.12, 1.02, 0.88], sat: 1.14, contrast: 0.12, exposure: 1.06 }, bloom: 0.5, bloomThreshold: 0.72, vignette: 0.38, grain: 0.02, dof: { aperture: 0.9 }, shadows: true, rays: 0.5, cloudNight: 0.42 },
  shots: {
    pov: { pov: true },
    // L02: back next to him. A crane down onto the yard at golden hour: the guy, the cottage, and his "dog" beside him
    est: { dof: false, path: [[0, -7, 10, -15], [2.4, -3.2, 4.2, -9.5]], lookPath: [[0, 3, 1.0, -2.6], [2.4, 3, 1.3, -2.8]], ease: true },
    // L08: "this DOG": walking up the path beside him (a follow ahead of them, low), then at the lake, already there
    dog_walk: { follow: `actor:${GUY}`, offset: [2.6, 0.2, -4.2], look: { of: `actor:${GUY}`, offset: [0.4, -0.9, 0] }, lag: 2, fov: 52 },
    dog_lake: { at: [16.6, 2.1, 5.2], look: [12.1, 1.1, 0.9], fov: 46, push: 0.3 },
    // L12: night, the yard from the west: the zombie comes in and hits him; the wolf beside him gets up, eyes red
    night_yard: { at: [-3.2, 2.0, -6.6], look: [3.4, 1.3, -4.0], fov: 52, push: 0.25 },
    // L14-L15: the reveal. The camera leaves the narrator's eye (looking up at the guy) and pulls back and out to a
    // low three-quarter shot of the wolf sitting at his feet, then rises in the morning light
    reveal: { path: [[0, 1.5, 1.5, -4.5], [0.7, 1.85, 1.6, -5.7], [1.8, 2.7, 1.75, -7.5], [4.4, 3.4, 2.7, -9.0]], lookPath: [[0, 2.9, 2.62, -4.5], [0.7, 2.4, 1.7, -4.6], [1.8, 2.15, 1.35, -4.5], [4.4, 2.2, 1.45, -4.5]], ease: true, dof: { aperture: 0.7 } }
  },
  edit: { caption: CAPTION, red: 'guy', story: 'stories/good_boy', startAt: 'line:0', endAfter: 'story_end:0' },

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
    await c('/gamerule random_tick_speed 0')   // the farmland stays farmland, the wheat stays grown
    await c('/difficulty normal')
    await clearSet(ctx, A, 64, 24)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 28)

    // the cottage, door north (shut), and the yard
    await house(ctx, A, 0, 0, 2, 0, 'north', false)
    await c(`/fill ${A(2, 0, -1)} ${A(2, 0, -46)} dirt_path`)
    for (const [dx, dz] of [[4, -3], [0, -12], [4, -22], [0, -32], [4, -40]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    // the village up the path
    await house(ctx, A, -9, -18, -4, -16, 'east', true)
    await house(ctx, A, 7, -30, 7, -28, 'west', true)
    // the sheep pen west of the path
    await c(`/fill ${A(-10, 1, -7)} ${A(-4, 1, -1)} oak_fence hollow`)
    // the wheat field west of the cottage
    await c(`/fill ${A(-22, 0, 3)} ${A(-6, 0, 14)} farmland[moisture=7]`)
    await c(`/fill ${A(-22, 1, 3)} ${A(-6, 1, 14)} wheat[age=7]`)
    // the lake east of the cottage
    await c(`/fill ${A(14, -3, -9)} ${A(30, 0, 8)} water`)
    await c(`/fill ${A(13, 0, -9)} ${A(13, 0, 8)} sand`)
    for (const [dx, dz, b] of [[-2, -6, 'poppy'], [6, -9, 'dandelion'], [-1, -20, 'cornflower'], [5, -15, 'oxeye_daisy'], [9, -2, 'poppy'], [-3, -3, 'dandelion']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    await c(`/place feature minecraft:oak ${A(-4, 1, 7)}`)
    await c(`/place feature minecraft:birch ${A(10, 1, 10)}`)

    // the cast (NoAI). Villagers on the path (L01, L06), sheep in the pen (L07); the skeletons and the zombie wait
    // out past 64 blocks (their scenes put them in)
    await vil(1.5, -26, 0, 'farmer', ['v1', 'warm'])
    await vil(3.5, -14, 90, 'librarian', ['v2', 'warm'])
    await vil(0.8, -19, -90, 'fisherman', ['v3', 'warm'])
    await mob('sheep', -7.5, 1, -4.5, 30, ['sh1', 'warm'], 'Color:0b')
    await mob('sheep', -5.5, 1, -2.8, 200, ['sh2', 'warm'], 'Color:0b')
    await mob('sheep', -8.6, 1, -2.4, 120, ['sh3', 'warm'], 'Color:8b')
    await mob('skeleton', 0.5, 30, 80.5, 0, ['sk1'], 'equipment:{mainhand:{id:"minecraft:bow",count:1}}')
    await mob('skeleton', 2.5, 30, 82.5, 0, ['sk2'], 'equipment:{mainhand:{id:"minecraft:bow",count:1}}')
    await c(`/summon zombie ${X + 4.5} ${F + 30} ${Z + 84.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["zom"],Rotation:[0f,0f]}`)
    await c('/fill ' + A(-2, 29, 78) + ' ' + A(8, 29, 88) + ' barrier')   // their waiting room floor

    // the guy: an actor bot, a raw porkchop in hand
    // (he joins at the world spawn: put it on the set first. At the default spawn 260 blocks away, generating his
    // chunks stalled the server for 5 s and the recording bot timed out)
    await c(`/setworldspawn ${A(2, 1, -2)}`)
    await c('/gamerule respawn_radius 0')
    this.cast = await M.spawnActors(ctx, [GUY])
    await c(`/gamemode survival ${GUY}`)
    await M.place(ctx, GUY, X + 2.5, F + 1, Z - 1.6, 180, 20)
    await M.give(ctx, GUY, 'porkchop')

    await c('/clear @s')
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X + 2.5, F + 1, Z - 5.0, 180, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await c('/effect give @s resistance infinite 255 true')   // the narrator never takes damage
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, look, line, cut, say } = K
    ctx.mark('f1_on')   // a wolf has no HUD
    ctx._f1 = true
    K.shot('pov')
    // the guy, set-relative, every tick while he moves (a player /tp'd each tick walks in the render)
    const guy = { x: 2.5, z: -1.6, yaw: 180, pitch: 20 }
    const placeGuy = () => say(`/tp ${GUY} ${(X + guy.x).toFixed(3)} ${F + 1} ${(Z + guy.z).toFixed(3)} ${guy.yaw.toFixed(1)} ${guy.pitch.toFixed(1)}`)
    // a hop out past 64 blocks and back: a short teleport glides in the render (vanilla lerp); this one snaps
    const putGuy = async (x, z, yaw, pitch = 0) => {
      say(`/tp ${GUY} ${X + 0.5} ${F + 30} ${Z + 72.5}`); await bot.waitForTicks(2)
      Object.assign(guy, { x, z, yaw, pitch }); placeGuy()
    }
    const putMob = async (tag, x, z, yaw) => { say(`/tp @e[tag=${tag}] ${X + 0.5} ${F + 30} ${Z + 72.5}`); await bot.waitForTicks(2); K.tp(tag, x, 1, z, yaw) }
    const swingGuy = () => this.cast[GUY].swingArm('right')
    const yawTo = (fx, fz, tx, tz) => K.mcYaw(tx - fx, tz - fz)
    const pitchTo = (fx, fz, tx, tz, dy) => -Math.atan2(dy, Math.hypot(tx - fx, tz - fz)) * 180 / Math.PI
    const shake = (k, a = 0.02) => [Math.sin(k * 1.9) * a, Math.cos(k * 2.3) * a]

    // L01: POV, low, sprinting up the path away from the cottage at golden hour; a villager comes down the path
    const v1 = K.actor('v1', { x: 1.5, z: -26, yaw: 0 })
    await cut(2.5, -5.0, P(2.5, 0.8, -40))
    K.ctl('sprint', true); K.go(true)
    await K.preroll(8, () => K.step(v1, 0, 0.05))
    await line('L01', async (k) => { K.step(v1, 0, 0.05); look(k) })
    // L02: still running... and on "BACK" he's in the yard next to the guy: the establishing crane, his dog beside him
    await putGuy(3.6, -2.9, yawTo(3.6, -2.9, -6, -12), 5)
    await line('L02', async (k, at) => {
      if (k < at(5)) { K.step(v1, 0, 0.05); look(k) }
      if (k === at(5)) {
        await cut(2.4, -2.5, P(3.6, 2.6, -2.9))
        K.shot('est')
      }
      if (k > at(5)) { K.base = K.aim(P(3.6, 2.5, -2.9)); look(k, 0, 0) }
    }, 0.9)
    K.bury('v1')

    // L03: the tries. At night up the path; through the wheat; swimming in the lake
    K.shot('pov')
    await cut(2.5, -17, P(2.5, 0.8, -45), 1, { time: NIGHT })
    K.ctl('sprint', true); K.go(true)
    await line('L03', async (k, at) => {
      if (k === at(2)) { await cut(-6.5, 8.5, P(-30, 0.6, 9.5), 1, { time: GOLD }); K.ctl('sprint', true); K.go(true) }
      if (k === at(4)) {
        K.self({}, 1.3)   // a swimming wolf's head is just over the water
        await K.cutTo(15.5, F - 0.7, -0.5, P(40, 0.4, -1.5)); K.go(true); K.ctl('jump', true)
        ctx.sound('entity.generic.splash', 0.5, 1.2)
      }
      look(k)
    })
    K.stop()

    // L04: in the yard, looking up at him. He holds a raw porkchop and drops it in front of me
    K.self({}, EYE)
    await putGuy(3.5, -3.6, yawTo(3.5, -3.6, 2.4, -2.6), 42)
    await cut(2.4, -2.6, P(3.5, 2.6, -3.6))
    let looking = K.base
    await line('L04', async (k, at) => {
      if (k === at(1)) { swingGuy(); say(`/summon item ${(X + 2.8).toFixed(2)} ${F + 1.9} ${(Z - 3.1).toFixed(2)} {Item:{id:"minecraft:porkchop",count:1},PickupDelay:32767}`) }
      if (k >= at(2) && k < at(4)) K.turnTo(looking, P(2.8, 1, -3.1), (k - at(2)) / 10)   // down at the porkchop
      if (k === at(4)) looking = K.base
      if (k >= at(4)) K.turnTo(looking, P(3.5, 2.6, -3.6), (k - at(4)) / 8)                // and back up at him
      look(k)
    })
    // L05: "SIT." I sit (the eye drops), and he nods
    looking = K.base
    await line('L05', async (k, at) => {
      if (k === at(1)) swingGuy()
      if (k === at(2)) { K.self({ sitting: true }, SIT_EYE); say('/kill @e[type=item]'); ctx.sound('entity.wolf.pant', 0.3, 1) }
      if (k >= at(3) && k < at(3) + 8) { guy.pitch = 42 + Math.sin((k - at(3)) / 8 * Math.PI) * 14; placeGuy() }
      if (k >= at(2)) K.turnTo(looking, P(3.5, 2.6, -3.6), 1)
      look(k)
    })

    // L06: up the path among the villagers: everyone is so tall (they look down at me as they pass)
    K.self({ sitting: false }, EYE)
    const v2 = K.actor('v2', { x: 3.3, z: -15.2, yaw: 180, pitch: 30 }), v3 = K.actor('v3', { x: 1.2, z: -12.2, yaw: 0, pitch: 30 })
    await cut(2.4, -13.6, P(3.2, 2.8, -15.0))
    looking = K.base
    await line('L06', async (k, at) => {
      K.step(v2, -0.012, 0.035); v2.pitch = 28
      K.step(v3, 0.004, -0.03); v3.pitch = 25
      if (k >= at(1)) K.turnTo(looking, P(v3.x, 2.9, v3.z), (k - at(1)) / 14)
      look(k)
    })
    K.bury('v2'); K.bury('v3')

    // L07: at the sheep pen, staring through the fence. The sheep stares back and backs off
    const sh1 = K.actor('sh1', { x: -6.8, z: -6.0, yaw: 0 })
    await cut(-6.6, -8.4, P(-6.8, 1.4, -5.6))
    await line('L07', async (k, at) => {
      if (k < at(2)) sh1.yaw = 180 + Math.sin(k / 6) * 10
      if (k === at(2)) ctx.sound('entity.wolf.pant', 0.35, 1)
      if (k >= at(2)) { K.step(sh1, 0.01, 0.04); sh1.yaw = 180 }   // backing away, still facing me
      look(k, 0, Math.sin(k / 5) * 0.015)
    })
    K.bury('sh1')

    // L08: "And there's this DOG." Camera shots: walking up the path beside him; then at the lake, already there
    await putGuy(2.0, -6.0, 180)
    await cut(3.1, -6.6, P(3.1, 0.8, -30))
    K.shot('dog_walk')
    K.go(true)
    await line('L08', async (k, at) => {
      if (k < at(2)) { guy.z -= 0.215; guy.yaw = 180; guy.pitch = 5; placeGuy() }
      if (k === at(2)) {
        K.stop()
        K.self({ sitting: true }, SIT_EYE)
        await cut(12.9, 1.5, P(20, 1.2, 1.5))
        await putGuy(8.0, 0.6, -90)
        K.shot('dog_lake')
      }
      if (k > at(2)) { if (guy.x < 12.0) { guy.x += 0.2; guy.yaw = -90; guy.pitch = 10; placeGuy() } else { guy.yaw = yawTo(guy.x, guy.z, 12.9, 1.5); guy.pitch = 35; placeGuy() } }
      if (k > at(2) + 6) K.base = K.aim(P(guy.x, 2.4, guy.z))   // the wolf looks up at him as he arrives
      look(k)
    }, 0.4)

    // L09: dusk, outside the shut door. I push at it; he opens it and lets me in
    K.self({ sitting: false }, EYE)
    await putGuy(2.5, 2.2, 180, 30)
    await cut(2.5, -1.4, P(2.5, 1.0, 1.0), 1, { time: DUSK })
    K.shot('pov')
    K.go(true)
    looking = K.base
    await line('L09', async (k, at) => {
      if (k === at(1)) K.go(false)
      if (k === at(2)) K.go(true)
      if (k === at(3)) {
        say(`/setblock ${X + 2} ${F + 2} ${Z} oak_door[half=upper,facing=north,open=true]`); say(`/setblock ${X + 2} ${F + 1} ${Z} oak_door[half=lower,facing=north,open=true]`)
        ctx.sound('block.wooden_door.open', 0.8, 1)
      }
      if (k >= at(3)) K.turnTo(looking, P(2.5, 2.6, 2.2), (k - at(3)) / 10)
      if (k >= at(4)) { guy.z = Math.min(3.6, guy.z + 0.06); placeGuy() }
      look(k)
    })
    K.stop()

    // L10: he leaves; I sit by the door for hours (a time-lapse: morning to evening on one shot)
    await putGuy(2.3, -5.0, 180, 0)
    K.self({ sitting: true }, SIT_EYE)
    await cut(2.5, -1.5, P(2.5, 0.9, -30), 1, { time: 1000 })
    let tl = 1000
    await line('L10', async (k) => {
      if (guy.z > -16) { guy.z -= 0.22; placeGuy() } else if (guy.z > -100) { say(`/tp ${GUY} ${X + 0.5} ${F + 30} ${Z + 72.5}`); guy.z = -200 }
      tl += 260; K.setTime(tl)
      look(k)
    })
    K.self({ sitting: false }, EYE)

    // L11: night on the path. Two skeletons see me and run (skeletons flee from wolves)
    await putMob('sk1', 1.5, -40.5, 0); await putMob('sk2', 4.0, -42.0, 20)
    const sk1 = K.actor('sk1', { x: 1.5, z: -40.5, yaw: 0 }), sk2 = K.actor('sk2', { x: 4.0, z: -42.0, yaw: 20 })
    await cut(2.5, -34.5, P(2.7, 1.6, -41.5), 1, { time: NIGHT })
    K.go(true)
    await line('L11', async (k, at) => {
      if (k < at(1)) { sk1.yaw = 0; sk2.yaw = 15 }
      if (k >= at(1)) { K.step(sk1, -0.02, -0.2); K.step(sk2, 0.03, -0.22) }   // turn and run
      if (k === at(1)) ctx.sound('entity.skeleton.ambient', 0.6, 1.2)
      look(k)
    })
    K.stop(); K.bury('sk1'); K.bury('sk2')

    // L12: night, the yard from the west: the zombie walks in and hits him. The wolf (sitting by him) gets up, eyes red
    await putGuy(3.5, -3.6, 0, 0)
    await putMob('zom', 6.5, -10.0, 20)
    const zom = K.actor('zom', { x: 6.5, z: -10.0, yaw: 20 })
    K.self({ sitting: true }, SIT_EYE)
    await cut(2.4, -3.0, P(3.5, 2.4, -3.6))
    K.shot('night_yard')
    await line('L12', async (k, at) => {
      if (k < at(2)) { const dx = 3.6 - zom.x, dz = -4.6 - zom.z, d = Math.hypot(dx, dz); if (d > 0.1) K.step(zom, dx / d * 0.14, dz / d * 0.14); zom.yaw = K.mcYaw(dx, dz) }
      if (k === 4) ctx.sound('entity.zombie.ambient', 0.8, 1)
      if (k === at(2)) { say(`/damage ${GUY} 4 minecraft:mob_attack by @e[tag=zom,limit=1]`); K.self({ sitting: false, angry: true }, EYE); ctx.sound('entity.wolf.growl', 0.9, 1) }
      if (k >= at(2)) { guy.yaw = yawTo(3.5, -3.6, zom.x, zom.z); placeGuy() }
      K.base = K.aim(P(zom.x, 2.4, zom.z)); look(k)
    }, 0.2)

    // L13: POV: I go for it. Two bites and it's down
    K.shot('pov')
    await cut(2.6, -3.4, P(zom.x, 1.6, zom.z))
    K.ctl('sprint', true); K.go(true)
    const zEnt = () => Object.values(bot.entities).find(e => e.name === 'zombie')
    await line('L13', async (k, at) => {
      const [sy, sp] = shake(k, 0.03)
      if (k === at(1) || k === at(2)) { const z = zEnt(); if (z) bot.attack(z); ctx.sound('entity.wolf.growl', 1, 1.1) }
      if (k === at(3)) { say('/damage @e[tag=zom,limit=1] 100 minecraft:mob_attack by @s'); K.stop() }
      if (k < at(3)) { const z = zEnt(); if (z && bot.entity.position.distanceTo(z.position) < 1.4) K.go(false) }
      K.base = K.aim(P(zom.x, 1.4, zom.z)); look(k, sy, sp)
    }, 0.2)
    K.stop()
    K.actors.delete('zom')

    // L14: morning. Sitting at his feet, looking up; he hands me a porkchop and scratches my ears: the camera leaves
    // my head (the reveal) and pulls back to the wolf with the red collar. L15 over the rising crane, then the end
    K.self({ sitting: true, angry: false }, SIT_EYE)
    await putGuy(2.9, -4.5, 90, 45)
    await cut(1.5, -4.5, P(2.9, 2.62, -4.5), 1, { time: DAWN })
    await line('L14', async (k, at) => {
      if (k === at(2)) swingGuy()
      if (k === at(3)) { swingGuy(); K.shot('reveal') }
      if (k === at(3) + 6) { ctx.mark('particles', { type: 'heart', x: X + 1.5, y: F + 1, z: Z - 4.5, count: 7 }); ctx.sound('entity.wolf.pant', 0.6, 1) }
      if (k > at(3)) { guy.pitch = 45 + Math.sin((k - at(3)) / 4) * 4; placeGuy() }
      look(k)
    })
    await line('L15', async (k) => {
      if (k === 6) ctx.mark('particles', { type: 'heart', x: X + 1.5, y: F + 1, z: Z - 4.5, count: 5 })
      guy.pitch = 45 + Math.sin(k / 5) * 3; placeGuy()
      look(k, Math.sin(k / 9) * 0.08)   // his head tilts as he listens
    })
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    M.quitActors(ctx)
    return true
  }
}
