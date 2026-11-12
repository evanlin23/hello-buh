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
// the world: exactly the stunt's build (lib/dropper.js blueprint), every /fill and /setblock in order
const cells = new Map()
const key = (x, y, z) => `${x},${y},${z}`
for (const c of D.blueprint(spec, X, Z)) {
  const m = /^\/(fill|setblock) (\S+) (\S+) (\S+)(?: (\S+) (\S+) (\S+))? (\S+)$/.exec(c)
  if (!m) throw new Error(`can't read ${c}`)
  const n = m.slice(2, 5).map(Number), e = m[1] === 'fill' ? m.slice(5, 8).map(Number) : n, b = m[8]
  for (let x = Math.min(n[0], e[0]); x <= Math.max(n[0], e[0]); x++) for (let y = Math.min(n[1], e[1]); y <= Math.max(n[1], e[1]); y++) for (let z = Math.min(n[2], e[2]); z <= Math.max(n[2], e[2]); z++) {
    if (b === 'air') cells.delete(key(x, y, z)); else cells.set(key(x, y, z), b)
  }
}
const blocks = new Map()
const blockOf = (spec) => {
  if (!blocks.has(spec)) {
    const [, name, props] = /^([a-z_]+)(?:\[(.*)\])?$/.exec(spec)
    const p = Object.fromEntries((props || '').split(',').filter(Boolean).map(kv => kv.split('=')))
    blocks.set(spec, Block.fromProperties ? Block.fromProperties(name, p, 0) : Block.fromStateId(mcData.blocksByName[name].defaultState, 0))
  }
  return blocks.get(spec)
}
const AIR = blockOf('air')
const world = {
  getBlock (p) {
    const x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z)
    const b = Object.create(blockOf(cells.get(key(x, y, z)) || 'air'))
    b.position = new Vec3(x, y, z)
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
    if (e.isCollidedHorizontally && e.position.y < s.y - 1) { out = `WRONG: brushed a wall or decoration at y ${e.position.y.toFixed(1)} (x ${e.position.x.toFixed(2)} z ${e.position.z.toFixed(2)})`; bad++; break }
    if (e.position.y > s.y - 0.5) continue   // still on the rim
    if (a.fail !== undefined) {
      const L = layers[a.fail]
      if (e.onGround) {   // the splat (the stunt marks fail<i> here; the edit cuts 0.35 s later)
        const ok = pl.li === a.fail && Math.abs(e.position.y - L.y - 1) < 0.1
        out = `${ok ? 'fail as planned' : 'WRONG'}: hit layer ${pl.li} (planned ${a.fail}) at tick ${t}, x ${e.position.x.toFixed(2)} z ${e.position.z.toFixed(2)}`
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
