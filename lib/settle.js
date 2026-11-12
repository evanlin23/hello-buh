// When does the payoff settle? (owner r:r24d99a, 2026-11-11: which_door, villager_fired, pickaxe_race and sand_tower
// ended or cut while TNT, debris or falling sand were still moving; narrowed by r:r188b46, the same day: "we blow up
// the TNT, wait for what feels like forever, then we cut... boom, boom, boom, fast pace".) Pure functions over a
// recording: the windows of "payoff motion" and the tick each one settles. Only the ACTION holds a cut: a primed TNT
// (the blast is still to come), a falling block in the air, a mob's death (the 1 s fall-over and the poof) and the
// blast frame itself (BLAST_TICKS, ~0.3 s). Smoke, explosion particles, poof clouds, crumbs and items drifting out of
// a blast never hold a cut (r:r188b46): the settle lands soon after the last real motion, and the edit cuts 0.3-0.6 s
// later. The harness (lib/harness.js) waits for the last window after `perform` and writes the marks, so an edit can
// end on it: `endAfter: 'settle:0.5'` ends 0.5 s after the last payoff motion (every consumer reads endAfter as
// 'event:seconds', so nothing else changes). A stunt whose payoff is a blast or a fall should end there: the motion
// lint (lib/hb/motion_lint.js) warns on one that ends on anything else.
//   marks: motion_start { kinds } / motion_settled { from, kinds } around every window, and one `settle` at the end
//   of the last window (edit.py and every other consumer read the FIRST mark of an event: there is only one `settle`)
// Recordings made before r:r188b46 (2026-11-11) carry the old marks (a blast held 44 ticks, flying items counted):
// their `settle` sits ~1.9 s after the last blast. pace's settle and dwell checks recompute from the entities, so an
// edit-only fix on such a recording ends on the blast mark (or 'settle:-1.6'), not on 'settle:0.6'.

// The blast frame: the explosion_emitter's flash and the first burst (renderer/particles.js: the emitter's discs live
// 8 + 9 ticks, but by ~6 the bang has read). This is what holds a cut.
const BLAST_TICKS = 6
// How long the RENDERER's smoke, poof clouds and crumbs keep moving after a blast (up to 40-84 ticks; under 15% of the
// peak motion by 44: test/settle.test.js). Before r:r188b46 the settle waited this out; now it is information only
// (pace's tail picture check knows a still-smoking ending is particles, not the payoff).
const SMOKE_TICKS = 44
const EXPLOSION_TICKS = BLAST_TICKS   // (the old name: the window an explosion holds)
// after the settle mark the recording keeps going this long, so endAfter 'settle:0.6' (up to 'settle:2') always has
// its tail: which_door's recording stopped 0.15 s after the mark and the edit's 0.6 s got cut to 0.11 s
const SETTLE_TAIL_TICKS = 40
const DEATH_TICKS = 20       // LivingEntity.tickDeath: the 20-tick fall over and the poof
const NOT_LIVING = new Set(['egg', 'snowball', 'arrow', 'spectral_arrow', 'trident', 'ender_pearl', 'experience_bottle', 'potion', 'splash_potion', 'lingering_potion', 'fireball', 'small_fireball', 'wind_charge', 'item', 'experience_orb'])
const MERGE = 3              // ticks: two windows this close are one
const SETTLE_PAD = 0.5       // s after the settle that endAfter: 'settle' ends on (r:r188b46: 0.3-0.6 s after the result)

// rec: { entities: [[tick, id, name, x, y, z, ...]] }, timeline: [{ t (ms), event, type? }]. -> [{ from, to, kinds }]
// in ticks: `to` is the first tick with nothing moving again
function motionWindows (rec, timeline = (rec && rec.timeline) || []) {
  const active = new Map()   // tick -> Set(kinds)
  const on = (t, kind) => { if (!active.has(t)) active.set(t, new Set()); active.get(t).add(kind) }
  const booms = timeline.filter(m => m.event === 'particles' && m.type === 'explosion').map(m => Math.round(m.t / 50))
  for (const b of booms) for (let k = 0; k < BLAST_TICKS; k++) on(b + k, 'explosion')
  // a projectile's or an item's removal is no death (no fall-over, no poof; cells_lab's eggs): = owner_checks NOT_LIVING
  const names = new Map(); for (const r of (rec && rec.entities) || []) if (!names.has(r[1])) names.set(r[1], r[2])
  for (const m of timeline) {
    if (m.event === 'mob_death' && NOT_LIVING.has(names.get(m.id))) continue
    if (m.event === 'mob_death' || m.event === 'death') { const t = Math.round(m.t / 50); for (let k = 0; k < DEATH_TICKS; k++) on(t + k, 'death') }
  }
  // (items thrown by a blast are drifting debris: they never hold a cut, r:r188b46)
  for (const r of (rec && rec.entities) || []) {
    const [t, , name] = r
    if (name === 'falling_block') on(t, 'falling_block')
    else if (name === 'tnt' || name === 'tnt_minecart') on(t, 'tnt')
  }
  const ticks = [...active.keys()].sort((a, b) => a - b)
  const out = []
  for (const t of ticks) {
    const w = out[out.length - 1]
    if (w && t - w.to <= MERGE) { w.to = t + 1; for (const k of active.get(t)) w.kinds.add(k) } else out.push({ from: t, to: t + 1, kinds: new Set(active.get(t)) })
  }
  return out.map(w => ({ from: w.from, to: w.to, kinds: [...w.kinds].sort() }))
}

// the marks to add for those windows (t in ms, as harness marks); `endTick`: nothing after the recording's end
function settleMarks (windows, endTick = Infinity) {
  const out = []
  for (const w of windows) {
    if (w.from > endTick) continue
    out.push({ t: w.from * 50, event: 'motion_start', kinds: w.kinds })
    out.push({ t: Math.min(w.to, endTick) * 50, event: 'motion_settled', from: w.from * 50, kinds: w.kinds, ...(w.to > endTick ? { cut: true } : {}) })
  }
  if (out.length) { const l = out[out.length - 1]; out.push({ t: l.t, event: 'settle', from: l.from, kinds: l.kinds, ...(l.cut ? { cut: true } : {}) }) }
  return out
}

// merge marks into a timeline by time (stable: a mark at the same t goes after what's there)
function insertMarks (timeline, marks) {
  for (const m of marks) {
    let i = timeline.length
    while (i > 0 && timeline[i - 1].t > m.t) i--
    const near = timeline[Math.max(0, i - 1)] || {}
    timeline.splice(i, 0, { slot: near.slot, health: near.health, max_health: near.max_health, ...m })
  }
  return timeline
}

// is anything still moving in the live world? (the harness waits on this after perform). ents: bot.entities values;
// tick: now; lastBoom / lastDeath: the ticks of the last explosion / death
function liveBusy (ents, tick, lastBoom = -1e9, lastDeath = -1e9) {
  if (tick - lastBoom < BLAST_TICKS || tick - lastDeath < DEATH_TICKS) return true
  return ents.some(e => e && (e.name === 'falling_block' || e.name === 'tnt' || e.name === 'tnt_minecart'))
}

module.exports = { NOT_LIVING, motionWindows, settleMarks, insertMarks, liveBusy, BLAST_TICKS, SMOKE_TICKS, EXPLOSION_TICKS, DEATH_TICKS, SETTLE_PAD, SETTLE_TAIL_TICKS }
