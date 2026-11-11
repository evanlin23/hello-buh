// Mega build, time-lapse variant (format "mega", owner 2026-11-11, r:r4449f0: "this gimmick is like ridiculous
// megabuild"): an understated request in the caption ("spawn just needs a small fountain"), then a drone time-lapse of
// an absurd city rising around it, ending on the full reveal. The build is placed with server /fill commands (lib/mega.js),
// spread over the recording a step at a time so every frame shows new structure (r:r478786), and filmed from several
// steady drone angles joined by hard cuts (the time-lapse rule r:r66efa4): each stage of the build gets its own angle.
// The payoff stage lands in one tick on the cut to the wide reveal (flash, punch, a dip and an impact on the music).
//
// An episode gives the content only:
//   const L = require('../lib/mega_lapse')
//   module.exports = L.makeLapse({
//     name: 'mega_lapse_x', caption: 'spawn just needs a small fountain',
//     stages: [{ name: 'fountain', ticks: 22, cells: [[x, y, z, block, step], ...], boxes: [{ box, block, step }] }, ...],
//     shots: { close: { path, lookPath, fov, ... } },        // lib/movie camera specs, local to the build's centre
//     angles: [['fountain', 'close'], ['walls', 'inner'], ...],   // [stage it starts on, shot]: a hard cut there
//     payoff: { stage: 'lights', shot: 'reveal', hold: 26 }, // the last stage, in one tick, on the reveal cut
//   })
// Time: stage ticks and shot keyframes are in OUTPUT time (20 ticks a second of the Short); the recording runs S.speed
// (default 2) times longer and the edit plays the build back S.speed x, so the server gets half the commands a tick.
// Local coordinates: x/z from the build's centre (the field's middle), y = 0 the ground's top layer (a plaza replaces
// it), 1 the first block above. A stage's cells are grouped by `step` (default y): each step is one moment of the
// lapse (a layer of a wall, a ring of a plaza, a house), compressed to the fewest /fill boxes (mega.runs) and the steps
// spread evenly over the stage's ticks. A step whose boxes don't fit the per-tick budget spills into the next ticks.
// Dry run (no server): node lib/mega_lapse.js stunts/<name>.js -> commands per stage and the busiest tick.
const mega = require('./mega')
const M = require('./movie')

// ------------------------------------------------------------------ shape kit (local cells [x, y, z, block, step])
const kit = {
  // a filled disc / ring of radius r0..r1 (cell centres) at height y
  ring (out, r0, r1, y, block, step) {
    const R = Math.ceil(r1)
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) { const d = Math.hypot(x, z); if (d >= r0 && d <= r1) out.push([x, y, z, block, step ?? y]) }
    return out
  },
  // a round tower at (cx, cz): a wall of radius r (1 thick) from y0 to y1, a window band every `win` layers, a cone
  // roof above it (`roof`, h layers), and an optional tip
  tower (out, cx, cz, r, y0, y1, { wall = 'smooth_quartz', base = 'stone_bricks', glass = 'light_blue_stained_glass', roof = 'dark_prismarine', roofH = Math.round(r * 1.6), tip = null, win = 6, step = null } = {}) {
    const R = Math.ceil(r + 1)
    for (let y = y0; y <= y1; y++) {
      for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
        const d = Math.hypot(x, z)
        if (d > r + 0.5 || d < r - 0.7) continue
        const band = win && (y - y0) % win === win - 2 && (Math.abs(x) < r * 0.4 || Math.abs(z) < r * 0.4)
        out.push([cx + x, y, cz + z, y - y0 < 2 ? base : band ? glass : wall, step ? step(y) : y])
      }
    }
    // a corbel ring, then the cone
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) { const d = Math.hypot(x, z); if (d <= r + 1.2) out.push([cx + x, y1 + 1, cz + z, d > r + 0.3 ? base : wall, step ? step(y1 + 1) : y1 + 1]) }
    for (let k = 0; k < roofH; k++) {
      const rr = (r + 1) * (1 - k / roofH), y = y1 + 2 + k
      for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) if (Math.hypot(x, z) <= rr + 0.2) out.push([cx + x, y, cz + z, roof, step ? step(y) : y])
    }
    if (tip) for (let k = 0; k < 3; k++) out.push([cx, y1 + 2 + roofH + k, cz, tip, step ? step(y1 + 2 + roofH + k) : y1 + 2 + roofH + k])
    return out
  },
  // a house: w x d footprint at (x0, z0) (min corner) on floor y0, h high, a stone base course, windows, a stepped
  // hip roof; all one step (it pops in as one moment) unless step is a function of y
  house (out, x0, z0, w, d, y0, h, { wall = 'smooth_quartz', base = 'stone_bricks', glass = 'light_blue_stained_glass', roof = 'dark_prismarine', step = 0 } = {}) {
    const st = (y) => typeof step === 'function' ? step(y) : step
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
        const ex = x === x0 || x === x0 + w - 1, ez = z === z0 || z === z0 + d - 1
        if (!ex && !ez) continue
        const corner = ex && ez
        const win = !corner && y === y0 + 1 + Math.floor((h - 2) / 2) && ((ex ? z - z0 : x - x0) % 2 === 1)
        out.push([x, y, z, y === y0 ? base : win ? glass : wall, st(y)])
      }
    }
    for (let k = 0; ; k++) {
      const ax0 = x0 - 1 + k, ax1 = x0 + w - k, az0 = z0 - 1 + k, az1 = z0 + d - k
      if (ax0 > ax1 || az0 > az1) break
      for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) out.push([x, y0 + h + k, z, roof, st(y0 + h + k)])
    }
    return out
  },
  // a square ring (an axis-aligned wall around the centre) of half-size a0..a1, from y0 to y1: 4 boxes a layer
  squareRing (boxes, a0, a1, y0, y1, block, step) {
    for (let y = y0; y <= y1; y++) {
      const s = step ? step(y) : y
      boxes.push({ box: [-a1, y, -a1, a1, y, -a0], block, step: s }, { box: [-a1, y, a0, a1, y, a1], block, step: s },
        { box: [-a1, y, -a0 + 1, -a0, y, a0 - 1], block, step: s }, { box: [a0, y, -a0 + 1, a1, y, a0 - 1], block, step: s })
    }
    return boxes
  }
}

// ------------------------------------------------------------------ the schedule
// A stage -> its steps in order, each [{ box, block }] (boxes in local coordinates)
function steps (stage) {
  const by = new Map()
  const add = (s, item) => { if (!by.has(s)) by.set(s, { cells: [], boxes: [] }); by.get(s)[item.box ? 'boxes' : 'cells'].push(item.box ? item : item) }
  for (const c of stage.cells || []) add(c[4] ?? c[1], c)
  for (const b of stage.boxes || []) add(b.step ?? b.box[1], b)
  return [...by.keys()].sort((a, b) => a - b).map(k => {
    const g = by.get(k)
    return g.boxes.map(b => ({ box: b.box, block: b.block })).concat(mega.runs(g.cells))
  })
}

// Every stage on the tick clock: -> { at: [[tick, stageName, step boxes]], stageAt: { name: tick }, total, payoff }
function schedule (S) {
  const out = [], stageAt = {}, k = S.speed || 1
  let t = 0
  for (const st of S.stages) {
    stageAt[st.name] = t
    const list = steps(st)
    if (st.name === S.payoff.stage) { out.push([t, st.name, list.flat()]); continue }
    list.forEach((boxes, i) => out.push([t + Math.floor(i * st.ticks * k / list.length), st.name, boxes]))
    t += st.ticks * k
  }
  return { at: out, stageAt, total: t }
}

// The commands each tick actually sends, with the per-tick budget (spill-over carried on): -> [{ tick, cmds: [[box, block, stage]] }]
function plan (S) {
  const sc = schedule(S), per = S.perTick || 40
  const due = new Map()
  for (const [t, name, boxes] of sc.at) { if (!due.has(t)) due.set(t, []); for (const b of boxes) due.get(t).push([b.box, b.block, name]) }
  const ticks = [], last = Math.max(...due.keys())
  let queue = []
  for (let t = 0; t <= last || queue.length; t++) {
    const now = due.get(t) || []
    // the payoff stage goes out whole, on its tick (it must land on the cut)
    const pay = now.length && now[0][2] === S.payoff.stage
    queue = queue.concat(now)
    const n = pay ? queue.length : Math.min(per, queue.length)
    ticks.push({ tick: t, cmds: queue.slice(0, n) })
    queue = queue.slice(n)
  }
  // the running count of blocks in the build after each tick (the "blocks used" overlay, r:rce78c5): every cell a
  // non-air box fills, counted once (a later box painting over an earlier one adds nothing)
  const seen = new Set()
  let count = 0
  for (const tk of ticks) {
    for (const [b, block] of tk.cmds) {
      if (block === 'air') continue
      for (let x = b[0]; x <= b[3]; x++) for (let y = b[1]; y <= b[4]; y++) for (let z = b[2]; z <= b[5]; z++) {
        const key = ((x + 1024) * 2048 + (y + 256)) * 2048 + (z + 1024)
        if (!seen.has(key)) { seen.add(key); count++ }
      }
    }
    tk.count = count
  }
  return { ticks, stageAt: sc.stageAt, total: sc.total, blocks: count }
}

const SOUND = (n) => /grass|dirt/.test(n) ? 'block.grass.place' : /wool/.test(n) ? 'block.wool.place' : /glass|lantern/.test(n) ? 'block.glass.place' : /water/.test(n) ? null : /gold|copper|iron/.test(n) ? 'block.metal.place' : 'block.stone.place'

// ------------------------------------------------------------------ the stunt
function makeLapse (S) {
  S = { speed: 2, ...S }
  const P = plan(S)
  // the shots are written in output seconds: their keyframes stretch to the recording's (the build plays S.speed x)
  const k = S.speed
  const shots = {}
  for (const [name, sh] of Object.entries(S.shots)) {
    const q = { ...sh }
    if (name !== S.payoff.shot && !(S.outro || []).some(o => o.shot === name)) for (const f of ['path', 'lookPath']) if (q[f]) q[f] = q[f].map(([t, ...r]) => [t * k, ...r])
    shots[name] = q
  }
  // half-size of the cleared, flattened field: one number (a square) or [x, z]
  const [FX, FZ] = Array.isArray(S.field) ? S.field : [S.field || 112, S.field || 112]
  const HEIGHT = S.height || 96       // cleared up to this many blocks above the ground
  return {
    name: S.name,
    biome: S.biome || 'minecraft:plains',
    near: S.near,
    time: S.time ?? 11300,
    renderDistance: S.renderDistance || 12, recordRadius: S.recordRadius || 200,
    botTimeout: S.botTimeout || 900,
    eyeTrace: false,                  // a drone montage: every cut is a deliberate jump to a new angle
    ...(S.chunkStops ? { chunkStops: (set) => S.chunkStops.map(([x, z]) => ({ x: set.x + x, z: set.z + z })) } : {}),
    look: S.look,
    shots,
    lapsePlan: P,
    edit: {
      caption: S.caption, red: S.red,
      ...(S.captions ? { captions: S.captions } : {}),
      dropAt: 'reveal',               // (no reference song: publish adds the NCS bed with its drop on the reveal)
      startAt: 'build_start:0', endAfter: S.outro ? `${S.outro[S.outro.length - 1].mark}:${S.endAfter ?? 1.0}` : `reveal:${S.endAfter ?? 1.0}`,
      ...(S.tally ? { tally: { event: 'blocks', label: S.tally === true ? 'blocks used' : S.tally, done: 'reveal' } } : {}),
      // the time-lapse: the build plays S.speed x (clouds and all); the reveal and its drift play at 1x
      speed: [['build_start', 'reveal', k]],
      flash: [['reveal', 0, 0.5]], punch: [['reveal', 0, 1.08]],
      // the payoff needs a real hit on the final mix (mixcheck): the bed dips under it, an impact on it
      sfx: [['dip', 'reveal', 0.4], ['impact', 'reveal', { gain: 1.3 }]],
      ...(S.edit || {})
    },

    async setup (ctx) {
      const { bot, Vec3 } = ctx
      await ctx.defaultRules()
      await ctx.cmd('/gamerule random_tick_speed 0')       // nothing grows, spreads or melts on the fresh fills
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      if (!g) throw new Error('no dry land near spawn')
      const X = g.x, Z = g.z, F = g.y
      Object.assign(this, { X, Z, F })
      ctx.log(`city centre ${X} ${F} ${Z}`)
      const T = 16                                         // the taper: rings stepping up to the land around
      await ctx.forceload({ x0: X - FX - T - 8, z0: Z - FZ - T - 8, x1: X + FX + T + 8, z1: Z + FZ + T + 8 })
      for (let i = 0; i < 60 && !bot.blockAt(new Vec3(X + FX, F, Z + FZ)); i++) await bot.waitForTicks(5)
      // clear the field (whole columns at once: no sand left hanging), then the ground: dirt under a grass top
      for (const b of mega.split([X - FX, F + 1, Z - FZ, X + FX, F + HEIGHT, Z + FZ])) await ctx.cmd(`/fill ${b.join(' ')} air`, { mayFail: true })
      // the edge steps up to the land around like a hillside (ring k cleared down to F + 1.3k), and where the land is
      // lower the field steps down to it the same way, not a cut cliff or a slab over a valley
      for (let k = 1; k <= T; k++) {
        const a = FX + k, c = FZ + k, hi = F + Math.ceil(k * 1.3), lo = F - Math.ceil(k * 1.3)
        for (const [x0, z0, x1, z1] of [[-a, -c, a, -c], [-a, c, a, c], [-a, -c, -a, c], [a, -c, a, c]]) {
          bot.chat(`/fill ${X + x0} ${hi} ${Z + z0} ${X + x1} ${F + HEIGHT} ${Z + z1} air`)
          for (const what of ['air', 'water']) bot.chat(`/fill ${X + x0} ${lo - 1} ${Z + z0} ${X + x1} ${lo} ${Z + z1} grass_block replace ${what}`)
          await bot.waitForTicks(1)
        }
      }
      for (const b of mega.split([X - FX, F - 5, Z - FZ, X + FX, F - 1, Z + FZ])) await ctx.cmd(`/fill ${b.join(' ')} dirt`, { mayFail: true })
      for (const b of mega.split([X - FX, F, Z - FZ, X + FX, F, Z + FZ])) await ctx.cmd(`/fill ${b.join(' ')} grass_block`, { mayFail: true })
      // `clearTrees: n`: the trees within n blocks of the taper go (no tree cut in half at the field's edge, no leaves
      // left hanging over it); the forest beyond stays for scale
      if (S.clearTrees) {
        const m = T + S.clearTrees
        for (const what of ['#minecraft:leaves', '#minecraft:logs']) for (const b of mega.split([X - FX - m, F - 4, Z - FZ - m, X + FX + m, F + HEIGHT, Z + FZ + m])) {
          bot.chat(`/fill ${b.join(' ')} air replace ${what}`); await bot.waitForTicks(1)
        }
      }
      await ctx.cmd('/kill @e[type=!player]', { mayFail: true })    // animals, falling blocks and drops on the field
      // plains biome over the field (no cold-biome water or grass tint at the edge of the site)
      const g4 = (v) => Math.floor(v / 4) * 4
      for (let bx = g4(X - FX); bx <= X + FX; bx += 64) for (let bz = g4(Z - FZ); bz <= Z + FZ; bz += 64) for (let by = g4(F - 8); by <= F + HEIGHT; by += 8) {
        bot.chat(`/fillbiome ${bx} ${by} ${bz} ${bx + 63} ${by + 7} ${bz + 63} ${S.fieldBiome || 'minecraft:plains'}`); await bot.waitForTicks(1)
      }
      // the bot (the drone's pilot) waits in a sealed room under the plaza, out of every shot; creative: no fall, no
      // suffocation, and op for the /fill commands. The server keeps every chunk of the city loaded around it.
      // `player: { at: [x, z], yaw, pitch }`: the bot stands on the field instead, in every shot for scale (r:rf8524b)
      await ctx.cmd('/gamemode creative')
      if (S.player) await ctx.tpCheck(X + S.player.at[0] + 0.5, F + 1, Z + S.player.at[1] + 0.5, S.player.yaw || 0, S.player.pitch || 0)
      else {
        await ctx.cmd(`/fill ${X - 1} ${F - 14} ${Z - 1} ${X + 1} ${F - 12} ${Z + 1} air`)
        await ctx.tpCheck(X + 0.5, F - 14, Z + 0.5, 0, 0)
      }
      await bot.waitForTicks(60)
      return { x: X, y: F, z: Z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { X, Z, F } = this
      const cmd = (box, block) => `/fill ${X + box[0]} ${F + box[1]} ${Z + box[2]} ${X + box[3]} ${F + box[4]} ${Z + box[5]} ${block}`
      const angleAt = new Map(S.angles.map(([stage, shot]) => [P.stageAt[stage], shot]))
      const payT = P.stageAt[S.payoff.stage]
      const sent = []                                     // [tick, box, block] for the end check
      let soundT = -9
      const t0 = ctx.tick
      // shot 1 is up before the first block (the hook: the caption and blocks landing from frame 1)
      M.shot(ctx, angleAt.get(0)); ctx.mark('angle', { n: 0, name: angleAt.get(0) })
      ctx.mark('build_start')
      let n = 0
      for (const { tick, cmds } of P.ticks) {
        while (ctx.tick - t0 < tick) await bot.waitForTicks(1)
        if (tick === payT) {
          // anything the server dropped goes back in before the reveal (a lost chat command is silent)
          let fixed = 0
          for (const [, box, block] of sent) {
            const b = bot.blockAt(new Vec3(X + box[3], F + box[4], Z + box[5]))
            if (b && b.name !== block && block !== 'water') { bot.chat(cmd(box, block)); fixed++ }
          }
          if (fixed) ctx.log(`re-sent ${fixed} boxes before the reveal`)
          M.shot(ctx, S.payoff.shot); ctx.mark('angle', { n: ++n, name: S.payoff.shot }); ctx.mark('reveal')
          ctx.sound(S.payoff.sound || 'block.beacon.activate', 1, 1)
          ctx.sound('ui.toast.challenge_complete', 0.8, 1)
        } else if (angleAt.has(tick) && tick) { M.shot(ctx, angleAt.get(tick)); ctx.mark('angle', { n: ++n, name: angleAt.get(tick) }) }
        for (const [box, block, stage] of cmds) { bot.chat(cmd(box, block)); if (stage !== S.payoff.stage) sent.push([tick, box, block]) }
        // the blocks-used count (edit.tally): a mark whenever it moved, every other tick at most (and on the reveal)
        if (S.tally && cmds.length && (tick === payT || tick - (this._tallyT ?? -9) >= 2 || tick === P.ticks.length - 1)) { ctx.mark('blocks', { n: P.ticks[tick].count }); this._tallyT = tick }
        // the build's sound: a place every 2-3 ticks while blocks land (the stall check counts block sounds)
        const s = cmds.length && SOUND(cmds[0][1])
        if (s && tick !== payT && tick - soundT >= 2 + (tick % 2)) { ctx.sound(s, 0.55, 0.8 + ((tick * 7) % 5) * 0.06); soundT = tick }
      }
      ctx.mark('build_done')
      if (S.tally) ctx.mark('blocks', { n: P.blocks })
      await bot.waitForTicks(S.payoff.hold ?? 30)
      // `outro: [{ shot, mark, ticks, sound, at }]`: shots after the reveal at 1x (a close pass beside the player,
      // r:rf8524b), each a hard cut with its own mark; `at(ctx)` runs on the cut (the player looks up, a sound)
      for (const o of S.outro || []) {
        M.shot(ctx, o.shot); ctx.mark('angle', { n: ++n, name: o.shot }); ctx.mark(o.mark)
        if (o.at) await o.at(ctx, this)
        await bot.waitForTicks(o.ticks)
      }
      // the check: each box's last cell holds the block of the LAST box sent over that cell (later boxes paint over
      // earlier ones: a face's white on an orange head)
      let bad = 0
      const last = new Map()
      for (const [, box] of sent) {
        const [x, y, z] = box.slice(3)
        let want = null
        for (const [, b, blk] of sent) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]) want = blk
        last.set(box.slice(3).join(','), want)
      }
      // (the payoff stage's own blocks overwrite some of them on purpose: lanterns on a parapet)
      for (const { cmds } of P.ticks) for (const [box, , stage] of cmds) if (stage === S.payoff.stage) {
        for (const k of [...last.keys()]) { const [x, y, z] = k.split(',').map(Number); if (x >= box[0] && x <= box[3] && y >= box[1] && y <= box[4] && z >= box[2] && z <= box[5]) last.delete(k) }
      }
      for (const [k, block] of last) {
        const [x, y, z] = k.split(',').map(Number)
        const b = bot.blockAt(new Vec3(X + x, F + y, Z + z))
        if (b && b.name !== block && block !== 'water') { bad++; if (bad < 6) ctx.log('wrong', x, y, z, block, '->', b.name) }
      }
      ctx.log(`mega lapse: ${sent.length} boxes, ${last.size - bad}/${last.size} box corners right`)
      ctx.mark('end')
      return bad < 20
    }
  }
}

module.exports = { makeLapse, kit, steps, schedule, plan }

if (require.main === module) {
  const st = require(require('path').resolve(process.argv[2] || 'stunts/mega_lapse_fountain.js'))
  const P = st.lapsePlan
  const by = {}
  let busiest = 0
  for (const { cmds } of P.ticks) { busiest = Math.max(busiest, cmds.length); for (const c of cmds) by[c[2]] = (by[c[2]] || 0) + 1 }
  console.log(`${st.name}: ${P.ticks.length} ticks (${(P.ticks.length / 20).toFixed(1)} s), ${P.ticks.reduce((a, t) => a + t.cmds.length, 0)} commands, busiest tick ${busiest}`)
  for (const [k, v] of Object.entries(by)) console.log(`  ${k.padEnd(12)} at tick ${String(P.stageAt[k]).padStart(4)}: ${v} commands`)
  const empty = []
  let run = 0
  for (const { tick, cmds } of P.ticks) { if (!cmds.length) run++; else { if (run >= 10) empty.push(`${tick - run}-${tick}`); run = 0 } }
  console.log('ticks with nothing for 10+ ticks:', empty.join(', ') || 'none')
}
