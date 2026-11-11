// Audible sounds (2026-11-11, thirty_one_raids: the payoff raid horn played at 2.2 x its sounds.json file volume 0.01 =
// silent, and no check caught it). The kit (lib/sound_level.js: the harness's ctx.sound warns, ctx.vanillaSound plays
// an event at the game's own volume, a key sound is raised to it) and the gate (scripts/sound_levels.py, in rec_check:
// any sound mark under the floor BLOCKs). The Python side is scripts/test_sound_levels.py, run from here.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')
const SL = require('../../sound_level')
const ROOT = path.join(__dirname, '..', '..', '..')

test('kit: the horn at 2.2 is inaudible, at its vanilla 64 it is not; steps and doors pass', () => {
  assert.strictEqual(SL.fileVolume('event.raid.horn'), 0.01)
  assert.strictEqual(SL.vanillaVolume('event.raid.horn'), 64)
  assert.ok(Math.abs(SL.gain('event.raid.horn', 2.2) - 0.022) < 1e-9)
  assert.strictEqual(SL.audible('event.raid.horn', 2.2), false)
  assert.match(SL.warning('event.raid.horn', 2.2), /INAUDIBLE SOUND.*ctx\.vanillaSound\('event\.raid\.horn'\)/)
  assert.strictEqual(SL.warning('event.raid.horn', 64), null)
  assert.strictEqual(SL.warning('block.grass.step', 0.15), null)
  assert.strictEqual(SL.warning('block.wooden_door.open', 0.9), null)
  assert.strictEqual(SL.warning('weather.rain', 0.002), null)   // rain fading in: ambience
  assert.strictEqual(SL.gain('block.bell.use', 2), 1)            // vanilla clamps to 1
})

test('kit: a key sound is raised to at least the game\'s own volume', () => {
  assert.strictEqual(SL.keyVolume('event.raid.horn', 2.2), 64)
  assert.strictEqual(SL.keyVolume('event.raid.horn'), 64)
  assert.strictEqual(SL.keyVolume('entity.wolf.whine', 0.6), 0.6)
  assert.match(SL.warning('entity.villager.ambient', 0.1, true), /quiet key sound/)
})

test('harness: ctx.sound warns and flags a key sound; ctx.vanillaSound uses the game volume', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'harness.js'), 'utf8')
  assert.match(src, /require\('\.\/sound_level'\)/)
  assert.match(src, /vanillaSound: \(sound, pitch = 1, o = \{\}\) =>/)
  assert.match(src, /SL\.warning\(sound, volume, !!o\.key\)/)
})

test('the table matches this version (lib/sound_volumes.json)', () => {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'sound_volumes.json'), 'utf8'))
  const v = (fs.readFileSync(path.join(ROOT, 'versions.env'), 'utf8').match(/^MC_VERSION=(.+)$/m) || [])[1]
  assert.strictEqual(t.mc, v, 'lib/sound_volumes.json is for another Minecraft version: python3 scripts/sound_levels.py --gen')
})

test('check: rec_check runs the audibility gate', () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'scripts', 'rec_check.py'), 'utf8'), /sound_levels\.findings\(rec, ed/)
  assert.match(fs.readFileSync(path.join(ROOT, 'lib', 'hb', 'cli.js'), 'utf8'), /step\('audible sound'/)
})

test('python: the floor blocks the raids horn, passes steps and the fixed horn (scripts/test_sound_levels.py)', (t) => {
  if (spawnSync('python3', ['-c', 'import numpy']).status !== 0) return t.skip('python3 with numpy not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_sound_levels.py'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})
