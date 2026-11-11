// Edit cuts inside one shot (lib/hb/owner.js editCutSnaps, the whip step of ./hb check; owner r:r38374d "the camera
// moves around so quickly ... confusing to follow"). hide_seek's review of 2026-11-11 found two speed cuts that join a
// pan going one way to a pan going the other: a snap. The fixture is hide_seek's recorded camera around its cuts.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { editCutSnaps, EDIT_CUT } = require('../owner')

const FX = require(path.join(__dirname, 'fixtures', 'hide_seek_cut_cams.json'))
const M = FX.marks
const T = (mark, s) => Math.round(M[mark] + s * 20)
const N = 1101

// a Short's clock over the recording: 1 s = 20 ticks, every [a, b] span cut to one frame
function clock (spans) {
  const out = new Array(N).fill(null)
  let t = 0
  for (let i = 0; i < N; i++) {
    out[i] = +t.toFixed(3)
    const inCut = spans.some(([a, b]) => i >= a && i < b)
    if (!inCut) t += 0.05
  }
  return (i) => (i < 0 || i >= N ? null : out[i])
}
const cam = (poses) => (i) => { const p = poses[i]; return p ? { x: p[0], y: p[1], z: p[2], yaw: p[3], pitch: p[4] } : null }
const run = (spans, poses = FX.poses, extra = {}) => editCutSnaps({ N, outOf: clock(spans), camAt: cam(poses), ...extra })
const blocks = (rows) => rows.filter(r => r.level === 'BLOCK')

const OLD = { r1: [T('r1_go', 1.3), T('r1_go', 4.3)], r3: [T('r3_go', 1.8), T('r3_go', 4.4)] }
const NEW = { r1: [T('r1_go', 1.0), T('r1_go', 3.85)], r3: [T('r3_go', 1.5), T('r3_go', 3.9)] }

test("hide_seek's reviewed cuts snap: rounds 1 and 3 block (180 deg/s one way -> the other)", () => {
  const rows = run([OLD.r1, OLD.r3])
  const b = blocks(rows)
  assert.strictEqual(b.length, 2, JSON.stringify(rows))
  for (const r of b) {
    assert.ok(r.speedOut > 150 && r.speedIn > 150, JSON.stringify(r))
    assert.ok(r.sameWay < -0.9, 'the two pans turn opposite ways')
    assert.match(r.msg, /r:r38374d/)
  }
})

test("hide_seek's fixed cuts land on rests: no blockers, both edges under the cap", () => {
  const rows = run([NEW.r1, NEW.r3])
  assert.strictEqual(rows.length, 2)
  assert.deepStrictEqual(blocks(rows), [], JSON.stringify(rows))
  for (const r of rows) assert.ok(r.speedOut <= EDIT_CUT.cap && r.speedIn <= EDIT_CUT.cap, JSON.stringify(r))
})

test('one tick into an eased turn is already over the cap (round 2: 3.0..5.6 blocks, 2.95..5.5 passes)', () => {
  assert.strictEqual(blocks(run([[T('r2_go', 3.0), T('r2_go', 5.6)]])).length, 1)
  assert.deepStrictEqual(blocks(run([[T('r2_go', 2.95), T('r2_go', 5.5)]])), [])
})

test("round 5's cut inside one tilt up the pillar (the same way, 24 deg apart) is a WARN, not a blocker", () => {
  const rows = run([[T('r5_end', 0.5), T('r5_end', 2.4)]])
  assert.strictEqual(rows.length, 1)
  assert.strictEqual(rows[0].level, 'WARN', JSON.stringify(rows))
})

test('a cut to another shot is fine: a camera cut mark inside the span, or the camera 16+ blocks away', () => {
  assert.deepStrictEqual(blocks(run([OLD.r1], FX.poses, { cutTicks: [OLD.r1[0] + 10] })), [])
  const far = { ...FX.poses }
  for (let i = OLD.r1[1]; i <= OLD.r1[1] + 4; i++) far[i] = [far[i][0] + 40, far[i][1], far[i][2], far[i][3], far[i][4]]
  const rows = run([OLD.r1], far)
  assert.ok(rows[0].otherShot && !rows[0].level, JSON.stringify(rows))
})

test('a time-lapse (sped up, not cut) is not an edit cut', () => {
  const out = (i) => i * 0.05 / 3
  assert.deepStrictEqual(editCutSnaps({ N, outOf: out, camAt: cam(FX.poses) }), [])
})
