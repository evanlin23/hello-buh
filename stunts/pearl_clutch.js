// "POV: You Throw an Ender Pearl But..." (format from research: Henyofficial7 14M, Integer_XD
// 7.5M). Redesigned after frame QA ("the stunt doesn't read": the breaking-elytra glide buried
// the joke): the block under you vanishes over a lava lake, you look down at the lava, then up at
// the island across it, throw an ender pearl mid-fall and get teleported onto it.
// The pearl is aimed by simulating vanilla's projectile physics (1.5 b/t launch + the thrower's
// momentum, drag 0.99, gravity 0.03).
const TOWER_DEFAULT = Number(process.env.TOWER || 30)     // tower height above the lava
const LEDGE_DIST = Number(process.env.LEDGE_DIST || 16)
const LEDGE_UP = Number(process.env.LEDGE_UP || 8)     // ledge height above the lava

module.exports = {
  name: 'pearl_clutch',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'POV: You Throw an Ender Pearl But...',
  // edit.py settings for this format (song files are owner-supplied, in songs/)
  edit: { caption: 'POV: You Throw an Ender Pearl But...', red: 'Throw', song: 'songs/misery.mp3', dropAt: 'teleported', startAt: 'fall:-0.7', endAfter: 'teleported:2.2' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land near spawn')
    const { x, z } = g, lava = g.y
    this.x = x; this.z = z; this.lava = lava
    const TOWER = this.tower || TOWER_DEFAULT   // per-instance (clutch_harder runs two towers)
    await ctx.defaultRules()
    await ctx.cmd('/gamerule fire_spread_radius_around_player 0')
    // lake: x-14..x+14, z-(LEDGE_DIST+12)..z+6, one layer of lava on stone, air above
    const x0 = x - 14, x1 = x + 14, z0 = z - LEDGE_DIST - 12, z1 = z + 6
    await ctx.cmd(`/fill ${x0} ${lava - 3} ${z0} ${x1} ${lava - 1} ${z1} stone`)
    for (let y0 = lava; y0 <= lava + TOWER + 12; y0 += 30) {
      for (let zz = z0; zz <= z1; zz += 32) await ctx.cmd(`/fill ${x0} ${y0} ${zz} ${x1} ${Math.min(y0 + 29, lava + TOWER + 12)} ${Math.min(zz + 31, z1)} air`)
    }
    await ctx.cmd(`/fill ${x0} ${lava} ${z0} ${x1} ${lava} ${z1} lava`)
    // rim of the lake: grass so it reads as a pit in the forest
    await ctx.cmd(`/fill ${x0 - 1} ${lava} ${z0 - 1} ${x1 + 1} ${lava} ${z0 - 1} grass_block`)
    // launch tower (cobblestone) at the south end
    await ctx.cmd(`/fill ${x} ${lava} ${z} ${x} ${lava + TOWER} ${z} cobblestone`)
    // the ledge: a raised grass island across the lake
    const lz = z - LEDGE_DIST, ly = lava + LEDGE_UP
    this.ledge = new ctx.Vec3(x + 0.5, ly + 1, lz + 0.5)
    await ctx.cmd(`/fill ${x - 4} ${lava} ${lz - 4} ${x + 4} ${ly - 1} ${lz + 4} stone`)
    await ctx.cmd(`/fill ${x - 4} ${ly} ${lz - 4} ${x + 4} ${ly} ${lz + 4} grass_block`)
    await ctx.cmd(`/fill ${x - 4} ${ly - 3} ${lz - 4} ${x + 4} ${ly - 1} ${lz + 4} dirt`)
    await ctx.hotbar([['ender_pearl', 16], 'diamond_sword', ['cobblestone', 64], ['bread', 12]])
    // the bot stands on one block jutting out north of the tower top: when it goes, there's
    // nothing under it but lava (the tower stays, for the look back)
    await ctx.cmd(`/setblock ${x} ${lava + TOWER} ${z - 1} cobblestone`)
    await ctx.tpCheck(x + 0.5, lava + TOWER + 1, z - 0.5, 180, 10)
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: lava, z }
  },

  // Vanilla thrown-pearl flight from eye position with the given rotation (mineflayer yaw/pitch).
  simulate (eye, vel, yaw, pitch, targetY) {
    const dir = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) }
    let p = { x: eye.x, y: eye.y - 0.1, z: eye.z }
    let v = { x: dir.x * 1.5 + vel.x, y: dir.y * 1.5 + vel.y, z: dir.z * 1.5 + vel.z }
    for (let t = 0; t < 200; t++) {
      const n = { x: p.x + v.x, y: p.y + v.y, z: p.z + v.z }
      if (v.y < 0 && n.y <= targetY) { const f = (p.y - targetY) / (p.y - n.y); return { x: p.x + (n.x - p.x) * f, z: p.z + (n.z - p.z) * f, t } }
      p = n
      v = { x: v.x * 0.99, y: v.y * 0.99 - 0.03, z: v.z * 0.99 }
    }
    return null
  },

  aim (bot, target) {
    const eye = bot.entity.position.offset(0, 1.62, 0)
    const vel = bot.entity.velocity
    let best = null
    for (let yd = -0.4; yd <= 0.4; yd += 0.01) {
      const yaw = Math.atan2(-(target.x - eye.x), -(target.z - eye.z)) + yd
      for (let pitch = -1.5; pitch <= 1.2; pitch += 0.01) {
        const hit = this.simulate(eye, vel, yaw, pitch, target.y)
        if (!hit) continue
        const err = Math.hypot(hit.x - target.x, hit.z - target.z)
        if (!best || err < best.err) best = { yaw, pitch, err, t: hit.t }
      }
    }
    return best
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, lava } = this
    const TOWER = this.tower || TOWER_DEFAULT
    await bot.waitForTicks(this.fast ? 2 : 10)   // fast: in a series, no standing still at the start
    await ctx.easeLook(0, -0.35, 400)                         // the island across the lava
    // the block under the feet is gone: falling toward the lava
    await ctx.cmd(`/setblock ${x} ${lava + TOWER} ${z - 1} air`)
    ctx.mark('fall'); ctx.sound('block.stone.break', 1)
    // throw early: the pearl inherits the player's velocity, and ~20 ticks into the fall (-1.3 b/t)
    // it dove into the lava short of the island (aim error 17-21 blocks, 5/5 failed)
    await ctx.easeLook(0.15, -1.25, 220)                      // look down: lava
    await bot.waitForTicks(2)
    await ctx.easeLookAt(this.ledge, 180)                     // the island
    const a = this.aim(bot, this.ledge)
    if (!a) { ctx.log('no pearl solution'); return false }
    ctx.log('pearl aim err', a.err.toFixed(2), 'flight', a.t, 'ticks')
    ctx.select(0)
    await bot.look(a.yaw, a.pitch, true)
    await bot.waitForTicks(1)
    const again = this.aim(bot, this.ledge)                  // re-aim with the fresh velocity
    if (again) await bot.look(again.yaw, again.pitch, true)
    bot.activateItem(); bot.swingArm(); ctx.sound('entity.ender_pearl.throw', 1, 0.5)
    ctx.mark('pearl_thrown')
    // follow the pearl toward the island while still falling
    ctx.easeLookAt(this.ledge, 500)
    const before = bot.entity.position.clone()
    for (let i = 0; i < 120; i++) {
      await bot.waitForTicks(1)
      if (ctx.died) return false
      if (bot.entity.position.distanceTo(this.ledge) < 6 && bot.entity.position.distanceTo(before) > 5) break
    }
    ctx.mark('teleported'); ctx.sound('entity.player.teleport', 1); ctx.sound('entity.player.hurt', 1)
    ctx.particles('portal', bot.entity.position, { count: 48 })
    await ctx.easeLook(bot.entity.yaw, -0.05, 300)
    await bot.waitForTicks(4)
    await ctx.easeLook(Math.PI, -0.35, 900)                   // look back: the lava and the tower
    ctx.easeLook(Math.PI + 0.2, -0.3, 1200)
    await bot.waitForTicks(20)
    const p = bot.entity.position
    return !ctx.died && p.distanceTo(this.ledge) < 6
  }
}
