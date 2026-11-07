// "which door would you pick? 🚪" (worker 14, docs/ideas.md "New formats" #3, ~30 s): five numbered
// doors in one facade, diamonds at the back of every room. The bot opens them in turn:
//   1 a stone bridge over lava with a gap too wide to walk (dead), 2 a zombie horde (survived: it
//   slams the door, and zombies can't break doors on Normal), 3 a pressure plate under open sky
//   (anvils; survived by backing out), 4 a room of creepers (dead), 5 "the safe one", a cosy bedroom
//   whose floor is TNT under the carpet (the worst).
// Everything on camera is survival play: walking, jumping, opening doors. Mobs have their own AI.
// The traps' redstone (under the floor, never on camera) is stood in for by commands.
// lib/door_run.js plays it; lib/doors.js builds it.
const R = require('../lib/door_run')
const ROOMS = ['lava', 'zombies', 'anvils', 'creepers', 'safe']

module.exports = R.makeStunt({
  name: 'which_door',
  rooms: ROOMS,
  caption: 'which door would you pick? 🚪',
  edit: {
    caption: 'which door would you pick? 🚪', red: 'door', song: 'songs/funk_abnormal.mp3', dropAt: 'reveal',
    endAfter: 'last_death:0.9', deathScreen: true, onFire: 'lava_in:death',
    counter: { at: ROOMS.map((r, i) => ['open', i]), total: ROOMS.length },
    cards: [
      ['intro', 'PICK ONE 👀', 1.2, 'yellow'],
      ['death', 'DEAD ❌', 0.7, 'red', 0],
      ['survive', 'SURVIVED ✅', 0.9, 'green', 0],
      ['survive', 'SURVIVED ✅', 0.9, 'green', 1],
      ['death', 'DEAD ❌', 0.7, 'red', 1],
      ['safe', 'THE SAFE ONE 😇', 1.0, 'green'],
      ['death', 'THE WORST ONE 💀', 1.0, 'red', 2]
    ],
    punch: [['death', 0, 1.08], ['death', 1, 1.08], ['death', 2, 1.2]],
    flash: [['death', 2, 0.8]],
    shake: [['death', 2, 24]],
    // the blast from above, slowed (first person, the death screen covers it on the tick it lands)
    replay: { at: 'death', nth: 2, before: 1.4, after: 0.15, cam: '12.5,16,4,0,-55', speed: 0.5, label: 'REPLAY' },
    speed: [['lava_a', 'lava_dead', 2.5]]     // the burn in the lava, sped up to the death
  }
})
