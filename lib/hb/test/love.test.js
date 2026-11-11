// Format "love" (lib/love.js, r:rf91fef): the edit every episode gets, the heart's cells, and the two engine fixes it
// needed (cherry leaves drawn untinted; a firework's flash a fading, swelling glow in its colour, not a white plate)
const test = require('node:test')
const assert = require('node:assert')
const love = require('../../love')
const particles = require('../../../renderer/particles')

test('a love Short opens mid-walk, ends 1.0 s after the light-up, and puts the drop, a dip, a flash and a punch on it', () => {
  const s = love.makeStunt({ name: 'love_t', caption: 'x' })
  const e = s.edit
  assert.strictEqual(e.startAt, 'go:0.45')
  assert.strictEqual(e.endAfter, 'payoff:1.0')
  assert.strictEqual(e.dropAt, 'payoff')
  assert.ok(e.sfx.some(x => x[0] === 'pop' && x[1] === 'go'), 'a sound on frame 1')
  assert.ok(e.sfx.some(x => x[0] === 'dip' && x[1] === 'payoff'))
  assert.ok(!e.sfx.some(x => x[0] === 'riser'), 'no riser over the dip')
  assert.deepStrictEqual(e.flash[0].slice(0, 1), ['payoff'])
  assert.strictEqual(s.biome, process.env.BIOME || 'minecraft:cherry_grove')
})

test('the heart is symmetric, its missing lamps are the bottom (the tip last row) and every one has a lamp row above it', () => {
  const { out, x0, x1 } = love.cells(love.HEART, 2)
  assert.strictEqual(x0, -x1)
  const key = (c) => `${c.x},${c.y}`
  const all = new Set(out.map(key))
  for (const c of out) assert.ok(all.has(`${-c.x},${c.y}`), `mirror of ${key(c)}`)
  const miss = out.filter(c => c.ch === 'o')
  assert.ok(miss.length >= 5)
  const lowest = Math.min(...out.map(c => c.y))
  assert.ok(miss.some(c => c.y === lowest && c.x === 0), 'the tip is missing')
  assert.ok(Math.max(...miss.map(c => c.y)) < Math.min(...out.filter(c => c.ch === '#').map(c => c.y)), 'the missing part is the bottom')
})

test('a firework flash is a translucent glow in the first colour that swells and fades over 4 ticks', () => {
  const ps = particles.spawn({ type: 'firework', t: 0, x: 0, y: 0, z: 0, explosions: [{ shape: 'small_ball', colors: [0xFF69B4] }] })
  const f = ps.find(p => p.flash)
  assert.ok(f, 'a flash')
  assert.deepStrictEqual(f.color.map(c => +c.toFixed(2)), [1, 0.41, 0.71])
  const s = [1.5, 2, 3, 3.9].map(a => particles.state(f, f.t0 + a))
  assert.ok(s[1].size > s[0].size && s[2].size > 12, 'swells to ~14 blocks')
  assert.ok(s[3].alpha < s[0].alpha && s[0].alpha <= 0.6, 'fades from 0.6')
  assert.strictEqual(particles.state(f, f.t0 + 0.5), null, 'nothing on its first tick')
})
