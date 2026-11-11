// Stages 1, "minecraft friendships in 3 stages" (format `stages`, docs/formats.md; STANDARDS r:redb7c0). Three titled
// chapters, each fast and escalating, about 20-25 s in all:
//   1. BETRAYAL  your best friend punches you into a lava pit and teabags at the edge while you burn; the real death
//                screen says "56e tried to swim in lava to escape ur_bestfriend"
//   2. RISE      you respawn in a deep cave and mine a whole diamond vein (Fortune III: the HUD stack climbs)
//   3. REVENGE   his mansion; he teabags on the porch; you flip a lever, the redstone runs into his crawlspace, which
//                is packed with TNT; it flashes, he looks down, and the whole house goes up
// The friend is a player actor (lib/movie.js spawnActors, skin 'efe'); you are 56e (the harness default).
//
// Minecraft-true (1.21):
// - A player's punch knocks back 0.4 (PvP on, survival); 0.35 blocks from the pit's edge that drops you in. Lava does
//   4 a hit (every 10 ticks) and sets you burning: dead in ~2.5 s from full health. A kill within 5 s of a player's hit
//   credits him: death.attack.lava.player "%1$s tried to swim in lava to escape %2$s".
// - keep_inventory on, respawn_radius 0: you respawn on your spawn point (set in the cave) with your hotbar.
// - Iron pickaxe with Efficiency III + Fortune III on deepslate diamond ore (hardness 4.5): 6 + 3^2 + 1 = 16 speed,
//   4.5 x 1.5 / 16 = 0.42 s a block; Fortune III drops 1-4 diamonds (avg 2.2).
// - Redstone dust loses 1 a block; a repeater refreshes it to 15. Dust on top of TNT powers it: the TNT under the
//   dust line primes (80-tick fuse); the rest primes from the blasts (10-30 ticks each): the chain.
// Film licence: block drops are off for the blast (no floating items) and you have Resistance (hidden) so a flung TNT
// can't kill the camera; neither shows.
//
// Set (origin O = X, F, Z; F = the grass's top, y up, -z north):
//   lava pit x -30..-27, z 4..7 (2 deep); you on its south edge, the friend 2 blocks south of you
//   cave (absolute, deep): a 7x4x6 deepslate room under (20, 14), the diamond vein in its north wall
//   mansion x -5..5, z -12..-4 (2 floors, gable roof), door at (0, -4) facing south, porch z -3..-1; a crawlspace
//   x -4..4, z -11..-5 under it: TNT at y -4..-3, air at -2..-1; the lever at (0, 1, 13), dust north along x = 0, a
//   repeater at z 5, a trench stepping down at z -2..-4 into the crawlspace, dust on the TNT to z -10.
const M = require('../lib/movie')
const S = require('../lib/stages')
const { plateau } = require('../lib/plateau')

const FRIEND = 'ur_bestfriend'
const PIT = { x0: -30, x1: -27, z0: 4, z1: 7 }
const CAVE = { x: 20, z: 14, y: -52 }     // the room under (20, 14): its air starts at absolute y -52 (where you stand)
const ME3 = [0.5, 1, 15.5]                // you at the lever (chapter 3)
const PORCH = [1.6, 1, -2.2]              // the friend on his porch

const CHAPTERS = [
  { title: '1. BETRAYAL', color: 'red', until: 'death' },   // (off under the death screen's title)
  { title: '2. RISE', color: 'blue' },
  { title: '3. REVENGE', color: 'gold' }
]

module.exports = {
  name: 'stages_friends',
  biome: 'minecraft:plains',
  time: 6000,
  renderDistance: 10, recordRadius: 72,
  cast: { [FRIEND]: 'efe' },
  shots: {
    pov: { pov: true },
    // the hook: side-on from the east, the pit on the right, you on its edge, the friend stepping up to you
    ch1: { at: [-22.0, 2.7, 7.4], look: [-28.5, 1.2, 7.9], fov: 58, push: 0.25, subject: ['self', `actor:${FRIEND}`] },
    // his mansion, the friend on the porch, the dust line running to it across the lawn
    house: { at: [5.5, 3.2, 8.5], look: [0.5, 3.0, -5.5], fov: 64, push: 0.3, subject: [`actor:${FRIEND}`] },
    // in the crawlspace: a floor of TNT, the dust line glowing on it, the primed row flashing
    basement: { at: [-3.4, -1.35, -5.4], look: [1.2, -2.4, -10.4], fov: 72, push: 0.15, dof: false, subject: [[0.5, -1.9, -7.5]] },
    // close on the friend: he stops, looks down
    porch: { at: [3.6, 2.4, 1.2], look: [1.6, 2.0, -2.2], fov: 55, push: 0.2, subject: [`actor:${FRIEND}`] },
    // the whole house from the south-east, high: the chain
    wide: { at: [17, 12, 23], look: [0, 3, -8], fov: 56, push: 0.15, dof: false, eyeTrace: false, subject: [[0, 6, -2.9]] }
  },
  edit: S.edit({
    chapters: CHAPTERS,
    caption: 'minecraft friendships in 3 stages 💀',
    red: '3 stages',
    payoff: 'boom_last',   // the chain's last blast (pace's payoff for a settle ending)
    speed: [
      ['burn', 'death', 2],          // the burn plays at 2x (2.5 s of lava is 1.25 s)
      ['respawn', 'ch2', 'cut'],     // the respawn's first ticks (the camera switching to your eyes)
      ['vein', 'vein_end', 2]        // the vein at 2x (the aim at <= 100 deg/s)
    ],
    sfx: [['hit', 'push', { gain: 1.4 }], ['boom', 'boom', { gain: 0.9 }], ['ding', 'loot', { gain: 0.6 }]],
    extra: {
      deathScreen: true,
      punch: [['push', 0, 1.06], ['lever', 0, 1.05]],
      itemNames: {}
    }
  }),

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z
    const F = await plateau(ctx, { x0: X - 40, x1: X + 30, z0: Z - 26, z1: Z + 30, above: 24, below: 16, biome: null, pct: 0.97, taper: 12, trees: 12 })
    Object.assign(this, { X, Z, F })
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    const c = (s) => ctx.cmd(s)
    for (const r of ['/gamerule log_admin_commands false', '/difficulty normal', '/gamerule keep_inventory true',
      '/gamerule respawn_radius 0', '/gamerule pvp true', '/gamerule immediate_respawn false', '/gamerule fall_damage true', '/gamerule mob_griefing false',
      '/gamerule block_drops true', '/gamerule natural_health_regeneration true', '/gamerule fire_spread_radius_around_player 0',
      '/kill @e[type=!minecraft:player,distance=..120]']) await c(r)

    // ---- chapter 1: the lava pit (2 deep, a stone rim), a few trees behind it
    await c(`/fill ${A(PIT.x0 - 1, -3, PIT.z0 - 1)} ${A(PIT.x1 + 1, 0, PIT.z1 + 1)} stone`)
    await c(`/fill ${A(PIT.x0, -1, PIT.z0)} ${A(PIT.x1, -1, PIT.z1)} mud`)   // under the lava, unseen: 0.875 high, so you
    await c(`/fill ${A(PIT.x0, 0, PIT.z0)} ${A(PIT.x1, 0, PIT.z1)} lava`)    // stand chest-deep (takes 3-4: on 1 deep you stood on it)
    await c(`/fill ${A(PIT.x0 - 1, 0, PIT.z1 + 1)} ${A(PIT.x1 + 1, 0, PIT.z1 + 1)} grass_block`)   // the edge you stand on is grass
    for (const [dx, dz] of [[PIT.x0 - 1, PIT.z0 - 1], [PIT.x1 + 1, PIT.z0], [PIT.x0 + 1, PIT.z0 - 1]]) await c(`/setblock ${A(dx, 0, dz)} andesite`)
    for (const [f, dx, dz] of [['oak', -37, 0], ['birch', -35, 9], ['oak', -34, 15], ['fancy_oak', -39, -6], ['birch', -26, -3]]) {
      await ctx.cmd(`/place feature minecraft:${f} ${A(dx, 1, dz)}`, { mayFail: true })
    }

    // ---- chapter 2: the cave, deep in deepslate (lit by torches and a lava pool), the vein in its north wall
    const cx = X + CAVE.x, cz = Z + CAVE.z, cy = CAVE.y
    this.cave = { cx, cy, cz }
    await c(`/fill ${cx - 5} ${cy - 2} ${cz - 4} ${cx + 5} ${cy + 5} ${cz + 5} deepslate`)
    await c(`/fill ${cx - 3} ${cy} ${cz - 2} ${cx + 3} ${cy + 3} ${cz + 3} air`)
    await c(`/fill ${cx - 2} ${cy + 4} ${cz - 1} ${cx + 2} ${cy + 4} ${cz + 2} air`)            // a rough, higher ceiling
    for (const [x, y, z, b] of [[-3, 0, 3, 'tuff'], [3, 1, 3, 'tuff'], [-3, 2, 0, 'cobbled_deepslate'], [3, 0, 0, 'cobbled_deepslate'], [2, 3, 3, 'tuff'], [-2, 3, -2, 'deepslate_coal_ore'], [-3, 1, 2, 'deepslate_iron_ore']]) {
      await c(`/setblock ${cx + x} ${cy + y} ${cz + z} ${b}`)
    }
    await c(`/fill ${cx + 2} ${cy - 1} ${cz + 2} ${cx + 3} ${cy - 1} ${cz + 3} lava`)          // a little lava pool in the corner
    for (const [x, y, z, f] of [[-3, 2, -1, 'east'], [3, 2, -1, 'west'], [0, 2, 3, 'north']]) await c(`/setblock ${cx + x} ${cy + y} ${cz + z} wall_torch[facing=${f}]`)
    // the vein: north wall (z = cz - 3), right in front of the spawn point
    this.vein = [[-1, 2], [0, 2], [1, 2], [1, 1], [0, 1], [-1, 1], [0, 0]].map(([x, y]) => [cx + x, cy + y, cz - 3])
    for (const [x, y, z] of this.vein) await c(`/setblock ${x} ${y} ${z} deepslate_diamond_ore`)
    await c(`/setblock ${cx - 1} ${cy} ${cz - 3} deepslate_redstone_ore`)
    await c(`/spawnpoint @s ${cx} ${cy} ${cz - 1} 180 0`)   // 1.5 blocks back from the vein

    // ---- chapter 3: his mansion over a crawlspace of TNT, the lever and the dust line
    // the crawlspace: stone shell x -5..5, z -12..-4, y -5..-1; TNT at -4..-3; air at -2..-1; glowstone in the walls
    await c(`/fill ${A(-9, -12, -16)} ${A(9, -6, 0)} stone`)   // (take 3: the crater reached groundwater)
    await c(`/fill ${A(-5, -5, -12)} ${A(5, -1, -4)} stone`)
    await c(`/fill ${A(-4, -4, -11)} ${A(4, -3, -5)} tnt`)
    await c(`/fill ${A(-4, -2, -11)} ${A(4, -1, -5)} air`)
    for (const [x, z] of [[-5, -6], [-5, -10], [5, -6], [5, -10], [-2, -12], [2, -12]]) await c(`/setblock ${A(x, -2, z)} glowstone`)
    // the house: oak planks, dark oak log corners and posts, a cobblestone footing, glass panes, a spruce gable roof
    await c(`/fill ${A(-5, 0, -12)} ${A(5, 0, -4)} oak_planks`)
    await c(`/fill ${A(-5, 1, -12)} ${A(5, 8, -4)} oak_planks`)
    await c(`/fill ${A(-4, 1, -11)} ${A(4, 4, -5)} air`)
    // the twist inside: every floor is TNT under a carpet (the ground floor, upstairs and the attic), so the whole
    // house goes, roof and all (take 3: TNT only in the crawlspace left the upper floor and the roof floating)
    await c(`/fill ${A(-4, 0, -11)} ${A(4, 0, -5)} tnt`)
    await c(`/fill ${A(-4, 1, -11)} ${A(4, 1, -5)} red_carpet`)
    await c(`/fill ${A(-4, 5, -11)} ${A(4, 5, -5)} tnt`)
    await c(`/fill ${A(-4, 6, -11)} ${A(4, 6, -5)} red_carpet`)
    await c(`/fill ${A(-4, 7, -11)} ${A(4, 8, -5)} air`)
    await c(`/fill ${A(-5, 1, -12)} ${A(5, 1, -4)} cobblestone replace oak_planks`)
    for (const x of [-5, 0, 5]) for (const z of [-12, -4]) await c(`/fill ${A(x, 1, z)} ${A(x, 8, z)} dark_oak_log`)
    for (const z of [-8]) for (const x of [-5, 5]) await c(`/fill ${A(x, 1, z)} ${A(x, 8, z)} dark_oak_log`)
    await c(`/fill ${A(-5, 5, -12)} ${A(5, 5, -4)} stripped_dark_oak_log[axis=x] replace oak_planks`)
    for (const y of [2, 6]) {
      for (const [x0, x1] of [[-3, -2], [2, 3]]) {
        await c(`/fill ${A(x0, y, -4)} ${A(x1, y + 1, -4)} glass_pane`)
        await c(`/fill ${A(x0, y, -12)} ${A(x1, y + 1, -12)} glass_pane`)
      }
      for (const [z0, z1] of [[-11, -10], [-6, -5]]) {
        await c(`/fill ${A(-5, y, z0)} ${A(-5, y + 1, z1)} glass_pane`)
        await c(`/fill ${A(5, y, z0)} ${A(5, y + 1, z1)} glass_pane`)
      }
    }
    await c(`/fill ${A(-1, 6, -4)} ${A(1, 7, -4)} glass_pane`)   // a wide upstairs window over the door
    await c(`/setblock ${A(0, 1, -4)} oak_door[facing=south,half=lower,hinge=left]`)
    await c(`/setblock ${A(0, 2, -4)} oak_door[facing=south,half=upper,hinge=left]`)
    // the roof: stairs rising from both long sides to a slab ridge, the gables filled
    for (let k = 0; k <= 4; k++) {
      await c(`/fill ${A(-6, 9 + k, -13 + k)} ${A(6, 9 + k, -13 + k)} spruce_stairs[facing=south]`)
      await c(`/fill ${A(-6, 9 + k, -3 - k)} ${A(6, 9 + k, -3 - k)} spruce_stairs[facing=north]`)
      if (k > 0) for (const x of [-5, 5]) await c(`/fill ${A(x, 9 + k - 1, -13 + k)} ${A(x, 9 + k - 1, -3 - k)} oak_planks`)
    }
    await c(`/fill ${A(-6, 13, -8)} ${A(6, 13, -8)} spruce_slab`)
    await c(`/fill ${A(-5, 9, -12)} ${A(5, 9, -4)} oak_planks replace air`)
    await c(`/fill ${A(-4, 9, -11)} ${A(4, 9, -5)} tnt`)
    // the porch (spruce, z -3..-1) and a path to it; flowers and bushes by the walls
    await c(`/fill ${A(-3, 0, -3)} ${A(3, 0, -1)} spruce_planks`)
    await c(`/fill ${A(-1, 0, 0)} ${A(-1, 0, 11)} dirt_path`)
    for (const [x, z, b] of [[-4, -3, 'rose_bush'], [4, -3, 'peony'], [-6, -6, 'lilac'], [6, -9, 'rose_bush']]) {
      await c(`/setblock ${A(x, 1, z)} ${b}[half=lower]`)
      await c(`/setblock ${A(x, 2, z)} ${b}[half=upper]`)
    }
    for (const [f, dx, dz] of [['oak', -11, -14], ['fancy_oak', 11, -15], ['birch', -12, -2], ['oak', 13, -4], ['birch', 7, -20], ['oak', -6, -21]]) {
      await ctx.cmd(`/place feature minecraft:${f} ${A(dx, 1, dz)}`, { mayFail: true })
    }
    // the redstone: lever at z 13 (on the grass), dust north to z 6, a repeater at 5, dust to z -1; the trench steps
    // down at z -2 (y 0), -3 (y -1), -4 (y -2, through the crawlspace wall), then dust on the TNT from z -5 to -10
    await c(`/setblock ${A(0, 1, 13)} lever[face=floor,facing=north]`)
    await c(`/fill ${A(0, 1, 6)} ${A(0, 1, 12)} redstone_wire`)
    await c(`/setblock ${A(0, 1, 5)} repeater[facing=south]`)
    await c(`/fill ${A(0, 1, -1)} ${A(0, 1, 4)} redstone_wire`)
    await c(`/fill ${A(0, 0, -3)} ${A(0, 0, -2)} air`)
    await c(`/fill ${A(0, -1, -4)} ${A(0, -1, -3)} air`)
    await c(`/setblock ${A(0, -1, -2)} stone`)
    await c(`/setblock ${A(0, -2, -3)} stone`)
    await c(`/setblock ${A(0, -2, -4)} air`)
    await c(`/setblock ${A(0, -3, -4)} stone`)
    await c(`/setblock ${A(0, 0, -2)} redstone_wire`)
    await c(`/setblock ${A(0, -1, -3)} redstone_wire`)
    await c(`/setblock ${A(0, -2, -4)} redstone_wire`)
    await c(`/fill ${A(0, -2, -10)} ${A(0, -2, -5)} redstone_wire`)
    // the friend respawns far behind every camera
    this.cast = await M.spawnActors(ctx, [FRIEND])
    await c(`/gamemode survival ${FRIEND}`)
    // no blast knockback for him (a 0.8-block fling in one tick reads as a teleport: owner glitch check); he still dies
    await c(`/attribute ${FRIEND} minecraft:explosion_knockback_resistance base set 1`)
    await c(`/spawnpoint ${FRIEND} ${X} ${F + 1} ${Z + 44}`)
    // you: an enchanted iron pickaxe, some food; on the pit's south edge facing south (the friend)
    await ctx.hotbar(['iron_pickaxe[enchantments={efficiency:3,fortune:3}]', ['cooked_beef', 12], ['torch', 23], null, ['cobblestone', 41]])
    ctx.select(0)
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    await ctx.tpCheck(X + PIT.x0 + 1.5, F + 1, Z + PIT.z1 + 1.36, 0, 5)
    await M.place(ctx, FRIEND, X + PIT.x0 + 1.5, F + 1, Z + PIT.z1 + 3.6, 180, 10)
    await bot.waitForTicks(20)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F } = this
    const fr = this.cast[FRIEND]
    fr.respawn = () => {}   // he stays dead (mineflayer's auto-respawn put him back 46 blocks away mid-shot: a teleport)
    const A = require('../lib/act')(ctx)
    const at = (dx, dy, dz) => new Vec3(X + dx, F + dy, Z + dz)
    const me = () => fr.players['56e'] && fr.players['56e'].entity
    const sneak = (k, every = 3) => fr.setControlState('sneak', Math.floor(k / every) % 2 === 0)
    const friendHead = () => { const e = bot.players[FRIEND] && bot.players[FRIEND].entity; return e ? e.position.offset(0, 1.6, 0) : at(PIT.x0 + 1.5, 2.6, PIT.z1 + 3.6) }

    // ---- 1. BETRAYAL: he steps up and punches you in
    S.chapter(ctx, 0, 'ch1')
    ctx.easeLookAt(friendHead(), 300)
    fr.setControlState('forward', true)
    await bot.waitForTicks(5)
    fr.setControlState('forward', false)
    let inLava = false
    for (let tries = 0; tries < 3 && !inLava; tries++) {
      const e = me()
      if (e) await M.lookAt(fr, e.position.offset(0, 1.4, 0), 100)
      // his punch: the swing, and the server's own player_attack from him (LivingEntity.hurt: the knockback away from
      // him, the kill credit). (The actor's own attack packet never landed on the recording bot.)
      M.swing(fr)
      bot.chat(`/damage @s 1 minecraft:player_attack by ${FRIEND}`)
      const z0 = bot.entity.position.z
      await bot.waitForTicks(3)
      if (Math.abs(bot.entity.position.z - z0) < 0.05) {   // no knockback reached the client: vanilla's 0.4 away from him
        bot.entity.velocity.z = -0.4; bot.entity.velocity.y = 0.36   // motion-ok: the punch's knockback (LivingEntity.knockback 0.4)
        ctx.log('knockback applied by hand')
      }
      ctx.mark('push')
      ctx.log('punch', tries, !!e, fr.entity && fr.entity.position, bot.entity.position)
      for (let k = 0; k < 16 && !inLava; k++) { await bot.waitForTicks(1); inLava = bot.entity.position.z < Z + PIT.z1 + 1 - 0.3 && bot.entity.position.y < F + 0.9 }
    }
    ctx.log('after the punch', bot.entity.position, bot.entity.velocity, 'health', bot.health)
    if (!inLava) throw new Error('the punch did not knock me into the lava')
    ctx.mark('lava_in')
    // you look up at him, struggling; he looks down at you and teabags
    ctx.easeLookAt(friendHead(), 400)
    const e0 = me(); if (e0) M.lookAt(fr, e0.position.offset(0, 1.2, 0), 300)
    for (let k = 0; k < 120 && !ctx.died; k++) {
      if (k === 6) ctx.mark('burn')
      sneak(k)
      if (k % 10 === 5) ctx.easeLookAt(friendHead(), 300)
      await bot.waitForTicks(1)
    }
    fr.setControlState('sneak', false)
    if (!ctx.died) throw new Error('did not die in the lava')
    ctx.log('death')
    // the death screen (edit.deathScreen), then Respawn: the spawn point is in the cave
    await bot.waitForTicks(22)
    ctx.revive(); ctx.respawn()
    await new Promise(r => bot.once('spawn', r))
    M.shot(ctx, 'pov')
    await bot.waitForTicks(3)

    // ---- 2. RISE: the diamond vein
    S.chapter(ctx, 1)
    ctx.log('respawned at', bot.entity.position, 'health', bot.health)
    ctx.select(0)
    // 1.5 blocks from the vein: mine all of it (played at 2x: the aim turns at <= 100 deg/s, 200 on screen), the
    // diamonds drop into the holes; then step in and hoover them up: the HUD stack jumps (take 3: 0.5 from the wall
    // the top row was a 45-60 degree look up at a wall filling the frame)
    const A2 = require('../lib/act')(ctx, { turnSpeed: 100 })
    const cv = this.cave
    await A2.turnTo(new Vec3(cv.cx + 0.5, cv.cy + 2.5, cv.cz - 2.5))
    ctx.mark('vein')
    // the friend goes to his porch while you're underground (off every screen; not before: the lint checks the
    // last shot's cast up to its end)
    bot.chat(`/tp ${FRIEND} ${X + PORCH[0]} ${F + PORCH[1]} ${Z + PORCH[2]} 0 0`)
    for (const [x, y, z] of this.vein) {
      const b = bot.blockAt(new Vec3(x, y, z))
      if (b && /diamond/.test(b.name)) await A2.dig(b, { ms: 450 })   // vanilla: iron pickaxe, Efficiency III (mineflayer counts a bare hand)
    }
    ctx.mark('vein_end')
    await A2.turnTo(new Vec3(cv.cx + 0.5, cv.cy + 1.1, cv.cz - 2.5))
    bot.setControlState('forward', true)   // motion-ok: a step in to the wall, the view on the vein
    for (let k = 0; k < 20 && bot.entity.position.z > cv.cz - 1.4; k++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)   // motion-ok: (the step's end)
    let dia = 0
    for (let k = 0; k < 20; k++) {
      dia = bot.inventory.items().filter(i => i.name === 'diamond').reduce((a, i) => a + i.count, 0)
      if (k === 0 || dia > 0) { if (dia > 0 && !this._loot) { this._loot = true; ctx.mark('loot') } }
      await bot.waitForTicks(1)
    }
    ctx.log('diamonds', dia)
    // the diamonds in your hand (the item name over the hotbar: edit.itemNames)
    const slot = bot.inventory.slots.slice(36, 45).findIndex(i => i && i.name === 'diamond')
    if (slot >= 0) ctx.select(slot)
    ctx.mark('rich', { diamonds: dia })
    await A2.turnTo({ yaw: bot.entity.yaw, pitch: 0.1 })

    // ---- 3. REVENGE: his house, the lever, the TNT
    await ctx.cmd('/gamerule block_drops false')
    await ctx.cmd('/effect give @s resistance infinite 4 true')
    bot.chat(`/tp @s ${X + ME3[0]} ${F + ME3[1]} ${Z + ME3[2]} 180 40`)   // motion-ok: the chapter cut (to a camera shot first; marked cut below)
    ctx.mark('cut')
    S.chapter(ctx, 2, 'house')
    await M.lookAt(fr, at(ME3[0], 1.6, ME3[2]), 150)
    for (let k = 0; k < 26; k++) { sneak(k); await bot.waitForTicks(1) }
    fr.setControlState('sneak', false)
    M.shot(ctx, 'pov')
    let boomed = false
    // his death line in the chat (the server's own message), the last thing on screen
    bot.on('messagestr', (m) => { if (m.includes(FRIEND) && !/joined|left/.test(m)) { ctx.mark('syschat', { text: m, color: 'white' }); ctx.log('chat', m) } })
    bot._client.once('explosion', () => { if (!boomed) { boomed = true; ctx.mark('boom') } })
    // the chain's last blast is the payoff hit (pace reads the last blast before the settle as the payoff): marked at
    // its own tick once the chain has gone quiet
    let lastBoom = -1
    bot._client.on('explosion', () => { lastBoom = ctx.tick })
    await A.use(at(0, 1, 13))                // the lever
    ctx.mark('lever')
    await bot.waitForTicks(6)
    M.shot(ctx, 'basement'); ctx.mark('tnt_lit')
    await bot.waitForTicks(30)
    M.shot(ctx, 'porch'); ctx.mark('notice')
    await M.lookAt(fr, at(PORCH[0] - 0.6, 0.2, PORCH[2] + 1.4), 250)   // he looks down at his feet (he hears it)
    await bot.waitForTicks(8)
    await M.lookAt(fr, at(ME3[0], 1.6, ME3[2]), 250)           // then at you
    await bot.waitForTicks(4)
    M.shot(ctx, 'wide'); ctx.mark('wide')
    // too late: he turns and runs for it, off the porch and across the lawn
    fr.look(-Math.PI / 2 - 0.35, 0, true)   // (mineflayer yaw: -PI/2 = east, a little south)
    fr.setControlState('sprint', true); fr.setControlState('forward', true)
    for (let k = 0; k < 60 && !boomed; k++) await bot.waitForTicks(1)
    for (let k = 0; k < 200 && (lastBoom < 0 || ctx.tick - lastBoom < 30); k++) await bot.waitForTicks(1)
    if (lastBoom >= 0) ctx.mark('boom_last', { t: lastBoom * 50 })   // (mark's extra overrides t: the blast's own tick)
    await bot.waitForTicks(10)
    ctx.log('boomed', boomed, 'last blast tick', lastBoom)
    return boomed && !ctx.died
  }
}
