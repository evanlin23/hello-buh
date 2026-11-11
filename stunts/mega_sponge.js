// Format "mega" (owner, 2026-11-11, r:r8bb1e3: "new format to try"), Short 1: a level-4 Menger sponge, 81 blocks a
// side and 160,000 blocks, placed in ~20 s of server commands (lib/mega.js), with an understated caption on top the
// whole time. Our own take, not a copy of the reference: our structure (a sponge, not a pyramid), our caption, our
// cuts. The flight alternates first-person elytra runs (HUD, a firework rocket in hand, a boost to open each) with
// cinematic camera shots of the whole thing, getting closer each time, and ends threading the 3x3 hole of the small
// glowing sponge hung in the big one's hollow middle ("a sponge inside the sponge").
//
// Beats (Short seconds): 0 low under the south-west corner, craning up (the build fills the frame) | 3.5 rocket boost,
// a run along the south face, the holes streaming past | 8 wide orbit: the whole thing over the forest | 12 boost,
// up the east face and over the top, looking down the top hole at the core | 16.5 the west face head-on, the core
// glowing deep in its hole | 20 boost, dive into the face hole (flash), slow down inside, thread the core (payoff)
//
// Minecraft-true: an elytra glide with rockets (~30 blocks/s with a boost, a rocket used per boost, the stack counts
// down); the rider is first person, so the elytra itself isn't seen. Film licence: the speed eases off inside without
// a climb (a vanilla glide would carry its speed longer), and the flight is a scripted path (physics off).
// Set: O = the ground under the sponge's middle. The sponge spans dx/dz -40..40, dy 1..81; its middle (0, 41, 0).
// The face holes are the middle thirds (-13..13); the core (ochre froglight, a level-2 sponge) dx/dy-41/dz -4..4,
// its hole along x: dy 40..42, dz -1..1. Golden hour: the sun sets in the west (-x).
const M = require('../lib/movie')
const mega = require('../lib/mega')

const SPONGE = mega.menger(4, { body: 'deepslate_tiles', edges: 'sea_lantern', core: 'ochre_froglight' })
const H = 40                            // half side: the sponge's min corner is O + (-40, 1, -40)
const EYE = 1.62

module.exports = {
  name: 'mega_sponge',
  biome: 'minecraft:flower_forest',
  near: [-2757, -206],                  // the flower forest the first take found (ground 63-83): the same site every try
  time: 11300,                          // late afternoon, a low warm sun on the west face (12150's sunset glow drew over the build's lower half)
  renderDistance: 12, recordRadius: 176,
  botTimeout: 900,
  eyeTrace: false,                      // a flight montage: every cut is a deliberate jump to a new angle
  look: { mood: 'golden_hour', bloom: 0.35, bloomThreshold: 0.86, bloomPasses: 1, sharpen: 0.4, rays: 0.5, raysOverBlocks: 0.3, shadows: true, vignette: 0.3, grain: 0.01 },
  shots: {
    pov: { pov: true },
    // 1. under the south-west corner looking up: the build fills the frame from frame 1, the camera craning up and back
    rise: { path: [[0, -52, 9, 56], [2, -57, 19, 62]], lookPath: [[0, -18, 62, 18], [2, -10, 54, 10]], fov: 74, dof: false, drift: 0.6, scenery: true, subject: [[-41.5, 50, 41.5]] },
    // 1b. the south-east corner from further out and higher: the whole height against the sky, the forest under it
    rise2: { path: [[0, 66, 20, 70], [1.6, 58, 27, 62]], lookPath: [[0, 26, 52, 26], [1.6, 22, 56, 22]], fov: 70, dof: false, drift: 0.5, scenery: true, subject: [[41.5, 50, 41.5]] },
    // 2b. along the south face from its east end, the low sun raking across it
    south: { path: [[0, 72, 30, 76], [1.5, 64, 36, 70]], lookPath: [[0, -10, 40, 41], [1.5, -14, 46, 41]], fov: 60, dof: false, drift: 0.4, scenery: true, subject: [[0, 45, 42]] },
    // 3. wide: the whole sponge over the forest, orbiting from the south-east
    orbit: { orbit: [0, 41, 0], radius: 112, height: 36, startDeg: 20, degPerSec: 11, fov: 56, dof: false, drift: 0.4, scenery: true, subject: [[0, 96, 0]] },
    // 3b. high over the top face (under the clouds at y 192: above them the frame went white), sliding across it: the fractal from above, the top hole in the middle
    top: { path: [[0, 40, 118, 50], [2.1, 22, 112, 34]], lookPath: [[0, 4, 81, 4], [2.1, 0, 81, 0]], fov: 58, dof: false, drift: 0.4, scenery: true, subject: [[0, 84, 0]] },
    // 5. the west face head-on, pushing in: the face hole, and the core glowing deep inside it
    face: { path: [[0, -150, 47, 0.5], [2, -122, 45, 0.5]], lookPath: [[0, 0, 41.5, 0.5], [2, 0, 41.5, 0.5]], fov: 52, dof: false, drift: 0.3, scenery: true, subject: [[0, 41.5, 0.5]] },
    // 5b. closer, on the hole's line: the tunnel, the core, the far exit
    face2: { path: [[0, -96, 43, 0.5], [1.9, -74, 42, 0.5]], lookPath: [[0, 0, 41.5, 0.5], [1.9, 0, 41.5, 0.5]], fov: 56, dof: false, drift: 0.3, scenery: true, subject: [[0, 41.5, 0.5]] }
  },
  edit: {
    caption: 'rate my starter house',
    dropAt: 'thread',                   // (no reference song: publish adds the NCS bed at -16 LUFS with its drop here)
    startAt: 'start:0', endAfter: 'thread:0.8',
    flash: [['inside', 0, 0.45], ['thread', 0, 0.3]],   // into the build, into the core
    punch: [['thread', 0, 1.08]],          // the payoff: into the core's hole
    // the music dips under the payoff hit and under the second boost of each run (mixcheck: under the NCS bed the
    // boosts alone left 3.1 s with nothing new)
    sfx: [['dip', 'thread', 0.4], ['impact', 'thread', { gain: 1.4 }], ['dip', 'swing', 0.25, { nth: 1 }], ['impact', 'swing', { nth: 1, gain: 0.6 }], ['dip', 'swing', 0.25, { nth: 3 }]]
  },

  async setup (ctx) {
    const { bot, Vec3 } = ctx
    await ctx.defaultRules()
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land near spawn')
    const X = g.x, Z = g.z
    await ctx.forceload({ x0: X - 64, z0: Z - 64, x1: X + 64, z1: Z + 64 })
    // the ground level: the median surface over the footprint (the sponge stands on a pad at that height)
    const hs = []
    for (let dx = -H; dx <= H; dx += 8) for (let dz = -H; dz <= H; dz += 8) { const s = ctx.surface(X + dx, Z + dz); if (s) hs.push(s.position.y) }
    hs.sort((a, b) => a - b)
    const F = hs.length ? hs[Math.floor(hs.length / 2)] : g.y
    Object.assign(this, { X, Z, F })
    ctx.log(`sponge at ${X} ${F} ${Z} (ground ${hs[0]}..${hs[hs.length - 1]})`)
    // clear the footprint (+3) up past the top, then a pad of dirt and grass under it
    for (const b of mega.split([X - H - 3, F + 1, Z - H - 3, X + H + 3, F + 90, Z + H + 3])) await ctx.cmd(`/fill ${b.join(' ')} air`)
    for (const b of mega.split([X - H - 2, F - 6, Z - H - 2, X + H + 2, F - 1, Z + H + 2])) await ctx.cmd(`/fill ${b.join(' ')} dirt`)
    await ctx.cmd(`/fill ${X - H - 2} ${F} ${Z - H - 2} ${X + H + 2} ${F} ${Z + H + 2} grass_block`)
    await ctx.cmd('/kill @e[type=!player,distance=..120]', { mayFail: true })   // animals and drops in the clearing
    await mega.place(ctx, SPONGE, { x: X - H, y: F + 1, z: Z - H })
    // let the server finish lighting 160,000 blocks before the chunks are snapshotted (take 1: the lower half of the
    // east faces was still unlit, and drew dark and see-through)
    await bot.waitForTicks(600)
    // the rider: an elytra on, rockets in hand
    await ctx.hotbar([['firework_rocket', 64]])
    await ctx.cmd('/item replace entity @s armor.chest with elytra')
    this.rockets = 64
    // stand on the top face, north edge (a solid cell), where the server keeps every chunk of the flight loaded
    await ctx.tpCheck(X + 0.5, F + 82, Z - 37.5, 180, 0)
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    ctx.select(0)
    await bot.waitForTicks(40)
    const b = bot.blockAt(new Vec3(X, F + 41, Z))
    ctx.log('core block at the middle:', b && b.name, '| a face cell:', bot.blockAt(new Vec3(X - 40, F + 2, Z - 40))?.name)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const W = (d) => ({ x: X + d[0], y: F + d[1], z: Z + d[2] })
    bot.physicsEnabled = false                   // the flight is a scripted path: physics off, our own tick clock
    // the server saw a survival player hanging in the air for the whole flight and kicked it for flying (take 5):
    // levitation (hidden, and the edit draws no effect icons) is one of vanilla's exemptions; physics is off, so it moves nothing
    bot.chat('/effect give @s levitation infinite 0 true')
    // the pose is applied by the clock itself, right before each tick is recorded: the server keeps re-sending the
    // spot it last saw (no movement packets with physics off), and mineflayer moved the bot back there between our
    // set and the tick (take 1: every other recorded tick was back on the roof)
    let want = null
    const clock = setInterval(() => {
      if (want) { bot.entity.position.set(want.x, want.y, want.z); bot.entity.velocity.set(0, 0, 0); bot.entity.yaw = want.yaw; bot.entity.pitch = want.pitch }   // motion-ok: the elytra flight is a scripted, arc-length eased path applied on the tick (no story kit here)
      bot.emit('physicsTick')
    }, 50)
    const park = () => { want = { x: X + 0.5, y: F - 20, z: Z + 0.5, yaw: 0, pitch: 0 } }   // in the ground, out of the camera shots
    const setEye = (p, look) => {
      const d = { x: look.x - p.x, y: look.y - p.y, z: look.z - p.z }
      want = { x: p.x, y: p.y - EYE, z: p.z, yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
    }
    const boost = () => {
      this.rockets--
      bot.swingArm()
      ctx.sound('entity.firework_rocket.launch', 1, 1)
      ctx.sound('item.elytra.flying', 0.35, 1)   // (quiet: at 0.8 the wind loop under the NCS bed left no room for any hit, mixcheck)
      bot.chat(`/item replace entity @s hotbar.0 with firework_rocket ${this.rockets}`)
      const p = want || bot.entity.position
      for (let k = 0; k < 6; k++) ctx.particles('firework_trail', { x: p.x + (Math.random() - 0.5) * 0.4, y: p.y + 0.4, z: p.z + (Math.random() - 0.5) * 0.4 }, { vy: -0.05 })
    }
    // a run along a Catmull-Rom curve through `keys` (local eye points), at `speed(i)` blocks a tick, looking at
    // `look(eye, ahead, i)` (ahead: the curve 10 blocks on). Arc-length parametrised: the speed is exactly what it says.
    const run = async (keys, ticks, speed, look, at = {}) => {
      const pts = []
      for (let s = 0; s < keys.length - 1; s++) {
        const p0 = keys[Math.max(0, s - 1)], p1 = keys[s], p2 = keys[s + 1], p3 = keys[Math.min(keys.length - 1, s + 2)]
        for (let k = 0; k < 40; k++) {
          const u = k / 40, u2 = u * u, u3 = u2 * u
          pts.push([0, 1, 2].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)))
        }
      }
      pts.push(keys[keys.length - 1])
      const cum = [0]
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]))
      const total = cum[cum.length - 1]
      const pointAt = (d) => {
        d = Math.max(0, Math.min(total, d))
        let i = 1; while (i < cum.length - 1 && cum[i] < d) i++
        const f = (d - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1])
        return W([0, 1, 2].map(j => pts[i - 1][j] + (pts[i][j] - pts[i - 1][j]) * f))
      }
      let d = 0
      for (let i = 0; i < ticks; i++) {
        if (at[i]) at[i]()
        const p = pointAt(d), ahead = pointAt(d + 10)
        if (d + 10 > total) { const q = pointAt(total - 2); ahead.x += (ahead.x - q.x) * 3; ahead.y += (ahead.y - q.y) * 3; ahead.z += (ahead.z - q.z) * 3 }
        setEye(p, look(p, ahead, i))
        await bot.waitForTicks(1)
        d += speed(i)
      }
      ctx.log(`run: ${d.toFixed(0)} of ${total.toFixed(0)} blocks`)
    }
    const ease = (a, b, i, n) => { const t = Math.min(1, Math.max(0, i / n)); return a + (b - a) * t * t * (3 - 2 * t) }
    const mix = (p, q, w) => ({ x: p.x + (q.x - p.x) * w, y: p.y + (q.y - p.y) * w, z: p.z + (q.z - p.z) * w })
    try {
      // 1. under the corner, craning up; then close under the south face (camera shots, ~1.8 s each)
      park(); M.shot(ctx, 'rise'); ctx.mark('start')
      ctx.sound('item.elytra.flying', 0.3, 0.9)
      await bot.waitForTicks(40)
      M.shot(ctx, 'rise2'); ctx.mark('rise2')
      await bot.waitForTicks(32)
      // 2. first person: a boost, then a run along the south face, the face on the left, looking ahead along it; a
      // second boost halfway
      M.shot(ctx, 'pov'); ctx.mark('cut'); ctx.mark('pass')
      await run([[-112, 24, 50], [-60, 30, 48], [-10, 40, 48], [30, 50, 49], [60, 56, 52]], 66, (i) => ease(1.2, 1.55, i, 20),
        (p, a, i) => mix(a, { x: Math.min(a.x + 6, X + 34), y: a.y - 2, z: Z + 41 }, ease(0.55, 0.75, i, 60)), { 2: boost, 34: boost })   // (r1: past the corner the view left the build: the run ends at it, the look held on the face)
      // 2b. the south face from its east end, raking light along it (a camera beat in the run: under the NCS bed the
      // second boost alone left 3.5 s with nothing new, mixcheck)
      park(); M.shot(ctx, 'south'); ctx.mark('cut'); ctx.mark('south')
      await bot.waitForTicks(30)
      // 3. wide orbit, then high over the top (camera shots)
      M.shot(ctx, 'orbit'); ctx.mark('wide')
      ctx.sound('item.elytra.flying', 0.3, 0.85)
      await bot.waitForTicks(46)
      M.shot(ctx, 'top'); ctx.mark('top')
      await bot.waitForTicks(42)
      // 4. first person: a boost up the north face and over the top, ending looking down the top hole at the core
      M.shot(ctx, 'pov'); ctx.mark('cut'); ctx.mark('climb')
      // (r1: up the north face, lit, not the shaded east one, 0.7 s near-black; it stops short of the top hole and looks
      // down it at a slant: straight down, the yaw spun as the eye crossed over)
      await run([[14, 36, -86], [7, 62, -60], [3, 88, -36], [0.5, 97, -18], [0.5, 99, -8]], 96, (i) => ease(1.5, 0.8, i, 96),
        (p, a, i) => mix(W([0.5, 74, 0]), W([0.5, 41, 18]), ease(0, 1, i - 42, 46)), { 2: boost, 46: boost })   // the north face and its top edge, then down the top hole
      // 5. the west face head-on, then closer on the hole's line (camera shots)
      park(); M.shot(ctx, 'face'); ctx.mark('cut'); ctx.mark('face')
      ctx.sound('item.elytra.flying', 0.3, 0.9)
      await bot.waitForTicks(40)
      M.shot(ctx, 'face2'); ctx.mark('face2')
      await bot.waitForTicks(38)
      // 6. first person: boost, dive into the face hole, ease off inside, thread the core's hole (the payoff)
      M.shot(ctx, 'pov'); ctx.mark('cut'); ctx.mark('dive')
      const path = [[-72, 44, 0.5], [-48, 41.5, 0.5], [-20, 41.5, 0.5], [0, 41.5, 0.5], [30, 41.5, 0.5]]
      // distance along: the face (x -40.5) is ~32 in, the core's face (x -4) ~68, its far side (x 5) ~77
      let dist = 0
      const marks = { 32: 'inside', 68: 'thread', 77: 'threaded' }
      const done = new Set()
      await run(path, 100, (i) => {
        const v = dist < 26 ? 1.5 : dist < 46 ? ease(1.5, 0.8, dist - 26, 20) : 0.8
        dist += v
        for (const [k, name] of Object.entries(marks)) if (dist >= +k && !done.has(name)) { done.add(name); ctx.mark(name); }
        return v
      }, (p, a) => a, { 2: boost })
      ctx.mark('end')
    } finally {
      clearInterval(clock)
      bot.physicsEnabled = true                  // the harness waits a few ticks after the stunt
    }
    return true
  }
}
