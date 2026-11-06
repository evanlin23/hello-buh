// "POV: you grabbed the wrong bucket 💀" - the water-bucket clutch, but it's a lava bucket.
// Same pillar and timing as water_clutch; the bot "places water" and lands in lava. Real death.
// The edit adds the burning overlay and the vanilla death screen at the recorded death.
const clutch = require('./water_clutch')

module.exports = {
  ...clutch,
  name: 'wrong_bucket',
  caption: 'POV: you grabbed the wrong bucket 💀',
  edit: { caption: 'POV: you grabbed the wrong bucket 💀', red: 'wrong', song: 'songs/funk_abnormal.mp3', dropAt: 'death', onFire: 'placed:death', deathScreen: true , startAt: 'jump:-1.0', endAfter: 'death:1.8'},
  expectDeath: true,

  async setup (ctx) {
    const set = await clutch.setup.call(this, ctx)
    // swap the water bucket for lava (same slot, the HUD shows it)
    await ctx.cmd('/gamemode creative')
    await ctx.cmd('/item replace entity @s hotbar.1 with lava_bucket')
    await ctx.cmd('/gamemode survival')
    await ctx.bot.waitForTicks(10)
    return set
  },

  async perform (ctx) {
    const { bot } = ctx
    // run the clutch; it returns once landed. Then stand in the lava until it's over.
    const origSound = ctx.sound
    ctx.sound = (s, v, p) => origSound(s === 'item.bucket.empty' ? 'item.bucket.empty_lava' : s === 'entity.player.splash.high_speed' ? 'block.lava.extinguish' : s, v, p)
    const origParticles = ctx.particles
    ctx.particles = () => {}                                   // no water splash in lava
    try { await clutch.perform.call(this, ctx) } catch (e) { ctx.log('clutch part', e.message) }
    ctx.sound = origSound; ctx.particles = origParticles
    for (let i = 0; i < 100 && !ctx.died; i++) {
      if (i % 10 === 0) ctx.sound('entity.player.hurt_on_fire', 1)
      await bot.waitForTicks(1)
    }
    ctx.mark('death_screen')
    await bot.waitForTicks(40)                                  // hold on the death screen
    return ctx.died
  }
}
