// "ladder clutch 😳" (~16 s, four beats): the bot stands on the edge of a stone-brick wall looking
// down the drop, walks off, turns to face the wall while falling and, a couple of ticks before the
// ground, places one ladder on the wall (real block_place) in the row of its last airborne tick. It
// grabs it (vanilla: a climbable block clamps the fall to 0.15 b/t and resets the fall distance) and
// lands with full hearts, then looks up the wall. First from 20 blocks too late (it hits the ground
// first and loses most of its hearts), then from 30, 45 and 60 blocks, all clean. Placements use vanilla reach (4.5,
// nudged to 5 so a 60-block fall always has a tick in reach), one tick ahead.
const WALLS = [{ h: 20, dz: 0, late: true }, { h: 30, dz: 9 }, { h: 45, dz: 18 }, { h: 60, dz: 27 }]

module.exports = {
  name: 'ladder_clutch',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'ladder clutch 😳',
  edit: {
    caption: 'ladder clutch 😳', red: 'ladder', song: 'songs/misery.mp3', dropAt: 'placed', startAt: 'start:0', endAfter: 'final:0.9',
    subs: [['jump', '20 blocks', 1.4, 0], ['landed', 'too late', 1.2, 0], ['jump', '30 blocks', 1.4, 1], ['jump', '45 blocks', 1.4, 2], ['jump', '60 blocks', 1.4, 3]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    const R = 22, top = floor + Math.max(...WALLS.map(w => w.h))
    for (let y0 = floor + 1; y0 <= top + 6; y0 += 10) await ctx.cmd(`/fill ${x - R} ${y0} ${z - R} ${x + R} ${Math.min(y0 + 9, top + 6)} ${z + R + 27} air`)   // 45x72x10 < the 32768 cap
    await ctx.cmd(`/fill ${x - R} ${floor - 3} ${z - R} ${x + R} ${floor - 1} ${z + R + 27} dirt`)
    await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R + 27} grass_block`)
    // two walls, 1 thick (x), 5 wide (z): the bot falls down their east faces
    for (const w of WALLS) {
      await ctx.cmd(`/fill ${x} ${floor + 1} ${z + w.dz - 2} ${x} ${floor + w.h} ${z + w.dz + 2} stone_bricks`)
      await ctx.cmd(`/fill ${x} ${floor + 1} ${z + w.dz - 2} ${x} ${floor + 3} ${z + w.dz + 2} mossy_stone_bricks`)
    }
    await ctx.cmd('/gamerule fall_damage true')
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 5')
    await ctx.hotbar([['ladder', 16], ['cobblestone', 64], 'stone_pickaxe', ['bread', 12]])
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    ctx.select(0)
    // on the first wall already, so the recording opens on the drop (a tp during the recording
    // showed the old view and then held still for the tp check)
    await ctx.tpCheck(x + 0.75, floor + WALLS[0].h + 1, z + 0.5, -90, 70)
    return { x, y: floor, z }
  },

  // one clutch off wall i: stand on its east edge looking down the drop, walk off, turn to face the
  // wall while falling, place the ladder in the row of the last airborne tick, land, look up the wall
  async clutch (ctx, i) {
    const { bot, Vec3 } = ctx
    const { x, floor } = this, w = WALLS[i], z = this.z + w.dz
    const E = -Math.PI / 2, W = Math.PI / 2   // yaw facing east / west
    if (i > 0) {   // quick tp: the cut lands straight on the glance down the drop
      for (let t = 0; ; t++) {
        await ctx.cmd(`/tp @s ${x + 0.75} ${floor + w.h + 1} ${z + 0.5} -90 70`)
        if (Math.abs(bot.entity.position.y - (floor + w.h + 1)) < 0.1) break
        if (t > 20) throw new Error('teleport did not stick')
      }
    }
    ctx.mark(i === 0 ? 'start' : 'top', { n: i })
    await ctx.easeLook(E + 0.2, -1.2, 300)
    await ctx.easeLook(E - 0.15, -1.3, 350)
    ctx.mark('jump', { n: i })
    bot.setControlState('forward', true)
    for (let k = 0; k < 40 && bot.entity.onGround; k++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)
    bot.setControlState('back', true)        // brake: fall ~0.6 from the wall face
    for (let k = 0; k < 12 && (k < 1 || bot.entity.velocity.x > 0.005); k++) await bot.waitForTicks(1)
    bot.setControlState('back', false)
    ctx.log('falling at x', (bot.entity.position.x - x).toFixed(3))
    // turn around in the air to face the wall, looking down its face
    ctx.easeLook(W, -1.2, 450)
    let placed = false, landed = false, row = null
    const onTick = () => {
      const p = bot.entity.position, vy = bot.entity.velocity.y
      if (placed) { if (!landed && bot.entity.onGround) { landed = true; ctx.mark('landed', { n: i }); if (i === WALLS.length - 1) ctx.mark('final') } return }
      if (w.late) {   // the near miss: the ladder only goes up once the ground has already hit
        if (!bot.entity.onGround) return
        placed = true; landed = true; row = floor + 1
        ctx.mark('landed', { n: i }); ctx.mark('late_placed', { n: i }); ctx.sound('block.ladder.place')
        process.nextTick(() => { bot._client.write('block_place', { hand: 0, location: { x, y: row, z: Math.floor(p.z) }, direction: 5, cursorX: 1, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 }); bot.swingArm() })
        return
      }
      if (vy > -0.5) return
      // predict the tick-start heights (prismarine: move by v, then v = (v - 0.08) * 0.98)
      let y = p.y, v = vy, k = 0, last = null
      while (y > floor + 1 && k < 40) { last = { y, k }; y += v; v = (v - 0.08) * 0.98; k++ }
      // vanilla reach: the ray from the eye to the ladder's spot on the wall face must be <= 4.5
      const reach = last && Math.hypot(p.x - (x + 1), p.y + 1.62 - (Math.floor(last.y) + 0.5))
      if (last && last.k <= 2 && last.k >= 1 && reach <= 4.95) {
        placed = true
        row = Math.floor(last.y)
        ctx.mark('placed', { n: i, row: row - floor })
        ctx.sound('block.ladder.place')
        ctx.log('reach', reach.toFixed(2), 'ticks ahead', last.k, 'ladder at row', row - floor, 'feet', (p.y - floor - 1).toFixed(2), 'vy', vy.toFixed(2), 'last airborne y', (last.y - floor).toFixed(2))
        process.nextTick(() => { bot._client.write('block_place', { hand: 0, location: { x, y: row, z: Math.floor(p.z) }, direction: 5, cursorX: 1, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 }); bot.swingArm() })
      }
    }
    bot.on('physicsTick', onTick)
    for (let k = 0; k < 300 && !landed && !ctx.died; k++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', onTick)
    if (!placed || ctx.died) return false
    const lad = bot.blockAt(new Vec3(x + 1, row, Math.floor(bot.entity.position.z)))
    ctx.log('ladder block:', lad && lad.name, 'health', bot.health)
    await bot.waitForTicks(2)
    // step back from the wall and look up the way it came, ladder in view
    bot.setControlState('back', true)
    ctx.easeLook(W + 0.15, 0.2, 500)
    await bot.waitForTicks(8)
    bot.setControlState('back', false)
    const last = i === WALLS.length - 1
    await ctx.easeLook(W - 0.1, last ? 1.1 : 0.75, last ? 900 : 500)
    if (last) { ctx.mark('outro'); await ctx.easeLook(W - 0.45, 1.25, 1100) }
    if (w.late) { ctx.log('late health', bot.health); const ok = !ctx.died && bot.health < 20; await ctx.cmd('/effect give @s instant_health 1 10 true'); return ok }
    return !ctx.died && bot.health >= 20
  },

  async perform (ctx) {
    for (let i = 0; i < WALLS.length; i++) if (!(await this.clutch(ctx, i))) return false
    ctx.log('final health', ctx.bot.health)
    return true
  }
}
