#!/usr/bin/env node
// Fly a dropper episode offline (no server): the same pilot as the stunt (lib/dropper.js) over prismarine-physics,
// mineflayer's own physics, in a world of just the shaft. Prints each try: the layers it clears (with the margin to the
// hole's edge), where a fail is cut, and where the clean run lands. Run it on every new episode before recording:
//   node scripts/dropper_sim.js dropper_rainbow          exit 1 if a try doesn't do what its attempt says
const path = require('path')
const { Vec3 } = require('vec3')
const D = require('../lib/dropper')

const VERSION = '1.21.9'
const mcData = require('minecraft-data')(VERSION)
const Block = require('prismarine-block')(VERSION)
const { Physics, PlayerState } = require('prismarine-physics')

const stunt = require(path.resolve(__dirname, '../stunts', process.argv[2] + '.js'))
const spec = stunt.dropperSpec
if (!spec) { console.error(`${process.argv[2]} isn't a dropper episode (no dropperSpec)`); process.exit(2) }
const X = 0, Z = 0, layers = D.layout(spec.layers)
const st = (name) => Block.fromStateId(mcData.blocksByName[name].defaultState, 0)
const AIR = st('air'), WALL = st('stone'), WATER = st(spec.landing.block === 'water' ? 'water' : spec.landing.block)
const world = {
  getBlock (p) {
    const x = Math.floor(p.x) - X, y = Math.floor(p.y), z = Math.floor(p.z) - Z
    let b = AIR
    if (y > D.TOP || y < D.FLOOR - 1) b = AIR
    else if (Math.abs(x) > D.R || Math.abs(z) > D.R) b = (Math.abs(x) === D.R + 1 || Math.abs(z) === D.R + 1) && Math.abs(x) <= D.R + 1 && Math.abs(z) <= D.R + 1 ? WALL : AIR
    else if (y === D.FLOOR) b = x === 0 && z === 0 ? WATER : WALL
    else if (y < D.FLOOR) b = WALL
    else {
      const L = layers.find(l => y <= l.y && y >= l.bottom)
      if (L && !L.holes.some(h => x >= h[0] && x <= h[2] && z >= h[1] && z <= h[3])) b = WALL
    }
    b = Object.create(b); b.position = new Vec3(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))
    return b
  }
}
const physics = Physics(mcData, world)
const fakeBot = (pos) => ({ version: VERSION, entity: { position: pos, velocity: new Vec3(0, 0, 0), onGround: false, isInWater: false, isInLava: false, isInWeb: false, isCollidedHorizontally: false, isCollidedVertically: false, elytraFlying: false, yaw: D.YAW, pitch: -Math.PI / 2, effects: {}, attributes: {} }, jumpTicks: 0, jumpQueued: false, fireworkRocketDuration: 0, inventory: { slots: [] } })

let bad = 0
const S = D.starts(X, Z)
spec.attempts.forEach((a, i) => {
  const s = i === 0 ? S.rim : S.air
  const bot = fakeBot(new Vec3(s.x, s.y, s.z))
  const controls = { forward: i === 0, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }
  const pl = D.pilot({ layers, attempt: a, X, Z, startY: s.y })
  let li = 0, out = null, pending = null
  const passes = []
  for (let t = 0; t < 500 && !out; t++) {
    if (pending) Object.assign(controls, pending)   // keys set on a physicsTick act on the next one
    const ps = new PlayerState(bot, controls)
    physics.simulatePlayer(ps, world).apply(bot)
    const e = bot.entity
    if (i === 0 && e.position.y < s.y - 0.5) controls.forward = false
    pending = pl.tick(e)
    while (li < pl.li) {
      const L = layers[li], c = D.holeCentre(L, L.via || 0, X, Z)
      passes.push(`L${li} ${(Math.min(c.hx - Math.abs(e.position.x - c.x), c.hz - Math.abs(e.position.z - c.z)) - 0.3).toFixed(2)}`)
      li++
    }
    if (e.position.y > s.y - 0.5) continue   // still on the rim
    if (a.fail !== undefined) {
      const L = layers[a.fail]
      if (e.onGround || e.position.y + 2 * e.velocity.y <= L.y + 1.05) {
        const ok = pl.li === a.fail && e.position.y >= L.y + 1 && !e.onGround
        out = `${ok ? 'fail as planned' : 'WRONG'}: cut ${(e.position.y - L.y - 1).toFixed(2)} over layer ${pl.li} (planned ${a.fail}) at tick ${t}, x ${e.position.x.toFixed(2)} z ${e.position.z.toFixed(2)}`
        if (!ok) bad++
      }
    } else if (e.position.y < D.FLOOR + 2.2 || e.isInWater || e.onGround) {
      const dx = e.position.x - X - 0.5, dz = e.position.z - Z - 0.5
      const ok = Math.abs(dx) < 0.2 && Math.abs(dz) < 0.2 && pl.li === layers.length
      out = `${ok ? 'LANDED' : 'WRONG'}: at tick ${t}, ${dx.toFixed(2)}, ${dz.toFixed(2)} from the middle (layer ${pl.li}${e.onGround ? ', on ground' : ''})`
      if (!ok) bad++
    }
  }
  if (!out) { out = 'WRONG: never got there'; bad++ }
  console.log(`attempt #${a.n}: ${out}; cleared (edge margin) ${passes.join(', ') || 'none'}`)
})
process.exit(bad ? 1 : 0)
