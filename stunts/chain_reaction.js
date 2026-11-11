// "the most satisfying chain reaction 😳" (worker 17, docs/ideas.md New formats #6): one long take
// following a real vanilla redstone contraption, each step triggering the next. Everything is
// built with commands BEFORE the recording; during the take the only input is the player pressing
// the first button. The server runs the redstone, the camera follows what really happens
// (lib/chain.js watches the blocks and marks each step on the tick it fires), and the sounds are the
// server's own (pistons, notes, bells, rails, rockets, fuses).
//
// Layout: n = blocks north of the start (z = Z - n), e = blocks east (x = X + e), h = height above
// the grass (h = 1 is the first air layer). The player walks north from the lane e = 0 and the
// contraption snakes across in front of them, so the camera turns to follow each moving part.
//   A  button (0,1,2) -> wire -> dispenser (-1,1,6) fires an arrow east across the lane -> target (3,1,6)
//   B  14 repeaters north along e = 5, each into a block with a lamp on top and a glockenspiel note
//      block beside it (a rising scale)
//   C  wire climbs a staircase to a ridge at h 7; three pistons along it shove the sand blocks that
//      hold wall torches, and the 6-, 10- and 14-sand columns standing on those torches collapse
//   D  an observer sees the last column land and fires a piston that shoves a redstone block next to
//      a launcher rail: a minecart rolls west across the lane, ringing 3 bells
//   E  the end detector -> a repeater line fires 4 rocket dispensers in turn; the last rocket hits a
//      target on a tower, which fires a piston that shoves an anvil off the top
//   F  an observer sees the anvil land: a wave of pistons in the ground pushes rainbow glass up, east
//   G  the wave's end launches a TNT minecart west; an activator rail half way primes it
//   H  it blows up beside a TNT line that races east into a 3x3x3 cube, a 5x5x5 cube and a 9x6x9 pile, two
//      single TNTs between each stage so every stage gets its own boom
const { relaySounds, watch, clearMobs } = require('../lib/chain')
const { findFlat } = require('./_site')

const NOTES = [1, 3, 5, 6, 8, 10, 12, 13, 15, 17, 18, 20, 22, 24]   // G major, rising (F# = 0, the top is 24)
const GLASS = ['red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'light_blue', 'blue', 'purple', 'magenta', 'pink', 'red', 'orange', 'yellow']
const AREA = [-28, 36, -90, 6]   // x and z extents of the clear relative to the origin (z = Z - n)
const T = 'polished_andesite'

// every position, in (e, h, n)
const L = (() => {
  const o = {}
  o.nB = 8 + 2 * (NOTES.length - 1)                    // 34: the lamp line's last block
  o.towers = [{ n: o.nB + 8, L: 6 }, { n: o.nB + 12, L: 10 }, { n: o.nB + 16, L: 14 }]   // 42, 46, 50
  o.nC = o.towers[2].n + 1                              // 51: where the last column lands (e = 7)
  o.nD = o.nC + 3                                       // 54: the cart's row
  o.eEnd = -16                                          // its end detector
  o.bells = [-2, -7, -12]
  o.dn = [1, 3, 5, 7].map(d => o.nD + 2 + d)            // the rocket dispensers (e = eEnd - 1)
  o.nR = o.dn[3]                                        // 63: the last one, under the target
  o.hT = 13
  o.nF = o.nR + 6                                       // 69: the wave line (in the ground)
  o.nG = o.nF + 4                                       // 73: the TNT cart's row
  o.nH = o.nG + 3                                       // 76: the TNT line
  return o
})()

module.exports = {
  name: 'chain_reaction',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'the most satisfying chain reaction 😳',
  botTimeout: 360,
  edit: {
    caption: 'the most satisfying chain reaction 😳', red: 'satisfying', song: 'songs/funk_abnormal.mp3', dropAt: 'giant',
    startAt: 'press:-0.1', endAfter: 'settle:-0.4',   // (start on the press: the button's click is too soft for pace's hook, the dispenser 0.15 s later is the first sound; the pile's blasts and debris done; the eyes drift until 1.5 s after the last blast, the settle waits 2.2 s: ending later parked the camera)
    // the payoff pace times is the pile's LAST blast, 1.05 s after giant_peak on this take: a flash, a punch, the song
    // dipped, the game ducked and an impact there (pace: no hit and no picture change on it). Re-check after a re-record
    flash: [['giant_peak:1.05', 0, 0.7]], punch: [['giant_peak:1.05', 0, 1.12]],
    // (the impact is back: audio.py now plays the TNT at vanilla's clamped gain and edit.py caps the sfx at +4 dB of the
    // game track's loudness; before, the 4x blasts and the impact pushed the game track ~45 dB down: silent until 26 s)
    sfx: [['dip', 'giant_peak:1.05', 0.4], ['gamedip', 'giant_peak:1.05', 0.35], ['impact', 'giant_peak:1.05', { gain: 1.4 }]]
  },

  async setup (ctx) {
    const { bot } = ctx
    await bot.waitForTicks(60); await bot.waitForChunksToLoad()
    // the flattest dry spot for the field; failing that, build where we stand (the clear fills dirt
    // up to the grass over the whole field, so a pond inside it becomes land)
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
    await c('/difficulty peaceful')
    await c('/gamerule random_tick_speed 0')
    await c('/gamerule fire_spread_radius_around_player 0')
    await c('/gamerule block_drops false')              // no explosion loot filling the hotbar
    await c(`/forceload add ${X + AREA[0]} ${Z + AREA[2]} ${X + AREA[1]} ${Z + AREA[3]}`)
    // clear the field in slabs (under the /fill cap): air above, grass, deep dirt for the craters
    for (let z0 = Z + AREA[2]; z0 <= Z + AREA[3]; z0 += 4) {
      const z1 = Math.min(Z + AREA[3], z0 + 3)
      for (let y0 = F + 1; y0 <= F + 32; y0 += 16) await c(`/fill ${X + AREA[0]} ${y0} ${z0} ${X + AREA[1]} ${y0 + 15} ${z1} air`)
      await c(`/fill ${X + AREA[0]} ${F - 10} ${z0} ${X + AREA[1]} ${F - 1} ${z1} dirt`)
      await c(`/fill ${X + AREA[0]} ${F} ${z0} ${X + AREA[1]} ${F} ${z1} grass_block`)
    }
    await clearMobs(ctx, X, Z - 40, 100)
    const { nB, towers, nC, nD, eEnd, dn, nR, hT, nF, nG, nH } = L

    // A: the button, the wire, the arrow dispenser and its target
    await put(-1, 1, 2, T)
    await put(0, 1, 2, 'stone_button[face=wall,facing=east]')
    for (const n of [3, 4, 5]) await put(-1, 1, n, 'redstone_wire')
    await put(-1, 1, 6, 'dispenser[facing=east]{Items:[{Slot:4b,id:"minecraft:arrow",count:1}]}')
    await put(3, 1, 6, 'target')                        // close: a dispensed arrow drops and spreads
    await put(4, 1, 6, 'repeater[facing=west,delay=1]')  // a target's output depends on the hit: restore 15
    await put(5, 1, 6, 'redstone_wire')

    // B: the lamp and note line
    for (let k = 0; k < NOTES.length; k++) {
      const n = 8 + 2 * k
      await put(5, 1, n - 1, 'repeater[facing=south,delay=4]')
      await put(5, 1, n, T)
      await put(5, 2, n, 'redstone_lamp')
      await put(6, 0, n, 'gold_block')
      await put(6, 1, n, `note_block[instrument=bell,note=${NOTES[k]}]`)
    }

    // C: the staircase to the ridge, three pistons, three sand-on-torch columns
    await put(5, 1, nB + 1, 'redstone_wire')
    for (let k = 1; k <= 6; k++) {
      await fill(5, 1, nB + 1 + k, 5, k, nB + 1 + k, 'stone_bricks')
      await put(5, k + 1, nB + 1 + k, 'redstone_wire')
    }
    // the ridge: a bridge at h 6 on pillars at the tower rows (a solid wall hid the columns' landings
    // from the lane)
    await fill(5, 6, towers[0].n, 5, 6, towers[2].n, 'stone_bricks')
    for (const t of towers) await fill(5, 1, t.n, 5, 5, t.n, 'stone_bricks')
    for (let i = 0; i < towers.length; i++) {
      const { n, L: len } = towers[i]
      await put(5, 7, n, T)
      if (i < towers.length - 1) for (let d = 1; d <= 3; d++) await put(5, 7, n + d, 'repeater[facing=south,delay=1]')
      await fill(6, 1, n, 6, 6, n, 'stone_bricks')
      await put(6, 7, n, 'piston[facing=east]')
      await fill(7, 1, n, 7, 6, n, 'stone_bricks')
      await put(7, 7, n, 'sand')
      await put(7, 7, n + 1, 'wall_torch[facing=north]')
      await fill(7, 8, n + 1, 7, 7 + len, n + 1, 'sand')
    }

    // D: observer -> piston -> redstone block beside the launcher; the cart goes west along nD
    await put(7, 1, nC + 1, 'observer[facing=south]')   // watches (7,1,nC); outputs north
    await put(7, 1, nC + 2, 'piston[facing=west]')      // pushes the stone and the redstone block
    await put(6, 1, nC + 2, T)
    await put(5, 1, nC + 2, 'redstone_block')           // pushed to (4,1,nC+2), beside the launcher rail (4,1,nD = nC+3)
    await put(5, 1, nD, T)                              // the launcher's backstop
    await put(4, 1, nD, 'powered_rail[shape=east_west]')
    const boost = [2, 1, 0, -5, -10]
    for (let e = 3; e > eEnd; e--) {
      if (boost.includes(e)) { await put(e, 0, nD, 'redstone_block'); await put(e, 1, nD, 'powered_rail[shape=east_west]') } else if (L.bells.includes(e)) { await put(e, 1, nD, 'detector_rail[shape=east_west]'); await put(e, 1, nD + 1, 'bell[attachment=floor,facing=north]') } else await put(e, 1, nD, 'rail[shape=east_west]')
    }
    await put(eEnd, 1, nD, 'detector_rail[shape=east_west]')
    await put(eEnd - 1, 1, nD, T)                       // the buffer

    // E: wire from the end detector north along eEnd, repeaters into blocks, each block firing the
    // rocket dispenser west of it; the last rocket flies into a target on the tower
    const rocket = (col) => `{Slot:4b,id:"minecraft:firework_rocket",count:1,components:{"minecraft:fireworks":{flight_duration:1,explosions:[{shape:"small_ball",colors:[I;${col}]}]}}}`
    const cols = ['16711680,16753920', '65280,16776960', '3381759,16711935', '16766720,16777215']
    await put(eEnd, 1, nD + 1, 'redstone_wire')
    for (let i = 0; i < 4; i++) {
      await put(eEnd, 1, dn[i] - 1, `repeater[facing=south,delay=${i === 0 ? 1 : 4}]`)
      await put(eEnd, 1, dn[i], T)
      await put(eEnd - 1, 1, dn[i], `dispenser[facing=up]{Items:[${rocket(cols[i])}]}`)
    }
    await fill(eEnd - 2, 1, nR, eEnd - 2, hT, nR, 'stone_bricks')   // the tower
    await put(eEnd - 1, hT, nR, 'target')               // overhanging the last dispenser
    // the target -> a repeater east (0.4 s: the anvil leaves once the burst has opened) -> a piston
    // that shoves the ledge the anvil stands on (pistons can't push anvils). All on the tower's east
    // side, the camera's side (on the north side the tower hid the fall)
    await fill(eEnd, 2, nR, eEnd + 1, hT - 1, nR, 'stone_bricks')
    await put(eEnd, hT, nR, 'repeater[facing=west,delay=4]')
    await put(eEnd + 1, hT, nR, 'piston[facing=east]')
    await put(eEnd + 2, hT, nR, 'stone_bricks')
    await put(eEnd + 2, hT + 1, nR, 'anvil[facing=north]')
    // F: the anvil lands at (eEnd+2,1,nR); an observer east of it -> wire north and down into a
    // ground-level line going east along nF; pistons in the ground north of it push rainbow glass up
    await put(eEnd + 3, 1, nR, 'observer[facing=west]')
    for (let n = nR; n <= nR + 5; n++) await put(eEnd + 4, 1, n, 'redstone_wire')
    await put(eEnd + 4, 0, nF, 'redstone_wire')
    let gi = 0, e = eEnd + 5
    for (; e + 1 <= 12; e += 2) {
      await put(e, 0, nF, 'repeater[facing=west,delay=4]')
      await put(e + 1, 0, nF, T)
      await put(e + 1, 0, nF + 1, 'piston[facing=up]')
      await put(e + 1, 1, nF + 1, `${GLASS[gi++ % GLASS.length]}_stained_glass`)
    }
    this.waveE = []
    for (let k = eEnd + 6; k <= e - 1; k += 2) this.waveE.push(k)
    // G: the wave's last block -> repeater -> wire up to a piston that shoves a redstone block beside
    // the TNT cart's launcher; the track runs west along nG with an activator rail part way
    const eW = e                                        // the first free column after the wave
    await put(eW, 0, nF, 'repeater[facing=west,delay=2]')
    await put(eW + 1, 0, nF, 'redstone_wire')
    await put(eW + 2, 1, nF, 'redstone_wire')
    await put(eW + 3, 1, nF, 'piston[facing=north]')
    await put(eW + 3, 1, nF + 1, T)
    await put(eW + 3, 1, nF + 2, 'redstone_block')      // -> nF+3, beside the launcher at (eW+3,1,nG)
    const eL = eW + 3
    await put(eL + 1, 1, nG, T)                         // the backstop
    await put(eL, 1, nG, 'powered_rail[shape=east_west]')
    const eStop = -20
    const tBoost = [eL - 2, eL - 3, eL - 4, eL - 10, eL - 16, eL - 22, eL - 28]
    const eAct = eL - 3                                // primed right after the launch: it rides the whole fuse
    this.tBells = [9, 3, -3, -9, -15]                  // detector rails with bells: they ring as the primed cart passes
    for (let x = eL - 1; x > eStop; x--) {
      if (this.tBells.includes(x)) { await put(x, 1, nG, 'detector_rail[shape=east_west]'); await put(x, 1, nG + 1, 'bell[attachment=floor,facing=south]'); continue }
      if (x === eAct) { await put(x, 0, nG, 'redstone_block'); await put(x, 1, nG, 'activator_rail[shape=east_west]') } else if (tBoost.includes(x)) { await put(x, 0, nG, 'redstone_block'); await put(x, 1, nG, 'powered_rail[shape=east_west]') } else await put(x, 1, nG, 'rail[shape=east_west]')
    }
    await put(eStop, 1, nG, T)
    Object.assign(this, { eW, eL, eAct })
    // H: TNT line (every 2 blocks) east along nH, then a 3x3x3, a 5x5x5 and a 9x6x9
    // deep dirt under the TNT: the pile's crater went past the 10-block base into an aquifer (water
    // in the crater on the payoff)
    for (let n0 = nH - 10; n0 <= nH + 14; n0 += 4) await fill(-24, -30, n0, 44, -11, n0 + 3, 'dirt')   // (a fallback site by the sea: aquifer water poured into the crater)
    // the finale's watch spot is an obsidian floor (flush with the grass): primed TNT flung by the
    // cubes lands 25+ blocks out, and three takes ended with the player down a crater
    await fill(-8, 0, nH - 29, -2, 0, nH - 23, 'obsidian')
    for (let x = eStop + 1; x <= -5; x += 2) await put(x, 1, nH, 'tnt')
    // each stage is lit by one TNT 3 blocks out from the last, so every stage gets its own boom
    await fill(-1, 1, nH - 1, 1, 3, nH + 1, 'tnt')
    await put(4, 1, nH, 'tnt'); await put(7, 1, nH, 'tnt')
    await fill(10, 1, nH - 2, 14, 5, nH + 2, 'tnt')
    await put(17, 1, nH, 'tnt'); await put(20, 1, nH, 'tnt')
    await fill(23, 1, nH - 1, 31, 6, nH + 7, 'tnt')

    await clearMobs(ctx, X, Z - 40, 100)
    await c('/kill @e[type=item]')
    await ctx.hotbar([null, ['bread', 12]])
    await c(`/summon minecart ${X + 4.5} ${F + 1.0625} ${Z - nD + 0.5}`)
    await c(`/summon tnt_minecart ${X + eL + 0.5} ${F + 1.0625} ${Z - nG + 0.5}`)
    await ctx.tpCheck(X + 0.5, F + 1, Z + 1.5, 180, 12)
    await c('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x: X, y: F, z: Z - 40 }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F } = this
    const { towers, nC, nD, eEnd, dn, nR, hT, nF, nG, nH } = L
    const W = (e, h, n) => new Vec3(X + e + 0.5, F + h, Z - n + 0.5)
    const B = (e, h, n) => new Vec3(X + e, F + h, Z - n)
    const stopSounds = relaySounds(ctx)
    const lamps = NOTES.map((_, k) => 8 + 2 * k)
    const prop = (k, v) => (b) => b.getProperties()[k] === v
    const steps = [
      { name: 'arrow_hit', pos: B(3, 1, 6), test: (b) => b.getProperties().power > 0 },
      ...lamps.map((n, k) => ({ name: `lamp${k}`, pos: B(5, 2, n), test: prop('lit', true) })),
      ...towers.map((t, i) => ({ name: `push${i}`, pos: B(6, 7, t.n), test: prop('extended', true) })),
      { name: 'sand_land', pos: B(7, 1, nC + 1), test: prop('powered', true) },
      { name: 'launch', pos: B(7, 1, nC + 2), test: prop('extended', true) },
      ...L.bells.map((e, k) => ({ name: `bell${k}`, pos: B(e, 1, nD), test: prop('powered', true) })),
      { name: 'cart_end', pos: B(eEnd, 1, nD), test: prop('powered', true) },
      ...dn.map((n, k) => ({ name: `rocket${k}`, pos: B(eEnd - 1, 1, n), test: prop('triggered', true) })),
      { name: 'rocket_hit', pos: B(eEnd - 1, hT, nR), test: (b) => b.getProperties().power > 0 },
      { name: 'anvil_push', pos: B(eEnd + 1, hT, nR), test: prop('extended', true) },
      { name: 'anvil_land', pos: B(eEnd + 3, 1, nR), test: prop('powered', true) },
      ...this.waveE.map((e, k) => ({ name: `wave${k}`, pos: B(e, 0, nF + 1), test: prop('extended', true) })),
      { name: 'tnt_launch', pos: B(this.eW + 3, 1, nF), test: prop('extended', true) },
      { name: 'primed', pos: B(this.eAct, 1, nG), test: () => false },   // marked from the entity below
      ...this.tBells.map((e, k) => ({ name: `tbell${k}`, pos: B(e, 1, nG), test: prop('powered', true) }))
    ]
    const w = watch(ctx, steps)
    const at = (name) => w.done.get(name)
    const markOnce = (name) => { if (!at(name)) { w.done.set(name, ctx.tick); ctx.mark(name) } }
    // explosions: the cart, the line, the cubes and the pile
    let booms = 0, giantBooms = 0, lastBoomTick = 0
    const onBoom = (p) => {
      booms++
      lastBoomTick = ctx.tick
      const x = +(p.center || {}).x - X, z = Z - +(p.center || {}).z
      if (booms === 1) markOnce('cart_boom')
      if (z > nH - 3 && x > -2.5 && x < 2.5) markOnce('cube')
      if (z > nH - 4 && x > 9 && x < 15.5) markOnce('big')
      if (z > nH - 3 && x > 22) { markOnce('giant'); if (++giantBooms === 60) markOnce('giant_peak') }
    }
    bot._client.on('explosion', onBoom)

    // the camera: an aim point eased every tick toward the current focus; the player strafes
    // toward a spot (walking, or sprinting to keep up), whichever way the camera faces
    const look0 = () => { const y = bot.entity.yaw, p = bot.entity.pitch; return bot.entity.position.offset(-Math.sin(y) * Math.cos(p) * 4, 1.62 + Math.sin(p) * 4, -Math.cos(y) * Math.cos(p) * 4) }
    let aim = look0(), focus = aim, k = 0.16, steer = null, sprint = false
    const onTick = () => {
      aim = aim.plus(focus.minus(aim).scaled(k))
      const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
      bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
      const p = bot.entity.position
      if (steer) {
        const dx = steer.x - p.x, dz = steer.z - p.z, yw = bot.entity.yaw
        const f = -Math.sin(yw) * dx - Math.cos(yw) * dz, r = Math.cos(yw) * dx - Math.sin(yw) * dz
        const far = Math.hypot(dx, dz) > 0.5
        // the keys are all-or-nothing: press one only when its component dominates (within ~22 degrees),
        // or a small sideways error turns into a full 45-degree strafe (it walked into the landed sand)
        const fw = f > 0.3 && f > 0.4 * Math.abs(r), bk = f < -0.3 && -f > 0.4 * Math.abs(r)
        const rt = r > 0.3 && r > 0.4 * Math.abs(f), lt = r < -0.3 && -r > 0.4 * Math.abs(f)
        bot.setControlState('forward', far && fw); bot.setControlState('back', far && bk)
        bot.setControlState('right', far && rt); bot.setControlState('left', far && lt)
        bot.setControlState('sprint', far && sprint && fw)
      } else for (const s of ['forward', 'back', 'left', 'right', 'sprint']) bot.setControlState(s, false)
      const tc = Object.values(bot.entities).find(e => e.name === 'tnt_minecart')
      if (tc && tc.position.x - X < this.eAct + 0.5 && at('tnt_launch')) markOnce('primed')
    }
    bot.on('physicsTick', onTick)
    const until = async (cond, max = 200) => { for (let i = 0; i < max && !cond(); i++) await bot.waitForTicks(1) }
    const ent = (name) => Object.values(bot.entities).find(e => e.name === name)
    const follow = async (name, off, done, max) => {
      for (let i = 0; i < max && !done(); i++) { const en = ent(name); if (en) focus = en.position.offset(...off); await bot.waitForTicks(1) }
    }

    // A: walk up to the button and press it; the arrow crosses
    ctx.mark('go')
    focus = W(-0.44, 1.5, 2); steer = W(0, 0, 0.3)      // the button's face (it sits on the west edge)
    await bot.waitForTicks(14); k = 0.35; await bot.waitForTicks(8); k = 0.16
    // the press through lib/act.js (r:rffba12): the stunt's own look is already on the button's face, so it goes out
    // on this tick; off it, it waits for that look (turn: false) and marks off_aim if it never lands
    await require('../lib/act')(ctx).click(B(0, 1, 2), 4, [0.1, 0.5, 0.5], { target: { block: B(0, 1, 2) }, turn: false, max: 20, swing: true })
    ctx.sound('block.stone_button.click_on', 1, 0.6)   // the presser's own client plays it (the server sends it to others)
    ctx.mark('press')
    focus = W(1.5, 1.4, 6)                              // the arrow crosses
    await until(() => at('arrow_hit'), 40)
    // B: up the lane west of the line (e = 0: e = 1.5 passed close enough to the stuck arrow to pick it up)
    steer = W(0, 0, 34); sprint = true                  // keep up with the chain
    for (let kk = 0; kk < lamps.length; kk++) {
      focus = W(5, 2, lamps[Math.min(lamps.length - 1, kk + 1)])
      await until(() => at(`lamp${kk}`), 40)
    }
    // C: up the staircase to the ridge, then each column as it falls (seen under the ridge's bridge)
    focus = W(5, 6, towers[0].n - 3); k = 0.14
    steer = W(0, 0, towers[0].n - 6)
    await until(() => at('push0'), 40)
    for (let i = 0; i < towers.length; i++) {
      // the last column lands behind the bridge's pillar seen from the south: watch it from the north-west
      steer = W(0, 0, i === 2 ? towers[i].n + 2 : towers[i].n - 4)
      focus = W(7, 6 + towers[i].L * 0.4, towers[i].n + 1)
      await until(() => at(`push${i + 1}`) || (i === 2 && at('sand_land')), 40)
    }
    focus = W(7, 3, nC); await until(() => at('sand_land'), 60)
    await bot.waitForTicks(10)                          // see it land before turning to the cart
    // D: the cart rolls west across the lane: stop short of the track and follow it, walking west
    focus = W(4, 1, nD); steer = W(0, 0, nD - 4); sprint = false
    await until(() => at('launch'), 20)
    k = 0.2; sprint = true
    steer = W(-9, 0, nD - 4)
    await follow('minecart', [-2.0, 0.2, 0], () => at('cart_end'), 160)
    sprint = false
    // E: the rockets go up one by one; the last one into the target; the anvil comes down
    // (walk up to the tower: from the cart's end it is ~16 blocks off, and the anvil read as a speck)
    focus = W(eEnd - 1, 4, dn[0]); k = 0.12; steer = W(eEnd + 6, 0, nD - 3)
    for (let i = 0; i < 4; i++) {
      await until(() => at(`rocket${i}`), 30)
      focus = W(eEnd - 1, 7 + i * 1.5, dn[i])
      if (i === 3) focus = W(eEnd - 1, hT - 1, nR)
    }
    await until(() => at('rocket_hit'), 30)
    await bot.waitForTicks(4)
    // the anvil: the server sends a falling block's position about once a second, so the aim
    // follows the fall as vanilla simulates it (gravity 0.04, drag 0.98) from the push
    focus = W(eEnd + 2, hT + 1, nR)
    await until(() => at('anvil_push'), 20)
    await bot.waitForTicks(1)
    k = 0.3
    for (let y = hT + 1.5, v = 0; y > 1.5 && !at('anvil_land'); ) { v = (v + 0.04) * 0.98; y -= v; focus = W(eEnd + 2, Math.max(1.5, y - 1), nR); await bot.waitForTicks(1) }
    await until(() => at('anvil_land'), 20)
    k = 0.16
    // F: the wave runs east: cross the cart track and walk along it ~4 blocks off (from 7 the glass
    // read as a distant tint)
    sprint = true
    for (let kk = 0; kk < this.waveE.length; kk++) {
      const ahead = this.waveE[Math.min(this.waveE.length - 1, kk + 2)]
      focus = W(ahead - 1, 1.5, nF + 1); steer = W(ahead - 3, 0, nF - 3)
      await until(() => at(`wave${kk}`), 20)
    }
    // G: the TNT cart: launched and primed at once, it rides its whole fuse west to the TNT line.
    // Run alongside it ~4 blocks off (from 10 it was a speck) along the wave line (flush with the
    // ground), then peel off south before it reaches the TNT
    focus = W(this.eL, 1, nG); steer = W(this.eL - 2, 0, nG - 7)
    await until(() => at('tnt_launch'), 30)
    let last = null
    for (let i = 0; i < 200 && booms === 0; i++) {
      const en = ent('tnt_minecart')
      if (en) {
        const v = last ? Math.hypot(en.position.x - last.x, en.position.z - last.z) : 1
        last = en.position.clone()
        const ce = en.position.x - X
        steer = ce > -6 ? W(ce + 2, 0, nG - 7) : W(-6, 0, nG - 12)   // 3 blocks south of the raised glass
        // moving: lead it; waiting at the buffer: let the aim drift along the line it will light
        focus = v > 0.02 ? en.position.offset(-2.5, 0.3, 0) : focus.plus(new Vec3(0.3, 0, 0))
      }
      await bot.waitForTicks(1)
    }
    // H: the explosions race east to the pile. Back away south from the cart's blast on, facing it,
    // to ~25 blocks from every cube: a cube's blast flings primed TNT 15-20 blocks (one went off 3
    // blocks from the player right on the payoff), between the bells (e -2 / -7 on n 55)
    k = 0.1; steer = W(-5, 0, nH - 26); sprint = false
    for (let i = 0; i < 260 && !at('giant_peak'); i++) {
      if (at('big')) { focus = W(27, 3, nH + 3) } else if (at('cube')) { focus = W(12, 2.5, nH) }
      else {
        const tnts = Object.values(bot.entities).filter(en => en.name === 'tnt')
        const front = tnts.reduce((a, en) => (!a || en.position.x > a.position.x) ? en : a, null)
        if (front) focus = front.position.offset(2.5, 0.5, 0)
      }
      await bot.waitForTicks(1)
    }
    focus = W(27, 5, nH + 3)
    // keep watching (the eyes drifting over the pile) until the last cube has gone off and its smoke is thinning: the
    // Short ends on the settle now (it ended at giant_peak + 0.8 s with 4.5% of the view still flying: r:r24d99a)
    for (let i = 0; i < 240 && ctx.tick - lastBoomTick < 30; i++) {
      focus = W(27 + 3 * Math.sin(i / 40), 5 + 0.8 * Math.sin(i / 23), nH + 3)
      await bot.waitForTicks(1)
    }
    steer = null
    await bot.waitForTicks(2)
    bot.removeListener('physicsTick', onTick)
    for (const s of ['forward', 'back', 'left', 'right', 'sprint']) bot.setControlState(s, false)
    w.stop(); stopSounds(); bot._client.removeListener('explosion', onBoom)
    ctx.log('steps', JSON.stringify([...w.done]))
    return !!at('giant_peak') && !ctx.died
  }
}
