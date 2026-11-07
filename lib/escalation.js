// Helpers for the "every 5 seconds it gets worse" series (worker 18): exact level ticks, smooth
// tracking looks, sword fights that knock mobs back (Knockback sword), and islands that crumble
// into real falling blocks.
module.exports = function kit (ctx) {
  const { bot, Vec3 } = ctx
  let go = null
  const k = {
    start (delayTicks = 6) { go = ctx.tick + delayTicks; return go },
    get go () { return go },
    at: (s) => go + Math.round(s * 20),
    // wait for an absolute tick, calling each() once a tick (a drift, a track) so the shot never freezes
    async until (tk, each) { while (ctx.tick < tk) { if (each) await each(); await bot.waitForTicks(1) } },
    // Find flat ground: try spots around the start until the land within `radius` stays within a few
    // blocks of the field level (water is fine), take the flattest, and go there (worker 18).
    async flatSite (radius) {
      const sp = bot.entity.position.floored()
      let g = null
      for (const [ox, oz] of [[0, 0], [160, 0], [-160, 0], [0, 160], [0, -160], [160, 160], [-160, -160], [160, -160], [-160, 160], [320, 0], [-320, 0], [0, 320], [0, -320], [320, 320], [-320, -320], [480, 0]]) {
        await ctx.cmd(`/tp @s ${sp.x + ox} 200 ${sp.z + oz}`)
        await bot.waitForTicks(40)
        try { await bot.waitForChunksToLoad() } catch (e) {}
        const c = ctx.findLand(sp.x + ox, sp.z + oz)
        if (!c) continue
        const hs = []
        for (let dx = -(radius); dx <= radius; dx += 8) for (let dz = -(radius); dz <= radius; dz += 8) { const b = ctx.surface(c.x + dx, c.z + dz); if (b && !/water|ice/.test(b.name)) hs.push(b.position.y) }
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
      return g
    },
    // start level n at s seconds on the dot; a level reached late breaks the "every 5 seconds" grid, so
    // the take fails and run.sh retries (review: a long walk pushed a storm to 12.65 s)
    async level (n, s, each) {
      if (ctx.tick > k.at(s) + 1) throw new Error(`level ${n} late by ${ctx.tick - k.at(s)} ticks`)
      await k.until(k.at(s), each)
      ctx.mark(`l${n}`)
    },
    drift: (dy = 0.003, dp = 0) => () => bot.look(bot.entity.yaw + dy, bot.entity.pitch + dp, true),
    eye: () => bot.entity.position.offset(0, 1.62, 0),
    mobs: (name) => Object.values(bot.entities).filter(e => e.name === name && e !== bot.entity),
    // move part of the way toward looking at p each tick (no snaps)
    async track (p, f = 0.3) {
      const d = p.minus(k.eye())
      const ty = Math.atan2(-d.x, -d.z), tp = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = ty - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      await bot.look(bot.entity.yaw + dy * f, bot.entity.pitch + (tp - bot.entity.pitch) * f, true)
    },
    // hit sounds the client would play (server sounds aren't recorded)
    hitSounds (e) {
      ctx.sound('entity.player.attack.knockback', 1, 1)
      ctx.sound(`entity.${e.name}.hurt`, 1, 0.9 + Math.random() * 0.2)
    },
    // Fight one mob until gone(e) says it's dealt with or the deadline passes. opts.waitSwell: for a
    // creeper, let it hiss for a few ticks first (it keeps swelling while within 7 blocks and blows
    // where the knockback left it). Returns true when dealt with.
    async fight (e, deadline, opts = {}) {
      const { reach = 3.0, waitSwell = 0, gone = (m) => !bot.entities[m.id], cooldown = 12, onHit, minTicks = 0 } = opts
      let swell = 0, cool = 0, hits = 0, age = 0
      while (ctx.tick < deadline) {
        if (gone(e)) return true
        await k.track(e.position.offset(0, e.name === 'creeper' ? 1.1 : 1.4, 0), 0.35)
        const d = e.position.distanceTo(bot.entity.position)
        const sw = e.name === 'creeper' && e.metadata && e.metadata[16] === 1
        if (sw) swell++; else swell = 0
        if (swell === 1) { ctx.sound('entity.creeper.primed', 1, 1); ctx.mark('hiss') }
        if (cool > 0) cool--
        age++
        if (process.env.DEBUG && ctx.tick % 5 === 0) ctx.log(e.name, e.id, 'd', d.toFixed(2), 'y', e.position.y.toFixed(2), 'swell', swell, 'hits', hits)
        if (cool === 0 && age > minTicks && d < reach && (swell >= waitSwell || d < 1.8)) {
          bot.attack(e, false); bot.swingArm(); k.hitSounds(e); ctx.mark('hit', { mob: e.name }); hits++; cool = cooldown
          if (onHit) onHit(e)
        }
        await bot.waitForTicks(1)
      }
      return gone(e)
    },
    // Columns crumble away: each [x, z] column from y0 to y1 becomes air and falls as real falling
    // blocks (whatever is there: grass, dirt, a placed cobblestone), a few columns a tick so the edge peels away.
    async crumble (cells, y0, y1, perTick = 8, gap = 1) {
      for (let i = 0; i < cells.length; i += perTick) {
        for (const [cx, cz] of cells.slice(i, i + perTick)) {
          const names = []
          for (let y = y0; y <= y1; y++) { const b = bot.blockAt(new Vec3(cx, y, cz)); names.push(b && b.name !== 'air' ? b.name : null) }
          bot.chat(`/fill ${cx} ${y0} ${cz} ${cx} ${y1} ${cz} air`)
          names.forEach((n, j) => { if (n) bot.chat(`/summon falling_block ${cx + 0.5} ${y0 + j} ${cz + 0.5} {BlockState:{Name:"minecraft:${n}"},Time:1,DropItem:0b}`) })
        }
        ctx.sound('block.grass.break', 0.9, 0.8 + Math.random() * 0.2)
        await bot.waitForTicks(gap)
      }
    },
    // sneak-step to (px, pz) without turning the camera: back/forward/left/right relative to the view
    async stepTo (px, pz, maxTicks = 20, tol = 0.12) {
      const ctl = ['forward', 'back', 'left', 'right']
      bot.setControlState('sneak', true)
      for (let i = 0; i < maxTicks; i++) {
        const mx = px - bot.entity.position.x, mz = pz - bot.entity.position.z, ml = Math.hypot(mx, mz)
        for (const c of ctl) bot.setControlState(c, false)
        if (ml < tol) break
        const yaw = bot.entity.yaw, f = (mx * -Math.sin(yaw) + mz * -Math.cos(yaw)) / ml, r = (mx * Math.cos(yaw) + mz * -Math.sin(yaw)) / ml
        if (f > 0.38) bot.setControlState('forward', true); if (f < -0.38) bot.setControlState('back', true)
        if (r > 0.38) bot.setControlState('right', true); if (r < -0.38) bot.setControlState('left', true)
        await bot.waitForTicks(1)
      }
      for (const c of ctl) bot.setControlState(c, false)
      bot.setControlState('sneak', false)
    },
    // the cells at Chebyshev distance r around (cx, cz)
    ring (cx, cz, r) {
      const out = []
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === r) out.push([cx + dx, cz + dz])
      return out
    }
  }
  return k
}
