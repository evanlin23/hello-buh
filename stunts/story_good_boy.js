// Story Short "my human tried to lose me 37 times" (stories/good_boy, story.json v2, the rework: script_vNext.md r3).
// The narrator is Buh's tamed wolf, said openly from line 1. Buh (16, never named aloud) has tried to lose it 37
// times: a tamed wolf teleports to its owner from 12 blocks (it blinks in beside him: the first frame), unless it is
// sitting, and a sitting dog waits forever. He wants it to forget him, so he never makes it sit. College; "sorry,
// buddy" every night; last night he stopped running and watched the sun come up. This morning he walked it up Dog
// Hill to his old hut: "stay here, buddy" (so it sat), "I'll be right back", and the chat says "Buh left the game". The one sit he avoided 37 times is the one
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
const GOLD = 12300, NIGHT = 18000, DUSK = 13000, MORNING = 1500, DAWN = 23300
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
  look: 'bright',          // the owner's bright, punchy look for every story (main e58c77d; it replaced 'auto', which itself replaced the fixed warm look that turned nights magenta)
  shots: {},
  edit: { caption: CAPTION, red: 'human', story: 'stories/good_boy', startAt: 'line:0', endAfter: 'story_end:0', chatScale: 7, punchStress: true },   // "Buh left the game" readable at 300 px wide (vanilla GUI 3 was ~7 px tall there)

  async setup (ctx) {
    const { bot } = ctx
    const X = VX, Z = VZ
    // the set's origin height is the cottage pad's: the natural ground where the yard goes (all shots are relative to it)
    // pinned at 70 (the pad's grass): groundAt read 70 on the pilot's runs and 69 on a later world, and every shot
    // (Dog Hill's too: HILL = 109 - F) is relative to it; the pad is built at F whatever the natural ground
    const F = 70
    ctx.log(`good_boy: natural ground at the pad ${groundAt(ctx, X + 37, Z + 16)}, set origin ${F}`)
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
    // Hushwell's villagers below the hill: frozen (far from the bot their moves arrived in 2-block jumps: rec_check)
    await c('/execute as @e[type=villager,x=-190,y=90,z=-880,distance=..90] run data merge entity @s {NoAI:1b}')
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
    await c(`/setblock ${A(34, 1, 14)} spruce_fence`); await c(`/setblock ${A(34, 2, 14)} lantern`)   // lights his face in the night yard (L08), 3 blocks from him on the camera's side, off the camera's line (at (34, 17) it stood in the middle of the frame)
    await c(`/setblock ${A(38, 1, 19)} barrel[facing=up]`); await c(`/setblock ${A(39, 1, 19)} hay_block`)
    await c(`/place feature minecraft:fancy_oak ${A(31, 1, 31)}`); await c(`/place feature minecraft:oak ${A(43, 1, 31)}`)
    for (const [f, dx, dz] of [['birch', 46, 10], ['oak', 27, 9], ['birch', 26, 30]])   // (a fancy oak at (47, 22) stood in the crane's path) await c(`/place feature minecraft:${f} ${A(dx, 1, dz)}`)
    for (const [dx, dz] of [[31, 15], [42, 23], [41, 13], [32, 25]]) await c(`/setblock ${A(dx, 1, dz)} azalea`)   // (42, 21) was the dog_sea camera's spot
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
    // no grass at the cameras' feet: the road (L01-L02: the POV at wolf-eye was 100 % short_grass) and the night road
    await c(`/fill ${A(0, -3, -9)} ${A(46, 3, -2)} air replace short_grass`); await c(`/fill ${A(0, -3, -9)} ${A(46, 3, -2)} air replace tall_grass`)
    await c(`/fill ${A(3, -3, 12)} ${A(12, 3, 30)} air replace short_grass`); await c(`/fill ${A(3, -3, 12)} ${A(12, 3, 30)} air replace tall_grass`)
    // a lantern post on the night road (L03 "HILLS at NIGHT"): Buh walks past it
    await c(`/setblock ${X + 8} ${groundAt(ctx, X + 8, Z + 23) + 1} ${Z + 23} spruce_fence`); await c(`/setblock ${X + 8} ${groundAt(ctx, X + 8, Z + 23) + 2} ${Z + 23} lantern`)
    // the island he swam to (L03): a sand mound off the cliffs, its top one block over the sea (y 63), a bush and a
    // dead bush on it. The sea floor under it filled up to the waterline first
    const SEA = 62
    for (let dx = -4; dx <= 4; dx++) for (let dz = -3; dz <= 3; dz++) {
      const r = Math.hypot(dx / 4.3, dz / 3.3)
      if (r > 1) continue
      const top = r < 0.6 ? SEA + 1 : SEA
      await c(`/fill ${X + 66 + dx} ${SEA - 8} ${Z + 13 + dz} ${X + 66 + dx} ${top - 1} ${Z + 13 + dz} sandstone`)   // (all sand fell into the water: the first dry run had no island)
      await c(`/setblock ${X + 66 + dx} ${top} ${Z + 13 + dz} sand`)
    }
    await c(`/setblock ${X + 67} ${SEA + 2} ${Z + 12} dead_bush`); await c(`/setblock ${X + 65} ${SEA + 2} ${Z + 14} short_grass`)
    // the other dog (L04): somebody's tamed wolf sitting alone outside an empty house on the road (its door at
    // (18, -8) facing the road): a blue collar, NoAI, sitting (only an owner makes a wolf sit)
    const dogY = groundAt(ctx, X + 18, Z - 6) + 1
    await c(`/summon wolf ${X + 18.5} ${dogY} ${Z - 6.4} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Sitting:1b,Tags:["other_dog"],Rotation:[0f,0f],CollarColor:11b,Owner:[I;12345,67890,13579,24680]}`)

    // Buh joins at the world spawn: put it on the pad first (a spawn 400 blocks away stalled the server)
    await c(`/setworldspawn ${A(37, 1, 15)}`)
    await c('/gamerule respawn_radius 0')
    this.cast = await M.spawnActors(ctx, [GUY])
    await c(`/gamemode survival ${GUY}`)
    await c(`/effect give ${GUY} resistance infinite 4 true`)   // immune: a hit flashed him red after the yard cut (dry run 5)
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
    // a one-block step ahead while the wolf runs (mineflayer doesn't step up)
    const autoJump = () => {
      const p = bot.entity.position, yw = bot.entity.yaw, ax = p.x - Math.sin(yw) * 0.8, az = p.z - Math.cos(yw) * 0.8
      const b = bot.blockAt(new ctx.Vec3(Math.floor(ax), Math.floor(p.y + 0.1), Math.floor(az)))
      K.ctl('jump', !!(b && b.boundingBox === 'block'))
    }
    const roadZ = -5.5
    // an event that fires once, the first tick at or past its time (K.line runs on the recording clock: after an awaited
    // cut k jumps ahead, and a `k === X` test could be skipped: kit b4cd314)
    const did = new Set()
    const once = (key, cond) => { if (!cond || did.has(key)) return false; did.add(key); return true }

    // the wolf's on-screen pop (vanilla: a tamed wolf more than 12 blocks from its owner appears beside him, in view,
    // no particles, no sound): K.blink when the story kit has it (visual audit blocker 2), else a cut of the wolf alone
    // a camera cut through the kit (K.cutShot): Buh's new mark (o.after), the wolf's jump (K.blink) and its pose (o.self) in
    // the cut's moves; the shot mark waits until the client has the cast on its marks (cast landing after the shot
    // mark read as stepped motion: rec_check). POV cuts stay K.cut (the camera must land already aimed)
    const scut = async (dx, dz, target, dy, o = {}) => {
      if (o.stop !== false) K.stop()
      const w = await K.cutShot(o.shot, () => {
        if (o.after) o.after()
        if (o.self) K.self(o.self[0], o.self[1])
        K.blink('self', { x: dx, y: dy, z: dz })
      }, { time: o.time, max: 10 })
      await bot.waitForTicks(1); K._clock++
      K.base = K.aim(target); await K.look(0)
      return w
    }
    const HIDE = [36.5, 24.5]   // inside the cottage: out of every shot until a pop
    // the wolf hidden; the new shot and Buh's new mark on the cut's landing (switched before it, he popped in late)
    const hide = (shot, b, o = {}) => scut(HIDE[0], HIDE[1], P(36.5, eyeY(0.6), 27), H + 1, { shot, after: b ? moveWith(b) : null, ...o })
    const blink = async (dx, dz, target, dy) => {
      if (K.blink) return K.blink('self', { x: dx, y: dy, z: dz, target })
      return K.cut(dx, dz, target, dy, { stop: false })
    }

    // L01 "My HUMAN has TRIED to LOSE me thirty-seven TIMES." (the first frame is the mechanic, visual audit): a
    // camera ahead of Buh as he sprints west down the road toward it (the low sun behind the lens lights his face);
    // the red-collared wolf runs after him 13 blocks back, small; at 0.4 s it is gone from there and at his heel
    await scut(43.5, -4.2, P(10, gy(10, -4.2) + 0.6, -4.2), gy(43.5, -4.2), { shot: 'run_ahead', time: GOLD, self: [{ sitting: false }, EYE], after: moveWith({ x: 30.5, z: -5.0, y: gy(30.5, -5.0), yaw: 90, pitch: 5 }) })
    K.ctl('sprint', true); K.go(true)
    await K.preroll(10, () => { walkG(buh, -0.27, 0); autoJump() })
    await line('L01', async (k) => {
      walkG(buh, -0.27, 0); buh.pitch = 5
      if (once('L01pop', k >= 8)) await blink(buh.x + 1.3, buh.z + 0.8, P(buh.x - 30, buh.y + 0.6, buh.z + 0.8), buh.y)
      autoJump(); K.base = K.aim(P(bot.entity.position.x - X - 20, buh.y + 0.6, -4.2)); look(k)   // (a block south of his line: right behind him his body hid it)
    })

    // L02 "He RUNS. / I FOLLOW. / Twelve BLOCKS out, / I just APPEAR / right NEXT / to HIM.": POV low behind his heels,
    // sprinting after him; on "Twelve BLOCKS out" he pulls away; on "APPEAR" the crane comes in from the sea over the
    // yard: he is home, catching his breath, and the wolf pops in beside him
    await K.cut(buh.x + 2.6, buh.z, P(buh.x - 6, buh.y + 1.2, buh.z), gy(buh.x + 2.6, buh.z), { shot: 'pov' })   // (in his lane: on roadZ it landed in the ditch by the road)
    K.ctl('sprint', true); K.go(true)
    await line('L02', async (k, at) => {
      if (k < at.cut(3)) {
        walkG(buh, k < at(2) ? -0.27 : -0.3, 0)
        if (once('L02away', k >= at(2))) K.go(false)   // he pulls away: twelve blocks
        autoJump(); K.base = K.aim(P(buh.x, buh.y + 1.2, buh.z)); look(k)
      }
      if (once('L02cut', k >= at.cut(3))) await hide('est', { x: 37.5, z: 17.5, y: H + 1, yaw: 90, pitch: 15 })
      if (once('L02pop', k >= at(3) + 5)) await blink(36.7, 18.3, P(37.5, eyeY(1.6), 17.5), H + 1)
      if (k > at(3)) { buh.pitch = 15 + Math.sin(k / 6) * 8; if (k > at(3) + 5) buh.yaw += (yawTo(37.5, 17.5, 36.7, 18.3) - buh.yaw) * 0.15; look(k) }
    })

    // L03 "He HID / in the WHEAT. / He tried HILLS / at NIGHT. / He SWAM / to an ISLAND. / I POPPED up / on the
    // BEACH.": camera shots, Buh in every one (visual audit blocker 1): crouched in the wheat (the lens over the crop),
    // and the wolf pops in beside him; the north road at night, a lantern in his hand, and it pops in; swimming out to
    // the island (no wolf: wolves teleport, they don't swim); climbing onto its far beach, and it pops up on the sand
    await hide('wheat_cam', { x: 20.5, z: 19.5, y: gy(20.5, 19.5), yaw: 45, pitch: 10 })
    sneak(true)
    await line('L03', async (k, at) => {
      if (k < at.cut(2)) { buh.yaw = 45 + Math.sin(k / 6) * 20; look(k) }
      if (once('L03pop1', k >= at(1))) await blink(21.4, 18.6, P(20.5, gy(20.5, 19.5) + 1.0, 19.5), gy(21.4, 18.6))   // beside him, not in front of his face
      if (once('L03cut2', k >= at.cut(2))) {
        sneak(false)
        await scut(7.5, 12.5, P(7.5, 1.4, 20), 1, { shot: 'hills_night', time: NIGHT, after: moveWith({ x: 7.5, z: 27.5, y: gy(7.5, 27.5), yaw: 180, pitch: 0 }) })   // the wolf waits behind the camera
      }
      if (k > at.cut(2) && k < at.cut(4)) { walkG(buh, 0, -0.14); look(k) }
      if (once('L03pop3', k >= at(3))) await blink(8.4, buh.z + 0.6, P(7.5, 1.4, buh.z - 5), gy(8.4, buh.z + 0.6))
      if (k > at(3) && k < at.cut(4)) { K.go(true); K.base = K.aim(P(8.4, 1.4, buh.z - 6)) }
      if (once('L03cut4', k >= at.cut(4))) {
        await scut(46.5, 17.0, P(60, 0.6, 15), gy(46.5, 17.0), { shot: 'swim_cam', time: GOLD, after: moveWith({ x: 57.5, z: 13.8, y: 62.2 - F, yaw: -90, pitch: 0 }) })   // the wolf behind the camera on the cliff
      }
      if (k > at.cut(4) && k < at.cut(6)) { K.step(buh, 0.12, 0); buh.y = 62.2 - F; look(k) }
      if (once('L03cut6', k >= at.cut(6))) {
        await scut(62.6, 11.0, P(66, 64.5 - F, 13.5), 63 - F, { shot: 'beach', after: moveWith({ x: 70.6, z: 13.6, y: 62.2 - F, yaw: 90, pitch: 10 }) })   // (the wolf is behind the beach camera)
      }
      if (k > at.cut(6)) { if (buh.x > 68.2) { K.step(buh, -0.09, 0); buh.y = Math.min(64 - F, buh.y + 0.05) } else { buh.yaw = yawTo(buh.x, buh.z, 67.6, 14.2); buh.pitch = 35 } }
      if (once('L03pop6', k >= at(6) + 6)) await blink(67.6, 14.2, P(buh.x, buh.y + 1.5, buh.z), 64 - F)   // 4 blocks out (at 2.4 it was a huge blur at the frame edge)
    })

    // L04 "But SITTING? / I STAY put. / A SITTING dog / waits FOREVER.": the village road, another tamed wolf sitting
    // alone outside an empty house; Buh walks by with his wolf, stops and looks at it. L05 "He doesn't WANT / me to
    // WAIT. / So he NEVER / makes me SIT.": the same shot: he walks on, his own wolf standing at his side
    await scut(23.6, -4.3, P(10, gy(10, -4.3) + 0.6, -4.3), gy(23.6, -4.3), { shot: 'other_wolf', time: GOLD, self: [{ sitting: false }, EYE], after: moveWith({ x: 23.6, z: -5.3, y: gy(23.6, -5.3), yaw: 90, pitch: 5 }) })
    K.go(true)
    await line('L04', async (k, at) => {
      const walking = k < at(1)
      if (walking) { walkG(buh, -0.2, 0); buh.pitch = 5; autoJump(); K.base = K.aim(P(bot.entity.position.x - X - 10, buh.y + 0.6, -4.3)) }
      else { buh.yaw += (yawTo(buh.x, buh.z, 18.5, -6.4) - buh.yaw) * 0.2; buh.pitch = 25; K.base = K.aim(P(18.5, gy(18.5, -6.4) + 0.4, -6.4)) }
      K.go(walking)
      look(k)
    })
    K.go(true)
    await line('L05', async (k) => {
      if (buh.x > 16.8) { walkG(buh, -0.1, 0); buh.pitch = 5 } else { buh.yaw += (yawTo(buh.x, buh.z, 18.5, -6.4) - buh.yaw) * 0.1 }   // walks on, slowly: stays in frame
      K.go(bot.entity.position.x - X > 17.5); autoJump()
      K.base = K.aim(P(bot.entity.position.x - X - 10, buh.y + 0.6, -4.3)); look(k)
    })
    K.stop()

    // L06 "He keeps TALKING / about a PLACE / called COLLEGE. / It sounds BORING.": a medium shot at wolf-eye height:
    // Buh crouched on the cottage step talking, the cottage behind him, the wolf sitting beside him
    await scut(37.7, 18.4, P(36.5, eyeY(1.0), 18.8), H + 1, { shot: 'step', self: [{ sitting: true }, SIT_EYE], after: () => { Object.assign(buh, { x: 36.5, z: 19.0, y: H + 1, yaw: 180, pitch: 10 }); sneak(true) } })
    await line('L06', async (k) => {
      buh.yaw = 180 + Math.sin(k / 11) * 30 + 15; buh.pitch = 10 + Math.sin(k / 7) * 8   // talking, facing the yard: turning between the wolf and the sea
      if (k % 23 === 5) swing()
      look(k)
    })
    sneak(false)

    // L07 "Every NIGHT / he SAYS, / SORRY, buddy. / I don't KNOW / what FOR.": dusk at the yard's sea edge, from behind
    // them over the sea (the moon coming up): he walks up to the wolf sitting there, looks out, then down at it, a pat
    await scut(41.5, 16.6, P(60, eyeY(0.4), 16), H + 1, { shot: 'dog_sea', time: DUSK, self: [{ sitting: true }, SIT_EYE], after: moveWith({ x: 39.0, z: 15.2, y: H + 1, yaw: -70, pitch: 5 }) })
    await line('L07', async (k, at) => {
      const dx = 40.6 - buh.x, dz = 16.0 - buh.z, d = Math.hypot(dx, dz)
      if (d > 0.3) { const sp = Math.min(0.15, 0.04 + d * 0.05); K.step(buh, dx / d * sp, dz / d * sp); buh.pitch = 5 }
      else if (k < at(2)) { buh.yaw += (-90 - buh.yaw) * 0.1; buh.pitch = 0 }   // out to sea
      else { buh.yaw += (yawTo(buh.x, buh.z, 41.5, 16.6) - buh.yaw) * 0.2; buh.pitch = 40 + Math.sin(k / 4) * 5 }
      if (k === at(2) || k === at(2) + 6) swing()
      look(k)
    })

    // L08 "Last NIGHT / he STOPPED / RUNNING. / He just WATCHED / the SUN come UP.": dawn at the same sea edge, from
    // further back and lower than L07 (the sun coming up over the sea ahead of them): he stands still beside the sitting
    // wolf, looking out; on "WATCHED" he looks down at it (the critic's fix: the zombie was a dead end)
    await scut(41.5, 16.6, P(60, eyeY(0.6), 16.4), H + 1, { shot: 'dawn_sea', time: DAWN, self: [{ sitting: true }, SIT_EYE], after: moveWith({ x: 40.4, z: 15.6, y: H + 1, yaw: -90, pitch: -5 }) })
    await line('L08', async (k, at) => {
      if (k < at(3)) { buh.yaw = -90 + Math.sin(k / 13) * 4; buh.pitch = -5 }   // out to sea, at the sunrise
      else { buh.yaw += (yawTo(buh.x, buh.z, 41.5, 16.6) - buh.yaw) * 0.12; buh.pitch += (35 - buh.pitch) * 0.12 }
      look(k)
    })

    // L09 "This MORNING, / he WALKED me / BACK home, / up the HILL / to his HUT.": Dog Hill, morning: a crane down as
    // they come up over the south rim onto the meadow and walk north toward his old dirt hut
    await scut(DX - 1.0, DZ + 5.0, P(DX - 1.0, HILL + 0.6, DZ - 6), HILL, { shot: 'hill_walk', time: MORNING, self: [{ sitting: false, angry: false }, EYE], after: moveWith({ x: DX, z: DZ + 4.6, y: HILL, yaw: 180, pitch: 5 }) })   // (from DZ + 7.5 it stood past the levelled disc and walked into its rim)
    K.go(true)
    await line('L09', async (k) => {
      if (buh.z > DZ + 1.2) { K.step(buh, 0.015, -0.12); buh.pitch = 5 } else { buh.yaw = 180; buh.pitch = 10 }
      autoJump(); if (bot.entity.position.z - Z < DZ + 1.6) K.go(false)
      K.base = K.aim(P(DX - 1.0, HILL + 0.6, DZ - 6)); look(k)
    })
    K.stop()

    // L10 "He TURNED / to ME / and SAID:", L11 Buh: "STAY here, / BUDDY.", L12 "So I SAT.", L13 Buh: "I'll BE / right BACK.": ONE locked
    // camera (the logout must read as Buh gone from the same frame, not an edit: visual audit). The wolf on D, Buh on
    // the patch looking at his hut; on "to ME" he turns to the wolf; on "SAT" it sits; a wave on "BACK"; then the chat
    // says "Buh left the game" and he is gone on that frame. Cut 1.0 s after it (the payoff: story.json "syschat")
    await scut(DX, DZ, P(DX + 3, HILL + 1.4, DZ), HILL, { shot: 'hill_lock', self: [{ sitting: false }, EYE], after: moveWith({ x: DX + 3, z: DZ, y: HILL, yaw: 180, pitch: 5 }) })
    await line('L10', async (k, at) => {
      if (k >= at(1) - 4) { buh.yaw += (90 - buh.yaw) * 0.2; buh.pitch += (35 - buh.pitch) * 0.2 }   // he turns to me
      look(k)
    })
    await line('L11', async (k, at) => {
      buh.pitch = 35 + Math.sin(k / 6) * 3
      if (k === at(1)) swing()   // a pat toward the wolf on "BUDDY"
      look(k)
    })
    await line('L12', async (k, at, n) => {
      if (k === Math.round(n * 0.5)) K.self({ sitting: true }, SIT_EYE)   // it sits on "SAT"
      buh.yaw = 90 + Math.sin(k / 7) * 6; buh.pitch = 32
      look(k)
    })
    await line('L13', async (k, at) => {
      buh.yaw = 90 + Math.sin(k / 7) * 12; buh.pitch = 25 + Math.sin(k / 6) * 4
      if (k === at(1)) swing()   // a wave on "right BACK"
      look(k)
    })
    ctx.mark('syschat', { text: `${GUY} left the game`, color: 'yellow' })
    ctx.sound('entity.wolf.whine', 0.6, 1)   // the payoff's one sound: the wolf's own whine, diegetic, no sting (owner: the end riser/hit was jarring)
    K.park(TAG)
    for (let k = 0; k < 20; k++) { look(k, Math.sin(k / 5) * 0.08, -k * 0.012); await bot.waitForTicks(1) }   // the wolf's head turns a little and lowers, watching the empty patch (a still hold: lint 'nobody moves')
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
  // L01: low, ahead of Buh as he sprints west toward it (the sun behind the lens lights his face); the wolf behind him
  run_ahead: { subject: [`actor:${GUY}`, 'self'], follow: `actor:${GUY}`, offset: [-3.8, 1.5, 0.6], look: { of: `actor:${GUY}`, offset: [0, 0.7, 0] }, lag: 2, fov: 50 },
  // L02: back next to him. A crane in from the sea side, clear of the oak (it flew through its canopy: visual audit)
  est: { subject: [`actor:${GUY}`], dof: false, path: [[0, 52, H + 12, 22], [3.0, 42, H + 3.5, 18.5]], lookPath: [[0, 37.5, H + 1.2, 17.5], [3.0, 37.5, H + 1.6, 17.6]], ease: true },
  // L03: over the wheat looking down the rows at him crouched in it (never inside the crop: visual audit)
  wheat_cam: { subject: [`actor:${GUY}`], at: [23.8, H + 2.9, 22.6], look: [20.6, H + 1.4, 19.6], fov: 50, push: 0.15, dof: false },
  // L03: the north road at night, ahead of him, the lantern post beside his path
  hills_night: { subject: [`actor:${GUY}`], at: [8.4, H + 1.3, 17.6], look: [7.5, H + 2.4, 24.0], fov: 48, push: 0.15, dof: false },
  // L03: from the cliff top, Buh swimming out to the island
  swim_cam: { subject: [`actor:${GUY}`], at: [49.5, H - 1.2, 17.0], look: [60.5, H - 7.2, 14.0], fov: 50, push: 0.2, dof: false },
  // L03: on the island looking east over the open sea (the sunset behind the camera): he climbs out, the wolf pops up
  beach: { subject: [`actor:${GUY}`], at: [63.6, H - 4.0, 12.6], look: [70.5, H - 5.4, 14.0], fov: 52, push: 0.15, dof: false },
  // L04: the road: the other tamed wolf sitting alone outside the empty house; Buh and his wolf walk past
  other_wolf: { subject: [`actor:${GUY}`, [18.5, 1.3, -6.4]], at: [14.6, H + 1.5, -1.5], look: [19.6, H + 1.0, -6.0], fov: 54, push: 0.2 },
  // L05: the yard facing the sea (fence, sea horizon, the oak and birch: not the plain)
  yard_sea: { subject: [`actor:${GUY}`], at: [32.2, H + 1.6, 18.6], look: [44.0, H + 2.5, 16.6], fov: 50, push: 0.15, dof: false },
  // L06: medium at wolf-eye height, 3.6 blocks out: Buh crouched on the cottage step, the cottage behind him
  step: { subject: [`actor:${GUY}`], at: [36.6, H + 1.7, 15.4], look: [36.5, H + 1.9, 19.0], fov: 50, push: 0.15, dof: false },
  // L07: dusk, from behind them over the sea (sharp: the blur was the "blurry light" note)
  dog_sea: { subject: [`actor:${GUY}`, 'self'], at: [35.4, H + 1.3, 18.4], look: [43.0, H + 2.6, 15.9], fov: 50, push: 0.15, dof: false },
  // L08: dawn, low behind the two of them, due east over the sea: the sun coming up ahead (wider than L07's dusk)
  dawn_sea: { subject: [`actor:${GUY}`, 'self'], at: [33.0, H + 1.1, 16.2], look: [52.0, H + 2.4, 16.2], fov: 50, push: 0.12, dof: false },
  // L09: Dog Hill, morning: a crane down from over the south rim as they walk up onto the meadow toward the hut
  hill_walk: { subject: [`actor:${GUY}`], path: [[0, DXs - 3.5, HL + 6, DZs + 11], [3.2, DXs - 2.5, HL + 2.2, DZs + 8.0]], lookPath: [[0, DXs, HL + 1, DZs + 3], [3.2, DXs + 1.5, HL + 1.5, DZs - 3]], ease: true },
  // L10-L11: ONE locked camera south of D and the patch, low: the wolf a third in from the left facing right, Buh on
  // the patch in the right third, his hut behind; the logout is the same frame minus him (no push, no drift)
  hill_lock: { subject: [[DXs + 3, HL + 2.3, DZs]],   // Buh's head on the patch: where hill_walk left the eye, and still there after the logout (the wolf low in frame was a 34 % eye jump)
    at: [DXs + 2.5, HL + 1.5, DZs + 4.4], look: [DXs + 1.3, HL + 1.3, DZs - 2.0], fov: 58, dof: false, drift: 0 }   // (aimed down at the meadow it read superflat: level now, the hut behind Buh)
}
