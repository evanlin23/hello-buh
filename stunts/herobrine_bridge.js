// herobrine #1, the bridge fight (family herobrine, lib/herobrine.js; owner r:r047388 "secret herobrine").
// A bridge fight over the void with a player in the default Steve skin. Every hit fails to register, he freezes
// mid-step and rubber-bands back and forth like a bad connection; 56e complains in chat. 56e shears the bridge out
// from under him: he doesn't fall, he stands on nothing. He turns away to look down into the void, turns back with
// white eyes, drifts up and away, and "Herobrine left the game".
// Times are from 'go' (the first hit). Local frame: lib/herobrine.js (we at z 0.5 facing +z, he comes from +z).
const { makeStunt } = require('../lib/herobrine')

const SUBS = [
  ['air', "why isn't he falling", 1.6, 0],
  ['drift', 'bro??', 1.2, 0]
]

module.exports = makeStunt({
  name: 'herobrine_bridge',
  caption: "this guy's ping is actually unplayable",
  red: 'unplayable',
  subs: SUBS,
  hotbar: ['stone_sword', 'shears', ['blue_wool', 48], ['golden_apple', 3]],
  select: 0,
  pitch: 8,
  edit: {
    subsY: 0.12,    // up in the sky: at mid view the sub sat on his feet over the gap (independent review round 1)
    endAfter: 'payoff:0.8',   // r:r188b46: 0.8 s after he leaves, the chat line still up (the format's default is 1.0)
    chatScale: 5,   // 'Herobrine left the game' is the punchline: readable on a phone
    sfx: [['gamedip', 'payoff', 0.4], ['impact', 'payoff', { gain: 1.4 }]] },   // the logout is silent in vanilla: an impact, with the cave ambience ducked under it (mixcheck)
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
    ctx.mark('reveal')
    ctx.sound('ambient.cave', 1, 1)
    await H.hold(14)
    // he drifts up and away over the void, still staring; the camera follows him
    const from = { x: hb.x, y: hb.y, z: hb.z }
    ctx.mark('drift')
    const N = 30
    for (let k = 1; k <= N; k++) {
      const t = k / N, e = t * t * (3 - 2 * t)
      hb.x = from.x + (0.5 - from.x) * e
      hb.y = from.y + 3.2 * e
      hb.z = from.z + 4.5 * e
      hb.pitch = -6 + 14 * e        // he keeps looking down at us as he rises
      H.A.view(H.at(hb.x, hb.y + 1.6, hb.z))
      await bot.waitForTicks(1); H.K._clock++
    }
    await H.hold(2)
    await H.leave()
    // the camera sinks slowly back to the broken bridge where he stood
    await H.drift(0.5, 0.2, 3.5, 30)
    await H.hold(10)
    return true
  }
})
