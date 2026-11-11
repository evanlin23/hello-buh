// The opening shot (owner 2026-11-11 on Good Boy's voiced preview: "The opening scene is not very exciting? Also not
// centered."): ./hb owner's `opening` check (lib/hb/owner.js openingVerdict / openingSubject), run in ./hb check.
// Numbers from the five held stories' recordings (2026-11-11): Good Boy v7 wolf 25% across (BLOCK), Gold's Grandma 17%
// (BLOCK), Dog Hill's dog 5% -> 12% in a drone swoop (WARN), 31 Raids' Grandpa 50% / 46% tall, Light Sleeper's point 51%.
const test = require('node:test')
const assert = require('node:assert')
const { openingVerdict, openingSubject, OPEN } = require('../owner')

const SUB = { sb: { what: 'dog', entity: /^wolf$/ }, src: 'shots.open.subject' }
// n samples over the first 1.5 s: the subject at screen-x x(u), height frac(u), u = 0..1; the camera moving cam blocks/s
function rows ({ x = () => 0.5, frac = () => 0.4, cam = 0, inF = () => true, hidden = () => false, n = 31, pov = false, ents = () => [], subMove = 0 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1), out = u * OPEN.span
    return { t: 30 + i, out, pov, cam: { x: cam * out, y: 70, z: 0, yaw: 0, pitch: 0, fov: 70 }, x: x(u), y: 0.45, frac: frac(u), inF: inF(u), hidden: hidden(u), label: 'wolf #1', at: { x: subMove * out, y: 70.4, z: 5 }, ents: ents(out) }
  })
}
const levels = (v) => v.findings.map(f => f.level)

test('opening: the subject at the left edge (Good Boy v7, the wolf 25% across) BLOCKs with x, height and motion in the message', () => {
  const v = openingVerdict(rows({ x: () => 0.25, frac: () => 0.44 }), { subject: SUB })
  const b = v.findings.find(f => f.level === 'BLOCK')
  assert.ok(b, JSON.stringify(v.findings))
  assert.match(b.msg, /off centre toward the left edge/)
  assert.match(b.msg, /25% across/)
  assert.match(b.msg, /44% of the frame height/)
  assert.match(b.msg, /camera [\d.]+ blocks\/s/)
  assert.match(b.msg, /not centered/)
  assert.strictEqual(v.stats.x, 0.25)
})

test('opening: centred, big and the subject moving is OK (a NOTE with the numbers, no WARN)', () => {
  const v = openingVerdict(rows({ x: () => 0.5, frac: () => 0.46, subMove: 3 }), { subject: SUB })
  assert.deepStrictEqual(levels(v), ['NOTE'])
  assert.match(v.findings[0].msg, /opening OK/)
})

test('opening: right edge blocks too; the middle third is the line', () => {
  assert.ok(levels(openingVerdict(rows({ x: () => 0.72, subMove: 3 }), { subject: SUB })).includes('BLOCK'))
  assert.ok(!levels(openingVerdict(rows({ x: () => 0.36, subMove: 3 }), { subject: SUB })).includes('BLOCK'))
})

test('opening: a subject never readable at phone size BLOCKs; a swoop that brings it up from a speck WARNs (Dog Hill)', () => {
  const tiny = openingVerdict(rows({ frac: () => 0.04, cam: 2.4 }), { subject: SUB })
  assert.ok(tiny.findings.some(f => f.level === 'BLOCK' && /too small to read at phone size/.test(f.msg)), JSON.stringify(tiny.findings))
  const swoop = openingVerdict(rows({ frac: (u) => 0.046 + 0.074 * u, cam: 2.4 }), { subject: SUB })
  assert.deepStrictEqual(levels(swoop), ['WARN'])
  assert.match(swoop.findings[0].msg, /speck on frame 1/)
})

test('opening: not on screen on frame 1 BLOCKs (out of frame, hidden, or no such entity)', () => {
  const late = openingVerdict(rows({ inF: (u) => u > 0.3, subMove: 3 }), { subject: SUB })
  assert.ok(late.findings.some(f => f.level === 'BLOCK' && /not on screen from frame 1/.test(f.msg)))
  const hid = openingVerdict(rows({ hidden: (u) => u < 0.1, subMove: 3 }), { subject: SUB })
  assert.ok(hid.findings.some(f => f.level === 'BLOCK'))
  const none = openingVerdict(rows({ subMove: 3 }).map(r => ({ ...r, none: true, inF: false })), { subject: SUB })
  assert.ok(none.findings.some(f => f.level === 'BLOCK' && /not in the scene/.test(f.msg)))
})

test('opening: nothing moving in the first 0.5 s WARNs; a camera push, a moving cast member or an action is motion', () => {
  const still = openingVerdict(rows(), { subject: SUB })
  assert.ok(still.findings.some(f => f.level === 'WARN' && /static opening/.test(f.msg)), JSON.stringify(still.findings))
  assert.ok(!openingVerdict(rows({ cam: 1.5 }), { subject: SUB }).findings.some(f => /static/.test(f.msg)))
  assert.ok(!openingVerdict(rows({ frac: (u) => 0.3 * Math.exp(u) }), { subject: SUB }).findings.some(f => /static/.test(f.msg)))   // a push in
  assert.ok(!openingVerdict(rows(), { subject: SUB, actions: 1 }).findings.some(f => /static/.test(f.msg)))   // 31 Raids: Grandpa's swing
  const runner = (out) => [{ id: 7, x: 5.6 * out, y: 70, z: 8 }]   // Good Boy: Buh sprinting away in frame
  assert.ok(!openingVerdict(rows({ ents: runner }), { subject: SUB }).findings.some(f => /static/.test(f.msg)))
  const tp = (out) => [{ id: 7, x: out > 0.2 ? 30 : 0, y: 70, z: 8 }]   // a teleport is not motion
  assert.ok(openingVerdict(rows({ ents: tp }), { subject: SUB }).findings.some(f => /static/.test(f.msg)))
})

test('opening: a point subject ([dx, dy, dz], Light Sleeper\'s crane) is judged on centre only', () => {
  const v = openingVerdict(rows({ frac: () => 0.02, cam: 1.5 }), { subject: { sb: { at: [0.5, 2.6, 0.5], what: '[0.5, 2.6, 0.5]', point: true }, src: 'shots.hook.subject' } })
  assert.deepStrictEqual(levels(v), ['NOTE'])
})

test('opening: a first-person opening that names nothing is a NOTE; a camera shot naming nothing WARNs', () => {
  assert.deepStrictEqual(levels(openingVerdict(rows({ pov: true, cam: 1 }), { subject: null })), ['NOTE'])
  assert.deepStrictEqual(levels(openingVerdict(rows({ cam: 1 }), { subject: null })), ['WARN'])
})

// a stub scene for openingSubject: the shot at the first frame, the camera mode
const scene = (spec, mode = 'shot s (at)') => ({ shotAt: () => spec ? { name: 'dog_start', spec } : null, cameraAt: () => ({ mode, known: true }), stunt: {}, rec: { set: { x: 0, y: 70, z: 0 } } })
const story = { st: { cast: {}, props: { portal: { at: [10, 1, 5], h: 3 } } } }
const L1 = (def) => [{ id: 'L01', text: def.text || '', def, chunks: (def.text || '').split('/').map(s => s.trim()) }]

test('opening subject: the camera shot\'s subject first (its first entry: "self" is the narrator, Good Boy\'s wolf)', () => {
  const p = openingSubject(scene({ subject: ['self', 'actor:Buh'] }), {}, story, L1({ text: 'My HUMAN' }), [], 30)
  assert.ok(p.sb.self)
  assert.strictEqual(p.src, 'shots.dog_start.subject')
  const a = openingSubject(scene({ subject: ['actor:gma'] }), {}, story, L1({ text: 'x' }), [], 30)
  assert.strictEqual(a.sb.actor, 'gma')
  const pt = openingSubject(scene({ subject: [[0.5, 2.6, 0.5]] }), {}, story, L1({ text: 'x' }), [], 30)
  assert.ok(pt.sb.point)
})

test('opening subject: else the story plan\'s subject, line 1\'s look, a key word, or the narrator seen from a camera', () => {
  const plan = openingSubject(scene(null, 'pov'), { shotPlanAt: () => ({ id: 'S01', subject: 'prop:portal' }) }, story, L1({ text: 'x' }), [], 30)
  assert.strictEqual(plan.src, 'story shots S01.subject')
  const look = openingSubject(scene(null, 'pov'), {}, story, L1({ text: 'THIRTY-ONE raids', look: { what: 'actor:Grandpa' } }), [], 30)
  assert.strictEqual(look.sb.actor, 'Grandpa')
  const word = openingSubject(scene(null, 'pov'), {}, story, L1({ text: 'The DOG / on the HILL' }), [], 30)
  assert.strictEqual(word.sb.what, 'dog')
  const self = openingSubject(scene({ at: [0, 1, 0] }), {}, story, L1({ text: 'My HUMAN / has TRIED' }), [], 30)
  assert.ok(self.sb.self)
  assert.strictEqual(openingSubject(scene(null, 'pov'), {}, story, L1({ text: 'My VILLAGE / is COVERED' }), [], 30), null)
})
