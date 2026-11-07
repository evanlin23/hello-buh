// "every 5 seconds it gets worse 😰" (escalation series, worker 18), Short 2: a little floating
// island 40 blocks above the plains. A SURVIVE countdown runs from 35.00; every 5 s (100 ticks, on the
// dot) something gets worse and the bot fights it in survival (Knockback II sword, mobs go off the edge):
//   0 s  the edge falls away (9x9 -> 7x7, real falling blocks)
//   5 s  a creeper: it hisses, the bot knocks it off the island
//  10 s  a thunderstorm rolls in
//  15 s  two zombies (the rain keeps them from burning): both knocked off
//  20 s  the island shrinks (7x7 -> 3x3)
//  25 s  two blocks left
//  30 s  a TNT drops out of the sky onto the other block... and it goes off at 0.00. Death screen.
const kit = require('../lib/escalation')
const UP = 40          // island height above the ground

module.exports = {
  name: 'worse_sky',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'every 5 seconds it gets worse 😰',
  edit: {
    caption: 'every 5 seconds it gets worse 😰', red: 'worse',
    song: 'songs/funk_abnormal.mp3', dropAt: 'l7',
    startAt: 'go:-0.25', endAfter: 'death:1.5',
    countdown: 'go:boom:SURVIVE',
    counter: { at: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'], total: 7 },
    cards: [
      ['l1', 'THE EDGE FALLS', 1.0, 'yellow'], ['l2', '+1 CREEPER', 1.0, 'green'], ['l3', 'THUNDERSTORM', 1.0, 'blue'],
      ['l4', '+2 ZOMBIES', 1.0, 'green'], ['l5', 'THE ISLAND SHRINKS', 1.0, 'yellow'], ['l6', '2 BLOCKS LEFT', 1.0, 'orange'],
      ['l7', '+1 TNT', 1.0, 'red']
    ],
    punch: ['l5', 'boom'],
    deathScreen: true
  },
  expectDeath: true,
  botTimeout: 300,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, Y = g.y + UP
    this.x = x; this.z = z; this.Y = Y; this.G = g.y
    await ctx.defaultRules()
    await ctx.cmd('/gamerule random_tick_speed 0')
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd(`/fill ${x - 12} ${Y - 6} ${z - 12} ${x + 12} ${Y + 24} ${z + 12} air`)
    // the island: 9x9, dirt with a grass top, 3 thick
    await ctx.cmd(`/fill ${x - 4} ${Y - 2} ${z - 4} ${x + 4} ${Y - 1} ${z + 4} dirt`)
    await ctx.cmd(`/fill ${x - 4} ${Y} ${z - 4} ${x + 4} ${Y} ${z + 4} grass_block`)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty normal')
    await ctx.hotbar(['diamond_sword[enchantments={knockback:2}]', ['cobblestone', 64], ['bread', 16]])
    // one block in from the north edge, looking down over it: the island's edge and the 40-block drop
    await ctx.tpCheck(x + 0.5, Y + 1, z - 2.5, 180, 58)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y: Y, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, Y } = this
    const K = kit(ctx)
    const onDmg = (p) => { if (bot.entity && p.entityId !== bot.entity.id) ctx.mark('mob_hurt', { id: p.entityId }) }
    const onStatus = (p) => { if (p.entityStatus === 3) ctx.mark('mob_death', { id: p.entityId }) }
    bot._client.on('damage_event', onDmg); bot._client.on('entity_status', onStatus)
    const offIsland = (m) => !bot.entities[m.id] || m.position.y < Y - 0.5
    // watch it go: eyes follow it down for a moment
    const watchFall = async (m, ticks = 12) => { for (let i = 0; i < ticks && bot.entities[m.id]; i++) { await K.track(m.position.offset(0, 1, 0), 0.25); await bot.waitForTicks(1) } }
    // clockwise from a0 (mineflayer yaw falls going clockwise: north 0, east -pi/2), as seen from (ox, oz)
    const byAngle = (cells, a0, ox = x, oz = z) => cells.sort((p, q) => {
      const a = (c) => { let v = a0 - Math.atan2(-(c[0] + 0.5 - ox), -(c[1] + 0.5 - oz)); while (v < 0) v += 2 * Math.PI; while (v >= 2 * Math.PI) v -= 2 * Math.PI; return v }
      return a(p) - a(q)
    })
    // the cells still there
    const island = new Set()
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) island.add(`${x + dx},${z + dz}`)
    const drop = (cells, perTick) => { const c = cells.filter(([cx, cz]) => island.has(`${cx},${cz}`)); for (const [cx, cz] of c) island.delete(`${cx},${cz}`); return K.crumble(c, Y - 2, Y, perTick) }

    await bot.waitForTicks(6)
    const go = K.start(6)
    await K.until(go, K.drift(0.004))
    ctx.mark('go')

    // ---- 1. the edge falls away ----
    ctx.mark('l1')
    const crumbling = drop(byAngle(K.ring(x, z, 4), 0.5), 1)   // from just left of the view, round clockwise
    await bot.waitForTicks(6)
    await ctx.easeLook(-0.5, -1.0, 500)                  // the blocks in front dropping away
    await ctx.easeLook(-Math.PI / 2, -0.75, 500)         // following the crack round the island
    await ctx.easeLook(-Math.PI + 0.2, -0.55, 600)
    await crumbling
    await ctx.easeLook(-Math.PI, -0.3, 700)              // ...to the far side: the island left
    await K.until(K.at(5), K.drift(0.004))

    // ---- 2. a creeper ----
    ctx.mark('l2')
    bot.chat(`/summon creeper ${x + 0.5} ${Y + 1} ${z + 2.5} {PersistenceRequired:1b,Rotation:[180f,0f]}`)
    await bot.waitForTicks(2)
    const c = K.mobs('creeper')[0]
    if (!c) throw new Error('no creeper')
    if (!await K.fight(c, K.at(9.5), { waitSwell: 6, gone: offIsland })) throw new Error('creeper stayed')
    ctx.mark('off1')
    await watchFall(c)
    await ctx.easeLook(bot.entity.yaw, -0.3, 500)
    await K.until(K.at(10), K.drift(-0.003))

    // ---- 3. thunderstorm ----
    ctx.mark('l3')
    await ctx.setWeather('thunder')
    ctx.sound('entity.lightning_bolt.thunder', 0.8, 0.9)
    await ctx.easeLook(bot.entity.yaw + 0.3, 0.55, 900)  // up into it
    await K.until(K.at(12.4), K.drift(0.004, -0.001))
    ctx.sound('entity.lightning_bolt.thunder', 1, 0.8)
    // away from the edge, into the middle
    await ctx.easeLook(Math.PI, -0.3, 700)
    bot.setControlState('forward', true)
    for (let i = 0; i < 40 && bot.entity.position.z < z + 0.4; i++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)
    await K.until(K.at(15), K.drift(0.004))

    // ---- 4. two zombies ----
    ctx.mark('l4')
    bot.chat(`/summon zombie ${x - 1.5} ${Y + 1} ${z + 2.5} {PersistenceRequired:1b,Rotation:[160f,0f]}`)
    bot.chat(`/summon zombie ${x + 2.5} ${Y + 1} ${z + 2.5} {PersistenceRequired:1b,Rotation:[-160f,0f]}`)
    await bot.waitForTicks(2)
    const zs = K.mobs('zombie').sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))
    if (zs.length < 2) throw new Error('no zombies')
    for (let i = 0; i < 2; i++) {
      if (!await K.fight(zs[i], K.at(i ? 19.6 : 18), { gone: offIsland, reach: 2.9 })) throw new Error('zombie stayed')
      ctx.mark(`off${i + 2}`)
      await watchFall(zs[i], 8)
    }
    await ctx.easeLook(bot.entity.yaw, -0.35, 400)
    await K.until(K.at(20), K.drift(0.003))

    // ---- 5. the island shrinks ----
    ctx.mark('l5')
    // everything but the 3x3 around the bot's own block
    const sx = Math.floor(bot.entity.position.x), sz = Math.floor(bot.entity.position.z)
    const outer = [...island].map(k => k.split(',').map(Number)).filter(([cx, cz]) => Math.max(Math.abs(cx - sx), Math.abs(cz - sz)) >= 2)
    const shrink = drop(byAngle(outer, bot.entity.yaw + 0.3, sx + 0.5, sz + 0.5), 2)
    await ctx.easeLook(bot.entity.yaw - 0.4, -0.95, 700)
    await ctx.easeLook(bot.entity.yaw - 1.4, -0.9, 1300)
    await shrink
    await ctx.easeLook(bot.entity.yaw - 0.8, -0.6, 1000)
    await K.until(K.at(25), K.drift(0.004))

    // ---- 6. two blocks left ----
    ctx.mark('l6')
    // keep the bot's own block and one corner of the 3x3 (the TNT lands there: ~2 blocks off, not in its face)
    const bx = Math.floor(bot.entity.position.x), bz = Math.floor(bot.entity.position.z)
    const nb = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dz]) => [bx + dx, bz + dz]).find(([cx, cz]) => island.has(`${cx},${cz}`))
    if (!nb || !island.has(`${bx},${bz}`)) throw new Error('no two blocks to keep')
    const rest = [...island].map(k => k.split(',').map(Number)).filter(([cx, cz]) => !(cx === bx && cz === bz) && !(cx === nb[0] && cz === nb[1]))
    const last = drop(byAngle(rest, bot.entity.yaw + 0.3, bx + 0.5, bz + 0.5), 1)
    await ctx.easeLook(bot.entity.yaw, -1.1, 600)
    await last
    await ctx.easeLookAt(new Vec3(nb[0] + 0.5, Y + 0.6, nb[1] + 0.5), 1200)   // the one block left beside it
    await K.until(K.at(30), K.drift(-0.004))

    // ---- 7. one TNT, from the sky, onto that block: 5.00 on the fuse ----
    ctx.mark('l7')
    const tx = nb[0] + 0.5, tz = nb[1] + 0.5
    bot.chat(`/summon tnt ${tx} ${Y + 16} ${tz} {fuse:100}`)
    ctx.sound('entity.tnt.primed', 1, 1)
    await bot.waitForTicks(2)
    const tnt = K.mobs('tnt')[0]
    if (!tnt) throw new Error('no tnt')
    for (let i = 0; i < 44 && bot.entities[tnt.id]; i++) { await K.track(tnt.position.offset(0, 0.5, 0), 0.3); await bot.waitForTicks(1) }
    ctx.mark('landed')
    // nowhere to go: a look down at the drop, back at the fuse, back away to the far edge of its block
    await ctx.easeLook(Math.PI / 2, -1.2, 700)
    await ctx.easeLookAt(new Vec3(tx, Y + 1.5, tz), 500)
    bot.setControlState('sneak', true); bot.setControlState('back', true)
    for (let i = 0; i < 9; i++) { await K.track(new Vec3(tx, Y + 1.5, tz), 0.4); await bot.waitForTicks(1) }
    bot.setControlState('back', false)
    let boomed = false
    await K.until(K.at(35) + 10, async () => {
      if (!boomed && !bot.entities[tnt.id]) { boomed = true; ctx.mark('boom') }
      if (!ctx.died) await K.track(new Vec3(tx, Y + 1.4 + 0.15 * Math.sin(ctx.tick / 3), tz), 0.3)
    })
    bot.setControlState('sneak', false)
    if (!ctx.died) throw new Error('survived the tnt')
    await bot.waitForTicks(40)
    bot._client.removeListener('damage_event', onDmg); bot._client.removeListener('entity_status', onStatus)
    return ctx.died
  }
}
