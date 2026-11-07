// "guess the mob from its sound pt 3 🔊" (worker 13, series #3; lib/guess_sound.js): a chicken, a
// skeleton, a blaze breathing in a fortress room, a bat, and the finale: a creeper hiss in the dark.
// After two Shorts of "it's the parrot", this time it really is a creeper: the light ignites it
// (a real ignited creeper, normal difficulty) and it goes off. Death screen.
const guessSound = require('../lib/guess_sound')
module.exports = guessSound({
  name: 'guess_sound_3',
  caption: 'guess the mob from its sound pt 3 🔊',
  red: 'sound',
  expectDeath: true,
  endAfter: null,
  edit: { deathScreen: true, endAfter: 'death:1.6' },
  rounds: [
    { mob: 'chicken', room: 'farm', sound: 'entity.chicken.ambient', label: 'EASY', answer: 'CHICKEN', react: 'call', lookY: 0.6 },
    { mob: 'skeleton', room: 'cave', sound: 'entity.skeleton.ambient', label: 'MEDIUM', answer: 'SKELETON', react: 'call', lean: 0, back: 6, lookY: 1.7, color: 'white' },
    { mob: 'blaze', room: 'nether', sound: 'entity.blaze.ambient', label: 'HARD', answer: 'BLAZE', react: 'call', reactSound: 'entity.blaze.burn', lean: 0, back: 5, lookY: 1.5, mobDy: 0.5, nbt: 'NoGravity:1b', color: 'gold' },
    { mob: 'bat', room: 'cave', sound: 'entity.bat.ambient', label: 'EXPERT', answer: 'BAT', react: 'call', lookY: 0.4, mobDy: 1.4, nbt: 'NoGravity:1b', color: 'white' },
    // after two Shorts of parrots: the same hiss... and it's a real creeper this time
    { mob: 'creeper', room: 'jungle', sound: 'entity.creeper.primed', label: 'IMPOSSIBLE', answer: 'NOT A PARROT', react: 'boom', lean: 0, lookY: 1.3, color: 'red', cardSeconds: 1.0 }
  ]
})
