// "can you guess what I'm building? 🤔": a diamond sword, three times, each bigger, placed in a
// scrambled order so each one is a mystery shape until it suddenly reads. The last one is huge.
const pixelArt = require('../lib/pixel_art')
const MID = ['.......KK', '......KCK', '.....KCK.', '....KCK..', '.K.KCK...', '..KCK....', '..BK.....', '.B..K....', 'K........']   // blade, guard, handle, pommel
module.exports = pixelArt({
  name: 'sword_art',
  stages: [
    { art: MID, order: 'random' },
    { art: pixelArt.upscale(MID, 2), order: 'random', tpb: 1.5 },
    { art: pixelArt.upscale(MID, 3), order: 'random', tpb: 1.4 }
  ],
  palette: { K: 'black_wool', C: 'light_blue_wool', B: 'brown_wool' },
  wall: 'oak_planks',
  caption: "can you guess what I'm building? 🤔",
  edit: { caption: "can you guess what I'm building? 🤔", song: 'songs/misery.mp3', dropAt: 'complete', startAt: 'stage:-0.2', endAfter: 'complete:0.9' }
})
