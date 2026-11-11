// The whip check on the ON-SCREEN turn speed (lib/hb/owner.js whipCheck; owner r:r38374d "the camera moves around so
// quickly ... confusing to follow"). heart_art's and sword_art's review of 2026-11-11: their time-lapse spans multiply
// the pixel-art governor's 220 deg/s turns (x2: p90 343 deg/s on screen, x3: 554), and the old check skipped every
// sped-up span. The fixture is heart_art's recorded camera over the start of its x2 time-lapse.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { whipCheck, WHIP } = require('../owner')

const FX = require(path.join(__dirname, 'fixtures', 'heart_art_lapse_cams.json'))
const N = FX.poses.length
const cam = (poses) => (i) => { const p = poses[i]; return p ? { x: p[0], y: p[1], z: p[2], yaw: p[3], pitch: p[4] } : null }
const recorded = (i) => (i < 0 || i >= N ? null : FX.out[i])
const lapseStart = FX.marks.build2 - FX.tick0 + 2   // build2:0.1
// the same recording played at x1 (no speed span): what the old check effectively measured
const x1 = (i) => (i < 0 || i >= N ? null : +(i * 0.05).toFixed(3))
const run = (outOf, poses = FX.poses, extra = {}) => whipCheck({ N, outOf, camAt: cam(poses), ...extra })

test("heart_art's recorded x2 time-lapse whips on screen: blockers inside the speed span, turns ~2x the recording's", () => {
  const W = run(recorded)
  const inLapse = W.whips.filter(w => w.tick >= lapseStart)
  assert.ok(inLapse.length >= 3, JSON.stringify(W.whips))
  for (const w of inLapse) {
    assert.ok(w.speed > WHIP.cap, JSON.stringify(w))
    assert.ok(w.factor > 1.8 && w.factor < 2.3, `x2 span measured as x${w.factor}`)
  }
  assert.ok(W.stats.p95 > 300, `p95 ${W.stats.p95}`)   // the review measured p90 343, p95 390, max 440 deg/s over the whole span
})

test('the same camera at x1 passes: the governor turns at <= 220 deg/s in the recording', () => {
  assert.deepStrictEqual(run(x1).whips, [])
})

test('capping the source turn at 220 / x2 inside the span passes on screen', () => {
  // the camera's turn per tick slowed so no tick of the span turns over 110 deg/s in the recording
  const cap = 110 / 20 * Math.PI / 180
  const poses = FX.poses.map(p => p.slice())
  for (let i = 1; i < N; i++) {
    const want = FX.poses[i], prev = poses[i - 1]
    let dy = want[3] - prev[3]; dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    const dp = want[4] - prev[4], m = Math.hypot(dy * Math.cos(prev[4]), dp)
    const k = m > cap ? cap / m : 1
    poses[i][3] = prev[3] + dy * k; poses[i][4] = prev[4] + dp * k
  }
  assert.deepStrictEqual(run(recorded, poses).whips, [])
})

test("a hard cut (a speed 'cut' span: ticks on one frame) is not a turn", () => {
  // a 180-deg jump across a cut of 10 ticks at tick 100, otherwise still
  const poses = FX.poses.map((p, i) => [p[0], p[1], p[2], i < 105 ? 0 : Math.PI * 0.99, 0])
  const out = (i) => (i < 0 || i >= N ? null : +((i < 100 ? i : i < 110 ? 100 : i - 10) * 0.05).toFixed(3))
  assert.deepStrictEqual(run(out, poses).whips, [])
  // the same jump with no cut is a whip at any speed
  const smooth = FX.poses.map((p, i) => [p[0], p[1], p[2], Math.max(0, Math.min(1, (i - 100) / 10)) * Math.PI * 0.99, 0])
  assert.strictEqual(run(x1, smooth).whips.length, 1)
})

// owner r:r258d1b (2026-11-11, "All ok"): a clutch Short's single quick look-down at the landing may exceed the cap;
// every other turn keeps the rule. boat_clutch / clutch_harder: from straight down (-85 deg) back up at 530-670 deg/s
// within 0.3 s of the landing mark.
test("a clutch's one look-down at the landing is allowed; a level spin there, or a second look, still whips", () => {
  const D = Math.PI / 180
  // looking down (-85 deg) until the look, then back up to level in 4 ticks (~425 deg/s)
  const look = (t0) => FX.poses.map((p, i) => [p[0], p[1], p[2], 0, i < t0 ? -85 * D : i < t0 + 4 ? (-85 + 85 * (i - t0) / 4) * D : 0])
  const atLanding = run(x1, look(100), { landings: [98] })
  assert.deepStrictEqual(atLanding.whips, [], JSON.stringify(atLanding))
  assert.strictEqual(atLanding.allowed.length, 1)
  assert.strictEqual(atLanding.allowed[0].why, 'landing')
  // the same look 3 s from any landing mark: a whip
  assert.strictEqual(run(x1, look(160), { landings: [98] }).whips.length, 1)
  // an explicit whip_ok mark allows it too
  assert.strictEqual(run(x1, look(160), { whipOk: [158] }).allowed.length, 1)
  // a level yaw spin at the landing (clutch_harder 20.88 s, after the pearl): not a look-down, still a whip
  const spin = FX.poses.map((p, i) => [p[0], p[1], p[2], i < 100 ? 0 : i < 108 ? (i - 100) / 8 * 2.8 : 2.8, 0])
  assert.strictEqual(run(x1, spin, { landings: [98] }).whips.length, 1)
  // a second look-down 3 s later, with no landing of its own, is a whip
  const twice = look(100).map((p, i) => i >= 140 ? [p[0], p[1], p[2], 0, i < 140 + 20 ? -85 * D : i < 164 ? (-85 + 85 * (i - 160) / 4) * D : 0] : p)
  const W2 = run(x1, twice, { landings: [98, 158] })
  assert.strictEqual(W2.allowed.length, 2)   // a look at each landing
  const W1 = run(x1, twice, { landings: [98], whipOk: [] })
  assert.deepStrictEqual([W1.allowed.length, W1.whips.length], [1, 1])   // the second, 3 s from the landing: a whip
})
