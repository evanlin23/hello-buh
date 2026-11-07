// "never dig straight up 💀" (pairs with cave_reveal's "never dig straight down"), ~30 s, three
// escalating dig-ups in a torch-lit strip-mine tunnel:
//   1. gravel: the ceiling opens and gravel pours down in front of the bot; it shovels through.
//   2. a diamond in the wall on the way (it feels great), then water: the ceiling opens onto a
//      water pocket, the tunnel floods; it plugs the hole with cobblestone and the water drains.
//   3. lava: the ceiling opens onto a lava pocket, the column pours down, floods onto the bot.
//      Death screen: "HelloBuh tried to swim in lava".
// Fluids are vanilla except the lava column: lava waits 30 ticks per block of flow (3 s of a still
// hole on camera), so the stunt drops the falling column itself, a block every few ticks.
module.exports = {
  name: 'dig_up',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'never dig straight up 💀',
  edit: {
    caption: 'never dig straight up 💀', red: 'never', song: 'songs/funk_abnormal.mp3', dropAt: 'opened_lava', onFire: 'burn:death', deathScreen: true,
    startAt: 'dig1:-0.4', endAfter: 'death:0.9',
    subs: [['dig1', 'dig up #1', 3.5], ['dig2', 'dig up #2', 6], ['dig3', 'dig up #3', 5], ['dig4', 'dig up #4', 3.5]]
  },
  expectDeath: true,
  brightness: 1,   // Options > Brightness: Bright: the ceiling shots read as flat dark grey at the default

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    const y = g.y - 16                                        // tunnel floor (feet level)
    this.x = x; this.z = z; this.y = y
    await ctx.defaultRules()
    for (let y0 = y - 3; y0 <= y + 11; y0 += 4) await ctx.cmd(`/fill ${x - 6} ${y0} ${z - 30} ${x + 6} ${Math.min(y + 11, y0 + 3)} ${z + 4} stone`)
    // a few ores in the walls, like real stone
    let seed = 3
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const ores = ['coal_ore', 'coal_ore', 'iron_ore', 'copper_ore', 'iron_ore', 'gold_ore', 'redstone_ore', 'lapis_ore']
    for (let i = 0; i < 16; i++) {
      const ox = x + (rnd() < 0.5 ? -1 : 1), oy = y + Math.floor(rnd() * 2), oz = z - Math.floor(rnd() * 28)
      await ctx.cmd(`/setblock ${ox} ${oy} ${oz} ${ores[Math.floor(rnd() * ores.length)]}`)
    }
    await ctx.cmd(`/fill ${x} ${y} ${z - 27} ${x} ${y + 1} ${z + 2} air`)          // the tunnel
    this.s1 = z - 2; this.s2 = z - 10; this.sa = z - 14; this.s3 = z - 23                             // the three dig-up spots
    this.dz = z - 6                                                                 // the diamond
    await ctx.cmd(`/setblock ${x + 1} ${y + 1} ${this.dz} diamond_ore`)
    for (const dz of [1, -4, -8, -12, -15, -19, -21, -25]) await ctx.cmd(`/setblock ${x - 1} ${y + 1} ${z + dz} wall_torch[facing=east]`)
    // what waits above each spot
    await ctx.cmd(`/fill ${x} ${y + 3} ${this.s1} ${x} ${y + 4} ${this.s1} gravel`)
    await ctx.cmd(`/fill ${x - 1} ${y + 3} ${this.s2 - 1} ${x + 1} ${y + 4} ${this.s2 + 1} water`)
    await ctx.cmd(`/fill ${x} ${y + 3} ${this.sa} ${x} ${y + 8} ${this.sa} air`)      // a shaft with an anvil at the top
    await ctx.cmd(`/setblock ${x} ${y + 9} ${this.sa} anvil`)
    await ctx.cmd(`/fill ${x - 1} ${y + 3} ${this.s3 - 2} ${x + 1} ${y + 4} ${this.s3 + 2} lava`)
    await ctx.hotbar(['diamond_pickaxe[enchantments={efficiency:5}]', 'diamond_shovel[enchantments={efficiency:5}]', ['cobblestone', 64], ['torch', 40], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, y, z + 1.5, 180, 0)
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s haste infinite 1 true')   // Haste II (a beacon's): strip-mining pace, no particles
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, y } = this
    // a walk that can't get there fails the take (a leftover gravel block once held the bot in place
    // and every later beat ran from 6-17 blocks away)
    const walkTo = async (zt) => {
      bot.setControlState('forward', true)
      const hop = () => bot.setControlState('jump', !!bot.entity.isCollidedHorizontally)
      bot.on('physicsTick', hop)
      let lastZ = bot.entity.position.z, still = 0
      for (let i = 0; i < 160 && bot.entity.position.z > zt + 0.5; i++) {
        await bot.waitForTicks(1)
        if (Math.abs(bot.entity.position.z - lastZ) < 0.01) { if (++still > 12) break } else still = 0
        lastZ = bot.entity.position.z
      }
      bot.setControlState('forward', false); bot.removeListener('physicsTick', hop); bot.setControlState('jump', false)
      if (bot.entity.position.z > zt + 0.9) throw new Error(`walk stuck at z ${bot.entity.position.z.toFixed(2)} (wanted ${zt})`)
      await bot.waitForTicks(2)
    }
    const stepBack = async (ticks, lookDown = 0.25) => {
      bot.setControlState('back', true)
      for (let i = 0; i < ticks; i++) { await bot.waitForTicks(1); await bot.look(bot.entity.yaw, Math.max(-0.3, bot.entity.pitch - lookDown), true) }
      bot.setControlState('back', false)
    }
    const digUp = async (sz, n) => {
      const up = bot.blockAt(new Vec3(x, y + 2, sz))
      await ctx.easeLookAt(up.position.offset(0.5, 0, 0.5), 450)
      ctx.mark(`dig${n}`)
      ctx.select(0)
      try { await bot.dig(up, true) } catch (e) { ctx.log('dig', e.message) }
      ctx.sound('block.stone.break', 1); ctx.particles('block', up.position, { block: 'stone' })
    }

    await bot.waitForTicks(4)
    // 1. gravel
    await walkTo(this.s1 + 1)
    await digUp(this.s1, 1)
    ctx.mark('opened_gravel')
    await stepBack(5)
    for (let i = 0; i < 10; i++) { await bot.waitForTicks(1); await bot.look(bot.entity.yaw, Math.min(0.6, bot.entity.pitch + 0.06), true); if (i % 5 === 0) ctx.sound('block.gravel.fall', 0.8) }
    await ctx.easeLook(bot.entity.yaw, -0.15, 250)
    ctx.select(1)                                             // shovel through it, until the whole column is clear
    const falling = () => Object.values(bot.entities).some(e => e.name === 'falling_block' && e.position.distanceTo(new Vec3(x, y, this.s1)) < 5)
    for (let k = 0; k < 12; k++) {
      const b = [y + 1, y, y + 2].map(yy => bot.blockAt(new Vec3(x, yy, this.s1))).find(b => b && b.name === 'gravel')
      if (!b) { if (falling()) { await bot.waitForTicks(3); continue } break }
      try { await bot.dig(b, true) } catch (e) { ctx.log('dig gravel', e.message) }
      ctx.particles('block', b.position, { block: 'gravel' })
      await bot.waitForTicks(4)
    }
    await ctx.easeLook(bot.entity.yaw, 0, 200)
    // the diamond on the way
    ctx.select(0)
    await walkTo(this.dz + 1.6)                               // a step short: the whole ore in frame
    const d = bot.blockAt(new Vec3(x + 1, y + 1, this.dz))
    await ctx.easeLookAt(d.position.offset(0.5, 0.5, 0.5), 400)
    ctx.mark('diamond')
    // mined at its real speed with dig packets (mineflayer's digTime rated this pickaxe as no tool: 2.85 s)
    const loc = { x: d.position.x, y: d.position.y, z: d.position.z }
    bot._client.write('block_dig', { status: 0, location: loc, face: 4, sequence: 0 })
    for (let i = 0; i < 3; i++) { bot.swingArm(); await bot.waitForTicks(1) }
    bot._client.write('block_dig', { status: 2, location: loc, face: 4, sequence: 0 })
    ctx.particles('block', d.position, { block: 'diamond_ore' })
    await bot.waitForTicks(6)
    await ctx.easeLook(0, -0.05, 300)                         // back down the tunnel (over the drop)
    // 2. water
    await walkTo(this.s2 + 1)
    await digUp(this.s2, 2)
    ctx.mark('opened_water')
    await stepBack(8)
    const wy = bot.entity.yaw
    for (let i = 0; i < 40; i++) { await bot.waitForTicks(1); await bot.look(wy + 0.3 * Math.sin(i / 7), -0.25 + 0.15 * Math.sin(i / 5), true) }   // the flood comes on, round its feet
    // plug it: cobblestone into the hole, clicked on the side of the stone beside it
    ctx.select(2)
    const side = new Vec3(x + 1, y + 2, this.s2)
    await ctx.easeLookAt(new Vec3(x + 0.95, y + 2.5, this.s2 + 0.5), 400)
    bot._client.write('block_place', { hand: 0, location: { x: side.x, y: side.y, z: side.z }, direction: 4, cursorX: 0, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('block.stone.place', 1)
    ctx.mark('plugged')
    for (let i = 0; i < 30; i++) await bot.waitForTicks(1)    // the water drains away
    await ctx.easeLook(0, -0.05, 300)
    // 3. anvils: the hole opens a shaft, an anvil drops right in front (it backed off in time), it
    // mines it out of the way, walks under the shaft... and a second one comes down on its head
    ctx.select(0)
    await walkTo(this.sa + 1)
    const up3 = bot.blockAt(new Vec3(x, y + 2, this.sa))
    await ctx.easeLookAt(up3.position.offset(0.5, 0, 0.5), 450)
    ctx.mark('dig3')
    try { await bot.dig(up3, true) } catch (e) { ctx.log('dig', e.message) }
    ctx.particles('block', up3.position, { block: 'stone' })
    ctx.mark('opened_anvil')
    await stepBack(6, 0.12)
    for (let i = 0; i < 26; i++) { await bot.waitForTicks(1); if (bot.blockAt(new Vec3(x, y, this.sa)).name.includes('anvil')) break }
    ctx.mark('anvil_miss')
    await bot.waitForTicks(6)
    const mineAnvils = async () => {
      for (let k = 0; k < 4; k++) {
        const a = [y, y + 1].flatMap(yy => [0, -1, -2].map(dz => bot.blockAt(new Vec3(x, yy, Math.floor(bot.entity.position.z) + dz)))).find(b => b && /anvil/.test(b.name))
        if (!a) break
        await ctx.easeLookAt(a.position.offset(0.5, 0.5, 0.5), 250)
        try { await bot.dig(a, true) } catch (e) { ctx.log('dig anvil', e.message) }
        await bot.waitForTicks(4)
      }
    }
    await mineAnvils()
    await ctx.easeLook(0, 0.1, 300)
    await walkTo(this.sa + 0.2)                               // under the shaft
    await ctx.easeLookAt(new Vec3(x + 0.5, y + 6, this.sa + 0.5), 400)   // looking up it...
    bot.chat(`/setblock ${x} ${y + 9} ${this.sa} anvil`)
    for (let i = 0; i < 30 && bot.health >= 19; i++) { await bot.waitForTicks(1) }
    ctx.mark('anvil_hit', { health: bot.health })
    await bot.waitForTicks(6)
    await ctx.easeLook(bot.entity.yaw, -1.2, 350)              // looking down at what hit it
    await mineAnvils()
    await ctx.easeLook(0, -0.05, 300)
    // 4. lava
    ctx.select(0)
    await walkTo(this.s3 + 1)
    await digUp(this.s3, 4)
    ctx.mark('opened_lava')
    ctx.sound('block.lava.pop', 1)
    // it backs off a step and watches the column come down right in front of it (the stunt drops the
    // falling column itself: vanilla lava waits 30 ticks per block), then it spreads along the floor
    // onto the bot's feet
    const bz = this.s3
    await stepBack(5, 0.05)
    await ctx.easeLookAt(new Vec3(x + 0.5, y + 2.8, bz + 0.5), 250)
    for (const dy of [2, 1, 0]) {
      bot.chat(`/setblock ${x} ${y + dy} ${bz} lava[level=8]`)
      ctx.sound('block.lava.pop', 0.8, 0.9 + dy * 0.1)
      if (dy === 2) ctx.mark('pour')
      for (let i = 0; i < 8; i++) { await bot.waitForTicks(1); await bot.look(bot.entity.yaw, Math.max(-0.5, bot.entity.pitch - 0.05), true) }   // eyes follow it down
    }
    ctx.sound('block.lava.ambient', 1)
    const fz = Math.floor(bot.entity.position.z)
    for (let zz = bz + 1, lv = 2; zz <= fz; zz++, lv += 2) {   // the flow along the floor toward the bot
      bot.chat(`/setblock ${x} ${y} ${zz} lava[level=${Math.min(7, lv)}]`)
      await bot.waitForTicks(5)
    }
    ctx.mark('burn')                                          // it's at the bot's feet: the fire starts here
    const yaw = bot.entity.yaw
    for (const [dy, p] of [[0.6, 0.2], [-0.7, 0.1], [0.3, -0.3], [-0.5, 0.25], [0.8, 0.0], [-0.3, -0.2]]) { if (!ctx.died) await ctx.easeLook(yaw + dy, p, 380) }   // panic, never a still red screen
    for (let i = 0; i < 160 && !ctx.died; i++) await bot.waitForTicks(1)
    await bot.waitForTicks(40)                                // the death screen
    return ctx.died
  }
}
