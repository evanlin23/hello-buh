// "only one door is safe 🚪" (worker 14, the which_door series, Short 3): five numbered doors,
// diamonds behind every one:
//   1 a ravager (dead), 2 a room packed with TNT (survived: no spark, no boom), 3 hoglins (dead),
//   4 an arrow corridor (survived: backed out through the volleys), 5 "the empty one": a dark, quiet
//   room. The darkness starts to pulse... the warden (the worst).
// lib/door_run.js plays it; lib/doors.js builds it.
const R = require('../lib/door_run')
const ROOMS = ['ravager', 'tnt_room', 'hoglins', 'arrows', 'warden']

module.exports = R.makeStunt({
  name: 'which_door_3',
  rooms: ROOMS,
  caption: 'only one door is safe 🚪',
  edit: {
    caption: 'only one door is safe 🚪', red: 'safe', song: 'songs/funk_abnormal.mp3', dropAt: 'reveal',
    endAfter: 'last_death:0.9', deathScreen: true,
    counter: { at: ROOMS.map((r, i) => ['open', i]), total: ROOMS.length },
    cards: [
      ['intro', 'PICK ONE 👀', 1.2, 'yellow'],
      ['death', 'DEAD ❌', 0.7, 'red', 0],
      ['just_tnt', 'NO FIRE = NO BOOM 🤷', 1.1, 'yellow'],
      ['survive', 'SURVIVED ✅', 0.9, 'green', 0],
      ['death', 'DEAD ❌', 0.7, 'red', 1],
      ['survive', 'SURVIVED ✅', 0.9, 'green', 1],
      ['safe', 'THE EMPTY ONE 🤔', 1.0, 'yellow'],
      ['death', 'THE WORST ONE 💀', 1.0, 'red', 2]
    ],
    punch: [['death', 0, 1.08], ['death', 1, 1.08], ['death', 2, 1.2]],
    flash: [['death', 2, 0.8]],
    shake: [['death', 2, 24]]
  }
})
