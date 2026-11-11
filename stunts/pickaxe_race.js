// "ranking every pickaxe ⛏️ 💀" (~30 s, six beats + a finale): a stone wall in a field; wooden, stone,
// iron and diamond pickaxe each mine a fresh 3x3 section of it (side by side), with real survival
// digging (bot.dig, the server checks the dig time). Each beat gets a subtitle with the tier per tool.
// Gold (fastest plain pickaxe) breaks on its last block; netherite + efficiency V (with the Haste)
// instamines; then a TNT at every pillar chains down the wall and takes it out: "TNT: ??? tier".
// Everything is mined under Haste II (invisible; a beacon gives it) so the beats fit in a Short;
// the ranking and the ratios between the tools are vanilla's.

const TOOLS = [   // six beats + the TNT run, ~30 s (owner: 30 s minimum; netherite repeated diamond: cut)
  { item: 'wooden_pickaxe', label: 'wooden', result: 'wooden: D tier' },
  { item: 'stone_pickaxe', label: 'stone', result: 'stone: C tier' },
  { item: 'iron_pickaxe', label: 'iron', result: 'iron: B tier' },
  { item: 'diamond_pickaxe', label: 'diamond', result: 'diamond: A tier' },
  { item: 'golden_pickaxe[damage=23]', label: 'gold', result: 'gold: S tier?? it broke' },    // fastest plain pickaxe; 9 uses left: it breaks on the last block
  { item: 'netherite_pickaxe[enchantments={efficiency:5}]', label: 'efficiency V + haste', result: 'efficiency V + haste: GOD tier' }   // the instamine needs the Haste: say so
]
const SPACING = 4             // wall sections: 3 wide + a 1-block pillar between them

// subtitles: the tool, then its tier once its section is open. (Measured times were shown before,
// but under the invisible Haste they ran ~2x vanilla and read as fake.)
function subs () {
  const out = []
  TOOLS.forEach((t, i) => {
    out.push(['beat', `${t.label}...`, 9, i])
    out.push(['mined', t.result, 9, i])
  })
  out.push(['tntrun', 'TNT...', 9, 0])   // a beat after the light, so 'GOD tier' gets read
  out.push(['boom', 'TNT: ??? tier', 9, 0])
  return out
}

module.exports = {
  name: 'pickaxe_race',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'ranking every pickaxe ⛏️ 💀',
  get edit () {
    return { subsY: 0.15, caption: 'ranking every pickaxe ⛏️ 💀', red: 'every', dropAt: 'boom', startAt: 'beat:-0.05', endAfter: 'settle:-0.9',   // 1.3 s after the last blast: the visible debris is down ~0.7 s after it; settle:0.6 held a still frame 2 s (independent review)
      speed: [
      // each tier's middle blocks jump-cut, edge to edge on the short rests the bot takes at those two blocks (blk<tier>_<n>:
      // before block n; the whip check: a cut inside a turn reads as one snap, r:r38374d), each tier shorter on screen
      // than the last (~1.1 / 0.7 / 0.55 / 0.5 / 0.4 s a block: 4, 5, 5, 5, 5 blocks shown; the instamine all 9)
      ['blk0_3', 'blk0_8', 'cut'], ['blk1_3', 'blk1_7', 'cut'], ['blk2_3', 'blk2_7', 'cut'], ['blk3_3', 'blk3_7', 'cut'], ['blk4_3', 'blk4_7', 'cut'],
      ['tntwalk', 'lit', 3], ['lit', 'boom:-1.6', 2],   // the walk placing the TNT (11.6 s with every place aimed) at 3x
      ['boom:-1.6', 'boom:-0.2', 'cut'],   // the end of the fuse: the bot had stopped, 0.8 s frozen before the song-drop blast
      // the chain after the first (song-drop) blast at 1.75x: 6.75 s of near-identical booms
      ['boom:0.5', 'lastboom:-0.4', 1.75]], subs: subs(),
      flash: [['boom', 0, 0.6], ['lastboom', 0, 0.5]], sfx: [['pop', 'beat'], ['dip', 'boom', 0.3], ['impact', 'boom'], ['dip', 'lastboom', 0.45], ['gamedip', 'lastboom', 0.4], ['impact', 'lastboom', { gain: 1.4 }], ['boom', 'lastboom']],
      // gamedip: the chain's previous blast 0.54 s before the last (+ the limiter) flattened its hit in the NCS mix (pace)
      // ends 0.6 s after the last blast's debris settles (lib/settle.js), never on a lit TNT (r:r24d99a, independent review)
        // a pop on the first tier card at 0.05 s (pace: sound by 0.3 s)
      punch: [['boom', 0, 1.12], ['boom:1.3', 0, 1.06], ['boom:2.76', 0, 1.06]], shake: [['boom', 0, 10], ['boom:1.3', 0, 6], ['boom:2.76', 0, 6]],
      // (boom:1.3 / boom:2.76: the chain's 3rd and 5th blasts in output seconds of this take, 1.75x: a 3.6 s stretch of
      // same-looking booms under the song had no new event, pace dead BLOCK (the punches alone don't register); a card on
      // the 4th: the chain keeps going. Re-check the offsets after a re-record)
      cards: [['boom:1.95', 'CHAIN REACTION', 1.0, 'yellow']] }   // pace: a picture change on the payoff (the blast is small and far)   // speed: the TNT walk, 1.5x (6 s at 1x)
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    // a wide, deep field, cleared 24 up: the old 72x62 clear left cut dirt faces on the horizon in the TNT walk (review)
    for (let z0 = z - 60; z0 <= z + 40; z0 += 8) {
      const z1 = Math.min(z0 + 7, z + 40)
      await ctx.cmd(`/fill ${x - 70} ${floor + 1} ${z0} ${x + 74} ${floor + 24} ${z1} air`)
      await ctx.cmd(`/fill ${x - 70} ${floor} ${z0} ${x + 74} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 70} ${floor - 3} ${z0} ${x + 74} ${floor - 1} ${z1} dirt`)
    }
    await ctx.cmd('/kill @e[type=!player,distance=..150]')   // polar bears and pigs wandered through the finale
    // the wall: one block thick (mining a section opens a window onto the field), 4 high
    this.wz = z - 4
    this.x0 = x - 12                                       // first section: x0..x0+2
    const xa = this.x0 - 2, xb = this.x0 + SPACING * (TOOLS.length - 1) + 4
    await ctx.cmd(`/fill ${xa} ${floor + 1} ${this.wz} ${xb} ${floor + 4} ${this.wz} stone`)
    // pillars between the sections in cobblestone, so each 3x3 reads as its own wall
    for (let i = 0; i <= TOOLS.length; i++) await ctx.cmd(`/fill ${this.x0 - 1 + i * SPACING} ${floor + 1} ${this.wz} ${this.x0 - 1 + i * SPACING} ${floor + 4} ${this.wz} cobblestone`)
    await ctx.hotbar([...TOOLS.map(t => t.item), ['tnt', TOOLS.length + 1], 'flint_and_steel'])
    await ctx.cmd('/effect give @s haste infinite 1 true')   // Haste II (a beacon's best; V was command-only, every plain tool ~2x vanilla): netherite + efficiency V still instamines
    await ctx.cmd('/effect give @s saturation infinite 1 true')
    // stand back so the whole section stays in frame (reach raised to match, invisible on screen)
    this.stand = (i) => ({ x: this.x0 + i * SPACING + 1.5, z: this.wz + 4.0 })   // within vanilla's 4.5-block reach
    const s = this.stand(0)
    await ctx.tpCheck(s.x, floor + 1, s.z, 180, 20)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { floor, wz } = this
    const A = require('../lib/act')(ctx)
    // digging sounds like the vanilla client: a hit sound every 4 ticks while digging
    let digTicks = 0
    const onTick = () => {
      if (bot.targetDigBlock) { if (digTicks++ % 4 === 0) ctx.sound('block.stone.hit', 0.25, 0.5) } else digTicks = 0
    }
    bot.on('physicsTick', onTick)
    bot.on('playerCollect', (collector) => { if (collector === bot.entity) ctx.sound('entity.item.pickup', 0.2, 1.4 + Math.random() * 0.6) })
    await bot.look(0, -0.15, true)
    await bot.waitForTicks(2)
    for (let i = 0; i < TOOLS.length; i++) {
      const fast = i === TOOLS.length - 1
      if (i > 0) {
        // strafe right to the next fresh section, eyes on the wall, switching tools on the way
        const tx = this.stand(i).x
        ctx.select(i)
        ctx.easeLook(0, -0.15, 300)
        for (let k = 0; k < 40 && Math.abs(bot.entity.position.x - tx) > 0.15; k++) {
          bot.setControlState('right', bot.entity.position.x < tx - 0.15)
          bot.setControlState('left', bot.entity.position.x > tx + 0.15)
          await bot.waitForTicks(1)
        }
        bot.setControlState('right', false); bot.setControlState('left', false)
      } else ctx.select(i)
      ctx.mark('beat', { n: i })   // (the last result stays up during the strafe)
      await bot.waitForTicks(fast ? 6 : 1)
      const xs = this.x0 + i * SPACING
      // snake: top row left->right, middle right->left, bottom left->right
      const order = []
      for (const [r, dir] of [[3, 1], [2, -1], [1, 1]]) for (let c = 0; c < 3; c++) order.push(new Vec3(xs + (dir > 0 ? c : 2 - c), floor + r, wz))
      const t0 = ctx.tick
      if (fast) ctx.mark('instamine')
      let nb = 0
      for (const p of order) {
        // a short rest on the dug block before turning to the next, marked in the middle: the edit's jump cuts over
        // the middle blocks go edge to edge on these (nine identical digs were 8.6 s of the video; the ranking keeps
        // the real speed), so no cut joins two turning views (whip check, r:r38374d)
        // (only at the cut edges: 3 ticks still before the mark and 4 after, the whip check's window either side)
        if (!fast && (nb === 3 || nb === (i === 0 ? 8 : 7))) { await bot.waitForTicks(3); ctx.mark(`blk${i}_${nb}`); await bot.waitForTicks(4) }
        nb++
        const b = bot.blockAt(p)
        if (!b || b.name === 'air') continue
        if (fast) {
          // instant mine (Efficiency V + Haste): aimed by construction (lib/act.js, r:rffba12), no destroy delay
          // after an instant break (vanilla), start + finish in one tick
          try { await A.dig(b, { instant: true, delay: 0, sound: null }) } catch (e) { ctx.log('dig', e.message) }
        } else {
          // the aim onto the block, then a real survival dig at the tool's speed (lib/act.js)
          try { await A.dig(b) } catch (e) { ctx.log('dig', e.message) }
        }
        ctx.sound('block.stone.break', 1, 0.8); ctx.particles('block', p, { block: 'stone' })
      }
      const ticks = ctx.tick - t0
      await bot.waitForTicks(3)
      const left = order.filter(p => { const b = bot.blockAt(p); return b && b.name !== 'air' }).length
      ctx.log(TOOLS[i].label, 'mined in', ticks, 'ticks; blocks left', left)
      if (left) return false
      ctx.mark('mined', { n: i, ticks, secs: (ticks / 20).toFixed(1) })
      if (TOOLS[i].item.startsWith('golden')) { ctx.sound('entity.item.break', 1); ctx.log('gold left in hand:', bot.heldItem && bot.heldItem.name) }
      // look through the hole a moment
      await ctx.easeLook(0, -0.1, fast ? 250 : 150)
      if (fast) await bot.waitForTicks(4)        // (14 read as a 0.7 s pause before the finale)
    }
    // finale: "TNT: ??? tier". A TNT at the foot of every pillar: light the far one first, then strafe
    // back along the wall placing the rest while its fuse runs; the chain follows the bot down the wall
    // and takes it all out (no fuse stare: the 4 s fuse is spent placing)
    ctx.mark('finale')
    const NP = TOOLS.length + 1                       // pillars 0..TOOLS.length
    const pil = (j) => ({ x: this.x0 - 1 + j * SPACING, y: floor, z: wz + 1 })   // the grass in front of pillar j
    const T = TOOLS.length, F = TOOLS.length + 1      // hotbar slots: tnt, flint and steel
    let booms = 0, boomAt = null
    const onBoom = (p) => {
      const c = p.center || p
      boomAt = new Vec3(+c.x, +c.y, +c.z)
      if (++booms === 1) ctx.mark('boom')
      if (booms === NP) ctx.mark('lastboom')
      ctx.log('boom', booms, 'tick', ctx.tick)
    }
    bot._client.on('explosion', onBoom)
    // the TNT walk plays at 3x: its turns at <= 70 deg/s, so on screen they stay under 240 (whip check: 165 deg/s turns
    // showed at ~495 deg/s, r:r38374d)
    const AW = require('../lib/act')(ctx, { turnSpeed: 70, turnAccel: 500 })
    // the TNT on the grass at a pillar's foot, aimed by construction (lib/act.js)
    const place = async (q) => { try { await AW.place(new Vec3(q.x, floor + 1, q.z), { against: new Vec3(q.x, floor, q.z), sound: null }) } catch (e) { ctx.log('place', e.message) } }
    ctx.select(T)
    ctx.mark('tntwalk')   // the whole walk at 2.2x (6 s of the same place-swing at 1.5x)
    // walk west along the wall 3 out, controls picked against the view each tick so the motion stays on the
    // world axis (strafing 'left' while looking at a pillar foot drifted it 8-12 blocks off the wall: out of
    // reach, the server ignored the placements), eyes on the next pillar's foot
    const goTo = async (tx, aim) => {
      const tz = wz + 3.0
      for (let k = 0; k < 60; k++) {
        const e = bot.entity.position
        const dx = tx - e.x, dzz = tz - e.z
        if (Math.abs(dx) < 0.35 && Math.abs(dzz) < 0.5) break
        const eye = e.offset(0, 1.62, 0), d = aim.minus(eye)
        const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        await AW.view({ yaw: bot.entity.yaw + dy, pitch })   // one governed step toward the pillar (70 deg/s)
        const ny = bot.entity.yaw
        const len = Math.hypot(dx, dzz), wx = dx / len, wzz = dzz / len
        const f = wx * -Math.sin(ny) + wzz * -Math.cos(ny), rr = wx * Math.cos(ny) + wzz * -Math.sin(ny)
        bot.setControlState('forward', f > 0.35); bot.setControlState('back', f < -0.35)
        bot.setControlState('right', rr > 0.35); bot.setControlState('left', rr < -0.35)
        await bot.waitForTicks(1)
      }
      for (const c of ['forward', 'back', 'left', 'right']) bot.setControlState(c, false)
    }
    // a TNT at the foot of every pillar, east to west, all real placements (within reach), then light the
    // last one: the chain runs back along the wall away from the bot, which backs off and follows it
    for (let j = NP - 1; j >= 0; j--) {
      const q = pil(j), foot = new Vec3(q.x + 0.5, floor + 0.7, q.z + 0.5)
      await goTo(q.x + 1.5, new Vec3(q.x + 0.5, floor + 2.2, q.z))   // eyes on the pillar, not the grass at its foot (6 s of grass)
      await place(q); ctx.sound('block.grass.place', 1)
      await bot.waitForTicks(2)
      const tq = new Vec3(q.x, floor + 1, q.z)
      for (let t = 0; t < 2 && bot.blockAt(tq)?.name !== 'tnt'; t++) { await place(q); await bot.waitForTicks(2) }
      if (bot.blockAt(tq)?.name !== 'tnt') { ctx.log('tnt place fallback at pillar', j, 'bot at', bot.entity.position.toString()); bot.chat(`/setblock ${q.x} ${floor + 1} ${q.z} tnt`); bot.chat(`/clear @s tnt 1`); await bot.waitForTicks(1) }
      if (j === NP - 2) ctx.mark('tntrun')
    }
    // light the one at your feet
    const q0 = pil(0)
    ctx.select(F)
    try { await A.use(new Vec3(q0.x, floor + 1, q0.z), { sound: 'item.flintandsteel.use' }) } catch (e) { ctx.log('light', e.message) }
    ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    { const free = [...Array(9).keys()].find(h => !bot.inventory.slots[36 + h]); if (free !== undefined) ctx.select(free) }   // an empty hand: the flint and steel covered a third of every blast
    const placed = [...Array(NP).keys()].filter(j => bot.blockAt(new Vec3(pil(j).x, floor + 1, pil(j).z))?.name === 'tnt').length
    ctx.log('tnt placed', placed, 'of', NP, '(one lit); booms so far', booms)
    // back away south (whatever the view: controls chosen against it), following the chain with the camera
    let look = boomAt || new Vec3(pil(0).x + 0.5, floor + 1.5, wz + 1)   // the lit one, then each blast down the wall
    let quiet = 0, last = booms
    for (let k = 0; k < 360 && booms < NP && quiet < 60; k++) {
      // before the first blast: a slow pan east along the row of lit TNT (it stood frozen ~1.7 s on the fuse)
      // before the first blast: on the lit one (the pan east put the song-drop blast at the frame's edge)
      // after a blast, the eyes keep drifting over the smoke and debris (lint: the wait between blasts read as
      // nobody moving, and the settle gate forbids cutting it while the debris flies)
      const goal = boomAt ? boomAt.offset(1.6 * Math.sin(k / 9), 0.6 * Math.sin(k / 7), 0) : new Vec3(pil(0).x + 0.5, floor + 1.4, wz + 1)
      look = look.plus(goal.minus(look).scaled(0.12))
      const eye = bot.entity.position.offset(0, 1.62, 0), d = look.minus(eye)
      const yaw = Math.atan2(-d.x, -d.z)
      await bot.look(yaw, Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
      // back off to ~10 out (further, the blasts were small and far), then walk east alongside the chain, ~7
      // behind the newest blast: a tracking shot down the wall. Controls picked against the view.
      const e0 = bot.entity.position
      let wx = 0, wzz = 0
      if (e0.z < wz + 10) wzz = 1
      else if (booms > 0 && boomAt && e0.x < boomAt.x - 5) wx = 1
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw)
      const f = wx * fx + wzz * fz, rr = wx * rx + wzz * rz
      bot.setControlState('forward', f > 0.3); bot.setControlState('back', f < -0.3)
      bot.setControlState('right', rr > 0.3); bot.setControlState('left', rr < -0.3)
      if (booms > 0) quiet = booms === last ? quiet + 1 : 0
      last = booms
      await bot.waitForTicks(1)
    }
    for (const c of ['back', 'forward', 'left', 'right']) bot.setControlState(c, false)
    ctx.log('booms', booms, 'of', NP)
    if (booms < NP) { ctx.log('chain broke'); return false }
    await bot.waitForTicks(24)
    bot.removeListener('physicsTick', onTick)
    await bot.waitForTicks(10)
    return !ctx.died
  }
}
