// Format "sandart" #1 (lib/sandart.js, owner r:r718ec5: "huge sand art"): a giant TNT block, 112 x 105 blocks of
// concrete powder poured from the sky. The drone sinks into the rain and glides low over red, white and black blobs
// (what is it?), then pulls straight up as the last blocks land: a TNT block the size of a village. And then it goes
// off: the whole picture blows up in one wave.
const { makeSandArt } = require('../lib/sandart')

// our own 16 x 15 TNT side: red top and bottom, the white band with TNT in black (3-4-3 letters)
const ART = [
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'WWWWWWWWWWWWWWWW',
  'WWKKKWKWWKWKKKWW',
  'WWWKWWKKWKWWKWWW',
  'WWWKWWKWKKWWKWWW',
  'WWWKWWKWWKWWKWWW',
  'WWWKWWKWWKWWKWWW',
  'WWWWWWWWWWWWWWWW',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR'
]

module.exports = makeSandArt({
  name: 'sandart_tnt',
  art: ART,
  palette: { R: 'red_concrete_powder', W: 'white_concrete_powder', K: 'black_concrete_powder' },
  scale: 7,
  caption: 'dropping 11,760 blocks from the sky. guess what it is 👀',
  red: 'guess',
  // the payoff (owner r:r4607fa, docs/noop_audit_2026-11-12.md: "the giant TNT picture explodes on the last beat"):
  // the picture reads at the top, then it IS TNT: charges hidden under it go off in a wave out from the middle and
  // blow the whole picture into a crater field (~1.2 s on the server). Two hits: the first blast (the song's drop) and
  // the last one ('settle' lands 0.3 s after the last blast: lib/settle.js), where the wave reaches the picture's
  // corners. The end 0.5 s after the settle (r:r188b46)
  // (sound: one real explode sound per 2 s (the first blast) at 0.2 and the landing patter up: the game track is
  // normalised as a whole, and take 2's 443 full-volume blasts left the pour ~40 dB under them and roared on through
  // the last blast, so it had no hit (pace); take 4 fired them all at once and the server spread them over 2.5 s)
  blast: { spacing: 5, delay: 16, wave: 16, fuse: 10, soundEvery: 40, soundVolume: 0.2 },
  soundVolume: 0.9,
  edit: {
    endAfter: 'settle:0.5',
    dropAt: 'boom',
    flash: [['boom', 0, 0.45], ['settle:-0.3', 0, 0.35]],
    punch: [['reveal', 0, 1.04], ['boom', 0, 1.1], ['settle:-0.3', 0, 1.08]],
    shake: ['boom'],
    // (no 'boom' sfx: its long tail roared on over the last blast and buried that hit: take 5; the song dips under
    // both hits, or the bed buried the last one in the final mix: mixcheck)
    sfx: [['dip', 'boom', 0.4], ['impact', 'boom', { gain: 1.3 }], ['dip', 'settle:-0.3', 0.4], ['impact', 'settle:-0.3', { gain: 1.4 }]]
  }
})
