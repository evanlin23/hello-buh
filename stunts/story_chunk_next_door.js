// Story Short "something walks out of the fog every night 😳" (stories/chunk_next_door, premise #4
// "The Chunk Next Door"). For 700 nights something has walked out of the fog next to the narrator's
// house. It never attacks him (not even when he throws snowballs at it). It harvests his wheat,
// replants it and uses the composter; at sunrise it catches fire and runs back into the fog; it pays
// an emerald for the wheat he leaves out; the iron golem lets it walk by. Every night it stops at
// Gary's old house and knocks, and Gary has been gone for 700 nights. Tonight he waits in the fog
// and looks it in the face: the game shows its name tag. Gary. The reveal is never said aloud.
//
// Minecraft that makes it click on a rewatch: a name-tagged villager keeps its name (and its
// farmer's straw hat) when a zombie turns it; a named mob never despawns; zombie villagers burn at
// sunrise; farmers harvest, replant, compost and pay emeralds for wheat; a mob's name tag only shows
// with the crosshair on it within reach (3 blocks), which is why he never saw it before.
//
// One scene per line (docs/stories.md): each lasts its spoken length + gap, actions land on caption
// chunks (at(k)). Render distance 2 (vanilla's lowest) puts the fog 32 blocks out. One zombie
// villager per scene, buried under its first spot and brought up a few ticks before its cut (the
// spots are out of the shot before, or past the fog); every actor is teleported every tick.
const path = require('path')
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'chunk_next_door')
const CAPTION = 'something walks out of the fog every night 😳'
const NIGHT = 18000, DAWN = 23300, MORNING = 1000

module.exports = {
  name: 'story_chunk_next_door',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: { caption: CAPTION, red: 'fog', story: 'stories/chunk_next_door', startAt: 'line:0', endAfter: 'name:1.4', zoom: [['name:0.15', 'name:1.4', 1.1]] },
  time: NIGHT,
  brightness: 1,           // Options > Brightness: Bright (the night scenes still read)
  renderDistance: 2,       // vanilla's lowest: the fog starts 28 blocks out and ends at 32

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
    await c('/difficulty normal')                 // zombie villagers don't exist on peaceful
    await c('/gamerule mob_griefing false')
    await c('/gamerule block_drops false')        // the harvest breaks the crops for real (sound, particles); nothing to pick up
    await c('/gamerule random_tick_speed 0')      // the wheat grows only when the story says so
    await c('/gamerule log_admin_commands false') // per-tick `tp`s flooded the bot with op broadcasts
    await clearSet(ctx, A, 64, 28)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 30)

    const post = async (x, z) => { await c(`/fill ${A(x, 1, z)} ${A(x, 2, z)} oak_fence`); await c(`/setblock ${A(x, 3, z)} lantern`) }

    // --- HOME: my house (x -3..2, z 3..8), the door on the north wall at x -1, a path north into the fog
    await house(ctx, A, -3, 3, -1, 3, 'north', true)
    await c(`/fill ${A(-2, 0, -44)} ${A(0, 0, 2)} dirt_path`)
    await post(-4, 1); await post(2, 1)
    await post(-3, -14); await post(1, -14)       // the last lamps before the dark: where it comes out, and where I wait
    for (const [dx, dz, b] of [[-3, 2, 'poppy'], [1, 2, 'dandelion'], [-3, -8, 'cornflower'], [1, -14, 'oxeye_daisy'], [2, -5, 'poppy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // the lane behind the house, running west (L02, L03)
    await c(`/fill ${A(-40, 0, 13)} ${A(8, 0, 14)} dirt_path`)
    await post(-13, 11)

    // --- THE FARM (x -54..-45, z -14..-4): wheat around a water row, fenced, the composter at the east end
    await c(`/fill ${A(-54, 0, -14)} ${A(-45, 0, -4)} farmland[moisture=7]`)
    await c(`/fill ${A(-54, 1, -14)} ${A(-45, 1, -4)} wheat[age=7]`)
    await c(`/fill ${A(-54, 0, -9)} ${A(-45, 0, -9)} water`)
    await c(`/fill ${A(-54, 1, -9)} ${A(-45, 1, -9)} air`)
    await c(`/fill ${A(-55, 1, -15)} ${A(-55, 1, -3)} oak_fence`)
    await c(`/fill ${A(-55, 1, -15)} ${A(-40, 1, -15)} oak_fence`)
    await c(`/fill ${A(-55, 1, -3)} ${A(-40, 1, -3)} oak_fence`)
    await c(`/setblock ${A(-44, 1, -6)} composter[level=0]`)
    await post(-55, -3); await post(-42, -3); await post(-42, -15); await post(-55, -15)
    // the hay he has stacked up over 700 nights (L09)
    for (let y = 1; y <= 9; y++) { const r = y <= 3 ? 2 : y <= 6 ? 1 : 0; await c(`/fill ${A(-38 - r, y, -10 - r)} ${A(-38 + r, y, -10 + r)} hay_block`) }
    for (const [dx, dz, b] of [[-43, -12, 'pumpkin'], [-42, -11, 'melon'], [-43, -9, 'pumpkin'], [-42, -7, 'melon']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)

    // --- GARY'S: his old house (x 45..50, z -6..-1), dark, the door shut, his sign by it; the golem's post
    await house(ctx, A, 45, -6, 47, -6, 'north', false, 'spruce_planks')
    await c(`/setblock ${A(47, 4, -4)} spruce_planks`); await c(`/setblock ${A(48, 4, -3)} spruce_planks`)   // nobody home: no light inside
    await c(`/setblock ${A(49, 2, -7)} oak_wall_sign[facing=north]{front_text:{color:"white",has_glowing_text:1b,messages:["","GARY'S","HOUSE",""]}}`)
    await c(`/fill ${A(46, 0, -30)} ${A(48, 0, -7)} dirt_path`)
    await c(`/setblock ${A(45, 3, -7)} cobweb`); await c(`/setblock ${A(50, 3, -7)} cobweb`)
    await c(`/setblock ${A(46, 1, -7)} dead_bush`)
    await post(50, -20)

    // --- the cast: every one NoAI, buried under its first spot until its scene
    const zv = (tag, x, z, more = 'Invulnerable:1b,') => c(`/summon zombie_villager ${(X + x).toFixed(2)} ${F - 8} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,${more}CanPickUpLoot:0b,Tags:["${tag}","zv"],Rotation:[0f,0f],VillagerData:{profession:"minecraft:farmer",type:"minecraft:plains",level:2}}`)
    await zv('a1', -0.5, -24)
    await zv('a2', -7.2, 13.5, '')             // the snowballs have to land: not invulnerable
    await zv('a4', -52.5, -5.5)
    await zv('a7', -0.5, -11.5)
    await zv('a10', 40.5, -17.5)
    await zv('a11', -3.6, -2.5)
    await zv('a12', 47.5, -11.5)
    await zv('gary', -0.5, -22, 'Invulnerable:1b,CustomName:"Gary",')
    await c(`/summon iron_golem ${X + 46.5} ${F + 1} ${Z - 20.5} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["golem"],Rotation:[0f,0f]}`)
    const vil = (tag, x, z, prof) => c(`/summon villager ${(X + x).toFixed(2)} ${F - 8} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[0f,0f],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1}`)
    await vil('v1', -41.5, -5.5, 'librarian'); await vil('v2', -40.3, -7.2, 'mason')

    await ctx.hotbar([null, ['snowball', 16]])
    ctx.select(2)
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X - 0.5, F + 1, Z + 1.5, 180, 0)
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
    const { P, say, look, cut } = K
    const T = (id) => Math.round((S.line(id).dur + S.gap) * 20)
    const go = (on, key = 'forward') => bot.setControlState(key, on)
    const setTime = (n) => { ctx.dayTime = n; say(`/time set ${n}`); ctx.mark('time', { time: n }) }
    // a cut into another time of day: the time changes while the teleport is in the air, so the new light
    // arrives with the new shot (set after the cut landed, the first frames of the dawn shot were still night)
    const cutAt = async (time, dx, dz, target, lead = 1) => {
      let n = 0
      const tick = () => { if (n++ === lead) setTime(time) }
      bot.on('physicsTick', tick)
      await cut(dx, dz, target)
      bot.removeListener('physicsTick', tick)
      if (n <= lead) setTime(time)
    }

    // the actors on stage: each is teleported every tick (a mob that sat still starts ~1 s late)
    const acts = new Map()
    const yawOf = (dx, dz) => Math.atan2(-dx, dz) * 180 / Math.PI
    bot.on('physicsTick', () => {
      for (const [tag, a] of acts) say(`/tp @e[tag=${tag},limit=1] ${(X + a.x).toFixed(3)} ${(F + (a.y ?? 1)).toFixed(3)} ${(Z + a.z).toFixed(3)} ${a.yaw.toFixed(1)} ${(a.pitch || 0).toFixed(1)}`)
    })
    const raise = (tag, a) => { acts.set(tag, a); return a }
    const bury = (tag) => { const a = acts.get(tag); acts.delete(tag); if (a) say(`/tp @e[tag=${tag},limit=1] ${(X + a.x).toFixed(3)} ${F - 8} ${(Z + a.z).toFixed(3)}`) }
    const step = (a, dx, dz) => { a.x += dx; a.z += dz; if (dx || dz) a.yaw = yawOf(dx, dz) }
    // one line: scene(k, at) every tick; `tail` runs once, 8 ticks before the line ends (bring the next actor up)
    const line = (id, scene, tail, extra = 0) => {
      const n = Math.round((S.line(id).dur + S.gap + extra) * 20)
      return K.line(id, async (k, at) => { if (tail && k === n - 8) tail(); await scene(k, at, n) }, extra)
    }
    const groan = (v = 1, p = 1) => ctx.sound('entity.zombie_villager.ambient', v, p)

    // ---------- L01: it walks out of the fog, down the path to my house
    const a1 = raise('a1', { x: -0.5, z: -24, yaw: 0 })
    await cut(-0.5, 1.5, P(-0.5, 1.4, -22))
    for (let i = 0; i < 14; i++) { step(a1, 0, 0.11); look(0); await bot.waitForTicks(1) }
    let a2
    await line('L01', async (k) => {
      step(a1, 0, 0.11)
      go(k > 30 && k < 44, 'back')              // a step back toward my door
      if (k === 4) groan(0.5, 0.9)
      K.base = K.aim(P(-0.5, 1.3, a1.z)); look(k)
    }, () => { a2 = raise('a2', { x: -7.2, z: 13.5, yaw: 90 }) })
    go(false, 'back')

    // ---------- L02 + L03: it walks right past me; the snowballs
    await cut(-8.6, 15.7, P(a2.x - 0.9, 1.4, 13.5))
    bury('a1')
    await line('L02', async (k) => {
      step(a2, -0.1, 0)
      K.base = K.aim(P(a2.x, 1.35, a2.z)); look(k)
    }, () => ctx.select(1))
    let thrown = 0
    await line('L03', async (k, at) => {
      step(a2, -0.1, 0)
      K.base = K.aim(P(a2.x, 1.75, a2.z)); look(k)
      if ([at(1) - 2, at(1) + 5, at(1) + 12].includes(k)) { bot.activateItem(); bot.swingArm(); ctx.sound('entity.snowball.throw', 0.5, 0.5); thrown++ }
      if ([at(1) + 3, at(1) + 10, at(1) + 17].includes(k)) ctx.sound('entity.zombie_villager.hurt', 0.9, 1)
    }, () => { raise('a4', { x: -52.5, z: -5.5, yaw: -90 }); ctx.select(2) })

    // ---------- L04: it harvests my wheat (the row it walks and the rows beside it)
    const a4 = acts.get('a4')
    const cutCol = new Set(), cropList = []
    const harvest = () => {
      const col = Math.floor(a4.x - 0.2)
      if (col < -54 || col > -45 || cutCol.has(col)) return
      cutCol.add(col)
      for (const dz of [-6, -5, -7]) { say(`/setblock ${X + col} ${F + 1} ${Z + dz} air destroy`); cropList.push([col, dz]) }
    }
    await cut(-49.5, -1.3, P(a4.x + 1.2, 1.2, -5.5))
    bury('a2')
    await line('L04', async (k) => {
      step(a4, 0.11, 0); harvest()
      K.base = K.aim(P(a4.x + 0.8, 1.2, -5.5)); look(k)
    })
    // ---------- L05: it replants it, and it uses the composter
    let comp = 0
    const compost = (n) => {
      comp = n
      say(`/setblock ${X - 44} ${F + 1} ${Z - 6} composter[level=${n}]`)
      ctx.sound(n === 8 ? 'block.composter.ready' : 'block.composter.fill_success', 1, 1)
      ctx.particles('happy', P(-43.5, 1.9, -5.5), { count: 4 })
    }
    await cut(-45.5, -0.4, P(a4.x + 1, 1.0, -5.5))
    let planted = 0
    await line('L05', async (k, at) => {
      if (a4.x < -44.75) { step(a4, 0.1, 0); harvest() }
      if (k >= 2 && k % 2 === 0 && planted < cropList.length) { const [cx, cz] = cropList[planted++]; say(`/setblock ${X + cx} ${F + 1} ${Z + cz} wheat[age=0]`); if (planted % 3 === 1) ctx.sound('item.crop.plant', 0.9, 1) }
      if (a4.x >= -44.75 && k >= at(2) && comp < 3 && k % 6 === 0) compost(comp + 1)
      K.base = K.aim(P(Math.min(a4.x + 0.9, -44.2), 1.1, -5.5)); look(k)
    })
    // ---------- L06: zombies don't compost (close on the composter filling up, the bone meal popping out)
    await cut(-46.7, -3.6, P(-44.0, 1.25, -5.5))
    await line('L06', async (k, at) => {
      if (a4.x < -44.75) step(a4, 0.1, 0)
      while (planted < cropList.length) { const [cx, cz] = cropList[planted++]; say(`/setblock ${X + cx} ${F + 1} ${Z + cz} wheat[age=0]`) }
      if ([2, 6, 10, 14].includes(k) && comp < 7) compost(comp + 1)
      if (k === 18) compost(8)
      if (k === at(2) + 3) {
        say(`/setblock ${X - 44} ${F + 1} ${Z - 6} composter[level=0]`); comp = 0
        ctx.sound('block.composter.empty', 1, 1)
        say(`/summon item ${X - 43.5} ${F + 2.1} ${Z - 5.5} {Item:{id:"minecraft:bone_meal",count:1},Motion:[-0.06d,0.3d,0.09d],PickupDelay:32767}`)
      }
      go(k < 12)
      look(k, at(1) <= k && k < at(2) + 8 ? Math.sin((k - at(1)) / 1.9) * 0.06 : 0)   // a little head shake on "don't"
    }, () => raise('a7', { x: -0.5, z: -11.5, yaw: 180 }))
    go(false)

    // ---------- L07: at sunrise it catches fire and runs back into the fog
    const a7 = acts.get('a7')
    await cutAt(DAWN, -0.5, -4.5, P(-0.5, 1.3, a7.z))
    bury('a4'); say('/kill @e[type=item]')
    await line('L07', async (k, at) => {
      if (k === at(1) - 1) { say('/data merge entity @e[tag=a7,limit=1] {Fire:400s}'); ctx.sound('entity.zombie_villager.hurt', 0.8, 1.1); ctx.sound('block.fire.ambient', 1, 1) }
      step(a7, 0, k < at(3) - 4 ? -0.07 : -Math.min(0.3, 0.07 + (k - at(3) + 4) * 0.04))
      go(k >= at(3) && k < at(3) + 16)
      K.base = K.aim(P(-0.5, 1.3, a7.z)); look(k)
    }, () => {
      say(`/summon item ${X - 0.5} ${F + 1.1} ${Z + 2.3} {Item:{id:"minecraft:emerald",count:1},Tags:["pay"],PickupDelay:0}`)
      for (const [cx, cz] of cropList) say(`/setblock ${X + cx} ${F + 1} ${Z + cz} wheat[age=7]`)   // grown again for L09
    })
    go(false)

    // ---------- L08: by morning it had paid me (the emerald on my doorstep)
    await cutAt(MORNING, -0.5, 6.7, P(-0.5, 1.15, 2.3))
    bury('a7')
    await line('L08', async (k, at) => {
      go(k >= at(4) - 2 && bot.entity.position.z > Z + 2.6)
      K.base = K.aim(P(-0.5, 1.2, 2.3)); look(k)
    }, () => { raise('v1', { x: -41.5, z: -5.5, yaw: -100 }); raise('v2', { x: -40.3, z: -7.2, yaw: -120 }) })
    go(false)

    // ---------- L09: the best farmer this village ever had (the field grown back, the hay he has stacked)
    await cut(-51.5, -1.3, P(-47, 1.2, -8))
    let from9 = null
    await line('L09', async (k, at) => {
      go(k < at(2), 'right')
      if (k >= at(1) - 2) { from9 = from9 || { ...K.base }; K.turnTo(from9, P(-38.5, 7.2, -9.5), (k - at(1) + 2) / 26) }
      look(k)
    }, () => raise('a10', { x: 40.5, z: -17.5, yaw: -90 }))
    go(false, 'right')

    // ---------- L10: the iron golem lets it walk right by
    const a10 = acts.get('a10')
    const golem = raise('golem', { x: 46.5, z: -20.5, yaw: 0 })
    const watch = () => { golem.yaw = yawOf(a10.x - golem.x, a10.z - golem.z) }
    watch()
    await cutAt(NIGHT, 46.5, -12.5, P(46.5, 2.0, -20.5))
    bury('v1'); bury('v2')
    await line('L10', async (k, at) => {
      step(a10, 0.115, 0); watch()
      look(k, Math.max(-0.16, Math.min(0.16, (a10.x - 46.5) * 0.03)))
    }, () => raise('a11', { x: -3.6, z: -2.5, yaw: -90 }))

    // ---------- L11: I've never seen its face (from inside my door: it crosses in the dark)
    const a11 = acts.get('a11')
    await cut(-0.5, 6.7, P(-0.5, 1.6, -2.5))
    bury('a10'); acts.delete('golem')
    await line('L11', async (k, at) => {
      step(a11, 0.1, -0.012)
      go(k >= at(1) && bot.entity.position.z > Z + 4.3)
      if (k >= at(1)) K.base = K.aim(P(Math.min(a11.x, 2.2), 1.5, a11.z))
      look(k)
    }, () => raise('a12', { x: 47.5, z: -11.5, yaw: 0 }))
    go(false)

    // ---------- L12: every night it stops at Gary's old house
    const a12 = acts.get('a12')
    await cut(47.5, -17.5, P(47.9, 1.5, -7))
    bury('a11')
    await line('L12', async (k) => {
      if (a12.z < -6.95) step(a12, 0, 0.1)
      bot.setControlState('sneak', true); go(true)
      look(k)
    })
    bot.setControlState('sneak', false); go(false)
    // ---------- L13: it knocks, nobody answers; Gary has been gone for 700 nights (the sign)
    await cut(50.4, -10.6, P(47.9, 1.5, -6.6))
    let from13 = null
    await line('L13', async (k, at) => {
      if (a12.z < -6.95) step(a12, 0, 0.1)
      for (const t of [at(0), at(0) + 6, at(1) + 2, at(1) + 8]) {
        if (k === t) { ctx.sound('entity.zombie.attack_wooden_door', 1, 1); a12.z += 0.12 }
        if (k === t + 2) a12.z -= 0.12
      }
      if (k >= at(3) - 3) { from13 = from13 || { ...K.base }; K.turnTo(from13, P(49.5, 2.45, -6.9), (k - at(3) + 3) / 16) }
      go(k >= at(3) && bot.entity.position.z < Z - 8.9)
      look(k)
    }, () => raise('gary', { x: -0.5, z: -22, yaw: 0 }))
    go(false)

    // ---------- L14: tonight I waited in the fog (my house, far off; then the sound behind me)
    const gary = acts.get('gary')
    const CAMZ = -10.2
    await cut(-0.5, CAMZ, P(-0.5, 1.8, 3))
    bury('a12')
    let from14 = null
    const STOP = CAMZ - 3.75, NEAR = CAMZ - 2.9       // out of reach, then one step into it (reach is 3 blocks to its hitbox)
    const garyWalk = () => { if (gary.z < STOP) step(gary, 0, Math.min(0.105, (STOP - gary.z) * 0.2 + 0.01)) }
    await line('L14', async (k, at) => {
      garyWalk()
      if (k === at(2) - 6) groan(1, 1)
      if (k >= at(2) - 3) { from14 = from14 || { ...K.base }; K.turnTo(from14, P(-0.5, 1.25, gary.z), (k - at(2) + 3) / 16) }
      look(k)
    })
    // ---------- L15: it walked right up to me, into the lamp light
    await line('L15', async (k) => { garyWalk(); K.base = K.aim(P(-0.5, 1.25, gary.z)); look(k) })
    // ---------- L16: and I finally looked it in the face. One more step, into reach: the name tag
    let from16 = null, named = false
    K.sway = 0.45
    const reveal = async (k, at) => {
      from16 = from16 || { ...K.base }
      K.turnTo(from16, P(-0.5, 1.5, NEAR), (k - 1) / (at(3) - 1))
      if (k >= at(3) - 4 && gary.z < NEAR) gary.z = Math.min(NEAR, gary.z + 0.1)
      if (!named && gary.z >= CAMZ - 3.28) { named = true; ctx.mark('name'); groan(1, 0.85) }
      look(k)
    }
    await line('L16', reveal)
    const at16 = S.line('L16').at
    for (let i = 0; i < 44; i++) { await reveal(T('L16') + i, at16); await bot.waitForTicks(1) }
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return named && thrown === 3
  }
}
