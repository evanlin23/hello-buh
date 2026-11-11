// The "logic" format (family `logic`; docs/formats.md, STANDARDS r:r40f7c7): rapid REAL vanilla 1.21 quirks back to
// back under one caption ("minecraft logic 💀"). Each quirk is a small station on real terrain: the player is already
// facing it, does one survival action (a dig, a place, a use), the quirk pays off with its own sound and a short label,
// and a hard cut (a /tp, the frames between dropped by the edit) jumps to the next. Every quirk must be true vanilla
// (the minecraft-audit skill); commands only build the stations.
//
// A new episode is a list of quirks: makeLogic({ name, caption, red, quirks: [Q, ...] }). The last quirk is the payoff
// (the drop, a dip + impact, a flash; the Short ends 0.6 s after everything has settled: endAfter 'settle:0.6').
//   Q.key      a short id (marks: q<n> its payoff, s<n> its first frame, e<n> its last)
//   Q.label    the label shown from its payoff to the cut (1-6 words, no emoji)
//   Q.build(L) the station, in its local frame (below): L.fill / L.set / L.cmd (await them)
//   Q.start    { x, y, z, pitch } where the player stands (local; default 0.5, 1, 0.5), facing local north
//   Q.slot     the hotbar slot held at the start
//   Q.perform(ctx, L)  the action and its payoff: call L.quirk() on the frame the quirk shows (once)
//   Q.hold     ticks kept after the payoff before the cut (default 22: ~1.1 s to read the label and see the result)
//   Q.edit     extra edit pieces for this quirk: { speed: [[a, b, 'cut']] } (a fuse cut out), { subs: [...] } (a set-up line)
// The hotbar (episode.hotbar) is shared by every quirk; each quirk selects its slot before its first frame.
//
// Local frame of a station: the ground block is y 0, feet y 1; the player looks along local -z ("north"). Stations sit
// in two rows facing away from each other, so no other station is ever in a shot's background:
//   row 0: local = world offsets from the station's centre, the camera looks north (-z)
//   row 1: rotated 180 degrees, the camera looks south (+z)
// Each station's pad is levelled to the site's ground (x -7..7, z -10..5; air above to y 24) and the terrain outside
// it is left as it was.
const sets = require('./sets')

const GAP = 26          // blocks between stations along a row
const ROWGAP = 48       // between the two rows
const DRIFT = 0.0075       // rad a tick: the hold's drift (~8.6 deg/s; the scene lint's "nobody moves" is under ~0.007)
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
const PAD = { x0: -7, x1: 7, z0: -10, z1: 5, up: 24, down: 8 }

function station (O, row) {
  const s = row ? -1 : 1
  // row 1 is the mirror image through the station's centre column: local cell c -> world cell O - c, and a local
  // point p -> O + 1 - p (so a cell's centre c + 0.5 lands on the world cell's centre)
  const wx = (x) => O.x + s * x, wz = (z) => O.z + s * z
  const px = (x) => row ? O.x + 1 - x : O.x + x, pz = (z) => row ? O.z + 1 - z : O.z + z
  const box = (x0, z0, x1, z1) => [Math.min(wx(x0), wx(x1)), Math.min(wz(z0), wz(z1)), Math.max(wx(x0), wx(x1)), Math.max(wz(z0), wz(z1))]
  return {
    O, row, s,
    drift: 1,
    w: (x, y, z) => ({ x: wx(x), y: O.y + y, z: wz(z) }),     // a local block cell -> its world cell
    p: (x, y, z) => ({ x: px(x), y: O.y + y, z: pz(z) }),     // a local point -> a world point
    box
  }
}

function logicEdit ({ caption, red, quirks, extra = {} }) {
  const N = quirks.length, last = `q${N - 1}`
  const speed = [], subs = [], sfx = [['pop', 's0', { gain: 1.0 }]]
  quirks.forEach((q, n) => {
    if (n > 0) speed.push([`e${n - 1}`, `s${n}`, 'cut'])
    if (q.label) subs.push([`q${n}`, q.label, n === N - 1 ? 3 : 1.4, 0])
    if (n < N - 1) sfx.push(['pop', `q${n}`, { gain: 0.45 }])
    if (q.edit && q.edit.speed) speed.push(...q.edit.speed)
    if (q.edit && q.edit.subs) subs.push(...q.edit.subs)
  })
  sfx.push(['dip', last, 0.4], ['impact', last, { gain: 1.4 }])   // a hit the NCS bed can't bury (mixcheck)
  return {
    caption, red, startAt: 's0:-0.05', endAfter: 'settle:0.6', dropAt: last,
    speed, subs, flash: [[last, 0, 0.4]], punch: [[last, 0, 1.06]], sfx,
    ...extra, ...(extra.sfx ? { sfx: [...sfx, ...extra.sfx] } : {})
  }
}

function makeLogic (ep) {
  const quirks = ep.quirks
  const N = quirks.length
  const perRow = Math.ceil(N / 2)
  return {
    name: ep.name,
    biome: process.env.BIOME || ep.biome || 'minecraft:plains',
    caption: ep.caption,
    time: ep.time ?? 6000,
    hideHand: false,
    lerpMobs: true,
    edit: logicEdit({ caption: ep.caption, red: ep.red, quirks, extra: ep.edit || {} }),

    async setup (ctx) {
      const { bot } = ctx
      await ctx.defaultRules()
      for (const c of ['/difficulty peaceful', '/gamerule random_tick_speed 0', '/gamerule fire_spread_radius_around_player 0',
        '/gamerule block_drops false', '/gamerule fall_damage false', '/gamerule keep_inventory true']) await ctx.cmd(c)
      await ctx.cmd('/kill @e[type=!player]')
      const W = (perRow - 1) * GAP + 16, D = ROWGAP + 16
      const site = await sets.findSite(ctx, { w: W, d: D, maxRange: 4, maxTrees: 0.35, reach: 160 })
      const p = bot.entity.position.floored()
      const c = site || { x: p.x, z: p.z, y: (ctx.findLand(p.x, p.z) || p).y }
      const x0 = c.x - (perRow - 1) * GAP / 2, z0 = c.z - ROWGAP / 2
      await ctx.forceload({ x0: x0 - 16, z0: z0 - 16, x1: x0 + (perRow - 1) * GAP + 16, z1: z0 + ROWGAP + 16 })
      const F = c.y
      this.stations = quirks.map((q, n) => {
        const row = n < perRow ? 0 : 1, i = row ? n - perRow : n
        // each pad at its own ground (the median under it and the view beyond it): one site level cut row 1's pads
        // 6 blocks into a hillside on take 8, a flat stone wall behind every shot
        const ox = x0 + i * GAP, oz = z0 + (row ? ROWGAP : 0), sg = row ? 1 : -1
        const g = sets.ground ? sets.ground(ctx, { x0: ox - 7, x1: ox + 7, z0: Math.min(oz, oz + sg * 18), z1: Math.max(oz, oz + sg * 18) }, 0.5) : null
        const S = station({ x: ox, y: g ?? F, z: oz }, row)
        S.drift = n % 2 ? -1 : 1
        return S
      })
      for (let n = 0; n < N; n++) {
        const S = this.stations[n], L = this.L = local(ctx, S), F = S.O.y
        // the pad: air above, grass on top, dirt under (fills dips), on the site's ground level
        const [ax, az, bx, bz] = S.box(PAD.x0, PAD.z0, PAD.x1, PAD.z1)
        for (let y = F + 1; y <= F + PAD.up; y += 8) await ctx.cmd(`/fill ${ax} ${y} ${az} ${bx} ${Math.min(F + PAD.up, y + 7)} ${bz} air`)
        await ctx.cmd(`/fill ${ax} ${F - PAD.down} ${az} ${bx} ${F - 1} ${bz} dirt`)
        await ctx.cmd(`/fill ${ax} ${F} ${az} ${bx} ${F} ${bz} grass_block`)
        await quirks[n].build(L)
        ctx.log(`logic: station ${n} ${quirks[n].key} at ${S.O.x} ${S.O.y} ${S.O.z} row ${S.row}`)
      }
      await ctx.cmd('/kill @e[type=item]')
      await ctx.hotbar(ep.hotbar)
      await this.goTo(ctx, 0)
      await ctx.cmd('/gamemode survival')
      await bot.waitForTicks(20)
      const w = this.stations[0].p(0.5, 1, 0.5)
      return { x: w.x, y: w.y, z: w.z }
    },

    // stand at quirk n's start, facing its local north, its slot in hand (a /tp: the harness marks the cut)
    async goTo (ctx, n) {
      const q = quirks[n], S = this.stations[n], st = { x: 0.5, y: 1, z: 0.5, pitch: 10, ...(q.start || {}) }
      const w = S.p(st.x, st.y, st.z)
      // inside the cut: no mob left anywhere else (a zombie burning on a hill 76 blocks out died during take 5's ending,
      // and its death moved the settle mark 2 s late); the last station's golem and such go too
      if (n > 0) await ctx.cmd('/kill @e[type=!player,distance=12..]', { mayFail: true })
      ctx.select(q.slot ?? 0)
      await ctx.tpCheck(w.x, w.y, w.z, S.row ? 0 : 180, st.pitch)
    },

    async perform (ctx) {
      const { bot } = ctx
      const A = require('./act')(ctx)
      for (let n = 0; n < N; n++) {
        const q = quirks[n], S = this.stations[n]
        if (n > 0) await this.goTo(ctx, n)
        await bot.waitForTicks(2)
        const L = local(ctx, S, A)
        let paid = false
        L.quirk = (extra = {}) => { if (!paid) { paid = true; ctx.mark(`q${n}`, { key: q.key, ...extra }) } }
        ctx.mark(`s${n}`, { key: q.key })
        await q.perform(ctx, L)
        if (!paid) throw new Error(`logic: quirk ${q.key} never paid off (L.quirk)`)
        if (n < N - 1) {
          await L.hold(q.hold ?? 22)
          ctx.mark(`e${n}`)
          await bot.waitForTicks(2)
        }
      }
      return true
    }
  }
}

// the helpers a quirk gets, in its station's local frame
function local (ctx, S, A = null) {
  const { bot, Vec3 } = ctx
  const w = (x, y, z) => S.w(x, y, z)
  const at = (x, y, z) => { const p = S.p(x, y, z); return new Vec3(p.x, p.y, p.z) }
  const blockPos = (x, y, z) => { const p = w(x, y, z); return new Vec3(p.x, p.y, p.z) }
  const L = {
    S, A,
    at,             // a local POINT -> a world Vec3 (look targets, positions)
    pos: blockPos,  // a local BLOCK cell -> its world block position (digs, places, uses)
    mid: (x, y, z) => { const p = blockPos(x, y, z); return new Vec3(p.x + 0.5, p.y + 0.5, p.z + 0.5) },
    block: (x, y, z) => bot.blockAt(blockPos(x, y, z)),
    async fill (x0, y0, z0, x1, y1, z1, b) {
      const a = w(x0, y0, z0), c = w(x1, y1, z1)
      await ctx.cmd(`/fill ${Math.min(a.x, c.x)} ${Math.min(a.y, c.y)} ${Math.min(a.z, c.z)} ${Math.max(a.x, c.x)} ${Math.max(a.y, c.y)} ${Math.max(a.z, c.z)} ${b}`)
    },
    async set (x, y, z, b) { const p = w(x, y, z); await ctx.cmd(`/setblock ${p.x} ${p.y} ${p.z} ${b}`) },
    cmd: (c, o) => ctx.cmd(c, o),
    // walk backwards up to `ticks`, eyes on `look`, stopping before fire or lava behind (a blast's random fire round the
    // player: take 4 backed into it) as well as anything solid (A.back's own guard). -> ticks walked
    async backOff (ticks, look) {
      const bad = /^(fire|soul_fire|lava)$/
      let k = 0
      for (; k < ticks; k++) {
        const e = bot.entity, bx = Math.sin(e.yaw), bz = Math.cos(e.yaw)   // backwards (mineflayer yaw 0 looks -z)
        const hot = [0.5, 1.0].some(d => [0, 1, -1].some(dy => {
          const b = bot.blockAt(e.position.offset(bx * d, 0.2 + dy * 0.5, bz * d))
          return b && bad.test(b.name)
        }))
        if (hot) break
        if (!(await A.back(1, { look }))) break
      }
      return k
    },
    // sneak forward up to `ticks`, eyes on `look`: the walk up to a payoff to see it (sneaking stops at an edge, as in
    // vanilla, so it never walks into a pool or a crater). -> ticks walked
    async approach (ticks, look) {
      bot.setControlState('sneak', true)
      bot.setControlState('forward', true)   // motion-ok: a sneak (vanilla stops it at every edge), eyes governed below
      let k = 0
      try {
        for (; k < ticks; k++) { await A.view(require('./act').aimAngles(bot.entity.position.offset(0, 1.27, 0), look)); await bot.waitForTicks(1) }
      } finally {
        bot.setControlState('forward', false)   // motion-ok: releasing the key
        bot.setControlState('sneak', false)
      }
      return k
    },
    // keep the shot alive for some ticks: with `to` (a world Vec3: L.at / L.mid) a governed turn toward it, and once
    // there (or without one) a slow drift of ~4 deg/s, so no hold reads as a frozen frame (rec_check 'held': under
    // 2.5 deg/s with nothing moving) and every cut's edges stay far under the whip line (30 deg/s); o.drift: rad a tick
    // (the last shot's hold: 0.009, the scene lint's "nobody moves" line is ~0.0075)
    async hold (ticks, to = null, o = {}) {
      let there = !to
      for (let k = 0; k < ticks; k++) {
        const y = bot.entity.yaw, p = bot.entity.pitch
        let aim = null
        if (!there) {   // turn onto `to`; once there, only the drift (re-aiming would cancel it out)
          const a = require('./act').aimAngles(bot.entity.position.offset(0, 1.62, 0), to)
          if (Math.hypot(wrap(a.yaw - y), a.pitch - p) > 0.03) aim = a; else there = true
        }
        await A.view(aim || { yaw: y + (o.drift ?? DRIFT) * S.drift, pitch: p })
        await bot.waitForTicks(1)
      }
    }
  }
  return L
}

module.exports = { makeLogic, logicEdit, GAP, ROWGAP }
