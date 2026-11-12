// "guess the mob from its sound pt 2 🔊" (worker 13, series #2; lib/guess_sound.js): a pig, a zombie,
// a spider in a mineshaft, a witch's giggle in her swamp hut, an allay (the owner's rare one; labels = how hard to guess), and the finale: a ghast's
// moan in a jungle room... it's the parrot AGAIN (parrots imitate the ghast: entity.ghast.ambient at
// pitch 1.8, volume 0.7, from sounds.json).
const guessSound = require('../lib/guess_sound')
module.exports = guessSound({
  name: 'guess_sound_2',
  endAfter: 1.2,   // (review r2: two text lines need 1.2 s) ends on the hint line (owner r:r188b46: the end 0.5-0.8 s after the result, 1.2 s max; 1.45 blocked)
  caption: 'guess the mob from its sound pt 2 🔊',
  red: 'sound',
  // frame 0 on the first countdown (the call already sounding, the 3-2-1 and the round's label up): it opened on 0.4 s
  // of a dark bare wall (owner r:r0f3da0: never a bare wall or a still room)
  // the opening (owner r:r4607fa / r:r0f3da0, no-op audit: open on a tease of the parrot twist, not a dark room): a
  // 1.0 s flash of the last room lit, the parrot doing its ghast impression (no label: the twist stays for the end)
  // the twist (as pt 1, owner 2026-11-12: "is the warden sound overlapping the parrot sound? I couldnt hear the
  // parrot"): no low 'impact' boom over the parrot's ghast moan; a short pop is the hit, the game dips before it, the
  // song stays ducked through the moan and drops 0.8 s after the reveal
  // songGain -6: the music under the game sounds (mixcheck, owner's 'music jumps' note: the game sat 1.8 dB UNDER the music)
  edit: { songGain: -6, startAt: 'cd3:-0.02', hook: { at: 'final_reveal', before: 0, after: 1.0, blur: 9, blurBox: [0.40, 0.32, 0.61, 0.64], text: 'the last one is IMPOSSIBLE 😭' },   // blurred on the parrot only (owner 2026-11-12: "should blur the starting", then "only blur the animal, not eveyrhting")
    dropAt: 'final_reveal:0.8',
    sfx: [['dip', 'final_reveal:0.8', 1.2], ['gamedip', 'final_reveal', 0.35], ['pop', 'final_reveal', { gain: 1.6 }]] },
  rounds: [
    { mob: 'pig', room: 'farm', sound: 'entity.pig.ambient', label: 'EASY', answer: 'PIG', react: 'call', leanTicks: 5, lookY: 0.8 },
    { mob: 'zombie', room: 'cave', sound: 'entity.zombie.ambient', label: 'MEDIUM', answer: 'ZOMBIE', react: 'call', lean: 0, back: 6, lookY: 1.7, color: 'green' },
    { mob: 'spider', room: 'mineshaft', sound: 'entity.spider.ambient', label: 'HARD', answer: 'SPIDER', react: 'call', lean: 0, back: 6, lookY: 0.6, color: 'red' },
    { mob: 'witch', room: 'swamp_hut', sound: 'entity.witch.ambient', label: 'VERY HARD', answer: 'WITCH', react: 'call', reactSound: 'entity.witch.celebrate', lean: 0, back: 4, lookY: 1.7, color: 'blue', cardY: 0.3 },
    { mob: 'allay', room: 'outpost', sound: 'entity.allay.ambient_without_item', label: 'EXPERT', answer: 'ALLAY', react: 'hover', reactSound: 'entity.allay.ambient_with_item', leanTicks: 8, lookY: 0.3, mobDy: 0.9, mobDz: 2.0, nbt: 'NoGravity:1b', color: 'blue', cardY: 0.3 },
    { mob: 'parrot', room: 'jungle', sound: 'entity.ghast.ambient', pitch: 1.8, volume: 0.7, label: 'IMPOSSIBLE', answer: 'THE PARROT AGAIN', react: 'imitate', lean: 0, hint: 'parrots copy ghasts', lookY: 0.3, mobDx: 0, mobDy: 1, nbt: 'Variant:0', cardY: 0.2, cardSize: 92, setup: (x, y, z) => [`/setblock ${x} ${y + 1} ${z + 2} jungle_log`], color: 'red' }
  ]
})
