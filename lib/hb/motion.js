// Motion checks on a recording (owner, 2026-11-10: "The movement sometimes still feels jerky and botlike"). The safety
// net behind the story kit's motion-by-construction (lib/motion.js, lib/story.js): each returns plain findings
// { tick, kind, msg, ... } from the recording's own data, no rendering. lib/hb/owner.js turns them into gate findings.
//   guiMotion   the view moving while a container window is open (vanilla: the mouse drives the cursor)
//   teleports   a mob moving over a block in one tick, not on a cut (an on-screen reposition reads as a teleport)
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
// projectiles and bats are skipped (they fly); a jump of over `far` blocks is a park or an unpark (a waiting room 60
// up). A jump within `after` ticks of a cut (cuts: ticks of cut/shot/respawn marks) is the cast moved with the cut:
// its teleport reached the client late, so it dashes across the new shot unless the renderer snaps it onto the cut
// (`snapped`: render.js MOTION_FIXES does).
const MOVERS = /^(item|experience_orb|falling_block|moving_block|egg|snowball|arrow|spectral_arrow|trident|ender_pearl|splash_potion|lingering_potion|experience_bottle|firework_rocket|fireball|small_fireball|wither_skull|lightning_bolt|marker|text_display|block_display|item_display|interaction|bat)$/
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

module.exports = { guiWindows, guiMotion, teleports, teleportOk, blinked, viewClass, headSnaps, stalls }
