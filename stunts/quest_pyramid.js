// quest #1, the secret vault under the desert pyramid (family quest, lib/quest.js; owner r:r4b458d: "fake secret
// chest in desert pyramid that takes like the entire video to get to and theres like parkour and tunnels etc.").
// v2 (no-op audit 2026-11-12: "31 s of tunnels for one small chest" -> "a vault room of gold/diamond blocks; ~15 s"):
// the blue terracotta, the drop into the treasure room everyone loots, the button nobody presses, a tunnel with a dead
// end mined through, lava parkour, the creeper face whose eye is a button, and behind it a whole room of gold and
// diamond blocks (v3: the Short ends on the step into it).
// A new episode swaps the stages, the loot and the words.
const { makeQuest } = require('../lib/quest')

const CAPTION = 'bro found the SECRET vault 😱'

const Q = makeQuest({
  name: 'quest_pyramid',
  caption: CAPTION,
  red: 'SECRET',
  // v3 (owner 2026-11-12, r:rf557af: "this can be longer... text indications for like tunnel etc. and we should hav
  // emore steps"; "end sooner as soon as you walk into the room"): five stages, each named as it starts, and the Short
  // ends on the step into the vault. The course steps down so the vault's 8-high hall fits under the desert.
  stages: [
    { kind: 'tunnel', len: 7, plug: 3, drop: 2 },
    { kind: 'parkour', jumps: [2, 2, { gap: 2, up: 1 }], lastGap: 2 },
    { kind: 'arrows', n: 3, step: 3, wait: 3, hold: 8 },
    { kind: 'tunnel', len: 9, plug: 4, drop: 4 },
    { kind: 'parkour', jumps: [3, { gap: 2, up: 1 }, 3, { gap: 2, up: 1 }], lastGap: 3, exitPitch: 0.2 },
    { kind: 'vault', approach: 8, faceHold: 3, inside: 4.0, revealAt: 0.7, endAtReveal: true }   // reveal: the first full view of the room, from the passage's inner end
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
    ['stage', 'LEVEL 1: the tunnel', 1.1, 0],
    ['stage', 'LEVEL 2: the lava', 1.1, 1],
    ['stage', 'LEVEL 3: the arrow trap', 1.2, 2],
    ['stage', 'LEVEL 4: deeper tunnel', 1.1, 3],
    ['stage', 'LEVEL 5: harder lava', 1.1, 4],
    ['stage', 'LEVEL 6: the secret wall', 1.2, 5],
    ['press2', 'the eye was a button', 1.0]
  ],
  edit: {
    endAfter: 'reveal:0.7',   // the end on the step in, the room filling the view (owner r:rf557af)
    subsY: 0.15,   // the subtitles up top, clear of the button and the crosshair (review r1)
    dropAt: 'reveal',   // the drop, a dip and an impact on the step into the vault (mixcheck: the payoff hit over the NCS bed)
    startAt: 'dug:-0.45',   // frame 0: the blue terracotta already cracking under the pick (r:r0f3da0)
    // the walks between the actions at 1.6x (the yaw stays on the course axis: no turn to whip), never inside a dig, a
    // press, a jump or the arrow volleys (r:r52f94c); each span starts after a turn (the walk into the tunnel turns)
    speed: [['stage0', 'mine_s0:-0.15', 1.6], ['dug_s0:0.1', 'stage1:-0.1', 1.6], ['made_it_s1:0.1', 'stage2:-0.1', 1.6],
      ['safe:0.1', 'mine_s3:-0.15', 1.6], ['dug_s3:0.1', 'stage4:-0.1', 1.6], ['made_it_s4:0.1', 'face:-0.1', 1.6], ['walk2', 'reveal:-0.3', 1.5]],
    // (an impact on frame 0 and on the terracotta's break: the opening's sound hit, r:r0f3da0)
    sfx: [['impact', 'go:0.02', { gain: 1.4 }], ['impact', 'dug', { gain: 1.0 }], ['whoosh', 'drop', { gain: 0.35 }],
      ['whoosh', 'reveal:-0.15', { gain: 0.6 }], ['dip', 'reveal', 0.4], ['impact', 'reveal', { gain: 1.4 }]],
    flash: [['reveal', 0, 0.35]]
  }
})
module.exports = Q
