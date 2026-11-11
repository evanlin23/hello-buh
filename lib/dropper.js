// The "dropper" format (owner 2026-11-11, "Huge dropper?", r:r304cb5; STANDARDS "Format dropper"): one HUGE dropper
// shaft from the build limit to the bottom of the world, fallen in first person with the camera straight down. A big
// "ATTEMPT #N" card on every try, quick fails cut BEFORE the impact (nothing dies on screen: fall damage off and the
// frames from just above the obstacle to the next try are dropped), then the clean run as the payoff: every layer
// passed and a real vanilla water landing (a 1x1 of water in the target: water cancels a fall, vanilla), with the
// splash, the song's drop and a dip before it.
//
// Everything on screen is real survival movement: the falls are vanilla physics, the steering is the movement keys
// only (lib/air_steer.js: the air control a player has), and the only commands build the set and teleport to the top
// for the next try (inside the cut). No place/break/use: nothing for the aim check. The camera's only turn is the
// opening's tilt from the rim to straight down, eased under the whip line (r:r38374d).
//
// An episode is a stunt module: dropper.make({ name, caption, red, walls, layers, attempts, landing, edit }).
//   walls     the shaft's colour bands, top down, cycled every `band` blocks (default 6): the bands rushing past are
//             the speed. Light: a ring of `lamp` (pearlescent froglight) every 8 blocks and over the floor
//   layers    the obstacles, top down: { depth, block, holes: [[x0, z0, x1, z1], ...], via, thick }
//             depth: blocks below the rim; holes in shaft cells (-4..4 both ways, x east, z south, inclusive); the
//             rest of the 9x9 is `block`; `via` = which hole the clean run takes (default 0). Leave >= 40 blocks
//             between layers and move the hole <= ~1.5 blocks layer to layer (air control's reach at speed)
//   attempts  [{ n: 1, fail: 1 }, { n: 7, fail: 3 }, ..., { n: 41 }]: n is the number on the card; fail = the layer
//             (0-based) the try hits; the last attempt has no fail: the clean landing
//   landing   { block: 'water' | 'slime_block' | 'hay_block' | 'powder_snow', size: 1 }: the target in the floor's
//             middle (true vanilla fall breakers only); the floor round it is a bullseye of `rings`
// Marks: go (the first step), att<i> (try i on screen from here), fail<i> (just above the obstacle: the cut),
//   top<i> (teleported back up), pass<i>_<layer> (try i cleared that layer), land (the clean landing: the payoff).
const { steer, ticksToFall } = require('./air_steer')

const TOP = 316                 // the rim's y: the player stands at 317, eyes at 318.6 (build limit 319)
const FLOOR = -60               // the floor's y (bedrock at -64)
const R = 4                     // the shaft's inner half-width: cells -4..4 (9x9)
const CUT = 8                   // at least this many ticks of a fall from rest cut out (from rest it reads as a hover)
const YAW = Math.PI             // facing south (+z) for the whole run: the screen's up is south
const BREAKERS = ['water', 'slime_block', 'hay_block', 'powder_snow', 'cobweb', 'honey_block', 'scaffolding', 'sweet_berry_bush']

// The steering of one try, as a pure function of the player's state (the stunt and scripts/dropper_sim.js share it).
// layers: [{ y, bottom, holes, via }] in world y; X, Z: the shaft's middle cell. tick(entity) -> movement keys (or
// null on the rim) and moves `li` (the layer it is over) on once the feet are under a layer's underside.
function holeCentre (L, k, X, Z) { const h = L.holes[k]; return { x: X + (h[0] + h[2]) / 2 + 0.5, z: Z + (h[1] + h[3]) / 2 + 0.5, hx: (h[2] - h[0] + 1) / 2, hz: (h[3] - h[1] + 1) / 2 } }
function pilot ({ layers, attempt: a, X, Z, startY }) {
  const failAt = a.fail, floorTop = FLOOR + 1
  let miss = null
  const st = { li: 0 }
  const target = (e) => {
    const li = st.li
    if (li >= layers.length || (failAt !== undefined && li > failAt)) return { x: X + 0.5, z: Z + 0.5, floorY: floorTop, bias: a.bias || 0 }
    const L = layers[li], c = holeCentre(L, L.via || 0, X, Z)
    if (failAt === li) {
      // a near miss: just past the hole's edge, on the side the player comes from (it reads as "almost")
      if (!miss) {
        let dx = e.position.x - c.x, dz = e.position.z - c.z
        const m = Math.hypot(dx, dz)
        if (m < 0.3) { dx = a.miss ? a.miss[0] : 1; dz = a.miss ? a.miss[1] : 0 } else { dx /= m; dz /= m }
        const r = Math.abs(dx) * c.hx + Math.abs(dz) * c.hz + 0.55
        miss = { x: c.x + dx * r, z: c.z + dz * r }
      }
      return { x: miss.x, z: miss.z, floorY: L.y + 1, bias: 0 }
    }
    // inside the hole's column and about to enter it: already head for the next one (air control is the limit)
    const n = layers[li + 1]
    if (n && (failAt === undefined || li + 1 <= failAt) && e.position.y + 2 * e.velocity.y < L.y + 1) {
      const inside = Math.abs(e.position.x - c.x) < c.hx - 0.4 && Math.abs(e.position.z - c.z) < c.hz - 0.4
      if (inside) { const c2 = holeCentre(n, n.via || 0, X, Z); return { x: Math.max(c.x - c.hx + 0.45, Math.min(c.x + c.hx - 0.45, c2.x)), z: Math.max(c.z - c.hz + 0.45, Math.min(c.z + c.hz - 0.45, c2.z)), floorY: L.bottom - 1, bias: 0 } }
    }
    return { x: c.x, z: c.z, floorY: L.y + 1, bias: 0 }
  }
  st.tick = (e) => {
    while (st.li < layers.length && e.position.y < layers[st.li].bottom - 0.1) st.li++
    if (e.position.y > startY - 0.3) return null   // still on the rim / just off it
    const t = target(e)
    return steer({ yaw: YAW, px: e.position.x, pz: e.position.z, vx: e.velocity.x, vz: e.velocity.z, y: e.position.y, vy: e.velocity.y, tx: t.x, tz: t.z, floorY: t.floorY, startY, bias: t.bias })
  }
  return st
}

// the layers in world y (top surface y, underside bottom)
function layout (layers) { return layers.map((L) => { const y = TOP - L.depth, th = L.thick || 1; return { ...L, y, bottom: y - th + 1 } }) }
// where a try starts: the first on the north rim (it steps off), the rest from rest in the air over the same side
function starts (X, Z) { return { rim: { x: X + 0.5, y: TOP + 1, z: Z - R - 0.35 }, air: { x: X + 0.5, y: TOP + 2, z: Z - R + 0.7 } } }

function make (opts) {
  const { name, caption, red, layers, attempts } = opts
  const walls = opts.walls || ['cyan_concrete', 'light_blue_concrete', 'blue_concrete', 'purple_concrete', 'magenta_concrete', 'pink_concrete']
  const band = opts.band || 6
  const landing = { block: 'water', size: 1, ...(opts.landing || {}) }
  if (!BREAKERS.includes(landing.block)) throw new Error(`dropper: ${landing.block} doesn't break a fall in vanilla (one of ${BREAKERS.join(', ')})`)
  const rings = opts.rings || ['white_concrete', 'red_concrete']
  if (!attempts.length || attempts[attempts.length - 1].fail !== undefined) throw new Error('dropper: the last attempt is the clean run (no fail)')
  for (const a of attempts.slice(0, -1)) if (!(a.fail >= 0 && a.fail < layers.length)) throw new Error(`dropper: attempt #${a.n} fails on layer ${a.fail}: no such layer`)
  const N = attempts.length, last = N - 1
  const cardY = opts.cardY ?? 0.22   // under the blocks-fallen counter (at 0.13 'ATTEMPT #47' ran into it: render r0)
  const cards = [...attempts.map((a, i) => [`att${i}`, `ATTEMPT #${a.n}`, i === last ? 1.6 : 1.1, i === last ? 'gold' : 'white', 0, { y: cardY }]),
    ['land', opts.landed || 'CLEAN!', 0.8, 'green', 0, { y: cardY }]]   // the payoff reads without sound
  return {
    name,
    biome: process.env.BIOME || opts.biome || 'minecraft:plains',
    caption,
    dropperSpec: { layers, attempts, landing },   // scripts/dropper_sim.js flies it offline
    clouds: false,                // the cloud layer at y 192 would sit over the opening's view of the ground
    // vanilla's render-distance fog is max(xz, |y|): at 18 chunks it starts ~259 blocks out, so from the rim the bottom
    // 376 blocks down is in the fog (the shaft looks endless) and comes out of it during the fall
    renderDistance: 18,
    recordRadius: 320,
    brightness: 1,
    chunkStops (set) { return [[150, 150], [-150, 150], [150, -150], [-150, -150], [200, 0], [-200, 0], [0, 200], [0, -200]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },
    edit: {
      caption, red,
      startAt: 'go:0.25',            // frame 0 is the shaft with the step off the rim under way (owner r:r0f3da0: the subject, moving by 0.5 s)
      endAfter: 'land:1.3',          // the splash, the tilt up to the target round the feet, CLEAN! read (pace: a text payoff 1.2 s+)
      // each fail: from just above the obstacle to the next try already falling
      speed: [
        ...attempts.slice(1).map((_, i) => [`fail${i}`, `att${i + 1}`, 'cut']),
        // a later try's top part was seen already: x2 until the layer before the one it fails on (the last: before
        // the last two layers), real time for the part that matters
        ...attempts.slice(1).map((a, j) => { const i = j + 1, upTo = (a.fail === undefined ? layers.length - 2 : a.fail) - 2; return upTo >= 0 ? [`att${i}`, `pass${i}_${upTo}`, opts.fast || 2] : null }).filter(Boolean)
      ],
      cards,
      fallen: [[`att${last}`, 'land', 'blocks']],
      shake: [['land', 0, 18]],
      flash: [['land', 0, 0.35]],
      dropAt: 'land',
      sfx: [
        // a quiet wind (at the default 0.35 it masked every hit: pace heard none), a whoosh through every hole cleared
        ...attempts.map((_, i) => ['wind', `att${i}`, i === last ? 'land' : `fail${i}`, { gain: 0.15 }]),
        ...attempts.flatMap((a, i) => layers.slice(0, a.fail === undefined ? layers.length : a.fail).map((_, l) => ['whoosh', `pass${i}_${l}`, { gain: 0.4 }])),
        ['pops'],
        ['dip', 'land', 0.4]
      ],
      ...(opts.edit || {})
    },

    cell (i, j) { return { x: this.X + i, z: this.Z + j } },

    async burst (ctx, cmds) {      // many /fills at once: the server runs them in a tick or two
      const { bot } = ctx
      for (let i = 0; i < cmds.length; i++) { bot.chat(cmds[i]); if (i % 30 === 29) await bot.waitForTicks(2) }
      await bot.waitForTicks(8)
    },

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      const X = sp.x, Z = sp.z
      Object.assign(this, { X, Z })
      await ctx.defaultRules()
      await ctx.cmd('/gamerule fall_damage false', { mayFail: true })   // the fails are cut before the hit; nothing dies on screen
      await ctx.cmd('/gamerule keep_inventory true', { mayFail: true })
      await ctx.cmd('/gamerule do_tile_drops false', { mayFail: true })
      await ctx.cmd(`/tp @s ${X + 0.5} 200 ${Z + 0.5}`)
      await ctx.forceload({ x0: X - 32, z0: Z - 32, x1: X + 32, z1: Z + 32 })
      const W = R + 1, cmds = []
      // the walls: an 11x11 box per band (its colour), hollowed to 9x9; the box runs from the floor's underside to the rim
      for (let y1 = TOP, b = 0; y1 >= FLOOR - 1; y1 -= band, b++) {
        const y0 = Math.max(FLOOR - 1, y1 - band + 1)
        cmds.push(`/fill ${X - W} ${y0} ${Z - W} ${X + W} ${y1} ${Z + W} ${walls[b % walls.length]}`)
        cmds.push(`/fill ${X - R} ${Math.max(y0, FLOOR + 1)} ${Z - R} ${X + R} ${y1} ${Z + R} air`)
      }
      // a ring of light every 8 blocks and one just over the floor (vanilla light: 15 at the wall, 11 in the middle; at
      // every 24 the deep shaft under the obstacles was near-black and the black obstacles read as holes: stills r0)
      const lamp = opts.lamp || 'pearlescent_froglight'
      const ring = (y) => [`/fill ${X - W} ${y} ${Z - W} ${X + W} ${y} ${Z - W} ${lamp}`, `/fill ${X - W} ${y} ${Z + W} ${X + W} ${y} ${Z + W} ${lamp}`,
        `/fill ${X - W} ${y} ${Z - W} ${X - W} ${y} ${Z + W} ${lamp}`, `/fill ${X + W} ${y} ${Z - W} ${X + W} ${y} ${Z + W} ${lamp}`]
      for (let y = TOP - 4; y > FLOOR + 3; y -= 8) cmds.push(...ring(y))
      cmds.push(...ring(FLOOR + 1))
      // the floor: a bullseye (Chebyshev rings) with the landing in the middle
      for (let d = R; d >= 0; d--) cmds.push(`/fill ${X - d} ${FLOOR} ${Z - d} ${X + d} ${FLOOR} ${Z + d} ${rings[(R - d) % rings.length]}`)
      const k = (landing.size - 1) / 2
      cmds.push(`/fill ${X - k} ${FLOOR - 1} ${Z - k} ${X + k} ${FLOOR - 1} ${Z + k} ${opts.poolBottom || 'sea_lantern'}`)   // a lit pool: at y -60 the water had only the wall ring's light and read as grey mush (stone and white bottoms alike)
      cmds.push(`/fill ${X - k} ${FLOOR} ${Z - k} ${X + k} ${FLOOR} ${Z + k} ${landing.block}`)
      // the obstacles
      this.layers = layout(layers)
      for (const L of this.layers) {
        cmds.push(`/fill ${X - R} ${L.bottom} ${Z - R} ${X + R} ${L.y} ${Z + R} ${L.block}`)
        for (const h of L.holes) cmds.push(`/fill ${X + h[0]} ${L.bottom} ${Z + h[1]} ${X + h[2]} ${L.y} ${Z + h[3]} air`)
      }
      // the rim: the player starts on the north wall's top, facing south into the shaft
      this.start = starts(X, Z)
      await this.burst(ctx, cmds)
      ctx.log(`dropper: shaft ${TOP - FLOOR} blocks (${TOP} to ${FLOOR}), ${layers.length} layers at y ${this.layers.map(L => L.y).join(', ')}`)
      await ctx.hotbar([])
      await ctx.cmd('/gamemode survival')
      await ctx.tpCheck(this.start.rim.x, this.start.rim.y, this.start.rim.z, 0, 55)   // MC yaw 0 = south = mineflayer YAW (pi)
      await bot.waitForTicks(20)
      return { x: X, y: 64, z: Z }
    },

    async perform (ctx) {
      const { bot } = ctx
      const MAXT = 8 * Math.PI / 180   // 160 deg/s at most, eased: the opening tilt
      const lookDown = () => {
        const want = -Math.PI / 2 + 0.002, dp = want - bot.entity.pitch
        const step = Math.sign(dp) * Math.min(Math.abs(dp), Math.max(0.01, Math.min(MAXT, Math.abs(dp) * 0.3)))
        bot.look(YAW, bot.entity.pitch + step, true)
      }
      const floorTop = FLOOR + 1
      // one fall: steer through the holes (the clean run) or into the layer `fail` (cut ~2 ticks over it)
      const fall = async (i) => {
        const a = attempts[i]
        const failAt = a.fail
        let done = false, result = null
        const pl = pilot({ layers: this.layers, attempt: a, X: this.X, Z: this.Z, startY: bot.entity.position.y })
        let li = 0
        const onTick = () => {
          if (done) return
          lookDown()
          const keys = pl.tick(bot.entity)
          while (li < pl.li) { ctx.mark(`pass${i}_${li}`); li++ }
          if (keys) for (const key of ['forward', 'back', 'left', 'right']) bot.setControlState(key, keys[key])
        }
        bot.on('physicsTick', onTick)
        try {
          for (let k = 0; k < 400; k++) {
            await bot.waitForTicks(1)
            const p = bot.entity.position, vy = bot.entity.velocity.y
            if (failAt !== undefined) {
              const L = this.layers[failAt]
              // the cut: the next tick would reach the obstacle's top (nothing hits on screen)
              if (p.y + 2 * vy <= L.y + 1.05 || bot.entity.onGround) {
                if (li !== failAt || p.y < L.y + 1) throw new Error(`attempt #${a.n}: hit layer ${li} (meant to fail on ${failAt}) at y ${p.y.toFixed(2)}`)
                ctx.mark(`fail${i}`, { layer: failAt, x: +p.x.toFixed(2), z: +p.z.toFixed(2), above: +(p.y - L.y - 1).toFixed(2) })
                ctx.sound('entity.player.big_fall', 1)   // the hit, heard over the cut
                ctx.log(`attempt #${a.n}: cut ${(p.y - L.y - 1).toFixed(2)} over layer ${failAt}`)
                result = 'fail'; break
              }
            } else if (p.y < floorTop + 1.2 || bot.entity.isInWater) {
              done = true; bot.clearControlStates()
              ctx.mark('land', { x: +p.x.toFixed(2), z: +p.z.toFixed(2) })
              ctx.sound('entity.player.splash.high_speed', 1, 1, { key: true })
              ctx.particles('splash', { x: p.x, y: floorTop - 0.05, z: p.z }, { count: 40 })
              ctx.log(`attempt #${a.n}: landed ${(p.x - this.X - 0.5).toFixed(2)}, ${(p.z - this.Z - 0.5).toFixed(2)} from the middle`)
              result = 'land'; break
            }
          }
        } finally { done = true; bot.removeListener('physicsTick', onTick); bot.clearControlStates() }
        if (!result) throw new Error(`attempt #${a.n}: neither landed nor reached its fail layer`)
        return result
      }

      for (let i = 0; i < N; i++) {
        if (i === 0) {
          // the opening: on the rim, looking down the shaft; one step off the edge
          ctx.mark('go'); ctx.mark('att0')
          bot.setControlState('forward', true)
          for (let t = 0; t < 30 && bot.entity.position.y > TOP + 0.5; t++) { lookDown(); await bot.waitForTicks(1) }
          bot.setControlState('forward', false)
        } else {
          // back to the top (inside the cut), a fresh fall from rest; the try is on screen once it's moving
          const s = this.start.air
          await ctx.cmd(`/tp @s ${s.x} ${s.y} ${s.z} 0 89.9`)
          ctx.mark(`top${i}`)
          await bot.waitForTicks(CUT - 4)   // (ctx.cmd waited 4)
          ctx.mark(`att${i}`)
        }
        const r = await fall(i)
        if (i === last && r !== 'land') return false
      }
      // the payoff: the splash under the camera, then the view tilts up a little: the pool (a pit in the floor: the eye is 0.6 over the floor) and its red rim
      // (straight down from 0.7 blocks the 1x1 filled the frame as grey texture: render r0), eased (under the 220 deg/s line)
      await bot.waitForTicks(4)
      await ctx.easeLook(YAW, -1.0, 600)   // eased in and out: the peak is twice the mean, ~110 deg/s
      for (let t = 0; t < 30; t++) { await bot.look(YAW, -1.0, true); await bot.waitForTicks(1) }
      return bot.health > 0
    }
  }
}

module.exports = { make, pilot, layout, starts, holeCentre, TOP, FLOOR, R, YAW, CUT, ticksToFall }
