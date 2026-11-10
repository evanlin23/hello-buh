// The visual audit's engine items (docs/runs/visual_audit_2026-11-10, docs/engine_features.md "Potions, phone-readable
// screens, on-screen teleports, the Darkness phase, lightning light"): potion colours, edit.guiScale / chatScale,
// K.blink + teleport_ok, the darkness_phase mark, lightning light without smoothLight, owner's view classes.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const ROOT = path.join(__dirname, '..', '..', '..')
const { potionColor, BASE } = require('../../potion_color')
const MO = require('../motion')
const { lintSource } = require('../motion_lint')
const DK = require('../../darkness')
const { lightningLight } = require('../../lightning_light')

test('potion colours: vanilla PotionContents.getColor', () => {
  // the shapes mineflayer gives (checked on a live 1.21.11 server: { potionId, customEffects } / { customColor, ... })
  assert.strictEqual(potionColor({ potionId: 11, customEffects: [] }), 0xFF9900)   // fire_resistance
  assert.strictEqual(potionColor({ potion: 'minecraft:long_fire_resistance' }), 0xFF9900)
  assert.strictEqual(potionColor({ customColor: 16711935, customEffects: [] }), 0xFF00FF)
  assert.strictEqual(potionColor(null), BASE)                              // an empty potion_contents: the water blue
  assert.strictEqual(potionColor({ potionId: 0, customEffects: [] }), BASE)  // water
  assert.strictEqual(potionColor({ potion: 'awkward' }), BASE)
  assert.strictEqual(potionColor({ potion: 'weakness' }), 0x484D48)
  // turtle master: slowness IV (weight 4) + resistance III (weight 3)
  const r = Math.floor((0x8B * 4 + 0x91 * 3) / 7), g = Math.floor((0xAF * 4 + 0x46 * 3) / 7), b = Math.floor((0xE0 * 4 + 0xF0 * 3) / 7)
  assert.strictEqual(potionColor({ potion: 'turtle_master' }), (r << 16) | (g << 8) | b)
  // custom effects mix in; hidden ones (showParticles false) don't
  assert.strictEqual(potionColor({ customEffects: [{ id: 11, details: { amplifier: 0 } }] }), 0xFF9900)
  assert.strictEqual(potionColor({ customEffects: [{ id: 11, details: { amplifier: 0, showParticles: false } }] }), BASE)
})

const JAR = fs.existsSync(path.join(ROOT, 'versions.env')) && (() => {
  const v = /MC_VERSION=(\S+)/.exec(fs.readFileSync(path.join(ROOT, 'versions.env'), 'utf8'))[1]
  return fs.existsSync(path.join(ROOT, 'work', 'client', v + '.jar'))
})()
const py = (code) => JSON.parse(cp.execFileSync('python3', ['-c', `import json, sys, zipfile\nsys.path.insert(0, '.')\nimport edit\n${code}`], { cwd: ROOT, encoding: 'utf8' }))

test('edit.py: a recorded potion colour tints the icon; old slots draw as before', { skip: !JAR && 'no client jar' }, () => {
  const r = py(`
with zipfile.ZipFile(edit.CLIENT_JAR) as jar:
    old = edit.tint_of(["potion", 1]) is None and edit.tint_of(["potion", 1, 1]) is None and edit.tint_of(["diamond_sword", 1, 0, 3, 1561]) is None
    ic = edit.potion_icon(jar, "potion", 0xFF9900).convert("RGBA")
    px = [ic.getpixel((x, y)) for x in range(16) for y in range(16)]
    orange = sum(1 for p in px if p[3] and p[0] > 150 and p[2] < 60)
    print(json.dumps({"old": old, "tint": edit.tint_of(["potion", 1, 0, 0, 0, 0xFF9900]), "orange": orange}))`)
  assert.strictEqual(r.old, true)
  assert.strictEqual(r.tint, 0xFF9900)
  assert.ok(r.orange >= 10, `orange liquid pixels: ${r.orange}`)
})

test('edit.py: guiScale and chatScale are opt-in; the default stays GUI 3', { skip: !JAR && 'no client jar' }, () => {
  const r = py(`
import tempfile, os
from PIL import Image
d = tempfile.mkdtemp()
st = {"type": "minecraft:generic_9x3", "title": "container.barrel", "rows": 3, "slots": [["potion", 1, 0, 0, 0, 0xFF9900]]}
out = {}
with zipfile.ZipFile(edit.CLIENT_JAR) as jar:
    for s in (None, 4, 9):
        with edit.gui_scale(s):
            edit.container_png(jar, st, os.path.join(d, "c.png"))
        a = Image.open(os.path.join(d, "c.png")).split()[3].point(lambda v: 255 if v == 255 else 0).getbbox()
        out["c%s" % s] = a[2] - a[0]
    for s in (None, 5):
        with edit.gui_scale(s):
            edit.syschat_png(jar, (("Buh left the game", (255, 255, 85, 255)),), os.path.join(d, "s.png"))
        im = Image.open(os.path.join(d, "s.png"))
        ys = [y for y in range(im.height) if im.getpixel((10, y))[3] > 0]
        out["s%s" % s] = ys[-1] - ys[0] + 1
    out["gui"] = edit.GUI
print(json.dumps(out))`)
  assert.strictEqual(r.gui, 3)                       // restored after every with
  assert.strictEqual(r.cNone, 176 * 3)
  assert.strictEqual(r.c4, 176 * 4)
  assert.strictEqual(r.c9, 176 * 6)                  // too big for the view: the largest that fits (a 3-row barrel at 6)
  assert.strictEqual(r.sNone, 9 * 3 + 1)             // a chat line's strip (PIL rectangles are inclusive)
  assert.strictEqual(r.s5, 9 * 5 + 1)
  const args = cp.execFileSync('node', ['scripts/edit_args.js', '_engine2_test'], { cwd: ROOT, encoding: 'utf8' }).split('\n')
  assert.deepStrictEqual(args.slice(args.indexOf('--gui_scale'), args.indexOf('--gui_scale') + 4), ['--gui_scale', '4', '--chat_scale', '5'])
})

test('K.blink: teleport_ok accepts the jump; the lint is clean; owner flags only jumps in or near view', () => {
  const rows = [[10, 7, 'wolf', 0, 64, 12], [11, 7, 'wolf', 0, 64, 12], [12, 7, 'wolf', 1.5, 64, -2.5], [13, 7, 'wolf', 1.5, 64, -2.5]]
  assert.strictEqual(MO.teleports(rows, []).length, 1)
  const ok = MO.teleportOk([{ t: 11 * 50, event: 'teleport_ok', tag: 'dog', x: 1.5, y: 64, z: -2.5 }])
  assert.strictEqual(MO.teleports(rows, [], { ok }).length, 0)
  // somewhere else, or long after: still a teleport
  assert.strictEqual(MO.teleports(rows, [], { ok: MO.teleportOk([{ t: 11 * 50, event: 'teleport_ok', x: 20, y: 64, z: 20 }]) }).length, 1)
  assert.strictEqual(MO.teleports(rows, [], { ok: MO.teleportOk([{ t: 2 * 50, event: 'teleport_ok', x: 1.5, y: 64, z: -2.5 }]) }).length, 1)
  assert.deepStrictEqual(lintSource("async perform (ctx) {\n  await K.blink('dog')\n  await K.blink('self', { x: 2, z: 3 })\n}"), [])
  // view classes
  assert.strictEqual(MO.viewClass({ inFrame: true, margin: true, depth: 12, dist: 12, occluded: false }), 'seen')
  assert.strictEqual(MO.viewClass({ inFrame: true, margin: true, depth: 45, dist: 46, occluded: true }), null)   // dog_hill: behind the hill
  assert.strictEqual(MO.viewClass({ inFrame: false, margin: false, depth: 55, dist: 55, occluded: false }), null)
  assert.strictEqual(MO.viewClass({ inFrame: true, margin: true, depth: 20, dist: 20, occluded: true }), 'near')
  assert.strictEqual(MO.viewClass({ inFrame: false, margin: true, depth: 20, dist: 20, occluded: false }), 'near')
  assert.strictEqual(MO.viewClass({ inFrame: false, margin: false, depth: -3, dist: 5, occluded: false }), 'near')
})

test('K.blink and K.darkPeak on a fake bot: the marks, the actor jump, no cut', async () => {
  const { storyKit } = require('../../story')
  const marks = [], said = []
  const bot = { entity: { position: { x: 100.5, y: 65, z: 200.5 }, yaw: 0, pitch: 0 }, on () {}, removeListener () {}, chat: (s) => said.push(s), waitForTicks: async () => {}, controlState: {} }
  const ctx = { bot, tick: 50, mark: (e, x = {}) => marks.push({ event: e, ...x }), log () {}, cmd: async () => {}, Vec3: function (x, y, z) { Object.assign(this, { x, y, z }) } }
  const K = storyKit(ctx, { line: () => ({ dur: 1, gap: 0 }), gap: 0 }, { X: 100, Z: 200, F: 64 })
  const a = K.actors.set('dog', { x: 0, y: 1, z: 14, yaw: 180, _at: { x: 0, y: 1, z: 14 } }).get('dog')
  const to = await K.blink('dog')
  assert.ok(a._warp, 'the actor jumps on its next move')
  assert.ok(Math.abs(to.x - 102) < 1e-9 && Math.abs(to.z - 200.5) < 1e-9, `1.5 blocks to the player's right: ${JSON.stringify(to)}`)   // facing north (yaw 0): right is +x
  const m = marks.find(e => e.event === 'teleport_ok')
  assert.ok(m && m.tag === 'dog' && !m.self)
  assert.ok(!marks.some(e => e.event === 'cut'), 'no cut mark')
  await assert.rejects(K.blink('nobody'), /not an actor/)
  K.darkPeak(30)
  assert.deepStrictEqual(marks.find(e => e.event === 'darkness_phase'), { event: 'darkness_phase', offset: 30 })
})

test('darkness phase: no marks is the absolute clock (bit for bit); a mark puts a peak on its tick + offset', () => {
  for (const t of [0, 13.25, 79.9, 160, 1234.5]) assert.strictEqual(DK.pulse(t, []), Math.cos(t * Math.PI * 0.025))
  const marks = DK.phaseMarks([{ t: 207 * 50, event: 'darkness_phase', offset: 30 }, { t: 20, event: 'line' }])
  assert.deepStrictEqual(marks, [[207, 237]])
  assert.ok(Math.abs(DK.pulse(237, marks) - 1) < 1e-12)
  assert.ok(Math.abs(DK.pulse(237 + 80, marks) - 1) < 1e-12)
  assert.ok(Math.abs(DK.pulse(237 + 40, marks) + 1) < 1e-12)
  assert.ok(Math.abs(DK.pulse(100, marks) - Math.cos((100 - 237) * Math.PI * 0.025)) < 1e-12)   // before the first mark: the first rules
  const two = DK.phaseMarks([{ t: 100 * 50, event: 'darkness_phase' }, { t: 300 * 50, event: 'darkness_phase', offset: 10 }])
  assert.ok(Math.abs(DK.pulse(310, two) - 1) < 1e-12 && Math.abs(DK.pulse(180, two) - 1) < 1e-12)
})

test('lightning light: on for engine-3 recordings with a bolt, opt-in for older ones, off without a bolt', () => {
  assert.strictEqual(lightningLight({ engine: 3, bolts: 2 }), true)
  assert.strictEqual(lightningLight({ engine: 2, bolts: 2 }), false)                     // published: unchanged
  assert.strictEqual(lightningLight({ engine: 0, bolts: 5 }), false)
  assert.strictEqual(lightningLight({ engine: 3, bolts: 0 }), false)
  assert.strictEqual(lightningLight({ engine: 2, bolts: 1, stunt: { lightningLight: true } }), true)
  assert.strictEqual(lightningLight({ engine: 3, bolts: 1, stunt: { lightningLight: false } }), false)
  assert.strictEqual(lightningLight({ engine: 2, bolts: 1, env: { LIGHTNING_LIGHT: '1' } }), true)
  assert.strictEqual(lightningLight({ engine: 3, bolts: 1, env: { LIGHTNING_LIGHT: '0' } }), false)
  assert.strictEqual(lightningLight({ engine: 3, bolts: 1, env: { SHADER_LIGHT: '0' } }), false)
  assert.strictEqual(lightningLight({ engine: 3, bolts: 1, lookShader: true }), false)   // the look's shader light has it already
})
