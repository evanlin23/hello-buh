// Movie engine test reel (docs/movie_engine.md): the cold open of BUILD LIMIT (the movie doc, scenes 2-3).
// Night, Floor 40 of a tower that reaches build limit. ASH (the recording bot, so his fall is a real
// first-person POV) walks across the top deck to the HIGHKEEPER (an extra bot, lib/movie.js), who asks
// "How many in your family?" and hands him a bucket. Ash walks out to the end of the plank and steps off.
// POV: the tower and the clouds rush past, the bell rings, the Well (one block of water on the Needle) is
// a blue dot, the bell rings again and the Well slides one block, Ash swings an EMPTY bucket, clips past
// the Needle and drops into the fog sea. White.
//
// What it proves: two actors in one scene, the camera director (wide push-in, two-shot, over-the-
// shoulders, a follow, a low angle, POV), the fog sea, real physics for the fall, dialogue marks.
//
// Set (origin O = X, 100, Z over deep ocean): a 9x9 trunk from y 100 to 299 (stone bricks below the
// clouds at y 192, quartz above), a rim every 5 blocks = 40 floors, lanterns on the Drop Face corners, a
// plank on every floor, the top deck at y 300 (= Floor 40) with its 5-block plank, and the Needle at
// x+11/x+12: a 1-wide shaft with a cap beside its top holding the Well. The world is frozen (/tick freeze:
// players still move) so the single block of water never spreads; the slide is one /clone ... move.
// The fog sea (render.js stunt.fogSea, y 60-140) hides the ocean.
const M = require('../lib/movie')
const { steer, ticksToFall } = require('../lib/air_steer')

const TOP = 300                 // the deck (Floor 40) is y 300; the trunk's top block is 299
const FLOOR = 5                 // blocks per floor
const WX = 12                   // the Well's x offset (the cap); the shaft is at WX - 1
const WELL_Y = 50               // the Well's y offset: y 150, ten blocks above the fog sea's top (140)

module.exports = {
  name: 'movie_reel',
  biome: 'minecraft:deep_ocean',
  time: 18000,                  // midnight: the moon and stars, lanterns on the tower
  renderDistance: 14, recordRadius: 200,
  noChunkRefresh: false,
  botTimeout: 600,
  fogSea: { y0: 60, y1: 140, layers: 16, density: 0.985, fade: 5 },
  // the cinematic look (renderer/page.js makePost): moonlit grade, lantern bloom, bars and focus on camera shots
  look: { grade: 'night', bloom: 0.6, bloomThreshold: 0.68, vignette: 0.45, grain: 0.03, letterbox: 2.39, dof: { aperture: 0.9 } },   // (threshold 0.55 made the white deck glow)
  cast: { self: 'kai', Highkeeper: 'efe' },
  selfName: 'Ash',               // his lines (M.line who) move his head when he's seen from outside
  idleLife: true,
  // the camera director (render.js): offsets are from the set origin O (y 100), so the deck is dy 200
  shots: {
    // a crane down onto the deck: high and wide (the tower, the clouds, the fog sea), ending on the two of them
    wide: { dof: false, path: [[0, -30, 232, 34], [2.2, -16, 214, 19], [4.4, -6, 205, 9]], lookPath: [[0, 3, 192, 0], [2.2, 3, 199, 0], [4.4, 3.5, 201.3, 0.8]] },
    two: { at: [4.4, 203.3, 6.4], look: [4.4, 201.5, 1.0], fov: 55 },   // (just above the gold rim at dz 6, looking down past it: v1 sat 10 back and the rim filled the foot)
    ots_ash: { at: { of: 'self', offset: [-2.0, 0.2, 1.0] }, look: 'actor:Highkeeper', fov: 55 },
    ots_hk: { at: { of: 'actor:Highkeeper', offset: [2.0, 0.2, -1.0] }, look: 'self', fov: 55 },
    walkout: { follow: 'self', offset: [-3.0, 0.9, -1.6], look: { of: 'self', offset: [2, -0.4, 0] }, lag: 3, fov: 65 },   // (north side: v1's south offset went through the Highkeeper's head)
    low: { dof: false, at: [WX - 1, 197.5, 4], look: { of: 'self', offset: [0, -0.6, 0] }, fov: 60 },
    pov: { pov: true }
  },
  edit: {
    startAt: 'start:0.3', endAfter: 'fog:0.7',   // (0.3: already walking, the owner's no-pause rule)
    sfx: [['wind', 'fall', 'fog', { gain: 0.5 }], ['whoosh', 'fog', { gain: 0.4 }]]
  },

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const p = bot.entity.position.floored()
    const X = p.x, Z = p.z, Y = 100
    Object.assign(this, { X, Z, Y })
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/difficulty peaceful')
    await ctx.cmd('/tick freeze')   // fluids don't spread (the Well), players still move
    // the trunk and the floors
    await ctx.cmd(`/fill ${X - 4} ${Y} ${Z - 4} ${X + 4} 191 ${Z + 4} stone_bricks`)
    await ctx.cmd(`/fill ${X - 4} 192 ${Z - 4} ${X + 4} ${TOP - 1} ${Z + 4} quartz_bricks`)
    for (let y = Y; y < TOP; y += FLOOR) {
      const mat = y < 192 ? 'polished_andesite' : 'smooth_quartz'
      await ctx.cmd(`/fill ${X - 5} ${y} ${Z - 5} ${X + 5} ${y} ${Z + 5} ${mat}`)
      await ctx.cmd(`/fill ${X + 6} ${y} ${Z} ${X + 8} ${y} ${Z} oak_planks`)          // the Drop Face plank
      await ctx.cmd(`/setblock ${X + 5} ${y + 1} ${Z - 5} lantern`)
      await ctx.cmd(`/setblock ${X + 5} ${y + 1} ${Z + 5} lantern`)
    }
    // Floor 40: the deck, a gold rim open where the plank starts, lanterns, the bell post
    await ctx.cmd(`/fill ${X - 6} ${TOP} ${Z - 6} ${X + 6} ${TOP} ${Z + 6} smooth_quartz`)
    await ctx.cmd(`/fill ${X - 6} ${TOP + 1} ${Z - 6} ${X + 6} ${TOP + 1} ${Z + 6} gold_block outline`)
    await ctx.cmd(`/fill ${X - 5} ${TOP + 1} ${Z - 5} ${X + 5} ${TOP + 1} ${Z + 5} air`)
    await ctx.cmd(`/setblock ${X + 6} ${TOP + 1} ${Z} air`)
    for (const [dx, dz] of [[-6, -6], [-6, 6], [6, -6], [6, 6]]) await ctx.cmd(`/setblock ${X + dx} ${TOP + 2} ${Z + dz} lantern`)
    await ctx.cmd(`/fill ${X} ${TOP + 1} ${Z - 3} ${X} ${TOP + 3} ${Z - 3} gold_block`)   // (off Ash's path along z + 0.5)
    await ctx.cmd(`/setblock ${X} ${TOP + 4} ${Z - 3} lantern`)
    await ctx.cmd(`/fill ${X + 7} ${TOP} ${Z} ${X + 11} ${TOP} ${Z} oak_planks`)        // the plank, 5 long
    // the Needle: the shaft, the cap beside its top, the Well on the cap
    await ctx.cmd(`/fill ${X + WX - 1} 90 ${Z} ${X + WX - 1} ${Y + WELL_Y - 1} ${Z} stone_bricks`)
    await ctx.cmd(`/setblock ${X + WX} ${Y + WELL_Y - 1} ${Z} stone_bricks`)
    await ctx.cmd(`/setblock ${X + WX} ${Y + WELL_Y} ${Z} water`)
    // the cast
    const cast = await M.spawnActors(ctx, ['Highkeeper'])
    this.cast = cast
    await M.place(ctx, 'Highkeeper', X + 5.5, TOP + 1, Z + 1.5, 90, 0)   // by the plank, facing west (yaw 90)
    await M.give(ctx, 'Highkeeper', 'bucket')
    // Ash starts on the west side of the deck, facing east
    await ctx.tpCheck(X - 3.5, TOP + 1, Z + 0.5, -90, 0)
    await ctx.hotbar([])
    return { x: X, y: Y, z: Z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z } = this
    const hk = this.cast.Highkeeper
    M.shot(ctx, 'wide')   // first, so no first-person frames lead the reel
    await ctx.cmd('/gamemode survival')
    const hkEye = () => hk.entity.position.offset(0, 1.62, 0)
    const ashEye = () => bot.entity.position.offset(0, 1.62, 0)
    // 1. the wide shot: Ash walks across the deck toward the Highkeeper
    await M.lookAt(hk, ashEye(), 400)
    const walkTo = async (x, maxTicks = 120) => {
      bot.setControlState('forward', true)
      for (let k = 0; k < maxTicks && bot.entity.position.x < x; k++) await bot.waitForTicks(1)
      bot.setControlState('forward', false)
    }
    await bot.look(-Math.PI / 2, 0, true)   // east, and walking at once: no still opening (v1 stood 1.5 s)
    M.shotIn(ctx, 'two', 34)                // the cut lands while he's still walking up to him
    await walkTo(X + 3.2)
    // 2. the two-shot: they face each other
    await ctx.easeLookAt(hkEye(), 350)
    await M.lookAt(hk, ashEye(), 300)
    await bot.waitForTicks(10)
    M.line(ctx, 'Highkeeper', 'How many in your family?')
    M.swing(hk)
    await bot.waitForTicks(36)
    // 3. over Ash's shoulder on the Highkeeper... then the reverse
    M.shot(ctx, 'ots_hk')
    M.line(ctx, 'Ash', 'Four.')
    await bot.waitForTicks(30)
    M.shot(ctx, 'ots_ash')
    await M.lookAway(hk, 25, 600)   // he looks away, then back at Ash a moment too long
    await M.lookAt(hk, ashEye(), 500)
    M.swing(hk)                  // the hand-over
    await M.empty(ctx, 'Highkeeper')
    await ctx.hotbar(['bucket'])
    ctx.select(0)
    M.line(ctx, 'Highkeeper', 'You fall once.')
    await bot.waitForTicks(34)
    M.shot(ctx, 'two')
    M.line(ctx, 'Ash', 'The floor I jump from is the floor I live on.')
    await bot.waitForTicks(30)
    await M.nod(hk)
    // 4. he turns and walks out to the end of the plank, sneaking (it keeps him on it)
    await ctx.easeLook(-Math.PI / 2, 0.1, 400)
    M.shotIn(ctx, 'walkout', 6)
    await walkTo(X + 6.6, 80)                     // across the deck at a walk
    bot.setControlState('sneak', true)            // sneaking on the plank keeps him on it
    await walkTo(X + 11.45, 120)
    bot.setControlState('sneak', false)
    await ctx.easeLook(-Math.PI / 2, -0.9, 600)   // he looks down: the Well, 150 blocks below
    await bot.waitForTicks(12)
    // 5. low angle from under the plank: he steps off
    M.shot(ctx, 'low')
    await bot.waitForTicks(14)
    const tx = X + WX + 0.5, tz = Z + 0.5, floorY = 100 + WELL_Y + 1, startY = bot.entity.position.y
    bot.setControlState('forward', true)
    let k0 = 0, slid = false, swung = false, fogged = false, povOn = false, released = false
    const onTick = () => {
      k0++
      const e = bot.entity
      if (e.position.y > startY - 0.3) { if (k0 > 30) bot.setControlState('forward', false); return }   // hold forward until he drops (3 ticks left him balanced on the edge)
      if (!released) { released = true; bot.setControlState('forward', false) }   // off the edge: the steering takes the keys
      if (!povOn && e.position.y < startY - 2.5) { povOn = true; M.shot(ctx, 'pov'); ctx.mark('fall'); ctx.sound('block.bell.use', 3, 0.6) }
      if (e.position.y > floorY - 1) {   // steer onto the Well (movement keys only), eyes down
        const c = steer({ yaw: -Math.PI / 2, px: e.position.x, pz: e.position.z, vx: e.velocity.x, vz: e.velocity.z, y: e.position.y, vy: e.velocity.y, tx, tz, floorY, startY, bias: 0 })
        for (const key of ['forward', 'back', 'left', 'right']) bot.setControlState(key, c[key])
      } else bot.clearControlStates()
      // the second ring and the slide, about 8 ticks out (the Well moves as he watches)
      if (!slid && ticksToFall(e.position.y, e.velocity.y, floorY) <= 9) {
        slid = true
        ctx.sound('block.bell.use', 3, 0.6); ctx.mark('slide')
        bot.chat(`/clone ${X + WX} ${100 + WELL_Y - 1} ${Z} ${X + WX} ${100 + WELL_Y} ${Z} ${X + WX - 1} ${100 + WELL_Y - 1} ${Z} replace move`)
      }
      if (slid && !swung && ticksToFall(e.position.y, e.velocity.y, floorY) <= 4) { swung = true; bot.activateItem(); bot.swingArm('right'); ctx.mark('swing') }
      if (!fogged && e.position.y < 140) { fogged = true; ctx.mark('fog') }
    }
    bot.on('physicsTick', onTick)
    await bot.look(-Math.PI / 2, -Math.PI / 2 + 0.002, true)
    for (let k = 0; k < 400 && bot.entity.position.y > 96; k++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', onTick); bot.clearControlStates()
    const p = bot.entity.position
    ctx.log(`passed the Well at ${(p.x - tx).toFixed(2)}, ${(p.z - tz).toFixed(2)} from its first spot; slid ${slid}, fog ${fogged}`)
    M.quitActors(ctx)
    return slid && fogged
  }
}
