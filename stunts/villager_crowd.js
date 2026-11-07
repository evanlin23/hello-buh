// "1 vs 10 vs 100 vs 200 villagers staring at me 💀" (~30 s): the escalating staring_villagers. Eight
// crowds side by side in one big field, 34 blocks apart (out of each other's view): 1, 5, 10, 20, 50,
// 100, 150, then 200 villagers. Each time the bot walks up behind them, they all turn at once and their heads
// follow it as it sidesteps. Finale: it backs off from the 200... turns round, and 40 more were
// standing right behind it, staring. NoAI villagers; the bot runs `tp @s ~ ~ ~ facing entity <bot>
// eyes` every tick on the crowds that have turned; face_on (near: this crowd) / face_off marks tell
// the renderer. Hard cut (teleport) between crowds. The bot starts in the middle of the field so
// every crowd's chunks are loaded (recorded) when the recording starts.
const GAP = 30
const CROWDS = [
  { n: 1, sub: '1 villager', cols: 1, rows: 1 },
  { n: 5, sub: '5 villagers', cols: 5, rows: 1 },
  { n: 10, sub: '10 villagers', cols: 5, rows: 2 },
  { n: 20, sub: '20 villagers', cols: 5, rows: 4 },
  { n: 50, sub: '50 villagers', cols: 10, rows: 5 },
  { n: 100, sub: '100 villagers', cols: 10, rows: 10 },
  { n: 150, sub: '150 villagers', cols: 15, rows: 10 },
  { n: 200, sub: '200 villagers', cols: 20, rows: 10 }   // (500 + 100 behind slowed the server below 1 tick/s)
]
const BEHIND = { cols: 10, rows: 4 }        // the finale crowd behind the start of the last walk
const crowdX = (x, i) => x + Math.round((i - (CROWDS.length - 1) / 2) * GAP)
module.exports = {
  name: 'villager_crowd',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 vs 10 vs 100 vs 200 villagers staring at me 💀',
  edit: {
    subsY: 0.15, caption: '1 vs 10 vs 100 vs 200 villagers staring at me 💀', red: '200', song: 'songs/funk_abnormal.mp3', dropAt: 'behind',
    startAt: 'beat:-0.05', endAfter: 'behind:0.8',
    speed: CROWDS.slice(1).map((_, i) => [`cut${i + 1}a`, `cut${i + 1}b`, 'cut']),
    subs: [...CROWDS.map((c, i) => ['beat', c.sub, 1.6, i]), ['back', 'nope', 1.0, 0], ['turnaround', 'wait...', 0.8, 0], ['behind', 'BEHIND ME TOO', 1.0, 0]]
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
    // deep and high enough that no cut hillside or trunkless canopy shows, even in the turnaround south
    for (let z0 = z - 72; z0 <= z + 60; z0 += 4) {   // (z - 40 left a cut cliff face in the 200 shot)
      const z1 = Math.min(z0 + 3, z + 60)
      await heavy(`/fill ${x - 124} ${floor + 1} ${z0} ${x + 124} ${floor + 30} ${z1} air`)
      await heavy(`/fill ${x - 124} ${floor} ${z0} ${x + 124} ${floor} ${z1} grass_block`)
      await heavy(`/fill ${x - 124} ${floor - 3} ${z0} ${x + 124} ${floor - 1} ${z1} dirt`)
      // one biome everywhere (a crowd stood on a duller grass tint)
      await heavy(`/fillbiome ${x - 124} ${floor - 4} ${z0} ${x + 124} ${floor + 14} ${z1} minecraft:plains`)
    }
    await ctx.sleep(3000)
    // mineflayer ignores the biome update packet: go far away and come back to reload the chunks
    await ctx.cmd(`/tp @s ${x + 1000} 200 ${z}`); await bot.waitForTicks(60)
    await ctx.cmd(`/tp @s ${x} ${floor + 1} ${z + 8}`); await this.settle(ctx); await bot.waitForChunksToLoad()
    this.profs = profs; this.types = types; this.k = 0
    await this.spawnCrowd(ctx, 0)                            // the rest are spawned just before their beat
    await this.settle(ctx)                                   // the big field stalls the server for a while
    ctx.log('villagers', Object.values(bot.entities).filter(e => e.name === 'villager').length)
    await ctx.hotbar(['diamond_sword', ['emerald', 32], ['bread', 16], ['oak_log', 64]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 4.5, 180, -4)   // the middle: all crowds' chunks loaded for the recording
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  // Spawn crowd i (and, for the last, the crowd behind it). Crowds are spawned one at a time just before
  // their beat and the previous one removed: ~420 villagers at once bogged mineflayer down so far that its
  // tick waits timed out. The spawning time is cut from the video (cutNa..cutNb).
  async spawnCrowd (ctx, i) {
    const { bot } = ctx
    const { x, z, floor } = this
    const summon = async (vx, vz, tag, rot = 180) => {
      const p = this.profs[(this.k * 5 + 3) % this.profs.length], t = this.types[(this.k * 3 + 1) % this.types.length]
      bot.chat(`/summon villager ${vx.toFixed(2)} ${floor + 1} ${vz.toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Rotation:[${rot}f,0f],Tags:["${tag}"],VillagerData:{profession:"minecraft:${p}",type:"minecraft:${t}",level:2},Xp:1}`)
      if (++this.k % 10 === 0) await ctx.sleep(200)
    }
    const c = CROWDS[i], sx = crowdX(x, i), big = c.n >= 50
    for (let r = 0; r < c.rows; r++) {
      for (let q = 0; q < c.cols; q++) {
        const jx = ((q * 7 + r * 3) % 5) * 0.08, jz = ((q * 5 + r * 7) % 3) * 0.2
        await summon(sx + 0.5 + (q - (c.cols - 1) / 2) * (big ? 1.25 : 1.6) + (r % 2) * 0.4 + jx, z - 3.5 - r * (big ? 1.3 : 1.8) - jz, `crowd${i}`)
      }
    }
    if (i === CROWDS.length - 1) {   // the finale crowd: behind where the last walk starts, already facing it
      for (let r = 0; r < BEHIND.rows; r++) {
        // right behind where the back-off ends, backs turned: they snap round on the reveal
        for (let q = 0; q < BEHIND.cols; q++) await summon(sx + 0.5 + (q - (BEHIND.cols - 1) / 2) * 1.25 + (r % 2) * 0.4, z + 5.5 + r * 1.3, 'behind', 0)
      }
    }
    await ctx.sleep(1500)
  },

  // wait (up to 90 s) until the server ticks at a normal rate again: tick waits time out (5 s) while it relights
  async settle (ctx) {
    const { bot } = ctx
    for (let i = 0; i < 18; i++) {
      const t0 = Date.now()
      try { await bot.waitForTicks(20) } catch (e) { ctx.log('server busy, waiting'); continue }
      const ms = Date.now() - t0
      ctx.log('20 ticks in', ms, 'ms')
      if (ms < 1400) return
    }
    throw new Error('server never settled')
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
      if (i > 0) {
        // off camera (cut from the video): spawn this crowd, drop the last one, let things settle
        ctx.mark(`cut${i}a`)
        await this.spawnCrowd(ctx, i)
        bot.chat(`/kill @e[type=villager,tag=crowd${i - 1}]`)
        await this.settle(ctx)
      }
      await this.cut(ctx, sx + 0.5, floor + 1, c.n >= 50 ? z + 6.5 : z + 4.5)   // (big crowds stop 2 further back: same walk)
      if (i > 0) ctx.mark(`cut${i}b`)                    // after the tp: the 200 crowd's teleport took 1.65 s (a 1 s STILL)
      ctx.mark('beat', { n: c.n })                       // walk on the cut (a 3-tick wait read as a freeze)
      // walk up behind them
      bot.setControlState('forward', true)
      const stopZ = c.n >= 50 ? z + 1.8 : z - 0.2           // big crowds: stop further back so their size shows
      while (bot.entity.position.z > stopZ) await bot.waitForTicks(1)
      bot.setControlState('forward', false)
      await bot.waitForTicks(6)
      // they all turn round at once (the last face_on also covers the crowd behind, which turns with it)
      // server-side tracking (tp facing every tick) for the small crowds; the 500 + 100 would stall the server,
      // and the renderer turns every villager in the face_on window toward the camera anyway
      if (!last) bot.chat(`/tag @e[type=villager,tag=crowd${i}] add on`)
      const depth = (c.rows - 1) * (c.n >= 50 ? 1.3 : 1.8)
      // this crowd only: the radius stops short of the crowd behind (z + 5.5 on); 8 + depth (19.7 for the 200)
      // reached it, so it was already staring when the camera turned round
      const cz = z - 3.5 - depth / 2
      ctx.mark('turn', { n: c.n }); ctx.mark('face_on', { near: [sx + 0.5, cz, Math.min(8 + depth, z + 5.0 - cz)] })
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
      // their backs (seen through the turn)... then they all snap round too, at once (a 4-tick hold read as a freeze)
      ctx.mark('face_off'); ctx.mark('face_on', { near: [sx + 0.5, z + 7.5, 10] })
      ctx.mark('behind')
      for (let v = 0; v < 6; v++) ctx.sound('entity.villager.ambient', 1.1, 0.7 + v * 0.1)
      // back away from them too: every head follows (no still hold on the reveal)
      bot.setControlState('back', true); await bot.waitForTicks(20); bot.setControlState('back', false)
      ctx.mark('face_off')
    }
    bot.removeListener('physicsTick', track); bot.removeListener('physicsTick', aimTick)
    return true
  }
}
