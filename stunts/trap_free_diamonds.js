// trap #1, "trapping my friend with FREE DIAMONDS 💀" (family trap, lib/trap.js; owner r:refc733: "trapping friend").
// On a grass pad in the plains I dig a deep shaft, pour lava into its bottom, climb out (a cut), cover my side of it,
// put a trapdoor over the drop and a TRAPPED chest right behind it with a diamond block on each side, and hide. My
// friend Dylan (a second player, never 56e) joins, walks up to the free diamonds, stands on the trapdoor to open the
// chest, the floor opens, and he falls 10 blocks into the lava; the last beat looks straight down the shaft at him.
// Owner on v2 (2026-11-12): "more setup for the trap. Like go all the way down and then lava or fire".
// Why it works in vanilla (minecraft-audit): an opened trapped chest gives off redstone power and strongly powers the
// block under it; that block powers the trapdoor beside it, which opens; the friend standing on it drops down the
// shaft into the lava pool. Nothing but his own right-click sets it off.
// The shaft: I dig straight down (the block under my feet each time; a time-lapse, owner on v3: "we should timelapse
// the digging"), then at the bottom dig a two-high pocket in the east wall, step into it, dig the shaft's floor one
// deeper and pour the lava in there, below my feet, so it never reaches me (lava never flows up).
// Real on screen: every dig and place is aimed (the story kit) and takes one item from the hotbar; the friend walks
// on his own physics and opens the chest with his own click. Commands only grade the pad (and stone under the shaft,
// so no cave opens into it) and move the friend while he is out of view; the climb out of the shaft is a cut.
// The friend has resistance 4 from lib/trap.js: the lava sets him burning but never kills him (no death puff).
// Local frame (lib/trap.js): the pad's centre block (0, 0, 0), floor y 0, feet y 1; mineflayer yaw 0 looks north (-z).
//   the shaft     (0, 0..-9, 0) under the trapdoor, lava at (0, -9, 0); the pocket (1, -7..-8, 0)
//   the trapdoor  (0, 0, 0), top half, hinged on the north edge; the chest (0, 1, -1) facing south on (0, 0, -1),
//                 which powers the trapdoor; diamond blocks at (-1, 1, -1) and (1, 1, -1)
//   me            dig down the shaft; out to (0.5, 1, 1.15) looking north (every aim ray enters its block from the top);
//                 hide at (3.5, 1, 2.5) crouched; the last look from (1.05, 1, 0.5) at the shaft's edge, straight down it
//   the friend    waits at (-3.5, 6.5) on the pad, out of view; in to (0.5, 3.5), then north onto the trapdoor,
//                 stopping at z 0.6 (the open panel stands in z 0..3/16, and a player centred north of z 0.49 would
//                 stay standing on its top edge)
const { makeStunt } = require('../lib/trap')

const FRIEND = 'Dylan'
const HIDE = [3.5, 1, 2.5]
const LAPSE = 3               // the dig (straight down, then the pocket and the pit) plays x3, turns capped at 220 / 3 deg/s (r:r38374d)
const PEEK = [1.05, 1, 0.5]   // on the grass east of the shaft, the box (0.75..1.35) still on it, the eye over the edge
const DEEP = 8                // my feet at the bottom: y -DEEP; the lava one below B's floor at y -(DEEP + 1); the dig is a time-lapse of its breaks (LAPSE), the rest is cut

module.exports = makeStunt({
  name: 'trap_free_diamonds',
  caption: 'trapping my friend with FREE DIAMONDS 💀',
  red: 'FREE DIAMONDS',
  steps: ['step 1: a DEEP hole', 'step 2: lava at the bottom', 'step 3: a trapdoor on top', 'step 4: a TRAPPED chest behind it', 'step 5: free diamonds', 'now hide'],
  friend: { name: FRIEND, skin: 'kai' },
  hotbar: ['diamond_shovel', 'diamond_pickaxe', 'lava_bucket', ['spruce_trapdoor', 4], 'trapped_chest', ['diamond_block', 2]],
  select: 0,
  start: [0.62, 1, 0.5, 90, 85],   // on the shaft's top block a little east of its middle: each block under me is aimed ~86 deg down (straight down never 'lands')
  park: [-3.5, 1, 6.5, -125],
  endHold: 0.75,
  payoffHit: false,   // the landing in the lava is the payoff: no impact on the trapdoor (its tail buried the landing's hit)
  edit: {
    // fast cuts (owner r:r188b46): the middle of the dig, the walk into hiding, his coast + shuffle onto the trapdoor,
    // and my walk to the edge; every edge sits on a rest (rec_check whip)
    speed: [['go', 'lapse_end', LAPSE], ['hide_go:0.05', 'hidden:0.05', 'cut'], ['friend_close:0.15', 'friend_there', 'cut']],
    tally: { event: 'depth', label: 'blocks deep', done: 'lava_in' },
    // the last beat: straight down the shaft at him in the lava (owner: "all the way down and then lava"); a hit on it
    endAfter: 'splash:0.8',
    dropAt: 'splash',   // the song's drop on the landing (mixcheck: the hit was buried under the bed already dropped on the trapdoor)
    sfx: [['dip', 'splash', 0.5], ['gamedip', 'splash', 0.5], ['impact', 'splash', { gain: 1.4 }], ['boom', 'splash']],   // the song and the game duck before the landing so its hit stands out (mixcheck)
    // the landing is the payoff pace/mixcheck time: a flash and a punch on it too (the trap edit has them on the trapdoor)
    flash: [['payoff', 0, 0.35], ['splash', 0, 0.35]],
    punch: [['payoff', 0, 1.06], ['splash', 0, 1.08]],
    zoom: [['splash:-0.3', 'splash:0.9', 2.4]]   // a push-in down the shaft onto him in the lava (the crosshair is on the shaft's bottom)
  },

  async set (ctx, T) {
    // solid stone round and under the shaft, so no cave or ore pocket opens into it (the pad grades stone to -6 only)
    await T.cmd(`/fill ${T.A(-2, -DEEP - 4, -2)} ${T.A(3, -4, 2)} stone`)
    // a few bushes round the pad's edge (persistent leaves on the grass) so it isn't a bare square
    for (const [x, z] of [[4, -1], [8, -2], [8, -1], [-5, -4], [-6, -4], [-6, -3], [7, -5]]) await T.cmd(`/setblock ${T.A(x, 1, z)} oak_leaves[persistent=true]`)
  },

  async perform (ctx, T) {
    const { bot } = ctx
    const F = T.friend
    const tool = (y) => ctx.select(y >= -3 ? 0 : 1)   // grass and dirt: the shovel; stone: the pickaxe
    const landed = async () => { for (let k = 0; k < 20 && !bot.entity.onGround; k++) await T.tick() }
    ctx.mark('go')
    // step 1: the deep hole
    T.step()
    // a time-lapse (owner on v3: "we should timelapse the digging"): straight down the trap column, the block under my
    // feet each time (no turns: one steady look down), the whole dig x3 with a depth counter climbing
    T.K.turnLimit(220 / LAPSE)   // the lapse runs on through the pocket, where I do turn
    let i = 0
    for (let y = 0; y >= -DEEP; y--) {
      tool(y)
      await T.dig(0, y, 0, { mark: `d${i++}` })
      ctx.mark('depth', { n: -y + 1 })
      await landed()
    }
    // at the bottom (feet at -DEEP): a pocket in the east wall, two high, and I step into it
    tool(-DEEP)
    await T.look(1.0, -DEEP + 1.5, 0.5, { max: 40 })   // up off the floor onto the east wall (an eased turn, not a snap)
    await T.dig(1, -DEEP + 1, 0)
    await T.dig(1, -DEEP, 0)
    await T.walk([[1.35, -DEEP, 0.5]])   // just into the pocket: the ray to the pit's floor clears my own floor's edge
    // the shaft's floor one deeper: the lava pit, below my feet in the pocket
    await T.dig(0, -DEEP - 1, 0)
    ctx.mark('depth', { n: DEEP + 2 })
    await T.drift(5, 0, 4)
    ctx.mark('lapse_end')
    T.K.turnLimit()
    // step 2: lava at the bottom (it can't flow up to me, and my floor holds it in)
    ctx.select(2)
    T.step()
    await T.place(0, -DEEP - 1, 0, 'lava', 'lava_bucket', { against: [0, -DEEP - 2, 0] })
    ctx.sound('item.bucket.empty_lava', 1, 1)
    ctx.mark('lava_in')   // the depth counter turns gold
    await ctx.cmd(`/item replace entity ${bot.username} hotbar.2 with bucket`)
    await T.drift(8, 0, -6)
    // out of the shaft (a cut) to the south of the hole
    await T.K.cut(0.5, 1.15, T.at(0.5, 0.5, 0.0), 1)
    ctx.select(3)
    // step 3: a spruce trapdoor in the top half of the shaft's top block, against the grass block to the north
    T.step()
    await T.place(0, 0, 0, 'spruce_trapdoor[facing=south,half=top,open=false]', 'spruce_trapdoor', { against: [0, 0, -1] })
    await T.drift(7, 0, 6)
    // step 4: the trapped chest on that grass block, facing the trapdoor
    ctx.select(4)
    T.step()
    await T.place(0, 1, -1, 'trapped_chest[facing=south]', 'trapped_chest', { against: [0, 0, -1] })
    await T.drift(8, 0, 10)
    // step 5: a diamond block each side of it
    ctx.select(5)
    T.step()
    await T.place(-1, 1, -1, 'diamond_block', 'diamond_block', { against: [-1, 0, -1] })
    await T.place(1, 1, -1, 'diamond_block', 'diamond_block', { against: [1, 0, -1] })
    await T.drift(7, -6, 8)
    // now hide: off to the east, turn round, crouch and watch it
    ctx.select(6)   // an empty hand to hide with
    T.step()
    ctx.mark('hide_go')
    await T.hold(3)   // a rest for the edit cut's out edge (rec_check whip: cut edges on a still view)
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
    await F.walk([[0.5, 3.5], [0.5, 0.6]], { tol: 0.08, during: (k) => { if (k >= 0) watch();   /* the follow stops when his walk does: the coast cut lands on a still view (whip) */ if (k === 14 && !said) { said = true; F.say('yo FREE DIAMONDS??') } if (k < 0 && !close) { close = true; ctx.mark('friend_close') } } })
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
    // as he drops through, cut to the edge (I'm still crouched): straight down the shaft, he falls the rest of the way
    // into the lava, and the hit lands on the splash (reviewer v3: the fall and the landing must be seen)
    await T.hold(10)   // he sinks out of the floor (the opening's flash-forward runs to payoff+0.45: the cut comes after it); the view rests for the cut's out edge
    await T.K.cut(PEEK[0], PEEK[2], Object.assign(T.at(0.5, -DEEP, 0.5), { exact: true }), 1)
    let inLava = false
    for (let k = 0; k < 40 && !inLava; k++) { inLava = !!F.bot.entity.isInLava; if (!inLava) await T.tick() }
    if (!inLava) { ctx.log('trap: the friend did not reach the lava'); return false }
    ctx.mark('splash')
    ctx.sound('block.lava.pop', 1, 1)
    ctx.sound('entity.generic.burn', 0.8, 1)
    F.say('BRO')
    await F.lookAt(PEEK[0], PEEK[1] + 1.3, PEEK[2], 6)
    T.still()
    await T.hold(24)
    const p = F.pos()
    ctx.log(`trap: ${FRIEND} ends at ${(p.x - T.O.x).toFixed(2)} ${(p.y - T.O.y).toFixed(2)} ${(p.z - T.O.z).toFixed(2)} (in lava: ${!!F.bot.entity.isInLava})`)
    return p.y - T.O.y < -DEEP + 0.5
  }
})
