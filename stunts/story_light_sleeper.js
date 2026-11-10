// Story Short "why is my whole village carpeted 😶" (stories/light_sleeper, story.json v2, cinematic).
// Milo, a kid, lives in a village where every road, step, roof and the doghouse is carpeted, the bell is boxed in wool
// and the well wears a white wool lid. "Walk soft, Milo. The ground's a light sleeper." Once he pulled the wool off
// the well and the bottom screamed ("a fox"). A skeleton shot a creeper and it dropped a music disc; nobody in the
// village has ever heard a song. Tonight he opens the well (wells echo), puts a jukebox on it, puts the disc in, and
// steps off the carpet onto the well's bare stone rim to dance. The village sits on an ancient city: carpet makes no
// vibration, the bottom of the well is a sculk shrieker, and the fourth shriek brings the warden up through the square.
// "Milo was obliterated by a sonically-charged shriek." "Oh. That's why we have nine thousand carpets." (line 1 again).
//
// The set: a real generated plains village (seed hellobuh, /locate village_plains from [1500, 0] finds the one at
// (-160, -864)): a level village terrace at y 79 with a hill rising ~30 blocks to the north-west and the land falling
// away east and south to water. Built into it (well-relative, +x east, +z south): the plaza ring (8 cottages and ours,
// the well, the wool-wrapped bell frame), the south terrace with its steps (S01), the carpet street climbing the
// north-west hill to the doghouse (S02), the sheep meadow on the east slope, the farm edge to the south-west (S09).
// Then every exposed top surface in the village is carpeted (roof stairs turned into stepped full blocks first: carpet
// floats on a stair), in stripes: cool colours on the ground, red and orange on the roofs.
const path = require('path')
const { storyLines, storyKit, setKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'light_sleeper')
const CAPTION = 'why is my whole village carpeted 😶'
const WX = -162, WZ = -860, F = 79      // the well's centre block, and the village terrace's ground (top block)
const MORNING = 1000, AFTERNOON = 9000, DUSK = 12500, NIGHT = 18000
const WAIT = 60                           // the cast's waiting room: a barrier floor this high over the set

module.exports = {
  name: 'story_light_sleeper',
  near: [1500, 0],                        // the scout's start point for this village (stunts/scout_valley.js)
  botName: 'Milo',                        // the death screen says Milo (owner, 2026-11-10)
  caption: CAPTION,
  time: MORNING,
  botTimeout: 900,
  renderDistance: 10, recordRadius: 150,
  wideMaster: true,
  idleLife: true,
  hideHand: false,
  look: { mood: 'auto', shadows: true, dof: { aperture: 0.85 }, cloudNight: 0.42 },   // docs/look.md: the grade follows the clock
  edit: { caption: CAPTION, red: 'carpeted', story: 'stories/light_sleeper', startAt: 'line:0', endAfter: 'story_end:0', deathScreen: true },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const X = WX, Z = WZ
    Object.assign(this, { X, Z, F })
    const { c, A, mob, vil } = setKit(ctx, { X, Z, F })
    const fast = async (cmds) => { for (let i = 0; i < cmds.length; i++) { bot.chat(cmds[i]); if (i % 40 === 39) await bot.waitForTicks(1) } await bot.waitForTicks(4) }
    await c(`/tp @s ${X} ${F + 40} ${Z}`); await bot.waitForTicks(60)
    try { await bot.waitForChunksToLoad() } catch (e) {}
    await ctx.defaultRules()
    for (const g of ['log_admin_commands false', 'random_tick_speed 0', 'mob_griefing false', 'fire_damage false']) await c(`/gamerule ${g}`)
    await c('/difficulty hard')                    // the warden's sonic boom does 15 on hard (vanilla)
    for (const g of ['natural_health_regeneration', 'natural_regeneration', 'naturalRegeneration']) await ctx.cmd(`/gamerule ${g} false`, { mayFail: true })   // the skeleton's arrow (S09) stays on the hearts to the end (1.21.11's name: one of these)
    await c('/kill @e[type=!player]')
    await c(`/attribute @s minecraft:movement_speed base set 0.07`)   // a kid walking soft: ~3 b/s, not 4.3

    const G = (dx, dz) => groundAt(ctx, X + dx, Z + dz) - F   // natural ground height over F at a spot

    // ---- the plaza terrace: the village core is already level at F; clear its vanilla buildings and paths
    for (let y = 1; y <= 22; y += 4) await c(`/fill ${A(-21, y, -25)} ${A(21, Math.min(22, y + 3), 21)} air`)
    await c(`/fill ${A(-21, 0, -25)} ${A(21, 0, 21)} grass_block`)
    await c(`/fill ${A(-21, -3, -25)} ${A(21, -1, 21)} dirt`)

    // ---- the well: a 5x5 cobble rim 1 high, a 3x3 dry shaft 5 deep, sculk under the lid, the shrieker at the bottom
    await c(`/fill ${A(-2, -5, -2)} ${A(2, 0, 2)} mossy_cobblestone`)
    await c(`/fill ${A(-2, 1, -2)} ${A(2, 1, 2)} cobblestone`)
    for (const [x, z] of [[-2, 1], [2, -1], [1, 2], [-1, -2]]) await c(`/setblock ${A(x, 1, z)} mossy_cobblestone`)
    await c(`/fill ${A(-2, -1, -2)} ${A(2, 0, 2)} sculk`)                 // the top 2 blocks of the wall under the lid
    await c(`/fill ${A(-1, -4, -1)} ${A(1, 1, 1)} air`)
    await c(`/fill ${A(-1, -5, -1)} ${A(1, -5, 1)} sculk`)
    await c(`/setblock ${A(0, -4, 0)} sculk_shrieker[can_summon=false]`)
    for (const [x, z, f] of [[-1, -1, 'north'], [1, -1, 'east'], [-1, 1, 'west'], [1, 1, 'south'], [0, -1, 'north'], [0, 1, 'south']]) await c(`/setblock ${A(x, -1, z)} glow_lichen[${f}=true]`)
    for (const [x, z, f] of [[-1, 0, 'west'], [1, 0, 'east']]) await c(`/setblock ${A(x, 0, z)} sculk_vein[${f}=true]`)
    await c(`/fill ${A(-1, 1, -1)} ${A(1, 1, 1)} white_wool`)             // the lid, flush with the rim's top

    // ---- the bell frame, 6 east of the well: two oak posts and a beam, the bell under it, wrapped in white wool
    await c(`/fill ${A(6, 1, -1)} ${A(6, 4, -1)} oak_log`); await c(`/fill ${A(6, 1, 1)} ${A(6, 4, 1)} oak_log`)
    await c(`/setblock ${A(6, 4, 0)} oak_log[axis=z]`)
    await c(`/setblock ${A(6, 3, 0)} bell[attachment=ceiling,facing=west]`)
    await c(`/fill ${A(7, 1, -2)} ${A(7, 5, 2)} white_wool`)
    await c(`/fill ${A(5, 1, -2)} ${A(7, 5, -2)} white_wool`); await c(`/fill ${A(5, 1, 2)} ${A(7, 5, 2)} white_wool`)
    await c(`/fill ${A(5, 5, -2)} ${A(7, 5, 2)} white_wool`)

    // ---- the plaza ring: 8 cottages, doors on the plaza (x -10..10, z -8..11), and ours on the north edge
    const ring = [
      { x0: 7, z0: -15, w: 7, d: 7, door: [10, -9], face: 'south', wood: 'spruce', roof: 'red' },
      { x0: 12, z0: -6, w: 7, d: 7, door: [12, -3], face: 'west', wood: 'oak', roof: 'orange' },
      { x0: 12, z0: 3, w: 7, d: 9, door: [12, 6], face: 'west', wood: 'birch', roof: 'red' },
      { x0: -18, z0: -6, w: 7, d: 7, door: [-12, -3], face: 'east', wood: 'birch', roof: 'orange' },
      { x0: -18, z0: 3, w: 7, d: 9, door: [-12, 6], face: 'east', wood: 'spruce', roof: 'red' },
      { x0: -12, z0: 13, w: 7, d: 7, door: [-9, 13], face: 'north', wood: 'oak', roof: 'red' },
      { x0: 9, z0: 13, w: 7, d: 7, door: [12, 13], face: 'north', wood: 'spruce', roof: 'orange' },
      { x0: -12, z0: -24, w: 7, d: 7, door: [-9, -18], face: 'south', wood: 'oak', roof: 'orange' }
    ]
    for (const h of ring) await cottage(c, A, h)
    await ourHouse(c, A)

    // ---- the south street (S01): 6 carpeted full-block steps up from the plaza to a terrace 6 above it
    for (let k = 1; k <= 6; k++) await c(`/fill ${A(-3, k - (k === 1 ? 5 : 1), 11 + k)} ${A(5, k, 26)} stone_bricks`)
    await c(`/fill ${A(-4, -4, 12)} ${A(-4, 6, 26)} cobblestone`); await c(`/fill ${A(6, -4, 12)} ${A(6, 6, 26)} cobblestone`); await c(`/fill ${A(-4, -4, 27)} ${A(6, 6, 27)} cobblestone`)
    for (let k = 1; k <= 6; k++) { await c(`/setblock ${A(-4, k, 11 + k)} stone_brick_wall`); await c(`/setblock ${A(6, k, 11 + k)} stone_brick_wall`) }
    for (const [x, z] of [[-4, 18], [6, 18], [-4, 24], [6, 24]]) { await c(`/setblock ${A(x, 7, z)} cobblestone_wall`); await c(`/setblock ${A(x, 8, z)} lantern`) }

    // ---- lanterns around the plaza (posts), one by the well (south-west, out of S11-S17's frames)
    for (const [x, z] of [[-9, -7], [9, -7], [-9, 10], [9, 10], [4, 3], [3, -7], [-10, 2], [10, 3]]) {
      await c(`/fill ${A(x, 1, z)} ${A(x, 2, z)} spruce_fence`); await c(`/setblock ${A(x, 3, z)} lantern`)
    }

    // ---- the carpet street up the north-west hill to the doghouse: a 3-wide ramp of 1-high steps on the terrain
    const street = []
    const a0 = [-9, -9], a1 = [-24, -22], N = 16
    const h0 = 0, h1 = G(-25, -23)
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = Math.round(a0[0] + (a1[0] - a0[0]) * u), z = Math.round(a0[1] + (a1[1] - a0[1]) * u)
      const t = Math.max(0, (u - 0.45) / 0.55), h = Math.round(h0 + (h1 - h0) * t)
      street.push([x, z, h])
    }
    const cmds = []
    for (const [x, z, h] of street) {
      cmds.push(`/fill ${A(x - 1, h - 6, z - 1)} ${A(x + 1, h, z + 1)} dirt`, `/fill ${A(x - 1, h, z - 1)} ${A(x + 1, h, z + 1)} stone_bricks`, `/fill ${A(x - 1, h + 1, z - 1)} ${A(x + 1, h + 6, z + 1)} air`)
    }
    await fast(cmds)
    this.street = street
    // the doghouse at the top: 3x3x3, a carpet roof, open to the south-east; the wolf sits in front
    const dh = h1, dx0 = -27, dz0 = -26
    await c(`/fill ${A(dx0 - 1, dh - 4, dz0 - 1)} ${A(dx0 + 4, dh, dz0 + 4)} dirt`); await c(`/fill ${A(dx0 - 1, dh, dz0 - 1)} ${A(dx0 + 4, dh, dz0 + 4)} grass_block`)
    await c(`/fill ${A(dx0 - 1, dh + 1, dz0 - 1)} ${A(dx0 + 4, dh + 8, dz0 + 4)} air`)
    await c(`/fill ${A(dx0, dh + 1, dz0)} ${A(dx0 + 2, dh + 3, dz0 + 2)} spruce_planks hollow`)
    await c(`/fill ${A(dx0 + 1, dh + 1, dz0 + 2)} ${A(dx0 + 1, dh + 2, dz0 + 2)} air`); await c(`/fill ${A(dx0 + 2, dh + 1, dz0 + 1)} ${A(dx0 + 2, dh + 2, dz0 + 1)} air`)
    await c(`/fill ${A(dx0 - 1, dh + 3, dz0 - 1)} ${A(dx0 + 3, dh + 3, dz0 + 3)} spruce_planks`)
    await c(`/fill ${A(dx0, dh + 4, dz0)} ${A(dx0 + 2, dh + 4, dz0 + 2)} spruce_planks`)
    this.dog = { x: dx0 + 3.5, y: dh + 1, z: dz0 + 3.5 }
    // two cottages beside the street, stepped into the slope
    for (const h of [{ x0: -29, z0: -19, w: 7, d: 7, door: [-26, -19], face: 'north', wood: 'spruce', roof: 'red', y: G(-26, -16) }, { x0: -17, z0: -33, w: 7, d: 7, door: [-14, -27], face: 'south', wood: 'oak', roof: 'orange', y: G(-14, -30) }]) {
      await c(`/fill ${A(h.x0 - 1, h.y + 1, h.z0 - 1)} ${A(h.x0 + h.w, h.y + 12, h.z0 + h.d)} air`)
      await cottage(c, A, h)
    }

    // ---- the sheep meadow on the east slope (S02's last frame): a fence on the ground, ~50 sheep, half sheared
    const mx0 = 34, mx1 = 62, mz0 = 22, mz1 = 44, fence = []
    for (let x = mx0; x <= mx1; x++) for (const z of [mz0, mz1]) fence.push([x, z])
    for (let z = mz0; z <= mz1; z++) for (const x of [mx0, mx1]) fence.push([x, z])
    await fast(fence.map(([x, z]) => `/setblock ${A(x, G(x, z) + 1, z)} oak_fence`))
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < 48; i++) {
      const x = mx0 + 1.5 + rnd() * (mx1 - mx0 - 3), z = mz0 + 1.5 + rnd() * (mz1 - mz0 - 3)
      await mob('sheep', x, G(Math.floor(x), Math.floor(z)) + 1, z, Math.floor(rnd() * 360), ['sheep'], `Sheared:${i % 2 ? 1 : 0}b,Color:0b`)
    }
    await c(`/fill ${A(mx0 + 1, G(mx0 + 1, mz0 + 1) + 1, mz0 + 1)} ${A(mx0 + 2, G(mx0 + 1, mz0 + 1) + 2, mz0 + 2)} white_wool`)

    // ---- the farm edge (S09), west of the plaza on level ground: the carpet stops at x -24; grass, a wheat field, trees
    for (let y = 1; y <= 16; y += 4) await c(`/fill ${A(-50, y, -2)} ${A(-22, Math.min(16, y + 3), 18)} air`)
    await c(`/fill ${A(-50, 0, -2)} ${A(-22, 0, 18)} grass_block replace air`); await c(`/fill ${A(-50, 0, -2)} ${A(-22, 0, 18)} grass_block replace dirt_path`)
    await c(`/fill ${A(-50, -2, -2)} ${A(-22, -1, 18)} dirt replace air`)
    const fy = G(-30, 8)
    for (let x = -36; x <= -27; x++) for (let z = 11; z <= 17; z++) { bot.chat(`/setblock ${A(x, G(x, z), z)} farmland[moisture=7]`); bot.chat(`/setblock ${A(x, G(x, z) + 1, z)} wheat[age=7]`) }
    await bot.waitForTicks(4)
    for (const [x, z, f] of [[-43, 4, 'oak'], [-45, 10, 'fancy_oak'], [-42, 15, 'birch'], [-48, 6, 'oak'], [-47, 13, 'oak'], [-41, 0, 'birch'], [-50, 9, 'birch'], [-41, 8, 'oak']]) await c(`/place feature minecraft:${f} ${A(x, G(x, z) + 1, z)}`)
    this.fy = fy

    // ---- carpet everything: every exposed top in the village (stairs and slabs made full first)
    for (let y = -14; y <= 40; y += 6) for (const pl of ['short_grass', 'tall_grass', 'fern', 'large_fern', 'dandelion', 'poppy', 'bush', 'oxeye_daisy', 'azure_bluet', 'cornflower']) bot.chat(`/fill ${A(-40, y, -40)} ${A(32, Math.min(40, y + 5), 24)} air replace ${pl}`)
    await bot.waitForTicks(10)
    await carpetAll(ctx, { X, Z, F, x0: -40, x1: 32, z0: -40, z1: -9 })
    await carpetAll(ctx, { X, Z, F, x0: -24, x1: 32, z0: -8, z1: 26 })

    // ---- the cast, waiting high above the set on a barrier floor until each scene puts them in place
    await c(`/fill ${A(-8, WAIT, -8)} ${A(8, WAIT, 8)} barrier`)
    await vil(0.5, 0.5, 0, 'farmer', ['mom'], { y: WAIT + 1 })
    const vils = [['v1', 'librarian'], ['v2', 'cleric'], ['v3', 'toolsmith'], ['v4', 'fletcher'], ['v5', 'shepherd'], ['v6', 'nitwit'], ['w1', 'farmer'], ['w2', 'nitwit']]
    for (const [i, [t, p]] of vils.entries()) await vil(-6 + i * 1.5, 3.5, 0, p, [t], { y: WAIT + 1 })
    await mob('skeleton', -4.5, WAIT + 1, -5.5, 0, ['skel'], 'equipment:{mainhand:{id:"minecraft:bow",count:1},head:{id:"minecraft:leather_helmet",count:1}}')   // a helmet: no burning at dusk
    await c(`/summon creeper ${X + 4.5} ${F + WAIT + 1} ${Z - 5.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["creep"]}`)
    await mob('warden', 5.5, WAIT + 1, 5.5, 180, ['warden'])
    await mob('wolf', this.dog.x, this.dog.y, this.dog.z, -40, ['wolf'], 'Sitting:1b,CollarColor:14b')
    // the walkers on the plaza and the street (S01, S02)
    await vil(-6.5, 6.5, 90, 'shepherd', ['walk1'])
    await vil(7.5, -5.5, -90, 'librarian', ['walk2'])

    await c('/clear @s')
    await ctx.hotbar(['shears'])                   // the jukebox and the disc come when he gets them (L10, L11)
    for (let i = 3; i < 9; i++) await c(`/item replace entity @s hotbar.${i} with air`)
    await ctx.tpCheck(X + 2.5, F + 7.07, Z + 19.5, 180, 0)
    try { await bot.waitForChunksToLoad() } catch (e) {}
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F }, { warm: null })
    const { P, look, line, say } = K
    const C = (dx, dy, dz) => P(dx + 0.5, dy, dz + 0.5)       // a block's centre (well-relative)
    const PLAZA = 1.07                                       // feet on the plaza carpet
    K.shot('pov')
    bot.setQuickBarSlot(3)                                   // empty-handed in the morning scenes

    // the cast: actors /tp'd every tick; put() hops a mob far out first so a short move doesn't glide on screen
    const put = async (tag, s) => { say(`/tp @e[tag=${tag},limit=1] ${X} ${F + WAIT + 30} ${Z + 90}`); await bot.waitForTicks(2); return K.actor(tag, s) }
    const away = (tag) => { K.actors.delete(tag); say(`/tp @e[tag=${tag},limit=1] ${X} ${F + WAIT + 1} ${Z}`) }
    const swing = () => bot.swingArm('right')
    const shriek = () => { ctx.sound('block.sculk_shrieker.shriek', 1.6, 1); ctx.particles('dust', C(0, 1.4, 0), { color: [0.1, 0.75, 0.8], count: 14 }) }
    const breakBlock = (dx, dy, dz, block, snd = 'block.wool.break') => { say(`/setblock ${X + dx} ${F + dy} ${Z + dz} air`); ctx.sound(snd, 0.8, 1); ctx.particles('block', P(dx, dy, dz), { block }) }

    // ---- L01: the hook. POV at the top of the south steps, the whole carpeted plaza ahead; a few soft steps
    const w1 = await put('walk1', { x: -7.5, y: PLAZA, z: 5.5, yaw: -90 }), w2 = await put('walk2', { x: 6.5, y: PLAZA, z: -4.5, yaw: 90 })
    await K.cut(2.5, 19.6, C(0, 1.5, -3), 7.07)
    K.go(true)
    await K.preroll(6, () => { K.step(w1, 0.05, 0); K.step(w2, -0.04, 0.01) })
    await line('L01', async (k) => {
      K.step(w1, 0.05, 0); K.step(w2, -0.04, 0.01)
      if (bot.entity.position.z < Z + 18.2) K.go(false)
      K.base = K.aim(C(0, 1.5, -3)); look(k)
    })
    K.stop()

    // ---- L02: the crane up and back over the carpet street to the doghouse on the hill (camera shot 'est')
    K.shot('est')
    await line('L02', async (k) => { K.step(w1, 0.05, 0); K.step(w2, -0.04, 0.01); look(k) })
    away('walk1'); away('walk2')

    // ---- L04: POV walking east past the well toward the wool-wrapped bell (Mom already in our doorway, frame left)
    const mom = await put('mom', { x: 0.5, y: 3.07, z: -7.35, yaw: 0, pitch: 25 })
    K.shot('pov')
    await K.cut(-4.5, 4.6, C(6, 2.6, 0), PLAZA)
    K.go(true)
    await line('L04', async (k, at, n) => {
      if (bot.entity.position.x > X + 1.0) K.go(false)
      K.base = K.aim(C(6, 2.8 - 0.4 * Math.min(1, k / n), 0)); look(k)
    })
    K.stop()

    // ---- L05: Mom in our doorway, 2 steps up; the camera low (sneaking), 3 blocks out
    await K.cut(0.5, -3.2, C(0, 4.6, -7.4), PLAZA)
    await line('L05', async (k, at) => {
      mom.pitch = 18 + Math.sin(k / 5) * 8; mom.yaw = Math.sin(k / 6) * 14   // a mom's 'how many times' nod
      K.base = K.aim(C(0, 4.5, -7.4)); look(k)
    })

    // ---- L06: the flashback, an afternoon a year ago: the shears take the lid's middle row off
    mom.x = 0.5; mom.z = -13.5; mom.y = 3.07; mom.yaw = 0; mom.pitch = 20
    bot.setQuickBarSlot(0)
    await K.cut(0.5, -2.75, C(0, 1.6, 0), PLAZA, { time: AFTERNOON })
    let digging = false, dug = 0
    const lidRow = [[-1, 0], [0, 0], [1, 0]]
    const digRow = async () => {
      for (const [x, z] of lidRow) {
        const b = bot.blockAt(new ctx.Vec3(X + x, F + 1, Z + z))
        if (!b || b.name === 'air') continue
        K.base = K.aim(C(x, 1.5, z)); await look(0); swing()
        try { await K.dig(b, 250) } catch (e) { breakBlock(x, 1, z, 'white_wool') }   // shears on wool: 5 ticks
        ctx.particles('block', P(x, 1, z), { block: 'white_wool' })
        dug++
      }
    }
    await line('L06', async (k, at) => {
      if (k === at(2) - 4 && !digging) { digging = true; digRow().then(() => { digging = false }) }
      if (!digging) { K.base = K.aim(C(dug >= 3 ? 0 : 0, dug >= 3 ? 0.4 : 1.6, 0)); look(k) }
    })
    for (const [x, z] of lidRow) say(`/setblock ${X + x} ${F + 1} ${Z + z} air`)

    // ---- L07: the camera from the north-west, behind him: the bottom of the well SCREAMS, he steps back
    K.shot('s07')
    await line('L07', async (k, at) => {
      if (k === at(2)) { shriek(); K.ctl('back', true) }
      if (k === at(2) + 5) K.ctl('back', false)
      K.base = K.aim(C(k < at(2) ? Math.sin(k / 4) * 0.8 : 0, 0.8, 0)); look(k)   // peering into the slot, then the scream
    })
    K.stop()

    // ---- L08: inside our house. Mom holds the room; the Darkness (the shriek's answer) is already on us
    K.shot('pov')
    await K.cut(0.5, -9.9, C(0, 4.4, -13), 3.07, { time: AFTERNOON + 100, after: () => say('/effect give @s minecraft:darkness 30 0 true') })
    await line('L08', async (k) => { mom.pitch = 25 + Math.sin(k / 8) * 4; mom.yaw = Math.sin(k / 3.2) * 20; K.base = K.aim(C(0, 4.4, -13)); look(k) })   // she shakes her head: a fox
    // the lid is whole again by tonight (Mom re-laid it, bible)
    say(`/fill ${X - 1} ${F + 1} ${Z} ${X + 1} ${F + 1} ${Z} white_wool`)

    // ---- L09: dusk at the farm edge: off the carpet onto the grass; the skeleton shoots, the creeper takes it
    say('/effect clear @s minecraft:darkness')
    const fy = this.fy
    const sk = await put('skel', { x: -38.5, y: standY(ctx, X, Z, -39, 6), z: 6.5, yaw: -90, pitch: 0 })
    const cr = await put('creep', { x: -33.5, y: standY(ctx, X, Z, -34, 8), z: 8.0, yaw: -90 })
    bot.setQuickBarSlot(3)
    await K.cut(-22.5, 8.5, C(-33, fy + 1.4, 7.5), standY(ctx, X, Z, -23, 8), { time: DUSK, after: () => ctx.mark('darkness_snap', { to: 0 }) })
    away('mom')
    K.go(true)
    let creeperDead = false, disc = null
    await line('L09', async (k, at) => {
      if (!creeperDead) { K.step(cr, 0.045, 0); cr.y = standY(ctx, X, Z, Math.floor(cr.x), Math.floor(cr.z)) }
      { const p = bot.entity.position, tx = creeperDead ? p.x - X : cr.x, tz = creeperDead ? p.z - Z : cr.z; sk.yaw = K.mcYaw(tx - sk.x, tz - sk.z); if (creeperDead && k % 30 === 0) sk.x -= 0.0 }
      if (k === 3) { ctx.sound('entity.skeleton.shoot', 0.8, 1.05); say(`/damage @s 5 minecraft:arrow by @e[tag=skel,limit=1]`); ctx.sound('entity.arrow.hit_player', 0.7, 1) }   // it was shooting at me
      if (k === at(1) - 3) { ctx.sound('entity.skeleton.shoot', 0.8, 1); const dd = Math.hypot(cr.x - sk.x, cr.z - sk.z) || 1, ux = (cr.x - sk.x) / dd, uz = (cr.z - sk.z) / dd; say(`/summon arrow ${(X + sk.x + ux * 0.8).toFixed(2)} ${(F + sk.y + 1.5).toFixed(2)} ${(Z + sk.z + uz * 0.8).toFixed(2)} {Motion:[${(ux * 1.2).toFixed(3)},0.02,${(uz * 1.2).toFixed(3)}],Tags:["arr"]}`) }
      if (k === at(1) + 1) { creeperDead = true; K.actors.delete('creep'); say('/kill @e[tag=arr]'); say('/damage @e[tag=creep,limit=1] 100 minecraft:arrow'); ctx.sound('entity.creeper.death', 0.7, 1) }
      if (k === at(1) + 4 && !disc) { disc = { x: cr.x, z: cr.z }; say(`/summon item ${(X + cr.x).toFixed(2)} ${(F + cr.y + 0.3).toFixed(2)} ${(Z + cr.z).toFixed(2)} {Item:{id:"minecraft:music_disc_cat",count:1},PickupDelay:32767,Age:-32768}`) }
      if (bot.entity.position.x < X - 28.0) K.go(false)
      const fx = disc ? disc.x : cr.x, fz = disc ? disc.z : cr.z   // between the skeleton and the creeper (then the disc)
      const tgt = P((fx + sk.x) / 2 + 0.6, (cr.y + sk.y) / 2 + (disc ? 0.6 : 1.0), (fz + sk.z) / 2)
      K.base = K.aim(tgt); look(k)
    })
    K.stop()
    away('skel')
    say('/kill @e[type=item]')

    // ---- L10: night, our doorway, the disc in hand; a slow turn toward the plaza and the lidded well
    say('/item replace entity @s hotbar.2 with music_disc_cat')
    bot.setQuickBarSlot(2)
    await K.cut(0.5, -6.9, C(-2, 1.4, -2), 3.07, { time: NIGHT })
    const from10 = { ...K.base }
    await line('L10', async (k, at, n) => { K.turnTo(from10, C(0, 1.2, 0), k / n); look(k) })

    // ---- L11: tonight. 4 north of the well; the shears take the middle row; the jukebox on the rim (1,-2);
    // then a look down the slot: "Wells ECHO." Shriek 1
    say('/item replace entity @s hotbar.1 with jukebox')
    bot.setQuickBarSlot(0)
    dug = 0
    await K.cut(0.5, -3.5, C(0, 1.4, 0), PLAZA)
    K.go(true)
    let placed = false, craneAt = null
    await line('L11', async (k, at) => {
      if (bot.entity.position.z > Z - 2.75) K.go(false)
      if (k === at(1) && !digging) { digging = true; digRow().then(() => { digging = false }) }
      if (k === at(4) - 2) { bot.setQuickBarSlot(1); }
      if (k === at(4) + 2 && !placed) { placed = true; swing(); say(`/setblock ${X + 1} ${F + 2} ${Z - 2} jukebox`); ctx.sound('block.wood.place', 0.9, 1); say('/item replace entity @s hotbar.1 with air') }
      if (k === at(5)) { shriek(); K.shot('crane'); craneAt = ctx.tick }   // ECHO: the crane from above, straight down into the open slot
      if (!digging) {
        const tgt = k < at(4) ? C(0, 1.6, 0) : k < at(5) ? C(1, 2.5, -2) : C(0, 1.9, -0.1)   // ECHO: into the open slot
        if (k === at(4) || k === at(5)) K._from = { ...K.base }
        if (k >= at(4)) K.turnTo(K._from, tgt, (k - (k < at(5) ? at(4) : at(5))) / 6); else K.base = K.aim(tgt)
        look(k)
      }
    })
    K.stop()

    // ---- L12: ~20 s later (the cut carries it). The crane from above our roof down into his head; doors open,
    // the village steps into its doorways; POV: the disc goes in on "CARE", the song starts. Shriek 2
    bot.setQuickBarSlot(2)
    const doors = [[10, -9, 'south', 'v1', 0], [12, -3, 'west', 'v2', 90], [12, 6, 'west', 'v3', 90], [-12, -3, 'east', 'v4', -90], [-12, 6, 'east', 'v5', -90], [-9, 13, 'north', 'v6', 180], [12, 13, 'north', 'w1', 180], [-9, -18, 'south', 'w2', 0]]
    if (craneAt === null) { K.shot('crane'); craneAt = ctx.tick }
    let song = null
    const T12 = K.T('L12')
    await line('L12', async (k, at) => {
      if (k === at(1)) {
        for (const [x, z, f, t, yaw] of doors) {
          say(`/setblock ${X + x} ${F + 2} ${Z + z} oak_door[half=lower,facing=${f},open=true]`); say(`/setblock ${X + x} ${F + 3} ${Z + z} oak_door[half=upper,facing=${f},open=true]`)
          const o = { south: [0, 0.6], north: [0, 0.4], west: [0.4, 0], east: [0.6, 0] }[f]
          const ix = { south: [0, -1], north: [0, 1], west: [1, 0], east: [-1, 0] }[f]
          const a = K.actor(t, { x: x + o[0] + (f === 'east' || f === 'west' ? 0 : 0.5) + ix[0], y: 2.07, z: z + o[1] + (f === 'north' || f === 'south' ? 0 : 0.5) + ix[1], yaw: K.mcYaw(-x, -z) })
          a.walk = { dx: -ix[0] / 12, dz: -ix[1] / 12, n: 12 }
        }
        ctx.sound('block.wooden_door.open', 0.6, 0.9)
      }
      if (K.shotName === 'crane' && ctx.tick - craneAt >= 40) K.shot('pov')
      if (k === at(2) && !song) {
        swing(); say(`/setblock ${X + 1} ${F + 2} ${Z - 2} jukebox[has_record=true]`); say('/item replace entity @s hotbar.2 with air')
        song = startSong(ctx, K, C(1, 3.1, -2))
      }
      if (k === at(2) + 10) shriek()
      for (const [, , , t] of doors) { const a = K.actors.get(t); if (a && a.walk && a.walk.n > 0) { a.x += a.walk.dx; a.z += a.walk.dz; a.walk.n-- } else if (a) a.pitch = Math.sin((ctx.tick + t.length * 7) / 9) * 6 }
      K.base = K.aim(C(0.3, 1.5, 0)); look(k)
    })

    // ---- L13: the reverse: Mom frozen in our doorway, 5 blocks away; the Darkness comes in
    await put('mom', { x: 0.5, y: 3.07, z: -7.35, yaw: 0, pitch: 8 })
    K.shot('mom')
    say('/effect give @s minecraft:darkness 600 0 true')
    const mom13 = K.actors.get('mom')
    await line('L13', async (k) => { mom13.yaw = Math.sin(k / 1.7) * 5; mom13.pitch = 8 + Math.sin(k / 2.3) * 4; look(k) })   // frozen, trembling

    // ---- L14: POV turning from the jukebox to the east doorways: villagers frozen, the bell; "a real PARTY"
    K.shot('pov')
    await K.cut(0.5, -2.75, C(0.4, 1.5, 0.2), PLAZA)
    const from14 = { ...K.base }
    await line('L14', async (k, at, n) => { K.turnTo(from14, C(12, 2.6, 1), k / (n * 0.85)); look(k) })

    // ---- L15: off the carpet, up onto the bare stone rim; he jumps, he dances. Shriek 3 on the landing
    const from15 = { ...K.base }
    let onRim = false
    await line('L15', async (k, at, n) => {
      if (k === 10) { K.go(true); K.ctl('jump', true) }
      if (!onRim && bot.entity.position.y > F + 1.5) K.go(false)
      if (!onRim && bot.entity.onGround && bot.entity.position.y > F + 1.9) { onRim = true; K.go(false); shriek() }
      K.turnTo(from15, C(0, 0.6, 4), k / 9); look(k)
    }, 0.35)
    // three short inserts (the cut rate climbs): Mom, the east doorways, POV on the rim (he keeps jumping)
    K.shot('ins_mom'); await bot.waitForTicks(7)
    K.shot('ins_door'); await bot.waitForTicks(7)
    K.shot('pov'); for (let k = 0; k < 7; k++) { K.base = K.aim(C(0, 0.6, 4)); look(k); await bot.waitForTicks(1) }

    // ---- the reveal. S16: behind him, low: shriek 4, the carpet south of the well bursts, the warden rises and roars,
    // while he gets it (L16 "Oh. THAT'S why we have nine thousand CARPETS."); S17: POV, it steps up, the sonic boom
    K.shot('s16')
    shriek()
    for (let x = -1; x <= 1; x++) for (const dy of [1, 0]) breakBlock(x, dy, 4, dy ? 'white_carpet' : 'grass_block', dy ? 'block.wool.break' : 'block.grass.break')
    say(`/fill ${X - 1} ${F - 3} ${Z + 4} ${X + 1} ${F - 1} ${Z + 4} air`)
    ctx.sound('entity.warden.emerge', 1.2, 1)
    const wd = await put('warden', { x: 0.5, y: -2.8, z: 4.5, yaw: 180, pitch: 0 })
    const wEnt = () => Object.values(bot.entities).find(e => e.name === 'warden')
    for (let k = 0; k < 6; k++) { wd.y = -2.8 + 3.8 * K.ease(k / 30); look(k); await bot.waitForTicks(1) }
    const T16 = K.T('L16'), toPov = Math.max(26, T16 - 20)
    await line('L16', async (k) => {
      const r = k + 6
      if (r <= 30) wd.y = Math.min(1.0, -2.8 + 3.8 * K.ease(r / 30))
      if (r % 6 === 0 && r < 30) ctx.particles('block', P(0, 1, 4), { block: 'white_carpet' })
      if (r === 26) { const e = wEnt(); if (e) ctx.mark('pose', { ids: [e.id], roar: true }); ctx.sound('entity.warden.roar', 1.4, 1) }
      if (k === toPov) { K.ctl('jump', false); K.shot('pov') }
      if (k >= toPov) {
        const u = (k - toPov) / Math.max(1, T16 - toPov)
        wd.z = 4.5 - 1.0 * K.ease(u * 1.4); wd.pitch = Math.sin(k / 4) * 10
        K.base = K.aim(P(0.5, 3.4, wd.z))
      }
      look(k)
    })
    // the sonic boom right as the line lands, then the death screen ~1.2 s, the plaza pulsing behind it
    const eye = bot.entity.position
    ctx.sound('entity.warden.sonic_boom', 1.6, 1)
    ctx.particles('sonic_boom', P(0.5, 2.6, wd.z), { tx: +eye.x.toFixed(3), ty: +(eye.y + 1.62).toFixed(3), tz: +eye.z.toFixed(3) })
    say('/damage @s 15 minecraft:sonic_boom')   // vanilla hard: 15; the arrow left him at 15
    for (let k = 0; k < 26; k++) { wd.yaw = 180 + Math.sin(k / 5) * 22; wd.pitch = 10 + Math.sin(k / 7) * 8; await bot.waitForTicks(1) }
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    if (song) song()
    return true
  }
}

// The jukebox's song: an original note-block tune (harp over bass, ~150 bpm), looping, with note particles over
// the jukebox. Not the C418 disc track (no licensed music in the Short). Returns stop().
function startSong (ctx, K, at) {
  const mel = [12, 0, 16, 0, 19, 0, 16, 14, 12, 0, 9, 0, 7, 9, 12, 0, 14, 0, 17, 0, 21, 19, 17, 16, 14, 0, 12, 0, 11, 12, 14, 0]
  const bass = [0, -1, -1, -1, 0, -1, -1, -1, 5, -1, -1, -1, 7, -1, -1, -1]
  const pitch = (n) => Math.pow(2, (n - 12) / 12)
  let i = 0
  return K.every(() => {
    if (ctx.tick % 3) return
    const m = mel[i % mel.length], b = bass[(i >> 1) % bass.length]
    if (m) { ctx.sound('block.note_block.harp', 0.9, +pitch(m).toFixed(3)); if (i % 2 === 0) ctx.particles('note', at, { note: m % 24 }) }
    if (b >= 0 && i % 2 === 0) ctx.sound('block.note_block.bass', 0.8, +pitch(b + 12).toFixed(3))
    i++
  })
}

// A cottage on the plaza ring (docs/building_guide.md): cobble foundation into the ground, plank walls in a log
// frame, recessed windows, a door with a carpeted step, and a roof of full-block steps (carpet floats on stairs:
// continuity note C6), each step carpeted later by carpetAll in the roof colour. Ridge along the longer side.
async function cottage (c, A, h) {
  const { x0, z0, w, d, wood, door: [dx, dz], face } = h
  const y = h.y || 0, x1 = x0 + w - 1, z1 = z0 + d - 1, wall = 4
  const f = (a, b, blk) => c(`/fill ${A(a[0], a[1] + y, a[2])} ${A(b[0], b[1] + y, b[2])} ${blk}`)
  await f([x0, -4, z0], [x1, 1, z1], 'cobblestone')
  await f([x0, 2, z0], [x1, wall, z1], `${wood}_planks`)
  await f([x0 + 1, 2, z0 + 1], [x1 - 1, wall, z1 - 1], 'air')
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) await f([x, 2, z], [x, wall, z], `stripped_${wood}_log`)
  await f([x0, wall + 1, z0], [x1, wall + 1, z0], `${wood}_log[axis=x]`); await f([x0, wall + 1, z1], [x1, wall + 1, z1], `${wood}_log[axis=x]`)
  await f([x0, wall + 1, z0], [x0, wall + 1, z1], `${wood}_log[axis=z]`); await f([x1, wall + 1, z0], [x1, wall + 1, z1], `${wood}_log[axis=z]`)
  // windows on every side (panes in the wall plane), away from the door
  const mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2)
  for (const [x, z] of [[x0 + 2, z0], [x1 - 2, z0], [x0 + 2, z1], [x1 - 2, z1], [x0, mz], [x1, mz]]) if (Math.abs(x - dx) + Math.abs(z - dz) > 1) await f([x, 3, z], [x, 3, z], 'glass_pane')
  await f([x0 + 1, 1, z0 + 1], [x1 - 1, 1, z1 - 1], `${wood}_planks`)   // the floor
  await f([mx, wall, mz], [mx, wall, mz], 'lantern[hanging=true]')
  // the door (closed; opened in L12) with a 1-high step outside it
  await f([dx, 2, dz], [dx, 2, dz], `oak_door[half=lower,facing=${face},open=false]`)
  await f([dx, 3, dz], [dx, 3, dz], `oak_door[half=upper,facing=${face},open=false]`)
  const out = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[face]
  await f([dx + out[0], 1, dz + out[1]], [dx + out[0], 1, dz + out[1]], 'cobblestone')
  // the roof: stepped full blocks, 1 up per 1 in, 1 overhang; the ridge along the longer side
  const alongX = w >= d, half = Math.floor(((alongX ? d : w) + 1) / 2)
  for (let k = 0; k <= half; k++) {
    const yy = wall + 1 + k
    if (alongX) {
      await f([x0 - 1, yy, z0 - 1 + k], [x1 + 1, yy, z0 - 1 + k], `${wood}_planks`)
      await f([x0 - 1, yy, z1 + 1 - k], [x1 + 1, yy, z1 + 1 - k], `${wood}_planks`)
      if (z0 + k <= z1 - k) { await f([x0, yy, z0 + k], [x0, yy, z1 - k], `${wood}_planks`); await f([x1, yy, z0 + k], [x1, yy, z1 - k], `${wood}_planks`) }
    } else {
      await f([x0 - 1 + k, yy, z0 - 1], [x0 - 1 + k, yy, z1 + 1], `${wood}_planks`)
      await f([x1 + 1 - k, yy, z0 - 1], [x1 + 1 - k, yy, z1 + 1], `${wood}_planks`)
      if (x0 + k <= x1 - k) { await f([x0 + k, yy, z0], [x1 - k, yy, z0], `${wood}_planks`); await f([x0 + k, yy, z1], [x1 - k, yy, z1], `${wood}_planks`) }
    }
  }
  // upside-down stairs under the eaves on the long sides
  if (alongX) { await f([x0 - 1, wall, z0 - 1], [x1 + 1, wall, z0 - 1], `${wood}_stairs[facing=south,half=top]`); await f([x0 - 1, wall, z1 + 1], [x1 + 1, wall, z1 + 1], `${wood}_stairs[facing=north,half=top]`) } else { await f([x0 - 1, wall, z0 - 1], [x0 - 1, wall, z1 + 1], `${wood}_stairs[facing=east,half=top]`); await f([x1 + 1, wall, z0 - 1], [x1 + 1, wall, z1 + 1], `${wood}_stairs[facing=west,half=top]`) }
}

// Our house: 9x9 on the north edge (x -4..4, z -16..-8), the door at (0,-8) facing the well, 2 steps above the
// plaza; two storeys, a stone ground floor and a spruce upper storey, a stepped red roof, a lantern post by the steps.
// Inside: the carpet floor, a table and two chairs (one unused), a lantern, a window toward the well.
async function ourHouse (c, A) {
  const f = (a, b, blk) => c(`/fill ${A(...a)} ${A(...b)} ${blk}`)
  await f([-4, -4, -16], [4, 2, -8], 'cobblestone')
  await f([-4, 3, -16], [4, 6, -8], 'stone_bricks'); await f([-3, 3, -15], [3, 6, -9], 'air')
  await f([-4, 7, -16], [4, 10, -8], 'spruce_planks'); await f([-3, 7, -15], [3, 10, -9], 'air')
  await f([-3, 6, -15], [3, 6, -9], 'spruce_planks')                          // the upper floor
  for (const [x, z] of [[-4, -16], [4, -16], [-4, -8], [4, -8]]) await f([x, 3, z], [x, 10, z], 'spruce_log')
  await f([-4, 7, -8], [4, 7, -8], 'spruce_log[axis=x]'); await f([-4, 7, -16], [4, 7, -16], 'spruce_log[axis=x]')
  for (const x of [-2, 2]) { await f([x, 4, -8], [x, 5, -8], 'glass_pane'); await f([x, 8, -8], [x, 9, -8], 'glass_pane') }
  for (const z of [-13, -11]) { await f([-4, 4, z], [-4, 5, z], 'glass_pane'); await f([4, 4, z], [4, 5, z], 'glass_pane') }
  for (const [x, z, fc] of [[-3, -8, 'south'], [-1, -8, 'south'], [1, -8, 'south'], [3, -8, 'south']]) if (Math.abs(x) === 3 || Math.abs(x) === 1) await f([x, 7, z - 0], [x, 7, z], 'spruce_log[axis=x]')
  await f([0, 3, -8], [0, 3, -8], 'oak_door[half=lower,facing=south,open=true]')
  await f([0, 4, -8], [0, 4, -8], 'oak_door[half=upper,facing=south,open=true]')
  // the two steps up from the plaza, full blocks (carpeted later), and the lantern post beside them
  await f([-1, 1, -7], [1, 2, -7], 'stone_bricks'); await f([-1, 1, -6], [1, 1, -6], 'stone_bricks')
  await f([2, 1, -6], [2, 3, -6], 'spruce_fence'); await f([2, 4, -6], [2, 4, -6], 'lantern')
  // inside: the table and two chairs, lanterns
  await f([2, 3, -13], [2, 3, -13], 'spruce_fence'); await f([2, 4, -13], [2, 4, -13], 'spruce_pressure_plate')
  await f([2, 3, -14], [2, 3, -14], 'spruce_stairs[facing=south]'); await f([2, 3, -12], [2, 3, -12], 'spruce_stairs[facing=north]')
  await f([-3, 5, -12], [-3, 5, -12], 'lantern[hanging=true]'); await f([3, 5, -10], [3, 5, -10], 'lantern[hanging=true]'); await f([0, 5, -14], [0, 5, -14], 'lantern[hanging=true]')
  // the roof: stepped full blocks, ridge along x, 1 overhang
  for (let k = 0; k <= 5; k++) {
    await f([-5, 11 + k, -17 + k], [5, 11 + k, -17 + k], 'dark_oak_planks'); await f([-5, 11 + k, -7 - k], [5, 11 + k, -7 - k], 'dark_oak_planks')
    if (-16 + k <= -8 - k) { await f([-4, 11 + k, -16 + k], [-4, 11 + k, -8 - k], 'spruce_planks'); await f([4, 11 + k, -16 + k], [4, 11 + k, -8 - k], 'spruce_planks') }
  }
  await f([-5, 10, -17], [5, 10, -17], 'dark_oak_stairs[facing=south,half=top]'); await f([-5, 10, -7], [5, 10, -7], 'dark_oak_stairs[facing=north,half=top]')
  await f([3, 11, -10], [3, 17, -10], 'cobblestone'); await f([3, 18, -10], [3, 18, -10], 'campfire[lit=true]')
}

// Carpet every exposed top in the box (well-relative x0..x1, z0..z1, from F - 14 to F + 40): stairs and slabs with
// open sky over them become their full block first; then a carpet on every full block with air above, except the
// well's rim and lid, crops, farmland, water, leaves and glass. Colours: roofs (higher than 3 over the ground near
// them) red/orange by building; the plaza and the paths in 3-wide cool stripes; the rest (lawns) lime/green stripes.
async function carpetAll (ctx, { X, Z, F, x0, x1, z0, z1 }) {
  const { bot } = ctx
  const Vec3 = ctx.Vec3
  const full = (n) => n.replace(/_(stairs|slab)$/, '').replace(/^(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|pale_oak)$/, '$1_planks').replace(/^(stone_brick|mossy_stone_brick|brick|end_stone_brick|nether_brick|mud_brick)$/, '$1s').replace(/^cobblestone$/, 'cobblestone')
  const skip = /leaves|glass|farmland|wheat|water|lava|fence|wall|door|pane|lantern|torch|bell|carpet|wool|sculk|jukebox|campfire|bed|chest|barrel|flower|grass$|^short_grass|tall_grass|fern|vine|bush|poppy|dandelion|azure|tulip|daisy|allium|cornflower|lily|crop|carrots|potatoes|beetroots|hay|composter|pressure|button|lectern|_log$|ladder|chain|snow|path$|bars|sign|banner|trapdoor|anvil|grindstone|cauldron|bookshelf|smoker|furnace|crafting|cartography|fletching|smithing|stonecutter|brewing|loom/
  const cmds = [], conv = []
  for (let dz = z0; dz <= z1; dz++) {
    let run = null
    const flush = () => { if (run) { cmds.push(`/fill ${X + run.x0} ${run.y} ${Z + dz} ${X + run.x1} ${run.y} ${Z + dz} ${run.col}_carpet replace air`); run = null } }
    for (let dx = x0; dx <= x1 + 1; dx++) {
      if (dx > x1) { flush(); break }
      const inWell = Math.abs(dx) <= 2 && Math.abs(dz) <= 2
      let ground = null, tops = []
      for (let y = F + 40; y >= F - 14; y--) {
        const b = bot.blockAt(new Vec3(X + dx, y, Z + dz))
        if (!b) break
        const above = bot.blockAt(new Vec3(X + dx, y + 1, Z + dz))
        if (b.name === 'air' || b.name === 'cave_air') continue
        if (!above || (above.name !== 'air' && above.name !== 'short_grass' && above.name !== 'tall_grass')) continue
        const pr = b.getProperties ? b.getProperties() : {}
        if (/_(stairs|slab)$/.test(b.name) && pr.half !== 'top' && pr.type !== 'top' && pr.type !== 'double') { conv.push(`/setblock ${X + dx} ${y} ${Z + dz} ${full(b.name)}`); tops.push([y, 'roof']); continue }
        if (b.name === 'dirt_path' || b.name === 'grass_block' || b.name === 'dirt' || b.name === 'coarse_dirt' || b.name === 'gravel' || b.name === 'podzol' || b.name === 'stone_bricks' || b.name === 'cobblestone' || b.name === 'mossy_cobblestone') {
          if (ground === null) ground = y
        }
        if (skip.test(b.name) && !/^grass_block$/.test(b.name)) continue
        if (b.boundingBox !== 'block') continue
        tops.push([y, null])
      }
      // the first (highest) top whose column is the ground decides lawn vs road; roofs are anything 3+ over the ground
      if (inWell || !tops.length) { flush(); continue }
      // carpet every top in the column (roofs, floors under open sky, the ground)
      const lowest = tops[tops.length - 1][0]
      for (const [y, kind] of tops) {
        let col
        if (kind === 'roof' || y > lowest) col = (Math.floor((dx + 100) / 9) + Math.floor((dz + 100) / 9)) % 2 ? 'red' : 'orange'
        else {
          const b = bot.blockAt(new Vec3(X + dx, y, Z + dz))
          const road = (Math.abs(dx) <= 10 && dz >= -8 && dz <= 11) || (b && (b.name === 'dirt_path' || b.name === 'gravel' || b.name === 'stone_bricks' || b.name === 'cobblestone'))
          col = road ? ['white', 'light_gray', 'cyan', 'light_blue'][Math.floor((dz + 99) / 3) % 4] : (Math.floor((dx + 100) / 2) % 2 ? 'lime' : 'green')
        }
        if (y === tops[0][0] && run && run.y === y + 1 && run.col === col && run.x1 === dx - 1) { run.x1 = dx; continue }
        if (y === tops[0][0]) { flush(); run = { x0: dx, x1: dx, y: y + 1, col }; continue }
        cmds.push(`/setblock ${X + dx} ${y + 1} ${Z + dz} ${col}_carpet replace`)
      }
    }
  }
  ctx.log(`carpet: ${conv.length} stairs/slabs made full, ${cmds.length} carpet commands`)
  for (let i = 0; i < conv.length; i++) { bot.chat(conv[i]); if (i % 40 === 39) await bot.waitForTicks(1) }
  await bot.waitForTicks(4)
  for (let i = 0; i < cmds.length; i++) { bot.chat(cmds[i]); if (i % 40 === 39) await bot.waitForTicks(1) }
  await bot.waitForTicks(10)
}

// The top solid block at (x, z), ignoring plants, crops, leaves, logs, fences, lanterns and carpet
function groundAt (ctx, x, z) {
  const { bot } = ctx
  for (let y = 140; y > 40; y--) {
    const b = bot.blockAt(new ctx.Vec3(Math.floor(x), y, Math.floor(z)))
    if (!b) continue
    if (b.boundingBox !== 'block' || /_leaves$|_log$|fence|lantern|carpet/.test(b.name)) { if (b.name === 'farmland' || b.name === 'dirt_path') return y; continue }
    return y
  }
  return 70
}
// feet height over F to stand at a set-relative block (on its top block, carpet or not)
function standY (ctx, X, Z, dx, dz) {
  for (let y = F + 40; y > F - 30; y--) {
    const b = ctx.bot.blockAt(new ctx.Vec3(X + dx, y, Z + dz))
    if (!b || b.name === 'air' || /grass$|fern|flower|wheat|poppy|dandelion|bush|leaves|_log$|vine/.test(b.name)) continue
    if (/_carpet$/.test(b.name)) return y - F + 0.07
    if (b.boundingBox === 'block') return y + 1 - F + (/farmland/.test(b.name) ? -0.06 : 0.01)
  }
  return 0
}
// ground height over F at a set-relative spot (perform)
function G2 (ctx, X, Z, dx, dz) { return groundAt(ctx, X + dx, Z + dz) - F }

// The camera shots: offsets from the set origin (X, F, Z) = the well's centre block corner and the terrace's ground.
// Block centres are +0.5. The plaza carpet is at F + 1.07 (feet); our door's floor at F + 3.07.
module.exports.shots = {
  pov: { pov: true },
  // L02: the crane up and back from the carpet street to over the doghouse on the hill, looking south-east over the
  // whole carpeted village (the plaza, the boxed bell, the lidded well, the roofs, the meadow on the far slope)
  est: { path: [[0, -12.5, 3.2, -13.5], [1.3, -21, 10, -24], [2.8, -33, 20, -33]], lookPath: [[0, 0.5, 1.5, 0.5], [1.3, -10, 4, -9], [2.8, -9, 1, -7]], ease: true, fov: 62, dof: false },
  // L07: low from the north-west, behind him, looking south-east past his back at the well (the south steps beyond)
  s07: { at: [-5.5, 2.4, -6.5], look: [0.6, 2.0, -1.4], fov: 50, push: 0.25, dof: { aperture: 0.8, focus: { of: 'self', offset: [0, -0.4, 0] } } },
  // L12: the crane from ~16 above our roof (0,-12), looking south and down, into his head at (0.5, -2.75)
  crane: { path: [[0, 0.5, 21, -6.2], [1.1, 0.5, 9, -5.2], [2.0, 0.5, 3.2, -3.7]], lookPath: [[0, 0.5, 1, 2.5], [1.1, 0.5, 1.5, 0.5], [2.0, 0.4, 1.5, 0]], ease: true, fov: 60, dof: false },
  // L13: the reverse: 1 block east of him at his eye height, looking north at Mom in our doorway
  mom: { at: [1.6, 2.65, -2.9], look: [0.5, 4.5, -7.35], fov: 50, push: 0.3, dof: { aperture: 0.8 } },
  // the inserts before the reveal (0.35 s each)
  ins_mom: { at: [2.2, 3.6, -3.0], look: [0.5, 4.4, -7.35], fov: 50, push: 0.5, dof: false },
  ins_door: { at: [6.5, 2.9, -4.2], look: [12.0, 3.2, -2.6], fov: 50, push: 0.5, dof: false },
  // S16: low behind him (2-3 blocks north-west), looking south past him at the burst carpet and the rising warden
  s16: { mood: 'tense', at: [-1.9, 3.6, -6.8], look: [0.9, 3.0, 4.5], fov: 44, push: 0.2, dof: false }
}
