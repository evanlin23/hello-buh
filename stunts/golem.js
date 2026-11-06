// "POV: you hit a villager 💀" (~12 s): a little village scene, three villagers and an iron golem.
// The bot smacks a villager (angry particles, hurt sound)... the golem turns, stomps over and
// launches the bot into the air (its attack knocks you up), the second hit kills. Death screen:
// "HelloBuh was slain by Iron Golem". Real mobs with vanilla AI (difficulty normal).
module.exports = {
  name: 'golem',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you hit a villager 💀',
  edit: { caption: 'POV: you hit a villager 💀', red: 'hit', song: 'songs/funk_abnormal.mp3', dropAt: 'launched', startAt: 'smack:-1.2', deathScreen: true, endAfter: 'death:1.8' },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let y0 = floor + 1; y0 <= floor + 16; y0 += 8) await ctx.cmd(`/fill ${x - 14} ${y0} ${z - 14} ${x + 14} ${y0 + 7} ${z + 14} air`)
    await ctx.cmd(`/fill ${x - 14} ${floor} ${z - 14} ${x + 14} ${floor} ${z + 14} grass_block`)
    await ctx.cmd(`/fill ${x - 14} ${floor - 3} ${z - 14} ${x + 14} ${floor - 1} ${z + 14} dirt`)
    // a bit of village: a path, a hay bale, a bell
    await ctx.cmd(`/fill ${x - 1} ${floor} ${z - 12} ${x + 1} ${floor} ${z + 6} dirt_path`)
    await ctx.cmd(`/setblock ${x + 4} ${floor + 1} ${z - 6} hay_block`)
    await ctx.cmd(`/setblock ${x - 4} ${floor + 1} ${z - 8} bell[attachment=floor]`)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty normal')
    for (const [dx, dz, p] of [[0, -3, 'farmer'], [-3, -5, 'librarian'], [3, -6, 'none']]) {
      await ctx.cmd(`/summon villager ${x + dx + 0.5} ${floor + 1} ${z + dz + 0.5} {VillagerData:{profession:"minecraft:${p}",type:"minecraft:plains",level:2},Xp:1,PersistenceRequired:1b,NoAI:1b,Rotation:[0f,0f]}`)
    }
    await ctx.cmd(`/summon iron_golem ${x - 6.5} ${floor + 1} ${z - 11.5} {PlayerCreated:0b,PersistenceRequired:1b}`)
    await ctx.hotbar(['wooden_sword', ['bread', 16], ['oak_planks', 32]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 10)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const find = (n) => Object.values(bot.entities).filter(e => e.name === n).sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))[0]
    await bot.waitForTicks(6)
    // walk up to the nearest villager
    const v = find('villager')
    if (!v) throw new Error('no villager')
    await ctx.easeLookAt(v.position.offset(0, 1.5, 0), 500)
    bot.setControlState('forward', true)
    for (let k = 0; k < 40 && bot.entity.position.distanceTo(v.position) > 2.2; k++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)
    await ctx.easeLookAt(v.position.offset(0, 1.3, 0), 200)
    ctx.mark('smack')
    for (let k = 0; k < 2; k++) {
      bot.attack(v); ctx.sound('entity.villager.hurt', 1); ctx.sound('entity.player.attack.strong', 0.8)
      ctx.particles('angry', { x: v.position.x, y: v.position.y + 2.1, z: v.position.z }, { count: 3 })
      await bot.waitForTicks(10)
    }
    // ...the golem
    const gol = find('iron_golem')
    if (gol) await ctx.easeLookAt(gol.position.offset(0, 2.2, 0), 500)
    ctx.mark('golem')
    let hits = 0, launched = false
    const onHurt = () => { hits++; if (!launched) { launched = true; ctx.mark('launched'); ctx.sound('entity.iron_golem.attack', 1) } }
    bot.on('health', () => { if (bot.health < 19.5 && hits === 0) onHurt() })
    for (let k = 0; k < 200 && !ctx.died; k++) {
      const g = find('iron_golem')
      if (g) {
        const e = bot.entity.position.offset(0, 1.62, 0), d = g.position.offset(0, 2.2, 0).minus(e)
        await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
        // if it hasn't come for us after ~3 s, make it: hit the golem (it always fights back)
        if (k === 60 && g.position.distanceTo(bot.entity.position) > 6) ctx.log('golem not coming; provoking it')
        if (k >= 60 && !launched && g.position.distanceTo(bot.entity.position) < 3.5 && k % 10 === 0) bot.attack(g)
        if (k >= 60 && !launched && g.position.distanceTo(bot.entity.position) >= 3.5) bot.setControlState('forward', true)
        else bot.setControlState('forward', false)
        if (k % 14 === 0) ctx.sound('entity.iron_golem.step', 0.6)
      }
      await bot.waitForTicks(1)
    }
    bot.setControlState('forward', false)
    await bot.waitForTicks(50)                                   // the death screen
    return ctx.died
  }
}
