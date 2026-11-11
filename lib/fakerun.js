// The fake-speedrun format (docs/formats.md `fakerun`, STANDARDS r:r9105ba). Owner: "obviously fake, badly made, with
// typos and everything". An impossible speedrun told in jump cuts: each split is one staged scene with a typo label,
// the run's clock counts to an absurd world record (slower than the real seconds go by: badly made on purpose), and it
// ends on a NEW WORLD RECORD card. Comment bait: every split has a deliberate wrong detail for viewers to call out.
// "Bad" means the content and the typos only: the aim, the camera, the cuts and the settle follow every house rule.
//
// A fakerun stunt lists its splits once and gets the edit from it:
//   const R = require('../lib/fakerun')
//   const LABELS = ['spawned in ful netherite', 'mined diamods (why)', ...]   (or [TEXT, SECONDS])
//   edit: R.edit({ labels: LABELS, cuts: 4, caption, red, record: 9.41, wr: ['NEW WORLD RECORD!!1', 'gold'] })
//   perform: R.go(ctx) on the first frame; R.label(ctx, i) when label i should come up; await R.jump(ctx, i, tp)
//            for jump cut i (1..cuts: a hard cut through a teleport, the camera resting on both sides);
//            R.finish(ctx) on the payoff
// Marks: go (the run's first frame), label<i>, cut<i>a / cut<i>b (jump cut i: the footage between is cut), wr (the
// payoff: the clock stops, the card, the hit).

// The edit block. o: { labels: [TEXT | [TEXT, SECONDS]], cuts: N, caption, red?, colors?, record: the clock's final seconds,
// clockLabel?, wr: [TEXT, COLOR] the payoff card, end: seconds after wr (a text payoff: 1.2-1.8 s), subsY?, extra }
function edit (o) {
  const cuts = Array.from({ length: o.cuts }, (_, i) => i + 1)
  const speed = cuts.map(i => [`cut${i}a`, `cut${i}b`, 'cut'])
  const subs = o.labels.map((l, i) => Array.isArray(l) ? [`label${i}`, l[0], l[1]] : [`label${i}`, l, 2.2])
  const wr = o.wr || ['NEW WORLD RECORD!!1', 'gold']
  const sfx = [
    ['air', 'go', 'wr', { gain: 0.45 }],                                    // room tone from frame 0 (pace: sound by 0.3 s)
    ['whoosh', 'go', { gain: 0.5 }],
    ...cuts.map(i => ['whoosh', `cut${i}b`, { gain: 0.45 }]),   // every jump cut lands on a swish
    // the payoff lands over the NCS bed (gates v3, mixcheck): the song drops out 0.4 s before it, the drop on the card,
    // an impact and a ding as the clock stops
    ['dip', 'wr', 0.4], ['impact', 'wr', { gain: 1.4 }], ['ding', 'wr', { gain: 0.5 }],
    ...(o.sfx || [])
  ]
  return {
    caption: o.caption,
    ...(o.red ? { red: o.red } : {}),
    ...(o.colors ? { colors: o.colors } : {}),
    startAt: o.start || 'go:0',
    endAfter: `wr:${o.end || 1.6}`,   // settle-ok: a text payoff (the card and the stopped clock), nothing falls or blows up
    dropAt: 'wr',
    speed,
    subs,
    subsY: o.subsY ?? 0.72,   // above the hearts row: mid-view labels covered the blaze's and 56e's heads (review r1)
    // the run's clock: counts 0 -> record over the whole run, so it visibly runs slow (part of the joke), and stops
    // green with a pop on the payoff (one attempt: no reset needed, r:r32b983)
    clock: [['go', 'wr', o.record, o.clockLabel || 'WORLD RECORD PASE']],
    cards: [['wr', wr[0], o.end || 1.6, wr[1] || 'gold']],
    flash: ['wr'],
    punch: [['wr', 0, 1.1]],
    sfx,
    ...(o.extra || {})
  }
}

// the run's first frame (the clock starts at 0 here, the Short opens here)
function go (ctx) { ctx.mark('go') }
// label i comes up here
function label (ctx, i, data = {}) { ctx.mark(`label${i}`, data) }

// The jump cut into split i: the camera rests (o.rest ticks, 3), cut<i>a, the teleport (tp: an async function that
// moves the player and sets the look), a wait until the new place has arrived and the look is still (o.after, 4
// ticks: rec_check's cuts check wants the first frames already the new shot), cut<i>b. onCut runs between the marks
// (a camera switch, a time change: they land inside the cut).
async function jump (ctx, i, tp, o = {}) {
  await ctx.bot.waitForTicks(o.rest ?? 3)
  ctx.mark(`cut${i}a`)
  await tp()
  if (o.onCut) await o.onCut()
  await ctx.bot.waitForTicks(o.after ?? 4)
  ctx.mark(`cut${i}b`)
}

function finish (ctx, data = {}) { ctx.mark('wr', data) }

module.exports = { edit, go, label, jump, finish }
