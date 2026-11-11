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
    entities: {},
    events: {},
    on (ev, h) { if (ev === 'physicsTick') handlers.push(h); else (this.events[ev] = this.events[ev] || []).push(h) },
    emit (ev, ...a) { for (const h of [...(this.events[ev] || [])]) h(...a) },
    prependListener (ev, h) { if (ev === 'physicsTick') handlers.unshift(h) },
    removeListener (ev, h) { const l = ev === 'physicsTick' ? handlers : (this.events[ev] || []); const i = l.indexOf(h); if (i >= 0) l.splice(i, 1) },
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
  const last = () => ctx.chat.filter(c => c.startsWith('/tp') && c.includes('tag=mom')).pop()
  const xOf = (c) => Number(c.split(' ')[2])
  assert.ok(Math.abs(xOf(last()) - 0.3) < 0.003, last())
  assert.ok(ctx.marks.some(m => m[1] === 'motion_warn' && m[2].tag === 'mom'))
  const b = K.actor('dad', { x: 0, z: 0 })
  await tick(1)
  K._cutting = true; b.x = 9; await tick(1); K._cutting = false
  assert.ok(Math.abs(xOf(ctx.chat.filter(c => c.startsWith('/tp') && c.includes('tag=dad')).pop()) - 9) < 0.003)
})

// dog_hill (owner, 2026-11-10: "the villager keeps teleporting ... right at the 'i even begged' line"): the server's tracker
// sends a mob's move every 3rd tick unless its synced data changed, so a /tp alone reached the client at 6.7 Hz
test('K.actor changes the actor\'s synced data every tick (the tracker sends its move every tick); sync: false does not', async () => {
  const { K, ctx, tick } = fakeKit()
  K.actor('pip', { x: 0, z: 0 })
  K.actor('old', { x: 2, z: 0 }, { sync: false })
  await tick(4)
  const air = ctx.chat.filter(c => c.startsWith('/data merge entity @e[tag=pip,limit=1] {Air:'))
  assert.strictEqual(air.length, 4)
  assert.ok(new Set(air).size === 2, 'the value alternates (a value that did not change would not mark the data dirty)')
  assert.ok(!ctx.chat.some(c => c.includes('tag=old') && c.startsWith('/data')))
  assert.ok(!Object.keys(K.actors.get('pip')).includes('_nosync'))
})

test('K.cutShot: the shot mark waits until the client has the moved cast on their marks, and lands on that tick', async () => {
  const { K, bot, ctx, tick } = fakeKit({ shots: { hut: { path: [[0, 0, 2, 0]], look: [0, 1, 0] }, beg: { path: [[0, 1, 2, 4]], look: [1, 1, 0] } } })
  const pip = K.actor('pip', { x: -0.5, z: -0.8, yaw: 0 })
  // the client's copy of the villager: where the kit put it, as the server's tracker reports it
  const ent = { id: 7, name: 'villager', type: 'mob', position: new Vec3(-0.502, 64, -0.8) }
  bot.entities[7] = ent
  await tick(3)
  assert.ok(ctx.marks.some(m => m[1] === 'actor' && m[2].tag === 'pip' && m[2].id === 7), 'the actor is resolved to its entity')
  const p = K.cutShot('beg', () => { pip.x = 1.7; pip.z = 0.5; pip.yaw = 90 }, { time: 9000 })
  await tick(2)
  assert.ok(!ctx.marks.some(m => m[1] === 'shot' && m[2].name === 'beg'), 'no shot mark while the client has it in the old spot')
  // the move packet arrives (mid-tick): the mark is on this tick, with the time
  ent.position = new Vec3(1.702, 64, 0.5); const t0 = ctx.tick
  bot.emit('entityMoved', ent)
  const shot = ctx.marks.find(m => m[1] === 'shot' && m[2].name === 'beg')
  assert.ok(shot && shot[0] === t0)
  assert.ok(ctx.marks.some(m => m[1] === 'time' && m[2].time === 9000 && m[0] === t0))
  await tick(1)
  assert.ok((await p) >= 2)
  // nobody moved: the shot is marked at once
  const q = await K.cutShot('hut', () => {})
  assert.strictEqual(q, 0)
  // a placement that never lands is cut anyway, and said
  const r = K.cutShot('beg', () => { pip.x = 5 }, { max: 3 })
  await tick(4)
  assert.strictEqual(await r, 3)
  assert.ok(ctx.marks.some(m => m[1] === 'motion_warn' && m[2].kind === 'cast_late'))
})

// ---------------------------------------------------------------- walking a path (lib/motion.js walkSteer / walkPlan)
// motiontest (2026-11-10): the look-ahead cut the first corner, the walker went by waypoint 1 more than 0.6 from it, then
// turned back for it and spun in place (180 deg/s) for 20 s; the corner it cut also ran it into the wall it went around
test('walkSteer: a waypoint the walker cut past is passed, not turned back for', () => {
  const start = { x: 0.5, y: 0, z: 0.5 }, pts = [{ x: 2, y: 0, z: 2.5 }, { x: 4, y: 0, z: 2.5 }, { x: 6.5, y: 0, z: 2.5 }]
  // 1 block from waypoint 1 but already past it along the next leg (x > 2)
  const s = M.walkSteer(start, pts, 0, { x: 2.7, z: 2.0 })
  assert.strictEqual(s.i, 1)
  assert.ok(s.ahead.x > 2.7, `steers on along the path (ahead x ${s.ahead.x})`)
  // the steering always points forward along the path from where the walker is: no spin
  const r = M.walkSteer(start, pts, 1, { x: 3.77, z: 2.48 })
  assert.ok(r.i === 2 && r.ahead.x > 5.5 && Math.abs(r.ahead.z - 2.5) < 0.01, JSON.stringify(r))
})

test('walkPlan: the dry run gets there on an open path, and names the wall a cut corner runs into', () => {
  const wall = (x, y, z) => (Math.floor(x) === 3 && Math.floor(z) >= -1 && Math.floor(z) <= 1 && Math.floor(y) >= 1 && Math.floor(y) <= 2) ? 'cobblestone' : null
  const gov = { cur: { yaw: -Math.PI / 2, pitch: 0 }, vel: { yaw: 0, pitch: 0 } }
  const start = { x: 0.5, y: 1, z: 0.5 }
  assert.strictEqual(M.walkPlan(start, [{ x: 6.5, y: 1, z: 4.5 }], gov, () => null), null)
  // around the wall's corner (3, 2) with 0.5 to spare on the legs: the cut corner hits it
  const tight = M.walkPlan(start, [{ x: 2, y: 1, z: 2.5 }, { x: 4, y: 1, z: 2.5 }, { x: 6.5, y: 1, z: 2.5 }], gov, wall)
  assert.ok(/cobblestone at 3 \d -?\d/.test(tight || ''), tight)
  // a wider path goes by
  assert.strictEqual(M.walkPlan(start, [{ x: 1.5, y: 1, z: 3.5 }, { x: 4.5, y: 1, z: 3.5 }, { x: 6.5, y: 1, z: 2.5 }], gov, wall), null)
})

test('a cut lands on its aim: the old shot\'s target does not turn the new shot back for a tick', async () => {
  const { K, bot, tick } = fakeKit()
  K.base = { yaw: 0.2, pitch: 0 }; K.look(0)
  await tick(30)
  // the server's teleport turns the view (as K.cut's /tp does) while the old aim is still the target
  bot.entity.yaw = 2.0
  await tick(1)
  assert.ok(Math.abs(bot.entity.yaw - 2.0) < 1e-9, `holds the teleport's aim (${bot.entity.yaw})`)
  await tick(3)
  assert.ok(Math.abs(bot.entity.yaw - 2.0) < 1e-9, `still (${bot.entity.yaw})`)
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
    '    say(`/execute as @e[tag=pip] at @s run tp @s ~ ~0.3 ~`)',
    '    ctx.cmd(`/data merge entity @e[tag=pip,limit=1] {Pos:[1d,2d,3d]}`)',
    '    bot.lookAt(p) // motion-ok: the throw needs the exact aim',
    '    // bot.look(0, 0) in a comment is fine',
    '    K.aimAt(p); K.dig(b); K.place(p, \'jukebox\')',
    '  }',
    '}'
  ].join('\n')
  const hits = lintSource(src)
  assert.deepStrictEqual(hits.map(h => h.line), [4, 5, 6, 7, 8, 9, 10, 11])
  assert.ok(hits.every(h => h.use && h.what))
})

test('the clock lint: a story timing its lines on its own clock (dog_hill\'s dur + 0.08) is named; K.line is not', () => {
  // the bad pattern, as on origin/render/story_dog_hill-preview
  const bad = [
    'const GAP = 0.08',
    'module.exports = {',
    '  async perform (ctx) {',
    '    const K = storyKit(ctx, storyLines(\'stories/dog_hill\'), { X, Z, F })',
    '    const VJ = require(\'../stories/dog_hill/voice/voice.json\').lines',
    '    const L = (id) => Math.round((VJ[id].dur + GAP) * 20)',
    '    const say1 = (id) => ctx.mark(\'line\', { id, who: \'N\', vox: id, dur: VJ[id].dur })',
    '    const line = async (id, scene) => { await bot.waitForTicks(Math.round(S.line(id).dur * 20)) }',
    '  }',
    '}'
  ].join('\n')
  const hits = lintSource(bad).map(h => h.line)
  for (const n of [5, 6, 7, 8]) assert.ok(hits.includes(n), `line ${n} flagged (${hits})`)
  // the good pattern (main's dog_hill, torch): K.line, and a line's dur used to place an action INSIDE it
  const good = [
    'module.exports = {',
    '  async perform (ctx) {',
    '    const K = storyKit(ctx, storyLines(\'stories/dog_hill\'), { X, Z, F })',
    '    await K.line(\'L01\', (k, at, n) => { if (k === n - 4) dig() })',
    '    const L4 = S.line(\'L04\'); digOn(k, spread(at(0) + 2, Math.round(L4.dur * 20) - 4, 4))',
    '  }',
    '}'
  ].join('\n')
  assert.deepStrictEqual(lintSource(good), [])
  // not a story (the ai_* Shorts mark their own lines by design)
  assert.deepStrictEqual(lintSource('module.exports = { async perform (ctx) { ctx.mark(\'line\', { who, dur: VOX[v] }) } }'), [])
})

test('aimAt a block from the side lands on it (the centre, not a grazing ray at its top face), at every phase of the sway', async () => {
  let late = []
  for (let ph = 0; ph < 360; ph += 15) {
    const { K, bot, ctx } = fakeKit()
    K.sway = 1
    ctx.tick = ph
    // the platform in motiontest: dirt 1.9 blocks off at the feet's level, 16 deg below the eye
    bot.entity.position = new Vec3(6.59, 66, 2.37)
    const t0 = ctx.tick
    const ok = await K.aimAt(new Vec3(8, 66, 1), { block: true })
    if (!ok || ctx.tick - t0 > 15) late.push(`${ph}: ${ctx.tick - t0} ticks`)
  }
  assert.deepStrictEqual(late, [])
})

test('the camera keeps swaying through an awaited K.dig (it stopped dead for the dig\'s ticks: held poses)', async () => {
  const { K, bot } = fakeKit()
  K.sway = 1
  bot.entity.position = new Vec3(6.59, 66, 2.37)
  // a 4-tick dig after the aim has landed: no tick of it may hold the previous tick's pose
  const seen = []
  bot.dig = async () => { for (let i = 0; i < 4; i++) { await bot.waitForTicks(1); seen.push(bot.entity.yaw) } }
  await K.dig({ position: new Vec3(8, 66, 1), name: 'dirt' }, 150)
  for (let i = 1; i < seen.length; i++) assert.notStrictEqual(seen[i], seen[i - 1], `tick ${i} of the dig holds the previous pose`)
})

// rec_check's cast checks (scripts/cast_motion.py): a cast member landing after a cut, stair-stepped cast motion
test('python: the cast checks (scripts/test_cast_motion.py)', () => {
  const { spawnSync } = require('child_process')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_cast_motion.py'], { cwd: require('path').join(__dirname, '..', '..', '..'), encoding: 'utf8', timeout: 120000 })
  assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''))
})

test('motion lint: a cut fired on at(i) (lands after the word starts) is flagged; at.cut(i) and non-cut actions are not', () => {
  const { lintSource } = require('../motion_lint')
  const src = [
    "perform: async (ctx) => {",
    "  await K.line('L03', async (k, at) => {",
    "    if (k === at(2)) K.shot('s_rev')",
    "    if (k === at.cut(2)) K.shot('s_rev')",
    "    if (k === at(3)) {",
    "      await K.cut(1.5, 10.2, P(-28, 9, 85), 12, { shot: 's05' })",
    "    }",
    "    if (k === at(1)) pickUp(1)",
    "    for (let i = 1; i < 3; i++) if (k === at(i)) await K.cut(0, 0, P(0, 0, 0))",
    "    if (k === at(4)) K.shot('s06b')   // motion-ok: a deliberate late cut",
    "  })",
    "}"
  ].join('\n')
  const hits = lintSource(src).filter(h => /fired on at\(i\)/.test(h.what)).map(h => h.line)
  assert.deepStrictEqual(hits, [3, 5, 9])
})

test('lerpStep: a mob the server moves every 3rd tick is drawn moving every tick, as the vanilla client eases it', () => {
  let l = null
  const drawn = []
  // the server's updates: 0, then 3 blocks up on tick 3, 6 on tick 6 (a launch), then still
  for (let t = 0; t < 12; t++) {
    const p = new Vec3(0, t < 3 ? 0 : t < 6 ? 3 : 6, 0)
    l = M.lerpStep(l, p)
    drawn.push(+l.pos.y.toFixed(3))
  }
  assert.deepStrictEqual(drawn, [0, 0, 0, 1, 2, 3, 4, 5, 6, 6, 6, 6])
  // a teleport over 8 blocks snaps
  assert.strictEqual(M.lerpStep(l, new Vec3(0, 20, 0)).pos.y, 20)
})
