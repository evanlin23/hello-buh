// "rating every MLG clutch 💀" (~15 s, four beats): from the same pillar the bot jumps off four times
// and saves itself four different ways, each with a rating subtitle: water bucket, slime block
// (bounces), hay bale (80% less fall damage), cobweb (stops the fall). Real survival placements,
// timed like water_clutch (place when the ground comes into reach). Back to the top by teleport.
const HEIGHT = 24
const CLUTCHES = [
  { item: 'water_bucket', slot: 0, sub: 'water bucket: 10/10' },
  { item: 'slime_block', slot: 1, sub: 'slime block: 9/10' },
  { item: 'hay_block', slot: 2, sub: 'hay bale: 7/10 (it hurts)' },
  { item: 'cobweb', slot: 3, sub: 'cobweb: 11/10' }
]

module.exports = {
  name: 'every_clutch',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'rating every MLG clutch 💀',
  edit: {
    caption: 'rating every MLG clutch 💀', red: 'every', song: 'songs/funk_abnormal.mp3', dropAt: 'landed', startAt: 'clutch:-0.2',
    subs: CLUTCHES.map((c, i) => ['landed', c.sub, 1.6, i])
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let y0 = floor + 1; y0 <= floor + HEIGHT + 4; y0 += 10) await ctx.cmd(`/fill ${x - 8} ${y0} ${z - 8} ${x + 8} ${Math.min(y0 + 9, floor + HEIGHT + 4)} ${z + 8} air`)
    await ctx.cmd(`/fill ${x - 8} ${floor} ${z - 8} ${x + 8} ${floor} ${z + 8} grass_block`)
    await ctx.cmd(`/fill ${x - 8} ${floor - 3} ${z - 8} ${x + 8} ${floor - 1} ${z + 8} dirt`)
    await ctx.cmd(`/fill ${x} ${floor + 1} ${z} ${x} ${floor + HEIGHT} ${z} cobblestone`)
    this.top = floor + HEIGHT
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
      await ctx.cmd(`/effect give @s instant_health 1 5 true`)
      await ctx.tpCheck(x + 0.5, this.top + 1, z + 0.5, 0, 45)        // on top, facing south, looking down
      ctx.select(c.slot)
      ctx.mark('clutch', { n: i, item: c.item })
      await bot.waitForTicks(i === 0 ? 14 : 6)
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
          if (c.item === 'water_bucket') {
            ctx.sound('item.bucket.empty')
            process.nextTick(() => bot.activateItem())
          } else {
            ctx.sound(c.item === 'slime_block' ? 'block.slime_block.place' : c.item === 'hay_block' ? 'block.grass.place' : 'block.wool.place')
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
        }
      }
      bot.on('physicsTick', onTick)
      for (let k = 0; k < 120 && !landed && !ctx.died; k++) await bot.waitForTicks(1)
      bot.removeListener('physicsTick', onTick)
      await bot.waitForTicks(c.item === 'slime_block' ? 26 : 14)    // the bounce plays out
      if (ctx.died) return false
      await ctx.easeLook(bot.entity.yaw, -0.2, 300)
      await bot.waitForTicks(4)
      if (spot) await ctx.cmd(`/fill ${spot.x - 1} ${floor + 1} ${spot.z - 1} ${spot.x + 1} ${floor + 2} ${spot.z + 1} air`)
    }
    return !ctx.died
  }
}
