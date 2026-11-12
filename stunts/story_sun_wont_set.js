// Story Short "the sun hasn't set in 300 days 💀" (stories/sun_wont_set r3, the owner's notes 2026-11-10).
// The sun has hung over Stillwater for 300 days: the kid holds it up with a lever, because at night the zombies come
// out and Grandpa is too slow to run. Grandpa asks every day whether the sun will go down, and finally: "Let the night
// come. You need sleep, kid." The kid hears it as Grandpa being tired, walks him home, pulls the lever back and stands
// guard at Grandpa's door against the zombies. Then the sky screams: phantoms come at night for a player who hasn't
// slept, and he hasn't slept in 300 days. Slain by Phantom.
//
// The place is canon (docs/world/map.json stillwater, day 1100: the Long Day lever ON): Grandpa's cottage on the west
// rise, the square with the lever on its stone post, Gary's cottage, the one tree at the edge of the shore. world.build
// puts them on the seed's own terrain; the story adds the tree's shade canopy, Gary's field and its cast.
// O = (X, F, Z) = Stillwater's canonical origin (-215, 68, -1060); every spot off it reads its own ground (gy).
const path = require('path')
const world = require('../lib/world')
const { storyLines, storyKit, setKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'sun_wont_set')
const CAPTION = "the sun hasn't set in 300 days 💀"
const DAY = 11000, NIGHT = 14200
const X = -215, Z = -1060, F = 68
const TREE = [27, 2]                 // the one tree (-188, -1058)
const LEVER = [1, 2, -2]             // the lever block (-214, 70, -1062), on its stone post
const FIELD = [15, 25, 22, 32]       // Gary's field (story prop): x0, z0, x1, z1, north-east of his cottage
// the zombies' places in the shade (rel to the trunk)
const ZA = [[-2.3, -1.2], [-1.6, 1.4], [1.4, -1.8], [2.2, 0.9], [0.6, 2.2], [-2.6, 0.4], [1.9, -0.2]]

module.exports = {
  name: 'story_sun_wont_set',
  caption: CAPTION,
  time: DAY,
  clouds: false,             // the renderer fogs dusk clouds orange one way and grey the other
  brightness: 1,
  renderDistance: 12, recordRadius: 128,
  look: { mood: 'bright', rolloff: 0.8 },
  shots: { pov: { pov: true } },
  edit: {
    caption: CAPTION, red: 'sun', story: 'stories/sun_wont_set', startAt: 'line:0', endAfter: 'death:1.0', deathScreen: true,
    punchStress: true,
    zoom: [['death:0.1', 'death:1.0', 1.05]],
    sfx: [['impact', 'dusk', { gain: 0.5 }], ['impact', 'death', { gain: 0.6 }]]
  },
  expectDeath: true,
  botTimeout: 600,
  chunkStops (set) { return [[0, 0], [30, 0], [-20, 0], [10, 25], [0, -25]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },

  async setup (ctx) {
    const { bot } = ctx
    const { c, A, mob, vil } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    for (const g of ['log_admin_commands false', 'random_tick_speed 0', 'mob_griefing false', 'natural_health_regeneration false', 'spawn_mobs false']) await c(`/gamerule ${g}`)
    await c('/difficulty normal')
    await c(`/setworldspawn ${X} ${F + 1} ${Z}`)
    const W = await world.build(ctx, { story: 'sun_wont_set' })
    const P0 = W.places.stillwater
    ctx.log(`stillwater: ${JSON.stringify(P0.origin)}; pieces ${Object.keys(P0.pieces).join(' ')}`)
    const gp = P0.pieces.grandpa
    this.door = gp.anchors.door; this.doorstep = gp.anchors.doorstep; this.gate = gp.anchors.gate; this.bedA = gp.anchors.bed; this.street = gp.anchors.street; this.inside = gp.anchors.inside
    ctx.log(`grandpa anchors: ${JSON.stringify({ door: this.door, doorstep: this.doorstep, gate: this.gate, bed: this.bedA, street: this.street })}`)
    await c(`/kill @e[type=!player,x=${X},y=${F},z=${Z},distance=..100]`)
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz)

    // the tree's shade: a wide persistent leaf canopy round the canon tree's trunk, so seven zombies keep out of the sun
    { const g = gy(TREE[0] + 3, TREE[1] + 3) - F
      await c(`/fill ${A(TREE[0] - 4, g + 5, TREE[1] - 4)} ${A(TREE[0] + 4, g + 5, TREE[1] + 4)} oak_leaves[persistent=true] keep`)
      await c(`/fill ${A(TREE[0] - 3, g + 6, TREE[1] - 3)} ${A(TREE[0] + 3, g + 6, TREE[1] + 3)} oak_leaves[persistent=true] keep`)
      for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) await c(`/setblock ${A(TREE[0] + x, g + 5, TREE[1] + z)} air`)
      this.treeG = g }
    // Gary's field: farmland on each column's ground, a water row, a fence round it
    for (let x = FIELD[0]; x <= FIELD[2]; x++) {
      for (let z = FIELD[1]; z <= FIELD[3]; z++) {
        const g = gy(x, z) - F
        const edge = x === FIELD[0] || x === FIELD[2] || z === FIELD[1] || z === FIELD[3]
        await c(`/fill ${A(x, g + 1, z)} ${A(x, g + 2, z)} air`)
        if (edge) { await c(`/setblock ${A(x, g + 1, z)} oak_fence`); continue }
        if (z === 28) { await c(`/setblock ${A(x, g, z)} water`); continue }
        await c(`/setblock ${A(x, g, z)} farmland[moisture=7]`); await c(`/setblock ${A(x, g + 1, z)} wheat[age=7]`)
      }
    }
    // Grandpa's garden gate stands open (the porch shots look in through it)
    { const g = this.gate.block; await c(`/setblock ${g[0]} ${g[1]} ${g[2]} oak_fence_gate[facing=east,open=true]`) }
    // the cast: all NoAI, moved only by the scenes
    const at = (dx, dz) => ({ x: dx, z: dz, y: gy(dx, dz) - F + 1 })
    const V = (p, yaw, prof, tags) => vil(p.x, p.z, yaw, prof, tags, { y: p.y })
    const d = this.doorstep
    await vil(d.x - X, d.z - Z, 90, 'librarian', ['gp'], { y: d.y - F })     // Grandpa, at his door
    await V(at(FIELD[0] - 0.7, 28.5), -90, 'farmer', ['gary'])                 // Gary, walking into his own fence
    const GAZE = [[-5.5, -3.2, 'cleric'], [-6.8, -0.6, 'mason'], [-5.2, 1.9, 'shepherd'], [-7.4, 2.8, 'fletcher']]
    for (let i = 0; i < GAZE.length; i++) await V(at(GAZE[i][0], GAZE[i][1]), 90, GAZE[i][2], ['gaze', `g${i}`])
    for (let i = 0; i < ZA.length; i++) { const p = at(TREE[0] + ZA[i][0], TREE[1] + ZA[i][1]); await mob('zombie', p.x, p.y, p.z, -90 + (i % 3 - 1) * 20, ['za', `z${i}`]) }
    // the phantoms wait in a dark pocket under the set (in daylight up in the air they caught fire and kept burning)
    await c(`/fill ${A(-3, -24, -3)} ${A(3, -20, 14)} air`)
    for (let i = 0; i < 6; i++) await mob('phantom', 0.5, -23, 0.5 + i * 2, 0, ['ph', `ph${i}`])
    await c('/item replace entity @s armor.head with air')
    await c('/effect clear @s')
    await ctx.tpCheck(X + 37.5, gy(37.5, 2.5) + 1, Z + 2.5, 90, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    this.GAZE = GAZE
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, look, line, say } = K
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz) - F + 1
    const cut = (dx, dz, target, o = {}) => K.cut(dx, dz, target, gy(dx, dz), o)
    const walk = (a, dx, dz) => { K.step(a, dx, dz); const g = gy(a.x, a.z); a.y += Math.max(-0.25, Math.min(0.25, g - a.y)) }
    const cutP = async (dx, dz, target, moves, o = {}) => {   // a cut that moves the cast with it (the shot mark waits for them)
      const y = gy(dx, dz)
      const nb = K.aimFrom(new ctx.Vec3(X + dx, F + y + 1.62, Z + dz), target)
      K.stop()
      await K.cutShot('pov', moves, { ...o, self: { x: dx, y, z: dz, yaw: 180 - nb.yaw * 180 / Math.PI, pitch: -nb.pitch * 180 / Math.PI } })
      K.base = nb
      await K.look(0)
    }
    const away = (tag, a) => { a.y = 60; K.warp(tag) }
    const rel = (p) => ({ x: p.x - X, y: p.y - F, z: p.z - Z })
    const door = rel(this.door), step0 = rel(this.doorstep), gate = rel(this.gate), bedA = rel(this.bedA)
    const tg = this.treeG
    const TRUNK = P(TREE[0] + 0.5, tg + 1.6, TREE[1] + 0.5)

    // the cast
    const HOME = { x: door.x + 0.6, y: door.y, z: door.z }   // Grandpa in his doorway (the porch camera stands inside the garden)
    const gp = K.actor('gp', { x: HOME.x, y: HOME.y, z: HOME.z, yaw: 90 })   // Grandpa
    const gary = K.actor('gary', { x: FIELD[0] - 0.7, y: gy(FIELD[0] - 0.7, 28.5), z: 28.5, yaw: -90 })
    const zs = ZA.map((o, i) => K.actor(`z${i}`, { x: TREE[0] + o[0], y: gy(TREE[0] + o[0], TREE[1] + o[1]), z: TREE[1] + o[1], yaw: -90 + (i % 3 - 1) * 20 }))
    const gaze = this.GAZE.map((g, i) => K.actor(`g${i}`, { x: g[0], y: gy(g[0], g[1]), z: g[1], yaw: 90, pitch: -35 }))
    const ph = [0, 1, 2, 3, 4, 5].map(i => K.actor(`ph${i}`, { x: 0.5, y: -23, z: 0.5 + i * 2, yaw: 0 }))
    ctx.select(2)   // bread in hand (the sword comes out at the door)

    // L01: 10 blocks east of the tree, looking west: the zombies packed in its shade, an arm out in the sun, smoking;
    // the lever post beyond, the low sun over Grandpa's cottage on the rise
    await cut(TREE[0] + 7.5, TREE[1] + 1.5, TRUNK)
    const arm = zs[3]
    await K.preroll(6, () => {})
    await line('L01', async (k) => {
      if (k > 6 && k < 30) { arm.x = TREE[0] + 2.2 + 0.03 * Math.min(k - 6, 14) }   // a step toward the sun...
      if (k >= 30) arm.x = Math.max(TREE[0] + 2.2, arm.x - 0.06)                       // ...and back into the shade
      if (k > 12 && k < 40 && k % 2 === 0) ctx.particles('smoke', P(arm.x + 0.6, arm.y + 1.4, arm.z), { count: 2 })
      K.base = K.aim(P(TREE[0] - 4, tg + 1.8, TREE[1] + 0.2)); look(k, 0, -0.03 * K.ease(k / 50))
    })

    // L02: nobody has slept; the farmer keeps walking into his own fence (Gary at his field, bump, back, bump)
    await cut(FIELD[0] - 6.5, 32.5, K.face(P(FIELD[0] - 0.8, gy(FIELD[0] - 0.8, 28.5), 28.5), 'villager'))
    await line('L02', async (k) => {
      const ph2 = (k % 24) / 24
      gary.x = FIELD[0] - 1.4 + 0.75 * Math.sin(ph2 * Math.PI)   // up to the fence, back
      gary.yaw = -90
      if (k % 24 === 12) ctx.sound('block.wood.hit', 0.6, 1.2)
      look(k)
    })

    // L03: and the zombies have been hiding under one tree the whole time (from the village side, the sea behind)
    await cut(TREE[0] - 11, TREE[1] + 3, TRUNK)
    await line('L03', async (k) => {
      if (k % 30 === 5) ctx.sound('entity.zombie.ambient', 0.6, 0.9)
      for (const [i, z] of zs.entries()) z.yaw = -90 + Math.sin((ctx.tick + i * 9) / 11) * 25
      look(k)
    })

    // L04-L05: every day Grandpa asks me the same thing (at his door, on the porch)
    const gpFace = () => P(gp.x, gp.y + 1.55, gp.z)
    await cut(step0.x + 1.6, step0.z + 0.3, gpFace())
    await line('L04', async (k) => { gp.yaw = 90; look(k) })
    await line('L05', async (k) => { gp.yaw = 90; gp.pitch = k % 30 < 10 ? 8 : 0; look(k) })

    // L06: and every day I tell him, not yet (he turns and shuffles back to the door)
    await cut(step0.x + 1.0, step0.z - 0.3, gpFace())
    await line('L06', async (k, at) => {
      if (k >= at(2) - 4) walk(gp, -0.025, 0)
      K.base = K.aim(K.face(P(gp.x, gp.y, gp.z), 'villager')); look(k)
    })
    // L07: everyone thinks it's a curse (the square: villagers staring up at the sun, faces lit from the west)
    await cutP(-11.5, 0.5, P(-5.8, gy(-5.8, 0) + 1.4, 0), () => Object.assign(gp, { x: HOME.x, z: HOME.z, y: HOME.y, yaw: 90 }))
    await line('L07', async (k) => {
      for (const [i, g] of gaze.entries()) { g.yaw = 90 + Math.sin((ctx.tick + i * 7) / 15) * 8; g.pitch = -40 }
      look(k)
    })
    // L08: it's a LEVER. And I pulled it (a slow push onto the lever on its post; it's ON)
    const LV = P(LEVER[0] + 0.5, LEVER[1] + 0.2, LEVER[2] + 0.5)
    await cut(LEVER[0] + 6.5, LEVER[2] + 0.5, LV)
    await line('L08', async (k) => { K.go(k > 3 && k < 13); K.base = K.aim(LV); look(k)   // a few steps up to it
      for (const [i, g] of gaze.entries()) { g.yaw = 90 + Math.sin((ctx.tick + i * 7) / 9) * 20; g.pitch = -40 }   // the villagers behind it still staring up at the sun
    })
    K.go(false)

    // L09: because at night the zombies come out (the tree, close: the shade full of them), and Grandpa is way too slow
    // to run (cut to the square: him crossing it at an old man's shuffle)
    await cut(TREE[0] - 8, TREE[1] + 4, P(TREE[0] - 1, tg + 1.6, TREE[1]))
    let c9 = false
    await line('L09', async (k, at) => {
      if (!c9 && k >= at.cut(2)) { c9 = true; await cutP(-7.5, 4.5, K.face(P(-1.5, gy(-1.5, 6), 6), 'villager'), () => Object.assign(gp, { x: -1.5, z: 6.0, y: gy(-1.5, 6), yaw: -90 })) }
      if (c9) { walk(gp, 0.025, 0); K.base = K.aim(K.face(P(gp.x, gp.y, gp.z), 'villager')) }
      else for (const [i, z] of zs.entries()) z.yaw = -90 + Math.sin((ctx.tick + i * 9) / 11) * 25
      look(k)
    })
    // L10: me? I haven't slept in 300 days either (in Grandpa's cottage: the white bed in my hand, his red bed made)
    ctx.select(3)
    const IN = rel(this.inside)
    await K.cutShot('pov', () => Object.assign(gp, { x: HOME.x, z: HOME.z, y: HOME.y, yaw: 90 }), { self: { x: IN.x, y: IN.y, z: IN.z, yaw: 180 - K.aimFrom(new ctx.Vec3(X + IN.x, F + IN.y + 1.62, Z + IN.z), P(bedA.x, bedA.y + 0.4, bedA.z)).yaw * 180 / Math.PI, pitch: 25 } })
    K.base = K.aimFrom(new ctx.Vec3(X + IN.x, F + IN.y + 1.62, Z + IN.z), P(bedA.x, bedA.y + 0.4, bedA.z)); await K.look(0)
    await line('L10', async (k) => { K.base = { yaw: K.base.yaw + 0.009, pitch: K.base.pitch - 0.002 }; look(k) })   // a slow pan across the room

    // L11-L12: but today Grandpa said: let the night come; you need sleep, kid (at his door, close)
    ctx.select(2)
    await cut(step0.x + 0.4, step0.z + 0.2, gpFace())
    await line('L11', async (k) => { gp.yaw = 90 + 18 * Math.sin(ctx.tick / 8); gp.pitch = 4 * Math.sin(ctx.tick / 5); look(k) })
    await line('L12', async (k) => { gp.yaw = 90 + 12 * Math.sin(ctx.tick / 9); gp.pitch = k % 20 < 7 ? 14 : 0; look(k) })   // he nods at me

    // L13: me? HE's the one who's tired (he looks at the lever post, then turns to go in)
    await cut(step0.x + 1.5, step0.z + 0.6, gpFace())
    await line('L13', async (k) => {
      const u = K.ease(k / 20)
      gp.yaw = 90 + 50 * u                                  // a look toward the square and the lever
      look(k)
    })
    // L14: so I walked him home (in through his door); then I pulled the lever BACK
    let leverCut = false, pulled = false, leverDone = false
    await line('L14', async (k, at) => {
      if (!leverCut) {
        gp.yaw = -90
        if (gp.x > door.x - 0.5) walk(gp, -0.06, 0)
        K.base = K.aim(P(gp.x - 0.5, gp.y + 1.4, gp.z))
      }
      if (!leverCut && k >= at.cut(2)) {
        leverCut = true
        await cutP(LEVER[0] + 3.3, LEVER[2] + 0.7, LV, () => away('gp', gp))
      }
      if (leverDone) { K.base = K.aim(LV); look(k); return }   // pulled: the camera breathes again
      if (leverCut) {   // K.use turns the view onto the lever and clicks it (on BACK): no look() of ours from the cut on
        if (pulled || k < at(3) - 8) return
        pulled = true
        K.use(new ctx.Vec3(X + LEVER[0], F + LEVER[1], Z + LEVER[2]), { max: 60, deg: 3 }).then(() => { ctx.mark('lever'); leverDone = true }).catch(e => ctx.log('lever', e.message))
      }
      look(k)
    })

    // L15: the sun went down (from east of the tree, looking west: the sun sinks behind the cottage, fast); the zombies
    // came out (they walk out of the shade); so I stood guard at his door (POV at the gate, the sword out, night)
    await cut(37.5, 3.5, P(-8, gy(-8, 0) + 6, 0))
    let guard = false
    await line('L15', async (k, at, n) => {
      if (!guard) {
        const u = Math.min(1, k / Math.max(1, at.cut(4) - 2))
        K.setTime(DAY + (NIGHT - DAY) * K.ease(u))
        if (k === Math.round(at(1))) ctx.mark('dusk')
        if (k >= at(2) - 4) for (const [i, z] of zs.entries()) walk(z, 0.07 + i * 0.006, (i - 3) * 0.01)
      }
      if (!guard && k >= at.cut(4)) {
        guard = true
        ctx.select(0)
        await cutP(gate.x + 1.2, gate.z, P(gate.x + 12, gy(gate.x + 12, gate.z) + 1.4, gate.z),
          () => { for (const [i, z] of zs.entries()) { Object.assign(z, { x: gate.x + 9 + (i % 3) * 1.3, z: gate.z - 2.5 + (i % 4) * 1.5, yaw: 90 }); z.y = gy(z.x, z.z) } })
      }
      if (guard) for (const z of zs) if (z.x > gate.x + 3.2) walk(z, -0.03, 0)
      look(k)
    })
    // L16: then something screamed up in the sky (a screech; the view tips up: phantoms circling over the roof)
    const C = { x: gate.x + 3, y: gy(gate.x + 3, gate.z) + 5.5, z: gate.z }
    const circle = (t) => ph.forEach((p, i) => {
      const a = t / 28 + i * Math.PI / 3
      Object.assign(p, { x: C.x + Math.cos(a) * 3.5, y: C.y + Math.sin(t / 9 + i) * 0.8, z: C.z + Math.sin(a) * 3.5, yaw: K.mcYaw(-Math.sin(a), Math.cos(a)) })
    })
    circle(0); ph.forEach((p, i) => K.warp(`ph${i}`))
    say('/execute as @e[tag=ph] run data merge entity @s {Fire:-1s}')   // no flames (they never saw the sun)
    let from16 = null
    await line('L16', async (k, at) => {
      circle(k)
      if (k === at(1) - 2) ctx.sound('entity.phantom.ambient', 1.4, 0.9)
      for (const z of zs) if (z.x > gate.x + 3.2) walk(z, -0.02, 0)
      if (k >= at(1)) { from16 = from16 || { ...K.base }; K.turnTo(from16, P(ph[0].x, ph[0].y + 0.3, ph[0].z), Math.min(1, (k - at(1)) / 18)) }
      look(k)
    })
    // the end: one dives; two hits; slain by Phantom
    const diver = ph[0]
    for (let i = 0; i < 40 && !ctx.died; i++) {
      circle(40 + i)
      if (i >= 4) {   // the dive: straight at my face
        const me = bot.entity.position
        const tx = me.x - X, ty = me.y - F + 1.2, tz = me.z - Z
        Object.assign(diver, { x: diver.x + (tx - diver.x) * 0.22, y: diver.y + (ty - diver.y) * 0.22, z: diver.z + (tz - diver.z) * 0.22, yaw: K.mcYaw(tx - diver.x, tz - diver.z) })
        if (i === 4) ctx.sound('entity.phantom.swoop', 1.5, 1)
      }
      K.base = K.aim(P(diver.x, diver.y + 0.2, diver.z))
      if (i === 14) say(`/damage @s 12 minecraft:mob_attack by @e[tag=ph0,limit=1]`)
      if (i === 24) { ctx.mark('death'); say(`/damage @s 12 minecraft:mob_attack by @e[tag=ph0,limit=1]`) }
      look(i)
      await bot.waitForTicks(1)
    }
    for (let i = 0; i < 30; i++) await bot.waitForTicks(1)
    ctx.mark('story_end')
    return ctx.died
  }
}

// The ground's top solid block at (x, z), ignoring plants, crops, leaves, logs, fences and lanterns (story_good_boy's)
function groundAt (ctx, x, z) {
  const { bot } = ctx
  for (let y = 110; y > 40; y--) {
    const b = bot.blockAt(new ctx.Vec3(Math.floor(x), y, Math.floor(z)))
    if (!b) continue
    const low = y < F + 3   // a porch floor, a step or a path slab is ground; a roof (higher) is not
    if ((b.boundingBox !== 'block' && !(low && /_slab$|_stairs$/.test(b.name))) || (!low && /_slab$|_stairs$|planks$/.test(b.name)) || /_leaves$|_log$|fence|lantern|campfire|^barrier$/.test(b.name)) { if (b.name === 'farmland' || b.name === 'dirt_path') return y; continue }
    return y
  }
  return 68
}
