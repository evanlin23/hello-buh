// Mob poses and held items (docs/engine_features.md "Mob poses and held items"): the bow's pull, the evoker's spell
// (ids, colours, where its particles start, the particle itself), the recorded runs, the piglin_loved tag.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const MP = require('../../mob_poses')
const particles = require('../../../renderer/particles')
const ROOT = path.join(__dirname, '..', '..', '..')

test('bow pull: items/bow.json thresholds (use_duration x 0.05: 0.65, 0.9)', () => {
  assert.deepStrictEqual([0, 5, 12, 13, 17, 18, 40].map(MP.bowPull), [0, 0, 0, 1, 1, 2, 2])
  assert.strictEqual(MP.bowPull(-3), 0)
  assert.ok(MP.SKELETON_BOW.test('stray') && MP.SKELETON_BOW.test('bogged') && !MP.SKELETON_BOW.test('wither_skeleton'))
})

test('spells: names and ids, IllagerSpell colours, the 60-tick cast', () => {
  assert.strictEqual(MP.spellId('wololo'), 3)
  assert.strictEqual(MP.spellId(3), 3)
  assert.strictEqual(MP.spellId('fangs'), 2)
  assert.strictEqual(MP.spellId('nope'), null)
  assert.strictEqual(MP.spellId(9), null)
  assert.deepStrictEqual(MP.SPELL_COLORS[3], [0.7, 0.5, 0.2])
  assert.strictEqual(MP.CAST_TICKS - MP.CAST_WARMUP, 20)   // the arms drop 1 s after the sheep turns
})

test('spell particles start at the hands: 1.8 up, 0.6 either side across the body', () => {
  // mineflayer yaw 0 faces north (-z): the hands are east and west of the body, swung by cos(age 0.6662) x 0.25
  const age = Math.PI / 2 / 0.6662   // cos = 0: no swing
  const [a, b] = MP.spellHands(10, 64, 20, 0, age)
  for (const p of [a, b]) { assert.ok(Math.abs(p[1] - 65.8) < 1e-9); assert.ok(Math.abs(Math.hypot(p[0] - 10, p[2] - 20) - 0.6) < 1e-9) }
  assert.ok(Math.abs(a[2] - 20) < 1e-9 && Math.abs(Math.abs(a[0] - 10) - 0.6) < 1e-9)
  assert.ok(Math.abs((a[0] + b[0]) / 2 - 10) < 1e-9)
})

test('the spell particle: SpellParticle (rising, effect_7 -> effect_0, 8-40 ticks, the colour given)', () => {
  let rise = 0
  for (let k = 0; k < 20; k++) {
    const [p] = particles.spawn({ type: 'spell', t: 1000 + k * 50, x: 0.3 * k, y: 70, z: -2, color: [0.7, 0.5, 0.2] })
    assert.ok(p.vy > -0.02 && p.vy < 0.06, 'starts nearly at rest (a kick of at most 0.18 x 0.2 about +0.02)')
    assert.ok(Math.abs(p.vx) <= 0.018 && Math.abs(p.vz) <= 0.018, 'barely drifts sideways')
    assert.ok(p.life >= 8 && p.life <= 40)
    assert.deepStrictEqual(p.anim, ['particle/effect_', 8, 'rev'])
    assert.deepStrictEqual(p.color, [0.7, 0.5, 0.2])
    const s0 = particles.state(p, p.t0 + 0.01), s1 = particles.state(p, p.t0 + p.life - 0.5)
    assert.strictEqual(s0.tex, 'particle/effect_7'); assert.strictEqual(s1.tex, 'particle/effect_0')
    rise += s1.y - s0.y
  }
  assert.ok(rise > 0, 'rises (gravity -0.1)')
})

test('recorded runs: consecutive samples join, a gap starts a new run', () => {
  const row = (t, id, x) => [t, id, 'evoker', 0, 0, 0, 0, 0, 0, x]
  const rows = [row(5, 1, { spell: 3 }), row(6, 1, { spell: 3 }), row(7, 1, null), row(9, 1, { spell: 3 }), row(6, 2, { spell: 1 })]
  const M = MP.recordedRuns(rows, (x) => !!x.spell)
  assert.deepStrictEqual(M.get(1), [[5, 6], [9, 9]])
  assert.deepStrictEqual(M.get(2), [[6, 6]])
  assert.strictEqual(MP.runStart(M, 1, 6.5), 5)
  assert.strictEqual(MP.runStart(M, 1, 8.5), null)
  assert.strictEqual(MP.runStart(M, 1, 9.3), 9)
})

const JAR = (() => { try { const v = /MC_VERSION=(\S+)/.exec(fs.readFileSync(path.join(ROOT, 'versions.env'), 'utf8'))[1]; const j = path.join(ROOT, 'work', 'client', v + '.jar'); return fs.existsSync(j) ? j : null } catch (e) { return null } })()
test('piglin_loved: the tag from the jar, #gold_ores expanded', { skip: !JAR && 'no client jar' }, () => {
  const tag = (n) => JSON.parse(cp.execFileSync('unzip', ['-p', JAR, `data/minecraft/tags/item/${n}.json`]).toString()).values
  const items = tag('piglin_loved').flatMap(v => v.startsWith('#') ? tag(v.slice(11)) : [v]).map(v => v.replace(/^minecraft:/, ''))
  assert.ok(items.length > 20)
  for (const it of items) assert.ok(MP.PIGLIN_LOVED.test(it), it)
  for (const it of ['gold_nugget', 'golden_rail', 'iron_ingot', 'diamond']) assert.ok(!MP.PIGLIN_LOVED.test(it), it)
})
