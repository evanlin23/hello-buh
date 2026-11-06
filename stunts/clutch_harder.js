// "clutches, but each one is harder 😳": five clutches in one Short, each harder, then a joke.
//   1. water bucket clutch, 50 blocks
//   2. the same, from 90 blocks, on HALF A HEART (the HUD shows it)
//   3. ender pearl over a lava lake, 30-block tower
//   4. ender pearl over a lava lake, 70-block tower
//   5. a confident water clutch... it's a lava bucket 💀 (real death; 21 blocks so the lava kills,
//      not the fall)
// Every clutch reuses the stunt that already passes on its own (water_clutch, pearl_clutch,
// wrong_bucket), each on its own set, side by side. Between clutches: a teleport cut (edit.speed),
// so there is no wait on screen. Owner rules: 30 s minimum from more beats, no dead space, end
// right after the payoff (a death message gets reading time).
const water = require('./water_clutch')
const pearl = require('./pearl_clutch')
const wrong = require('./wrong_bucket')

const GAP = 48
const TIERS = [
  { mod: water, opts: { height: 50, fast: true }, label: '50 blocks', end: 'placed', hotbar: 'water' },
  { mod: water, opts: { height: 90, fast: true }, label: '90 blocks... HALF A HEART', end: 'placed', hotbar: 'water', halfHeart: true },
  { mod: pearl, opts: { tower: 30 }, label: 'ender pearl over lava', end: 'teleported', hotbar: 'pearl' },
  { mod: pearl, opts: { tower: 70 }, label: '70 blocks over lava', end: 'teleported', hotbar: 'pearl' },
  { mod: wrong, opts: { height: 21, fast: true }, label: 'easy one to finish', end: null, hotbar: 'lava' }
]
const HOTBARS = {
  water: ['diamond_sword', 'water_bucket', ['cobblestone', 64], ['bread', 16]],
  lava: ['diamond_sword', 'lava_bucket', ['cobblestone', 64], ['bread', 16]],
  pearl: [['ender_pearl', 16], 'diamond_sword', ['cobblestone', 64], ['bread', 12]]
}
const KEEP = new Set(['death', 'death_screen', 'respawn', 'hotbar', 'slot', 'sound', 'particles', 'face_on', 'face_off'])
const START = { water: 'jump', pearl: 'fall' }

const n = TIERS.length
module.exports = {
  name: 'clutch_harder',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'clutches, but each one is harder 😳',
  expectDeath: true,
  edit: {
    caption: 'clutches, but each one is harder 😳', red: 'harder',
    song: 'songs/misery.mp3', dropAt: 'placed5',
    startAt: 'look1:-0.1', endAfter: 'death:1.6',
    onFire: 'placed5:death', deathScreen: true,
    subs: TIERS.map((t, i) => [`look${i + 1}`, t.label, 2.4, 0]),
    speed: TIERS.slice(1).map((_, i) => [`cut${i + 1}a`, `cut${i + 1}b`, 'cut'])
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    this.states = []
    // build every set, each with its own module state; remember where each one starts the bot
    const origTp = ctx.tpCheck
    for (let i = 0; i < n; i++) {
      const t = TIERS[i]
      await ctx.cmd(`/tp @s ${g.x + i * GAP + 0.5} ${g.y + 40} ${g.z + 0.5}`)
      await bot.waitForTicks(30)
      const st = Object.assign(Object.create(t.mod), t.opts)
      let start = null
      ctx.tpCheck = async (...a) => { start = a; return origTp(...a) }
      try { await t.mod.setup.call(st, ctx) } finally { ctx.tpCheck = origTp }
      st.start = start
      this.states.push(st)
    }
    await ctx.cmd('/gamerule natural_health_regeneration false')   // the half heart has to stay half
    // stand over the middle set while the recording starts: it keeps the chunks the bot has loaded
    await ctx.cmd(`/tp @s ${g.x + 2 * GAP + 0.5} ${g.y + 40} ${g.z + 0.5}`)
    await bot.waitForTicks(40)
    await this.goTo(ctx, 0)
    return { x: g.x + 2 * GAP, y: g.y, z: g.z }
  },

  async goTo (ctx, i) {
    const t = TIERS[i]
    await ctx.cmd('/gamemode creative')
    await ctx.hotbar(HOTBARS[t.hotbar])
    await ctx.tpCheck(...this.states[i].start)
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    if (t.halfHeart) await ctx.cmd('/damage @s 19 minecraft:generic')
    ctx.select(t.hotbar === 'pearl' ? 0 : 0)
    await ctx.bot.waitForTicks(6)
  },

  async perform (ctx) {
    const { bot } = ctx
    const origMark = ctx.mark
    let ok = true
    for (let i = 0; i < n && ok; i++) {
      const t = TIERS[i], k = i + 1
      if (i > 0) {   // teleport cut: next set, its hotbar and health
        if (!this.cutMarked) origMark(`cut${i}a`)
        await this.goTo(ctx, i)
        origMark(`cut${i}b`)
      }
      origMark(`look${k}`)
      // the clutch's own marks get the tier number (jump3, placed3, teleported4...). ~1.4 s after the
      // beat's payoff the cut starts: the clutch's slow outro (scoop, look back, hold) and the
      // teleport to the next set are cut out by edit.speed
      this.cutMarked = false
      let countdown = null
      ctx.mark = (ev, extra) => {
        origMark(KEEP.has(ev) ? ev : `${ev}${k}`, extra)
        if (t.end && ev === t.end && countdown === null && i < n - 1) countdown = 28
      }
      const tick = () => { if (countdown !== null && --countdown === 0) { origMark(`cut${k}a`); this.cutMarked = true } }
      bot.on('physicsTick', tick)
      let res
      try { res = await t.mod.perform.call(this.states[i], ctx) } finally { ctx.mark = origMark; bot.removeListener('physicsTick', tick) }
      ok = t.end ? (!ctx.died && res !== false) : ctx.died
      if (!ok) ctx.log(`tier ${k} failed (result ${res}, died ${ctx.died})`)
    }
    return ok
  }
}
