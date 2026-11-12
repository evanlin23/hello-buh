// The "dropper" format (owner 2026-11-11, "Huge dropper?", r:r304cb5; STANDARDS "Format dropper"): one HUGE dropper
// shaft from the build limit to the bottom of the world, fallen in first person with the camera straight down. A big
// "ATTEMPT #N" card on every try, quick fails that really splat on the obstacle (the hit, the hearts gone, a shake and
// an impact; cut 0.35 s later, inside the death animation and before its poof; keep_inventory, the respawn inside the
// cut; owner r:r4607fa, after the first cut hid the hits and #47 didn't feel earned), then the clean run as the payoff: every layer
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
//             the speed. The walls are 2 thick: glazed terracotta trims, neon rings
//             every 8 blocks and lit stained-glass windows (blueprint(); `deco` overrides its blocks and adds `pillars`)
//   layers    the obstacles, top down: { depth, block, holes: [[x0, z0, x1, z1], ...], via, thick }
//             depth: blocks below the rim; holes in shaft cells (-4..4 both ways, x east, z south, inclusive); the
//             rest of the 9x9 is `block`; `via` = which hole the clean run takes (default 0). Leave >= 40 blocks
//             between layers and move the hole <= ~1.5 blocks layer to layer (air control's reach at speed)
//   attempts  [{ n: 1, fail: 1 }, { n: 7, fail: 3 }, ..., { n: 41 }]: n is the number on the card; fail = the layer
//             (0-based) the try hits; the last attempt has no fail: the clean landing
//   landing   { block: 'water' | 'slime_block' | 'hay_block' | 'powder_snow', size: 1 }: the target in the floor's
//             middle (true vanilla fall breakers only); the floor round it is a bullseye of `rings`
// Marks: go (the first step), att<i> (try i on screen from here), fail<i> (the splat on the obstacle; the cut 0.35 s later),
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

// The whole build as /fill and /setblock commands (the stunt sends them; scripts/dropper_sim.js reads the same list into
// its physics world, so every decoration that could touch a fall is in the sim). Owner 2026-11-12 on v2: "also the
// dropper should be fancier please" (docs/stories.md, r:r8fad06): patterned walls 2 thick, quartz corner pillars, neon rings
// of glowing stained glass, lit windows, trimmed obstacles with glowing hole rims, lanterns on chains, freestanding
// pillars, a crowned rim and a decorated pool.
function blueprint (spec, X, Z) {
  const { walls, band, layers, landing, rings } = spec
  const deco = { pillars: [], glow: 'pearlescent_froglight', trim: 'polished_blackstone', holeRim: 'ochre_froglight', corner: 'quartz_pillar', crown: ['gold_block', 'quartz_block'], neon: 'white_stained_glass', chains: true, ...(spec.deco || {}) }
  const W = R + 1, O = R + 2, cmds = []
  const colour = (b) => b.replace(/_concrete$/, '')
  const fill = (x0, y0, z0, x1, y1, z1, b) => cmds.push(`/fill ${X + x0} ${y0} ${Z + z0} ${X + x1} ${y1} ${Z + z1} ${b}`)
  const set = (x, y, z, b) => cmds.push(`/setblock ${X + x} ${y} ${Z + z} ${b}`)
  const ringAt = (y, d, b) => { fill(-d, y, -d, d, y, -d, b); fill(-d, y, d, d, y, d, b); fill(-d, y, -d, -d, y, d, b); fill(d, y, -d, d, y, d, b) }
  // the walls, 2 thick: per band an outer box of the colour, hollowed; the band's top row on the inside face is its
  // glazed terracotta (a pattern rushing past)
  for (let y1 = TOP, b = 0; y1 >= FLOOR - 1; y1 -= band, b++) {
    const y0 = Math.max(FLOOR - 1, y1 - band + 1), c = walls[b % walls.length]
    fill(-O, y0, -O, O, y1, O, c)
    fill(-R, Math.max(y0, FLOOR + 1), -R, R, y1, R, 'air')
    if (y1 < TOP && /_concrete$/.test(c)) ringAt(y1, W, `${colour(c)}_glazed_terracotta`)
  }
  // neon rings every 8 blocks: glowing glass on the inside face, the light behind it; between them, a lit window
  // of the band's stained glass in the middle of each wall
  for (let y = TOP - 4; y > FLOOR + 3; y -= 8) {
    ringAt(y, O, deco.glow); ringAt(y, W, deco.neon)
    const wy = y - 4
    if (wy > FLOOR + 3) {
      const b = Math.floor((TOP - wy) / band), c = walls[b % walls.length], glass = /_concrete$/.test(c) ? `${colour(c)}_stained_glass` : deco.neon
      for (const [ax, az, bx, bz] of [[-1, -W, 1, -W], [-1, W, 1, W], [-W, -1, -W, 1], [W, -1, W, 1]]) {
        fill(ax, wy - 1, az, bx, wy, bz, glass)
      }
      for (const [ax, az, bx, bz] of [[-1, -O, 1, -O], [-1, O, 1, O], [-O, -1, -O, 1], [O, -1, O, 1]]) fill(ax, wy - 1, az, bx, wy, bz, deco.glow)
    }
  }
  // the corners: quartz pillars the whole height (inside corners of the 2-thick wall)
  for (const [cx, cz] of [[-W, -W], [W, -W], [-W, W], [W, W]]) fill(cx, FLOOR, cz, cx, TOP, cz, deco.corner)
  // the floor: a bullseye with the pool in the middle, lit from below; lanterns in the four corners
  for (let d = R; d >= 0; d--) fill(-d, FLOOR, -d, d, FLOOR, d, rings[(R - d) % rings.length])
  ringAt(FLOOR + 1, W, deco.glow)
  const k = (landing.size - 1) / 2
  fill(-k, FLOOR - 1, -k, k, FLOOR - 1, k, spec.poolBottom || 'sea_lantern')
  fill(-k - 1, FLOOR, -k - 1, k + 1, FLOOR, k + 1, 'prismarine_bricks')
  fill(-k, FLOOR, -k, k, FLOOR, k, landing.block)
  for (const [cx, cz] of [[-R, -R], [R, -R], [-R, R], [R, R]]) set(cx, FLOOR + 1, cz, 'lantern')
  // the obstacles: the block with a trim ring at the wall, each hole rimmed in light (the hole reads from far up)
  const lay = layout(layers)
  for (const L of lay) {
    fill(-R, L.bottom, -R, R, L.y, R, L.trim || deco.trim)
    fill(-R + 1, L.bottom, -R + 1, R - 1, L.y, R - 1, L.block)
    for (const h of L.holes) fill(Math.max(-R, h[0] - 1), L.y, Math.max(-R, h[1] - 1), Math.min(R, h[2] + 1), L.y, Math.min(R, h[3] + 1), deco.holeRim)
    for (const h of L.holes) fill(h[0], L.bottom, h[1], h[2], L.y, h[3], 'air')
    // lanterns on chains under the layer's corners, where the layer is solid and no hole is within 2 cells
    if (deco.chains) {
      for (const [cx, cz] of [[-R, -R], [R, -R], [-R, R], [R, R]]) {
        if (L.holes.some(h => cx >= h[0] - 2 && cx <= h[2] + 2 && cz >= h[1] - 2 && cz <= h[3] + 2)) continue
        fill(cx, L.bottom - 2, cz, cx, L.bottom - 1, cz, 'iron_chain')   // 1.21.9+: the chain is iron_chain
        set(cx, L.bottom - 3, cz, 'lantern[hanging=true]')
      }
    }
  }
  // freestanding pillars to fall past: { from, to (depths), at: [x, z] (the -x -z corner), size (2), block }
  // (1x1 quartz read as a stray beam seen straight down: take 11; 2x2 gold reads as a column)
  for (const p of deco.pillars) { const n = (p.size || 2) - 1; fill(p.at[0], TOP - p.to, p.at[1], p.at[0] + n, TOP - p.from, p.at[1] + n, p.block || deco.pillar || 'gold_block') }
  // the rim: a crown on the outer ring (gold and quartz, a lantern on each corner); the inside rim stays clear to walk off
  for (let i = -O; i <= O; i++) for (const [x, z] of [[i, -O], [i, O], [-O, i], [O, i]]) set(x, TOP + 1, z, deco.crown[(i + O) % 2])
  for (const [cx, cz] of [[-O, -O], [O, -O], [-O, O], [O, O]]) set(cx, TOP + 2, cz, 'lantern')
  return cmds
}

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
  const cardY = opts.cardY ?? 0.34   // clear of the blocks-fallen counter (at 0.13 and 0.22 'ATTEMPT #47' ran into it: renders r0, review r1)
  const HIT = 0.35                   // s of each fail's splat on screen before the cut (the poof is at 1 s: never shown)
  const START = 0.25                 // s after 'go' the Short starts (frame 0: the step off the rim under way)
  const cards = [...attempts.map((a, i) => [i === 0 ? `go:${START}` : `att${i}`, `ATTEMPT #${a.n}`, i === last ? 1.6 : 1.1, i === last ? 'gold' : 'white', 0, { y: cardY }]),
    ['land', opts.landed || 'CLEAN!', 0.8, 'green', 0, { y: cardY }]]   // the payoff reads without sound
  return {
    name,
    biome: process.env.BIOME || opts.biome || 'minecraft:plains',
    caption,
    dropperSpec: { layers, attempts, landing, walls, band, rings, deco: opts.deco, poolBottom: opts.poolBottom },   // the build (blueprint) and the tries: scripts/dropper_sim.js flies it offline
    clouds: false,                // the cloud layer at y 192 would sit over the opening's view of the ground
    // vanilla's render-distance fog is max(xz, |y|): at 18 chunks it starts ~259 blocks out, so from the rim the bottom
    // 376 blocks down is in the fog (the shaft looks endless) and comes out of it during the fall
    renderDistance: 18,
    recordRadius: 320,
    brightness: 1,
    chunkStops (set) { return [[150, 150], [-150, 150], [150, -150], [-150, -150], [200, 0], [-200, 0], [0, 200], [0, -200]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },
    edit: {
      caption, red,
      startAt: `go:${START}`,            // frame 0 is the shaft with the step off the rim under way (owner r:r0f3da0: the subject, moving by 0.5 s)
      endAfter: 'land:0.7',          // owner r:r188b46: cut 0.5-0.8 s after the result ("boom, boom, boom, fast pace")
      // each fail: from just above the obstacle to the next try already falling
      speed: [
        ...attempts.slice(1).map((_, i) => [`fail${i}:${HIT}`, `att${i + 1}`, 'cut']),   // the splat shows, then boom: the next try (owner r:r188b46 and r:r4607fa)
        // a later try's top part was seen already: x2 until the layer before the one it fails on (the last: before
        // the last two layers), real time for the part that matters
        ...attempts.slice(1).map((a, j) => { const i = j + 1, upTo = (a.fail === undefined ? layers.length - 2 : a.fail) - 2; return upTo >= 0 ? [`att${i}`, `pass${i}_${upTo}`, opts.fast || 2] : null }).filter(Boolean)
      ],
      cards,
      fallen: [[`att${last}`, 'land', 'blocks']],
      shake: [...attempts.slice(0, -1).map((_, i) => [`fail${i}`, 0, 22]), ['land', 0, 18]],
      flash: [['land', 0, 0.35]],
      punch: [['land', 0, 1.12]],
      dropAt: 'land',
      sfx: [
        // a quiet wind (at the default 0.35 it masked every hit: pace heard none), a whoosh through every hole cleared
        ...attempts.map((_, i) => ['wind', `att${i}`, i === last ? 'land' : `fail${i}`, { gain: 0.15 }]),
        ...attempts.flatMap((a, i) => layers.slice(0, a.fail === undefined ? layers.length : a.fail).map((_, l) => ['whoosh', `pass${i}_${l}`, { gain: 0.4 }])),
        ['pops'],
        ['impact', `go:${START + 0.05}`, { gain: 0.45 }],   // a hit on frame 0 (a whoosh at 0.6 sat 11 dB under the peak: pace opening) with the card's pop (pace: sound by 0.3 s; the step is before the start)
        ...attempts.slice(0, -1).map((_, i) => ['impact', `fail${i}`, { gain: 0.6 }]),   // the splat lands as a hit over the bed
        ['boom', 'land'],                                                               // CLEAN gets the biggest hit (r:r4607fa)
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
      // centred on the world spawn, not on where the bot appears: our /spawnpoint on the rim persists in the world save,
      // and a retry spawned on the last try's rim built a new shaft 5 blocks over and died in it (take 10)
      const ws = bot.spawnPoint && (bot.spawnPoint.x || bot.spawnPoint.z) ? bot.spawnPoint.floored() : null
      const sp = (ws || bot.entity.position).floored()
      const X = sp.x, Z = sp.z
      this.worldSpawn = ws
      if (ws) await ctx.cmd(`/spawnpoint @s ${ws.x} ${ws.y} ${ws.z}`)   // undo a rim spawnpoint a crashed run left (the player is shared)
      Object.assign(this, { X, Z })
      await ctx.defaultRules()
      await ctx.cmd('/gamerule fall_damage true', { mayFail: true })   // the fails really splat (cut before the poof); water saves the last one, as in vanilla
      await ctx.cmd('/gamerule keep_inventory true', { mayFail: true })
      await ctx.cmd('/gamemode creative')   // no fall or suffocation while the shaft goes up round the bot
      await ctx.cmd(`/tp @s ${X + 0.5} 200 ${Z + 0.5}`)
      await ctx.forceload({ x0: X - 32, z0: Z - 32, x1: X + 32, z1: Z + 32 })
      const cmds = blueprint(this.dropperSpec, X, Z)
      this.layers = layout(layers)
      // the rim: the player starts on the north wall's top, facing south into the shaft
      this.start = starts(X, Z)
      await ctx.cmd(`/spawnpoint @s ${X} ${TOP + 1} ${Z - R - 1}`)   // a death respawns on the rim, inside the cut
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
              // the splat: the feet on the obstacle (owner r:r4607fa: the fails show their hit so #47 is earned); the
              // edit cuts ~0.35 s later, inside the 20-tick death animation and before its poof
              if (bot.entity.onGround || ctx.died || vy > -0.01) {
                if (li !== failAt || Math.abs(p.y - L.y - 1) > 0.1) throw new Error(`attempt #${a.n}: hit layer ${li} (meant to fail on ${failAt}) at y ${p.y.toFixed(2)}`)
                ctx.mark(`fail${i}`, { layer: failAt, x: +p.x.toFixed(2), z: +p.z.toFixed(2) })
                ctx.sound('entity.player.big_fall', 1, 1, { key: true })   // vanilla's big landing (the server's own hurt/death sounds follow)
                ctx.log(`attempt #${a.n}: hit layer ${failAt} at tick ${ctx.tick}`)
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
        if (r === 'fail') {
          // the fall kills (vanilla: blocks fallen - 3); the respawn on the rim happens inside the cut
          const t0 = ctx.tick
          for (let k = 0; k < 20 && !ctx.died; k++) await bot.waitForTicks(1)
          if (!ctx.died) throw new Error(`attempt #${attempts[i].n}: the hit didn't kill (health ${bot.health})`)
          while (ctx.tick < t0 + 12) await bot.waitForTicks(1)
          ctx.respawn()
          for (let k = 0; k < 60 && bot.entity.position.y < TOP; k++) await bot.waitForTicks(1)
          await bot.waitForTicks(4)
          ctx.revive()
        }
      }
      // the payoff: the splash in the lit pool under the camera (straight down; the edit ends 0.7 s after it)
      for (let t = 0; t < 40; t++) { await bot.look(YAW, -Math.PI / 2 + 0.002, true); await bot.waitForTicks(1) }
      // the respawn goes back to the world spawn: the player is shared with every other stunt (off camera: after the end)
      if (this.worldSpawn) bot.chat(`/spawnpoint @s ${this.worldSpawn.x} ${this.worldSpawn.y} ${this.worldSpawn.z}`)
      return bot.health > 0
    }
  }
}

module.exports = { make, blueprint, pilot, layout, starts, holeCentre, TOP, FLOOR, R, YAW, CUT, ticksToFall }
