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
    startAt: 'go:0', endAfter: 'death:1.4',
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
    await ctx.hotbar(['diamond_sword[enchantments={knockback:2}]', ['cobblestone', 64]])
    // one block in from the south edge, looking down over it: the island's edge and the 40-block drop
    await ctx.tpCheck(x + 0.5, Y + 1, z + 2.5, 0, 62)
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
    // walk back to the middle of the island (eyes ahead), by a deadline
    const toCenter = async (deadline) => {
      const d = () => Math.hypot(bot.entity.position.x - x - 0.5, bot.entity.position.z - z - 0.5)
      if (d() < 0.6) return
      bot.setControlState('sneak', false)
      // a slow turn toward the middle first (a 0.3 s whip read badly: review 8)
      await ctx.easeLookAt(new Vec3(x + 0.5, Y + 1.4, z + 0.5), Math.max(100, Math.min(600, (deadline - ctx.tick) * 50 - 100)))
      if (ctx.tick >= deadline) return
      bot.setControlState('forward', true)
      for (let i = 0; i < 60 && d() > 0.35 && ctx.tick < deadline; i++) { await K.track(new Vec3(x + 0.5, Y + 1.4, z + 0.5), 0.3); await bot.waitForTicks(1) }
      bot.setControlState('forward', false)
    }
    const offIsland = (m) => !bot.entities[m.id] || m.position.y < Y - 0.5
    // watch it go: eyes follow it down for a moment
    // (yaw only, pitch kept near the horizon: from the middle the edge hides it and pitching down showed grass: review 1)
    const watchFall = async (m, ticks = 12) => { for (let i = 0; i < ticks && bot.entities[m.id]; i++) { const p = m.position; const ty = Math.atan2(-(p.x - bot.entity.position.x), -(p.z - bot.entity.position.z)); let dy = ty - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; await bot.look(bot.entity.yaw + dy * 0.25, Math.max(-0.3, bot.entity.pitch - 0.02), true); await bot.waitForTicks(1) } }
    // clockwise from a0 (mineflayer yaw falls going clockwise: north 0, east -pi/2), as seen from (ox, oz)
    const byAngle = (cells, a0, ox = x, oz = z) => cells.sort((p, q) => {
      const a = (c) => { let v = a0 - Math.atan2(-(c[0] + 0.5 - ox), -(c[1] + 0.5 - oz)); while (v < 0) v += 2 * Math.PI; while (v >= 2 * Math.PI) v -= 2 * Math.PI; return v }
      return a(p) - a(q)
    })
    // the cells still there
    const island = new Set()
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) island.add(`${x + dx},${z + dz}`)
    const drop = (cells, perTick, gap = 1) => { const c = cells.filter(([cx, cz]) => island.has(`${cx},${cz}`)); for (const [cx, cz] of c) island.delete(`${cx},${cz}`); return K.crumble(c, Y - 2, Y + 1, perTick, gap) }

    await bot.waitForTicks(6)
    const go = K.start(6)
    // the storm starts on its own tick, ~0.9 s before its card (the client fades rain in)
    const storm = () => { if (ctx.tick >= K.at(9.1)) { bot.removeListener('physicsTick', storm); ctx.setWeather('thunder') } }
    bot.on('physicsTick', storm)
    await K.until(go, K.drift(-0.012, -0.002))
    ctx.mark('go')

    // ---- 1. the edge falls away ----
    ctx.mark('l1')
    // it starts on the south edge: that side goes first, column by column, while it leans over and
    // watches the blocks drop the whole way, then the east side (blocks falling off an edge only show
    // from right at that edge: reviews 5-11). The north and west sides go out of view, quickly.
    const ring4 = K.ring(x, z, 4)
    const front = ring4.filter(([cx, cz]) => cz === z + 4).sort((p, q) => Math.abs(p[0] - x) - Math.abs(q[0] - x))
    const east = ring4.filter(([cx, cz]) => cx === x + 4 && cz !== z + 4).sort((p, q) => q[1] - p[1])
    const restL1 = ring4.filter(([cx, cz]) => cz !== z + 4 && cx !== x + 4)
    const crumbling = (async () => { await drop(front, 1, 2); await drop(east, 1, 2); await drop(restL1, 3, 1) })()
    bot.setControlState('sneak', true); bot.setControlState('forward', true)
    await ctx.easeLook(Math.PI, -1.3, 500)
    for (let i = 0; i < 20; i++) { await bot.look(Math.PI + 0.25 * Math.sin(i / 12), -1.3 + 0.05 * Math.sin(i / 9), true); await bot.waitForTicks(1) }
    bot.setControlState('forward', false)
    // along the east side as it goes (south to north)
    for (const zz of [z + 3, z + 1, z - 1, z - 3]) await ctx.easeLookAt(new Vec3(x + 4.5, Y - 3, zz + 0.5), 300)
    // back over the south edge: the first blocks are still on their way down
    await ctx.easeLook(Math.PI - 0.2, -1.25, 600)
    await crumbling
    await K.until(K.at(3.5), K.drift(-0.006, 0.001))
    // and a couple of steps back from the new edge, eyes on it
    bot.setControlState('sneak', false); bot.setControlState('back', true)
    for (let i = 0; i < 30 && bot.entity.position.z > z + 1.0 && ctx.tick < K.at(4.7); i++) { await bot.look(bot.entity.yaw, Math.min(-0.5, bot.entity.pitch + 0.03), true); await bot.waitForTicks(1) }
    bot.setControlState('back', false); bot.setControlState('sneak', false)
    await K.until(K.at(4.95), K.drift(0.006, 0.001))
    await K.level(2, 5)
    bot.chat(`/summon creeper ${x + 0.5} ${Y + 1} ${z + 3.5} {PersistenceRequired:1b,Rotation:[180f,0f]}`)
    await bot.waitForTicks(2)
    const c = K.mobs('creeper')[0]
    if (!c) throw new Error('no creeper')
    if (!await K.fight(c, K.at(9.5), { waitSwell: 12, gone: offIsland })) throw new Error('creeper stayed')
    ctx.mark('off1')
    await watchFall(c, 5)
    // where did it go: walk to that edge, sneak the last step and look over it, eyes on it all the way down
    const followC = async () => { if (bot.entities[c.id]) { const d = c.position.minus(K.eye()); const ty = Math.atan2(-d.x, -d.z), tp = Math.max(-1.35, Math.atan2(d.y, Math.hypot(d.x, d.z))); let dy = ty - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; await bot.look(bot.entity.yaw + dy * 0.2, bot.entity.pitch + (tp - bot.entity.pitch) * 0.2, true) } }
    bot.setControlState('forward', true)
    for (let i = 0; i < 30 && bot.entity.position.z < z + 3.4 && ctx.tick < K.at(8.9); i++) { await followC(); await bot.waitForTicks(1) }
    bot.setControlState('sneak', true)
    for (let i = 0; i < 30 && ctx.tick < K.at(9.2); i++) { await followC(); await bot.waitForTicks(1) }
    bot.setControlState('forward', false)
    for (let i = 0; i < 10 && ctx.tick < K.at(9.35); i++) { await followC(); await bot.waitForTicks(1) }
    bot.setControlState('sneak', false)
    await toCenter(K.at(9.85))
    await K.until(K.at(9.4))
    await K.level(3, 10)
    ctx.sound('entity.lightning_bolt.thunder', 0.9, 0.85)   // a strike somewhere out of sight
    await ctx.easeLook(bot.entity.yaw + 0.3, 0.45, 500)  // up into it
    await bot.waitForTicks(3)
    await toCenter(K.at(11.6))   // (the rail's far edge has to be in reach)
    // a railing on the north edge so the wind and the mobs can't knock it off that side: three real placements
    ctx.select(1)
    for (const dx of [-1, 0, 1]) {
      const cx = x + dx, cz = z - 3
      await ctx.easeLookAt(new Vec3(cx + 0.5, Y + 1.2, cz + 0.5), dx === -1 ? 700 : 300)
      bot._client.write('block_place', { hand: 0, location: { x: cx, y: Y, z: cz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.stone.place', 1, 0.9); ctx.mark('place', { x: cx, y: Y + 1, z: cz })
      await bot.waitForTicks(4)
      // the server can refuse a placement out of reach: no railing on screen means a failed take (review 10)
      const rb = bot.blockAt(new Vec3(cx, Y + 1, cz))
      if (!rb || rb.name !== 'cobblestone') throw new Error(`railing block not placed at ${cx},${cz}`)
    }
    ctx.select(0)
    if (ctx.tick < K.at(14.4)) await ctx.easeLookAt(new Vec3(x + 0.5, Y + 1.2, z - 2.5), 400)
    // stays on the railing (testing it) until something groans behind it
    // testing it, eyes along it end to end
    if (ctx.tick < K.at(13.6)) {
      await ctx.easeLookAt(new Vec3(x - 1.2, Y + 1.3, z - 2.5), 500)
      await ctx.easeLookAt(new Vec3(x + 2.2, Y + 1.3, z - 2.5), 700)
    }
    await K.until(K.at(15), K.drift(-0.012, 0.001))

    // ---- 4. two zombies ----
    await K.level(4, 15)
    bot.chat(`/summon zombie ${x - 1.5} ${Y + 1} ${z + 3.5} {PersistenceRequired:1b,Rotation:[160f,0f]}`)
    bot.chat(`/summon zombie ${x + 2.5} ${Y + 1} ${z + 3.5} {PersistenceRequired:1b,Rotation:[-160f,0f]}`)
    ctx.sound('entity.zombie.ambient', 1, 0.95)
    await bot.waitForTicks(2)
    const zs = K.mobs('zombie').sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))
    if (zs.length < 2) throw new Error('no zombies')
    for (let i = 0; i < 2; i++) {
      if (!await K.fight(zs[i], K.at(i ? 19.7 : 18.6), { gone: offIsland, reach: 2.9, minTicks: i ? 0 : 14 })) throw new Error('zombie stayed')
      ctx.mark(`off${i + 2}`)
      await watchFall(zs[i], 8)
    }
    // back to the middle if a hit pushed it, facing the island
    await toCenter(K.at(19.3))
    if (ctx.tick < K.at(19.2)) await ctx.easeLook(bot.entity.yaw + 0.9, -0.55, 700)   // what's left of the island around it
    await K.until(K.at(20), K.drift(0.012, 0.001))

    // ---- 5. the island shrinks ----
    await K.level(5, 20)
    // everything but the 3x3 around the bot's own block
    const sx = Math.floor(bot.entity.position.x), sz = Math.floor(bot.entity.position.z)
    const outer = [...island].map(k => k.split(',').map(Number)).filter(([cx, cz]) => Math.max(Math.abs(cx - sx), Math.abs(cz - sz)) >= 2)
    const shrink = drop(byAngle(outer, bot.entity.yaw + 0.3, sx + 0.5, sz + 0.5), 2)
    await ctx.easeLook(bot.entity.yaw - 0.4, -0.9, 700)
    await ctx.easeLook(bot.entity.yaw - 1.4, -0.85, 1300)
    await shrink
    // all that's left: a slow look round the 3x3 from its middle (its edges against the drop on every side)
    await ctx.easeLook(bot.entity.yaw + 1.2, -0.8, 1300)
    await ctx.easeLook(bot.entity.yaw + 0.8, -0.8, 700)
    await K.until(K.at(25), K.drift(0.012, 0.001))

    // ---- 6. two blocks left ----
    await K.level(6, 25)
    // keep the bot's own block and one corner of the 3x3 (the TNT lands there: ~2 blocks off, not in its face)
    const bx = Math.floor(bot.entity.position.x), bz = Math.floor(bot.entity.position.z)
    const nb = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dz]) => [bx + dx, bz + dz]).find(([cx, cz]) => island.has(`${cx},${cz}`))
    if (!nb || !island.has(`${bx},${bz}`)) throw new Error('no two blocks to keep')
    const rest = [...island].map(k => k.split(',').map(Number)).filter(([cx, cz]) => !(cx === bx && cz === bz) && !(cx === nb[0] && cz === nb[1]))
    const last = drop(byAngle(rest, bot.entity.yaw + 0.3, bx + 0.5, bz + 0.5), 1)
    await ctx.easeLook(bot.entity.yaw, -1.1, 600)
    await last
    await ctx.easeLookAt(new Vec3(nb[0] + 0.5, Y + 0.6, nb[1] + 0.5), 900)   // the one block left beside it
    // it tries to build the island back: one cobblestone off the other side of its block
    const sdx = nb[0] > bx ? -1 : 1
    ctx.select(1)
    bot.setControlState('sneak', true)
    await ctx.easeLookAt(new Vec3(bx + (sdx > 0 ? 1.05 : -0.05), Y + 0.5, bz + 0.5), 1100)
    bot._client.write('block_place', { hand: 0, location: { x: bx, y: Y, z: bz }, direction: sdx > 0 ? 5 : 4, cursorX: sdx > 0 ? 1 : 0, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('block.stone.place', 1, 0.9); ctx.mark('place', { x: bx + sdx, y: Y, z: bz }); ctx.mark('bridge')
    await bot.waitForTicks(8)
    await ctx.easeLookAt(new Vec3(nb[0] + 0.5, Y + 0.8, nb[1] + 0.5), 700)   // three blocks now... and the corner one
    await K.until(K.at(29.6), K.drift(0.008, 0.002))
    bot.setControlState('sneak', false)
    ctx.select(0)
    await K.until(K.at(30))

    // ---- 7. one TNT, from the sky, onto that block: 5.00 on the fuse ----
    await K.level(7, 30)
    const tx = nb[0] + 0.5, tz = nb[1] + 0.5
    bot.chat(`/summon tnt ${tx} ${Y + 16} ${tz} {fuse:100}`)
    ctx.sound('entity.tnt.primed', 1, 1)
    await bot.waitForTicks(2)
    const tnt = K.mobs('tnt')[0]
    if (!tnt) throw new Error('no tnt')
    for (let i = 0; i < 44 && bot.entities[tnt.id]; i++) { await K.track(tnt.position.offset(0, 0.5, 0), i < 8 ? 0.12 : 0.3); await bot.waitForTicks(1) }
    ctx.mark('landed')
    // nowhere to go: eyes on the fuse, it backs away to the far edge of its block
    bot.setControlState('sneak', true); bot.setControlState('back', true)
    for (let i = 0; i < 12; i++) { await K.track(new Vec3(tx, Y + 1.5, tz), 0.4); await bot.waitForTicks(1) }
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
