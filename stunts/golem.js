// "POV: you hit a villager 💀" (~28 s, three escalating beats, hard cuts between them):
//   1 villager hit -> 1 iron golem stomps over and launches you into the air;
//   3 villagers    -> 3 golems, launched again;
//   10 villagers   -> 10 golems swarm you: "HelloBuh was slain by Iron Golem" (death screen).
// Real mobs with vanilla AI. Beats 1-2 run on peaceful: a golem's hit still knocks you up but does no
// damage (mob damage scales with difficulty); beat 3 switches to normal. Each golem is provoked with a
// player-attributed /damage so its retaliation fires at once (left alone, a golem wandered for ~4 s).
const BEATS = [
  { villagers: 1, golems: 1, dx: -40, sub: '1 villager' },
  { villagers: 3, golems: 3, dx: 0, sub: '3 villagers' },
  { villagers: 10, golems: 10, dx: 40, sub: '10 villagers...' }
]
module.exports = {
  name: 'golem',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you hit a villager 💀',
  edit: {
    caption: 'POV: you hit a villager 💀', red: 'hit', song: 'songs/funk_abnormal.mp3', dropAt: 'launched', startAt: 'beat:-0.05', deathScreen: true, endAfter: 'death:1.1',
    subs: [...BEATS.map((b, i) => ['beat', b.sub, 1.4, i]), ...BEATS.map((b, i) => ['golem', b.golems === 1 ? '1 golem' : `${b.golems} golems`, 1.2, i])]
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let z0 = z - 16; z0 <= z + 14; z0 += 6) {   // three village sites in one field (slabs under the /fill cap)
      const z1 = Math.min(z0 + 5, z + 14)
      for (let y0 = floor + 1; y0 <= floor + 16; y0 += 8) await ctx.cmd(`/fill ${x - 56} ${y0} ${z0} ${x + 56} ${y0 + 7} ${z1} air`)
      await ctx.cmd(`/fill ${x - 56} ${floor} ${z0} ${x + 56} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 56} ${floor - 3} ${z0} ${x + 56} ${floor - 1} ${z1} dirt`)
    }
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty peaceful')
    const profs = ['farmer', 'librarian', 'none', 'cleric', 'fletcher', 'mason', 'shepherd', 'butcher', 'armorer', 'toolsmith']
    for (let i = 0; i < BEATS.length; i++) {
      const B = BEATS[i], sx = x + B.dx
      // a bit of village: a path, a hay bale, a bell
      await ctx.cmd(`/fill ${sx - 1} ${floor} ${z - 12} ${sx + 1} ${floor} ${z + 6} dirt_path`)
      await ctx.cmd(`/setblock ${sx + 5} ${floor + 1} ${z - 6} hay_block`)
      await ctx.cmd(`/setblock ${sx - 5} ${floor + 1} ${z - 8} bell[attachment=floor]`)
      // villagers in a loose arc right in front, golems behind them in the shot from the first frame
      for (let v = 0; v < B.villagers; v++) {
        const a = (v - (B.villagers - 1) / 2) * 0.32, r = 2.2 + (v % 2) * 0.6
        await ctx.cmd(`/summon villager ${(sx + 0.5 + Math.sin(a) * r * 1.6).toFixed(2)} ${floor + 1} ${(z + 0.5 - Math.cos(a) * r).toFixed(2)} {VillagerData:{profession:"minecraft:${profs[v % profs.length]}",type:"minecraft:plains",level:2},Xp:1,PersistenceRequired:1b,NoAI:1b,Rotation:[0f,0f],Tags:["v${i}"]}`)
      }
      for (let g = 0; g < B.golems; g++) {
        const gx = sx + 0.5 + (g - (B.golems - 1) / 2) * 2.2, gz = z - 7.5 - (g % 2) * 1.5
        await ctx.cmd(`/summon iron_golem ${gx.toFixed(2)} ${floor + 1} ${gz.toFixed(2)} {PlayerCreated:0b,PersistenceRequired:1b,Rotation:[${(g * 47) % 360}f,0f],Tags:["g${i}"]}`)
      }
    }
    await ctx.hotbar(['wooden_sword', ['bread', 16], ['oak_planks', 32]])
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
    for (let i = 0; i < BEATS.length && !ctx.died; i++) {
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
      if (last) bot.chat('/difficulty normal')
      ctx.mark('beat', { n: i })
      // smack every villager here
      for (const v of near('villager').slice(0, B.villagers)) {
        await ctx.easeLookAt(v.position.offset(0, 1.4, 0), 160)
        ctx.mark('smack')
        bot.attack(v); ctx.sound('entity.villager.hurt', 1); ctx.sound('entity.player.attack.strong', 0.8)
        ctx.particles('angry', { x: v.position.x, y: v.position.y + 2.1, z: v.position.z }, { count: 3 })
        await bot.waitForTicks(B.villagers > 3 ? 3 : 7)
      }
      // ...the golems saw that
      bot.chat(`/execute as @e[type=iron_golem,tag=g${i}] run damage @s 1 minecraft:player_attack by ${bot.username}`)
      const g0 = near('iron_golem')[0]
      if (g0) await ctx.easeLookAt(g0.position.offset(0, 2.2, 0), 300)
      ctx.mark('golem', { n: B.golems })
      let launched = false
      const hp0 = bot.health
      for (let k = 0; k < 160 && !ctx.died; k++) {
        const g = near('iron_golem')[0]
        if (g) {
          const e = bot.entity.position.offset(0, 1.62, 0), d = g.position.offset(0, 2.2, 0).minus(e)
          await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
          bot.setControlState('back', !launched && g.position.distanceTo(bot.entity.position) < 6)
          if (k % 14 === 0) ctx.sound('entity.iron_golem.step', 0.6)
        }
        if (!launched && (bot.entity.velocity.y > 0.25 || bot.health < hp0 - 0.5)) {
          launched = true; ctx.mark('launched'); ctx.sound('entity.iron_golem.attack', 1)
          if (!last) { bot.setControlState('back', false); await bot.waitForTicks(26); break }
        }
        await bot.waitForTicks(1)
      }
      bot.setControlState('back', false)
      if (!launched) ctx.log('beat', i, 'no launch')
    }
    await bot.waitForTicks(40)                                   // the death screen
    return ctx.died
  }
}
