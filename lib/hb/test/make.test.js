// hb make's stage logic on stubbed commands (no server, no render): skips what is fresh, stops at the first blocker,
// waits on Actions and the reviewer, resumes from the state file. Run: npm test
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const M = require('../make')
const { fixesFor } = require('../fixes')

class HbError extends Error {}
function harness () {
  const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-make-'))
  const WORK = path.join(ROOT, 'work'), HBDIR = path.join(WORK, 'hb'), VIDEOS = path.join(ROOT, 'videos')
  for (const d of ['stunts', 'out', 'work/hb']) fs.mkdirSync(path.join(ROOT, d), { recursive: true })
  fs.writeFileSync(path.join(ROOT, 'stunts', 'story_t.js'), 'module.exports = { edit: {} }\n')
  const old = Date.now() / 1000 - 3600
  fs.utimesSync(path.join(ROOT, 'stunts', 'story_t.js'), old, old)
  const calls = []
  const LAST = {}
  const env = { busy: false, renderDone: false }
  const name = 'story_t'
  const rp = path.join(WORK, `${name}.rec.json`), mp4 = path.join(ROOT, 'out', `${name}.mp4`)
  const CMDS = {
    record: () => { calls.push('record'); fs.writeFileSync(rp, '{}'); return 0 },
    check: () => { calls.push('check'); LAST.check = { ok: true, steps: [{ name: 'rec_check', exit: 0, summary: 'no blockers' }] }; return 0 },
    render: (f) => {
      if (f.fetch || f.wait) { calls.push('fetch'); if (!env.renderDone) return 3; fs.writeFileSync(mp4, 'mp4'); return 0 }
      calls.push('render'); fs.writeFileSync(path.join(WORK, `${name}.render_branch`), `render/${name}`); return 0
    },
    pace: () => { calls.push('pace'); LAST.pace = { exit: 0, text: 'OK: 0 blocker(s)' }; return 0 },
    review: () => {
      calls.push('review')
      const rv = path.join(HBDIR, `${name}.review.json`)
      fs.writeFileSync(rv, JSON.stringify({ rounds: [{ at: new Date().toISOString(), video_mtime: new Date(fs.statSync(mp4).mtimeMs).toISOString() }] }))
      return 0
    },
    publish: () => { calls.push('publish'); return 0 }
  }
  const H = {
    CMDS, HbError, ROOT, WORK, HBDIR, VIDEOS, LAST, fixesFor,
    mtime: (p) => { try { return fs.statSync(p).mtimeMs } catch (e) { return 0 } },
    rel: (p) => path.relative(ROOT, p),
    statusOf: () => ({ next: './hb record story_t' }),
    busy: () => ({ server: env.busy, procs: env.busy ? [{ kind: 'server', pid: 1, cwd: '/x' }] : [] }),
    sh: () => ({ status: 0, stdout: '' }),
    loadStunt: (n) => ({ mod: require(path.join(ROOT, 'stunts', `${n}.js`)), error: null }),
    lastRun: () => null,
    say: () => {}
  }
  return { H, calls, env, name, ROOT, WORK, HBDIR, rp, mp4 }
}

test('a fresh story runs to the Actions wait, resumes, waits for the reviewer, then the publish gate', () => {
  const T = harness()
  let st = M.make(T.H, T.name, {})
  assert.strictEqual(st.status, 'waiting')
  assert.strictEqual(st.stage, 'fetch')
  assert.deepStrictEqual(T.calls, ['record', 'check', 'render', 'fetch'])
  assert.ok(fs.existsSync(path.join(T.WORK, `${T.name}.make.json`)))
  // a new session: nothing fresh is redone, the render is not queued again
  T.calls.length = 0
  T.env.renderDone = true
  st = M.make(T.H, T.name, {})
  assert.deepStrictEqual(T.calls, ['fetch', 'pace', 'review'])
  assert.ok(!T.calls.includes('record') && !T.calls.includes('render'), `re-did work: ${T.calls}`)
  assert.strictEqual(st.stage, 'review')
  assert.strictEqual(st.status, 'waiting')
  assert.match(st.next, /--verdict/)
  // the reviewer says READY: the publish gate, which only publishes with --publish --notes
  const rv = path.join(T.HBDIR, `${T.name}.review.json`)
  const log = JSON.parse(fs.readFileSync(rv, 'utf8')); log.rounds[0].verdict = 'READY'; fs.writeFileSync(rv, JSON.stringify(log))
  T.calls.length = 0
  st = M.make(T.H, T.name, {})
  assert.strictEqual(st.stage, 'publish')
  assert.strictEqual(st.status, 'waiting')
  assert.ok(!T.calls.includes('publish'))
  st = M.make(T.H, T.name, { publish: true })
  assert.strictEqual(st.status, 'blocked')
  assert.match(st.blockers[0].fix, /--notes/)
  st = M.make(T.H, T.name, { publish: true, notes: 'test' })
  assert.strictEqual(st.status, 'done')
  assert.ok(T.calls.includes('publish'))
})

test('a busy server waits at record with the fix; a NOT READY verdict blocks with the notes', () => {
  const T = harness()
  T.env.busy = true
  let st = M.make(T.H, T.name, {})
  assert.strictEqual(st.status, 'waiting')
  assert.strictEqual(st.stage, 'record')
  assert.match(st.blockers[0].msg, /in use/)
  assert.ok(st.blockers[0].fix)
  T.env.busy = false; T.env.renderDone = true
  st = M.make(T.H, T.name, {})
  assert.strictEqual(st.stage, 'review')
  const rv = path.join(T.HBDIR, `${T.name}.review.json`)
  const log = JSON.parse(fs.readFileSync(rv, 'utf8')); log.rounds[0].verdict = 'NOT READY: 2 blockers'; log.rounds[0].notes = 'the door'; fs.writeFileSync(rv, JSON.stringify(log))
  st = M.make(T.H, T.name, {})
  assert.strictEqual(st.status, 'blocked')
  assert.match(st.blockers[0].msg, /the door/)
})

test('a failing command becomes a blocker with its fix; --from/--to bound the run', () => {
  const T = harness()
  T.H.CMDS.check = () => { throw new HbError('Timeout waiting for 4 ticks') }
  let st = M.make(T.H, T.name, { to: 'check' })
  assert.strictEqual(st.status, 'blocked')
  assert.strictEqual(st.stage, 'check')
  assert.match(st.blockers[0].fix, /--tries/)
  T.H.CMDS.check = () => 0
  T.H.LAST.check = { ok: true, steps: [] }
  st = M.make(T.H, T.name, { from: 'check', to: 'check' })
  assert.strictEqual(st.status, 'done to check')
  assert.match(st.next, /--from render/)
  assert.throws(() => M.make(T.H, T.name, { from: 'nope' }), /one of voice/)
})

test('fixes: the errors sessions hit print their fix', () => {
  const cases = [
    ['Timeout waiting for 2 ticks', /flaky/],
    ['  gemini-2.5-flash-preview-tts: 429 \'{"error": RESOURCE_EXHAUSTED', /quota/],
    ["ModuleNotFoundError: No module named 'whisper'", /faster-whisper|transformers/],
    ['remote: Permission to evanlin23/hello-buh.git denied to bot.', /prefix/],
    ['render/story_x: stale result (renders/result.json is from an older job', /older result/],
    ['E: Unable to locate package espeak-ng', /apt-get update/],
    ['OSError: [Errno 28] No space left on device', /disk/]
  ]
  for (const [text, want] of cases) assert.match(fixesFor(text).join(' '), want, text)
  assert.deepStrictEqual(fixesFor('08:36:40.429 COMMAND ERROR: No entity was found'), [], 'a timestamp is not a 429')
})
