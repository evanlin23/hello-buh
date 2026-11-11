// "mislabel" format (owner 2026-11-11, r:r05c651; STANDARDS 10): a parkour + dropper hook in the first second, then
// a numbered list of giant floating builds, each with a confidently wrong, CLEAN label, seen while falling past them;
// it ends falling back onto the first parkour block, so the Short loops. Always kid-safe: the joke is the label.
//
// A new episode is a list: mislabel({ name, title, items: [{ art, label, scale }] }).
//   art    a key of lib/mislabel_art.json (a jar texture turned into blocks: scripts/mislabel_art.py adds more)
//   label  the wrong name: "N." in the caption band at the cut, "N. label" from 1.1 s in (1-3 words, read in ~1 s)
//   scale  blocks per pixel (the builds grow item by item: the last is the biggest)
//
// The set (all in the sky over real terrain): the course heads north at y 290: a 2-gap, two 3-gap sprint jumps, a
// "double extension" (two blocks jump-placed under yourself through lib/act.js, aimed straight down), a jump onto the
// higher last block, then a 3x3 dropper shaft whose lime/green walls spiral as you fall (owner 2026-11-11 on take 1:
// "make the parkour more interesting, like placing double extension blocks or triple"), and one build at a time on a 27-degree lean, its face toward the fall line, D blocks out (D ~ its height,
// so it fills ~70% of the view as you pass its middle). Only one build exists at a time: the next is placed and the
// last one cleared inside the cut between items (the edit drops those frames), so no other build ever shows in a
// shot. Each item is a real fall from rest from GROUND + 160 (the first 8 ticks cut), the camera on the build's middle
// from far above until level with it, then down into a 7x7 hole cut through the world under the fall line (to the
// void): the cut lands inside the hole and the next item falls from the sky again (owner: "the falling should be like
// through a hole in the world and then falling from the sky again"). Items alternate directions (E, N, W, S) for
// different terrain under each. The end: out of the last hole, from the sky straight down onto the first gold block.
// Sounds: the vanilla steps (harness), a step on every landing, entity.player.big_fall + the block's fall sound on
// the last one (vanilla plays both on a big landing; fall_damage is off, so nobody dies).
const ARTS = require('./mislabel_art.json')

const YB = 290                       // the course blocks' y (feet at 291): the ground straight down inside the fog
const TUNNEL = 18                    // dropper shaft length, its top 3 under the course
const DROP = 160                     // each item's fall starts this far over its ground
const HOLE = 3                       // the hole through the world: 7x7 (half-width 3) under each fall line
const INTO = 14                      // the cut comes this far down the hole
const CUT = 8                        // at least this many ticks of each fall from rest cut out (a fall from rest reads as a hover)
const LEAN = 0.5                     // blocks back per block up (the face tilts toward the fall: readable from above)
const LABEL_AT = 1.1                 // s after an item's cut that its wrong name appears
const DIRS = [[1, 0], [0, -1], [-1, 0], [0, 1]]   // E, N, W, S (then round again) (unit vectors from the column to the build)
const S0 = 18                        // the start block, this far south of the shaft
const OFF = 28                       // items 2+: the column this far from the centre, away from the course
const HOME_TOP = 330                 // the last fall, onto the first block: ~1.3 s on screen
const OVER = 40                      // each build's bottom row this far over the ground (jungle trees ~30 tall)
const PLACE = 'lime_concrete'        // the block the parkour's extension is placed with

// vanilla fall: blocks fallen after n ticks from rest (vy = (vy - 0.08) * 0.98)
function fallen (n, vy = 0) { let y = 0; for (let i = 0; i < n; i++) { vy = (vy - 0.08) * 0.98; y += vy } return -y }

function mislabel ({ name, title, items, biome = 'minecraft:jungle', edit = {} }) {
  const N = items.length
  const ev = (k) => `item${k + 1}`
  return {
    name,
    biome: process.env.BIOME || biome,
    caption: title,
    clouds: false,                   // the cloud layer at y 192 sat between the fall and the builds
    // vanilla's render-distance fog is max(xz, |y|) (renderer/page.js): at 10 chunks the jungle 250 blocks down was
    // fogged out and the first half of every fall was pale sky (stills, take 1); at 16 the tops of the falls still showed
    // tree tops floating in haze (take 2). At 18 (288 blocks) it shows, as for a player on 18 chunks; the recorded area reaches the fog everywhere a fall looks (no world edge at the horizon)
    renderDistance: 18,
    recordRadius: 320,
    chunkStops (set) { return [[150, 150], [-150, 150], [150, -150], [-150, -150], [200, 0], [-200, 0], [0, 200], [0, -200]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },
    edit: {
      caption: title,
      colors: items.map((_, k) => `${k + 1}=yellow`).join(','),
      // the number at the cut, the wrong name LABEL_AT s later, once the build reads: the viewer names it first, then
      // the label lands as the punchline (and the item gets a beat in its middle: pace, 3.5 s with nothing new)
      captions: [...items.flatMap((it, k) => [[ev(k), `${k + 1}.`], [`${ev(k)}:${LABEL_AT}`, `${k + 1}. ${it.label}`]]), ['home', title]],
      speed: [...items.slice(1).map((_, k) => [`end${k + 1}`, ev(k + 1), 'cut']), [`end${N}`, 'home', 'cut']],
      startAt: 'go:0.45',             // on the run: the first step lands by 0.3 s (pace: sound in the hook)
      endAfter: 'land:0.4',
      shake: [['land', 0, 14]],
      // the landing is the payoff in the packaged mix too (mixcheck v3: a hit within 0.3 s over the NCS bed): the song's drop on it
      // and the bed dipped 0.4 s before it, so the vanilla landing (big_fall + the block's fall sound) is the hit. No impact sfx:
      // the master normalises the whole track, and on this quiet stunt (footsteps, then silent falls) even an impact at gain
      // 0.15 pulled the steps 16 dB down; at 1.4, 28 dB (steps peaking at -31 dB: './hb check' heard the Short as silent)
      dropAt: 'land',
      sfx: [['dip', 'land', 0.4]],
      ...edit
    },

    // where item k's build goes: its column (the fall line), the direction to the build, and the build's cells
    plan (k, X, Z, groundAt) {
      const it = items[k], a = ARTS[it.art]
      if (!a) throw new Error(`no art ${it.art} in lib/mislabel_art.json (python3 scripts/mislabel_art.py ${it.art})`)
      const [ux, uz] = DIRS[k % 4], rx = -uz, rz = ux                 // right, as seen from the column
      const s = it.scale, W = a.rows[0].length * s, H = a.rows.length * s
      const side = k >= 4 ? 48 : 0      // the second time round a direction, 48 blocks to the side: other ground under it
      const cx = k === 0 ? X : X + ux * OFF + rx * side, cz = k === 0 ? Z : Z + uz * OFF + rz * side
      const D = Math.max(30, Math.round(H * 1.0))
      // the build's bottom row OVER the ground under it (tree tops count: take 3's creeper had trees through its mouth);
      // the fall starts DROP over the ground of the fall line and ends INTO blocks down the hole under it
      const ground = Math.max(groundAt(cx + ux * 8, cz + uz * 8), groundAt(cx + ux * D, cz + uz * D))
      const holeTop = groundAt(cx, cz), top = Math.min(330, holeTop + DROP)
      const y0 = ground + OVER, midY = y0 + Math.floor(H / 2), cut = CUT
      const fills = [], cells = []
      for (let j = 0; j < H; j++) {               // block rows, bottom up
        const r = a.rows.length - 1 - Math.floor(j / s), row = a.rows[r]
        const depth = D + Math.round(LEAN * (j - H / 2))
        let c = 0
        while (c < row.length) {
          const ch = row[c]; let e = c
          while (e + 1 < row.length && row[e + 1] === ch) e++
          if (ch !== '.') cells.push({ j, depth, c0: c * s, c1: e * s + s - 1, block: a.palette[ch] })
          c = e + 1
        }
      }
      // rows at the same depth and with the same runs go up in one /fill
      const key = (cl) => `${cl.depth}|${cl.c0}|${cl.c1}|${cl.block}`
      const groups = new Map()
      for (const cl of cells) {
        const g = groups.get(key(cl))
        if (g && g.j1 === cl.j - 1) g.j1 = cl.j
        else { const ng = { ...cl, j0: cl.j, j1: cl.j }; groups.set(key(cl) + '|' + cl.j, ng); groups.set(key(cl), ng) }
      }
      const seen = new Set()
      for (const g of groups.values()) {
        if (seen.has(g)) continue
        seen.add(g)
        const off0 = g.c0 - W / 2, off1 = g.c1 - W / 2
        const xa = Math.floor(cx + ux * g.depth + rx * off0), za = Math.floor(cz + uz * g.depth + rz * off0)
        const xb = Math.floor(cx + ux * g.depth + rx * off1), zb = Math.floor(cz + uz * g.depth + rz * off1)
        fills.push(`/fill ${xa} ${y0 + g.j0} ${za} ${xb} ${y0 + g.j1} ${zb} ${g.block}`)
      }
      const dMin = D + Math.round(LEAN * (-H / 2)) - 1, dMax = D + Math.round(LEAN * (H / 2)) + 1
      const box = [cx + ux * dMin + rx * (-W / 2 - 1), cz + uz * dMin + rz * (-W / 2 - 1), cx + ux * dMax + rx * (W / 2 + 1), cz + uz * dMax + rz * (W / 2 + 1)].map(Math.floor)
      const clear = []
      for (let y = y0 - 1; y <= y0 + H; y += 6) clear.push(`/fill ${Math.min(box[0], box[2])} ${y} ${Math.min(box[1], box[3])} ${Math.max(box[0], box[2])} ${Math.min(y + 5, y0 + H)} ${Math.max(box[1], box[3])} air`)
      const mid = { x: cx + 0.5 + ux * D, y: midY + 0.5, z: cz + 0.5 + uz * D }
      const hole = [`/fill ${cx - HOLE} -64 ${cz - HOLE} ${cx + HOLE} ${holeTop + 30} ${cz + HOLE} air`]
      return { cx, cz, ux, uz, H, W, D, mid, fills, clear, top: y0 + H, cut, ground, holeTop, start: top, hole }
    },

    async burst (ctx, cmds) {      // many /fills at once: the server runs them in a tick or two
      const { bot } = ctx
      for (let i = 0; i < cmds.length; i++) { bot.chat(cmds[i]); if (i % 40 === 39) await bot.waitForTicks(1) }
      await bot.waitForTicks(6)
    },

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      const X = sp.x, Z = sp.z
      Object.assign(this, { X, Z })
      await ctx.defaultRules()
      await ctx.cmd('/gamerule fall_damage false', { mayFail: true })   // the last landing is 47 blocks onto the start
      await ctx.cmd('/gamerule fall_damage false', { mayFail: true })
      // the course, north: S0 gold (where it starts and ends), a 2-gap, two 3-gaps, the extension block (two placed on
      // it), a 2-gap up onto the last block, which stands 2 higher, then the shaft
      this.course = [[S0, 0, 'gold_block'], [15, 0, 'yellow_glazed_terracotta'], [11, 0, 'gold_block'], [7, 0, 'light_blue_glazed_terracotta'], [4, 2, 'orange_glazed_terracotta']]
      await ctx.cmd(`/setblock ${X} ${YB} ${Z + S0} gold_block`)
      await ctx.tpCheck(X + 0.5, YB + 1, Z + S0 + 0.7, 180, 50)
      await ctx.forceload({ x0: X - 130, z0: Z - 130, x1: X + 130, z1: Z + 130 })
      for (const [dz, dy, b] of this.course) await ctx.cmd(`/setblock ${X} ${YB + dy} ${Z + dz} ${b}${b.includes('glazed') ? '[facing=north]' : ''}`)
      await ctx.cmd(`/fill ${X} ${YB + 1} ${Z + 7} ${X} ${YB + 4} ${Z + 7} air`)   // (a take that stopped mid-tower)
      // the dropper: a 3x3 shaft in a 5x5 ring, top 3 under the course, walls in a lime/green spiral
      const cmds = []
      const ring = []
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) ring.push([dx, dz])
      for (let l = 0; l < TUNNEL; l++) {
        const y = YB - 3 - l
        for (const [dx, dz] of ring) {
          const sector = Math.floor(((Math.atan2(dz, dx) / (2 * Math.PI) + 1) * 4 + l / 6)) % 2
          cmds.push(`/setblock ${X + dx} ${y} ${Z + dz} ${sector ? 'lime_concrete' : (l % 6 === 0 ? 'emerald_block' : 'green_concrete')}`)
        }
      }
      await this.burst(ctx, cmds)
      // the ground under each fall (tree tops count), the builds over it, the holes through the world under the falls
      // (our own blocks don't count: a retry's world still holds the last attempt's build, read as ground at 187 once)
      const ours = new Set([PLACE, ...this.course.map(c => c[2]), 'lime_concrete', 'green_concrete', 'emerald_block', ...Object.values(ARTS).flatMap(a => Object.values(a.palette))])
      const groundAt = (x, z) => { for (let y = 300; y > -60; y--) { const b = bot.blockAt(new ctx.Vec3(x, y, z)); if (b && b.name !== 'air' && b.name !== 'cave_air' && !ours.has(b.name)) return y } return 64 }
      this.plans = items.map((_, k) => this.plan(k, X, Z, groundAt))
      for (const [k, pl] of this.plans.entries()) ctx.log(`item ${k + 1}: ${items[k].art} ${pl.W}x${pl.H} at D ${pl.D}, middle y ${pl.mid.y}, ground ${pl.ground}, hole at ${pl.cx} ${pl.cz} from ${pl.holeTop}, fall from ${pl.start}, ${pl.fills.length} fills`)
      await this.burst(ctx, [...this.plans.flatMap(pl => pl.hole), ...this.plans[0].fills])   // (the first build; the rest go up inside the cuts)
      await ctx.hotbar([[PLACE, 16]])
      ctx.select(0)
      await ctx.cmd('/gamemode survival')
      await ctx.tpCheck(X + 0.5, YB + 1, Z + S0 + 0.7, 180, 50)   // S0, facing north down the course
      await bot.waitForTicks(20)
      return { x: X, y: YB, z: Z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { X, Z } = this
      // the camera: an aim point eased toward its target (it starts where the view already looks, so nothing snaps),
      // and the turn capped at 9 deg a tick (180 deg/s: a hand on a mouse, under the 240 deg/s glitch line)
      let aim = null
      const eyeNow = () => bot.entity.position.offset(0, 1.62, 0)
      const viewPoint = (dist = 20) => { const { yaw, pitch } = bot.entity; return eyeNow().plus(new Vec3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).scaled(dist)) }
      const MAXT = 9 * Math.PI / 180
      const turnTo = (yaw, pitch) => {
        let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        const dp = pitch - bot.entity.pitch, m = Math.max(Math.abs(dy), Math.abs(dp)), f = m > MAXT ? MAXT / m : 1
        bot.look(bot.entity.yaw + dy * f, bot.entity.pitch + dp * f, true)
      }
      const lookAt = (p, k = 0.35) => {
        if (!aim) aim = viewPoint(p.minus(eyeNow()).norm())
        aim = aim.plus(p.minus(aim).scaled(k))
        const d = aim.minus(eyeNow())
        turnTo(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)))
      }
      // straight down the course (yaw 0, north) at a pitch eased toward the target: an aim point can't pass under
      // the camera and flip the view (take 1 turned 180 deg on every landing)
      let pitchNow = null
      const lookPitch = (pitch, k = 0.3) => { pitchNow = pitchNow === null ? bot.entity.pitch : pitchNow + (pitch - pitchNow) * k; turnTo(0, pitchNow) }
      const stepSound = (vol = 0.15, kind = 'step') => {
        const under = bot.blockAt(bot.entity.position.offset(0, -0.2, 0))
        if (under && under.name !== 'air') ctx.sound(`block.${ctx.soundGroup(under.name)}.${kind}`, vol)
      }
      // where a jump comes down with no keys held (air drag 0.91, gravity 0.08 / drag 0.98)
      const landZ = (floorY) => {
        let { z, y } = bot.entity.position, vz = bot.entity.velocity.z, vy = bot.entity.velocity.y
        for (let i = 0; i < 60; i++) { vy = (vy - 0.08) * 0.98; y += vy; vz *= 0.91; z += vz; if (vy < 0 && y <= floorY) break }
        return z
      }
      const A = require('./act')(ctx)
      // one sprint jump to the block at zTarget (centre z), landing at floorY: jump at the edge, keys off once the
      // landing would carry past the middle; a step sound on the landing
      const jumpTo = async (zFrom, zTarget, floorY, look = true) => {
        let air = false
        bot.setControlState('sprint', true); bot.setControlState('forward', true)
        for (let t = 0; t < 80; t++) {
          const p = bot.entity.position
          if (look) { const ahead = Math.min(zTarget - 0.3, p.z - 2.8), e = eyeNow(); lookPitch(Math.atan2(floorY - e.y, e.z - ahead)) }
          if (bot.entity.onGround) {
            if (air) { stepSound(0.15); ctx.mark('land_jump'); break }
            bot.setControlState('jump', p.z <= zFrom - 0.25)
          } else {
            if (!air) { air = true; ctx.mark('jump') }
            bot.setControlState('jump', false)
            bot.setControlState('forward', landZ(floorY) > zTarget + 0.15)
          }
          await bot.waitForTicks(1)
        }
        bot.setControlState('forward', false); bot.setControlState('sprint', false); bot.setControlState('jump', false)
      }
      // ---- the hook: a 2-gap, two 3-gaps, the double extension, a 2-gap up, into the dropper
      ctx.mark('go')
      this.out = false; aim = null; pitchNow = null
      const zc = (dz) => Z + dz + 0.5
      await jumpTo(zc(S0), zc(15), YB + 1)
      await jumpTo(zc(15), zc(11), YB + 1)
      await jumpTo(zc(11), zc(7), YB + 1)
      // the extension: settle on the block's middle, look straight down, jump-place two blocks under yourself
      // (the sprint landing carries to the block's north edge: a step back to just south of its middle, so the aim
      // point on its top stays north of the eye and the view keeps facing north; take 3 aimed south and jumped west)
      for (let t = 0; t < 30; t++) {
        const z = bot.entity.position.z
        if (z >= zc(7) + 0.05 && Math.abs(bot.entity.velocity.z) < 0.01) break
        bot.setControlState('back', z < zc(7) + 0.05); bot.setControlState('forward', z > zc(7) + 0.3)
        lookPitch(-1.2, 0.3)
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
      await bot.waitForTicks(2)
      for (let i = 1; i <= 2; i++) {
        const base = YB + i                              // feet now; the new block goes here
        // the crosshair on the top of the block under you first: in the jump only the height changes, so it stays on.
        // 0.2 north of the face's middle: straight down, the yaw is undefined and the aim never settled (take 2's
        // retries); this keeps the view facing north down the course
        const pt = new Vec3(X + 0.5, base, Math.min(Z + 7.4, bot.entity.position.z - 0.15))
        await A.aimAt(pt, { on: { x: X, y: base - 1, z: Z + 7 } })
        bot.setControlState('jump', true)
        for (let t = 0; t < 12 && bot.entity.position.y < base + 1.02; t++) await bot.waitForTicks(1)
        bot.setControlState('jump', false)
        ctx.mark('extend')
        await A.click(new Vec3(X, base - 1, Z + 7), 1, [0.5, 1, 0.3], { point: pt, swing: true, max: 6, strict: true })   // the top face: the block goes at feet height
        ctx.mark('place_on', { x: X, y: base, z: Z + 7, ax: X, ay: base - 1, az: Z + 7 })
        ctx.sound(`block.${ctx.soundGroup(PLACE)}.place`, 1, 0.8)
        for (let t = 0; t < 20 && !bot.entity.onGround; t++) await bot.waitForTicks(1)
        stepSound(0.15)
      }
      if (bot.entity.position.y < YB + 2.9) throw new Error(`the extension didn't hold: feet at ${bot.entity.position.y.toFixed(2)}`)
      await A.turnTo({ yaw: 0, pitch: -0.6 })   // eyes up to the next block (governed: a raw ease jumped to 180 deg/s)
      pitchNow = null
      await jumpTo(zc(7), zc(4), YB + 3)
      // off the last block into the shaft: a walking jump, steered onto the shaft's middle
      let air = false
      bot.setControlState('forward', true)
      for (let t = 0; t < 40; t++) {
        const p = bot.entity.position
        if (bot.entity.onGround) {
          bot.setControlState('forward', true)
          bot.setControlState('jump', p.z <= zc(4) - 0.25)
        } else {
          if (!air) { air = true; ctx.mark('jump'); ctx.mark('dropper') }
          bot.setControlState('jump', false)
          bot.setControlState('forward', p.y > YB - 2 && landZ(YB - 20) > Z + 0.6)
          if (p.y < YB - 2.5) break
        }
        lookPitch(-Math.PI / 2 + 0.02, 0.25)   // the look goes from the shaft's mouth to straight down it
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
      { const p = bot.entity.position; if (Math.abs(p.x - X - 0.5) > 1.2 || Math.abs(p.z - Z - 0.5) > 1.2 || p.y > YB) throw new Error(`missed the shaft: at ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}`) }
      // ---- the list
      const fallTo = async (k) => {
        const pl = this.plans[k]
        let passed = false, level = false, inHole = false, downV = 0
        for (let t = 0; t < 240; t++) {
          const eye = bot.entity.position.y + 1.62
          if (k === 0 && eye > YB - 3 - TUNNEL + 1.62) lookPitch(-Math.PI / 2 + 0.02, 0.25)   // straight down the shaft
          else if (!level) {
            if (k === 0 && !this.out) { this.out = true; aim = null; ctx.mark(ev(0)) }
            lookAt(new Vec3(pl.mid.x, pl.mid.y, pl.mid.z), k === 0 ? 0.12 : 0.5)
            if (!passed && eye < pl.top) { passed = true; ctx.mark(`pass${k + 1}`) }
            if (eye <= pl.mid.y + 1.5) { level = true; pitchNow = null; ctx.mark(`level${k + 1}`) }
          } else {
            // past the build: the eyes go down to the hole coming up under you, then into it
            // eased in and out like a hand: the turn speed grows 1.5 deg a tick to at most 8 (160 deg/s) and slows into
            // straight down (take 4 started at 180 deg/s in one tick: the "view jerks" check)
            const left = -Math.PI / 2 + 0.02 - bot.entity.pitch
            downV = Math.min(downV + 1.5 * Math.PI / 180, 8 * Math.PI / 180, Math.abs(left) * 0.3)
            turnTo(bot.entity.yaw, bot.entity.pitch + Math.sign(left) * downV)
            if (!inHole && eye <= pl.holeTop + 1) { inHole = true; ctx.mark(`hole${k + 1}`) }
            if (eye <= pl.holeTop - INTO) break
          }
          await bot.waitForTicks(1)
        }
      }
      for (let i = 0; i < N; i++) {
        if (i > 0) {
          const pl = this.plans[i], prev = this.plans[i - 1]
          // the cut (inside the hole): up into the sky over the next fall line, the last build cleared, the next built,
          // then a fresh fall from rest
          const d = new Vec3(pl.mid.x - pl.cx - 0.5, pl.mid.y - pl.start - 1.62, pl.mid.z - pl.cz - 0.5)
          const yawDeg = Math.atan2(-d.x, d.z) * 180 / Math.PI, pitchDeg = -Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI
          await ctx.cmd(`/tp @s ${pl.cx + 0.5} ${pl.start} ${pl.cz + 0.5} ${yawDeg.toFixed(1)} ${pitchDeg.toFixed(1)}`)
          await this.burst(ctx, [...prev.clear, ...pl.fills])
          await ctx.cmd(`/tp @s ${pl.cx + 0.5} ${pl.start} ${pl.cz + 0.5} ${yawDeg.toFixed(1)} ${pitchDeg.toFixed(1)}`)
          aim = null
          await bot.waitForTicks(pl.cut - 4)   // (ctx.cmd waited 4)
          ctx.mark(ev(i))
        }
        await fallTo(i)
        ctx.mark(`end${i + 1}`)
      }
      // ---- the end: out of the last hole, from the sky straight down onto the first block (the Short loops to the start)
      await ctx.cmd(`/tp @s ${X + 0.5} ${HOME_TOP} ${Z + S0 + 0.5} 180 88.9`)
      await this.burst(ctx, this.plans[N - 1].clear)
      await ctx.cmd(`/tp @s ${X + 0.5} ${HOME_TOP} ${Z + S0 + 0.5} 180 88.9`)
      await bot.waitForTicks(CUT - 4)
      ctx.mark('home')
      for (let t = 0; t < 120 && !bot.entity.onGround; t++) { await bot.look(0, -Math.PI / 2 + 0.02, true); await bot.waitForTicks(1) }
      ctx.mark('land')
      ctx.sound('entity.player.big_fall', 1)
      stepSound(0.5, 'fall')
      await bot.waitForTicks(20)
      return bot.health > 0
    }
  }
}

module.exports = mislabel
module.exports.fallen = fallen
