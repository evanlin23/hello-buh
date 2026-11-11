// The stunt lint (`./hb check`, step 'lint'): two owner notes of 2026-11-11 as checks on the stunt's edit and its
// recording, for every stunt.
//
//   banned sound (r:r4df33c, "The sound effect at the end of boat clutch sounds like a fart, change it out"): no sound
//     from lib/hb/banned_sfx.json in the Short: every sound audio.py plays from the recording (run with a capturing mixer;
//     a published package: the audio.py of its code.commit), the edit.sfx kinds and files. An entry's `unless` keeps vanilla's own use
//     (a splash with water at the player, a bucket pour with a bucket in the hotbar).
//   timer resets (r:r32b983, "the timer should reset every single time like we start a new ender portal"): where the
//     stunt has several attempts (edit.attempts names the mark that starts one; else a repeated ring / attempt / try /
//     round mark), every on-screen timer (edit.timer, edit.clock, edit.splits) times ONE attempt: a timer starts at each
//     attempt and none runs across two. A timer added outside the edit (a package's own overlay script) can't be
//     checked: it blocks until it is built with edit.splits / edit.clock.
//
// run({ stunt, rec, recPath, pkgDir, audioRef }) -> [{ level, check, msg, t }] (t: source seconds)
const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const ROOT = path.join(__dirname, '..', '..')
const BANNED = JSON.parse(fs.readFileSync(path.join(__dirname, 'banned_sfx.json'), 'utf8')).banned
const ATTEMPT_MARKS = ['ring', 'attempt', 'try', 'round']
// the files behind scripts/sfx.py's kinds (its LIB: the Mixkit / Kenney sounds a kind plays)
const SFX_KIND_FILES = {
  whoosh: ['sfx/mixkit/transition/fast_whoosh_transition_1490.mp3'],
  pop: ['sfx/mixkit/cartoon/hard_pop_click_2364.mp3', 'sfx/kenney/interface-sounds/drop_002.ogg'],
  ding: ['sfx/kenney/interface-sounds/confirmation_001.ogg'],
  impact: ['sfx/kenney/impact-sounds/impactPunch_heavy_000.ogg'],
  boom: ['sfx/kenney/impact-sounds/impactPunch_heavy_000.ogg']
}

// ---------------------------------------------------------------- the sounds
// what the game mix plays: audio.py itself run on the recording with its mixer capturing every play() (logged sounds,
// the old-recording rebuild, the damage sounds and a story's on-screen fills). ref: a git commit whose audio.py to use
// (a published package's code.commit: the sounds as that Short was made); null: this checkout's
const CAPTURE = `
import gzip, json, os, subprocess, sys, tempfile, types
root, recp, ref = sys.argv[1], sys.argv[2], sys.argv[3]
got = subprocess.run(["git", "-C", root, "show", ref + ":audio.py"], capture_output=True, text=True) if ref else None
src = got.stdout if got is not None and got.returncode == 0 else open(os.path.join(root, "audio.py")).read()   # (a commit not here: this checkout's)
sys.path.insert(0, root)
mod = types.ModuleType("audio_capture"); mod.__file__ = os.path.join(root, "audio.py")
exec(compile(src, "audio.py", "exec"), mod.__dict__)
played = []
def play(self, event, t, volume=1.0, pitch=1.0):
    played.append({"t": t, "sound": event})
mod.Mixer.play = play
mod.finish = lambda *a, **k: None
plain = recp
if recp.endswith(".gz"):
    fd, plain = tempfile.mkstemp(suffix=".rec.json"); os.close(fd)
    with gzip.open(recp, "rb") as f, open(plain, "wb") as g: g.write(f.read())
try:
    import contextlib, io
    with contextlib.redirect_stdout(io.StringIO()):
        mod.main(plain, os.devnull)
finally:
    if plain != recp: os.unlink(plain)
print(json.dumps(played))
`
function soundsOf (rec, recPath, ref = null) {
  if (!recPath) return ((rec && rec.timeline) || []).filter(e => e.event === 'sound').map(e => ({ t: e.t / 1000, sound: e.sound }))
  const r = cp.spawnSync('python3', ['-c', CAPTURE, ROOT, recPath, ref || ''], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 300000 })
  if (r.status !== 0) throw new Error(`audio.py capture failed: ${(r.stderr || '').trim().split('\n').pop()}`)
  return JSON.parse(r.stdout.trim().split('\n').pop())
}

// the world at a tick, for the 'water' exception: the recording's chunks plus its block changes up to that tick
function worldReader (rec) {
  let Chunk, md, Vec3
  try {
    Chunk = require('prismarine-chunk')(rec.version)
    md = require('minecraft-data')(rec.version)
    Vec3 = require('vec3').Vec3
  } catch (e) { return null }
  const cols = new Map()
  for (const c of rec.columns || []) cols.set(`${c.x},${c.z}`, c)
  const loaded = new Map()
  const col = (x, z) => {
    const k = `${Math.floor(x / 16) * 16},${Math.floor(z / 16) * 16}`
    if (!loaded.has(k)) loaded.set(k, cols.has(k) ? Chunk.fromJson(cols.get(k).chunk) : null)
    return loaded.get(k)
  }
  const changes = (rec.blocks || []).slice().sort((a, b) => a[0] - b[0])
  return (tick, x, y, z) => {
    let state = null
    for (const b of changes) { if (b[0] > tick) break; if (b[1] === x && b[2] === y && b[3] === z) state = b[4] }
    if (state === null) { const c = col(x, z); if (!c) return null; state = c.getBlockStateId(new Vec3(x & 15, y, z & 15)) }
    const bl = md.blocksByStateId[state]
    return bl ? bl.name : null
  }
}
function poseAt (rec, tick) { const P = rec.poses || []; return P[Math.min(P.length - 1, Math.max(0, Math.round(tick)))] }
function waterNear (rec, world, t) {
  if (!world) return true   // can't tell (no prismarine-chunk): don't block
  for (let tick = Math.round(t * 20); tick <= Math.round(t * 20) + 20; tick += 2) {
    const p = poseAt(rec, tick)
    if (!p) continue
    const fx = Math.floor(p[1]), fy = Math.floor(p[2]), fz = Math.floor(p[3])
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      if (/^(water|bubble_column)$/.test(world(tick, fx + dx, fy + dy, fz + dz) || '')) return true
    }
  }
  return false
}
// a liquid placed within a second of t (a block change to water or lava anywhere: a pond filling, a cast)
function liquidPlaced (rec, t) {
  let md
  try { md = require('minecraft-data')(rec.version) } catch (e) { return true }
  return (rec.blocks || []).some(b => Math.abs(b[0] / 20 - t) <= 1.0 && /^(water|lava)$/.test((md.blocksByStateId[b[4]] || {}).name || ''))
}
function bucketNear (rec, t) {
  return (rec.timeline || []).some(e => e.event === 'hotbar' && Math.abs(e.t / 1000 - t) <= 1.0 &&
    (e.items || []).some(it => it && /bucket/.test(Array.isArray(it) ? it[0] : String(it))))
}

function bannedSounds ({ stunt, rec, recPath, audioRef }) {
  const F = []
  const edit = (stunt && stunt.edit) || {}
  const bySound = new Map(), byFile = new Map()
  for (const b of BANNED) { for (const s of b.sounds || []) bySound.set(s, b); for (const f of b.files || []) byFile.set(f.replace(/^.*?sfx\//, 'sfx/'), b) }
  const UNLESS = { water: 'there is water at the player', bucket: 'a bucket is in the hotbar', liquid: 'water or lava is placed within a second' }
  const say = (b, what, t) => F.push({ level: 'BLOCK', check: 'banned sound', t, msg: `${what} is banned (lib/hb/banned_sfx.json ${b.id}${b.unless ? `, unless ${[].concat(b.unless).map(u => UNLESS[u] || u).join(' or ')}` : ''}): ${b.why}. Owner ${b.rule}, ${b.date}: "${b.owner}". Play a clean impact, splash or the right vanilla sound instead` })
  // the recording's sounds
  if (rec) {
    let world
    const seen = new Set()
    for (const s of soundsOf(rec, recPath, audioRef)) {
      if (seen.has(`${s.sound}@${s.t}`)) continue   // (a variant pointing at another event plays twice in the capture)
      seen.add(`${s.sound}@${s.t}`)
      const b = bySound.get(s.sound)
      if (!b) continue
      const un = [].concat(b.unless || [])
      if (un.includes('water')) { if (world === undefined) world = worldReader(rec); if (waterNear(rec, world, s.t)) continue }
      if (un.includes('bucket') && bucketNear(rec, s.t)) continue
      if (un.includes('liquid') && liquidPlaced(rec, s.t)) continue
      say(b, `${s.sound} at ${s.t.toFixed(2)} s of the recording (audio.py${audioRef ? ` at ${String(audioRef).slice(0, 8)}` : ''})`, s.t)
    }
  }
  // the edit's sound effects (scripts/sfx.py): a 'file' entry or a kind's library file
  for (const e of edit.sfx || []) {
    const files = e[0] === 'file' ? [String(e[2] || '')] : (SFX_KIND_FILES[e[0]] || [])
    for (const f of files) {
      const b = byFile.get(f.replace(/^.*?sfx\//, 'sfx/')) || byFile.get(f)
      if (b) say(b, `edit.sfx ${JSON.stringify(e.slice(0, 2))} plays ${f}`, null)
    }
  }
  return F
}

// ---------------------------------------------------------------- the timers
// every on-screen timer the edit draws, in source seconds: [{ a, b, what }] (b: where it stops; Infinity: it never does)
function timersOf (edit, tl) {
  const at = (name) => tl.filter(e => e.event === name).map(e => e.t / 1000).sort((x, y) => x - y)
  const out = []
  if (edit.timer) {
    const [A, B] = String(edit.timer).split(':')
    const a = at(A)[0]
    if (a !== undefined) out.push({ a, b: at(B).find(x => x > a) ?? Infinity, what: `edit.timer '${edit.timer}'` })
  }
  const used = {}
  for (const c of edit.clock || []) {
    const k = used[c[0]] || 0; used[c[0]] = k + 1
    const a = at(c[0])[k]
    if (a !== undefined) out.push({ a, b: at(c[1]).find(x => x > a + 1e-6) ?? Infinity, what: `edit.clock [${c[0]} -> ${c[1]}]` })
  }
  if (edit.splits) {
    const sp = edit.splits, resets = at(sp.reset), splits = sp.split ? at(sp.split) : []
    resets.forEach((a, i) => { const nx = resets[i + 1] ?? Infinity; out.push({ a, b: splits.find(x => x > a && x <= nx) ?? nx, what: `edit.splits (${sp.reset} #${i + 1})` }) })
    if (sp.endless && at(sp.endless).length) out.push({ a: at(sp.endless)[0], b: Infinity, what: `edit.splits (${sp.endless}: endless)` })
  }
  return out.sort((x, y) => x.a - y.a)
}
// a timer drawn outside the edit: a published package's own overlay (its source/ has a *timer* script, or its rebuild
// steps overlay one after edit.py)
function overlayTimers (pkgDir) {
  if (!pkgDir || !fs.existsSync(pkgDir)) return []
  const out = []
  const src = path.join(pkgDir, 'source')
  if (fs.existsSync(src)) for (const f of fs.readdirSync(src)) if (/timer|clock|stopwatch/i.test(f) && !/\.js$/.test(f)) out.push(`source/${f}`)
  try {
    const m = JSON.parse(fs.readFileSync(path.join(pkgDir, 'metadata.json'), 'utf8'))
    for (const r of m.rebuild || []) if (/timer|stopwatch/i.test(r) && !/edit\.py/.test(r)) out.push(`metadata.json rebuild: ${r.slice(0, 80)}...`)
  } catch (e) {}
  return [...new Set(out)]
}
function timerResets ({ stunt, rec, pkgDir }) {
  const F = []
  const edit = (stunt && stunt.edit) || {}
  const tl = (rec && rec.timeline) || []
  const name = edit.attempts || ATTEMPT_MARKS.find(m => tl.filter(e => e.event === m).length >= 2)
  const attempts = name ? tl.filter(e => e.event === name).map(e => e.t / 1000).sort((x, y) => x - y) : []
  const overlays = overlayTimers(pkgDir)
  for (const o of overlays) {
    F.push({ level: 'BLOCK', check: 'timer resets', t: null, msg: `an on-screen timer added outside the edit (${o}): nothing checks it resets at each attempt${attempts.length >= 2 ? ` (${attempts.length} '${name}' attempts here)` : ''}. Owner r:r32b983: "the timer should reset every single time like we start a new ender portal". Build it in the edit: edit.splits { reset, split, of, endless } (edit.py split_timer) or edit.clock, and drop the overlay` })
  }
  if (attempts.length < 2) return F
  const timers = timersOf(edit, tl)
  if (!timers.length) return F
  for (const tm of timers) {
    const inside = attempts.filter(x => x > tm.a + 0.25 && x < tm.b)
    if (inside.length) F.push({ level: 'BLOCK', check: 'timer resets', t: inside[0], msg: `${tm.what} runs from ${tm.a.toFixed(2)} s across ${inside.length} new '${name}' attempt(s) (first at ${inside[0].toFixed(2)} s of the recording) without resetting. Owner r:r32b983: "the timer should reset every single time like we start a new ender portal": one timer per attempt (edit.splits { reset: '${name}', ... })` })
  }
  const t0 = timers[0].a
  for (const x of attempts) {
    if (x < t0 - 0.25) continue
    if (!timers.some(tm => Math.abs(tm.a - x) <= 0.5)) F.push({ level: 'BLOCK', check: 'timer resets', t: x, msg: `the '${name}' attempt at ${x.toFixed(2)} s of the recording starts with no timer reset to 0 (r:r32b983): start a timer on every attempt (edit.splits { reset: '${name}', ... })` })
  }
  // (one finding per attempt is enough: drop duplicates of the same time)
  return F.filter((f, i) => F.findIndex(g => g.msg === f.msg) === i)
}

function run (o) {
  return [...bannedSounds(o), ...timerResets(o)]
}
function lines (F) {
  return F.map(f => `${f.level} ${f.check}${f.t !== null && f.t !== undefined ? ` @${f.t.toFixed(2)}s src` : ''}: ${f.msg}`)
}

module.exports = { run, lines, bannedSounds, timerResets, timersOf, overlayTimers, soundsOf, BANNED, ATTEMPT_MARKS }
