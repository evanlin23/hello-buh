// Movie engine test reel (docs/movie_engine.md): the cold open of BUILD LIMIT, draft 3.1
// (docs/blind_audit/round3/arc_draft31.md). Night, Floor 40 of a tower that reaches build limit. ASH (the recording bot,
// so his fall is a real first-person POV) walks across the top deck to the HIGHKEEPER (an extra bot, lib/movie.js), who
// has the census ledger: "How many in your family?" "Four." (he writes) "Which floor?" "Forty." On a stand by the Plank
// hang two buckets, one full and one empty. He takes down the EMPTY one and holds it out. Ash looks at it, then at him.
// "You fall once." Ash takes it: he knows (owner, 2026-11-09: "why would you jump if you were given an empty bucket?").
// He shouts the law to the city like a joke and steps off. POV: the first toll; the Mark (one gold block on the
// Needle's stone cap) grows from a dot; the second toll rolls down the tower bell by bell and catches him; the Mark
// glides aside and he drops into the black of the shaft under it. He never reaches for the bucket.
//
// Set (origin O = X, 100, Z over deep ocean): a 9x9 trunk from y 100 to 299 (stone bricks below the clouds at y 192,
// quartz above), a rim every 5 blocks = 40 floors, lanterns on the Drop Face corners, a plank on every floor, the top
// deck at y 300 (= Floor 40) with its 5-block plank, and the Needle at x+10..x+14: a 5x5 stone column with a 7x7 cap at
// y 149, the Mark (gold) raised in its centre over the drop shaft. The world is frozen (/tick freeze: players still
// move). The slide is one /clone ... move, glided by render.js (slide_blocks). The fog sea (y 60-140) hides the ocean.
// v3 (the Well, the pocketed bucket) is kept as work/movie_reel_v3.stunt.js and work/movie_reel_v3.rec.json.
const M = require('../lib/movie')
const { steer, ticksToFall } = require('../lib/air_steer')

const TOP = 300                 // the deck (Floor 40) is y 300; the trunk's top block is 299
const FLOOR = 5                 // blocks per floor
const WX = 12                   // the Mark's x offset (the centre of the cap and the drop shaft)
const MARK_Y = 50               // the Mark's y offset: y 150 on the cap (y 149), nine blocks above the fog sea's top (140)
const CAP = 3                   // the cap's half-width: 7x7

module.exports = {
  name: 'movie_reel',
  biome: 'minecraft:deep_ocean',
  time: 18000,                  // midnight: the moon and stars, lanterns on the tower
  renderDistance: 14, recordRadius: 200,
  noChunkRefresh: false,
  botTimeout: 600,
  // (night 0.55: at the default 0.34 the moonlit sea read as flat grey and the white-out as a grey-out, review v2 V8)
  fogSea: { y0: 60, y1: 140, layers: 16, density: 0.985, fade: 5, night: 0.55 },
  // the cinematic look (renderer/page.js makePost): moonlit grade, lantern bloom, bars and focus on camera shots
  // (handLift: the empty bucket in his hand read as a dark sleeve at midnight, review v2 B2)
  look: { grade: 'night', bloom: 0.6, bloomThreshold: 0.68, vignette: 0.45, grain: 0.03, letterbox: 2.39, dof: { aperture: 0.9 }, handLift: 0.45, cloudNight: 0.42 },   // (threshold 0.55 made the white deck glow)
  cast: { self: 'noor', Highkeeper: 'efe' },   // (kai's ribbon read as a face on the back of his head, review v2 V10)
  selfName: 'Ash',               // his lines (M.line who) move his head when he's seen from outside
  idleLife: true,
  // the camera director (render.js): offsets are from the set origin O (y 100), so the deck is dy 200. The line
  // of action runs west-east between them; every camera stays on its south side (v2's ots_hk crossed it)
  shots: {
    // a crane down onto the deck: high and wide (the tower, the clouds, the fog sea), ending on the two of them
    wide: { dof: false, path: [[0, -30, 232, 34], [2.2, -16, 214, 19], [4.4, -6, 205, 9]], lookPath: [[0, 3, 192, 0], [2.2, 3, 199, 0], [4.4, 3.5, 201.3, 0.8]] },
    two: { at: [4.4, 203.3, 6.4], look: [4.4, 201.5, 1.0], fov: 55 },   // (just above the gold rim at dz 6, looking down past it: v1 sat 10 back and the rim filled the foot)
    ots_ash: { at: { of: 'self', offset: [-2.0, 0.2, 1.2] }, look: 'actor:Highkeeper', fov: 50 },
    ots_hk: { at: { of: 'actor:Highkeeper', offset: [1.6, 0.2, 2.6] }, look: 'self', fov: 50 },   // (his shoulder at the frame's edge: at [2, 0.2, 1.6] his head hid Ash)
    walkout: { follow: 'self', offset: [-3.0, 0.9, -1.6], look: { of: 'self', offset: [2, -0.4, 0] }, lag: 3, fov: 65 },   // (north: he has turned away, his walk is the new line; the south side ran into the Highkeeper's head)
    // high over the plank's end from the east: Ash lit at the top of the frame, a lantern and a plank on every
    // floor below him down to the clouds (v2's low angle was a silhouette on the stars, no height: review V6)
    edge: { dof: false, at: [16.5, 206.5, 3.5], look: [11, 199, 0.5], fov: 60, push: 0.35 },
    // the stand: low between them, on the two buckets (the full one stays; he takes down the empty one)
    stand: { at: [4.5, 202.7, 1.6], look: [5.9, 202.4, -1.9], fov: 42 },
    // the fall from outside (owner, 2026-11-09: "i dont understand the falling"): riding above and beside him, looking
    // down past him at the Mark, so a person, the tower face and the target are in one frame
    chase: { follow: 'self', offset: [3.2, 4.2, 3.4], look: [WX + 0.5, MARK_Y + 1, 0.5], fov: 62, dof: false },
    pov: { pov: true }
  },
  edit: {
    // draft 3.1: "Cut to black before he lands" - he drops into the shaft under the Mark, and the reel ends in its dark
    startAt: 'start:0.3', endAfter: 'hole:0.35',   // (0.3: already walking, the owner's no-pause rule)
    sfx: [['air', 'start', 'fall', { gain: 0.14 }], ['wind', 'fall', 'hole', { gain: 0.4 }], ['whoosh', 'slide', { gain: 0.35 }]]
  },

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const p = bot.entity.position.floored()
    const X = p.x, Z = p.z, Y = 100
    Object.assign(this, { X, Z, Y })
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/difficulty peaceful')
    await ctx.cmd('/tick freeze')   // nothing ticks (frames, lanterns), players still move
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
    // the Needle: a 5x5 column with the drop shaft down its centre, the 7x7 cap, the Mark raised over the shaft's mouth,
    // lanterns on the cap's corners (the gold has to read from Forty at midnight), Fen's hut in one corner
    const NX = X + WX, CY = Y + MARK_Y - 1
    await ctx.cmd(`/fill ${NX - 2} 90 ${Z - 2} ${NX + 2} ${CY - 1} ${Z + 2} stone_bricks`)
    await ctx.cmd(`/fill ${NX - CAP} ${CY} ${Z - CAP} ${NX + CAP} ${CY} ${Z + CAP} polished_andesite`)
    await ctx.cmd(`/fill ${NX} 90 ${Z} ${NX} ${CY} ${Z} air`)                        // the drop shaft, open at the cap
    await ctx.cmd(`/setblock ${NX} ${CY + 1} ${Z} gold_block`)                         // the Mark, over the hole
    for (const [dx, dz] of [[-CAP, -CAP], [-CAP, CAP], [CAP, -CAP], [CAP, CAP]]) await ctx.cmd(`/setblock ${NX + dx} ${CY + 1} ${Z + dz} lantern`)
    await ctx.cmd(`/fill ${NX + 1} ${CY + 1} ${Z - CAP + 1} ${NX + 2} ${CY + 2} ${Z - CAP + 1} spruce_planks`)   // Fen's hut (a low shed)
    await ctx.cmd(`/fill ${NX + 1} ${CY + 3} ${Z - CAP + 1} ${NX + 2} ${CY + 3} ${Z - CAP + 1} spruce_slab`)
    // the stand by the Plank: two item frames on a quartz post north of the Highkeeper, facing the cameras (south):
    // a water bucket and an empty one. He takes the empty one down; the full one stays.
    await ctx.cmd(`/fill ${X + 5} ${TOP + 1} ${Z - 2} ${X + 6} ${TOP + 2} ${Z - 2} quartz_pillar`)
    await ctx.cmd(`/summon item_frame ${X + 5} ${TOP + 2} ${Z - 1} {Facing:3b,Fixed:1b,Tags:["bk_full"],Item:{id:"minecraft:water_bucket",count:1}}`)
    await ctx.cmd(`/summon item_frame ${X + 6} ${TOP + 2} ${Z - 1} {Facing:3b,Fixed:1b,Tags:["bk_empty"],Item:{id:"minecraft:bucket",count:1}}`)
    // the cast
    const cast = await M.spawnActors(ctx, ['Highkeeper'])
    this.cast = cast
    await M.place(ctx, 'Highkeeper', X + 5.5, TOP + 1, Z + 1.5, 90, 0)   // by the plank, facing west (yaw 90)
    // the census ledger in his hand (owner, 2026-11-09: "i dont understand the How many in your family? line": he writes
    // the answer down, so it reads as a head count)
    await M.give(ctx, 'Highkeeper', 'writable_book')
    // Ash starts on the west side of the deck, facing east
    await ctx.tpCheck(X - 3.5, TOP + 1, Z + 0.5, -90, 0)
    await ctx.hotbar([])
    return { x: X, y: Y, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, Y } = this
    const hk = this.cast.Highkeeper
    M.shot(ctx, 'wide')   // first, so no first-person frames lead the reel
    await ctx.cmd('/gamemode survival')
    const hkEye = () => hk.entity.position.offset(0, 1.62, 0)
    const ashEye = () => bot.entity.position.offset(0, 1.62, 0)
    const walkTo = async (x, maxTicks = 120) => {
      bot.setControlState('forward', true)
      for (let k = 0; k < maxTicks && bot.entity.position.x < x; k++) await bot.waitForTicks(1)
      bot.setControlState('forward', false)
    }
    // 1. the wide shot: Ash walks across the deck (walking on the first frame); the Highkeeper watches him come
    await bot.look(-Math.PI / 2, 0, true)
    let unwatch = M.track(hk, ashEye)
    M.shotIn(ctx, 'two', 34)                // the cut lands while he's still walking up to him
    await walkTo(X + 3.2)
    unwatch()
    // 2. the two-shot: the first line lands as he stops (v2 waited half a second: dead frames, review V1)
    M.line(ctx, 'Highkeeper', 'How many in your family?')
    M.swing(hk)
    await ctx.easeLookAt(hkEye(), 350)
    await M.lookAt(hk, ashEye(), 250)
    await bot.waitForTicks(28)
    // 3. on Ash
    M.shot(ctx, 'ots_hk')
    M.line(ctx, 'Ash', 'Four.')
    await bot.waitForTicks(12)
    // 3b. he writes it in the ledger: a head count (he glances down at the book, a stroke of the pen, back up)
    await M.lookAt(hk, hk.entity.position.offset(0.6 * Math.sign(bot.entity.position.x - hk.entity.position.x), 1.0, 0), 250)
    M.swing(hk)
    await bot.waitForTicks(6)
    await M.lookAt(hk, ashEye(), 250)
    await bot.waitForTicks(4)
    // 4. on the Highkeeper: he looks away, then back a moment too long. The rule, said plainly
    M.shot(ctx, 'ots_ash')
    await M.lookAway(hk, 25, 450)
    await M.lookAt(hk, ashEye(), 350)
    M.line(ctx, 'Highkeeper', 'Which floor?')
    await bot.waitForTicks(24)
    // 5. on Ash
    M.shot(ctx, 'ots_hk')
    M.line(ctx, 'Ash', 'Forty.')
    await bot.waitForTicks(20)
    // 6. the stand: he turns from Ash to the two buckets, puts the ledger away and takes down the EMPTY one
    const standAt = hk.entity.position.offset(X + 6.5 - hk.entity.position.x, TOP + 2.5 - hk.entity.position.y, Z - 1.9 - hk.entity.position.z)   // (a Vec3: M.lookAt subtracts)
    M.shot(ctx, 'stand')
    await M.lookAt(hk, standAt, 300)
    M.swing(hk)
    await ctx.cmd('/data remove entity @e[type=item_frame,tag=bk_empty,limit=1] Item')
    await M.give(ctx, 'Highkeeper', 'bucket')
    await bot.waitForTicks(12)
    // 7. he holds it out. Ash looks at it, then at him (over the Highkeeper's shoulder onto Ash's face). The Highkeeper
    // doesn't look away
    M.shot(ctx, 'ots_hk')
    await M.lookAt(hk, ashEye(), 300)
    M.swing(hk)
    const handAt = () => { const h = hk.entity.position; return h.offset((bot.entity.position.x - h.x) * 0.35, 1.15, (bot.entity.position.z - h.z) * 0.35) }
    await ctx.easeLookAt(handAt(), 450)      // down at the bucket
    await bot.waitForTicks(22)
    await ctx.easeLookAt(hkEye(), 400)       // up at him
    await bot.waitForTicks(14)
    // 8. the two-shot: the rule, and he takes it (into his hand: a plain bucket in every shot from here on)
    M.shot(ctx, 'two')
    M.line(ctx, 'Highkeeper', 'You fall once.')
    await bot.waitForTicks(26)
    await M.empty(ctx, 'Highkeeper')
    bot.swingArm('right')
    await ctx.hotbar(['bucket'])
    ctx.select(0)
    await bot.waitForTicks(10)
    // 9. he turns to the city and shouts the law like a joke as he walks out; the Highkeeper watches him go
    M.line(ctx, 'Ash', 'The floor I jump from is the floor I live on!')
    unwatch = M.track(hk, ashEye)
    await ctx.easeLook(-Math.PI / 2, 0.1, 350)
    M.shotIn(ctx, 'walkout', 12)
    await walkTo(X + 6.6, 80)                     // across the deck at a walk
    bot.setControlState('sneak', true)            // sneaking on the plank keeps him on it
    await walkTo(X + 9.6, 80)
    // 10. the edge, cut while he's still walking: the tower and a plank on every floor below him
    M.shot(ctx, 'edge')
    await walkTo(X + 11.45, 80)
    bot.setControlState('sneak', false)
    await ctx.easeLook(-Math.PI / 2, -0.9, 400)   // he looks down: the Mark, 150 blocks below
    await bot.waitForTicks(6)
    // 11. he steps off. POV, then from outside (the chase), then POV again for the last of it
    const tx = X + WX + 0.5, tz = Z + 0.5, floorY = Y + MARK_Y + 1, capY = Y + MARK_Y - 1, startY = bot.entity.position.y
    bot.setControlState('forward', true)
    let k0 = 0, slid = false, back = false, hole = false, fogged = false, povOn = false, chased = false, povAgain = false, released = false
    let bells = 0
    const BELL_AT = [27, 24, 21, 18, 15, 12, 9, 6]   // ticks to the Mark: the second toll rolling down the tower, catching up
    const onTick = () => {
      k0++
      const e = bot.entity
      if (e.position.y > startY - 0.3) { if (k0 > 30) bot.setControlState('forward', false); return }   // hold forward until he drops
      if (!released) { released = true; bot.setControlState('forward', false) }   // off the edge: the steering takes the keys
      if (!povOn && e.position.y < startY - 2.5) { povOn = true; M.shot(ctx, 'pov'); ctx.mark('fall'); ctx.sound('block.bell.use', 3, 0.6) }   // the first toll
      if (povOn && !chased && e.position.y < startY - 40) { chased = true; M.shot(ctx, 'chase'); ctx.mark('chase') }
      if (chased && !povAgain && e.position.y < startY - 105) { povAgain = true; M.shot(ctx, 'pov'); ctx.mark('pov2') }
      if (e.position.y > floorY - 1) {   // steer onto the Mark (movement keys only), eyes down
        const c = steer({ yaw: -Math.PI / 2, px: e.position.x, pz: e.position.z, vx: e.velocity.x, vz: e.velocity.z, y: e.position.y, vy: e.velocity.y, tx, tz, floorY, startY, bias: 0 })
        for (const key of ['forward', 'back', 'left', 'right']) bot.setControlState(key, c[key])
      } else bot.clearControlStates()
      const left = ticksToFall(e.position.y, e.velocity.y, floorY)
      while (bells < BELL_AT.length && left <= BELL_AT[bells]) {   // each bell a little closer, louder and lower
        ctx.sound('block.bell.use', 1.2 + 0.25 * bells, 0.78 - 0.025 * bells); if (bells === 0) ctx.mark('toll2'); bells++
      }
      // the Mark glides aside 6 ticks out (about 18 blocks: big enough to see), and he drops into the hole under it
      if (!slid && left <= 6) {
        slid = true; ctx.mark('slide')
        M.slideBlocks(ctx, [X + WX, Y + MARK_Y, Z, X + WX, Y + MARK_Y, Z], [0, 0, 1], [[X + WX, Y + MARK_Y, Z, 'gold_block']], 4)
      }
      if (!hole && e.position.y < capY) { hole = true; ctx.mark('hole') }
      if (hole && !back && e.position.y < capY - 12) { back = true; M.slideBlocks(ctx, [X + WX, Y + MARK_Y, Z + 1, X + WX, Y + MARK_Y, Z + 1], [0, 0, -1], [[X + WX, Y + MARK_Y, Z + 1, 'gold_block']], 4) }
      if (!fogged && e.position.y < 140) { fogged = true; ctx.mark('fog') }
    }
    bot.on('physicsTick', onTick)
    await bot.look(-Math.PI / 2, -Math.PI / 2 + 0.002, true)
    for (let k = 0; k < 400 && bot.entity.position.y > 96; k++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', onTick); bot.clearControlStates()
    unwatch()
    const p = bot.entity.position
    ctx.log(`passed the Mark at ${(p.x - tx).toFixed(2)}, ${(p.z - tz).toFixed(2)}; slid ${slid}, hole ${hole}, back ${back}, bells ${bells}`)
    M.quitActors(ctx)
    return slid && hole
  }
}
