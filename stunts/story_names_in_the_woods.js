// Story Short "why do these zombies have NAMES 😶" (stories/names_in_the_woods, story.json v2). Every night three
// zombies named TOMAS, GRETA and OLD BEN walk out of the woods and stare at Mom over the hamlet's fence. Everyone here
// gets a name tag; Mom's says ROSA. "Our neighbors moved to the CITY." Every week she takes them a golden apple and a
// splash potion and brings them back; nobody here can throw, so I win every egg fight. Tonight she's late: FOUR zombies
// walk out, and the new one says ROSA, still holding the apple. She lets the potion fall for me. "I CAN. Potion, then
// APPLE." (vanilla: a converted villager keeps its name and what it held; only a player can throw the cure.)
//
// The place is canon: Oakend (docs/world/map.json `oakend`), a hamlet on the North Inlet's west bank facing Fernbank,
// built by world.build at its canonical spot; the gate O = (-505, 63, -1054); +x east into the hamlet, -x west up the
// meadow to the dark oaks. The fence, gate, lane, meadow path, lamp post, treeline and cast are this stunt's
// (map.json oakend.story_builds). The narrator is the bot (Remy, a kid player: default Steve skin, nameplate in the
// camera shots); every villager and zombie is a NoAI mob with an always-visible name tag.
const path = require('path')
const world = require('../lib/world')
const sets = require('../lib/sets')
const { storyLines, storyKit, setKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'names_in_the_woods')
const CAPTION = 'why do these zombies have NAMES 😶'
const X = -505, Z = -1054, F = 63
const POTION = '{"minecraft:potion_contents":{potion:"minecraft:weakness"}}'

// the camera shots, offsets from O = (X, F, Z) (y from the gate's ground block; the meadow is 4 up from x -10 on)
const shots = {
  pov: { pov: true },
  // S01 / S11: just inside the gate looking west up the meadow at the zombies 14-16 blocks out, the treeline behind
  gate_west: { at: [2.2, 6.2, 0.2], look: [-14, 6.4, 0], fov: 50, push: 0.4, dof: false },
  // S02: over Mom's left shoulder at the shut gate, the three staring at her over the fence
  ots_mom: { at: [4.0, 2.8, 1.15], look: [-1.5, 2.6, -0.2], fov: 50, dof: { aperture: 0.6, focus: [-1.5, 2.4, 0] } },
  // S03: crane down from over the lane (the hamlet, the inlet, Fernbank and its empty boat at frame right) to Mom
  crane: { dof: false, path: [[0, 4, 14, 0], [2.0, 5.5, 3.6, 1.8], [3.8, 5.5, 3.3, 1.3]], lookPath: [[0, 40, 2, 9], [2.0, 5.5, 2.4, -4.4], [3.8, 5.5, 2.4, -4.4]], ease: true, fov: 50 },
  // S04: a back corner of Mom's room, her at the west window
  inside: { at: [11.3, 2.7, -14.4], look: [5.4, 2.2, -16.4], fov: 58, dof: false },
  // S06: over the garden fence, down on Mom at her brewing stand
  brew: { at: [8.5, 4.6, -5.3], look: [8.5, 1.6, -10.2], fov: 50, push: 0.3, dof: { aperture: 0.6, focus: [8.5, 1.8, -10.4] } },
  // S07: inside the hamlet, looking west through the open gate at the bright meadow
  gate_out: { at: [6.5, 3.0, 0.6], look: [-6, 3.4, 0], fov: 50, dof: false },
  // S10: high behind the gate, pushing in over the meadow: Mom walks into the trees, the low sun over them
  meadow: { path: [[0, 3.2, 9.0, 0.6], [6, -1.0, 8.0, 0.4]], lookPath: [[0, -26, 5.5, 1.2], [6, -27, 5.8, 1.6]], ease: true, fov: 40, dof: false },
  // S12: in front of ROSA by the lamp post, looking slightly up at her as she shambles in
  rosa: { path: [[0, -12.6, 6.8, 0.6], [3, -12.1, 6.8, 0.7]], lookPath: [[0, -16.6, 7.0, 0], [3, -16.1, 7.0, 0]], fov: 50, dof: { aperture: 0.6, focus: { of: [-16, 6.6, 0], offset: [0, 0, 0] } } },
  // S14: low behind ROSA's right shoulder looking east down the meadow: Remy with the potion, home behind him
  ots_rosa: { at: [-17.6, 5.7, 1.0], look: [-12.5, 6.4, 0], fov: 50, dof: { aperture: 0.5, focus: [-12.5, 6.2, 0] } }
}

module.exports = {
  name: 'story_names_in_the_woods',
  caption: CAPTION,
  time: 13000,
  botTimeout: 900,
  renderDistance: 10, recordRadius: 128,
  hideHand: false,             // Remy is a player: his hand holds the eggs, the potion
  selfName: 'Remy',
  nameTags: ['Remy'],          // his player nameplate in the camera shots (the mobs' tags are CustomNameVisible)
  cast: { self: 'steve' },
  idleLife: true,
  wideMaster: true,            // a 16:9 master cropped to the Short's middle frame (owner, 2026-11-10)
  look: 'auto',
  shots,
  edit: { caption: CAPTION, red: 'NAMES', story: 'stories/names_in_the_woods', startAt: 'line:0', endAfter: 'story_end:0', itemNames: { splash_potion: 'Splash Potion of Weakness' } },

  async setup (ctx) {
    const { bot } = ctx
    Object.assign(this, { X, Z, F })
    const { c } = setKit(ctx, { X, Z, F })
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await ctx.defaultRules()
    for (const g of ['log_admin_commands false', 'random_tick_speed 0', 'mob_griefing false']) await c(`/gamerule ${g}`)
    await c('/difficulty normal')
    await c('/time set 6000')
    // the hamlet's ground and the meadow are cleared of the wood first (the pieces fit the land as they land)
    await sets.forceload(ctx, X - 70, Z - 40, X + 60, Z + 40)
    await c(`/tp @s ${X + 10} ${F + 30} ${Z}`)
    await bot.waitForTicks(60)
    await sets.dress.clearTrees(ctx, { x0: X - 30, z0: Z - 26, x1: X + 52, z1: Z + 24, y0: F - 3, y1: F + 30 })
    const W = await world.build(ctx, { story: 'names_in_the_woods' })
    const P = W.places.oakend.pieces
    this.anchors = Object.fromEntries(Object.entries(P).map(([k, s]) => [k, s.anchors]))
    await c(`/kill @e[type=!player,tag=!canon,x=${X},y=${F},z=${Z},distance=..64]`)
    await c('/kill @e[type=item]')
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz) + 1 - F   // feet height over F

    // the west fence and gate (x = 0, z -22..22), lantern posts either side, the lane, the meadow path, the lamp post
    await sets.dress.fence(ctx, [[X, Z - 22], [X, Z - 1]], { block: 'oak_fence' })
    await sets.dress.fence(ctx, [[X, Z + 1], [X, Z + 22]], { block: 'oak_fence' })
    await c(`/setblock ${A(0, gy(0, 0), 0)} oak_fence_gate[facing=west,open=false]`)
    for (const dz of [-2, 2]) await sets.dress.lamp(ctx, X, Z + dz, { h: 3, fence: 'oak_fence' })
    await sets.dress.path(ctx, [[X + 1, Z], [X + 47, Z]], { w: 3 })
    for (const k of ['mom', 'hugo', 'pia', 'tomas', 'greta', 'oldben']) { const g = this.anchors[k].gate || this.anchors[k].doorstep || this.anchors[k].street; if (g) await sets.dress.path(ctx, [[Math.floor(g.x), Math.floor(g.z)], [Math.floor(g.x), Z]], { w: 2 }) }
    for (const dx of [12, 34]) await sets.dress.lamp(ctx, X + dx, Z - 3, { h: 3 })
    await sets.dress.path(ctx, [[X - 1, Z], [X - 15, Z + 1], [X - 30, Z + 2]], { w: 2 })
    await sets.dress.lamp(ctx, X - 15, Z + 2, { h: 3 })
    await sets.dress.rocks(ctx, X - 8, Z - 9); await sets.dress.rocks(ctx, X - 20, Z + 10)
    await sets.dress.flowers(ctx, { x: X - 14, z: Z, r: 13, n: 50 })
    // the dark oak wall the zombies walk out of, across the frame's width at x -31 and beyond
    for (const [dx, dz] of [[-32, -14], [-33, -8], [-32, -3], [-33, 4], [-32, 9], [-33, 15], [-36, -18], [-37, -11], [-36, 0], [-38, 6], [-37, 12], [-36, 19], [-41, -14], [-42, -5], [-41, 2], [-42, 9], [-41, 16], [-46, -9], [-47, 0], [-46, 6], [-47, 13], [-31, -20], [-31, 20]]) await sets.dress.tree(ctx, X + dx, Z + dz, 'dark_oak')
    await sets.dress.grove(ctx, { x: X - 55, z: Z, r: 22, n: 40, kinds: ['dark_oak'] })
    await sets.dress.grove(ctx, { x: X - 30, z: Z - 32, r: 12, n: 12, kinds: ['dark_oak', 'oak'] })
    await sets.dress.grove(ctx, { x: X - 30, z: Z + 32, r: 12, n: 12, kinds: ['dark_oak', 'oak'] })
    await c(`/fill ${A(-29, gy(-29, 2) - 1, -1)} ${A(-1, gy(-1, 0) + 12, 3)} air replace #minecraft:leaves`)   // nothing over the path

    // Mom's cottage (local -> world: x + 2 - 8 + 8 = dx, z - 21): the brewing stand by the door, the west window's
    // shutters (staged in L04), the kitchen chest's gift (L08)
    for (const pl of ['lilac', 'rose_bush', 'peony', 'tall_grass']) await c(`/fill ${A(6, 1, -10)} ${A(11, 2, -6)} air replace ${pl}`, { mayFail: true })   // the tall flowers in front of her (S06)
    await c(`/setblock ${A(8, 1, -10)} brewing_stand[has_bottle_0=true,has_bottle_1=true,has_bottle_2=true]`)
    await c(`/fill ${A(5, 2, -18)} ${A(5, 3, -17)} air`)
    await c(`/setblock ${A(11, 1, -14)} chest[facing=north]{Items:[{Slot:12b,id:"minecraft:splash_potion",count:1,components:${POTION}},{Slot:14b,id:"minecraft:golden_apple",count:1}]}`)
    // the empty row: signs at the gates, shutters closed, overgrown, a cobweb, the job blocks
    const NAMES = { tomas: 'TOMAS', greta: 'GRETA', oldben: 'OLD BEN' }
    for (const [k, nm] of Object.entries(NAMES)) {
      const a = this.anchors[k], g = a.gate
      await c(`/setblock ${Math.floor(g.x) + 1} ${Math.floor(g.y)} ${Math.floor(g.z) - 1} oak_sign[rotation=8]{front_text:{messages:['""','"${nm}"','""','""']}}`)
      await sets.dress.grass(ctx, { x: Math.floor(a.garden ? a.garden.x : g.x), z: Math.floor(a.garden ? a.garden.z : g.z), r: 5, n: 50, tall: 0.6 })
      const d = a.door; await c(`/setblock ${Math.floor(d.x)} ${Math.floor(d.y) + 1} ${Math.floor(d.z)} cobweb keep`)
    }
    await c(`/setblock ${Math.floor(this.anchors.tomas.doorstep.x) + 2} ${Math.floor(this.anchors.tomas.doorstep.y)} ${Math.floor(this.anchors.tomas.doorstep.z)} composter`)
    await c(`/setblock ${Math.floor(this.anchors.greta.doorstep.x) + 2} ${Math.floor(this.anchors.greta.doorstep.y)} ${Math.floor(this.anchors.greta.doorstep.z)} lectern[facing=north]`)
    await c(`/setblock ${Math.floor(this.anchors.oldben.doorstep.x) + 2} ${Math.floor(this.anchors.oldben.doorstep.y)} ${Math.floor(this.anchors.oldben.doorstep.z)} barrel[facing=up]`)
    await c('/kill @e[type=item]')

    // the cast. Villagers wear their tags (CustomNameVisible); every one NoAI, silent, invulnerable
    const tagged = (type, tag, name, x, z, yaw, more = '') => c(`/summon ${type} ${(X + x).toFixed(2)} ${F + gy(x, z)} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["${tag}"],CustomName:"${name}",CustomNameVisible:1b,Rotation:[${yaw}f,0f]${more ? ',' + more : ''}}`)
    const vd = (prof, extra = '') => `VillagerData:{type:"minecraft:plains",profession:"minecraft:${prof}",level:2}${extra}`
    await tagged('villager', 'mom', 'ROSA', 5.5, -4.5, 0, vd('cleric'))
    await c(`/summon villager ${X - 10} ${F - 12} ${Z} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["momb"],CustomName:"ROSA",CustomNameVisible:1b,${vd('cleric')}}`)
    await tagged('villager', 'hugo', 'HUGO', 22, -6, 0, vd('farmer'))
    await tagged('villager', 'pia', 'PIA', 30, -5, 20, vd('shepherd'))
    await tagged('villager', 'nell', 'NELL', 38, -3, -30, vd('armorer'))
    await tagged('villager', 'teo', 'LIL TEO', 16, 2, -90, vd('none', ',Age:-2000000'))
    // the zombies wait in a dark pocket under the meadow (they'd burn in the sun)
    await c(`/fill ${A(-14, -12, -4)} ${A(-6, -9, 4)} air`)
    const zv = (tag, name, prof, x, more = '') => c(`/summon zombie_villager ${X + x} ${F - 12} ${Z} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["${tag}"],CustomName:"${name}",CustomNameVisible:1b,${vd(prof)}${more ? ',' + more : ''}}`)
    await zv('z1', 'TOMAS', 'farmer', -12); await zv('z2', 'GRETA', 'librarian', -10); await zv('z3', 'OLD BEN', 'fisherman', -8)
    await zv('rosa', 'ROSA', 'cleric', -13, `equipment:{mainhand:{id:"minecraft:golden_apple",count:1},offhand:{id:"minecraft:splash_potion",count:1,components:${POTION}}}`)

    // Remy: eggs in slot 1, Mom's golden apples (six weeks of them) in slot 2
    await c('/clear @s')
    await c('/item replace entity @s hotbar.0 with egg 16')
    await c('/item replace entity @s hotbar.1 with golden_apple 6')
    bot.setQuickBarSlot(0)
    await ctx.tpCheck(X + 9.5, F + gy(9, 2) , Z + 2.5, 90, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await c('/effect give @s resistance infinite 255 true')
    await c('/effect give @s saturation infinite 255 true')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F }, { warm: null })
    const { look, line, say } = K
    const gy = (dx, dz) => groundAt(ctx, X + dx, Z + dz) + 1 - F
    const P = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
    const actor = (tag, s) => K.actor(tag, { ...s, y: s.y ?? gy(s.x, s.z) })
    const walk = (a, dx, dz) => { K.step(a, dx, dz); a.y = gy(a.x, a.z) }
    const face = (a, x, z) => { a.yaw = K.mcYaw(x - a.x, z - a.z) }
    const hide = (tag) => { K.actors.delete(tag); say(`/tp @e[tag=${tag}] ${X - 10} ${F - 12} ${Z}`) }   // back to the dark pocket
    const hand = (tag, item) => say(`/item replace entity @e[tag=${tag},limit=1] weapon.mainhand with ${item}`)
    const cutAt = (dx, dz, target, o) => K.cut(dx, dz, target, gy(dx, dz), o)
    const groans = (k, every = 23) => { if (k % every === 5) K.groan(0.35, 0.8 + (k % 3) * 0.1, 'zombie_villager') }
    const autoJump = () => {
      const p = bot.entity.position, yw = bot.entity.yaw, ax = p.x - Math.sin(yw) * 0.8, az = p.z - Math.cos(yw) * 0.8
      const b = bot.blockAt(new ctx.Vec3(Math.floor(ax), Math.floor(p.y + 0.1), Math.floor(az)))
      K.ctl('jump', !!(b && b.boundingBox === 'block'))
    }
    const zs = [['z1', -12, -1.5], ['z2', -13, 0], ['z3', -11, 1.5]]
    const zombies = {}

    // L01 (S01): dusk, the meadow from inside the gate; three named zombies walking out of the woods toward us
    for (const [t, x, z] of zs) { zombies[t] = actor(t, { x, z, yaw: -90 }) }
    await cutAt(8.5, 3.5, P(-14, 5, 0), { time: 13100, shot: 'gate_west' })
    await K.preroll(8, () => { for (const t in zombies) walk(zombies[t], 0.03, 0) })
    let mom = null
    await line('L01', async (k) => { for (const t in zombies) walk(zombies[t], 0.03, 0); groans(k); look(k) },
      0, { tail () { mom = actor('mom', { x: 1.5, z: 0.2, yaw: 90 }) } })   // under the high camera, out of its frame

    // L02 (S02): at the fence; they stop 1.5 out and stare at Mom over it (Mom 1.5 inside, back to us)
    for (const [t, z] of [['z1', -1], ['z2', 0.5], ['z3', 2]]) Object.assign(zombies[t], { x: -1.5, z, yaw: -90, y: gy(-1.5, z) })
    await cutAt(8.5, 3.5, P(-1, 2, 0), { time: 13150, shot: 'ots_mom' })
    await line('L02', async (k) => { for (const t in zombies) face(zombies[t], mom.x, mom.z); groans(k, 19); look(k) })

    // Mom is two villagers (A 'mom', B 'momb', both tagged ROSA): each scene's Mom is put in place during the line
    // before, out of that shot's view, so she's there on the cut's first frame (a /tp lands a few ticks late)
    let momB = null

    // L03 (S03): midday, the crane down over the hamlet to Mom at her garden gate; neighbours walk the lane
    for (const t in zombies) hide(t)
    Object.assign(mom, { x: 5.5, z: -4.4, yaw: 0, y: gy(5.5, -4.4) })
    const hugo = actor('hugo', { x: 13, z: -1.2, yaw: 90 }), pia = actor('pia', { x: 16, z: -0.4, yaw: 90 })
    const teo = actor('teo', { x: 24, z: 3.5, yaw: 180 }), nell = actor('nell', { x: 33, z: -2, yaw: 90 })
    await cutAt(-5, 0.5, P(10, 2, 0), { time: 6000, shot: 'crane' })
    await line('L03', async (k) => {
      walk(hugo, -0.05, 0); walk(pia, -0.045, 0); walk(teo, 0, -0.12); walk(nell, -0.03, 0.01)
      if (teo.z < -4) teo.z = -4
      look(k)
    }, 0, { tailAt: 3, tail () { momB = actor('momb', { x: 6.6, z: -15.6, yaw: 55, y: 1 }) } })   // inside: the floor is the piece's (F)

    // L04 (S04): dusk, a later night, inside: Mom at her west window, the three tags at the fence beyond it; on
    // "STOLE" the shutters swing shut
    for (const t of ['hugo', 'pia', 'teo', 'nell']) K.bury(t)
    for (const [t, z] of [['z1', -16], ['z2', -17.6], ['z3', -19.2]]) { zombies[t] = actor(t, { x: -1.6, z, yaw: -90 }) }
    await cutAt(-5, 0.5, P(0, 2, -10), { time: 13250, shot: 'inside' })
    await line('L04', async (k, at) => {
      if (k === at(1)) {
        for (const z of [-18, -17]) for (const y of [2, 3]) say(`/setblock ${X + 5} ${F + y} ${Z + z} spruce_trapdoor[facing=east,open=true,half=bottom]`)
        ctx.sound('block.wooden_trapdoor.close', 0.8, 1)
      }
      if (k > at(1)) momB.yaw = Math.max(-20, momB.yaw - 6)   // she turns from the window
      look(k)
    }, 0, { tail () { Object.assign(mom, { x: 12, z: 2.5, yaw: 90, y: gy(12, 2.5) }) } })

    // L05 (S05): morning, POV in the lane: Mom says it, the three empty cottages behind her
    for (const t in zombies) hide(t)
    await cutAt(4.5, 0.4, P(12, 2.9, 2.8), { time: 2500, shot: 'pov' })
    const from5 = K.base
    await line('L05', async (k) => { K.turnTo(from5, P(16, 3.4, 4.5), k / K.T('L05')); look(k) },
      0, { tail () { Object.assign(momB, { x: 8.5, z: -10.6, yaw: 0, y: 1 }); hand('momb', 'golden_apple') } })   // under the eaves: the garden's ground (F)

    // L06 (S06): Mom at her brewing stand, the golden apple in her arms; on "SPLASH POTION" a bottle is gone
    await cutAt(-5, 0.5, P(8, 2, -10), { time: 3000, shot: 'brew' })
    await line('L06', async (k, at) => {
      if (k === at(3)) { say(`/setblock ${X + 8} ${F + 1} ${Z - 10} brewing_stand[has_bottle_0=true,has_bottle_1=true,has_bottle_2=false]`); ctx.sound('block.brewing_stand.brew', 0.3, 1.4) }
      if (k > at(3)) momB.yaw = 15 * Math.sin((k - at(3)) / 8)
      look(k)
    }, 0, { tail () {
      Object.assign(mom, { x: 0.6, z: 0.3, yaw: 90, y: gy(0.6, 0.3) }); hand('mom', 'golden_apple')
      say(`/setblock ${X} ${F + gy(0, 0)} ${Z} oak_fence_gate[facing=west,open=true]`)   // she opens it (she's in it)
    } })

    // L07 (S07): she goes out through the open gate, turning back to me on "she says"
    await cutAt(11, 0.5, P(0, 2, 0), { time: 3200, shot: 'gate_out' })
    await line('L07', async (k, at) => {
      if (k >= at(2) && k < at(3)) face(mom, 6.5, 0.6)
      else { walk(mom, -0.06, 0); mom.yaw = 90 }
      look(k)
    }, 0, { tail () { Object.assign(momB, { x: 6.6, z: -15.6, yaw: 55, y: 1 }); hand('momb', 'air') } })

    // L08 (S08): late afternoon, POV at the kitchen chest: the potion and the apple, brought back; I take the apple
    await K.cutTo(10.5, F + 1, -15.6, P(11.5, 0.9, -13.5), { time: 11000, shot: 'pov' })
    let chest = null
    let hugo9 = null, pia9 = null
    await line('L08', async (k, at) => {
      if (k === 1) { const b = bot.blockAt(P(11, 1, -14)); if (b) bot.openContainer(b).then(w => { chest = w }).catch(e => ctx.log('chest:', e.message)) }
      if (k === at(3) && chest) {
        const s = chest.slots.findIndex((it, i) => it && it.name === 'golden_apple' && i < chest.inventoryStart)
        if (s >= 0) bot.clickWindow(s, 0, 1).catch(e => ctx.log('take:', e.message))
        ctx.sound('entity.item.pickup', 0.4, 1.2)
      }
      look(k)
    }, 0, { tail () {
      hugo9 = actor('hugo', { x: 19, z: 0.3, yaw: 90 }); pia9 = actor('pia', { x: 19.6, z: -1.6, yaw: 90 })
      Object.assign(mom, { x: -21, z: 1.2, yaw: 90, y: gy(-21, 1.2) })
    } })
    if (chest) { bot.closeWindow(chest); chest = null }
    await bot.waitForTicks(2)

    // L09 (S09): midday, POV in the lane: two eggs pop on Hugo and Pia, who just stand there
    hide('momb')
    bot.setQuickBarSlot(0)
    await cutAt(12, 0.2, P(19, 2.2, -0.2), { time: 6000 })
    const from9 = K.base
    await line('L09', async (k, at) => {
      say('/kill @e[type=chicken]')
      if (k === at(1) - 3) { K.base = K.aim(P(hugo9.x, hugo9.y + 1.7, hugo9.z)); bot.look(K.base.yaw, K.base.pitch, true); bot.activateItem() }
      if (k > at(1) && k < at(3) - 3) K.turnTo(from9, P(pia9.x, pia9.y + 1.6, pia9.z), (k - at(1)) / 10)
      if (k === at(3) - 3) { K.base = K.aim(P(pia9.x, pia9.y + 1.6, pia9.z)); bot.look(K.base.yaw, K.base.pitch, true); bot.activateItem() }
      look(k)
    })
    say('/kill @e[type=chicken]')
    K.bury('hugo'); K.bury('pia')

    // L10 (S10): tonight, late afternoon: from high behind the gate, Mom walks up the meadow into the dark oaks;
    // me small at the gate. On "DARK" she's under the first trees
    const momW = mom
    await cutAt(1.2, 1.4, P(-20, 4, 1), { time: 11800, shot: 'meadow' })
    const n10 = K.T('L10')
    await line('L10', async (k) => { walk(momW, -9 / n10, 0.8 / n10); look(k) })
    hide('mom')

    // L11 (S11): the S01 shot again, darker: FOUR zombies; ROSA first and nearest, the three behind her
    const rosa = actor('rosa', { x: -18.6, z: 0, yaw: -90 })
    for (const [t, x, z] of [['z1', -21.5, -2], ['z2', -22.5, 1], ['z3', -23.5, 3]]) zombies[t] = actor(t, { x, z, yaw: -90 })
    await cutAt(8.5, 3.5, P(-14, 5, 0), { time: 13400, shot: 'gate_west' })
    await line('L11', async (k) => { walk(rosa, 0.025, 0); for (const t in zombies) walk(zombies[t], 0.02, 0); groans(k, 17); look(k) })

    // L12 (S12): in front of her by the lamp post: ROSA's tag, the apple in her right hand, the potion in her left
    Object.assign(rosa, { y: gy(rosa.x, 0) })   // she walks on from where S11 left her
    for (const [t, x, z] of [['z1', -20, -2], ['z2', -21, 1], ['z3', -22, 3]]) Object.assign(zombies[t], { x, z, y: gy(x, z) })
    await cutAt(-8, 0.4, P(-16, 6, 0), { time: 13400, shot: 'rosa' })
    const v12 = Math.max(0, (-16 - rosa.x) / K.T('L12'))
    await line('L12', async (k) => { if (rosa.x < -16) walk(rosa, v12, 0); rosa.yaw = -90; groans(k, 29); look(k) })

    // L13 (S13): POV from the path: she looks at the bottle, at me, and lets it fall toward me; I run and grab it
    Object.assign(rosa, { x: -16, z: 0, y: gy(-16, 0) })
    bot.setQuickBarSlot(1)
    await cutAt(-8, 0.1, P(-16, gy(-16, 0) + 1.5, 0), { time: 13450, shot: 'pov' })
    const from13 = K.base
    let ran = false
    await line('L13', async (k, at) => {
      if (k < at(0)) { rosa.pitch = 35; rosa.yaw = -90 }                 // looking down at the bottle in her left hand
      if (k >= at(0) - 6 && k < at(0)) rosa.pitch = 35 - (k - at(0) + 6) * 6   // then up at me
      if (k === at(0)) {
        rosa.pitch = 5
        say('/item replace entity @e[tag=rosa,limit=1] weapon.offhand with air')
        say(`/summon item ${(X - 15.55).toFixed(2)} ${(F + gy(-16, 0) + 1.0).toFixed(2)} ${(Z - 0.35).toFixed(2)} {PickupDelay:8,Motion:[0.17,0.18,0.03],Item:{id:"minecraft:splash_potion",count:1,components:${POTION}}}`)
      }
      if (k === at(1) + 4 && !ran) { ran = true; K.ctl('sprint', true); K.go(true) }
      if (ran) {
        autoJump()
        if (ran === true && (bot.entity.position.x <= X - 13.6 || bot.inventory.slots.some(it => it && it.name === 'splash_potion'))) { K.stop(); ran = 'done' }
        const it = Object.values(bot.entities).find(e => e.name === 'item' && e.position.distanceTo(bot.entity.position) < 8)
        const aim = K.aim(it ? it.position.offset(0, 0.3, 0) : P(-16, gy(-16, 0) + 0.5, 0))
        K.base = { yaw: aim.yaw, pitch: Math.max(-0.6, aim.pitch) }   // run at the bottle on the path, never looking straight down
      } else K.turnTo(from13, P(-14.5, gy(-14.5, 0) + 0.3, 0), Math.min(1, k / 10))
      if (ran === 'done') { K.base = K.aim(P(-16, gy(-16, 0) + 1.6, 0)) }
      const slot = bot.inventory.slots.findIndex((it, i) => it && it.name === 'splash_potion' && i >= 36 && i < 45)
      if (slot >= 0 && bot.quickBarSlot !== slot - 36) { bot.setQuickBarSlot(slot - 36); ctx.sound('entity.item.pickup', 0.6, 1) }
      for (const t in zombies) face(zombies[t], -12.5, 0)
      look(k)
    })
    K.stop()
    say('/kill @e[type=item]')
    // if the pickup missed, the potion is in his hand anyway (the line said so)
    if (!bot.inventory.slots.some(it => it && it.name === 'splash_potion')) { say(`/item replace entity @s hotbar.2 with splash_potion[potion_contents={potion:"minecraft:weakness"}]`); await bot.waitForTicks(2) }
    bot.setQuickBarSlot(2)

    // L14 (S14): low behind ROSA's right shoulder, looking east: me with the potion, home's lights behind me
    rosa.yaw = -90; rosa.pitch = 0
    await cutAt(-12.5, 0.1, P(-16, gy(-16, 0) + 1.6, 0), { shot: 'ots_rosa' })
    await line('L14', async (k) => { look(k, 0, 0); groans(k, 31) })

    // L15 (S15): POV: the wind-up on "I CAN", the throw on "Potion" (it shatters on her: the payoff), then the apples
    await cutAt(-12.5, 0.1, P(-16, gy(-16, 0) + 1.3, 0), { shot: 'pov' })
    let thrown = false
    await line('L15', async (k, at) => {
      if (k < at(1) - 2) look(k, 0, -0.08 * Math.min(1, k / 8))       // the wind-up: the eye lifts a little
      if (k === at(1) - 2 && !thrown) {
        thrown = true
        K.base = K.aim(P(-16, gy(-16, 0) + 1.2, 0)); await bot.look(K.base.yaw, K.base.pitch + 0.12, true)
        bot.activateItem()
      }
      if (k === at(2)) bot.setQuickBarSlot(1)
      if (k >= at(1) - 2) look(k)
    })
    ctx.mark('story_end')
    await bot.waitForTicks(6)
    return true
  }
}

// The ground's top solid block at (x, z), ignoring plants, leaves, logs, fences, lanterns, signs and paths' edges
function groundAt (ctx, x, z) {
  const { bot } = ctx
  for (let y = 120; y > 40; y--) {
    const b = bot.blockAt(new ctx.Vec3(Math.floor(x), y, Math.floor(z)))
    if (!b) continue
    if (b.name === 'dirt_path' || b.name === 'farmland') return y
    if (b.boundingBox !== 'block' || /_leaves$|_log$|fence|lantern|sign|wall|brewing/.test(b.name)) continue
    return y
  }
  return 63
}
