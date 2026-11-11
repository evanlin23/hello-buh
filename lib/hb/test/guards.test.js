// Process guards (docs/lessons.md, process lessons 2026-11-11):
// - the gates version on each package and the uploader skipping old ones: scripts/test_gates.py (run from here)
// - publish.js refuses from a checkout whose HEAD doesn't contain origin/main
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const cp = require('child_process')

const ROOT = path.join(__dirname, '..', '..', '..')
const ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' }
const git = (cwd, ...a) => cp.execFileSync('git', a, { cwd, env: ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const copy = (rel, to) => { fs.mkdirSync(path.dirname(path.join(to, rel)), { recursive: true }); fs.copyFileSync(path.join(ROOT, rel), path.join(to, rel)) }

// origin.git with main, a "shared" clone (this box) and an "other" clone (another session / the Actions runner)
function repos (t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-guards-'))
  t.after(() => fs.rmSync(d, { recursive: true, force: true }))
  git(d, 'init', '-q', '--bare', '-b', 'main', 'origin.git')
  git(d, 'clone', '-q', 'origin.git', 'other')
  const other = path.join(d, 'other')
  for (const f of ['scripts/render_on_actions.sh', 'scripts/publish.js', 'scripts/gates.py', 'lib/hb/gates.json']) copy(f, other)
  git(other, 'add', '-A'); git(other, 'commit', '-qm', 'base'); git(other, 'push', '-q', 'origin', 'HEAD:main')
  git(d, 'clone', '-q', 'origin.git', 'shared')
  return { d, other, shared: path.join(d, 'shared') }
}

test('python: gates version, uploader skip with reason, story exemption, stale checkout (scripts/test_gates.py)', (t) => {
  const r = cp.spawnSync('python3', ['-m', 'unittest', 'scripts/test_gates.py'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 })
  assert.strictEqual(r.status, 0, (r.stderr || '').split('\n').slice(-30).join('\n'))
})

test('publish.js refuses when HEAD does not contain origin/main, and names the fix', (t) => {
  const { d, other, shared } = repos(t)
  fs.mkdirSync(path.join(d, 'hb-videos', '.git'), { recursive: true })   // publish.js wants ../hb-videos
  fs.writeFileSync(path.join(other, 'x'), '1'); git(other, 'add', 'x'); git(other, 'commit', '-qm', 'newer main'); git(other, 'push', '-q', 'origin', 'HEAD:main')
  const r = cp.spawnSync('node', ['scripts/publish.js', 'nothing', '--no-push'], { cwd: shared, env: ENV, encoding: 'utf8' })
  assert.strictEqual(r.status, 1, r.stdout + r.stderr)
  assert.match(r.stderr, /refusing to publish: stale checkout/)
  assert.match(r.stderr, /Rebase on origin\/main/)
  git(shared, 'pull', '-q', '--ff-only', 'origin', 'main')
  const r2 = cp.spawnSync('node', ['scripts/publish.js', 'nothing', '--no-push'], { cwd: shared, env: ENV, encoding: 'utf8' })
  assert.doesNotMatch(r2.stderr, /refusing to publish/)   // (then: "skip nothing: no out/nothing.mp4")
  assert.match(r2.stderr, /skip nothing: no out\/nothing\.mp4/)
})
