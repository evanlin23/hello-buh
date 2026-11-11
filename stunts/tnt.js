// "POV: you lit 75 TNT 💀": a 5x3x5 pile of TNT in a field. The bot lights it with flint and
// steel (a real use on the block), sprints away, turns round for the chain reaction, then walks
// up to the edge of the crater and looks in. Explosions come from the server's explosion packets
// (particles + sound), primed TNT is rendered flashing like TntRenderer.
const { plateau } = require('../lib/plateau')
module.exports = {
  name: 'tnt',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you lit 75 TNT 💀',
  edit: { caption: 'POV: you lit 75 TNT 💀', red: '75', song: 'songs/ncs/mortals_funk_remix.mp3', dropAt: 'boom', startAt: 'lit:-1.3', endAfter: 'boom:1.0' },   // ends in the chain (owner: end on the payoff; the old crater walk was a 5 s tail)

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
    await ctx.cmd(`/fill ${x - 2} ${floor + 1} ${this.pz - 2} ${x + 2} ${floor + 3} ${this.pz + 2} tnt`)
    await ctx.hotbar(['diamond_sword', 'flint_and_steel', ['tnt', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, this.pz + 6.5, 180, 10)
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    await ctx.cmd('/gamemode survival')
    ctx.select(2)
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
    await ctx.easeLookAt(target.offset(0.5, 0.5, 1), 400)
    bot._client.write('block_place', { hand: 0, location: { x: target.x, y: target.y, z: target.z }, direction: 3, cursorX: 0.5, cursorY: 0.5, cursorZ: 1, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    await bot.waitForTicks(6)
    // back away the whole fuse while FACING the flashing pile (turning to sprint off hid the TNT for
    // 1.7 s of the 4 s fuse), with clear nervous glances that come back to it
    bot.setControlState('back', true)
    let boomed = false
    const onBoom = () => { if (!boomed) { boomed = true; ctx.mark('boom') } }
    bot._client.once('explosion', onBoom)
    const glances = [[0.35, 0.12], [-0.3, 0.05], [0.0, 0.25], [0.25, 0.0], [-0.2, 0.15], [0.0, 0.05]]
    for (let i = 0; i < 120 && !boomed; i++) {
      if (i === 64) bot.setControlState('back', false)     // ~14 blocks back: far enough to watch
      if (i % 14 === 0) ctx.easeLook(glances[(i / 14) % glances.length][0], glances[(i / 14) % glances.length][1], 450)
      await bot.waitForTicks(1)
    }
    bot.setControlState('back', false)
    await ctx.easeLook(0, 0.08, 300)
    await bot.waitForTicks(40)                                // the chain goes off
    // walk up to the rim and look down INTO the crater (the old ending stayed level on the grass)
    bot.setControlState('forward', true); await bot.waitForTicks(14); bot.setControlState('forward', false)
    await ctx.easeLook(0, -0.95, 800)
    ctx.easeLook(0.4, -0.85, 1600)
    await bot.waitForTicks(28)
    return boomed && !ctx.died
  }
}
