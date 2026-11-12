// "bro said TNT is a pickaxe 💀" (no-op fix 2026-11-12, docs/noop_audit_2026-11-12.md: "36 s mining the same wall; TNT
// tier = small craters" -> three beats, and the TNT erases the WHOLE wall). A stone wall in a field, two 3x2 sections
// marked off by cobblestone pillars. Beat 1: a nearly worn-out golden pickaxe (the fastest plain pickaxe) mines the
// first section on a timer and breaks on its last block. Beat 2: netherite + Efficiency V (with Haste II, which a
// beacon gives: invisible, and the instamine needs it, so the tier line says so) instamines the second. Beat 3: a row of
// TNT along the whole foot of the wall, lit at one end; the chain runs down the row and the whole wall is gone.
// Real survival digging and placing throughout (lib/act.js: every dig, place and light aimed, r:rffba12).

const TOOLS = [
  { item: 'golden_pickaxe[damage=26]', label: 'gold', result: 'gold: S tier?? it BROKE' },   // 6 uses left: it breaks on the last block
  { item: 'netherite_pickaxe[enchantments={efficiency:5}]', label: 'efficiency V + haste', result: 'efficiency V + haste: GOD tier' }
]
const SPACING = 4             // wall sections: 3 wide + a 1-block pillar between them
// each tier mines its whole section in one take with a timer (owner r:r52f94c: no cut inside a tier; a timer)
const ROWS = [[2, 1], [1, -1]]   // [row over the floor, direction]: the head-high row left->right, the bottom right->left
const CAPTION = 'bro said TNT is a pickaxe 💀'

function subs () {
  const out = []
  TOOLS.forEach((t, i) => {
    out.push(['beat', `${t.label}...`, 9, i])
    out.push(['mined', t.result, 9, i])
  })
  out.push(['tntrun', 'TNT...', 9, 0])
  out.push(['boom', 'TNT: ??? tier', 9, 0])
  return out
}

module.exports = {
  name: 'pickaxe_race',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  get edit () {
    return { subsY: 0.2, caption: CAPTION, red: 'TNT', dropAt: 'lastboom', startAt: 'beat:-0.05', endAfter: 'settle:0.6',
      // a speedrun timer per tier (edit.splits, r:r32b983): 0:00.00 on each tier's 'beat', frozen on its 'mined'
      splits: { reset: 'beat', split: 'mined', of: TOOLS.length, hide: 'finale' },
      speed: [
        ['mined0:0.6', 'beat1:-0.25', 'cut'],     // gold breaks -> straight to the netherite (fast cuts, r:r188b46)
        ['tntwalk', 'lit', 3],                     // the row of TNT going down (turns capped at 75 deg/s: 225 on screen)
        ['lit:0.4', 'boom:-0.5', 3.5]],            // the back-off during the fuse (a slow look: under 60 deg/s)
      subs: subs(),
      flash: [['boom', 0, 0.35], ['lastboom', 0, 0.6]],
      punch: [['boom', 0, 1.06], ['boom6', 0, 1.06], ['lastboom', 0, 1.12]], shake: [['boom', 0, 6], ['boom6', 0, 6], ['lastboom', 0, 10]],
      // the first blast and the last (the whole wall gone: the payoff, the song's drop on it after a 0.4 s dip)
      sfx: [['impact', 'beat', { gain: 1.0 }], ['impact', 'boom', { gain: 1.0 }], ['dip', 'lastboom', 0.4], ['impact', 'lastboom', { gain: 1.4 }]] }
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    // a wide, deep field, cleared 24 up (no cut dirt faces on the horizon behind the wall)
    for (let z0 = z - 60; z0 <= z + 40; z0 += 8) {
      const z1 = Math.min(z0 + 7, z + 40)
      await ctx.cmd(`/fill ${x - 50} ${floor + 1} ${z0} ${x + 50} ${floor + 24} ${z1} air`)
      await ctx.cmd(`/fill ${x - 50} ${floor} ${z0} ${x + 50} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 50} ${floor - 3} ${z0} ${x + 50} ${floor - 1} ${z1} dirt`)
    }
    await ctx.cmd('/kill @e[type=!player,distance=..150]')
    // the wall: one block thick, 3 high; the two sections plus a pillar and a stone column at each end
    this.wz = z - 4
    this.x0 = x - 4                                       // first section: x0..x0+2, second x0+4..x0+6
    this.xa = this.x0 - 2; this.xb = this.x0 + SPACING * (TOOLS.length - 1) + 4
    await ctx.cmd(`/fill ${this.xa} ${floor + 1} ${this.wz} ${this.xb} ${floor + 3} ${this.wz} stone`)
    for (let i = 0; i <= TOOLS.length; i++) await ctx.cmd(`/fill ${this.x0 - 1 + i * SPACING} ${floor + 1} ${this.wz} ${this.x0 - 1 + i * SPACING} ${floor + 3} ${this.wz} cobblestone`)
    // solid ground under the blast zone (the crater opened onto a frozen river under one take's field)
    await ctx.cmd(`/fill ${this.xa - 7} ${floor - 9} ${this.wz - 7} ${this.xb + 7} ${floor - 4} ${this.wz + 7} stone`)
    this.ntnt = this.xb - this.xa + 1
    await ctx.hotbar([...TOOLS.map(t => t.item), ['tnt', this.ntnt + 2], 'flint_and_steel'])
    await ctx.cmd('/effect give @s haste infinite 1 true')   // Haste II (a beacon's best): netherite + efficiency V instamines
    await ctx.cmd('/effect give @s saturation infinite 1 true')
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
    let digTicks = 0
    const onTick = () => {
      if (bot.targetDigBlock) { if (digTicks++ % 4 === 0) ctx.sound('block.stone.hit', 0.25, 0.5) } else digTicks = 0
    }
    bot.on('physicsTick', onTick)
    bot.on('playerCollect', (collector) => { if (collector === bot.entity) ctx.sound('entity.item.pickup', 0.2, 1.4 + Math.random() * 0.6) })
    // frame 0: already on the first block of the gold section (r:r0f3da0: the subject, in motion by 0.5 s)
    const first = new Vec3(this.x0, floor + 2, wz)
    await A.aimAt(first.offset(0.5, 0.5, 1), { on: first })
    await bot.waitForTicks(2)
    for (let i = 0; i < TOOLS.length; i++) {
      const fast = i === TOOLS.length - 1
      if (i > 0) {
        const tx = this.stand(i).x
        ctx.select(i)
        ctx.easeLook(0, -0.15, 300)
        for (let k = 0; k < 40 && Math.abs(bot.entity.position.x - tx) > 0.15; k++) {
          bot.setControlState('right', bot.entity.position.x < tx - 0.15)
          bot.setControlState('left', bot.entity.position.x > tx + 0.15)
          await bot.waitForTicks(1)
        }
        bot.setControlState('right', false); bot.setControlState('left', false)
        // onto the section's first block before the beat, then still: the edit's cut lands on a rest both sides (whip)
        const fb = new Vec3(this.x0 + i * SPACING, floor + 2, wz)
        await A.aimAt(fb.offset(0.5, 0.5, 1), { on: fb })
        await bot.waitForTicks(7)
      } else ctx.select(i)
      ctx.mark('beat', { n: i }); ctx.mark(`beat${i}`)   // (unique: the edit's speed spans take a mark's first time)
      const xs = this.x0 + i * SPACING
      const order = []
      for (const [r, dir] of ROWS) for (let c = 0; c < 3; c++) order.push(new Vec3(xs + (dir > 0 ? c : 2 - c), floor + r, wz))
      const t0 = ctx.tick
      if (fast) ctx.mark('instamine')
      for (const p of order) {
        const b = bot.blockAt(p)
        if (!b || b.name === 'air') continue
        if (fast) { try { await A.dig(b, { instant: true, delay: 0, sound: null }) } catch (e) { ctx.log('dig', e.message) } } else { try { await A.dig(b) } catch (e) { ctx.log('dig', e.message) } }
        ctx.sound('block.stone.break', 1, 0.8); ctx.particles('block', p, { block: 'stone' })
      }
      const ticks = ctx.tick - t0
      await bot.waitForTicks(2)
      const left = order.filter(p => { const b = bot.blockAt(p); return b && b.name !== 'air' }).length
      ctx.log(TOOLS[i].label, 'mined in', ticks, 'ticks; blocks left', left)
      if (left) return false
      ctx.mark('mined', { n: i, ticks, secs: (ticks / 20).toFixed(1) }); ctx.mark(`mined${i}`)
      if (TOOLS[i].item.startsWith('golden')) { ctx.sound('entity.item.break', 1); ctx.log('gold left in hand:', bot.heldItem && bot.heldItem.name) }
      if (!fast) await ctx.easeLook(0, -0.1, 150)   // (after the instamine the TNT row's aim takes over: two turners jerked the view)
    }
    // finale: "TNT: ??? tier". A TNT on the grass at the foot of every column of the wall, west to east, then light the
    // east end: the chain runs back down the row and takes the whole wall out
    await ctx.cmd('/gamerule block_drops false')   // no blast drops left floating over the empty field
    ctx.mark('finale')
    const AW = require('../lib/act')(ctx, { turnSpeed: 75, turnAccel: 500 })   // the row plays at 3x: <= 225 deg/s on screen
    const T = TOOLS.length, F = TOOLS.length + 1
    let booms = 0, boomAt = null
    bot._client.on('explosion', (p) => {
      const c = p.center || p
      boomAt = new Vec3(+c.x, +c.y, +c.z)
      if (++booms === 1) ctx.mark('boom')
      ctx.mark(`boom${booms}`)
      if (booms === this.ntnt) ctx.mark('lastboom')   // the whole row gone: the payoff's hit
      ctx.log('boom', booms, 'tick', ctx.tick)
    })
    ctx.select(T)
    const goTo = async (tx) => {
      const tz = wz + 3.0
      for (let k = 0; k < 60; k++) {
        const e = bot.entity.position
        const dx = tx - e.x, dzz = tz - e.z
        if (Math.abs(dx) < 0.3 && Math.abs(dzz) < 0.4) break
        const ny = bot.entity.yaw, len = Math.hypot(dx, dzz), wx = dx / len, wzz = dzz / len
        const f = wx * -Math.sin(ny) + wzz * -Math.cos(ny), rr = wx * Math.cos(ny) + wzz * -Math.sin(ny)
        bot.setControlState('forward', f > 0.35); bot.setControlState('back', f < -0.35)
        bot.setControlState('right', rr > 0.35); bot.setControlState('left', rr < -0.35)
        await bot.waitForTicks(1)
      }
      for (const c of ['forward', 'back', 'left', 'right']) bot.setControlState(c, false)
    }
    // place from where the netherite section ended (no walk before the first TNT: dwell, r:r188b46), east end first,
    // then one spot further west for the rest; every TNT within reach of the spot it is placed from
    const here = bot.entity.position.x
    const spots = [here, this.xa + 1.5]
    const xs = []; for (let tx = this.xb; tx >= this.xa; tx--) xs.push(tx)
    const done = new Set()
    ctx.mark('tntwalk')
    for (let si = 0; si < spots.length; si++) {
      if (si > 0) await goTo(spots[si])
      const reach = (tx) => Math.abs(tx + 0.5 - spots[si]) <= 3.2
      for (const tx of xs.filter(v => reach(v) && !done.has(v))) {
        const q = new Vec3(tx, floor + 1, wz + 1)
        for (let t = 0; t < 3 && bot.blockAt(q)?.name !== 'tnt'; t++) {
          try { await AW.place(q, { against: new Vec3(tx, floor, wz + 1), sound: 'block.grass.place' }) } catch (e) { ctx.log('place', e.message) }
          await bot.waitForTicks(1)
        }
        if (bot.blockAt(q)?.name === 'tnt') done.add(tx); else ctx.log('tnt missing at', tx)
        if (done.size === 4) ctx.mark('tntrun')
      }
    }
    // a TNT the server refused (rare: one take in five): put it there from where we stand, logged
    for (const tx of xs.filter(v => !done.has(v))) {
      ctx.log('tnt place fallback at', tx, 'bot at', bot.entity.position.toString())
      await ctx.cmd(`/setblock ${tx} ${floor + 1} ${wz + 1} tnt`); done.add(tx)
    }
    ctx.log('tnt placed', done.size, 'of', xs.length)
    // light the west end (at your feet)
    ctx.select(F)
    try { await AW.use(new Vec3(this.xa, floor + 1, wz + 1), { sound: 'item.flintandsteel.use' }) } catch (e) { ctx.log('light', e.message) }
    ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    { const free = [...Array(9).keys()].find(h => !bot.inventory.slots[36 + h]); if (free !== undefined) ctx.select(free) }
    // back off south to 9.5 out, eyes on the middle of the wall: the whole wall in frame for the chain
    const mid = new Vec3((this.xa + this.xb + 1) / 2, floor + 2, wz + 0.5)
    const AL = require('../lib/act')(ctx, { turnSpeed: 50, turnAccel: 300 })   // the back-off plays at 3.5x: <= 175 deg/s on screen
    const aim = () => { const e = bot.entity.position.offset(0, 1.62, 0), d = mid.minus(e); return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) } }
    const tz = wz + 9.5, txm = mid.x   // 9.5 out: the whole wall fills the frame (12 left it a strip), past the blasts' 8-block hurt radius
    let quiet = 0, last = 0
    for (let k = 0; k < 400 && quiet < 30; k++) {
      await AL.view(aim())
      const e0 = bot.entity.position, yaw = bot.entity.yaw
      const wx = Math.abs(txm - e0.x) > 0.4 ? Math.sign(txm - e0.x) : 0, wzz = e0.z < tz ? 1 : 0
      const f = wx * -Math.sin(yaw) + wzz * -Math.cos(yaw), rr = wx * Math.cos(yaw) + wzz * -Math.sin(yaw)
      bot.setControlState('forward', f > 0.3); bot.setControlState('back', f < -0.3)
      bot.setControlState('right', rr > 0.3); bot.setControlState('left', rr < -0.3)
      if (booms > 0) quiet = booms === last ? quiet + 1 : 0
      last = booms
      await bot.waitForTicks(1)
    }
    for (const c of ['back', 'forward', 'left', 'right']) bot.setControlState(c, false)
    // what's left of the wall
    let left = 0
    for (let tx = this.xa; tx <= this.xb; tx++) for (let r = 1; r <= 3; r++) { const b = bot.blockAt(new Vec3(tx, floor + r, wz)); if (b && b.name !== 'air') left++ }
    ctx.log('booms', booms, 'of', done.size, '; wall blocks left', left)
    if (booms < done.size - 1 || left > 0) { ctx.log('wall not gone'); return false }
    ctx.mark('wallgone')
    for (let k = 0; k < 30; k++) { await AL.view(aim()); await bot.waitForTicks(1) }
    bot.removeListener('physicsTick', onTick)
    return !ctx.died
  }
}
