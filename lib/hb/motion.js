// Motion checks on a recording (owner, 2026-11-10: "The movement sometimes still feels jerky and botlike"). The safety
// net behind the story kit's motion-by-construction (lib/motion.js, lib/story.js): each returns plain findings
// { tick, kind, msg, ... } from the recording's own data, no rendering. lib/hb/owner.js turns them into gate findings.
//   guiMotion   the view moving while a container window is open (vanilla: the mouse drives the cursor)
//   teleports   a mob moving over a block in one tick, not on a cut (an on-screen reposition reads as a teleport)
//   visibleJumps any entity or the narrator jumping over 0.6 block in a tick in the frame while the camera holds
//   headSnaps   the first-person aim turning faster than a hand on a mouse (a whip), or its speed jumping in a tick
//   stalls      the forward key held and the player slowed by a block corner (sliding along it), or stopped
// Poses: [tick, x, y, z, yaw, pitch, slot, flags, keys] (lib/harness.js). Entities: [tick, id, name, x, y, z, ...].
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
const DEG = 180 / Math.PI

// [open tick, close tick] for each container window (harness container / container_close marks)
function guiWindows (timeline) {
  const out = []; let a = null
  for (const e of timeline || []) {
    if (e.event === 'container' && a === null) a = e.t / 50
    if (e.event === 'container_close' && a !== null) { out.push([a, e.t / 50]); a = null }
  }
  if (a !== null) out.push([a, Infinity])
  return out
}

// the view moving while a window is open: the largest turn (deg) and move (blocks) from the opening tick
function guiMotion (P, timeline, { turn = 0.5, move = 0.02 } = {}) {
  const F = []
  for (const [a, b] of guiWindows(timeline)) {
    const i0 = Math.round(a), i1 = Math.min(P.length - 1, Math.round(b))
    if (i0 >= P.length) continue
    let mt = 0, mm = 0, at = i0
    for (let i = i0 + 1; i <= i1; i++) {
      const t = Math.hypot(wrap(P[i][4] - P[i0][4]), P[i][5] - P[i0][5]) * DEG
      const m = Math.hypot(P[i][1] - P[i0][1], P[i][2] - P[i0][2], P[i][3] - P[i0][3])
      if (t > mt || m > mm) at = i
      mt = Math.max(mt, t); mm = Math.max(mm, m)
    }
    if (mt > turn || mm > move) F.push({ tick: i0, end: i1, at, kind: 'gui', turn: +mt.toFixed(2), move: +mm.toFixed(3), msg: `the view moves while the container is open (${((i1 - i0) / 20).toFixed(2)} s): it turns ${mt.toFixed(1)} deg and moves ${mm.toFixed(2)} blocks behind the screen. Vanilla: the mouse drives the cursor, the view holds still from open to close. Owner: "The background shouldnt move while the chest is open": K.open / K.close (the kit freezes the view), or stunt.motionFixes for a re-render` })
  }
  return F
}

// mobs moving over `limit` blocks in one tick (1.5: a running mob's 3-tick update is ~1.2). Items, falling blocks,
// primed TNT (flung by the blasts of a chain: vanilla knockback, 1.5+ blocks a tick),
// projectiles and bats are skipped (they fly); a jump of over `far` blocks is a park or an unpark (a waiting room 60
// up). A jump within `after` ticks of a cut (cuts: ticks of cut/shot/respawn marks) is the cast moved with the cut:
// its teleport reached the client late, so it dashes across the new shot unless the renderer snaps it onto the cut
// (`snapped`: render.js MOTION_FIXES does).
const MOVERS = /^(item|experience_orb|falling_block|tnt|tnt_minecart|moving_block|egg|snowball|arrow|spectral_arrow|trident|ender_pearl|splash_potion|lingering_potion|experience_bottle|firework_rocket|fireball|small_fireball|wither_skull|lightning_bolt|marker|text_display|block_display|item_display|interaction|bat)$/
// `ok`: the story's sanctioned on-screen teleports (teleportOk(timeline): K.blink's `teleport_ok` marks, a tamed wolf
// teleporting to its owner): a jump within `after` ticks of one that lands within 3 blocks of its spot is vanilla, not
// a glitch.
function teleports (entities, cuts, { limit = 1.5, after = 6, far = 16, snapped = false, ok = [] } = {}) {
  const F = [], last = new Map(), byId = new Map()
  const rows = [...entities].sort((a, b) => a[0] - b[0])
  for (const r of rows) {
    if (MOVERS.test(r[2])) continue
    const p = last.get(r[1]); last.set(r[1], r)
    if (!p || r[0] - p[0] !== 1) continue
    const d = Math.hypot(r[3] - p[3], r[4] - p[4], r[5] - p[5])
    if (d <= limit || d > far || blinked(ok, r, after)) continue
    // a straight drop is a fall (vanilla: up to 3.92 blocks a tick; the server sends a mob's position every 3 ticks):
    // it_rains' and worse_sky's mobs falling from the sky, not a teleport
    if (r[4] < p[4] && Math.hypot(r[3] - p[3], r[5] - p[5]) < 0.25 && p[4] - r[4] <= 3.92 * 3) continue
    const cut = cuts.filter(c => r[0] >= c && r[0] <= c + after).pop()
    if (cut !== undefined && snapped) continue
    if (byId.has(r[1]) && r[0] - byId.get(r[1]) < 20) continue   // one finding per mob per second
    byId.set(r[1], r[0])
    const late = cut !== undefined ? Math.round(r[0] - cut) : null
    F.push({ tick: p[0], kind: 'teleport', id: r[1], name: r[2], blocks: +d.toFixed(2), late, from: [p[3], p[4], p[5]].map(v => +v.toFixed(2)), to: [r[3], r[4], r[5]].map(v => +v.toFixed(2)),
      msg: late !== null
        ? `the ${r[2]} (id ${r[1]}) was moved with the cut but lands ${late} ticks after it: it stands in its old spot, then dashes ${d.toFixed(1)} blocks across the new shot. Owner: "Grandma teleports": the renderer snaps it onto the cut for engine-3 recordings (stunt.motionFixes for an older one)`
        : `the ${r[2]} (id ${r[1]}) jumps ${d.toFixed(1)} blocks in one tick with no cut: reads as a teleport. Owner: "Grandma teleports": walk it (K.actor walks a cast member to its mark), move it with a cut, or K.warp it while it's off screen (a teleport that is the story, a tamed wolf to its owner: K.blink)` })
  }
  return F
}

// The entity tracks as render.js draws them (render.js, after the ENT load: MOTION_FIXES' late-landing fix, the BLINK
// set, then the vanilla 3-tick ease, Entity.lerpTo): the server sends a mob's move every 1-3 ticks and the client
// eases toward each over 3 ticks, so a raw row's 0.75-block step (a villager's hop) is drawn as 0.25 a tick, while a
// jump of over 4 blocks, a K.blink landing and a cast member placed on a cut snap. Keep in step with render.js
// (lib/hb/test/motion.test.js ties the constants). -> Map(id -> [[tick, x, y, z, name]]) (MOVERS left out).
//   cuts: render.js CAST_CUT_TICKS (cut / shot / respawn marks, rounded) when `snapped` (MOTION_FIXES), else []
function drawnTracks (entities, { cuts = [], snapped = false, ok = [] } = {}) {
  const ENT = new Map()
  for (const r of entities || []) {
    if (MOVERS.test(r[2])) continue
    if (!ENT.has(r[0])) ENT.set(r[0], new Map())
    ENT.get(r[0]).set(r[1], r.slice())
  }
  const ticks = [...ENT.keys()].sort((a, b) => a - b)
  const cutSet = new Set(snapped ? cuts.map(Math.round) : [])
  if (snapped) {   // a cast member moved with a cut: its late landing (within 6 ticks) moved back onto the cut
    for (const c of cutSet) {
      const seen = new Set()
      for (let tk = c + 1; tk <= c + 6; tk++) {
        const now = ENT.get(tk), before = ENT.get(tk - 1)
        if (!now || !before) continue
        for (const [id, row] of now) {
          const pr = before.get(id)
          if (!pr || seen.has(id) || Math.hypot(row[3] - pr[3], row[4] - pr[4], row[5] - pr[5]) <= 1) continue
          seen.add(id)
          for (const k of ticks) {
            if (k < c || k >= tk) continue
            const r = ENT.get(k).get(id); if (r) { r[3] = row[3]; r[4] = row[4]; r[5] = row[5] }
          }
        }
      }
    }
  }
  const blink = new Set()
  if (ok.some(m => !m.self)) {
    const prev = new Map()
    for (const tick of ticks) {
      for (const [id, row] of ENT.get(tick)) {
        const p = prev.get(id); prev.set(id, row)
        if (p && p[0] === tick - 1 && Math.hypot(row[3] - p[3], row[4] - p[4], row[5] - p[5]) > 0.5 && blinked(ok, row)) blink.add(`${id}|${tick}`)
      }
    }
  }
  const cur = new Map(), out = new Map()
  for (const tick of ticks) {
    for (const [id, row] of ENT.get(tick)) {
      let c = cur.get(id)
      if (!c || c.last !== tick - 1) c = { x: row[3], y: row[4], z: row[5], tx: row[3], ty: row[4], tz: row[5], steps: 0 }
      const jump = Math.hypot(row[3] - c.tx, row[4] - c.ty, row[5] - c.tz)
      const onCut = jump > 0.5 && jump <= 4 && cutSet.has(tick)
      if (jump > 4 || blink.has(`${id}|${tick}`) || onCut) { c.x = c.tx = row[3]; c.y = c.ty = row[4]; c.z = c.tz = row[5]; c.steps = 0 } else if (row[3] !== c.tx || row[4] !== c.ty || row[5] !== c.tz) { c.tx = row[3]; c.ty = row[4]; c.tz = row[5]; c.steps = 3 }
      if (c.steps > 0) { c.x += (c.tx - c.x) / c.steps; c.y += (c.ty - c.y) / c.steps; c.z += (c.tz - c.z) / c.steps; c.steps-- }
      c.last = tick; cur.set(id, c)
      if (!out.has(id)) out.set(id, [])
      out.get(id).push([tick, c.x, c.y, c.z, row[2]])
    }
  }
  return out
}

// Any entity, the narrator included, that moves over `limit` blocks between two ticks in the frame while the camera
// holds the shot (owner, Good Boy voiced preview, 2026-11-11: "we can see the dog teleport"; `teleports` above and
// rec_check's cast checks passed it). What those missed: the narrator is the recording bot (a wolf seen from camera
// shots), never an entity row; its K.blink counted as a cut wherever it landed; jumps under 1.5 blocks; mobs that are
// not the marked cast; player-shaped actors. Here:
//   - the tracks are what the renderer draws (drawnTracks: eased, snapped), the narrator its raw pose
//   - a cut is the camera's own jump (`camCut(tick)`: the picture changes between tick - 1 and tick), not a mark near
//     it: a blink landing 2 ticks before or after the shot change is on screen
//   - a jump is a step over `limit` AND over `spike` x the step before it (a sprint or a cart is fast
//     but continuous); a straight drop is a fall, a rise of up to 0.6 a step up (maxUpStep)
//   - a teleport_ok mark (K.blink) exempts nothing by itself: an intended teleport has to land on the cut
//     (K.cutShot's moves / { self })
// `seen(tick, [x, y, z], id)` -> 'seen' | 'near' | null (MO.viewClass against that tick's camera; the narrator: null in
// its own POV): 'seen' at either end BLOCKs, 'near' WARNs. entities: rec rows; poses: rec.poses (the narrator) or null.
function visibleJumps (entities, poses, { limit = 0.6, spike = 2, camCut = () => false, seen = () => null, snapCuts = [], snapped = false, ok = [], selfName = 'narrator' } = {}) {
  const cuts = [...new Set(snapCuts.map(Math.round))]
  const tracks = drawnTracks(entities, { cuts, snapped, ok })
  if (poses && poses.length) tracks.set('self', poses.map((p, i) => [i, p[1], p[2], p[3], selfName]))
  const step = (a, b) => (a && b && b[0] - a[0] === 1) ? Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) : 0
  const rank = { seen: 2, near: 1 }
  const F = []
  for (const [id, rows] of tracks) {
    let last = -99
    for (let k = 1; k < rows.length; k++) {
      const p = rows[k - 1], r = rows[k]
      if (r[0] - p[0] !== 1) continue
      const d = step(p, r)
      if (d <= limit) continue
      if (d <= spike * step(rows[k - 2], p)) continue   // fast, but continuous (an eased glide's first tick still counts)
      if (r[2] < p[2] && Math.hypot(r[1] - p[1], r[3] - p[3]) < 0.25 && p[2] - r[2] <= 3.92 * 3) continue   // a fall
      if (r[2] > p[2] && r[2] - p[2] <= 0.6 + 1e-6 && Math.hypot(r[1] - p[1], r[3] - p[3]) <= limit) continue   // a step up (vanilla maxUpStep 0.6: a slab, a path block)
      if (camCut(r[0])) continue
      const v = [seen(p[0], [p[1], p[2], p[3]], id), seen(r[0], [r[1], r[2], r[3]], id)].sort((a, b) => (rank[b] || 0) - (rank[a] || 0))[0]
      if (!v || r[0] - last < 10) continue
      last = r[0]
      const blinkMark = ok.find(m => Math.abs(m.tick - r[0]) <= 6 && (id === 'self' ? m.self : !m.self && Math.hypot(r[1] - m.x, r[2] - m.y, r[3] - m.z) <= 3))
      const near = cuts.map(c => r[0] - c).filter(x => Math.abs(x) <= 6).sort((a, b) => Math.abs(a) - Math.abs(b))[0]
      const when = near === undefined ? 'mid-shot' : near > 0 ? `${near} tick(s) after the cut` : near < 0 ? `${-near} tick(s) before the cut` : 'on the cut mark, but the camera holds'
      const who = id === 'self' ? `the narrator (${selfName})` : `the ${r[4]} (id ${id})`
      F.push({ tick: r[0], kind: 'visible_jump', id, name: r[4], blocks: +d.toFixed(2), level: v === 'seen' ? 'BLOCK' : 'WARN', when, blink: !!blinkMark,
        from: [p[1], p[2], p[3]].map(x => +x.toFixed(2)), to: [r[1], r[2], r[3]].map(x => +x.toFixed(2)),
        msg: `${who} jumps ${d.toFixed(2)} blocks in one tick ${v === 'seen' ? 'in the frame' : 'just out of view'}, ${when}: reads as a teleport. Owner: "we can see the dog teleport". ` +
          (blinkMark ? 'It is a K.blink (teleport_ok): an intended teleport still has to land on the camera cut. Move it inside K.cutShot (the narrator: K.cutShot(name, moves, { self: spot }): the shot mark waits until it has landed)'
            : id === 'self' ? 'Move the narrator with the cut (K.cutShot(name, moves, { self: spot })), or walk it'
              : 'Walk it (K.actor), move it inside K.cutShot so the shot mark waits for it, or K.warp it while it is off screen') })
    }
  }
  return F.sort((a, b) => a.tick - b.tick)
}

// K.blink's `teleport_ok` marks -> [{ tick, x, y, z, self }] (absolute; self: the player itself blinked)
function teleportOk (timeline) {
  return (timeline || []).filter(e => e && e.event === 'teleport_ok' && Number.isFinite(e.x)).map(e => ({ tick: e.t / 50, x: e.x, y: e.y, z: e.z, self: !!e.self, tag: e.tag }))
}
// an entity row [tick, id, name, x, y, z] that lands on a teleport_ok spot (within 3 blocks) up to `after` ticks after it
function blinked (ok, r, after = 6) {
  return (ok || []).some(m => !m.self && r[0] >= m.tick && r[0] <= m.tick + after && Math.hypot(r[3] - m.x, r[4] - m.y, r[5] - m.z) <= 3)
}

// Where a jump happened, for the owner gate (owner, dog_hill: villagers 40-60 blocks away behind the hill "teleported"
// 2 blocks, the server's sparse updates at that range): 'seen' (in the frame, under 48 blocks, not behind blocks) is a
// blocker, 'near' (just off the frame's edge or behind blocks, under 32 blocks, or within 8 blocks of the camera) a
// warning, and anything else (far, hidden far away, behind the camera) is nobody's business: null.
//   v: { inFrame, margin (in the frame grown by a quarter each side), depth, dist (to the camera), occluded }
function viewClass (v) {
  if (!v) return null
  if (v.inFrame && v.depth < 48 && !v.occluded) return 'seen'
  if (v.dist <= 8) return 'near'
  if ((v.inFrame || v.margin) && v.depth < 32) return 'near'
  return null
}

// the first-person aim: a whip (over `speed` deg a tick: 12 = 240 deg/s) or a kick (the speed changing by over
// `kick` deg a tick in one tick). ok(i): the tick is first person, in the Short, not a cut or a death.
function headSnaps (P, ok = () => true, { speed = 12, kick = 7 } = {}) {
  const F = []
  const w = (i) => Math.hypot(wrap(P[i + 1][4] - P[i][4]) * Math.cos(P[i][5]), P[i + 1][5] - P[i][5]) * DEG
  let last = -99
  for (let i = 1; i < P.length - 1; i++) {
    if (!ok(i) || !ok(i - 1)) continue
    const a = w(i - 1), b = w(i)
    const whip = b > speed, kicked = Math.abs(b - a) > kick
    if (!whip && !kicked) continue
    if (i - last < 10) continue
    last = i
    F.push({ tick: i, kind: 'snap', speed: +(b * 20).toFixed(0), kick: +((b - a) * 400).toFixed(0), msg: `the view ${whip ? `whips at ${(b * 20).toFixed(0)} deg/s` : `jerks: its turn speed jumps ${(Math.abs(b - a) * 20).toFixed(0)} deg/s in one tick`} (a hand on a mouse: under ${speed * 20} deg/s, eased in and out). Owner: "the head jerking around": aim with K.aimAt / K.turnTo / K.place / K.dig (the kit's governor eases every turn); no raw bot.look` })
  }
  return F
}

// the forward key held (pose field 8, bit 1) and the player slowed to under `frac` of its walk for `n` ticks, on the
// ground, no cut: a block corner it slides along ("Gets stuck on the block while walking forward slightly").
function stalls (P, ok = () => true, { frac = 0.6, n = 3, walk = 0.15 } = {}) {
  const F = []
  const hs = (i) => Math.hypot(P[i + 1][1] - P[i][1], P[i + 1][3] - P[i][3])
  let ref = 0, run = 0, low = Infinity, last = -99
  const flush = (i) => {
    if (run >= n && i - last > 20) {
      last = i
      F.push({ tick: i - run, end: i, kind: 'stall', from: +(ref * 20).toFixed(1), to: +(low * 20).toFixed(1), msg: `walking forward, the player slows from ${(ref * 20).toFixed(1)} to ${(low * 20).toFixed(1)} blocks/s for ${(run / 20).toFixed(2)} s: it is sliding along a block it walked into. Owner: "Gets stuck on the block while walking forward": K.walkTo with a point around it` })
    }
    run = 0; low = Infinity
  }
  for (let i = 1; i < P.length - 1; i++) {
    const fwd = ((P[i][8] || 0) & 1) && !((P[i][7] || 0) & 1)
    if (!ok(i) || !fwd) { flush(i); ref = 0; continue }
    const v = hs(i)
    if (ref > walk && v < frac * ref && Math.abs(P[i + 1][2] - P[i][2]) < 0.01) { run++; low = Math.min(low, v) } else { flush(i); ref = Math.max(ref * 0.9, v) }
  }
  return F
}

module.exports = { guiWindows, guiMotion, teleports, drawnTracks, visibleJumps, teleportOk, blinked, viewClass, headSnaps, stalls }
