// "psycho" #1 (lib/psycho.js; docs/formats.md `psycho`, r:rc40696): a calm house tour, played straight. A cottage in a
// wheat field that is on fire, a front door ringed with flames, then inside a nether-brick mansion over an open lava
// lake: a living room on an island (a campfire coffee table), a kitchen of furnaces on a one-wide walkway, a bathroom
// with a lava-cauldron bath and a lavafall shower, and the bedroom: a bed on a pillar one sprint-jump across the lava.
const P = require('../lib/psycho')

module.exports = P.makeStunt({
  name: 'psycho_lava_mansion',
  caption: 'rate my cozy house 1-10',
  red: 'cozy',
  rooms: ['living_room', 'kitchen', 'bathroom'],
  finale: 'bed_anchor',
  edit: {
    startAt: 'open:0', endAfter: 'boom:1.7', deathScreen: true, dropAt: 'boom',
    // a pop on frame 1 under the fire's crackle (the audio hook); the landing on the bed gets a small punch; the payoff
    // is the anchor's blast: the song dips 0.4 s before it, then a boom, a flash, a shake, and the death screen with
    // its message ("56e was killed by [Intentional Game Design]") read for 1.7 s
    sfx: [['pop', 'open', { gain: 1.0 }],   /* r:r0f3da0: 0.35 sat 7.4 dB under the peak */ ['dip', 'boom', 0.4], ['impact', 'boom', { gain: 1.3 }]],
    punch: [['land', 0, 1.06], ['boom', 0, 1.15]],
    flash: [['boom', 0, 0.5]],
    shake: [['boom', 0, 18]]
  }
})
