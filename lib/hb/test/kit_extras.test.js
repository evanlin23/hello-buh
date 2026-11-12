// Story-kit extras (lib/kit_extras.js): the scale attribute, staged scale marks, display entities, props, trails, and
// the kit verbs on a fake ctx (docs/engine_features.md "Entity scale, skin swaps, trails, block changes, head turns,
// display props")
const test = require('node:test')
const assert = require('node:assert')
const KX = require('../../kit_extras')
const P = require('../../../renderer/particles')
const M = require('../../movie')

const near = (a, b, e = 1e-4) => Math.abs(a - b) < e

test('attrScale: base, modifiers, clamp, absent = 1', () => {
  assert.strictEqual(KX.attrScale(null), 1)
  assert.strictEqual(KX.attrScale({ 'minecraft:max_health': { value: 20 } }), 1)
  assert.strictEqual(KX.attrScale({ 'minecraft:scale': { value: 0.3, modifiers: [] } }), 0.3)
  assert.strictEqual(KX.attrScale({ scale: { value: 1, modifiers: [{ amount: 0.5, operation: 0 }] } }), 1.5)
  assert.strictEqual(KX.attrScale({ scale: { value: 2, modifiers: [{ amount: -0.5, operation: 1 }, { amount: 1, operation: 2 }] } }), 2)
  assert.strictEqual(KX.attrScale({ scale: { value: 100 } }), 16)
  assert.strictEqual(KX.attrScale({ scale: { value: 0.001 } }), 0.0625)
})

test('scaleRuns / scaleAt: eased change, instant jumps, nothing before the first mark', () => {
  const runs = KX.scaleRuns([
    { event: 'scale', t: 100, user: 'Aunt', scale: 0.3 },
    { event: 'scale', t: 1000, user: 'Aunt', scale: 0.286, ticks: 5 },
    { event: 'scale', t: 2000, user: 'Aunt', scale: 1.22 },
    { event: 'scale', t: 500, tag: 'kid', scale: 0.986, ticks: 5 },
    { event: 'other', t: 0 }
  ])
  const a = runs.get('user:Aunt')
  assert.strictEqual(KX.scaleAt(a, 1), undefined)
  assert.strictEqual(KX.scaleAt(a, 2), 0.3)
  assert.strictEqual(KX.scaleAt(a, 20), 0.3)
  assert.ok(near(KX.scaleAt(a, 22.5), 0.293))   // halfway through the smoothstep
  assert.strictEqual(KX.scaleAt(a, 25), 0.286)
  assert.strictEqual(KX.scaleAt(a, 40), 1.22)   // ticks 0: at once
  const k = runs.get('tag:kid')
  assert.ok(near(KX.scaleAt(k, 10), 1) && near(KX.scaleAt(k, 15), 0.986))   // eased from the unscaled 1
})

test('displayData: block and item displays, defaults left out, air = nothing', () => {
  const reg = { items: { 5: { name: 'emerald' }, 0: { name: 'air' } } }
  assert.strictEqual(KX.displayData({ name: 'block_display', metadata: [] }, reg), null)
  const b = KX.displayData({ name: 'block_display', metadata: Object.assign([], { 11: { x: -0.2, y: 0, z: -0.2 }, 12: { x: 0.36, y: 0.54, z: 0.04 }, 13: { x: 0, y: 0, z: 0, w: 1 }, 23: 1234 }) }, reg)
  assert.deepStrictEqual(b, { state: 1234, t: [-0.2, 0, -0.2], s: [0.36, 0.54, 0.04] })
  const i = KX.displayData({ name: 'item_display', metadata: Object.assign([], { 13: { x: 0.5, y: 0, z: 0, w: 0.8660254 }, 23: { itemId: 5, itemCount: 1 }, 24: 8 }) }, reg)
  assert.deepStrictEqual(i, { item: 'emerald', ctx: 'fixed', l: [0.5, 0, 0, 0.86603] })
  assert.strictEqual(KX.displayData({ name: 'item_display', metadata: Object.assign([], { 23: { itemId: 0, itemCount: 1 } }) }, reg), null)
})

test('displayMatrix: T L S R, under the entity orientation', () => {
  const m = KX.displayMatrix({ t: [1, 2, 3], s: [2, 2, 2] })   // yaw PI = java 0: no turn
  assert.deepStrictEqual(m.map(v => +v.toFixed(6) + 0), [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 1, 2, 3, 1])
  // a quarter turn about y (java yaw 90 -> Ry(-90)): +x goes to +z
  const r = KX.displayMatrix({}, Math.PI - Math.PI / 2, 0)
  assert.ok(near(r[0], 0) && near(r[2], 1))
  // a left rotation (quatYXZ) does the same as the matrix it encodes
  const q = KX.displayMatrix({ l: KX.quatYXZ(0, -90, 0) })
  assert.ok(near(q[0], 0) && near(q[2], 1))
})

test('props: mug as tall as asked, cards and heap as items/blocks, turned props keep their centre', () => {
  const mug = KX.propCommands('mug', 10, 64, 20, { h: 0.54, tag: 'mug' })
  assert.ok(mug.length >= 8 && mug.every(c => c.startsWith('/summon block_display 10.0000 64.0000 20.0000')))
  assert.ok(mug.some(c => c.includes('scale:[0.3600f,0.5400f,0.0450f]')) && mug[0].includes('"mug"') && mug[0].includes('"prop"'))
  const heap = KX.propCommands('heap', 0, 0, 0, { h: 0.7 })
  assert.ok(heap.length > 10 && heap.every(c => c.includes('minecraft:emerald') && c.startsWith('/summon item_display')))
  const cards = KX.propCommands('cards', 0, 0, 0, { n: 4 })
  assert.strictEqual(cards.length, 8)
  assert.throws(() => KX.propCommands('nope', 0, 0, 0), /no prop 'nope'/)
  // a box at x 1..1.2, z 0..0.4 turned 90: centre (1.1, 0.2) -> (-0.2, 1.1)
  const c = KX.propCommands([['b', 'stone', [1, 0, 0], [0.2, 0.1, 0.4]]], 0, 0, 0, { yaw: 90 })[0]
  const tr = /translation:\[([^\]]+)\]/.exec(c)[1].split(',').map(parseFloat), lq = /left_rotation:\[([^\]]+)\]/.exec(c)[1].split(',').map(parseFloat)
  const m = KX.displayMatrix({ t: tr, l: lq, s: [0.2, 0.1, 0.4] })
  const ctr = [0.5, 0.5, 0.5].map((_, i) => m[i] * 0.5 + m[4 + i] * 0.5 + m[8 + i] * 0.5 + m[12 + i])
  assert.ok(near(ctr[0], -0.2, 1e-3) && near(ctr[2], 1.1, 1e-3), JSON.stringify(ctr))
})

test('trail particles: straight line, on the target at life - 1, full bright, a stream over ticks', () => {
  const ps = P.spawn({ type: 'trail', t: 1000, x: 0, y: 0, z: 0, tx: 10, ty: 0, tz: 0, dur: 11, count: 2, ticks: 3, color: [0.5, 0.5, 0.5], spread: 0 })
  assert.strictEqual(ps.length, 6)
  assert.deepStrictEqual([...new Set(ps.map(p => p.t0))], [20, 21, 22])
  const p = ps[0]
  assert.ok(p.bright && p.size === 0.26 && p.tex === 'particle/generic_0')
  assert.ok(near(P.state(p, 25).x, 5) && near(P.state(p, 30).x, 10))
  assert.strictEqual(P.state(p, 31), null)
  assert.ok(p.color.every(v => v >= 0.5 * 0.875 - 1e-9 && v <= 0.5 * 1.125 + 1e-9))
  assert.match(KX.trailCommand([0, 1, 0], [1, 2, 3], { color: [1, 0, 0], dur: 30 }), /^\/particle minecraft:trail\{target:\[1\.000d,2\.000d,3\.000d\],color:16711680,duration:30\} 0\.000 1\.000 0\.000 /)
})

test('kit verbs on a fake ctx: scale, skin, trail, setBlocks, prop', () => {
  const marks = [], said = []
  const ctx = { mark: (e, d) => marks.push({ event: e, ...d }) }
  const K = { say: (s) => said.push(s), actors: new Map([['kid', {}]]) }
  const kx = KX.kit(ctx, K, { X: 100, Z: 200, F: 60 })
  kx.scale('Aunt', 0.286, { secs: 0.25 })
  kx.scale('kid', 0.986)
  kx.scale('self', 0.5)
  assert.deepStrictEqual(said.slice(0, 3), ['/attribute Aunt minecraft:scale base set 0.286', '/attribute @e[tag=kid,limit=1] minecraft:scale base set 0.986', '/attribute @s minecraft:scale base set 0.5'])
  assert.deepStrictEqual(marks.slice(0, 3), [{ event: 'scale', user: 'Aunt', scale: 0.286, ticks: 5 }, { event: 'scale', tag: 'kid', scale: 0.986, ticks: 0 }, { event: 'scale', ids: [-1], scale: 0.5, ticks: 0 }])
  kx.skin('Mom', 'statue_mom_1')
  assert.deepStrictEqual(marks[3], { event: 'cast_skin', user: 'Mom', skin: 'statue_mom_1' })
  kx.trail([0, 2, 0], [0, 5, -3], { secs: 0.5 })
  assert.strictEqual(marks[4].type, 'trail'); assert.strictEqual(marks[4].ticks, 10); assert.strictEqual(marks[4].ty, 65)
  kx.setBlocks([1, 4, -3], [5, 4, -3], 'calcite')
  assert.strictEqual(said[said.length - 1], '/fill 101 64 197 105 64 197 calcite')
  const n = said.length; kx.prop('mug', [0, 1, 0]); assert.ok(said.length - n >= 8)
})

test('M.headTo is the renderer-side look_at (say\'s own helper no longer shadows it), with an ease', () => {
  const marks = []
  const ctx = { mark: (e, d) => marks.push({ event: e, ...d }) }
  M.headTo(ctx, 7, [1, 2, 3], { secs: 0.8 })
  M.headTo(ctx, 8, 'Mom')
  assert.deepStrictEqual(marks, [{ event: 'look_at', ids: [7], at: [1, 2, 3], ticks: 16 }, { event: 'look_at', ids: [8], at: 'Mom' }])
})
