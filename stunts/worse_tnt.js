// "every 5 seconds it gets worse 😰" (escalation series, worker 18), Short 3: the TNT doubles.
// A SURVIVE countdown runs from 35.00; every 5 s (100 ticks, on the dot) twice as many primed TNT
// drop out of the sky around the bot: 1, 2, 4, 8, 16, 32... and 64. The bot reads where they land
// and sprints clear of each wave (a blast hurts within 8 blocks); the field turns into one big crater.
// The last wave lands in a ring all round it: nowhere to run, so it pillars straight up, and the 64
// go off just under its feet at 0.00. It's left standing on a cobblestone stick in the crater.
const kit = require('../lib/escalation')
const R = 44           // cleared field half-size (wide: the cut hillsides at the edge stay far back)
const WAVES = [1, 2, 4, 8, 16, 32, 64]

module.exports = {
  name: 'worse_tnt',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'every 5 seconds it gets worse 😰',
  edit: {
    caption: 'every 5 seconds it gets worse 😰', red: 'worse',
    song: 'songs/funk_abnormal.mp3', dropAt: 'boom7',
    startAt: 'go:0', endAfter: 'boom7:1.0',
    countdown: 'go:boom7:SURVIVE',
    counter: { at: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'], total: 7 },
    cards: WAVES.map((n, i) => [`l${i + 1}`, `${n} TNT`, 0.9, i < 3 ? 'white' : i < 5 ? 'yellow' : 'red']).concat([['boom7', 'SURVIVED', 1.0, 'green']]),
    punch: ['boom5', 'boom6', 'boom7'],
    shake: ['boom6', 'boom7'],
    deathScreen: true
  },
  botTimeout: 300,

  async setup (ctx) {
    const { bot, Vec3 } = ctx
    // a flat site: the field is cleared down to one level, and against a hill that left a sheer cut
    // wall in the background (review 2). Try spots around the plains until the ground within R + 12
    // stays within a few blocks of the field level (water is fine).
    const sp = bot.entity.position.floored()
    let g = null
    for (const [ox, oz] of [[0, 0], [160, 0], [-160, 0], [0, 160], [0, -160], [160, 160], [-160, -160], [160, -160], [-160, 160], [320, 0], [-320, 0], [0, 320], [0, -320], [320, 320], [-320, -320], [480, 0]]) {
      await ctx.cmd(`/tp @s ${sp.x + ox} 200 ${sp.z + oz}`)
      await bot.waitForTicks(40)
      try { await bot.waitForChunksToLoad() } catch (e) {}
      const c = ctx.findLand(sp.x + ox, sp.z + oz)
      if (!c) continue
      const hs = []
      for (let dx = -(R + 12); dx <= R + 12; dx += 8) for (let dz = -(R + 12); dz <= R + 12; dz += 8) { const b = ctx.surface(c.x + dx, c.z + dz); if (b && !/water|ice/.test(b.name)) hs.push(b.position.y) }
      // only land matters: anything well above the field level is cut into a wall, well below it leaves a cliff
      hs.sort((p, q) => p - q)
      const hi = hs[Math.floor(hs.length * 0.97)] - c.y, lo = c.y - hs[Math.floor(hs.length * 0.05)]   // a lone tree trunk or pit doesn't count
      ctx.log('site', c.x, c.z, 'above', hi, 'below', lo, 'samples', hs.length)
      if (hs.length > 150 && (!g || hi + lo / 2 < g.score)) g = { x: c.x, y: c.y, z: c.z, score: hi + lo / 2 }
      if (g && g.score <= 4) break
    }
    if (!g || g.score > 10) throw new Error('no flat site')
    ctx.log('chose site', g)
    // go there before building: the fills fail ("not loaded") from the last site probed (review 3)
    await ctx.cmd(`/tp @s ${g.x} 200 ${g.z}`)
    await bot.waitForTicks(40)
    try { await bot.waitForChunksToLoad() } catch (e) {}
    const { x, z } = g, G = g.y
    this.x = x; this.z = z; this.G = G
    await ctx.defaultRules()
    await ctx.cmd('/gamerule random_tick_speed 0')
    await ctx.cmd('/gamerule log_admin_commands false')
    const C = R + 2
    for (let y0 = G + 1; y0 <= G + 30; y0 += 3) await ctx.cmd(`/fill ${x - C} ${y0} ${z - C} ${x + C} ${y0 + 2} ${z + C} air`)
    await ctx.cmd(`/fill ${x - C} ${G} ${z - C} ${x + C} ${G} ${z + C} grass_block`)
    // deep solid ground (no caves or water for the craters to open into)
    for (let y0 = G - 24; y0 <= G - 1; y0 += 3) await ctx.cmd(`/fill ${x - C} ${y0} ${z - C} ${x + C} ${y0 + 2} ${z + C} dirt`)
    // the set must really be there: corners cleared, floor laid
    await bot.waitForTicks(20)
    for (const [cx, cz] of [[x - R, z - R], [x + R, z + R], [x - R, z + R], [x + R, z - R], [x, z]]) {
      const a = bot.blockAt(new Vec3(cx, G + 3, cz)), f = bot.blockAt(new Vec3(cx, G, cz))
      if (!a || a.name !== 'air' || !f || f.name !== 'grass_block') throw new Error(`set not built at ${cx},${cz}: ${a && a.name} / ${f && f.name}`)
    }
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty normal')
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, G + 1, z + 0.5, 180, 8)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y: G, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, G } = this
    const K = kit(ctx)
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const pos = () => bot.entity.position
    const tnts = () => K.mobs('tnt')
    const solid = (wx, wz) => { const b = bot.blockAt(new Vec3(Math.floor(wx), G, Math.floor(wz))); return b && b.name !== 'air' && !/lava|water/.test(b.name) }
    // drop n TNT: a cluster ahead of the bot (the view), between dmin and dmax blocks away, fuse
    // timed to go off `fuseS` seconds after the summon
    const drop = (n, dmin, dmax, spread, fuseS, h = 14) => {
      const p = pos(), yaw = bot.entity.yaw
      const out = []
      for (let i = 0; i < n; i++) {
        const a = yaw + (rnd() - 0.5) * spread, d = dmin + rnd() * (dmax - dmin)
        const tx = p.x - Math.sin(a) * d, tz = p.z - Math.cos(a) * d
        if (Math.abs(tx - x) > R - 2 || Math.abs(tz - z) > R - 2) continue
        out.push([tx, tz])
        bot.chat(`/summon tnt ${tx.toFixed(2)} ${G + h + rnd() * 4} ${tz.toFixed(2)} {fuse:${Math.round(fuseS * 20)}}`)
      }
      ctx.sound('entity.tnt.primed', 1, 1)
      return out
    }
    const centroid = (pts) => pts.reduce((a, [px, pz]) => [a[0] + px / pts.length, a[1] + pz / pts.length], [0, 0])
    // get clear of a landing spot: pick the nearest point `safe` blocks from it that can be reached
    // over solid ground, and walk there while still facing the TNT (back + strafe, like a player)
    const flee = async (from, safe, deadline) => {
      const [fx, fz] = from
      let best = null
      for (let i = 0; i < 36; i++) {
        const a = i / 36 * 2 * Math.PI, qx = fx + Math.sin(a) * safe, qz = fz + Math.cos(a) * safe
        const L = Math.hypot(qx - pos().x, qz - pos().z)
        let ok = Math.abs(qx - x) < R - 1 && Math.abs(qz - z) < R - 1
        for (let s = 0; ok && s <= L; s += 0.5) if (!solid(pos().x + (qx - pos().x) * s / L, pos().z + (qz - pos().z) * s / L) || Math.hypot(pos().x + (qx - pos().x) * s / L - fx, pos().z + (qz - pos().z) * s / L - fz) < 3) ok = false
        if (ok && (!best || L < best[2])) best = [qx, qz, L]
      }
      if (!best) ctx.log('no way out of wave at', from)
      const ctl = ['forward', 'back', 'left', 'right']
      while (ctx.tick < deadline) {
        const ts = tnts()
        let look = ts.length ? ts.reduce((a, e) => a.plus(e.position), new Vec3(0, 0, 0)).scaled(1 / ts.length) : new Vec3(fx, G + 1, fz)
        { const d = look.minus(K.eye()); const minP = -0.35; if (Math.atan2(d.y, Math.hypot(d.x, d.z)) < minP) look = K.eye().plus(new Vec3(d.x, Math.tan(minP) * Math.hypot(d.x, d.z), d.z)) }
        await K.track(look.offset(0, 0.4, 0), 0.25)
        const mx = best ? best[0] - pos().x : 0, mz = best ? best[1] - pos().z : 0, ml = Math.hypot(mx, mz)
        for (const c of ctl) bot.setControlState(c, false)
        if (best && ml > 0.5) {
          const yaw = bot.entity.yaw, f = (mx * -Math.sin(yaw) + mz * -Math.cos(yaw)) / ml, r = (mx * Math.cos(yaw) + mz * -Math.sin(yaw)) / ml
          if (f > 0.38) bot.setControlState('forward', true); if (f < -0.38) bot.setControlState('back', true)
          if (r > 0.38) bot.setControlState('right', true); if (r < -0.38) bot.setControlState('left', true)
        }
        await bot.waitForTicks(1)
      }
      for (const c of ctl) bot.setControlState(c, false)
    }
    const waitBoom = async (deadline, lookAt) => {
      while (ctx.tick < deadline && tnts().length) { if (lookAt) await K.track(lookAt().offset(1.2 * Math.sin(ctx.tick / 8), 0.5 * Math.sin(ctx.tick / 6), 0), 0.2); await bot.waitForTicks(1) }
    }

    await bot.waitForTicks(6)
    const go = K.start(6)
    await K.until(go, K.drift(0.004))
    ctx.mark('go')

    // waves 1-6: a cluster ahead, the bot backs away from it and watches it go
    const plan = [
      // [fuse s, dmin, dmax, spread, safe distance]
      [3.2, 5, 6, 0.2, 9.5],
      [3.4, 5, 7, 0.5, 10],
      [3.4, 5, 8, 0.8, 10],
      [3.0, 6, 10, 1.0, 12],
      [3.0, 7, 12, 1.2, 13],
      [3.0, 9, 15, 1.4, 14]
    ]
    for (let w = 0; w < 6; w++) {
      ctx.mark(`l${w + 1}`)
      const [fuse, dmin, dmax, spread, safe] = plan[w]
      const pts = drop(WAVES[w], dmin, dmax, spread, fuse)
      if (!pts.length) throw new Error('wave fell off the field')
      const c = centroid(pts)
      await ctx.easeLookAt(new Vec3(c[0], G + 3, c[1]), 300)    // they're coming down
      await flee(c, safe, K.at(w * 5 + fuse) - 6)   // keep moving until just before it goes
      await waitBoom(K.at(w * 5 + fuse) + 6, () => new Vec3(c[0], G + 1.5, c[1]))
      ctx.mark(`boom${w + 1}`)
      // turn back to the open field: the next wave comes where it looks
      await K.until(K.at(w * 5 + 4.2), K.drift(0.006, 0.0015))
      if (w === 5) { await K.until(K.at(30), K.drift(0.004, 0.001)); continue }   // hold on the smoke; the 64 come from everywhere
      // face the widest stretch of ground still there, ready for the next one
      let best = null
      for (let a = bot.entity.yaw - 0.8; a <= bot.entity.yaw + 0.8; a += 0.2) {
        let n = 0
        for (let d = 3; d <= 14; d += 1) if (solid(pos().x - Math.sin(a) * d, pos().z - Math.cos(a) * d)) n++; else break
        if (!best || n > best[1]) best = [a, n]
      }
      ctx.easeLook(best[0], -0.12, 600)
      await K.until(K.at((w + 1) * 5))
    }

    // wave 7: 64 in a ring all round it, 7.5 blocks out: no way through, so up
    ctx.mark('l7')
    const p = pos()
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * 2 * Math.PI, d = 7.5 + (i % 3) * 0.6
      bot.chat(`/summon tnt ${(p.x + Math.sin(a) * d).toFixed(2)} ${G + 12 + (i % 5)} ${(p.z + Math.cos(a) * d).toFixed(2)} {fuse:${Math.round(4.95 * 20)}}`)
    }
    ctx.sound('entity.tnt.primed', 1, 0.9); ctx.sound('entity.tnt.primed', 1, 1.1)
    await ctx.easeLook(bot.entity.yaw, 0.6, 350)                 // the sky full of TNT
    await ctx.easeLook(bot.entity.yaw + 1.6, 0.3, 700)            // all the way round
    ctx.select(1)
    const bx = Math.floor(pos().x), bz = Math.floor(pos().z)
    let top = G
    const yaw0 = bot.entity.yaw
    await ctx.easeLook(yaw0, -1.2, 300)
    for (let k = 0; k < 8 && ctx.tick < K.at(34.3); k++) {
      bot.setControlState('jump', true)
      ctx.easeLook(yaw0 + 0.22 * (k + 1), -1.2, 400)   // one steady sweep round the ring below
      for (let i = 0; i < 20 && pos().y < top + 2.1; i++) await bot.waitForTicks(1)
      bot.setControlState('jump', false)
      bot._client.write('block_place', { hand: 0, location: { x: bx, y: top, z: bz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.stone.place', 1, 0.9)
      top++
      for (let i = 0; i < 20 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
    }
    ctx.log('pillar top', top - G)
    // watch them come down to the ring below, then go
    await ctx.easeLook(bot.entity.yaw + 0.25, -0.8, 500)
    await waitBoom(K.at(35) + 8, null)
    await K.until(K.at(35) + 6, K.drift(0.01))
    ctx.mark('boom7')
    // sneak to the edge of the stick: its side going down into the crater, then out across it
    bot.setControlState('sneak', true); bot.setControlState('forward', true)
    ctx.easeLook(bot.entity.yaw + 0.6, -1.15, 700)
    await bot.waitForTicks(10)
    bot.setControlState('forward', false)
    await bot.waitForTicks(4)
    await ctx.easeLook(bot.entity.yaw + 0.7, -0.75, 1300)   // keeps moving to the last frame
    ctx.log('health', bot.health)
    return !ctx.died
  }
}
