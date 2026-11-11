// "Guess the mob by its sound" (worker 13): a series of rounds, each in its own pitch-black room.
// A real game sound plays in the dark (twice), a 3 s countdown runs, then the player places a torch
// (time's up) turns around toward the sound in the dark and puts a torch down: the light reveals the
// mob right behind them, and it reacts.
// (The mob waits BEHIND the player: vanilla light 0 isn't pure black, and a mob in front read as a
// silhouette during the guess.) Rounds escalate from easy to "nobody
// knows". Every room is a closed box (sky light 0), so the screen is near-black until the torch;
// the warden's bioluminescence and the enderman's eyes glow in the dark as in vanilla.
//
//   module.exports = guessSound({ name, caption, red, rounds: [ { mob, sound, label, answer, color, room, react, ... } ] })
//
// Marks per round (n = round index): round, hear, cd3, cd2, cd1, reveal, react; the last round's
// reveal is also 'final_reveal' (the payoff; the Short ends 1 s after it).
const ROOMS = {
  // [walls, floor, ceiling, extra setblocks relative to the room centre (dx, dy, dz, block)]
  barn: ['spruce_planks', 'coarse_dirt', 'spruce_planks', [[-3, 1, -4, 'hay_block'], [-3, 1, -3, 'hay_block'], [-3, 2, -4, 'hay_block'], [3, 1, -4, 'hay_block'], [3, 1, 2, 'hay_block'], [2, 1, -4, 'composter']]],
  cave: ['stone', 'stone', 'stone', [[-3, 1, -2, 'andesite'], [-3, 2, -2, 'andesite'], [3, 1, -3, 'gravel'], [2, 1, -4, 'cobblestone'], [-2, 5, -1, 'cobblestone'], [3, 3, -1, 'andesite'], [-3, 1, 1, 'coal_ore'], [3, 2, 1, 'coal_ore']]],
  deep_dark: ['deepslate', 'sculk', 'deepslate', [[-3, 1, -3, 'sculk'], [3, 1, -2, 'sculk'], [3, 2, -2, 'sculk'], [-2, 1, -4, 'sculk_sensor'], [2, 1, 1, 'sculk_catalyst'], [-3, 1, 1, 'deepslate_tiles'], [-3, 2, 1, 'deepslate_tiles']]],
  ice: ['stone', 'snow_block', 'packed_ice',   // a frozen cave: smooth ice walls gave the dark scan nothing to show
         [[-3, 1, -3, 'snow_block'], [-3, 2, -3, 'snow_block'], [3, 1, -4, 'blue_ice'], [3, 1, 0, 'packed_ice'], [-2, 1, -4, 'powder_snow']]],
  bamboo: ['jungle_log', 'moss_block', 'jungle_planks', [[-3, 1, -4, 'bamboo_block'], [-3, 2, -4, 'bamboo_block'], [3, 1, -3, 'moss_block'], [3, 1, 0, 'jungle_log'], [-3, 1, 0, 'moss_block'], [2, 1, -4, 'bamboo_block']]],
  savanna: ['acacia_planks', 'coarse_dirt', 'acacia_planks', [[-3, 1, -4, 'acacia_log'], [-3, 2, -4, 'acacia_log'], [3, 1, -3, 'hay_block'], [3, 1, 1, 'acacia_log'], [-3, 1, 2, 'hay_block'], [2, 1, -4, 'chest[facing=south]']]],
  farm: ['oak_planks', 'dirt', 'oak_planks', [[-3, 1, -4, 'hay_block'], [-2, 1, -4, 'hay_block'], [-3, 2, -4, 'hay_block'], [3, 0, -4, 'farmland'], [3, 1, -4, 'carrots[age=7]'], [3, 1, 2, 'hay_block'], [-3, 1, 2, 'barrel[facing=up]']]],
  mineshaft: ['stone', 'gravel', 'stone', [[-3, 1, -4, 'oak_fence'], [-3, 2, -4, 'oak_fence'], [-3, 3, -4, 'oak_planks'], [3, 1, -4, 'oak_fence'], [3, 2, -4, 'oak_fence'], [3, 3, -4, 'oak_planks'], [-3, 4, 1, 'cobweb'], [3, 4, -2, 'cobweb'], [2, 5, 3, 'cobweb'], [-3, 1, 3, 'rail'], [-3, 1, 3, 'oak_fence'], [-3, 2, 3, 'oak_fence'], [3, 1, 3, 'oak_fence'], [3, 2, 3, 'oak_fence'], ...[-3, -2, -1, 0, 1, 2, 3].map(x => [x, 3, 3, 'oak_planks']), [2, 1, 4, 'rail'], [1, 1, 4, 'rail'], [-2, 4, 2, 'cobweb']]],
  swamp_hut: ['spruce_planks', 'spruce_planks', 'spruce_planks', [[-3, 1, -4, 'cauldron'], [3, 1, -4, 'crafting_table'], [3, 1, -3, 'brown_mushroom'], [-3, 1, 2, 'flower_pot'], [-3, 3, -2, 'spruce_planks'], [2, 1, 4, 'cauldron'], [-3, 1, 4, 'crafting_table'], [-3, 2, 4, 'flower_pot'], [3, 1, 3, 'brown_mushroom'], [-2, 1, 4, 'barrel[facing=up]']]],
  swamp: ['mud_bricks', 'mud', 'mangrove_planks', [[-3, 1, -4, 'mangrove_roots'], [-3, 2, -4, 'mangrove_roots'], [3, 1, -4, 'clay'], [3, 1, 1, 'mangrove_roots'], [-3, 1, 1, 'brown_mushroom'], [2, 1, -4, 'mud']]],
  nether: ['nether_bricks', 'nether_bricks', 'nether_bricks', [[-3, 1, -4, 'nether_brick_fence'], [-3, 2, -4, 'nether_brick_fence'], [3, 1, -4, 'nether_brick_fence'], [3, 1, 1, 'soul_sand'], [-3, 1, 1, 'nether_wart_block'], [2, 1, -4, 'soul_sand']]],
  beach: ['sandstone', 'sand', 'sandstone', [[-3, 1, -4, 'sand'], [-2, 1, -4, 'sand'], [3, 1, -4, 'sea_pickle[waterlogged=false]'], [3, 1, 1, 'sandstone_slab'], [-3, 1, 2, 'turtle_egg[eggs=3]'], [2, 1, 3, 'dead_bush']]],
  basalt: ['blackstone', 'basalt', 'blackstone', [[-3, 1, -4, 'basalt'], [-3, 2, -4, 'basalt'], [3, 1, -3, 'blackstone'], [3, 1, 1, 'basalt'], [-3, 1, 2, 'gilded_blackstone'], [2, 1, -4, 'polished_blackstone_bricks']]],
  outpost: ['dark_oak_planks', 'dark_oak_planks', 'dark_oak_planks', [[-3, 1, -4, 'dark_oak_log'], [-3, 2, -4, 'dark_oak_log'], [3, 1, -4, 'crafting_table'], [3, 1, 2, 'dark_oak_fence'], [3, 2, 2, 'dark_oak_fence'], [-3, 1, 2, 'barrel[facing=up]'], [-3, 1, 3, 'dark_oak_fence'], [2, 1, 4, 'dark_oak_fence']]],
  moss: ['mossy_cobblestone', 'moss_block', 'mossy_cobblestone', [[-3, 1, -4, 'moss_block'], [-3, 2, -4, 'moss_block'], [3, 1, -3, 'moss_carpet'], [3, 1, 1, 'torchflower'], [-3, 1, 2, 'moss_block'], [2, 1, 4, 'pitcher_plant[half=lower]'], [2, 2, 4, 'pitcher_plant[half=upper]']]],
  jungle: ['jungle_log', 'grass_block', 'jungle_planks', [[-3, 1, -4, 'jungle_leaves[persistent=true]'], [3, 1, -4, 'jungle_leaves[persistent=true]'], [3, 2, -4, 'jungle_leaves[persistent=true]'], [-3, 1, 1, 'fern'], [3, 1, 2, 'cocoa[facing=east]']]]
}
const SPACING = 14   // room centres along x

module.exports = function guessSound (cfg) {
  const R = cfg.rounds
  const last = R.length - 1
  const edit = {
    caption: cfg.caption,
    red: cfg.red,
    dropAt: 'final_reveal',   // the music drop on the twist
    keySounds: ['hear'],   // the mob's call is the game: the song ducks under it and the gate checks it (scripts/key_sounds.py)
    startAt: 'round:-0.05',
    endAfter: `final_reveal:${cfg.endAfter ?? 1.0}`,
    counter: { at: R.map((_, i) => ['count', i]), total: R.length },   // 'count' sits on the cut's tick ('round' came 2 ticks late)
    // a live 3-2-1 with a draining bar from the first listen to the turn (worker 10's countdowns), the
    // round's difficulty as its label
    countdowns: R.map((r, i) => ['cd3', 'turn', r.label, i, 0.5, 0.42]),
    cards: R.map((r, i) => ['lit', r.answer, r.cardSeconds ?? (i === R.length - 1 ? (cfg.endAfter ?? 1.0) + 0.3 : 1.25), r.color || 'green', i]),   // the last card holds to the final frame
    punch: R.map((_, i) => ['lit', i, 1.1]),
    // a short on-screen line for rounds that need one to read without sound (r.hint, on the 'hint' mark)
    subs: R.filter(r => r.hint).map((r, k) => ['hint', r.hint, r.hintSeconds ?? 1.6, k]),
    subsY: 0.77,   // above the hearts row, below the mob
    ...(cfg.edit || {})
  }

  return {
    name: cfg.name,
    biome: 'minecraft:plains',
    caption: cfg.caption,
    edit,
    noChunkRefresh: false,
    expectDeath: !!cfg.expectDeath,

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      if (!g) throw new Error('no dry land')
      const x0 = g.x - Math.floor((R.length - 1) * SPACING / 2), z = g.z, floor = g.y
      this.x0 = x0; this.z = z; this.floor = floor
      await ctx.defaultRules()
      await ctx.cmd('/gamerule log_admin_commands false')
      const span = (R.length - 1) * SPACING + 10
      for (let y0 = floor + 1; y0 <= floor + 10; y0 += 5) await ctx.cmd(`/fill ${x0 - 8} ${y0} ${z - 8} ${x0 + span} ${y0 + 4} ${z + 8} air`)
      await ctx.cmd(`/fill ${x0 - 8} ${floor} ${z - 8} ${x0 + span} ${floor} ${z + 8} grass_block`)
      await ctx.cmd(`/fill ${x0 - 8} ${floor - 3} ${z - 8} ${x0 + span} ${floor - 1} ${z + 8} dirt`)
      await ctx.cmd('/kill @e[type=!player]')
      await ctx.cmd(`/difficulty ${cfg.difficulty || 'normal'}`)   // hostile mobs can't be summoned on peaceful
      for (let i = 0; i < R.length; i++) {
        const r = R[i], cx = x0 + i * SPACING
        const [wall, fl, ceil, extra] = ROOMS[r.room]
        // a closed box: interior x -3..3, z -4..4, y +1..+5 (an enderman and a warden are 2.9 tall)
        await ctx.cmd(`/fill ${cx - 4} ${floor} ${z - 5} ${cx + 4} ${floor + 6} ${z + 5} ${wall}`)
        await ctx.cmd(`/fill ${cx - 4} ${floor + 6} ${z - 5} ${cx + 4} ${floor + 6} ${z + 5} ${ceil}`)
        await ctx.cmd(`/fill ${cx - 3} ${floor} ${z - 4} ${cx + 3} ${floor} ${z + 4} ${fl}`)
        await ctx.cmd(`/fill ${cx - 3} ${floor + 1} ${z - 4} ${cx + 3} ${floor + 5} ${z + 4} air`)
        for (const [dx, dy, dz, b] of extra) await ctx.cmd(`/setblock ${cx + dx} ${floor + dy} ${z + dz} ${b}`)
        if (r.setup) for (const c of r.setup(cx, floor, z)) await ctx.cmd(c)
        // a redstone torch on the wall the player faces in the dark (light 7): a faint red glow to search
        // the room by, which dies out long before the mob behind them (7+ blocks: light 0)
        if (r.dim ?? cfg.dim ?? true) await ctx.cmd(`/setblock ${cx + (i % 2 ? -3 : 3)} ${floor + 3} ${z - 4} redstone_wall_torch[facing=south]`)   // in a corner: the countdown digit sat on it
        if (r.dim ?? cfg.dim ?? true) await ctx.cmd(`/setblock ${cx + (i % 2 ? 3 : -3)} ${floor + 3} ${z - 4} redstone_wall_torch[facing=south]`)   // nether bricks are near-black at that light: a second one
        const my = floor + 1 + (r.mobDy || 0)
        const mx = cx + 0.5 + (r.mobDx ?? (i % 2 ? 0.6 : -0.6))   // a little off-centre, so the turn round goes the short way (alternating sides)
        await ctx.cmd(`/summon ${r.mob} ${mx} ${my} ${z + (r.mobDz ?? 2.5)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Rotation:[${r.mobYaw ?? 180}f,0f],Tags:["m${i}"]${r.nbt ? ',' + r.nbt : ''}}`)
        if (r.held) await ctx.cmd(`/item replace entity @e[tag=m${i},limit=1] weapon.mainhand with ${r.held}`)
      }
      await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
      await ctx.hotbar([['torch', 64], 'wooden_sword', ['bread', 12]])
      await ctx.tpCheck(x0 + 0.5, floor + 1, z - 0.5, 180, cfg.pitch ?? 12)
      await ctx.cmd('/gamemode survival')
      ctx.select(0)
      await bot.waitForTicks(20)
      return { x: x0 + Math.floor(R.length * SPACING / 2), y: floor, z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      // the aimed actions and a followable camera (owner 2026-11-11, r:r38374d: "the camera moves around so quickly ...
      // confusing to follow"): the turn round to the sound and the tilt up onto the mob are lib/act.js's governor, eased,
      // at most TURN deg/s (the old 0.4 s ease turned at ~700 deg/s); the torch goes down only with the crosshair on the
      // floor block it clicks. A stunt keeps its pace with edit cuts on the turn marks ('turn' -> 'turned'), not speed
      const A = require('./act')(ctx, { turnSpeed: cfg.turnSpeed ?? 220, turnAccel: cfg.turnAccel ?? 1100 })
      const { x0, z, floor } = this
      const mobOf = (i) => Object.values(bot.entities).find(e => e.name === R[i].mob && Math.abs(e.position.x - (x0 + i * SPACING + 0.5)) < 2 && Math.abs(e.position.z - z) < 6)
      // listening in the dark: the player scans the room for the sound (left, right, a glance up), so
      // the faint walls keep moving under the countdown; one continuous path across the three calls
      let scanK = 0, scanYaw = 0, scanPitch = 0
      const sway = async (ticks, amp = cfg.scan ?? 0.28) => {
        for (let k = 0; k < ticks; k++, scanK++) {
          await bot.look(scanYaw + Math.sin(scanK * 0.075) * amp, scanPitch + Math.sin(scanK * 0.15) * amp * 0.45, true)   // the nod peaks where the pan turns back (k ~ 21), so the view never stops
          await bot.waitForTicks(1)
        }
      }
      for (let i = 0; i < R.length; i++) {
        const r = R[i], cx = x0 + i * SPACING
        if (i > 0) {   // hard cut to the next dark room (yaw/pitch ride on the tp: lessons, "a cut has to carry its aim")
          const tx = cx + 0.5, tz = z - 0.5
          for (let a = 0; ; a++) {
            ctx.mark('cut')
            bot.chat(`/tp @s ${tx} ${floor + 1} ${tz} 180 ${cfg.pitch ?? 12}`)
            if (a === 0) ctx.mark('count', { n: i })   // on the tp's tick (one tick later still lagged 3 frames)
            let ok = false
            for (let t = 0; t < 10 && !ok; t++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.x - tx) < 0.1 && Math.abs(bot.entity.position.z - tz) < 0.1 }
            if (ok) break
            if (a === 4) throw new Error('teleport did not stick')
          }
          if (bot.health < 20) bot.chat('/effect give @s instant_health 1 5 true')   // a bear's swipe last round: healed behind the cut
        }
        if (i === 0) ctx.mark('count', { n: 0 })
        const mob = mobOf(i)
        if (!mob) { ctx.log('round', i, 'no mob'); return false }
        ctx.mark('round', { n: i, mob: r.mob })
        scanK = 0; scanYaw = bot.entity.yaw; scanPitch = bot.entity.pitch
        await bot.waitForTicks(3)
        // the sound, twice (a second listen mid-countdown)
        const play = () => { for (const s of [].concat(r.sound)) ctx.sound(s, r.volume ?? 1, r.pitch ?? 1) }
        // (r.hearLead ticks: the mark waits for where the sound gets loud, a slow lead-in like the creeper's pitch-0.5 fuse:
        // the key-sound duck finds the clip from its mark, scripts/key_sounds.py)
        play(); if (r.hearLead) bot.waitForTicks(r.hearLead).then(() => ctx.mark('hear', { n: i })); else ctx.mark('hear', { n: i })
        await sway(3)
        // exactly 3.0 s from cd3 to the turn (a 3.15 s window drew a '4' on the live countdown)
        const t0 = ctx.tick
        const swayTo = async (t) => { while (ctx.tick < t) await sway(1) }
        ctx.mark('cd3', { n: i }); await swayTo(t0 + 20)
        ctx.mark('cd2', { n: i }); if (!r.once) { play(); ctx.mark('hear', { n: i }) } await swayTo(t0 + 40)
        ctx.mark('cd1', { n: i }); await swayTo(t0 + 60)
        // time's up: turn round toward where the sound came from (still dark)...
        // the point the view lands on: the mob's eye height (r.lookY over its feet, else 0.85 of its height), live, so
        // the turn ends with the crosshair on its head (owner 2026-11-11, r:r52f94c: "when we look over at the mob, we
        // arent looking directly at it": the old turn aimed at a fixed direction 8-14 deg above the head)
        const eyeOf = () => mob.position.offset(0, r.lookY ?? (mob.height || 1.8) * 0.85, 0)
        const anglesTo = (p) => { const d = p.minus(bot.entity.position.offset(0, bot.getControlState('sneak') ? 1.27 : 1.62, 0)); return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) } }
        ctx.mark('turn', { n: i })
        const tz = z + 1, tx = cx + (r.torchDx || 0)   // (torchDx: off to the side, for a mob that walks up to you)
        // ...looking down at the floor where the torch goes (you place on the face you target): the top face's
        // middle, the crosshair on that block before the click...
        const flr = { x: tx, y: floor, z: tz }
        await A.aimAt(new Vec3(tx + 0.5, floor + 0.95, tz + 0.5), { on: flr, tol: 0.02, max: 60, strict: false })
        ctx.mark('turned', { n: i })
        // ...put it down (the place mark lets the renderer predict it like the client)...
        await A.click(flr, 1, [0.5, 1, 0.5], { deg: 0, also: () => {
          ctx.mark('place', { x: tx, y: floor + 1, z: tz })
          bot.swingArm(); ctx.sound('block.wood.place', 1, 0.8)   // BlockItem: the sound type's pitch x 0.8
        } })
        ctx.mark('reveal', { n: i, mob: r.mob })
        const revealTick = ctx.tick
        // ...and tilt up onto what the light shows (aim a little above the head: the mob sits below the answer card)
        await A.turnTo(eyeOf(), { tol: 0.015, max: 40 })
        ctx.mark('look_at', { id: mob.id, n: i })   // the landing: the aim check measures the mob's offset from centre here (lib/aim.js lookAts)
        let litTick = ctx.tick + 3
        bot.waitForTicks(3).then(() => { litTick = ctx.tick; ctx.mark('lit', { n: i }) })   // the relight lands a few ticks after the placement: the answer card waits for it
        if (i === last) ctx.mark('final_reveal')
        if (r.hint) bot.waitForTicks(r.hintDelay ?? 5).then(() => ctx.mark('hint', { n: i }))
        ctx.mark('react', { n: i })
        // the view never holds still on the reveal: lean in on the harmless ones, back off from the scary ones
        const lean = r.lean ?? 1
        if (lean > 0) { bot.setControlState('sneak', true); bot.setControlState('forward', true) }
        const stopLean = bot.waitForTicks(r.leanTicks ?? 10).then(() => { bot.setControlState('forward', false); bot.setControlState('sneak', false) })
        r._i = i
        // some reactions are the mob's own AI (the enderman's scream when looked at, the warden's roar, a
        // polar bear rearing up): it gets its AI back on the reveal, set up by r.ai(uuid) NBT
        if (r.ai) bot.chat(`/data merge entity @e[tag=m${i},limit=1] {NoAI:0b${r.ai === true ? '' : ',' + r.ai(uuidInts(bot.player.uuid), Number(bot.time.age))}}`)
        // and a slow sway of the view while it reacts (a held stare read as a frozen frame), kept ON the mob: the old
        // drift walked 0.23-0.5 deg a tick off it. A sway of about 2 deg about the mob's eye point (a 1.5 deg one held
        // 0.63 s still on the witch: rec_check 'held')
        let drifting = true
        const drift = (async () => {
          for (let k = 0; drifting; k++) {
            if (!ctx.died && !ctx.following) {
              const a = anglesTo(eyeOf()), amp = Math.min(1, k / 4) * 0.036
              await bot.look(a.yaw + (i % 2 ? 1 : -1) * amp * Math.sin(k * 0.13), a.pitch + amp * 0.45 * Math.sin(k * 0.2), true)
            }
            await bot.waitForTicks(1)
          }
        })()
        await (REACT[r.react] || REACT.look)(ctx, mob, r, i)
        await stopLean
        if (i === last && !ctx.died) await bot.waitForTicks(cfg.tailTicks ?? 36)   // footage for the edit's end (a hint line gets reading time)
        if (i < last) await bot.waitForTicks(r.hold ?? 4)   // (still drifting up to the cut: it froze 0.13 s before each)
        if (i < last) while (ctx.tick < litTick + Math.ceil((r.cardSeconds ?? 1.25) * 20) + 1) await bot.waitForTicks(1)   // the answer card is gone before the cut (it spilled into the next room)
        drifting = false; await drift
        if (r.ai) bot.chat(`/data merge entity @e[tag=m${i},limit=1] {NoAI:1b}`)   // and freezes again behind the cut
      }
      return true
    }
  }
}

// a UUID string as the int array NBT wants
function uuidInts (u) {
  const h = String(u).replace(/-/g, '')
  return `[I;${[0, 8, 16, 24].map(k => (parseInt(h.slice(k, k + 8), 16) | 0)).join(',')}]`
}

// What the mob does once it's lit (each ~1.5-2 s, so the reveal lands with motion).
const REACT = {
  async look (ctx, mob) {   // it turns its head to you
    ctx.mark('face_on', { ids: [mob.id], head: true })
    await ctx.bot.waitForTicks(24)
    ctx.mark('face_off')
  },
  async moo (ctx, mob, r) {
    ctx.mark('face_on', { ids: [mob.id], head: true })
    await ctx.bot.waitForTicks(8)
    ctx.sound('entity.cow.ambient', 1, 1)
    await ctx.bot.waitForTicks(20)
    ctx.mark('face_off')
  },
  // an enderman looked in the eyes screams and teleports (here: away, with its portal particles)
  async stare (ctx, mob, r) {
    // looked in the eyes, it screams with its jaw open (staged 'creepy' pose), you flinch, and it
    // teleports away (burst and sound on the tick it goes)
    const { bot } = ctx
    const p0 = mob.position.clone()
    ctx.mark('pose', { ids: [mob.id], creepy: true })
    ctx.sound('entity.enderman.stare', 1, 1)
    ctx.mark('stare')
    const pp = () => ctx.particles('portal', { x: p0.x, y: p0.y, z: p0.z }, { count: 12 })   // an enderman always gives off portal particles
    pp()
    await bot.waitForTicks(6)
    ctx.sound('entity.enderman.scream', 1, 1)
    bot.setControlState('back', true); setTimeout(() => bot.setControlState('back', false), 250)   // flinch
    pp()
    await bot.waitForTicks(10)
    ctx.particles('portal', { x: p0.x, y: p0.y, z: p0.z }, { count: 60 })
    ctx.sound('entity.enderman.teleport', 1, 1)
    ctx.mark('teleport')
    bot.chat(`/tp @e[tag=m${r._i},limit=1] ${p0.x.toFixed(2)} ${(p0.y + 60).toFixed(2)} ${(p0.z + 200).toFixed(2)}`)   // gone: out of tracking range
    ctx.mark('pose_off', { ids: [mob.id] })
    await bot.waitForTicks(8)
  },
  // the warden roars; you back off
  async roar (ctx, mob) {
    const { bot } = ctx
    ctx.sound('entity.warden.roar', 1, 1)
    ctx.mark('roar')
    ctx.mark('pose', { ids: [mob.id], roar: true })   // the roar pose, staged (a summoned warden wouldn't roar on its own: worker 11's pose marks)
    bot.setControlState('back', true)
    await bot.waitForTicks(10)
    bot.setControlState('back', false)
    await bot.waitForTicks(16)
  },
  async growl (ctx, mob) {   // a polar bear's warning: it rears up on its hind legs (staged 'standing' pose) and you step back
    const { bot } = ctx
    ctx.mark('pose', { ids: [mob.id], standing: true })
    ctx.sound('entity.polar_bear.warning', 1, 1)
    ctx.mark('roar')
    bot.setControlState('back', true)
    await bot.waitForTicks(6)
    bot.setControlState('back', false)
    await bot.waitForTicks(18)
    ctx.mark('pose_off', { ids: [mob.id] })
  },
  // a baby panda sneezes, and now and then a slime ball comes out (vanilla Panda.sneeze)
  async sneeze (ctx, mob) {
    const { bot } = ctx
    ctx.sound('entity.panda.pre_sneeze', 1, 1.5)
    await bot.waitForTicks(12)
    ctx.sound('entity.panda.sneeze', 1, 1.5)
    ctx.mark('sneeze')
    const yaw = 0   // it faces +z (towards the player)
    bot.chat(`/summon item ${mob.position.x.toFixed(2)} ${(mob.position.y + 0.45).toFixed(2)} ${(mob.position.z + 0.5).toFixed(2)} {Item:{id:"minecraft:slime_ball",count:1},PickupDelay:200,Motion:[0.0,0.15,${0.18 + yaw}]}`)
    await bot.waitForTicks(22)
  },
  // a llama spits at you (LlamaSpit, from its mouth toward your face)
  async spit (ctx, mob) {
    const { bot } = ctx
    ctx.mark('face_on', { ids: [mob.id], head: true })
    await bot.waitForTicks(6)
    const m = mob.position.offset(0, 1.6, -0.6), e = bot.entity.position.offset(0, 1.5, 0), d = e.minus(m), n = Math.hypot(d.x, d.y, d.z)
    const v = 0.6 / n
    bot.chat(`/summon llama_spit ${m.x.toFixed(2)} ${m.y.toFixed(2)} ${m.z.toFixed(2)} {Motion:[${(d.x * v).toFixed(3)},${(d.y * v + 0.05).toFixed(3)},${(d.z * v).toFixed(3)}]}`)
    ctx.sound('entity.llama.spit', 1, 1)
    ctx.mark('spit')
    await bot.waitForTicks(22)
    ctx.mark('face_off')
  },
  // the mob answers (r.reactSound), and on a scary one you back off (r.back ticks)
  async call (ctx, mob, r) {
    const { bot } = ctx
    ctx.mark('face_on', { ids: [mob.id], head: true })
    await bot.waitForTicks(r.reactDelay ?? 6)
    for (const s of [].concat(r.reactSound || r.sound)) ctx.sound(s, r.reactVolume ?? 1, r.reactPitch ?? 1)
    ctx.mark('again')
    if (r.back) { bot.setControlState('back', true); await bot.waitForTicks(r.back); bot.setControlState('back', false) }
    await bot.waitForTicks(r.reactTicks ?? 14)
    ctx.mark('face_off')
  },
  // it isn't a parrot this time: the creeper is ignited by the light... and goes off (the death screen follows)
  async boom (ctx, mob, r) {
    const { bot } = ctx
    bot.chat(`/data merge entity @e[type=creeper,tag=m${r._i},limit=1] {ignited:1b,Fuse:${r.fuse ?? 30}}`)
    ctx.sound('entity.creeper.primed', 1, 0.5)
    ctx.mark('ignite')
    // lean in to check it's the parrot again... (a 3-block blast on hard kills: ~25 of 20 HP)
    bot.setControlState('sneak', true); bot.setControlState('forward', true)
    for (let k = 0; k < 60 && !ctx.died; k++) { await bot.waitForTicks(1); if (k === 8) bot.setControlState('forward', false) }
    bot.setControlState('sneak', false); bot.setControlState('forward', false)
    await bot.waitForTicks(30)
  },
  // an allay bobs in the air and chirps back (staged: small /tp steps, which the renderer glides like the client)
  async hover (ctx, mob, r) {
    const { bot } = ctx
    const p0 = mob.position.clone()
    ctx.mark('face_on', { ids: [mob.id], head: true })
    for (let k = 0; k < 30; k++) {
      if (k === 6) { for (const s of [].concat(r.reactSound || r.sound)) ctx.sound(s, 1, 1); ctx.mark('again') }
      const y = p0.y + Math.sin(k * 0.3) * 0.18, x = p0.x + Math.sin(k * 0.13) * 0.25
      bot.chat(`/tp @e[tag=m${r._i},limit=1] ${x.toFixed(3)} ${y.toFixed(3)} ${p0.z.toFixed(3)}`)
      await bot.waitForTicks(1)
    }
    ctx.mark('face_off')
  },
  // the parrot does it again: it was imitating a creeper
  async imitate (ctx, mob, r) {
    const { bot } = ctx
    ctx.mark('face_on', { ids: [mob.id], head: true })
    await bot.waitForTicks(6)
    for (const s of [].concat(r.sound)) ctx.sound(s, r.volume ?? 1, r.pitch ?? 1)
    ctx.mark('again')
    await bot.waitForTicks(14)
  }
}
