// The dilemma format (docs/formats.md `dilemma`, STANDARDS r:r9dcf73): a life-or-death choice frozen mid-moment. The
// first second is real speed (the danger, the item, the thing you'd sacrifice, and the choice in the caption), then the
// moment is stretched near-frozen over several camera angles, each showing something new, then real speed again for
// the outcome, and the twist: a vanilla mechanic that made the choice moot.
//
// A dilemma stunt lists its slow beats once and gets both halves from it:
//   const D = require('../lib/dilemma')
//   const BEATS = [{ shot: 'face', ticks: 6, factor: 0.12 }, { shot: 'dog', ticks: 6, factor: 0.12 }, ...]
//   edit: D.edit({ beats: BEATS, caption, ..., reveal: 'reveal', card: 'FEATHER FALLING IV' })
//   perform: await D.runBeats(ctx, BEATS)   // from the tick the frozen moment starts; marks beat0.. and switches shots
// Beats are counted in server ticks (the recording's own clock), so the slow-motion spans meet exactly: beat i plays
// `ticks` x 50 ms of the recording at `factor` speed (0.1 = ten times slower, real in-between frames from
// scripts/render_replay.py, never blends). A beat's camera (stunt.shots[shot]) path/lookPath seconds are recording
// seconds: a 0.3 s path is a 3 s move on screen at factor 0.1.
const M = require('./movie')

// the edit.slowmo windows for the beats: [beat<i>, 0, ticks * 0.05, factor], back to back
function slowmo (beats) {
  // (0.1 ms short: 1.75 + 0.3 is 2.0500000000000003 in floats, and timewarp.py refuses spans that overlap)
  return beats.map((b, i) => [`beat${i}`, 0, +(b.ticks * 0.05 - 0.0001).toFixed(4), b.factor])
}

// screen seconds the frozen moment lasts (for planning: keep each beat 1.5-2.8 s, so every angle shows something new
// and the tension builds without sagging)
function screenSeconds (beats) { return beats.reduce((a, b) => a + b.ticks * 0.05 / b.factor, 0) }

// The stunt's edit block. o: { beats, caption, red?, colors?, start: 'EVENT:OFF', reveal: EVENT (the twist's cut),
// endAfter?: seconds after the reveal (1.2-1.8 s for a text payoff), choices: [[TEXT, COLOR], [TEXT, COLOR]] (the two
// options, one card on each of the first two beats), card: [TEXT, COLOR] (the twist named on the reveal), land: EVENT
// (the outcome's sound hit), hardcore, armor, extra: {...} merged last }
function edit (o) {
  const beats = o.beats
  const cards = []
  for (const [i, c] of (o.choices || []).entries()) {
    if (beats[i]) cards.push([`beat${i}`, c[0], +Math.min(2.6, beats[i].ticks * 0.05 / beats[i].factor).toFixed(2), c[1] || 'yellow'])
  }
  if (o.card) cards.push([o.reveal, o.card[0], o.cardSeconds || 1.6, o.card[1] || 'blue'])
  const sfx = [
    ['whoosh', 'beat0', { gain: 0.45 }],                                   // into the frozen moment
    ['wind', 'beat0', `beat${beats.length - 1}`, { gain: 0.3 }],           // the fall's air under the slow beats
    ...(o.land ? [['dip', o.land, 0.4], ['impact', o.land, { gain: 0.8 }]] : []),   // the song drops out, then the hit
    ['dip', o.reveal, 0.15], ['ding', o.reveal, { gain: 0.5 }]
  ]
  return {
    caption: o.caption,
    ...(o.red ? { red: o.red } : {}),
    ...(o.colors ? { colors: o.colors } : {}),
    startAt: o.start,
    endAfter: `${o.reveal}:${o.endAfter || 1.5}`,
    slowmo: slowmo(beats),
    cards,
    sfx,
    ...(o.flash !== false ? { flash: [o.reveal] } : {}),
    ...(o.land ? { shake: [o.land] } : {}),
    ...(o.hardcore ? { hardcore: true } : {}),
    ...(o.armor ? { armor: o.armor } : {}),
    ...(o.extra || {})
  }
}

// Mark the beats in the recording: beat<i> and its camera shot on the tick it starts, then wait its ticks. Call it on
// the tick the frozen moment starts. onTick(i, k) runs every tick (aim the eyes, nudge a prop).
async function runBeats (ctx, beats, onTick) {
  for (const [i, b] of beats.entries()) {
    ctx.mark(`beat${i}`, { shot: b.shot })
    M.shot(ctx, b.shot)
    for (let k = 0; k < b.ticks; k++) {
      if (onTick) onTick(i, k)
      await ctx.bot.waitForTicks(1)
    }
  }
  ctx.mark('beats_end')
}

module.exports = { slowmo, screenSeconds, edit, runBeats }
