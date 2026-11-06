// "minecraft but it rains anvils... then TNT... then creepers 💀" (~32 s, escalating survival).
// Phase 1: anvils (real falling_block entities) rain round the bot; it dodges, and one comes
// straight down at it (a look up, a side-step, it slams down beside). Phase 2: primed TNT rains
// with the anvils; craters open up, a close one knocks the bot back and takes hearts. Phase 3:
// creepers drop out of the sky (real mobs with their own AI, normal difficulty) and chase the bot
// as it backpedals; one gets too close and the bot sprints off as it blows. Finale: EVERYTHING at
// once... and a creeper lands right behind it. "HelloBuh was blown up by Creeper".
// Owner rules: 30 s minimum from more beats, no dead space, end <= 1 s after the payoff (death
// screen text: ~1.6 s of reading).
const H = 16            // drop height above the floor: in frame for the whole fall with the camera pitched up
const R = 40            // cleared field radius

module.exports = {
  name: 'it_rains',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'minecraft but it rains anvils... then TNT... then creepers 💀',
  edit: {
    caption: 'minecraft but it rains anvils... then TNT... then creepers 💀', red: 'creepers',
    song: 'songs/funk_abnormal.mp3', dropAt: 'tnt', deathScreen: true,
    startAt: 'hook:-0.05', endAfter: 'death:1.6',
    subs: [
      ['hook', 'it rains anvils', 2.0, 0], ['above', 'wait...', 1.2, 0], ['dodged', 'TOO close', 1.4, 0],
      ['tnt', 'then TNT', 2.0, 0], ['close_tnt', 'ow', 1.0, 0],
      ['creepers', 'then CREEPERS', 2.0, 0], ['run', 'nope nope nope', 1.6, 0],
      ['everything', 'then EVERYTHING', 2.4, 0], ['hiss', 'tssss', 1.2, 0]
    ]
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    Object.assign(this, { x, z, floor })
    await ctx.defaultRules()
    await ctx.cmd('/gamerule tnt_explosion_drop_decay true')
    const W = 2 * R + 1, rows = Math.max(1, Math.floor(32000 / (W * W)))
    for (let y0 = floor + 1; y0 <= floor + H + 8; y0 += rows) await ctx.cmd(`/fill ${x - R} ${y0} ${z - R} ${x + R} ${Math.min(floor + H + 8, y0 + rows - 1)} ${z + R} air`)
    for (let y0 = floor - 8; y0 <= floor - 1; y0 += rows) await ctx.cmd(`/fill ${x - R} ${y0} ${z - R} ${x + R} ${Math.min(floor - 1, y0 + rows - 1)} ${z + R} dirt`)
    await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R} grass_block`)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty normal')
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16], 'water_bucket'])
    // start north of the centre facing north: the creeper phase backpedals south across the field
    await ctx.tpCheck(x + 0.5, floor + 1, z - 12 + 0.5, 180, -15)
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s saturation 1 20 true')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const floor = this.floor
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const landed = (o, n) => { if (n && /anvil/.test(n.name) && !(o && /anvil/.test(o.name))) ctx.sound('block.anvil.land', 0.5, 0.9 + rnd() * 0.2) }
    bot.on('blockUpdate', landed)
    const anvil = (ax, az, h = H, hurt = 2) => bot.chat(`/summon falling_block ${ax.toFixed(2)} ${(floor + h).toFixed(1)} ${az.toFixed(2)} {BlockState:{Name:"minecraft:anvil"},Time:1,HurtEntities:1b,FallHurtAmount:${hurt}f,FallHurtMax:40}`)
    const tnt = (ax, az, fuse) => bot.chat(`/summon tnt ${ax.toFixed(2)} ${floor + H} ${az.toFixed(2)} {fuse:${fuse}}`)
    const creeper = (ax, az, h = 10) => bot.chat(`/summon creeper ${ax.toFixed(2)} ${floor + h} ${az.toFixed(2)} {PersistenceRequired:1b}`)
    // a point d blocks out, inside the view cone (spread rad either side of where the bot looks)
    const ahead = (dMin, dMax, spread) => {
      const p = bot.entity.position, a = bot.entity.yaw + (rnd() - 0.5) * 2 * spread, d = dMin + rnd() * (dMax - dMin)
      return [p.x - Math.sin(a) * d, p.z - Math.cos(a) * d]
    }
    const rain = { anvil: 0, tnt: 0, creeper: 0 }        // ticks between drops (0 = off)
    let n = 0
    const onTick = () => {
      n++
      if (rain.anvil && n % rain.anvil === 0) { const [ax, az] = ahead(9, 16, 0.6); anvil(ax, az) }
      if (rain.tnt && n % rain.tnt === 0) { const [ax, az] = ahead(9, 15, 0.55); tnt(ax, az, 32 + Math.floor(rnd() * 10)) }
      if (rain.creeper && n % rain.creeper === 0) { const [ax, az] = ahead(9, 13, 0.5); creeper(ax, az) }
    }
    bot.on('physicsTick', onTick)
    let booms = 0
    bot._client.on('explosion', () => { booms++ })
    const step = async (dirs, ticks) => { for (const d of dirs) bot.setControlState(d, true); await bot.waitForTicks(ticks); for (const d of dirs) bot.setControlState(d, false) }
    const yaw0 = 0    // north

    // ---- phase 1: anvils ----
    rain.anvil = 4
    await ctx.easeLook(yaw0, 0.35, 500)
    for (let k = 0; k < 16; k++) await bot.waitForTicks(1)       // pre-roll: anvils already mid-air at the first frame
    ctx.mark('hook')
    ctx.easeLook(yaw0 + 0.35, 0.3, 600); await step(['left'], 8)
    ctx.easeLook(yaw0 - 0.3, 0.38, 600); await step(['right'], 10)
    rain.anvil = 3
    ctx.easeLook(yaw0 + 0.15, 0.3, 500); await step(['back'], 6)
    // one straight down at us: look up, see it, side-step
    const p0 = bot.entity.position.clone()
    anvil(p0.x, p0.z, H - 2, 2)
    await ctx.easeLook(yaw0 + 0.1, 1.25, 300)
    ctx.mark('above')
    await bot.waitForTicks(8)
    bot.setControlState('sprint', true)
    ctx.easeLook(yaw0 - 0.35, 0.05, 500); await step(['right'], 9)
    bot.setControlState('sprint', false)
    for (let k = 0; k < 20; k++) { await bot.waitForTicks(1); const b = bot.blockAt(new Vec3(Math.floor(p0.x), floor + 1, Math.floor(p0.z))); if (b && /anvil/.test(b.name)) break }
    ctx.mark('dodged')
    await ctx.easeLookAt(new Vec3(p0.x, floor + 1.2, p0.z), 300)
    rain.anvil = 2
    ctx.easeLook(yaw0 + 0.2, 0.35, 500); await step(['left'], 8)

    // ---- phase 2: TNT ----
    ctx.mark('tnt')
    rain.tnt = 9; rain.anvil = 4
    ctx.easeLook(yaw0 - 0.2, 0.4, 600); await step(['right'], 10)
    ctx.easeLook(yaw0 + 0.3, 0.3, 600); await step(['left', 'back'], 10)
    rain.tnt = 6
    ctx.easeLook(yaw0 - 0.25, 0.2, 600); await step(['right'], 12)
    // a close one: knocked back, hearts gone
    if (bot.health >= 16) {
      const [cx, cz] = [bot.entity.position.x - Math.sin(bot.entity.yaw) * 6.5, bot.entity.position.z - Math.cos(bot.entity.yaw) * 6.5]
      tnt(cx, cz, 30)
      await ctx.easeLookAt(new Vec3(cx, floor + 3, cz), 400)
      const b0 = booms, h0 = bot.health
      for (let k = 0; k < 60 && bot.health >= h0; k++) await bot.waitForTicks(1)
      if (booms > b0 || bot.health < h0) ctx.mark('close_tnt')
    }
    rain.tnt = 4
    ctx.easeLook(yaw0 + 0.3, 0.3, 600); await step(['left'], 10)
    ctx.easeLook(yaw0 - 0.1, 0.35, 500); await step(['back'], 8)

    // ---- phase 3: creepers ----
    ctx.mark('creepers')
    rain.tnt = 0; rain.anvil = 6; rain.creeper = 14
    ctx.easeLook(yaw0, 0.15, 500); await bot.waitForTicks(6)
    // backpedal, weaving, watching them come
    const nearest = () => {
      let best = null, bd = 99
      for (const e of Object.values(bot.entities)) if (e.name === 'creeper') { const d = e.position.distanceTo(bot.entity.position); if (d < bd) { bd = d; best = e } }
      return [best, bd]
    }
    let ran = false
    for (let k = 0; k < 150; k++) {
      const [c, d] = nearest()
      const phase = Math.floor(k / 20) % 2
      bot.setControlState('back', true)
      bot.setControlState('left', phase === 0); bot.setControlState('right', phase === 1)
      if (k % 10 === 0) {
        const target = c ? c.position.offset(0, 1.0, 0) : null
        if (target) ctx.easeLookAt(target, 400); else ctx.easeLook(yaw0 + (phase ? 0.25 : -0.25), 0.1, 400)
      }
      if (!ran && c && d < 4.5 && k > 40) {
        // too close: it's hissing. Sprint away (facing away), then turn back for the blast
        ran = true
        ctx.mark('run')
        bot.clearControlStates()
        await ctx.easeLook(bot.entity.yaw + Math.PI, 0.0, 250)
        bot.setControlState('sprint', true); bot.setControlState('forward', true)
        await bot.waitForTicks(18)
        bot.setControlState('forward', false); bot.setControlState('sprint', false)
        const [c2] = nearest()
        await ctx.easeLookAt(c2 ? c2.position.offset(0, 1, 0) : bot.entity.position.offset(0, 1, -6), 300)
        k += 30
      }
      if (k > 110 && ran) break
      await bot.waitForTicks(1)
    }
    bot.clearControlStates()

    // ---- finale: everything at once ----
    ctx.mark('everything')
    rain.anvil = 2; rain.tnt = 5; rain.creeper = 8
    await ctx.easeLook(bot.entity.yaw, 0.45, 400)
    ctx.easeLook(bot.entity.yaw + 0.3, 0.35, 600); await step(['left'], 10)
    ctx.easeLook(bot.entity.yaw - 0.5, 0.3, 600); await step(['right'], 10)
    // the one that lands right behind
    const p = bot.entity.position, yb = bot.entity.yaw
    bot.chat(`/summon creeper ${(p.x + Math.sin(yb) * 1.6).toFixed(2)} ${(floor + 1).toFixed(1)} ${(p.z + Math.cos(yb) * 1.6).toFixed(2)} {PersistenceRequired:1b,ignited:1b,Fuse:30}`)
    await bot.waitForTicks(3)
    ctx.mark('hiss'); ctx.sound('entity.creeper.primed', 1, 1)
    rain.anvil = 0; rain.tnt = 0; rain.creeper = 0
    await bot.waitForTicks(6)
    await ctx.easeLook(yb + Math.PI, -0.15, 350)                 // spin round: oh no
    for (let i = 0; i < 60 && !ctx.died; i++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', onTick)
    await bot.waitForTicks(40)                                    // the death screen
    bot.removeListener('blockUpdate', landed)
    return ctx.died
  }
}
