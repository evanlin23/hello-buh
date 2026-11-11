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

module.exports = makeStunt({
  name: 'faketrick_gold_portal',
  caption: 'a nether portal out of GOLD?? nobody knows this 😱',
  red: 'GOLD??',
  steps: ['step 1: gold blocks', 'step 2: light it', 'step 3: wait...'],
  payoffSub: 'IT WORKS',
  hotbar: [[GOLD, 64], 'flint_and_steel', ['bread', 12], 'diamond_pickaxe', ['torch', 32]],
  select: 0,
  // mixcheck r1: under the NCS bed the gold's place sounds stopped counting as hits in the hook: a pop on every 4th block
  // the opening (owner r:r0f3da0): frame 0 is the impossible thing. The lit gold portal (its first 1.1 s, the player
  // stepping back from it, the swirl going) flashes first, then the tutorial from step 1
  edit: { sfx: [0, 4, 8, 12].map(n => ['pop', 'gold', { nth: n, gain: 0.8 }]),
    hook: { at: 'payoff', before: -0.1, after: 1.2, text: 'how is this working?? 😳' } },
  start: [0.5, 4, 2.4, 180, 45],

  async build (ctx, F) {
    // the grass step behind the frame (dirt under the grass, stone showing in its face)
    await F.cmd(`/fill ${F.A(-R, 1, 2)} ${F.A(R, 2, R)} dirt`)
    await F.cmd(`/fill ${F.A(-R, 3, 2)} ${F.A(R, 3, R)} grass_block`)
    for (const [x, y] of [[-6, 1], [-5, 1], [-5, 2], [-3, 2], [2, 1], [3, 1], [3, 2], [6, 1], [-1, 1]]) await F.cmd(`/setblock ${F.A(x, y, 2)} ${y === 1 ? 'stone' : 'andesite'}`)
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
    // a step back to take it in, the eyes on it
    await F.act.back(10, { look: F.at(0.5, Y0 + 2.8, Z + 0.5) })
    await F.look(0.5, Y0 + 2.8, Z + 0.5, { max: 10, hold: 24 })
    const still = bot.blockAt(F.at(0, Y0 + 2, Z))
    if (!still || still.name !== 'nether_portal') { ctx.log('faketrick: the portal went out:', still && still.name); return false }
    return true
  }
})
