// The "inside" format (bigger on the inside; docs/formats.md, r:r9a54b2): one continuous-looking first-person walk
// through a big, cosy interior to its front door, out of the door, and a turn round to a tiny plain house that could
// never hold it. ~8-10 s, made for replays: the cut must not show.
//
// How the hidden cut works. The interior is a real room built underground near the hut. Its entry (the door plus the
// 3x3x3 space behind it) is block for block the hut's inside: the same spruce door, walls, floor, ceiling and hanging
// lantern, and outside the interior's door a 1x1 shaft open to the sky (capped by a dirt path tile, which lets sky
// light straight down in our light engine) gives the door the hut door's sky light. The walk stops with the closed
// door filling the frame; a relative /tp (~ ~dy ~dz, the look kept) moves the player to the same spot inside the hut,
// whose door looks and is lit the same; the click opens the hut's door. Nothing about the frame changes on the cut.
//
// Use: an episode is a stunt module made by inside.make({ name, caption, red, room(ctx, A) }) where room() furnishes
// the hall; A(dx, dy, dz) gives "x y z" for a block relative to the interior's door (dx east, dy up from the floor
// level, dz south: the hall runs from dz -21 to -1, dx -7..7, floor dy 0, ceiling dy 11). Keep the entry's light
// rule: no light source within 6 blocks (manhattan) of dx -1..1, dy 1..2, dz -1 (the cells in front of the door),
// or the door is lit differently from the hut's and the cut shows.
const { plateau } = require('./plateau')

const SOUTH = Math.PI            // mineflayer yaw facing south (+z)
const DOOR = 'spruce_door[facing=south,hinge=left'   // closed: its panel on the block's north side (z 0..3/16)
const GAP_X = 0.42               // open (hinge left) the panel takes x 13/16..1: the player (0.6 wide) fits at x 0.3..0.51
const DEPTH = 16                 // the interior's floor this far under the hut's
const PATH_K = 2                 // the shaft rises under the path tile this far south of the hut's door

// The entry: the front wall with the door, and the 3x3x3 space behind it (north of the door), at door (x, z), floor y.
async function entry (ctx, x, y, z, m) {
  const c = (s) => ctx.cmd(s)
  await c(`/fill ${x - 2} ${y + 1} ${z} ${x + 2} ${y + 3} ${z} ${m.wall}`)
  await c(`/fill ${x - 2} ${y + 1} ${z - 3} ${x - 2} ${y + 3} ${z - 1} ${m.wall}`)
  await c(`/fill ${x + 2} ${y + 1} ${z - 3} ${x + 2} ${y + 3} ${z - 1} ${m.wall}`)
  await c(`/fill ${x - 1} ${y} ${z - 3} ${x + 1} ${y} ${z - 1} ${m.floor}`)
  await c(`/fill ${x - 1} ${y + 4} ${z - 3} ${x + 1} ${y + 4} ${z - 1} ${m.ceil}`)
  await c(`/fill ${x - 1} ${y + 1} ${z - 3} ${x + 1} ${y + 3} ${z - 1} air`)
  await c(`/setblock ${x} ${y + 3} ${z - 2} lantern[hanging=true]`)
  await c(`/setblock ${x} ${y + 1} ${z} ${DOOR},half=lower,open=false]`)
  await c(`/setblock ${x} ${y + 2} ${z} ${DOOR},half=upper,open=false]`)
}

const ENTRY = { wall: 'spruce_planks', floor: 'spruce_planks', ceil: 'spruce_planks' }

// The tiny plain house: 5x5, walls 3 high, a flat roof; its door on the south wall at (x, z).
async function hut (ctx, x, y, z) {
  const c = (s) => ctx.cmd(s)
  await c(`/fill ${x - 2} ${y + 1} ${z - 4} ${x + 2} ${y + 3} ${z} ${ENTRY.wall}`)
  for (const [cx, cz] of [[x - 2, z], [x + 2, z], [x - 2, z - 4], [x + 2, z - 4]]) await c(`/fill ${cx} ${y + 1} ${cz} ${cx} ${y + 3} ${cz} oak_log`)
  await c(`/fill ${x - 2} ${y + 4} ${z - 4} ${x + 2} ${y + 4} ${z} ${ENTRY.ceil}`)
  await c(`/fill ${x - 2} ${y} ${z - 4} ${x + 2} ${y} ${z} cobblestone`)
  await entry(ctx, x, y, z, ENTRY)
}

function make (opts) {
  const o = { walkFrom: 19.5, outTo: 3.4, backTo: 6.2, ...opts }
  return {
    name: o.name,
    biome: process.env.BIOME || 'minecraft:plains',
    caption: o.caption,
    renderDistance: 6,
    campfireSmoke: true,
    recordRadius: 96,
    edit: {
      caption: o.caption, red: o.red,
      startAt: 'beat:-0.05', endAfter: 'reveal:1.0',
      // a pop on frame 1 (the audio hook), the song ducks into the reveal and an impact lands on it (the payoff)
      sfx: [['pop', 'beat', { gain: 0.35 }], ['dip', 'reveal', 0.35], ['impact', 'reveal']],
      punch: [['reveal', 0, 0.8]],
      ...(o.edit || {})
    },

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      if (!g) throw new Error('no dry land')
      const hx = g.x, hz = g.z
      await ctx.defaultRules()
      await ctx.cmd('/difficulty peaceful')
      // a small levelled pad for the hut (natural plains round it: a big flat field reads as superflat)
      const F = await plateau(ctx, { x0: hx - 7, x1: hx + 7, z0: hz - 9, z1: hz + 12, below: 4, biome: 'minecraft:plains', trees: 8 })
      const ix = hx, iz = hz + PATH_K - 1, iy = F - DEPTH
      Object.assign(this, { hx, hz, F, ix, iy, iz })
      await ctx.forceload({ x0: ix - 12, z0: iz - 26, x1: ix + 12, z1: iz + 4 })
      // ---- the interior: a stone shell (no cave, water or lava can reach it), then the hall
      await ctx.cmd(`/fill ${ix - 10} ${iy - 2} ${iz - 24} ${ix + 10} ${iy + 13} ${iz + 2} stone`)
      await ctx.cmd(`/fill ${ix - 8} ${iy} ${iz - 22} ${ix + 8} ${iy + 11} ${iz} ${ENTRY.wall}`)
      await ctx.cmd(`/fill ${ix - 7} ${iy + 1} ${iz - 21} ${ix + 7} ${iy + 10} ${iz - 1} air`)
      await ctx.cmd(`/fill ${ix - 7} ${iy} ${iz - 21} ${ix + 7} ${iy} ${iz - 1} dark_oak_planks`)
      await ctx.cmd(`/fill ${ix - 7} ${iy + 11} ${iz - 21} ${ix + 7} ${iy + 11} ${iz - 1} dark_oak_planks`)
      const A = (dx, dy, dz) => `${ix + dx} ${iy + dy} ${iz + dz}`
      await o.room(ctx, A)
      await entry(ctx, ix, iy, iz, ENTRY)                 // last: the room must not overwrite it
      // the shaft: sky light down to the outside of the interior's door, under a path tile in front of the hut
      await ctx.cmd(`/fill ${ix - 1} ${iy + 1} ${iz + 1} ${ix + 1} ${F - 1} ${iz + 3} stone`)
      await ctx.cmd(`/fill ${ix} ${iy + 1} ${iz + 1} ${ix} ${F - 1} ${iz + 1} air`)
      // ---- the hut, its path (one tile caps the shaft) and grass round it
      await hut(ctx, hx, F, hz)
      for (let k = 1; k <= 5; k++) await ctx.cmd(`/setblock ${hx} ${F} ${hz + k} dirt_path`)
      await ctx.cmd(`/fill ${hx} ${F + 1} ${hz + 1} ${hx} ${F + 3} ${hz + 12} air`)
      let seed = 7
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
      for (let dx = -7; dx <= 7; dx++) {
        for (let dz = -9; dz <= 12; dz++) {
          if (Math.abs(dx) <= 3 && dz >= -5 && dz <= 1) continue      // the hut and its walls
          if (dx === 0 && dz > 0) continue                              // the path
          const r = rnd()
          const plant = r < 0.22 ? 'short_grass' : r < 0.25 ? 'dandelion' : r < 0.27 ? 'poppy' : r < 0.29 ? 'oxeye_daisy' : null
          if (plant) bot.chat(`/setblock ${hx + dx} ${F + 1} ${hz + dz} ${plant}`)
        }
        await bot.waitForTicks(2)
      }
      await ctx.cmd('/kill @e[type=item]')
      await ctx.hotbar([])
      // start: in the hall, looking as the walk's first tick will
      const s = this.look(0, { x: ix + GAP_X, z: iz - o.walkFrom })
      await ctx.tpCheck(ix + GAP_X, iy + 1, iz - o.walkFrom, 180 - s.yaw * 180 / Math.PI, -s.pitch * 180 / Math.PI)
      await ctx.cmd('/gamemode survival')
      await bot.waitForTicks(20)
      return { x: hx, y: F, z: hz }
    },

    // the walk's look at time t (s) from position p: toward the door, with a sway over the room early on
    look (t, p) {
      const ease = (a, b, u) => { u = Math.max(0, Math.min(1, u)); u = u * u * (3 - 2 * u); return a + (b - a) * u }
      const key = (ks) => { for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) return ease(ks[i - 1][1], ks[i][1], (t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0])); return ks[ks.length - 1][1] }
      const tx = this.ix + GAP_X, tz = this.iz
      const dx = tx - p.x, dz = tz - p.z
      const bearing = Math.atan2(-dx, -dz)
      const sway = key(o.sway || [[0, 0.55], [1.4, -0.45], [2.7, 0]])
      const d = Math.hypot(dx, dz)
      const aim = Math.atan2(1.45 - 1.62, Math.max(0.6, d))
      const pitch = key([[0, 0.32], [1.4, 0.14], [2.7, 0.02], [3.4, aim]])
      return { yaw: bearing + sway, pitch: t > 3.4 ? aim : pitch }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { ix, iy, iz, hx, hz, F } = this
      const tick = () => bot.waitForTicks(1)
      ctx.mark('beat')
      // ---- 1. the walk through the hall to the door
      bot.setControlState('forward', true)
      let t = 0, frozen = null
      for (let j = 0; j < 160; j++) {
        const p = bot.entity.position
        const left = iz - p.z
        if (left < (o.release || 1.0)) break
        if (left < 1.8 && !frozen) frozen = { yaw: bot.entity.yaw }   // no late swings of the yaw as the door nears
        const l = this.look(t, p)
        await bot.look(frozen ? frozen.yaw : l.yaw, l.pitch, true)
        await tick(); t += 0.05
      }
      bot.setControlState('forward', false)
      ctx.mark('door_stop')
      for (let j = 0; j < 7; j++) { const l = this.look(t, bot.entity.position); await bot.look(bot.entity.yaw, l.pitch, true); await tick(); t += 0.05 }
      const p = bot.entity.position
      ctx.log('at the door: x+', (p.x - ix).toFixed(3), 'door gap', (iz - p.z).toFixed(3), 'yaw', bot.entity.yaw.toFixed(4), 'pitch', bot.entity.pitch.toFixed(4))
      // ---- 2. the hidden cut: the same spot in front of the hut's door (the look kept)
      await ctx.cmd(`/tp @s ~${hx - ix} ~${F - iy} ~${hz - iz}`)
      await bot.waitForTicks(2)
      const q = bot.entity.position
      ctx.log('after the cut: x+', (q.x - hx).toFixed(3), 'door gap', (hz - q.z).toFixed(3), 'yaw', bot.entity.yaw.toFixed(4), 'pitch', bot.entity.pitch.toFixed(4))
      if (Math.abs(q.x - hx - (p.x - ix)) > 0.01 || Math.abs(hz - q.z - (iz - p.z)) > 0.01 || Math.abs(q.y - F - (p.y - iy)) > 0.01) throw new Error('the cut did not land on the same spot at the hut')
      // ---- 3. open the hut's door and walk out
      const click = () => {
        bot._client.write('block_place', { hand: 0, location: { x: hx, y: F + 1, z: hz }, direction: 2, cursorX: 0.5, cursorY: 0.5, cursorZ: 0, insideBlock: false, worldBorderHit: false, sequence: 0 })
        bot.swingArm()
      }
      click(); ctx.sound('block.wooden_door.open', 1, 1)
      ctx.mark('door_open')
      for (let k = 0; k < 4; k++) {
        await bot.waitForTicks(2)
        const b = bot.blockAt(new Vec3(hx, F + 1, hz))
        if (b && b.getProperties().open) break
        ctx.log('door did not open, clicking again'); click()
      }
      await bot.waitForTicks(2)
      bot.setControlState('forward', true)
      const pitch0 = bot.entity.pitch
      for (let j = 0; j < 40 && bot.entity.position.z < hz + o.outTo; j++) {
        await bot.look(SOUTH, pitch0 + (0 - pitch0) * Math.min(1, j / 6), true)
        await tick()
      }
      ctx.mark('out')
      // ---- 4. turn round (by the west) while backing away down the path: the reveal
      const T = o.turnTicks || 14
      const target = new Vec3(hx + 0.5, F + 2.4, hz - 2)
      let revealed = false
      for (let j = 1; j <= T + 18; j++) {
        const u = Math.min(1, j / T), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
        const eye = bot.entity.position.offset(0, 1.62, 0), d = target.minus(eye)
        const endPitch = Math.atan2(d.y, Math.hypot(d.x, d.z)), endYaw = Math.atan2(-d.x, -d.z)
        let dy = endYaw - SOUTH; while (dy > 0) dy -= 2 * Math.PI   // the turn goes by the west (yaw decreasing)
        await bot.look(SOUTH + dy * e, e * endPitch, true)
        // keep drifting south: forward while facing south, then the side key, then back
        const yaw = bot.entity.yaw, fz = -Math.cos(yaw), rz = -Math.sin(yaw)
        const stop = bot.entity.position.z >= hz + o.backTo
        bot.setControlState('forward', !stop && fz > 0.38); bot.setControlState('back', !stop && fz < -0.38)
        bot.setControlState('right', !stop && rz > 0.38); bot.setControlState('left', !stop && rz < -0.38)
        if (!revealed && u >= 0.8) { revealed = true; ctx.mark('reveal') }
        await tick()
      }
      bot.clearControlStates()
      await bot.waitForTicks(10)
      return true
    }
  }
}

module.exports = { make, entry, hut, GAP_X, DEPTH }
