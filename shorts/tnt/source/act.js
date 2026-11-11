// The action helpers: every place, break, use and use-on-a-mob a stunt does goes through here, so it is aimed by
// construction (owner r:rffba12, 2026-11-11: "we weren't looking at the sheep being dyed"; places, breaks and the torch
// off-aim; pixel art's aim lagging at 18-20 blocks/s). Each helper
//   1. turns the view to the exact target like a hand on a mouse: eased, at most TURN deg/s (220), no snaps;
//   2. waits until the crosshair is ON the target (lib/sight.js: the ray from the eye enters the block / the mob's
//      box with nothing in front of it), and until vanilla's use / destroy delay since the last action has passed;
//   3. only then acts (the packet, the swing, the sound). A target the crosshair can't reach throws, naming it: a
//      take is never recorded with the action somewhere the camera isn't looking.
// So the action rate is capped by what the aim can follow, and a stunt can't place, break or dye off-aim.
//   const A = require('../lib/act')(ctx)          (in a story stunt, pass K: require('../lib/act')(ctx, { K }))
//   await A.place(pos, o)        put the held block at pos (against a block it can see: below first; o.against)
//   await A.dig(block, o)        break it (vanilla speed for the held tool, or o.ms; o.instant: one-tick break)
//   await A.use(pos, o)          right-click a block (a button, a lever, a door, flint and steel on TNT, a bed)
//   await A.useOn(entity, o)     right-click a mob (dye, shears, a name tag, a lead, a bucket on a cow)
//   await A.hit(entity, o)       left-click a mob
//   await A.aimAt(target, o)     just the turn: a Vec3 point, { block: pos }, or an entity
//   await A.turnTo(to, o)        a look round to angles { yaw, pitch } or a point, governed (o.hold: ticks resting on it)
//   A.snake(cells, row, col)     an order for many targets that turns the least: rows, every other one reversed
//   A.roomBehind(n) / await A.back(ticks)   walking backwards never ends within 1 block of a solid block behind
// Options for every action: o.max ticks to land the turn (40), o.delay ticks since the last action (vanilla: 4 for a
// use or place, 5 after a break), o.sound (null: none), o.strict (true: throw when the turn doesn't land).
const MOTION = require('./motion')
const SIGHT = require('./sight')

const TURN = 220            // deg/s: a quick but human flick (pixel_art's old governor; K's default is 180)
const ACCEL = 1100          // deg/s^2
const ON_TOL = 0.05         // rad left to turn when the crosshair is on the target: a hand clicks as it arrives
const SNEAK_DROP = 0.35
const GATE_DEG = 6          // the gates: on within 6 deg of the target (the aim check's per-action WARN line)

const aimAngles = (eye, p) => {
  const dx = p.x - eye.x, dy = p.y - eye.y, dz = p.z - eye.z
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }
}
const flo = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) })
const FACE_N = [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]]   // the protocol's faces 0-5
const DIRNUM = { '0,-1,0': 0, '0,1,0': 1, '0,0,-1': 2, '0,0,1': 3, '-1,0,0': 4, '1,0,0': 5 }

// many targets in an order that turns the least: grouped into rows by row(c), each row along col(c), every other
// row reversed (a snake). For a wall: row = y (top down), col = the horizontal axis.
function snake (cells, row = (c) => (c.p || c).y, col = (c) => (c.p || c).x, o = {}) {
  const rows = new Map()
  for (const c of cells) { const k = row(c); if (!rows.has(k)) rows.set(k, []); rows.get(k).push(c) }
  const keys = [...rows.keys()].sort((a, b) => o.rowsUp ? a - b : b - a)
  const out = []
  keys.forEach((k, i) => { const r = rows.get(k).sort((a, b) => col(a) - col(b)); out.push(...(i % 2 ? r.reverse() : r)) })
  return out
}

// the free distance behind a player at feet `pos` facing `yaw` (mineflayer: yaw 0 = -z), up to n blocks: the first
// solid block at the feet or head level within the player's width, minus nothing; solid(x, y, z) -> boolean
function roomBehind (pos, yaw, solid, n = 4) {
  const bx = Math.sin(yaw), bz = Math.cos(yaw)   // backwards: opposite of the look (-sin, -cos)
  const sx = bz * 0.3, sz = -bx * 0.3
  for (let d = 0.1; d <= n + 1e-9; d += 0.1) {
    for (const s of [-1, 0, 1]) for (const dy of [0.1, 1.0, 1.7]) {
      const x = pos.x + bx * (d + 0.3) + sx * s, z = pos.z + bz * (d + 0.3) + sz * s
      if (solid(Math.floor(x), Math.floor(pos.y + dy), Math.floor(z))) return +d.toFixed(2)
    }
  }
  return n
}

function act (ctx, opts = {}) {
  const { bot } = ctx
  const K = opts.K || null
  const lim = { speed: (opts.turnSpeed ?? TURN) * MOTION.DEG / 20, accel: (opts.turnAccel ?? ACCEL) * MOTION.DEG / 400 }
  const now = () => ctx.tick ?? 0
  const shapes = (x, y, z) => { const q = bot.blockAt(new ctx.Vec3(x, y, z)); return q && q.shapes && q.shapes.length ? q.shapes : null }
  const solid = (x, y, z) => { const q = bot.blockAt(new ctx.Vec3(x, y, z)); return !!(q && q.boundingBox === 'block') }
  const eyeH = () => (K ? K.eyeNow() : 1.62 - (bot.controlState && bot.controlState.sneak ? SNEAK_DROP : 0))
  const eye = () => bot.entity.position.offset(0, eyeH(), 0)
  // the turner: K's governor in a story (K.base is the target, K.look applies it once a tick), else our own
  const gov = { cur: null, vel: { yaw: 0, pitch: 0 } }
  const cur = () => {
    if (K) return K._gov.cur
    const e = bot.entity
    // a teleport (or anyone else's look) moved the view: start from there, at rest
    // (compared with what the entity held right after our own look: mineflayer stores the yaw its own way, and comparing
    // with gov.cur reset the velocity every tick: hide_seek's turns crawled at one tick's acceleration, 24 deg/s)
    const seen = gov.seen || gov.cur
    if (!gov.cur || Math.abs(MOTION.wrap(e.yaw - seen.yaw)) > 1e-4 || Math.abs(e.pitch - seen.pitch) > 1e-4) { gov.cur = { yaw: e.yaw, pitch: e.pitch }; gov.vel = { yaw: 0, pitch: 0 }; gov.seen = null }
    return gov.cur
  }
  // one tick of the governed turn toward target ({ yaw, pitch }), without waiting the tick
  const view = async (target) => {
    if (K) { K.base = { yaw: target.yaw, pitch: target.pitch }; K.look(0) } else {
      const r = MOTION.stepTurn(cur(), gov.vel, target, lim)
      gov.cur = r.cur; gov.vel = r.vel
      await bot.look(r.cur.yaw, r.cur.pitch, true)   // motion-ok: the governed step itself
      gov.seen = { yaw: bot.entity.yaw, pitch: bot.entity.pitch }
    }
    A.turns.push(cur() && { ...cur() })
    if (A.turns.length > 400) A.turns.shift()
  }
  const step = async (target) => {
    await view(target)
    await bot.waitForTicks(1)
    if (K) K._clock++
  }
  const noSnap = async (fn) => { const la = bot.lookAt; bot.lookAt = async () => {}; try { return await fn() } finally { bot.lookAt = la } }
  const fmt = (p) => `${(+p.x).toFixed(1)} ${(+p.y).toFixed(1)} ${(+p.z).toFixed(1)}`

  const A = {
    lastUse: -99, lastBreak: -99, turns: [], log: [],
    TURN, lim,
    // turn onto a target and wait until the crosshair is on it. target: a Vec3 point (o.on: the block the ray must
    // hit there), { block: pos } (its centre), or an entity (its box; followed as it moves). -> true, or throws (o.strict
    // false: false) when it doesn't land in o.max ticks
    // is the crosshair on the target right now? target: an entity, { block: pos }, { blocks: [pos, ...] } (any of them:
    // a door's two halves), or a Vec3 with o.on. With o.deg, also on when the view is within that many degrees of the
    // target's point (the gates below: a block the view is already on to the checks' tolerance counts as on).
    _resolve (target, o = {}) {
      const isEnt = !!(target && target.position && target.id !== undefined)
      const blks = isEnt ? null : target.blocks ? target.blocks.map(flo) : target.block ? [flo(target.block)] : o.on ? [flo(o.on)] : null
      const point = () => isEnt
        ? target.position.offset(0, (target.height ?? 1.8) * 0.6, 0)
        : o.point ? o.point : blks && (target.block || target.blocks) ? new ctx.Vec3(blks[0].x + 0.5, blks[0].y + 0.5, blks[0].z + 0.5) : target
      return { isEnt, blks, point }
    },
    onTarget (target, o = {}, c = cur()) {
      const { isEnt, blks, point } = A._resolve(target, o), e = eye()
      let on
      if (isEnt) on = SIGHT.crosshairBox([e.x, e.y, e.z], c.yaw, c.pitch, SIGHT.entityBox(target), shapes, { reach: o.reach ?? 6, shrink: 0.05 }).on
      else if (!blks) on = true
      else on = SIGHT.crosshair([e.x, e.y, e.z], c.yaw, c.pitch, blks.map(b => [b.x, b.y, b.z]), shapes, { reach: o.reach ?? 6, shrink: o.shrink ?? 0.05, skip: o.skip }).on
      if (!on && o.deg) {
        const w = aimAngles(e, point())
        on = Math.hypot(MOTION.wrap(w.yaw - c.yaw) * Math.cos(c.pitch), w.pitch - c.pitch) <= o.deg * MOTION.DEG
      }
      return on
    },
    // turn onto a target and wait until the crosshair is on it. target: a Vec3 point (o.on: the block the ray must
    // hit there), { block: pos } (its centre), { blocks }, or an entity (its box; followed as it moves). -> true, or
    // throws (o.strict false: false) when it doesn't land in o.max ticks. o.turn false: don't turn, only wait (a
    // factory with its own look governor turns the view)
    async aimAt (target, o = {}) {
      const { isEnt, blks, point } = A._resolve(target, o)
      const until = o.until ?? -99, max = o.max ?? 40
      for (let k = 0; k <= max; k++) {
        if (isEnt && target.isValid === false) throw new Error(`act: the ${target.name} it was aiming at is gone`)
        const want = aimAngles(eye(), point()), c = cur()
        const err = Math.hypot(MOTION.wrap(want.yaw - c.yaw), want.pitch - c.pitch)
        if (A.onTarget(target, o, c) && err < (o.tol ?? ON_TOL) && now() >= until) return true
        if (k === max) break
        if (o.turn === false) { await bot.waitForTicks(1); if (K) K._clock++ } else await step(want)
      }
      const what = isEnt ? `the ${target.name} at ${fmt(target.position)}` : blks ? `the block at ${fmt(blks[0])}` : fmt(point())
      const msg = `act: the crosshair didn't land on ${what} in ${max} ticks`
      ctx.log(msg)
      if (o.strict === false) return false
      throw new Error(msg + ' (a target it can see, within reach: move closer, or give it more ticks with { max })')
    },
    // ---- gates for the factories' own packets (lib/door_run.js, time_lapse.js ...): the action is sent THIS tick,
    // exactly as before, when the crosshair is already on the target (within GATE_DEG of it); otherwise the view turns
    // onto it first (o.turn false: waits up to o.max ticks for the factory's own look to get there) and then it goes.
    // A turn that doesn't land in o.max (20) ticks acts anyway with an 'off_aim' mark and a log line (o.strict: throws),
    // so the aim check in ./hb check blocks the take. Returns a Promise; the fast path sends before returning.
    gate (target, fn, o = {}) {
      // a block counts as on when the crosshair's ray reaches it first, edge included (shrink 0: what the sight check,
      // scripts/rec_sight.js, tests). With the aimers' 0.05 margin, lapse_statue's pillar-top clicks on grazing top faces
      // - on the face, nowhere near the block's centre - missed the fast path, waited, and went out 1-3 ticks later off
      // the crosshair (the bot falling from its jump, the view on the next block) and out of order (a block clicked onto a
      // support whose own click was still waiting: refused, wrong blocks)
      const g = { deg: GATE_DEG, tol: Infinity, max: 20, strict: false, shrink: 0, ...o }
      if (o.also) { const f0 = fn; fn = () => { f0(); o.also() } }   // what goes with the action (its sound, a mark)
      if (A.onTarget(target, g)) { fn(); return Promise.resolve(true) }
      if (g.turn === false && !g.max) return Promise.resolve(A._offAim(target, g, fn))
      return A.aimAt(target, g).then((ok) => ok ? (fn(), true) : A._offAim(target, g, fn))
    },
    _offAim (target, o, fn) {
      const { point } = A._resolve(target, o), p = point()
      ctx.mark('off_aim', { x: +(+p.x).toFixed(2), y: +(+p.y).toFixed(2), z: +(+p.z).toFixed(2) })
      ctx.log(`act: acting off the crosshair at ${fmt(p)}`)
      fn()
      return false
    },
    // a right-click on a block face as a raw packet (ref: the block clicked, dir: the protocol face, cursor on it)
    // (the gate's point is the middle of the clicked face, not the block's centre: from above a block, a crosshair on
    // its top face is 10-20 deg off its centre)
    click (ref, dir, cursor = [0.5, 0.5, 0.5], o = {}) {
      const r = flo(ref), n = FACE_N[dir] || [0, 0, 0]
      const point = o.point || new ctx.Vec3(r.x + 0.5 + n[0] * 0.5, r.y + 0.5 + n[1] * 0.5, r.z + 0.5 + n[2] * 0.5)
      return A.gate(o.target || { block: r }, () => {
        bot._client.write('block_place', { hand: 0, location: { x: r.x, y: r.y, z: r.z }, direction: dir, cursorX: cursor[0], cursorY: cursor[1], cursorZ: cursor[2], insideBlock: false, worldBorderHit: false, sequence: 0 })   // motion-ok: gated
        if (o.swing) bot.swingArm()
        A.lastUse = now()
      }, { ...o, point })
    },
    // a break's start / finish packets (status 0 / 2), gated on the block
    breakStart (pos, face = 1, o = {}) { const p = flo(pos); return A.gate(o.target || { block: p }, () => bot._client.write('block_dig', { status: 0, location: { x: p.x, y: p.y, z: p.z }, face, sequence: 0 }), o) },   // motion-ok: gated
    breakFinish (pos, face = 1, o = {}) { const p = flo(pos); return A.gate(o.target || { block: p }, () => { bot._client.write('block_dig', { status: 2, location: { x: p.x, y: p.y, z: p.z }, face, sequence: 0 }); A.lastBreak = now() }, o) },   // motion-ok: gated
    // mineflayer's dig (vanilla speed, no look of its own), gated on the block; resolves when it is broken
    digNow (block, o = {}) {
      let job = null
      return A.gate(o.target || { block: block.position }, () => { job = bot.dig(block, 'ignore') }, o).then(() => job).finally(() => { A.lastBreak = now() })   // motion-ok: gated
    },
    // a left-click on a mob, gated on its box (o.swing false: no swing)
    strike (entity, o = {}) { return A.gate(entity, () => { bot.attack(entity, o.swing !== false); A.lastUse = now() }, o) },   // motion-ok: gated
    // a point on the block the eye can see (the face toward the eye first), or throws naming what is in the way
    sight (who, targets) {
      const e = eye(), s = SIGHT.bestOf([e.x, e.y, e.z], targets, shapes, { reach: Infinity })
      if (s.point) return s
      const b = s.blocker
      throw new Error(`act.${who}: no face of ${targets.map(t => fmt({ x: t.pos[0], y: t.pos[1], z: t.pos[2] })).join(' / ')} is visible from the eye at ${fmt(e)}` +
        (b ? ` (the block at ${b.x} ${b.y} ${b.z} is in the way)` : '') + ' (STANDARDS 3b.4)')
    },
    // put the held block at pos like a player: the clicked face of a block it goes against that the eye can see
    // (o.against: that block; else below, beside or above), the turn onto that exact point, the use delay, the click
    async place (pos, o = {}) {
      if (K && !o.held) return K.place(pos, o.block || (bot.heldItem && bot.heldItem.name), o)
      const b = flo(pos), bp = [b.x, b.y, b.z]
      let cands
      if (o.against) {
        const a = flo(o.against), n = [b.x - a.x, b.y - a.y, b.z - a.z]
        cands = [{ pos: [a.x, a.y, a.z], faces: Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]) === 1 ? [n] : null, skip: [bp] }]
      } else cands = SIGHT.supportsOf(bp, shapes)
      if (!cands.length) throw new Error(`act.place: nothing to place ${fmt(b)} against`)
      const s = A.sight('place', cands), a = s.target.pos, n = s.normal
      const P = new ctx.Vec3(...s.point)
      await A.aimAt(P, { ...o, on: { x: a[0], y: a[1], z: a[2] }, skip: [bp], until: A.lastUse + (o.delay ?? MOTION.USE_DELAY) })
      ctx.mark('place_on', { x: b.x, y: b.y, z: b.z, ax: a[0], ay: a[1], az: a[2] })
      const cur = [s.point[0] - a[0], s.point[1] - a[1], s.point[2] - a[2]].map(v => Math.min(1, Math.max(0, v)))
      bot._client.write('block_place', { hand: 0, location: { x: a[0], y: a[1], z: a[2] }, direction: DIRNUM[n.join(',')], cursorX: cur[0], cursorY: cur[1], cursorZ: cur[2], insideBlock: false, worldBorderHit: false, sequence: 0 })
      if (o.swing !== false) bot.swingArm('right')
      const nm = o.block || (bot.heldItem && bot.heldItem.name) || 'stone'
      if (o.sound !== null) ctx.sound(o.sound || `block.${ctx.soundGroup(nm)}.place`, o.volume ?? 1, 0.8)
      A.lastUse = now()
      return true
    },
    // break a block like a player: the aim on a face it can see, vanilla's destroy delay since the last break, then
    // the dig at vanilla speed for the held tool (o.ms overrides; o.instant: start + finish in one tick, Efficiency V
    // shears on wool). Awaited: resolves when the block is broken
    async dig (block, o = {}) {
      if (!block || !block.position) throw new Error('act.dig: no block')
      if (K && !o.instant) return K.dig(block, o.ms, o)
      const p = block.position, s = A.sight('dig', [{ pos: [p.x, p.y, p.z] }])
      await A.aimAt(new ctx.Vec3(...s.point), { ...o, on: p, until: A.lastBreak + (o.delay ?? MOTION.DESTROY_DELAY) })
      const face = DIRNUM[s.normal.join(',')]
      try {
        if (o.instant) {
          const loc = { x: p.x, y: p.y, z: p.z }
          bot._client.write('block_dig', { status: 0, location: loc, face, sequence: 0 })
          bot._client.write('block_dig', { status: 2, location: loc, face, sequence: 0 })
          if (o.swing !== false) bot.swingArm()
          if (o.sound !== null) ctx.sound(o.sound || `block.${ctx.soundGroup(block.name)}.break`, 0.8, 1)
        } else if (o.ms !== undefined) {
          const dt = bot.digTime; bot.digTime = () => o.ms
          try { await bot.dig(block, 'ignore') } finally { bot.digTime = dt }   // motion-ok: aimed above
        } else await bot.dig(block, 'ignore')   // motion-ok: aimed above
      } finally { A.lastBreak = now() }
      return true
    },
    // right-click a block (a button, a lever, a door, a bed, flint and steel or fire charge on TNT): aim, delay, use
    async use (pos, o = {}) {
      const b = flo(pos), s = A.sight('use', [{ pos: [b.x, b.y, b.z] }])
      await A.aimAt(new ctx.Vec3(...s.point), { ...o, on: b, until: A.lastUse + (o.delay ?? MOTION.USE_DELAY) })
      const blk = bot.blockAt(new ctx.Vec3(b.x, b.y, b.z))
      const cursor = new ctx.Vec3(s.point[0] - b.x, s.point[1] - b.y, s.point[2] - b.z)
      await noSnap(() => bot.activateBlock(blk, new ctx.Vec3(...s.normal), cursor))   // motion-ok: aimed above; activateBlock swings
      if (o.sound) ctx.sound(o.sound, o.volume ?? 1, 1)
      A.lastUse = now()
      return true
    },
    // right-click a mob (dye, shears, a name tag, a lead): the crosshair on its box (followed as it walks), then use
    async useOn (entity, o = {}) {
      await A.aimAt(entity, { ...o, until: A.lastUse + (o.delay ?? MOTION.USE_DELAY) })
      await noSnap(() => bot.activateEntity(entity))   // motion-ok: aimed above
      if (o.swing !== false) bot.swingArm('right')
      if (o.sound) ctx.sound(o.sound, o.volume ?? 1, 1)
      A.lastUse = now()
      return true
    },
    // left-click a mob
    async hit (entity, o = {}) {
      await A.aimAt(entity, { ...o, until: A.lastUse + (o.delay ?? 0) })
      await noSnap(() => bot.attack(entity, o.swing !== false))   // motion-ok: aimed above
      A.lastUse = now()
      return true
    },
    // a factory's own per-tick loop (a walk that looks where it goes): one governed tick of the turn toward a point
    // (Vec3) or angles ({ yaw, pitch }); the caller waits the tick
    view (to) { return view(to && to.x !== undefined ? aimAngles(eye(), to) : to) },
    // a look round with no action on it: the governed, eased turn to angles ({ yaw, pitch }, mineflayer radians) or a
    // point (Vec3), until the view is within o.tol rad (0.02) of it or o.max ticks (60) pass; then o.hold ticks resting
    // on it. -> true when it landed (r:r38374d: never a raw bot.look / ctx.easeLook for a big turn)
    async turnTo (to, o = {}) {
      const want = () => to && to.x !== undefined ? aimAngles(eye(), to) : to
      const tol = o.tol ?? 0.02, max = o.max ?? 60
      let ok = false
      for (let k = 0; k < max; k++) {
        const w = want(), c = cur()
        if (Math.hypot(MOTION.wrap(w.yaw - c.yaw), w.pitch - c.pitch) < tol) { ok = true; break }
        await step(w)
      }
      for (let k = 0; k < (o.hold ?? 0); k++) await step(want())
      return ok
    },
    snake,
    roomBehind: (n = 4) => roomBehind(bot.entity.position, bot.entity.yaw, solid, n),
    // walk backwards for up to `ticks`, the view kept (o.look: a point to keep the crosshair on, governed). It never
    // ends within o.clear (1) block of a solid block behind: the back key is let go before that. -> ticks walked
    async back (ticks, o = {}) {
      const clear = o.clear ?? 1
      let k = 0
      for (; k < ticks; k++) {
        // a walk backwards coasts ~0.26 blocks after the key is let go (0.216 b/tick, friction 0.546): stop in time
        if (A.roomBehind(clear + 1) <= clear + 0.5) break
        bot.setControlState('back', true)   // motion-ok: guarded by roomBehind
        if (o.look) await step(aimAngles(eye(), o.look)); else { await bot.waitForTicks(1); if (K) K._clock++ }
      }
      bot.setControlState('back', false)   // motion-ok: guarded by roomBehind
      if (k < ticks) ctx.log(`act.back: stopped after ${k} of ${ticks} ticks: a block behind`)
      return k
    }
  }
  return A
}

module.exports = act
module.exports.snake = snake
module.exports.roomBehind = roomBehind
module.exports.aimAngles = aimAngles
module.exports.TURN = TURN
