// Live format sample 1 (docs/livestream.md): "THIS VILLAGE EXPLODES IN 8 HOURS". A real plains village; 56e lays a
// TNT carpet over every open block of it, ring by ring from the bell out, then a second layer on top: the village
// slowly sinks into TNT while the villagers walk about on it. The bottom band counts down to the blast and counts the
// TNT (scripts/live_overlay.py). The 8 h stream is this, chunked; this 1-minute sample is three slices of it:
//   1. live, 3:17:42 into the stream (4:42:18 to go): first person, placing TNT at the frontier (real aimed places)
//   2. the drone's view of the whole village, the carpet and 56e still placing in it, then first person again
//   3. "skipping 4 hours": the drone time-lapse while the rest of the carpet goes down, the clock racing
//   4. the last 10 seconds, live: 56e at the edge with flint and steel, 0:00:00, the whole village goes up
// Owner, 2026-11-14 (r:r584b30): "the village is like going to explode soon. It's just like me like placing a bunch of
// TNT and stuff. So it should be like really like baked like that."
const L = require('../lib/live')
const M = require('../lib/movie')

const R = 30            // the carpet's radius round the village's locate point
const LAYERS = 2        // a full first layer, then a second on top
const T0 = 3 * 3600 + 17 * 60 + 42     // the stream clock at the sample's first frame
const LEFT = 10         // the final stretch: the last 10 s of the countdown, live
const LAPSE = 480       // ticks of the time-lapse (24 s recorded, x4 in the edit: 6 s)

module.exports = {
  name: 'live_village_tnt',
  // the bottom band (scripts/live_overlay.py): the stream's length, the counter's name, the countdown's label
  live: { stream: L.STREAM_S, title: 'THIS VILLAGE EXPLODES IN', red: 'EXPLODES', counter: 'TNT', icon: 'tnt', done: 'BOOM' },
  time: 6000,
  renderDistance: 10,
  botTimeout: 1200,
  settleWait: 600,
  explodeSoundEvery: 2,
  caption: 'this village explodes in 8 HOURS 💀',
  shots: {
    pov: { pov: true },
    drone: { orbit: [0, 3, 0], radius: 44, height: 28, startDeg: 200, degPerSec: 4, fov: 62 },
    lapse: { orbit: [0, 3, 0], radius: 56, height: 38, startDeg: 250, degPerSec: 2, fov: 62 },
    boom: { orbit: [0, 3, 0], radius: 74, height: 44, startDeg: 20, degPerSec: 2, fov: 64 }
  },
  edit: {
    caption: 'this village explodes in 8 HOURS 💀', red: '8 HOURS',
    startAt: 'live_on:0', endAfter: 'settle:0.5',
    // the 18 s blast's middle at x2 (the chain keeps going on screen, r:r24d99a: no cut while it goes off)
    speed: [['lapse_a', 'lapse_b', 4], ['fuse_a', 'fuse_b', 'cut'], ['boom:4', 'settle:-3', 2]],
    cards: [['lapse_a', 'SKIPPING 4 HOURS...', 1.6, 'yellow'], ['lit', '0:00:00 💀', 1.0, 'red']],
    sfx: [['whoosh', 'lapse_a'], ['whoosh', 'lapse_b'], ['boom', 'boom'], ['impact', 'boom', { gain: 1.3 }]],
    flash: [['boom', 0, 0.5]], shake: [['boom', 0, 14]], punch: [['boom', 0, 1.1]]
  },

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    for (const c of ['/difficulty peaceful', '/gamerule block_drops false', '/gamerule fall_damage false', '/gamerule keep_inventory true',
      '/gamerule tnt_explosion_drop_decay true']) await ctx.cmd(c, { mayFail: true })
    const c = await L.findVillage(ctx, { R: R + 48 })
    const cols = L.carpetColumns(ctx, c, R, LAYERS)
    const plan = L.carpetPlan(cols, LAYERS)
    const P1 = cols.length
    if (P1 < 400) throw new Error(`village carpet: only ${P1} open columns`)
    // the world as it is 3:17:42 into the stream: the first layer done, a third of the second
    const N0 = P1 + Math.floor(P1 * 0.35)
    ctx.log(`carpet: ${P1} columns, ${plan.length} cells; ${N0} placed at the sample's start`)
    await L.bulk(ctx, L.fills(plan.slice(0, N0), 'tnt'))
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    await ctx.cmd('/attribute @s minecraft:explosion_knockback_resistance base set 1', { mayFail: true })
    Object.assign(this, { ctx, c, cols, plan, P1, N0 })
    const s = this.standFor(N0, 24)
    await ctx.hotbar([['tnt', 64], 'flint_and_steel', ['tnt', 64], ['tnt', 64], ['bread', 16]])
    await ctx.tpCheck(s.x, s.y, s.z, s.yaw, 35)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return c
  },

  // open ground to stand on at (x, z): a surface the carpet can't cover is a house or water; -> feet y or null
  groundY (x, z) {
    const { bot, Vec3 } = this.ctx
    const g = this.ctx.surface(x, z)
    if (!g || !L.GROUND.test(g.name)) return null
    for (let k = 1; k <= 2; k++) { const b = bot.blockAt(new Vec3(x, g.position.y + k, z)); if (!b || !L.CLEAR.test(b.name)) return null }
    return g.position.y + 1
  },

  // where to stand to lay plan[from .. from + n]: just outside them, on the carpet (or open ground) there
  standFor (from, n, out = 2.4) {
    const { c, cols, plan } = this
    const next = plan.slice(from, from + n)
    if (!next.length) return null
    const mx = next.reduce((s, p) => s + p.x + 0.5, 0) / next.length, mz = next.reduce((s, p) => s + p.z + 0.5, 0) / next.length
    const dm = Math.max(1e-6, Math.hypot(mx - c.x, mz - c.z)), ux = (mx - c.x) / dm, uz = (mz - c.z) / dm
    const dmax = Math.max(...next.map(p => p.d))
    const sx = mx + ux * out, sz = mz + uz * out
    let best = null, bd = 1e9
    for (const col of cols) {
      if (col.d <= dmax + 0.6) continue
      const dd = Math.hypot(col.x + 0.5 - sx, col.z + 0.5 - sz)
      if (dd < bd) { bd = dd; best = col }
    }
    if (!best) return null
    const placed = plan.slice(0, from).filter(p => p.x === best.x && p.z === best.z).length
    const yaw = Math.atan2(-(mx - best.x - 0.5), mz - best.z - 0.5) * 180 / Math.PI
    return { x: best.x + 0.5, y: best.y + placed, z: best.z + 0.5, yaw }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { c, plan, N0 } = this
    const A = require('../lib/act')(ctx)
    let booms = 0, lastBoom = -99
    bot._client.on('explosion', () => { booms++; lastBoom = ctx.tick; if (booms === 1) ctx.mark('boom') })
    let n = N0, i = N0, clock0 = T0, tick0 = ctx.tick
    const pending = []                    // cells passed over (out of reach, a villager in them): the lapse lays them
    const now = () => clock0 + (ctx.tick - tick0) / 20
    // is the straight line to a stand clear for the body (0.6 wide, 1.8 tall) on the same level? (a fence, a wall or a
    // house corner on the way: the walk would slide or stop dead against it: owner check "stuck on the block")
    const clear = (to) => {
      const p = bot.entity.position, L = Math.hypot(to.x - p.x, to.z - p.z)
      if (Math.abs(to.y - p.y) > 0.6 || L < 0.8) return false
      const ux = (to.x - p.x) / L, uz = (to.z - p.z) / L
      for (let d = 0.3; d <= L + 0.4; d += 0.25) {
        for (const w of [-0.38, 0, 0.38]) {
          const x = p.x + ux * d - uz * w, z = p.z + uz * d + ux * w
          for (const dy of [0, 1]) {
            const b = bot.blockAt(new Vec3(Math.floor(x), Math.floor(p.y + 0.01) + dy, Math.floor(z)))
            if (!b || b.boundingBox === 'block') return false
          }
          const under = bot.blockAt(new Vec3(Math.floor(x), Math.floor(p.y + 0.01) - 1, Math.floor(z)))
          if (!under || under.boundingBox !== 'block') return false   // no step down off the carpet's edge
        }
      }
      return true
    }
    // the next stand with a clear walk to it (the frontier's stand, a little nearer or further out), or null: stay
    const nextStand = () => {
      for (const out of [2.4, 1.6, 3.2]) { const s = this.standFor(i, 24, out); if (s && clear(s)) return s }
      return null
    }
    // a short walk along the frontier to the next stand, looking where it goes
    const walk = async (to) => {
      if (!to) return false
      const goal = new Vec3(to.x, to.y, to.z)
      await A.turnTo(goal.offset(0, 1.2, 0), { max: 30 })
      bot.setControlState('forward', true)   // motion-ok: a short walk along the carpet on a checked clear line, looking where it goes
      for (let k = 0; k < 70; k++) {
        const p = bot.entity.position
        if (Math.hypot(p.x - goal.x, p.z - goal.z) < 0.6) break
        await A.view(goal.offset(0, 1.2, 0))
        await bot.waitForTicks(1)
      }
      bot.setControlState('forward', false)   // motion-ok: the walk's end
      await bot.waitForTicks(3)
      return true
    }
    // nothing left in reach and no clear walk: look round the village (villagers, the carpet) until the time is up
    const look = async (end) => {
      const pts = [new Vec3(c.x + 0.5, c.y + 2, c.z + 0.5), new Vec3(c.x + 14, c.y + 1, c.z - 9), new Vec3(c.x - 12, c.y + 1, c.z + 10)]
      for (let k = 0; ctx.tick < end; k++) await A.turnTo(pts[k % pts.length], { max: Math.max(1, Math.min(50, end - ctx.tick)), hold: 8 })
    }
    // lay the plan's next cells for `ticks`: a window of the next 30 from where the bot stands, each a real aimed place
    // (lib/act.js); a cell out of reach or refused waits for the lapse. Window done and time left: walk on and go again
    const lay = async (ticks) => {
      const end = ctx.tick + ticks
      while (ctx.tick < end - 20 && i < plan.length) {
        const win = plan.slice(i, i + 30); i += win.length
        for (const p of win) {
          if (ctx.tick >= end) { pending.push(p); continue }
          const eye = bot.entity.position.offset(0, 1.62, 0)
          if (eye.distanceTo(new Vec3(p.x + 0.5, p.y + 0.5, p.z + 0.5)) > 4.4) { pending.push(p); continue }
          try { await A.place(new Vec3(p.x, p.y, p.z), { max: 30 }) } catch (e) { pending.push(p); continue }
          await bot.waitForTicks(2)
          const b = bot.blockAt(new Vec3(p.x, p.y, p.z))
          if (b && b.name === 'tnt') { n++; L.count(ctx, n) } else pending.push(p)
          const held = bot.inventory.slots[36]
          if (held && held.count < 8) await ctx.cmd('/item replace entity @s hotbar.0 with tnt 64', { mayFail: true })
        }
        if (ctx.tick < end - 40 && !(await walk(nextStand()))) break
      }
      if (ctx.tick < end) await look(end)
      while (ctx.tick < end) await bot.waitForTicks(1)
    }

    M.shot(ctx, 'pov')
    L.clock(ctx, T0, 1); L.count(ctx, n)
    ctx.mark('live_on')
    await lay(14 * 20)
    // the drone: the whole village and the carpet; 56e moves on along the frontier in the same tick (inside the cut)
    M.shot(ctx, 'drone')
    const s2 = this.standFor(i, 24)
    if (s2) await ctx.cmd(`/tp @s ${s2.x} ${s2.y} ${s2.z} ${s2.yaw.toFixed(1)} 35`)   // motion-ok: on the cut to the drone (not a POV shot)
    await lay(9 * 20)
    M.shot(ctx, 'pov')
    await lay(12 * 20)

    // "skipping 4 hours": the rest of the carpet goes down in bursts under the drone while the clock races to T-10 s
    M.shot(ctx, 'lapse')
    const edge = this.edgeStand()
    await ctx.cmd(`/tp @s ${edge.x} ${edge.y} ${edge.z} ${edge.yaw.toFixed(1)} 10`)   // motion-ok: on the cut to the lapse drone
    ctx.mark('lapse_a')
    const left = pending.concat(plan.slice(i))
    const from = now(), to = L.STREAM_S - LEFT
    clock0 = from; tick0 = ctx.tick
    L.clock(ctx, from, (to - from) / (LAPSE / 20))
    for (let k = 0; k < LAPSE; k++) {
      const a = Math.floor(left.length * k / LAPSE), b = Math.floor(left.length * (k + 1) / LAPSE)
      if (b > a) { for (const cmd of L.fills(left.slice(a, b), 'tnt')) bot.chat(cmd); n += b - a; if (k % 4 === 0) L.count(ctx, n) }
      await bot.waitForTicks(1)
    }
    L.count(ctx, n)
    await bot.waitForTicks(4)

    // the last 10 seconds, live: at the edge with flint and steel, the view over the TNT sea, then light it at 0:00:00
    M.shot(ctx, 'pov')
    ctx.mark('lapse_b')
    L.clock(ctx, to, 1)
    ctx.select(1)
    const tLit = ctx.tick + LEFT * 20
    const tgt = new Vec3(edge.tnt.x + 0.5, edge.tnt.y + 0.5, edge.tnt.z + 0.5)
    const side = (deg) => { const a = Math.atan2(c.z - edge.z, c.x - edge.x) + deg * Math.PI / 180; return new Vec3(edge.x + Math.cos(a) * 18, c.y + 1, edge.z + Math.sin(a) * 18) }
    await A.turnTo(new Vec3(c.x + 0.5, c.y + 3, c.z + 0.5), { max: 30, hold: 30 })
    await A.turnTo(side(-28), { max: 60, hold: 25 })
    await A.turnTo(side(26), { max: 70, hold: 25 })
    while (ctx.tick < tLit - 28) await bot.waitForTicks(1)
    await A.turnTo(tgt, { max: 24 })
    while (ctx.tick < tLit) await bot.waitForTicks(1)
    try { await A.use(edge.tnt, { sound: 'item.flintandsteel.use' }) } catch (e) { ctx.log('light', e.message); await ctx.cmd(`/summon tnt ${edge.tnt.x + 0.5} ${edge.tnt.y} ${edge.tnt.z + 0.5}`) }
    ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    L.clock(ctx, L.STREAM_S, 0)
    const lit = ctx.tick
    await bot.waitForTicks(12)
    ctx.mark('fuse_a')
    M.shot(ctx, 'boom')
    const away = this.awayStand(edge)
    await ctx.cmd(`/tp @s ${away.x} ${away.y} ${away.z} ${away.yaw.toFixed(1)} 0`)   // motion-ok: on the cut to the blast drone
    while (ctx.tick - lit < 70 && !booms) await bot.waitForTicks(1)
    ctx.mark('fuse_b')
    for (let k = 0; k < 2400 && (booms < 20 || ctx.tick - lastBoom < 30); k++) await bot.waitForTicks(1)
    ctx.log('booms', booms, 'tnt', n, 'pending at the lapse', pending.length)
    return booms > 0
  },

  // the final stand: open ground just outside the carpet's edge, the outermost TNT in reach, facing the middle
  edgeStand () {
    const { c, cols, plan } = this
    const top = new Map()
    for (const p of plan) { const k = `${p.x},${p.z}`; if (!top.has(k) || top.get(k).y < p.y) top.set(k, p) }
    const carpet = new Set(cols.map(col => `${col.x},${col.z}`))
    const outer = cols.filter(col => col.d > R - 1.5).sort((a, b) => b.d - a.d)
    for (const col of outer) {
      const ux = (col.x - c.x) / col.d, uz = (col.z - c.z) / col.d
      const sx = Math.round(col.x + ux * 2.2), sz = Math.round(col.z + uz * 2.2)
      if (carpet.has(`${sx},${sz}`)) continue
      const y = this.groundY(sx, sz)
      if (y === null || Math.abs(y - col.y) > 1) continue
      const yaw = Math.atan2(-(c.x - sx), c.z - sz) * 180 / Math.PI
      const t = top.get(`${col.x},${col.z}`)
      return { x: sx + 0.5, y, z: sz + 0.5, yaw, tnt: new this.ctx.Vec3(t.x, t.y, t.z) }
    }
    throw new Error('no open stand at the carpet edge')
  },
  // out of the blast for the drone's shot: open ground 40-70 blocks further out along the same line
  awayStand (edge) {
    const { c } = this
    const d = Math.hypot(edge.x - c.x, edge.z - c.z), ux = (edge.x - c.x) / d, uz = (edge.z - c.z) / d
    for (let r = 40; r <= 90; r += 2) {
      const x = Math.floor(edge.x + ux * r), z = Math.floor(edge.z + uz * r), y = this.groundY(x, z)
      if (y !== null) return { x: x + 0.5, y, z: z + 0.5, yaw: edge.yaw }
    }
    return { x: edge.x, y: edge.y + 60, z: edge.z, yaw: edge.yaw }
  }
}
