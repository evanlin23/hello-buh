// "1 vs 10 vs 100 vs 500 villagers staring at me 💀" (~30 s): the escalating staring_villagers. Six
// crowds side by side in one big field, 34 blocks apart (out of each other's view): 1, 5, 20, 50, 100,
// then 500 villagers. Each time the bot walks up behind them, they all turn at once and their heads
// follow it as it sidesteps. Finale: it backs off from the 500... turns round, and 100 more were
// standing right behind it, staring. NoAI villagers; the bot runs `tp @s ~ ~ ~ facing entity <bot>
// eyes` every tick on the crowds that have turned; face_on (near: this crowd) / face_off marks tell
// the renderer. Hard cut (teleport) between crowds. The bot starts in the middle of the field so
// every crowd's chunks are loaded (recorded) when the recording starts.
const GAP = 34
const CROWDS = [
  { n: 1, sub: '1 villager', cols: 1, rows: 1 },
  { n: 5, sub: '5 villagers', cols: 5, rows: 1 },
  { n: 20, sub: '20 villagers', cols: 5, rows: 4 },
  { n: 50, sub: '50 villagers', cols: 10, rows: 5 },
  { n: 100, sub: '100 villagers', cols: 10, rows: 10 },
  { n: 500, sub: '500 villagers', cols: 25, rows: 20 }
]
const BEHIND = { cols: 10, rows: 10 }       // the finale crowd behind the start of the last walk
const crowdX = (x, i) => x + Math.round((i - (CROWDS.length - 1) / 2) * GAP)
module.exports = {
  name: 'villager_crowd',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 vs 10 vs 100 vs 500 villagers staring at me 💀',
  edit: {
    caption: '1 vs 10 vs 100 vs 500 villagers staring at me 💀', red: '500', song: 'songs/funk_abnormal.mp3', dropAt: 'behind',
    startAt: 'beat:-0.05', endAfter: 'behind:1.0',
    subs: [...CROWDS.map((c, i) => ['beat', c.sub, 1.6, i]), ['back', 'nope', 1.0, 0], ['turnaround', 'wait...', 0.8, 0], ['behind', 'THEY WERE BEHIND ME', 1.0, 0]]
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
    // one big flat field for all the crowds (slabs under the 32768-block /fill cap)
    // The server stalls for seconds on fills this big, and mineflayer's tick waits time out (5 s) while
    // it does ("Timeout waiting for 1 ticks"): pace the heavy commands by wall-clock time instead.
    const heavy = async (c) => { bot.chat(c); await ctx.sleep(450) }
    for (let z0 = z - 40; z0 <= z + 26; z0 += 4) {
      const z1 = Math.min(z0 + 3, z + 26)
      await heavy(`/fill ${x - 110} ${floor + 1} ${z0} ${x + 110} ${floor + 14} ${z1} air`)
      await heavy(`/fill ${x - 110} ${floor} ${z0} ${x + 110} ${floor} ${z1} grass_block`)
      await heavy(`/fill ${x - 110} ${floor - 3} ${z0} ${x + 110} ${floor - 1} ${z1} dirt`)
      // one biome everywhere (a crowd stood on a duller grass tint)
      await heavy(`/fillbiome ${x - 110} ${floor - 4} ${z0} ${x + 110} ${floor + 14} ${z1} minecraft:plains`)
    }
    await ctx.sleep(3000)
    // mineflayer ignores the biome update packet: go far away and come back to reload the chunks
    await ctx.cmd(`/tp @s ${x + 1000} 200 ${z}`); await bot.waitForTicks(60)
    await ctx.cmd(`/tp @s ${x} ${floor + 1} ${z + 8}`); await bot.waitForTicks(20); await bot.waitForChunksToLoad()
    let k = 0
    const summon = async (vx, vz, rot, tag) => {
      const p = profs[(k * 5 + 3) % profs.length], t = types[(k * 3 + 1) % types.length]
      bot.chat(`/summon villager ${vx.toFixed(2)} ${floor + 1} ${vz.toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Rotation:[${rot}f,0f],Tags:["${tag}"],VillagerData:{profession:"minecraft:${p}",type:"minecraft:${t}",level:2},Xp:1}`)
      if (++k % 10 === 0) await ctx.sleep(250)              // ~780 summons: paced by wall-clock (tick waits time out under the load)
    }
    for (let i = 0; i < CROWDS.length; i++) {
      const c = CROWDS[i], sx = crowdX(x, i), big = c.n >= 50
      for (let r = 0; r < c.rows; r++) {
        for (let q = 0; q < c.cols; q++) {
          const jx = ((q * 7 + r * 3) % 5) * 0.08, jz = ((q * 5 + r * 7) % 3) * 0.2
          await summon(sx + 0.5 + (q - (c.cols - 1) / 2) * (big ? 1.25 : 1.6) + (r % 2) * 0.4 + jx, z - 3.5 - r * (big ? 1.3 : 1.8) - jz, 180, `crowd${i}`)
        }
      }
    }
    // the finale crowd: behind where the last walk starts, already facing it
    const lx = crowdX(x, CROWDS.length - 1)
    for (let r = 0; r < BEHIND.rows; r++) {
      for (let q = 0; q < BEHIND.cols; q++) await summon(lx + 0.5 + (q - (BEHIND.cols - 1) / 2) * 1.25 + (r % 2) * 0.4, z + 9.5 + r * 1.3, 180, `crowd${CROWDS.length - 1}`)
    }
    await ctx.sleep(3000)
    ctx.log('villagers', Object.values(bot.entities).filter(e => e.name === 'villager').length)
    await ctx.hotbar(['diamond_sword', ['emerald', 32], ['bread', 16], ['oak_log', 64]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 4.5, 180, -4)   // the middle: all crowds' chunks loaded for the recording
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
      const c = CROWDS[i], sx = crowdX(x, i), last = i === CROWDS.length - 1
      aim = null
      await this.cut(ctx, sx + 0.5, floor + 1, z + 4.5)
      ctx.mark('beat', { n: c.n })
      await bot.waitForTicks(3)
      // walk up behind them
      bot.setControlState('forward', true)
      while (bot.entity.position.z > z - 0.2) await bot.waitForTicks(1)
      bot.setControlState('forward', false)
      await bot.waitForTicks(6)
      // they all turn round at once (the last face_on also covers the crowd behind, which turns with it)
      // server-side tracking (tp facing every tick) for the small crowds; the 500 + 100 would stall the server,
      // and the renderer turns every villager in the face_on window toward the camera anyway
      if (!last) bot.chat(`/tag @e[type=villager,tag=crowd${i}] add on`)
      const depth = (c.rows - 1) * (c.n >= 50 ? 1.3 : 1.8)
      ctx.mark('turn', { n: c.n }); ctx.mark('face_on', { near: last ? [sx + 0.5, z - 3, 34] : [sx + 0.5, z - 3.5 - depth / 2, 8 + depth] })
      const voices = Math.min(c.n, 6)
      for (let v = 0; v < voices; v++) ctx.sound('entity.villager.ambient', 0.5 + 0.1 * voices, 0.75 + v * 0.1)
      aim = new ctx.Vec3(sx + 0.5, floor + 2.3, z - 3.5 - Math.min(depth, 6) / 2)
      await bot.waitForTicks(6)
      // sidestep: every head follows (bigger crowds: both ways)
      bot.setControlState('left', true); await bot.waitForTicks(c.n >= 20 ? 14 : 10); bot.setControlState('left', false)
      if (c.n >= 20) { await bot.waitForTicks(3); bot.setControlState('right', true); await bot.waitForTicks(22); bot.setControlState('right', false) }
      await bot.waitForTicks(3)
      if (!last) { ctx.mark('face_off'); bot.chat('/tag @e[type=villager,tag=on] remove on'); continue }
      // finale: back off... turn round... they were behind you too
      ctx.mark('back'); ctx.sound('entity.villager.no', 1)
      bot.setControlState('back', true); await bot.waitForTicks(12); bot.setControlState('back', false)
      aim = null
      ctx.mark('turnaround')
      await ctx.easeLook(Math.PI * 0.999, -0.05, 850)   // mineflayer yaw 0 = north; the crowd behind is south
      ctx.mark('behind')
      for (let v = 0; v < 6; v++) ctx.sound('entity.villager.ambient', 1.1, 0.7 + v * 0.1)
      await bot.waitForTicks(24)
      ctx.mark('face_off')
    }
    bot.removeListener('physicsTick', track); bot.removeListener('physicsTick', aimTick)
    return true
  }
}
