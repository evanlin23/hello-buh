// "500 sand pillars vs 1 block 💀" (docs/ideas.md #3, ~18 s): a field of 500 sand pillars
// (20 x 25, 6 sand each), every one standing on a dirt block over a torch (the torch trick). The bot,
// on a lookout tower at the edge, digs out the first pillar's dirt for real: the sand drops onto
// the torch and pops into items. Then the "dominoes": each pillar's dirt goes (by command, the
// scale nobody could do by hand) a moment after its neighbour's, a ripple that speeds up across
// the field until all 500 are gone. Everything stays within 64 blocks (entities are recorded
// within 64 of the bot).
const COLS = 20, ROWS = 25, STEP = 2, H = 6
const TOWER = 7     // the lookout's height

module.exports = {
  name: 'sand_dominoes',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '500 sand pillars vs 1 block 💀',
  edit: {
    caption: '500 sand pillars vs 1 block 💀', red: '1 block', song: 'songs/funk_abnormal.mp3', dropAt: 'first',
    startAt: 'beat:-0.1', endAfter: 'all_gone:1.0',
    subs: [['first', '1 pillar', 1.5, 0], ['n10', '10', 1.2, 0], ['n100', '100', 1.5, 0], ['n300', '300', 1.4, 0], ['n500', '500', 2.0, 0], ['tower', 'wait, my tower', 2.0, 0]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: F } = g
    Object.assign(this, { x, z, F })
    await ctx.defaultRules()
    await ctx.cmd('/gamerule fire_spread_radius_around_player 0')
    // a clean field: x-24..x+24, z-56..z+8
    for (let y0 = F + 1; y0 <= F + 16; y0 += 8) await ctx.cmd(`/fill ${x - 24} ${y0} ${z - 56} ${x + 24} ${y0 + 7} ${z + 8} air`)
    await ctx.cmd(`/fill ${x - 24} ${F} ${z - 56} ${x + 24} ${F} ${z + 8} grass_block`)
    await ctx.cmd(`/fill ${x - 24} ${F - 4} ${z - 56} ${x + 24} ${F - 1} ${z + 8} dirt`)
    // pillar (i, j): x0 + i*STEP, z0 - j*STEP. Row 0 is nearest the tower.
    this.x0 = x - (COLS - 1); this.z0 = z - 3
    this.at = (i, j) => ({ x: this.x0 + i * STEP, z: this.z0 - j * STEP })
    // build row 0, then clone it back row by row
    for (let i = 0; i < COLS; i++) {
      const p = this.at(i, 0)
      await ctx.cmd(`/setblock ${p.x} ${F + 1} ${p.z} torch`)
      await ctx.cmd(`/setblock ${p.x} ${F + 2} ${p.z} dirt`)
      await ctx.cmd(`/fill ${p.x} ${F + 3} ${p.z} ${p.x} ${F + 2 + H} ${p.z} sand`)
    }
    const xa = this.x0, xb = this.x0 + (COLS - 1) * STEP
    for (let j = 1; j < ROWS; j++) {
      const zt = this.z0 - j * STEP
      await ctx.cmd(`/clone ${xa} ${F + 1} ${this.z0} ${xb} ${F + 2 + H} ${this.z0} ${xa} ${F + 1} ${zt}`)
    }
    // the lookout: a cobblestone tower behind the middle of row 0
    this.tx = this.at(COLS / 2, 0).x
    this.tz = this.z0 + 3
    // ...made of sand too, on the same torch trick (the payoff)
    await ctx.cmd(`/fill ${this.tx - 1} ${F + 1} ${this.tz} ${this.tx} ${F + 1} ${this.tz + 1} torch`)
    await ctx.cmd(`/fill ${this.tx - 1} ${F + 2} ${this.tz} ${this.tx} ${F + 2} ${this.tz + 1} dirt`)
    await ctx.cmd(`/fill ${this.tx - 1} ${F + 3} ${this.tz} ${this.tx} ${F + TOWER} ${this.tz + 1} sand`)
    await ctx.hotbar(['iron_shovel'])
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 9')
    await ctx.tpCheck(this.tx + 0.0, F + TOWER + 1, this.tz + 1.0, 180, 40)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: F, z: z - 24 }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { F } = this
    const first = [COLS / 2, 0]
    // the ripple: a pillar goes at a time that grows with its distance from the first, and the
    // wave speeds up (time ~ sqrt(distance)) so it crosses the far rows fast
    const order = []
    for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
      if (i === first[0] && j === first[1]) continue
      const d = Math.hypot(i - first[0], j - first[1])
      order.push({ i, j, t: Math.round(20 * Math.pow(d, 0.62)) })
    }
    order.sort((a, b) => a.t - b.t)
    // sounds: the sand landing and the pops, thinned out
    const fp = this.at(first[0], first[1])
    const base = new Vec3(fp.x, F + 2, fp.z)
    // open on the whole field, then down to the first pillar's dirt
    ctx.mark('beat')
    await ctx.easeLookAt(new Vec3(fp.x + 0.5, F + 2, fp.z - 20), 300)
    await ctx.easeLookAt(base.offset(0.5, 0.5, 0.9), 450)
    // a real dig on the dirt (south face)
    const b = bot.blockAt(base)
    const n = Math.max(1, Math.ceil(bot.digTime(b) / 50))
    bot._client.write('block_dig', { status: 0, location: base, face: 3, sequence: 0 })
    for (let k = 0; k < n; k++) { if (k % 4 === 0) { bot.swingArm(); ctx.sound('block.gravel.hit', 0.25, 0.5) } await bot.waitForTicks(1) }
    bot._client.write('block_dig', { status: 2, location: base, face: 3, sequence: 0 })
    bot.swingArm()
    ctx.sound('block.gravel.break', 1, 0.8); ctx.particles('block', base, { block: 'dirt' })
    bot.chat(`/setblock ${base.x} ${base.y} ${base.z} air`)          // in case the dig was refused
    ctx.mark('first')
    // watch it melt
    for (let k = 0; k < 16; k++) { if (k % 3 === 0) ctx.sound('block.sand.fall', 0.6, 0.9 + k * 0.01); if (k % 3 === 1) ctx.sound('entity.item.pickup', 0.3, 1.6); await bot.waitForTicks(1) }
    // then the dominoes
    const t0 = ctx.tick
    let next = 0, gone = 1
    const marks = { 10: 'n10', 100: 'n100', 300: 'n300', 500: 'n500' }
    const lookTarget = (frac) => {
      // the camera follows the front of the wave: from near rows out to the far ones, sweeping a little
      const zf = this.z0 - (ROWS - 1) * STEP * Math.min(1, frac * 1.15)
      const xf = this.tx + Math.sin(frac * Math.PI * 1.5) * 8
      return new Vec3(xf, F + 2, zf)
    }
    let looking = null
    while (next < order.length) {
      const t = ctx.tick - t0
      while (next < order.length && order[next].t <= t) {
        const p = this.at(order[next].i, order[next].j)
        bot.chat(`/setblock ${p.x} ${F + 2} ${p.z} air`)
        next++; gone++
        if (marks[gone]) ctx.mark(marks[gone])
      }
      if (t % 2 === 0) ctx.sound('block.sand.fall', 0.5, 0.85 + (t % 7) * 0.03)
      if (t % 3 === 1) ctx.sound('entity.item.pickup', 0.25, 1.4 + (t % 5) * 0.1)
      if (!looking && t % 6 === 0) {
        const tgt = lookTarget(next / order.length)
        const eye = bot.entity.position.offset(0, 1.62, 0), d = tgt.minus(eye)
        looking = ctx.easeLook(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), 300).then(() => { looking = null })
      }
      await bot.waitForTicks(1)
    }
    if (looking) await looking
    // the last ones melting, then: the tower was sand too
    for (let k = 0; k < 14; k++) { if (k % 3 === 0) ctx.sound('block.sand.fall', 0.4, 0.9); await bot.waitForTicks(1) }
    await ctx.easeLook(bot.entity.yaw + 0.25, -1.2, 400)          // look down the tower
    ctx.mark('tower')
    bot.chat(`/fill ${this.tx - 1} ${F + 2} ${this.tz} ${this.tx} ${F + 2} ${this.tz + 1} air`)
    let landed = false
    for (let k = 0; k < 80; k++) {
      await bot.waitForTicks(1)
      if (k % 3 === 0) ctx.sound('block.sand.fall', 0.7, 0.9)
      if (k > 8 && bot.entity.onGround && bot.entity.position.y < F + 1.5) { landed = true; break }
    }
    ctx.mark('all_gone')
    ctx.log('landed at the bottom:', landed, bot.entity.position.y - F)
    await ctx.easeLook(bot.entity.yaw - 0.2, 0.5, 700)            // look up: nothing left
    await bot.waitForTicks(4)
    let left = 0
    for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) { const p = this.at(i, j); const bb = bot.blockAt(new Vec3(p.x, F + 3, p.z)); if (bb && bb.name === 'sand') left++ }
    ctx.log('pillars left', left, 'of', COLS * ROWS)
    return left === 0 && !ctx.died
  }
}
