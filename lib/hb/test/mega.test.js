// Mega builds (lib/mega.js, format "mega", r:r8bb1e3): the fill plans make exactly the structure, fit vanilla's /fill
// limit, and stay cheap enough to place in seconds.
const test = require('node:test')
const assert = require('node:assert')
const mega = require('../../mega')

const vol = (b) => (b[3] - b[0] + 1) * (b[4] - b[1] + 1) * (b[5] - b[2] + 1)

test('a level-3 Menger sponge from the plan is exactly the sponge (8000 blocks, no two 1-digits anywhere)', () => {
  const s = mega.menger(3, {})
  const c = mega.count(s), N = 27
  assert.strictEqual(c.solid, 8000)
  for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) for (let z = 0; z < N; z++) {
    assert.strictEqual(!!c.grid[(x * N + y) * N + z], mega.solidAt([x, y, z], 3), `cell ${x} ${y} ${z}`)
  }
})

test('glow edges never add blocks to the holes, and the core fills only the hollow middle', () => {
  const s = mega.menger(4, { edges: 'sea_lantern', core: 'ochre_froglight' })
  const c = mega.count(s)
  assert.strictEqual(c.by.deepslate_tiles + c.by.sea_lantern, 160000)
  assert.strictEqual(c.by.ochre_froglight, 400)   // a level-2 sponge
  assert.deepStrictEqual(s.core, { min: 36, side: 9, hole: 3 })
  // the core's own hole along x (y, z 39..41) is open, so a flight along the middle line threads it
  const N = 81
  for (let x = 0; x < N; x++) assert.strictEqual(c.grid[(x * N + 40) * N + 40], 0, `x ${x} on the middle line`)
})

test('every box fits /fill (32768 blocks) and a level-4 sponge is under 3000 commands', () => {
  const s = mega.menger(4, { edges: 'sea_lantern', core: 'ochre_froglight' })
  for (const p of s.plan) assert.ok(vol(p.box) <= mega.FILL_MAX, p.box.join(' '))
  assert.ok(s.plan.length < 3000, `${s.plan.length} commands`)
  assert.match(mega.commands(s, { x: 10, y: 64, z: -5 })[0], /^\/fill 10 64 -5 /)
})

test('the other generators make plans inside their bounds', () => {
  for (const s of [mega.sierpinskiTetra(4, {}, 2), mega.rings(4)]) {
    assert.ok(s.plan.length > 0)
    for (const { box: b } of s.plan) for (let a = 0; a < 3; a++) assert.ok(b[a] >= 0 && b[a + 3] < s.size[a], `${s.name} ${b}`)
  }
})
