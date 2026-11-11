// Story Short "why is my sheep staring at this block 💀" (stories/sheep_stares, v2: Pip's voice, the owner's notes
// 2026-11-10). The narrator's blue sheep has stared at one dirt block for 412 days. It won't eat, it walks back when
// he pushes it into the creek, wolves take one look and leave, and at night the block groans. He woke up in this
// house 412 days ago with no tools and no memories; there's a line of torches from his door to the block; the
// villagers call him "the new one". Today he breaks the block: a shaft straight down. "Who digs straight DOWN?" He
// falls in, and at the bottom, in an old torch-lit mine, a zombie kills him with his own diamond sword: the death
// message names it ("slain by Zombie using [56e's Sword]"). He dug down there 412 days ago, died, and respawned with
// nothing; the zombie kept his sword, and the sheep watched him go in and has waited at that block ever since.
//
// r2 (owner: "supreflat.."): the canonical Digger's House (docs/world/map.json digger_house, day 1111: the blue
// sheep's block and its torch line from the door are canon stamps) on the seed's own ground, under the High Meadow's
// east slope. Every shot looks west or north-west into the slope (the lowland east of the house is flat). The story
// adds the creek, the old mine under the block and the cast. O = (X, F, Z) = the block (-268, 70, -664), F its top
// layer (the ground round it is 69-71: every spot reads its own ground, gy).
const path = require('path')
const world = require('../lib/world')
const { storyLines, storyKit, setKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'sheep_stares')
const CAPTION = 'why is my sheep staring at this block 💀'
const X = -268, Z = -664, F = 70
const DEPTH = 15                     // the room's floor is 15 under the block: his feet fall from F+1 to F-14
const SHEEP = { x: 0.5, z: 2.5, yaw: 180, pitch: 30 }   // the canon spot: south of the block, staring north at it
const CREEK = [14, -26, 24, -23]     // the creek on the lowland north-east (story prop): x0, z0, x1, z1
const SWORD = "56e's Sword"

module.exports = {
  name: 'story_sheep_stares',
  caption: CAPTION,
  time: 6000,
  renderDistance: 12, recordRadius: 128,
  look: { mood: 'bright', rolloff: 0.8 },
  edit: { caption: CAPTION, red: 'staring', story: 'stories/sheep_stares', startAt: 'line:0', endAfter: 'slain:1.9', deathScreen: true, punchStress: true, zoom: [['slain:0.10', 'slain:1.9', 1.07]] },   // settle-ok: a fall and a sword hit, nothing left moving; the death screen holds
  expectDeath: true,
  botTimeout: 600,
  chunkStops (set) { return [[0, 0], [25, 15], [20, -25], [-20, -20]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },

  async setup (ctx) {
    const { bot } = ctx
    const { c, A, mob, vil } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    for (const g of ['log_admin_commands false', 'random_tick_speed 0', 'natural_health_regeneration false', 'do_mob_spawning false']) await c(`/gamerule ${g}`)
    await c('/difficulty normal')
    await c(`/setworldspawn ${X + 3} ${F + 1} ${Z + 6}`)
    // the day before he breaks it: the block still there (map.json: sheep_block until 1112, shaft_open from 1112)
    const W = await world.build(ctx, { places: ['digger_house'], day: 1111 })
    const house = W.places.digger_house.pieces.house
    this.door = house.anchors.door; this.street = house.anchors.street; this.bed = house.anchors.bed; this.doorstep = house.anchors.doorstep
    ctx.log(`digger_house anchors: ${JSON.stringify({ door: this.door, street: this.street, bed: this.bed })}`)
    await c(`/kill @e[type=!player,x=${X},y=${F},z=${Z},distance=..90]`)   // the canon sheep: re-summoned below as the cast
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz)

    // --- under the block: solid stone, the shaft he dug and his little mine at its bottom (story-only, underground)
    await c(`/fill ${A(-6, -DEPTH - 5, -9)} ${A(6, -4, 5)} stone`)
    await c(`/fill ${A(-1, -DEPTH + 1, -4)} ${A(1, -DEPTH + 3, 0)} air`)
    await c(`/fill ${A(0, -DEPTH + 1, 0)} ${A(0, -1, 0)} air`)
    await c(`/setblock ${A(0, 0, 0)} coarse_dirt`)                                  // THE block (grass never spreads to it)
    await c(`/setblock ${A(-1, -DEPTH + 2, -2)} wall_torch[facing=east]`)
    await c(`/setblock ${A(1, -DEPTH + 2, -3)} wall_torch[facing=west]`)
    await c(`/setblock ${A(-1, -DEPTH + 1, -4)} furnace[facing=south,lit=true]`)
    await c(`/setblock ${A(1, -DEPTH + 1, -4)} crafting_table`)
    await c(`/setblock ${A(0, -DEPTH + 2, -5)} diamond_ore`)
    await c(`/setblock ${A(2, -DEPTH + 2, -1)} iron_ore`)
    await c(`/setblock ${A(-2, -DEPTH + 1, -3)} coal_ore`)
    // --- the creek (L03), on the lowland north-east, the slope behind it
    for (let x = CREEK[0]; x <= CREEK[2]; x++) for (let z = CREEK[1]; z <= CREEK[3]; z++) {
      const g = gy(x, z) - F
      await c(`/fill ${A(x, g - 1, z)} ${A(x, g, z)} water`); await c(`/fill ${A(x, g + 1, z)} ${A(x, g + 2, z)} air`)
      await c(`/setblock ${A(x, g - 2, z)} sand`)
    }

    // --- the cast, all NoAI (they move only when a scene moves them)
    const at = (dx, dz, dy = 1) => ({ x: dx, z: dz, y: gy(dx, dz) - F + dy })
    await mob('sheep', SHEEP.x, gy(SHEEP.x, SHEEP.z) - F + 1, SHEEP.z, SHEEP.yaw, ['main'], 'Color:11b')
    { const p = at(19.5, -21.5); await mob('sheep', p.x, p.y + 50, p.z, 0, ['river'], 'Color:11b') }
    for (let i = 0; i < 3; i++) await mob('wolf', 2 + i, 50, -12, 0, ['wolf', `wolf${i}`])
    const s = this.street
    const V = [['farmer', 0, 0], ['librarian', -1.6, -1.4], ['mason', 1.7, -1.6], ['cleric', -0.9, 1.5], ['shepherd', 1.0, 1.7]]
    for (let i = 0; i < V.length; i++) { const p = at(s.x - X + 2 + V[i][1], s.z - Z + V[i][2]); await vil(p.x, p.z, 90, V[i][0], ['vil', `v${i}`], { y: p.y }) }
    // the zombie at the bottom, holding the sword the last player dropped (a mob that picked up loot never despawns)
    await mob('zombie', 0.5, -DEPTH + 1, -2.9, 0, ['zed'])
    await c(`/item replace entity @e[tag=zed,limit=1] weapon.mainhand with diamond_sword[custom_name="${SWORD}"]`)

    await c('/clear @s')
    await ctx.tpCheck(X + 2.9, gy(2.9, 6.9) + 1, Z + 6.9, 150, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, say, look, line } = K
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz) - F + 1
    const cut = (dx, dz, target, o = {}) => K.cut(dx, dz, target, gy(dx, dz), o)
    const ctl = (n, on) => K.ctl(n, on)
    const me = () => bot.entity.position
    const ease = K.ease
    const rel = (p) => ({ x: p.x - X, y: p.y - F, z: p.z - Z })
    const door = rel(this.door), street = rel(this.street), bedP = rel(this.bed)
    const walk = (a, dx, dz) => { K.step(a, dx, dz); a.y = gy(a.x, a.z) }

    // the sheep: an actor at the canon spot, staring north at the block; he watches me at the end
    const SH = K.actor('main', { x: SHEEP.x, y: gy(SHEEP.x, SHEEP.z), z: SHEEP.z, yaw: SHEEP.yaw, pitch: SHEEP.pitch })
    const HOME = { x: SHEEP.x, z: SHEEP.z, yaw: SHEEP.yaw, pitch: SHEEP.pitch }
    const ZED = K.actor('zed', { x: 0.5, y: -DEPTH + 1, z: -2.9, yaw: 0 })
    let watch = false
    K.every(() => {
      if (!watch) return
      const want = K.mcYaw(me().x - X - SH.x, me().z - Z - SH.z)
      let d = want - SH.yaw; while (d > 180) d -= 360; while (d < -180) d += 360
      SH.yaw += Math.max(-14, Math.min(14, d)); SH.pitch += (-8 - SH.pitch) * 0.3
    })
    const FACE = () => P(SH.x, SH.y + 0.9, SH.z - 0.5)          // his face, over the block
    const BLOCK = P(0.5, 1.0, 0.5)                                 // the block's top
    ctx.select(8)   // the last slot: the dirt he picks up later lands in slot 1, not in his hand

    // L01-L02 (one take): the sheep, the block, 412 days, from behind his shoulder (the slope rising beyond); a creep
    // in. He doesn't eat / sleep (night) / blink (his face over the block)
    await cut(2.6, 6.4, P(0.3, 1.1, 0.4))
    await line('L01', (k) => { ctl('sneak', true); ctl('forward', k < 30); ctl('left', k > 6 && k < 28); K.base = K.aim(P(0.3, 1.1, 0.4)); look(k) })
    let c2 = 0
    await line('L02', async (k, at) => {
      if (c2 === 0 && k >= at.cut(2)) { c2 = 1; await cut(-3.6, 4.4, FACE(), { time: 18000 }) }
      if (c2 === 1 && k >= at.cut(4)) { c2 = 2; await cut(2.3, 3.6, FACE(), { time: 6000 }) }
      ctl('sneak', true)
      K.base = K.aim(c2 === 0 ? BLOCK : FACE()); look(k)
    })
    K.stop()

    // L03: I pushed him into the creek (his twin at the bank); he walked right back
    const RV = K.actor('river', { x: 19.5, y: gy(19.5, -21.5), z: -21.5, yaw: 180 })
    await cut(19.5, -17.5, P(19.5, gy(19.5, -21.5) + 0.6, -22))
    let wet = false, c3 = false
    await line('L03', async (k, at) => {
      if (!c3 && k < at.cut(2)) {
        if (!wet) { RV.z -= 0.17; if (RV.z < -23.2) { wet = true; RV.y -= 0.5; ctx.sound('entity.generic.splash', 0.8, 1); ctx.particles('splash', P(RV.x, RV.y + 0.2, RV.z), { count: 14 }) } }
        K.base = K.aim(P(RV.x, RV.y + 0.6, RV.z - 0.4)); look(k)
        return
      }
      if (!c3) { c3 = true; Object.assign(SH, { z: SHEEP.z + 5, yaw: 180 }); K.warp('main'); await cut(-3.4, 9.5, FACE(), { after: () => { RV.y = 50; K.warp('river') } }) }
      if (SH.z > HOME.z) walk(SH, 0, -0.12)                       // a sheep's walk home, north
      else { SH.yaw += (HOME.yaw - SH.yaw) * 0.45; SH.pitch += (HOME.pitch - SH.pitch) * 0.45 }
      K.base = K.aim(P(SH.x, SH.y + 0.6, SH.z)); look(k)
    })
    Object.assign(SH, { ...HOME, y: gy(HOME.x, HOME.z) })

    // L04: wolves showed up (down the slope from the north-west), took one look at him and left
    const WL = [[-3.2, -9.9], [-4.5, -11.0], [-2.0, -11.7]].map((w, i) => K.actor(`wolf${i}`, { x: w[0], y: gy(w[0], w[1]), z: w[1], yaw: 0 }))
    await cut(4.6, 2.0, P(-1.6, 1.0, -4.5))
    await line('L04', (k, at) => {
      const stop = at(2) + 2, run = at(5) - 4
      for (const w of WL) {
        if (k < stop) walk(w, 0.04, 0.16)
        else if (k < run) { w.yaw = K.mcYaw(SH.x - w.x, SH.z - w.z) }
        else walk(w, -0.06, -Math.min(0.24, 0.08 + (k - run) * 0.04))
      }
      K.base = K.aim(P(-1.0, 1.0 + 0.3 * ease((k - run - 4) / 12), -3 + 3 * ease((k - run - 4) / 12))); look(k)
    })

    // L05: a block of gold on top; he stared through it
    say(`/setblock ${X} ${F + 1} ${Z} gold_block`)
    await cut(-1.6, 5.2, FACE(), { after: () => WL.forEach((w, i) => { w.y = 50; K.warp(`wolf${i}`) }) })
    await line('L05', (k, at) => { ctl('sneak', true); K.base = K.aim(k < at(4) ? P(0.5, 1.6, 0.5) : FACE()); look(k) })
    K.stop()

    // L06: at night the block groans
    say(`/setblock ${X} ${F + 1} ${Z} air`)
    await cut(1.9, 4.1, P(0.4, 0.8, 0.5), { time: 18000 })
    await line('L06', (k, at) => {
      if (k === at(2) - 1) ctx.sound('entity.zombie.ambient', 0.45, 0.75)
      const lean = ease((k - at(2) + 2) / 7) - ease((k - at(4)) / 12)
      ctl('sneak', true)
      K.base = K.aim(P(0.4, 0.8 + 0.3 * (1 - lean), 0.5)); look(k, lean > 0.5 ? Math.sin(k * 1.9) * 0.006 : 0)
    })
    K.stop()

    // L07: I don't remember getting a sheep, or dyeing him blue (from the north-west: him, the block, the torches)
    let c7 = false
    await cut(-3.0, -2.6, P(0.4, 1.2, 1.6), { time: 6000 })
    await line('L07', async (k, at) => {
      if (!c7 && k >= at.cut(5)) { c7 = true; await cut(-1.4, 4.6, FACE()) }
      look(k)
    })

    // L08: I woke up in this house 412 days ago (inside: the bed, the bare room; then out of the door, the torch line
    // running west up the rise to him, far off)
    await K.cutTo(bedP.x - 1.6, bedP.y + F, bedP.z + 2.2, P(bedP.x, bedP.y + 0.4, bedP.z))
    let c8 = 0
    await line('L08', async (k, at) => {
      if (c8 === 0 && k >= at.cut(3)) { c8 = 1; await K.cutTo(bedP.x + 1.5, bedP.y + F, bedP.z + 3.0, P(bedP.x + 3, bedP.y + 2.6, bedP.z + 1)) }
      if (c8 === 1 && k >= at.cut(6)) { c8 = 2; await cut(door.x - 0.5, door.z + 3.2, FACE()) }
      look(k)
    })

    // L09: the house was already built; a line of torches from my door to that block (pan from the house to him)
    await cut(street.x + 3, street.z + 4, P(door.x, door.y + 2.5, door.z))
    let from = null
    await line('L09', (k, at) => {
      if (k >= at(3) - 3) { from = from || { ...K.base }; K.turnTo(from, P(0.5, 1.4, 1.0), (k - at(3) + 3) / 30) }
      look(k)
    })

    // L10-L11: the villagers call me the new one (they creep up, staring); what happened to the old one? WHO?
    const VS = [0, 1, 2, 3, 4].map(i => K.actor(`v${i}`, { x: street.x + 2 + [0, -1.6, 1.7, -0.9, 1.0][i], y: 0, z: street.z + [0, -1.4, -1.6, 1.5, 1.7][i], yaw: 90 }))
    VS.forEach(v => { v.y = gy(v.x, v.z) })
    await cut(street.x + 8.5, street.z + 0.2, P(street.x + 2, gy(street.x + 2, street.z) + 1.5, street.z))
    await line('L10', (k) => { VS.forEach(v => walk(v, 0.03, 0)); VS.forEach(v => { v.yaw = 90 }); K.go(k < 10); look(k) })
    K.go(false)
    let turned = false
    await line('L11', (k, at) => {
      walk(VS[0], 0.04, 0); VS[0].yaw = 90
      if (k >= at(5) - 2) {   // WHO? The librarian and the mason turn to each other
        const u = ease((k - at(5) + 2) / 6)
        VS[1].yaw = 90 - 90 * u; VS[2].yaw = 90 + 90 * u
        if (!turned && k >= at(5) + 3) { turned = true; ctx.sound('entity.villager.no', 0.8, 1) }
      }
      ctl('back', true)
      K.base = K.aim(P(VS[0].x, VS[0].y + 1.6, VS[0].z)); look(k, 0, -0.03 * ease((k - at(5)) / 6))
    })
    K.stop()

    // L12: so today I got curious (up the torch line to the block)
    await cut(3.5, 7.5, P(0.3, 1.3, 0.5))
    await line('L12', (k) => { ctl('forward', me().z > Z + 4.0); K.base = K.aim(P(0.3, 1.3, 0.5)); look(k) })
    K.stop()
    // L13: for the first time in 412 days, he looked at me
    from = null
    await line('L13', (k, at) => {
      ctl('sneak', true)
      from = from || { ...K.base }; K.turnTo(from, FACE(), k / 16)
      if (k === at(3) - 3) { watch = true; ctx.sound('entity.sheep.ambient', 1, 1) }
      look(k)
    })
    // L14: I broke the block (by hand, K.dig: the aim glides onto it, vanilla's dig time)
    let broke = false
    await line('L14', (k) => {
      ctl('sneak', true)
      if (k === 1) K.dig(new ctx.Vec3(X, F, Z)).then(() => { broke = true; ctx.mark('broke') }).catch((e) => ctx.log('dig', e.message))
      look(k)
    })
    const HOLE = P(0.5, -0.4, 0.45)
    // L15: a hole under it, straight down (to the edge, look in; the groan again, from below)
    from = null
    await line('L15', (k, at) => {
      ctl('sneak', true); ctl('forward', me().z > Z + 1.4)
      from = from || { ...K.base }; K.turnTo(from, HOLE, (k - 1) / 16)
      if (k === at(3) + 2) ctx.sound('entity.zombie.ambient', 0.5, 0.8)
      look(k)
    })
    // L16: who digs straight down? (he looks back at the sheep, then down; steps in)
    let fell = false
    await line('L16', (k, at) => {
      const stepIn = at(2) + 1
      if (k === 1) ctx.sound('entity.sheep.ambient', 1, 1.1)
      ctl('sneak', k < stepIn); ctl('forward', k >= stepIn && me().y > F + 0.6)
      if (me().y < F + 0.6) fell = true
      if (k === 0 || k === 7) from = { ...K.base }
      if (k < 7) K.turnTo(from, FACE(), (k + 1) / 6)
      else if (k < stepIn) K.turnTo(from, HOLE, (k - 6) / 6)
      else K.base = { yaw: K.base.yaw, pitch: Math.max(-1.48, K.base.pitch - 0.05) }
      look(k)
    })
    ctx.log('broke', broke, 'fell', fell, 'y', me().y - F)
    // the fall: 15 blocks, about a second, eyes down the shaft
    for (let i = 0; i < 60 && !(bot.entity.onGround && me().y < F - DEPTH + 3); i++) { ctl('forward', me().y > F + 0.6); look(i); await bot.waitForTicks(1) }
    K.stop()
    ctx.mark('land')
    ctx.log('landed y', me().y - F, 'health', bot.health)
    // the bottom: his old mine, still lit. A groan; look: a zombie, holding a diamond sword
    ctx.sound('entity.zombie.ambient', 1, 1)
    from = { ...K.base }
    const reach = me().z - Z - 1.4
    for (let i = 0; i < 22 && !ctx.died; i++) {
      if (i >= 3) ZED.z = Math.min(reach, ZED.z + 0.1)
      const f = ease((i - 16) / 5)
      K.turnTo(from, P(0.5 - 0.3 * f, -DEPTH + 2.75 + 0.95 * f, ZED.z), (i + 1) / 8)
      look(i); await bot.waitForTicks(1)
    }
    // the hit: a diamond sword in a zombie's hand on Normal is 3 + 6 = 9; 8 health was left after the fall
    say(`/damage @s 9 minecraft:mob_attack by @e[tag=zed,limit=1]`)
    ctx.mark('slain')
    for (let i = 0; i < 12 && !ctx.died; i++) await bot.waitForTicks(1)
    if (!ctx.died) { ctx.log('still alive, health', bot.health); say(`/damage @s 20 minecraft:mob_attack by @e[tag=zed,limit=1]`); for (let i = 0; i < 20 && !ctx.died; i++) await bot.waitForTicks(1) }
    for (let i = 0; i < 50; i++) await bot.waitForTicks(1)
    ctx.mark('story_end')
    return ctx.died
  }
}

// The ground's top solid block at (x, z), ignoring plants, crops, leaves, logs, fences and lanterns (story_good_boy's)
function groundAt (ctx, x, z) {
  const { bot } = ctx
  for (let y = 120; y > 40; y--) {
    const b = bot.blockAt(new ctx.Vec3(Math.floor(x), y, Math.floor(z)))
    if (!b) continue
    if (b.boundingBox !== 'block' || /_leaves$|_log$|fence|lantern|torch|campfire|^barrier$|_slab$|_stairs$|planks$/.test(b.name)) { if (b.name === 'farmland' || b.name === 'dirt_path') return y; continue }
    return y
  }
  return 70
}
