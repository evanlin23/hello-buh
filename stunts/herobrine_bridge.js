// herobrine #1, the bridge fight (family herobrine, lib/herobrine.js; owner r:r047388 "secret herobrine").
// A bridge fight over the void with a player in the default Steve skin. Every hit fails to register, he freezes
// mid-step and rubber-bands back and forth like a bad connection; 56e complains in chat. 56e shears the bridge out
// from under him: he doesn't fall, he stands on nothing. He turns away to look down into the void, turns back with
// white eyes and lunges into our face (a lag snap, the view pushing in until his white-eyed face fills the frame, a
// sting), and while it fills the screen he is gone: "Herobrine left the game" (no-op audit r:r4607fa: the reveal
// needed a push-in to a full-frame face with a sting; it was a small figure drifting off).
// Times are from 'go' (the first hit). Local frame: lib/herobrine.js (we at z 0.5 facing +z, he comes from +z).
const { makeStunt } = require('../lib/herobrine')

const SUBS = [
  ['air', "why isn't he falling", 1.6, 0]
]

module.exports = makeStunt({
  name: 'herobrine_bridge',
  caption: "this guy's ping is actually unplayable",
  red: 'unplayable',
  subs: SUBS,
  hotbar: ['stone_sword', 'shears', ['blue_wool', 48], ['golden_apple', 3]],
  select: 0,
  pitch: 8,
  // the push-in: from the reveal (his lunge) to the logout the view narrows 1.6x onto his face (render.js fovZoom:
  // eases in 0.4 s, back out 0.25 s after he is gone, onto the empty bridge and the chat line)
  fovZoom: [['reveal', 'payoff', 1.6]],
  edit: {
    subsY: 0.12,    // up in the sky: at mid view the sub sat on his feet over the gap (independent review round 1)
    chatScale: 5,   // 'Herobrine left the game' is the punchline: readable on a phone
    punch: [['payoff', 0, 1.06]],   // no crop punch on the reveal: the fovZoom push-in is the move there (a crop would blur it)
    // the sting on the reveal (his lunge into our face: a short punchy hit; a boom's long tail masked the payoff's impact), then the logout: silent in vanilla, so an impact with the
    // cave ambience ducked under it (mixcheck)
    sfx: [['hit', 'reveal', { gain: 1.0 }], ['gamedip', 'payoff', 0.4], ['impact', 'payoff', { gain: 1.4 }]] },
  hisStart: { x: 0.5, y: 1, z: 4.6, yaw: 180, pitch: 4 },

  async perform (ctx, H) {
    const { bot } = ctx
    const hb = H.hb
    // he is already walking at us, wool in hand (he was bridging over)
    await H.walk({ z: 3.6 }, 5)
    ctx.mark('go')
    // hit 1: no knockback, no red flash; he stops dead mid-step
    await H.hit()
    await H.freeze(9)
    await H.snap({ z: 2.5 })            // ...and catches up all at once
    await H.walk({ z: 2.4 }, 4)
    H.swing()
    await H.hold(4)
    // hit 2: he rubber-bands back to where he was, and stands there
    await H.hit()
    await H.snap({ z: 3.8 })
    await H.freeze(8)
    // he walks in again, swinging at nothing
    await H.walk({ z: 2.7 }, 10)
    H.swing()
    await H.hold(3)
    // hit 3: frozen again, his arm still swinging (only the swing packets get through)
    await H.hit()
    ctx.mark('complain')
    H.chat('bro ur lagging so bad')
    for (let k = 0; k < 3; k++) { H.swing(); await H.freeze(5) }
    // stutter: back, stop, forward, half off the bridge's edge, stop
    await H.snap({ z: 3.9 })
    await H.freeze(6)
    await H.snap({ z: 3.0, x: 0.2 })
    await H.freeze(4)
    await H.snap({ z: 3.5, x: 0.85 })
    await H.freeze(6)
    // 56e gives up hitting: shears, and the bridge out from under him (the block between us, then his)
    ctx.select(1)
    ctx.mark('shears')
    await H.A.turnTo(H.at(0.5, 0.6, 2.5), { max: 12 })
    await H.breakBlock([0, 0, 2])
    await H.hold(4)
    await H.breakBlock([0, 0, 3])
    ctx.mark('air')
    // one more lag snap, into the middle of the 2-block gap: air in front of him and behind him
    await H.hold(4)
    await H.snap({ z: 3.0, x: 0.5 })
    // he doesn't fall. The look up from the gap to his face
    await H.A.turnTo(H.at(hb.x, 1.0, hb.z), { max: 14, hold: 2 })
    await H.A.turnTo(H.at(hb.x, 2.4, hb.z), { max: 16, hold: 4 })
    // he turns his back to us and looks down into the void (the eyes change while his face is away)
    await H.turn(0, 14, 50)
    H.whiteEyes()
    await H.hold(10)
    // ...and turns back, slowly, staring
    await H.turn(180, 18, -6)
    // the reveal: a lag snap straight into our face (1.5 blocks: still a rubber band), level with our eyes, as the view
    // pushes in (fovZoom) until the white eyes fill the frame; a steady hand for the push-in
    H.K.sway = 0
    ctx.mark('reveal')
    ctx.sound('ambient.cave', 1, 1)
    await H.snap({ x: 0.5, z: 1.5, pitch: 0 })
    await H.A.turnTo(H.at(0.5, 2.78, 1.5), { max: 6 })
    // he keeps creeping in, staring (a held face would read as a pause)
    await H.walk({ z: 1.25 }, 12)
    // ...and while his face fills the screen, he is gone
    await H.leave()
    // the view sinks to the broken bridge where he stood on nothing
    await H.drift(0.5, 0.4, 3.0, 24)
    return true
  }
})
