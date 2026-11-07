// "pouring water on a lava lake 😳": a 15x21 lava lake one block down in a field. The bot walks
// straight across it on its own obsidian: pour a water bucket on the front edge, let it run ~10
// ticks (every lava source it touches fizzes into obsidian), scoop it straight back up so the fresh
// patch shows at once, step onto it, repeat. Seven pours cross the lake; at the far side it turns
// round and lets two bigger pours run either side of its path, scoops them, and stands on the
// black field it made. (Owner: "nothing really happens" when a water sheet hid the obsidian for 8 s.)
//
// Lake cells lx 0..14, lz 0..L-1; lava at y = G-1, air above it at G (G = ground level). A full bucket
// ignores fluids, so a pour clicks the rim block's inner face (first) or the top of obsidian.
const L = 21   // lake length (rows lz 0..L-1; 15 wide). 15 rows crossed in 3 pours and ran 26 s

module.exports = {
  name: 'water_vs_lava',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'pouring water on a lava lake 😳',
  edit: {
    subsY: 0.15, caption: 'pouring water on a lava lake 😳', red: 'lava', song: 'songs/misery.mp3', dropAt: 'finale',
    startAt: 'pour:-0.4', endAfter: 'end_look:1.05'
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: G } = g
    this.G = G
    await ctx.defaultRules()
    for (let y0 = G + 1; y0 <= G + 13; y0 += 7) await ctx.cmd(`/fill ${x - 22} ${y0} ${z - 30} ${x + 22} ${y0 + 6} ${z + 8} air`)
    await ctx.cmd(`/fill ${x - 22} ${G} ${z - 30} ${x + 22} ${G} ${z + 8} grass_block`)
    await ctx.cmd(`/fill ${x - 22} ${G - 4} ${z - 30} ${x + 22} ${G - 1} ${z + 8} dirt`)
    const x0 = x - 7, z0 = z - 6 - L
    this.x0 = x0; this.z0 = z0
    await ctx.cmd(`/fill ${x0} ${G - 2} ${z0} ${x0 + 14} ${G - 2} ${z0 + L - 1} stone`)
    await ctx.cmd(`/fill ${x0} ${G} ${z0} ${x0 + 14} ${G} ${z0 + L - 1} air`)
    await ctx.cmd(`/fill ${x0} ${G - 1} ${z0} ${x0 + 14} ${G - 1} ${z0 + L - 1} lava`)
    // one cooled cell at the edge to stand the first pour on: from the south rim the bot can't click the
    // rim's north-facing inner face, so the bucket hit the rim's top and the water source sat on the rim
    await ctx.cmd(`/setblock ${x0 + 7} ${G - 1} ${z0 + L - 1} obsidian`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 24')
    await ctx.hotbar(['water_bucket', 'water_bucket', ['bread', 8]])
    await ctx.tpCheck(x0 + 7.5, G + 1, z0 + L + 0.6, 180, 35)        // on the south rim, in line with the middle column
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y: G, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x0, z0, G } = this
    const cell = (lx, lz, dy = 0) => new Vec3(x0 + lx + 0.5, G + dy, z0 + lz + 0.5)
    const at = (lx, lz, y) => bot.blockAt(new Vec3(x0 + lx, y, z0 + lz))

    // fizz + steam on every lava -> obsidian the client sees (vanilla level event 1501), capped
    let fizzTick = -1, fizzN = 0, converted = 0, puff = 0
    const onBlock = (o, n) => {
      if (!o || !n || o.name !== 'lava' || !/obsidian|cobblestone|stone/.test(n.name)) return
      converted++
      const p = n.position, tk = bot.time.age
      if (tk !== fizzTick) { fizzTick = tk; fizzN = 0 }
      if (fizzN++ < 2) ctx.sound('block.lava.extinguish', 0.5, 2.6 + (Math.random() - Math.random()) * 0.8)
      if (puff++ % 4 === 0 && bot.entity.position.distanceTo(p) > 3) ctx.particles('smoke', new Vec3(p.x + 0.5, p.y + 1.1, p.z + 0.5), { count: 4 })
    }
    bot.on('blockUpdate', onBlock)

    // one pour/scoop: water lands in cell (lx, lz) at G, runs `flow` ticks, back in the bucket
    const pourScoop = async (lx, lz, clickPt, flow, ms = 260) => {
      await ctx.easeLookAt(clickPt, ms)
      bot.activateItem(); bot.swingArm()
      ctx.sound('item.bucket.empty', 1, 1)
      ctx.mark('pour', { lx, lz })
      await bot.waitForTicks(3)
      // watch it run (eyes slightly ahead of the source)
      ctx.easeLookAt(cell(lx, lz - 1, -0.6), Math.max(100, flow * 50 - 150))
      await bot.waitForTicks(flow)
      await ctx.easeLookAt(cell(lx, lz, 0.45), 150)        // the source (an empty bucket picks up fluids)
      bot.activateItem(); bot.swingArm()
      ctx.sound('item.bucket.fill', 1, 1)
      ctx.mark('scoop', { lx, lz })
      await bot.waitForTicks(3)
      const held = bot.inventory.slots[36]?.name
      if (held !== 'water_bucket') {
        // the real scoop missed (logged): take this pour's water away so it can't run on, refill the bucket
        ctx.log('scoop missed at', lx, lz, 'holding', held)
        bot.chat(`/fill ${x0 + lx - 3} ${G} ${z0 + lz - 3} ${x0 + lx + 3} ${G} ${z0 + lz + 3} air replace water`)
        bot.chat('/item replace entity @s hotbar.0 with water_bucket')
        await bot.waitForTicks(2)
      }
    }
    const walkTo = async (lz) => {
      const tz = z0 + lz + 0.5
      bot.setControlState('forward', true)
      for (let k = 0; k < 40 && bot.entity.position.z > tz + 0.55; k++) {   // stops short: it slides on
        // never step onto lava
        const ahead = at(7, Math.floor(bot.entity.position.z - 0.8) - z0, G - 1)
        if (ahead && ahead.name === 'lava') break
        await bot.waitForTicks(1)
      }
      bot.setControlState('forward', false)
    }

    await bot.waitForTicks(4)
    // first pour: the rim's inner face, water lands in (7, 14)
    await pourScoop(7, L - 1, cell(7, L - 1, -0.04), 6, 300)
    let lz = L - 1
    for (let step = 0; step < 12; step++) {
      // the newest obsidian at the front of the patch: stand two cells behind it, pour on its top face
      let front = lz
      while (front > 0 && at(7, front - 1, G - 1)?.name === 'obsidian') front--
      if (front <= 0) break
      await walkTo(Math.min(L - 1, front + 2))
      ctx.log('step', step, 'front', front, 'z', (bot.entity.position.z - z0).toFixed(1), 'converted', converted)
      await pourScoop(7, front, cell(7, front, -0.04), 6)   // short runs: ~2 rows a pour, 5-6 pours across (10 crossed in 3 and the Short ran 29 s)
      lz = front
    }
    await walkTo(1)
    // across. Turn round and walk back down the path, pouring either side of it at each stop, each pour
    // left to run longer than the last: the black spreads wider until the lake is gone (~30 s total)
    ctx.mark('finale')
    await ctx.easeLook(Math.PI, -0.75, 450)               // facing back south (mineflayer yaw 0 = north), down at the path
    const stops = [3, 6, 9, 12, 15, 18]
    let flow = 10
    for (const sz of stops) {
      // walk back (south = +z, facing it) to this row
      const tz = z0 + sz + 0.5
      bot.setControlState('forward', true)
      for (let k = 0; k < 40 && bot.entity.position.z < tz - 0.55; k++) await bot.waitForTicks(1)
      bot.setControlState('forward', false)
      for (const lx of [9, 5]) {                             // facing south: +x is on the left
        // the outermost obsidian on that side of this row
        let ox = 7
        const dir = lx > 7 ? 1 : -1
        while (ox + dir >= 0 && ox + dir <= 14 && at(ox + dir, sz, G - 1)?.name === 'obsidian') ox += dir
        if (ox === 7) continue
        await pourScoop(ox, sz, cell(ox, sz, -0.04), flow, 280)
        flow = Math.min(24, flow + 2)
      }
      await ctx.easeLook(Math.PI, -0.6, 250)
    }
    // stand on it: look out over the black field
    ctx.mark('end_look')
    await ctx.easeLook(0.35, -0.4, 1000)                  // turn round: the whole lake behind is black
    bot.removeListener('blockUpdate', onBlock)

    let lava = 0, obs = 0
    for (let a = 0; a < 15; a++) for (let b = 0; b < L; b++) { const n = at(a, b, G - 1).name; if (n === 'lava') lava++; if (n === 'obsidian') obs++ }
    ctx.log(`lake: obsidian ${obs}, lava ${lava}, converted ${converted}, at z ${(bot.entity.position.z - z0).toFixed(1)}`)
    return obs > 15 * L - 25 && !ctx.died                          // (it walks back south now: no end position check)
  }
}
