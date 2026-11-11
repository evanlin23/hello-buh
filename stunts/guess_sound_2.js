// "guess the mob from its sound pt 2 🔊" (worker 13, series #2; lib/guess_sound.js): a pig, a zombie,
// a spider in a mineshaft, a witch's giggle in her swamp hut, an allay (the owner's rare one; labels = how hard to guess), and the finale: a ghast's
// moan in a jungle room... it's the parrot AGAIN (parrots imitate the ghast: entity.ghast.ambient at
// pitch 1.8, volume 0.7, from sounds.json).
const guessSound = require('../lib/guess_sound')
module.exports = guessSound({
  name: 'guess_sound_2',
  endAfter: 1.45,   // ends on the hint line: reading time
  caption: 'guess the mob from its sound pt 2 🔊',
  red: 'sound',
  rounds: [
    { mob: 'pig', room: 'farm', sound: 'entity.pig.ambient', label: 'EASY', answer: 'PIG', react: 'call', leanTicks: 5, lookY: 0.8 },
    { mob: 'zombie', room: 'cave', sound: 'entity.zombie.ambient', label: 'MEDIUM', answer: 'ZOMBIE', react: 'call', lean: 0, back: 6, lookY: 1.7, color: 'green' },
    { mob: 'spider', room: 'mineshaft', sound: 'entity.spider.ambient', label: 'HARD', answer: 'SPIDER', react: 'call', lean: 0, back: 6, lookY: 0.6, color: 'red' },
    { mob: 'witch', room: 'swamp_hut', sound: 'entity.witch.ambient', label: 'VERY HARD', answer: 'WITCH', react: 'call', reactSound: 'entity.witch.celebrate', lean: 0, back: 4, lookY: 1.7, color: 'blue', cardY: 0.3 },
    { mob: 'allay', room: 'outpost', sound: 'entity.allay.ambient_without_item', label: 'EXPERT', answer: 'ALLAY', react: 'hover', reactSound: 'entity.allay.ambient_with_item', leanTicks: 8, lookY: 0.3, mobDy: 0.9, mobDz: 2.0, nbt: 'NoGravity:1b', color: 'blue', cardY: 0.3 },
    { mob: 'parrot', room: 'jungle', sound: 'entity.ghast.ambient', pitch: 1.8, volume: 0.7, label: 'IMPOSSIBLE', answer: 'THE PARROT AGAIN', react: 'imitate', lean: 0, hint: 'parrots copy ghasts', lookY: 0.3, mobDx: 0, mobDy: 1, nbt: 'Variant:0', cardY: 0.2, cardSize: 92, setup: (x, y, z) => [`/setblock ${x} ${y + 1} ${z + 2} jungle_log`], color: 'red' }
  ]
})
