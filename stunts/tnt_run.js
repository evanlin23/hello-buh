// "POV: the floor is TNT 💀" (~31 s): nine lanes in one big field, a hard cut between them, a wave counter
// (1/9 ... 9/9) as the spine. Every lane is a different escape, ~3 s each, and opens mid-action:
//   1 run       a wall rolls in, it turns and runs, glancing back
//   2 dodge     one fast line of TNT straight at it, it sidesteps out of the line
//   3 sky       TNT rains from above all round it, it looks up and weaves
//   4 floor     the floor it's backing over is TNT, lit behind it: the chain chases it
//   5 cart      a primed TNT minecart rolls at it down a rail, it jumps off the track
//   6 wall      it throws up an obsidian wall and the wave breaks on it
//   7 dig       it digs down and the wave rolls over the hole
//   8 drop      it drops down a water shaft as the wave arrives
//   9 all       everything at once: a wall, the sky and the sides. It doesn't make it (death screen)
// Normal difficulty (TNT damage scales with it; peaceful zeroes it). Hearts refill across each cut.
// mineflayer yaw 0 = north: threats come from the north, the bot starts facing them.
const N = 9
const LANES = [...Array(N).keys()].map(i => (i - (N - 1) / 2) * 32)   // 32 apart: blasts don't reach the next lane
const SUBS = ['1/9: run', '2/9: dodge it', '3/9: from the SKY', '4/9: the floor is TNT', '5/9: TNT minecart', '6/9: wall it off', '7/9: dig down', '8/9: drop', '9/9: EVERYTHING']

module.exports = {
  name: 'tnt_run',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: the floor is TNT 💀',
  edit: {
    subsY: 0.15, caption: 'POV: the floor is TNT 💀', red: 'TNT', song: 'songs/ncs/industry_kiss.mp3', dropAt: 'death', startAt: 'wave:0.0', deathScreen: true, endAfter: 'death:1.0',
    subs: SUBS.map((s, i) => ['wave', s, 1.4, i])
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd('/gamerule keep_inventory true')   // nothing drops on the death: the dropped items drew as bare shadows on the death screen (engine)
    await ctx.cmd('/difficulty normal')
    const W = 150
    for (let z0 = z - 96; z0 <= z + 28; z0 += 4) {   // (to z - 64 the cut cliff showed on lane 8's horizon)   // one field for all nine lanes, cleared high and wide (cut faces showed)
      const z1 = z0 + 3
      for (let y0 = floor + 1; y0 <= floor + 37; y0 += 6) await ctx.cmd(`/fill ${x - W} ${y0} ${z0} ${x + W} ${y0 + 5} ${z1} air`)
      await ctx.cmd(`/fill ${x - W} ${floor} ${z0} ${x + W} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - W} ${floor - 4} ${z0} ${x + W} ${floor - 1} ${z1} dirt`)
    }
    await ctx.cmd('/kill @e[type=!player,distance=..300]')
    const L = (i) => x + LANES[i]
    // 4: a 3-wide TNT floor running north from the start
    await ctx.cmd(`/fill ${L(3)} ${floor} ${z - 34} ${L(3)} ${floor} ${z - 14} tnt`)   // 1 wide (3 wide flung primed TNT everywhere and killed it)
    // 5: a rail line from 26 north of the start to the start
    await ctx.cmd(`/fill ${L(4)} ${floor + 1} ${z - 40} ${L(4)} ${floor + 1} ${z - 9} rail`)
    // 8: a 14-deep shaft with water at the bottom, 3 north of the start
    // 3x3 (a 1x1: it drifted a block east running at it and ran straight over the hole)
    await ctx.cmd(`/fill ${L(7) - 1} ${floor - 14} ${z - 14} ${L(7) + 1} ${floor} ${z - 12} air`)
    await ctx.cmd(`/fill ${L(7) - 2} ${floor - 15} ${z - 15} ${L(7) + 2} ${floor - 15} ${z - 11} stone`)
    await ctx.cmd(`/fill ${L(7) - 1} ${floor - 14} ${z - 14} ${L(7) + 1} ${floor - 14} ${z - 12} water`)
    await ctx.hotbar(['diamond_sword', ['obsidian', 16], 'diamond_shovel', ['cobblestone', 16]])
    await ctx.tpCheck(L(0) + 0.5, floor + 1, z - 10 + 0.5, 180, 4)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, floor } = this
    const L = (i) => x + LANES[i]
    // Motion 0: a summoned TNT otherwise gets vanilla's random hop and lands up to ~2 off its spot (round the end of the wall)
    const tnt = (tx, ty, tz, fuse, extra = ',Motion:[0.0,0.0,0.0]') => bot.chat(`/summon tnt ${tx.toFixed(2)} ${ty.toFixed(2)} ${tz.toFixed(2)} {fuse:${fuse}${extra}}`)
    let rnd = 7; const R = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647 }
    // move along a world direction (dx, dz) whatever the view: controls picked against it
    const steer = (dx, dz, sprint = false) => {
      const yaw = bot.entity.yaw, len = Math.hypot(dx, dz) || 1
      const f = (dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / len, r = (dx * Math.cos(yaw) + dz * -Math.sin(yaw)) / len
      bot.setControlState('forward', f > 0.35); bot.setControlState('back', f < -0.35)
      bot.setControlState('right', r > 0.35); bot.setControlState('left', r < -0.35)
      bot.setControlState('sprint', sprint && f > 0.35)
    }
    const stop = () => { for (const c of ['forward', 'back', 'left', 'right', 'sprint', 'jump', 'sneak']) bot.setControlState(c, false) }
    // ease the view toward a point a little each tick
    const lookAt = async (p, k = 0.3) => {
      const d = p.minus(bot.entity.position.offset(0, 1.62, 0))
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      await bot.look(bot.entity.yaw + dy * k, bot.entity.pitch + (pitch - bot.entity.pitch) * k, true)
    }
    const cut = async (i, yawDeg = 180, pitchDeg = 4, dz = 0) => {
      const tx = L(i) + 0.5, tz = z - 10 + 0.5 + dz
      for (let a = 0; ; a++) {
        bot.chat(`/tp @s ${tx} ${floor + 1} ${tz} ${yawDeg} ${pitchDeg}`)
        let ok = false
        for (let t = 0; t < 10 && !ok; t++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.x - tx) < 0.1 && Math.abs(bot.entity.position.z - tz) < 0.1 }
        if (ok) break
        if (a === 4) throw new Error('teleport did not stick')
      }
      bot.chat('/effect give @s instant_health 1 5 true')
      bot.chat('/effect clear @s')
      try { await bot.waitForChunksToLoad() } catch (e) {}   // lane 9 opened on void and a floating cut-through chunk
      await bot.waitForTicks(4)
    }
    // a front of TNT rows advancing south from `front` (z), every `every` ticks, `dxs` wide around `cx`
    const wall = (cx, front, every, dxs, untilZ) => {
      let n = 0, on = true, f = front
      const h = () => {
        if (!on || n++ % every) return
        if (f >= untilZ) { on = false; return }
        for (const dx of dxs) tnt(cx + dx + 0.5, floor + 1, f + 0.5, 2)
        f += 1
      }
      bot.on('physicsTick', h)
      return { stop: () => { on = false; bot.removeListener('physicsTick', h) }, get front () { return f } }
    }
    let reached = -1
    const lane = async (i, fn) => {
      if (ctx.died) return
      reached = i
      ctx.mark('wave', { n: i + 1 })
      await fn()
      stop()
      if (!ctx.died && i < N - 1) ctx.mark('escaped', { n: i + 1 })
    }
    const sz = z - 10 + 0.5

    // 1 RUN: the wall is already rolling in; it turns and sprints away, glancing back over its shoulder
    await lane(0, async () => {
      const w = wall(L(0), sz - 15, 3, [-3, -1, 1, 3], sz + 30)   // starts close: big in frame at 0.2 s (from 24 out it was a speck, then a 3.6 s smoke loop)
      for (let k = 0; k < 70 && !ctx.died; k++) {
        if (k < 10) await lookAt(new Vec3(L(0) + 0.5, floor + 1, w.front), 0.3)
        else if (k < 40) { await lookAt(bot.entity.position.offset(0, 1.62, 12), 0.25); steer(0, 1, true) }   // south, running
        else { await lookAt(new Vec3(L(0) + 0.5, floor + 1.5, w.front), 0.2); steer(0, 1) }                  // glance back: it's close
        if (k >= 10 && k < 40) steer(0, 1, true)
        if (w.front > bot.entity.position.z - 9) { w.stop(); break }
        await bot.waitForTicks(1)
      }
      w.stop()
      await bot.waitForTicks(8)
    })
    // 2 DODGE: one fast line straight down the lane; it sidesteps east out of it and watches it rip past
    await cut(1)
    await lane(1, async () => {
      const w = wall(L(1), sz - 50, 1, [0], sz + 12)            // 20 b/s; it's ~10 out of the line when it passes
      for (let k = 0; k < 70 && !ctx.died; k++) {
        await lookAt(new Vec3(L(1) + 0.5, floor + 1, Math.min(w.front, bot.entity.position.z)), 0.25)
        steer(bot.entity.position.x < L(1) + 11 ? 1 : 0, 0)
        if (w.front > sz + 10) break
        await bot.waitForTicks(1)
      }
      w.stop()
      await bot.waitForTicks(6)
    })
    // 3 SKY: TNT dropping all round it from 22 up, fuse timed to blow as it lands; it looks up, then weaves
    await cut(2, 180, -30)
    await lane(2, async () => {
      for (let k = 0; k < 62 && !ctx.died; k++) {
        if (k % 4 === 0 && k < 44) {
          const a = R() * 1.2 - 0.6, r = 7 + R() * 2, p = bot.entity.position   // in front, 7-9 out: they land in view
          tnt(p.x + Math.sin(a) * r, floor + 23, p.z - Math.cos(a) * r, 46)
        }
        if (k < 20) await lookAt(bot.entity.position.offset(0, 30, -10), 0.15)
        else await lookAt(bot.entity.position.offset(Math.sin(k / 9) * 5, -1, -8), 0.12)
        steer(k > 20 ? (Math.sin(k / 6) > 0 ? 1 : -1) : 0, 0)
        await bot.waitForTicks(1)
      }
    })
    // 4 FLOOR: it backs south off a TNT floor; the far end is lit and the chain runs down it after it
    await cut(3, 180, 20, -6)           // standing on the near end of the TNT floor (z - 34 .. z - 14)
    await lane(3, async () => {
      for (let k = 0; k < 66 && !ctx.died; k++) {
        // lit once it's ~9 away, so the first blast can't reach it; then the chain chases it down the floor
        if (k === 0) { bot.chat(`/setblock ${L(3)} ${floor} ${z - 34} air`); tnt(L(3) + 0.5, floor + 0.5, z - 34 + 0.5, 1) }   // the far end, ~18 away: the chain runs about as fast as it backs
        await lookAt(new Vec3(L(3) + 0.5, floor, bot.entity.position.z - 9), 0.2)
        steer(0, bot.entity.position.z < z - 2 ? 1 : 0)
        await bot.waitForTicks(1)
      }
    })
    // 5 CART: a primed TNT minecart comes down the rail at it; it jumps off the track to the west
    await cut(4)
    await lane(4, async () => {
      bot.chat(`/summon tnt_minecart ${L(4) + 0.5} ${floor + 1.1} ${z - 30 + 0.5} {fuse:40,Motion:[0.0,0.0,0.6]}`)   // blows ~6 from it, after the jump (from 38 out it went off 15+ away)
      for (let k = 0; k < 60 && !ctx.died; k++) {
        const cart = Object.values(bot.entities).find(e => e.name === 'tnt_minecart')
        await lookAt(cart ? cart.position.offset(0, 0.5, 0) : new Vec3(L(4) + 0.5, floor + 1, z - 30), 0.3)
        if (k > 12 && k < 34) { steer(-1, 0.3); bot.setControlState('jump', k === 14) }
        else stop()
        await bot.waitForTicks(1)
      }
    })
    // 6 WALL: a wave coming; it slams down a 3-wide obsidian wall in front and the wave breaks on the far side
    await cut(5, 180, 30)
    await lane(5, async () => {
      ctx.select(1)
      const w = wall(L(5), sz - 18, 2, [-1, 0, 1], sz - 5)       // no wider than the wall: blasts round its ends reached it
      const spots = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, 1], [-1, 1], [1, 1]]   // 5 wide at the foot, 3 wide on top
      for (const [dx, dy] of spots) {
        const q = { x: L(5) + dx, y: floor + dy, z: Math.floor(sz) - 2 }
        await lookAt(new Vec3(q.x + 0.5, q.y + 1, q.z + 0.5), 0.6)
        bot._client.write('block_place', { hand: 0, location: q, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        bot.swingArm(); ctx.sound('block.stone.place', 1)
        await bot.waitForTicks(2)
      }
      // step back two and watch the wave break on the far side, over the top of the wall (jammed against it the
      // screen was obsidian, then it turned round)
      for (let k = 0; k < 34 && !ctx.died; k++) { steer(0, k < 9 ? 1 : 0); await lookAt(new Vec3(L(5) + 0.5, floor + 2.2, sz - 7), 0.25); await bot.waitForTicks(1) }
      stop()
      w.stop()
    })
    // 7 DIG: it digs straight down two blocks and the wave rolls over the hole (it watches the sky light up)
    await cut(6, 180, 70)
    await lane(6, async () => {
      ctx.select(2)
      const w = wall(L(6) + 7, sz - 30, 2, [0], sz + 8)        // passes 6.5 to the side once it's three deep (closer took it to 1 heart)
      for (let d = 0; d < 3; d++) {
        const b = bot.blockAt(bot.entity.position.offset(0, -1, 0).floored())
        if (b && b.name !== 'air') { try { await bot.dig(b, true) } catch (e) {} }
        await bot.waitForTicks(1)
      }
      for (let k = 0; k < 40 && !ctx.died; k++) { await lookAt(bot.entity.position.offset(2.5, 10, -1), 0.15); if (w.front > sz + 2) { await bot.waitForTicks(10); break } await bot.waitForTicks(1) }   // cut ~0.5 s after it passes
      w.stop()
    })
    // 8 DROP: the wave's on it; it runs at the shaft and drops in, the blasts going off up above
    await cut(7, 180, 10)
    await lane(7, async () => {
      ctx.select(0)
      let inWater = 0
      const w = wall(L(7), sz - 22, 3, [-2, 0, 2], sz + 4)   // at the shaft's lip as it drops (30 out: specks; 16: it got there first, dead)
      for (let k = 0; k < 70 && !ctx.died; k++) {
        const p = bot.entity.position
        if (p.y > floor - 1) { steer(0, -1, true); await lookAt(new Vec3(L(7) + 0.5, floor, z - 13 + 0.5), 0.3) }
        else { stop(); await lookAt(p.offset(0, 20, 0.5), 0.25) }
        if (bot.entity.isInWater && (inWater = inWater + 1) > 16) break   // cut ~0.8 s after the splash (a 2 s STILL staring up the shaft)
        await bot.waitForTicks(1)
      }
      w.stop()
    })
    // 9 EVERYTHING: a wall from the front, the sky, both sides. It backs off, looks up... and doesn't make it
    await cut(8)
    await lane(8, async () => {
      // ~3.5 s: the sky and the sides near-missing it for 2 s while the wall comes, then it all closes in
      const w = wall(L(8), sz - 26, 3, [-4, -2, 0, 2, 4], sz + 30)
      for (let k = 0; k < 160 && !ctx.died; k++) {
        const p = bot.entity.position, close = k > 84   // ~3 s of near misses, then it all closes in (keeps the Short at 30 s+)
        if (k % 3 === 0) { const a = R() * 2 * Math.PI, r = (close ? 3 : 10) + R() * 4; tnt(p.x + Math.sin(a) * r, floor + 18, p.z - Math.cos(a) * r, 30) }
        if (k % 6 === 0 && k > 6) { const sd = close ? 5 : 9; tnt(p.x - sd + 0.5, floor + 1, p.z + 0.5, 4); tnt(p.x + sd + 0.5, floor + 1, p.z + 0.5, 4) }
        if (close && w.front > p.z - 4) for (const [dx, dz] of [[0, 0], [1, 1], [-1, 1]]) tnt(p.x + dx, floor + 1, p.z + dz, 4)
        await lookAt(k < 30 ? new Vec3(L(8) + 0.5, floor + 1, w.front) : p.offset(Math.sin(k / 8) * 8, 6, -8), 0.2)
        steer(0, 1)
        await bot.waitForTicks(1)
      }
      w.stop()
    })
    stop()
    await bot.waitForTicks(30)                                   // the death screen
    ctx.log('died', ctx.died, 'deaths', ctx.deaths, 'in lane', reached + 1)
    return ctx.died && ctx.deaths === 1 && reached === N - 1   // the death has to be the finale's
  }
}
