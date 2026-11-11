// The "fakeworld" format (docs/formats.md, r:r62f46d; owner: "fake world?"): a whole world made of one wrong block,
// played straight as normal survival under a deadpan caption, where the one ordinary block in it is the treasure.
// Our own block swap over real vanilla terrain (never a copied map): the seed's ground, hills, trees, beaches and lake
// beds all become `block`, the water stays water, the plants go. Everything the player does is real survival: the
// trunk and the ground are mined at the held tool's vanilla speed (A.dig, aimed: r:rffba12), the drops are picked up
// for real (the hotbar counts them), and the treasure is dug by hand.
//
//   const fakeworld = require('../lib/fakeworld')
//   await fakeworld.swap(ctx, { block: 'diamond_block', x, z, R: 8 })    // any set: the world round (x, z) -> block
//   module.exports = fakeworld.make({ name, block: 'diamond_block', treasure: 'dirt', caption, red, subs })
//
// An episode (make) is one beat sheet whatever the block, so the next one only names the block (and its words):
//   1. 'wood'   the first frame: a tree of `block` right in front, the world of `block` behind it; the trunk is mined
//               (two blocks): sub "need wood" -> "<block>. again."
//   2. 'ground' the ground under the tree is dug, two deep: sub "dirt has to be down here" -> "nope."
//   3. 'spot'   a turn to the shore: a lone `treasure` block under the second tree by the water: sub "wait"
//   4. 'payoff' the walk up to it, the dig by hand, the drop picked up into an empty slot and held: the challenge
//               sound, the edit's dip and flash: sub "DIRT!!!"
// Marks: wood, got, ground, still, spot, walk, dig_t, payoff, held.
const PLANTS = ['short_grass', 'tall_grass', 'fern', 'large_fern', '#minecraft:flowers', 'sugar_cane', 'bush', 'leaf_litter',
  'firefly_bush', 'dead_bush', 'sweet_berry_bush', 'vine', 'lily_pad', 'snow', '#minecraft:saplings', 'brown_mushroom',
  'red_mushroom', 'short_dry_grass', 'tall_dry_grass', 'pumpkin', 'melon', 'cactus', 'bamboo', 'azalea', 'flowering_azalea']
const WATER_PLANTS = ['seagrass', 'tall_seagrass', 'kelp', 'kelp_plant']
const GROUND = ['#minecraft:dirt', '#minecraft:base_stone_overworld', '#minecraft:logs', '#minecraft:leaves', '#minecraft:sand',
  'gravel', 'clay', 'sandstone', 'dirt_path', 'farmland', 'snow_block', 'ice', 'packed_ice', 'calcite', 'cobblestone',
  'mossy_cobblestone', 'suspicious_sand', 'suspicious_gravel', 'bee_nest', '#minecraft:coal_ores', '#minecraft:iron_ores',
  '#minecraft:copper_ores', '#minecraft:gold_ores', '#minecraft:redstone_ores', '#minecraft:lapis_ores',
  '#minecraft:emerald_ores', '#minecraft:diamond_ores']
const SKIP_DOWN = /^(air|cave_air|water|bubble_column)$|_leaves$|_log$|grass$|fern$|flower|tulip|orchid|allium|azure|oxeye|cornflower|lily|dandelion|poppy|seagrass|kelp|sugar_cane|bush|vine|petals|litter|mushroom/
// the sound group vanilla gives a block (SoundType): what its break, place and steps sound like
const METAL = /^(diamond|gold|iron|emerald|netherite|copper|lapis|redstone)_block$/
const soundOf = (ctx, block) => (METAL.test(block) ? 'metal' : ctx.soundGroup(block))
// a block's in-game name for the words ("diamond_block" -> "diamond")
const label = (block) => block.replace(/^minecraft:/, '').replace(/_block$/, '').replace(/_/g, ' ')

// Survey the chunks within R of (x, z): per chunk the heights its surface spans (the lake and river beds included:
// the swap goes 4 blocks under the lowest ground, so a dig or a cave mouth near the surface shows the block too)
async function survey (ctx, x, z, R) {
  const { bot, Vec3 } = ctx
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16)
  const chunks = []
  for (let i = -R; i <= R; i++) {
    for (let k = -R; k <= R; k++) {
      const x1 = (cx + i) * 16, z1 = (cz + k) * 16
      let lo = 1e9, hi = -1e9
      for (let dx = 0; dx < 16; dx += 3) {
        for (let dz = 0; dz < 16; dz += 3) {
          let top = null
          for (let y = 200; y > -40; y--) {
            const b = bot.blockAt(new Vec3(x1 + dx, y, z1 + dz))
            if (!b) break
            if (b.name === 'air' || b.name === 'cave_air') continue
            if (top === null) top = y
            if (SKIP_DOWN.test(b.name)) continue
            lo = Math.min(lo, y); hi = Math.max(hi, top)
            break
          }
        }
      }
      if (hi < lo) continue
      chunks.push({ x1, z1, lo: lo - 4, hi: hi + 2 })
    }
  }
  return chunks
}

// The world round (x, z) -> `block`: every chunk within R chunks, from 4 under its lowest ground to over its highest
// leaves. Plants go (air), water plants become water. /fill's cap is 32768 blocks: 16x16 columns, 128 high a slab.
// Unknown names (a block this version doesn't have) are skipped. o.keep: [{ x, y, z, block }] set after the swap.
async function swap (ctx, o) {
  const { bot } = ctx
  const block = o.block, R = o.R ?? 8
  const known = (n) => n.startsWith('#') || !!bot.registry.blocksByName[n]
  await ctx.forceload({ x0: o.x - R * 16, z0: o.z - R * 16, x1: o.x + R * 16 + 15, z1: o.z + R * 16 + 15 })
  const chunks = await survey(ctx, o.x, o.z, R)
  const pass = [
    ...PLANTS.filter(known).filter(n => n !== block).map(n => [n, 'air']),
    ...WATER_PLANTS.filter(known).map(n => [n, 'water']),
    ...GROUND.filter(known).filter(n => n !== block).map(n => [n, block])
  ]
  let sent = 0
  for (const c of chunks) {
    for (let y1 = c.lo; y1 <= c.hi; y1 += 128) {
      const y2 = Math.min(c.hi, y1 + 127)
      for (const [from, to] of pass) {
        bot.chat(`/fill ${c.x1} ${y1} ${c.z1} ${c.x1 + 15} ${y2} ${c.z1 + 15} ${to} replace ${from}`)
        if (++sent % 40 === 0) await bot.waitForTicks(1)
      }
    }
  }
  await bot.waitForTicks(40)
  for (const k of (o.keep || [])) await ctx.cmd(`/setblock ${k.x} ${k.y} ${k.z} ${k.block}`)
  ctx.log(`fakeworld: ${chunks.length} chunks -> ${block} (${sent} fills)`)
  return chunks
}

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // n e s w
const yawOf = (d) => Math.atan2(-d[0], -d[1])   // mineflayer yaw facing (dx, dz)

// a tree of `block`: a trunk h high on (x, F, z), a round crown over its top
async function tree (ctx, x, F, z, h, block) {
  const c = (s) => ctx.cmd(s)
  const top = F + h
  await c(`/fill ${x - 2} ${top - 2} ${z - 2} ${x + 2} ${top - 1} ${z + 2} ${block}`)
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) await c(`/setblock ${x + dx} ${top - 1} ${z + dz} air`)
  await c(`/fill ${x - 1} ${top} ${z - 1} ${x + 1} ${top + 1} ${z + 1} ${block}`)
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) await c(`/setblock ${x + dx} ${top + 1} ${z + dz} air`)
  await c(`/fill ${x} ${F + 1} ${z} ${x} ${top} ${z} ${block}`)
}

function make (opts) {
  const block = opts.block
  const treasure = opts.treasure || 'dirt'
  const word = label(block)
  const W = {
    wood: 'need wood', got: `${word}. again.`, ground: 'dirt has to be down here', still: 'nope.', spot: 'wait',
    payoff: `${label(treasure).toUpperCase()}!!!`, ...(opts.words || {})
  }
  const subs = [['wood', W.wood, 1.0, 0], ['got', W.got, 1.3, 0], ['ground', W.ground, 1.2, 0], ['still', W.still, 0.9, 0],
    ['spot', W.spot, 1.6, 0], ['payoff', W.payoff, 3, 0]]
  return {
    name: opts.name,
    biome: process.env.BIOME || opts.biome || 'minecraft:river',
    ...(opts.near ? { near: opts.near } : {}),   // where /locate starts (the seed is fixed: the same river every take)
    caption: opts.caption,
    renderDistance: 7,
    recordRadius: 144,
    edit: {
      caption: opts.caption, red: opts.red || word,
      // the payoff is the dig (the hit, the flash, the drop); the end 1 s after it, the treasure in the hand by then
      // (frame 0 is 0.3 s into the opening look: the first trunk block breaks by ~0.5 s, r:r0f3da0)
      startAt: 'wood:0.3', endAfter: 'payoff:1.0', dropAt: 'payoff',
      subs, subsY: 0.18,
      flash: [['payoff', 0, 0.35]], punch: [['payoff', 0, 1.05]],
      // a pop on frame 0 (the first dig lands at ~0.8 s: the no-song mix opened silent), the impact under the dip
      sfx: [['pop', 'wood:0.3', { gain: 0.6 }], ['pop', 'got', { gain: 0.5 }], ['dip', 'payoff', 0.4], ['impact', 'payoff', { gain: 1.4 }]],
      ...(opts.edit || {})
    },

    async setup (ctx) {
      const { bot, Vec3 } = ctx
      const sp = bot.entity.position.floored()
      // (a retry in the same server world finds it already swapped: the block itself is the land then)
      let g = ctx.findLand(sp.x, sp.z)
      if (!g) { const b = ctx.surface(sp.x, sp.z); if (b && b.name === block) g = b.position }
      if (!g) throw new Error('fakeworld: no dry land')
      const { x, z } = g, F = g.y
      await ctx.defaultRules()
      await ctx.cmd('/difficulty peaceful')
      await ctx.forceload({ x0: x - 24, z0: z - 24, x1: x + 24, z1: z + 24 })
      // the shore: the nearest water along a straight line (4..11 blocks out) whose ground on the way stays near F
      const top = (px, pz) => { for (let y = F + 8; y > F - 12; y--) { const b = bot.blockAt(new Vec3(px, y, pz)); if (b && !/^(air|cave_air)$|grass$|fern$|flower|tulip|poppy|dandelion|bush|_leaves$|_log$/.test(b.name)) return b } return null }
      let D = null, w = 0
      for (let k = 4; k <= 11 && !D; k++) {
        for (const d of DIRS) {
          const b = top(x + d[0] * k, z + d[1] * k)
          if (b && b.name === 'water') { D = d; w = k; break }
        }
      }
      if (!D) { D = DIRS[0]; w = 8; ctx.log('fakeworld: no water within 11 blocks: the treasure goes 7 out') }
      // the opening faces one side of the shore line, the one with the lower ground ahead (the view over the world, not
      // into a hillside): the higher of the two counts cells over F + 1 out to 24 blocks
      const side = (P) => { let n = 0; for (let k = 4; k <= 24; k += 2) for (let l = -4; l <= 4; l += 2) { const s = ctx.surface(x + P[0] * k + D[0] * l, z + P[1] * k + D[1] * l); if (s && s.position.y > F + 1) n += s.position.y - F - 1 } return n }
      const La = [D[1], -D[0]], Lb = [-D[1], D[0]]
      const L = side(La) <= side(Lb) ? La : Lb
      ctx.log('fakeworld: the shore', D, w, 'blocks; the opening faces', L, '(rise', side(La), 'vs', side(Lb), ')')
      const at = (k, l) => ({ x: x + D[0] * k + L[0] * l, z: z + D[1] * k + L[1] * l })
      // the stage, before the swap (all of it becomes `block` anyway): the walk to the shore level at F, nothing
      // standing on it; the tree in front of the opening; the second tree on the shore
      const T = at(w - 1, 0)                       // the treasure: the last ground before the water
      const t1 = at(0, 3), t2 = at(w - 1, -1)       // the first tree 3 in front; the second beside the treasure
      const box = (a, b) => [Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z)]
      const [ax, az, bx, bz] = box(at(-2, -3), at(w - 1, 3))
      for (const t of ['#minecraft:logs', '#minecraft:leaves']) await ctx.cmd(`/fill ${ax} ${F + 1} ${az} ${bx} ${F + 16} ${bz} air replace ${t}`)
      const [cx0, cz0, cx1, cz1] = box(at(-1, -1), at(w - 1, 3))
      await ctx.cmd(`/fill ${cx0} ${F + 1} ${cz0} ${cx1} ${F + 5} ${cz1} air`)
      await ctx.cmd(`/fill ${cx0} ${F - 3} ${cz0} ${cx1} ${F} ${cz1} ${block}`)
      // the world
      await swap(ctx, { block, x, z, R: opts.R ?? 8 })
      await tree(ctx, t1.x, F, t1.z, 7, block)
      await tree(ctx, t2.x, F, t2.z, 5, block)
      // no water next to the hole the ground beat digs (it flowed in: the bottom read as water, not the block)
      { const [hx0, hz0, hx1, hz1] = box(at(-1, 2), at(1, 4)); await ctx.cmd(`/fill ${hx0} ${F - 3} ${hz0} ${hx1} ${F} ${hz1} ${block} replace water`, { mayFail: true }) }
      await ctx.cmd(`/setblock ${T.x} ${F} ${T.z} ${treasure}`)
      await ctx.cmd(`/setblock ${T.x} ${F - 1} ${T.z} ${block}`)
      Object.assign(this, { x, z, F, D, L, w, T, t1, at1: at(0, 2) })
      // the hotbar of a long survival in this world: the pickaxe, stacks of the block (the fourth one partly full, so the
      // trunk and the ground stack onto it), the food; slot 5 empty: the treasure lands there
      this.slots = { pick: 0, stack: 3, food: 4, treasure: 5 }
      await ctx.hotbar(['diamond_pickaxe[enchantments={efficiency:5}]', [block, 64], [block, 64], [block, 37], ['bread', 9]])
      // the opening: facing the trunk (L), at the block at eye height (the world behind it in frame)
      await ctx.tpCheck(x + 0.5, F + 1, z + 0.5, 180 - yawOf(L) * 180 / Math.PI, 5)
      await ctx.cmd('/gamemode survival')
      ctx.select(this.slots.pick)
      await bot.waitForTicks(30)
      return { x, y: F, z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const A = require('./act')(ctx)
      const { x, z, F, D, w, T, t1 } = this
      const S = this.slots
      const snd = soundOf(ctx, block)
      // a slow look round between the beats (never a frozen hold): dyaw, dpitch (rad) over at most `ticks`
      const SLOW = require('./act')(ctx, { turnSpeed: 30, turnAccel: 120 })
      const drift = async (dy, dp, ticks) => { const t0 = ctx.tick; await SLOW.turnTo({ yaw: bot.entity.yaw + dy, pitch: Math.max(-1.4, Math.min(1.4, bot.entity.pitch + dp)) }, { max: ticks }); while (ctx.tick - t0 < ticks) { await bot.waitForTicks(1) } }
      bot.on('playerCollect', (who) => { if (who === bot.entity) ctx.sound('entity.item.pickup', 0.3, 1 + Math.random() * 0.6) })
      const hold = async (slot) => { if (bot.quickBarSlot !== slot) { ctx.select(slot); await bot.waitForTicks(2) } }
      const mine = async (p, o = {}) => {
        const b = bot.blockAt(p)
        if (!b || b.name === 'air') return
        // vanilla's break time for the Efficiency V diamond pickaxe (speed 8 + 5^2 + 1 = 34) on a pickaxe block: mineflayer's
        // digTime misses the tool on these (7.5 s on a diamond block; vanilla 5 ticks)
        const ticks = Math.max(1, Math.ceil(30 * b.hardness / 34))
        // (only a pickaxe block: mineable/pickaxe or incorrect_for_*_tool; a hoe, axe or shovel block keeps mineflayer's time)
        const pickBlock = /pickaxe|incorrect_for/.test(b.material || '')
        await A.dig(b, { sound: null, ...(pickBlock && bot.digTime(b) > ticks * 50 + 50 ? { ms: ticks * 50 } : {}), ...o })
        ctx.sound(`block.${o.snd || snd}.break`, 1, 0.9)
        ctx.particles('block', p.offset(0.5, 0.5, 0.5), { block: b.name })
      }
      // 1. wood: the trunk, the block at eye height then the one under it
      ctx.mark('wood')
      await drift(0.04, -0.02, 10)   // "need wood" reads over the world first
      const drops = (on) => bot.chat(`/gamerule block_drops ${on}`)
      await mine(new Vec3(t1.x, F + 2, t1.z))
      ctx.mark('got')
      await drift(-0.03, 0, 8)
      await mine(new Vec3(t1.x, F + 1, t1.z))
      await drift(-0.08, 0.05, 6)
      // two steps up to the stump pick the two drops up (vanilla: 1 block of reach round the player, after 10 ticks)
      const step1 = this.at1
      bot.setControlState('forward', true)
      for (let k = 0; k < 24; k++) {
        const p = bot.entity.position
        if (Math.hypot(p.x - (step1.x + 0.5), p.z - (step1.z + 0.5)) < 0.35) break
        await A.view(new Vec3(t1.x + 0.5, F + 0.6, t1.z + 0.5)); await bot.waitForTicks(1)
      }
      bot.setControlState('forward', false)
      // any drop still lying there: walk onto it (no item left on screen)
      for (let k = 0; k < 40; k++) {
        const me = bot.entity.position
        const it = Object.values(bot.entities).filter(e => e.name === 'item' && e.position.distanceTo(me) < 5).sort((a, b) => a.position.distanceTo(me) - b.position.distanceTo(me))[0]
        if (!it) break
        const far = Math.hypot(it.position.x - me.x, it.position.z - me.z) > 0.8
        bot.setControlState('forward', far)
        await A.view(it.position.offset(0, 0.2, 0)); await bot.waitForTicks(1)
      }
      bot.setControlState('forward', false)
      drops(false)
      await bot.waitForTicks(3)
      // 2. the ground under the tree, two deep (the drops would lie in the hole: none, block_drops)
      ctx.mark('ground')
      await mine(new Vec3(t1.x, F, t1.z))
      await mine(new Vec3(t1.x, F - 1, t1.z))
      ctx.mark('still')
      // a sigh: the look comes up out of the hole, over the world of it
      await drift(0.15, 0.55, 18)
      // 3. the turn to the shore: the treasure under the second tree
      await A.turnTo(new Vec3(T.x + 0.5, F + 1, T.z + 0.5), { max: 40 })
      ctx.mark('spot')
      await drift(0.1, -0.06, 14)
      // 4. the walk up to it (2 blocks short), the dig by hand
      ctx.mark('walk')
      const stopAt = w - 2.4
      bot.setControlState('forward', true)
      for (let k = 0; k < 80; k++) {
        const p = bot.entity.position
        const done = (p.x - (x + 0.5)) * D[0] + (p.z - (z + 0.5)) * D[1]
        if (done >= stopAt) break
        await A.view(new Vec3(T.x + 0.5, F + 1, T.z + 0.5)); await bot.waitForTicks(1)
      }
      bot.setControlState('forward', false)
      await bot.waitForTicks(4)
      drops(true)
      await hold(S.treasure)
      ctx.mark('dig_t')
      const tb = bot.blockAt(new Vec3(T.x, F, T.z))
      await A.dig(tb, { sound: null })
      ctx.mark('payoff')
      ctx.sound(`block.${ctx.soundGroup(treasure)}.break`, 1, 0.9)
      ctx.sound('ui.toast.challenge_complete', 0.8, 1)
      ctx.particles('block', new Vec3(T.x + 0.5, F + 0.5, T.z + 0.5), { block: treasure })
      // the drop comes to the player (pickup delay 10 ticks), into the empty slot: held
      // (if it lands out of reach, a step on toward it)
      for (let k = 0; k < 60; k++) {
        const it = bot.inventory.slots[36 + S.treasure]
        if (it && it.name === treasure) break
        if (k === 16) bot.setControlState('forward', true)
        if (k > 16) { const p = bot.entity.position; if ((p.x - (T.x + 0.5)) * D[0] + (p.z - (T.z + 0.5)) * D[1] > -0.9) bot.setControlState('forward', false) }
        await bot.waitForTicks(1)
      }
      bot.setControlState('forward', false)
      ctx.mark('held')
      // a slow look up from the hole over the shore (the end still moves a little: never a frozen hold)
      await require('./act')(ctx, { turnSpeed: 14, turnAccel: 80 }).turnTo({ yaw: bot.entity.yaw + 0.25, pitch: -0.2 }, { max: 30 })
      const it = bot.inventory.slots[36 + S.treasure]
      ctx.log('fakeworld: treasure slot', it && it.name)
      return !!(it && it.name === treasure)
    }
  }
}

module.exports = { make, swap, survey, label, soundOf }
