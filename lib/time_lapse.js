// "building a ___ in 1 second vs 1 minute vs 1 hour 💀": three builds of the same subject, each
// with a big clock running to its time (edit.clock), cut together with teleport cuts (edit.speed
// "cut" spans drop the wait around each teleport).
//   1 second: a sad little build, placed for real in real time (20 ticks).
//   1 minute: a decent build, placed block by block for real (survival placements on a face of
//             something solid), shown as a 2x time-lapse.
//   1 hour:   something huge, rising layer by layer as a 3x time-lapse. The bot (creative, flying
//             on a camera rail) places the blocks nearest it for real and /fill row passes lay the
//             rest, a few rows per tick, so it reads as building, never popping in. It ends on a
//             pull-back that shows the huge build behind the two small ones.
// A subject module gives the three plans (lib/time_lapse.js makeStunt).
//
// Layout around the spawn point (x, floor, z), everything facing south (+z) toward the camera:
//   small build: front row at z-5, centred on x-4.5 (bot at z-0.5)
//   mid build:   footprint x+2..x+6, front wall at z-4 (bot at z+3.5)
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
//            reveal (keys after the build, ticks after done; the second last is 'revealed') },
//   hotbar: [...]
// }
function makeStunt (S) {
  const BIG_Z = -45
  return {
    name: S.name,
    biome: process.env.BIOME || 'minecraft:plains',
    caption: S.caption,
    edit: {
      caption: S.caption, red: S.red,
      song: 'songs/funk_abnormal.mp3', dropAt: 'big_done',
      startAt: 'small_start:-0.3', endAfter: 'revealed:0.9',
      speed: [['cut1_a', 'cut1_b', 'cut'], ['mid_start', 'mid_done', 2], ['cut2_a', 'cut2_b', 'cut'], ['big_start', 'big_done', 3]],
      clock: [['small_start', 'small_done', 1, '1 SECOND'], ['mid_start', 'mid_done', 60, '1 MINUTE'], ['big_start', 'big_done', 3600, '1 HOUR']]
    },

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      if (!g) throw new Error('no dry land')
      const { x, z, y: floor } = g
      this.x = x; this.z = z; this.floor = floor
      await ctx.defaultRules()
      await ctx.cmd('/gamerule random_tick_speed 0')   // no ice on the moat, no grass dying under the fresh fills
      // a big cleared field: the castle site, the two small plots and the reveal camera's foreground
      const X0 = x - 70, X1 = x + 70, Z0 = z - 92, Z1 = z + 62
      // the far corners can be outside the chunks the server has loaded yet ("That position is not
      // loaded" and the whole /fill fails): keep the field loaded
      await ctx.cmd(`/forceload add ${X0} ${Z0} ${X1} ${Z1}`)
      for (let i = 0; i < 40 && !bot.blockAt(new ctx.Vec3(X1, floor, Z1)); i++) await bot.waitForTicks(5)
      await bot.waitForTicks(20)
      for (let y0 = floor + 1; y0 <= floor + 56; y0++) await ctx.cmd(`/fill ${X0} ${y0} ${Z0} ${X1} ${y0} ${Z1} air`)
      await ctx.cmd(`/fill ${X0} ${floor} ${Z0} ${X1} ${floor} ${Z1} grass_block`)
      for (let y0 = floor - 4; y0 < floor; y0++) await ctx.cmd(`/fill ${X0} ${y0} ${Z0} ${X1} ${y0} ${Z1} dirt`)
      await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 64')
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
      let aim = null
      const look = async (target, k = 0.3) => {
        aim = aim ? aim.plus(target.minus(aim).scaled(k)) : target
        const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
        await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
      }
      let lastSwing = -99
      const swing = () => { if (bot.time.age - lastSwing >= 6) { bot.swingArm(); lastSwing = bot.time.age } }   // one continuous swing loop
      // a real survival placement on a face of something solid; false if nothing to click
      const place = (b) => {
        const f = FACES.find(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz }))
        if (!f) return false
        const [dx, dy, dz, face] = f
        bot._client.write('block_place', { hand: 0, location: { x: b.x + dx, y: b.y + dy, z: b.z + dz }, direction: face,
          cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        placed.add(key(b))
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
      for (let i = 0; i < 4; i++) { await look(smCenter, 0.15); await bot.waitForTicks(1) }
      ctx.mark('small_start')
      // exactly 20 ticks, on the tick counter (a slow loop pass can't stretch it)
      const every = Math.floor(19 / sm.length), t0 = ctx.tick
      let j = 0
      while (ctx.tick - t0 < 20) {
        const el = ctx.tick - t0
        while (j < sm.length && el >= j * every) {
          const b = sm[j]
          if (bot.quickBarSlot !== S.small.slots[b.name]) ctx.select(S.small.slots[b.name])
          if (place(b)) { swing(); ctx.sound(SOUND(b.name), 1, 0.9 + (j % 3) * 0.05) }
          j++
        }
        const tgt = sm[Math.min(sm.length - 1, Math.max(0, j - 1))]
        await look(new Vec3(tgt.x + 0.5, tgt.y + 0.5, tgt.z + 0.5), 0.35)
        await bot.waitForTicks(1)
      }
      ctx.mark('small_done')
      // a look at it: a slow push and a tilt (no still frames)
      for (let i = 0; i < 16; i++) { await look(smCenter.offset(0.6 * Math.sin(i / 5), 0, 0), 0.12); await bot.waitForTicks(1) }
      wrong += check(sm, 'small')

      // ---- teleport cut ----
      ctx.mark('cut1_a')
      const md = S.mid
      const mo = { x: x + 2, y: floor + 1, z: z - 4 - (md.d - 1) }
      const mdCenter = new Vec3(mo.x + md.w / 2, mo.y + 1.8, mo.z + md.d / 2)
      await ctx.tpCheck(mo.x + md.w / 2, floor + 1, z + 3.5, 180, 15)
      aim = null
      const mdList = md.blocks.map(([bx, by, bz, name]) => ({ x: mo.x + bx, y: mo.y + by, z: mo.z + bz, name }))
      ctx.select(md.slots[mdList[0].name])
      await look(new Vec3(mdList[0].x + 0.5, mdList[0].y + 0.5, mdList[0].z + 0.5))
      await bot.waitForTicks(3)
      ctx.mark('cut1_b')

      // ---- 1 minute: block by block for real, a 2x time-lapse in the edit ----
      ctx.mark('mid_start')
      const todo = mdList.slice().sort((a, b) => a.y - b.y || b.z - a.z || a.x - b.x)
      const used = {}
      let guard = 0
      while (todo.length && guard++ < 1000) {
        const i = todo.findIndex(b => FACES.some(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz })))
        if (i < 0) { ctx.log('mid stuck with', todo.length, 'blocks left'); break }
        const b = todo.splice(i, 1)[0]
        used[b.name] = (used[b.name] || 0) + 1
        let slot = md.slots[b.name]
        if (Array.isArray(slot)) slot = slot[Math.floor((used[b.name] - 1) / 64)]     // next stack once one runs out
        if (bot.quickBarSlot !== slot) ctx.select(slot)
        await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5), 0.2)
        place(b); swing()
        ctx.sound(SOUND(b.name), 1, 0.8 + (guard % 3) * 0.05)
        for (let k = 0; k < md.perTick; k++) { await bot.waitForTicks(1); await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5), 0.2) }
      }
      ctx.mark('mid_done')
      for (let i = 0; i < 14; i++) { await look(mdCenter, 0.12); await bot.waitForTicks(1) }
      wrong += check(mdList, 'mid')

      // ---- teleport cut: creative, flying on the camera rail ----
      ctx.mark('cut2_a')
      const BG = S.big
      const C = { x: x, y: floor, z: z + BIG_Z }
      const W = (p) => [C.x + 0.5 + p[0], C.y + p[1], C.z + 0.5 + p[2]]
      // every stage gets its own share of the beat (stageTicks), so a big stage can't eat it all
      const T = Object.values(BG.stageTicks).reduce((a, b) => a + b, 0) + 8
      const keys = BG.keys.map(([t, p, l]) => [t, W(p), W(l)])
        .concat(BG.reveal.map(([dt, p, l]) => [T + dt, W(p), W(l)]))
      const cam = rail(keys)
      await ctx.cmd('/gamemode creative')
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

      // ---- 1 hour: layer passes, a 3x time-lapse ----
      const big = BG.blocks.map(([bx, by, bz, name, stage]) => ({ x: C.x + bx, y: C.y + 1 + by, z: C.z + bz, name, stage, a: Math.atan2(bx, bz) }))
      // per stage, bottom up; within a layer sweep around the centre starting nearest the camera
      big.sort((p, q) => p.stage - q.stage || p.y - q.y || p.a - q.a)
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

      // ---- the reveal: pull back over the castle to the two small builds in front of it ----
      const end = keys[keys.length - 1][0]
      const settle = T + BG.reveal[BG.reveal.length - 2][0]
      while (ctx.tick - railT0 < settle) await bot.waitForTicks(1)
      ctx.mark('revealed')
      while (ctx.tick - railT0 < end) await bot.waitForTicks(1)
      bot.removeListener('physicsTick', railTick)
      wrong += check(big, 'big')
      return wrong <= 3 && !ctx.died
    }
  }
}

module.exports = { makeStunt, rail }
