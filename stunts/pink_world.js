// "I painted the whole world pink 💀" (docs/ideas.md #2, ~20 s): the bot dyes one sheep pink
// (a real survival dye use), and the pink spreads: the grass around it, then out to the horizon,
// then every tree, then the hills, snow, ice and water. It ends on the one spot it missed: a
// grass block right at its feet, which it digs out and replaces with pink wool by hand.
// The spreading is commands (the scale nobody could do by hand), chunk by chunk from the bot out,
// with each chunk's fill bounded to the heights where its surface actually is.
const R = 7                 // chunks painted around the bot's chunk
const MAP = [
  // [pass, block or tag to replace, replacement]
  ['grass', 'grass_block', 'pink_wool'],
  ['grass', 'short_grass', 'pink_tulip'],
  ['grass', 'fern', 'pink_tulip'],
  ['grass', 'tall_grass', 'air'],
  ['grass', 'large_fern', 'air'],
  ['grass', '#minecraft:small_flowers', 'pink_tulip'],
  ['trees', '#minecraft:leaves', 'cherry_leaves'],
  ['trees', '#minecraft:logs', 'pink_terracotta'],
  ['rest', 'stone', 'pink_terracotta'],
  ['rest', 'andesite', 'pink_terracotta'],
  ['rest', 'diorite', 'pink_terracotta'],
  ['rest', 'granite', 'pink_terracotta'],
  ['rest', 'gravel', 'pink_concrete'],
  ['rest', 'dirt', 'pink_terracotta'],
  ['rest', 'coarse_dirt', 'pink_terracotta'],
  ['rest', 'sand', 'pink_concrete'],
  ['rest', 'snow_block', 'pink_concrete'],
  ['rest', 'powder_snow', 'pink_concrete'],
  ['rest', 'snow', 'pink_carpet'],
  ['rest', 'ice', 'pink_stained_glass'],
  ['rest', 'packed_ice', 'pink_concrete'],
  ['rest', 'blue_ice', 'pink_concrete'],
  ['rest', 'water', 'pink_stained_glass']
]

module.exports = {
  name: 'pink_world',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'I painted the whole world pink 💀',
  edit: {
    caption: 'I painted the whole world pink 💀', red: 'pink', song: 'songs/funk_abnormal.mp3', dropAt: 'dyed',
    startAt: 'beat:-0.1', endAfter: 'fixed:1.0',
    subs: [['dyed', '1 sheep', 1.6, 0], ['pass_grass', 'the grass', 2.2, 0], ['far', 'to the horizon', 2.0, 0],
      ['pass_trees', 'the trees', 2.2, 0], ['pass_rest', 'the mountains, the ocean...', 3.0, 0], ['missed', 'missed a spot', 9, 0]]
  },

  async setup (ctx) {
    const { bot, Vec3 } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: F } = g
    Object.assign(this, { x, z, F })
    await ctx.defaultRules()
    // a small clean patch to stand on, the sheep 3 blocks in front (north)
    await ctx.cmd(`/fill ${x - 3} ${F + 1} ${z - 5} ${x + 3} ${F + 6} ${z + 2} air`)
    await ctx.cmd(`/fill ${x - 3} ${F} ${z - 5} ${x + 3} ${F} ${z + 2} grass_block`)
    await ctx.cmd('/kill @e[type=sheep]')
    await ctx.cmd(`/summon sheep ${x + 0.5} ${F + 1} ${z - 2.5} {Color:0b,NoAI:1b,Rotation:[90f,0f],PersistenceRequired:1b}`)
    // survey: each chunk's surface (top non-air block per column, every other column): heights and
    // what's there, so each fill only spans the heights where that chunk's surface is
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16)
    this.chunks = []
    const tall = { x: 0, z: 0, y: -1e9 }
    for (let i = -R; i <= R; i++) {
      for (let k = -R; k <= R; k++) {
        const x1 = (cx + i) * 16, z1 = (cz + k) * 16
        let lo = 1e9, hi = -1e9
        const names = new Set()
        for (let dx = 0; dx < 16; dx += 2) {
          for (let dz = 0; dz < 16; dz += 2) {
            for (let y = 230; y > -40; y--) {
              const b = bot.blockAt(new Vec3(x1 + dx, y, z1 + dz))
              if (!b) break
              if (b.name === 'air' || b.name === 'cave_air') continue
              names.add(b.name)
              let ground = y
              if (/leaves|_log$/.test(b.name)) {   // trees: the ground is under them
                names.add('trees')
                for (let yy = y - 1; yy > y - 30; yy--) { const c = bot.blockAt(new Vec3(x1 + dx, yy, z1 + dz)); if (c && !/air|leaves|_log$/.test(c.name)) { ground = yy; names.add(c.name); break } }
              }
              lo = Math.min(lo, ground); hi = Math.max(hi, y)
              if (ground > tall.y) Object.assign(tall, { x: x1 + dx, z: z1 + dz, y: ground })
              break
            }
          }
        }
        if (hi < lo) continue
        this.chunks.push({ x1, z1, lo, hi, names: [...names], d: Math.hypot(x1 + 8 - x, z1 + 8 - z) })
      }
    }
    this.chunks.sort((a, b) => a.d - b.d)
    this.tall = tall
    ctx.log('surveyed', this.chunks.length, 'chunks; highest ground', tall)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
    await ctx.hotbar(['pink_dye', 'iron_shovel', ['pink_wool', 1]])
    await ctx.tpCheck(x + 0.5, F + 1, z + 0.5, 180, 25)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: F, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, F } = this
    // the fills of one pass for one chunk (the block at the bot's feet... in front of it is kept)
    const keep = { x, y: F, z: z - 1 }
    const paint = (c, pass) => {
      for (const [p, from, to] of MAP) {
        if (p !== pass) continue
        const bare = from.replace('#minecraft:', '')
        if (pass === 'trees' && !c.names.includes('trees')) continue
        if (pass !== 'trees' && !from.startsWith('#') && !c.names.includes(bare) && !(pass === 'rest' && c.hi - c.lo > 4 && /stone|dirt|andesite|diorite|granite/.test(bare))) continue
        const y1 = c.lo - (bare === 'water' ? 0 : 3), y2 = c.hi + 1
        const yy1 = bare === 'water' ? c.lo : y1
        for (let ys = yy1; ys <= y2; ys += 120) {
          const ye = Math.min(ys + 119, y2)
          if (c.x1 <= keep.x && keep.x < c.x1 + 16 && c.z1 <= keep.z && keep.z < c.z1 + 16 && ys <= keep.y && keep.y <= ye && bare === 'grass_block') {
            // around the missed spot: two fills that leave that one column out
            bot.chat(`/fill ${c.x1} ${ys} ${c.z1} ${c.x1 + 15} ${ye} ${keep.z - 1} ${to} replace ${from}`)
            bot.chat(`/fill ${c.x1} ${ys} ${keep.z + 1} ${c.x1 + 15} ${ye} ${c.z1 + 15} ${to} replace ${from}`)
            bot.chat(`/fill ${c.x1} ${ys} ${keep.z} ${keep.x - 1} ${ye} ${keep.z} ${to} replace ${from}`)
            bot.chat(`/fill ${keep.x + 1} ${ys} ${keep.z} ${c.x1 + 15} ${ye} ${keep.z} ${to} replace ${from}`)
          } else bot.chat(`/fill ${c.x1} ${ys} ${c.z1} ${c.x1 + 15} ${ye} ${c.z1 + 15} ${to} replace ${from}`)
        }
      }
    }
    // the near field, ring by ring (finer than chunks)
    const ringPaint = (r0, r1) => {
      for (const [p, from, to] of MAP) {
        if (p !== 'grass') continue
        const strips = [[x - r1, z - r1, x + r1, z - r0], [x - r1, z + r0, x + r1, z + r1], [x - r1, z - r0, x - r0, z + r0], [x + r0, z - r0, x + r1, z + r0]]
        for (const [a, b, c, d] of strips) {
          if (from === 'grass_block' && a <= keep.x && keep.x <= c && b <= keep.z && keep.z <= d) {
            bot.chat(`/fill ${a} ${F - 1} ${b} ${c} ${F + 3} ${d} ${to} replace ${from}`)
            bot.chat(`/setblock ${keep.x} ${keep.y} ${keep.z} grass_block`)
          } else bot.chat(`/fill ${a} ${F - 1} ${b} ${c} ${F + 3} ${d} ${to} replace ${from}`)
        }
      }
    }
    const sheep = new Vec3(x + 0.5, F + 1.6, z - 2.5)
    // 1. the sheep
    ctx.mark('beat')
    await ctx.easeLookAt(sheep, 250)
    bot.chat('/data merge entity @e[type=sheep,limit=1,sort=nearest] {Color:6b}')   // the server applies the dye from the click below too
    const sh = bot.nearestEntity(e => e.name === 'sheep')
    if (sh) { bot.activateEntity(sh); bot.swingArm() }
    ctx.sound('item.dye.use', 1)
    ctx.mark('dyed')
    ctx.particles('happy', { x: sheep.x, y: sheep.y, z: sheep.z }, { count: 6 })
    await ctx.easeLookAt(sheep.offset(0.6, -0.3, 0), 600)
    // 2. the grass around me, ring by ring
    ctx.mark('pass_grass')
    ctx.easeLook(bot.entity.yaw, -0.75, 500)
    for (let r = 1; r <= 14; r++) { ringPaint(r === 1 ? 0 : r, r); ctx.sound('block.wool.place', 0.3, 0.8 + r * 0.03); await bot.waitForTicks(1) }
    await ctx.easeLook(bot.entity.yaw - 0.4, -0.25, 500)
    // 3. out to the horizon, chunk by chunk
    ctx.mark('far')
    const yaw0 = bot.entity.yaw
    for (let n = 0; n < this.chunks.length; n++) {
      paint(this.chunks[n], 'grass')
      if (n % 4 === 3) await bot.waitForTicks(1)
      if (n === 8) ctx.easeLook(yaw0 + 1.6, -0.12, 1300)
    }
    await bot.waitForTicks(16)
    // 4. the trees
    ctx.mark('pass_trees')
    ctx.easeLook(yaw0 + 3.0, -0.08, 1500)
    for (let n = 0; n < this.chunks.length; n++) { paint(this.chunks[n], 'trees'); if (n % 6 === 5) await bot.waitForTicks(1) }
    await bot.waitForTicks(26)
    // 5. everything else: hills, snow, ice, water. Look at the highest ground first.
    ctx.mark('pass_rest')
    const t = this.tall
    const eye = bot.entity.position.offset(0, 1.62, 0)
    const yawT = Math.atan2(-(t.x - eye.x), -(t.z - eye.z)), pitchT = Math.max(-0.1, Math.min(0.25, Math.atan2(t.y - eye.y, Math.hypot(t.x - eye.x, t.z - eye.z))))
    await ctx.easeLook(yawT, pitchT, 700)
    for (let n = 0; n < this.chunks.length; n++) { paint(this.chunks[n], 'rest'); if (n % 3 === 2) await bot.waitForTicks(1) }
    await ctx.easeLook(yawT + 0.6, pitchT - 0.05, 1100)
    await bot.waitForTicks(6)
    // 6. ...one grass block left, right in front of me: dig it, put pink wool in
    const k = new Vec3(x, F, z - 1)
    await ctx.easeLookAt(k.offset(0.5, 1, 0.5), 700)
    ctx.mark('missed')
    await bot.waitForTicks(6)
    ctx.select(1); await bot.waitForTicks(3)
    const b = bot.blockAt(k)
    const nt = b ? Math.max(1, Math.ceil(bot.digTime(b) / 50)) : 3
    bot._client.write('block_dig', { status: 0, location: k, face: 1, sequence: 0 })
    for (let i = 0; i < nt; i++) { if (i % 4 === 0) bot.swingArm(); await bot.waitForTicks(1) }
    bot._client.write('block_dig', { status: 2, location: k, face: 1, sequence: 0 })
    ctx.sound('block.grass.break', 1, 0.8); ctx.particles('block', k, { block: 'grass_block' })
    await bot.waitForTicks(3)
    ctx.select(2); await bot.waitForTicks(3)
    bot._client.write('block_place', { hand: 0, location: { x: k.x, y: F - 1, z: k.z }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('block.wool.place', 1)
    ctx.mark('fixed')
    await ctx.easeLook(bot.entity.yaw + 0.5, -0.2, 900)
    await bot.waitForTicks(4)
    const after = bot.blockAt(k)
    ctx.log('missed spot is now', after && after.name)
    return !ctx.died && after && after.name === 'pink_wool'
  }
}
