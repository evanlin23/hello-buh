// "cells" #1 (docs/formats.md `cells`): a walk down a clean lab corridor of glass cells, each holding a mob stuck in a
// vanilla contraption doing one thing forever: a cow shoved back and forth by two pistons, a chicken pelted with eggs
// by a dispenser (its chick in there with it), a pig on a slime launcher bonking its ceiling, and at the end an iron
// golem on a slime launcher in a glass tube 14 high. The twist (no-op audit 2026-11-12, r:r4607fa): the walk ends on a
// slime pad in the floor just like the golem's, and it launches YOU with it: you're the next cell.
// lib/cells.js builds and plays it; a new episode swaps the list.
const C = require('../lib/cells')

const CAP = 'nobody remembers who built this place'

module.exports = C.makeStunt({
  name: 'cells_lab',
  caption: CAP,
  cells: ['cow_pingpong', 'chicken_eggs', 'pig_launcher'],
  holds: [30, 30, 40],   // each cell's thing reads once or twice, then a hard cut to the next (r:r188b46)
  finale: 'golem_launcher',
  selfLaunch: true,
  openHall: true,   // owner 2026-11-11 (r:r52f94c note, @5.8 s): "the opening should look down the hallway, then go to the first."
  edit: {
    caption: CAP, red: 'nobody',
    startAt: 'open:0.1', endAfter: 'selfland:1.3', dropAt: 'selflaunch',
    // the walks between cells: hard cuts from the camera at rest on one cell to the camera at rest on the next
    speed: [['cellout0', 'cellin1', 'cut'], ['cellout1', 'cellin2', 'cut'], ['cellout2', 'finale', 'cut']],
    subs: [['cell', 'cell 1', 1.4, 0], ['cell', 'cell 2', 1.4, 1], ['cell', 'cell 3', 1.8, 2], ['finale', 'cell 4', 1.6],
      ['padlook', 'cell 5...?', 1.0]],
    // the floor launches you (an impact, a flash, the drop), and the payoff lands with you back on the pad: the card,
    // a dip in the song and a hit (mixcheck), a short shake
    cards: [['selfland', 'CELL 5: YOU', 1.4, 'red']],
    // (an impact on frame 0, the walk's first step: the opening's sound hit, r:r0f3da0)
    sfx: [['impact', 'open:0.12', { gain: 0.8 }], ['impact', 'selflaunch', { gain: 1.1 }], ['dip', 'selfland', 0.4], ['impact', 'selfland', { gain: 1.4 }]],
    flash: [['selflaunch', 0, 0.3], ['selfland', 0, 0.4]], punch: [['selfland', 0, 1.08]],
    shake: [['selflaunch', 0, 6], ['selfland', 0, 8]]
  }
})
