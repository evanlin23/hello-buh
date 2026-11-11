// quest #1, the secret chest under the desert pyramid (family quest, lib/quest.js; owner r:r4b458d: "fake secret
// chest in desert pyramid that takes like the entire video to get to and theres like parkour and tunnels etc.").
// The blue terracotta, the drop into the treasure room everyone loots, then the button nobody presses: a hidden
// door, a tunnel with a dead end mined through, parkour over lava, an arrow trap, harder parkour over lava, and the
// creeper face whose eye is a button. The ONE chest is opened only at the very end.
// A new episode swaps the stages, the loot and the words.
const { makeQuest } = require('../lib/quest')

module.exports = makeQuest({
  name: 'quest_pyramid',
  caption: 'The SECRET chest in every desert pyramid',
  red: 'SECRET',
  stages: [
    { kind: 'tunnel', len: 9, plug: 4, drop: 3 },
    { kind: 'parkour', jumps: [2, 2, 2] },
    { kind: 'arrows', n: 3, step: 3, wait: 3 },
    { kind: 'parkour', jumps: [3, { gap: 2, up: 1 }, 3, { gap: 2, up: 1 }], lastGap: 3 },
    { kind: 'vault', approach: 6 }
  ],
  loot: [
    [10, 'diamond_block', 64], [11, 'enchanted_golden_apple', 64], [12, 'netherite_block', 64], [13, 'enchanted_golden_apple', 64], [14, 'diamond_block', 64],
    [1, 'diamond', 64], [3, 'emerald_block', 64], [5, 'emerald_block', 64], [7, 'diamond', 64],
    [19, 'totem_of_undying', 1], [21, 'netherite_ingot', 64], [23, 'netherite_ingot', 64], [25, 'totem_of_undying', 1],
    [0, 'gold_block', 64], [8, 'gold_block', 64], [18, 'gold_block', 64], [26, 'gold_block', 64]
  ],
  subs: [
    ['room', 'everyone loots these 4 chests...', 1.4],
    ['press', 'but nobody presses THIS', 1.5],
    ['stage', 'LEVEL 1: the tunnel', 1.6, 0],
    ['stage', 'LEVEL 2: lava parkour', 1.6, 1],
    ['stage', 'LEVEL 3: the arrow trap', 1.6, 2],
    ['run', 'NOW', 0.7],
    ['stage', 'LEVEL 4: harder parkour', 1.6, 3],
    ['stage', 'LEVEL 5: the secret wall', 1.6, 4],
    ['press2', 'the eye was a button', 1.4]
  ]
})
