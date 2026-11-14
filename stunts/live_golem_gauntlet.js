// Live format sample 3 (docs/livestream.md): "CAN THE IRON GOLEM BEAT EVERY MOB?", a gauntlet. Owner, 2026-11-14:
// "we dont necessarily need to do TNT it could be like a fake mod like mob fights, or whatever is going viral rihgt
// now". Research (docs/research/livestream.md F): mob battles are hot again; a ladder with green checks and a "next: ?"
// keeps people waiting; a KO every 15-90 s; no multi-hour mob-battle live exists. Vanilla only: an iron golem goes for
// hostile mobs on its own, and they go for it. 56e watches from the arena wall (invisible to the mobs, so they fight
// each other, not the camera). The 1-minute sample:
//   1. live, fight 7 of 40: the golem vs 4 husks (husks don't burn in the sun); HUSKS LEFT counts down; the KO
//   2. "NEXT: ???" ... the reveal ... "skipping to the final boss"
//   3. the final, fight 40 of 40: a ravager; GOLEM HP counts down; whoever drops, the run ends
// (a warden was tried as the final boss on take 1: summoned it never engaged the golem)
const L = require('../lib/live')
const M = require('../lib/movie')
const { plateau } = require('../lib/plateau')

const AR = 10           // the arena floor's radius (the wall stands at 11)
const T0 = 4 * 3600 + 2 * 60 + 15     // the stream clock at the sample's first frame (not shown)

module.exports = {
  name: 'live_golem_gauntlet',
  biome: process.env.BIOME || 'minecraft:plains',
  live: { stream: L.STREAM_S, counter: 'LEFT', icon: 'iron_ingot' },
  time: 6000,
  botTimeout: 900,
  settleWait: 40,
  caption: 'can the iron golem beat EVERY MOB? 💀',
  shots: {
    pov: { pov: true },
    arena: { orbit: [0, 1.5, 0], radius: 15, height: 8, startDeg: 160, degPerSec: 7, fov: 64 },
    final: { orbit: [0, 1.5, 0], radius: 17, height: 9, startDeg: 330, degPerSec: 5, fov: 64 }
  },
  edit: {
    caption: 'can the iron golem beat EVERY MOB? 💀', red: 'EVERY MOB',
    startAt: 'live_on:0', endAfter: 'ko2:0.9',
    speed: [['skip_a', 'skip_b:1.4', 'cut']],   // (past the turn to the boss and its frozen beat: the fight starts as the cut lands)
    cards: [['ko1', 'WIN ✅', 0.9, 'green'], ['next', 'NEXT: ???', 1.0, 'white'], ['reveal', '???', 0.8, 'yellow'],
      ['skip_b', 'FINAL BOSS 💀', 1.3, 'red'], ['ko2', 'K.O. 💀', 1.2, 'red']],
    sfx: [['impact', 'ko1', { gain: 1.1 }], ['whoosh', 'next'], ['pop', 'reveal'], ['whoosh', 'skip_b'], ['riser', 'skip_b:2', 'ko2'], ['impact', 'ko2', { gain: 1.3 }]],
    flash: [['ko2', 0, 0.4]], punch: [['ko1', 0, 1.05], ['ko2', 0, 1.1]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    for (const c of ['/difficulty easy', '/gamerule fall_damage false', '/gamerule keep_inventory true']) await ctx.cmd(c, { mayFail: true })
    await ctx.cmd(`/tp @s ${x + 0.5} ${g.y + 1} ${z + 0.5}`)
    await bot.waitForTicks(40)
    // a levelled field in the real plains (never a superflat to the horizon), trees round its edge
    const floor = await plateau(ctx, { x0: x - 34, x1: x + 34, z0: z - 34, z1: z + 34, above: 24, below: 8, biome: 'minecraft:plains', pct: 0.9, taper: 6, trees: 8 })
    // the arena: a sandstone floor with a ring of polished andesite, a stone-brick wall 4 high (nothing in it can climb
    // out), lanterns on the wall top every few blocks
    const ring = (r0, r1) => { const out = []; for (let dx = -Math.ceil(r1); dx <= Math.ceil(r1); dx++) for (let dz = -Math.ceil(r1); dz <= Math.ceil(r1); dz++) { const d = Math.hypot(dx, dz); if (d >= r0 && d <= r1) out.push([dx, dz]) } return out }
    const cmds = []
    for (const [dx, dz] of ring(0, AR + 0.4)) cmds.push(`/setblock ${x + dx} ${floor} ${z + dz} ${Math.hypot(dx, dz) > AR - 1.2 ? 'polished_andesite' : Math.abs(Math.hypot(dx, dz) - 4.5) < 0.5 ? 'chiseled_sandstone' : 'smooth_sandstone'}`)
    for (const [dx, dz] of ring(AR + 0.5, AR + 1.6)) cmds.push(`/fill ${x + dx} ${floor} ${z + dz} ${x + dx} ${floor + 4} ${z + dz} stone_bricks`)
    for (const [dx, dz] of ring(AR + 0.5, AR + 1.6)) if ((dx * 7 + dz * 13) % 9 === 0) cmds.push(`/setblock ${x + dx} ${floor + 5} ${z + dz} lantern`)
    await L.bulk(ctx, cmds, 6)
    await ctx.cmd(`/fill ${x - AR} ${floor + 1} ${z - AR} ${x + AR} ${floor + 3} ${z + AR} air replace short_grass`, { mayFail: true })
    await ctx.cmd('/kill @e[type=!player]', { mayFail: true })
    // 56e on the wall top (south side), looking in; invisible to the mobs (they fight each other, not the camera)
    for (const e of ['invisibility', 'resistance', 'fire_resistance']) await ctx.cmd(`/effect give @s ${e} infinite 4 true`)
    await ctx.cmd('/attribute @s minecraft:explosion_knockback_resistance base set 1', { mayFail: true })
    await ctx.hotbar(['diamond_sword', ['cooked_beef', 16], ['torch', 32], 'shield'])
    Object.assign(this, { x, z, floor })
    // the champion and fight 7's four husks, squaring up across the floor, held still (NoAI) until the recording runs:
    // on take 1 the golem had beaten all four during the set-up
    await ctx.cmd(`/summon iron_golem ${x + 0.5} ${floor + 1} ${z - 3.5} {PersistenceRequired:1b,NoAI:1b,Rotation:[0f,0f]}`)
    for (const [dx, dz] of [[-3, 6], [-1, 7], [1, 7], [3, 6]]) await ctx.cmd(`/summon husk ${x + dx + 0.5} ${floor + 1} ${z + dz + 0.5} {PersistenceRequired:1b,NoAI:1b,Rotation:[180f,0f]}`)
    await ctx.tpCheck(x + 0.5, floor + 5, z + AR + 1.5, 180, 32)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(10)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, floor } = this
    const A = require('../lib/act')(ctx)
    const ents = (name) => Object.values(bot.entities).filter(e => e.name === name && e.position && Math.hypot(e.position.x - x, e.position.z - z) < AR + 2)
    const hp = (e) => { const m = e && e.metadata; const v = m && (typeof m[9] === 'number' ? m[9] : null); return v }
    const center = new Vec3(x + 0.5, floor + 1.5, z + 0.5)
    // the view follows the fight: between the champion and the nearest opponent, eased (lib/act.js turnTo)
    const follow = async (ticks, foe) => {
      const end = ctx.tick + ticks
      while (ctx.tick < end) {
        const gl = ents('iron_golem')[0], fs = ents(foe)
        let p = center
        if (gl && fs.length) { const f = fs.sort((a, b) => a.position.distanceTo(gl.position) - b.position.distanceTo(gl.position))[0]; p = gl.position.plus(f.position).scaled(0.5).offset(0, 1.3, 0) }
        else if (gl) p = gl.position.offset(0, 1.5, 0)
        await A.turnTo(p, { max: Math.min(8, end - ctx.tick) })
        await bot.waitForTicks(1)
        if (onTick) await onTick()
      }
    }
    let onTick = null

    // 1. fight 7 of 40, live
    M.shot(ctx, 'pov')
    L.clock(ctx, T0, 1)
    L.target(ctx, 'CAN THE IRON GOLEM BEAT EVERY MOB?', null, 'EVERY MOB')
    L.big(ctx, '6 / 40 WINS')
    L.stat(ctx, 'FIGHT 7', 'vs 4 HUSKS')
    let left = ents('husk').length
    L.count(ctx, left, { label: 'HUSKS LEFT' })
    ctx.mark('live_on')
    await ctx.cmd('/execute as @e[type=husk] run data merge entity @s {NoAI:0b}', { mayFail: true })
    await ctx.cmd('/execute as @e[type=iron_golem] run data merge entity @s {NoAI:0b}', { mayFail: true })
    onTick = async () => { const n = ents('husk').length; if (n !== left) { left = n; L.count(ctx, left, { label: 'HUSKS LEFT' }) } }
    const t1 = ctx.tick
    let droned = false
    while (left > 0 && ctx.tick - t1 < 50 * 20) {
      if (!droned && left <= 3 && ctx.tick - t1 > 6 * 20) {   // the drone for a stretch once the first one drops
        droned = true
        M.shot(ctx, 'arena')
        const end = ctx.tick + 6 * 20
        while (ctx.tick < end && left > 0) { await bot.waitForTicks(1); await onTick() }
        M.shot(ctx, 'pov')
        continue
      }
      await follow(10, 'husk')
    }
    ctx.mark('ko1')
    L.big(ctx, '7 / 40 WINS')
    await follow(30, 'husk')
    // 2. next: ? ... the reveal, then skip to the final
    ctx.mark('next')
    L.stat(ctx, 'NEXT', '???')
    L.count(ctx, null)
    await follow(26, 'husk')
    ctx.mark('reveal')
    L.stat(ctx, 'NEXT', 'FIGHT 8: ???')
    await follow(30, 'husk')
    ctx.mark('skip_a')
    // inside the edit's cut (never on screen): the champion healed where it stands, anything left cleared, the final
    // boss summoned across the floor from it, held still
    const gl = ents('iron_golem')[0]
    if (!gl) throw new Error('the golem lost fight 7')
    await ctx.cmd('/data merge entity @e[type=iron_golem,limit=1,sort=nearest] {Health:100f}', { mayFail: true })
    await ctx.cmd('/kill @e[type=husk]', { mayFail: true })
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    const gp = gl.position, bx = x + 0.5 - (gp.x - x - 0.5) * 0.9, bz = z + 0.5 - (gp.z - z - 0.5) * 0.9
    const bossAt = Math.hypot(bx - x - 0.5, bz - z - 0.5) > 3 ? [bx, bz] : [x + 0.5, z + 6.5]
    await ctx.cmd(`/summon ravager ${bossAt[0].toFixed(1)} ${floor + 1} ${bossAt[1].toFixed(1)} {PersistenceRequired:1b,NoAI:1b}`)
    await bot.waitForTicks(20)
    ctx.mark('skip_b')
    // 3. the final, live: fight 40 of 40
    L.big(ctx, '39 / 40 WINS')
    L.stat(ctx, 'FIGHT 40', 'THE RAVAGER')
    const golem = ents('iron_golem')[0]
    let ghp = Math.round(hp(golem) ?? 100)
    L.count(ctx, ghp, { label: 'GOLEM HP' })
    onTick = async () => {
      const g = ents('iron_golem')[0], v = g ? Math.max(0, Math.round(hp(g) ?? ghp)) : 0
      if (v !== ghp) { ghp = v; L.count(ctx, ghp, { label: 'GOLEM HP' }) }
    }
    await follow(30, 'ravager')   // a beat to see what it is
    await ctx.cmd('/execute as @e[type=ravager] run data merge entity @s {NoAI:0b}', { mayFail: true })
    const t2 = ctx.tick
    let droned2 = false
    while (ctx.tick - t2 < 50 * 20) {
      const g = ents('iron_golem')[0], w = ents('ravager')[0]
      if (!g || !w || ghp <= 0) break
      if (!droned2 && ctx.tick - t2 > 3 * 20) {
        droned2 = true
        M.shot(ctx, 'final')
        const end = ctx.tick + 5 * 20
        while (ctx.tick < end && ents('iron_golem')[0] && ents('ravager')[0]) { await bot.waitForTicks(1); await onTick() }
        M.shot(ctx, 'pov')
        continue
      }
      await follow(8, 'ravager')
    }
    const won = !!ents('iron_golem')[0]
    ctx.mark('ko2', { winner: won ? 'golem' : 'ravager' })
    L.big(ctx, won ? '40 / 40 WINS' : '39 / 40 WINS')
    L.stat(ctx, won ? 'IT BEAT' : 'BEATEN BY', 'THE RAVAGER')
    await follow(40, 'ravager')
    ctx.log('final:', won ? 'the golem won' : 'the ravager won', 'golem hp', ghp)
    return true
  }
}
