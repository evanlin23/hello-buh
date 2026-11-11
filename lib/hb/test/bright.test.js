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
