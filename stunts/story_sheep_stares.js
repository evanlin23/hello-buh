// Story Short "why is my sheep staring at this block 💀" (stories/sheep_stares, premise 3 in
// docs/stories.md). The narrator's blue sheep has stared at one dirt block for 412 days. It won't
// eat, it walks back when he pushes it into the river, wolves take one look and leave, and at night
// the block groans. He woke up in this house 412 days ago with no tools and no memories; there's a
// line of torches from his door to the block; the villagers call him "the new one". Today he breaks
// the block: a shaft straight down. "Who digs STRAIGHT DOWN?" He falls in, and at the bottom, in an
// old torch-lit mine, a zombie kills him with a diamond sword.
//
// The twist is the game's own death message: "HelloBuh was slain by Zombie using [HelloBuh's Sword]"
// (vanilla names the weapon only when it has a custom name). He dug down there 412 days ago, put a
// block over his head, died, and respawned with nothing; the zombie picked up his sword (so it never
// despawned), and the sheep watched him go in and has waited at that block ever since. Nothing is
// said after the fall. The death loops into line 1 as cause and effect.
//
// One scene per line (docs/stories.md): each lasts its spoken length + gap, actions land on caption
// chunks (at(k)). The fall is real (15 blocks = 12 damage, 4 hearts left), and the zombie's hit is
// a diamond sword's on Normal (3 + 7 = 10).
const path = require('path')
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'sheep_stares')
const CAPTION = 'why is my sheep staring at this block 💀'
const DEPTH = 15                       // the shaft: feet fall from F+1 to F-14
const PARK = [0.5, -30, 90.5]          // off the set, underground, over 64 blocks from every scene (a hop from here snaps)

module.exports = {
  name: 'story_sheep_stares',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: { caption: CAPTION, red: 'staring', story: 'stories/sheep_stares', startAt: 'line:0', endAfter: 'slain:1.75', deathScreen: true, zoom: [['slain:0.15', 'slain:1.9', 1.1]] },
  expectDeath: true,
  botTimeout: 360,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const c = (s) => ctx.cmd(s)
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')
    await c('/gamerule random_tick_speed 0')
    await c('/gamerule natural_health_regeneration false')   // the 4 hearts left after the fall stay 4
    await c('/difficulty normal')                            // a zombie needs it to exist
    await clearSet(ctx, A, 64, 40)
    // ...and everything above it: a hill higher than the clearing was left floating, and its gravel rained into
    // the village street between runs (a heap in the L10 shot; the L11 cut landed inside it and he suffocated)
    for (let y0 = 41; y0 <= 130; y0++) await c(`/fill ${A(-64, y0, -64)} ${A(64, y0, 64)} air`)
    for (let i = 0; i < 3; i++) { await c('/kill @e[type=falling_block]'); await bot.waitForTicks(10) }
    for (const b of ['gravel', 'sand']) await c(`/fill ${A(-64, 1, -64)} ${A(64, 1, 64)} air replace ${b}`)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 30)

    // --- under the block: solid stone, then the shaft he dug and the little mine at its bottom
    await c(`/fill ${A(-6, -DEPTH - 5, -9)} ${A(6, -5, 5)} stone`)
    await c(`/fill ${A(-1, -DEPTH + 1, -4)} ${A(1, -DEPTH + 3, 0)} air`)          // the room: 3 wide, 5 long, 3 high
    await c(`/fill ${A(0, -DEPTH + 1, 0)} ${A(0, 0, 0)} air`)                     // the shaft, straight down
    await c(`/setblock ${A(0, 1, 0)} coarse_dirt`)                                // THE block (coarse dirt: grass never spreads to it)
    await c(`/setblock ${A(-1, -DEPTH + 2, -2)} wall_torch[facing=east]`)
    await c(`/setblock ${A(1, -DEPTH + 2, -3)} wall_torch[facing=west]`)
    await c(`/setblock ${A(-1, -DEPTH + 1, -4)} furnace[facing=south]`)
    await c(`/setblock ${A(1, -DEPTH + 1, -4)} crafting_table`)
    await c(`/setblock ${A(0, -DEPTH + 2, -5)} diamond_ore`)
    await c(`/setblock ${A(2, -DEPTH + 2, -1)} iron_ore`)
    await c(`/setblock ${A(-2, -DEPTH + 1, -3)} coal_ore`)
    await c(`/setblock ${A(2, -DEPTH + 3, -3)} coal_ore`)

    // --- my house, south of the block, the door facing it; a line of torches from the door to the block
    await house(ctx, A, -3, 10, 0, 10, 'south', true)
    await c(`/setblock ${A(-2, 1, 14)} crafting_table`)
    await c(`/setblock ${A(1, 1, 14)} barrel[facing=up]`)
    await c(`/setblock ${A(-2, 2, 12)} wall_torch[facing=east]`)
    for (const z of [3, 5, 7, 9]) await c(`/setblock ${A(-1, 1, z)} torch`)
    for (const [dx, dz, b] of [[-3, 9, 'poppy'], [2, 9, 'dandelion'], [3, 6, 'oxeye_daisy'], [-4, 2, 'cornflower'], [4, -3, 'poppy'], [-5, -4, 'dandelion'], [6, 2, 'azure_bluet'], [-7, 5, 'poppy'], [2, -6, 'cornflower']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)

    // --- the river, north of the block, and trees so no horizon is bare
    await c(`/fill ${A(-64, -2, -38)} ${A(64, 0, -32)} water`)
    await c(`/fill ${A(-64, -3, -38)} ${A(64, -3, -32)} sand`)
    for (const [dx, dz] of [[-30, -46], [-22, -50], [-14, -45], [-6, -52], [3, -46], [11, -50], [20, -45], [29, -51], [-38, -44], [38, -46], [-16, -14], [13, -18], [-24, 4], [19, -9], [-13, 20], [16, 22], [-30, -20], [-34, 14], [24, 30], [-4, 30], [8, 34], [-20, 34]]) await c(`/place feature minecraft:oak ${A(dx, 1, dz)}`)

    // --- the village, east: four houses on a little street
    await house(ctx, A, 31, -3, 36, -1, 'west')
    await house(ctx, A, 44, -3, 44, -1, 'east')
    await house(ctx, A, 31, 6, 36, 8, 'west', true, 'spruce_planks')
    await house(ctx, A, 44, 6, 44, 8, 'east', true, 'birch_planks')
    for (const [dx, dz] of [[38, -4], [43, 4], [37, 14]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    await c(`/fill ${A(45, 1, 13)} ${A(46, 1, 14)} hay_block`); await c(`/setblock ${A(45, 2, 13)} hay_block`)
    for (const [dx, dz, b] of [[38, 2, 'poppy'], [43, 9, 'dandelion'], [37, 5, 'cornflower']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)

    // --- the cast, all NoAI (they move only when a scene moves them)
    const mob = (type, x, y, z, yaw, pitch, tag, more = '') => c(`/summon ${type} ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[${yaw}f,${pitch}f]${more}}`)
    const vd = (prof, type = 'plains') => `,VillagerData:{profession:"minecraft:${prof}",type:"minecraft:${type}",level:2},Xp:1`
    await mob('sheep', -0.95, 1, 0.5, -90, 12, 'main', ',Color:3b')                 // the sheep, a block west of the block, staring east at it
    await mob('sheep', ...PARK, 180, 0, 'river', ',Color:3b')                       // his twin for the river shot
    for (let i = 0; i < 3; i++) await mob('wolf', PARK[0] + 2 + i, PARK[1], PARK[2], 0, 0, `wolf${i}`)
    await c('/tag @e[type=wolf] add wolf')
    const V = [['farmer', 40.5, 5.0, 'plains'], ['librarian', 38.9, 3.6, 'taiga'], ['mason', 42.2, 3.4, 'savanna'], ['cleric', 39.7, 1.9, 'desert'], ['shepherd', 41.5, 1.5, 'plains']]
    for (let i = 0; i < V.length; i++) await mob('villager', V[i][1], 1, V[i][2], 0, 0, `v${i}`, vd(V[i][0], V[i][3]))
    await c('/tag @e[type=villager] add vil')
    // the zombie at the bottom, holding the sword the last player dropped (a mob that picked up loot never despawns)
    await mob('zombie', 0.5, -DEPTH + 1, -2.9, 0, 0, 'zed')
    await c(`/item replace entity @e[tag=zed,limit=1] weapon.mainhand with diamond_sword[custom_name="HelloBuh's Sword"]`)

    await c('/clear @s')                        // no tools
    await resendChunks(ctx, X, Z)               // mineflayer ignores biome updates: reload the chunks
    await ctx.tpCheck(X + 2.9, F + 1, Z + 4.9, 140, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, say, look, line } = K
    const ctl = (n, on) => bot.setControlState(n, on)
    const stopAll = () => { for (const n of ['forward', 'back', 'left', 'right', 'sprint', 'sneak', 'jump']) ctl(n, false) }
    const cut = async (dx, dz, target, dy = 1) => { stopAll(); await K.cut(dx, dz, target, dy) }
    const tp = (tag, x, y, z, yaw, pitch = 0) => say(`/tp @e[tag=${tag},limit=1] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${yaw.toFixed(1)} ${pitch.toFixed(1)}`)
    const park = (tag) => say(`/tp @e[tag=${tag}] ${X + PARK[0]} ${F + PARK[1]} ${Z + PARK[2]} 0 0`)
    const setTime = (n) => { say(`/time set ${n}`); ctx.mark('time', { time: n }) }
    const me = () => bot.entity.position
    const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2 }
    const yawTo = (fx, fz, tx, tz) => -Math.atan2(tx - fx, tz - fz) * 180 / Math.PI   // Minecraft yaw (0 = south) from one point to another

    // the sheep: one /tp every tick from this state, so he is never "idle" (an idle mob's first move
    // reaches the client ~1 s late) and every scene just edits the numbers
    const SH = { x: -0.95, y: 1, z: 0.5, yaw: -90, pitch: 12, watch: false }
    const HOME = { x: -0.95, z: 0.5, yaw: -90, pitch: 12 }
    let jig = 0, zedLive = false, vilLive = false
    const ZED = { z: -2.9 }
    const everyTick = () => {
      jig++
      const j = jig % 2 ? 0.002 : -0.002
      if (SH.watch) {   // he watches me: turn toward me, a little each tick
        const want = yawTo(SH.x, SH.z, me().x - X, me().z - Z)
        let d = want - SH.yaw; while (d > 180) d -= 360; while (d < -180) d += 360
        SH.yaw += Math.max(-14, Math.min(14, d)); SH.pitch += (-8 - SH.pitch) * 0.3
      }
      tp('main', SH.x + j, SH.y, SH.z, SH.yaw, SH.pitch)
      if (zedLive) tp('zed', 0.5 + j, -DEPTH + 1, ZED.z, 0, 0)
      if (vilLive) say(`/execute as @e[tag=vil] at @s run tp @s ~${j * 2} ~ ~`)
    }
    bot.on('physicsTick', everyTick)

    const SUBJ = P(-0.15, 1.55, 0.5)       // between his face and the block
    const track = (p) => { K.base = K.aim(p) }

    // L01: the sheep, the block, 412 days. Creep in on them
    await cut(2.9, 4.9, SUBJ)
    await line('L01', (k) => { ctl('sneak', true); ctl('forward', k < 44); ctl('left', k > 6 && k < 40); track(SUBJ); look(k) })

    // L02: he doesn't eat / sleep (night) / blink (his face over the block)
    await cut(1.7, 3.1, P(-0.5, 1.6, 0.5))
    tp('river', -20.5, 1, -29.3, 180, 0)      // his twin comes to the river bank, far behind every L02 shot
    await line('L02', async (k, at) => {
      if (k === at(2)) { await cut(-4.6, -3.4, P(-0.4, 1.5, 0.5)); setTime(18000) }
      if (k === at(4)) { await cut(3.3, 0.5, P(-0.6, 2.1, 0.5)); setTime(6000) }
      ctl('sneak', true)
      if (k < at(2)) { ctl('right', true); track(P(-0.5, 1.6, 0.5)) } else if (k < at(4)) { ctl('left', true); track(P(-0.4, 1.5, 0.5)) } else { ctl('forward', me().x > X + 2.35); track(P(-0.6, 2.1, 0.5)) }
      look(k)
    }, -0.15)

    // L03: I pushed him into the river (his twin, at the bank). He walked right back
    await cut(-20.5, -26.9, P(-20.5, 1.1, -31.5))
    Object.assign(SH, { x: -0.95, z: -7.4, yaw: 0, pitch: 0 })   // the real one waits north of his spot, off camera
    let rz = -29.3, ry = 1, wet = false
    await line('L03', async (k, at) => {
      if (k < at(2)) {
        ctl('forward', me().z > Z - 29.9)
        rz -= wet ? 0.05 : 0.17
        if (!wet && rz < -31.45) { wet = true; ctx.sound('entity.generic.splash', 0.8, 1); ctx.particles('splash', P(-20.5, 0.95, rz - 0.3), { count: 14 }) }
        if (wet) ry = Math.max(0.3, ry - 0.22)
        tp('river', -20.5, ry + (wet ? Math.sin(k / 3) * 0.04 : 0), rz, 180, 0)
        track(P(-20.5, wet ? 0.9 : 1.1, rz - 0.4)); look(k)
        if (k >= at(2) - 4) SH.z += 0.3        // already trotting home when the cut lands
        return
      }
      if (k === at(2)) { await cut(-4.4, 3.2, P(SH.x, 1.3, SH.z)); park('river') }   // from the south-west: he trots down toward the camera, the block beyond him
      if (SH.z < HOME.z) SH.z = Math.min(HOME.z, SH.z + 0.3)
      else { SH.yaw += (HOME.yaw - SH.yaw) * 0.45; SH.pitch += (HOME.pitch - SH.pitch) * 0.45 }   // and turns back to the block
      ctl('sneak', true); ctl('right', true)
      track(P(SH.x + 0.3, 1.35, SH.z)); look(k)
    }, -0.1)
    Object.assign(SH, HOME)

    // L04: wolves showed up, took one look at him and left
    const W = [[-1.2, -8.4], [-2.4, -9.5], [-0.1, -10.1]]
    const wolves = (dz, yaw) => { for (let i = 0; i < 3; i++) { W[i][1] += dz; tp(`wolf${i}`, W[i][0], 1, W[i][1], yaw, 0) } }
    await cut(2.6, -3.7, P(-0.9, 1.0, -1.5))   // from the north-east, close: the block and him on the left, the wolves come in on the right
    wolves(0, 0)                               // from past 64 blocks: they show 2 ticks later, still out of frame (sent before the cut they popped into L03's shot)
    await line('L04', (k, at) => {
      const stop = at(2) + 2, run = at(5) - 4
      if (k < stop) wolves(0.3, 0)                                         // loping in
      else if (k < run) wolves(k % 2 ? 0.003 : -0.003, 0)                   // one look
      else wolves(-Math.min(0.42, 0.1 + (k - run) * 0.06), 180)             // and gone
      ctl('sneak', true); ctl('right', k < stop)
      track(P(-0.9, 1.0, -1.5 - 0.8 * ease((k - run) / 10))); look(k)
    })

    // L05: a block of gold on top. He stared through it
    say(`/setblock ${X} ${F + 2} ${Z} gold_block`)
    await cut(-0.4, 3.7, P(0.0, 1.9, 0.5))
    park('wolf')
    await line('L05', (k, at) => { ctl('sneak', true); ctl('right', k < at(4)); ctl('forward', k >= at(4)); track(P(0.0 - 0.5 * ease((k - at(4)) / 10), 1.9 - 0.3 * ease((k - at(4)) / 10), 0.5)); look(k) })

    // L06: at night the block groans
    say(`/setblock ${X} ${F + 2} ${Z} air`)
    await cut(1.3, 3.7, P(0.2, 1.55, 0.5))
    setTime(18000)
    await line('L06', (k, at) => {
      if (k === at(2) - 1) ctx.sound('entity.zombie.ambient', 0.45, 0.75)
      ctl('sneak', true); ctl('left', k < at(2) || k >= at(4)); ctl('forward', k >= at(2) && k < at(4) && me().z > Z + 2.6)
      const lean = ease((k - at(2) + 2) / 7) - ease((k - at(4)) / 12)           // down to the block on GROANS, back up after
      track(P(0.2 - 0.7 * (1 - lean) * ease((k - at(4)) / 12), 1.55 - 0.45 * lean, 0.5))
      look(k, lean > 0.5 ? Math.sin(k * 1.9) * 0.006 : 0)
    })

    // L07: I don't remember getting a sheep, or dyeing him blue (from the north: him, the block, the torches, my house)
    await cut(-3.4, -3.9, P(-0.6, 1.4, 0.5))
    setTime(6000)
    await line('L07', (k, at) => { ctl('sneak', true); ctl('left', k < at(5)); ctl('forward', k >= at(5)); track(P(-0.6, 1.4, 0.5)); look(k) })

    // L08: I woke up in this house 412 days ago (the ceiling, the bare room, then him through the door)
    await cut(-0.9, 13.4, P(-1.6, 3.9, 12.3))
    let from = null
    await line('L08', async (k, at) => {
      if (k === at(3)) { await cut(0.9, 11.5, P(-2.2, 1.6, 14.2)); from = null }
      if (k === at(5)) { await cut(0.5, 13.2, P(0.5, 1.5, 0.5)); from = null }
      if (k < at(3)) { if (k >= 5) { from = from || { ...K.base }; K.turnTo(from, P(0.4, 1.7, 10.5), (k - 5) / 30) } } else if (k < at(5)) { from = from || { ...K.base }; K.turnTo(from, P(1.6, 1.2, 14.3), (k - at(3)) / 22) } else { ctl('sneak', true); ctl('forward', true); track(P(0.2, 1.5, 0.5)) }
      look(k)
    }, -0.2)

    // L09: the house was already built; a line of torches from my door to that block (the pan follows them)
    await cut(5.6, 5.4, P(0.5, 2.3, 10.5))
    vilLive = true
    from = null
    await line('L09', (k, at) => {
      ctl('sneak', true); ctl('left', k <= at(3)); ctl('forward', k > at(3))
      if (k < at(3) - 3) track(P(0.5, 2.3, 10.5))
      if (k >= at(3) - 3) { from = from || { ...K.base }; K.turnTo(from, P(-0.2, 1.3, 0.6), (k - at(3) + 3) / 34) }
      look(k)
    })

    // L10: the villagers call me the new one (they all creep up, staring)
    await cut(40.5, 13.2, P(40.5, 1.6, 4.5))
    vilLive = false
    const creep = (s) => say(`/execute as @e[tag=vil] at @s run tp @s ~ ~ ~${s}`)
    await line('L10', (k) => { creep(0.035); ctl('forward', k < 14); look(k) })
    // L11: what happened to the old one? WHO? (the farmer leans in; the two behind him look at each other)
    await cut(40.4, 8.4, P(40.5, 1.75, 6.2))
    ctx.mark('face_on', { near: [X + 40.5, Z + 6.5, 4], head: true })
    let y1 = 0, y2 = 0, faced = true
    await line('L11', (k, at) => {
      ctl('sneak', true); ctl('back', true)                                    // I back away; the farmer keeps coming
      say(`/execute as @e[tag=v0] at @s run tp @s ~ ~ ~${k < at(5) ? 0.07 : 0.02}`)
      if (faced && k >= at(5) - 3) { faced = false; ctx.mark('face_off') }
      if (k >= at(5) - 2) {   // WHO? The librarian and the mason turn to each other
        const u = ease((k - at(5) + 2) / 6)
        y1 = -90 * u; y2 = 90 * u
        say(`/execute as @e[tag=v1] at @s run tp @s ~ ~ ~ ${y1.toFixed(1)} 0`); say(`/execute as @e[tag=v2] at @s run tp @s ~ ~ ~ ${y2.toFixed(1)} 0`)
        if (k === at(5) + 3) ctx.sound('entity.villager.no', 0.8, 1)
      } else say(`/execute as @e[tag=v1] at @s run tp @s ~${k % 2 ? 0.003 : -0.003} ~ ~`)
      look(k, 0, -0.03 * ease((k - at(5)) / 6))
    })
    if (faced) ctx.mark('face_off')

    // L12: so today I got curious (up the torch line to the block)
    await cut(0.5, 8.7, P(-0.1, 1.5, 0.5))
    zedLive = true
    await line('L12', (k) => { ctl('forward', me().z > Z + 4.3); track(P(-0.1, 1.5, 0.5)); look(k) })
    // L13: for the first time in 412 days, he looked at me
    from = null
    await line('L13', (k, at) => {
      ctl('sneak', true); ctl('forward', me().z > Z + 2.95 && k < at(3) - 4)
      from = from || { ...K.base }; K.turnTo(from, P(-0.8, 1.85, 0.5), k / 16)
      if (k === at(3) - 3) { SH.watch = true; ctx.sound('entity.sheep.ambient', 1, 1) }
      ctl('back', k >= at(3) + 2 && k < at(3) + 7)                              // a step back
      look(k)
    })
    // L14: I broke the block (by hand: 0.75 s)
    from = null
    let broke = false
    const cube = bot.blockAt(new ctx.Vec3(X, F + 1, Z))
    await line('L14', (k) => {
      ctl('sneak', true); ctl('back', false)
      from = from || { ...K.base }; K.turnTo(from, P(0.5, 1.5, 0.5), (k + 1) / 6)
      if (k === 3) bot.dig(cube, 'ignore').then(() => { broke = true; ctx.mark('broke') }).catch((e) => ctx.log('dig', e.message))
      look(k)
    }, 0.1)
    const HOLE = P(0.5, 0.3, 0.45)      // into the shaft from its edge (straight down is my own feet)
    // L15: a hole under it, straight down (to the edge, look in; the groan again, from below)
    from = null
    await line('L15', (k, at) => {
      ctl('sneak', true); ctl('forward', me().z > Z + 1.38)
      from = from || { ...K.base }; K.turnTo(from, HOLE, (k - 1) / 16)
      if (k === at(3) + 2) ctx.sound('entity.zombie.ambient', 0.5, 0.8)
      look(k, Math.sin(k / 5) * 0.05 * ease((k - 14) / 8), k >= at(3) + 3 ? 0.07 * Math.sin(Math.min(1, (k - at(3) - 3) / 12) * Math.PI) : 0)   // a flinch up, back down
    })
    // L16: who digs straight down? (he steps in)
    let fell = false
    await line('L16', (k, at) => {
      const step = at(2) + 1
      if (k === 1) ctx.sound('entity.sheep.ambient', 1, 1.1)                   // he bleats; I ask HIM, then look back down
      ctl('sneak', k < step); ctl('forward', k >= step && me().y > F + 0.6)
      if (me().y < F + 0.6) fell = true
      if (k === 0 || k === 7) from = { ...K.base }
      if (k < 7) K.turnTo(from, P(SH.x, 1.85, SH.z), (k + 1) / 6)
      else if (k < step) K.turnTo(from, HOLE, (k - 6) / 6)
      else K.base = { yaw: K.base.yaw, pitch: Math.max(-1.48, K.base.pitch - 0.05) }
      look(k, fell ? Math.sin(k * 1.3) * 0.01 : 0)
    })
    ctx.log('broke', broke, 'fell', fell, 'y', me().y - F)
    // the fall: 15 blocks, about a second, eyes down the shaft
    K.sway = 0.3
    for (let i = 0; i < 60 && !(bot.entity.onGround && me().y < F - DEPTH + 2); i++) { ctl('forward', me().y > F + 0.6); look(i, Math.sin(i * 1.3) * 0.01); await bot.waitForTicks(1) }
    stopAll()
    ctx.mark('land')
    ctx.log('landed y', me().y - F, 'health', bot.health)
    // the bottom: his old mine, still lit. A groan; look up: a zombie, holding a diamond sword
    ctx.sound('entity.zombie.ambient', 1, 1)
    from = { ...K.base }
    for (let i = 0; i < 12 && !ctx.died; i++) {
      if (i >= 3) ZED.z = Math.min(-2.25, ZED.z + 0.1)                       // he steps in
      K.turnTo(from, P(0.5, -DEPTH + 3.2, ZED.z), (i + 1) / 8)   // above his head: he and the sword sit low, clear of the death message
      look(i); await bot.waitForTicks(1)
    }
    // the hit: a diamond sword in a zombie's hand on Normal is 10; 8 health was left after the fall
    say(`/damage @s 10 minecraft:mob_attack by @e[tag=zed,limit=1]`)
    ctx.mark('slain')
    for (let i = 0; i < 12 && !ctx.died; i++) await bot.waitForTicks(1)
    if (!ctx.died) { ctx.log('still alive, health', bot.health); say(`/damage @s 20 minecraft:mob_attack by @e[tag=zed,limit=1]`); for (let i = 0; i < 20 && !ctx.died; i++) await bot.waitForTicks(1) }
    // behind the death screen: the torches keep smoking (mob updates stop reaching a dead player)
    for (let i = 0; i < 44; i++) {
      if (i % 2 === 0) ctx.particles('poof', i % 4 ? P(1.7, -DEPTH + 2.8, -2.5) : P(-0.7, -DEPTH + 2.8, -1.5), { w: 0.12, h: 0.12 })   // small pale puffs off the two torches (dark smoke drew as black blotches under the death tint)
      await bot.waitForTicks(1)
    }
    ctx.mark('story_end')
    bot.removeListener('physicsTick', everyTick)
    await bot.waitForTicks(4)
    return ctx.died
  }
}
