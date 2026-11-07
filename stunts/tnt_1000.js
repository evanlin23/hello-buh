// "1 TNT vs 10 vs 100 vs 1000 💀" (~30-35 s, five escalating tiers): one field, five piles in a row.
// Each tier: the bot lights the pile with flint and steel (a real use on the block, 4 s fuse),
// a cut skips most of the fuse to a vantage point far enough back for that pile's blast, the chain
// goes off, then a look into the crater. The finale is ridiculous: 1000 TNT again, but the bot is
// standing ON it. It lights the block at its feet, runs for the edge... "HelloBuh was blown up by
// HelloBuh". Peaceful (no TNT damage to the player) until the finale, normal for it.
// Owner rules: 30 s minimum from more beats, no dead space, end <= 1 s after the payoff.
const { plateau } = require('../lib/plateau')
const TIERS = [
  { n: 1, dx: -60, size: [1, 1, 1], view: 7, label: '1 TNT' },
  { n: 10, dx: -45, size: [5, 2, 1], view: 11, label: '10 TNT' },
  { n: 100, dx: -24, size: [5, 4, 5], view: 17, label: '100 TNT' },
  { n: 1000, dx: 16, size: [10, 10, 10], view: 40, label: '1000 TNT' },
  { n: 1000, dx: 92, size: [10, 10, 10], on: true, label: "1000 TNT... but I'm ON it" }
]
const XL = -100, XR = 140, ZB = -60, ZF = 60    // the cleared field around the piles (relative)

const speed = []
for (let i = 1; i <= TIERS.length; i++) {
  if (i > 1) speed.push([`cut${i}a`, `cut${i}b`, 'cut'])        // to the next pile
  speed.push([`fuse${i}a`, `fuse${i}b`, 'cut'])                   // most of the 4 s fuse
  if (i === 4) speed.push(['rim4a', 'rim4b', 'cut'])              // to the rim of the big crater
}

module.exports = {
  name: 'tnt_1000',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 TNT vs 10 vs 100 vs 1000 💀',
  edit: {
    caption: '1 TNT vs 10 vs 100 vs 1000 💀', red: '1000', song: 'songs/funk_abnormal.mp3', dropAt: 'boom4',
    startAt: 'tier1:-0.05', endAfter: 'death:1.4', deathScreen: true,
    subs: TIERS.map((t, i) => [`tier${i + 1}`, t.label, i === 4 ? 3.5 : 2.6, 0]),
    speed
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    await ctx.cmd('/gamerule tnt_explosion_drop_decay true')     // vanilla rule: fewer block drops (thousands of items)
    await ctx.cmd('/difficulty peaceful')
    // stand over the middle while building so every pile's chunks are loaded and recorded
    await ctx.cmd(`/tp @s ${x + 0.5} ${g.y + 1} ${z + 0.5}`)
    await bot.waitForTicks(60)
    // the field: a plateau levelled at a high percentile of the terrain (dug down to the start
    // point, its cut walls showed in the wide shots), deep dirt below (craters that reach
    // groundwater flood)
    const floor = await plateau(ctx, { x0: x + XL, x1: x + XR, z0: z + ZB, z1: z + ZF, above: 30, below: 20 })
    Object.assign(this, { x, z, floor })
    await ctx.cmd('/kill @e[type=!player]')
    this.tiers = TIERS.map(t => {
      const [w, h, d] = t.size
      const cx = x + t.dx, zf = z                               // front (south) face of the pile at z
      const x0 = cx - (w >> 1), z0 = zf - d + 1
      return { ...t, cx, zf, x0, z0, w, h, d }
    })
    for (const t of this.tiers) {
      for (let y = floor + 1; y <= floor + t.h; y++) await ctx.cmd(`/fill ${t.x0} ${y} ${t.z0} ${t.x0 + t.w - 1} ${y} ${t.z0 + t.d - 1} tnt`)
    }
    await ctx.hotbar(['diamond_sword', 'flint_and_steel', ['bread', 16], ['cobblestone', 64]])
    const t0 = this.tiers[0]
    await ctx.tpCheck(t0.cx + 0.5, floor + 1, t0.zf + 2.5, 180, 20)
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const floor = this.floor
    let booms = 0, lastBoom = -99
    bot._client.on('explosion', () => { booms++; lastBoom = ctx.tick })
    const light = (bx, by, bz, dir, cur) => {
      bot._client.write('block_place', { hand: 0, location: { x: bx, y: by, z: bz }, direction: dir, cursorX: cur[0], cursorY: cur[1], cursorZ: cur[2], insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
    }
    for (let i = 0; i < this.tiers.length; i++) {
      const t = this.tiers[i], n = i + 1
      const mid = new Vec3(t.cx + 0.5, floor + 1 + t.h / 2, t.zf - t.d / 2 + 0.5)
      if (t.on) {
        // ---- the finale: on top of 1000 TNT ----
        ctx.mark(`cut${n}a`)
        await ctx.cmd('/difficulty normal')
        // stand at the east end facing west, down the field (the other way the cleared field's walls show)
        await ctx.tpCheck(t.cx + 3.5, floor + t.h + 1, t.zf - 4.5, 90, 55)
        await ctx.cmd('/effect give @s instant_health 1 10 true')
        await bot.waitForTicks(4)
        ctx.mark(`cut${n}b`)
        ctx.mark(`tier${n}`)
        const W = Math.PI / 2
        // TNT under the feet... a look out west over the edge (how high; the craters far off), back down
        await ctx.easeLook(W + 0.35, -0.3, 550)
        await ctx.easeLook(W - 0.4, -0.45, 700)
        await ctx.easeLook(W - 0.1, -1.15, 450)
        const bx = t.cx + 4, by = floor + t.h, bz = t.zf - 5                // the edge block right behind the feet
        await ctx.easeLookAt(new Vec3(bx + 0.5, by + 1, bz + 0.5), 350)
        light(bx, by, bz, 1, [0.5, 1, 0.5])
        ctx.mark(`lit${n}`)
        const litAt = ctx.tick
        await ctx.easeLook(bot.entity.yaw + 0.2, -1.2, 350)
        ctx.mark(`fuse${n}a`)
        while (ctx.tick - litAt < 50) await bot.waitForTicks(1)          // skipped by the cut
        ctx.mark(`fuse${n}b`)
        // ~1.5 s left: spin round and sprint west across the top... not fast enough
        await ctx.easeLook(W, -0.45, 300)
        bot.setControlState('sprint', true); bot.setControlState('forward', true)
        ctx.easeLook(W + 0.1, -0.2, 500)
        // a glance back over the shoulder just as it goes: the blast is on screen when it gets him
        for (let k = 0; k < 80 && !ctx.died; k++) {
          if (ctx.tick - litAt === 72) { bot.setControlState('forward', false); bot.setControlState('sprint', false); bot.setControlState('back', true); ctx.easeLook(W + Math.PI * 0.85, -0.35, 350) }
          await bot.waitForTicks(1)
        }
        bot.clearControlStates()
        ctx.mark('boom5')
        for (let k = 0; k < 40; k++) await bot.waitForTicks(1)          // the death screen
        return booms > 0 && ctx.died
      }
      if (i > 0) {   // cut to the next pile
        ctx.mark(`cut${n}a`)
        await ctx.tpCheck(t.cx + 0.5, floor + 1, t.zf + 2.5, 180, 15)
        await bot.waitForTicks(4)
        ctx.mark(`cut${n}b`)
      }
      ctx.mark(`tier${n}`)
      if (n === 1) {   // the hook: from the one block... to the 1000 cube down the field, and back
        const big = this.tiers[3]
        await ctx.easeLookAt(new Vec3(big.cx + 0.5, floor + 6, big.zf - 4), 650)
        await ctx.easeLook(bot.entity.yaw + 0.08, bot.entity.pitch + 0.05, 300)
      }
      // size it up (a big pile gets a look up its height), then light the front block
      if (t.h > 2) { await ctx.easeLook(-0.15, Math.min(1.15, Math.atan2(t.h - 0.6, 2.5)), 450); await ctx.easeLook(0.1, 0.15, 300) } else await ctx.easeLook(0.2, -0.25, 300)
      const target = new Vec3(t.cx, floor + 1, t.zf)
      await ctx.easeLookAt(target.offset(0.5, 0.5, 1), 250)
      light(target.x, target.y, target.z, 3, [0.5, 0.5, 1])
      ctx.mark(`lit${n}`)
      await bot.waitForTicks(8)
      // cut to the vantage point with ~1.1 s of fuse left
      ctx.mark(`fuse${n}a`)
      const litAt = ctx.tick - 8
      await ctx.tpCheck(t.cx + 0.5, floor + 1, t.zf + t.view + 0.5, 180, 0)
      await ctx.easeLookAt(mid.offset(0.8, -t.h * 0.15, 0), 50)
      while (ctx.tick - litAt < (n === 4 ? 38 : 58)) await bot.waitForTicks(1)
      ctx.mark(`fuse${n}b`)
      // nervous glances while it flashes, coming back to the pile
      const before = booms
      const y0 = bot.entity.yaw, p0 = bot.entity.pitch
      for (let k = 0; k < 60 && booms === before; k++) {
        if (k % 8 === 0) ctx.easeLook(y0 + [0.3, -0.25, 0.15, -0.3][(k / 8) % 4], p0 + [0.12, 0.02, 0.18, 0.05][(k / 8) % 4], 380)
        await bot.waitForTicks(1)
      }
      ctx.mark(`boom${n}`)
      // watch the chain: the look rises with the blast (flung TNT), the bigger the higher
      const up = n === 4 ? 0.12 : Math.min(0.5, 0.12 + t.h * 0.045)   // the 1000 blast stays in frame
      ctx.easeLook(bot.entity.yaw + 0.15, up, 700)
      const cap = [20, 26, 40, 72][i]       // ticks of chain on screen at most (3 s+ read as a gap)
      for (let k = 0; k < cap && ctx.tick - lastBoom < 14; k++) {
        if (k === 22) ctx.easeLook(bot.entity.yaw - 0.3, n === 4 ? 0.05 : up * 0.6, 600)
        if (k === 46 && n === 4) ctx.easeLook(bot.entity.yaw + 0.35, 0.0, 700)
        await bot.waitForTicks(1)
      }
      if (n === 4) {
        // the big crater: cut to its rim (find where the ground stops along the line in)
        ctx.mark('rim4a')
        let rz = t.zf + t.view
        for (let zz = t.zf + 2; zz <= t.zf + t.view; zz++) {
          const b = bot.blockAt(new Vec3(t.cx, floor, zz))
          if (b && b.name !== 'air') { rz = zz; break }
        }
        await ctx.tpCheck(t.cx + 0.5, floor + 1, rz + 2.5, 180, 40)
        await bot.waitForTicks(2)
        ctx.mark('rim4b')
        ctx.mark(`crater${n}`)
        await ctx.easeLook(0.45, -0.95, 700)
        await ctx.easeLook(-0.35, -0.85, 800)
      } else {
        // walk up to the crater, looking into it
        await ctx.easeLook(bot.entity.yaw - 0.15, -0.2, 300)
        bot.setControlState('forward', true)
        for (let k = 0; k < 40; k++) {
          const p = bot.entity.position
          const ahead = bot.blockAt(new Vec3(Math.floor(p.x), floor, Math.floor(p.z - 2)))
          if (!ahead || ahead.name === 'air' || p.z < t.zf + 2) break
          await bot.waitForTicks(1)
        }
        bot.setControlState('forward', false)
        ctx.mark(`crater${n}`)
        await ctx.easeLook(bot.entity.yaw + 0.3, -1.0, 450)
        await ctx.easeLook(bot.entity.yaw - 0.4, -0.9, 400)
      }
    }
    return false
  }
}
