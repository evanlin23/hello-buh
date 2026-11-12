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
  endAfter: 1.2,   // the payoff ends on a text line ("parrots copy creepers"): reading time (owner r:r188b46: 1.2 s max; was 1.45)
  // the twist's hit under the NCS bed (pace/mixcheck: no sound hit on the final reveal): the song and the game (the
  // parrot's hiss filled the 0.3 s before it) dip, then an impact
  // and a pop with the round counter on frame 0 (pace: silent until 0.71 s)
  // the opening (owner on guess_sound at 0 s: "nothing really happens this first bit, people will scroll"; r:r0f3da0,
  // r:r4607fa): a 1.0 s flash of the twist first, the last room lit, the parrot doing its creeper hiss, BLURRED (owner
  // 2026-11-12: "we should blur the parrot at hte start slightly": a tease, not the answer), then the first round from
  // the cow's first call (owner: "kinda hard to hear the moo at the start": a start on the countdown cut the first moo,
  // and a pop sat on the second; the song ducks under every call, keySounds 'hear'). The first call drew cow/say2, a
  // vanilla variant ~30 dB quieter than the rest (review r2: -35 dB vs -12), so round 1 starts on its second, loud call
  // (the countdown opens on 2)
  // the end (owner: "is the warden sound overlapping the parrot sound? I couldnt hear the parrot"): the 'impact' is a
  // 1.1 s low boom (110 -> 40 Hz) that buried the parrot's hiss 0.3 s after the reveal, with the song's drop on top. Now
  // a short pop is the hit, the song stays ducked through the hiss and drops after it
  edit: { startAt: 'cd2:-0.1', hook: { at: 'final_reveal', before: 0, after: 1.0, blur: 7, text: 'the last one is IMPOSSIBLE 😭' },
    dropAt: 'final_reveal:0.8',
    sfx: [['dip', 'final_reveal:0.8', 1.2], ['gamedip', 'final_reveal', 0.35], ['pop', 'final_reveal', { gain: 1.6 }]] },
  rounds: [
    { mob: 'cow', room: 'barn', sound: 'entity.cow.ambient', label: 'EASY', answer: 'COW', react: 'moo', leanTicks: 6, lookY: 1.2 },
    { mob: 'llama', room: 'savanna', sound: 'entity.llama.ambient', label: 'MEDIUM', answer: 'LLAMA', react: 'call', reactSound: 'entity.llama.angry', lean: 0, back: 4, lookY: 1.7, color: 'gold' },
    { mob: 'polar_bear', room: 'ice', sound: 'entity.polar_bear.warning', label: 'HARD', answer: 'POLAR BEAR', react: 'growl', torchDx: -2, lookDown: -0.3,   /* aim higher: it rears up under the card, not into it */ lean: 0, lookY: 1.1, color: 'white' },
    { mob: 'enderman', room: 'cave', sound: 'entity.enderman.ambient', label: 'VERY HARD', answer: 'ENDERMAN', react: 'stare', cardSeconds: 0.8, hold: 0, lean: 0, lookY: 2.55, lookDown: -0.05, color: 'blue' },   // eyes within ~8 deg of the look: it has to see you stare
    { mob: 'warden', room: 'deep_dark', sound: 'entity.warden.heartbeat', label: 'EXPERT', answer: 'WARDEN', react: 'roar', lean: 0, lookY: 2.4, color: 'red' },
    { mob: 'parrot', room: 'jungle', sound: 'entity.creeper.primed', pitch: 1.8, volume: 1.0, label: 'IMPOSSIBLE', answer: 'PARROT??', react: 'imitate', lean: 0, hint: 'parrots copy creepers', lookY: 0.3, mobDx: 0, mobDy: 1, nbt: 'Variant:0', setup: (x, y, z) => [`/setblock ${x} ${y + 1} ${z + 2} jungle_log`, `/setblock ${x - 3} ${y + 1} ${z + 3} jungle_leaves[persistent=true]`, `/setblock ${x - 3} ${y + 2} ${z + 3} jungle_leaves[persistent=true]`, `/setblock ${x + 3} ${y + 1} ${z + 4} jungle_leaves[persistent=true]`, `/setblock ${x + 2} ${y + 1} ${z + 4} moss_block`], color: 'red' }
  ]
})
