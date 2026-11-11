// hb make: one resumable pipeline over the existing commands (docs/agent_guide.md "hb make"):
//   voice -> record -> check -> render -> fetch -> pace -> review -> publish
// Each stage is skipped when its output is already fresh (a voice that matches the script, a recording newer than the
// stunt and the voice, a check passed on this recording, an mp4 newer than the recording...), runs the hb command
// otherwise, and the run stops at the first blocker with its fix. Everything lands in work/<name>.make.json (stage,
// timestamps, artifacts, the last blockers), so a later session or a fresh container picks up where this one stopped;
// `./hb status` shows it. Nothing here re-implements a step: it calls the same cmdX functions `./hb <x>` runs.
const fs = require('fs')
const path = require('path')

const STAGES = ['voice', 'record', 'check', 'render', 'fetch', 'pace', 'review', 'publish']
const statePath = (WORK, name) => path.join(WORK, `${name}.make.json`)
function loadState (WORK, name) {
  try { return JSON.parse(fs.readFileSync(statePath(WORK, name), 'utf8')) } catch (e) { return null }
}
function saveState (WORK, st) {
  st.updated = new Date().toISOString()
  fs.mkdirSync(WORK, { recursive: true })
  fs.writeFileSync(statePath(WORK, st.name), JSON.stringify(st, null, 1) + '\n')
}
function stageRange (fl) {
  const pick = (k, d) => {
    if (!fl[k]) return d
    const i = STAGES.indexOf(String(fl[k]))
    if (i < 0) throw new Error(`--${k} ${fl[k]}: one of ${STAGES.join(', ')}`)
    return i
  }
  const a = pick('from', 0), b = pick('to', STAGES.length - 1)
  if (b < a) throw new Error(`--to ${fl.to} comes before --from ${fl.from}`)
  return [a, b]
}
// one line for hb status
function summary (st, ago) {
  if (!st) return null
  const cur = st.stages && st.stages[st.stage]
  const b = (st.blockers || [])[0]
  return `make: ${st.stage} ${st.status}${st.updated ? ` (${ago(Date.parse(st.updated))})` : ''}${b ? `: ${b.msg.split('\n')[0].slice(0, 140)}` : cur && cur.note ? `: ${cur.note.slice(0, 140)}` : ''}`
}

// H: the cli's internals (commands and helpers), passed in so nothing is duplicated
function make (H, name, fl) {
  const { CMDS, HbError, ROOT, WORK, HBDIR, VIDEOS, mtime, rel, say, fixesFor, lastRun, LAST } = H
  if (!name) throw new HbError('which stunt? ./hb make story_<name> [--from stage] [--to stage]')
  let range
  try { range = stageRange(fl) } catch (e) { throw new HbError(e.message) }
  const sf = path.join(ROOT, 'stunts', `${name}.js`)
  if (!fs.existsSync(sf)) throw new HbError(`no stunts/${name}.js: write it first (docs/agent_guide.md "Making a story")`)
  // a story already published or uploaded is done: re-making it (a re-record, a new render) only on purpose
  const done0 = H.statusOf(name, {}).next
  if (/^done/.test(done0) && !fl.from) {
    say(`${name}: ${done0}. Nothing to make; --from <stage> re-runs from there on purpose (e.g. --from pace to re-check the package)`)
    return { name, status: 'done', stage: 'publish', stages: {}, blockers: [], next: null, note: done0 }
  }
  const st = loadState(WORK, name) || { name, created: new Date().toISOString(), stages: {} }
  st.stages = st.stages || {}
  st.status = 'running'; st.blockers = []; st.next = null
  st.run = { at: new Date().toISOString(), from: STAGES[range[0]], to: STAGES[range[1]] }
  saveState(WORK, st)

  const rp = path.join(WORK, `${name}.rec.json`)
  const mp4 = path.join(ROOT, 'out', `${name}.mp4`)
  const pkg = path.join(VIDEOS, 'shorts', name)
  const stuntMod = () => { const l = H.loadStunt(name); if (l.error) throw new HbError(l.error); return l.mod }
  const storyDir = () => { const m = stuntMod(); return m && m.edit && m.edit.story ? m.edit.story : null }
  const voiceJson = () => { const d = storyDir(); return d ? path.join(ROOT, d, 'voice', 'voice.json') : null }
  // a call to an hb command: its exit code, or an HbError turned into a blocker with its fixes
  const call = (cmd, f, pos) => {
    try { return { code: CMDS[cmd](f, pos) } } catch (e) {
      if (!(e instanceof HbError)) throw e
      say(`hb ${cmd}: ${e.message}`)
      return { code: 1, error: e.message, fixes: fixesFor(e.message) }
    }
  }
  const blockersFrom = (r, msg, fix) => {
    const lr = lastRun()
    const fixes = [...(r.fixes || []), ...(lr && lr.code ? lr.fixes : []), ...(fix ? [fix] : [])].map(f => f.replace(/<stunt>/g, name))
    const why = lr && lr.code ? (lr.tail || []).filter(l => /FAIL|BLOCK|rror|failed|refused/.test(l)).slice(-3) : []
    return [{ msg: (r.error || msg) + (why.length ? `: ${why.join(' / ')}` : ''), fix: fixes.length ? [...new Set(fixes)].join(' | ') : null, log: lr && lr.code ? rel(lr.log || '') : undefined }]
  }

  let stop = null
  for (let i = range[0]; i <= range[1] && !stop; i++) {
    const stage = STAGES[i]
    const forced = fl.from === stage
    const S = st.stages[stage] = { ...(st.stages[stage] || {}), started: new Date().toISOString() }
    delete S.blockers
    st.stage = stage
    saveState(WORK, st)
    say(`\n=== make ${name}: ${stage}${forced ? ' (--from: run even if fresh)' : ''}`)
    const t0 = Date.now()
    // each stage returns { status: done | skipped | blocked | waiting, note, artifacts, blockers, next }
    const r = (() => {
      switch (stage) {
        case 'voice': {
          const sd = storyDir()
          if (!sd) return { status: 'skipped', note: 'not a story (no edit.story): no voice' }
          const s = H.statusOf(name, {})
          const stale = !s.voice || s.voice.voice === 'missing' || s.voice.stale
          if (stale || forced) {
            const c = call('voice', {}, [name])
            // 75 = tts.py's quota stop (EX_TEMPFAIL): not a blocker, a wait (its NEXT line has the UTC retry time)
            if (c.code === 75) return { status: 'waiting', blockers: [{ msg: 'Gemini TTS quota: retry later (the NEXT line above has the UTC time; ./hb quota)', fix: `./hb make ${name} after that time (takes so far are cached)` }], next: `./hb make ${name} after the retry time above` }
            if (c.code) return { status: 'blocked', blockers: blockersFrom(c, `./hb voice ${name} failed (exit ${c.code})`) }
          }
          // the takes' edges (cheap, every time): a cut-off word is a blocker (docs/STANDARDS.md Voice 5)
          const ve = H.sh('python3', ['scripts/voice_edges.py', sd])
          if (ve.status === 1) {
            const cut = (ve.stdout || '').split('\n').filter(l => /CUT/.test(l))
            return { status: 'blocked', blockers: cut.map(l => ({ msg: `voice edge: ${l.trim()}`, fix: fixesFor(l)[0] })) }
          }
          return { status: stale || forced ? 'done' : 'skipped', note: stale || forced ? 'voiced; edges clean' : 'voice matches the script; edges clean', artifacts: [rel(voiceJson())] }
        }
        case 'record': {
          const vj = voiceJson()
          const fresh = fs.existsSync(rp) && mtime(rp) > mtime(sf) && (!vj || mtime(rp) > mtime(vj))
          if (fresh && !forced) return { status: 'skipped', note: `${rel(rp)} is newer than the stunt and the voice`, artifacts: [rel(rp)] }
          if (!fs.existsSync(rp) && fs.existsSync(path.join(pkg, 'recording.json.gz')) && !forced) {
            const src = path.join(pkg, 'source', `${name}.js`)
            if (fs.existsSync(src) && fs.readFileSync(src, 'utf8') === fs.readFileSync(sf, 'utf8')) return { status: 'skipped', note: 'the published package\'s recording (the stunt is unchanged since)', artifacts: [rel(path.join(pkg, 'recording.json.gz'))] }
          }
          const b = H.busy()
          if (b.server) return { status: 'waiting', blockers: [{ msg: `the Minecraft server is in use: ${b.procs.filter(p => p.kind !== 'render').map(p => `${p.kind} pid ${p.pid} in ${p.cwd}`).join('; ')}`, fix: fixesFor('the Minecraft server is in use')[0] }], next: `./hb make ${name} when ./hb status shows the server free` }
          const c = call('record', { tries: fl.tries }, [name])
          if (c.code) return { status: 'blocked', blockers: blockersFrom(c, `./hb record ${name} failed (exit ${c.code})`, 'fix the stunt and ./hb make ' + name) }
          return { status: 'done', note: 'recorded; rec_check clean', artifacts: [rel(rp)] }
        }
        case 'check': {
          const recM = fs.existsSync(rp) ? mtime(rp) : mtime(path.join(pkg, 'recording.json.gz'))
          if (!recM) return { status: 'blocked', blockers: [{ msg: `no recording for ${name}`, fix: `./hb make ${name} --from record` }] }
          if (!forced && S.status === 'done' && S.rec_mtime === recM && S.stunt_mtime === mtime(sf)) return { status: 'skipped', note: 'passed on this recording already', rec_mtime: recM, stunt_mtime: mtime(sf) }
          const c = call('check', {}, [name])
          const res = LAST.check
          if (c.code) {
            const bl = []
            if (res) for (const s of res.steps.filter(s => s.exit)) {
              const fs_ = (s.findings || []).filter(f => f.level === 'BLOCK' || f.level === 'PROBLEM')
              if (fs_.length) for (const f of fs_.slice(0, 8)) bl.push({ msg: `${s.name}: ${f.out !== undefined && f.out !== null ? f.out.toFixed(2) + ' s ' : ''}${f.line ? f.line + ' ' : ''}${f.msg}`, fix: f.fix || `./hb describe ${name} ${f.out !== undefined && f.out !== null ? f.out.toFixed(2) : ''}; fix the stunt, ./hb make ${name} (re-records)` })
              else if (s.lines && s.lines.some(l => /^\s*!/.test(l))) for (const l of s.lines.filter(l => /^\s*!/.test(l)).slice(0, 6)) bl.push({ msg: `${s.name}: ${l.replace(/^\s*!\s*/, '')}`, fix: `the movie engine's lint (./hb lint ${name}): fix the shot or the staging, then ./hb make ${name}` })
              else bl.push({ msg: `${s.name}: ${s.summary}`, fix: s.name === 'rec_check' ? 'read the rec_check report above; fix the stunt and re-record' : null })
            } else bl.push(...blockersFrom(c, `./hb check ${name} failed`))
            return { status: 'blocked', blockers: bl, rec_mtime: recM }
          }
          return { status: 'done', note: res ? res.steps.map(s => `${s.name}: ${s.summary}`).join('; ') : 'ok', rec_mtime: recM, stunt_mtime: mtime(sf) }
        }
        case 'render': {
          // fresh = newer than the recording, the stunt (its edit) and the story (captions, payoff, mood)
          const sd = storyDir(), sj = sd ? path.join(ROOT, sd, 'story.json') : null
          if (fs.existsSync(mp4) && mtime(mp4) > Math.max(mtime(rp), mtime(sf), sj ? mtime(sj) : 0) && !forced) return { status: 'skipped', note: `${rel(mp4)} is newer than the recording, the stunt and the story`, artifacts: [rel(mp4)] }
          if (!fs.existsSync(rp)) {
            if (fs.existsSync(path.join(pkg, 'short.mp4'))) return { status: 'skipped', note: 'no work recording: the published package\'s short.mp4 stands in (re-record to change it)', artifacts: [rel(path.join(pkg, 'short.mp4'))] }
            return { status: 'blocked', blockers: [{ msg: `no ${rel(rp)}`, fix: `./hb make ${name} --from record` }] }
          }
          const prev = st.stages.render || {}
          if (!forced && prev.branch && (prev.status === 'done' || prev.status === 'skipped') && prev.rec_mtime === mtime(rp)) return { status: 'skipped', note: `already queued on ${prev.branch} for this recording`, branch: prev.branch, queued: prev.queued, rec_mtime: prev.rec_mtime }
          const c = call('render', { reuse: fl.no_reuse ? undefined : true, no_reuse: fl.no_reuse }, [name])
          if (c.code) return { status: 'blocked', blockers: blockersFrom(c, `./hb render ${name} failed (exit ${c.code})`) }
          let branch = null, queued = null
          try { branch = fs.readFileSync(path.join(WORK, `${name}.render_branch`), 'utf8').trim() } catch (e) {}
          try { queued = fs.readFileSync(path.join(WORK, `${name}.render_queued`), 'utf8').trim() } catch (e) {}
          return { status: 'done', note: `queued on ${branch} (~10-20 min; ~6-8 when only the edit changed)`, branch, queued, rec_mtime: mtime(rp), queued_at: new Date().toISOString() }
        }
        case 'fetch': {
          if (fs.existsSync(mp4) && (!fs.existsSync(rp) || mtime(mp4) > mtime(rp)) && !forced && !(st.stages.render && st.stages.render.status === 'done' && Date.parse(st.stages.render.queued_at || 0) > mtime(mp4))) return { status: 'skipped', note: `${rel(mp4)} is fresh`, artifacts: [rel(mp4)] }
          if (!fs.existsSync(rp) && fs.existsSync(path.join(pkg, 'short.mp4'))) return { status: 'skipped', note: 'the published package\'s short.mp4', artifacts: [rel(path.join(pkg, 'short.mp4'))] }
          const c = call('render', fl.wait ? { wait: true } : { fetch: true }, [name])
          if (c.code === 3) return { status: 'waiting', note: 'still rendering on Actions', next: `./hb make ${name} again in a few minutes (it resumes here), or ./hb make ${name} --wait in the background` }
          if (c.code) return { status: 'blocked', blockers: blockersFrom(c, `fetching the render failed (exit ${c.code})`) }
          return { status: 'done', artifacts: [rel(mp4)] }
        }
        case 'pace': {
          const video = fs.existsSync(mp4) ? mp4 : path.join(pkg, 'short.mp4')
          if (!fs.existsSync(video)) return { status: 'blocked', blockers: [{ msg: 'no video to pace', fix: `./hb make ${name} --from render` }] }
          if (!forced && S.status === 'done' && S.video_mtime === mtime(video)) return { status: 'skipped', note: 'passed on this video already', video_mtime: S.video_mtime }
          const c = call('pace', {}, [name])
          const text = (LAST.pace && LAST.pace.text) || ''
          if (c.code) {
            const bl = text.split('\n').filter(l => /^\s*BLOCK/.test(l)).map(l => l.trim())
            const fixFor = (l) => { const m = /(?:fix|->|=>):?\s*(.*)$/.exec(l); return m ? m[1] : 'edit-only fixes (endAfter, cuts, sfx) need a re-render with the same recording: ./hb make ' + name + ' --from render (reuses the frames)' }
            return { status: 'blocked', blockers: bl.length ? bl.map(l => ({ msg: l, fix: fixFor(l) })) : blockersFrom(c, `./hb pace ${name} failed (exit ${c.code})`), video_mtime: mtime(video) }
          }
          return { status: 'done', note: `${(text.match(/^\s*WARN/mg) || []).length} warning(s)`, video_mtime: mtime(video) }
        }
        case 'review': {
          if (!fs.existsSync(mp4)) return { status: 'skipped', note: 'no out/ render (a published package): review it from the package by hand if needed' }
          const rv = path.join(HBDIR, `${name}.review.json`)
          const log = fs.existsSync(rv) ? JSON.parse(fs.readFileSync(rv, 'utf8')) : { rounds: [] }
          const last = log.rounds[log.rounds.length - 1]
          const vm = new Date(mtime(mp4)).toISOString()
          if (!forced && last && last.video_mtime === vm) {
            if (/^ready/i.test(last.verdict || '')) return { status: 'done', note: `round ${log.rounds.length}: ${last.verdict}` }
            if (last.verdict) return { status: 'blocked', blockers: [{ msg: `review round ${log.rounds.length}: ${last.verdict}${last.notes ? ' - ' + last.notes : ''}`, fix: log.rounds.length >= 2 ? 'the 2-round cap: fix only these blockers and ship, or ask the lead' : `fix the blockers, then ./hb make ${name} (re-records/re-renders what changed)` }] }
            return { status: 'waiting', note: `round ${log.rounds.length} prepared, no verdict yet`, next: `an independent reviewer runs .claude/skills/short-review/SKILL.md on ${rel(mp4)}, then ./hb review ${name} --verdict "READY" (or "NOT READY: ...") --notes "..."; then ./hb make ${name}` }
          }
          const c = call('review', {}, [name])
          if (c.code) return { status: 'blocked', blockers: blockersFrom(c, `./hb review ${name}: blockers before the reviewer (qa_frames, pace, owner or voice: above)`) }
          return { status: 'waiting', note: 'review round prepared', next: `an independent reviewer runs .claude/skills/short-review/SKILL.md, then ./hb review ${name} --verdict "READY" --notes "..."; then ./hb make ${name}` }
        }
        case 'publish': {
          const md = path.join(pkg, 'metadata.json')
          if (fs.existsSync(md) && (!fs.existsSync(mp4) || mtime(md) > mtime(mp4)) && !forced) return { status: 'done', note: 'published (the uploader takes it from the queue)' }
          if (!fl.publish) return { status: 'waiting', note: 'the gate passed: READY on the current render', next: `./hb publish ${name} --notes "one line: what, rounds, nitpicks" (or ./hb make ${name} --publish --notes "...")` }
          if (!fl.notes) return { status: 'blocked', blockers: [{ msg: '--publish needs --notes', fix: `./hb make ${name} --publish --notes "one line: what it is, review rounds, known nitpicks"` }] }
          const c = call('publish', { notes: fl.notes, ...(fl.waive ? { waive: fl.waive } : {}) }, [name])
          if (c.code) return { status: 'blocked', blockers: blockersFrom(c, `./hb publish ${name} failed (exit ${c.code})`) }
          return { status: 'done', note: 'published to the videos branch', next: `mark the premise made in docs/stories.md; delete work/${name}.frames, work/preview_${name}` }
        }
      }
    })()
    Object.assign(S, r, { finished: new Date().toISOString(), secs: Math.round((Date.now() - t0) / 1000) })
    if (!r.blockers) delete S.blockers
    if (r.status === 'blocked' || r.status === 'waiting') {
      stop = r
      st.blockers = r.blockers || []
      st.next = r.next || (r.blockers && r.blockers[0] && r.blockers[0].fix) || null
    }
    saveState(WORK, st)
  }
  st.status = stop ? stop.status : (range[1] === STAGES.length - 1 ? 'done' : `done to ${STAGES[range[1]]}`)
  if (!stop) st.next = range[1] < STAGES.length - 1 ? `./hb make ${name} --from ${STAGES[range[1] + 1]}` : null
  saveState(WORK, st)
  return st
}

function report (st, rel, WORK) {
  const lines = [`\n== make ${st.name}: ${st.status.toUpperCase()} at ${st.stage}`]
  for (const k of STAGES) {
    const s = st.stages[k]
    if (!s) continue
    lines.push(`  ${k.padEnd(8)} ${String(s.status).padEnd(8)} ${s.secs !== undefined ? String(s.secs + ' s').padStart(6) : ''}  ${s.note || ''}${s.artifacts && s.artifacts.length ? ` [${s.artifacts.join(', ')}]` : ''}`)
  }
  for (const b of st.blockers || []) lines.push(`BLOCKER: ${b.msg}${b.fix ? `\n   fix: ${b.fix}` : ''}${b.log ? `\n   log: ${b.log}` : ''}`)
  lines.push(`state: ${rel(statePath(WORK, st.name))}`)
  return lines.join('\n')
}

module.exports = { STAGES, make, report, loadState, summary, statePath }
