// "guess the mob from its sound 🔊" (worker 13, interactive series #1). Six dark rooms, easy to
// impossible: a cow, an enderman (its eyes glow in the dark), a warden (heartbeat; its spots pulse),
// a polar bear's warning growl, a llama (it spits at you), and the finale: a creeper hiss in the dark...
// it's a parrot (vanilla parrots imitate hostile mobs). lib/guess_sound.js has the round structure.
const guessSound = require('../lib/guess_sound')
module.exports = guessSound({
  name: 'guess_sound',
  caption: 'guess the mob from its sound 🔊',
  red: 'sound',
  rounds: [
    { mob: 'cow', room: 'barn', sound: 'entity.cow.ambient', label: 'EASY', answer: 'COW', react: 'moo', lookY: 1.2 },
    { mob: 'enderman', room: 'cave', sound: 'entity.enderman.ambient', label: 'MEDIUM', answer: 'ENDERMAN', react: 'stare', lean: 0, lookY: 2.6, color: 'blue' },
    { mob: 'warden', room: 'deep_dark', sound: 'entity.warden.heartbeat', label: 'HARD', answer: 'WARDEN', react: 'roar', lean: 0, lookY: 2.4, color: 'red' },
    { mob: 'polar_bear', room: 'ice', sound: 'entity.polar_bear.warning', label: 'VERY HARD', answer: 'POLAR BEAR', react: 'growl', lean: 0, lookY: 1.1, color: 'white' },
    { mob: 'llama', room: 'savanna', sound: 'entity.llama.ambient', label: 'EXPERT', answer: 'LLAMA', react: 'spit', lookY: 1.7, color: 'gold' },
    // the parrot imitation is entity.creeper.primed at pitch 1.8, volume 0.6 (sounds.json; audio.py
    // doesn't follow 'event' variants, so it's spelled out here)
    { mob: 'parrot', room: 'jungle', sound: 'entity.creeper.primed', pitch: 1.8, volume: 0.6, label: 'IMPOSSIBLE', answer: 'PARROT??', react: 'imitate', lookY: 0.3, lookDown: -0.05, mobDx: 0, mobDy: 1, nbt: 'Variant:0', setup: (x, y, z) => [`/setblock ${x} ${y + 1} ${z + 2} jungle_log`], color: 'red' }
  ]
})
