// "which door would you survive? 🚪" (worker 14, the which_door series, Short 2): five numbered
// doors, diamonds behind every one:
//   1 no floor, a 25-block drop (dead), 2 endermen (survived: eyes on the floor the whole way),
//   3 big magma cubes (dead), 4 a dripstone cave whose stalactites drop (survived: backed out),
//   5 "the safe one": a cosy room with a cat, its trapdoor floor over a pit of lava (the worst).
// lib/door_run.js plays it; lib/doors.js builds it.
const R = require('../lib/door_run')
const ROOMS = ['drop', 'endermen', 'magma', 'dripstone', 'trapdoor']

module.exports = R.makeStunt({
  name: 'which_door_2',
  rooms: ROOMS,
  caption: 'which door would you survive? 🚪',
  edit: {
    caption: 'which door would you survive? 🚪', red: 'survive', song: 'songs/funk_abnormal.mp3', dropAt: 'reveal',
    endAfter: 'last_death:0.9', deathScreen: true, onFire: 'lava_in:death',
    counter: { at: ROOMS.map((r, i) => ['open', i]), total: ROOMS.length },
    cards: [
      ['intro', 'PICK ONE 👀', 1.2, 'yellow'],
      ['death', 'DEAD ❌', 0.7, 'red', 0],
      ['dontlook', "DON'T LOOK UP 😶", 1.0, 'yellow'],
      ['survive', 'SURVIVED ✅', 0.9, 'green', 0],
      ['death', 'DEAD ❌', 0.7, 'red', 1],
      ['survive', 'SURVIVED ✅', 0.9, 'green', 1],
      ['safe', 'THE SAFE ONE 😇', 1.0, 'green'],
      ['death', 'THE WORST ONE 💀', 1.0, 'red', 2]
    ],
    punch: [['death', 0, 1.08], ['death', 1, 1.08], ['death', 2, 1.2]],
    flash: [['death', 2, 0.8]],
    shake: [['death', 2, 24]],
    speed: [['fall_a', 'fall_dead', 2.0]]     // the long fall down the shaft
  }
})
