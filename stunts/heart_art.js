// "my gf asked what I was building 😭": a heart, placed in a scrambled order so it stays a mystery
// until it suddenly reads as a heart near the end.
module.exports = require('../lib/pixel_art')({
  name: 'heart_art',
  art: ['.KK...KK.', 'KRRK.KRRK', 'KRRRKRRRK', 'KRRRRRRRK', '.KRRRRRK.', '..KRRRK..', '...KRK...', '....K....'],
  palette: { K: 'black_wool', R: 'red_wool' },
  order: 'random',
  wall: 'white_wool',
  caption: 'my gf asked what I was building 😭',
  edit: { caption: 'my gf asked what I was building 😭', song: 'songs/payphone.mp3', dropAt: 'complete', start: 0.7, endAfter: 'complete:1.7' }
})
