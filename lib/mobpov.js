// The "mobpov" format (family `mobpov`; docs/formats.md, STANDARDS r:r8048f1): an annoying mob trait blown up into an
// unstoppable, absurdly fast POV chase. The narrator IS the mob (render.js stunt.self: a baby zombie's model and eye
// height), and it tears in a straight line through walls, pens, mobs and houses. Each episode swaps the mob, the trait
// and the course; this module is the part that stays the same.
//
// How the speed is made (no physics, no whips):
//   - The recording bot's client position is driven directly, one step a tick (rusher().dash): 1.0-1.5 blocks a tick
//     is 20-30 blocks/s, 4-5x a sprint. The camera only TRAVELS fast; it never turns fast. Turns go through R.turn
//     (smoothstep, capped at R.maxTurn deg/s, default 150, under the followable-camera rule r:r38374d's 220), and the
//     legs of the chase are joined by hard cuts (R.cut: a 'cut' mark, so render.js snaps and the whip check skips it).
//   - The server never sees those moves: the bot's movement packets are held back while the rusher runs (the server
//     would reject 30 blocks/s, and a /tp a tick floods the chat). The server-side player stays parked over the course
//     (R.park), close enough that every chunk and mob on the course is sent and simulated.
//   - What the mob runs into breaks: a bore (w x h blocks) ahead of it is cleared with /fill ... air, each block with
//     its crumbs (a 'particles' block mark) and one break sound a tick (no drops: block_drops off, /fill drops nothing).
//   - Mobs in the way are flung: /damage (the red hurt flash) and a Motion kick up and to the side, their hurt sound.
//
// R (rusher(ctx, o)) in perform:
//   R.start(parkAt)          take over: physics off, movement packets held, a 50 ms tick clock (physicsTick, so the
//                            harness records every tick and waitForTicks works); parks the server-side player first
//   R.cut(pos, yaw, pitch)   a hard cut to a new spot (radians, mineflayer convention: yaw 0 north, -PI/2 east)
//   R.shot(name)             a camera shot from stunt.shots ({ pov: true } = the mob's own eyes again)
//   await R.hold(n)          n ticks in place
//   await R.turn(yaw, pitch, n)   an eased turn over n ticks (throws if it would go over maxTurn deg/s)
//   await R.dash(to, o)      run in a straight line to `to` (Vec3, feet). o: speed (blocks/tick), accel / decel
//                            (ticks of ease in / out), bore { w, h, lead } (blocks cleared ahead, 0 = none), knock
//                            (fling mobs in the way: true), steps (footstep sound every n ticks, 0 = none), onTick(k, p)
//   R.hit(entity, kick)      fling one entity now: kick = [vx, vy, vz] (blocks/tick)
//   R.hover(kind, o)         a flying narrator (a bee, an allay): its model's hover bob from now on, and a slow drift
//                            (hoverAt below; R.hover(null) stops it). Every hold, turn, dash and fly bobs with it
//   await R.fly(points, o)   fly a smooth curve through `points` (feet Vec3s; flightPlan below): constant speed with
//                            an eased start and stop, the view looking ahead along the curve (or at o.look), low over
//                            the ground with o.above, every turn under R.maxTurn (it throws with the peak if not)
//   R.pos, R.yaw, R.pitch    where the narrator is
// The narrator's eye height comes from stunt.self.eye (render.js); R works in feet positions like the bot.
const MOVE_PACKETS = new Set(['position', 'position_look', 'look', 'flying'])
const AIR = new Set(['air', 'cave_air', 'void_air'])

// a block's break sound (vanilla sound events)
function breakSound (name) {
  if (/netherrack|nether_.*_ore/.test(name)) return 'block.netherrack.break'
  if (/deepslate/.test(name)) return 'block.deepslate.break'
  if (/glass/.test(name)) return 'block.glass.break'
  if (/grass_block|dirt|podzol|farmland|short_grass|tall_grass|fern|flower|poppy|dandelion|tulip|daisy|bluet|cornflower|hay/.test(name)) return 'block.grass.break'
  if (/gravel/.test(name)) return 'block.gravel.break'
  if (/planks|_log|_wood|fence|door|chest|crafting_table|bookshelf|stairs|slab|barrel|trapdoor|bed|sign|lectern/.test(name) && !/stone|brick|cobble|deepslate|blackstone/.test(name)) return 'block.wood.break'
  if (/wool|carpet/.test(name)) return 'block.wool.break'
  return 'block.stone.break'
}

const HURT = { pig: 'entity.pig.hurt', cow: 'entity.cow.hurt', sheep: 'entity.sheep.hurt', chicken: 'entity.chicken.hurt', villager: 'entity.villager.hurt', iron_golem: 'entity.iron_golem.hurt', mannequin: 'entity.player.hurt', zombified_piglin: 'entity.zombified_piglin.hurt', piglin: 'entity.piglin.hurt', horse: 'entity.horse.hurt', goat: 'entity.goat.hurt', cat: 'entity.cat.hurt', wolf: 'entity.wolf.hurt' }

const ease = (u) => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u)
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
const yawTo = (d) => Math.atan2(-d.x, -d.z)

// ---- flying mobs (docs/engine_features.md "Flying-mob POV, the crane, the Nether")
// The hover bob is the model's own, from the vanilla client:
//   BeeModel.setupAnim (not angry): bone.y -= cos(age x 0.18) x 0.9 px, bone.xRot = 0.1 + cos(age x 0.18) x PI x 0.025
//   AllayModel.setupAnim: root.y += cos(age x 9 deg) x 0.25 px (the arms' sin(age x 9 deg) in renderer/entities.js)
// In a POV the body's bob is the eye's. `scale` multiplies the height (x1.6 by default: the bee's own 0.056 blocks read
// as still on a phone), `nod` the pitch (x0.35 by default: the body's +-4.5 degrees tilted the whole frame), `drift`
// is a slow horizontal sway in blocks (bees never hang dead still). It ramps in over `ramp` ticks (no jump on start).
const HOVER = {
  bee: { rate: 0.18, amp: 0.9 / 16, nod: Math.PI * 0.025, drift: 0.05 },
  allay: { rate: 9 * Math.PI / 180, amp: 0.25 / 16, nod: 0, drift: 0.05 }
}
function hoverSpec (kind = 'bee', o = {}) {
  const base = typeof kind === 'object' ? kind : HOVER[kind]
  if (!base) throw new Error(`mobpov: no hover '${kind}' (have ${Object.keys(HOVER).join(', ')}, or pass { rate, amp, nod, drift })`)
  return { rate: base.rate, amp: base.amp * (o.scale ?? 1.6), nod: (base.nod || 0) * (o.nod ?? 0.35), drift: o.drift ?? base.drift ?? 0, ramp: o.ramp ?? 10, t0: o.t0 ?? 0 }
}
// the offset at tick `tick` (blocks; pitch in radians, mineflayer: + is up)
function hoverAt (h, tick) {
  const k = tick - h.t0, env = h.ramp > 0 ? Math.min(1, Math.max(0, k / h.ramp)) : 1
  const e = env * env * (3 - 2 * env), c = Math.cos(tick * h.rate)
  return { x: Math.sin(tick * 0.047 + 1.3) * h.drift * e, y: -c * h.amp * e, z: Math.sin(tick * 0.031 + 0.4) * h.drift * e, pitch: -c * h.nod * e }
}

// A flight: a centripetal Catmull-Rom curve from `from` through `points` (no stop at the middle points, no loops or
// cusps), flown at `speed` blocks a tick, easing in over `accel` ticks and out over `decel`. Pure (lib/hb/test).
//   o.look      'ahead' (default: `lead` blocks further along the curve; past its end, straight on), or a point
//               {x, y, z} (flying at someone), or (p, k) => point
//   o.lead      blocks of look-ahead (3); o.pitchFollow: how much of the climb/dive the view follows (0.5)
//   o.above     keep the feet this high over the ground (groundAt(x, z, yHint) -> y of the top of the solid block
//               under the point): the curve's own heights are then ignored. The ground is looked at `lead` ahead and
//               smoothed, so the flight lifts before a rise instead of skimming into it
//   o.v0        the speed it is already flying at (R.fly passes the last leg's): a leg joins the last one smoothly
//   o.yaw0, o.pitch0, o.blend   the view the flight starts from: it eases from there to its own heading over
//               `blend` ticks (accel by default)
// Returns { ticks: [{ x, y, z, yaw, pitch }], length, peakTurn (deg/s) }.
function flightPlan (from, points, o = {}, groundAt = null) {
  const { speed = 0.5, accel = 6, decel = 6, lead = 3, pitchFollow = 0.5, above = null } = o
  const P = [from, ...points].map(p => ({ x: p.x, y: p.y, z: p.z }))
  if (P.length < 2) throw new Error('mobpov: fly needs at least one point')
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }), len = (a) => Math.hypot(a.x, a.y, a.z)
  const ext = [{ x: 2 * P[0].x - P[1].x, y: 2 * P[0].y - P[1].y, z: 2 * P[0].z - P[1].z }, ...P,
    { x: 2 * P[P.length - 1].x - P[P.length - 2].x, y: 2 * P[P.length - 1].y - P[P.length - 2].y, z: 2 * P[P.length - 1].z - P[P.length - 2].z }]
  // Barry-Goldman's centripetal Catmull-Rom (alpha 0.5) between ext[i+1] and ext[i+2]
  const seg = (i, s) => {
    const p0 = ext[i], p1 = ext[i + 1], p2 = ext[i + 2], p3 = ext[i + 3]
    const kn = (a, b) => Math.max(1e-4, Math.sqrt(len(sub(b, a))))
    const t0 = 0, t1 = t0 + kn(p0, p1), t2 = t1 + kn(p1, p2), t3 = t2 + kn(p2, p3), t = t1 + (t2 - t1) * s
    const L = (a, b, ta, tb) => { const w = (tb - t) / (tb - ta), v = (t - ta) / (tb - ta); return { x: a.x * w + b.x * v, y: a.y * w + b.y * v, z: a.z * w + b.z * v } }
    const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3)
    return L(L(A1, A2, t0, t2), L(A2, A3, t1, t3), t1, t2)
  }
  // a dense polyline with its arc length
  const poly = [P[0]], cum = [0]
  for (let i = 0; i < P.length - 1; i++) {
    const n = Math.max(8, Math.ceil(len(sub(P[i + 1], P[i])) * 6))
    for (let k = 1; k <= n; k++) { const q = seg(i, k / n); cum.push(cum[cum.length - 1] + len(sub(q, poly[poly.length - 1]))); poly.push(q) }
  }
  const total = cum[cum.length - 1]
  const at = (s) => {
    if (s >= total) { const a = poly[poly.length - 2], b = poly[poly.length - 1], d = sub(b, a), l = Math.max(1e-6, len(d)), x = s - total; return { x: b.x + d.x / l * x, y: b.y + d.y / l * x, z: b.z + d.z / l * x } }
    let lo = 0, hi = cum.length - 1
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m }
    const f = (s - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]), a = poly[lo], b = poly[hi]
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f }
  }
  // the speed profile (as dash): ease in, cruise, ease out to a crawl at the end
  const S = []
  let s = 0, k = 0
  while (s < total - 1e-6 && k < 20000) {
    k++
    const v0 = Math.min(speed, o.v0 || 0)
    let v = Math.min(speed, v0 + (speed - v0) * Math.min(1, k / Math.max(1, accel)))
    if (decel > 0) v = Math.min(v, Math.max(speed * 0.12, speed * Math.sqrt(Math.min(1, (total - s) / (speed * decel * 0.5)))))
    s = Math.min(total, s + v)
    S.push(s)
  }
  const pts = S.map(q => at(q))
  if (above !== null && groundAt) {
    // the ground under the path and `lead` ahead of it; then a 7-tick average (a podzol stripe or a flower is no bump)
    const g = S.map((q, i) => { let m = -Infinity; for (const d of [0, lead * 0.5, lead]) { const p = at(Math.min(total, q + d)); const y = groundAt(p.x, p.z, pts[i].y); if (y !== null && y !== undefined && y > m) m = y } return m })
    const fill = g.map((v, i) => Number.isFinite(v) ? v : (pts[i].y - above))
    for (let i = 0; i < pts.length; i++) { let a = 0, n = 0; for (let j = Math.max(0, i - 3); j <= Math.min(pts.length - 1, i + 3); j++) { a += fill[j]; n++ } pts[i].y = a / n + above }
  }
  // the heading
  const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  const lookAt = (i) => {
    if (o.look && o.look !== 'ahead') return typeof o.look === 'function' ? o.look(pts[i], i) : o.look
    const q = at(S[i] + lead)
    if (above !== null && groundAt) q.y = pts[Math.min(pts.length - 1, i + Math.round(lead / Math.max(1e-3, speed)))].y
    return q
  }
  const blend = o.blend ?? accel
  const ticks = []
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], t = lookAt(i), d = sub(t, p)
    let yaw = yawTo(d), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)) * (o.look && o.look !== 'ahead' ? 1 : pitchFollow)
    if (Math.hypot(d.x, d.z) < 1e-3 && ticks.length) { yaw = ticks[ticks.length - 1].yaw; pitch = ticks[ticks.length - 1].pitch }
    if (o.yaw0 !== undefined && blend > 0 && i < blend) {
      const u = (i + 1) / blend, e = u * u * (3 - 2 * u)
      yaw = o.yaw0 + wrapA(yaw - o.yaw0) * e; pitch = (o.pitch0 ?? 0) + (pitch - (o.pitch0 ?? 0)) * e
    }
    ticks.push({ x: p.x, y: p.y, z: p.z, yaw, pitch })
  }
  let peak = 0, prev = o.yaw0 !== undefined ? { yaw: o.yaw0, pitch: o.pitch0 ?? 0 } : ticks[0]
  for (const q of ticks) { peak = Math.max(peak, Math.hypot(wrapA(q.yaw - prev.yaw) * Math.cos(q.pitch), q.pitch - prev.pitch) * 20 * 180 / Math.PI); prev = q }
  return { ticks, length: total, peakTurn: peak }
}

function rusher (ctx, o = {}) {
  const { bot, Vec3 } = ctx
  const R = {
    maxTurn: o.maxTurn || 150,          // deg/s: under r:r38374d's 220 (and the whip check's 240), eased
    pos: null, yaw: 0, pitch: 0,
    hitIds: new Set(),
    tick: 0,
    async start (parkAt) {
      // park the server-side player over the course (creative: no fall damage, no mobs targeting it)
      await ctx.cmd('/gamemode creative')
      await ctx.cmd(`/tp @s ${parkAt.x.toFixed(2)} ${parkAt.y.toFixed(2)} ${parkAt.z.toFixed(2)}`)
      await bot.waitForTicks(6)
      R.pos = bot.entity.position.clone(); R.yaw = bot.entity.yaw; R.pitch = bot.entity.pitch
      // hold back movement packets from here on (the server keeps the parked spot), then drive the clock ourselves
      const write = bot._client.write.bind(bot._client)
      bot._client.write = (name, params) => { if (MOVE_PACKETS.has(name)) return; return write(name, params) }
      bot.physicsEnabled = false
      bot.entity.velocity.set(0, 0, 0)
      R.clock = setInterval(() => {
        if (R.pos) {
          // R.hover: a flying mob's bob (and a slow drift) on top of where it is (R.pos stays the path's point)
          const h = R.hoverSpec ? hoverAt(R.hoverSpec, R.tick) : null
          bot.entity.position.set(R.pos.x + (h ? h.x : 0), R.pos.y + (h ? h.y : 0), R.pos.z + (h ? h.z : 0))
          bot.entity.yaw = R.yaw; bot.entity.pitch = R.pitch + (h ? h.pitch : 0); bot.entity.onGround = !R.hoverSpec
        }
        R.tick++
        bot.emit('physicsTick')
      }, 50)
      await bot.waitForTicks(1)
    },
    // apply the state on the next clock tick and wait for it
    async step () {
      await bot.waitForTicks(1)
      // staged kicks (R.hit): a flung mob speeds up over 3 entity syncs, never from rest to 1 block a tick at once
      for (const q of R.kicks.splice(0)) { if (R.tick >= q.at) bot.chat(q.cmd); else R.kicks.push(q) }
      // scripted flights (R.fling): one /tp a tick along the path
      for (const f of R.flights.splice(0)) {
        f.k++
        const p = f.path(Math.min(1, f.k / f.n))
        bot.chat(`/tp ${f.who} ${p.x.toFixed(3)} ${p.y.toFixed(3)} ${p.z.toFixed(3)}`)
        if (f.k < f.n) R.flights.push(f)
      }
    },
    flights: [],
    // fly one entity along path(u) (u 0..1, world Vec3s) over n ticks, a /tp a tick: a knock-back that has to land
    // somewhere exact (56e through his portal). Ease the path's start (the motion check: from rest to over 0.6
    // blocks a tick reads as a teleport)
    fling (e, path, n, { sound = true } = {}) {
      if (!e || !e.uuid) { ctx.log(`mobpov: fling: no entity/uuid`); return }
      R.hitIds.add(e.id)
      bot.chat(`/damage ${e.uuid} 1 minecraft:generic`)
      if (sound) ctx.sound(HURT[e.name] || 'entity.player.hurt', 1, 1)
      R.flights.push({ who: e.uuid, path, n, k: 0 })
      ctx.mark('mob_hit', { id: e.id, name: e.name, fling: n })
    },
    kicks: [],
    cutTick: -99,
    // render.js / rec_check snap the camera on any step over 0.8 blocks within 4 ticks of a cut mark: a dash
    // that starts on a cut keeps under it for its first CUT_EASE ticks (lib/mobpov.js dash)
    cut (pos, yaw, pitch = 0) {
      ctx.mark('cut')
      R.cutTick = R.tick; R.speed = 0
      R.pos = pos.clone(); R.yaw = yaw; R.pitch = pitch
    },
    shot (name) {
      const spec = (ctx.stunt.shots || {})[name]
      if (!spec) throw new Error(`mobpov: shot '${name}' is not in stunt.shots`)
      ctx.mark('shot', { name, eyeTrace: false })
    },
    async hold (n, onTick) { R.speed = 0; for (let k = 0; k < n; k++) { if (onTick) onTick(k); await R.step() } },
    async turn (yaw, pitch, n) {
      const y0 = R.yaw, p0 = R.pitch, dy = wrap(yaw - y0), dp = pitch - p0
      // smoothstep's peak speed is 1.5x the mean
      const peak = 1.5 * Math.hypot(dy, dp) * 180 / Math.PI / (n / 20)
      if (peak > R.maxTurn + 1e-6) throw new Error(`mobpov: a ${(Math.hypot(dy, dp) * 180 / Math.PI).toFixed(0)} deg turn in ${n} ticks peaks at ${peak.toFixed(0)} deg/s (cap ${R.maxTurn}): give it more ticks or cut`)
      for (let k = 1; k <= n; k++) { const e = ease(k / n); R.yaw = y0 + dy * e; R.pitch = p0 + dp * e; await R.step() }
    },
    hoverSpec: null,
    // a flying narrator's bob from now on (hoverSpec above: kind 'bee' | 'allay' | { rate, amp, nod, drift }); null: off
    hover (kind = 'bee', o = {}) {
      R.hoverSpec = kind === null ? null : hoverSpec(kind, { ...o, t0: R.tick })
      ctx.mark('hover', { kind: kind === null ? null : (typeof kind === 'string' ? kind : 'custom') })
    },
    // fly a curve through `points` (feet Vec3s): flightPlan above for the options (+ onTick(k, pos, u))
    async fly (points, o = {}) {
      const groundAt = (x, z, yHint) => {
        for (let y = Math.floor(yHint) + 6; y >= Math.floor(yHint) - 32; y--) {
          const b = bot.blockAt(new Vec3(Math.floor(x), y, Math.floor(z)))
          if (b && b.boundingBox === 'block') return y + 1
          if (b && (b.name === 'water' || b.name === 'lava')) return y + 1
        }
        return null
      }
      const plan = flightPlan(R.pos, points, { yaw0: R.yaw, pitch0: R.pitch, v0: R.speed || 0, ...o }, groundAt)
      const cap = o.maxTurn || R.maxTurn
      if (plan.peakTurn > cap + 1e-6) throw new Error(`mobpov: fly turns at up to ${plan.peakTurn.toFixed(0)} deg/s (cap ${cap}): widen the curve, slow it (speed), look further ahead (lead) or cut`)
      ctx.mark('fly', { n: plan.ticks.length, length: +plan.length.toFixed(1), peakTurn: +plan.peakTurn.toFixed(0) })
      for (let k = 0; k < plan.ticks.length; k++) {
        const q = plan.ticks[k]
        R.speed = R.pos ? Math.hypot(q.x - R.pos.x, q.z - R.pos.z) : 0
        R.pos = new Vec3(q.x, q.y, q.z); R.yaw = q.yaw; R.pitch = q.pitch
        if (o.onTick) o.onTick(k, R.pos, (k + 1) / plan.ticks.length)
        await R.step()
      }
      return plan
    },
    // fling one entity (server side): the hurt flash, its hurt sound, a kick
    hit (e, kick, { sound = true, damage = 1 } = {}) {
      if (!e || R.hitIds.has(e.id)) return
      R.hitIds.add(e.id)
      const who = e.uuid || null
      if (!who) { ctx.log(`mobpov: no uuid for ${e.name} #${e.id}`); return }
      if (damage) bot.chat(`/damage ${who} ${damage} minecraft:generic`)
      // the motion check (lib/hb/motion.js visibleJumps) reads a mob going from rest to over 0.6 blocks a tick, or
      // more than doubling its speed in a tick, as a teleport; the server syncs a mob's position every 3 ticks, so
      // the kick builds over five syncs (0.3 .. 1): each step well under double the last (0.4 / 0.7 / 1 still
      // spiked now and then: mobpov_baby_zombie take 5)
      const merge = (f) => `/data merge entity ${who} {NoAI:0b,Motion:[${kick.map(v => (v * f).toFixed(3) + 'd').join(',')}]}`
      bot.chat(merge(0.3))
      ;[0.45, 0.62, 0.8, 1].forEach((f, i) => R.kicks.push({ at: R.tick + 3 * (i + 1), cmd: merge(f) }))
      if (sound) {
        ctx.sound(HURT[e.name] || 'entity.player.attack.knockback', 1, +(0.9 + Math.random() * 0.25).toFixed(3))
        ctx.sound('entity.player.attack.knockback', 0.8, 1)
      }
      ctx.mark('mob_hit', { id: e.id, name: e.name, kick })
    },
    // the blocks in the box (world coords, inclusive) that aren't air: [{ x, y, z, name }]
    solidIn (x0, y0, z0, x1, y1, z1) {
      const out = []
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        const b = bot.blockAt(new Vec3(x, y, z))
        if (b && !AIR.has(b.name) && b.name !== 'lava' && b.name !== 'water') out.push({ x, y, z, name: b.name })
      }
      return out
    },
    // clear a box: one /fill, crumbs for every block, one break sound for the box (the commonest kind)
    smash (x0, y0, z0, x1, y1, z1, { volume = 1 } = {}) {
      const bs = R.solidIn(x0, y0, z0, x1, y1, z1)
      if (!bs.length) return 0
      bot.chat(`/fill ${x0} ${y0} ${z0} ${x1} ${y1} ${z1} air`)
      const kinds = {}
      for (const b of bs) {
        ctx.particles('block', { x: b.x, y: b.y, z: b.z }, { block: b.name })
        const s = breakSound(b.name); kinds[s] = (kinds[s] || 0) + 1
      }
      const s = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0][0]
      ctx.sound(s, volume, +(0.7 + Math.random() * 0.25).toFixed(3))
      if (bs.some(b => /_door$/.test(b.name))) ctx.sound('entity.zombie.break_wooden_door', 1, 1)
      ctx.mark('smash', { n: bs.length, x: x0, y: y0, z: z0 })
      return bs.length
    },
    async dash (to, opt = {}) {
      const { speed = 1.25, accel = 3, decel = 0, bore = { w: 3, h: 3, lead: 2.5 }, knock = true, steps = 3, onTick = null, kick = null, faceIt = true } = opt
      const from = R.pos.clone(), d = to.minus(from), L = d.norm()
      if (L < 1e-6) return
      const u = d.scaled(1 / L)
      const vertical = Math.abs(u.y) > 0.7
      if (faceIt && !vertical) {
        const want = yawTo(u)
        if (Math.abs(wrap(want - R.yaw)) > 0.02) throw new Error(`mobpov: dash heading ${(want * 180 / Math.PI).toFixed(0)} but the view looks ${(R.yaw * 180 / Math.PI).toFixed(0)}: turn (R.turn) or cut first`)
      }
      // the distance covered by tick k: ease in over `accel` ticks, out over `decel`
      let s = 0, k = 0, v = 0
      const smashed = { done: 0 }   // the bore starts at the feet (a dive's first block, the grass, was skipped: the shaft stayed capped and black)
      while (s < L - 1e-6) {
        k++
        const remain = L - s
        v = Math.min(speed, speed * Math.min(1, k / Math.max(1, accel)))
        if (R.tick - R.cutTick <= 5) v = Math.min(v, 0.75)   // just after a cut: under rec_check's 0.8 snap step
        if (decel > 0) v = Math.min(v, Math.max(speed * 0.18, speed * Math.sqrt(Math.min(1, remain / (speed * decel * 0.5)))))
        s = Math.min(L, s + v)
        R.pos = from.plus(u.scaled(s))
        // the bore: everything between `lead` and `lead + v + 1` blocks ahead
        if (bore && bore.w) {
          const a = s + bore.lead, b = Math.min(L + (bore.past ?? 0), s + bore.lead + v + 1)
          if (b > smashed.done && a < L + (bore.past ?? 0) + 1) {
            const p0 = from.plus(u.scaled(Math.max(a, smashed.done))), p1 = from.plus(u.scaled(b))
            const hw = Math.floor(bore.w / 2)
            if (vertical) {
              const cx = Math.floor(from.x), cz = Math.floor(from.z)
              const yLo = Math.floor(Math.min(p0.y, p1.y)), yHi = Math.floor(Math.max(p0.y, p1.y))
              R.smash(cx - hw, yLo, cz - hw, cx + hw - (bore.w % 2 ? 0 : 1), yHi, cz + hw - (bore.w % 2 ? 0 : 1))
            } else {
              const fy = Math.floor(from.y + 0.01)
              const along = Math.abs(u.x) >= Math.abs(u.z) ? 'x' : 'z'
              const lo = Math.floor(Math.min(p0[along], p1[along])), hi = Math.floor(Math.max(p0[along], p1[along]))
              if (along === 'x') { const cz = Math.floor(from.z); R.smash(lo, fy, cz - hw, hi, fy + bore.h - 1, cz + hw) } else { const cx = Math.floor(from.x); R.smash(cx - hw, fy, lo, cx + hw, fy + bore.h - 1, hi) }
            }
            smashed.done = b
          }
        }
        // mobs in the way: ahead within 3 blocks, within the bore's half width (+0.6) to the side
        if (knock) {
          for (const e of Object.values(bot.entities)) {
            if (!e || e === bot.entity || R.hitIds.has(e.id) || !HURT[e.name] || e.name === 'mannequin') continue
            const r = e.position.minus(R.pos), ahead = r.x * u.x + r.y * u.y + r.z * u.z
            const side = r.minus(u.scaled(ahead)), lat = Math.hypot(side.x, side.z)
            if (ahead < -0.3 || ahead > 3.0 || lat > ((bore && bore.w) ? bore.w / 2 + 0.6 : 1.4) || Math.abs(r.y) > 2.5) continue
            // up, and away to the side it stands on (straight ahead: a coin flip), a little forward
            const sx = -u.z, sz = u.x, sgn = (side.x * sx + side.z * sz) >= 0 ? 1 : -1
            // (kick sizes: |kick| <= 1.25 blocks/tick, so the first stage stays under the motion check's 0.6)
            const sideKick = 0.5 + Math.random() * 0.15, f = 0.4 + Math.random() * 0.15
            R.hit(e, kick ? kick(e) : [u.x * f + sx * sgn * sideKick, 0.72 + Math.random() * 0.12, u.z * f + sz * sgn * sideKick])
          }
        }
        if (steps && k % steps === 0 && !vertical) ctx.sound(opt.stepSound || 'entity.zombie.step', 0.45, +(1.35 + Math.random() * 0.2).toFixed(3))
        if (onTick) onTick(k, R.pos, s / L)
        await R.step()
      }
      R.speed = v
    }
  }
  return R
}

// the edit every episode shares: the caption, a whoosh on every cut between legs, the subs, and the payoff (a dip, an
// impact on the busy game track, a flash and a punch-in, the end 0.8 s after: the thrown mob lands by 0.7 s, r:r188b46 fast cuts)
function mobpovEdit ({ caption, red, subs = [], whooshes = 0, extra = {} }) {
  const sfx = []
  for (let i = 0; i < whooshes; i++) sfx.push(['whoosh', 'leg', { nth: i, gain: 0.35 }])
  sfx.push(['dip', 'payoff', 0.4], ['impact', 'payoff'])
  return {
    caption, red, startAt: 'go:-0.05', endAfter: 'payoff:0.8', dropAt: 'payoff',
    subs, flash: [['payoff', 0, 0.4]], punch: [['payoff', 0, 1.08]],
    ...extra, sfx: [...sfx, ...(extra.sfx || [])]
  }
}

module.exports = { rusher, mobpovEdit, breakSound, HURT, ease, wrap, yawTo, HOVER, hoverSpec, hoverAt, flightPlan }
