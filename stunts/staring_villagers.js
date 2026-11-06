// "why are they all staring at me 💀" (~28 s): a crowd of villagers stands in a field with their
// backs to the player. The bot walks up and every head snaps round at once, then follows it: it
// sidesteps, tosses an emerald (nothing), backs away across the field and the whole crowd walks after
// it, still staring. It pillars up to get away; they gather round the base staring up, the sun goes
// down... it turns round: one of them is standing on a pillar right behind it.
// The heads: the bot runs `tp @s ~ ~ ~ facing entity <bot> eyes` on every (NoAI) villager every tick;
// the walking crowd: `tp @s ^ ^ ^0.12` along their (level) facing toward the bot.
const ROWS = 5, COLS = 7

module.exports = {
  name: 'staring_villagers',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'why are they all staring at me 💀',
  edit: { caption: 'why are they all staring at me 💀', red: 'staring', song: 'songs/funk_abnormal.mp3', dropAt: 'turn', startAt: 'turn:-1.6', endAfter: 'scare:0.9' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let y0 = floor + 1; y0 <= floor + 15; y0 += 7) await ctx.cmd(`/fill ${x - 14} ${y0} ${z - 16} ${x + 40} ${y0 + 6} ${z + 16} air`)
    await ctx.cmd(`/fill ${x - 14} ${floor} ${z - 16} ${x + 40} ${floor} ${z + 16} grass_block`)
    await ctx.cmd(`/fill ${x - 14} ${floor - 3} ${z - 16} ${x + 40} ${floor - 1} ${z + 16} dirt`)
    // where the bot escapes to, and what's waiting right behind it there
    this.px = x + 24; this.pz = z + 1
    await ctx.cmd(`/fill ${this.px + 2} ${floor + 1} ${this.pz} ${this.px + 2} ${floor + 6} ${this.pz} stone`)
    await ctx.cmd('/kill @e[type=villager]')
    const profs = ['librarian', 'farmer', 'cleric', 'armorer', 'fletcher', 'toolsmith', 'weaponsmith', 'cartographer', 'butcher', 'shepherd', 'mason', 'fisherman', 'nitwit', 'none']
    const types = ['plains', 'plains', 'plains', 'taiga', 'desert', 'savanna', 'snow']
    let k = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const vx = x - (COLS - 1) + c * 2 + (r % 2) * 0.6, vz = z - 4 - r * 2 + ((c * 7 + r * 3) % 3) * 0.3
        const p = profs[(k * 5 + 3) % profs.length], t = types[(k * 3 + 1) % types.length]
        await ctx.cmd(`/summon villager ${vx.toFixed(2)} ${floor + 1} ${vz.toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Rotation:[180f,0f],VillagerData:{profession:"minecraft:${p}",type:"minecraft:${t}",level:2},Xp:1}`)
        k++
      }
    }
    await ctx.cmd(`/summon villager ${this.px + 2.5} ${floor + 7} ${this.pz + 0.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["scare"],Rotation:[90f,0f],VillagerData:{profession:"minecraft:nitwit",type:"minecraft:plains",level:2},Xp:1}`)
    await ctx.hotbar(['diamond_sword', ['emerald', 32], ['bread', 16], ['cobblestone', 64]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 5.5, 180, -8)   // close: the stare lands by ~1.5 s
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    await bot.waitForTicks(10)
    // walk up behind them
    bot.setControlState('forward', true)
    while (bot.entity.position.z > this.z - 0.8) await bot.waitForTicks(1)   // ~3 blocks behind the front row
    bot.setControlState('forward', false)
    await bot.waitForTicks(6)
    // they all turn round at once and keep tracking: the bot runs the tp-facing command itself every
    // tick (a command block took seconds to start ticking; ops aren't chat-rate-limited)
    const track = () => bot.chat(`/execute as @e[type=villager] at @s run tp @s ~ ~ ~ facing entity ${bot.username} eyes`)
    bot.on('physicsTick', track)
    this.untrack = () => bot.removeListener('physicsTick', track)
    ctx.mark('turn'); ctx.mark('face_on')     // the renderer turns them on this tick (mineflayer's entity yaw lags the tp by seconds)
    for (let i = 0; i < 4; i++) ctx.sound('entity.villager.ambient', 0.8, 0.8 + i * 0.12)
    // a nervous half-step back and a glance along the crowd (holding still here was a dead second)
    const y0 = bot.entity.yaw, p0 = bot.entity.pitch
    bot.setControlState('back', true); await bot.waitForTicks(5); bot.setControlState('back', false)
    await ctx.easeLook(y0 + 0.25, p0, 400)
    await ctx.easeLook(y0 - 0.2, p0, 500)
    await ctx.easeLook(y0, p0, 300)
    // sidestep left, right: every head follows
    bot.setControlState('left', true); await bot.waitForTicks(20); bot.setControlState('left', false)
    await bot.waitForTicks(4)
    bot.setControlState('right', true); await bot.waitForTicks(34); bot.setControlState('right', false)
    await bot.waitForTicks(4)
    // a peace offering: an emerald on the ground in front of them. Nothing.
    await ctx.easeLook(bot.entity.yaw, -0.35, 300)
    bot.toss(bot.registry.itemsByName.emerald.id, null, 1).catch(() => {})
    bot.swingArm()
    ctx.mark('offer')
    await bot.waitForTicks(14)
    ctx.sound('entity.villager.no', 1)
    await ctx.easeLook(bot.entity.yaw, -0.05, 300)
    // back away across the field, east, facing them: the whole crowd walks after it, still staring
    const { x, z, floor, px, pz } = this
    const follow = () => bot.chat(`/execute at ${bot.username} positioned ~ ${floor + 1} ~ as @e[type=villager,tag=!scare,distance=3.5..] at @s facing entity ${bot.username} feet rotated ~ 0 run tp @s ^ ^ ^0.12`)
    bot.on('physicsTick', follow)
    ctx.mark('follow')
    const crowd = () => { const vs = Object.values(bot.entities).filter(e => e.name === 'villager' && e.position.y < floor + 3); const m = vs.reduce((a, e) => a.plus(e.position), new ctx.Vec3(0, 0, 0)).scaled(1 / Math.max(1, vs.length)); return vs.length ? m : new ctx.Vec3(x + 0.5, floor + 1, z - 6) }
    const watch = () => { const mid = crowd().offset(0, 0.8, 0); const eye = bot.entity.position.offset(0, 1.62, 0), d = mid.minus(eye); return [Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))] }
    for (let i = 0; i < 160 && bot.entity.position.x < px + 0.4; i++) {
      // walk backwards toward the pillar spot, steering with strafes, looking at the crowd
      const [yw, pt] = watch()
      await bot.look(yw, pt, true)
      const dx = px + 0.5 - bot.entity.position.x, dz = pz + 0.5 - bot.entity.position.z
      // facing west-ish: back = +x; left/right correct z
      bot.setControlState('back', dx > 0.2)
      bot.setControlState('left', dz > 0.25); bot.setControlState('right', dz < -0.25)
      await bot.waitForTicks(1)
    }
    for (const c of ['back', 'left', 'right']) bot.setControlState(c, false)
    // pillar up: jump and place cobblestone under its feet, 6 high, while they gather round below
    ctx.select(3)
    await ctx.easeLook(Math.PI / 2, -0.55, 300)               // looking down-west over them
    ctx.mark('pillar')
    const bx = Math.floor(bot.entity.position.x), bz = Math.floor(bot.entity.position.z)
    for (let k = 0; k < 6; k++) {
      const base = floor + k
      bot.setControlState('jump', true)
      for (let i = 0; i < 20 && bot.entity.position.y < base + 2.1; i++) await bot.waitForTicks(1)
      bot.setControlState('jump', false)
      bot._client.write('block_place', { hand: 0, location: { x: bx, y: base, z: bz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.stone.place', 1, 0.9)
      for (let i = 0; i < 20 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
    }
    // up top: they're all round the base, staring up. The sun goes down.
    ctx.mark('top')
    const y0b = bot.entity.yaw
    for (let i = 0; i < 50; i++) {
      if (i % 5 === 0) { const t = 6000 + Math.round(6300 * (i + 5) / 50); bot.chat(`/time set ${t}`); ctx.mark('time', { time: t }) }
      await bot.look(y0b + 0.5 * Math.sin(i / 50 * Math.PI * 1.5), -0.75 + 0.1 * Math.sin(i / 14), true)
      await bot.waitForTicks(1)
    }
    ctx.sound('entity.villager.ambient', 0.6, 0.6)
    // ...and turns round
    await ctx.easeLook(-Math.PI / 2, -0.05, 450)              // east: face to face
    ctx.mark('scare')
    ctx.sound('entity.villager.no', 1.4, 0.8)
    for (let i = 0; i < 24; i++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', follow)
    this.untrack(); ctx.mark('face_off')
    return true
  }
}
