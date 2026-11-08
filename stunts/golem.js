// "POV: you hit a villager 💀" (~30 s, five escalating beats, hard cuts between them):
//   1 villager hit -> 1 iron golem launches you; 3 -> 3 golems juggle you twice; 5 -> three times;
//   10 -> four times; 20 villagers -> 20 golems swarm you: "HelloBuh was slain by Iron Golem" (death screen).
// Real mobs with vanilla AI, normal difficulty. Beats 1-4 under Resistance IV + Regeneration V (V's 100% reduction stopped the hit registering at all): the
// hit still registers and knocks you up, no damage; cleared for the last. (On peaceful the hit did 0 damage,
// didn't register at all, and nothing launched.) Each golem is provoked with a
// player-attributed /damage so its retaliation fires at once (left alone, a golem wandered for ~4 s).
const BEATS = [
  // launches: how many times the golems juggle you before the cut (escalates; the last beat kills)
  { villagers: 1, golems: 1, dx: -96, launches: 1, sub: '1 villager' },
  { villagers: 3, golems: 3, dx: -64, launches: 2, sub: '3 villagers' },
  { villagers: 5, golems: 5, dx: -32, launches: 3, sub: '5 villagers' },
  { villagers: 7, golems: 7, dx: 0, launches: 4, sub: '7 villagers' },      // (3, like the 5: padding)
  { villagers: 10, golems: 10, dx: 32, launches: 5, sub: '10 villagers' },
  { villagers: 15, golems: 15, dx: 64, launches: 6, sub: '15 villagers' },   // (closer golems: six beats ran 27.3 s; owner: 30 s minimum)
  { villagers: 20, golems: 20, dx: 96, launches: 1, sub: '20 villagers...' }
]
// a juggle counter: x1, x2... on each launch (the escalation in launches didn't read)
function juggleSubs () {
  const out = []; let occ = 0
  BEATS.slice(0, -1).forEach(b => { for (let j = 0; j < b.launches; j++) out.push(['launched', `x${j + 1}`, 0.6, occ++]) })
  return out
}
module.exports = {
  name: 'golem',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you hit a villager 💀',
  edit: {
    caption: 'POV: you hit a villager 💀', red: 'hit', song: 'songs/ncs/industry_kiss.mp3', dropAt: 'death', startAt: 'beat:-0.05', deathScreen: true, endAfter: 'death:0.9',
    subs: [...BEATS.map((b, i) => ['beat', b.sub, 1.4, i]), ...BEATS.map((b, i) => ['golem', b.golems === 1 ? '1 golem' : `${b.golems} golems`, 1.2, i]), ...juggleSubs()],
    // the cut ends 0.1 s into the beat: the crowd still popped in 3 frames after it ended on spawnNb
    speed: BEATS.slice(1).map((_, k) => [`spawn${k + 1}a`, `spawn${k + 1}b:0.1`, 'cut'])
  },
  expectDeath: true,
  botTimeout: 300,   // 7 beats (~45 s) after a bigger field setup

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd('/gamerule keep_inventory true')   // nothing drops on the death: the dropped items drew as bare shadows on the death screen (engine)
    await ctx.cmd(`/forceload add ${x - 124} ${z - 120} ${x + 124} ${z + 26}`)   // (28 of the fills hit unloaded chunks)
    await ctx.sleep(3000)
    for (let z0 = z - 120; z0 <= z + 26; z0 += 6) {   // (to z - 80 a cut stone face showed behind the 7, 10 and 20 beats)   // (a canopy and a cut face showed north of the 10 beat)   // the village sites in one deep field (z - 16 left the cut wall behind the last swarm)
      const z1 = Math.min(z0 + 5, z + 26)
      for (let y0 = floor + 1; y0 <= floor + 64; y0 += 8) await ctx.cmd(`/fill ${x - 124} ${y0} ${z0} ${x + 124} ${y0 + 7} ${z1} air`)   // (to +16 left floating canopies)
      await ctx.cmd(`/fill ${x - 124} ${floor} ${z0} ${x + 124} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 124} ${floor - 3} ${z0} ${x + 124} ${floor - 1} ${z1} dirt`)
    }
    await ctx.cmd(`/forceload remove ${x - 124} ${z - 120} ${x + 124} ${z + 26}`)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty normal')
    const profs = ['farmer', 'librarian', 'none', 'cleric', 'fletcher', 'mason', 'shepherd', 'butcher', 'armorer', 'toolsmith']
    for (let i = 0; i < BEATS.length; i++) {
      const B = BEATS[i], sx = x + B.dx
      // a bit of village: a path, a hay bale, a bell
      await ctx.cmd(`/fill ${sx - 1} ${floor} ${z - 12} ${sx + 1} ${floor} ${z + 6} dirt_path`)
      await ctx.cmd(`/setblock ${sx + 5} ${floor + 1} ${z - 6} hay_block`)
      await ctx.cmd(`/setblock ${sx - 5} ${floor + 1} ${z - 8} bell[attachment=floor]`)
    }
    // villagers and golems are spawned when their beat starts (spawned at setup, the golems wandered off for a
    // minute and walked back in from ~12 out); the villagers keep their AI so a hit one flinches and flees
    this.spawnBeat = async (i) => {
      const B = BEATS[i], sx = x + B.dx
      for (let v = 0; v < B.villagers; v++) {
        const a = (v - (B.villagers - 1) / 2) * Math.min(0.32, 3 / B.villagers), r = 2.0 + (v % 3) * 0.45
        bot.chat(`/summon villager ${(sx + 0.5 + Math.sin(a) * r * 1.6).toFixed(2)} ${floor + 1} ${(z + 0.5 - Math.cos(a) * r).toFixed(2)} {VillagerData:{profession:"minecraft:${profs[v % profs.length]}",type:"minecraft:plains",level:2},Xp:1,PersistenceRequired:1b,Rotation:[0f,0f],Tags:["v${i}"]}`)
      }
      for (let g = 0; g < B.golems; g++) {
        const ring = g < 12 ? 0 : 1, inRing = ring ? B.golems - 12 : Math.min(12, B.golems), k = ring ? g - 12 : g
        const ang = Math.PI / 3 + (k + 0.5) / inRing * (4 * Math.PI / 3), rad = 4.4 + ring * 2.0   // (5.0: a 1-1.4 s walk-in; 3.6: one golem's face filled the frame through every juggle)
        const gx = sx + 0.5 + Math.sin(ang) * rad, gz = z + 0.5 - Math.cos(ang) * rad
        bot.chat(`/summon iron_golem ${gx.toFixed(2)} ${floor + 1} ${gz.toFixed(2)} {PlayerCreated:0b,PersistenceRequired:1b,Rotation:[${(g * 47) % 360}f,0f],Tags:["g${i}"]}`)
      }
      await bot.waitForTicks(10)   // till the client has them all (at 4 they popped in 3 frames after the cut)
    }
    await ctx.hotbar(['stone_sword', ['bread', 16], ['oak_planks', 32]])   // (a wooden sword broke on hit 59 of 61, on camera)
    await ctx.tpCheck(x + BEATS[0].dx + 0.5, floor + 1, z + 0.5, 180, 10)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor } = this
    const near = (n, tag) => Object.values(bot.entities).filter(e => e.name === n && e.position.distanceTo(bot.entity.position) < 20)
      .sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))
    bot.on('health', () => {})
    let beatAt = -1
    for (let i = 0; i < BEATS.length && !ctx.died; i++) {
      beatAt = i
      const B = BEATS[i], sx = x + B.dx, last = i === BEATS.length - 1
      if (i > 0) {   // fast cut to the next village (tpCheck's 1 s settle would be dead air)
        const tx = sx + 0.5, tz = z + 0.5
        for (let a = 0; ; a++) {
          bot.chat(`/tp @s ${tx} ${floor + 1} ${tz} 180 10`)
          let ok = false
          for (let t = 0; t < 10 && !ok; t++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.x - tx) < 0.1 && Math.abs(bot.entity.position.z - tz) < 0.1 }
          if (ok) break
          if (a === 4) throw new Error('teleport did not stick')
        }
        bot.chat('/effect give @s instant_health 1 5 true')
      }
      // Resistance V absorbed the whole hit, which then didn't register: no launch in 320 ticks (5 failed runs).
      // IV (80% off) lets the hit land and launch you; Regeneration V heals it back between hits
      if (last) { bot.chat('/effect clear @s resistance'); bot.chat('/effect clear @s regeneration') } else { bot.chat(`/effect give @s resistance 30 ${i >= 2 ? 3 : 2} true`)   /* III for the 1 and 3 (hearts drop and refill), IV from the 5 (III died under 5 and 10 at once) */; bot.chat('/effect give @s regeneration 30 4 true') }   // Resistance II: the hits cost hearts on screen and regen refills them (IV: no visible damage; II killed it in beat 3)
      // this village's villagers and golems now (a cut span hides them appearing)
      if (i > 0) ctx.mark(`spawn${i}a`)
      await this.spawnBeat(i)
      if (i > 0) { await bot.waitForTicks(6); ctx.mark(`spawn${i}b`) }   // (ending the cut right after the spawn: the villagers popped in 3 frames after it)
      ctx.mark('beat', { n: i })
      // smack every villager here
      for (const v of near('villager').slice(0, B.villagers)) {
        await ctx.easeLookAt(v.position.offset(0, 1.4, 0), B.villagers > 5 ? 80 : 160)
        ctx.mark('smack')
        bot.attack(v); ctx.sound('entity.villager.hurt', 1); ctx.sound(B.villagers > 1 ? 'entity.player.attack.weak' : 'entity.player.attack.strong', 0.8)   // (spam hits are before the cooldown: weak)
        ctx.particles('angry', { x: v.position.x, y: v.position.y + 2.1, z: v.position.z }, { count: 3 })
        await bot.waitForTicks(B.villagers > 5 ? 1 : B.villagers > 1 ? 3 : 7)   // (20 one at a time ran 4.8 s)
      }
      // the 20: show them first, the whole ring over the villagers, with the count (it killed 0.1 s after the
      // provoke and the '20 golems' line only showed on the death screen)
      if (last) {
        ctx.mark('golem', { n: B.golems })
        const gs = near('iron_golem'), c = gs.reduce((a, e) => a.plus(e.position), new ctx.Vec3(0, 0, 0)).scaled(1 / Math.max(1, gs.length))
        await ctx.easeLookAt(c.offset(-3, 2.5, 0), 350); await ctx.easeLookAt(c.offset(3, 2.5, 0), 500)
      }
      // ...the golems saw that
      // provoked by anger, not a /damage (that flashed every golem red with nobody hitting them)
      { const h = bot.player.uuid.replace(/-/g, ''), ints = [0, 8, 16, 24].map(o => { const v = parseInt(h.slice(o, o + 8), 16); return v > 0x7fffffff ? v - 0x100000000 : v })
        bot.chat(`/execute as @e[type=iron_golem,tag=g${i}] run data merge entity @s {AngerTime:600,AngryAt:[I;${ints.join(',')}],anger_end_time:999999999L,angry_at:[I;${ints.join(',')}]}`) }
      const g0 = near('iron_golem')[0]
      if (g0) await ctx.easeLookAt(g0.position.offset(0, 2.2, 0), 300)
      if (!last) ctx.mark('golem', { n: B.golems })
      let launched = false, n = 0, airborne = false, lastLaunch = -99
      const hp0 = bot.health
      for (let k = 0; k < 420 && !ctx.died; k++) {   // (320 cut the 7 beat at x3)
        // eyes on the middle of the swarm (one golem's face filled the frame and the count never showed)
        const gs = near('iron_golem').filter(e => e.position.distanceTo(bot.entity.position) < 14)
        const g = gs.length ? { position: gs.reduce((a, e) => a.plus(e.position), new ctx.Vec3(0, 0, 0)).scaled(1 / gs.length).offset(0, -0.6, 0) } : null
        if (g) {
          // in the air: look down at the ring falling away (the launch reads); on the ground: over their heads, not into a golem's chest
          const e = bot.entity.position.offset(0, 1.62, 0), d = (airborne ? g.position.offset(0, 0.4, 0) : g.position.offset(0, 3.2, 0)).minus(e)   // in the air: down onto the ring around you
          { const ty = Math.atan2(-d.x, -d.z), tp = Math.atan2(d.y, Math.hypot(d.x, d.z))   // eased: switching golems isn't a snap
            let dy = ty - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
            const kf = airborne ? 0.22 : 0.2   // (0.6 in the air snapped the view in 2-3 frames: a stutter, not a throw)
            await bot.look(bot.entity.yaw + dy * kf, bot.entity.pitch + (tp - bot.entity.pitch) * kf, true) }
          // stand and take it (backing off outran the golems: beats 1-2 never launched); step in if one hangs back
          bot.setControlState('forward', !airborne && k > 10 && g.position.distanceTo(bot.entity.position) > 3)
          if (k % 14 === 0) ctx.sound('entity.iron_golem.step', 0.6)
        }
        if (!airborne && k - lastLaunch > 20 && (bot.entity.velocity.y > 0.25 || bot.health < hp0 - 0.5)) {   // one count per juggle (hits a few ticks apart counted 4 in 0.35 s)
          // a launch (the golems juggle you: count them, re-armed on landing)
          airborne = true; launched = true; n++; lastLaunch = k
          ctx.mark('launched', { n }); ctx.sound('entity.iron_golem.attack', 1)
          bot.setControlState('forward', false)
        } else if (airborne && bot.entity.onGround && bot.entity.velocity.y <= 0) {
          airborne = false
          if (!last && n >= B.launches) { await bot.waitForTicks(6); break }
        }
        await bot.waitForTicks(1)
      }
      bot.setControlState('forward', false)
      if (!launched && !ctx.died) { ctx.log('beat', i, 'no launch'); return false }   // (the swarm can kill with its first hit)
    }
    await bot.waitForTicks(40)                                   // the death screen
    ctx.log('died', ctx.died, 'in beat', beatAt + 1)
    return ctx.died && beatAt === BEATS.length - 1   // the death has to be the swarm's
  }
}
