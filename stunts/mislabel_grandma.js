// "mislabel" #1 (lib/mislabel.js; owner 2026-11-11, r:r05c651): a parkour + dropper hook, then seven giant Minecraft
// items floating over a jungle, each with the name my grandma gives it. Clean on purpose: the whole joke is a
// sweet, confident, wrong name. A new episode only swaps the title and this list (art keys: lib/mislabel_art.json).
const mislabel = require('../lib/mislabel')

module.exports = mislabel({
  name: 'mislabel_grandma',
  title: 'Minecraft items, named by my grandma 👵',
  items: [
    { art: 'block/tnt_side', label: 'Red crayons', scale: 2 },
    { art: 'item/lava_bucket', label: 'Tomato soup', scale: 3 },
    { art: 'item/diamond', label: 'Ice cube', scale: 3 },
    { art: 'item/slime_ball', label: 'Lime jello', scale: 3 },
    { art: 'item/cake', label: 'Strawberry pizza', scale: 3 },
    { art: 'item/pufferfish', label: 'Angry lemon', scale: 4 },
    { art: 'creeper_face', label: 'Sad cucumber', scale: 8 }
  ]
})
