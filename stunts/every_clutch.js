// "rating every MLG clutch 💀" (~30 s, seven beats): the bot jumps off a glass block higher each time
// (24 -> 56 blocks) and saves itself a different way, each with the height and a rating:
// water bucket, slime block (bounce), hay bale (80% less damage), honey block, cobweb, water again...
// then a milk bucket: 0/10, death screen. Real survival placements, timed like water_clutch (place
// when the ground comes into reach; heights stay under ~60 so the reach window isn't skipped at
// fall speed, docs/clutch-timing.md). Back up by teleport (hard cuts).
const CLUTCHES = [
  { item: 'water_bucket', h: 24, sub: 'water bucket: 10/10' },
  { item: 'slime_block', h: 30, sub: 'slime block: 9/10' },
  { item: 'hay_block', h: 36, sub: 'hay bale: 7/10 (ouch)' },
  { item: 'honey_block', h: 42, sub: 'honey block: 6/10' },
  { item: 'cobweb', h: 48, sub: 'cobweb: 11/10' },
  { item: 'water_bucket', h: 52, sub: 'water bucket (again): 10/10' },   // powder snow killed the bot every try (mineflayer doesn't sink into it)
  { item: 'milk_bucket', h: 56, sub: 'milk bucket: 0/10' }
]
const TOP = 60

module.exports = {
  name: 'every_clutch',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'rating every MLG clutch 💀',
  edit: {
    caption: 'rating every MLG clutch 💀', red: 'every', song: 'songs/funk_abnormal.mp3', dropAt: 'landed', startAt: 'clutch:0.0',
    deathScreen: true, endAfter: 'death:0.8',
    subs: CLUTCHES.flatMap((c, i) => [['clutch', `${c.h} blocks`, 1.0, i], ['landed', c.sub, 1.6, i]])
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let y0 = floor + 1; y0 <= floor + TOP + 4; y0 += 10) await ctx.cmd(`/fill ${x - 8} ${y0} ${z - 8} ${x + 8} ${Math.min(y0 + 9, floor + TOP + 4)} ${z + 8} air`)
    await ctx.cmd(`/fill ${x - 8} ${floor} ${z - 8} ${x + 8} ${floor} ${z + 8} grass_block`)
    await ctx.cmd(`/fill ${x - 8} ${floor - 3} ${z - 8} ${x + 8} ${floor - 1} ${z + 8} dirt`)
    await ctx.cmd('/gamerule fall_damage true')
    await ctx.hotbar(CLUTCHES.map(c => c.item))
    await ctx.cmd('/gamemode survival')
    await bot.waitForTicks(10)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor } = this
    for (let i = 0; i < CLUTCHES.length; i++) {
      const c = CLUTCHES[i]
      // up on a glass block at this beat's height, facing south, looking out and down; a fast tp
      // (tpCheck's 1 s settle was dead air)
      if (i > 0) bot.chat(`/setblock ${x} ${floor + CLUTCHES[i - 1].h} ${z} air`)   // the last one's glass (kept for the look up)
      await ctx.cmd(`/setblock ${x} ${floor + c.h} ${z} glass`)
      const tx = x + 0.5, ty = floor + c.h + 1, tz = z + 0.5
      for (let a = 0; ; a++) {
        bot.chat(`/tp @s ${tx} ${ty} ${tz} 0 30`)
        let ok = false
        for (let t = 0; t < 10 && !ok; t++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.y - ty) < 0.1 && Math.abs(bot.entity.position.x - tx) < 0.1 }
        if (ok) { await bot.waitForTicks(1); if (Math.abs(bot.entity.position.y - ty) < 0.1) break }
        if (a === 4) throw new Error('teleport did not stick')
      }
      bot.chat('/effect give @s instant_health 1 5 true')     // after the cut: hearts refill off screen
      ctx.select(i)
      ctx.mark('clutch', { n: i, item: c.item })
      await ctx.easeLook(0, -0.85, 500)                  // a look over the edge: that's how high this one is
      bot.setControlState('forward', true); bot.setControlState('jump', true)
      await bot.waitForTicks(5)
      bot.setControlState('jump', false)
      await bot.waitForTicks(5)
      bot.setControlState('forward', false)
      ctx.easeLook(bot.entity.yaw, -Math.PI / 2 + 0.01, 400)
      let placed = false, landed = false, spot = null
      const onTick = () => {
        const p = bot.entity.position, vy = bot.entity.velocity.y, above = p.y - (floor + 1)
        if (!placed && vy < -0.5 && above + 1.62 < 4.45) {
          placed = true
          bot.entity.pitch = -Math.PI / 2
          spot = { x: Math.floor(p.x), y: floor, z: Math.floor(p.z) }
          if (c.item === 'water_bucket' || c.item === 'powder_snow_bucket') {
            ctx.sound(c.item === 'water_bucket' ? 'item.bucket.empty' : 'item.bucket.empty_powder_snow')
            process.nextTick(() => bot.activateItem())
          } else if (c.item === 'milk_bucket') {
            ctx.sound('entity.generic.drink')              // ...it just drinks it
            process.nextTick(() => bot.activateItem())
          } else {
            ctx.sound(c.item === 'slime_block' ? 'block.slime_block.place' : c.item === 'hay_block' ? 'block.grass.place' : c.item === 'honey_block' ? 'block.honey_block.place' : 'block.wool.place')
            process.nextTick(() => { bot._client.write('block_place', { hand: 0, location: spot, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 }); bot.swingArm() })
          }
          ctx.mark('placed', { item: c.item })
        }
        if (placed && !landed && (bot.entity.onGround || bot.entity.isInWater || above < 1.2)) {
          landed = true
          ctx.mark('landed', { n: i })
          if (c.item === 'water_bucket') { ctx.sound('entity.player.splash.high_speed'); ctx.particles('splash', { x: p.x, y: floor + 1.9, z: p.z }, { count: 30 }) }
          if (c.item === 'slime_block') ctx.sound('block.slime_block.fall', 1)
          if (c.item === 'hay_block') ctx.sound('block.grass.fall', 1)
          if (c.item === 'honey_block') ctx.sound('block.honey_block.slide', 1)
          if (c.item === 'powder_snow_bucket') ctx.sound('block.powder_snow.fall', 1)
        }
      }
      bot.on('physicsTick', onTick)
      for (let k = 0; k < 120 && !landed && !ctx.died; k++) await bot.waitForTicks(1)
      bot.removeListener('physicsTick', onTick)
      if (c.item === 'milk_bucket') { for (let k = 0; k < 60 && !ctx.died; k++) await bot.waitForTicks(1); await bot.waitForTicks(30); break }
      await bot.waitForTicks(c.item === 'slime_block' ? 14 : 3)     // the bounce plays out
      if (ctx.died) return false
      // look up at the glass it fell from (the still landings read as pauses)
      await ctx.easeLookAt(new ctx.Vec3(x + 0.5, floor + c.h, z + 0.5), 550)
      // clear the clutch block and ALL the water it left (leftover flow drained in a checkerboard on screen)
      if (spot) {
        await ctx.cmd(`/fill ${spot.x - 1} ${floor + 1} ${spot.z - 1} ${spot.x + 1} ${floor + 2} ${spot.z + 1} air`)
        await ctx.cmd(`/fill ${spot.x - 8} ${floor} ${spot.z - 8} ${spot.x + 8} ${floor + 2} ${spot.z + 8} air replace water`)
        await ctx.cmd(`/setblock ${spot.x} ${floor} ${spot.z} grass_block`)
      }
    }
    return ctx.died
  }
}
