// "every 5 seconds it gets worse 😰" (escalation series, worker 18), Short 1: a grass island in a
// lava sea. A SURVIVE countdown runs from 35.00 and every 5 s (100 ticks, on the dot) the world
// gets worse; the bot answers each one in survival (sword, retreat, pillar):
//   0 s  the lava rises a block (one grass layer left above it)
//   5 s  a creeper walks up: the bot lets it hiss, knocks it back (Knockback sword), it blows a crater
//  10 s  TNT rain: three primed TNT drop onto the island; the bot backs off and watches them go
//  15 s  night falls: the sun sinks in ~3 s, the island is lit by the lava
//  20 s  two creepers at once, one from each side
//  25 s  the floor breaks: the island turns to lava ring by ring, down to the one block under it
//  30 s  the lava rises every 0.7 s: the bot pillars, and at 0.00 the lava stops one block below it
// Commands only build the set and play the game master (lava layers, summons, the time of day);
// every action of the player is a real survival action.
const kit = require('../lib/escalation')
const L = 8            // island half-size (17 x 17)
const R = 56           // lava sea half-size (wide: the cut hillsides at the edge of the cleared box stay far back)
const LEVEL = 100      // ticks per level (5 s)

module.exports = {
  name: 'worse_lava',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'every 5 seconds it gets worse 😰',
  edit: {
    caption: 'every 5 seconds it gets worse 😰', red: 'worse',
    song: 'songs/funk_abnormal.mp3', dropAt: 'l7',
    startAt: 'go:-0.5', endAfter: 'done:0.9',
    countdown: 'go:done:SURVIVE',
    counter: { at: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'], total: 7 },
    cards: [
      ['l1', 'THE LAVA RISES', 1.0, 'orange'], ['l2', '+1 CREEPER', 1.0, 'green'], ['l3', 'TNT RAIN', 1.0, 'red'],
      ['l4', 'NIGHT FALLS', 1.0, 'blue'], ['l5', '+2 CREEPERS', 1.0, 'green'], ['l6', 'THE FLOOR BREAKS', 1.0, 'yellow'],
      ['l7', 'THE LAVA SPEEDS UP', 1.0, 'red'], ['done', 'SURVIVED', 1.2, 'green']
    ],
    punch: ['boom1', 'tntboom', 'done'],
    deathScreen: true
  },
  botTimeout: 300,
  time: 10500,         // late afternoon: the sun is already low in the west for the night beat

  async setup (ctx) {
    const { bot } = ctx
    // flat ground: the cleared box against a hill left a cut wall behind the oak (review 3)
    const g = await kit(ctx).flatSite(R + 10)
    const { x, z } = g, G = g.y
    this.x = x; this.z = z; this.G = G
    await ctx.defaultRules()
    await ctx.cmd('/gamerule random_tick_speed 0')
    await ctx.cmd('/gamerule log_admin_commands false')
    const C = R + 2
    for (let y0 = G + 1; y0 <= G + 28; y0 += 2) await ctx.cmd(`/fill ${x - C} ${y0} ${z - C} ${x + C} ${y0 + 1} ${z + C} air`)
    await ctx.cmd(`/fill ${x - C} ${G} ${z - C} ${x + C} ${G} ${z + C} grass_block`)
    for (let y0 = G - 4; y0 <= G - 1; y0 += 1) await ctx.cmd(`/fill ${x - C} ${y0} ${z - C} ${x + C} ${y0} ${z + C} dirt`)
    // the island: dirt with a grass top, standing 2 blocks out of the lava
    await ctx.cmd(`/fill ${x - L} ${G + 1} ${z - L} ${x + L} ${G + 3} ${z + L} dirt`)
    await ctx.cmd(`/fill ${x - L} ${G + 4} ${z - L} ${x + L} ${G + 4} ${z + L} grass_block`)
    for (const y of [G + 1, G + 2]) await ctx.cmd(`/fill ${x - R} ${y} ${z - R} ${x + R} ${y} ${z + R} lava replace air`)
    // a lone oak on a dirt islet off the south edge: the first rise swallows the islet's top on camera
    // (from on the island its outer faces point away), and in the finale the lava climbs its trunk
    // a tall one: the bot pillars to G+11 and the trunk has to stay at eye level for the lava line on it to read
    await ctx.cmd(`/fill ${x} ${G + 1} ${z + 13} ${x} ${G + 3} ${z + 13} dirt`)
    await ctx.cmd(`/fill ${x - 2} ${G + 13} ${z + 11} ${x + 2} ${G + 14} ${z + 15} oak_leaves[persistent=true]`)
    await ctx.cmd(`/fill ${x - 1} ${G + 15} ${z + 12} ${x + 1} ${G + 15} ${z + 14} oak_leaves[persistent=true]`)
    await ctx.cmd(`/fill ${x} ${G + 4} ${z + 13} ${x} ${G + 14} ${z + 13} oak_log`)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty easy')
    await ctx.hotbar(['diamond_sword[enchantments={knockback:1}]', ['cobblestone', 64], ['bread', 16], ['torch', 8]])
    // on the south edge, looking down its side: the last dirt layer above the lava, which the first
    // rise swallows (from the middle of the island the rise couldn't be seen: review 1)
    await ctx.tpCheck(x + 0.5, G + 5, z + 8.2, 0, 30)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y: G, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, G } = this
    const W = (dx, dy, dz) => new Vec3(x + dx, G + dy, z + dz)
    // mob hits and deaths, for the renderer (no mob hurt flash yet: asked worker 11)
    const onDmg = (p) => { if (bot.entity && p.entityId !== bot.entity.id) ctx.mark('mob_hurt', { id: p.entityId }) }
    const onStatus = (p) => { if (p.entityStatus === 3) ctx.mark('mob_death', { id: p.entityId }) }
    bot._client.on('damage_event', onDmg); bot._client.on('entity_status', onStatus)

    // ---- the game master: every level lands on its exact tick ----
    let go = null, lavaY = G + 2, pillarTop = G + 4, fast = false, lastRise = 0
    const at = (s) => go + Math.round(s * 20)
    const riseTo = (y) => {
      while (lavaY < y) { lavaY++; bot.chat(`/fill ${x - R} ${lavaY} ${z - R} ${x + R} ${lavaY} ${z + R} lava replace air`) }
      ctx.sound('block.lava.pop', 1, 0.8 + (lavaY % 3) * 0.1); ctx.sound('block.lava.ambient', 0.8)
    }
    const until = async (tk, each) => { while (ctx.tick < tk) { if (each) await each(); await bot.waitForTicks(1) } }
    const creepers = () => Object.values(bot.entities).filter(e => e.name === 'creeper')
    const eye = () => bot.entity.position.offset(0, 1.62, 0)
    // smooth tracking: move part of the way to the target each tick (no snaps)
    const track = async (p, k = 0.3) => {
      const d = p.minus(eye())
      const ty = Math.atan2(-d.x, -d.z), tp = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = ty - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      await bot.look(bot.entity.yaw + dy * k, bot.entity.pitch + (tp - bot.entity.pitch) * k, true)
    }
    const swellOf = (c) => c && c.metadata && c.metadata[16] === 1
    // fight one creeper: track it, let it hiss, knock it back, back off and watch it blow
    const fight = async (c, deadline) => {
      let swell = 0, hits = 0, cool = 0
      while (ctx.tick < deadline && bot.entities[c.id]) {
        await track(c.position.offset(0, 1.1, 0), 0.35)
        const d = c.position.distanceTo(bot.entity.position)
        if (swellOf(c)) swell++; else swell = 0
        if (process.env.DEBUG && ctx.tick % 5 === 0) ctx.log('creeper', c.id, 'd', d.toFixed(2), 'meta16', c.metadata && c.metadata[16], 'swell', swell, 'hits', hits)
        if (cool > 0) cool--
        if (swell === 1) { ctx.sound('entity.creeper.primed', 1, 1); ctx.mark('hiss') }
        if (cool === 0 && d < 3.1 && (swell >= 5 || d < 2.0)) {
          bot.attack(c, false); bot.swingArm()
          ctx.sound('entity.player.attack.knockback', 1, 1); ctx.sound('entity.creeper.hurt', 1, 1)
          ctx.mark('hit'); hits++; cool = 14
        }
        await bot.waitForTicks(1)
      }
      return !bot.entities[c.id]
    }

    await bot.waitForTicks(6)
    go = ctx.tick + 6
    // a slow drift before go: the shot is never still
    await until(go, () => bot.look(bot.entity.yaw + 0.01, bot.entity.pitch + 0.002, true))
    ctx.mark('go')

    // ---- 1. the lava rises ----
    // the rise lands once the card has shrunk out of the way (under the full-size card it was missed: review 4)
    ctx.mark('l1')
    for (let i = 0; i < 7; i++) { await bot.look(bot.entity.yaw + 0.006, bot.entity.pitch + 0.003, true); await bot.waitForTicks(1) }
    riseTo(G + 3)
    // (mineflayer yaw: 0 north, -pi/2 east, pi/2 west) along the side it just climbed, then away from
    // the edge: it walks back into the middle of the island
    await bot.waitForTicks(3)
    await ctx.easeLook(Math.PI - 0.9, -0.75, 900)
    await ctx.easeLook(0.3, -0.2, 900)
    bot.setControlState('forward', true)
    for (let i = 0; i < 60 && bot.entity.position.z > z + 5.6; i++) { await bot.look(bot.entity.yaw - 0.006, bot.entity.pitch, true); await bot.waitForTicks(1) }
    bot.setControlState('forward', false)
    // the whole island, lava on every side: a look round from the middle
    await ctx.easeLook(1.4, -0.45, 900)   // (the lava edge in the top third)
    await ctx.easeLook(0, -0.3, 700)
    await until(at(5), () => bot.look(bot.entity.yaw + 0.007, bot.entity.pitch + 0.002 * Math.sin(ctx.tick / 6), true))

    // ---- 2. a creeper ----
    if (ctx.tick > at(5) + 1) throw new Error('level 2 late')   // the 5 s grid must hold
    ctx.mark('l2')
    bot.chat(`/summon creeper ${x + 0.5} ${G + 5} ${z - 0.5} {PersistenceRequired:1b,Rotation:[0f,0f]}`)
    await bot.waitForTicks(2)
    let c = creepers()[0]
    if (!c) throw new Error('no creeper')
    await fight(c, at(9.6))
    ctx.mark('boom1')
    if (creepers().length) throw new Error('creeper 1 never blew')
    await ctx.easeLookAt(W(0.5, 3.5, -1), 450)              // the crater it left
    await until(at(10), () => bot.look(bot.entity.yaw + 0.007, bot.entity.pitch + 0.002 * Math.sin(ctx.tick / 6), true))

    // ---- 3. TNT rain ----
    if (ctx.tick > at(10) + 1) throw new Error('level 3 late')   // the 5 s grid must hold
    ctx.mark('l3')
    const tnts = [[-4, -4], [0, -6], [4, -3]]
    for (const [dx, dz] of tnts) bot.chat(`/summon tnt ${x + dx + 0.5} ${G + 17} ${z + dz + 0.5} {fuse:52}`)
    ctx.sound('entity.tnt.primed', 1, 1)
    await bot.waitForTicks(5)
    await ctx.easeLookAt(W(0.5, 13, -4), 350)              // they're coming down
    // follow them down, backing off to the south edge
    bot.setControlState('back', true)
    for (let i = 0; i < 48; i++) {
      const ts = Object.values(bot.entities).filter(e => e.name === 'tnt')
      if (ts.length) {
        const m = ts.reduce((a, e) => a.plus(e.position), new Vec3(0, 0, 0)).scaled(1 / ts.length)
        await track(m.offset(0, 0.5, 0), 0.25)
      }
      if (bot.entity.position.z > z + 7.2) bot.setControlState('back', false)
      await bot.waitForTicks(1)
    }
    bot.setControlState('back', false)
    for (let i = 0; i < 40 && Object.values(bot.entities).some(e => e.name === 'tnt'); i++) {
      const ts = Object.values(bot.entities).filter(e => e.name === 'tnt')
      if (ts.length) await track(ts[1 % ts.length].position.offset(0, 0.5, 0), 0.15)
      await bot.waitForTicks(1)
    }
    ctx.mark('tntboom')
    await ctx.easeLookAt(W(0.5, 3, -3), 600)                // the craters, lava pouring in
    await until(at(15), () => bot.look(bot.entity.yaw - 0.007, bot.entity.pitch + 0.002 * Math.sin(ctx.tick / 6), true))

    // ---- 4. night falls ----
    if (ctx.tick > at(15) + 1) throw new Error('level 4 late')   // the 5 s grid must hold
    ctx.mark('l4')
    // the sun goes down in the west: the camera follows it
    const easeSun = ctx.easeLook(Math.PI / 2 + 0.2, 0.25, 850)
    // one step a tick (steps of 4 ticks jumped the sky visibly: qa flags f1047-1071)
    for (let k = 1; k <= 56; k++) {
      const tm = 10500 + Math.round(3300 * k / 56)
      bot.chat(`/time set ${tm}`); ctx.dayTime = tm; ctx.mark('time', { time: tm })
      if (k === 20) await easeSun
      if (k > 20) await bot.look(bot.entity.yaw - 0.012, bot.entity.pitch - 0.005, true)   // following the sun down
      await bot.waitForTicks(1)
    }
    // dark now: a torch down beside it (a real placement on the grass next to its feet)
    ctx.select(3)
    const fx = Math.floor(bot.entity.position.x) - 1, fz = Math.floor(bot.entity.position.z)
    const tb = bot.blockAt(new Vec3(fx, G + 4, fz)), above = bot.blockAt(new Vec3(fx, G + 5, fz))
    await ctx.easeLookAt(new Vec3(fx + 0.5, G + 5, fz + 0.5), 600)
    if (tb && tb.name === 'grass_block' && above && above.name === 'air') {
      bot._client.write('block_place', { hand: 0, location: { x: fx, y: G + 4, z: fz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.wood.place', 1, 1); ctx.mark('place', { x: fx, y: G + 5, z: fz }); ctx.mark('torch')
    }
    await bot.waitForTicks(8)
    ctx.select(0)
    await ctx.easeLook(0, -0.15, 1000)                       // back to the island
    await until(at(20), () => bot.look(bot.entity.yaw + 0.007, bot.entity.pitch + 0.002 * Math.sin(ctx.tick / 6), true))

    // ---- 5. two creepers ----
    if (ctx.tick > at(20) + 1) throw new Error('level 5 late')   // the 5 s grid must hold
    ctx.mark('l5')
    const p0 = bot.entity.position
    // one ahead-left, one ahead-right, each on grass that's still there (not a crater)
    const ground = (wx, wz) => { const b = bot.blockAt(new Vec3(Math.floor(wx), G + 4, Math.floor(wz))); return b && b.name === 'grass_block' }
    const spot = (cands) => cands.map(([dx, dz]) => [p0.x + dx, p0.z + dz]).find(([wx, wz]) => ground(wx, wz) && ground(wx + 0.3, wz + 0.3) && ground(wx - 0.3, wz - 0.3))
    // both in view: ahead, about 20 degrees either side of where it looks
    const yw = bot.entity.yaw
    const around = (side) => [5, 4.5, 4, 5.5, 3.5].flatMap(d => [0.2, 0.15, 0.28].map(a => [-Math.sin(yw + side * a) * d, -Math.cos(yw + side * a) * d]))
    const sl = spot(around(1)), sr = spot(around(-1))
    if (!sl || !sr) throw new Error('no ground for the creepers')
    bot.chat(`/summon creeper ${sl[0].toFixed(2)} ${G + 5} ${sl[1].toFixed(2)} {PersistenceRequired:1b,Rotation:[-30f,0f]}`)
    bot.chat(`/summon creeper ${sr[0].toFixed(2)} ${G + 5} ${sr[1].toFixed(2)} {PersistenceRequired:1b,Rotation:[30f,0f]}`)
    await bot.waitForTicks(2)
    const two = creepers().sort((a, b) => a.position.distanceTo(p0) - b.position.distanceTo(p0))
    if (two.length < 2) throw new Error('no creepers')
    await fight(two[0], at(23))
    ctx.mark('boom2')
    if (bot.entities[two[1].id]) await fight(two[1], at(24.9))
    ctx.mark('boom3')
    if (creepers().length) throw new Error('creepers never blew')
    await until(at(25), () => bot.look(bot.entity.yaw + 0.007, bot.entity.pitch + 0.002 * Math.sin(ctx.tick / 6), true))

    // ---- 6. the floor breaks ----
    if (ctx.tick > at(25) + 1) throw new Error('level 6 late')   // the 5 s grid must hold
    ctx.mark('l6')
    // the block it stands on: the solid grass cell under its feet nearest to it (it can straddle a crater edge)
    const p6 = bot.entity.position
    const under = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([dx, dz]) => [Math.floor(p6.x) + dx, Math.floor(p6.z) + dz])
      .filter(([cx, cz]) => { const b = bot.blockAt(new Vec3(cx, G + 4, cz)); return b && b.name === 'grass_block' })
      .sort((p, q) => Math.hypot(p[0] + 0.5 - p6.x, p[1] + 0.5 - p6.z) - Math.hypot(q[0] + 0.5 - p6.x, q[1] + 0.5 - p6.z))[0]
    if (!under) throw new Error('not standing on the island')
    const [bx, bz] = under
    // onto the middle of its own block first: straddling two columns, the lava next door burned it (bot test)
    await kit(ctx).stepTo(bx + 0.5, bz + 0.5, 16)
    // face the biggest stretch of island left: the rings come toward the camera across it
    let gx = 0, gz = 0, gn = 0
    for (let dx = -10; dx <= 10; dx++) for (let dz = -10; dz <= 10; dz++) { const b = bot.blockAt(new Vec3(bx + dx, G + 4, bz + dz)); if (b && b.name === 'grass_block') { gx += dx; gz += dz; gn++ } }
    const y6 = gn ? Math.atan2(-gx / gn, -gz / gn) : bot.entity.yaw
    const lookDown = ctx.easeLook(y6, -0.45, 600)   // the island going under, ring by ring, toward it
    let ld = false; lookDown.then(() => { ld = true })
    for (let r = 16; r >= 1; r--) {
      // the ring at Chebyshev distance r from the bot's block turns to lava, crumbs where the grass was
      let n = 0
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
        const b = bot.blockAt(new Vec3(bx + dx, G + 4, bz + dz))
        if (b && b.name === 'grass_block') { if (n++ % 3 === 0) ctx.particles('block', b.position, { block: 'grass_block' }) }
      }
      const sides = [[bx - r, bz - r, bx + r, bz - r], [bx - r, bz + r, bx + r, bz + r], [bx - r, bz - r + 1, bx - r, bz + r - 1], [bx + r, bz - r + 1, bx + r, bz + r - 1]]
      for (const [ax, az, cx, cz] of sides) for (const what of ['dirt', 'grass_block']) bot.chat(`/fill ${ax} ${G + 1} ${az} ${cx} ${G + 4} ${cz} lava replace ${what}`)
      ctx.sound('block.gravel.break', 1, 0.6 + r * 0.03); ctx.sound('block.lava.pop', 0.7)
      bot.chat('/kill @e[type=item]')   // a popped torch would burn in the lava, not come back to the hotbar
      if (r === 3) { await lookDown; ctx.easeLook(y6 - 0.4, -0.8, 900) }
      for (let i = 0; i < (n ? 4 : 1); i++) { if (ld && r > 3) await bot.look(bot.entity.yaw - 0.006, bot.entity.pitch, true); await bot.waitForTicks(1) }
    }
    ctx.mark('one_block')
    await ctx.easeLook(bot.entity.yaw, -1.35, 400)   // the one block it's standing on
    await bot.waitForTicks(4)
    // the one thing still standing out there: the oak, its feet in the lava
    const tree = new Vec3(x + 0.5, G + 6, z + 13.5)
    await ctx.easeLookAt(new Vec3(x + 0.5, G + 12, z + 13.5), 350)   // the whole oak, crown and all
    await ctx.easeLookAt(tree, 350)
    await until(at(29.5), () => bot.look(bot.entity.yaw + 0.004, bot.entity.pitch - 0.001, true))
    ctx.select(1)
    await until(at(30), () => bot.look(bot.entity.yaw + 0.006, bot.entity.pitch, true))

    // ---- 7. lava every second: pillar ----
    if (ctx.tick > at(30) + 1) throw new Error('level 7 late')   // the 5 s grid must hold
    ctx.mark('l7')
    riseTo(G + 4)
    let nextRise = at(30) + 14
    const rise = () => {
      if (ctx.tick < nextRise || lavaY >= pillarTop - 1) return
      nextRise = ctx.tick + 14
      riseTo(lavaY + 1)
    }
    bot.on('physicsTick', rise)
    const yaw0 = bot.entity.yaw
    // each block: look down at the top it's placed on (a real aim), then back up at the oak, where the
    // lava climbing the trunk shows the speed-up (from on top of a 1x1 the pillar's own sides never show)
    for (let k = 0; k < 8 && ctx.tick < at(34.4); k++) {
      const base = pillarTop
      await ctx.easeLook(yaw0, -1.25, 200)
      bot.setControlState('jump', true)
      for (let i = 0; i < 20 && bot.entity.position.y < base + 2.1; i++) await bot.waitForTicks(1)
      bot.setControlState('jump', false)
      bot._client.write('block_place', { hand: 0, location: { x: bx, y: base, z: bz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.stone.place', 1, 0.9)
      pillarTop = base + 1
      const up = ctx.easeLookAt(new Vec3(x + 0.5, Math.max(G + 5, lavaY + 1.5), z + 13.5), 300)
      for (let i = 0; i < 20 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
      await up
    }
    // the last rises catch up to one block below the top, on the 35 s mark
    bot.removeListener('physicsTick', rise)
    // sneak to the edge before 0.00 and look down past it: the top block's side, then the lava a block down
    bot.setControlState('sneak', true)
    ctx.easeLook(bot.entity.yaw + 0.2, -1.45, 400)
    bot.setControlState('forward', true)
    await until(at(35) - 1, () => {})
    bot.setControlState('forward', false)
    riseTo(pillarTop - 1)
    ctx.mark('done')
    await ctx.easeLook(bot.entity.yaw - 0.5, -1.4, 900)
    await bot.waitForTicks(4)
    bot.setControlState('sneak', false)
    bot._client.removeListener('damage_event', onDmg); bot._client.removeListener('entity_status', onStatus)
    ctx.log('lava', lavaY, 'top', pillarTop, 'health', bot.health)
    return !ctx.died && bot.entity.position.y > pillarTop - 0.2
  }
}
