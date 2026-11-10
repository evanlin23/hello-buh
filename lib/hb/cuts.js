// The cut check (STANDARDS 3b.3, docs/cinematic.md "Invisible cuts"): for every cut in the Short, where the eye is on
// the last frame before it and on the first frame after it (lib/eyetrace.js attention: the shot's subject, else the
// most salient cast member, else the aim), how far it has to jump, and where the cut falls against the words.
// Owner, 2026-11-10: "the cuts don't seem to be correct, because i keep noticing them". Geometry from the recording
// and render.js's own cameras (CAM_PROBE), no rendering.
//
//   eye     the eye's jump across the cut, in % of the frame width: <= 15 fine, > 20 WARN, > 33 BLOCK (a jump of a
//           third of the frame: the viewer has to search the new shot, ~1 s instead of ~0.6 s)
//   timing  the cut against the narration: WARN when the word under it starts more than 3 frames (50 ms) before the
//           picture changes (sound ahead of picture is noticed from ~45 ms, ITU-R BT.1359) or the cut splits a word
const fs = require('fs')
const path = require('path')
const ET = require('../eyetrace')

const FPS = 60
const EYE_WARN = 0.20, EYE_BLOCK = 0.33, EYE_OK = 0.15
const LATE = 0.05          // s: the word may start this much before the cut (3 frames at 60 fps)
const LEAD_IDEAL = [0.033, 0.15]   // s: the cut 2-9 frames before the first word

// where each line's voice starts (s of the recording), as scripts/story_track.py voice_starts lays it
function voiceStarts (tl, vo) {
  const marks = tl.filter(e => e.event === 'line').map(e => ({ t: e.t / 1000, id: e.id || e.vox || e.text }))
  const starts = {}
  const beats = (vo && vo.beats) || {}
  const placed = new Set()
  for (const m of marks) starts[m.id] = m.t
  for (const m of marks) {
    const L = vo && vo.lines && vo.lines[m.id]
    if (!L || L.beat === undefined || !beats[L.beat] || placed.has(L.beat)) continue
    placed.add(L.beat)
    const t0 = m.t - (L.offset || 0)
    for (const id of beats[L.beat].lines || []) if (vo.lines[id] && starts[id] !== undefined) starts[id] = t0 + (vo.lines[id].offset || 0)
  }
  return starts
}
// every spoken word in recording seconds: [{ w, a, b, line }]
function wordsOf (scene, story) {
  if (!story || !story.vo) return []
  let wj = null
  try { wj = JSON.parse(fs.readFileSync(path.join(story.dir, 'voice', 'words.json'), 'utf8')) } catch (e) {}
  const starts = voiceStarts(scene.tl, story.vo)
  const out = []
  for (const [id, s] of Object.entries(starts)) {
    const L = story.vo.lines[id]
    if (!L) continue
    const ws = wj && wj[id]
    if (ws && ws.length) for (const [w, a, b] of ws) out.push({ w, a: s + a, b: s + b, line: id })
    else if (L.chunks) L.chunks.forEach((c, k) => out.push({ w: (L.captions && L.captions[k]) || `chunk ${k}`, a: s + c[0], b: s + c[1], line: id }))
  }
  return out.sort((x, y) => x.a - y.a)
}

// settle: the first frame of a shot. The cast warped with a cut reaches the client up to 6 ticks late and render.js
// (MOTION_FIXES: stunt.motionFixes, or a recording of engine 3+) moves a jump of over a block within 6 ticks after a
// cut or shot change back onto the cut, so it is drawn at its new place from the first frame
function entitiesFor (scene, t, cam, settle = false) {
  const fixes = settle && (scene.stunt.motionFixes ?? ((scene.rec.engine || 0) >= 3))
  const moved = new Map()
  if (fixes) {
    const c = Math.round(t)
    for (let tk = c + 1; tk <= c + 6; tk++) {
      const now = scene.ENT.get(tk), before = scene.ENT.get(tk - 1)
      if (!now || !before) continue
      for (const [id, row] of now) {
        const pr = before.get(id)
        if (!pr || moved.has(id) || /^(item|falling_block|moving_block)$/.test(row[2])) continue
        if (Math.hypot(row[3] - pr[3], row[4] - pr[4], row[5] - pr[5]) > 1) moved.set(id, row)
      }
    }
  }
  const list = scene.entities(t).map(e => {
    const r = moved.get(e.id), use = r ? { x: r[3], y: r[4], z: r[5] } : e
    return { id: e.id, type: e.type, label: e.label, user: e.user, x: use.x, y: use.y, z: use.z, h: e.h, baby: e.baby }
  })
  if (cam.mode && /^shot /.test(cam.mode) && !/\(pov\)/.test(cam.mode)) {
    const p = scene.pose(t), m = (scene.stunt.self && scene.stunt.self.model) || 'player'
    list.push({ id: 'self', type: m, label: 'the narrator', x: p.x, y: p.feetY, z: p.z, h: m === 'player' ? 1.8 : 1 })
  }
  return list
}

// the attention point on the frame at recording tick t
// carry: the camera shot a first-person frame follows (its subject is what the eye is still looking for: render.js)
function attentionAt (scene, t, W, H, settle = false, carry = null) {
  scene.worldAt(Math.floor(t))
  const cam = scene.cameraAt(t)
  if (!cam.known) return null
  const sh = scene.shotAt(t), camShot = !!(sh && !sh.spec.pov && /^shot /.test(cam.mode) && !/\(pov\)/.test(cam.mode))
  const MW = scene.stunt.wideMaster ? Math.max(W, Math.round(H * 16 / 9)) : W
  const g = ET.geom({ W, H, MW, cropX: camShot ? sh.spec.cropX : 0 })
  const a = ET.attention(cam, g, {
    entities: entitiesFor(scene, t, cam, settle),
    subject: camShot ? ET.subjectOf(sh.spec, scene.rec.set) : carry ? ET.subjectOf(carry, scene.rec.set) : null,
    aim: camShot && sh.spec.look && !sh.spec.lookPath ? scene.target(sh.spec.look, t) : null,   // what the shot frames (as render.js)
    occluded: (c, p) => !!scene.occluder(c, p, 0.3)
  })
  return a && { ...a, shot: camShot ? sh.name : 'pov', cam }
}

function cuts (scene) {
  const P = scene.probe
  if (!P) return []
  const out = []
  const ticks = [...P.keys()].sort((a, b) => a - b)
  const kind = (r) => /^shot (\S+)/.test(r.mode) && !/\(pov\)/.test(r.mode) ? r.mode : 'pov'
  for (let i = 1; i < ticks.length; i++) {
    const a = P.get(ticks[i - 1]), b = P.get(ticks[i])
    if (kind(a) !== kind(b) || Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 1.5) out.push({ tick: ticks[i], from: kind(a).replace(/^shot /, ''), to: kind(b).replace(/^shot /, '') })
  }
  return out
}

// -> { rows, findings }. ctx: { story: { st, vo, dir }, outOf(tick) -> s of the Short | null, W, H }
function run (scene, ctx = {}) {
  const W = ctx.W || 1080, H = ctx.H || 1011
  const tl = scene.tl
  const st = tl.find(e => e.event === 'start'), en = tl.find(e => e.event === 'end_scene')
  const t0 = st ? st.t / 50 : 0, t1 = en ? en.t / 50 : Infinity
  const outOf = ctx.outOf || ((t) => (t - t0) / 20)
  const words = wordsOf(scene, ctx.story)
  const vstart = ctx.story && ctx.story.vo ? voiceStarts(tl, ctx.story.vo) : {}
  const lineMarks = tl.filter(e => e.event === 'line').map(e => ({ tick: e.t / 50, id: e.id || e.vox || e.text }))
  const rows = [], findings = []
  const lineAt = (t) => { let id = null; for (const e of tl) { if (e.event === 'line' && e.t / 50 <= t + 0.5) id = e.id || e.vox || e.text } return id }
  const tick = 20 / FPS
  for (const c of cuts(scene)) {
    if (c.tick <= t0 + 1 || c.tick > t1) continue
    const prevSh = scene.shotAt(c.tick - tick), carry = c.to === 'pov' && c.from !== 'pov' && prevSh ? prevSh.spec : null
    const A = attentionAt(scene, c.tick - tick, W, H), B = attentionAt(scene, c.tick, W, H, true, carry)
    if (!A || !B) continue
    const dx = B.x - A.x, dy = (B.y - A.y) * H / W, dist = Math.hypot(dx, dy)
    const tc = c.tick / 20
    let timing = null
    if (words.length) {
      const inside = words.find(w => w.a < tc - 0.01 && w.b > tc + 0.01)
      const next = inside || words.find(w => w.a >= tc - 1e-6)
      const prev = [...words].reverse().find(w => w.b <= tc + 1e-6)
      timing = {
        next: next ? next.w : null, lead: next ? +(next.a - tc).toFixed(3) : null,
        prev: prev ? prev.w : null, sincePrev: prev ? +(tc - prev.b).toFixed(3) : null,
        pause: next && prev ? +(next.a - prev.b).toFixed(3) : null, inside: inside ? inside.w : null
      }
    }
    const shotSpec = scene.shots && scene.shots[c.to]
    const row = { tick: c.tick, out: outOf(c.tick), line: lineAt(c.tick), from: c.from, to: c.to,
      before: { x: +A.x.toFixed(2), y: +A.y.toFixed(2), what: A.label, kind: A.kind }, after: { x: +B.x.toFixed(2), y: +B.y.toFixed(2), what: B.label, kind: B.kind },
      dist: +dist.toFixed(3), timing, optOut: !!(shotSpec && shotSpec.eyeTrace === false) || tl.some(e => e.event === 'shot' && e.eyeTrace === false && Math.abs(e.t / 50 - c.tick) <= 2) }
    // a cut that opens a line: how far it is from where that line's voice starts (a continuous take is laid from the
    // beat's first mark, so a stunt clock that adds its own gap per line drifts later every line: dog_hill)
    const lm = lineMarks.find(m => m.tick >= c.tick - 1 && m.tick <= c.tick + 4)
    if (lm && vstart[lm.id] !== undefined && timing) {
      row.lineDrift = +(tc - vstart[lm.id]).toFixed(3)
      const d = row.lineDrift
      if (Math.abs(d) > 0.1) findings.push({ level: Math.abs(d) > 0.25 ? 'BLOCK' : 'WARN', check: 'cuts', out: row.out, tick: c.tick, line: lm.id, msg: `${c.from} -> ${c.to} opens ${lm.id} ${Math.round(Math.abs(d) * 1000)} ms ${d > 0 ? 'after' : 'before'} its voice starts (the picture is ${d > 0 ? 'behind' : 'ahead of'} the words): time the stunt with K.line (lib/story.js: marks on the take's own offsets, the line before a cut ended early by the cut's landing time); a stunt clock of its own (dur + a gap per line) drifts later every line` })
    }
    rows.push(row)
    const where = `${c.from} -> ${c.to}: the eye goes from ${A.label} (${pct(A.x)} across, ${pct(A.y)} down) to ${B.label} (${pct(B.x)}, ${pct(B.y)})`
    if (dist > EYE_WARN) {
      const level = dist > EYE_BLOCK && !row.optOut ? 'BLOCK' : 'WARN'
      findings.push({ level, check: 'cuts', out: row.out, tick: c.tick, line: row.line, msg: `${where}: a jump of ${pct(dist)} of the frame (fine <= ${pct(EYE_OK)}). Put the new shot's subject where the last one was: the renderer's eyeTrace does it for camera shots (name the shot's subject: subject: ['actor:NAME'] / ['entity:wolf'] / [dx, dy, dz]; eyeTrace: false only for a deliberate jump; a first-person cut: aim K.cut where the last shot's subject was). Owner: "i keep noticing them"` })
    }
    if (timing && timing.lead !== null && timing.lead < -LATE && timing.lead > -1) {
      findings.push({ level: 'WARN', check: 'cuts', out: row.out, tick: c.tick, line: row.line, msg: `${c.from} -> ${c.to}: the cut comes ${Math.round(-timing.lead * 1000)} ms after "${timing.next}" starts${timing.inside ? ' (it splits the word)' : ''}: the sound runs ahead of the picture. Cut ${Math.round(LEAD_IDEAL[0] * 1000)}-${Math.round(LEAD_IDEAL[1] * 1000)} ms before the word; a cut inside a line: start it on at.cut(i), not at(i) (lib/story.js cutTick)` })
    }
  }
  return { rows, findings }
}
const pct = (v) => `${Math.round(v * 100)}%`

function table (rows) {
  const L = ['  out s  line  from -> to              eye before (x,y) -> after (x,y)              jump   next word (lead ms)  pause ms']
  for (const r of rows) {
    const tm = r.timing
    const t = tm ? `${String(tm.next || '-').slice(0, 12).padEnd(12)} ${String(tm.lead === null ? '-' : Math.round(tm.lead * 1000)).padStart(5)}${tm.inside ? '*' : ' '}  ${String(tm.pause === null ? '-' : Math.round(tm.pause * 1000)).padStart(6)}` : ''
    L.push(`${r.out.toFixed(2).padStart(7)}  ${String(r.line || '').padEnd(4)}  ${`${r.from} -> ${r.to}`.slice(0, 22).padEnd(22)}  ${`${r.before.what}`.slice(0, 14).padEnd(14)} ${r.before.x.toFixed(2)},${r.before.y.toFixed(2)} -> ${`${r.after.what}`.slice(0, 14).padEnd(14)} ${r.after.x.toFixed(2)},${r.after.y.toFixed(2)}  ${pct(r.dist).padStart(4)}   ${t}${r.lineDrift !== undefined ? `  line ${r.lineDrift > 0 ? '+' : ''}${Math.round(r.lineDrift * 1000)} ms` : ''}`)
  }
  const d = rows.map(r => r.dist).sort((a, b) => a - b)
  if (d.length) L.push(`${rows.length} cuts: eye jump median ${pct(d[Math.floor((d.length - 1) / 2)])}, max ${pct(d[d.length - 1])}, ${d.filter(x => x > EYE_WARN).length} over ${pct(EYE_WARN)}; ${rows.filter(r => r.timing && r.timing.lead !== null && r.timing.lead < -LATE && r.timing.lead > -1).length} cut(s) after their word`)
  return L
}

module.exports = { run, table, cuts, wordsOf, voiceStarts, EYE_WARN, EYE_BLOCK }
