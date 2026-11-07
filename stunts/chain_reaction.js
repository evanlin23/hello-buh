// "the most satisfying chain reaction 😳" (worker 17, docs/ideas.md New formats #6): one long take
// following a real vanilla redstone contraption, each step triggering the next. Everything is
// built with commands BEFORE the recording; during the take the only input is the player pressing
// the first button. The server runs the redstone, the camera follows what really happens (lib/chain.js
// watches the blocks and entities and marks each step on the tick it fires), and the sounds are the
// server's own (pistons, notes, bells, rails, fuses).
//
// Layout: n = blocks north of the start (z = Z - n), e = blocks east (x = X + e), h = height above
// the grass (h = 1 is the first air layer). The player walks up the lane e = 0.
//   1  button (0,1,2) -> wire -> dispenser (1,1,6) fires an arrow east -> target (7,1,6)
//   2  8 repeaters north from the target, each into a block with a lamp on top and a note block
//      (glockenspiel, rising scale) beside it
//   3  wire climbs a stone staircase to a piston at h7 that shoves a sand block off a tower; the wall
//      torch on that sand block pops and the 8-sand column standing on the torch collapses
//   4  an observer sees the sand land -> powered-rail launcher -> a minecart rolls 20 blocks north,
//      ringing 4 bells on detector rails
//   5  the end detector -> a dispenser fires a firework rocket east into a target: burst
//   6  that target -> a rainbow piston wave runs 28 blocks west along n = 53
//   7  the wave's end primes a TNT -> a TNT line races west -> a 27-TNT cube -> a giant pile
const { relaySounds, watch, clearMobs } = require('../lib/chain')
const { findFlat } = require('./_site')

const NOTES = [6, 8, 10, 11, 13, 15, 17, 18]          // C major, C to C (note block steps from F#)
const RAINBOW = ['red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'light_blue', 'blue', 'purple', 'magenta', 'pink', 'red', 'orange', 'yellow']
const AREA = [-44, 26, -66, 6]   // x and z extents of the clear relative to the origin (z = Z - n)

module.exports = {
  name: 'chain_reaction',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the most satisfying chain reaction 😳',
  botTimeout: 300,
  edit: {
    caption: 'the most satisfying chain reaction 😳', red: 'satisfying', song: 'songs/funk_abnormal.mp3', dropAt: 'pile',
    startAt: 'go:-0.2', endAfter: 'pile:0.9'
  },

  async setup (ctx) {
    const { bot } = ctx
    await bot.waitForTicks(60); await bot.waitForChunksToLoad()
    const site = await findFlat(ctx, AREA, { reach: 96 })
    if (!site) throw new Error('no flat site')
    const X = site.x, Z = site.z, F = site.y
    Object.assign(this, { X, Z, F })
    const P = (e, h, n) => `${X + e} ${F + h} ${Z - n}`
    const c = (s) => ctx.cmd(s)
    const put = (e, h, n, b) => c(`/setblock ${P(e, h, n)} ${b}`)
    const fill = (e0, h0, n0, e1, h1, n1, b) => c(`/fill ${P(e0, h0, n0)} ${P(e1, h1, n1)} ${b}`)
    await ctx.defaultRules()
    await c('/difficulty peaceful')
    await c('/gamerule random_tick_speed 0')
    await c('/gamerule fire_spread_radius_around_player 0')
    await c(`/forceload add ${X + AREA[0]} ${Z + AREA[2]} ${X + AREA[1]} ${Z + AREA[3]}`)
    // clear the field in slabs (under the /fill cap): air above, grass, deep dirt below for the craters
    for (let z0 = Z + AREA[2]; z0 <= Z + AREA[3]; z0 += 6) {
      const z1 = Math.min(Z + AREA[3], z0 + 5)
      for (let y0 = F + 1; y0 <= F + 24; y0 += 8) await c(`/fill ${X + AREA[0]} ${y0} ${z0} ${X + AREA[1]} ${y0 + 7} ${z1} air`)
      await c(`/fill ${X + AREA[0]} ${F - 10} ${z0} ${X + AREA[1]} ${F - 1} ${z1} dirt`)
      await c(`/fill ${X + AREA[0]} ${F} ${z0} ${X + AREA[1]} ${F} ${z1} grass_block`)
    }
    await clearMobs(ctx, X, Z - 30, 90)
    const T = 'polished_andesite'

    // 1: the button, the wire, the arrow dispenser and its target
    await put(1, 1, 2, T)
    await put(0, 1, 2, 'stone_button[face=wall,facing=west]')
    for (const n of [3, 4, 5]) await put(1, 1, n, 'redstone_wire')
    await put(1, 1, 6, 'dispenser[facing=east]{Items:[{Slot:4b,id:"minecraft:arrow",count:1}]}')
    await put(7, 1, 6, 'target')

    // 2: the lamp and note line
    for (let k = 0; k < NOTES.length; k++) {
      const n = 8 + 2 * k
      await put(7, 1, n - 1, 'repeater[facing=south,delay=2]')
      await put(7, 1, n, T)
      await put(7, 2, n, 'redstone_lamp')
      await put(8, 0, n, 'gold_block')
      await put(8, 1, n, `note_block[instrument=bell,note=${NOTES[k]}]`)
    }
    const nEnd = 8 + 2 * (NOTES.length - 1)          // 22: the last block of the line
    // 3: the staircase, the piston, the sand on the torch
    await put(7, 1, nEnd + 1, 'redstone_wire')
    for (let k = 1; k <= 6; k++) {
      await fill(7, 1, nEnd + 1 + k, 7, k, nEnd + 1 + k, 'stone_bricks')
      await put(7, k + 1, nEnd + 1 + k, 'redstone_wire')
    }
    const nT = nEnd + 8                                // 30: the tower row
    await fill(7, 1, nT, 7, 6, nT, 'stone_bricks')
    await put(7, 7, nT, 'piston[facing=east]')
    await fill(8, 1, nT, 8, 6, nT, 'stone_bricks')
    await put(8, 7, nT, 'sand')
    await put(8, 7, nT + 1, 'wall_torch[facing=north]')
    for (let h = 8; h <= 15; h++) await put(8, h, nT + 1, 'sand')
    this.nT = nT
    // 4: an observer watching where the sand lands fires a piston that shoves a redstone block
    // next to the launcher rail (an observer pulse alone is 2 ticks: the rail brakes the cart again)
    const RE = 12, nL = nT + 3                          // the track's column and the launcher row
    await put(8, 1, nT + 2, 'observer[facing=south]')  // looks at (8,1,nT+1), outputs north
    await put(8, 1, nL, 'piston[facing=east]')
    await put(9, 1, nL, T)
    await put(10, 1, nL, 'redstone_block')
    await put(RE, 1, nL, 'powered_rail[shape=north_south]')
    await put(RE, 1, nL - 1, T)                         // the launcher's backstop
    // empty carts lose 4% a tick, so boosters (powered rails on redstone blocks) every 4 blocks;
    // a plain rail next to the launcher keeps the boosters' power from reaching it
    const nE = nT + 24                                  // the end detector
    this.bells = [nL + 7, nL + 11, nL + 15, nL + 19]
    const boost = [nL + 2, nL + 3, nL + 4, nL + 9, nL + 13, nL + 17]
    for (let n = nL + 1; n < nE; n++) {
      if (boost.includes(n)) { await put(RE, 0, n, 'redstone_block'); await put(RE, 1, n, 'powered_rail[shape=north_south]') }
      else if (this.bells.includes(n)) { await put(RE, 1, n, 'detector_rail[shape=north_south]'); await put(RE + 1, 1, n, 'bell[attachment=floor,facing=east]') }
      else await put(RE, 1, n, 'rail[shape=north_south]')
    }
    Object.assign(this, { RE, nL })
    await put(RE, 1, nE, 'detector_rail[shape=north_south]')
    await put(RE, 1, nE + 1, T)                         // the buffer
    // 5: the firework dispenser and its target
    const rocket = '{id:"minecraft:firework_rocket",count:1,components:{"minecraft:fireworks":{flight_duration:1,explosions:[{shape:"large_ball",colors:[I;16711680,16766720,65280]}]}}}'
    await put(RE + 1, 1, nE, `dispenser[facing=east]{Items:[{Slot:4b,${rocket.slice(1)}]}`)
    await put(24, 1, nE, 'target')
    this.nE = nE
    // 6: the wave: wire down from the target into a ground-level line going west along n = nE + 3
    const nW = nE + 3
    await put(24, 1, nE + 1, 'redstone_wire')
    await put(24, 1, nE + 2, 'redstone_wire')
    await put(24, 1, nW, 'redstone_wire')
    await put(23, 1, nW, 'redstone_wire')
    await put(22, 1, nW, 'redstone_wire')
    let i = 0
    for (let e = 21; e >= -6; e -= 2) {
      await put(e, 1, nW, 'repeater[facing=east,delay=2]')
      await put(e - 1, 1, nW, T)
      await put(e - 1, 1, nW + 1, 'piston[facing=up]')
      await put(e - 1, 2, nW + 1, `${RAINBOW[i++ % RAINBOW.length]}_concrete`)
    }
    this.nW = nW
    // 7: the TNT: a repeater from the wave's last block into the first TNT, a spaced line west,
    // a 3x3x3 cube, then the pile
    const eLast = -6                                    // the wave's last block is at e = -6
    await put(eLast - 1, 1, nW, 'repeater[facing=east,delay=2]')
    for (let e = eLast - 2; e >= -24; e -= 2) await put(e, 1, nW, 'tnt')
    await fill(-29, 1, nW - 1, -27, 3, nW + 1, 'tnt')
    await fill(-41, 1, nW - 3, -35, 5, nW + 3, 'tnt')
    this.nTnt = nW

    await clearMobs(ctx, X, Z - 30, 90)
    await c('/kill @e[type=item]')
    await ctx.hotbar([['bread', 12], null, null, null, ['torch', 23]])
    // the minecart sits on the launcher, against its backstop
    await c(`/summon minecart ${X + this.RE + 0.5} ${F + 1.0625} ${Z - this.nL + 0.5}`)
    await ctx.tpCheck(X + 0.5, F + 1, Z + 0.5, 200, 15)
    await c('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x: X, y: F, z: Z - 30 }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F, nT, nE, nW, RE, nL } = this
    const W = (e, h, n) => new Vec3(X + e + 0.5, F + h, Z - n + 0.5)
    const B = (e, h, n) => new Vec3(X + e, F + h, Z - n)
    const stopSounds = relaySounds(ctx)
    const lamps = NOTES.map((_, k) => 8 + 2 * k)
    const lit = (b) => b.getProperties().lit === true
    const powered = (b) => b.getProperties().powered === true
    const steps = [
      { name: 'arrow_hit', pos: B(7, 1, 6), test: (b) => b.getProperties().power > 0 },
      ...lamps.map((n, k) => ({ name: `lamp${k}`, pos: B(7, 2, n), test: lit })),
      { name: 'push', pos: B(7, 7, nT), test: (b) => b.getProperties().extended === true },
      { name: 'sand_land', pos: B(8, 1, nT + 2), test: powered },        // the observer fired
      { name: 'launch', pos: B(8, 1, nL), test: (b) => b.getProperties().extended === true },
      ...this.bells.map((n, k) => ({ name: `bell${k}`, pos: B(RE, 1, n), test: powered })),
      { name: 'cart_end', pos: B(RE, 1, nE), test: powered },
      { name: 'rocket_hit', pos: B(24, 1, nE), test: (b) => b.getProperties().power > 0 },
      ...Array.from({ length: 14 }, (_, k) => ({ name: `wave${k}`, pos: B(20 - 2 * k, 1, nW + 1), test: (b) => b.getProperties().extended === true })),
      { name: 'tnt_lit', pos: B(-8, 1, nW), test: (b) => b.name !== 'tnt' }
    ]
    const w = watch(ctx, steps)
    const at = (name) => w.done.get(name)
    // explosions: the first one, the cube and the pile
    let booms = 0
    const onBoom = (p) => {
      booms++
      const c = p.center || {}
      if (booms === 1) ctx.mark('boom1')
      if (+c.x < X - 26 && +c.x > X - 31 && !at('cube')) { w.done.set('cube', ctx.tick); ctx.mark('cube') }
      if (+c.x < X - 33 && !at('pile')) { w.done.set('pile', ctx.tick); ctx.mark('pile') }
    }
    bot._client.on('explosion', onBoom)

    // the camera: an aim point eased every tick toward the current focus; the player strafes
    // toward a spot on the lane (walking speed), whichever way the camera faces
    const look0 = () => { const y = bot.entity.yaw, p = bot.entity.pitch; return bot.entity.position.offset(-Math.sin(y) * Math.cos(p) * 4, 1.62 + Math.sin(p) * 4, -Math.cos(y) * Math.cos(p) * 4) }
    let aim = look0(), focus = W(1, 1.2, 2.5), k = 0.18, steer = null, sprint = false
    const onTick = () => {
      aim = aim.plus(focus.minus(aim).scaled(k))
      const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
      bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
      const p = bot.entity.position
      if (steer) {
        const dx = steer.x - p.x, dz = steer.z - p.z, yw = bot.entity.yaw
        const f = -Math.sin(yw) * dx - Math.cos(yw) * dz, r = Math.cos(yw) * dx - Math.sin(yw) * dz
        const far = Math.hypot(dx, dz) > 0.6
        bot.setControlState('forward', far && f > 0.3); bot.setControlState('back', far && f < -0.3)
        bot.setControlState('right', far && r > 0.3); bot.setControlState('left', far && r < -0.3)
        bot.setControlState('sprint', far && sprint && f > 0.3)
      } else for (const s of ['forward', 'back', 'left', 'right', 'sprint']) bot.setControlState(s, false)
    }
    bot.on('physicsTick', onTick)
    const until = async (cond, max = 200) => { for (let i = 0; i < max && !cond(); i++) await bot.waitForTicks(1) }
    const ent = (name) => Object.values(bot.entities).find(e => e.name === name)

    // 1: press the button
    ctx.mark('go')
    await bot.waitForTicks(6)
    focus = W(0.3, 1.5, 2.6)
    await bot.waitForTicks(8)
    bot._client.write('block_place', { hand: 0, location: B(0, 1, 2), direction: 5, cursorX: 0.1, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm()
    ctx.mark('press')
    focus = W(4, 1.4, 6)                               // the arrow's path
    await until(() => at('arrow_hit'), 40)
    // 2: follow the lamps up the line
    steer = W(0, 0, 14)
    for (let kk = 0; kk < lamps.length; kk++) {
      focus = W(7, 2, lamps[Math.min(lamps.length - 1, kk + 1)])
      await until(() => at(`lamp${kk}`), 40)
    }
    // 3: the staircase, the push, the collapse
    focus = W(7, 5, nT - 2); k = 0.14
    steer = W(0, 0, nT - 6)
    await until(() => at('push'), 60)
    focus = W(8, 8, nT + 1)
    await bot.waitForTicks(8)
    focus = W(8, 2, nT + 1); k = 0.12
    await until(() => at('sand_land'), 80)
    // 4: the cart
    steer = W(1, 0, nT + 18); sprint = true; k = 0.2
    for (let i = 0; i < 160 && !at('cart_end'); i++) {
      const cart = ent('minecart')
      if (cart) focus = cart.position.offset(0, 0.4, -2.5)
      await bot.waitForTicks(1)
    }
    sprint = false
    // 5: the rocket
    focus = W(14, 1.5, nE)
    for (let i = 0; i < 40 && !at('rocket_hit'); i++) {
      const r = ent('firework_rocket')
      if (r) focus = r.position.offset(1.5, 0.2, 0)
      await bot.waitForTicks(1)
    }
    focus = W(24, 2, nE)
    await bot.waitForTicks(6)
    // 6: the wave going west; walk west with it
    steer = W(-6, 0, nW - 9)
    for (let kk = 0; kk < 14; kk++) {
      focus = W(20 - 2 * Math.min(13, kk + 1), 2, nW + 1)
      await until(() => at(`wave${kk}`), 30)
    }
    // 7: the TNT: watch the fuse, then the line, the cube and the pile
    focus = W(-8, 1, nW); steer = W(-14, 0, nW - 10)
    await until(() => booms > 0, 100)
    k = 0.1
    for (let i = 0; i < 160 && !at('pile'); i++) {
      const tnts = Object.values(bot.entities).filter(e => e.name === 'tnt')
      const front = tnts.reduce((a, e) => (!a || e.position.x < a.position.x) ? e : a, null)
      focus = at('cube') ? W(-38, 3, nW) : front ? front.position.offset(-2, 0.5, 0) : focus
      await bot.waitForTicks(1)
    }
    await bot.waitForTicks(30)
    steer = null
    bot.removeListener('physicsTick', onTick)
    for (const s of ['forward', 'back', 'left', 'right', 'sprint']) bot.setControlState(s, false)
    w.stop(); stopSounds(); bot._client.removeListener('explosion', onBoom)
    ctx.log('steps', JSON.stringify([...w.done]))
    return !!at('pile') && !ctx.died
  }
}
