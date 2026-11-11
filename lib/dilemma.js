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
// Beats are counted in server ticks (the recording's own clock) and the slow spans run mark to mark: beat i plays
// up to `ticks` x 50 ms of the recording at `factor` speed (0.1 = ten times slower, real in-between frames from
// scripts/render_replay.py, never blends). A beat's camera (stunt.shots[shot]) path/lookPath seconds are recording
// seconds: a 0.3 s path is a 3 s move on screen at factor 0.1.
const M = require('./movie')

// the edit.speed spans for the beats: beat<i> to the next beat's mark (the last to beats_end) at the beat's factor.
// Mark to mark, so a beat cut short (runBeats' `until`) still meets the next one exactly.
function spans (beats) {
  return beats.map((b, i) => [`beat${i}`, i < beats.length - 1 ? `beat${i + 1}` : 'beats_end', b.factor])
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
    ['whoosh', o.open || 'drop', { gain: 0.5 }],                           // sound from frame 0 (pace: by 0.3 s)
    ['whoosh', 'beat0', { gain: 0.45 }],                                   // into the frozen moment
    // a heartbeat in the middle of every slow beat (pace: nothing new for 2.5 s inside a beat read as dead)
    ...beats.map((b, i) => ['heart', `beat${i}h`, { gain: 0.9 }]),
    ['wind', o.open || 'drop', `beat${beats.length - 1}`, { gain: 0.4 }],  // the fall's air from the first frame
    // the song drops out for the landing, whose own game sound (the fall damage) is the hit: an impact boom there (1.1 s
    // tail) filled the reveal's dip, so the twist's hit didn't rise 10 dB over the NCS mix (gates v3, dilemma_mace)
    ...(o.land ? [['dip', o.land, 0.4]] : []),
    // the twist lands as a hit over the NCS bed too (gates v3 on the published mix: the song's drop lands on the reveal,
    // ducked 0.4 s before it, under a loud impact)
    ['dip', o.reveal, 0.4], ['impact', o.reveal, { gain: 1.4 }], ['ding', o.reveal, { gain: 0.5 }]
  ]
  return {
    caption: o.caption,
    ...(o.red ? { red: o.red } : {}),
    ...(o.colors ? { colors: o.colors } : {}),
    startAt: o.start,
    endAfter: `${o.reveal}:${o.endAfter || 1.5}`,
    dropAt: o.reveal,   // publish's NCS bed puts its drop on the twist
    speed: spans(beats),
    slowmo: [],   // (no windows of its own: a present slowmo key makes finish_render.sh / run.sh run the real-frame pass,
    //            which renders every speed span under 1x at 60/factor fps: scripts/render_replay.py)
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
// the tick the frozen moment starts. onTick(i, k) runs every tick (aim the eyes, nudge a prop). until(): checked every
// tick; when it's true the freeze ends there (the beats left are marked on the same tick, empty, so the spans still
// meet): end it before the outcome, so the hit plays at real speed (r1: the landing fell inside the last frozen beat).
async function runBeats (ctx, beats, onTick, { until } = {}) {
  let stop = false
  for (const [i, b] of beats.entries()) {
    ctx.mark(`beat${i}`, { shot: b.shot })
    if (stop) continue
    M.shot(ctx, b.shot)
    for (let k = 0; k < b.ticks; k++) {
      if (until && until()) { stop = true; break }
      if (k === Math.floor(b.ticks / 2)) ctx.mark(`beat${i}h`)   // the beat's middle: its heartbeat (edit sfx)
      if (onTick) onTick(i, k)
      await ctx.bot.waitForTicks(1)
    }
  }
  ctx.mark('beats_end')
}

module.exports = { spans, screenSeconds, edit, runBeats }
