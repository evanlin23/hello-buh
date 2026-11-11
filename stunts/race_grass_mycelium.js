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
  tickSpeed: 270,   // 300 ran 85-97 s of game time; one take came out at 29 s on screen
  speed: 3,
  // the opening (owner r:r0f3da0): frame 0 shows both sides already spreading. The first 18 s of game time (6 s on
  // screen: 0.7 % vs 0.7 %, a still brown square) are cut: the start's offset counts Short seconds (after the x3
  // lapse), so 6.0 is game 18 s, ~5 % vs 4 %, green and purple both visibly eating into the dirt; a pop on frame 0.
  // The end (owner r:r188b46, fast ends): 0.7 s after the win (the WINS card stamps in on it)
  edit: { startAt: 'race_start:6.0', endAfter: 'done:0.7' },
  sfx: [['pop', 'race_start:6.02', { gain: 0.9 }]],
})
