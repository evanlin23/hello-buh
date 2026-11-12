// "bro thinks a boat will save him 💀" (was the label "boat clutch 💀": reaction captions, r:r0f3da0) (~33 s, seven beats): the bot jumps off a cobblestone pillar looking straight down
// the fall, places a boat on the grass right below a few ticks before the ground (real use_item with
// the boat), gets in it (real use_entity) and lands in the boat with full hearts (vanilla: getting
// into a vehicle resets the fall distance). From 15 blocks up to 79, seven drops. The camera looks
// down the fall the whole way, then up the pillar from the boat.
const { clearPlants, openSpots } = require('./_site')
// (No-op audit 2026-11-12, owner r:r4607fa: "7 identical top-down clutches": three drops now, each with a stake at the
// bottom: 20 onto grass, 50 into a cactus field, 79 onto a landing pad in a lava pool. The pad (the landing footprint,
// 3 wide) keeps the boat clear of the cacti and the lava.)
const PILLARS = [{ h: 20, stake: 'grass', sub: '20 blocks' }, { h: 50, stake: 'cactus', sub: '50 blocks... into cactus' }, { h: 79, stake: 'lava', sub: '79 blocks... into LAVA' }]   // heights where a fall tick lands in the boat window (fall phases simulated)

module.exports = {
  name: 'boat_clutch',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'bro thinks a boat will save him 💀',
  edit: {
    caption: 'bro thinks a boat will save him 💀', red: 'boat', song: null, dropAt: 'final_place', startAt: 'start:0', endAfter: 'seen2:0.6',   // r:r188b46 (was 0.9)
    // the label stays up through the fall
    subs: PILLARS.map((p, i) => ['jump', p.sub, 1.6, i]),
    // the teleport between pillars is cut out (no hold around it); the long falls' middles x2 (the view holds still, down)
    speed: [...PILLARS.slice(1).map((_, i) => [`cut${i + 1}a`, `cut${i + 1}b`, 'cut']), ['fall1:0.8', 'catch1:-0.6', 2], ['fall2:0.8', 'catch2:-1.0', 2]],
    hook: { at: 'final_place', before: 1.4, after: -0.05, text: '79 blocks 💀' },
    slowmo: [['final_place', 0.15, 0.3, 0.5]],   // real in-between frames (render_replay.py), no blending
    // no replay after the landing (2026-11-11, pace BLOCK: it ran the Short 4.1 s past the payoff; end ~1 s after it), and
    // the song drops out 0.35 s before the 79-block landing so it lands as a hit, and the landing is a clean impact with
    // a wooden thud (the boat). Owner r:r4df33c, 2026-11-11: "The sound effect at the end of boat clutch sounds like a fart,
    // change it out": that was audio.py's old water-clutch rebuild playing a water bucket's pour on the boat placement,
    // stretched by the slow-mo; a boat recording gets none now, and lib/hb/banned_sfx.json bans a pour with no bucket
    // r:r0f3da0 pace: the hook flash and the first fall were silent until 2.08 s (a fall makes no vanilla sound): a wind bed from frame 0
    punch: [['seen2', 0, 1.08]],   // the payoff is the look at the lava round the boat: a picture hit on it (pace)
    sfx: [['impact', 'seen2', { gain: 0.8 }], ['air', 'start', 'final', { gain: 0.5 }], ['dip', 'final', 0.35], ['impact', 'final'], ['file', 'final', 'sfx/kenney/impact-sounds/impactWood_heavy_000.ogg', 0.8]]
  },

  async setup (ctx) {
    const { bot } = ctx
    // no cleared box: each pillar stands on the natural ground, on an open patch of grass (nothing
    // overhead up to its top, the ground where the bot lands at the pillar's own level)
    const g = ctx.findLand(bot.entity.position.x | 0, bot.entity.position.z | 0)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    this.x = x; this.z = z
    await ctx.cmd(`/tp @s ${x + 35} 140 ${z}`); await bot.waitForTicks(20)   // over the middle of the row, chunks loaded
    try { await bot.waitForChunksToLoad() } catch (e) {}
    await ctx.defaultRules()
    await ctx.cmd('/kill @e[type=!player,distance=..150]')
    this.spots = await openSpots(ctx, x, z, PILLARS.map(P => P.h), { axis: 'x', gap: 13, foot: [-1, 1, -4, 1], level: [-1, 1, -4, 1] })
    for (const [i, P] of PILLARS.entries()) ctx.log('pillar', P.h, 'at', this.spots[i])
    for (const [i, P] of PILLARS.entries()) {
      const S = this.spots[i]
      await clearPlants(ctx, S.x - 2, S.floor, S.z - 5, S.x + 2, S.floor + 3, S.z + 2)   // the flowers and grass where it lands (plants only)
      await ctx.cmd(`/fill ${S.x} ${S.floor + 1} ${S.z} ${S.x} ${S.floor + P.h} ${S.z} cobblestone`)
      // the stake round the landing pad (the footprint: x-1..x+1, z-4..z+1, left as grass)
      const F = S.floor, X0 = S.x - 5, X1 = S.x + 5, Z0 = S.z - 8, Z1 = S.z + 4
      const pad = (dx, dz) => dx >= -1 && dx <= 1 && dz >= -4 && dz <= 1
      if (P.stake === 'lava') {
        await ctx.cmd(`/fill ${X0} ${F + 1} ${Z0} ${X1} ${F + 4} ${Z1} air replace #minecraft:replaceable`, { mayFail: true })
        await ctx.cmd(`/fill ${X0} ${F - 1} ${Z0} ${X1} ${F - 1} ${Z1} stone`)
        await ctx.cmd(`/fill ${X0} ${F} ${Z0} ${X1} ${F} ${Z1} lava`)
        await ctx.cmd(`/fill ${S.x - 1} ${F} ${S.z - 4} ${S.x + 1} ${F} ${S.z + 1} grass_block`)
      }
      if (P.stake === 'cactus') {
        await ctx.cmd(`/fill ${X0} ${F} ${Z0} ${X1} ${F} ${Z1} sand`)
        await ctx.cmd(`/fill ${S.x - 1} ${F} ${S.z - 4} ${S.x + 1} ${F} ${S.z + 1} grass_block`)
        for (let dx = -5; dx <= 5; dx++) for (let dz = -8; dz <= 4; dz++) {
          if ((dx + dz) % 2 || dx === 0 && dz === 0) continue
          if (dx >= -3 && dx <= 3 && dz >= -6 && dz <= 3) continue   // two clear of the pad: the boat never touches one
          const ht = 2 + ((dx * 7 + dz * 3) & 1)
          await ctx.cmd(`/fill ${S.x + dx} ${F + 1} ${S.z + dz} ${S.x + dx} ${F + ht} ${S.z + dz} cactus`, { mayFail: true })
        }
      }
    }
    const S0 = this.spots[0], SL = this.spots[this.spots.length - 1]
    const n = this.spots.length
    this.mid = { x: Math.round(this.spots.reduce((a, S) => a + S.x, 0) / n), y: S0.floor, z: Math.round(this.spots.reduce((a, S) => a + S.z, 0) / n) }
    await ctx.cmd('/gamerule fall_damage true')
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6.5')   // vanilla 4.5: nudged so the boat can go down 2 ticks early
    await ctx.cmd('/attribute @s minecraft:entity_interaction_range base set 6.5')   // vanilla 3: nudged the same way
    await ctx.hotbar(['diamond_sword', ...PILLARS.map(() => 'oak_boat'), ['bread', 16]])   // boats don't stack: one per slot
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    // stand clear of every block before recording (spawning inside the fill hurt the bot: in_wall)
    await ctx.tpCheck(S0.x + 0.5, S0.floor + PILLARS[0].h + 1, S0.z + 0.5, 180, 60)
    ctx.select(0)
    return this.mid   // the row's middle: the harness records the world around it
  },

  async clutch (ctx, i) {
    const { bot } = ctx
    const P = PILLARS[i], S = this.spots[i], px = S.x, z = S.z, floor = S.floor
    ctx.select(1 + i)                      // this beat's boat, in hand from the top (switched inside the cut)
    if (i > 0) {   // quick tp, cut out in the edit (cut<i>a, set after the last look-up, .. cut<i>b)
      for (let t = 0; ; t++) {
        await ctx.cmd(`/tp @s ${px + 0.5} ${floor + P.h + 1} ${z + 0.5} 180 60`)
        if (Math.abs(bot.entity.position.y - (floor + P.h + 1)) < 0.1) break
        if (t > 20) throw new Error('teleport did not stick')
      }
      await bot.waitForTicks(2)   // the HUD catches up (a stale slot showed for a frame or two after the cut)
      ctx.mark(`cut${i}b`)
    }
    ctx.mark(i === 0 ? 'start' : 'top', { n: i })
    // the drop first: straight down the pillar
    await ctx.easeLook(0.15, -1.3, 350)
    await ctx.easeLook(-0.1, -1.1, 300)
    await bot.waitForTicks(3)
    ctx.mark('jump', { n: i }); ctx.mark(`fall${i}`)
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
        ctx.mark('placed', { n: i, above }); ctx.mark(`catch${i}`); if (i === PILLARS.length - 1) ctx.mark('final_place')
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
    if (!mounted || ctx.died) return false
    // in the boat: tilt up at once to the seat's view (the bow and the paddles, not the floor), then
    // turn round to the pillar and look up it
    const { Vec3 } = ctx
    await ctx.easeLook(bot.entity.yaw, -0.6, 150)
    await ctx.easeLookAt(new Vec3(px + 0.5, floor + 3, z + 0.5), 500)
    ctx.log('health', bot.health, 'vehicle', !!bot.vehicle, 'pos', bot.entity.position)
    if (ctx.died || bot.health < 20) return false
    if (P.stake === 'grass') await ctx.easeLookAt(new Vec3(px + 0.5, floor + P.h * 0.6, z + 0.5), 700)   // up the pillar it came down
    else {
      // round at the stake it just missed, close (the cacti / the lava a block past the pad)
      const b = bot.entity.position
      await ctx.easeLookAt(new Vec3(b.x + 3.5, floor + 0.6, b.z - 1.5), 1300)   // (800 ms peaked at 295 deg/s)
      ctx.mark(`seen${i}`)
      await ctx.easeLookAt(new Vec3(b.x - 3.5, floor + 0.6, b.z - 2), 1400)
    }
    if (i < PILLARS.length - 1) ctx.mark(`cut${i + 1}a`)   // from here to the next pillar's top is cut out
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
