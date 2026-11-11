// "interrupt" #1 (owner's new format, 2026-11-11, r:re05b89; lib/interrupt.js): played straight as a normal build
// video. The player lays a 7x8 floor of redstone lamps on a grass plain, row by row, stepping back a block after each
// row, a lever on a post at the near corner. Five rows in, an arrow thunks into the lamp beside the crosshair: a
// skeleton, eleven blocks off across the field. The player stops, turns, walks up to it, eats a golden apple in its
// face (stepping in as it eats), and on the last bite it's gone (poof). Then straight back to the same spot, the same
// row, as if nothing happened (the arrow still sticking out of the floor). Last row, the lever: the floor lights up
// in a ripple from the corner (hidden redstone under it). One caption all the way, no reaction.
const { storyKit, plainsBiome } = require('../lib/story')
const { plateau } = require('../lib/plateau')
const I = require('../lib/interrupt')
const act = require('../lib/act')

const CAPTION = 'easy light-up dance floor in survival ✨'
const ROWS = [-8, -7, -6, -5, -4, -3, -2, -1]   // dz of each lamp row, the far one first
const COLS = [-3, -2, -1, 0, 1, 2, 3]           // dx, west to east
// the order along a row: from each end inward, so the lamp just placed never stands between the eye and the lamp
// the next one is clicked onto (from the middle, the west end's ray crossed its east neighbour); ends next to the lever
const ORDER = [3, 2, 1, 0, -3, -2, -1]
const BACK = 2.7                         // the player's feet stand this far south of the row's block line (reach ~4.5)
const PX = 0.5                           // ...at this dx
const POST = [-4, -1]                    // the lever's post, beside the floor's south-west corner
const SKEL = [11.5, -1.0]                // the skeleton, across the field to the east
const PRE = 1                            // rows already down when the video starts (laid by command in setup)
const BEFORE = 5                         // the row the interruption comes in (two lamps into it)

module.exports = {
  name: 'interrupt_lamps',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: {
    caption: CAPTION, red: 'dance floor', song: 'songs/ncs/feel_good_funk.mp3', dropAt: 'lit',
    startAt: 'hook:-0.1', endAfter: 'lit:1.0',
    // the walk back keeps its start and end around a jump cut (all 3.8 s of it was a span with nothing new: pace)
    speed: [['intr_back:1.2', 'intr_resume:-1.0', 'cut']],
    punch: [['lit', 0, 1.08]], flash: [['lit', 0, 0.4]],   // the payoff's picture change (the lights coming on), with the ripple and the drop
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
    const F = await plateau(ctx, { x0: X - 26, x1: X + 26, z0: Z - 30, z1: Z + 16, biome: 'minecraft:plains', pct: 0.99, taper: 0, trees: 8 })
    Object.assign(this, { X, Z, F })
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await plainsBiome(ctx, A, 44, -4, 20)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/difficulty normal')
    await ctx.cmd('/time set 5000')
    // the first row already down, the lever on its post
    for (const dz of ROWS.slice(0, PRE)) await ctx.cmd(`/fill ${A(COLS[0], 1, dz)} ${A(COLS[COLS.length - 1], 1, dz)} redstone_lamp`)
    await ctx.cmd(`/setblock ${A(POST[0], 1, POST[1])} polished_andesite`)
    await ctx.cmd(`/setblock ${A(POST[0], 2, POST[1])} lever[face=floor,facing=east,powered=false]`)
    // the interrupter, NoAI, facing where the player will be when it shoots
    const at = ROWS[BEFORE - 1] + 1 + BACK
    await I.summon(ctx, { mob: 'skeleton', at: new ctx.Vec3(X + SKEL[0], F + 1, Z + SKEL[1]), face: new ctx.Vec3(X + PX, F + 1, Z + at), tag: 'intr' })
    // a normal survival hotbar: the lamps first, the golden apples next to them
    await ctx.hotbar([['redstone_lamp', 64], ['golden_apple', 3], 'iron_pickaxe', 'iron_sword', ['oak_planks', 48], ['torch', 24], ['bread', 9], ['redstone', 32], 'water_bucket'])
    await ctx.tpCheck(X + PX, F + 1, Z + ROWS[PRE] + 1 + BACK, 180, 30)
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { X, Z, F } = this
    const { bot } = ctx
    const K = storyKit(ctx, I.NO_LINES, { X, Z, F })
    const A = act(ctx, { K })   // every place and use aimed by construction (r:rffba12)
    const P = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
    K.sway = 0.1   // a steady hand while building: more sway took the crosshair off the clicked lamp's face at the near west corner (rec_check sight)
    let n = 0
    // each lamp is clicked onto the side of the lamp north of it (the face toward the player: broad, in plain sight, and
    // the ray to that lamp crosses nothing; the grass under the spot is a grazing top face whose ray hits the grass in
    // front first, and a neighbour's side was a sliver at the far corners)
    const lay = async (dz, cols = ORDER) => {
      for (const dx of cols) {
        await A.place(P(dx, 1, dz), { block: 'redstone_lamp', sound: 'block.glass.place', against: P(dx, 1, dz - 1) })   // a redstone lamp's sound type is glass
        K.say('/clear @s redstone_lamp 1')                                                   // the stack goes down, one a lamp
        ctx.mark('lamp', { n: n++ })
        if (n === 2) ctx.mark('hook')   // the video opens two lamps in: already building on frame 1
      }
    }
    // a step back to the next row's spot, eyes on its first lamp (as a player backs up laying a floor)
    const stepBack = async (dz) => {
      const z = Z + dz + 1 + BACK
      K.base = K.aim(K.top(P(ORDER[0], 0, dz)))
      for (let k = 0; k < 30 && bot.entity.position.z < z - 0.06; k++) { K.ctl('back', true); K.look(k); await bot.waitForTicks(1) }
      K.ctl('back', false)
      ctx.mark('step_back')
    }
    await K.aimAt(K.top(P(ORDER[0], 0, ROWS[PRE])))
    for (let r = PRE; r < BEFORE - 1; r++) { if (r > PRE) await stepBack(ROWS[r]); await lay(ROWS[r]) }
    await stepBack(ROWS[BEFORE - 1])
    await lay(ROWS[BEFORE - 1], ORDER.slice(0, 2))   // two lamps into the row, the crosshair on the east side

    // the interruption: an arrow into the top of the east lamp of the row before, beside the crosshair
    const r0 = ROWS[BEFORE - 2]
    await I.interrupt(ctx, K, {
      mob: 'skeleton', tag: 'intr',
      resume: K.top(P(ORDER[2], 0, ROWS[BEFORE - 1])),
      cue: { target: P(COLS[COLS.length - 1] + 0.45, 2.0, r0 + 0.5) },
      deal: { how: 'eat', slot: 1 },
      workSlot: 0
    })
    K.sway = 0.1

    // ...and on with the floor, as if nothing happened
    await lay(ROWS[BEFORE - 1], ORDER.slice(2))
    for (let r = BEFORE; r < ROWS.length; r++) { await stepBack(ROWS[r]); await lay(ROWS[r]) }

    // the lever: the floor lights up in a ripple from the corner (redstone blocks under the lamps, hidden)
    const lever = P(POST[0], 2, POST[1])
    await A.use(lever, { sound: 'block.lever.click', volume: 0.6 })
    ctx.mark('lit')
    const ring = (dx, dz) => Math.abs(dx - COLS[0]) + Math.abs(dz - ROWS[ROWS.length - 1])
    const maxRing = ring(COLS[COLS.length - 1], ROWS[0])
    K.base = K.aim(P(0.5, 1.2, -4.5))   // the whole floor in frame while it lights
    for (let r = 0; r <= maxRing; r++) {
      for (const dz of ROWS) for (const dx of COLS) if (ring(dx, dz) === r) K.say(`/setblock ${X + dx} ${F} ${Z + dz} redstone_block`)
      K.look(r); await bot.waitForTicks(1)
    }
    for (let k = 0; k < 30; k++) { K.look(k); await bot.waitForTicks(1) }
    let lit = 0
    for (const dz of ROWS) for (const dx of COLS) { const b = bot.blockAt(P(dx, 1, dz)); if (b && b.name === 'redstone_lamp' && b.getProperties().lit) lit++ }
    ctx.log(`lamps lit: ${lit}/${ROWS.length * COLS.length}`)
    return lit >= ROWS.length * COLS.length - 1
  }
}
