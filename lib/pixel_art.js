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
// upscale(art, k) makes the big version of a picture.
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
    edit,

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
      const R = 80
      const maxH = Math.max(...stages.map(st => st.art.length))
      const fillBig = async (x0, y0, z0, x1, y1, z1, block) => {
        const per = Math.max(1, Math.floor(32768 / ((y1 - y0 + 1) * (z1 - z0 + 1))))
        for (let xa = x0; xa <= x1; xa += per) await ctx.cmd(`/fill ${xa} ${y0} ${z0} ${Math.min(x1, xa + per - 1)} ${y1} ${z1} ${block}`)
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
        reach = Math.max(reach, Math.hypot(dist + 1, W / 2 + 1, H / 2 + 1))
      }
      await ctx.cmd(`/attribute @s minecraft:block_interaction_range base set ${Math.ceil(reach) + 3}`)   // the big art's far corners
      // the hotbar: as many stacks of each colour as the three pictures need
      const need = {}
      for (const st of stages) for (const row of st.art) for (const ch of row) if (palette[ch]) need[ch] = (need[ch] || 0) + 1
      this.slots = {}
      const bar = []
      for (const ch of chars) { this.slots[ch] = []; for (let n = 0; n < Math.ceil((need[ch] || 0) / 64); n++) { this.slots[ch].push(bar.length); bar.push([palette[ch], 64]) } }
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
      const slotFor = (ch) => this.slots[ch][Math.min(this.slots[ch].length - 1, Math.floor((used[ch] || 0) / 64))]
      let aim = null
      // the camera follows the block being placed (the crosshair lands on it), smoothed so it
      // sweeps like a player's instead of snapping
      const lookToward = async (target, ticks, k = 0.45) => {
        for (let i = 0; i < ticks; i++) {
          aim = aim ? aim.plus(target.minus(aim).scaled(k)) : target.clone()
          const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
          await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
          await bot.waitForTicks(1)
        }
      }
      const place = (wl, cell) => bot._client.write('block_place', {
        hand: 0, location: cell.p.offset(wl.fx, 0, wl.fz), direction: FACE[`${wl.fx},${wl.fz}`],
        cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0
      })
      let lastSwing = -99, ok = 0, total = 0
      for (let k = 0; k < stages.length; k++) {
        const st = stages[k], wl = this.walls[k], { H, W } = wl
        const cells = []
        for (let r = 0; r < H; r++) {
          for (let c = 0; c < W; c++) {
            const ch = st.art[r][c]
            if (!palette[ch]) continue
            const off = c - (W >> 1)
            const dc = c - (W - 1) / 2, dr = r - (H - 1) / 2
            cells.push({ p: new Vec3(wl.cx + wl.rx * off, wl.ybase + (H - 1 - r), wl.cz + wl.rz * off), ch, ring: Math.max(Math.abs(c - (W >> 1)), Math.abs(r - (H >> 1))), ang: Math.atan2(dr, dc) })
          }
        }
        let seq = []
        if (st.order === 'random') {
          let seed = 97 + k
          const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
          const byCh = {}
          for (const c of cells.slice().sort(() => rnd() - 0.5)) (byCh[c.ch] = byCh[c.ch] || []).push(c)
          const keys = Object.keys(byCh); let i = 0
          while (keys.some(key => byCh[key].length)) { const key = keys[i % keys.length]; seq.push(...byCh[key].splice(0, 5 + (i % 4))); i++ }
        } else {
          const first = st.first || ''
          let seed = 31 + k
          const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
          // scatter: the features go down in a scrambled order, so they don't read as a face early
          for (const ch of first) seq.push(...cells.filter(c => c.ch === ch).sort(st.scatter ? () => rnd() - 0.5 : (a, b) => b.p.y - a.p.y))
          // each ring goes round its perimeter, so consecutive blocks are neighbours (sorting by height
          // alternated the left and right columns and the camera jittered between them)
          const rest = cells.filter(c => !first.includes(c.ch)).sort((a, b) => b.ring - a.ring || a.ang - b.ang)
          for (const ch of chars.filter(c => !first.includes(c))) seq.push(...rest.filter(c => c.ch === ch))
        }
        // ticks per block: the bigger the picture, the faster (it escalates, and fits the Short)
        const tpb = st.tpb || (cells.length >= 120 ? 1.25 : cells.length >= 30 ? 2 : 2.5)
        ctx.mark('stage', { k, cells: cells.length })
        let budget = 0, ci = 0
        const lastStage = k === stages.length - 1
        let backing = 0
        for (const cell of seq) {
          // near the end of the big one: walk back while still placing (a new shot, the face grows in view)
          if (lastStage && k > 0 && ci === Math.floor(seq.length * 0.8)) { ctx.mark('backup'); bot.setControlState('back', true); backing = 14 }
          if (backing > 0 && --backing === 0) bot.setControlState('back', false)
          // halfway through the big one: a glance back at the first two for scale
          if (lastStage && k > 0 && ci++ === Math.floor(seq.length * 0.55)) {
            const pw = this.walls[k - 1], pc = new Vec3(pw.cx + 0.5, pw.ybase + pw.H / 2, pw.cz + 0.5)
            ctx.mark('glance')
            const both = pc.plus(cell.p.offset(0.5, 0.5, 0.5)).scaled(0.5)   // both pictures in frame
            await lookToward(both, 12, 0.25)
            await lookToward(both, 6, 0.25)
            await lookToward(cell.p.offset(0.5, 0.5, 0.5), 8, 0.3)
          }
          const slot = slotFor(cell.ch)
          if (bot.quickBarSlot !== slot) ctx.select(slot)
          const target = cell.p.offset(0.5, 0.5, 0.5)
          await lookToward(target, 1)
          place(wl, cell)
          if (bot.time.age - lastSwing >= 4) { bot.swingArm(); lastSwing = bot.time.age }
          ctx.sound(`block.${ctx.soundGroup(palette[cell.ch])}.place`, 1.0, 0.8 + ((used[cell.ch] || 0) % 3) * 0.05)
          used[cell.ch] = (used[cell.ch] || 0) + 1
          budget += tpb - 1
          while (budget >= 1) { budget -= 1; await lookToward(target, 1) }
        }
        // a placement can be dropped (sent the same tick as a slot change): redo any missing, quickly
        await bot.waitForTicks(1)
        for (const cell of cells) {
          const b = bot.blockAt(cell.p)
          if (b && b.name === palette[cell.ch]) continue
          ctx.log('redo', cell.ch, cell.p.toString(), 'was', b && b.name)
          ctx.select(slotFor(cell.ch))
          await lookToward(cell.p.offset(0.5, 0.5, 0.5), 1)
          place(wl, cell); bot.swingArm(); used[cell.ch] = (used[cell.ch] || 0) + 1
        }
        // the reveal: on the completing tick, a short step back while recentring on the whole picture
        const centre = new Vec3(wl.cx + 0.5, wl.ybase + H / 2 - (k === stages.length - 1 ? 2 : 0.6), wl.cz + 0.5)   // the big one aimed low: clear of the hotbar and hand
        const last = k === stages.length - 1
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
      ctx.log(`correct ${ok}/${total}`)
      return ok >= total - 2
    }
  }
}

module.exports = pixelArt
module.exports.upscale = upscale
