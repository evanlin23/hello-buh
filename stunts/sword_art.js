// "can you guess what I'm building? 🤔": a misdirect series (owner 2026-11-07, "do everything").
// Three walls, each bigger. 1: a diamond sword, built in a scrambled order (the honest guess).
// 2: it starts as the same sword, then the blade comes down with shears and it's a pickaxe.
// 3, the huge one: it starts as the sword again (the whole sword, held in frame)... and turns into a creeper face.
const pixelArt = require('../lib/pixel_art')
const SWORD = ['.......KK', '......KCK', '.....KCK.', '....KCK..', '.K.KCK...', '..KCK....', '..BK.....', '.B..K....', 'K........']   // blade, guard, handle, pommel
const PICK = ['...KKKK..', '..KCCCCK.', '...KKBCCK', '....B.KCK', '...B...KK', '..B......', '.B.......', 'B........', '.........']   // head arc top right, diagonal handle
const CREEPER = ['GLGGLGGL', 'LGLGGLLG', 'GKKLLKKG', 'LKKGGKKL', 'GLGKKGLG', 'GGKKKKLG', 'LGKKKKGL', 'GLKLLKGG']
const pad = (art, size) => {   // centre a picture on a bigger grid
  const H = art.length, W = art[0].length, top = (size - H) >> 1, left = (size - W) >> 1
  const out = []
  for (let r = 0; r < size; r++) out.push(r < top || r >= top + H ? '.'.repeat(size) : '.'.repeat(left) + art[r - top] + '.'.repeat(size - left - W))
  return out
}
module.exports = pixelArt({
  name: 'sword_art',
  stages: [
    { art: SWORD, order: 'random', patches: true },
    { art: pixelArt.upscale(PICK, 2), decoy: pixelArt.upscale(SWORD, 2), decoyFrac: 0.5, decoyTpb: 1.5, order: 'random', patches: true, tpb: 1, lapse: 2 },
    // 16 out: at 12 the 27-block face filled the view and the camera swept edge to edge (past the pickaxe wall).
    // The decoy (review 2026-11-11: "never reads as a sword", partly built at x3 with the shears starting early): the
    // whole sword at x2, then a walk back (~6 blocks) and a 0.8 s hold with all of it in frame; the x3 lapse (shears,
    // then the creeper) starts after the twist. pixel_art caps the turns at 220/x deg/s inside each lapse (r:r38374d).
    { art: pad(pixelArt.upscale(CREEPER, 3), 27), decoy: pixelArt.upscale(SWORD, 3), decoyFrac: 1, decoyTpb: 1, decoyLapse: 2, decoyBack: 28, decoyHold: 16, first: 'K', scatter: true, patches: true, tpb: 0.4, dist: 16, lapse: 3 }
  ],
  palette: { K: 'black_wool', C: 'light_blue_wool', B: 'brown_wool', G: 'green_wool', L: 'lime_wool' },
  wall: 'oak_planks',
  caption: "can you guess what I'm building? 🤔",
  edit: { caption: "can you guess what I'm building? 🤔", red: 'guess', dropAt: 'complete', startAt: 'stage:0.1', endAfter: 'complete:0.9' }
})
