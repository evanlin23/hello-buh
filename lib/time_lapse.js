// "building a ___ in 1 second vs 1 minute vs 1 hour 💀": three builds of the same subject, each
// with a big clock running to its time (edit.clock), cut together with teleport cuts (edit.speed
// "cut" spans drop the wait around each teleport).
//   1 second: a sad little build, placed for real in real time (20 ticks).
//   1 minute: a decent build, placed block by block for real: the bot walks round it and works
//             each side from ~2 blocks out (vanilla reach, faces it can see, a jump for the top
//             row), shown as a time-lapse (mid.speed, default 2x).
//   1 hour:   something huge, rising layer by layer as a 3x time-lapse with the HUD hidden (F1).
//             The bot (creative, flying on a camera rail) places the blocks nearest it for real and /fill row passes lay the
//             rest, a few rows per tick, so it reads as building, never popping in. It ends on a
//             pull-back that shows the huge build behind the two small ones.
// A subject module gives the three plans (lib/time_lapse.js makeStunt).
//
// Layout around the spawn point (x, floor, z), everything facing south (+z) toward the camera:
//   small build: front row at z-5, centred on x-4.5 (bot at z-0.5)
//   mid build:   footprint from x+2, front row at z + mid.front (default -4); the bot walks round it
//   big build:   centred on (x, z-45); its own camera rail.

// Hermite spline through [tick, [x,y,z], [lx,ly,lz]] keys with Catmull-Rom tangents on
// non-uniform times (continuous velocity through every key).
function rail (keys) {
  const tan = (i, k) => {
    const a = keys[Math.max(0, i - 1)], b = keys[Math.min(keys.length - 1, i + 1)]
    if (a === b) return [0, 0, 0]
    return [0, 1, 2].map(j => (b[k][j] - a[k][j]) / (b[0] - a[0]))
  }
  return (t) => {
    if (t <= keys[0][0]) return { pos: keys[0][1], look: keys[0][2] }
    let i = keys.findIndex((k, j) => j < keys.length - 1 && t < keys[j + 1][0])
    if (i < 0) i = keys.length - 2
    const [t0, , ] = keys[i], t1 = keys[i + 1][0], h = t1 - t0
    const u = Math.min(1, (t - t0) / h)
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2
    const at = (k) => { const m0 = tan(i, k), m1 = tan(i + 1, k); return [0, 1, 2].map(j => h00 * keys[i][k][j] + h10 * h * m0[j] + h01 * keys[i + 1][k][j] + h11 * h * m1[j]) }
    return { pos: at(1), look: at(2) }
  }
}

const FACES = [[0, -1, 0, 1], [0, 0, 1, 2], [0, 0, -1, 3], [1, 0, 0, 4], [-1, 0, 0, 5], [0, 1, 0, 0]]
const SOUND = (n) => /dirt|grass/.test(n) ? 'block.gravel.place' : /glass/.test(n) ? 'block.glass.place' : /wool/.test(n) ? 'block.wool.place' : /planks|log|fence|wood/.test(n) ? 'block.wood.place' : 'block.stone.place'

// subject: {
//   name, caption, red,
//   small: { blocks: [[x,y,z,name]] (local, z=0 front row), slots: {name: slot} },
//   mid:   { blocks, w, d, slots, perTick (ticks per block), roofFrom (where a roof span starts: default roof_start) },
//   big:   { blocks: [[x,y,z,name,stage]] (local to the centre, y from the ground; y < 0 digs in),
//            hold (block the bot places for real) and slot, stageTicks ({stage: ticks}, built in
//            stage order), keys (camera keys [tick of the build, camera, look-at]),
//            reveal (keys after the build, ticks after done: keep the camera drifting to the end) },
//   hotbar: [...]
// }
function makeStunt (S) {
  const BIG_Z = -45
  return {
    name: S.name,
    renderDistance: S.renderDistance, recordRadius: S.recordRadius, botTimeout: S.botTimeout,   // wide shots (render.js, harness)
    biome: process.env.BIOME || S.biomeSearch || 'minecraft:plains',   // where the harness looks for the site
    caption: S.caption,
    edit: {
      caption: S.caption, red: S.red,
      song: S.song === undefined ? 'songs/funk_abnormal.mp3' : S.song, dropAt: 'big_done',   // S.song null: no reference song (publish adds NCS)
      // the payoff is the big build completing (60:00 and the drop): the camera's pull-back lands on
      // it, and the Short ends 0.8 s later with the camera still moving (the song's drop gets a moment
      // before the fade-out)
      startAt: S.startAt || 'small_start:-0.1', endAfter: S.endAfter || 'big_done:0.8',
      // a roof put on from inside plays faster (mid.roofSpeed), or is cut out ('cut'): the camera is under a
      // dark ceiling there, turning to a new block every frame (it strobed at 6x, lapse_house)
      speed: [['cut1_a', 'cut1_b', 'cut']].concat(S.mid.roofY !== undefined
        ? [['mid_start', S.mid.roofFrom || 'roof_start', S.mid.speed || 2], [S.mid.roofFrom || 'roof_start', 'roof_end', S.mid.roofSpeed || 8], ['roof_end', 'mid_done', S.mid.speed || 2]]
        : midSpeed(S.mid), [[S.cut2From || 'cut2_a', 'cut2_b', 'cut']], bigSpeed(S.bigCuts)),
      clock: [['small_start', 'small_done', 1, '1 SECOND'], ['mid_start', 'mid_done', 60, '1 MINUTE'], ['big_start', 'big_done', 3600, '1 HOUR']],
      // the payoff (60:00) gets a white flash + a zoom punch and a song dip + impact: pace wants a picture change and a hit on it (the drop alone didn't count in the packaged mix) (lapse_statue, lapse_rocket)
      ...(S.payoffFlash ? { flash: [['big_done', 0, 0.5]], punch: [['big_done', 0, 1.08]], sfx: [['dip', 'big_done', 0.3], ['impact', 'big_done']] } : {})
    },

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      // the field's look (S.field): plains grass by default, or sand on a desert, snow...
      const F = { top: 'grass_block', under: 'dirt', biome: 'minecraft:plains', ...(S.field || {}) }
      const g = ctx.findLand(sp.x, sp.z) || (() => {   // a desert has no grass: any dry surface will do
        const b = ctx.surface(sp.x, sp.z); return b && !/water|lava|ice/.test(b.name) && b.position.y >= 62 ? b.position : null
      })()
      if (!g) throw new Error('no dry land')
      const { x, z, y: floor } = g
      this.x = x; this.z = z; this.floor = floor
      await ctx.defaultRules()
      await ctx.cmd('/gamerule random_tick_speed 0')   // no ice on the moat, no grass dying under the fresh fills
      // a big cleared field: the castle site, the two small plots and the reveal camera's foreground
      // its edges sit ~115+ blocks from every camera, in the 8-chunk fog (a cut dirt edge 70 blocks
      // behind the minute build showed when the bot faced south; hills past the edge showed in the
      // minute's shots but not the hour's)
      // S.site = [dx0, dx1, dz0, dz1]: a smaller cleared site in the real world round it (owner on lapse_house, 2026-11-12:
      // "it doesnt need to be superflat"): only the builds' own ground is levelled, the land beyond keeps its trees,
      // hills and water; S.clearTrees: n also takes out the trees within n blocks of the taper (no half-cut trees)
      const [sx0, sx1, sz0, sz1] = S.site || [-120, 120, -125, 115]
      const X0 = x + sx0, X1 = x + sx1, Z0 = z + sz0, Z1 = z + sz1
      const ZM = z - 5                                     // fills in two halves: 241 x 121 under the 32768 cap
      const fill = async (y0, y1, block) => { for (const [a, b] of [[Z0, ZM], [ZM + 1, Z1]]) { bot.chat(`/fill ${X0} ${y0} ${a} ${X1} ${y1} ${b} ${block}`); await bot.waitForTicks(2) } }   // the bot's 180 s attempt budget
      // the far corners can be outside the chunks the server has loaded yet ("That position is not
      // loaded" and the whole /fill fails): keep the field loaded
      const TAPER = 20                                     // a stepped slope down to the field, not a sheer cut cliff
      for (const [a, b] of [[Z0 - TAPER, ZM], [ZM + 1, Z1 + TAPER]]) await ctx.cmd(`/forceload add ${X0 - TAPER} ${a} ${X1 + TAPER} ${b}`)   // 256 chunks a command at most
      for (let i = 0; i < 40 && !bot.blockAt(new ctx.Vec3(X1, floor, Z1)); i++) await bot.waitForTicks(5)
      await bot.waitForTicks(20)
      // top down: cleared bottom-up, gravel and sand fell back onto the field as heaps
      // (to floor + 72: a retried attempt's 64-high launch tower top stayed floating in the sky at +56)
      for (let y0 = floor + 72; y0 >= floor + 1; y0--) await fill(y0, y0, 'air')
      // the edge: ring k blocks out is cleared down to floor + 1.3k, so the terrain beyond steps down
      // to the field like a hillside instead of standing as a cut wall
      for (let k = 1; k <= TAPER; k++) {
        const h = floor + Math.ceil(k * 1.3), top = floor + 72
        for (const box of [[X0 - k, Z0 - k, X1 + k, Z0 - k], [X0 - k, Z1 + k, X1 + k, Z1 + k], [X0 - k, Z0 - k, X0 - k, Z1 + k], [X1 + k, Z0 - k, X1 + k, Z1 + k]]) {
          bot.chat(`/fill ${box[0]} ${h} ${box[1]} ${box[2]} ${top} ${box[3]} air`); await bot.waitForTicks(1)
        }
      }
      // and where the land beyond is lower, the field's edge steps down to it the same way (it stood as a
      // flat slab over a beach and the sea: lapse_rocket)
      for (let k = 1; k <= TAPER; k++) {
        const h = floor - Math.ceil(k * 1.3)
        for (const box of [[X0 - k, Z0 - k, X1 + k, Z0 - k], [X0 - k, Z1 + k, X1 + k, Z1 + k], [X0 - k, Z0 - k, X0 - k, Z1 + k], [X1 + k, Z0 - k, X1 + k, Z1 + k]]) {
          for (const what of ['air', 'water']) {
            bot.chat(`/fill ${box[0]} ${floor - 30} ${box[1]} ${box[2]} ${h - 1} ${box[3]} ${F.under} replace ${what}`); await bot.waitForTicks(1)
            bot.chat(`/fill ${box[0]} ${h} ${box[1]} ${box[2]} ${h} ${box[3]} ${F.top} replace ${what}`); await bot.waitForTicks(1)
          }
        }
      }
      if (S.clearTrees) {
        const m = TAPER + S.clearTrees
        for (const what of ['#minecraft:leaves', '#minecraft:logs']) for (const b of require('./mega').split([X0 - m, floor - 4, Z0 - m, X1 + m, floor + 40, Z1 + m])) {
          bot.chat(`/fill ${b.join(' ')} air replace ${what}`); await bot.waitForTicks(1)
        }
      }
      await ctx.cmd('/kill @e[type=!player]')            // falling blocks, and mobs of the old biome (polar bears on plains)
      // the layers under the top first: a sand top filled over caves fell in, leaving holes at ground
      // level that the oasis water spread through (lapse_statue)
      for (let y0 = floor - 4; y0 < floor; y0++) await fill(y0, y0, F.under)
      await fill(floor, floor, F.top)
      await bot.waitForTicks(4)
      await ctx.cmd('/kill @e[type=item]')
      // plains all over: the site can border a cold biome, whose water is navy (the moat) and whose
      // grass and sky differ; the harness re-sends the chunks before recording, with the new biomes
      // (tiles on the 4-block biome grid: /fillbiome rounds a box out to whole cells, and 64x64x8 off-grid was 38025)
      const g4 = (v) => Math.floor(v / 4) * 4
      for (let bx = g4(X0); bx <= X1; bx += 64) for (let bz = g4(Z0); bz <= Z1; bz += 64) for (let by = g4(floor - 4); by <= floor + 52; by += 8) {
        bot.chat(`/fillbiome ${bx} ${by} ${bz} ${bx + 63} ${by + 7} ${bz + 63} ${F.biome}`); await bot.waitForTicks(1)
      }
      await ctx.hotbar(S.hotbar)
      await ctx.tpCheck(x - 4.5, floor + 1, z - 1.3, 180, 25)   // (from z - 0.5 the top block of a 3-high build was 4.57 away)
      await ctx.cmd('/gamemode survival')
      ctx.select(S.small.slots[S.small.blocks[0][3]])
      await bot.waitForTicks(20)
      return { x, y: floor, z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const A = require('./act')(ctx)   // the aimed actions (lib/act.js: gated on the crosshair)
      const { x, z, floor } = this
      const placed = new Set()
      const key = (p) => `${p.x},${p.y},${p.z}`
      const solid = (p) => { if (placed.has(key(p))) return true; const b = bot.blockAt(new Vec3(p.x, p.y, p.z)); return !!(b && b.boundingBox === 'block') }
      // the camera eases toward aimTarget on every physics tick, so a slow loop pass never freezes
      // the shot for a tick (duplicate frames); look() only sets the target
      let aim = null, aimTarget = null, aimK = 0.3
      // the most the view turns in a tick (rad): 0.2 (~230 deg/s, a quick player's turn), eased (aimK). Inside the sped-up
      // 1-minute round the edit multiplies it on screen (x3: ~690 deg/s), and that is the look the owner wants there
      // (r:r66efa4, 2026-11-11: "it's okay to have like a really fast movement here because it's like, what, a time
      // lapse, right? Like right now, it's like I places and I take forever to turn"): no 220/speed cap in that round
      // (the 180/speed one of bb213c7d is gone); the round is marked turns_fast .. turns_fast_end so the whip check
      // (lib/hb/owner.js, r:r38374d) lets it through. The aim still lands on every block before the click (r:rffba12).
      const turnCap = 0.2
      // aiming for a jump: the eye the turn aims from is the jump's top (apexEye: its height), so the view is already
      // there when the jump arrives and doesn't swing up with it (a capped turn lagged the rise: forced placements)
      let apexEye = null
      let steerTo = null   // walk toward this spot (strafing, whatever way the camera faces)
      const aimTick = () => {
        if (steerTo) {
          const p = bot.entity.position, dx = steerTo.x - p.x, dz = steerTo.z - p.z, yw = bot.entity.yaw
          const f = -Math.sin(yw) * dx - Math.cos(yw) * dz, r = Math.cos(yw) * dx - Math.sin(yw) * dz
          bot.setControlState('forward', f > 0.25); bot.setControlState('back', f < -0.25)
          bot.setControlState('right', r > 0.25); bot.setControlState('left', r < -0.25)
        }
        if (!aimTarget) return
        // ease the yaw and the pitch themselves (easing a point through space spun the yaw 100 deg in a
        // tick when the point passed under the eye: looking up from a dig-down, lapse_statue)
        aim = aimTarget
        // from where the eye will be next tick (mid-jump it rises ~0.4 a tick: the pitch lagged and the
        // 1-second pumpkin click had the crosshair just over the hay, lapse_statue)
        // (in the air only: walking, the lead put the ray off grazing faces - two forced placements)
        const lead = bot.entity.onGround ? new Vec3(0, 0, 0) : bot.entity.velocity
        const eye0 = bot.entity.position.plus(lead).offset(0, 1.62, 0)
        const eye = apexEye !== null ? new Vec3(eye0.x, apexEye, eye0.z) : eye0, d = aimTarget.minus(eye)
        // (a point almost straight below: keep the yaw, its atan2 swung the view round 200 deg)
        const ty = Math.hypot(d.x, d.z) < 0.3 ? bot.entity.yaw : Math.atan2(-d.x, -d.z), tp = Math.atan2(d.y, Math.hypot(d.x, d.z))
        const cy = bot.entity.yaw, cp = bot.entity.pitch
        const dy = ((ty - cy + 3 * Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
        // at most ~11 deg a tick: at 3x a tick is a frame, and k 0.5-0.6 turned 50-60 % of a 90 deg look
        // down to the pillar in one frame (a snap, lapse_statue)
        // the cap is on the turn as the screen shows it (the whip check: hypot(yaw x cos pitch, pitch))
        const cap0 = turnCap
        let sy = dy * aimK, sp = (tp - cp) * aimK
        const m = Math.hypot(sy * Math.cos(cp), sp), lim = Math.min(cap0, 0.2)
        if (m > lim) { sy *= lim / m; sp *= lim / m }
        bot.look(cy + sy, cp + sp, true)
      }
      bot.on('physicsTick', aimTick)
      const look = async (target, k = 0.3) => { aimTarget = target; aimK = k }
      let lastSwing = -99
      // a swing per placement, restarted once the last one is half done (bot.time.age only updates
      // from the server's time packet, once a second: most placements had no swing)
      const swing = () => { if (ctx.tick - lastSwing >= 3) { bot.swingArm(); lastSwing = ctx.tick } }
      // a real survival placement on a face of something solid; false if nothing to click
      // the point a placement clicks: the middle of the support face it goes on (the crosshair belongs there)
      // which face to click: one that faces the eye (vanilla can't click the back of a block or a face
      // above the eye from below). The top face of the block below if the eye is over it (or can get
      // over it with a jump, when no side face is in view), else the nearest side face that faces the eye.
      // a voxel walk along a ray (Amanatides-Woo): the first solid block it enters and the face it
      // enters by (FACES numbering), within maxDist; null if none
      const rayHit = (o, d, maxDist = 4.5) => {
        let X = Math.floor(o.x), Y = Math.floor(o.y), Z = Math.floor(o.z)
        const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z)
        const tdx = sx ? Math.abs(1 / d.x) : Infinity, tdy = sy ? Math.abs(1 / d.y) : Infinity, tdz = sz ? Math.abs(1 / d.z) : Infinity
        let tmx = sx > 0 ? (X + 1 - o.x) / d.x : sx < 0 ? (X - o.x) / d.x : Infinity
        let tmy = sy > 0 ? (Y + 1 - o.y) / d.y : sy < 0 ? (Y - o.y) / d.y : Infinity
        let tmz = sz > 0 ? (Z + 1 - o.z) / d.z : sz < 0 ? (Z - o.z) / d.z : Infinity
        for (let n = 0; n < 64; n++) {
          let t, face
          if (tmx < tmy && tmx < tmz) { X += sx; t = tmx; tmx += tdx; face = sx > 0 ? 4 : 5 } else if (tmy < tmz) { Y += sy; t = tmy; tmy += tdy; face = sy > 0 ? 0 : 1 } else { Z += sz; t = tmz; tmz += tdz; face = sz > 0 ? 2 : 3 }
          if (t > maxDist) return null
          if (solid({ x: X, y: Y, z: Z })) return { x: X, y: Y, z: Z, face, t }
        }
        return null
      }
      const eyePos = () => bot.entity.position.offset(0, 1.62, 0)
      const ptOf = (b, f) => new Vec3(b.x + 0.5 + f[0] * 0.5, b.y + 0.5 + f[1] * 0.5, b.z + 0.5 + f[2] * 0.5)
      const isFace = (h, b, f) => !!h && h.x === b.x + f[0] && h.y === b.y + f[1] && h.z === b.z + f[2] && h.face === f[3]
      // the support face is in sight: a straight line from the eye reaches it with nothing in between
      // (the server doesn't check: from a pillar top the bot clicked faces behind its own blocks, lapse_statue)
      const seen = (b, f, eye = eyePos()) => { const d = ptOf(b, f).minus(eye), n = d.norm(); return n > 0 && isFace(rayHit(eye, d.scaled(1 / n), n + 0.5), b, f) }
      // which face to click: one in sight that faces the eye (vanilla can't click the back of a block or
      // a face above the eye from below, or through another block). The top face of the block below if it
      // is in sight, else the nearest side face in sight; with none in sight (yet), the one to aim at
      // while getting there: the top face if the eye is over it, else the nearest facing side face
      const supportOf = (b) => {
        const eye = eyePos()
        const ok = FACES.filter(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz }))
        const faces = (f) => eye.minus(ptOf(b, f)).dot(new Vec3(-f[0], -f[1], -f[2])) > 0.05   // the clicked face points at the eye
        const vis = ok.filter(f => faces(f) && seen(b, f, eye))
        const byDist = (f, g) => eye.distanceTo(ptOf(b, f)) - eye.distanceTo(ptOf(b, g))
        const vb = vis.find(f => f[1] === -1)
        if (vb) return vb
        const vs = vis.filter(f => f[1] === 0).sort(byDist)[0]
        if (vs || vis.length) return vs || vis[0]
        const below = ok.find(f => f[1] === -1)
        // the top face if the eye is over it or a jump gets it there (a blocked side face never comes into
        // sight by waiting: two pillar-top placements were forced, lapse_statue)
        if (below && (faces(below) || ptOf(b, below).y - eye.y < 1.0)) return below
        const side = ok.filter(f => f[1] === 0 && faces(f)).sort(byDist)[0]
        return side || below || ok[0] || FACES[0]
      }
      const inSight = (b) => FACES.some(f => solid({ x: b.x + f[0], y: b.y + f[1], z: b.z + f[2] }) && seen(b, f))
      // the first block the crosshair's ray hits
      const crossRay = () => {
        const yw = bot.entity.yaw, pt = bot.entity.pitch
        return rayHit(eyePos(), new Vec3(-Math.sin(yw) * Math.cos(pt), Math.sin(pt), -Math.cos(yw) * Math.cos(pt)), 4.5)
      }
      // the crosshair's own ray lands on the face place() will click
      const aimedAt = (b) => {
        const yw = bot.entity.yaw, pt = bot.entity.pitch
        const v = new Vec3(-Math.sin(yw) * Math.cos(pt), Math.sin(pt), -Math.cos(yw) * Math.cos(pt))
        const f = supportOf(b)
        if (!isFace(rayHit(eyePos(), v, 4.5), b, f)) return false
        // mid-jump the body moves 0.2-0.3 blocks before the pose is drawn: the ray from the eye a tick
        // on has to land on it too (5 jump clicks showed the crosshair just off the face)
        if (bot.entity.onGround) return true
        return isFace(rayHit(eyePos().plus(bot.entity.velocity), v, 4.5), b, f)
      }
      const facePoint = (b) => {
        const f = supportOf(b)
        return new Vec3(b.x + 0.5 + f[0] * 0.5, b.y + 0.5 + f[1] * 0.5, b.z + 0.5 + f[2] * 0.5)
      }
      const offAim = (p) => {   // degrees between the crosshair and p
        const eye = bot.entity.position.offset(0, 1.62, 0), d = p.minus(eye).normalize()
        const yw = bot.entity.yaw, pt = bot.entity.pitch
        const v = new Vec3(-Math.sin(yw) * Math.cos(pt), Math.sin(pt), -Math.cos(yw) * Math.cos(pt))
        return Math.acos(Math.max(-1, Math.min(1, v.dot(d)))) * 180 / Math.PI
      }
      const place = (b) => {
        const f = solid({ x: b.x + supportOf(b)[0], y: b.y + supportOf(b)[1], z: b.z + supportOf(b)[2] }) ? supportOf(b) : null
        if (!f) return false
        const [dx, dy, dz, face] = f
        // gated on the crosshair (lib/act.js): the build's own look governor turns the view, so it waits up to 3 ticks.
        // -> the click's promise: buildOne waits for it, so a click that had to wait can't go out after the build has
        // moved on to the next block (off the crosshair, and before its support's own click: lapse_statue's pillar top)
        placed.add(key(b))
        return A.click({ x: b.x + dx, y: b.y + dy, z: b.z + dz }, face, [0.5, 0.5, 0.5], { turn: false, max: 3,
          also: () => ctx.mark('place', { x: b.x, y: b.y, z: b.z }) })   // client prediction: the block and the stack count change this tick (render.js, edit.py)
      }
      const check = (list, what) => {
        let bad = 0
        for (const b of list) { const bl = bot.blockAt(new Vec3(b.x, b.y, b.z)); if (!bl || bl.name !== b.name) { bad++; if (bad < 6) ctx.log('wrong', what, b.x - x, b.y - floor, b.z - z, b.name, '->', bl && bl.name) } }
        ctx.log(what, `${list.length - bad}/${list.length} blocks correct`)
        return bad
      }
      let wrong = 0

      // ---- 1 second: the sad build, 20 ticks, real time ----
      const sm = S.small.blocks.map(([bx, by, bz, name]) => ({ x: x - 6 + bx, y: floor + 1 + by, z: z - 5 + bz, name }))
      const smCenter = new Vec3(x - 4.5, floor + 2, z - 5)
      aim = smCenter.offset(0, -0.6, 0)
      // the ground under it has to be in the client's world first: straight after the chunk refresh
      // it wasn't once, place() found nothing to click and the 1-second build was 0/3 (lapse_statue)
      const under = { x: sm[0].x, y: sm[0].y - 1, z: sm[0].z }
      for (let i = 0; i < 200 && !solid(under); i++) await bot.waitForTicks(1)
      if (!solid(under)) ctx.log('the ground under the 1-second build never loaded')
      for (let i = 0; i < 4; i++) { await look(facePoint(sm[0]), 0.4); await bot.waitForTicks(1) }   // the crosshair on the first block's spot
      ctx.mark('small_start')
      // exactly 20 ticks, on the tick counter (a slow loop pass can't stretch it)
      const every = Math.floor(20 / sm.length), t0 = ctx.tick
      let j = 0
      while (ctx.tick - t0 < 20) {
        const el = ctx.tick - t0
        while (j < sm.length && el >= j * every && (aimedAt(sm[j]) || el >= j * every + 3)) {   // the crosshair on it (up to 3 ticks late)
          const b = sm[j]
          if (bot.quickBarSlot !== S.small.slots[b.name]) ctx.select(S.small.slots[b.name])
          if (place(b)) { swing(); ctx.sound(SOUND(b.name), 1, 0.9 + (j % 3) * 0.05) }
          j++
        }
        // the crosshair leads to the next block's face; a face above the eye needs a jump (its top
        // face is only in view from the top of one): jump 5 ticks ahead
        const nx = sm[Math.min(sm.length - 1, j)]
        bot.setControlState('jump', j < sm.length && nx.y + 0.3 > bot.entity.position.y + 1.62 && el >= j * every - 5 && el < j * every)
        await look(facePoint(nx), 0.5)
        await bot.waitForTicks(1)
      }
      bot.setControlState('jump', false)
      ctx.mark('small_done')
      // a look at it: a slow push and a tilt (no still frames)
      for (let i = 0; i < 4; i++) { await look(smCenter.offset(0.6 * Math.sin(i / 2), 0, 0), 0.12); await bot.waitForTicks(1) }   // the joke reads in ~0.3 s: a short look
      wrong += check(sm, 'small')

      // ---- teleport cut ----
      ctx.mark('cut1_a')
      const md = S.mid
      // the mid build stands with its front row at z + (md.front ?? -4)
      const mo = { x: x + 2, y: floor + 1, z: z + (md.front ?? -4) - (md.d - 1) }
      const mdTop = Math.max(...md.blocks.map(b => b[1])) + 1
      const mdCenter = new Vec3(mo.x + md.w / 2, mo.y + 1 + Math.max(0, mdTop - 4) * 0.6, mo.z + md.d / 2)   // tall builds: aim higher (a statue's face was above the frame)
      // survival-legal: the bot walks round the build and works each side from ~2 blocks out (within
      // vanilla reach, on faces it can see), jumping for rows above its eye
      // (inside the footprint, not on its edge: 'IN', built with the first side, deepest first: a rocket's
      // core column was hidden behind its own outer blocks once they were in, lapse_rocket)
      // md.oneSide ('S'...): every block from that one side, the ones behind first (as 'IN' blocks are): a 2-deep build
      // needs no walk round its back (lapse_statue, r:r478786: the walk round was a 1.3-1.6 s stall, and a 180 deg turn
      // at a followable on-screen speed can't be shorter; a jump cut across it is a lapse camera jump, r:r200cfe)
      const sideOf = (bx, bz) => md.oneSide ? md.oneSide : bz === md.d - 1 ? 'S' : bz === 0 ? 'N' : bx === md.w - 1 ? 'E' : bx === 0 ? 'W' : 'IN'
      const OUT = md.out ?? 2.6   // further out (within reach) keeps more of a small build in frame
      const SPOT = {
        S: new Vec3(mo.x + md.w / 2, mo.y, mo.z + md.d + OUT), E: new Vec3(mo.x + md.w + OUT, mo.y, mo.z + md.d / 2),
        N: new Vec3(mo.x + md.w / 2, mo.y, mo.z - OUT), W: new Vec3(mo.x - OUT, mo.y, mo.z + md.d / 2)
      }
      const CORNER = { N: new Vec3(mo.x + md.w + OUT, mo.y, mo.z - OUT), W: new Vec3(mo.x - OUT, mo.y, mo.z - OUT), S: new Vec3(mo.x - OUT, mo.y, mo.z + md.d + OUT) }
      // east, north, west, then the front last: it ends in front of the doorway and steps straight back
      // (a build with nothing on its first sides - a 2-deep statue has only N and S - starts at its first
      // side with blocks: walking past empty sides was 1.5 s of nothing, lapse_statue)
      const mdList = md.blocks.map(([bx, by, bz, name]) => ({ x: mo.x + bx, y: mo.y + by, z: mo.z + bz, name, side: sideOf(bx, bz), roof: md.roofY !== undefined && by >= md.roofY, tower: md.towerY !== undefined && by >= md.towerY }))
      const ALL = ['E', 'N', 'W', 'S']
      const first = Math.max(0, ALL.findIndex(sd => mdList.some(b => b.side === sd && !b.roof && !b.tower)))
      const SIDES = ALL.slice(first)
      const YAW = { E: 90, N: 0, W: -90, S: 180 }
      await ctx.tpCheck(+SPOT[SIDES[0]].x.toFixed(2), floor + 1, +SPOT[SIDES[0]].z.toFixed(2), YAW[SIDES[0]], 10)
      aim = null; aimTarget = null
      const firstSlot = md.slots[mdList[0].name]
      ctx.select(Array.isArray(firstSlot) ? firstSlot[0] : firstSlot)
      await look(mdCenter.offset(0, -0.5, 0))   // the build's spot
      await bot.waitForTicks(3)
      // inside the cut: landed, still, and the view on the build before the shot starts (a slide of 0.3 blocks and a
      // turn still finishing showed in the first frames after the cut)
      for (let i = 0; i < 30 && (!bot.entity.onGround || Math.hypot(bot.entity.velocity.x, bot.entity.velocity.z) > 0.005 || offAim(mdCenter.offset(0, -0.5, 0)) > 2); i++) await bot.waitForTicks(1)
      ctx.mark('cut1_b')

      // ---- 1 minute: block by block for real, a time-lapse in the edit ----
      ctx.mark('mid_start')
      ctx.mark('turns_fast')   // the sped-up build: fast turns between placements (r:r66efa4; the whip check skips it)
      const used = {}
      const walkTo = async (spot, maxTicks = 60) => {
        steerTo = spot
        for (let i = 0; i < maxTicks && Math.hypot(spot.x - bot.entity.position.x, spot.z - bot.entity.position.z) > 0.4; i++) await bot.waitForTicks(1)
      }
      let guard = 0
      // one survival placement: the slot, the crosshair on the clicked face, a jump for a face above
      // the eye, within reach, then place and swing
      const buildOne = async (b, steer) => {
        used[b.name] = (used[b.name] || 0) + 1
        let slot = md.slots[b.name]
        if (Array.isArray(slot)) slot = slot[Math.floor((used[b.name] - 1) / 64)]     // next stack once one runs out
        if (bot.quickBarSlot !== slot) ctx.select(slot)
        // the crosshair on the face it clicks (aiming toward the build's middle put it 17-51 deg off)
        let fp = facePoint(b)
        await look(fp, 0.5)
        if (steer) steerTo = steer
        // a top face above the eye is only in view from the top of a jump (a side face is in view from
        // below; jumping for those under a roof put the head where the block goes and the server refused it)
        const eyeY = () => bot.entity.position.y + 1.62
        const eyeTo = (q) => eyePos().distanceTo(q)
        // ready: within reach of the face (corner merlons went in from 5.1 blocks) and the crosshair's ray
        // on it (a 2.5 deg aim window let grazing clicks through, and clicks through blocks)
        const ok = () => { fp = facePoint(b); aimTarget = fp; return eyeTo(fp) <= 4.4 && aimedAt(b) }
        for (let attempt = 0; attempt < 6 && !ok(); attempt++) {
          const topFace = supportOf(b)[1] === -1
          if (topFace && fp.y + 0.3 > eyeY()) {                // jump: the crosshair on it at the top
            for (let i = 0; i < 12 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
            // aim from the jump's top first (1.25 up), then jump: the view hardly moves on the way up
            apexEye = bot.entity.position.y + 1.25 + 1.62
            const fromTop = () => { const e = bot.entity.position; const d = fp.minus(new Vec3(e.x, apexEye, e.z)).normalize(); const yw = bot.entity.yaw, pt = bot.entity.pitch; return Math.acos(Math.max(-1, Math.min(1, d.dot(new Vec3(-Math.sin(yw) * Math.cos(pt), Math.sin(pt), -Math.cos(yw) * Math.cos(pt)))))) * 180 / Math.PI }
            for (let i = 0; i < 40 && fromTop() > 1.5; i++) await bot.waitForTicks(1)
            bot.setControlState('jump', true)
            for (let i = 0; i < 14 && !ok(); i++) {
              await bot.waitForTicks(1)
              if (!bot.entity.onGround && bot.entity.velocity.y < 0 && eyeY() < fp.y + 0.05) break
            }
            bot.setControlState('jump', false)
            apexEye = null
          } else for (let i = 0; i < 30 && !ok(); i++) await bot.waitForTicks(1)   // (up to 1.5 s: a far turn and a step)
        }
        if (!ok()) ctx.log('forced placement (face not in sight or not aimed)', b.x - x, b.y - floor, b.z - z, b.name)
        await place(b); swing()
        ctx.sound(SOUND(b.name), 1, 0.8 + (guard % 3) * 0.05)
        for (let k = 0; k < md.perTick; k++) await bot.waitForTicks(1)
      }
      // the lowest row first; along it, one with a face in sight first, nearest the bot (walking a side)
      // or farthest (from a fixed spot like the pillar top: a near block first hides the ones behind it)
      const depthOf = (p, side) => side === 'S' ? mo.z + md.d - 1 - p.z : side === 'N' ? p.z - mo.z : side === 'E' ? mo.x + md.w - 1 - p.x : side === 'W' ? p.x - mo.x : 0
      // on a side, the deepest blocks first (from that side): a block in front goes in after the ones behind it
      const nextReady = (todo, far = false, side = null) => {
        const me = bot.entity.position
        const ready = todo.filter(b => FACES.some(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz })))
        if (!ready.length) return null
        const lo = Math.min(...ready.map(b => b.y))
        const row = ready.filter(q => q.y === lo)
        const vis = row.filter(inSight)
        const d = (p) => me.distanceTo(new Vec3(p.x + 0.5, p.y, p.z + 0.5))
        const depth = (p) => depthOf(p, side)
        // (from a fixed spot, far: the farthest first, in sight or not yet - it comes into sight at the top of a jump;
        // preferring the ones in sight from mid-jump put a front block in before the one behind it, which it then hid:
        // a forced placement on lapse_statue's pillar top)
        return (vis.length && !far ? vis : row).sort((p, q) => depth(q) - depth(p) || (far ? d(q) - d(p) : d(p) - d(q)))[0]
      }
      // the walk between two sides with blocks (round any empty side between them) is marked mid_walk<n>_a .. _b:
      // with md.walkSpeed the edit plays it faster than the build (midSpeed), so blocks keep appearing every output
      // second (owner r:r478786, lapse_statue: "we pause ... when we're building the second one": a 2-deep statue's
      // walk from its back round to its front was 4.7 s of the recording, 1.6 s of the Short with no block)
      let walkN = 0, walkOpen = false, sideDone = false
      const standFor = (b, side) => {   // in front of it: along the side toward the block, a step in by its depth
        const dp = Math.min(depthOf(b, side), OUT - 1.2)
        return side === 'S' || side === 'N' ? new Vec3(Math.max(mo.x + 1.5, Math.min(mo.x + md.w - 1.5, b.x + 0.5)), mo.y, SPOT[side].z + (side === 'S' ? -dp : dp))
          : new Vec3(SPOT[side].x + (side === 'E' ? -dp : dp), mo.y, Math.max(mo.z + 1.5, Math.min(mo.z + md.d - 1.5, b.z + 0.5)))
      }
      for (const side of SIDES) {
        const todo = mdList.filter(b => (b.side === side || (b.side === 'IN' && side === SIDES[0])) && !b.roof && !b.tower)   // roof and tower rows come after
        if (side !== SIDES[0]) {                             // round the corner, eyes on the next side
          if (sideDone && !walkOpen) { walkN++; walkOpen = true; ctx.mark(`mid_walk${walkN}_a`) }
          await look(mdCenter, 0.15)                         // the build stays in frame (an empty field read as dead)
          await walkTo(CORNER[side], 40)
        }
        if (!todo.length) continue                           // nothing on this side: on round the next corner
        await walkTo(SPOT[side], 40)
        if (walkOpen) { walkOpen = false; ctx.mark(`mid_walk${walkN}_b`) }
        sideDone = true
        while (todo.length && guard++ < 1000) {
          const b = nextReady(todo, false, side)
          if (!b) { ctx.log('mid stuck on side', side, 'with', todo.length, 'left'); break }
          todo.splice(todo.indexOf(b), 1)
          // stay in front of it: slide along the side toward the block
          // (a block deeper in: a step in by its depth, or the first core block was 4.4 away)
          await buildOne(b, standFor(b, side))
        }
      }
      // rows from md.towerY up are out of reach from the ground: the bot towers up beside the build the
      // vanilla way (jump, place a block under itself; md.towerH of them, md.towerSlot), works from the
      // top of the pillar, then digs it back down
      const tall = mdList.filter(b => b.tower)
      if (tall.length) {
        const col = new Vec3(mo.x - 1, mo.y, mo.z + md.d)                 // the column at the front-left corner
        await look(mdCenter, 0.2)
        await walkTo(new Vec3(col.x + 0.5, mo.y, col.z + 0.5), 40)
        steerTo = new Vec3(col.x + 0.5, mo.y, col.z + 0.5)
        ctx.select(md.towerSlot)
        const pillar = []
        for (let k = 0; k < md.towerH; k++) {
          const below = new Vec3(col.x, mo.y - 1 + k, col.z)           // the block the feet stand on
          await look(new Vec3(col.x + 0.5, mo.y + k + 0.02, col.z + 0.5), 0.6)   // straight down at it
          // the crosshair on its top face before the jump (with the turn cap a fixed 2 ticks clicked
          // while still turning down: the first dirt went in under a crosshair on the sand)
          for (let i = 0; i < 60 && !isFace(crossRay(), { x: col.x, y: below.y + 1, z: col.z }, [0, -1, 0, 1]); i++) await bot.waitForTicks(1)   // (until it's there)
          await bot.waitForTicks(1)
          bot.setControlState('jump', true)
          for (let i = 0; i < 12 && bot.entity.position.y < mo.y + k + 1.05; i++) await bot.waitForTicks(1)
          bot.setControlState('jump', false)
          placed.add(key({ x: col.x, y: mo.y + k, z: col.z })); pillar.push({ x: col.x, y: mo.y + k, z: col.z })
          await A.click(below, 1, [0.5, 1, 0.5], { turn: false, max: 3,
            also: () => { ctx.mark('place', { x: col.x, y: mo.y + k, z: col.z }); swing(); ctx.sound(SOUND('dirt'), 1, 0.9) } })
          for (let i = 0; i < 10 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
        }
        steerTo = null
        for (const c of ['forward', 'back', 'left', 'right']) bot.setControlState(c, false)
        while (tall.length && guard++ < 1000) {
          for (let i = 0; i < 14 && !bot.entity.onGround; i++) await bot.waitForTicks(1)   // choose from where it stands
          const b = nextReady(tall, true)
          if (!b) { ctx.log('mid tower rows stuck with', tall.length, 'left'); break }
          tall.splice(tall.indexOf(b), 1)
          await buildOne(b, null)
        }
        // dig back down, block by block (the drops come back to the hotbar)
        for (let i = 0; i < 14 && !bot.entity.onGround; i++) await bot.waitForTicks(1)   // landed before the first dig too
        if (md.digSlot !== undefined) ctx.select(md.digSlot)   // a shovel: the dig-down takes ticks, not seconds of looking at dirt
        for (const q of pillar.reverse()) {
          await look(new Vec3(q.x + 0.5, q.y + 1.02, q.z + 0.5), 0.6)
          // the crosshair on the block before digging it (the first dig started looking at the statue's face)
          for (let i = 0; i < 60; i++) { const h = crossRay(); if (h && h.x === q.x && h.y === q.y && h.z === q.z) break; await bot.waitForTicks(1) }   // (until it's there)
          const bl = bot.blockAt(new Vec3(q.x, q.y, q.z))
          if (bl && bl.name !== 'air') { try { await A.digNow(bl, { turn: false, max: 4 }) } catch (e) { ctx.log('dig failed', e.message) } }
          placed.delete(key(q))
          // fall and land on the next one before digging it (onGround was still true from before the
          // block broke: the next dig started mid-fall, at the airborne x5 dig time)
          for (let i = 0; i < 14 && !(bot.entity.onGround && bot.entity.position.y < q.y + 0.05); i++) await bot.waitForTicks(1)
        }
        // out in front of it for 1:00 (it stood at the pillar's spot, a robe close-up at 1:00)
        if (md.roofY === undefined) { await look(mdCenter, 0.2); await walkTo(SPOT.S.offset(0, 0, Math.max(0, mdTop - 4) * 1.5), 50) }   // further for a tall one
      }
      // a roof (md.roofY and up) goes on from inside, as a player does it: in through the doorway,
      // the edge blocks onto the wall tops with a jump, the middle against their inner faces; then out
      const roof = mdList.filter(b => b.roof)
      if (roof.length) {
        const door = new Vec3(mo.x + (md.door ?? Math.floor(md.w / 2)) + 0.5, mo.y, mo.z + md.d - 1 + 0.5)
        const inside = new Vec3(mo.x + md.w / 2, mo.y, mo.z + md.d / 2)
        // with mid.roofSpeed 'cut' the whole trip (in, the roof, out) is cut: the walk in and out pointed
        // at the floor, spinning, and the ceiling blinked (lapse_house); with a speed, only the roofing
        if (md.roofSpeed === 'cut') ctx.mark('roof_start')
        await look(door.offset(0, 1.2, 0), 0.25)
        await walkTo(new Vec3(door.x, mo.y, mo.z + md.d + 1), 30)
        await walkTo(door, 30)
        await walkTo(inside, 30)
        steerTo = inside
        if (md.roofSpeed !== 'cut') ctx.mark('roof_start')
        // the edge ring first, onto the wall tops, sweeping round (a jump for each, while nothing is
        // overhead yet), then the middle from the outside in against the inward faces, the centre last
        const lx = (b) => b.x - mo.x, lz = (b) => b.z - mo.z
        const edge = (b) => lx(b) === 0 || lx(b) === md.w - 1 || lz(b) === 0 || lz(b) === md.d - 1
        const ang = (b) => Math.atan2(b.x + 0.5 - inside.x, b.z + 0.5 - inside.z)
        const corner = (b) => (lx(b) === 0 || lx(b) === md.w - 1) && (lz(b) === 0 || lz(b) === md.d - 1)
        // the corners first: once an edge neighbour is in, it hides the corner post's top face from inside
        const order = roof.filter(corner).sort((p, q) => ang(p) - ang(q)).concat(roof.filter(b => edge(b) && !corner(b)).sort((p, q) => ang(p) - ang(q)))
          .concat(roof.filter(b => !edge(b)).sort((p, q) => inside.distanceTo(new Vec3(q.x + 0.5, mo.y, q.z + 0.5)) - inside.distanceTo(new Vec3(p.x + 0.5, mo.y, p.z + 0.5))))
        while (order.length && guard++ < 1000) {
          const b = order.find(q => FACES.some(([dx, dy, dz]) => solid({ x: q.x + dx, y: q.y + dy, z: q.z + dz })))
          if (!b) { ctx.log('mid roof stuck with', order.length, 'left'); break }
          order.splice(order.indexOf(b), 1)
          await buildOne(b, inside)
        }
        // eyes down on the doorway before the cut ends (the first frames after it were the dark ceiling
        // point-blank: a two-frame blink, lapse_house)
        await look(door.offset(0, 1, 0), 0.3)
        for (let i = 0; i < 12 && offAim(door.offset(0, 1, 0)) > 8; i++) await bot.waitForTicks(1)
        if (md.roofSpeed !== 'cut') ctx.mark('roof_end')
        await walkTo(door, 30)
        await walkTo(new Vec3(door.x, mo.y, mo.z + md.d + OUT), 30)
        if (md.roofSpeed === 'cut') {                       // back outside, eyes on the roofed cottage, then the cut ends
          await look(mdCenter.offset(0, -0.5, 0), 0.3)
          for (let i = 0; i < 20 && offAim(mdCenter.offset(0, -0.5, 0)) > 6; i++) await bot.waitForTicks(1)
          ctx.mark('roof_end')
        }
      }
      ctx.mark('mid_done')
      ctx.mark('turns_fast_end')
      // back off from the front, the whole build in view at 1:00 (a wall close-up read as nothing)
      // (a tall build: the eye on its middle, the head was above the frame at 1:00)
      await look(mdTop > 4 ? new Vec3(mdCenter.x, mo.y + mdTop * 0.8, mdCenter.z) : mdCenter.offset(0, -0.5, 0), 0.15)   // (its head under the clock at mdTop / 2)
      steerTo = new Vec3(mo.x + md.w / 2, mo.y, mo.z + md.d + OUT + 7 + Math.max(0, mdTop - 4) * 2)    // straight back from the doorway, far enough to frame it all
      await bot.waitForTicks(md.backTicks ?? 10)   // ~0.5 s: longer read as a held reveal
      steerTo = null
      for (const c of ['forward', 'back', 'left', 'right', 'jump', 'sprint']) bot.setControlState(c, false)
      wrong += check(mdList, 'mid')

      // ---- teleport cut: creative, flying on the camera rail ----
      ctx.mark('cut2_a')
      bot.removeListener('physicsTick', aimTick)   // the rail drives the camera from here
      const BG = S.big
      const C = { x: x, y: floor, z: z + BIG_Z }
      const W = (p) => [C.x + 0.5 + p[0], C.y + p[1], C.z + 0.5 + p[2]]
      // every stage gets its own share of the beat (stageTicks), so a big stage can't eat it all
      const T = Object.values(BG.stageTicks).reduce((a, b) => a + b, 0) + 8
      // BG.angles: several steady angles joined by hard cuts (owner r:r66efa4), else one rail through BG.keys + reveal
      const AN = BG.angles ? angleShots(BG.angles, T, S.bigCuts, BG.tail ?? 16) : null
      const keys = AN ? [[0], [AN[AN.length - 1].t1]] : BG.keys.map(([t, p, l]) => [t, W(p), W(l)])
        .concat(BG.reveal.map(([dt, p, l]) => [T + dt, W(p), W(l)]))
      const cam = AN ? (t) => { const a = angleAt(AN, t), c = a.cam(t); return { pos: W(c.pos), look: W(c.look), n: a.n } } : rail(keys)
      await ctx.cmd('/gamemode creative')
      await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 64')   // the flying camera builds from afar
      bot.creative.startFlying()
      const p0 = cam(0).pos
      await ctx.tpCheck(+p0[0].toFixed(3), +(p0[1] - 1.62).toFixed(3), +p0[2].toFixed(3), 0, 0)
      ctx.select(BG.slot)
      const setCam = (t) => {
        const { pos, look: l } = cam(t)
        bot.entity.velocity.set(0, 0, 0)
        bot.entity.position.set(pos[0], pos[1] - 1.62, pos[2])
        const d = [l[0] - pos[0], l[1] - pos[1], l[2] - pos[2]]
        bot.look(Math.atan2(-d[0], -d[2]), Math.atan2(d[1], Math.hypot(d[0], d[2])), true)
      }
      // the rail moves the camera every physics tick, whatever the build loop is doing (a slow
      // pass of /fill commands froze the camera for a tick: duplicate frames)
      let railT0 = null, angleN = 0
      const railTick = () => {
        const t = railT0 === null ? 0 : Math.min(keys[keys.length - 1][0], ctx.tick - railT0)
        // a new angle: a hard cut (the 'cut' mark: render.js snaps, never glides; 'angle': a new shot for the lapse
        // camera-jump check, scripts/lapse_cuts.py), and a /tp so the server has the camera where the client puts it
        const n = cam(t).n || 0
        if (n !== angleN) {
          angleN = n
          const p = cam(t).pos
          ctx.mark('cut'); ctx.mark('angle', { n, name: AN[n].name || null })
          bot.chat(`/tp @s ${p[0].toFixed(3)} ${(p[1] - 1.62).toFixed(3)} ${p[2].toFixed(3)}`)
        }
        setCam(t)
      }
      bot.on('physicsTick', railTick)
      await bot.waitForTicks(3)
      ctx.mark('cut2_b')
      ctx.mark('f1_on')   // a cinematic time-lapse shot: no HUD (edit.py)

      // ---- 1 hour: layer passes, a 3x time-lapse ----
      const big = BG.blocks.map(([bx, by, bz, name, stage]) => ({ x: C.x + bx, y: C.y + 1 + by, z: C.z + bz, name, stage, a: Math.atan2(bx, bz) }))
      // per stage, bottom up; within a layer from the front (the camera's side) round both ways to the
      // back (from the back, the moat read as a thin far line for 2 s)
      // below ground (a moat, a pool) goes top-down, so the surface changes from the first tick
      big.sort((p, q) => p.stage - q.stage || (p.y < C.y + 1 && q.y < C.y + 1 ? q.y - p.y : p.y - q.y) || Math.abs(p.a) - Math.abs(q.a))
      const sched = Array.from({ length: T }, () => [])   // blocks due at each tick
      let t0s = 0
      for (const [stage, ticks] of Object.entries(BG.stageTicks)) {
        const list = big.filter(b => b.stage === +stage)
        list.forEach((b, i) => sched[t0s + Math.floor(i * ticks / list.length)].push(b))
        t0s += ticks
      }
      if (sched.reduce((a, l) => a + l.length, 0) !== big.length) throw new Error('a stage has no tick budget')
      ctx.mark('big_start', { blocks: big.length })
      let next = 0, own = 0, cmds = 0
      const mineSet = new Set()
      railT0 = ctx.tick
      for (let t = 0; t < T - 8; t = ctx.tick - railT0) {
        const batch = sched.slice(next, t + 1).flat(); next = t + 1   // catch up if a pass ran long
        // the bot places the blocks of its own material nearest the camera for real
        const eye = new Vec3(...cam(t).pos)
        const mine = batch.filter(b => b.name === BG.hold).sort((p, q) => eye.distanceTo(new Vec3(p.x, p.y, p.z)) - eye.distanceTo(new Vec3(q.x, q.y, q.z))).slice(0, 2)
          .filter(b => eye.distanceTo(new Vec3(b.x, b.y, b.z)) < 60 && place(b))
        for (const b of mine) mineSet.add(b)
        if (mine.length) { swing(); ctx.sound(SOUND(BG.hold), 1, 0.85 + (t % 3) * 0.08); own += mine.length }
        // the rest: one /fill per run along x of one material in one row
        const rest = batch.filter(b => !mine.includes(b)).sort((p, q) => p.y - q.y || p.z - q.z || p.x - q.x)
        for (let i = 0; i < rest.length;) {
          let j = i
          while (j + 1 < rest.length && rest[j + 1].y === rest[i].y && rest[j + 1].z === rest[i].z && rest[j + 1].name === rest[i].name && rest[j + 1].x === rest[j].x + 1) j++
          const a = rest[i], b = rest[j]
          bot.chat(`/fill ${a.x} ${a.y} ${a.z} ${b.x} ${b.y} ${b.z} ${a.name}`)
          for (let k = i; k <= j; k++) placed.add(key(rest[k]))
          cmds++; i = j + 1
        }
        if (!mine.length && rest.length && t % 2 === 0) { swing(); ctx.sound(SOUND(rest[0].name), 0.7, 0.9) }
        await bot.waitForTicks(1)
      }
      ctx.log('big:', big.length, 'blocks,', own, 'placed by the bot,', cmds, 'fill passes')
      // anything the server refused (a placement out of reach) goes in before the last frame
      let fixed = 0
      for (const b of big) { const bl = bot.blockAt(new Vec3(b.x, b.y, b.z)); if (!bl || bl.name !== b.name) { bot.chat(`/setblock ${b.x} ${b.y} ${b.z} ${b.name}`); if (fixed++ < 5) ctx.log('patch', b.x - C.x, b.y - C.y - 1, b.z - C.z, b.name, 'was', bl && bl.name, own && mineSet.has(b) ? '(bot placement)' : '') } }
      if (fixed) ctx.log('patched', fixed, 'missing blocks')
      while (ctx.tick - railT0 < T) await bot.waitForTicks(1)
      ctx.mark('big_done')
      ctx.sound('ui.toast.challenge_complete', 1, 1)   // the payoff has a sound of its own in the game mix

      // ---- a drift after the payoff (the pull-back itself happens during the last stages) ----
      const end = keys[keys.length - 1][0]
      while (ctx.tick - railT0 < end) await bot.waitForTicks(1)
      bot.removeListener('physicsTick', railTick)
      wrong += check(big, 'big')
      return wrong <= 3 && !ctx.died
    }
  }
}

// the 1-minute round's speed spans: md.speed (default 2x) for the build; with md.walkSpeed, the walks between its
// sides (mid_walk<n>_a .. _b, one per pair of consecutive sides with blocks, as setup marks them) at that speed
function midWalks (md) {
  const sideOf = (bx, bz) => md.oneSide ? md.oneSide : bz === md.d - 1 ? 'S' : bz === 0 ? 'N' : bx === md.w - 1 ? 'E' : bx === 0 ? 'W' : 'IN'
  const has = new Set(md.blocks.filter(b => !(md.roofY !== undefined && b[1] >= md.roofY) && !(md.towerY !== undefined && b[1] >= md.towerY)).map(b => sideOf(b[0], b[2])))
  const ALL = ['E', 'N', 'W', 'S']
  const first = Math.max(0, ALL.findIndex(sd => has.has(sd)))
  return Math.max(0, ALL.slice(first).filter((sd, i) => i === 0 || has.has(sd)).length - 1)
}
function midSpeed (md) {
  const sp = md.speed || 2
  const n = md.walkSpeed ? midWalks(md) : 0
  if (!n) return midTail([['mid_start', 'mid_done', sp]], md)
  const out = []
  let a = 'mid_start'
  for (let i = 1; i <= n; i++) { out.push([a, `mid_walk${i}_a`, sp], [`mid_walk${i}_a`, `mid_walk${i}_b`, md.walkSpeed]); a = `mid_walk${i}_b` }
  out.push([a, 'mid_done', sp])
  return midTail(out, md)
}
// md.tail = [FROM, FACTOR]: the end of the 1-minute round from FROM (e.g. 'mid_done:-1.65', after the last scaffold
// break) plays at FACTOR (r:r188b46: nothing new happens there; lapse_rocket held 1.2 s after its last break)
function midTail (spans, md) {
  if (!md.tail) return spans
  const last = spans[spans.length - 1]
  return spans.slice(0, -1).concat([[last[0], md.tail[0], last[2]], [md.tail[0], 'mid_done', md.tail[1]]])
}

// S.bigCuts = [EVERY, GAP, UPTO]: jump cuts through the 1-hour round, one every EVERY scene seconds dropping GAP
// seconds (up to UPTO s after big_start), the clock jumping with them. At 3x a build with no cut for 5+ s read as
// dead air (pace: lapse_statue 5.7 s, lapse_rocket 3.4 s); a cut every ~1.6 s of output keeps it moving.
function bigSpeed (c) {
  if (!c) return [['big_start', 'big_done', 3]]
  const [every, gap, upto] = c, out = []
  const at = (x) => x ? `big_start:${+x.toFixed(2)}` : 'big_start'
  let a = 0
  for (let t = every; t + gap <= upto; t += every) { out.push([at(a), at(t), 3], [at(t), at(t + gap), 'cut']); a = t + gap }
  out.push([at(a), 'big_done', 3])
  return out
}

// S.big.angles: the 1-hour round from several clearly different steady angles, joined by hard cuts (owner r:r66efa4,
// 2026-11-11: "we should have more angles when we're showing the last thing"), e.g. a low front three-quarter, a side,
// a close detail, a high wide, then 2-3 for the finished build's showcase.
//   [[at, [pos0, look0], [pos1, look1], name], ...]: the angle starts at tick `at` of the build (the first at 0) and
//   moves in a straight line at an even speed from pos0/look0 to pos1/look1 by the next angle's start (the last one by
//   T + tail, the drift after 60:00). Local coordinates, as big.keys. Within an angle the move is slow and steady, so
//   across the bigCuts jump cuts it carries on (r:r200cfe: <= 6 deg, 3 blocks, 1.5 up/down a jump cut).
//   An `at` within 30 ticks of a bigCuts gap moves to the gap's middle: the change of angle hides in the dropped time.
// -> [{ n, name, t0, t1, cam(t) -> { pos, look } }]
function angleShots (angles, T, bigCuts, tail = 16) {
  const gaps = []
  if (bigCuts) { const [every, gap, upto] = bigCuts; for (let t = every; t + gap <= upto; t += every) gaps.push([t * 20, (t + gap) * 20]) }
  const snap = (at) => {
    if (!at) return 0
    const g = gaps.map(([a, b]) => [a, b, Math.abs((a + b) / 2 - at)]).sort((p, q) => p[2] - q[2])[0]
    return g && (at >= g[0] - 30 && at <= g[1] + 30) ? Math.round((g[0] + g[1]) / 2) : at
  }
  const starts = angles.map(a => snap(a[0]))
  for (let i = 1; i < starts.length; i++) if (!(starts[i] > starts[i - 1])) throw new Error(`big.angles: angle ${i} starts at ${starts[i]}, not after ${starts[i - 1]}`)
  const end = T + tail
  return angles.map(([, [p0, l0], [p1, l1], name], n) => {
    const t0 = starts[n], t1 = n + 1 < starts.length ? starts[n + 1] : end
    const lerp = (a, b, u) => a.map((v, j) => v + (b[j] - v) * u)
    return { n, name, t0, t1, cam: (t) => { const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))); return { pos: lerp(p0, p1, u), look: lerp(l0, l1, u) } } }
  })
}
const angleAt = (AN, t) => { let a = AN[0]; for (const x of AN) if (t >= x.t0) a = x; return a }

module.exports = { makeStunt, rail, midSpeed, midWalks, angleShots, angleAt }
