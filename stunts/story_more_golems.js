// Story Short "who keeps building iron golems 💀" (stories/more_golems, premise 8 in docs/stories.md).
// Every morning there's one more iron golem in the narrator's village and nobody builds them. The
// villagers won't look at him, they bar their doors at sunset, he wakes up sore, one golem always
// waits outside his door, and something groans outside the doors all night (he never hears it).
// He stays up to catch the builder. Night comes and he feels great. He says HEY to the farmer and
// it comes out as a zombie groan; the farmer screams and golem number twenty pops in beside him
// (villagers spawn a golem when they panic). Then all twenty close in on him: "HelloBuh was slain
// by Iron Golem". At night he's a zombie and he never remembers. The twist is never said: the game
// shows it (the groan, the spawn, the death message). The death loops into "Every morning...".
//
// One scene per line (docs/stories.md): each lasts its spoken length + gap, actions land on caption
// chunks (at(k)), the GOLEMS meter is marked as `meter` { value } for edit.py.
const path = require('path')
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'more_golems')
const DOORS = [[-4, 8, 'west'], [-4, 18, 'west'], [-4, 28, 'west'], [4, 8, 'east'], [4, 18, 'east'], [4, 28, 'east']]   // villager i lives behind door i
const ROWS = [4.5, 11, 15, 21, 25, 32, 37]                 // the golems lining the street, both sides
const STAND = { x: 0.5, z: 47.2 }                          // where I stand for the ending
// the ending: three ranks close in on STAND from the north half, each golem along its own angle
const RANKS = { ga: { rf: 2.7, r0: 8.7, angles: [-80, -40, 0, 40, 80] }, gb: { rf: 4.4, r0: 12.4, angles: [-90, -60, -30, 0, 30, 60, 90] }, gc: { rf: 6.1, r0: 16.1, angles: [-75, -50, -25, 0, 25, 50, 75] } }

module.exports = {
  name: 'story_more_golems',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'who keeps building iron golems 💀',
  edit: { caption: 'who keeps building iron golems 💀', red: 'golems', story: 'stories/more_golems', startAt: 'line:0', endAfter: 'death:1.3', zoom: [['death:0.1', 'death:2', 1.05], ['death:0.5', 'death:2', 1.06], ['death:0.9', 'death:2', 1.06]], punch: [['pop', 0, 0.08]], deathScreen: true },
  expectDeath: true,
  hideHand: true,          // no Steve arm: who "I" am is the twist
  time: 1000,              // morning
  brightness: 1,           // Options > Brightness: Bright, so the night scenes read
  botTimeout: 480,

  async setup (ctx) {
    const { bot } = ctx
    // The site: flat for 96 blocks around. The clearing only cuts 24 blocks up, so a hill beside the set stood as a
    // sliced grey wall with trees hanging over it in six scenes (Minecraft audit). Map the ground height around a
    // few hubs and take the flattest dry spot.
    const start = bot.entity.position.floored()
    let g = null, best = Infinity
    for (const [hx, hz] of [[0, 0], [288, 0], [0, 288], [-288, 0], [0, -288], [288, 288], [-288, -288]]) {
      if (hx || hz) { await ctx.cmd(`/tp @s ${start.x + hx} 200 ${start.z + hz}`); await bot.waitForTicks(40); try { await bot.waitForChunksToLoad() } catch (e) {} await bot.waitForTicks(20) }
      const cx0 = start.x + hx, cz0 = start.z + hz, H = new Map()
      for (let dx = -176; dx <= 176; dx += 8) for (let dz = -176; dz <= 176; dz += 8) { const b = ctx.surface(cx0 + dx, cz0 + dz); if (b) H.set(`${dx},${dz}`, b) }
      for (let dx = -80; dx <= 80; dx += 16) for (let dz = -80; dz <= 80; dz += 16) {
        const c = H.get(`${dx},${dz}`)
        if (!c || c.name !== 'grass_block' || c.position.y < 63) continue
        let up = 0, down = 0, wet = 0, miss = 0
        for (let ex = -96; ex <= 96; ex += 8) for (let ez = -96; ez <= 96; ez += 8) {
          const b = H.get(`${dx + ex},${dz + ez}`)
          if (!b) { miss++; continue }
          if (/water|lava|ice/.test(b.name)) wet++
          up = Math.max(up, b.position.y - c.position.y); down = Math.max(down, c.position.y - b.position.y)
        }
        const score = up + down * 0.5 + wet * 0.5 + miss * 2
        if (score < best) { best = score; g = c.position.clone(); g.info = { up, down, wet, miss } }
      }
      ctx.log('site search hub', hx, hz, 'best so far', best.toFixed(1), g && JSON.stringify(g.info), g && [g.x, g.y, g.z])
      if (best <= 9) break
    }
    if (!g) throw new Error('no dry land')
    await ctx.cmd(`/tp @s ${g.x} 200 ${g.z}`); await bot.waitForTicks(40); try { await bot.waitForChunksToLoad() } catch (e) {}
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const c = (s) => ctx.cmd(s)
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await ctx.defaultRules()
    await c('/gamerule mob_griefing false')
    await c('/gamerule log_admin_commands false')   // per-tick `execute as` tps flood the bot with op broadcasts
    await c('/gamerule keep_inventory true')
    await c('/difficulty normal')                   // mob_attack damage scales to 0 on peaceful
    await clearSet(ctx, A, 64, 24)
    // a hill higher than the clearing's top leaves gravel and sand hanging over the set, and it falls later: a mound
    // landed in the street in one run and in front of the first shot in the next. Take it out of the air above
    // (to +72), wait for what is already falling, and sweep the bottom layers again
    for (let y = 25; y <= 72; y++) for (const b of ['gravel', 'sand']) bot.chat(`/fill ${A(-64, y, -64)} ${A(64, y, 64)} air replace ${b}`)
    for (let pass = 0; pass < 2; pass++) { await ctx.sleep(3000); for (let y = 1; y <= 4; y++) await c(`/fill ${A(-64, y, -64)} ${A(64, y, 64)} air`) }
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 24)

    // the street: a path north-south, three houses a side, lamp posts between them
    await c(`/fill ${A(-1, 0, 3)} ${A(1, 0, 44)} dirt_path`)
    for (const z0 of [6, 16, 26]) { await house(ctx, A, -9, z0, -4, z0 + 2, 'west'); await house(ctx, A, 4, z0, 4, z0 + 2, 'east') }
    const lamp = async (dx, dz, h = 2) => { await c(`/fill ${A(dx, 1, dz)} ${A(dx, h, dz)} oak_fence`); await c(`/setblock ${A(dx, h + 1, dz)} lantern`) }
    for (const dz of [23]) { await lamp(-3, dz); await lamp(3, dz) }   // one pair: with three the street at night was lit like day
    for (const [dx, dz, b] of [[-2, 9, 'poppy'], [2, 19, 'dandelion'], [-2, 29, 'cornflower'], [2, 39, 'oxeye_daisy'], [-3, 40, 'poppy'], [3, 2, 'poppy']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // the plaza north of the street: the blacksmith's stall and the well
    await c(`/fill ${A(-9, 0, -13)} ${A(11, 0, 2)} cobblestone`)
    await c(`/setblock ${A(-6, 1, -11)} smithing_table`); await c(`/setblock ${A(-5, 1, -11)} anvil`); await c(`/setblock ${A(-4, 1, -11)} grindstone`)
    for (const dx of [-7, -3]) await c(`/fill ${A(dx, 1, -11)} ${A(dx, 3, -11)} oak_fence`)
    await c(`/fill ${A(-7, 4, -12)} ${A(-3, 4, -10)} spruce_slab`)
    await c(`/setblock ${A(-7, 3, -10)} lantern[hanging=true]`)
    await c(`/fill ${A(4, 1, -10)} ${A(6, 1, -8)} cobblestone`); await c(`/setblock ${A(5, 1, -9)} water`)
    for (const [dx, dz] of [[4, -10], [6, -10], [4, -8], [6, -8]]) await c(`/fill ${A(dx, 2, dz)} ${A(dx, 3, dz)} oak_fence`)
    await c(`/fill ${A(4, 4, -10)} ${A(6, 4, -8)} spruce_slab`)
    await lamp(9, -9); await lamp(-9, -4)
    // my house, east of the plaza: the door on the south side
    await house(ctx, A, 20, -30, 22, -25, 'north')
    for (const [dx, dz, b] of [[20, -24, 'poppy'], [25, -24, 'rose_bush'], [19, -26, 'peony']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)
    // the farm south of the street: wheat, a water row, hay and lanterns (the night scene's light)
    await c(`/fill ${A(-5, 0, 48)} ${A(6, 0, 56)} farmland[moisture=7]`)
    await c(`/fill ${A(-5, 1, 48)} ${A(6, 1, 56)} wheat[age=7]`)
    await c(`/fill ${A(-5, 0, 53)} ${A(6, 0, 53)} water`); await c(`/fill ${A(-5, 1, 53)} ${A(6, 1, 53)} air`)
    for (const [dx, dz] of [[-2, 49], [4, 52], [-3, 55]]) { await c(`/setblock ${A(dx, 0, dz)} dirt`); await c(`/setblock ${A(dx, 1, dz)} hay_block`); await c(`/setblock ${A(dx, 2, dz)} lantern`) }
    await c(`/setblock ${A(-4, 0, 50)} dirt`); await c(`/setblock ${A(-4, 1, 50)} composter`)
    await lamp(-5, 45, 3); await lamp(6, 45, 3)

    // the cast, all NoAI (they move only when a scene moves them)
    const vil = (x, z, yaw, prof, tags) => c(`/summon villager ${(X + x).toFixed(2)} ${F + 1} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:[${tags.map(t => `"${t}"`).join(',')}],Rotation:[${yaw}f,0f],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1}`)
    const profs = ['librarian', 'cleric', 'shepherd', 'farmer', 'fletcher', 'butcher']
    for (let i = 0; i < 6; i++) await vil(-0.4 + (i % 3) * 0.9, 20 + i * 1.2, 180, profs[i], ['vil', `v${i}`])
    await vil(-4.5, -9.5, 0, 'armorer', ['vil', 'smith'])
    // nineteen golems: fourteen lining the street, two at its south end, two on the plaza, one at my door
    const G = []
    for (const z of ROWS) { G.push([-2.1, z, -90]); G.push([3.1, z, 90]) }
    G.push([-4.5, 41.5, -90], [5.5, 41.5, 90], [-1.6, -8.8, 0], [9.5, -4.5, 0], [22.5, -22.2, 180])
    const rankOf = (i) => i < 5 ? 'ga' : i < 12 ? 'gb' : 'gc'
    for (let i = 0; i < G.length; i++) await c(`/summon iron_golem ${(X + G[i][0]).toFixed(2)} ${F + 1} ${(Z + G[i][1]).toFixed(2)} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,PlayerCreated:0b,Tags:["g","g${i}","${rankOf(i)}"${i === 18 ? ',"guard"' : ''}],Rotation:[${G[i][2]}f,0f]}`)

    // anything that still fell onto the set (the set itself has no gravel or sand in it)
    await c('/kill @e[type=falling_block]')
    for (let y = 1; y <= 8; y++) for (const b of ['gravel', 'sand']) bot.chat(`/fill ${A(-64, y, -64)} ${A(64, y, 64)} air replace ${b}`)
    await ctx.sleep(1500)
    await c('/clear @s')
    await resendChunks(ctx, X, Z)     // mineflayer ignores the biome-update packet: the chunks come again with plains
    await ctx.tpCheck(X + 0.5, F + 1, Z + 43.5, 180, 0)
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
    const { P, say, look, cut } = K
    const me = bot.username
    const go = (on) => bot.setControlState('forward', on)
    const jit = () => (ctx.tick % 2 ? 0.002 : -0.002)   // a rotation only reaches the client with a move
    // golems within R blocks turn to watch me
    const watch = (R) => say(`/execute at ${me} as @e[tag=g,distance=..${R}] at @s run tp @s ~${jit()} ~ ~ facing entity ${me} eyes`)
    // every villager stays awake: a long-idle mob's first move reaches the client ~1 s late
    const line = (id, scene, extra = 0) => K.line(id, async (k, at) => { say(`/execute as @e[tag=vil] at @s run tp @s ~${jit()} ~ ~`); await scene(k, at) }, extra)
    // back: after a cut, date the mark one tick back so the light changes on the cut frame (it came 2 frames late)
    const setTime = (n, back = 0) => { say(`/time set ${n}`); ctx.dayTime = n; ctx.mark('time', { time: n, t: (ctx.tick - back) * 50 }) }
    const mcYaw = (vx, vz) => -Math.atan2(vx, vz) * 180 / Math.PI
    // the six villagers of the street
    const V = [0, 1, 2, 3, 4, 5].map(i => ({ x: -0.4 + (i % 3) * 0.9, z: 20 + i * 1.2, yaw: 180 }))
    const setV = (i, yaw, y = 1) => say(`/tp @e[tag=v${i},limit=1] ${(X + V[i].x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + V[i].z).toFixed(3)} ${yaw.toFixed(1)} 0`)
    const HOME = V.map(v => ({ x: v.x, z: v.z }))
    let drift = 0
    const mill = () => {   // they wander a little, drifting up the street, backs to me
      drift -= 0.025
      for (let i = 0; i < 6; i++) {
        const t = ctx.tick, x = HOME[i].x + 0.5 * Math.sin(t / 14 + i * 1.7), z = HOME[i].z + drift + 0.4 * Math.cos(t / 17 + i * 2.3)
        const yaw = mcYaw(x - V[i].x, z - V[i].z)
        V[i].x = x; V[i].z = z; setV(i, yaw)
      }
    }
    const door = (i, open) => {
      const [dx, dz, f] = DOORS[i]
      say(`/setblock ${X + dx} ${F + 2} ${Z + dz} oak_door[half=upper,facing=${f},open=${open}]`)
      say(`/setblock ${X + dx} ${F + 1} ${Z + dz} oak_door[half=lower,facing=${f},open=${open}]`)
    }
    const groan = (vol) => ctx.sound('entity.zombie.ambient', vol, 1)
    ctx.mark('meter', { value: 19 })

    // L01: the street in the morning, golems down both sides; they turn to watch me walk in
    await cut(0.5, 43.5, P(0.5, 2.0, 30))
    for (let k = 0; k < 8; k++) { mill(); look(k); await bot.waitForTicks(1) }
    await line('L01', async (k) => { mill(); watch(9); go(k > 4); look(k) })
    go(false)
    // L02: from a roof: nineteen golems, six villagers... and every golem looks up at me
    await cut(-2.4, 15.6, P(1.5, 1.5, 31), 5)   // the roof's street-side corner (from the middle of the roof the roof filled the frame)
    let from = null
    await line('L02', async (k, at) => {
      if (k < at(2)) mill()
      else for (let i = 0; i < 6; i++) { V[i].z -= 0.13; setV(i, 180) }   // and they hurry off
      if (k >= at(2) - 2) watch(60)
      if (k >= at(1) - 6) { from = from || { ...K.base }; K.turnTo(from, P(0.5, 1.2, 21.5 + drift), (k - at(1) + 6) / 12) }
      look(k)
    })
    // L03: the blacksmith turns his back and shuffles off behind a golem
    await cut(-4.5, -4.2, P(-4.5, 1.7, -9.5))
    // behind the camera: the six line up near their doors for the sunset run
    for (let i = 0; i < 6; i++) { V[i].x = 0.5 + (i < 3 ? -0.9 : 0.9); V[i].z = DOORS[i][1] + 0.5 + (i % 2 ? 2.2 : -2.0); setV(i, i < 3 ? 90 : -90) }
    let sx = -4.5; const sz = -9.5
    await line('L03', async (k, at) => {
      if (k < 2) say(`/execute as @e[tag=g] at @s run tp @s ~ ~ ~${k ? -0.003 : 0.003} ~ 0`)   // heads level again: the street's golems were still looking up at the roof when L04 opened
      watch(14)
      go(k > 2 && bot.entity.position.z > Z - 5.6)
      if (k >= at(3) && k < at(4)) say(`/tp @e[tag=smith,limit=1] ${(X + sx + jit()).toFixed(3)} ${F + 1} ${Z + sz} 180 0`)
      if (k >= at(4)) { sx = Math.min(-0.3, sx + 0.2); say(`/tp @e[tag=smith,limit=1] ${(X + sx).toFixed(3)} ${F + 1} ${(Z + sz - Math.min(0.6, (sx + 4.5) * 0.15)).toFixed(3)} ${sx < -0.3 ? -90 : 180} 0`) }
      K.base = K.aim(P(sx, 1.7, sz)); look(k)
    })
    go(false)
    // L04: sunset. Everybody runs inside and the doors slam, far ones first
    await cut(0.5, 34.5, P(0.5, 2.2, 22)); setTime(12750, 1)   // close enough that the last pair runs past the camera (from the street's end they were specks)
    const inside = [false, false, false, false, false, false]
    let from4 = null
    await line('L04', async (k, at) => {
      watch(14)
      go(k < 14)
      if (k >= at(3)) { from4 = from4 || { ...K.base }; K.turnTo(from4, P(4.5, 1.9, 28.5), (k - at(3)) / 16) }   // to the last door as it shuts (L05 is that door)
      for (let i = 0; i < 6; i++) {
        if (inside[i] || k < at(1) - 4 + (i % 3) * 7) continue   // far doors first; the nearest pair goes last, on BARS the door
        const side = i < 3 ? -1 : 1, dz = DOORS[i][1] + 0.5
        const v = V[i], sp = 0.27
        let nx = v.x, nz = v.z
        if (Math.abs(v.z - dz) > 0.05) { nz = v.z + Math.max(-sp, Math.min(sp, dz - v.z)); nx = v.x + side * 0.08 } else nx = v.x + side * sp
        const yaw = mcYaw(nx - v.x, nz - v.z)
        v.x = nx; v.z = nz; setV(i, yaw)
        if (Math.abs(v.x - 0.5) > 5.2) { inside[i] = true; door(i, false); ctx.sound('block.wooden_door.close', 0.5 + 0.17 * (i % 3), 0.8 + 0.07 * i) }
      }
      look(k)
    })
    go(false)
    for (let i = 0; i < 6; i++) if (!inside[i]) { door(i, false); V[i].x = 0.5 + (i < 3 ? -1 : 1) * 6.5; V[i].z = DOORS[i][1] + 0.5; setV(i, 0) }
    // L05: one door opens a crack, the butcher peeks, sees me, slams it
    V[5].x = 7.0; V[5].z = 28.5; setV(5, 90)
    await cut(0.5, 28.5, P(4.5, 1.9, 28.5))
    await line('L05', async (k, at) => {
      const shut = at(2) + 3
      if (k === 2) { door(5, true); ctx.sound('block.wooden_door.open', 0.9, 1) }
      if (k > 2 && k < shut - 5) { V[5].x = Math.max(5.75, V[5].x - 0.2); setV(5, 90) }
      if (k >= shut - 5 && k < shut) { V[5].x = Math.min(7.0, V[5].x + 0.25); setV(5, 90) }
      if (k === shut) { door(5, false); ctx.sound('block.wooden_door.close', 1, 0.8) }
      look(k, k > shut ? Math.sin((k - shut) / 2.2) * 0.06 * Math.max(0, 1 - (k - shut) / 24) : 0)
    })
    // L06: morning. I wake up staring at the ceiling, sore... and something huge is at my door
    await cut(22.5, -28.5, P(22.56, 4.2, -28.3)); setTime(1000, 1)
    // behind the walls: three of them to the well, the farmer to his field
    const GOS = [[4.3, -3.2], [6.7, -3.4], [5.5, -5.0]]
    for (let i = 0; i < 3; i++) { V[i].x = GOS[i][0]; V[i].z = GOS[i][1]; setV(i, mcYaw(5.5 - V[i].x, -3.9 - V[i].z)); say(`/tag @e[tag=v${i}] add gos`) }
    V[3].x = 0.5; V[3].z = 50.5; setV(3, 0)
    from = null
    await line('L06', async (k, at) => {
      watch(9)
      // eyes open on the ceiling, then down to the door: one slow move the whole way (a held ceiling was a second of nothing)
      const t0 = 3
      if (k >= t0) { from = from || { ...K.base }; K.turnTo(from, P(22.5, 2.3, -22.2), (k - t0) / (at(3) + 2 - t0)) }
      go(k >= at(3) - 2 && bot.entity.position.z < Z - 26.8)
      look(k)
    })
    go(false)
    // L07: he waits outside my door. I back off; he comes after me
    await cut(20.6, -23.5, P(22.5, 3.2, -22.2))   // just out of the door, so he only turns his head a little (from the west side his head snapped 90 degrees)
    let gx = 22.5
    await line('L07', async (k, at) => {
      const follow = k >= at(2)
      go(k > 2 && k < at(2) - 3 && bot.entity.position.x < X + 21.0)   // a step up to him first (the shot held still for half a second)
      bot.setControlState('back', follow && bot.entity.position.x > X + 16.2)
      if (follow) gx -= 0.085
      say(`/tp @e[tag=guard,limit=1] ${(X + gx + jit()).toFixed(3)} ${F + 1} ${Z - 22.2} facing entity ${me} eyes`)
      K.base = K.aim(P(gx, 3.2, -22.2)); look(k)
    })
    bot.setControlState('back', false)
    // L08: the gossip at the well. Something groans all night; they all look at me; they scatter
    await cut(5.5, 4.8, P(5.5, 1.6, -3.9))
    await line('L08', async (k, at) => {
      watch(14)
      go(bot.entity.position.z > Z + 0.9)
      if (k === at(2)) groan(0.3)
      if (k < at(5)) for (let i = 0; i < 3; i++) say(`/tp @e[tag=v${i},limit=1] ${(X + V[i].x + jit()).toFixed(3)} ${F + 1} ${(Z + V[i].z).toFixed(3)} ${(mcYaw(5.5 - V[i].x, -3.9 - V[i].z) + 14 * Math.sin(k / 4 + i * 2)).toFixed(1)} ${(8 + 8 * Math.sin(k / 3 + i)).toFixed(1)}`)
      else if (k < at(8) - 2) say(`/execute as @e[tag=gos] at @s run tp @s ~${jit()} ~ ~ facing entity ${me} eyes`)
      else K.flee('gos', 0.3)
      look(k)
    })
    go(false)
    // L09: I stay up. The sun goes down over the street (the sky runs to night in steps)
    await cut(0.5, 2.0, P(0.5, 5.2, 30)); setTime(11800, 1)
    let T = 11800
    const dusk = (k) => { if (T < 14000 && k % 3 === 2) { T = Math.min(14000, T + 240); setTime(T) } }
    await line('L09', async (k, at) => { watch(10); dusk(k); go(k > 2 && k < 26); look(k, 0, k >= at(3) ? -0.1 * Math.min(1, (k - at(3)) / 10) : 0) })
    // L10: night. I feel great: a sprint down the street
    await line('L10', async (k, at) => {
      watch(10); dusk(k)
      bot.setControlState('sprint', true); go(true)
      bot.setControlState('jump', k >= at(2) && k < at(2) + 3)
      look(k, 0, -0.1)
    })
    if (T < 14000) { T = 14000; setTime(T) }
    bot.setControlState('sprint', false); bot.setControlState('jump', false); go(false)
    // the golems leave the street for the dark behind the last shot: three ranks north of where I'll stand
    for (const [tag, R] of Object.entries(RANKS)) {
      const base = tag === 'ga' ? 0 : tag === 'gb' ? 5 : 12
      R.angles.forEach((deg, j) => {
        const a = deg * Math.PI / 180, x = STAND.x + R.r0 * Math.sin(a), z = STAND.z - R.r0 * Math.cos(a)
        say(`/tp @e[tag=g${base + j},limit=1] ${(X + x).toFixed(3)} ${F + 1} ${(Z + z).toFixed(3)} ${mcYaw(STAND.x - x, STAND.z - z).toFixed(1)} 0`)
      })
    }
    const idle = () => say(`/execute as @e[tag=g] at @s run tp @s ~${jit()} ~ ~`)
    // L11: the farmer, still out in his wheat. I say HEY (a zombie's groan). He turns round
    await cut(0.5, 42.0, P(0.5, 2.3, 50.5))   // a longer walk-in: he is still coming closer on HEY
    let fx = 0.5, fz = 50.5
    await line('L11', async (k, at) => {
      idle()
      go(k > 12 && bot.entity.position.z < Z + STAND.z - 0.1)
      if (k === at(4)) groan(1)
      const seen = k >= at(4) + 4
      say(`/tp @e[tag=v3,limit=1] ${(X + fx + jit()).toFixed(3)} ${F + 1} ${Z + fz} ${seen ? 180 : (12 * Math.sin(k / 5)).toFixed(1)} ${seen ? 0 : (30 + 14 * Math.sin(k / 3)).toFixed(1)}`)
      look(k)
    })
    go(false)
    // L12: he screams, hops, runs in circles... and POP: golem number twenty, right next to him
    const G20 = { x: 3.2, z: 50.6 }
    let fromA = null, fromB = null
    let pt = 0
    const panic = () => {   // a hop, then side to side through the wheat, flat out
      const t = pt++, nx = 0.5 - 1.7 * Math.sin(t / 4.5), hop = t < 8 ? Math.sin(t / 8 * Math.PI) * 0.9 : 0
      const yaw = t < 8 ? 180 : (nx < fx ? 90 : -90)
      fx = nx
      say(`/tp @e[tag=v3,limit=1] ${(X + fx).toFixed(3)} ${(F + 1 + hop).toFixed(3)} ${Z + fz} ${yaw} 0`)
    }
    await line('L12', async (k, at) => {
      idle()
      if (k === at(0) + 1) ctx.sound('entity.villager.hurt', 1, 1.25)
      if (k === at(0) + 9) ctx.sound('entity.villager.hurt', 0.8, 1.4)
      if (k >= at(0)) panic()
      if (k === at(1) - 2) say(`/summon iron_golem ${(X + G20.x).toFixed(2)} ${F + 1} ${(Z + G20.z).toFixed(2)} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,PlayerCreated:0b,Tags:["g","ga","g20"],Rotation:[90f,0f]}`)
      if (k === at(1)) { ctx.mark('pop'); ctx.mark('meter', { value: 20 }); ctx.sound('entity.item.pickup', 1, 0.7); ctx.sound('entity.iron_golem.step', 1, 0.6) }
      if (k >= at(1) + 1) { fromA = fromA || { ...K.base }; K.turnTo(fromA, P(G20.x - 0.6, 2.7, G20.z), (k - at(1) - 1) / 9) }
      if (k >= at(4)) say(`/tp @e[tag=g20,limit=1] ${(X + G20.x + jit()).toFixed(3)} ${F + 1} ${Z + G20.z} facing entity ${me} eyes`)
      look(k)
    })
    // L13: wait, THEY make them? The farmer bolts; heavy steps behind me
    let fled = 0
    const T13 = Math.round((S.line('L13').dur + S.gap) * 20)
    await line('L13', async (k, at) => {
      idle()
      if (k < at(2)) panic()   // still running in circles
      else { fled++; fz += 0.3; fx -= 0.12; say(`/tp @e[tag=v3,limit=1] ${(X + fx).toFixed(3)} ${F + 1} ${(Z + fz).toFixed(3)} 20 0`) }
      if (k >= at(1) - 3 && k < at(3) - 3) { fromB = fromB || { ...K.base }; K.turnTo(fromB, P(fx, 1.9, fz), (k - at(1) + 3) / 8); if (k >= at(1) + 5) K.base = K.aim(P(fx, 1.9, fz)) }
      if (k === at(3) - 3) fromA = { ...K.base }
      if (k >= at(3) - 3) K.turnTo(fromA, P(G20.x, 3.0, G20.z), (k - at(3) + 3) / 9)
      say(`/tp @e[tag=g20,limit=1] ${(X + G20.x + jit()).toFixed(3)} ${F + 1} ${Z + G20.z} facing entity ${me} eyes`)
      if ([T13 - 15, T13 - 9, T13 - 3].includes(k)) ctx.sound('entity.iron_golem.step', 0.5 + (k - T13 + 15) * 0.04, 0.9)
      look(k)
    })
    say(`/tp @e[tag=v3] ${X} ${F - 30} ${Z}`)
    // L14: scared of WHAT? I turn round. All of them, coming
    const C = bot.entity.position.clone()
    const cx = C.x.toFixed(2), cy = F + 1, cz = C.z.toFixed(2)
    let lean = 0
    const advance = (n) => {
      for (const [tag, R] of Object.entries(RANKS)) say(`/execute positioned ${cx} ${cy} ${cz} as @e[tag=${tag},distance=${(R.rf - lean).toFixed(2)}..] at @s facing ${cx} ${cy} ${cz} positioned ^ ^ ^0.13 run tp @s ~ ${cy} ~ facing ${cx} ${(cy + 1.6).toFixed(2)} ${cz}`)
      if (n % 5 === 0) ctx.sound('entity.iron_golem.step', 0.9, 0.85 + (n % 3) * 0.1)
    }
    let n = 0
    from = { ...K.base }
    await line('L14', async (k) => { advance(n++); K.turnTo(from, P(C.x - X, 2.6, C.z - Z - 8), (k - 1) / 11); look(k) })
    // L15: and why is everyone looking at ME? (my voice: the groan again.) The nearest one swings
    from = { ...K.base }
    const T15 = Math.round((S.line('L15').dur + S.gap) * 20)
    await line('L15', async (k, at) => {
      advance(n++)
      if (k === at(3) + 2) groan(0.9)
      // across the wall of them, left then right, and up into the face of the one in front
      const u = k / T15, sweep = Math.sin(u * Math.PI * 2) * 0.5 * (1 - u * 0.6)
      K.base = { yaw: from.yaw + sweep, pitch: from.pitch + 0.22 * Math.min(1, Math.max(0, (u - 0.55) / 0.4)) }
      look(k)
    })
    // the hit: the game says what I am to them
    ctx.mark('smash')
    ctx.sound('entity.iron_golem.attack', 1, 1); ctx.sound('entity.zombie.hurt', 0.9, 1)
    say(`/damage @s 100 minecraft:mob_attack by @e[tag=ga,limit=1,sort=nearest]`)
    for (let i = 0; i < 20 && !ctx.died; i++) { advance(n++); await bot.waitForTicks(1) }
    // behind the death screen they all lean in (mob updates reach a dead player for ~0.9 s)
    for (let i = 0; i < 44; i++) { lean = Math.min(0.9, lean + 0.07); advance(n++); await bot.waitForTicks(1) }
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return ctx.died
  }
}
