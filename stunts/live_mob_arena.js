// Live format, the owner's pick (r:r73847d, "Can we jsut do the mob fight thing?"), v2 after: "We should make it much
// fancier (arena, music, sound design), and have fake mobs too, maybe a mod?" (owner 2026-11-14). THE MOB ARENA: a
// colosseum (a patterned floor, a wall with two barred gates, four tiers of stands full of villagers, banners, lanterns,
// campfires) where the iron golem fights whatever the arena's "mod" rolls for it. The mod is ours and lives on screen
// only (the roulette in the top band, the health bars, the summons): the server stays vanilla, and the "modded" mobs are
// vanilla mobs grown with the 1.20.5+ minecraft:scale attribute (a GIANT HUSK, a TITAN RAVAGER), which the renderer
// draws at their size. Sound: the game's own (the raid horn on the bell for a fight, summon spells, the crowd's
// villagers cheering on a KO, fireworks); the music (NCS, credited) goes under it at the end.
// The 1-minute sample:
//   1. live, fight 960 of 1000 (owner: "make it feel like they're lamost ot the end like 960/1000"; the count is the
//      series' real running total across streams): the roll lands on a HUSK ARMY + a GIANT HUSK (3x), summoned in puffs,
//      the horn; 2 golems vs 9, a team bar each side (owner: "the fights should be interesting and close too"); the KO
//   2. the roll for fight 961 ... "skipping to the final boss"
//   3. fight 1000: 3 golems vs a TITAN RAVAGER (2x) and 4 axe vindicators; whoever drops, the run ends
const L = require('../lib/live')
const M = require('../lib/movie')
const { plateau } = require('../lib/plateau')

const AR = 10            // the floor's radius; the wall stands at 10.5-11.5, the stands 12-16
const T0 = 5 * 3600 + 11 * 60 + 40   // the stream clock (not shown)
// what the roulette shows spinning (names on screen, the spawn egg beside each): vanilla mobs that fight golems on their
// own (owner 2026-11-14: "we can have other intersting mobs")
const POOL = [
  { name: 'ZOGLIN PACK', icon: 'zoglin_spawn_egg' }, { name: 'EVOKER + VEXES', icon: 'evoker_spawn_egg' }, { name: 'PIGLIN BRUTES', icon: 'piglin_brute_spawn_egg' },
  { name: 'WITCH COVEN', icon: 'witch_spawn_egg' }, { name: 'HOGLIN HERD', icon: 'hoglin_spawn_egg' }, { name: 'MAGMA CUBES', icon: 'magma_cube_spawn_egg' },
  { name: 'SPIDER SWARM', icon: 'spider_spawn_egg' }, { name: 'VINDICATORS', icon: 'vindicator_spawn_egg' }, { name: 'WITHER SKELETONS', icon: 'wither_skeleton_spawn_egg' },
  { name: 'GIANT SLIME', icon: 'slime_spawn_egg' }, { name: 'PILLAGER RAID', icon: 'pillager_spawn_egg' }, { name: 'HUSK ARMY + GIANT', icon: 'husk_spawn_egg' }
]
const PROFS = ['farmer', 'librarian', 'cleric', 'armorer', 'butcher', 'cartographer', 'fisherman', 'fletcher', 'leatherworker', 'mason', 'shepherd', 'toolsmith', 'weaponsmith']

module.exports = {
  name: 'live_mob_arena',
  biome: process.env.BIOME || 'minecraft:plains',
  live: { stream: L.STREAM_S, counter: 'WINS', icon: 'iron_ingot' },
  time: 6000,
  botTimeout: 900,
  settleWait: 40,
  entityRadius: 96,
  lerpMobs: true,   // mobs as the vanilla client draws them (20 Hz, not the tracker's 6.7 Hz stair steps)
  caption: 'the MOB ARENA picks the next fighter 💀',
  shots: {
    pov: { pov: true },
    ring: { orbit: [0, 1.2, 0], radius: 7.5, height: 2.6, startDeg: 200, degPerSec: 12, fov: 66 },
    boss: { orbit: [0, 2.5, 0], radius: 11, height: 4.5, startDeg: 320, degPerSec: 8, fov: 66 },
    crowd: { orbit: [0, 3, 0], radius: 19, height: 11, startDeg: 40, degPerSec: 6, fov: 62 }
  },
  edit: {
    caption: 'the MOB ARENA picks the next fighter 💀', red: 'MOB ARENA',
    startAt: 'live_on:0', endAfter: 'ko2:1.0',
    speed: [['skip_a', 'skip_b', 'cut'], ['ko2:-21.5', 'ko2:-3', 3]],   // (take 3: the ravager alone held out 22 s after its guard fell: that stretch x3 in the sample)
    cards: [['fight1', 'FIGHT!', 0.8, 'yellow'], ['ko1', 'K.O. 💀', 1.0, 'red'], ['skip_a', 'SKIPPING TO THE FINAL BOSS...', 1.4, 'yellow'],
      ['fight2', 'FIGHT 1000 💀', 1.0, 'red'], ['ko2', 'K.O. 💀', 1.2, 'red']],
    sfx: [['riser', 'live_on', 'fight1'], ['impact', 'fight1', { gain: 1.1 }], ['impact', 'ko1', { gain: 1.3 }], ['whoosh', 'skip_a'], ['whoosh', 'skip_b'],
      ['riser', 'skip_b', 'fight2'], ['impact', 'fight2', { gain: 1.2 }], ['impact', 'ko2', { gain: 1.4 }]],
    flash: [['ko1', 0, 0.3], ['ko2', 0, 0.4]], punch: [['fight1', 0, 1.05], ['ko1', 0, 1.08], ['fight2', 0, 1.05], ['ko2', 0, 1.1]], shake: [['ko2', 0, 6]]
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
    const floor = await plateau(ctx, { x0: x - 36, x1: x + 36, z0: z - 36, z1: z + 36, above: 24, below: 8, biome: 'minecraft:plains', pct: 0.9, taper: 6, trees: 8 })
    Object.assign(this, { x, z, floor })
    const at = (dx, dz) => [x + dx, z + dz]
    const ring = (r0, r1) => { const out = []; for (let dx = -Math.ceil(r1); dx <= Math.ceil(r1); dx++) for (let dz = -Math.ceil(r1); dz <= Math.ceil(r1); dz++) { const d = Math.hypot(dx, dz); if (d >= r0 && d < r1) out.push([dx, dz, d, Math.atan2(dz, dx)]) } return out }
    const cmds = []
    // the floor: sandstone, a red ring, a chiseled heart, two coloured arcs before the gates (blue north, red south)
    for (const [dx, dz, d] of ring(0, AR + 0.5)) {
      const b = d < 1.6 ? 'chiseled_red_sandstone' : d < 2.6 ? 'cut_red_sandstone' : Math.abs(d - 6.5) < 0.55 ? 'red_sandstone' : d > AR - 0.9 ? 'smooth_red_sandstone'
        : (dz < -6 && Math.abs(dx) < 3) ? 'blue_terracotta' : (dz > 6 && Math.abs(dx) < 3) ? 'red_terracotta' : 'smooth_sandstone'
      cmds.push(`/setblock ${x + dx} ${floor} ${z + dz} ${b}`)
    }
    // the wall (3 high, polished andesite, a stone-brick cap), with a barred gate at north and south
    for (const [dx, dz] of ring(AR + 0.5, AR + 1.5)) {
      const gate = Math.abs(dx) <= 1
      cmds.push(`/fill ${x + dx} ${floor} ${z + dz} ${x + dx} ${floor + 3} ${z + dz} ${gate ? 'iron_bars' : 'polished_andesite'}`)
      if (gate) cmds.push(`/setblock ${x + dx} ${floor} ${z + dz} polished_andesite`, `/setblock ${x + dx} ${floor + 4} ${z + dz} chiseled_stone_bricks`)
      else cmds.push(`/setblock ${x + dx} ${floor + 4} ${z + dz} stone_brick_slab`)
    }
    // the stands: four tiers stepping up and out, stone bricks with a deepslate front edge
    for (const [dx, dz, d] of ring(AR + 1.5, AR + 5.5)) {
      const t = Math.min(3, Math.floor(d - AR - 1.5))
      cmds.push(`/fill ${x + dx} ${floor} ${z + dz} ${x + dx} ${floor + 3 + t} ${z + dz} stone_bricks`)
      if (d - AR - 1.5 - t < 0.6) cmds.push(`/setblock ${x + dx} ${floor + 3 + t} ${z + dz} polished_deepslate`)
    }
    // the top: lanterns on posts all round, campfires at the four corners, banners over the gates
    for (const [dx, dz, d, a] of ring(AR + 5, AR + 5.5)) {
      const k = Math.round((a + Math.PI) / (Math.PI * 2) * 24)
      if (k % 2 === 0) cmds.push(`/setblock ${x + dx} ${floor + 7} ${z + dz} spruce_fence`, `/setblock ${x + dx} ${floor + 8} ${z + dz} lantern`)
      if (k % 6 === 3) cmds.push(`/setblock ${x + dx} ${floor + 7} ${z + dz} campfire[lit=true]`)
    }
    for (const [dx, col] of [[-2, 'blue'], [2, 'blue']]) cmds.push(`/setblock ${x + dx} ${floor + 5} ${z - AR - 1} ${col}_banner[rotation=0]`)
    for (const [dx, col] of [[-2, 'red'], [2, 'red']]) cmds.push(`/setblock ${x + dx} ${floor + 5} ${z + AR + 1} ${col}_banner[rotation=8]`)
    await L.bulk(ctx, cmds, 6)
    await ctx.cmd(`/fill ${x - AR} ${floor + 1} ${z - AR} ${x + AR} ${floor + 3} ${z + AR} air replace short_grass`, { mayFail: true })
    await ctx.cmd('/kill @e[type=!player]', { mayFail: true })
    // the crowd: villagers on the tiers looking in (NoAI: they stay in their seats), every trade
    let k = 0
    for (const [dx, dz, d, a] of ring(AR + 1.6, AR + 5.4)) {
      const t = Math.floor(d - AR - 1.5)
      if (t < 1 || Math.abs(Math.cos(a)) > 0.93 && dx > 0) continue          // not in 56e's seat (east)
      if (((dx * 31 + dz * 17) % 7 + 7) % 7 !== 0) continue                 // spread out
      const yaw = Math.atan2(-dx, dz) * 180 / Math.PI + 180                  // facing the middle (Minecraft yaw)
      await ctx.cmd(`/summon villager ${x + dx + 0.5} ${floor + 4 + t} ${z + dz + 0.5} {NoAI:1b,PersistenceRequired:1b,Rotation:[${yaw.toFixed(0)}f,10f],VillagerData:{profession:"minecraft:${PROFS[k++ % PROFS.length]}",level:2,type:"minecraft:plains"}}`, { mayFail: true })
    }
    this.crowd = k
    // 56e in the front row, east, invisible to the mobs; the champion on the floor, held still
    for (const e of ['invisibility', 'resistance', 'fire_resistance']) await ctx.cmd(`/effect give @s ${e} infinite 4 true`)
    await ctx.hotbar(['diamond_sword', ['cooked_beef', 16], ['firework_rocket', 16], 'shield'])
    await ctx.tpCheck(x + AR + 2.5, floor + 4, z + 0.5, 90, 20)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(10)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, floor } = this
    const A = require('../lib/act')(ctx)
    const inArena = (e) => e.position && Math.hypot(e.position.x - x - 0.5, e.position.z - z - 0.5) < AR + 1
    const of = (types) => Object.values(bot.entities).filter(e => types.includes(e.name) && inArena(e))
    const health = (e) => { const m = e && e.metadata; return m && typeof m[9] === 'number' ? Math.max(0, m[9]) : 0 }
    const center = new Vec3(x + 0.5, floor + 1.5, z + 0.5)
    const golems = () => of(['iron_golem'])
    // the two teams' bars (owner 2026-11-14: "the fights should be interesting and close too, we cna engineer that with
    // more enemies or more iron golems"): each side's total health of its full health
    let foes = [], foeName = '', foeMax = 0, gMax = 0, gName = ''
    const bars = { left: null, right: null }
    const updateBars = () => {
      const gl = golems().reduce((s, e) => s + health(e), 0), fr = of(foes).reduce((s, e) => s + health(e), 0)
      if (bars.left !== Math.round(gl)) { bars.left = Math.round(gl); L.hp(ctx, 'left', gName, gl, gMax) }
      if (foes.length && bars.right !== Math.round(fr)) { bars.right = Math.round(fr); L.hp(ctx, 'right', foeName, fr, foeMax) }
    }
    const mid = (es) => es.length ? es.reduce((p, e) => p.plus(e.position), new Vec3(0, 0, 0)).scaled(1 / es.length) : null
    // the crowd's murmur and the view: between the two sides, eased (lib/act.js)
    let murmur = 0
    const follow = async (ticks, view = true) => {
      const end = ctx.tick + ticks
      while (ctx.tick < end) {
        if (view) {
          const g = mid(golems()), f = mid(of(foes))
          const p = g && f ? g.plus(f).scaled(0.5).offset(0, 1.6, 0) : g ? g.offset(0, 1.6, 0) : center
          await A.turnTo(p, { max: Math.min(8, end - ctx.tick) })
        }
        await bot.waitForTicks(1)
        updateBars()
        if (++murmur % 31 === 0) ctx.sound('entity.villager.ambient', 0.25, 0.8 + (murmur % 5) * 0.1)
      }
    }
    const cheer = async () => {   // the crowd on a KO: cheers, happy villagers, fireworks over the stands; the view goes up to them
      const look = A.turnTo(center.offset(-10, 6, -4), { max: 30 })
      for (let i = 0; i < 6; i++) ctx.sound('entity.villager.celebrate', 0.7, 0.85 + i * 0.07)
      ctx.sound('entity.firework_rocket.launch', 1, 1); ctx.sound('entity.villager.yes', 0.8, 1)
      for (const e of Object.values(bot.entities).filter(e => e.name === 'villager').slice(0, 24)) ctx.particles('happy', e.position.offset(0, 2.2, 0), { count: 6 })
      await bot.waitForTicks(14)
      ctx.sound('entity.firework_rocket.large_blast', 1, 1); ctx.sound('entity.firework_rocket.twinkle', 0.8, 1)
      await look
      await A.turnTo(center.offset(-11, 6, 6), { max: 40 })
    }
    // a summon by the arena's mod: a puff and a spell where each appears (vanilla mobs, grown by the scale attribute)
    const summon = async (groups, name) => {
      foes = []; foeMax = 0; foeName = name; bars.right = null
      ctx.sound('entity.evoker.prepare_summon', 1, 0.9); ctx.sound('entity.illusioner.mirror_move', 1, 0.8)
      for (const gr of groups) {
        for (let i = 0; i < gr.n; i++) {
          const a = (i / gr.n - 0.5) * (gr.spread || 1.6), r = gr.r || 5
          const px = x + 0.5 - Math.cos(a) * r, pz = z + 0.5 + Math.sin(a) * r
          ctx.particles('poof', new Vec3(px, floor + 1.5, pz), { count: 12 })
          const attrs = [`{id:"minecraft:scale",base:${gr.scale || 1}}`, `{id:"minecraft:max_health",base:${gr.hp}}`].concat(gr.dmg ? [`{id:"minecraft:attack_damage",base:${gr.dmg}}`] : [])
          bot.chat(`/summon ${gr.type} ${px.toFixed(2)} ${floor + 1} ${pz.toFixed(2)} {PersistenceRequired:1b,Rotation:[270f,0f],Health:${gr.hp}f,attributes:[${attrs.join(',')}]${gr.extra || ''}}`)   // loose at once (take 1 held them with NoAI: the release read as a jump)
          foeMax += gr.hp
        }
        if (!foes.includes(gr.type)) foes.push(gr.type)
      }
      ctx.particles('portal', center.offset(-4, 0.5, 0), { count: 50 })
      await bot.waitForTicks(4)
      updateBars()
    }
    // the camera while the arena rolls: a slow pan along the packed stands and back to where the fight will be
    const pan = async (rolling, still = 0) => {
      await bot.waitForTicks(still)
      const spots = [center.offset(-9, 5, -9), center.offset(-12, 6, 0), center.offset(-9, 5, 9), center.offset(-4, 1, 0)]
      let k = 0, done = false
      rolling.then(() => { done = true })
      while (!done) { await A.turnTo(spots[k % spots.length], { max: 16 }); await bot.waitForTicks(1); k++ }
      await A.turnTo(spots[3], { max: 20 })
    }
    const team = async (n) => {   // the champions: n golems on the east half, full health
      const have = golems().length
      for (let i = have; i < n; i++) await ctx.cmd(`/summon iron_golem ${x + 3.5} ${floor + 1} ${z + 0.5 + (i - (n - 1) / 2) * 2.5} {PersistenceRequired:1b,NoAI:1b,Rotation:[90f,0f]}`)
      await ctx.cmd('/execute as @e[type=iron_golem] run data merge entity @s {Health:100f}', { mayFail: true })
      gMax = 100 * n; gName = n === 1 ? 'IRON GOLEM' : `${n} IRON GOLEMS`; bars.left = null
      await bot.waitForTicks(4)
      updateBars()
    }
    const fight = async (label, limit) => {   // the challengers are already loose (summon); the golems too now, until a side is down
      await ctx.cmd('/execute as @e[type=iron_golem] run data merge entity @s {NoAI:0b}', { mayFail: true })
      const t0 = ctx.tick
      let droned = false
      const on = () => golems().length && of(foes).length
      while (ctx.tick - t0 < limit * 20 && on()) {
        if (!droned && ctx.tick - t0 > 4 * 20) {
          droned = true
          M.shot(ctx, label === 'fight2' ? 'boss' : 'ring')
          const end = ctx.tick + 5 * 20
          while (ctx.tick < end && on()) await follow(1, false)
          M.shot(ctx, 'pov')
          continue
        }
        await follow(6)
      }
      updateBars()
      return golems().length > 0 && !of(foes).length
    }

    // 1. fight 960 of 1000 (the series' running total), live
    M.shot(ctx, 'pov')
    L.clock(ctx, T0, 1)
    L.target(ctx, 'THE MOB ARENA PICKS THE NEXT FIGHT...', null, 'MOB ARENA')
    L.big(ctx, '959 / 1000 WINS')
    L.stat(ctx, 'FIGHT 960', '?')
    ctx.mark('live_on')
    await team(2)
    const roll1 = L.roll(ctx, POOL, { name: 'HUSK ARMY + GIANT', icon: 'husk_spawn_egg' })
    await pan(roll1)
    ctx.vanillaSound('event.raid.horn'); ctx.sound('block.bell.use', 1, 1)
    ctx.mark('fight1')
    await summon([{ type: 'husk', n: 8, hp: 20, r: 5.5, spread: 2.2 }, { type: 'husk', n: 1, scale: 3, hp: 60, dmg: 5, r: 7, spread: 0 }], 'HUSK ARMY')
    L.rollEnd(ctx)
    L.target(ctx, 'CAN THE IRON GOLEMS BEAT 1000 FIGHTS?', null, '1000')
    L.stat(ctx, 'FIGHT 960', '8 HUSKS + A GIANT HUSK (3x)')
    const won1 = await fight('fight1', 45)
    ctx.mark('ko1', { winner: won1 ? 'golems' : 'husks' })
    L.big(ctx, won1 ? '960 / 1000 WINS' : '959 / 1000 WINS')
    await cheer()
    // 2. the roll for fight 961 ... skip
    L.target(ctx, 'THE MOB ARENA PICKS THE NEXT FIGHT...', null, 'MOB ARENA')
    L.stat(ctx, 'FIGHT 961', '?')
    await pan(L.roll(ctx, POOL, { name: 'ZOGLIN PACK', icon: 'zoglin_spawn_egg' }))
    ctx.mark('skip_a')
    // inside the edit's cut (never on screen): the floor cleared, a third golem for the last fight
    for (const t of foes) await ctx.cmd(`/kill @e[type=${t}]`, { mayFail: true })
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    foes = []; L.rollEnd(ctx)
    await team(3)
    await A.turnTo(center.offset(-4, 1, 0), { max: 40, hold: 10 })   // already on the floor when the cut lands (take 2: a whip after it)
    ctx.mark('skip_b')
    // 3. fight 1000: the final boss and its guard
    L.big(ctx, '999 / 1000 WINS')
    L.target(ctx, 'THE MOB ARENA PICKS THE LAST FIGHT...', null, 'LAST FIGHT')
    L.stat(ctx, 'FIGHT 1000', 'THE FINAL BOSS')
    await pan(L.roll(ctx, POOL.concat([{ name: 'WARDEN', icon: 'warden_spawn_egg' }]), { name: 'TITAN RAVAGER', icon: 'ravager_spawn_egg' }), 8)
    ctx.vanillaSound('event.raid.horn'); ctx.sound('block.bell.use', 1, 1)
    ctx.mark('fight2')
    await summon([{ type: 'ravager', n: 1, scale: 2, hp: 160, dmg: 12, r: 6, spread: 0 },
      { type: 'vindicator', n: 4, hp: 24, r: 4.5, spread: 2.0, extra: ',HandItems:[{id:"minecraft:iron_axe",count:1},{}]' }], 'TITAN RAVAGER + 4')
    L.rollEnd(ctx)
    L.target(ctx, 'CAN THE IRON GOLEMS BEAT 1000 FIGHTS?', null, '1000')
    L.stat(ctx, 'FIGHT 1000', 'TITAN RAVAGER (2x) + 4 VINDICATORS')
    const won2 = await fight('fight2', 60)
    ctx.mark('ko2', { winner: won2 ? 'golems' : 'ravager' })
    L.big(ctx, won2 ? '1000 / 1000 CHAMPIONS' : 'BEATEN AT 999 / 1000')
    await cheer()
    await follow(40)
    const left = golems().length
    ctx.log('fight 960:', won1 ? 'golems' : 'husks', '| fight 1000:', won2 ? 'golems' : 'ravager side', '| golems left', left, '| crowd', this.crowd)
    return true
  }
}
