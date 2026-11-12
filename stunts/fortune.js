// "POV: fortune 1000 💀" (~8 s, v4): a rock face with a row of ores at eye height; the player walks along it with a
// Fortune pickaxe. Coal, iron, gold, diamond: each ore is broken with the crosshair on it the whole dig, bursts into a
// bigger fountain of real dropped items, and the camera follows the fountain where it flies (it arcs on ahead, to where
// the player walks next and picks it up). Then the emerald ore EXPLODES: ~500 emeralds burst out of it all at once,
// over and past the camera, and the Short ends 0.7 s later.
// Owner 2026-11-12 on v3 (r:ra8d5da): "we should look at the block we are breaking. and i think the moving around was
// fine...", "like we should keep looking at the shower.", "And we should end faster, right after the shower explodes in
// emeralds". Fast cuts between beats, never inside a dig (r:r188b46, r:r52f94c). Every item is a real dropped item
// entity with vanilla physics (summoned with a launch motion), drawn upright (r:r52f94c).
const ORES = [
  { block: 'coal_ore', drop: 'coal', n: 24 },
  { block: 'iron_ore', drop: 'raw_iron', n: 40 },
  { block: 'gold_ore', drop: 'raw_gold', n: 56 },
  { block: 'diamond_ore', drop: 'diamond', n: 72 },
  { block: 'emerald_ore', drop: 'emerald', n: 0 }   // the payoff: the explosion below
]
const SPACING = 2
const BURST_TICKS = 4, BURST_PER_TICK = 125   // the emerald explosion: 500 items in 0.2 s

module.exports = {
  name: 'fortune',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: fortune 1000 💀',
  edit: { subsY: 0.15, caption: 'POV: fortune 1000 💀', red: '1000', dropAt: 'flood', startAt: 'mine0:-0.1', endAfter: 'flood:0.7',
    // fast cuts (r:r188b46): each fountain is followed to where it lands, then a cut straight to the walk to the next
    // ore (both edges on a resting camera; between digs, never inside one: r:r52f94c)
    speed: [...ORES.slice(0, -1).map((_, i) => [`seen${i}`, `walk${i + 1}`, 'cut']),
      ...ORES.slice(1).map((_, i) => [`walk${i + 1}`, `mine${i + 1}:-0.05`, 1.5])],   // the walk along the wall (owner: "the moving around was fine"), brisk: its turns stay well under the whip cap
    flash: [['flood', 0, 0.45]],
    shake: [['flood', 0, 10]],
    punch: [['flood', 0, 1.1]],
    sfx: [['impact', 'mine0:0.02', { gain: 2.0 }], ['impact', 'burst0', { gain: 2.0 }], ['dip', 'flood', 0.4], ['impact', 'flood', { gain: 1.5 }]] },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 16} ${floor + 1} ${z - 9} ${x + 16} ${floor + 12} ${z + 9} air`)
    await ctx.cmd(`/fill ${x - 16} ${floor} ${z - 9} ${x + 16} ${floor} ${z + 9} grass_block`)
    await ctx.cmd(`/fill ${x - 16} ${floor - 3} ${z - 9} ${x + 16} ${floor - 1} ${z + 9} dirt`)
    await ctx.cmd('/kill @e[type=!player,distance=..40]')
    // the rock face, 3 deep, its front at z - 3: stone with patches of andesite / tuff / granite / cobblestone (a busy
    // face: frame 0 is the pickaxe on an ore in a rich wall, never a bare one, r:r0f3da0), grass on top
    this.wz = z - 3
    await ctx.cmd(`/fill ${x - 13} ${floor + 1} ${this.wz - 2} ${x + 13} ${floor + 6} ${this.wz} stone`)
    await ctx.cmd(`/fill ${x - 13} ${floor + 7} ${this.wz - 2} ${x + 13} ${floor + 7} ${this.wz} grass_block`)
    this.ores = ORES.map((o, i) => ({ ...o, x: x - 4 + i * SPACING, y: floor + 2 }))
    let s = 11
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    for (let k = 0; k < 50; k++) {
      const bx = x - 12 + Math.floor(r() * 25), by = floor + 1 + Math.floor(r() * 6)
      const b = ['andesite', 'tuff', 'granite', 'cobblestone'][Math.floor(r() * 4)]
      if (this.ores.some(o => Math.abs(o.x - bx) <= 1 && Math.abs(o.y - by) <= 1)) continue   // the ores sit in plain stone
      await ctx.cmd(`/setblock ${bx} ${by} ${this.wz} ${b}`)
    }
    for (const o of this.ores) await ctx.cmd(`/setblock ${o.x} ${o.y} ${this.wz} ${o.block}`)
    await ctx.hotbar(['diamond_pickaxe[enchantments={fortune:3,efficiency:5}]'])   // enchanted: it glints
    this.standZ = z + 0.2
    await ctx.tpCheck(this.ores[0].x + 0.5, floor + 1, this.standZ, 180, 0)
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
    const face = (o) => new Vec3(o.x + 0.5, o.y + 0.5, wz + 1.0)
    const look = async (pt) => { await A.view(pt); await bot.waitForTicks(1) }   // one governed tick toward a point
    // new item entities since a beat's burst: the camera follows their centre (the shower), r:ra8d5da
    let watch = null
    bot.on('entitySpawn', (e) => { if (watch && e.name === 'item') watch.push(e) })
    const centre = () => {
      const live = (watch || []).filter(e => e.isValid !== false && bot.entities[e.id])
      if (!live.length) return null
      const c = live.reduce((a, e) => a.plus(e.position), new Vec3(0, 0, 0)).scaled(1 / live.length)
      return c.offset(0, 0.2, 0)
    }
    // one item launched from s on an arc that lands at (tx, tz) (vanilla item physics: gravity 0.04, drag 0.98)
    const launch = (drop, sx, sy, sz, tx, tz, vy, tag, count = 1) => {
      let y = sy, T = 0
      for (let v = vy; T < 80; T++) { v -= 0.04; y += v; v *= 0.98; if (y <= ground && T > 2) break }
      const f = (1 - Math.pow(0.98, T)) / 0.02
      // PickupDelay 32767: never merged mid-air (a merge collapses the fountain into a few stacks); released below
      bot.chat(`/summon item ${sx.toFixed(2)} ${sy.toFixed(2)} ${sz.toFixed(2)} {Item:{id:"minecraft:${drop}",count:${count}},PickupDelay:32767,Tags:["${tag}"],Motion:[${((tx - sx) / f).toFixed(3)},${vy.toFixed(3)},${((tz - sz) / f).toFixed(3)}]}`)
    }
    // the dig: the crosshair onto the ore (lib/act.js) and held there through Efficiency V's 3-tick break (the vanilla
    // start/finish packets: bot.dig throws on an enchanted tool on 1.21.11, docs/lessons.md)
    const dig = async (o, i) => {
      const p = new Vec3(o.x, o.y, wz)
      await A.aimAt(face(o), { on: p })
      ctx.mark(`mine${i}`); ctx.mark('mine')
      const pk = (status) => bot._client.write('block_dig', { status, location: p, face: 3, sequence: 0 })   // motion-ok: aimed above (A.aimAt), held on it below
      pk(0)
      for (let t = 0; t < 4; t++) { if (t % 2 === 0) { bot.swingArm(); ctx.sound('block.stone.hit', 0.5, 0.7) } await look(face(o)) }
      pk(2)
      await look(face(o))
      for (let t = 0; t < 3 && bot.blockAt(p)?.name !== 'air'; t++) await look(face(o))
      if (bot.blockAt(p)?.name !== 'air') { ctx.log('dig did not break', o.block); bot.chat(`/setblock ${o.x} ${o.y} ${wz} air`) }
      ctx.sound('block.stone.break', 1); ctx.particles('block', p, { block: o.block })
      bot.chat(`/kill @e[type=item,x=${o.x + 0.5},y=${o.y + 0.5},z=${wz + 0.5},distance=..1.2]`)   // the ore's own drop, in the recess
    }
    const standX = (i) => this.ores[Math.min(i, this.ores.length - 1)].x + 0.5
    await bot.waitForTicks(4)
    for (let i = 0; i < this.ores.length; i++) {
      const o = this.ores[i]
      if (i > 0) {
        // back onto the next ore (cut out by the edit), a rest, then the walk along the wall with the eyes on it
        await A.turnTo(face(o), { hold: 4, max: 40, tol: 0.005 })
        ctx.mark(`walk${i}`)
        for (let k = 0; k < 3; k++) await look(face(o))   // still on both sides of the cut in (r:r38374d)
        const tx = standX(i)
        for (let k = 0; k < 30 && Math.abs(bot.entity.position.x - tx) > 0.12; k++) {
          bot.setControlState('right', bot.entity.position.x < tx - 0.12)   // motion-ok: a strafe along the wall, the view governed on the ore
          bot.setControlState('left', bot.entity.position.x > tx + 0.12)    // motion-ok: as above
          await look(face(o))
        }
        bot.setControlState('right', false); bot.setControlState('left', false)   // motion-ok: as above
        for (let k = 0; k < 2; k++) await look(face(o))
      }
      await dig(o, i)
      ctx.mark('ore', { n: i, block: o.block }); ctx.mark(`burst${i}`)
      watch = []
      if (i < this.ores.length - 1) {
        // the fountain arcs on along the wall, to where the next ore's spot is: the camera follows it there
        const tag = `fd${i}`, nx = standX(i + 1)
        for (let k = 0; k < o.n; k++) {
          const sx = o.x + 0.5 + (rnd() - 0.5) * 0.9, sy = o.y + 0.5 + (rnd() - 0.5) * 0.7, sz = wz + 1.1 + rnd() * 0.3
          launch(o.drop, sx, sy, sz, nx + (rnd() - 0.5) * 1.4, this.standZ - 0.9 + rnd() * 1.0, 0.3 + rnd() * 0.16, tag)   // a high arc: in frame longer, down within reach of the next spot
        }
        { let t = 0; const rel = () => { if (++t === 22) { bot.chat(`/execute as @e[type=item,tag=${tag}] run data merge entity @s {PickupDelay:0}`); bot.removeListener('physicsTick', rel) } }; bot.on('physicsTick', rel) }
        if (/coal|diamond/.test(o.block)) for (let k = 0; k < 3; k++) bot.chat(`/summon experience_orb ${o.x + 0.5} ${o.y + 0.5} ${wz + 1.2} {Value:3}`)
        // the camera rides the fountain's mean arc (the same vanilla physics as launch(): it starts on the hole, rises,
        // and comes down at the next spot), so the shower stays in the middle of the frame (r:ra8d5da)
        const arc = []
        { const sx = o.x + 0.5, sy = o.y + 0.5, sz = wz + 1.25, tx = nx, tz = this.standZ - 0.4, vy0 = 0.38
          let y = sy, T = 0; for (let v = vy0; T < 80; T++) { v -= 0.04; y += v; v *= 0.98; if (y <= ground && T > 2) break }
          const f = (1 - Math.pow(0.98, T)) / 0.02, vx = (tx - sx) / f, vz = (tz - sz) / f
          let p = new Vec3(sx, sy, sz), v = new Vec3(vx, vy0, vz)
          for (let k = 0; k <= T + 2; k++) { arc.push(p.offset(0, 0.25, 0)); v = new Vec3(v.x * 0.98, (v.y - 0.04) * 0.98, v.z * 0.98); if (p.y + v.y > ground) p = p.plus(v) } }
        let last = face(o)
        for (let k = 0; k < 14; k++) { const g = arc[Math.min(k + 3, arc.length - 1)]; last = last.plus(g.minus(last).scaled(k < 3 ? 0.3 : 0.6)); await look(last) }   // cut ~0.9 s after the break (r:r188b46)
        { const hold = last.clone(); for (let k = 0; k < 4; k++) await look(hold) }   // a rest on where it landed: the cut goes out here (the view still, r:r38374d)
        ctx.mark(`seen${i}`)
        watch = null
      } else {
        // the emerald ore EXPLODES: 500 emeralds out of it in 0.2 s, over, past and round the camera
        ctx.mark('flood')
        ctx.sound('entity.firework_rocket.large_blast', 1, 0.7); ctx.sound('block.amethyst_block.break', 1, 0.6)
        ctx.sound('entity.player.levelup', 0.9, 1.0); ctx.sound('entity.generic.splash', 0.7, 0.7)
        const me = bot.entity.position.clone()
        let t = 0, n = 0
        const burst = () => {
          if (++t > BURST_TICKS) { bot.removeListener('physicsTick', burst); return }
          for (let k = 0; k < BURST_PER_TICK; k++) {
            const sx = o.x + 0.5 + (rnd() - 0.5) * 0.8, sy = o.y + 0.5 + (rnd() - 0.5) * 0.7, sz = wz + 1.1 + rnd() * 0.2
            const a = rnd() * 2 * Math.PI, rr = 0.6 + rnd() * 5.5
            launch('emerald', sx, sy, sz, me.x + Math.cos(a) * rr, me.z - 1.2 + Math.sin(a) * rr * 0.9, 0.18 + rnd() * 0.42, 'flood', 1 + Math.floor(rnd() * 40)); n++
          }
        }
        bot.on('physicsTick', burst)
        for (let k = 0; k < 6; k++) bot.chat(`/summon experience_orb ${o.x + 0.5} ${o.y + 0.5} ${wz + 1.3} {Value:7}`)
        // the eyes stay on the hole for the first frames, then lift a little with the shower
        let last = face(o)
        for (let k = 0; k < 40; k++) {
          const c = k < 3 ? null : centre()
          if (c) last = last.plus(c.minus(last).scaled(0.25))
          await look(last)
        }
        ctx.log('emeralds', n)
      }
    }
    return !ctx.died
  }
}
