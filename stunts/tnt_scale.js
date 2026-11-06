// "1 TNT vs 10 TNT vs 100 TNT 💀" (~15 s, three escalating beats): three piles in a field, each
// set off in turn while the camera watches: one block, a 5x2 slab, a 5x4x5 cube. Explosions come
// from the server (packets -> particles + sound); craters relight in the renderer.
const PILES = [   // six beats, ~30 s (owner: 30 s minimum); spaced so no blast sets the next pile off early
  { n: 1, dx: -28, size: [1, 1, 1], sub: '1 TNT' },
  { n: 10, dx: -20, size: [5, 2, 1], sub: '10 TNT' },
  { n: 25, dx: -10, size: [5, 1, 5], sub: '25 TNT' },
  { n: 50, dx: 1, size: [5, 2, 5], sub: '50 TNT' },
  { n: 100, dx: 14, size: [5, 4, 5], sub: '100 TNT' },
  { n: 500, dx: 33, size: [10, 5, 10], sub: '500 TNT' }
]

module.exports = {
  name: 'tnt_scale',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 TNT vs 10 vs 100 vs 500 TNT 💀',
  edit: {
    caption: '1 TNT vs 10 vs 100 vs 500 TNT 💀', red: '500', song: 'songs/funk_abnormal.mp3', dropAt: 'boom', startAt: 'pile:-0.6',
    subs: PILES.map((p, i) => ['pile', p.sub, 2.4, i])
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let z0 = z - 36; z0 <= z + 10; z0 += 4) {   // a wide flat field (slabs under the /fill cap); deep dirt so craters don't flood
      const z1 = Math.min(z0 + 3, z + 10)
      for (let y0 = floor + 1; y0 <= floor + 14; y0 += 7) await ctx.cmd(`/fill ${x - 40} ${y0} ${z0} ${x + 48} ${y0 + 6} ${z1} air`)
      await ctx.cmd(`/fill ${x - 40} ${floor} ${z0} ${x + 48} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 40} ${floor - 14} ${z0} ${x + 48} ${floor - 1} ${z1} dirt`)
    }
    this.pz = z - 12               // close enough that the single block reads
    for (const p of PILES) {
      const [w, h, d] = p.size
      const back = p.n >= 500 ? 8 : 0                      // the big one further back (its blast flings things)
      const x0 = x + p.dx - (w >> 1), z0 = this.pz - back - (d >> 1)
      await ctx.cmd(`/fill ${x0} ${floor + 1} ${z0} ${x0 + w - 1} ${floor + h} ${z0 + d - 1} tnt`)
      p.top = { x: x + p.dx + 0.5, y: floor + h + 1, z: this.pz - back + 0.5 }
    }
    this.piles = PILES
    await ctx.hotbar(['flint_and_steel', ['tnt', 64], ['bread', 16]])
    await ctx.tpCheck(x - 27.5, floor + 1, z + 4.5, 180, 5)     // starts in front of the single block
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    let booms = 0
    bot._client.on('explosion', () => { booms++ })
    for (let i = 0; i < this.piles.length; i++) {
      const p = this.piles[i]
      // move along toward this pile, eyes on it (no standing around between blasts)
      const look = new Vec3(p.top.x, p.top.y - 1 + (i >= 4 ? 1 : 0), p.top.z)
      if (i > 0) {
        const tx = Math.min(this.x + p.dx - 6, this.x + 22)
        bot.setControlState('right', true)
        for (let k = 0; k < 40 && bot.entity.position.x < tx; k++) {
          const e = bot.entity.position.offset(0, 1.62, 0), d = look.minus(e)
          await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
          await bot.waitForTicks(1)
        }
        bot.setControlState('right', false)
      }
      await ctx.easeLookAt(look, i === 0 ? 300 : 250)
      ctx.mark('pile', { n: p.n })
      await bot.waitForTicks(6)
      // light it: a primed TNT on top sets the pile off (the bot is too far to use flint and steel)
      bot.swingArm(); ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
      bot.chat(`/summon tnt ${p.top.x} ${p.top.y} ${p.top.z} {fuse:20}`)
      const before = booms
      for (let k = 0; k < 60 && booms === before; k++) await bot.waitForTicks(1)
      ctx.mark('boom', { n: p.n })
      await bot.waitForTicks(i === PILES.length - 1 ? 50 : 18 + i * 4)   // let it play out (bigger ones longer)
    }
    // walk up to the big crater and look into it
    const crater = new Vec3(this.x + 33.5, this.floor - 3, this.pz - 8 + 0.5)
    await ctx.easeLookAt(crater, 600)
    bot.setControlState('forward', true)
    for (let k = 0; k < 34 && bot.entity.position.distanceTo(crater) > 9; k++) {
      const eye = bot.entity.position.offset(0, 1.62, 0), d = crater.minus(eye)
      await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
      await bot.waitForTicks(1)
    }
    bot.setControlState('forward', false)
    ctx.mark('rim')
    await bot.waitForTicks(14)
    return booms >= 3 && !ctx.died
  }
}
