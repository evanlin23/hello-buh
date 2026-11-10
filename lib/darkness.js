// The Darkness effect's pulse (LightTexture.calculateDarknessScale: max(0, cos(tickCount * PI * 0.025) * 0.45 * blend),
// a 4 s period, peaking when tickCount is a multiple of 80). tickCount is the player's age, so in a recording the
// peaks land on whatever ticks the absolute clock puts them; a story times one onto a word with a `darkness_phase`
// mark { offset? } (K.darkPeak(offset), lib/story.js): a peak on the mark's tick + offset, and every 80 ticks either
// side. The latest mark at or before t rules; before the first mark the first one does. render.js darknessAt.

// timeline -> [[mark tick, peak tick]] sorted by mark tick (empty: the absolute clock)
function phaseMarks (timeline) {
  return (timeline || []).filter(e => e && e.event === 'darkness_phase' && Number.isFinite(e.t))
    .map(e => [e.t / 50, e.t / 50 + (Number(e.offset) || 0)]).sort((a, b) => a[0] - b[0])
}

// cos(...) of the pulse at recording tick t (fractional), before the max(0, x * 0.45 * blend)
function pulse (t, marks) {
  if (!marks || !marks.length) return Math.cos(t * Math.PI * 0.025)   // the absolute clock (older recordings: unchanged)
  let peak = marks[0][1]
  for (const [k, p] of marks) { if (k <= t) peak = p; else break }
  return Math.cos((t - peak) * Math.PI * 0.025)
}

module.exports = { phaseMarks, pulse, PERIOD: 80 }
