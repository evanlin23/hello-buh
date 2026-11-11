// The opt-in 'bright' look and the stress punches (owner, 2026-11-10: the biggest Minecraft story channels have
// "very bright, exagerated movements"; house rule 7952f67). Neither changes a stunt that doesn't ask for it.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawnSync } = require('child_process')
const L = require('../../../renderer/looks')

test("look 'bright': brighter, more saturated, a light vignette, no depth of field; 'auto' unchanged", () => {
  const b = L.resolveLook('bright'), a = L.resolveLook('auto')
  assert.strictEqual(b.bright, true); assert.strictEqual(b.dof, false)
  for (const [t, mood] of [[6000, null], [18000, null], [1000, 'golden_hour']]) {
    const gb = L.gradeAt(b, t, mood), ga = L.gradeAt(a, t, mood)
    assert.ok(gb.exposure > ga.exposure, `exposure up at ${t}`)
    assert.ok(gb.sat >= 1.3, `saturation ~1.3 at ${t}`)
    assert.ok(gb.contrast > ga.contrast)
    assert.ok(gb.vignette <= 0.1)
  }
  assert.ok(L.gradeAt(b, 18000, 'flashback').sat < 1, 'a flashback keeps its fade')
  assert.deepStrictEqual(L.gradeAt(a, 6000, null), L.autoGrade(6000))
})

test("edit.punchStress: 'all' gives one punch per sentence, on its last CAPS word, from the aligned words", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-ps-'))
  const story = path.join(dir, 'st')
  fs.mkdirSync(path.join(story, 'voice'), { recursive: true })
  fs.writeFileSync(path.join(story, 'voice', 'words.json'), JSON.stringify({
    L01: [['My', 0.1, 0.2], ['GRANDMA', 0.3, 0.6], ['has', 0.7, 0.8], ['a', 0.9, 0.95], ['PORTAL.', 1.0, 1.4], ['One', 1.5, 1.6], ['every', 1.7, 1.8], ['NIGHT.', 1.9, 2.2]],
    L02: [["One's", 0.2, 0.4], ['PLENTY,', 0.5, 0.9], ['sweetie.', 1.0, 1.4]]
  }))
  const stunt = path.join(__dirname, '..', '..', '..', 'stunts', '_test_punch_stress.js')
  fs.writeFileSync(stunt, `module.exports = { edit: { story: ${JSON.stringify(path.relative(path.join(__dirname, '..', '..', '..'), story))}, punchStress: 'all' } }`)
  try {
    const r = spawnSync('node', [path.join(__dirname, '..', '..', '..', 'scripts', 'edit_args.js'), '_test_punch_stress'], { encoding: 'utf8' })
    const args = r.stdout.split('\n'), i = args.indexOf('--punch_stress')
    assert.ok(i >= 0, r.stderr)
    assert.deepStrictEqual(JSON.parse(args[i + 1]), [['L01', 1, 0.07], ['L01', 1.9, 0.07], ['L02', 0.5, 0.07]])
  } finally { fs.unlinkSync(stunt) }
})

test('edit.punchStress: true punches only the big moments (story.json "punch" lines, else first and last line), one each', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-ps2-'))
  const story = path.join(dir, 'st')
  fs.mkdirSync(path.join(story, 'voice'), { recursive: true })
  const words = {
    L01: [['My', 0.1, 0.2], ['GRANDMA', 0.3, 0.6], ['has', 0.7, 0.8], ['a', 0.9, 0.95], ['PORTAL.', 1.0, 1.4], ['One', 1.5, 1.6], ['every', 1.7, 1.8], ['NIGHT.', 1.9, 2.2]],
    L02: [['It', 0.1, 0.2], ['GLOWS.', 0.3, 0.6]],
    L03: [["One's", 0.2, 0.4], ['PLENTY,', 0.5, 0.9], ['sweetie.', 1.0, 1.4]]
  }
  fs.writeFileSync(path.join(story, 'voice', 'words.json'), JSON.stringify(words))
  const stunt = path.join(__dirname, '..', '..', '..', 'stunts', '_test_punch_big.js')
  fs.writeFileSync(stunt, `module.exports = { edit: { story: ${JSON.stringify(path.relative(path.join(__dirname, '..', '..', '..'), story))}, punchStress: true } }`)
  const run = () => {
    const r = spawnSync('node', [path.join(__dirname, '..', '..', '..', 'scripts', 'edit_args.js'), '_test_punch_big'], { encoding: 'utf8' })
    const args = r.stdout.split('\n'), i = args.indexOf('--punch_stress')
    assert.ok(i >= 0, r.stderr)
    return JSON.parse(args[i + 1])
  }
  try {
    assert.deepStrictEqual(run(), [['L01', 1.9, 0.07], ['L03', 0.5, 0.07]], 'no story.json marks: first and last line')
    fs.writeFileSync(path.join(story, 'story.json'), JSON.stringify({ lines: [{ id: 'L01' }, { id: 'L02', punch: true }, { id: 'L03' }] }))
    assert.deepStrictEqual(run(), [['L02', 0.3, 0.07]], 'only the marked line')
  } finally { fs.unlinkSync(stunt) }
})

// owner, 2026-11-11 (r:r8fa348): "I think hello buh should use the bright grading as well"
test("look 'bright_stunt': the 'bright' grade with no bloom or grain, a highlight shoulder, the stunt's own pushes", () => {
  const s = L.resolveLook('bright_stunt'), b = L.resolveLook('bright')
  assert.strictEqual(s.bright, true); assert.strictEqual(s.auto, true); assert.strictEqual(s.dof, false)
  assert.strictEqual(s.bloom, 0); assert.strictEqual(s.grain, 0); assert.strictEqual(s.rolloff, 0.8); assert.strictEqual(s.pushes, false)
  for (const [t, mood] of [[6000, null], [18000, null], [12300, null], [6000, 'tense']]) assert.deepStrictEqual(L.gradeAt(s, t, mood), L.gradeAt(b, t, mood), `the same grade at ${t}`)
  assert.strictEqual(L.resolveLook({ mood: 'bright_stunt', rolloff: 0.9, bloom: 0.2 }).rolloff, 0.9, 'fields override')
  // 'bright' itself (the stories' look) is untouched: no shoulder, the cinematic bloom default, its pushes
  for (const k of ['rolloff', 'bloom', 'grain', 'pushes']) assert.strictEqual(b[k], undefined, `'bright' has no ${k}`)
})

test("every stunt without its own look renders 'bright_stunt'; look: null opts out; stories keep theirs", () => {
  assert.strictEqual(L.stuntLook({}, 'speed_build'), 'bright_stunt')
  assert.strictEqual(L.stuntLook(undefined, 'tnt'), 'bright_stunt')
  assert.strictEqual(L.stuntLook({ look: null }, 'tnt'), null)
  assert.strictEqual(L.stuntLook({ look: false }, 'tnt'), false)
  assert.deepStrictEqual(L.stuntLook({ look: { grade: 'dawn' } }, 'brand_art'), { grade: 'dawn' })
  assert.strictEqual(L.stuntLook({ look: 'bright' }, 'story_new'), 'bright')
  assert.strictEqual(L.stuntLook({}, 'story_nitwit'), undefined, 'an old story without a look renders as published')
  assert.strictEqual(L.stuntLook({ edit: { story: 'stories/x' } }, 'x'), undefined)
  assert.ok(/LOOKS\.stuntLook\(STUNT_MOD, rec\.stunt\)/.test(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'render.js'), 'utf8')), 'render.js uses it')
})

test("'bright_stunt' keeps a vanilla day sky blue and its clouds white (the finishing pass in numpy: grade_preview.py)", () => {
  const py = `
import sys, json; sys.path.insert(0, 'scripts')
from grade_preview import grade, resolve
from PIL import Image
im = Image.new('RGB', (2, 1)); im.putpixel((0, 0), (120, 167, 255)); im.putpixel((1, 0), (189, 193, 201))
out = {}
for name in ('bright', 'bright_stunt'):
    L = resolve(name); g = json.loads(sys.argv[1]); L = {**L, 'grade': g, 'vignette': 0}
    o = grade(im, L); out[name] = [o.getpixel((0, 0)), o.getpixel((1, 0))]
print(json.dumps(out))`
  const g = L.gradeAt(L.resolveLook('bright'), 6000)
  const r = spawnSync('python3', ['-c', py, JSON.stringify(g)], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stderr)
  const o = JSON.parse(r.stdout)
  const [sky, cloud] = o.bright_stunt, [skyB] = o.bright
  assert.ok(sky[2] - sky[0] > 110 && sky[2] > sky[1] + 50, `sky stays blue: ${sky}`)
  assert.ok(Math.min(...cloud) > 215 && cloud[0] - sky[0] > 100, `clouds white, apart from the sky: ${cloud} vs ${sky}`)
  assert.ok(skyB[1] > sky[1] + 30, `without the shoulder the sky goes cyan-white: ${skyB}`)
})
