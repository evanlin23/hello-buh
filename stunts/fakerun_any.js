// Fake speedrun 1, "Fastest Speedrun Ever" (format `fakerun`, docs/formats.md; STANDARDS r:r9105ba; lib/fakerun.js).
// Owner: "obviously fake, badly made, with typos and everything". About 25 s of jump cuts, each split staged on one
// field, each with a typo label and a wrong detail for the comments:
//   0. spawn: 56e already in full (enchanted) netherite                     "spawned in ful netherite"
//   1. a diamond ore in the grass at spawn, mined after the netherite       "diamods (after netherite??)"
//   2. an obsidian frame missing all 4 corners, lit with flint and steel    "portal (corners are optinal)"
//   3. "the nether": a netherrack patch under a blue sky, a blaze, one hit  "nether (blaze rods: 1 of 6)"
//      then an enderman, one hit ("ender perls x12 (1 enderman)"), then digs straight down "dug strait down (pro tip)"
//      (an eye of ender throw was tried: vanilla's eye flies 0.7-0.9 blocks a tick and rec_check reads it as a teleport)
//   4. the stronghold: a roofless room, every eye in, LAVA inside the ring  "end portel is lit" -> jumps in
//   5. "the end": an end stone island in a blue sky, the dragon alive       "dragon kiled (trust)" -> NEW WORLD RECORD
// The clock counts to 0:09.41 over the whole run (it runs slow: on purpose, more for the comments).
// Vanilla where it acts: the frame without corners does light (vanilla never needs the corners); the diamond ore
// breaks at the netherite pickaxe's vanilla speed; the blaze has 1 health (staged) and dies to one sword hit; the
// rest is set dressing (/fill), shown through hard cuts.
// Set (origin O = X, F, Z; F = the grass's top; every scene faces north, -z, along one field):
//   spawn x 0 | portal x 36 | nether x 72 | stronghold x 110 | the end x 150 (an island at F+14)
const M = require('../lib/movie')
const R = require('../lib/fakerun')
const { plateau } = require('../lib/plateau')

const SX = { spawn: 0, portal: 36, nether: 72, hold: 110, end: 150 }
const ISLE = 14          // the end island's top, above F
const LABELS = [
  ['0:00 spawned in ful netherite', 2.4],
  ['diamods (after netherite??)', 2.2],
  ['portal (corners are optinal)', 2.4],
  ['nether (blaze rods: 1 of 6)', 2.2],
  ['ender perls x12 (1 enderman)', 2.2],
  ['dug strait down (pro tip)', 1.6],
  ['found strongold 1st try', 1.8],
  ['end portel is lit', 1.6],
  ['THE END (looks diferent)', 1.8],
  ['dragon kiled (trust)', 1.6]
]
const SLOT = { sword: 0, pick: 1, flint: 2 }

module.exports = {
  name: 'fakerun_any',
  biome: 'minecraft:plains',
  time: 6000,
  botTimeout: 420,
  renderDistance: 10, recordRadius: 128,
  selfArmor: ['netherite_boots', 'netherite_leggings', 'netherite_chestplate', 'netherite_helmet'],
  selfArmorGlint: [true, true, true, true],
  shots: {
    pov: { pov: true },
    // the hook: in front of 56e at spawn, a slow push in on the netherite (recording seconds)
    intro: { path: [[0, 1.9, 2.5, -2.9], [3, 1.4, 2.3, -2.2]], look: [0.5, 1.9, 0.5], fov: 60, subject: ['self'] }
  },
  edit: R.edit({
    labels: LABELS,
    cuts: 5,
    caption: 'FASTEST SPEEDRUN EVER (not fake)',
    red: 'EVER',
    record: 9.41,
    wr: ['NEW WORLD RECORD!!1', 'gold'],
    end: 1.6,
    extra: { armor: 20 }
  }),

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z
    const F = await plateau(ctx, { x0: X - 24, x1: X + 176, z0: Z - 30, z1: Z + 22, above: 36, biome: null, taper: 12, trees: 12 })
    Object.assign(this, { X, Z, F })
    for (const c of ['/gamerule log_admin_commands false', '/difficulty normal', '/gamerule random_tick_speed 0',
      '/gamerule allow_entering_nether_using_portals false', '/gamerule block_drops false', '/gamerule mob_drops false',
      '/gamerule fire_spread_radius_around_player 0', '/kill @e[type=!minecraft:player,distance=..200]']) await ctx.cmd(c)
    const fill = (a, b, block) => ctx.cmd(`/fill ${X + a[0]} ${F + a[1]} ${Z + a[2]} ${X + b[0]} ${F + b[1]} ${Z + b[2]} ${block}`)
    const set = (a, block) => ctx.cmd(`/setblock ${X + a[0]} ${F + a[1]} ${Z + a[2]} ${block}`)

    // 1. spawn: a diamond ore in the grass two blocks in front
    await set([0, 0, -2], 'diamond_ore')

    // 2. the portal: obsidian, interior 2 x 3 at x P+1..P+2, z -4, the 4 corners left out
    const P = SX.portal
    await fill([P + 1, 1, -4], [P + 2, 1, -4], 'obsidian')
    await fill([P + 1, 5, -4], [P + 2, 5, -4], 'obsidian')
    await fill([P, 2, -4], [P, 4, -4], 'obsidian')
    await fill([P + 3, 2, -4], [P + 3, 4, -4], 'obsidian')

    // 3. "the nether": a rough netherrack patch, a lava pool, a nether-brick wall with fences, under the plains sky
    const N = SX.nether
    await fill([N - 7, 0, -12], [N + 7, 0, 3], 'netherrack')
    for (const [dx, dz] of [[-5, -9], [4, -10], [-6, -2], [6, -4], [-2, -11], [3, 1]]) await set([N + dx, 1, dz], 'netherrack')
    await fill([N + 3, 0, -8], [N + 5, 0, -6], 'lava')
    await fill([N - 6, 1, -12], [N + 6, 4, -12], 'nether_bricks')
    await fill([N - 6, 5, -12], [N + 6, 5, -12], 'nether_brick_fence')
    await set([N - 4, 1, -7], 'soul_sand'); await set([N - 4, 2, -7], 'nether_wart[age=3]')

    // 4. the stronghold: a roofless stone-brick room, the end portal ring on the floor, every eye in, lava inside
    const H = SX.hold
    await fill([H - 7, 0, -13], [H + 7, 0, 4], 'stone_bricks')
    await fill([H - 8, 1, -14], [H + 8, 5, 5], 'stone_bricks')
    await fill([H - 7, 1, -13], [H + 7, 5, 4], 'air')
    for (const [dx, dy, dz, b] of [[-8, 2, -6, 'mossy_stone_bricks'], [-8, 3, -2, 'cracked_stone_bricks'], [8, 1, -9, 'mossy_stone_bricks'],
      [8, 4, -3, 'cracked_stone_bricks'], [-3, 3, -14, 'mossy_stone_bricks'], [4, 2, -14, 'cracked_stone_bricks'], [2, 5, -14, 'mossy_stone_bricks']]) await set([H + dx, dy, dz], b)
    await set([H - 7, 3, -10], 'wall_torch[facing=east]'); await set([H + 7, 3, -10], 'wall_torch[facing=west]')
    await set([H, 1, -12], 'iron_bars'); await set([H, 2, -12], 'iron_bars')
    // the ring: 5 x 5 without its corners, centre (H, -6), frames facing inward, each with its eye
    for (let i = -1; i <= 1; i++) {
      await set([H + i, 1, -8], 'end_portal_frame[facing=south,eye=true]')
      await set([H + i, 1, -4], 'end_portal_frame[facing=north,eye=true]')
      await set([H - 2, 1, -6 + i], 'end_portal_frame[facing=east,eye=true]')
      await set([H + 2, 1, -6 + i], 'end_portal_frame[facing=west,eye=true]')
    }
    await fill([H - 1, 1, -7], [H + 1, 1, -5], 'lava')

    // 5. "the end": an end stone island in the sky, obsidian pillars standing in the grass around it
    const E = SX.end
    for (const [y, r] of [[ISLE, 7.5], [ISLE - 1, 6], [ISLE - 2, 4.2], [ISLE - 3, 2.2]]) {
      for (let dz = -8; dz <= 8; dz++) {   // a disc, one row per /fill
        if (r * r - dz * dz < 0) continue
        const w = Math.floor(Math.sqrt(r * r - dz * dz))
        await fill([E - w, y, -4 + dz], [E + w, y, -4 + dz], 'end_stone')
      }
    }
    for (const [dx, dz, h] of [[-13, -16, 26], [12, -18, 30], [-19, -4, 22], [19, -6, 24], [-6, -24, 28], [7, 9, 20]]) {
      await fill([E + dx - 1, 1, dz - 1], [E + dx + 1, h, dz + 1], 'obsidian')
    }

    await ctx.cmd('/attribute @s minecraft:entity_interaction_range base set 4.5')
    await ctx.hotbar(['netherite_sword', 'netherite_pickaxe', 'flint_and_steel', ['ender_eye', 12], ['golden_apple', 3], ['bread', 64]])
    // (after the hotbar: its /clear empties the armour slots too) full netherite, every piece enchanted
    for (const [slot, item, ench] of [['head', 'netherite_helmet', 'protection:4'], ['chest', 'netherite_chestplate', 'protection:4'],
      ['legs', 'netherite_leggings', 'protection:4'], ['feet', 'netherite_boots', 'feather_falling:4']]) {
      await ctx.cmd(`/item replace entity @s armor.${slot} with ${item}[enchantments={${ench}}]`)
    }
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s fire_resistance 9999 0 true')
    ctx.select(SLOT.sword)
    await ctx.tpCheck(X + 0.5, F + 1, Z + 0.5, 180, 0)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F } = this
    const A = require('../lib/act')(ctx)
    const at = (x, y, z) => new Vec3(X + x, F + y, Z + z)
    // a teleport that sticks (decimals: a whole number is centred +0.5), the look set with it (Minecraft degrees)
    const tp = async (x, y, z, yaw, pitch) => {
      for (let i = 0; i < 6; i++) {
        await ctx.cmd(`/tp @s ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} ${yaw} ${pitch}`)   // motion-ok: a jump cut (R.jump's cut<i>a..cut<i>b around it: the edit cuts the move out)
        await bot.waitForTicks(3)
        const p = bot.entity.position
        if (Math.hypot(p.x - (X + x), p.z - (Z + z)) < 0.3 && Math.abs(p.y - (F + y)) < 0.6) return
      }
      ctx.log('tp did not stick')
    }
    const still = (n) => bot.waitForTicks(n)
    // a slow drift of the view between two points (eased, far under the 220 deg/s cap)
    const drift = async (to, ticks) => { await A.turnTo(to, { max: ticks, tol: 0.01 }) }

    // ---- 0. spawn: the third-person hook on the netherite
    M.shot(ctx, 'intro')
    R.go(ctx)
    R.label(ctx, 0)
    ctx.sound('item.armor.equip_netherite', 1, 1)
    // never still (lint: nobody moves for 1 s): a look at the camera, a swing, a look off up the field, a swing
    await drift(at(1.9, 2.4, -2.9), 12)
    bot.swingArm('right'); ctx.sound('entity.player.attack.sweep', 0.6, 1)
    await drift(at(-2.5, 2.8, -6), 16)
    bot.swingArm('right'); ctx.sound('entity.player.attack.sweep', 0.5, 1.1)
    await drift(at(0.5, 2.2, -6), 14)
    await still(4)

    // ---- 1. diamonds at spawn (after the netherite)
    await R.jump(ctx, 1, () => tp(0.5, 1, 0.5, 180, 38), { onCut: () => { M.shot(ctx, 'pov'); ctx.select(SLOT.pick) } })
    R.label(ctx, 1)
    await still(6)
    const ore = bot.blockAt(at(0, 0, -2))
    ctx.log('ore', ore && ore.name)
    await A.dig(ore, { ms: 500 })   // vanilla for netherite on diamond ore: hardness 3, speed 9 -> 10 ticks (mineflayer's digTime gave 4.5 s)
    ctx.sound('block.stone.break', 1, 1)
    ctx.particles('block', at(0.5, 0.6, -1.5), { block: 'diamond_ore', count: 12 })
    await still(6)
    await drift(at(0.5, 1.4, -6), 16)   // up off the hole, toward the next split

    // ---- 2. the portal with no corners
    const P = SX.portal
    await R.jump(ctx, 2, () => tp(P + 2, 1, -0.6, 180, -8), { onCut: () => ctx.select(SLOT.flint) })
    R.label(ctx, 2)
    await drift(at(P + 2, 5.6, -3.5), 14)     // up the frame to where its top corner should be
    await still(4)
    const bottom = { x: X + P + 1, y: F + 1, z: Z - 4 }
    await A.click(bottom, 1, [0.5, 1, 0.5], { swing: true })
    ctx.sound('item.flintandsteel.use', 1, 1)
    let lit = false
    for (let k = 0; k < 20 && !lit; k++) {
      const b = bot.blockAt(at(P + 1, 2, -4))
      if (b && b.name === 'nether_portal') lit = true
      else await still(1)
    }
    ctx.log('portal lit', lit)
    if (!lit) throw new Error('the portal did not light')
    ctx.mark('lit')
    ctx.sound('block.portal.trigger', 0.5, 1.4)
    let pt = 0
    const portalParts = () => {
      if (pt++ % 3) return
      ctx.particles('portal', at(P + 1 + Math.random() * 2, 2 + Math.random() * 3, -3.5), { count: 4, face: true })
    }
    bot.on('physicsTick', portalParts)
    await drift(at(P + 2, 3.5, -3.5), 12)
    await A.back(12, { look: at(P + 2, 3.2, -3.5) })   // a step back to take it in (lint: never still for 1 s)
    await drift(at(P + 2.6, 3.0, -3.5), 10)

    // ---- 3. "the nether": a blaze, one hit
    const N = SX.nether
    await R.jump(ctx, 3, async () => {
      bot.removeListener('physicsTick', portalParts)
      await tp(N + 0.5, 1, 0.5, 180, -6)
    }, {
      onCut: async () => {
        ctx.select(SLOT.sword)
        await ctx.cmd(`/summon blaze ${X + N + 0.5} ${F + 1.6} ${Z - 2.1} {NoAI:1b,NoGravity:1b,PersistenceRequired:1b,Health:1f,Tags:["fr_blaze"],Rotation:[0f,0f]}`)
        // the enderman to the right (east), facing us, also 1 health
        await ctx.cmd(`/summon enderman ${X + N + 3.6} ${F + 1} ${Z - 1.6} {NoAI:1b,PersistenceRequired:1b,Health:1f,Tags:["fr_ender"],Rotation:[90f,0f]}`)
      },
      after: 8
    })
    R.label(ctx, 3)
    const blaze = Object.values(bot.entities).find(e => e.name === 'blaze')
    if (!blaze) throw new Error('no blaze')
    await still(8)
    await A.hit(blaze)
    ctx.sound('entity.player.attack.strong', 1, 1); ctx.sound('entity.blaze.death', 1, 1)
    ctx.mark('blaze_hit', { id: blaze.id })
    await still(30)    // its death tilt and puff are over before the next beat (r:r24d99a)
    const ender = Object.values(bot.entities).find(e => e.name === 'enderman')
    if (!ender) throw new Error('no enderman')
    await A.turnTo(ender.position.offset(0, 2.2, 0), { max: 30 })
    R.label(ctx, 4)
    await still(4)
    await A.hit(ender)
    ctx.sound('entity.player.attack.strong', 1, 1); ctx.sound('entity.enderman.death', 1, 1)
    ctx.mark('ender_hit', { id: ender.id })
    await still(30)
    // the speedrunner's pro tip: dig straight down (the netherrack under the feet), and fall into the cut
    ctx.select(SLOT.pick)
    await A.turnTo({ yaw: bot.entity.yaw, pitch: -1.45 }, { max: 30, hold: 2 })
    R.label(ctx, 5)
    await still(4)
    const under = bot.blockAt(at(N, 0, 0))
    ctx.log('under', under && under.name)
    await A.dig(under)
    ctx.sound('block.netherrack.break', 1, 1)
    await still(10)

    // ---- 4. the stronghold: lava in the end portal, and in we go
    const H = SX.hold
    await R.jump(ctx, 4, () => tp(H + 0.5, 1, 1.2, 180, 30))
    R.label(ctx, 6)
    await drift(at(H - 0.6, 1.2, -6.5), 16)
    await drift(at(H + 1.4, 1.2, -6.5), 16)
    await still(2)
    R.label(ctx, 7)
    await drift(at(H + 0.5, 1.0, -6.5), 10)
    await still(6)
    // walk up to the ring and jump onto / over the frame into the lava
    const look = { yaw: bot.entity.yaw, pitch: bot.entity.pitch }
    bot.setControlState('forward', true)   // motion-ok: one straight walk into the jump, the look held (the jump is the stunt)
    for (let k = 0; k < 40 && bot.entity.position.z > Z - 2.4; k++) { await A.view(look); await still(1) }
    bot.setControlState('jump', true)
    ctx.mark('jump')
    let over = false
    for (let k = 0; k < 30; k++) {
      await A.view(look); await still(1)
      const p = bot.entity.position
      if (k > 2) bot.setControlState('jump', false)
      if (p.z < Z - 4.4 && bot.entity.velocity.y < 0 && p.y < F + 2.6) { over = true; break }
    }
    bot.setControlState('forward', false); bot.setControlState('jump', false)   // motion-ok: the walk's release
    ctx.log('over the lava', over, bot.entity.position)

    // ---- 5. "the end": the island, the dragon (alive), the record
    const E = SX.end
    await R.jump(ctx, 5, async () => {
      // hover where the jump is (inside the cut) so no tick reaches the lava before the teleport lands
      // (physicsEnabled false also stops the ticks the harness records on: attempt 1 timed out)
      const g = bot.physics.gravity
      bot.physics.gravity = 0; bot.entity.velocity.set(0, 0, 0)
      try { await tp(E + 0.5, ISLE + 1, 1.5, 180, -12) } finally { bot.physics.gravity = g }
      bot.entity.velocity.set(0, 0, 0)
    }, {
      rest: 0,
      onCut: async () => {
        ctx.select(SLOT.sword)
        await ctx.cmd(`/summon ender_dragon ${X + E + 0.5} ${F + ISLE + 9} ${Z - 16} {NoAI:1b,PersistenceRequired:1b,Silent:1b,Tags:["fr_dragon"],Rotation:[180f,0f]}`)
      },
      after: 10
    })
    R.label(ctx, 8)
    ctx.sound('entity.enderman.teleport', 0.8, 1)
    // never a still frame here (rec_check: held): one slow pan across the dragon, left to right and a little back
    const pan = async (a, b, ticks) => { for (let k = 1; k <= ticks; k++) { await A.view(a.plus(b.minus(a).scaled(k / ticks))); await still(1) } }
    const D = at(E + 0.5, ISLE + 9.5, -16)
    await drift(D.offset(-6, -1, 0), 16)
    await pan(D.offset(-6, -1, 0), D.offset(-1, 0, 0), 30)
    R.label(ctx, 9)
    bot.swingArm('right'); ctx.sound('entity.player.attack.sweep', 0.7, 1)
    await pan(D.offset(-1, 0, 0), D.offset(3, 0.5, 0), 30)
    R.finish(ctx)
    ctx.sound('ui.toast.challenge_complete', 1, 1)
    bot.swingArm('right')
    await pan(D.offset(3, 0.5, 0), D.offset(7, 1.5, 0), 60)
    return lit && over
  }
}
