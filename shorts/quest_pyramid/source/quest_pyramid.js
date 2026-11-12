// quest #1, the secret vault under the desert pyramid (family quest, lib/quest.js; owner r:r4b458d: "fake secret
// chest in desert pyramid that takes like the entire video to get to and theres like parkour and tunnels etc.").
// v2 (no-op audit 2026-11-12: "31 s of tunnels for one small chest" -> "a vault room of gold/diamond blocks; ~15 s"):
// the blue terracotta, the drop into the treasure room everyone loots, the button nobody presses, a tunnel with a dead
// end mined through, lava parkour, the creeper face whose eye is a button, and behind it a whole room of gold and
// diamond blocks with the ONE chest in the middle, opened at the very end.
// A new episode swaps the stages, the loot and the words.
const { makeQuest } = require('../lib/quest')

const CAPTION = 'bro found the SECRET vault 😱'

const Q = makeQuest({
  name: 'quest_pyramid',
  caption: CAPTION,
  red: 'SECRET',
  stages: [
    { kind: 'tunnel', len: 7, plug: 3, drop: 3 },
    { kind: 'parkour', jumps: [2, 2, 3], lastGap: 2, exitPitch: 0.2 },   // (no step up: the vault's 8-high hall needs the floor low; the eyes lift to the face off the last landing)
    { kind: 'vault', approach: 8, faceHold: 3, chestStand: 3.3, noScreen: true, after: 30 }
  ],
  roomButton: 'polished_blackstone',   // a dark button on the sandstone: "nobody presses THIS" has to show THIS (review r1)
  roomButtonSound: 'block.stone_button.click_on',
  openHold: 8,
  pressLook: true,
  loot: [
    [10, 'diamond_block', 64], [11, 'enchanted_golden_apple', 64], [12, 'netherite_block', 64], [13, 'enchanted_golden_apple', 64], [14, 'diamond_block', 64],
    [1, 'diamond', 64], [3, 'emerald_block', 64], [5, 'emerald_block', 64], [7, 'diamond', 64],
    [19, 'totem_of_undying', 1], [21, 'netherite_ingot', 64], [23, 'netherite_ingot', 64], [25, 'totem_of_undying', 1],
    [0, 'gold_block', 64], [8, 'gold_block', 64], [18, 'gold_block', 64], [26, 'gold_block', 64]
  ],
  subs: [
    ['room', 'everyone loots these 4 chests...', 1.1],
    ['press', 'but nobody presses THIS', 1.2],
    ['stage', 'lava parkour 😬', 1.1, 1],
    ['press2', 'the eye was a button', 1.0]
  ],
  edit: {
    endAfter: 'payoff:0.7',
    subsY: 0.15,   // the subtitles up top, clear of the button and the crosshair (review r1)
    dropAt: 'payoff',   // the drop on the chest (mixcheck: the payoff hit over the NCS bed); the reveal gets its own impact
    // the walks between the actions at 1.5x (the yaw stays on the course axis: no turn to whip), never inside a dig,
    // a press or a jump (r:r52f94c); the payoff is the vault opening up round him, then the chest
    startAt: 'dug:-0.45',   // frame 0: the blue terracotta already cracking under the pick (r:r0f3da0)
    speed: [['stage0', 'mine:-0.15', 1.6], ['dug_through:0.1', 'stage1:-0.1', 1.6], ['made_it:0.1', 'face:-0.1', 1.6], ['walk2', 'reveal:-0.3', 1.5]],
    // (an impact on the terracotta's break: the opening's sound hit, r:r0f3da0)
    sfx: [['impact', 'go:0.02', { gain: 1.4 }], ['impact', 'dug', { gain: 1.4 }], ['whoosh', 'drop', { gain: 0.35 }],
      ['whoosh', 'reveal:-0.15', { gain: 0.6 }], ['impact', 'reveal', { gain: 1.2 }], ['dip', 'payoff', 0.4], ['impact', 'payoff', { gain: 1.4 }]],
    flash: [['reveal', 0, 0.35], ['payoff', 0, 0.3]]
  }
})
module.exports = Q
