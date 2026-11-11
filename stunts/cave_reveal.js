// "never dig straight down 💀" (~15-18 s, one continuous dig, digging from the first frame): the bot
// digs straight down, and every few blocks it breaks into something worse:
//   1. a small cave (ores, glow lichen, a lava trickle)
//   2. an abandoned mineshaft corridor (rails, supports, cobwebs, lanterns, a chest minecart)
//   3. the roof of a huge lava cavern: it drops into the lava lake. Real death, vanilla death screen.
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
    caption: 'never dig straight down 💀', red: 'never', song: 'songs/misery.mp3', dropAt: 'l3',
    onFire: 'in_lava:death', deathScreen: true, startAt: 'dig0:-0.3', endAfter: 'death:1.6',
    subs: [
      ['dig0', 'just digging down...', 3], ['l1', 'oh, a cave', 2.2], ['dig1', 'keep going', 2],
      ['l2', 'a mineshaft??', 2.4], ['dig2', 'keep going...', 2], ['l3', 'oh no', 3]
    ]
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
    for (let y1 = F - 3; y1 > F - 50; y1 -= 30) await ctx.cmd(`/fill ${x - 14} ${Math.max(F - 50, y1 - 29)} ${z - 14} ${x + 14} ${y1} ${z + 14} stone`)
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

    // 3. the lava cavern: a big chamber right under the mineshaft, its roof over the column at F-24
    //    (a 5-block drop into a 1-deep lava lake, so the eyes stay above the surface), lavafalls down the walls
    const c4 = [[x + 4, F - 28, z - 3, 8], [x - 7, F - 29, z + 5, 7], [x + 8, F - 30, z + 7, 6]]
    for (const [cx, cy, cz, r] of c4) for (const c of blobCmds(cx, cy, cz, r, 'cave_air')) await ctx.cmd(c)
    await ctx.cmd(`/fill ${x - 2} ${F - 24} ${z - 2} ${x + 2} ${F - 18} ${z + 2} stone`)   // the roof over the column
    for (const c of ores(c4, 50, ['diamond_ore', 'gold_ore', 'redstone_ore', 'iron_ore', 'lapis_ore'], F - 38, F - 21)) await ctx.cmd(c)
    await ctx.cmd(`/fill ${x - 14} ${F - 50} ${z - 14} ${x + 14} ${F - 30} ${z + 14} stone replace cave_air`)
    await ctx.cmd(`/fill ${x - 14} ${F - 29} ${z - 14} ${x + 14} ${F - 29} ${z + 14} lava replace cave_air`)
    await bot.waitForTicks(10)                                    // the client has the carved blocks
    for (const [fx, fz] of [[x + 9, z - 5], [x - 9, z + 4], [x + 6, z + 9]]) {
      let top = F - 29
      while (top < F - 20 && ctx.bot.blockAt(new ctx.Vec3(fx, top + 1, fz))?.name === 'cave_air') top++
      if (top <= F - 29) continue
      await ctx.cmd(`/fill ${fx} ${F - 28} ${fz} ${fx} ${top} ${fz} lava[level=8] replace cave_air`)
      await ctx.cmd(`/setblock ${fx} ${top + 1} ${fz} lava`)
    }
    this.lake = F - 29

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
    // dig the block underfoot until there's air under it, then drop into what's below
    const digDown = async (n) => {
      for (let k = 0; k < 12; k++) {
        const feet = bot.entity.position.floored()
        const p = new Vec3(x, feet.y - 1, z)
        const b = bot.blockAt(p)
        if (!b || /air/.test(b.name)) break
        const tool = /grass|dirt/.test(b.name) ? 0 : 1
        if (bot.quickBarSlot !== tool) { ctx.select(tool); await bot.waitForTicks(2) }
        try { await bot.dig(b, 'ignore') } catch (e) { ctx.log('dig', e.message) }
        ctx.sound(`block.${ctx.soundGroup(b.name)}.break`, 1, 0.9); ctx.particles('block', p.offset(0.5, 0.5, 0.5), { block: b.name })
        // into the room under it, or down onto the next block (wait for the landing: a 1-block drop
        // takes ~6 ticks, and the next dig read the air we were still falling through)
        const under = bot.blockAt(p.offset(0, -1, 0))
        if (under && /air/.test(under.name)) {
          ctx.mark(`l${n}`)
          return true
        }
        for (let w = 0; w < 20 && !(bot.entity.onGround && bot.entity.position.y < p.y + 1.05); w++) await bot.waitForTicks(1)
      }
      return false
    }
    const land = async () => {
      for (let w = 0; w < 60 && !bot.entity.onGround && !ctx.died; w++) await bot.waitForTicks(1)
      ctx.sound('entity.player.small_fall', 1); ctx.sound('entity.generic.hurt', 0.7)
    }
    const looks = async (list) => { for (const [yaw, pitch, ms] of list) await ctx.easeLook(yaw, pitch, ms) }

    ctx.mark('dig0')
    await ctx.easeLook(0, -Math.PI / 2 + 0.02, 250)
    // 0 -> 1: the cave
    if (!await digDown(1)) return false
    const lift1 = ctx.easeLook(-0.6, -0.35, 900)
    await land(); await lift1
    ctx.sound('ambient.cave', 1)
    await looks([[-1.9, -0.25, 800]])                               // the lava trickle, ores and glow lichen
    await ctx.easeLook(-1.9, -Math.PI / 2 + 0.02, 400)
    ctx.mark('dig1')
    // 1 -> 2: the mineshaft
    if (!await digDown(2)) return false
    const lift2 = ctx.easeLook(Math.PI / 2, -0.15, 800)               // down the corridor (west)
    await land(); await lift2
    ctx.mark('minecart')
    bot.chat(`/summon chest_minecart ${this.minecart.x} ${this.minecart.y} ${this.minecart.z}`)
    await looks([[-Math.PI / 2, -0.15, 1000]])                     // along the other way: the minecart
    await ctx.easeLook(-Math.PI / 2, -Math.PI / 2 + 0.02, 400)
    ctx.mark('dig2')
    // 2 -> 3: the lava cavern
    if (!await digDown(3)) return false
    const lift4 = ctx.easeLook(-0.6, -0.45, 900)                    // the cavern opens to the north-east
    ctx.sound('block.lava.ambient', 1)
    let inLava = false
    for (let w = 0; w < 200 && !ctx.died; w++) {
      await bot.waitForTicks(1)
      if (!inLava && bot.entity.position.y < this.lake + 1.2) {
        inLava = true; ctx.mark('in_lava'); ctx.sound('block.lava.extinguish', 0.7)
        ctx.easeLook(-1.7, -0.15, 1400)                               // the whole lake, on fire
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
