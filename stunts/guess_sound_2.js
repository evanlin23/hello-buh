// "guess the mob from its sound pt 2 🔊" (worker 13, series #2; lib/guess_sound.js): a pig, a slime's
// squish, a zombie, a spider in a mineshaft, a witch's giggle in her swamp hut (the threat rising), and the finale: a ghast's
// moan in a jungle room... it's the parrot AGAIN (parrots imitate the ghast: entity.ghast.ambient at
// pitch 1.8, volume 0.7, from sounds.json).
const guessSound = require('../lib/guess_sound')
module.exports = guessSound({
  name: 'guess_sound_2',
  endAfter: 1.5,   // ends on the hint line: reading time
  caption: 'guess the mob from its sound pt 2 🔊',
  red: 'sound',
  rounds: [
    { mob: 'pig', room: 'farm', sound: 'entity.pig.ambient', label: 'EASY', answer: 'PIG', react: 'call', lookY: 0.8 },
    { mob: 'slime', room: 'swamp', sound: 'entity.slime.squish', label: 'MEDIUM', answer: 'SLIME', react: 'call', reactSound: 'entity.slime.jump', lookY: 0.6, nbt: 'Size:1', color: 'green' },
    { mob: 'zombie', room: 'cave', sound: 'entity.zombie.ambient', label: 'HARD', answer: 'ZOMBIE', react: 'call', lean: 0, back: 6, lookY: 1.7, color: 'green' },
    { mob: 'spider', room: 'mineshaft', sound: 'entity.spider.ambient', label: 'VERY HARD', answer: 'SPIDER', react: 'call', lean: 0, back: 6, lookY: 0.6, color: 'red' },
    { mob: 'witch', room: 'swamp_hut', sound: 'entity.witch.ambient', label: 'EXPERT', answer: 'WITCH', react: 'call', reactSound: 'entity.witch.celebrate', lean: 0, back: 4, lookY: 1.7, color: 'blue' },
    { mob: 'parrot', room: 'jungle', sound: 'entity.ghast.ambient', pitch: 1.8, volume: 1.0, label: 'IMPOSSIBLE', answer: 'THE PARROT AGAIN', react: 'imitate', hint: 'parrots copy ghasts too', lookY: 0.3, lookDown: -0.05, mobDx: 0, mobDy: 1, nbt: 'Variant:2', setup: (x, y, z) => [`/setblock ${x} ${y + 1} ${z + 2} jungle_log`], color: 'red' }
  ]
})
