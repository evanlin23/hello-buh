// "POV: your job is filling end portals" (~20 s): the bot stands on a raised stone-brick walk beside
// a row of empty end portal rings and fills them like a shift worker: eyes of ender go into the 12
// frames of the first ring one by one (real block_place with the eye, vanilla fill sound), the
// portal opens (the server builds the end_portal blocks), then the second ring faster, then it
// walks on to the third and speedruns it. It ends looking down the row: more empty rings. The job
// never ends.
const RINGS = [0, 7, 14, 21, 28]   // ring origins along x (each ring is 5x5 with a 3x3 portal inside)
const FILL = [{ ms: 300, wait: 3 }, { ms: 170, wait: 1 }, { ms: 90, wait: 0 }]   // each shift faster

module.exports = {
  name: 'end_portal_job',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: your job is filling end portals',
  edit: {
    caption: 'POV: your job is filling end portals', red: 'job', song: 'songs/payphone.mp3', dropAt: 'portal', startAt: 'start:0', endAfter: 'outro:1.2',
    subs: [['ring', 'getting faster', 1.6, 1], ['ring', 'speedrun', 1.6, 2], ['outro', 'it never ends', 1.6, 0]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 12} ${floor + 1} ${z - 10} ${x + 40} ${floor + 12} ${z + 16} air`)
    await ctx.cmd(`/fill ${x - 12} ${floor - 3} ${z - 10} ${x + 40} ${floor - 1} ${z + 16} dirt`)
    await ctx.cmd(`/fill ${x - 12} ${floor} ${z - 10} ${x + 40} ${floor} ${z + 16} grass_block`)
    // empty rings, every frame facing the middle (vanilla needs that for the portal to form)
    for (const rx of RINGS) {
      const X = x + rx, y = floor + 1
      for (let i = 1; i <= 3; i++) {
        await ctx.cmd(`/setblock ${X + i} ${y} ${z} end_portal_frame[facing=south,eye=false]`)
        await ctx.cmd(`/setblock ${X + i} ${y} ${z + 4} end_portal_frame[facing=north,eye=false]`)
        await ctx.cmd(`/setblock ${X} ${y} ${z + i} end_portal_frame[facing=east,eye=false]`)
        await ctx.cmd(`/setblock ${X + 4} ${y} ${z + i} end_portal_frame[facing=west,eye=false]`)
      }
    }
    // the bot's post between the first two rings, a little south of them
    this.post = { x: x + 5, y: floor + 2, z: z + 6 }
    // a raised stone-brick walk along the row, 3 wide: the bot works the first two rings from x+5 and
    // walks to x+16 for the third
    await ctx.cmd(`/fill ${x + 3} ${floor + 1} ${this.post.z - 1} ${x + 19} ${this.post.y} ${this.post.z + 1} stone_bricks`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 10')
    await ctx.hotbar([['ender_eye', 64], 'iron_pickaxe', ['bread', 7]])
    await ctx.cmd('/gamemode survival')
    await ctx.tpCheck(this.post.x + 0.5, this.post.y + 1, this.post.z + 0.5, 135, 40)
    ctx.select(0)
    return { x, y: floor, z }
  },

  // ring frames in fill order: clockwise from the north-west corner
  frames (rx) {
    const X = this.x + rx, z = this.z, y = this.floor + 1, out = []
    for (let i = 1; i <= 3; i++) out.push([X + i, y, z])
    for (let i = 1; i <= 3; i++) out.push([X + 4, y, z + i])
    for (let i = 3; i >= 1; i--) out.push([X + i, y, z + 4])
    for (let i = 3; i >= 1; i--) out.push([X, y, z + i])
    return out
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    let portalAt = null
    const onBlock = (o, n) => {
      if (n && n.name === 'end_portal' && portalAt === null) { portalAt = ctx.tick; ctx.mark('portal'); ctx.sound('block.end_portal.spawn', 1) }
    }
    bot.on('blockUpdate', onBlock)
    ctx.mark('start')
    // walk along the path to x (keys picked for the wanted move whatever the look: eyes on lookAt)
    const walkTo = async (tx, lookAt) => {
      for (let k = 0; k < 120 && Math.abs(bot.entity.position.x - tx) > 0.25; k++) {
        const e = bot.entity, eye = e.position.offset(0, 1.62, 0), d = lookAt.minus(eye)
        const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        let dy = yaw - e.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        await bot.look(e.yaw + dy * 0.2, e.pitch + (pitch - e.pitch) * 0.2, true)
        const moveYaw = Math.atan2(-(tx - e.position.x), -(this.post.z + 0.5 - e.position.z) * 2)
        let rel = moveYaw - e.yaw; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI
        const oct = Math.round(rel / (Math.PI / 4))
        bot.setControlState('forward', [-1, 0, 1].includes(oct)); bot.setControlState('back', [3, 4, -4, -3].includes(oct))
        bot.setControlState('left', [1, 2, 3].includes(oct)); bot.setControlState('right', [-1, -2, -3].includes(oct))
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
    }
    for (let r = 0; r < FILL.length; r++) {
      const fr = this.frames(RINGS[r]), { ms, wait } = FILL[r]
      if (r === 2) { ctx.mark('walk'); await walkTo(this.x + 16.5, new Vec3(this.x + RINGS[2] + 1.5, this.floor + 1, this.z + 1)) }
      ctx.mark('ring', { n: r })
      portalAt = null
      for (const [fx, fy, fz] of fr) {
        await ctx.easeLookAt(new Vec3(fx + 0.5, fy + 0.8, fz + 0.5), ms)
        ctx.sound('block.end_portal_frame.fill')
        bot._client.write('block_place', { hand: 0, location: { x: fx, y: fy, z: fz }, direction: 1, cursorX: 0.5, cursorY: 0.8125, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        bot.swingArm()
        if (wait) await bot.waitForTicks(wait)
      }
      // the portal opens: look into it
      const c = new Vec3(this.x + RINGS[r] + 2.5, this.floor + 1.75, this.z + 2.5)
      await ctx.easeLookAt(c, 400)
      for (let k = 0; k < 20 && portalAt === null; k++) await bot.waitForTicks(1)
      ctx.log('ring', r, 'portal', portalAt !== null)
      if (portalAt === null) return false
      await ctx.easeLookAt(c.offset(0.6, 0, -0.4), r === 2 ? 500 : 700)
    }
    // the rest of the row: more empty rings waiting
    ctx.mark('outro')
    await ctx.easeLookAt(new Vec3(this.x + RINGS[4] + 2.5, this.floor + 1, this.z + 2.5), 1000)
    await ctx.easeLookAt(new Vec3(this.x + RINGS[3] + 2.5, this.floor + 1, this.z + 2.5), 900)
    bot.removeListener('blockUpdate', onBlock)
    return !ctx.died
  }
}
