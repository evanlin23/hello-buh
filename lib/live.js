// Vertical long form / live (owner 2026-11-14, r:r584b30; docs/livestream.md): the shared pieces of the 8-12 h
// formats. Nothing here is used by a Short: only stunts named live_* require it.
//
// The stream clock. A live sample (or one chunk of the real stream) is an ordinary recording plus marks that say what
// the stream's clock reads; scripts/live_overlay.py draws the countdown and the counters from them in the bottom band:
//   L.clock(ctx, secondsIntoStream, rate)   from this tick the clock reads S and runs `rate` stream seconds per
//                                           recorded second (1 = live; a time-lapse runs faster)
//   L.count(ctx, n)                         the counter reads n from this tick (TNT placed, blocks built...)
//   L.event(ctx, text)                      a one-line event in the band ("+500 TNT", "HOUR 4")
// Every chunk of a long stream starts from the world state the plan says it has at its start time (setup fills the
// cells placed before), so chunks are independent and render in parallel (docs/livestream.md "Pipeline").
const STREAM_S = 8 * 3600

const clock = (ctx, s, rate = 1, extra = {}) => ctx.mark('live', { clock: +s.toFixed(2), rate, ...extra })
const count = (ctx, n, extra = {}) => ctx.mark('live_count', { n, ...extra })
const event = (ctx, text, extra = {}) => ctx.mark('live_event', { text, ...extra })

// many commands without the 4-tick wait of ctx.cmd (set-up fills, time-lapse bursts): `perTick` a tick
async function bulk (ctx, cmds, perTick = 8) {
  for (let i = 0; i < cmds.length; i++) {
    ctx.bot.chat(cmds[i])
    if (i % perTick === perTick - 1) await ctx.bot.waitForTicks(1)
  }
  await ctx.bot.waitForTicks(4)
}

// cells [{x, y, z}] -> the fewest /fill rows along x (same y and z, consecutive x)
function fills (cells, block) {
  const rows = new Map()
  for (const c of cells) { const k = `${c.y},${c.z}`; if (!rows.has(k)) rows.set(k, []); rows.get(k).push(c.x) }
  const out = []
  for (const [k, xs] of rows) {
    const [y, z] = k.split(',').map(Number)
    xs.sort((a, b) => a - b)
    let a = xs[0], b = xs[0]
    for (let i = 1; i <= xs.length; i++) {
      if (i < xs.length && xs[i] === b + 1) { b = xs[i]; continue }
      out.push(a === b ? `/setblock ${a} ${y} ${z} ${block}` : `/fill ${a} ${y} ${z} ${b} ${y} ${z} ${block}`)
      if (i < xs.length) { a = b = xs[i] }
    }
  }
  return out
}

// The nearest plains village: /locate, go there, keep its chunks loaded. -> { x, y, z } at the locate point's surface
async function findVillage (ctx, { type = 'village_plains', R = 72 } = {}) {
  const { bot } = ctx
  await ctx.cmd('/gamerule send_command_feedback true')
  const loc = await new Promise((resolve) => {
    const on = (m) => { const r = /nearest .* is at \[(-?\d+), [^,]+, (-?\d+)\]/.exec(m); if (r) { bot.removeListener('messagestr', on); resolve([+r[1], +r[2]]) } }
    bot.on('messagestr', on); setTimeout(() => resolve(null), 30000)
    bot.chat(`/locate structure minecraft:${type}`)
  })
  if (!loc) throw new Error(`no ${type} found`)
  await ctx.cmd('/gamerule send_command_feedback false')
  ctx.log('village at', loc)
  await ctx.cmd(`/tp @s ${loc[0]} 200 ${loc[1]}`)
  await bot.waitForTicks(40)
  await ctx.forceload({ x0: loc[0] - R, z0: loc[1] - R, x1: loc[0] + R, z1: loc[1] + R })
  const g = ctx.surface(loc[0], loc[1])
  if (!g) throw new Error('village: no surface at the locate point')
  return { x: loc[0], y: g.position.y, z: loc[1] }
}

// What a TNT carpet can cover: open ground (grass, dirt, paths, sand), not under a roof, with `layers` + 1 blocks of
// air (or plants) above. Houses, fields, water, wells and bells are left as they are.
const GROUND = /^(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|dirt_path|gravel|sand|mud|moss_block)$/
const CLEAR = /^(air|cave_air|short_grass|tall_grass|fern|large_fern|dandelion|poppy|blue_orchid|allium|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|red_tulip|orange_tulip|white_tulip|pink_tulip|bush|sunflower|lilac|rose_bush|peony|pink_petals|wildflowers|leaf_litter|firefly_bush|short_dry_grass|tall_dry_grass)$/
function carpetColumns (ctx, c, R, layers) {
  const { bot, Vec3 } = ctx
  const cols = []
  for (let x = c.x - R; x <= c.x + R; x++) {
    for (let z = c.z - R; z <= c.z + R; z++) {
      const d = Math.hypot(x - c.x, z - c.z)
      if (d > R) continue
      const g = ctx.surface(x, z)
      if (!g || !GROUND.test(g.name)) continue
      const y = g.position.y + 1
      let ok = true
      for (let k = 0; k <= layers + 1 && ok; k++) { const b = bot.blockAt(new Vec3(x, y + k, z)); ok = !!b && CLEAR.test(b.name) }
      if (ok) cols.push({ x, z, y, d, a: Math.atan2(z - c.z, x - c.x) })
    }
  }
  return cols
}

// The fill order of a carpet `layers` deep: layer by layer; in a layer, rings `band` blocks wide from the middle out,
// each ring swept round by angle (the frontier moves round the village like a person laying it would).
function carpetPlan (cols, layers, band = 3) {
  const cells = []
  for (let k = 0; k < layers; k++) {
    const ring = cols.map(c => ({ x: c.x, y: c.y + k, z: c.z, d: c.d, a: c.a, k, band: Math.floor(c.d / band) }))
    ring.sort((p, q) => p.band - q.band || (p.band % 2 ? q.a - p.a : p.a - q.a) || p.d - q.d)
    cells.push(...ring)
  }
  return cells
}

const hms = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

module.exports = { STREAM_S, clock, count, event, bulk, fills, findVillage, carpetColumns, carpetPlan, hms, GROUND, CLEAR }
