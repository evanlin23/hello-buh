// "clutches, but each one is harder 😳": seven clutches in one Short, each harder, then a joke.
//   water 40, water 70, water 90 on HALF A HEART, pearl over lava (30), pearl 70 AT NIGHT, pearl 70 at
//   night in a THUNDERSTORM, then back in daylight a confident water clutch... it's a lava bucket 💀
//   (real death; 21 blocks so the lava kills, not the fall). First cut was 22.4 s with no dead
//   space: the fix was more beats, not slower ones.
// Every clutch reuses the stunt that already passes on its own (water_clutch, pearl_clutch,
// wrong_bucket), each on its own set, side by side. Between clutches: a teleport cut (edit.speed),
// so there is no wait on screen. Owner rules: 30 s minimum from more beats, no dead space, end
// right after the payoff (a death message gets reading time).
const water = require('./water_clutch')
const pearl = require('./pearl_clutch')
const wrong = require('./wrong_bucket')

const GAP = 40
const TIERS = [
  { mod: water, opts: { height: 40, fast: true }, label: '40 BLOCKS', end: 'placed', hotbar: 'water' },
  { mod: water, opts: { height: 70, fast: true }, label: '70 BLOCKS', end: 'placed', hotbar: 'water' },
  { mod: water, opts: { height: 90, fast: true }, label: 'HALF A HEART', end: 'placed', hotbar: 'water', halfHeart: true },
  { mod: pearl, opts: { tower: 30, fast: true }, label: 'PEARL OVER LAVA', end: 'teleported', hotbar: 'pearl' },
  { mod: pearl, opts: { tower: 70, fast: true, openPitch: -0.85 }, label: 'AT NIGHT', end: 'teleported', hotbar: 'pearl', time: 18000 },
  { mod: pearl, opts: { tower: 100, fast: true, openPitch: -0.85 }, label: '100 BLOCKS + STORM', end: 'teleported', hotbar: 'pearl', time: 18000, weather: 'thunder' },
  { mod: wrong, opts: { height: 21, fast: true }, label: 'EASY ONE', end: null, hotbar: 'lava', time: 6000, weather: 'clear' }
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
  recordRadius: 224,   // 7 sets over 240 blocks: the ends need terrain out to the fog
  chunkStops: set => [{ x: set.x - 3 * GAP, z: set.z }, { x: set.x + 3 * GAP, z: set.z }],   // the first and last sets (the last rendered over the void)
  edit: {
    caption: 'clutches, but each one is harder 😳', red: 'harder',
    song: 'songs/misery.mp3', dropAt: `placed${TIERS.length}`,
    startAt: 'look1:0.3', endAfter: 'death:1.6',   // startAt: the first 0.37 s were a frozen frame
    onFire: `placed${TIERS.length}:death`, deathScreen: true,
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
      await ctx.cmd('/gamemode creative')   // the previous set's setup ended in survival: a mid-air tp would kill
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
    await ctx.cmd('/gamemode creative')
    // stand over the middle set while the recording starts: it keeps the chunks the bot has loaded
    await ctx.cmd(`/tp @s ${g.x + Math.floor(n / 2) * GAP + 0.5} ${g.y + 40} ${g.z + 0.5}`)
    await bot.waitForTicks(40)
    await this.goTo(ctx, 0)
    return { x: g.x + Math.floor(n / 2) * GAP, y: g.y, z: g.z }
  },

  async goTo (ctx, i) {
    const t = TIERS[i]
    await ctx.cmd('/gamemode creative')
    if (t.time !== undefined && t.time !== ctx.dayTime) await ctx.setTime(t.time)
    // rain fades 0.01 a tick like the client: wait it out inside the cut, or the 'daylight' tier was
    // still pouring and the storm tier only half there (review)
    if (t.weather && t.weather !== (ctx.weather || 'clear')) { await ctx.setWeather(t.weather); await ctx.bot.waitForTicks(105) }
    await ctx.hotbar(HOTBARS[t.hotbar])
    // pearl tiers open looking down at the lava, not across a dark sky (night/storm openings were 1 s of black)
    const st = this.states[i].start.slice()
    if (t.hotbar === 'pearl') st[4] = 40
    await ctx.tpCheck(...st)
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
      if (t.weather === 'thunder') ctx.sound('entity.lightning_bolt.thunder', 1, 0.9)   // the storm has to sound like one
      // the clutch's own marks get the tier number (jump3, placed3, teleported4...). ~1.4 s after the
      // beat's payoff the cut starts: the clutch's slow outro (scoop, look back, hold) and the
      // teleport to the next set are cut out by edit.speed
      this.cutMarked = false
      let countdown = null
      ctx.mark = (ev, extra) => {
        origMark(KEEP.has(ev) ? ev : `${ev}${k}`, extra)
        if (t.end && ev === t.end && countdown === null && i < n - 1) countdown = t.time === 18000 ? 12 : 28   // at night the look back is 1.4 s of black (review)
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
