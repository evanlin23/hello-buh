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
  finale: 'bed_jump',
  edit: {
    startAt: 'open:0', endAfter: 'land:0.9', dropAt: 'land',
    // a pop on frame 1 under the fire's crackle (the audio hook); the payoff is the landing on the bed: the song dips
    // 0.4 s before it, then an impact and a punch-in
    sfx: [['pop', 'open', { gain: 0.35 }], ['dip', 'land', 0.4], ['impact', 'land']],
    punch: [['land', 0, 0.6]]
  }
})
