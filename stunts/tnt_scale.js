// "1 TNT vs 10 TNT vs 100 TNT 💀" (~15 s, three escalating beats): three piles in a field, each
// set off in turn while the camera watches: one block, a 5x2 slab, a 5x4x5 cube. Explosions come
// from the server (packets -> particles + sound); craters relight in the renderer.
const PILES = [
  { n: 1, dx: -14, size: [1, 1, 1], sub: '1 TNT' },
  { n: 10, dx: 0, size: [5, 2, 1], sub: '10 TNT' },
  { n: 100, dx: 14, size: [5, 4, 5], sub: '100 TNT' }
]

module.exports = {
  name: 'tnt_scale',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 TNT vs 10 TNT vs 100 TNT 💀',
  edit: {
    caption: '1 TNT vs 10 TNT vs 100 TNT 💀', red: '100', song: 'songs/funk_abnormal.mp3', dropAt: 'boom', startAt: 'pile:-0.6',
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
    for (let y0 = floor + 1; y0 <= floor + 12; y0 += 6) await ctx.cmd(`/fill ${x - 24} ${y0} ${z - 30} ${x + 24} ${y0 + 5} ${z + 8} air`)
    await ctx.cmd(`/fill ${x - 24} ${floor} ${z - 30} ${x + 24} ${floor} ${z + 8} grass_block`)
    await ctx.cmd(`/fill ${x - 24} ${floor - 12} ${z - 30} ${x + 24} ${floor - 1} ${z + 8} dirt`)   // deep: craters into groundwater flood
    this.pz = z - 18
    for (const p of PILES) {
      const [w, h, d] = p.size
      const x0 = x + p.dx - (w >> 1), z0 = this.pz - (d >> 1)
      await ctx.cmd(`/fill ${x0} ${floor + 1} ${z0} ${x0 + w - 1} ${floor + h} ${z0 + d - 1} tnt`)
      p.top = { x: x + p.dx + 0.5, y: floor + h + 1, z: this.pz + 0.5 }
    }
    this.piles = PILES
    await ctx.hotbar(['flint_and_steel', ['tnt', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 4.5, 180, 5)
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
      await ctx.easeLookAt(new Vec3(p.top.x, p.top.y - 1 + (i === 2 ? 1 : 0), p.top.z), 600)
      ctx.mark('pile', { n: p.n })
      await bot.waitForTicks(6)
      // light it: a primed TNT on top sets the pile off (the bot is too far to use flint and steel)
      bot.swingArm(); ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
      bot.chat(`/summon tnt ${p.top.x} ${p.top.y} ${p.top.z} {fuse:20}`)
      const before = booms
      for (let k = 0; k < 60 && booms === before; k++) await bot.waitForTicks(1)
      ctx.mark('boom', { n: p.n })
      await bot.waitForTicks(i === 2 ? 50 : 24)                  // let it play out (the big one longer)
    }
    await ctx.easeLookAt(new Vec3(this.x + 14.5, this.floor - 2, this.pz + 0.5), 800)   // the crater
    await bot.waitForTicks(16)
    return booms >= 3 && !ctx.died
  }
}
