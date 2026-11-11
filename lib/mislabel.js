// "mislabel" format (owner 2026-11-11, r:r05c651; STANDARDS 10): a parkour + dropper hook in the first second, then
// a numbered list of giant floating builds, each with a confidently wrong, CLEAN label, seen while falling past them;
// it ends falling back onto the first parkour block, so the Short loops. Always kid-safe: the joke is the label.
//
// A new episode is a list: mislabel({ name, title, items: [{ art, label, scale }] }).
//   art    a key of lib/mislabel_art.json (a jar texture turned into blocks: scripts/mislabel_art.py adds more)
//   label  the wrong name, shown as "N. label" in the caption band for the whole item (readable in ~1 s: 1-3 words)
//   scale  blocks per pixel (the builds grow item by item: the last is the biggest)
//
// The set (all in the sky over real terrain, nothing cut): the course is five floating blocks in a row heading north
// at y 308 (gold, glazed terracotta), a 3x3 dropper shaft under the last gap whose lime/green walls spiral as you
// fall, and one build at a time on a 27-degree lean, its face toward the fall line, D blocks out (D ~ its height,
// so it fills ~70% of the view as you pass its middle). Only one build exists at a time: the next is placed and the
// last one cleared inside the cut between items (the edit drops those frames), so no other build ever shows in a
// shot. Each item is a real fall from rest from y 330 (the first 8 ticks cut: a fall from rest reads as a hover),
// the camera on the build's middle from far above until level with it, then the cut. Items alternate directions
// (E, N, W, S) for different terrain under each. The end: from y 340 straight down onto the first gold block.
// Sounds: the vanilla steps (harness), a step on every landing, entity.player.big_fall + the block's fall sound on
// the last one (vanilla plays both on a big landing; fall_damage is off, so nobody dies).
const ARTS = require('./mislabel_art.json')

const YB = 308                       // the course blocks' y (feet at 309)
const TUNNEL = 18                    // dropper shaft length, its top 3 under the course
const TOP = 330                      // each item's fall starts here (above the build limit: entities may be)
const CUT = 8                        // ticks of each fall from rest cut out
const LEAN = 0.5                     // blocks back per block up (the face tilts toward the fall: readable from above)
const DIRS = [[1, 0], [0, -1], [-1, 0], [0, 1]]   // E, N, W, S (unit vectors from the column to the build)
const OFF = 28                       // items 2+: the column this far from the centre, away from the course
const ITEM_S = Number(process.env.ITEM_S || 4.5)  // seconds each item's fall runs (~4.3 s of it on screen)
const HOME_TOP = 350                 // the last fall, onto the first block: 41 blocks, ~1.4 s on screen
const CLEAR = 30                     // the cut never comes lower than this over the ground (tree tops included)

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
    // fogged out and the first half of every fall was pale sky (stills, take 1). At 16 (256 blocks) it shows, as for
    // a player on 16 chunks; the recorded area reaches the fog everywhere a fall looks (no world edge at the horizon)
    renderDistance: 16,
    recordRadius: 288,
    chunkStops (set) { return [[150, 150], [-150, 150], [150, -150], [-150, -150], [200, 0], [-200, 0], [0, 200], [0, -200]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },
    edit: {
      caption: title,
      colors: items.map((_, k) => `${k + 1}=yellow`).join(','),
      captions: [...items.map((it, k) => [ev(k), `${k + 1}. ${it.label}`]), ['home', title]],
      speed: [...items.slice(1).map((_, k) => [`end${k + 1}`, ev(k + 1), 'cut']), [`end${N}`, 'home', 'cut']],
      startAt: 'go:0.05',
      endAfter: 'land:0.4',
      shake: [['land', 0, 14]],
      ...edit
    },

    // where item k's build goes: its column (the fall line), the direction to the build, and the build's cells
    plan (k, X, Z, groundAt) {
      const it = items[k], a = ARTS[it.art]
      if (!a) throw new Error(`no art ${it.art} in lib/mislabel_art.json (python3 scripts/mislabel_art.py ${it.art})`)
      const [ux, uz] = DIRS[k % 4], rx = -uz, rz = ux                 // right, as seen from the column
      const s = it.scale, W = a.rows[0].length * s, H = a.rows.length * s
      const cx = k === 0 ? X : X + ux * OFF, cz = k === 0 ? Z : Z + uz * OFF
      const D = Math.max(30, Math.round(H * 1.0))
      // the eye is level with the build's middle near the end of the item: from rest at TOP (item 1: off the course)
      // (item 1 runs on from the dropper, which already took ~1.4 s of its fall)
      let t1 = k === 0 ? Math.round(ITEM_S * 20) - 4 : CUT + Math.round(ITEM_S * 20) - 6
      const y0f = k === 0 ? YB + 1 : TOP, ground = groundAt(cx + ux * 8, cz + uz * 8)
      while (t1 > 40 && y0f + 1.62 - fallen(t1 + 4) < ground + CLEAR) t1--
      const eyeY = y0f + 1.62 - fallen(t1)
      const midY = Math.round(eyeY), y0 = midY - Math.floor(H / 2)
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
      return { cx, cz, ux, uz, H, W, D, mid, fills, clear, top: y0 + H, t1, ground }
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
      // the course: S0 gold (where it starts and ends), then three more 3 blocks apart, north
      this.course = [[15, 'gold_block'], [12, 'yellow_glazed_terracotta'], [9, 'gold_block'], [6, 'light_blue_glazed_terracotta'], [3, 'orange_glazed_terracotta']]
      await ctx.cmd(`/setblock ${X} ${YB} ${Z + 15} gold_block`)
      await ctx.tpCheck(X + 0.5, YB + 1, Z + 15.7, 180, 50)
      await ctx.forceload({ x0: X - 130, z0: Z - 130, x1: X + 130, z1: Z + 130 })
      for (const [dz, b] of this.course) await ctx.cmd(`/setblock ${X} ${YB} ${Z + dz} ${b}[facing=north]`.replace(/gold_block\[facing=north\]/, 'gold_block'))
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
      // the first item's build (the rest go up inside the cuts)
      // the ground under each fall (tree tops count): a fall never comes closer than CLEAR
      const groundAt = (x, z) => { for (let y = 300; y > -60; y--) { const b = bot.blockAt(new ctx.Vec3(x, y, z)); if (b && b.name !== 'air' && b.name !== 'cave_air') return y } return 64 }
      this.plans = items.map((_, k) => this.plan(k, X, Z, groundAt))
      for (const [k, pl] of this.plans.entries()) ctx.log(`item ${k + 1}: ${items[k].art} ${pl.W}x${pl.H} at D ${pl.D}, middle y ${pl.mid.y}, ground ${pl.ground}, level at tick ${pl.t1}, ${pl.fills.length} fills`)
      await this.burst(ctx, this.plans[0].fills)
      await ctx.hotbar([])
      await ctx.cmd('/gamemode survival')
      await ctx.tpCheck(X + 0.5, YB + 1, Z + 15.7, 180, 50)   // S0, facing north down the course
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
      // ---- the hook: three sprint jumps, then into the dropper
      ctx.mark('go')
      this.out = false; aim = null; pitchNow = null
      const targets = [12, 9, 6, 3].map(dz => Z + dz + 0.5)
      bot.setControlState('sprint', true); bot.setControlState('forward', true)
      let k = 0, air = false
      for (let t = 0; t < 200 && k < targets.length; t++) {
        const p = bot.entity.position
        { const ahead = Math.min(targets[k] - 0.3, bot.entity.position.z - 2.8), e = eyeNow(); lookPitch(Math.atan2(YB + 1 - e.y, e.z - ahead)) }
        if (bot.entity.onGround) {
          if (air) { air = false; stepSound(0.15); ctx.mark('land_jump'); k++; if (k >= targets.length) break }
          const zc = targets[k] + 3   // the block we stand on
          bot.setControlState('forward', true); bot.setControlState('sprint', true)
          bot.setControlState('jump', p.z <= zc - 0.25)
        } else {
          if (!air) { air = true; ctx.mark('jump') }
          bot.setControlState('jump', false)
          bot.setControlState('forward', landZ(YB + 1) > targets[k] + 0.15)
        }
        await bot.waitForTicks(1)
      }
      // off the last block into the shaft: a walking jump, steered onto the shaft's middle
      bot.setControlState('sprint', false)
      air = false
      for (let t = 0; t < 40; t++) {
        const p = bot.entity.position
        if (bot.entity.onGround) {
          bot.setControlState('forward', true)
          bot.setControlState('jump', p.z <= Z + 3.5 - 0.25)
        } else {
          if (!air) { air = true; ctx.mark('jump'); ctx.mark('dropper') }
          bot.setControlState('jump', false)
          bot.setControlState('forward', p.y > YB - 2 && landZ(YB - 20) > Z + 0.6)
          if (p.y < YB - 2.5) break
        }
        // the look goes from the shaft's mouth to straight down it
        lookPitch(-Math.PI / 2 + 0.02, 0.25)
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
      // ---- the list
      const fallTo = async (k) => {
        const pl = this.plans[k]
        let passed = false
        for (let t = 0; t < 200; t++) {
          const eye = bot.entity.position.y + 1.62
          if (k === 0 && eye > YB - 3 - TUNNEL + 1.62) lookPitch(-Math.PI / 2 + 0.02, 0.25)   // straight down the shaft
          else {
            if (k === 0 && !this.out) { this.out = true; aim = null; ctx.mark(ev(0)) }
            lookAt(new Vec3(pl.mid.x, pl.mid.y, pl.mid.z), k === 0 ? 0.12 : 0.5)
          }
          if (!passed && eye < pl.top) { passed = true; ctx.mark(`pass${k + 1}`) }
          if (eye <= pl.mid.y + 1.5) break
          await bot.waitForTicks(1)
        }
      }
      for (let i = 0; i < N; i++) {
        if (i > 0) {
          const pl = this.plans[i], prev = this.plans[i - 1]
          // the cut: up to the next fall line, the last build cleared, the next built, then a fresh fall from rest
          const d = new Vec3(pl.mid.x - pl.cx - 0.5, pl.mid.y - TOP - 1.62, pl.mid.z - pl.cz - 0.5)
          const yawDeg = Math.atan2(-d.x, d.z) * 180 / Math.PI, pitchDeg = -Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI
          await ctx.cmd(`/tp @s ${pl.cx + 0.5} ${TOP} ${pl.cz + 0.5} ${yawDeg.toFixed(1)} ${pitchDeg.toFixed(1)}`)
          await this.burst(ctx, [...prev.clear, ...pl.fills])
          await ctx.cmd(`/tp @s ${pl.cx + 0.5} ${TOP} ${pl.cz + 0.5} ${yawDeg.toFixed(1)} ${pitchDeg.toFixed(1)}`)
          aim = null
          await bot.waitForTicks(CUT - 4)   // (ctx.cmd waited 4)
          ctx.mark(ev(i))
        }
        await fallTo(i)
        ctx.mark(`end${i + 1}`)
      }
      // ---- the end: back over the first block, straight down onto it (the Short loops to the start)
      await ctx.cmd(`/tp @s ${X + 0.5} ${HOME_TOP} ${Z + 15.5} 180 88.9`)
      await this.burst(ctx, this.plans[N - 1].clear)
      await ctx.cmd(`/tp @s ${X + 0.5} ${HOME_TOP} ${Z + 15.5} 180 88.9`)
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
