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

const aimAngles = (eye, p) => {
  const dx = p.x - eye.x, dy = p.y - eye.y, dz = p.z - eye.z
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }
}
const flo = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) })
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
    if (!gov.cur || Math.abs(MOTION.wrap(e.yaw - gov.cur.yaw)) > 1e-4 || Math.abs(e.pitch - gov.cur.pitch) > 1e-4) { gov.cur = { yaw: e.yaw, pitch: e.pitch }; gov.vel = { yaw: 0, pitch: 0 } }
    return gov.cur
  }
  const step = async (target) => {
    if (K) { K.base = { yaw: target.yaw, pitch: target.pitch }; K.look(0) } else {
      const r = MOTION.stepTurn(cur(), gov.vel, target, lim)
      gov.cur = r.cur; gov.vel = r.vel
      await bot.look(r.cur.yaw, r.cur.pitch, true)   // motion-ok: the governed step itself
    }
    A.turns.push(cur() && { ...cur() })
    if (A.turns.length > 400) A.turns.shift()
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
    async aimAt (target, o = {}) {
      const isEnt = target && target.position && target.id !== undefined
      const blk = !isEnt && target.block ? flo(target.block) : o.on ? flo(o.on) : null
      const point = () => isEnt
        ? target.position.offset(0, (target.height ?? 1.8) * 0.6, 0)
        : target.block ? new ctx.Vec3(blk.x + 0.5, blk.y + 0.5, blk.z + 0.5) : target
      const onIt = (c) => {
        const e = eye()
        if (isEnt) return SIGHT.crosshairBox([e.x, e.y, e.z], c.yaw, c.pitch, SIGHT.entityBox(target), shapes, { reach: o.reach ?? 6, shrink: 0.05 }).on
        if (!blk) return true
        return SIGHT.crosshair([e.x, e.y, e.z], c.yaw, c.pitch, [[blk.x, blk.y, blk.z]], shapes, { reach: o.reach ?? 6, shrink: 0.05, skip: o.skip }).on
      }
      const until = o.until ?? -99, max = o.max ?? 40
      for (let k = 0; k <= max; k++) {
        if (isEnt && target.isValid === false) throw new Error(`act: the ${target.name} it was aiming at is gone`)
        const want = aimAngles(eye(), point()), c = cur()
        const err = Math.hypot(MOTION.wrap(want.yaw - c.yaw), want.pitch - c.pitch)
        if (onIt(c) && err < (o.tol ?? ON_TOL) && now() >= until) return true
        if (k === max) break
        await step(want)
      }
      const what = isEnt ? `the ${target.name} at ${fmt(target.position)}` : blk ? `the block at ${fmt(blk)}` : fmt(point())
      const msg = `act: the crosshair didn't land on ${what} in ${max} ticks`
      ctx.log(msg)
      if (o.strict === false) return false
      throw new Error(msg + ' (a target it can see, within reach: move closer, or give it more ticks with { max })')
    },
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
