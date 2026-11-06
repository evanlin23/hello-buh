// "POV: caves when you're trying to find a spot for your base" (Level_Won: 1.28M at 6.5K subs,
// "do NOT check the sound"): a calm grassy hillside; the bot digs two blocks into it and the
// hill is hollow - a huge torch-lit cavern with ores everywhere and a lava pool.
// Everything is built with commands; the dig is a real survival dig with a pickaxe.

module.exports = {
  name: 'cave_reveal',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: caves when you try to find a spot for your base',
  edit: { caption: 'POV: caves when you try to find a spot for your base', red: 'caves', song: 'songs/funk_abnormal.mp3', dropAt: 'reveal', start: 0.5 },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    const H0 = z - 3, H1 = z - 23           // hill spans z-23..z-3 in front of the player
    await ctx.cmd(`/fill ${x - 14} ${floor - 3} ${H1 - 2} ${x + 14} ${floor} ${z + 3} grass_block`)
    await ctx.cmd(`/fill ${x - 14} ${floor - 3} ${H1 - 2} ${x + 14} ${floor - 1} ${z + 3} dirt`)
    await ctx.cmd(`/fill ${x - 14} ${floor + 1} ${H1 - 2} ${x + 14} ${floor + 16} ${z + 3} air`)
    // the hill: stepped layers of stone with a dirt + grass skin
    for (let k = 0; k < 7; k++) {
      const w = 12 - k, d0 = H0 - k, d1 = H1 + k
      await ctx.cmd(`/fill ${x - w} ${floor + 1 + k} ${d1} ${x + w} ${floor + 1 + k} ${d0} stone`)
    }
    for (let k = 0; k < 7; k++) {
      const w = 12 - k, d0 = H0 - k, d1 = H1 + k
      await ctx.cmd(`/fill ${x - w} ${floor + 1 + k} ${d1} ${x + w} ${floor + 1 + k} ${d0} grass_block replace stone`)
      if (k < 6) await ctx.cmd(`/fill ${x - w + 1} ${floor + 1 + k} ${d1 + 1} ${x + w - 1} ${floor + 1 + k} ${d0 - 1} stone replace grass_block`)
    }
    // hollow it out: a big cavern inside, dug down below ground level
    await ctx.cmd(`/fill ${x - 9} ${floor - 6} ${H1 + 3} ${x + 9} ${floor + 4} ${H0 - 3} air`)
    await ctx.cmd(`/fill ${x - 10} ${floor - 7} ${H1 + 2} ${x + 10} ${floor - 7} ${H0 - 2} stone`)
    // ores in the cavern walls/floor (replace stone in the shell around the cavern)
    const ores = ['diamond_ore', 'gold_ore', 'iron_ore', 'emerald_ore', 'lapis_ore', 'redstone_ore', 'coal_ore', 'copper_ore']
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < 140; i++) {
      const ox = x + Math.round((rnd() - 0.5) * 20), oy = floor - 7 + Math.floor(rnd() * 12), oz = H1 + 2 + Math.floor(rnd() * (H0 - H1 - 4))
      const o = ores[Math.floor(rnd() * ores.length)]
      await ctx.cmd(`/fill ${ox} ${oy} ${oz} ${ox + 1} ${oy + 1} ${oz} ${o} replace stone`)
    }
    // lava pool + torches so the cave is lit like a real one
    await ctx.cmd(`/fill ${x - 6} ${floor - 7} ${H1 + 5} ${x - 3} ${floor - 7} ${H1 + 8} lava`)
    for (const [dx, dz] of [[-8, 4], [8, 4], [-8, 12], [8, 12], [0, 15], [5, 8], [-4, 16]]) {
      await ctx.cmd(`/setblock ${x + dx} ${floor - 6} ${H1 + dz} torch`)
    }
    await ctx.cmd(`/fill ${x - 1} ${floor - 6} ${H0 - 4} ${x + 1} ${floor - 6} ${H0 - 4} glow_lichen[down=true]`)
    this.wall = H0                                       // the hill face the player digs into
    await ctx.hotbar(['diamond_pickaxe', 'diamond_sword', ['torch', 64], ['cobblestone', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 0)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    await bot.waitForTicks(10)
    // walk up to the hill
    bot.setControlState('forward', true)
    while (bot.entity.position.z > this.wall + 1.4) await bot.waitForTicks(1)
    bot.setControlState('forward', false)
    await bot.waitForTicks(6)
    // dig the 2-block-high doorway into the hill face, then the next layer (the shell is 2 thick)
    for (const dz of [0, -1, -2]) {
      for (const dy of [1, 0]) {
        const p = new Vec3(this.x, this.floor + 1 + dy, this.wall + dz)
        const b = bot.blockAt(p)
        if (!b || b.name === 'air') continue
        await ctx.easeLookAt(p.offset(0.5, 0.5, 0.5), 150)
        try { await bot.dig(b, true) } catch (e) { ctx.log('dig', e.message) }
        ctx.sound(`block.${ctx.soundGroup(b.name)}.break`, 1, 0.9); ctx.particles('block', p, { block: b.name })
      }
    }
    ctx.mark('reveal')
    // step into the doorway and look down into the cavern
    bot.setControlState('forward', true); await bot.waitForTicks(8); bot.setControlState('forward', false)
    await ctx.easeLook(0, -0.55, 600)
    await ctx.easeLook(0.6, -0.4, 900)
    await ctx.easeLook(-0.6, -0.45, 1100)
    await bot.waitForTicks(16)
    return !ctx.died
  }
}
