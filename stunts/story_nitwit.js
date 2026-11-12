// Story Short "the nitwit finally said something 😳" (stories/nitwit, v2: Pip's voice, the owner's notes 2026-11-10).
// The village nitwit only ever says "hmm" (a HMMS meter: 4,096). He always stands where something bad is about
// to happen: under the tree before lightning splits it, in the wheat before a creeper blows it up, at the well
// before it turns to lava, on my roof before it rains anvils; the villagers walk away from him and even the golem goes
// around him. One night I follow him past the last torch to another village: mine, burned and empty. He's from a
// world that already ended, sent back to warn this one, and "hmm" is all the game lets a nitwit say. Today he's
// standing right next to ME. He says my name, then the date of the end: today.
//
// r2 (owner: "not superflat world"): the canonical places on the seed's own terrain (docs/world/map.json, day 470):
// Fernbank by the North Inlet (the well, the home cottage, the church, the river), the road south past the last
// torch, and the Burned Copy on its knoll. world.build puts them; the story adds only its props (the tree, the wheat,
// the ruin's dead tree and crater). O = (X, F, Z) = Fernbank's well (the canonical origin), F its ground (64); every
// spot off the plaza reads its own ground height (gy), so the cast and the camera stand on the real slopes.
const path = require('path')
const world = require('../lib/world')
const { storyLines, storyKit, setKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'nitwit')
const CAPTION = 'the nitwit finally said something 😳'
const DAY = 6000, NIGHT = 14500   // 14500: dark, but the ruin still reads
const X = -380, Z = -1030, F = 64  // Fernbank's well (map.json fernbank.at)
// story-relative spots (dx, dz from the well)
const ROOF = [-15.5, 12, -22]      // the home cottage's ridge (y 75): the nitwit's feet at 76
const TREE = [28, 14]              // the lone oak east of the church lane (story prop)
const WHEAT = [-33, -16, -24, -6]  // the wheat by the river, west of the plaza: x0, z0, x1, z1
const RUIN = [-60, 112]            // the Burned Copy's lane (the burned house at -455,-918, its well at -440,-903)

module.exports = {
  name: 'story_nitwit',
  caption: CAPTION,
  time: DAY,
  edit: {
    caption: CAPTION, red: 'nitwit', story: 'stories/nitwit', startAt: 'line:0',
    endAfter: 'today_word:1.2',   // settle-ok: the last blast (L05's creeper) is 20 s before the end; the ending is lightning (no debris); 0.75 s after TODAY (r:r188b46)
    punch: ['name_word', 'today_word'],
    cards: [['hmm', 'HMM.', 0.9, 'white']]
  },
  hideHand: true,
  botTimeout: 600,
  brightness: 1.0,
  renderDistance: 12, recordRadius: 150,
  look: { mood: 'bright', rolloff: 0.8 },
  shots: { pov: { pov: true } },   // every shot is first-person; K.cutShot('pov') places the cast with the cut
  chunkStops (set) { return [[0, 0], [-40, 60], [-60, 110], [30, 10], [-30, -20]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },

  async setup (ctx) {
    const { bot } = ctx
    const { c, A, mob, vil } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    for (const g of ['log_admin_commands false', 'random_tick_speed 0', 'mob_griefing true', 'fire_spread_radius_around_player 0', 'block_drops false']) await c(`/gamerule ${g}`)
    await c('/difficulty normal')
    await c(`/setworldspawn ${X} ${F + 1} ${Z + 8}`)
    const W = await world.build(ctx, { story: 'nitwit' })
    ctx.log(`fernbank: ${JSON.stringify(W.places.fernbank.origin)}; burned_copy ${JSON.stringify(W.places.burned_copy.origin)}`)
    await c(`/kill @e[type=!player,x=${X},y=${F},z=${Z + 40},distance=..140]`)
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz)

    // the tree (L04), built by hand so the split is known: trunk 1-6 over its own ground, a leaf crown 4-8
    { const g = gy(TREE[0], TREE[1]) - F
      await c(`/fill ${A(TREE[0] - 2, g + 4, TREE[1] - 2)} ${A(TREE[0] + 2, g + 5, TREE[1] + 2)} oak_leaves[persistent=true]`)
      await c(`/fill ${A(TREE[0] - 1, g + 6, TREE[1] - 1)} ${A(TREE[0] + 1, g + 7, TREE[1] + 1)} oak_leaves[persistent=true]`)
      await c(`/fill ${A(TREE[0], g + 1, TREE[1])} ${A(TREE[0], g + 6, TREE[1])} oak_log`)
      this.treeY = g }
    // the wheat (L05): farmland on each column's own ground, a water row down the middle, ripe wheat
    for (let x = WHEAT[0]; x <= WHEAT[2]; x++) {
      for (let z = WHEAT[1]; z <= WHEAT[3]; z++) {
        const g = gy(x, z) - F
        await c(`/setblock ${A(x, g + 1, z)} air`)
        if (x === -29) { await c(`/setblock ${A(x, g, z)} water`); continue }
        await c(`/setblock ${A(x, g, z)} farmland[moisture=7]`)
        if (!(x === -26 && z > -13 && z < -9)) await c(`/setblock ${A(x, g + 1, z)} wheat[age=7]`)   // where he stands: trodden clear
      }
    }
    // the roof shots' camera spots in the plaza: the tall plants cut (they filled the lens)
    for (const b of ['tall_grass', 'short_grass', 'large_fern', 'fern', 'sugar_cane']) await c(`/fill ${A(-14, -1, -7)} ${A(-6, 4, 3)} air replace ${b}`)
    // the road south (L10): the last torch is canon (map.json fernbank stamp); two more torches on posts before it
    for (const [dx, dz] of [[-24, 40], [-29, 48]]) { const g = gy(dx, dz) - F; await c(`/setblock ${A(dx, g + 1, dz)} oak_fence`); await c(`/setblock ${A(dx, g + 2, dz)} torch`) }
    // the ruin's story props: a split, charred tree, a crater where the wheat was, fires still smouldering
    { const [tx, tz] = [RUIN[0] + 16, RUIN[1] - 10]; const g = gy(tx, tz) - F
      await c(`/fill ${A(tx, g + 1, tz)} ${A(tx, g + 4, tz)} stripped_dark_oak_log`)
      await c(`/setblock ${A(tx - 1, g + 4, tz)} stripped_dark_oak_log[axis=x]`); await c(`/setblock ${A(tx + 1, g + 3, tz)} stripped_dark_oak_log[axis=x]`)
      this.deadTree = [tx, g, tz] }
    { const [cx, cz] = [RUIN[0] - 20, RUIN[1] + 4]; const g = gy(cx, cz) - F
      await c(`/fill ${A(cx - 3, g - 1, cz - 3)} ${A(cx + 3, g + 3, cz + 3)} air`)
      await c(`/fill ${A(cx - 2, g - 2, cz - 2)} ${A(cx + 2, g - 2, cz + 2)} netherrack`)
      await c(`/fill ${A(cx - 3, g - 1, cz - 3)} ${A(cx + 3, g - 1, cz + 3)} coarse_dirt replace grass_block`)
      this.crater = [cx, g - 1, cz] }
    for (const [dx, dz] of [[-71, 108], [-66, 117], [-55, 104], [-75, 126], [-48, 118]]) { const g = gy(dx, dz) - F; await c(`/setblock ${A(dx, g + 1, dz)} campfire[lit=true]`) }
    for (const [dx, dz] of [[-62, 100], [-52, 125], [-69, 121], [-58, 132]]) { const g = gy(dx, dz) - F; await c(`/setblock ${A(dx, g + 1, dz)} dead_bush`) }

    // --- the cast (NoAI, tagged per scene). The nitwit has a twin at every place he stands, so no one hops
    const at = (dx, dz, dy = 1) => ({ x: dx, z: dz, y: gy(dx, dz) - F + dy })
    const V = (p, yaw, prof, tags, o = {}) => vil(p.x, p.z, yaw, prof, tags, { y: p.y, ...o })
    await V(at(0.5, 7.5), 90, 'nitwit', ['nS'])
    await vil(ROOF[0], ROOF[2], 90, 'nitwit', ['nRoof', 'warm'], { y: ROOF[1] })
    await V(at(TREE[0] - 0.5, TREE[1] - 1.8), 0, 'nitwit', ['nTree', 'warm'])
    await V(at(-25.5, -11.5), -45, 'nitwit', ['nWheat', 'warm'])
    await V(at(-3.5, 0.5), -90, 'nitwit', ['nWell', 'warm'])
    await V(at(-22.5, 38.5), 160, 'nitwit', ['nPath'])
    await V(at(RUIN[0], RUIN[1]), 180, 'nitwit', ['nRuin'])
    const crowd = [['farmer', -0.8, 13.5, 160], ['librarian', 1.6, 15.0, -170], ['fisherman', -1.4, 16.5, 20], ['butcher', 0.9, 18.0, 135], ['cleric', 2.2, 13.0, 60]]
    for (let i = 0; i < crowd.length; i++) await V(at(crowd[i][1], crowd[i][2]), crowd[i][3], crowd[i][0], [`v${i}`])
    { const p = at(0.5, 26.5); await mob('iron_golem', p.x, p.y, p.z, 180, ['golem']) }
    { const p = at(-37.5, -10.5); await mob('creeper', p.x, p.y + 60, p.z, -90, ['creeper']) }
    this.crowd = crowd.map(v => [v[0], v[1], v[2], v[3], gy(v[1], v[2]) - F + 1])

    await c('/clear @s')
    await ctx.tpCheck(X + 0.5, gy(0.5, 13.5) + 1, Z + 13.5, 180, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await c('/effect give @s minecraft:resistance infinite 4 true')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, look, line } = K
    const say = K.say
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz) - F + 1          // feet height (from F) of the ground at a spot
    const cut = (dx, dz, target, o = {}) => K.cut(dx, dz, target, gy(dx, dz), o)
    const hmm = (vol = 1) => ctx.sound('entity.villager.ambient', vol, 1)
    const away = (tag, a) => { a.y = 90; K.warp(tag) }   // off screen (90 up): only inside a cut's moves
    // walk on the real ground: the feet ease up or down a step (a whole block in one tick read as a jump)
    const walk = (a, dx, dz) => { K.step(a, dx, dz); const g = gy(a.x, a.z); a.y += Math.max(-0.25, Math.min(0.25, g - a.y)) }
    const face = (a, type = 'villager') => K.face(P(a.x, a.y, a.z), type)
    // a cut that moves the cast with it (K.cutShot: the shot mark waits until every moved actor and the narrator have
    // landed, so the new shot's first frame already has them in place)
    const cutP = async (dx, dz, target, moves, o = {}) => {
      const y = gy(dx, dz)
      const nb = K.aimFrom(new ctx.Vec3(X + dx, F + y + 1.62, Z + dz), target)
      K.stop()
      await K.cutShot('pov', moves, { ...o, self: { x: dx, y, z: dz, yaw: 180 - nb.yaw * 180 / Math.PI, pitch: -nb.pitch * 180 / Math.PI } })
      K.base = nb
      await K.look(0)
    }
    const bolt = (x, y, z) => {
      ctx.mark('lightning', { x: X + x, y: F + y, z: Z + z })
      ctx.sound('entity.lightning_bolt.thunder', 2, 0.9)
      ctx.sound('entity.lightning_bolt.impact', 1.5, 1)
    }
    const boom = (x, y, z) => say(`/summon tnt ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {fuse:0s}`)

    const nS = K.actor('nS', { x: 0.5, y: gy(0.5, 7.5), z: 7.5, yaw: 90 })
    const crowd = this.crowd.map((v, i) => K.actor(`v${i}`, { x: v[1], y: v[4], z: v[2], yaw: v[3] }))
    const creeper = K.actor('creeper', { x: -37.5, y: gy(-37.5, -10.5) + 60, z: -10.5, yaw: -90 })   // waiting in the air (where setup put it)
    let meter = 4093
    K.setMeter(meter)

    // L01: the hook. The nitwit by the well, head bobbing on each "hmm", the counter ticking up to 4,096; behind him
    // the well's roof and the home cottage, the river beyond
    await cut(0.5, 14.5, face(nS))
    await K.preroll(6, () => { nS.yaw = 90 + Math.sin(ctx.tick / 6) * 25 })
    await line('L01', async (k, at) => {
      nS.yaw = 90 + Math.sin(ctx.tick / 6) * 25
      nS.pitch = k % 20 < 6 ? 20 : 0
      if (k === 1 || k === at(2) || k === at(3)) { hmm(); K.setMeter(++meter) }
      K.go(k > 2 && k < 14)
      K.base = K.aim(face(nS)); look(k)
    })
    K.go(false)
    if (meter < 4096) K.setMeter(meter = 4096)

    // L02: closer. He turns his head to me on "my NAME"
    await cut(0.5, 10.6, face(nS))
    await line('L02', async (k, at) => {
      const u = K.ease((k - at(2) + 6) / 8)
      nS.yaw = 90 - 90 * u; nS.pitch = 0                  // west -> south (facing me)
      if (k === at(2)) { ctx.mark('name_word'); ctx.sound('entity.villager.yes', 1, 0.8) }
      look(k)
    })

    // L03: always somewhere weird: up on my roof's ridge (from the front garden, a tilt up)
    const nRoof = K.actor('nRoof', { x: ROOF[0], y: ROOF[1], z: ROOF[2], yaw: 90 })
    await cut(-12.5, 1.5, face(nRoof))
    await line('L03', async (k, at) => {
      if (k === at(3)) hmm(0.6)
      nRoof.yaw = 90 + Math.sin(ctx.tick / 6) * 35; nRoof.pitch = k >= at(3) ? 25 : 0
      K.go(k > 2 && k < 34)   // a few steps across the plaza toward the cottage
      K.base = K.aim(face(nRoof)); look(k)
    })
    K.go(false)

    // L04: under a tree (day); that night lightning splits it
    const tg = this.treeY
    const nTree = K.actor('nTree', { x: TREE[0] - 0.5, y: gy(TREE[0] - 0.5, TREE[1] - 1.8), z: TREE[1] - 1.8, yaw: 0 })
    await cut(TREE[0] + 1.5, TREE[1] - 11, P(TREE[0], tg + 4, TREE[1]))
    let night4 = false, struck = false
    await line('L04', async (k, at) => {
      if (k === 12) { Object.assign(nS, { x: 3.5, z: 16.0, y: gy(3.5, 16), yaw: 45 }); K.warp('nS') }   // off screen (behind the camera): to the crowd's end of the lane
      if (!night4 && k >= at.cut(1)) { night4 = true; await cut(TREE[0] + 4, TREE[1] - 9, P(TREE[0], tg + 4.5, TREE[1]), { time: NIGHT }) }
      if (!struck && k >= at(2)) {
        struck = true
        bolt(TREE[0] + 0.5, tg + 7, TREE[1] + 0.5)
        say(`/fill ${X + TREE[0] - 2} ${F + tg + 4} ${Z + TREE[1] - 2} ${X + TREE[0] + 2} ${F + tg + 7} ${Z + TREE[1] + 2} air`)
        say(`/fill ${X + TREE[0]} ${F + tg + 4} ${Z + TREE[1]} ${X + TREE[0]} ${F + tg + 6} ${Z + TREE[1]} air`)
        say(`/setblock ${X + TREE[0] + 1} ${F + tg + 1} ${Z + TREE[1]} oak_log[axis=x]`); say(`/setblock ${X + TREE[0] + 2} ${F + tg + 1} ${Z + TREE[1]} oak_log[axis=x]`)
        say(`/setblock ${X + TREE[0] - 1} ${F + tg + 1} ${Z + TREE[1]} campfire[lit=true]`)
      }
      if (struck && k % 3 === 0) ctx.particles('smoke', P(TREE[0] + 0.5 + (Math.random() - 0.5), tg + 3.5, TREE[1] + 0.5 + (Math.random() - 0.5)))
      K.go(k > 2 && k < 24)
      look(k)
    })
    K.go(false)

    // L05: in the wheat by the river; a creeper walks in and BOOM (day again on the cut)
    const nWheat = K.actor('nWheat', { x: -25.5, y: gy(-25.5, -11.5), z: -11.5, yaw: -45 })
    await cut(-17.5, -9.5, face(nWheat), { time: DAY })
    let boomed = false, cut5 = false
    await line('L05', async (k, at) => {
      nWheat.yaw = -45 + Math.sin(ctx.tick / 7) * 20
      if (!cut5 && k >= at.cut(1)) {
        cut5 = true
        await cutP(-18.5, -8.0, P(-30, gy(-30, -10) + 0.9, -10.5), () => { Object.assign(creeper, { x: -34.5, y: gy(-34.5, -10.5) }); away('nWheat', nWheat) })
      }
      if (cut5 && !boomed) walk(creeper, 0.11, -0.01)
      if (!boomed && k >= at(3) - 2) {
        boomed = true
        // the creeper blows itself up (lit, no fuse): vanilla discards it in its own blast, no death animation
        K.actors.delete('creeper'); say('/data merge entity @e[tag=creeper,limit=1] {ignited:1b,Fuse:0s,ExplosionRadius:3b}')
        ctx.mark('flash')
      }
      look(k)
    })

    // L06: by the well; the water turned to lava (at the rim, looking down in; the well's lantern lights it)
    const nWell = K.actor('nWell', { x: -3.5, y: gy(-3.5, 0.5), z: 0.5, yaw: -90, pitch: 40 })
    await cut(3.6, 0.5, P(-0.8, 1.1, 0.5))
    let lava = false
    await line('L06', async (k, at) => {
      nWell.pitch = 40 + Math.sin(ctx.tick / 5) * 8
      if (!lava && k >= at(3)) {
        lava = true
        say(`/fill ${X - 2} ${F - 1} ${Z - 1} ${X} ${F} ${Z + 1} air replace water`)
        say(`/fill ${X - 2} ${F - 1} ${Z - 1} ${X} ${F} ${Z + 1} lava replace air`)
        ctx.sound('item.bucket.empty_lava', 1, 1); ctx.sound('block.lava.pop', 1, 1)
      }
      look(k, 0, -0.06 * K.ease(k / 20))
    })

    // L07: on MY roof; the next day it rained anvils
    await cutP(-10.5, -0.5, face(nRoof), () => away('nWell', nWell))
    let next7 = false, rained = 0
    const anvil = (x, z) => say(`/summon falling_block ${(X + x).toFixed(2)} ${F + ROOF[1] + 12} ${(Z + z).toFixed(2)} {BlockState:{Name:"minecraft:anvil"},Time:1,DropItem:0b}`)
    const drops = [[-15.5, -22.5], [-17.5, -21.5], [-13.5, -23.5], [-19.5, -22.5], [-12.5, -21.5], [-16.5, -23.5], [-14.0, -21.0], [-18.5, -23.0], [-11.5, -22.5], [-20.5, -21.5]]
    await line('L07', async (k, at) => {
      nRoof.yaw = 90 + Math.sin(ctx.tick / 9) * 30
      if (!next7 && k >= at.cut(1)) { next7 = true; await cutP(-8.5, -4.0, P(ROOF[0] - 0.5, ROOF[1] - 1.5, ROOF[2]), () => away('nRoof', nRoof)) }
      if (next7 && k >= at(2) - 6 && rained < drops.length && (k - at(2)) % 2 === 0) { anvil(...drops[rained]); rained++ }
      look(k)
    })

    // L08: the villagers walk away when he comes (down the lane south of the well)
    await cutP(-4.5, 5.0, P(0.5, gy(0.5, 13) + 1.2, 13), () => { Object.assign(nS, { x: 0.5, z: 8.5, y: gy(0.5, 8.5), yaw: 0 }) })
    await line('L08', async (k, at) => {
      if (nS.z < 11.5) walk(nS, 0, 0.07)
      if (k >= at(2)) {
        for (const v of crowd) {
          const dx = v.x - nS.x, dz = v.z - nS.z, d = Math.hypot(dx, dz) || 1
          walk(v, dx / d * 0.1, dz / d * 0.1)
        }
      }
      K.base = K.aim(P(0.5, gy(0.5, Math.max(13, nS.z + 2)) + 1.3, Math.max(13, nS.z + 2))); look(k)
    })

    // L09: even the iron golem goes around him (up the lane toward me, an arc round the nitwit)
    // from the south looking north: the well's roof, the home cottage and the river beyond; the golem comes up the
    // lane east of the well and bends round him
    const golem = K.actor('golem', { x: 4.5, y: gy(4.5, 6.5), z: 6.5, yaw: 0 })
    await cutP(2.5, 23.5, K.face(P(4.5, gy(4.5, 4), 4), 'iron_golem'), () => { Object.assign(nS, { x: 4.0, z: 11.5, y: gy(4.0, 11.5), yaw: 180 }) })
    await line('L09', async (k) => {
      const nz = golem.z + 0.14
      const nx = 4.5 + 2.6 * Math.exp(-Math.pow((nz - nS.z) / 3.2, 2))
      walk(golem, nx - golem.x, nz - golem.z)
      nS.yaw = K.mcYaw(golem.x - nS.x, golem.z - nS.z)
      K.base = K.aim(K.face(P(golem.x, golem.y, golem.z), 'iron_golem')); look(k)
    })

    // L10: so one night, I followed him (down the road south, behind him, the torches on their posts)
    const nPath = K.actor('nPath', { x: -22.5, y: gy(-22.5, 38.5), z: 38.5, yaw: 160 })
    const ahead = () => P(nPath.x - 1.0, nPath.y + 1.4, nPath.z + 3)
    await cut(-21.0, 32.5, ahead(), { time: NIGHT })
    const pathStep = () => walk(nPath, -0.045, 0.115)
    await line('L10', async (k) => {
      if (k === 12) { away('golem', golem); Object.assign(nS, { x: 0.5, z: 9.5, y: gy(0.5, 9.5), yaw: 0, pitch: 0 }); K.warp('nS') }   // both off screen: back in the village, 30+ blocks behind
      pathStep()
      K.base = K.aim(ahead()); look(k)
    })
    // L11: past the last torch was ANOTHER village (cut: the Burned Copy's lane, him walking into it)
    let ruinCut = false
    const nRuin = K.actor('nRuin', { x: RUIN[0], y: gy(RUIN[0], RUIN[1]), z: RUIN[1], yaw: 180 })
    await line('L11', async (k, at) => {
      if (!ruinCut) { pathStep(); K.base = K.aim(ahead()) }
      if (!ruinCut && k >= at.cut(2)) {
        ruinCut = true
        await cutP(RUIN[0] + 0.5, RUIN[1] - 5, P(RUIN[0], gy(RUIN[0], RUIN[1] + 14) + 1.0, RUIN[1] + 14), () => away('nPath', nPath))
      }
      if (ruinCut) walk(nRuin, 0, 0.1)
      look(k)
    })
    K.go(false)

    // L12: MY village. BURNED. EMPTY. (jump cuts on each word: the knoll over the ruin, the burned house, the lane)
    const knoll = [RUIN[0] + 30, RUIN[1] - 12]
    await K.cutTo(knoll[0], F + gy(knoll[0], knoll[1]) + 1, knoll[1], P(RUIN[0] - 6, gy(RUIN[0] - 6, RUIN[1] + 4) + 1, RUIN[1] + 4))
    let c12 = 0
    await line('L12', async (k, at) => {
      if (c12 === 0 && k >= at.cut(1)) { c12 = 1; await cut(RUIN[0] - 3, RUIN[1] - 7, P(-455 - X, gy(-455 - X, -918 - Z) + 2, -918 - Z)) }
      if (c12 === 1 && k >= at.cut(2)) { c12 = 2; await cutP(RUIN[0] + 4, RUIN[1] + 2, P(RUIN[0] - 10, gy(RUIN[0] - 10, RUIN[1] + 18) + 1, RUIN[1] + 18), () => away('nRuin', nRuin)) }
      look(k)
    })

    // L13: the tree, the wheat, the well: all gone (each place he stood, already destroyed here)
    const [tx, ty, tz] = this.deadTree, [cx, cy, cz] = this.crater
    await cutP(tx - 5, tz - 4, P(tx, ty + 2.5, tz), () => Object.assign(nRuin, { x: RUIN[0], z: RUIN[1] + 6, y: gy(RUIN[0], RUIN[1] + 6), yaw: 0 }))
    let c13 = 0
    await line('L13', async (k, at) => {
      if (c13 === 0 && k >= at.cut(1)) { c13 = 1; await cut(cx + 6, cz - 5, P(cx, cy, cz)) }
      if (c13 === 1 && k >= at.cut(2)) { c13 = 2; await cut(-440 - X + 4, -903 - Z - 5, P(-440 - X, gy(-440 - X, -903 - Z) - 0.5, -903 - Z)) }
      look(k)
    })

    // L14: he's not from here; his world already ended (he turns to me; a bolt behind him on "ENDED")
    await cut(RUIN[0], RUIN[1] + 1.5, face(nRuin))
    let b14 = false
    await line('L14', async (k, at) => {
      nRuin.yaw = 180 * K.ease((k - at(1) + 4) / 10)
      if (!b14 && k >= at(3)) { b14 = true; bolt(RUIN[0] - 6, gy(RUIN[0] - 6, RUIN[1] + 20) + 8, RUIN[1] + 20) }
      look(k)
    })

    // L15: they sent him back to warn us (behind him, looking north up the road to our village's torches)
    // behind him as he walks off east, up toward the hills between the ruin and our village
    await cutP(RUIN[0] - 4.5, RUIN[1] + 9, P(RUIN[0] + 22, gy(RUIN[0] + 22, RUIN[1] - 6) + 3, RUIN[1] - 6), () => Object.assign(nRuin, { x: RUIN[0] - 1.5, z: RUIN[1] + 6, y: gy(RUIN[0] - 1.5, RUIN[1] + 6), yaw: -110 }))
    await line('L15', async (k, at) => {
      if (k >= at(1) - 4) walk(nRuin, 0.085, -0.035)
      look(k)
    })

    // L16: but a nitwit can only say one word (day, his face by the well). The word: "hmm", with the card
    await cut(0.5, 11.7, K.face(P(0.5, gy(0.5, 9.5), 9.5), 'villager'), { time: DAY })
    let said = false
    await line('L16', async (k, at, n) => {
      if (!said && k >= n - 14) { said = true; hmm(1.2); ctx.mark('hmm'); K.setMeter(4097) }
      nS.pitch = said ? 18 : 6 * Math.sin(ctx.tick / 6); nS.yaw = 22 * Math.sin(ctx.tick / 9)   // he looks me over
      look(k)
    })

    // L17: and today, he's standing right next to ME (looking down the lane, then turn: he's right there)
    let from17 = null
    await cutP(-0.9, 12.6, P(-0.9, gy(-0.9, 22) + 1.2, 22), () => { nS.yaw = -90; for (const [i, v] of crowd.entries()) Object.assign(v, { z: 22 + i, y: gy(v.x, 22 + i) }) })
    await line('L17', async (k, at) => {
      for (const v of crowd) if (v.z < 30) walk(v, 0, 0.03)
      nS.yaw = -90 + 20 * Math.sin(ctx.tick / 8)
      if (k >= at(2) - 2) { from17 = from17 || { ...K.base }; K.turnTo(from17, K.face(P(0.5, gy(0.5, 9.5), 9.5), 'villager'), (k - at(2) + 2) / 9) }
      look(k)
    })

    // L18: he said my name; then the date of the end (the sky darkens as he talks)
    await line('L18', async (k, at, n) => {
      if (k % 6 === 0) hmm(0.35)
      nS.yaw = 25 * Math.sin(ctx.tick / 7); nS.pitch = k % 12 < 4 ? 15 : 0   // he nods on each hmm
      for (const v of crowd) if (v.z < 30) walk(v, 0, 0.03)
      K.setTime(DAY + (12800 - DAY) * K.ease(k / n))
      if (k === at(3)) bolt(-4, gy(-4, 30) + 9, 30)
      look(k)
    })

    // L19: it's TODAY (bolts down the lane behind him, the flash; end on it)
    await line('L19', async (k, at) => {
      if (k === at(1)) { ctx.mark('today_word'); bolt(2, gy(2, 22) + 8, 22); bolt(-5, gy(-5, 28) + 8, 28); ctx.mark('flash') }
      if (k === at(1) + 4) bolt(6, gy(6, 32) + 8, 32)
      nS.yaw = 30 * Math.sin(ctx.tick / 5); nS.pitch = 10
      look(k)
    })
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return true
  }
}

// The ground's top solid block at (x, z), ignoring plants, crops, leaves, logs, fences and lanterns (story_good_boy's)
function groundAt (ctx, x, z) {
  const { bot } = ctx
  for (let y = 110; y > 40; y--) {
    const b = bot.blockAt(new ctx.Vec3(Math.floor(x), y, Math.floor(z)))
    if (!b) continue
    if (b.boundingBox !== 'block' || /_leaves$|_log$|fence|lantern|campfire|^barrier$|_slab$|_stairs$|planks$/.test(b.name)) { if (b.name === 'farmland' || b.name === 'dirt_path') return y; continue }
    return y
  }
  return 64
}
