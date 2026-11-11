// "guess the mob from its sound pt 3 🔊" (worker 13, series #3; lib/guess_sound.js): a chicken, a
// sniffer (the owner's rare one), a magma cube, a skeleton, a blaze breathing in a fortress room (the threat rising), and the finale: a creeper hiss in the dark.
// After two Shorts of "it's the parrot", this time it really is a creeper: the light ignites it
// (a real ignited creeper, hard difficulty so the blast kills) and it goes off. Death screen.
const guessSound = require('../lib/guess_sound')
module.exports = guessSound({
  name: 'guess_sound_3',
  caption: 'guess the mob from its sound pt 3 🔊',
  red: 'sound',
  expectDeath: true,
  difficulty: 'hard',   // a creeper blast from 3 blocks is ~17 on normal (survivable), ~25 on hard
  endAfter: null,
  edit: { deathScreen: true, endAfter: 'settle:0.6',   // 0.6 s after the blast's rendered smoke settles (lib/settle.js; the death screen holds while it does)
     sfx: [['dip', 'death', 0.3],
    // the skeleton's and the creeper's first calls are quiet and broken, so the key-sound duck found 0.4-0.55 s windows
    // and the music still covered them (mixcheck +5.9 / +1.5 dB, need +8): the song dips from each call to cd2
    ['dip', 'cd2', 1.25, { nth: 3 }], ['dip', 'cd2', 1.25, { nth: 5 }]] },   // the song dips 0.3 s before the blast: it lands as a hit (pace), not under the drop
  // the skeleton's rattle and the creeper's low hiss sat under the music (mixcheck: -2.5 / +5.0 / +1.1 dB, need +8): louder calls
  rounds: [
    { mob: 'chicken', room: 'farm', sound: 'entity.chicken.ambient', label: 'EASY', answer: 'CHICKEN', react: 'call', leanTicks: 5, lookY: 0.6 },
    { mob: 'sniffer', room: 'moss', sound: 'entity.sniffer.idle', label: 'MEDIUM', answer: 'SNIFFER', react: 'call', reactSound: 'entity.sniffer.sniffing', lean: 0, lookY: 0.9, lookDown: 0.02, mobDz: 3.5, mobDx: 0, color: 'green' },
    { mob: 'magma_cube', room: 'basalt', sound: 'entity.magma_cube.squish', label: 'HARD', answer: 'MAGMA CUBE', react: 'call', reactSound: 'entity.magma_cube.squish', lean: 0, back: 4, lookY: 0.6, nbt: 'Size:1', color: 'orange' },
    { mob: 'skeleton', room: 'cave', sound: 'entity.skeleton.ambient', volume: 7, label: 'VERY HARD', answer: 'SKELETON', react: 'call', lean: 0, back: 6, lookY: 1.7, color: 'white', held: 'bow' },
    { mob: 'blaze', room: 'nether', sound: 'entity.blaze.ambient', label: 'EXPERT', answer: 'BLAZE', react: 'call', reactSound: 'entity.blaze.burn', lean: 0, back: 5, lookY: 1.5, mobDy: 0.5, nbt: 'NoGravity:1b', color: 'gold' },
    // (mob_griefing off: the blast breaks no blocks, so no debris still flying when the Short ends on the death: settle r:r24d99a)
    { mob: 'creeper', room: 'jungle', sound: 'entity.creeper.primed', pitch: 0.5, volume: 5, label: 'IMPOSSIBLE', answer: 'NOT A PARROT', react: 'boom', setup: () => ['/gamerule mob_griefing false'], lean: 0, lookY: 1.3, color: 'red', cardSeconds: 0.8 }   // Creeper.ignite's fuse sound is at pitch 0.5
  ]
})
