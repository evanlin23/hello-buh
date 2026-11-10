// Story Short "The Dog on the Hill" (stories/dog_hill: story.json v2, bible.md). Cinematic: movie-engine cameras, the
// Gemini cast on `line` marks, built by scripts/story_short.py (vertical 1080x1920).
//
// A tamed wolf has sat on the flat top of the hill above a real generated plains village (-160, -864) for 900 days,
// facing one empty patch of grass in front of an old dirt hut. Pip (a baby villager, the narrator) brings bones, begs;
// Grandpa says only one voice gets him up. One night: "HelloBuh joined the game" and the player (the recording bot)
// is standing on the patch, where he logged out (vanilla: you come back where you left). The dog stands for the first
// time. "Sit, boy. I'll be right back." The dog sits. "HelloBuh left the game." Day one.
//
// Set origin D = the dog's block: village + (-42, ~27, -34), near the hill's east edge. The dog faces east (MC yaw -90)
// at the patch P = D + (3, 0, 0), the drop and the village below; the hut is north-east (D + (3..7, *, -8..-4), door south).
// Cast are NoAI mobs moved by /tp; cast changes between shots hop through a far park (>64 blocks: no client glide).
// Minecraft-true: a sitting tamed wolf only stands when its owner makes it (the Owner is the bot's UUID); bones don't
// interest a tamed wolf; a player logs back in where he logged out, and vanishes on the spot when he leaves.
// Film licence: villagers talk; the montage changes the weather and time on cuts.
const M = require('../lib/movie')
const VOX = require('../stories/dog_hill/durations.json')

const VX = -160, VZ = -864
const X = VX - 42, Z = VZ - 34
const GAP = 0.3

module.exports = {
  name: 'story_dog_hill',
  biome: null,
  near: [VX, VZ],
  time: 23800,
  renderDistance: 10, recordRadius: 128,
  botTimeout: 600,
  brightness: 0.8,
  cast: { self: 'steve' },
  selfName: 'HelloBuh',
  idleLife: true,
  look: { grade: { lift: [0.01, 0.012, 0.03], gamma: [1.0, 1.0, 0.97], gain: [1.08, 1.02, 0.92], sat: 1.12, contrast: 0.14, exposure: 1.05 },
    bloom: 0.5, bloomThreshold: 0.72, vignette: 0.38, grain: 0.015, dof: { aperture: 0.35 }, shadows: true, rays: 0.5,
    shade: { ao: 0.9, haze: 0.25, hazeDist: 80, split: 0.1, glow: 0.5 } },
  // offsets from D (dy from the ground's top; the dog's head is ~dy 1.6)
  shots: {
    // L01: behind him, craning down: his back, the empty patch, the drop and the village far below (sunrise)
    open: { dof: false, path: [[0, -10, 14, -8], [5, -4.5, 5.5, -3.5]], look: [11, -11, 11], fov: 60 },
    // L02: three days of not moving
    rain: { path: [[0, 3.6, 2.2, 2.6], [2, 3.2, 2.0, 2.3]], look: [0.5, 0.6, 0.5], fov: 55 },
    storm: { path: [[0, -1.2, 2.3, 7], [2, -1, 2.2, 6.4]], look: [0.3, 1.4, 0], fov: 58 },
    zombies: { path: [[0, 3.6, 2.4, 5.6], [2, 3.3, 2.3, 5.3]], look: [-1.5, 0.8, -1], fov: 55 },
    // L03: morning, Pip walks up from the south rim with a bone
    bone: { path: [[0, -3.6, 2.2, 6.2], [4, -3.2, 2.0, 5.6]], look: [0.4, 0.5, 1.4], fov: 55 },
    // L04: the collar, close (the one close-up before the reveal)
    collar: { path: [[0, 2.6, 1.3, -1.4], [4, 2.3, 1.2, -1.2]], look: [0.55, 0.85, 0.5], fov: 45 },
    // L05: over his back at the empty patch, the valley beyond
    patch: { path: [[0, -2.6, 2.8, 1.7], [4, -2.0, 2.5, 1.5]], look: [3.2, 0.1, 0.1], fov: 50 },
    // L06: the hut, wide, the dog small in the foreground
    hut: { path: [[0, -3.5, 4.2, 6.5], [4, -2.8, 3.8, 6]], look: [5, 1.5, -5], fov: 58 },
    // L07: Pip begging in front of him (side on)
    beg: { path: [[0, 1.0, 1.8, 4.8], [4, 0.9, 1.7, 4.2]], look: [1.0, 0.6, 0.5], fov: 50 },
    // L08-L10: Grandpa on the path below the south rim; Pip at the rim above
    gramps: { path: [[0, -5.2, 3.0, 4.6], [4, -5.4, 2.8, 5.0]], look: [-5, -1.5, 11.5], fov: 50 },
    whose: { path: [[0, -2.4, 1.6, 5.8], [4, -2.6, 1.5, 6.1]], look: [-5, 0.7, 7.5], fov: 50 },
    rightback: { path: [[0, -1.4, -0.3, 9.6], [4, -1.6, -0.3, 9.9]], look: [-5, -0.5, 11.5], fov: 48 },
    // L11: dusk, the two of them from the front (the sunset behind them); then the same at night
    dusk: { path: [[0, 4.8, 2.6, 2.4], [3, 4.4, 2.4, 2.2]], look: [0, 0.4, 0.9], fov: 56 },
    night: { path: [[0, 3.0, 1.6, 3.3], [3, 2.7, 1.5, 3.0]], look: [0.2, 0.6, 1.1], fov: 48 },   // (closer than dusk: a time cut on the same framing read as a jump cut)
    // L12: behind them: the player appears on the patch, the dog stands, the village lights below
    reveal: { path: [[0, -3.8, 2.9, 2.0], [4, -3.4, 2.7, 1.8]], look: [3, 0.8, 0.5], fov: 50 },
    // L13-L14: side on, the reunion and the sit
    reunion: { path: [[0, 1.6, 1.5, 4.6], [5, 1.8, 1.4, 4.2]], look: [2.4, 0.9, 0.5], fov: 50 },
    sit: { path: [[0, 1.2, 2.4, 6.8], [5, 1.0, 2.6, 7.4]], look: [2.4, 0.7, 0.5], fov: 52 },
    // L15: the opening frame again, pulling up and away
    end: { dof: false, path: [[0, -4.5, 5.5, -3.5], [4, -10, 14, -8]], look: [11, -11, 11], fov: 60 }
  },
  caption: 'why won\'t this dog stand up?',
  // the channel's Short layout (edit.py --story: black bands, the title on top, the 1080x1011 game view cropped from a
  // 16:9 master); the bed is our own score (scripts/story_short.py --score-only, as .ogg), so publish adds no NCS track
  wideMaster: true,
  edit: { story: 'stories/dog_hill', startAt: 'start:0.1', endAfter: 'end_scene:0.25', song: 'stories/dog_hill/score.ogg', ownScore: true, caption: 'why won\'t this dog stand up?' },

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    for (const c of ['/gamerule log_admin_commands false', '/difficulty easy', '/gamemode creative']) await ctx.cmd(c)
    await ctx.cmd(`/tp @s ${X} 160 ${Z}`); await bot.waitForTicks(60); await bot.waitForChunksToLoad()
    const g = ctx.surface(X, Z)
    const F = g.position.y
    Object.assign(this, { F })
    ctx.log('D ground', F, g.name)
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    const c = (s) => ctx.cmd(s)
    for (const t of ['dog', 'pip', 'gramps', 'z1', 'z2']) await c(`/kill @e[tag=${t}]`)   // (a retried attempt runs setup again on the same world)
    await c(`/kill @e[type=item,x=${X - 20},y=${F - 20},z=${Z - 20},dx=40,dy=40,dz=40]`)
    // the meadow: a disc (r 9) round the dog, levelled to F, cut off at the east edge (holes below filled deep)
    for (let dz = -9; dz <= 9; dz++) {
      const hw = Math.floor(Math.sqrt(81 - dz * dz))
      const x0 = -hw, x1 = Math.min(hw, 8)
      await c(`/fill ${A(x0, 1, dz)} ${A(x1, 14, dz)} air`)
      await c(`/fill ${A(x0, -14, dz)} ${A(x1, -1, dz)} dirt replace air`)
      await c(`/fill ${A(x0, 0, dz)} ${A(x1, 0, dz)} grass_block`)
    }
    // a dense meadow of low flowers and grass (seeded: the same every take), so the one bare patch reads; tall grass
    // only out past r 6. Kept clear: the dog, Pip's spot and the bones, the patch P, the hut, Grandpa's rim
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const flowers = ['dandelion', 'poppy', 'cornflower', 'oxeye_daisy', 'azure_bluet', 'dandelion', 'poppy']
    const keep = (dx, dz) => (dx >= -1 && dx <= 2 && dz >= -1 && dz <= 2) || (dx === 3 && dz === 0) || (dx >= 2 && dx <= 8 && dz >= -9 && dz <= -3) || (dz >= 6 && dx >= -8 && dx <= -2)
    for (let dz = -13; dz <= 13; dz++) {
      for (let dx = -13; dx <= 8; dx++) {
        if (keep(dx, dz) || Math.hypot(dx, dz) > 13) continue
        const r = rnd(), far = Math.hypot(dx, dz) > 6
        if (r > (far ? 0.55 : 0.7)) continue
        const b = ctx.surface(X + dx, Z + dz)
        if (!b || b.name !== 'grass_block') continue
        const y = b.position.y - F
        if (far && r < 0.1) { await c(`/setblock ${A(dx, y + 1, dz)} tall_grass[half=lower]`); await c(`/setblock ${A(dx, y + 2, dz)} tall_grass[half=upper]`) } else await c(`/setblock ${A(dx, y + 1, dz)} ${r < 0.35 ? flowers[Math.floor(rnd() * flowers.length)] : 'short_grass'}`)
      }
    }
    // the dog's spot: worn to coarse dirt (900 days); the patch P (D + 3): one clean grass block
    await c(`/setblock ${A(0, 0, 0)} coarse_dirt`)
    // the hut, north-east of the patch: a 5x5 dirt starter house, oak door south (toward the patch), a torch,
    // a crafting table and furnace outside, overgrown
    await c(`/fill ${A(3, 1, -8)} ${A(7, 3, -4)} dirt`)
    await c(`/fill ${A(4, 1, -7)} ${A(6, 3, -5)} air`)
    await c(`/fill ${A(3, 4, -8)} ${A(7, 4, -4)} dirt`)
    await c(`/setblock ${A(5, 1, -4)} oak_door[facing=south,half=lower]`)
    await c(`/setblock ${A(5, 2, -4)} oak_door[facing=south,half=upper]`)
    await c(`/setblock ${A(4, 2, -3)} wall_torch[facing=south]`)
    await c(`/setblock ${A(3, 1, -3)} crafting_table`)
    await c(`/setblock ${A(7, 1, -3)} furnace[facing=south]`)
    await c(`/setblock ${A(3, 2, -6)} glass_pane[north=true,south=true]`)
    for (const [dx, dz] of [[3, -8], [6, -4], [7, -7], [4, -6]]) await c(`/setblock ${A(dx, 4, dz)} moss_block`)
    for (const [dz, dy] of [[-7, 3], [-7, 2], [-5, 3], [-5, 2], [-5, 1]]) await c(`/setblock ${A(2, dy, dz)} vine[east=true]`)
    for (const [dx, dy] of [[4, 3], [6, 3], [6, 2]]) await c(`/setblock ${A(dx, dy, -9)} vine[south=true]`)
    await c(`/setblock ${A(7, 3, -3)} cobweb`)
    await c(`/setblock ${A(4, 5, -7)} short_grass`)
    // two oaks for depth (behind him to the west, and north)
    for (const [dx, dz] of [[-9, -5], [-4, -10]]) { await c(`/setblock ${A(dx, 0, dz)} dirt`); await c(`/place feature minecraft:oak ${A(dx, 1, dz)}`) }
    // Grandpa's ledge below the south rim (a worn path step), a lantern on a post
    this.G = [-5, -3, 11.5]
    await c(`/fill ${A(-8, -2, 9)} ${A(-1, 8, 14)} air`)
    await c(`/fill ${A(-8, -16, 9)} ${A(-1, -4, 14)} dirt replace air`)
    await c(`/fill ${A(-8, -3, 9)} ${A(-1, -3, 14)} grass_block`)
    await c(`/fill ${A(-6, -3, 10)} ${A(-4, -3, 14)} dirt_path`)
    await c(`/setblock ${A(-8, -2, 13)} oak_fence`); await c(`/setblock ${A(-8, -1, 13)} lantern`)
    await c(`/setblock ${A(-1, -2, 9)} oak_fence`); await c(`/setblock ${A(-1, -1, 9)} lantern`)
    // the player's pocket under the hill (he isn't here until he logs in)
    await c(`/fill ${A(-4, -14, -1)} ${A(-2, -11, 1)} stone`)
    await c(`/fill ${A(-3, -13, 0)} ${A(-3, -12, 0)} air`)
    // the bones: ~14, never despawning, never picked up
    for (let i = 0; i < 14; i++) {
      const bx = 0.25 + rnd() * 1.4, bz = 0.95 + rnd() * 1.1
      await c(`/summon item ${X + bx} ${F + 1.05} ${Z + bz} {Item:{id:"minecraft:bone",count:1},PickupDelay:32767,Age:-32768,Motion:[0d,0d,0d]}`)
    }
    // the cast
    const PARK = `${X + 60} ${F + 40} ${Z}`
    this.PARK = [X + 60, F + 40, Z]
    await c(`/summon wolf ${X + 0.5} ${F + 1} ${Z + 0.5} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Sitting:1b,Tags:["dog"],Rotation:[-90f,0f],variant:"minecraft:pale",CollarColor:14b}`)
    await c('/execute as @s run data modify entity @e[tag=dog,limit=1] Owner set from entity @s UUID')
    await c(`/summon villager ${PARK} {NoAI:1b,NoGravity:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Age:-24000,Tags:["pip"],VillagerData:{type:"minecraft:plains",profession:"minecraft:none",level:1}}`)
    await c(`/summon villager ${PARK} {NoAI:1b,NoGravity:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["gramps"],VillagerData:{type:"minecraft:plains",profession:"minecraft:cartographer",level:5}}`)
    await ctx.tpCheck(X - 2.5, F - 13, Z + 0.5, -90, 0)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const F = this.F
    const say = (s) => bot.chat(s)
    const tp = (tag, dx, dy, dz, yaw = 0, pitch = 0) => say(`/tp @e[tag=${tag},limit=1] ${(X + dx).toFixed(3)} ${(F + dy).toFixed(3)} ${(Z + dz).toFixed(3)} ${yaw.toFixed(1)} ${pitch.toFixed(1)}`)
    const park = (tag) => say(`/tp @e[tag=${tag},limit=1] ${this.PARK.join(' ')}`)
    const put = (tag, dx, dy, dz, yaw, pitch = 0) => { park(tag); tp(tag, dx, dy, dz, yaw, pitch) }   // through the park: no glide
    const T = (id) => Math.round((VOX[id] + GAP) * 20)
    const line = (who, id) => ctx.mark('line', { id, who, vox: id, dur: VOX[id] })
    const run = async (n, fn) => { for (let k = 0; k < n; k++) { if (fn) fn(k); await bot.waitForTicks(1) } }
    const time = (n) => { say(`/time set ${n}`); ctx.mark('time', { time: n }) }
    const weather = (w) => { say(`/weather ${w}`); ctx.mark('weather', { weather: w, cut: true }) }
    const sitDog = (on) => say(`/data merge entity @e[tag=dog,limit=1] {Sitting:${on ? 1 : 0}b}`)
    const lerp = (a, b, u) => a + (b - a) * Math.max(0, Math.min(1, u))
    const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u) }
    const cut = (name, opts = {}) => { if (opts.time !== undefined) time(opts.time); if (opts.weather) weather(opts.weather); M.shot(ctx, name) }

    // ---- L01: sunrise, the dog on the hill, the village below
    cut('open')
    line('N', 'L01')
    await run(T('L01'))
    // ---- L02: rain / thunder at night / zombies at night, one third each
    const t2 = T('L02'), a2 = Math.round(t2 * 0.31), b2 = Math.round(t2 * 0.64)
    cut('rain', { time: 6000, weather: 'rain' })
    line('N', 'L02')
    await run(a2)
    cut('storm', { time: 18000, weather: 'thunder' })
    await run(b2 - a2, (k) => {
      if (k === 6) { ctx.mark('lightning', { x: X - 14, y: F, z: Z - 16 }); ctx.sound('entity.lightning_bolt.thunder', 0.6, 1) }
      if (k === 15) ctx.mark('lightning', { x: X - 18, y: F, z: Z - 10 })
    })
    // the zombies exist only for their shot (summoned at night: a parked zombie burns in the daytime sky)
    for (const [t, dx, dz] of [['z1', -1.8, -2.6], ['z2', -3.2, -3.8]]) say(`/summon zombie ${X + dx} ${F + 1} ${Z + dz} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["${t}"],Rotation:[0f,0f]}`)
    cut('zombies', { weather: 'clear' })
    await run(t2 - b2, (k) => {   // two zombies shuffle past behind him, north to south (zombie walk ~0.23 b/t... slower here)
      tp('z1', -1.8, 1, -2.6 + k * 0.09, 0); tp('z2', -3.2, 1, -3.8 + k * 0.09, 0)
      if (k === 4) ctx.sound('entity.zombie.ambient', 0.5, 0.9)
      if (k === t2 - b2 - 20) put('pip', -4, 1, 6, -131)   // early: the client shows a mob back from the park ~0.5 s late (lint)
    })
    park('z1'); park('z2'); say('/kill @e[tag=z1]'); say('/kill @e[tag=z2]')   // (die at the park: no death fall in the next shot)
    // ---- L03: morning: Pip walks up from the edge with a bone and drops it on the pile
    cut('bone', { time: 1000 })
    line('N', 'L03')
    const t3 = T('L03')
    await run(t3, (k) => {
      const u = ease(k / (t3 * 0.55))
      const x = lerp(-4, 0.6, u), z = lerp(6, 2.0, u), y = 1
      tp('pip', x, y, z, u < 1 ? -131 : 180, u < 1 ? 0 : 25)
      if (k === Math.round(t3 * 0.6)) { say(`/summon item ${X + 0.8} ${F + 1.4} ${Z + 1.4} {Item:{id:"minecraft:bone",count:1},PickupDelay:32767,Age:-32768,Motion:[-0.05d,0.1d,0d]}`); ctx.sound('entity.item.pickup', 0.4, 0.8) }
    })
    // ---- L04: the collar (Pip stays by him, out of this frame)
    cut('collar')
    line('N', 'L04')
    await run(T('L04'), (k) => tp('pip', 0.6, 1, 2.0, 180 + 8 * Math.sin(k / 9), 10))
    // ---- L05: the patch, over his back
    put('pip', 0.6, 1, 2.0, 180)
    cut('patch', { time: 6000 })
    line('N', 'L05')
    await run(T('L05'), (k) => tp('pip', 0.6, 1, 2.0, 180 + 10 * Math.sin(k / 12), 5))
    // ---- L06: the hut
    cut('hut')
    line('N', 'L06')
    await run(T('L06'), (k) => tp('pip', 0.6, 1, 2.0, lerp(180, 215, k / 40), 0))
    // ---- L07: Pip begs in front of him: hops, steps side to side
    put('pip', 1.7, 1, 0.5, 90)
    cut('beg', { time: 9000 })
    line('N', 'L07')
    const t7 = T('L07')
    await run(t7, (k) => {
      const hop = Math.max(0, Math.sin(k / 3.2)) * 0.45 * (k < t7 * 0.7 ? 1 : 0)
      tp('pip', 1.7, 1 + hop, 0.5 + 0.35 * Math.sin(k / 11), 90 + 12 * Math.sin(k / 7), k > t7 * 0.75 ? 30 : 0)
    })
    // ---- L08-L10: Grandpa on the path below, Pip at the edge above
    const [gx, gy, gz] = this.G
    put('pip', -5, 1, 7.5, 0, 30)
    put('gramps', gx, gy + 1, gz + 1.5, 180, -30)
    cut('gramps', { time: 11500 })
    line('Grandpa', 'L08')
    const t8 = T('L08')
    await run(t8, (k) => { tp('gramps', gx, gy + 1, gz + 1.5 - Math.min(1.5, k * 0.05), 180 + 8 * Math.sin(k / 10), -32); tp('pip', -5, 1, 7.5, 0, 28 + 4 * Math.sin(k / 8)) })
    cut('whose')
    line('N', 'L09')
    await run(T('L09'), (k) => { tp('pip', -5, 1, 7.5, lerp(0, -25, k / 30) + 6 * Math.sin(k / 6), 25); tp('gramps', gx, gy + 1, gz, 180, -30) })
    cut('rightback')
    line('Grandpa', 'L10')
    await run(T('L10'), (k) => tp('gramps', gx, gy + 1, gz, lerp(180, 235, ease(k / 40)), lerp(-30, -5, ease(k / 40))))   // he looks away, out over the valley
    park('gramps')
    // ---- L11: dusk, then night: Pip beside him
    put('pip', 0.5, 1, 1.6, -90)
    cut('dusk', { time: 12700 })
    line('N', 'L11')
    const t11 = T('L11'), a11 = Math.round(t11 * 0.45)
    await run(a11, (k) => tp('pip', 0.5, 1, 1.6, -90 + 6 * Math.sin(k / 15), 0))
    cut('night', { time: 18000 })
    await run(t11 - a11, (k) => tp('pip', 0.5, 1, 1.6, -90 - 10 * Math.sin(k / 18), 0))
    // ---- L12: the reveal: "HelloBuh joined the game", he's on the patch, the dog stands
    cut('reveal')
    ctx.mark('hush'); ctx.mark('swell')
    await run(4)
    await ctx.tpCheck(X + 3.5, F + 1, Z + 0.5, 90, 5)
    ctx.mark('chat', { text: 'HelloBuh joined the game', hold: 2.6 })
    await run(14)
    line('N', 'L12')
    const t12 = T('L12')
    await run(t12, (k) => {
      if (k === Math.round(t12 * 0.62)) { sitDog(false); ctx.sound('entity.wolf.ambient', 0.8, 1.1) }
      tp('pip', 0.5, 1, 1.6, lerp(-90, -80, k / 20), 0)
    })
    ctx.mark('hush_end')
    // ---- L13: he runs to him; the player crouches to him
    cut('reunion')
    line('Player', 'L13')
    const t13 = T('L13')
    bot.setControlState('sneak', true)
    await run(t13, (k) => {
      const u = ease(k / 14)
      const hop = k > 14 ? Math.max(0, Math.sin((k - 14) / 2.2)) * 0.35 : 0
      tp('dog', lerp(0.5, 2.4, u), 1 + hop, 0.5 + (k > 14 ? 0.25 * Math.sin((k - 14) / 5) : 0), -90, 0)
      if (k === 16 || k === 30) ctx.sound('entity.wolf.ambient', 0.9, 1.2)
      if (k % 8 === 4) ctx.sound('entity.wolf.pant', 0.4, 1)
    })
    // ---- L14: "Sit, boy. I'll be right back." He stands, the dog sits; he logs out
    cut('sit')
    line('Player', 'L14')
    const t14 = T('L14')
    await run(t14, (k) => {
      if (k === 6) bot.setControlState('sneak', false)
      if (k === Math.round(t14 * 0.3)) { tp('dog', 2.4, 1, 0.5, -90, 0); sitDog(true); bot.swingArm('right') }
    })
    await run(8)
    await ctx.tpCheck(X - 2.5, F - 13, Z + 0.5, -90, 0)
    ctx.mark('chat', { text: 'HelloBuh left the game', hold: 2.6 })
    await run(26)
    // ---- L15: Day one. The opening frame, pulling away
    cut('end')
    line('N', 'L15')
    await run(T('L15') + 22)
    ctx.mark('end_scene')
    await run(10)
    return true
  }
}
