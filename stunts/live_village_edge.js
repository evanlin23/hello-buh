// Live format sample 2 (docs/livestream.md): "THE VILLAGE EXPLODES AT 100%", the edge. No clock (owner 2026-11-14:
// "maybe we dont need a count down? we just need to make it seem like, no matter when they join the stream, the TNT is
// ABOUT to just about to blow up. so maybe we are like putting on the last few layers of tnt, but then we do that thing
// where we edge it a little and keep them on as long as possible. like build out to the edge, put creepers, etc."). The
// winners' layout (docs/research/livestream.md D): one line of promise in the top band, a big live number, first person
// always moving toward the target. The big number is the goal: TNT down of the TNT it takes; at 100% the flint and steel
// comes out... and the goal gets BIGGER (one more layer, creepers on it), shown honestly, until the round really blows.
// The 1-minute sample:
//   1. first person, closing the last gap: a trench through the TNT field toward the village (real aimed places), 99%
//   2. 100%: the flint and steel comes out, the crosshair on the TNT... "WAIT... BIGGER": the goal doubles (50%)
//   3. the drone time-lapse: the second layer goes down over the whole village, back to 100%
//   4. on top of the TNT: three creepers onto it ("ONE MORE THING"), then flint and steel for real; the whole village goes
const L = require('../lib/live')
const M = require('../lib/movie')

const R = 30            // the field's radius round the village's locate point
const LAYERS = 2
const T0 = 2 * 3600 + 41 * 60 + 7     // the stream clock at the sample's first frame (not shown: the goal is)
const LAPSE = 420       // ticks of the second layer's time-lapse (21 s recorded, x4 in the edit)

module.exports = {
  name: 'live_village_edge',
  live: { stream: L.STREAM_S, counter: 'TNT', icon: 'tnt' },
  time: 6000,
  renderDistance: 10,
  botTimeout: 1500,
  settleWait: 100,
  explodeSoundEvery: 2,
  entityRadius: 160,
  caption: 'the village explodes at 100% 💀',
  shots: {
    pov: { pov: true },
    lapse: { orbit: 'actor:village', radius: 56, height: 36, startDeg: 140, degPerSec: 2, fov: 62 },
    boom: { orbit: 'actor:village', radius: 72, height: 42, startDeg: 300, degPerSec: 2, fov: 64 }
  },
  edit: {
    caption: 'the village explodes at 100% 💀', red: '100%',
    // this take (2026-11-14): blast_end came 0.75 s in (the blast's block changes arrive in bursts up to 1.7 s apart while
    // the server lags under ~5,000 TNT); its last block went 0.15 s before the recording's end mark, so it ends there
    startAt: 'live_on:0', endAfter: 'end:-0.1',
    speed: [['tp_a', 'lapse_a', 'cut'], ['lapse_a', 'lapse_b', 2.5], ['fuse_a', 'fuse_b', 'cut'], ['boom:3', 'end:-2', 2]],
    cards: [['full', 'ALMOST... 💀', 0.9, 'red'], ['bigger', 'WAIT... BIGGER 💀', 1.5, 'yellow'], ['creepers', 'ONE MORE THING...', 1.3, 'green']],
    sfx: [['riser', 'full:-2', 'full'], ['scratch', 'bigger'], ['whoosh', 'lapse_a'], ['whoosh', 'lapse_b'], ['riser', 'lit:-3', 'lit'],
      ['boom', 'boom'], ['impact', 'boom', { gain: 1.3 }]],
    flash: [['boom', 0, 0.5]], shake: [['boom', 0, 14]], punch: [['full', 0, 1.05], ['boom', 0, 1.1]]
  },

  async setup (ctx) {
    const { bot, Vec3 } = ctx
    await ctx.defaultRules()
    // easy, not peaceful: creepers (NoAI once placed) can't exist in peaceful; 56e is out of the blast on its cut
    for (const c of ['/difficulty easy', '/gamerule block_drops false', '/gamerule fall_damage false', '/gamerule keep_inventory true',
      '/gamerule tnt_explosion_drop_decay true', '/gamerule natural_regeneration true']) await ctx.cmd(c, { mayFail: true })
    const c = await L.findVillage(ctx, { R: R + 48 })
    const cols = L.carpetColumns(ctx, c, R, LAYERS)
    if (cols.length < 400) throw new Error(`village field: only ${cols.length} open columns`)
    // the trench: the last gap, 2 wide, from the field's edge 14 blocks in toward the middle, on the side with the
    // most open ground along it
    const key = (x, z) => `${x},${z}`
    const byKey = new Map(cols.map(col => [key(col.x, col.z), col]))
    let best = null
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, ux = Math.cos(a), uz = Math.sin(a)
      const cells = cols.filter(col => {
        const rx = col.x + 0.5 - c.x, rz = col.z + 0.5 - c.z, along = rx * ux + rz * uz, off = Math.abs(-rx * uz + rz * ux)
        return along > R - 15 && along < R - 1 && off < 1.05
      })
      // walkable beside it: open columns 1.5-3 off the line all along
      const side = cols.filter(col => { const rx = col.x + 0.5 - c.x, rz = col.z + 0.5 - c.z, along = rx * ux + rz * uz, off = Math.abs(-rx * uz + rz * ux); return along > R - 15 && along < R - 1 && off >= 1.5 && off < 3 }).length
      const score = cells.length + side * 0.5
      if (cells.length >= 18 && (!best || score > best.score)) best = { a, ux, uz, cells, score }
    }
    if (!best) throw new Error('no line for the trench')
    const trench = best.cells.map(col => ({ x: col.x, y: col.y, z: col.z, along: (col.x + 0.5 - c.x) * best.ux + (col.z + 0.5 - c.z) * best.uz }))
      .sort((p, q) => q.along - p.along)            // from the edge in: 56e works toward the village
    const tk = new Set(trench.map(p => key(p.x, p.z)))
    const layer1 = cols.map(col => ({ x: col.x, y: col.y, z: col.z }))
    const pre = layer1.filter(p => !tk.has(key(p.x, p.z)))
    ctx.log(`field: ${cols.length} columns; trench ${trench.length} at ${(best.a * 180 / Math.PI).toFixed(0)} deg`)
    await L.bulk(ctx, L.fills(pre, 'tnt'))
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    await ctx.cmd('/attribute @s minecraft:explosion_knockback_resistance base set 1', { mayFail: true })
    // the stands: on the TNT beside the trench (a column's top is one up once its TNT is down)
    for (const col of cols) col.top = tk.has(key(col.x, col.z)) ? col.y : col.y + 1
    const C = require('../lib/live_crew')(ctx, null, { cols })
    Object.assign(this, { ctx, c, cols, trench, tk, pre, total1: cols.length, C })
    const s = C.standFor(trench, 0, 10, { x: c.x + 0.5, z: c.z + 0.5 }, 1.6, tk)
    if (!s) throw new Error('no stand beside the trench')
    s.y = cols.find(col => col.x === Math.floor(s.x) && col.z === Math.floor(s.z)).y + 1   // on the TNT (the bot's world may lag the fills)
    this.village = await C.anchor('village', c.x + 0.5, c.y + 2, c.z + 0.5)
    await ctx.hotbar([['tnt', 64], 'flint_and_steel', ['creeper_spawn_egg', 3], ['tnt', 64], ['bread', 16]])
    await ctx.tpCheck(s.x, s.y, s.z, s.yaw, 35)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return c
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { c, cols, trench, tk } = this
    const A = require('../lib/act')(ctx)
    const C = require('../lib/live_crew')(ctx, A, { cols })
    let booms = 0, armed = false
    const W = C.watchBlast(c, R)   // the blast's progress from the blocks (lib/live_crew.js)
    bot._client.on('explosion', () => { booms++; if (armed && !this.boomed) { this.boomed = true; ctx.mark('boom') } })
    let n = this.pre.length
    const total1 = this.total1

    C.markAnchors({ village: this.village })
    M.shot(ctx, 'pov')
    L.clock(ctx, T0, 1)
    L.target(ctx, 'THE VILLAGE EXPLODES AT 100%', null, '100%')
    L.goal(ctx, total1)
    L.count(ctx, n)
    ctx.mark('live_on')

    // 1. the last gap, toward the village (the trench from the edge in); a second pass for any passed over
    const mid = { x: c.x + 0.5, z: c.z + 0.5 }   // each stand just outside the next cells: working in toward the village
    const onPlace = () => { n++; L.count(ctx, n) }
    let r = await C.lay(trench, { from: 0, until: ctx.tick + 19 * 20, center: mid, win: 10, onPlace })
    if (r.skipped.length) r = await C.lay(r.skipped, { from: 0, until: ctx.tick + 5 * 20, center: mid, win: 10, onPlace })
    ctx.log(`trench: ${n} of ${total1}`)
    // whatever is still open (out of reach on this take) goes down off camera in the cut to the drone below

    // 2. 100% (or as near as this take got): flint and steel... the crosshair on the TNT... wait. BIGGER
    if (n >= total1) ctx.mark('full'); else ctx.mark('full', { short: total1 - n })
    ctx.select(1)
    const tnt = C.lightable(trench) || C.lightable(this.pre)
    const field = new Vec3(c.x + 0.5, c.y + 1, c.z + 0.5)
    await A.turnTo(field, { max: 30, hold: 6 })
    if (tnt) await A.turnTo(tnt.offset(0.5, 0.5, 0.5), { max: 30, hold: 22 })
    ctx.mark('bigger')
    await A.turnTo(new Vec3(c.x + 0.5 + (c.x - bot.entity.position.x), c.y + 4, c.z + 0.5 + (c.z - bot.entity.position.z)), { max: 40, hold: 8 })
    // the second layer over everything: the goal doubles
    const layer2 = cols.map(col => ({ x: col.x, y: col.y + 1, z: col.z }))
    const total2 = total1 + layer2.length
    L.goal(ctx, total2)
    ctx.select(0)
    await bot.waitForTicks(16)

    // 3. the drone time-lapse: the rest of layer 1 and all of layer 2, back to 100%
    const rest = trench.filter(p => { const b = bot.blockAt(new Vec3(p.x, p.y, p.z)); return !b || b.name !== 'tnt' })
    const todo = rest.concat(layer2)
    // the final stand: on the TNT three in from the edge on the far side, the drone's view of the field behind it
    for (const col of cols) col.top = col.y + 2
    const off = (col) => { const d = Math.atan2(col.z - c.z, col.x - c.x) - this.trenchAngle(c); return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) }
    const fin = cols.filter(col => col.d > R - 5 && col.d < R - 2.5).sort((a, b) => off(a) - off(b))
    const st = fin[0] || cols[0]
    const yaw = Math.atan2(-(c.x - st.x), c.z - st.z) * 180 / Math.PI
    // inside the edit's cut (tp_a -> lapse_a, never on screen): the stand's own column first, 56e onto it, the mobs out
    ctx.mark('tp_a')
    bot.chat(`/setblock ${st.x} ${st.y + 1} ${st.z} tnt`)
    await bot.waitForTicks(2)
    // every mob out (the final blast flings them several blocks a tick: the glitch check reads that as a teleport, and
    // it has no blast exemption the Shorts don't also get)
    await ctx.cmd('/kill @e[type=!player,type=!interaction]', { mayFail: true })   // (a /tp away reads as a jump to the check)
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    await ctx.cmd(`/tp @s ${st.x + 0.5} ${st.y + 2} ${st.z + 0.5} ${yaw.toFixed(1)} 20`)   // motion-ok: inside the edit's cut, before the lapse drone
    await bot.waitForTicks(10)
    M.shot(ctx, 'lapse')
    ctx.mark('lapse_a')
    const todo2 = todo.filter(p => !(p.x === st.x && p.z === st.z && p.y === st.y + 1))
    for (let k = 0; k < LAPSE; k++) {
      const a = Math.floor(todo2.length * k / LAPSE), b = Math.floor(todo2.length * (k + 1) / LAPSE)
      if (b > a) { for (const cmd of L.fills(todo2.slice(a, b), 'tnt')) bot.chat(cmd); n = Math.min(total2, n + b - a); if (k % 3 === 0) L.count(ctx, n) }
      await bot.waitForTicks(1)
    }
    n = total2
    L.count(ctx, n)
    await bot.waitForTicks(6)

    // 4. on top of it all: 100% again... one more thing: three creepers onto the TNT, then the flint and steel for real
    M.shot(ctx, 'pov')
    ctx.mark('lapse_b')
    await bot.waitForTicks(10)
    ctx.select(2)
    ctx.mark('creepers')
    const me = bot.entity.position
    const myD = Math.hypot(me.x - c.x, me.z - c.z)
    const spots = cols.filter(col => { const d = Math.hypot(col.x + 0.5 - me.x, col.z + 0.5 - me.z); return d > 3.6 && d < 4.3 && col.d < myD - 1 })   // in front, toward the middle
    let placed = 0
    for (let k = 0; k < spots.length && placed < 3; k += Math.max(1, Math.floor(spots.length / 3))) {
      const s = spots[k]
      try {
        await A.use(new Vec3(s.x, s.y + 1, s.z), { sound: 'entity.creeper.hurt', max: 30 })
        bot.chat('/data merge entity @e[type=creeper,sort=nearest,limit=1] {NoAI:1b,PersistenceRequired:1b}')
        placed++
        L.stat(ctx, 'CREEPERS ON IT', placed)
        await bot.waitForTicks(8)
      } catch (e) { ctx.log('creeper', e.message) }
    }
    await bot.waitForTicks(10)
    ctx.select(1)
    armed = true; W.armed = true
    const lit = C.lightable(cols.map(col => ({ x: col.x, y: col.y + 1, z: col.z })), 3.6)
    try { if (!lit) throw new Error('nothing in reach'); await A.use(lit, { sound: 'item.flintandsteel.use' }) } catch (e) { ctx.log('light', e.message); await ctx.cmd(`/summon tnt ${st.x + 0.5} ${st.y + 3} ${st.z + 0.5}`) }
    ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    const t0 = ctx.tick
    await bot.waitForTicks(12)
    ctx.mark('fuse_a')
    // inside the fuse's cut (never on screen): 56e out of the blast first (a POV cut, so the camera goes with it), the
    // creepers gone (the blast would fling them), then the drone
    const away = C.awayStand({ x: st.x + 0.5, y: st.y, z: st.z + 0.5, yaw }, c)
    await ctx.cmd(`/tp @s ${away.x} ${away.y} ${away.z} ${away.yaw.toFixed(1)} 0`)   // motion-ok: inside the fuse's cut, before the drone
    await ctx.cmd('/kill @e[type=creeper]', { mayFail: true })
    await bot.waitForTicks(4)
    M.shot(ctx, 'boom')
    while (ctx.tick - t0 < 70 && !this.boomed && W.first === null) await bot.waitForTicks(1)
    ctx.mark('fuse_b')
    for (let k = 0; k < 120 && !this.boomed && W.first === null; k++) await bot.waitForTicks(1)
    if (!this.boomed) { this.boomed = true; ctx.mark('boom') }
    // until no block has gone for 1.5 s (the blocks are the truth: packets stop at range)
    for (let k = 0; k < 2400 && ctx.tick - W.last < 60; k++) await bot.waitForTicks(1)
    ctx.mark('blast_end')   // 3 s after the last block went (they come in bursts while the server lags)
    ctx.log('booms', booms, 'TNT', n, 'TNT gone', W.tntGone, 'creepers', placed)
    return !!this.boomed
  },

  // the trench's angle round the village (the final stand is across from it)
  trenchAngle (c) { const p = this.trench[0]; return Math.atan2(p.z - c.z, p.x - c.x) + Math.PI }
}
