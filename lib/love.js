// The "love" format (family `love`; docs/formats.md, STANDARDS r:rf91fef; owner, 2026-11-11: "This is another one
// thats like a heart and its cute and lovey"). A cute, wholesome build with a heart reveal at night, captioned to be
// sent to someone. Each episode swaps the picture, the set and the colours; this module is the part that stays:
//   1. golden hour in a grove: a picture board (default: a heart of redstone lamps on a cherry-plank board) with its
//      last few lamps missing; the player walks up and puts them in (every place aimed: lib/act.js, r:rffba12; a
//      lamp at least every 1.0 s, r:r478786)
//   2. a step back to take it in, then night falls (a fast in-game sunset: the sky and the light change every tick;
//      the camera drifts up to the sunset and back, slow, r:r38374d)
//   3. the lever on its post: the picture lights up row by row from the bottom with a rising chime (hidden redstone
//      blocks swapped in behind the lamps, the interrupt_lamps trick) and, as the last row lights, a ring of fireworks
//      bursts round it: the payoff (the light-up: a sound hit + a picture change), the end 1.0 s after.
// Local frame (mineflayer yaw 0 looks north, -z): the ground y 0 (feet y 1), the board's front layer z -9 (its face
// z -8), the hidden back layer z -10, the board centred on x 0.5. The player starts at FAR (eyes ~8.5 blocks from
// the board: the whole picture in frame), builds from NEAR, and backs up to FAR again; the lever sits on a post just
// right of the line between them.
//   const love = require('../lib/love')
//   module.exports = love.makeStunt({ name, caption, red, art, palette, missing, subs, fireworks, trees, ... })
// art: rows top-down; '#' a lamp, 'o' a lamp the player places (missing at the start), '.' the board's background.
const { storyKit } = require('./story')
const { plateau } = require('./plateau')
const { relaySounds } = require('./chain')
const dress = require('./sets/dress')
const act = require('./act')

const HEART = [
  '.##...##.',
  '####.####',
  '#########',
  '#########',
  '.#######.',
  '..ooooo..',
  '...ooo...',
  '....o....'
]
const FAR_Z = 3.0          // feet z at the wide spot (the whole board in frame)
const NEAR_Z = -5.5        // feet z at the build spot (every missing cell within reach)
const FRONT = -9, BACK = -10
const LEVER = [2, -1]      // the lever's post (x, z), right of the walk line (x 0.5), within reach of FAR
const PINKS = [16738740, 16758465, 16711680, 16777215, 15961002, 16744319]   // hot pink, light pink, red, white, pink, coral

// a firework rocket's NBT: one explosion of the given shape and colours, bursting after `life` ticks
function rocket (life, shape, colors, fade = [16777215]) {
  return `{LifeTime:${life},FireworksItem:{id:"minecraft:firework_rocket",count:1,components:{"minecraft:fireworks":{flight_duration:1,explosions:[{shape:"${shape}",colors:[I;${colors.join(',')}],fade_colors:[I;${fade.join(',')}],has_twinkle:true}]}}}}`
}

// the cells of a picture in the local frame: { x, y, ch } (y counts up from the board's bottom margin)
function cells (art, y0) {
  const w = art[0].length, x0 = -Math.floor(w / 2)
  const out = []
  art.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') out.push({ x: x0 + c, y: y0 + art.length - 1 - r, ch }) }))
  return { out, x0, x1: x0 + w - 1, top: y0 + art.length - 1 }
}

// the edit every episode shares: the caption from frame 1, a pop on the first frame (a sound by 0.3 s), a pop as the
// last lamp goes in, the subs, then the payoff: the music's drop, a dip before it, a flash and a punch on it
function loveEdit ({ caption, red, subs = [], extra = {} }) {
  const sfx = [['pop', 'go:0.47', { gain: 0.5 }], ['pop', 'complete', { gain: 0.5 }], ['dip', 'payoff', 0.4]]
  return {
    // already walking up on frame 1, the whole board still in frame
    caption, red, startAt: 'go:0.45', endAfter: 'payoff:1.0', dropAt: 'payoff',
    subs, flash: [['payoff', 0, 0.45]], punch: [['payoff', 0, 1.08]],
    ...extra, sfx: [...sfx, ...(extra.sfx || [])]
  }
}

// ep: { name, caption, red, subs, art (default HEART), palette { board, border, back, lamp }, biome, groundBiome,
// trees (feature names round the set), petals (ground cover), time [start, night], fireworks (colours), edit (extra) }
function makeStunt (ep) {
  const art = ep.art || HEART
  const pal = { board: 'cherry_planks', border: 'stripped_cherry_log', back: 'cherry_planks', lamp: 'redstone_lamp', post: 'cherry_log', ...(ep.palette || {}) }
  const [T0, T1] = ep.time || [11600, 17600]
  const pic = cells(art, 2)                       // the picture's bottom row at y 2 (a 1-block margin on the board)
  const BX0 = pic.x0 - 1, BX1 = pic.x1 + 1, BY0 = 1, BY1 = pic.top + 1
  return {
    name: ep.name,
    biome: process.env.BIOME || ep.biome || 'minecraft:cherry_grove',
    caption: ep.caption,
    time: T0,
    edit: loveEdit({ caption: ep.caption, red: ep.red, subs: ep.subs, extra: ep.edit || {} }),

    async setup (ctx) {
      const { bot } = ctx
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z) || sp
      const X = g.x, Z = g.z
      await ctx.defaultRules()
      for (const c of ['/difficulty peaceful', '/gamerule random_tick_speed 0', '/gamerule block_drops false']) await ctx.cmd(c)
      // a level clearing in the grove (levelled at the terrain's high percentile: no pit walls), its trees cleared
      // in a ring round it so none is cut in half; then our own trees and petals
      const F = await plateau(ctx, { x0: X - 18, x1: X + 18, z0: Z - 22, z1: Z + 10, biome: ep.groundBiome || 'minecraft:cherry_grove', pct: 0.9, taper: 10, trees: 10 })
      Object.assign(this, { X, Z, F })
      const A = (x, y, z) => `${X + x} ${F + y} ${Z + z}`
      await ctx.cmd('/kill @e[type=!player]')
      // a neighbouring biome's landmarks out of the skyline (an ice spike stood over the grove's trees 50 blocks off)
      // (unchecked: a box with none of it answers "No blocks were filled")
      const far = []
      for (const blk of ep.clearFar || ['packed_ice', 'blue_ice']) {
        for (let x0 = -80; x0 < 80; x0 += 32) for (let z0 = -90; z0 < 60; z0 += 32) for (let y0 = -4; y0 < 60; y0 += 32) {
          far.push(`/fill ${A(x0, y0, z0)} ${A(x0 + 31, y0 + 31, z0 + 31)} air replace ${blk}`)
        }
      }
      await dress.burst(ctx, far)
      // the board: a border, the background, the back layer (the hidden redstone goes here), the picture
      await ctx.cmd(`/fill ${A(BX0, BY0, BACK)} ${A(BX1, BY1, BACK)} ${pal.back}`)
      await ctx.cmd(`/fill ${A(BX0, BY0, FRONT)} ${A(BX1, BY1, FRONT)} ${pal.border}[axis=z]`)
      await ctx.cmd(`/fill ${A(BX0 + 1, BY0 + 1, FRONT)} ${A(BX1 - 1, BY1 - 1, FRONT)} ${pal.board}`)
      for (const c of pic.out) await ctx.cmd(`/setblock ${A(c.x, c.y, FRONT)} ${c.ch === 'o' ? 'air' : pal.lamp}`)
      // two posts holding it up behind, the lever's post in front
      for (const x of [BX0 + 1, BX1 - 1]) await ctx.cmd(`/fill ${A(x, 1, BACK - 1)} ${A(x, BY1 - 2, BACK - 1)} ${pal.post}`)
      // trees round it (behind and at the sides, never between the player and the board) and petals on the ground
      dress.seed(ep.seed || 7)
      const kinds = ep.trees || ['cherry']
      const spots = ep.treeSpots || [[-12, -17], [-4, -18], [5, -17], [13, -16], [-15, -9], [16, -8], [-14, -1], [15, 1], [-9, -13], [10, -12]]
      for (let i = 0; i < spots.length; i++) await dress.tree(ctx, X + spots[i][0], Z + spots[i][1], kinds[i % kinds.length])
      const petals = ep.petals || ['pink_petals[flower_amount=4,facing=north]', 'pink_petals[flower_amount=3,facing=east]', 'pink_petals[flower_amount=2,facing=south]', 'pink_petals[flower_amount=4,facing=west]']
      await dress.flowers(ctx, { x: X, z: Z - 4, r: 16, n: 160, kinds: petals, clump: 2 })
      await dress.grass(ctx, { x: X, z: Z - 4, r: 17, n: 40, tall: 0.05 })
      // the walk line and the lever stay clear (petals have no collision, grass does in the walk: keep it off)
      await ctx.cmd(`/fill ${A(0, 1, -7)} ${A(0, 1, 2)} air replace #minecraft:replaceable`)
      await ctx.cmd(`/fill ${A(-1, 1, -7)} ${A(-1, 1, 2)} air replace short_grass`)
      await ctx.cmd(`/fill ${A(1, 1, -7)} ${A(1, 1, 2)} air replace short_grass`)
      await ctx.cmd(`/fill ${A(BX0, 1, FRONT + 1)} ${A(BX1, 2, FRONT + 1)} air replace #minecraft:replaceable`)
      await ctx.cmd(`/setblock ${A(LEVER[0], 1, LEVER[1])} ${pal.post}`)
      await ctx.cmd(`/setblock ${A(LEVER[0], 2, LEVER[1])} lever[face=floor,facing=south,powered=false]`)
      await ctx.cmd('/kill @e[type=item]')
      await ctx.hotbar(ep.hotbar || [['redstone_lamp', 9], 'lever', ['firework_rocket', 16], ['cherry_sapling', 8], ['poppy', 12], 'cake', ['pink_petals', 32], ['cookie', 16]])
      // facing the board's middle from the first frame
      const pitch = -Math.atan2((BY0 + BY1) / 2 + 0.6 - 2.62, FAR_Z - FRONT - 1) * 180 / Math.PI
      await ctx.tpCheck(X + 0.5, F + 1, Z + FAR_Z, 180, +pitch.toFixed(1))
      await ctx.cmd('/gamemode survival')
      ctx.select(0)
      await bot.waitForTicks(30)
      return { x: X + 0.5, y: F + 1, z: Z + FAR_Z }
    },

    async perform (ctx) {
      const { X, Z, F } = this
      const { bot } = ctx
      const K = storyKit(ctx, { gap: 0, lines: [], line (id) { throw new Error(`lib/love: no lines (${id})`) } }, { X, Z, F })
      const A = act(ctx, { K })                          // every place and use aimed by construction (r:rffba12)
      const slow = act(ctx, { K, turnSpeed: 45, turnAccel: 120 })   // the sunset look: a slow drift
      const P = (x, y, z) => new ctx.Vec3(X + x, F + y, Z + z)
      const stopSounds = relaySounds(ctx)
      K.sway = 0.1
      const centre = P(0.5, (BY0 + BY1) / 2 + 0.6, FRONT + 1)
      // 1. walk up to the board (the whole picture in frame on frame 1)
      ctx.mark('go')
      K.base = K.aim(centre)
      for (let k = 0; k < 60 && bot.entity.position.z > Z + NEAR_Z + 0.45; k++) { K.ctl('forward', true); K.ctl('sprint', true); K.look(k); await bot.waitForTicks(1) }
      K.ctl('forward', false); K.ctl('sprint', false)
      // 2. the missing lamps, each clicked onto the back layer through its hole (outside in, so the lamp just placed
      // never stands between the eye and the next hole), the bottom tip last
      const todo = pic.out.filter(c => c.ch === 'o')
      const rows = [...new Set(todo.map(c => c.y))].sort((a, b) => b - a)
      const order = []
      for (const y of rows) {
        const r = todo.filter(c => c.y === y).sort((a, b) => a.x - b.x)
        while (r.length) { order.push(r.shift()); if (r.length) order.push(r.pop()) }
      }
      let n = 0
      for (const c of order) {
        await A.place(P(c.x, c.y, FRONT), { block: pal.lamp, sound: 'block.glass.place', against: P(c.x, c.y, BACK) })   // a lamp's sound type is glass
        K.say(`/clear @s ${pal.lamp} 1`)
        ctx.mark('lamp', { n: n++ })
      }
      ctx.mark('complete')
      // 3. back up to take it in, eyes on the picture
      await A.back(Math.round((FAR_Z - NEAR_Z) / 0.216) + 4, { look: centre })
      ctx.mark('back')
      // 4. night falls: the sun goes down behind the trees in the west (left), the camera drifts up to it and back
      ctx.mark('night')
      // (the camera never rests: rec_check's held check doesn't count the sky, so the drift carries the shot)
      const west = P(-14, 9, -8)
      const total = ep.nightTicks || 76
      let t = T0
      const tick = () => { t += (T1 - T0) / total; const v = Math.round(Math.min(T1, t)); bot.chat(`/time set ${v}`); ctx.dayTime = v; ctx.mark('time', { time: v }) }
      const during = async (fn) => { const p = fn(); let done = false; p.then(() => { done = true }); while (!done) { tick(); await bot.waitForTicks(1) } }
      await during(() => slow.turnTo(west, { max: 30, hold: 2 }))
      // then a slow drift down to the lever's side of the picture, as long as the night still has to fall
      // (to a point that keeps the whole picture and the lever in frame, slow enough to still be moving as night ends)
      const drift = act(ctx, { K, turnSpeed: 22, turnAccel: 50 })
      const lever = P(LEVER[0], 2, LEVER[1])
      const aims = [P(1.3, 3.4, FRONT + 1)]
      let ai = 0
      while (t < T1 - 1) {
        tick()
        const landed = await drift.turnTo(aims[ai], { max: 1 })   // (a step waits its own tick; a landed one doesn't)
        if (landed && ai < aims.length - 1) ai++
        if (landed) { K.base = K.aim(aims[ai]); K.look(0); await bot.waitForTicks(1) }
      }
      ctx.mark('dark')
      // 5. the lever (the picture's bottom in frame), then the light-up from the bottom row to the top with a rising
      // chime, the eyes coming back up with it; the last row and a ring of fireworks are the payoff
      await A.use(lever,{ sound: 'block.lever.click', volume: 0.6 })
      ctx.mark('lever')
      const lampRows = [...new Set(pic.out.map(c => c.y))].sort((a, b) => a - b)
      const per = ep.rowTicks || 2
      const litAt = lampRows.length * per
      // rockets up the sides of the board: they burst beside the top as the last row lights
      for (const [x, z, k] of [[BX0 - 2, FRONT - 1, 0], [BX1 + 2, FRONT - 1, 1], [BX0 - 4, FRONT + 2, 2], [BX1 + 4, FRONT + 2, 3]]) {
        K.say(`/summon firework_rocket ${X + x + 0.5} ${F + 1.2} ${Z + z + 0.5} ${rocket(litAt - 1, k % 2 ? 'large_ball' : 'star', [PINKS[k], PINKS[(k + 2) % PINKS.length]])}`)
      }
      ctx.sound('entity.firework_rocket.launch', 0.8, 1)
      const NOTES = [0.7, 0.79, 0.89, 0.94, 1.06, 1.19, 1.33, 1.41, 1.59, 1.78]
      const up = A.turnTo(centre, { max: 30 })
      let done = false
      up.then(() => { done = true })
      for (let i = 0; i < lampRows.length; i++) {
        for (const c of pic.out) if (c.y === lampRows[i]) K.say(`/setblock ${X + c.x} ${F + c.y} ${Z + BACK} redstone_block`)
        ctx.sound('block.note_block.chime', 0.7, NOTES[Math.min(NOTES.length - 1, i)])
        ctx.mark('row', { n: i })
        if (i === lampRows.length - 1) {
          // the ring: instant bursts round the picture (in front of the board), all on the payoff tick
          const cx = 0.5, cy = (BY0 + BY1) / 2 + 0.5, rx = (BX1 - BX0) / 2 + 3, ry = (BY1 - BY0) / 2 + 2.5
          const ring = ep.ring || [-20, 20, 60, 90, 120, 160, 200]   // (each flash is a 14-block glow: more washed the heart out)
          ring.forEach((deg, k) => {
            const a = deg * Math.PI / 180
            K.say(`/summon firework_rocket ${X + cx + Math.cos(a) * rx} ${F + cy + Math.sin(a) * ry} ${Z + FRONT + 2.5} ${rocket(per - 1, ['large_ball', 'small_ball', 'burst', 'star'][k % 4], [PINKS[k % PINKS.length], PINKS[(k + 1) % PINKS.length]])}`)
          })
        }
        for (let k = 0; k < per; k++) { if (done) K.look(0); await bot.waitForTicks(1) }
      }
      ctx.mark('payoff')
      for (let k = 0; k < 40; k++) { K.base = K.aim(centre); K.look(k); await bot.waitForTicks(1) }
      stopSounds()
      let lit = 0
      for (const c of pic.out) { const b = bot.blockAt(P(c.x, c.y, FRONT)); if (b && b.name === pal.lamp && b.getProperties().lit) lit++ }
      ctx.log(`love: lamps lit ${lit}/${pic.out.length}`)
      return lit >= pic.out.length - 1
    }
  }
}

module.exports = { makeStunt, loveEdit, rocket, cells, HEART, PINKS }
