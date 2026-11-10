// hb: one command line for the HelloBuh pipeline, made for agents (docs/agent_guide.md). `./hb help`.
// Every command prints short, plain results (paths, counts, what to do next), `--json` prints one JSON object
// instead, and failures exit non-zero with the reason on stderr. Nothing here is silent: a step that can't run
// says so.
const fs = require('fs')
const os = require('os')
const path = require('path')
const cp = require('child_process')
const { Scene, loadRec, loadStunt, dayLabel, ROOT } = require('./scene')
const A = require('./analyze')

const VIDEOS = process.env.HB_VIDEOS || path.join(ROOT, '..', 'hb-videos')
const WORK = path.join(ROOT, 'work')
const HBDIR = path.join(WORK, 'hb')

// ---------------------------------------------------------------- plumbing
class HbError extends Error {}
const die = (msg) => { throw new HbError(msg) }
function parse (argv) {
  const pos = [], fl = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') { pos.push(...argv.slice(i + 1)); break }
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split(/=(.*)/s)
      const key = k.replace(/-/g, '_')
      if (v !== undefined) fl[key] = v
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--') && VALUED.has(key)) fl[key] = argv[++i]
      else fl[key] = true
    } else pos.push(a)
  }
  return { pos, fl }
}
const VALUED = new Set(['retakes', 'verdict', 'rec', 'cam', 'size', 'look', 'day_time', 'out', 'at', 'notes', 'only', 'tries', 'jobs', 'max', 'items', 'stunt', 'stunt_file', 'story', 'payoff', 'video'])
let JSON_OUT = false
const out = (human, obj) => { if (JSON_OUT) process.stdout.write(JSON.stringify(obj) + '\n'); else if (human) console.log(human) }
const hint = (s) => { if (!JSON_OUT) console.log(`next: ${s}`) }
const rel = (p) => path.relative(process.cwd(), p) || '.'
function sh (cmd, args, opts = {}) {
  const r = cp.spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, ...opts })
  if (r.error && r.error.code === 'ENOENT') return { status: 127, stdout: '', stderr: `${cmd}: not found` }
  return r
}
function run (cmd, args, opts = {}) {   // a long step: its output goes straight to the terminal
  if (!JSON_OUT) console.log(`+ ${cmd} ${args.join(' ')}`)
  const r = cp.spawnSync(cmd, args, { cwd: ROOT, stdio: JSON_OUT ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8', ...opts })
  return r.status === null ? 1 : r.status
}
const mtime = (p) => { try { return fs.statSync(p).mtimeMs } catch (e) { return 0 } }
const ago = (ms) => { if (!ms) return '-'; const s = (Date.now() - ms) / 1000; return s < 90 ? `${Math.round(s)} s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 172800 ? `${(s / 3600).toFixed(1)} h ago` : `${Math.round(s / 86400)} d ago` }
const freeGB = (p) => { const r = sh('df', ['-Pk', p]); const f = r.stdout.trim().split('\n').pop().split(/\s+/); return Number(f[3]) / 1048576 }

// busy: the one Minecraft server (fixed port) and the CPU-heavy renders
function busy () {
  const r = sh('pgrep', ['-af', 'server.jar|node bot.js|node render.js|preview.py|edit.py'])
  const procs = []
  for (const ln of (r.stdout || '').trim().split('\n').filter(Boolean)) {
    const [pid, ...rest] = ln.split(' ')
    const cmd = rest.join(' ')
    if (!/^(\S*\/)?(node|java|python3?(\.\d+)?)$/.test(rest[0] || '')) continue   // not shell wrappers or timeout
    let cwd = '?'
    try { cwd = fs.readlinkSync(`/proc/${pid}/cwd`) } catch (e) {}
    const kind = /server\.jar/.test(cmd) ? 'server' : /bot\.js/.test(cmd) ? 'bot' : /render\.js/.test(cmd) ? 'render' : 'edit'
    procs.push({ pid: Number(pid), kind, cwd, cmd: cmd.slice(0, 140) })
  }
  return { server: procs.some(p => p.kind === 'server' || p.kind === 'bot'), renders: procs.filter(p => p.kind === 'render').length, procs }
}

// <stunt> or a recording path -> { name, stunt module, rec path }
function resolve (arg, fl = {}) {
  if (!arg) die('which stunt? (e.g. story_nitwit, or a path to a .rec.json[.gz])')
  let name = arg, recPath = fl.rec || null, recFrom = null
  if (/\.json(\.gz)?$/.test(arg) && fs.existsSync(arg)) { recPath = path.resolve(arg); name = null }
  if (!recPath) {
    const cands = [[path.join(WORK, `${name}.rec.json`), 'work'], [path.join(VIDEOS, 'shorts', name, 'recording.json.gz'), 'published package']]
    const found = cands.filter(([p]) => fs.existsSync(p))
    if (!found.length) die(`no recording for ${name}: looked in ${cands.map(c => rel(c[0])).join(' and ')}. Record it: ./hb record ${name}`)
    ;[recPath, recFrom] = found[0]
  } else recPath = path.resolve(recPath)
  const rec = loadRec(recPath)
  if (!name) name = fl.stunt || rec.stunt
  let stuntName = fl.stunt || rec.stunt || name
  const notes = []
  // a published Short whose stunt isn't in this checkout (made on another branch): use the package's own copy,
  // placed in stunts/ so its requires (../lib/...) resolve (stunts/.hb_pkg_* is gitignored)
  const pkgSrc = fl.stunt_file ? path.resolve(fl.stunt_file) : path.join(VIDEOS, 'shorts', name, 'source', `${stuntName}.js`)
  if ((fl.stunt_file || !fs.existsSync(path.join(ROOT, 'stunts', `${stuntName}.js`))) && fs.existsSync(pkgSrc)) {
    const alias = `.hb_pkg_${stuntName}`
    fs.copyFileSync(pkgSrc, path.join(ROOT, 'stunts', `${alias}.js`))
    notes.push(fl.stunt_file ? `using ${rel(pkgSrc)} for the stunt (its edit and marks)` : `stunts/${stuntName}.js is not in this checkout: using the published package's copy (its edit and marks; lib/ is this checkout's)`)
    stuntName = alias
  }
  const { mod, error } = loadStunt(stuntName)
  if (error) die(error)
  if (rec.stunt && rec.stunt !== stuntName && !stuntName.startsWith('.hb_pkg_')) notes.push(`the recording is of ${rec.stunt}, read with stunts/${stuntName}.js`)
  if (recFrom === 'published package' && !stuntName.startsWith('.hb_pkg_')) {
    const src = path.join(VIDEOS, 'shorts', name, 'source', `${stuntName}.js`)
    if (fs.existsSync(src) && fs.readFileSync(src, 'utf8') !== fs.readFileSync(path.join(ROOT, 'stunts', `${stuntName}.js`), 'utf8')) notes.push(`stunts/${stuntName}.js differs from the published package's copy: marks and the edit come from this checkout`)
  }
  if (recFrom === 'work' && mtime(path.join(ROOT, 'stunts', `${stuntName}.js`)) > mtime(recPath)) notes.push(`stunts/${stuntName}.js is newer than the recording: re-record to see the change (./hb record ${stuntName})`)
  return { name, stuntName, stunt: mod, rec, recPath, recFrom: recFrom || 'given', notes }
}
// render.js and the Python tools read a plain .rec.json
function plainRec (t) {
  if (!t.recPath.endsWith('.gz')) return t.recPath
  fs.mkdirSync(HBDIR, { recursive: true })
  const p = path.join(HBDIR, `${t.name}.rec.json`)
  if (mtime(p) < mtime(t.recPath)) fs.writeFileSync(p, JSON.stringify(t.rec))
  return p
}
function clock (t, specs = []) {
  const r = sh('python3', ['scripts/hb_time.py', t.stuntName, t.recPath, ...specs.map(String)])
  let j = null
  try { j = JSON.parse((r.stdout || '').trim().split('\n').pop()) } catch (e) { die(`scripts/hb_time.py failed:\n${(r.stderr || r.stdout || '').trim().slice(-2000)}`) }
  if (j.errors && j.errors.length) die(j.errors.join('\n'))
  return j
}
// a stunt with movie-engine shots or a non-player narrator (stunt.self): take the cameras from render.js itself
function sceneFor (t) {
  const scene = new Scene(t.rec, { stunt: t.stunt })
  if ((t.stunt.shots || t.stunt.self) && /CAM_PROBE/.test(fs.readFileSync(path.join(ROOT, 'render.js'), 'utf8'))) {
    const r = sh('node', ['render.js', plainRec(t), os.tmpdir()], { env: { ...process.env, CAM_PROBE: 'all' } })
    if (r.status !== 0) die(`render.js CAM_PROBE failed: ${(r.stderr || '').trim().split('\n').slice(-4).join(' | ')}`)
    scene.setProbe(r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l)))
  }
  return scene
}
function printNotes (t) { if (!JSON_OUT) for (const n of t.notes) console.log(`note: ${n}`) }

// ---------------------------------------------------------------- doctor
function cmdDoctor (fl) {
  const checks = []
  const ck = (name, ok, detail, fix, level = 'error') => checks.push({ name, ok: !!ok, level: ok ? 'ok' : level, detail, fix: ok ? undefined : fix })
  const ver = (fs.readFileSync(path.join(ROOT, 'versions.env'), 'utf8').match(/^MC_VERSION=(.*)$/m) || [])[1]
  ck('node >= 22', Number(process.versions.node.split('.')[0]) >= 22, process.versions.node, 'install Node 22')
  const nm = path.join(ROOT, 'node_modules')
  ck('node_modules', fs.existsSync(nm), fs.existsSync(nm) ? (fs.lstatSync(nm).isSymbolicLink() ? `link -> ${fs.readlinkSync(nm)}` : 'installed') : 'missing', 'npm ci (in a worktree: ln -s /home/user/hello-buh/node_modules .)')
  for (const m of ['mineflayer', 'playwright', 'three', 'prismarine-chunk', 'minecraft-data', 'express', 'vec3']) {
    let ok = true; try { require.resolve(m, { paths: [ROOT] }) } catch (e) { ok = false }
    ck(`npm ${m}`, ok, ok ? 'ok' : 'missing', 'npm ci')
  }
  try { const exe = require(require.resolve('playwright', { paths: [ROOT] })).chromium.executablePath(); ck('chromium (playwright)', fs.existsSync(exe), exe, 'npx playwright install chromium') } catch (e) { ck('chromium (playwright)', false, e.message.split('\n')[0], 'npm ci && npx playwright install chromium') }
  const jv = sh('java', ['-version']); const jm = /version "(\d+)/.exec(jv.stderr || '')
  ck('java >= 21', jm && Number(jm[1]) >= 21, jm ? jm[1] : 'not found', 'install a Java 21 JDK (the server needs it; only `hb record` does)', 'warn')
  for (const b of ['ffmpeg', 'ffprobe', 'git', 'python3']) { const r = sh('which', [b]); ck(b, r.status === 0, (r.stdout || '').trim() || 'not found', `apt-get update && apt-get install -y ${b === 'ffprobe' ? 'ffmpeg' : b}`) }
  const py = sh('python3', ['-c', 'import PIL, numpy; print(PIL.__version__, numpy.__version__)'])
  ck('python PIL + numpy', py.status === 0, (py.stdout || py.stderr || '').trim().split('\n').pop(), 'pip install pillow numpy')
  const w = path.join(ROOT, 'work')
  const inWorktree = fs.existsSync(path.join(ROOT, '.git')) && fs.statSync(path.join(ROOT, '.git')).isFile()
  ck('work/ (server, assets, recordings)', fs.existsSync(w), fs.existsSync(w) ? (fs.lstatSync(w).isSymbolicLink() ? `link -> ${fs.readlinkSync(w)}` : 'directory') : 'missing',
    inWorktree ? 'ln -s /home/user/hello-buh/work work (docs/worker.md "Working in a git worktree")' : 'mkdir work; ./run.sh fetches the rest', inWorktree ? 'error' : 'warn')
  if (inWorktree && fs.existsSync(w) && !fs.lstatSync(w).isSymbolicLink()) ck('work/ linked in a worktree', false, 'a real directory', 'link the main checkout\'s work/ or run.sh re-downloads and rebuilds the server and assets', 'warn')
  ck('server jar', fs.existsSync(path.join(w, 'server', 'server.jar')), rel(path.join(w, 'server', 'server.jar')), 'python3 scripts/fetch.py', 'warn')
  ck(`client jar ${ver}`, fs.existsSync(path.join(w, 'client', `${ver}.jar`)), rel(path.join(w, 'client', `${ver}.jar`)), 'python3 scripts/fetch.py')
  const res = path.join(w, 'assets', ver || '?', 'resolved.json')
  const stale = mtime(res) && (mtime(path.join(ROOT, 'renderer', 'build_assets.py')) > mtime(res) || mtime(path.join(ROOT, 'renderer', 'prepare.js')) > mtime(res))
  ck('renderer assets', mtime(res) && !stale, mtime(res) ? (stale ? 'older than renderer/build_assets.py or prepare.js (run.sh rebuilds them, ~40 s)' : rel(res)) : 'missing',
    `python3 renderer/build_assets.py ${ver} && node renderer/prepare.js ${ver}`, stale ? 'warn' : 'error')
  const ncs = path.join(ROOT, 'songs', 'ncs')
  const nsongs = fs.existsSync(ncs) ? fs.readdirSync(ncs).filter(f => f.endsWith('.mp3')).length : 0
  ck('NCS songs (publish adds one)', nsongs > 0, `${nsongs} mp3s in songs/ncs`, 'python3 scripts/ncs.py (in a worktree: ln -s /home/user/hello-buh/songs .)', 'warn')
  const tts = path.join(os.homedir(), '.hb-tts', 'bin', 'python')
  if (fs.existsSync(tts)) {
    const r = sh(tts, ['-c', 'import importlib.util as u; print(all(u.find_spec(m) for m in ("kokoro","soundfile","torch")))']); ck('Kokoro TTS venv', (r.stdout || '').trim() === 'True', tts, 'docs/stories.md "Setup"', 'warn')
    const v = sh(tts, ['-c', 'import importlib.util as u; print(" ".join(m for m in ("transformers","resemblyzer") if not u.find_spec(m)))'])
    const miss = (v.stdout || '').trim()
    ck('voice checks (Whisper word cuts, speaker check)', !miss && v.status === 0, miss ? `missing in the TTS venv: ${miss}` : 'transformers + resemblyzer', `${tts.replace(/python$/, 'pip')} install transformers && ${tts.replace(/python$/, 'pip')} install --no-deps resemblyzer`, 'warn')
  }
  else ck('Kokoro TTS venv', false, `no ${tts}`, 'docs/stories.md "Setup" (~6 min, ~2.5 GB; only for the Kokoro narrator)', 'warn')
  ck('espeak-ng', sh('which', ['espeak-ng']).status === 0, 'Kokoro\'s phonemizer', 'apt-get update && apt-get install -y espeak-ng', 'warn')
  if (!fl.offline) {
    const r = sh('curl', ['-s', '-m', '10', '-o', '/dev/null', '-w', '%{http_code}', '-H', 'x-goog-api-key: proxy', 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1'])
    ck('Gemini API (voices)', r.stdout === '200', `HTTP ${r.stdout || 'no answer'} (listing models; no TTS quota used)`, 'the session proxy injects the key; without it, voices need GEMINI_API_KEY', 'warn')
    const g = sh('git', ['ls-remote', '--heads', 'origin', 'main'], { timeout: 20000 })
    ck('git remote', g.status === 0, g.status === 0 ? 'origin reachable' : (g.stderr || '').trim().slice(0, 120), 'check the GitHub proxy (render on Actions and publish push to origin)')
  }
  ck('videos worktree', fs.existsSync(path.join(VIDEOS, 'shorts')), rel(VIDEOS), 'git fetch origin videos && git worktree add ../hb-videos videos (publish writes there)', 'warn')
  const gb = freeGB(ROOT)
  ck('disk', gb > 5, `${gb.toFixed(1)} GB free`, 'a local full render needs ~4 GB of frames: render on Actions (./hb render <stunt>), and delete work/preview_*, work/*.frames you are done with', gb > 2 ? 'warn' : 'error')
  const b = busy()
  ck('Minecraft server free', !b.server, b.server ? b.procs.filter(p => p.kind !== 'render').map(p => `${p.kind} pid ${p.pid} in ${p.cwd}`).join('; ') : 'free', 'one server batch at a time: wait for it (./hb status shows it)', 'warn')
  const bad = checks.filter(c => c.level === 'error'), warn = checks.filter(c => c.level === 'warn')
  out(checks.map(c => `${c.level === 'ok' ? 'ok   ' : c.level === 'warn' ? 'WARN ' : 'FAIL '} ${c.name}: ${c.detail}${c.fix ? `\n        fix: ${c.fix}` : ''}`).join('\n') + `\n${bad.length ? `${bad.length} failing` : 'ready'}${warn.length ? `, ${warn.length} warning(s)` : ''}`, { ok: !bad.length, checks })
  return bad.length ? 1 : 0
}

// ---------------------------------------------------------------- status
function gitShow (ref, p) { const r = sh('git', ['show', `${ref}:${p}`]); return r.status === 0 ? r.stdout : null }
function statusOf (name, fl) {
  const s = { name }
  const sf = path.join(ROOT, 'stunts', `${name}.js`)
  s.stunt = fs.existsSync(sf) ? { path: rel(sf), modified: ago(mtime(sf)) } : null
  let mod = null; if (s.stunt) { const l = loadStunt(name); mod = l.mod; if (l.error) s.stunt.error = l.error }
  const sd = mod && mod.edit && mod.edit.story
  if (sd) {
    const sj = path.join(ROOT, sd, 'story.json'), vj = path.join(ROOT, sd, 'voice', 'voice.json')
    // stale = a line whose text changed since it was voiced (mtimes lie in a fresh checkout)
    s.voice = { story: rel(sj), voice: 'missing', stale: false }
    if (fs.existsSync(vj) && fs.existsSync(sj)) {
      const norm = (x) => String(x || '').replace(/ \/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
      const vo = JSON.parse(fs.readFileSync(vj, 'utf8')).lines || {}, st = JSON.parse(fs.readFileSync(sj, 'utf8'))
      const bad = (st.lines || []).filter(l => !vo[l.id] || norm(vo[l.id].text) !== norm(l.say || l.text)).map(l => l.id)
      s.voice = { story: rel(sj), voice: bad.length ? `${bad.length} line(s) not voiced as written: ${bad.slice(0, 6).join(' ')}` : 'ok', stale: bad.length > 0, lines: bad }
    }
  }
  const rp = path.join(WORK, `${name}.rec.json`)
  if (fs.existsSync(rp)) s.recording = { path: rel(rp), recorded: ago(mtime(rp)), stale: mtime(sf) > mtime(rp) }
  const pv = path.join(WORK, `preview_${name}`, 'preview.mp4')
  if (fs.existsSync(pv)) s.preview = { path: rel(pv), made: ago(mtime(pv)), stale: mtime(pv) < mtime(rp) }
  const mp4 = path.join(ROOT, 'out', `${name}.mp4`)
  if (fs.existsSync(mp4)) s.render = { path: rel(mp4), made: ago(mtime(mp4)), stale: mtime(mp4) < mtime(rp) }
  const rr = gitShow(`origin/render/${name}`, 'renders/result.json')
  if (rr) { try { const j = JSON.parse(rr); s.actions = { branch: `render/${name}`, status: j.status, run: j.run } } catch (e) {} }
  else if (sh('git', ['rev-parse', '-q', '--verify', `origin/render/${name}`]).status === 0) s.actions = { branch: `render/${name}`, status: 'rendering (or failed before writing a result)' }
  const rv = path.join(HBDIR, `${name}.review.json`)
  if (fs.existsSync(rv)) s.reviews = JSON.parse(fs.readFileSync(rv, 'utf8')).rounds.length
  const md = path.join(VIDEOS, 'shorts', name, 'metadata.json')
  if (fs.existsSync(md)) { const j = JSON.parse(fs.readFileSync(md, 'utf8')); s.published = { status: j.status, at: j.published_at, song: j.song && j.song.title } }
  const up = JSON.parse(gitShow('origin/main', 'uploads/uploads.json') || fs.readFileSync(path.join(ROOT, 'uploads', 'uploads.json'), 'utf8'))
  if (up[name]) s.uploaded = { video: up[name].video_id, on: up[name].uploaded }
  const q = (gitShow('origin/main', 'uploads/queue.txt') || '').split('\n').map(x => x.trim())
  if (q.includes(name)) s.queued = q.filter(x => x && !x.startsWith('#')).indexOf(name) + 1
  const pub = path.join(VIDEOS, 'shorts', name, 'recording.json.gz')
  if (!s.recording && fs.existsSync(pub)) s.recording = { path: rel(pub), recorded: 'published copy', stale: false }
  // the next step
  if (s.uploaded) s.next = 'done (uploaded)'
  else if (s.published && s.published.status === 'ready') s.next = 'done (published; the uploader takes it from the queue)'
  else if (!s.stunt) s.next = `write stunts/${name}.js (docs/agent_guide.md)`
  else if (s.voice && (s.voice.voice === 'missing' || s.voice.stale)) s.next = `voice the script: ./hb voice ${name}`
  else if (!s.recording || s.recording.stale) s.next = `./hb record ${name}`
  else if (s.actions && s.actions.status === 'done' && !s.render) s.next = `./hb render ${name} --fetch`
  else if (!s.render && !s.actions) s.next = `./hb check ${name}, ./hb sheet ${name}, then ./hb render ${name}`
  else if (!s.render) s.next = `./hb render ${name} --wait`
  else if (s.render.stale) s.next = `the recording is newer than out/${name}.mp4: ./hb render ${name}`
  else if (!s.published) s.next = `./hb review ${name}`
  else s.next = `fix and re-review, then ./hb publish ${name}`
  return s
}
function cmdStatus (fl, pos) {
  const b = busy()
  let names = pos
  if (!names.length) {
    const recent = fs.readdirSync(WORK).filter(f => f.endsWith('.rec.json') && Date.now() - mtime(path.join(WORK, f)) < 2 * 86400e3).map(f => f.replace('.rec.json', ''))
    names = [...new Set([...recent, ...fs.readdirSync(path.join(ROOT, 'stunts')).filter(f => /^story_.*\.js$/.test(f)).map(f => f.slice(0, -3))])].filter(n => fs.existsSync(path.join(ROOT, 'stunts', `${n}.js`))).sort()
  }
  const rows = names.map(n => statusOf(n, fl))
  const gb = freeGB(ROOT)
  const lines = []
  lines.push(`server: ${b.server ? 'BUSY (' + b.procs.filter(p => p.kind === 'server' || p.kind === 'bot').map(p => `${p.kind} ${p.pid} in ${p.cwd}`).join(', ') + ')' : 'free'}; render.js processes on this box: ${b.renders}; disk ${gb.toFixed(1)} GB free`)
  for (const s of rows) {
    const bits = []
    if (s.stunt && s.stunt.error) bits.push(`STUNT BROKEN: ${s.stunt.error}`)
    if (s.voice) bits.push(`voice ${s.voice.voice}`)
    bits.push(s.recording ? `rec ${s.recording.recorded}${s.recording.stale ? ' (STALE: stunt is newer)' : ''}` : 'no rec')
    if (s.preview) bits.push(`preview ${s.preview.made}${s.preview.stale ? ' (stale)' : ''}`)
    if (s.actions) bits.push(`actions ${s.actions.status}`)
    if (s.render) bits.push(`out ${s.render.made}${s.render.stale ? ' (STALE: rec is newer)' : ''}`)
    if (s.reviews) bits.push(`reviews ${s.reviews}`)
    if (s.published) bits.push(`published ${s.published.status}`)
    if (s.queued) bits.push(`queue #${s.queued}`)
    if (s.uploaded) bits.push(`uploaded ${s.uploaded.on}`)
    lines.push(`${s.name.padEnd(24)} ${bits.join(' | ')}\n${' '.repeat(25)}next: ${s.next}`)
  }
  out(lines.join('\n'), { server: b, diskGB: +gb.toFixed(1), shorts: rows })
  return 0
}

// ---------------------------------------------------------------- stills and sheets
function parseSize (s, dw, dh) {
  if (!s) return [dw, dh]
  const m = /^(\d+)x(\d+)$/.exec(s); if (m) return [Number(m[1]) & ~1, Number(m[2]) & ~1]
  const w = Number(s); if (w > 0) return [w & ~1, Math.round(w * 1011 / 1080) & ~1]
  die(`--size ${s}: use WxH (540x506) or a width`)
}
// render the given source ticks in ONE render.js process (the world is meshed once) and return the PNGs
function renderTicks (t, items, fl, dir) {
  const [w, h] = parseSize(fl.size, 540, 506)
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  const order = items.map((it, i) => [it.tick, i]).sort((a, b) => a[0] - b[0])
  const env = { ...process.env, ONLY: order.map(o => o[0]).join(',') }
  delete env.FRAMES
  if (fl.cam) env.CAM = fl.cam; else delete env.CAM
  const src = fs.readFileSync(path.join(ROOT, 'render.js'), 'utf8')
  if (fl.look) { if (!/LOOK_JSON/.test(src)) die('--look needs the movie engine\'s render.js (LOOK_JSON: docs/movie_engine.md); this one has no look pass'); env.LOOK_JSON = fl.look }
  if (fl.day_time) { if (!/DAY_TIME/.test(src)) die('--day-time needs the movie engine\'s render.js (DAY_TIME); this one renders the recorded time'); env.DAY_TIME = String(fl.day_time) }
  const recp = plainRec(t)
  const log = path.join(dir, 'render.log')
  const t0 = Date.now()
  if (!JSON_OUT) console.log(`rendering ${items.length} still(s) at ${w}x${h} in one render.js (~25 s to load the world, then ~2-8 s each)...`)
  const r = cp.spawnSync('node', ['render.js', recp, dir, '20', String(w), String(h)], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 1 << 28 })
  fs.writeFileSync(log, (r.stdout || '') + (r.stderr || ''))
  if (r.status !== 0) die(`render.js failed (exit ${r.status}); log: ${rel(log)}\n${((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-12).join('\n')}`)
  const res = []
  order.forEach(([tick, i], f) => {
    const src = path.join(dir, `f${String(f).padStart(5, '0')}.png`)
    if (!fs.existsSync(src)) die(`render.js wrote no ${rel(src)} (log: ${rel(log)})`)
    const it = items[i]
    const nm = `${String(i + 1).padStart(2, '0')}_${it.out !== null && it.out !== undefined ? it.out.toFixed(2) + 's' : 'tick' + tick}_${String(it.spec).replace(/[^\w.+-]/g, '_')}.png`
    fs.renameSync(src, path.join(dir, nm))
    res.push({ ...it, png: path.join(dir, nm) })
  })
  fs.unlinkSync(log)
  return { stills: res, secs: (Date.now() - t0) / 1000, size: [w, h] }
}
function contactSheet (stills, file, cols, title) {
  const spec = { title, cols, out: file, items: stills.map(s => ({ path: s.png, label: s.label, sub: s.sub || '' })) }
  const r = sh('python3', ['scripts/hb_sheet.py'], { input: JSON.stringify(spec) })
  if (r.status !== 0) die(`scripts/hb_sheet.py failed: ${(r.stderr || '').trim().slice(-800)}`)
  return file
}
function cmdStill (fl, pos) {
  const [target, ...specs] = pos
  if (!specs.length) die('which moments? e.g. ./hb still story_nitwit L03 L03+1.5 12.0 end   (output seconds, line ids, marks like cut#3, tick:450)')
  const t = resolve(target, fl); printNotes(t)
  const c = clock(t, specs)
  const items = c.resolved.map(r => ({ spec: r.spec, out: r.out, tick: r.tick, part: r.part }))
  for (const it of items) if (it.tick === null) die(`${it.spec} is in the replay (a third-person pass): render it with ./hb preview`)
  const dir = path.resolve(fl.out || path.join(HBDIR, 'stills', t.name))
  const r = renderTicks(t, items, fl, dir)
  for (const s of r.stills) { s.label = `${s.out !== null && s.out !== undefined ? s.out.toFixed(2) + ' s' : 'off-Short'}  ${s.spec}`; s.sub = `tick ${s.tick}${fl.cam ? ' cam ' + fl.cam : ''}` }
  let sheet = null
  if (r.stills.length > 1) sheet = contactSheet(r.stills, path.join(dir, 'sheet.jpg'), Math.min(4, r.stills.length), `${t.name}: stills`)
  out(r.stills.map(s => `${rel(s.png)}   ${s.label} (tick ${s.tick})`).join('\n') + (sheet ? `\nsheet: ${rel(sheet)}` : '') + `\n${r.stills.length} still(s) in ${r.secs.toFixed(0)} s (game view only: captions and HUD are added by the edit; see them in ./hb preview)`,
    { stills: r.stills.map(s => ({ spec: s.spec, out: s.out, tick: s.tick, png: s.png })), sheet, secs: r.secs, size: r.size })
  hint(`read the PNGs; ./hb describe ${t.name} ${specs[0]} for the same moment as text`)
  return 0
}
function cmdSheet (fl, pos) {
  const t = resolve(pos[0], fl); printNotes(t)
  const c = clock(t)
  const at = String(fl.at || 'mid').split(',')
  const items = []
  for (const s of c.shots) {
    const [a, b] = s.out
    for (const k of at) {
      const o = k === 'first' ? Math.min(b, a + 2 / 60) : k === 'last' ? Math.max(a, b - 2 / 60) : (a + b) / 2
      items.push({ spec: `${o.toFixed(3)}`, out: +o.toFixed(3), shot: s, where: k })
    }
  }
  const c2 = clock(t, items.map(i => i.spec))
  c2.resolved.forEach((r, i) => { items[i].tick = r.tick })
  const keep = items.filter(i => i.tick !== null)
  const dir = path.resolve(fl.out || path.join(HBDIR, 'sheet', t.name))
  const r = renderTicks(t, keep, { size: fl.size || '320x300', cam: fl.cam, look: fl.look, day_time: fl.day_time }, dir)
  for (const s of r.stills) { s.label = `#${s.shot.n} ${s.where} ${s.out.toFixed(2)}s`; s.sub = `${s.shot.line || ''}${s.shot.shot ? ' ' + s.shot.shot : ''}${s.shot.hook ? ' HOOK' : ''} (${(s.shot.out[1] - s.shot.out[0]).toFixed(1)}s shot)` }
  const per = 24, sheets = []
  for (let i = 0; i < r.stills.length; i += per) sheets.push(contactSheet(r.stills.slice(i, i + per), path.join(dir, `sheet_${String(i / per + 1).padStart(2, '0')}.jpg`), at.length === 1 ? 6 : at.length * 2, `${t.name}: ${c.shots.length} shots, ${c.length.toFixed(1)} s`))
  for (const s of r.stills) fs.unlinkSync(s.png)
  out(`${sheets.map(rel).join('\n')}\n${c.shots.length} shots, ${r.stills.length} frames (${at.join('+')} of each) in ${r.secs.toFixed(0)} s`, { sheets, shots: c.shots.length, frames: r.stills.length, secs: r.secs })
  hint(`read every sheet; ./hb framing ${t.name} and ./hb continuity ${t.name} check the same shots as text`)
  return 0
}

// ---------------------------------------------------------------- describe / continuity / framing
function cmdDescribe (fl, pos) {
  const [target, ...specs] = pos
  const t = resolve(target, fl); printNotes(t)
  const c = clock(t, specs)
  let list = c.resolved
  if (!specs.length) {   // no time: one look per shot, at its middle
    const c2 = clock(t, c.shots.map(s => ((s.out[0] + s.out[1]) / 2).toFixed(3)))
    list = c2.resolved
  }
  const scene = sceneFor(t)
  const story = A.storyOf(t.stunt)
  const res = list.slice().sort((a, b) => a.tick - b.tick).map(r => A.describe(scene, r.tick, { out: r.out, story, marks: c.marks, cam: fl.cam, items: !!fl.items }))
  out(res.map(A.describeText).join('\n\n'), { stunt: t.stuntName, rec: t.recPath, moments: res })
  hint(`./hb still ${t.name} ${specs[0] || (res[0] && res[0].out !== null ? res[0].out.toFixed(2) : '0')} to see it`)
  return 0
}
function shotsReport (t, fl) {
  const c = clock(t)
  const scene = sceneFor(t)
  // story.json v2: each line's planned shot (lines[].shot -> shots[]: size, place), compared in hb framing
  const story = A.storyOf(t.stunt)
  const planned = new Map(((story && story.st.shots) || []).map(s => [s.id, s]))
  const plan = planned.size ? (id) => { const l = (story.st.lines || []).find(l => l.id === id); return l && l.shot ? planned.get(l.shot) || null : null } : null
  const r = A.analyzeShots(scene, c.shots, { cam: fl.cam, plan })
  return { c, ...r }
}
function findingLines (fs_) {
  return fs_.map(f => `${f.level.padEnd(7)} ${f.out.toFixed(2).padStart(6)} s  shot ${String(f.shot).padStart(2)}${f.line ? ' ' + f.line : ''}: ${f.msg}`)
}
const FRAMING_KINDS = ['tight', 'establish', 'zoom', 'size']
function cmdContinuity (fl, pos) {
  const t = resolve(pos[0], fl); printNotes(t)
  const { rows, findings } = shotsReport(t, fl)
  const keep = findings.filter(f => !FRAMING_KINDS.includes(f.kind))
  const lines = ['shot  out(s)        line  time            weather  held        camera                     cast in view']
  for (const r of rows) lines.push(`${String(r.n).padStart(3)}  ${r.out[0].toFixed(2).padStart(5)}-${r.out[1].toFixed(2).padEnd(6)} ${String(r.line || '').padEnd(5)} ${String(r.time).padEnd(15)} ${String(r.weather).padEnd(8)} ${String(r.held || '-').padEnd(11)} ${String(r.camera || '').padEnd(26)} ${(r.cast || []).slice(0, 4).join(', ') || '-'}${(r.cast || []).length > 4 ? ` +${r.cast.length - 4}` : ''}`)
  lines.push('', ...(keep.length ? findingLines(keep) : ['no continuity findings']))
  const nP = keep.filter(f => f.level === 'PROBLEM').length
  lines.push(`${nP} problem(s), ${keep.filter(f => f.level === 'WARN').length} warning(s), ${keep.filter(f => f.level === 'NOTE').length} note(s)`)
  out(lines.join('\n'), { shots: rows, findings: keep })
  if (keep.length) hint(`check a flagged cut with ./hb still ${t.name} <out-1> <out+0.1> or ./hb describe ${t.name} <out>`)
  return nP ? 1 : 0
}
function cmdFraming (fl, pos) {
  const t = resolve(pos[0], fl); printNotes(t)
  const { rows, findings } = shotsReport(t, fl)
  const keep = findings.filter(f => FRAMING_KINDS.includes(f.kind))
  const lines = ['shot  out(s)        dur   place  size                  subject (share of frame height)   depth  planned']
  for (const r of rows) lines.push(`${String(r.n).padStart(3)}  ${r.out[0].toFixed(2).padStart(5)}-${r.out[1].toFixed(2).padEnd(6)} ${r.dur.toFixed(1).padStart(4)}  ${String((r.place || '') + (r.newPlace ? '*' : '')).padEnd(5)}  ${String(r.size || '?').padEnd(21)} ${String(r.subject || '-').padEnd(33)} ${String(r.depth ?? '-').padStart(5)}  ${r.planned || ''}${r.shot ? ` [camera ${r.shot}]` : ''}`)
  lines.push('(* = first shot at that place; size from the largest visible cast member: docs/story_craft.md section 8)')
  const sizes = rows.map(r => r.size).filter(Boolean)
  const tally = {}; for (const s of sizes) tally[s] = (tally[s] || 0) + 1
  lines.push('', `sizes: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', ')}`)
  lines.push(...(keep.length ? findingLines(keep) : ['no framing findings']))
  out(lines.join('\n'), { shots: rows, findings: keep, sizes: tally })
  if (keep.length) hint(`look at a flagged shot: ./hb still ${t.name} <its out time>`)
  return 0
}

// ---------------------------------------------------------------- owner (lib/hb/owner.js: the owner's review notes)
// the story dir: --story DIR, else the edit's `story` in this checkout
function storyFor (t, fl) {
  if (fl.story) {
    const d = path.resolve(fl.story)
    try {
      const st = JSON.parse(fs.readFileSync(path.join(d, 'story.json')))
      let vo = null
      try { vo = JSON.parse(fs.readFileSync(path.join(d, 'voice', 'voice.json'))) } catch (e) {}
      return { st, vo, gap: st.gap ?? 0.1, dir: d }
    } catch (e) { die(`--story ${fl.story}: no story.json there`) }
  }
  const s = A.storyOf(t.stunt)
  if (s) s.dir = path.join(ROOT, t.stunt.edit.story)
  return s
}
function ownerReport (t, fl) {
  const O = require('./owner')
  const c = clock(t)
  const n = t.rec.poses.length
  const ticks = []
  for (let i = 0; i < n; i++) ticks.push(`tick:${i}`)
  const r = sh('python3', ['scripts/hb_time.py', t.stuntName, t.recPath, ...ticks])
  let j = null
  try { j = JSON.parse((r.stdout || '').trim().split('\n').pop()) } catch (e) { die(`scripts/hb_time.py failed:\n${(r.stderr || r.stdout || '').trim().slice(-2000)}`) }
  const tickOut = j.resolved.map(x => (x.part === 'body' && x.out !== null) ? x.out : null)
  const scene = sceneFor(t)
  const story = storyFor(t, fl)
  const notes = []
  if (t.stunt.edit && t.stunt.edit.story && !story) notes.push(`no ${t.stunt.edit.story}/story.json in this checkout: the subject, sync and look checks need it (--story DIR)`)
  else if (story && !story.vo) notes.push('no voice/voice.json: word times are estimated from the line length')
  const planned = new Map(((story && story.st.shots) || []).map(s => [s.id, s]))
  const lineMarks = scene.tl.filter(e => e.event === 'line')
  const shotPlanAt = planned.size ? (tick) => { let id = null; for (const m of lineMarks) if (m.t / 50 <= tick) id = m.id; const l = id && (story.st.lines || []).find(x => x.id === id); return l && l.shot ? planned.get(l.shot) || null : null } : null
  const res = O.run(scene, { tickOut, shots: c.shots, story, stunt: t.stunt, shotPlanAt, storyRoot: ROOT })
  res.notes = [...notes, ...res.notes]
  res.length = c.length
  return res
}
function ownerLines (fs_) {
  return fs_.map(f => `${f.level.padEnd(5)} [${f.check.padEnd(7)}] ${f.out === null || f.out === undefined ? '     -  ' : f.out.toFixed(2).padStart(6) + ' s'}${f.line ? ' ' + f.line : ''}: ${f.msg}`)
}
function cmdOwner (fl, pos) {
  const t = resolve(pos[0], fl); printNotes(t)
  const res = ownerReport(t, fl)
  const nb = res.findings.filter(f => f.level === 'BLOCK').length, nw = res.findings.filter(f => f.level === 'WARN').length
  const lines = []
  for (const n of res.notes) lines.push(`note: ${n}`)
  if (fl.shots) for (const r of res.flatRows) lines.push(`shot ${String(r.n).padStart(2)} ${r.out[0].toFixed(2).padStart(6)} s ${String(r.line || '').padEnd(4)} flat ${pct(r.flat)} scenery ${pct(r.scenery)} set ${pct(r.set)} sky ${pct(r.sky)} near ${pct(r.near)} trees ${pct(r.trees)} superflat ${r.hard}/${r.of}`)
  lines.push(...(res.findings.length ? ownerLines(res.findings) : ['no findings']))
  lines.push(`${nb ? 'FAIL' : 'OK'}: ${nb} blocker(s), ${nw} warning(s) (flat world, named subject, word/picture sync, glitches: lib/hb/owner.js)`)
  out(lines.join('\n'), { ...res, ok: !nb })
  if (nb) hint(`look at each with ./hb describe ${t.name} <time>; fix the stunt and ./hb record ${t.name}`)
  return nb ? 1 : 0
}
const pct = (v) => `${Math.round(v * 100)}%`

// ---------------------------------------------------------------- pace (the finished Short: hook, dead spots, build-up, payoff, length)
function paceVideo (name, fl) {
  const c = [fl.video && path.resolve(fl.video), path.join(ROOT, 'out', `${name}.mp4`), path.join(VIDEOS, 'shorts', name, 'short.mp4')].filter(Boolean)
  return c.find(p => fs.existsSync(p)) || die(`no video for ${name}: looked in ${c.map(rel).join(', ')}. Render it: ./hb render ${name} --wait`)
}
function cmdPace (fl, pos) {
  const name = pos[0] || die('which stunt? (./hb pace story_x reads out/story_x.mp4)')
  const video = paceVideo(name, fl)
  const args = ['scripts/pace.py', name, '--video', video]
  let t = null
  try { t = resolve(name, fl) } catch (e) { if (!(e instanceof HbError)) throw e; if (!JSON_OUT) console.log(`note: ${e.message.split('. ')[0]}: picture and sound only`) }
  if (t) {
    printNotes(t)
    args.push('--stunt', t.stuntName, '--rec', t.recPath)
    if (t.recFrom === 'work' && mtime(t.recPath) > mtime(video) && !JSON_OUT) console.log(`note: ${rel(video)} is older than the recording: its marks may not match (render again)`)
  }
  if (fl.story) args.push('--story', path.resolve(fl.story))
  if (fl.payoff) args.push('--payoff', String(fl.payoff))
  if (JSON_OUT) args.push('--json')
  const r = sh('python3', args)
  if (r.status > 1 || r.status === null) die(`scripts/pace.py failed (exit ${r.status}):\n${(r.stderr || r.stdout || '').trim().slice(-2000)}`)
  process.stdout.write(r.stdout)
  if (r.status === 1) hint(`each BLOCK has its fix; edit-only fixes (endAfter, cuts, captions) need scripts/reedit.sh, not a new recording. Look: ./hb describe ${name} <time>`)
  return r.status
}

// ---------------------------------------------------------------- check
function cmdCheck (fl, pos) {
  const t = resolve(pos[0], fl); printNotes(t)
  const recp = plainRec(t)
  const res = { stunt: t.stuntName, rec: recp, steps: [] }
  const step = (name, code, summary, extra = {}) => { res.steps.push({ name, exit: code, summary, ...extra }); if (!JSON_OUT) console.log(`\n== ${name}: ${summary}`) }
  // 1. rec_check (cuts, holds, turns, set, vanilla)
  const rc = sh('python3', ['scripts/rec_check.py', t.stuntName, recp, '--no-owner'])
  const rcOut = ((rc.stdout || '') + (rc.stderr || '')).trim()
  if (!JSON_OUT) console.log(rcOut)
  const skipped = /skip|could not|not found|Cannot find module/i.test(rcOut) ? rcOut.split('\n').filter(l => /skip|could not|not found|Cannot find module/i.test(l)) : []
  step('rec_check', rc.status, rc.status === 0 ? 'no blockers' : rc.status === 1 ? 'BLOCKERS (re-record)' : `could not run (exit ${rc.status})`, { skipped })
  // 2. lint (movie engine: cameras, subjects, the 180-degree line), when this render.js has it
  if (/process\.env\.LINT/.test(fs.readFileSync(path.join(ROOT, 'render.js'), 'utf8'))) {
    const l = sh('node', ['render.js', recp], { env: { ...process.env, LINT: '1' } })
    const lo = ((l.stdout || '') + (l.stderr || '')).trim().split('\n').filter(x => !/^(filled|simulated|meshing|light computed|shot ')/.test(x))
    if (!JSON_OUT) console.log(lo.join('\n'))
    step('lint', l.status, l.status === 0 ? 'clean' : 'PROBLEMS', { lines: lo })
  }
  // 3. continuity and framing (lib/hb)
  const { rows, findings } = shotsReport(t, fl)
  const cont = findings.filter(f => !FRAMING_KINDS.includes(f.kind)), fr = findings.filter(f => FRAMING_KINDS.includes(f.kind) && f.level !== 'NOTE')
  if (!JSON_OUT) console.log(findingLines(cont).join('\n'))
  step('continuity', cont.some(f => f.level === 'PROBLEM') ? 1 : 0, `${cont.filter(f => f.level === 'PROBLEM').length} problem(s), ${cont.filter(f => f.level === 'WARN').length} warning(s), ${cont.filter(f => f.level === 'NOTE').length} note(s)`, { findings: cont })
  if (!JSON_OUT) console.log(findingLines(fr).join('\n'))
  step('framing', 0, `${fr.length} warning(s) over ${rows.length} shots`, { findings: fr })
  // 4. the owner's notes (lib/hb/owner.js): flat world, named subject, word/picture sync, glitches
  const ow = ownerReport(t, fl)
  if (!JSON_OUT) { for (const n of ow.notes) console.log(`note: ${n}`); console.log(ownerLines(ow.findings).join('\n')) }
  const ob = ow.findings.filter(f => f.level === 'BLOCK').length
  step('owner', ob ? 1 : 0, `${ob} blocker(s), ${ow.findings.filter(f => f.level === 'WARN').length} warning(s)`, { findings: ow.findings, notes: ow.notes })
  const blockers = res.steps.filter(s => s.exit === 1).map(s => s.name)
  const broken = res.steps.filter(s => s.exit > 1).map(s => s.name)
  res.ok = !blockers.length && !broken.length
  if (!JSON_OUT) console.log(`\n${res.ok ? 'CHECK OK' : `CHECK FAILED: ${[...blockers.map(b => b + ' blockers'), ...broken.map(b => b + ' did not run')].join(', ')}`} (warnings need a reason or a fix)`)
  else out(null, res)
  hint(res.ok ? `./hb sheet ${t.name} (look at every shot), then ./hb render ${t.name}` : `fix the stunt and ./hb record ${t.name}`)
  return res.ok ? 0 : 1
}

// ---------------------------------------------------------------- the long steps
function needServer () {
  const b = busy()
  if (b.server) die(`the Minecraft server is in use (one batch at a time, fixed port): ${b.procs.filter(p => p.kind !== 'render').map(p => `${p.kind} pid ${p.pid} in ${p.cwd}`).join('; ')}. Wait and retry (./hb status).`)
}
function cmdRecord (fl, pos) {
  const name = pos[0] || die('which stunt?')
  const l = loadStunt(name); if (l.error) die(l.error)
  needServer()
  const env = { ...process.env, STUNT: name, RECORD_ONLY: '1', REC_CHECK_STRICT: fl.no_strict ? '0' : '1' }
  if (fl.tries) env.TRIES = String(fl.tries)
  const t0 = Date.now()
  const code = run('./run.sh', [], { env })
  const rp = path.join(WORK, `${name}.rec.json`)
  const fresh = mtime(rp) > t0
  out(`${code === 0 ? 'recorded' : code === 1 && fresh ? 'recorded, but rec_check found BLOCKERS' : 'recording FAILED'}: ${fresh ? rel(rp) : 'no new recording'} (${((Date.now() - t0) / 60000).toFixed(1)} min)`, { ok: code === 0, rec: fresh ? rp : null, exit: code, minutes: +((Date.now() - t0) / 60000).toFixed(1) })
  if (code === 0) hint(`./hb check ${name} && ./hb sheet ${name}`)
  else if (fresh) hint(`fix the blockers above in stunts/${name}.js and ./hb record ${name} again (--no-strict only to look at it anyway)`)
  else hint('read the bot log above: "Timeout waiting for N ticks" in setup is the known flaky teleport; run again')
  return code
}
function cmdVoice (fl, pos) {
  const l = loadStunt(pos[0] || die('which stunt (or stories/<dir>)?'))
  const dir = fs.existsSync(path.join(ROOT, pos[0], 'story.json')) ? pos[0] : (l.mod && l.mod.edit && l.mod.edit.story) || die(`${pos[0]}: no edit.story in the stunt`)
  const py = path.join(os.homedir(), '.hb-tts', 'bin', 'python')
  if (!fs.existsSync(py)) die(`no TTS venv (${py}): see docs/stories.md "Setup" (./hb doctor)`)
  const only = fl.only ? ['--only', fl.only] : []
  const story = JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'story.json'), 'utf8'))
  if (!story.cast) return run(py, ['scripts/voice.py', dir, ...only])   // a v1 story: the Kokoro narrator
  // a v2 story (a voiced cast, docs/voices.md): Gemini takes cut at Whisper's word times, every line checked for the
  // right voice and words and re-taken when wrong (single-speaker), then word timings, then the final check
  if (fl.check) return run(py, ['scripts/speaker_check.py', dir, ...only])
  const tts = ['scripts/tts.py', dir, ...only, ...(fl.retakes !== undefined ? ['--retakes', String(fl.retakes)] : []), ...(fl.no_check ? ['--no-check'] : [])]
  let code = run(py, tts)
  if (code) return code
  code = run(py, ['scripts/align.py', dir, ...only])
  if (code) return code
  code = run(py, ['scripts/speaker_check.py', dir])
  if (code) hint(`a line is in the wrong voice or has the wrong words (a blocker): listen to it, then ./hb voice ${pos[0]} --only <id> (a fresh take), or fix its text/direction`)
  else hint(`./hb record ${pos[0]} (the scene lengths come from voice.json)`)
  return code
}
function cmdPreview (fl, pos) {
  const t = resolve(pos[0], fl); printNotes(t)
  if (busy().renders) console.log('note: other render.js processes are running here; the preview will be slower')
  const code = run('bash', ['scripts/preview.sh', t.stuntName, plainRec(t)], { env: { ...process.env, NAME: t.name } })
  const d = path.join(WORK, `preview_${t.name}`)
  if (code === 0) { out(`preview: ${rel(path.join(d, 'preview.mp4'))}\nsheets: ${rel(path.join(d, 'sheets'))}/sheet_*.jpg (frames.txt lists them)`, { preview: path.join(d, 'preview.mp4'), sheets: path.join(d, 'sheets') }); hint(`read every sheet; rm -rf ${rel(d)} when done (disk)`) }
  return code
}
function cmdRender (fl, pos) {
  const name = pos[0] || die('which stunt?')
  const rp = path.join(WORK, `${name}.rec.json`)
  if (fl.fetch || fl.wait) {
    const code = run('bash', ['scripts/render_on_actions.sh', fl.wait ? '--wait' : '--fetch', name])
    if (code === 0) { out(`out/${name}.mp4`, { video: path.join(ROOT, 'out', `${name}.mp4`) }); hint(`./hb review ${name}`) } else if (code === 3) hint(`still rendering: ./hb render ${name} --wait`)
    return code
  }
  if (!fs.existsSync(rp)) die(`no ${rel(rp)}: ./hb record ${name}`)
  const l = loadStunt(name); if (l.error) die(l.error)
  if (!fl.local) {
    const dirty = sh('git', ['status', '--porcelain', '--', 'render.js', 'renderer', 'edit.py', 'scripts', 'audio.py']).stdout.trim()
    if (dirty) die(`uncommitted changes the Actions render would not get (only stunts/, lib/, stories/ are carried):\n${dirty}\ncommit them first`)
    const code = run('bash', ['scripts/render_on_actions.sh', name])
    if (code === 0) { out(`queued render/${name} on Actions (~10-20 min)`, { queued: `render/${name}` }); hint(`./hb render ${name} --wait (polls with git), meanwhile ./hb preview ${name} or ./hb sheet ${name}`) }
    return code
  }
  const n = Math.floor((JSON.parse(fs.readFileSync(rp)).poses.length - 1) / 20 * 60)
  const need = n * 1.3 / 1024
  if (freeGB(ROOT) < need + 1) die(`a local render writes ~${need.toFixed(1)} GB of frames and ${freeGB(ROOT).toFixed(1)} GB is free: render on Actions (./hb render ${name})`)
  if (busy().renders) console.log('note: other render.js processes are running here: this will be slow (~20 s of render per video second on a free box)')
  fs.rmSync(path.join(WORK, `${name}.frames`), { recursive: true, force: true })
  let code = run('node', ['render.js', rp, `work/${name}.frames`, '60', '1080', '1011'])
  if (code === 0) code = run('bash', ['scripts/finish_render.sh', name, name])
  if (code === 0) { out(`out/${name}.mp4 (frames kept in work/${name}.frames: delete them when the review passes)`, { video: path.join(ROOT, 'out', `${name}.mp4`) }); hint(`./hb review ${name}`) }
  return code
}
function cmdReview (fl, pos) {
  const name = pos[0] || die('which stunt?')
  const mp4 = path.join(ROOT, 'out', `${name}.mp4`), rp = path.join(WORK, `${name}.rec.json`)
  if (!fs.existsSync(mp4)) die(`no ${rel(mp4)}: ./hb render ${name} (then --wait)`)
  if (fs.existsSync(rp) && mtime(rp) > mtime(mp4)) die(`${rel(mp4)} is older than the recording: render the new recording first`)
  fs.mkdirSync(HBDIR, { recursive: true })
  const rv = path.join(HBDIR, `${name}.review.json`)
  const log = fs.existsSync(rv) ? JSON.parse(fs.readFileSync(rv, 'utf8')) : { rounds: [] }
  if (fl.verdict) {
    const last = log.rounds[log.rounds.length - 1] || die('no review round started: ./hb review <stunt> first')
    last.verdict = String(fl.verdict); last.notes = fl.notes || ''
    fs.writeFileSync(rv, JSON.stringify(log, null, 1))
    out(`round ${log.rounds.length}: ${last.verdict}`, log)
    hint(/^ready/i.test(last.verdict) ? `./hb publish ${name} --notes "..."` : log.rounds.length >= 2 ? 'that was the 2nd round: fix only the blockers, then publish (short-review skill: 2-round cap) or tell the lead' : `fix the blockers, re-record/re-render, ./hb review ${name}`)
    return 0
  }
  const qa = sh('python3', ['scripts/qa_frames.py', mp4])
  const ea = ((loadStunt(name).mod || {}).edit || {})
  const pay = ea.dropAt || (ea.endAfter ? String(ea.endAfter).split(':')[0] : null)
  const ba = sh('python3', ['scripts/beat_audit.py', name, '--video', mp4, ...(pay ? ['--payoff', pay] : [])])
  const baText = ((ba.stdout || '') + (ba.stderr || '')).trim().split('\n').filter(l => !/^\s+\d+\.\d+: /.test(l)).join('\n')   // (the motion table: in the full output)
  // the pacing gate (scripts/pace.py): its blockers are review blockers
  let pace = null
  try {
    const t = resolve(name, fl)
    const pr = sh('python3', ['scripts/pace.py', name, '--video', mp4, '--stunt', t.stuntName, '--rec', t.recPath])
    pace = { exit: pr.status, text: ((pr.stdout || '') + (pr.stderr || '')).trim() }
  } catch (e) { if (!(e instanceof HbError)) throw e; pace = { exit: 2, text: `pace: ${e.message}` } }
  const qdir = path.join(WORK, 'qa_frames', name)
  const sheets = fs.existsSync(qdir) ? fs.readdirSync(qdir).filter(f => /^sheet_\d+\.jpg$/.test(f)).map(f => path.join(qdir, f)) : []
  const flags = fs.existsSync(qdir) ? fs.readdirSync(qdir).filter(f => f.startsWith('flag_')).map(f => path.join(qdir, f)) : []
  log.rounds.push({ at: new Date().toISOString(), video_mtime: new Date(mtime(mp4)).toISOString() })
  fs.writeFileSync(rv, JSON.stringify(log, null, 1))
  const n = log.rounds.length
  const lines = [((qa.stdout || '') + (qa.stderr || '')).trim().split('\n').slice(-6).join('\n'), '', baText, '',
    `== pace (./hb pace ${name})${pace.exit === 1 ? ': BLOCKERS (each is a review blocker)' : ''}`, pace.text, '',
    `review round ${n}${n > 2 ? ' (OVER the 2-round cap: fix only blockers and ship, or ask the lead)' : ''}`,
    `report: ${rel(path.join(qdir, 'report.txt'))}; ${sheets.length} sheets, ${flags.length} flag images in ${rel(qdir)}`,
    `the review: .claude/skills/short-review/SKILL.md (frame review + retention + Minecraft, blocker/nitpick bar) by an independent reviewer (docs/worker.md: a fresh session if you have no subagent tool)`,
    `record its verdict: ./hb review ${name} --verdict "READY" (or "NOT READY: 3 blockers") --notes "..."`]
  out(lines.join('\n'), { round: n, qa_exit: qa.status, pace_exit: pace.exit, pace: pace.text, beat_audit: (ba.stdout || '').trim(), report: path.join(qdir, 'report.txt'), sheets, flags })
  return qa.status === 0 && pace.exit !== 1 ? 0 : 1
}
function cmdPublish (fl, pos) {
  const name = pos[0] || die('which stunt?')
  const mp4 = path.join(ROOT, 'out', `${name}.mp4`), rp = path.join(WORK, `${name}.rec.json`)
  if (!fs.existsSync(mp4)) die(`no ${rel(mp4)}`)
  if (fs.existsSync(rp) && mtime(rp) > mtime(mp4)) die(`${rel(mp4)} is older than the recording (docs/qa.md step 4: freshness)`)
  const rv = path.join(HBDIR, `${name}.review.json`)
  const last = fs.existsSync(rv) ? JSON.parse(fs.readFileSync(rv, 'utf8')).rounds.slice(-1)[0] : null
  if (!last || !/^ready/i.test(last.verdict || '')) { if (!fl.force) die(`no READY review recorded for ${name} (./hb review ${name}, then --verdict READY). --force to publish anyway`) }
  if (!fl.notes) die('--notes "one line: what it is, review rounds, known nitpicks" is required')
  if (!fs.existsSync(path.join(VIDEOS, 'shorts'))) die(`no videos worktree at ${VIDEOS} (./hb doctor)`)
  const code = run('node', ['scripts/publish.js', name, '--pass', '--notes', String(fl.notes), ...(fl.no_push ? ['--no-push'] : [])])
  if (code === 0) { out(`published ${name} to the videos branch`, { published: name }); hint(`./hb status ${name}; delete work/${name}.frames and work/preview_${name} (disk)`) }
  return code
}
function cmdLint (fl, pos) {
  const t = resolve(pos[0], fl)
  if (!/process\.env\.LINT/.test(fs.readFileSync(path.join(ROOT, 'render.js'), 'utf8'))) die('this render.js has no LINT mode (the movie engine adds it: docs/movie_engine.md). ./hb check covers the rest')
  return run('node', ['render.js', plainRec(t)], { env: { ...process.env, LINT: '1' } })
}

// ---------------------------------------------------------------- help
const HELP = `hb: the HelloBuh pipeline in one command (docs/agent_guide.md)

  ./hb doctor                         is this box ready (packages, assets, server jar, TTS, Gemini, disk, server free)
  ./hb status [stunt...]              what is recorded / rendered / reviewed / published, and the next step for each
  ./hb voice <stunt> [--only L03,L07] the story's voices: a v2 cast on Gemini (cut at the words, speaker check,
                                      re-takes; --check only checks, --retakes N, --no-check), a v1 story on Kokoro
  ./hb record <stunt> [--tries N]     server + bot -> work/<stunt>.rec.json, then rec_check (stops on blockers)
  ./hb check <stunt>                  rec_check + lint (movie engine) + continuity + framing + owner, before any render
  ./hb owner <stunt> [--story DIR]    the owner's notes as checks: superflat shots, the camera off what the line
                                      names, the picture ahead of the words / an uncaused fall / "never X" over X,
                                      glitches (doors by themselves, stuck, jitter, fog/night/rain missing); --shots
  ./hb describe <stunt|rec> [T...]    a moment as text: camera, who/what is in frame (distance, screen spot, size),
                                      time, weather, HUD, the caption, marks nearby. No T: the middle of every shot
  ./hb continuity <stunt>             per shot: time, weather, held item, camera, cast; flags jumps across cuts
  ./hb framing <stunt>                per shot: shot size; flags too-tight shots and new places with no wide shot
  ./hb still <stunt|rec> T [T...]     render just those moments (one process, ~25 s + a few s each) -> PNGs + sheet
          [--cam back:4|front|dx,dy,dz,yaw,pitch] [--size 540x506] [--look JSON] [--day-time N] [--out DIR]
  ./hb sheet <stunt> [--at mid|first,mid,last] [--size 320x300]   one labelled frame per shot (+ cut edges)
  ./hb preview <stunt>                the whole edited Short, low-res (scripts/preview.py; ~10-25 min)
  ./hb render <stunt>                 queue the full render on GitHub Actions (~10-20 min); --wait / --fetch to get
                                      out/<stunt>.mp4; --local renders here (slow, ~4 GB of frames)
  ./hb review <stunt>                 qa_frames + beat_audit on out/<stunt>.mp4, counts review rounds (cap 2);
                                      --verdict "READY"|"NOT READY: ..." [--notes] records the reviewer's answer
  ./hb publish <stunt> --notes "..."  package to the videos branch (needs a READY review; publish.js --pass)
  ./hb lint <stunt>                   the movie engine's scene lint (when render.js has it)
  ./hb pace <stunt> [--payoff MARK]   pacing on the finished out/<stunt>.mp4 (after the render): visual + audio hook,
                                      dead spots, build-up over thirds, payoff (hit + picture change, end <= 1 s
                                      after), length; exit 1 on blockers (scripts/pace.py)

Times T (all commands): 12.5 = seconds of the finished Short; L03, L03+1.2 = a story line (+ seconds);
cut#3, flash, hmm, story_end-0.5 = any timeline mark (#n = the nth); end; tick:450 / src:22.5 = source time.
Every command: --json for one JSON object on stdout; --rec PATH to use another recording; exit 1 on failure.
<stunt> finds work/<stunt>.rec.json, else the published ../hb-videos/shorts/<stunt>/recording.json.gz.`

const CMDS = { doctor: cmdDoctor, status: cmdStatus, voice: cmdVoice, record: cmdRecord, check: cmdCheck, describe: cmdDescribe, continuity: cmdContinuity, framing: cmdFraming, still: cmdStill, stills: cmdStill, sheet: cmdSheet, preview: cmdPreview, render: cmdRender, review: cmdReview, publish: cmdPublish, lint: cmdLint, owner: cmdOwner, pace: cmdPace }

function main (argv) {
  const [cmd, ...rest] = argv
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { console.log(HELP); return 0 }
  const f = CMDS[cmd]
  if (!f) { console.error(`hb: unknown command '${cmd}'\n\n${HELP}`); return 2 }
  const { pos, fl } = parse(rest)
  JSON_OUT = !!fl.json
  try { return f(fl, pos) } catch (e) {
    if (e instanceof HbError) { if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: e.message })); console.error(`hb ${cmd}: ${e.message}`); return 1 }
    throw e
  }
}
module.exports = { main }
