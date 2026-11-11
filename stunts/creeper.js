// "POV: you hear tssss 💀": the bot is building a little wall, back turned. A creeper walks up
// behind it (a real mob with its own AI, difficulty normal); when it gets close the hiss starts,
// the bot spins round to see it swelling right there... and it goes off. Death screen:
// "HelloBuh was blown up by Creeper".
const { plateau } = require('../lib/plateau')
module.exports = {
  name: 'creeper',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you hear tssss 💀',
  edit: { caption: 'POV: you hear tssss 💀', red: 'tssss', song: 'songs/ncs/intranet_crush.mp3', dropAt: 'hiss', startAt: 'glance:-0.2', deathScreen: true, endAfter: 'death:1.8',
    sfx: [['air', 'start', 'death', { gain: 0.5 }]] },   // room tone from frame 1 (pace: the first sound was the hiss at 1.5 s)
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
    const floor = await plateau(ctx, { x0: x - 32, x1: x + 32, z0: z - 32, z1: z + 32, biome: 'minecraft:plains', pct: 0.995, taper: 0, trees: 10 })
    this.x = x; this.z = z; this.floor = floor
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty normal')
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
    await bot.waitForTicks(6)
    // the creeper, well behind the bot (south)
    await ctx.cmd(`/summon creeper ${x + 0.5} ${floor + 1} ${z + 9.5} {PersistenceRequired:1b}`)
    // building a little wall in front: 4 planks wide, 2 high
    const wall = []
    for (const dy of [0, 1]) for (const dx of [-2, -1, 0, 1]) wall.push([x + dx, floor + 1 + dy, z - 2])
    // the hook: a glance over the shoulder at the start shows it walking up (the viewer knows, the
    // player doesn't), then back to building until the hiss
    for (let i = 0; i < 40; i++) { const c = Object.values(bot.entities).find(e => e.name === 'creeper'); if (c && c.position.distanceTo(bot.entity.position) < 8.5) break; await bot.waitForTicks(1) }
    const c0 = Object.values(bot.entities).find(e => e.name === 'creeper')
    ctx.mark('glance')
    if (c0) { await ctx.easeLookAt(c0.position.offset(0, 1.2, 0), 350); await bot.waitForTicks(14) }
    let hissed = false
    const near = () => {
      const c = Object.values(bot.entities).find(e => e.name === 'creeper')
      return c ? c.position.distanceTo(bot.entity.position) : 99
    }
    for (const [bx, by, bz] of wall) {
      await ctx.easeLookAt(new Vec3(bx + 0.5, by + 0.5, bz + 0.5), 250)
      bot._client.write('block_place', { hand: 0, location: { x: bx, y: by - 1, z: bz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.wood.place', 1, 0.9)
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
    for (let i = 0; i < 9; i++) { await bot.waitForTicks(1); const cc = Object.values(bot.entities).find(e => e.name === 'creeper'); if (cc) bot.lookAt(cc.position.offset(0, 0.9, 0), true) }
    bot.setControlState('back', false)
    for (let i = 0; i < 60 && !ctx.died; i++) await bot.waitForTicks(1)
    await bot.waitForTicks(50)                                  // the death screen
    return ctx.died
  }
}
