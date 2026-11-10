// Motion by construction and its safety net (owner, 2026-11-10: "The movement sometimes still feels jerky and botlike")
const test = require('node:test')
const assert = require('node:assert')
const { Vec3 } = require('vec3')
const M = require('../../motion')
const C = require('../motion')
const { lintSource } = require('../motion_lint')
const { storyKit } = require('../../story')

const DEG = 180 / Math.PI

// ---------------------------------------------------------------- the governor and the actor step (lib/motion.js)
test('stepTurn: a 60-degree turn eases in and out, never passes 180 deg/s, and lands without overshoot', () => {
  let cur = { yaw: 0, pitch: 0 }, vel = { yaw: 0, pitch: 0 }
  const target = { yaw: 60 / DEG, pitch: -10 / DEG }
  const speeds = []
  for (let k = 0; k < 60; k++) {
    const r = M.stepTurn(cur, vel, target)
    speeds.push(Math.hypot(r.vel.yaw, r.vel.pitch) * DEG * 20)
    const before = Math.hypot(M.wrap(target.yaw - cur.yaw), target.pitch - cur.pitch)
    cur = r.cur; vel = r.vel
    assert.ok(Math.hypot(M.wrap(target.yaw - cur.yaw), target.pitch - cur.pitch) <= before + 1e-12, 'never moves away from the target')
  }
  assert.ok(Math.abs(cur.yaw - target.yaw) < 1e-9 && Math.abs(cur.pitch - target.pitch) < 1e-9)
  assert.ok(Math.max(...speeds) <= 180 + 1e-6)
  assert.ok(speeds[0] < 60, `the first tick eases in (${speeds[0].toFixed(0)} deg/s)`)
  for (let k = 1; k < speeds.length; k++) assert.ok(Math.abs(speeds[k] - speeds[k - 1]) <= 900 * 1.5 / 20 + 1e-6, `no speed kick at tick ${k}`)
})

test('stepActor: a scene that moves an actor 6 blocks is walked there; a warp (a cut) jumps; heads turn at <= 20 deg a tick', () => {
  const at = { x: 0, y: 1, z: 0, yaw: 0, pitch: 0 }
  const r = M.stepActor(at, { x: 6, y: 1, z: 0, yaw: 170, pitch: 0 })
  assert.ok(Math.abs(r.at.x - 0.3) < 1e-9 && r.clamped === 6)
  assert.strictEqual(r.at.yaw, 20)
  const w = M.stepActor(at, { x: 6, y: 1, z: 0, yaw: 170, pitch: 0 }, true)
  assert.deepStrictEqual([w.at.x, w.at.yaw, w.clamped], [6, 170, 0])
  assert.strictEqual(M.stepActor(at, { x: 0.2, y: 1, z: 0, yaw: 0, pitch: 0 }).clamped, 0)
})

// ---------------------------------------------------------------- the story kit (lib/story.js)
const fakeKit = (stunt = {}) => {
  const handlers = []
  const marks = []
  const ctx = { stunt, tick: 0, Vec3, marks, mark (e, x) { marks.push([this.tick, e, x || {}]) }, log () {}, sound () {} }
  const bot = {
    entity: { position: new Vec3(0.5, 64, 0.5), yaw: 0, pitch: 0, velocity: new Vec3(0, 0, 0), onGround: true },
    controlState: {},
    currentWindow: null,
    look (y, p) { this.entity.yaw = y; this.entity.pitch = p },
    chat (s) { ctx.chat = (ctx.chat || []).concat(s) },
    on (ev, h) { if (ev === 'physicsTick') handlers.push(h) },
    removeListener () {},
    setControlState (k, v) { this.controlState[k] = v },
    swingArm () {},
    blockAt () { return null },
    waitForTicks: async (n) => { for (let i = 0; i < n; i++) { ctx.tick++; for (const h of handlers) h() } }
  }
  ctx.bot = bot
  const K = storyKit(ctx, { line: () => ({ dur: 1, at: () => 0 }), gap: 0.1 }, { X: 0, Z: 0, F: 63 }, { warm: null })
  K.sway = 0
  return { K, bot, ctx, tick: (n = 1) => bot.waitForTicks(n) }
}

test('the kit turns the camera like a hand on a mouse: a look is a target, reached over several ticks', async () => {
  const { K, bot, tick } = fakeKit()
  K.base = { yaw: 1.2, pitch: 0 }
  K.look(0)
  await tick(1)
  assert.ok(bot.entity.yaw > 0 && bot.entity.yaw < 0.1, `one tick in it has only started turning (${bot.entity.yaw})`)
  await tick(30)
  assert.ok(Math.abs(bot.entity.yaw - 1.2) < 0.003)
  // a raw bot.look is routed through the same easing
  bot.look(0, 0, true)
  assert.ok(Math.abs(bot.entity.yaw - 1.2) < 0.003, 'a raw look does not snap')
  await tick(1)
  assert.ok(bot.entity.yaw > 1.1)
})

test('GUI freeze: while a container window is open the view does not move; after it closes it eases back into motion', async () => {
  const { K, bot, ctx, tick } = fakeKit()
  K.base = { yaw: 0.5, pitch: 0 }; K.look(0)
  await tick(40)
  bot.currentWindow = { id: 1 }
  K.base = { yaw: -0.5, pitch: 0.3 }; K.look(0)
  const y0 = bot.entity.yaw, p0 = bot.entity.pitch
  for (let k = 0; k < 30; k++) { K.look(k); await tick(1); assert.strictEqual(bot.entity.yaw, y0); assert.strictEqual(bot.entity.pitch, p0) }
  bot.currentWindow = null
  await tick(1)
  const first = Math.abs(bot.entity.yaw - y0)
  assert.ok(first > 0 && first < 0.05, `the first tick after the close eases out (${first})`)
  assert.ok(ctx.marks.some(m => m[1] === 'gui_freeze') && ctx.marks.some(m => m[1] === 'gui_thaw'))
})

test('an actor moved 6 blocks with no cut is walked there and the jump is marked; on a cut it jumps', async () => {
  const { K, ctx, tick } = fakeKit()
  const a = K.actor('mom', { x: 0, z: 0 })
  await tick(1)
  a.x = 6
  await tick(1)
  const last = () => ctx.chat.filter(c => c.includes('tag=mom')).pop()
  const xOf = (c) => Number(c.split(' ')[2])
  assert.ok(Math.abs(xOf(last()) - 0.3) < 0.003, last())
  assert.ok(ctx.marks.some(m => m[1] === 'motion_warn' && m[2].tag === 'mom'))
  const b = K.actor('dad', { x: 0, z: 0 })
  await tick(1)
  K._cutting = true; b.x = 9; await tick(1); K._cutting = false
  assert.ok(Math.abs(xOf(ctx.chat.filter(c => c.includes('tag=dad')).pop()) - 9) < 0.003)
})

// ---------------------------------------------------------------- the checks (lib/hb/motion.js)
const pose = (i, x, yaw, pitch = 0, keys = 0) => [i, x, 64, 0, yaw, pitch, 0, 0, keys]

test('guiMotion flags a view that turns under an open container, and passes one that holds still', () => {
  const tl = [{ t: 10 * 50, event: 'container' }, { t: 30 * 50, event: 'container_close' }]
  const moving = Array.from({ length: 40 }, (_, i) => pose(i, 0, i * 0.005))
  const f = C.guiMotion(moving, tl)
  assert.strictEqual(f.length, 1)
  assert.ok(f[0].turn > 5 && f[0].tick === 10)
  const still = Array.from({ length: 40 }, (_, i) => pose(i, 0, i < 10 ? i * 0.005 : i > 30 ? i * 0.005 : 0.05))
  assert.strictEqual(C.guiMotion(still, tl).length, 0)
})

test('teleports: a mob jumping 3 blocks with no cut is flagged; on a cut it is flagged late unless the renderer snaps it', () => {
  const rows = []
  for (let t = 0; t < 30; t++) rows.push([t, 7, 'villager', t < 15 ? 0 : 3.2, 64, 0])
  for (let t = 0; t < 30; t++) rows.push([t, 8, 'villager', t * 0.2, 64, 5])   // walking: fine
  for (let t = 0; t < 30; t++) rows.push([t, 9, 'item', t < 10 ? 0 : 5, 64, 0])   // items fly: skipped
  const f = C.teleports(rows, [])
  assert.deepStrictEqual(f.map(x => [x.id, x.tick, x.late]), [[7, 14, null]])
  const late = C.teleports(rows, [12])
  assert.deepStrictEqual(late.map(x => [x.id, x.late]), [[7, 3]])
  assert.strictEqual(C.teleports(rows, [12], { snapped: true }).length, 0)
  // a park in the waiting room 60 up is not a teleport
  assert.strictEqual(C.teleports([[0, 3, 'villager', 0, 64, 0], [1, 3, 'villager', 0, 124, 0]], []).length, 0)
})

test('headSnaps flags a 15-degree one-tick whip; the governor\'s turn passes', () => {
  const whip = Array.from({ length: 30 }, (_, i) => pose(i, 0, i < 10 ? 0 : i < 11 ? 0.26 : 0.26))
  assert.strictEqual(C.headSnaps(whip).length, 1)
  let cur = { yaw: 0, pitch: 0 }, vel = { yaw: 0, pitch: 0 }
  const eased = []
  for (let i = 0; i < 40; i++) { eased.push(pose(i, 0, cur.yaw, cur.pitch)); const r = M.stepTurn(cur, vel, { yaw: i >= 5 ? 1.0 : 0, pitch: 0 }); cur = r.cur; vel = r.vel }
  assert.deepStrictEqual(C.headSnaps(eased), [])
})

test('stalls: walking forward into a block corner (slowed to a third for 6 ticks) is flagged', () => {
  const P = []; let x = 0
  for (let i = 0; i < 40; i++) { P.push(pose(i, x, 0, 0, 1)); x += i >= 15 && i < 21 ? 0.07 : 0.21 }
  const f = C.stalls(P)
  assert.strictEqual(f.length, 1)
  assert.strictEqual(f[0].tick, 15)
  const free = []; x = 0
  for (let i = 0; i < 40; i++) { free.push(pose(i, x, 0, 0, 1)); x += 0.21 }
  assert.strictEqual(C.stalls(free).length, 0)
})

// ---------------------------------------------------------------- the source lint (lib/hb/motion_lint.js)
test('the motion lint names raw calls in perform, not in setup, and honours // motion-ok', () => {
  const src = [
    'module.exports = {',
    '  async setup (ctx) { await c(`/tp @e[tag=a] 1 2 3`) },',
    '  async perform (ctx) {',
    '    bot.look(1, 0, true)',
    '    bot.entity.yaw = 2',
    '    say(`/tp @e[tag=mom,limit=1] ${X} ${F} ${Z}`)',
    '    await line(\'L01\', () => {}, -S.gap)',
    '    bot.openContainer(b)',
    '    bot.dig(b, true)',
    '    bot.lookAt(p) // motion-ok: the throw needs the exact aim',
    '    // bot.look(0, 0) in a comment is fine',
    '    K.aimAt(p); K.dig(b); K.place(p, \'jukebox\')',
    '  }',
    '}'
  ].join('\n')
  const hits = lintSource(src)
  assert.deepStrictEqual(hits.map(h => h.line), [4, 5, 6, 7, 8, 9])
  assert.ok(hits.every(h => h.use && h.what))
})
