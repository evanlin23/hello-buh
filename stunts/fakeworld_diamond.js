// "fakeworld" #1 (lib/fakeworld.js; docs/formats.md, r:r62f46d): a survival world where every block is a diamond
// block (the seed's own hills, trees, beaches and lake beds, swapped), played straight: the trunk gives diamond, the
// ground under it is diamond, and the one block of dirt by the water is the treasure.
const fakeworld = require('../lib/fakeworld')

module.exports = fakeworld.make({
  name: 'fakeworld_diamond',
  block: 'diamond_block',
  treasure: 'dirt',
  caption: "bro hasn't seen dirt in 214 days 💀",
  red: 'dirt',
  near: [136, 22],   // /locate from here: the river at (520, 22), the bank at (512, 62, 22)
  // r:r188b46: after the last ground block (and the 'still' sub) the slow look round plays at x3, the turn to the
  // shore at x1.2 (it peaks at 193 deg/s: under the whip cap): 1.5 s from the break to 'wait' before
  edit: { speed: [['still:0.05', 'still:0.85', 3], ['still:0.85', 'still:1.55', 1.2]] }
})
