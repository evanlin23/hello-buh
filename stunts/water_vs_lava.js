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
  caption: 'can ONE water bucket delete a lava lake? 😳',
  edit: {
    subsY: 0.15, caption: 'can ONE water bucket delete a lava lake? 😳', red: 'lava', song: 'songs/ncs/montagem_favela.mp3', dropAt: 'end_look',
    startAt: 'pour:-0.4', endAfter: 'end_look:1.05',
    // the long side-pour runs at 1.8x (about 12 s of the Short was a blue water sheet) and the walk between the stops at 2x
    speed: [...[...Array(12).keys()].map(i => [`run${i}a`, `run${i}b`, 1.8]), ['walk_a', 'walk_b', 2],
      ...[...Array(4).keys()].map(m => [`mop${m}a`, `mop${m}b`, 2]), ['cross_a', 'finale', 2], ['drain_a', 'end_look', 2]]   // the walks to the mop-up pours (3.3-3.5 s gaps)
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: G } = g
    this.G = G
    await ctx.defaultRules()
    // wide and high (x +-22, 13 up left a cut notch in the hillside behind the field: review)
    // ~64 round (x +-40 / z + 24 still left a cut hill face behind the south rim: review). Slabs of 40 rows (the fill cap)
    for (let za = z - 76; za <= z + 52; za += 40) {
      const zb = Math.min(za + 39, z + 52)
      for (let y0 = G + 1; y0 <= G + 20; y0 += 5) await ctx.cmd(`/fill ${x - 64} ${y0} ${za} ${x + 64} ${y0 + 4} ${zb} air`)
      await ctx.cmd(`/fill ${x - 64} ${G} ${za} ${x + 64} ${G} ${zb} grass_block`)
      await ctx.cmd(`/fill ${x - 64} ${G - 4} ${za} ${x + 64} ${G - 1} ${zb} dirt`)
    }
    const x0 = x - 7, z0 = z - 6 - L
    this.x0 = x0; this.z0 = z0
    await ctx.cmd(`/fill ${x0} ${G - 2} ${z0} ${x0 + 14} ${G - 2} ${z0 + L - 1} stone`)
    await ctx.cmd(`/fill ${x0} ${G} ${z0} ${x0 + 14} ${G} ${z0 + L - 1} air`)
    await ctx.cmd(`/fill ${x0} ${G - 1} ${z0} ${x0 + 14} ${G - 1} ${z0 + L - 1} lava`)
    // one cooled cell at the edge to stand the first pour on: from the south rim the bot can't click the
    // rim's north-facing inner face, so the bucket hit the rim's top and the water source sat on the rim
    await ctx.cmd(`/setblock ${x0 + 7} ${G - 1} ${z0 + L - 1} obsidian`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 24')
    await ctx.hotbar(['water_bucket', ['bread', 8]])   // ONE bucket, as the caption says (two in the hotbar: 'he had two')
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
    let runs = 0
    const pourScoop = async (lx, lz, clickPt, flow, ms = 260) => {
      await ctx.easeLookAt(clickPt, ms)
      bot.activateItem(); bot.swingArm()
      ctx.sound('item.bucket.empty', 1, 1)
      ctx.mark('pour', { lx, lz })
      await bot.waitForTicks(3)
      // watch it run (eyes slightly ahead of the source)
      ctx.easeLookAt(cell(lx, lz - 1, -0.6), Math.max(100, flow * 50 - 150))
      const long = flow > 10, rn = runs
      if (long) { runs++; ctx.mark(`run${rn}a`) }
      await bot.waitForTicks(flow)
      if (long) ctx.mark(`run${rn}b`)
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
    ctx.mark('cross_a')   // the walk to the far rim at 2x (a blank water sheet, then the rim's dirt wall)
    await walkTo(1)
    // across. Turn round and walk back down the path, pouring either side of it at each stop, each pour
    // left to run longer than the last: the black spreads wider until the lake is gone (~30 s total)
    ctx.mark('finale')
    await ctx.easeLook(Math.PI, -0.4, 450)               // facing back south (mineflayer yaw 0 = north) over the lake (-0.75: 0.8 s of solid black obsidian)
    const stops = [4, 16]   // every corner within 6 flow steps (from 5/15 two corner cells survived)   // two stops, both sides, long runs: 6 stops of short pours were 4-5 s of walking apart, mostly off screen
    const flow = 34   // ~6.8 blocks of spread, the corners are 6 steps (40 left the strip under a water sheet for 2 s)
    const lavaLeft = () => { let n = 0; for (let a = 0; a < 15; a++) for (let b = 0; b < L; b++) if (at(a, b, G - 1)?.name === 'lava') n++; return n }
    // walk on the world axis to (lx, lz) whatever the view (controls picked against it), eyes on `aim`
    const stepTo = async (lx, lz, aim) => {
      const tx = x0 + lx + 0.5, tz = z0 + lz + 0.5
      for (let k = 0; k < 60; k++) {
        const e = bot.entity.position, dx = tx - e.x, dz = tz - e.z
        if (Math.hypot(dx, dz) < 0.4) break
        const eye = e.offset(0, 1.62, 0), d = aim.minus(eye)
        const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        const ny = bot.entity.yaw + dy * 0.3
        await bot.look(ny, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.3, true)
        const len = Math.hypot(dx, dz), wx = dx / len, wz = dz / len
        const f = wx * -Math.sin(ny) + wz * -Math.cos(ny), rr = wx * Math.cos(ny) + wz * -Math.sin(ny)
        bot.setControlState('forward', f > 0.35); bot.setControlState('back', f < -0.35)
        bot.setControlState('right', rr > 0.35); bot.setControlState('left', rr < -0.35)
        await bot.waitForTicks(1)
      }
      for (const c of ['forward', 'back', 'left', 'right']) bot.setControlState(c, false)
    }
    for (const sz of stops) {
      if (!lavaLeft()) break                                 // the lake is gone: no pours on finished obsidian
      // walk back (south = +z, facing it) to this row
      const tz = z0 + sz + 0.5
      const far = bot.entity.position.z < tz - 4
      if (far) ctx.mark('walk_a')   // (the 3 s walk between the stops was a gap with no beat)
      bot.setControlState('forward', true)
      for (let k = 0; k < 40 && bot.entity.position.z < tz - 0.55; k++) await bot.waitForTicks(1)
      bot.setControlState('forward', false)
      if (far) ctx.mark('walk_b')
      for (const dir of [1, -1]) {
        // the outermost obsidian on that side of this row; skip the side if no lava borders it
        let ox = 7
        while (ox + dir >= 0 && ox + dir <= 14 && at(ox + dir, sz, G - 1)?.name === 'obsidian') ox += dir
        if (ox === 7) continue
        let lava = 0
        for (let b = Math.max(0, sz - 3); b <= Math.min(L - 1, sz + 3); b++) for (let a = ox; a >= 0 && a <= 14; a += dir) if (at(a, b, G - 1)?.name === 'lava') lava++
        if (!lava) continue
        // walk out along the row to 2 cells short of the edge: the pour stays in survival reach (from the
        // path it landed 5-7 blocks out on a raised reach)
        const sx = Math.abs(ox - 7) > 2 ? ox - 2 * dir : 7
        if (sx !== 7) await stepTo(sx, sz, cell(ox, sz, -0.3))
        await pourScoop(ox, sz, cell(ox, sz, -0.04), flow, 280)
        // hold on the strip as it drains: the new black is the beat (it turned away with the strip still under water)
        for (let k = 0; k < 6; k++) { await ctx.easeLookAt(cell(Math.max(0, Math.min(14, ox + dir * 3)), sz, -0.6), 50) }   // (12: a frozen hold on a blank water sheet)
        if (!lavaLeft()) break
        // back to the path, eyes on lava that's still there (it swung to the finished side and off the lake)
        let tgt = null
        // the nearest lava (the first in scan order was the far north corner: a swing onto an empty rim and sky)
        { let bd = 1e9; const e = bot.entity.position
          for (let b2 = 0; b2 < L; b2++) for (let a2 = 0; a2 < 15; a2++) if (at(a2, b2, G - 1)?.name === 'lava') { const d = Math.hypot(x0 + a2 - e.x, z0 + b2 - e.z); if (d < bd) { bd = d; tgt = cell(a2, b2, -0.3) } } }
        if (sx !== 7) await stepTo(7, sz, tgt || cell(7, Math.min(L - 1, sz + 4), -0.3))
      }
    }
    // mop-up: lava the side pours missed (4 cells were still orange in the final reveal) gets a pour of its
    // own, nearest first: walk to 2 cells short of it on obsidian, pour, watch it go black
    for (let m = 0; m < 4 && lavaLeft(); m++) {
      const e = bot.entity.position
      let best = null, bd = 1e9
      for (let a = 0; a < 15; a++) for (let b = 0; b < L; b++) {
        if (at(a, b, G - 1)?.name !== 'lava') continue
        const d = Math.hypot(x0 + a + 0.5 - e.x, z0 + b + 0.5 - e.z); if (d < bd) { bd = d; best = [a, b] }
      }
      const [a, b] = best
      // pour on the top of an obsidian neighbour (a full bucket ignores fluids: clicking the lava cell would hit
      // the stone under it); the water runs off onto the lava. Stand one further cell back on obsidian.
      const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([da, db]) => [a + da, b + db, da, db])
        .filter(([na, nb2, da, db]) => at(na, nb2, G - 1)?.name === 'obsidian' && at(na + da, nb2 + db, G - 1)?.name === 'obsidian')
      if (!nbs.length) { ctx.log('mop-up: no obsidian next to lava at', a, b); break }
      nbs.sort((p1, p2) => Math.hypot(x0 + p1[0] - e.x, z0 + p1[1] - e.z) - Math.hypot(x0 + p2[0] - e.x, z0 + p2[1] - e.z))
      const [na, nb2, da, db] = nbs[0]
      ctx.mark(`mop${m}a`)
      await stepTo(na + da, nb2 + db, cell(a, b, -0.3))
      ctx.mark(`mop${m}b`)
      ctx.log('mop-up pour on', na, nb2, 'for lava at', a, b)
      await pourScoop(na, nb2, cell(na, nb2, -0.04), 7, 300)   // (14: a big sheet, and 1.8 s waiting for it to drain before the payoff)
      // watch it go black (the camera turned away before it did: review)
      await ctx.easeLookAt(cell(a, b, -0.6), 250)
      for (let k = 0; k < 12 && at(a, b, G - 1)?.name === 'lava'; k++) await bot.waitForTicks(1)
    }
    // the payoff lands on the last lava going (on screen), then a wide look over the whole black lake
    for (let k = 0; k < 10 && lavaLeft(); k++) await bot.waitForTicks(1)
    ctx.log('lava left', lavaLeft())
    // up and out over the middle of the lake while the last water drains, and the payoff once it's gone: the
    // whole black lake (end_look on a water sheet: the song drop hit blue, review)
    const waterLeft = () => { let n = 0; for (let a = 0; a < 15; a++) for (let b = 0; b < L; b++) if (/water/.test(at(a, b, G)?.name || '')) n++; return n }
    ctx.mark('drain_a')   // the wait for the last water to drain, at 2x
    const mid = cell(7, Math.floor(L / 2), 0)
    ctx.easeLookAt(mid, 900)
    for (let k = 0; k < 40 && (waterLeft() || k < 18); k++) await bot.waitForTicks(1)   // at least the 900 ms turn
    ctx.log('water left at end_look', waterLeft())
    ctx.mark('end_look')
    // a slow pan along the black field (no still hold on the reveal)
    await ctx.easeLook(bot.entity.yaw + 0.35, bot.entity.pitch + 0.05, 1000)
    bot.removeListener('blockUpdate', onBlock)

    let lava = 0, obs = 0
    for (let a = 0; a < 15; a++) for (let b = 0; b < L; b++) { const n = at(a, b, G - 1).name; if (n === 'lava') lava++; if (n === 'obsidian') obs++ }
    ctx.log(`lake: obsidian ${obs}, lava ${lava}, converted ${converted}, at z ${(bot.entity.position.z - z0).toFixed(1)}`)
    return obs > 15 * L - 25 && !ctx.died                          // (it walks back south now: no end position check)
  }
}
