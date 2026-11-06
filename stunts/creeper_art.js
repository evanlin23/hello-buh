// "rate my pixel art 1-10 😭": a creeper face. Black face first (it reads as a weird mask on a
// bare wall), then the greens fill in from the outside.
module.exports = require('../lib/pixel_art')({
  name: 'creeper_art',
  art: ['GLGGLGGL', 'LGLGGLLG', 'GKKLLKKG', 'LKKGGKKL', 'GLGKKGLG', 'GGKKKKLG', 'LGKKKKGL', 'GLKLLKGG'],
  palette: { G: 'green_concrete', L: 'lime_concrete', K: 'black_concrete' },
  first: 'K',
  wall: 'smooth_stone',
  caption: 'rate my pixel art 1-10 😭',
  edit: { caption: 'rate my pixel art 1-10 😭', song: 'songs/misery.mp3', dropAt: 'complete', start: 0.3, endAfter: 'complete:1.0' }
})
