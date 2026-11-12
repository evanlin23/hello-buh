// "bro trusted ONE ladder with his life 😳" (was the label "ladder clutch 😳": reaction captions, r:r0f3da0) (~32 s, eight beats): the bot stands on the edge of a stone-brick wall looking
// down the drop, walks off, turns to face the wall while falling and, a couple of ticks before the
// ground, places one ladder on the wall (real block_place) in the row of its last airborne tick. It
// grabs it (vanilla: a climbable block clamps the fall to 0.15 b/t and resets the fall distance) and
// lands without damage, then looks up the wall. First from 20 blocks too late (it hits the ground
// first and is left on 3 hearts; the ladder goes up 4 ticks later), then from 25, 30, 40, 50, 60,
// 70 and 80 blocks, all clean on those 3 hearts, each wall a fancier material. Placements use vanilla reach (4.5,
// nudged to 5 so an 80-block fall always has a tick in reach), one tick ahead.
// each wall a different, fancier material: the beats look different and escalate
const WALLS = [
  { h: 20, late: true, mat: 'stone_bricks', base: 'mossy_stone_bricks' }, { h: 25, mat: 'cobblestone', base: 'mossy_cobblestone' },
  { h: 30, mat: 'bricks' }, { h: 40, mat: 'sandstone' }, { h: 50, mat: 'deepslate_bricks' },
  { h: 60, mat: 'quartz_bricks' }, { h: 70, mat: 'polished_blackstone_bricks' }, { h: 80, mat: 'obsidian' }
].map((w, i) => ({ ...w, dz: i * 7 }))   // 7 apart: the whole cleared area must stay within the loaded chunks
const { openSpots, clearPlants } = require('./_site')

module.exports = {
  name: 'ladder_clutch',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'bro trusted ONE ladder with his life 😳',
  edit: {
    caption: 'bro trusted ONE ladder with his life 😳', red: 'ladder', song: 'songs/misery.mp3', dropAt: 'placed', startAt: 'jump:-0.25', endAfter: 'final:0.7',   // r:r188b46 (was 0.9)
    // r:r0f3da0 pace: silent until 1.61 s (a walk-off and fall make little vanilla sound): a wind bed from frame 0
    sfx: [['air', 'start', 'final', { gain: 0.5 }], ['dip', 'final', 0.4], ['impact', 'final', { gain: 1.4 }]],   // (pace: no hit on the 80-block landing)
    subsY: 0.15,   // up in the sky, off the ladder going up at the clutch
    speed: WALLS.slice(1).map((_, i) => [`cut${i + 1}a`, `cut${i + 1}b`, 'cut']),   // the teleports between walls, cut out
    subs: [['top', '20 blocks', 3, 0], ['landed', 'too late', 1.3, 0], ...WALLS.slice(1).map((w, i) => ['top', `${w.h} blocks`, 1.2 + w.h / 40, i + 1])]
  },

  async setup (ctx) {
    const { bot } = ctx
    // no cleared box: each wall stands on the natural ground, on an open patch of grass (the wall's
    // column and the 3 blocks east of it where the bot falls and lands, at one level, nothing overhead)
    const g = ctx.findLand(bot.entity.position.x | 0, bot.entity.position.z | 0)
    if (!g) throw new Error('no dry land')
    await ctx.defaultRules()
    await ctx.cmd('/kill @e[type=!player,distance=..150]')
    this.spots = await openSpots(ctx, g.x, g.z, WALLS.map(w => w.h), { axis: 'z', gap: 6, foot: [0, 3, -2, 2], level: [1, 2, -1, 1] })
    for (const [i, w] of WALLS.entries()) {
      const S = this.spots[i]
      ctx.log('wall', w.h, 'at', S)
      await clearPlants(ctx, S.x, S.floor, S.z - 2, S.x + 3, S.floor + 3, S.z + 2)   // the grass and flowers where it lands (plants only)
      // the wall, 1 thick (x), 5 wide (z): the bot falls down its east face
      await ctx.cmd(`/fill ${S.x} ${S.floor} ${S.z - 2} ${S.x} ${S.floor + w.h} ${S.z + 2} ${w.mat}`)   // from the ground (it may sit a block higher or lower)
      if (w.base) await ctx.cmd(`/fill ${S.x} ${S.floor} ${S.z - 2} ${S.x} ${S.floor + 3} ${S.z + 2} ${w.base}`)
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
    if (!last) ctx.mark(`cut${i + 1}a`)
    if (w.late) { this.hp = bot.health; ctx.log('late health', bot.health); return !ctx.died && bot.health < 20 }
    return !ctx.died && bot.health >= this.hp   // no heal: every later clutch on the hearts left, no damage
  },

  async perform (ctx) {
    for (let i = 0; i < WALLS.length; i++) if (!(await this.clutch(ctx, i))) return false
    ctx.log('final health', ctx.bot.health)
    return true
  }
}
