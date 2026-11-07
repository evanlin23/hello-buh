// "dyeing sheep until it's a rainbow 🌈" (~30 s): a fenced line of 8 white sheep (NoAI). The bot
// strafes along the line using a dye on each (real use_entity packets with the dye held; vanilla dyes
// the sheep), red to purple, and backs up to show the rainbow. Then a "jeb_" name tag on the 8th
// (vanilla turns it into a colour-cycling sheep)... "what if they were ALL jeb_": it tags the other
// seven, backs up to the whole line cycling, then shears them all for a shower of rainbow wool that
// fills the hotbar. (Merges the old rainbow_wool and rainbow_sheep into one Short.)
const COLORS = [
  { dye: 'red_dye', id: 14, sub: 'red' },
  { dye: 'orange_dye', id: 1, sub: 'orange' },
  { dye: 'yellow_dye', id: 4, sub: 'yellow' },
  { dye: 'lime_dye', id: 5, sub: 'green' },
  { dye: 'light_blue_dye', id: 3, sub: 'light blue' },
  { dye: 'blue_dye', id: 11, sub: 'blue' },
  { dye: 'purple_dye', id: 10, sub: 'purple' }
]
const N = COLORS.length + 1          // the last one gets the name tag
const STEP = 2                       // blocks between sheep

module.exports = {
  name: 'rainbow_sheep',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: "dyeing sheep until it's a rainbow 🌈",
  edit: {
    subsY: 0.15, caption: "dyeing sheep until it's a rainbow 🌈", red: 'rainbow', dropAt: 'lastshear',
    startAt: 'dye:-0.45',
    endAfter: 'collected:0.6',
    subs: [...COLORS.map((c, i) => ['dye', c.sub, 0.9, i]), ['jeb', 'and jeb_', 1.6, 0],
      ['alljeb', 'what if they were ALL jeb_', 1.8, 0], ['shear', 'free rainbow wool', 1.6, 0]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (const [z0, z1] of [[z - 22, z - 2], [z - 1, z + 20]]) {
      await ctx.cmd(`/fill ${x - 24} ${floor + 1} ${z0} ${x + 24} ${floor + 14} ${z1} air`)
      await ctx.cmd(`/fill ${x - 24} ${floor} ${z0} ${x + 24} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 24} ${floor - 3} ${z0} ${x + 24} ${floor - 1} ${z1} dirt`)
    }
    await ctx.cmd('/kill @e[type=sheep]')
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

  async use (ctx, sheep) {
    const { bot } = ctx
    bot._client.write('use_entity', { target: sheep.id, mouse: 0, sneaking: false, hand: 0, location: new ctx.Vec3(0, 0, 0) })
    bot.swingArm()
  },

  async perform (ctx) {
    const { bot } = ctx
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
      await this.use(ctx, s)
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
    bot.setControlState('back', true); bot.setControlState('left', true)
    let rev = false
    for (let t = 0; t < 20; t++) {                      // a short back-up: the rainbow stays big in frame
      await bot.waitForTicks(1)
      if (t === 8) { ctx.mark('reveal'); ctx.sound('entity.player.levelup', 0.5, 1.2); rev = true }
      const e = bot.entity.position, d = mid.minus(e.offset(0, 1.62, 0))
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      bot.look(bot.entity.yaw + dy * 0.25, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.25, true)
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
      if (t > 10) { const e = bot.entity.position, d = p.minus(e.offset(0, 1.62, 0)); bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true) }
    }
    bot.setControlState('forward', false)
    await look
    await ctx.easeLookAt(p, 200)
    await this.use(ctx, last)
    ctx.mark('jeb')
    ctx.sound('entity.sheep.ambient', 1, 1.3)
    await bot.waitForTicks(6)
    ctx.log('jeb name', JSON.stringify(last.metadata && last.metadata[2]))
    // step back so the colour-cycling sheep and the rainbow share the frame
    bot.setControlState('back', true)
    for (let t = 0; t < 26; t++) {
      await bot.waitForTicks(1)
      const e = bot.entity.position, q = new ctx.Vec3(lx - 3, floor + 1.2, z + 0.5), d = q.minus(e.offset(0, 1.62, 0))
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      bot.look(bot.entity.yaw + dy * 0.2, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.2, true)
    }
    bot.setControlState('back', false)

    // "what if they were ALL jeb_": tag the other seven, walking back down the line
    ctx.mark('alljeb')
    await bot.waitForTicks(2)
    ctx.select(7)
    for (let i = N - 2; i >= 0; i--) {
      await this.moveTo(ctx, i, z + 3.0)
      await this.use(ctx, this.sheepAt(ctx, i))
      ctx.sound('entity.sheep.ambient', 0.5, 1.0 + i * 0.05)
      await bot.waitForTicks(3)
    }
    // the whole line cycling
    await this.backReveal(ctx, 'alljeb_reveal', 30)   // the cycling flock is the money shot (22 ran the Short 29.9 s)
    // shear them all: a rainbow of wool pops out and gets picked up on the way
    ctx.select(8)
    bot.on('playerCollect', (c) => { if (c === bot.entity) ctx.sound('entity.item.pickup', 0.25, 0.8 + Math.random() * 0.6) })
    ctx.mark('shear')
    for (let i = 0; i < N; i++) {                       // quick, so the wool is in the air together
      await this.moveTo(ctx, i, z + 2.2)
      await this.use(ctx, this.sheepAt(ctx, i))
      ctx.sound('entity.sheep.shear', 1, 1)
      await bot.waitForTicks(2)
    }
    ctx.mark('lastshear')
    // sweep back along the line right in front of the sheep, eyes on the row ahead (not a sheep's face),
    // collecting the wool: the hotbar fills with the rainbow
    const row = new ctx.Vec3(this.x0 - 2, this.floor + 0.6, z + 0.6)
    // facing west along the line: forward moves along it, right (north) / left (south) hold the distance
    bot.setControlState('forward', true)
    for (let k = 0; k < 80 && bot.entity.position.x > this.x0 + 0.5; k++) {
      const e = bot.entity.position, d = row.minus(e.offset(0, 1.62, 0))
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      bot.look(bot.entity.yaw + dy * 0.25, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.25, true)
      bot.setControlState('right', e.z > z + 1.4); bot.setControlState('left', e.z < z + 1.1)
      await bot.waitForTicks(1)
    }
    for (const c of ['left', 'right', 'forward']) bot.setControlState(c, false)
    ctx.mark('collected')
    await bot.waitForTicks(16)
    ctx.log('hotbar', JSON.stringify(bot.inventory.items().map(i => [i.name, i.count])))
    return true
  },

  // strafe along the line to stand in front of sheep i at row distance zt, eyes on it
  async moveTo (ctx, i, zt) {
    const { bot } = ctx
    const tx = this.x0 + i * STEP + 0.5, target = new ctx.Vec3(tx, this.floor + 1.5, this.z + 0.5)
    for (let k = 0; k < 60 && (Math.abs(bot.entity.position.x - tx) > 0.6 || Math.abs(bot.entity.position.z - zt) > 0.3); k++) {
      const e = bot.entity.position, d = target.minus(e.offset(0, 1.62, 0))
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      await bot.look(bot.entity.yaw + dy * 0.4, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.4, true)
      // roughly facing north: right = +x, forward = -z
      bot.setControlState('right', e.x < tx - 0.3); bot.setControlState('left', e.x > tx + 0.3)
      bot.setControlState('forward', e.z > zt + 0.15); bot.setControlState('back', e.z < zt - 0.15)
      await bot.waitForTicks(1)
    }
    for (const c of ['right', 'left', 'forward', 'back']) bot.setControlState(c, false)
    await ctx.easeLookAt(target, 120)
  },

  // back up and take in the whole line
  async backReveal (ctx, mark, ticks) {
    const { bot } = ctx
    const mid = new ctx.Vec3(this.x0 + (N - 1) * STEP / 2 + 0.5, this.floor + 1, this.z + 0.5)
    bot.setControlState('back', true)
    for (let t = 0; t < ticks; t++) {
      if (t === 6) ctx.mark(mark)
      const e = bot.entity.position, d = mid.minus(e.offset(0, 1.62, 0))
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      await bot.look(bot.entity.yaw + dy * 0.25, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.25, true)
      bot.setControlState('left', e.x > mid.x + 0.5); bot.setControlState('right', e.x < mid.x - 0.5)
      await bot.waitForTicks(1)
    }
    for (const c of ['right', 'left', 'back']) bot.setControlState(c, false)
  }
}
