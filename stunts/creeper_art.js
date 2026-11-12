// "rate my pixel art 1-10 😭" (~10 s): one creeper face, built fast (black features first, then the greens as a x2
// time-lapse), a pull-back on the finished face... then it hisses and blows up: two rows of primed TNT sit in hidden
// cavities in the wall right behind the face (one fuse for all, vanilla TNT's own hiss) and go off together, taking
// the face out. (TNT summoned behind a plain smooth-stone wall only cratered the ground, blast resistance 6; TNT blocks
// set off by one primed TNT chained for 4 s, each lit with its own random fuse.)
// (No-op audit 2026-11-12, owner r:r4607fa: the old 34 s of three faces "placing, no reveal": now under 15 s and the
// art "comes alive".)
const pixelArt = require('../lib/pixel_art')
const { plateau } = require('../lib/plateau')
const MID = ['GLGGLGGL', 'LGLGGLLG', 'GKKLLKKG', 'LKKGGKKL', 'GLGKKGLG', 'GGKKKKLG', 'LGKKKKGL', 'GLKLLKGG']
const base = pixelArt({
  name: 'creeper_art',
  stages: [{ art: MID, first: 'K', lapse: 2 }],
  palette: { G: 'green_concrete', L: 'lime_concrete', K: 'black_concrete' },
  wall: 'smooth_stone',
  // a small levelled patch in real terrain, trees and relief round it (review: the 224-block flat clearing read as
  // superflat, owner r:r489883); the wall stands 12 west, the walk back goes east
  site: async (ctx, x, z) => {
    const floor = await plateau(ctx, { x0: x - 18, x1: x + 22, z0: z - 14, z1: z + 14, biome: null, pct: 0.9, taper: 14, trees: 18 })
    await ctx.cmd(`/kill @e[type=!player,x=${x},y=${floor},z=${z},distance=..60]`)
    // dressed like a real field (a levelled patch still read as flat to the horizon: the land round it sits lower):
    // trees behind and beside the wall (west) and along the sides, grass and flower patches; none on the build line
    const trees = [['oak', -24, -6], ['fancy_oak', -27, 5], ['birch', -21, 11], ['oak', -30, -12], ['birch', -18, -13], ['fancy_oak', -33, 1],
      ['oak', -6, -15], ['birch', 4, 15], ['oak', 12, -14], ['fancy_oak', 16, 13], ['birch', -10, 16]]
    for (const [f, dx, dz] of trees) await ctx.cmd(`/place feature minecraft:${f} ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
    for (let dx = -32; dx <= 20; dx += 7) for (let dz = -14; dz <= 14; dz += 7) {
      if (dz > -7 && dz < 7) continue   // the build line (the wall 12 west, the walk back east) stays clear
      await ctx.cmd(`/place feature minecraft:patch_grass ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
      if ((dx + dz) % 14 === 0) await ctx.cmd(`/place feature minecraft:flower_plain ${x + dx + 2} ${floor + 1} ${z + dz + 2}`, { mayFail: true })
    }
    // solid dirt under the wall: the blast's crater broke into a water pocket under the levelled patch
    await ctx.cmd(`/fill ${x - 17} ${floor - 7} ${z - 7} ${x - 8} ${floor - 1} ${z + 7} dirt`)
    return floor
  },
  caption: 'rate my pixel art 1-10 😭',
  edit: {
    caption: 'rate my pixel art 1-10 😭', dropAt: 'boom',
    startAt: 'build0:0.9',          // r:r0f3da0: frame 0 on the black eyes and mouth already up (tuned on the take)
    speed: [['build0:0.1', 'built0:-0.4', 2], ['complete:0.4', 'hiss', 2]],   // the build's lapse (pixel_art's own), and the pull-back after the reveal x2 (r:r188b46)
    endAfter: 'clear:0.8',          // r:r188b46: 0.8 s after the chain's last blast (a blast holds only its first 0.3 s)
    subs: [['hiss', 'wait...', 1.3]], subsY: 0.12,   // the sub up in the sky, off the face (review nitpick: it sat on the mouth)
    punch: [['complete', 0, 1.08], ['boom', 0, 1.14]],
    flash: [['boom', 0, 0.5]],
    sfx: [['air', 'start', 'boom', { gain: 0.35 }], ['impact', 'complete', { gain: 0.6 }], ['dip', 'boom', 0.4], ['impact', 'boom', { gain: 1.4 }]]
  }
})

module.exports = {
  ...base,
  async setup (ctx) {
    const r = await base.setup.call(this, ctx)
    await ctx.cmd('/gamerule block_drops false')   // no concrete drops spraying out of the blast (settle)
    await ctx.cmd('/gamerule tnt_explosion_drop_decay true', { mayFail: true })
    await ctx.cmd('/effect give @s resistance 30 4 true')   // the blast doesn't touch my hearts (hidden effect)
    return r
  },
  async perform (ctx) {
    const ok = await base.perform.call(this, ctx)
    if (!ok) return false
    const { bot } = ctx
    const w = this.walls[0]
    // primed TNT in every cavity cell, all sent at once (one fuse, one blast): the fuse is the art's hiss
    const wx = w.cx + w.fx, wz = w.cz + w.fz, a = -(w.W >> 1), b = w.W - (w.W >> 1) - 1
    // the cavities are cut only now, behind the finished art (cut at setup, the sky showed through the half-built face)
    const ROWS = [1, 4, 7]   // (rows 2 and 5 left a wall block floating at the top)
    for (const dy of ROWS) {
      const y = w.ybase + dy
      await ctx.cmd(`/fill ${Math.min(wx + w.rx * a, wx + w.rx * b)} ${y} ${Math.min(wz + w.rz * a, wz + w.rz * b)} ${Math.max(wx + w.rx * a, wx + w.rx * b)} ${y} ${Math.max(wz + w.rz * a, wz + w.rz * b)} air`)
    }
    ctx.mark('hiss')
    for (const dy of ROWS) for (let o = a; o <= b; o++) bot.chat(`/summon tnt ${wx + w.rx * o + 0.5} ${w.ybase + dy} ${wz + w.rz * o + 0.5} {fuse:30}`)
    ctx.sound('entity.tnt.primed', 1.6, 1)   // (review: the hiss sat at the placing sounds' level)
    // 'boom' the tick the fuse TNT goes off (the first real blast), 'clear' once no primed TNT is left (the chain is over)
    let fuse = null
    for (let i = 0; i < 5 && !fuse; i++) { await bot.waitForTicks(1); fuse = Object.values(bot.entities).find(e => e.name === 'tnt') }
    if (!fuse) { ctx.log('no primed TNT'); return false }
    const fid = fuse.id
    let boomed = false
    for (let i = 0; i < 160; i++) {
      await bot.waitForTicks(1)
      const tnts = Object.values(bot.entities).filter(e => e.name === 'tnt')
      if (!boomed && !tnts.some(e => e.id === fid)) { boomed = true; ctx.mark('boom') }
      if (boomed && !tnts.length) { ctx.mark('clear'); break }
    }
    const art = bot.blockAt(new ctx.Vec3(w.cx, w.ybase + (w.H >> 1), w.cz))
    if (!boomed || (art && !/air/.test(art.name))) { ctx.log('the face never blew'); return false }
    await bot.waitForTicks(30)
    return true
  }
}
