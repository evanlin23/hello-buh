// "dyeing it until it's a rainbow 🌈". Planned as dyeing a row of sheep, but the renderer draws no
// sheep (renderer/entities.js look() has no sheep case, and the harness records no wool colour),
// so the same idea in blocks: a plain white wool arch in a field. The bot uses a dye on each band,
// outer to inner (red, orange, yellow, lime, light blue, blue, purple), and the colour runs along
// the band from the clicked spot to both feet. Then it backs up to reveal the whole rainbow.
// The click is a real use packet with the dye held (long block reach via the interaction-range
// attribute); the colour spreading is /setblock, a few blocks per tick.
const R_OUT = 10                          // outer band radius; 7 bands of 1 block, inner radius 4
const BANDS = [
  { dye: 'red_dye', wool: 'red_wool', sub: 'red' },
  { dye: 'orange_dye', wool: 'orange_wool', sub: 'orange' },
  { dye: 'yellow_dye', wool: 'yellow_wool', sub: 'yellow' },
  { dye: 'lime_dye', wool: 'lime_wool', sub: 'green' },
  { dye: 'light_blue_dye', wool: 'light_blue_wool', sub: 'light blue' },
  { dye: 'blue_dye', wool: 'blue_wool', sub: 'blue' },
  { dye: 'purple_dye', wool: 'purple_wool', sub: 'purple' }
]

// blocks of each band: a half ring around (cx + 0.5, floor + 1) in the plane z = zA
function bandBlocks (cx, floor, zA) {
  const out = BANDS.map(() => [])
  for (let dx = -R_OUT - 1; dx <= R_OUT + 1; dx++) {
    for (let dy = 0; dy <= R_OUT + 1; dy++) {
      const d = Math.hypot(dx, dy)
      const k = Math.floor(R_OUT + 0.5 - d)       // 0 = outer band
      if (k < 0 || k >= BANDS.length) continue
      out[k].push({ x: cx + dx, y: floor + 1 + dy, z: zA, ang: Math.atan2(dy, dx) })
    }
  }
  return out
}

module.exports = {
  name: 'rainbow_wool',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: "dyeing it until it's a rainbow 🌈",
  edit: {
    caption: "dyeing it until it's a rainbow 🌈", red: 'rainbow', song: 'songs/funk_abnormal.mp3', dropAt: 'reveal',
    startAt: 'dye:-0.5',
    subs: [...BANDS.map((b, i) => ['dye', b.sub, 1.0, i]), ['reveal', 'perfect', 1.8, 0]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    this.zA = z - 6
    await ctx.defaultRules()
    // a flat field (slabs under the 32768-block /fill cap)
    for (const [z0, z1] of [[z - 20, z + 2], [z + 3, z + 26]]) {
      await ctx.cmd(`/fill ${x - 22} ${floor + 1} ${z0} ${x + 22} ${floor + 16} ${z1} air`)
      await ctx.cmd(`/fill ${x - 22} ${floor} ${z0} ${x + 22} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 22} ${floor - 3} ${z0} ${x + 22} ${floor - 1} ${z1} dirt`)
    }
    this.bands = bandBlocks(x, floor, this.zA)
    for (const b of this.bands) for (const p of b) await ctx.cmd(`/setblock ${p.x} ${p.y} ${p.z} white_wool`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 24')
    await ctx.hotbar(BANDS.map(b => b.dye))
    await ctx.tpCheck(x + 0.5, floor + 1, z + 7.5, 180, -12)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, floor, zA } = this
    // colour runs along the band, from the clicked angle outwards, a few blocks per tick
    const queue = []
    const spread = () => {
      bot.chat('/kill @e[type=item]')      // stray seed drops ended up in the hotbar
      for (let n = 0; n < 3 && queue.length; n++) { const q = queue.shift(); bot.chat(`/setblock ${q.x} ${q.y} ${q.z} ${q.wool}`) }
    }
    bot.on('physicsTick', spread)
    await bot.waitForTicks(6)
    const look = [2.2, 2.0, 1.85, 1.7, 1.55, 1.4, 1.25]          // where on each band to click (angle on the arc)
    for (let i = 0; i < BANDS.length; i++) {
      const b = BANDS[i], band = this.bands[i]
      const a = look[i]
      // the block of this band nearest that angle
      const target = band.reduce((best, p) => Math.abs(p.ang - a) < Math.abs(best.ang - a) ? p : best, band[0])
      ctx.select(i)
      if (i === 3) bot.setControlState('right', true)               // drift right as it goes
      if (i === 5) bot.setControlState('right', false)
      await ctx.easeLookAt(new ctx.Vec3(target.x + 0.5, target.y + 0.5, zA + 1), i === 0 ? 350 : 300)
      // use the dye on the band (south face of the block)
      bot._client.write('block_place', { hand: 0, location: { x: target.x, y: target.y, z: target.z }, direction: 3, cursorX: 0.5, cursorY: 0.5, cursorZ: 1, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm()
      ctx.mark('dye', { n: i, color: b.wool })
      ctx.sound('item.dye.use', 1, 1)
      ctx.sound('block.wool.place', 0.8, 1.1)
      const order = band.slice().sort((p, q) => Math.abs(p.ang - target.ang) - Math.abs(q.ang - target.ang))
      for (const p of order) queue.push({ ...p, wool: b.wool })
      // a soft wool sound as it runs
      for (let t = 0; t < 3; t++) { await bot.waitForTicks(4); ctx.sound('block.wool.place', 0.35, 0.9 + t * 0.1) }
      await bot.waitForTicks(i === BANDS.length - 1 ? 6 : 5)
    }
    bot.setControlState('right', false)
    while (queue.length) await bot.waitForTicks(1)
    // back up to see the whole thing
    await ctx.easeLookAt(new ctx.Vec3(x + 0.5, floor + 5, zA), 600)
    bot.setControlState('back', true)
    const zEnd = zA + 24
    let revealed = false
    while (bot.entity.position.z < zEnd) {
      await bot.waitForTicks(1)
      if (!revealed && bot.entity.position.z > zEnd - 5) { revealed = true; ctx.mark('reveal'); ctx.sound('entity.player.levelup', 0.6, 1) }
      // keep the arch centred while walking back
      const e = bot.entity.position
      const d = new ctx.Vec3(x + 0.5 - e.x, floor + 5 - (e.y + 1.62), zA - e.z)
      bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
    }
    bot.setControlState('back', false)
    if (!revealed) ctx.mark('reveal')
    // a slow drift up to the sky while it sits there
    await ctx.easeLook(bot.entity.yaw + 0.12, bot.entity.pitch + 0.1, 1400)
    bot.removeListener('physicsTick', spread)
    return true
  }
}
