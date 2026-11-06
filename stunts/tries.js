// "it took me 4 tries 💀" - a longer story Short (25-40 s, like the channel's best, re:zero):
// the water clutch fails (forgot to place, placed too late), the bot instantly respawns on the
// pillar (doImmediateRespawn, the "instant respawn" gag) and goes again until it lands.
// Green narration subtitles carry the story.
const clutch = require('./water_clutch')
const MODES = (process.env.TRIES_MODES || 'skip,late,skip,late,late,skip,ok').split(',')   // 7 tries: ~30 s (owner: 30 s minimum)

module.exports = {
  ...clutch,
  name: 'tries',
  caption: `it took me ${MODES.length} tries 💀`,
  edit: {
    caption: `it took me ${MODES.length} tries 💀`, song: 'songs/misery.mp3', dropAt: 'landed', startAt: 'jump:-1.0', endAfter: 'landed:1.0',
    // the narration escalates with the frustration (7 tries; the last attempt line is always 'locked in.')
    subs: [['jump', 'easy', 1.0, 0],
      ['death', 'wait where was the bucket', 1.8, 0], ['attempt', 'ok for real this time', 1.8, 1],
      ['death', 'bro.', 1.5, 1], ['attempt', "let's do it again", 1.6, 2],
      ['death', 'I FORGOT AGAIN', 1.5, 2], ['attempt', 'focus.', 1.4, 3],
      ['death', 'that one was lag', 1.5, 3], ['attempt', 'ONE more', 1.4, 4],
      ['death', 'why is this so hard', 1.5, 4], ['attempt', 'I swear', 1.4, 5],
      ['death', '...', 1.2, 5], ['attempt', 'locked in.', 1.6, 6],
      ['landed', 'oh wow that was very close', 1.0, 0]]
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
      respawning = true
      for (let k = 0; k < 60 && bot.entity.position.y < this.top - 0.5; k++) await bot.waitForTicks(1)
      respawning = false
      ctx.revive()
      ctx.log('revived at tick', ctx.tick, 'pos', bot.entity.position.toString())
      await bot.look(0, -0.7, true)                     // straight back to staring over the edge
      bot.chat('/item replace entity @s hotbar.1 with water_bucket')
      bot.setQuickBarSlot(1)
      // a beat on the pillar for the death line to land (the next try's line cut it to 0.15 s)
      await ctx.easeLook(0.25, -0.95, 600)
      await ctx.easeLook(-0.1, -0.7, 500)
    }
    return false
  }
}
