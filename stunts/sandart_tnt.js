// Format "sandart" #1 (lib/sandart.js, owner r:r718ec5: "huge sand art"): a giant TNT block, 112 x 105 blocks of
// concrete powder poured from the sky. The drone sinks into the rain and glides low over red, white and black blobs
// (what is it?), then pulls straight up as the last blocks land: a TNT block the size of a village.
const { makeSandArt } = require('../lib/sandart')

// our own 16 x 15 TNT side: red top and bottom, the white band with TNT in black (3-4-3 letters)
const ART = [
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'WWWWWWWWWWWWWWWW',
  'WWKKKWKWWKWKKKWW',
  'WWWKWWKKWKWWKWWW',
  'WWWKWWKWKKWWKWWW',
  'WWWKWWKWWKWWKWWW',
  'WWWKWWKWWKWWKWWW',
  'WWWWWWWWWWWWWWWW',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR'
]

module.exports = makeSandArt({
  name: 'sandart_tnt',
  art: ART,
  palette: { R: 'red_concrete_powder', W: 'white_concrete_powder', K: 'black_concrete_powder' },
  scale: 7,
  caption: 'dropping 11,760 blocks from the sky. guess what it is 👀',
  red: 'guess'
})
