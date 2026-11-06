// "can you guess what I'm building? 🤔": a diamond sword, outline first (a mystery shape), then
// the blade and handle fill in.
module.exports = require('../lib/pixel_art')({
  name: 'sword_art',
  art: ['.......KK', '......KCK', '.....KCK.', 'K...KCK..', '.K.KCK...', '..KCK....', '..BK.....', '.BKBK....', 'K...K....'],
  palette: { K: 'black_wool', C: 'light_blue_wool', B: 'brown_wool' },
  first: 'K',
  wall: 'oak_planks',
  caption: "can you guess what I'm building? 🤔",
  edit: { caption: "can you guess what I'm building? 🤔", song: 'songs/misery.mp3', dropAt: 'complete', start: 0.3 }
})
