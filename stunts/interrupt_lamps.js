// "interrupt" #1 (owner's new format, 2026-11-11, r:re05b89; lib/interrupt.js): played straight as a normal build
// video. The player lays a 5x5 floor of redstone lamps on a grass plain, row by row, a lever on a post at the corner.
// Mid-row an arrow thunks into the lamp beside the crosshair: a skeleton, ten blocks off across the field. The player
// stops, turns, walks right up to its face, eats a golden apple at it, and on the last bite it's gone (poof). Then
// straight back to the same spot, the same lamps, as if nothing happened (the arrow still sticking out of the floor).
// Last row, the lever: the floor lights up in a ripple from the corner (hidden redstone under it). One caption all
// the way, no reaction.
const { storyKit, plainsBiome } = require('../lib/story')
const { plateau } = require('../lib/plateau')
const I = require('../lib/interrupt')

const CAPTION = 'easy light-up dance floor in survival ✨'
const ROWS = [-5, -4, -3, -2, -1]          // dz of each lamp row (north of the player), the far one first
const COLS = [-2, -1, 0, 1, 2]             // dx, west to east
const HOME = [0.5, 0.8]                    // the player's feet (dx, dz): just south of the floor
const POST = [-3, -1]                      // the lever's post, beside the floor's south-west corner
const SKEL = [10.5, -1.5]                  // the skeleton, across the field to the east
const PRE = 1                              // rows already down when the video starts (laid by command in setup)
const BEFORE = 4                           // rows laid before the interruption (the rest after it)

module.exports = {
  name: 'interrupt_lamps',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: {
    caption: CAPTION, red: 'dance floor', song: 'songs/ncs/feel_good_funk.mp3', dropAt: 'lit',
    startAt: 'hook:-0.1', endAfter: 'lit:1.0',
    keySounds: ['intr_hit', 'intr_deal', 'intr_gone'],   // the thunk, the crunches, the last bite: over the music
    sfx: [['air', 'start', 'lit', { gain: 0.5 }]]          // room tone from frame 1
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z
    await ctx.defaultRules()
    // a grass field levelled at the terrain's high percentile (no pit walls), real trees beyond it
    const F = await plateau(ctx, { x0: X - 24, x1: X + 24, z0: Z - 24, z1: Z + 14, biome: 'minecraft:plains', pct: 0.99, taper: 0, trees: 8 })
    Object.assign(this, { X, Z, F })
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await plainsBiome(ctx, A, 40, -4, 20)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty normal')
    await ctx.cmd('/time set 5000')
    // the first row already down, the lever on its post
    for (const dz of ROWS.slice(0, PRE)) await ctx.cmd(`/fill ${A(COLS[0], 1, dz)} ${A(COLS[COLS.length - 1], 1, dz)} redstone_lamp`)
    await ctx.cmd(`/setblock ${A(POST[0], 1, POST[1])} polished_andesite`)
    await ctx.cmd(`/setblock ${A(POST[0], 2, POST[1])} lever[face=floor,facing=east,powered=false]`)
    // the interrupter, NoAI, facing the player
    await I.summon(ctx, { mob: 'skeleton', at: new ctx.Vec3(X + SKEL[0], F + 1, Z + SKEL[1]), face: new ctx.Vec3(X + HOME[0], F + 1, Z + HOME[1]), tag: 'intr' })
    // a normal survival hotbar: the lamps first, the golden apples next to them
    await ctx.hotbar([['redstone_lamp', 64], ['golden_apple', 3], 'iron_pickaxe', 'iron_sword', ['oak_planks', 48], ['torch', 24], ['bread', 9], ['redstone', 32], 'water_bucket'])
    await ctx.tpCheck(X + HOME[0], F + 1, Z + HOME[1], 180, 35)
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { X, Z, F } = this
    const K = storyKit(ctx, I.NO_LINES, { X, Z, F })
    const P = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
    let n = 0
    K.sway = 0.3   // a hand on the mouse while building: the full sway took the crosshair off the far corners' faces
    // each lamp goes on the grass under it (its top: broad and in plain sight from the player; a neighbour's side was
    // a sliver at the far corners, and the turn never landed). The last row runs east to west, ending by the lever
    const lay = async (dz, cols = COLS) => {
      for (const dx of cols) {
        await K.place(P(dx, 1, dz), 'redstone_lamp', { sound: 'block.glass.place', against: P(dx, 0, dz) })   // a redstone lamp's sound type is glass
        K.say('/clear @s redstone_lamp 1')                                                   // the stack goes down, one a lamp
        ctx.mark('lamp', { n: n++ })
        if (n === 2) ctx.mark('hook')   // the video opens two lamps in: already building on frame 1
      }
    }
    await K.aimAt(K.top(P(COLS[0], 0, ROWS[PRE])))
    for (const dz of ROWS.slice(PRE, BEFORE)) await lay(dz)

    // the interruption: an arrow into the top of the east lamp of row -3, beside the crosshair
    await I.interrupt(ctx, K, {
      mob: 'skeleton', tag: 'intr',
      home: P(HOME[0], 1, HOME[1]),
      resume: K.top(P(COLS[COLS.length - 1], 0, ROWS[BEFORE])),
      stand: 1.6,
      cue: { target: P(COLS[COLS.length - 1] + 0.45, 2.0, ROWS[2] + 0.5) },
      deal: { how: 'eat', slot: 1 },
      workSlot: 0
    })

    // ...and on with the floor, as if nothing happened
    for (const dz of ROWS.slice(BEFORE)) await lay(dz, COLS.slice().reverse())

    // the lever: the floor lights up in a ripple from the corner (redstone blocks under the lamps, hidden)
    const lever = P(POST[0], 2, POST[1])
    await K.aimAt(lever, { block: true })
    ctx.bot.activateBlock(ctx.bot.blockAt(lever))   // motion-ok: a lever flip, after K.aimAt landed on it
    ctx.bot.swingArm('right')
    ctx.sound('block.lever.click', 0.6, 0.6)
    ctx.mark('lit')
    const ring = (dx, dz) => Math.abs(dx - COLS[0]) + Math.abs(dz - ROWS[ROWS.length - 1])
    const maxRing = ring(COLS[COLS.length - 1], ROWS[0])
    K.base = K.aim(P(0.5, 1.4, -3.2))   // the whole floor in frame while it lights
    for (let r = 0; r <= maxRing; r++) {
      for (const dz of ROWS) for (const dx of COLS) if (ring(dx, dz) === r) K.say(`/setblock ${X + dx} ${F} ${Z + dz} redstone_block`)
      K.look(r); await ctx.bot.waitForTicks(1)
    }
    for (let k = 0; k < 30; k++) { K.look(k); await ctx.bot.waitForTicks(1) }
    let lit = 0
    for (const dz of ROWS) for (const dx of COLS) { const b = ctx.bot.blockAt(P(dx, 1, dz)); if (b && b.name === 'redstone_lamp' && b.getProperties().lit) lit++ }
    ctx.log(`lamps lit: ${lit}/${ROWS.length * COLS.length}`)
    return lit >= ROWS.length * COLS.length - 1
  }
}
