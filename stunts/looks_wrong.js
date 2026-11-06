// "Bro this looks wrong?" (SunuCellyClipss 8.9M): three walls, three sizes. Black features first
// (floating dots and a line), then yellow from the outside in: a smiley each time, the last one huge.
const pixelArt = require('../lib/pixel_art')
const MID = ['..YYYYY..', '.YYYYYYY.', 'YYBYYYBYY', 'YYBYYYBYY', 'YYYYYYYYY', 'YBYYYYYBY', 'YYBBBBBYY', '.YYYYYYY.', '..YYYYY..']
module.exports = pixelArt({
  name: 'looks_wrong',
  stages: [
    { art: ['.YYY.', 'YBYBY', 'YYYYY', 'BYYYB', '.BBB.'], first: 'B', scatter: true },
    { art: MID, first: 'B', scatter: true },
    { art: pixelArt.upscale(MID, 2), first: 'B', scatter: true }
  ],
  palette: { Y: 'yellow_wool', B: 'black_wool' },
  caption: 'Bro this looks wrong?',
  edit: { caption: 'Bro this looks wrong?', song: 'songs/funk_abnormal.mp3', dropAt: 'complete', startAt: 'stage:-0.2', endAfter: 'complete:0.9' }
})
