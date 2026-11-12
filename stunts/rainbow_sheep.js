// "dyeing sheep until it's a rainbow 🌈": a fenced line of 8 white sheep (NoAI). The bot strafes along the line
// using a dye on each (aimed by lib/act.js A.useOn; vanilla dyes the sheep), red to purple, and backs up to show the
// rainbow. Then the reward (no-op audit 2026-11-12, owner r:r4607fa: the jeb_ tag on one far sheep wasn't one; the
// shearing version's 2-3 silent wool cubes per sheep were too small, review): a "jeb_" name tag on EVERY sheep, back
// down the line, and a step back as the whole rainbow starts cycling colours at once (vanilla jeb_), sped up into a
// disco wave. On a real field (trees, grass, a tapered edge: not superflat, r:r489883).
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
    subsY: 0.15, caption: "dyeing sheep until it's a rainbow 🌈", red: 'rainbow', dropAt: 'party',
    startAt: 'dye:-0.45',
    endAfter: 'party:0.65',   // (output seconds) ~12 of the 16 colours at x30, then out (r:r188b46; rec_check: <= 1 s after the payoff, no 1 s still tail)
    // a hard cut from the last tag (still) to the wide line (still): no walk back on screen (review: 2.85 s of nothing);
    // jeb_ is one colour per 25 ticks, so the full 16-colour cycle is 20 s: x25 plays it once in ~0.8 s, a wave down the
    // line (x6 over 3 s showed 2 muddy steps: review); x30 plays it in ~0.67 s
    speed: [['tagged:-0.15', 'party:-0.05', 'cut'], ['party:0.1', 'party:15', 30]],   // x30: the end <= 1 s after the payoff (rec_check)
    subs: [...COLORS.map((c, i) => ['dye', c.sub, 0.9, i]), ['tags', 'now name them all jeb_...', 1.6]],
    punch: [['party', 0, 1.08]],
    flash: [['party', 0, 0.3]],   // pace: a clear picture change on the payoff
    sfx: [['air', 'start', 'party', { gain: 0.5 }], ...COLORS.map((_, k) => ['pop', 'tag', { nth: k }]), ['dip', 'party', 0.4], ['impact', 'party', { gain: 1.2 }], ['ding', 'party']]   // a pop on every tag (a name tag makes no vanilla sound); a hit on the payoff
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
    const floor = await plateau(ctx, { x0: x - 40, x1: x + 40, z0: z - 24, z1: z + 20, above: 24, biome: 'minecraft:plains', pct: 0.95, taper: 14, trees: 14 })   // (taper 0 and no dressing read as superflat: review)
    this.floor = floor
    // dressed: trees behind the fence and off the sides, grass and flower patches everywhere but the walk lane (z .. z+9)
    const trees = [['oak', -14, -9], ['birch', -4, -12], ['fancy_oak', 7, -10], ['oak', 17, -13], ['birch', 24, -7], ['oak', -22, -6],
      ['fancy_oak', -28, 4], ['birch', 30, 6], ['oak', -6, -20], ['birch', 12, -19]]
    for (const [f, dx, dz] of trees) await ctx.cmd(`/place feature minecraft:${f} ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
    for (let dx = -34; dx <= 34; dx += 7) for (let dz = -20; dz <= 18; dz += 6) {
      if (dz >= -3 && dz <= 10 && Math.abs(dx) <= 16) continue
      await ctx.cmd(`/place feature minecraft:patch_grass ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
      if ((dx + dz) % 3 === 0) await ctx.cmd(`/place feature minecraft:flower_plain ${x + dx + 2} ${floor + 1} ${z + dz + 1}`, { mayFail: true })
    }
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
    await ctx.hotbar([...COLORS.map(c => c.dye), 'name_tag'])
    await ctx.cmd('/item replace entity @s hotbar.7 with name_tag[custom_name="jeb_"] 8')
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
    // the reward: a jeb_ name tag on every sheep, back down the line (purple to red)
    ctx.select(7)
    const zt = z + 2.6
    let first = true
    for (let i = N - 1; i >= 0; i--) {
      const sh = this.sheepAt(ctx, i)
      if (!sh) { ctx.log('no sheep at', i); return false }
      const tx = x0 + i * STEP + 0.5
      const look = ctx.easeLookAt(new ctx.Vec3(tx, floor + 1.4, z + 0.5), first ? 600 : 420)
      for (let t = 0; t < 60; t++) {
        const e = bot.entity.position
        const right = e.x > tx + 1.0, near = Math.abs(e.z - zt) < 0.2
        if (!right && near) break
        bot.setControlState('left', right)   // motion-ok: a strafe along the sheep row on cleared flat grass
        bot.setControlState('forward', e.z > zt + 0.15)   // motion-ok: holding the row distance
        bot.setControlState('back', e.z < zt - 0.15)   // motion-ok: holding the row distance
        await bot.waitForTicks(1)
      }
      for (const k of ['left', 'forward', 'back']) bot.setControlState(k, false)   // motion-ok: stop
      await look
      if (first) { ctx.mark('tags'); first = false }
      await A.useOn(sh)                              // lib/act.js: only with the crosshair on this sheep
      ctx.mark('tag', { n: i })
      await bot.waitForTicks(3)
    }
    await bot.waitForTicks(8)   // a still beat on the last tag: the edit's cut leaves from a rest (owner whip check)
    ctx.mark('tagged')
    // the payoff: back off diagonally to the middle, ~7 out, eyes on the row: the whole line cycling at once
    const lineAt = new ctx.Vec3(x0 + (N - 1) * STEP / 2 + 0.5, floor + 1.0, z + 0.5)
    const goal = new ctx.Vec3(x0 + (N - 1) * STEP / 2 + 0.5, floor + 1, z + 11.5)   // 11.5 out: all seven in frame, none clipped (10 clipped the ends)
    const lk = ctx.easeLookAt(lineAt, 1000)
    for (let t = 0; t < 90; t++) {   // (50 ticks stopped short, off-centre: the red end out of frame)
      const e = bot.entity.position, d = goal.minus(e)
      if (Math.hypot(d.x, d.z) < 0.6) break
      const f = { x: -Math.sin(bot.entity.yaw), z: -Math.cos(bot.entity.yaw) }, rt = { x: -f.z, z: f.x }
      const df = (d.x * f.x + d.z * f.z) / Math.hypot(d.x, d.z), dr = (d.x * rt.x + d.z * rt.z) / Math.hypot(d.x, d.z)
      bot.setControlState('forward', df > 0.35); bot.setControlState('back', df < -0.35)   // motion-ok: a walk back on open flat grass to the goal
      bot.setControlState('right', dr > 0.35); bot.setControlState('left', dr < -0.35)   // motion-ok: as above
      await bot.waitForTicks(1)
    }
    for (const k of ['forward', 'back', 'left', 'right']) bot.setControlState(k, false)   // motion-ok: stop
    await lk
    await ctx.easeLookAt(lineAt, 500)   // re-centred from where the walk ended
    const named = Object.values(bot.entities).filter(e => e.name === 'sheep' && e.metadata && JSON.stringify(e.metadata).includes('jeb_')).length
    ctx.log('jeb_ sheep:', named)
    if (named < N) return false
    ctx.mark('party')
    await bot.waitForTicks(410)   // the full jeb_ cycle (20 s), x25 in the edit
    return true
  }
}
