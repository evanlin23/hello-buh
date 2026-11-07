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
    async crumble (cells, y0, y1, perTick = 8) {
      for (let i = 0; i < cells.length; i += perTick) {
        for (const [cx, cz] of cells.slice(i, i + perTick)) {
          const names = []
          for (let y = y0; y <= y1; y++) { const b = bot.blockAt(new Vec3(cx, y, cz)); names.push(b && b.name !== 'air' ? b.name : null) }
          bot.chat(`/fill ${cx} ${y0} ${cz} ${cx} ${y1} ${cz} air`)
          names.forEach((n, j) => { if (n) bot.chat(`/summon falling_block ${cx + 0.5} ${y0 + j} ${cz + 0.5} {BlockState:{Name:"minecraft:${n}"},Time:1,DropItem:0b}`) })
        }
        ctx.sound('block.gravel.break', 0.9, 0.7 + Math.random() * 0.2)
        await bot.waitForTicks(1)
      }
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
