// "never dig straight down 💀" (~30 s, one continuous dig, digging from the first frame): the bot
// digs straight down, and every few blocks it breaks into something worse:
//   1. a small cave (ores, glow lichen, a lava trickle)
//   2. an abandoned mineshaft corridor (rails, supports, cobwebs, lanterns, a chest minecart)
//   3. a dungeon (mossy cobblestone, a zombie spawner, two chests)
//   4. an amethyst geode (smooth basalt, calcite, amethyst, clusters)
//   5. the roof of a huge lava cavern: it drops into the lava lake. Real death, vanilla death screen.
// (layers 3 and 4 added 2026-11-11: the three-layer cut ran 21 s, under the owner's 30 s minimum)
// Every block is a real survival dig with the right tool (shovel for grass/dirt, pickaxe for the
// rest); every drop is a real fall (fall damage on the hearts). The underground is built with
// commands inside a solid stone block under the spot, so nothing natural (water, gravel, a real
// cave) can get in the way; the surface stays the natural one.
// Old cut (8 s, one cavern): too dark and too short (QA2: "still dark; lavafall render gaps").

function blobCmds (cx, cy, cz, r, block) {
  const out = []
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy))
    if (w <= 0) continue
    const a = Math.round(w * 0.6), c = Math.round(w * 0.85)
    for (const [wx, wz] of [[w, a], [a, w], [c, c]]) {
      out.push(`/fill ${cx - wx} ${cy + dy} ${cz - wz} ${cx + wx} ${cy + dy} ${cz + wz} ${block}`)
    }
  }
  return out
}

module.exports = {
  name: 'cave_reveal',
  brightness: 1,   // Options > Brightness: Bright (underground the default reads near-black)
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'never dig straight down 💀',
  expectDeath: true,
  edit: {
    caption: 'never dig straight down 💀', red: 'never', dropAt: 'l5',
    onFire: 'in_lava:death', deathScreen: true, endAfter: 'death:1.2',   // r:r188b46 + a text payoff's 1.2 s to read the death message (lead 2026-11-11; was 1.6)
    // opens 0.35 s before the first crack (from dig0 the first 2.3 s were the setup's cut pit wall and a slow tilt
    // down over grass under "just digging down...": independent review 2026-11-11)
    startAt: 'dig0:1.9',
    // r:r0f3da0: frame 0 was plain grass. A 0.9 s flash of the bottom first: the floor breaks open onto the lava lake and
    // the fall starts (cut before the death), then the dig from the top
    hook: { at: 'l5', before: 0.0, after: 0.9, text: 'how it ends 💀' },
    subs: [
      ['dig0', 'just digging down...', 2.2], ['l1', 'oh, a cave', 1.6], ['dig1', 'keep going', 1.4],
      ['l2', 'a mineshaft??', 1.6], ['dig2', 'keep going...', 1.4], ['l3', 'a DUNGEON', 1.6], ['dig3', 'one more...', 1.4],
      ['l4', 'a GEODE?!', 1.6], ['dig4', 'just one more', 1.4], ['l5', 'oh no', 3]
    ],
    // the burn sped up (6 s of one shot in the lava: pace), and a hit on the death (pace: no sound hit on the payoff;
    // the lava's burning keeps the game track busy, so the impact doesn't flatten the rest)
    speed: [['in_lava:1.0', 'death:-0.4', 2]],
    sfx: [['pop', 'dig0:1.9'], ['dip', 'death', 0.4], ['impact', 'death', { gain: 1.4 }]]   // (a pop on the opening: the no-song cut was silent until the first block broke at 2.7 s, pace hook)
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, F = g.y
    this.x = x; this.z = z; this.floor = F
    await ctx.defaultRules()
    await ctx.forceload({ x0: x - 16, z0: z - 16, x1: x + 16, z1: z + 16 })
    await bot.waitForTicks(20)
    // the spot itself: keep the natural surface around it (flattening leaves cut walls in view)
    await ctx.cmd(`/fill ${x - 2} ${F + 1} ${z - 2} ${x + 2} ${F + 8} ${z + 2} air`)
    await ctx.cmd(`/fill ${x - 1} ${F} ${z - 1} ${x + 1} ${F} ${z + 1} grass_block`)
    await ctx.cmd(`/fill ${x - 1} ${F - 2} ${z - 1} ${x + 1} ${F - 1} ${z + 1} dirt`)
    // solid stone under it all (29 x 29, in slabs under the /fill cap)
    for (let y1 = F - 3; y1 > F - 66; y1 -= 30) await ctx.cmd(`/fill ${x - 14} ${Math.max(F - 66, y1 - 29)} ${z - 14} ${x + 14} ${y1} ${z + 14} stone`)
    let seed = 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const ores = (blobs, n, list, minY, maxY) => {
      const out = []
      for (let i = 0; i < n; i++) {
        const [cx, cy, cz, r] = blobs[Math.floor(rnd() * blobs.length)]
        const th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 2 - 1), d = r + 0.5
        const ox = Math.round(cx + d * Math.sin(ph) * Math.cos(th)), oy = Math.round(cy + d * Math.cos(ph)), oz = Math.round(cz + d * Math.sin(ph) * Math.sin(th))
        if (oy > maxY || oy < minY || (Math.abs(ox - x) <= 1 && Math.abs(oz - z) <= 1)) continue
        out.push(`/fill ${ox} ${oy} ${oz} ${ox + 1} ${oy + 1} ${oz} ${list[Math.floor(rnd() * list.length)]} replace stone`)
      }
      return out
    }

    // 1. the cave: air F-9..F-6 under the column (a 5-block drop), a wider blob round it, flat floor
    const c1 = [[x + 2, F - 8, z + 1, 5], [x - 3, F - 8, z - 2, 4]]
    for (const [cx, cy, cz, r] of c1) for (const c of blobCmds(cx, cy, cz, r, 'cave_air')) await ctx.cmd(c)
    await ctx.cmd(`/fill ${x - 10} ${F - 14} ${z - 10} ${x + 10} ${F - 10} ${z + 10} stone replace cave_air`)
    await ctx.cmd(`/fill ${x - 10} ${F - 5} ${z - 10} ${x + 10} ${F - 4} ${z + 10} stone replace cave_air`)
    for (const c of ores(c1, 60, ['coal_ore', 'coal_ore', 'iron_ore', 'iron_ore', 'copper_ore'], F - 13, F - 5)) await ctx.cmd(c)
    // glow lichen patches on the floor and a lava trickle from the far wall: the cave's lights
    for (let i = 0; i < 14; i++) {
      const lx = x - 6 + Math.floor(rnd() * 13), lz = z - 5 + Math.floor(rnd() * 11)
      if (Math.abs(lx - x) + Math.abs(lz - z) < 2) continue
      await ctx.cmd(`/fill ${lx} ${F - 9} ${lz} ${lx} ${F - 9} ${lz} glow_lichen[down=true] replace cave_air`)
    }
    await ctx.cmd(`/fill ${x + 5} ${F - 10} ${z + 1} ${x + 7} ${F - 10} ${z + 3} lava`)              // a pool in the floor...
    await ctx.cmd(`/fill ${x + 6} ${F - 9} ${z + 2} ${x + 6} ${F - 6} ${z + 2} lava[level=8] replace cave_air`)   // ...under a trickle
    await ctx.cmd(`/setblock ${x + 6} ${F - 5} ${z + 2} lava`)

    // 2. the mineshaft: a 3x3 corridor east-west, air F-16..F-14 (a 4-block drop from the cave floor)
    await ctx.cmd(`/fill ${x - 13} ${F - 16} ${z - 1} ${x + 13} ${F - 14} ${z + 1} cave_air`)
    await ctx.cmd(`/fill ${x - 13} ${F - 16} ${z} ${x + 13} ${F - 16} ${z} rail[shape=east_west]`)
    for (const dx of [-11, -7, -3, 3, 7, 11]) {
      for (const dz of [-1, 1]) await ctx.cmd(`/fill ${x + dx} ${F - 16} ${z + dz} ${x + dx} ${F - 15} ${z + dz} oak_fence`)
      await ctx.cmd(`/fill ${x + dx} ${F - 14} ${z - 1} ${x + dx} ${F - 14} ${z + 1} oak_planks`)
      if (Math.abs(dx) !== 7) await ctx.cmd(`/setblock ${x + dx} ${F - 15} ${z} lantern[hanging=true]`)
    }
    for (const [dx, dy, dz] of [[5, -14, 1], [-9, -14, -1], [9, -16, -1], [-5, -14, 1], [12, -15, 1]]) await ctx.cmd(`/setblock ${x + dx} ${F + dy} ${z + dz} cobweb`)
    for (const [dx, dz] of [[-6, -1], [4, 1], [-12, 1]]) await ctx.cmd(`/setblock ${x + dx} ${F - 17} ${z + dz} oak_planks`)
    this.minecart = { x: x + 5.5, y: F - 16, z: z + 0.5 }

    // 5. the lava cavern: a big chamber under the geode, its roof over the column at F-40 (a 5-block drop into a 1-deep
    //    lava lake, so the eyes stay above the surface), lavafalls down the walls. (Built before the geode, which
    //    overwrites the roof's top; D: 16 blocks deeper than the three-layer cut)
    const D = 16
    const c4 = [[x + 4, F - 28 - D, z - 3, 8], [x - 7, F - 29 - D, z + 5, 7], [x + 8, F - 30 - D, z + 7, 6]]
    for (const [cx, cy, cz, r] of c4) for (const c of blobCmds(cx, cy, cz, r, 'cave_air')) await ctx.cmd(c)
    await ctx.cmd(`/fill ${x - 2} ${F - 24 - D} ${z - 2} ${x + 2} ${F - 18 - D} ${z + 2} stone`)   // the roof over the column
    for (const c of ores(c4, 50, ['diamond_ore', 'gold_ore', 'redstone_ore', 'iron_ore', 'lapis_ore'], F - 38 - D, F - 21 - D)) await ctx.cmd(c)
    await ctx.cmd(`/fill ${x - 14} ${F - 50 - D} ${z - 14} ${x + 14} ${F - 30 - D} ${z + 14} stone replace cave_air`)
    await ctx.cmd(`/fill ${x - 14} ${F - 29 - D} ${z - 14} ${x + 14} ${F - 29 - D} ${z + 14} lava replace cave_air`)
    await bot.waitForTicks(10)                                    // the client has the carved blocks
    for (const [fx, fz] of [[x + 9, z - 5], [x - 9, z + 4], [x + 6, z + 9]]) {
      let top = F - 29 - D
      while (top < F - 20 - D && ctx.bot.blockAt(new ctx.Vec3(fx, top + 1, fz))?.name === 'cave_air') top++
      if (top <= F - 29 - D) continue
      await ctx.cmd(`/fill ${fx} ${F - 28 - D} ${fz} ${fx} ${top} ${fz} lava[level=8] replace cave_air`)
      await ctx.cmd(`/setblock ${fx} ${top + 1} ${fz} lava`)
    }
    this.lake = F - 29 - D

    // 3. the dungeon: a 7x7 room (air F-24..F-21) in a mossy cobblestone shell, its ceiling under the column at F-20 (a
    //    4-block drop), a zombie spawner and two chests against the walls, as vanilla's dungeons are
    await ctx.cmd(`/fill ${x - 3} ${F - 25} ${z - 4} ${x + 5} ${F - 20} ${z + 4} mossy_cobblestone`)
    for (let i = 0; i < 40; i++) {
      const cx = x - 3 + Math.floor(rnd() * 9), cy = F - 25 + Math.floor(rnd() * 6), cz = z - 4 + Math.floor(rnd() * 9)
      await ctx.cmd(`/setblock ${cx} ${cy} ${cz} cobblestone`)
    }
    await ctx.cmd(`/fill ${x - 2} ${F - 24} ${z - 3} ${x + 4} ${F - 21} ${z + 3} cave_air`)
    await ctx.cmd(`/setblock ${x + 3} ${F - 24} ${z + 1} spawner{SpawnData:{entity:{id:"minecraft:zombie"}}}`)
    await ctx.cmd(`/setblock ${x - 2} ${F - 24} ${z - 3} chest[facing=south]`)
    await ctx.cmd(`/setblock ${x + 4} ${F - 24} ${z + 3} chest[facing=west]`)
    for (const [cx, cz] of [[x - 2, z + 3], [x + 4, z - 3]]) await ctx.cmd(`/setblock ${cx} ${F - 21} ${cz} cobweb`)

    // 4. the geode: smooth basalt, calcite and amethyst shells round a hollow (air F-33..F-29 under the column, a
    //    5-block drop from the dungeon floor), budding amethyst and clusters on the inside
    const G = { x: x + 1, y: F - 31, z }
    for (const [r, block] of [[5.2, 'smooth_basalt'], [4.3, 'calcite'], [3.5, 'amethyst_block'], [2.6, 'cave_air']]) {
      for (const c of blobCmds(G.x, G.y, G.z, Math.floor(r), block)) await ctx.cmd(c)
    }
    for (let i = 0; i < 24; i++) {
      const th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 2 - 1)
      const bx = Math.round(G.x + 3 * Math.sin(ph) * Math.cos(th)), by = Math.round(G.y + 3 * Math.cos(ph)), bz = Math.round(G.z + 3 * Math.sin(ph) * Math.sin(th))
      if (Math.abs(bx - x) + Math.abs(bz - z) < 2) continue
      await ctx.cmd(`/fill ${bx} ${by} ${bz} ${bx} ${by} ${bz} budding_amethyst replace amethyst_block`)
    }
    await bot.waitForTicks(6)
    let clusters = 0
    for (let dx = -2; dx <= 2 && clusters < 14; dx++) {
      for (let dz = -2; dz <= 2 && clusters < 14; dz++) {
        if (Math.abs(G.x + dx - x) + Math.abs(G.z + dz - z) < 2 || rnd() < 0.4) continue
        for (let y = G.y - 3; y <= G.y; y++) {   // on the hollow's floor
          const here = ctx.bot.blockAt(new ctx.Vec3(G.x + dx, y, G.z + dz)), below = ctx.bot.blockAt(new ctx.Vec3(G.x + dx, y - 1, G.z + dz))
          if (here?.name === 'cave_air' && /amethyst/.test(below?.name || '')) {
            await ctx.cmd(`/setblock ${G.x + dx} ${y} ${G.z + dz} ${rnd() < 0.5 ? 'amethyst_cluster' : 'large_amethyst_bud'}[facing=up]`)
            clusters++
            break
          }
        }
      }
    }
    this.geode = G

    await ctx.hotbar(['diamond_shovel', 'diamond_pickaxe', ['torch', 64], ['cobblestone', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, F + 1, z + 0.5, 0, 45)   // already looking down at the spot (the stunt shows in the first second)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y: F, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, floor: F } = this
    const A = require('../lib/act')(ctx)
    // dig the block underfoot until there's air under it, then drop into what's below
    const digDown = async (n) => {
      for (let k = 0; k < 12; k++) {
        const feet = bot.entity.position.floored()
        const p = new Vec3(x, feet.y - 1, z)
        const b = bot.blockAt(p)
        if (!b || /air/.test(b.name)) break
        const tool = /grass|dirt/.test(b.name) ? 0 : 1
        if (bot.quickBarSlot !== tool) { ctx.select(tool); await bot.waitForTicks(2) }
        try { await A.dig(b, { sound: null }) } catch (e) { ctx.log('dig', e.message) }   // aimed by construction (lib/act.js)
        ctx.sound(`block.${ctx.soundGroup(b.name)}.break`, 1, 0.9); ctx.particles('block', p.offset(0.5, 0.5, 0.5), { block: b.name })
        // into the room under it, or down onto the next block (wait for the landing: a 1-block drop
        // takes ~6 ticks, and the next dig read the air we were still falling through)
        const under = bot.blockAt(p.offset(0, -1, 0))
        if (under && /air/.test(under.name)) {
          ctx.mark(`l${n}`)
          return true
        }
        // (feet at p.y + 1 before the dig, at p.y once on the block below: `< p.y + 1.05` was already true before the
        // fall, so the next dig read the air it was standing over and the take ended after one block, 2026-11-11)
        for (let w = 0; w < 20 && !(bot.entity.onGround && bot.entity.position.y < p.y + 0.05); w++) await bot.waitForTicks(1)
      }
      return false
    }
    const land = async () => {
      for (let w = 0; w < 60 && !bot.entity.onGround && !ctx.died; w++) await bot.waitForTicks(1)
      ctx.sound('entity.player.small_fall', 1); ctx.sound('entity.generic.hurt', 0.7)
    }
    // eased looks no faster than a hand on a mouse (rec_check whips 267-338 deg/s; r:r38374d): ctx.easeLook's ease-in-out
    // peaks at twice its mean speed, so a turn of D deg takes at least 2 * D / 200 s; then a short rest on what it shows
    // (two swings 0.05-0.15 s apart read as one jerk: want 0.3 s on something)
    const capMs = (yaw, pitch, ms) => {
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      const deg = Math.hypot(dy * Math.max(Math.cos(bot.entity.pitch), Math.cos(pitch)), pitch - bot.entity.pitch) * 180 / Math.PI
      return Math.max(ms, Math.ceil(2000 * deg / 200 / 50) * 50)
    }
    const ease = (yaw, pitch, ms) => ctx.easeLook(yaw, pitch, capMs(yaw, pitch, ms))
    const easeAt = (q, ms) => { const e = bot.entity.position.offset(0, 1.62, 0), d = q.minus(e); return ease(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), ms) }
    const rest = () => bot.waitForTicks(6)
    const DOWN = -Math.PI / 2 + 0.02
    const looks = async (list) => { for (const [yaw, pitch, ms] of list) { await ease(yaw, pitch, ms); await rest() } }

    ctx.mark('dig0')
    await ease(0, DOWN, 250)
    // 0 -> 1: the cave
    if (!await digDown(1)) return false
    // r:r188b46 (fast cuts): one look per layer, straight at what it shows, a short rest, back to digging (two looks
    // and a pan held each layer 2.3-3.5 s after the reveal: pace dwell)
    const lift1 = ease(-1.9, -0.25, 900)                              // the lava trickle, ores and glow lichen
    await land(); ctx.sound('ambient.cave', 1); await lift1; await rest()
    await ease(-1.9, DOWN, 400)
    ctx.mark('dig1')
    // 1 -> 2: the mineshaft
    if (!await digDown(2)) return false
    ctx.mark('minecart')
    bot.chat(`/summon chest_minecart ${this.minecart.x} ${this.minecart.y} ${this.minecart.z}`)
    const lift2 = ease(-Math.PI / 2, -0.15, 900)                      // along the corridor: the minecart
    await land(); await lift2; await rest()
    await ease(-Math.PI / 2, DOWN, 400)
    ctx.mark('dig2')
    // 2 -> 3: the dungeon
    if (!await digDown(3)) return false
    const lift3 = easeAt(new Vec3(x + 3.5, F - 23.5, z + 1.5), 700)   // the spawner, its zombie spinning inside
    await land(); ctx.mark('spawner'); await lift3; await rest()
    await ease(bot.entity.yaw, DOWN, 400)
    ctx.mark('dig3')
    // 3 -> 4: the geode
    if (!await digDown(4)) return false
    const lift5 = easeAt(new Vec3(this.geode.x + 2.5, this.geode.y - 1, this.geode.z - 1.5), 700)   // amethyst all round
    await land(); ctx.sound('block.amethyst_block.chime', 1); await lift5
    ctx.sound('block.amethyst_block.chime', 0.8, 1.2); await rest()
    await ease(bot.entity.yaw, DOWN, 450)
    ctx.mark('dig4')
    // 4 -> 5: the lava cavern
    if (!await digDown(5)) return false
    const lift4 = ease(-0.6, -0.45, 900)                             // the cavern opens to the north-east
    ctx.sound('block.lava.ambient', 1)
    let inLava = false
    for (let w = 0; w < 200 && !ctx.died; w++) {
      await bot.waitForTicks(1)
      if (!inLava && bot.entity.position.y < this.lake + 1.2) {
        inLava = true; ctx.mark('in_lava'); ctx.sound('block.lava.extinguish', 0.7)
        lift4.then(() => ease(-1.7, -0.15, 1400))                       // the whole lake, on fire (after the first look ends)
      }
      if (inLava && w % 8 === 0) bot.setControlState('jump', true)   // trying to get out
    }
    await lift4
    bot.clearControlStates()
    if (!ctx.died) return false
    await bot.waitForTicks(40)                                        // the death screen
    return true
  }
}
