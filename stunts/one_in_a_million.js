// "1 in a million landing, but it gets harder 😳": five drops, each one higher and smaller, each
// onto its own landing column, and the last one from build limit into a 1x1 of water in the middle
// of a lava lake, at night. Landing in water cancels fall damage (vanilla), so every one is a real
// survival landing; the only commands build the set and teleport to the next top.
// Between drops: a teleport cut (edit.speed "cut" between cutNa/cutNb), so there's no wait on screen.
// Owner rules: 30 s minimum from more beats, no dead space, end <= 1 s after the payoff.
const TIERS = [
  { h: 40, pool: 5, label: '40 blocks, 5x5' },
  { h: 100, pool: 3, label: '100 blocks, 3x3' },
  { h: 160, pool: 1, label: '160 blocks, 1x1' },
  { h: 'max', pool: 1, label: 'BUILD LIMIT, 1x1' },
  { h: 'max', pool: 1, lava: true, night: true, label: 'BUILD LIMIT... INTO LAVA' }
]
const GAP = 26          // blocks between landing columns (x): pads touch, so later tiers (the lava lake) show from the early ones
const R = 12            // cleared radius around each column
const TOP_Y = 316       // glass at 316, eyes at ~318.6 (build limit 319)

const subs = TIERS.map((t, i) => [`look${i + 1}`, t.label, 2.6, 0])   // the stakes before each drop

module.exports = {
  name: 'one_in_a_million',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 in a million landing, but it gets harder 😳',
  edit: {
    caption: '1 in a million landing, but it gets harder 😳', red: 'harder',
    song: 'songs/misery.mp3', dropAt: 'splash5',
    startAt: 'look1:-0.2', endAfter: 'splash5:0.9',
    subs,
    speed: TIERS.slice(1).map((_, i) => [`cut${i + 1}a`, `cut${i + 1}b`, 'cut'])
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    this.x0 = g.x; this.z = g.z; this.floor = g.y
    await ctx.defaultRules()
    const z = this.z, floor = this.floor
    // stand over the middle tier while building: the recording keeps the chunks the bot has loaded,
    // and the far tiers need terrain out to the fog in every direction
    // (a plain /tp: tpCheck fails mid-air because the bot falls in creative; position doesn't matter here)
    await ctx.cmd(`/tp @s ${this.x0 + 2 * GAP + 0.5} ${floor + 30} ${z + 0.5}`)
    await bot.waitForTicks(60)
    for (let i = 0; i < TIERS.length; i++) {
      const t = TIERS[i], x = this.x0 + i * GAP
      t.x = x; t.top = t.h === 'max' ? TOP_Y : floor + t.h
      // a flat grass pad, everything above it cleared to the top
      await ctx.cmd(`/fill ${x - R} ${floor - 3} ${z - R} ${x + R} ${floor - 1} ${z + R} dirt`)
      await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R} grass_block`)
      for (let y0 = floor + 1; y0 <= t.top + 3; y0 += 30) await ctx.cmd(`/fill ${x - R} ${y0} ${z - R} ${x + R} ${Math.min(y0 + 29, t.top + 3)} ${z + R} air`)
      if (t.lava) {   // a lava lake, a 1-block grass ring, the 1x1 of water in the middle
        await ctx.cmd(`/fill ${x - R} ${floor - 1} ${z - R} ${x + R} ${floor - 1} ${z + R} stone`)
        await ctx.cmd(`/fill ${x - R + 1} ${floor} ${z - R + 1} ${x + R - 1} ${floor} ${z + R - 1} lava`)
        await ctx.cmd(`/fill ${x - 1} ${floor} ${z - 1} ${x + 1} ${floor} ${z + 1} grass_block`)
      }
      const k = (t.pool - 1) / 2   // the pool: one block deep, water sources
      await ctx.cmd(`/fill ${x - k} ${floor - 1} ${z - k} ${x + k} ${floor - 1} ${z + k} stone`)
      await ctx.cmd(`/fill ${x - k} ${floor} ${z - k} ${x + k} ${floor} ${z + k} water`)
      await ctx.cmd(`/setblock ${x} ${t.top} ${z} glass`)
    }
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16], 'diamond_pickaxe'])
    await ctx.tpCheck(TIERS[0].x + 0.5, TIERS[0].top + 1, z + 0.5, 0, 30)
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x: this.x0 + 2 * GAP, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const z = this.z, floor = this.floor
    for (let i = 0; i < TIERS.length; i++) {
      const t = TIERS[i], n = i + 1
      if (i > 0) {   // cut: teleport to the next top (and to night for the finale), settle, go
        ctx.mark(`cut${i}a`)
        if (t.night) await ctx.setTime(18000)
        await ctx.tpCheck(t.x + 0.5, t.top + 1, z + 0.5, 0, 30)
        await ctx.cmd('/effect give @s instant_health 1 10 true')
        await bot.waitForTicks(6)
        ctx.mark(`cut${i}b`)
      }
      // a quick glance out (how high), then down at the target: slightly off straight-down so
      // the target sits just above the crosshair instead of hiding under it
      ctx.mark(`look${n}`)
      await ctx.easeLook(0.5 * (i % 2 ? -1 : 1), -0.5, 450)
      await ctx.easeLook(bot.entity.yaw, -Math.PI / 2 + 0.1, 550)
      ctx.mark(`drop${n}`); ctx.sound('block.glass.break', 1)
      ctx.particles('block', { x: t.x, y: t.top, z }, { block: 'glass' })
      await ctx.cmd(`/setblock ${t.x} ${t.top} ${z} air`)
      let splashed = false
      for (let k = 0; k < 400 && !ctx.died; k++) {
        await bot.waitForTicks(1)
        if (!splashed && bot.entity.position.y < floor + 1.2) {
          splashed = true; ctx.mark(`splash${n}`); ctx.sound('entity.player.splash.high_speed')
          ctx.particles('splash', { x: t.x + 0.5, y: floor + 0.95, z: z + 0.5 }, { count: 30 })
        }
        if (splashed && k > 4 && (bot.entity.onGround || bot.entity.isInWater)) break
      }
      if (!splashed || ctx.died) return false
      // straight into a look-up: no held shot on the water after the splash
      await ctx.easeLook(bot.entity.yaw + 0.5, -0.35, 800)
    }
    await bot.waitForTicks(6)
    return !ctx.died
  }
}
