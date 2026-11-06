// "POV: you lit 75 TNT 💀": a 5x3x5 pile of TNT in a field. The bot lights it with flint and
// steel (a real use on the block), sprints away, turns round for the chain reaction, then walks
// up to the edge of the crater and looks in. Explosions come from the server's explosion packets
// (particles + sound), primed TNT is rendered flashing like TntRenderer.
module.exports = {
  name: 'tnt',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you lit 75 TNT 💀',
  edit: { caption: 'POV: you lit 75 TNT 💀', red: '75', song: 'songs/funk_abnormal.mp3', dropAt: 'boom', start: 0.4, endAfter: 'boom:5.0' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    // a flat field (each /fill under the 32768-block cap)
    await ctx.cmd(`/fill ${x - 20} ${floor + 1} ${z - 36} ${x + 20} ${floor + 12} ${z + 6} air`)
    await ctx.cmd(`/fill ${x - 20} ${floor - 12} ${z - 36} ${x + 20} ${floor - 1} ${z + 6} dirt`)   // deep: a crater into groundwater flooded
    await ctx.cmd(`/fill ${x - 20} ${floor} ${z - 36} ${x + 20} ${floor} ${z + 6} grass_block`)
    this.pz = z - 24                                          // pile centre
    await ctx.cmd(`/fill ${x - 2} ${floor + 1} ${this.pz - 2} ${x + 2} ${floor + 3} ${this.pz + 2} tnt`)
    await ctx.hotbar(['diamond_sword', 'flint_and_steel', ['tnt', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, this.pz + 6.5, 180, 10)
    await ctx.cmd('/gamemode survival')
    ctx.select(2)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, floor, pz } = this
    await bot.waitForTicks(8)
    await ctx.easeLook(0.5, 0.05, 600)                        // look at all that TNT
    await ctx.easeLook(-0.4, -0.1, 700)
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
    // RUN
    await ctx.easeLook(Math.PI, 0, 350)
    bot.setControlState('sprint', true); bot.setControlState('forward', true); bot.setControlState('jump', true)
    await bot.waitForTicks(34)
    bot.setControlState('forward', false); bot.setControlState('sprint', false); bot.setControlState('jump', false)
    await ctx.easeLook(0, 0.05, 500)                          // turn round to watch
    // the blast: wait for the first explosion
    let boomed = false
    const onBoom = () => { if (!boomed) { boomed = true; ctx.mark('boom') } }
    bot._client.once('explosion', onBoom)
    for (let i = 0; i < 120 && !boomed; i++) await bot.waitForTicks(1)
    await bot.waitForTicks(40)                                // the chain goes off
    // no walking up (knockback + a flooded crater put the camera underwater): look down into it from here
    await ctx.easeLook(0, -0.35, 900)
    await ctx.easeLook(0.5, -0.6, 900)
    await bot.waitForTicks(10)
    return boomed && !ctx.died
  }
}
