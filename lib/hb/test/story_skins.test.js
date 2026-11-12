// The original skins (scripts/make_story_skins.py -> skins/): the committed PNGs are what the generator draws, each is
// a 64x64 skin with a fully opaque base layer, none is a taken name, and no two look alike (docs/world/canon.md
// "Original skins", STANDARDS 7a).
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..', '..', '..')
const NAMES = ['grandpa_gullwick', 'grandma_island', 'walk_kid', 'pulled_man', 'hall_player', 'miner_girl', 'neighbour', 'barter_player', 'spare_boy', 'spare_girl', 'sorry_aunt', 'statue_dad', 'statue_mom', 'statue_mom_1', 'statue_mom_2']
// one character in several states (scripts/make_story_skins.py FAMILIES): meant to look alike, so exempt from the
// distinctness check among themselves, and checked instead to differ only in the hair and face, and there clearly
const FAMILIES = [['statue_mom', 'statue_mom_1', 'statue_mom_2']]
const TAKEN = ['steve', 'alex', 'ari', 'efe', 'kai', 'makena', 'noor', 'sunny', 'zuri', 'hellobuh', 'hellobuh_hood']

test('the committed skins are the generator\'s, byte for byte', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skins-'))
  const r = spawnSync('python3', [path.join(ROOT, 'scripts', 'make_story_skins.py'), '--out', dir], { encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stderr)
  for (const n of NAMES) assert.ok(fs.readFileSync(path.join(dir, `${n}.png`)).equals(fs.readFileSync(path.join(ROOT, 'skins', `${n}.png`))), `${n}.png differs: run python3 scripts/make_story_skins.py`)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('64x64, opaque base layer, distinct from each other, not a taken name', () => {
  for (const n of NAMES) assert.ok(!TAKEN.includes(n), n)
  const py = `
import json, sys, itertools
from PIL import Image
names = json.loads(sys.argv[1]); out = {}
# the base layer's faces (wide): head, body, right/left arm, right/left leg (u, v, w, h, d)
BASE = [(0, 0, 8, 8, 8), (16, 16, 8, 12, 4), (40, 16, 4, 12, 4), (32, 48, 4, 12, 4), (0, 16, 4, 12, 4), (16, 48, 4, 12, 4)]
def rects(u, v, w, h, d): return [(u + d, v, w, d), (u + d + w, v, w, d), (u, v + d, d, h), (u + d, v + d, w, h), (u + d + w, v + d, d, h), (u + 2 * d + w, v + d, w, h)]
fronts = {}
for n in names:
    im = Image.open(f"skins/{n}.png").convert("RGBA")
    assert im.size == (64, 64), n
    holes = sum(1 for b in BASE for (x0, y0, w, h) in rects(*b) for y in range(h) for x in range(w) if im.getpixel((x0 + x, y0 + y))[3] < 255)
    assert holes == 0, f"{n}: {holes} see-through base pixels"
    # what a phone sees: the face, the body's front and the legs' front, as mean colours
    f = lambda box: [sum(c[i] for c in im.crop(box).convert("RGB").getdata()) / ((box[2] - box[0]) * (box[3] - box[1])) for i in range(3)]
    fronts[n] = f((8, 8, 16, 16)) + f((20, 20, 28, 32)) + f((4, 20, 8, 32))
close = []
for a, b in itertools.combinations(names, 2):
    d = sum((x - y) ** 2 for x, y in zip(fronts[a], fronts[b])) ** 0.5
    if d < 60: close.append((a, b, round(d)))
print(json.dumps(close))
`
  const r = spawnSync('python3', ['-c', py, JSON.stringify(NAMES)], { cwd: ROOT, encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stderr)
  const family = (a, b) => FAMILIES.some(f => f.includes(a) && f.includes(b))
  assert.deepStrictEqual(JSON.parse(r.stdout).filter(([a, b]) => !family(a, b)), [], 'skins too alike at phone size')
})

test('a family\'s states: the same costume byte for byte, each state clearly apart in the face and hair', () => {
  const py = `
import json, sys, itertools
from PIL import Image
fams = json.loads(sys.argv[1]); out = []
# the hair and face region: the whole head (base and hat layer) and the body's back down to the ponytail's end
HEAD = [(0, 0, 32, 16), (32, 0, 64, 16)]
TAIL = [(32, 20, 40, 26), (32, 36, 40, 42)]
inside = lambda x, y: any(x0 <= x < x1 and y0 <= y < y1 for (x0, y0, x1, y1) in HEAD + TAIL)
for fam in fams:
    ims = {n: Image.open(f"skins/{n}.png").convert("RGBA") for n in fam}
    for a, b in itertools.combinations(fam, 2):
        A, B = ims[a], ims[b]
        outside = sum(1 for y in range(64) for x in range(64) if not inside(x, y) and A.getpixel((x, y)) != B.getpixel((x, y)))
        dist = lambda p, q: sum((p[i] - q[i]) ** 2 for i in range(3)) ** 0.5
        front = sum(1 for y in range(8, 16) for x in range(8, 16) if dist(A.getpixel((x, y)), B.getpixel((x, y))) > 60)
        strong = sum(1 for y in range(64) for x in range(64) if inside(x, y) and A.getpixel((x, y))[3] and B.getpixel((x, y))[3] and dist(A.getpixel((x, y)), B.getpixel((x, y))) > 60)
        out.append([a, b, outside, front, strong])
print(json.dumps(out))
`
  const r = spawnSync('python3', ['-c', py, JSON.stringify(FAMILIES)], { cwd: ROOT, encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stderr)
  for (const [a, b, outside, front, strong] of JSON.parse(r.stdout)) {
    assert.strictEqual(outside, 0, `${a} vs ${b}: ${outside} pixels differ outside the hair and face (one costume)`)
    assert.ok(front >= 2, `${a} vs ${b}: only ${front} face pixels change (a phone CU must see it)`)
    assert.ok(strong >= 15, `${a} vs ${b}: only ${strong} hair/face pixels change clearly`)
  }
})
