// "guess the mob from its sound 🔊" (worker 13, interactive series #1; lib/guess_sound.js has the round
// structure). Six dark rooms, the threat rising: a cow, a llama, a polar bear's warning growl, an
// enderman (its eyes glow when you turn; it screams and teleports), a warden (heartbeat, then it roars),
// and the finale: a creeper hiss in the dark... it's a parrot (vanilla parrots imitate hostile mobs:
// entity.parrot.imitate.creeper is the creeper fuse at pitch 1.8; audio.py doesn't follow sounds.json
// 'event' variants, so it's spelled out here, at full volume so it carries like the other rounds).
const guessSound = require('../lib/guess_sound')
module.exports = guessSound({
  name: 'guess_sound',
  caption: 'guess the mob from its sound 🔊',
  red: 'sound',
  endAfter: 1.75,   // the payoff ends on a text line ("parrots copy creepers"): reading time
  rounds: [
    { mob: 'cow', room: 'barn', sound: 'entity.cow.ambient', label: 'EASY', answer: 'COW', react: 'moo', leanTicks: 6, lookY: 1.2 },
    { mob: 'llama', room: 'savanna', sound: 'entity.llama.ambient', label: 'MEDIUM', answer: 'LLAMA', react: 'call', reactSound: 'entity.llama.angry', lean: 0, back: 4, lookY: 1.7, color: 'gold' },
    { mob: 'polar_bear', room: 'ice', sound: 'entity.polar_bear.warning', label: 'HARD', answer: 'POLAR BEAR', react: 'growl', torchDx: -2, lean: 0, lookY: 1.1, color: 'white' },
    { mob: 'enderman', room: 'cave', sound: 'entity.enderman.ambient', label: 'VERY HARD', answer: 'ENDERMAN', react: 'stare', cardSeconds: 1.0, lean: 0, lookY: 2.55, lookDown: -0.05, color: 'blue' },   // eyes within ~8 deg of the look: it has to see you stare
    { mob: 'warden', room: 'deep_dark', sound: 'entity.warden.heartbeat', label: 'EXPERT', answer: 'WARDEN', react: 'roar', lean: 0, lookY: 2.4, color: 'red' },
    { mob: 'parrot', room: 'jungle', sound: 'entity.creeper.primed', pitch: 1.8, volume: 1.0, label: 'IMPOSSIBLE', answer: 'PARROT??', react: 'imitate', lean: 0, hint: 'parrots copy creepers', lookY: 0.3, mobDx: 0, mobDy: 1, nbt: 'Variant:0', setup: (x, y, z) => [`/setblock ${x} ${y + 1} ${z + 2} jungle_log`, `/setblock ${x - 3} ${y + 1} ${z + 3} jungle_leaves[persistent=true]`, `/setblock ${x - 3} ${y + 2} ${z + 3} jungle_leaves[persistent=true]`, `/setblock ${x + 3} ${y + 1} ${z + 4} jungle_leaves[persistent=true]`, `/setblock ${x + 2} ${y + 1} ${z + 4} moss_block`], color: 'red' }
  ]
})
