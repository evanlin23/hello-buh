// "POV: the floor is TNT 💀" (~28 s, four waves): a wave of TNT going off across a field comes
// straight at the bot, which backs away watching it (moving follows the view, so it can't sprint and
// look back). Wave 1 is slow and it gets away; wave 2 is faster; wave 3 is wide and it barely makes
// it; wave 4 is fast enough to catch it (death screen). Each wave in its own lane of the field (a
// hard cut between them). mineflayer yaw 0 = north: the bot faces north (the wave) and backs south.
const LANES = [-64, -32, 0, 32, 64]   // 32 apart: blasts and flung TNT don't wreck the next lane
// every: ticks per block the front advances; gap: blocks between bot and front at the start;
// stop: the front stops this far from the bot (a real near miss, outside TNT's ~8-block damage range,
// and its smoke stays off the camera); waves 1-3 stop, wave 4 doesn't
const WAVES = [
  { every: 4, dxs: [-2, 0, 2], gap: 14, stop: 9, sub: 'wave 1: easy' },
  { every: 3, dxs: [-4, -2, 0, 2, 4], gap: 25, stop: 9, sub: 'wave 2: faster' },
  { every: 3, dxs: [-7, -5, -3, -1, 1, 3, 5, 7], gap: 24, stop: 9, sub: 'wave 3: wider' },
  { every: 2, dxs: [-7, -5, -3, -1, 1, 3, 5, 7], gap: 38, stop: 9, sub: 'wave 4: faster AND wider' },   // stop 7 + the blasts' knockback held the gap inside the damage range: dead in wave 3
  { every: 2, dxs: [-6, -3, 0, 3, 6], gap: 32, stop: 0, sub: 'wave 5...' }      // a real chase that catches you
]
// (waves 3-5 start further back: with 18/30/26 the Short ran 25.95 s, waves 3-4 ~3 s each)
module.exports = {
  name: 'tnt_run',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: the floor is TNT 💀',
  edit: {
    caption: 'POV: the floor is TNT 💀', red: 'TNT', song: 'songs/funk_abnormal.mp3', dropAt: 'death', startAt: 'wave:0.0', deathScreen: true, endAfter: 'death:0.8',
    subs: [...WAVES.map((w, i) => ['wave', w.sub, 1.6, i]), ...WAVES.slice(0, -1).map((w, i) => ['escaped', i === WAVES.length - 2 ? 'BARELY' : 'made it', 1.0, i])]
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    // TNT's explosion damage scales with difficulty ("scaling": "always"): peaceful zeroes it, and point-blank
    // blasts with no damage read as fake. Normal throughout; waves 1-3 stop outside the damage range.
    await ctx.cmd('/difficulty normal')
    for (let z0 = z - 40; z0 <= z + 40; z0 += 4) {   // four lanes side by side (slabs under the /fill cap)
      const z1 = Math.min(z0 + 3, z + 40)
      for (let y0 = floor + 1; y0 <= floor + 12; y0 += 6) await ctx.cmd(`/fill ${x - 78} ${y0} ${z0} ${x + 78} ${y0 + 5} ${z1} air`)
      await ctx.cmd(`/fill ${x - 78} ${floor} ${z0} ${x + 78} ${floor} ${z1} grass_block`)
      await ctx.cmd(`/fill ${x - 78} ${floor - 4} ${z0} ${x + 78} ${floor - 1} ${z1} dirt`)
    }
    await ctx.hotbar(['diamond_sword', ['cobblestone', 64], ['bread', 16]])
    await ctx.tpCheck(x + LANES[0] + 0.5, floor + 1, z - 10 + 0.5, 180, 8)   // facing north (MC yaw 180): the wave comes from there
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor } = this
    for (let r = 0; r < WAVES.length && !ctx.died; r++) {
      const W = WAVES[r], lx = x + LANES[r], last = r === WAVES.length - 1
      // a fast cut to this lane's start (tpCheck's 1 s settle would be dead air)
      const tx = lx + 0.5, tz = z - 10 + 0.5
      for (let a = 0; ; a++) {
        bot.chat(`/tp @s ${tx} ${floor + 1} ${tz} 180 8`)
        let ok = false
        for (let t = 0; t < 10 && !ok; t++) { await bot.waitForTicks(1); ok = Math.abs(bot.entity.position.x - tx) < 0.1 && Math.abs(bot.entity.position.z - tz) < 0.1 }
        if (ok) break
        if (a === 4) throw new Error('teleport did not stick')
      }
      bot.chat('/effect give @s instant_health 1 5 true')
      let front = tz - W.gap, n = 0, on = true, stopped = false
      const wave = () => {
        if (!on || n++ % W.every) return
        const pz = bot.entity.position.z
        if (last && pz - front < 4) {   // caught up (the blasts knock the bot back, so it'd escape otherwise)
          const px = bot.entity.position.x
          for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1]]) bot.chat(`/summon tnt ${(px + dx).toFixed(1)} ${floor + 1} ${(pz + dz).toFixed(1)} {fuse:6}`)
          front = pz - 1
          return
        }
        if (!last && (pz - front <= W.stop || bot.health < 19.5)) { on = false; stopped = true; return }   // the near miss: it stops short (and at once if a blast got through)
        // fuse 2: each row blows before the next spawns. (fuse 10 left rows primed behind the front: the blasts flung
        // them at the bot and wave 1 killed it at 4 s)
        for (const dx of W.dxs) bot.chat(`/summon tnt ${lx + dx + 0.5} ${floor + 1} ${front + 0.5} {fuse:2}`)
        front += 1
      }
      ctx.mark('wave', { n: r + 1 })
      bot.on('physicsTick', wave)
      await bot.waitForTicks(8)
      bot.setControlState('back', true)
      for (let i = 0; i < 260 && !ctx.died && !stopped; i++) {
        await bot.waitForTicks(1)
        if (i % 30 === 0) ctx.easeLook((i % 60 ? 0.15 : -0.15), -0.05, 600)   // yaw ~0: facing the wave (north)
      }
      on = false
      bot.setControlState('back', false)
      bot.removeListener('physicsTick', wave)
      if (!last && !ctx.died) {
        ctx.mark('escaped', { n: r + 1, gap: +(bot.entity.position.z - front).toFixed(1) })
        // the last blasts go off in front: watch them, still backing a little
        bot.setControlState('back', true); await bot.waitForTicks(10); bot.setControlState('back', false)
        await bot.waitForTicks(6)
      }
    }
    await bot.waitForTicks(30)                                   // the death screen
    return ctx.died
  }
}
