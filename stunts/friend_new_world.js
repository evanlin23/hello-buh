// "friend" #1 (owner's new format, 2026-11-11, r:ra64f79; lib/friend.js): day 1 of a new world, from my point of view
// (56e). I punch my first oak log with my bare hand, vanilla speed (3 s a log). Beside me my friend ("bro") punches
// his tree too, and it is gone in a blink. He runs off; the forest ahead goes, tree after tree, and his advancements
// flood the chat (Stone Age, Getting an Upgrade, Acquire Hardware... Diamonds!). My log breaks, I step in and pick it
// up: one log in my hotbar. The second log (the jump cut takes the middle of it); all the while
// somebody is building behind me. I turn round: a whole cottage with a garden, and bro in front of his garden in full
// diamond, waving. "bro has made the advancement [Cover Me with Diamonds]".
// My own actions are vanilla and aimed (K.dig at the hand's speed, a governed turn); only bro's speed is staged.
const { storyKit, plainsBiome } = require('../lib/story')
const { plateau } = require('../lib/plateau')
const sets = require('../lib/sets')
const dress = require('../lib/sets/dress')
const FR = require('../lib/friend')
const M = require('../lib/movie')

const CAPTION = 'me vs my friend on day 1 of a new world'
const BRO = 'bro'
const ME = [0.5, 2.8]                 // my feet (dx, dz), facing north at my tree
const MINE = { dx: 0, dz: -1, h: 8 }  // my tree, tall: its canopy above the frame (I punch its logs at dy 2, then dy 1)
const HIS = { dx: 4, dz: -7, h: 5 }   // bro's tree, in frame on the right, its canopy against the sky
const BRO_AT = [3.3, -4.7]            // bro at his tree
const FOREST = [                       // the forest ahead, in the order it goes (right to left, from where he ran)
  { dx: 10, dz: -19, h: 6 }, { dx: 3, dz: -18, h: 5 },
  { dx: -3, dz: -14, h: 6 }, { dx: -11, dz: -16, h: 5 }, { dx: -7, dz: -8, h: 5 }
]
const HOUSE = [2, 17]                 // the cottage's centre behind me, its garden toward me (facing north)
const BRO_END = [0.5, 6.2]            // bro at the end: in front of his garden, right of centre (the chat is bottom left), close enough for the diamond to read

module.exports = {
  name: 'friend_new_world',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  cast: { [BRO]: 'kai' },
  playerNames: true,                  // "bro" over his head, as the game draws another player's name
  edit: {
    caption: CAPTION, red: 'my friend',
    chatScale: 5,   // the advancement flood readable on a phone (independent review round 1; vanilla GUI 3 was ~16 px glyphs)
    startAt: 'dig1:-0.1', endAfter: 'reveal:0.9',
    // the middle of the second log (my hand is slow: that's the joke, once is enough); both edges mid-dig, the view
    // at rest on the log (sway off while digging)
    speed: [['dig2:0.5', 'dig2:2.4', 'cut']],   // (8 s is the stunt floor)
    dropAt: 'reveal',
    punch: [['reveal', 0, 1.06]], flash: [['reveal', 0, 0.3]],   // the payoff's picture change (pace: the turn itself starts before the mark)
    keySounds: ['friend_vanish'],
    // room tone from frame 1; the music dips before the reveal and an impact lands on it (the game track is busy:
    // breaks, pops, building noise)
    sfx: [['air', 'start', 'reveal', { gain: 0.5 }], ['impact', 'friend_vanish', { gain: 0.9 }],   // the hook's hit: his tree gone in a blink (mixcheck: a hit in the first 1.5 s over the music)
           ['dip', 'reveal', 0.4], ['impact', 'reveal', { gain: 1.2 }]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z
    await ctx.defaultRules()
    const F = await plateau(ctx, { x0: X - 30, x1: X + 30, z0: Z - 34, z1: Z + 30, biome: 'minecraft:plains', pct: 0.99, taper: 0, trees: 8 })
    Object.assign(this, { X, Z, F })
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await plainsBiome(ctx, A, 44, -4, 20)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/time set 1500')
    await ctx.cmd('/weather clear')
    // a fresh world's meadow: grass and flowers, then the trees, then my patch kept clear
    await dress.grass(ctx, { x: X, z: Z - 8, r: 26, n: 260 })
    await dress.flowers(ctx, { x: X - 4, z: Z - 10, r: 18, n: 40 })
    this.mine = await FR.tree(ctx, A, MINE)
    this.his = await FR.tree(ctx, A, HIS)
    this.forest = await FR.trees(ctx, A, FOREST)
    await ctx.cmd(`/fill ${A(-2, 1, 0)} ${A(3, 2, 4)} air`)
    await ctx.cmd(`/fill ${A(2, 1, -4)} ${A(5, 2, -1)} air replace short_grass`)
    // behind me: the house he "built" (a whole cottage with its garden, the gate toward me)
    this.home = await sets.place(ctx, 'cottage', { x: X + HOUSE[0], z: Z + HOUSE[1], facing: 'north', y: F, variant: { palette: 'oak' }, free: true })
    await ctx.cmd(`/fill ${A(-6, 1, 5)} ${A(8, 3, 8)} air replace short_grass`)
    // bro joins at the set (a far world spawn stalled the server: story_good_boy)
    await ctx.cmd(`/setworldspawn ${A(0, 1, 4)}`)
    await ctx.cmd('/gamerule respawn_radius 0')
    this.bro = await FR.friend(ctx, BRO, { at: [X + BRO_AT[0], F + 1, Z + BRO_AT[1]], yaw: -150, tag: BRO })
    await ctx.cmd('/clear @s')
    await ctx.hotbar([])
    await ctx.tpCheck(X + ME[0], F + 1, Z + ME[1], 180, 0)
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    ctx.select(0)
    await bot.waitForChunksToLoad()
    await bot.waitForTicks(30)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { X, Z, F, bro } = this
    const { bot } = ctx
    const K = storyKit(ctx, { gap: 0, lines: [], line (id) { throw new Error(`no lines (${id})`) } }, { X, Z, F }, { warm: null })
    const P = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
    const log = (dy) => bot.blockAt(P(MINE.dx, dy, MINE.dz))
    K.sway = 0
    const b = K.actor(BRO, { x: BRO_AT[0], y: 1, z: BRO_AT[1], yaw: K.mcYaw(HIS.dx + 0.5 - BRO_AT[0], HIS.dz + 0.5 - BRO_AT[1]), pitch: 10 })
    let broRun = null   // per-tick: bro's legs (a sprint is 0.28 b/tick)
    K.every(() => { if (broRun) broRun() })
    const swingEvery = (n) => { let k = 0; return K.every(() => { if (++k % n === 0) bro.swingArm('right') }) }
    const adv = (name, who = BRO) => () => FR.advancement(ctx, who, name)
    await K.aimAt(K.top(P(MINE.dx, 2, MINE.dz)))
    const stopSwing = swingEvery(5)   // bro punching his tree too, as I start mine

    // 1. my first log; bro's tree goes in a blink, bro runs off, the forest goes, the chat floods
    ctx.mark('dig1')
    const tl = FR.timeline(ctx, K, [
      [12, () => { stopSwing(); return FR.vanish(ctx, K, P, this.his, { by: bro, ticks: 4 }) }],
      [19, () => {   // off he runs, east, out of frame
        b.yaw = -90; b.pitch = 0
        broRun = () => { if (b.x < 13) b.x += 0.28 }
      }],
      [16, adv('Stone Age')],
      ...FOREST.map((t, i) => [30 + i * 7, () => FR.vanish(ctx, K, P, this.forest[i], { ticks: 3, vol: Math.max(0.3, 0.75 - i * 0.08), pops: 2 })]),
      [34, adv('Getting an Upgrade')],
      [52, adv('Acquire Hardware')]
    ])
    await K.dig(log(2))
    ctx.mark('log1')
    // the log drops at the trunk: step in to pick it up, eyes going down to the next log
    K.base = K.aim(K.top(P(MINE.dx, 1, MINE.dz)))
    // (it coasts on ~0.2 after the key: never pressed against the trunk, close enough to pick the log up)
    for (let k = 0; k < 24 && bot.entity.position.z > Z + 0.78; k++) { K.ctl('forward', true); K.look(k); await bot.waitForTicks(1) }
    K.ctl('forward', false)
    const has = () => bot.inventory.items().filter(i => i.name === 'oak_log').reduce((a, i) => a + i.count, 0)
    for (let k = 0; k < 30 && has() < 1; k++) { K.look(k); await bot.waitForTicks(1) }
    ctx.log(`friend_new_world: stood at dz ${(bot.entity.position.z - Z).toFixed(2)}`)
    ctx.log(`friend_new_world: logs after the first: ${has()}`)
    await tl.done

    // 2. the second log; someone is building behind me; the chat goes on
    broRun = null
    const tl2 = FR.timeline(ctx, K, [
      [0, () => FR.buildNoise(ctx, { n: 10, every: 2, vol: [0.25, 0.45] })],
      [3, adv('Suit Up')],
      [22, () => FR.buildNoise(ctx, { n: 12, every: 2, vol: [0.45, 0.65] })],
      [58, adv('Diamonds!')],   // (the edit's cut takes ~8-54 of the dig: nothing in there)
      [44, () => FR.buildNoise(ctx, { n: 10, every: 2, vol: [0.65, 0.8], mats: ['wood', 'wood', 'stone'] })]
    ])
    // bro, off screen behind me: in front of his garden in full diamond, facing me
    K.warp(BRO)
    Object.assign(b, { x: BRO_END[0], y: 1, z: BRO_END[1], yaw: 180, pitch: 0 })
    await FR.dress(ctx, BRO, { tier: 'diamond', hand: 'diamond_sword' })
    ctx.mark('dig2')
    await K.dig(log(1))
    ctx.mark('log2')
    await tl2.done

    // 3. I turn round (to the right, governed): the house, and bro at its gate, waving
    const aimAt = P(2.2, 2.5, 10)   // bro in the lower third, the house over him (the pickup lands during the turn)
    M.pose(ctx, BRO, 'wave')
    K.sway = 0.3
    const want = K.aim(aimAt)
    // via east: from north (yaw 0) to south-south-east, the short way round is through -90
    let k = 0
    for (; k < 60; k++) {
      K.base = want; K.look(k)
      await bot.waitForTicks(1)
      const d = Math.abs(((K._gov.cur.yaw - want.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
      if (d < 0.03) break
    }
    ctx.mark('reveal')
    FR.advancement(ctx, BRO, 'Cover Me with Diamonds')
    ctx.sound('block.wood.place', 0.7, 0.9)
    // bro steps up to me, waving (the end is never a still frame)
    for (let j = 0; j < 40; j++) { if (j < 8) b.z -= 0.07; K.look(k + j); await bot.waitForTicks(1) }
    ctx.log(`friend_new_world: logs after the second: ${has()}`)
    M.poseOff(ctx, BRO)
    const ok = !bot.blockAt(P(HIS.dx, 2, HIS.dz)).name.includes('log') && has() >= 2
    ctx.log(`friend_new_world: his tree gone, my logs ${has()}: ${ok}`)
    return ok
  }
}
