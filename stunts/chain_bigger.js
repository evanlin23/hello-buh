// "chain reaction but every step gets BIGGER 😳" (worker 17, chain-reaction series #2): one take along
// a real redstone contraption of five tiers, each going x1 -> x10 -> x100, the TNT tier on to x1000.
// Built with commands before the recording; the only input during the take is the player's button.
//
// Every tier is the same machine with a different block under the dust (dust powers the block it
// sits on, so a lamp lights, a dispenser or dropper fires, a TNT primes):
//   spine (column c = e0 + 4, on top at h 2, running north):
//     n 2  dust (the bus comes in here)        n 3  dust on the x1 element
//     n 4-6  repeaters (1.2 s)                 n 7  dust on the x10 row (e0 .. e0+9)
//     n 8-10  repeaters (1.2 s)                n 11..20  dust on the x100 grid (fed at its near edge
//                                                  centre: every block is within 14 of the feed)
//   bus out: from the grid's near east corner, a repeater line east, south and east into the next
//   tier's spine (visible: it lights up as it goes)
// Tiers (e0): lamps -50, diamond blocks -36, splash potions -22, rockets -8, TNT 6. The TNT tier is different:
// redstone primes only its x1, and each bigger stage (x10 row, x100 grid, x1000 cube) is lit by the
// last one's blast. The player watches from a stone walkway 3 blocks up along n = -4, walking east with the chain.
const { relaySounds, clearMobs, rig } = require('../lib/chain')
const { findFlat } = require('./_site')

const T = 'polished_andesite'
const S = 'stone_bricks'
const TIERS = [
  { name: 'lamps', e0: -50, block: () => 'redstone_lamp' },
  { name: 'diamonds', e0: -36, block: () => 'dropper[facing=up]{Items:[{Slot:4b,id:"minecraft:diamond_block",count:1}]}' },
  { name: 'potions', e0: -22, block: (i) => `dispenser[facing=up]{Items:[{Slot:4b,id:"minecraft:splash_potion",count:1,components:{"minecraft:potion_contents":{potion:"minecraft:${['leaping', 'swiftness', 'fire_resistance', 'water_breathing', 'night_vision', 'regeneration', 'strength', 'healing'][i % 8]}"}}}]}` },
  { name: 'rockets', e0: -8, block: (i) => `dispenser[facing=up]{Items:[{Slot:4b,id:"minecraft:firework_rocket",count:1,components:{"minecraft:fireworks":{flight_duration:${1 + (i % 2)},explosions:[{shape:"${i % 3 ? 'large_ball' : 'star'}",colors:[I;${[16711680, 65280, 3381759, 16766720, 16711935][i % 5]},16777215]}]}}}]}` },
  { name: 'tnt', e0: 6, block: () => 'tnt' }
]
const AREA = [-56, 22, -36, 10]
const HW = 3                       // walkway height (its top surface)

module.exports = {
  name: 'chain_bigger',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'chain reaction but every step gets BIGGER 😳',
  botTimeout: 360,
  edit: {
    caption: 'chain reaction but every step gets BIGGER 😳', red: 'BIGGER', song: 'songs/funk_abnormal.mp3', dropAt: 'x1000_first',
    startAt: 'go:-0.1', endAfter: 'x1000:0.8'
  },

  async setup (ctx) {
    const { bot } = ctx
    await bot.waitForTicks(60); await bot.waitForChunksToLoad()
    let site = await findFlat(ctx, AREA, { reach: 160, stride: 24 })
    if (!site) {
      const p = bot.entity.position.floored(), s = ctx.surface(p.x, p.z)
      site = { x: p.x, z: p.z, y: Math.max(64, s ? s.position.y : 64) }
      ctx.log('no flat site: building at', site)
    }
    const X = site.x, Z = site.z, F = site.y
    Object.assign(this, { X, Z, F })
    const P = (e, h, n) => `${X + e} ${F + h} ${Z - n}`
    const c = (s) => ctx.cmd(s)
    const put = (e, h, n, b) => c(`/setblock ${P(e, h, n)} ${b}`)
    const fill = (e0, h0, n0, e1, h1, n1, b) => c(`/fill ${P(e0, h0, n0)} ${P(e1, h1, n1)} ${b}`)
    await ctx.defaultRules()
    for (const r of ['/difficulty peaceful', '/gamerule random_tick_speed 0', '/gamerule fire_spread_radius_around_player 0', '/gamerule block_drops false']) await c(r)
    await c(`/forceload add ${X + AREA[0]} ${Z + AREA[2]} ${X + AREA[1]} ${Z + AREA[3]}`)
    for (let z0 = Z + AREA[2]; z0 <= Z + AREA[3]; z0 += 4) {
      const z1 = Math.min(Z + AREA[3], z0 + 3)
      for (let y0 = F + 1; y0 <= F + 32; y0 += 16) await c(`/fill ${X + AREA[0]} ${y0} ${z0} ${X + AREA[1]} ${y0 + 15} ${z1} air`)
      await c(`/fill ${X + AREA[0]} ${F - 10} ${z0} ${X + AREA[1]} ${F - 1} ${z1} dirt`)
      await c(`/fill ${X + AREA[0]} ${F} ${z0} ${X + AREA[1]} ${F} ${z1} grass_block`)
    }
    await clearMobs(ctx, X - 17, Z - 10, 80)

    // the walkway: 3 wide along n = -5..-3, stone bricks on a solid base, from the first tier past the last
    await fill(-54, 1, -5, 20, HW, -3, S)

    for (let t = 0; t < TIERS.length; t++) {
      const { e0, block, name } = TIERS[t]
      const cx = e0 + 4
      if (name === 'tnt') {
        // a TNT primes the tick its dust powers it and the dust on it drops, before a repeater behind
        // it can latch: so redstone primes only the x1 (from the powered block beside it), and each
        // bigger stage sits 3 blocks from the last, lit by its blast: x1 -> x10 -> x100 -> x1000
        await put(cx, 1, 2, T); await put(cx, 2, 2, 'redstone_wire')
        await put(cx, 1, 3, T); await put(cx, 2, 3, 'redstone_wire')
        await put(cx + 1, 1, 3, 'tnt')
        await fill(e0, 1, 6, e0 + 9, 1, 6, 'tnt')
        // (a bridge TNT between the x10 row and the x100 grid: 3 rows apart they went off as one blast)
        await put(cx, 1, 9, 'tnt')
        await fill(e0, 1, 12, e0 + 9, 1, 21, 'tnt')
        await fill(e0, 1, 24, e0 + 9, 10, 33, 'tnt')
        // deep dirt under the TNT: a crater past the 10-block base can open an aquifer (water in it)
        for (let n0 = -6; n0 <= 38; n0 += 4) await fill(e0 - 12, -30, n0, e0 + 22, -11, n0 + 3, 'dirt')
        break
      }
      // spine supports and dust/repeaters
      await put(cx, 1, 2, T); await put(cx, 2, 2, 'redstone_wire')
      await put(cx, 1, 3, block(0)); await put(cx, 2, 3, 'redstone_wire')
      for (const n of [4, 5, 6, 8, 9, 10]) { await put(cx, 1, n, T); await put(cx, 2, n, 'repeater[facing=south,delay=4]') }
      // x10 row and x100 grid (elements at h 1, dust at h 2)
      for (let e = e0; e <= e0 + 9; e++) {
        await put(e, 1, 7, block(e - e0 + 1)); await put(e, 2, 7, 'redstone_wire')
        for (let n = 11; n <= 20; n++) await put(e, 1, n, block((e - e0) * 10 + n))
        await fill(e, 2, 11, e, 2, 20, 'redstone_wire')
      }
      if (t === TIERS.length - 1) break
      // bus out: (e0+9,2,11) is grid dust; dust east onto a support, repeaters east, south, east
      const nx = TIERS[t + 1].e0 + 4
      // (the dust's supports along the bus are lamps: dust powers the block under it, so the bus lights up as it goes)
      await put(e0 + 10, 1, 11, 'redstone_lamp'); await put(e0 + 10, 2, 11, 'redstone_wire')
      await put(e0 + 11, 1, 11, T); await put(e0 + 11, 2, 11, 'repeater[facing=west,delay=4]')
      await put(e0 + 12, 1, 11, 'redstone_lamp'); await put(e0 + 12, 2, 11, 'redstone_wire')
      for (let n = 10; n >= 1; n--) { await put(e0 + 12, 1, n, n % 2 ? 'redstone_lamp' : T); await put(e0 + 12, 2, n, n % 2 ? 'redstone_wire' : 'repeater[facing=north,delay=4]') }
      for (let e = e0 + 13; e < nx; e++) { await put(e, 1, 1, (e - e0) % 2 ? T : 'redstone_lamp'); await put(e, 2, 1, (e - e0) % 2 ? 'repeater[facing=west,delay=4]' : 'redstone_wire') }
      await put(nx, 1, 1, T); await put(nx, 2, 1, 'redstone_wire')    // into the next spine's start (nx,2,2)
    }
    // the first tier's button: on the south face of the first spine support's west neighbour
    const c0 = TIERS[0].e0 + 4
    // the button: on the east face of a block sticking out of the walkway's north edge; dust from
    // beside that block steps down a little stair into the first spine's start (c0,2,2)
    await put(c0 - 1, HW, -2, T)
    await put(c0, HW, -2, 'stone_button[face=wall,facing=east]')
    await fill(c0 - 1, 1, -1, c0 - 1, HW - 1, -1, T); await put(c0 - 1, HW, -1, 'redstone_wire')
    for (const n of [0, 1, 2]) { await put(c0 - 1, 1, n, T); await put(c0 - 1, 2, n, 'redstone_wire') }
    Object.assign(this, { c0 })

    await clearMobs(ctx, X - 17, Z - 10, 80)
    await c('/kill @e[type=item]')
    await ctx.hotbar([null, ['bread', 12]])
    await ctx.tpCheck(X + c0 - 1 + 0.5, F + HW + 1, Z + 4.5, 180, 25)
    await c('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x: X - 17, y: F, z: Z - 10 }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F, c0 } = this
    const W = (e, h, n) => new Vec3(X + e + 0.5, F + h, Z - n + 0.5)
    const B = (e, h, n) => new Vec3(X + e, F + h, Z - n)
    const stopSounds = relaySounds(ctx)
    // each tier's x1, x10 and x100 (the dust on them powered; for the TNT, the TNT gone = primed)
    const dust = (b) => +b.getProperties().power > 0
    const gone = (b) => b.name !== 'tnt'
    const steps = []
    for (const t of TIERS) {
      const cx = t.e0 + 4
      if (t.name === 'tnt') {
        steps.push({ name: 'tnt1', pos: B(cx + 1, 1, 3), test: gone })
        steps.push({ name: 'tnt10', pos: B(cx, 1, 6), test: gone })
        steps.push({ name: 'tnt100', pos: B(cx, 1, 16), test: gone })
        continue
      }
      steps.push({ name: `${t.name}1`, pos: B(cx, 2, 3), test: dust })
      steps.push({ name: `${t.name}10`, pos: B(cx, 2, 7), test: dust })
      steps.push({ name: `${t.name}100`, pos: B(cx, 2, 11), test: dust })
    }
    const r = rig(ctx, steps)
    const tt = TIERS[TIERS.length - 1]
    let booms = 0, big = 0
    const onBoom = (p) => {
      booms++
      const n = Z - +(p.center || {}).z
      if (n < 4.5) r.markOnce('boom1')
      else if (n < 8.5) r.markOnce('boom10')
      else if (n > 10.5 && n < 22.5) r.markOnce('boom100')
      else if (n < 22.5) return
      else { r.markOnce('x1000_first'); if (++big === 40) r.markOnce('x1000') }
    }
    bot._client.on('explosion', onBoom)
    // glide the aim from where it is to `to` over `ticks` (the camera follows the signal along a
    // spine or a bus), stopping early when `done` says the next stage fired
    const glide = async (to, ticks, done = () => false) => {
      const from = r.focus
      for (let i = 1; i <= ticks && !done(); i++) { const u = i / ticks, e = u * u * (3 - 2 * u); r.focus = from.plus(to.minus(from).scaled(e)); await bot.waitForTicks(1) }
    }
    const view = (t, s) => W(t.e0 + 4.5, s === 100 ? 1 : 1.5, s === 1 ? 3 : s === 10 ? 7 : 15)
    const up = (t) => t.name === 'diamonds' || t.name === 'rockets' || t.name === 'potions'
    const lift = (t, s) => t.name === 'rockets' ? (s === 100 ? 10 : 6) : t.name === 'diamonds' ? 2.5 : 4

    ctx.mark('go')
    r.focus = W(c0, HW + 0.4, -2)
    await bot.waitForTicks(10)
    bot._client.write('block_place', { hand: 0, location: B(c0, HW, -2), direction: 5, cursorX: 0.1, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm()
    ctx.mark('press')
    r.k = 0.14
    await glide(view(TIERS[0], 1), 8)
    for (let i = 0; i < TIERS.length - 1; i++) {
      const t = TIERS[i]
      r.steer = W(t.e0 + 4.5, 0, -4)
      await r.until(() => r.at(`${t.name}1`), 120)
      if (up(t)) await glide(view(t, 1).offset(0, lift(t, 1), 0), 6)
      await glide(view(t, 10), 18, () => r.at(`${t.name}10`))
      await r.until(() => r.at(`${t.name}10`), 40)
      if (up(t)) await glide(view(t, 10).offset(0, lift(t, 10), 0), 6)
      await glide(view(t, 100), 18, () => r.at(`${t.name}100`))
      await r.until(() => r.at(`${t.name}100`), 40)
      // stay on the payoff: the potions splash ~1.5 s after they fly, the rockets burst ~1.2 s up
      if (up(t)) { await glide(view(t, 100).offset(0, lift(t, 100), 3), 10); if (t.name === 'potions') { await glide(view(t, 100).offset(0, 1, 0), 20); await bot.waitForTicks(10) } else if (t.name === 'rockets') await bot.waitForTicks(14) } else await bot.waitForTicks(8)
      // follow the bus to the next tier: out east, south, east (the repeaters light as it goes)
      const nt = TIERS[i + 1]
      r.steer = W(nt.e0 + 4.5, 0, -4)
      await glide(W(t.e0 + 12, 2, 6), 20)
      await glide(W(t.e0 + 13, 2, 1), 16)
      await glide(view(nt, 1), 24, () => r.at(`${nt.name}1`))
    }
    // the TNT: x1 primed (4 s fuse); back off along the walkway facing it, glancing at what comes next
    r.steer = W(tt.e0 + 4.5, 0, -4)
    await r.until(() => r.at('tnt1'), 120)
    // back off along the walkway; the flashing x1 stays in the lower third the whole fuse (the aim
    // sits just beyond it, on the row it will light), then rise stage by stage
    r.steer = W(tt.e0 - 12, 0, -4)
    await glide(W(tt.e0 + 5.5, 1.2, 4.5), 16)
    await r.until(() => booms > 0, 90)
    await glide(W(tt.e0 + 4.5, 1.5, 7), 12, () => r.at('boom10'))
    await r.until(() => r.at('boom10'), 40)
    await glide(W(tt.e0 + 4.5, 1.5, 16), 14, () => r.at('boom100'))
    await r.until(() => r.at('boom100'), 50)
    r.k = 0.1
    await glide(W(tt.e0 + 4.5, 5, 29), 16, () => r.at('x1000'))
    await r.until(() => r.at('x1000'), 80)
    await bot.waitForTicks(24)
    r.stop(); stopSounds(); bot._client.removeListener('explosion', onBoom)
    ctx.log('steps', JSON.stringify([...r.done]))
    return !!r.at('x1000') && !ctx.died
  }
}
