// Story Short "why do raiders always follow grandpa home 😶" (stories/thirty_one_raids, story.json v2, r3).
// Grandpa has saved the village from thirty-one raids, and every one started the night he came home. He hunts at
// the old pillager tower on the hill, brings back grey bottles, calls them his courage and drinks one at the gate:
// "Lock the door, kid. They're coming." Since Grandma died, a raid is the only time anyone's glad to see him.
// Tonight he comes home too tired to fight, so Buh drinks the courage. The raid horn. "Now they'll love you too, kid."
// (Vanilla: an ominous bottle gives Bad Omen, and a player with it in a village starts a raid; the Hero of the
// Village effect makes villagers throw you gifts.)
//
// The set is a real generated village (seed hellobuh, the village at (-2128, -480), a real pillager outpost 210
// blocks east of it). O = the gate we build on the village's east edge, where its main road ends (-2044, -485),
// ground y 71. Added: a log palisade with the gate, Grandpa's house and yard just inside it, the road out through
// wheat up onto the plateau south-east of the gate, and the vanilla watchtower template on the plateau's bluff
// (the tower on the hill). Everything below is gate-relative: +x east (out), +z south.
//
// Staging: Grandpa is two actor bots with the same skin (Grandpa / Gramps) that take turns, so the next shot's
// Grandpa is always in place before its first frame and nobody pops in or out on a cut. Cameras: render-time camera
// shots (pure functions of time, eye height) for the telling, first person for the climax (S12-S14: the drink,
// the horn, the turn to Grandpa). The narrator's body stands behind each camera, out of frame.
const path = require('path')
const fs = require('fs')
const M = require('../lib/movie')
const { storyLines, storyKit, setKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'thirty_one_raids')
const CAPTION = 'why do raiders always follow grandpa home 😶'
const X = -2044, Z = -485, F = 71
const GA = 'Grandpa', GB = 'Gramps'          // two actors, one Grandpa (same skin): they take turns between shots
const PARK = [0, 80, 140]                   // the off-stage Grandpa waits here on a barrier slab
// the road out of the gate: the centre line (gate-relative x, z), east then south-east up onto the plateau
const ROAD = [[0, 0.5], [14, 0.5], [26, 12.5], [34, 24.5], [38, 32.5]]
const TOWER = [44, 40]                      // the watchtower's centre (template corner at TOWER - 7)
const TIMES = { S01: 23500, S02: 12500, S03: 12600, S05: 23800, S06: 12000, S07: 14000, S08: 13000, S10: 14000, S11: 12300, S12: 12400, S13: 13000 }

// the voice timing at module load (the camera shots key on words: S07's tilt on "CHEST")
let V = null
try { V = JSON.parse(fs.readFileSync(path.join(STORY, 'voice', 'voice.json'), 'utf8')) } catch (e) {}
const chunkAt = (id, i, fb) => (V && V.lines[id] && V.lines[id].chunks[i] ? V.lines[id].chunks[i][0] : fb)
const durOf = (id, fb) => (V && V.lines[id] ? V.lines[id].dur + (V.gap ?? 0.3) : fb)

module.exports = {
  name: 'story_thirty_one_raids',
  near: [X, Z],
  caption: CAPTION,
  time: TIMES.S01,
  botTimeout: 600,
  renderDistance: 12, recordRadius: 176,
  wideMaster: true,
  cast: { [GA]: 'zuri', [GB]: 'zuri' },
  idleLife: true,
  look: { grade: { lift: [0.02, 0.012, 0.02], gamma: [0.98, 1.0, 1.03], gain: [1.1, 1.0, 0.9], sat: 1.08, contrast: 0.12, exposure: 1.04 }, bloom: 0, bloomThreshold: 0.72, vignette: 0.36, grain: 0, dof: { aperture: 0.7 }, shadows: true, rays: 0.4, cloudNight: 0.42 },
  shots: {},   // below (module.exports.shots)
  edit: { caption: CAPTION, red: 'grandpa', story: 'stories/thirty_one_raids', startAt: 'line:0', endAfter: 'story_end:0', punch: ['raidbar'] },

  async setup (ctx) {
    const { bot } = ctx
    const { c, A, mob, vil } = setKit(ctx, { X, Z, F })
    Object.assign(this, { X, Z, F })
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')
    await c('/gamerule random_tick_speed 0')
    await c('/gamerule raids false')              // the drink is real (Bad Omen): never let it start a real raid
    await c('/difficulty normal')
    try { await ctx.waitChunks({ x0: X - 100, z0: Z - 40, x1: X + 60, z1: Z + 60 }, 90000) } catch (e) { ctx.log('chunks', e.message) }
    const fast = (s) => bot.chat(s)
    // the village's own life wanders through shots: the cast is ours (NoAI)
    for (const t of ['villager', 'iron_golem', 'cat', 'pillager', 'item', 'allay', 'chicken', 'pig', 'cow', 'sheep', 'horse']) await ctx.cmd(`/kill @e[type=${t},x=${X},y=${F},z=${Z},distance=..220]`, { mayFail: true })
    const groundAt = (dx, dz) => ground(ctx, X + dx, Z + dz) - F

    // --- Grandpa's house and yard (north of the road, just inside the gate): a pad at dy 0, terraced into the rise
    await c(`/fill ${A(-18, 1, -19)} ${A(-3, 14, -2)} air`)
    for (let k = 1; k <= 3; k++) await c(`/fill ${A(-18 - k, k + 1, -19 - k)} ${A(-3, 14, -2)} air`)
    await c(`/fill ${A(-18, -3, -19)} ${A(-3, -1, -2)} dirt replace air`)
    await c(`/fill ${A(-18, 0, -19)} ${A(-3, 0, -2)} grass_block`)
    for (let k = 1; k <= 3; k++) for (const b of ['#minecraft:base_stone_overworld', 'dirt', 'coarse_dirt']) await c(`/fill ${A(-18 - k, k, -19 - k)} ${A(-3, k, -2)} grass_block replace ${b}`)
    await grandpaHouse(c, A)
    // the yard: a fence on the west and part of the south side, the grindstone, a lantern post, a stair up to the door
    await c(`/fill ${A(-18, 1, -8)} ${A(-18, 1, -2)} spruce_fence`)
    await c(`/fill ${A(-18, 1, -2)} ${A(-12, 1, -2)} spruce_fence`)
    await c(`/setblock ${A(-6, 1, -5)} grindstone[face=floor,facing=east]`)
    await c(`/fill ${A(-15, 1, -3)} ${A(-15, 2, -3)} spruce_fence`); await c(`/setblock ${A(-15, 3, -3)} lantern`)
    await c(`/setblock ${A(-10, 1, -8)} spruce_stairs[facing=north]`)
    await c(`/fill ${A(-8, 1, -8)} ${A(-7, 1, -8)} spruce_stairs[facing=north]`)   // the bench by his door (S11)
    for (const [dx, dz, b] of [[-16, -6, 'poppy'], [-14, -7, 'cornflower'], [-17, -4, 'dandelion'], [-4, -8, 'oxeye_daisy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    await c(`/setblock ${A(-4, 1, -7)} barrel[facing=up]`); await c(`/setblock ${A(-4, 1, -6)} hay_block`)

    // --- the palisade (spruce logs on the ground, 3 high, every third one a block higher) and the gate
    for (let dz = -40; dz <= 40; dz++) {
      if (dz > -3 && dz < 3) continue
      const g = groundAt(0, dz), h = dz === -3 || dz === 3 ? 5 : dz >= -15 && dz <= -4 ? 2 : (Math.abs(dz) % 3 === 0 ? 4 : 3)   // a low parapet along the walkway
      fast(`/fill ${A(0, g + 1, dz)} ${A(0, g + h, dz)} spruce_log`)
      if (dz === -3 || dz === 3) fast(`/setblock ${A(0, g + 6, dz)} lantern`)
    }
    for (let dz = -14; dz <= -4; dz++) fast(`/setblock ${A(-1, groundAt(-1, dz) + 2, dz)} spruce_slab[type=top]`)   // the walkway (S02)
    await bot.waitForTicks(10)
    for (const dz of [-3, 4]) { const g = groundAt(3, dz); await c(`/fill ${A(3, g + 1, dz)} ${A(3, g + 2, dz)} spruce_fence`); await c(`/setblock ${A(3, g + 3, dz)} lantern`) }   // light on faces at the gate at dusk (docs/look.md)
    await c(`/setblock ${A(0, 1, -2)} spruce_fence_gate[facing=east,open=true]`)
    await c(`/setblock ${A(0, 1, 2)} spruce_fence_gate[facing=east,open=true]`)

    // --- the road out: dirt path along ROAD, 3 wide; wheat both sides near the gate
    for (let i = 0; i + 1 < ROAD.length; i++) {
      const [ax, az] = ROAD[i], [bx, bz] = ROAD[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2)
      for (let s = 0; s <= n; s++) {
        const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n
        for (const [ox, oz] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const bx0 = Math.floor(x + ox * 0.9), bz0 = Math.floor(z + oz * 0.9), g = groundAt(bx0, bz0)
          fast(`/setblock ${A(bx0, g, bz0)} dirt_path`); fast(`/fill ${A(bx0, g + 1, bz0)} ${A(bx0, g + 3, bz0)} air`)
        }
      }
      await bot.waitForTicks(4)
    }
    for (const [x0, z0, x1, z1] of [[4, -9, 13, -3], [4, 3, 12, 8]]) {
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const g = groundAt(x, z); fast(`/setblock ${A(x, g, z)} farmland[moisture=7]`); fast(`/setblock ${A(x, g + 1, z)} wheat[age=7]`) }
      await bot.waitForTicks(6)
    }

    for (const [dx, dz, f] of [[13, -15, 'oak'], [9, 12, 'oak'], [-4, 12, 'oak'], [36, -6, 'fancy_oak']]) await ctx.cmd(`/place feature minecraft:${f} ${A(dx, groundAt(dx, dz) + 1, dz)}`, { mayFail: true })
    for (const [dx, dz] of [[14, -4], [15, -4], [14, -5], [13, 5], [16, 4]]) fast(`/setblock ${A(dx, groundAt(dx, dz) + 1, dz)} hay_block`)
    for (const [x0, z0, x1, z1] of [[15, -12, 22, -6], [24, -12, 30, -6]]) {
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const g = groundAt(x, z); fast(`/setblock ${A(x, g, z)} farmland[moisture=7]`); fast(`/setblock ${A(x, g + 1, z)} wheat[age=${5 + (x + z) % 3}]`) }
      await bot.waitForTicks(6)
    }
    // --- the tower on the hill: the vanilla watchtower template on the plateau's bluff, without its banners
    {
      const [tx, tz] = [TOWER[0] - 7, TOWER[1] - 7], ty = groundAt(TOWER[0], TOWER[1]) + 1
      try { await ctx.waitChunks({ x0: X + tx - 4, z0: Z + tz - 4, x1: X + tx + 20, z1: Z + tz + 20 }, 60000) } catch (e) {}
      await c(`/fill ${A(tx, ty, tz)} ${A(tx + 14, ty + 24, tz + 14)} air`)
      await c(`/fill ${A(tx, ty - 6, tz)} ${A(tx + 14, ty - 1, tz + 14)} dirt replace air`)
      await c(`/place template minecraft:pillager_outpost/watchtower ${A(tx, ty, tz)}`)
      await ctx.cmd(`/fill ${A(tx - 1, ty, tz - 1)} ${A(tx + 15, ty + 22, tz + 15)} air replace white_wall_banner`, { mayFail: true })
      await ctx.cmd(`/fill ${A(tx - 1, ty, tz - 1)} ${A(tx + 15, ty + 22, tz + 15)} cobblestone replace jigsaw`, { mayFail: true })
      // the slope below it (S06's foreground): grass, ferns, a birch beside the frame
      for (const [dx, dz] of [[22, 23], [23, 21], [21, 24], [24, 24], [25, 22], [11, 16], [12, 15], [10, 17], [13, 17]]) { const g = groundAt(dx, dz); fast(`/setblock ${A(dx, g + 1, dz)} tall_grass[half=lower]`); fast(`/setblock ${A(dx, g + 2, dz)} tall_grass[half=upper]`) }
      for (const [dx, dz, b] of [[26, 20, 'fern'], [28, 21, 'poppy'], [29, 24, 'oxeye_daisy'], [27, 26, 'fern']]) { const g = groundAt(dx, dz); fast(`/setblock ${A(dx, g + 1, dz)} ${b}`) }
      await ctx.cmd(`/place feature minecraft:birch ${A(27, groundAt(27, 16) + 1, 16)}`, { mayFail: true })
      await bot.waitForTicks(6)
    }
    await ctx.cmd('/kill @e[type=pillager]', { mayFail: true })

    // --- the cast: farmers for the square (S05), the raiders (S13-S14), waiting on a barrier slab above the gate
    await c(`/fill ${A(-4, 60, -4)} ${A(4, 60, 4)} barrier`)
    await c(`/fill ${A(PARK[0] - 2, PARK[1] - 1, PARK[2] - 2)} ${A(PARK[0] + 2, PARK[1] - 1, PARK[2] + 2)} barrier`)
    for (const [tag, prof, type] of [['f1', 'farmer', 'plains'], ['f2', 'farmer', 'plains'], ['f3', 'fisherman', 'plains'], ['f4', 'shepherd', 'plains']]) await vil(0, 0, 0, prof, [tag], { type, y: 61 })
    await mob('ravager', 0, 61, 0, 0, ['rav'])
    for (let i = 1; i <= 5; i++) await mob('pillager', 0, 61, 0, 0, [`p${i}`], 'equipment:{mainhand:{id:"minecraft:crossbow",count:1}}')
    // item frames: the totem wall (30 totems, the 31st frame empty until "THIRTY-ONE", the 32nd always empty), the
    // bottles beside the east window, the crossbow by the door, the bowl on the table
    const frame = (dx, dy, dz, facing, item, tag) => c(`/summon item_frame ${(X + dx + 0.5).toFixed(1)} ${F + dy + 0.5} ${(Z + dz + 0.5).toFixed(1)} {Facing:${facing}b,Fixed:1b,Invulnerable:1b,Tags:["${tag}"]${item ? `,Item:{id:"minecraft:${item}",count:1}` : ''}}`)
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
      const dx = -13 + col, dy = 3 + row
      const n = (3 - row) * 8 + col + 1   // the bottom row is frames 1-8 (left to right)... the last two are 31 and 32
      const last = row === 0 && col >= 6
      await frame(dx, dy, -16, 3, last ? null : 'totem_of_undying', last ? (col === 6 ? 'f31' : 'f32') : `tw${n}`)
    }
    for (const dz of [-15, -14, -12, -11]) await frame(-6, 4, dz, 4, 'ominous_bottle', 'bf')
    await frame(-11, 3, -8, 3, null, 'xbf')
    await frame(-10, 3, -13, 1, 'bowl', 'bowl')
    for (let i = 0; i < 27; i++) await ctx.cmd(`/item replace block ${A(-6, 2, -13)} container.${i} with ominous_bottle`)   // his chest of courage (S07)

    // --- Grandpa: two actor bots, both waiting on the slab
    await c(`/setworldspawn ${A(-8, 1, -4)}`)
    await c('/gamerule respawn_radius 0')
    this.cast = await M.spawnActors(ctx, [GA, GB])
    for (const g of [GA, GB]) {
      await c(`/gamemode survival ${g}`)
      await c(`/effect give ${g} resistance infinite 4 true`)
      await M.place(ctx, g, X + PARK[0] + (g === GA ? -1 : 1) + 0.5, F + PARK[1], Z + PARK[2] + 0.5, 0, 0)
    }
    await c('/clear @s')
    await ctx.tpCheck(X - 10.5, F + 1, Z - 5.5, 180, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await c('/effect give @s resistance infinite 255 true')
    await c('/effect give @s saturation infinite 255 true')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F }, { warm: null })
    const { look, say } = K
    // pacing: the kit's gap (0.08 s); the reveal's hold after L12 (story.json reveal.hold): the horn, the bar, Grandpa
    const SJ = JSON.parse(fs.readFileSync(path.join(STORY, 'story.json'), 'utf8'))
    const HOLD = (SJ.reveal || {}).hold ?? 2.1
    const line = (id, fn, extra = 0, o) => K.line(id, fn, extra, o)
    const P = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
    const gy = (dx, dz) => ground(ctx, X + dx, Z + dz) + 1 - F           // feet height (from F) at a spot
    const cutG = (dx, dz, target, o) => K.cut(dx, dz, target, gy(dx, dz), o)
    const yawTo = (fx, fz, tx, tz) => K.mcYaw(tx - fx, tz - fz)
    const sound = (s, v = 1, p = 1) => ctx.sound(s, v, p)

    // Grandpa: G[name] is a state object; every tick it is /tp'd there (a hop out to PARK and back for a new spot)
    const G = { [GA]: { x: PARK[0] - 0.5, y: PARK[1], z: PARK[2] + 0.5, yaw: 0, pitch: 0, on: false }, [GB]: { x: PARK[0] + 1.5, y: PARK[1], z: PARK[2] + 0.5, yaw: 0, pitch: 0, on: false } }
    // idle acting (the lint counts recorded head turns): a slow look around, or a dozing nod (s.idle = [yaw amp, pitch amp, period])
    K.every(() => {
      for (const [n, s] of Object.entries(G)) {
        if (!s.on) continue
        const [ay, ap, per] = s.idle || [9, 4, 11], t = ctx.tick
        const yw = s.yaw + ay * Math.sin(t / per), pt = Math.max(-60, Math.min(80, s.pitch + ap * Math.sin(t / (per * 1.5) + 1)))
        say(`/tp ${n} ${(X + s.x).toFixed(3)} ${(F + s.y).toFixed(3)} ${(Z + s.z).toFixed(3)} ${yw.toFixed(1)} ${pt.toFixed(1)}`)
      }
    })
    const put = (n, x, z, yaw, pitch = 0, y = gy(x, z), idle = null) => Object.assign(G[n], { x, z, y, yaw, pitch, idle, on: true })
    const park = (n) => { put(n, PARK[0] + (n === GA ? -0.5 : 1.5), PARK[2] + 0.5, 0, 0, PARK[1]); G[n].on = false; say(`/tp ${n} ${X + G[n].x} ${F + PARK[1]} ${Z + G[n].z}`); sneak(n, false) }
    const hold = (n, item) => say(`/item replace entity ${n} weapon.mainhand with ${item || 'air'}`)
    const swing = (n) => this.cast[n].swingArm('right')
    const sneak = (n, on) => this.cast[n].setControlState('sneak', on)
    const frameItem = (tag, item) => say(`/data merge entity @e[tag=${tag},limit=1] {Item:{id:"minecraft:${item}",count:1}}`)
    const frameEmpty = (tag) => say(`/data remove entity @e[tag=${tag},limit=1] Item`)
    // the narrator's body stands behind each camera shot, out of frame; the camera shot switches on the cut
    const shot = async (name, bx, bz, target, time) => { K.shot(name); await cutG(bx, bz, target, time !== undefined ? { time } : {}) }

    // ---- L01 (S01): dawn after raid 31. The totem wall; Grandpa (frame right) hangs the 31st; the push ends on the
    // one empty frame, lit by the lantern under it
    put(GA, -7.2, -14.8, 172, 10, 2); hold(GA, 'totem_of_undying')
    put(GB, 21.5, 8.6, yawTo(21.5, 8.6, 0.5, 0.5), 8)             // S02's Grandpa, already on the road
    hold(GB, 'crossbow'); frameEmpty('xbf')
    await bot.waitForTicks(6)
    await shot('s01', -10.5, -5.5, P(-10, 3, -12), TIMES.S01)
    await line('L01', async (k, at) => {
      if (k === at(0) + 1) swing(GA)   // the 31st totem goes in on "THIRTY-ONE"
      if (k === at(0) + 4) { frameItem('f31', 'totem_of_undying'); hold(GA, 'air'); sound('entity.item_frame.add_item', 1, 1) }
      if (k > at(0) + 8) { G[GA].yaw = 175; G[GA].pitch = 5 }
      look(k)
    })

    // ---- L02 (S02): dusk, from the palisade walkway by the gate: Grandpa small on the road, walking home; the tower
    put(GA, -7.3, -4.5, -90, 35)                                  // S03's Grandpa at the grindstone
    await shot('s02', -3.5, -12.5, P(20, 2, 6), TIMES.S02)
    await line('L02', async (k) => {
      const s = G[GB]; const d = Math.hypot(s.x - 14.5, s.z - 0.8)
      if (d > 0.3) { s.x -= 0.075 * (s.x - 14.5) / d; s.z -= 0.075 * (s.z - 0.8) / d; s.y = gy(s.x, s.z) }
      look(k)
    })

    // ---- L03 (S03): the same evening, the yard: Grandpa at his grindstone, the crossbow on the wall by his door
    frameItem('xbf', 'crossbow')
    await shot('s03', -24, -4.5, P(-6, 2, -4.5), TIMES.S03)
    park(GB)
    const grind = (k) => { if (k % 12 === 0) { swing(GA); sound('block.grindstone.use', 0.35, 1) } }
    // ...and on "They KNOW" the cut in (S04, closer; he doesn't look up)
    put(GB, -77.5, 6.6, -90, 5, 0); hold(GB, 'crossbow')         // S05's Grandpa at the square's west side (clear of the market stalls)
    await line('L03', async (k, at) => {
      if (k === at(2)) { K.shot('s04'); await cutG(-3.0, 2.0, P(-7.4, 2.2, -4.6)) }
      grind(k); if (k === at(3)) G[GA].pitch = 25
      look(k)
    })
    // ---- L04 (S04W): first person, inside, the same evening: the totem wall; on "ONE frame" the eyes go to the
    // empty 32nd frame (bottom row, right), the lantern under it
    K.shot('pov')
    await K.cut(-8.5, -11.0, P(-9.5, 4.6, -15.5), 2, { time: TIMES.S03 })
    let wall = null
    await line('L04', async (k, at) => {
      if (k === 0) wall = K.base
      if (k >= at(2) - 4) K.turnTo(wall, P(-5.5, 3.5, -15.5), (k - at(2) + 4) / 18)
      look(k)
    })

    // ---- L05 (S05): dawn after raid 31, the square: he walks across; the farmers throw him bread on "BREAD"
    const farmers = [['f1', -78.5, -1.5], ['f2', -69.5, -2.0], ['f3', -81.0, 9.5], ['f4', -66.5, 6.0]]
    const fa = farmers.map(([t, x, z]) => K.actor(t, { x, z, y: gy(x, z), yaw: yawTo(x, z, -74, 4) }))
    for (const [t] of farmers) K.warp(t)   // into the square while the camera is elsewhere (before S05's cut)
    await bot.waitForTicks(3)
    frameEmpty('xbf')
    await shot('s05', -72.5, 19.5, P(-74, 1, 3), TIMES.S05)
    park(GA)
    await line('L05', async (k, at) => {
      const s = G[GB]
      if (s.x < -69.5) { s.x += 0.105; s.yaw = -90 }
      fa.forEach((f, i) => { f.yaw = yawTo(f.x, f.z, s.x, s.z) })
      if (k >= at(2) - 2 && k <= at(2) + 6 && (k - at(2) + 2) % 2 === 0) {   // on "BREAD"
        const f = fa[(k - at(2) + 2) / 2 % fa.length], dx = s.x + 1.2 - f.x, dz = s.z - f.z, d = Math.hypot(dx, dz)
        say(`/summon item ${(X + f.x).toFixed(2)} ${(F + f.y + 1.4).toFixed(2)} ${(Z + f.z).toFixed(2)} {Item:{id:"minecraft:bread",count:1},PickupDelay:32767,Motion:[${(dx / d * 0.28).toFixed(3)},0.32,${(dz / d * 0.28).toFixed(3)}]}`)
        sound('entity.villager.celebrate', 0.5, 1 + (k % 3) * 0.05)
      }
      look(k)
    })

    // ---- L06 (S06): sunset another day, the slope below the tower: Grandpa climbing the path toward it
    put(GA, 33.0, 22.6, yawTo(33, 22.6, 36, 28.5), -5); hold(GA, 'crossbow')
    await bot.waitForTicks(3)
    await shot('s06', 5.0, 12.5, P(44, 14, 40), TIMES.S06)
    park(GB)
    for (const [t] of farmers) K.bury(t, -60)   // out of the square after the cut
    say('/kill @e[type=item]')
    await line('L06', async (k) => {
      const s = G[GA]; if (s.z < 28) { s.x += 0.028; s.z += 0.055; s.y = gy(s.x, s.z) }
      look(k)
    })

    // ---- L07 (S07): night, inside: the chest under the east window; the lid opens, the bottle comes up in his
    // hand on "BOTTLES"; the camera tilts down to the open chest on "CHEST"
    put(GB, -7.0, -14.6, yawTo(-7, -14.6, -5.5, -12.5), 30, 2); hold(GB, 'air')
    await bot.waitForTicks(3)
    await shot('s07', -8.5, -6.5, P(-8, 2, -9), TIMES.S07)
    park(GA)
    let chest = null
    await line('L07', async (k, at) => {
      if (k === at(1) - 2) swing(GB)
      if (k === at(1)) { hold(GB, 'ominous_bottle'); G[GB].pitch = 10; G[GB].yaw = yawTo(-7, -14.6, -9.0, -11.2) }
      if (k === Math.max(at(2) + 4, at(1) + 17)) {   // "a whole CHEST" (after OMINOUS's look on him): first person, beside him; I open his chest (the vanilla chest screen)
        K.shot('pov')
        await K.cut(-8.2, -12.0, P(-5.5, 2.45, -12.5), 2)
        K.open(P(-6, 2, -13)).then(w => { chest = w }).catch(e => ctx.log('chest', e.message))
      }
      look(k)
    })
    try { K.close(chest) } catch (e) {}

    // ---- L08 (S08): dusk, a raid night: Grandpa in the open gate, the bottle in his right hand; head back on
    // "drinks" (the drink sound), the crossbow back in his hand by "GATE"
    const gate = { x: 0.6, z: 0.3, yaw: K.mcYaw(TOWER[0] - 0.6, TOWER[1] - 0.3) }
    put(GA, gate.x, gate.z, gate.yaw, 0); hold(GA, 'ominous_bottle')
    await bot.waitForTicks(3)
    await shot('s08', -5.8, -2.0, P(-3, 2, 0), TIMES.S08)
    park(GB)
    await line('L08', async (k, at) => {
      if (k === at(2)) M.pose(ctx, GA, 'drink')
      if (k >= at(2) && k < at(3)) { G[GA].pitch = Math.max(-30, G[GA].pitch - 5); if ((k - at(2)) % 4 === 0) sound('entity.generic.drink', 0.8, 0.95 + ((k - at(2)) % 8) * 0.01) }
      if (k === at(3) - 1) { M.poseOff(ctx, GA); hold(GA, 'crossbow') }
      if (k >= at(3)) G[GA].pitch = Math.min(0, G[GA].pitch + 7)
      look(k)
    })
    // ---- L09 (S09): closer; he turns his head back over his right shoulder on "lock the DOOR", a nod on "kid"
    await shot('s09', -4.2, 5.6, P(0, 2, 0))
    await line('L09', async (k, at) => {
      if (k >= at(1) - 4 && G[GA].yaw < gate.yaw + 95) G[GA].yaw += 9
      if (k >= at(2) && k < at(2) + 12) G[GA].pitch = Math.sin((k - at(2)) / 12 * Math.PI) * 16   // a nod on "kid, they're COMING"
      if (k === at(2) + 14) swing(GA)                                                           // he shoulders the crossbow
      look(k)
    })

    // ---- L10 (S10): another night, inside: Grandpa crouched over the table set for two; he lifts his head on "GLAD"
    put(GB, -10.28, -12.5, -90, 50, 2.5, [11, 8, 8]); hold(GB, 'air')
    frameItem('xbf', 'crossbow')
    await bot.waitForTicks(3)
    await shot('s10', -6.0, -6.5, P(-6, 2, -9), TIMES.S10)
    M.pose(ctx, GB, 'sit')
    park(GA)
    await line('L10', async (k, at) => {
      const up = at(2)   // "GLAD"
      if (k === 10 || k === 34) swing(GB)   // he nudges the one bowl across the table
      if (k === at(1)) K.shot('s10b')        // "a RAID": in on his face
      G[GB].pitch = k < up - 3 ? 50 : k < up + 16 ? Math.max(4, G[GB].pitch - 9) : Math.min(50, G[GB].pitch + 5)
      look(k)
    })

    // ---- L11 (S11): the final night, the yard: Grandpa crouched against his door frame, the bottle undrunk in his
    // slack hand; it leaves his hand on "FIGHT"
    put(GA, -7.5, -7.72, 15, 50, 1.5, [3, 14, 7]); hold(GA, 'ominous_bottle')
    await bot.waitForTicks(3)
    await shot('s11', -24, -4.5, P(-6, 2, -4.5), TIMES.S11)
    M.pose(ctx, GA, 'sit')
    M.poseOff(ctx, GB); park(GB)
    await line('L11', async (k, at) => {
      if (k === at(1)) G[GA].pitch = 62   // "too TIRED"
      if (k === at(2)) { hold(GA, 'air'); G[GA].pitch = 66; sound('item.armor.equip_generic', 0.4, 1.3) }
      look(k)
    })

    // ---- L12 (S12): first person, at the open gate, the bottle in my hand: the drink on "drank"; "had to FIGHT"
    // over the empty hand. Then S13 (the hold): the horn, and they're coming up the road
    say('/clear @s'); await bot.waitForTicks(2)
    say('/item replace entity @s hotbar.0 with ominous_bottle'); bot.setQuickBarSlot(0)
    await bot.waitForTicks(4)
    K.shot('pov')
    const roadAim = P(44, 12, 40)   // up at the tower, where the bottles come from
    await K.cut(0.5, 0.6, P(30, 5.5, 20), 1, { time: TIMES.S12 })
    // the raiders: a ravager with five pillagers in a loose wedge, walking down the road toward the gate
    const along = (d) => {   // the point d blocks along the road from the gate, and the road's direction there
      for (let i = 0; i + 1 < ROAD.length; i++) {
        const [ax, az] = ROAD[i], [bx, bz] = ROAD[i + 1], L = Math.hypot(bx - ax, bz - az)
        if (d <= L || i + 2 === ROAD.length) return { x: ax + (bx - ax) * d / L, z: az + (bz - az) * d / L, ux: (bx - ax) / L, uz: (bz - az) / L }
        d -= L
      }
    }
    const WEDGE = [['rav', 0, 0], ['p1', 1.6, -1.8], ['p2', 1.8, 1.9], ['p3', 3.6, -0.6], ['p4', 3.8, 2.6], ['p5', 4.4, -2.9]]
    let raidD = null, raiders = null
    const placeRaiders = () => {
      for (const [t, back, side] of WEDGE) {
        // along the road by "distance from the gate" (the ROAD polyline from the gate is close to straight-line distance here)
        // one direction for the whole wedge (the lead's road segment): per-member segments swung the side offsets
        // round the road's bend (1-block jumps the kit refused)
        const L0 = along(raidD), x = L0.x + L0.ux * back - L0.uz * side, z = L0.z + L0.uz * back + L0.ux * side, r = L0
        const a = raiders.get(t); a.x = x; a.z = z; a.y = gy(x, z); a.yaw = K.mcYaw(-r.ux, -r.uz)
      }
    }
    let base = null
    // the reveal (no closing line, story.json reveal): E = the end of the speech. E: the cut to the road, the horn;
    // the raiders walk down it. E+2..E+22: the Raid bar fills (vanilla's red notched_10 "Raid" bar; edit.py draws it
    // from the `bossbar` marks); E+22: full (`raidbar`, the payoff punch). E+8..E+22: Grandpa steps up beside me; from
    // E+16 I turn to him; ~E+30 he turns to see me. The line (and the Short) ends 1.0 s after the bar is full.
    const RISE = 20, AFTERBAR = 20
    let E = null, me = null, rc = null, aim = null, from = null, WALK = null
    await line('L12', async (k, at, n) => {
      if (E === null) E = n - (2 + RISE + AFTERBAR)
      if (k === 0) base = K.base
      if (k <= at(0) + 16) K.turnTo(base, roadAim, Math.max(0, (k - at(0) + 4) / 20))   // from the near road up the road as I drink
      if (k === at(0) + 2) { bot.activateItem(); for (let j = 0; j < 7; j++) setTimeout(() => sound('entity.generic.drink', 0.6, 1 + j * 0.01), j * 220) }
      if (k === at(0) + 36) { say('/effect clear @s bad_omen'); say('/effect clear @s raid_omen'); say('/effect clear @s trial_omen') }
      if (k === at(2) - 2) base = K.base
      if (k >= at(2) - 2 && k < E) K.turnTo(base, P(-7.5, 2.0, -7.7), (k - at(2) + 2) / 14)   // back at Grandpa, asleep on his bench
      if (k === E - 6) {   // the raiders onto the road while I'm looking back at him
        raidD = 20; raiders = new Map(WEDGE.map(([t]) => [t, K.actor(t, { x: 20, z: 6, y: gy(20, 6), yaw: 90 })])); placeRaiders()
        for (const [t] of WEDGE) K.warp(t)   // onto the road while the camera is on Grandpa
      }
      if (k === E) {   // S13: the cut (on the spot, a step forward) to the road; the horn on its frame
        say('/effect clear @s')
        await K.cut(0.9, 0.55, P(19, 2.0, 5.5), 1, { time: TIMES.S13 })
        sound('event.raid.horn', 2.2, 1)
        K.go(true)   // a step forward through the gate, toward them
        put(GB, -1.6, 1.3, -80, 0); hold(GB, 'crossbow')            // Grandpa, behind me, out of view
      }
      if (k === E + 7) K.go(false)
      if (k >= E + 2 && k <= E + 2 + RISE && (k - E - 2) % 2 === 0) {
        const progress = +((k - E - 2) / RISE).toFixed(2)
        ctx.mark('bossbar', { title: 'Raid', progress, color: 'red', overlay: 'notched_10' })
        if (progress === 1) ctx.mark('raidbar')
      }
      if (k === E + 8) {   // where I stand after the step; Grandpa's walk ends a step ahead on my right, 10 deg right of my aim
        me = { x: bot.entity.position.x - X, z: bot.entity.position.z - Z }
        rc = along(raidD)
        const thR = Math.atan2(rc.z - me.z, rc.x - me.x); aim = thR + 20 * Math.PI / 180
        const thG = aim + 10 * Math.PI / 180, end = [me.x + 2.4 * Math.cos(thG), me.z + 2.4 * Math.sin(thG)]
        WALK = [[E + 8, G[GB].x, G[GB].z], [E + 15, me.x - 0.3, me.z + 1.3], [E + 22, end[0], end[1]]]
        ctx.log('S14', JSON.stringify({ me, end, aimDeg: aim * 180 / Math.PI }))
        sound('item.crossbow.loading_start', 0.8, 1)
      }
      if (WALK) {
        const s = G[GB]
        if (k <= E + 22) {
          const [a, b] = k <= E + 15 ? [WALK[0], WALK[1]] : [WALK[1], WALK[2]], u = (k - a[0]) / (b[0] - a[0])
          const nx = a[1] + (b[1] - a[1]) * u, nz = a[2] + (b[2] - a[2]) * u
          s.yaw = yawTo(s.x, s.z, nx, nz); s.x = nx; s.z = nz; s.y = gy(nx, nz)
        } else s.yaw = k >= E + 30 ? yawTo(s.x, s.z, me.x, me.z) : yawTo(s.x, s.z, rc.x, rc.z)   // he turns to see me
        s.pitch = k >= E + 30 ? 5 : 2
        if (k === E + 20) swing(GB)
        if (k === E + 30) sound('item.crossbow.loading_end', 1.0, 1)
      }
      if (raiders) { raidD = Math.max(14, raidD - (k > E + 16 ? 0.055 : 0.105)); placeRaiders() }
      if (k > E && k < E + 16) K.base = K.aim(P(along(raidD).x, 2.0, along(raidD).z))
      if (k === E + 16) from = K.base
      if (k >= E + 16) K.turnTo(from, P(me.x + 10 * Math.cos(aim), 2.3, me.z + 10 * Math.sin(aim)), Math.min(1, (k - E - 16) / 16))
      look(k)
    }, HOLD)
    ctx.mark('story_end')
    for (const s of Object.values(G)) s.on = false
    await bot.waitForTicks(4)
    sneak(GA, false)
    M.quitActors(ctx)
    return true
  }
}

// Grandpa's house: 11 x 9 (x -15..-5, z -17..-9), inside 9 (E-W) x 7 (N-S) x 5 high (floor dy 1, room dy 2..6), a
// cobble plinth into the ground, spruce plank walls in a log frame, a dark oak roof (ridge east-west) with overhangs,
// the door south at x -10. Inside: the totem wall (north; frames added in setup), a table set for two, the chest
// under the east window, a bookshelf, lanterns, glowstone hidden in the ceiling.
async function grandpaHouse (c, A) {
  const f = (a, b, blk) => c(`/fill ${A(...a)} ${A(...b)} ${blk}`)
  const set = (a, blk) => c(`/setblock ${A(...a)} ${blk}`)
  await f([-15, -3, -17], [-5, 1, -9], 'cobblestone')
  for (const [x, z] of [[-15, -12], [-11, -9], [-5, -14], [-8, -17], [-13, -9]]) await set([x, 1, z], 'mossy_cobblestone')
  await f([-14, 1, -16], [-6, 1, -10], 'spruce_planks')                              // the floor
  await f([-15, 2, -17], [-5, 6, -9], 'spruce_planks hollow')
  await f([-14, 2, -16], [-6, 6, -10], 'air')
  for (const [x, z] of [[-15, -17], [-5, -17], [-15, -9], [-5, -9], [-10, -17]]) await f([x, 2, z], [x, 6, z], 'spruce_log')
  await f([-15, 6, -17], [-5, 6, -17], 'spruce_log[axis=x]'); await f([-15, 6, -9], [-5, 6, -9], 'spruce_log[axis=x]')
  await f([-15, 6, -16], [-15, 6, -10], 'spruce_log[axis=z]'); await f([-5, 6, -16], [-5, 6, -10], 'spruce_log[axis=z]')
  await f([-15, 7, -17], [-5, 7, -9], 'spruce_planks')                               // the ceiling
  for (const [x, z] of [[-12, -13], [-8, -13], [-10, -11], [-10, -15]]) await set([x, 7, z], 'glowstone')
  // windows: south at x -13 and -7, east at z -13 (no west window)
  for (const x of [-13, -7]) await f([x, 3, -9], [x, 4, -9], 'glass_pane')
  await f([-5, 3, -13], [-5, 4, -13], 'glass_pane')
  for (const x of [-14, -12, -8, -6]) await set([x, 3, -8], `spruce_trapdoor[facing=south,open=true,half=bottom]`)
  await set([-10, 2, -9], 'spruce_door[half=lower,facing=south,open=false]'); await set([-10, 3, -9], 'spruce_door[half=upper,facing=south,open=false]')
  await set([-10, 5, -8], 'spruce_slab[type=top]')
  await set([-9, 4, -8], 'lantern[hanging=true]'); await set([-9, 5, -8], 'spruce_fence')
  // the roof: dark oak stairs from the eaves (a block out on every side) to the ridge at z -13
  for (let k = 0; k <= 4; k++) {
    await f([-16, 7 + k, -18 + k], [-4, 7 + k, -18 + k], 'dark_oak_stairs[facing=south]')
    await f([-16, 7 + k, -8 - k], [-4, 7 + k, -8 - k], 'dark_oak_stairs[facing=north]')
  }
  await f([-16, 12, -13], [-4, 12, -13], 'dark_oak_slab[type=bottom]')
  await f([-16, 11, -13], [-4, 11, -13], 'dark_oak_planks')
  for (const x of [-15, -5]) for (let k = 1; k <= 4; k++) await f([x, 7 + k, -17 + k], [x, 7 + k, -9 - k], 'spruce_planks')
  await f([-12, 7, -15], [-12, 13, -15], 'cobblestone'); await set([-12, 14, -15], 'cobblestone_wall')   // the chimney
  // inside: the table (two top slabs), the chairs (Grandma's south of it), the chest under the east window, a
  // bookshelf in the north-west corner, the lantern under the empty frame, a barrel, a rug
  await f([-13, 2, -12], [-7, 2, -10], 'brown_carpet')
  await f([-10, 2, -13], [-9, 2, -13], 'spruce_slab[type=top]')
  await set([-11, 2, -13], 'spruce_stairs[facing=west]')
  await set([-9, 2, -12], 'spruce_stairs[facing=south]')
  await set([-6, 2, -13], 'chest[facing=west]')
  await f([-14, 2, -16], [-14, 4, -16], 'bookshelf')
  await set([-6, 2, -16], 'lantern')
  await set([-14, 2, -10], 'barrel[facing=up]'); await set([-14, 3, -10], 'lantern')
  await set([-14, 2, -13], 'composter')
}

// The ground's top solid block at (x, z), ignoring plants, crops, leaves, logs, fences and lanterns
function ground (ctx, x, z) {
  const { bot } = ctx
  for (let y = 120; y > 40; y--) {
    const b = bot.blockAt(new ctx.Vec3(Math.floor(x), y, Math.floor(z)))
    if (!b) continue
    if (b.name === 'farmland' || b.name === 'dirt_path') return y
    if (b.boundingBox !== 'block' || /_leaves$|_log$|fence|lantern|barrier/.test(b.name)) continue
    return y
  }
  return F
}

// The camera shots: offsets from O = (X, F, Z), the gate's ground (block y 71; on the road the feet are at 1 and the
// eye at 2.62). Eye height everywhere: the boy's point of view, from outside his body.
const l07Chest = chunkAt('L07', 3, 2.6)
module.exports.shots = {
  pov: { pov: true },
  // S01: inside the door, a slow push to the totem wall; it ends on the empty frame (bottom right), lantern-lit
  s01: { path: [[0, -9.8, 3.66, -10.1], [durOf('L01', 5.2), -8.4, 3.4, -12.3]], lookPath: [[0, -6.6, 4.1, -16.9], [durOf('L01', 5.2), -6.2, 3.4, -16.9]], ease: true, fov: 68, dof: false },
  // S02: high on the palisade walkway beside the gate, looking out: the road, Grandpa small on it, the tower on the hill
  s02: { at: [-1.2, 6.6, -10.5], look: [22, 3.0, 9.0], fov: 50, push: 0.12, dof: false },
  // S03 / S11: the yard from its west side, looking east: the door at frame left, the grindstone, the gate posts right
  s03: { at: [-19.6, 3.62, -4.6], look: [-4.0, 2.0, -3.4], fov: 60, push: 0.08, dof: false },
  s11: { at: [-15.0, 3.3, -3.6], look: [-7.9, 2.0, -7.6], fov: 56, push: 0.25, dof: false },
  // S04: a few steps closer, from the south-east, a little lower: him knees-up, the door and the crossbow behind
  s04: { at: [-4.6, 2.45, -0.4], look: [-7.4, 2.4, -4.6], fov: 56, push: 0.12, dof: { aperture: 0.6, focus: { of: `actor:${GA}`, offset: [0, 1.4, 0] } } },
  // S05: the square at dawn from its south edge, past a hay bale and a fence: he crosses left to right, the bell behind
  s05: { at: [-73.0, 1.62, 16.0], look: [-73.8, 1.5, 3.0], fov: 56, push: 0.25, dof: false },
  // S06: below the tower at sunset, looking up the slope: the tower on the hill, Grandpa climbing the path
  s06: { at: [8.0, 3.8, 14.0], look: [30, 7.6, 24], fov: 50, push: 0.15, dof: false },
  // S07: beside Grandpa at the chest under the east window; the tilt down to the open chest on "CHEST"
  s07: { at: [-9.0, 3.6, -11.2], look: [-6.6, 3.4, -14.3], fov: 58, push: 0.15, dof: false },
  // S08: the gate at dusk, 4 behind Grandpa and 2 to his right: the bottle in profile, the road and the tower
  s08: { at: [-3.5, 2.62, -0.5], look: [20, 3.0, 6.5], fov: 54, push: 0.1, dof: false },
  // S09: closer, the same side: he turns his head back over his right shoulder
  s09: { at: [-2.6, 2.45, 3.8], look: [0.6, 2.35, 0.3], fov: 58, push: 0.1, dof: { aperture: 0.6, focus: { of: `actor:${GA}`, offset: [0, 1.5, 0] } } },
  // S10: the room from its south-east corner: Grandma's chair nearest the lens, Grandpa crouched over the table
  s10: { at: [-6.6, 3.75, -10.4], look: [-10.6, 2.9, -13.6], fov: 62, push: 0.1, dof: false },
  // S10b: in on his face across the table on "a RAID" (the ceiling glowstone lights him)
  s10b: { at: [-7.3, 3.5, -11.1], look: [-10.3, 3.3, -12.5], fov: 50, push: 0.12, dof: { aperture: 0.6, focus: { of: `actor:${GB}`, offset: [0, 1.4, 0] } } }
}

module.exports.ROAD = ROAD
