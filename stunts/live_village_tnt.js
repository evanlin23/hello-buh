// Live format sample 1 (docs/livestream.md): "THE VILLAGE EXPLODES", in rounds. A real plains village; 56e packs one
// target at a time with TNT and blows it when its countdown hits 0:00, a house every few minutes, a new village every
// hour, the whole village at the end. The big countdown is always the CURRENT round's (owner 2026-11-14: "we need to
// make it seem like the tnt is always 'just about to explode' so they wait"); the long one ("WHOLE VILLAGE 4:42:00")
// is the small line under it. The 8 h stream is this, chunked; this 1-minute sample is three slices of it:
//   1. live, 3:17:34 into the stream: "THIS HOUSE EXPLODES IN 0:26". The house is packed with TNT; 56e lays the
//      last of the ring round it (real aimed places), takes out flint and steel, lights it at 0:00, backs off
//   2. the drone: the house goes up; "NEXT: THE FARM EXPLODES IN 2:30"
//   3. "skipping to the final round": the drone time-lapse while the whole village is carpeted, the clock racing
//   4. the last 10 seconds, live: 56e at the edge with flint and steel, 0:00, the whole village goes up
// Owner, 2026-11-14 (r:r584b30): "the village is like going to explode soon. It's just like me like placing a bunch of
// TNT and stuff. So it should be like really like baked like that."
const L = require('../lib/live')
const M = require('../lib/movie')

const R = 30            // the village carpet's radius round the locate point (the final round)
const LAYERS = 2
const ROUND_AT = 3 * 3600 + 18 * 60   // this house goes off 3:18:00 into the stream
const OPEN = 26         // the sample opens this many seconds before it
const NEXT = 150        // the next round's blast, 2:30 after
const LIVE_RING = 22    // ring cells left for 56e to lay on camera
const LEFT = 10         // the final round's last 10 s, live
const LAPSE = 480       // ticks of the time-lapse (24 s recorded, x4 in the edit)

module.exports = {
  name: 'live_village_tnt',
  // the bands (scripts/live_overlay.py): the stream's length, the counter, the long countdown's name
  // (no `final` line: owner 2026-11-14, "are people gonna wait 2 hours... really?": nothing on screen counts in hours)
  live: { stream: L.STREAM_S, counter: 'TNT', icon: 'tnt' },
  time: 6000,
  renderDistance: 10,
  botTimeout: 1500,
  settleWait: 100,
  explodeSoundEvery: 2,
  entityRadius: 160,   // the drones' anchors (below) stay recorded wherever 56e is
  caption: 'this village explodes in 8 HOURS 💀',
  // the drones orbit two invisible anchors summoned in setup (interaction entities: no model, no shadow), registered
  // as actors: the round's house and the village's middle
  shots: {
    pov: { pov: true },
    house: { orbit: 'actor:house', radius: 19, height: 9, startDeg: 30, degPerSec: 7, fov: 64 },
    lapse: { orbit: 'actor:village', radius: 58, height: 38, startDeg: 250, degPerSec: 2, fov: 62 },
    boom: { orbit: 'actor:village', radius: 72, height: 42, startDeg: 20, degPerSec: 2, fov: 64 }
  },
  edit: {
    caption: 'this village explodes in 8 HOURS 💀', red: '8 HOURS',
    // the blast runs ~20 s; neither the explosion packets nor the harness's settle find its end reliably (the server lags
    // under ~4,500 TNT and its block changes come in bursts), so the end is anchored on the take's recording end, set
    // from the take's last block change (TAKE below)
    startAt: 'live_on:0', endAfter: 'end:-8',
    // most of each fuse; the house's crater after 2.5 s of the NEXT countdown; the lapse x4; the final blast's middle x2
    // (the chain keeps going on screen, r:r24d99a: no cut while it goes off)
    speed: [['fuse1_a', 'fuse1_b', 'cut'], ['after1:2.5', 'lapse_a', 'cut'], ['lapse_a', 'lapse_b', 4], ['fuse2_a', 'fuse2_b', 'cut'], ['boom2:4', 'end:-11', 2]],
    cards: [['lapse_a', 'SKIPPING TO THE FINAL ROUND...', 1.6, 'yellow']],
    sfx: [['riser', 'lit1:-3.5', 'lit1'], ['boom', 'boom1'], ['impact', 'boom1', { gain: 1.2 }], ['whoosh', 'lapse_a'], ['whoosh', 'lapse_b'],
      ['riser', 'lit2:-4', 'lit2'], ['boom', 'boom2'], ['impact', 'boom2', { gain: 1.3 }]],
    flash: [['boom1', 0, 0.4], ['boom2', 0, 0.5]], shake: [['boom1', 0, 10], ['boom2', 0, 14]], punch: [['boom1', 0, 1.06], ['boom2', 0, 1.1]]
  },

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    for (const c of ['/difficulty peaceful', '/gamerule block_drops false', '/gamerule fall_damage false', '/gamerule keep_inventory true',
      '/gamerule tnt_explosion_drop_decay true']) await ctx.cmd(c, { mayFail: true })
    const c = await L.findVillage(ctx, { R: R + 48 })
    const cols = L.carpetColumns(ctx, c, R + 6, LAYERS)
    Object.assign(this, { ctx, c, cols })
    // the round's house: a real one (the roofed air round a bed), near the middle, with open ground round it for the ring
    const all = L.houses(ctx, c, R + 10)
    const hs = all.filter(h => h.cells.length >= 24 && h.cells.length <= 320).sort((a, b) => a.d - b.d)
    let H = null, ring = null
    for (const h of hs) {
      const foot = new Set(h.cells.map(p => `${p.x},${p.z}`))
      const near = (x, z) => { let m = 99; for (const k of foot) { const [fx, fz] = k.split(',').map(Number); m = Math.min(m, Math.max(Math.abs(fx - x), Math.abs(fz - z))) } return m }
      const r = cols.filter(col => { const m = near(col.x, col.z); return m >= 2 && m <= 3 })
      if (r.length >= 26) { H = h; ring = r; break }
    }
    if (!H) throw new Error(`no house with room round it (${hs.length} houses)`)
    const hc = { x: H.x + 0.5, z: H.z + 0.5 }
    ring = ring.map(col => ({ x: col.x, y: col.y, z: col.z, a: Math.atan2(col.z - H.z, col.x - H.x), d: Math.hypot(col.x + 0.5 - hc.x, col.z + 0.5 - hc.z) }))
      .sort((p, q) => p.a - q.a || p.d - q.d)
    ctx.log(`house at ${H.x.toFixed(1)} ${H.y} ${H.z.toFixed(1)} (${H.d.toFixed(1)} from the middle): ${H.cells.length} inside, ring ${ring.length}; ${all.length} houses`)
    // villagers inside go outside first (packed in, they'd suffocate on camera)
    const xs = H.cells.map(p => p.x), zs = H.cells.map(p => p.z), x0 = Math.min(...xs) - 1, z0 = Math.min(...zs) - 1
    const out = cols.find(col => Math.hypot(col.x - H.x, col.z - H.z) > 14) || c
    await ctx.cmd(`/tp @e[type=villager,x=${x0},y=${H.y - 1},z=${z0},dx=${Math.max(...xs) - x0 + 1},dy=6,dz=${Math.max(...zs) - z0 + 1}] ${out.x} ${out.y} ${out.z}`, { mayFail: true })
    // 3:17:34 in: the house is packed, the ring nearly done
    const pre = ring.length - LIVE_RING
    await L.bulk(ctx, L.fills(H.cells, 'tnt').concat(L.fills(ring.slice(0, pre), 'tnt')))
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    await ctx.cmd('/attribute @s minecraft:explosion_knockback_resistance base set 1', { mayFail: true })
    Object.assign(this, { H, hc, ring, pre, houseCount: all.length })
    // the drones' anchors: invisible interaction entities at the house and the village's middle
    const anchor = async (tag, x, y, z) => {
      await ctx.cmd(`/summon minecraft:interaction ${x} ${y} ${z} {width:0.1f,height:0.1f,Tags:["hb_${tag}"]}`)
      await bot.waitForTicks(6)
      const e = Object.values(bot.entities).filter(e => e.name === 'interaction').sort((a, b) => a.position.distanceTo(new ctx.Vec3(x, y, z)) - b.position.distanceTo(new ctx.Vec3(x, y, z)))[0]
      if (!e) throw new Error(`anchor ${tag}: not seen`)
      return e.id
    }
    this.anchors = { house: await anchor('house', hc.x, H.y + 1, hc.z), village: await anchor('village', c.x + 0.5, c.y + 2, c.z + 0.5) }
    const s = this.standFor(ring, pre, 12, hc)
    if (!s) throw new Error('no stand by the ring')
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

  // where to stand to lay cells[from .. from + n]: open ground just outside them (seen from `center`) that has the most
  // of them in reach (4.2 from the eye, none under the feet), nearest the ideal spot `out` blocks out
  standFor (cells, from, n, center, out = 2.4) {
    const next = cells.slice(from, from + n)
    if (!next.length) return null
    const taken = new Set(cells.map(p => `${p.x},${p.z}`))
    const mx = next.reduce((s, p) => s + p.x + 0.5, 0) / next.length, mz = next.reduce((s, p) => s + p.z + 0.5, 0) / next.length
    const dm = Math.max(1e-6, Math.hypot(mx - center.x, mz - center.z)), ux = (mx - center.x) / dm, uz = (mz - center.z) / dm
    const sx = mx + ux * out, sz = mz + uz * out
    let best = null, score = -1e9
    for (const col of this.cols) {
      if (taken.has(`${col.x},${col.z}`)) continue
      const dd = Math.hypot(col.x + 0.5 - sx, col.z + 0.5 - sz)
      if (dd > 6) continue
      const ex = col.x + 0.5, ey = col.y + 1.62, ez = col.z + 0.5
      let k = 0
      for (const p of next) { const h = Math.hypot(p.x + 0.5 - ex, p.z + 0.5 - ez); if (h >= 1.2 && Math.hypot(h, p.y + 0.5 - ey) <= 4.2) k++ }
      const sc = k - dd * 0.3
      if (k > 0 && sc > score) { score = sc; best = col }
    }
    if (!best) return null
    const yaw = Math.atan2(-(mx - best.x - 0.5), mz - best.z - 0.5) * 180 / Math.PI
    return { x: best.x + 0.5, y: best.y, z: best.z + 0.5, yaw }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { c, H, hc, ring } = this
    const A = require('../lib/act')(ctx)
    let booms = 0, lastBoom = -99, phase = 0
    bot._client.on('explosion', () => {
      booms++; lastBoom = ctx.tick
      if (phase === 1) { phase = 2; ctx.mark('boom1') }
      if (phase === 3) { phase = 4; ctx.mark('boom2') }
    })
    let clock0 = ROUND_AT - OPEN, tick0 = ctx.tick
    const now = () => clock0 + (ctx.tick - tick0) / 20
    let n = H.cells.length + this.pre

    // the hands (lib/live_crew.js): aimed places, walks on checked lines with 1-block steps, stands that reach the most
    const C = require('../lib/live_crew')(ctx, A, { cols: this.cols })
    const onPlace = () => { n++; L.count(ctx, n) }
    // a placed ring TNT within reach to light
    const lightable = () => {
      const eye = bot.entity.position.offset(0, 1.62, 0)
      let best = null, bd = 9
      for (const p of ring) {
        const b = bot.blockAt(new Vec3(p.x, p.y, p.z))
        const d = eye.distanceTo(new Vec3(p.x + 0.5, p.y + 0.5, p.z + 0.5))
        if (b && b.name === 'tnt' && d < bd && d > 1.6) { bd = d; best = new Vec3(p.x, p.y, p.z) }
      }
      return bd < 4.2 ? best : null
    }

    // 1. this round, live: the ring's last TNT, then flint and steel at 0:00
    for (const [tag, id] of Object.entries(this.anchors)) ctx.mark('actor', { tag, id, name: 'interaction' })
    M.shot(ctx, 'pov')
    L.clock(ctx, clock0, 1)
    L.target(ctx, 'THIS HOUSE EXPLODES IN', ROUND_AT, 'HOUSE')
    L.stat(ctx, 'HOUSES LEFT', this.houseCount)
    L.count(ctx, n)
    ctx.mark('live_on')
    const tLit = tick0 + OPEN * 20
    // the ring's last cells, then a second layer on the whole ring ("putting on the last few layers"): 56e is busy
    // right up to the flint and steel (take 1 ran out of reachable cells 3 s in and stared at the wall for 20 s)
    // take 2 still walked into houses and fences: the wall goes UP instead, every ring column in reach stacked to 4 high,
    // row by row from the bottom (no walking needed), then the rest of the ring if a clear walk opens
    const eye = bot.entity.position.offset(0, 1.62, 0)
    const reach = (q) => eye.distanceTo(new Vec3(q.x + 0.5, q.y + 0.5, q.z + 0.5)) <= 4.3 && Math.hypot(q.x + 0.5 - eye.x, q.z + 0.5 - eye.z) >= 1.3
    const stack = []
    for (let k = 0; k < 4; k++) for (const q of ring) { const c2 = { x: q.x, y: q.y + k, z: q.z, a: q.a }; if (reach(c2)) stack.push(c2) }
    const isTnt = (q) => { const b = bot.blockAt(new Vec3(q.x, q.y, q.z)); return b && b.name === 'tnt' }
    let r = await C.lay(stack.filter(q => !isTnt(q)), { from: 0, until: tLit - 7 * 20, center: hc, win: 40, onPlace })
    if (ctx.tick < tLit - 10 * 20) r = await C.lay(ring.slice(this.pre).filter(q => !isTnt(q)), { from: 0, until: tLit - 7 * 20, center: hc, win: 10, onPlace })
    ctx.log(`the house round: ${n} TNT`)
    const house = new Vec3(hc.x, H.y + 1.5, hc.z)
    await A.turnTo(house, { max: 40, hold: 6 })
    ctx.select(1)
    let tnt = lightable()
    while (ctx.tick < tLit - 30) { await A.turnTo(ctx.tick % 40 < 20 ? house : (tnt ? tnt.offset(0.5, 0.5, 0.5) : house), { max: 10 }); await bot.waitForTicks(1) }   // (turnTo returns at once when already on it)
    if (tnt) await A.turnTo(tnt.offset(0.5, 0.5, 0.5), { max: 24 })
    while (ctx.tick < tLit) await bot.waitForTicks(1)
    phase = 1
    tnt = tnt || lightable()
    try { if (!tnt) throw new Error('nothing in reach'); await A.use(tnt, { sound: 'item.flintandsteel.use' }) } catch (e) { ctx.log('light 1', e.message); await ctx.cmd(`/summon tnt ${ring[0].x + 0.5} ${ring[0].y} ${ring[0].z + 0.5}`) }
    ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit1')
    const lit1 = ctx.tick
    try { await A.back(14) } catch (e) {}
    ctx.mark('fuse1_a')
    M.shot(ctx, 'house')
    while (ctx.tick - lit1 < 68 && phase < 2) await bot.waitForTicks(1)
    ctx.mark('fuse1_b')
    for (let k = 0; k < 600 && (phase < 2 || ctx.tick - lastBoom < 25); k++) await bot.waitForTicks(1)
    // 2. the crater; the next round's countdown starts
    ctx.mark('after1')
    L.target(ctx, 'NEXT: THE FARM EXPLODES IN', ROUND_AT + NEXT, 'FARM')
    L.stat(ctx, 'HOUSES LEFT', this.houseCount - 1)
    L.count(ctx, null)
    await bot.waitForTicks(70)

    // 3. "skipping to the final round": the whole village carpeted under the drone, the clock racing to T-10 s
    // inside the edit's cut (after1:2.5 -> lapse_a, never on screen): the plan for the world as it is now (the crater),
    // the iron golems out (the blast flings them: the glitch check reads that as a teleport), 56e to the edge
    // first the camera to the ground (a POV shot, never on screen): the check counts anything in view of the camera as
    // seen, the edit's cut included, so the mobs go while it looks down
    M.shot(ctx, 'pov')
    await A.turnTo({ yaw: bot.entity.yaw, pitch: -Math.PI / 2 + 0.05 }, { max: 30 })
    this.cols = L.carpetColumns(ctx, c, R, LAYERS)
    const plan = L.carpetPlan(this.cols, LAYERS)
    const edge = this.edgeStand(plan)
    // every mob out (the final blast flings them several blocks a tick: the glitch check reads that as a teleport, and
    // it has no blast exemption the Shorts don't also get)
    await ctx.cmd('/kill @e[type=!player,type=!interaction]', { mayFail: true })   // (a /tp away reads as a jump to the check)
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    await ctx.cmd(`/tp @s ${edge.x} ${edge.y} ${edge.z} ${edge.yaw.toFixed(1)} 10`)   // motion-ok: inside the edit's cut, before the lapse drone
    await bot.waitForTicks(10)
    M.shot(ctx, 'lapse')
    ctx.mark('lapse_a')
    const from = now(), to = L.STREAM_S - LEFT
    clock0 = from; tick0 = ctx.tick
    L.clock(ctx, from, (to - from) / (LAPSE / 20))
    L.target(ctx, 'THE WHOLE VILLAGE EXPLODES IN', L.STREAM_S, 'WHOLE VILLAGE')
    L.stat(ctx, 'ROUND', 'FINAL')
    n = 0
    for (let k = 0; k < LAPSE; k++) {
      const a = Math.floor(plan.length * k / LAPSE), b = Math.floor(plan.length * (k + 1) / LAPSE)
      if (b > a) { for (const cmd of L.fills(plan.slice(a, b), 'tnt')) bot.chat(cmd); n += b - a; if (k % 4 === 0) L.count(ctx, n) }
      await bot.waitForTicks(1)
    }
    L.count(ctx, n)
    await bot.waitForTicks(4)

    // 4. the last 10 seconds, live: the edge, flint and steel, the view over the TNT, lit at 0:00
    M.shot(ctx, 'pov')
    ctx.mark('lapse_b')
    clock0 = to; tick0 = ctx.tick
    L.clock(ctx, to, 1)
    const tLit2 = ctx.tick + LEFT * 20
    const tgt = new Vec3(edge.tnt.x + 0.5, edge.tnt.y + 0.5, edge.tnt.z + 0.5)
    const side = (deg) => { const a = Math.atan2(c.z - edge.z, c.x - edge.x) + deg * Math.PI / 180; return new Vec3(edge.x + Math.cos(a) * 18, c.y + 1, edge.z + Math.sin(a) * 18) }
    await A.turnTo(new Vec3(c.x + 0.5, c.y + 3, c.z + 0.5), { max: 30, hold: 20 })
    await A.turnTo(side(-28), { max: 60, hold: 20 })
    await A.turnTo(side(26), { max: 70, hold: 20 })
    while (ctx.tick < tLit2 - 30) await bot.waitForTicks(1)
    await A.turnTo(tgt, { max: 24 })
    while (ctx.tick < tLit2) await bot.waitForTicks(1)
    phase = 3
    try { await A.use(edge.tnt, { sound: 'item.flintandsteel.use' }) } catch (e) { ctx.log('light 2', e.message); await ctx.cmd(`/summon tnt ${edge.tnt.x + 0.5} ${edge.tnt.y} ${edge.tnt.z + 0.5}`) }
    ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit2')
    const lit2 = ctx.tick
    await bot.waitForTicks(12)
    ctx.mark('fuse2_a')
    M.shot(ctx, 'boom')
    const away = this.awayStand(edge)
    await ctx.cmd(`/tp @s ${away.x} ${away.y} ${away.z} ${away.yaw.toFixed(1)} 0`)   // motion-ok: on the cut to the blast drone
    while (ctx.tick - lit2 < 70 && phase < 4) await bot.waitForTicks(1)
    ctx.mark('fuse2_b')
    for (let k = 0; k < 2400 && (phase < 4 || ctx.tick - lastBoom < 30); k++) await bot.waitForTicks(1)
    ctx.mark('blast_end')   // 1.5 s after the last explosion
    ctx.log('booms', booms, 'carpet', n)
    return phase === 4
  },

  // the final stand: open ground just outside the carpet's edge, the outermost TNT in reach, facing the middle
  edgeStand (plan) {
    const { c, cols } = this
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
  // out of the blast for the drone's shot: open ground 40-90 blocks further out along the same line
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
