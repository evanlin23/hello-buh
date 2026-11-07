// "rating every MLG clutch 💀" (~33 s, nine beats): the bot jumps off a glass block higher each time
// (24 -> 56 blocks) and saves itself a different way, each with the height and a rating:
// water bucket, slime block (bounce), bed (half), hay bale (80% less damage), honey block, berry bush, cobweb, water again...
// then a milk bucket: 0/10, death screen. Real survival placements, timed like water_clutch (place
// when the ground comes into reach; heights stay under ~60 so the reach window isn't skipped at
// fall speed, docs/clutch-timing.md). Back up by teleport (hard cuts).
const CLUTCHES = [   // nine beats, ~33 s (seven ran 25.9 s; owner: 30 s minimum). All tested on the server:
  { item: 'water_bucket', h: 24, sub: 'water bucket: 10/10' },
  { item: 'slime_block', h: 28, sub: 'slime block: 9/10' },
  { item: 'red_bed', h: 32, sub: 'bed: 4/10 (half the damage)' },        // fallOn x0.5: lands on ~2.5 hearts
  { item: 'hay_block', h: 36, sub: 'hay bale: 7/10 (ouch)' },
  { item: 'honey_block', h: 40, sub: 'honey block: 6/10' },
  { item: 'sweet_berries', h: 44, sub: 'berry bush: 8/10 (pokey)' },    // stuck-in-block resets the fall, like cobweb
  { item: 'cobweb', h: 48, sub: 'cobweb: 11/10' },
  { item: 'water_bucket', h: 52, sub: 'water bucket (again): 10/10' },   // powder snow and twisting vines killed the bot (mineflayer)
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
    speed: CLUTCHES.slice(1).map((_, k) => [`hold${k + 1}a`, `hold${k + 1}b`, 'cut']),
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
    // a small flat landing patch (the placements assume ground at floor); the old 17x17 pad's sharp edges
    // read as command-built in every fall
    await ctx.cmd(`/fill ${x - 3} ${floor} ${z - 1} ${x + 3} ${floor} ${z + 5} grass_block`)
    await ctx.cmd(`/fill ${x - 3} ${floor - 2} ${z - 1} ${x + 3} ${floor - 1} ${z + 5} dirt`)
    // a snowy spot: the cleared box cut the snow layer into a square with a hard cyan edge. Take the snow
    // off the whole area round the tower (and the snowy grass), so there is no edge to see
    for (let y0 = floor - 3; y0 <= floor + 9; y0 += 3) {
      await ctx.cmd(`/fill ${x - 48} ${y0} ${z - 48} ${x + 48} ${y0 + 2} ${z + 48} air replace snow`)
      await ctx.cmd(`/fill ${x - 48} ${y0} ${z - 48} ${x + 48} ${y0 + 2} ${z + 48} grass_block replace grass_block[snowy=true]`)
    }
    await ctx.cmd('/gamerule fall_damage true')
    await ctx.hotbar(CLUTCHES.map(c => c.item))
    await ctx.cmd('/gamemode survival')
    await bot.waitForTicks(10)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor } = this
    let pending = null
    for (let i = 0; i < CLUTCHES.length; i++) {
      const c = CLUTCHES[i]
      // up on a glass block at this beat's height, facing south, looking out and down; a fast tp
      // (tpCheck's 1 s settle was dead air)
      if (i > 0) bot.chat(`/setblock ${x} ${floor + CLUTCHES[i - 1].h} ${z} air`)   // the last one's glass (kept for the look up)
      if (i > 0) ctx.mark(`hold${i}a`)
      await ctx.cmd(`/setblock ${x} ${floor + c.h} ${z} glass`)
      const tx = x + 0.5, ty = floor + c.h + 1, tz = z + 0.5
      for (let a = 0; ; a++) {
        bot.chat(`/tp @s ${tx} ${ty} ${tz} 0 60`)   // looking down off the glass from the first frame
        let ok = false
        for (let t = 0; t < 10 && !ok; t++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.y - ty) < 0.1 && Math.abs(bot.entity.position.x - tx) < 0.1 }
        if (ok) { await bot.waitForTicks(1); if (Math.abs(bot.entity.position.y - ty) < 0.1) break }
        if (a === 4) throw new Error('teleport did not stick')
      }
      bot.chat('/effect give @s instant_health 1 5 true')     // after the cut: hearts refill off screen
      if (pending) {   // the last beat's clutch block and any water it left, now that the camera is up here
        const sp = pending; pending = null
        bot.chat(`/fill ${sp.x - 1} ${floor + 1} ${sp.z - 1} ${sp.x + 1} ${floor + 2} ${sp.z + 1} air`)
        bot.chat(`/fill ${sp.x - 8} ${floor - 2} ${sp.z - 8} ${sp.x + 8} ${floor + 2} ${sp.z + 8} air replace water`)
      }
      // let the chunk decoding after the far tp finish before the pan (it doubled poses: a stutter); cut out
      if (i > 0) { await bot.waitForTicks(12); ctx.mark(`hold${i}b`) }
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
      let lastVy = 0
      const onTick = () => {
        const p = bot.entity.position, vy = bot.entity.velocity.y, above = p.y - (floor + 1)
        if (vy < -0.5) lastVy = vy
        const drink = c.item === 'milk_bucket' && !placed && vy < -0.3 && above < 30   // drinking takes 1.6 s: start it early so it shows
        if (drink || (!placed && c.item !== 'milk_bucket' && vy < -0.5 && above + 1.62 < 4.45)) {
          placed = true
          if (!drink) bot.entity.pitch = -Math.PI / 2
          spot = { x: Math.floor(p.x), y: floor, z: Math.floor(p.z) }
          if (c.item === 'water_bucket' || c.item === 'powder_snow_bucket') {
            ctx.sound(c.item === 'water_bucket' ? 'item.bucket.empty' : 'item.bucket.empty_powder_snow')
            process.nextTick(() => bot.activateItem())
          } else if (c.item === 'milk_bucket') {
            ctx.sound('entity.generic.drink')              // ...it just drinks it
            process.nextTick(() => bot.activateItem())
          } else {
            ctx.sound({ slime_block: 'block.slime_block.place', hay_block: 'block.grass.place', honey_block: 'block.honey_block.place', red_bed: 'block.wood.place', sweet_berries: 'block.sweet_berry_bush.place' }[c.item] || 'block.wool.place')
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
          if (c.item === 'red_bed') ctx.sound('block.wool.fall', 1)
          if (c.item === 'sweet_berries') ctx.sound('block.sweet_berry_bush.break', 0.8)
          if (c.item === 'powder_snow_bucket') ctx.sound('block.powder_snow.fall', 1)
        }
      }
      bot.on('physicsTick', onTick)
      for (let k = 0; k < 120 && !landed && !ctx.died; k++) await bot.waitForTicks(1)
      bot.removeListener('physicsTick', onTick)
      if (c.item === 'milk_bucket') { for (let k = 0; k < 60 && !ctx.died; k++) await bot.waitForTicks(1); await bot.waitForTicks(30); break }
      if (c.item === 'slime_block') {
        // cut at the top of the bounce (it came down beside the slime, on grass, and took damage)
        // ride the bounce looking up and out (staring down at the slime all the way up read as a 1.3 s STILL),
        // and cut on the way up rather than at the apex
        // the slime arrives from the server a tick or two after the client lands, so mineflayer's physics never
        // bounced (it stood on the slime: review). Vanilla's bounceUp: the fall speed reversed (living: x1.0)
        bot.entity.velocity.y = -lastVy
        ctx.log('slime bounce from vy', lastVy.toFixed(2))
        ctx.easeLook(bot.entity.yaw, -0.15, 450)
        for (let k = 0; k < 14 && !(bot.entity.velocity.y < 0 && bot.entity.position.y > floor + 3); k++) await bot.waitForTicks(1)
        ctx.mark('apex')
        pending = spot
        continue
      }
      await bot.waitForTicks(3)
      if (ctx.died) return false
      if (c.item === 'water_bucket') {
        // the classic MLG pickup: scoop the water back into the bucket (it used to vanish by command, on camera)
        // aim at the source's centre (straight down from where it slid to missed it once: empty bucket, water left)
        for (let t = 0; t < 3 && bot.inventory.slots[36 + i]?.name !== 'water_bucket'; t++) {
          await ctx.easeLookAt(new ctx.Vec3(spot.x + 0.5, floor + 1.1, spot.z + 0.5), t ? 100 : 150)
          bot.activateItem(); bot.swingArm()
          await bot.waitForTicks(3)
        }
        if (bot.inventory.slots[36 + i]?.name === 'water_bucket') ctx.sound('item.bucket.fill', 1, 1); else ctx.log('scoop missed', i)
      }
      // step back off it, eyes on what saved you (the look up at the glass ended every beat on blank sky)
      const keep = new ctx.Vec3(spot.x + 0.5, floor + 1, spot.z + 0.5)
      bot.setControlState('back', true)
      for (let k = 0; k < 11; k++) {
        const e = bot.entity.position.offset(0, 1.62, 0), d = keep.minus(e)
        await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
        await bot.waitForTicks(1)
      }
      bot.setControlState('back', false)
      pending = spot                                   // cleared after the next cut, off camera
    }
    return ctx.died
  }
}
