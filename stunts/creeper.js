// "POV: you hear tssss 💀": the bot is building a little wall, back turned. A creeper walks up
// behind it (a real mob with its own AI, difficulty normal); when it gets close the hiss starts,
// the bot spins round to see it swelling right there... and it goes off. Death screen:
// "HelloBuh was blown up by Creeper".
const { plateau } = require('../lib/plateau')
module.exports = {
  name: 'creeper',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you hear tssss 💀',
  edit: { caption: 'POV: you hear tssss 💀', red: 'tssss', dropAt: 'hiss', startAt: 'first:-0.1', deathScreen: true, endAfter: 'settle:1.0',   // the blast's smoke and the death fall settled (lib/settle.js); 1.0 s (pace r2: 0.6 made 7.9 s, under the 8 s floor, and held the death text 0.8 s)
    sfx: [['air', 'start', 'death', { gain: 0.5 }], ['dip', 'hurt', 0.4], ['impact', 'hurt', { gain: 1.4 }]] },   // mixcheck r2: under the NCS bed the blast wasn't a hit: dip + impact on it   // room tone from frame 1 (pace: the first sound was the hiss at 1.5 s)
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
    // dress the field (review r2: the north-facing building shots read as a superflat plain to the horizon, owner pattern 1):
    // trees on the north half and beside, vanilla grass and flower patches everywhere but the build spot
    const trees = [['oak', -12, -16], ['fancy_oak', 6, -20], ['birch', -4, -27], ['oak', 16, -28], ['fancy_oak', -22, -24], ['birch', 24, -16],
      ['oak', -28, -6], ['birch', 29, 4], ['oak', 9, -32], ['fancy_oak', -14, -33]]
    for (const [f, dx, dz] of trees) await ctx.cmd(`/place feature minecraft:${f} ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
    for (let dx = -32; dx <= 32; dx += 8) {
      for (let dz = -32; dz <= 32; dz += 8) {
        if (Math.abs(dx) <= 6 && dz >= -8 && dz <= 4) continue   // the wall and where I stand
        await ctx.cmd(`/place feature minecraft:patch_grass ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
        if ((dx + dz) % 16 === 0) await ctx.cmd(`/place feature minecraft:flower_plain ${x + dx + 3} ${floor + 1} ${z + dz + 3}`, { mayFail: true })
      }
    }
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
    // the hook moves from frame 0 (review r2: a frozen 0.75 s opener): the first plank goes down before the glance
    const first = wall.shift()
    ctx.mark('first')
    await A.place(new Vec3(...first), { sound: 'block.wood.place' })
    await bot.waitForTicks(6)
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
        if (c2) { await A.aimAt(c2, { strict: false, reach: 20, max: 30 }); await bot.waitForTicks(10) }   // governed (<=220 deg/s): an eased 380 ms turn whipped at 746 deg/s (rec_check)
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
    await bot.waitForTicks(3)                                   // ...what's that sound
    const c = Object.values(bot.entities).find(e => e.name === 'creeper')
    if (c) await A.aimAt(c, { strict: false, reach: 20, max: 22 })   // spin round: oh no (governed, <=220 deg/s: the 300 ms ease whipped at 777 deg/s; the 30-tick fuse leaves ~0.4 s of it swelling in frame)
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
