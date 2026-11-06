// "never dig straight down" / "caves when you look for a base spot": a calm plains surface, the bot
// looks down and digs straight down three blocks... and drops into a huge hidden cavern (lavafall,
// waterfall, ores everywhere), landing in its pool with the cave ambience going off.
// The cavern is carved with commands from rounded blobs (layered discs); the dig is a real dig.

function blobCmds (cx, cy, cz, r, block) {
  const out = []
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy))
    if (w <= 0) continue
    const a = Math.round(w * 0.6), c = Math.round(w * 0.85)
    for (const [wx, wz] of [[w, a], [a, w], [c, c]]) {
      out.push(`/fill ${cx - wx} ${cy + dy} ${cz - wz} ${cx + wx} ${cy + dy} ${cz + wz} ${block}`)
    }
  }
  return out
}

module.exports = {
  name: 'cave_reveal',
  brightness: 1,   // Options > Brightness: Bright, so the ores and walls read (at the default the cavern was black)
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'never dig straight down 💀',
  edit: { caption: 'never dig straight down 💀', red: 'never', song: 'songs/misery.mp3', dropAt: 'reveal' , startAt: 'reveal:-2.2'},

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    // just the spot itself: keep the natural surface around (flattening leaves cut walls in view)
    await ctx.cmd(`/fill ${x - 2} ${floor + 1} ${z - 2} ${x + 2} ${floor + 8} ${z + 2} air`)
    await ctx.cmd(`/fill ${x - 1} ${floor} ${z - 1} ${x + 1} ${floor} ${z + 1} grass_block`)
    await ctx.cmd(`/fill ${x - 1} ${floor - 2} ${z - 1} ${x + 1} ${floor - 1} ${z + 1} dirt`)
    await ctx.cmd(`/fill ${x - 16} ${floor - 30} ${z - 16} ${x + 16} ${floor - 3} ${z + 16} stone`)
    // the cavern: one big chamber under the player plus side chambers
    const B = this.floor - 14
    const blobs = [[x, B, z, 11], [x + 10, B - 3, z - 6, 8], [x - 9, B - 2, z + 7, 8], [x + 3, B - 5, z + 12, 7], [x - 6, B + 2, z - 10, 7]]
    for (const [cx, cy, cz, r] of blobs) for (const c of blobCmds(cx, cy, cz, r, 'cave_air')) await ctx.cmd(c)
    // ores in the walls: points just outside the blob surfaces
    const ores = ['diamond_ore', 'gold_ore', 'iron_ore', 'iron_ore', 'coal_ore', 'coal_ore', 'copper_ore', 'lapis_ore', 'redstone_ore', 'emerald_ore']
    let seed = 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < 220; i++) {
      const [cx, cy, cz, r] = blobs[Math.floor(rnd() * blobs.length)]
      const th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 2 - 1), d = r + 0.5
      const ox = Math.round(cx + d * Math.sin(ph) * Math.cos(th)), oy = Math.round(cy + d * Math.cos(ph)), oz = Math.round(cz + d * Math.sin(ph) * Math.sin(th))
      if (oy > floor - 4) continue
      const o = ores[Math.floor(rnd() * ores.length)]
      await ctx.cmd(`/fill ${ox} ${oy} ${oz} ${ox + 1} ${oy + 1} ${oz} ${o} replace stone`)
    }
    // a flat cavern floor (blob bottoms are bowls, so loose lava would run down onto the landing
    // pool): stone up to B-6, walkable at B-5
    const F = B - 6
    await ctx.cmd(`/fill ${x - 18} ${B - 14} ${z - 18} ${x + 18} ${F} ${z + 18} stone replace cave_air`)
    // the landing pool: 7x7, one deep (any water cancels the fall damage, and the eyes stay above
    // the surface to see the cave)
    await ctx.cmd(`/fill ${x - 3} ${F} ${z - 3} ${x + 3} ${F} ${z + 3} water`)
    // lava pits around it: contained by the stone floor, and they light the cave (an unlit cave is
    // ~3% brightness in vanilla, i.e. black)
    for (const [dx, dz] of [[8, 0], [-8, 2], [1, 8], [-2, -8], [7, -7], [-7, 7]]) {
      await ctx.cmd(`/fill ${x + dx - 1} ${F} ${z + dz - 1} ${x + dx + 1} ${F} ${z + dz + 1} lava replace stone`)
    }
    // lavafall in the west chamber and a waterfall in the north one: source at the top, falling
    // fluid down to the floor so they're there at once (flowing lava takes 30 ticks per block)
    const lavaX = x - 9, lavaZ = z + 7, lavaTop = B - 2 + 7
    await ctx.cmd(`/setblock ${lavaX} ${lavaTop + 1} ${lavaZ} lava`)
    await ctx.cmd(`/fill ${lavaX} ${F + 1} ${lavaZ} ${lavaX} ${lavaTop} ${lavaZ} lava[level=8] replace cave_air`)
    const wX = x + 3, wZ = z + 12, wTop = B - 5 + 6
    await ctx.cmd(`/setblock ${wX} ${wTop + 1} ${wZ} water`)
    await ctx.cmd(`/fill ${wX} ${F + 1} ${wZ} ${wX} ${wTop} ${wZ} water[level=8] replace cave_air`)
    await ctx.hotbar(['diamond_shovel', 'diamond_pickaxe', ['torch', 64], ['cobblestone', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 0, 0)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    await bot.waitForTicks(10)
    await ctx.easeLook(0.5, -0.1, 600)                       // nice calm spot...
    await ctx.easeLook(-0.3, -0.25, 600)
    await ctx.easeLook(0, -Math.PI / 2 + 0.02, 500)          // ...straight down
    for (const dy of [0, -1, -2, -3]) {         // grass, dirt, dirt, the cavern roof
      const p = new Vec3(this.x, this.floor + dy, this.z)
      const b = bot.blockAt(p)
      if (!b || b.name === 'air' || b.name === 'cave_air') continue
      const tool = /grass|dirt/.test(b.name) ? 0 : 1
      if (bot.quickBarSlot !== tool) { ctx.select(tool); await bot.waitForTicks(2) }
      try { await bot.dig(b, true) } catch (e) { ctx.log('dig', e.message) }
      ctx.sound(`block.${ctx.soundGroup(b.name)}.break`, 1, 0.9); ctx.particles('block', p, { block: b.name })
      for (let k = 0; k < 10 && bot.entity.position.y > this.floor + dy + 0.6; k++) await bot.waitForTicks(1)
    }
    ctx.mark('reveal'); ctx.sound('ambient.cave', 1)
    // falling: lift the eyes from the floor to the cavern as it opens up
    let splashed = false
    const pool = this.floor - 14 - 6                        // the pool surface (top of F)
    const lift = ctx.easeLook(0.8, -0.35, 1300)
    for (let i = 0; i < 120 && !ctx.died; i++) {
      await bot.waitForTicks(1)
      if (!splashed && bot.entity.position.y < pool + 1.2) {
        splashed = true; ctx.mark('splash'); ctx.sound('entity.player.splash.high_speed')
        ctx.particles('splash', { x: this.x + 0.5, y: pool + 0.95, z: this.z + 0.5 }, { count: 30 })
      }
      if (splashed && i > 4) break
    }
    await lift
    // look around the cavern from the pool, never still: up across the ore walls, along the
    // lavafall, and end drifting on the lavafall (the waterfall corner was the darkest shot)
    await ctx.easeLook(1.6, 0.25, 1100)                      // up at the ore walls
    await ctx.easeLook(2.6, 0.1, 1100)                       // across to the waterfall
    await ctx.easeLook(1.2, 0.0, 1300)                       // back to the lavafall
    ctx.easeLook(0.9, 0.12, 1600)                            // slow drift to the end
    await bot.waitForTicks(20)
    return splashed && !ctx.died
  }
}
