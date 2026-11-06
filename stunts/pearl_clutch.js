// "POV: You Throw an Ender Pearl But..." (format from research: Henyofficial7 14M, Integer_XD
// 7.5M). Glide off a tower over a lava lake on an almost-broken elytra; it really breaks mid-air
// (elytras lose 1 durability per second of flight and stop working at 1 left); falling toward
// the lava, throw an ender pearl at a ledge across the lake and get teleported onto it.
// The pearl is aimed by simulating vanilla's projectile physics (1.5 b/t launch + the thrower's
// momentum, drag 0.99, gravity 0.03).
const TOWER = Number(process.env.TOWER || 34)     // tower height above the lava
const LEDGE_DIST = Number(process.env.LEDGE_DIST || 52)
const LEDGE_UP = Number(process.env.LEDGE_UP || 14)     // ledge height above the lava
const GLIDE_SECONDS = Number(process.env.GLIDE_SECONDS || 2)

module.exports = {
  name: 'pearl_clutch',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'POV: You Throw an Ender Pearl But...',
  // edit.py settings for this format (song files are owner-supplied, in songs/)
  edit: { caption: 'POV: You Throw an Ender Pearl But...', red: 'Throw', song: 'songs/misery.mp3', dropAt: 'teleported', start: 0.8, countdown: 'glide_start:elytra_broke:Elytra About To Break:item/elytra' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land near spawn')
    const { x, z } = g, lava = g.y
    this.x = x; this.z = z; this.lava = lava
    await ctx.defaultRules()
    await ctx.cmd('/gamerule doFireTick false')
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
    // gear: elytra with GLIDE_SECONDS of flight left; pearls in hand
    await ctx.hotbar([['ender_pearl', 16], 'diamond_sword', ['cobblestone', 64], ['bread', 12]])
    await ctx.cmd(`/item replace entity @s armor.chest with elytra[damage=${431 - GLIDE_SECONDS}]`)
    await ctx.tpCheck(x + 0.5, lava + TOWER + 1, z + 0.5, 180, 10)
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
    await bot.waitForTicks(16)
    await ctx.easeLook(0, -0.5, 500)                         // look out over the lava
    await ctx.easeLook(0, -0.1, 300)
    // jump off northwards and open the elytra once airborne
    bot.setControlState('forward', true); bot.setControlState('jump', true)
    await bot.waitForTicks(5)
    bot.setControlState('jump', false)
    await bot.waitForTicks(6)
    bot.setControlState('forward', false)
    // (mineflayer's bot.elytraFly() sends 'start_elytra_flying', which 1.21.11 renamed
    // 'start_fall_flying' -> the server can't decode it and kicks us; send the right one)
    bot._client.write('entity_action', { entityId: bot.entity.id, actionId: 'start_fall_flying', jumpBoost: 0 })
    for (let i = 0; i < 10 && !bot.entity.elytraFlying; i++) await bot.waitForTicks(1)
    ctx.mark('glide_start')
    ctx.sound('item.elytra.flying', 0.6)
    // glide gently downward until the elytra gives out
    let ticks = 0
    while (bot.entity.elytraFlying && ticks < 200) { await bot.look(0, -0.25, true); await bot.waitForTicks(1); ticks++ }
    ctx.mark('elytra_broke'); ctx.sound('entity.item.break', 1)
    ctx.log('elytra broke after', ticks, 'ticks at', bot.entity.position)
    // a beat of "oh no": glance down at the lava, then find the ledge
    await ctx.easeLook(0, -0.9, 200)
    await ctx.easeLookAt(this.ledge, 200)
    const a = this.aim(bot, this.ledge)
    if (!a) { ctx.log('no pearl solution'); return false }
    ctx.log('pearl aim err', a.err.toFixed(2), 'flight', a.t, 'ticks')
    ctx.select(0)
    await bot.look(a.yaw, a.pitch, true)
    await bot.waitForTicks(1)
    const recomputed = this.aim(bot, this.ledge)            // re-aim with the fresh velocity
    if (recomputed) await bot.look(recomputed.yaw, recomputed.pitch, true)
    bot.activateItem(); ctx.sound('entity.ender_pearl.throw', 1, 0.5)
    ctx.mark('pearl_thrown')
    // wait for the teleport (or death)
    const before = bot.entity.position.clone()
    for (let i = 0; i < 120; i++) {
      await bot.waitForTicks(1)
      if (ctx.died) return false
      if (bot.entity.position.distanceTo(this.ledge) < 6 && bot.entity.position.distanceTo(before) > 5) break
    }
    ctx.mark('teleported'); ctx.sound('entity.player.teleport', 1); ctx.sound('entity.player.hurt', 1)
    await ctx.easeLook(bot.entity.yaw, -0.05, 300)               // look up to the horizon
    await bot.waitForTicks(6)
    // turn around to look back at the tower across the lava
    await ctx.easeLook(Math.PI, -0.15, 900)
    await bot.waitForTicks(20)
    const p = bot.entity.position
    return !ctx.died && p.distanceTo(this.ledge) < 6
  }
}
