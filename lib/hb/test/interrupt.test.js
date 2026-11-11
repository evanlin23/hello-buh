'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { arrowShot, summon, MOBS } = require('../../interrupt')

const V = (x, y, z) => ({ x, y, z, offset (a, b, c) { return V(x + a, y + b, z + c) } })

// fly the arrow the way AbstractArrow.tick does (move, then drag 0.99 and gravity 0.05) and return where it is when
// it has covered the horizontal distance to `to`
function fly (from, to, m) {
  let p = { ...from }, v = { x: m[0], y: m[1], z: m[2] }
  const D = Math.hypot(to.x - from.x, to.z - from.z)
  for (let t = 0; t < 200; t++) {
    const n = { x: p.x + v.x, y: p.y + v.y, z: p.z + v.z }
    if (Math.hypot(n.x - from.x, n.z - from.z) >= D) { const f = (D - Math.hypot(p.x - from.x, p.z - from.z)) / Math.hypot(v.x, v.z); return { x: p.x + v.x * f, y: p.y + v.y * f, z: p.z + v.z * f } }
    p = n; v = { x: v.x * 0.99, y: v.y * 0.99 - 0.05, z: v.z * 0.99 }
  }
  return null
}

test('arrowShot lands the arrow on its target, near and far, at a bow\'s speed', () => {
  for (const [from, to] of [[V(10.5, 66.45, -1.5), V(2.45, 66, -2.5)], [V(0, 70, 0), V(0, 64, -25)], [V(-5, 64.5, 3), V(9, 66, 8)]]) {
    const s = arrowShot(from, to)
    const hit = fly(from, to, s.motion)
    assert.ok(hit, 'it gets there')
    assert.ok(Math.abs(hit.y - to.y) < 0.02 && Math.abs(hit.x - to.x) < 0.02 && Math.abs(hit.z - to.z) < 0.02, `lands within 0.02 of the target (${JSON.stringify(hit)})`)
    assert.ok(Math.abs(Math.hypot(...s.motion) - 1.6) < 1e-6, 'a skeleton\'s 1.6 blocks a tick')
    assert.ok(s.ticks > 0 && s.ticks < 40)
  }
})

test('summon: a NoAI, silent, invulnerable interrupter facing the player, the skeleton with its bow and a helmet', async () => {
  const cmds = []
  await summon({ cmd: async (c) => cmds.push(c) }, { mob: 'skeleton', at: V(10.5, 65, -1.5), face: V(0.5, 65, 0.8), tag: 'intr' })
  assert.strictEqual(cmds.length, 1)
  const c = cmds[0]
  assert.match(c, /^\/summon skeleton 10\.50 65\.00 -1\.50 \{NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:\["intr","warm"\]/)
  assert.match(c, /mainhand:\{id:"minecraft:bow"/)
  assert.match(c, /head:\{id:"minecraft:iron_helmet"/)
  // facing the player to the west-south-west: Minecraft yaw ~77 (0 = south, 90 = west)
  const yaw = Number(/Rotation:\[(-?[\d.]+)f/.exec(c)[1])
  assert.ok(Math.abs(yaw - 77.0) < 1, `yaw ${yaw}`)
  assert.ok(MOBS.creeper && MOBS.zombie && MOBS.phantom, 'the next interrupters are there')
})
