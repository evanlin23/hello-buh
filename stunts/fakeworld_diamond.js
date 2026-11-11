// "fakeworld" #1 (lib/fakeworld.js; docs/formats.md, r:r62f46d): a survival world where every block is a diamond
// block (the seed's own hills, trees, beaches and lake beds, swapped), played straight: the trunk gives diamond, the
// ground under it is diamond, and the one block of dirt by the water is the treasure.
const fakeworld = require('../lib/fakeworld')

module.exports = fakeworld.make({
  name: 'fakeworld_diamond',
  block: 'diamond_block',
  treasure: 'dirt',
  caption: 'day 214 in the all diamond world',
  red: 'diamond',
  near: [136, 22]   // /locate from here: the river at (520, 22), the bank at (512, 62, 22)
})
