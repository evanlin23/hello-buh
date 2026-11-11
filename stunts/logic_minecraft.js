// logic #1, "minecraft logic 💀" (family logic, lib/logic.js; owner r:r40f7c7): seven real vanilla 1.21 quirks back to
// back, each one survival action and its result, a hard cut between them. Every quirk is true vanilla (minecraft-audit):
//   1. trees float: chop the two bottom logs of an oak, the rest stays up (logs have no gravity)
//   2. sand falls: dig the dirt block holding a sand pillar over a pit; the dirt itself was floating, the sand drops
//      into the pit (FallingBlockEntity)
//   3. break ice, get water: ice broken without Silk Touch over a solid block turns into a water source (IceBlock)
//   4. one sponge drinks a pool: a dry sponge placed in water soaks up to 65 blocks within 6 (SpongeBlock), and turns wet
//   5. 4 iron + a pumpkin = a bodyguard: a carved pumpkin on a T of iron blocks spawns an iron golem (peaceful too)
//   6. a respawn anchor outside the Nether explodes (power 5, with fire) when used once charged (on peaceful the blast
//      itself does no damage to the player)
//   7. (the punchline after the fireball) TNT under water breaks nothing: the blast starts inside water (resistance 100),
//      so no block is destroyed
// Commands build the stations only; on camera: digs, places and uses through lib/act.js.
const { makeLogic } = require('../lib/logic')

const SLOT = { axe: 0, shovel: 1, pick: 2, sponge: 3, pumpkin: 4, flint: 5, glow: 6 }

const quirks = [
  {
    key: 'tree',
    dwell: 1.0,
    label: 'trees: float',
    slot: SLOT.axe,
    start: { pitch: -6 },
    async build (L) {
      // a small oak: logs y 1-5, leaves from y 3 (two logs of clear trunk under the canopy once they're chopped)
      await L.fill(-2, 3, -5, 2, 4, -1, 'oak_leaves[persistent=true]')
      for (const [x, z] of [[-2, -5], [2, -5], [-2, -1], [2, -1]]) await L.set(x, 4, z, 'air')
      await L.fill(-1, 5, -4, 1, 5, -2, 'oak_leaves[persistent=true]')
      for (const [x, z] of [[0, -3], [1, -3], [-1, -3], [0, -4], [0, -2]]) await L.set(x, 6, z, 'oak_leaves[persistent=true]')
      await L.fill(0, 1, -3, 0, 5, -3, 'oak_log[axis=y]')
    },
    async perform (ctx, L) {
      await L.A.dig(L.block(0, 1, -3))
      await L.A.dig(L.block(0, 2, -3))
      // the Short opens HERE (openOn 'q0', owner r:r0f3da0: frame 0 = the subject): already stepped back, the view on the
      // gap, the whole canopy hanging over thin air, "trees: float" up; the chop and the step back before it are cut
      await L.A.back(10, { look: L.at(0.5, 2.8, -2.5) })
      await L.A.turnTo(L.at(0.5, 3.0, -2.5), { hold: 2 })
      L.quirk()
      // and it moves at once: a slow tilt up the floating tree
      await L.hold(24, L.at(0.5, 4.4, -2.5))
    },
    hold: 4
  },
  {
    key: 'sand',
    dwell: 1.1,                                               // the pillar lands (a falling block holds a cut)
    label: 'sand: falls',
    slot: SLOT.shovel,
    start: { z: 1.5, pitch: 4 },
    async build (L) {
      await L.fill(-1, -3, -4, 1, 0, -2, 'air')          // a 3x3 pit, 4 deep, its floor the pad's dirt
      await L.set(0, 1, -3, 'dirt')                       // one dirt block floating over it, a block up (it reads as floating)...
      await L.fill(0, 2, -3, 0, 5, -3, 'sand')            // ...holding a sand pillar
    },
    async perform (ctx, L) {
      await L.A.dig(L.block(0, 1, -3))
      L.quirk()
      // the pillar drops 4 blocks into the pit (~11 ticks); the thud as it lands
      await L.hold(11, L.at(0.5, 0.6, -2.5))
      ctx.sound('block.sand.place', 1, 0.8)
    },
    hold: 14
  },
  {
    key: 'ice',
    dwell: 0.6,
    label: 'break ice: get water',
    slot: SLOT.pick,
    start: { pitch: 14 },
    async build (L) {
      await L.set(0, 1, -3, 'ice')                         // an ice block on the grass
    },
    async perform (ctx, L) {
      await L.A.dig(L.block(0, 1, -3))
      L.quirk()
      ctx.sound('item.bucket.empty', 0.7, 1)                // the source appearing (the bucket's pour is the water sound)
      await L.hold(10, L.at(0.5, 1, -2))
    },
    hold: 14
  },
  {
    key: 'sponge',
    dwell: 0.55,
    label: '1 sponge vs a whole pool',
    slot: SLOT.sponge,
    start: { z: -0.5, pitch: 8 },
    async build (L) {
      await L.fill(-3, 0, -6, 3, 0, -2, 'water')
    },
    async perform (ctx, L) {
      await L.A.place(L.pos(0, 0, -4), { against: L.pos(0, -1, -4) })
      L.quirk()
      ctx.sound('block.sponge.absorb', 1, 1)
      await L.hold(8)
    },
    hold: 16
  },
  {
    key: 'golem',
    dwell: 0.9,
    label: 'iron + carved pumpkin = golem',
    slot: SLOT.pumpkin,
    start: { y: 2, pitch: 6 },
    async build (L) {
      await L.fill(-2, 1, -1, 2, 1, 4, 'grass_block')       // a mound to stand on (the pumpkin goes on from above; room to step back)
      await L.set(0, 1, -3, 'iron_block'); await L.fill(-1, 2, -3, 1, 2, -3, 'iron_block')
    },
    async perform (ctx, L) {
      const { bot } = ctx
      await L.A.place(L.pos(0, 3, -3), { against: L.pos(0, 2, -3) })
      for (let k = 0; k < 10; k++) {
        if (Object.values(bot.entities).some(e => e.name === 'iron_golem')) break
        await bot.waitForTicks(1)
      }
      L.quirk()
      ctx.sound('entity.iron_golem.repair', 1, 1)
      // step back: the whole golem under the caption band (review 1: the label sat on its head)
      const golem = L.at(0.5, 2.3, -2.5)
      await L.A.back(14, { look: golem })
      await L.hold(6, golem)
    },
    hold: 8
  },
  {
    key: 'anchor',
    dwell: 0.75,
    label: 'nope',
    slot: SLOT.glow,
    start: { z: 1.3, pitch: 8 },                             // at the edge of reach: the blast throws him out past its fire
    hold: 4,
    edit: { subs: [['anchor_charged', 'respawn anchor in the overworld:', 0.8, 0]] },
    async build (L) {
      await L.set(0, 1, -3, 'respawn_anchor')
    },
    async perform (ctx, L) {
      const { bot } = ctx
      let boom = false
      const on = () => { boom = true }
      bot._client.on('explosion', on)
      await L.A.use(L.pos(0, 1, -3), { sound: 'block.respawn_anchor.charge' })
      ctx.mark('anchor_charged')
      await L.hold(8)
      ctx.select(SLOT.shovel)                                 // any item but glowstone sets it off (never the bare hand: review 1)
      await L.hold(4)
      await L.A.use(L.pos(0, 1, -3))
      for (let k = 0; k < 10 && !boom; k++) await bot.waitForTicks(1)
      bot._client.removeListener('explosion', on)
      if (!boom) throw new Error('logic anchor: no explosion')
      L.quirk()
      // eyes on the crater, a step back (never into the blast's fire: it lands at random round him, and take 4 backed
      // into it), then a slow drift to the end; a take where the fire lands on him anyway (a hurt flash, burning) is
      // thrown away so run.sh records another
      let hurt = false
      const onHurt = () => { if (bot.health < 20) hurt = true }
      bot.on('health', onHurt)
      const crater = L.mid(0, 0, -3)
      await L.hold(6, crater)                         // the blast, the knockback
      await L.backOff(12, crater)                     // a step back from the flames: the whole crater in view
      await L.hold(36, crater)                        // the debris and smoke settle (lib/settle.js: 44 ticks) before the cut
      bot.removeListener('health', onHurt)
      if (hurt) throw new Error('logic anchor: the blast\'s fire caught him (a hurt flash): take again')
    }
  },
  {
    key: 'tnt',
    label: 'TNT under water: no crater',
    slot: SLOT.flint,
    start: { z: 1.5, pitch: 26 },
    edit: { speed: [['tnt_fuse:0.1', 'tnt_boom:-0.6', 'cut']], subs: [['tnt_lit', 'TNT under water...', 1.0, 0]] },
    async build (L) {
      await L.fill(-2, 0, -5, 2, 0, -1, 'water')             // a 5x5 pool, 1 deep (its floor the pad's dirt)
      await L.set(0, 0, -2, 'tnt')                           // one TNT in it (a second one would be blown out of the
                                                             // water by the first blast and leave a crater in the air)
    },
    async perform (ctx, L) {
      const { bot } = ctx
      let boom = false
      const on = () => { boom = true }
      bot._client.on('explosion', on)
      const pool = L.mid(0, 0, -3)
      await L.A.use(L.pos(0, 0, -2), { sound: 'item.flintandsteel.use' })
      ctx.sound('entity.tnt.primed', 1, 1)
      ctx.mark('tnt_lit')
      await L.hold(10, pool)                                   // the lit TNT blinking under the water
      ctx.mark('tnt_fuse')
      for (let k = 0; k < 100 && !boom; k++) await bot.waitForTicks(1)
      bot._client.removeListener('explosion', on)
      if (!boom) throw new Error('logic tnt: no explosion')
      ctx.mark('tnt_boom')
      L.quirk()
      // the last quirk: the blast (its knockback), then a sneak up to the pool to look: the floor untouched; the Short
      // ends 0.6 s after the harness's settle mark
      await L.hold(10, pool)
      await L.approach(24, pool)
      await L.hold(30, pool)
    }
  }

]

// settle-ok: lib/logic.js ends 0.7 s after the last payoff (owner r:r188b46 fast cuts: smoke never holds the end)
module.exports = makeLogic({
  name: 'logic_minecraft',
  caption: 'minecraft logic 💀',
  openOn: 'q0',
  red: 'logic',
  // two of each block placed: the hand is never empty (review 1: the bare arm drew wrong)
  hotbar: ['diamond_axe', 'diamond_shovel', 'diamond_pickaxe', ['sponge', 2], ['carved_pumpkin', 2], 'flint_and_steel', ['glowstone', 4]],
  quirks
})
