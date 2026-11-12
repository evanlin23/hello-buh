// lib/sandart.js's opt-in blast (S.blast, r:r4607fa: "the giant TNT picture explodes on the last beat"): the charges
// cover the picture, go off in a wave out from the middle, and a picture without S.blast is unchanged.
const test = require('node:test')
const assert = require('node:assert')
const SA = require('../../sandart')

const art = ['RRRR', 'WKKW', 'RRRR']
const S = { name: 't', art, palette: { R: 'red_concrete_powder', W: 'white_concrete_powder', K: 'black_concrete_powder' }, scale: 7, blast: { spacing: 5, delay: 16, wave: 16 } }

test('the charges cover the picture and go off from the middle out', () => {
  const P = SA.plan(S)
  const b = SA.blastPlan(S, P)
  assert.ok(b.length >= Math.floor(P.W / 5) * Math.floor(P.D / 5))
  for (const c of b) {
    assert.ok(c.x >= P.x0 && c.x < P.x0 + P.W && c.z >= P.z0 && c.z < P.z0 + P.D, 'a charge off the picture')
    assert.ok(c.at >= 16 && c.at <= 32)
  }
  for (let i = 1; i < b.length; i++) assert.ok(b[i].at >= b[i - 1].at)
  assert.ok(b[0].d <= b[b.length - 1].d)
})

test('the blast is opt-in: the edit and the drone are unchanged without it', () => {
  const plain = SA.makeSandArt({ ...S, blast: undefined })
  const lit = SA.makeSandArt(S)
  assert.strictEqual(plain.edit.endAfter, 'settle:0.6')
  assert.ok(lit.shots.pour.path.length > plain.shots.pour.path.length)
})
