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
  { n: 1000, dx: 16, size: [10, 10, 10], view: 27, label: '1000 TNT' },
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
    caption: '1 TNT vs 10 vs 100 vs 1000 💀', red: '1000', dropAt: 'boom4',
    startAt: 'tier1:-0.05', endAfter: 'settle:0.6',   // once the blast's debris settles (lib/settle.js, r:r24d99a)
    deathScreen: true,
    // the song drops out 0.35 s before the death so the 1000-TNT blast lands as a hit (pace: no sound hit on the payoff,
    // the bed covered it)
    sfx: [['dip', 'death', 0.35]],
    subs: TIERS.map((t, i) => [`tier${i + 1}`, t.label, i === 4 ? 3.5 : 2.6, 0]),
    speed
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    // a retry runs in the same world: build 600 blocks away from the last attempt's set (its
    // leftover piles and taper showed in the shots). Attempts are counted per world (run.sh makes a fresh one).
    const fs = require('fs'), path = require('path')
    const cf = path.join(__dirname, '..', 'work', 'tnt_1000.attempt.json')
    let mt = 0; try { mt = fs.statSync(path.join(__dirname, '..', 'work', 'server', 'world')).ino } catch (e) {}   // a fresh world each run.sh
    let n = 0; try { const c = JSON.parse(fs.readFileSync(cf, 'utf8')); if (c.mt === mt) n = c.n + 1 } catch (e) {}
    try { fs.writeFileSync(cf, JSON.stringify({ mt, n })) } catch (e) {}
    if (n > 0) {
      const p0 = bot.entity.position
      await ctx.cmd(`/tp @s ${Math.floor(p0.x) + 600 * n} 200 ${Math.floor(p0.z)}`)
      await bot.waitForTicks(40)
      await ctx.locateBiome(this.biome)
    }
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
    const floor = await plateau(ctx, { x0: x + XL, x1: x + XR, z0: z + ZB, z1: z + ZF, above: 30, below: 30, biome: 'minecraft:plains', pct: 0.995, taper: 0, trees: 10 })   // at ~the highest terrain: the surroundings drop away (at 0.85 the hills beside it showed as cut walls, then as stepped terraces)
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
    // a teleport that tolerates a nudge: flung TNT still going off knocked the bot after /tp and
    // tpCheck threw, the attempt failed, and the retry built its field beside the old one
    const tp = async (x, y, z, yawDeg, pitchDeg) => {
      for (let i = 0; i < 8; i++) {
        await ctx.cmd(`/tp @s ${x} ${y} ${z} ${yawDeg} ${pitchDeg}`)
        await bot.waitForTicks(8)
        const p = bot.entity.position
        if (Math.hypot(p.x - x, p.z - z) < 1.5 && Math.abs(p.y - y) < 2) return
      }
      ctx.log('teleport only roughly stuck', bot.entity.position)
    }
    // one tick of a smooth look toward (yaw, pitch); the caller loops it every tick
    const aimStep = async (gy, gp, f = 0.2) => {
      let dy = gy - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      await bot.look(bot.entity.yaw + dy * f, bot.entity.pitch + (gp - bot.entity.pitch) * f, true)
      await bot.waitForTicks(1)
    }
    // flint and steel on a TNT, aimed by construction (lib/act.js, r:rffba12): the crosshair on the block as it's lit
    const A = require('../lib/act')(ctx)
    // eased looks no faster than a hand on a mouse (rec_check whip: 522-737 deg/s at the hook's size-up, the finale's
    // spin and its glance back, r:r38374d): ctx.easeLook's ease-in-out peaks at twice the mean speed, so a turn of D deg
    // takes at least 2 * D / 200 s
    const capMs = (yaw, pitch, ms) => {
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      const deg = Math.hypot(dy * Math.cos(bot.entity.pitch), pitch - bot.entity.pitch) * 180 / Math.PI
      return Math.max(ms, Math.ceil(2000 * deg / 200 / 50) * 50)
    }
    const easeLook = (yaw, pitch, ms) => ctx.easeLook(yaw, pitch, capMs(yaw, pitch, ms))
    const easeLookAt = (p, ms) => {
      const e = bot.entity.position.offset(0, bot.controlState.sneak ? 1.27 : 1.62, 0), d = p.minus(e)
      return easeLook(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), ms)
    }
    const light = async (bx, by, bz) => {
      try { await A.use(new Vec3(bx, by, bz), { sound: 'item.flintandsteel.use' }) } catch (e) { ctx.log('light', e.message) }
      ctx.sound('entity.tnt.primed', 1)
    }
    for (let i = 0; i < this.tiers.length; i++) {
      const t = this.tiers[i], n = i + 1
      const mid = new Vec3(t.cx + 0.5, floor + 1 + t.h / 2, t.zf - t.d / 2 + 0.5)
      if (t.on) {
        // ---- the finale: on top of 1000 TNT ----
        ctx.mark(`cut${n}a`)
        await ctx.cmd('/difficulty normal')
        // stand at the east end facing west, down the field (the other way the cleared field's walls show)
        await tp(t.cx + 3.5, floor + t.h + 1, t.zf - 4.5, 90, 55)
        await ctx.cmd('/effect give @s instant_health 1 10 true')
        await bot.waitForTicks(4)
        ctx.mark(`cut${n}b`)
        ctx.mark(`tier${n}`)
        const W = Math.PI / 2
        // TNT under the feet... a look out west over the edge (how high; the craters far off), back down
        await easeLook(W + 0.35, -0.3, 550)
        await easeLook(W - 0.4, -0.45, 700)
        await easeLook(W - 0.05, -0.7, 500)
        await easeLook(W - 0.1, -1.15, 450)
        const bx = t.cx + 4, by = floor + t.h, bz = t.zf - 5                // the edge block right behind the feet
        await easeLookAt(new Vec3(bx + 0.5, by + 1, bz + 0.5), 350)
        await light(bx, by, bz)
        ctx.mark(`lit${n}`)
        const litAt = ctx.tick
        await easeLook(bot.entity.yaw + 0.2, -1.2, 350)
        ctx.mark(`fuse${n}a`)
        while (ctx.tick - litAt < 50) await bot.waitForTicks(1)          // skipped by the cut
        ctx.mark(`fuse${n}b`)
        // ~1.5 s left: eyes up and sprint west across the top... not fast enough (one ease at a time: the look up runs
        // while he sprints, the glance starts once it's done)
        bot.setControlState('sprint', true); bot.setControlState('forward', true)
        const up = easeLook(W + 0.1, -0.3, 400)
        // a glance back over the shoulder as it goes: the blast is on screen when it gets him. ~100 deg at a hand's speed
        // takes ~1 s, so it starts 20 ticks before the blast (a 153 deg turn in 0.35 s whipped at 737 deg/s)
        let glance = false
        for (let k = 0; k < 80 && !ctx.died; k++) {
          // (the glance looks down at the cube and the blast, not the horizon)
          if (!glance && ctx.tick - litAt >= 60) { glance = true; await up; bot.setControlState('forward', false); bot.setControlState('sprint', false); bot.setControlState('back', true); easeLook(W + Math.PI * 0.55, -0.75, 350) }
          await bot.waitForTicks(1)
        }
        bot.clearControlStates()
        ctx.mark('boom5')
        for (let k = 0; k < 40; k++) await bot.waitForTicks(1)          // the death screen
        return booms > 0 && ctx.died
      }
      if (i > 0) {   // cut to the next pile
        // ...once the last pile's flung dirt has landed (rec_check settle, r:r24d99a: tier 3's flew 2.8 s), eyes drifting
        for (let k = 0; k < 80 && ctx.tick - lastBoom < 60; k++) await aimStep(bot.entity.yaw + 0.03 * Math.sin(k / 7), bot.entity.pitch + 0.01 * Math.sin(k / 5), 0.3)
        ctx.mark(`cut${n}a`)
        await tp(t.cx + 0.5, floor + 1, t.zf + 2.5, 180, 15)
        await bot.waitForTicks(4)
        ctx.mark(`cut${n}b`)
      }
      ctx.mark(`tier${n}`)
      if (n === 1) {   // the hook: from the one block... to the 1000 cube down the field, and back
        const big = this.tiers[3]
        await easeLookAt(new Vec3(big.cx + 0.5, floor + 6, big.zf - 4), 650)
        await easeLook(bot.entity.yaw + 0.08, bot.entity.pitch + 0.05, 300)
      }
      // size it up (a big pile gets a look up its height), then light the front block
      if (t.h > 2) { await easeLook(-0.15, Math.min(1.15, Math.atan2(t.h - 0.6, 2.5)), 450); await easeLook(0.1, 0.15, 300) } else await easeLook(0.2, -0.25, 300)
      const target = new Vec3(t.cx, floor + 1, t.zf)
      await easeLookAt(target.offset(0.5, 0.5, 1), 250)
      await light(target.x, target.y, target.z)
      ctx.mark(`lit${n}`)
      await bot.waitForTicks(8)
      // cut to the vantage point with ~1.1 s of fuse left
      ctx.mark(`fuse${n}a`)
      const litAt = ctx.tick - 8
      await tp(t.cx + 0.5, floor + 1, t.zf + t.view + 0.5, 180, 0)
      await easeLookAt(mid.offset(0.8, -t.h * 0.15, 0), 50)
      while (ctx.tick - litAt < (n === 4 ? 52 : 58)) await bot.waitForTicks(1)
      ctx.mark(`fuse${n}b`)
      // nervous glances while it flashes, coming back to the pile
      const before = booms
      const y0 = bot.entity.yaw, p0 = bot.entity.pitch
      for (let k = 0; k < 60 && booms === before; k++) {
        const g = Math.floor(k / 8) % 4
        await aimStep(y0 + [0.3, -0.25, 0.15, -0.3][g], p0 + [0.12, 0.02, 0.18, 0.05][g])
      }
      ctx.mark(`boom${n}`)
      // watch the chain: the look rises with the blast (flung TNT), the bigger the higher
      const up = n === 4 ? 0.12 : Math.min(0.5, 0.12 + t.h * 0.045)   // the 1000 blast stays in frame
      // one camera owner, stepped every tick (two overlapping eases fought and snapped 32 deg in a tick)
      const yb = bot.entity.yaw
      let goal = [yb + 0.15, up]
      const cap = [20, 26, 28, 50][i]       // ticks of chain on screen at most (3 s+ read as a gap)
      for (let k = 0; k < cap && ctx.tick - lastBoom < 14; k++) {
        if (k === 22) goal = [yb - 0.15, n === 4 ? 0.05 : up * 0.6]
        if (k === 40 && n === 4) goal = [yb + 0.2, 0.0]
        await aimStep(goal[0], goal[1])
      }
      if (n === 4) {
        // let the 1000 blast's debris land on screen before the cut (r:r24d99a, lib/settle.js), the eyes still drifting
        const SETTLE = require('../lib/settle')
        for (let k = 0; k < 80 && (ctx.tick - lastBoom < 45 || SETTLE.liveBusy(Object.values(bot.entities), ctx.tick, lastBoom)); k++) {   // (flung dirt items fly ~1.4 s past the blast's 1 s)
          await aimStep(goal[0] + 0.1 * Math.sin(k / 8), goal[1] + 0.04 * Math.sin(k / 6))
        }
        // the big crater: cut to its rim (find where the ground stops along the line in)
        ctx.mark('rim4a')
        // the near edge along the line in: scan inward from the vantage point to the first air
        // (scanning outward from the pile found grass strips inside the blast zone), stand 3 back
        const solid = (zz) => { const bb = bot.blockAt(new Vec3(t.cx, floor, zz)); return bb && bb.name !== 'air' }
        let edge = t.zf + 2
        for (let zz = t.zf + t.view; zz >= t.zf; zz--) { if (!solid(zz)) { edge = zz; break } }
        let rz = edge + 2
        while (rz < t.zf + t.view && !(solid(rz) && solid(rz + 1))) rz++
        await tp(t.cx + 0.5, floor + 1, rz + 0.5, 180, 45)
        await bot.waitForTicks(2)
        ctx.mark('rim4b')
        ctx.mark(`crater${n}`)
        // sweep across the middle of the crater and down into it
        const mid4 = new Vec3(t.cx + 0.5, floor - 10, t.zf - 2.5)
        await easeLookAt(mid4.offset(6, 0, 0), 500)
        await easeLookAt(mid4.offset(-6, 0, 0), 900)
        await easeLookAt(mid4.offset(0, -4, 3), 900)
      } else {
        // walk up to the crater, looking into it
        // eyes on the crater the whole way (walking while looking at plain grass read as a frozen frame)
        const hole = new Vec3(t.cx + 0.5, floor - 3, t.zf - t.d / 2 + 0.5)
        await easeLookAt(hole, 300)
        bot.setControlState('forward', true)
        for (let k = 0; k < 30; k++) {
          const e = bot.entity.position.offset(0, 1.62, 0), d = hole.offset(Math.sin(k / 5) * 0.8, 0, 0).minus(e)
          await aimStep(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), 0.3)
          const p = bot.entity.position
          const ahead = bot.blockAt(new Vec3(Math.floor(p.x), floor, Math.floor(p.z - 1)))   // right up to the edge
          if (!ahead || ahead.name === 'air' || p.z < t.zf + 2) break
        }
        bot.setControlState('forward', false)
        ctx.mark(`crater${n}`)
        // into the hole from the rim, staying on it
        await easeLookAt(hole.offset(1.2, -1, 0), 500)
        await easeLookAt(hole.offset(-1.2, -1, -0.5), 600)
      }
    }
    return false
  }
}
