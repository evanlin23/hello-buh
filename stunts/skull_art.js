// "the skull emoji irl 💀": the 💀 emoji as pixel art. Eyes and nose first, then the skull.
module.exports = require('../lib/pixel_art')({
  name: 'skull_art',
  art: ['..WWWWW..', '.WWWWWWW.', 'WWWWWWWWW', 'WKKWWWKKW', 'WKKWWWKKW', 'WWWWKWWWW', '.WWWWWWW.', '..WKWKW..', '..WWWWW..'],
  palette: { W: 'white_concrete', K: 'black_concrete' },
  first: 'K',
  wall: 'deepslate_bricks',
  caption: 'the skull emoji irl 💀',
  edit: { caption: 'the skull emoji irl 💀', song: 'songs/funk_abnormal.mp3', dropAt: 'complete', start: 0.3 }
})
