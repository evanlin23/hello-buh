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
  edit: { caption: 'why are they all staring at me 💀', red: 'staring', song: 'songs/funk_abnormal.mp3', dropAt: 'scare', startAt: 'turn:-0.8', endAfter: 'scare:0.9' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    // a wide field (its cut edges showed behind the payoff at 40 blocks)
    // tall (hills cut at 22 showed as pit walls). Big fills stall the server for seconds, longer than
    // mineflayer's tick wait allows: send each one and wait on the clock
    // ...and then wait until the server ticks again (a fixed 1.8 s still let a backlog build up)
    const bigFill = async (c) => {
      bot.chat(c)
      await new Promise(r => setTimeout(r, 400))
      for (let i = 0; i < 8; i++) { try { await bot.waitForTicks(1); break } catch (e) { ctx.log('fill still running', i) } }
    }
    for (let y0 = floor + 1; y0 <= floor + 37; y0 += 3) await bigFill(`/fill ${x - 40} ${y0} ${z - 40} ${x + 70} ${y0 + 2} ${z + 40} air`)
    await bigFill(`/fill ${x - 40} ${floor} ${z - 40} ${x + 70} ${floor} ${z + 40} grass_block`)
    await bigFill(`/fill ${x - 40} ${floor - 3} ${z - 40} ${x + 70} ${floor - 1} ${z + 40} dirt`)
    // where the bot escapes to, and what's waiting right behind it there
    this.px = x + 40; this.pz = z + 1
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
    // a peace offering: one emerald on the ground in front of them (Q: drops one). Nothing.
    await ctx.easeLook(bot.entity.yaw, -0.15, 250)
    bot._client.write('block_dig', { status: 4, location: { x: 0, y: 0, z: 0 }, face: 0, sequence: 0 })
    bot.swingArm()
    ctx.mark('offer')
    setTimeout(() => ctx.log('emeralds after the drop:', bot.inventory.items().filter(i => i.name === 'emerald').reduce((n, i) => n + i.count, 0)), 600)
    const oy = bot.entity.yaw
    await ctx.easeLook(oy + 0.2, -0.1, 350); await ctx.easeLook(oy - 0.15, -0.12, 350)
    ctx.sound('entity.villager.no', 1)
    // the crowd moves as one block (a shared step, so it keeps its spacing) toward the bot
    const { x, z, floor, px, pz } = this
    const V = ctx.Vec3
    const villagers = () => Object.values(bot.entities).filter(e => e.name === 'villager' && e.position.y < floor + 3)
    const centroid = () => { const vs = villagers(); return vs.reduce((a, e) => a.plus(e.position), new V(0, 0, 0)).scaled(1 / Math.max(1, vs.length)) }
    let pace = 0
    const move = () => {
      if (!pace) return
      const c = centroid(), d = bot.entity.position.minus(c); d.y = 0
      const len = Math.hypot(d.x, d.z)
      if (len < 7) return
      if (villagers().some(e => e.position.distanceTo(bot.entity.position) < 3)) return   // they stop short of the camera
      bot.chat(`/execute as @e[type=villager,tag=!scare] at @s run tp @s ~${(d.x / len * pace).toFixed(3)} ~ ~${(d.z / len * pace).toFixed(3)}`)
    }
    bot.on('physicsTick', move)
    const lookCrowd = async () => { const c = centroid().offset(0, 1.2, 0), eye = bot.entity.position.offset(0, 1.62, 0), d = c.minus(eye); await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true) }
    // 1. backing away, facing them: they walk after it, keeping pace
    await ctx.easeLookAt(centroid().offset(0, 1.2, 0), 300)
    pace = 0.2; ctx.mark('follow')
    bot.setControlState('back', true)
    for (let i = 0; i < 70 && bot.entity.position.x < x + 16; i++) { await lookCrowd(); await bot.waitForTicks(1) }
    bot.setControlState('back', false)
    // 2. it turns and runs
    ctx.mark('run')
    await ctx.easeLook(-Math.PI / 2, 0, 300)                   // east
    pace = 0.26
    bot.setControlState('sprint', true); bot.setControlState('forward', true)
    for (let i = 0; i < 60 && bot.entity.position.x < x + 32; i++) {
      await bot.waitForTicks(1)
      if (i === 22) { bot.setControlState('sprint', false); await ctx.easeLook(Math.PI / 2 - 0.4, -0.05, 300); await ctx.easeLook(-Math.PI / 2, 0, 300); bot.setControlState('sprint', true) }   // a glance over the shoulder mid-run
    }
    bot.setControlState('forward', false); bot.setControlState('sprint', false)
    // 3. a look back: they're right there
    ctx.mark('closer')
    for (let i = 0; i < 8; i++) { await bot.waitForTicks(1) }
    const c3 = centroid().offset(0, 1.2, 0)
    await ctx.easeLookAt(c3, 450)
    ctx.sound('entity.villager.ambient', 0.9, 0.6)
    pace = 0.12                                               // still creeping in
    for (let i = 0; i < 18; i++) { await lookCrowd(); await bot.waitForTicks(1) }
    // 4. the last stretch backwards to the pillar spot
    pace = 0.26
    for (let i = 0; i < 200 && bot.entity.position.x < px + 0.4; i++) {
      await lookCrowd()
      const dz = pz + 0.5 - bot.entity.position.z
      bot.setControlState('back', px + 0.5 - bot.entity.position.x > 0.2)
      bot.setControlState('left', dz > 0.25); bot.setControlState('right', dz < -0.25)
      await bot.waitForTicks(1)
    }
    for (const c of ['back', 'left', 'right']) bot.setControlState(c, false)
    pace = 0; bot.removeListener('physicsTick', move)
    if (Math.abs(bot.entity.position.x - (px + 0.5)) > 0.6) throw new Error(`short of the pillar spot: x ${bot.entity.position.x.toFixed(2)}`)
    // 5. pillar up 9 high while they spread round the base, each to its own place on a ring
    const ring = villagers().map((e, i, all) => ({ e, a: i / all.length * Math.PI * 2, r: 3 + (i % 3) }))
    const gather = () => {
      if (ctx.tick % 2) return
      for (const { e, a, r } of ring) {
        const tx = px + 0.5 + Math.cos(a) * r, tz = pz + 0.5 + Math.sin(a) * r
        const dx = tx - e.position.x, dz = tz - e.position.z, len = Math.hypot(dx, dz)
        if (len < 0.15 || !e.uuid) continue
        const st = Math.min(len, 0.35)
        bot.chat(`/tp ${e.uuid} ${(e.position.x + dx / len * st).toFixed(2)} ${floor + 1} ${(e.position.z + dz / len * st).toFixed(2)}`)
      }
    }
    bot.on('physicsTick', gather)
    ctx.select(3)
    await ctx.easeLookAt(centroid(), 300)                       // down at them
    ctx.mark('pillar')
    const bx = Math.floor(bot.entity.position.x), bz = Math.floor(bot.entity.position.z)
    for (let k = 0; k < 9; k++) {
      const base = floor + k
      bot.setControlState('jump', true)
      for (let i = 0; i < 20 && bot.entity.position.y < base + 2.1; i++) await bot.waitForTicks(1)
      bot.setControlState('jump', false)
      bot._client.write('block_place', { hand: 0, location: { x: bx, y: base, z: bz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.stone.place', 1, 0.9)
      for (let i = 0; i < 20 && !bot.entity.onGround; i++) { await bot.waitForTicks(1) }
      const c = centroid(), eye = bot.entity.position.offset(0, 1.62, 0), d = c.minus(eye)   // the camera stays on the ring forming
      await bot.look(bot.entity.yaw + (Math.atan2(-d.x, -d.z) - bot.entity.yaw) * 0.5, Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
    }
    // what waits behind it (built only now, out of sight: in view during the run it gave the twist away)
    const tx = Math.floor(bot.entity.position.x) + 2, tz = Math.floor(bot.entity.position.z), topY = Math.floor(bot.entity.position.y)
    bot.chat(`/fill ${tx} ${floor + 1} ${tz} ${tx} ${topY - 1} ${tz} stone`)
    bot.chat(`/summon villager ${tx + 0.5} ${topY} ${tz + 0.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["scare"],Rotation:[90f,0f],VillagerData:{profession:"minecraft:nitwit",type:"minecraft:plains",level:2},Xp:1}`)
    // 6. up top: they're all round the base, staring up, as the sun goes down (smoothly)
    ctx.mark('top')
    const y0b = bot.entity.yaw
    await ctx.easeLook(y0b - 0.3, -1.0, 300)
    let t = 11200                                               // into sunset (6000-12000 is all day)
    for (let i = 0; i < 70; i++) {
      t += 26; bot.chat(`/time set ${t}`); ctx.mark('time', { time: t })
      await bot.look(y0b + Math.PI * 1.4 * (i / 70) - 0.3, -1.0 + 0.12 * Math.sin(i / 11), true)   // looking down round the ring
      await bot.waitForTicks(1)
    }
    bot.removeListener('physicsTick', gather)
    ctx.sound('entity.villager.ambient', 0.6, 0.6)
    // 7. ...and turns round: face to face. A flinch.
    await ctx.easeLook(-Math.PI / 2, -0.05, 450)               // east
    ctx.mark('scare')
    ctx.sound('entity.villager.no', 1.4, 0.8)
    await ctx.easeLook(-Math.PI / 2 + 0.12, -0.02, 220)      // a flinch, the face kept in frame
    await ctx.easeLook(-Math.PI / 2 - 0.06, -0.06, 500)
    for (let i = 0; i < 10; i++) await bot.waitForTicks(1)
    this.untrack(); ctx.mark('face_off')
    return true
  }
}
