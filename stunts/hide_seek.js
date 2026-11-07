// "hide and seek but the villagers cheated 😭" (~35 s, worker 16): first person from the seeker, in a
// plains village built from vanilla's own village templates (/place template). Four rounds, each on
// a 5 s clock: the seeker checks doors, behind houses, the well, the hay... nothing. Then something
// gives the hider away, and every spot is more impossible than the last:
//   1. inside a tree trunk (its nose sticks out of the log): the seeker chops the log, face to face
//   2. at the bottom of a 1x1 shaft under the pond (bubbles): looking down, a villager looking up
//   3. right under the spot where the seeker started (a "hmm" from below): dig it, a face looking up
//   4. on a 1x1 pillar up to build limit, right beside the start (an emerald falls from the sky):
//      the camera follows the pillar up to the top
// Hiders are NoAI, Invulnerable, NoGravity villagers; the sets are built with commands before the
// recording (the pillar is built in the cut between rounds 3 and 4, so it never shows earlier).
// Between rounds the bot teleports (a cut) and the set-up time is cut from the video (speed 'cut').
const ROUNDS = 4

module.exports = {
  name: 'hide_seek',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'hide and seek but the villagers cheated 😭',
  renderDistance: 17, recordRadius: 280,   // the build-limit pillar: its top is ~250 blocks up (fog is max(xz, |y|))
  chunkStops: set => [{ x: set.x + 150, z: set.z }, { x: set.x - 150, z: set.z }, { x: set.x, z: set.z + 150 }, { x: set.x, z: set.z - 150 }],
  clouds: false,   // Video Settings > Clouds: OFF (vanilla): at y 192 they'd hide the top of the pillar
  botTimeout: 420,
  // sharp zooms (narrower FOV) on each giveaway
  fovZoom: [['r1_zoom', 'r1_chop:-0.3', 2.4], ['r2_zoom', 'r2_found:0.6', 2.6], ['r3_zoom', 'r3_dig:-0.2', 1.6], ['r4_zoom', 'r4_found:0.8', 7]],
  edit: {
    caption: 'hide and seek but the villagers cheated 😭', red: 'cheated',
    song: 'songs/funk_abnormal.mp3', dropAt: 'r4_found',
    startAt: 'r1_go:-0.35', endAfter: 'r4_found:0.9',
    speed: [1, 2, 3].map(n => [`cut${n}a`, `cut${n}b`, 'cut']),
    clock: [1, 2, 3, 4].map(n => [`r${n}_go`, `r${n}_end`, 5, `ROUND ${n}`, "down"]),
    counter: { at: [1, 2, 3, 4].map(n => `r${n}_found`), total: ROUNDS },
    cards: [['r1_found', 'INSIDE THE TREE 😭', 1.0, 'yellow'], ['r2_found', 'UNDER THE POND 😭', 1.0, 'blue'],
      ['r3_found', 'UNDER MY FEET 😭', 1.0, 'orange'], ['r4_found', 'AT BUILD LIMIT 💀', 0.9, 'red']],
    punch: ['r1_found', 'r2_found', 'r3_found', 'r4_found'],
    subs: [['r1_end', 'where is he', 0.9], ['r2_end', 'nothing again', 0.9], ['r3_end', 'I give up', 0.9], ['r4_end', 'seriously?', 0.9]],
    subsY: 0.62
  },

  // ---------------------------------------------------------------- set
  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    await ctx.defaultRules()
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/gamerule random_tick_speed 0')
    await ctx.cmd('/difficulty peaceful')
    const heavy = async (c) => { bot.chat(c); await ctx.sleep(450) }
    await heavy(`/forceload add ${X - 48} ${Z - 48} ${X + 48} ${Z + 48}`)
    // a flat, cleared field (hills cut at the edge show behind houses)
    for (let z0 = Z - 48; z0 <= Z + 48; z0 += 6) {
      const z1 = Math.min(z0 + 5, Z + 48)
      await heavy(`/fill ${X - 48} ${F + 1} ${z0} ${X + 48} ${F + 6} ${z1} air`)
      await heavy(`/fill ${X - 48} ${F + 7} ${z0} ${X + 48} ${F + 30} ${z1} air`)
      await heavy(`/fill ${X - 48} ${F} ${z0} ${X + 48} ${F} ${z1} grass_block`)
      await heavy(`/fill ${X - 48} ${F - 4} ${z0} ${X + 48} ${F - 1} ${z1} dirt`)
      await heavy(`/fillbiome ${X - 48} ${F - 4} ${z0} ${X + 48} ${F + 12} ${z1} minecraft:plains`)
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
    // trees: trunk + a leaf blob (persistent, or they decay)
    const tree = async (dx, dz, h) => {
      await ctx.cmd(`/fill ${P(dx - 2, h - 2, dz - 2)} ${P(dx + 2, h - 1, dz + 2)} oak_leaves[persistent=true]`)
      await ctx.cmd(`/fill ${P(dx - 1, h, dz - 1)} ${P(dx + 1, h + 1, dz + 1)} oak_leaves[persistent=true]`)
      for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) await ctx.cmd(`/setblock ${P(dx + a, h - 1, dz + b)} air`)
      await ctx.cmd(`/fill ${P(dx, 1, dz)} ${P(dx, h - 1, dz)} oak_log`)
    }
    await tree(6, -5, 6)        // T1: the hider's tree (round 1)
    await tree(-15, 8, 6)       // T3 (round 3's look-behind)
    await tree(13, 16, 5)
    await tree(-14, -12, 5)
    // hay (round 2's look-behind)
    await ctx.cmd(`/fill ${P(9, 1, 4)} ${P(10, 1, 5)} hay_block`)
    await ctx.cmd(`/setblock ${P(9, 2, 4)} hay_block`)
    // the pond (round 2): 2 deep, a 1x1 shaft 5 deeper in the middle
    await ctx.cmd(`/fill ${P(12, -3, 6)} ${P(20, -1, 12)} dirt`)
    await ctx.cmd(`/fill ${P(12, -2, 6)} ${P(20, -2, 12)} sand`)
    await ctx.cmd(`/fill ${P(16, -8, 9)} ${P(16, -3, 9)} air`)
    await ctx.cmd(`/fill ${P(15, -9, 8)} ${P(17, -9, 10)} stone`)
    await ctx.cmd(`/fill ${P(12, -1, 6)} ${P(20, 0, 12)} water`)
    await ctx.cmd(`/fill ${P(16, -8, 9)} ${P(16, -3, 9)} water`)
    for (const [a, b] of [[12, 6], [20, 6], [12, 12], [20, 12]]) await ctx.cmd(`/setblock ${P(a, 0, b)} grass_block`)
    // round 3's hole under the start spot (covered by the path block)
    await ctx.cmd(`/fill ${P(-9, -2, -1)} ${P(-9, -1, -1)} air`)
    // the hiders
    await ctx.cmd('/kill @e[type=villager]')
    const hider = (tag, x, y, z, yaw, pitch, prof) => ctx.cmd(`/summon villager ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} {NoAI:1b,NoGravity:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b,Rotation:[${yaw}f,${pitch}f],Tags:["${tag}"],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1}`)
    // 1: in the trunk at (6, -5), facing north, pushed toward the north face so the nose pokes out
    await hider('h1', 6.5, 1.55, -4.72, 180, 0, 'farmer')
    // 2: at the bottom of the shaft, looking up
    await hider('h2', 16.5, -8, 9.5, 90, -80, 'fisherman')
    // 3: in the hole under the start spot, looking up
    await hider('h3', -8.5, -2.05, -0.5, 90, -85, 'nitwit')
    this.hider = hider
    await ctx.hotbar(['diamond_axe', 'diamond_shovel', ['bread', 12], ['torch', 16]])
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
    await ctx.tpCheck(X + 0.5, F + 1, Z - 6.5, -150, 0)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x: X, y: F, z: Z }
  },

  // ---------------------------------------------------------------- the rounds
  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F } = this
    const W = (dx, dy, dz) => new Vec3(X + dx, F + dy, Z + dz)
    const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
    // run to (dx, dz), the camera turning toward where it goes (eased), pitch easing to `pitch`
    const go = async (dx, dz, { sprint = true, pitch = -0.08, stop = 0.45, maxTicks = 120 } = {}) => {
      const tx = X + dx, tz = Z + dz
      bot.setControlState('forward', true); bot.setControlState('sprint', sprint)
      let i = 0
      for (; i < maxTicks; i++) {
        const p = bot.entity.position, ddx = tx - p.x, ddz = tz - p.z, d = Math.hypot(ddx, ddz)
        if (d < stop) break
        const want = Math.atan2(-ddx, -ddz), cur = bot.entity.yaw
        const step = wrap(want - cur)
        await bot.look(cur + Math.max(-0.32, Math.min(0.32, step * 0.45)), bot.entity.pitch + (pitch - bot.entity.pitch) * 0.25, true)
        bot.setControlState('jump', !!bot.entity.isCollidedHorizontally)
        if (d < 1.4) bot.setControlState('sprint', false)
        await bot.waitForTicks(1)
      }
      for (const c of ['forward', 'sprint', 'jump']) bot.setControlState(c, false)
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
    const tp = async (dx, dz, yaw, pitch) => { await ctx.tpCheck(X + dx, F + 1, Z + dz, yaw, pitch) }

    // ---- round 1: the tree (north side)
    await bot.waitForTicks(4)
    ctx.mark('r1_go')
    await go(-2.5, -10.3)                        // H1's door
    await openDoor(-4, -11)
    await look(-7, 1.4, -11.5, 260)              // peek: an empty bed
    await bot.waitForTicks(6)
    await go(2.6, -10.3)                         // across the street: H2's door
    await openDoor(4, -11)
    await look(7, 1.4, -10.5, 260)
    await bot.waitForTicks(4)
    ctx.mark('r1_end')
    hmm(1)                                       // ...a "hmm" from behind: the tree
    await look(6.5, 2.55, -5.1, 420)
    ctx.mark('r1_zoom')
    await bot.waitForTicks(14)
    await go(6.5, -7.6, { sprint: false, pitch: -0.05, stop: 0.3 })
    await look(6.5, 2.5, -5, 180)
    ctx.mark('r1_chop'); ctx.select(0)
    await dig(6, 2, -5, 8, 'oak_log', 'wood')
    hmm(1.1)
    found(1)
    await look(6.5, 2.7, -4.7, 300)
    await bot.waitForTicks(16)

    // ---- round 2: the pond (south-east)
    ctx.mark('cut1a')
    await tp(0.5, 6.5, 180, 10)
    await bot.waitForTicks(6)
    ctx.mark('cut1b')
    ctx.mark('r2_go')
    await look(0.5, 1.6, 0.5, 300)              // the well
    await go(0.5, 5.0, { sprint: false, pitch: -0.55, stop: 0.3, maxTicks: 30 })
    await bot.waitForTicks(6)
    await go(2.6, 10.3)                          // H4's door
    await openDoor(4, 11)
    await look(7, 1.4, 10.5, 260)
    await bot.waitForTicks(4)
    await go(8.0, 7.2)                           // behind the hay
    await look(9.5, 0.8, 5.5, 260)
    await bot.waitForTicks(4)
    ctx.mark('r2_end')
    for (let i = 0; i < 6; i++) ctx.sound('block.bubble_column.upwards_ambient', 0.8, 0.9 + i * 0.05)
    for (let i = 0; i < 5; i++) ctx.particles('splash', W(16.5, 1, 9.5), { count: 8, spread: 0.4 })
    await look(16.5, 0.9, 9.5, 380)
    await go(11.6, 9.5, { sprint: false, pitch: -0.5, stop: 0.35 })
    ctx.mark('r2_zoom')
    await look(16.5, -6.5, 9.5, 450)            // down the shaft: he's looking up
    hmm(0.8)
    found(2)
    await bot.waitForTicks(26)

    // ---- round 3: under my feet (west, by the bell stall)
    ctx.mark('cut2a')
    await tp(-8.5, -0.5, 90, 0)
    await bot.waitForTicks(6)
    ctx.mark('cut2b')
    ctx.mark('r3_go')
    await go(-15.5, -0.5)                        // the stall
    await look(-14, 3.2, -0.5, 260)              // up at the bell
    await look(-17.5, 1.0, 2.5, 260)
    await go(-13.0, 6.0)                         // behind the tree
    await look(-15, 1.2, 9.5, 260)
    await bot.waitForTicks(4)
    await go(-8.5, -0.3, { stop: 0.3 })          // back to the start
    ctx.mark('r3_end')
    await ctx.easeLook(Math.PI / 2 + 0.4, 0, 250)   // looks around: nobody
    hmm(0.7)                                     // "hmm"... from below
    await look(-8.5, 0, -0.5, 300)
    ctx.mark('r3_zoom')
    bot.setControlState('back', true); await bot.waitForTicks(5); bot.setControlState('back', false)
    await look(-8.5, 0.9, -0.5, 200)
    ctx.select(1)
    ctx.mark('r3_dig')
    await dig(-9, 0, -1, 3, 'dirt_path', 'grass')
    hmm(1.2)
    found(3)
    await look(-8.5, -0.3, -0.5, 300)
    await bot.waitForTicks(18)

    // ---- round 4: the pillar (built now, off camera)
    ctx.mark('cut3a')
    await ctx.cmd('/gamemode creative')
    for (let y = 1; y <= 319 - F; y += 100) await ctx.cmd(`/fill ${X - 2} ${F + y} ${Z + 5} ${X - 2} ${Math.min(319, F + y + 99)} ${Z + 5} dirt`)
    await this.hider('h4', -1.5, 320 - F, 5.2, 0, 60, 'librarian')
    await tp(-0.5, 3.5, 180, 0)
    await ctx.cmd('/gamemode survival')
    await bot.waitForTicks(20)
    ctx.select(0)
    ctx.mark('cut3b')
    ctx.mark('r4_go')
    await go(-1.6, 10.3)                         // H3's door
    await openDoor(-4, 11)
    await look(-7, 1.4, 11.5, 260)
    await bot.waitForTicks(4)
    await go(-10.5, 6.5)                         // behind H3
    await look(-10.0, 1.2, 13, 260)
    await bot.waitForTicks(4)
    await go(-4.5, 4.0)                          // back toward the start
    ctx.mark('r4_end')
    await look(-2, 1.2, 4.5, 250)
    // an emerald drops out of the sky, right in front of the seeker
    await ctx.cmd(`/summon item ${X - 2.2} ${F + 9} ${Z + 3.6} {Item:{id:"minecraft:emerald",count:1},PickupDelay:200,Motion:[0.0,-0.2,0.0]}`)
    await look(-2.2, 2.5, 3.6, 300)
    await look(-2.2, 0.3, 3.6, 300)
    ctx.sound('entity.item.pickup', 0.4, 0.6)
    // ...and up the pillar
    await look(-1.5, 40, 5.5, 450)
    ctx.mark('r4_zoom')
    await look(-1.5, 321 - F, 5.4, 650)
    hmm(0.9)
    found(4)
    for (let i = 0; i < 24; i++) { await bot.look(bot.entity.yaw + 0.002 * Math.sin(i / 3), bot.entity.pitch, true); await bot.waitForTicks(1) }
    return true
  }
}
