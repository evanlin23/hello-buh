// Process guards (2026-11-10, "fix everything for the process"): script drift (a writer's fixed script that story.json
// never got), hb clean's plan, hb quota's report and the check report's blocker count (the preview label).
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const cp = require('child_process')
const P = require('../process')

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hbproc-'))

const SCRIPT = `# notes
| # | line | plays over |
|---|---|---|
| L01 | The OLD line. | S01 |

## r3
| # | who | line (bold = the spoken stress) | plays over |
|---|---|---|---|
| L01 | N | The DOG / on the **HILL**. | S01 |
| L02 | Buh | Sit, **BOY**. | S02 |
`

test('lastTable reads the last table with a line column (ids and texts)', () => {
  assert.deepStrictEqual(P.lastTable(SCRIPT), { L01: 'The DOG / on the **HILL**.', L02: 'Sit, **BOY**.' })
})

test('scriptDrift: a newer script whose lines differ warns; the same lines (CAPS, / and ** aside) do not', () => {
  const d = tmp()
  fs.writeFileSync(path.join(d, 'script_vNext.md'), SCRIPT)
  const times = { 'story.json': 1, 'script_vNext.md': 2 }
  const timeOf = (p) => times[path.basename(p)]
  fs.writeFileSync(path.join(d, 'story.json'), JSON.stringify({ lines: [{ id: 'L01', text: 'The dog on the hill hasn\'t moved.' }, { id: 'L02', text: 'Sit, boy.' }] }))
  const w = P.scriptDrift(d, timeOf)
  assert.strictEqual(w.length, 1)
  assert.deepStrictEqual(w[0].ids, ['L01'])
  fs.writeFileSync(path.join(d, 'story.json'), JSON.stringify({ lines: [{ id: 'L01', text: 'The dog / on the HILL.' }, { id: 'L02', text: 'Sit, BOY.' }] }))
  assert.deepStrictEqual(P.scriptDrift(d, timeOf), [])
  // story.json newer than the script: never a warning (the script is old notes)
  fs.writeFileSync(path.join(d, 'story.json'), JSON.stringify({ lines: [{ id: 'L01', text: 'Something else.' }] }))
  times['story.json'] = 3
  assert.deepStrictEqual(P.scriptDrift(d, timeOf), [])
  // no story.json at all
  fs.rmSync(path.join(d, 'story.json'))
  assert.match(P.scriptDrift(d, timeOf)[0].msg, /no story\.json/)
})

test('cleanPlan: old out/ intermediates and extra recording copies go; fresh files, mp4s and the canonical recording stay', () => {
  const root = tmp()
  cp.spawnSync('git', ['init', '-q', root])
  const old = (p) => { const t = Date.now() / 1000 - 3 * 86400; fs.utimesSync(p, t, t) }
  fs.mkdirSync(path.join(root, 'out', 'demo'), { recursive: true })
  fs.writeFileSync(path.join(root, 'out', 'demo', 'a.png'), 'x'); old(path.join(root, 'out', 'demo', 'a.png')); old(path.join(root, 'out', 'demo'))
  fs.writeFileSync(path.join(root, 'out', 'story_x.mp4'), 'x'); old(path.join(root, 'out', 'story_x.mp4'))
  fs.writeFileSync(path.join(root, 'out', 'fresh.wav'), 'x')
  fs.mkdirSync(path.join(root, 'work', 'hb'), { recursive: true })
  fs.writeFileSync(path.join(root, 'work', 'story_x.rec.json'), '{}')
  fs.writeFileSync(path.join(root, 'work', 'hb', 'story_x.abcd1234.rec.json'), '{}')
  fs.writeFileSync(path.join(root, 'work', 'story_y.rec.json'), '{}')
  const sh = (cmd, args) => { const r = cp.spawnSync(cmd, args, { cwd: root, encoding: 'utf8' }); return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' } }
  const { plan } = P.cleanPlan({ ROOT: root, sh })
  const paths = plan.map(x => path.relative(root, x.path)).sort()
  assert.deepStrictEqual(paths, [path.join('out', 'demo'), path.join('work', 'hb', 'story_x.abcd1234.rec.json')])
  fs.rmSync(root, { recursive: true, force: true })
})

test('quotaReport: today\'s counts per model and whether the last 429 still blocks', () => {
  const d = tmp(), f = path.join(d, 'quota.json')
  const now = new Date('2026-11-10T22:00:00Z')   // 14:00 Pacific, 2026-11-10
  fs.writeFileSync(f, JSON.stringify({
    days: { '2026-11-10': { m1: { requests: 7, ok: 5, 429: 2 } }, '2026-11-09': { m1: { requests: 10 } } },
    last_429: { m1: { at: '2026-11-10T21:59:00Z', scope: 'minute', retry_at: '2026-11-10T22:00:40Z' }, m2: { at: '2026-11-10T10:00:00Z', scope: 'day', retry_at: '2026-11-10T08:00:00Z' } }
  }))
  const r = P.quotaReport(f, now)
  assert.strictEqual(r.day, '2026-11-10')
  const m1 = r.models.find(m => m.model === 'm1'), m2 = r.models.find(m => m.model === 'm2')
  assert.deepStrictEqual([m1.requests, m1.ok, m1.r429, m1.blocked], [7, 5, 2, true])
  assert.deepStrictEqual([m2.requests, m2.blocked], [0, false])
  assert.match(P.quotaReport(path.join(d, 'none.json')).note, /^no .*none\.json yet/)
})

test('checkCounts: blockers counted by BLOCK findings, hits or the step\'s own count; broken steps apart', () => {
  const c = P.checkCounts({ steps: [
    { name: 'motion lint', exit: 1, hits: [1, 2] },
    { name: 'owner', exit: 1, findings: [{ level: 'BLOCK' }, { level: 'WARN' }, { level: 'BLOCK' }] },
    { name: 'rec_check', exit: 1, blocks: 3 },
    { name: 'framing', exit: 0, findings: [{ level: 'WARN' }] },
    { name: 'on-screen sound', exit: 2 }
  ] })
  assert.strictEqual(c.blockers, 7)
  assert.deepStrictEqual(c.broken, ['on-screen sound'])
})
