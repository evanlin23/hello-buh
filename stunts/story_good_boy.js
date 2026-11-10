// Story Short "my human tried to lose me 37 times" (stories/good_boy, story.json v2, the rework: script_vNext.md r3).
// The narrator is Buh's tamed wolf, said openly from line 1. Buh (16, never named aloud) has tried to lose it 37
// times: a tamed wolf teleports to its owner from 12 blocks (it blinks in beside him: the first frame), unless it is
// sitting, and a sitting dog waits forever. He wants it to forget him, so he never makes it sit. College; "sorry,
// buddy" every night; a zombie, and the dog got there first. This morning he walked it up Dog Hill to his old hut:
// "sit, boy", "I'll be right back", and the chat says "Buh left the game". The one sit he avoided 37 times is the one
// he finally used: the first frame of Dog on the Hill.
//
// Sets: Saltmouth (seed hellobuh's plains village, O = (-304, -384); the cottage on its east-edge pad above the sea,
// the yard, the road, the wheat, the north road, a sand island built off the shore) and Dog Hill (docs/world/map.json,
// built by world.build as of day 3400: the meadow, Buh's hut, the patch; the canonical dog and bones removed: this is
// the morning he left). Dog Hill is 530 blocks north-east: its chunks come in through chunkStops + recordRadius.
// Every move goes through the story kit (K.actor for Buh, K.cut / K.go / K.self for the wolf): ./hb motion clean.
const path = require('path')
const M = require('../lib/movie')
const world = require('../lib/world')
const { storyLines, storyKit, setKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'good_boy')
const CAPTION = 'my human tried to lose me 37 times 🐺'
const GOLD = 12300, NIGHT = 18000, DUSK = 13000, MORNING = 1500
const GUY = 'Buh', TAG = 'buh'
const SIT_EYE = 0.5, EYE = 0.68
const VX = -304, VZ = -384          // Saltmouth (the plains village; map.json saltmouth)
// Dog Hill, set-relative (F = 70): D = (-202, 108, -898) is the dog's block, the patch P = D + (3, 0, 0), the hut at
// D + (3..7, 1..4, -8..-4); feet on the meadow at y 109
const DX = 102.5, DZ = -513.5, HILL = 39

module.exports = {
  name: 'story_good_boy',
  hideBoxes: [[-6, 60, -6, 6, 64, 6]],   // the cast's waiting room (barrier floor F+60, stone roof F+64) is not drawn: its roof read as a black square in the dusk sky
  near: [VX, VZ],
  caption: CAPTION,
  time: GOLD,
  botTimeout: 480,
  renderDistance: 10, recordRadius: 700,   // Dog Hill is 514 blocks north of the set (its chunks: chunkStops)
  chunkStops (set) { return [{ x: -202, z: -898 }, { x: -190, z: -880 }] },
  hideHand: true,          // no first-person arm
  hud: false,              // and no HUD (lib/story.js K.shot keeps F1 on for POV shots too)
  self: { model: 'wolf', eye: EYE, extra: { tame: true, collar: 14 } },
  cast: { [GUY]: 'steve' },
  idleLife: true,
  look: { grade: { lift: [0.02, 0.01, 0.018], gamma: [0.97, 1.0, 1.04], gain: [1.12, 1.02, 0.88], sat: 1.14, contrast: 0.12, exposure: 1.06 }, bloom: 0.5, bloomThreshold: 0.72, vignette: 0.38, grain: 0.02, dof: { aperture: 0.9 }, shadows: true, rays: 0.5, cloudNight: 0.42 },
  shots: {},
  edit: { caption: CAPTION, red: 'human', story: 'stories/good_boy', startAt: 'line:0', endAfter: 'story_end:0' },

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
    await c('/gamerule mob_drops false')   // the zombie's kill: no XP orbs into the wolf's eye, nothing collected
    await c('/difficulty normal')
    // Dog Hill as of day 3400 (the morning Buh left): the meadow, the hut, the patch. The canon's sitting dog and its
    // bones are what came after (Dog on the Hill): our wolf is the dog, and no bones yet
    await world.build(ctx, { story: 'good_boy', day: 3400 })
    await c('/kill @e[tag=dog]')
    await c('/kill @e[type=item,x=-202,y=109,z=-898,distance=..16]')
    await c(`/tp @s ${X + 37} ${F + 30} ${Z + 16}`)
    if (ctx.waitChunks) await ctx.waitChunks({ x0: X - 40, z0: Z - 40, x1: X + 80, z1: Z + 60 }, 90000)
    await c('/kill @e[type=iron_golem]')           // the village golem would hunt the story's zombie
    await c('/kill @e[type=item]')
    await c(`/kill @e[type=!player,type=!villager,x=${X + 36},y=${F},z=${Z + 18},distance=..40]`)   // the village's pigs and cows wandered through the yard
    // the pad: level ground for the cottage and the yard, its edges stepped down into the hill
    await c(`/fill ${A(29, 1, 9)} ${A(44, 16, 33)} air`)
    await c(`/fill ${A(29, -4, 9)} ${A(44, -1, 33)} dirt`)
    await c(`/fill ${A(29, 0, 9)} ${A(44, 0, 33)} grass_block`)
    for (let k = 1; k <= 4; k++) await c(`/fill ${A(29 - k, -k, 9 - k)} ${A(44 + k, -k, 33 + k)} grass_block replace air`)
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
    // a wheat field west of the yard: farmland on the natural ground, a water channel (L03 "He HID in the WHEAT")
    for (let dx = 12; dx <= 27; dx++) for (let dz = 15; dz <= 27; dz++) {
      const gy0 = groundAt(ctx, X + dx, Z + dz)
      if (dz === 21) { bot.chat(`/setblock ${X + dx} ${gy0} ${Z + dz} water`); continue }
      bot.chat(`/setblock ${X + dx} ${gy0} ${Z + dz} farmland[moisture=7]`); bot.chat(`/setblock ${X + dx} ${gy0 + 1} ${Z + dz} wheat[age=7]`)
      if (dz % 3 === 0) await bot.waitForTicks(1)
    }
    // the village lamp post and fence on the walk out of the gate
    for (const blk of ['oak_fence', 'stripped_oak_wood', 'oak_log', 'white_wool', 'oak_fence_gate']) await c(`/fill ${A(34, -2, -3)} ${A(38, 6, 11)} air replace ${blk}`)
    await c(`/fill ${A(35, 1, -3)} ${A(37, 6, 11)} air replace lantern`)
    // the island he swam to (L03): a sand mound off the cliffs, its top one block over the sea (y 63), a bush and a
    // dead bush on it. The sea floor under it filled up to the waterline first
    const SEA = 62
    for (let dx = -4; dx <= 4; dx++) for (let dz = -3; dz <= 3; dz++) {
      const r = Math.hypot(dx / 4.3, dz / 3.3)
      if (r > 1) continue
      const top = r < 0.6 ? SEA + 1 : SEA
      await c(`/fill ${X + 66 + dx} ${SEA - 8} ${Z + 13 + dz} ${X + 66 + dx} ${top} ${Z + 13 + dz} sand`)
    }
    await c(`/setblock ${X + 67} ${SEA + 2} ${Z + 12} dead_bush`); await c(`/setblock ${X + 65} ${SEA + 2} ${Z + 14} short_grass`)
    // the other dog (L04): somebody's tamed wolf sitting alone outside an empty house on the road (its door at
    // (18, -8) facing the road): a blue collar, NoAI, sitting (only an owner makes a wolf sit)
    const dogY = groundAt(ctx, X + 18, Z - 6) + 1
    await c(`/summon wolf ${X + 18.5} ${dogY} ${Z - 6.4} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Sitting:1b,Tags:["other_dog"],Rotation:[0f,0f],CollarColor:11b,Owner:[I;12345,67890,13579,24680]}`)
    // the zombie for L08 waits high above out of view, under a roof (it burned in the daylight)
    await c(`/fill ${X - 6} ${F + 60} ${Z - 6} ${X + 6} ${F + 60} ${Z + 6} barrier`)
    await c(`/fill ${X - 6} ${F + 64} ${Z - 6} ${X + 6} ${F + 64} ${Z + 6} stone`)
    await c(`/summon zombie ${X} ${F + 61} ${Z - 3} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["zom"]}`)

    // Buh joins at the world spawn: put it on the pad first (a spawn 400 blocks away stalled the server)
    await c(`/setworldspawn ${A(37, 1, 15)}`)
    await c('/gamerule respawn_radius 0')
    this.cast = await M.spawnActors(ctx, [GUY])
    await c(`/gamemode survival ${GUY}`)
    await c(`/effect give ${GUY} resistance infinite 2 true`)
    await c(`/tag ${GUY} add ${TAG}`)   // the story kit moves him as an actor (K.actor('buh'))
    await M.place(ctx, GUY, X + 37.5, Y + 1, Z + 15.5, 180, 20)
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
    const H = Y - F
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz) + 1 - F   // feet height (from F) of the ground at a spot
    const P = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
    const cutG = (dx, dz, target, o) => K.cut(dx, dz, target, gy(dx, dz), o)
    const eyeY = (dy) => H + 1 + dy
    const swing = () => this.cast[GUY].swingArm('right')
    const sneak = (on) => this.cast[GUY].setControlState('sneak', on)
    const yawTo = (fx, fz, tx, tz) => K.mcYaw(tx - fx, tz - fz)
    const shake = (k, a = 0.02) => [Math.sin(k * 1.9) * a, Math.cos(k * 2.3) * a]
    // Buh: an actor (lib/story.js K.actor): scenes edit his state, the kit walks him (<= 0.3 b/tick) and jumps him
    // only on a cut (moveWith: set his new mark from inside the cut)
    const buh = K.actor(TAG, { x: 44.5, y: gy(44.5, -5.0), z: -5.0, yaw: 90, pitch: 5 })
    const moveWith = (s) => () => Object.assign(buh, s)
    // feet follow the ground, eased (a full-block step in one tick read as a 1.04-block jump: rec_check)
    const walkG = (a, dx, dz) => { K.step(a, dx, dz); const g = gy(a.x, a.z); a.y += Math.max(-0.2, Math.min(0.2, g - a.y)) }
    const zEnt = () => Object.values(bot.entities).find(e => e.name === 'zombie')
    // a one-block step ahead while the wolf runs (mineflayer doesn't step up)
    const autoJump = () => {
      const p = bot.entity.position, yw = bot.entity.yaw, ax = p.x - Math.sin(yw) * 0.8, az = p.z - Math.cos(yw) * 0.8
      const b = bot.blockAt(new ctx.Vec3(Math.floor(ax), Math.floor(p.y + 0.1), Math.floor(az)))
      K.ctl('jump', !!(b && b.boundingBox === 'block'))
    }
    const roadZ = -5.5

    // L01 "My HUMAN has TRIED to LOSE me thirty-seven TIMES.": Buh sprints west down the road (a low follow ahead of
    // him); the wolf blinks in beside him on the line's 3rd tick (the mechanic is the first frame), and runs with him
    K.shot('run_follow')
    await K.preroll(10, () => { walkG(buh, -0.27, 0); buh.pitch = 5 })
    await line('L01', async (k) => {
      walkG(buh, -0.27, 0); buh.pitch = 5
      if (k === 3) { await K.cut(buh.x - 0.6, buh.z + 1.0, P(buh.x - 30, buh.y + 0.6, buh.z + 1.0), buh.y); K.ctl('sprint', true); K.go(true) }
      if (k > 3) { autoJump(); K.base = K.aim(P(bot.entity.position.x - X - 20, buh.y + 0.6, buh.z + 1.0)); look(k) }
    })

    // L02 "He RUNS. / I FOLLOW. / Twelve BLOCKS out, / I just APPEAR / right NEXT / to HIM.": POV behind him on the
    // road, he pulls away; on "APPEAR" the crane on the yard: he's home, the wolf beside him
    await K.cut(44.5, roadZ, P(-10, gy(10, roadZ) + 0.6, roadZ), gy(44.5, roadZ), { shot: 'pov', after: moveWith({ x: 40.5, z: roadZ - 0.3, y: gy(40.5, roadZ - 0.3), yaw: 90 }) })
    K.ctl('sprint', true); K.go(true)
    await line('L02', async (k, at) => {
      if (k < at(3)) { walkG(buh, -0.3, 0); autoJump(); K.base = K.aim(P(buh.x, buh.y + 1.2, buh.z)); look(k) }
      if (k === at(3)) { await K.cut(36.4, 14.9, P(37.5, eyeY(1.6), 15.5), H + 1, { shot: 'est', after: moveWith({ x: 37.5, z: 15.5, y: H + 1, yaw: yawTo(37.5, 15.5, 36.4, 14.9), pitch: 30 }) }) }
      if (k > at(3)) { buh.pitch = 30 + Math.sin(k / 9) * 4; K.base = K.aim(P(37.5, eyeY(1.55), 15.5)); look(k) }
    })

    // L03 "He HID / in the WHEAT. / He tried HILLS / at NIGHT. / He SWAM / to an ISLAND. / I POPPED up / on the
    // BEACH.": POV through the wheat at him crouched in it; up the north road at night after him; swimming after him
    // to the island; and the camera on its beach: he climbs out, the wolf already sitting there
    await cutG(27.5, 19.5, P(18.5, gy(18.5, 19.5) + 0.6, 19.5), { shot: 'pov', time: GOLD, after: moveWith({ x: 18.5, z: 19.5, y: gy(18.5, 19.5), yaw: 90, pitch: 10 }) })
    sneak(true)
    K.ctl('sprint', true); K.go(true)
    await line('L03', async (k, at) => {
      if (k < at(2)) { autoJump(); if (bot.entity.position.x - X < 21) K.go(false); K.base = K.aim(P(buh.x, buh.y + 0.9, buh.z)); look(k) }
      if (k === at(2)) {
        await cutG(7.5, 34, P(7.5, gy(7.5, 14) + 0.6, 0), { time: NIGHT, after: () => { sneak(false); Object.assign(buh, { x: 7.5, z: 29.5, y: gy(7.5, 29.5), yaw: 180, pitch: 0 }) } })
        K.ctl('sprint', true); K.go(true)
      }
      if (k > at(2) && k < at(4)) { walkG(buh, 0, -0.29); autoJump(); K.base = K.aim(P(buh.x, buh.y + 1.2, buh.z)); look(k) }
      if (k === at(4)) {
        await K.cutTo(55.5, 62.4, 13.5, new ctx.Vec3(X + 66, 63.4, Z + 13.5), { time: GOLD, self: [{}, 1.6], after: moveWith({ x: 59.5, z: 13.5, y: 62.2 - F, yaw: -90, pitch: 0 }) })
        K.go(true); K.ctl('jump', true)
        ctx.sound('entity.generic.splash', 0.5, 1.2)
      }
      if (k > at(4) && k < at(6)) { walkG(buh, 0.08, 0); buh.y = 62.2 - F; look(k) }
      if (k === at(6)) {
        await K.cutTo(67.2, 64, 12.6, new ctx.Vec3(X + 64.5, 64.5, Z + 13.5), { shot: 'beach', self: [{ sitting: true }, SIT_EYE], after: moveWith({ x: 63.6, z: 13.6, y: 62.4 - F, yaw: -90, pitch: 10 }) })
      }
      if (k > at(6)) { if (buh.x < 65.0) { K.step(buh, 0.09, 0); buh.y = Math.min(64 - F, buh.y + 0.06) } else { buh.yaw = yawTo(buh.x, buh.z, 67.2, 12.6); buh.pitch = 30 } }
    })

    // L04 "The ONLY time / I DON'T / POP up / next to HIM / is WHEN / I'm SITTING.": the village road, another tamed
    // wolf sitting alone outside an empty house; Buh walks by with his wolf at his side, stops, looks at it, walks on
    await cutG(23.6, -4.3, P(10, gy(10, -4.3) + 0.6, -4.3), { shot: 'other_wolf', time: GOLD, self: [{ sitting: false }, EYE], after: moveWith({ x: 23.6, z: -5.3, y: gy(23.6, -5.3), yaw: 90, pitch: 5 }) })
    K.go(true)
    await line('L04', async (k, at, n) => {
      const stopAt = at(1), on = at(4)
      const walking = k < stopAt || k >= on
      if (walking) { walkG(buh, -0.2, 0); buh.pitch = 5 } else { buh.yaw = yawTo(buh.x, buh.z, 18.5, -6.4); buh.pitch = 25 }
      K.go(walking); if (walking) autoJump(); if (!walking) K.base = K.aim(P(18.5, gy(18.5, -6.4) + 0.4, -6.4))
      else K.base = K.aim(P(bot.entity.position.x - X - 10, buh.y + 0.6, -4.3))
      look(k)
    })
    K.stop()

    // L05 "He KNOWS that. / A SITTING dog / waits FOREVER. / He WANTS me / to FORGET him. / So he NEVER / makes me
    // SIT.": the yard, POV looking up at him; he looks down at me, and on "So he NEVER" turns away
    await K.cut(36.4, 15.6, P(37.4, eyeY(1.6), 14.6), H + 1, { shot: 'pov', self: [{ sitting: false }, EYE], after: moveWith({ x: 37.4, z: 14.6, y: H + 1, yaw: yawTo(37.4, 14.6, 36.4, 15.6), pitch: 42 }) })
    await line('L05', async (k, at) => {
      if (k < at(5)) { buh.pitch = 42 + Math.sin(k / 5) * 4 }
      else { buh.yaw += (yawTo(37.4, 14.6, 40, 10) - buh.yaw) * 0.12; buh.pitch += (5 - buh.pitch) * 0.12 }
      look(k)
    })

    // L06 "He keeps TALKING / about a PLACE / called COLLEGE.": on the cottage step, crouched, talking to the wolf
    // sitting beside him (a low shot from the yard)
    await K.cut(37.7, 18.4, P(36.5, eyeY(1.0), 18.8), H + 1, { shot: 'step', self: [{ sitting: true }, SIT_EYE], after: () => { Object.assign(buh, { x: 36.5, z: 19.0, y: H + 1, yaw: 0, pitch: 10 }); sneak(true) } })
    await line('L06', async (k) => {
      buh.yaw = Math.sin(k / 11) * 35 - 20; buh.pitch = 10 + Math.sin(k / 7) * 8   // talking: turning between the wolf and the sea
      if (k % 23 === 5) swing()
      look(k)
    })
    sneak(false)

    // L07 "Every NIGHT / he SAYS, / SORRY, buddy. / I don't KNOW / what FOR.": dusk on the yard's sea edge: he walks up
    // to the wolf sitting there, looks out to sea, then down at it, a pat on "SORRY"
    await K.cut(41.5, 16.5, P(60, eyeY(0.4), 18), H + 1, { shot: 'dog_sea', time: DUSK, self: [{ sitting: true }, SIT_EYE], after: moveWith({ x: 38.6, z: 15.3, y: H + 1, yaw: -70, pitch: 5 }) })
    await line('L07', async (k, at) => {
      const dx = 40.6 - buh.x, dz = 16.0 - buh.z, d = Math.hypot(dx, dz)
      if (d > 0.3) { const sp = Math.min(0.15, 0.04 + d * 0.05); K.step(buh, dx / d * sp, dz / d * sp); buh.pitch = 5 }
      else if (k < at(2)) { buh.yaw += (-90 - buh.yaw) * 0.1; buh.pitch = 0 }   // out to sea
      else { buh.yaw += (yawTo(buh.x, buh.z, 41.5, 16.5) - buh.yaw) * 0.2; buh.pitch = 40 + Math.sin(k / 4) * 5 }
      if (k === at(2) || k === at(2) + 6) swing()
      if (k > 8) K.base = K.aim(P(buh.x, eyeY(1.5), buh.z))
      look(k)
    })

    // L08 "Last NIGHT, / a ZOMBIE / came for HIM. / I got THERE / FIRST, though.": night, the yard from its south-west
    // corner: the zombie walks in at him; on "I got THERE" POV, the wolf at it: bites, and it's down on the line's end
    const zom = K.actor('zom', { x: 36.6, y: gy(36.6, 10.5), z: 10.5, yaw: 0 })
    await K.cut(36.4, 15.6, P(37.5, eyeY(1.6), 15.2), H + 1, { shot: 'night_yard', time: NIGHT, self: [{ sitting: true }, SIT_EYE], after: moveWith({ x: 37.5, z: 15.2, y: H + 1, yaw: 180, pitch: 0 }) })
    await line('L08', async (k, at, n) => {
      if (k < at(3)) {
        const dx = buh.x - 0.2 - zom.x, dz = buh.z - 1.3 - zom.z, d = Math.hypot(dx, dz)
        if (d > 0.2) walkG(zom, dx / d * 0.1, dz / d * 0.1)
        if (k === 6) ctx.sound('entity.zombie.ambient', 0.8, 1)
        buh.yaw = yawTo(buh.x, buh.z, zom.x, zom.z)
        K.base = K.aim(P(zom.x, zom.y + 1.5, zom.z)); look(k)
      }
      if (k === at(3)) {
        K.actors.delete('zom')   // the real zombie from here: the wolf bites it
        await K.cut(36.4, 15.6, P(zom.x, zom.y + 1.0, zom.z), H + 1, { shot: 'pov', self: [{ sitting: false, angry: true }, EYE] })
        ctx.sound('entity.wolf.growl', 1, 1.1)
        K.ctl('sprint', true); K.go(true)
      }
      if (k > at(3)) {
        const [sy, sp] = shake(k, 0.035)
        const z = zEnt()
        if (z && bot.entity.position.distanceTo(z.position) < 1.6) K.go(false)
        if (k === at(3) + 6 || k === at(4) + 2) { if (z) bot.attack(z); ctx.sound('entity.wolf.growl', 1, 1.15) }
        if (k === n - 1) { say('/damage @e[tag=zom,limit=1] 100 minecraft:mob_attack by @s'); K.stop() }
        if (k >= n - 1) say('/kill @e[type=experience_orb]')
        if (z) K.base = K.aim(z.position.offset(0, 1.0, 0))
        look(k, sy, sp)
      }
    })
    K.stop()

    // L09 "This MORNING, / he WALKED me / BACK home, / up the HILL / to his HUT.": Dog Hill, morning: a crane down as
    // they come up over the south rim onto the meadow and walk north toward his old dirt hut
    await K.cut(DX - 1.0, DZ + 5.0, P(DX - 1.0, HILL + 0.6, DZ - 6), HILL, { shot: 'hill_walk', time: MORNING, self: [{ sitting: false, angry: false }, EYE], after: moveWith({ x: DX, z: DZ + 4.6, y: HILL, yaw: 180, pitch: 5 }) })   // (from DZ + 7.5 it stood past the levelled disc and walked into its rim)
    K.go(true)
    await line('L09', async (k) => {
      if (buh.z > DZ + 1.2) { K.step(buh, 0.015, -0.12); buh.pitch = 5 } else { buh.yaw = 180; buh.pitch = 10 }
      autoJump(); if (bot.entity.position.z - Z < DZ + 1.6) K.go(false)
      K.base = K.aim(P(DX - 1.0, HILL + 0.6, DZ - 6)); look(k)
    })
    K.stop()

    // L10 "He SAID, / sit, BOY.": on the hilltop, the wolf on D, Buh on the patch facing it: on "sit, BOY" it sits
    await K.cut(DX, DZ, P(DX + 3, HILL + 1.4, DZ), HILL, { shot: 'hill_sit', self: [{ sitting: false }, EYE], after: moveWith({ x: DX + 3, z: DZ, y: HILL, yaw: 90, pitch: 35 }) })
    await line('L10', async (k, at) => {
      if (k === at(1)) { swing(); K.self({ sitting: true }, SIT_EYE) }
      buh.pitch = 35 + Math.sin(k / 6) * 3
      look(k)
    })

    // L11 "He SAID, / I'll BE / right BACK.": over the sitting wolf's shoulder: Buh on the patch. After the line the
    // chat says "Buh left the game" (readable at 300 px: scale 2.5) and he is gone; the wolf sits facing the empty
    // patch. Cut 1.0 s after it reads (STANDARDS: no sting, nothing after)
    K.shot('hill_end')
    await line('L11', async (k) => {
      buh.yaw = 90; buh.pitch = 25 + Math.sin(k / 6) * 3
      look(k)
    })
    ctx.mark('syschat', { text: `${GUY} left the game`, color: 'yellow', scale: 2.5 })
    K.park(TAG)
    for (let k = 0; k < 20; k++) { look(k); await bot.waitForTicks(1) }
    ctx.mark('story_end')
    await bot.waitForTicks(4)
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

// The camera shots: offsets from O = (X, F, Z), F the pad's floor (rec.set.y = 70)
const H = 0
const DXs = 102.5, DZs = -513.5, HL = 39   // Dog Hill's D, set-relative (as DX, DZ, HILL above)
module.exports.shots = {
  pov: { pov: true },
  // L01: Buh sprinting west down the road, a low follow ahead of him (the wolf blinks in beside him)
  run_follow: { follow: `actor:${GUY}`, offset: [-2.6, -0.55, 3.4], look: { of: `actor:${GUY}`, offset: [0.2, 0.35, -1.2] }, lag: 2, fov: 54 },   // (from the south-west at -0.75 the road's plain filled 39%: rec_check flat; now the houses north of the road behind him)
  // L02: back next to him. A crane down onto the yard at golden hour from the west: the cottage, the sea, him, the wolf
  est: { dof: false, path: [[0, 24, H + 13, 4], [3.6, 31.5, H + 3.6, 11.5]], lookPath: [[0, 37, H + 1.0, 16], [3.6, 37, H + 1.4, 15.2]], ease: true },
  // L03: the island's beach, low from the water's edge: he climbs out, the wolf already sitting on the sand
  beach: { at: [61.8, -5.4, 16.8], look: [65.6, -5.8, 13.0], fov: 50, push: 0.25, dof: { aperture: 0.7, focus: { of: 'self', offset: [0, -0.6, 0] } } },
  // L04: the road: the other tamed wolf sitting alone outside the empty house; Buh and his wolf walk past
  other_wolf: { at: [14.6, H + 1.5, -1.5], look: [19.6, H + 1.0, -6.0], fov: 54, push: 0.2 },
  // L06: the cottage step from the yard, low: Buh crouched talking, the wolf sitting beside him
  step: { at: [36.3, H + 1.3, 15.2], look: [36.9, H + 1.5, 19.0], fov: 46, push: 0.25, dof: { aperture: 0.7 } },
  // L07: dusk on the yard's sea edge (from the south-east, the sea behind them)
  dog_sea: { at: [42.4, H + 1.3, 21.0], look: [39.6, H + 1.5, 15.0], fov: 46, push: 0.3, dof: { aperture: 0.8, focus: { of: 'self', offset: [0, -1.1, 0] } } },
  // L08: night, the yard from its south-west corner: the road, the zombie walking in, Buh and the wolf
  night_yard: { at: [33.4, H + 1.5, 19.2], look: [37.6, H + 1.9, 11.0], fov: 56, push: 0.35, dof: { aperture: 0.7, focus: { of: 'self', offset: [0, -1.1, 0] } } },
  // L09: Dog Hill, morning: a crane down from over the south rim as they walk up onto the meadow toward the hut
  hill_walk: { path: [[0, DXs - 3.5, HL + 6, DZs + 11], [3.2, DXs - 2.5, HL + 2.2, DZs + 8.0]], lookPath: [[0, DXs, HL + 1, DZs + 3], [3.2, DXs + 1.5, HL + 1.5, DZs - 3]], ease: true },
  // L10: the hilltop from the side: the wolf on D, Buh on the patch, the hut behind
  hill_sit: { at: [DXs + 1.5, HL + 0.9, DZs + 4.2], look: [DXs + 1.6, HL + 0.9, DZs], fov: 52, push: 0.15 },
  // L11: over the sitting wolf's shoulder at Buh on the patch; then the empty patch
  hill_end: { at: [DXs - 2.4, HL + 0.75, DZs + 0.9], look: [DXs + 3.2, HL + 1.1, DZs - 0.1], fov: 50, push: 0.12, dof: { aperture: 0.6 } }
}
