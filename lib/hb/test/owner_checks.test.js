// Owner notes as checks (2026-11-11): aim on the action (r:rffba12, lib/aim.js) and let the payoff settle
// (r:r24d99a, scripts/owner_checks.py). The Python side (aim_report's rules, the settle tracks, pace's edit captions)
// is scripts/test_owner_checks.py, run from here.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const AIM = require('../../aim')

const ROOT = path.join(__dirname, '..', '..', '..')
// a recording: the player at (0.5, 64, 0.5), eye 65.62, looking along (yaw, pitch) for n ticks
const rec = (yaw, pitch, timeline = [], entities = [], n = 40) => ({
  poses: Array.from({ length: n }, (_, k) => [k, 0.5, 64, 0.5, yaw, pitch, 0, 0]), timeline, entities, blocks: []
})
// the yaw/pitch that looks from the eye at point p
const lookAt = (p) => { const d = [p[0] - 0.5, p[1] - 65.62, p[2] - 0.5]; return [Math.atan2(-d[0], -d[2]), Math.atan2(d[1], Math.hypot(d[0], d[2]))] }

test('a place with the crosshair on the block: 0 deg, on screen (creeper_art: dead on)', () => {
  const [y, p] = lookAt([0.5, 64.5, -2.5])
  const r = AIM.run(rec(y, p, [{ t: 500, event: 'place', x: 0, y: 64, z: -3 }]))
  assert.strictEqual(r.n, 1)
  assert.strictEqual(r.actions[0].deg, 0)
  assert.ok(r.actions[0].onScreen)
})

test('a place 20 deg off the crosshair measures ~20 deg (sand_tower torches, heart_art)', () => {
  const [y, p] = lookAt([0.5, 64.5, -2.5])
  const r = AIM.run(rec(y + 25 * Math.PI / 180, p, [{ t: 500, event: 'place', x: 0, y: 64, z: -3 }]))
  assert.ok(r.actions[0].deg > 12 && r.actions[0].deg < 25, `deg ${r.actions[0].deg}`)
})

test('an instant break (dig_end + the block\'s particles, no dig mark) is an action', () => {
  const [y, p] = lookAt([2.5, 64.5, 0.5])
  const r = AIM.run(rec(y, p, [{ t: 500, event: 'dig_end', ok: true }, { t: 500, event: 'particles', type: 'block', x: 2, y: 64, z: 0, block: 'sand' }]))
  assert.strictEqual(r.n, 1)
  assert.strictEqual(r.actions[0].kind, 'break')
  assert.strictEqual(r.actions[0].deg, 0)
})

test('dye: the sheep whose colour changes on the swing is the target; looking at its neighbour is off (rainbow_sheep)', () => {
  // two sheep 3 blocks out, 1.5 apart; #2 is dyed at tick 10
  const ents = []
  for (let k = 0; k < 40; k++) {
    ents.push([k, 1, 'sheep', -0.25, 64, -2.5, 0, 0, null, { color: 0, sheared: false }])
    ents.push([k, 2, 'sheep', 1.25, 64, -2.5, 0, 0, null, { color: k >= 10 ? 14 : 0, sheared: false }])
  }
  const tl = [{ t: 500, event: 'swing' }, { t: 500, event: 'dye', n: 0 }]
  const right = AIM.run(rec(...lookAt([1.25, 64.6, -2.5]), tl, ents))
  assert.strictEqual(right.n, 1)
  assert.match(right.actions[0].what, /sheep #2 \(color\)/)
  assert.strictEqual(right.actions[0].deg, 0)
  const wrong = AIM.run(rec(...lookAt([-0.9, 64.6, -2.5]), tl, ents))
  assert.ok(wrong.actions[0].deg > 6, `deg ${wrong.actions[0].deg}`)
})

test('on screen: straight down at a dig is on screen; a block behind the eye is not', () => {
  assert.ok(AIM.onScreen([0.5, 65.6, 0.5], 0.3, -1.4, [0, 63, 0, 1, 64, 1]))
  assert.ok(!AIM.onScreen([0.5, 65.6, 0.5], 0, 0, [0, 65, 3, 1, 66, 4]))
})

test('the Python side: aim_report rules, settle tracks, pace edit captions (scripts/test_owner_checks.py)', (t) => {
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_owner_checks.py'], { cwd: ROOT, encoding: 'utf8', timeout: 600000 })
  if (r.status !== 0 && /No module named 'numpy'/.test(r.stderr)) return t.skip('numpy missing')
  assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''))
})

// the tuning set, when the videos branch is checked out beside the repo: creeper_art (the owner's reference) passes,
// heart_art (flagged) fails; rainbow_sheep, flagged by the owner, passes since its re-record (worker A 2026-11-11: the
// crosshair settles on each sheep before the dye)
const VIDEOS = process.env.HB_VIDEOS || path.join(ROOT, '..', 'hb-videos')
for (const [name, ok] of [['creeper_art', true], ['heart_art', false], ['rainbow_sheep', true]]) {
  test(`tuning: ${name} ${ok ? 'passes' : 'blocks'} (whole recording)`, (t) => {
    const p = path.join(VIDEOS, 'shorts', name, 'recording.json.gz')
    if (!fs.existsSync(p)) return t.skip(`no ${p}`)
    const r = spawnSync('node', [path.join(ROOT, 'scripts', 'rec_sight.js'), p, '--json'], { encoding: 'utf8', maxBuffer: 1 << 28 })
    const aim = JSON.parse(r.stdout.trim().split('\n').pop()).aim
    const over = aim.actions.filter((a) => a.deg > 6).length / aim.n
    const bad = aim.actions.filter((a) => a.deg > 15 || !a.onScreen).length
    assert.strictEqual(over <= 0.1 && bad === 0, ok, `${name}: ${(over * 100).toFixed(0)}% over 6 deg, ${bad} over 15/off-screen`)
  })
}
