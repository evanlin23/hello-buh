// The "cells" format (docs/formats.md `cells`; owner 2026-11-11: "a bunch of cells where mobs are forced to do things
// repeitively forever", "it only works bc its forcing mobs specifically to do it"): a slow first-person walk down a
// clean lab corridor of glass cells. In each cell a MOB is stuck in a vanilla contraption doing one thing forever
// (pistons, dispensers, slime launchers), the last one the biggest. Never the player, never a plain machine.
//
// A stunt is a list of cell kinds plus a finale (the tall cell at the corridor's end):
//   module.exports = require('../lib/cells').makeStunt({ name, caption, edit, cells: ['cow_pingpong', ...], finale: 'golem_launcher' })
// A new episode swaps the list (and adds a kind to CELLS below: build it, drive its clock, say where to look).
//
// Everything is vanilla and runs on the server: the pistons and dispensers really push, shoot and shear, the mobs
// have their own AI and physics. Only the redstone that powers them is stood in for by commands: a redstone block
// swapped in under the floor (never on camera; lib/chain.js's chain Shorts build the clocks for real, this format's
// clocks stay the same few ticks every episode). The sounds are the server's own (lib/chain.js relaySounds), plus
// each mob's hurt sound on a real hit (the client makes that one itself from the damage event).
//
// Layout (x = east, z = south, the bot walks north = -z from the start): the corridor is x -2..2, floor at F, air
// F+1..F+4, sea lanterns in its ceiling. Cell i sits on side s (-1 west / +1 east, alternating, the first on the
// west) centred on z = Z - 3 - SPACING * i; its glass front is at x = 3s, its inside x = 4s..5s (d = 1, 2: d = 1 is
// against the glass), z = cz-2..cz+2 (u = -2..2, u = +z), h = 1..4 above the floor. The finale's glass wall closes the
// corridor's north end and its cell rises 14 blocks behind it.
const { relaySounds } = require('./chain')
const { stepTurn, DEG } = require('./motion')

// The camera: the aim follows `focus` through lib/motion.js's governor (a top speed, eased in and out, as a hand on a
// mouse), and the feet walk toward `steer` with the movement keys (no sprint: a slow walk past the glass).
function camera (ctx) {
  const { bot } = ctx
  const r = { focus: null, steer: null, lim: { speed: 140 * DEG / 20, accel: 700 * DEG / 400 } }
  let cur = { yaw: bot.entity.yaw, pitch: bot.entity.pitch }, vel = { yaw: 0, pitch: 0 }
  const want = () => {
    const eye = bot.entity.position.offset(0, 1.62, 0), d = r.focus.minus(eye)
    return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
  }
  const keys = ['forward', 'back', 'left', 'right']
  const tick = () => {
    if (r.focus) { const st = stepTurn(cur, vel, want(), r.lim); cur = st.cur; vel = st.vel }
    bot.look(cur.yaw, cur.pitch, true)   // motion-ok: the governor above eases every turn (lib/motion.js stepTurn)
    const p = bot.entity.position
    if (r.steer) {
      const dx = r.steer.x - p.x, dz = r.steer.z - p.z, yw = bot.entity.yaw
      const f = -Math.sin(yw) * dx - Math.cos(yw) * dz, sd = Math.cos(yw) * dx - Math.sin(yw) * dz
      const far = Math.hypot(dx, dz) > 0.35
      bot.setControlState('forward', far && f > 0.25 && f > 0.4 * Math.abs(sd)); bot.setControlState('back', far && f < -0.25 && -f > 0.4 * Math.abs(sd))
      bot.setControlState('right', far && sd > 0.25 && sd > 0.4 * Math.abs(f)); bot.setControlState('left', far && sd < -0.25 && -sd > 0.4 * Math.abs(f))
    } else for (const c of keys) bot.setControlState(c, false)
  }
  bot.on('physicsTick', tick)
  r.until = async (cond, max = 200) => { for (let i = 0; i < max && !cond(); i++) await bot.waitForTicks(1) }
  r.stop = () => { bot.removeListener('physicsTick', tick); for (const c of keys) bot.setControlState(c, false) }
  return r
}

const SPACING = 7
const WALL = 'white_concrete'
const TRIM = 'light_gray_concrete'
const FLOOR = 'smooth_quartz'
const OFF = FLOOR                     // what the launcher's power blocks are when off

// --- the cell kinds -----------------------------------------------------------------------------------------------
// build(c): place the contraption and the mob (c.at(d, h, u) -> 'x y z' in world coords, c.put, c.fill, c.summon).
// clock(c, t): every tick while the stunt runs (t = ticks since the start): the redstone stand-in.
// focus(c): where the camera looks (a Vec3). hold: ticks the walk stops here. tag: the mob's tag.
const CELLS = {
  // a cow shoved from one end of a 2-block channel to the other by two pistons, forever
  cow_pingpong: {
    hold: 64,
    build: async (c) => {
      await c.fill(1, 1, -2, 1, 2, 2, 'air')
      await c.fill(2, 1, -2, 2, 2, 2, TRIM)                       // the channel's back
      await c.put(1, 1, -1, 'piston[facing=south]')
      await c.put(1, 1, 2, 'piston[facing=north]')
      await c.put(1, 2, -1, TRIM); await c.put(1, 2, 2, TRIM)
      await c.fill(1, 3, -1, 1, 3, 2, 'glass')                    // a lid: it can't climb out over a piston
      await c.summon('cow', 1, 1, 0.5, 0)
    },
    clock: (c, t) => {
      // A pushes the cow from u 0 to u 1, B pushes it back: 8 ticks a side (2 to extend, the rest to settle)
      const ph = Math.floor(t / 8) % 2
      if (t % 8 === 0) {
        c.power(1, -1, ph === 0)
        c.power(1, 2, ph === 1)
        c.ctx.mark('push', { cell: c.i, side: ph })
      }
    },
    focus: (c) => c.pt(1.5, 1.4, 1.0)
  },
  // a chicken pelted with eggs by a dispenser on a clock (each egg can hatch a chick: the channel fills up)
  chicken_eggs: {
    hold: 58,
    build: async (c) => {
      await c.fill(1, 1, -2, 1, 1, 2, 'air')
      await c.fill(2, 1, -2, 2, 1, 2, TRIM)
      await c.put(1, 1, -2, 'dispenser[facing=south]{Items:[{Slot:0b,id:"minecraft:egg",count:16},{Slot:1b,id:"minecraft:egg",count:16},{Slot:2b,id:"minecraft:egg",count:16}]}')
      await c.fill(1, 2, -2, 2, 2, 2, 'glass')                    // a low lid: the eggs stay in the channel
      await c.summon('chicken', 1, 1, 1.6, 180)
      await c.summon('chicken', 1, 1, 2.3, 180, 'Age:-24000')     // one it already hatched
    },
    // eggs that missed, on the floor (summoned once the recording runs: the harness clears every item before it)
    props: (c) => { for (const u of [0.3, 1.1]) c.cmd(`/summon item ${c.atf(1.5, 1.05, u)} {Item:{id:"minecraft:egg",count:1},PickupDelay:32767,Age:-32768}`) },
    always: true,
    clock: (c, t) => {
      if (t < (c.from || 0)) return
      const k = (t - (c.from || 0)) % 14
      if (k === 0) c.power(1, -2, true)
      if (k === 4) c.power(1, -2, false)
    },
    focus: (c) => c.pt(1.5, 1.0, 1.0)
  },
  // a sheep in a one-block pen with a shears dispenser beside it, and the wool it has given so far
  sheep_shears: {
    hold: 48,
    lead: 14,                                                     // the shear lands once the camera is on it
    build: async (c) => {
      await c.fill(1, 1, -2, 2, 4, 2, 'air')
      await c.put(1, 1, -1, 'dispenser[facing=south]{Items:[{Slot:4b,id:"minecraft:shears",count:1}]}')
      await c.put(1, 2, -1, TRIM)
      await c.fill(2, 1, -1, 2, 2, 0, TRIM)
      // the pile: two years of wool
      await c.fill(1, 1, 1, 2, 2, 2, 'white_wool'); await c.put(1, 3, 2, 'white_wool'); await c.put(2, 3, 1, 'white_wool'); await c.put(2, 3, 2, 'white_wool'); await c.put(2, 4, 2, 'white_wool')
      await c.fill(1, 1, -2, 2, 1, -2, 'white_wool')
      await c.summon('sheep', 1, 1, 0.5, 90)
    },
    clock: (c, t) => {
      if (t < (c.from || 0)) return
      const k = (t - (c.from || 0)) % 24                          // a shear, then the clicks of a dispenser with nothing to shear
      if (k === 0) c.power(1, -1, true)
      if (k === 4) c.power(1, -1, false)
    },
    focus: (c) => c.pt(1.5, 1.4, 0.5)
  },
  // a villager on a one-block lift: a sticky piston under its floor tile pushes it up a block and pulls it back down
  villager_squats: {
    hold: 48,
    always: true,
    build: async (c) => {
      await c.fill(1, 1, -2, 2, 4, 2, 'air')
      await c.fill(2, 1, -2, 2, 4, 2, TRIM)                       // the back
      await c.fill(1, 1, -1, 1, 4, -1, TRIM); await c.fill(1, 1, 1, 1, 4, 1, TRIM)   // a one-block shaft
      await c.put(1, -1, 0, 'sticky_piston[facing=up]')          // under the floor tile it lifts
      await c.put(1, 0, 0, 'polished_andesite')
      await c.put(1, 1, -2, 'lectern[facing=north]'); await c.put(1, 1, 2, 'potted_red_tulip')   // the rest of the cell is somebody's office
      await c.summon('villager', 1, 1, 0.5, 'out', 'VillagerData:{profession:"minecraft:librarian",type:"minecraft:plains",level:2},Xp:1')
    },
    clock: (c, t) => {
      const k = t % 24                                             // up for 10 ticks, down for 14
      if (k === 0) c.power(1, 0, true, -2)
      if (k === 10) c.power(1, 0, false, -2)
    },
    focus: (c) => c.pt(1.5, 2.0, 0.5)
  },
  // a snow golem on a ledge pelting a husk below with snowballs: every hit knocks the husk back, it walks back in
  husk_snowballs: {
    hold: 66,
    always: true,
    build: async (c) => {
      await c.fill(1, 1, -2, 2, 4, 2, 'air')
      await c.fill(2, 1, -2, 2, 4, 2, TRIM)
      await c.fill(1, 1, 2, 1, 2, 2, TRIM)                         // the ledge, 2 high: the husk can't climb it
      await c.summon('snow_golem', 1, 3, 2.5, 0, 'Pumpkin:1b')
      await c.summon('husk', 1, 1, -1.5, 0, 'Silent:0b')
    },
    near: 0.3,                                                     // stand back: the shooter and the target both in frame
    focus: (c) => c.pt(1.5, 2.7, 0.4)
  }
,
  // a pig on a small slime launcher under a glass ceiling: up, bonk, down, forever (the golem's tube is the big one).
  // Slime sticks to every pushable neighbour, so the pad's neighbours are obsidian or barriers (immovable), and the
  // pig's pen is barriers: it stands on its pad in the open cell
  pig_launcher: {
    hold: 62,
    build: async (c) => {
      await c.fill(1, 1, -2, 2, 4, 2, 'air')
      await c.put(2, -1, 0, 'sticky_piston[facing=up]')
      await c.put(2, 0, 0, 'slime_block')
      for (const [d, u] of [[1, 0], [3, 0], [2, -1], [2, 1]]) await c.put(d, 0, u, 'obsidian')
      await c.put(3, 1, 0, 'obsidian')
      await c.fill(1, 1, 0, 1, 4, 0, 'barrier'); await c.fill(2, 1, -1, 2, 4, -1, 'barrier'); await c.fill(2, 1, 1, 2, 4, 1, 'barrier')
      await c.summon('pig', 2, 1, 0.5, 'out')
    },
    clock: (c, t) => {
      if (t < c.from) return
      const k = (t - c.from) % 36                                  // a launch, the bonk, the fall and the bounces settle
      if (k === 0) c.power(2, 0, true, -2)
      if (k === 6) c.power(2, 0, false, -2)
    },
    lead: 10,
    focus: (c) => c.pt(2.5, 2.4, 0.5)
  }}
CELLS.cow_pingpong.always = true

// the finale: built behind the glass wall that closes the corridor's north end
const FINALES = {
  // an iron golem on a 2x2 slime-block launcher in a glass tube 14 high: up, down, up, down
  golem_launcher: {
    height: 14,
    build: async (f) => {
      // the tube: x -1..0, z zG-1..zG (zG = the glass wall's z - 1)
      await f.fill(-1, 1, -1, 0, f.height, 0, 'air')
      await f.fill(-1, -1, -1, 0, -1, 0, OFF)
      await f.fill(-1, 0, -1, 0, 0, 0, 'sticky_piston[facing=up]')
      // slime sticks to every pushable neighbour: an obsidian collar (immovable, so slime ignores it) round the slime's
      // two heights, or the push would take the tube's walls along and fail
      await f.fill(-2, 1, -2, 1, 2, 1, 'obsidian')
      await f.fill(-1, 1, -1, 0, 2, 0, 'air')
      await f.fill(-1, 1, -1, 0, 1, 0, 'slime_block')
      for (let h = 3; h <= f.height; h += 4) await f.fill(-1, h, -2, 0, h, -2, 'sea_lantern')   // the tube's back wall
      await f.fill(-1, f.height + 1, -1, 0, f.height + 2, 0, 'glass')   // a skylight down the tube
      await f.ctx.cmd(`/summon iron_golem ${f.raw(0, 2, 0)} {PersistenceRequired:1b,Tags:["cells","finale"],Rotation:[0f,0f]}`)
    },
    // launch: power the four pistons for 6 ticks (they shove the slime up a block, the golem flies)
    launch: (f) => {
      f.cmd(`/fill ${f.at(-1, -1, -1)} ${f.at(0, -1, 0)} redstone_block`)
      f.pending = f.t + 6
    },
    clock: (f, t) => { if (f.pending && t >= f.pending) { f.cmd(`/fill ${f.at(-1, -1, -1)} ${f.at(0, -1, 0)} ${OFF}`); f.pending = null } },
    focus: (f) => f.rawV(0, 3.2, 0)
  }
}

// --- the build ----------------------------------------------------------------------------------------------------
function makeStunt (opts) {
  const kinds = opts.cells
  const fin = FINALES[opts.finale || 'golem_launcher']
  for (const k of kinds) if (!CELLS[k]) throw new Error(`cells: no cell kind ${k} (have ${Object.keys(CELLS).join(', ')})`)
  const n = kinds.length
  const zEnd = -(3 + SPACING * (n - 1) + 6)        // the finale's glass wall (z offset)
  return {
    name: opts.name,
    biome: process.env.BIOME || opts.biome || 'minecraft:plains',
    caption: opts.caption,
    edit: opts.edit,
    hideHand: opts.hideHand ?? true,   // no hand: the walk looks through the glass, a held item or arm filled a corner
    lerpMobs: true,   // the mobs as a vanilla client draws them (lib/harness.js lerpMob): piston shoves and launches ease

    async setup (ctx) {
      const { bot, Vec3 } = ctx
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      const X = (g ? g.x : sp.x), Z = (g ? g.z : sp.z)
      const F = Math.max(110, (g ? g.y : 64) + 30)  // a sealed lab up in the air: nothing outside to see
      Object.assign(this, { X, Z, F })
      const at = (x, y, z) => `${X + x} ${F + y} ${Z + z}`
      const c = (s) => ctx.cmd(s)
      await ctx.defaultRules()
      await c('/difficulty easy')                      // the golem only; no hostiles anywhere
      await c('/gamerule random_tick_speed 0')
      await c('/gamerule mob_griefing false')
      await c(`/forceload add ${X - 16} ${Z + zEnd - 20} ${X + 16} ${Z + 16}`)
      await ctx.waitChunks({ x0: X - 16, z0: Z + zEnd - 20, x1: X + 16, z1: Z + 16 }).catch(e => ctx.log('chunks:', e.message))
      // the shell: one solid block of wall up to the roof (y 5), then carve (each fill under the 32768 cap). The roof
      // over the corridor and the cells is glass: daylight, a clean bright lab (block light alone read brown)
      const x0 = -10, x1 = 10, zN = zEnd - 4, zS = 4, zB = zEnd + 6   // zB: the bay's south edge
      for (let z = zS; z >= zN; z -= 8) {
        const za = Math.max(zN, z - 7)
        await c(`/fill ${at(x0, -2, za)} ${at(x1, 5, z)} ${WALL}`)
      }
      await c(`/fill ${at(-4, 6, zN)} ${at(4, fin.height + 2, zB)} ${WALL}`)   // the finale's tower
      // the corridor: floor with a trim stripe, a glass roof between two strips of lights
      await c(`/fill ${at(-2, 1, 2)} ${at(2, 4, zEnd + 1)} air`)
      await c(`/fill ${at(-2, 0, 2)} ${at(2, 0, zEnd + 1)} ${FLOOR}`)
      await c(`/fill ${at(-2, 0, 2)} ${at(-2, 0, zEnd + 1)} ${TRIM}`)
      await c(`/fill ${at(2, 0, 2)} ${at(2, 0, zEnd + 1)} ${TRIM}`)
      await c(`/fill ${at(-1, 5, 2)} ${at(1, 5, zB + 1)} glass`)
      for (let z = 1; z >= zB + 1; z -= 3) for (const s of [-1, 1]) await c(`/setblock ${at(2 * s, 5, z)} sea_lantern`)
      // the walls between cells: a trim pillar at every cell edge, both sides
      for (let i = 0; i <= n; i++) {
        const ze = -SPACING * i
        for (const s of [-1, 1]) await c(`/fill ${at(3 * s, 1, ze)} ${at(3 * s, 4, ze)} ${TRIM}`)
      }
      // the cells
      this.cells = []
      for (let i = 0; i < n; i++) {
        const s = i % 2 === 0 ? -1 : 1, cz = -3 - SPACING * i
        const cell = this.cellCtx(ctx, i, s, cz)
        await c(`/fill ${at(4 * s, 1, cz - 2)} ${at(5 * s, 4, cz + 2)} air`)
        await c(`/fill ${at(4 * s, 0, cz - 2)} ${at(5 * s, 0, cz + 2)} ${FLOOR}`)
        await c(`/fill ${at(4 * s, 5, cz - 2)} ${at(5 * s, 5, cz + 2)} glass`)
        await CELLS[kinds[i]].build(cell)
        await c(`/fill ${at(3 * s, 1, cz - 2)} ${at(3 * s, 4, cz + 2)} glass`)
        await c(`/fill ${at(3 * s, 1, cz - 3)} ${at(3 * s, 4, cz - 3)} ${TRIM}`)
        await c(`/fill ${at(3 * s, 1, cz + 3)} ${at(3 * s, 4, cz + 3)} ${TRIM}`)
        this.cells.push(cell)
      }
      // the finale: a tall bay at the corridor's end (6 deep, so the camera can follow the launch from its back), a
      // glass wall, the cell behind it; glass roofs over both
      await c(`/fill ${at(-2, 1, zEnd + 1)} ${at(2, fin.height + 1, zB)} air`)
      await c(`/fill ${at(-2, fin.height + 2, zEnd + 1)} ${at(2, fin.height + 2, zB)} glass`)
      for (let h = 4; h <= fin.height; h += 4) for (const s of [-1, 1]) await c(`/setblock ${at(3 * s, h, zEnd + 3)} sea_lantern`)
      const f = this.cellCtx(ctx, n, 0, zEnd - 1, true)
      f.height = fin.height
      await fin.build(f)
      await c(`/fill ${at(-2, 1, zEnd)} ${at(2, fin.height + 1, zEnd)} glass`)
      await c(`/fill ${at(-1, 1, zEnd)} ${at(0, 2, zEnd)} obsidian`)   // the collar's front (slime would stick to glass)
      this.fin = f
      this.zB = zB
      await c(`/kill @e[type=!player,type=!item,tag=!cells,x=${X - 40},y=${F - 40},z=${Z - 60},dx=80,dy=80,dz=100]`)
      await c(`/kill @e[type=item,x=${X - 40},y=${F - 40},z=${Z - 60},dx=80,dy=80,dz=100,nbt=!{PickupDelay:32767s}]`)
      await ctx.hotbar(opts.hotbar || ['writable_book', ['wheat', 23], ['egg', 16], 'shears', ['iron_ingot', 9], 'lead', ['carrot', 64]])
      const c0 = this.cells[0]
      this.start = this.standAt(c0, CELLS[kinds[0]])
      const fp = CELLS[kinds[0]].focus(c0), eye = this.start.offset(0, 1.62, 0), d = fp.minus(eye)
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      // tp takes Minecraft degrees: yaw 0 = south; mineflayer's yaw 0 = north
      await ctx.tpCheck(this.start.x, this.start.y, this.start.z, (180 - yaw * 180 / Math.PI) % 360, -pitch * 180 / Math.PI)
      await c('/gamemode survival')
      ctx.select(8)                                     // an empty hand (a held item filled a corner of every shot)
      await bot.waitForTicks(20)
      return { x: X, y: F, z: Z + Math.round(zEnd / 2) }
    },

    // where the walk stops for a cell: close to its glass (1.2 blocks off it), level with its near end
    standAt (cell, K = {}) { return new (require('vec3').Vec3)(this.X + 0.5 + cell.s * (K.near ?? 1.4), this.F + 1, this.Z + cell.cz + (K.near !== undefined ? 2.6 : 1.8)) },

    // a cell's coordinate helpers: d = depth from the glass (1 = against it), h = above the floor, u = along +z
    cellCtx (ctx, i, s, cz, finale = false) {
      const { X, Z, F } = this
      const wx = (d) => finale ? d : s * (3 + d)
      const wz = (u) => finale ? cz + u : cz + u
      // block coords: the cell's side mirrors d; a finale uses plain x offsets
      const bx = (d) => X + (finale ? d : (s > 0 ? 3 + d : -3 - d))
      const cc = {
        ctx, i, s, cz, finale,
        at: (d, h, u) => `${bx(d)} ${F + h} ${Z + wz(u)}`,
        // a point inside a block (centre + fractions) for summons and the camera
        atf: (d, h, u) => { const b = bx(Math.floor(d)); return `${(b + (d - Math.floor(d))).toFixed(2)} ${(F + h).toFixed(2)} ${(Z + cz + u).toFixed(2)}` },
        v: (d, h, u) => new ctx.Vec3(bx(Math.floor(d)) + (d - Math.floor(d)) + (Number.isInteger(d) ? 0.5 : 0), F + h, Z + cz + u + (Number.isInteger(u) ? 0.5 : 0)),
        cmd: (s2) => ctx.bot.chat(s2),
        // the redstone stand-in: a torch two blocks under the machine at (d, 1, u) powers the floor block above it,
        // and that powers the piston or dispenser standing on it (a redstone block in the floor showed through the
        // piston's sides). Only sent when the state changes.
        power: (d, u, on, h = -1) => { const k = `${d},${h},${u}`; cc.powered = cc.powered || {}; if (!!cc.powered[k] === on) return; cc.powered[k] = on; ctx.bot.chat(`/setblock ${cc.at(d, h, u)} ${on ? 'redstone_torch' : WALL}`) },
        // an exact point: continuous d (block d spans [d, d+1) away from the glass), h above the floor, u along +z
        // (block u spans [u, u+1)): pt(1.5, 1, 0.5) is the middle of block (1, 1, 0); pt(1.5, 1, 1) is between u 0 and 1
        pt: (d, h, u) => new ctx.Vec3(finale ? X + d : (s > 0 ? X + 3 + d : X - 2 - d), F + h, Z + cz + u),
        // a point with no centring (block corners): the finale's 2x2 tube is centred on a corner
        raw: (x, y, z) => `${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + cz + z).toFixed(2)}`,   // decimals: whole numbers get centred on the block
        rawV: (x, y, z) => new ctx.Vec3(X + x, F + y, Z + cz + z),
        put: (d, h, u, b) => ctx.cmd(`/setblock ${cc.at(d, h, u)} ${b}`),
        fill: (d0, h0, u0, d1, h1, u1, b) => ctx.cmd(`/fill ${cc.at(d0, h0, u0)} ${cc.at(d1, h1, u1)} ${b}`),
        summon: (type, d, h, u, rot, extra = '') => {
          const p = cc.v(d, h, u)
          if (rot === 'out') rot = s > 0 ? 90 : -90                  // facing the corridor
          // west-side cells face the corridor at yaw -90 (east); the rotation given is for an east-side cell
          return ctx.cmd(`/summon ${type} ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)} {PersistenceRequired:1b,Tags:["cells","cell${i}"],Rotation:[${rot}f,0f]${extra ? ',' + extra : ''}}`)
        }
      }
      void wx
      return cc
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { X, F } = this
      const stopSounds = relaySounds(ctx)
      // a mob's hurt sound on a real hit (the vanilla client plays it from the damage event)
      const onDmg = (p) => {
        const e = bot.entities[p.entityId]
        if (!e || e === bot.entity || !e.name) return
        const d = bot.entity.position.offset(0, 1.62, 0).distanceTo(e.position)
        const v = Math.max(0, 1 - d / 16)
        if (v > 0.05) ctx.sound(`entity.${e.name}.hurt`, +v.toFixed(3), +((e.metadata && e.metadata[16] ? 1.5 : 1) * (0.9 + Math.random() * 0.2)).toFixed(3))
      }
      bot._client.on('damage_event', onDmg)
      let t = 0
      const clocks = () => {
        for (let i = 0; i < n; i++) { const K = CELLS[kinds[i]]; if (K.clock) K.clock(this.cells[i], t) }
        this.fin.t = t; fin.clock(this.fin, t)
        t++
      }
      for (let i = 0; i < n; i++) { this.cells[i].from = CELLS[kinds[i]].always ? 0 : Infinity; if (CELLS[kinds[i]].props) CELLS[kinds[i]].props(this.cells[i]) }
      bot.on('physicsTick', clocks)
      const rig = camera(ctx)
      await bot.waitForTicks(2)
      ctx.mark('open')
      // each cell: walk to the stand spot (level with the cell's near edge), look in, hold while it plays
      for (let i = 0; i < n; i++) {
        const cell = this.cells[i], K = CELLS[kinds[i]]
        const stand = this.standAt(cell, K)
        rig.focus = K.focus(cell)
        if (i > 0) {
          rig.steer = stand
          await rig.until(() => bot.entity.position.distanceTo(stand) < 0.6, 80)
          rig.steer = null
        }
        if (!K.always) cell.from = t + (K.lead ?? opts.lead ?? 6)
        ctx.mark('cell', { n: i, kind: kinds[i] })
        await bot.waitForTicks(K.hold)
      }
      // the finale: walk up to the glass, look at the golem, launch twice: the second is the payoff
      const f = this.fin
      const stand = new Vec3(X + 0.5, F + 1, this.Z + zEnd + 3.2)   // 4 blocks off the tube: the golem fills the frame
      rig.steer = stand
      rig.focus = fin.focus(f)
      await rig.until(() => bot.entity.position.distanceTo(stand) < 0.6, 90)
      rig.steer = null
      ctx.mark('finale')
      const golem = () => Object.values(bot.entities).find(e => e.name === 'iron_golem')
      const flights = opts.launches || 1
      for (let k = 0; k < flights; k++) {
        await bot.waitForTicks(k === 0 ? 6 : 4)
        fin.launch(f)
        ctx.mark('launch', { n: k })
        if (k === flights - 1) ctx.mark('payoff')
        rig.lim = { speed: 260 * DEG / 20, accel: 1400 * DEG / 400 }   // following a golem in flight
        let top = 0
        for (let j = 0; j < 80; j++) {
          const gl = golem()
          if (gl) {
            const y = gl.position.y - F
            top = Math.max(top, y)
            rig.focus = f.rawV(0, gl.position.y - F + 1.6, 0)
            if (top > 4 && y < 2.3) { ctx.mark('land', { n: k, top: +top.toFixed(2) }); if (k === flights - 1) ctx.mark('slam'); break }
          }
          await bot.waitForTicks(1)
        }
        ctx.log('launch', k, 'top', top.toFixed(2))
        if (k < flights - 1) { rig.focus = fin.focus(f); rig.lim = { speed: 140 * DEG / 20, accel: 700 * DEG / 400 } }
      }
      // the end: still on the golem as it settles on the slime
      for (let j = 0; j < 30; j++) { const gl = golem(); if (gl) rig.focus = f.rawV(0, gl.position.y - F + 1.6, 0); await bot.waitForTicks(1) }
      rig.stop()
      bot.removeListener('physicsTick', clocks)
      bot._client.removeListener('damage_event', onDmg)
      stopSounds()
      return true
    }
  }
}

module.exports = { makeStunt, CELLS, FINALES, SPACING }
