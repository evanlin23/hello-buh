// "rating every way to die 💀" (docs/ideas.md #8, ~22 s): seven deaths in a row, each with the
// vanilla death screen and its real death message, rated from boring to ridiculous:
// fall, cactus, lava, pointed dripstone, falling anvil, crammed by pigs, and the respawn anchor
// in the Overworld ("[Intentional Game Design]"). The bot plays on one heart (max health 2) so
// each death is quick; every death is a real survival action (walking, jumping, using the
// anchor). After each death screen it clicks Respawn and the next set is its spawn point.
const GAP = 14     // sets are this far apart along x

const DEATHS = [
  { id: 'fall', sub: 'fall damage: 2/10' },
  { id: 'cactus', sub: 'cactus: 3/10' },
  { id: 'lava', sub: 'lava: 5/10' },
  { id: 'stalagmite', sub: 'stalagmite: 7/10' },
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
    await ctx.hotbar([['glowstone', 4]])
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
      await bot.waitForTicks(15)               // the death screen (0.75 s: seven of them at 1.3 s dragged)
      // the next set is the spawn point; set the one after before clicking Respawn
      // respawn at the next set: spawn point and world spawn both there (the bot came back at the
      // world spawn with only /spawnpoint set)
      const sy = DEATHS[i + 1].id === 'stalagmite' ? F + 4 : F + 1
      bot.chat(`/spawnpoint @s ${this.sx(i + 1)} ${sy} ${z + 4} 180 0`)
      bot.chat(`/setworldspawn ${this.sx(i + 1)} ${sy} ${z + 4} 180 0`)
      await bot.waitForTicks(2)
      ctx.revive(); ctx.respawn()
      await new Promise(r => bot.once('spawn', r))
      await bot.waitForTicks(2)
      await bot.look(N, -0.25, true)
      ctx.log('respawned at', bot.entity.position, 'health', bot.health)
    }
    for (let i = 0; i < DEATHS.length; i++) {
      const d = DEATHS[i].id, s = this.sx(i)
      ctx.mark('beat', { n: i, id: d })
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
        walk(true); await bot.waitForTicks(5); walk(false)
        ctx.easeLook(N, -1.1, 300)
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
