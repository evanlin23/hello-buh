// Continuous takes (story.json "voice_takes": "beat"; owner, 2026-11-10: "ensuring the voice we get back is all like
// continuous already"): the picture follows the take. A beat's line marks come from the take's own offsets, with no
// gap inside the beat and no drift over it; the Python side (gate, slicing, narration, captions) is
// scripts/test_continuous.py, run from here.
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')
const { linesFrom, beatTicks, storyKit } = require('../../story')

// a beat of three lines (offsets 0, 1.237, 2.913 s in a 4.4 s take), then a plain line
const voice = {
  gap: 0.25,
  beats: { L01: { lines: ['L01', 'L02', 'L03'], offsets: [0, 1.237, 2.913], dur: 4.4 } },
  lines: {
    L01: { dur: 1.237, chunks: [[0.21, 0.9]], beat: 'L01', offset: 0, gap: 0 },
    L02: { dur: 1.676, chunks: [[0.18, 1.2]], beat: 'L01', offset: 1.237, gap: 0 },
    L03: { dur: 1.487, chunks: [[0.3, 1.1]], beat: 'L01', offset: 2.913 },
    L04: { dur: 2.0, chunks: [[0.2, 1.8]] }
  }
}
const story = { gap: 0.25, lines: ['L01', 'L02', 'L03', 'L04'].map(id => ({ id })) }

test('the last line of a take never ends before its own last word (+30 ms), whatever the next lead', () => {
  const v2 = JSON.parse(JSON.stringify(voice)); v2.lines.L04.chunks = [[0.9, 1.8]]   // a long lead on the next line
  const L = linesFrom(v2, story).line('L03')
  const r = beatTicks(L, Math.round(2.913 * 20), { id: 'L01', t0: 0 })
  assert.strictEqual(Math.round(2.913 * 20) + r.ticks, Math.ceil((2.913 + 1.1 + 0.03) * 20))
})

test('a beat line has no gap inside the take; the last line and plain lines keep the story gap', () => {
  const S = linesFrom(voice, story)
  assert.deepStrictEqual(['L01', 'L02', 'L03', 'L04'].map(id => [S.line(id).gap, S.line(id).inner, S.line(id).last]),
    [[0, true, false], [0, true, false], [0.25, false, true], [0.25, false, false]])
})

test('marks follow the take offsets to the tick, with no drift over the beat', () => {
  const S = linesFrom(voice, story)
  let now = 100, beat = null
  const marks = []
  for (const id of ['L01', 'L02', 'L03']) {
    const r = beatTicks(S.line(id), now, beat)
    marks.push(now); beat = r.beat; now += r.ticks
  }
  assert.deepStrictEqual(marks, [100, 100 + Math.round(1.237 * 20), 100 + Math.round(2.913 * 20)])
  // the take's last line ends word to word: L03's last word (2.913 + 1.1 s) + the gap, less L04's own lead (0.2 s),
  // not the take's file end (4.4 s) + the gap: the next word lands `gap` after the last one
  assert.strictEqual(now, 100 + Math.round((2.913 + 1.1 + 0.25 - 0.2) * 20))
})

test('a preroll inside the beat shortens the next line instead of pushing the take late; extra counts only at the end', () => {
  const S = linesFrom(voice, story)
  let r = beatTicks(S.line('L01'), 0, null)
  const late = beatTicks(S.line('L02'), r.ticks + 6, r.beat, 1)   // 6 ticks of preroll, and an `extra` that can't apply
  assert.strictEqual(late.late, 6)
  assert.strictEqual(r.ticks + 6 + late.ticks, Math.round(2.913 * 20))   // L03 still starts on the voice
  r = beatTicks(S.line('L03'), Math.round(2.913 * 20), late.beat, 1)
  assert.strictEqual(Math.round(2.913 * 20) + r.ticks, Math.round((2.913 + 1.1 + 0.25 + 1 - 0.2) * 20))   // word to word, + extra
})

test('K.line on the recording clock: marks land on the take offsets', async () => {
  const S = linesFrom(voice, story)
  const ctx = { tick: 0, stunt: {}, marks: [], mark (e, x) { this.marks.push([this.tick, e, x && x.id]) }, log () {} }
  const bot = { entity: { position: { x: 0, y: 64, z: 0, offset () { return this } }, yaw: 0, pitch: 0 }, controlState: {},
    look () {}, chat () {}, on () {}, removeListener () {}, waitForTicks: async (n) => { ctx.tick += n } }
  ctx.bot = bot
  const K = storyKit(ctx, S, { X: 0, Z: 0, F: 63 })
  for (const id of ['L01', 'L02', 'L03', 'L04']) {
    await K.line(id, () => {})
    if (id === 'L01') await K.preroll(4)
  }
  const at = ctx.marks.filter(m => m[1] === 'line').map(m => m[0])
  // L02's mark comes after the 4-tick preroll (late by 4), L03's is back on the take, L04's word `gap` after L03's last
  assert.deepStrictEqual(at, [0, Math.round(1.237 * 20) + 4, Math.round(2.913 * 20), Math.round((2.913 + 1.1 + 0.25 - 0.2) * 20)])
})

test('python: the take gate, slicing, narration and captions (scripts/test_continuous.py)', (t) => {
  const py = spawnSync('python3', ['-c', 'import numpy, PIL'])
  if (py.status !== 0) return t.skip('python3 with numpy and Pillow not found')
  const r = spawnSync('python3', ['-m', 'unittest', 'scripts/test_continuous.py'], { cwd: path.join(__dirname, '..', '..', '..'), encoding: 'utf8', timeout: 300000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})
