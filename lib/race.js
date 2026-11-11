// Format "race" (owner 2026-11-11, r:rbe60ef): two vanilla spreaders race across one big square field in a top-down
// time-lapse; viewers pick a side and wait for the winner. A stunt module is makeRace({ ... }) with its own pair:
//
//   module.exports = makeRace({
//     name: 'race_grass_mycelium',
//     a: { block: 'grass_block', label: 'GRASS', color: 'green' },     // starts in the top-left (north-west) corner
//     b: { block: 'mycelium', label: 'MYCELIUM', color: 'purple' },    // starts in the bottom-right (south-east) corner
//     field: 'dirt',            // what both of them spread onto
//     caption, red, colors,     // the top caption (edit.py)
//     tickSpeed: 300,           // /gamerule random_tick_speed during the race (vanilla spreading, sped up)
//     speed: 3,                 // the edit's time-lapse factor over the race (scripts/timewarp.py)
//   })
//
// The set: a floating square of `field` (size x size, default 64) high over a deep ocean, inside a rim, so nothing
// outside can spread in and the camera sees only the field, the rim and the sea far below. The recording bot stands
// under the platform (hidden from the camera). Both seeds (quarter discs of radius `seed`) are down before the
// recording starts, with random ticks off; the race starts on the first recorded tick (the first frame already shows
// both sides). The spreading is the server's own random ticks (vanilla SpreadingSnowyDirtBlock: grass and mycelium
// both turn dirt in a 3x5x3 box with light >= 9 above), only faster.
//
// Marks: race_start, landed (the camera's drop-in), score {a, b} (fractions of the field, every SCORE_EVERY ticks), lead {who} (a debounced lead
// change), meet (the first tick the two touch), half (half the field taken), clinch_a / clinch_b (one side owns over half), last (LAST_LEFT dirt blocks left),
// done + win_a / win_b (no field block left). The edit shows the live score bar (edit.score, scripts/retention.py),
// a card at the meeting and the win, a flash + punch + the advancement sound on the win.
const M = require('./movie')

const SCORE_EVERY = 2
const LAST_LEFT = 12

function makeRace (S) {
  const N = S.size || 64, R = S.seed ?? 5, Y = S.y || 150, H = S.camHeight || 72
  const A = S.a, B = S.b, FIELD = S.field || 'dirt'
  const half = N / 2
  // the camera: straight down from over the field, north of its centre (camZ), so the field (with its rim) fills
  // 21-96 % of the game view's height and the score bar over the top fifth covers the sky, never the race.
  // The hook is a drone drop-in: from DROP blocks higher it falls to H over the first DROP_S seconds of game time
  // (1.5 s on screen at 3x), easing out to a stop, then keeps descending slowly (DESCENT blocks a second), ending at
  // ~99 %. A still top-down opener read as a photo (pace: motion 0.67 over the first 1.5 s; the seeds are small).
  // No handheld drift: a camera looking straight down turned its yaw with every centimetre of drift (the field tilted).
  // (yaw 0 = north up: A's corner top-left, B's bottom-right.) path keys are game seconds from the race start.
  const camZ = S.camZ ?? -6, DROP = S.drop ?? 30, sp = S.speed || 3, DROP_S = 1.4 * sp, DESCENT = S.descent ?? 0.03
  const camY = (t) => t < DROP_S ? H + DROP * (1 - t / DROP_S) ** 3 : H - DESCENT * (t - DROP_S)
  const keys = []
  for (let t = 0; t < DROP_S + 1.5; t += 0.35) keys.push(+t.toFixed(2))
  for (let t = Math.ceil(DROP_S + 1.5); t <= (S.maxSeconds || 420); t += 2) keys.push(t)
  const shots = {
    top: { path: keys.map(t => [t, 0, +camY(t).toFixed(3), camZ]), ease: 'linear', look: [0, 0, camZ - 2], fov: S.fov || 66, drift: 0, eyeTrace: false }
  }
  return {
    name: S.name,
    biome: S.biome || 'minecraft:deep_ocean',
    renderDistance: 8, recordRadius: 96,
    clouds: false,   // the cloud layer (y ~192) lies between the camera (y set + 72..102) and the field (vanilla: Clouds OFF)
    botTimeout: S.botTimeout || 600,
    eyeTrace: false,
    shots,
    caption: S.caption,
    edit: {
      caption: S.caption, red: S.red, colors: S.colors, song: null,
      startAt: 'race_start:0',
      endAfter: 'done:1.6',                         // a text payoff (the WINS card): 1.2-1.8 s to read it
      // the hunt for the last few dirt blocks takes ~8 s of game time with almost nothing changing: it plays twice as fast
      speed: [['race_start', 'last', sp], ['last', 'done', S.tailSpeed || sp * 2]],
      score: { event: 'score', a: [A.label, A.color], b: [B.label, B.color] },
      // the two fronts touch: a card and a held push-in on the line between them (it runs across the field's middle)
      zoom: [['meet', 'meet:3.2', 1.3]],
      cards: [['half', 'HALFWAY', 0.9, 'white'], ['meet', 'THEY MEET', 1.0, 'yellow'], ['last', 'LAST DIRT', 1.0, 'white'],
        ['clinch_a', `${A.label} CAN'T LOSE NOW`, 1.4, A.color], ['clinch_b', `${B.label} CAN'T LOSE NOW`, 1.4, B.color],
        ['win_a', `${A.label} WINS`, 2.5, A.color, 0, 'stamp'], ['win_b', `${B.label} WINS`, 2.5, B.color, 0, 'stamp']],
      flash: [['done', 0, 0.55]],
      sfx: [['air', 'race_start', 'done', { gain: 0.6 }], ['ding', 'race_start'], ['whoosh', 'landed'], ['pop', 'landed'], ['pop', 'half'], ['pop', 'meet'], ['pop', 'lead', { gain: 0.6 }],
        ['pop', 'clinch_a'], ['pop', 'clinch_b'], ['whoosh', 'last'], ['impact', 'done']],
      punch: [['half', 0, 1.05], ['last', 0, 1.06], ['done', 0, 1.08]],
      keySounds: ['done'],
      ...(S.edit || {})
    },

    async setup (ctx) {
      const { bot } = ctx
      const p = bot.entity.position.floored()
      const X = p.x, Z = p.z
      Object.assign(this, { X, Z })
      const x0 = X - half, z0 = Z - half, x1 = X + half - 1, z1 = Z + half - 1
      await ctx.defaultRules()
      await ctx.cmd('/gamerule random_tick_speed 0')
      await ctx.cmd('/gamerule log_admin_commands false')
      await ctx.forceload({ x0: x0 - 8, z0: z0 - 8, x1: x1 + 8, z1: z1 + 8 })
      const rim = S.rim || 'polished_deepslate', RW = S.rimWidth || 2
      const q = async (c) => { bot.chat(c); await bot.waitForTicks(2) }
      // the platform: a slab of stone under the field and the rim, the field one block thick on top
      await q(`/fill ${x0 - RW} ${Y - 2} ${z0 - RW} ${x1 + RW} ${Y - 1} ${z1 + RW} smooth_stone`)
      await q(`/fill ${x0 - RW} ${Y} ${z0 - RW} ${x1 + RW} ${Y} ${z1 + RW} ${rim}`)
      await q(`/fill ${x0} ${Y} ${z0} ${x1} ${Y} ${z1} ${FIELD}`)
      // clear sky over it (a retried attempt leaves nothing behind; the field needs light >= 9 to spread)
      await q(`/fill ${x0 - RW} ${Y + 1} ${z0 - RW} ${x1 + RW} ${Y + 4} ${z1 + RW} air`)
      // one biome over the field (the grass tint): the sea's biome tints it dull
      const g4 = (v) => Math.floor(v / 4) * 4
      // (tiles of 32 x 8 x 32 on the 4-block biome grid: /fillbiome counts whole cells, under its 32768 cap)
      for (let bx = g4(x0 - RW); bx <= x1 + RW; bx += 32) for (let bz = g4(z0 - RW); bz <= z1 + RW; bz += 32) for (const by of [g4(Y - 4), g4(Y - 4) + 8]) {
        await q(`/fillbiome ${bx} ${by} ${bz} ${bx + 31} ${by + 7} ${bz + 31} ${S.fieldBiome || 'minecraft:plains'}`)
      }
      // the seeds: quarter discs in opposite corners (A top-left = north-west, B bottom-right = south-east)
      for (let i = 0; i <= R; i++) for (let j = 0; j <= R; j++) {
        if (i * i + j * j > R * R + R) continue
        await q(`/setblock ${x0 + i} ${Y} ${z0 + j} ${A.block}`)
        await q(`/setblock ${x1 - i} ${Y} ${z1 - j} ${B.block}`)
      }
      // the bot: under the platform's middle, standing on a block, out of the camera's sight
      await q(`/fill ${X - 1} ${Y - 9} ${Z - 1} ${X + 1} ${Y - 9} ${Z + 1} smooth_stone`)
      await ctx.cmd('/kill @e[type=!player]')
      await ctx.tpCheck(X + 0.5, Y - 8, Z + 0.5, 180, 0)
      await bot.waitForTicks(20)
      return { x: X, y: Y, z: Z }
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { X, Z } = this
      const x0 = X - half, z0 = Z - half
      const total = N * N
      const count = () => {
        let a = 0, b = 0, f = 0, touch = false
        const g = new Array(N)
        for (let i = 0; i < N; i++) {
          g[i] = new Array(N)
          for (let j = 0; j < N; j++) {
            const bl = bot.blockAt(new Vec3(x0 + i, Y, z0 + j))
            const n = bl ? bl.name : ''
            const v = n === A.block ? 1 : n === B.block ? 2 : n === FIELD ? 0 : 3
            g[i][j] = v
            if (v === 1) a++; else if (v === 2) b++; else if (v === 0) f++
          }
        }
        for (let i = 0; i < N && !touch; i++) for (let j = 0; j < N; j++) {
          if (g[i][j] !== 1) continue
          if ((i + 1 < N && g[i + 1][j] === 2) || (j + 1 < N && g[i][j + 1] === 2) || (i > 0 && g[i - 1][j] === 2) || (j > 0 && g[i][j - 1] === 2)) { touch = true; break }
        }
        return { a, b, f, touch }
      }
      M.shot(ctx, 'top')
      ctx.mark('race_start')
      // the two seeds "go": their own place sounds, the first sound of the Short
      ctx.sound(A.sound || 'block.grass.place', 1, 1)
      ctx.sound(B.sound || 'block.nylium.place', 1, 0.9)
      await ctx.cmd(`/gamerule random_tick_speed ${S.tickSpeed || 300}`)
      const t0 = ctx.tick
      let lead = null, leadSince = 0, met = false, halfDone = false, last = false, landed = false, clinch = false, c = count()
      ctx.mark('score', { a: +(c.a / total).toFixed(4), b: +(c.b / total).toFixed(4) })
      const maxTicks = (S.maxSeconds || 420) * 20
      while (ctx.tick - t0 < maxTicks) {
        await bot.waitForTicks(SCORE_EVERY)
        c = count()
        ctx.mark('score', { a: +(c.a / total).toFixed(4), b: +(c.b / total).toFixed(4) })
        // a lead change counts once it has held 20 ticks, and only once both have a real share (the first few % flip)
        const who = c.a > c.b ? 'a' : c.b > c.a ? 'b' : lead
        if (who !== lead) {
          if (!leadSince) leadSince = ctx.tick
          if (ctx.tick - leadSince >= 20 || lead === null) {
            if (lead !== null && (c.a + c.b) / total > 0.08) { ctx.mark('lead', { who }); ctx.log(`lead -> ${who} at ${((ctx.tick - t0) / 20).toFixed(1)} s (${c.a} vs ${c.b})`) }
            lead = who; leadSince = 0
          }
        } else leadSince = 0
        if (!landed && ctx.tick - t0 >= DROP_S * 20) { landed = true; ctx.mark('landed') }   // the camera's drop-in lands
        // one side owns more than half the field: it can't lose any more
        if (!clinch && (c.a > total / 2 || c.b > total / 2)) { clinch = true; const w = c.a > c.b ? 'a' : 'b'; ctx.mark(`clinch_${w}`); ctx.log(`clinch ${w} at ${((ctx.tick - t0) / 20).toFixed(1)} s (${c.f} left)`) }
        if (!met && c.touch) { met = true; ctx.mark('meet'); ctx.log(`meet at ${((ctx.tick - t0) / 20).toFixed(1)} s`) }
        if (!halfDone && c.a + c.b >= total / 2) { halfDone = true; ctx.mark('half'); ctx.log(`half at ${((ctx.tick - t0) / 20).toFixed(1)} s`) }
        if (!last && c.f <= LAST_LEFT) { last = true; ctx.mark('last', { left: c.f }); ctx.log(`last ${c.f} at ${((ctx.tick - t0) / 20).toFixed(1)} s`) }
        if (c.f === 0) break
      }
      const win = c.a >= c.b ? 'a' : 'b'
      ctx.log(`race ${c.f === 0 ? 'done' : 'TIMED OUT'} after ${((ctx.tick - t0) / 20).toFixed(1)} s: ${A.label} ${c.a} vs ${B.label} ${c.b} (${c.f} left)`)
      ctx.mark('done', { a: c.a, b: c.b, win })
      ctx.mark(`win_${win}`)
      ctx.sound('ui.toast.challenge_complete', 1, 1)
      await ctx.cmd('/gamerule random_tick_speed 0')
      await bot.waitForTicks(50)
      return c.f === 0
    }
  }
}

module.exports = { makeRace }
