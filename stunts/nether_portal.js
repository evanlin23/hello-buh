// "POV: your first nether portal 😳": the bot builds an obsidian frame block by block in a forest
// clearing, lights it with flint and steel, and the portal swirls in (animated texture), then
// steps back to admire it. Real survival placements.
module.exports = {
  name: 'nether_portal',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'POV: your first nether portal 😳',
  edit: { caption: 'POV: your first nether portal 😳', red: 'nether', song: 'songs/funk_abnormal.mp3', dropAt: 'lit' , endAfter: 'lit:2.8'},

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 7} ${floor - 2} ${z - 9} ${x + 7} ${floor - 1} ${z + 3} dirt`)
    await ctx.cmd(`/fill ${x - 7} ${floor} ${z - 9} ${x + 7} ${floor} ${z + 3} grass_block`)
    await ctx.cmd(`/fill ${x - 7} ${floor + 1} ${z - 9} ${x + 7} ${floor + 10} ${z + 3} air`)
    this.pz = z - 4                       // portal plane
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 8')
    await ctx.hotbar([['obsidian', 18], 'flint_and_steel', 'diamond_pickaxe', ['bread', 12]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 0)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const y0 = this.floor + 1, pz = this.pz, x0 = this.x - 1
    // frame 4 wide x 5 tall with corners (every block then has a solid neighbour to click; clicking
    // the air inside the frame would put obsidian in the opening - air is replaceable)
    const frame = []
    for (let i = 0; i <= 3; i++) frame.push([x0 + i, y0])                 // bottom
    for (let j = 1; j <= 3; j++) frame.push([x0, y0 + j], [x0 + 3, y0 + j])   // sides
    for (let i = 0; i <= 3; i++) frame.push([x0 + i, y0 + 4])             // top
    const center = new Vec3(x0 + 2, y0 + 2.5, pz + 0.5)
    let aim = center.clone()
    const look = async (t, n = 1) => { for (let k = 0; k < n; k++) { aim = aim.plus(t.minus(aim).scaled(0.3)); const e = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(e); await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true); await bot.waitForTicks(1) } }
    const solid = (x, y, z) => { const b = bot.blockAt(new Vec3(x, y, z)); return b && b.boundingBox === 'block' }
    await bot.waitForTicks(10)
    for (const [fx, fy] of frame.sort((a, b) => a[1] - b[1] || a[0] - b[0])) {
      // click the block below, or the side neighbour for the top row
      let loc, face
      if (solid(fx, fy - 1, pz)) { loc = { x: fx, y: fy - 1, z: pz }; face = 1 } else if (solid(fx - 1, fy, pz)) { loc = { x: fx - 1, y: fy, z: pz }; face = 5 } else { loc = { x: fx + 1, y: fy, z: pz }; face = 4 }
      await look(new Vec3(fx + 0.5, fy + 0.5, pz + 0.5), 2)
      bot._client.write('block_place', { hand: 0, location: loc, direction: face, cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.stone.place', 1, 0.8)
      await look(new Vec3(fx + 0.5, fy + 0.5, pz + 0.5), 2)
    }
    // the top row has no support yet when built left-to-right: place any missing again
    await bot.waitForTicks(3)
    for (const [fx, fy] of frame) {
      if (solid(fx, fy, pz)) continue
      // click a solid neighbour (clicking air would place the block in that air instead)
      const n = [[0, -1, 1], [-1, 0, 5], [1, 0, 4], [0, 1, 0]].find(([dx, dy]) => solid(fx + dx, fy + dy, pz))
      if (!n) continue
      await look(new Vec3(fx + 0.5, fy + 0.5, pz + 0.5), 2)
      bot._client.write('block_place', { hand: 0, location: { x: fx + n[0], y: fy + n[1], z: pz }, direction: n[2], cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); await bot.waitForTicks(2)
    }
    await bot.waitForTicks(6)
    // light it: flint and steel on the top of a bottom obsidian block, inside the frame
    ctx.select(1); await bot.waitForTicks(4)
    await look(new Vec3(x0 + 1.5, y0 + 1, pz + 0.5), 6)
    bot._client.write('block_place', { hand: 0, location: { x: x0 + 1, y: y0, z: pz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('item.flintandsteel.use', 1); ctx.mark('lit')
    await bot.waitForTicks(4)
    ctx.sound('block.portal.trigger', 0.6)
    const lit = bot.blockAt(new Vec3(x0 + 1, y0 + 1, pz))
    ctx.log('portal block:', lit && lit.name)
    await look(center, 10)
    // step back to admire it
    bot.setControlState('back', true); await bot.waitForTicks(10); bot.setControlState('back', false)
    await look(center, 24)
    return !!(lit && lit.name === 'nether_portal')
  }
}
