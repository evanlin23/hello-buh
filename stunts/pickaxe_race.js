// "ranking every pickaxe ⛏️ 💀" (~18 s, five beats): a stone wall in a field; wooden, stone, iron,
// diamond and netherite pickaxe each mine a fresh 3x3 section of it (side by side), with real
// survival digging (bot.dig, the server checks the dig time). Each beat gets a subtitle with the
// tier per tool. Gold (fastest plain pickaxe) breaks on its last block; netherite + efficiency V
// (with the Haste) instamines; then a TNT takes the whole wall out: "TNT: ??? tier".
// Everything is mined under Haste V (invisible) so the five beats fit in a Short;
// the ranking and the ratios between the tools are vanilla's.

const TOOLS = [   // seven beats, ~30 s (owner: 30 s minimum)
  { item: 'wooden_pickaxe', label: 'wooden', result: 'wooden: D tier' },
  { item: 'stone_pickaxe', label: 'stone', result: 'stone: C tier' },
  { item: 'iron_pickaxe', label: 'iron', result: 'iron: B tier' },
  { item: 'diamond_pickaxe', label: 'diamond', result: 'diamond: A tier' },
  { item: 'netherite_pickaxe', label: 'netherite', result: 'netherite: A tier' },
  { item: 'golden_pickaxe[damage=23]', label: 'gold', result: 'gold: S tier?? (broke)' },    // fastest plain pickaxe; 9 uses left: it breaks on the last block
  { item: 'netherite_pickaxe[enchantments={efficiency:5}]', label: 'efficiency V + haste', result: 'efficiency V + haste: GOD tier' }   // the instamine needs the Haste: say so
]
const SPACING = 4             // wall sections: 3 wide + a 1-block pillar between them

// subtitles: the tool, then its tier once its section is open. (Measured times were shown before,
// but under the invisible Haste they ran ~2x vanilla and read as fake.)
function subs () {
  const out = []
  TOOLS.forEach((t, i) => {
    out.push(['beat', `${t.label}...`, 9, i])
    out.push(['mined', t.result, 9, i])
  })
  out.push(['boom', 'TNT: ??? tier', 1.6, 0])
  return out
}

module.exports = {
  name: 'pickaxe_race',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'ranking every pickaxe ⛏️ 💀',
  get edit () {
    return { caption: 'ranking every pickaxe ⛏️ 💀', red: 'every', song: 'songs/funk_abnormal.mp3', dropAt: 'boom', startAt: 'beat:-0.05', endAfter: 'boom:1.0', subs: subs() }
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (const [z0, z1] of [[z - 40, z - 24], [z - 23, z - 7], [z - 6, z + 10], [z + 11, z + 22]]) {   // a deep field: no cliff or snowy hill shows through the windows
      await ctx.cmd(`/fill ${x - 18} ${floor + 1} ${z0} ${x + 22} ${floor + 12} ${z1} air`)
      await ctx.cmd(`/fill ${x - 18} ${floor} ${z0} ${x + 22} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 18} ${floor - 3} ${z0} ${x + 22} ${floor - 1} ${z1} dirt`)
    }
    // the wall: one block thick (mining a section opens a window onto the field), 4 high
    this.wz = z - 4
    this.x0 = x - 12                                       // first section: x0..x0+2
    const xa = this.x0 - 2, xb = this.x0 + SPACING * (TOOLS.length - 1) + 4
    await ctx.cmd(`/fill ${xa} ${floor + 1} ${this.wz} ${xb} ${floor + 4} ${this.wz} stone`)
    // pillars between the sections in cobblestone, so each 3x3 reads as its own wall
    for (let i = 0; i <= TOOLS.length; i++) await ctx.cmd(`/fill ${this.x0 - 1 + i * SPACING} ${floor + 1} ${this.wz} ${this.x0 - 1 + i * SPACING} ${floor + 4} ${this.wz} cobblestone`)
    await ctx.hotbar([...TOOLS.map(t => t.item), 'tnt', 'flint_and_steel'])
    await ctx.cmd('/effect give @s haste infinite 4 true')
    await ctx.cmd('/effect give @s saturation infinite 1 true')
    // stand back so the whole section stays in frame (reach raised to match, invisible on screen)
    this.stand = (i) => ({ x: this.x0 + i * SPACING + 1.5, z: this.wz + 4.0 })   // within vanilla's 4.5-block reach
    const s = this.stand(0)
    await ctx.tpCheck(s.x, floor + 1, s.z, 180, 20)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { floor, wz } = this
    // digging sounds like the vanilla client: a hit sound every 4 ticks while digging
    let digTicks = 0
    const onTick = () => {
      if (bot.targetDigBlock) { if (digTicks++ % 4 === 0) ctx.sound('block.stone.hit', 0.25, 0.5) } else digTicks = 0
    }
    bot.on('physicsTick', onTick)
    bot.on('playerCollect', (collector) => { if (collector === bot.entity) ctx.sound('entity.item.pickup', 0.2, 1.4 + Math.random() * 0.6) })
    await bot.look(0, -0.15, true)
    await bot.waitForTicks(2)
    for (let i = 0; i < TOOLS.length; i++) {
      const fast = i === TOOLS.length - 1
      if (i > 0) {
        // strafe right to the next fresh section, eyes on the wall, switching tools on the way
        const tx = this.stand(i).x
        ctx.select(i)
        ctx.easeLook(0, -0.15, 300)
        for (let k = 0; k < 40 && Math.abs(bot.entity.position.x - tx) > 0.15; k++) {
          bot.setControlState('right', bot.entity.position.x < tx - 0.15)
          bot.setControlState('left', bot.entity.position.x > tx + 0.15)
          await bot.waitForTicks(1)
        }
        bot.setControlState('right', false); bot.setControlState('left', false)
      } else ctx.select(i)
      ctx.mark('beat', { n: i })   // (the last result stays up during the strafe)
      await bot.waitForTicks(fast ? 6 : 1)
      const xs = this.x0 + i * SPACING
      // snake: top row left->right, middle right->left, bottom left->right
      const order = []
      for (const [r, dir] of [[3, 1], [2, -1], [1, 1]]) for (let c = 0; c < 3; c++) order.push(new Vec3(xs + (dir > 0 ? c : 2 - c), floor + r, wz))
      const t0 = ctx.tick
      if (fast) ctx.mark('instamine')
      for (const p of order) {
        const b = bot.blockAt(p)
        if (!b || b.name === 'air') continue
        if (fast) {
          // one block per tick: snap the crosshair to it and break it in the same tick
          const eye = bot.entity.position.offset(0, 1.62, 0), d = p.offset(0.5, 0.5, 0.5).minus(eye)
          await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
          // instant mine: like the vanilla client, just START_DESTROY; the server breaks it at
          // once only if the tool really is that fast (mineflayer's bot.dig chokes on 1.21
          // enchantment components: 'enchantments is not iterable')
          bot._client.write('block_dig', { status: 0, location: p, face: 3, sequence: 0 })
          bot.swingArm()
          await bot.waitForTicks(1)
        } else {
          // eased aim at the block centre, then a real survival dig (no mineflayer look snap)
          await ctx.easeLookAt(p.offset(0.5, 0.5, 0.5), p === order[0] ? 250 : 100)   // first aim of a beat: a turn, not a snap
          try { await bot.dig(bot.blockAt(p), 'ignore') } catch (e) { ctx.log('dig', e.message) }
        }
        ctx.sound('block.stone.break', 1, 0.8); ctx.particles('block', p, { block: 'stone' })
      }
      const ticks = ctx.tick - t0
      await bot.waitForTicks(3)
      const left = order.filter(p => { const b = bot.blockAt(p); return b && b.name !== 'air' }).length
      ctx.log(TOOLS[i].label, 'mined in', ticks, 'ticks; blocks left', left)
      if (left) return false
      ctx.mark('mined', { n: i, ticks, secs: (ticks / 20).toFixed(1) })
      if (TOOLS[i].item.startsWith('golden')) { ctx.sound('entity.item.break', 1); ctx.log('gold left in hand:', bot.heldItem && bot.heldItem.name) }
      // look through the hole a moment
      await ctx.easeLook(0, -0.1, fast ? 250 : 150)
      if (fast) await bot.waitForTicks(4)        // (14 read as a 0.7 s pause before the finale)
    }
    // finale: "TNT: ??? tier". Place a TNT at the foot of the wall, light it, back off, and it takes the wall out
    ctx.mark('finale')
    const tp = { x: this.x0 + SPACING * (TOOLS.length - 1) - 1, y: floor, z: wz + 1 }   // the grass in front of the pillar left of the last section
    ctx.select(TOOLS.length)
    await ctx.easeLookAt(new Vec3(tp.x + 0.5, floor + 1, tp.z + 0.5), 300)
    bot._client.write('block_place', { hand: 0, location: tp, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('block.grass.place', 1)
    await bot.waitForTicks(5)
    ctx.select(TOOLS.length + 1)
    await bot.waitForTicks(3)
    bot._client.write('block_place', { hand: 0, location: { x: tp.x, y: floor + 1, z: tp.z }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('item.flintandsteel.use', 1)
    ctx.mark('lit')
    // back off watching the fuse (4 s)
    const tntAt = new Vec3(tp.x + 0.5, floor + 1.5, tp.z + 0.5)
    let boomed = false
    const onBoom = () => { if (!boomed) { boomed = true; ctx.mark('boom') } }
    bot._client.on('explosion', onBoom)
    bot.setControlState('back', true)
    for (let k = 0; k < 110 && !boomed; k++) {
      if (k === 30) bot.setControlState('back', false)
      const eye = bot.entity.position.offset(0, 1.62, 0), d = tntAt.minus(eye)
      await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
      await bot.waitForTicks(1)
    }
    bot.setControlState('back', false)
    if (!boomed) { ctx.log('no explosion'); return false }
    await bot.waitForTicks(24)
    bot.removeListener('physicsTick', onTick)
    await bot.waitForTicks(10)
    return !ctx.died
  }
}
