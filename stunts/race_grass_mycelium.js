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
  // the opening (owner r:r0f3da0): frame 0 shows both sides already spreading. The race's first 30 s of game time
  // play x8 (at x3 the spread at ~5 % read as a still photo: the opening check's motion 0.31 by 0.5 s), and the Short
  // starts at game 18 s (the start's offset counts Short seconds: 18 / 8 = 2.25), ~5 % vs 4 %, green and purple
  // eating into the dirt; a ding + a loud pop on frame 0. The end (owner r:r188b46, fast ends): 0.7 s after the win
  // The ending (owner r:r4607fa, no-op audit: ~18 s and a clear winner moment): the middle plays x4 (22.9 -> ~18 s),
  // and under the WINS stamp the margin, read off this recording's done mark (mycelium 2061 vs grass 2035 blocks: a
  // photo finish); a re-take must update it. 0.8 s on it (the fast-end rule's upper edge: two lines to read)
  edit: {
    startAt: 'race_start:2.25', endAfter: 'done:0.8',
    speed: [['race_start', 'race_start:30', 8], ['race_start:30', 'last', 4], ['last', 'done', 9]],
    subs: [['done', 'by just 26 blocks 😱', 0.8, 0]], subsY: 0.66
  },
  sfx: [['ding', 'race_start:2.26'], ['pop', 'race_start:2.27', { gain: 2.0 }]],   // (1.6 was 6.5 dB under the win's peak: max 6)
})
