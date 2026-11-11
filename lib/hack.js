// The "hack" format (family `hack`; docs/formats.md, STANDARDS r:rc15847): one clever, REAL vanilla 1.21 block trick
// per Short, a "POV: you realized..." caption, and the trick working on screen in a lived-in room inside 1.5 s.
// Each episode swaps the trick; this module is the part that stays the same:
//   den(b, v)       the lived-in room every episode opens in (a furnished den in a real house on real terrain): the
//                   player stands in it facing its north wall, the TRICK WALL, which the episode dresses. Behind the
//                   trick wall (local z -5..-1) and east of the room (x 13..15) is solid "back of the house" the
//                   episode carves its secret into.
//   makeStunt(ep)   a stunt module: finds a site, places the den (terrain fitted), stamps the episode's extra pieces
//                   (fit: false, e.g. rooms under the ground), runs ep.dress (live extras: chest contents, pets),
//                   the hotbar, then ep.perform(ctx, H) with the helpers below; and the edit every episode shares
//                   (caption, a pop on every reveal, a dip + impact + flash + punch on the payoff, the end 1.0 s
//                   after it: pace's payoff rule).
// Local frame (the den faces south: +z is its front door; mineflayer yaw 0 looks north, -z): floor y 0, feet y 1.
//   the den's inside   x 1..11, z 1..9, y 1..4 (ceiling y 5)
//   the trick wall     z 0, x 1..11 (plain planks until the episode dresses it)
//   the start          (6.5, 1, 5.3) looking north at the trick wall: the trick is ~4.3 blocks (~1.1 s) away
// H, in perform:
//   H.K                 the story kit (lib/story.js storyKit): eased looks (K.aimAt), K.walkTo, K.open/close, K.dig
//   H.at(x, y, z)       a local point -> world Vec3 (block centres: pass x + 0.5)
//   H.walk(pts, o)      K.walkTo over local points [[x, y, z], ...]
//   H.look(x, y, z, o)  K.aimAt a local point (o.max ticks)
//   H.reveal(n)         mark the nth trick reveal (a pop + its sub in the edit)
//   H.payoff()          the payoff mark (impact, flash, the end 1.0 s later)
//   H.hold(ticks)       keep the camera alive (the kit's sway) for some ticks
const sets = require('./sets')
const PIECES = require('./sets/pieces')
const { Voxels } = require('./sets/voxel')
const { palette } = require('./sets/palette')
const { storyKit } = require('./story')

const START = [6.5, 1, 5.3]

// the lived-in den. v: { palette (default spruce), seed }
function den (b, v = {}) {
  const P = palette({ palette: 'spruce', ...v })
  const X1 = 16, Z0 = -6, Z1 = 10, H = 5
  // ground round it (the fit grades the real terrain beyond), the shell, a stone skirting course, the inside cleared
  b.fill(-1, 0, Z0 - 1, X1 + 1, 0, Z1 + 1, 'grass_block')
  b.fill(-1, 1, Z0 - 1, X1 + 1, H + 12, Z1 + 1, 'air')
  b.fill(0, 0, Z0, X1, H, Z1, P.wall, 'hollow')
  b.fill(0, 1, Z0, X1, 1, Z1, b.mix({ [P.footing]: 2, [P.footing2]: 1 }), 'walls')
  b.fill(0, 0, Z0, X1, 0, Z1, b.mix({ [P.footing]: 2, [P.footing2]: 1 }))
  // log posts every 4 on the outside walls (depth), a beam course at the top plate
  for (let x = 0; x <= X1; x += 4) for (const z of [Z0, Z1]) b.fill(x, 1, z, x, H - 1, z, `${P.frame}[axis=y]`)
  for (const z of [Z0, -2, 2, 6, Z1]) for (const x of [0, X1]) b.fill(x, 1, z, x, H - 1, z, `${P.frame}[axis=y]`)
  b.fill(0, H, Z0, X1, H, Z1, `${P.beam}[axis=x]`, 'walls')
  b.roof(0, Z0, X1, Z1, H + 1, { along: 'x', stair: P.roof, gable: P.wall, over: 1 })
  // the back of the house: solid (the episode carves its secret here), the den's inside clear
  b.fill(1, 1, Z0 + 1, X1 - 1, H - 1, -1, 'spruce_planks')
  b.fill(13, 1, 0, X1 - 1, H - 1, Z1 - 1, 'spruce_planks')
  b.fill(1, 1, 1, 11, H - 1, 9, 'air')
  // the trick wall (z 0) and the east wall (x 12): plain planks with posts, dressed by the episode / the fireplace
  b.fill(1, 1, 0, 11, H - 1, 0, 'spruce_planks')
  b.fill(12, 1, 0, 12, H - 1, 10, 'spruce_planks')
  // the floor: dark oak with a few spruce boards; ceiling beams
  b.fill(1, 0, 1, 11, 0, 9, b.mix({ dark_oak_planks: 5, spruce_planks: 1 }))
  b.fill(1, H, 1, 11, H, 9, 'spruce_planks')
  for (const z of [3, 7]) b.fill(1, H - 1, z, 11, H - 1, z, `${P.beam}[axis=x]`)
  // a fireplace on the east wall: a brick breast, a lit campfire, a mantel with a candle and a plant
  b.fill(12, 1, 4, 12, H - 1, 6, 'bricks'); b.fill(11, 1, 4, 11, 3, 4, 'bricks'); b.fill(11, 1, 6, 11, 3, 6, 'bricks')
  b.set(11, 1, 5, 'campfire[lit=true,facing=west]'); b.set(11, 3, 5, 'bricks')
  b.fill(10, 3, 4, 10, 3, 6, 'spruce_slab[type=top]'); b.set(10, 4, 4, 'candle[candles=3,lit=true]'); b.set(10, 4, 6, 'potted_fern')
  b.fill(X1, 1, 4, X1, H + 8, 6, 'bricks', 'walls'); b.fill(13, 1, 4, 15, H + 8, 6, 'bricks', 'walls')   // the chimney stack
  b.set(14, H + 8, 5, 'campfire[lit=true]')
  // armchairs by the fire and a rug
  b.fill(7, 1, 2, 10, 1, 8, 'red_carpet'); b.fill(8, 1, 3, 9, 1, 7, 'white_carpet')   // (off the walk line x 6: carpet counts as a block to K.walkTo)
  b.chair(9, 1, 3, 'e', 'spruce_stairs'); b.chair(9, 1, 7, 'e', 'spruce_stairs')
  b.set(9, 1, 2, `${P.trap}[facing=south,open=true]`); b.set(9, 1, 8, `${P.trap}[facing=north,open=true]`)
  // a reading corner on the west: a table, a candle, books; a kitchen corner by the door
  b.table(2, 1, 4, { leg: 'spruce_fence', top: 'spruce_pressure_plate' }); b.set(2, 3, 4, 'candle[candles=2,lit=true]')
  b.chair(2, 1, 5, 'n', 'spruce_stairs'); b.set(1, 1, 2, 'barrel[facing=up]'); b.set(1, 2, 2, 'potted_azalea_bush')
  b.set(1, 1, 8, 'smoker[facing=east]'); b.set(1, 1, 9, 'crafting_table'); b.set(2, 1, 9, 'water_cauldron[level=3]'); b.set(3, 1, 9, 'barrel[facing=up]'); b.set(3, 2, 9, 'potted_red_tulip')
  b.bed(10, 1, 9, 'w', 'cyan')
  // windows: west wall (x 0) and the front (z 10) either side of the door; sills and shutters outside
  for (const z of [3, 7]) b.fill(0, 2, z, 0, 3, z, P.glass)
  for (const x of [3, 9]) { b.fill(x - 1, 2, Z1, x, 3, Z1, P.glass); b.set(x - 1, 1, Z1 + 1, `${P.trap}[facing=south,half=top]`); b.set(x, 1, Z1 + 1, `${P.trap}[facing=south,half=top]`) }
  b.door(6, 1, Z1, 's', P.door)
  // lanterns from the beams
  b.hang(4, H - 2, 3, 0); b.hang(8, H - 2, 7, 0)
  b.anchor('doorstep', 6, 1, Z1 + 2, 'n')
  return { P, X1, Z0, Z1, H }
}

// a standing banner in a 1x2 opening of a wall: no collision box (vanilla BannerBlock is noCollission), so the
// player walks straight through it. rot: the banner's rotation (0 faces south, 4 west, 8 north, 12 east).
// back: the block behind the opening (a decoy: a solid back; the real one: air).
function bannerDoor (b, x, y, z, color, rot, { back = null } = {}) {
  b.set(x, y, z, `${color}_banner[rotation=${rot}]`); b.set(x, y + 1, z, 'air')
  if (back) { const [bx, bz] = back.at; b.fill(bx, y, bz, bx, y + 1, bz, back.block) }
}

// a piece built in code, registered with the set library for this run (lib/sets/pieces stays the canon list)
function register (name, buildFn) {
  PIECES[name] = { name, about: `hack episode piece ${name}`, variants: {}, build: (v = {}) => { const b = new Voxels(name).seed(v.seed || 7); buildFn(b, v); return b } }
  return name
}

// the edit every episode shares. reveals: how many reveal marks; subs: [mark, text, secs, nth] per episode
function hackEdit ({ caption, red, reveals, subs = [], extra = {} }) {
  const sfx = [['pop', 'go', { gain: 0.5 }], ['air', 'go', 'payoff', { gain: 0.1 }]]   // a pop on frame 0: pace wants a sound by 0.3 s (footsteps start ~0.5 s)
  for (let i = 0; i < reveals; i++) sfx.push(['pop', 'reveal', { nth: i, gain: 0.45 }])
  sfx.push(['dip', 'payoff', 0.3], ['impact', 'payoff'])
  return {
    caption, red, startAt: 'go:-0.05', endAfter: 'payoff:1.0', dropAt: 'payoff',
    subs, flash: [['payoff', 0, 0.45]], punch: [['payoff', 0, 1.08]],
    sfx, ...extra, ...(extra.sfx ? { sfx: [...sfx, ...extra.sfx] } : {})
  }
}

// ep: { name, caption, red, subs, reveals, den: variant, pieces: { name: buildFn(b) } (stamped with fit: false in
// the den's frame), dress(ctx, H) (async: live extras), hotbar, select, perform(ctx, H) -> ok, time, edit (extra) }
function makeStunt (ep) {
  const denName = register(`hack_den_${ep.name}`, (b, v) => { const g = den(b, v); if (ep.wall) ep.wall(b, g) })
  const extra = Object.entries(ep.pieces || {}).map(([n, fn]) => [register(`hack_${ep.name}_${n}`, fn), n])
  return {
    name: ep.name,
    biome: process.env.BIOME || ep.biome || 'minecraft:plains',
    caption: ep.caption,
    time: ep.time ?? 6000,
    hideHand: ep.hideHand ?? false,
    edit: hackEdit({ caption: ep.caption, red: ep.red, reveals: ep.reveals, subs: ep.subs, extra: ep.edit || {} }),

    async setup (ctx) {
      const { bot } = ctx
      await ctx.defaultRules()
      await ctx.cmd('/gamerule random_tick_speed 0')
      await ctx.cmd('/difficulty peaceful')
      await ctx.cmd('/kill @e[type=!player]')
      const site = await sets.findSite(ctx, { w: 30, d: 30, maxRange: 4, maxTrees: 0.3 })
      const at = site ? { x: site.x, z: site.z } : null
      const home = await sets.place(ctx, denName, { ...(at || {}), facing: 'south', variant: ep.den || {} })
      this.home = home
      // the den's local (0, 0, 0) block in the world: everything else is stamped in the same frame
      const o = home.at(0, 0, 0)
      this.O = { x: Math.floor(o.x), y: o.y, z: Math.floor(o.z) }
      for (const [id] of extra) {
        const vox = sets.build(id)
        const { lo } = vox.bounds()
        const tid = sets.install(id, vox)
        await sets.forceload(ctx, this.O.x + lo[0] - 4, this.O.z + lo[2] - 4, this.O.x + vox.bounds().hi[0] + 4, this.O.z + vox.bounds().hi[2] + 4)
        await ctx.cmd(`/place template ${tid} ${this.O.x + lo[0]} ${this.O.y + lo[1]} ${this.O.z + lo[2]}`)
        ctx.log(`hack: stamped ${id} (${vox.count()} blocks) at ${this.O.x + lo[0]} ${this.O.y + lo[1]} ${this.O.z + lo[2]}`)
      }
      await ctx.cmd('/kill @e[type=item]')
      const H = this.H = helpers(ctx, this.O)
      if (ep.dress) await ep.dress(ctx, H)
      await ctx.hotbar(ep.hotbar || [['lantern', 16], ['torch', 64], ['bread', 12]])
      const s = H.at(...START)
      await ctx.tpCheck(s.x, s.y, s.z, 180, ep.pitch ?? 4)
      await ctx.cmd('/gamemode survival')
      ctx.select(ep.select ?? 0)
      await bot.waitForTicks(30)
      return { x: s.x, y: s.y, z: s.z }
    },

    async perform (ctx) {
      const H = this.H
      H.K = storyKit(ctx, { line: () => ({ dur: 0, gap: 0 }), gap: 0 }, { X: this.O.x, Z: this.O.z, F: this.O.y }, { warm: null })
      H.K.base = { yaw: ctx.bot.entity.yaw, pitch: ctx.bot.entity.pitch }
      return ep.perform(ctx, H)
    }
  }
}

function helpers (ctx, O) {
  const V = (x, y, z) => new ctx.Vec3(O.x + x, O.y + y, O.z + z)
  let reveals = 0
  const H = {
    O,
    at: V,
    walk: (pts, o = {}) => H.K.walkTo(pts.map(p => V(...p)), o),
    look: (x, y, z, o = {}) => H.K.aimAt(Object.assign(V(x, y, z), { exact: true }), o),
    reveal: (extra = {}) => { ctx.mark('reveal', { n: reveals++, ...extra }); return reveals },
    payoff: () => ctx.mark('payoff'),
    hold: async (ticks) => { for (let k = 0; k < ticks; k++) { H.K.look(k); await ctx.bot.waitForTicks(1) } },
    cmd: (s) => ctx.cmd(s),
    A: (x, y, z) => `${O.x + x} ${O.y + y} ${O.z + z}`
  }
  return H
}

module.exports = { den, bannerDoor, register, hackEdit, makeStunt, START }
