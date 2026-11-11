// hb: one command line for the HelloBuh pipeline, made for agents (docs/agent_guide.md). `./hb help`.
// Every command prints short, plain results (paths, counts, what to do next), `--json` prints one JSON object
// instead, and failures exit non-zero with the reason on stderr. Nothing here is silent: a step that can't run
// says so.
const fs = require('fs')
const os = require('os')
const path = require('path')
const cp = require('child_process')
// scene.js needs node_modules (vec3, prismarine): on a fresh checkout `hb doctor` crashed on the require instead of
// saying "npm ci". Without them only doctor, rules and help run (main() refuses the rest with the fix)
let SCENE_ERR = null, scene
try { scene = require('./scene') } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; SCENE_ERR = e; scene = { ROOT: path.join(__dirname, '..', '..') } }
const { Scene, loadRec, loadStunt, dayLabel, ROOT } = scene
const A = SCENE_ERR ? {} : require('./analyze')
const { fixesFor } = require('./fixes')

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
const VALUED = new Set(['retakes', 'since', 'radius', 'scale', 'verdict', 'rec', 'cam', 'size', 'look', 'day_time', 'out', 'at', 'notes', 'only', 'tries', 'jobs', 'max', 'items', 'stunt', 'stunt_file', 'story', 'payoff', 'video', 'model'])
let JSON_OUT = false
const out = (human, obj) => { if (JSON_OUT) process.stdout.write(JSON.stringify(obj) + '\n'); else if (human) console.log(human) }
// the one plain NEXT line every command ends with (owner, 2026-11-10: the tool tells the session what to do)
const hint = (s) => { if (!JSON_OUT) console.log(`NEXT: ${s}`) }
const rel = (p) => path.relative(process.cwd(), p) || '.'
function sh (cmd, args, opts = {}) {
  const r = cp.spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, ...opts })
  if (r.error && r.error.code === 'ENOENT') return { status: 127, stdout: '', stderr: `${cmd}: not found` }
  return r
}
// A long step: its output goes straight to the terminal (live) and to work/hb/logs/<step>.log; when it fails, the
// known errors in it (lib/hb/fixes.js) are printed with their fix. LAST_RUN keeps the log and the fixes for hb make.
let LAST_RUN = null
const LAST = {}   // the last check / pace result in this process (hb make reads them)
function run (cmd, args, opts = {}) {
  if (!JSON_OUT) console.log(`+ ${cmd} ${args.join(' ')}`)
  const logs = path.join(HBDIR, 'logs')
  let log = null
  try { fs.mkdirSync(logs, { recursive: true }); log = path.join(logs, `${opts.label || path.basename(args[0] && !/^-/.test(args[0]) && /\.(sh|py|js)$/.test(args[0]) ? args[0] : cmd).replace(/[^\w.-]/g, '_')}.log`) } catch (e) {}
  const { label, ...o } = opts
  let r
  if (log) {
    // bash: "$@" 2>&1 | tee LOG keeps the output live; pipefail keeps the step's exit code; Python unbuffered so a
    // pipe doesn't hold its lines back
    const env = { ...(o.env || process.env), HB_LOG: log, PYTHONUNBUFFERED: '1' }
    r = cp.spawnSync('bash', ['-o', 'pipefail', '-c', `"$@" 2>&1 | tee "$HB_LOG"${JSON_OUT ? ' >&2' : ''}`, 'hb', cmd, ...args], { cwd: ROOT, stdio: 'inherit', encoding: 'utf8', ...o, env })
  } else r = cp.spawnSync(cmd, args, { cwd: ROOT, stdio: JSON_OUT ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8', ...o })
  const code = r.status === null ? 1 : r.status
  let text = ''
  try { if (log) text = fs.readFileSync(log, 'utf8') } catch (e) {}
  const fixes = code ? fixesFor(text.slice(-200000)) : []
  if (fixes.length) console.error(fixes.map(f => `fix: ${f}`).join('\n'))
  LAST_RUN = { cmd: [cmd, ...args].join(' '), code, log, fixes, tail: text.trim().split('\n').slice(-8) }
  return code
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

// Minecraft servers on this box and whether each is stale: up over 30 min, no client connected to its port, no
// bot.js anywhere, and the run.sh that started it gone (its launcher subshell re-parented to init)
function staleServers () {
  const r = sh('pgrep', ['-f', 'server.jar'])
  const pids = (r.stdout || '').trim().split('\n').filter(Boolean).map(Number).filter(pid => { try { return /java/.test(fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8')) } catch (e) { return false } })
  if (!pids.length) return []
  const stat = (pid) => { try { const f = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); const rest = f.slice(f.lastIndexOf(')') + 2).split(' '); return { ppid: Number(rest[1]), start: Number(rest[19]) } } catch (e) { return null } }
  const uptime = Number(fs.readFileSync('/proc/uptime', 'utf8').split(' ')[0]), HZ = 100
  const cmd = (pid) => { try { return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim() } catch (e) { return '' } }
  // established connections to the server port (25565 unless server.properties says otherwise)
  let port = 25565
  try { port = Number((/^server-port=(\d+)/m.exec(fs.readFileSync(path.join(ROOT, 'work', 'server', 'server.properties'), 'utf8')) || [])[1]) || port } catch (e) {}
  let clients = 0
  for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) {
    try { for (const ln of fs.readFileSync(f, 'utf8').trim().split('\n').slice(1)) { const c = ln.trim().split(/\s+/); if (c[3] === '01' && parseInt(c[1].split(':').pop(), 16) === port) clients++ } } catch (e) {}
  }
  const bots = busy().procs.filter(p => p.kind === 'bot')
  return pids.map(pid => {
    const st = stat(pid); if (!st) return null
    const age = uptime - st.start / HZ
    const parent = stat(st.ppid), launcherGone = st.ppid === 1 || (parent && parent.ppid === 1)
    let cwd = '?'; try { cwd = fs.readlinkSync(`/proc/${pid}/cwd`) } catch (e) {}
    const why = `up ${Math.round(age / 60)} min in ${cwd}; ${clients} client(s) on :${port}; ${bots.length} bot.js running${bots.length ? ` (${bots.map(b => `${b.pid} in ${b.cwd}`).join(', ')})` : ''}; launcher ${launcherGone ? 'gone' : `alive (${cmd(st.ppid).slice(0, 40)})`}`
    return { pid, age, clients, bots: bots.length, launcherGone, stale: age > 1800 && clients === 0 && !bots.length && launcherGone, why }
  }).filter(Boolean)
}
function stopServer (pid) {
  try { process.kill(pid, 'SIGTERM') } catch (e) { return false }
  const t0 = Date.now()
  while (Date.now() - t0 < 30000) { try { process.kill(pid, 0) } catch (e) { return true } cp.spawnSync('sleep', ['1']) }
  return false
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
  // one cache file per source recording: keyed by the stunt name alone, a second recording of the same stunt (a
  // render branch's slice, a --rec probe) reused the first one's stale copy whenever that copy was newer
  const src = path.resolve(t.recPath), tag = require('crypto').createHash('sha1').update(src).digest('hex').slice(0, 8)
  const p = path.join(HBDIR, `${t.name}.${tag}.rec.json`)
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
    // scripts/speaker_check.py + align.py: transformers (Whisper), resemblyzer (--no-deps: only its weights) and scipy
    const v = sh(tts, ['-c', 'import importlib.util as u; print(" ".join(m for m in ("transformers","resemblyzer","scipy") if not u.find_spec(m)))'])
    const miss = (v.stdout || '').trim()
    const pip = tts.replace(/python$/, 'pip')
    ck('voice checks + the caption aligner (ctc_align, speaker check)', !miss && v.status === 0, miss ? `missing in the TTS venv: ${miss} (without transformers align.py falls back to Whisper times and caption_sync BLOCKs)` : 'transformers + resemblyzer + scipy', `${pip} install transformers torch scipy && ${pip} install --no-deps resemblyzer`)
  }
  else ck('Kokoro TTS venv', false, `no ${tts}`, 'docs/stories.md "Setup" (~6 min, ~2.5 GB; voice, align and the caption checks need it)', fl.story ? 'error' : 'warn')
  if (fl.story && !fs.existsSync(tts)) ck('voice checks + the caption aligner (ctc_align, speaker check)', false, `no ${tts}: align.py cannot force-align, caption_sync BLOCKs`, 'docs/stories.md "Setup", then ~/.hb-tts/bin/pip install transformers torch scipy')
  ck('espeak-ng', sh('which', ['espeak-ng']).status === 0, 'Kokoro\'s phonemizer', 'apt-get update && apt-get install -y espeak-ng', 'warn')
  if (!fl.offline) {
    const r = sh('curl', ['-s', '-m', '10', '-o', '/dev/null', '-w', '%{http_code}', '-H', 'x-goog-api-key: proxy', 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1'])
    ck('Gemini API (voices)', r.stdout === '200', `HTTP ${r.stdout || 'no answer'} (listing models; no TTS quota used)`, 'the session proxy injects the key; without it, voices need GEMINI_API_KEY', 'warn')
    const g = sh('git', ['ls-remote', '--heads', 'origin', 'main'], { timeout: 20000 })
    ck('git remote', g.status === 0, g.status === 0 ? 'origin reachable' : (g.stderr || '').trim().slice(0, 120), 'check the GitHub proxy (render on Actions and publish push to origin)')
  }
  ck('videos worktree', fs.existsSync(path.join(VIDEOS, 'shorts')), rel(VIDEOS), 'git fetch origin videos && git worktree add ../hb-videos videos (publish writes there)', 'warn')
  const gb = freeGB(ROOT)
  // df Avail on the repo's volume: in the container, Size is the host's disk and Avail is this container's writable
  // allowance (what is left of its quota), so Avail is the number that runs out (a full disk killed a recording and git)
  ck('disk', gb > 5, `${gb.toFixed(1)} GB free (df Avail on ${rel(ROOT)}: the container's remaining allowance; fail under 2 GB, warn under 5)`, './hb clean --dry-run, then ./hb clean (merged worktrees, old out/ intermediates, extra recordings, dead git tmp packs); render on Actions (a local render needs ~4 GB of frames)', gb > 2 ? 'warn' : 'error')
  // git's auto gc repacks every object (render branches carry mp4s: a ~4 GB pack) and filled the disk twice on
  // 2026-11-10, leaving .git/objects/pack/tmp_pack_* behind; gc.auto=0 stops it (a manual gc when there is room)
  const gcAuto = (sh('git', ['config', '--get', 'gc.auto']).stdout || '').trim()
  const common = path.resolve(ROOT, (sh('git', ['rev-parse', '--git-common-dir']).stdout || '.git').trim())
  const tmpPacks = (() => { try { return fs.readdirSync(path.join(common, 'objects', 'pack')).filter(f => /^tmp_/.test(f)).length } catch (e) { return 0 } })()
  ck('git auto gc off (a repack needs ~4 GB)', gcAuto === '0' && !tmpPacks, `gc.auto=${gcAuto || 'default (on)'}${tmpPacks ? `; ${tmpPacks} dead tmp pack(s)` : ''}${fs.existsSync(path.join(common, 'gc.log')) ? '; gc.log: the last auto gc failed' : ''}`, 'git config gc.auto 0 (in the main checkout); ./hb clean removes dead tmp packs', 'warn')
  const b = busy()
  ck('Minecraft server free', !b.server, b.server ? b.procs.filter(p => p.kind !== 'render').map(p => `${p.kind} pid ${p.pid} in ${p.cwd}`).join('; ') : 'free', 'one server batch at a time: wait for it (./hb status shows it)', 'warn')
  // a stale server: its run.sh is gone (killed, the session ended), no bot is connected and it's been up 30+ min.
  // It holds the port and 2 GB, and `hb record` refuses next to it. --fix stops only those (SIGTERM: the server saves
  // and exits), never one a bot is using or one whose run.sh is still alive.
  for (const sv of staleServers()) {
    if (!sv.stale) { if (fl.verbose) ck(`server pid ${sv.pid}`, true, sv.why); continue }
    let fixed = false
    if (fl.fix) fixed = stopServer(sv.pid)
    ck(`stale server pid ${sv.pid}`, fixed, `${sv.why}${fixed ? ' -> stopped (--fix)' : ''}`, `./hb doctor --fix (or kill ${sv.pid}: SIGTERM, the server saves and exits)`, 'warn')
  }
  // speech-to-text for voice.json word timings and the take check (docs/stories.md "Setup"; agent/speakers owns tts.py)
  if (fs.existsSync(tts)) {
    const r = sh(tts, ['-c', 'import importlib.util as u; print(",".join(m for m in ("faster_whisper", "whisper", "transformers") if u.find_spec(m)))'])
    const have = (r.stdout || '').trim()
    // voice_check.py and align.py run on transformers' Whisper; scripts/whisper_shim/ gives openai-whisper's API on
    // faster-whisper for older tools: openai-whisper itself (a torch download) is never needed
    ck('whisper in ~/.hb-tts', !!have, have ? `installed: ${have.replace('faster_whisper', 'faster-whisper').replace('whisper,', 'openai-whisper,')} (align.py, voice_check.py and speaker_check.py use transformers; scripts/whisper_shim/ maps openai-whisper's API onto faster-whisper)` : 'none of faster-whisper, openai-whisper, transformers is installed',
      '~/.hb-tts/bin/pip install transformers (align.py, voice_check.py, speaker_check.py); never openai-whisper (it pulls torch): for a tool that imports whisper, PYTHONPATH=scripts/whisper_shim with faster-whisper', 'warn')
  } else ck('whisper in ~/.hb-tts', false, `no ${tts}`, 'python3 -m venv ~/.hb-tts && ~/.hb-tts/bin/pip install faster-whisper (docs/stories.md "Setup")', 'warn')
  const bad = checks.filter(c => c.level === 'error'), warn = checks.filter(c => c.level === 'warn')
  out(checks.map(c => `${c.level === 'ok' ? 'ok   ' : c.level === 'warn' ? 'WARN ' : 'FAIL '} ${c.name}: ${c.detail}${c.fix ? `\n        fix: ${c.fix}` : ''}`).join('\n') + `\n${bad.length ? `${bad.length} failing` : 'ready'}${warn.length ? `, ${warn.length} warning(s)` : ''}`, { ok: !bad.length, checks })
  if (bad.length) hint(`${bad[0].name}: ${bad[0].fix}${bad.length > 1 ? ` (and ${bad.length - 1} more FAIL above)` : ''}, then ./hb doctor${fl.story ? ' --story' : ''}`)
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
  const mk = require('./make').loadState(WORK, name)
  if (mk) s.make = { stage: mk.stage, status: mk.status, updated: mk.updated, blockers: mk.blockers || [], next: mk.next, line: require('./make').summary(mk, ago) }
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
    lines.push(`${s.name.padEnd(24)} ${bits.join(' | ')}${s.make ? `\n${' '.repeat(25)}${s.make.line}` : ''}\n${' '.repeat(25)}next: ${s.make && s.make.next && !/^done/.test(s.next) ? s.make.next : s.next}`)
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

// ---------------------------------------------------------------- map (a top-down plan of the set per shot)
// The recorded blocks seen from above (each column's top block, coloured by kind, shaded by height), in set offsets
// (dx east, dz south from the set origin), north up, with each shot's camera (a wedge: where it looks and how wide)
// and the cast (filled = in frame, hollow = out of it), named. For placing scenes without guessing which way is
// which (folds in claude/cinematic-default's scripts/set_map.js). Writes map.png (one panel per shot or moment)
// and columns.json ({ "dx,dz": [y, block] } at the first panel: feet stand at y + 1).
const MAP_SKIP = /^(air|cave_air|void_air|short_grass|tall_grass|fern|large_fern|snow|dandelion|poppy|vine|torch|wall_torch|light|barrier|structure_void)$|flower|tulip|orchid|allium|bluet|daisy|lily_of|bush|sapling|_carpet$/
const mapColour = (n) => /water|bubble_column/.test(n) ? [50, 90, 200] : /lava/.test(n) ? [230, 90, 20] : /leaves/.test(n) ? [40, 110, 40]
  : /log|planks|wood|door|fence|stairs|slab|trapdoor|barrel|bed|bookshelf|crafting|chest|lectern|composter/.test(n) ? [140, 95, 50] : /dirt_path|farmland|gravel/.test(n) ? [200, 170, 100]
  : /wheat|carrot|potato|beetroot|hay/.test(n) ? [220, 200, 60] : /sand/.test(n) ? [230, 215, 150] : /grass_block|dirt|podzol|moss|mud/.test(n) ? [90, 160, 70]
  : /snow|ice/.test(n) ? [240, 240, 250] : /glass|pane/.test(n) ? [170, 210, 230] : /wool|terracotta|concrete/.test(n) ? [200, 120, 160] : /lantern|glowstone|campfire|fire|lamp/.test(n) ? [255, 200, 60] : [130, 130, 130]
function cmdMap (fl, pos) {
  const t = resolve(pos[0], fl); printNotes(t)
  const scene = sceneFor(t)
  const S = t.rec.set || (() => { const p = t.rec.poses[0]; return { x: Math.floor(p[1]), y: Math.floor(p[2]), z: Math.floor(p[3]) } })()
  // the moments: the given ones, else the middle of every shot
  let moments
  if (pos.length > 1) moments = clock(t, pos.slice(1)).resolved.map(r => ({ tick: r.tick, label: `${r.spec}${r.out !== null && r.out !== undefined ? ` (${r.out.toFixed(2)} s)` : ''}` }))
  else moments = clock(t).shots.filter(s => s.ticks[0] !== null).map(s => ({ tick: Math.floor((s.ticks[0] + s.ticks[1]) / 2), label: `shot ${s.n}${s.line ? ' ' + s.line : ''} (${s.out[0].toFixed(1)}-${s.out[1].toFixed(1)} s)` }))
  if (fl.max) moments = moments.slice(0, Number(fl.max))
  if (!moments.length) die('no shots or moments to map')
  const R = Number(fl.radius || 48)
  const panels = moments.map(m => {
    scene.worldAt(m.tick)
    const cam = scene.cameraAt(m.tick)
    const seen = new Map(cam.known ? scene.view(cam, m.tick).map(e => [e.id, e.visible]) : [])
    const cast = scene.entities(m.tick).filter(e => A.isCast(e) && Math.abs(e.x - S.x) <= R && Math.abs(e.z - S.z) <= R)
      .map(e => ({ label: e.user || e.label, x: e.x - S.x, z: e.z - S.z, y: e.y - S.y, yaw: e.yaw, seen: !!seen.get(e.id) }))
      .map(c => Math.abs(c.y) > 12 ? { ...c, parked: true } : c)   // parked above or below the set: listed, not drawn
    const p = scene.pose(m.tick)
    if (cam.known && /^shot /.test(cam.mode || '') && !/\(pov\)/.test(cam.mode)) cast.push({ label: 'narrator', x: p.x - S.x, z: p.z - S.z, y: p.feetY - S.y, yaw: p.yaw, seen: false, self: true })
    return { ...m, cam: cam.known ? { x: cam.x - S.x, z: cam.z - S.z, y: cam.y - S.y, yaw: cam.yaw, pitch: cam.pitch, fov: cam.fov, mode: cam.mode } : null, cast }
  })
  // the area: everything placed (cameras and cast) plus a margin, at least 24 across, at most the radius
  const xs = [0], zs = [0]
  for (const pn of panels) { if (pn.cam) { xs.push(pn.cam.x); zs.push(pn.cam.z) } for (const c of pn.cast) if (!c.parked) { xs.push(c.x); zs.push(c.z) } }
  const M = 6
  let x0 = Math.max(-R, Math.floor(Math.min(...xs)) - M), x1 = Math.min(R, Math.ceil(Math.max(...xs)) + M)
  let z0 = Math.max(-R, Math.floor(Math.min(...zs)) - M), z1 = Math.min(R, Math.ceil(Math.max(...zs)) + M)
  if (x1 - x0 < 24) { const c = (x0 + x1) >> 1; x0 = c - 12; x1 = c + 12 }
  if (z1 - z0 < 24) { const c = (z0 + z1) >> 1; z0 = c - 12; z1 = c + 12 }
  const columns = {}
  for (const [i, pn] of panels.entries()) {
    scene.worldAt(pn.tick)
    const grid = []
    for (let dz = z0; dz <= z1; dz++) {
      const row = []
      for (let dx = x0; dx <= x1; dx++) {
        let y = S.y + 40, n = null
        for (; y > S.y - 40; y--) { n = scene.blockName(S.x + dx, y, S.z + dz); if (n && !MAP_SKIP.test(n)) break }
        if (!n || MAP_SKIP.test(n)) { row.push(null); continue }
        if (i === 0) columns[`${dx},${dz}`] = [y, n]
        const k = Math.max(0.55, Math.min(1.35, 1 + (y - S.y) * 0.04))
        row.push(mapColour(n).map(c => Math.min(255, Math.round(c * k))))
      }
      grid.push(row)
    }
    pn.grid = grid
  }
  const dir = path.resolve(fl.out || path.join(HBDIR, 'map', t.name))
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'map.png')
  fs.writeFileSync(path.join(dir, 'columns.json'), JSON.stringify(columns))
  const spec = { title: `${t.name}: top-down, set origin ${S.x} ${S.y} ${S.z}`, out: file, scale: Number(fl.scale || 8), x0, z0, cols: Math.min(3, panels.length), panels }
  const r = sh('python3', ['scripts/hb_map.py'], { input: JSON.stringify(spec) })
  if (r.status !== 0) die(`scripts/hb_map.py failed: ${(r.stderr || '').trim().slice(-800)}`)
  const lines = [`set origin ${S.x} ${S.y} ${S.z}; offsets are dx (east +) / dz (south +); yaw 0 = north`]
  for (const pn of panels) {
    lines.push(`${pn.label}: ${pn.cam ? `camera ${pn.cam.x.toFixed(1)} ${pn.cam.y.toFixed(1)} ${pn.cam.z.toFixed(1)} facing ${A.compass(pn.cam.yaw)} (${pn.cam.mode})` : 'camera unknown (a moving shot: ./hb describe)'}`)
    if (pn.cam && (pn.cam.x < x0 || pn.cam.x > x1 || pn.cam.z < z0 || pn.cam.z > z1)) lines.push(`    (the camera is off the map: --radius ${Math.ceil(Math.max(Math.abs(pn.cam.x), Math.abs(pn.cam.z))) + 4} to include it)`)
    for (const c of pn.cast) lines.push(`    ${c.parked ? 'parked   ' : c.seen ? 'in frame ' : 'off frame'} ${c.label} at ${c.x.toFixed(1)} ${c.y.toFixed(1)} ${c.z.toFixed(1)} facing ${A.compass(c.yaw)}`)
  }
  lines.push(`map: ${rel(file)} (${panels.length} panel(s)); columns: ${rel(path.join(dir, 'columns.json'))}`)
  out(lines.join('\n'), { origin: S, map: file, columns: path.join(dir, 'columns.json'), panels: panels.map(({ grid, ...p }) => p) })
  hint(`read ${rel(file)}; ./hb still ${t.name} <T> to check a shot`)
  return 0
}

// ---------------------------------------------------------------- rules (docs/STANDARDS.md + the dated history)
// docs/STANDARDS.md is the current checklist (one rule once, by stage, superseded ones dropped); docs/stories.md
// "House rules" + story-make's owner sections are the dated history, parsed live (lib/hb/standards.js). `./hb rules`
// prints the standards, the history's newest date and id, and whether the standards cite every history rule;
// `--log` prints the history (newest first, with keys), `--key rXXXXXX` one rule in full; `--check` fails if the
// parse finds no dated rules (the docs' layout changed) or STANDARDS.md is behind the history.
const { RULE_SOURCES, readRules, syncReport } = require('./standards')
function syncLines (sy) {
  if (sy.error) return [`STANDARDS: ${sy.error}`]
  if (sy.ok) return [`docs/STANDARDS.md (updated ${sy.updated}) cites all ${sy.rules} history rules (newest ${sy.newest}, id ${sy.id})${sy.stale.length ? `; cites ${sy.stale.length} key(s) not in this checkout's history: ${sy.stale.join(' ')}` : ''}`]
  const l = [`STANDARDS.md IS BEHIND the history (updated ${sy.updated}; history newest ${sy.newest}, id ${sy.id}): read these rules in docs/stories.md, they may change what you do:`]
  for (const r of [...sy.uncited, ...sy.newer.filter(x => !sy.uncited.includes(x))]) l.push(`  NEW [r:${r.key}] ${r.file}:${r.line} [${r.date || 'undated'}] ${r.plain.slice(0, 200)}${r.plain.length > 200 ? '...' : ''}`)
  l.push('  fix (whoever added it): fold each into docs/STANDARDS.md (standard, number, check, r:<key>), bump "Updated:"')
  return l
}
function cmdRules (fl) {
  const { rules, id, newest } = readRules()
  const sy = syncReport()
  if (fl.check) {
    const dated = rules.filter(r => r.date).length
    const parsed = rules.length >= 5 && dated >= 3
    const ok = parsed && sy.ok
    out(`${ok ? 'ok' : 'FAIL'}: ${rules.length} rules (${dated} dated) from ${RULE_SOURCES.map(s => s[0]).join(', ')}; newest ${newest}; id ${id}\n${syncLines(sy).join('\n')}`, { ok, n: rules.length, dated, newest, id, standards: { ok: sy.ok, updated: sy.updated, uncited: (sy.uncited || []).map(r => r.key), stale: sy.stale } })
    return ok ? 0 : 1
  }
  if (fl.key) {
    const r = rules.find(x => x.key === String(fl.key).replace(/^r:/, '')) || die(`no rule ${fl.key} in the history (./hb rules --log lists the keys)`)
    out(`[r:${r.key}] ${r.file}:${r.line} (${r.section}) [${r.date || 'undated'}]\n${r.plain}${r.sub.map(s => '\n    ' + s).join('')}`, r)
    return 0
  }
  if (!fl.log && !fl.since && !fl.full) {
    const st = require('./standards').readStandards()
    if (!st) die('no docs/STANDARDS.md: ./hb rules --log prints the rule history')
    out(`${st.text.trim()}\n\n${syncLines(sy).join('\n')}\n(the history with keys: ./hb rules --log; one rule: ./hb rules --key rXXXXXX)`, { standards: st.text, updated: st.updated, id, newest, sync: { ok: sy.ok, uncited: (sy.uncited || []).map(r => r.key) } })
    return 0
  }
  let list = rules
  if (fl.since) list = list.filter(r => r.date && r.date >= String(fl.since))
  const W = fl.full ? Infinity : 230
  const cut = (t) => t.length > W ? t.slice(0, W - 3).replace(/\s+\S*$/, '') + '...' : t
  const sorted = list.map((r, i) => [r, i]).sort((a, b) => String(b[0].date || '').localeCompare(String(a[0].date || '')) || a[1] - b[1]).map(x => x[0])
  const lines = [`owner's rules (history): ${list.length} of ${rules.length}, newest ${newest}, id ${id} (the current checklist is docs/STANDARDS.md: ./hb rules)`]
  for (const r of sorted) {
    lines.push(`- [${r.date || 'undated'}] [r:${r.key}] ${cut(r.plain)}`)
    for (const s of r.sub) lines.push(`    ${cut(s)}`)
  }
  lines.push(...syncLines(sy))
  lines.push(`source: ${RULE_SOURCES.map(s => s[0]).join(', ')} (--full for whole rules, --since YYYY-MM-DD)`)
  out(lines.join('\n'), { id, newest, rules: list.map(r => ({ key: r.key, date: r.date, file: r.file, section: r.section, text: r.plain, sub: r.sub })) })
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
  LAST.pace = { exit: r.status, text: r.stdout || '' }
  if (r.status === 1) hint(`each BLOCK has its fix; edit-only fixes (endAfter, cuts, captions) need scripts/reedit.sh, not a new recording. Look: ./hb describe ${name} <time>`)
  return r.status
}

// ---------------------------------------------------------------- panel (Gemini watches the finished Short as three viewers)
function cmdPanel (fl, pos) {
  const name = pos[0] || die('which stunt? (./hb panel story_x watches out/story_x.mp4)')
  const video = paceVideo(name, fl)
  const args = ['scripts/viewer_panel.py', video]
  if (fl.story) args.push('--story', path.resolve(fl.story))
  if (fl.model) args.push('--model', String(fl.model))
  if (fl.fresh) args.push('--fresh')
  if (JSON_OUT) args.push('--json')
  if (!JSON_OUT) console.log(`watching ${rel(video)} (Gemini, 2 calls, ~1-3 min; cached per mp4)`)
  const r = sh('python3', args)
  if (r.status > 1 || r.status === null) die(`scripts/viewer_panel.py failed (exit ${r.status}):\n${(r.stderr || r.stdout || '').trim().slice(-2000)}`)
  process.stdout.write(r.stdout)
  if (r.status === 1) hint('each BLOCK is 2+ viewers agreeing on a cut word, drift, a wrong voice or a missed ending: confirm it by ear/eye (short-review), then fix the take or the ending')
  return r.status
}

// ---------------------------------------------------------------- cuts (lib/hb/cuts.js: invisible cuts, STANDARDS 3b.3)
function cutsReport (t, fl) {
  const scene = sceneFor(t)
  return require('./cuts').run(scene, { story: storyFor(t, fl) })
}
function cmdCuts (fl, pos) {
  const t = resolve(pos[0], fl); printNotes(t)
  const r = cutsReport(t, fl)
  const nb = r.findings.filter(f => f.level === 'BLOCK').length, nw = r.findings.filter(f => f.level === 'WARN').length
  out([...require('./cuts').table(r.rows), ...ownerLines(r.findings), `${nb ? 'FAIL' : 'OK'}: ${nb} blocker(s), ${nw} warning(s) (eye-trace and cut timing: lib/hb/cuts.js, docs/cinematic.md "Invisible cuts")`].join('\n'), { ...r, ok: !nb })
  return nb ? 1 : 0
}

// ---------------------------------------------------------------- check
// the story's hotbar (story.json "hotbar", STANDARDS 3.6; lib/hb/hotbar.js): BLOCK on an unknown item id or a bad
// count, WARN on none or fewer than 7 filled. -> { code, summary, findings } (printed unless quiet), or null (not a story)
function hotbarCheck (name, quiet = false) {
  const l = loadStunt(name)
  const r = require('./hotbar').storyHotbarFindings(name, l.mod)
  if (!r.applies) return null
  if (!quiet && !JSON_OUT) for (const f of r.findings) console.log(`${f.level.padEnd(5)} ${r.story}: ${f.msg}`)
  const nb = r.findings.filter(f => f.level === 'BLOCK').length, nw = r.findings.filter(f => f.level === 'WARN').length
  return { code: nb ? 1 : 0, summary: nb || nw ? `${nb} blocker(s), ${nw} warning(s)` : 'full (9 slots or 7+ filled, every id a real item)', findings: r.findings }
}

function voiceStampCheck (t) {
  // a story stunt's recording carries rec.voice (lib/story.js voiceStamp); compare it with today's voice/voice.json
  const mod = t.stunt
  const sd = mod && mod.edit && typeof mod.edit.story === 'string' ? path.resolve(ROOT, mod.edit.story) : null
  if (!sd) return null
  const now = require('../story').voiceStamp(sd)
  const was = t.rec && t.rec.voice
  if (!now) return { code: 1, summary: `no ${path.relative(ROOT, sd)}/voice/voice.json: voice the story before recording` }
  if (was === undefined || was === null) return { code: 0, summary: 'WARN: this recording predates voice stamps; make sure it was recorded after the final voice' }
  return was === now ? { code: 0, summary: `recorded to the current voice (${now})` }
    : { code: 1, summary: `voice/voice.json changed since this recording (${was} -> ${now}): re-record so the cuts match the new line lengths` }
}

// a file's time for "is X newer than Y": a committed, unchanged file's commit time (a fresh checkout's mtimes are all
// "now"), else its mtime
function fileTime (p) {
  if (!fs.existsSync(p)) return 0
  const st = sh('git', ['status', '--porcelain', '--', p]).stdout
  if (!st || !st.trim()) { const t = (sh('git', ['log', '-1', '--format=%ct', '--', p]).stdout || '').trim(); if (t) return Number(t) * 1000 }
  return mtime(p)
}
// the story dir of a stunt (its edit.story), or null
function storyDirOf (name, mod) {
  if (!mod) { const l = loadStunt(name); mod = l.mod }
  const d = mod && mod.edit && mod.edit.story
  return d ? path.join(ROOT, d) : null
}
// item 4 (2026-11-10): the writers' fixed script lived only in script_vNext.md; story.json kept the old one
function scriptDriftStep (dir) {
  const ws = require('./process').scriptDrift(dir, fileTime)
  if (!JSON_OUT) for (const w of ws) console.log(`WARN  ${rel(w.script)}: ${w.msg}`)
  return { exit: 0, summary: ws.length ? `${ws.length} WARNING(s): a script*.md differs from story.json` : 'story.json is the latest script', warnings: ws }
}
// a Python check: exit 0/1 as it says, anything else (or a traceback) = it did not run (exit 2)
function pyStep (args, label) {
  const r = sh('python3', args)
  const o = ((r.stdout || '') + (r.stderr || '')).trim()
  const crashed = /Traceback \(most recent call last\)/.test(o)
  const code = crashed ? 2 : r.status === null ? 2 : r.status > 1 ? 2 : r.status
  return { code, out: o, blocks: (o.match(/^BLOCK/gm) || []).length }
}
function captionSyncStep (dir) {
  if (!dir) return { exit: 0, summary: 'skipped (not a story)', ran: false }
  if (!fs.existsSync(path.join(dir, 'voice', 'voice.json'))) return { exit: 0, summary: 'skipped: not voiced yet (./hb voice)', ran: false }
  const r = pyStep(['scripts/caption_sync.py', dir])
  if (!JSON_OUT) console.log(r.out)
  return { exit: r.code, summary: r.code === 0 ? (r.out.split('\n').pop() || 'ok') : r.code === 1 ? `${r.blocks || 1} blocker(s): captions off the voice (re-run align.py)` : 'could not run', blocks: r.blocks, ran: true, lines: r.out.split('\n').slice(-40) }
}
const CHECK_STEPS_PRE = ['motion lint', 'story hotbar', 'script drift', 'caption sync']
const CHECK_STEPS = ['motion lint', 'story hotbar', 'script drift', 'rec_check', 'lint', 'continuity', 'framing', 'owner', 'cuts', 'caption sync', 'on-screen sound', 'pace']
function writeCheckReport (name, res, fl) {
  const P = require('./process')
  const c = P.checkCounts(res)
  res.blockers = c.blockers
  res.failed = c.failed
  res.broken = c.broken
  res.label = res.ok ? 'CHECK OK' : c.blockers ? `CHECK FAILED: ${c.blockers} blocker${c.blockers === 1 ? '' : 's'}` : `CHECK INCOMPLETE: ${c.broken.join(', ')} did not run`
  res.when = new Date().toISOString()
  const text = [`${name}: ${res.label}`, ...res.steps.map(s => `${s.exit === 0 ? 'ok  ' : s.exit === 1 ? 'FAIL' : 'N/A '} ${s.name}: ${s.summary}`)].join('\n') + '\n'
  const targets = [path.join(HBDIR, `${name}.check.json`)]
  if (fl.report) targets.push(path.resolve(String(fl.report)))
  for (const p of targets) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, JSON.stringify(res, null, 1))
      fs.writeFileSync(p.replace(/\.json$/, '') + '.txt', text)
    } catch (e) { if (!JSON_OUT) console.log(`note: could not write ${rel(p)}: ${e.message}`) }
  }
  return res
}

function cmdCheck (fl, pos) {
  // before the first recording: the checks that read only the source and the story (the motion lint, the hotbar, the
  // script drift, the caption sync of the voice)
  const arg = pos[0]
  if (arg && !fl.rec && !/\.json(\.gz)?$/.test(arg) && !fs.existsSync(path.join(WORK, `${arg}.rec.json`)) && !fs.existsSync(path.join(VIDEOS, 'shorts', arg, 'recording.json.gz'))) {
    const steps = []
    const ml = motionLint(arg)
    steps.push(motionStep(arg, ml, true))
    const hb = hotbarCheck(arg)
    if (hb) steps.push({ name: 'story hotbar', exit: hb.code, summary: hb.summary, findings: hb.findings })
    const dir = storyDirOf(arg)
    if (dir) {
      steps.push({ name: 'script drift', ...scriptDriftStep(dir) })
      steps.push({ name: 'caption sync', ...captionSyncStep(dir) })
    }
    const ok = !steps.some(s => s.exit)
    const res = writeCheckReport(arg, { stunt: arg, rec: null, steps, ok, pre: true }, fl)
    if (!JSON_OUT) { for (const s of steps) console.log(`== ${s.name}: ${s.summary}`); console.log(`\nno recording yet: the pre-record checks only (${CHECK_STEPS_PRE.join(', ')}). ${ok ? 'PRE-RECORD OK' : `PRE-RECORD FAILED: ${res.failed.concat(res.broken).join(', ')}`}`) } else out(null, res)
    LAST.check = res
    hint(ok ? `./hb record ${arg}` : `fix the blockers above, then ./hb check ${arg} && ./hb record ${arg}`)
    return ok ? 0 : 1
  }
  const t = resolve(pos[0], fl); printNotes(t)
  const recp = plainRec(t)
  const res = { stunt: t.stuntName, rec: recp, steps: [] }
  const step = (name, code, summary, extra = {}) => { res.steps.push({ name, exit: code, summary, ...extra }); if (!JSON_OUT) console.log(`\n== ${name}: ${summary}`) }
  const dir = storyDirOf(t.stuntName, t.stunt)
  // 0. the motion lint on the source (lib/hb/motion_lint.js): raw moves and a line clock of the stunt's own
  const ml = motionLint(t.stuntName)
  { const ms = motionStep(t.stuntName, ml, !!(t.rec && t.rec.act)); step(ms.name, ms.exit, ms.summary, { hits: ms.hits, settle: ms.settle }) }
  // 0b. the story's hotbar (story.json): an unknown item id blocks; the recording's own hotbar is rec_check's
  const hb = hotbarCheck(t.stuntName)
  if (hb) step('story hotbar', hb.code, hb.summary, { findings: hb.findings })
  // 0c. the recording was staged to today's voice (record AFTER the voice is final: a re-take changes line lengths)
  const vs = voiceStampCheck(t)
  if (vs) step('voice stamp', vs.code, vs.summary)
  // 0c. a writer's script*.md newer than story.json with other lines (WARN)
  if (dir) { const sd = scriptDriftStep(dir); step('script drift', sd.exit, sd.summary, { warnings: sd.warnings }) }
  // 1. rec_check (cuts, holds, turns, the cast's motion, set, vanilla, hotbar, sight to every dig/place)
  const rc = sh('python3', ['scripts/rec_check.py', t.stuntName, recp, '--no-owner'])
  const rcOut = ((rc.stdout || '') + (rc.stderr || '')).trim()
  if (!JSON_OUT) console.log(rcOut)
  const skipped = /skip|could not|not found|Cannot find module/i.test(rcOut) ? rcOut.split('\n').filter(l => /skip|could not|not found|Cannot find module/i.test(l)) : []
  step('rec_check', rc.status === null ? 2 : rc.status, rc.status === 0 ? 'no blockers' : rc.status === 1 ? `${(rcOut.match(/^\s*BLOCK/gm) || []).length || 'some'} BLOCKER(s) (re-record)` : `could not run (exit ${rc.status})`, { skipped, blocks: (rcOut.match(/^\s*BLOCK/gm) || []).length })
  // 2. lint: the stunt lint (lib/hb/stunt_lint.js: banned sounds r:r4df33c, a timer reset at every attempt r:r32b983)
  // for every stunt, and the movie engine's (cameras, subjects, the 180-degree line) when this render.js has it
  {
    const pkgDir = path.join(VIDEOS, 'shorts', t.name)
    const ofPkg = t.recFrom === 'published package' || (fl.stunt_file && path.resolve(String(fl.stunt_file)).startsWith(pkgDir + path.sep))
    let sl, slErr = null
    let audioRef = null   // a published package: its sounds as made (the audio.py of its code.commit)
    if (ofPkg) { try { audioRef = (JSON.parse(fs.readFileSync(path.join(pkgDir, 'metadata.json'), 'utf8')).code || {}).commit || null } catch (e) {} }
    if (audioRef && sh('git', ['cat-file', '-e', `${audioRef}:audio.py`]).status !== 0) audioRef = null
    try { sl = require('./stunt_lint').run({ stunt: t.stunt, rec: t.rec, recPath: t.recPath, pkgDir: ofPkg ? pkgDir : null, audioRef }) } catch (e) { slErr = e.message; sl = [] }
    const slo = slErr ? [`stunt lint could not run: ${slErr}`] : require('./stunt_lint').lines(sl)
    const sb = sl.filter(f => f.level === 'BLOCK').length
    let code = slErr ? 2 : sb ? 1 : 0, lo = slo, ran = true
    if (/process\.env\.LINT/.test(fs.readFileSync(path.join(ROOT, 'render.js'), 'utf8'))) {
      const l = sh('node', ['render.js', recp], { env: { ...process.env, LINT: '1' } })
      lo = lo.concat(((l.stdout || '') + (l.stderr || '')).trim().split('\n').filter(x => !/^(filled|simulated|meshing|light computed|shot ')/.test(x)))
      code = Math.max(code, l.status === null ? 2 : l.status)
    } else ran = !slErr
    if (!JSON_OUT) console.log(lo.join('\n'))
    step('lint', code, code === 0 ? 'clean' : sb ? `${sb} blocker(s): ${[...new Set(sl.filter(f => f.level === 'BLOCK').map(f => f.check))].join(', ')}` : 'PROBLEMS', { lines: lo, findings: sl, ran })
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
  // 5. the cuts (lib/hb/cuts.js, STANDARDS 3b.3): the eye's jump across each cut, the cut against the words
  const cu = cutsReport(t, fl)
  if (!JSON_OUT) console.log([...require('./cuts').table(cu.rows), ...ownerLines(cu.findings)].join('\n'))
  const cb = cu.findings.filter(f => f.level === 'BLOCK').length
  step('cuts', cb ? 1 : 0, `${cb} blocker(s), ${cu.findings.filter(f => f.level === 'WARN').length} warning(s) over ${cu.rows.length} cuts`, { findings: cu.findings, rows: cu.rows })
  // 6. the captions against the voice (scripts/caption_sync.py; owner: "the captions are not lined up correctly")
  const cs = captionSyncStep(dir)
  step('caption sync', cs.exit, cs.summary, { ran: cs.ran, blocks: cs.blocks, lines: cs.lines })
  // 7. every visible action makes its sound (scripts/onscreen_sfx.py --strict; owner: silent actions)
  const os_ = pyStep(['scripts/onscreen_sfx.py', recp, ...(dir ? ['--story', dir] : []), '--strict'])
  if (!JSON_OUT) console.log(os_.out.split('\n').filter(l => /silent|SILENT|stay|BLOCK|WARN|Traceback|Error/.test(l)).join('\n'))
  const silentN = Number((/(\d+) visible action\(s\) that stay silent/.exec(os_.out) || [])[1] || 0)
  step('on-screen sound', os_.code, os_.code === 0 ? (silentN ? `${silentN} silent (not strict)` : 'every visible action has its sound') : os_.code === 1 ? `${silentN || 'some'} visible action(s) stay silent` : 'could not run', { blocks: silentN || undefined, lines: os_.out.split('\n').slice(-30) })
  // 8. pace on the finished Short, when one is here and newer than the recording
  const mp4 = [fl.video && path.resolve(String(fl.video)), path.join(ROOT, 'out', `${t.name}.mp4`)].filter(Boolean).find(p => fs.existsSync(p))
  // an edit-only change (the stunt file newer than the render) would score the OLD cut against the new edit's marks
  // and block the very re-render that fixes it (several workers, 2026-11-11): skip pace until the new render is here
  const stuntJs = path.join(ROOT, 'stunts', `${t.stuntName}.js`)
  const editNewer = mp4 && !fl.video && fs.existsSync(stuntJs) && mtime(stuntJs) > mtime(mp4)
  if (editNewer) step('pace', 0, `skipped: stunts/${t.stuntName}.js is newer than ${rel(mp4)} (render it again; --reuse for an edit-only change)`, { ran: false })
  else if (mp4 && (fl.video || t.recFrom !== 'work' || mtime(mp4) >= mtime(t.recPath))) {
    const pr = sh('python3', ['scripts/pace.py', t.name, '--video', mp4, '--stunt', t.stuntName, '--rec', t.recPath])
    const po = ((pr.stdout || '') + (pr.stderr || '')).trim()
    if (!JSON_OUT) console.log(po)
    step('pace', pr.status === null || pr.status > 1 ? 2 : pr.status, pr.status === 0 ? `clean on ${rel(mp4)}` : pr.status === 1 ? `BLOCKERS on ${rel(mp4)}` : 'could not run', { blocks: (po.match(/^\s*BLOCK/gm) || []).length, video: mp4 })
  } else step('pace', 0, mp4 ? `skipped: ${rel(mp4)} is older than the recording (render it again)` : 'skipped: no rendered Short yet (runs after ./hb render --fetch)', { ran: false })
  res.ok = !res.steps.some(s => s.exit)
  writeCheckReport(t.name, res, fl)
  LAST.check = res
  const notRun = res.steps.filter(s => s.ran === false).map(s => `${s.name} (${s.summary.replace(/^skipped:? ?/, '')})`)
  if (!JSON_OUT) {
    console.log(`\nran: ${res.steps.filter(s => s.ran !== false).map(s => s.name).join(', ')}${notRun.length ? `\nnot run: ${notRun.join('; ')}` : ''}`)
    console.log(`${res.ok ? 'CHECK OK' : `${res.label}: ${[...res.failed, ...res.broken.map(b => b + ' did not run')].join(', ')}`} (warnings need a reason or a fix; report: ${rel(path.join(HBDIR, `${t.name}.check.txt`))})`)
  } else out(null, res)
  hint(res.ok ? `./hb sheet ${t.name} (look at every shot), then ./hb render ${t.name}` : `fix the stunt (or the story) and ./hb record ${t.name}, then ./hb check ${t.name}`)
  return res.ok ? 0 : 1
}

// ---------------------------------------------------------------- the long steps
function needServer () {
  const b = busy()
  if (b.server) die(`the Minecraft server is in use (one batch at a time, fixed port): ${b.procs.filter(p => p.kind !== 'render').map(p => `${p.kind} pid ${p.pid} in ${p.cwd}`).join('; ')}. Wait and retry (./hb status).`)
}
// the motion lint on a stunt's source (lib/hb/motion_lint.js): raw looks, teleports, raw digs/places/opens, gap hacks.
// -> the hits (printed unless quiet)
function motionLint (name, quiet = false) {
  const f = path.join(ROOT, 'stunts', `${name}.js`)
  if (!fs.existsSync(f)) return []
  const hits = require('./motion_lint').lintFile(f)
  if (!quiet && !JSON_OUT) for (const h of hits) console.log(`stunts/${name}.js:${h.line}: ${h.what}: use ${h.use}\n    ${h.text}`)
  return hits
}
// the motion lint as a check step. A raw action (kind 'action': a place, break or use that isn't aimed by lib/act.js
// or the story kit; owner r:rffba12) blocks every stunt recorded since the gate (rec.act; strict: the pre-record
// check); other raw motion blocks a story. The settle hint (lib/hb/motion_lint.js settleHint) is a warning.
function motionStep (name, ml, strict) {
  const act = ml.filter(h => h.kind === 'action')
  const story = /^(\.hb_pkg_)?story_/.test(name)
  const sh = settleHintOf(name)
  const exit = (story && ml.length) || (strict && act.length) ? 1 : 0
  const summary = (ml.length ? `${ml.length} raw motion / own-clock call(s)${act.length ? ` (${act.length} raw action(s): use lib/act.js A.place / A.dig / A.use / A.useOn, or the K. primitives${strict ? '' : '; recorded before the gate: re-record to fix'})` : ': use the K. primitives'}` : 'clean') + (sh ? `; WARN ${sh.what}: ${sh.use}` : '')
  return { name: 'motion lint', exit, summary, hits: ml, settle: sh || undefined }
}
function settleHintOf (name) {
  const f = path.join(ROOT, 'stunts', `${name}.js`)
  return fs.existsSync(f) ? require('./motion_lint').settleHint(fs.readFileSync(f, 'utf8')) : null
}
function cmdMotion (fl, pos) {
  // ./hb motion lib: the shared factories in lib/ (the action rules; lib/act.js, the story kit and the harness are the helpers)
  if (pos[0] === 'lib' || fl.lib) {
    const hits = require('./motion_lint').lintLib()
    if (!JSON_OUT) for (const h of hits) console.log(`${h.file}:${h.line}: ${h.what}: use ${h.use}\n    ${h.text}`)
    out(hits.length ? `${hits.length} raw action(s) in lib/: gate them through lib/act.js (A.click / A.breakStart / A.digNow / A.strike, or A.place / A.dig / A.useOn), or // motion-ok: <reason>` : 'lib/ clean: every action in the shared factories is aimed by lib/act.js', { hits })
    return hits.length ? 1 : 0
  }
  const name = pos[0] || die('which stunt?')
  const hits = motionLint(name)
  const act = hits.filter(h => h.kind === 'action')
  const sh = settleHintOf(name)
  if (sh && !JSON_OUT) console.log(`WARN stunts/${name}.js: ${sh.what}: use ${sh.use}`)
  out(hits.length ? `${hits.length} raw motion call(s)${act.length ? `, ${act.length} of them ERRORS: a place / break / use not aimed by construction (owner r:rffba12; lib/act.js: const A = require('../lib/act')(ctx), then A.place / A.dig / A.use / A.useOn)` : ''}: each moves the camera or the cast unlike a player (docs/engine_features.md "Motion by construction"); use the helper named, or say why on the line with // motion-ok: <reason>` : 'motion lint clean: every move and action goes through the helpers', { hits, settle: sh })
  return hits.length ? 1 : 0
}
function cmdRecord (fl, pos) {
  const name = pos[0] || die('which stunt?')
  const l = loadStunt(name); if (l.error) die(l.error)
  // before the server starts: a story that moves raw is not recorded (--no-motion-lint to record it anyway)
  if (!fl.no_motion_lint) {
    const hits = motionLint(name)
    const bad = /^story_/.test(name) ? hits : hits.filter(h => h.kind === 'action')
    if (bad.length) die(`${bad.length} raw ${/^story_/.test(name) ? 'motion' : 'action'} call(s) in stunts/${name}.js (above): ${/^story_/.test(name) ? '' : 'every place / break / use goes through lib/act.js (A.place / A.dig / A.use / A.useOn: aimed by construction, owner r:rffba12); '}fix them (or // motion-ok: <reason> on the line) before recording (--no-motion-lint records it anyway)`)
  }
  // ...nor one whose story.json hotbar names an item the server would refuse (the set-up would fail on /item replace)
  const hb = hotbarCheck(name)
  if (hb && hb.code) die(`story.json "hotbar" (above): ${hb.summary}. Fix it before recording (./hb check ${name})`)
  // a full disk killed a recording (and git) mid-take (2026-11-10): the server's world, the log and the recording need room
  const gb = freeGB(ROOT)
  if (gb < 2 && !fl.force) die(`${gb.toFixed(1)} GB free (under 2 GB): a recording would die mid-take. Free space first: ./hb clean --dry-run, then ./hb clean`)
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
function storyDir (name) {
  if (fs.existsSync(path.join(ROOT, name, 'story.json'))) return name
  const l = loadStunt(name)
  return (l.mod && l.mod.edit && l.mod.edit.story) || die(`${name}: no edit.story in the stunt`)
}
// does every character still sound like the same person? (docs/voices.md "Drift gate"; owner, 2026-11-10)
function cmdMixcheck (fl, pos) {   // the final mix (NCS bed) through the publish gate, before calling a Short READY
  const name = pos[0] || die('which stunt? (./hb mixcheck <name>: out/<name>.mp4 + work/<name>.rec.json)')
  const code = run('python3', ['scripts/mixcheck.py', name, ...(fl.video ? ['--video', fl.video] : []), ...(fl.keep ? ['--keep'] : [])])
  if (code) hint(`land the NCS drop on the payoff (edit.dropAt), add ['dip', mark, 0.4] (+ ['impact', mark, {gain: 1.4}] only if the game track is busy: on a quiet stunt the impact sets the track's loudness and pushes the rest ~28 dB down, mislabel_grandma), no riser over the dip; then ./hb check on the no-song render too; re-render (--reuse), ./hb mixcheck ${name}`)
  return code
}
function cmdDrift (fl, pos) {
  const dir = storyDir(pos[0] || die('which stunt (or stories/<dir>)?'))
  const py = path.join(os.homedir(), '.hb-tts', 'bin', 'python')
  const code = run(fs.existsSync(py) ? py : 'python3', ['scripts/voice_drift.py', dir, ...(fl.only ? ['--only', fl.only] : []), ...(fl.json ? ['--json'] : [])])
  if (code) hint(`a voice drifts (a blocker): listen to the flagged lines, then ./hb voice ${pos[0]} (re-takes drifting lines on the locked model, keeps the closest) or --only <id>`)
  return code
}
function cmdVoice (fl, pos) {
  const dir = storyDir(pos[0] || die('which stunt (or stories/<dir>)?'))
  const py = path.join(os.homedir(), '.hb-tts', 'bin', 'python')
  if (!fs.existsSync(py)) die(`no TTS venv (${py}): see docs/stories.md "Setup" (./hb doctor)`)
  const only = fl.only ? ['--only', fl.only] : []
  if (!fs.existsSync(path.join(ROOT, dir, 'story.json'))) die(`no ${dir}/story.json: the writers' deliverable is story.json (a script*.md is notes only; .claude/skills/story-write)`)
  const story = JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'story.json'), 'utf8'))
  if (!story.cast) return run(py, ['scripts/voice.py', dir, ...only])   // a v1 story: the Kokoro narrator
  // a v2 story (a voiced cast, docs/voices.md): Gemini takes cut safely (docs/voices.md "The cut"), every line checked for the
  // right voice and words and re-taken when wrong (single-speaker), then word timings, then the final check
  if (fl.check) return run(py, ['scripts/speaker_check.py', dir, ...only]) || run(py, ['scripts/voice_drift.py', dir, ...only])
  // a writer's script*.md newer than story.json with other lines: voicing now would voice the OLD script (2026-11-10)
  const drift = require('./process').scriptDrift(path.join(ROOT, dir), fileTime)
  if (drift.length) {
    for (const w of drift) console.error(`WARN  ${rel(w.script)}: ${w.msg}`)
    if (!fl.force) die(`story.json is older than ${drift.map(w => path.basename(w.script)).join(', ')} and its lines differ: put the fixed lines in story.json (the deliverable), or --force to voice story.json as it is`)
  }
  const tts = ['scripts/tts.py', dir, ...only, ...(fl.retakes !== undefined ? ['--retakes', String(fl.retakes)] : []), ...(fl.no_check ? ['--no-check'] : [])]
  const rerun = `./hb voice ${pos[0]}${fl.only ? ` --only ${fl.only}` : ''}`
  let code = run(py, tts, { env: { ...process.env, HB_RERUN: rerun } })
  if (code === 75) { if (!JSON_OUT) console.log('(exit 75: quota, retry later: the NEXT line above has the UTC time and the command; ./hb quota shows the counts)'); return 75 }
  if (code) { hint(`tts.py stopped (exit ${code}; the reason is above): fix it, then ${rerun} (takes so far are cached)`); return code }
  code = run(py, ['scripts/align.py', dir, ...only])
  if (code) { hint(`align.py failed: ./hb doctor --story (the aligner: transformers in ~/.hb-tts), then ${rerun} (cached takes, no request)`); return code }
  code = run(py, ['scripts/speaker_check.py', dir])
  if (code) hint(`a line is in the wrong voice or has the wrong words (a blocker): listen to it, then ./hb voice ${pos[0]} --only <id> (a fresh take), or fix its text/direction`)
  else if ((code = run(py, ['scripts/voice_drift.py', dir]))) hint(`a voice drifts from its character (a blocker): ./hb drift ${pos[0]} for which lines/windows; tts.py already re-took them twice, so fix the direction or re-take the character's lines`)
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
    // --wait/--fetch never queue: with a recording newer than the last queue they'd hand back the old Short
    const qp = path.join(WORK, `${name}.render_queued`)
    if (fs.existsSync(rp) && (!fs.existsSync(qp) || fs.statSync(rp).mtimeMs > fs.statSync(qp).mtimeMs)) die(`${rel(rp)} is newer than the last queued render: --wait/--fetch would fetch the old Short. Queue it first: ./hb render ${name}`)
    const code = run('bash', ['scripts/render_on_actions.sh', fl.wait ? '--wait' : '--fetch', name])
    if (code === 0) { out(`out/${name}.mp4`, { video: path.join(ROOT, 'out', `${name}.mp4`) }); hint(`./hb review ${name}`) } else if (code === 3) hint(`still rendering: ./hb render ${name} --wait`)
    return code
  }
  if (!fs.existsSync(rp)) die(`no ${rel(rp)}: ./hb record ${name}`)
  const l = loadStunt(name); if (l.error) die(l.error)
  // no render of a recording with known blockers unless it is asked for as a preview (and then it is labelled):
  // the last ./hb check of THIS recording (work/hb/<name>.check.json), else the check runs now (~20 s)
  const cp_ = path.join(HBDIR, `${name}.check.json`)
  let chk = null
  try { chk = JSON.parse(fs.readFileSync(cp_, 'utf8')); if (chk.pre || mtime(cp_) < mtime(rp)) chk = null } catch (e) { chk = null }
  if (!chk && !fl.no_check) {
    if (!JSON_OUT) console.log(`checking the recording first (./hb check ${name}; the Actions run checks it again and labels the Short)`)
    sh(process.execPath, [path.join(ROOT, 'hb'), 'check', name, '--json'])
    try { chk = JSON.parse(fs.readFileSync(cp_, 'utf8')) } catch (e) {}
  }
  if (chk && !chk.ok) {
    if (!fl.preview) die(`${chk.label || 'CHECK FAILED'} (${(chk.failed || []).concat(chk.broken || []).join(', ')}; ${rel(cp_.replace(/\.json$/, '.txt'))}): fix them and re-record, or ./hb render ${name} --preview to render it anyway, labelled "${chk.label}" on the picture`)
    if (!JSON_OUT) console.log(`--preview: rendering over ${chk.label}; the Short will carry the label`)
  }
  if (!fl.local) {
    const dirty = sh('git', ['status', '--porcelain', '--', 'render.js', 'renderer', 'edit.py', 'scripts', 'audio.py']).stdout.trim()
    if (dirty) die(`uncommitted changes the Actions render would not get (only stunts/, lib/, stories/ are carried):\n${dirty}\ncommit them first`)
    // re-edit on Actions: when the picture can't have changed since the last finished render of this name (the same
    // recording, render code and stunt picture fields: only the edit, captions, voice timing or sound), the run reuses
    // that render's frames and only re-runs the edit (~6-8 min instead of 10-20). --reuse asks for it (hb make does
    // by default), --no-reuse never; the workflow falls back to a full render when the old frames have expired.
    const key = pictureKey(name, rp, l.mod)
    const env = { ...process.env, PICTURE_KEY: key, ...(fl.preview ? { PREVIEW: '1' } : {}) }
    if (fl.reuse && !fl.no_reuse) {
      const prev = reusableRender(name, key)
      if (prev.run) { env.REUSE_RUN = prev.run; if (!JSON_OUT) console.log(`reusing the frames of ${prev.url} (same recording and picture code: only the edit changed). --no-reuse renders them again`) } else if (!JSON_OUT) console.log(`frames not reusable: ${prev.why}`)
    }
    const code = run('bash', ['scripts/render_on_actions.sh', name], { env })
    let rb = `render/${name}`; try { rb = fs.readFileSync(path.join(WORK, `${name}.render_branch`), 'utf8').trim() || rb } catch (e) {}
    if (code === 0) { out(`queued ${rb} on Actions (~10-20 min; your working branch is never written)`, { queued: rb }); hint(`./hb render ${name} --wait (polls with git), meanwhile ./hb preview ${name} or ./hb sheet ${name}`) }
    return code
  }
  const n = Math.floor((JSON.parse(fs.readFileSync(rp)).poses.length - 1) / 20 * 60)
  const need = n * 1.3 / 1024
  if (freeGB(ROOT) < need + 1) die(`a local render writes ~${need.toFixed(1)} GB of frames and ${freeGB(ROOT).toFixed(1)} GB is free: render on Actions (./hb render ${name})`)
  if (busy().renders) console.log('note: other render.js processes are running here: this will be slow (~20 s of render per video second on a free box)')
  fs.rmSync(path.join(WORK, `${name}.frames`), { recursive: true, force: true })
  let code = run('node', ['render.js', rp, `work/${name}.frames`, '60', '1080', '1011'])
  if (code === 0) code = run('bash', ['scripts/finish_render.sh', name, name])
  if (code === 0 && chk && !chk.ok) run('python3', ['scripts/check_label.py', path.join('out', `${name}.mp4`), cp_])   // the preview carries its blockers
  if (code === 0) { out(`out/${name}.mp4 (frames kept in work/${name}.frames: delete them when the review passes)`, { video: path.join(ROOT, 'out', `${name}.mp4`) }); hint(`./hb review ${name}`) }
  return code
}
// what decides the picture of an Actions render (not the edit): the recording's bytes, the committed render code
// (Actions renders HEAD's render.js, renderer/, package-lock.json, versions.env) and the stunt's exports other than
// `edit`, functions as source (lib/ is hashed too: shots may call its helpers; lib/hb is the CLI)
function pictureKey (name, rp, mod) {
  const h = require('crypto').createHash('sha1')
  h.update(fs.readFileSync(rp))
  h.update(sh('git', ['rev-parse', 'HEAD:render.js', 'HEAD:renderer', 'HEAD:package-lock.json', 'HEAD:versions.env']).stdout || 'no-git')
  const seen = new Set()
  const dump = (v) => {
    if (typeof v === 'function') return `fn:${v.toString()}`
    if (!v || typeof v !== 'object') return v
    if (seen.has(v)) return '[cycle]'
    seen.add(v)
    if (Array.isArray(v)) return v.map(dump)
    const o = {}; for (const k of Object.keys(v).sort()) o[k] = dump(v[k]); return o
  }
  const { edit, ...pic } = mod || {}
  h.update(JSON.stringify(dump(pic)) || '')
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name !== 'hb' && f.name !== 'node_modules') walk(p) } else if (/\.js(on)?$/.test(f.name)) { h.update(p.slice(ROOT.length)); h.update(fs.readFileSync(p)) } } }
  try { walk(path.join(ROOT, 'lib')) } catch (e) {}
  return h.digest('hex').slice(0, 16)
}
// small files of a render branch, read through a throwaway object store that borrows the shared .git's objects: the
// branch's mp4 never lands in the shared .git (scripts/render_on_actions.sh --fetch does the same). null: no branch
function renderBranchFiles (branch, files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-render-peek-'))
  try {
    const common = path.resolve(ROOT, sh('git', ['rev-parse', '--git-common-dir']).stdout.trim())
    if (sh('git', ['init', '-q', '--bare', tmp]).status !== 0) return null
    fs.writeFileSync(path.join(tmp, 'objects', 'info', 'alternates'), path.join(common, 'objects') + '\n')
    const env = { ...process.env, GIT_DIR: tmp }
    const url = sh('git', ['remote', 'get-url', 'origin']).stdout.trim() || 'origin'
    if (sh('git', ['fetch', '-q', url, `refs/heads/${branch}`], { env, timeout: 120000 }).status !== 0) return null
    return files.map(f => { const r = sh('git', ['show', `FETCH_HEAD:${f}`], { env }); return r.status === 0 ? r.stdout : null })
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
}
// the last finished Actions render of this name, if its frames can stand in: { run, url } or { why }
function reusableRender (name, key) {
  let branch = `render/${name}`; try { branch = fs.readFileSync(path.join(WORK, `${name}.render_branch`), 'utf8').trim() || branch } catch (e) {}
  const got = renderBranchFiles(branch, ['renders/slices.json', 'renders/result.json'])
  if (!got) return { why: `no ${branch} on origin yet` }
  let job, res
  try { job = JSON.parse(got[0]); res = JSON.parse(got[1]) } catch (e) { return { why: `${branch} has no finished render` } }
  if (!job || !res) return { why: `${branch}'s last job has no result yet (still running?)` }   // (JSON 'null': crashed on res.status)
  if (res.status !== 'done' || res.queued !== job.queued) return { why: `${branch}'s last job did not finish (${res.status}${res.queued !== job.queued ? ', result from an older job' : ''})` }
  if (!job.picture_key) return { why: `${branch} was queued before picture keys existed: this render does all the frames (the next one can reuse them)` }
  if (job.picture_key !== key) return { why: 'the picture changed (recording, render code, or the stunt\'s shots/look/cast): rendering every frame' }
  const run = job.reuse_run || (/\/runs\/(\d+)/.exec(res.run || '') || [])[1]
  if (!run) return { why: 'no run id in the last result' }
  if (Date.now() - Date.parse(res.finished || 0) > 60 * 3600e3) return { why: 'the last render\'s frames are over 60 h old (Actions keeps them 3 days)' }
  return { run, url: res.run }
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
  // the rest of the automatic gates in the same report (docs/STANDARDS.md): the owner's notes on the recording, the
  // voice takes' edges and, where scripts/speaker_check.py exists (agent/speakers), the right speaker on every line
  const extra = reviewChecks(name, fl)
  // the v3 gate on the FINAL mix (the NCS bed publish adds; scripts/mixcheck.py): cells_lab, dilemma_mace and
  // race_grass_mycelium passed pace on the no-song render, were reviewed READY, then blocked at publish (lessons 2026-11-11)
  if (!/^story_/.test(name) && !fl['no-mix']) {
    const mc = sh('python3', ['scripts/mixcheck.py', name, '--video', mp4])
    const mt = ((mc.stdout || '') + (mc.stderr || '')).trim().split('\n')
    extra.push({ name: 'final mix (./hb mixcheck)', exit: mc.status === 1 ? 1 : 0, summary: mt[mt.length - 1] || 'no output',
      text: mt.filter(l => /^\s*BLOCK|^(FAIL|OK):/.test(l)).join('\n') })
  }
  const qdir = path.join(WORK, 'qa_frames', name)
  const sheets = fs.existsSync(qdir) ? fs.readdirSync(qdir).filter(f => /^sheet_\d+\.jpg$/.test(f)).map(f => path.join(qdir, f)) : []
  const flags = fs.existsSync(qdir) ? fs.readdirSync(qdir).filter(f => f.startsWith('flag_')).map(f => path.join(qdir, f)) : []
  log.rounds.push({ at: new Date().toISOString(), video_mtime: new Date(mtime(mp4)).toISOString() })
  fs.writeFileSync(rv, JSON.stringify(log, null, 1))
  const n = log.rounds.length
  const lines = [((qa.stdout || '') + (qa.stderr || '')).trim().split('\n').slice(-6).join('\n'), '', baText, '',
    `== pace (./hb pace ${name})${pace.exit === 1 ? ': BLOCKERS (each is a review blocker)' : ''}`, pace.text, '',
    // the aim on every action (owner r:rffba12), pulled out of pace so the reviewer sees the numbers
    `== aim on the action (r:rffba12; scripts/owner_checks.py, max 15 deg each, at most 10% over 6 deg)`,
    ...(aimLines(pace.text).length ? aimLines(pace.text) : ['  (no aim numbers: pace had no recording)']), '',
    ...extra.map(x => `== ${x.name}: ${x.summary}${x.text ? '\n' + x.text : ''}`), '',
    `review round ${n}${n > 2 ? ' (OVER the 2-round cap: fix only blockers and ship, or ask the lead)' : ''}`,
    `report: ${rel(path.join(qdir, 'report.txt'))}; ${sheets.length} sheets, ${flags.length} flag images in ${rel(qdir)}`,
    `the review: .claude/skills/short-review/SKILL.md (frame review + retention + Minecraft, blocker/nitpick bar) by an independent reviewer (docs/worker.md: a fresh session if you have no subagent tool)`,
    `record its verdict: ./hb review ${name} --verdict "READY" (or "NOT READY: 3 blockers") --notes "..."`]
  const xb = extra.filter(x => x.exit === 1)
  if (xb.length) lines.push(`BLOCKERS before the reviewer: ${xb.map(x => x.name).join(', ')} (fix them first: each is a review blocker)`)
  out(lines.join('\n'), { round: n, qa_exit: qa.status, pace_exit: pace.exit, pace: pace.text, beat_audit: (ba.stdout || '').trim(), checks: extra, report: path.join(qdir, 'report.txt'), sheets, flags })
  return qa.status === 0 && pace.exit !== 1 && !xb.length ? 0 : 1
}
// pace's aim lines (its note and each [aim] finding) for the review report
function aimLines (text) {
  return String(text || '').split('\n').filter(l => /^note: aim\b|\[aim\s*\]/.test(l)).map(l => '  ' + l.replace(/^note: /, ''))
}
// owner + voice edges + speaker check for hb review: [{ name, exit (0 ok, 1 blockers, 2 could not run / skipped), summary, text }]
function reviewChecks (name, fl) {
  const res = []
  let t = null
  try { t = resolve(name, fl) } catch (e) { if (!(e instanceof HbError)) throw e; res.push({ name: 'owner', exit: 2, summary: `not run: ${e.message}` }) }
  if (t) {
    try {
      const ow = ownerReport(t, fl)
      const nb = ow.findings.filter(f => f.level === 'BLOCK').length, nw = ow.findings.filter(f => f.level === 'WARN').length
      res.push({ name: `owner (./hb owner ${name})`, exit: nb ? 1 : 0, summary: `${nb} blocker(s), ${nw} warning(s)`, text: ownerLines(ow.findings.filter(f => f.level !== 'NOTE')).join('\n') })
    } catch (e) { if (!(e instanceof HbError)) throw e; res.push({ name: 'owner', exit: 2, summary: `could not run: ${e.message.split('\n')[0]}` }) }
  }
  const sd = t && t.stunt.edit && t.stunt.edit.story
  if (!sd || !fs.existsSync(path.join(ROOT, sd, 'voice'))) { res.push({ name: 'voice', exit: 2, summary: 'no story voice in this checkout: skipped' }); return res }
  const ve = sh('python3', ['scripts/voice_edges.py', sd])
  const vt = ((ve.stdout || '') + (ve.stderr || '')).trim().split('\n')
  res.push({ name: `voice edges (scripts/voice_edges.py ${sd})`, exit: ve.status === 0 ? 0 : ve.status === 1 ? 1 : 2, summary: ve.status === 0 ? 'no take cut off' : ve.status === 1 ? 'a take is CUT OFF (docs/STANDARDS.md Voice 5)' : `could not run (exit ${ve.status})`, text: vt.filter(l => /CUT|warn|WARN|could/i.test(l)).slice(0, 12).join('\n') })
  const cs = sh('python3', ['scripts/caption_sync.py', sd])   // owner 2026-11-10: "the captions are not lined up correctly"
  const ct = ((cs.stdout || '') + (cs.stderr || '')).trim().split('\n')
  res.push({ name: `caption sync (scripts/caption_sync.py ${sd})`, exit: cs.status === 0 ? 0 : cs.status === 1 ? 1 : 2, summary: cs.status === 0 ? 'captions start with the speech' : cs.status === 1 ? 'captions out of sync with the voice: run scripts/align.py' : `could not run (exit ${cs.status})`, text: ct.filter(l => /BLOCK|WARN|fix/.test(l)).slice(0, 12).join('\n') })
  // owner 2026-11-10: "Some of them are earlier, some of them are after": every caption word against its forced-
  // aligned word in the finished Short (STANDARDS 2b.3)
  const mp4 = path.join(ROOT, 'out', `${name}.mp4`)
  // no render yet: the same check on the edit's own math (--events: caption timing + coverage, before rendering)
  const pre = !fs.existsSync(mp4)
  if (pre && !t.recPath) res.push({ name: 'caption timing', exit: 2, summary: `no ${rel(mp4)} and no recording: skipped` })
  else {
    const ca = sh('python3', ['scripts/caption_av_check.py', ...(pre ? ['--events', sd] : [mp4, sd]), ...(t.recPath ? ['--rec', t.recPath] : [])])
    const at = ((ca.stdout || '') + (ca.stderr || '')).trim().split('\n')
    const head = at.find(l => /caption words: offset/.test(l)) || ''
    res.push({ name: `caption timing + coverage (scripts/caption_av_check.py ${pre ? '--events' : rel(mp4)} ${sd})`, exit: ca.status === 0 ? 0 : ca.status === 1 ? 1 : 2, summary: ca.status === 0 ? `captions on the word (${head.split(':').slice(1).join(':').split(';').slice(0, 2).join(';').trim()})` : ca.status === 1 && /^BLOCK: caption coverage/m.test(ca.stdout || '') ? `words without captions (${((ca.stdout || '').match(/^BLOCK: caption coverage \((.*)\)$/m) || [])[1] || 'see below'}): ~/.hb-tts/bin/python scripts/align.py ${sd}, then ./hb render ${name} --reuse; a take whose words differ from story.json is a re-take` : ca.status === 1 ? `captions OFF the word: ~/.hb-tts/bin/python scripts/align.py ${sd}, then ./hb render ${name} --reuse` : `could not run (exit ${ca.status}): ${at.slice(-1)[0] || ''}`, text: at.filter(l => /caption words|^video|BLOCK|^ {2}\S+ '|^ {2}(uncaptioned|never shown|take vs captions)|fix/.test(l)).slice(0, 16).join('\n') })
  }
  const py = path.join(os.homedir(), '.hb-tts', 'bin', 'python')
  if (!fs.existsSync(path.join(ROOT, 'scripts', 'speaker_check.py'))) res.push({ name: 'speaker check', exit: 2, summary: 'scripts/speaker_check.py is not in this checkout (agent/speakers): skipped' })
  else if (!fs.existsSync(py)) res.push({ name: 'speaker check', exit: 2, summary: `no TTS venv (${py}): skipped (./hb doctor)` })
  else {
    const sc = sh(py, ['scripts/speaker_check.py', sd])
    const st = ((sc.stdout || '') + (sc.stderr || '')).trim().split('\n')
    res.push({ name: `speaker check (scripts/speaker_check.py ${sd})`, exit: sc.status === 0 ? 0 : sc.status === 1 ? 1 : 2, summary: sc.status === 0 ? 'every line in the right voice' : sc.status === 1 ? 'a line in the WRONG VOICE or with the wrong words (a blocker)' : `could not run (exit ${sc.status})${fixesFor(st.join('\n')).map(f => '; fix: ' + f).join('')}`, text: st.slice(-10).join('\n') })
  }
  return res
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
  const code = run('node', ['scripts/publish.js', name, '--pass', '--notes', String(fl.notes), ...(fl.waive ? ['--waive', String(fl.waive)] : []), ...(fl.no_push ? ['--no-push'] : [])])
  if (code === 0) { out(`published ${name} to the videos branch`, { published: name }); hint(`./hb status ${name}; delete work/${name}.frames and work/preview_${name} (disk)`) }
  return code
}
function cmdLint (fl, pos) {
  const t = resolve(pos[0], fl)
  if (!/process\.env\.LINT/.test(fs.readFileSync(path.join(ROOT, 'render.js'), 'utf8'))) die('this render.js has no LINT mode (the movie engine adds it: docs/movie_engine.md). ./hb check covers the rest')
  return run('node', ['render.js', plainRec(t)], { env: { ...process.env, LINT: '1' } })
}

// ---------------------------------------------------------------- make (lib/hb/make.js: the whole pipeline, resumable)
function cmdMake (fl, pos) {
  const M = require('./make')
  const H = { CMDS, HbError, ROOT, WORK, HBDIR, VIDEOS, mtime, rel, fixesFor, LAST, statusOf, busy, sh, loadStunt,
    lastRun: () => LAST_RUN, say: (s) => { if (!JSON_OUT) console.log(s) } }
  const st = M.make(H, pos[0], fl)
  out(M.report(st, rel, WORK), st)
  if (st.next) hint(st.next)
  return st.status === 'blocked' ? 1 : st.status === 'waiting' ? 3 : 0
}

// ---------------------------------------------------------------- clean (a full disk killed a recording and git, 2026-11-10)
function cmdClean (fl) {
  const P = require('./process')
  const before = freeGB(ROOT)
  const { plan, kept } = P.cleanPlan({ ROOT, sh }, { idleH: fl.idle_h !== undefined ? Number(fl.idle_h) : 12 })
  const mb = (b) => `${(b / 1048576).toFixed(0)} MB`
  const lines = []
  let freed = 0
  for (const x of plan) {
    if (!fl.dry_run) { try { x.rm() } catch (e) { lines.push(`FAILED ${x.kind} ${x.path}: ${e.message}`); continue } }
    freed += x.bytes
    lines.push(`${fl.dry_run ? 'would remove' : 'removed'} ${x.kind.padEnd(12)} ${mb(x.bytes).padStart(8)}  ${x.path}  (${x.why})`)
  }
  if (fl.verbose) for (const k of kept) lines.push(`kept ${k.path} (${k.why})`)
  const after = fl.dry_run ? before : freeGB(ROOT)
  lines.push(`${fl.dry_run ? 'would free' : 'freed'} ${(freed / 1073741824).toFixed(2)} GB in ${plan.length} item(s); ${kept.length} kept (--verbose lists why); free: ${before.toFixed(1)} GB${fl.dry_run ? '' : ` -> ${after.toFixed(1)} GB`}`)
  out(lines.join('\n'), { dry_run: !!fl.dry_run, freed_bytes: freed, items: plan.map(({ rm, ...x }) => x), kept, free_gb: after })
  if (fl.dry_run && plan.length) hint('./hb clean')
  else if (after < 2) hint(`still ${after.toFixed(1)} GB free: delete work/preview_*, work/*.frames and old out/*.mp4 you are done with (du -sh work/* out/*)`)
  return 0
}

// ---------------------------------------------------------------- quota (work/tts/quota.json, logged by tts.py; no request)
function cmdQuota (fl) {
  const file = path.join(WORK, 'tts', 'quota.json')
  const r = require('./process').quotaReport(file)
  const lines = []
  if (r.note) lines.push(r.note)
  else {
    lines.push(`TTS requests from this box on ${r.day} (the quota's day: Pacific; the free tier is about 10 a day per model, shared by every session on the key):`)
    if (!r.models.length) lines.push('  none yet')
    for (const m of r.models) {
      const l = m.last429
      lines.push(`  ${m.model.padEnd(32)} ${String(m.requests).padStart(3)} sent, ${String(m.ok).padStart(3)} ok, ${String(m.r429).padStart(3)} x 429` +
        (l ? `; last 429 ${l.at} (${l.scope}${l.limit ? `, limit ${l.limit}` : ''})${l.retry_at ? `, retry after ${l.retry_at.replace('T', ' ').replace(/:\d\dZ$/, ' UTC')}${m.blocked ? ' (STILL BLOCKED)' : ' (passed)'}` : ''}` : ''))
    }
  }
  out(lines.join('\n'), r)
  const blocked = (r.models || []).filter(m => m.blocked)
  if (blocked.length) hint(`wait: ${blocked.map(m => `${m.model} until ${m.last429.retry_at}`).join(', ')}; a per-minute block clears in about a minute`)
  return 0
}

// ---------------------------------------------------------------- help
const HELP = `hb: the HelloBuh pipeline in one command (docs/agent_guide.md)

  ./hb make <stunt> [--from S] [--to S]   the whole pipeline, resumable: voice -> record -> check -> render -> fetch
                                      -> pace -> review -> publish; skips what is fresh, stops at the first blocker
                                      with its fix, state in work/<stunt>.make.json (--wait, --publish --notes "...")
  ./hb doctor [--story]               is this box ready (packages, assets, server jar, TTS, Gemini, disk: fail under
                                      2 GB free, warn under 5; --story: the TTS venv and the caption aligner must be there)
  ./hb clean [--dry-run] [--verbose]  free disk: merged/pushed clean idle (12 h) agent worktrees, out/ intermediates over
                                      a day old, extra copies of a recording, dead .git/objects/pack/tmp_* (prints freed)
  ./hb quota                          TTS requests per model today (Pacific day) and the last 429's retry time, from
                                      work/tts/quota.json (tts.py logs it; makes no request)
  ./hb status [stunt...]              what is recorded / rendered / reviewed / published, and the next step for each
  ./hb voice <stunt> [--only L03,L07] the story's voices: a v2 cast on Gemini (cut at the words, speaker check,
                                      re-takes; --check only checks, --retakes N, --no-check), a v1 story on Kokoro
  ./hb drift <stunt> [--only L03]     voice drift gate: each character vs its locked reference, its other lines, and
                                      1.5 s windows inside each line; one model per character (docs/voices.md)
  ./hb record <stunt> [--tries N]     server + bot -> work/<stunt>.rec.json, then rec_check (stops on blockers)
  ./hb check <stunt> [--report F]     every check: motion lint (+ own line clocks), hotbar, script drift, rec_check (cast
                                      motion, sight), lint, continuity, framing, owner, cuts, caption sync, on-screen sound
                                      (--strict), pace (when out/<stunt>.mp4 is newer); report in work/hb/<stunt>.check.*
  ./hb cuts <stunt> [--story DIR]     every cut: where the eye is before and after (jump in % of the frame), the cut
                                      against the words (lead on the first word, drift off the line's voice)
  ./hb motion <stunt>                 the motion lint on the source: raw bot.look/lookAt, yaw set directly, /tp of
                                      the cast or the player, raw dig/place/open, -S.gap hacks (runs in record/check)
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
  ./hb render <stunt> [--preview]     queue the full render on GitHub Actions (~10-20 min; refused while ./hb check has
                                      blockers unless --preview: then the Short is labelled CHECK FAILED); --wait / --fetch to get
                                      out/<stunt>.mp4; --local renders here (slow, ~4 GB of frames)
  ./hb review <stunt>                 qa_frames + beat_audit on out/<stunt>.mp4, counts review rounds (cap 2);
                                      --verdict "READY"|"NOT READY: ..." [--notes] records the reviewer's answer
  ./hb publish <stunt> --notes "..."  package to the videos branch (needs a READY review; publish.js --pass; records the
                                      gates; --waive "who: why" ships over a reviewed gate blocker)
  ./hb lint <stunt>                   the movie engine's scene lint (when render.js has it)
  ./hb map <stunt|rec> [T...]         top-down plan of the recorded blocks, north up, in set offsets, with each
                                      shot's camera wedge and the cast (in/out of frame) -> map.png + columns.json
          [--radius 48] [--scale 8] [--max N] [--out DIR]   (no T: the middle of every shot)
  ./hb world [check|list|where X Z|story S|claim ...|map|stunt S]   the shared world (docs/world/canon.md): one
                                      seed, every place at its canonical spot in docs/world/map.json
  ./hb paste <story> [--meta FILE]   the YouTube upload text, paste-ready (title, description, tags, pinned comment,
                                      settings) from the package's metadata; Buh Stories' is built from story.json
                                      "upload" (lib/buhstories_upload.js); exit 1 on a BLOCK
  ./hb rules [--log|--key rXXXXXX]    docs/STANDARDS.md (the current checklist) + whether it covers the newest owner
                                      rule; --log the dated history with keys (--since DATE, --full); --check
  ./hb pace <stunt> [--payoff MARK]   pacing on the finished out/<stunt>.mp4 (after the render): visual + audio hook,
                                      dead spots, build-up over thirds, payoff (hit + picture change, end <= 1 s
                                      after), length; exit 1 on blockers (scripts/pace.py)
  ./hb mixcheck <stunt> [--keep]       pace on the FINAL mix (the NCS bed publish adds), exactly as the publish
                                      gate runs it; ./hb review runs it too (a blocker); scripts/mixcheck.py
  ./hb panel <stunt> [--story DIR] [--fresh]   Gemini watches out/<stunt>.mp4 as 3 viewers (a 12-year-old fan, a
                                      scroller, a strict editor): swipe point, hook in 2 s, cut-off/drifting/mismatched/
                                      annoying/ASMR voices, the ending explained back vs the twist, blurry/dark/zoomed;
                                      2 Gemini calls, cached per mp4; exit 1 when 2+ agree on a blocker (viewer_panel.py)

Times T (all commands): 12.5 = seconds of the finished Short; L03, L03+1.2 = a story line (+ seconds);
cut#3, flash, hmm, story_end-0.5 = any timeline mark (#n = the nth); end; tick:450 / src:22.5 = source time.
Every command: --json for one JSON object on stdout; --rec PATH to use another recording; exit 1 on failure.
<stunt> finds work/<stunt>.rec.json, else the published ../hb-videos/shorts/<stunt>/recording.json.gz.`

// ---------------------------------------------------------------- world (scripts/world.js: the shared world's map)
function cmdWorld (fl, pos) {
  const r = require('child_process').spawnSync('node', [path.join(ROOT, 'scripts', 'world.js'), ...(pos.length ? pos : ['check'])], { stdio: 'inherit' })
  return r.status || 0
}

// ---------------------------------------------------------------- paste (the YouTube upload text, for a manual upload)
// ./hb paste <story>: the paste-ready title / description / tags / pinned comment / settings from the package's
// metadata.json (../hb-videos, else origin/videos). A Buh Stories package's text is rebuilt from its story.json `upload`
// block (lib/buhstories_upload.js), exactly as the uploader will; exit 1 on a BLOCK (HelloBuh hashtags, no credit, ...)
function packageMeta (name) {
  const f = path.join(VIDEOS, 'shorts', name, 'metadata.json')
  if (fs.existsSync(f)) return { meta: JSON.parse(fs.readFileSync(f, 'utf8')), from: rel(f) }
  const g = cp.spawnSync('git', ['show', `origin/videos:shorts/${name}/metadata.json`], { cwd: ROOT, encoding: 'utf8' })
  if (g.status === 0) return { meta: JSON.parse(g.stdout), from: `origin/videos:shorts/${name}/metadata.json` }
  return null
}
function cmdPaste (fl, pos) {
  const BS = require('../buhstories_upload')
  if (!pos.length) die('usage: ./hb paste <story|stunt> [...] [--meta metadata.json]')
  const all = []
  let blocked = 0
  for (const arg of pos) {
    const name = /^story_/.test(arg) || fs.existsSync(path.join(ROOT, 'stunts', `${arg}.js`)) ? arg : `story_${arg.replace(/^stories\//, '').replace(/\/$/, '')}`
    let pk = fl.meta ? { meta: JSON.parse(fs.readFileSync(fl.meta, 'utf8')), from: fl.meta } : packageMeta(name)
    if (!pk) {
      // no package yet: the story alone (no song, so no credit: it BLOCKs until it is published)
      const { story } = BS.storyOf(name)
      if (!story) die(`${name}: no package on the videos branch and no story.json for it`)
      pk = { meta: { name, channel: require('../channel').channelFor(name), caption: (story.upload || {}).hook || ((BS.stuntOf(name).edit || {}).caption) || story.caption, status: 'not packaged' }, from: 'story.json + the stunt (not packaged: the music credit is added when it is published)' }
    }
    const meta = BS.apply(pk.meta)
    const blocks = BS.check(meta)
    blocked += blocks.length ? 1 : 0
    all.push({ name, from: pk.from, youtube: meta.youtube, blocks })
    if (!JSON_OUT) console.log(`${BS.pasteText(meta)}\n(from ${pk.from})${blocks.map(b => `\nBLOCK ${b}`).join('')}\n`)
  }
  out(null, { ok: !blocked, shorts: all })
  return blocked ? 1 : 0
}

for (const k of ['key', 'from', 'to', 'report', 'idle_h']) VALUED.add(k)   // hb rules --key, hb make --from/--to (kept off VALUED's own line: other branches edit it)
VALUED.add('meta')   // hb paste --meta FILE
const CMDS = { clean: cmdClean, quota: cmdQuota, world: cmdWorld, make: cmdMake, doctor: cmdDoctor, status: cmdStatus, voice: cmdVoice, drift: cmdDrift, mixcheck: cmdMixcheck, record: cmdRecord, check: cmdCheck, describe: cmdDescribe, continuity: cmdContinuity, framing: cmdFraming, still: cmdStill, stills: cmdStill, sheet: cmdSheet, preview: cmdPreview, render: cmdRender, review: cmdReview, publish: cmdPublish, lint: cmdLint, owner: cmdOwner, cuts: cmdCuts, motion: cmdMotion, pace: cmdPace, panel: cmdPanel, map: cmdMap, rules: cmdRules, paste: cmdPaste }

function main (argv) {
  const [cmd, ...rest] = argv
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { console.log(HELP); return 0 }
  const f = CMDS[cmd]
  if (!f) { console.error(`hb: unknown command '${cmd}'\n\n${HELP}`); return 2 }
  if (SCENE_ERR && cmd !== 'doctor' && cmd !== 'rules' && cmd !== 'paste') { console.error(`hb ${cmd}: ${SCENE_ERR.message.split('\n')[0]}: node_modules missing or incomplete, run npm ci (./hb doctor checks the rest)`); return 1 }
  const { pos, fl } = parse(rest)
  JSON_OUT = !!fl.json
  try { return f(fl, pos) } catch (e) {
    if (e instanceof HbError) {
      const fixes = fixesFor(e.message)
      if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: e.message, fixes }))
      console.error(`hb ${cmd}: ${e.message}${fixes.map(f => `\nfix: ${f}`).join('')}`)
      // every stop ends with one plain NEXT line (owner, 2026-11-10: the tool tells the session what to do)
      if (!JSON_OUT) console.error(`NEXT: ${fixes[0] ? `${fixes[0]}, then ` : 'fix the above, then '}./hb ${[cmd, ...rest].join(' ')}`)
      return 1
    }
    throw e
  }
}
module.exports = { main, _internal: { pictureKey, reusableRender, renderBranchFiles, fixesFor, statusOf, voiceStampCheck } }
