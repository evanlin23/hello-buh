// Pixel art's guarantees (lib/pixel_art.js; owner r:rffba12 "the aim lagged the blocks", r:r650840 creeper_art "walks
// all the way back into the other one"): every block goes down with the crosshair on its cell, the view never turns
// faster than 220 deg/s, and the walk back stops 3 blocks short of a wall behind.
const test = require('node:test')
const assert = require('node:assert')
const { Vec3 } = require('vec3')
const pixelArt = require('../../pixel_art')
const SIGHT = require('../../sight')

function run (stages, extraWalls = []) {
  const st = pixelArt({ name: 't', stages, palette: { X: 'white_wool', R: 'red_wool' }, caption: 'x' })
  const X = 0, Z = 0, F = 63
  const B = new Map()   // 'x,y,z' -> name
  const k = (x, y, z) => `${x},${y},${z}`
  const walls = []
  stages.forEach((s, i) => {
    const DIRS = [[-1, 0], [0, -1], [1, 0]], [fx, fz] = DIRS[i], rx = -fz, rz = fx, H = s.art.length, W = s.art[0].length, dist = s.dist || 12
    const ybase = Math.max(F + 1, Math.round(F + 1 + 1.62 - H / 2)), cx = X + fx * dist, cz = Z + fz * dist
    for (let c = -(W >> 1) - 1; c <= W - (W >> 1); c++) for (let y = F + 1; y <= ybase + H; y++) B.set(k(cx + fx + rx * c, y, cz + fz + rz * c), 'stone_bricks')
    walls.push({ fx, fz, rx, rz, cx, cz, ybase, H, W })
  })
  for (const [x, y, z] of extraWalls) B.set(k(x, y, z), 'stone')
  let tick = 0
  const places = [], turns = []
  const bot = {
    entity: { position: new Vec3(X + 0.5, F + 1, Z + 0.5), yaw: Math.PI / 2, pitch: 0 },
    controlState: { back: false, forward: false, sneak: false },
    quickBarSlot: 0,
    blockAt (p) { const n = B.get(k(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))); return { name: n || 'air', boundingBox: n ? 'block' : 'empty', position: p.floored() } },
    async look (y, p) { turns.push([y, p]); bot.entity.yaw = y; bot.entity.pitch = p },
    async waitForTicks (n) {
      tick += n
      const e = bot.entity
      if (bot.controlState.back) e.position = e.position.offset(Math.sin(e.yaw) * 0.216 * n, 0, Math.cos(e.yaw) * 0.216 * n)
      if (bot.controlState.forward) e.position = e.position.offset(-Math.sin(e.yaw) * 0.216 * n, 0, -Math.cos(e.yaw) * 0.216 * n)
    },
    setControlState (key, v) { bot.controlState[key] = v },
    swingArm () {},
    chat () {},
    _client: {
      write (name, d) {
        if (name !== 'block_place') return
        const FACEV = { 5: [1, 0, 0], 4: [-1, 0, 0], 3: [0, 0, 1], 2: [0, 0, -1] }[d.direction]
        const cell = new Vec3(d.location.x + FACEV[0], d.location.y, d.location.z + FACEV[2])
        places.push({ cell, yaw: bot.entity.yaw, pitch: bot.entity.pitch, eye: bot.entity.position.offset(0, 1.62, 0) })
        B.set(k(cell.x, cell.y, cell.z), 'white_wool')
      }
    }
  }
  const ctx = { bot, Vec3, get tick () { return tick }, mark () {}, log () {}, sound () {}, particles () {}, soundGroup: () => 'wool', select (s) { bot.quickBarSlot = s } }
  Object.assign(st, { x: X, z: Z, floor: F, walls, slots: { X: [0], R: [1] }, restock: false })
  return { st, ctx, places, turns, bot }
}

test('pixel art: every block goes down with the crosshair on its cell, at no more than 220 deg/s, even at 0.4 ticks a block', async () => {
  const art = pixelArt.upscale(['XXXX', 'X..X', 'XXXX'], 2)
  const R = run([{ art, tpb: 0.4 }, { art, tpb: 0.4 }])
  await R.st.perform(R.ctx)
  assert.ok(R.places.length >= 30)
  for (const p of R.places) {
    const on = SIGHT.crosshairBox([p.eye.x, p.eye.y, p.eye.z], p.yaw, p.pitch, [p.cell.x, p.cell.y, p.cell.z, p.cell.x + 1, p.cell.y + 1, p.cell.z + 1], () => null, { reach: 128 }).on
    assert.ok(on, `placed ${p.cell} off the crosshair`)
  }
  let m = 0
  for (let i = 1; i < R.turns.length; i++) m = Math.max(m, Math.hypot(Math.atan2(Math.sin(R.turns[i][0] - R.turns[i - 1][0]), Math.cos(R.turns[i][0] - R.turns[i - 1][0])), R.turns[i][1] - R.turns[i - 1][1]))
  assert.ok(m * 180 / Math.PI * 20 <= 220 + 1e-6, `turned at ${(m * 180 / Math.PI * 20).toFixed(0)} deg/s`)
})

test('pixel art: the walk back on the last build stops 3 blocks short of a wall behind it', async () => {
  const art = pixelArt.upscale(['XXX', 'XXX'], 3)
  // a wall 7 blocks behind the build spot of the last stage (facing west, backing east)
  const extra = []; for (let z = -3; z <= 3; z++) for (let y = 64; y <= 67; y++) extra.push([7, y, z])
  const R = run([{ art, tpb: 1 }], extra)
  await R.st.perform(R.ctx)
  // stage 0 faces west: walking back goes +x toward x = 7
  assert.ok(7 - (R.bot.entity.position.x + 0.3) >= 3 - 0.3, `ended ${(7 - R.bot.entity.position.x - 0.3).toFixed(2)} blocks from the wall`)
})
