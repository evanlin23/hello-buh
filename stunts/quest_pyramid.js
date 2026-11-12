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
    { kind: 'tunnel', len: 7, plug: 3, drop: 2 },
    { kind: 'parkour', jumps: [2, { gap: 2, up: 1 }, 3], lastGap: 2 },
    { kind: 'vault', approach: 6, chestStand: 2.9, after: 30 }
  ],
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
    dropAt: 'reveal',
    // the walks between the actions at 1.5x (the yaw stays on the course axis: no turn to whip), never inside a dig,
    // a press or a jump (r:r52f94c); the payoff is the vault opening up round him, then the chest
    speed: [['open:0.15', 'mine:-0.15', 1.6], ['dug_through:0.1', 'stage1:-0.1', 1.6], ['made_it:0.1', 'face:-0.1', 1.6]],
    sfx: [['pop', 'go', { gain: 0.45 }], ['whoosh', 'drop', { gain: 0.35 }],
      ['dip', 'reveal', 0.4], ['impact', 'reveal', { gain: 1.3 }], ['impact', 'payoff', { gain: 0.9 }]],
    flash: [['reveal', 0, 0.35]]
  }
})
module.exports = Q
