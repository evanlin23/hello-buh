// "rating every way to die 💀" (docs/ideas.md #8, ~30 s): fourteen deaths in a row, each with the
// vanilla death screen and its real death message, rated from boring to ridiculous:
// fall, fire, cactus, magma, lava, a wither rose, gravel on the head, a harming potion at my own feet, pointed
// dripstone, a creeper I lit myself, a firework under a low ceiling, a falling anvil, crammed by pigs, and the respawn anchor
// in the Overworld ("[Intentional Game Design]"). The bot plays on half a heart (max health 1) so
// each death is quick; every death is a real survival action (walking, digging, throwing,
// lighting, using the anchor). After each death screen it clicks Respawn and the next set is its spawn point.
const GAP = 11     // sets are this far apart along x (the whole field stays within ~80 blocks: fills ~100 out failed silently)

const DEATHS = [
  { id: 'fall', sub: 'fall damage: 1/10' },
  { id: 'fire', sub: 'fire: 2/10' },
  { id: 'cactus', sub: 'cactus: 3/10' },
  { id: 'magma', sub: 'magma block: 3/10' },
  { id: 'lava', sub: 'lava: 4/10' },
  { id: 'rose', sub: 'wither rose: 5/10' },
  { id: 'gravel', sub: 'gravel: 5/10' },
  { id: 'potion', sub: 'harming potion: 6/10' },
  { id: 'stalagmite', sub: 'stalagmite: 7/10' },
  { id: 'creeper', sub: 'creeper: 7/10' },
  { id: 'firework', sub: 'firework: 8/10' },
  { id: 'anvil', sub: 'anvil: 8/10' },
  { id: 'pigs', sub: '30 pigs: 9/10' },
  { id: 'anchor', sub: 'anchor: 11/10' }
]

module.exports = {
  name: 'die_rating',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'rating every way to die 💀',
  expectDeath: true,
  edit: {
    caption: 'rating every way to die 💀', red: 'every', song: 'songs/funk_abnormal.mp3', dropAt: 'death',
    startAt: 'beat:-0.1', endAfter: 'last_death:1.1', deathScreen: true,
    subs: DEATHS.map((d, i) => ['death', d.sub, 1.4, i])
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    Object.assign(this, { x, z, floor })
    await ctx.defaultRules()
    // centred on where the bot is: a fill reaching ~100 blocks east failed silently (not loaded)
    const xs = x - Math.round(GAP * (DEATHS.length - 1) / 2)
    const x1 = xs - 10, x2 = xs + GAP * (DEATHS.length - 1) + 10
    for (let y0 = floor + 1; y0 <= floor + 20; y0 += 5) await ctx.cmd(`/fill ${x1} ${y0} ${z - 16} ${x2} ${y0 + 4} ${z + 12} air`)
    await ctx.cmd(`/fill ${x1} ${floor} ${z - 16} ${x2} ${floor} ${z + 12} grass_block`)
    await ctx.cmd(`/fill ${x1} ${floor - 4} ${z - 16} ${x2} ${floor - 1} ${z + 12} dirt`)
    if (process.env.DEBUG_SET) { await bot.waitForTicks(10); const col = []; for (let dy = -1; dy <= 4; dy++) { for (const xx of [x1 + 1, x2 - 1]) { const b = bot.blockAt(new ctx.Vec3(xx, floor + dy, z + 2)); col.push(b && b.name) } } ctx.log('after clear at station 1:', col.join(','), 'x1', x1, 'x2', x2, 'pos', bot.entity.position) }
    // each set: the bot starts at (sx, floor+1, z+4) facing north (-z); the thing is at z-1..z+1
    const F = floor
    this.sx = (i) => xs + i * GAP
    for (let i = 0; i < DEATHS.length; i++) {
      const s = this.sx(i), d = DEATHS[i].id
      if (d === 'fall') {                         // a 6-high cobblestone pillar to step off
        await ctx.cmd(`/fill ${s} ${F + 1} ${z + 4} ${s} ${F + 6} ${z + 4} cobblestone`)
      } else if (d === 'fire') {                  // a strip of fire on netherrack
        await ctx.cmd(`/fill ${s - 1} ${F} ${z + 1} ${s + 1} ${F} ${z + 2} netherrack`)
        await ctx.cmd(`/fill ${s - 1} ${F + 1} ${z + 1} ${s + 1} ${F + 1} ${z + 2} fire`)
      } else if (d === 'rose') {
        await ctx.cmd(`/setblock ${s} ${F + 1} ${z + 2} wither_rose`)
      } else if (d === 'firework') {              // a 1x2 nook with a low stone ceiling
        await ctx.cmd(`/fill ${s - 1} ${F + 1} ${z + 2} ${s + 1} ${F + 3} ${z + 5} stone`)
        await ctx.cmd(`/fill ${s} ${F + 1} ${z + 3} ${s} ${F + 2} ${z + 4} air`)
      } else if (d === 'magma') {
        await ctx.cmd(`/fill ${s - 1} ${F} ${z} ${s + 1} ${F} ${z + 2} magma_block`)
      } else if (d === 'gravel') {                // a 1x1 nook: dirt over my head, gravel over that
        await ctx.cmd(`/fill ${s - 1} ${F + 1} ${z + 3} ${s + 1} ${F + 6} ${z + 5} cobblestone`)
        await ctx.cmd(`/fill ${s} ${F + 1} ${z + 4} ${s} ${F + 2} ${z + 4} air`)
        await ctx.cmd(`/fill ${s} ${F + 1} ${z + 5} ${s} ${F + 2} ${z + 5} air`)
        await ctx.cmd(`/setblock ${s} ${F + 3} ${z + 4} dirt`)
        await ctx.cmd(`/fill ${s} ${F + 4} ${z + 4} ${s} ${F + 6} ${z + 4} gravel`)
      } else if (d === 'cactus') {
        await ctx.cmd(`/setblock ${s} ${F} ${z + 1} sand`)
        await ctx.cmd(`/fill ${s} ${F + 1} ${z + 1} ${s} ${F + 3} ${z + 1} cactus`)
      } else if (d === 'lava') {
        await ctx.cmd(`/fill ${s - 2} ${F - 1} ${z - 2} ${s + 2} ${F} ${z + 1} lava`)
      } else if (d === 'stalagmite') {           // a 3-high step, pointed dripstone below it
        await ctx.cmd(`/fill ${s} ${F + 1} ${z + 4} ${s} ${F + 3} ${z + 4} cobblestone`)
        await ctx.cmd(`/fill ${s - 1} ${F + 1} ${z + 1} ${s + 1} ${F + 1} ${z + 3} pointed_dripstone[vertical_direction=up,thickness=tip]`)
      } else if (d === 'pigs') {                   // a 1x1 glass shaft the pigs get poured into
        await ctx.cmd(`/fill ${s - 1} ${F + 1} ${z + 3} ${s + 1} ${F + 3} ${z + 5} glass`)
        await ctx.cmd(`/fill ${s} ${F + 1} ${z + 4} ${s} ${F + 3} ${z + 4} air`)
      } else if (d === 'anchor') {
        await ctx.cmd(`/setblock ${s} ${F + 1} ${z + 2} respawn_anchor[charges=0]`)
      }
    }
    await ctx.cmd('/attribute @s minecraft:max_health base set 1')
    await ctx.cmd('/gamerule fall_damage true')
    await ctx.cmd('/gamerule max_entity_cramming 24')
    await ctx.cmd('/difficulty normal')                       // explosions do no damage on peaceful
    await ctx.hotbar([['glowstone', 4], null, 'splash_potion[potion_contents={potion:"minecraft:harming"}]', 'iron_shovel', 'flint_and_steel', 'firework_rocket[fireworks={flight_duration:1,explosions:[{shape:"large_ball",colors:[I;16711680,16776960]}]}]'])
    const s0 = this.sx(0)
    await ctx.tpCheck(s0 + 0.5, F + 7, z + 4.5, 0, 60)
    await ctx.cmd('/gamerule respawn_radius 0')
    await ctx.cmd('/gamerule keep_inventory true')       // the glowstone for the last death (and no item scatter)
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s instant_health 1 5 true')
    ctx.select(1)
    await bot.waitForTicks(20)
    return { x: xs + GAP * 3, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { z, floor: F } = this
    const N = 0
    const waitDeath = async (max) => { for (let k = 0; k < max && !ctx.died; k++) await bot.waitForTicks(1); return ctx.died }
    const walk = (on) => bot.setControlState('forward', on)
    const after = async (i) => {
      walk(false); bot.clearControlStates()
      ctx.mark('rated', { n: i })
      if (i === DEATHS.length - 1) { ctx.mark('last_death'); await bot.waitForTicks(30); return }
      await bot.waitForTicks(18)               // the death screen, 0.9 s (1.3 s each dragged; the message needs reading time)
      // the next set is the spawn point; set the one after before clicking Respawn
      // respawn at the next set: spawn point and world spawn both there (the bot came back at the
      // world spawn with only /spawnpoint set)
      const sy = DEATHS[i + 1].id === 'stalagmite' ? F + 4 : F + 1      // (the gravel nook's spawn is inside it)
      bot.chat(`/spawnpoint @s ${this.sx(i + 1)} ${sy} ${z + 4} 180 0`)
      bot.chat(`/setworldspawn ${this.sx(i + 1)} ${sy} ${z + 4} 180 0`)
      await bot.waitForTicks(2)
      ctx.revive(); ctx.respawn()
      await new Promise(r => bot.once('spawn', r))
      await bot.waitForTicks(6)                 // let the respawn settle (walking right away sometimes went nowhere)
      await bot.look(N, -0.25, true)
      ctx.log('respawned at', bot.entity.position, 'health', bot.health)
    }
    for (let i = 0; i < DEATHS.length; i++) {
      const d = DEATHS[i].id, s = this.sx(i)
      ctx.mark('beat', { n: i, id: d })
      if (d === 'creeper') { bot.chat(`/summon creeper ${s + 0.5} ${F + 1} ${z + 1.5} {NoAI:1b,Rotation:[0f,0f],Fuse:20s}`); await bot.waitForTicks(2) }
      if (d === 'fall') {
        // on top of the pillar, looking down: step off
        await ctx.easeLook(N + Math.PI, -1.15, 150)   // already looking over the edge, down the pillar
        walk(true); await bot.waitForTicks(4); walk(false)
        ctx.easeLook(N + Math.PI, -1.35, 300)
      } else if (d === 'cactus') {
        await ctx.easeLookAt(new Vec3(s + 0.5, F + 2, z + 1.5), 200)
        walk(true)
      } else if (d === 'lava') {
        await ctx.easeLook(N, -0.5, 200)
        walk(true)
        ctx.easeLook(N, -0.9, 400)
      } else if (d === 'stalagmite') {
        await ctx.easeLook(N, -0.7, 250)
        walk(true)
        for (let k = 0; k < 30 && bot.entity.position.y > F + 3.6; k++) await bot.waitForTicks(1)   // until I'm off the step
        walk(false)
        ctx.easeLook(N, -1.1, 300)
      } else if (d === 'fire') {
        await ctx.easeLook(N, -0.45, 200)
        walk(true)
      } else if (d === 'rose') {
        await ctx.easeLookAt(new Vec3(s + 0.5, F + 1.3, z + 2.5), 250)
        walk(true); await bot.waitForTicks(6); walk(false)
        for (let k = 0; k < 60 && !ctx.died; k++) {          // withering: the hearts go black; look down at it
          if (k === 4) ctx.easeLook(bot.entity.yaw + 0.3, -1.1, 900)
          if (k === 24) ctx.easeLook(bot.entity.yaw - 0.4, -0.6, 900)
          await bot.waitForTicks(1)
        }
      } else if (d === 'firework') {
        // in the nook: a rocket on the floor in front of me, under a stone ceiling. It hits the
        // ceiling and goes off right in my face.
        ctx.select(5)
        const f = new Vec3(s, F, z + 3)
        await ctx.easeLookAt(f.offset(0.5, 1, 0.5), 300)
        await bot.waitForTicks(2)
        bot._client.write('block_place', { hand: 0, location: f, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        bot.swingArm(); ctx.sound('entity.firework_rocket.launch', 1)
        ctx.easeLook(N, 0.6, 400)
      } else if (d === 'magma') {
        await ctx.easeLook(N, -0.75, 200)
        walk(true)                                  // across the magma until it gets me
        ctx.easeLook(N, -1.2, 400)
      } else if (d === 'gravel') {
        // in the nook: look up at the dirt and dig it out. The gravel above comes down on my head.
        ctx.select(3)
        const b = new Vec3(s, F + 3, z + 4)
        await ctx.easeLookAt(b.offset(0.5, 0.1, 0.5), 350)
        try { await bot.dig(bot.blockAt(b), 'ignore') } catch (e) { ctx.log('dig', e.message) }
        ctx.sound('block.gravel.break', 1, 0.8); ctx.particles('block', b, { block: 'dirt' })
      } else if (d === 'potion') {
        // a splash potion of harming, thrown straight down at my own feet
        ctx.select(2)
        await ctx.easeLook(N, -1.5, 350)
        await bot.waitForTicks(3)
        bot.activateItem(); bot.swingArm(); ctx.sound('entity.splash_potion.throw', 1)
      } else if (d === 'creeper') {
        // light a creeper with flint and steel (vanilla: it ignites)
        ctx.select(4)
        const c = bot.nearestEntity(e => e.name === 'creeper')
        if (c) await ctx.easeLookAt(c.position.offset(0, 1.2, 0), 300)
        await bot.waitForTicks(3)
        if (c) { bot.activateEntity(c); bot.swingArm(); ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.creeper.primed', 1) }
        ctx.easeLook(bot.entity.yaw + 0.15, bot.entity.pitch - 0.05, 900)
      } else if (d === 'anvil') {
        await ctx.easeLook(N, -0.1, 150)
        walk(true); await bot.waitForTicks(6); walk(false)
        const p = bot.entity.position
        ctx.easeLook(N, 1.25, 500)                  // look up: here it comes
        bot.chat(`/summon falling_block ${p.x.toFixed(2)} ${F + 10} ${p.z.toFixed(2)} {BlockState:{Name:"minecraft:anvil"},Time:1,HurtEntities:1b,FallHurtAmount:4f,FallHurtMax:40}`)
      } else if (d === 'pigs') {
        // step into the glass shaft (the spawn point is in it), look up as the pigs pour in
        await ctx.easeLook(N, 0.85, 300)
        for (let k = 0; k < 30 && !ctx.died; k++) {
          bot.chat(`/summon pig ${s + 0.5} ${F + 5 + (k % 3)} ${z + 4.5}`)
          if (k % 3 === 0) ctx.sound('entity.pig.ambient', 0.6, 0.9 + (k % 5) * 0.05)
          if (k % 8 === 7) await bot.waitForTicks(1)       // four waves: they pour in fast (1 a tick was 1.5 s of pig belly)
        }
      } else if (d === 'anchor') {
        // charge it with glowstone, then try to set the spawn point: boom
        const a = new Vec3(s, F + 1, z + 2)
        await ctx.easeLookAt(a.offset(0.5, 0.9, 0.5), 300)
        ctx.select(0)
        await bot.waitForTicks(4)
        const use = () => { bot._client.write('block_place', { hand: 0, location: a, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 }); bot.swingArm() }
        use(); ctx.sound('block.respawn_anchor.charge', 1)
        await bot.waitForTicks(8)
        ctx.select(1)                                // empty hand: right-click tries to set the spawn
        await bot.waitForTicks(6)
        use()
      }
      if (!(await waitDeath(100))) { ctx.log('no death at', d, bot.entity.position, 'health', bot.health, 'set x', s); return false }
      ctx.log('died:', d)
      await after(i)
    }
    return true
  }
}
