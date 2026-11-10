// Invisible cuts (owner, 2026-11-10: "i keep noticing them"; STANDARDS 3b.3, docs/cinematic.md "Invisible cuts"):
// the eye-trace geometry render.js re-aims camera shots with (lib/eyetrace.js), the cut check (lib/hb/cuts.js) and
// K.line ending a line so the next cut lands just before the next word (lib/story.js beatTicks).
const test = require('node:test')
const assert = require('node:assert')
const ET = require('../../eyetrace')
const C = require('../cuts')
const { linesFrom, beatTicks } = require('../../story')

const g = ET.geom({ W: 1080, H: 1011, MW: 1797 })
const cam = { x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0, fov: 50 }   // looking north (-z)

test('project: the aim is the middle of the delivered crop; a cropX shift moves it', () => {
  const p = ET.project(cam, { x: 0, y: 1.6, z: -5 }, g)
  assert.ok(Math.abs(p.x - 0.5) < 1e-9 && Math.abs(p.y - 0.5) < 1e-9)
  const right = ET.project(cam, { x: 1, y: 1.6, z: -5 }, g)
  assert.ok(right.x > 0.5)
  const shifted = ET.project(cam, { x: 0, y: 1.6, z: -5 }, ET.geom({ W: 1080, H: 1011, MW: 1797, cropX: 0.5 }))
  assert.ok(shifted.x < 0.5)   // the crop moved right: the centre of the master sits left in it
})

test('aimOffset puts the subject on the target spot', () => {
  const pt = { x: 0.8, y: 1.9, z: -6 }
  const target = { x: 0.45, y: 0.45 }
  const o = ET.aimOffset(cam, g, pt, target)
  const p = ET.project({ ...cam, yaw: cam.yaw + o.dyaw, pitch: cam.pitch + o.dpitch }, pt, g)
  assert.ok(Math.abs(p.x - target.x) < 0.005 && Math.abs(p.y - target.y) < 0.005, JSON.stringify(p))
  const capped = ET.aimOffset(cam, g, pt, { x: 0.0, y: 0.5 }, 5)
  assert.ok(Math.abs(capped.dyaw) <= 5 * Math.PI / 180 + 1e-9)
})

test('attention: a big body near the middle beats a speck and the aim; the named subject wins', () => {
  const ents = [
    { id: 1, type: 'wolf', x: -0.5, y: 0.9, z: -3, h: 0.85 },      // close, a bit left, on a block at eye height
    { id: 2, type: 'villager', x: 3, y: 0, z: -40, h: 1.95 },      // far: a speck
    { id: 3, type: 'item', x: 0, y: 1.6, z: -2, h: 0.25 }          // not cast
  ]
  let a = ET.attention(cam, g, { entities: ents })
  assert.strictEqual(a.label, 'wolf')
  a = ET.attention(cam, g, { entities: [ents[1]] })
  assert.strictEqual(a.kind, 'aim')
  const pip = { id: 4, type: 'villager', baby: true, x: 1.6, y: 0.7, z: -4, h: 1.95 }
  a = ET.attention(cam, g, { entities: [ents[0], pip], subject: ET.subjectOf({ subject: ['entity:villager'] }, { x: 0, y: 0, z: 0 }) })
  assert.strictEqual(a.id, 4)
})

test('the cut check: eye jump in % of the frame, cut timing against the words', () => {
  // two camera shots: A looks at a wolf in the middle, B has it far left (the eye jumps); the cut is at tick 40
  const wolf = { id: 1, type: 'wolf', label: 'wolf', x: 0, y: 0, z: -2, h: 0.85 }
  const camA = { known: true, mode: 'shot a', x: 0, y: 0.7, z: 0, yaw: 0, pitch: 0, fov: 50 }
  const camB = { known: true, mode: 'shot b', x: 0, y: 0.7, z: 0, yaw: -0.25, pitch: 0, fov: 50 }
  const probe = new Map()
  for (let t = 0; t < 80; t++) probe.set(t, t < 40 ? camA : camB)
  const tl = [{ t: 0, event: 'start' }, { t: 0, event: 'line', id: 'L01' }, { t: 2000, event: 'line', id: 'L02' }, { t: 4000, event: 'end_scene' }]
  const scene = {
    probe, tl, stunt: {}, rec: { set: { x: 0, y: 0, z: 0 } }, shots: { a: {}, b: {} }, ENT: new Map(),
    worldAt () {}, cameraAt: (t) => probe.get(Math.floor(t)), shotAt: (t) => ({ name: t < 40 ? 'a' : 'b', spec: {} }),
    entities: () => [wolf], pose: () => ({ x: 0, feetY: -20, z: 0 }), occluder: () => null, target: () => null
  }
  // L02's voice starts at 2.0 s (tick 40); its first word at +0.03 s: the cut is 30 ms ahead of it (fine)
  const story = { vo: { lines: { L01: { dur: 1.5, chunks: [[0.1, 1.4]] }, L02: { dur: 1.5, chunks: [[0.03, 1.2]] } } }, dir: '/nonexistent' }
  const r = C.run(scene, { story })
  assert.strictEqual(r.rows.length, 1)
  const row = r.rows[0]
  assert.ok(row.dist > C.EYE_WARN, `jump ${row.dist}`)
  assert.ok(Math.abs(row.timing.lead - 0.03) < 1e-6)
  assert.strictEqual(row.lineDrift, 0)
  assert.ok(r.findings.some(f => /a jump of/.test(f.msg)))
  assert.ok(!r.findings.some(f => /after .* starts/.test(f.msg)))
  // the same cut 4 ticks late: the word started 170 ms before the picture changed
  const late = { ...scene, tl: tl.map(e => e.id === 'L02' ? { ...e, t: 1800 } : e) }
  const r2 = C.run(late, { story })
  assert.ok(r2.findings.some(f => /170 ms after "chunk 0" starts/.test(f.msg)), r2.findings.map(f => f.msg).join('\n'))
})

test('K.line timing: an inner line ends so the next cut shows just before the next word, never before its own last word', () => {
  const voice = {
    beats: { L01: { lines: ['L01', 'L02'] } },
    lines: {
      L01: { dur: 1.5, end: 1.3, chunks: [[0.1, 1.3]], beat: 'L01', offset: 0, gap: 0 },
      L02: { dur: 1.2, onset: 0.04, chunks: [[0.04, 1.0]], beat: 'L01', offset: 1.5 }
    }
  }
  const S = linesFrom(voice, { lines: [{ id: 'L01' }, { id: 'L02' }] })
  assert.deepStrictEqual(S.line('L01').next, { offset: 1.5, onset: 0.04 })
  assert.strictEqual(beatTicks(S.line('L01'), 0, null).ticks, 30)   // no option: on the take's offset, as before
  // a K.cut that takes 3 ticks to land: end 3 ticks before floor((1.54 - 0.033) * 20) = 30 -> 27
  assert.strictEqual(beatTicks(S.line('L01'), 0, null, 0, { cut: { lead: 0.033, lat: 3 } }).ticks, 27)
  // never inside the line's own last word (+30 ms): 1.33 s -> tick 27 at the earliest
  assert.strictEqual(beatTicks(S.line('L01'), 0, null, 0, { cut: { lead: 0.033, lat: 9 } }).ticks, 27)
})
