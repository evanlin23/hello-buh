// "lucky" #1 (lib/lucky.js; docs/formats.md, r:r934ea4): one dig straight down where every block is luckier than the
// last (one-block floors between beats: the dig-down rhythm never runs 3 drops in a row). Three blocks under the grass: a diamond vein. Under that the floor gives way over a lava lake: a water bucket
// mid-fall, the lake round it turns to obsidian, the bucket back. Then an emerald vein. Then the floor gives way into a
// stronghold's end portal room with 11 eyes already in, and the one eye in the hotbar opens it.
const lucky = require('../lib/lucky')

module.exports = lucky.make({
  name: 'lucky_dig',
  caption: 'luckiest dig in Minecraft history 🍀',
  red: 'luckiest',
  layers: [
    { kind: 'ore', block: 'diamond_ore', depth: 1, mine: ['n', 'e', 's'], sub: 'DIAMONDS??' },
    { kind: 'lava', sub: 'LAVA', saved: 'water bucket', subDur: 0.7 },
    { kind: 'gap', n: 1 },
    { kind: 'ore', block: 'emerald_ore', depth: 1, mine: ['w', 's', 'e', 'n'], sub: 'EMERALDS?!' },
    { kind: 'portal', sub: 'a STRONGHOLD??', eyes: '11 EYES ALREADY IN?!', subDur: 1.0 }
  ]
})
