// Channel art (avatar + banner), rendered with the movie engine (docs/movie_engine.md). Not a Short: the
// recording is a few seconds of a set, and scripts/still.py renders single frames of it with any camera, look
// and time of day (DAY_TIME), at any size.
//
// The set (origin O = X, 150, Z over deep ocean): a floating grass island (48 x 32, cliffs tapering down into
// the fog sea at y 60-146) with a small village (three houses, lantern posts, a campfire, oaks and birches) and,
// on its west cliff edge facing the sunset, the two faces of the channel: Steve (the recording bot) and a creeper
// beside him. The sun sets in the west (-x), so a camera east of them looking west is backlit (rim light, rays)
// and one west of them looking east lights their faces gold.
const { house } = require('../lib/story')

const Y = 150

module.exports = {
  name: 'brand_art',
  biome: 'minecraft:deep_ocean',
  time: 12300,                  // golden hour (DAY_TIME re-lights a still)
  renderDistance: 12, recordRadius: 160,
  botTimeout: 400,
  fogSea: { y0: 60, y1: 146, layers: 16, density: 0.985, fade: 5, night: 0.55 },
  look: { grade: 'dawn', bloom: 0.55, bloomThreshold: 0.7, vignette: 0.35, grain: 0.02, dof: { aperture: 0.9 }, shadows: true, rays: 0.7 },
  cast: { self: 'steve', Buh: 'steve' },
  idleLife: true,
  shots: {},
  edit: {},

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const p = bot.entity.position.floored()
    const X = p.x, Z = p.z
    Object.assign(this, { X, Z })
    const A = (dx, dy, dz) => `${X + dx} ${Y + dy} ${Z + dz}`
    const c = (s) => ctx.cmd(s)
    // the island is ~3000 commands: sent in bursts (ops aren't chat-limited), a tick every 25
    let n = 0
    const q = async (s) => { bot.chat(s); if (++n % 25 === 0) await bot.waitForTicks(1) }
    await c('/gamerule log_admin_commands false')
    await c('/difficulty normal')   // (a creeper summon is refused on peaceful)
    // the island: an ellipse of columns, deeper in the middle (cliffs that taper into the fog)
    const RX = 24, RZ = 16
    for (let dx = -RX; dx <= RX; dx++) {
      const wob = 1 + 0.12 * Math.sin(dx * 0.7) + 0.08 * Math.sin(dx * 1.9 + 1)
      const hz = Math.floor(RZ * Math.sqrt(Math.max(0, 1 - (dx / RX) ** 2)) * wob)
      if (hz < 1) continue
      for (let dz = -hz; dz <= hz; dz += 1) {
        const r = Math.hypot(dx / RX, dz / RZ)
        const depth = Math.max(3, Math.round(4 + 22 * (1 - r) + 3 * Math.sin(dx * 0.9 + dz * 0.6)))
        await q(`/fill ${A(dx, -depth, dz)} ${A(dx, -4, dz)} stone`)
        await q(`/fill ${A(dx, -3, dz)} ${A(dx, -1, dz)} dirt`)
        await q(`/setblock ${A(dx, 0, dz)} grass_block`)
      }
    }
    await bot.waitForTicks(20)
    // a few stone outcrops on the cliff edges
    for (const [dx, dz] of [[-23, 3], [-22, -4], [20, 8], [-12, 15], [8, -15]]) await c(`/fill ${A(dx, -6, dz)} ${A(dx, 0, dz)} stone`)
    // the village: three houses, a path, lanterns, a campfire
    await house(ctx, A, 2, -12, 4, -7, 'south', false)
    await house(ctx, A, 11, -6, 11, -3, 'west', false)
    await house(ctx, A, 4, 5, 6, 5, 'north', false)
    await c(`/fill ${A(-18, 0, 0)} ${A(14, 0, 0)} dirt_path`)
    await c(`/fill ${A(6, 0, -6)} ${A(6, 0, 4)} dirt_path`)
    await c(`/setblock ${A(7, 1, -1)} campfire[lit=true]`)
    for (const [dx, dz] of [[-10, -2], [0, 2], [9, 2], [-16, 2]]) { await c(`/fill ${A(dx, 1, dz)} ${A(dx, 2, dz)} oak_fence`); await c(`/setblock ${A(dx, 3, dz)} lantern`) }
    // trees and flowers
    for (const [f, dx, dz] of [['fancy_oak', -8, -9], ['oak', -14, 8], ['birch', 16, -9], ['fancy_oak', 17, 7], ['oak', -3, 11], ['birch', -17, -7]]) await c(`/place feature minecraft:${f} ${A(dx, 1, dz)}`)
    for (const [dx, dz, fl] of [[-12, 3, 'poppy'], [-11, 4, 'dandelion'], [-6, -3, 'cornflower'], [-4, 4, 'oxeye_daisy'], [-20, -2, 'poppy'], [-19, 5, 'dandelion'], [1, -3, 'allium'], [12, 4, 'poppy']]) await c(`/setblock ${A(dx, 1, dz)} ${fl}`)
    for (let k = 0; k < 40; k++) { const dx = Math.round(-20 + 38 * ((k * 0.618) % 1)), dz = Math.round(-12 + 24 * ((k * 0.381) % 1)); await c(`/setblock ${A(dx, 1, dz)} short_grass keep`) }
    // small floating rocks around it (depth for the wide shots), and a waterfall off the south-east edge
    const rock = async (cx, cy, cz, r, top = 'grass_block') => {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        const d = Math.hypot(dx, dz) / (r + 0.5); if (d > 1) continue
        const depth = Math.max(1, Math.round((1 - d) * r * 1.6 + 1))
        await q(`/fill ${A(cx + dx, cy - depth, cz + dz)} ${A(cx + dx, cy - 1, cz + dz)} stone`)
        await q(`/setblock ${A(cx + dx, cy, cz + dz)} ${top}`)
      }
    }
    await rock(-10, 3, -34, 5)            // the pair's rock, north-west (Steve and a creeper, backlit)
    await rock(30, 8, 22, 3); await rock(-36, -6, 20, 4); await rock(38, -10, -18, 2); await rock(-30, 14, -12, 2); await rock(14, 18, 34, 2)
    await bot.waitForTicks(20)
    await c('/tick freeze')               // the waterfall stays a column
    await c(`/fill ${A(21, -30, 9)} ${A(21, 0, 9)} water`)
    await c(`/setblock ${A(20, 0, 9)} water`)
    await c(`/place feature minecraft:birch ${A(-13, 4, -37)}`)   // (behind them, clear of their heads)
    // pair A, lit: a Mannequin Steve ("Buh", stunt.cast) and a creeper side by side on the main island's west edge,
    // facing west into the low sun (a camera west of them looking back east sees their faces gold)
    await c(`/summon minecraft:mannequin ${X - 19.5} ${Y + 1} ${Z - 0.1} {CustomName:"Buh",Rotation:[90f,0f],immovable:1b}`)
    await c(`/summon creeper ${X - 19.5} ${Y + 1} ${Z + 0.95} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Rotation:[90f,0f]}`)
    // pair B, backlit: Steve (the recording bot) and a creeper on the north-west rock, facing east (toward the
    // village and a camera east of them; the sunset behind them)
    await c(`/summon creeper ${X - 10.5} ${Y + 4} ${Z - 33.05} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Rotation:[-90f,0f]}`)
    await c(`/tp @s ${X - 10.5} ${Y + 4} ${Z - 34.1} -90 0`)
    await bot.waitForTicks(40)
    return { x: X, y: Y, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    ctx.mark('f1_on')
    // a few seconds of the set: a small head drift so stills can pick a moment
    for (let k = 0; k < 120; k++) {
      await bot.look(-Math.PI / 2 + Math.sin(k / 30) * 0.1, Math.sin(k / 40) * 0.05, true)   // east
      if (k === 60) ctx.mark('still')
      await bot.waitForTicks(1)
    }
    return true
  }
}
