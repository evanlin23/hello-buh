// trap #1, "trapping my friend with FREE DIAMONDS 💀" (family trap, lib/trap.js; owner r:refc733: "trapping friend").
// On a grass pad in the plains I dig a 2-deep hole, cover it with a trapdoor, put a TRAPPED chest right behind it with
// a diamond block on each side, and hide. My friend Dylan (a second player, never 56e) joins, walks straight up to the
// free diamonds, stands on the trapdoor to open the chest, and the floor opens under him.
// Why it works in vanilla (minecraft-audit): an opened trapped chest gives off redstone power and strongly powers the
// block under it; that block powers the trapdoor beside it, which opens; the friend standing on it falls 2 blocks
// (no fall damage under 3) into a 1x1 hole he can't jump out of. Nothing but his own right-click sets it off.
// Real on screen: every dig and place is aimed (the story kit, lib/act.js) and takes one item from the hotbar; the
// friend walks on his own physics and opens the chest with his own click. Commands only grade the pad and move the
// friend while he is out of view.
// Local frame (lib/trap.js): the pad's centre block (0, 0, 0), floor y 0, feet y 1; mineflayer yaw 0 looks north (-z).
//   the hole      (0, 0, 0) and (0, -1, 0); the trapdoor at (0, 0, 0), top half, hinged on the north edge
//   the chest     (0, 1, -1) facing south, on the grass block (0, 0, -1) that powers the trapdoor; diamond blocks
//                 at (-1, 1, -1) and (1, 1, -1)
//   me            build from (0.5, 1, 1.15) looking north (close enough that every aim ray enters its block from the top); hide at (3.5, 1, 2.5) looking west-north-west at the chest's front, crouched
//   the friend    waits at (-3.5, 6.5) on the pad, south-west, out of view; in to (0.5, 3.5), then north onto the trapdoor, stopping
//                 at z 0.6: the open panel stands in z 0..3/16 of the hole, and a 0.6-wide player centred north of
//                 z 0.49 would stay standing on its top edge (take 1 did)
const { makeStunt } = require('../lib/trap')

const FRIEND = 'Dylan'
const HIDE = [3.5, 1, 2.5]
const PEEK = [1.65, 1, 0.5]   // on the grass east of the hole, close enough to look straight down at him

module.exports = makeStunt({
  name: 'trap_free_diamonds',
  caption: 'trapping my friend with FREE DIAMONDS 💀',
  red: 'FREE DIAMONDS',
  steps: ['step 1: a hole', 'step 2: a trapdoor on top', 'step 3: a TRAPPED chest behind it', 'step 4: free diamonds', 'now hide'],
  friend: { name: FRIEND, skin: 'kai' },
  hotbar: ['diamond_shovel', ['spruce_trapdoor', 4], 'trapped_chest', ['diamond_block', 2], ['bread', 12]],
  select: 0,
  start: [0.5, 1, 1.15, 180, 66],
  park: [-3.5, 1, 6.5, -125],
  endHold: 0.75,   // owner r:r188b46: the end 0.5-0.8 s after the payoff's result
  // fast cuts (owner r:r188b46): jump over the walk into hiding and his coast + shuffle onto the trapdoor
  edit: {
    speed: [['hide_go:0.05', 'hidden:0.05', 'cut'], ['friend_close', 'friend_there', 'cut'], ['get_up:0.05', 'peek', 'cut']],
    // the last beat is the close look down at him in the pit (owner r:r4607fa): a hit on it, and the end 0.8 s after
    endAfter: 'peek:0.8',
    sfx: [['impact', 'peek', { gain: 1.4 }]]
  },   // south-west, behind me while I build and ~67 deg off my view from the hide; the turn into hiding goes round by the north

  async set (ctx, T) {
    // a few bushes round the pad's edge (persistent leaves on the grass) so it isn't a bare square
    for (const [x, z] of [[4, -1], [8, -2], [8, -1], [-5, -4], [-6, -4], [-6, -3], [7, -5]]) await T.cmd(`/setblock ${T.A(x, 1, z)} oak_leaves[persistent=true]`)
  },

  async perform (ctx, T) {
    const { bot } = ctx
    const F = T.friend
    ctx.mark('go')
    // step 1: the hole, 2 deep (grass, dirt)
    T.step()
    await T.dig(0, 0, 0)
    await T.dig(0, -1, 0)
    await T.drift(6, 0, 5)
    // step 2: a spruce trapdoor in the top half of the hole's top block, against the grass block to the north
    ctx.select(1)
    T.step()
    await T.place(0, 0, 0, 'spruce_trapdoor[facing=south,half=top,open=false]', 'spruce_trapdoor', { against: [0, 0, -1] })
    await T.drift(7, 0, 6)
    // step 3: the trapped chest on that grass block, facing the trapdoor
    ctx.select(2)
    T.step()
    await T.place(0, 1, -1, 'trapped_chest[facing=south]', 'trapped_chest', { against: [0, 0, -1] })
    await T.drift(8, 0, 10)
    // step 4: a diamond block each side of it
    ctx.select(3)
    T.step()
    await T.place(-1, 1, -1, 'diamond_block', 'diamond_block', { against: [-1, 0, -1] })
    await T.place(1, 1, -1, 'diamond_block', 'diamond_block', { against: [1, 0, -1] })
    await T.drift(7, -6, 8)
    // now hide: off to the east, then turn round, crouch and watch it
    ctx.select(5)   // an empty hand to hide with
    T.step()
    ctx.mark('hide_go')
    await T.hold(3)   // a rest for the edit cut's out edge (rec_check whip: cut edges on a still view)
    // one short leg, mostly east, so the turn back onto the bait goes round by the north, never past him in the south-west
    await T.walk([HIDE])
    await T.look(0.5, 1.4, 0.2, { max: 30 })
    T.sneak(true)
    await T.hold(5)   // the crouch eases in before the cut lands here, and the view rests (rec_check cuts/whip)
    ctx.mark('hidden')
    await T.hold(4)   // the view rests after the cut lands, then follows him in
    // he joins the moment I'm down and comes up from the south-west, out of view at first; the camera follows him in
    F.join()
    const watch = () => { const p = F.pos(); T.K.base = T.K.aim(Object.assign(new ctx.Vec3((p.x + T.O.x + 0.5) / 2, T.O.y + 1.6, (p.z + T.O.z + 0.5) / 2), { exact: true })) }
    let said = false, close = false   // close: his walk ends, the coast and the shuffle onto the mark start (cut out)
    await F.walk([[0.5, 3.5], [0.5, 0.6]], { tol: 0.08, during: (k) => { watch(); if (k === 14 && !said) { said = true; F.say('yo FREE DIAMONDS??') } if (k < 0 && !close) { close = true; ctx.mark('friend_close') } } })
    ctx.mark('friend_there')
    // on the trapdoor: he looks down at the chest and opens it
    await F.lookAt(0.5, 1.4, -0.6, 8)
    T.K.base = T.K.aim(Object.assign(T.at(0.5, 1.5, 0.3), { exact: true }))
    await F.open(0, 1, -1)
    ctx.sound('block.chest.open', 0.5, 1)
    // the trapped chest powers the block under it, which opens the trapdoor: the floor goes
    let open = false
    for (let k = 0; k < 6 && !open; k++) {
      const b = bot.blockAt(T.at(0, 0, 0))
      open = !!(b && b.name === 'spruce_trapdoor' && b.getProperties().open)
      if (!open) await T.tick()
    }
    if (!open) { ctx.log('trap: the trapdoor did not open'); return false }
    T.payoff()
    ctx.sound('block.wooden_trapdoor.open', 1, 1, { key: true })
    const fell = await F.waitFall({ minDrop: 1.5, max: 30 })
    if (!fell) { ctx.log('trap: the friend did not fall'); return false }
    ctx.sound('block.gravel.fall', 0.6, 0.9)
    await T.hold(8)   // he lands; the view rests for the edit cut's out edge
    // the close shot (owner r:r4607fa: the fall was small in frame): I get up, walk to the hole's edge and look straight
    // down at him; he looks up at me. The walk is cut (edges on rests); the impact lands on the look (edit sfx 'peek').
    ctx.mark('get_up')
    T.sneak(false)
    await T.walk([PEEK])
    await T.look(0.5, 0.55, 0.5, { max: 30 })
    await T.hold(4)
    ctx.mark('peek')
    F.say('bro.')
    await F.lookAt(PEEK[0], PEEK[1] + 1.62, PEEK[2], 6)
    T.still()
    await T.hold(24)
    const p = F.pos()
    ctx.log(`trap: ${FRIEND} ends at ${(p.x - T.O.x).toFixed(2)} ${(p.y - T.O.y).toFixed(2)} ${(p.z - T.O.z).toFixed(2)}`)
    return p.y - T.O.y < 0
  }
})
