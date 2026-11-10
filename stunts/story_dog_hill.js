// Story Short "The Dog on the Hill" (stories/dog_hill: story.json v2, bible.md). Cinematic: movie-engine cameras, the
// Gemini cast on `line` marks, built by scripts/story_short.py (vertical 1080x1920).
//
// A tamed wolf has sat on the flat top of the hill above a real generated plains village (-160, -864) for 900 days,
// facing one empty patch of grass in front of an old dirt hut. Pip (a baby villager, the narrator) brings bones, begs;
// Grandpa says only one voice gets him up. One night: "Buh joined the game" and the player (the recording bot)
// is standing on the patch, where he logged out (vanilla: you come back where you left). The dog stands for the first
// time. "Sit, boy. I'll be right back." The dog sits. "Buh left the game." The dog sits on: the last shot is the first one (the loop, shown not said).
//
// Set origin D = the dog's block: village + (-42, ~27, -34), near the hill's east edge. The dog faces east (MC yaw -90)
// at the patch P = D + (3, 0, 0), the drop and the village below; the hut is north-east (D + (3..7, *, -8..-4), door south).
// Cast are NoAI mobs moved by /tp; cast changes between shots hop through a far park (>64 blocks: no client glide).
// Minecraft-true: a sitting tamed wolf only stands when its owner makes it (the Owner is the bot's UUID); bones don't
// interest a tamed wolf; a player logs back in where he logged out, and vanishes on the spot when he leaves.
// Film licence: villagers talk; the montage changes the weather and time on cuts.
const M = require('../lib/movie')

const VX = -160, VZ = -864
const X = VX - 42, Z = VZ - 34
const GAP = 0.08   // (main's K.line default; the clips carry their own 80 ms lead and 200 ms tail)

module.exports = {
  name: 'story_dog_hill',
  biome: null,
  near: [VX, VZ],
  time: 23800,
  renderDistance: 10, recordRadius: 128,
  botTimeout: 600,
  brightness: 0.8,
  cast: { self: 'steve' },
  selfName: 'Buh',
  idleLife: true,
  // visual audit 2026-11-10 F1: sharp (no DoF on wides, low bloom), the grade follows the time of day; smoothLight:
  // the THUNDER bolt lights the world, moonlight lifts the night faces (audit F2)
  look: { mood: 'auto', bloom: 0.35, bloomThreshold: 0.9, bloomPasses: 1, rays: 0.35, raysOverBlocks: 0.35, sharpen: 0.4,
    grain: 0.012, vignette: 0.38, shadows: true, smoothLight: true, moonlight: 0.35 },
  // offsets from D (dy from the ground's top: the dog's feet at dy 1, his sitting head ~1.6, Pip's eyes ~1.8, Buh's
  // and Grandpa's ~2.6 over their ground). Aims at the faces (audit B5), no plant within 2 blocks of a path point (F4)
  shots: {
    // L01: a crane in from over the east drop: the hill's rim below, the dog alone on its top, ending on his face (audit B1)
    open: { path: [[0, -8, 16, -7], [2.5, 3.8, 3.0, -2.6]], look: [0.6, 1.6, 0.5], fov: 54 },   // a drone swoop from high north-west: the dog alone on the hilltop, the village far below behind him (audit B1)
    // L02: weather and nights he didn't move
    rain: { path: [[0, -1.5, 3.0, -7.4], [2, -1.3, 2.9, -7.0]], look: [0.6, 1.6, 0.5], fov: 50 },   // WS (addendum: L02 alternates WS / FS / WS / CU)
    storm: { path: [[0, -0.6, 2.0, 3.8], [2, -0.5, 1.95, 3.5]], look: [0.6, 1.8, -1], fov: 52 },   // FS, the bolt behind the hut in the crop (audit F3)
    creeper: { path: [[0, -3.6, 2.3, 2.6], [2, -3.4, 2.2, 2.4]], look: [0.2, 1.9, -1.4], fov: 60 },   // WS: the dog and the creeper walking up behind him
    zombies: { path: [[0, 1.9, 1.8, 2.1], [2, 1.8, 1.78, 1.95]], look: [0.7, 1.7, 0.4], fov: 40 },   // CU on his face, the zombies passing behind him
    // L03-L04: morning, Pip walks up from the south with a bone; throws a stick
    bone: { path: [[0, -3.2, 2.0, 5.2], [4, -2.9, 1.9, 4.8]], look: [0.4, 1.5, 1.4], fov: 52 },
    // L05: the collar, close
    collar: { dof: { aperture: 0.6 }, path: [[0, 2.0, 1.55, -0.4], [4, 1.9, 1.5, -0.2]], look: [0.7, 1.45, 0.5], fov: 45 },
    // L06: the one empty patch, flowers all round it (audit B6)
    patch: { path: [[0, 2.8, 6.2, 1.6], [4, 3.0, 5.6, 1.3]], look: [3.5, 1.0, 0.5], fov: 50 },   // high top-down: the bare block in its ring of flowers (addendum)
    // L07: the hut, wide, the dog small in the foreground
    hut: { path: [[0, -3.5, 4.2, 6.5], [4, -2.8, 3.8, 6]], look: [5, 1.8, -5], fov: 58 },
    // L08: Pip begging in front of him (side on)
    beg: { path: [[0, 1.0, 2.0, 4.8], [4, 0.9, 1.9, 4.2]], look: [1.1, 1.7, 0.5], fov: 50 },
    // L09-L10: Grandpa on the path below the south rim, shot from the south-east off the Pip-Grandpa line (audit B3)
    gramps: { path: [[0, -2.6, -0.2, 10.0], [4, -2.8, -0.25, 10.2]], look: [-5, -0.4, 11.8], fov: 50 },   // his face, 3/4 from his right (he looks north up at Pip)
    rightback: { path: [[0, -1.4, -0.3, 9.6], [4, -1.6, -0.3, 9.9]], look: [-5, -0.4, 11.5], fov: 48 },
    // L11: dusk, the two of them from the front (the sunset behind them); then the same at night, the dog in the crop (F6)
    dusk: { path: [[0, 4.2, 1.8, 2.1], [3, 3.8, 1.7, 1.9]], look: [0.0, 1.7, 1.0], fov: 50 },
    night: { dof: { aperture: 0.6 }, path: [[0, 2.8, 1.6, 3.0], [3, 2.5, 1.55, 2.8]], look: [0.3, 1.6, 0.8], fov: 46 },
    // L13: from the north: Buh on the patch and the dog, centred; Pip behind the dog (audit F5)
    reveal: { path: [[0, 0.4, 2.8, -6.8], [4, 0.5, 2.7, -6.4]], look: [2.0, 1.8, 0.5], fov: 46 },
    // L13-L14: side on, the reunion; the sit wider (F10)
    reunion: { dof: { aperture: 0.6 }, path: [[0, 1.6, 1.8, 4.6], [5, 1.8, 1.7, 4.2]], look: [2.8, 1.9, 0.5], fov: 50 },
    sit: { path: [[0, 14, 2.6, 4.0], [5, 14.6, 2.7, 4.4]], look: [2.5, 1.8, 0.4], fov: 46 },   // a wide from out over the slope: the two small on the hill (addendum)
    // the end: the opening crane in reverse, pulling up and out over the drop (the loop, shown not said)
    end: { path: [[0, -3, 10, -4.6], [1.6, -7.5, 15, -6.6]], look: [0.6, 1.6, 0.5], fov: 54 },   // rising into the opening's frame: the dog alone above the village (the loop)
  },
  caption: 'why won\'t this dog stand up?',
  // the channel's Short layout (edit.py --story: black bands, the title on top, the 1080x1011 game view cropped from a
  // 16:9 master); the bed is our own score (scripts/story_short.py --score-only, as .ogg), so publish adds no NCS track
  wideMaster: true,
  edit: { story: 'stories/dog_hill', startAt: 'start:0', endAfter: 'end_scene:0', song: 'stories/dog_hill/score.ogg', ownScore: true, caption: 'why won\'t this dog stand up?' },

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
    // relief, so the hilltop isn't a flat plain (owner gate: "not superflat"): a grassy ridge rising 1-3 blocks to the
    // west behind the dog, a mound to the south-east, mossy boulders, leaf bushes, a birch
    for (let dz = -9; dz <= 9; dz++) {
      for (let dx = -12; dx <= -5; dx++) {
        const h = Math.max(0, Math.min(3, Math.round((-4.5 - dx) * 0.55 + Math.sin(dz * 0.7 + dx) * 0.6)))
        if (h <= 0 || (dz >= 6 && dx >= -8)) continue
        if (h > 1) await c(`/fill ${A(dx, 1, dz)} ${A(dx, h - 1, dz)} dirt`)
        await c(`/setblock ${A(dx, h, dz)} grass_block`)
      }
    }
    for (const [dx, dz, h] of [[3, 5, 1], [4, 5, 1], [4, 6, 1], [5, 5, 1], [5, 6, 2], [6, 6, 1], [4, 7, 1], [5, 7, 1]]) {
      if (h > 1) await c(`/setblock ${A(dx, 1, dz)} dirt`)
      await c(`/setblock ${A(dx, h, dz)} grass_block`)
    }
    for (const [dx, dy, dz, b] of [[-4, 1, -6, 'mossy_cobblestone'], [-3, 1, -6, 'cobblestone'], [-4, 2, -6, 'mossy_cobblestone'], [-4, 1, -7, 'andesite']]) await c(`/setblock ${A(dx, dy, dz)} ${b}`)
    for (const [dx, dz] of [[-2, -8], [-1, -8], [7, 4], [-7, 4]]) await c(`/setblock ${A(dx, 1, dz)} oak_leaves[persistent=true]`)
    await c(`/place feature minecraft:birch ${A(-11, 3, 2)}`)
    // the rim (visual audit B2): the levelled disc ended in sheer dirt walls 10-20 blocks high over the natural slope.
    // Step the ground outside it down in grass terraces (1.3 blocks a block), filled under, so the hill reads natural
    {
      const cmds = []
      for (let dz = -18; dz <= 18; dz++) {
        for (let dx = -18; dx <= 18; dx++) {
          const r = Math.hypot(dx, dz), hw = Math.floor(Math.sqrt(Math.max(0, 81 - dz * dz)))
          const inDisc = Math.abs(dz) <= 9 && dx >= -hw && dx <= Math.min(hw, 8)
          if (inDisc || r > 18 || (dx >= -8 && dx <= -1 && dz >= 9 && dz <= 14)) continue
          const out = Math.max(r - 8.5, dx - 8, 0.5)
          const T = -Math.max(1, Math.round(out * 1.3))
          const b = ctx.surface(X + dx, Z + dz)
          const n = b ? b.position.y - F : -40
          if (n >= T) continue
          if (T - 1 >= n + 1) cmds.push(`/fill ${A(dx, Math.max(n + 1, T - 30), dz)} ${A(dx, T - 1, dz)} dirt replace air`)
          cmds.push(`/setblock ${A(dx, T, dz)} grass_block`)
        }
      }
      ctx.log('terraces:', cmds.length, 'commands')
      for (let i = 0; i < cmds.length; i++) { bot.chat(cmds[i]); if (i % 12 === 11) await bot.waitForTicks(1) }
      await bot.waitForTicks(10)
    }
    // a dense meadow of low flowers and grass (seeded: the same every take), so the one bare patch reads; tall grass
    // only out past r 6. Kept clear: the dog, Pip's spot and the bones, the patch P, the hut, Grandpa's rim
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const flowers = ['dandelion', 'poppy', 'cornflower', 'oxeye_daisy', 'azure_bluet', 'dandelion', 'poppy']
    const keep = (dx, dz) => (dx >= -1 && dx <= 2 && dz >= -1 && dz <= 2) || (dx === 3 && dz === 0) || (dx >= 2 && dx <= 8 && dz >= -9 && dz <= -3) || (dz >= 6 && dx >= -8 && dx <= -2)
      || (dx >= 0 && dx <= 1 && dz >= -3 && dz <= -1)   // the lantern post
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
    // a lantern on a post by the dog (audit F2: the night light on the faces), there all story
    await c(`/setblock ${A(1, 1, -2)} oak_fence`); await c(`/setblock ${A(1, 2, -2)} lantern`)
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
    await c(`/setblock ${A(5, 3, -9)} cobweb`)   // (the unlit north side: lit white at night it outshone the faces)
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
      const bx = 0.1 + rnd() * 1.8, bz = 0.95 + rnd() * 1.5   // spread over 2 x 1.5 blocks, each its own stack (merged into one bone: audit F7)
      await c(`/summon item ${X + bx} ${F + 1.05} ${Z + bz} {Item:{id:"minecraft:bone",count:1,components:{"minecraft:custom_data":{n:${i}}}},PickupDelay:32767,Age:-32768,Motion:[0d,0d,0d]}`)
    }
    // the cast
    const PARK = `${X + 60} ${F + 40} ${Z}`
    this.PARK = [X + 60, F + 40, Z]
    await c(`/summon wolf ${X + 0.5} ${F + 1} ${Z + 0.5} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Sitting:1b,Tags:["dog"],Rotation:[-90f,0f],variant:"minecraft:pale",CollarColor:14b}`)
    await c('/execute as @s run data modify entity @e[tag=dog,limit=1] Owner set from entity @s UUID')
    await c(`/summon villager ${PARK} {NoAI:1b,NoGravity:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Age:-24000,Tags:["pip"],VillagerData:{type:"minecraft:plains",profession:"minecraft:none",level:1}}`)
    await c(`/summon villager ${PARK} {NoAI:1b,NoGravity:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["gramps"],VillagerData:{type:"minecraft:plains",profession:"minecraft:cartographer",level:5}}`)
    // no plant within 2 blocks of any camera path point (audit F4: flowers filled the lens)
    {
      const seen = new Set(), cmds = []
      for (const sh of Object.values(module.exports.shots)) {
        for (const [, px, py, pz] of sh.path) {
          for (let x = Math.floor(px - 2); x <= Math.floor(px + 2); x++) for (let y = Math.floor(py - 2); y <= Math.floor(py + 2); y++) for (let z = Math.floor(pz - 2); z <= Math.floor(pz + 2); z++) {
            const k = `${x},${y},${z}`
            if (seen.has(k) || Math.hypot(x + 0.5 - px, y + 0.5 - py, z + 0.5 - pz) >= 2) continue
            seen.add(k)
            for (const f of ['#minecraft:small_flowers', '#minecraft:replaceable_by_trees']) cmds.push(`/fill ${A(x, y, z)} ${A(x, y, z)} air replace ${f}`)
          }
        }
      }
      for (let i = 0; i < cmds.length; i++) { bot.chat(cmds[i]); if (i % 12 === 11) await bot.waitForTicks(1) }
      await bot.waitForTicks(10)
    }
    // the patch P must read (audit B6): every block round it flowers or grass, P itself bare (placed after the clearance)
    for (const [dx, dz, f] of [[2, -1, 'poppy'], [3, -1, 'oxeye_daisy'], [3, 1, 'cornflower'], [4, -1, 'short_grass'], [4, 0, 'poppy'], [4, 1, 'azure_bluet'], [5, -1, 'dandelion'], [5, 0, 'short_grass'], [5, 1, 'poppy'], [3, 2, 'short_grass'], [4, 2, 'dandelion'], [3, -2, 'dandelion'], [4, -2, 'short_grass']]) await c(`/setblock ${A(dx, 1, dz)} ${f}`)
    await c(`/setblock ${A(3, 1, 0)} air`)
    await ctx.tpCheck(X - 2.5, F - 13, Z + 0.5, -90, 0)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const F = this.F
    const { storyKit, storyLines } = require('../lib/story')
    // the cast are K.actors (visual audit B4; owner 2026-11-10: "the villager keeps teleporting ... right at the 'i even
    // begged' line"): moved by the kit at 20 Hz on the client, walked at a mob's pace; a jump only on a camera cut
    // (K.cutShot), never a /tp of the stunt's own
    const K = storyKit(ctx, storyLines('stories/dog_hill'), { X, Z, F }, { warm: null })
    const say = (s) => bot.chat(s)
    const run = async (n, fn) => { for (let k = 0; k < n; k++) { if (fn) fn(k); await bot.waitForTicks(1) } }
    const weather = (w) => { say(`/weather ${w}`); ctx.mark('weather', { weather: w, cut: true }) }
    const sitDog = (on) => say(`/data merge entity @e[tag=dog,limit=1] {Sitting:${on ? 1 : 0}b}`)
    const lerp = (a, b, u) => a + (b - a) * Math.max(0, Math.min(1, u))
    const ease = K.ease
    const OFF = { x: 60, y: 40, z: 0 }   // offstage: the sky park (in loaded chunks, >64 blocks: a pop, never a glide)
    const dog = K.actor('dog', { x: 0.5, y: 1, z: 0.5, yaw: -90 })
    const pip = K.actor('pip', { ...OFF })
    const gramps = K.actor('gramps', { ...OFF, z: 2 })
    const place = (tag, st) => { Object.assign(K.actors.get(tag), { pitch: 0 }, st) }
    // a camera cut through the kit (K.cutShot): moves() places the cast for the new shot, and the shot mark waits until
    // they are on their marks, so its first frame has them in place (they landed 1-3 ticks after the mark: Pip glided
    // in from the hut shot's spot on 'I even begged'); the time and the weather change on the cut's frame
    const cut = (name, opts = {}, moves) => K.cutShot(name, moves, { time: opts.time, at: opts.weather ? () => weather(opts.weather) : undefined })

    // vNext r2 (one narrator, continuous takes): line lengths and chunk starts come from voice/voice.json, and the picture
    // cuts and acts on the chunk it shows (owner: "look at what the line names", never ahead of the words)
    const VJ = require('../stories/dog_hill/voice/voice.json').lines
    const L = (id) => Math.round((VJ[id].dur + GAP) * 20)                 // ticks a line holds the screen
    const C = (id, k) => Math.round((VJ[id].chunks[k] ? VJ[id].chunks[k][0] : VJ[id].dur) * 20)   // tick chunk k starts
    const say1 = (id) => ctx.mark('line', { id, who: 'N', vox: id, dur: VJ[id].dur })

    // ---- L01: the dog on the hill (sunrise)
    await cut('open'); say1('L01')
    await run(L('L01'))
    // ---- L02: rain / thunder / a creeper / zombies, one chunk each (the picture on its word)
    const t2 = L('L02'), c2 = [0, C('L02', 1), C('L02', 2), C('L02', 3)]
    await cut('rain', { time: 6000, weather: 'rain' }); say1('L02')
    await run(c2[1])
    await cut('storm', { time: 18000, weather: 'thunder' })
    await run(c2[2] - c2[1], (k) => {
      // the bolt behind the hut, inside the crop (audit F3); smoothLight lights the world with it
      if (k === 2) { ctx.mark('lightning', { x: X + 6, y: F, z: Z - 20 }); ctx.sound('entity.lightning_bolt.thunder', 0.6, 1) }
    })
    say(`/summon creeper ${X + 0.0} ${F + 1} ${Z - 3.8} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["cr"],Rotation:[0f,0f]}`)
    const cr = K.actor('cr', { x: 0.0, z: -3.8, yaw: 0 })
    await cut('creeper', { weather: 'clear' })
    await run(c2[3] - c2[2], (k) => { cr.z = -3.8 + k * 0.06; if (k === 3) ctx.sound('entity.creeper.primed', 0.25, 1) })
    K.park('cr'); say('/kill @e[tag=cr]')
    for (const [t, dx, dz] of [['z1', -1.8, -3.2], ['z2', -3.2, -4.4]]) say(`/summon zombie ${X + dx} ${F + 1} ${Z + dz} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["${t}"],Rotation:[0f,0f]}`)
    const z1 = K.actor('z1', { x: -1.8, z: -3.2, yaw: 0 }), z2 = K.actor('z2', { x: -3.2, z: -4.4, yaw: 0 })
    await cut('zombies')
    await run(t2 - c2[3], (k) => { z1.z = -3.2 + k * 0.09; z2.z = -4.4 + k * 0.09; if (k === 2) ctx.sound('entity.zombie.ambient', 0.5, 0.9) })
    K.park('z1'); K.park('z2'); say('/kill @e[tag=z1]'); say('/kill @e[tag=z2]')
    // ---- L03: morning: Pip walks up with a bone and drops it on the pile; he never looks
    await cut('bone', { time: 1000 }, () => place('pip', { x: -2.5, y: 1, z: 5, yaw: -134 })); say1('L03')
    const t3 = L('L03'), b3 = Math.max(C('L03', 2), 24) - 4   // a walk: ~4.3 blocks over 1+ s
    await run(t3, (k) => {
      const u = ease(k / Math.max(1, b3 + 4))
      Object.assign(pip, { x: lerp(-2.5, 0.6, u), z: lerp(5, 2.0, u), yaw: u < 1 ? -134 : 180, pitch: u < 1 ? 0 : 25 })
      if (k === b3 + 4) { say(`/summon item ${X + 0.8} ${F + 1.4} ${Z + 1.4} {Item:{id:"minecraft:bone",count:1,components:{"minecraft:custom_data":{n:99}}},PickupDelay:32767,Age:-32768,Motion:[-0.05d,0.1d,0d]}`); ctx.sound('entity.item.pickup', 0.4, 0.8) }
    })
    // ---- L04: kids throw sticks: Pip throws one past his nose on THROW; he doesn't blink
    say1('L04')
    await run(L('L04'), (k) => {
      Object.assign(pip, { yaw: k < 6 ? 180 : 160, pitch: k < 6 ? 10 : -10 })
      if (k === 3) say(`/summon item ${X + 0.8} ${F + 1.9} ${Z + 1.5} {Item:{id:"minecraft:stick",count:1},PickupDelay:32767,Age:-32768,Tags:["stick"],Motion:[0.16d,0.3d,-0.2d]}`)   // high past his nose, on THROW
    })
    // ---- L05: the collar (the stick goes on the cut: it landed on the patch and read as something there)
    say('/kill @e[type=item,tag=stick]')
    await cut('collar'); say1('L05')
    await run(L('L05'), (k) => { pip.yaw = 180 + 8 * Math.sin(k / 9); pip.pitch = 10 })
    // ---- L06: the empty patch (Pip steps back out of the over-the-shoulder lens: behind the camera, by the lantern)
    await cut('patch', { time: 6000 }, () => place('pip', { x: -0.6, y: 1, z: -1.2, yaw: -33 })); say1('L06')
    await run(L('L06'), (k) => { const u = ease(k / 30); pip.x = lerp(-0.6, 0.0, u); pip.z = lerp(-1.2, -0.7, u); pip.yaw = -33 + 8 * Math.sin(k / 12) })   // a step closer (the top-down holds still otherwise)
    // ---- L07: the hut
    await cut('hut'); say1('L07')
    await run(L('L07'), (k) => { pip.yaw = lerp(-33, 20, k / 40) })
    // ---- L08: Pip begs: small steps side to side, a head shake (no floating hops: audit F9)
    await cut('beg', { time: 9000 }, () => place('pip', { x: 1.7, y: 1, z: 0.5, yaw: 90 })); say1('L08')
    const t8 = L('L08')
    await run(t8, (k) => { pip.z = 0.5 + 0.3 * Math.sin(k / 9); pip.yaw = 90 + 22 * Math.sin(k / 3.5) * (k < t8 * 0.75 ? 1 : 0.3); pip.pitch = k > t8 * 0.75 ? 30 : 0 })
    // ---- L09: Grandpa (on the path below) says leave him be; L10: "somebody said be right back" (he looks away)
    const [gx, gy, gz] = this.G
    await cut('gramps', { time: 11500 }, () => { place('pip', { x: -5, y: 1, z: 7.5, yaw: 0, pitch: 30 }); place('gramps', { x: gx, y: gy + 1, z: gz + 1.5, yaw: 180, pitch: -30 }) })
    say1('L09')
    await run(L('L09'), (k) => { Object.assign(gramps, { z: gz + 1.5 - Math.min(1.5, k * 0.05), yaw: 180 + 8 * Math.sin(k / 10), pitch: -32 + (k % 16 < 8 ? 6 : 0) }); pip.pitch = 28 + 4 * Math.sin(k / 8) })
    await cut('rightback'); say1('L10')
    const t10 = L('L10')
    await run(t10, (k) => { const u = ease(k / Math.max(1, t10)); Object.assign(gramps, { z: gz, yaw: lerp(180, 235, u), pitch: lerp(-30, -5, u) }) })
    // ---- L11: every night, Pip sits with him: dusk, then night on NOBODY
    await cut('dusk', { time: 12700 }, () => { place('pip', { x: 0.5, y: 1, z: 1.6, yaw: -90 }); place('gramps', { ...OFF, z: 2 }) }); say1('L11')
    const t11 = L('L11'), n11 = C('L11', 2)
    await run(n11, (k) => { pip.yaw = -90 + 6 * Math.sin(k / 15) })
    await cut('night', { time: 18000 })
    // Buh logs in on the patch now, behind the night camera (it looks west, away from P): seen first on L13's word
    const tn = ctx.tick
    await ctx.tpCheck(X + 3.5, F + 1, Z + 0.5, 90, 5)
    await run(Math.max(0, t11 - n11 - (ctx.tick - tn)), (k) => { pip.yaw = -90 - 10 * Math.sin(k / 18) })
    // ---- L12: then last night he stood up: the dog stands on STOOD, "Buh joined the game" with it (audit F8: not before)
    ctx.mark('hush'); ctx.mark('swell')
    say1('L12')
    const t12 = L('L12'), s12 = C('L12', 1)
    await run(t12, (k) => {
      if (k === Math.max(0, s12 - 3)) { sitDog(false); ctx.sound('entity.wolf.ambient', 0.8, 1.1); ctx.mark('hit'); ctx.mark('chat', { text: 'Buh joined the game', hold: 2.6 }) }
      pip.yaw = -90 + 4 * Math.sin(k / 6)
    })
    ctx.mark('hush_end')
    // ---- L13: then a guy just appeared on the patch (the reveal); on "Hey BUDDY" the reunion
    await cut('reveal'); say1('L13')
    const t13 = L('L13'), h13 = C('L13', 3)
    await run(h13, (k) => { pip.yaw = lerp(-90, -80, k / 20) })
    await cut('reunion')
    bot.setControlState('sneak', true)
    await run(t13 - h13, (k) => {
      const u = ease(k / 12)
      const hop = k > 12 ? Math.max(0, Math.sin((k - 12) / 2.2)) * 0.35 : 0
      Object.assign(dog, { x: lerp(0.5, 2.4, u), y: 1 + hop, z: 0.5 + (k > 12 ? 0.25 * Math.sin((k - 12) / 5) : 0), yaw: -90 })
      if (k === 14) ctx.sound('entity.wolf.ambient', 0.9, 1.2)
    })
    // ---- L14: then he said, sit, boy (the dog sits on SIT), be right back; he logs out after BACK (the payoff)
    await cut('sit'); say1('L14')
    const t14 = L('L14'), sit14 = C('L14', 1)
    await run(t14, (k) => {
      if (k === 3) bot.setControlState('sneak', false)
      if (k === sit14 + 2) { Object.assign(dog, { x: 2.4, y: 1, z: 0.5, yaw: -90 }); sitDog(true); bot.swingArm('right') }
    })
    ctx.mark('chat', { text: 'Buh left the game', hold: 2.6 }); ctx.mark('hit'); ctx.mark('payoff')
    await ctx.tpCheck(X - 2.5, F - 13, Z + 0.5, -90, 0)
    // the loop is shown, not said: the opening crane in reverse from the dog alone, the end 1.6 s after the payoff
    await run(10)
    await cut('end')
    await run(20)
    ctx.mark('end_scene')
    await run(10)
    return true
  }
}
