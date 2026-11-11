// "POV: you lit 75 TNT 💀": a 5x3x5 pile of TNT in a field. The bot lights it with flint and
// steel (a real use on the block), sprints away, turns round for the chain reaction, then walks
// up to the edge of the crater and looks in. Explosions come from the server's explosion packets
// (particles + sound), primed TNT is rendered flashing like TntRenderer.
const { plateau } = require('../lib/plateau')
module.exports = {
  name: 'tnt',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you lit 75 TNT 💀',
  edit: { caption: 'POV: you lit 75 TNT 💀', red: '75', dropAt: 'boom', startAt: 'lit:-1.3', endAfter: 'crater:0.6',   // (r:r188b46: 0.6 s into the crater, not 1.0) settle-ok: the crater look comes after the chain has settled. (lead 2026-11-11: 8 s+ with a real beat: after the chain, walk to the rim and look into the crater)
    // pace r1: the 4 s fuse was 4 s with nothing new and near-silent (the game sounds sit ~40 dB under the blast):
    // the fuse plays x1.5 under a riser, room tone from frame 1, and the blast gets a boom, a flash and a shake
    speed: [['lit:0.5', 'boom:-0.4', 1.5], ['boom:2.4', 'crater:-1.0', 4], ['crater:-1.0', 'crater:-0.1', 2]],   // r:r188b46: the wait after the chain's last blast (smoke only) at x4, the look-down into the crater at x2 (its turn peaks at 105 deg/s: x2 keeps it under the whip cap)
    // (mixcheck r1: 2.95 s after the boom with no new hit under the NCS bed: a second blast of the chain at +1.4 s)
    sfx: [['air', 'start', 'crater', { gain: 0.6 }], ['riser', 'lit', 'boom'], ['boom', 'boom'], ['boom', 'boom:1.4', { gain: 0.8 }], ['dip', 'crater', 0.4], ['impact', 'crater', { gain: 1.4 }]],
    flash: [['boom', 0, 0.5], ['crater', 0, 0.35]],   // pace r2: the crater reveal needs a picture change on the mark (the look-down is still easing)
    shake: [['boom', 0, 10]], punch: [['crater', 0, 1.08]] },   // ends in the chain (owner: end on the payoff; the old crater walk was a 5 s tail)

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    // a big field levelled at the terrain's high percentile (lib/plateau), deep dirt below (a crater that reached
    // the sea or groundwater flooded): a box cleared down to the start height left cut walls in view
    const floor = await plateau(ctx, { x0: x - 34, x1: x + 34, z0: z - 66, z1: z + 18, above: 30, below: 16, biome: 'minecraft:plains', pct: 0.995, taper: 0, trees: 10 })
    this.x = x; this.z = z; this.floor = floor
    this.pz = z - 24                                          // pile centre
    // dress the field (review r2: behind the pile it read as a superflat plain to the horizon, owner pattern 1): stone from
    // 4 down (the crater was dirt all the way), trees behind and beside the pile (13+ blocks off it: the chain leaves them
    // standing), vanilla grass and flower patches everywhere but on the pile
    for (let y = floor - 16; y <= floor - 4; y += 5) await ctx.cmd(`/fill ${x - 34} ${y} ${z - 66} ${x + 34} ${Math.min(floor - 4, y + 4)} ${z + 18} stone`)
    const trees = [['oak', -20, -42], ['fancy_oak', -7, -50], ['birch', 6, -45], ['oak', 18, -51], ['fancy_oak', 28, -41], ['oak', -28, -56],
      ['birch', 1, -61], ['oak', 14, -62], ['birch', -15, -60], ['fancy_oak', 25, -58], ['oak', -27, -35], ['birch', 30, -27], ['oak', -31, -18], ['fancy_oak', 31, -9]]
    for (const [f, dx, dz] of trees) await ctx.cmd(`/place feature minecraft:${f} ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
    for (let dx = -32; dx <= 32; dx += 8) {
      for (let dz = -64; dz <= 16; dz += 8) {
        if (Math.abs(dx) <= 5 && Math.abs(z + dz - this.pz) <= 5) continue
        await ctx.cmd(`/place feature minecraft:patch_grass ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
        if ((dx + dz) % 16 === 0) await ctx.cmd(`/place feature minecraft:flower_plain ${x + dx + 3} ${floor + 1} ${z + dz + 3}`, { mayFail: true })
      }
    }
    await ctx.cmd(`/fill ${x - 2} ${floor + 1} ${this.pz - 2} ${x + 2} ${floor + 3} ${this.pz + 2} tnt`)
    await ctx.hotbar(['diamond_sword', 'flint_and_steel', ['tnt', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, this.pz + 6.5, 180, 10)
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    await ctx.cmd('/gamemode survival')
    ctx.select(1)   // flint and steel from frame 1 (review: a TNT in the hand read as a stray 76th block)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, floor, pz } = this
    await bot.waitForTicks(8)
    await ctx.easeLook(0.3, 0.05, 450)                        // look at all that TNT
    // walk up and light the front block
    bot.setControlState('forward', true)
    for (let i = 0; i < 60 && bot.entity.position.z > pz + 4.6; i++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)
    ctx.select(1); await bot.waitForTicks(4)
    const target = new Vec3(x, floor + 1, pz + 2)
    const A = require('../lib/act')(ctx)
    await A.use(target)                                       // aimed by construction (lib/act.js): flint and steel on the TNT
    ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    await bot.waitForTicks(6)
    // back away the whole fuse while FACING the flashing pile (turning to sprint off hid the TNT for
    // 1.7 s of the 4 s fuse), with clear nervous glances that come back to it
    bot.setControlState('back', true)
    let boomed = false
    const onBoom = () => { if (!boomed) { boomed = true; ctx.mark('boom') } }
    bot._client.once('explosion', onBoom)
    // every look is paced by its size (owner r:r38374d, the whip check: on screen <= ~220 deg/s; an ease-in-out peaks at
    // twice its average): `rate` is the average in the recording, 66 deg/s inside the fuse's x1.5 span (review: the
    // first glance pulled back at 267 deg/s, and a glance still running when the chain went off fought the ride: a jerk)
    const glide = (yaw, pitch, ms, rate) => {
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      const deg = Math.hypot(dy * Math.cos(pitch), pitch - bot.entity.pitch) * 180 / Math.PI
      return ctx.easeLook(yaw, pitch, Math.max(ms, deg / rate * 1000))
    }
    const glances = [[0.35, 0.12], [-0.3, 0.05], [0.0, 0.25], [0.25, 0.0], [-0.2, 0.15], [0.0, 0.05]]
    let gi = 0, glance = null
    for (let i = 0; i < 120 && !boomed; i++) {
      if (i === 64) bot.setControlState('back', false)     // ~14 blocks back: far enough to watch
      if (!glance) { const g = glances[gi++ % glances.length]; glance = glide(g[0], g[1], 450, 66).then(() => bot.waitForTicks(4)).then(() => { glance = null }) }
      await bot.waitForTicks(1)
    }
    bot.setControlState('back', false)
    let lastBoom = ctx.tick
    bot._client.on('explosion', () => { lastBoom = ctx.tick })
    if (glance) await glance                                  // one look at a time
    // the chain goes off: the look rides up with the blast and back down (a still 2 s wait was lint's 'nobody moves')
    await glide(0.12, 0.3, 600, 100)
    await glide(-0.1, 0.1, 700, 100)
    await glide(0, 0.05, 500, 100)
    // walk up to the rim and look down INTO the crater (the old ending stayed level on the grass)
    bot.setControlState('forward', true); await bot.waitForTicks(14); bot.setControlState('forward', false)
    ctx.mark('crater_look')
    // the payoff settles before the Short ends (owner r:r24d99a): the look-down lands only once the last blast's
    // rendered smoke and crumbs are gone (lib/settle.js: 44 ticks) and no primed TNT is left; the wait tilts the view
    // down gently (no frozen hold), then the look into the crater, one short pan along it that lands, and a still rest
    const primed = () => Object.values(bot.entities).some(e => e.name === 'tnt')
    const tiltFrom = bot.entity.pitch
    for (let k = 0; k < 60 && (ctx.tick - lastBoom < 26 || primed()); k++) {
      await bot.look(bot.entity.yaw, Math.max(-0.35, tiltFrom - k * 0.012), true)   // motion-ok: a slow tilt (0.012 rad a tick, 14 deg/s)
      await bot.waitForTicks(1)
    }
    await ctx.easeLook(0, -0.95, 1000)
    ctx.mark('crater'); ctx.sound('entity.generic.explode', 0.15, 0.6)   // the second payoff: the hole it left
    await ctx.easeLook(0.22, -0.9, 350)                     // a short pan along the crater that comes to rest
    await bot.waitForTicks(40)                              // still: the Short ends 0.6 s into this rest (endAfter crater:1.0)
    return boomed && !ctx.died
  }
}
