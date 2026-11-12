// "dyeing sheep until it's a rainbow 🌈": a fenced line of 8 white sheep (NoAI). The bot strafes along the line
// using a dye on each (aimed by lib/act.js A.useOn; vanilla dyes the sheep), red to purple, and backs up to show the
// rainbow. Then the reward (no-op audit 2026-11-12, owner r:r4607fa: the jeb_ tag on one far sheep wasn't one): shears
// back down the line, each sheep pops its wool in its colour, and it ends on the rainbow of wool on the grass.
const COLORS = [
  { dye: 'red_dye', id: 14, sub: 'red' },
  { dye: 'orange_dye', id: 1, sub: 'orange' },
  { dye: 'yellow_dye', id: 4, sub: 'yellow' },
  { dye: 'lime_dye', id: 5, sub: 'lime' },
  { dye: 'light_blue_dye', id: 3, sub: 'light blue' },
  { dye: 'blue_dye', id: 11, sub: 'blue' },
  { dye: 'purple_dye', id: 10, sub: 'purple' }
]
const N = COLORS.length
const STEP = 2                       // blocks between sheep

const { plateau } = require('../lib/plateau')
module.exports = {
  name: 'rainbow_sheep',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: "dyeing sheep until it's a rainbow 🌈",
  edit: {
    subsY: 0.15, caption: "dyeing sheep until it's a rainbow 🌈", red: 'rainbow', dropAt: 'lastshear',
    startAt: 'dye:-0.45',
    endAfter: 'lastshear:0.95',   // r:r188b46: the last burst (red) is the payoff, the wool landing, the look along the sheared rainbow starting (the end <= 1 s after the payoff)
    subs: [...COLORS.map((c, i) => ['dye', c.sub, 0.9, i]), ['shears', 'now the best part', 1.2]],
    punch: [['lastshear', 0, 1.06]],
    sfx: [['air', 'start', 'pile', { gain: 0.5 }], ['dip', 'lastshear', 0.3], ['ding', 'lastshear']]   // a hit on the payoff over the song; room tone from frame 1
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    this.x = x; this.z = z
    await ctx.defaultRules()
    // the field levelled at the terrain's high percentile (lib/plateau): the old box cleared down to the start height
    // left a cut dirt-and-stone wall behind the line (review 2026-11-11)
    const floor = await plateau(ctx, { x0: x - 56, x1: x + 56, z0: z - 30, z1: z + 24, above: 24, biome: 'minecraft:plains', pct: 0.995, taper: 0, trees: 10 })
    this.floor = floor
    await ctx.cmd('/kill @e[type=!player]')   // a wandering villager from a village nearby walked through the shot (rec_check: stair-stepping cast)
    // sheep stand at x0 + i*STEP, z; a fence behind and posts between them, open at the front
    const x0 = x - Math.floor((N - 1) * STEP / 2)
    this.x0 = x0
    await ctx.cmd(`/fill ${x0 - 1} ${floor + 1} ${z - 1} ${x0 + (N - 1) * STEP + 1} ${floor + 1} ${z - 1} oak_fence`)
    for (let i = 0; i <= N; i++) await ctx.cmd(`/setblock ${x0 - 1 + i * STEP} ${floor + 1} ${z} oak_fence`)
    for (let i = 0; i < N; i++) {
      await ctx.cmd(`/summon sheep ${x0 + i * STEP + 0.5} ${floor + 1} ${z + 0.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Color:0b,Rotation:[0f,0f],Tags:["rs${i}"]}`)
    }
    await ctx.cmd('/attribute @s minecraft:entity_interaction_range base set 5')
    // everything it uses is in the hotbar from the start (items used to appear from nowhere mid-video)
    await ctx.hotbar([...COLORS.map(c => c.dye), 'shears'])
    await bot.waitForTicks(4)
    await ctx.tpCheck(x0 + 0.5 - 1.2, floor + 1, z + 3.3, 200, 20)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  sheepAt (ctx, i) {
    const px = this.x0 + i * STEP + 0.5, pz = this.z + 0.5
    return Object.values(ctx.bot.entities).find(e => e.name === 'sheep' && Math.abs(e.position.x - px) < 0.3 && Math.abs(e.position.z - pz) < 0.3)
  },

  async perform (ctx) {
    const { bot } = ctx
    const A = require('../lib/act')(ctx)
    const { floor, z, x0 } = this
    await bot.waitForTicks(4)
    for (let i = 0; i < N; i++) {
      const s = this.sheepAt(ctx, i)
      if (!s) { ctx.log('no sheep at', i); return false }
      // line up in front of it (strafe right), eyes on it
      const tx = x0 + i * STEP + 0.5
      ctx.select(i)
      if (i > 0) {
        bot.setControlState('right', true)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
        const look = ctx.easeLookAt(new ctx.Vec3(tx, floor + 1.7, z + 0.5), 380)
        // strafing follows the view, and the view is on the sheep (ahead-left), so it drifted away
        // from the row (out of reach by sheep 6): hold the row distance with forward/back
        const zt = z + 3.3
        while (bot.entity.position.x < tx - 1.0) {
          bot.setControlState('forward', bot.entity.position.z > zt + 0.15)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
          bot.setControlState('back', bot.entity.position.z < zt - 0.15)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
          await bot.waitForTicks(1)
        }
        bot.setControlState('right', false); bot.setControlState('forward', false); bot.setControlState('back', false)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
        await look
      } else {
        await ctx.easeLookAt(new ctx.Vec3(tx, floor + 1.7, z + 0.5), 300)
      }
      // the crosshair on THIS sheep when the dye goes on (owner, r:rffba12: "we are not looking at the right sheep
      // when we dye"): the look above was aimed from where the strafe started, so settle it from where I stand now
      await A.useOn(s)                               // lib/act.js: acts only once the crosshair is on this sheep
      ctx.mark('dye', { n: i })
      ctx.sound('item.dye.use', 1, 1)
      await bot.waitForTicks(3)
      const col = (s.metadata && s.metadata[17]) & 15
      ctx.log('sheep', i, 'colour', col, 'want', COLORS[i].id)
      ctx.sound('entity.sheep.ambient', 0.6, 0.9 + i * 0.05)
      await bot.waitForTicks(8)
    }
    // check every sheep took its colour
    for (let i = 0; i < COLORS.length; i++) {
      const s = this.sheepAt(ctx, i), col = (s.metadata && s.metadata[17]) & 15
      if (col !== COLORS[i].id) { ctx.log('sheep', i, 'is colour', col, 'not', COLORS[i].id); return false }
    }
    // back up and take in the rainbow (the last, white sheep at the end of the line)
    const mid = new ctx.Vec3(x0 + (N - 1) * STEP / 2 + 0.5, floor + 1, z + 0.5)
    bot.setControlState('back', true)   // straight back (the strafe left too took the line into a corner)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
    let rev = false
    for (let t = 0; t < 16; t++) {                      // a short back-up: the rainbow stays big in frame
      await bot.waitForTicks(1)
      if (t === 8) { ctx.mark('reveal'); ctx.sound('entity.player.levelup', 0.5, 1.2); rev = true }
      const e = bot.entity.position, d = mid.minus(e.offset(0, 1.62, 0))
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      const gain = Math.min(0.4, 0.05 + t * 0.04)   // eased in: a flat 0.4 whipped the first ticks at 800 deg/s
      const step = Math.max(-0.17, Math.min(0.17, dy * gain))   // at most ~10 deg a tick (review: 245 deg/s, the cap is 240)
      bot.look(bot.entity.yaw + step, bot.entity.pitch + (pitch - bot.entity.pitch) * gain, true)   // (0.25 left the line in a corner)   // motion-ok: the eased back-up look, capped at ~10 deg a tick
      if (t === 18) bot.setControlState('left', false)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
    }
    bot.setControlState('back', false); bot.setControlState('left', false)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
    if (!rev) ctx.mark('reveal')
    await bot.waitForTicks(8)
    // the reward: shears back down the line (purple to red), each sheep pops its wool in its colour
    ctx.select(7)
    const zt = z + 2.6
    let first = true
    for (let i = N - 1; i >= 0; i--) {
      const sh = this.sheepAt(ctx, i)
      if (!sh) { ctx.log('no sheep at', i); return false }
      const tx = x0 + i * STEP + 0.5
      const look = ctx.easeLookAt(new ctx.Vec3(tx, floor + 1.4, z + 0.5), first ? 600 : 420)   // (450/300 ms touched 242-261 deg/s)
      // stand a little right of it, at the row distance (strafe left along the line, forward/back to hold the row)
      for (let t = 0; t < 60; t++) {
        const e = bot.entity.position
        const right = e.x > tx + 1.0, near = Math.abs(e.z - zt) < 0.2
        if (!right && near) break
        bot.setControlState('left', right)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
        bot.setControlState('forward', e.z > zt + 0.15)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
        bot.setControlState('back', e.z < zt - 0.15)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
        await bot.waitForTicks(1)
      }
      bot.setControlState('left', false); bot.setControlState('forward', false); bot.setControlState('back', false)   // motion-ok: a strafe/step along the sheep row on cleared flat grass (no obstacle: the row is fenced behind)
      await look
      if (first) { ctx.mark('shears'); first = false }
      await A.useOn(sh)                              // lib/act.js: only with the crosshair on this sheep
      ctx.mark('shear', { n: i })
      if (i === 0) ctx.mark('lastshear')
      await bot.waitForTicks(4)
    }
    // the payoff shot: from the red end, close, eyes along the line: the last wool still in the air in front, the sheared
    // rainbow and its wool receding (backed off to the middle 7 blocks out, the wool read as specks: review of the take)
    const pileAt = new ctx.Vec3(x0 + 3 * STEP + 0.5, floor + 0.8, z + 1.0)
    await ctx.easeLookAt(pileAt, 700)
    await bot.waitForTicks(2)
    const wool = Object.values(bot.entities).filter(e => e.name === 'item').length
    ctx.log('wool items on the ground:', wool)
    if (wool < N) return false
    ctx.mark('pile')
    await bot.waitForTicks(30)
    return true
  }
}
