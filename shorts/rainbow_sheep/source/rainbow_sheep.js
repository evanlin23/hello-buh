// "dyeing sheep until it's a rainbow 🌈": a fenced line of 8 white sheep (NoAI). The bot strafes along the line
// using a dye on each (aimed by lib/act.js A.useOn; vanilla dyes the sheep), red to purple, and backs up to show the
// rainbow. Then a "jeb_" name tag on the 8th: vanilla turns it into a colour-cycling sheep, held big in frame and sped
// up so it runs through the colours. (The old all-jeb_ and shearing beats were cut: the Short ends on the tag.)
const COLORS = [
  { dye: 'red_dye', id: 14, sub: 'red' },
  { dye: 'orange_dye', id: 1, sub: 'orange' },
  { dye: 'yellow_dye', id: 4, sub: 'yellow' },
  { dye: 'lime_dye', id: 5, sub: 'lime' },
  { dye: 'light_blue_dye', id: 3, sub: 'light blue' },
  { dye: 'blue_dye', id: 11, sub: 'blue' },
  { dye: 'purple_dye', id: 10, sub: 'purple' }
]
const N = COLORS.length + 1          // the last one gets the name tag
const STEP = 2                       // blocks between sheep

const { plateau } = require('../lib/plateau')
module.exports = {
  name: 'rainbow_sheep',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: "dyeing sheep until it's a rainbow 🌈",
  edit: {
    subsY: 0.15, caption: "dyeing sheep until it's a rainbow 🌈", red: 'rainbow', dropAt: 'jeb',
    startAt: 'dye:-0.45',
    // the short cut (lead 2026-11-11: as short as it reads): the seven dyes, the rainbow, then the jeb_ tag turns
    // the last white sheep into all of them at once; ends on it (the all-jeb_ and shearing beats are recorded, unused)
    endAfter: 'jeb:1.0',
    // the jeb_ sheep cycles a colour per 25 ticks (vanilla): held big and centred for 8 s after the tag, x8, so the last
    // 0.9 s runs through ~6 colours; the tag is timed onto a bright run (review 2026-11-11: x3 over a back-off showed red,
    // black, white; x5-6 covers 4-5 colours, which from most phases holds only 3 bright ones)
    speed: [['jeb:0.1', 'jeb:7.6', 8]],
    subs: [...COLORS.map((c, i) => ['dye', c.sub, 0.9, i])],   // (no 'jeb_' sub: it sat on the jeb_ nameplate)
    punch: [['jeb', 0, 1.06]],
    sfx: [['air', 'start', 'jeb', { gain: 0.5 }], ['dip', 'jeb', 0.3], ['ding', 'jeb']]   // the gate: a sound hit on the jeb_ payoff over the song   // room tone from frame 1 (pace: the first sound was at 0.41 s)
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
    await ctx.hotbar([...COLORS.map(c => c.dye), 'name_tag', 'shears'])
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
      if (i === N - 1) { ctx.select(7); await bot.waitForTicks(2) } else ctx.select(i)
      if (i > 0) {
        bot.setControlState('right', true)
        const look = ctx.easeLookAt(new ctx.Vec3(tx, floor + 1.7, z + 0.5), 380)
        // strafing follows the view, and the view is on the sheep (ahead-left), so it drifted away
        // from the row (out of reach by sheep 6): hold the row distance with forward/back
        const zt = z + 3.3
        while (bot.entity.position.x < tx - 1.0) {
          bot.setControlState('forward', bot.entity.position.z > zt + 0.15)
          bot.setControlState('back', bot.entity.position.z < zt - 0.15)
          await bot.waitForTicks(1)
        }
        bot.setControlState('right', false); bot.setControlState('forward', false); bot.setControlState('back', false)
        await look
      } else {
        await ctx.easeLookAt(new ctx.Vec3(tx, floor + 1.7, z + 0.5), 300)
      }
      if (i === N - 1) break                         // the name tag comes after the reveal
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
    bot.setControlState('back', true)   // straight back (the strafe left too took the line into a corner)
    let rev = false
    for (let t = 0; t < 16; t++) {                      // a short back-up: the rainbow stays big in frame
      await bot.waitForTicks(1)
      if (t === 8) { ctx.mark('reveal'); ctx.sound('entity.player.levelup', 0.5, 1.2); rev = true }
      const e = bot.entity.position, d = mid.minus(e.offset(0, 1.62, 0))
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      const gain = Math.min(0.4, 0.05 + t * 0.04)   // eased in: a flat 0.4 whipped the first ticks at 800 deg/s
      const step = Math.max(-0.17, Math.min(0.17, dy * gain))   // at most ~10 deg a tick (review: 245 deg/s, the cap is 240)
      bot.look(bot.entity.yaw + step, bot.entity.pitch + (pitch - bot.entity.pitch) * gain, true)   // (0.25 left the line in a corner)
      if (t === 18) bot.setControlState('left', false)
    }
    bot.setControlState('back', false); bot.setControlState('left', false)
    if (!rev) ctx.mark('reveal')
    await bot.waitForTicks(8)
    // walk back to the white one and name it jeb_
    const last = this.sheepAt(ctx, N - 1), lx = x0 + (N - 1) * STEP + 0.5
    ctx.select(7)
    const p = new ctx.Vec3(lx, floor + 1.7, z + 0.5)
    const look = ctx.easeLookAt(p, 500)
    bot.setControlState('forward', true)
    for (let t = 0; t < 60 && bot.entity.position.distanceTo(new ctx.Vec3(lx, floor + 1, z + 0.5)) > 2.6; t++) {   // within 3 blocks: the jeb_ nameplate shows
      await bot.waitForTicks(1)
      if (t > 10) { const e = bot.entity.position, d = p.minus(e.offset(0, 1.62, 0)); let dy = Math.atan2(-d.x, -d.z) - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; bot.look(bot.entity.yaw + dy * 0.3, bot.entity.pitch + (Math.atan2(d.y, Math.hypot(d.x, d.z)) - bot.entity.pitch) * 0.3, true) }   // (a hard set snapped 238 deg/s)
    }
    bot.setControlState('forward', false)
    await look
    // time the tag onto a bright run (renderer/entities.js sheepColor: colour (tick / 25 + id) % 16, the order
    // white orange magenta light_blue yellow lime pink gray light_gray cyan purple blue brown green red black): the
    // edit shows ticks tag+2 .. tag+146 (x8), ~5.8 colours from the phase there; starting on gray (7), blue (11) or
    // brown (12) gives only 3 bright ones, so look back along the rainbow first until the phase is right
    const BAD = new Set([7, 11, 12]), LAG = 4   // ticks from here to the tag landing (aim already on it)
    const phase = (t) => (Math.floor((t + 2) / 25) + last.id) % 16
    let g = 0
    while (BAD.has(phase(ctx.tick + g + LAG)) || (g > 0 && g < 16)) g++
    if (g > 0) {
      ctx.mark('glance_line', { ticks: g })
      const lineMid = new ctx.Vec3(x0 + (N - 1) * STEP / 2 + 0.5, floor + 1.2, z + 0.5)
      const half = Math.floor(g / 2)
      await ctx.easeLookAt(lineMid, half * 50)
      await ctx.easeLookAt(p, (g - half) * 50)
    }
    const tagAt = ctx.tick
    await A.useOn(last)
    ctx.mark('jeb', { id: last.id, phase: phase(ctx.tick), lag: ctx.tick - tagAt })
    ctx.sound('entity.sheep.ambient', 1, 1.3)
    ctx.log('jeb at tick', ctx.tick, 'id', last.id, 'phase', phase(ctx.tick), 'waited', g, 'lag', ctx.tick - tagAt)
    // hold it big and centred while it cycles (no back-off: it shrank to frame right): a slow sway keeps the view alive
    const q = new ctx.Vec3(lx, floor + 1.0, z + 0.5)
    await ctx.easeLookAt(q, 250)
    const base = bot.entity.yaw
    for (let t = 0; t < 165; t++) {   // 8.25 s: past the x8 span (jeb:7.6)
      const e = bot.entity.position, d = q.minus(e.offset(0, 1.62, 0))
      const pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      bot.look(base + Math.sin(t / 40) * 0.05, pitch, true)
      await bot.waitForTicks(1)
    }
    ctx.log('jeb name', JSON.stringify(last.metadata && last.metadata[2]))
    return true
  }
}
