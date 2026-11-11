// Scene lint (docs/movie_engine.md, "Shots an agent can trust"): every check a reviewer made on reels 1-2 that
// geometry can answer, in seconds and without rendering. Run it after recording and before the first render:
//
//   LINT=1 node render.js work/<scene>.rec.json          (scripts/scene.sh runs it for you)
//
// It replays the recording through the render's own camera director (shotCam, auto-framing, the POV camera) and
// the same block changes, so what it checks is what renders. Per shot: the camera inside a block; each subject
// (the shot's look / follow target, its auto-framed people, or `subject: [...]`) hidden behind blocks or another
// actor, out of frame, under the letterbox, or too small; the 180-degree line (stunt.coverage = { line: [A, B],
// side }); cuts that land on the same framing; shots too short to read or static too long. Over the whole edit:
// stretches where nobody moves (the owner: "the scenes would start with everyone motionless ... there should be
// no pause"); story beats too small to see (ctx.mark('beat', { at: [x, y, z], size: 1, what: 'the Well' })); a
// line of dialogue running across a cut. Prints PROBLEM (fix before rendering) and NOTE lines with scene times
// (seconds from the edit's start, before any slow motion); exit code 1 if there are problems.

const FRAMING = require('./framing')

function basis (yaw, pitch) {
  const cp = Math.cos(pitch)
  const f = [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]
  const r = [Math.cos(yaw), 0, -Math.sin(yaw)]
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
  return { f, r, u }
}
// a point in the camera: { x, y } in [-1, 1] across the 16:9 frame, z = depth (blocks), or null behind the camera
function project (cam, p, vfov) {
  const { f, r, u } = basis(cam.yaw, cam.pitch)
  const d = [p.x - cam.x, p.y - cam.y, p.z - cam.z]
  const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]
  if (z <= 0.05) return null
  const tv = Math.tan(vfov / 2), th = tv * 16 / 9
  return { x: (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / z / th, y: (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z / tv, z }
}
const fmt = (t) => t.toFixed(1)
// The renderer's near plane (renderer/page.js: PerspectiveCamera(fov, W / H, 0.05, ...)). shotCam pushes the camera's
// CENTRE out of blocks, so "camera inside a block" (the centre) almost never fires; but a camera left a few
// centimetres off a block face still clips it: the near plane's corners reach into the block and its culled faces
// show the inside (owner, 2026-11-11, Good Boy at 0.6 s: "the camera is inside of the block, so we can see inside
// of it"; a follow camera dipping toward the road). True when any corner of the near plane (or its centre) is in a
// solid block. aspect: the widest the frame gets (16:9 covers the square and portrait renders too).
const NEAR = 0.05
function nearPlaneClips (cam, solidAt, aspect = 16 / 9) {
  const { f, r, u } = basis(cam.yaw, cam.pitch)
  const tv = Math.tan(((cam.fov || 70) * Math.PI / 180) / 2), hv = NEAR * tv, hh = hv * aspect
  for (const [a, b] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = cam.x + f[0] * NEAR + r[0] * hh * a + u[0] * hv * b
    const y = cam.y + f[1] * NEAR + r[1] * hh * a + u[1] * hv * b
    const z = cam.z + f[2] * NEAR + r[2] * hh * a + u[2] * hv * b
    if (solidAt(x, y, z)) return true
  }
  return false
}

function run (h) {
  const { rec, stunt, marks, shots, shotCam, camAt, targetAt, actorsAt, lines, mesher, Vec3 } = h
  const solidAt = (x, y, z) => { const b = mesher.world.getBlock(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z))); return !!(b && b.boundingBox === 'block') }
  const tl = rec.timeline || []
  const markT = (ev) => { const e = tl.find(x => x.event === ev); return e ? e.t / 50 : null }
  const parseAt = (s) => { if (!s) return null; const [ev, off] = String(s).split(':'); const t = markT(ev); return t === null ? null : t + Number(off || 0) * 20 }
  const ed = stunt.edit || {}
  const start = parseAt(ed.startAt) ?? markT('start') ?? 0
  const lastPose = rec.poses && rec.poses.length ? rec.poses[rec.poses.length - 1][0] : 0
  const end = parseAt(ed.endAfter) ?? lastPose
  const T = (t) => (t - start) / 20   // scene seconds
  const bars = stunt.look && stunt.look.letterbox ? (16 / 9) / stunt.look.letterbox : 1
  const problems = [], notes = []
  const P = (t0, t1, msg) => problems.push(`${fmt(T(t0))}${t1 !== null && t1 - t0 > 2 ? '-' + fmt(T(t1)) : ''} s  ${msg}`)
  const N = (t0, msg) => notes.push(`${fmt(T(t0))} s  ${msg}`)

  // the shot list over the edit window (before the first mark: the player's own eyes)
  const list = []
  const ms = marks.filter(m => m.t < end)
  if (!ms.length || ms[0].t > start) list.push({ name: '(pov)', t0: start, spec: { pov: true } })
  for (let k = 0; k < ms.length; k++) list.push({ name: ms[k].name, t0: Math.max(start, ms[k].t), spec: shots[ms[k].name] || { pov: true } })
  for (let k = 0; k < list.length; k++) list[k].t1 = k + 1 < list.length ? list[k + 1].t0 : end
  const shotsIn = list.filter(s => s.t1 > start && s.t1 > s.t0)

  // block changes applied in time order, as the render does
  const blocks = (rec.blocks || []).slice().sort((a, b) => a[0] - b[0]); let bi = 0
  const applyTo = (t) => { while (bi < blocks.length && blocks[bi][0] <= t) { const [, x, y, z, st] = blocks[bi++]; mesher.setBlock(x, y, z, st) } }

  const subjectsOf = (sp, auto) => {
    if (sp.subject) return [].concat(sp.subject)
    if (sp.two) return sp.two
    if (sp.ots) return [sp.ots]
    if (sp.single) return [sp.single]
    const out = []
    if (typeof sp.look === 'string') out.push(sp.look)
    else if (sp.look && sp.look.of && typeof sp.look.of === 'string') out.push(sp.look.of)
    if (typeof sp.follow === 'string' && !out.includes(sp.follow)) out.push(sp.follow)
    return out
  }
  const report = []
  const camAtShot = (s, t) => s.spec.pov ? { ...camAt(t), fov: 70 } : shotCam({ ...s.spec, name: s.name, t0: s.t0 }, t, solidAt)
  const cov = stunt.coverage || null
  for (const s of shotsIn) {
    const sp = s.spec, dur = (s.t1 - s.t0) / 20
    const subs = sp.pov ? [] : subjectsOf(sp)
    const row = { name: s.name, t0: s.t0, t1: s.t1, kind: sp.pov ? 'pov' : sp.two ? 'two' : sp.ots ? 'ots' : sp.single ? 'single' : sp.path ? 'path' : sp.follow ? 'follow' : sp.orbit ? 'orbit' : 'at', subs, vis: {}, size: {}, issues: [] }
    const runs = {}   // issue -> [first, last] tick
    const hit = (key, t) => { if (!runs[key]) runs[key] = [t, t]; else runs[key][1] = t }
    let prevCam = null, still = 0
    for (let t = s.t0; t < s.t1; t += 2) {
      applyTo(t)
      const cam = camAtShot(s, t)
      if (!cam) { hit('no camera (a target is missing)', t); continue }
      const vf = (cam.fov || 70) * Math.PI / 180
      if (!sp.pov && solidAt(cam.x, cam.y, cam.z)) hit('camera inside a block', t)
      else if (!sp.pov && nearPlaneClips(cam, solidAt)) hit('camera inside a block (grazing a face: the near plane clips into it and shows the inside)', t)
      if (prevCam) { const mv = Math.hypot(cam.x - prevCam.x, cam.y - prevCam.y, cam.z - prevCam.z) + Math.abs(cam.yaw - prevCam.yaw) + Math.abs(cam.pitch - prevCam.pitch); if (mv < 0.002) still++ }
      prevCam = cam
      const others = actorsAt(t)
      for (const name of subs) {
        const e = targetAt(name, t)
        if (!e) { hit(`${name}: not in the recording`, t); continue }
        const pr = project(cam, e, vf)
        const chest = { x: e.x, y: e.y - 0.7, z: e.z }
        const blockedEye = !FRAMING.clear(cam, e, solidAt), blockedChest = !FRAMING.clear(cam, chest, solidAt)
        const occ = others.filter(o => o.name !== name && Math.hypot(o.eye.x - cam.x, o.eye.y - cam.y, o.eye.z - cam.z) > 0.3)
        let by = null
        for (const o of occ) { if (FRAMING.segDist(cam, e, o.eye) < 0.3) { by = o.name; break } }
        row.vis[name] = row.vis[name] || [0, 0]; row.vis[name][1]++
        if (!pr) { hit(`${name}: behind the camera`, t); continue }
        const inX = Math.abs(pr.x) <= 1, inY = Math.abs(pr.y) <= 1
        if (!inX || !inY) hit(`${name}: out of frame`, t)
        else if (Math.abs(pr.y) > bars) hit(`${name}: eyes under the letterbox`, t)
        if (blockedEye && blockedChest) hit(`${name}: hidden behind blocks`, t)
        else if (blockedEye) hit(`${name}: face behind a block`, t)
        if (by && !(sp.ots && by === `${sp.over}`)) hit(`${name}: face covered by ${by}`, t)
        if (!blockedEye && !by && inX && inY) row.vis[name][0]++
        const frac = (1.8 / pr.z) / (2 * Math.tan(vf / 2)) / bars   // a person's height over the visible frame
        row.size[name] = row.size[name] || []; row.size[name].push(frac)
      }
    }
    const nS = Math.ceil((s.t1 - s.t0) / 2)
    for (const [k, [a, b]] of Object.entries(runs)) {
      const frac = ((b - a) / 2 + 1) / nS
      // (a subject hidden for a moment in a walk is a note; most of the shot, or a camera in a block, is a problem)
      if (/inside a block|no camera|not in the recording/.test(k) || frac > 0.25) row.issues.push(['P', a, b, k]); else row.issues.push(['N', a, b, k])
    }
    for (const [name, fs] of Object.entries(row.size)) {
      const med = fs.slice().sort((x, y) => x - y)[Math.floor(fs.length / 2)]
      row.size[name] = med
      if (med < 0.08 && !['path', 'orbit'].includes(row.kind) && sp.size !== 'wide') row.issues.push(['N', s.t0, null, `${name}: small (${Math.round(med * 100)}% of the frame's height); fine for a wide, not for a single`])
    }
    if (!sp.pov && dur < 0.8) row.issues.push(['N', s.t0, null, `only ${dur.toFixed(1)} s: too short to read`])
    if (!sp.pov && still * 2 / 20 > 5) row.issues.push(['N', s.t0, null, `the camera holds still for ${(still * 2 / 20).toFixed(1)} s: add push, drift or a move`])
    // the 180-degree line
    // (only shots of the conversation itself: a shot overlapping a line of dialogue)
    const talking = lines.some(l => l.t1 > s.t0 && l.t0 < s.t1)
    if (cov && cov.line && talking && !sp.pov && !sp.crossLine && subs.some(n => cov.line.includes(n))) {
      const tm = (s.t0 + s.t1) / 2, A = targetAt(cov.line[0], tm), B = targetAt(cov.line[1], tm), c = camAtShot(s, tm)
      if (A && B && c) {
        const { p } = FRAMING.perpTo(A, B, cov.side || 'south')
        const sideOf = (c.x - A.x) * p[0] + (c.z - A.z) * p[1]
        if (sideOf < -0.3) row.issues.push(['P', s.t0, null, `crosses the line (${cov.line.join(' / ')}): the camera is on the ${cov.side || 'south'} side's opposite; move it or set crossLine: true`])
      }
    }
    report.push(row)
  }
  // cuts that land on the same framing
  for (let k = 1; k < report.length; k++) {
    const a = list.find(s => s.name === report[k - 1].name && s.t0 === report[k - 1].t0), b = list.find(s => s.name === report[k].name && s.t0 === report[k].t0)
    if (!a || !b || a.spec.pov || b.spec.pov) continue
    const ca = camAtShot(a, b.t0 - 1), cb = camAtShot(b, b.t0)
    if (!ca || !cb) continue
    const fa = basis(ca.yaw, ca.pitch).f, fb = basis(cb.yaw, cb.pitch).f
    const ang = Math.acos(Math.max(-1, Math.min(1, fa[0] * fb[0] + fa[1] * fb[1] + fa[2] * fb[2]))) * 180 / Math.PI
    const mv = Math.hypot(ca.x - cb.x, ca.y - cb.y, ca.z - cb.z)
    if (mv < 1.2 && ang < 15 && Math.abs((ca.fov || 70) - (cb.fov || 70)) < 10) problems.push(`${fmt(T(b.t0))} s  cut ${report[k - 1].name} -> ${report[k].name} lands on the same framing (${mv.toFixed(1)} blocks, ${Math.round(ang)} degrees): a jump cut`)
  }
  // nobody moving: every 0.2 s, how far anyone moved or turned their head over the next 1.2 s (the recording alone,
  // so idle life and talking heads don't count: they're the render's polish, not acting)
  const POSE = new Map(); for (const p of rec.poses || []) POSE.set(p[0], p)
  // players and mannequins anywhere; mobs too when within 24 blocks of the player (a story's cast are NoAI mobs moved
  // by /tp: Mom, villagers in doorways, the warden), items and projectiles never
  const MOB_SKIP = /^(item|arrow|experience_orb|falling_block|tnt|marker|area_effect_cloud|firework_rocket|snowball|egg|ender_pearl)$/
  const ent = new Map(); for (const r of rec.entities || []) { if (MOB_SKIP.test(r[2])) continue; if (!ent.has(r[1])) ent.set(r[1], new Map()); ent.get(r[1]).set(r[0], r) }
  const isMob = new Map(); for (const r of rec.entities || []) isMob.set(r[1], r[2] !== 'player' && r[2] !== 'mannequin')
  const nearest = (m, t) => { for (let d = 0; d < 6; d++) { if (m.has(t - d)) return m.get(t - d); if (m.has(t + d)) return m.get(t + d) } return null }
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  let deadFrom = null, lastMe = null
  const lineAt = (t) => lines.some(l => t >= l.t0 && t < l.t1)
  const dead = []
  let CUTS = []   // (set below: edit.speed cuts; a still ends where the edit cuts away)
  const flushDead = (t) => { if (deadFrom !== null) { for (const [a] of CUTS) if (a > deadFrom && a < t) t = a; const l = dead[dead.length - 1]; if (l && deadFrom <= l[1]) l[1] = Math.max(l[1], t); else dead.push([deadFrom, t]) } deadFrom = null }
  // (summed over 4-tick steps inside the window, not end to end: a nod that dips and comes back is motion)
  const poseMove = (t0) => { let m = 0; for (let k = 0; k < 24; k += 4) { const a = nearest(POSE, Math.round(t0 + k)), b = nearest(POSE, Math.round(t0 + k + 4)); if (a && b) m += Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) + Math.abs(wrap(b[4] - a[4])) * 1.5 + Math.abs(b[5] - a[5]) } return m }
  const entMove = (m, t0) => { let s = 0; for (let k = 0; k < 24; k += 4) { const ra = nearest(m, Math.round(t0 + k)), rb = nearest(m, Math.round(t0 + k + 4)); if (ra && rb) s += Math.hypot(rb[3] - ra[3], rb[4] - ra[4], rb[5] - ra[5]) + Math.max(Math.abs(wrap((rb[8] ?? rb[6]) - (ra[8] ?? ra[6]))), Math.abs(wrap(rb[6] - ra[6]))) * 1.5 + Math.abs((rb[7] || 0) - (ra[7] || 0)) } return s }
  const swingsAt = new Set(tl.filter(e => e.event === 'ent_swing' || e.event === 'swing').map(e => Math.round(e.t / 50)))
  // a container window is up (the harness's container..container_close, the kit's gui_freeze..gui_thaw): the view holds
  // still by rule (docs/engine_features.md "Motion by construction": vanilla's mouse drives the cursor) and the screen
  // itself is the action (the items, the hand on them), so that stretch is not "nobody moves". The same for the
  // vanilla death screen (death -> respawn): its text is the payoff a stunt ends on, and a dead player can't move
  const GUI = []
  for (const [o, c] of [['container', 'container_close'], ['gui_freeze', 'gui_thaw'], ['death', 'respawn']]) {
    let a = null
    for (const e of tl) {
      if (e.event === o && a === null) a = e.t / 50
      else if (e.event === c && a !== null) { GUI.push([a, e.t / 50]); a = null }
    }
    if (a !== null) GUI.push([a, Infinity])
  }
  // the death screen too: the view is dead still by rule and the screen ("You died!") is the payoff (guess_sound_3)
  for (const e of tl) if (e.event === 'death') { const r = tl.find(x => x.event === 'respawn' && x.t > e.t); GUI.push([e.t / 50, r ? r.t / 50 : Infinity]) }
  // a stunt's hard cuts (edit.speed [A, B, 'cut']) are not on screen: the off-camera wait inside one isn't "nobody moves"
  for (const s of ed.speed || []) {
    if (!Array.isArray(s) || s[2] !== 'cut') continue
    const a = parseAt(s[0]), b = parseAt(s[1])
    if (a !== null && b !== null && b > a) GUI.push([a + 1, b - 1])
  }
  const inGui = (t) => GUI.some(([a, b]) => t >= a - 1 && t <= b + 1)
  // footage the edit drops (edit.speed [A, B, "cut"]) is never seen: a still there isn't on screen, and the cut itself
  // is a new picture (hide_seek's seeker waits out the hiding time inside its cuts)
  CUTS = (ed.speed || []).filter(s => s[2] === 'cut').map(s => [parseAt(s[0]), parseAt(s[1])]).filter(([a, b]) => a !== null && b !== null && b > a)
  const inCut = (t) => CUTS.some(([a, b]) => t >= a && t < b)
  for (let t = Math.ceil(start); t < end - 24; t += 4) {
    if (inGui(t) || inGui(t + 12) || inCut(t)) { flushDead(t); continue }
    let mv = poseMove(t)
    let me = nearest(POSE, Math.round(t)); if (me) lastMe = me; else me = lastMe   // dead: the last place we stood
    for (const [id, m] of ent) {
      if (isMob.get(id)) { const r = nearest(m, Math.round(t)); if (!r || !me || Math.hypot(r[3] - me[1], r[4] - me[2], r[5] - me[3]) > 24) continue }
      mv = Math.max(mv, entMove(m, t))
    }
    for (let k = 0; k < 24; k++) if (swingsAt.has(Math.round(t + k))) { mv = Math.max(mv, 0.3); break }   // an arm swing is a gesture
    if (mv < 0.25) { if (deadFrom === null) deadFrom = t } else flushDead(t + 12)
  }
  flushDead(end)
  for (const [a, b] of dead) if (b - a >= 20) problems.push(`${fmt(T(a))}-${fmt(T(b))} s  nobody moves for ${((b - a) / 20).toFixed(1)} s${lineAt((a + b) / 2) ? ' (a line is up, but no one moves: use M.say, give the listener a turn, or cut)' : ''}`)
  // beats: is the thing the story hinges on big enough to see?
  for (const e of tl.filter(x => x.event === 'beat' && Array.isArray(x.at))) {
    const t = e.t / 50, s = list.find(q => t >= q.t0 && t < q.t1)
    if (!s) continue
    const cam = camAtShot(s, t); if (!cam) continue
    const p = { x: e.at[0] + 0.5, y: e.at[1] + 0.5, z: e.at[2] + 0.5 }, pr = project(cam, p, (cam.fov || 70) * Math.PI / 180)
    const px = pr ? ((e.size || 1) / pr.z) / (2 * Math.tan((cam.fov || 70) * Math.PI / 360)) * 1080 : 0
    const want = e.minPx || 30
    if (!pr || Math.abs(pr.x) > 1 || Math.abs(pr.y) > bars) problems.push(`${fmt(T(t))} s  beat '${e.what || 'beat'}' is out of frame in ${s.name}`)
    else if (px < want) problems.push(`${fmt(T(t))} s  beat '${e.what || 'beat'}' is ${Math.round(px)} px tall in ${s.name} (want ${want}+ at 1080p): move closer, cut in, or slow it down`)
    else N(t, `beat '${e.what || 'beat'}': ${Math.round(px)} px in ${s.name}`)
  }
  // lines across cuts (a NOTE: sometimes right, often a subtitle hanging over the next shot)
  for (const l of lines) {
    const cut = list.find(s => s.t0 > l.t0 + 4 && s.t0 < l.t1 - 6)
    if (cut) N(cut.t0, `the line by ${l.who} (from ${fmt(T(l.t0))} s) runs across the cut to ${cut.name}`)
  }

  // the report
  const out = []
  out.push(`LINT ${rec.stunt || ''}: ${report.length} shots, scene ${fmt(0)}-${fmt(T(end))} s (scene seconds from edit.startAt, before slow motion)`)
  for (const r of report) {
    const vis = r.subs.map(n => { const v = r.vis[n]; const sz = r.size[n]; return `${n} ${v ? Math.round(100 * v[0] / Math.max(1, v[1])) : 0}% seen${typeof sz === 'number' ? `, ${Math.round(sz * 100)}% tall` : ''}` }).join('; ')
    out.push(`  ${r.name.padEnd(12)} ${fmt(T(r.t0)).padStart(5)}-${fmt(T(r.t1)).padEnd(5)} ${r.kind.padEnd(6)} ${vis || (r.kind === 'pov' ? '' : '(no subject: add subject: [...] to check its framing)')}`)
    for (const [k, a, b, msg] of r.issues) (k === 'P' ? P(a, b, `${r.name}: ${msg}`) : N(a, `${r.name}: ${msg}`))
  }
  if (problems.length) { out.push(`PROBLEMS (${problems.length}): fix before rendering`); for (const p of problems) out.push(`  ! ${p}`) }
  if (notes.length) { out.push(`NOTES (${notes.length})`); for (const n of notes) out.push(`  - ${n}`) }
  out.push(problems.length ? `verdict: ${problems.length} problem(s)` : 'verdict: clean')
  console.log(out.join('\n'))
  return problems.length
}

module.exports = { run, project, nearPlaneClips }
