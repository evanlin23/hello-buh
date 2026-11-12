// "POV: your job is filling end portals" (~40 s): a row of empty end portal rings on a field. The bot
// works them like a shift worker, within vanilla reach. It stands in the middle of a ring and puts
// eyes of ender into 11 frames, turning round the ring (real block_place with the eye, vanilla fill
// sound, the look held on each frame until its eye shows). Then it backs out over the south frame and
// puts the 12th eye in from outside: the portal opens in front of it (the server builds the
// end_portal blocks). A jump cut to the next ring, and again, faster each time: seven rings (from the
// fifth, the hop out is cut too). Eyes stack to 16, so it runs through six stacks. Then the next empty
// ring, and the camera cranes up off his head: a sea of empty rings out to the horizon (every patch of
// level grass for ~150 blocks round, set up from one template ring) - IT NEVER ENDS (owner r:r4607fa,
// 2026-11-12: the borderline Shorts get one bigger last beat; noop audit: "end on a sea of portal rings to the horizon").
const RINGS = 12   // 7 to fill, 5 more waiting
const { openSpots, clearPlants } = require('./_site')
const M = require('../lib/movie')
const PLANT = /^(short_grass|tall_grass|fern|large_fern|dandelion|poppy|bush|leaf_litter|wildflowers|firefly_bush|pink_petals|sweet_berry_bush)$|flower|tulip|orchid|allium|azure|oxeye|cornflower|lily_of/
const SEA = 150   // the sea of empty rings: every 8 blocks (a fixed grid: a retry lands on the same cells) within SEA of the set's middle
// each shift faster: the turn to the next frame (ms), then the look held on it while the eye goes in
// (ticks: the eye shows once the server's update is back, 2-3 ticks after the click)
// in whole ticks (easeLook rounds ms to ticks, at least 1: 110/90/75 all played the same): with the look
// held 3 ticks after the click (the eye shows a tick or two later: the look must still be on its frame),
// an eye every 9, 8, 7, 6, 5, 4 ticks, the last ring 3 (a 2-tick hold at its top speed)
// the last two rings flick straight onto each frame (ms -1: no ease) and hold 4 and 3 ticks: the look
// stays on the frame past the eye showing (a 1-tick ease + 2-tick hold left as the eye came in)
const FILL = [{ ms: 300, hold: 3 }, { ms: 250, hold: 3 }, { ms: 200, hold: 3 }, { ms: 150, hold: 3 }, { ms: 100, hold: 3 }, { ms: -1, hold: 3 }, { ms: -1, hold: 2 }]   // the flicks settle a tick on the frame before the click
const N = FILL.length

module.exports = {
  name: 'end_portal_job',
  botTimeout: 480,   // the site search and set-up alone take 1-2 min: the default 180 s killed every attempt
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: your job is filling end portals',
  recordRadius: 200, renderDistance: 10,   // the sea out to the fog
  // the ending: a crane up and back off his head (facing north, at the spare ring) to ~30 up: the empty rings to the horizon
  // the way with the most rings (north, east, south or west: perform picks it), the crane backing off the other way
  shots: {
    sea_n: { crane: { from: 'pov', to: { of: 'self', offset: [0, 30, 26] }, yaw: 0, pitch: -30, fov: 70, secs: 2.6 } },
    sea_e: { crane: { from: 'pov', to: { of: 'self', offset: [-26, 30, 0] }, yaw: -90, pitch: -30, fov: 70, secs: 2.6 } },
    sea_s: { crane: { from: 'pov', to: { of: 'self', offset: [0, 30, -26] }, yaw: 180, pitch: -30, fov: 70, secs: 2.6 } },
    sea_w: { crane: { from: 'pov', to: { of: 'self', offset: [26, 30, 0] }, yaw: 90, pitch: -30, fov: 70, secs: 2.6 } }
  },
  edit: {
    caption: 'POV: your job is filling end portals', red: 'job', song: null, dropAt: 'portal', startAt: 'start:0', endAfter: 'sea:1.4',
    // the song drops out 0.4 s before the outro card and an impact lands the cut to the next empty ring (pace: no sound hit
    // on the payoff). The 2026-11-11 package also drops the game 18 dB over those 0.4 s (the portal's hum covered the hit);
    // edit.py has no game dip yet
    // (since 2026-11-11 in the edit itself: 'gamedip' ducks the game over the same 0.4 s, and a louder impact)
    // (the hit and the card moved to 'sea', 1.2 s into the crane, as the sea of rings comes into view)
    sfx: [['dip', 'sea', 0.4], ['gamedip', 'sea', 0.4], ['impact', 'sea', { gain: 1.4 }]],
    subsY: 0.15,   // up in the sky, off the frames being filled
    subs: [['ring', 'getting faster', 1.6, 1], ['ring', 'speedrun', 1.6, 2], ['ring', 'world record pace', 1.6, 3], ['ring', 'overtime', 1.6, 4], ['ring', 'double shift', 1.6, 5], ['ring', 'no breaks', 1.6, 6]],
    cards: [['sea', 'IT NEVER ENDS 💀', 1.4, 'red']],
    punch: [['sea', 0, 1.08]], flash: [['sea', 0, 0.4]],   // a zoom punch and a white flash on the reveal: the picture changes on the hit (pace)
    // the speedrun timer (owner request, 2026-11-07) times one portal (owner r:r32b983, 2026-11-11: "the timer should reset
    // every single time like we start a new ender portal"): 0:00.00 on each ring, green with "n/7" when its portal opens,
    // then red and running from 0 on the spare ring ("8/∞"). Built in the edit (edit.py split_timer), so ./hb check's lint
    // sees it (the old timer was an overlay added after publish, counting the whole Short)
    attempts: 'ring',
    splits: { reset: 'ring', split: 'portal', of: 7, endless: 'outro' },
    // the walks between rings are cut, and from ring 5 on the hop out too (the shift speeds up)
    speed: [...[0, 1, 2, 3, 4, 5, 6].flatMap(r => [...(r ? [[`walk${r}`, `in${r}`, 'cut']] : []), [`hopA${r}`, `hopB${r}`, 'cut']]), ['outroA', 'outroB', 'cut']]
  },

  async setup (ctx) {
    const { bot, Vec3 } = ctx
    // no cleared box: each ring on its own patch of the natural ground (within a block of level, the
    // ring's 5x5 then levelled: at most a one-block step), nothing overhead
    // a retry respawns wherever the last attempt ended (once underground): back to the biome first
    // the middle of the Green (docs/world/world_map.jpg): the seed's widest grass plain, room for the sea of rings
    // (the nearest plains to spawn was a strip between a lake and woods: 44 rings fitted). END_PORTAL_AT="x,z" moves it
    const [AX, AZ] = (process.env.END_PORTAL_AT || '-430,-780').split(',').map(Number)
    await ctx.cmd(`/tp @s ${AX} 200 ${AZ}`)
    await bot.waitForTicks(40)
    await ctx.waitChunks({ x0: AX - 112, z0: AZ - 112, x1: AX + 112, z1: AZ + 112 }, 90000)
    const g = ctx.findLand(bot.entity.position.x | 0, bot.entity.position.z | 0)
    if (!g) throw new Error('no dry land')
    await ctx.defaultRules()
    await ctx.cmd('/kill @e[type=!player,distance=..150]')
    // a retry finds the last attempt's frames on the small plains patch (every spot taken): off with them
    {
      const nap = () => new Promise(resolve => setTimeout(resolve, 60))
      for (const what of ['end_portal', 'end_portal_frame']) {
        for (let za = g.z - 96; za <= g.z + 96; za += 96) {
          for (let y = 62; y <= 110; y++) { await ctx.cmd(`/fill ${g.x - 96} ${y} ${za} ${g.x + 96} ${y} ${Math.min(g.z + 96, za + 95)} air replace ${what}`); if (y % 8 === 0) await nap() }
        }
      }
    }
    // the plains patch is small and the located point moves between runs: a few starts around it
    // at least N + 1 spots: 7 rings to fill and one left empty for the ending
    let lastErr = null
    this.spots = null   // not a previous attempt's
    for (const [dx, dz] of [[0, 0], [-24, 0], [0, -24], [-24, -24], [24, 24], [-48, 0], [0, 24]]) {
      try { this.spots = await openSpots(ctx, g.x + dx, g.z + dz, Array(RINGS).fill(2), { axis: 'x', gap: 8, foot: [0, 4, 0, 6], side: Array.from({ length: 41 }, (_, i) => (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 4), tries: 140, min: N + 1, spread: 96 }); break } catch (e) { lastErr = e; ctx.log('rings from', dx, dz, ':', e.message) }
    }
    if (!this.spots) throw lastErr
    // the last ring filled next to a spare empty ring that can be seen from in front of it (the ending
    // looks at it: a spare hidden behind a step left IT NEVER ENDS over finished portals)
    if (this.spots.length > N) {
      const seen = (A, B) => {   // a clear line from A's front, eye height, to B's middle
        const fy = (ctx.surface(A.x + 2, A.z + 5) || { position: { y: A.floor } }).position.y
        const a = new Vec3(A.x + 2.5, fy + 2.62, A.z + 5.6), b = new Vec3(B.x + 2.5, B.floor + 1.5, B.z + 2.5)
        const n = Math.ceil(a.distanceTo(b) * 4)
        for (let i = 1; i < n; i++) { const p = a.plus(b.minus(a).scaled(i / n)); const k = bot.blockAt(p.floored()); if (k && k.boundingBox === 'block' && !/end_portal/.test(k.name)) return false }
        return true
      }
      let best = null
      for (let i = 0; i < N; i++) for (let j = N; j < this.spots.length; j++) {
        const A = this.spots[i], B = this.spots[j], d = Math.hypot(A.x - B.x, A.z - B.z)
        if (d <= 40 && (!best || d < best.d) && seen(A, B)) best = { i, j, d }
      }
      if (best) {
        const A = this.spots[best.i], B = this.spots[best.j]
        this.spots = [...this.spots.slice(0, N).filter((_, k) => k !== best.i), A, B, ...this.spots.slice(N).filter((_, k) => k + N !== best.j)]
        ctx.log('last ring', A, 'next to spare', B, 'seen, distance', best.d.toFixed(1))
      } else ctx.log('no spare ring in sight of a filled one')
    }
    // empty rings, every frame facing the middle (vanilla needs that for the portal to form)
    for (const S of this.spots) {
      const X = S.x, z = S.z, y = S.floor + 1
      ctx.log('ring at', S)
      await clearPlants(ctx, X - 1, y - 1, z - 1, X + 5, y + 2, z + 7)   // the grass and flowers on the patch (plants only)
      // the ring's 5x5 level with its floor: a block of ground off where it stood a block higher, filled
      // where it stood a block lower (the patch was within a block of level)
      await ctx.cmd(`/fill ${X} ${y} ${z} ${X + 4} ${y + 1} ${z + 4} air`)
      await ctx.cmd(`/fill ${X} ${y - 1} ${z} ${X + 4} ${y - 1} ${z + 4} grass_block`)
      await ctx.cmd(`/fill ${X} ${y - 2} ${z} ${X + 4} ${y - 2} ${z + 4} dirt replace air`)
      for (let i = 1; i <= 3; i++) {
        await ctx.cmd(`/setblock ${X + i} ${y} ${z} end_portal_frame[facing=south,eye=false]`)
        await ctx.cmd(`/setblock ${X + i} ${y} ${z + 4} end_portal_frame[facing=north,eye=false]`)
        await ctx.cmd(`/setblock ${X} ${y} ${z + i} end_portal_frame[facing=east,eye=false]`)
        await ctx.cmd(`/setblock ${X + 4} ${y} ${z + i} end_portal_frame[facing=west,eye=false]`)
      }
    }
    const S0 = this.spots[0]
    await this.sea(ctx)
    const n = this.spots.length, mx = Math.round(this.spots.reduce((a, S) => a + S.x, 0) / n), mz = Math.round(this.spots.reduce((a, S) => a + S.z, 0) / n)
    await ctx.hotbar([...[16, 16, 16, 16, 16, 16].map(n => ['ender_eye', n]), 'iron_pickaxe', ['bread', 7]])   // 84 eyes used, a stack still in hand at the end   // 7 rings x 12 eyes = 84: eyes stack to 16
    await ctx.cmd('/gamemode survival')
    // in the middle of the first ring, facing its first frame (north-west)
    await ctx.tpCheck(S0.x + 2.5, S0.floor + 1, S0.z + 2.5, 26.6, 39)   // facing the first frame
    ctx.select(0)
    return { x: mx, y: S0.floor, z: mz }   // the rings' middle: the harness records the world around it
  },

  // the sea: an empty ring on every level patch of grass on an 8-block grid within SEA of the rings' middle, away from
  // the job's rings, cloned from one template ring under the ground (dirt, grass, the frames facing in: as the job's
  // rings) onto the ground, levelled, only where its whole 5x5 is grass within a block of level with nothing over it:
  // never on water, a roof, a slope or under a tree
  async sea (ctx) {
    const { bot, Vec3 } = ctx
    const n = this.spots.length
    const mx = Math.round(this.spots.reduce((a, S) => a + S.x, 0) / n), mz = Math.round(this.spots.reduce((a, S) => a + S.z, 0) / n)
    await ctx.cmd('/gamerule block_drops false')   // the tall grass a ring lands on breaks: no loose seeds
    for (const [z0, z1] of [[mz - SEA - 8, mz], [mz + 1, mz + SEA + 8]]) await ctx.cmd(`/forceload add ${mx - SEA - 8} ${z0} ${mx + SEA + 8} ${z1}`)
    await bot.waitForTicks(60)
    // the template, deep under the middle (in loaded deepslate, out of every shot)
    const T = { x: mx, y: -58, z: mz }
    // (two of dirt, the grass, the frames' layer and two of air: the clone levels ground within 2 blocks)
    await ctx.cmd(`/fill ${T.x} ${T.y} ${T.z} ${T.x + 4} ${T.y + 1} ${T.z + 4} dirt`)
    await ctx.cmd(`/fill ${T.x} ${T.y + 2} ${T.z} ${T.x + 4} ${T.y + 2} ${T.z + 4} grass_block`)
    await ctx.cmd(`/fill ${T.x} ${T.y + 3} ${T.z} ${T.x + 4} ${T.y + 5} ${T.z + 4} air`)
    const y = T.y + 3
    await ctx.cmd(`/fill ${T.x + 1} ${y} ${T.z} ${T.x + 3} ${y} ${T.z} end_portal_frame[facing=south,eye=false]`)
    await ctx.cmd(`/fill ${T.x + 1} ${y} ${T.z + 4} ${T.x + 3} ${y} ${T.z + 4} end_portal_frame[facing=north,eye=false]`)
    await ctx.cmd(`/fill ${T.x} ${y} ${T.z + 1} ${T.x} ${y} ${T.z + 3} end_portal_frame[facing=east,eye=false]`)
    await ctx.cmd(`/fill ${T.x + 4} ${y} ${T.z + 1} ${T.x + 4} ${y} ${T.z + 3} end_portal_frame[facing=west,eye=false]`)
    // away from the job's rings and the ground in front of them where he stands (each ring's 5x5 from S.x, S.z)
    const clear = (cx, cz) => this.spots.every(S => cx + 2 < S.x - 3 || cx - 2 > S.x + 7 || cz + 2 < S.z - 3 || cz - 2 > S.z + 10)
    const G = 8, cells = []
    for (let cx = Math.ceil((mx - SEA) / G) * G; cx <= mx + SEA; cx += G) {
      for (let cz = Math.ceil((mz - SEA) / G) * G; cz <= mz + SEA; cz += G) if (Math.hypot(cx - mx, cz - mz) <= SEA && clear(cx, cz)) cells.push([cx, cz])
    }
    // the ground read from the bot's own world (a chat command is capped at 256 characters: /execute with the checks
    // didn't fit): from over the middle, every cell within the view distance is loaded
    await ctx.cmd('/gamemode creative')   // (survival again before the start)
    await ctx.cmd(`/tp @s ${mx} 140 ${mz}`)
    await ctx.waitChunks({ x0: mx - 120, z0: mz - 120, x1: mx + 120, z1: mz + 120 }, 90000).catch(e => ctx.log('sea chunks:', e.message))
    await bot.waitForTicks(20)
    const ground = (x, z) => {   // the top block under plants, logs and leaves, or null (unloaded)
      for (let yy = 130; yy > 40; yy--) {
        const b = bot.blockAt(new Vec3(x, yy, z))
        if (!b) return null
        if (/^(air|cave_air)$/.test(b.name) || PLANT.test(b.name) || /_leaves$|_log$/.test(b.name)) continue
        return b
      }
      return null
    }
    let placed = 0
    this.seaRings = []
    for (let i = 0; i < cells.length; i++) {
      if (i % 40 === 0) await bot.waitForTicks(1)
      const [cx, cz] = cells[i]
      const c = ground(cx, cz)
      if (!c || c.name !== 'grass_block') continue
      const Y = c.position.y
      let ok = true
      for (let dx = -2; dx <= 2 && ok; dx++) {
        for (let dz = -2; dz <= 2 && ok; dz++) {
          const g = ground(cx + dx, cz + dz)
          if (!g || !/^(grass_block|dirt)$/.test(g.name) || Math.abs(g.position.y - Y) > 2) { ok = false; break }   // within 2 blocks of level (the clone levels it)
          for (let k = 3; k <= 6; k++) { const a = bot.blockAt(new Vec3(cx + dx, Y + k, cz + dz)); if (!a || !(/^(air|cave_air)$/.test(a.name) || PLANT.test(a.name))) { ok = false; break } }   // nothing over it: no tree
        }
      }
      if (!ok) continue
      bot.chat(`/clone ${T.x} ${T.y} ${T.z} ${T.x + 4} ${T.y + 5} ${T.z + 4} ${cx - 2} ${Y - 2} ${cz - 2}`)
      this.seaRings.push([cx, cz])
      if (++placed % 4 === 0) await bot.waitForTicks(1)
    }
    await bot.waitForTicks(20)
    await ctx.cmd(`/fill ${T.x} ${T.y} ${T.z} ${T.x + 4} ${T.y + 5} ${T.z + 4} deepslate`)
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    await ctx.cmd('/forceload remove all')
    ctx.log('sea:', placed, 'rings of', cells.length, 'cells round', mx, mz)
  },

  // ring frames in fill order: round the ring clockwise from the south-west, ending on the
  // south-middle frame (the 12th, filled from outside)
  frames (S) {
    const X = S.x, z = S.z, y = S.floor + 1, out = []
    out.push([X + 1, y, z + 4])
    for (let i = 3; i >= 1; i--) out.push([X, y, z + i])
    for (let i = 1; i <= 3; i++) out.push([X + i, y, z])
    for (let i = 1; i <= 3; i++) out.push([X + 4, y, z + i])
    out.push([X + 3, y, z + 4])
    out.push([X + 2, y, z + 4])
    return out
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    let portalAt = null
    const onBlock = (o, n) => {
      if (n && n.name === 'end_portal' && portalAt === null) { portalAt = ctx.tick; ctx.mark('portal'); ctx.sound('block.end_portal.spawn', 1) }
    }
    bot.on('blockUpdate', onBlock)
    // walk to (tx, tz) with eyes on lookAt: the keys are picked for the wanted move, whatever the look;
    // jump held while crossing a frame
    const goTo = async (tx, tz, lookAt, jump = false, ease = 0.2, sprint = false) => {
      if (jump) bot.setControlState('jump', true)
      for (let k = 0; k < 140 && Math.hypot(bot.entity.position.x - tx, bot.entity.position.z - tz) > 0.3; k++) {
        const e = bot.entity, eye = e.position.offset(0, 1.62, 0), d = lookAt.minus(eye)
        const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        let dy = yaw - e.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        await bot.look(e.yaw + dy * ease, e.pitch + (pitch - e.pitch) * ease, true)
        const moveYaw = Math.atan2(-(tx - e.position.x), -(tz - e.position.z))
        let rel = moveYaw - e.yaw; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI
        const oct = Math.round(rel / (Math.PI / 4))
        bot.setControlState('forward', [-1, 0, 1].includes(oct)); bot.setControlState('back', [3, 4, -4, -3].includes(oct))
        bot.setControlState('left', [1, 2, 3].includes(oct)); bot.setControlState('right', [-1, -2, -3].includes(oct))
        bot.setControlState('sprint', sprint && oct === 0)
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
    }
    let used = 0
    const eye = async ([fx, fy, fz], ms, wait, settle = 0) => {
      used++
      const tgt = new Vec3(fx + 0.5, fy + 0.8, fz + 0.5)
      if (settle) for (let k = 0; k < 10 && (Math.hypot(bot.entity.velocity.x, bot.entity.velocity.z) > 0.01 || !bot.entity.onGround); k++) await bot.waitForTicks(1)   // still from the hop in
      if (ms >= 0) await ctx.easeLookAt(tgt, ms)
      await bot.lookAt(tgt, true)   // exactly on the frame (the ease aims from where it started)
      if (settle) await bot.waitForTicks(settle)   // the look on the frame before the click
      ctx.sound('block.end_portal_frame.fill')
      ctx.mark('place', { x: fx, y: fy, z: fz, eye: true })   // vanilla timing: the eye shows 1 tick after the use
      bot.swingArm()   // the swing on the click, the eye a tick later
      bot._client.write('block_place', { hand: 0, location: { x: fx, y: fy, z: fz }, direction: 1, cursorX: 0.5, cursorY: 0.8125, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })   // motion-ok: aimed: the look lands exactly on this frame (bot.lookAt above, held a tick) before the click; the aim check measures it

      if (wait) await bot.waitForTicks(wait)
      if (used % 16 === 0) ctx.select(used / 16)   // the stack ran out (its last eye has shown): onto the next
    }
    ctx.mark('start')
    for (let r = 0; r < N; r++) {
      const S = this.spots[r], X = S.x, z = S.z, floor = S.floor, fr = this.frames(S), { ms, hold } = FILL[r]
      const fg = ctx.surface(X + 2, z + 5), front = (fg ? fg.position.y : floor) + 1   // the ground south of the ring (within a block of its floor)
      if (r > 0) {
        // to the next ring (a jump cut in the edit: walk<r>..in<r>), then hop in over its south frame
        ctx.mark('walk', { n: r }); ctx.mark(`walk${r}`)
        // straight into the ring's middle, eyes already on its first frame (the hop in over the south
        // frame ended on the grass floor and was the same 1.7 s clip every ring)
        for (let t = 0; ; t++) {
          await ctx.cmd(`/tp @s ${X + 2.5} ${floor + 1} ${z + 2.5} 26.6 39`)
          if (Math.abs(bot.entity.position.x - (X + 2.5)) < 0.1 && Math.abs(bot.entity.position.z - (z + 2.5)) < 0.1) break
          if (t > 20) throw new Error('teleport did not stick')
        }
        for (let k = 0; k < 10 && !bot.entity.onGround; k++) await bot.waitForTicks(1)
        ctx.mark(`in${r}`)
      }
      ctx.mark('ring', { n: r })
      portalAt = null
      for (let k = 0; k < 11; k++) await (k === 0 ? eye(fr[k], 250, hold, 1) : eye(fr[k], ms, hold, ms < 0 ? 1 : 0))   // the first one a full turn (from the ring's middle) and a settle
      // backwards out over the south frame, eyes on the far side of the ring (no look straight down),
      // and the 12th eye from outside
      ctx.mark('hop', { n: r }); ctx.mark(`hopA${r}`)
      // out over the south frame: a jump cut (the backing-out hop stalled on uneven ground and once left
      // the bot standing in the ring as its portal opened)
      for (let t = 0; ; t++) {
        await ctx.cmd(`/tp @s ${X + 2.5} ${front} ${z + 5.6} 180 40`)
        if (Math.abs(bot.entity.position.z - (z + 5.6)) < 0.1 && Math.abs(bot.entity.position.x - (X + 2.5)) < 0.1) break
        if (t > 20) throw new Error('teleport did not stick')
      }
      for (let k = 0; k < 10 && !bot.entity.onGround; k++) await bot.waitForTicks(1)
      ctx.mark(`hopB${r}`)
      await eye(fr[11], 200, 2, 1)
      const c = new Vec3(X + 2.5, floor + 1.75, z + 2.5)
      await ctx.easeLookAt(c, 250)
      for (let k = 0; k < 20 && portalAt === null; k++) await bot.waitForTicks(1)
      ctx.log('ring', r, 'portal', portalAt !== null, 'at', bot.entity.position)
      if (portalAt === null) return false
      await ctx.easeLookAt(c.offset(0.8, 0, -0.6), r >= 2 ? 300 : 500)
    }
    // the rest of the field: empty rings waiting, near and far
    // the ending: a jump cut to the next empty ring (outroA..outroB), standing at it as at every other
    // ring, and a slow push across its empty frames (from 24 blocks off the spare didn't read on screen)
    const sp = this.spots[N]
    if (sp) {
      const g2 = ctx.surface(sp.x + 2, sp.z + 5), fy = (g2 ? g2.position.y : sp.floor) + 1
      ctx.mark('outroA')
      for (let t = 0; ; t++) {
        await ctx.cmd(`/tp @s ${sp.x + 2.5} ${fy} ${sp.z + 6.6} 180 35`)
        if (Math.abs(bot.entity.position.z - (sp.z + 6.6)) < 0.1) break
        if (t > 20) throw new Error('teleport did not stick')
      }
      for (let k = 0; k < 10 && !bot.entity.onGround; k++) await bot.waitForTicks(1)
      ctx.mark('outroB')
      ctx.mark('outro')
      // a beat on the next empty ring (the next shift), then the crane up off his head: the sea of empty rings
      await ctx.easeLookAt(new Vec3(sp.x + 2.5, sp.floor + 1.5, sp.z + 2.5), 300)
      await bot.waitForTicks(4)
      // the crane faces the way with the most rings 30-150 blocks out (the frame's field: +-35 deg round it)
      const way = [['sea_n', 0, -1], ['sea_e', 1, 0], ['sea_s', 0, 1], ['sea_w', -1, 0]].map(([nm, ux, uz]) => {
        const n = (this.seaRings || []).filter(([cx, cz]) => {
          const dx = cx - (sp.x + 2), dz = cz - (sp.z + 2), along = dx * ux + dz * uz, d = Math.hypot(dx, dz)
          return d >= 20 && d <= 150 && along > d * Math.cos(35 * Math.PI / 180)
        }).length
        return [nm, n]
      }).sort((a, b) => b[1] - a[1])
      ctx.log('crane ways', JSON.stringify(way))
      M.shot(ctx, way[0][0])
      // and under the crane he hops into it: the next shift starts
      const into = goTo(sp.x + 2.5, sp.z + 2.5, new Vec3(sp.x + 2.5, sp.floor + 1, sp.z + 0.5), true, 0.2)
      await bot.waitForTicks(24)
      ctx.mark('sea')   // high enough that the rings read to the horizon: the card and the hit
      await into
      await bot.waitForTicks(40)
    } else {   // no spare: across the filled ones
      ctx.mark('outro')
      const here = bot.entity.position
      const others = this.spots.slice(0, N - 1).map(S => new Vec3(S.x + 2.5, S.floor + 1, S.z + 2.5)).sort((a, b) => b.distanceTo(here) - a.distanceTo(here))
      await ctx.easeLookAt(others[others.length - 1], 700)
      M.shot(ctx, 'sea_n')
      await bot.waitForTicks(24)
      ctx.mark('sea')
      await bot.waitForTicks(40)
    }
    bot.removeListener('blockUpdate', onBlock)
    return !ctx.died
  }
}
