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
  edit: {
    caption: 'nobody remembers who built this place', red: 'nobody',
    startAt: 'open:0', endAfter: 'slam:1.0', dropAt: 'finale',
    // the payoff: the golem comes down on the slime. The song dips 0.3 s before it, then an impact and a short shake
    sfx: [['riser', 'launch', 'slam'], ['dip', 'slam', 0.3], ['impact', 'slam']],
    flash: [['slam', 0, 0.5]],
    shake: [['slam', 0, 8]]
  }
})
