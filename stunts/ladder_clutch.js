// "bro trusted ONE ladder with his life 😳" (~15 s, three drops, each with a real stake at the bottom): the bot stands
// on the edge of a wall looking down the drop, walks off, turns to face the wall while falling and, a couple of ticks
// before the ground, places one ladder on the wall (real block_place) in the row of its last airborne tick. It grabs it
// (vanilla: a climbable block clamps the fall and resets the fall distance) and lands without damage.
//   30 blocks onto grass (the trick), 60 blocks into a cactus field (the one clear tile at the wall's foot), 80 blocks
//   onto a single grass block in a lava pool. After each landing the camera looks at what it just missed.
// (No-op audit 2026-11-12, owner r:r4607fa: "the clutches all look alike, end in the dark": 8 identical beats became
// three with a visible stake each.) Placements use vanilla reach (4.5, nudged to 5 so an 80-block fall always has a
// tick in reach), one tick ahead.
const WALLS = [
  { h: 30, mat: 'stone_bricks', base: 'mossy_stone_bricks', stake: 'grass', sub: '30 blocks' },
  { h: 60, mat: 'sandstone', stake: 'cactus', sub: '60 blocks... into cactus' },
  { h: 80, mat: 'obsidian', stake: 'lava', sub: '80 blocks... into LAVA' }
]
const { openSpots, clearPlants } = require('./_site')

module.exports = {
  name: 'ladder_clutch',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'bro trusted ONE ladder with his life 😳',
  edit: {
    caption: 'bro trusted ONE ladder with his life 😳', red: 'ladder', dropAt: 'placed', startAt: 'jump:-0.25', endAfter: 'seen2:0.4',   // r:r188b46: the look round at the lava it just missed, then out
    // r:r0f3da0 pace: silent until 1.61 s (a walk-off and fall make little vanilla sound): a wind bed from frame 0
    sfx: [['air', 'start', 'final', { gain: 0.5 }], ['dip', 'final', 0.4], ['impact', 'final', { gain: 1.4 }], ['impact', 'seen2', { gain: 0.8 }]],   // (pace: a hit on the landing, and on the look at the lava it missed, the payoff)
    punch: [['seen2', 0, 1.08]],
    subsY: 0.15,   // up in the sky, off the ladder going up at the clutch
    // the teleports between walls cut out; the long falls' middles at x2 (the camera holds still looking down the wall)
    speed: [...WALLS.slice(1).map((_, i) => [`cut${i + 1}a`, `cut${i + 1}b`, 'cut']), ...WALLS.slice(1).map((_, i) => [`fall${i + 1}:0.9`, `catch${i + 1}:-0.6`, 2])],
    subs: WALLS.map((w, i) => ['top', w.sub, 1.6, i])
  },

  async setup (ctx) {
    const { bot } = ctx
    // no cleared box: each wall stands on the natural ground, on an open patch of grass (the wall's
    // column and the 3 blocks east of it where the bot falls and lands, at one level, nothing overhead)
    const g = ctx.findLand(bot.entity.position.x | 0, bot.entity.position.z | 0)
    if (!g) throw new Error('no dry land')
    await ctx.defaultRules()
    await ctx.cmd('/kill @e[type=!player,distance=..150]')
    this.spots = await openSpots(ctx, g.x, g.z, WALLS.map(w => w.h), { axis: 'z', gap: 11, foot: [0, 3, -2, 2], level: [1, 2, -1, 1] })
    for (const [i, w] of WALLS.entries()) {
      const S = this.spots[i]
      ctx.log('wall', w.h, 'at', S)
      await clearPlants(ctx, S.x, S.floor, S.z - 2, S.x + 3, S.floor + 3, S.z + 2)   // the grass and flowers where it lands (plants only)
      // the wall, 1 thick (x), 5 wide (z): the bot falls down its east face
      await ctx.cmd(`/fill ${S.x} ${S.floor} ${S.z - 2} ${S.x} ${S.floor + w.h} ${S.z + 2} ${w.mat}`)   // from the ground (it may sit a block higher or lower)
      if (w.base) await ctx.cmd(`/fill ${S.x} ${S.floor} ${S.z - 2} ${S.x} ${S.floor + 3} ${S.z + 2} ${w.base}`)
      // the stake at its foot: x+1..x+6, z-4..z+4 at floor level, the landing tile (x+1, z) left as grass
      const X0 = S.x + 1, X1 = S.x + 6, Z0 = S.z - 4, Z1 = S.z + 4, F = S.floor
      if (w.stake !== 'grass') {
        await ctx.cmd(`/fill ${X0} ${F + 1} ${Z0} ${X1} ${F + 4} ${Z1} air`)
        await ctx.cmd(`/fill ${X0} ${F - 1} ${Z0} ${X1} ${F - 1} ${Z1} stone`)
        await ctx.cmd(`/fill ${X0} ${F} ${Z0} ${X1} ${F} ${Z1} ${w.stake === 'lava' ? 'lava' : 'sand'}`)
        await ctx.cmd(`/setblock ${X0} ${F} ${S.z} grass_block`)
      }
      if (w.stake === 'cactus') {
        // cacti on every other tile, none touching the wall or the landing tile (a cactus next to a block breaks)
        for (let dx = 2; dx <= 6; dx++) for (let dz = -4; dz <= 4; dz++) {
          if ((dx + dz) % 2) continue
          if (dx <= 2 && Math.abs(dz) <= 1) continue
          const ht = 2 + ((dx * 7 + dz * 3) & 1)
          await ctx.cmd(`/fill ${S.x + dx} ${F + 1} ${S.z + dz} ${S.x + dx} ${F + ht} ${S.z + dz} cactus`)
        }
      }
    }
    const S0 = this.spots[0], SL = this.spots[this.spots.length - 1]
    await ctx.cmd('/gamerule fall_damage true')
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 5')
    await ctx.hotbar([['ladder', 16], ['cobblestone', 64], 'stone_pickaxe', ['bread', 12]])
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    ctx.select(0)
    // on the first wall already, so the recording opens on the drop (a tp during the recording
    // showed the old view and then held still for the tp check)
    await ctx.tpCheck(S0.x + 0.75, S0.floor + WALLS[0].h + 1, S0.z + 0.5, -90, 70)
    return { x: S0.x, y: S0.floor, z: Math.round((S0.z + SL.z) / 2) }   // the row's middle: the harness records the world around it
  },

  // one clutch off wall i: stand on its east edge looking down the drop, walk off, turn to face the
  // wall while falling, place the ladder in the row of the last airborne tick, land, look up the wall
  async clutch (ctx, i) {
    const { bot, Vec3 } = ctx
    const w = WALLS[i], S = this.spots[i], x = S.x, z = S.z, floor = S.floor
    const E = -Math.PI / 2, W = Math.PI / 2   // yaw facing east / west
    if (i > 0) {   // quick tp: the cut lands straight on the glance down the drop
      for (let t = 0; ; t++) {
        bot.chat(`/tp @s ${x + 0.75} ${floor + w.h + 1} ${z + 0.5} -90 70`)
        let ok = false
        for (let k = 0; k < 6 && !ok; k++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.y - (floor + w.h + 1)) < 0.1 }
        if (ok) break
        if (t > 10) throw new Error('teleport did not stick')
      }
      await bot.waitForTicks(1)   // the HUD catches up (a stale slot showed for a frame after the cut)
      ctx.mark(`cut${i}b`)
    }
    if (i === 0) ctx.mark('start')
    ctx.mark('top', { n: i })
    await ctx.easeLook(E + 0.2, -1.2, 300)
    await ctx.easeLook(E - 0.15, -1.3, 350)
    ctx.mark('jump', { n: i }); ctx.mark(`fall${i}`)
    bot.setControlState('forward', true)
    for (let k = 0; k < 40 && bot.entity.onGround; k++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)
    bot.setControlState('back', true)        // brake: fall ~0.6 from the wall face
    for (let k = 0; k < 12 && (k < 1 || bot.entity.velocity.x > 0.005); k++) await bot.waitForTicks(1)
    bot.setControlState('back', false)
    ctx.log('falling at x', (bot.entity.position.x - x).toFixed(3))
    // turn around in the air to face the wall, looking down its face
    ctx.easeLook(W, -1.2, 450)
    let placed = false, landed = false, row = null, lateAt = null
    const onTick = () => {
      const p = bot.entity.position, vy = bot.entity.velocity.y
      if (placed) { if (!landed && bot.entity.onGround) { landed = true; ctx.mark('landed', { n: i }); if (i === WALLS.length - 1) ctx.mark('final') } return }
      if (w.late) {   // the near miss: the ladder only goes up 4 ticks after the ground has hit
        if (!bot.entity.onGround) return
        if (lateAt === null) { lateAt = ctx.tick; ctx.mark('landed', { n: i }); return }
        if (ctx.tick - lateAt < 4) return
        placed = true; landed = true; row = floor + 1
        ctx.mark('late_placed', { n: i }); ctx.sound('block.ladder.place')
        process.nextTick(() => { bot._client.write('block_place', { hand: 0, location: { x, y: row, z: Math.floor(p.z) }, direction: 5, cursorX: 1, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 }); bot.swingArm() })
        return
      }
      if (vy > -0.5) return
      // predict the tick-start heights (prismarine: move by v, then v = (v - 0.08) * 0.98)
      let y = p.y, v = vy, k = 0, last = null
      while (y > floor + 1 && k < 40) { last = { y, k }; y += v; v = (v - 0.08) * 0.98; k++ }
      // vanilla reach: the ray from the eye to the ladder's spot on the wall face must be <= 4.5
      const reach = last && Math.hypot(p.x - (x + 1), p.y + 1.62 - (Math.floor(last.y) + 0.5))
      if (last && ((last.k === 2 && reach <= 4.5) || (last.k === 1 && reach <= 4.95))) {
        placed = true
        row = Math.floor(last.y)
        ctx.mark('placed', { n: i, row: row - floor }); ctx.mark(`catch${i}`)
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
    const last = i === WALLS.length - 1
    if (w.stake === 'grass') {
      // step back from the wall and look up the way it came, ladder in view
      bot.setControlState('back', true)   // motion-ok: a step back on the open grass at the wall's foot
      ctx.easeLook(W + 0.15, 0.2, 500)
      await bot.waitForTicks(8)
      bot.setControlState('back', false)   // motion-ok: the step's end
      await ctx.easeLook(W - 0.1, 0.75, 500)
    } else {
      // no step back (it'd be into the cactus or the lava): turn round and look down at what I just missed
      await ctx.easeLook(E + 0.35, -0.75, 950)   // (700 ms: 249 deg/s)
      ctx.mark('missed', { n: i })
      await ctx.easeLook(E - 0.35, -0.7, 700)
      ctx.mark(`seen${i}`)
    }
    if (!last) ctx.mark(`cut${i + 1}a`)
    ctx.log('health after', w.h, bot.health)
    return !ctx.died && bot.health >= 20   // every clutch clean: no damage
  },

  async perform (ctx) {
    for (let i = 0; i < WALLS.length; i++) if (!(await this.clutch(ctx, i))) return false
    await ctx.bot.waitForTicks(20)   // the recording runs past the end (endAfter seen2:0.4)
    ctx.log('final health', ctx.bot.health)
    return true
  }
}
