// Story Short "why does everyone run from me 💀" (stories/runaway): a narrated first-person story,
// one scene per line. Every villager, chicken and fisherman runs from the narrator; his mom (a
// creeper) hugs him, the iron golem never lets him out of its sight, and when he gets excited he
// hears hissing. At the village party he blows up: he's the creeper. The last line ("Which
// explains why") loops into the first.
//
// The narration comes first (scripts/voice.py -> stories/runaway/voice/voice.json): each scene
// lasts exactly its line's spoken length plus the story's gap, and actions land on a caption chunk
// (`at(k)` = the tick chunk k starts). Each line is marked `line` { id } so edit.py lays the line's
// wav and its captions on that tick. Teleports between scenes are cuts in the renderer.
const fs = require('fs')
const path = require('path')
const { storyLines, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'runaway')
const PROFS = ['farmer', 'librarian', 'cleric', 'armorer', 'fletcher', 'toolsmith', 'weaponsmith', 'cartographer', 'butcher', 'shepherd', 'mason', 'leatherworker']

module.exports = {
  name: 'story_runaway',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'why does everyone run from me 💀',
  edit: { caption: 'why does everyone run from me 💀', red: 'run', story: 'stories/runaway', startAt: 'line:0', endAfter: 'story_end:0', deathScreen: true },
  expectDeath: true,
  hideHand: true,          // no Steve arm: the narrator isn't Steve

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
    await c('/gamerule mob_griefing false')   // the blast leaves no crater: the dead camera stays at eye level on the party
    // every per-tick `execute as <mob> run tp` was broadcast to ops ("[Mason: Teleported...]"), the bot
    // included: ~140 chat packets a second backed the client up and mob moves arrived in bursts
    await c('/gamerule log_admin_commands false')
    await c('/difficulty normal')                      // creepers need it to exist, and the explosion only hurts above peaceful
    // a big flat clearing: 81 x 81, in slabs under the 32768-block /fill cap
    await clearSet(ctx, A, 64, 24)              // a wide flat clearing (lib/story.js)
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 24)       // one grass colour over the set (lib/story.js)

    // --- the street (L01, L02, L09): a path north-south, four little houses with doors on it
    await c(`/fill ${A(-1, 0, 6)} ${A(1, 0, 40)} dirt_path`)
    const house = async (x0, z0, doorX, doorZ, facing) => {
      const x1 = x0 + 5, z1 = z0 + 5
      await c(`/fill ${A(x0, 0, z0)} ${A(x1, 4, z1)} oak_planks hollow`)   // a room y1-y3 (shell from y0 to the ceiling at y4)
      await c(`/fill ${A(x0, 0, z0)} ${A(x1, 0, z1)} cobblestone`)
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) await c(`/fill ${A(x, 1, z)} ${A(x, 3, z)} oak_log`)
      await c(`/fill ${A(x0 - 1, 4, z0 - 1)} ${A(x1 + 1, 4, z1 + 1)} spruce_planks`)
      await c(`/fill ${A(x0, 5, z0)} ${A(x1, 5, z1)} spruce_slab`)
      await c(`/setblock ${A(x0 + 2, 4, z0 + 2)} glowstone`); await c(`/setblock ${A(x0 + 3, 4, z0 + 3)} glowstone`)   // lit inside (a lantern left it black)
      // windows on the two walls that run along x
      await c(`/fill ${A(x0 + 2, 2, z0)} ${A(x0 + 3, 2, z0)} glass`)
      await c(`/fill ${A(x0 + 2, 2, z1)} ${A(x0 + 3, 2, z1)} glass`)
      await c(`/setblock ${A(doorX, 2, doorZ)} oak_door[half=upper,facing=${facing},open=true]`)
      await c(`/setblock ${A(doorX, 1, doorZ)} oak_door[half=lower,facing=${facing},open=true]`)
    }
    await house(-9, 12, -4, 14, 'west')
    await house(4, 22, 4, 24, 'east')       // L02's door: the villager stands just inside
    await house(-9, 26, -4, 28, 'west')
    await house(4, 8, 4, 10, 'east')
    // flowers and a lamp post along the street
    for (const [dx, dz, b] of [[-2, 20, 'poppy'], [2, 30, 'dandelion'], [-2, 34, 'cornflower'], [2, 18, 'oxeye_daisy'], [-3, 9, 'poppy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    await c(`/fill ${A(-13, 1, 17)} ${A(-13, 2, 17)} oak_fence`); await c(`/setblock ${A(-13, 3, 17)} lantern`)

    // --- the farm (L03): wheat around a water row, fenced, farmer in the middle
    await c(`/fill ${A(-30, 0, -6)} ${A(-22, 0, 4)} farmland[moisture=7]`)
    await c(`/fill ${A(-30, 1, -6)} ${A(-22, 1, 4)} wheat[age=7]`)
    await c(`/fill ${A(-30, 0, -1)} ${A(-22, 0, -1)} water`)
    await c(`/fill ${A(-30, 1, -1)} ${A(-22, 1, -1)} air`)
    await c(`/fill ${A(-31, 1, -6)} ${A(-31, 1, 4)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(-21, 1, -6)} ${A(-21, 1, 4)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(-30, 1, -7)} ${A(-22, 1, -7)} oak_fence[east=true,west=true]`)
    await c(`/fill ${A(-30, 1, 5)} ${A(-22, 1, 5)} oak_fence[east=true,west=true]`)
    for (const [dx, dz] of [[-31, -7], [-21, -7], [-31, 5], [-21, 5]]) await c(`/setblock ${A(dx, 1, dz)} oak_fence`)
    await c(`/fill ${A(-26, 1, 2)} ${A(-25, 1, 2)} hay_block`)

    // --- the pond and dock (L04)
    await c(`/fill ${A(20, -2, -12)} ${A(38, 0, 3)} water`)
    await c(`/fill ${A(17, 0, -6)} ${A(22, 0, -4)} oak_planks`)
    for (const [dx, dz] of [[22, -6], [22, -4]]) await c(`/setblock ${A(dx, 1, dz)} oak_fence`)

    // --- the chicken pen (L05): fenced on three sides, open to the north
    await c(`/fill ${A(-7, 1, -30)} ${A(-7, 1, -24)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(3, 1, -30)} ${A(3, 1, -24)} oak_fence[north=true,south=true]`)
    await c(`/fill ${A(-6, 1, -23)} ${A(2, 1, -23)} oak_fence[east=true,west=true]`)
    await c(`/setblock ${A(-7, 1, -23)} oak_fence[north=true,east=true]`); await c(`/setblock ${A(3, 1, -23)} oak_fence[north=true,west=true]`)
    await c(`/setblock ${A(-7, 1, -31)} oak_fence[south=true]`); await c(`/setblock ${A(3, 1, -31)} oak_fence[south=true]`)
    await c(`/fill ${A(-6, 0, -30)} ${A(2, 0, -24)} coarse_dirt`)
    await c(`/setblock ${A(1, 1, -25)} hay_block`)

    // --- home (L07, L08): my house, south of the camera spot
    await house(17, 13, 19, 13, 'north')
    await c(`/setblock ${A(19, 2, 13)} oak_door[half=upper,facing=north,open=false]`)
    await c(`/setblock ${A(19, 1, 13)} oak_door[half=lower,facing=north,open=false]`)
    for (const [dx, dz, b] of [[17, 11, 'poppy'], [21, 11, 'poppy'], [16, 12, 'rose_bush'], [22, 12, 'peony']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)

    // --- the party (L10-L14): carpets, cakes, lantern posts, sheep, a ring of villagers
    const PX = 20, PZ = -27
    const wool = ['red', 'yellow', 'lime', 'light_blue', 'magenta', 'orange']
    for (let i = 0; i < 9; i++) await c(`/fill ${A(PX - 4 + i, 1, PZ - 4)} ${A(PX - 4 + i, 1, PZ + 4)} ${wool[i % wool.length]}_carpet`)
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1]]) await c(`/setblock ${A(PX + dx, 1, PZ + dz)} cake`)
    for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { await c(`/fill ${A(PX + dx, 1, PZ + dz)} ${A(PX + dx, 2, PZ + dz)} oak_fence`); await c(`/setblock ${A(PX + dx, 3, PZ + dz)} lantern`) }

    // --- the cast. Every mob NoAI (they move only when a scene moves them), tagged per scene.
    const vil = (x, z, yaw, prof, tag, type = 'plains') => c(`/summon villager ${(X + x).toFixed(2)} ${F + 1} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[${yaw}f,0f],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:${type}",level:2},Xp:1}`)
    // L01: seven villagers up the street, facing the camera (south)
    for (let i = 0; i < 7; i++) await vil(-2.2 + (i % 4) * 1.4 + (i >= 4 ? 0.7 : 0), 29 + (i >= 4 ? 2.2 : 0) + (i % 2) * 0.4, 0, PROFS[i], 'crowd', ['plains', 'taiga', 'savanna'][i % 3])
    // L02: just inside the open door, facing out (east wall door of the house at x 4: he faces west)
    await vil(4.5, 24.5, 90, 'librarian', 'door')        // standing in the doorway
    // L03: the farmer in the wheat, facing the camera (east)
    await vil(-25.5, -5.4, 0, 'farmer', 'farmer')
    // L04: the fisherman on the end of the dock, his boat beside it (he jumps in; mineflayer
    // doesn't move passengers, so he isn't one: both are teleported together)
    await c(`/summon oak_boat ${X + 23.9} ${F + 0.52} ${Z - 6.6} {NoGravity:1b,Invulnerable:1b,Rotation:[-90f,0f],Tags:["boat"]}`)
    await vil(22.0, -4.5, -90, 'fisherman', 'fisher')
    // L05: five sheep in the pen
    for (let i = 0; i < 5; i++) await c(`/summon sheep ${(X - 4.8 + (i % 3) * 2.4).toFixed(2)} ${F + 1} ${(Z - 28.6 + Math.floor(i / 3) * 1.6 + (i % 2) * 0.5).toFixed(2)} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Color:${[0, 0, 8, 0, 15][i]}b,Tags:["chick"],Rotation:[${i * 40}f,0f]}`)
    // L06: the nitwit by the lamp post
    await vil(-14.5, 20.5, 90, 'nitwit', 'nitwit')
    // L07: mom (a creeper) in front of the house; L08: the golem behind the camera
    // (buried under her spot until L06: she showed behind the house in the door scene and gave the twist away)
    await c(`/summon creeper ${X + 19.5} ${F - 3} ${Z + 10.5} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["mom"],Rotation:[180f,0f]}`)
    await c(`/summon iron_golem ${X + 19.5} ${F + 1} ${Z + 4.6} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["golem"],Rotation:[0f,0f]}`)
    // L10-L14: the party ring, facing the middle; rainbow sheep (jeb_) and two dyed sheep
    const ring = 7
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + 0.3, r = 3.3
      const x = PX + 0.5 + Math.sin(a) * r, z = PZ + 0.5 + Math.cos(a) * r
      const yaw = Math.atan2(Math.sin(a), -Math.cos(a)) * 180 / Math.PI   // MC yaw that faces the middle
      await vil(x, z, yaw.toFixed(1), PROFS[(i + 5) % PROFS.length], 'party', ['plains', 'desert', 'snow', 'swamp', 'jungle', 'taiga', 'savanna'][i])
    }
    await c(`/summon sheep ${X + PX - 2.6} ${F + 1} ${Z + PZ + 1.9} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,CustomName:"jeb_",Tags:["party_sheep"],Rotation:[30f,0f]}`)
    await c(`/summon sheep ${X + PX - 2.0} ${F + 1} ${Z + PZ - 2.4} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Color:6b,Tags:["party_sheep"],Rotation:[-60f,0f]}`)
    await c(`/summon sheep ${X + PX + 2.6} ${F + 1} ${Z + PZ - 1.2} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Color:3b,Tags:["party_sheep"],Rotation:[120f,0f]}`)

    await c('/tag @e[tag=nitwit] add warm'); await c('/tag @e[tag=golem] add warm'); await c('/tag @e[tag=mom] add warm')
    await c('/clear @s')                                // nothing in hand, ever (he has no arms)
    // mineflayer ignores the biome-update packet: go out of range and back so the chunks come again with plains
    await resendChunks(ctx, X, Z)
    await ctx.tpCheck(X, F + 1, Z + 38, 180, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const S = storyLines(STORY)
    const P = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
    const say = (s) => bot.chat(s)                  // ops aren't chat-limited: per-tick commands
    // camera: yaw/pitch toward a point, plus a slow sway so no shot is ever still
    let base = { yaw: 0, pitch: 0 }, sway = 1
    const aim = (p) => {
      const eye = bot.entity.position.offset(0, 1.62, 0), d = p.minus(eye)
      return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
    }
    const look = (k, dyaw = 0, dpitch = 0) => bot.look(base.yaw + dyaw + Math.sin(k / 19) * 0.09 * sway, base.pitch + dpitch + Math.sin(k / 27) * 0.035 * sway, true)
    // a cut: teleport, wait for it to land, aim
    const cut = async (dx, dz, target, dy = 1) => {
      const x = X + dx, z = Z + dz
      const d = target.minus(new ctx.Vec3(x, F + dy + 1.62, z))   // arrive already aimed (no 2-frame snap after the cut)
      base = { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
      ctx.mark('cut')   // the renderer snaps to the new spot at any distance (short cuts glided; worker 8)
      say(`/tp @s ${x.toFixed(3)} ${(F + dy).toFixed(3)} ${z.toFixed(3)} ${(180 - base.yaw * 180 / Math.PI).toFixed(2)} ${(-base.pitch * 180 / Math.PI).toFixed(2)}`)
      for (let i = 0; i < 10; i++) { await bot.waitForTicks(1); if (Math.abs(bot.entity.position.x - x) < 0.05 && Math.abs(bot.entity.position.z - z) < 0.05) break }
      await bot.look(base.yaw, base.pitch, true)
    }
    // move a tagged group one step away from the bot (they turn to run, then keep running)
    const flee = (tag, speed) => say(`/execute as @e[tag=${tag}] at @s facing entity ${bot.username} feet rotated ~180 0 positioned ^ ^ ^${speed} run tp @s ~ ${F + 1} ~ facing ^ ^ ^5`)
    const hiss = (vol) => ctx.sound('entity.creeper.primed', vol, 1)
    // run one line: mark it, then call scene(k) every tick for its spoken length + gap
    const line = async (id, scene, extra = 0) => {
      const L = S.line(id)
      const ticks = Math.round((L.dur + S.gap + extra) * 20)
      ctx.mark('line', { id })
      for (let k = 0; k < ticks; k++) {
        say(`/execute as @e[tag=warm] at @s run tp @s ~${k % 2 ? 0.002 : -0.002} ~ ~`)   // idle actors stay awake: a long-idle mob's first move reaches the client ~1 s late
        await scene(k, L.at); await bot.waitForTicks(1)
      }
    }

    // L01: the crowd up the street runs from me
    await cut(0.5, 38.5, P(0.5, 1.4, 22))
    for (let k = 0; k < 10; k++) { say(`/execute as @e[tag=crowd] at @s run tp @s ~ ~ ~${(-0.06 - k * 0.018).toFixed(3)} 180 0`); look(k); await bot.waitForTicks(1) }   // entity moves reach the client a few ticks late
    await line('L01', async (k) => {
      say(`/execute as @e[tag=crowd] at @s run tp @s ~ ~ ~-0.25 180 0`)
      bot.setControlState('forward', k > 8 && k < 40); look(k)
    })
    bot.setControlState('forward', false)
    // L02: good morning... the door slams
    await cut(-1.5, 24.5, P(4.5, 1.9, 24.5))
    ctx.mark('face_on', { near: [X + 5.5, Z + 24.5, 1.5], head: true })
    await line('L02', async (k, at) => {
      if (k >= at(2) - 3 && k < at(2) + 4) say(`/tp @e[tag=door,limit=1] ${(X + 4.5 + (k - at(2) + 3) * 0.16).toFixed(3)} ${F + 1} ${Z + 24.5} 90 0`)   // steps back in
      if (k === at(2) + 4) {
        say(`/setblock ${X + 4} ${F + 2} ${Z + 24} oak_door[half=upper,facing=east,open=false]`)
        say(`/setblock ${X + 4} ${F + 1} ${Z + 24} oak_door[half=lower,facing=east,open=false]`)
        ctx.sound('block.wooden_door.close', 1, 0.8)
        ctx.mark('face_off')
      }
      look(k, k > at(2) + 4 ? Math.sin((k - at(2)) / 2.2) * 0.07 * Math.max(0, 1 - (k - at(2) - 4) / 30) : 0)   // a little rejected head-shake after the slam
    })
    // L03: the farmer, then he jumps the far fence and sprints
    await cut(-24.6, -2.2, P(-25.5, 1.3, -5.4))
    ctx.mark('face_on', { near: [X - 25.5, Z - 5.4, 1.5], head: true })
    let fx = -25.5, fz = -5.4
    await line('L03', async (k, at) => {
      const go = at(4) - 2
      if (k === go) ctx.mark('face_off')
      if (k >= go) {                          // turn, hop the north fence (z -7), sprint off
        fz -= k < go + 2 ? 0.12 : 0.34
        const hop = Math.max(0, 1 - Math.abs(fz + 6.5) / 1.3)
        say(`/tp @e[tag=farmer,limit=1] ${(X + fx).toFixed(3)} ${(F + 1 + hop * 1.4).toFixed(3)} ${(Z + fz).toFixed(3)} 180 0`)
      }
      base = aim(P(fx, 1.3 + Math.max(0, -6.5 - fz) * 0.02, Math.max(fz, -12))); look(k)
    })
    // L04: the fisherman rows away for good
    // hold the boat still on the water every tick until he's in
    const holdBoat = () => say(`/tp @e[tag=boat,limit=1] ${(X + 23.9).toFixed(3)} ${F + 0.52} ${Z - 6.6} -90 0`)
    holdBoat()
    await cut(19.2, -3.4, P(22.95, 0.9, -5.55))
    let bx = 23.9, bz = -6.6, vx = 22.0, vz = -4.5, vy = 1
    await line('L04', async (k, at) => {
      const jump = at(1) - 2, go = jump + 10
      if (k < go) holdBoat()
      if (k >= jump && k < go) {            // hop off the dock into the boat
        const u = (k - jump + 1) / 10
        vx = 22.0 + (bx - 22.0) * u; vz = -4.5 + (bz + 4.5) * u; vy = 1 + Math.sin(u * Math.PI) * 1.1 - u * 0.38
        say(`/tp @e[tag=fisher,limit=1] ${(X + vx).toFixed(3)} ${(F + vy).toFixed(3)} ${(Z + vz).toFixed(3)} -90 0`)
      }
      if (k >= go) {                        // and off he rows, for good
        bx += Math.min(0.22, (k - go + 1) * 0.03); vx = bx; vz = bz; vy = 0.62
        say(`/tp @e[tag=boat,limit=1] ${(X + bx).toFixed(3)} ${F + 0.52} ${Z + bz} -90 0`)
        say(`/tp @e[tag=fisher,limit=1] ${(X + vx).toFixed(3)} ${F + 0.62} ${Z + bz} -90 0`)
      }
      base = aim(P((vx + bx) / 2, 0.9, (vz + bz) / 2)); look(k)
    })
    // the boat and fisherman leave the set (a NoGravity boat floats up: it showed in the sky behind the golem)
    say(`/tp @e[tag=boat] ${X} ${F - 30} ${Z}`); say(`/tp @e[tag=fisher] ${X} ${F - 30} ${Z}`)
    // L05: the sheep pack up and leave, single file out of the pen
    await cut(-1.5, -23.7, P(-1.5, 0.5, -28))
    await line('L05', async (k, at) => {
      if (k >= at(2) - 6) say(`/execute as @e[tag=chick] at @s run tp @s ~${((Math.random() - 0.5) * 0.02).toFixed(3)} ~ ~-0.22 180 0`)
      look(k)
    })
    // L06: only the nitwit stays, walking in a little circle (mom comes up to her spot, out of shot)
    say(`/tp @e[tag=mom,limit=1] ${X + 19.5} ${F + 1} ${Z + 10.5} 180 0`)
    await cut(-14.5, 25.5, P(-14.5, 1.6, 20.5))
    await line('L06', async (k, at) => {
      const a = k < at(2) ? k / 6 : at(2) / 6 - (k - at(2)) / 5   // a stumble: he turns round on 'But I don't'
      say(`/tp @e[tag=nitwit,limit=1] ${(X - 14.5 + Math.sin(a) * 1.4).toFixed(3)} ${F + 1} ${(Z + 20.5 + Math.cos(a) * 1.4 - 1.4).toFixed(3)} ${((-a * 180 / Math.PI) + 90 + (k < at(2) ? 0 : 180)).toFixed(1)} 0`)
      look(k)
    })
    // L07: mom. She's the only one who hugs me (walk right up to her)
    await cut(19.5, 7.7, P(19.5, 1.35, 10.5))
    ctx.mark('face_on', { near: [X + 19.5, Z + 10.5, 1.5] })
    await line('L07', async (k, at) => {
      bot.setControlState('forward', k >= at(3) && bot.entity.position.z < Z + 9.0)
      base = aim(P(19.5, 1.35, 10.5)); look(k)
    })
    bot.setControlState('forward', false)
    ctx.mark('face_off')
    // L08: and the iron golem... right behind me
    ctx.mark('face_on', { near: [X + 19.5, Z + 5.6, 2.2], head: true })
    const from = { ...base }
    let gz = 4.6
    await line('L08', async (k, at) => {
      if (k >= at(2) && gz < 7.0) { gz += 0.07; say(`/tp @e[tag=golem,limit=1] ${X + 19.5} ${F + 1} ${(Z + gz).toFixed(3)} 0 0`) }
      const turn = at(1) - 6
      if (k >= turn) {
        const u = Math.min(1, (k - turn) / 9), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
        const to = aim(P(19.5, 2.6, Math.min(gz, 5.4)))
        let dy = to.yaw - from.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy <= -Math.PI) dy += 2 * Math.PI
        base = { yaw: from.yaw + dy * e, pitch: from.pitch + (to.pitch - from.pitch) * e }
      }
      look(k)
    })
    ctx.mark('face_off')
    // L09: back on the street... the hissing
    await cut(0.5, 36.5, P(0.5, 1.6, 16))
    await line('L09', async (k, at) => {
      bot.setControlState('forward', k < at(4))
      if (k === at(5)) hiss(0.35)
      look(k, at(5) <= k ? Math.sin(k * 1.7) * 0.004 : 0)
    })
    bot.setControlState('forward', false)
    // L10-L14: the party
    await cut(20.5, -12.5, P(20.5, 1.2, -27))
    // L10: creep up sneaking (walking got there 1.4 s early and stood still); on "Nobody INVITED me" the
    // whole ring turns its back on me (L12's stare turns them round again)
    await line('L10', async (k, at) => {
      bot.setControlState('sneak', true); bot.setControlState('forward', bot.entity.position.z > Z - 17.0)
      if (k >= at(3) && k < at(3) + 3) say(`/execute as @e[tag=party] at @s facing entity ${bot.username} feet rotated ~180 0 positioned ^ ^ ^0.02 run tp @s ~ ${F + 1} ~ facing ^ ^ ^5`)
      look(k)
    })
    bot.setControlState('sneak', false)
    await line('L11', async (k) => { bot.setControlState('sprint', true); bot.setControlState('forward', bot.entity.position.z > Z - 19.6); look(k) })   // stop ~5 blocks out: a camera inside the ring froze their moves
    bot.setControlState('sprint', false); bot.setControlState('forward', false)
    ctx.mark('face_on', { near: [X + 20.5, Z - 26.5, 5] })
    await line('L12', async (k) => { say(`/execute as @e[tag=party] at @s facing entity ${bot.username} feet positioned ^ ^ ^0.006 run tp @s ~ ${F + 1} ~ facing entity ${bot.username} eyes`); look(k, Math.sin(k / 9) * 0.07, Math.min(1, k / 10) * 0.06) })
    bot.setControlState('forward', false)
    let fled = false
    await line('L13', async (k, at) => {
      if (k === at(4)) { hiss(1); ctx.mark('face_off'); fled = true }
      if (k === at(1)) bot.setControlState('jump', true)
      if (k === at(1) + 2) bot.setControlState('jump', false)
      if (k >= at(1) + 2 && k < at(1) + 6) flee('party', 0.15)
      if (fled) flee('party', 0.32)
      sway = 1.5
      look(k, fled ? Math.sin(k * 0.8) * 0.03 : 0, fled ? Math.sin(k * 0.6 + 1) * 0.02 : 0)
    })
    await line('L14', async (k) => {
      flee('party', 0.32)
      if (k === 20) hiss(1)
      // the creeper's swell from the inside: white flashes, faster and faster, into the blast (edit.py draws `flash`)
      const T = Math.round((S.line('L14').dur + S.gap - 0.05) * 20)
      if ([T - 16, T - 9, T - 4, T - 1].includes(k)) ctx.mark('flash')
      look(k, Math.sin(k * 0.8) * 0.045, Math.sin(k * 0.6 + 1) * 0.03)
    }, -0.05)
    // BOOM
    const boomAt = bot.entity.position.clone()
    // he goes off like a creeper: a creeper exploding exactly where he stands (Fuse 0, inside the camera, so it's
    // never seen). The death screen reads "HelloBuh was blown up by Creeper", the twist in the game's own words.
    say(`/execute at @s rotated as @s positioned ^ ^ ^-0.9 run summon creeper ~ ~ ~ {Fuse:0s,ignited:1b,NoAI:1b,Silent:1b}`)   // just behind the camera: inside it, its white swell drew as a flat white shape
    ctx.mark('boom'); ctx.mark('flash')   // the blast itself is behind the camera: one bright frame for it
    for (let i = 0; i < 20 && !ctx.died; i++) await bot.waitForTicks(1)
    // a dead player stops getting mob updates after ~1 s (the villagers froze): the crater smokes instead
    const fwd = { x: -Math.sin(bot.entity.yaw), z: -Math.cos(bot.entity.yaw) }
    let sk = 0
    const eyeY = boomAt.y + 1.62   // the dead camera sits in the crater: smoke at its eye level, in front of it
    const still = async () => {   // a few puffs every 3 ticks: 6 a tick filled the whole view with smoke
      if (sk++ % 3) return
      const d = 3 + Math.random() * 3, side = (Math.random() - 0.5) * 5
      ctx.particles('smoke', new ctx.Vec3(boomAt.x + fwd.x * d - fwd.z * side, eyeY - 1.4 + Math.random() * 1.2, boomAt.z + fwd.z * d + fwd.x * side), { count: 2 })
    }
    for (let i = 0; i < 4; i++) { await still(); await bot.waitForTicks(1) }
    await line('L15', still, -0.15)
    await line('L16', still, -0.15)
    await line('L17', still, -0.1)
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return ctx.died
  }
}
