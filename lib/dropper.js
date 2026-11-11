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
//             the speed. Light: a sea lantern ring every 24 blocks
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
  const cardY = opts.cardY ?? 0.13
  const cards = attempts.map((a, i) => [`att${i}`, `ATTEMPT #${a.n}`, i === last ? 1.6 : 1.1, i === last ? 'gold' : 'white', 0, { y: cardY }])
  return {
    name,
    biome: process.env.BIOME || opts.biome || 'minecraft:plains',
    caption,
    clouds: false,                // the cloud layer at y 192 would sit over the opening's view of the ground
    // vanilla's render-distance fog is max(xz, |y|): at 18 chunks it starts ~259 blocks out, so from the rim the bottom
    // 376 blocks down is in the fog (the shaft looks endless) and comes out of it during the fall
    renderDistance: 18,
    recordRadius: 320,
    brightness: 1,
    chunkStops (set) { return [[150, 150], [-150, 150], [150, -150], [-150, -150], [200, 0], [-200, 0], [0, 200], [0, -200]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },
    edit: {
      caption, red,
      startAt: 'go:-0.05',
      endAfter: 'land:0.75',
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
        ...attempts.map((_, i) => ['wind', `att${i}`, i === last ? 'land' : `fail${i}`]),
        ['pops'],
        ['dip', 'land', 0.4]
      ],
      ...(opts.edit || {})
    },

    cell (i, j) { return { x: this.X + i, z: this.Z + j } },
    holeCentre (L, k) { const h = L.holes[k]; return { x: this.X + (h[0] + h[2]) / 2 + 0.5, z: this.Z + (h[1] + h[3]) / 2 + 0.5, hx: (h[2] - h[0] + 1) / 2, hz: (h[3] - h[1] + 1) / 2 } },

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
      // a ring of sea lanterns every 24 blocks (the shaft's light under the obstacles)
      for (let y = TOP - 12; y > FLOOR + 4; y -= 24) {
        cmds.push(`/fill ${X - W} ${y} ${Z - W} ${X + W} ${y} ${Z - W} sea_lantern`, `/fill ${X - W} ${y} ${Z + W} ${X + W} ${y} ${Z + W} sea_lantern`)
        cmds.push(`/fill ${X - W} ${y} ${Z - W} ${X - W} ${y} ${Z + W} sea_lantern`, `/fill ${X + W} ${y} ${Z - W} ${X + W} ${y} ${Z + W} sea_lantern`)
      }
      // the floor: a bullseye (Chebyshev rings) with the landing in the middle
      for (let d = R; d >= 0; d--) cmds.push(`/fill ${X - d} ${FLOOR} ${Z - d} ${X + d} ${FLOOR} ${Z + d} ${rings[(R - d) % rings.length]}`)
      const k = (landing.size - 1) / 2
      cmds.push(`/fill ${X - k} ${FLOOR - 1} ${Z - k} ${X + k} ${FLOOR - 1} ${Z + k} stone`)
      cmds.push(`/fill ${X - k} ${FLOOR} ${Z - k} ${X + k} ${FLOOR} ${Z + k} ${landing.block}`)
      // the obstacles
      this.layers = layers.map((L) => {
        const y = TOP - L.depth, th = L.thick || 1
        cmds.push(`/fill ${X - R} ${y - th + 1} ${Z - R} ${X + R} ${y} ${Z + R} ${L.block}`)
        for (const h of L.holes) cmds.push(`/fill ${X + h[0]} ${y - th + 1} ${Z + h[1]} ${X + h[2]} ${y} ${Z + h[3]} air`)
        return { ...L, y, bottom: y - th + 1 }
      })
      // the rim: the player starts on the north wall's top, facing south into the shaft
      this.start = { x: X + 0.5, y: TOP + 1, z: Z - R - 0.5 }
      await this.burst(ctx, cmds)
      ctx.log(`dropper: shaft ${TOP - FLOOR} blocks (${TOP} to ${FLOOR}), ${layers.length} layers at y ${this.layers.map(L => L.y).join(', ')}`)
      await ctx.hotbar([])
      await ctx.cmd('/gamemode survival')
      await ctx.tpCheck(this.start.x, this.start.y, this.start.z + 0.15, 180, 55)
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
        let li = 0, done = false, result = null
        const target = () => {
          if (li >= this.layers.length || (failAt !== undefined && li > failAt)) return { x: this.X + 0.5, z: this.Z + 0.5, floorY: floorTop, bias: a.bias || 0 }
          const L = this.layers[li], c = this.holeCentre(L, L.via || 0)
          if (failAt === li) {
            // a near miss: just past the hole's edge, on the side the player comes from (it read as "almost")
            const p = bot.entity.position
            let dx = p.x - c.x, dz = p.z - c.z
            const m = Math.hypot(dx, dz)
            if (m < 0.3) { dx = a.miss ? a.miss[0] : 1; dz = a.miss ? a.miss[1] : 0 } else { dx /= m; dz /= m }
            if (!this._miss) this._miss = { x: c.x + dx * (Math.abs(dx) * c.hx + Math.abs(dz) * c.hz + 0.55), z: c.z + dz * (Math.abs(dx) * c.hx + Math.abs(dz) * c.hz + 0.55) }
            return { x: this._miss.x, z: this._miss.z, floorY: L.y + 1, bias: 0 }
          }
          return { x: c.x, z: c.z, floorY: L.y + 1, bias: 0 }
        }
        this._miss = null
        const startY = bot.entity.position.y
        const onTick = () => {
          if (done) return
          const e = bot.entity
          lookDown()
          // the layer we're over: passed once the feet are under its underside
          while (li < this.layers.length && e.position.y < this.layers[li].bottom - 0.1) { ctx.mark(`pass${i}_${li}`); li++ }
          const t = target()
          if (e.position.y > startY - 0.3) return   // still on the rim / just off it
          const c = steer({ yaw: YAW, px: e.position.x, pz: e.position.z, vx: e.velocity.x, vz: e.velocity.z, y: e.position.y, vy: e.velocity.y, tx: t.x, tz: t.z, floorY: t.floorY, startY, bias: t.bias })
          for (const key of ['forward', 'back', 'left', 'right']) bot.setControlState(key, c[key])
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
          const s = this.start
          await ctx.cmd(`/tp @s ${s.x} ${TOP + 2} ${s.z + 1.2} 180 89.9`)
          ctx.mark(`top${i}`)
          await bot.waitForTicks(CUT - 4)   // (ctx.cmd waited 4)
          ctx.mark(`att${i}`)
        }
        const r = await fall(i)
        if (i === last && r !== 'land') return false
      }
      // the payoff: in the water, the splash settles under the camera
      for (let t = 0; t < 30; t++) { await bot.look(YAW, -Math.PI / 2 + 0.002, true); await bot.waitForTicks(1) }
      return bot.health > 0
    }
  }
}

module.exports = { make, TOP, FLOOR, R, ticksToFall }
