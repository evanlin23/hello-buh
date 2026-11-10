// The cast's motion, live (docs/STANDARDS.md 3b.2; owner, 2026-11-10: "the villager keeps teleporting ... right at
// the 'i even begged' line"). Not a Short: recorded and measured.
//   ./hb record _cast_test --no-strict && python3 scripts/rec_check.py _cast_test --no-world --no-owner
// Two villagers walk the same swaying, hopping path side by side for 3 s: 'old' moved the old way (a /tp every tick
// only: the server's tracker sends a mob's move every 3rd tick, so the recording has stair steps), 'new' through
// K.actor (the air-supply nudge makes the tracker send every tick). Then the cuts: a plain K.shot right after moving
// both (the old way: they land 1-3 ticks after the shot mark), then K.cutShot for each (the shot mark waits for them).
// Marks: phase_walk, phase_shot, phase_cutshot_new, phase_cutshot_old.
const { storyKit } = require('../lib/story')

const STUB = { gap: 0, ids: [], line () { throw new Error('_cast_test has no lines') } }

module.exports = {
  name: '_cast_test',
  biome: 'minecraft:plains',
  botTimeout: 240,
  renderDistance: 4, recordRadius: 32,
  edit: { caption: 'cast motion test' },
  shots: {
    a: { path: [[0, 0, 3, -6]], look: [0, 1.5, 3], fov: 60 },
    b: { path: [[0, 4, 3, -6]], look: [4, 1.5, 3], fov: 60 }
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    await ctx.defaultRules()
    await ctx.cmd('/gamerule log_admin_commands false')
    await bot.waitForChunksToLoad()
    await ctx.cmd(`/fill ${X - 8} ${F + 1} ${Z - 8} ${X + 8} ${F + 6} ${Z + 12} air`)
    await ctx.cmd(`/fill ${X - 8} ${F - 3} ${Z - 8} ${X + 8} ${F - 1} ${Z + 12} dirt`)
    await ctx.cmd(`/fill ${X - 8} ${F} ${Z - 8} ${X + 8} ${F} ${Z + 12} grass_block`)
    await ctx.cmd(`/kill @e[type=!player,x=${X},y=${F},z=${Z},distance=..40]`)
    for (const [t, dx] of [['old', -1.5], ['new', 1.5]]) {
      await ctx.cmd(`/summon villager ${X + dx} ${F + 1} ${Z + 3} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Tags:["${t}"],VillagerData:{type:"minecraft:plains",profession:"minecraft:farmer",level:1}}`)
    }
    await ctx.tpCheck(X + 0.5, F + 1, Z - 5.5, 0, 10)
    await bot.waitForChunksToLoad()
    await bot.waitForTicks(20)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { X, Z, F } = this
    const { bot } = ctx
    const K = storyKit(ctx, STUB, { X, Z, F }, { warm: null })
    const old = K.actor('old', { x: -1.5, z: 3, yaw: 0 }, { sync: false })
    const neu = K.actor('new', { x: 1.5, z: 3, yaw: 0 })
    const run = async (n, fn) => { for (let k = 0; k < n; k++) { if (fn) fn(k); K.look(k); await bot.waitForTicks(1) } }
    await run(20)
    // 3 s of the beg: side steps, a head shake and small hops (the same path for both)
    ctx.mark('phase_walk')
    await run(60, (k) => {
      for (const [a, x0] of [[old, -1.5], [neu, 1.5]]) {
        a.x = x0 + 0.3 * Math.sin(k / 9)
        a.y = 1 + Math.max(0, Math.sin(k / 2.2)) * 0.3
        a.yaw = 22 * Math.sin(k / 3.5)
      }
    })
    for (const a of [old, neu]) a.y = 1
    await run(20)
    // the old way: move both, then the shot mark at once (they land after it)
    ctx.mark('phase_shot')
    old.x = -3.5; neu.x = 3.5; K.warp('old'); K.warp('new')
    K.shot('b')
    await run(30)
    // the kit's cut: the shot mark waits until the cast is on its marks
    ctx.mark('phase_cutshot_new')
    const w1 = await K.cutShot('a', () => { neu.x = 1.5 })
    ctx.log(`_cast_test: K.cutShot (synced actor) waited ${w1} tick(s)`)
    await run(30)
    ctx.mark('phase_cutshot_old')
    const w2 = await K.cutShot('b', () => { old.x = -1.5 })
    ctx.log(`_cast_test: K.cutShot (unsynced actor) waited ${w2} tick(s)`)
    await run(30)
    ctx.mark('end')
    return true
  }
}
