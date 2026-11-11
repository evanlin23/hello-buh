// "cells" #1 (docs/formats.md `cells`): a slow walk down a clean lab corridor of glass cells, each holding a mob
// stuck in a vanilla contraption doing one thing forever: a cow shoved back and forth by two pistons, a chicken
// pelted with eggs by a dispenser (its chicks in there with it), a sheep in a one-block pen beside a shears dispenser
// and its wall of wool, a villager on a one-block piston lift, a husk pelted by a snow golem on a ledge, a pig on a
// slime launcher bonking the ceiling, and at the end an iron golem on a slime launcher in a glass tube 14 high.
// lib/cells.js builds and plays it; a new episode swaps the list.
const C = require('../lib/cells')

module.exports = C.makeStunt({
  name: 'cells_lab',
  caption: 'nobody remembers who built this place',
  cells: ['cow_pingpong', 'chicken_eggs', 'sheep_shears', 'villager_squats', 'husk_snowballs', 'pig_launcher'],
  finale: 'golem_launcher',
  openHall: true,   // owner 2026-11-11 (r:r52f94c note, @5.8 s): "the opening should look down the hallway, then go to the first."
  edit: {
    caption: 'nobody remembers who built this place', red: 'nobody',
    startAt: 'open:0.1', endAfter: 'slam:1.0', dropAt: 'slam',   // (startAt: the walk already under way on frame 0, r:r0f3da0) the song's drop lands with the slam (on 'finale' it hit 1.7 s early and buried the payoff under the bed)
    // the payoff: the golem comes down on the slime. The song dips 0.4 s before it (no riser: it filled the dip and the
    // slam rose only 5 dB over the NCS bed, pace on the package), then an impact and a short shake
    // (an impact on frame 0, the walk's first step: the opening's sound hit, r:r0f3da0)
    sfx: [['impact', 'open:0.12', { gain: 0.8 }], ['dip', 'slam', 0.4], ['impact', 'slam', { gain: 1.4 }]],
    flash: [['slam', 0, 0.5]],
    shake: [['slam', 0, 8]]
  }
})
