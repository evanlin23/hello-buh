// Format "race" #1: grass vs mycelium (lib/race.js). Real vanilla spreading on a 64 x 64 dirt field, top-down,
// sped up (random tick speed, then a time-lapse in the edit).
const { makeRace } = require('../lib/race')

module.exports = makeRace({
  name: 'race_grass_mycelium',
  a: { block: 'grass_block', label: 'GRASS', color: 'green', sound: 'block.grass.place' },
  b: { block: 'mycelium', label: 'MYCELIUM', color: 'purple', sound: 'block.nylium.place' },
  caption: 'Grass vs Mycelium. Pick one 👇',
  red: 'Pick',
  colors: 'grass=green,mycelium=purple',
  tickSpeed: 300,
  speed: 3
})
