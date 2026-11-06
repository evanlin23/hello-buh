// "boat clutch 💀" (~33 s, seven beats): the bot jumps off a cobblestone pillar looking straight down
// the fall, places a boat on the grass right below a few ticks before the ground (real use_item with
// the boat), gets in it (real use_entity) and lands in the boat with full hearts (vanilla: getting
// into a vehicle resets the fall distance). From 15 blocks up to 79, seven drops. The camera looks
// down the fall the whole way, then up the pillar from the boat.
const PILLARS = [15, 20, 30, 40, 50, 64, 79].map((h, i) => ({ h, dx: i * 10 }))   // heights where a fall tick lands in the boat window (fall phases simulated)

module.exports = {
  name: 'boat_clutch',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'boat clutch 💀',
  edit: {
    caption: 'boat clutch 💀', red: 'boat', song: 'songs/misery.mp3', dropAt: 'mounted', startAt: 'start:0', endAfter: 'final:0.9',
    subs: PILLARS.map((p, i) => ['jump', `${p.h} blocks`, 1.4, i])
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    const top = floor + Math.max(...PILLARS.map(p => p.h))
    const X1 = x + PILLARS[PILLARS.length - 1].dx + 16
    for (let y0 = floor + 1; y0 <= top + 6; y0 += 9) await ctx.cmd(`/fill ${x - 16} ${y0} ${z - 22} ${X1} ${Math.min(y0 + 8, top + 6)} ${z + 12} air`)   // 93x35x9 < the 32768 cap
    await ctx.cmd(`/fill ${x - 16} ${floor - 3} ${z - 22} ${X1} ${floor - 1} ${z + 12} dirt`)
    await ctx.cmd(`/fill ${x - 16} ${floor} ${z - 22} ${X1} ${floor} ${z + 12} grass_block`)
    for (const p of PILLARS) await ctx.cmd(`/fill ${x + p.dx} ${floor + 1} ${z} ${x + p.dx} ${floor + p.h} ${z} cobblestone`)
    await ctx.cmd('/gamerule fall_damage true')
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6.5')   // vanilla 4.5: nudged so the boat can go down 2 ticks early
    await ctx.cmd('/attribute @s minecraft:entity_interaction_range base set 6.5')   // vanilla 3: nudged the same way
    await ctx.hotbar(['diamond_sword', ...PILLARS.map(() => 'oak_boat'), ['bread', 16]])   // boats don't stack: one per slot
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    // stand clear of every block before recording (spawning inside the fill hurt the bot: in_wall)
    await ctx.tpCheck(x + 0.5, floor + PILLARS[0].h + 1, z + 0.5, 180, 60)
    ctx.select(0)
    return { x, y: floor, z }
  },

  async clutch (ctx, i) {
    const { bot } = ctx
    const { x, z, floor } = this, P = PILLARS[i], px = x + P.dx
    if (i > 0) {   // quick tp: the cut lands straight on the glance down (tpCheck held still for 1 s)
      for (let t = 0; ; t++) {
        await ctx.cmd(`/tp @s ${px + 0.5} ${floor + P.h + 1} ${z + 0.5} 180 60`)
        if (Math.abs(bot.entity.position.y - (floor + P.h + 1)) < 0.1) break
        if (t > 20) throw new Error('teleport did not stick')
      }
    }
    ctx.select(0)
    ctx.mark(i === 0 ? 'start' : 'top', { n: i })
    // the drop first: straight down the pillar
    await ctx.easeLook(0.15, -1.3, 350)
    await ctx.easeLook(-0.1, -1.1, 300)
    ctx.select(1 + i)                      // this beat's boat
    await bot.waitForTicks(3)
    ctx.mark('jump', { n: i })
    bot.setControlState('forward', true); bot.setControlState('jump', true)
    await bot.waitForTicks(5)
    bot.setControlState('jump', false)
    await bot.waitForTicks(4)
    bot.setControlState('forward', false)
    ctx.easeLook(bot.entity.yaw, -Math.PI / 2 + 0.02, 400)
    let placed = false, mounted = false, landed = false, boat = null, k0 = 0
    const oldBoats = new Set(Object.values(bot.entities).filter(e => /boat/.test(e.name || '')).map(e => e.id))   // from earlier beats
    const findBoat = () => Object.values(bot.entities).find(e => /boat/.test(e.name || '') && !oldBoats.has(e.id) && e.position.distanceTo(bot.entity.position) < 40)
    // the boat's spawn packet: get in at once, before the next position packet reaches the server
    const onSpawn = (pk) => {
      if (!placed || mounted) return
      setImmediate(() => {
        const e = bot.entities[pk.entityId]
        if (!e || !/boat/.test(e.name || '') || oldBoats.has(e.id)) return
        mounted = true; boat = e
        const above = bot.entity.position.y - (floor + 1)
        ctx.mark('mounted', { n: i, above })
        ctx.log('mounting at height', above.toFixed(2), 'ms after placing', Date.now() - k0)
        bot._client.write('use_entity', { target: e.id, mouse: 0, hand: 0, sneaking: false }); bot.swingArm()
      })
    }
    bot._client.on('spawn_entity', onSpawn)
    const onTick = () => {
      const p = bot.entity.position, vy = bot.entity.velocity.y, above = p.y - (floor + 1)
      // place two ticks before the ground (the boat's spawn reaches us within a tick, then we get in
      // before the landing tick), with the ground in reach
      if (!placed && vy < -0.5 && above + vy > 0 && above + 2 * vy - 0.1 <= 0 && above + 1.62 <= 6.4) {
        placed = true; k0 = Date.now()
        bot.entity.pitch = -Math.PI / 2
        ctx.mark('placed', { n: i, above })
        ctx.log('boat placed at height', above.toFixed(2), 'vy', vy.toFixed(2))
        process.nextTick(() => { bot.activateItem(); bot.swingArm() })
        return
      }
      if (mounted && !landed && (bot.vehicle || bot.entity.onGround)) { landed = true; ctx.mark('landed', { n: i, vehicle: !!bot.vehicle }); if (i === PILLARS.length - 1) ctx.mark('final') }
    }
    bot.on('physicsTick', onTick)
    for (let k = 0; k < 300 && !landed && !ctx.died; k++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', onTick)
    bot._client.removeListener('spawn_entity', onSpawn)
    await bot.waitForTicks(4)
    ctx.log('health', bot.health, 'vehicle', !!bot.vehicle, 'pos', bot.entity.position)
    if (!mounted || ctx.died || bot.health < 20) return false
    // in the boat: turn round to the pillar and look up it, the way it came down
    const { Vec3 } = ctx
    await ctx.easeLookAt(new Vec3(px + 0.5, floor + 3, z + 0.5), 600)
    if (i === PILLARS.length - 1) ctx.mark('outro')
    await ctx.easeLookAt(new Vec3(px + 0.5, floor + P.h * 0.6, z + 0.5), i < PILLARS.length - 1 ? 700 : 1000)
    if (i === PILLARS.length - 1) await ctx.easeLookAt(new Vec3(px + 0.9, floor + P.h, z + 0.2), 900)
    if (bot.vehicle) { await ctx.cmd('/ride @s dismount'); await bot.waitForTicks(4) }
    ctx.log('after dismount: vehicle', !!bot.vehicle, 'pos', bot.entity.position)
    return true
  },

  async perform (ctx) {
    // mineflayer stops its physics loop (and physicsTick) while riding: keep ticking ourselves so the
    // recording and waitForTicks go on, and put the bot in the boat's seat (vanilla: the boat's
    // passenger point is height/3 = 0.1875 up, the player's vehicle point 0.6 above its feet)
    const { bot } = ctx
    let rideClock = null
    // mineflayer only clears bot.vehicle when the bot is in the new passenger list, so a dismount
    // (set_passengers for the boat without the bot) never cleared it
    bot._client.on('set_passengers', ({ entityId, passengers }) => {
      if (bot.vehicle && bot.vehicle.id === entityId && !passengers.includes(bot.entity.id)) { const v = bot.vehicle; bot.vehicle = null; bot.emit('dismount', v) }
    })
    const seat = () => { const v = bot.vehicle; if (v) { bot.entity.position = v.position.offset(0, 0.1875 - 0.6, 0); bot.entity.velocity.set(0, 0, 0) } }
    bot.on('mount', () => {
      seat()   // at once: a position update right after mounting put the camera 1.5 blocks up for a tick
      if (rideClock) return
      rideClock = setInterval(() => {
        const v = bot.vehicle
        if (!v) { clearInterval(rideClock); rideClock = null; return }
        bot.entity.position = v.position.offset(0, 0.1875 - 0.6, 0)
        bot.entity.velocity.set(0, 0, 0)
        bot.emit('physicsTick')
      }, 50)
    })
    for (let i = 0; i < PILLARS.length; i++) if (!(await this.clutch(ctx, i))) return false
    return !ctx.died && ctx.bot.health >= 20
  }
}
