// "my gf asked what I was building 😭": a heart, three times, each bigger, placed in a scrambled order
// so it stays a mystery until it suddenly reads as a heart. The last one is ridiculous.
const pixelArt = require('../lib/pixel_art')
const MID = ['.KK...KK.', 'KRRK.KRRK', 'KRRRKRRRK', 'KRRRRRRRK', '.KRRRRRK.', '..KRRRK..', '...KRK...', '....K....']
module.exports = pixelArt({
  name: 'heart_art',
  stages: [
    { art: ['KK.KK', 'KRKRK', '.KRK.', '..K..'], order: 'random' },
    { art: MID, order: 'random' },
    { art: pixelArt.upscale(MID, 3), order: 'random', tpb: 1 }
  ],
  palette: { K: 'black_wool', R: 'red_wool' },
  wall: 'white_wool',
  caption: 'my gf asked what I was building 😭',
  edit: { caption: 'my gf asked what I was building 😭', song: 'songs/payphone.mp3', dropAt: 'complete', startAt: 'stage:-0.2', endAfter: 'complete:0.9' }
})
