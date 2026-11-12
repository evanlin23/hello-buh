// "dropper" #1 (lib/dropper.js; owner 2026-11-11 "Huge dropper?", r:r304cb5): a 376-block shaft from the build limit
// to the bottom of the world, its walls a cool-to-pink colour wheel rushing past, six obstacles of our own (a corner
// hole, a 2x2, a cross with four corner gaps, a 2x2 off to the side, a 3x3 window, the last 2x2), three quick fails
// cut just before the hit, then the clean run into a 1x1 of water in a red-and-white bullseye. A new episode swaps
// the walls, the layers, the attempt numbers and the landing.
const dropper = require('../lib/dropper')

module.exports = dropper.make({
  name: 'dropper_rainbow',
  caption: "I'm NEVER beating this dropper 😭",   // a reaction, not a label (owner r:r0f3da0); attempt #47 answers it
  red: 'NEVER',
  walls: ['cyan_concrete', 'light_blue_concrete', 'blue_concrete', 'purple_concrete', 'magenta_concrete', 'pink_concrete'],
  layers: [
    { depth: 50, block: 'white_concrete', holes: [[-1, -4, 1, -2]] },
    { depth: 100, block: 'yellow_concrete', holes: [[1, -2, 2, -1]] },
    { depth: 160, block: 'orange_concrete', holes: [[-4, -4, -2, -2], [2, -4, 4, -2], [-4, 2, -2, 4], [2, 2, 4, 4]], via: 1 },
    { depth: 220, block: 'lime_concrete', holes: [[2, -3, 3, -2]] },
    { depth: 280, block: 'light_blue_stained_glass', holes: [[0, -2, 2, 0]] },
    { depth: 330, block: 'red_concrete', holes: [[0, 0, 1, 1]] }
  ],
  attempts: [{ n: 1, fail: 1 }, { n: 6, fail: 3 }, { n: 19, fail: 5 }, { n: 47 }],
  landing: { block: 'water', size: 1 },
  // pillars to fall past, on the side away from every try's line (scripts/dropper_sim.js checks the clearance)
  deco: { pillars: [{ from: 58, to: 92, at: [-3, 3] }, { from: 168, to: 212, at: [-2, 2] }, { from: 228, to: 272, at: [-3, -1] }] }
})
