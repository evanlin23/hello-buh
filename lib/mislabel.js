// "mislabel" format (owner 2026-11-11, r:r05c651; STANDARDS 10): a parkour + dropper hook from frame 0, then a
// numbered list of giant builds, each with a confidently wrong, CLEAN label, seen while falling past them; it ends
// falling back onto the first parkour block, so the Short loops. Always kid-safe: the joke is the label.
//
// A new episode is a list: mislabel({ name, title, items: [{ art, label, scale }] }).
//   art    a key of lib/mislabel_art.json (a jar texture turned into blocks: scripts/mislabel_art.py adds more)
//   label  the wrong name: "N." in the caption band at the cut, "N. label" from 1.1 s in (1-3 words, read in ~1 s)
//   scale  blocks per pixel (the builds grow item by item: the last is the biggest)
//
// The hook (owner 2026-11-12, r:re392f9: "left right double extensions not this going up"): the course heads north at
// y 290 over the jungle: a 2-gap and a 3-gap sprint jump; then the classic bridge-out, sneaking to the block's side
// edge and placing two blocks to the RIGHT (aimed through lib/act.js), a 2-gap jump from the end of them; two blocks
// to the LEFT, another 2-gap; then a turn to the 3x3 dropper shaft off to the right of the course (its lime/green walls
// spiral as you fall; off the jumps' line of sight, so the gaps read as air).
// The list (r:re392f9: "into a hole 1x1 and then come out of the sky? need cleaner"): every item is ONE clean move. The
// camera is set once at the cut (TILT off straight down, toward the build) and never moves; the build lies face-up,
// flat, over the jungle beside a 1x1 hole cut through the world (in a small clearing); you fall past it straight into
// the hole, and the cut comes 0.3 s inside it (r:r188b46: cut once the result reads), straight to the next item
// falling out of the sky. Only one build exists at a time: the next goes up and the last comes down inside the cut
// (frames the edit drops). The end: out of the last hole, from the sky straight down onto the first gold block.
// Sounds: the vanilla steps (harness), a step on every landing, the place sounds, entity.player.big_fall + the block's
// fall sound on the last landing (vanilla plays both; fall_damage is off, so nobody dies).
const ARTS = require('./mislabel_art.json')

const YB = 290                       // the course blocks' y (feet at 291): the ground straight down inside the fog
const TUNNEL = 18                    // dropper shaft length
const SHAFT_Y = YB - 6               // its top layer (6 under the course: the jump in clears its rim)
const SX = 4, SZ = 5                 // the shaft's middle block, east of the last course block (off the jumps' line)
const S0 = 18                        // the start block, this far south of the centre
const DROP = 130                     // each item's fall starts this far over its ground
const CUT = 8                        // the first ticks of each fall from rest cut out (a fall from rest reads as a hover)
const INTO = 0.3                     // s: the cut comes this long after the eye goes into the hole (r:r188b46)
const ART_OVER = 36                  // the flat build this far over the ground (jungle trees ~30 tall)
const GAP = 4                        // blocks between the hole and the build's near edge
const TILT = 22 * Math.PI / 180      // the camera, this far off straight down toward the build (the hole stays in frame)
const LABEL_AT = 1.1                 // s after an item's cut that its wrong name appears
const DIRS = [[1, 0], [0, -1], [-1, 0], [0, 1]]   // E, N, W, S (then round again): column -> build
const OFF = 28                       // items 2+: the fall line this far from the centre, away from the course
const HOME_TOP = 330                 // the last fall, onto the first block
const PLACE = 'oak_planks'           // the extensions' blocks (wood: they read against the lime shaft)

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
    // fogged out (take 1). At 18 (288 blocks) it shows, as for a player on 18 chunks; the recorded area reaches the fog
    renderDistance: 18,
    recordRadius: 320,
    chunkStops (set) { return [[150, 150], [-150, 150], [150, -150], [-150, -150], [200, 0], [-200, 0], [0, 200], [0, -200]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },
    edit: {
      caption: title,
      colors: items.map((_, k) => `${k + 1}=yellow`).join(','),
      // the number at the cut, the wrong name LABEL_AT s later, once the build reads: the viewer names it first, then
      // the label lands as the punchline
      captions: [...items.flatMap((it, k) => [[ev(k), `${k + 1}.`], [`${ev(k)}:${LABEL_AT}`, `${k + 1}. ${it.label}`]]), ['home', title]],
      speed: [...items.slice(1).map((_, k) => [`end${k + 1}`, ev(k + 1), 'cut']), [`end${N}`, 'home', 'cut']],
      startAt: 'go:0.55',             // on the run: the first step lands by 0.3 s (pace: sound in the hook)
      endAfter: 'land:0.6',           // r:r188b46: 0.5-0.8 s after the payoff's result
      shake: [['land', 0, 14]],
      // the landing is the payoff in the packaged mix too (mixcheck v3: a hit within 0.3 s over the NCS bed): the song's
      // drop on it and the bed dipped 0.4 s before it, so the vanilla landing is the hit. No impact sfx: the master
      // normalises the whole track, and on this quiet stunt an impact pulled the footsteps 16-28 dB under
      dropAt: 'land',
      sfx: [['dip', 'land', 0.4]],
      ...edit
    },

    // item k: its fall line (the 1x1 hole under it), the flat build beside it, the camera's fixed look
    plan (k, X, Z, groundAt) {
      const it = items[k], a = ARTS[it.art]
      if (!a) throw new Error(`no art ${it.art} in lib/mislabel_art.json (python3 scripts/mislabel_art.py ${it.art})`)
      const [ux, uz] = DIRS[k % 4], rx = -uz, rz = ux                 // right, as seen looking from the column toward the build
      const s = it.scale, W = a.rows[0].length * s, H = a.rows.length * s
      const side = k >= 4 ? 48 : 0      // the second time round a direction, 48 blocks to the side: other ground under it
      const cx = k === 0 ? X + SX : X + ux * OFF + rx * side, cz = k === 0 ? Z + SZ : Z + uz * OFF + rz * side
      const holeTop = groundAt(cx, cz, true)                      // the terrain under the fall line (no trees)
      let canopy = holeTop
      for (let d = 0; d <= H + GAP; d += 4) for (const o of [-W / 2, 0, W / 2]) canopy = Math.max(canopy, groundAt(cx + ux * (GAP + d) + rx * o, cz + uz * (GAP + d) + rz * o, true))
      const y = canopy + ART_OVER, start = Math.min(330, holeTop + DROP)
      // the image lies face-up: its top row is the far side (+u), its left the camera's left (-r)
      const fills = []
      for (let r = 0; r < a.rows.length; r++) {
        const row = a.rows[r], u0 = GAP + (a.rows.length - 1 - r) * s, u1 = u0 + s - 1
        let c = 0
        while (c < row.length) {
          const ch = row[c]; let e = c
          while (e + 1 < row.length && row[e + 1] === ch) e++
          if (ch !== '.') {
            const o0 = c * s - W / 2, o1 = e * s + s - 1 - W / 2
            const xa = cx + ux * u0 + rx * o0, za = cz + uz * u0 + rz * o0, xb = cx + ux * u1 + rx * o1, zb = cz + uz * u1 + rz * o1
            fills.push(`/fill ${Math.floor(xa)} ${y} ${Math.floor(za)} ${Math.floor(xb)} ${y} ${Math.floor(zb)} ${a.palette[ch]}`)
          }
          c = e + 1
        }
      }
      const ba = [cx + ux * GAP + rx * (-W / 2 - 1), cz + uz * GAP + rz * (-W / 2 - 1)], bb = [cx + ux * (GAP + H) + rx * (W / 2 + 1), cz + uz * (GAP + H) + rz * (W / 2 + 1)]
      const clear = [`/fill ${Math.floor(Math.min(ba[0], bb[0]))} ${y} ${Math.floor(Math.min(ba[1], bb[1]))} ${Math.floor(Math.max(ba[0], bb[0]))} ${y} ${Math.floor(Math.max(ba[1], bb[1]))} air`]
      // the 1x1 hole through the world, in a 5x5 clearing (trees over it cut away)
      const hole = [`/fill ${cx - 2} ${holeTop + 1} ${cz - 2} ${cx + 2} ${holeTop + 34} ${cz + 2} air`, `/fill ${cx} -64 ${cz} ${cx} ${holeTop} ${cz} air`]
      // the look: from the fall line toward the build, TILT off straight down; mineflayer yaw (0 = north, -z)
      const yaw = Math.atan2(-ux, -uz), pitch = -Math.PI / 2 + TILT
      return { cx, cz, ux, uz, H, W, y, fills, clear, hole, holeTop, start, yaw, pitch, cut: CUT }
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
      await ctx.cmd('/gamerule fall_damage false', { mayFail: true })   // the last landing is ~40 blocks onto the start
      // the course, north: S0 gold (where it starts and ends), a 2-gap, a 3-gap; B2's right edge bridges out 2 (placed),
      // a 2-gap to B3 at x+2; its left edge bridges back 2 (placed), a 2-gap to B4 at x 0; the shaft east of B4
      this.course = [[0, S0, 'gold_block'], [0, 15, 'yellow_glazed_terracotta'], [0, 11, 'gold_block'], [2, 8, 'light_blue_glazed_terracotta'], [0, 5, 'orange_glazed_terracotta']]
      await ctx.cmd(`/setblock ${X} ${YB} ${Z + S0} gold_block`)
      await ctx.tpCheck(X + 0.5, YB + 1, Z + S0 + 0.7, 180, 25)
      await ctx.forceload({ x0: X - 130, z0: Z - 130, x1: X + 130, z1: Z + 130 })
      await ctx.cmd(`/fill ${X - 1} ${YB} ${Z + 4} ${X + 3} ${YB + 4} ${Z + S0} air`)   // (a retry: last take's placed blocks)
      for (const [dx, dz, b] of this.course) await ctx.cmd(`/setblock ${X + dx} ${YB} ${Z + dz} ${b}${b.includes('glazed') ? '[facing=north]' : ''}`)
      // the dropper: a 3x3 shaft in a 5x5 ring, walls in a lime/green spiral
      const cmds = []
      const ring = []
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) ring.push([dx, dz])
      for (let l = 0; l < TUNNEL; l++) {
        for (const [dx, dz] of ring) {
          const sector = Math.floor(((Math.atan2(dz, dx) / (2 * Math.PI) + 1) * 4 + l / 6)) % 2
          cmds.push(`/setblock ${X + SX + dx} ${SHAFT_Y - l} ${Z + SZ + dz} ${sector ? 'lime_concrete' : (l % 6 === 0 ? 'emerald_block' : 'green_concrete')}`)
        }
      }
      await this.burst(ctx, cmds)
      // the ground under each fall: terrain only (trees, our own blocks and a retry's leftovers don't count)
      const ours = new Set([PLACE, ...this.course.map(c => c[2]), 'lime_concrete', 'green_concrete', 'emerald_block', ...Object.values(ARTS).flatMap(a => Object.values(a.palette))])
      const tree = /_leaves$|_log$|_wood$|vine|cocoa|bamboo|melon|pumpkin/
      const groundAt = (x, z, terrain) => {
        for (let y = 300; y > -60; y--) {
          const b = bot.blockAt(new ctx.Vec3(Math.floor(x), y, Math.floor(z)))
          if (b && b.name !== 'air' && b.name !== 'cave_air' && !ours.has(b.name) && b.boundingBox === 'block' && !(terrain && tree.test(b.name))) return y
        }
        return 64
      }
      this.plans = items.map((_, k) => this.plan(k, X, Z, groundAt))
      for (const [k, pl] of this.plans.entries()) ctx.log(`item ${k + 1}: ${items[k].art} ${pl.W}x${pl.H} flat at y ${pl.y}, hole at ${pl.cx} ${pl.cz} from ${pl.holeTop}, fall from ${pl.start}, ${pl.fills.length} fills`)
      await this.burst(ctx, [...this.plans.flatMap(pl => pl.hole), ...this.plans[0].fills])   // (the first build; the rest go up inside the cuts)
      await ctx.hotbar([[PLACE, 16]])
      ctx.select(0)
      await ctx.cmd('/gamemode survival')
      await ctx.tpCheck(X + 0.5, YB + 1, Z + S0 + 0.7, 180, 25)   // S0, facing north down the course
      await bot.waitForTicks(20)
      return { x: X, y: YB, z: Z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { X, Z } = this
      const A = require('./act')(ctx)
      const eyeNow = () => bot.entity.position.offset(0, bot.controlState.sneak ? 1.27 : 1.62, 0)
      // the running look: eased, at most 9 deg a tick, and only the pitch moves (yaw held: a point can't pass under the
      // camera and flip the view)
      const MAXT = 9 * Math.PI / 180
      const turnTo = (yaw, pitch) => {
        let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        const dp = pitch - bot.entity.pitch, m = Math.max(Math.abs(dy), Math.abs(dp)), f = m > MAXT ? MAXT / m : 1
        bot.look(bot.entity.yaw + dy * f, bot.entity.pitch + dp * f, true)
      }
      let pitchNow = null, runYaw = 0
      const lookPitch = (pitch, k = 0.3) => { pitchNow = pitchNow === null ? bot.entity.pitch : pitchNow + (pitch - pitchNow) * k; turnTo(runYaw, pitchNow) }
      const stepSound = (vol = 0.15, kind = 'step') => {
        const under = bot.blockAt(bot.entity.position.offset(0, -0.2, 0))
        if (under && under.name !== 'air') ctx.sound(`block.${ctx.soundGroup(under.name)}.${kind}`, vol)
      }
      // where a jump comes down with no keys held (air drag 0.91, gravity 0.08 / drag 0.98), along x or z
      const landAt = (axis, floorY) => {
        let c = bot.entity.position[axis], y = bot.entity.position.y, v = bot.entity.velocity[axis], vy = bot.entity.velocity.y
        for (let i = 0; i < 60; i++) { vy = (vy - 0.08) * 0.98; y += vy; v *= 0.91; c += v; if (vy < 0 && y <= floorY) break }
        return c
      }
      const zc = (dz) => Z + dz + 0.5
      // a sprint jump north onto the block whose middle is zTarget: jump at the edge, keys off once the landing would
      // carry past its middle; the eyes ~5 blocks ahead (about -18 deg: the gaps read as air)
      const jumpTo = async (zFrom, zTarget) => {
        let air = false
        bot.setControlState('sprint', true); bot.setControlState('forward', true)
        for (let t = 0; t < 80; t++) {
          const p = bot.entity.position
          lookPitch(Math.atan2(-1.62, 5))
          if (bot.entity.onGround) {
            if (air) { stepSound(0.15); ctx.mark('land_jump'); break }
            bot.setControlState('jump', p.z <= zFrom - 0.25)
          } else {
            if (!air) { air = true; ctx.mark('jump') }
            bot.setControlState('jump', false)
            bot.setControlState('forward', landAt('z', YB + 1) > zTarget + 0.15)
          }
          await bot.waitForTicks(1)
        }
        bot.clearControlStates()
      }
      // onto the middle of the block (x0, z0) at a sneak's walk, the view held
      const settle = async (xm, zm, sneak) => {
        for (let t = 0; t < 40; t++) {
          const p = bot.entity.position
          const ex = xm - p.x, ez = zm - p.z
          if (Math.abs(ex) < 0.08 && Math.abs(ez) < 0.08) break
          bot.setControlState('sneak', !!sneak)
          bot.setControlState('right', ex > 0.06); bot.setControlState('left', ex < -0.06)
          bot.setControlState('back', ez > 0.06); bot.setControlState('forward', ez < -0.06)
          lookPitch(-0.9, 0.3)
          await bot.waitForTicks(1)
        }
        bot.clearControlStates()
        await bot.waitForTicks(2)
      }
      // the bridge-out: from the block at x xs (row z0), sneak to its side edge (d +1 right/east, -1 left/west) and place
      // two blocks out, one after the other, on the side face of the block under you; then onto the last one's middle
      const bridge = async (xs, z0, d) => {
        for (let i = 1; i <= 2; i++) {
          const against = xs + d * (i - 1)
          const edge = d > 0 ? against + 1 + 0.28 : against - 0.28
          bot.setControlState('sneak', true)
          for (let t = 0; t < 30; t++) {
            const x = bot.entity.position.x
            if (d > 0 ? x >= edge - 0.02 : x <= edge + 0.02) break
            bot.setControlState(d > 0 ? 'right' : 'left', true)
            lookPitch(-1.2, 0.3)
            await bot.waitForTicks(1)
          }
          bot.setControlState('right', false); bot.setControlState('left', false)
          // the side face's north part (yaw stays near north), as a player bridging out looks over the edge
          const pt = new Vec3(d > 0 ? against + 1 : against, YB + 0.55, Z + z0 + 0.12)
          await A.click(new Vec3(against, YB, Z + z0), d > 0 ? 5 : 4, [d > 0 ? 1 : 0, 0.55, 0.12], { point: pt, swing: true, max: 16, strict: true })
          ctx.mark('place_on', { x: against + d, y: YB, z: Z + z0, ax: against, ay: YB, az: Z + z0 })
          ctx.mark('extend')
          ctx.sound(`block.${ctx.soundGroup(PLACE)}.place`, 1, 0.8)
          pitchNow = null
        }
        await settle(xs + 2 * d + 0.5, zc(z0), true)
        await A.turnTo({ yaw: 0, pitch: Math.atan2(-1.62, 5) })
        pitchNow = null
      }
      // ---- the hook
      ctx.mark('go')
      pitchNow = null; runYaw = 0
      await jumpTo(zc(S0), zc(15))
      await jumpTo(zc(15), zc(11))
      await settle(X + 0.5, zc(11) + 0.1)
      await bridge(X, 11, 1)                     // two out to the right
      await jumpTo(zc(11), zc(8))
      await settle(X + 2.5, zc(8) + 0.1)
      await bridge(X + 2, 8, -1)                 // two out to the left
      await jumpTo(zc(8), zc(5))
      // the shaft is east of the last block: turn to it (governed), then a walking jump east, steered onto its middle
      await A.turnTo({ yaw: -Math.PI / 2, pitch: -0.75 })
      runYaw = -Math.PI / 2; pitchNow = null
      const sx = X + SX + 0.5, sz = Z + SZ + 0.5
      let air = false
      for (let t = 0; t < 50; t++) {
        const p = bot.entity.position
        if (bot.entity.onGround) {
          bot.setControlState('forward', true)
          bot.setControlState('jump', p.x >= X + 0.75)
        } else {
          if (!air) { air = true; ctx.mark('jump'); ctx.mark('dropper') }
          bot.setControlState('jump', false)
          bot.setControlState('forward', p.y > SHAFT_Y + 1 && landAt('x', SHAFT_Y - 20) < sx - 0.1)
          if (p.y < SHAFT_Y + 0.5) break
        }
        lookPitch(-Math.PI / 2 + 0.02, 0.25)   // the look goes from the shaft's mouth to straight down it
        await bot.waitForTicks(1)
      }
      bot.clearControlStates()
      { const p = bot.entity.position; if (Math.abs(p.x - sx) > 1.2 || Math.abs(p.z - sz) > 1.2 || p.y > SHAFT_Y + 1) throw new Error(`missed the shaft: at ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}`) }
      // ---- the list: each item one clean fall into its 1x1 hole, the camera fixed from the cut
      const fallInto = async (k) => {
        const pl = this.plans[k]
        let inAt = null
        for (let t = 0; t < 260; t++) {
          const eye = bot.entity.position.y + 1.62
          if (k === 0 && eye > SHAFT_Y - TUNNEL + 1.62) lookPitch(-Math.PI / 2 + 0.02, 0.25)   // straight down the shaft
          else if (k === 0 && pitchNow !== 'set') {
            // out of the shaft: the item's fixed look, reached at the governed rate (the only move in item 1)
            turnTo(pl.yaw, pl.pitch)
            if (Math.abs(bot.entity.pitch - pl.pitch) < 0.01) { pitchNow = 'set' }
            if (!this.out) { this.out = true; ctx.mark(ev(0)) }
          }
          if (inAt === null && eye <= pl.holeTop + 1) { inAt = t; ctx.mark(`hole${k + 1}`) }
          if (inAt !== null && t - inAt >= Math.round(INTO * 20)) break
          await bot.waitForTicks(1)
        }
      }
      this.out = false
      for (let i = 0; i < N; i++) {
        if (i > 0) {
          const pl = this.plans[i], prev = this.plans[i - 1]
          // the cut (inside the hole): up into the sky over the next fall line, its look set, the last build cleared,
          // the next built, then a fresh fall from rest
          const yawDeg = 180 - pl.yaw * 180 / Math.PI, pitchDeg = -pl.pitch * 180 / Math.PI
          await ctx.cmd(`/tp @s ${pl.cx + 0.5} ${pl.start} ${pl.cz + 0.5} ${yawDeg.toFixed(2)} ${pitchDeg.toFixed(2)}`)
          await this.burst(ctx, [...prev.clear, ...pl.fills])
          await ctx.cmd(`/tp @s ${pl.cx + 0.5} ${pl.start} ${pl.cz + 0.5} ${yawDeg.toFixed(2)} ${pitchDeg.toFixed(2)}`)
          await bot.waitForTicks(pl.cut - 4)   // (ctx.cmd waited 4)
          ctx.mark(ev(i))
        }
        await fallInto(i)
        ctx.mark(`end${i + 1}`)
      }
      // ---- the end: out of the last hole, from the sky straight down onto the first block (the Short loops to the start)
      await ctx.cmd(`/tp @s ${X + 0.5} ${HOME_TOP} ${Z + S0 + 0.5} 180 88.9`)
      await this.burst(ctx, this.plans[N - 1].clear)
      await ctx.cmd(`/tp @s ${X + 0.5} ${HOME_TOP} ${Z + S0 + 0.5} 180 88.9`)
      await bot.waitForTicks(CUT - 4)
      ctx.mark('home')
      for (let t = 0; t < 120 && !bot.entity.onGround; t++) await bot.waitForTicks(1)
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
