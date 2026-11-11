// The action helpers' guarantees (lib/act.js; owner r:rffba12 "actions off-aim", creeper_art "backing into earlier
// builds"): every place / break / use / use-on-a-mob happens with the crosshair on the target, after a turn no faster
// than 220 deg/s; many targets go in a snake order; walking backwards stops short of a block behind.
const test = require('node:test')
const assert = require('node:assert')
const { Vec3 } = require('vec3')
const act = require('../../act')
const SIGHT = require('../../sight')

const DEG = 180 / Math.PI
const FULL = [[0, 0, 0, 1, 1, 1]]

// a fake bot in a tiny world: `blocks` a Set of 'x,y,z'; every packet and action is logged with the view at that moment
function world (blocks, at = new Vec3(0.5, 64, 0.5), yaw = 0, pitch = 0) {
  const B = new Set(blocks)
  const ev = []
  let tick = 0
  const bot = {
    entity: { position: at, yaw, pitch },
    controlState: { sneak: false, back: false },
    heldItem: { name: 'stone' },
    blockAt (p) {
      const k = `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`
      const on = B.has(k)
      return { name: on ? 'stone' : 'air', position: new Vec3(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)), shapes: on ? FULL : [], boundingBox: on ? 'block' : 'empty' }
    },
    async look (y, p) { bot.entity.yaw = y; bot.entity.pitch = p },
    async lookAt () { throw new Error('a snap: bot.lookAt must never run inside an action') },
    async waitForTicks (n) { tick += n; if (bot.controlState.back) bot.entity.position = bot.entity.position.offset(Math.sin(bot.entity.yaw) * 0.216 * n, 0, Math.cos(bot.entity.yaw) * 0.216 * n) },
    setControlState (k, v) { bot.controlState[k] = v },
    swingArm () { ev.push({ kind: 'swing' }) },
    _client: { write (name, data) { ev.push({ kind: name, data, view: { yaw: bot.entity.yaw, pitch: bot.entity.pitch }, tick }) } },
    async dig (b) { ev.push({ kind: 'dig', pos: b.position, view: { yaw: bot.entity.yaw, pitch: bot.entity.pitch }, tick }) },
    async activateEntity (e) { await bot.lookAt(); ev.push({ kind: 'use_entity' }) },
    async activateBlock (b) { await bot.lookAt(); ev.push({ kind: 'use_block' }) }
  }
  const ctx = { bot, Vec3, get tick () { return tick }, mark () {}, log () {}, sound () {}, soundGroup: () => 'stone' }
  return { bot, ctx, ev, B, shapes: (x, y, z) => B.has(`${x},${y},${z}`) ? FULL : null }
}
const eyeOf = (bot) => { const p = bot.entity.position; return [p.x, p.y + 1.62, p.z] }
const maxTurn = (A) => { let m = 0; for (let i = 1; i < A.turns.length; i++) m = Math.max(m, Math.hypot(((A.turns[i].yaw - A.turns[i - 1].yaw + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, A.turns[i].pitch - A.turns[i - 1].pitch)); return m * DEG * 20 }

test('place: the click lands with the crosshair on the clicked block, after a turn of at most 220 deg/s', async () => {
  // a floor row in front and behind; the target spot is behind the player (a 180-degree turn)
  const floor = []; for (let z = -4; z <= 4; z++) floor.push(`0,63,${z}`)
  const W = world(floor)
  const A = act(W.ctx)
  await A.place(new Vec3(0, 64, 3))
  const pk = W.ev.find(e => e.kind === 'block_place')
  assert.ok(pk, 'placed')
  assert.deepStrictEqual([pk.data.location.x, pk.data.location.y, pk.data.location.z], [0, 63, 3])
  const c = SIGHT.crosshair(eyeOf(W.bot), pk.view.yaw, pk.view.pitch, [[0, 63, 3]], W.shapes, { skip: [[0, 64, 3]] })
  assert.ok(c.on, 'the crosshair is on the block it clicks')
  assert.ok(maxTurn(A) <= 220 + 1e-6, `turned at ${maxTurn(A).toFixed(0)} deg/s`)
  assert.ok(A.turns.length >= 15, 'a 180-degree turn takes most of a second, not a snap')
})

test('place: back-to-back places wait for vanilla\'s 4-tick use delay; a snake order turns less than a scrambled one', async () => {
  const floor = []; for (let x = -3; x <= 3; x++) for (let z = -6; z <= -2; z++) floor.push(`${x},63,${z}`)
  const W = world(floor)
  const A = act(W.ctx)
  const cells = []; for (let x = -2; x <= 2; x++) for (let z = -5; z <= -3; z++) cells.push(new Vec3(x, 64, z))
  const order = A.snake(cells, (c) => c.z, (c) => c.x)
  for (const p of order) await A.place(p)
  const ticks = W.ev.filter(e => e.kind === 'block_place').map(e => e.tick)
  for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i] - ticks[i - 1] >= 4, `use delay at ${i}`)
  // the snake's consecutive targets are neighbours
  for (let i = 1; i < order.length; i++) assert.ok(order[i].distanceTo(order[i - 1]) <= 1 + 1e-9)
})

test('dig: the dig starts with the crosshair on the block; a hidden block throws instead of digging blind', async () => {
  const W = world(['0,64,-3', '0,65,-3', '0,64,-2', '0,65,-2', '0,66,-2'])   // the wall at -2 (and the block on top) hide -3
  const A = act(W.ctx)
  await assert.rejects(A.dig(W.bot.blockAt(new Vec3(0, 64, -3))), /in the way|visible/)
  assert.strictEqual(W.ev.filter(e => e.kind === 'dig').length, 0)
  await A.dig(W.bot.blockAt(new Vec3(0, 64, -2)))
  const d = W.ev.find(e => e.kind === 'dig')
  assert.ok(SIGHT.crosshair(eyeOf(W.bot), d.view.yaw, d.view.pitch, [[0, 64, -2]], W.shapes).on)
})

test('useOn: a sheep is dyed only once the crosshair is on its box, and the action never snaps the view', async () => {
  const W = world([], new Vec3(0.5, 64, 0.5), Math.PI / 2, 0)   // facing west; the sheep is to the north
  const A = act(W.ctx)
  const sheep = { id: 7, name: 'sheep', position: new Vec3(0.5, 64, -2.5), width: 0.9, height: 1.3 }
  let viewAtUse = null
  W.bot.activateEntity = async () => { await W.bot.lookAt(); viewAtUse = { yaw: W.bot.entity.yaw, pitch: W.bot.entity.pitch } }
  await A.useOn(sheep)
  assert.ok(viewAtUse)
  assert.ok(SIGHT.crosshairBox(eyeOf(W.bot), viewAtUse.yaw, viewAtUse.pitch, SIGHT.entityBox(sheep), W.shapes).on)
  assert.ok(maxTurn(A) <= 220 + 1e-6)
})

test('aimAt: a target out of reach of the turn in time throws (o.strict false: returns false)', async () => {
  const W = world([])
  const A = act(W.ctx)
  assert.strictEqual(await A.aimAt(new Vec3(0.5, 66, 10), { block: null, max: 2, strict: false, on: new Vec3(0, 65, 10) }), false)
  await assert.rejects(A.aimAt({ block: new Vec3(0, 65, 10) }, { max: 2 }), /didn't land/)
})

test('back: walking backwards stops at least 1 block short of a solid block behind', async () => {
  // facing north (yaw 0): backwards is +z; a wall at z = 5
  const wall = []; for (let x = -2; x <= 2; x++) for (let y = 64; y <= 66; y++) wall.push(`${x},${y},5`)
  const W = world(wall)
  const A = act(W.ctx)
  const k = await A.back(100)
  assert.ok(k < 100, 'it stopped early')
  const gap = 5 - (W.bot.entity.position.z + 0.3)
  assert.ok(gap >= 1 - 0.26, `ended ${gap.toFixed(2)} blocks from the wall, coast included`)
  assert.strictEqual(W.bot.controlState.back, false)
})

test('snake: rows top-down, every other row reversed', () => {
  const cells = []; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) cells.push({ x, y, z: 0 })
  const s = act.snake(cells)
  assert.deepStrictEqual(s.map(c => `${c.x}${c.y}`), ['02', '12', '22', '21', '11', '01', '00', '10', '20'])
})

test('gates: on the target the packet goes out on this tick, unchanged; off it the view turns first; passive marks off_aim', async () => {
  const W = world(['0,63,-3'])
  const marks = []
  W.ctx.mark = (e, x) => marks.push(e)
  const A = act(W.ctx)
  // looking straight at the block's top: the fast path sends before click() returns
  const e = [0.5, 65.62, 0.5], ang = act.aimAngles({ x: e[0], y: e[1], z: e[2] }, { x: 0.5, y: 64, z: -2.5 })
  W.bot.entity.yaw = ang.yaw; W.bot.entity.pitch = ang.pitch
  A.click({ x: 0, y: 63, z: -3 }, 1, [0.5, 1, 0.5])
  assert.strictEqual(W.ev.filter(x => x.kind === 'block_place').length, 1, 'sent synchronously')
  assert.strictEqual(A.turns.length, 0, 'no turn')
  // looking away: the click waits for the turn, and lands on the block
  W.bot.entity.yaw = Math.PI / 2; W.bot.entity.pitch = 0.3
  await A.click({ x: 0, y: 63, z: -3 }, 1, [0.5, 1, 0.5])
  const pk = W.ev.filter(x => x.kind === 'block_place')[1]
  assert.ok(A.turns.length > 3)
  assert.ok(A.onTarget({ block: { x: 0, y: 63, z: -3 } }, { deg: 6 }, pk.view))
  // passive (a factory with its own look governor), no wait: it still acts, marked off_aim for the aim check
  W.bot.entity.yaw = Math.PI / 2; W.bot.entity.pitch = 0.3
  await A.click({ x: 0, y: 63, z: -3 }, 1, [0.5, 1, 0.5], { turn: false, max: 0 })
  assert.strictEqual(W.ev.filter(x => x.kind === 'block_place').length, 3)
  assert.ok(marks.includes('off_aim'))
})

test('lib/: no factory sends a raw place, break or use outside lib/act.js (./hb motion lib)', () => {
  assert.deepStrictEqual(require('../motion_lint').lintLib().map(h => `${h.file}:${h.line}`), [])
})

test('the governor turns at speed when mineflayer quantizes the look (0.15 deg steps): no velocity reset every tick', async () => {
  const W = world([])
  const q = 0.15 * Math.PI / 180
  W.bot.look = async (y, p) => { W.bot.entity.yaw += Math.round((y - W.bot.entity.yaw) / q) * q; W.bot.entity.pitch += Math.round((p - W.bot.entity.pitch) / q) * q }
  const A = act(W.ctx)
  await A.aimAt(new Vec3(-9.5, 65.62, 0.5), { tol: 0.02, max: 40 })   // 90 deg to the west
  assert.ok(A.turns.length <= 16, `a 90 deg turn took ${A.turns.length} ticks (crawling at one tick's acceleration took 70+)`)
})

test('turnTo: a look round (no action) lands on the angles, eased, at most 220 deg/s (r:r38374d)', async () => {
  const W = world([])
  const A = act(W.ctx)
  const ok = await A.turnTo({ yaw: Math.PI * 0.95, pitch: -0.8 }, { hold: 3 })
  assert.ok(ok, 'landed')
  assert.ok(Math.abs(W.bot.entity.yaw - Math.PI * 0.95) < 0.02 && Math.abs(W.bot.entity.pitch + 0.8) < 0.02)
  assert.ok(maxTurn(A) <= 220 + 1e-6, `turned at ${maxTurn(A).toFixed(0)} deg/s`)
  const d1 = Math.hypot(A.turns[0].yaw, A.turns[0].pitch) * DEG * 20   // from rest at yaw 0, pitch 0
  assert.ok(d1 < 80, `eased in: the first tick turns ${d1.toFixed(0)} deg/s`)
})
