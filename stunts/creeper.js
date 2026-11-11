// "POV: you hear tssss 💀": the bot is building a little wall, back turned. A creeper walks up
// behind it (a real mob with its own AI, difficulty normal); when it gets close the hiss starts,
// the bot spins round to see it swelling right there... and it goes off. Death screen:
// "HelloBuh was blown up by Creeper".
const { plateau } = require('../lib/plateau')
module.exports = {
  name: 'creeper',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you hear tssss 💀',
  edit: { caption: 'POV: you hear tssss 💀', red: 'tssss', dropAt: 'hiss', startAt: 'glance:-0.8', deathScreen: true, endAfter: 'settle:0.6',   // the blast's smoke and the death fall settled (lib/settle.js)
    sfx: [['air', 'start', 'death', { gain: 0.18 }]] },   // room tone from frame 1 (pace: the first sound was the hiss at 1.5 s)
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    // a field levelled at the terrain's high percentile (lib/plateau): the old 29-block box cleared down to the
    // start height left a cut dirt-and-stone wall right behind the creeper (frame review 2026-11-11)
    const floor = await plateau(ctx, { x0: x - 34, x1: x + 34, z0: z - 34, z1: z + 34, biome: null, pct: 0.995, taper: 14, trees: 16 })   // (review r1: a ±32 field painted plains left a straight biome seam and a dirt face behind the creeper: tapered, the biome left as it is; ±48 took in a hill and stood 25 blocks up)
    this.x = x; this.z = z; this.floor = floor
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty hard')   // full hearts (vanilla start) + the step back: on normal the blast left 3 hearts; hard kills, as the old 1.5-heart start did
    await ctx.hotbar([['oak_planks', 64], 'diamond_sword', ['bread', 16], ['torch', 32]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 25)       // facing north, looking at the ground ahead
    await ctx.cmd('/effect give @s instant_health 1 10 true')   // full hearts (the last render started on 1.5 hearts)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, floor } = this
    const A = require('../lib/act')(ctx)
    await bot.waitForTicks(6)
    // the creeper, well behind the bot (south)
    await ctx.cmd(`/summon creeper ${x + 0.5} ${floor + 1} ${z + 15.5} {PersistenceRequired:1b}`)   // far back: two glances as it closes in (lead 2026-11-11: the hiss build-up, 8 s+)
    // building a little wall in front: 4 planks wide, 2 high
    const wall = []
    for (const dy of [0, 1]) for (const dx of [-2, -1, 0, 1]) wall.push([x + dx, floor + 1 + dy, z - 2])
    // the hook: a glance over the shoulder at the start shows it walking up (the viewer knows, the
    // player doesn't), back to building, a second glance (much closer), building again until the hiss
    for (let i = 0; i < 40; i++) { const c = Object.values(bot.entities).find(e => e.name === 'creeper'); if (c && c.position.distanceTo(bot.entity.position) < 14) break; await bot.waitForTicks(1) }
    const c0 = Object.values(bot.entities).find(e => e.name === 'creeper')
    ctx.mark('glance')
    if (c0) { await ctx.easeLookAt(c0.position.offset(0, 1.2, 0), 350); await bot.waitForTicks(14) }
    let hissed = false
    const near = () => {
      const c = Object.values(bot.entities).find(e => e.name === 'creeper')
      return c ? c.position.distanceTo(bot.entity.position) : 99
    }
    let glanced2 = false
    for (const [bx, by, bz] of wall) {
      if (!glanced2 && near() < 7.5) {
        // the second glance: it's much closer now (still walking, not hissing yet)
        glanced2 = true
        const c2 = Object.values(bot.entities).find(e => e.name === 'creeper')
        ctx.mark('glance2')
        if (c2) { await ctx.easeLookAt(c2.position.offset(0, 1.2, 0), 380); await bot.waitForTicks(10) }
      }
      await A.place(new Vec3(bx, by, bz), { sound: 'block.wood.place' })   // aimed by construction (lib/act.js)
      await bot.waitForTicks(6)
      if (near() < 3.2) { hissed = true; break }
    }
    // keep pottering until it's close
    for (let i = 0; i < 160 && !hissed; i++) {
      if (i % 20 === 0) { await ctx.easeLook(bot.entity.yaw + (i % 40 ? 0.25 : -0.25), 0.35, 400) }
      await bot.waitForTicks(1)
      if (near() < 3.2) hissed = true
    }
    ctx.mark('hiss'); ctx.sound('entity.creeper.primed', 1, 1)
    await bot.waitForTicks(8)                                   // ...what's that sound
    const c = Object.values(bot.entities).find(e => e.name === 'creeper')
    if (c) await ctx.easeLookAt(c.position.offset(0, 0.9, 0), 300)   // spin round: oh no
    // stumble back a step or two so the whole creeper (legs, swelling, white flashes) is in frame
    bot.setControlState('back', true)
    // (9 ticks back: the blast left 4 hearts even on hard)
    for (let i = 0; i < 4; i++) { await bot.waitForTicks(1); const cc = Object.values(bot.entities).find(e => e.name === 'creeper'); if (cc) bot.lookAt(cc.position.offset(0, 0.9, 0), true) }
    bot.setControlState('back', false)
    for (let i = 0; i < 60 && !ctx.died; i++) await bot.waitForTicks(1)
    await bot.waitForTicks(50)                                  // the death screen
    return ctx.died
  }
}
