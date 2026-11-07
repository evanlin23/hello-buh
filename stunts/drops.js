// "1 in a million landing... x8 😳" (~31 s, escalating): the 1x1 water hole, eight drops from a
// glass block: 10, 30, 60, 100, 150, 200 and 230 blocks land; 250 blocks (clouds off: the fall crosses the cloud layer)
// misses by a block (death screen, "HelloBuh hit the ground too hard").
const DROPS = [   // six drops, ~30 s (owner: 30 s minimum); the last misses by a block
  { h: 10, off: 0, sub: '10 blocks' },
  { h: 30, off: 0, sub: '30 blocks' },
  { h: 60, off: 0, sub: '60 blocks' },
  { h: 100, off: 0, sub: '100 blocks' },
  { h: 125, off: 0, sub: '125 blocks' },   // eight landings, then the miss: the caption's x8
  { h: 150, off: 0, sub: '150 blocks' },
  { h: 200, off: 0, sub: '200 blocks' },
  { h: 230, off: 0, sub: '230 blocks' },
  { h: 250, off: 1.6, sub: '250 blocks...' }
]

module.exports = {
  name: 'drops',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 in a million landing... x8 😳',
  edit: {
    subsY: 0.15, caption: '1 in a million landing... x8 😳', red: 'x8', song: 'songs/ncs/royalty_funk.mp3', dropAt: 'death', startAt: 'dig1:-0.1',
    // (the 10-block drop is over in 1.2 s: 1.6 ran its sub over the cut)
    subs: DROPS.map((d, i) => [`drop${i + 1}`, d.sub, i === 0 ? 1.1 : 1.6]), deathScreen: true, endAfter: 'death:0.8',
    // cut the teleport turnarounds (the look up + tp read as a still), speed up the top of the 250 fall,
    // and a live blocks-fallen counter on every drop
    speed: [...DROPS.slice(1).map((_, i) => [`cut${i + 1}a`, `cut${i + 1}b`, 'cut']),
      // the top of every long fall at 1.5x (3.2-4.7 s between beats on the high drops); the approach to the hole is real speed
      ...DROPS.map((d, i) => d.h >= 100 ? [`fast${i + 1}a`, `fast${i + 1}b`, 1.5] : null).filter(Boolean)
    ],
    fallen: DROPS.map((d, i) => i === DROPS.length - 1 ? [`drop${i + 1}`, 'death'] : [`drop${i + 1}`, `splash${i + 1}`, 'blocks', -1])   // -1: the splash fires with the feet in the water block (read 11/31/...; the miss lands on the grass, no offset)
  },
  expectDeath: true,
  // the server only sends chunks within 192 of where the bot stands, so the 320 fog radius needs these stops
  // (a ring 160 out: every point to 352 is within 192 of one); without them the land ended in hard edges
  chunkStops: set => [...Array(8).keys()].map(k => ({ x: Math.round(set.x + 160 * Math.cos(k * Math.PI / 4)), z: Math.round(set.z + 160 * Math.sin(k * Math.PI / 4)) })),
  renderDistance: 20, recordRadius: 320,   // the ground has to stay in sight from 251 up (fog is max(xz, |y|)): at 12 (192 blocks) the 230/250 drops opened on ~1 s of blank fog
  clouds: false,                // the 200-250 block falls cross y 192: the camera went through a white cloud wall

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    // flat, dry ground: a lake beside a pit cut into a hill read as "landing in a pond", not a 1x1 hole
    const flat = (cx, cz) => {
      const c = ctx.surface(cx, cz)
      if (!c || !['grass_block', 'dirt'].includes(c.name) || c.position.y < 62 || c.position.y > 67) return null   // > 67: the 250 glass (floor + 250) went past the 319 build limit, never placed: no break on the last drop
      for (let dx = -6; dx <= 6; dx++) {
        for (let dz = -6; dz <= 6; dz++) {
          const b = ctx.surface(cx + dx, cz + dz)
          if (!b || /water|lava|ice/.test(b.name)) return null
          if (Math.abs(dx) <= 3 && Math.abs(dz) <= 3 && (Math.abs(b.position.y - c.position.y) > 1 || !['grass_block', 'dirt'].includes(b.name))) return null
        }
      }
      return c.position
    }
    let g = null
    // no fallback: findLand put the hole on a shoreline and the lawn read as a platform built out into the sea.
    // Nothing near spawn: move on 160 blocks at a time (the area round the bot is what's loaded) and look again
    let cx = sp.x, cz = sp.z
    for (let hop = 0; hop < 8 && !g; hop++) {
      if (hop > 0) {
        cx = sp.x + [160, 0, -160, 0, 320, 0, -320, 0][hop - 1] * 1; cz = sp.z + [0, 160, 0, -160, 0, 320, 0, -320][hop - 1]
        await ctx.cmd('/gamemode creative'); await ctx.cmd(`/tp @s ${cx} 200 ${cz}`)
        await bot.waitForTicks(20); try { await bot.waitForChunksToLoad() } catch (e) {}
        await bot.waitForTicks(20)
      }
      for (let r = 0; r <= 96 && !g; r += 8) {
        for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) { if ((g = flat(cx + dx, cz + dz))) break }
      }
      if (!g) ctx.log('no flat dry spot near', cx, cz)
    }
    if (!g) throw new Error('no flat dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd('/gamerule keep_inventory true')   // nothing drops on the death: the dropped items drew as bare shadows on the death screen (engine)
    // only the shaft is cleared: a 21x21 pit carved into the hill read as command-built in every landing
    const H = Math.min(DROPS[DROPS.length - 1].h + 4, 318 - floor)
    for (let y0 = floor + 1; y0 <= floor + H; y0 += 40) await ctx.cmd(`/fill ${x - 2} ${y0} ${z - 2} ${x + 2} ${Math.min(y0 + 39, floor + H)} ${z + 2} air`)
    // level the patch round the hole (the flat check allows +-1) so the 1x1 reads as a hole in a lawn
    await ctx.cmd(`/fill ${x - 3} ${floor + 1} ${z - 3} ${x + 3} ${floor + 3} ${z + 3} air`)
    await ctx.cmd(`/fill ${x - 3} ${floor} ${z - 3} ${x + 3} ${floor} ${z + 3} grass_block`)
    await ctx.cmd(`/setblock ${x} ${floor} ${z} water`)
    await ctx.cmd(`/setblock ${x} ${floor - 1} ${z} stone`)
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16], 'diamond_pickaxe'])
    await ctx.cmd('/gamemode survival')
    await bot.waitForTicks(10)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor } = this
    for (let i = 0; i < DROPS.length; i++) {
      const d = DROPS[i], top = floor + d.h, n = i + 1

      // the hole re-filled every drop: in a cold spot the water froze to ice and the 230 landed on it (death)
      bot.chat(`/setblock ${x} ${floor} ${z} water`)
      const gx = x + Math.floor(0.5 + d.off)        // the glass sits under the bot (the offset drop missed its block and fell)
      await ctx.cmd(`/setblock ${gx} ${top} ${z} glass`)
      // on the glass, looking straight down. A fast tp: tpCheck's 1 s settle was a 1.8 s still between drops
      const tx = x + 0.5 + d.off, ty = top + 1, tz = z + 0.5
      for (let a = 0; ; a++) {
        bot.chat(`/tp @s ${tx} ${ty} ${tz} 0 80`)   // 80, not 89: the hole sits beside the crosshair, not under it
        let ok = false
        for (let t = 0; t < 10 && !ok; t++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.y - ty) < 0.1 && Math.abs(bot.entity.position.x - tx) < 0.1 }
        if (ok) { await bot.waitForTicks(1); if (Math.abs(bot.entity.position.y - ty) < 0.1) break }
        if (a === 4) throw new Error('teleport did not stick')
      }
      bot.chat('/effect give @s instant_health 1 5 true')
      if (i > 0) ctx.mark(`cut${i}b`)   // the cut ends right here: the tp settle stays out of the video
      // break the glass under your feet for real (swing + crack stages; it used to vanish by command)
      ctx.mark(`dig${n}`)
      try { await bot.dig(bot.blockAt(new ctx.Vec3(gx, top, z)), 'ignore') } catch (e) { ctx.log('dig', e.message); await ctx.cmd(`/setblock ${gx} ${top} ${z} air`) }
      ctx.mark(`drop${n}`, { h: d.h }); ctx.mark('drop'); ctx.sound('block.glass.break', 1)
      ctx.particles('block', { x: gx, y: top, z }, { block: 'glass' })
      let splashed = false, fast = false
      for (let k = 0; k < 260 && !ctx.died; k++) {
        await bot.waitForTicks(1)
        // eyes stay on the hole all the way down (the mid-fall glances lost it on the 250, the one that misses,
        // and put the loaded area's edge in frame); the top of a long fall plays faster instead
        if (d.h >= 100 && k === 6) { fast = true; ctx.mark(`fast${n}a`) }
        if (fast && bot.entity.position.y < floor + 60) { fast = false; ctx.mark(`fast${n}b`) }
        if (d.off && !splashed && bot.entity.position.y < floor + 1.4) {
          // the fatal landing: vanilla throws a burst of the ground block's particles, on the grass top (it was
          // emitted after the death, which the recording had stopped taking, and inside the block)
          splashed = true
          const p = bot.entity.position
          for (let q = 0; q < 4; q++) ctx.particles('block', { x: Math.floor(p.x) + (q % 2) - 0.5, y: floor + 1, z: Math.floor(p.z) + (q >> 1) - 0.5 }, { block: 'grass_block' })
          ctx.sound('entity.player.big_fall', 1)
        }
        if (!splashed && bot.entity.position.y < floor + 1.2) {
          splashed = true
          if (!d.off) { ctx.mark(`splash${n}`); ctx.mark('splash'); ctx.sound('entity.player.splash.high_speed'); ctx.particles('splash', { x: x + 0.5, y: floor + 0.95, z: z + 0.5 }, { count: 30 }) }
        }
        if (splashed && k > 4 && (bot.entity.onGround || bot.entity.isInWater)) break
      }
      if (fast) ctx.mark(`fast${n}b`)
      if (ctx.died) break
      await bot.waitForTicks(6)
      ctx.mark(`cut${n}a`)                                               // cut 0.3 s after the splash
    }
    for (let k = 0; k < 40 && !ctx.died; k++) await bot.waitForTicks(1)
    await bot.waitForTicks(50)                                           // the death screen
    return ctx.died
  }
}
