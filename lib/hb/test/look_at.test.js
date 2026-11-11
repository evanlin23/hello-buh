// A turn onto a mob ends with it centred (owner 2026-11-11, r:r52f94c, guess_sound_2 @13.7 s: "when we look over at the
// mob, we arent looking directly at it"): lib/aim.js lookAts / measureLook, and the aim check's BLOCK
// (scripts/owner_checks.py aim_report) on a look-at beat that lands more than ~6 deg off centre.
const test = require('node:test')
const assert = require('node:assert')
const { spawnSync } = require('child_process')
const path = require('path')
const A = require('../../aim')

// the player at (0.5, 64, 0.5) facing north (yaw 0); a zombie 4 blocks north. pitch for every tick
const rec = (pitch, yaw = 0, timeline) => ({
  poses: Array.from({ length: 40 }, (_, k) => [k * 50, 0.5, 64, 0.5, yaw, pitch, 0, 0]),
  entities: [[0, 7, 'zombie', 0.5, 64, -3.5, 0, 0, null, null]],
  timeline: timeline || [{ t: 500, event: 'look_at', id: 7 }]
})
const eyeY = 64 + 1.95 * 0.85, level = Math.atan2(eyeY - 65.62, 4)

test('a look that lands on the zombie\'s head is centred (under 1 deg)', () => {
  const r = A.run(rec(level))
  assert.strictEqual(r.looks.length, 1)
  assert.ok(r.looks[0].deg < 1, JSON.stringify(r.looks))
})

test('a look 11 deg above the head (the old fixed tilt) is over LOOK_MAX_DEG', () => {
  const r = A.run(rec(level + 0.2))
  assert.ok(r.looks[0].deg > A.LOOK_MAX_DEG, JSON.stringify(r.looks))
})

test('the body counts as centred too, a look 8 deg to the side does not', () => {
  assert.ok(A.run(rec(Math.atan2(64 + 0.975 - 65.62, 4))).looks[0].deg < 1)
  assert.ok(A.run(rec(level, 0.14)).looks[0].deg > A.LOOK_MAX_DEG)
})

test('older guess_sound recordings: the reveal { mob } -> react pair is the look-at beat', () => {
  const tl = [{ t: 400, event: 'reveal', mob: 'zombie' }, { t: 500, event: 'react' }]
  const r = A.run(rec(level + 0.2, 0, tl))
  assert.strictEqual(r.looks.length, 1)
  assert.strictEqual(r.looks[0].source, 'reveal')
  assert.ok(r.looks[0].deg > 6)
})

test('the aim check BLOCKs a look-at beat over 6 deg and passes a centred one', () => {
  const run = (looks) => spawnSync('python3', ['-c', `
import json, sys; sys.path.insert(0, 'scripts'); import owner_checks as OC
r = OC.aim_report({"aim": {"actions": [], "looks": json.loads(sys.argv[1]), "lookMax": 6}}, lambda t: True)
print(json.dumps([f[0] for f in r["findings"]]))`, JSON.stringify(looks)], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8' })
  const bad = run([{ tick: 10, deg: 8.7, what: 'zombie #7', source: 'look_at' }])
  assert.deepStrictEqual(JSON.parse(bad.stdout), ['BLOCK'], bad.stderr)
  const ok = run([{ tick: 10, deg: 2.1, what: 'zombie #7', source: 'look_at' }])
  assert.deepStrictEqual(JSON.parse(ok.stdout), [], ok.stderr)
})
