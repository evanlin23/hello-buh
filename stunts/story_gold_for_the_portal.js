// Story Short "why does grandma feed the nether portal 😶" (stories/gold_for_the_portal, story.json v2).
// Every night Grandma throws one gold ingot into the Nether portal in the cellar and every morning a gift comes back
// (obsidian, string, ender pearls, fire resistance: the piglin barter list). Grandpa walked into that portal 25 years
// ago in her gold helmet with the blue stripe. Nico is sure he's alive and trading. Grandma: "Just one, Nico. One's
// plenty." He throws in a whole stack to buy Grandpa's way home; a piglin steps out, shaking, wearing Grandpa's
// helmet. Grandma tosses it one more ingot and it turns after the gold: she sends it home.
//
// The place is canon (docs/world/map.json portal_cottage, day 9300): world.build puts the spruce cottage on the
// hill's east shoulder north of Hushwell and the cellar (library basement, portal: 'nether', gifts) under it.
// O = (X, F, Z) is the cellar piece's local origin, F its floor: the props in story.json are cellar-local. The
// cottage floor is 11 above it (the cellar is sunk 5 deeper than usual, a ladder shaft up to the hatch: the slope). The
// flashback (S06-S07) is a bare copy of the same cellar 30 blocks under it (DOWN), built here, story-only.
// The narrator is the recording bot (Steve, golden boots); Grandpa is a player actor (ari skin); Grandma is a NoAI
// librarian; the piglin a NoAI piglin in Grandpa's trimmed helmet (engine: armour on mobs, trims, the shake).
const path = require('path')
const M = require('../lib/movie')
const world = require('../lib/world')
const sets = require('../lib/sets')
const { storyLines, storyKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'gold_for_the_portal')
const CAPTION = 'why does grandma feed the nether portal 😶'
const NIGHT = 18000, RIDGE_NIGHT = 14500, MORNING = 1000
const X = -132, Z = -943, F = 74          // the cellar's local origin (map.json: basement centre -126,-938 at y 80)
const DOWN = -30                          // the flashback cellar, 30 blocks under the real one
const HELMET = 'golden_helmet[trim={pattern:"minecraft:sentry",material:"minecraft:lapis"}]'
const POCKET = [6, -12, 5]                // where the narrator waits while he's not in a camera shot (under the cellar)

module.exports = {
  name: 'story_gold_for_the_portal',
  caption: CAPTION,
  time: NIGHT,
  botTimeout: 600,
  renderDistance: 12, recordRadius: 150,
  wideMaster: true,
  idleLife: true,
  cast: { Grandpa: 'ari' },
  selfArmor: ['golden_boots', null, null, null],   // Grandma's rule: Nico wears golden boots (never said)
  look: 'auto',
  shots: {},   // below
  edit: { caption: CAPTION, red: 'portal', story: 'stories/gold_for_the_portal', startAt: 'line:0', endAfter: 'story_end:-0.17', punch: [['story_end:-1.12', 0, 0.08]] },   // the punch: on 'HELMET' (the payoff, L11+1.52)
  // the whole area, Hushwell's plaza (S05's background, ~95 blocks SSW) included
  chunkStops (set) { return [[0, 0], [-30, 60], [-22, 100], [40, 0], [0, -40], [40, 40], [-40, 0]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },

  async setup (ctx) {
    const { bot } = ctx
    const c = (s) => ctx.cmd(s)
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await ctx.defaultRules()
    for (const g of ['log_admin_commands false', 'random_tick_speed 0', 'mob_griefing false', 'allow_entering_nether_using_portals false']) await c(`/gamerule ${g}`)
    await c('/difficulty normal')                              // a piglin is a monster: refused on peaceful
    await c(`/setworldspawn ${A(4, 12, 13)}`)                   // the actor joins here (a far spawn stalled the server)
    await c('/gamerule respawn_radius 0')
    const W = await world.build(ctx, { story: 'gold_for_the_portal' })
    ctx.log(`portal_cottage: ${JSON.stringify(W.places.portal_cottage.origin)}, pieces ${Object.keys(W.places.portal_cottage.pieces).join(' ')}`)
    // the flashback: the same cellar, bare (no gifts, no patches), 30 blocks down (story-only, never seen from outside)
    await sets.place(ctx, 'basement', { x: X + 6, z: Z + 5, y: F + 6 + DOWN, facing: 'south', variant: { portal: 'nether', hatch: false }, fit: false })
    await c(`/fill ${A(1, 1 + DOWN, 1)} ${A(1, 4 + DOWN, 1)} ladder[facing=south]`)   // its ladder, up to a closed ceiling (a hatch hole let an aquifer in)
    await c(`/fill ${A(1, 1 + DOWN, 1)} ${A(11, 4 + DOWN, 9)} air replace water`)
    await c(`/kill @e[type=!player,x=${X + 6},y=${F},z=${Z + 5},distance=..48]`)
    // the gifts barrel and its 25 years of barters; Grandpa's gold chest
    await c(`/data merge block ${A(10, 1, 3)} {CustomName:"Grandpa's Gifts"}`)   // 1.21.5+: the name is a text component in SNBT, a plain string here
    const gifts = [['obsidian', 64], ['crying_obsidian', 23], ['string', 48], ['ender_pearl', 16], ['soul_sand', 40], ['gravel', 64], ['quartz', 52], ['leather', 30], ['iron_nugget', 60], ['blackstone', 64]]
    for (let i = 0; i < gifts.length; i++) await c(`/item replace block ${A(10, 1, 3)} container.${i} with ${gifts[i][0]} ${gifts[i][1]}`)
    for (let i = 0; i < 3; i++) await c(`/item replace block ${A(10, 1, 3)} container.${11 + i} with potion[potion_contents={potion:"minecraft:fire_resistance"}]`)
    for (let i = 0; i < 5; i++) await c(`/item replace block ${A(8, 1, 1)} container.${i * 2} with gold_block 9`)
    await c(`/fill ${A(1, 11, 1)} ${A(1, 11, 1)} spruce_trapdoor[facing=south,half=top,open=false] replace spruce_trapdoor`)   // the hatch, shut at night
    // the narrator's pocket under the cellar
    await c(`/fill ${A(POCKET[0] - 1, POCKET[1] - 1, POCKET[2] - 1)} ${A(POCKET[0] + 1, POCKET[1] + 2, POCKET[2] + 1)} air`)
    await c(`/setblock ${A(POCKET[0], POCKET[1] - 1, POCKET[2])} stone`)

    // the cast: Grandma (tonight), Grandma 25 years ago, the piglin; all NoAI, waiting in the air far east
    const wait = (i) => `${X + 90 + i * 3} ${F + 40} ${Z}`
    const vd = 'VillagerData:{profession:"minecraft:librarian",type:"minecraft:plains",level:2},Xp:1'
    await c(`/summon villager ${wait(0)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["gma"],${vd}}`)
    await c(`/summon villager ${wait(1)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["gma0"],${vd}}`)
    await c(`/summon piglin ${wait(2)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,IsImmuneToZombification:1b,Tags:["pig"],equipment:{head:{id:"minecraft:golden_helmet",count:1,components:{"minecraft:trim":{pattern:"minecraft:sentry",material:"minecraft:lapis"}}}}}`)
    this.cast = await M.spawnActors(ctx, ['Grandpa'])
    await c('/gamemode survival Grandpa')
    await c('/effect give Grandpa resistance infinite 255 true')
    await c(`/item replace entity Grandpa armor.head with air`)
    await M.place(ctx, 'Grandpa', X + 9.6, F + 1 + DOWN, Z + 5.5, 90, 5)
    await c(`/item replace entity Grandpa weapon.mainhand with ${HELMET}`)
    await c(`/tp @e[tag=gma0] ${A(8.2, 1 + DOWN, 3.7)} -60 15`)

    // Nico: golden boots, full hearts, nothing in hand
    await c('/clear @s')
    await c('/item replace entity @s armor.feet with golden_boots')
    await c('/effect give @s resistance infinite 255 true')
    await c('/effect give @s saturation infinite 255 true')
    await ctx.tpCheck(X + 2.3, F + 1, Z + 2.4, -110, 0)   // the ladder's foot: S03's POV (S01-S02 are camera shots)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F }, { warm: null })
    const { P, line, say } = K
    const A = (dx, dy, dz) => `${(X + dx).toFixed(2)} ${(F + dy).toFixed(2)} ${(Z + dz).toFixed(2)}`
    const ent = (name, near) => Object.values(bot.entities).filter(e => e.name === name).sort((a, b) => (near ? a.position.distanceTo(near) - b.position.distanceTo(near) : 0))[0]
    // the portal: purple specks drifting off the sheet, and its hum now and then
    const portalLife = (k, dy = 0) => {
      if (k % 3 === 0) ctx.particles('portal', P(11.4, 1.2 + Math.random() * 2.6 + dy, 5 + Math.random() * 2), { count: 3 })
      if (k % 70 === 0) ctx.sound('block.portal.ambient', 0.25, 0.9 + Math.random() * 0.2)
    }
    // an item thrown from a hand: `from` and `to` cellar-local, `t` ticks in the air (vanilla item: gravity 0.04, drag 0.98)
    const toss = (item, from, to, t, count = 1) => {
      const vx = (to[0] - from[0]) / t, vz = (to[2] - from[2]) / t, vy = (to[1] - from[1]) / t + 0.04 * t / 2
      say(`/summon item ${A(...from)} {Item:{id:"minecraft:${item}",count:${count}},PickupDelay:32767,Motion:[${vx.toFixed(3)},${vy.toFixed(3)},${vz.toFixed(3)}],Tags:["toss"]}`)
    }
    const gone = () => say(`/kill @e[type=item,tag=toss,x=${X + 11},y=${F + 2},z=${Z + 5.5},distance=..1.6]`)   // into the purple
    const gift = (item, at, count = 1, tag = 'gift') => say(`/summon item ${A(...at)} {Item:{id:"minecraft:${item}",count:${count}},PickupDelay:32767,NoGravity:0b,Tags:["${tag}"],Motion:[0d,0d,0d]}`)
    // a cut that doesn't wait for the landing (K.cut does, and every tick it waits stretched the line: pauses between
    // lines, the opening's included). The aim rides on the /tp; look() holds still until the bot has landed
    let landing = null
    const jump = (dx, dz, target, dy = 1) => {
      const x = X + dx, y = F + dy, z = Z + dz, d = target.minus(new ctx.Vec3(x, y + K.eye, z))
      const nb = { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
      ctx.mark('cut')
      say(`/tp @s ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)} ${(180 - (nb.yaw + K.swayY()) * 180 / Math.PI).toFixed(2)} ${(-(nb.pitch + K.swayP()) * 180 / Math.PI).toFixed(2)}`)
      K.base = nb; landing = { x, y, z }
    }
    const landed = () => { if (!landing) return true; const p = bot.entity.position; if (Math.abs(p.x - landing.x) < 0.05 && Math.abs(p.z - landing.z) < 0.05 && Math.abs(p.y - landing.y) < 0.6) { landing = null; return true } return false }
    const look = (k, a = 0, b = 0) => { if (landed()) K.look(k, a, b) }
    const hatch = (open, sound = true) => { say(`/setblock ${X + 1} ${F + 11} ${Z + 1} spruce_trapdoor[facing=south,half=top,open=${open}]`); if (sound) ctx.sound(open ? 'block.wooden_trapdoor.open' : 'block.wooden_trapdoor.close', 0.7, 1) }
    const gma = K.actor('gma', { x: 9.3, y: 1, z: 4.75, yaw: -80, pitch: 10 })     // tonight's Grandma (yaw: mc degrees, -90 = east)
    const SELF = [-1]

    // L01 (S01): the cellar, night. Grandma full-figure at the portal, tonight's ingot already crossing the purple
    K.shot('s01')
    // (a 30-tick preroll, not in the Short: an idle mob's first moves reach the client ~1 s late, so she's warm by frame 1)
    await K.preroll(30, (k) => { if (k === 25) toss('gold_ingot', [9.6, 2.25, 5.0], [11.4, 2.2, 5.5], 8); portalLife(k); const j = Math.max(0, k - 24); gma.pitch = k < 24 ? 20 + 6 * Math.sin(k / 4) : 42 - j * 2; gma.yaw = k < 24 ? -70 + 8 * Math.sin(k / 5) : -60 - j * 1.5 })
    await line('L01', async (k) => { portalLife(k); gma.pitch = k < 14 ? 30 - k * 2 : 4 + 10 * Math.sin((k - 14) / 9); gma.yaw = k < 14 ? -69 - k * 1.6 : -80 + 12 * Math.sin((k - 14) / 13); if (k === 4) gone(); if (k === 3) ctx.sound('block.portal.trigger', 0.12, 1.6) })
    K.base = K.aim(P(11, 2.0, 5.6))

    // L02 (S02): the ridge at night, the crane down to the cottage; on 'MORNING' (S03) the cellar at sunrise, POV from
    // the ladder's foot: the hatch open, and on 'BACK' an obsidian block pops out of the purple
    K.shot('s02')
    K.setTime(RIDGE_NIGHT)
    say(`/summon bat ${A(5, 16, 4)} {PersistenceRequired:1b,Tags:["bat"]}`)
    let from2 = null
    await line('L02', async (k, at) => {
      if (k === at(1) - 2) { hatch(true, false); K.park('gma'); say('/kill @e[type=bat,tag=bat]') }
      if (k === at(1)) { K.setTime(MORNING); ctx.mark('cut'); K.shot('pov') }   // already standing there: no cut, no in-between frames
      if (k > at(1)) { K.go(k > at(1) + 4 && bot.entity.position.x < X + 6.8); portalLife(k) }
      if (k === at(2) + 6) from2 = { ...K.base }
      if (from2) K.turnTo(from2, P(11.2, 1.55, 5.6), (k - at(2) - 6) / 14)   // eyes on the obsidian that came out
      if (k === at(2)) { say(`/summon item ${A(11.1, 1.9, 5.6)} {Item:{id:"minecraft:obsidian",count:1},PickupDelay:32767,Tags:["gift"],Motion:[-0.16d,0.18d,0.02d]}`); ctx.sound('block.portal.trigger', 0.08, 2) }
      if (k === at(2) + 9) ctx.sound('block.stone.step', 0.8, 0.9)
      if (k >= at(1)) look(k)
    })
    K.stop()

    // L03 (S04): three mornings, one gift each, picked up on its word (the hotbar fills slot by slot); then (S05) the
    // garden: Nico at the gate drinking the fire resistance potion, Hushwell's plaza far off across the slope
    say('/kill @e[type=item,tag=gift]')
    const morning = [['obsidian', [9.85, 1.05, 6.15], 1, [8.3, 5.9]], ['string', [9.6, 1.05, 6.6], 1, [8.2, 6.9]], ['ender_pearl', [9.75, 1.05, 6.45], 3, [8.4, 6.1]]]   // the same spot, a little moved each morning
    const pickUp = (i) => { say(`/kill @e[type=item,tag=gift]`); say(`/give @s ${morning[i][0]} ${morning[i][2]}`); ctx.sound('entity.item.pickup', 0.5, 1.1 + i * 0.1) }
    const aimG = (i) => P(9.55 + 0.15 * (morning[i][1][0] - 9.75), 1.3, 6.45)   // the gifts' spot (cellar block 9,1,6), the portal's foot above it
    jump(morning[0][3][0], morning[0][3][1], aimG(0)); gift(...morning[0].slice(0, 3))
    await line('L03', async (k, at) => {
      for (let i = 1; i < 3; i++) if (k === at(i)) { jump(morning[i][3][0], morning[i][3][1], aimG(i)); gift(...morning[i].slice(0, 3)) }
      for (let i = 0; i < 3; i++) if (k === Math.min(at(i) + 17, at(i + 1) - 3)) pickUp(i)
      if (k === at(3)) {
        K.shot('s05')
        say('/item replace entity @s weapon.mainhand with potion[potion_contents={potion:"minecraft:fire_resistance"}]')
        jump(1.5, 10.2, P(-28, 9, 85), 12)
        ctx.mark('pose', { ids: SELF, pose: 'drink' }); ctx.sound('entity.generic.drink', 0.6, 1)
      }
      if (k > at(3) && k % 4 === 0) { ctx.particles('entity_effect', P(1.5 + (Math.random() - 0.5) * 0.6, 12.4 + Math.random() * 1.4, 10.2 + (Math.random() - 0.5) * 0.6), { count: 2, color: 0xE49A3A }); if (k % 8 === 0) ctx.sound('entity.generic.drink', 0.45, 0.95 + Math.random() * 0.1) }
      const bend = [0, 1, 2].map(i => Math.min(at(i) + 17, at(i + 1) - 3)).map(p => Math.max(0, 1 - Math.abs(k - p) / 6)).reduce((a, b) => Math.max(a, b), 0)
      if (k <= at(3)) look(k, 0, -0.14 * bend)
      else look(k, 0.12 * Math.sin((k - at(3)) / 7), Math.min(0.45, (k - at(3)) * 0.03))   // drinking: the head tips back
    })
    ctx.mark('pose_off', { ids: SELF })

    // L04 (S06): 25 years ago (the bare cellar below): Grandpa in front of the new portal, the helmet goes on on
    // 'HELMET'; Grandma's shoulder at frame left
    say('/item replace entity @s weapon.mainhand with air')
    K.shot('s06')
    K.setTime(NIGHT)
    const gma0 = K.actor('gma0', { x: 8.2, y: 1 + DOWN, z: 3.7, yaw: -60, pitch: 15 })
    await line('L04', async (k, at) => {
      portalLife(k, DOWN)
      const G = this.cast.Grandpa
      gma0.pitch = 15 + 8 * Math.sin(k / 12); gma0.yaw = -60 + 6 * Math.sin(k / 16)
      if (k % 2 === 0) G.look(Math.PI / 2 - (k < at(2) ? 0.15 * Math.sin(k / 6) : 0.5 * Math.min(1, (k - at(2)) / 10) + 0.12 * Math.sin((k - at(2)) / 7)), k < at(2) ? -0.75 : -0.75 + 0.85 * Math.min(1, (k - at(2)) / 8), true)
      if (k === at(2) - 3) G.swingArm('right')
      if (k === at(3)) K.shot('s06b')   // 'With a BLUE stripe': close on the helmet
      if (k === at(2)) { say(`/item replace entity Grandpa armor.head with ${HELMET}`); say('/item replace entity Grandpa weapon.mainhand with air'); ctx.sound('item.armor.equip_gold', 0.8, 1) }
    })

    // L05 (S07): wide from the ladder: Grandpa walks into the purple on 'He went IN' and is gone; Grandma alone
    K.shot('s07')
    gma0.x = 8.6; gma0.z = 3.9; gma0.yaw = -100; gma0.pitch = 0
    const gp = { x: 9.0, z: 5.5 }
    say(`/tp Grandpa ${X + gp.x} ${F + 1 + DOWN} ${Z + gp.z} -90 0`)
    await line('L05', async (k, at, n) => {
      portalLife(k, DOWN)
      if (k < at(2) - 6 && k % 2 === 0) this.cast.Grandpa.look(k < at(1) ? 0.3 : -Math.PI / 2, 0.05, true)   // to her, then to the purple
      if (k >= at(2) - 6 && gp.x < 11.6) { gp.x += 0.11; say(`/tp Grandpa ${(X + gp.x).toFixed(3)} ${F + 1 + DOWN} ${(Z + gp.z).toFixed(3)} -90 0`) }
      if (k === at(3)) K.shot('s07b')   // 'He never came BACK': Grandma alone by the portal
      if (k === at(2) + 14) { ctx.particles('portal', P(11.3, 2 + DOWN, 5.5), { count: 40 }); ctx.sound('block.portal.travel', 0.15, 1.2); say(`/tp Grandpa ${X + 60} ${F + 60} ${Z - 80}`) }
      gma0.pitch = 8 * Math.sin(k / 15)
      if (k > at(2) + 14) gma0.yaw = -90 + 6 * Math.sin(k / 10)
      if (k === n - 12) { say('/clear @s'); say('/item replace entity @s armor.feet with golden_boots'); say('/item replace entity @s hotbar.0 with gold_ingot 64'); bot.setQuickBarSlot(0); jump(7.95, 3.5, P(10.5, 1.5, 3.5)) }
    })
    K.park('gma0')

    // L06 (S08): tonight, POV: the gifts barrel opened ("Grandpa's Gifts"), my stack of gold in slot 1; on 'Grandma'
    // (S09) the screen closes and I turn to the portal: she tosses tonight's ingot in on 'TRADING', and a snort
    Object.assign(gma, { x: 6.8, y: 1, z: 7.4, yaw: -90, pitch: 5 }); K.actors.set('gma', gma)
    K.shot('pov')
    let win = null
    bot.openContainer(bot.blockAt(P(10, 1, 3))).then(w => { win = w }).catch(e => ctx.log('barrel:', e.message))
    let from = null
    await line('L06', async (k, at) => {
      portalLife(k)
      if (gma.x < 10.0) K.step(gma, 0.11, -0.02); else gma.yaw = -60
      if (k === at(2) && win) { win.close(); win = null }
      if (k >= at(2)) { from = from || { ...K.base }; K.turnTo(from, P(gma.x, 2.6, gma.z), (k - at(2)) / 7) }
      if (k === at(3) - 4) toss('gold_ingot', [10.25, 2.2, 6.4], [11.4, 2.1, 6.0], 6)
      if (k === at(3) + 4) gone()
      if (k === at(3) + 10) ctx.sound('entity.piglin.ambient', 0.9, 0.95)
      if (k > at(3)) { gma.pitch = 5 + 10 * Math.sin((k - at(3)) / 6); gma.yaw = -60 + 12 * Math.sin((k - at(3)) / 9) }   // she watches the purple after it
      look(k)
    })

    // L07 (S10): over Nico's shoulder from the ceiling: Nico at the portal, gold in hand; Grandma walks off frame left
    K.shot('s10')
    jump(9.0, 5.5, P(11, 2.0, 5.5))
    Object.assign(gma, { x: 9.2, z: 3.9, yaw: 120 })
    let turn = null
    await line('L07', async (k, at, n) => {
      portalLife(k); if (gma.x > 6.1) K.step(gma, -0.1, -0.03); else gma.yaw = K.mcYaw(9.0 - gma.x, 5.5 - gma.z)
      if (k >= n - 9) { turn = turn || { ...K.base }; K.turnTo(turn, P(6.0, 2.6, 3.1), (k - n + 9) / 8) }
      look(k, k < n - 9 ? 0.18 * Math.sin(k / 8) : 0, k < n - 9 ? 0.08 * Math.sin(k / 11) : 0)
    })

    // L08 (S11): POV turned west: Grandma stopped mid-cellar, looking at the stack, then at me: "Just ONE, Nico."
    Object.assign(gma, { x: 6.0, z: 3.1, yaw: K.mcYaw(9.0 - 6.0, 5.5 - 3.1), pitch: 30 })
    K.shot('pov')
    await line('L08', async (k, at) => { gma.pitch = k < at(1) - 4 ? 32 + 4 * Math.sin(k / 5) : Math.max(2, gma.pitch - 3); gma.yaw = K.mcYaw(9.0 - gma.x, 5.5 - gma.z) + (k > at(1) ? 9 * Math.sin((k - at(1)) / 4) : 4 * Math.sin(k / 9)); K.go(k >= at(1) && k < at(1) + 5, 'back'); look(k) })
    K.stop()

    // L09 (S12): she's gone up the ladder; the hatch shuts on 'BED'. I turn to the portal and throw in ALL my gold
    jump(7.0, 5.5, P(2.4, 2.6, 2.2))   // she walks from where she stood to the ladder and climbs
    from = null
    let thrown = false, shut = -1
    await line('L09', async (k, at, n) => {
      portalLife(k)
      const lx = 1.5 - gma.x, lz = 1.75 - gma.z, ld = Math.hypot(lx, lz)
      if (ld > 0.12) { K.step(gma, lx / ld * 0.2, lz / ld * 0.2); gma.pitch = 10 } else { gma.x = 1.5; gma.z = 1.75; gma.yaw = 180; gma.pitch = -20; if (shut < 0) gma.y += 0.22 }
      if (shut < 0 && gma.y >= 10.2) { hatch(false); shut = k }   // she shuts the hatch behind her at the top of the shaft
      if (shut >= 0 && k === shut + 2) K.park('gma')
      if (k >= at(1) - 8) { from = from || { ...K.base }; K.turnTo(from, P(11, 2.0, 5.5), (k - at(1) + 8) / 16) }
      if (k === at(2) && !thrown) {
        thrown = true; bot.swingArm('right')
        say('/item replace entity @s hotbar.0 with air')
        toss('gold_ingot', [7.6, 2.4, 5.5], [11.4, 2.2, 5.5], 9, 64)
        ctx.sound('entity.item.pickup', 0.3, 0.6)
      }
      if (k === at(2) + 10) gone()
      K.go(k > at(2) + 12 && k < at(2) + 22, 'back')
      K.go(k >= at(3) + 4 && k < n - 1, 'forward'); K.ctl('sneak', k >= at(3) + 4 && k < n - 1)   // then creeping back to it, hoping
      look(k)
    })

    K.stop(); K.ctl('sneak', false)
    // L10 (S13): from behind the bed: Nico sits on it facing the portal. On 'stepped OUT' a piglin pushes out of the
    // purple, shaking; Grandma's feet come down the ladder at the frame's left edge
    K.shot('s13')
    jump(4.6, 7.8, P(11, 2.0, 5.5))
    ctx.mark('pose', { ids: SELF, pose: 'sit_ground' })
    let pig = null, pg = null
    await line('L10', async (k, at) => {
      portalLife(k)
      if (k === at(3) - 4) pg = K.actor('pig', { x: 11.75, y: 1, z: 5.6, yaw: 90, pitch: 0 })
      if (k === at(3) - 1) { pig = ent('piglin', P(11, 1, 5.5)); if (pig) ctx.mark('pose', { ids: [pig.id], converting: true }); else ctx.log('no piglin entity for the shake') }
      if (k >= at(3) && pg && pg.x > 10.1) pg.x -= 0.14
      if (k === at(3)) { ctx.sound('entity.piglin.ambient', 1, 1); ctx.particles('portal', P(11.2, 2, 5.6), { count: 30 }) }
      if (k === at(3) + 6 || k === at(3) + 11) ctx.sound('entity.piglin.step', 0.6, 1)
      if (k === 0) { Object.assign(gma, { x: 1.5, y: 10.0, z: 1.75, yaw: 180, pitch: 0 }); K.actors.set('gma', gma) }
      if (k === 2) { ctx.mark('use', { x: X + 1, y: F + 11, z: Z + 1, who: 'Grandma' }); hatch(true) }
      if (k > 2 && gma.y > 1) gma.y = Math.max(1, gma.y - 0.3)
      else if (k > 2) { const dx = 8.8 - gma.x, dz = 4.75 - gma.z, d = Math.hypot(dx, dz); if (d > 0.15) K.step(gma, dx / d * Math.min(0.2, d), dz / d * Math.min(0.2, d)); else gma.yaw = -75 }   // off the ladder, she walks to it
      look(k, 0.2 * Math.sin(k / 10), 0.1 * Math.sin(k / 13))
    })

    // L11 (S14): the reveal, close: the piglin in Grandpa's striped helmet, shaking. Held 0.9 s after 'HELMET':
    // Grandma at the frame's left edge tosses one more ingot past its head into the purple; its head turns after it
    K.shot('s14')
    // the end lands on 'HELMET': she tosses the ingot as the word starts, its head turns after the gold, then cut
    await line('L11', async (k, at) => {
      portalLife(k)
      if (pg) { pg.yaw = 90 + 14 * Math.sin(k / 9); pg.pitch = 6 * Math.sin(k / 7) }
      if (k === 31) toss('gold_ingot', [9.0, 2.3, 4.9], [11.5, 2.5, 5.75], 8)
      if (k === 35) { if (pig) ctx.mark('look_at', { ids: [pig.id], at: [11.6, 2.4, 5.8] }); ctx.sound('entity.piglin.admiring_item', 0.9, 1) }
      if (k === 39) gone()
    })
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    M.quitActors(ctx)
    return true
  }
}

// The camera shots: offsets from O (the cellar's local origin, F its floor). The cottage's floor is at dy 6; its lot
// is cottage-local (lx, lz) -> (lx - 2, lz - 4) here (floor dy 11); the garden gate at (1, 11).
module.exports.shots = {
  pov: { pov: true },
  // S01: full figure, 4 blocks west of the portal at Grandma's eye height, a slow push east
  s01: { at: [5.4, 2.45, 6.4], look: [10.9, 2.3, 5.75], fov: 62, push: 0.25, dof: false, subject: [[9.3, 1.9, 4.75]] },
  // S02: the ridge at night, an extreme-wide crane down from over the slope south-east of the cottage to the gate
  s02: { path: [[0, 22, 30, 28], [2.2, 7.5, 16.5, 15.5]], lookPath: [[0, 4, 13, 2], [2.2, 3, 13.5, 4]], ease: true, fov: 60, dof: false },
  // S05: the garden, morning: behind Nico at the gate, looking south-south-west down the slope to Hushwell's plaza
  s05: { at: [4.0, 15.5, 6.6], look: [-16, 9, 60], fov: 55, push: 0.2, dof: false, subject: ['self'] },
  // S06: 25 years ago, medium: 3 blocks in front of Grandpa at his eye height, the new portal behind him
  s06: { at: [5.6, 2.55 + DOWN, 6.9], look: [9.6, 2.35 + DOWN, 5.4], fov: 50, push: 0.3, mood: 'flashback', subject: ['actor:Grandpa'] },
  // S07: wide from beside the ladder, still: Grandpa walks into the purple; Grandma left alone
  // S06b: 'With a BLUE stripe': close on the helmet's lapis stripe
  s06b: { at: [8.0, 2.9 + DOWN, 4.0], look: [9.6, 2.65 + DOWN, 5.5], fov: 46, push: 0.15, mood: 'flashback', subject: ['actor:Grandpa'] },
  s07: { at: [1.6, 2.3 + DOWN, 2.6], look: [10.5, 2.0 + DOWN, 5.4], fov: 55, push: 0.12, mood: 'flashback', dof: false, subject: ['actor:Grandpa'] },
  // S07b: 'He never came BACK': Grandma alone by the portal, medium, the purple at frame right
  s07b: { at: [5.6, 2.7 + DOWN, 6.2], look: [8.7, 2.2 + DOWN, 3.9], fov: 50, push: 0.2, mood: 'flashback', subject: [[8.6, 1.9 + DOWN, 3.9]] },
  // S10: high over Nico's shoulder near the ceiling beams, looking past him into the portal
  s10: { at: [3.7, 4.05, 5.75], look: [10.8, 1.85, 5.5], fov: 55, push: 0.3, dof: false, subject: ['self'] },
  // S13: from behind the bed: Nico (seated on its north-east corner) in line with the portal, the ladder at the left edge
  s13: { at: [1.2, 3.4, 8.2], look: [10.9, 0.9, 5.9], fov: 72, push: 0.15, dof: false, subject: ['self'] },
  // S14: the reveal, close: 2.4 blocks west of the piglin at its eye height, facing east, a very slow push
  s14: { at: [6.9, 2.55, 5.5], look: [10.1, 2.25, 5.6], fov: 52, push: 0.12, dof: { aperture: 0.7 }, subject: [[10.1, 1.9, 5.6]] }
}
