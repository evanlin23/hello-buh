// "which door would you pick? 🚪" (worker 14, docs/ideas.md "New formats" #3, ~30 s): five numbered
// doors in one facade, diamonds at the back of every room. The bot opens them in turn:
//   1 a stone bridge over lava with a gap too wide to walk (dead), 2 a zombie horde (survived: it
//   slams the door, and zombies can't break doors on Normal), 3 a corridor of dispensers: a plate sets
//   them off (survived by backing out through the arrows), 4 a room of creepers (dead), 5 "the safe one", a cosy bedroom
//   whose floor is TNT under the carpet (the worst).
// Everything on camera is survival play: walking, jumping, opening doors. Mobs have their own AI.
// The traps' redstone (under the floor, never on camera) is stood in for by commands.
// lib/door_run.js plays it; lib/doors.js builds it.
const R = require('../lib/door_run')
const ROOMS = ['lava', 'zombies', 'arrows', 'creepers', 'safe']

module.exports = R.makeStunt({
  name: 'which_door',
  rooms: ROOMS,
  caption: 'which door would you pick? 🚪',
  edit: {
    caption: 'which door would you pick? 🚪', red: 'door', dropAt: 'reveal',
    // ends 0.6 s after the last blast's debris settles (lib/settle.js: the recording runs until it does): owner
    // r:r24d99a, never end while the payoff is moving (independent review)
    // (settle:-0.15: the settle waits out the renderer's smoke conservatively, 2.2 s; on this take the last debris lands
    // ~1.45 s after the second wave, and settle:0.6 held a frozen death screen 1.25 s: independent review 2026-11-11.
    // pace's last-0.6 s check still sees a still ending)
    // r:r188b46: settle:-0.45, the death screen ~1.4 s after the second wave (was 1.7; on a re-record: settle:0.5)
    endAfter: 'settle:-0.45', deathScreen: true, onFire: 'lava_in:death',
    counter: { at: ROOMS.map((r, i) => ['open', i]), total: ROOMS.length },
    cards: [
      ['intro', 'PICK A DOOR', 1.8, 'yellow'],   // (no 👇: it sat over door 5 and read as a hint)
      ['death', 'DEAD ❌', 0.7, 'red', 0],
      ['survive', 'SURVIVED ✅', 0.6, 'green', 0],
      ['survive', 'SURVIVED ✅', 0.6, 'green', 1],
      ['death', 'DEAD ❌', 0.7, 'red', 1],
      ['safe', 'THE SAFE ONE 😇', 1.0, 'green'],
      ['death', 'THE WORST ONE 💀', 1.0, 'red', 2]
    ],
    // the payoff pace times is the TNT floor's second wave (big_blast), 0.6 s after his death: the flash and a punch there too
    punch: [['death', 0, 1.08], ['death', 1, 1.08], ['death', 2, 1.2], ['big_blast', 0, 1.15]],
    flash: [['death', 2, 0.6], ['big_blast', 0, 0.8]],
    shake: [['death', 2, 24]],
    // the burn in the lava, sped up to the death; its middle 1.3 s cut (lint: nobody moves 12.4-13.6 s)
    speed: [['lava_a', 'lava_a:0.55', 2.5], ['lava_a:0.55', 'lava_a:1.85', 'cut'], ['lava_a:1.85', 'lava_dead', 2.5],
      // r:r188b46: after the first respawn, the still hold at x2 and the turn to door 2 at x1.4 (162 deg/s: under the
      // whip cap): 1.3 s from the death to the next thing before
      ['respawn:0.05', 'respawn:0.5', 2], ['respawn:0.5', 'respawn:0.85', 1.4]],
    // pace: a hit on the payoff (the last death): the song dips 0.3 s before it, then an impact
    // and a whoosh + pop on the opening card and a pop on every card/counter (the hook: game sound starts with quiet steps)
    sfx: [['whoosh', 'intro'], ['pops'], ['dip', 'last_death', 0.3], ['impact', 'last_death'],
      // the payoff pace times (big_blast): with audio.py's vanilla clamp (5530388b) the blasts before it sit ~28 dB higher
      // and flattened its hit in the NCS mix, so the song and the game duck 0.35 s before it (as pickaxe_race's lastboom)
      ['dip', 'big_blast', 0.35], ['gamedip', 'big_blast', 0.35]]
  }
})
