// "why is he building THIS 😨": the 💀 emoji as pixel art, three times, each bigger. Eyes and nose
// first, then the skull; the last one is huge.
const pixelArt = require('../lib/pixel_art')
const MID = ['..WWWWW..', '.WWWWWWW.', 'WWWWWWWWW', 'WKKWWWKKW', 'WKKWWWKKW', 'WWWWKWWWW', '.WWWWWWW.', '..WKWKW..', '..WWWWW..']
module.exports = pixelArt({
  name: 'skull_art',
  stages: [
    { art: ['.WWW.', 'WKWKW', 'WWWWW', '.WKW.', '.WWW.'], first: 'K' },
    { art: MID, first: 'K' },
    { art: pixelArt.upscale(MID, 2), first: 'K' }
  ],
  palette: { W: 'white_concrete', K: 'black_concrete' },
  wall: 'oak_planks',
  caption: 'why is he building THIS 😨',
  edit: { caption: 'why is he building THIS 😨', song: 'songs/funk_abnormal.mp3', dropAt: 'complete', startAt: 'stage:-0.2', endAfter: 'complete:0.9' }
})
