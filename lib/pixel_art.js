// Pixel-art reveal factory, 30 s multi-beat format (owner 2026-11-06: Shorts of 30 s or more, no dead
// space, end as soon as the payoff comes). Three walls around the bot, each a bigger version of the
// picture: a small one to the left (west), the medium one ahead (north), then a ridiculous one to
// the right (east). The bot builds each block by block with real survival placements, the crosshair
// following every block; each reveal lands with a short step back, then it turns to the next wall.
// The last reveal is the payoff ('complete'); the Short ends ~0.9 s after it (edit.endAfter).
//   stages  [{ art, first?, order? }, ...] (art: rows of characters, '.' = empty)
//   palette char -> block (shared by every stage)
//   first   chars placed first (e.g. the features), the rest fill from the outside in
//   scatter the first chars go down in a scrambled order
//   order   'random': scrambled order in runs of one colour (an outline would give the picture away)
//   tpb     ticks per block (default by size: 2.5 small, 2 medium, 1.5 big)
//   decoy   another picture, same size: part of it (decoyFrac, default 0.6) goes up first so it looks
//           like that, then the blocks that don't belong are cleared with shears and the real
//           picture is built (a misdirect: "it's a sword... no, a pickaxe")
// upscale(art, k) makes the big version of a picture.
const SIGHT = require('./sight')
const { roomBehind } = require('./act')
// the clear room kept behind the player while it backs away from a build (owner 2026-11-11, creeper_art: "it walks all
// the way back into like the other one ... halfway against the wall"): the back key is let go before this
const ROOM = 3
const DIRS = [[-1, 0], [0, -1], [1, 0]]           // west, north, east: left, ahead, right
const FACE = { '-1,0': 5, '0,-1': 3, '1,0': 4 }   // protocol face of the wall block that faces the bot, by direction

function upscale (art, k) {
  const out = []
  for (const row of art) { const r = row.split('').map(ch => ch.repeat(k)).join(''); for (let i = 0; i < k; i++) out.push(r) }
  return out
}

function pixelArt ({ name, stages, palette, caption, edit, wall = 'stone_bricks', biome = 'minecraft:plains' }) {
  const chars = Object.keys(palette)
  return {
    name,
    biome: process.env.BIOME || biome,
    caption,
    // a zoom punch on the completing block: the pull-back starts eased (governed camera), so the payoff
    // needs its own picture hit (pace: no picture change within 0.3 s of the payoff)
    // a stage's `lapse` plays its build as a time-lapse (reveals, turns and the last blocks in real time)
    edit: {
      punch: [['complete', 0, 1.12]],
      sfx: [['impact', 'complete', { gain: 0.8 }]],   // a hit on the payoff (looks_wrong's soft wool landed under the song: pace)
      flash: [['complete', 0, 0.45]],   // pace reads a flash as the payoff's picture change (an eased zoom punch alone isn't one)
      ...(stages.some(st => st.lapse) ? { speed: stages.map((st, k) => st.lapse && [`build${k}:0.1`, `built${k}:${k === stages.length - 1 ? -0.4 : -0.2}`, st.lapse]).filter(Boolean) } : {}),
      ...edit
    },

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      if (!g) throw new Error('no dry land near spawn')
      const { x, z } = g, floor = g.y
      this.x = x; this.z = z; this.floor = floor
      await ctx.defaultRules()
      // the bot stands on open ground and every picture sits on the ground (a mound's edge hid the
      // bottom rows of the big one: worker QA); the final reveal walks backwards across the field
      const RISE = 0
      // a clearing all round (a cut hillside at its edge read as a command-built box); slabs under
      // the 32768-block /fill cap
      // a big clearing (its edge out in the fog: a sliced hillside with floating leaves showed behind
      // the big wall at 56), cleared in pieces under the 32768-block /fill cap
      const R = 112   // 80 still showed a sliced hillside behind the big wall (worker QA)
      const maxH = Math.max(...stages.map(st => st.art.length))
      await ctx.cmd(`/kill @e[type=!player,x=${x},y=${floor},z=${z},distance=..${R + 30}]`)   // a polar bear buried by the floor fill suffocated off-screen (worker QA)
      const fillBig = async (x0, y0, z0, x1, y1, z1, block) => {
        const per = Math.max(1, Math.floor(32768 / ((y1 - y0 + 1) * (z1 - z0 + 1))))
        for (let xa = x0; xa <= x1; xa += per) {
          // big fills can stall the server past mineflayer's tick wait: send, then wait until it ticks again
          bot.chat(`/fill ${xa} ${y0} ${z0} ${Math.min(x1, xa + per - 1)} ${y1} ${z1} ${block}`)
          await new Promise(r => setTimeout(r, 150))
          for (let i = 0; i < 10; i++) { try { await bot.waitForTicks(1); break } catch (e) { ctx.log('fill still running', i) } }
        }
      }
      for (let y0 = floor + 1; y0 <= floor + maxH + 24; y0 += 8) await fillBig(x - R, y0, z - R, x + R, y0 + 7, z + R, 'air')
      await fillBig(x - R, floor, z - R, x + R, floor, z + R, 'grass_block')
      await fillBig(x - R, floor - 2, z - R, x + R, floor - 1, z + R, 'dirt')
      const eyeY = floor + RISE + 1 + 1.62
      // the walls: stage k faces the bot from DIRS[k], at a distance that frames it
      this.walls = []
      let reach = 0
      for (let k = 0; k < stages.length; k++) {
        const art = stages[k].art, H = art.length, W = art[0].length
        const [fx, fz] = DIRS[k], rx = -fz, rz = fx
        // every wall at the same distance, so the size difference shows (scaling the distance with
        // the picture framed all three the same: worker QA)
        const dist = stages[k].dist || 12
        const ybase = Math.max(floor + 1, Math.round(eyeY - H / 2))   // bottom row of the art
        const cx = x + fx * dist, cz = z + fz * dist             // the art plane; the wall is one further
        const lo = -(W >> 1) - 1, hi = W - (W >> 1)
        const ax = cx + fx + rx * lo, az = cz + fz + rz * lo, bx = cx + fx + rx * hi, bz = cz + fz + rz * hi
        await ctx.cmd(`/fill ${Math.min(ax, bx)} ${floor + 1} ${Math.min(az, bz)} ${Math.max(ax, bx)} ${ybase + H} ${Math.max(az, bz)} ${wall}`)
        this.walls.push({ fx, fz, rx, rz, cx, cz, ybase, H, W })
        reach = Math.max(reach, Math.hypot(dist + 1, W / 2 + 1, Math.max(ybase + H - eyeY, eyeY - ybase) + 1))   // pictures stand on the ground: the top is far above the eye
      }
      // the room behind each build spot (facing wall k, backing away from it): the walk back stops ROOM blocks short of
      // whatever is there (perform), so a lane shorter than the walk back just makes a shorter pull-back. Logged.
      {
        const solid = (bx, by, bz) => { const q = bot.blockAt(new ctx.Vec3(bx, by, bz)); return !!(q && q.boundingBox === 'block') }
        this.lanes = this.walls.map(w => +roomBehind({ x: x + 0.5, y: floor + RISE + 1, z: z + 0.5 }, Math.atan2(-w.fx, -w.fz), solid, 24).toFixed(1))
        ctx.log(`pixel art: clear room behind each build spot ${this.lanes.join(' / ')} blocks (the walk back stops ${ROOM} short)`)
      }
      await ctx.cmd(`/attribute @s minecraft:block_interaction_range base set ${Math.ceil(reach) + 13}`)   // + the walk back (~9 blocks)   // the big art's far corners
      // the hotbar: as many stacks of each colour as the three pictures need
      const need = {}
      for (const st of stages) {
        for (const row of st.art) for (const ch of row) if (palette[ch]) need[ch] = (need[ch] || 0) + 1
        if (st.decoy) for (const row of st.decoy) for (const ch of row) if (palette[ch]) need[ch] = (need[ch] || 0) + 1
      }
      const tool = stages.some(st => st.decoy) ? 1 : 0
      this.slots = {}
      const bar = []
      const stacks = chars.reduce((n, ch) => n + Math.ceil((need[ch] || 0) / 64), 0)
      // one slot per stack if they fit; otherwise one slot per colour, restocked from the inventory
      // as it runs out
      this.restock = stacks + tool > 9
      for (const ch of chars) {
        this.slots[ch] = []
        const n = this.restock ? (need[ch] ? 1 : 0) : Math.ceil((need[ch] || 0) / 64)
        for (let i = 0; i < n; i++) { this.slots[ch].push(bar.length); bar.push([palette[ch], 64]) }
      }
      if (tool) { this.shears = bar.length; bar.push('shears[enchantments={efficiency:5}]') }   // Efficiency V shears break wool at once
      if (bar.length > 9) throw new Error(`hotbar needs ${bar.length} slots`)
      await ctx.hotbar(bar)
      await ctx.tpCheck(x + 0.5, floor + RISE + 1, z + 0.5, 90, 0)   // vanilla yaw 90: facing west, the first wall
      await ctx.cmd('/gamemode survival')
      ctx.select(this.slots[(stages[0].first || chars[0])[0]][0])   // holding what the first block is
      const w0 = this.walls[0]
      await ctx.easeLookAt(new ctx.Vec3(w0.cx + 0.5, w0.ybase + w0.H / 2, w0.cz + 0.5), 50)
      await bot.waitForTicks(20)
      return { x, y: floor, z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const used = {}
      const slotFor = (ch) => this.restock ? this.slots[ch][0] : this.slots[ch][Math.min(this.slots[ch].length - 1, Math.floor((used[ch] || 0) / 64))]
      const usedOne = (ch) => {
        used[ch] = (used[ch] || 0) + 1
        if (this.restock && used[ch] % 64 === 0) bot.chat(`/item replace entity @s hotbar.${this.slots[ch][0]} with ${palette[ch]} 64`)   // restocked
      }
      let aim = null
      // the camera follows the block being placed (the crosshair lands on it), smoothed so it
      // sweeps like a player's instead of snapping
      // ...and governed like a hand on a mouse: turn speed under ~220 deg/s, eased in and out (the
      // turn to the next wall whipped at 290-390 deg/s and jerked 150-215 deg/s in one tick: owner,
      // "the head jerking around")
      const VMAX = 11 * Math.PI / 180, ACC = 6 * Math.PI / 180   // per tick, per tick per tick
      let yaw = bot.entity.yaw, pitch = bot.entity.pitch, vy = 0, vp = 0
      const solid = (bx, by, bz) => { const q = bot.blockAt(new Vec3(bx, by, bz)); return !!(q && q.boundingBox === 'block') }
      let stopped = false, curK = 0
      const lookToward = async (target, ticks, k = 0.45) => {
        for (let i = 0; i < ticks; i++) {
          // never back into an earlier wall (heart_art's pull-back stopped dead against the first one; creeper_art's
          // walked "halfway against the wall"): the back key goes up ROOM blocks (+ the 0.26-block coast) short of it
          // (and along the wall's own axis: the back key follows the yaw, which tracks the blocks, so the walk drifts
          // sideways and the ray along the yaw slid past the narrow first wall's edge: creeper_art re-take, eye 0.9
          // blocks from its plane)
          const pos = bot.entity.position, cw = this.walls[curK]
          const along = cw && this.lanes ? (pos.x - this.x - 0.5) * -cw.fx + (pos.z - this.z - 0.5) * -cw.fz : -Infinity
          if (bot.controlState.back && (roomBehind(pos, yaw, solid, ROOM + 2) <= ROOM + 0.5 || (this.lanes && along >= this.lanes[curK] - ROOM - 0.5))) {
            bot.setControlState('back', false)
            if (!stopped) { stopped = true; ctx.log(`pixel art: the walk back stopped ${ROOM} blocks short of a wall`) }
          }
          const want = aim ? aim.plus(target.minus(aim).scaled(k)) : target.clone()
          const eye = bot.entity.position.offset(0, 1.62, 0), d = want.minus(eye)
          let dy = Math.atan2(-d.x, -d.z) - yaw
          dy = Math.atan2(Math.sin(dy), Math.cos(dy))
          const dp = Math.atan2(d.y, Math.hypot(d.x, d.z)) - pitch
          const R = Math.hypot(dy, dp)
          const s = R > 1e-6 ? Math.min(VMAX, Math.sqrt(2 * ACC * R), R) / R : 0   // brakes in time to stop on it
          let ay = dy * s - vy, ap = dp * s - vp
          const am = Math.hypot(ay, ap)
          if (am > ACC) { ay *= ACC / am; ap *= ACC / am }
          vy += ay; vp += ap
          yaw += vy; pitch += vp
          const dist = d.norm(), cp = Math.cos(pitch)
          aim = eye.plus(new Vec3(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp).scaled(dist))
          await bot.look(yaw, pitch, true)
          await bot.waitForTicks(1)
        }
      }
      const place = (wl, cell) => bot._client.write('block_place', {   // motion-ok: every call is after landOn (the crosshair in the cell)
        hand: 0, location: cell.p.offset(wl.fx, 0, wl.fz), direction: FACE[`${wl.fx},${wl.fz}`],
        cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0
      })
      // the crosshair on the cell (owner r:rffba12: the aim lagged the blocks at 18-20 a second): a block is only placed
      // or broken once the ray from the eye along the current view enters its cell; the camera keeps turning (at most
      // 220 deg/s, eased) until it does, and those ticks come out of the build's tick budget. So the build goes no faster
      // than the aim can follow.
      const onCell = (p) => {
        const e = bot.entity.position.offset(0, 1.62, 0)
        return SIGHT.crosshairBox([e.x, e.y, e.z], yaw, pitch, [p.x, p.y, p.z, p.x + 1, p.y + 1, p.z + 1], () => null, { reach: 128 }).on
      }
      let offAim = 0
      const landOn = async (p, max = 12) => {
        let n = 0
        while (!onCell(p) && n < max) { await lookToward(p.offset(0.5, 0.5, 0.5), 1, 1); n++ }
        if (!onCell(p)) { offAim++; ctx.mark('off_aim', { x: p.x, y: p.y, z: p.z }); ctx.log('pixel art: the crosshair did not reach', p.toString()) }
        return n
      }
      let lastSwing = -99, ok = 0, total = 0
      for (let k = 0; k < stages.length; k++) {
        curK = k
        const st = stages[k], wl = this.walls[k], { H, W } = wl
        const mkCells = (art) => {
          const out = []
          for (let r = 0; r < H; r++) {
            for (let c = 0; c < W; c++) {
              const ch = art[r][c]
              if (!palette[ch]) continue
              const off = c - (W >> 1)
              const dc = c - (W - 1) / 2, dr = r - (H - 1) / 2
              out.push({ p: new Vec3(wl.cx + wl.rx * off, wl.ybase + (H - 1 - r), wl.cz + wl.rz * off), ch, ring: Math.max(Math.abs(c - (W >> 1)), Math.abs(r - (H >> 1))), ang: Math.atan2(dr, dc) })
            }
          }
          return out
        }
        const cells = mkCells(st.art)
        const order = (cells, random, seedBase) => {
        let seq = []
        if (random) {
          let seed = seedBase
          const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
          const byCh = {}
          for (const c of cells.slice().sort(() => rnd() - 0.5)) (byCh[c.ch] = byCh[c.ch] || []).push(c)
          const keys = Object.keys(byCh); let i = 0
          // each run is a nearest-neighbour walk (random spots every tick thrashed the camera: worker QA)
          let prev = null
          const walk = (run) => { const out = []; while (run.length) { let bi = 0; if (prev) { let bd = Infinity; run.forEach((c, j) => { const d = c.p.distanceTo(prev.p); if (d < bd) { bd = d; bi = j } }) } prev = run.splice(bi, 1)[0]; out.push(prev) } return out }
          while (keys.some(key => byCh[key].length)) { const key = keys[i % keys.length]; seq.push(...walk(byCh[key].splice(0, 5 + (i % 4)))); i++ }
        } else {
          const first = st.first || ''
          let seed = 31 + k
          const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
          // scatter: the features go down in a scrambled order, so they don't read as a face early
          // in short nearest-neighbour runs (fully random spots whipped the camera ~200°/s and blocks landed
          // away from the crosshair: worker QA)
          let prev = null
          const walk = (run) => { const out = []; while (run.length) { let bi = 0; if (prev) { let bd = Infinity; run.forEach((c, j) => { const d = c.p.distanceTo(prev.p); if (d < bd) { bd = d; bi = j } }) } prev = run.splice(bi, 1)[0]; out.push(prev) } return out }
          for (const ch of first) {
            const fc = cells.filter(c => c.ch === ch)
            if (!st.scatter) { seq.push(...walk(fc)); continue }   // (sorted by height it ping-ponged between the eyes)
            const mixed = fc.sort(() => rnd() - 0.5)
            for (let i = 0; mixed.length; i++) seq.push(...walk(mixed.splice(0, 3 + (i % 3))))
          }
          // each ring goes round its perimeter, so consecutive blocks are neighbours (sorting by height
          // alternated the left and right columns and the camera jittered between them)
          const rest = cells.filter(c => !first.includes(c.ch)).sort((a, b) => b.ring - a.ring || a.ang - b.ang)
          // ...and each colour as a nearest-neighbour walk from there (ring order within one colour put
          // consecutive blocks on opposite sides of the face: a 600°/s whip)
          for (const ch of chars.filter(c => !first.includes(c))) seq.push(...walk(rest.filter(c => c.ch === ch)))
        }
        return seq
        }
        const lastStage = k === stages.length - 1
        ctx.mark('stage', { k, cells: cells.length })
        ctx.mark(`build${k}`)   // unique marks for the edit's time-lapse spans
        let todo = cells
        if (st.decoy) {
          // the misdirect: part of the decoy goes up first, then the blocks that don't belong come down
          const decoy = order(mkCells(st.decoy), true, 197 + k)
          const part = decoy.slice(0, Math.floor(decoy.length * (st.decoyFrac || 0.6)))
          await placeSeq(part, st.decoyTpb || 2, 0.15, false)
          ctx.mark('twist', { k })
          const want = new Map(cells.map(c => [c.p.toString(), c.ch]))
          const wrong = part.filter(c => want.get(c.p.toString()) !== c.ch)
          ctx.select(this.shears)
          await bot.waitForTicks(4)
          for (const c of wrong) {
            await lookToward(c.p.offset(0.5, 0.5, 0.5), 1, 0.3)
            await landOn(c.p)
            const loc = { x: c.p.x, y: c.p.y, z: c.p.z }
            bot._client.write('block_dig', { status: 0, location: loc, face: FACE[`${wl.fx},${wl.fz}`], sequence: 0 })   // motion-ok: after landOn
            bot._client.write('block_dig', { status: 2, location: loc, face: FACE[`${wl.fx},${wl.fz}`], sequence: 0 })   // motion-ok: after landOn
            if (ctx.tick - lastSwing >= 3) { bot.swingArm(); lastSwing = ctx.tick }
            ctx.sound('block.wool.break', 0.8, 1)
            ctx.particles('block', c.p, { block: palette[c.ch] })
          }
          const kept = new Set(part.filter(c => want.get(c.p.toString()) === c.ch).map(c => c.p.toString()))
          todo = cells.filter(c => !kept.has(c.p.toString()))
        }
        const seq = order(todo, st.order === 'random', 97 + k)
        // ticks per block: the bigger the picture, the faster (it escalates, and fits the Short)
        const tpb = st.tpb || (cells.length >= 120 ? 1.45 : cells.length >= 30 ? 2 : 2.5)
        await placeSeq(seq, tpb, st.order === 'random' ? 0.15 : 0.45, lastStage && k > 0)
        async function placeSeq (seq, tpb, follow, withBackup) {
        let budget = 0, ci = 0, ci2 = 0, ci3 = 0, lastAccent = -99   // (no mid-build glance: owner, the turn away from the big one was weird)
        let backing = 0, prevTarget = null
        for (const cell of seq) {
          // partway through the big one (at 80% the close-up laps round its rings ran 12 s: worker QA): walk back while still placing (a new shot, the face grows in view)
          if (withBackup && ci++ === Math.floor(seq.length * 0.45)) { ctx.mark('backup'); bot.setControlState('back', true); backing = 40 }   // far enough back that the whole face grows in frame
          if (backing > 0 && --backing === 0) bot.setControlState('back', false)
          const slot = slotFor(cell.ch)
          const newRun = bot.quickBarSlot !== slot
          if (newRun) ctx.select(slot)
          const target = cell.p.offset(0.5, 0.5, 0.5)   // (follow: a scrambled build gets a looser sweep, not a chase)
          // a long jump (not the next block along) gets a few more ticks to get there, so the block lands
          // under the crosshair (on every block it doubled heart_art's length)
          // (measured from the last block, not from the camera: the governed camera trails a run of
          // neighbours, and counting that as a jump tripled heart_art's big stage)
          const jump = tpb >= 1 && follow >= 0.3 && prevTarget && prevTarget.distanceTo(target) > 3   // a scrambled build's loose sweep never waits (every block is a jump: heart_art's big stage ran 65 s)
          prevTarget = target
          if (tpb >= 1 || (ci2++ % Math.round(1 / tpb)) === 0) await lookToward(target, 1, follow)   // tpb < 1: several blocks a tick
          for (let i = 0; jump && i < 3 && aim.distanceTo(target) > 1.2; i++) await lookToward(target, 1, 0.5)
          const waited = await landOn(cell.p)
          place(wl, cell)
          if (ctx.tick - lastSwing >= 3) { bot.swingArm(); lastSwing = ctx.tick }   // ctx.tick: bot.time.age only updates once a second
          // a dense build (a block a tick) is one steady hiss: accent the first block of each run and every
          // 6th, the rest softer, so the build keeps a beat (pace read 3.6 s of heart_art's big one as dead)
          // (several blocks a tick: an accent every 8 ticks at most, the rest near-silent; sword_art's big one
          // still read as 4.3 s dead)
          const accent = tpb >= 1.3 || (tpb >= 1 ? newRun || (ci3++ % 6) === 0 : ctx.tick - lastAccent >= 8)
          if (accent) lastAccent = ctx.tick
          ctx.sound(`block.${ctx.soundGroup(palette[cell.ch])}.place`, accent ? 1.0 : tpb >= 1 ? 0.3 : 0.1, 0.8 + ((used[cell.ch] || 0) % 3) * 0.05)
          usedOne(cell.ch)
          budget += Math.max(0, tpb - 1) - waited   // the ticks spent landing the aim are part of this block's time
          while (budget >= 1) { budget -= 1; await lookToward(target, 1, follow) }
        }
        }
        // a placement can be dropped (sent the same tick as a slot change): redo any missing, quickly
        await bot.waitForTicks(1)
        for (const cell of cells) {
          const b = bot.blockAt(cell.p)
          if (b && b.name === palette[cell.ch]) continue
          ctx.log('redo', cell.ch, cell.p.toString(), 'was', b && b.name)
          ctx.select(slotFor(cell.ch))
          await lookToward(cell.p.offset(0.5, 0.5, 0.5), 1)
          await landOn(cell.p)
          place(wl, cell); bot.swingArm(); usedOne(cell.ch)
        }
        // the reveal: on the completing tick, a short step back while recentring on the whole picture
        const centre = new Vec3(wl.cx + 0.5, wl.ybase + H / 2 - (k === stages.length - 1 ? 3 : 0.6), wl.cz + 0.5)   // the big one aimed low: clear of the hotbar and hand
        const last = k === stages.length - 1
        ctx.mark(`built${k}`)
        ctx.mark(last ? 'complete' : 'reveal', { k })
        bot.setControlState('back', true)
        if (last) { for (let i = 0; i < 40; i++) await lookToward(centre, 1, 0.25) }   // a real pull-back to the end
        else await lookToward(centre, 5, 0.3)
        bot.setControlState('back', false)
        if (last) await lookToward(centre, 4, 0.2)
        else await lookToward(centre, 5, 0.3)
        for (const cell of cells) { total++; const b = bot.blockAt(cell.p); if (b && b.name === palette[cell.ch]) ok++ }
        if (!last) {
          // back to the middle of the mound, turning to the next wall (the turn is the next beat)
          const nx = this.walls[k + 1], nc = new Vec3(nx.cx + 0.5, nx.ybase + nx.H / 2, nx.cz + 0.5)
          bot.setControlState('forward', true)
          await lookToward(nc, 5, 0.25)
          bot.setControlState('forward', false)
          await lookToward(nc, 6, 0.35)
        }
      }
      ctx.log(`correct ${ok}/${total}${offAim ? `, ${offAim} placed with the crosshair off the block` : ''}`)
      return ok >= total - 2 && offAim <= 2   // a take with blocks going down off the crosshair is a failed take
    }
  }
}

module.exports = pixelArt
module.exports.upscale = upscale
