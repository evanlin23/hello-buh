// The bot's hands for the live formats (stunts/live_*.js, docs/livestream.md): stand, walk and lay TNT (or any block)
// like a player, with every place aimed (lib/act.js) and every walk on a checked clear line. Nothing here is used by a
// Short.
//   const C = require('../lib/live_crew')(ctx, A, { cols })     cols: L.carpetColumns(...) (the open ground)
//   C.standFor(cells, from, n, center)   a stand on open ground that reaches the most of cells[from .. from + n]
//   await C.lay(cells, { from, until, center, onPlace })   place cells in order until the tick `until`; out of reach:
//                                         walk on to the next stand; returns the index reached
//   C.edgeStand(plan, c, R)               open ground just outside a carpet's edge, its outermost TNT in reach
//   C.awayStand(edge, c)                  open ground 40-90 blocks further out (out of the blast)
//   C.lightable(cells)                    a placed TNT of cells in reach to light
const L = require('./live')

module.exports = function crew (ctx, A, o = {}) {
  const { bot, Vec3 } = ctx
  const C = {
    cols: o.cols || [],
    // open ground to stand on at (x, z) -> feet y or null
    groundY (x, z) {
      const g = ctx.surface(x, z)
      if (!g || !L.GROUND.test(g.name)) return null
      for (let k = 1; k <= 2; k++) { const b = bot.blockAt(new Vec3(x, g.position.y + k, z)); if (!b || !L.CLEAR.test(b.name)) return null }
      return g.position.y + 1
    },
    // where the feet go at (x, z) near height y: on the highest solid block in y-2 .. y+3 with two free blocks above
    feetY (x, z, y) {
      const solid = (yy) => { const b = bot.blockAt(new Vec3(x, yy, z)); return !!b && b.boundingBox === 'block' }
      for (let yy = y + 3; yy >= y - 2; yy--) if (solid(yy - 1) && !solid(yy) && !solid(yy + 1)) return yy
      return null
    },
    // the stand with the most of the next cells in reach (4.2 from the eye, none under the feet), nearest the spot
    // `out` blocks outside them as seen from `center`; never on a cell still to be placed (or a column in `skip`); the
    // feet height from the world as it is now (on the carpet, on cells already laid)
    standFor (cells, from, n, center, out = 2.4, skip = null) {
      const next = cells.slice(from, from + n)
      if (!next.length) return null
      const taken = skip || new Set(cells.slice(from).map(p => `${p.x},${p.z}`))
      const mx = next.reduce((s, p) => s + p.x + 0.5, 0) / next.length, mz = next.reduce((s, p) => s + p.z + 0.5, 0) / next.length
      const dm = Math.max(1e-6, Math.hypot(mx - center.x, mz - center.z)), ux = (mx - center.x) / dm, uz = (mz - center.z) / dm
      const sx = mx + ux * out, sz = mz + uz * out
      let best = null, score = -1e9, by = null
      for (const col of C.cols) {
        if (taken.has(`${col.x},${col.z}`)) continue
        const dd = Math.hypot(col.x + 0.5 - sx, col.z + 0.5 - sz)
        if (dd > 6) continue
        const y = C.feetY(col.x, col.z, col.y)
        if (y === null) continue
        const ex = col.x + 0.5, ey = y + 1.62, ez = col.z + 0.5
        let k = 0
        for (const p of next) { const h = Math.hypot(p.x + 0.5 - ex, p.z + 0.5 - ez); if (h >= 1.2 && Math.hypot(h, p.y + 0.5 - ey) <= 4.2) k++ }
        const sc = k - dd * 0.3
        if (k > 0 && sc > score) { score = sc; best = col; by = y }
      }
      if (!best) return null
      const yaw = Math.atan2(-(mx - best.x - 0.5), mz - best.z - 0.5) * 180 / Math.PI
      return { x: best.x + 0.5, y: by, z: best.z + 0.5, yaw }
    },
    // a clear straight line to a stand for the body (0.6 wide, 1.8 tall): the ground along it rises or drops at most one
    // block at a time (a step up gets a jump), with two free blocks over it all the way (owner check "stuck on the block")
    clear (to) {
      const p = bot.entity.position, Ln = Math.hypot(to.x - p.x, to.z - p.z)
      if (Math.abs(to.y - p.y) > 1.1 || Ln < 0.8) return false
      const ux = (to.x - p.x) / Ln, uz = (to.z - p.z) / Ln
      let h = Math.floor(p.y + 0.01)
      for (let d = 0.3; d <= Ln + 0.4; d += 0.25) {
        let hs = []
        for (const w of [-0.38, 0, 0.38]) {
          const x = Math.floor(p.x + ux * d - uz * w), z = Math.floor(p.z + uz * d + ux * w)
          const f = C.feetY(x, z, h)
          if (f === null || Math.abs(f - h) > 1) return false
          hs.push(f)
        }
        const top = Math.max(...hs)
        if (top - Math.min(...hs) > 1) return false
        h = top
      }
      return Math.abs(h - Math.floor(to.y + 0.01)) <= 1
    },
    // a short walk on a checked line, looking where it goes; a jump at a step up
    async walk (to) {
      if (!to) return false
      const goal = new Vec3(to.x, to.y, to.z)
      await A.turnTo(goal.offset(0, 1.2, 0), { max: 30 })
      bot.setControlState('forward', true)   // motion-ok: a short walk on a checked clear line (C.clear), looking where it goes
      for (let k = 0; k < 80; k++) {
        const p = bot.entity.position
        if (Math.hypot(p.x - goal.x, p.z - goal.z) < 0.6) break
        const ax = Math.floor(p.x + Math.sign(goal.x - p.x) * 0.6), az = Math.floor(p.z + Math.sign(goal.z - p.z) * 0.6)
        const ahead = bot.blockAt(new Vec3(ax, Math.floor(p.y + 0.01), az))
        bot.setControlState('jump', !!(ahead && ahead.boundingBox === 'block' && bot.entity.onGround))   // motion-ok: a step up
        await A.view(goal.offset(0, 1.2, 0))
        await bot.waitForTicks(1)
      }
      bot.setControlState('forward', false)   // motion-ok: the walk's end
      bot.setControlState('jump', false)   // motion-ok: the walk's end
      await bot.waitForTicks(3)
      return true
    },
    // place cells[from ..] in order until the tick `until`, a window of `win` at a time; cells out of reach are passed
    // over (they come back in `skipped`); a window done: walk on to the stand for the next one (a clear line only)
    async lay (cells, { from = 0, until, center, win = 12, onPlace = null, skip = null, block = 'tnt' }) {
      let i = from
      const skipped = []
      while (ctx.tick < until - 20 && i < cells.length) {
        const w = cells.slice(i, i + win); i += w.length
        for (const p of w) {
          if (ctx.tick >= until) { skipped.push(p); continue }
          const eye = bot.entity.position.offset(0, 1.62, 0)
          if (eye.distanceTo(new Vec3(p.x + 0.5, p.y + 0.5, p.z + 0.5)) > 4.4) { skipped.push(p); continue }
          if (C.occupied(p)) { skipped.push(p); continue }   // a villager in the cell: the server would refuse it
          // the sound only once the block is really there (owner r:r73847d: "the vilagers block us from placing blocks but
          // theres still a block placing sound"; lib/act.js sounds on the click, landed or not)
          try { await A.place(new Vec3(p.x, p.y, p.z), { max: 30, sound: null }) } catch (e) { skipped.push(p); continue }
          await bot.waitForTicks(1)
          const b = bot.blockAt(new Vec3(p.x, p.y, p.z))
          if (b && b.name === block) { ctx.sound(`block.${ctx.soundGroup(block)}.place`, 1, 0.8); if (onPlace) onPlace(p) } else skipped.push(p)
          await bot.waitForTicks(1)
          const held = bot.inventory.slots[36 + bot.quickBarSlot]
          if (held && held.count < 8) await ctx.cmd(`/item replace entity @s hotbar.${bot.quickBarSlot} with ${block} 64`, { mayFail: true })
        }
        if (ctx.tick < until - 40 && i < cells.length) {
          let s = null
          for (const out of [2.4, 1.6, 3.2, 0.8]) { const t = C.standFor(cells, i, win, center, out, skip); if (t && C.clear(t)) { s = t; break } }
          if (!s) break
          await C.walk(s)
        }
      }
      return { i, skipped }
    },
    // a mob (or anything with a body) standing in the cell
    occupied (p) {
      return Object.values(bot.entities).some(e => e !== bot.entity && e.position && e.name !== 'item' && e.name !== 'interaction' &&
        Math.abs(e.position.x - (p.x + 0.5)) < 0.5 + (e.width || 0.6) / 2 && Math.abs(e.position.z - (p.z + 0.5)) < 0.5 + (e.width || 0.6) / 2 &&
        e.position.y < p.y + 1 && e.position.y + (e.height || 1.8) > p.y)
    },
    lightable (cells, max = 4.2) {
      const eye = bot.entity.position.offset(0, 1.62, 0)
      let best = null, bd = 99
      for (const p of cells) {
        const b = bot.blockAt(new Vec3(p.x, p.y, p.z)), d = eye.distanceTo(new Vec3(p.x + 0.5, p.y + 0.5, p.z + 0.5))
        if (b && b.name === 'tnt' && d < bd && d > 1.6) { bd = d; best = new Vec3(p.x, p.y, p.z) }
      }
      return bd < max ? best : null
    },
    edgeStand (plan, c, R) {
      const top = new Map()
      for (const p of plan) { const k = `${p.x},${p.z}`; if (!top.has(k) || top.get(k).y < p.y) top.set(k, p) }
      const carpet = new Set(C.cols.map(col => `${col.x},${col.z}`))
      const outer = C.cols.filter(col => col.d > R - 1.5 && top.has(`${col.x},${col.z}`)).sort((a, b) => b.d - a.d)
      for (const col of outer) {
        const ux = (col.x - c.x) / col.d, uz = (col.z - c.z) / col.d
        const sx = Math.round(col.x + ux * 2.2), sz = Math.round(col.z + uz * 2.2)
        if (carpet.has(`${sx},${sz}`)) continue
        const y = C.groundY(sx, sz)
        if (y === null || Math.abs(y - col.y) > 1) continue
        const yaw = Math.atan2(-(c.x - sx), c.z - sz) * 180 / Math.PI
        const t = top.get(`${col.x},${col.z}`)
        return { x: sx + 0.5, y, z: sz + 0.5, yaw, tnt: new Vec3(t.x, t.y, t.z) }
      }
      throw new Error('no open stand at the carpet edge')
    },
    awayStand (edge, c) {
      const d = Math.hypot(edge.x - c.x, edge.z - c.z), ux = (edge.x - c.x) / d, uz = (edge.z - c.z) / d
      for (let r = 28; r <= 60; r += 2) {   // (near enough that the server still sends it the blasts)
        const x = Math.floor(edge.x + ux * r), z = Math.floor(edge.z + uz * r), y = C.groundY(x, z)
        if (y !== null) return { x: x + 0.5, y, z: z + 0.5, yaw: edge.yaw }
      }
      return { x: edge.x, y: edge.y + 60, z: edge.z, yaw: edge.yaw }
    },
    // an invisible anchor for the drones (an interaction entity: no model, no shadow); mark it with C.markAnchors at
    // the start of perform so render.js can orbit 'actor:<tag>'
    async anchor (tag, x, y, z) {
      await ctx.cmd(`/summon minecraft:interaction ${x} ${y} ${z} {width:0.1f,height:0.1f,Tags:["hb_${tag}"]}`)
      await bot.waitForTicks(6)
      const at = new Vec3(x, y, z)
      const e = Object.values(bot.entities).filter(e => e.name === 'interaction').sort((a, b) => a.position.distanceTo(at) - b.position.distanceTo(at))[0]
      if (!e) throw new Error(`anchor ${tag}: not seen`)
      return e.id
    },
    // the blast's activity from the world itself: the tick of the last TNT (or any block) turning to air near `c`
    // (explosion packets only reach a player in range, so they can't end a blast on their own)
    watchBlast (c, R) {
      const w = { last: -1e9, first: null, tntGone: 0 }
      bot.on('blockUpdate', (o, nb) => {   // (the old block can be missing: key on the new one, as the harness does)
        if (!nb || !nb.position || nb.stateId !== 0) return
        if (Math.hypot(nb.position.x - c.x, nb.position.z - c.z) > R + 20) return
        if (o && o.name === 'tnt') w.tntGone++
        if (w.armed) { w.gone = (w.gone || 0) + 1; if (w.first === null && w.gone > 3) w.first = ctx.tick; w.last = ctx.tick }
      })
      return w
    },
    markAnchors (anchors) { for (const [tag, id] of Object.entries(anchors)) ctx.mark('actor', { tag, id, name: 'interaction' }) }
  }
  return C
}
