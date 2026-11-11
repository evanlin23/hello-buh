// The stages format (docs/formats.md `stages`, STANDARDS r:redb7c0): a relatable arc told in 3 titled chapters
// ("1. BETRAYAL", "2. RISE", "3. REVENGE"), each fast and escalating, ending on one big payoff. The whole Short stays
// far under the reference's 85 s (about 20-30 s): each chapter is 2-4 beats, never a held moment.
//
// A stages stunt lists its chapters once and gets the edit from it:
//   const S = require('../lib/stages')
//   const CHAPTERS = [{ title: '1. BETRAYAL', color: 'red', until: 'death' }, { title: '2. RISE', color: 'blue' }, ...]
//   edit: S.edit({ chapters: CHAPTERS, caption, red, payoff: 'boom', ... })
//   perform: S.chapter(ctx, 0)   // marks ch1 (and the chapter's camera shot, if given) on the tick it starts
// The chapter title is a persistent label at the top of the game view (edit `tags`) from the chapter's mark until the
// next chapter (or its `until` mark: e.g. hide it under a death screen), with a whoosh as it comes in. The payoff gets
// the NCS drop, a 0.4 s dip, an impact (only on a busy game track: a blast), a flash and a shake, and the Short ends
// 0.6 s after the payoff's motion settles (lib/settle.js), never on a frozen hold.
const M = require('./movie')

// the chapter's mark name: ch1, ch2, ch3
const mark = (i) => `ch${i + 1}`

// The stunt's edit block. o: { chapters: [{ title, color?, until? }], caption, red?, colors?, payoff: EVENT (the
// final hit), start? ('ch1:0'), endAfter? ('settle:0.6'), impact? (true: the payoff is busy, e.g. a TNT chain),
// gameDip? (true: the game ducks before the payoff too), dip? (seconds of both ducks, 0.4),
// speed?: [[A, B, factor|'cut'], ...], sfx?: [...] (added), extra: {...} merged last }
function edit (o) {
  const ch = o.chapters
  const tags = ch.map((c, i) => [mark(i), c.until || (i + 1 < ch.length ? mark(i + 1) : null), c.title, c.color || 'white'])
  const sfx = [
    ...ch.map((c, i) => ['whoosh', mark(i), { gain: i ? 0.5 : 0.45 }]),   // each title comes in on a whoosh (the first: sound from frame 0)
    ...(o.sfx || []),
    // the payoff lands as a hit over the NCS bed (gates v3 on the published mix): the song ducks 0.4 s before it and
    // its drop lands on it; no riser over the dip
    ['dip', o.payoff, o.dip || 0.4],
    // ... and the game's own sound too (stages_friends: the settling chain's tail sat 9 dB under the payoff, the NCS mix
    // lifted it: no 10 dB hit); gameDip: false keeps it
    ...(o.gameDip !== false ? [['gamedip', o.payoff, o.dip || 0.4]] : []),
    ...(o.impact !== false ? [['impact', o.payoff, { gain: 1.2 }]] : [])
  ]
  return {
    caption: o.caption,
    ...(o.red ? { red: o.red } : {}),
    ...(o.colors ? { colors: o.colors } : {}),
    startAt: o.start || `${mark(0)}:0`,
    endAfter: o.endAfter || 'settle:0.6',
    dropAt: o.payoff,
    tags,
    sfx,
    flash: [o.payoff],
    shake: [o.payoff],
    ...(o.speed ? { speed: o.speed } : {}),
    ...(o.extra || {})
  }
}

// Mark chapter i (0-based) on this tick, and cut to its first camera shot (stunt.shots[shot]) when given.
function chapter (ctx, i, shot) {
  if (shot) M.shot(ctx, shot)
  ctx.mark(mark(i))
}

module.exports = { edit, chapter, mark }
