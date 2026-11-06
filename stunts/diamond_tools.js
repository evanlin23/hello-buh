// "every tool vs one diamond ore 💀" (docs/ideas.md #9, ~20 s): a stone wall with one diamond ore
// per section; the bot tries every tool on it, with real survival digging (the crack overlay shows
// the speed): fist, shovel and hoe barely scratch it (15 s each, it gives up), the golden pickaxe
// breaks it fast but drops NOTHING, iron and diamond drop the diamond, netherite + efficiency V
// instamines it, and the finale: a raw cod (a vanilla `tool` component, set by command like any
// enchant) instamines a whole 5x5 wall of diamond ore in one sweep.
const fs = require('fs')
const path = require('path')

const COD = 'cod[tool={rules:[{blocks:"minecraft:diamond_ore",speed:1000,correct_for_drops:true}]},enchantment_glint_override=true]'
const TOOLS = [
  { item: null, label: 'fist', slow: true },
  { item: 'wooden_hoe', label: 'a hoe', slow: true },
  { item: 'golden_pickaxe', label: 'gold pickaxe' },
  { item: 'iron_pickaxe', label: 'iron pickaxe' },
  { item: 'diamond_pickaxe', label: 'diamond pickaxe' },
  { item: 'netherite_pickaxe[enchantments={efficiency:5}]', label: 'netherite + eff V' },
  { item: COD, label: 'a fish', wall: true }
]
const RATING = ['0/10 (no diamond)', '0/10 (no diamond)', '1/10 (no diamond)', '6/10', '8/10', '10/10', '11/10']
const SPACING = 3

function subs () {
  const out = []
  let mined = []
  try {
    const rec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'work', 'diamond_tools.rec.json'), 'utf8'))
    mined = rec.timeline.filter(e => e.event === 'result')
  } catch (e) {}
  TOOLS.forEach((t, i) => {
    const m = mined.find(e => e.n === i)
    let text = `${t.label}: ${RATING[i]}`
    if (m && m.secs && !t.wall) text = `${t.label}: ${m.secs}s, ${RATING[i]}`
    if (t.slow) out.push(['beat', `${t.label}... (10x speed)`, 9, i])
    out.push(['result', text, 9, i])
  })
  return out
}

module.exports = {
  name: 'diamond_tools',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'every tool vs one diamond ore 💀',
  get edit () {
    // the hopeless digs (15 s each, real) play at 10x
    const speed = TOOLS.map((t, i) => t.slow ? [`slow${i}_a`, `slow${i}_b`, 10] : null).filter(Boolean)
    return { caption: 'every tool vs one diamond ore 💀', red: 'every', song: 'songs/funk_abnormal.mp3', dropAt: 'fish', startAt: 'beat:-0.1', endAfter: 'wall_done:1.0', subs: subs(), speed }
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    Object.assign(this, { x, z, floor })
    await ctx.defaultRules()
    const W = SPACING * TOOLS.length + 14
    await ctx.cmd(`/fill ${x - 10} ${floor + 1} ${z - 14} ${x + W} ${floor + 12} ${z + 8} air`)
    await ctx.cmd(`/fill ${x - 10} ${floor} ${z - 14} ${x + W} ${floor} ${z + 8} grass_block`)
    await ctx.cmd(`/fill ${x - 10} ${floor - 3} ${z - 14} ${x + W} ${floor - 1} ${z + 8} dirt`)
    // the wall, 3 high, 2 thick; one diamond ore at eye level per section
    this.wz = z - 3
    this.x0 = x
    await ctx.cmd(`/fill ${x - 2} ${floor + 1} ${this.wz - 1} ${x + W - 4} ${floor + 3} ${this.wz} stone`)
    this.ore = (i) => ({ x: this.x0 + i * SPACING, y: floor + 2, z: this.wz })
    for (let i = 0; i < TOOLS.length - 1; i++) { const o = this.ore(i); await ctx.cmd(`/setblock ${o.x} ${o.y} ${o.z} diamond_ore`) }
    // the finale: a 5x5 wall of diamond ore on its own, in front of the last stop
    const f = this.ore(TOOLS.length - 1)
    this.fx = f.x + 3
    await ctx.cmd(`/fill ${this.fx - 2} ${floor + 1} ${this.wz - 1} ${this.fx + 2} ${floor + 5} ${this.wz} diamond_ore`)
    await ctx.cmd(`/fill ${this.fx - 2} ${floor + 1} ${this.wz - 2} ${this.fx + 2} ${floor + 5} ${this.wz - 2} stone`)
    await ctx.hotbar(TOOLS.map(t => t.item))
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
    this.stand = (i) => ({ x: this.x0 + i * SPACING + 0.5, z: this.wz + 3.2 })
    const s = this.stand(0)
    await ctx.tpCheck(s.x, floor + 1, s.z, 180, 5)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x: x + 10, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { floor } = this
    let digTicks = 0
    bot.on('physicsTick', () => { if (bot.targetDigBlock) { if (digTicks++ % 4 === 0) ctx.sound('block.stone.hit', 0.25, 0.5) } else digTicks = 0 })
    bot.on('playerCollect', (c) => { if (c === bot.entity) ctx.sound('entity.item.pickup', 0.2, 1.4 + Math.random() * 0.6) })
    const strafeTo = async (tx) => {
      for (let k = 0; k < 40 && Math.abs(bot.entity.position.x - tx) > 0.15; k++) {
        bot.setControlState('right', bot.entity.position.x < tx - 0.15)
        bot.setControlState('left', bot.entity.position.x > tx + 0.15)
        await bot.waitForTicks(1)
      }
      bot.setControlState('right', false); bot.setControlState('left', false)
    }
    const dig = (p) => bot._client.write('block_dig', { status: 0, location: p, face: 3, sequence: 0 })
    await bot.look(0, -0.1, true)
    for (let i = 0; i < TOOLS.length; i++) {
      const t = TOOLS[i]
      ctx.select(i)
      if (i > 0) {
        ctx.easeLook(0, -0.1, 250)
        await strafeTo(this.stand(i).x)
      }
      const o = this.ore(i), p = new Vec3(o.x, o.y, o.z)
      if (t.wall) {
        // the fish: sweep across the 5x5 wall, one block per tick, row by row
        await strafeTo(this.fx + 0.5)
        await bot.waitForTicks(2)
        ctx.mark('beat', { n: i }); ctx.mark('fish')
        const t0 = ctx.tick
        for (const [r, dir] of [[5, 1], [4, -1], [3, 1], [2, -1], [1, 1]]) {
          for (let c = 0; c < 5; c++) {
            const q = new Vec3(this.fx - 2 + (dir > 0 ? c : 4 - c), floor + r, this.wz)
            const eye = bot.entity.position.offset(0, 1.62, 0), d = q.offset(0.5, 0.5, 0.5).minus(eye)
            await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
            dig(q); bot.swingArm()
            ctx.sound('block.stone.break', 1, 0.8); ctx.particles('block', q, { block: 'diamond_ore' })
            await bot.waitForTicks(1)
          }
        }
        ctx.mark('result', { n: i, secs: ((ctx.tick - t0) / 20).toFixed(1) })
        // look at the diamonds pouring out, then through the hole
        await ctx.easeLook(0.15, -0.35, 500)
        ctx.mark('wall_done')
        await ctx.easeLook(-0.15, -0.15, 900)
        break
      }
      await ctx.easeLookAt(p.offset(0.5, 0.5, 0.5), i === 0 ? 50 : 200)
      ctx.mark('beat', { n: i })
      const t0 = ctx.tick
      let digging = true
      if (t.slow) {
        ctx.mark(`slow${i}_a`)
        // a slow sway while the hopeless dig runs (at 10x it reads as fidgeting, never a still shot)
        const y0 = bot.entity.yaw, p0 = bot.entity.pitch
        ;(async () => { for (let k = 0; digging; k++) { await bot.look(y0 + 0.07 * Math.sin(k / 9), p0 + 0.04 * Math.sin(k / 13), true); await bot.waitForTicks(1) } })()
      }
      try { await bot.dig(bot.blockAt(p), 'ignore') } catch (e) { ctx.log('dig', e.message) }
      digging = false
      if (t.slow) ctx.mark(`slow${i}_b`)
      ctx.sound('block.stone.break', 1, 0.8); ctx.particles('block', p, { block: 'diamond_ore' })
      const secs = ((ctx.tick - t0) / 20).toFixed(2)
      ctx.mark('result', { n: i, secs })
      ctx.log(t.label, 'mined in', secs)
      // look down at what dropped (nothing, for gold)
      await ctx.easeLook(0, -0.55, 300)
      await bot.waitForTicks(6)
      await ctx.easeLook(0, -0.15, 200)
    }
    await bot.waitForTicks(10)
    const left = []
    for (let r = 1; r <= 5; r++) for (let c = -2; c <= 2; c++) { const b = bot.blockAt(new Vec3(this.fx + c, floor + r, this.wz)); if (b && b.name !== 'air') left.push(b.name) }
    ctx.log('wall left', left.length)
    return left.length === 0 && !ctx.died
  }
}
