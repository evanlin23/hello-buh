// Process guards for hb (2026-11-10, "fix everything for the process"): the script-drift check (a writer's fixed script
// in stories/<name>/script*.md that story.json never got), the disk cleaner behind `hb clean`, the TTS quota report
// behind `hb quota`, and the check report's one-line summary (what the render workflow burns into a preview).
const fs = require('fs')
const path = require('path')

// ---------------------------------------------------------------- script drift
const normLine = (s) => String(s || '').replace(/\*\*/g, '').replace(/\s\/\s/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim().toLowerCase()

// the LAST markdown table in `md` with an id column (L01...) and a "line" column -> { L01: text } or null
function lastTable (md) {
  const blocks = []
  let cur = null
  for (const ln of md.split('\n')) {
    if (/^\s*\|/.test(ln)) { if (!cur) blocks.push(cur = []); cur.push(ln) } else cur = null
  }
  const cells = (ln) => ln.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
  for (let b = blocks.length - 1; b >= 0; b--) {
    const rows = blocks[b]
    if (rows.length < 3) continue
    const head = cells(rows[0]).map(h => h.toLowerCase())
    const col = head.findIndex(h => /^(line|text|say)\b/.test(h))
    if (col < 0) continue
    const out = {}
    for (const r of rows.slice(1)) {
      const c = cells(r)
      if (/^[-: ]+$/.test(c.join(''))) continue
      if (/^L\d+\w*$/.test(c[0] || '')) out[c[0]] = c[col] || ''
    }
    if (Object.keys(out).length) return out
  }
  return null
}

// stories/<dir>: every script*.md newer than story.json (by `timeOf`, git-aware) whose last table's lines differ from
// story.json's -> [{ script, msg, ids }]. timeOf(p) -> ms (a committed file: its commit time; mtimes lie in a checkout)
function scriptDrift (dir, timeOf) {
  if (!dir || !fs.existsSync(dir)) return []
  const sj = path.join(dir, 'story.json')
  const out = []
  const scripts = fs.readdirSync(dir).filter(f => /^script.*\.md$/i.test(f)).map(f => path.join(dir, f))
  if (!scripts.length) return out
  if (!fs.existsSync(sj)) return scripts.map(s => ({ script: s, ids: [], msg: `${path.basename(s)} has no story.json beside it: the writers' deliverable is story.json (the markdown is notes only)` }))
  let st
  try { st = JSON.parse(fs.readFileSync(sj, 'utf8')) } catch (e) { return [{ script: sj, ids: [], msg: `story.json does not parse: ${e.message}` }] }
  const lines = {}
  for (const l of st.lines || []) lines[l.id] = l
  const tj = timeOf(sj)
  for (const s of scripts) {
    if (timeOf(s) <= tj) continue
    const tab = lastTable(fs.readFileSync(s, 'utf8'))
    if (!tab) continue
    const ids = []
    for (const [id, text] of Object.entries(tab)) {
      const l = lines[id]
      if (!l || (normLine(text) !== normLine(l.text) && normLine(text) !== normLine(l.say))) ids.push(id)
    }
    for (const id of Object.keys(lines)) if (!(id in tab)) ids.push(id)
    if (ids.length) out.push({ script: s, ids, msg: `${path.basename(s)} is newer than story.json and ${ids.length} line(s) differ (${ids.slice(0, 8).join(' ')}${ids.length > 8 ? ' ...' : ''}): voicing would voice the OLD script. Put the fixed lines in story.json (the deliverable) and commit it; if story.json is already right, commit it after the script (or --force to voice it as it is)` })
  }
  return out
}

// ---------------------------------------------------------------- hb clean
const duBytes = (p) => {
  let n = 0
  const walk = (q) => {
    let st; try { st = fs.lstatSync(q) } catch (e) { return }
    if (st.isSymbolicLink()) return
    if (st.isDirectory()) { let es = []; try { es = fs.readdirSync(q) } catch (e) {} for (const e of es) walk(path.join(q, e)) } else n += st.size
  }
  walk(p)
  return n
}
const newest = (p) => {
  let t = 0
  const walk = (q, depth) => {
    let st; try { st = fs.lstatSync(q) } catch (e) { return }
    t = Math.max(t, st.mtimeMs)
    if (st.isDirectory() && !st.isSymbolicLink() && depth < 6) { let es = []; try { es = fs.readdirSync(q) } catch (e) {} for (const e of es) walk(path.join(q, e), depth + 1) }
  }
  walk(p, 0)
  return t
}
// files any process has open (a pack git is still writing)
function openFiles () {
  const s = new Set()
  let pids = []; try { pids = fs.readdirSync('/proc').filter(x => /^\d+$/.test(x)) } catch (e) { return s }
  for (const pid of pids) {
    let fds = []; try { fds = fs.readdirSync(`/proc/${pid}/fd`) } catch (e) { continue }
    for (const fd of fds) { try { s.add(fs.readlinkSync(`/proc/${pid}/fd/${fd}`)) } catch (e) {} }
  }
  return s
}
const cwds = () => {
  const s = []
  let pids = []; try { pids = fs.readdirSync('/proc').filter(x => /^\d+$/.test(x)) } catch (e) { return s }
  for (const pid of pids) { try { s.push(fs.readlinkSync(`/proc/${pid}/cwd`)) } catch (e) {} }
  return s
}

// -> [{ kind, path, bytes, why, rm: () => void }] and [{ path, why }] kept. H: { ROOT, sh, now }
// Never: the current checkout, a worktree with changes, unpushed commits, a live process in it, or touched in IDLE_H.
function cleanPlan (H, o = {}) {
  const { ROOT, sh } = H
  const now = H.now || Date.now()
  const IDLE_H = o.idleH ?? 12
  const plan = [], kept = []
  const common = path.resolve(ROOT, sh('git', ['rev-parse', '--git-common-dir']).stdout.trim() || '.git')
  const main = path.dirname(common)
  // 1. agent worktrees under <main>/.claude/worktrees: merged into origin/main or pushed, clean, idle
  const wtRoot = path.join(main, '.claude', 'worktrees')
  const list = sh('git', ['worktree', 'list', '--porcelain']).stdout || ''
  const live = cwds()
  for (const blk of list.split('\n\n')) {
    const wt = (/^worktree (.*)$/m.exec(blk) || [])[1]
    if (!wt || !wt.startsWith(wtRoot + path.sep)) continue
    if (path.resolve(wt) === path.resolve(ROOT)) { kept.push({ path: wt, why: 'this checkout' }); continue }
    if (/^locked/m.test(blk)) { kept.push({ path: wt, why: 'locked' }); continue }
    if (!fs.existsSync(wt)) { plan.push({ kind: 'worktree', path: wt, bytes: 0, why: 'missing on disk (prune)', rm: () => sh('git', ['worktree', 'prune']) }); continue }
    if (live.some(c => c === wt || c.startsWith(wt + path.sep))) { kept.push({ path: wt, why: 'a process is running in it' }); continue }
    const dirty = sh('git', ['-C', wt, 'status', '--porcelain']).stdout.trim()
    if (dirty) { kept.push({ path: wt, why: `uncommitted changes (${dirty.split('\n').length} file(s))` }); continue }
    const gitdir = sh('git', ['-C', wt, 'rev-parse', '--absolute-git-dir']).stdout.trim()
    const touched = Math.max(newest(path.join(gitdir, 'index')), newest(path.join(gitdir, 'HEAD')), newest(path.join(gitdir, 'logs')), fs.statSync(wt).mtimeMs)
    if (now - touched < IDLE_H * 3600e3) { kept.push({ path: wt, why: `used ${((now - touched) / 3600e3).toFixed(1)} h ago (< ${IDLE_H} h: maybe a live session)` }); continue }
    const merged = sh('git', ['-C', wt, 'merge-base', '--is-ancestor', 'HEAD', 'origin/main']).status === 0
    const pushed = merged || !!sh('git', ['-C', wt, 'branch', '-r', '--contains', 'HEAD']).stdout.trim()
    if (!pushed) { kept.push({ path: wt, why: 'commits on no remote branch' }); continue }
    plan.push({ kind: 'worktree', path: wt, bytes: duBytes(wt), why: merged ? 'merged into origin/main, clean' : 'pushed, clean', rm: () => sh('git', ['worktree', 'remove', wt]) })
  }
  // 2. out/ intermediates older than a day (here and in the main checkout): everything but the fetched Shorts
  // (out/<name>.mp4 and their .render.json / .check.*)
  for (const dir of [...new Set([path.join(ROOT, 'out'), path.join(main, 'out')])]) {
    let es = []; try { es = fs.readdirSync(dir) } catch (e) { continue }
    for (const e of es) {
      const p = path.join(dir, e)
      if (/\.(mp4|render\.json|check\.json|check\.txt)$/.test(e) && fs.statSync(p).isFile()) continue
      const age = now - newest(p)
      if (age < 86400e3) continue
      plan.push({ kind: 'out', path: p, bytes: duBytes(p), why: `untouched ${(age / 86400e3).toFixed(1)} d`, rm: () => fs.rmSync(p, { recursive: true, force: true }) })
    }
  }
  // 3. recordings: per stunt keep work/<stunt>.rec.json (the canonical one), else the newest copy; work/hb/ caches
  // (<stunt>.<hash>.rec.json, remade on demand) and older variants go
  const work = fs.existsSync(path.join(ROOT, 'work')) ? fs.realpathSync(path.join(ROOT, 'work')) : null
  if (work) {
    const recs = []
    for (const d of [work, path.join(work, 'hb')]) {
      let es = []; try { es = fs.readdirSync(d) } catch (e) { continue }
      for (const e of es) if (/\.rec\.json(\.gz)?$/.test(e)) { const p = path.join(d, e); recs.push({ p, stunt: e.split('.')[0], canon: d === work && /^[^.]+\.rec\.json$/.test(e), t: fs.statSync(p).mtimeMs }) }
    }
    const by = {}
    for (const r of recs) (by[r.stunt] = by[r.stunt] || []).push(r)
    for (const [stunt, rs] of Object.entries(by)) {
      if (rs.length < 2) continue
      const keep = rs.find(r => r.canon) || rs.sort((a, b) => b.t - a.t)[0]
      for (const r of rs) if (r !== keep) plan.push({ kind: 'recording', path: r.p, bytes: fs.statSync(r.p).size, why: `an older copy of ${stunt} (kept ${path.relative(work, keep.p)})`, rm: () => fs.rmSync(r.p, { force: true }) })
    }
  }
  // 4. .git/objects/pack/tmp_*: a fetch that died (disk full) leaves its half pack; never one git still has open
  const packs = path.join(common, 'objects', 'pack')
  const open = openFiles()
  let es = []; try { es = fs.readdirSync(packs) } catch (e) {}
  for (const e of es.filter(x => /^tmp_/.test(x))) {
    const p = path.join(packs, e)
    if (open.has(p)) { kept.push({ path: p, why: 'git is still writing it' }); continue }
    if (now - fs.statSync(p).mtimeMs < 120e3) { kept.push({ path: p, why: 'written in the last 2 min' }); continue }
    plan.push({ kind: 'git tmp pack', path: p, bytes: fs.statSync(p).size, why: 'a dead fetch\'s half pack', rm: () => fs.rmSync(p, { force: true }) })
  }
  return { plan, kept }
}

// ---------------------------------------------------------------- hb quota (work/tts/quota.json, written by tts.py)
function quotaReport (file, now = new Date()) {
  let j = null
  try { j = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { return { ok: true, models: [], note: `no ${file} yet (tts.py writes it on its first request)` } }
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const today = (j.days || {})[day] || {}
  const names = [...new Set([...Object.keys(today), ...Object.keys(j.last_429 || {})])].sort()
  const models = names.map(m => {
    const c = today[m] || {}, l = (j.last_429 || {})[m] || null
    const blocked = l && l.retry_at && Date.parse(l.retry_at) > now.getTime()
    return { model: m, requests: c.requests || 0, ok: c.ok || 0, r429: c['429'] || 0, last429: l, blocked: !!blocked }
  })
  return { ok: true, day, models }
}

// ---------------------------------------------------------------- the check report
// blockers = steps that exited 1 (each counted by its BLOCK findings when it has them), broken = steps that did not run
function checkCounts (res) {
  let blockers = 0
  const failed = []
  for (const s of res.steps || []) {
    if (s.exit === 1) {
      const n = (s.findings || []).filter(f => f.level === 'BLOCK' || f.level === 'PROBLEM').length || (s.hits || []).length || (s.blocks ?? 1) || 1
      blockers += n; failed.push(`${s.name} (${n})`)
    }
  }
  const broken = (res.steps || []).filter(s => s.exit > 1).map(s => s.name)
  return { blockers, failed, broken }
}

module.exports = { lastTable, scriptDrift, normLine, cleanPlan, quotaReport, checkCounts, duBytes }
