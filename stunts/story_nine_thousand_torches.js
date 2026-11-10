// Story Short "who put 6,000 torches on my village 🔥" (stories/nine_thousand_torches, story.json v2, r3).
// A villager kid wakes to a torch on every block of Larkfield and thinks something big is coming. His best friend
// Jonah, the village's player, used to put a torch by his door every night "so nothing SPAWNS" and say "see you
// tomorrow". The row still growing leads to his own door: Jonah places the last torch there, waves, and leaves the
// game for good, without "see you tomorrow". He did every night at once.
//
// The place is canon (docs/world/map.json larkfield, day 4500): the vanilla plains village placed at -366 -866 (the bell
// lands at -367 73 -885), our oak cottage and the town house across the main street from world.build, Jonah's birch
// cottage (map.json, until 4500) built here for the flashback. O = (X, F, Z) is the ground cell in front of our door
// (the door block is O + (0, 1, -1)... see DOOR below); every offset is O-relative, +x east, +z south.
// Two states of the whole village box, stashed far away in the sky and swapped in with /clone on the cuts:
//   A (today): Jonah's cottage gone (a 9 x 9 square of coarse dirt), a torch on every block that takes one, the row's
//              cells and the door spot unlit;  B (the flashback): the village as it was, no story torches.
// The narrator is the recording bot drawn as a baby villager (stunt.self); Jonah is a player actor (Steve).
const path = require('path')
const M = require('../lib/movie')
const world = require('../lib/world')
const sets = require('../lib/sets')
const { storyLines, storyKit } = require('../lib/story')

const STORY = process.env.REHEARSAL_DIR || path.join(__dirname, '..', 'stories', 'nine_thousand_torches')   // REHEARSAL_DIR: a timing-only voice.json for set rehearsals before the voice exists
const CAPTION = 'who put 6,000 torches on my village 🔥'
const X = -384, Z = -881, F = 63                // the grass cell in front of our door (the door block is at Z - 1)
const EYE = 0.81                                // a baby villager's eye
const BELL = [-367, 73, -885]
const BOX = { x0: -415, z0: -943, x1: -339, z1: -845, y0: 56, y1: 95 }   // the torch box (rel to the bell -48..28, -58..40)
const STASH = { A: 1300, B: 1200, y: 200 }      // x offsets and the base y of the two stashed states
const DOOR_SPOT = [1, 1, 0]                     // the grass block east of our doorstep (its torch cell), O-relative
// the last row (D): up the strip on the east side of the house across (x -375), west along its front, north across the street
const STRIP_X = 9, FRONT_Z = 10
const STRIP = []; for (let dz = 18; dz >= FRONT_Z; dz--) STRIP.push([STRIP_X, 1, dz])
const FRONT = []; for (let dx = STRIP_X - 1; dx >= 1; dx--) FRONT.push([dx, 1, FRONT_Z])
const NORTH = []; for (let dz = FRONT_Z - 1; dz >= 1; dz--) if (dz < 5 || dz > 7) NORTH.push([1, 1, dz])   // the path z 5..7 takes none
const ROW = [...STRIP, ...FRONT, ...NORTH]      // in laying order; the door spot is the last torch, after these
const DAWN = 23000, FLASH = 11600
const SWAP_DZ = 20                             // the swaps leave the north edge (z0..z0+19) lit: S04 looks at it on the cut into the flashback, and no flashback shot sees it

const SCOUT = process.env.SCOUT === '1'

module.exports = {
  name: 'story_nine_thousand_torches',
  caption: CAPTION,
  time: DAWN,
  botTimeout: 900,
  renderDistance: 12, recordRadius: 150,
  wideMaster: true,
  hideHand: true, hud: false,
  self: { model: 'villager', eye: EYE, extra: { baby: true, type: 'plains', profession: 'none' } },
  cast: { Jonah: 'steve' },
  playerNames: true,                            // Jonah's name over his head, dimmed while he crouches (vanilla)
  idleLife: true,
  look: 'auto',
  shots: {},   // below
  edit: { caption: CAPTION, red: 'torches', story: 'stories/nine_thousand_torches', startAt: 'line:0', endAfter: 'story_end:0' },
  chunkStops (set) { return [[0, 0], [17, -4], [17, -50], [-25, 0], [40, 0], [17, 40], [-40, 30]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },

  async setup (ctx) {
    const { bot } = ctx
    const c = (s, o) => ctx.cmd(s, o)
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await ctx.defaultRules()
    for (const g of ['log_admin_commands false', 'random_tick_speed 0', 'mob_griefing false', 'do_mob_spawning false', 'do_patrol_spawning false', 'do_trader_spawning false']) await c(`/gamerule ${g}`, { mayFail: true })
    await c(`/setworldspawn ${A(0, 1, 4)}`)
    await c('/gamerule respawn_radius 0', { mayFail: true })
    await c(`/tp @s ${BELL[0]} ${BELL[1] + 30} ${BELL[2]}`)
    await bot.waitForTicks(40)
    // the village (placed, not generated: map.json larkfield.vanilla), then our pieces at their canonical spots
    const v = await sets.vanilla(ctx, 'village_plains', { x: -366, z: -866, radius: 96, mobs: 'kill', scan: false })
    await c(`/kill @e[type=!player,x=${BELL[0]},y=${BELL[1]},z=${BELL[2]},distance=..110]`)
    const W = await world.build(ctx, { story: 'nine_thousand_torches' })
    ctx.log('larkfield pieces:', Object.keys(W.places.larkfield.pieces).join(' '))
    // Jonah's cottage (map.json: until 4500, so world.build leaves it out today): the flashback's
    const jc = (world.loadMap().places.larkfield.pieces || []).find(p => p.id === 'jonah_cottage')
    const J = await sets.place(ctx, 'cottage', { x: jc.x, z: jc.z, y: jc.y, facing: jc.facing, variant: jc.variant })
    this.J = { box: J.box, door: J.anchors.door, gate: J.anchors.gate, doorstep: J.anchors.doorstep, street: J.anchors.street }
    ctx.log('jonah cottage', JSON.stringify(this.J))
    // the main street: a worn path from Jonah's gate east past our door, and the street fence by his garden
    await sets.dress.path(ctx, [[X - 15, Z + 6], [X + 22, Z + 6]], { w: 3 })
    // the forest off the north edge (S04, S10)
    await sets.dress.grove(ctx, { x: X - 6, z: Z - 86, r: 16, n: 16, kinds: ['dark_oak', 'dark_oak', 'oak'] })
    // our family's chest against the west wall inside (S09: everything Jonah owned)
    const items = [['diamond_sword', 1], ['iron_helmet', 1], ['iron_chestplate', 1], ['iron_leggings', 1], ['iron_boots', 1], ['red_bed', 1], ['shield', 1], ['filled_map', 1], ['fishing_rod', 1], ['bread', 16], ['bucket', 1]]
    await c(`/setblock ${A(6, 1, -6)} chest[facing=west]`)   // the room's own chest, north-east corner
    // B: Jonah's two chests of coal and sticks and a crafting table by his door (S07)
    const jd = this.J.doorstep
    await c(`/setblock ${Math.floor(jd.x)} ${jd.y} ${Math.floor(jd.z) - 2} chest[facing=south]`, { mayFail: true })
    await c(`/setblock ${Math.floor(jd.x) + 1} ${jd.y} ${Math.floor(jd.z) - 2} chest[facing=south]`, { mayFail: true })
    await c(`/setblock ${Math.floor(jd.x) + 2} ${jd.y} ${Math.floor(jd.z) - 2} crafting_table`, { mayFail: true })
    for (let i = 0; i < 6; i++) {
      await c(`/item replace block ${Math.floor(jd.x)} ${jd.y} ${Math.floor(jd.z) - 2} container.${i} with coal 64`, { mayFail: true })
      await c(`/item replace block ${Math.floor(jd.x) + 1} ${jd.y} ${Math.floor(jd.z) - 2} container.${i} with stick 64`, { mayFail: true })
    }
    await bot.waitForTicks(20)
    // stash B (the village as it was) in the sky far east
    await sets.forceload(ctx, BOX.x0 + STASH.B, BOX.z0, BOX.x1 + STASH.B, BOX.z1)
    await sets.forceload(ctx, BOX.x0 + STASH.A, BOX.z0, BOX.x1 + STASH.A, BOX.z1)
    await bot.waitForTicks(40)
    await this.clone(ctx, 'to', STASH.B)
    // A: Jonah's cottage gone, the plot a 9 x 9 of coarse dirt, our chest full, every block lit but the row
    const b = this.J.box
    await c(`/fill ${b.x0} ${jc.y + 1} ${b.z0} ${b.x1} ${jc.y + 16} ${b.z1} air`)
    await c(`/fill ${b.x0} ${jc.y} ${b.z0} ${b.x1} ${jc.y} ${b.z1} grass_block`)
    const P = this.plot()
    await c(`/fill ${P.x0} ${jc.y} ${P.z0} ${P.x1} ${jc.y} ${P.z1} coarse_dirt`)
    await sets.dress.fence(ctx, [[b.x1, b.z0 + 1], [b.x1, Z + 3]])
    await sets.dress.fence(ctx, [[b.x1, Z + 9], [b.x1, b.z1]])   // the street fence where his garden fence was (S11 fg)
    for (let i = 0; i < items.length; i++) await c(`/item replace block ${A(6, 1, -6)} container.${i * 2} with ${items[i][0]} ${items[i][1]}`)
    await c(`/kill @e[type=item]`)
    await bot.waitForTicks(10)
    const skip = new Set([...ROW, DOOR_SPOT].map(([dx, , dz]) => `${X + dx},${Z + dz}`))
    // the bot reads every column: stand over the bell with the box's chunks in
    await c(`/tp @s ${BELL[0]} ${BELL[1] + 20} ${BELL[2]}`)
    await bot.waitForTicks(40)
    try { await bot.waitForChunksToLoad() } catch (e) {}
    const T = await sets.dress.torches(ctx, { ...BOX, yTop: BOX.y1 - 2, yBottom: BOX.y0, skip })
    ctx.log(`TORCHES: ${T.count} placed in the box ${BOX.x0}..${BOX.x1} x ${BOX.z0}..${BOX.z1} (story: six thousand; want 6,000-6,300)`)
    this.torchCount = T.count
    await bot.waitForTicks(20)
    await this.clone(ctx, 'to', STASH.A)
    // the row's cells: their ground y (a torch goes one above)
    this.rowY = {}
    for (const [dx, , dz] of [...ROW, DOOR_SPOT]) this.rowY[`${dx},${dz}`] = groundY(ctx, X + dx, Z + dz)

    // the room (rehearsal aid): what stands on our floor
    for (const dy of [1, 2]) { let t = ''; for (let dz = -9; dz <= 0; dz++) { let r = `${dz}`.padStart(3) + ' '; for (let dx = -4; dx <= 10; dx++) { const b = bot.blockAt(new ctx.Vec3(X + dx, F + dy, Z + dz)); r += b ? (b.name === 'air' ? '.' : b.name.slice(0, 2)).padEnd(3) : '?  ' } t += r + '\n' } ctx.log(`ROOM y+${dy} (x -4..10):\n${t}`) }
    // ground heights round the street (rehearsal aid: work/torches_ground.json, O-relative top solid y - F)
    const gh = {}
    for (let dz = -70; dz <= 30; dz++) for (let dx = -32; dx <= 40; dx++) gh[`${dx},${dz}`] = groundY(ctx, X + dx, Z + dz) - F
    require('fs').writeFileSync(path.join(__dirname, '..', 'work', 'torches_ground.json'), JSON.stringify(gh))
    // the cast: Jonah (a player actor; not an op: we move and equip him)
    this.cast = await M.spawnActors(ctx, ['Jonah'])
    await c('/gamemode survival Jonah')
    await c('/effect give Jonah resistance infinite 255 true')
    await c('/effect give Jonah saturation infinite 255 true')
    await c(`/tp Jonah ${A(0, 40, 30)}`)
    // the golem (S03), and two villagers for the flashback street (S05), NoAI, waiting in the air
    const wait = (i) => `${X + 60 + i * 3} ${F + 40} ${Z}`
    await c(`/summon iron_golem ${wait(0)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["golem"]}`)
    await c(`/summon villager ${wait(1)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["v1"],VillagerData:{profession:"minecraft:farmer",type:"minecraft:plains",level:2}}`)
    await c(`/summon villager ${wait(2)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["v2"],VillagerData:{profession:"minecraft:librarian",type:"minecraft:plains",level:2}}`)

    // the narrator: nothing in hand, full health
    await c('/clear @s')
    await c('/effect give @s resistance infinite 255 true')
    await c('/effect give @s saturation infinite 255 true')
    await ctx.tpCheck(X + 0.5, F + 1, Z + 3.5, 180, 0)
    try { await bot.waitForChunksToLoad() } catch (e) {}
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  // the plot where Jonah's cottage stood: the 9 x 9 under its post line (the cottage's lot is 16 x 15; the room is
  // set back from the garden side, which faces east toward the street)
  plot () { const b = this.J.box; return { x0: b.x0 + 1, x1: b.x0 + 9, z0: b.z0 + 2, z1: b.z0 + 10 } },

  // swap the whole box with a stash: 'to' copies the box up into the stash at x + dx, 'from' brings it back.
  // Slabs of 4 layers (77 x 99 x 4 = 30,492 blocks: under the 32,768 /clone limit), all in one tick
  async clone (ctx, dir, dx, now = false) {
    const cmds = []
    for (let y = BOX.y0; y <= BOX.y1; y += 4) {
      const y1 = Math.min(BOX.y1, y + 3), sy = STASH.y + (y - BOX.y0)
      if (dir === 'to') cmds.push(`/clone ${BOX.x0} ${y} ${BOX.z0} ${BOX.x1} ${y1} ${BOX.z1} ${BOX.x0 + dx} ${sy} ${BOX.z0}`)
      else cmds.push(`/clone ${BOX.x0 + dx} ${sy} ${BOX.z0 + SWAP_DZ} ${BOX.x1 + dx} ${sy + (y1 - y)} ${BOX.z1} ${BOX.x0} ${y} ${BOX.z0 + SWAP_DZ}`)
    }
    if (now) { for (const s of cmds) ctx.bot.chat(s); return }
    for (const s of cmds) await ctx.cmd(s)
  },

  async perform (ctx) {
    if (SCOUT) return this.scout(ctx)
    const { bot } = ctx
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F }, { warm: null })
    const { P, line, say } = K
    const jb = this.cast.Jonah
    const V = ctx.Vec3
    const jonah = { x: 0, y: 1, z: 0, yaw: 0, pitch: 0 }
    const jtp = (x, y, z, yaw, pitch = 0) => say(`/tp Jonah ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${yaw.toFixed(1)} ${pitch.toFixed(1)}`)
    const torchAt = (dx, dz) => new V(X + dx, (this.rowY[`${dx},${dz}`] ?? F) + 1, Z + dz)
    const setTorch = (dx, dz, on = true) => { const p = torchAt(dx, dz); say(`/setblock ${p.x} ${p.y} ${p.z} ${on ? 'torch' : 'air'}`) }
    const placeSound = (dx, dz) => ctx.sound('block.wood.place', 0.8, 1.2)
    // Jonah really places a torch on the block under a cell (the swing and the block are in the recording)
    const jPlace = async (dx, dz) => {
      const p = torchAt(dx, dz)
      try {
        await jb.lookAt(p.offset(0.5, -0.5, 0.5), true)
        await jb.placeBlock(jb.blockAt(p.offset(0, -1, 0)), new V(0, 1, 0))
      } catch (e) { ctx.log('jonah place failed, setblock instead:', e.message); jb.swingArm('right'); setTorch(dx, dz) }
    }
    const give = (n) => say(`/item replace entity Jonah weapon.mainhand with ${n ? `torch ${n}` : 'air'}`)
    const sneak = (on) => jb.setControlState('sneak', on)
    const chat = (text, color) => ctx.mark('syschat', { text, color })
    const golem = K.actor('golem', { x: 20, y: 10, z: 4, yaw: 0 })

    // L01 (S01): the dawn crane over the whole village, east toward the light
    K.shot('s01')
    K.setTime(DAWN)
    await bot.waitForTicks(2)
    await line('L01', async (k) => { K.look(k) })

    // L02 (S02): the dolly along the street fence: posts, roofs, hay, the grass
    K.shot('s02')
    await line('L02', async (k) => { K.look(k) })

    // L03 (S03): the meeting point: the golem walking slowly through the torches
    K.shot('s03')
    await line('L03', async (k) => { K.step(golem, 0, -0.04); golem.yaw = 180; K.look(k) })
    K.park('golem')

    // L04 (S04): POV at the north edge, the last torches and the dark forest
    await K.cut(2.5, -56, P(-6, 2.5, -84), 1)
    K.shot('pov')
    await line('L04', async (k, at) => { K.go(k > 4 && k < 18); K.look(k) }, 0, { tail: () => {} })
    K.stop()

    // the flashback: B in place (the cut waits for the clone), the golden hour
    await this.clone(ctx, 'from', STASH.B, true)
    await bot.waitForTicks(3)
    // L05 (S05): Jonah at his gate, the crane down
    const gate = this.J.gate
    jtp(gate.x - X, gate.y - F, gate.z - Z, -90)
    K.tp('v1', -8, 1.5, 6, 90); K.tp('v2', -2, 1.5, 7, 90)
    const v1 = K.actor('v1', { x: -8, y: 1, z: 6.5, yaw: 90 }), v2 = K.actor('v2', { x: 2, y: 1, z: 7.3, yaw: 90 })
    await K.cut(0.5, 3.5, P(0.5, 1.4, 0), 1, { time: FLASH, shot: 's05' })
    await line('L05', async (k) => { K.step(v1, -0.045, 0); K.step(v2, -0.04, 0); K.look(k) })
    K.park('v1'); K.park('v2')

    // L06 (S06): our door at sunset: the nightly torch on the door spot, "see you tomorrow", and he's gone
    jtp(0.3, 1, 0.5, -90); give(1)
    await K.cut(2.6, 3.2, P(0.5, 1.2, -1), 1, { time: 12000, shot: 's06' })   // on the grass: his brown robe vanished on the dirt path   // the kid on the path, back to us
    let quit6 = false
    await line('L06', async (k, at, n) => {
      if (k === at(1) - 6) sneak(true)
      if (k === at(1)) jPlace(DOOR_SPOT[0], DOOR_SPOT[2])
      if (k === at(1) + 8) { sneak(false); jb.look(Math.PI * 0.75, 0, true) }   // stands, turns to the kid
      if (k === at(5)) chat('<Jonah> see you tomorrow', 'white')
      if (k === n - 6 && !quit6) { quit6 = true; say(`/tp Jonah ${X} ${F + 60} ${Z + 300}`); chat('Jonah left the game', 'yellow') }   // the nightly log-off
      K.look(k)
    })

    // L07 (S07): yesterday at dusk, Jonah at his chests by his door, a torch in his hand
    ctx.mark('syschat_clear')
    setTorch(DOOR_SPOT[0], DOOR_SPOT[2], false)
    const ds = this.J.doorstep
    jtp(ds.x - X, ds.y - F, ds.z - Z - 1, 0); give(64)
    await K.cut(0.5, 3.5, P(0.5, 1.4, 0), 1, { time: 12300, shot: 's07' })
    await line('L07', async (k) => { if (k % 25 === 10) jb.swingArm('right'); K.look(k) })

    // L08 (S08): late dusk from behind the kid on our doorstep: Jonah walks away west to his house
    jtp(-4, 1, 6.5, 90)
    await K.cut(0.5, 1.5, P(-12, 1.6, 6.5), 1, { time: 12600, shot: 's08' })
    await line('L08', async (k) => { jb.setControlState('forward', true); K.look(k) })
    jb.setControlState('forward', false)
    jtp(0, 40, 30, 0)

    // back to today: A in place, the house inside at dawn
    await this.clone(ctx, 'from', STASH.A, true)
    await bot.waitForTicks(3)
    // L09 (S09): POV through our door to the chest; the chest screen opens on 'STUFF'
    await K.cut(5.5, -2.5, P(6.5, 1.3, -5.5), 1, { time: 23250, shot: 'pov' })
    await line('L09', async (k, at) => {
      K.go(k > 2 && bot.entity.position.z > Z - 3.6)
      if (k === at(1) - 2) { K.stop(); try { bot.openContainer(bot.blockAt(new V(X + 6, F + 1, Z - 6))) } catch (e) { ctx.log('chest:', e.message) } }
      K.look(k)
    })
    // L10 (S10): the screen closes; on the bed under the window, looking out north-west at the lit village
    try { bot.closeWindow(bot.currentWindow) } catch (e) {}
    await K.cut(1.5, -5.5, P(-9, 3.4, -9), 1.5625, { time: 23296 })   // standing on the bed, out the west window
    await line('L10', async (k) => { K.look(k) })

    // L11 (S11): the plot from the S05 angle at dawn: a 9 x 9 of torches
    await K.cut(0.5, 3.5, P(0.5, 1.2, 0), 1, { time: 23328, shot: 's11' })
    await line('L11', async (k) => { K.look(k) })

    // L12 (S12): POV at the south end of the strip: the row runs up to the corner; it grows round it
    for (const [dx, , dz] of STRIP) setTorch(dx, dz)
    give(FRONT.length + NORTH.length + 1)
    const fr0 = FRONT[0]
    jtp(fr0[0] - 2.5, (this.rowY[`${fr0[0]},${fr0[2]}`] ?? F) + 1 - F, fr0[2] + 0.5, -90)
    await K.cut(STRIP_X + 0.5, FRONT_Z + 11.5, P(STRIP_X + 0.5, 2.2, FRONT_Z - 1), (this.rowY[`${STRIP_X},${FRONT_Z + 8}`] ?? F) + 1 - F, { time: 23450, shot: 'pov' })
    let placed = 0
    await line('L12', async (k, at) => {
      if (k === at(1) && placed === 0) { placed++; jPlace(FRONT[0][0], FRONT[0][2]) }
      if (k === at(1) + 14 && placed === 1) { placed++; jPlace(FRONT[1][0], FRONT[1][2]) }
      if (k >= at(2)) K.go(k < at(2) + 8)
      K.look(k)
    })
    K.stop()

    // the ~7 s skip: the row done to one short of the door; Jonah crouched at our doorstep with one torch
    for (const [dx, , dz] of [...FRONT.slice(2), ...NORTH]) setTorch(dx, dz)
    give(1)
    jtp(0.5, 1, 0.3, -90)
    sneak(true)
    // L13 (S13): the follow shot: the kid runs up the strip and round the corner; on 'MY door', Jonah at our door
    await K.cut(STRIP_X + 0.5, FRONT_Z + 6.5, P(STRIP_X + 0.5, 2.2, FRONT_Z - 2), (this.rowY[`${STRIP_X},${FRONT_Z + 6}`] ?? F) + 1 - F, { time: 23652, shot: 's13' })
    let turned = null
    await line('L13', async (k, at) => {
      K.go(true); K.ctl('sprint', true)
      const p = bot.entity.position
      if (p.z < Z + FRONT_Z - 0.6 && !turned) turned = { ...K.base }
      if (turned) K.turnTo(turned, P(-1, 1.2, 1), Math.min(1, (k % 1000) / 8))
      if (p.x < X + 3.5) K.stop()
      K.look(k)
    })
    K.stop()

    // L14 (S14): the same axis as S06: the last torch on the door spot; after 'ONCE' he stands and waves
    await K.cut(2.5, 2.7, P(0.5, 1.2, -1), 1, { time: 23688, shot: 's14' })
    await line('L14', async (k, at, n) => {
      if (k === at(1)) jPlace(DOOR_SPOT[0], DOOR_SPOT[2])
      if (k === at(3) + 6) sneak(false)
      if (k === at(3) + 10) jb.look(Math.PI * 0.75, 0, true)
      if (k === n - 14 || k === n - 7) jb.swingArm('right')
      K.look(k)
    }, 0.6)

    // L15 (S15): POV 2.5 blocks from him, looking up; on the first word he leaves the game
    await K.cut(1.6, 2.9, P(0.5, 2.5, 0.3), 1, { time: 23742, shot: 'pov' })
    let gone = false
    await line('L15', async (k) => {
      if (k === 3 && !gone) { gone = true; try { jb.quit() } catch (e) {} chat('Jonah left the game', 'yellow') }
      K.look(k)
    }, 0.8)
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return true
  },

  // SCOUT=1: no voice yet: hold each shot's camera ~1.5 s on today's and the flashback's set, for ./hb still
  async scout (ctx) {
    const { bot } = ctx
    const order = ['s01', 's02', 's03', 's11', 's14', 'pov']
    for (const s of order) { ctx.mark('shot', { name: s }); await bot.waitForTicks(30) }
    await this.clone(ctx, 'from', STASH.B, true)
    await bot.waitForTicks(10)
    for (const s of ['s05', 's06', 's07', 's08']) { ctx.mark('shot', { name: s }); await bot.waitForTicks(30) }
    await this.clone(ctx, 'from', STASH.A, true)
    await bot.waitForTicks(10)
    ctx.mark('shot', { name: 's13' }); await bot.waitForTicks(30)
    return true
  }
}

function groundY (ctx, x, z) {
  // the walking surface: up from below the street, the first solid block with no solid block on it (scanning down
  // from the sky found eaves and the town house's jetty over the front row)
  const solid = (y) => { const b = ctx.bot.blockAt(new ctx.Vec3(x, y, z)); return b && b.boundingBox === 'block' && !/leaves|torch/.test(b.name) }
  for (let y = F - 10; y < BOX.y1; y++) if (solid(y) && !solid(y + 1)) return y
  return F
}

// The camera shots: offsets from O (the grass cell in front of our door, F the ground). The bell is at (17, 10, -4);
// Jonah's gate about (-12.5, 3, 7.5); the house across has its front at z 11, its east wall by the strip (x 9).
module.exports.shots = {
  pov: { pov: true },
  // S01: the crane over the whole village toward the dawn: from 34 up over the west edge to 22 up over the bell
  s01: { path: [[0, -30, 34, -6], [3.2, 12, 22, -4]], lookPath: [[0, 20, 8, -4], [3.2, 60, 6, -4]], ease: true, fov: 60, dof: false },
  // S02: low along the street, a slow dolly east, the posts and the roofs
  s02: { path: [[0, -14, 3.2, 7.5], [4.4, -7.5, 3.4, 7.5]], lookPath: [[0, 0, 1.2, 3], [4.4, 20, 12, -10]], ease: true, fov: 50, dof: false },
  // S03: the meeting point, the golem among the torches
  s03: { at: [14, 11.2, 8], look: [20, 11.5, 0], fov: 50, push: 0.3, dof: false, subject: [[20, 11.5, 2]] },
  // S05: the flashback crane down to Jonah at his gate, looking west into the low sun
  s05: { path: [[0, -4, 9, 7.5], [3, -5.5, 4.5, 7.5]], lookPath: [[0, -13, 4, 7.5], [3, -13, 4, 7.5]], ease: true, fov: 50, dof: false, mood: 'flashback', subject: ['actor:Jonah'] },
  // S06: our door at sunset, wide, looking north; the kid at frame right on the path
  s06: { at: [1.6, 3.9, 9.6], look: [0.8, 1.3, -0.5], fov: 55, push: 0.1, dof: false, mood: 'flashback', subject: ['actor:Jonah'] },
  // S07: Jonah medium by his chests at dusk
  s07: { at: [-13.2, 4.7, 9.6], look: [-15.5, 4.4, 6.5], fov: 50, push: 0.2, mood: 'flashback', subject: ['actor:Jonah'] },
  // S08: behind the kid on our doorstep, looking west down the street
  s08: { at: [1.8, 2.4, 3.2], look: [-12, 2.2, 6.5], fov: 55, dof: false, mood: 'flashback', subject: ['actor:Jonah'] },
  // S11: the plot at dawn from the S05 angle, a slow descending push
  s11: { path: [[0, -3, 6, 7.5], [3, -4.5, 4.8, 7.5]], lookPath: [[0, -17, 3, 6], [3, -17, 3, 6]], ease: true, fov: 50, dof: false },
  // S13: the follow: behind the kid, 6 back, 1.6 up
  s13: { follow: 'self', offset: [0, 1.6, 6], lag: 0.3, look: 'self', fov: 55, dof: false },
  // S14: the same axis as S06, closer: the last torch, the wave
  s14: { at: [1.3, 3.5, 6.3], look: [0.8, 1.2, -0.5], fov: 50, push: 0.08, dof: false, subject: ['actor:Jonah'] }
}
