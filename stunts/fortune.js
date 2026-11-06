// "POV: fortune 1000 💀" (~13 s): a stone wall with a row of ores. The bot mines them one by one and
// each bursts into a fountain of real dropped items (summoned with random motion) that it then picks
// up, so the hotbar fills with stacks. Escalates: coal, iron, gold, diamond, then an emerald finale.
const ORES = [
  { block: 'coal_ore', drop: 'coal', n: 18 },
  { block: 'iron_ore', drop: 'raw_iron', n: 22 },
  { block: 'gold_ore', drop: 'raw_gold', n: 26 },
  { block: 'diamond_ore', drop: 'diamond', n: 34 },
  { block: 'emerald_ore', drop: 'emerald', n: 48 }
]

module.exports = {
  name: 'fortune',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: fortune 1000 💀',
  edit: { caption: 'POV: fortune 1000 💀', red: '1000', song: 'songs/funk_abnormal.mp3', dropAt: 'burst', start: 0.4 },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 10} ${floor + 1} ${z - 8} ${x + 10} ${floor + 10} ${z + 6} air`)
    await ctx.cmd(`/fill ${x - 10} ${floor} ${z - 8} ${x + 10} ${floor} ${z + 6} grass_block`)
    await ctx.cmd(`/fill ${x - 10} ${floor - 3} ${z - 8} ${x + 10} ${floor - 1} ${z + 6} dirt`)
    // the rock face: stone wall 3 deep, ores at chest height, 2 apart
    this.wz = z - 3
    await ctx.cmd(`/fill ${x - 7} ${floor + 1} ${this.wz - 2} ${x + 7} ${floor + 5} ${this.wz} stone`)
    await ctx.cmd(`/fill ${x - 7} ${floor + 6} ${this.wz - 2} ${x + 7} ${floor + 6} ${this.wz} grass_block`)
    this.ores = ORES.map((o, i) => ({ ...o, x: x - 4 + i * 2, y: floor + 2 }))
    for (const o of this.ores) await ctx.cmd(`/setblock ${o.x} ${o.y} ${this.wz} ${o.block}`)
    await ctx.hotbar(['diamond_pickaxe', ['torch', 16], ['bread', 8]])
    await ctx.tpCheck(x - 3.5, floor + 1, z + 0.5, 180, 15)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    let seed = 5
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    await bot.waitForTicks(6)
    for (let i = 0; i < this.ores.length; i++) {
      const o = this.ores[i]
      // step along the wall to the next ore
      const tx = o.x + 0.5
      await bot.look(0, -0.3, true)                              // facing the wall (north): +x is to the right
      for (let k = 0; k < 40 && Math.abs(bot.entity.position.x - tx) > 0.3; k++) {
        bot.setControlState('right', bot.entity.position.x < tx)
        bot.setControlState('left', bot.entity.position.x > tx)
        await bot.waitForTicks(1)
      }
      bot.setControlState('left', false); bot.setControlState('right', false)
      const p = new Vec3(o.x, o.y, this.wz)
      await ctx.easeLookAt(p.offset(0.5, 0.5, 0.5), 250)
      for (let k = 0; k < 3; k++) { bot.swingArm(); ctx.sound('block.stone.hit', 0.6, 0.7); await bot.waitForTicks(2) }
      bot.chat(`/setblock ${o.x} ${o.y} ${this.wz} air`)
      ctx.sound('block.stone.break', 1); ctx.particles('block', p, { block: o.block })
      if (i === 0) ctx.mark('burst')
      ctx.mark('ore', { n: i, block: o.block })
      // the fountain
      for (let k = 0; k < o.n; k++) {
        const a = rnd() * Math.PI * 2, sp = 0.1 + rnd() * 0.25
        const mx = Math.cos(a) * sp, mz = Math.abs(Math.sin(a)) * sp * 1.4, my = 0.3 + rnd() * 0.35
        bot.chat(`/summon item ${o.x + 0.5} ${o.y + 0.5} ${this.wz + 1.0} {Item:{id:"minecraft:${o.drop}",count:1},Motion:[${mx.toFixed(3)},${my.toFixed(3)},${mz.toFixed(3)}],PickupDelay:12}`)
      }
      ctx.sound('entity.experience_orb.pickup', 0.8, 1.2)
      await ctx.easeLook((rnd() - 0.5) * 0.3, 0.15, 350)   // look at the shower
      await bot.waitForTicks(8)
      for (let k = 0; k < 6; k++) { ctx.sound('entity.item.pickup', 0.3, 0.8 + rnd() * 0.8); await bot.waitForTicks(2) }
      await ctx.easeLook(0, -0.3, 300)
    }
    await bot.waitForTicks(20)
    await ctx.easeLook(0.5, 0.0, 600)
    await bot.waitForTicks(10)
    return !ctx.died
  }
}
