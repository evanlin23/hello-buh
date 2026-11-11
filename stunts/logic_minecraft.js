// logic #1, "minecraft logic 💀" (family logic, lib/logic.js; owner r:r40f7c7): seven real vanilla 1.21 quirks back to
// back, each one survival action and its result, a hard cut between them. Every quirk is true vanilla (minecraft-audit):
//   1. trees float: chop the two bottom logs of an oak, the rest stays up (logs have no gravity)
//   2. sand falls: dig the dirt block holding a sand pillar over a pit; the dirt itself was floating, the sand drops
//      into the pit (FallingBlockEntity)
//   3. break ice, get water: ice broken without Silk Touch over a solid block turns into a water source (IceBlock)
//   4. one sponge drinks a pool: a dry sponge placed in water soaks up to 65 blocks within 6 (SpongeBlock), and turns wet
//   5. 4 iron + a pumpkin = a bodyguard: a carved pumpkin on a T of iron blocks spawns an iron golem (peaceful too)
//   6. TNT under water breaks nothing: the blast starts inside water (resistance 100), so no block is destroyed
//   7. a respawn anchor outside the Nether explodes (power 5, with fire) when used once charged (on peaceful the blast
//      itself does no damage to the player)
// Commands build the stations only; on camera: digs, places and uses through lib/act.js.
const { makeLogic } = require('../lib/logic')

const SLOT = { axe: 0, shovel: 1, pick: 2, sponge: 3, pumpkin: 4, flint: 5, glow: 6, hand: 7 }

const quirks = [
  {
    key: 'tree',
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
      L.quirk()
      // step back, eyes on the gap: the whole tree hanging over the stump
      await L.A.back(12, { look: L.at(0.5, 3.6, -2.5) })
      await L.hold(8, L.at(0.5, 3.6, -2.5))
    },
    hold: 4
  },
  {
    key: 'sand',
    label: 'sand: falls',
    slot: SLOT.shovel,
    start: { z: 1.5, pitch: 4 },
    async build (L) {
      await L.fill(-1, -3, -4, 1, 0, -2, 'air')          // a 3x3 pit, 4 deep, its floor the pad's dirt
      await L.set(0, 0, -3, 'dirt')                       // one dirt block floating over it...
      await L.fill(0, 1, -3, 0, 4, -3, 'sand')            // ...holding a sand pillar
    },
    async perform (ctx, L) {
      await L.A.dig(L.block(0, 0, -3))
      L.quirk()
      // the pillar drops 4 blocks into the pit (~11 ticks); the thud as it lands
      await L.hold(11, L.at(0.5, 0.6, -2.5))
      ctx.sound('block.sand.place', 1, 0.8)
    },
    hold: 14
  },
  {
    key: 'ice',
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
    label: '4 iron + a pumpkin = a bodyguard',
    slot: SLOT.pumpkin,
    start: { y: 2, pitch: 6 },
    async build (L) {
      await L.fill(-1, 1, -1, 1, 1, 1, 'grass_block')       // a little mound to stand on (the pumpkin goes on from above)
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
      await L.hold(8, L.at(0.5, 3.2, -2.5))
    },
    hold: 14
  },
  {
    key: 'tnt',
    label: 'TNT under water: no crater',
    slot: SLOT.flint,
    start: { z: -0.5, pitch: 34 },
    edit: { speed: [['tnt_fuse:0.1', 'tnt_boom:-0.6', 'cut']], subs: [['tnt_lit', 'TNT under water...', 1.0, 0]] },
    async build (L) {
      await L.fill(-2, -1, -6, 2, 0, -2, 'water')            // a 5x5 pool, 2 deep
      await L.set(0, -1, -4, 'tnt')
    },
    async perform (ctx, L) {
      const { bot } = ctx
      let boom = false
      const on = () => { boom = true }
      bot._client.on('explosion', on)
      const tnt = L.mid(0, -1, -4)
      await L.A.use(L.pos(0, -1, -4), { sound: 'item.flintandsteel.use' })
      ctx.sound('entity.tnt.primed', 1, 1)
      ctx.mark('tnt_lit')
      await L.A.back(18, { look: tnt })                        // step back, eyes on the pool
      await L.hold(4)
      ctx.mark('tnt_fuse')
      for (let k = 0; k < 100 && !boom; k++) await bot.waitForTicks(1)
      bot._client.removeListener('explosion', on)
      if (!boom) throw new Error('logic tnt: no explosion')
      ctx.mark('tnt_boom')
      L.quirk()
      await L.hold(24)                                         // the smoke clears: the pool and its floor, untouched
    },
    hold: 8
  },
  {
    key: 'anchor',
    label: '',
    slot: SLOT.glow,
    start: { z: 1.3, pitch: 8 },                             // at the edge of reach: the blast throws him out past its fire
    edit: { subs: [['anchor_charged', 'respawn anchor in the overworld:', 1.4, 0]] },
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
      ctx.select(SLOT.hand)
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
      await L.hold(44, crater, { drift: 0.0075 })
      bot.removeListener('health', onHurt)
      if (hurt) throw new Error('logic anchor: the blast\'s fire caught him (a hurt flash): take again')
    }
  }
]

// settle-ok: lib/logic.js's edit ends on endAfter 'settle:0.6'
module.exports = makeLogic({
  name: 'logic_minecraft',
  caption: 'minecraft logic 💀',
  red: 'logic',
  hotbar: ['diamond_axe', 'diamond_shovel', 'diamond_pickaxe', 'sponge', 'carved_pumpkin', 'flint_and_steel', ['glowstone', 4]],
  quirks
})
