// "POV: you hit a villager 💀" (~12 s): a little village scene, three villagers and an iron golem.
// The bot smacks a villager (angry particles, hurt sound)... the golem turns, stomps over and
// launches the bot into the air (its attack knocks you up), the second hit kills. Death screen:
// "HelloBuh was slain by Iron Golem". Real mobs with vanilla AI (difficulty normal).
module.exports = {
  name: 'golem',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you hit a villager 💀',
  edit: { caption: 'POV: you hit a villager 💀', red: 'hit', song: 'songs/funk_abnormal.mp3', dropAt: 'launched', startAt: 'smack:-0.4', deathScreen: true, endAfter: 'death:1.8' },
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
    for (const [dx, dz, p] of [[0, -2, 'farmer'], [-3, -6, 'librarian'], [4, -7, 'none']]) {
      await ctx.cmd(`/summon villager ${x + dx + 0.5} ${floor + 1} ${z + dz + 0.5} {VillagerData:{profession:"minecraft:${p}",type:"minecraft:plains",level:2},Xp:1,PersistenceRequired:1b,NoAI:1b,Rotation:[0f,0f]}`)
    }
    // the golem stands in the shot from the first frame, just behind the villager
    await ctx.cmd(`/summon iron_golem ${x + 2.5} ${floor + 1} ${z - 7.5} {PlayerCreated:0b,PersistenceRequired:1b,Rotation:[90f,0f]}`)
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
    // the villager right in front, the golem behind it: smack at once
    const v = find('villager')
    if (!v) throw new Error('no villager')
    await ctx.easeLookAt(v.position.offset(0.6, 1.4, 0), 300)
    await bot.waitForTicks(4)
    ctx.mark('smack')
    for (let k = 0; k < 2; k++) {
      bot.attack(v); ctx.sound('entity.villager.hurt', 1); ctx.sound('entity.player.attack.strong', 0.8)
      ctx.particles('angry', { x: v.position.x, y: v.position.y + 2.1, z: v.position.z }, { count: 3 })
      await bot.waitForTicks(10)
    }
    // ...the golem saw that. Vanilla golems hold a grudge from village gossip only after a while;
    // a player-attributed hit makes its retaliation goal fire at once (the 4 s of it wandering off
    // read as dead air)
    bot.chat(`/damage @e[type=iron_golem,limit=1,sort=nearest] 1 minecraft:player_attack by ${bot.username}`)
    const gol = find('iron_golem')
    if (gol) await ctx.easeLookAt(gol.position.offset(0, 2.2, 0), 350)
    ctx.mark('golem')
    let hits = 0, launched = false
    const onHurt = () => { hits++; if (!launched) { launched = true; ctx.mark('launched'); ctx.sound('entity.iron_golem.attack', 1) } }
    bot.on('health', () => { if (bot.health < 19.5 && hits === 0) onHurt() })
    for (let k = 0; k < 200 && !ctx.died; k++) {
      const g = find('iron_golem')
      if (g) {
        const e = bot.entity.position.offset(0, 1.62, 0), d = g.position.offset(0, 2.2, 0).minus(e)
        await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
        // back off slowly as it stomps over (keeps all of it in frame); stand still once it's on us
        bot.setControlState('back', !launched && g.position.distanceTo(bot.entity.position) < 6)
        if (k === 80 && !launched) ctx.log('golem has not hit yet')
        if (k % 14 === 0) ctx.sound('entity.iron_golem.step', 0.6)
      }
      await bot.waitForTicks(1)
    }
    bot.setControlState('back', false)
    await bot.waitForTicks(50)                                   // the death screen
    return ctx.died
  }
}
