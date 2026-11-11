// When does the payoff settle? (owner r:r24d99a, 2026-11-11: which_door, villager_fired, pickaxe_race and sand_tower
// ended or cut while TNT, debris or falling sand were still moving.) Pure functions over a recording: the windows of
// "payoff motion" (a primed TNT or a falling block in the world, an explosion's smoke and debris, a death animation)
// and the tick each one settles. The harness (lib/harness.js) waits for the last one after `perform` and writes the
// marks, so an edit can end on it: `endAfter: 'settle:0.6'` ends 0.6 s after the last payoff motion has stopped (every
// consumer reads endAfter as 'event:seconds', so nothing else changes). A stunt whose payoff is a blast or a fall
// should end there: the motion lint (lib/hb/motion_lint.js) warns on one that ends on anything else.
//   marks: motion_start { kinds } / motion_settled { from, kinds } around every window, and one `settle` at the end
//   of the last window (edit.py and every other consumer read the FIRST mark of an event: there is only one `settle`)

// An explosion moves on screen as long as the RENDERER's particles do, not just the server's entities: renderer/
// particles.js gives the emitter's discs 8 + 9 ticks, the smoke 8/(r*0.8+0.2) (up to 40 + 2), the crumbs up to 40 and
// the poof clouds 16/(r*0.8+0.2)+2 (up to 84, but by 44 ticks the few left are small and slow: under 15% of the
// blast's peak motion, test/settle.test.js). 20 ticks (the old value) ended which_door and villager_fired with debris
// and puffs still flying past the death screen (~1-8% of the game view changing every frame: independent review).
const EXPLOSION_TICKS = 44
// after the settle mark the recording keeps going this long, so endAfter 'settle:0.6' (up to 'settle:2') always has
// its tail: which_door's recording stopped 0.15 s after the mark and the edit's 0.6 s got cut to 0.11 s
const SETTLE_TAIL_TICKS = 40
const DEATH_TICKS = 20       // LivingEntity.tickDeath: the 20-tick fall over and the poof
const ITEM_FAST = 0.12       // blocks/tick: an item still flying from a blast (a resting item is not motion)
const MERGE = 3              // ticks: two windows this close are one
const SETTLE_PAD = 0.6       // s after the settle that endAfter: 'settle' ends on

// rec: { entities: [[tick, id, name, x, y, z, ...]] }, timeline: [{ t (ms), event, type? }]. -> [{ from, to, kinds }]
// in ticks: `to` is the first tick with nothing moving again
function motionWindows (rec, timeline = (rec && rec.timeline) || []) {
  const active = new Map()   // tick -> Set(kinds)
  const on = (t, kind) => { if (!active.has(t)) active.set(t, new Set()); active.get(t).add(kind) }
  const last = {}
  const booms = timeline.filter(m => m.event === 'particles' && m.type === 'explosion').map(m => Math.round(m.t / 50))
  for (const b of booms) for (let k = 0; k < EXPLOSION_TICKS; k++) on(b + k, 'explosion')
  for (const m of timeline) {
    if (m.event === 'mob_death' || m.event === 'death') { const t = Math.round(m.t / 50); for (let k = 0; k < DEATH_TICKS; k++) on(t + k, 'death') }
  }
  const nearBoom = (t) => booms.some(b => t >= b && t <= b + 60)
  for (const r of (rec && rec.entities) || []) {
    const [t, id, name, x, y, z] = r
    if (name === 'falling_block') on(t, 'falling_block')
    else if (name === 'tnt' || name === 'tnt_minecart') on(t, 'tnt')
    else if (name === 'item' && nearBoom(t)) {
      const p = last[id]
      if (p && t - p[0] <= 2 && Math.hypot(x - p[1], y - p[2], z - p[3]) / Math.max(1, t - p[0]) > ITEM_FAST) on(t, 'debris')
    }
    if (name === 'item') last[id] = [t, x, y, z]
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
  if (tick - lastBoom < EXPLOSION_TICKS || tick - lastDeath < DEATH_TICKS) return true
  return ents.some(e => e && (e.name === 'falling_block' || e.name === 'tnt' || e.name === 'tnt_minecart'))
}

module.exports = { motionWindows, settleMarks, insertMarks, liveBusy, EXPLOSION_TICKS, DEATH_TICKS, SETTLE_PAD, SETTLE_TAIL_TICKS }
