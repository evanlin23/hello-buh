// "1 villager vs 10 vs 100 staring at me 💀": the escalating staring_villagers. Three crowds in
// three spots of the same field, 40 blocks apart (out of each other's view): 1 villager, then
// 10, then 100. Each time the bot walks up behind them and they all turn at once and keep
// staring. Same approach as staring_villagers: NoAI villagers, the bot runs
// `tp @s ~ ~ ~ facing entity <bot> eyes` on the crowds that have turned, every tick, and
// face_on (with near: this crowd only) / face_off marks tell the renderer to turn them. Hard cut (teleport) between beats.
const GAP = 40
const CROWDS = [
  { n: 1, sub: '1 villager', cols: 1, rows: 1 },
  { n: 10, sub: '10 villagers', cols: 5, rows: 2 },
  { n: 100, sub: '100 villagers', cols: 10, rows: 10 }
]

module.exports = {
  name: 'villager_crowd',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 villager vs 10 vs 100 staring at me 💀',
  edit: {
    caption: '1 villager vs 10 vs 100 staring at me 💀', red: '100', song: 'songs/funk_abnormal.mp3', dropAt: 'turn',
    startAt: 'beat:-0.05',
    subs: [...CROWDS.map((c, i) => ['beat', c.sub, 1.6, i]), ['turn', 'they all turned', 1.4, 2], ['back', 'nope', 1.2, 0]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd('/kill @e[type=villager]')
    const profs = ['librarian', 'farmer', 'cleric', 'armorer', 'fletcher', 'toolsmith', 'weaponsmith', 'cartographer', 'butcher', 'shepherd', 'mason', 'fisherman', 'nitwit', 'none']
    const types = ['plains', 'plains', 'plains', 'taiga', 'desert', 'savanna', 'snow']
    // one big flat clearing for all three crowds, so no cut hillsides show behind them
    // (slabs, each /fill under the 32768-block cap)
    for (let z0 = z - 70; z0 <= z + 14; z0 += 6) {
      const z1 = Math.min(z0 + 5, z + 19)
      await ctx.cmd(`/fill ${x - 72} ${floor + 1} ${z0} ${x + 72} ${floor + 30} ${z1} air`)
      await ctx.cmd(`/fill ${x - 72} ${floor} ${z0} ${x + 72} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 72} ${floor - 3} ${z0} ${x + 72} ${floor - 1} ${z1} dirt`)
    }
    let k = 0
    for (let i = 0; i < CROWDS.length; i++) {
      const c = CROWDS[i], sx = x + (i - 1) * GAP
      for (let r = 0; r < c.rows; r++) {
        for (let q = 0; q < c.cols; q++) {
          const jx = ((q * 7 + r * 3) % 5) * 0.08, jz = ((q * 5 + r * 7) % 3) * 0.2
          const vx = sx + 0.5 + (q - (c.cols - 1) / 2) * (c.n === 100 ? 1.25 : 1.6) + (r % 2) * 0.4 + jx
          const vz = z - 3.5 - r * (c.n === 100 ? 1.3 : 1.8) - jz
          const p = profs[(k * 5 + 3) % profs.length], t = types[(k * 3 + 1) % types.length]
          await ctx.cmd(`/summon villager ${vx.toFixed(2)} ${floor + 1} ${vz.toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Rotation:[180f,0f],Tags:["crowd${i}"],VillagerData:{profession:"minecraft:${p}",type:"minecraft:${t}",level:2},Xp:1}`)
          k++
        }
      }
    }
    await ctx.hotbar(['diamond_sword', ['emerald', 32], ['bread', 16], ['oak_log', 64]])
    await ctx.tpCheck(x - GAP + 0.5, floor + 1, z + 4.5, 180, -4)
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  // teleport to the next crowd without the 1 s settle of tpCheck: wait just until it took
  async cut (ctx, x, y, z) {
    const { bot } = ctx
    for (let i = 0; i < 4; i++) {
      bot.chat(`/tp @s ${x} ${y} ${z} 180 -4`)
      for (let t = 0; t < 10; t++) {
        await bot.waitForTicks(1)
        if (Math.abs(bot.entity.position.x - x) < 0.1 && Math.abs(bot.entity.position.z - z) < 0.1) { await bot.waitForTicks(2); if (Math.abs(bot.entity.position.x - x) < 0.1) return }
      }
      ctx.log('cut teleport did not stick, retrying')
    }
    throw new Error('teleport did not stick')
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor } = this
    const track = () => bot.chat(`/execute as @e[type=villager,tag=on] at @s run tp @s ~ ~ ~ facing entity ${bot.username} eyes`)
    bot.on('physicsTick', track)
    // while strafing, keep the camera on the crowd (eye level of their heads)
    let aim = null
    const aimTick = () => {
      if (!aim) return
      const e = bot.entity.position, dx = aim.x - e.x, dy = aim.y - (e.y + 1.62), dz = aim.z - e.z
      const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz))
      let d = yaw - bot.entity.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
      bot.look(bot.entity.yaw + d * 0.35, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.35, true)
    }
    bot.on('physicsTick', aimTick)
    for (let i = 0; i < CROWDS.length; i++) {
      const c = CROWDS[i], sx = x + (i - 1) * GAP
      aim = null
      if (i > 0) await this.cut(ctx, sx + 0.5, floor + 1, z + 4.5)
      ctx.mark('beat', { n: c.n })
      await bot.waitForTicks(4)
      // walk up behind them
      bot.setControlState('forward', true)
      while (bot.entity.position.z > z - 0.2) await bot.waitForTicks(1)
      bot.setControlState('forward', false)
      await bot.waitForTicks(i === 2 ? 10 : 8)
      // they all turn round at once
      bot.chat(`/tag @e[type=villager,tag=crowd${i}] add on`)
      ctx.mark('turn', { n: c.n }); ctx.mark('face_on', { near: [sx + 0.5, z - 3.5 - (c.rows - 1) * 0.6, 12] })   // only this crowd turns
      const voices = Math.min(c.n, 6)
      for (let v = 0; v < voices; v++) ctx.sound('entity.villager.ambient', 0.5 + 0.1 * voices, 0.75 + v * 0.1)
      aim = new ctx.Vec3(sx + 0.5, floor + 2.3, z - 3.5 - (c.rows - 1) * 0.6)
      if (i < 2) {
        await bot.waitForTicks(12)
        bot.setControlState('left', true); await bot.waitForTicks(i === 0 ? 10 : 12); bot.setControlState('left', false)
        await bot.waitForTicks(12)
        ctx.mark('face_off')
        bot.chat(`/tag @e[type=villager,tag=on] remove on`)
      } else {
        // the finale: 100 heads follow every move
        await bot.waitForTicks(22)
        bot.setControlState('left', true); await bot.waitForTicks(18); bot.setControlState('left', false)
        await bot.waitForTicks(6)
        bot.setControlState('right', true); await bot.waitForTicks(32); bot.setControlState('right', false)
        await bot.waitForTicks(8)
        ctx.mark('back')
        ctx.sound('entity.villager.no', 1)
        bot.setControlState('back', true); await bot.waitForTicks(34); bot.setControlState('back', false)
        await bot.waitForTicks(16)
        ctx.mark('face_off')
      }
    }
    bot.removeListener('physicsTick', track); bot.removeListener('physicsTick', aimTick)
    return true
  }
}
