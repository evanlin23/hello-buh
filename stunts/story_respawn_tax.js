// Story Short "every time I respawn, someone disappears 😳" (stories/respawn_tax). Every time the
// narrator dies and respawns, one villager is gone (the VILLAGERS meter counts down). He stops
// dying; the librarian who raised him keeps giving him bread; the iron golem always stands on his
// spawn point. Then he catches the nitwit stepping onto it and vanishing: they volunteer, a
// respawn costs a life, and the village has paid for his since he was born. Only the librarian is
// left, already on his spawn. He trips into the lava again; she smiles: "go on. Respawn." The last
// word loops into the first line.
//
// One scene per line (docs/stories.md): each lasts its spoken length + gap, actions land on
// caption chunks (at(k)), deaths are real (fall, lava, cactus) with the vanilla death screen, and
// the meter is marked as `meter` { value } for edit.py.
const path = require('path')
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'respawn_tax')

module.exports = {
  name: 'story_respawn_tax',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'every time I respawn, someone disappears 😳',
  edit: { caption: 'every time I respawn, someone disappears 😳', red: 'respawn,', story: 'stories/respawn_tax', startAt: 'line:0', endAfter: 'story_end:-0.2', deathScreen: true, onFire: 'burn:death' },
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
    await ctx.defaultRules()
    await c('/difficulty normal')
    await c('/gamerule natural_health_regeneration false')   // low hearts stay put (healing made them flash as if hurt)
    await c('/gamerule log_admin_commands false')   // per-tick `execute as` tps flooded the bot with op broadcasts
    await clearSet(ctx, A, 64, 28)              // a wide flat clearing (lib/story.js)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 30)       // one grass colour over the set (lib/story.js)

    // the spawn: a cobblestone plaza with a gold block where I respawn, lantern posts at the corners
    await c(`/fill ${A(-3, 0, -3)} ${A(3, 0, 3)} cobblestone`)
    await c(`/setblock ${A(0, 0, 0)} gold_block`)
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    await c(`/spawnpoint @s ${A(-1, 1, 2)} -153 0`)   // beside the gold block, facing it (clear of the lantern posts: a respawn put the head inside one)
    // the line: a fenced queue lane running north from the plaza, lanterns along it
    await c(`/fill ${A(-1, 1, -14)} ${A(-1, 1, -4)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(1, 1, -14)} ${A(1, 1, -4)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(0, 0, -14)} ${A(0, 0, -4)} gravel`)
    for (const dz of [-6, -10, -14]) for (const dx of [-1, 1]) { await c(`/setblock ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    // the street south of the plaza, six houses, every door open; the one block of lava in the path
    await c(`/fill ${A(-1, 0, 4)} ${A(1, 0, 38)} dirt_path`)
    for (const z0 of [10, 18, 26]) {
      await house(ctx, A, -9, z0, -4, z0 + 2, 'west')
      await house(ctx, A, 4, z0, 4, z0 + 2, 'east')
    }
    await c(`/setblock ${A(0, 0, 4)} lava_cauldron`)   // the only block of lava in the village, sunk in the path: you fall in, but the eye stays above it (a lava block sinks the body and the death screen goes solid orange)
    for (const [dx, dz, b] of [[-2, 16, 'poppy'], [2, 24, 'dandelion'], [-2, 31, 'cornflower'], [2, 34, 'oxeye_daisy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // the cliff (L02): a stone column 27 high, west of the village
    await c(`/fill ${A(-33, 1, -2)} ${A(-28, 27, 3)} stone`)
    await c(`/fill ${A(-33, 28, -2)} ${A(-28, 28, 3)} grass_block`)
    // the lava pool (L04) by the cliff
    await c(`/fill ${A(-22, -1, 8)} ${A(-18, 0, 12)} lava`)
    // the pond and dock (L03), the fisherman's empty boat
    await c(`/fill ${A(22, -2, -10)} ${A(38, 0, 4)} water`)
    await c(`/fill ${A(17, 0, -5)} ${A(22, 0, -3)} oak_planks`)
    await c(`/summon oak_boat ${X + 26.5} ${F + 0.52} ${Z - 3.5} {Invulnerable:1b,Rotation:[-60f,0f],Tags:["boat"]}`)
    // the cactus (L05)
    await c(`/fill ${A(-15, 0, -23)} ${A(-10, 0, -18)} sand`)
    await c(`/fill ${A(-12, 1, -21)} ${A(-12, 3, -21)} cactus`)
    await c(`/fill ${A(-14, 1, -19)} ${A(-14, 2, -19)} cactus`)
    await c(`/setblock ${A(-11, 1, -18)} dead_bush`)
    // the house made of hay (L06, L07): roofless so it's lit, a gap for a door on the south side
    await c(`/fill ${A(12, 0, -21)} ${A(17, 4, -16)} hay_block hollow`)   // floor y0, walls y1-y3...
    await c(`/fill ${A(12, 4, -21)} ${A(17, 4, -16)} air`)                  // ...and no roof, so it's lit
    await c(`/fill ${A(14, 1, -16)} ${A(15, 2, -16)} air`)

    // the cast, all NoAI
    const vil = (x, z, yaw, prof, tag) => c(`/summon villager ${(X + x).toFixed(2)} ${F + 1} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[${yaw}f,0f],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1}`)
    await vil(-1.6, -1.8, 20, 'fisherman', 'v_fisher')       // L01: the five villagers around the plaza
    await vil(2.0, -2.2, -30, 'butcher', 'v_butcher')
    await vil(-2.4, 1.6, 150, 'fletcher', 'v_fletcher')
    await vil(0.5, -6.5, 0, 'nitwit', 'v_nitwit')            // already in the line
    await vil(2.4, 1.9, -150, 'librarian', 'v_lib')
    await c(`/summon iron_golem ${X + 0.5} ${F + 1} ${Z + 0.5} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["golem"],Rotation:[0f,0f]}`)

    await c('/clear @s')
    // mineflayer ignores the biome-update packet: go out of range and back so the chunks come again with plains
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X, F + 1, Z + 9, 180, 0)
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
    const { P, say, look, line, cut } = K
    let meter = 5
    const setMeter = (v) => { meter = v; ctx.mark('meter', { value: v }) }
    const kill = (type) => { if (type === 'lava') ctx.mark('burn'); say(`/damage @s 100 minecraft:${type}`) }   // lava: the fire overlay burns from here to the respawn
    const gone = (tag) => say(`/tp @e[tag=${tag}] ${X} ${F - 30} ${Z}`)   // off the set, out of sight
    let deadAt = -99
    bot.on('death', () => { deadAt = ctx.tick })
    const respawn = async () => {   // click Respawn (enabled 20 ticks after the death), wait for the spawn
      if (!ctx.died) return
      while (ctx.tick < deadAt + 21) await bot.waitForTicks(1)
      const spawned = new Promise(r => { bot.once('spawn', r); setTimeout(r, 3000) })
      ctx.respawn(); await spawned; ctx.revive()
      K.base = { yaw: bot.entity.yaw, pitch: bot.entity.pitch }   // the spawn angle: facing the gold block
    }
    const go = (on) => bot.setControlState('forward', on)
    // respawn without stalling the line (an awaited respawn held each scene ~1 s past its voice)
    let respawning = false
    const respawnSoon = (then) => { if (respawning || !ctx.died) return; respawning = true; respawn().then(() => { respawning = false; if (then) then() }) }
    const alive = () => !ctx.died && !respawning
    // something moving behind every death screen: smoke at a point in view, every 3 ticks while dead
    let deadView = null
    bot.on('death', () => {
      const e = bot.entity, f = { x: -Math.sin(e.yaw), z: -Math.cos(e.yaw) }
      const d = 2.5
      if (!noSmoke) deadView = new ctx.Vec3(e.position.x + f.x * d, Math.max(F + 0.4, e.position.y + 1.62 - 1.6), e.position.z + f.z * d)
    })
    let noSmoke = false
    bot.on('physicsTick', () => { if (ctx.died && deadView && !noSmoke && ctx.tick % 3 === 0) ctx.particles('smoke', deadView, { count: 2 }) })
    // the trip: over the sunken cauldron, drop into it (walking can step across its rim) and die
    const overCauldron = () => { const p = bot.entity.position; return p.z < Z + 5.0 && p.z > Z + 4.0 && p.x > X && p.x < X + 1 }
    const fallIn = () => say(`/tp @s ${(X + 0.5).toFixed(3)} ${(F + 0.3).toFixed(3)} ${(Z + 4.5).toFixed(3)}`)
    // the trip, as a sequence: drop into the cauldron (burning), scramble out onto the plaza facing `t`, burn to
    // death there. Dying inside it sank the dead camera to the cauldron's floor (its walls filled the screen).
    let trip = null, landed = 0
    const tripStep = (t) => {
      if (!trip && (bot.entity.position.y < F + 0.9 || overCauldron())) { trip = 0; go(false); fallIn(); ctx.mark('burn'); ctx.sound('entity.generic.burn', 1, 1) }
      if (trip === null) return false
      trip++
      // once out on the plaza, face `t` ourselves (the /tp's facing never reached the recording: the pitch stayed
      // on the cauldron, so the death screen showed only cobblestone)
      if (trip > 7 && bot.entity.position.z < Z + 3.8 && bot.entity.position.y > F + 0.9) { landed = landed || trip; K.base = K.aim(t); bot.look(K.base.yaw, K.base.pitch, true) }
      if (trip === 10) say('/effect clear @s minecraft:fire_resistance')
      if (trip === 7) say(`/tp @s ${(X + 0.5).toFixed(3)} ${(F + 1).toFixed(3)} ${(Z + 3.4).toFixed(3)} facing ${t.x.toFixed(2)} ${t.y.toFixed(2)} ${t.z.toFixed(2)}`)
      // the body must be at rest on the plaza before it dies: a death on the landing tick read the teleport as
      // speed and the dead camera slid 11 blocks up the lane, past the librarian (retention audit)
      if (trip >= 16 && landed && trip >= landed + 6) { if (!ctx.died) say('/damage @s 100 minecraft:on_fire'); return 'dead' }
      return true
    }
    setMeter(5)

    // L01: the rule, over the five villagers left and the golem on the gold block
    await cut(2.5, 9.5, P(0.5, 1.4, 0))
    await line('L01', async (k) => { go(k > 4 && k < 20); K.base = K.aim(P(0.5, 1.6, -1)); look(k) })
    go(false)
    // L02: first, I fell off a cliff (in the air beside it, looking down at the ground)
    await cut(-26.5, 0.5, P(-26.5, 0, 9), 27)   // looking down along the cliff face (on the right)
    await line('L02', async (k) => { K.base = { yaw: K.base.yaw, pitch: Math.max(-1.15, K.base.pitch - 0.02) }; look(k) })
    for (let i = 0; i < 40 && !ctx.died; i++) await bot.waitForTicks(1)
    // from now on he respawns on half a heart: the max health is set while he's dead, so no scene opens on an
    // unexplained hit, and one real touch of lava or a cactus kills him the vanilla way
    say('/attribute @s minecraft:max_health base set 1')
    await bot.waitForTicks(6)
    // L03: respawn; the fisherman is gone, his boat just floating there
    gone('v_fisher')
    let docked = false, from3 = null, k3 = 0, kNow = 0
    await line('L03', async (k, at) => {
      kNow = k
      // where the fisherman stood: empty. Turned to over 6 ticks (a one-tick snap after 3 frames of the golem read as a flash cut)
      if (k === 0) respawnSoon(() => { setMeter(4); from3 = { ...K.base }; k3 = kNow })
      if (from3 && !docked) K.turnTo(from3, P(-1.6, 1.0, -1.8), (k - k3) / 6)
      if (!docked && k >= at(3) - 2 && alive()) { docked = true; await cut(18.5, -3.5, P(26.5, 0.4, -3.5)) }   // arrive on the aim the walk keeps (it whipped on 4 frames)
      go(docked && bot.entity.position.x < X + 21.2)
      if (docked) K.base = K.aim(P(26.5, 0.4, -3.5))
      if (alive()) look(k)
    })
    go(false)
    // L04: then lava. Respawn. The butcher's door, wide open
    await cut(-19.5, 10.5, P(-19.5, 0, 12.5), 2.2)
    gone('v_butcher')
    let dead = false, door = false, burnAt = 0
    await line('L04', async (k, at) => {
      if (!burnAt && (bot.entity.position.y < F + 1.6 || ctx.died)) { burnAt = k || 1; ctx.mark('burn') }   // just before the touch: on half a heart the lava kills on the touching tick, and a burn mark after the death paired with the next death
      if (!dead && burnAt && (ctx.died || k >= burnAt + 10)) { if (!ctx.died) say('/damage @s 100 minecraft:lava'); dead = true }
      if (dead && k >= at(1)) respawnSoon(() => setMeter(3))
      if (dead && !door && k >= at(2) - 1 && alive()) { door = true; await cut(-1.5, 12.5, P(4.5, 1.8, 12.5)) }
      if (!door) K.base = { yaw: K.base.yaw, pitch: Math.max(-1.3, K.base.pitch - 0.03) }   // eased down (a one-tick pitch whip after the cut)
      if (alive()) look(k)
    })
    // L05: a cactus took the fletcher
    await cut(-11.5, -17.4, P(-11.5, 1.5, -21))
    gone('v_fletcher')
    dead = false
    let pressed = 0
    await line('L05', async (k) => {
      go(!dead)
      if (!dead && bot.entity.position.z < Z - 19.55) pressed++
      if (!dead && (ctx.died || pressed > 8)) { if (!ctx.died) kill('cactus'); dead = true; go(false); deadView = P(-11.5, 3.4, -20.3) }
      // pressed against it, look up its side: the top and the sky in frame, the smoke above it in view (the
      // screen was all cactus texture and froze behind the death screen)
      if (pressed > 0) K.base = K.aim(P(-11.5, 4.2, -21))
      if (alive()) look(k)
    })
    go(false)
    // L06: so I stopped dying (over the cactus death screen). I moved into a house made of hay
    let hay = false
    await line('L06', async (k, at) => {
      respawnSoon(() => setMeter(2))
      if (!hay && k >= at(2) - 1 && alive()) { hay = true; await cut(14.5, -11.5, P(14.5, 1.5, -19)) }
      go(hay && bot.entity.position.z > Z - 17.4)
      if (alive()) look(k)
    })
    go(false)
    // L07: the librarian raised me. Bread. One more, just in case.
    say(`/tp @e[tag=v_lib] ${X + 14.5} ${F + 1} ${Z - 14.6} 180 0`)
    await cut(14.5, -18.5, P(14.5, 1.6, -14.6))
    ctx.mark('face_on', { near: [X + 14.5, Z - 14.6, 1.2], head: true })
    let bread = 0
    await line('L07', async (k, at) => {
      for (const ch of [4, 5, 6]) if (k === at(ch)) { say('/give @s bread 1'); bread++ }
      look(k, 0, -0.12 * Math.max(0, Math.min(1, (k - at(4) + 4) / 6, (at(6) + 14 - k) / 6)))
    })
    ctx.mark('face_off')
    // L08: and the iron golem always stood exactly where I respawn
    await cut(3.5, 6.5, P(0.5, 2.4, 0.5))
    ctx.mark('face_on', { near: [X + 0.5, Z + 0.5, 1], head: true })
    let from8 = null
    await line('L08', async (k, at) => { if (k >= at(3)) { from8 = from8 || { ...K.base }; K.turnTo(from8, P(0.5, 0.6, 0.5), (k - at(3)) / 8) } look(k) })   // tilt down to the spot, eased (it lurched)
    ctx.mark('face_off')
    // L09: then I tripped (walking up the street, eyes on the lava block); L10: into it
    say(`/tp @e[tag=golem] ${X + 2.4} ${F + 1} ${Z - 4.2} 0 0`)
    await cut(0.5, 11.8, P(0.5, 0.5, 4.5))
    say('/effect give @s minecraft:fire_resistance 30 0 true')   // the cauldron burns him only once he's out (no particles)
    await line('L09', async (k, at) => {
      go(k > 2)
      if (k === at(1)) ctx.sound('entity.player.small_fall', 0.6, 1)
      K.base = K.aim(P(0.5, 0.5, 4.5)); look(k, 0, k > at(1) ? -0.25 : 0)
    })
    dead = false; trip = null; landed = 0
    let nz = -6.5
    await line('L10', async (k) => {
      go(!dead && trip === null)
      if (!dead) { const st = tripStep(P(0.5, 1.4, -3)); if (st === 'dead') { dead = true; trip = null; deadView = null } }   // dies facing the spawn and the lane
      // behind this death screen the nitwit starts down the lane (the smoke 2.5 blocks ahead sat on the gold block
      // and was still rising there after the respawn: Minecraft audit)
      if (dead) { nz = Math.min(-3.5, nz + 0.1); say(`/tp @e[tag=v_nitwit] ${X + 0.5} ${F + 1} ${(Z + nz).toFixed(3)} 0 0`) }
      if (dead) respawnSoon()   // respawn inside L10: done in L11 it stretched the line 0.4 s (0.8 s of silence)
      if (!dead && trip === null) { K.base = K.aim(P(0.5, 0.2, 4.5)); look(k) }
      if (dead && alive()) look(k)
    })
    go(false)
    // L11: this time I was fast: respawn and watch the nitwit walk up to my spawn
    await line('L11', async (k, at) => {
      if (k === 0) { while (!alive()) await bot.waitForTicks(1); await cut(3.5, 3.6, P(0.5, 1.4, -2)) }
      if (k >= at(2)) { nz = Math.min(0.5, nz + 0.2); say(`/tp @e[tag=v_nitwit] ${X + 0.5} ${F + 1} ${(Z + nz).toFixed(3)} 0 0`) }
      K.base = K.aim(P(0.5, 1.4, nz)); look(k)
    })
    // L12: he wasn't taken. He volunteered (a nod, a puff, gone)
    await line('L12', async (k, at) => {
      if (k === at(1)) ctx.sound('entity.villager.yes', 1, 1)
      if (k === at(2) + 4) {
        gone('v_nitwit'); setMeter(1)
        ctx.particles('poof', P(0.5, 1, 0.5), { w: 0.6, h: 1.95 })   // vanilla's vanish cloud (a villager's box)
        ctx.sound('entity.generic.extinguish_fire', 0.7, 1.2)
      }
      look(k)
    })
    // L13: every respawn costs one life; they've paid for mine since I was born (the empty street)
    await cut(0.5, 37.5, P(0.5, 1.5, 10))
    let from13 = null
    await line('L13', async (k, at) => {
      go(k > 4 && k < at(4))
      if (k >= at(4) - 2) { from13 = from13 || { ...K.base }; K.turnTo(from13, P(4.5, 1.6, 28.5), (k - at(4) + 3) / 9) }
      look(k)
    })
    go(false)
    // L14: the golem wasn't guarding me. He was keeping the line
    await cut(1.9, -0.6, P(2.4, 2.4, -4.2))
    ctx.mark('face_on', { near: [X + 2.4, Z - 4.2, 1], head: true })
    let from = null
    await line('L14', async (k, at) => {
      if (k >= at(3) - 4) { from = from || { ...K.base }; K.turnTo(from, P(0.5, 1.0, -13), (k - at(3) + 5) / 10) }
      look(k)
    })
    ctx.mark('face_off')
    // L15: now it's just her (alone in the line)
    say(`/tp @e[tag=v_lib] ${X + 0.5} ${F + 1} ${Z - 11.5} 0 0`)
    await cut(0.5, -2.5, P(0.5, 1.6, -11.5))
    await line('L15', async (k) => { go(k < 14); look(k) })
    go(false)
    // L16: she's already standing on my spawn
    say('/effect give @s minecraft:fire_resistance 30 0 true')
    say(`/tp @e[tag=v_lib] ${X + 0.5} ${F + 1} ${Z + 0.5} 0 0`)
    await cut(0.5, 7.4, P(0.5, 1.7, 0.5))
    ctx.mark('face_on', { near: [X + 0.5, Z + 0.5, 1] })
    await line('L16', async (k) => { go(k > 6 && k < 12); look(k) })
    go(false)
    // L17: and today, I tripped again
    dead = false; trip = null; landed = 0
    await line('L17', async (k, at) => {
      go(!dead && trip === null && k >= at(2) - 11)   // the fall lands on "AGAIN."
      if (k === at(1)) ctx.sound('entity.player.small_fall', 0.6, 1)
      if (!dead) {
        const st = tripStep(P(0.5, 2.0, 0.5))   // dies facing her: her face between the title and the buttons
        if (st === 'dead') { dead = true; deadView = null; noSmoke = true }   // nothing between us: she sparkles instead
      }
      if (dead && k % 3 === 0) ctx.particles('happy', P(0.5, 1.6 + Math.random() * 0.6, 0.5), { count: 2 })
      if (!dead && trip === null) { K.base = K.aim(k > at(1) && k < at(2) ? P(0.5, 0.4, 4.5) : P(0.5, 1.5, 0.5)); look(k) }
    })
    go(false)
    // L18: she just smiled and said, go on. Respawn. (the death screen, the Respawn button). Mob moves stop
    // reaching a dead player after ~1 s, so the motion comes from particles: she sparkles (a happy
    // villager), the cauldron smokes
    await line('L18', async (k, at) => {
      if (k % 3 === 0) ctx.particles('happy', P(0.5, 1.6 + Math.random() * 0.6, 0.5), { count: 2 })
    })
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return ctx.died
  }
}
