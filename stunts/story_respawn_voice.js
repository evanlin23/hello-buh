// Story Short "which voice do I TRUST? 😳" (stories/respawn_voice), the "Who do you trust?" format
// (docs/stories.md): a world rule, proof bursts, our message, a second message saying the opposite,
// and the question card. The Short never answers.
//
// Rule: the first time you die, you hear one sentence from your future self. Proof: my brother heard
// DON'T MINE THE GOLD (lava behind it), my sister heard CLOSE THE DOOR (a zombie came knocking).
// Today I fell off a cliff and heard mine: "DON'T SLEEP IN THE NEW BED." I respawned in a field,
// because my bed was gone: Dad had built me a new one. He said it's safer, then nailed my door shut.
// That night a second voice, my own: "SLEEP IN THE BED, OR YOU'LL RESPAWN SOMEWHERE THAT ISN'T HOME."
// But I wasn't dead. And the first voice sounded grandpa old. Voice one, or voice two?
//
// THE INTENDED ANSWER (for a possible part 2; never said in this Short): trust voice 1, don't sleep.
// The rule gives ONE sentence, on your FIRST DEATH. Voice 2 came to a living player, so it isn't
// future me: it's whatever wants me in that bed. A bed sets your respawn point, so after one night
// in it every death brings me back to that nailed-shut room, forever. "Somewhere that isn't home"
// was the truth told as a threat: the field was me being free. And voice 1 sounded grandpa old
// because the me who never sleeps in that bed gets to grow old.
//   Clues for 1: voice 2 came while I was alive (full hearts, no death screen), and it's a second
//     sentence when the rule gives one; Dad took the old bed and nailed the door the moment I was in.
//   Clues for 2: I really did respawn in a field with no home bed (vanilla: a missing bed sends you
//     to the world spawn), exactly what voice 2 warns of; voice 1 sounded far too old to be me; a
//     zombie is at the window, so the nailed door looks like protection (CLOSE THE DOOR saved my sister).
//   Both ways: the nailed door, and the old voice.
//
// Both deaths are real falls (27 blocks, the vanilla death screen); the first is the cold open and
// the second is the same fall told in order. The gold is really mined (iron pickaxe, survival).
const path = require('path')
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'respawn_voice')
const CAPTION = 'which voice do I TRUST? 😳'
const VOICE1 = "DON'T SLEEP IN THE NEW BED."
const VOICE2 = "SLEEP IN THE BED, OR YOU'LL RESPAWN SOMEWHERE THAT ISN'T HOME."

module.exports = {
  name: 'story_respawn_voice',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: {
    caption: CAPTION, red: 'TRUST?', story: 'stories/respawn_voice', startAt: 'line:0', endAfter: 'story_end:0', deathScreen: true,
    cards: [
      ['heard_brother', "DON'T MINE THE GOLD.", 1.7, 'white'],
      ['heard_sister', 'CLOSE THE DOOR.', 1.5, 'white'],
      ['voice1', VOICE1, 1.3, 'yellow'],
      ['no_bed', 'NO HOME BED?', 1.4, 'white'],
      ['voice2', 'SLEEP IN THE BED,', 0.75, 'red'],
      ['voice2b', "OR YOU'LL RESPAWN", 0.55, 'red'],
      ['voice2b:0.6', "SOMEWHERE THAT ISN'T HOME.", 1.25, 'red'],
      ['question', 'TRUST VOICE 1 OR 2? COMMENT 👇', 1.8, 'gold']
    ],
    sfx: [['impact', 'nailed'], ['scratch', 'not_dead'], ['dip', 'question', 0.3]],
    punch: [['nailed', 0, 0.06]]
  },

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
    await c('/gamerule log_admin_commands false')
    await c('/difficulty normal')
    await c('/gamerule random_tick_speed 0')
    await clearSet(ctx, A, 64, 30)
    await plainsBiome(ctx, A, 80, -4, 30)
    await c('/kill @e[type=!player]')

    // --- the cliff (L01, L04): a stone column 27 high, far west
    await c(`/fill ${A(-50, 1, 18)} ${A(-45, 27, 23)} stone`)
    await c(`/fill ${A(-50, 28, 18)} ${A(-45, 28, 23)} grass_block`)
    // --- my brother's gold (L02): a stone outcrop, the ore in its south face, lava right behind it
    await c(`/fill ${A(15, 1, -35)} ${A(25, 4, -30)} stone`)
    await c(`/fill ${A(16, 5, -34)} ${A(24, 5, -31)} stone`)
    await c(`/fill ${A(15, 0, -29)} ${A(25, 0, -27)} stone`)
    await c(`/fill ${A(19, 1, -33)} ${A(21, 3, -31)} lava`)
    await c(`/setblock ${A(20, 2, -30)} gold_ore`)
    for (const [dx, dy, b] of [[17, 3, 'coal_ore'], [23, 1, 'iron_ore'], [16, 1, 'andesite'], [24, 3, 'andesite'], [18, 1, 'cobblestone'], [22, 4, 'coal_ore']]) await c(`/setblock ${A(dx, dy, -30)} ${b}`)
    await c(`/setblock ${A(18, 2, -29)} wall_torch[facing=south]`)
    // --- my sister's house (L03): the door on the south wall, a window beside it, lanterns outside
    await house(ctx, A, 28, 10, 31, 15, 'south', true, 'oak_planks')
    await c(`/fill ${A(29, 2, 15)} ${A(30, 2, 15)} glass`)
    await c(`/setblock ${A(32, 1, 11)} barrel`); await c(`/setblock ${A(29, 1, 11)} crafting_table`)
    await c(`/setblock ${A(28, 1, 17)} lantern`); await c(`/setblock ${A(33, 1, 17)} lantern`)
    // --- the field I respawn in (L06): flowers and grass, home far to the north
    const flora = ['short_grass', 'poppy', 'short_grass', 'dandelion', 'short_grass', 'cornflower', 'short_grass', 'oxeye_daisy', 'short_grass', 'azure_bluet']
    let fi = 0
    for (let dx = 0; dx <= 22; dx += 2) for (let dz = 28; dz <= 46; dz += 3) { const jx = (dx * 7 + dz * 3) % 3 - 1, jz = (dx * 5 + dz) % 3 - 1; if (Math.abs(dx + jx - 12) < 2 && Math.abs(dz + jz - 40) < 2) continue; await c(`/setblock ${A(dx + jx, 1, dz + jz)} ${flora[fi++ % flora.length]}`) }
    // --- my room (L07-L13): the door on the south wall; the new bed against the north wall, under the window
    await house(ctx, A, -3, -8, 0, -3, 'south', true, 'oak_planks')
    await c(`/setblock ${A(-1, 1, -7)} light_blue_bed[facing=west,part=head]`)
    await c(`/setblock ${A(0, 1, -7)} light_blue_bed[facing=west,part=foot]`)
    await c(`/setblock ${A(1, 1, -7)} crafting_table`)
    await c(`/setblock ${A(-2, 1, -7)} bookshelf`)
    for (const [dx, dz, b] of [[-2, -2, 'poppy'], [2, -2, 'dandelion']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)

    const mob = (type, x, y, z, yaw, tag, more = '') => c(`/summon ${type} ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[${yaw}f,0f]${more}}`)
    const DAD = ',VillagerData:{profession:"minecraft:toolsmith",type:"minecraft:plains",level:2},Xp:1'
    await mob('villager', 1.3, 1, -5.7, 60, 'dad', DAD)            // in my room, by the new bed (L07)
    await mob('villager', 0.5, 30, 80.5, 180, 'dad2', DAD)         // his twin for the doorway (L08): waits past 64 blocks
    await mob('zombie', 0.0, -6, -9.0, 0, 'zombie')                // buried (no sunlight) until the night scenes

    await resendChunks(ctx, X, Z)
    await c('/clear @s')
    await c(`/spawnpoint @s ${A(20, 1, -27)} 180 2`)               // the first respawn lands in my brother's shot
    await ctx.tpCheck(X - 43.5, F + 1, Z + 26.5, 180, 0)
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
    const { P, say, look, line } = K
    const ctl = (name, on) => bot.setControlState(name, on)
    const go = (on) => ctl('forward', on)
    const stop = () => { for (const c of ['forward', 'back', 'left', 'right', 'sprint', 'sneak']) ctl(c, false) }
    const cut = async (...a) => { stop(); await K.cut(...a) }
    const tp = (tag, x, y, z, yaw) => say(`/tp @e[tag=${tag},limit=1] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${yaw.toFixed(1)} 0`)
    const setTime = (n) => { ctx.dayTime = n; say(`/time set ${n}`); ctx.mark('time', { time: n }) }   // no 4-tick wait (ctx.setTime stalls the shot)
    const FAR = [0.5, 30, 80.5]
    const clamp = (u) => Math.max(0, Math.min(1, u))
    // a slow push in for a whole line: sneaking, a step every third tick (no shot holds still)
    const creep = (k, on) => { ctl('sneak', true); go(on && k % 3 === 0) }

    // the zombie is moved every tick (an idle mob's first move reaches the client late)
    const zom = { x: 0.0, y: -6, z: -9.0, yaw: 0 }
    let jig = 0
    bot.on('physicsTick', () => { jig++; tp('zombie', zom.x + (jig % 4 < 2 ? 0.003 : -0.003), zom.y, zom.z, zom.yaw) })

    // deaths: the Respawn button works 20 ticks after the death; smoke drifts in front of the dead camera
    let deadAt = -99, deadView = null
    bot.on('death', () => {
      deadAt = ctx.tick
      const e = bot.entity, cp = Math.cos(e.pitch), d = 2.5
      deadView = new ctx.Vec3(e.position.x - Math.sin(e.yaw) * cp * d, Math.max(F + 1.4, e.position.y + 1.62 + Math.sin(e.pitch) * d), e.position.z - Math.cos(e.yaw) * cp * d)
    })
    bot.on('physicsTick', () => { if (ctx.died && deadView && ctx.tick % 3 === 0) ctx.particles('poof', deadView.offset((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2), { w: 0.8, h: 0.8 }) })
    const respawn = async () => {
      if (!ctx.died) return
      while (ctx.tick < deadAt + 21) await bot.waitForTicks(1)
      const spawned = new Promise(r => { bot.once('spawn', r); setTimeout(r, 3000) })
      ctx.respawn()
      await spawned; ctx.revive(); deadView = null
      K.base = { yaw: bot.entity.yaw - K.swayY(), pitch: bot.entity.pitch - K.swayP() }   // the spawn angle, less the sway look() adds back
    }
    // the fall: in the air beside the cliff, looking down its face at the ground coming up
    const fall = async (id, extra = 0) => {
      await cut(-43.5, 20.5, P(-43.5, 0, 29), 27)
      await line(id, async (k) => {
        if (ctx.died) return
        if (k === 50) say('/damage @s 100 minecraft:fall')   // never needed: 26 blocks is 23 damage
        K.base = { yaw: K.base.yaw, pitch: Math.max(-1.15, K.base.pitch - 0.02) }; look(k)
      }, extra)
    }

    // L01: the rule, over the fall and the death screen (the cold open)
    await fall('L01', -0.15)
    await respawn()                                     // lands in my brother's shot (the spawnpoint)
    say('/item replace entity @s hotbar.0 with iron_pickaxe'); bot.setQuickBarSlot(0)
    say(`/spawnpoint @s ${X + 12} ${F + 1} ${Z + 40} 115 4`)   // the second respawn: the field

    // L02: my brother heard DON'T MINE THE GOLD (card). Behind it was lava (the ore is mined: lava)
    const ORE = P(20, 2, -30)
    let mined = false, digging = false
    const broke = () => { if (mined) return; mined = true; ctx.sound('block.stone.break', 1, 0.8); ctx.particles('block', ORE, { block: 'gold_ore' }); ctx.sound('block.lava.pop', 0.8, 1) }
    ctx.mark('heard_brother')
    await line('L02', async (k, at) => {
      go(!mined && k > 2 && bot.entity.position.z > Z - 27.6)
      ctl('back', mined && bot.entity.position.z < Z - 26.2)   // step back from the lava
      if (!digging && k >= at(3) - 17) {
        digging = true
        const b = bot.blockAt(ORE)
        if (b && b.name === 'gold_ore') bot.dig(b, 'ignore').then(broke, (e) => ctx.log('dig', e.message))
      }
      if (digging && !mined && k % 4 === 0) ctx.sound('block.stone.hit', 0.25, 0.5)
      if (!mined && k >= at(3) + 8) { say(`/setblock ${X + 20} ${F + 2} ${Z - 30} air`); broke() }   // a safety net: the dig should have landed by now
      K.base = K.aim(P(20.5, 2.5, -29.5)); look(k)
    })
    stop(); bot.stopDigging()
    say('/clear @s')

    // L03: my sister heard CLOSE THE DOOR (card; the door shuts). That night a zombie came knocking.
    setTime(18000)
    Object.assign(zom, { x: 27.6, y: 1, z: 16.95, yaw: -90 })
    await cut(31.0, 11.7, P(31.0, 2.2, 15.5))
    ctx.mark('heard_sister')
    await line('L03', async (k, at) => {
      creep(k, bot.entity.position.z < Z + 13.3)
      if (k === at(1) + 3) {
        say(`/setblock ${X + 31} ${F + 2} ${Z + 15} oak_door[half=upper,facing=south,open=false]`)
        say(`/setblock ${X + 31} ${F + 1} ${Z + 15} oak_door[half=lower,facing=south,open=false]`)
        ctx.sound('block.wooden_door.close', 1, 0.9)
      }
      const w0 = at(1) + 8, w1 = w0 + 30                 // he walks past the window to the door (0.13 a tick)
      if (k >= w0) { zom.x = Math.min(31.5, 27.6 + (k - w0) * 0.13); if (k >= w1) zom.yaw = -90 - 90 * clamp((k - w1) / 5) }
      if (k === at(4)) ctx.sound('entity.zombie.ambient', 0.7, 1)
      let jolt = 0
      for (const kk of [w1 + 3, w1 + 9, w1 + 15]) { if (k === kk) ctx.sound('entity.zombie.attack_wooden_door', 0.6, 1); if (k >= kk && k < kk + 4) jolt = Math.sin((k - kk) * 1.6) * 0.025 }
      K.base = K.aim(P(30.4 + 0.9 * clamp((k - w0) / 30), 2.2, 15.5)); look(k, jolt, 0)
    })
    stop()
    Object.assign(zom, { x: 0.0, y: -6, z: -9.0, yaw: 0 })   // back under the ground before the sun is up

    // L04: today I fell off a cliff, and I heard mine (the same fall, in order); L05: the voice (card)
    setTime(6000)
    await fall('L04')
    ctx.mark('voice1')
    await line('L05', async () => {}, -0.15)
    await respawn()                                     // in the field

    // L06: I respawned in a field (the cliff far off); my bed was gone (a turn toward home)
    ctx.mark('no_bed')
    let from = null
    await line('L06', async (k, at) => {
      go(k > 6)
      if (k >= at(2) - 4) { from = from || { ...K.base }; K.turnTo(from, P(-0.5, 2, -5.5), (k - at(2) + 4) / 22) }
      look(k)
    })
    stop()

    // L07: Dad had built me a new one (the bed, Dad beside it). He said it's safer (his face)
    await cut(-1.3, -4.4, P(-0.2, 1.3, -6.6))
    ctx.mark('face_on', { near: [X + 1.3, Z - 5.7, 1], head: true })
    from = null
    await line('L07', async (k, at) => {
      if (k < at(3) - 4) { go(k > 2 && k < 12) } else { creep(k, bot.entity.position.x < X - 0.5) }
      if (k >= at(3) - 4) { from = from || { ...K.base }; K.turnTo(from, P(1.3, 2.55, -5.7), (k - at(3) + 4) / 12) }
      look(k)
    })
    ctx.mark('face_off')
    stop()

    // L08: then he nailed my door shut (he's outside the open door; dark planks fill the doorway, hammer blows)
    tp('dad2', 0.5, 1, -1.7, 180); tp('dad', ...FAR, 180)
    for (let i = 0; i < 2; i++) { await bot.waitForTicks(1); look(0) }
    await cut(-0.6, -6.1, P(0.5, 2.3, -3))
    await line('L08', async (k, at) => {
      creep(k, bot.entity.position.z < Z - 4.6)
      K.base = K.aim(P(0.5, 2.2, -3))
      if (k === at(1)) {
        say(`/fill ${X} ${F + 1} ${Z - 3} ${X} ${F + 2} ${Z - 3} dark_oak_planks`)
        ctx.sound('block.wood.place', 1, 0.8); ctx.mark('nailed')
        tp('dad2', ...FAR, 180)
      }
      for (const kk of [at(1) + 5, at(3), at(3) + 5]) if (k === kk) ctx.sound('entity.zombie.attack_wooden_door', 0.45, 1.5)   // the hammer
      let jolt = 0
      for (const kk of [at(1), at(1) + 5, at(3), at(3) + 5]) if (k >= kk && k < kk + 4) jolt = Math.sin((k - kk) * 1.6) * 0.03
      look(k, jolt, 0)
    })
    stop()

    // L09: that night I heard a second voice (the nailed door, dark windows). My voice (a turn to the bed)
    setTime(18000)
    await cut(-1.4, -4.7, P(0.5, 2.2, -3))
    from = null
    await line('L09', async (k, at) => {
      creep(k, bot.entity.position.z > Z - 5.3)
      if (k >= at(2)) { from = from || { ...K.base }; K.turnTo(from, P(-0.5, 1.4, -6.6), (k - at(2)) / 14) } else K.base = K.aim(P(0.5, 2.2, -3))
      look(k)
    })
    // L10: SLEEP IN THE BED, OR YOU'LL RESPAWN SOMEWHERE THAT ISN'T HOME (card, red): creeping up to the bed
    ctx.mark('voice2')
    await line('L10', async (k, at) => {
      if (k === at(2)) ctx.mark('voice2b')
      creep(k, bot.entity.position.z > Z - 5.9)
      K.base = K.aim(P(-0.6, 1.5, -6.7)); look(k, Math.sin(k / 7) * 0.05, 0)
    })
    stop()

    // L11: but I wasn't dead (full hearts; and a zombie at the window over the bed)
    Object.assign(zom, { x: 0.0, y: 1, z: -9.0, yaw: 0 })
    for (let i = 0; i < 3; i++) { await bot.waitForTicks(1); look(0) }
    await cut(0.3, -4.6, P(-0.1, 2.45, -8))
    ctx.mark('not_dead')
    await line('L11', async (k, at) => {
      creep(k, bot.entity.position.z > Z - 5.4)
      if (k === at(1)) ctx.sound('entity.zombie.ambient', 0.6, 0.9)
      K.base = K.aim(P(-0.1, 2.45, -8)); look(k)
    })
    stop()

    // L12: and the first voice sounded old. Grandpa old (close on the new bed, a slow push)
    await cut(1.2, -4.5, P(-0.5, 1.4, -6.6))
    await line('L12', async (k) => {
      creep(k, bot.entity.position.x > X - 0.1)
      K.base = K.aim(P(-0.5, 1.4, -6.6)); look(k)
    })
    stop()

    // L13: voice one (the nailed door), or voice two (the bed)? Then the question card.
    await cut(-1.4, -5.2, P(0.5, 2.0, -3))
    from = null
    await line('L13', async (k, at) => {
      creep(k, true)
      if (k >= at(1) - 2) { from = from || { ...K.base }; K.turnTo(from, P(-0.5, 1.6, -6.6), (k - at(1) + 2) / 12) }
      look(k)
    })
    ctx.mark('question')
    from = { ...K.base }
    for (let k = 0; k < 34; k++) { K.turnTo(from, P(-0.8, 1.5, -6.6), k / 30); creep(k, bot.entity.position.z > Z - 5.9); look(k); await bot.waitForTicks(1) }   // the card's reading time (1.7 s): a slow lean in on the pillow
    ctx.mark('story_end')
    stop()
    await bot.waitForTicks(4)
    return !ctx.died
  }
}
