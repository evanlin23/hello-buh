// "mislabel" format (owner 2026-11-11, r:r05c651; STANDARDS 10): a parkour hook from frame 0, then a numbered list of
// giant builds, each with a confidently wrong, CLEAN label, seen while falling past them; it loops. Always kid-safe:
// the joke is the label.
//
// A new episode is a list: mislabel({ name, title, items: [{ art, label, scale }] }).
//   art    a key of lib/mislabel_art.json (a jar texture turned into blocks: scripts/mislabel_art.py adds more)
//   label  the wrong name: "N. label" in the caption band for the whole item, from its first frame (r:r489883)
//   scale  blocks per pixel (the builds grow item by item: the last is the biggest)
//
// The hook (owner r:r489883: "the double extension is like you jump, place 2 blocks, and then land ... without the
// blocks, the jump would have been impossible"): first person, the course heads north over the jungle at y 220: a
// 2-gap sprint jump, then two mid-air clutches, escalating: a sprint jump at a 5-block gap, two blocks placed in the
// air against the near face of the block ahead (each extends it back toward you; aimed through lib/act.js, facing
// forward), landing on them; then a 7-block gap 2 down with three blocks placed the same way. Off the far block, the
// fall into the first item.
// The list (r:re392f9, r:r489883): each build stands VERTICAL (a pixel-art wall, leaned back a little) beside the fall
// line, and the camera tracks its middle as you fall past it (down at it, level, then up at it); the fall goes on into a
// 1x1 hole cut through the world under the fall line (a small clearing), the cut comes 0.3 s inside it (r:r188b46),
// straight to the next item falling out of the sky. Only one build exists at a time: the next goes up and the last
// comes down inside the cut (frames the edit drops).
// The loop (r:r489883 "the loop needs to work too"): the Short opens just after landing on the start block from the
// sky (the take starts with that fall) and ends just after the same landing: out of the last hole, the course is reset
// inside the cut (the placed blocks gone, the first build back up) and the same fall from the same point lands on it,
// so the last frame runs into the first.
// Sounds: the vanilla steps (harness), a step on every landing, the place sounds, entity.player.big_fall + the block's
// fall sound on the landings (vanilla plays both; fall_damage is off, so nobody dies).
const ARTS = require('./mislabel_art.json')

const YB = 220                       // the course blocks' y: low enough that the opening is the course over the jungle
const S0 = 18                        // the start block, this far south of the centre
const HOME_TOP = YB + 30             // the fall onto the start block (the opening and the end: the loop)
const HOME_PITCH = 50                // its look: vanilla degrees down, north along the course
const CUT = 8                        // the first ticks of each fall from rest cut out (a fall from rest reads as a hover)
const INTO = 0.3                     // s: the cut comes this long after the eye goes into the hole (r:r188b46)
const OVER = 40                      // each build's bottom row this far over the ground under it (jungle trees ~30)
const OVERHEAD = 60                  // each fall starts this far over its build's top
const LEAN = 0.3                     // blocks back per block up: near vertical, its face tilted a little up to the fall
const DIRS = [[0, -1], [1, 0], [-1, 0], [0, 1]]   // N, E, W, S (then round again): column -> build
const OFF = 30                       // items 2+: the fall line this far from the centre
const PLACE = 'oak_planks'           // the clutch blocks
// the course (x 0, z from the centre, y from YB): [z, dy, block]
const COURSE = [[S0, 0, 'gold_block'], [15, 0, 'yellow_glazed_terracotta'], [9, 0, 'light_blue_glazed_terracotta'], [1, -2, 'orange_glazed_terracotta']]
const ITEM1 = { x: 0, z: -4 }        // item 1's fall line: off the north end of the last block

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
    // vanilla's render-distance fog is max(xz, |y|) (renderer/page.js): at 18 chunks (288 blocks) the jungle shows from
    // every height here; the recorded area reaches the fog
    renderDistance: 18,
    recordRadius: 320,
    chunkStops (set) { return [[150, 150], [-150, 150], [150, -150], [-150, -150], [200, 0], [-200, 0], [0, 200], [0, -200]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz })) },
    edit: {
      caption: title,
      colors: items.map((_, k) => `${k + 1}=yellow`).join(','),
      // the number and grandma's name together, for the whole item (r:r489883); the title again on the fall home
      captions: [...items.map((it, k) => [ev(k), `${k + 1}. ${it.label}`]), ['home', title]],
      speed: [...items.slice(1).map((_, k) => [`end${k + 1}`, ev(k + 1), 'cut']), [`end${N}`, 'home', 'cut']],
      // the loop: from just after the first landing to just after the identical last one
      startAt: 'land0:0.1',
      endAfter: 'land:0.1',
      // the landing is the payoff in the packaged mix: the song's drop on it, the bed dipped 0.4 s before it, so the
      // vanilla landing is the hit (no impact sfx: on this quiet stunt the master's normalising pulled the steps under)
      dropAt: 'land',
      sfx: [['dip', 'land', 0.4]],
      ...edit
    },

    // item k: its fall line (the 1x1 hole under it), the vertical build beside it, where the fall starts
    plan (k, X, Z, groundAt) {
      const it = items[k], a = ARTS[it.art]
      if (!a) throw new Error(`no art ${it.art} in lib/mislabel_art.json (python3 scripts/mislabel_art.py ${it.art})`)
      const [ux, uz] = DIRS[k % 4], rx = -uz, rz = ux                 // right, as seen from the column
      const s = it.scale, W = a.rows[0].length * s, H = a.rows.length * s
      const side = k >= 4 ? 48 : 0      // the second time round a direction, 48 blocks to the side: other ground under it
      const cx = k === 0 ? X + ITEM1.x : X + ux * OFF + rx * side, cz = k === 0 ? Z + ITEM1.z : Z + uz * OFF + rz * side
      const D = Math.max(26, Math.round(H * 0.75))
      const holeTop = groundAt(cx, cz, true)
      let ground = holeTop
      for (const d of [D - 8, D, D + 8]) for (const o of [-W / 2, 0, W / 2]) ground = Math.max(ground, groundAt(cx + ux * d + rx * o, cz + uz * d + rz * o, true))
      const y0 = ground + OVER, midY = y0 + Math.floor(H / 2)
      const start = Math.min(330, y0 + H + OVERHEAD)
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
      // rows at the same depth with the same runs go up in one /fill
      const groups = new Map(), key = (cl) => `${cl.depth}|${cl.c0}|${cl.c1}|${cl.block}`
      for (const cl of cells) {
        const g = groups.get(key(cl))
        if (g && g.j1 === cl.j - 1) g.j1 = cl.j
        else groups.set(key(cl), { ...cl, j0: cl.j, j1: cl.j, prev: g })
      }
      const all = []
      for (let g of groups.values()) while (g) { all.push(g); g = g.prev }
      for (const g of all) {
        const off0 = g.c0 - W / 2, off1 = g.c1 - W / 2
        const xa = Math.floor(cx + ux * g.depth + rx * off0), za = Math.floor(cz + uz * g.depth + rz * off0)
        const xb = Math.floor(cx + ux * g.depth + rx * off1), zb = Math.floor(cz + uz * g.depth + rz * off1)
        fills.push(`/fill ${xa} ${y0 + g.j0} ${za} ${xb} ${y0 + g.j1} ${zb} ${g.block}`)
      }
      const dMin = D + Math.round(LEAN * (-H / 2)) - 1, dMax = D + Math.round(LEAN * (H / 2)) + 1
      const box = [cx + ux * dMin + rx * (-W / 2 - 1), cz + uz * dMin + rz * (-W / 2 - 1), cx + ux * dMax + rx * (W / 2 + 1), cz + uz * dMax + rz * (W / 2 + 1)].map(Math.floor)
      const clear = []
      for (let y = y0 - 1; y <= y0 + H; y += 6) clear.push(`/fill ${Math.min(box[0], box[2])} ${y} ${Math.min(box[1], box[3])} ${Math.max(box[0], box[2])} ${Math.min(y + 5, y0 + H)} ${Math.max(box[1], box[3])} air`)
      // the 1x1 hole through the world, in a 5x5 clearing (trees over it cut away, 70 up: a giant jungle tree's crown
      // caught a fall at 44)
      const hole = [`/fill ${cx - 2} ${holeTop + 1} ${cz - 2} ${cx + 2} ${holeTop + 70} ${cz + 2} air`, `/fill ${cx} -64 ${cz} ${cx} ${holeTop} ${cz} air`]
      const mid = { x: cx + 0.5 + ux * D, y: midY + 0.5, z: cz + 0.5 + uz * D }
      return { cx, cz, ux, uz, H, W, D, mid, fills, clear, hole, holeTop, start, top: y0 + H, cut: CUT }
    },

    async burst (ctx, cmds) {      // many /fills at once: the server runs them in a tick or two
      const { bot } = ctx
      for (let i = 0; i < cmds.length; i++) { bot.chat(cmds[i]); if (i % 40 === 39) await bot.waitForTicks(1) }
      await bot.waitForTicks(6)
    },

    // the course as it is before the take: its blocks, nothing placed (the end resets it to this for the loop)
    courseCmds (X, Z) {
      const out = [`/fill ${X - 1} ${YB - 3} ${Z - 1} ${X + 1} ${YB + 3} ${Z + S0 + 1} air`]
      for (const [dz, dy, b] of COURSE) out.push(`/setblock ${X} ${YB + dy} ${Z + dz} ${b}${b.includes('glazed') ? '[facing=north]' : ''}`)
      return out
    },

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      const X = sp.x, Z = sp.z
      Object.assign(this, { X, Z })
      await ctx.defaultRules()
      await ctx.cmd('/gamerule fall_damage false', { mayFail: true })   // the landings from the sky onto the start block
      await ctx.cmd(`/setblock ${X} ${YB} ${Z + S0} gold_block`)
      await ctx.tpCheck(X + 0.5, YB + 1, Z + S0 + 0.5, 180, HOME_PITCH)
      await ctx.forceload({ x0: X - 130, z0: Z - 130, x1: X + 130, z1: Z + 130 })
      await this.burst(ctx, this.courseCmds(X, Z))
      // the ground under each fall: terrain only (trees, our own blocks and a retry's leftovers don't count)
      const ours = new Set([PLACE, ...COURSE.map(c => c[2]), ...Object.values(ARTS).flatMap(a => Object.values(a.palette))])
      const tree = /_leaves$|_log$|_wood$|vine|cocoa|bamboo|melon|pumpkin/
      const groundAt = (x, z, terrain) => {
        for (let y = 300; y > -60; y--) {
          const b = bot.blockAt(new ctx.Vec3(Math.floor(x), y, Math.floor(z)))
          if (b && b.name !== 'air' && b.name !== 'cave_air' && !ours.has(b.name) && b.boundingBox === 'block' && !(terrain && tree.test(b.name))) return y
        }
        return 64
      }
      this.plans = items.map((_, k) => this.plan(k, X, Z, groundAt))
      for (const [k, pl] of this.plans.entries()) ctx.log(`item ${k + 1}: ${items[k].art} ${pl.W}x${pl.H} at D ${pl.D}, middle y ${pl.mid.y}, hole at ${pl.cx} ${pl.cz} from ${pl.holeTop}, fall from ${pl.start}, ${pl.fills.length} fills`)
      await this.burst(ctx, [...this.plans.flatMap(pl => pl.hole), ...this.plans.flatMap(pl => pl.clear), ...this.plans[0].fills])
      await ctx.hotbar([[PLACE, 16]])
      ctx.select(0)
      await ctx.cmd('/gamemode survival')
      await ctx.tpCheck(X + 0.5, YB + 1, Z + S0 + 0.5, 180, HOME_PITCH)
      await bot.waitForTicks(10)
      return { x: X, y: YB, z: Z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { X, Z } = this
      const A = require('./act')(ctx)
      const eyeNow = () => bot.entity.position.offset(0, 1.62, 0)
      // the camera's own turns: eased toward the target, at most 9 deg a tick (180 deg/s)
      const MAXT = 9 * Math.PI / 180
      const turnTo = (yaw, pitch) => {
        let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        const dp = pitch - bot.entity.pitch, m = Math.max(Math.abs(dy), Math.abs(dp)), f = m > MAXT ? MAXT / m : 1
        bot.look(bot.entity.yaw + dy * f, bot.entity.pitch + dp * f, true)
      }
      let pitchNow = null, aim = null
      const lookPitch = (pitch, k = 0.3) => { pitchNow = pitchNow === null ? bot.entity.pitch : pitchNow + (pitch - pitchNow) * k; turnTo(0, pitchNow) }
      const viewPoint = (dist) => { const { yaw, pitch } = bot.entity; return eyeNow().plus(new Vec3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).scaled(dist)) }
      const lookAt = (p, k) => {
        if (!aim) aim = viewPoint(p.minus(eyeNow()).norm())
        aim = aim.plus(p.minus(aim).scaled(k))
        const d = aim.minus(eyeNow())
        turnTo(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)))
      }
      const stepSound = (vol = 0.15, kind = 'step') => {
        const under = bot.blockAt(bot.entity.position.offset(0, -0.2, 0))
        if (under && under.name !== 'air') ctx.sound(`block.${ctx.soundGroup(under.name)}.${kind}`, vol)
      }
      const RUN = Math.atan2(-1.62, 2.6)          // the running look: ~32 deg down, the next block in view
      const zc = (dz) => Z + dz + 0.5
      // the fall from the sky onto the start block: the opening and the end (the loop)
      const fallHome = async (tag) => {
        await bot.waitForTicks(CUT - 4)
        ctx.mark(tag)
        for (let t = 0; t < 120 && !bot.entity.onGround; t++) await bot.waitForTicks(1)
        ctx.sound('entity.player.big_fall', 1)
        stepSound(0.5, 'fall')
      }
      // a sprint jump north from the block at zFrom (cell); with `ext` a mid-air clutch: the blocks zB+n .. zB+1 (cells,
      // at y yB) go in one by one against the near face of the one ahead, the far one first, while in the air
      const landZ = (floorY) => {      // where a jump comes down with no keys held (air drag 0.91; gravity 0.08, drag 0.98)
        let { z, y } = bot.entity.position, vz = bot.entity.velocity.z, vy = bot.entity.velocity.y
        for (let i = 0; i < 60; i++) { vy = (vy - 0.08) * 0.98; y += vy; vz *= 0.91; z += vz; if (vy < 0 && y <= floorY) break }
        return z
      }
      const jump = async (zFrom, ext = null, zTarget = null) => {
        let air = false, placed = 0, lastPlace = -99, t = 0
        bot.setControlState('sprint', true); bot.setControlState('forward', true)
        for (; t < 90; t++) {
          const p = bot.entity.position
          if (bot.entity.onGround) {
            if (air) { stepSound(0.2); ctx.mark('land_jump'); break }
            lookPitch(RUN)
            bot.setControlState('jump', p.z <= Z + zFrom + 0.25)
          } else {
            if (!air) { air = true; ctx.mark('jump'); bot.setControlState('jump', false) }
            if (ext && placed < ext.n && ctx.tick - lastPlace >= 4) {
              const i = placed + 1, zf = ext.zB + i       // the new block's cell; it goes against the face at z = zf
              const pt = new Vec3(X + 0.5, ext.yB + 0.5, Z + zf)
              await A.click(new Vec3(X, ext.yB, Z + zf - 1), 3, [0.5, 0.5, 1], { point: pt, swing: true, max: 6, strict: true })
              ctx.mark('place_on', { x: X, y: ext.yB, z: Z + zf, ax: X, ay: ext.yB, az: Z + zf - 1 })
              ctx.mark('extend')
              ctx.sound(`block.${ctx.soundGroup(PLACE)}.place`, 1, 0.8)
              placed++; lastPlace = ctx.tick; pitchNow = null
              continue
            }
            if (!ext || placed >= ext.n) lookPitch(RUN)
            if (zTarget !== null) bot.setControlState('forward', landZ(YB + 1) > Z + zTarget + 0.15)   // a plain jump: onto the block's middle
          }
          await bot.waitForTicks(1)
        }
        bot.clearControlStates()
        if (ext && placed < ext.n) ctx.log(`clutch: landed after ${placed} of ${ext.n} blocks`)
        if (bot.entity.position.y < YB - 4) throw new Error('fell off the course')
      }
      // ---- the opening: the fall from the sky onto the start block, then the course
      await ctx.cmd(`/tp @s ${X + 0.5} ${HOME_TOP} ${Z + S0 + 0.5} 180 ${HOME_PITCH}`)
      await fallHome('home0')
      ctx.mark('land0')
      bot.waitForTicks(3).then(() => ctx.sound('block.metal.step', 0.5))   // the first sprint step: the opening's hit
      pitchNow = null
      await jump(S0, null, 15.5)                                    // a 2-gap onto the yellow block
      await jump(15, { zB: 9, yB: YB, n: 2 })                        // a 5-gap: a double extension in the air
      for (let t = 0; t < 30 && bot.entity.position.z > zc(9) + 0.2; t++) { bot.setControlState('forward', true); bot.setControlState('sprint', true); lookPitch(RUN); await bot.waitForTicks(1) }
      await jump(9, { zB: 1, yB: YB - 2, n: 3 })                     // a 7-gap 2 down: a triple extension in the air
      for (let t = 0; t < 30 && bot.entity.position.z > zc(1) + 0.2; t++) { bot.setControlState('forward', true); bot.setControlState('sprint', true); lookPitch(RUN); await bot.waitForTicks(1) }
      // off the far end into the first item's fall: air strafing (keys only) onto its 1x1 hole
      bot.setControlState('forward', true); bot.setControlState('sprint', true)
      for (let t = 0; t < 30 && bot.entity.onGround; t++) { lookPitch(RUN); await bot.waitForTicks(1) }
      bot.setControlState('sprint', false)
      // ---- the list: each item a fall past its vertical build, the camera tracking it, into the 1x1 hole
      const fallInto = async (k) => {
        const pl = this.plans[k]
        let inAt = null, passed = false
        aim = null
        for (let t = 0; t < 300; t++) {
          const p = bot.entity.position, v = bot.entity.velocity, eye = p.y + 1.62
          lookAt(new Vec3(pl.mid.x, pl.mid.y, pl.mid.z), k === 0 ? 0.25 : 0.5)
          if (!passed && eye < pl.top) { passed = true; ctx.mark(`pass${k + 1}`) }
          if (inAt === null && eye > pl.holeTop + 3) {
            // onto the hole's column (keys only; the view is the tracking): aimed where the drift would carry
            const ex = pl.cx + 0.5 - (p.x + 11 * v.x), ez = pl.cz + 0.5 - (p.z + 11 * v.z)
            const fwd = -Math.sin(bot.entity.yaw) * ex - Math.cos(bot.entity.yaw) * ez, rgt = Math.cos(bot.entity.yaw) * ex - Math.sin(bot.entity.yaw) * ez
            bot.setControlState('forward', fwd > 0.04); bot.setControlState('back', fwd < -0.04)
            bot.setControlState('right', rgt > 0.04); bot.setControlState('left', rgt < -0.04)
          } else if (inAt === null) {
            bot.clearControlStates()
            if (Math.abs(p.x - pl.cx - 0.5) > 0.2 || Math.abs(p.z - pl.cz - 0.5) > 0.2) throw new Error(`off the 1x1 hole: at ${p.x.toFixed(2)} ${p.z.toFixed(2)}, hole ${pl.cx} ${pl.cz}`)
          }
          if (inAt === null && eye <= pl.holeTop + 1) { inAt = t; ctx.mark(`hole${k + 1}`) }
          if (inAt !== null && t - inAt >= Math.round(INTO * 20)) break
          await bot.waitForTicks(1)
        }
        bot.clearControlStates()
      }
      for (let i = 0; i < N; i++) {
        if (i > 0) {
          const pl = this.plans[i], prev = this.plans[i - 1]
          // the cut (inside the hole): up into the sky over the next fall line looking at its build, the last build
          // cleared, the next built, then a fresh fall from rest
          const d = new Vec3(pl.mid.x - pl.cx - 0.5, pl.mid.y - pl.start - 1.62, pl.mid.z - pl.cz - 0.5)
          const yawDeg = Math.atan2(-d.x, d.z) * 180 / Math.PI, pitchDeg = -Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI
          await ctx.cmd(`/tp @s ${pl.cx + 0.5} ${pl.start} ${pl.cz + 0.5} ${yawDeg.toFixed(1)} ${pitchDeg.toFixed(1)}`)
          await this.burst(ctx, [...prev.clear, ...pl.fills])
          await ctx.cmd(`/tp @s ${pl.cx + 0.5} ${pl.start} ${pl.cz + 0.5} ${yawDeg.toFixed(1)} ${pitchDeg.toFixed(1)}`)
          await bot.waitForTicks(pl.cut - 4)   // (ctx.cmd waited 4)
        }
        ctx.mark(ev(i))
        await fallInto(i)
        ctx.mark(`end${i + 1}`)
      }
      // ---- the end: out of the last hole, the course reset to how the take began (the placed blocks gone, the first
      // build back), and the same fall from the sky onto the start block: the loop
      await ctx.cmd(`/tp @s ${X + 0.5} ${HOME_TOP} ${Z + S0 + 0.5} 180 ${HOME_PITCH}`)
      await this.burst(ctx, [...this.plans[N - 1].clear, ...this.courseCmds(X, Z), ...this.plans[0].fills])
      await ctx.cmd(`/tp @s ${X + 0.5} ${HOME_TOP} ${Z + S0 + 0.5} 180 ${HOME_PITCH}`)
      await fallHome('home')
      ctx.mark('land')
      await bot.waitForTicks(20)
      return bot.health > 0
    }
  }
}

module.exports = mislabel
module.exports.fallen = fallen
