// "POV: fortune 1000 💀" (~10 s): a rock face studded with ores; the player stands at one spot with a Fortune pickaxe.
// Four quick beats, each ore bursting into a bigger fountain of real dropped items (coal, iron, gold, diamonds: fast
// cuts, r:r188b46). Then the emerald ore in the middle: it doesn't burst, it FLOODS. Emeralds gush out of the hole and
// rain down from above for ~3.5 s until the ground round the player is carpeted in green and the view looks up into a
// falling sheet of them (audit 2026-11-12: "a visible emerald flood that buries the player", not a counter over a bare
// wall). Every item is a real dropped item entity with vanilla physics (summoned with a launch motion); the flood's
// items never get picked up (PickupDelay 32767: they also never merge), so they pile up round the feet.
// Items render upright (owner r:r52f94c, renderer motion fixes).
const ORES = [   // block, drop, items, offset from the standing spot (no walking between beats)
  { block: 'coal_ore', drop: 'coal', n: 24, dx: -2, dy: 1 },
  { block: 'iron_ore', drop: 'raw_iron', n: 40, dx: 2, dy: 1 },
  { block: 'gold_ore', drop: 'raw_gold', n: 56, dx: -2, dy: 3 },
  { block: 'diamond_ore', drop: 'diamond', n: 72, dx: 2, dy: 3 }
]
const EM = { block: 'emerald_ore', dx: 0, dy: 2 }
const FLOOD_TICKS = 72          // the gush: items every tick for 3.6 s
const GUSH = 7                  // a tick, out of the ore
const RAIN = 6                  // a tick, falling from above (from tick 12)

module.exports = {
  name: 'fortune',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: fortune 1000 💀',
  edit: { subsY: 0.15, caption: 'POV: fortune 1000 💀', red: '1000', dropAt: 'flood', startAt: 'mine0:-0.1', endAfter: 'buried:0.7',
    // fast cuts (r:r188b46): each fountain is cut 0.6 s after the break, straight to the next ore's dig (between digs,
    // never inside one: r:r52f94c); the flood plays whole
    speed: ORES.map((_, i) => [`burst${i}:0.6`, `mine${i + 1}:-0.05`, 'cut']),
    flash: [['flood', 0, 0.4], ['buried', 0, 0.5]],
    shake: [['flood', 0, 6]],
    sfx: [['impact', 'mine0:0.02', { gain: 1.5 }], ['impact', 'burst0', { gain: 1.4 }], ['dip', 'flood', 0.4], ['impact', 'flood', { gain: 1.3 }],
      ['dip', 'buried', 0.4], ['impact', 'buried', { gain: 1.4 }]],
    subs: [['flood', '1,000 emeralds', 0.9, 0], ['flood2', '10,000', 0.9, 0], ['flood3', '100,000', 0.9, 0], ['buried', 'send help', 1.2, 0]] },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 13} ${floor + 1} ${z - 8} ${x + 13} ${floor + 12} ${z + 8} air`)
    await ctx.cmd(`/fill ${x - 13} ${floor} ${z - 8} ${x + 13} ${floor} ${z + 8} grass_block`)
    await ctx.cmd(`/fill ${x - 13} ${floor - 3} ${z - 8} ${x + 13} ${floor - 1} ${z + 8} dirt`)
    await ctx.cmd('/kill @e[type=!player,distance=..40]')
    // the rock face, 3 deep, its front at z - 2: stone with patches of andesite / tuff / granite / cobblestone (a busy
    // face: frame 0 is the pickaxe on an ore in a rich wall, never a bare one, r:r0f3da0), grass on top
    this.wz = z - 2
    await ctx.cmd(`/fill ${x - 10} ${floor + 1} ${this.wz - 2} ${x + 10} ${floor + 6} ${this.wz} stone`)
    await ctx.cmd(`/fill ${x - 10} ${floor + 7} ${this.wz - 2} ${x + 10} ${floor + 7} ${this.wz} grass_block`)
    let s = 11
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    for (let k = 0; k < 40; k++) {
      const bx = x - 9 + Math.floor(r() * 19), by = floor + 1 + Math.floor(r() * 6)
      const b = ['andesite', 'tuff', 'granite', 'cobblestone'][Math.floor(r() * 4)]
      if (Math.abs(bx - x) <= 2 && by - floor <= 3) continue   // the five ores sit in plain stone
      await ctx.cmd(`/setblock ${bx} ${by} ${this.wz} ${b}`)
    }
    this.ores = ORES.map(o => ({ ...o, x: x + o.dx, y: floor + o.dy }))
    this.em = { ...EM, x: x + EM.dx, y: floor + EM.dy }
    for (const o of [...this.ores, this.em]) await ctx.cmd(`/setblock ${o.x} ${o.y} ${this.wz} ${o.block}`)
    await ctx.hotbar(['diamond_pickaxe[enchantments={fortune:3,efficiency:5}]'])   // enchanted: it glints
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.6, 180, 10)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const A = require('../lib/act')(ctx, { turnSpeed: 200 })
    let seed = 5
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    bot.on('playerCollect', (collector) => { if (collector === bot.entity) ctx.sound('entity.item.pickup', 0.25, 0.8 + rnd() * 0.8) })
    const wz = this.wz, ground = this.floor + 1
    // the dig: the crosshair onto the ore (lib/act.js), then the vanilla start/finish packets through Efficiency V's
    // 3-tick break on a hardness-3 ore (bot.dig throws on an enchanted tool on 1.21.11: docs/lessons.md)
    const dig = async (o, mark) => {
      const p = new Vec3(o.x, o.y, wz)
      const face = p.offset(0.5, 0.5, 1.0)
      await A.aimAt(face, { on: p })
      await A.turnTo(face, { hold: 2 })   // resting on it: the edit's cut lands on this rest
      ctx.mark(mark)
      ctx.mark('mine')
      const pk = (status) => bot._client.write('block_dig', { status, location: p, face: 3, sequence: 0 })   // motion-ok: aimed above (A.aimAt + A.turnTo)
      pk(0)
      for (let t = 0; t < 4; t++) { if (t % 2 === 0) { bot.swingArm(); ctx.sound('block.stone.hit', 0.5, 0.7) } await bot.waitForTicks(1) }
      pk(2)
      await bot.waitForTicks(1)
      if (bot.blockAt(p)?.name !== 'air') { ctx.log('dig did not break', o.block); bot.chat(`/setblock ${o.x} ${o.y} ${wz} air`) }
      ctx.sound('block.stone.break', 1); ctx.particles('block', p, { block: o.block })
      bot.chat(`/kill @e[type=item,x=${o.x + 0.5},y=${o.y + 0.5},z=${wz + 0.5},distance=..1.2]`)   // the ore's own drop, in the recess
      return p
    }
    // one item launched from s on an arc that lands at (tx, tz) (vanilla item physics: gravity 0.04, drag 0.98)
    const launch = (drop, sx, sy, sz, tx, tz, vy, tag, count = 1) => {
      let y = sy, T = 0
      for (let v = vy; T < 80; T++) { v -= 0.04; y += v; v *= 0.98; if (y <= ground && T > 2) break }
      const f = (1 - Math.pow(0.98, T)) / 0.02
      // PickupDelay 32767: never merged (a merge would collapse the fountain into a few stacks)
      bot.chat(`/summon item ${sx.toFixed(2)} ${sy.toFixed(2)} ${sz.toFixed(2)} {Item:{id:"minecraft:${drop}",count:${count}},PickupDelay:32767,Tags:["${tag}"],Motion:[${((tx - sx) / f).toFixed(3)},${vy.toFixed(3)},${((tz - sz) / f).toFixed(3)}]}`)
    }
    await bot.waitForTicks(4)
    for (let i = 0; i < this.ores.length; i++) {
      const o = this.ores[i]
      await dig(o, `mine${i}`)
      ctx.mark('ore', { n: i, block: o.block }); ctx.mark(`burst${i}`)
      const me = bot.entity.position, tag = `fd${i}`
      for (let k = 0; k < o.n; k++) {
        const sx = o.x + 0.5 + (rnd() - 0.5) * 0.9, sy = o.y + 0.5 + (rnd() - 0.5) * 0.7, sz = wz + 1.1 + rnd() * 0.3
        launch(o.drop, sx, sy, sz, me.x + (rnd() - 0.5) * 2.2, me.z - 0.6 + rnd() * 1.4, 0.16 + rnd() * 0.16, tag)
      }
      // released for pickup once they've come down (the hotbar fills, off screen between the cuts)
      { let t = 0; const rel = () => { if (++t === 22) { bot.chat(`/execute as @e[type=item,tag=${tag}] run data merge entity @s {PickupDelay:0}`); bot.removeListener('physicsTick', rel) } }; bot.on('physicsTick', rel) }
      if (/coal|diamond/.test(o.block)) for (let k = 0; k < 3; k++) bot.chat(`/summon experience_orb ${o.x + 0.5} ${o.y + 0.5} ${wz + 1.2} {Value:3}`)
      // follow the fountain down
      await A.turnTo({ yaw: o.dx > 0 ? -0.25 : 0.25, pitch: -0.35 }, { max: 16 })
      await bot.waitForTicks(14)
    }
    // the emerald ore: the flood
    const e = this.em
    await dig(e, 'mine4')
    ctx.mark('flood'); ctx.mark('ore', { n: 4, block: e.block })
    ctx.sound('entity.generic.splash', 0.8, 0.6); ctx.sound('block.amethyst_block.break', 1, 0.7)
    const me = bot.entity.position.clone()
    let t = 0, n = 0
    const flood = () => {
      t++
      if (t > FLOOD_TICKS) { bot.removeListener('physicsTick', flood); return }
      for (let k = 0; k < GUSH; k++) {   // out of the hole, over and round the player
        const sx = e.x + 0.5 + (rnd() - 0.5) * 0.8, sy = e.y + 0.5 + (rnd() - 0.5) * 0.6, sz = wz + 1.1 + rnd() * 0.2
        const a = rnd() * 2 * Math.PI, rr = 0.4 + rnd() * 3.2
        launch('emerald', sx, sy, sz, me.x + Math.cos(a) * rr, me.z - 0.3 + Math.sin(a) * rr * 0.9, 0.18 + rnd() * 0.3, 'flood', 1 + Math.floor(rnd() * 40)); n++
      }
      if (t > 12) {
        for (let k = 0; k < RAIN; k++) {   // and down from above: a falling sheet in front of the eyes
          const a = rnd() * 2 * Math.PI, rr = Math.sqrt(rnd()) * 3.0
          const sx = me.x + Math.cos(a) * rr, sz = me.z - 0.8 + Math.sin(a) * rr, sy = ground + 5.5 + rnd() * 3
          bot.chat(`/summon item ${sx.toFixed(2)} ${sy.toFixed(2)} ${sz.toFixed(2)} {Item:{id:"minecraft:emerald",count:${1 + Math.floor(rnd() * 40)}},PickupDelay:32767,Tags:["flood"],Motion:[${((rnd() - 0.5) * 0.06).toFixed(3)},${(-rnd() * 0.1).toFixed(3)},${((rnd() - 0.5) * 0.06).toFixed(3)}]}`); n++
        }
      }
      if (t % 3 === 0) ctx.sound('entity.item.pickup', 0.35, 0.6 + rnd() * 1.2)
      if (t % 5 === 0) ctx.sound('block.amethyst_block.chime', 0.6, 0.6 + rnd() * 0.8)
      if (t === 20) ctx.mark('flood2')
      if (t === 38) ctx.mark('flood3')
    }
    bot.on('physicsTick', flood)
    for (let k = 0; k < 4; k++) bot.chat(`/summon experience_orb ${e.x + 0.5} ${e.y + 0.5} ${wz + 1.2} {Value:7}`)
    // the camera: up into the gush and the rain, then down at the feet as the green fills the ground
    await A.turnTo({ yaw: 0, pitch: 0.55 }, { max: 24 })
    await bot.waitForTicks(14)
    await A.turnTo({ yaw: 0.25, pitch: 0.2 }, { max: 24 })
    await bot.waitForTicks(6)
    await A.turnTo({ yaw: -0.15, pitch: -1.1 }, { max: 30 })
    while (t < FLOOD_TICKS - 6) await bot.waitForTicks(1)
    await A.turnTo({ yaw: 0.1, pitch: -0.8 }, { max: 20 })
    ctx.mark('buried')
    ctx.sound('entity.player.levelup', 0.9, 1.0)
    await A.turnTo({ yaw: 0.2, pitch: -0.7 }, { max: 30 })
    await bot.waitForTicks(20)
    ctx.log('flood items', n)
    return !ctx.died
  }
}
