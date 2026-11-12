// Format cooked (lib/cooked.js; r:r5ee125, r:r12cb71): the flood's timing on the pinned track, the edit it asks for,
// edit_args passing edit.still, and edit.py's still (the view black from 'dark', the meme picture from 'flood', a punch
// on 'cooked', the chat on top) on a few synthetic frames.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const cp = require('child_process')
const ROOT = path.join(__dirname, '..', '..', '..')
const C = require('../../cooked')

test('cooked: the flood is on the beat, then twice a beat, the punchline a beat after the rest', () => {
  const t = C.floodTicks('industry_kiss.mp3', 10)
  assert.strictEqual(t.length, 10)
  assert.strictEqual(t[0], 0)                               // the first join on the drop
  const beat = C.TRACKS['industry_kiss.mp3'].beat * 20
  assert.ok(Math.abs(t[1] - beat) <= 0.5)
  assert.ok(Math.abs(t[9] - t[8] - beat) <= 1, 'the punchline a beat after the one before')
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1])
  const short = C.floodTicks('industry_kiss.mp3', 4)
  assert.strictEqual(short.length, 4)
  assert.throws(() => C.floodTicks('nope.mp3'))
})

test('cooked: the edit pins the track, drops on the flood, ends on the punchline', () => {
  const e = C.cookedEdit({ caption: 'c', red: 'c', track: 'industry_kiss.mp3', extra: { sfx: [['pop', 'go']] } })
  assert.strictEqual(e.ncs, 'industry_kiss.mp3')
  assert.strictEqual(e.dropAt, 'flood')
  assert.match(e.endAfter, /^cooked:/)
  assert.deepStrictEqual(e.still.punch[0], 'cooked')
  assert.ok(e.sfx.some(s => s[0] === 'impact' && s[1] === 'cooked') && e.sfx.some(s => s[0] === 'pop'))
  const mod = require('../../../stunts/cooked_bedrock')
  // the ominous track (owner r:rcefdcc), its silence made by a dip on the flood, a bar of its build looped so it plays
  // from frame 0 and its drop lands on the flood (owner 2026-11-12: "why does the music start late?")
  assert.strictEqual(mod.edit.ncs, 'executioner.mp3')
  assert.strictEqual(mod.edit.songLate, undefined)
  assert.strictEqual(mod.edit.songLoop, 4 * C.TRACKS['executioner.mp3'].beat)
  assert.ok(mod.edit.sfx.some(s => s[0] === 'dip' && s[1] === 'flood' && s[2] === C.TRACKS['executioner.mp3'].quiet))
  assert.ok(!C.cookedEdit({ caption: 'c', red: 'c', track: 'industry_kiss.mp3' }).sfx.some(s => s[1] === 'flood'), 'a track with its own quiet needs no dip')
  const args = cp.execFileSync('node', ['scripts/edit_args.js', 'cooked_bedrock'], { cwd: ROOT, encoding: 'utf8' }).split('\n')
  const i = args.indexOf('--still')
  assert.ok(i >= 0 && JSON.parse(args[i + 1]).at === 'flood')
})

test('add_song: a pin-only track (a format\'s own, edit.ncs) never comes up in the random NCS pick', () => {
  const r = cp.execFileSync('python3', ['-c', `
import sys, json
sys.path.insert(0, 'scripts')
import add_song
pin = [f for f, t in add_song.NCS.items() if t.get('pin_only')]
add_song.song_drop = lambda p: 99.0
picks = {add_song.pick_ncs('x' * k, 0.0) for k in range(1, 40)} if any((add_song.ROOT / 'songs' / 'ncs' / f).exists() for f in add_song.NCS) else set()
print(json.dumps({'pin': pin, 'picked_pin': [p for p in picks if p.split('/')[-1] in pin]}))`], { cwd: ROOT, encoding: 'utf8' })
  const o = JSON.parse(r)
  assert.ok(o.pin.includes('executioner.mp3'))
  assert.deepStrictEqual(o.picked_pin, [])
})

const JAR = (() => {
  const v = (fs.readFileSync(path.join(ROOT, 'versions.env'), 'utf8').match(/MC_VERSION=(\S+)/) || [])[1]
  return v && fs.existsSync(path.join(ROOT, 'work', 'client', `${v}.jar`))
})()

test('edit.py still: game, then black from dark, the picture from flood, the punch, the chat over it', { skip: !JAR && 'no client jar' }, () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-cooked-'))
  const r = JSON.parse(cp.execFileSync('python3', ['-c', `
import json, subprocess, sys, os
from PIL import Image
d = sys.argv[1]
os.makedirs(d + "/f", exist_ok=True)
for i in range(240):   # 4 s of green game at 60 fps
    Image.new("RGB", (1080, 1011), (40, 160, 40)).save(f"{d}/f/f{i:05d}.png")
pic = Image.new("RGB", (400, 600), (200, 30, 30))   # a portrait: red, a blue band at its top third
pic.paste(Image.new("RGB", (400, 60), (30, 30, 220)), (0, 170))
pic.save(d + "/pic.png")
tl = {"timeline": [{"t": 0, "event": "start"}, {"t": 1000, "event": "dark"}, {"t": 2000, "event": "flood"},
                   {"t": 2000, "event": "syschat", "text": "Notch joined the game", "color": "yellow"},
                   {"t": 3000, "event": "cooked"}], "poses": []}
json.dump(tl, open(d + "/rec.json", "w"))
env = dict(os.environ, HB_MEME_WAR_SOLDIER=d + "/pic.png")
spec = {"at": "flood", "dark": "dark", "meme": "war_soldier", "punch": ["cooked", 1.3], "fade": 0.1, "focus": [0.5, 0.33]}
subprocess.run(["python3", "edit.py", "--frames", d + "/f/f%05d.png", "--fps", "60", "--out_fps", "60", "--timeline", d + "/rec.json",
                "--caption", "test", "--no-hud", "--chat_scale", "4", "--still", json.dumps(spec), "--out", d + "/out.mp4"], check=True, env=env, capture_output=True)
out = {}
for name, t in (("game", 0.5), ("dark", 1.5), ("still", 2.5), ("punch", 3.5)):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", d + "/out.mp4", "-frames:v", "1", d + f"/{name}.png"], check=True)
    im = Image.open(d + f"/{name}.png").convert("RGB")
    out[name] = im.getpixel((540, 300 + 505))   # the middle of the game view (BAND ~ 455)
    out[name + "_top"] = im.getpixel((540, 470))
    if name == "still":
        out["yellow"] = sum(1 for x in range(0, 1080, 3) for y in range(455, 1466, 3) if (lambda p: p[0] > 200 and p[1] > 200 and p[2] < 120)(im.getpixel((x, y))))
print(json.dumps(out))
`, d], { cwd: ROOT, encoding: 'utf8' }))
  const near = (p, q, tol = 40) => p.every((v, i) => Math.abs(v - q[i]) <= tol)
  assert.ok(near(r.game, [40, 160, 40]), `game ${r.game}`)
  assert.ok(r.dark.every(v => v < 20), `dark ${r.dark}`)
  assert.ok(near(r.still, [200, 30, 30], 60), `still ${r.still}`)
  assert.ok(near(r.punch, [200, 30, 30], 60), `punch ${r.punch}`)
  assert.ok(r.yellow > 50, `the chat line over the picture: ${r.yellow} yellow px`)
  fs.rmSync(d, { recursive: true, force: true })
})
