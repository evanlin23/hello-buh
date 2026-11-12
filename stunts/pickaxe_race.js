// "bro said TNT is a pickaxe 💀" (no-op fix 2026-11-12, docs/noop_audit_2026-11-12.md; v3 r:rf557af). A stone wall in a
// field, one section per pickaxe marked off by cobblestone pillars. Wooden, stone, iron, diamond each mine their section
// on a timer; a nearly worn-out golden pickaxe (the fastest plain pickaxe) mines its section and breaks on its last
// block; netherite + Efficiency V (with Haste II, which a beacon gives: invisible, and the instamine needs it, so the
// tier line says so) instamines the next. Finale: a row of TNT along the whole foot of the wall, lit at one end; the
// chain runs down the row and the whole wall is gone. Real survival digging and placing throughout (lib/act.js).
// v3 (owner 2026-11-12, r:rf557af: "we should still have the other pickaxes.."): the full ladder again, each tier one
// fast uncut take on the per-tier timer, hard cuts only between tiers (view still both sides). The slow tiers get
// smaller sections (fewer blocks, real-time digs: never a sped-up dig), so every tier is quick and new.
const TOOLS = [
  { item: 'wooden_pickaxe', label: 'wooden', result: 'wooden: D tier', w: 1 },
  { item: 'stone_pickaxe', label: 'stone', result: 'stone: C tier', w: 2 },
  { item: 'iron_pickaxe', label: 'iron', result: 'iron: B tier', w: 2 },
  { item: 'diamond_pickaxe', label: 'diamond', result: 'diamond: A tier', w: 2 },
  { item: 'golden_pickaxe[damage=26]', label: 'gold', result: 'gold: S tier?? it BROKE', w: 3 },   // 6 uses left: it breaks on the last block
  { item: 'netherite_pickaxe[enchantments={efficiency:5}]', label: 'efficiency V + haste', result: 'efficiency V + haste: GOD tier', w: 3 }
]
// each section is w wide x 2 high, a cobblestone pillar between sections and at both ends (the wall is 3 high)
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
        // each tier's result reads ~0.5 s, then straight to the next tier's first swing (no strafe on screen, r:r188b46)
        ...TOOLS.slice(0, -1).map((t, i) => [`mined${i}:0.5`, `beat${i + 1}:0.1`, 'cut']),
        ['tntwalk', 'lit', 3],                     // the row of 20 TNT going down (turns capped at 73 deg/s: 220 on screen)
        ['lit:0.4', 'boom:-0.5', 3.5]],            // the back-off during the fuse (a slow look: under 60 deg/s)
      subs: subs(),
      flash: [['boom', 0, 0.35], ['lastboom', 0, 0.6]],
      punch: [['boom', 0, 1.06], ['boom6', 0, 1.06], ['lastboom', 0, 1.12]], shake: [['boom', 0, 6], ['boom6', 0, 6], ['lastboom', 0, 10]],
      // the first blast and the last (the whole wall gone: the payoff, the song's drop on it after a 0.4 s dip)
      // (mixcheck: the chain's previous blasts flattened the last one's hit under the NCS bed: the game audio dips before it
      // too, and a boom rides on the impact, as the old cut did; the opening's hit louder: none read over the bed by 1.5 s)
      sfx: [['impact', 'beat', { gain: 1.5 }], ['impact', 'boom', { gain: 1.0 }], ['dip', 'lastboom', 0.45], ['gamedip', 'lastboom', 0.4], ['impact', 'lastboom', { gain: 1.4 }], ['boom', 'lastboom']] }
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
    // sections left to right: secX[i] = its west column; pillars between, at both ends
    this.secX = []
    let cx = x - 10
    this.xa = cx
    for (const t of TOOLS) { cx += 1; this.secX.push(cx); cx += t.w }
    this.xb = cx                                           // the east end pillar
    await ctx.cmd(`/fill ${this.xa} ${floor + 1} ${this.wz} ${this.xb} ${floor + 3} ${this.wz} stone`)
    for (let i = 0; i <= TOOLS.length; i++) { const px = i === 0 ? this.xa : this.secX[i - 1] + TOOLS[i - 1].w; await ctx.cmd(`/fill ${px} ${floor + 1} ${this.wz} ${px} ${floor + 3} ${this.wz} cobblestone`) }
    // solid ground under the blast zone (the crater opened onto a frozen river under one take's field)
    await ctx.cmd(`/fill ${this.xa - 7} ${floor - 9} ${this.wz - 7} ${this.xb + 7} ${floor - 4} ${this.wz + 7} stone`)
    this.ntnt = this.xb - this.xa + 3
    await ctx.hotbar([...TOOLS.map(t => t.item), ['tnt', this.ntnt + 2], 'flint_and_steel'])
    await ctx.cmd('/effect give @s haste infinite 1 true')   // Haste II (a beacon's best): netherite + efficiency V instamines
    await ctx.cmd('/effect give @s saturation infinite 1 true')
    this.stand = (i) => ({ x: this.secX[i] + TOOLS[i].w / 2, z: this.wz + 4.0 })   // within vanilla's 4.5-block reach
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
    const first = new Vec3(this.secX[0], floor + 2, wz)
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
        const fb = new Vec3(this.secX[i], floor + 2, wz)
        await A.aimAt(fb.offset(0.5, 0.5, 1), { on: fb })
        // the tier starts here (its caption and timer on the cut's first frame: cut at beat-0.25 showed the last tier's
        // caption and frozen time over the new pick for 0.25 s); the cut lands 0.1 s in, on the rest
        ctx.mark('beat', { n: i }); ctx.mark(`beat${i}`)   // (unique: the edit's speed spans take a mark's first time)
        await bot.waitForTicks(7)
      } else { ctx.select(i); ctx.mark('beat', { n: i }); ctx.mark(`beat${i}`) }
      const xs = this.secX[i], w = TOOLS[i].w
      const order = []
      for (const [r, dir] of ROWS) for (let c = 0; c < w; c++) order.push(new Vec3(xs + (dir > 0 ? c : w - 1 - c), floor + r, wz))
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
      if (!fast) { await ctx.easeLook(0, -0.1, 150); await bot.waitForTicks(12) }   // still through the edit's cut at mined+0.5 (the strafe after it is cut out); after the instamine the TNT row's aim takes over
    }
    // finale: "TNT: ??? tier". A TNT on the grass at the foot of every column of the wall, west to east, then light the
    // east end: the chain runs back down the row and takes the whole wall out
    await ctx.cmd('/gamerule block_drops false')   // no blast drops left floating over the empty field
    ctx.mark('finale')
    const AW = require('../lib/act')(ctx, { turnSpeed: 73, turnAccel: 500 })   // the row plays at 3x: <= 220 deg/s on screen
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
    // one continuous walk west along the row, 2.6 out, placing each TNT just ahead of you as you pass it: the view keeps
    // the same angle onto the row (small turns), no stop-and-walk between spots (the stops ran the row 4.6 s at 4x)
    const xs = []; for (let tx = this.xb + 1; tx >= this.xa - 1; tx--) xs.push(tx)   // one past each end: the end pillars' top corners survived 3 takes in 4
    const done = new Set()
    let steer = { x: this.xb + 2.6, z: wz + 3.6 }
    const walk = () => {
      const e = bot.entity.position, dx = steer.x - e.x, dzz = steer.z - e.z, len = Math.hypot(dx, dzz)
      const on = len > 0.25, ny = bot.entity.yaw, wx = on ? dx / len : 0, wzz = on ? dzz / len : 0
      const f = wx * -Math.sin(ny) + wzz * -Math.cos(ny), rr = wx * Math.cos(ny) + wzz * -Math.sin(ny)
      bot.setControlState('forward', f > 0.35); bot.setControlState('back', f < -0.35)
      bot.setControlState('right', rr > 0.35); bot.setControlState('left', rr < -0.35)
    }
    bot.on('physicsTick', walk)
    ctx.mark('tntwalk')
    for (const tx of xs) {
      steer = { x: tx + 1.6, z: wz + 3.6 }
      const q = new Vec3(tx, floor + 1, wz + 1)
      for (let t = 0; t < 3 && bot.blockAt(q)?.name !== 'tnt'; t++) {
        try { await AW.place(q, { against: new Vec3(tx, floor, wz + 1), sound: 'block.grass.place' }) } catch (e) { ctx.log('place', e.message) }
        await bot.waitForTicks(1)
      }
      if (bot.blockAt(q)?.name === 'tnt') done.add(tx); else ctx.log('tnt missing at', tx)
      if (done.size === 4) ctx.mark('tntrun')
    }
    steer = { x: this.xa + 0.6, z: wz + 3.6 }
    await bot.waitForTicks(4)
    bot.removeListener('physicsTick', walk)
    for (const c of ['forward', 'back', 'left', 'right']) bot.setControlState(c, false)
    // a TNT the server refused (rare: one take in five): put it there from where we stand, logged
    for (const tx of xs.filter(v => !done.has(v))) {
      ctx.log('tnt place fallback at', tx, 'bot at', bot.entity.position.toString())
      await ctx.cmd(`/setblock ${tx} ${floor + 1} ${wz + 1} tnt`); done.add(tx)
    }
    ctx.log('tnt placed', done.size, 'of', xs.length)
    // light the west end (at your feet)
    ctx.select(F)
    try { await AW.use(new Vec3(this.xa - 1, floor + 1, wz + 1), { sound: 'item.flintandsteel.use' }) } catch (e) { ctx.log('light', e.message) }
    ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    { const free = [...Array(9).keys()].find(h => !bot.inventory.slots[36 + h]); if (free !== undefined) ctx.select(free) }
    // back off south to 13 out, eyes on the middle of the wall: the whole wall in frame for the chain
    const mid = new Vec3((this.xa + this.xb + 1) / 2, floor + 2, wz + 0.5)
    const AL = require('../lib/act')(ctx, { turnSpeed: 50, turnAccel: 300 })   // the back-off plays at 3.5x: <= 175 deg/s on screen
    const aim = () => { const e = bot.entity.position.offset(0, 1.62, 0), d = mid.minus(e); return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) } }
    const tz = wz + 13, txm = mid.x   // 13 out: the whole 20-wide wall in frame, past the blasts' 8-block hurt radius
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
    for (let tx = this.xa; tx <= this.xb; tx++) for (let r = 1; r <= 3; r++) { const b = bot.blockAt(new Vec3(tx, floor + r, wz)); if (b && b.name !== 'air') { left++; ctx.log('left standing', tx - this.xa, r, b.name) } }
    ctx.log('booms', booms, 'of', done.size, '; wall blocks left', left)
    if (booms < done.size - 1 || left > 0) { ctx.log('wall not gone'); return false }
    ctx.mark('wallgone')
    for (let k = 0; k < 30; k++) { await AL.view(aim()); await bot.waitForTicks(1) }
    bot.removeListener('physicsTick', onTick)
    return !ctx.died
  }
}
