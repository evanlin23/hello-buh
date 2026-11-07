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
  ice: ['packed_ice', 'snow_block', 'packed_ice', [[-3, 1, -3, 'snow_block'], [-3, 2, -3, 'snow_block'], [3, 1, -4, 'blue_ice'], [3, 1, 0, 'packed_ice'], [-2, 1, -4, 'powder_snow']]],
  bamboo: ['jungle_log', 'moss_block', 'jungle_planks', [[-3, 1, -4, 'bamboo_block'], [-3, 2, -4, 'bamboo_block'], [3, 1, -3, 'moss_block'], [3, 1, 0, 'jungle_log'], [-3, 1, 0, 'moss_block'], [2, 1, -4, 'bamboo_block']]],
  savanna: ['acacia_planks', 'coarse_dirt', 'acacia_planks', [[-3, 1, -4, 'acacia_log'], [-3, 2, -4, 'acacia_log'], [3, 1, -3, 'hay_block'], [3, 1, 1, 'acacia_log'], [-3, 1, 2, 'hay_block'], [2, 1, -4, 'chest[facing=south]']]],
  farm: ['oak_planks', 'dirt', 'oak_planks', [[-3, 1, -4, 'hay_block'], [-2, 1, -4, 'hay_block'], [-3, 2, -4, 'hay_block'], [3, 1, -4, 'carrots[age=7]'], [3, 1, 2, 'hay_block'], [-3, 1, 2, 'barrel[facing=up]']]],
  mineshaft: ['stone', 'gravel', 'stone', [[-3, 1, -4, 'oak_fence'], [-3, 2, -4, 'oak_fence'], [-3, 3, -4, 'oak_planks'], [3, 1, -4, 'oak_fence'], [3, 2, -4, 'oak_fence'], [3, 3, -4, 'oak_planks'], [-3, 4, 1, 'cobweb'], [3, 4, -2, 'cobweb'], [2, 5, 3, 'cobweb'], [-3, 1, 3, 'rail']]],
  swamp_hut: ['spruce_planks', 'spruce_planks', 'spruce_planks', [[-3, 1, -4, 'cauldron'], [3, 1, -4, 'crafting_table'], [3, 1, -3, 'brown_mushroom'], [-3, 1, 2, 'flower_pot'], [-3, 3, -2, 'spruce_planks']]],
  swamp: ['mud_bricks', 'mud', 'mangrove_planks', [[-3, 1, -4, 'mangrove_roots'], [-3, 2, -4, 'mangrove_roots'], [3, 1, -4, 'clay'], [3, 1, 1, 'mangrove_roots'], [-3, 1, 1, 'brown_mushroom'], [2, 1, -4, 'mud']]],
  nether: ['nether_bricks', 'nether_bricks', 'nether_bricks', [[-3, 1, -4, 'nether_brick_fence'], [-3, 2, -4, 'nether_brick_fence'], [3, 1, -4, 'nether_brick_fence'], [3, 1, 1, 'soul_sand'], [-3, 1, 1, 'nether_wart_block'], [2, 1, -4, 'magma_block']]],
  jungle: ['jungle_log', 'grass_block', 'jungle_planks', [[-3, 1, -4, 'jungle_leaves[persistent=true]'], [3, 1, -4, 'jungle_leaves[persistent=true]'], [3, 2, -4, 'jungle_leaves[persistent=true]'], [-3, 1, 1, 'fern'], [3, 1, 2, 'cocoa[facing=east]']]]
}
const SPACING = 14   // room centres along x

module.exports = function guessSound (cfg) {
  const R = cfg.rounds
  const last = R.length - 1
  const edit = {
    caption: cfg.caption,
    red: cfg.red,
    song: 'songs/funk_abnormal.mp3',
    dropAt: 'lit',
    startAt: 'round:-0.05',
    endAfter: `final_reveal:${cfg.endAfter ?? 1.0}`,
    counter: { at: R.map((_, i) => ['round', i]), total: R.length },
    // a live 3-2-1 with a draining bar from the first listen to the turn (worker 10's countdowns), the
    // round's difficulty as its label
    countdowns: R.map((r, i) => ['cd3', 'turn', r.label, i, 0.5, 0.42]),
    cards: R.map((r, i) => ['lit', r.answer, r.cardSeconds ?? 1.25, r.color || 'green', i]),
    punch: R.map((_, i) => ['lit', i, 1.1]),
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
      await ctx.cmd('/difficulty normal')   // hostile mobs can't be summoned on peaceful
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
        const my = floor + 1 + (r.mobDy || 0)
        const mx = cx + 0.5 + (r.mobDx ?? (i % 2 ? 0.6 : -0.6))   // a little off-centre, so the turn round goes the short way (alternating sides)
        await ctx.cmd(`/summon ${r.mob} ${mx} ${my} ${z + (r.mobDz ?? 2.5)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Rotation:[${r.mobYaw ?? 180}f,0f],Tags:["m${i}"]${r.nbt ? ',' + r.nbt : ''}}`)
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
      const { x0, z, floor } = this
      const mobOf = (i) => Object.values(bot.entities).find(e => e.name === R[i].mob && Math.abs(e.position.x - (x0 + i * SPACING + 0.5)) < 2 && Math.abs(e.position.z - z) < 6)
      const sway = async (ticks, amp = 0.05) => {   // breathing in the dark: tiny look drift, so the shot never locks
        const y0 = bot.entity.yaw, p0 = bot.entity.pitch
        for (let k = 0; k < ticks; k++) { await bot.look(y0 + Math.sin(k * 0.12) * amp, p0 + Math.sin(k * 0.09) * amp * 0.4, true); await bot.waitForTicks(1) }
      }
      for (let i = 0; i < R.length; i++) {
        const r = R[i], cx = x0 + i * SPACING
        if (i > 0) {   // hard cut to the next dark room (yaw/pitch ride on the tp: lessons, "a cut has to carry its aim")
          const tx = cx + 0.5, tz = z - 0.5
          for (let a = 0; ; a++) {
            ctx.mark('cut')
            bot.chat(`/tp @s ${tx} ${floor + 1} ${tz} 180 ${cfg.pitch ?? 12}`)
            let ok = false
            for (let t = 0; t < 10 && !ok; t++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.x - tx) < 0.1 && Math.abs(bot.entity.position.z - tz) < 0.1 }
            if (ok) break
            if (a === 4) throw new Error('teleport did not stick')
          }
        }
        const mob = mobOf(i)
        if (!mob) { ctx.log('round', i, 'no mob'); return false }
        ctx.mark('round', { n: i, mob: r.mob })
        await bot.waitForTicks(3)
        // the sound, twice (a second listen mid-countdown)
        const play = () => { for (const s of [].concat(r.sound)) ctx.sound(s, r.volume ?? 1, r.pitch ?? 1) }
        play(); ctx.mark('hear', { n: i })
        await sway(3)
        ctx.mark('cd3', { n: i }); await sway(20)
        ctx.mark('cd2', { n: i }); if (!r.once) { play(); ctx.mark('hear', { n: i }) } await sway(20)
        ctx.mark('cd1', { n: i }); await sway(20)
        // time's up: turn round toward where the sound came from (still dark)...
        const headY = mob.position.y + (r.lookY ?? 1.2)
        const e = bot.entity.position.offset(0, 1.62, 0), d = new Vec3(mob.position.x, headY, mob.position.z).minus(e)
        ctx.mark('turn', { n: i })
        await ctx.easeLook(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)) - (r.lookDown ?? 0.12), 400)
        // ...and put a torch down between you and it (the place mark lets the renderer predict it like the client)
        const tz = z + 1
        bot._client.write('block_place', { hand: 0, location: { x: cx, y: floor, z: tz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        ctx.mark('place', { x: cx, y: floor + 1, z: tz })
        bot.swingArm(); ctx.sound('block.wood.place', 1, 0.9)
        ctx.mark('reveal', { n: i, mob: r.mob })
        bot.waitForTicks(3).then(() => ctx.mark('lit', { n: i }))   // the relight lands a few ticks after the placement: the answer card waits for it
        if (i === last) ctx.mark('final_reveal')
        ctx.mark('react', { n: i })
        // the view never holds still on the reveal: lean in on the harmless ones, back off from the scary ones
        const lean = r.lean ?? 1
        if (lean > 0) { bot.setControlState('sneak', true); bot.setControlState('forward', true) }
        const stopLean = bot.waitForTicks(r.leanTicks ?? 10).then(() => { bot.setControlState('forward', false); bot.setControlState('sneak', false) })
        r._i = i
        await (REACT[r.react] || REACT.look)(ctx, mob, r, i)
        await stopLean
        if (i < last) await bot.waitForTicks(r.hold ?? 4)
      }
      return true
    }
  }
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
  async stare (ctx, mob) {
    const { bot } = ctx
    ctx.sound('entity.enderman.stare', 1, 1)
    ctx.mark('stare')
    await bot.waitForTicks(16)
    ctx.sound('entity.enderman.scream', 1, 1)
    bot.setControlState('back', true); setTimeout(() => bot.setControlState('back', false), 300)   // flinch back
    await bot.waitForTicks(8)
    ctx.particles('portal', { x: mob.position.x, y: mob.position.y, z: mob.position.z }, { count: 60 })
    ctx.sound('entity.enderman.teleport', 1, 1)
    ctx.mark('teleport')
    bot.chat(`/tp @e[type=enderman,limit=1,sort=nearest] ${mob.position.x.toFixed(2)} ${mob.position.y.toFixed(2)} ${(mob.position.z - 120).toFixed(2)}`)
    await bot.waitForTicks(8)
  },
  // the warden roars; you back off
  async roar (ctx, mob) {
    const { bot } = ctx
    ctx.sound('entity.warden.roar', 1, 1)
    ctx.mark('roar')
    bot.setControlState('back', true)
    await bot.waitForTicks(10)
    bot.setControlState('back', false)
    await bot.waitForTicks(16)
  },
  async growl (ctx, mob) {   // a polar bear warns: it rears up (the sound) and you step back
    const { bot } = ctx
    ctx.mark('face_on', { ids: [mob.id], head: true })
    ctx.sound('entity.polar_bear.warning', 1, 1)
    ctx.mark('roar')
    bot.setControlState('back', true)
    await bot.waitForTicks(6)
    bot.setControlState('back', false)
    await bot.waitForTicks(20)
    ctx.mark('face_off')
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
    await bot.waitForTicks(r.reactTicks ?? 20)
    ctx.mark('face_off')
  },
  // it isn't a parrot this time: the creeper is ignited by the light... and goes off (the death screen follows)
  async boom (ctx, mob, r) {
    const { bot } = ctx
    bot.chat(`/data merge entity @e[type=creeper,tag=m${r._i},limit=1] {ignited:1b,Fuse:${r.fuse ?? 22}}`)
    ctx.sound('entity.creeper.primed', 1, 0.5)
    ctx.mark('ignite')
    bot.setControlState('back', true)
    for (let k = 0; k < 60 && !ctx.died; k++) await bot.waitForTicks(1)
    bot.setControlState('back', false)
    await bot.waitForTicks(30)
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
