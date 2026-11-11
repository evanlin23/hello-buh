// The "lucky" format (fake super lucky; docs/formats.md, r:r934ea4): one first-person dig straight down where every
// block it breaks into is luckier than the last. Everything is real vanilla mechanics, staged by the set: the ores are
// real ore blocks mined at the held tool's vanilla speed (their drops picked up for real, so the hotbar counts them),
// the lava is a real lava lake saved by a real water bucket (water on a lava source: the lake round it turns to
// obsidian), and the end portal's last eye is a real use on the frame (the server opens the portal). Every dig, place
// and use goes through lib/act.js (aimed by construction, r:rffba12); every look is its governed turn (r:r38374d).
//
// Use: an episode is a stunt module made by lucky.make({ name, caption, red, layers, edit }). `layers` run from the
// surface down, each one a beat:
//   { kind: 'ore', block: 'diamond_ore', depth: 2, mine: ['n', 'e'], sub: 'DIAMONDS??' }
//       the shaft breaks into a vein: the next `depth` floor blocks and the shaft walls round them are `block`; on
//       landing it mines the walls named in `mine` (n/e/s/w: at the feet), then digs on down through the floor ore
//   { kind: 'lava', sub: 'LAVA', saved: 'water bucket' }
//       the floor gives way over a lava lake 3 blocks down: the bucket goes down mid-fall, the landing is in water, the
//       lake round it turns to obsidian, the bucket comes back up
//   { kind: 'portal', sub: 'a STRONGHOLD?!', eyes: '11 EYES ALREADY?!' }
//       the floor gives way into a stronghold's end portal room, landing just south of the frame ring: 11 eyes are in,
//       the 12th goes in from the hotbar and the portal opens (the payoff: mark 'portal'). Must be the last layer
//   { kind: 'gap', n: 1 }   plain stone between beats (n blocks)
// Marks: dig0 (the first crack), l<i> (layer i revealed: its sub), mine, lava, saved, filled, room, land, eyes, portal.
const STONE = 'stone'
const RING = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }
const YAW = { n: 0, w: Math.PI / 2, s: Math.PI, e: -Math.PI / 2 }   // mineflayer yaw facing that way

function blob (cx, cy, cz, rx, ry, rz) {   // the cells of an ellipsoid as /fill rows (x runs)
  const out = []
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    for (let dz = -Math.ceil(rz); dz <= Math.ceil(rz); dz++) {
      const q = 1 - (dy / ry) ** 2 - (dz / rz) ** 2
      if (q <= 0) continue
      const w = Math.floor(rx * Math.sqrt(q))
      out.push([cx - w, cy + dy, cz + dz, cx + w, cy + dy, cz + dz])
    }
  }
  return out
}

// the shaft's plan: every cell from the surface down, and each layer's anchor y. F = the grass block's y
function plan (layers, F) {
  const cells = [[F, 'grass_block'], [F - 1, 'dirt'], [F - 2, STONE]]
  let y = F - 3
  const out = layers.map((L) => {
    const p = { ...L }
    if (L.kind === 'gap') { for (let k = 0; k < (L.n || 1); k++) cells.push([y--, STONE]) }
    else if (L.kind === 'ore') { p.top = y; p.depth = L.depth || 2; for (let k = 0; k < p.depth; k++) cells.push([y--, L.block]) }
    else if (L.kind === 'lava') { p.stand = y; cells.push([y--, STONE]); p.lake = y - 2; y = p.lake - 1 }   // the plug, 2 air, the lava
    else if (L.kind === 'portal') { p.ceil = y; cells.push([y, 'stone_bricks']); p.floor = y - 6; y = p.floor }
    else throw new Error(`lucky: unknown layer kind ${L.kind}`)
    return p
  })
  return { cells, layers: out, bottom: y }
}

function make (opts) {
  const layers0 = opts.layers
  if (!layers0.length || layers0[layers0.length - 1].kind !== 'portal') throw new Error('lucky: the last layer is the portal room')
  const subs = []
  layers0.forEach((L, i) => {
    if (L.sub) subs.push([L.kind === 'lava' ? 'lava' : L.kind === 'portal' ? 'room' : `l${i}`, L.sub, L.subDur || 1.4])
    if (L.saved) subs.push(['saved', L.saved, 1.3])
    if (L.eyes) subs.push(['eyes', L.eyes, 1.3])
  })
  return {
    name: opts.name,
    biome: process.env.BIOME || 'minecraft:plains',
    caption: opts.caption,
    brightness: 1,   // Options > Brightness: Bright (underground the default reads near-black)
    renderDistance: 6,
    recordRadius: 64,
    edit: {
      caption: opts.caption, red: opts.red,
      startAt: 'dig0:-0.05', endAfter: 'portal:0.9', dropAt: 'portal',
      subs, subsY: 0.15,
      // the payoff: the song dips 0.4 s into the portal's opening (its vanilla roar is the hit), a punch on the picture
      sfx: [['dip', 'portal', 0.4]],
      punch: [['portal', 0, 0.6]],
      ...(opts.edit || {})
    },

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      if (!g) throw new Error('no dry land')
      const { x, z } = g, F = g.y
      const P = plan(layers0, F)
      this.x = x; this.z = z; this.F = F; this.plan = P
      const c = (s) => ctx.cmd(s)
      const fill = (a, b, block) => c(`/fill ${a[0]} ${a[1]} ${a[2]} ${b[0]} ${b[1]} ${b[2]} ${block}`)
      await ctx.defaultRules()
      await c('/difficulty peaceful')
      await ctx.forceload({ x0: x - 16, z0: z - 18, x1: x + 16, z1: z + 10 })
      await bot.waitForTicks(20)
      // the spot: the natural surface kept round it (a flattened pad leaves cut walls in view)
      await fill([x - 2, F + 1, z - 2], [x + 2, F + 8, z + 2], 'air')
      await fill([x - 1, F, z - 1], [x + 1, F, z + 1], 'grass_block')
      await fill([x - 1, F - 2, z - 1], [x + 1, F - 1, z + 1], 'dirt')
      // solid stone under it all, so nothing natural (a cave, an aquifer, gravel) gets in, in slabs under the /fill cap
      const deep = P.bottom - 2
      for (let y1 = F - 3; y1 >= deep; y1 -= 20) await fill([x - 14, Math.max(deep, y1 - 19), z - 16], [x + 14, y1, z + 8], STONE)
      for (const [y, block] of P.cells) await c(`/setblock ${x} ${y} ${z} ${block}`)
      let seed = opts.seed || 7
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
      for (const L of P.layers) {
        if (L.kind === 'ore') {
          // the vein: the shaft's walls from the cell above the first ore down to the last, and a few blocks past them
          await fill([x - 1, L.top - L.depth + 1, z - 1], [x + 1, L.top + 1, z + 1], L.block)
          for (let k = 0; k < 10; k++) {
            const ox = x + Math.round((rnd() - 0.5) * 6), oz = z + Math.round((rnd() - 0.5) * 6), oy = L.top - Math.floor(rnd() * (L.depth + 1))
            if (Math.abs(ox - x) <= 1 && Math.abs(oz - z) <= 1) continue   // the shaft and its walls are planned
            await c(`/setblock ${ox} ${oy} ${oz} ${L.block}`)
          }
          for (const [y, block] of P.cells) if (y <= L.top + 1 && y >= L.top - L.depth + 1) await c(`/setblock ${x} ${y} ${z} ${block}`)
        } else if (L.kind === 'lava') {
          // a low cave over a lava lake: the lake at L.lake, the cave 1-3 high over it, its roof over the shaft 1 thick
          const ly = L.lake
          for (const b of [...blob(x + 1, ly + 1, z, 7, 1.5, 6), ...blob(x - 3, ly + 1, z + 3, 4.5, 1.2, 4)]) await fill(b.slice(0, 3), b.slice(3), 'cave_air')
          for (const b of blob(x, ly + 2, z - 1, 4.5, 1.5, 4)) await fill(b.slice(0, 3), b.slice(3), 'cave_air')
          await fill([x - 14, ly - 6, z - 16], [x + 14, ly, z + 8], `${STONE} replace cave_air`)   // a flat lake bed
          await fill([x - 1, ly + 3, z - 1], [x + 1, L.stand, z + 1], STONE)                         // the plug and the walls round it
          await fill([x - 1, ly + 1, z - 1], [x + 1, ly + 2, z + 1], 'cave_air')
          await c(`/setblock ${x} ${L.stand} ${z} ${STONE}`)
          await fill([x - 8, ly, z - 7], [x + 8, ly, z + 7], 'lava')
          // the lake's shore: a ring of stone a block past the cave's footprint, so no lava sits under a bare wall
          for (let k = 0; k < 16; k++) {
            const ox = x + Math.round((rnd() - 0.5) * 14), oz = z + Math.round((rnd() - 0.5) * 12), oy = ly + 1 + Math.floor(rnd() * 3)
            await c(`/fill ${ox} ${oy} ${oz} ${ox} ${oy} ${oz} ${['coal_ore', 'iron_ore', 'copper_ore', 'magma_block'][k % 4]} replace ${STONE}`, { mayFail: true })
          }
          L.lakeAt = { x, y: ly, z }
        } else if (L.kind === 'portal') await portalRoom(ctx, x, z, L, rnd)
      }
      await bot.waitForTicks(10)
      // the hotbar: shovel, pickaxe (Efficiency V netherite: a geared player's fast vanilla digs), water bucket, one eye
      this.slots = { shovel: 0, pick: 1, bucket: 2, eye: 3 }
      await ctx.hotbar(['netherite_shovel[enchantments={efficiency:5}]', 'netherite_pickaxe[enchantments={efficiency:5}]', 'water_bucket', 'ender_eye'])
      await ctx.tpCheck(x + 0.5, F + 1, z + 0.5, 0, 88)   // already looking straight down at the spot (the dig is the first frame)
      await c('/gamemode survival')
      ctx.select(0)
      await bot.waitForTicks(30)
      return { x, y: F, z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { x, z } = this
      const S = this.slots
      const A = require('./act')(ctx)
      const DOWN = -Math.PI / 2 + 0.02
      bot.on('playerCollect', (who) => { if (who === bot.entity) ctx.sound('entity.item.pickup', 0.3, 1 + Math.random() * 0.6) })
      const tool = (b) => (/grass|dirt/.test(b.name) ? S.shovel : S.pick)
      const hold = async (slot) => { if (bot.quickBarSlot !== slot) { ctx.select(slot); await bot.waitForTicks(1) } }
      const landed = async (y, max = 60) => {   // standing on the block at y (feet at y + 1)
        for (let w = 0; w < max && !(bot.entity.onGround && bot.entity.position.y < y + 1.05); w++) await bot.waitForTicks(1)
      }
      // a floor block straight under the feet: the view goes straight down at the yaw it has (aiming at the face's
      // centre from right above it spins the picture: the yaw of a point under the eye is arbitrary), and the gated
      // dig goes as soon as the crosshair is on it. A wall block: lib/act.js's aimed dig
      const breakIt = async (p, o = {}) => {
        const b = bot.blockAt(p)
        if (!b || /air|water|lava/.test(b.name)) return null
        await hold(tool(b))
        // vanilla's break time for the held Efficiency V netherite tool (speed 9 + 5^2 + 1 = 35 on its own blocks):
        // mineflayer's digTime misses it on ores (4.55 s on diamond ore, vanilla 3 ticks)
        const ticks = Math.ceil(30 * b.hardness / 35)
        const ms = ticks > 1 && bot.digTime(b) > ticks * 100 ? ticks * 50 : undefined
        if (o.down) {
          await A.turnTo({ yaw: bot.entity.yaw, pitch: DOWN }, { max: 30 })
          const dt = bot.digTime
          if (ms !== undefined) bot.digTime = () => ms
          try { await A.digNow(b) } finally { bot.digTime = dt }
        } else await A.dig(b, { sound: null, ...(ms !== undefined ? { ms } : {}) })
        ctx.sound(`block.${ctx.soundGroup(b.name)}.break`, 1, 0.9)
        ctx.particles('block', p.offset(0.5, 0.5, 0.5), { block: b.name })
        return b
      }
      // dig the block under the feet and land on the next one
      const digDown = async () => {
        const y = Math.floor(bot.entity.position.y + 0.01) - 1
        await breakIt(new Vec3(x, y, z), { down: true })
        await landed(y - 1)
      }
      const feetY = () => Math.floor(bot.entity.position.y + 0.01)

      ctx.mark('dig0')
      const P = this.plan
      for (let i = 0; i < P.layers.length; i++) {
        const L = P.layers[i]
        if (L.kind === 'gap') continue
        if (L.kind === 'ore') {
          while (feetY() - 1 > L.top) await digDown()   // down to the vein: the last dig lands on its first ore
          ctx.mark(`l${i}`, { block: L.block })
          ctx.sound('block.amethyst_block.chime', 0.6, 1.4)
          for (const d of (L.mine || [])) {
            const [dx, dz] = RING[d]
            const p = new Vec3(x + dx, feetY(), z + dz)
            ctx.mark('mine', { block: L.block })
            await breakIt(p)
          }
          continue
        }
        if (L.kind === 'lava') {
          while (feetY() - 1 > L.stand) await digDown()
          // the plug: under it the cave and the lake
          await breakIt(new Vec3(x, L.stand, z), { down: true })
          ctx.mark('lava')
          ctx.sound('block.lava.ambient', 1)
          await hold(S.bucket)
          // the bucket goes down as soon as the lake's bed is in reach (vanilla 4.5 blocks from the eye): straight down
          let placed = false
          const onTick = () => {
            const e = bot.entity
            if (!placed && e.velocity.y < -0.2 && e.position.y + 1.62 - (L.lake) < 4.3) {
              placed = true
              ctx.mark('saved', { x, y: L.lake, z })
              ctx.sound('item.bucket.empty', 1)
              process.nextTick(() => bot.activateItem())   // physicsTick runs before this tick's position goes out
            }
          }
          bot.on('physicsTick', onTick)
          for (let w = 0; w < 60 && !(bot.entity.onGround || bot.entity.isInWater); w++) await bot.waitForTicks(1)
          bot.removeListener('physicsTick', onTick)
          ctx.sound('entity.player.splash', 0.8)
          ctx.particles('splash', { x: x + 0.5, y: L.lake + 0.9, z: z + 0.5 }, { count: 40, spread: 2.2 })
          ctx.sound('block.lava.extinguish', 1)
          await landed(L.lake - 1, 30)
          await bot.waitForTicks(3)
          // a look round the lake it just turned to stone, then the bucket back up
          await A.turnTo({ yaw: bot.entity.yaw + 0.9, pitch: -0.45 }, { max: 40, hold: 4 })
          await A.turnTo({ yaw: bot.entity.yaw, pitch: DOWN }, { max: 40 })
          bot.activateItem()   // the bucket on the water source under the eye (straight down)
          ctx.mark('filled')
          ctx.sound('item.bucket.fill', 1)
          await bot.waitForTicks(4)
          continue
        }
        if (L.kind === 'portal') {
          while (feetY() - 1 > L.ceil) await digDown()
          let portalAt = null
          const onBlock = (o, n) => { if (n && n.name === 'end_portal' && portalAt === null) { portalAt = ctx.tick; ctx.mark('portal'); ctx.sound('block.end_portal.spawn', 1) } }
          bot.on('blockUpdate', onBlock)
          await breakIt(new Vec3(x, L.ceil, z), { down: true })
          ctx.mark('room')
          await landed(L.floor + 1, 60)
          ctx.mark('land')
          ctx.sound('entity.player.small_fall', 1)
          await bot.waitForTicks(2)
          // up from the floor onto the ring (north: mine the vein above with 'n' last and no turn is needed): 11 eyes
          // in, one empty frame right in front
          await A.turnTo({ yaw: 0, pitch: -0.62 }, { max: 50 })
          ctx.mark('eyes')
          await hold(S.eye)
          await bot.waitForTicks(6)
          const fp = new Vec3(x, L.floor + 2, z - 1)
          await A.use(fp)
          ctx.sound('block.end_portal_frame.fill', 1)
          for (let w = 0; w < 20 && portalAt === null; w++) await bot.waitForTicks(1)
          bot.removeListener('blockUpdate', onBlock)
          if (portalAt === null) { ctx.log('lucky: the portal did not open'); return false }
          // the look settles on the open portal
          await A.turnTo({ yaw: 0, pitch: -0.8 }, { max: 20 })
          await bot.waitForTicks(30)
          return true
        }
      }
      return false
    }
  }
}

// a stronghold's end portal room under the shaft: the ceiling at L.ceil, the floor at L.floor, the frame ring on a
// raised platform over a lava pool, its south-middle frame (the empty one) right north of the landing spot (x, z)
async function portalRoom (ctx, x, z, L, rnd) {
  const c = (s) => ctx.cmd(s)
  const fill = (a, b, block) => c(`/fill ${a[0]} ${a[1]} ${a[2]} ${b[0]} ${b[1]} ${b[2]} ${block}`)
  const R = L.floor, Y = L.ceil, px = x, pz = z - 3
  await fill([x - 8, R - 1, z - 14], [x + 8, Y, z + 6], 'stone_bricks')
  for (let k = 0; k < 90; k++) {
    const bx = x - 8 + Math.floor(rnd() * 17), by = R - 1 + Math.floor(rnd() * (Y - R + 2)), bz = z - 14 + Math.floor(rnd() * 21)
    await c(`/setblock ${bx} ${by} ${bz} ${k % 3 ? 'mossy_stone_bricks' : 'cracked_stone_bricks'}`)
  }
  await fill([x - 7, R + 1, z - 13], [x + 7, Y - 1, z + 5], 'air')
  // iron-barred windows in the side walls and the far wall
  for (const wz of [z - 10, z - 6, z - 2, z + 2]) for (const wx of [x - 8, x + 8]) await fill([wx, R + 3, wz], [wx, R + 4, wz], 'iron_bars')
  for (const wx of [x - 4, x + 4]) await fill([wx, R + 3, z - 14], [wx, R + 4, z - 14], 'iron_bars')
  // the platform, the lava under the portal, the stairs up from the south
  await fill([px - 3, R + 1, pz - 3], [px + 3, R + 1, pz + 3], 'stone_bricks')
  await fill([px - 1, R + 1, pz - 1], [px + 1, R + 1, pz + 1], 'lava')
  await fill([px - 1, R + 1, pz + 4], [px + 1, R + 1, pz + 4], 'stone_brick_stairs[facing=north]')
  // the ring: 11 eyes in, the south-middle frame empty
  for (let i = -1; i <= 1; i++) {
    await c(`/setblock ${px + i} ${R + 2} ${pz - 2} end_portal_frame[facing=south,eye=true]`)
    await c(`/setblock ${px + i} ${R + 2} ${pz + 2} end_portal_frame[facing=north,eye=${i !== 0}]`)
    await c(`/setblock ${px - 2} ${R + 2} ${pz + i} end_portal_frame[facing=east,eye=true]`)
    await c(`/setblock ${px + 2} ${R + 2} ${pz + i} end_portal_frame[facing=west,eye=true]`)
  }
  // the silverfish spawner beside the landing spot (peaceful: it never spawns one)
  await c(`/setblock ${px - 2} ${R + 2} ${pz + 3} spawner{SpawnData:{entity:{id:"minecraft:silverfish"}}}`)
  // the shaft comes down through the ceiling right over the landing spot
  await c(`/setblock ${x} ${Y} ${z} stone_bricks`)
}

module.exports = { make, plan }
