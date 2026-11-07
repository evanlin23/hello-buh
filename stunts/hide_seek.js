// "hide and seek but the villagers cheated 😭" (~33 s, worker 16): first person from the seeker, in a
// plains village built from vanilla's own village templates (/place template). It opens on a villager
// running off to hide behind a tree. Five rounds, each on a countdown: the seeker checks doors, the
// well, the hay, behind trees... nothing. Then something on screen gives the hider away, and every
// spot is more impossible than the last:
//   1. inside a 2x2 dark oak trunk (the leaves shake): two chops, face to face
//   2. down a 1x1 shaft under the pond (bubbles): he rises out of the water
//   3. right under the spot where the seeker started (crumbs knocked up from below): dig, a face looking up
//   4. in the lava pool (it pops and smokes): he rises out of it, on fire
//   5. on a 1x1 pillar up to build limit, right beside the start (an emerald falls from the sky): the
//      camera follows the pillar up, and a third-person zoom-out at y 320 shows him up there
// Hiders are NoAI, Invulnerable, NoGravity villagers; the sets are built with commands before the
// recording (the pillar is built in the cut before round 5, so it never shows earlier). Between
// rounds the bot teleports (a cut) and the set-up time is cut from the video (speed 'cut').
const ROUNDS = 5
const R = [1, 2, 3, 4, 5]

module.exports = {
  name: 'hide_seek',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'hide and seek but the villagers cheated 😭',
  renderDistance: 17, recordRadius: 280,   // the build-limit pillar: its top is ~250 blocks up (fog is max(xz, |y|))
  chunkStops: set => [{ x: set.x + 150, z: set.z }, { x: set.x - 150, z: set.z }, { x: set.x, z: set.z + 150 }, { x: set.x, z: set.z - 150 }],
  clouds: false,   // Video Settings > Clouds: OFF (vanilla): at y 192 they'd hide the top of the pillar
  botTimeout: 480,
  time: 1500,      // morning: at noon the sun sat right at the top of the pillar shot
  // sharp zooms (narrower FOV) on each giveaway
  fovZoom: [['r1_zoom', 'r1_chop:-0.3', 1.6], ['r2_zoom', 'r2_found:0.6', 1.7], ['r3_zoom', 'r3_found:0.7', 1.8],
    ['r4_zoom', 'r4_found:0.7', 1.7], ['r5_zoom', 'r5_found:0.3', 4]],
  edit: {
    caption: 'hide and seek but the villagers cheated 😭', red: 'cheated',
    song: 'songs/funk_abnormal.mp3', dropAt: 'r5_found',
    startAt: 'r1_go:0', endAfter: 'r5_found:0.25',
    // the zoom-out: a fixed camera up at y 320 beside him, appended after the look up the pillar
    replay: { at: 'r5_found', before: 0.05, after: 0.85, cam: '1.5,322.3,10.5,45,-16', speed: 1, label: 'MEANWHILE AT Y 320' },
    speed: [1, 2, 3, 4].map(n => [`cut${n}a`, `cut${n}b`, 'cut']),
    clock: R.map((n, i) => [`r${n}_go`, `r${n}_end`, [5, 4, 4, 4, 3][i], `ROUND ${n}`, 'down']),
    counter: { at: R.map(n => `r${n}_found`), total: ROUNDS },
    cards: [['r1_found', 'IN A TREE 😭', 0.9, 'yellow'], ['r2_found', 'IN THE POND 😭', 0.9, 'blue'],
      ['r3_found', 'UNDER ME 😭', 0.9, 'orange'], ['r4_found', 'IN LAVA 🔥', 0.9, 'gold']],
    punch: R.map(n => `r${n}_found`),
    subs: [['r1_end', 'where did he go', 0.9], ['r2_end', 'nothing again', 0.9], ['r3_end', 'I give up', 0.9],
      ['r4_end', 'not again', 0.9], ['r5_end', 'seriously?', 0.9]],
    subsY: 0.62
  },

  // ---------------------------------------------------------------- set
  // A flat site: hills sliced by the clearing fill showed as cut cliffs behind the village. Try spots
  // around the plains location and take the first whose surface stays within a few blocks of its middle.
  async findFlat (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    let best = null
    for (const [ox, oz] of [[0, 0], [160, 0], [-160, 0], [0, 160], [0, -160], [160, 160], [-160, -160], [160, -160], [-160, 160], [320, 0], [-320, 0], [0, 320], [0, -320]]) {
      const cx = sp.x + ox, cz = sp.z + oz
      await ctx.cmd(`/tp @s ${cx} 200 ${cz}`)
      await bot.waitForTicks(40)
      try { await bot.waitForChunksToLoad() } catch (e) {}
      const g = ctx.findLand(cx, cz)
      if (!g) continue
      let worst = 0, wet = 0, n = 0
      for (let dx = -96; dx <= 96; dx += 12) {
        for (let dz = -96; dz <= 96; dz += 12) {
          const b = ctx.surface(g.x + dx, g.z + dz)
          if (!b) continue
          n++
          if (/water|ice|lava/.test(b.name)) wet++
          worst = Math.max(worst, b.position.y - g.y)
        }
      }
      const score = worst + wet * 2
      ctx.log('site', g.x, g.y, g.z, 'hill', worst, 'wet', wet, 'of', n)
      if (!best || score < best.score) best = { g, score }
      if (worst <= 5 && wet <= 2) break
    }
    if (!best) throw new Error('no dry land')
    ctx.log('flat site', best.g, 'score', best.score)
    return best.g
  },

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const g = await this.findFlat(ctx)
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/gamerule random_tick_speed 0')
    await ctx.cmd('/gamerule fire_spread_radius_around_player 0')
    await ctx.cmd('/difficulty peaceful')
    await ctx.cmd(`/tp @s ${X} ${F + 40} ${Z}`); await bot.waitForTicks(20)
    const heavy = async (c) => { bot.chat(c); await ctx.sleep(450) }
    await heavy(`/forceload add ${X - 72} ${Z - 72} ${X + 72} ${Z + 72}`)
    for (let z0 = Z - 72; z0 <= Z + 72; z0 += 6) {
      const z1 = Math.min(z0 + 5, Z + 72)
      await heavy(`/fill ${X - 72} ${F + 1} ${z0} ${X + 72} ${F + 6} ${z1} air`)
      await heavy(`/fill ${X - 72} ${F + 7} ${z0} ${X + 72} ${F + 30} ${z1} air`)
      await heavy(`/fill ${X - 72} ${F} ${z0} ${X + 72} ${F} ${z1} grass_block`)
      await heavy(`/fill ${X - 72} ${F - 4} ${z0} ${X + 72} ${F - 1} ${z1} dirt`)
      await heavy(`/fillbiome ${X - 72} ${F - 4} ${z0} ${X + 72} ${F + 12} ${z1} minecraft:plains`)
    }
    await ctx.sleep(2000)
    const P = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    // streets
    await ctx.cmd(`/fill ${P(-1, 0, -26)} ${P(1, 0, 26)} dirt_path`)
    await ctx.cmd(`/fill ${P(-10, 0, -1)} ${P(26, 0, 1)} dirt_path`)
    // vanilla village pieces. rot: none | 180. jig: the jigsaw blocks' final states (template coords)
    const tpl = async (piece, dx, dz, rot, jig) => {
      await ctx.cmd(`/place template minecraft:village/plains/${piece} ${P(dx, 0, dz)} ${rot}`)
      for (const [lx, ly, lz, b] of jig) {
        const [wx, wz] = rot === '180' ? [dx - lx, dz - lz] : [dx + lx, dz + lz]
        await ctx.cmd(`/setblock ${P(wx, ly, wz)} ${b}`)
      }
    }
    const house = [[0, 0, 3, 'dirt_path'], [3, 0, 3, 'oak_planks']]
    await tpl('town_centers/plains_fountain_01', -4, -4, 'none', [[0, 0, 6, 'dirt_path'], [1, 0, 2, 'dirt_path'], [2, 0, 1, 'dirt_path'], [2, 0, 7, 'dirt_path'], [7, 0, 2, 'dirt_path'], [7, 0, 7, 'dirt_path'], [0, 1, 4, 'air'], [4, 1, 0, 'air'], [4, 1, 8, 'air'], [8, 1, 4, 'air']])
    await tpl('houses/plains_small_house_1', -3, -8, '180', house)    // H1: x -9..-3, z -14..-8, door (-4, -11)
    await tpl('houses/plains_small_house_2', 3, -14, 'none', house)   // H2: x 3..9, z -14..-8, door (4, -11)
    await tpl('houses/plains_small_house_3', -3, 14, '180', house)    // H3: x -9..-3, z 8..14, door (-4, 11)
    await tpl('houses/plains_small_house_4', 3, 8, 'none', house)     // H4: x 3..9, z 8..14, door (4, 11)
    await tpl('houses/plains_meeting_point_5', -21, -5, 'none', [[2, 0, 6, 'dirt_path'], [7, 0, 2, 'dirt'], [8, 0, 8, 'dirt'], [0, 1, 5, 'air']])   // the bell stall, x -21..-12
    await tpl('houses/plains_small_farm_1', 13, -13, 'none', [[0, 0, 4, 'oak_log']])   // x 13..19, z -13..-5
    // oak trees: trunk + a rounded leaf blob (persistent, or they decay)
    const tree = async (dx, dz, h) => {
      await ctx.cmd(`/fill ${P(dx - 2, h - 2, dz - 2)} ${P(dx + 2, h - 1, dz + 2)} oak_leaves[persistent=true]`)
      await ctx.cmd(`/fill ${P(dx - 1, h, dz - 1)} ${P(dx + 1, h + 1, dz + 1)} oak_leaves[persistent=true]`)
      for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) await ctx.cmd(`/setblock ${P(dx + a, h - 1, dz + b)} air`)
      for (const [a, b] of [[-1, -1], [1, 1]]) await ctx.cmd(`/setblock ${P(dx + a, h + 1, dz + b)} air`)
      await ctx.cmd(`/fill ${P(dx, 1, dz)} ${P(dx, h - 1, dz)} oak_log`)
    }
    // T1, the hider's tree (round 1): a 2x2 dark oak, trunk (6..7, -5..-4), so the villager fits inside;
    // a rounded canopy (corners and edges trimmed)
    await ctx.cmd(`/fill ${P(3, 5, -8)} ${P(10, 6, -1)} dark_oak_leaves[persistent=true]`)
    await ctx.cmd(`/fill ${P(4, 7, -7)} ${P(9, 7, -2)} dark_oak_leaves[persistent=true]`)
    await ctx.cmd(`/fill ${P(5, 8, -6)} ${P(8, 8, -3)} dark_oak_leaves[persistent=true]`)
    for (const [a, b] of [[3, -8], [10, -8], [3, -1], [10, -1], [4, -8], [3, -7], [9, -1], [10, -2]]) await ctx.cmd(`/fill ${P(a, 5, b)} ${P(a, 6, b)} air`)
    for (const [a, b] of [[4, -7], [9, -7], [4, -2], [9, -2]]) await ctx.cmd(`/setblock ${P(a, 7, b)} air`)
    await ctx.cmd(`/fill ${P(6, 1, -5)} ${P(7, 6, -4)} dark_oak_log`)
    await tree(-15, 8, 6)       // round 3's look-behind
    await tree(13, 16, 5)
    await tree(-13, -18, 5)     // round 4's look-up
    // hay (round 2's look-behind)
    await ctx.cmd(`/fill ${P(9, 1, 4)} ${P(10, 1, 5)} hay_block`)
    await ctx.cmd(`/setblock ${P(9, 2, 4)} hay_block`)
    // the pond (round 2): 2 deep, uneven edges, a 1x1 shaft 3 deeper in the middle
    await ctx.cmd(`/fill ${P(11, -3, 5)} ${P(21, -1, 13)} dirt`)
    await ctx.cmd(`/fill ${P(12, -2, 6)} ${P(20, -2, 12)} sand`)
    await ctx.cmd(`/fill ${P(16, -5, 9)} ${P(16, -3, 9)} air`)
    await ctx.cmd(`/fill ${P(15, -6, 8)} ${P(17, -6, 10)} stone`)
    await ctx.cmd(`/fill ${P(12, -1, 6)} ${P(20, 0, 12)} water`)
    await ctx.cmd(`/fill ${P(13, 0, 5)} ${P(17, 0, 5)} water`)
    await ctx.cmd(`/fill ${P(14, 0, 13)} ${P(19, 0, 13)} water`)
    await ctx.cmd(`/fill ${P(21, 0, 8)} ${P(21, 0, 10)} water`)
    await ctx.cmd(`/fill ${P(16, -5, 9)} ${P(16, -3, 9)} water`)
    for (const [a, b] of [[12, 6], [20, 6], [12, 12], [20, 12], [19, 6], [12, 11]]) await ctx.cmd(`/setblock ${P(a, 0, b)} grass_block`)
    // the lava pool (round 4): x -21..-16, z -15..-11, 2 deep, 3 in the middle
    await ctx.cmd(`/fill ${P(-22, -4, -16)} ${P(-15, -1, -10)} stone`)
    await ctx.cmd(`/fill ${P(-21, -2, -15)} ${P(-16, 0, -11)} lava`)
    await ctx.cmd(`/fill ${P(-19, -3, -14)} ${P(-18, -3, -12)} lava`)
    for (const [a, b] of [[-21, -15], [-16, -15], [-21, -11], [-16, -11]]) await ctx.cmd(`/setblock ${P(a, 0, b)} grass_block`)
    await ctx.cmd(`/fill ${P(-20, 0, -16)} ${P(-17, 0, -16)} lava`)
    // round 3's hole under the start spot (covered by the path block)
    await ctx.cmd(`/fill ${P(-9, -2, -1)} ${P(-9, -1, -1)} air`)
    // the hiders
    await ctx.cmd('/kill @e[type=villager]')
    const hider = (tag, x, y, z, yaw, pitch, prof) => ctx.cmd(`/summon villager ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} {NoAI:1b,NoGravity:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b,Rotation:[${yaw}f,${pitch}f],Tags:["${tag}"],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1}`)
    // 0: the runner in the opening, who hides behind the tree
    await hider('h0', 3.5, 1, -5.2, -55, 0, 'farmer')
    // 1: in the middle of the 2x2 trunk, facing north, its head in the trunk's F+2 row
    await hider('h1', 7.0, 0.55, -4.0, 180, 0, 'farmer')
    // 2: at the bottom of the shaft (he rises on the reveal), facing west, toward the seeker
    await hider('h2', 16.5, -5, 9.5, 90, 0, 'fisherman')
    // 3: in the hole under the start spot, looking up
    await hider('h3', -8.5, -2.05, -0.5, 180, -85, 'nitwit')
    // 4: under the lava (he rises on the reveal), facing east, toward the seeker
    await hider('h4', -18.5, -3, -12.5, -90, 0, 'armorer')
    this.hider = hider
    await ctx.hotbar(['diamond_axe', 'diamond_shovel', ['bread', 12], ['torch', 16]])
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
    // the start: facing the tree, the runner in front
    await ctx.tpCheck(X + 0.5, F + 1, Z - 6.5, -69, 0)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x: X, y: 0, z: Z }   // y 0: edit.replay's fixed camera is relative to this, so its height is absolute (y 322)
  },

  // ---------------------------------------------------------------- the rounds
  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F } = this
    const W = (dx, dy, dz) => new Vec3(X + dx, F + dy, Z + dz)
    const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
    const MOVES = ['forward', 'back', 'left', 'right', 'sprint', 'jump']
    // Go to (dx, dz). Without `face` the camera turns toward where it goes (eased); with face: [x, y, z]
    // it stays on that point and the bot walks there sideways or backwards as needed (strafing).
    const go = async (dx, dz, { sprint = true, pitch = -0.08, stop = 0.45, maxTicks = 120, face = null } = {}) => {
      const tx = X + dx, tz = Z + dz
      let i = 0
      for (; i < maxTicks; i++) {
        const p = bot.entity.position, mx = tx - p.x, mz = tz - p.z, d = Math.hypot(mx, mz)
        if (d < stop) break
        const cur = bot.entity.yaw
        if (face) {
          const fx = X + face[0] - p.x, fy = F + face[1] - (p.y + 1.62), fz = Z + face[2] - p.z
          const want = Math.atan2(-fx, -fz), wantP = Math.atan2(fy, Math.hypot(fx, fz))
          await bot.look(cur + wrap(want - cur) * 0.35, bot.entity.pitch + (wantP - bot.entity.pitch) * 0.35, true)
          const y = bot.entity.yaw, fwd = (-Math.sin(y) * mx - Math.cos(y) * mz) / d, rgt = (Math.cos(y) * mx - Math.sin(y) * mz) / d
          bot.setControlState('forward', fwd > 0.35); bot.setControlState('back', fwd < -0.35)
          bot.setControlState('right', rgt > 0.35); bot.setControlState('left', rgt < -0.35)
        } else {
          const want = Math.atan2(-mx, -mz)
          await bot.look(cur + Math.max(-0.32, Math.min(0.32, wrap(want - cur) * 0.45)), bot.entity.pitch + (pitch - bot.entity.pitch) * 0.25, true)
          bot.setControlState('forward', true); bot.setControlState('sprint', sprint && d > 1.4)
        }
        bot.setControlState('jump', !!bot.entity.isCollidedHorizontally)
        await bot.waitForTicks(1)
      }
      for (const c of MOVES) bot.setControlState(c, false)
      if (i >= maxTicks) ctx.log('go: did not reach', dx, dz, 'at', (bot.entity.position.x - X).toFixed(2), (bot.entity.position.z - Z).toFixed(2))
    }
    const look = (dx, dy, dz, ms) => ctx.easeLookAt(W(dx, dy, dz), ms)
    const openDoor = async (dx, dz) => {
      await look(dx + 0.5, 1.5, dz + 0.5, 200)
      const loc = { x: X + dx, y: F + 1, z: Z + dz }
      bot._client.write('block_place', { hand: 0, location: loc, direction: 4, cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.wooden_door.open', 1, 0.95 + Math.random() * 0.1)
    }
    const dig = async (dx, dy, dz, ticks, block, sound) => {
      const loc = { x: X + dx, y: F + dy, z: Z + dz }
      bot._client.write('block_dig', { status: 0, location: loc, face: 1, sequence: 0 })
      for (let i = 0; i < ticks; i++) { if (i % 4 === 0) { bot.swingArm(); ctx.sound(`block.${sound}.hit`, 0.5) } await bot.waitForTicks(1) }
      bot._client.write('block_dig', { status: 2, location: loc, face: 1, sequence: 0 })
      bot.swingArm()
      ctx.sound(`block.${sound}.break`, 1); ctx.particles('block', new Vec3(loc.x, loc.y, loc.z), { block })
    }
    const hmm = (pitch = 1) => ctx.sound('entity.villager.ambient', 1, pitch)
    const found = (n) => { ctx.mark(`r${n}_found`); ctx.sound('entity.villager.yes', 1, 1); ctx.sound('entity.player.levelup', 0.5, 1.4) }
    // a drift after each find, so the shot never freezes while the card is up
    const drift = async (ticks, amt = 0.1) => { const y0 = bot.entity.yaw, p0 = bot.entity.pitch; for (let i = 1; i <= ticks; i++) { await bot.look(y0 + amt * Math.sin(i / ticks * Math.PI), p0 + amt * 0.5 * (i / ticks), true); await bot.waitForTicks(1) } }
    // run something every tick while the bot does other things (giveaway particles, a hider rising)
    const everyTick = (n, fn) => (async () => { for (let i = 0; i < n; i++) { fn(i); await bot.waitForTicks(1) } })()
    // a hider rising by teleports (NoGravity): `dy` blocks over `n` ticks
    const rise = (tag, dy, n) => everyTick(n, () => bot.chat(`/execute as @e[tag=${tag},limit=1] at @s run tp @s ~ ~${(dy / n).toFixed(3)} ~`))
    const tp = async (dx, dz, yaw, pitch) => { await ctx.tpCheck(X + dx, F + 1, Z + dz, yaw, pitch) }

    // ---- the opening: a villager runs off and hides behind the tree
    // (a few ticks of tiny moves first: a mob that hasn't moved reaches the client late)
    for (let i = 0; i < 6; i++) { bot.chat(`/execute as @e[tag=h0,limit=1] at @s run tp @s ~0.01 ~ ~0.005`); await bot.waitForTicks(1) }
    ctx.mark('r1_go')
    const path = [[3.5, -5.2], [5.6, -2.3], [9.4, -2.7]]
    const runner = everyTick(26, (i) => {
      const u = Math.min(1, i / 24) * 2, k = Math.min(1, Math.floor(u)), f = u - k   // two legs, 12 ticks each
      const x = path[k][0] + (path[k + 1][0] - path[k][0]) * f, z = path[k][1] + (path[k + 1][1] - path[k][1]) * f
      bot.chat(`/tp @e[tag=h0,limit=1] ${(X + x).toFixed(3)} ${F + 1} ${(Z + z).toFixed(3)}`)
    })
    for (let i = 0; i < 16; i++) { await bot.look(bot.entity.yaw + 0.004, bot.entity.pitch, true); await bot.waitForTicks(1) }   // watches him go
    await go(-2.5, -10.3)                        // H1's door
    await runner
    bot.chat(`/tp @e[tag=h0,limit=1] ${X + 300} ${F + 1} ${Z}`)   // (off camera: he's in the trunk now)
    await openDoor(-4, -11)
    await look(-7, 1.4, -11.5, 240)              // peek: an empty bed
    await bot.waitForTicks(4)
    await go(2.6, -10.3)                         // across the street: H2's door
    await openDoor(4, -11)
    await look(7, 1.4, -10.5, 240)
    await bot.waitForTicks(3)
    await go(2.6, -6.9, { pitch: -0.05, stop: 0.4 })   // back out into the street
    ctx.mark('r1_end')
    // the giveaway: the tree rustles and an apple drops out of it (dark oak leaves drop apples)
    bot.chat(`/summon item ${X + 5.2} ${F + 4.6} ${Z - 5.6} {Item:{id:"minecraft:apple",count:1},PickupDelay:400,Motion:[-0.04,0.05,-0.03]}`)
    const shake = everyTick(20, (i) => { if (i % 4 === 0) ctx.sound('block.grass.hit', 0.7, 0.8 + 0.05 * (i % 3)) })
    await look(5.6, 3.4, -5.9, 380)
    hmm(1)
    ctx.mark('r1_zoom')
    await go(5.6, -7.0, { stop: 0.3, face: [7.0, 2.4, -5.0] })
    await shake
    await look(6.5, 2.5, -5, 160)
    ctx.mark('r1_chop'); ctx.select(0)
    await dig(6, 2, -5, 8, 'dark_oak_log', 'wood')
    await look(7.5, 2.5, -5, 140)
    await dig(7, 2, -5, 8, 'dark_oak_log', 'wood')
    hmm(1.1)
    found(1)
    await look(7.0, 2.4, -4.3, 260)
    await drift(12)

    // ---- round 2: the pond (south-east)
    ctx.mark('cut1a')
    await tp(0.5, 6.5, 180, 10)
    await bot.waitForTicks(6)
    ctx.mark('cut1b')
    ctx.mark('r2_go')
    await look(0.5, 1.6, 0.5, 280)              // the well
    await go(0.5, 5.0, { sprint: false, pitch: -0.55, stop: 0.3, maxTicks: 24 })
    await bot.waitForTicks(4)
    await go(8.0, 7.2)                           // behind the hay
    await look(9.5, 0.8, 5.5, 240)
    await bot.waitForTicks(3)
    ctx.mark('r2_end')
    await look(16.5, 0.9, 9.5, 360)              // ...bubbles on the pond
    const bubbles = everyTick(40, (i) => {
      if (i % 3 === 0) ctx.particles('splash', W(16.5, 1, 9.5), { count: 10, spread: 0.35 })
      if (i % 6 === 0) ctx.sound('block.bubble_column.upwards_ambient', 0.8, 0.9 + 0.05 * (i % 4))
    })
    await go(11.6, 9.5, { sprint: false, stop: 0.35, face: [16.5, 1.3, 9.5] })
    ctx.mark('r2_zoom')
    await rise('h2', 4.4, 22)                   // he rises out of the shaft, right in front of the seeker
    ctx.particles('splash', W(16.5, 1, 9.5), { count: 24 }); ctx.sound('entity.player.splash', 0.8, 1.2)
    hmm(0.8)
    found(2)
    await bubbles
    await drift(6)

    // ---- round 3: under my feet (west, by the bell stall)
    ctx.mark('cut2a')
    await ctx.cmd('/gamerule block_drops false')   // the path's dirt drop floated over his face
    await tp(-8.5, -0.5, 90, 0)
    await bot.waitForTicks(6)
    ctx.mark('cut2b')
    ctx.mark('r3_go')
    await go(-10.8, -0.5)                        // the stall
    await look(-14, 3.2, -0.5, 240)              // up at the bell
    await look(-17.5, 1.0, 2.5, 240)
    await go(-10.8, 6.6)                         // behind the tree
    await look(-15, 1.2, 9.5, 240)
    await bot.waitForTicks(3)
    await go(-8.5, -0.3, { stop: 0.3 })          // back to the start
    ctx.mark('r3_end')
    await ctx.easeLook(Math.PI / 2 + 0.4, 0, 220)   // looks around: nobody
    // the giveaway: something knocks under the path block, crumbs jump up
    const knock = everyTick(16, (i) => { if (i % 5 === 0) { ctx.particles('block', W(-9, 0, -1), { block: 'dirt_path' }); ctx.sound('block.grass.hit', 0.9, 0.7) } })
    await look(-8.5, 0, -0.5, 280)
    ctx.mark('r3_zoom')
    bot.setControlState('back', true); await bot.waitForTicks(4); bot.setControlState('back', false)   // a step back off it
    await knock
    hmm(0.7)
    ctx.select(1)
    ctx.mark('r3_dig')
    await dig(-9, 0, -1, 3, 'dirt_path', 'grass')
    hmm(1.2)
    found(3)
    // a step forward to the hole's edge (still on the block beside it), and straight down at his face
    for (let i = 0; i < 8 && bot.entity.position.z > Z + 0.33; i++) { bot.setControlState('forward', true); bot.setControlState('sneak', true); await bot.waitForTicks(1) }
    bot.setControlState('forward', false); bot.setControlState('sneak', false)
    await look(-8.5, -0.3, -0.55, 220)
    await drift(10, 0.08)

    // ---- round 4: the lava pool (north-west)
    ctx.mark('cut3a')
    await ctx.cmd('/gamerule block_drops true')
    await tp(-10.5, -5.5, 180, 0)
    await bot.waitForTicks(6)
    ctx.mark('cut3b')
    ctx.mark('r4_go')
    await go(-11.0, -15.3)                       // round the back of H1
    await look(-4, 1.2, -15.5, 240)
    await look(-13, 4.0, -18, 260)               // up into the tree
    await bot.waitForTicks(3)
    ctx.mark('r4_end')
    // the giveaway: the lava pops and smokes
    const pops = everyTick(30, (i) => {
      if (i % 5 === 0) ctx.sound('block.lava.pop', 1, 0.8 + 0.1 * (i % 3))
      if (i === 4 || i === 18) ctx.particles('smoke', W(-18.5, 1.4, -12.5))
    })
    await look(-18.5, 0.8, -12.5, 360)
    ctx.mark('r4_zoom')
    await go(-14.2, -13.0, { sprint: false, stop: 0.35, face: [-18.5, 1.2, -12.5] })
    await rise('h4', 2.6, 18)                   // he rises out of the lava, on fire
    hmm(0.9)
    found(4)
    await pops
    await drift(4)

    // ---- round 5: the pillar (built now, off camera)
    ctx.mark('cut4a')
    await ctx.cmd('/gamemode creative')
    // the pillar: (-3, 6), from the ground to build limit (y 319); the villager stands on top, looking down
    for (let y = 1; y <= 319 - F; y += 100) await ctx.cmd(`/fill ${X - 3} ${F + y} ${Z + 6} ${X - 3} ${Math.min(319, F + y + 99)} ${Z + 6} dirt`)
    await this.hider('h5', -2.5, 320 - F, 6.5, -45, 70, 'librarian')
    await tp(-0.5, 5.5, 70, 0)                   // the pillar ahead on the right: it's in shot from the start
    await ctx.cmd('/gamemode survival')
    await bot.waitForTicks(20)
    ctx.select(0)
    ctx.mark('cut4b')
    ctx.mark('r5_go')
    await go(-1.6, 10.3)                         // H3's door
    await openDoor(-4, 11)
    await look(-7, 1.4, 11.5, 240)
    await bot.waitForTicks(3)
    await go(0.5, 7.4, { stop: 0.4 })            // back to the start
    ctx.mark('r5_end')
    // an emerald drops out of the sky, right beside the pillar
    bot.chat(`/summon item ${X - 1.6} ${F + 7} ${Z + 6.5} {Item:{id:"minecraft:emerald",count:1},PickupDelay:200,Motion:[0.0,-0.3,0.0]}`)
    await look(-1.6, 4.5, 6.5, 260)
    await look(-1.6, 0.3, 6.5, 300)
    // ...and up the pillar, fast
    await look(-2.5, 30, 6.5, 260)
    ctx.mark('r5_zoom')
    await look(-1.6, 321.0 - F, 6.5, 300)
    hmm(0.9)
    found(5)
    // up there (seen in the zoom-out replay): he tosses emeralds down, laughing (happy particles), and
    // turns his head from the seeker below to the camera
    const up = everyTick(24, (i) => {
      if (i % 6 === 0) bot.chat(`/summon item ${X - 2.2} ${321.3} ${Z + 6.8} {Item:{id:"minecraft:emerald",count:1},PickupDelay:200,Motion:[${(0.12 + 0.03 * (i % 3)).toFixed(2)},0.24,${(0.1 + 0.02 * (i % 4)).toFixed(2)}]}`)
      if (i % 4 === 0) ctx.particles('happy', W(-2.5, 321.9 - F, 6.5))
    })
    for (let i = 0; i < 24; i++) {
      if (i === 14) ctx.mark('face_on', { near: [X - 2.5, Z + 6.5, 1.5], head: true })   // ...and he looks up at the camera
      await bot.look(bot.entity.yaw + 0.004 * Math.sin(i / 3), bot.entity.pitch, true); await bot.waitForTicks(1)
    }
    await up
    return true
  }
}
