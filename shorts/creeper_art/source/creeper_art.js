// "rate my pixel art 1-10 😭": a creeper face, three times, each bigger: black face first (a weird
// mask on a bare wall), then the greens fill in from the outside. The last one is huge.
const pixelArt = require('../lib/pixel_art')
const MID = ['GLGGLGGL', 'LGLGGLLG', 'GKKLLKKG', 'LKKGGKKL', 'GLGKKGLG', 'GGKKKKLG', 'LGKKKKGL', 'GLKLLKGG']
module.exports = pixelArt({
  name: 'creeper_art',
  stages: [
    { art: ['LGGL', 'KGLK', 'GKKG', 'LKKG'], first: 'K' },
    { art: MID, first: 'K' },
    { art: pixelArt.upscale(MID, 2), first: 'K', tpb: 1.4 }
  ],
  palette: { G: 'green_concrete', L: 'lime_concrete', K: 'black_concrete' },
  wall: 'smooth_stone',
  caption: 'rate my pixel art 1-10 😭',
  edit: { caption: 'rate my pixel art 1-10 😭', song: 'songs/misery.mp3', dropAt: 'complete', startAt: 'stage:-0.2', endAfter: 'complete:0.9' }
})
