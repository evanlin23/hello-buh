// "POV: fortune 1000 💀" (~13 s): a stone wall with a row of ores. The bot mines them one by one and
// each bursts into a fountain of real dropped items (summoned with random motion) that it then picks
// up, so the hotbar fills with stacks. Escalates: coal, iron, gold, diamond, then an emerald finale.
// The drops get spread spawn points (items summoned at one point merged into one stack) and real
// launch velocities aimed to come down around the player, who picks them up for real.
const ORES = [   // eight beats (~30 s, owner: 30 s minimum), filling the 8 free hotbar slots
  { block: 'coal_ore', drop: 'coal', n: 10 },
  { block: 'copper_ore', drop: 'raw_copper', n: 16 },
  { block: 'iron_ore', drop: 'raw_iron', n: 22 },
  { block: 'lapis_ore', drop: 'lapis_lazuli', n: 28 },
  { block: 'redstone_ore', drop: 'redstone', n: 34 },
  { block: 'gold_ore', drop: 'raw_gold', n: 40 },
  { block: 'diamond_ore', drop: 'diamond', n: 52 },
  { block: 'emerald_ore', drop: 'emerald', n: 64 }
]

module.exports = {
  name: 'fortune',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: fortune 1000 💀',
  edit: { caption: 'POV: fortune 1000 💀', red: '1000', song: 'songs/funk_abnormal.mp3', dropAt: 'burst', startAt: 'burst:-0.6', endAfter: 'finale:2.6' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 13} ${floor + 1} ${z - 8} ${x + 13} ${floor + 10} ${z + 6} air`)
    await ctx.cmd(`/fill ${x - 13} ${floor} ${z - 8} ${x + 13} ${floor} ${z + 6} grass_block`)
    await ctx.cmd(`/fill ${x - 13} ${floor - 3} ${z - 8} ${x + 13} ${floor - 1} ${z + 6} dirt`)
    // the rock face: stone wall 3 deep, ores at chest height, 2 apart
    this.wz = z - 3
    await ctx.cmd(`/fill ${x - 10} ${floor + 1} ${this.wz - 2} ${x + 10} ${floor + 5} ${this.wz} stone`)
    await ctx.cmd(`/fill ${x - 10} ${floor + 6} ${this.wz - 2} ${x + 10} ${floor + 6} ${this.wz} grass_block`)
    this.ores = ORES.map((o, i) => ({ ...o, x: x - 7 + i * 2, y: floor + 2 }))
    for (const o of this.ores) await ctx.cmd(`/setblock ${o.x} ${o.y} ${this.wz} ${o.block}`)
    await ctx.hotbar(['diamond_pickaxe'])
    await ctx.tpCheck(x - 6.5, floor + 1, z + 0.5, 180, 15)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    let seed = 5
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    // real pickups make the vanilla pop
    bot.on('playerCollect', (collector) => { if (collector === bot.entity) ctx.sound('entity.item.pickup', 0.25, 0.8 + rnd() * 0.8) })
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
      if (i === this.ores.length - 1) ctx.mark('finale')
      ctx.mark('ore', { n: i, block: o.block })
      // the fountain: spread spawn points (no merging), each item launched with vanilla physics on an
      // arc that comes down around the player (the renderer eases items between the server's syncs)
      const me = bot.entity.position, ground = this.floor + 1
      for (let k = 0; k < o.n; k++) {
        const sx = o.x + 0.5 + (rnd() - 0.5) * 1.0, sy = o.y + 0.5 + (rnd() - 0.5) * 0.8, sz = this.wz + 1.1 + rnd() * 0.3
        const tx = me.x + (rnd() - 0.5) * 2.6, tz = me.z - 0.6 + rnd() * 2.0
        const vy = 0.3 + rnd() * 0.3
        let y = sy, T = 0
        for (let v = vy; T < 80; T++) { v -= 0.04; y += v; v *= 0.98; if (y <= ground && T > 2) break }
        const f = (1 - Math.pow(0.98, T)) / 0.02
        bot.chat(`/summon item ${sx.toFixed(2)} ${sy.toFixed(2)} ${sz.toFixed(2)} {Item:{id:"minecraft:${o.drop}",count:1},PickupDelay:8,Motion:[${((tx - sx) / f).toFixed(3)},${vy.toFixed(3)},${((tz - sz) / f).toFixed(3)}]}`)
      }
      ctx.sound('entity.experience_orb.pickup', 0.8, 1.2)
      await ctx.easeLook((rnd() - 0.5) * 0.3, 0.15, 350)   // look at the shower
      await bot.waitForTicks(8)
      // watch it rain down around your feet and get picked up
      await ctx.easeLook((rnd() - 0.5) * 0.4, -0.85, 300)
      await bot.waitForTicks(i === this.ores.length - 1 ? 26 : 8)
      await ctx.easeLook(0, -0.3, 300)
    }
    await bot.waitForTicks(20)
    ctx.log('hotbar', JSON.stringify(bot.inventory.items().map(i => [i.name, i.count])))
    await ctx.easeLook(0.5, 0.0, 600)
    await bot.waitForTicks(10)
    return !ctx.died
  }
}
