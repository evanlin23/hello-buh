// "it took me 4 tries 💀" - a longer story Short (25-40 s, like the channel's best, re:zero):
// the water clutch fails (forgot to place, placed too late), the bot instantly respawns on the
// pillar (doImmediateRespawn, the "instant respawn" gag) and goes again until it lands.
// Green narration subtitles carry the story.
const clutch = require('./water_clutch')
const MODES = (process.env.TRIES_MODES || 'skip,late,late,ok').split(',')

module.exports = {
  ...clutch,
  name: 'tries',
  caption: `it took me ${MODES.length} tries 💀`,
  edit: {
    caption: `it took me ${MODES.length} tries 💀`, song: 'songs/misery.mp3', dropAt: 'landed', start: 1.2,
    subs: [['attempt', 'easy', 1.5, 0], ['death', 'wait where was the bucket', 1.8, 0], ['attempt', 'ok for real this time', 1.8, 1],
      ['death', 'bro.', 1.5, 1], ['attempt', "let's do it again", 1.6, 2], ['death', 'ONE more', 1.4, 2],
      ['attempt', 'locked in.', 1.6, 3], ['landed', 'oh wow that was very close', 2.2, 0]]
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
    for (let i = 0; i < MODES.length; i++) {
      this.mode = MODES[i]; this.fast = i > 0
      ctx.mark('attempt', { n: i + 1, mode: this.mode })
      ctx.log('attempt', i + 1, this.mode)
      const deathsBefore = ctx.deaths
      let ok = false
      try { ok = await clutch.perform.call(this, ctx) } catch (e) { ctx.log('attempt error', e.message) }
      ctx.log('perform returned at tick', ctx.tick, 'died', ctx.died, 'pitch', bot.entity.pitch.toFixed(2))
      if (this.mode === 'ok') { if (ok) ctx.mark('landed'); return ok && ctx.deaths === MODES.length - 1 }
      // wait for the death and the instant respawn back on the pillar
      for (let k = 0; k < 100 && ctx.deaths === deathsBefore; k++) await bot.waitForTicks(1)
      for (let k = 0; k < 60 && bot.entity.position.y < this.top - 0.5; k++) await bot.waitForTicks(1)
      ctx.revive()
      ctx.log('revived at tick', ctx.tick, 'pos', bot.entity.position.toString())
      await bot.look(0, -0.7, true)                     // straight back to staring over the edge
      bot.chat('/item replace entity @s hotbar.1 with water_bucket')
      bot.setQuickBarSlot(1)
      await bot.waitForTicks(2)
    }
    return false
  }
}
