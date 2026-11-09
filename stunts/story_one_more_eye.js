// Story Short "who keeps filling my end portal 😳" (stories/one_more_eye, premise #7 "One More Eye").
// Every morning the end portal in the narrator's basement has one more eye of ender in it (the EYES
// meter counts up). He's sure it's his brother Leo, who left six years ago to fight the dragon with a
// wooden sword, opening it from the other side to come home. The clues say otherwise, and he reads
// every one of them wrong: Leo's sword came through, then his boots (still smoking), the floor growls
// at night, the ceiling over the portal keeps turning black. He bakes a cake and stays up to watch.
// The twelfth eye goes in, the portal opens, something growls back ("your voice got deep") and the
// game says the twist itself: "HelloBuh was roasted in dragon's breath by Ender Dragon". The dragon
// was the one filling the portal. The last words ("I've waited for this") run into line 1 ("Every
// morning...").
//
// One scene per line (docs/stories.md): each lasts its spoken length + gap, actions land on caption
// chunks (at(k)). No mobs on camera: the motion is cuts, the camera, particles and the eyes going in.
// The dragon is a real one, NoAI, 300 blocks away (never tracked, never drawn): the last hit is
// `/damage ... minecraft:dragon_breath by` it, so the death screen names it.
const path = require('path')
const { storyLines, storyKit, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'one_more_eye')
const BX = -30, BZ = -30   // the basement's middle (the portal ring's middle block)
const RX = 28, RZ = -32    // Leo's room (north-west corner of its shell)
const KX = 28, KZ = 20     // the kitchen (north-west corner of its shell)
// the ring's frames in the order the eyes arrive: the first 8 are in from the start, 9-11 arrive in
// L01-L02 (one a morning), the 12th (south middle, nearest the camera) in L14
const FRAMES = [[-1, -2, 'south'], [0, -2, 'south'], [1, -2, 'south'], [2, -1, 'west'], [2, 0, 'west'], [2, 1, 'west'], [-2, -1, 'east'], [-2, 0, 'east'],
  [-2, 1, 'east'], [-1, 2, 'north'], [1, 2, 'north'], [0, 2, 'north']]
const LETTERS = {   // 3 x 5, top row first
  L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  O: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX']
}
const BREATH = 0xC81EF0   // dragon's breath purple

module.exports = {
  name: 'story_one_more_eye',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'who keeps filling my end portal 😳',
  edit: {
    caption: 'who keeps filling my end portal 😳', red: 'filling', story: 'stories/one_more_eye', startAt: 'line:0', endAfter: 'roar:1.8', deathScreen: true,
    zoom: [['roar:0.35', 'roar:1.8', 1.1]], punch: [['open', 0, 0.08]],
    shake: [['growl', 0, 10], ['growl', 1, 10], ['growl', 2, 14], ['roar', 0, 28]]
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const c = (s) => ctx.cmd(s)
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    const B = (dx, dy, dz) => A(BX + dx, dy, BZ + dz)
    const R = (dx, dy, dz) => A(RX + dx, dy, RZ + dz)
    const Kt = (dx, dy, dz) => A(KX + dx, dy, KZ + dz)
    await ctx.defaultRules()
    await c('/gamerule natural_health_regeneration false')   // the hearts he loses to the breath stay lost
    await c('/gamerule mob_griefing false')
    await c('/gamerule log_admin_commands false')
    await clearSet(ctx, A, 64, 24)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 24)

    // --- the basement: a closed stone-brick room, 13 x 13 inside, 5 high, the ring in its middle
    await c(`/fill ${B(-7, 0, -7)} ${B(7, 6, 7)} stone_bricks hollow`)
    let seed = 7
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
    for (let i = 0; i < 70; i++) {   // moss and cracks, in the floor and the walls
      const kind = rnd() < 0.55 ? 'mossy_stone_bricks' : 'cracked_stone_bricks', u = Math.floor(rnd() * 13) - 6, v = Math.floor(rnd() * 13) - 6, w = 1 + Math.floor(rnd() * 5), face = Math.floor(rnd() * 6)
      const p = face < 2 ? B(u, 0, v) : face === 2 ? B(u, w, -7) : face === 3 ? B(u, w, 7) : face === 4 ? B(-7, w, u) : B(7, w, u)
      await c(`/setblock ${p} ${kind}`)
    }
    for (const x of [-4, 0, 4]) { await c(`/setblock ${B(x, 3, -6)} wall_torch[facing=south]`); await c(`/setblock ${B(x, 3, 6)} wall_torch[facing=north]`) }
    for (const z of [-4, 4]) { await c(`/setblock ${B(-6, 3, z)} wall_torch[facing=east]`); await c(`/setblock ${B(6, 3, z)} wall_torch[facing=west]`) }
    await c(`/setblock ${B(6, 3, 0)} wall_torch[facing=west]`)
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) await c(`/setblock ${B(x, 5, z)} lantern[hanging=true]`)
    // the ring: every frame faces the middle (a valid portal), the first 8 eyes already in
    for (let i = 0; i < 12; i++) { const [dx, dz, f] = FRAMES[i]; await c(`/setblock ${B(dx, 1, dz)} end_portal_frame[facing=${f},eye=${i < 8}]`) }
    // the ceiling over it, black (L11): coal in the middle, blackstone round it
    await c(`/fill ${B(-2, 6, -2)} ${B(2, 6, 2)} blackstone`)
    await c(`/fill ${B(-1, 6, -1)} ${B(1, 6, 1)} coal_block`)
    for (const [x, z] of [[-3, 0], [0, 3], [3, -1], [-1, -3], [2, 3]]) await c(`/setblock ${B(x, 6, z)} blackstone`)
    // the stairs up (L03), along the west wall, into a dark shaft; cobwebs across them
    await c(`/fill ${B(-7, 6, -6)} ${B(-5, 10, -2)} stone_bricks`)
    await c(`/fill ${B(-6, 6, -5)} ${B(-6, 9, -3)} air`)
    for (let i = 0; i < 5; i++) {
      if (i > 0) await c(`/fill ${B(-6, 1, 2 - i)} ${B(-6, i, 2 - i)} stone_bricks`)
      await c(`/setblock ${B(-6, 1 + i, 2 - i)} stone_brick_stairs[facing=north]`)
    }
    for (const [y, z] of [[3, 2], [4, 0], [5, -1], [3, 1]]) await c(`/setblock ${B(-6, y, z)} cobweb`)
    await c(`/setblock ${B(-5, 1, 3)} cobweb`)

    // a plank room: floor y0, walls to y h, ceiling y h+1, log corners, glowstone in the ceiling
    const room = async (P, w, d, h, lights) => {
      await c(`/fill ${P(0, 0, 0)} ${P(w, h + 1, d)} oak_planks hollow`)
      await c(`/fill ${P(0, 0, 0)} ${P(w, 0, d)} spruce_planks`)
      for (const [x, z] of [[0, 0], [w, 0], [0, d], [w, d]]) await c(`/fill ${P(x, 1, z)} ${P(x, h, z)} oak_log`)
      for (const [x, z] of lights) await c(`/setblock ${P(x, h + 1, z)} glowstone`)
    }
    // --- Leo's room (L04): his name on the north wall in wool, 3 x 5 letters; cobwebs; nobody's been in
    await room(R, 14, 8, 6, [[3, 3], [7, 5], [11, 3]])
    const wool = { L: 'red_wool', E: 'yellow_wool', O: 'light_blue_wool' }
    let lx = 2
    for (const ch of 'LEO') {
      for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (LETTERS[ch][r][q] === 'X') await c(`/setblock ${R(lx + q, 6 - r, 0)} ${wool[ch]}`)
      lx += 4
    }
    await c(`/fill ${R(3, 2, 8)} ${R(5, 3, 8)} glass`); await c(`/fill ${R(9, 2, 8)} ${R(11, 3, 8)} glass`)
    await c(`/fill ${R(0, 2, 3)} ${R(0, 3, 5)} glass`); await c(`/fill ${R(14, 2, 3)} ${R(14, 3, 5)} glass`)
    await c(`/fill ${R(1, 1, 1)} ${R(1, 2, 1)} bookshelf`); await c(`/setblock ${R(13, 1, 1)} crafting_table`); await c(`/setblock ${R(12, 1, 1)} note_block`)
    for (const p of [R(1, 6, 1), R(13, 6, 1), R(13, 5, 1), R(1, 3, 1), R(13, 2, 1), R(7, 6, 1), R(5, 1, 1), R(9, 1, 2), R(12, 2, 1)]) await c(`/setblock ${p} cobweb`)
    await c(`/fill ${R(6, 1, 3)} ${R(8, 1, 5)} red_carpet`)
    // --- the kitchen (L05, L10): the table still set for him, cobwebs on his chair
    await room(Kt, 8, 7, 4, [[2, 2], [6, 5], [4, 3]])
    await c(`/fill ${Kt(3, 2, 0)} ${Kt(5, 3, 0)} glass`); await c(`/fill ${Kt(3, 2, 7)} ${Kt(5, 3, 7)} glass`); await c(`/fill ${Kt(8, 2, 3)} ${Kt(8, 3, 4)} glass`)
    await c(`/fill ${Kt(4, 1, 3)} ${Kt(5, 1, 3)} oak_fence`); await c(`/fill ${Kt(4, 2, 3)} ${Kt(5, 2, 3)} brown_carpet`)
    await c(`/setblock ${Kt(4, 1, 4)} oak_stairs[facing=south]`); await c(`/setblock ${Kt(5, 1, 2)} oak_stairs[facing=north]`)
    await c(`/setblock ${Kt(4, 2, 4)} cobweb`); await c(`/setblock ${Kt(4, 3, 3)} cobweb`); await c(`/setblock ${Kt(7, 4, 1)} cobweb`)
    await c(`/fill ${Kt(1, 1, 1)} ${Kt(1, 1, 3)} smooth_stone`); await c(`/setblock ${Kt(1, 1, 4)} crafting_table`)   // a counter (furnaces and barrels are block entities: not drawn)
    await c(`/fill ${Kt(7, 1, 6)} ${Kt(7, 2, 6)} bookshelf`)

    // --- the dragon: a real one, frozen 300 blocks away and 90 up (out of tracking range: never in the
    // recording). Only its name is used, on the death screen.
    await c(`/forceload add ${X + 304} ${Z}`)
    await c(`/summon ender_dragon ${X + 304} ${F + 90} ${Z} {NoAI:1b,Silent:1b,PersistenceRequired:1b,DragonPhase:10,Tags:["drg"]}`)

    await c('/clear @s')
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X + BX + 3.6, F + 1, Z + BZ + 5.2, 135, 15)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, say, look, line, cut } = K
    const B = (dx, dy, dz) => P(BX + dx, dy, BZ + dz)
    const R = (dx, dy, dz) => P(RX + dx, dy, RZ + dz)
    const Kt = (dx, dy, dz) => P(KX + dx, dy, KZ + dz)
    const blk = (dx, dy, dz) => `${X + BX + dx} ${F + dy} ${Z + BZ + dz}`
    const go = (on) => bot.setControlState('forward', on)
    const sneak = (on) => bot.setControlState('sneak', on)
    const setMeter = (v) => ctx.mark('meter', { value: v })
    const eye = (i) => { const [dx, dz, f] = FRAMES[i]; say(`/setblock ${blk(dx, 1, dz)} end_portal_frame[facing=${f},eye=true]`) }
    const bz = () => bot.entity.position.z - (Z + BZ)
    const ticksOf = (id) => Math.round((S.line(id).dur + S.gap) * 20)
    const wisps = (n = 8, y = 1.2) => ctx.particles('portal', B(0.5 + (Math.random() - 0.5) * 2, y, 0.5 + (Math.random() - 0.5) * 2), { count: n })
    // the breath: purple spell clouds rising out of the ring
    const breath = (p) => ctx.particles('potion', p, { color: BREATH, instant: false })
    const hurt = (n) => say(`/damage @s ${n} minecraft:dragon_breath`)
    const growl = (vol, pitch) => { ctx.sound('entity.ender_dragon.growl', vol, pitch); ctx.mark('growl') }
    setMeter(8)

    // L01: the rule, as three mornings: a jump cut round the ring on each new eye (8, 9, 10)
    await cut(BX + 3.6, BZ + 5.2, B(0.5, 1.2, 0.5))
    let shot = 0, tgt = B(0.5, 1.2, 0.5)
    sneak(true)
    await line('L01', async (k, at) => {
      if (shot === 0 && k >= at(2) - 1) { shot = 1; eye(8); setMeter(9); tgt = B(-1.5, 1.7, 1.5); await cut(BX - 4.6, BZ + 3.9, tgt) }
      if (shot === 1 && k >= at(4) - 1) { shot = 2; eye(9); setMeter(10); tgt = B(-0.5, 1.7, 2.5); await cut(BX - 0.9, BZ + 5.3, tgt) }
      go(true); K.base = K.aim(tgt); look(k)
    }, -0.15)
    // L02: today, eleven: the one empty frame between two eyes
    eye(10); setMeter(11)
    await cut(BX + 0.5, BZ + 5.9, B(0.5, 1.6, 2.5))
    await line('L02', async (k, at) => { go(k >= at(3) - 2 && bz() > 4.1); K.base = K.aim(B(0.5, 1.6, 2.5)); look(k) })
    go(false); sneak(false)
    // L03: I never put them in. Nobody goes down there (the stairs, cobwebs across them, up into the dark)
    await cut(BX - 1.5, BZ + 4.6, B(-5.5, 2.4, 1.5))
    let from = null
    await line('L03', async (k, at) => {
      go(k < 9)
      if (k >= at(3) - 3) { from = from || { ...K.base }; K.turnTo(from, B(-5.5, 6.0, -2.6), (k - at(3) + 3) / 22) }
      look(k)
    })
    go(false)
    // L04: Leo's room: his name on the wall, the camera slides along it
    await cut(RX + 3.6, RZ + 6.4, R(3.5, 4.3, 0.5))
    const n4 = ticksOf('L04')
    await line('L04', async (k) => {
      sneak(true); bot.setControlState('right', true)
      const u = Math.min(1, k / (n4 - 6)), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
      K.base = K.aim(R(3.5 + 8 * e, 4.3 - 0.5 * e, 0.5)); look(k)
    })
    bot.setControlState('right', false); sneak(false)
    // L05: back by dinner (the kitchen table still set, cobwebs on his chair)
    await cut(KX + 1.9, KZ + 1.9, Kt(4.8, 1.9, 3.6))
    from = null
    await line('L05', async (k, at) => {
      go(k < 7)
      if (k >= at(3) - 4) { from = from || { ...K.base }; K.turnTo(from, Kt(4.5, 2.1, 4.5), (k - at(3) + 4) / 14) }
      look(k)
    })
    go(false)
    // L06: so it's gotta be him, opening it from the other side (over the ring from the far corner; purple in the middle)
    await cut(BX + 4.0, BZ - 3.9, B(0.5, 0.9, 0.5))
    await line('L06', async (k, at) => {
      sneak(true); go(true); K.base = K.aim(B(0.5, 0.9, 0.5))
      if (k >= at(3) && k % 3 === 0) wisps(k >= at(5) ? 14 : 5)
      look(k)
    })
    go(false); sneak(false)
    // L07: on Monday his sword came through (it lies by the ring; he walks up and picks it up: a real pickup)
    say(`/summon item ${(X + BX + 1.5).toFixed(2)} ${F + 1.1} ${(Z + BZ + 3.75).toFixed(2)} {Item:{id:"minecraft:wooden_sword",count:1,components:{"minecraft:damage":41}},PickupDelay:0s,Age:-32768s,Tags:["sword"]}`)
    for (let i = 0; i < 3; i++) { await bot.waitForTicks(1); look(0) }
    await cut(BX + 1.5, BZ + 6.4, B(1.5, 1.15, 3.75))
    from = null
    let got = -1
    await line('L07', async (k, at) => {
      if (got < 0 && bot.inventory.items().some(it => it.name === 'wooden_sword')) got = k
      go(k >= at(1) - 7 && got < 0 && bz() > 4.4)
      if (k % 4 === 0 && got < 0) ctx.particles('portal', B(1.5, 0.9, 3.75), { count: 5 })
      if (got >= 0) { from = from || { ...K.base }; K.turnTo(from, B(0.5, 1.3, 0.5), (k - got) / 12) } else K.base = K.aim(B(1.5, 1.15, 3.75))
      look(k)
    })
    go(false)
    // L08: on Tuesday, his boots. Still smoking
    say(`/summon item ${(X + BX - 1.5).toFixed(2)} ${F + 1.1} ${(Z + BZ + 3.6).toFixed(2)} {Item:{id:"minecraft:iron_boots",count:1},PickupDelay:32767s,Age:-32768s,Tags:["boots"]}`)
    for (let i = 0; i < 3; i++) { await bot.waitForTicks(1); look(0) }
    await cut(BX - 1.5, BZ + 5.9, B(-1.5, 1.2, 3.6))
    const smoke = (n = 1) => ctx.particles('smoke', B(-1.5 + (Math.random() - 0.5) * 0.3, 1.3, 3.6 + (Math.random() - 0.5) * 0.3), { count: n })
    await line('L08', async (k, at) => {
      sneak(true); go(bz() > 5.0)
      if (k % 2 === 0) smoke(k >= at(2) ? 3 : 1)
      K.base = K.aim(B(-1.5, 1.2 + (k >= at(2) ? Math.min(0.5, (k - at(2)) * 0.03) : 0), 3.6)); look(k)   // the eyes follow the smoke up
    })
    go(false); sneak(false)
    // L09: I think he's just packing (wide: the ring, the boots smoking beside it)
    await cut(BX - 4.9, BZ + 5.6, B(0.2, 1.2, 1.2))
    await line('L09', async (k) => { go(k > 2 && k < 14); if (k % 2 === 0) smoke(2); if (k % 5 === 0) wisps(5); look(k) })
    go(false)
    say('/kill @e[tag=boots]')
    // L10: at night the floor growls (the kitchen at night; purple seeps up through the boards)
    say('/time set 18000'); ctx.dayTime = 18000; ctx.mark('time', { time: 18000 })
    await cut(KX + 6.4, KZ + 5.4, Kt(3.4, 1.0, 2.6))
    from = null
    await line('L10', async (k, at) => {
      if (k === at(2) - 2) growl(0.55, 0.8)
      if (k >= at(2) - 2 && k < at(2) + 12 && k % 2 === 0) ctx.particles('portal', Kt(2.4 + Math.random() * 2, 0.6, 1.8 + Math.random() * 2), { count: 9 })
      if (k >= at(3)) { from = from || { ...K.base }; K.turnTo(from, Kt(4.6, 2.0, 3.4), (k - at(3)) / 16) }
      const j = k >= at(2) - 2 && k < at(2) + 8 ? 1 : 0
      look(k, Math.sin(k * 2.1) * 0.012 * j, Math.sin(k * 1.7) * 0.01 * j)
    })
    // L11: and the ceiling above it keeps turning black (a tilt from the ring up to the soot)
    await cut(BX + 3.6, BZ + 4.2, B(0.5, 1.4, 0.5))
    from = null
    await line('L11', async (k, at) => {
      if (k >= at(1) - 3) { from = from || { ...K.base }; K.turnTo(from, B(0.5, 6.0, 0.5), (k - at(1) + 3) / 18) }
      if (k % 3 === 0) ctx.particles('smoke', B(0.5 + (Math.random() - 0.5) * 2.4, 4.6 + Math.random() * 0.8, 0.5 + (Math.random() - 0.5) * 2.4), { count: 2 })
      look(k)
    })
    // L12: so I baked him a welcome home cake (by the ring)
    say(`/setblock ${blk(4, 1, 4)} oak_planks`); say(`/setblock ${blk(4, 2, 4)} cake`)
    say(`/setblock ${blk(3, 1, 4)} red_carpet`); say(`/setblock ${blk(4, 1, 3)} red_carpet`); say(`/setblock ${blk(5, 1, 4)} red_carpet`); say(`/setblock ${blk(4, 1, 5)} red_carpet`)
    await cut(BX + 6.1, BZ + 6.4, B(4.5, 2.3, 4.5))
    await line('L12', async (k) => { sneak(true); go(k > 2 && k < 22); K.base = K.aim(B(4.5, 2.3, 4.5)); if (k % 6 === 0) wisps(4); look(k) })
    go(false); sneak(false)
    // L13: last night I stayed up to watch (in front of the empty frame; he sits down)
    await cut(BX + 0.5, BZ + 6.2, B(0.5, 1.5, 2.5))
    await line('L13', async (k, at) => { sneak(k >= at(1)); go(k < 6); K.base = K.aim(B(0.5, 1.5, 2.5)); if (k % 6 === 0) wisps(4); look(k) })
    go(false); sneak(false)
    // L14: number twelve: purple gathers on the frame, the eye is in, the portal opens
    await cut(BX + 0.5, BZ + 4.5, B(0.5, 1.75, 2.5))
    from = null
    let openAt = -1
    await line('L14', async (k, at) => {
      if (k < at(1) && k % 2 === 0) ctx.particles('portal', B(0.5, 1.2, 2.5), { count: 7 })
      if (k === at(1)) { eye(11); ctx.sound('block.end_portal_frame.fill', 1, 1); setMeter(12) }
      if (k === at(1) + 8) {
        say(`/fill ${blk(-1, 1, -1)} ${blk(1, 1, 1)} end_portal`)
        ctx.sound('block.end_portal.spawn', 1, 1); ctx.mark('open'); openAt = k
      }
      if (openAt >= 0) { from = from || { ...K.base }; K.turnTo(from, B(0.5, 1.2, 0.9), (k - openAt) / 10); if (k % 2 === 0) wisps(6, 1.6) }
      look(k)
    }, 0.55)
    // L15: Leo? Is that you? (up to the frame, looking down into the stars; something answers)
    from = { ...K.base }
    await line('L15', async (k, at) => {
      go(bz() > 3.36)
      K.turnTo(from, B(0.5, 0.9, 0.6), k / 12)
      if (k % 2 === 0) wisps(6, 1.6)
      if (k === at(2) + 5) { growl(0.7, 0.75); breath(B(0.5, 1.2, 0.5)); hurt(5) }
      const j = k >= at(2) + 5 ? 1 : 0
      look(k, Math.sin(k * 2.1) * 0.012 * j, Math.sin(k * 1.7) * 0.01 * j)
    })
    go(false)
    // L16: wow, your voice got deep. I've waited for this (the breath keeps coming; he keeps talking)
    await line('L16', async (k, at) => {
      if (k % 2 === 0) wisps(9, 1.6)
      if (k === at(2)) { breath(B(0.5, 1.3, 0.9)); hurt(5) }
      if (k === at(3)) { growl(0.85, 0.9); breath(B(0.5, 1.4, 1.2)); hurt(5) }
      K.base = K.aim(B(0.5, 0.9, 0.6))
      const j = 0.6 + Math.min(1.4, k / 20)   // the camera trembles more and more
      look(k, Math.sin(k * 2.1) * 0.01 * j, Math.sin(k * 1.7) * 0.008 * j)
    }, -0.05)
    // the roar, and the breath takes him: the game names the dragon on the death screen (no spoken reveal)
    ctx.sound('entity.ender_dragon.growl', 1, 1.05); ctx.sound('entity.ender_dragon.shoot', 1, 0.9)
    ctx.mark('roar'); ctx.mark('flash')
    breath(B(0.5, 1.4, 1.6)); breath(B(0.5, 1.2, 0.5))
    for (let i = 0; i < 3; i++) { await bot.waitForTicks(1); look(i, Math.sin(i * 2.6) * 0.03, 0.02 * i) }
    say('/damage @s 100 minecraft:dragon_breath by @e[type=minecraft:ender_dragon,tag=drg,limit=1]')
    for (let i = 0; i < 20 && !ctx.died; i++) await bot.waitForTicks(1)
    if (!ctx.died) { say('/damage @s 100 minecraft:dragon_breath'); for (let i = 0; i < 20 && !ctx.died; i++) await bot.waitForTicks(1) }
    // behind the death screen: the breath still pours out of the ring (the portal's stars drift too)
    for (let i = 0; i < 48; i++) {
      if (i % 2 === 0) wisps(10, 1.6)
      if (i % 8 === 2) breath(B(0.5 + (Math.random() - 0.5), 1.2, 0.5 + (Math.random() - 0.5)))
      await bot.waitForTicks(1)
    }
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return ctx.died
  }
}
