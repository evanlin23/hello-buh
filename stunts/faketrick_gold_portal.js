// faketrick #1, "a nether portal out of GOLD?? nobody knows this 😱" (family faketrick, lib/faketrick.js; owner
// r:rfcab11). Played straight, as a three-step tutorial: on a grass pad in the plains, the player builds a nether
// portal frame out of gold blocks (step 1), switches to flint and steel and lights it (step 2): only fire, burning on
// the gold, as vanilla would. "step 3: wait..." and it lights, purple swirl and all. The fake (a gold frame can't hold
// a portal: only obsidian can) is the comment bait.
// Real on screen: every gold block is placed by the player, aimed (lib/act.js), against the block it goes on; the
// flint and steel is a real right-click on the bottom gold block's top face, and the server puts the fire there.
// Staged: only the portal itself (F.fake: the fire becomes nether_portal blocks, set without neighbour updates so the
// gold frame doesn't break them).
// The player builds from a grass step 3 blocks above the frame's ground, looking down at it: from the ground a column's
// upper blocks go against top faces above the eye, which no player can click (lib/act.js refuses them).
// Local frame (lib/faketrick.js): the pad's centre block (0, 0, 0), floor y 0, feet y 1; yaw 180 looks north (-z).
//   the frame   x -2..2, y 1..5, z -1 (the opening x -1..1, y 2..4)
//   the step    z 2..7, grass at y 3 (feet y 4); the player at (0.5, 4, 2.4)
const { makeStunt } = require('../lib/faketrick')

const Z = -1
const X0 = -2, X1 = 2, Y0 = 1, Y1 = 5, R = 7
const GOLD = 'gold_block'
const GN = -40   // the gold nether's floor (local y): a sealed gold cavern under the pad, x -9..9, z -45..-27

// the gold nether: a stone shell, a gold box hollowed out (raw gold patches, glowstone in the ceiling, two lava pools in
// the floor), a lit gold return portal against the south wall, and piglins admiring the gold in their off hands
// (NoAI, so they never turn on the player; Piglin.getArmPose -> ADMIRING_ITEM from the off-hand gold)
async function goldNether (F) {
  const G = GN, c = (s) => F.cmd(s)
  await c(`/fill ${F.A(-11, G - 1, -47)} ${F.A(11, G + 10, -25)} stone`)
  await c(`/fill ${F.A(-10, G, -46)} ${F.A(10, G + 9, -26)} gold_block`)
  await c(`/fill ${F.A(-9, G + 1, -45)} ${F.A(9, G + 8, -27)} air`)
  for (const [x0, z0, x1, z1] of [[-8, -44, -5, -40], [3, -35, 6, -31], [-3, -30, -1, -29], [6, -44, 8, -42], [-8, -33, -6, -31]]) await c(`/fill ${F.A(x0, G, z0)} ${F.A(x1, G, z1)} raw_gold_block`)
  for (const [x0, z0, x1, z1] of [[-9, -45, -9, -27], [9, -45, 9, -27], [-9, -45, 9, -45]]) await c(`/fill ${F.A(x0, G + 3, z0)} ${F.A(x1, G + 6, z1)} raw_gold_block replace gold_block`)
  for (const x of [-6, 0, 6]) for (const z of [-42, -36, -30]) await c(`/setblock ${F.A(x, G + 9, z)} glowstone`)
  for (const [x, z] of [[-7, -36], [-6, -36], [6, -39], [6, -38]]) await c(`/setblock ${F.A(x, G, z)} lava`)
  for (const [x, z] of [[-5, -43], [5, -43]]) await c(`/fill ${F.A(x, G + 1, z)} ${F.A(x, G + 8, z)} gold_block`)   // two gold pillars
  // the return portal: a gold frame x -2..2, y G+1..G+5 at z -28, lit
  await c(`/fill ${F.A(-2, G + 1, -28)} ${F.A(2, G + 5, -28)} gold_block`)
  await c(`/fill ${F.A(-1, G + 2, -28)} ${F.A(1, G + 4, -28)} nether_portal[axis=x] strict`)
  await c('/difficulty easy')   // piglins are removed in peaceful (Monster.shouldDespawnInPeaceful); NoAI keeps them harmless
  const loved = ['gold_ingot', 'gold_block', 'golden_apple', 'gold_ingot', 'raw_gold', 'golden_carrot', 'gold_ingot', 'clock', 'gold_block']
  const spots = [[-5, -33, 200], [-2, -35, 170], [2, -34, 190], [5, -36, 160], [-6, -39, 210], [0, -39, 180], [4, -41, 150], [-3, -42, 200], [7, -33, 140]]
  for (let i = 0; i < spots.length; i++) {
    const [x, z, yaw] = spots[i]
    await c(`/summon piglin ${F.A(x + 0.5, G + 1, z + 0.5)} {NoAI:1b,PersistenceRequired:1b,IsImmuneToZombification:1b,Invulnerable:1b,Rotation:[${yaw - 180}f,0f],equipment:{offhand:{id:"minecraft:${loved[i]}",count:1}}}`)
  }
}

module.exports = makeStunt({
  name: 'faketrick_gold_portal',
  caption: 'a nether portal out of GOLD?? nobody knows this 😱',
  red: 'GOLD??',
  steps: ['step 1: gold blocks', 'step 2: light it', 'step 3: wait...'],
  payoffSub: 'IT WORKS',
  hotbar: [[GOLD, 64], 'flint_and_steel', ['bread', 12], 'diamond_pickaxe', ['torch', 32]],
  select: 0,
  // mixcheck r1: under the NCS bed the gold's place sounds stopped counting as hits in the hook: a pop on every 4th block
  // the opening (owner r:r0f3da0): frame 0 is the impossible thing. The lit gold portal (the player stepping back
  // from it, the swirl going) flashes first, then the tutorial from step 1. The end (owner r:r188b46, fast ends):
  // 0.8 s after it lights; the flash stays inside that (its sound is cut from the finished Short's last 0.8 s)
  edit: { sfx: [...[0, 4, 8, 12].map(n => ['pop', 'gold', { nth: n, gain: 0.8 }]), ['whoosh', 'cut:-0.15'], ['dip', 'cut', 0.4], ['gamedip', 'cut', 0.35], ['impact', 'cut:0.03', { gain: 1.4 }]],   // the hit on the reveal itself (review r1: it came 1.1 s after the cut into the gold nether, which played silent)
    // the last beat (owner r:r4607fa): the walk through the gold portal and out into a GOLD nether full of piglins
    // admiring gold (white flash on the cut, a dip + impact and the drop on the reveal); the end 0.9 s after it. The
    // hook: the walk up to the lit gold portal (moving from frame 0)
    endAfter: 'cut:0.9', dropAt: 'cut', hook: { at: 'walk', before: 0.3, after: 0.9, text: 'how is this working?? 😳' },   // (the payoff is the cut into the gold nether: review r1)
    flash: [['payoff', 0, 0.45], ['cut', 0, 0.35]],
    subs: [['cut', 'a GOLD nether??', 0.9, 0]] },   // (no emoji in subs: the sub font draws them as boxes)
  start: [0.5, 4, 2.4, 180, 45],

  async build (ctx, F) {
    // the grass step behind the frame (dirt under the grass, stone showing in its face)
    await F.cmd(`/fill ${F.A(-R, 1, 2)} ${F.A(R, 2, R)} dirt`)
    await F.cmd(`/fill ${F.A(-R, 3, 2)} ${F.A(R, 3, R)} grass_block`)
    for (const [x, y] of [[-6, 1], [-5, 1], [-5, 2], [-3, 2], [2, 1], [3, 1], [3, 2], [6, 1], [-1, 1]]) await F.cmd(`/setblock ${F.A(x, y, 2)} ${y === 1 ? 'stone' : 'andesite'}`)
    await goldNether(F)
  },

  async perform (ctx, F) {
    const { bot } = ctx
    // the base (right to left), up the left side, the top from the left to the middle, up the right side, and the
    // top's last block against the right side's top (each block against a face the eye on the step can see)
    const cells = []
    for (let x = X1; x >= X0; x--) cells.push([x, Y0])
    for (let y = Y0 + 1; y <= Y1; y++) cells.push([X0, y])
    for (let x = X0 + 1; x < X1 - 1; x++) cells.push([x, Y1])
    for (let y = Y0 + 1; y <= Y1; y++) cells.push([X1, y])
    cells.push([X1 - 1, Y1])
    ctx.mark('go')
    F.step()
    for (const [x, y] of cells) {
      await F.place(x, y, Z, { max: 30, delay: 6 })   // ~3 blocks a second: a player's building pace (vanilla's floor is 4 ticks)
      ctx.mark('gold', { x, y })
    }
    // step 2: flint and steel on the bottom gold block's top face (the server puts the fire in the opening)
    ctx.select(1)
    F.step()
    await F.look(0.5, Y0 + 1.6, Z + 0.5, { max: 14 })
    await F.click(0, Y0, Z, 1, { max: 30 })
    ctx.sound('item.flintandsteel.use', 1, 1)
    ctx.mark('flint')
    for (let k = 0; k < 6; k++) {
      const b = bot.blockAt(F.at(0, Y0 + 1, Z))
      if (b && b.name === 'fire') break
      await bot.waitForTicks(1)
    }
    const fire = bot.blockAt(F.at(0, Y0 + 1, Z))
    ctx.log('faketrick: in the opening after the flint:', fire && fire.name)
    if (!fire || fire.name !== 'fire') return false
    // step 3: wait... (just fire on gold, as vanilla has it), the eyes drifting up the empty frame
    await bot.waitForTicks(4)
    F.step()
    await F.look(0.5, Y0 + 3.4, Z + 0.5, { max: 26, hold: 6 })
    await F.look(0.5, Y0 + 1.9, Z + 0.5, { max: 16, hold: 4 })
    // the impossible part: it lights
    await F.fake(`/fill ${F.A(X0 + 1, Y0 + 1, Z)} ${F.A(X1 - 1, Y1 - 1, Z)} nether_portal[axis=x] strict`, { what: 'portal in a gold frame' })
    F.payoff()
    ctx.sound('block.portal.ambient', 0.8, 1)
    F.portal([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, Z])
    await bot.waitForTicks(2)
    const lit = bot.blockAt(F.at(0, Y0 + 2, Z))
    if (!lit || lit.name !== 'nether_portal') { ctx.log('faketrick: no portal after the fake:', lit && lit.name); return false }
    await F.hold(10)   // a beat on it (the "IT WORKS" sub)
    // the walk-through (owner r:r4607fa, no-op audit: "walk through into something absurd"): off the step, across, a
    // hop onto the gold base and into the swirl, eyes level ahead (a governed turn up from the frame)
    ctx.mark('walk')
    const look = F.look(0.5, 5.6, -30, { max: 12 })
    bot.setControlState('forward', true)   // motion-ok: a straight walk into the portal (the step's edge, the floor, the base)
    let entered = false
    for (let k = 0; k < 60; k++) {
      const z = bot.entity.position.z - F.O.z
      if (z < 0.95 && bot.entity.onGround && !entered) bot.setControlState('jump', true)   // motion-ok: the hop onto the base
      else bot.setControlState('jump', false)   // motion-ok
      if (z < 0.15) bot.setControlState('forward', false)   // motion-ok: let go at the portal: it coasts into the swirl
      if (z < -0.1 && !entered) { entered = true; ctx.mark('enter') }   // the eye at the portal's plane: purple fills the view
      if (entered && k > 0) break
      await bot.waitForTicks(1)
    }
    bot.setControlState('forward', false); bot.setControlState('jump', false)   // motion-ok
    await look
    if (!entered) { ctx.log('faketrick: never reached the portal'); return false }
    await F.hold(1)   // in the swirl (8 ticks walked it out the far side onto the plains: stills r1)
    // ...and out of the return portal into a GOLD nether: everything gold, piglins losing their minds over it
    F.stop()
    ctx.mark('cut')
    await F.fake(`/tp @s ${F.A(0.5, GN + 2, -27.5)} 180 0`, { what: 'the portal goes to a gold nether' })
    for (let w = 0; w < 10 && bot.entity.position.y > F.O.y + GN + 4; w++) await bot.waitForTicks(1)
    F.portal([-1, GN + 2, 1, GN + 4, -28])
    ctx.sound('block.portal.travel', 0.35, 1.2)
    await F.hold(3)
    bot.setControlState('forward', true)   // motion-ok: out of the return portal, down off its base
    for (let k = 0; k < 16 && bot.entity.position.z - F.O.z > -30.2; k++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)   // motion-ok
    ctx.mark('gold_world')
    ctx.sound('entity.piglin.admiring_item', 1, 1); ctx.sound('entity.piglin.celebrate', 0.9, 1.1)
    // a slow look along the piglins, every one of them admiring its gold
    await F.look(-4, GN + 2, -38, { max: 6 })
    await F.look(3, GN + 2, -40, { max: 5 })
    await F.hold(10)
    const back = bot.blockAt(F.at(0, GN + 3, -28))
    if (!back || back.name !== 'nether_portal') { ctx.log('faketrick: the return portal went out:', back && back.name); return false }
    return true
  }
})
