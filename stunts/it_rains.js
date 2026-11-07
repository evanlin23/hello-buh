// "minecraft but it rains anvils... then TNT... then creepers 💀" (~32 s, escalating survival).
// Phase 1: anvils (real falling_block entities) rain round the bot; it dodges, and one comes
// straight down at it (a look up, a side-step, it slams down beside). Phase 2: primed TNT rains
// with the anvils; craters open up, a close one knocks the bot back and takes hearts. Phase 3:
// creepers drop out of the sky (real mobs with their own AI, normal difficulty) and chase the bot
// as it backpedals; one gets too close and the bot sprints off as it blows. Finale: EVERYTHING at
// once... and a creeper lands right behind it. "HelloBuh was blown up by Creeper".
// Owner rules: 30 s minimum from more beats, no dead space, end <= 1 s after the payoff (death
// screen text: ~1.6 s of reading).
const { plateau } = require('../lib/plateau')
const { plainsBiome } = require('../lib/story')
const H = 16            // drop height above the floor: in frame for the whole fall with the camera pitched up
const R = 64            // cleared field radius (at 40 the cleared pit's walls showed in every spin)

module.exports = {
  name: 'it_rains',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'minecraft but it rains anvils... then TNT... then creepers 💀',
  edit: {
    caption: 'minecraft but it rains anvils... then TNT... then creepers 💀', red: 'creepers',
    song: 'songs/funk_abnormal.mp3', dropAt: 'tnt', deathScreen: true,
    startAt: 'hook:-0.05', endAfter: 'death:1.2',
    subs: [
      ['hook', 'it rains anvils', 2.0, 0], ['wall', 'uhh', 1.2, 0], ['ring', 'they are surrounding me', 1.6, 0], ['above', 'wait...', 1.2, 0], ['dodged', 'TOO close', 1.4, 0],
      ['tnt', 'then TNT', 2.0, 0], ['tnt_wall', 'a TNT wall??', 1.6, 0], ['close_tnt', 'ow', 1.0, 0],
      ['creepers', 'then CREEPERS', 2.0, 0], ['more', 'MORE of them', 1.4, 0], ['run', 'nope nope nope', 1.6, 0], ['keep', 'they keep coming', 1.6, 0],
      ['everything', 'then EVERYTHING', 2.4, 0], ['hiss', 'tssss', 1.2, 0]
    ]
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    await ctx.cmd('/gamerule tnt_explosion_drop_decay true')
    // a plateau, never a pit: at the start point's height the field's cut walls showed in every spin
    const floor = await plateau(ctx, { x0: x - R, x1: x + R, z0: z - R, z1: z + R, above: H + 14, below: 8, pct: 0.97 })   // high: hills above the floor got sliced into walls
    Object.assign(this, { x, z, floor })
    // one biome over the field (a biome border tinted half the grass teal); the harness re-sends
    // the chunks before recording
    await plainsBiome(ctx, (dx, dy, dz) => `${x + dx} ${floor + dy} ${z + dz}`, R, -8, 20)
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
      if (rain.tnt && n % rain.tnt === 0) { const [ax, az] = ahead(rain.far ? 12 : 9, rain.far ? 18 : 15, 0.55); tnt(ax, az, 32 + Math.floor(rnd() * 10)) }
      if (rain.creeper && n % rain.creeper === 0) { const [ax, az] = ahead(rain.far ? 14 : 9, rain.far ? 18 : 13, 0.5); creeper(ax, az) }
    }
    bot.on('physicsTick', onTick)
    let booms = 0
    bot._client.on('explosion', () => { booms++ })
    const step = async (dirs, ticks) => { for (const d of dirs) bot.setControlState(d, true); await bot.waitForTicks(ticks); for (const d of dirs) bot.setControlState(d, false) }
    const yaw0 = 0    // north

    // ---- phase 1: anvils, thicker and thicker ----
    rain.anvil = 5
    await ctx.easeLook(yaw0, 0.35, 500)
    for (let k = 0; k < 16; k++) await bot.waitForTicks(1)       // pre-roll: anvils already mid-air at the first frame
    ctx.mark('hook')
    const dodge = async (moves) => {
      for (const [dy, dp, dirs, t] of moves) { ctx.easeLook(yaw0 + dy, dp, Math.max(300, t * 50)); await step(dirs, t) }
    }
    await dodge([[0.35, 0.3, ['left'], 9], [-0.3, 0.38, ['right'], 11], [0.15, 0.3, ['back'], 7]])
    rain.anvil = 3
    await dodge([[-0.35, 0.32, ['left'], 8], [0.3, 0.36, ['right'], 10], [0.0, 0.3, ['back'], 6]])
    // a whole wall of them, right across the front
    ctx.mark('wall')
    {
      const p = bot.entity.position
      for (let k = -5; k <= 5; k++) anvil(p.x + k * 1.1, p.z - 8.5, H - 1 + (k & 1), 2)
    }
    await ctx.easeLook(yaw0, 0.6, 350)
    await ctx.easeLook(yaw0, 0.05, 900)                           // follow them down
    await dodge([[0.3, 0.3, ['right'], 8]])
    // one straight down at us: look up, see it, side-step
    const p0 = bot.entity.position.clone()
    anvil(p0.x, p0.z, H - 2, 2)
    await ctx.easeLook(yaw0 + 0.1, 1.25, 300)
    ctx.mark('above')
    await ctx.easeLook(yaw0 + 0.3, 1.05, 400)                    // eyes on it (a held look up read as frozen)
    bot.setControlState('sprint', true)
    ctx.easeLook(yaw0 - 0.35, 0.05, 500); await step(['right'], 9)
    bot.setControlState('sprint', false)
    for (let k = 0; k < 20; k++) { await bot.waitForTicks(1); const b = bot.blockAt(new Vec3(Math.floor(p0.x), floor + 1, Math.floor(p0.z))); if (b && /anvil/.test(b.name)) break }
    ctx.mark('dodged')
    await ctx.easeLookAt(new Vec3(p0.x, floor + 1.2, p0.z), 300)
    rain.anvil = 2
    await dodge([[0.2, 0.35, ['left'], 8], [-0.25, 0.3, ['back'], 6]])
    // a ring of them, all the way round: a full spin to watch them come down
    {
      const p = bot.entity.position
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; anvil(p.x + Math.sin(a) * 4.5, p.z + Math.cos(a) * 4.5, H - 3, 2) }
    }
    ctx.mark('ring')
    const ys = bot.entity.yaw
    for (let k = 1; k <= 4; k++) await ctx.easeLook(ys + k * Math.PI / 2, 0.45 - k * 0.08, 380)
    await dodge([[0.3, 0.3, ['left'], 8]])

    // ---- phase 2: TNT ----
    ctx.mark('tnt')
    rain.tnt = 9; rain.anvil = 4
    await dodge([[-0.2, 0.4, ['right'], 10], [0.3, 0.3, ['left', 'back'], 10], [-0.1, 0.35, ['left'], 8]])
    rain.tnt = 6
    await dodge([[-0.25, 0.2, ['right'], 12], [0.2, 0.3, ['back'], 8]])
    // a wall of TNT across the front, going off left to right
    {
      const p = bot.entity.position, yy = bot.entity.yaw
      const fx = -Math.sin(yy), fz = -Math.cos(yy), rx = Math.cos(yy), rz = -Math.sin(yy)
      for (let k = -4; k <= 4; k++) tnt(p.x + fx * 11 + rx * k * 2.2, p.z + fz * 11 + rz * k * 2.2, 30 + (k + 4) * 3)
    }
    rain.tnt = 0
    ctx.mark('tnt_wall')
    await ctx.easeLook(bot.entity.yaw - 0.45, 0.5, 400)
    await ctx.easeLook(bot.entity.yaw + 0.9, 0.1, 1500)
    rain.tnt = 6
    // a close one: knocked back, hearts gone
    if (bot.health >= 16) {
      const [cx, cz] = [bot.entity.position.x - Math.sin(bot.entity.yaw) * 7.5, bot.entity.position.z - Math.cos(bot.entity.yaw) * 7.5]
      tnt(cx, cz, 30)
      await ctx.easeLookAt(new Vec3(cx, floor + 3, cz), 400)
      const b0 = booms, h0 = bot.health
      for (let k = 0; k < 60 && bot.health >= h0; k++) await bot.waitForTicks(1)
      if (booms > b0 || bot.health < h0) ctx.mark('close_tnt')
    }
    rain.tnt = 4
    await dodge([[0.3, 0.3, ['left'], 10], [-0.1, 0.35, ['back'], 8], [-0.35, 0.3, ['right'], 10], [0.15, 0.3, ['back'], 8]])

    // ---- phase 3: creepers ----
    ctx.mark('creepers')
    // the chaos can hurt but not kill until the one with his name on it (resistance IV: 80% off,
    // hearts still drop); a stray creeper ended it early twice and the finale never played
    bot.chat('/effect give @s resistance infinite 1 true')
    rain.tnt = 0; rain.anvil = 6; rain.creeper = 14
    ctx.easeLook(yaw0, 0.15, 500); await bot.waitForTicks(6)
    // backpedal, weaving, watching them come
    const nearest = () => {
      let best = null, bd = 99
      for (const e of Object.values(bot.entities)) if (e.name === 'creeper') { const d = e.position.distanceTo(bot.entity.position); if (d < bd) { bd = d; best = e } }
      return [best, bd]
    }
    let ran = false
    for (let k = 0; k < 170; k++) {
      const [c] = nearest()
      const phase = Math.floor(k / 20) % 2
      bot.setControlState('back', true)
      bot.setControlState('left', phase === 0); bot.setControlState('right', phase === 1)
      if (k % 10 === 0 && k !== 80) {   // (not on the close call's tick: two looks fought and it never showed)
        const target = c ? c.position.offset(0, 1.0, 0) : null
        if (target) ctx.easeLookAt(target, 400); else ctx.easeLook(yaw0 + (phase ? 0.25 : -0.25), 0.1, 400)
      }
      if (k === 30 || k === 140) {
        // a burst: three at once, spread across the view
        ctx.mark(k === 30 ? 'more' : 'keep')
        for (const sp of [-0.45, 0, 0.45]) { const p = bot.entity.position, a = bot.entity.yaw + sp; creeper(p.x - Math.sin(a) * 12, p.z - Math.cos(a) * 12, 12) }
      }
      if (!ran && k === 80) {
        // one lands right beside us, already hissing: sprint off, turn back for the blast
        ran = true
        bot.clearControlStates()
        const p = bot.entity.position, yy = bot.entity.yaw + 0.3   // inside the view cone
        const sx = p.x - Math.sin(yy) * 3.5, sz = p.z - Math.cos(yy) * 3.5
        bot.chat(`/summon creeper ${sx.toFixed(2)} ${floor + 3} ${sz.toFixed(2)} {PersistenceRequired:1b,ignited:1b,Fuse:34}`)
        await bot.waitForTicks(3)
        ctx.sound('entity.creeper.primed', 1, 1)
        await ctx.easeLookAt(new Vec3(sx, floor + 1.3, sz), 250)
        ctx.mark('run')
        await bot.waitForTicks(4)
        await ctx.easeLook(yy + Math.PI, 0.0, 250)
        bot.setControlState('sprint', true); bot.setControlState('forward', true)
        await bot.waitForTicks(16)
        bot.setControlState('forward', false); bot.setControlState('sprint', false)
        await ctx.easeLookAt(new Vec3(sx, floor + 1.3, sz), 300)
        await bot.waitForTicks(8)
        k += 32
      }
      await bot.waitForTicks(1)
    }
    bot.clearControlStates()

    // ---- finale: everything at once ----
    ctx.mark('everything')
    rain.anvil = 2; rain.tnt = 5; rain.creeper = 8; rain.far = true
    await ctx.easeLook(bot.entity.yaw, 0.45, 400)
    const yf = bot.entity.yaw
    for (const [dy, dirs, t] of [[0.3, ['left'], 10], [-0.4, ['right'], 10], [0.1, ['back'], 8], [0.4, ['left'], 8], [-0.2, ['back'], 8], [0.25, ['right'], 8]]) { ctx.easeLook(yf + dy, 0.3, 500); await step(dirs, t) }
    // the one that lands right behind
    bot.chat('/effect clear @s resistance')
    await bot.waitForTicks(1)
    const p = bot.entity.position, yb = bot.entity.yaw
    bot.chat(`/summon creeper ${(p.x + Math.sin(yb) * 1.6).toFixed(2)} ${(floor + 1).toFixed(1)} ${(p.z + Math.cos(yb) * 1.6).toFixed(2)} {PersistenceRequired:1b,ignited:1b,Fuse:30}`)
    await bot.waitForTicks(3)
    if (ctx.died) return false                                    // killed early by the chaos: retry
    ctx.mark('hiss'); ctx.sound('entity.creeper.primed', 1, 1)
    rain.anvil = 0; rain.tnt = 0; rain.creeper = 0
    await bot.waitForTicks(6)
    // spin round onto IT (a fixed 180 deg turn ended with the face in a crater wall)
    const cb = Object.values(bot.entities).filter(e => e.name === 'creeper').sort((a, b) => a.position.distanceTo(p) - b.position.distanceTo(p))[0]
    if (cb) await ctx.easeLookAt(cb.position.offset(0, 1.1, 0), 350); else await ctx.easeLook(yb + Math.PI, -0.15, 350)
    for (let i = 0; i < 12 && !ctx.died; i++) { await bot.waitForTicks(1); if (cb) bot.lookAt(cb.position.offset(0, 1.1, 0), true) }
    for (let i = 0; i < 60 && !ctx.died; i++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', onTick)
    await bot.waitForTicks(40)                                    // the death screen
    bot.removeListener('blockUpdate', landed)
    return ctx.died
  }
}
