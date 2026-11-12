// Format "sandart" (owner 2026-11-11, r:r718ec5: "huge sand art"): a HUGE pixel picture poured from the sky in
// concrete powder (or sand / gravel): every pixel is a block patch dropped as real falling blocks, so the picture builds
// itself by gravity. One continuous drone shot: it starts high in the rain, sinks into it and glides low over the
// colours landing all round (too close to see the picture's edges), then pulls straight up as the last blocks land and
// the whole picture shows. No cut anywhere: a hard cut with blocks still falling is a settle blocker (r:r24d99a), and
// the Short ends 0.6 s after the last block lands (endAfter 'settle').
//
// An episode gives the picture only:
//   const { makeSandArt } = require('../lib/sandart')
//   module.exports = makeSandArt({
//     name: 'sandart_tnt',
//     art: ['RRRR', 'WKKW', ...],              // rows north to south, columns west to east; '.' = nothing poured
//     palette: { R: 'red_concrete_powder', W: 'white_concrete_powder', K: 'black_concrete_powder' },
//     scale: 7,                               // blocks a pixel (16 x 15 at 7 = 112 x 105 blocks)
//     caption, red,                           // the top caption (edit.py)
//   })
//
// The schedule (lib only, no server: `node lib/sandart.js stunts/<name>.js` prints it): every block gets a landing
// tick, spread evenly from 1 s before the Short's first frame to the moment the camera reaches the top, in a random
// order over the whole picture (a seeded shuffle: every take is the same). Each block is released above the camera
// (12-20 blocks over its height at that tick, at least `minDrop` over the ground), so no block appears out of thin air
// in view (the camera only ever looks down); one can still fall right past the lens, a near miss. Its release tick is worked back from the vanilla fall (FallingBlock: 2 ticks after
// the place, then gravity 0.04 and drag 0.98 a tick), so blocks touch down at a steady rate the whole way (the build
// stall rule r:r478786 counts landed blocks: a soft place sound every few ticks while they land) and the last ones
// land as the pull-up arrives: that tick is the payoff ('settle', 'complete').
// Marks: pour_start (the shot starts), pour_done (the last landing), complete (every block down), tally {n} (blocks
// landed, every 4 ticks; edit.tally draws the live count), top (the camera at the top).
const M = require('./movie')
const mega = require('./mega')

const FALL_DELAY = 2   // FallingBlock.onPlace schedules its tick 2 ticks later; then it becomes an entity
// ticks for a falling block released at rest to drop h blocks (FallingBlockEntity: vy = (vy - 0.04) * 0.98)
function fallTicks (h) { let y = 0, v = 0, n = 0; while (y > -h) { v = (v - 0.04) * 0.98; y += v; n++ } return n }

// a seeded PRNG (mulberry32): the same pour every take
function rng (seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// cubic Hermite through keys [s, [x, y, z], [vx, vy, vz]] (velocities in blocks a second): smooth speed through every key
function hermite (keys, s) {
  if (s <= keys[0][0]) return keys[0][1].map((p, j) => p + keys[0][2][j] * (s - keys[0][0]))
  const L = keys[keys.length - 1]
  if (s >= L[0]) return L[1].map((p, j) => p + L[2][j] * (s - L[0]))
  let k = 0
  while (s > keys[k + 1][0]) k++
  const [s0, p0, v0] = keys[k], [s1, p1, v1] = keys[k + 1], h = s1 - s0, u = (s - s0) / h
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2
  return [0, 1, 2].map(j => h00 * p0[j] + h10 * h * v0[j] + h01 * p1[j] + h11 * h * v1[j])
}

// The drone, in seconds of the Short (s = 0 its first frame) and blocks from the picture's centre on the ground's top
// (y = 0; the powder lands at y = 1). North is up on screen the whole way (yaw ~0), so the picture reads the right way
// round at the top. s0: high in the rain, sinking fast; s1: low over the picture; s2: the glide's end, starting to
// climb; s3: the top, straight down on the whole picture. The look keys keep the top of the frame below the horizon
// (pitch <= -52: the top ray hits the ground ~45 blocks ahead) so the low shots never see an edge.
function defaultCamera (W, D, S) {
  const top = S.topHeight || Math.ceil(Math.max(W, D) / 2 / Math.tan(35 * Math.PI / 180) * 1.12 + 2)   // fov 70: the picture fills ~85 % of the frame
  const T = S.times || [0, 2.5, 7.6, 10.3]
  const zA = Math.min(32, D / 2 - 18)
  return {
    top,
    times: T,
    pos: [
      [T[0], [-2, 34, zA], [1, -10, -6]],
      [T[1], [-1, 19, zA - 12], [0.8, -2, -4]],
      [T[2], [1, 15, 6], [0, 4, -1.5]],
      [T[3], [0, top, 3], [0, 0.45, 0]]
    ],
    // [s, [yaw, pitch, 0], [rates]] in degrees (yaw 0 = north, up the picture; mineflayer: positive turns west)
    angles: [
      [T[0], [-6, -60, 0], [3, 2, 0]],
      [T[1], [3, -55, 0], [1.5, 0, 0]],
      [T[2], [-2, -57, 0], [-1, -6, 0]],
      [T[3], [0, -88.5, 0], [0, 0, 0]]
    ]
  }
}

// where the drone looks at s: a point 10 blocks along its view
function lookAt (cam, s) {
  const p = hermite(cam.pos, s), [yd, pd] = hermite(cam.angles, Math.max(cam.times[0], Math.min(s, cam.times[3])))
  const y = yd * Math.PI / 180, pi = pd * Math.PI / 180
  return [p[0] - Math.sin(y) * Math.cos(pi) * 10, p[1] + Math.sin(pi) * 10, p[2] - Math.cos(y) * Math.cos(pi) * 10]
}

// -> { pixels: [{ x, z, block, land, rel, h }], pre, topS, ... }: the whole pour, in ticks from pour_start
function plan (S) {
  const art = S.art, k = S.scale || 7
  const W = art[0].length * k, D = art.length * k
  const x0 = -Math.floor(W / 2), z0 = -Math.floor(D / 2)
  const cam = S.camera || defaultCamera(W, D, S)
  const rand = rng(S.seed || 56)
  const cells = []
  art.forEach((row, j) => row.split('').forEach((ch, i) => {
    if (ch === '.' || ch === ' ') return
    const block = S.palette[ch]
    if (!block) throw new Error(`sandart: '${ch}' is not in the palette`)
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) cells.push({ x: x0 + i * k + a, z: z0 + j * k + b, block, ch })
  }))
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]] }
  // the clock: PRE s of recording before the Short's first frame (the rain already falling, the first blocks down
  // LEAD s before it), landings spread evenly up to the top of the pull-up
  const LEAD = S.lead ?? 1.0, minDrop = S.minDrop || 40
  const camY = (s) => hermite(cam.pos, Math.max(cam.times[0], Math.min(s, cam.times[3])))[1]
  const firstFall = FALL_DELAY + fallTicks(Math.max(minDrop, camY(cam.times[0]) + 12) + 8)
  const pre = Math.ceil((LEAD + firstFall / 20 + 0.3) * 20) / 20       // recording s before frame 1
  const L0 = Math.round((pre - LEAD) * 20), L1 = Math.round((pre + cam.times[3] - (S.endEarly ?? 0.05)) * 20)
  const n = cells.length
  // the landing curve: even, a touch denser at the start (the hook) and thinning into the top (the last blocks read
  // one by one as the camera arrives): landing fraction f(x) with x the share of blocks down
  const curve = S.curve || ((x) => 0.85 * x + 0.15 * x * x)
  let maxRel = 0
  cells.forEach((c, i) => {
    c.land = Math.round(L0 + (L1 - L0) * curve((i + 0.5) / n))
    const jit = 12 + rand() * 8
    // the latest release that still lands by c.land: higher (later) releases fall longer
    let r = c.land - FALL_DELAY - 1
    for (; r > 0; r--) {
      const h = Math.max(minDrop, camY(r / 20 - pre) + jit)
      if (r + FALL_DELAY + fallTicks(h) <= c.land) { c.h = Math.round(h); break }
    }
    if (r <= 0) { r = 0; c.h = Math.round(Math.max(minDrop, camY(-pre) + jit)) }
    c.rel = r
    maxRel = Math.max(maxRel, r)
  })
  const byTick = new Map()
  for (const c of cells) { if (!byTick.has(c.rel)) byTick.set(c.rel, []); byTick.get(c.rel).push(c) }
  return { cells, byTick, W, D, x0, z0, pre, L0, L1, maxRel, cam, n }
}

function makeSandArt (S) {
  const P = plan(S)
  const { W, D, pre, cam } = P
  const FIELD = Math.ceil(Math.max(W, D) / 2) + (S.margin || 26)   // flat grass this far out (the top shot shows ~14 past the picture)
  const HEIGHT = Math.max(Math.max(...P.cells.map(c => c.h)), cam.top + 4) + 12   // the drops and the drone's climb, in air
  // the drone as a lib/movie path, in recording seconds from pour_start (the Short starts `pre` s in)
  const keys = [], lkeys = []
  const sEnd = cam.times[3] + 3
  for (let s = -pre; s <= sEnd + 1e-6; s += 0.1) {
    const u = +(s + pre).toFixed(2)
    const sc = Math.max(s, cam.times[0])
    const p = hermite(cam.pos, sc), l = lookAt(cam, sc)
    keys.push([u, ...p.map(v => +v.toFixed(3))]); lkeys.push([u, ...l.map(v => +v.toFixed(3))])
  }
  const shots = {
    pour: { path: keys, lookPath: lkeys, ease: 'linear', fov: S.fov || 70, drift: 0, eyeTrace: false, push: 0 }
  }
  const sound = S.sound || 'block.sand.place'
  return {
    name: S.name,
    biome: S.biome || 'minecraft:plains',
    time: S.time ?? 6000,
    renderDistance: S.renderDistance || 10, recordRadius: S.recordRadius || FIELD + 40,
    entityRadius: Math.ceil(Math.hypot(W, D) / 2) + 12,   // (the default 64 missed the picture's corners)
    clouds: false,
    botTimeout: S.botTimeout || 900,
    settleWait: 200,
    eyeTrace: false,
    shots,
    sandartPlan: P,
    caption: S.caption,
    edit: {
      caption: S.caption, red: S.red,
      startAt: `pour_start:${pre}`,
      endAfter: `settle:${S.endAfter ?? 0.6}`,       // 0.6 s after the last block lands (r:r24d99a)
      dropAt: 'settle',                               // publish's NCS bed drops on the reveal
      tally: { event: 'tally', label: S.tallyLabel || 'blocks', done: 'complete' },   // the live count (scripts/retention.py), gold once every block is down
      // the payoff: the last block down with the whole picture on screen. A flash and a punch (the picture change),
      // the bed dipped under a real hit (mixcheck)
      flash: [['settle', 0, 0.45]], punch: [['settle', 0, 1.07]],
      sfx: [['dip', 'settle', 0.4], ['impact', 'settle', { gain: 1.2 }]],
      ...(S.edit || {})
    },

    async setup (ctx) {
      const { bot, Vec3 } = ctx
      await ctx.defaultRules()
      await ctx.cmd('/gamerule random_tick_speed 0')
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      if (!g) throw new Error('no dry land near spawn')
      const X = g.x, Z = g.z, F = g.y
      Object.assign(this, { X, Z, F })
      ctx.log(`sandart: picture ${W} x ${D} (${P.n} blocks) centred ${X} ${F} ${Z}, cleared to ${HEIGHT} up`)
      const T = 12
      await ctx.forceload({ x0: X - FIELD - T - 4, z0: Z - FIELD - T - 4, x1: X + FIELD + T + 4, z1: Z + FIELD + T + 4 })
      for (let i = 0; i < 60 && !bot.blockAt(new Vec3(X + FIELD, F, Z + FIELD)); i++) await bot.waitForTicks(5)
      for (const b of mega.split([X - FIELD, F + 1, Z - FIELD, X + FIELD, F + HEIGHT, Z + FIELD])) await ctx.cmd(`/fill ${b.join(' ')} air`, { mayFail: true })
      // the edge steps up (or down) to the land around like a hillside (lib/mega_lapse.js)
      for (let k = 1; k <= T; k++) {
        const a = FIELD + k, hi = F + Math.ceil(k * 1.3), lo = F - Math.ceil(k * 1.3)
        for (const [ax, az, bx, bz] of [[-a, -a, a, -a], [-a, a, a, a], [-a, -a, -a, a], [a, -a, a, a]]) {
          bot.chat(`/fill ${X + ax} ${hi} ${Z + az} ${X + bx} ${Math.min(F + HEIGHT, hi + 60)} ${Z + bz} air`)
          for (const what of ['air', 'water']) bot.chat(`/fill ${X + ax} ${lo - 1} ${Z + az} ${X + bx} ${lo} ${Z + bz} grass_block replace ${what}`)
          await bot.waitForTicks(1)
        }
      }
      for (const b of mega.split([X - FIELD, F - 4, Z - FIELD, X + FIELD, F - 1, Z + FIELD])) await ctx.cmd(`/fill ${b.join(' ')} dirt`, { mayFail: true })
      for (const b of mega.split([X - FIELD, F, Z - FIELD, X + FIELD, F, Z + FIELD])) await ctx.cmd(`/fill ${b.join(' ')} grass_block`, { mayFail: true })
      const g4 = (v) => Math.floor(v / 4) * 4
      for (let bx = g4(X - FIELD); bx <= X + FIELD; bx += 64) for (let bz = g4(Z - FIELD); bz <= Z + FIELD; bz += 64) for (let by = g4(F - 8); by <= F + 16; by += 8) {
        bot.chat(`/fillbiome ${bx} ${by} ${bz} ${bx + 63} ${by + 7} ${bz + 63} ${S.fieldBiome || 'minecraft:plains'}`); await bot.waitForTicks(1)
      }
      await ctx.cmd('/kill @e[type=!player]', { mayFail: true })
      // the bot (the drone's pilot) waits in a sealed room under the picture's middle, out of every shot; every falling
      // block is within the simulation distance of it (the corners ~5 chunks out)
      await ctx.cmd(`/fill ${X - 1} ${F - 14} ${Z - 1} ${X + 1} ${F - 12} ${Z + 1} air`)
      await ctx.cmd('/gamemode creative')
      await ctx.tpCheck(X + 0.5, F - 14, Z + 0.5, 0, 0)
      await bot.waitForTicks(40)
      return { x: X, y: F, z: Z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { X, Z, F } = this
      const Y = F + 1
      const want = new Map(P.cells.map(c => [`${c.x},${c.z}`, c]))
      let landed = 0, landedTick = 0, soundT = -9, done = false
      const onBlock = (oldB, newB) => {
        if (!newB || newB.position.y !== Y) return
        const c = want.get(`${newB.position.x - X},${newB.position.z - Z}`)
        if (!c || c.down || newB.name !== c.block) return
        c.down = true; landed++; landedTick = ctx.tick
      }
      bot.on('blockUpdate', onBlock)
      const drop = (c, h) => bot.chat(`/setblock ${X + c.x} ${F + h} ${Z + c.z} ${c.block}`)
      const t0 = ctx.tick
      M.shot(ctx, 'pour')
      ctx.mark('pour_start', { blocks: P.n, pre })
      let lastTally = -1, top = false, resent = 0
      const topT = Math.round((pre + cam.times[3]) * 20)
      for (let t = 0; ; t++) {
        while (ctx.tick - t0 < t) await bot.waitForTicks(1)
        for (const c of P.byTick.get(t) || []) drop(c, c.h)
        // anything the server dropped (a lost chat command is silent) or that landed on something else: once its
        // landing is 30 ticks late, release it again from above the camera (while there is still time to land)
        if (t % 10 === 0 && t > 40 && t < topT - 70) {
          const camY = hermite(cam.pos, Math.max(cam.times[0], Math.min(t / 20 - pre, cam.times[3])))[1]
          for (const c of P.cells) {
            if (!c.down && !c.again && c.land + 30 < t) { c.again = true; resent++; drop(c, Math.max(40, Math.round(camY + 14))) }
          }
        }
        // the landing patter (a build sound the stall check counts) and the live count
        if (landedTick >= ctx.tick - 2 && ctx.tick - soundT >= 3) { ctx.sound(sound, 0.4, 0.75 + ((t * 7) % 5) * 0.08); soundT = ctx.tick }
        if (t % 4 === 0 && landed !== lastTally) { ctx.mark('tally', { n: landed }); lastTally = landed }
        if (!top && t >= topT) { top = true; ctx.mark('top') }
        if (landed >= P.n && !done) { done = true; ctx.mark('pour_done'); ctx.mark('tally', { n: landed }); ctx.mark('complete') }
        if (done && top) break
        if (t > topT + 200) { ctx.log(`sandart: timed out with ${P.n - landed} blocks not down`); break }
      }
      bot.removeListener('blockUpdate', onBlock)
      // keep the drone drifting up for the tail
      await bot.waitForTicks(20)
      const missing = P.cells.filter(c => { const b = bot.blockAt(new Vec3(X + c.x, Y, Z + c.z)); return !b || b.name !== c.block })
      ctx.log(`sandart: ${P.n - missing.length}/${P.n} blocks right, ${resent} re-sent, done at ${((ctx.tick - t0) / 20 - pre).toFixed(2)} s of the Short (top at ${cam.times[3]} s)`)
      for (const c of missing.slice(0, 5)) ctx.log('missing', c.x, c.z, c.block)
      return missing.length === 0
    }
  }
}

module.exports = { makeSandArt, plan, fallTicks, hermite, defaultCamera, lookAt }

if (require.main === module) {
  const st = require(require('path').resolve(process.argv[2] || 'stunts/sandart_tnt.js'))
  const P = st.sandartPlan
  let busiest = 0
  for (const v of P.byTick.values()) busiest = Math.max(busiest, v.length)
  const lands = P.cells.map(c => c.land).sort((a, b) => a - b)
  let gap = 0
  for (let i = 1; i < lands.length; i++) gap = Math.max(gap, lands[i] - lands[i - 1])
  console.log(`${st.name}: ${P.n} blocks, ${P.W} x ${P.D}; ${pad(P.pre)} s before frame 1; releases ticks 0-${P.maxRel}, busiest tick ${busiest} commands; landings ${P.L0}-${P.L1} (Short ${((P.L0 / 20) - P.pre).toFixed(2)}-${((P.L1 / 20) - P.pre).toFixed(2)} s), widest gap ${gap} ticks; drops ${Math.min(...P.cells.map(c => c.h))}-${Math.max(...P.cells.map(c => c.h))} up; camera top ${P.cam.top}`)
  for (let s = 0; s <= P.cam.times[3] + 0.01; s += 1) {
    const L = Math.round((P.pre + s) * 20)
    const p = hermite(P.cam.pos, s), l = lookAt(P.cam, s)
    const pitch = Math.atan2(l[1] - p[1], Math.hypot(l[0] - p[0], l[2] - p[2])) * 180 / Math.PI
    console.log(`  s ${s.toFixed(0).padStart(2)}: cam ${p.map(v => v.toFixed(1)).join(' ')} pitch ${pitch.toFixed(0)}, ${lands.filter(x => x <= L).length} down`)
  }
}
function pad (x) { return x.toFixed(2) }
