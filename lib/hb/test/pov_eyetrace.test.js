// First-person cuts are eye-traced by construction (render.js eyeTraceOffset via lib/eyetrace.js traced/weight): a
// first-person shot right after a camera shot is turned so what the eye lands on sits where the camera shot's subject
// was, then eased back; `eyeTrace: false` (a shot spec, or K.shot/K.cut's option, marked on the shot) opts out, and
// ./hb cuts then never BLOCKs that jump.
const test = require('node:test')
const assert = require('node:assert')
const ET = require('../../eyetrace')
const C = require('../cuts')

test('traced: camera shots always, first person only after a camera shot, never when opted out', () => {
  assert.strictEqual(ET.traced({ name: 'a' }, null), true)
  assert.strictEqual(ET.traced({ name: 'pov', pov: true }, { name: 'a' }), true)            // camera -> first person
  assert.strictEqual(ET.traced({ name: 'pov', pov: true }, { name: 'pov', pov: true }), false)   // the player's own turn
  assert.strictEqual(ET.traced({ name: 'pov', pov: true }, null), false)
  assert.strictEqual(ET.traced({ name: 'pov', pov: true, eyeTrace: false }, { name: 'a' }), false)
  assert.strictEqual(ET.traced({ name: 'a' }, null, false), false)                           // EYETRACE=0 / stunt off
})

test('weight: held for 0.5 s, eased out to none at 2 s, overridable', () => {
  assert.strictEqual(ET.weight(true, 0), 1)
  assert.strictEqual(ET.weight(true, 0.5), 1)
  assert.ok(ET.weight(true, 1.25) > 0.4 && ET.weight(true, 1.25) < 0.6)
  assert.strictEqual(ET.weight(true, 2.0), 0)
  assert.strictEqual(ET.weight({ hold: 1, settle: 3 }, 1), 1)
})

// a camera shot sees the wolf left of centre; the cut goes back into first person looking straight past it
function scene (povYaw, marks = [], camYaw = 0) {
  const wolf = { id: 1, type: 'wolf', label: 'wolf', x: -1.2, y: 0, z: -4, h: 0.85 }
  const camA = { known: true, mode: 'shot a', x: 0, y: 0.7, z: 0, yaw: camYaw, pitch: 0, fov: 50 }
  const pov = { known: true, mode: 'shot pov (pov)', x: 0, y: 1.62, z: 0.5, yaw: povYaw, pitch: 0, fov: 70 }
  const probe = new Map()
  for (let t = 0; t < 80; t++) probe.set(t, t < 40 ? camA : pov)
  const tl = [{ t: 0, event: 'start' }, ...marks, { t: 4000, event: 'end_scene' }]
  return {
    probe, tl, stunt: {}, rec: { set: { x: 0, y: 0, z: 0 } }, shots: { a: { subject: ['entity:wolf'] }, pov: { pov: true } }, ENT: new Map(),
    worldAt () {}, cameraAt: (t) => probe.get(Math.floor(t)), shotAt: (t) => (t < 40 ? { name: 'a', spec: { subject: ['entity:wolf'] } } : { name: 'pov', spec: { pov: true } }),
    entities: () => [wolf], pose: () => ({ x: 0, feetY: -20, z: 0 }), occluder: () => null, target: () => null
  }
}

test('a first-person cut after a camera shot: untraced it jumps; turned by aimOffset (as render.js does) it lands', () => {
  const plain = C.run(scene(0.5, [], 0.25))   // first person sees the wolf off to the right: the eye jumps
  assert.strictEqual(plain.rows.length, 1)
  assert.ok(plain.rows[0].dist > C.EYE_WARN, `untraced jump ${plain.rows[0].dist}`)
  // what render.js does at the cut: the first-person view turned so its point of attention lands on the camera shot's
  const g = ET.geom({ W: 1080, H: 1011 })
  const s = scene(0.5, [], 0.25), A = s.probe.get(39), B = s.probe.get(40)
  const was = ET.attention(A, g, { entities: s.entities(), subject: ET.subjectOf(s.shots.a, s.rec.set) })
  const now = ET.attention(B, g, { entities: s.entities(), subject: ET.subjectOf(s.shots.a, s.rec.set) })   // the carried subject
  const o = ET.aimOffset(B, g, now.point, ET.clampBox(was))
  const traced = C.run(scene(0.5 + o.dyaw, [], 0.25))
  assert.ok(traced.rows[0].dist <= 0.15 && traced.rows[0].dist < plain.rows[0].dist, `traced ${traced.rows[0].dist} vs ${plain.rows[0].dist}`)   // within the fine 15 %
})

test('a first-person jump over 33 % BLOCKs, unless the cut opted out with eyeTrace: false on its shot mark', () => {
  const big = C.run(scene(0.45))
  const jump = big.findings.find(f => /a jump of/.test(f.msg))
  assert.ok(big.rows[0].dist > C.EYE_BLOCK, `jump ${big.rows[0].dist}`)
  assert.strictEqual(jump.level, 'BLOCK')
  const opted = C.run(scene(0.45, [{ t: 2000, event: 'shot', name: 'pov', eyeTrace: false }]))
  assert.strictEqual(opted.findings.find(f => /a jump of/.test(f.msg)).level, 'WARN')
})
