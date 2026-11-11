// Buh Stories numbers (owner 2026-11-11: manual uploads; judge by engaged views, stayed-to-watch, APV, subs per 1k):
// the ledger (hb uploaded), the Studio import into uploads/buhstories/, the decision-rule report (hb stories-report),
// and studio_import.py's HelloBuh output byte-for-byte unchanged (scripts/test_buhstories_metrics.py)
const test = require('node:test')
const assert = require('node:assert')
const cp = require('child_process')
const path = require('path')
const ROOT = path.join(__dirname, '..', '..', '..')

test('buhstories metrics: ledger, import, rules with citations, HelloBuh unchanged (scripts/test_buhstories_metrics.py)', () => {
  const r = cp.spawnSync('python3', ['-m', 'unittest', 'scripts/test_buhstories_metrics.py'], { cwd: ROOT, encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stdout + r.stderr)
})

test('./hb stories-report runs on an empty ledger and says what to do', () => {
  const os = require('os'), fs = require('fs')
  const td = fs.mkdtempSync(path.join(os.tmpdir(), 'hbm-'))
  const r = cp.spawnSync(path.join(ROOT, 'hb'), ['stories-report'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, HB_ROOT: td } })
  fs.rmSync(td, { recursive: true, force: true })
  assert.strictEqual(r.status, 0, r.stderr)
  assert.match(r.stdout, /nothing recorded yet: after each manual upload run \.\/hb uploaded/)
})

test('./hb uploaded refuses a bad video id without writing', () => {
  const os = require('os'), fs = require('fs')
  const td = fs.mkdtempSync(path.join(os.tmpdir(), 'hbm-'))
  fs.mkdirSync(path.join(td, 'stories', 'x'), { recursive: true })
  const r = cp.spawnSync(path.join(ROOT, 'hb'), ['uploaded', 'x', 'nope'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, HB_ROOT: td } })
  assert.strictEqual(r.status, 1)
  assert.match(r.stderr, /not a YouTube video id/)
  assert.ok(!fs.existsSync(path.join(td, 'uploads')))
  fs.rmSync(td, { recursive: true, force: true })
})
