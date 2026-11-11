// "dropper" #1 (lib/dropper.js; owner 2026-11-11 "Huge dropper?", r:r304cb5): a 376-block shaft from the build limit
// to the bottom of the world, its walls a cool-to-pink colour wheel rushing past, six obstacles of our own (a corner
// hole, a 2x2, a cross with four corner gaps, a 2x2 off to the side, a 3x3 window, the last 2x2), three quick fails
// cut just before the hit, then the clean run into a 1x1 of water in a red-and-white bullseye. A new episode swaps
// the walls, the layers, the attempt numbers and the landing.
const dropper = require('../lib/dropper')

module.exports = dropper.make({
  name: 'dropper_rainbow',
  caption: 'the tallest dropper in Minecraft 😳',
  red: 'tallest',
  walls: ['cyan_concrete', 'light_blue_concrete', 'blue_concrete', 'purple_concrete', 'magenta_concrete', 'pink_concrete'],
  layers: [
    { depth: 50, block: 'black_concrete', holes: [[-1, -4, 1, -2]] },
    { depth: 100, block: 'white_concrete', holes: [[1, -2, 2, -1]] },
    { depth: 160, block: 'orange_concrete', holes: [[-4, -4, -2, -2], [2, -4, 4, -2], [-4, 2, -2, 4], [2, 2, 4, 4]], via: 1 },
    { depth: 220, block: 'black_concrete', holes: [[2, -3, 3, -2]] },
    { depth: 280, block: 'white_concrete', holes: [[0, -2, 2, 0]] },
    { depth: 330, block: 'lime_concrete', holes: [[0, 0, 1, 1]] }
  ],
  attempts: [{ n: 1, fail: 1 }, { n: 6, fail: 3 }, { n: 19, fail: 5 }, { n: 47 }],
  landing: { block: 'water', size: 1 }
})
