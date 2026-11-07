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
//   mid:   { blocks, w, d, slots, perTick (ticks per block) },
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
    renderDistance: S.renderDistance, recordRadius: S.recordRadius,   // wide shots (render.js, harness)
    biome: process.env.BIOME || S.biomeSearch || 'minecraft:plains',   // where the harness looks for the site
    caption: S.caption,
    edit: {
      caption: S.caption, red: S.red,
      song: 'songs/funk_abnormal.mp3', dropAt: 'big_done',
      // the payoff is the big build completing (60:00 and the drop): the camera's pull-back lands on
      // it, and the Short ends 0.8 s later with the camera still moving (the song's drop gets a moment
      // before the fade-out)
      startAt: 'small_start:-0.1', endAfter: S.endAfter || 'big_done:0.8',
      // a roof put on from inside plays faster (mid.roofSpeed): the camera is under a dark ceiling there
      speed: [['cut1_a', 'cut1_b', 'cut']].concat(S.mid.roofY !== undefined
        ? [['mid_start', 'roof_start', S.mid.speed || 2], ['roof_start', 'roof_end', S.mid.roofSpeed || 8], ['roof_end', 'mid_done', S.mid.speed || 2]]
        : [['mid_start', 'mid_done', S.mid.speed || 2]], [['cut2_a', 'cut2_b', 'cut'], ['big_start', 'big_done', 3]]),
      clock: [['small_start', 'small_done', 1, '1 SECOND'], ['mid_start', 'mid_done', 60, '1 MINUTE'], ['big_start', 'big_done', 3600, '1 HOUR']]
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
      const X0 = x - 120, X1 = x + 120, Z0 = z - 125, Z1 = z + 115
      const ZM = z - 5                                     // fills in two halves: 241 x 121 under the 32768 cap
      const fill = async (y0, y1, block) => { for (const [a, b] of [[Z0, ZM], [ZM + 1, Z1]]) { bot.chat(`/fill ${X0} ${y0} ${a} ${X1} ${y1} ${b} ${block}`); await bot.waitForTicks(2) } }   // the bot's 180 s attempt budget
      // the far corners can be outside the chunks the server has loaded yet ("That position is not
      // loaded" and the whole /fill fails): keep the field loaded
      const TAPER = 20                                     // a stepped slope down to the field, not a sheer cut cliff
      for (const [a, b] of [[Z0 - TAPER, ZM], [ZM + 1, Z1 + TAPER]]) await ctx.cmd(`/forceload add ${X0 - TAPER} ${a} ${X1 + TAPER} ${b}`)   // 256 chunks a command at most
      for (let i = 0; i < 40 && !bot.blockAt(new ctx.Vec3(X1, floor, Z1)); i++) await bot.waitForTicks(5)
      await bot.waitForTicks(20)
      // top down: cleared bottom-up, gravel and sand fell back onto the field as heaps
      for (let y0 = floor + 56; y0 >= floor + 1; y0--) await fill(y0, y0, 'air')
      // the edge: ring k blocks out is cleared down to floor + 1.3k, so the terrain beyond steps down
      // to the field like a hillside instead of standing as a cut wall
      for (let k = 1; k <= TAPER; k++) {
        const h = floor + Math.ceil(k * 1.3), top = floor + 56
        for (const box of [[X0 - k, Z0 - k, X1 + k, Z0 - k], [X0 - k, Z1 + k, X1 + k, Z1 + k], [X0 - k, Z0 - k, X0 - k, Z1 + k], [X1 + k, Z0 - k, X1 + k, Z1 + k]]) {
          bot.chat(`/fill ${box[0]} ${h} ${box[1]} ${box[2]} ${top} ${box[3]} air`); await bot.waitForTicks(1)
        }
      }
      await ctx.cmd('/kill @e[type=!player]')            // falling blocks, and mobs of the old biome (polar bears on plains)
      await fill(floor, floor, F.top)
      for (let y0 = floor - 4; y0 < floor; y0++) await fill(y0, y0, F.under)
      // plains all over: the site can border a cold biome, whose water is navy (the moat) and whose
      // grass and sky differ; the harness re-sends the chunks before recording, with the new biomes
      // (tiles on the 4-block biome grid: /fillbiome rounds a box out to whole cells, and 64x64x8 off-grid was 38025)
      const g4 = (v) => Math.floor(v / 4) * 4
      for (let bx = g4(X0); bx <= X1; bx += 64) for (let bz = g4(Z0); bz <= Z1; bz += 64) for (let by = g4(floor - 4); by <= floor + 52; by += 8) {
        bot.chat(`/fillbiome ${bx} ${by} ${bz} ${bx + 63} ${by + 7} ${bz + 63} ${F.biome}`); await bot.waitForTicks(1)
      }
      await ctx.hotbar(S.hotbar)
      await ctx.tpCheck(x - 4.5, floor + 1, z - 0.5, 180, 25)
      await ctx.cmd('/gamemode survival')
      ctx.select(S.small.slots[S.small.blocks[0][3]])
      await bot.waitForTicks(20)
      return { x, y: floor, z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { x, z, floor } = this
      const placed = new Set()
      const key = (p) => `${p.x},${p.y},${p.z}`
      const solid = (p) => { if (placed.has(key(p))) return true; const b = bot.blockAt(new Vec3(p.x, p.y, p.z)); return !!(b && b.boundingBox === 'block') }
      // the camera eases toward aimTarget on every physics tick, so a slow loop pass never freezes
      // the shot for a tick (duplicate frames); look() only sets the target
      let aim = null, aimTarget = null, aimK = 0.3
      let steerTo = null   // walk toward this spot (strafing, whatever way the camera faces)
      const aimTick = () => {
        if (steerTo) {
          const p = bot.entity.position, dx = steerTo.x - p.x, dz = steerTo.z - p.z, yw = bot.entity.yaw
          const f = -Math.sin(yw) * dx - Math.cos(yw) * dz, r = Math.cos(yw) * dx - Math.sin(yw) * dz
          bot.setControlState('forward', f > 0.25); bot.setControlState('back', f < -0.25)
          bot.setControlState('right', r > 0.25); bot.setControlState('left', r < -0.25)
        }
        if (!aimTarget) return
        aim = aim ? aim.plus(aimTarget.minus(aim).scaled(aimK)) : aimTarget
        const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
        bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
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
      const supportOf = (b) => {
        const eye = bot.entity.position.offset(0, 1.62, 0)
        const ok = FACES.filter(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz }))
        const pt = (f) => new Vec3(b.x + 0.5 + f[0] * 0.5, b.y + 0.5 + f[1] * 0.5, b.z + 0.5 + f[2] * 0.5)
        const faces = (f) => eye.minus(pt(f)).dot(new Vec3(-f[0], -f[1], -f[2])) > 0.05   // the clicked face points at the eye
        const below = ok.find(f => f[1] === -1)
        if (below && faces(below)) return below
        const side = ok.filter(f => f[1] === 0 && faces(f)).sort((f, g) => eye.distanceTo(pt(f)) - eye.distanceTo(pt(g)))[0]
        return side || below || ok[0] || FACES[0]
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
        bot._client.write('block_place', { hand: 0, location: { x: b.x + dx, y: b.y + dy, z: b.z + dz }, direction: face,
          cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        placed.add(key(b))
        ctx.mark('place', { x: b.x, y: b.y, z: b.z })   // client prediction: the block and the stack count change this tick (render.js, edit.py)
        return true
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
      for (let i = 0; i < 4; i++) { await look(facePoint(sm[0]), 0.4); await bot.waitForTicks(1) }   // the crosshair on the first block's spot
      ctx.mark('small_start')
      // exactly 20 ticks, on the tick counter (a slow loop pass can't stretch it)
      const every = Math.floor(20 / sm.length), t0 = ctx.tick
      let j = 0
      while (ctx.tick - t0 < 20) {
        const el = ctx.tick - t0
        while (j < sm.length && el >= j * every) {
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
      const mdCenter = new Vec3(mo.x + md.w / 2, mo.y + 1, mo.z + md.d / 2)
      // survival-legal: the bot walks round the build and works each side from ~2 blocks out (within
      // vanilla reach, on faces it can see), jumping for rows above its eye
      const sideOf = (bx, bz) => bz === md.d - 1 ? 'S' : bz === 0 ? 'N' : bx === md.w - 1 ? 'E' : 'W'
      const OUT = 2.6
      const SPOT = {
        S: new Vec3(mo.x + md.w / 2, mo.y, mo.z + md.d + OUT), E: new Vec3(mo.x + md.w + OUT, mo.y, mo.z + md.d / 2),
        N: new Vec3(mo.x + md.w / 2, mo.y, mo.z - OUT), W: new Vec3(mo.x - OUT, mo.y, mo.z + md.d / 2)
      }
      const CORNER = { N: new Vec3(mo.x + md.w + OUT, mo.y, mo.z - OUT), W: new Vec3(mo.x - OUT, mo.y, mo.z - OUT), S: new Vec3(mo.x - OUT, mo.y, mo.z + md.d + OUT) }
      // east, north, west, then the front last: it ends in front of the doorway and steps straight back
      await ctx.tpCheck(+SPOT.E.x.toFixed(2), floor + 1, +SPOT.E.z.toFixed(2), 90, 10)
      aim = null; aimTarget = null
      const mdList = md.blocks.map(([bx, by, bz, name]) => ({ x: mo.x + bx, y: mo.y + by, z: mo.z + bz, name, side: sideOf(bx, bz), roof: md.roofY !== undefined && by >= md.roofY, tower: md.towerY !== undefined && by >= md.towerY }))
      const firstSlot = md.slots[mdList[0].name]
      ctx.select(Array.isArray(firstSlot) ? firstSlot[0] : firstSlot)
      await look(new Vec3(mo.x + md.w - 0.5, mo.y + 0.5, mo.z + md.d / 2))   // the east side, built first
      await bot.waitForTicks(3)
      ctx.mark('cut1_b')

      // ---- 1 minute: block by block for real, a time-lapse in the edit ----
      ctx.mark('mid_start')
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
        const fp = facePoint(b)
        await look(fp, 0.5)
        if (steer) steerTo = steer
        // a top face above the eye is only in view from the top of a jump (a side face is in view from
        // below; jumping for those under a roof put the head where the block goes and the server refused it)
        const topFace = Math.abs(fp.y - Math.round(fp.y)) < 1e-6 && fp.y === b.y
        if (topFace && fp.y + 0.3 > bot.entity.position.y + 1.62) {
          bot.setControlState('jump', true)
          for (let i = 0; i < 12 && bot.entity.position.y + 1.62 < fp.y + 0.35; i++) await bot.waitForTicks(1)
          bot.setControlState('jump', false)
        }
        // arrive first: within reach of the face (corner merlons went in from 5.1 blocks), crosshair on it
        const eyeTo = (q) => bot.entity.position.offset(0, 1.62, 0).distanceTo(q)
        for (let i = 0; i < 16 && (eyeTo(fp) > 4.2 || offAim(fp) > 2.5); i++) await bot.waitForTicks(1)
        place(b); swing()
        ctx.sound(SOUND(b.name), 1, 0.8 + (guard % 3) * 0.05)
        for (let k = 0; k < md.perTick; k++) await bot.waitForTicks(1)
      }
      const nextReady = (todo) => {   // the lowest row first; along it, the block nearest the bot
        const me = bot.entity.position
        const ready = todo.filter(b => FACES.some(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz })))
        if (!ready.length) return null
        const lo = Math.min(...ready.map(b => b.y))
        return ready.filter(q => q.y === lo).sort((p, q) => me.distanceTo(new Vec3(p.x + 0.5, p.y, p.z + 0.5)) - me.distanceTo(new Vec3(q.x + 0.5, q.y, q.z + 0.5)))[0]
      }
      for (const side of ['E', 'N', 'W', 'S']) {
        const todo = mdList.filter(b => b.side === side && !b.roof && !b.tower)   // roof and tower rows come after
        if (side !== 'E') {                                  // round the corner, eyes on the next side
          await look(mdCenter, 0.15)                         // the build stays in frame (an empty field read as dead)
          await walkTo(CORNER[side], 40)
        }
        await walkTo(SPOT[side], 40)
        while (todo.length && guard++ < 1000) {
          const b = nextReady(todo)
          if (!b) { ctx.log('mid stuck on side', side, 'with', todo.length, 'left'); break }
          todo.splice(todo.indexOf(b), 1)
          // stay in front of it: slide along the side toward the block
          await buildOne(b, side === 'S' || side === 'N' ? new Vec3(Math.max(mo.x + 1.5, Math.min(mo.x + md.w - 1.5, b.x + 0.5)), mo.y, SPOT[side].z)
            : new Vec3(SPOT[side].x, mo.y, Math.max(mo.z + 1.5, Math.min(mo.z + md.d - 1.5, b.z + 0.5))))
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
          await bot.waitForTicks(2)
          bot.setControlState('jump', true)
          for (let i = 0; i < 12 && bot.entity.position.y < mo.y + k + 1.05; i++) await bot.waitForTicks(1)
          bot.setControlState('jump', false)
          bot._client.write('block_place', { hand: 0, location: { x: below.x, y: below.y, z: below.z }, direction: 1,
            cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
          placed.add(key({ x: col.x, y: mo.y + k, z: col.z })); pillar.push({ x: col.x, y: mo.y + k, z: col.z })
          ctx.mark('place', { x: col.x, y: mo.y + k, z: col.z }); swing(); ctx.sound(SOUND('dirt'), 1, 0.9)
          for (let i = 0; i < 10 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
        }
        steerTo = null
        for (const c of ['forward', 'back', 'left', 'right']) bot.setControlState(c, false)
        while (tall.length && guard++ < 1000) {
          const b = nextReady(tall)
          if (!b) { ctx.log('mid tower rows stuck with', tall.length, 'left'); break }
          tall.splice(tall.indexOf(b), 1)
          await buildOne(b, null)
        }
        // dig back down, block by block (the drops come back to the hotbar)
        for (const q of pillar.reverse()) {
          await look(new Vec3(q.x + 0.5, q.y + 1.02, q.z + 0.5), 0.6)
          await bot.waitForTicks(3)
          const bl = bot.blockAt(new Vec3(q.x, q.y, q.z))
          if (bl && bl.name !== 'air') { try { await bot.dig(bl, 'ignore') } catch (e) { ctx.log('dig failed', e.message) } }
          placed.delete(key(q))
          for (let i = 0; i < 12 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
        }
      }
      // a roof (md.roofY and up) goes on from inside, as a player does it: in through the doorway,
      // the edge blocks onto the wall tops with a jump, the middle against their inner faces; then out
      const roof = mdList.filter(b => b.roof)
      if (roof.length) {
        const door = new Vec3(mo.x + (md.door ?? Math.floor(md.w / 2)) + 0.5, mo.y, mo.z + md.d - 1 + 0.5)
        const inside = new Vec3(mo.x + md.w / 2, mo.y, mo.z + md.d / 2)
        await look(door.offset(0, 1.2, 0), 0.25)
        await walkTo(new Vec3(door.x, mo.y, mo.z + md.d + 1), 30)
        await walkTo(door, 30)
        await walkTo(inside, 30)
        steerTo = inside
        ctx.mark('roof_start')
        // the edge ring first, onto the wall tops, sweeping round (a jump for each, while nothing is
        // overhead yet), then the middle from the outside in against the inward faces, the centre last
        const lx = (b) => b.x - mo.x, lz = (b) => b.z - mo.z
        const edge = (b) => lx(b) === 0 || lx(b) === md.w - 1 || lz(b) === 0 || lz(b) === md.d - 1
        const ang = (b) => Math.atan2(b.x + 0.5 - inside.x, b.z + 0.5 - inside.z)
        const order = roof.filter(edge).sort((p, q) => ang(p) - ang(q))
          .concat(roof.filter(b => !edge(b)).sort((p, q) => inside.distanceTo(new Vec3(q.x + 0.5, mo.y, q.z + 0.5)) - inside.distanceTo(new Vec3(p.x + 0.5, mo.y, p.z + 0.5))))
        while (order.length && guard++ < 1000) {
          const b = order.find(q => FACES.some(([dx, dy, dz]) => solid({ x: q.x + dx, y: q.y + dy, z: q.z + dz })))
          if (!b) { ctx.log('mid roof stuck with', order.length, 'left'); break }
          order.splice(order.indexOf(b), 1)
          await buildOne(b, inside)
        }
        ctx.mark('roof_end')
        await look(door.offset(0, 1, 0), 0.3)
        await walkTo(door, 30)
        await walkTo(new Vec3(door.x, mo.y, mo.z + md.d + OUT), 30)
      }
      ctx.mark('mid_done')
      // back off from the front, the whole build in view at 1:00 (a wall close-up read as nothing)
      await look(mdCenter.offset(0, -0.5, 0), 0.15)
      steerTo = new Vec3(mo.x + md.w / 2, mo.y, mo.z + md.d + OUT + 7)    // straight back from the doorway, far enough to frame it all
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
      const keys = BG.keys.map(([t, p, l]) => [t, W(p), W(l)])
        .concat(BG.reveal.map(([dt, p, l]) => [T + dt, W(p), W(l)]))
      const cam = rail(keys)
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
      let railT0 = null
      const railTick = () => { setCam(railT0 === null ? 0 : Math.min(keys[keys.length - 1][0], ctx.tick - railT0)) }
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

module.exports = { makeStunt, rail }
