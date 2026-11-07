// "noob vs pro vs hacker 💀 part 2" (worker 15; the series kit is lib/nph.js). Three new tasks,
// each done three ways, every beat a hard cut back to the same start:
//   1. get diamonds: a wooden pickaxe on diamond ore (it breaks and drops NOTHING, vanilla) (noob) /
//      Efficiency V + Fortune III, the whole vein in a second (pro) / /fill turns every stone block
//      of the cave into diamond ore (hacker)
//   2. kill the creeper: punches it, it blows up (noob) / two sword hits before the fuse (pro) /
//      /effect levitation on the creeper, it floats off into the sky (hacker)
//   3. get down the tower (30 blocks): just jumps (noob) / water bucket clutch (pro) / /fill turns the
//      ground under the tower to slime, he jumps and bounces back up (hacker)
// On-camera actions are real player actions; commands build the sets out of shot, except the
// hacker's own (typed into the chat bar: they're the joke).
const { plateau } = require('../lib/plateau')
const nph = require('../lib/nph')

const TASKS = ['get diamonds', 'kill the creeper', 'get down the tower']
// the cave: a 9x4x9 room in an 11x6x11 stone shell; ores set into its walls (dx, dy, dz from the
// room's floor-centre; the north wall is dz -5)
const DIAMONDS = [[-1, 1, -5], [0, 1, -5], [1, 1, -5], [0, 2, -5]]
const ORES = [['coal_ore', -5, 2, -2], ['coal_ore', -5, 3, -1], ['coal_ore', 5, 1, 2], ['iron_ore', 5, 3, -2], ['iron_ore', -3, 4, -5], ['coal_ore', 3, 2, -5], ['copper_ore', -5, 1, 3]]
const SHELL_STONE = 11 * 6 * 11 - 9 * 4 * 9 - DIAMONDS.length - ORES.length
const SLIME = 15 * 15
const H = 30                                     // the tower
const CMDS = ['/fill ~-5 ~-1 ~-6 ~5 ~4 ~4 diamond_ore replace stone', '/effect give @e[type=creeper] levitation 10 4', '/fill ~-7 ~-31 ~-9 ~7 ~-31 ~5 slime_block']
const FEEDBACK = [`Successfully filled ${SHELL_STONE} block(s)`, 'Applied effect Levitation to Creeper', `Successfully filled ${SLIME} block(s)`]

module.exports = {
  name: 'noob_pro_hacker_2',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'noob vs pro vs hacker 💀 part 2',
  brightness: 1,
  botTimeout: 420,
  edit: nph.edit({
    caption: 'noob vs pro vs hacker 💀 part 2', red: 'hacker', tasks: TASKS, cmds: CMDS, feedback: FEEDBACK,
    dropAt: 'hack', endAfter: 'bounce:1.0',
    // the wooden pickaxe's 7.5 s on diamond ore at 8x; the creeper and fall deaths cut to the death
    speed: [['ndig_a', 'ndig_b', 8]],
    extra: {
      deathScreen: true,
      punch: [['hack', 0, 1.08], ['hack', 1, 1.08], ['bounce', 0, 1.15]],
      shake: [['death', 0, 16], ['bounce', 0, 14]],
      cards: [['nothing', 'NOTHING 💀', 1.0, 'white']]
    }
  }),

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const x = sp.x, z = sp.z
    const F = await plateau(ctx, { x0: x - 48, x1: x + 46, z0: z - 44, z1: z + 12, above: H + 12, below: 24, biome: 'minecraft:plains' })
    Object.assign(this, { x, z, F })
    await ctx.defaultRules()
    for (const c of ['/gamerule random_tick_speed 0', '/gamerule fall_damage true', '/gamerule keep_inventory true', '/gamerule respawn_radius 0',
      '/gamerule log_admin_commands false', '/gamerule spawn_mobs false', '/gamerule natural_health_regeneration false', '/gamerule mob_griefing true',
      '/difficulty normal']) await ctx.cmd(c)

    // --- 1. the cave (under the field) ---
    const cx = x - 28, cz = z - 20, R0 = F - 12   // R0: the room's lowest air layer
    Object.assign(this, { cx, cz, R0 })
    await ctx.cmd(`/fill ${cx - 7} ${R0 - 3} ${cz - 7} ${cx + 7} ${R0 + 6} ${cz + 7} stone`)
    await ctx.cmd(`/fill ${cx - 4} ${R0} ${cz - 4} ${cx + 4} ${R0 + 3} ${cz + 4} air`)
    await this.ores(ctx)
    for (const [tx, tz, f] of [[cx - 4, cz - 1, 'east'], [cx + 4, cz - 1, 'west'], [cx - 4, cz + 3, 'east'], [cx + 4, cz + 3, 'west']]) await ctx.cmd(`/setblock ${tx} ${R0 + 2} ${tz} wall_torch[facing=${f}]`)
    await ctx.cmd(`/setblock ${cx - 3} ${R0} ${cz - 3} torch`)
    await ctx.cmd(`/setblock ${cx + 3} ${R0} ${cz - 3} torch`)

    // --- 3. the tower ---
    const tx = x + 28, tz = z - 20
    Object.assign(this, { tx, tz })
    await ctx.cmd(`/fill ${tx} ${F + 1} ${tz} ${tx} ${F + H} ${tz} cobblestone`)
    await ctx.cmd(`/setblock ${tx} ${F + H + 1} ${tz} snow[layers=5]`)   // the clutch's phase trick (docs/clutch-timing.md)

    await ctx.cmd('/effect give @s saturation infinite 1 true')
    await ctx.hotbar(['wooden_pickaxe'])
    await ctx.tpCheck(cx + 0.5, R0, cz + 1.5, 180, 0)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: F, z }
  },

  async ores (ctx) {
    const { cx, cz, R0 } = this
    for (const [dx, dy, dz] of DIAMONDS) await ctx.cmd(`/setblock ${cx + dx} ${R0 - 1 + dy} ${cz + dz} diamond_ore`)
    for (const [b, dx, dy, dz] of ORES) await ctx.cmd(`/setblock ${cx + dx} ${R0 - 1 + dy} ${cz + dz} ${b}`)
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { F, cx, cz, R0, tx, tz, x, z } = this
    const k = nph.kit(ctx)
    const N = 0
    const ore = (i) => new Vec3(cx + DIAMONDS[i][0], R0 - 1 + DIAMONDS[i][1], cz + DIAMONDS[i][2])
    const walkTo = async (zt, maxT = 30) => { bot.setControlState('forward', true); for (let w = 0; w < maxT && bot.entity.position.z > zt; w++) await bot.waitForTicks(1); bot.setControlState('forward', false) }

    // ================= task 1: diamonds =================
    // NOOB: a wooden pickaxe on diamond ore. It breaks... and drops nothing.
    k.beat({ task: 0 })
    ctx.easeLookAt(ore(1).offset(0.5, 0.5, 0.5), 600)
    await walkTo(cz - 1.4)
    await ctx.easeLookAt(ore(1).offset(0.5, 0.5, 1), 200)
    ctx.mark('ndig_a')
    try { await bot.dig(bot.blockAt(ore(1)), 'ignore') } catch (e) { ctx.log('dig failed', e.message); return false }
    ctx.mark('ndig_b')
    ctx.sound('block.stone.break', 1, 1)
    await ctx.easeLookAt(ore(1).offset(0.5, -0.6, 2), 350)        // where the diamond should have dropped
    ctx.mark('nothing')
    await bot.waitForTicks(16)
    const gotNoob = bot.inventory.items().some(i => i.name === 'diamond')
    ctx.log('noob got a diamond?', gotNoob)
    k.endBeat()

    // PRO: Efficiency V, Fortune III: the whole vein
    await this.ores(ctx)
    await k.cutTo(cx + 0.5, R0, cz + 1.5, 180, 0, { hotbar: [['diamond_pickaxe[enchantments={efficiency:5,fortune:3}]', 1]] })
    k.beat()
    ctx.easeLookAt(ore(1).offset(0.5, 0.5, 0.5), 400)
    await walkTo(cz - 1.4)
    for (const i of [0, 1, 2, 3]) {
      await ctx.easeLookAt(ore(i).offset(0.5, 0.5, 1), 110)
      try { await bot.dig(bot.blockAt(ore(i)), 'ignore') } catch (e) { ctx.log('pro dig failed', e.message); return false }
    }
    ctx.mark('vein')
    // step in and scoop up the drops (they pop out at the foot of the wall)
    ctx.easeLookAt(new Vec3(cx + 0.5, R0, cz - 3.5), 300)
    await walkTo(cz - 3.4, 25)
    for (let w = 0; w < 20 && bot.inventory.items().filter(i => i.name === 'diamond').reduce((a, i) => a + i.count, 0) < 4; w++) await bot.waitForTicks(1)
    const dia = bot.inventory.items().filter(i => i.name === 'diamond').reduce((a, i) => a + i.count, 0)
    ctx.log('pro diamonds', dia)
    if (dia < 4) return false
    k.endBeat()

    // HACKER: /fill ... diamond_ore replace stone
    await this.ores(ctx)
    await k.cutTo(cx + 0.5, R0, cz + 1.5, 180, 0)
    k.beat()
    ctx.easeLook(N + 0.25, 0.05, 1000)                          // a glance round the cave while he types
    await bot.waitForTicks(20)
    k.typed()
    bot.chat(`/fill ${cx - 5} ${R0 - 1} ${cz - 5} ${cx + 5} ${R0 + 4} ${cz + 5} diamond_ore replace stone`)
    ctx.mark('hack')
    ctx.sound('entity.player.levelup', 0.6, 1.4); ctx.sound('block.amethyst_block.chime', 1, 1)
    await bot.waitForTicks(4)
    await k.look(N + 0.9, 0.25, 650)                             // the walls...
    await k.look(N - 0.7, 0.55, 750)                             // ...and the ceiling: all of it
    k.endBeat()

    // ================= task 2: the creeper =================
    const cs = [x + 0.5, F + 1, z - 2.5]                          // my start, facing north
    const summonCreeper = () => bot.chat(`/summon creeper ${x + 0.5} ${F + 1} ${z - 12.5} {PersistenceRequired:1b,Rotation:[0f,0f]}`)
    const fixCrater = async () => {
      await ctx.cmd(`/fill ${x - 6} ${F - 5} ${z - 16} ${x + 6} ${F - 1} ${z + 2} dirt`)
      await ctx.cmd(`/fill ${x - 6} ${F} ${z - 16} ${x + 6} ${F} ${z + 2} grass_block`)
      await ctx.cmd(`/fill ${x - 6} ${F + 1} ${z - 16} ${x + 6} ${F + 6} ${z + 2} air`)
      await ctx.cmd('/kill @e[type=item]')
    }
    // NOOB: punches it
    summonCreeper()
    bot.chat(`/spawnpoint @s ${x} ${F + 1} ${z - 3} 180 0`); bot.chat(`/setworldspawn ${x} ${F + 1} ${z - 3} 180 0`)
    await k.cutTo(cs[0], cs[1], cs[2], 180, 5)
    // half his hearts gone before the beat (inside the cut, the blink over by the first frame): the
    // blast does ~12 on normal, and a noob who survives a point-blank creeper isn't the joke
    bot.chat('/damage @s 11 minecraft:generic')
    await bot.waitForTicks(24)
    k.beat({ task: 1 })
    const creeperHead = () => { const c = k.mob('creeper'); return c ? c.position.offset(0, 1.1, 0) : null }
    bot.setControlState('forward', true)
    let hissed = false
    for (let w = 0; w < 140 && !ctx.died; w++) {
      const c = k.mob('creeper')
      if (c) {
        const [ya, pa] = k.angTo(c.position.offset(0, 1.1, 0)); k.lerpLook(ya, pa, 0.3)
        const d = c.position.distanceTo(bot.entity.position)
        if (d < 2.2) bot.setControlState('forward', false)
        if (d < 3.2 && w % 6 === 0) { bot.attack(c); ctx.sound('entity.player.attack.weak', 0.8) }
        if (!hissed && d < 3) { hissed = true; ctx.mark('hiss'); ctx.sound('entity.creeper.primed', 1) }
      }
      await bot.waitForTicks(1)
    }
    bot.clearControlStates()
    if (!ctx.died) { ctx.log('the creeper did not get the noob'); return false }
    ctx.mark('noob_boom')
    await bot.waitForTicks(18)                                    // the death screen
    k.endBeat()
    ctx.revive(); ctx.respawn()
    await new Promise(r => bot.once('spawn', r))
    await bot.waitForTicks(4)

    // PRO: two sword hits before the fuse runs out
    await fixCrater()
    summonCreeper()
    await k.cutTo(cs[0], cs[1], cs[2], 180, 5, { hotbar: [['netherite_sword[enchantments={sharpness:5}]', 1]] })
    k.beat()
    bot.setControlState('forward', true); bot.setControlState('sprint', true)
    let hits = 0, last = -99, dead = false
    for (let w = 0; w < 120 && !dead && !ctx.died; w++) {
      const c = k.mob('creeper')
      if (!c) { dead = true; break }
      const [ya, pa] = k.angTo(c.position.offset(0, 1.1, 0)); k.lerpLook(ya, pa, 0.35)
      const d = c.position.distanceTo(bot.entity.position)
      if (d < 4) { bot.setControlState('sprint', false); bot.setControlState('forward', false) }
      if (d < 3.1 && w - last >= 13) { bot.attack(c); last = w; hits++; ctx.mark('hit', { n: hits }); ctx.sound(hits === 1 ? 'entity.player.attack.knockback' : 'entity.player.attack.crit', 1) }
      if (hits >= 2 && w - last > 2 && (!c.metadata || c.health === 0)) { /* waiting for it to drop */ }
      await bot.waitForTicks(1)
    }
    bot.clearControlStates()
    for (let w = 0; w < 30 && k.mob('creeper'); w++) { const q = creeperHead(); if (q) { const [ya, pa] = k.angTo(q.offset(0, -0.6, 0)); k.lerpLook(ya, pa, 0.2) } await bot.waitForTicks(1) }
    ctx.mark('creeper_dead', { hits })
    ctx.log('pro hits', hits, 'creeper left?', !!k.mob('creeper'), 'died', ctx.died)
    if (ctx.died || k.mob('creeper')) return false
    k.endBeat()

    // HACKER: /effect give @e[type=creeper] levitation
    await ctx.cmd('/kill @e[type=item]')
    summonCreeper()
    await k.cutTo(cs[0], cs[1], cs[2], 180, 0)
    k.beat()
    await k.follow(creeperHead, 20, 0.3)
    k.typed()
    bot.chat('/effect give @e[type=creeper] levitation 10 4')
    ctx.mark('hack')
    ctx.sound('entity.player.levelup', 0.6, 1.4)
    await k.follow(creeperHead, 46, 0.22)                        // up it goes
    const c3 = k.mob('creeper')
    ctx.log('creeper up', c3 && (c3.position.y - F).toFixed(1))
    if (!c3 || c3.position.y < F + 6) return false
    k.endBeat()
    await ctx.cmd('/kill @e[type=creeper]')

    // ================= task 3: the tower =================
    const top = F + H + 1 + 0.5                                   // on the snow cap
    const jumpOff = async () => {
      await ctx.easeLook(N, -1.45, 250)                           // straight down the tower
      ctx.mark('jump')
      bot.setControlState('forward', true); bot.setControlState('jump', true)
      await bot.waitForTicks(6)
      bot.setControlState('jump', false)
      await bot.waitForTicks(8)
      const stopDrift = () => { if (bot.entity.position.y < top - 14) { bot.setControlState('forward', false); bot.removeListener('physicsTick', stopDrift) } }
      bot.on('physicsTick', stopDrift)
      ctx.easeLook(N, -Math.PI / 2 + 0.01, 500)
    }
    // NOOB: just jumps
    bot.chat(`/spawnpoint @s ${tx} ${F + 1} ${tz + 4} 180 0`); bot.chat(`/setworldspawn ${tx} ${F + 1} ${tz + 4} 180 0`)
    await k.cutTo(tx + 0.5, top, tz + 0.5, 180, 70)
    k.beat({ task: 2 })
    await bot.waitForTicks(4)
    await jumpOff()
    for (let w = 0; w < 120 && !ctx.died; w++) await bot.waitForTicks(1)
    bot.clearControlStates()
    if (!ctx.died) { ctx.log('noob survived the fall?'); return false }
    ctx.mark('noob_splat')
    await bot.waitForTicks(18)
    k.endBeat()
    ctx.revive(); ctx.respawn()
    await new Promise(r => bot.once('spawn', r))
    await bot.waitForTicks(4)

    // PRO: water bucket clutch (docs/clutch-timing.md), scoop it back up, look up the tower
    await k.cutTo(tx + 0.5, top, tz + 0.5, 180, 70, { hotbar: ['water_bucket'] })
    k.beat()
    await bot.waitForTicks(4)
    await jumpOff()
    let placed = false, landed = false
    const onTick = () => {
      const p = bot.entity.position, vy = bot.entity.velocity.y, above = p.y - (F + 1)
      if (!placed && vy < -0.5 && above + 1.62 < 4.45) {
        bot.entity.pitch = -Math.PI / 2
        placed = true
        ctx.mark('placed', { above }); ctx.sound('item.bucket.empty')
        process.nextTick(() => bot.activateItem())
      }
      if (placed && above < 1.0 && !landed) { landed = true; ctx.sound('entity.player.splash.high_speed'); ctx.particles('splash', { x: p.x, y: F + 1.9, z: p.z }, { count: 60, spread: 2.6 }) }
    }
    bot.on('physicsTick', onTick)
    for (let w = 0; w < 120 && !(landed && (bot.entity.onGround || bot.entity.isInWater)) && !ctx.died; w++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', onTick)
    if (ctx.died || !placed) { ctx.log('clutch failed'); return false }
    await bot.waitForTicks(4)
    const wb = bot.blockAt(bot.entity.position.floored())
    if (wb && wb.name === 'water') { await bot.look(bot.entity.yaw, -Math.PI / 2, true); bot.activateItem(); ctx.sound('item.bucket.fill') }
    await bot.waitForTicks(2)
    const ddx = tx + 0.5 - bot.entity.position.x, ddz = tz + 0.5 - bot.entity.position.z
    await ctx.easeLook(Math.atan2(-ddx, -ddz), 1.0, 700)          // up the tower: that's where I was
    k.endBeat()
    await ctx.cmd(`/fill ${tx - 8} ${F + 1} ${tz - 8} ${tx + 8} ${F + 2} ${tz + 8} air replace water`)

    // HACKER: /fill the ground under the tower with slime (typed on top, coords relative to him), jump
    await k.cutTo(tx + 0.5, top, tz + 0.5, 180, 70)
    k.beat()
    ctx.easeLook(N + 0.2, -1.4, 1000)                             // straight down at the ground while he types
    await bot.waitForTicks(20)
    k.typed()
    bot.chat(`/fill ${tx - 7} ${F} ${tz - 9} ${tx + 7} ${F} ${tz + 5} slime_block`)
    ctx.mark('hack')
    ctx.sound('entity.player.levelup', 0.6, 1.4)
    await bot.waitForTicks(8)
    await jumpOff()
    let bounced = false, lowest = 999
    for (let w = 0; w < 140 && !ctx.died; w++) {
      const p = bot.entity.position
      lowest = Math.min(lowest, p.y)
      if (!bounced && bot.entity.velocity.y > 0.3 && p.y < F + 3) { bounced = true; ctx.mark('bounce'); ctx.sound('block.slime_block.fall', 1); ctx.sound('entity.slime.jump', 1) }
      await bot.waitForTicks(1)
      if (bounced && bot.entity.velocity.y < 0.2) break
    }
    ctx.log('hacker lowest', (lowest - F).toFixed(2), 'bounced', bounced, 'up to', (bot.entity.position.y - F).toFixed(1))
    return bounced && !ctx.died
  }
}
