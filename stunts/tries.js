// "it took me 4 tries 💀" - a longer story Short (25-40 s, like the channel's best, re:zero):
// the water clutch fails (forgot to place, placed too late), the bot instantly respawns on the
// pillar (doImmediateRespawn, the "instant respawn" gag) and goes again until it lands.
// Green narration subtitles carry the story.
const clutch = require('./water_clutch')
const MODES = (process.env.TRIES_MODES || 'skip,late,skip,late,late,lava,late,ok').split(',')   // 8 tries: ~33 s (7 ran 29.4 s; owner: 30 s minimum)

// the narration escalates with the frustration; the counter shows on screen; the last line is always 'locked in.'
const DEATH_LINES = ['wait where was the bucket', 'bro.', 'IT WAS EMPTY', 'that one was lag', 'WRONG BUCKET', 'that was LAVA', 'I am going to lose it']
const TRY_LINES = ['easy', 'for real this time', '', 'focus.', '', 'I swear', 'one more.']
function subs () {
  const n = MODES.length, out = [['jump', `try 1/${n}: ${TRY_LINES[0]}`, 1.0, 0]]
  for (let i = 1; i < n; i++) {
    out.push(['death', DEATH_LINES[Math.min(i - 1, DEATH_LINES.length - 1)], 1.5, i - 1])
    const t = i === n - 1 ? 'locked in.' : TRY_LINES[i] || ''
    out.push(['attempt', `try ${i + 1}/${n}${t ? ': ' + t : ''}`, 1.5, i])
  }
  out.push(['saved', 'oh wow that was very close', 0.8, 0])
  return out
}

module.exports = {
  ...clutch,
  name: 'tries',
  caption: `it took me ${MODES.length} tries 💀`,
  edit: {
    caption: `it took me ${MODES.length} tries 💀`, song: 'songs/ncs/industry_kiss.mp3', dropAt: 'saved', startAt: 'jump:-1.0', endAfter: 'saved:0.6',   // (0.8 ended on the cleared pad's dirt wall)
    // the lava try: the lava is placed 1 tick before the fatal landing, so it showed for 3 frames. Slow the moment
    // (0.15 s of footage over ~0.75 s) so it reads. Offsets from 'saved' (the only unique mark after it; no speed
    // spans before it, so the recording's spacing holds)
    speed: [['saved:-7.85', 'saved:-7.70', 0.2]],   // 'saved', not 'placed': the lava try places too
    // the narration escalates with the frustration (7 tries; the last attempt line is always 'locked in.')
    // each try looks different (review: six identical falls read as a loop) and the counter shows on screen
    subs: subs()
  },

  async setup (ctx) {
    const set = await clutch.setup.call(this, ctx)
    const top = set.y + Number(process.env.FALL_HEIGHT || 60) + 1
    await ctx.cmd(`/spawnpoint @s ${set.x} ${top} ${set.z}`)
    await ctx.cmd('/gamerule immediate_respawn true')
    ctx.immediateRespawn = true
    await ctx.cmd('/gamerule keep_inventory true')
    this.top = top
    return set
  },

  async perform (ctx) {
    const { bot } = ctx
    // on the respawn teleport, take the over-the-edge look in the same tick: a look set a tick later
    // showed the respawn pose (sky) and a 2-3 frame swing down after every cut
    let respawning = false
    bot.on('forcedMove', () => { if (respawning) bot.look(0, -0.7, true) })
    for (let i = 0; i < MODES.length; i++) {
      // 'lava': a lava bucket in the slot, placed like the water (the clutch's ok mode): the fall is saved and it burns
      this.mode = MODES[i] === 'lava' ? 'ok' : MODES[i]; this.fast = i > 0
      ctx.mark('attempt', { n: i + 1, mode: this.mode })
      ctx.log('attempt', i + 1, this.mode)
      const deathsBefore = ctx.deaths
      let ok = false
      // try 5 has a milk bucket: it drinks it on the way down (the gag has to show, not just be said)
      let drink = null
      if (i === 4) {
        let drank = false
        drink = () => { const p = bot.entity.position; if (!drank && bot.entity.velocity.y < -0.3 && p.y < this.top - 4) { drank = true; ctx.sound('entity.generic.drink', 1); process.nextTick(() => bot.activateItem()) } }
        bot.on('physicsTick', drink)
      }
      // the last try's placement is the payoff: mark it 'saved' (the lava try's 'placed' ended the video early)
      const mark0 = ctx.mark
      if (MODES[i] === 'ok') ctx.mark = (e, d) => { mark0(e, d); if (e === 'placed') mark0('saved') }
      // the clutch runs on a guarded bot: once it dies, its looks stop and the respawn goes on without it (the
      // lava try burned to death during the clutch's 1.5 s look up the pillar, and the bot stood respawned
      // on the pillar staring at the sky for 1.7 s until the clutch returned)
      let aborted = false, settled = false
      const gbot = new Proxy(bot, { get (t, k) { if (aborted && (k === 'look' || k === 'activateItem' || k === 'setControlState')) return () => Promise.resolve(); const v = t[k]; return typeof v === 'function' ? v.bind(t) : v } })
      const gctx = Object.create(ctx)
      gctx.bot = gbot
      if (MODES[i] === 'lava') {   // the clutch's water splash (particles, sound) fired on the lava landing
        gctx.particles = (type, ...a) => type === 'splash' ? undefined : ctx.particles(type, ...a)
        gctx.sound = (name, ...a) => /splash/.test(name) ? undefined : ctx.sound(name, ...a)
      }
      gctx.easeLook = async (yaw, pitch, ms) => {
        const y0 = bot.entity.yaw, p0 = bot.entity.pitch, steps = Math.max(1, Math.round(ms / 50))
        let dy = yaw - y0; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        for (let j = 1; j <= steps && !aborted; j++) {
          const t = j / steps, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
          await gbot.look(y0 + dy * e, p0 + (pitch - p0) * e, true); await bot.waitForTicks(1)
        }
      }
      gctx.easeLookAt = async (q, ms) => { const d = q.minus(bot.entity.position.offset(0, 1.62, 0)); await gctx.easeLook(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), ms) }
      const run = clutch.perform.call(this, gctx).catch(e => { ctx.log('attempt error', e.message); return false }).finally(() => { settled = true })
      while (!settled && ctx.deaths === deathsBefore) await bot.waitForTicks(1)
      if (settled) ok = await run; else { aborted = true; bot.clearControlStates(); ctx.log('died mid-clutch: clutch aborted') }
      ctx.mark = mark0
      if (drink) bot.removeListener('physicsTick', drink)
      ctx.log('perform returned at tick', ctx.tick, 'died', ctx.died, 'pitch', bot.entity.pitch.toFixed(2))
      if (MODES[i] === 'ok') { if (ok) ctx.mark('landed'); return ok && ctx.deaths === MODES.length - 1 }
      // wait for the death and the instant respawn back on the pillar
      for (let k = 0; k < 100 && ctx.deaths === deathsBefore; k++) await bot.waitForTicks(1)
      // the next try's bucket goes in at the death, before the respawn cut (it used to swap in the hand on
      // camera): an empty bucket for try 3, a milk bucket for try 5, water otherwise
      bot.chat(`/item replace entity @s hotbar.1 with ${{ 2: 'bucket', 4: 'milk_bucket', 5: 'lava_bucket' }[i + 1] || 'water_bucket'}`)
      // the lava pool goes with the death (behind the respawn cut), so the next try doesn't land in it
      // (+-5 missed it: the bot lands ~7 out, and tries 7 and 8 landed in the leftover pool)
      if (MODES[i] === 'lava') bot.chat(`/fill ${this.x - 12} ${this.floor} ${this.z - 12} ${this.x + 12} ${this.floor + 2} ${this.z + 12} air replace lava`)
      respawning = true
      for (let k = 0; k < 60 && bot.entity.position.y < this.top - 0.5; k++) await bot.waitForTicks(1)
      respawning = false
      ctx.revive()
      ctx.log('revived at tick', ctx.tick, 'pos', bot.entity.position.toString())
      await bot.look(0, -0.7, true)                     // straight back to staring over the edge
      bot.setQuickBarSlot(1)
      // a beat on the pillar for the death line to land (the next try's line cut it to 0.15 s)
      await ctx.easeLook(0.25, -0.95, 400)              // (600 + 500 read as ~1.1 s of dead air per respawn)
      await ctx.easeLook(0, -1.3, 450)   // nearly straight down already: the clutch's 250 ms ease from -0.7 to -1.45 was a 1-2 frame snap every try
    }
    return false
  }
}
