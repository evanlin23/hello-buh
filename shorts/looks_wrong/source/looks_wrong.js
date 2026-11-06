// "Bro this looks wrong?" (SunuCellyClipss 8.9M): black features first (floating dots and a line),
// then yellow from the outside in - it turns out to be a smiley.
module.exports = require('../lib/pixel_art')({
  name: 'looks_wrong',
  art: ['..YYYYY..', '.YYYYYYY.', 'YYBYYYBYY', 'YYBYYYBYY', 'YYYYYYYYY', 'YBYYYYYBY', 'YYBBBBBYY', '.YYYYYYY.', '..YYYYY..'],
  palette: { Y: 'yellow_wool', B: 'black_wool' },
  first: 'B',
  caption: 'Bro this looks wrong?',
  edit: { caption: 'Bro this looks wrong?', song: 'songs/funk_abnormal.mp3', dropAt: 'complete', start: 0.3, endAfter: 'complete:0.9' }
})
