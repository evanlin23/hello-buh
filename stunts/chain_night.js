// "chain reaction at night 😳" (worker 17, chain-reaction series #3): the same idea at midnight, where
// every step lights something up. Built with commands before the recording; the only input during the
// take is the player's button. The player stands inside a U of track and turns to follow the chain.
//
// Layout (n = north of the start, e = east, h = height above the grass):
//   A  button (7,1,0) -> 5 repeaters west along n = 0, each into a block with a redstone lamp on top and a
//      chime note block beside it (a path of light into the dark)
//   B  the line's end -> a piston shoves a redstone block beside the launcher (-8,1,-2): a minecart runs
//      a U of track (north along e = -8, east along n = 10, south along e = 12) round the player;
//      every third rail is a detector rail with a copper bulb outside it, which turns on and STAYS on
//      (a copper bulb toggles on each pulse): the U lights up behind the cart
//   C  the end detector -> repeaters west along n = -5 fire 7 rocket dispensers in turn (night fireworks);
//      the last rocket hits a target on a tower, which fires a piston that shoves the anvil's ledge
//   D  an observer sees the anvil land -> a glowing repeater line west -> a TNT -> a TNT line north ->
//      a 3x3x3 -> then north-east through single TNTs: a 5x5x5 -> a 9x5x9 pile, 25 blocks off
const { relaySounds, clearMobs, rig } = require('../lib/chain')
const { findFlat } = require('./_site')

const T = 'polished_andesite'
const S = 'stone_bricks'
const NOTES = [6, 10, 13, 18, 22]                       // a rising arpeggio on chimes
const AREA = [-46, 22, -40, 26]

module.exports = {
  name: 'chain_night',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'chain reaction at night 😳',
  time: 18000,                     // midnight
  brightness: 1,                   // Options > Brightness: Bright (the unlit set still reads)
  botTimeout: 360,
  edit: {
    caption: 'chain reaction at night 😳', red: 'night', song: 'songs/funk_abnormal.mp3', dropAt: 'giant',
    startAt: 'go:-0.1', endAfter: 'giant_peak:0.8'
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
    await clearMobs(ctx, X - 12, Z, 80)

    // A: the button on the east face of a block, then the lamp-and-chime path west along n = 0
    await put(6, 1, 0, T)
    await put(7, 1, 0, 'stone_button[face=wall,facing=east]')
    const lampE = NOTES.map((_, k) => 4 - 2 * k)          // 4, 2, 0, -2, -4
    for (let k = 0; k < NOTES.length; k++) {
      const e = lampE[k]
      await put(e + 1, 1, 0, 'repeater[facing=east,delay=4]')
      await put(e, 1, 0, T)
      await put(e, 2, 0, 'redstone_lamp')
      await put(e, 0, 1, 'packed_ice')
      await put(e, 1, 1, `note_block[instrument=chime,note=${NOTES[k]}]`)
    }
    // B: the path's end (-4,1,0) -> a repeater south into a piston that shoves a stone and a redstone
    // block west: the redstone block ends beside the launcher rail (-8,1,-2)
    await put(-4, 1, -1, 'repeater[facing=north,delay=2]')
    await put(-4, 1, -2, 'piston[facing=west]')
    await put(-5, 1, -2, T)
    await put(-6, 1, -2, 'redstone_block')              // -> (-7,1,-2)
    await put(-8, 1, -3, T)                             // the backstop
    await put(-8, 1, -2, 'powered_rail[shape=north_south]')
    // the U: rails, boosters on redstone blocks, detector rails with copper bulbs outside them
    const track = []
    for (let n = -1; n <= 9; n++) track.push({ e: -8, n, dir: 'ns', out: [-1, 0] })
    track.push({ e: -8, n: 10, corner: 'south_east' })
    for (let e = -7; e <= 11; e++) track.push({ e, n: 10, dir: 'ew', out: [0, 1] })
    track.push({ e: 12, n: 10, corner: 'south_west' })
    for (let n = 9; n >= -1; n--) track.push({ e: 12, n, dir: 'ns', out: [1, 0] })
    this.bulbs = []
    let straight = 0
    for (let i = 0; i < track.length; i++) {
      const t = track[i]
      if (t.corner) { await put(t.e, 1, t.n, `rail[shape=${t.corner}]`); straight = 0; continue }
      const shape = t.dir === 'ns' ? 'north_south' : 'east_west'
      const last = i === track.length - 1
      straight++
      if (last) { await put(t.e, 1, t.n, `detector_rail[shape=${shape}]`); continue }
      if ([1, 2, 6, 14, 22, 30, 33, 37].includes(i)) { await put(t.e, 0, t.n, 'redstone_block'); await put(t.e, 1, t.n, `powered_rail[shape=${shape}]`) } else if (straight % 3 === 0) {
        await put(t.e, 1, t.n, `detector_rail[shape=${shape}]`)
        await put(t.e + t.out[0], 1, t.n + t.out[1], 'copper_bulb')
        this.bulbs.push({ e: t.e + t.out[0], n: t.n + t.out[1] })
      } else await put(t.e, 1, t.n, `rail[shape=${shape}]`)
    }
    await put(12, 1, -2, T)                             // the buffer
    this.track = track

    // C: the end detector (12,1,-1) -> wire east and south -> repeaters west along n = -5, each into a
    // block that fires the rocket dispenser south of it
    const rocket = (i) => `{Slot:4b,id:"minecraft:firework_rocket",count:1,components:{"minecraft:fireworks":{flight_duration:1,explosions:[{shape:"${['large_ball', 'star', 'burst', 'large_ball', 'small_ball', 'star', 'burst', 'large_ball', 'star', 'large_ball'][i]}",colors:[I;${[16711680, 16753920, 16776960, 65280, 3381759, 10027263, 16711935, 65535, 16766720, 16711680][i]}],fade_colors:[I;16777215]}]}}}`
    for (let e = 13; e <= 19; e++) await put(e, 1, -1, 'redstone_wire')
    for (let n = -2; n >= -9; n--) await put(19, 1, n, 'redstone_wire')
    this.rocketE = [17, 15, 13, 11, 9, 7, 5, 3, 1, -1]
    for (let i = 0; i < this.rocketE.length; i++) {
      const e = this.rocketE[i]
      await put(e + 1, 1, -9, `repeater[facing=east,delay=${i === 0 ? 1 : 4}]`)
      await put(e, 1, -9, T)
      await put(e, 1, -10, `dispenser[facing=up]{Items:[${rocket(i)}]}`)
    }
    // the last rocket (-1,1,-6) flies into a target on a tower; target -> repeater west -> piston west ->
    // shoves the ledge the anvil stands on (pistons can't push anvils); the anvil falls in clear view
    const hT = 11
    await fill(-1, 1, -11, -1, hT, -11, S)                // the tower, south of the rocket's path
    await put(-1, hT, -10, 'target')
    await fill(-2, 1, -10, -3, hT - 1, -10, S)
    await put(-2, hT, -10, 'repeater[facing=east,delay=4]')
    await put(-3, hT, -10, 'piston[facing=west]')
    await put(-4, hT, -10, S)
    await put(-4, hT + 1, -10, 'anvil[facing=north]')
    this.hT = hT
    // D: the anvil lands at (-4,1,-6); an observer west of it -> a repeater line west along n = -6 (its
    // torches glow) -> a TNT -> a TNT line north along e = -20 -> a 3x3x3 -> a 9x5x9 pile
    await put(-5, 1, -10, 'observer[facing=east]')
    this.lineE = []
    for (let e = -6; e >= -18; e--) { await put(e, 1, -10, (e % 2) ? 'repeater[facing=east,delay=4]' : 'redstone_wire'); if (e % 2) this.lineE.push(e) }
    await put(-19, 1, -10, 'repeater[facing=east,delay=2]')
    await put(-20, 1, -10, 'tnt')
    for (let n = -8; n <= 8; n += 2) await put(-20, 1, n, 'tnt')
    await fill(-22, 1, 11, -20, 3, 13, 'tnt')
    // then back east, each stage lit through two single TNTs: a 5x5x5 west of the U, the pile north of it
    // (3 apart: a whole cube's blast reaches ~6 blocks, so each gap is three single TNTs long)
    // (the 5x5x5 and the pile sit 20+ blocks north of the U: the player can't back off south past
    // the lamp path, and a cube's blast flings primed TNT 15-20 blocks)
    for (const [e, n] of [[-18, 14], [-16, 15], [-14, 16], [-12, 17], [-10, 18]]) await put(e, 1, n, 'tnt')   // ~2.5 apart: at 3.6 a single TNT didn't reliably light the next
    await fill(-9, 1, 19, -5, 5, 23, 'tnt')
    for (const [e, n] of [[-3, 23], [-1, 24], [1, 25], [3, 25], [5, 26]]) await put(e, 1, n, 'tnt')
    await fill(7, 1, 26, 15, 5, 34, 'tnt')
    // the finale's watch spot (10, 3) is an obsidian floor flush with the grass: flung TNT can't crater it
    await fill(8, 0, 1, 11, 0, 5, 'obsidian')
    // deep dirt under the TNT (a crater that reaches an aquifer fills with water)
    for (let n0 = -12; n0 <= 38; n0 += 3) await fill(-28, -30, n0, 22, -11, n0 + 2, 'dirt')

    await clearMobs(ctx, X - 12, Z, 80)
    await c('/kill @e[type=item]')
    await ctx.hotbar([null, ['bread', 12]])
    await c(`/summon minecart ${X - 8 + 0.5} ${F + 1.0625} ${Z + 2 + 0.5}`)
    await ctx.tpCheck(X + 8.5, F + 1, Z + 0.5, 90, 15)
    await c('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x: X - 12, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F, hT } = this
    const W = (e, h, n) => new Vec3(X + e + 0.5, F + h, Z - n + 0.5)
    const B = (e, h, n) => new Vec3(X + e, F + h, Z - n)
    const stopSounds = relaySounds(ctx)
    const prop = (k, v) => (b) => b.getProperties()[k] === v
    const lampE = NOTES.map((_, k) => 4 - 2 * k)
    const steps = [
      ...lampE.map((e, k) => ({ name: `lamp${k}`, pos: B(e, 2, 0), test: prop('lit', true) })),
      { name: 'launch', pos: B(-4, 1, -2), test: prop('extended', true) },
      ...this.bulbs.map((b, k) => ({ name: `bulb${k}`, pos: B(b.e, 1, b.n), test: prop('lit', true) })),
      { name: 'cart_end', pos: B(12, 1, -1), test: prop('powered', true) },
      ...this.rocketE.map((e, k) => ({ name: `rocket${k}`, pos: B(e, 1, -10), test: prop('triggered', true) })),
      { name: 'rocket_hit', pos: B(-1, hT, -10), test: (b) => +b.getProperties().power > 0 },
      { name: 'anvil_push', pos: B(-3, hT, -10), test: prop('extended', true) },
      { name: 'anvil_land', pos: B(-5, 1, -10), test: prop('powered', true) },
      { name: 'tnt_lit', pos: B(-20, 1, -10), test: (b) => b.name !== 'tnt' }
    ]
    const r = rig(ctx, steps)
    let giant = 0
    const onBoom = (p) => {
      const e = +(p.center || {}).x - X, n = Z - +(p.center || {}).z
      r.markOnce('boom1')
      if (n > 10.5 && n < 13.5 && e < -19.5) r.markOnce('cube')
      if (e > -9.5 && e < -4.5 && n > 18.5 && n < 23.5) r.markOnce('big')
      if (e > 6.5 && n > 25.5) { r.markOnce('giant'); if (++giant === 50) r.markOnce('giant_peak') }
    }
    bot._client.on('explosion', onBoom)
    const glide = async (to, ticks, done = () => false) => {
      const from = r.focus
      for (let i = 1; i <= ticks && !done(); i++) { const u = i / ticks, e = u * u * (3 - 2 * u); r.focus = from.plus(to.minus(from).scaled(e)); await bot.waitForTicks(1) }
    }

    // A: press the button; the path lights up west into the dark
    ctx.mark('go')
    r.focus = W(7, 1.5, 0.1)
    await bot.waitForTicks(12)
    bot._client.write('block_place', { hand: 0, location: B(7, 1, 0), direction: 5, cursorX: 0.1, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm()
    ctx.sound('block.stone_button.click_on', 1, 0.6)   // the presser's own client plays it
    ctx.mark('press')
    r.steer = W(7, 0, -2)                               // a step back to take in the path
    for (let k = 0; k < lampE.length; k++) {
      await glide(W(lampE[Math.min(lampE.length - 1, k + 1)], 1.5, 0), 6, () => r.at(`lamp${k}`))
      await r.until(() => r.at(`lamp${k}`), 30)
    }
    // B: the launch, then the cart round the U (the bulbs light behind it)
    await glide(W(-6, 1, -2), 10, () => r.at('launch'))
    await r.until(() => r.at('launch'), 30)
    r.k = 0.2; r.steer = W(8, 0, 5)                      // into the U (past the button's east side): the cart passes 4-5 blocks off
    await r.follow('minecart', [0, 0.3, 0], () => r.at('cart_end'), 260)
    // C: the rockets, one after another, south of the player
    r.k = 0.12; r.steer = W(9, 0, 3)                     // east of the lamp path (it's 2 high: north of it, never across)
    await glide(W(10, 4, -10), 10)
    for (let i = 0; i < this.rocketE.length; i++) {
      await r.until(() => r.at(`rocket${i}`), 30)
      await glide(W(this.rocketE[i], 6 + i * 0.6, -10), 6)
    }
    await glide(W(-1, hT, -10), 14, () => r.at('rocket_hit'))
    await r.until(() => r.at('rocket_hit'), 30)
    // the anvil: follow its simulated fall (falling-block positions only arrive about once a second)
    await glide(W(-4, hT + 1, -10), 6, () => r.at('anvil_push'))
    await r.until(() => r.at('anvil_push'), 20)
    await bot.waitForTicks(1)
    r.k = 0.3
    for (let y = hT + 1.5, v = 0; y > 1.5 && !r.at('anvil_land'); ) { v = (v + 0.04) * 0.98; y -= v; r.focus = W(-4, Math.max(1.5, y - 1), -10); await bot.waitForTicks(1) }
    await r.until(() => r.at('anvil_land'), 20)
    // D: the repeater line west to the TNT; walk west after it (stay ~15 blocks from the pile)
    r.k = 0.14; r.steer = W(-6, 0, 4)                  // ~14 blocks from the line, north of the lamp path
    await glide(W(-19, 1, -10), 60, () => r.at('tnt_lit'))
    await r.until(() => r.at('tnt_lit'), 60)
    await glide(W(-20, 1, -4), 20)
    await glide(W(-20, 1.5, 6), 70, () => r.at('boom1'))   // slow: the fuse is 4 s
    await r.until(() => r.at('boom1'), 60)
    r.k = 0.1
    for (let i = 0; i < 260 && !r.at('giant_peak'); i++) {
      if (r.at('cube')) r.steer = W(10, 0, 3)           // back off east along the U, facing it: ~25 blocks from every cube
      if (r.at('giant')) r.focus = W(11, 3, 30)
      else if (r.at('big')) r.focus = W(6, 2.5, 26)
      else if (r.at('cube')) r.focus = W(-7, 2.5, 21)
      else {
        const front = r.ent('tnt', (e, a) => (Z - e.position.z) > (Z - a.position.z))
        if (front) r.focus = front.position.offset(0, 0.5, -2.5)
      }
      await bot.waitForTicks(1)
    }
    await bot.waitForTicks(24)
    r.stop(); stopSounds(); bot._client.removeListener('explosion', onBoom)
    ctx.log('steps', JSON.stringify([...r.done]))
    return !!r.at('giant_peak') && !ctx.died
  }
}
