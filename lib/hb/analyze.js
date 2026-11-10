// Text views of a recording for agents (hb describe / continuity / framing): what the camera sees, what changes
// between shots, how big the subject is on screen. Geometry only, no rendering; the numbers come from
// lib/hb/scene.js (the same poses, entities and block changes render.js draws).
const fs = require('fs')
const path = require('path')
const { dayLabel, ROOT } = require('./scene')

const CAST_SKIP = /^(item|experience_orb|falling_block|moving_block|arrow|snowball|egg|ender_pearl|potion|splash_potion|lingering_potion|area_effect_cloud|lightning_bolt|marker|text_display|item_display|block_display|interaction|tnt|fireball|small_fireball|firework_rocket|eye_of_ender|fishing_bobber|trident|experience_bottle|armor_stand)$/
const isCast = (e) => !CAST_SKIP.test(e.type)
const deg = (r) => Math.round(r * 180 / Math.PI)
function compass (yaw) {
  const dx = -Math.sin(yaw), dz = -Math.cos(yaw)
  const a = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(a / 45) % 8]
}
// Shot sizes as docs/story_craft.md section 8 names them, from the share of the frame height the subject spans
// (a 2-block villager: EWS at 20+ blocks, WS 8-12, FS 4-5, MS 2-3, CU 1-1.5, ECU under 1, at FOV 70)
const SIZES = ['ews', 'wide', 'full', 'ms', 'cu', 'ecu']
const SIZE_NAME = { ews: 'EWS extreme wide', wide: 'WS wide', full: 'FS full', ms: 'MS medium', cu: 'CU close-up', ecu: 'ECU extreme close-up' }
function sizeKey (frac) {
  if (frac >= 1.4) return 'ecu'
  if (frac >= 0.8) return 'cu'
  if (frac >= 0.4) return 'ms'
  if (frac >= 0.22) return 'full'
  if (frac >= 0.09) return 'wide'
  return 'ews'
}
const sizeOf = (frac) => SIZE_NAME[sizeKey(frac)]
const TIGHT = 0.6   // owner, 2026-11-10: "stuff might be too zoomed in at times": a subject over 60% of the frame height
const normSize = (s) => { s = String(s || '').toLowerCase(); return s === 'ws' ? 'wide' : s === 'fs' ? 'full' : s === 'medium' ? 'ms' : s === 'close' || s === 'closeup' ? 'cu' : s }
// the subject: the biggest figure whose middle is well inside the frame (one cut off at the edge is foreground)
function pickSubject (list) {
  const inside = list.filter(e => e.screen && e.screen.x > 0.1 && e.screen.x < 0.9 && e.screen.y > 0.05 && e.screen.y < 0.92)
  return (inside.length ? inside : list).slice().sort((a, b) => b.frac - a.frac)[0]
}
const where = (s) => `${(s.x * 100).toFixed(0)}% across, ${(s.y * 100).toFixed(0)}% down`

// story captions: stories/<dir>/story.json + voice/voice.json (durations and chunk times)
function storyOf (stunt) {
  const dir = stunt && stunt.edit && stunt.edit.story
  if (!dir) return null
  try {
    const st = JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'story.json')))
    let vo = null
    try { vo = JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'voice', 'voice.json'))) } catch (e) {}
    return { st, vo, gap: st.gap ?? 0.1 }
  } catch (e) { return null }
}
function captionAt (scene, story, tick) {
  if (!story) return null
  let cur = null
  for (const e of scene.tl) if (e.event === 'line' && e.t / 50 <= tick) cur = e
  if (!cur) return null
  const id = cur.id, L = (story.vo && story.vo.lines && story.vo.lines[id]) || null
  const def = (story.st.lines || []).find(l => l.id === id) || {}
  const into = (tick - cur.t / 50) / 20
  const dur = L ? L.dur : null
  if (dur !== null && into > dur + story.gap + 0.05) return { id, done: true, text: def.text }
  let chunk = null
  if (L && L.chunks) { L.chunks.forEach((c, k) => { if (c[0] <= into) chunk = (L.captions || [])[k] || null }) }
  return { id, text: def.text, into: +into.toFixed(2), dur, onScreen: chunk }
}
function editOverlays (scene, tick) {
  const ed = (scene.stunt && scene.stunt.edit) || {}
  const out = []
  const markT = (name, nth = 0) => { const hits = scene.tl.filter(e => e.event === name); return hits[nth] ? hits[nth].t / 50 : null }
  for (const s of ed.subs || []) { const t = markT(s[0], s[3] || 0); const d = (s[2] || 1.5) * 20; if (t !== null && tick >= t && tick < t + d) out.push(`sub "${s[1]}"`) }
  for (const c of ed.cards || []) { const t = markT(c[0], c[4] || 0); const d = (c[2] || 1) * 20; if (t !== null && tick >= t && tick < t + d) out.push(`card "${c[1]}"`) }
  return out
}

// everything about one moment
function describe (scene, tick, ctx = {}) {
  scene.worldAt(tick)
  const cam = scene.cameraAt(tick, ctx)
  const res = { tick: +tick.toFixed(2), out: ctx.out ?? null, camera: null, time: null, weather: scene.weather(tick), hud: scene.hud(tick) }
  const dt = scene.dayTime(tick)
  res.time = { dayTime: dt, label: dayLabel(dt) }
  res.caption = captionAt(scene, ctx.story, tick)
  res.overlays = editOverlays(scene, tick)
  if (!cam.known) {
    res.camera = { mode: cam.mode, known: false, note: 'a movie-engine camera only render.js computes: look with `hb still` (or `hb lint` for its framing checks)', spec: cam.spec }
    return res
  }
  res.camera = { mode: cam.mode, x: +cam.x.toFixed(2), y: +cam.y.toFixed(2), z: +cam.z.toFixed(2), facing: compass(cam.yaw), yaw: deg(Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw))), pitch: deg(cam.pitch), fov: +cam.fov.toFixed(1), zoom: cam.zoom, sneak: cam.sneak || undefined }
  const S = scene.rec.set
  if (S) res.camera.fromSet = [+(cam.x - S.x).toFixed(1), +(cam.y - S.y).toFixed(1), +(cam.z - S.z).toFixed(1)]
  const ents = scene.view(cam, tick, { items: ctx.items })
  res.inFrame = ents.filter(e => e.inFrame).map(e => ({ id: e.id, what: e.label, dist: e.dist, screen: e.screen, height: e.frac, size: sizeOf(e.frac), hidden: e.hidden ? `behind ${e.hidden.block} ${e.hidden.dist} blocks out` : undefined, held: e.held || undefined, fire: e.fire || undefined }))
  res.nearbyOffscreen = ents.filter(e => !e.inFrame && e.dist < 16 && isCast(e)).map(e => ({ id: e.id, what: e.label, dist: e.dist }))
  const sv = scene.survey(cam)
  res.view = { sky: sv.sky, medianDist: sv.medianDist, within3Blocks: sv.nearShare, fills: sv.blocks.slice(0, 6), crosshair: sv.center.block ? `${sv.center.block} ${sv.center.dist} blocks` : 'sky' }
  res.props = scene.props(cam).slice(0, 10)
  const subj = pickSubject(res.inFrame.filter(e => !e.hidden && !/^item /.test(e.what)).map(e => ({ ...e, frac: e.height })))
  res.shotSize = subj ? `${sizeOf(subj.height)} on ${subj.what} (${Math.round(subj.height * 100)}% of the frame height)` : (sv.medianDist !== null && sv.medianDist < 4 ? 'close on the set (view mostly within 4 blocks)' : 'no one in frame')
  if (ctx.marks) res.marksNear = ctx.marks.filter(m => Math.abs(m.tick - tick) <= 40).map(m => `${m.event}${m.id ? ' ' + m.id : ''}${m.name ? ' ' + m.name : ''} ${m.tick - tick >= 0 ? '+' : ''}${((m.tick - tick) / 20).toFixed(2)}s`)
  return res
}

function describeText (d) {
  const L = []
  const o = d.out !== null && d.out !== undefined ? `${d.out.toFixed(2)} s of the Short` : 'outside the Short'
  L.push(`== ${o} (source tick ${d.tick})`)
  const c = d.camera
  if (c.known === false) L.push(`camera: ${c.mode}: ${c.note}`)
  else L.push(`camera: ${c.mode}, at ${c.x} ${c.y} ${c.z}${c.fromSet ? ` (set ${c.fromSet.join(' ')})` : ''}, facing ${c.facing} (yaw ${c.yaw}, pitch ${c.pitch}), fov ${c.fov}${c.zoom ? ` zoom x${c.zoom}` : ''}${c.sneak ? ', sneaking' : ''}`)
  L.push(`time: ${d.time.label} (${d.time.dayTime}), weather ${d.weather}; HUD: health ${d.hud.health}, held ${d.hud.held || 'nothing'}${d.hud.hideHand ? ' (hand hidden)' : ''}${d.hud.f1 ? ', no HUD (F1, a camera shot or stunt.hud false)' : ''}`)
  if (d.caption) L.push(`caption: ${d.caption.id}${d.caption.done ? ' (finished)' : ` "${d.caption.onScreen || ''}"`} | ${d.caption.text || ''}`)
  if (d.overlays && d.overlays.length) L.push(`overlays: ${d.overlays.join(', ')}`)
  if (d.shotSize) L.push(`shot: ${d.shotSize}`)
  if (d.inFrame) {
    L.push(`in frame (${d.inFrame.length}):`)
    for (const e of d.inFrame.slice(0, 14)) L.push(`  ${e.what} #${e.id}: ${e.dist} blocks, ${where(e.screen)}, ${Math.round(e.height * 100)}% tall (${e.size})${e.hidden ? `, HIDDEN ${e.hidden}` : ''}${e.held ? `, holding ${e.held}` : ''}${e.fire ? ', on fire' : ''}`)
    if (d.inFrame.length > 14) L.push(`  ... ${d.inFrame.length - 14} more`)
  }
  if (d.nearbyOffscreen && d.nearbyOffscreen.length) L.push(`near but out of frame: ${d.nearbyOffscreen.map(e => `${e.what} #${e.id} ${e.dist}`).join(', ')}`)
  if (d.view) L.push(`view: ${Math.round(d.view.sky * 100)}% sky, median depth ${d.view.medianDist ?? '-'} blocks, ${Math.round(d.view.within3Blocks * 100)}% within 3 blocks; crosshair on ${d.view.crosshair}; fills: ${d.view.fills.map(b => `${b.block} ${Math.round(b.share * 100)}%`).join(', ')}`)
  if (d.props && d.props.length) L.push(`props/lights in view: ${d.props.map(p => `${p.block}${p.count > 1 ? ' x' + p.count : ''} (${p.nearest})`).join(', ')}`)
  if (d.marksNear && d.marksNear.length) L.push(`marks within 2 s: ${d.marksNear.join(', ')}`)
  return L.join('\n')
}

// --- per shot: continuity and framing
function shotState (scene, tick, ctx) {
  scene.worldAt(tick)
  const cam = scene.cameraAt(tick, ctx)
  const st = { tick, dayTime: scene.dayTime(tick), weather: scene.weather(tick), hud: scene.hud(tick), cam }
  if (!cam.known) return st
  st.ents = scene.view(cam, tick)
  st.cast = st.ents.filter(e => e.visible && isCast(e))
  st.survey = scene.survey(cam, 9)
  return st
}

function analyzeShots (scene, shots, ctx = {}) {
  const findings = [], rows = []
  const add = (level, shot, msg, kind) => findings.push({ level, out: shot.out[0], shot: shot.n, line: shot.line, kind, msg })
  const places = []   // camera positions of the places seen so far
  places.since = {}; places.cur = -1
  let prev = null
  for (const s of shots) {
    if (s.ticks[0] === null) continue
    const t0 = s.ticks[0] + 0.5, t1 = Math.max(t0, s.ticks[1] - 0.5), tm = (t0 + t1) / 2
    const A = shotState(scene, t0, ctx)
    let M = null
    // within the shot, tick by tick: time, weather and pops of entities in view
    const inside = []
    const times = scene.TIMES.filter(([t]) => t > t0 + 1 && t <= s.ticks[1]).map(([t, v]) => [t, v])
    // one time mark mid-shot is a jump (the light snaps); a run of small steps is a time-lapse sky
    const into = (t) => ((t - s.ticks[0]) / 20).toFixed(2)
    if (times.length >= 4) inside.push(['WARN', `time-lapse inside the shot: ${times.length} time steps ${times[0][1]} -> ${times[times.length - 1][1]} (${dayLabel(times[0][1])} -> ${dayLabel(times[times.length - 1][1])}) from ${into(times[0][0])} to ${into(times[times.length - 1][0])} s into it: intended?`, 'time'])
    else for (const [t, v] of times) inside.push(['PROBLEM', `the time of day jumps mid-shot to ${v} (${dayLabel(v)}) at ${into(t)} s into it: put it on a cut (K.cut(..., { time }))`, 'time'])
    for (const [t, w] of scene.WEATHER.slice(1).filter(([t]) => t > t0 + 1 && t <= s.ticks[1])) inside.push(['NOTE', `weather turns ${w} mid-shot (it fades over ~5 s)`, 'weather'])
    if (A.cam.known) {
      let last = new Map()
      for (let t = Math.ceil(t0); t <= Math.floor(t1); t++) {
        if (!M && t >= tm) M = shotState(scene, t, ctx)
        scene.worldAt(t)
        const cam = scene.cameraAt(t, ctx)
        if (!cam.known) break
        const now = new Map()
        for (const e of scene.view(cam, t)) if (isCast(e) && e.visible) now.set(e.id, e)
        for (const [id, e] of now) {
          const p = last.get(id)
          if (p) { const d = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z); if (d > 1.2) inside.push([d > 4 ? 'PROBLEM' : 'WARN', `${e.label} #${id} ${d > 4 ? 'pops' : 'glides'} ${d.toFixed(1)} blocks in one tick in view at ${((t - s.ticks[0]) / 20).toFixed(2)} s into the shot`, 'pop']) }
          else if (last.size && t > Math.ceil(t0) + 1 && e.screen && e.screen.x > 0.1 && e.screen.x < 0.9 && e.dist < 24) inside.push(['WARN', `${e.label} #${id} appears in the middle of the frame ${((t - s.ticks[0]) / 20).toFixed(2)} s into the shot (${e.dist} blocks)`, 'appear'])
        }
        for (const [id, p] of last) if (!now.has(id) && p.screen && p.screen.x > 0.15 && p.screen.x < 0.85 && p.dist < 24) {
          const still = scene.entities(t).find(e => e.id === id)
          if (!still) inside.push(['WARN', `${p.label} #${id} vanishes in the middle of the frame ${((t - s.ticks[0]) / 20).toFixed(2)} s into the shot`, 'vanish'])
        }
        last = now
      }
    }
    if (!M) M = A
    const seen = new Set()
    for (const [lv, msg, kind] of inside) { const k = kind + msg.replace(/[\d.]+ s into.*$/, ''); if (seen.has(k)) continue; seen.add(k); add(lv, s, msg, kind) }

    // framing: the subject's size, a camera against a wall, a new place without a wide shot
    const row = { n: s.n, out: s.out, line: s.line, shot: s.shot, dur: +(s.out[1] - s.out[0]).toFixed(2), time: `${dayLabel(A.dayTime)} ${A.dayTime}`, weather: A.weather, held: A.hud.held }
    if (A.cam.known) {
      row.camera = `${[A.cam.x, A.cam.y, A.cam.z].map(v => v.toFixed(0)).join(' ')} facing ${compass(A.cam.yaw)}`
      const subj = (st) => pickSubject(st.cast || [])
      const sa = subj(A), sm = subj(M)
      const big = Math.max(sa ? sa.frac : 0, sm ? sm.frac : 0)
      const key = sa ? sizeKey(sa.frac) : (A.survey.medianDist !== null && A.survey.medianDist < 4 ? 'set-close' : (A.survey.medianDist ?? 99) >= 12 ? 'ews' : 'no-cast')
      row.sizeKey = key
      row.size = SIZE_NAME[key] || (key === 'set-close' ? 'close on the set' : 'no cast in frame')
      row.subject = sa ? `${sa.label} ${Math.round(sa.frac * 100)}%` : null
      row.cast = (A.cast || []).map(e => `${e.label.replace(/^villager \((\w+)\)/, '$1')}#${e.id} ${Math.round(e.dist)}m`)
      row.depth = A.survey.medianDist
      if (big > TIGHT) { const e = big === (sa ? sa.frac : 0) ? sa : sm; add('WARN', s, `too tight (${sizeOf(big)}): ${e.label} #${e.id} fills ${Math.round(big * 100)}% of the frame height, ${e.dist} blocks away. Owner: "stuff might be too zoomed in at times"; close-ups are for reveals only (docs/story_craft.md 8): pull back to 8-12 blocks for a wide`, 'tight') }
      if (A.survey.nearShare > 0.35) add('WARN', s, `camera against the set: ${Math.round(A.survey.nearShare * 100)}% of the frame is within 3 blocks (${A.survey.blocks.slice(0, 2).map(b => b.block).join(', ')})`, 'tight')
      if (A.cam.zoom) add('NOTE', s, `fovZoom x${A.cam.zoom} on this shot`, 'zoom')
      // the planned size (story.json v2: lines[].shot -> shots[].size)
      const plan = ctx.plan && s.line ? ctx.plan(s.line) : null
      if (plan) {
        row.planned = `${plan.id} ${plan.size || '?'}${plan.place ? ' @' + plan.place : ''}`
        const want = SIZES.indexOf(normSize(plan.size)), got = SIZES.indexOf(key)
        if (want >= 0 && got >= 0 && got > want) add('WARN', s, `tighter than planned: ${plan.id} is planned ${SIZE_NAME[SIZES[want]]}, the recording is ${SIZE_NAME[key]}${sa ? ` (${sa.label} ${Math.round(sa.frac * 100)}%)` : ''}`, 'tight')
      }
      // places: a camera more than 40 blocks from every earlier place is a new place; coming back after 2+ other
      // places counts as new again (story_craft 8, rule 2). Its first shot should be EWS/WS with depth.
      const here = { x: A.cam.x, z: A.cam.z }
      let pi = places.findIndex(p => Math.hypot(p.x - here.x, p.z - here.z) < 40)
      const lastPlace = places.cur
      const returning = pi >= 0 && pi !== lastPlace && (places.since[pi] || 0) > 2
      if (pi < 0) { places.push(here); pi = places.length - 1 }
      const isNew = pi !== lastPlace && (returning || places.since[pi] === undefined)
      if (pi !== lastPlace) { for (const k in places.since) places.since[k]++; places.since[pi] = 0; places.cur = pi }
      row.place = `P${pi + 1}`
      row.newPlace = isNew
      if (isNew && s.n > 0) {
        const wide = (!sa || sa.frac < 0.24) && (A.survey.medianDist === null || A.survey.medianDist >= 8) && A.survey.nearShare < 0.2
        if (!wide) add(s.n === 1 ? 'NOTE' : 'WARN', s, `${s.n === 1 ? '(the opening: a close hook is fine if the place reads soon after) ' : ''}${returning ? 'comes back to' : 'opens'} place P${pi + 1} without an establishing shot (${sa ? `${sizeOf(sa.frac)} on ${sa.label}` : 'no cast'}, median depth ${A.survey.medianDist} blocks): open EWS/WS, then cut in`, 'establish')
      }
      // same size twice in a row at the same place reads as a jump cut (rule 5)
      if (prev && prev.row && prev.row.place === row.place && prev.row.sizeKey === key && SIZES.includes(key)) add('NOTE', s, `same size as the shot before (${SIZE_NAME[key]}) at the same place: change size at the cut`, 'size')
    } else {
      row.camera = `${A.cam.mode} (render.js computes it: hb lint / hb still)`
    }
    // continuity across the cut from the previous shot
    if (prev && prev.end.cam.known && A.cam.known) {
      const P = prev.end
      const samePlace = Math.hypot(P.cam.x - A.cam.x, P.cam.z - A.cam.z) < 40
      const timeMark = scene.tl.some(e => e.event === 'time' && Math.abs(e.t / 50 - s.ticks[0]) <= 2)
      if (P.dayTime !== A.dayTime) add(timeMark ? 'NOTE' : 'WARN', s, `time cut ${P.dayTime} (${dayLabel(P.dayTime)}) -> ${A.dayTime} (${dayLabel(A.dayTime)})${samePlace ? ' at the same place' : ''}${timeMark ? ' (on its time mark)' : ' with no time mark on the cut'}`, 'time')
      if (P.weather !== A.weather) add('WARN', s, `weather jumps ${P.weather} -> ${A.weather} across the cut`, 'weather')
      if (P.hud.held !== A.hud.held && !scene.stunt.hideHand) add('WARN', s, `held item changes across the cut: ${P.hud.held || 'nothing'} -> ${A.hud.held || 'nothing'}`, 'held')
      if (samePlace) {
        const before = new Map((P.ents || []).filter(isCast).map(e => [e.id, e]))
        for (const e of A.ents.filter(isCast)) {
          const p = before.get(e.id)
          if (!p) continue
          const d = Math.hypot(e.x - p.x, e.z - p.z)
          const wasSeen = p.visible, isSeen = e.visible
          if ((wasSeen || isSeen) && d > 3 && d < 64) add('WARN', s, `${e.label} #${e.id} is ${d.toFixed(1)} blocks from where it was at the end of the last shot (${wasSeen ? 'seen there' : 'unseen there'}, ${isSeen ? 'seen here' : 'unseen here'}): a continuity jump unless the story skips time`, 'position')
          if (p.label !== e.label) add('WARN', s, `#${e.id} changes from ${p.label} to ${e.label} across the cut`, 'skin')
          if ((p.held || null) !== (e.held || null)) add('WARN', s, `${e.label} #${e.id} held item ${p.held || 'nothing'} -> ${e.held || 'nothing'} across the cut`, 'held')
        }
        for (const p of (P.cast || [])) {
          if (A.ents.some(e => e.id === p.id)) continue
          const pr = scene.project(A.cam, { x: p.x, y: p.y + p.h / 2, z: p.z })
          if (pr && pr.sx > 0.1 && pr.sx < 0.9 && pr.sy > 0 && pr.sy < 1 && !scene.occluder(A.cam, { x: p.x, y: p.y + p.h / 2, z: p.z }, 0.3)) add('WARN', s, `${p.label} #${p.id} was in the last shot and is gone from this one, although its spot is in view`, 'vanish')
        }
        const ch = scene.blockChanges(prev.tick, s.ticks[0] + 1).filter(b => { const pr = scene.project(A.cam, { x: b[1] + 0.5, y: b[2] + 0.5, z: b[3] + 0.5 }); return pr && pr.sx > 0 && pr.sx < 1 && pr.sy > 0 && pr.sy < 1 && pr.depth < 40 })
        if (ch.length) add('NOTE', s, `${ch.length} block(s) in view changed during the cut (e.g. ${[...new Set(ch.slice(0, 40).map(b => scene.NAME[b[4]] || b[4]))].slice(0, 4).join(', ')} at ${ch[0].slice(1, 4).join(' ')}): intended?`, 'blocks')
      }
    }
    rows.push(row)
    prev = { end: shotState(scene, t1, ctx), tick: t1, row }
  }
  return { rows, findings }
}

module.exports = { describe, describeText, analyzeShots, sizeOf, sizeKey, compass, storyOf, TIGHT, SIZE_NAME, isCast }
