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
  edit: { caption: 'every time I respawn, someone disappears 😳', red: 'respawn,', story: 'stories/respawn_tax', startAt: 'line:0', endAfter: 'story_end:0', deathScreen: true },
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
    await c('/gamerule natural_health_regeneration true')
    await c('/gamerule log_admin_commands false')   // per-tick `execute as` tps flooded the bot with op broadcasts
    await clearSet(ctx, A, 64, 28)              // a wide flat clearing (lib/story.js)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 64, -4, 30)       // one grass colour over the set (lib/story.js)

    // the spawn: a cobblestone plaza with a gold block where I respawn, lantern posts at the corners
    await c(`/fill ${A(-3, 0, -3)} ${A(3, 0, 3)} cobblestone`)
    await c(`/setblock ${A(0, 0, 0)} gold_block`)
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    await c(`/spawnpoint @s ${A(0, 1, 0)}`)
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
    await c(`/summon oak_boat ${X + 26.5} ${F + 0.52} ${Z - 3.5} {NoGravity:1b,Invulnerable:1b,Rotation:[-60f,0f],Tags:["boat"]}`)
    // the cactus (L05)
    await c(`/fill ${A(-15, 0, -23)} ${A(-10, 0, -18)} sand`)
    await c(`/fill ${A(-12, 1, -21)} ${A(-12, 3, -21)} cactus`)
    await c(`/fill ${A(-14, 1, -19)} ${A(-14, 2, -19)} cactus`)
    await c(`/setblock ${A(-11, 1, -18)} dead_bush`)
    // the house made of hay (L06, L07): roofless so it's lit, a gap for a door on the south side
    await c(`/fill ${A(12, 0, -21)} ${A(17, 0, -16)} hay_block`)
    await c(`/fill ${A(12, 1, -21)} ${A(17, 3, -16)} hay_block hollow`)
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
    const kill = (type) => say(`/damage @s 100 minecraft:${type}`)
    const gone = (tag) => say(`/tp @e[tag=${tag}] ${X} ${F - 30} ${Z}`)   // off the set, out of sight
    const respawn = async () => {   // click Respawn, wait for the spawn
      const spawned = new Promise(r => { bot.once('spawn', r); setTimeout(r, 3000) })
      ctx.respawn(); await spawned; ctx.revive()
    }
    const go = (on) => bot.setControlState('forward', on)
    setMeter(5)

    // L01: the rule, over the five villagers left and the golem on the gold block
    await cut(2.5, 9.5, P(0.5, 1.4, 0))
    await line('L01', async (k) => { go(k > 4 && k < 20); K.base = K.aim(P(0.5, 1.6, -1)); look(k) })
    go(false)
    // L02: first, I fell off a cliff (in the air beside it, looking down at the ground)
    await cut(-26.5, 0.5, P(-21, 0, 0.5), 27)
    await line('L02', async (k) => { K.base = { yaw: K.base.yaw, pitch: Math.max(-1.25, K.base.pitch - 0.03) }; look(k) })
    for (let i = 0; i < 40 && !ctx.died; i++) await bot.waitForTicks(1)
    await bot.waitForTicks(6)
    // L03: respawn; the fisherman is gone, his boat just floating there
    gone('v_fisher')
    await line('L03', async (k, at) => {
      if (k === 0) { await respawn(); setMeter(4) }
      if (k === at(1) - 2) await cut(19.5, -3.5, P(26.5, 0.6, -3.5))
      look(k)
    })
    // L04: then lava. Respawn. The butcher's door, wide open
    await cut(-19.5, 10.5, P(-19.5, 0, 12.5), 2.2)
    gone('v_butcher')
    let dead = false
    await line('L04', async (k, at) => {
      if (!dead && bot.entity.position.y < F + 1.0) { kill('lava'); dead = true }
      if (k === at(1)) { await respawn(); setMeter(3) }
      if (k === at(1) + 3) await cut(-1.5, 12.5, P(4.5, 1.8, 12.5))
      if (k < at(1)) K.base = { yaw: K.base.yaw, pitch: -1.3 }
      look(k)
    })
    // L05: a cactus took the fletcher
    await cut(-12.5, -17.4, P(-12.5, 1.5, -21))
    gone('v_fletcher')
    dead = false
    await line('L05', async (k) => {
      go(!dead)
      if (!dead && bot.entity.position.z < Z - 19.55) { kill('cactus'); dead = true; go(false) }
      look(k)
    }, 0.25)
    go(false)
    for (let i = 0; i < 10 && !ctx.died; i++) await bot.waitForTicks(1)
    // L06: so I stopped dying. I moved into a house made of hay
    await line('L06', async (k) => {
      if (k === 0) { await respawn(); setMeter(2); await cut(14.5, -11.5, P(14.5, 1.5, -19)) }
      go(k > 2 && bot.entity.position.z > Z - 17.4)
      look(k)
    })
    go(false)
    // L07: the librarian raised me. Bread. One more, just in case.
    say(`/tp @e[tag=v_lib] ${X + 14.5} ${F + 1} ${Z - 14.6} 180 0`)
    await cut(14.5, -18.5, P(14.5, 1.6, -14.6))
    ctx.mark('face_on', { near: [X + 14.5, Z - 14.6, 1.2], head: true })
    let bread = 0
    await line('L07', async (k, at) => {
      for (const ch of [4, 5, 6]) if (k === at(ch)) { say('/give @s bread 1'); bread++ }
      look(k, 0, k > at(4) && k < at(6) + 8 ? -0.12 : 0)
    })
    ctx.mark('face_off')
    // L08: and the iron golem always stood exactly where I respawn
    await cut(3.5, 6.5, P(0.5, 2.4, 0.5))
    ctx.mark('face_on', { near: [X + 0.5, Z + 0.5, 1], head: true })
    await line('L08', async (k, at) => { if (k === at(3)) K.base = K.aim(P(0.5, 0.6, 0.5)); look(k) })
    ctx.mark('face_off')
    // L09: then I tripped (walking up the street, eyes on the lava block); L10: into it
    say(`/tp @e[tag=golem] ${X + 2.4} ${F + 1} ${Z - 4.2} 0 0`)
    await cut(0.5, 11.8, P(0.5, 0.5, 4.5))
    await line('L09', async (k, at) => {
      go(k > 2)
      if (k === at(1)) ctx.sound('entity.player.small_fall', 0.6, 1)
      K.base = K.aim(P(0.5, 0.5, 4.5)); look(k, 0, k > at(1) ? -0.25 : 0)
    })
    dead = false
    await line('L10', async (k) => {
      go(!dead)
      if (!dead && bot.entity.position.y < F + 0.9) { kill('lava'); dead = true; go(false) }
      if (!dead) { K.base = K.aim(P(0.5, 0.2, 4.5)); look(k) }
    })
    go(false)
    // L11: this time I was fast: respawn and watch the nitwit walk up to my spawn
    let nz = -6.5
    await line('L11', async (k, at) => {
      if (k === 0) { await respawn(); await cut(3.5, 3.6, P(0.5, 1.4, -2)) }
      if (k >= at(3)) { nz = Math.min(0.5, nz + 0.11); say(`/tp @e[tag=v_nitwit] ${X + 0.5} ${F + 1} ${(Z + nz).toFixed(3)} 0 0`) }
      K.base = K.aim(P(0.5, 1.4, nz)); look(k)
    })
    // L12: he wasn't taken. He volunteered (a nod, a puff, gone)
    await line('L12', async (k, at) => {
      if (k === at(1)) ctx.sound('entity.villager.yes', 1, 1)
      if (k === at(2) + 4) {
        gone('v_nitwit'); setMeter(1)
        ctx.particles('smoke', P(0.5, 1.0, 0.5), { count: 30 })
        ctx.sound('entity.generic.extinguish_fire', 0.7, 1.2)
      }
      look(k)
    })
    // L13: every respawn costs one life; they've paid for mine since I was born (the empty street)
    await cut(0.5, 37.5, P(0.5, 1.5, 10))
    await line('L13', async (k) => { go(k > 4 && k < 50); look(k, Math.sin(k / 12) * 0.18) })
    go(false)
    // L14: the golem wasn't guarding me. He was keeping the line
    await cut(4.2, -1.0, P(2.4, 2.4, -4.2))
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
    say(`/tp @e[tag=v_lib] ${X + 0.5} ${F + 1} ${Z + 0.5} 0 0`)
    await cut(0.5, 7.4, P(0.5, 1.7, 0.5))
    ctx.mark('face_on', { near: [X + 0.5, Z + 0.5, 1] })
    await line('L16', async (k) => { look(k) })
    // L17: and today, I tripped again
    dead = false
    await line('L17', async (k, at) => {
      go(!dead)
      if (k === at(1)) ctx.sound('entity.player.small_fall', 0.6, 1)
      if (!dead && bot.entity.position.y < F + 0.9) { kill('lava'); dead = true; go(false) }
      if (!dead) { K.base = K.aim(P(0.5, k > at(1) ? 0.4 : 1.6, k > at(1) ? 4.5 : 0.5)); look(k) }
    }, 0.2)
    go(false)
    // L18: she just smiled and said, go on. Respawn. (the death screen, the Respawn button). Mob moves stop
    // reaching a dead player after ~1 s, so the motion comes from particles: she sparkles (a happy
    // villager), the cauldron smokes
    await line('L18', async (k, at) => {
      if (k >= at(1) && k % 3 === 0) ctx.particles('happy', P(0.5, 1.6 + Math.random() * 0.6, 0.5), { count: 2 })
      if (k % 2 === 0) ctx.particles('smoke', P(0.5, 1.0, 4.5), { count: 2 })
    }, 0.25)
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return ctx.died
  }
}
