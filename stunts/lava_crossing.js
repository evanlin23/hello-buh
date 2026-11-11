// "every way to cross lava (rated) 💀" (~17 s, four beats): a 5-wide lava river through a field.
// The bot crosses it at four fresh spots, each a real survival technique, with a rating subtitle:
//   1. bridging: sneak to each edge and place cobblestone on its face (lib/act.js A.place)
//   2. water bucket: pour water at the bank, it flows over the lava and turns it to obsidian,
//      scoop the water back up, walk across
//   3. ender pearl: thrown across (aimed by simulating vanilla's pearl flight, like pearl_clutch)
//   4. walking: just walks in. Burns, real death, vanilla death screen.
// Between beats the bot is teleported back to the south bank at the next spot (a hard cut).
const RIVER_W = 5
const LANES = [-18, -6, 6, 18]       // x offsets of the four crossings (water spreads 7 blocks)
const { plateau } = require('../lib/plateau')

module.exports = {
  name: 'lava_crossing',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'every way to cross lava (rated) 💀',
  edit: {
    caption: 'every way to cross lava (rated) 💀', red: 'every', dropAt: 'in_lava',
    onFire: 'in_lava:death', deathScreen: true, startAt: 'beat:0.4', endAfter: 'death:1.15',
    subs: [
      ['beat', 'bridging...', 9, 0], ['crossed', 'bridging: 6/10', 9, 0],
      ['beat', 'water bucket...', 9, 1], ['crossed', 'water bucket: 9/10', 9, 1],
      ['beat', 'ender pearl...', 9, 2], ['crossed', 'ender pearl: 10/10', 9, 2],
      ['beat', 'walking...', 9, 3], ['in_lava', 'walking: 0/10', 9, 0],
      ['death', ' ', 0.05, 0]       // blank: ends the rating as the death screen opens (it drew over the buttons)
    ],
    // pace: sound by 0.3 s (a whoosh into the first beat), a pop on each rating, a song dip + impact on the death
    sfx: [['whoosh', 'beat'], ['pop', 'crossed', { nth: 0 }], ['pop', 'crossed', { nth: 1 }], ['pop', 'crossed', { nth: 2 }],
      ['dip', 'death', 0.3], ['impact', 'death']],
    // the sneak along the finished bridge to the bank (nothing new: review nitpick) at 2x
    speed: [['bridged', 'crossed', 2]]
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    await ctx.cmd('/gamerule fire_spread_radius_around_player 0')
    await ctx.cmd('/gamerule keep_inventory true')   // no drops floating on the lava under the death screen (the renderer doesn't burn them: review nitpick)
    // a levelled field on the real terrain: its edges drop away or rise as slopes (the old flat
    // clearing showed cut walls and a superflat plain)
    const floor = await plateau(ctx, { x0: x - 30, x1: x + 30, z0: z - 18, z1: z + 10, above: 24, below: 6, pct: 0.6, trees: 6 })
    this.x = x; this.z = z; this.floor = floor
    // the river: lava one deep on stone, z-1 .. z-RIVER_W, running east-west
    this.zS = z                     // last row of the south bank
    this.zN = z - RIVER_W - 1       // first row of the north bank
    await ctx.cmd(`/fill ${x - 30} ${floor - 1} ${z - RIVER_W} ${x + 30} ${floor - 1} ${z - 1} stone`)
    await ctx.cmd(`/fill ${x - 30} ${floor} ${z - RIVER_W} ${x + 30} ${floor} ${z - 1} lava`)
    await ctx.hotbar([['cobblestone', 64], 'water_bucket', ['ender_pearl', 16]])
    await ctx.cmd('/effect give @s saturation infinite 1 true')
    await ctx.tpCheck(x + LANES[0] + 0.5, floor + 1, z + 0.7, 180, 30)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  // vanilla thrown-pearl flight (see pearl_clutch): first crossing of targetY on the way down
  simulate (eye, vel, yaw, pitch, targetY) {
    const dir = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) }
    let p = { x: eye.x, y: eye.y - 0.1, z: eye.z }
    let v = { x: dir.x * 1.5 + vel.x, y: dir.y * 1.5 + vel.y, z: dir.z * 1.5 + vel.z }
    for (let t = 0; t < 200; t++) {
      const n = { x: p.x + v.x, y: p.y + v.y, z: p.z + v.z }
      if (v.y < 0 && n.y <= targetY) { const f = (p.y - targetY) / (p.y - n.y); return { x: p.x + (n.x - p.x) * f, z: p.z + (n.z - p.z) * f, t } }
      p = n
      v = { x: v.x * 0.99, y: v.y * 0.99 - 0.03, z: v.z * 0.99 }
    }
    return null
  },

  aim (bot, target) {
    const eye = bot.entity.position.offset(0, 1.62, 0)
    const vel = bot.entity.velocity
    const yaw = Math.atan2(-(target.x - eye.x), -(target.z - eye.z))
    let best = null
    for (let pitch = -0.4; pitch <= 1.0; pitch += 0.005) {
      const hit = this.simulate(eye, vel, yaw, pitch, target.y)
      if (!hit) continue
      const err = Math.hypot(hit.x - target.x, hit.z - target.z)
      if (!best || err < best.err - 1e-3) best = { yaw, pitch, err, t: hit.t }
      if (err < 0.2) break                  // the flattest throw that lands
    }
    return best
  },

  async lane (ctx, i) {
    const { bot } = ctx
    const lx = this.x + LANES[i]
    if (i > 0) {
      // quick teleport back to the south bank (a hard cut): no 1 s stand-still like tpCheck
      const tz = this.zS + (i === 1 ? 2.5 : 0.7)
      await ctx.cmd('/effect give @s instant_health 1 5 true')
      for (let k = 0; ; k++) {
        bot.chat(`/tp @s ${lx + 0.5} ${this.floor + 1} ${tz} 180 30`)
        for (let w = 0; w < 10 && Math.abs(bot.entity.position.x - (lx + 0.5)) > 0.1; w++) await bot.waitForTicks(1)
        await bot.waitForTicks(2)
        if (Math.abs(bot.entity.position.x - (lx + 0.5)) < 0.1 && Math.abs(bot.entity.position.z - tz) < 0.1) break
        if (k === 4) throw new Error('teleport did not stick')
      }
    }
    ctx.mark('beat', { n: i })
    return lx
  },

  crossed (ctx, i) {
    const p = ctx.bot.entity.position
    const ok = p.z < this.zN + 1 && p.y >= this.floor + 0.9 && !ctx.died
    ctx.log('beat', i, 'at', p, ok ? 'crossed' : 'FAILED')
    if (ok) ctx.mark('crossed', { n: i })
    return ok
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { floor, zS, zN } = this
    // lava ambience: pops and the low lava hum now and then
    // the look-backs after each rating: lib/act.js's governed turn, eased, <= 220 deg/s (owner r:r38374d; a 0.5 s ease of
    // 180 deg peaked at 570-640 deg/s, a whip right on the rating), then a short rest on what it shows
    const A = require('../lib/act')(ctx)
    const lookBack = (pitch, hold) => A.turnTo({ yaw: Math.PI, pitch }, { max: 40, hold })
    let amb = 0
    const onTick = () => { if (++amb % 23 === 0) ctx.sound(amb % 3 === 0 ? 'block.lava.pop' : 'block.lava.ambient', 0.5, 0.9 + (amb % 5) * 0.05) }
    bot.on('physicsTick', onTick)

    // --- 1. bridging: sneak forward, placing cobblestone on the face of the block ahead ---
    let lx = await this.lane(ctx, 0)
    ctx.select(0)
    await bot.waitForTicks(4)
    await ctx.easeLook(0, -0.75, 250)
    bot.setControlState('sneak', true)
    bot.setControlState('forward', true)
    for (let k = 0; k < RIVER_W; k++) {
      const ref = new Vec3(lx, floor, zS - k)                     // the block the new one goes against
      // sneak out to the edge (sneaking stops there: the eye ends up just past the edge block's north face)...
      for (let w = 0, last = null, still = 0; w < 80; w++) {
        const pz = bot.entity.position.z
        if (pz - ref.z < -0.2) break
        still = last !== null && Math.abs(pz - last) < 0.005 ? still + 1 : 0
        if (still >= 2 && pz - ref.z < 0.3) break   // stopped by the sneak at the edge (not the walk's first ticks)
        last = pz
        await bot.waitForTicks(1)
      }
      // ...and from there put the block into the lava cell ahead: aimed by construction (lib/act.js A.place, r:rffba12),
      // the crosshair through the lava onto the river's stone bed under the cell (from the edge nothing is in the way;
      // the ray goes through lava as in vanilla), the click on the bed's top face. The feet stop while the hand works
      const cell = ref.offset(0, 0, -1)
      bot.setControlState('forward', false)   // motion-ok: sneaking at the edge
      await A.place(cell, { against: cell.offset(0, -1, 0), sound: 'block.stone.place' })
      bot.setControlState('forward', true)   // motion-ok: on along the bridge
      await bot.waitForTicks(2)
      const b = bot.blockAt(ref.offset(0, 0, -1))
      if (!b || b.name !== 'cobblestone') { ctx.log('bridge block', k, 'not placed:', b && b.name); bot.clearControlStates(); return false }
    }
    ctx.easeLook(0, -0.55, 400)                                     // bridge done: lava both sides, far bank ahead
    ctx.mark('bridged')                                             // the walk to the bank: the edit plays it 2x (nothing new)
    for (let w = 0; w < 80 && bot.entity.position.z > zN + 0.85; w++) await bot.waitForTicks(1)
    bot.clearControlStates()
    await bot.waitForTicks(2)
    if (!this.crossed(ctx, 0)) return false
    await lookBack(-0.45, 6)                                        // look back at the bridge

    // --- 2. water bucket: pour at the bank, the lava under the flow turns to obsidian ---
    lx = await this.lane(ctx, 1)
    ctx.select(1)
    const src = new Vec3(lx + 0.5, floor + 1, zS + 0.5)            // top of the bank's edge block
    await ctx.easeLookAt(src, 300)
    ctx.sound('item.bucket.empty'); bot.activateItem(); bot.swingArm()
    ctx.mark('poured')
    const cells = []
    for (let k = 1; k <= RIVER_W; k++) cells.push(new Vec3(lx, floor, zS - k))
    // watch the obsidian form (lava + water: fizz)
    let done = 0
    for (let w = 0; w < 80 && done < RIVER_W; w++) {
      await bot.waitForTicks(1)
      const now = cells.filter(c => bot.blockAt(c)?.name === 'obsidian').length
      if (now > done) { ctx.sound('block.lava.extinguish', 0.6, 2.0); done = now }
      if (w === 6) ctx.easeLook(0, -0.55, 600)                      // follow the flow across
    }
    ctx.log('obsidian cells', done)
    if (done < RIVER_W) return false
    // scoop the water back up (empty bucket at the source) and walk over
    await ctx.easeLookAt(src.offset(0, 0.1, 0), 200)
    bot.activateItem(); bot.swingArm(); ctx.sound('item.bucket.fill')
    await bot.waitForTicks(4)
    await ctx.easeLook(0, -0.35, 250)
    bot.setControlState('forward', true); bot.setControlState('sprint', true)
    for (let w = 0; w < 80 && bot.entity.position.z > zN - 0.5; w++) await bot.waitForTicks(1)
    bot.clearControlStates()
    await bot.waitForTicks(3)
    if (!this.crossed(ctx, 1)) return false
    await lookBack(-0.4, 4)

    // --- 3. ender pearl over the river ---
    lx = await this.lane(ctx, 2)
    ctx.select(2)
    const target = new Vec3(lx + 0.5, floor + 1, zN - 3 + 0.5)
    await ctx.easeLook(0, -0.2, 250)
    const a = this.aim(bot, target)
    if (!a) { ctx.log('no pearl solution'); return false }
    ctx.log('pearl aim err', a.err.toFixed(2), 'pitch', a.pitch.toFixed(2), 'flight', a.t)
    await ctx.easeLook(a.yaw, a.pitch, 200)
    bot.activateItem(); bot.swingArm(); ctx.sound('entity.ender_pearl.throw', 1, 0.5)
    ctx.mark('pearl_thrown')
    const before = bot.entity.position.clone()
    for (let w = 0; w < 80 && bot.entity.position.distanceTo(before) < 4 && !ctx.died; w++) await bot.waitForTicks(1)
    ctx.sound('entity.player.teleport', 1); ctx.particles('portal', bot.entity.position, { count: 40 })
    await bot.waitForTicks(3)
    if (!this.crossed(ctx, 2)) return false
    await lookBack(-0.3, 6)                                         // look back at where it came from

    // --- 4. just walk in ---
    lx = await this.lane(ctx, 3)
    ctx.select(3)                                                    // empty hand
    await ctx.easeLook(0, -0.3, 200)
    bot.setControlState('forward', true)
    let inLava = false
    for (let w = 0; w < 200 && !ctx.died; w++) {
      await bot.waitForTicks(1)
      if (!inLava && bot.entity.position.z < zS - 0.2 && bot.entity.position.y < floor + 0.9) {
        inLava = true; ctx.mark('in_lava'); ctx.sound('block.lava.extinguish', 0.4)
      }
      if (inLava && w === 2) ctx.easeLook(0, -0.08, 500)            // still trying to reach the far bank
    }
    bot.clearControlStates()
    bot.removeListener('physicsTick', onTick)
    if (!ctx.died) return false
    // hold on the death screen; the lava keeps popping embers in view behind it (vanilla LavaFluid.animateTick), so the
    // backdrop isn't a still frame (rec_check held; keep_inventory leaves no drops to move)
    const dp = bot.entity.position
    for (let k = 0; k < 40; k++) {
      if (k % 6 === 0) { ctx.particles('lava', { x: dp.x + ((k * 7) % 5 - 2) * 0.6, y: floor + 0.95, z: dp.z - 2.5 - (k % 3) }, { count: 2, spread: 0.8 }); ctx.sound('block.lava.pop', 0.5, 0.9 + (k % 3) * 0.1) }
      await bot.waitForTicks(1)
    }
    return ctx.died
  }
}
