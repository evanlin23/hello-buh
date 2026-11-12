// Boats, leads and riders for story scenes (docs/engine_features.md "Boats, leads and passengers"). Attached to the
// story kit as K.board / K.unboard / K.leash / K.row / K.entity; everything goes through the real server, so the
// recording is what a vanilla client would see:
//   K.entity('oak_boat', [dx, dy, dz])        the nearest entity of that type to a set-relative point (the recorder's view)
//   await K.board(rider, boat)                 /ride: rider = a cast name (a player actor) or a mob tag, boat = a tag. An
//                                              actor the kit was moving (K.actor) stops being moved, and its own client
//                                              stops simulating (mineflayer has no boat physics: K.row drives it)
//   await K.unboard(rider)                     /ride dismount (the actor's client simulates again)
//   await K.leash(holder, target)              a lead from the holder (a cast name, or 'self') to target: a tag (the
//                                              server's leash NBT, any time: set-up too) or an entity / id (the actor
//                                              right-clicks it holding a lead, as a player does). Vanilla 1.21 pulls the
//                                              leashed boat, mob or raft after its holder (Leashable.tickLeash), on land
//                                              and water, and draws the rope (the renderer: lib/riding.js leashMesh)
//   await K.row(name, path, o)                 the actor `name` (the first rider: the one who steers) rows his boat along
//                                              path [[x, z], ...] (set-relative), and the call returns when it has
//                                              stopped. The row is planned (planRow): a smooth curve through the
//                                              points, the bow along it, vanilla's speed (a held forward key in water:
//                                              v = 0.9 v + 0.04 a tick, 0.4 blocks/tick top speed; oars shipped 9 v
//                                              before the end, gliding onto it), and sent as the rower's client sends it
//                                              (vehicle_move + steer_boat): the server moves the boat and sets its
//                                              paddle states (the oars animate in the recording), and a lead tied to
//                                              the rower pulls its boat behind. Each stroke plays entity.boat.paddle_water
//                                              (Boat.tick: once a stroke per oar, pitch 0.8-1.2). A corner tighter than
//                                              a boat turns (9 deg a tick) is logged: round it off with more points.
//     o.speed (0.4)   the top speed in blocks/tick; under 0.4 the thrust is scaled (a slow, steady row: not something
//                     a keyboard does, but the oars keep their vanilla stroke)
//     o.stop (true)   ship the oars and glide to rest on the last point (x 0.9 a tick: about 9 x speed blocks)
//     o.look (0)      the rider's head yaw relative to the bow, degrees (a rower looking back at a leashed boat: 150)
//     o.sound (true)  the paddle strokes' sounds
//   const h = K.rowing(name, path, o) ... await h   the same, running while the scene goes on (lines, cuts)
const THRUST = 0.04, FRICTION = 0.9

function boatKit (ctx, K, { X, Z, F }) {
  const bot = ctx.bot
  const sel = (who) => (ctx.actors && ctx.actors[who]) ? who : who === 'self' ? '@s' : `@e[tag=${who},limit=1]`
  const playerEnt = (name) => name === 'self' ? bot.entity : (bot.players[name] && bot.players[name].entity) || null

  function entity (name, at) {
    const p = K.P(...at)
    let best = null, bd = Infinity
    for (const e of Object.values(bot.entities)) {
      if (e === bot.entity || e.name !== name || !e.position) continue
      const d = e.position.distanceTo(p)
      if (d < bd) { bd = d; best = e }
    }
    return best
  }

  async function board (rider, boat) {
    const a = ctx.actors && ctx.actors[rider]
    for (const [t] of K.actors) if (t === rider || (a && t === String(rider).toLowerCase())) K.actors.delete(t)
    if (a) { a.physicsEnabled = false; a.clearControlStates() }
    await ctx.cmd(`/ride ${sel(rider)} mount ${sel(boat)}`)
    await bot.waitForTicks(2)
  }

  async function unboard (rider) {
    await ctx.cmd(`/ride ${sel(rider)} dismount`)
    const a = ctx.actors && ctx.actors[rider]
    if (a) { await bot.waitForTicks(2); a.physicsEnabled = true }
  }

  const uuidInts = (u) => {
    const h = String(u).replace(/-/g, '')
    return [0, 8, 16, 24].map(i => { const v = parseInt(h.slice(i, i + 8), 16); return v > 0x7fffffff ? v - 0x100000000 : v })
  }

  async function leash (holder, target) {
    if (Array.isArray(holder)) {   // a fence post (set-relative [x, y, z]): the server ties a knot there (LeashFenceKnotEntity)
      await ctx.cmd(`/data merge entity ${sel(target)} {leash:[I;${X + holder[0]},${F + holder[1]},${Z + holder[2]}]}`)
      return
    }
    if (typeof target === 'string') {
      const uuid = holder === 'self' ? bot.player.uuid : bot.players[holder] && bot.players[holder].uuid
      if (!uuid) throw new Error(`K.leash: no player '${holder}' (a cast name from M.spawnActors, or 'self')`)
      await ctx.cmd(`/data merge entity ${sel(target)} {leash:{UUID:[I;${uuidInts(uuid).join(',')}]}}`)
      return
    }
    const a = ctx.actors && ctx.actors[holder]
    if (!a) throw new Error(`K.leash: '${holder}' is not an actor: tie a tag instead (K.leash('${holder}', 'tag'))`)
    const id = typeof target === 'number' ? target : target.id
    await ctx.cmd(`/item replace entity ${holder} weapon.mainhand with lead`)
    await bot.waitForTicks(2)
    const te = a.entities[id]
    if (!te) throw new Error(`K.leash: ${holder} can't see entity ${id}`)
    a.activateEntity(te)
    const want = (playerEnt(holder) || {}).id
    for (let k = 0; k < 20 && !(bot._leash && bot._leash.get(id) === want); k++) await bot.waitForTicks(1)
    if (!bot._leash || bot._leash.get(id) !== want) ctx.log(`K.leash: no lead from ${holder} to ${id} after 1 s (out of reach? the actor must be within 3 blocks to tie it)`)
  }

  function rowing (name, path, o = {}) {
    const a = ctx.actors && ctx.actors[name]
    if (!a) throw new Error(`K.row: '${name}' is not an actor (M.spawnActors)`)
    const me = playerEnt(name)
    let vid = null
    for (const [v, ps] of bot._ride || []) if (me && ps[0] === me.id) vid = v
    if (vid === null) throw new Error(`K.row: ${name} isn't steering a boat (K.board('${name}', '<boat tag>') first: the first rider steers)`)
    const be = bot.entities[vid]
    const y = be.position.y
    const plan = planRow([be.position.x, be.position.z], 180 - be.yaw * 180 / Math.PI, path.map(([x, z]) => [X + x, Z + z]), o)
    if (plan.maxTurn > 9.5) ctx.log(`K.row: the path turns ${plan.maxTurn.toFixed(1)} deg a tick at its tightest (a boat turns at most ~9): round that corner off`)
    const n = [0, 0]
    return (async () => {
      for (const s of plan.ticks) {
        a._client.write('steer_boat', { leftPaddle: s.paddle, rightPaddle: s.paddle })
        a._client.write('vehicle_move', { x: s.x, y, z: s.z, yaw: s.yaw, pitch: 0, onGround: false })
        a.look((180 - s.yaw - (o.look || 0)) * Math.PI / 180, 0, true)   // the rider turns with the boat (positionRider)
        // Boat.tick: a stroke's sound as an oar passes PI/4 (paddlePositions += PI/8 a tick from 0), both oars together
        n[0] = s.paddle ? n[0] + 1 : 0
        if (o.sound !== false && n[0] % 16 === 2) for (let i = 0; i < 2; i++) ctx.sound('entity.boat.paddle_water', 1, +(0.8 + Math.random() * 0.4).toFixed(2))
        await bot.waitForTicks(1)
      }
      a._client.write('steer_boat', { leftPaddle: false, rightPaddle: false })
      const e = plan.ticks[plan.ticks.length - 1]
      return { x: e.x - X, z: e.z - Z, yaw: e.yaw, ticks: plan.ticks.length }
    })()
  }

  return { entity, board, unboard, leash, row: (name, path, o) => rowing(name, path, o), rowing }
}

// The row, planned (pure: test/boats.test.js): a smooth curve through the points (centripetal Catmull-Rom, from the
// boat's position), the bow along its tangent, and vanilla's speed along it: in water a held forward key gives
// v = 0.9 v + 0.04 a tick (floatBoat's invFriction 0.9, controlBoat's 0.04 thrust: 0.4 blocks/tick top speed), and with
// the oars shipped v = 0.9 v, a glide of 9 v: so the oars stop 9 v before the end and it drifts onto the last point.
// o.speed under 0.4 scales the thrust (a slow row). -> { ticks: [{ x, z, yaw (MC degrees), paddle }], maxTurn (deg/tick) }
function planRow (start, yaw0, pts, o = {}) {
  const P = [start, ...pts]
  // centripetal Catmull-Rom through P, sampled every ~0.05 blocks, with the cumulative arc length
  const ext = [[2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]], ...P, [2 * P[P.length - 1][0] - P[P.length - 2][0], 2 * P[P.length - 1][1] - P[P.length - 2][1]]]
  const poly = [P[0]]
  for (let i = 1; i < ext.length - 2; i++) {
    const [p0, p1, p2, p3] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]]
    const tj = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5) || 1e-4
    const t0 = 0, t1 = t0 + tj(p0, p1), t2 = t1 + tj(p1, p2), t3 = t2 + tj(p2, p3)
    const seg = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.05))
    for (let k = 1; k <= seg; k++) {
      const t = t1 + (t2 - t1) * k / seg
      const L = (pa, pb, ta, tb) => [0, 1].map(c => ((tb - t) * pa[c] + (t - ta) * pb[c]) / (tb - ta))
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3)
      const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3)
      poly.push(L(B1, B2, t1, t2))
    }
  }
  const cum = [0]
  for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]))
  const total = cum[cum.length - 1]
  const at = (s) => {
    s = Math.max(0, Math.min(total, s))
    let lo = 0, hi = cum.length - 1
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m }
    const f = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1)
    return [poly[lo][0] + (poly[hi][0] - poly[lo][0]) * f, poly[lo][1] + (poly[hi][1] - poly[lo][1]) * f]
  }
  const heading = (s) => { const a = at(s - 0.4), b = at(s + 0.4); return Math.atan2(-(b[0] - a[0]), b[1] - a[1]) * 180 / Math.PI }
  const k = Math.min(1, (o.speed ?? 0.4) / 0.4)
  const ticks = []
  let s = 0, v = 0, yaw = yaw0, maxTurn = 0, rowingOn = true
  for (let n = 0; n < 20 * 600; n++) {
    if (rowingOn && (o.stop === false ? s >= total : total - s <= v * FRICTION / (1 - FRICTION))) rowingOn = false   // the glide from v: 9 v
    v = v * FRICTION + (rowingOn ? THRUST * k : 0)
    s = Math.min(total, s + v)
    let want = heading(s), d = want - yaw
    while (d > 180) d -= 360; while (d < -180) d += 360
    // the bow eases onto the curve's heading (a boat can't snap: the first ticks off a still start)
    const turn = Math.max(-9, Math.min(9, d))
    if (n > 3) maxTurn = Math.max(maxTurn, Math.abs(d))
    yaw += turn
    const p = at(s)
    ticks.push({ x: p[0], z: p[1], yaw, paddle: rowingOn })
    if (!rowingOn && (v < 0.005 || s >= total)) break
    if (o.stop === false && s >= total) break
  }
  return { ticks, maxTurn, length: total }
}

module.exports = { boatKit, planRow, THRUST, FRICTION }
