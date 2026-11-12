// "rate my pixel art 1-10 😭" (~10 s): one creeper face, built fast (black features first, then the greens as a x2
// time-lapse), a pull-back on the finished face... then it hisses and blows up: two rows of primed TNT sit in hidden
// cavities in the wall right behind the face (one fuse for all, vanilla TNT's own hiss) and go off together, taking
// the face out. (TNT summoned behind a plain smooth-stone wall only cratered the ground, blast resistance 6; TNT blocks
// set off by one primed TNT chained for 4 s, each lit with its own random fuse.)
// (No-op audit 2026-11-12, owner r:r4607fa: the old 34 s of three faces "placing, no reveal": now under 15 s and the
// art "comes alive".)
const pixelArt = require('../lib/pixel_art')
const MID = ['GLGGLGGL', 'LGLGGLLG', 'GKKLLKKG', 'LKKGGKKL', 'GLGKKGLG', 'GGKKKKLG', 'LGKKKKGL', 'GLKLLKGG']
const base = pixelArt({
  name: 'creeper_art',
  stages: [{ art: MID, first: 'K', lapse: 2 }],
  palette: { G: 'green_concrete', L: 'lime_concrete', K: 'black_concrete' },
  wall: 'smooth_stone',
  caption: 'rate my pixel art 1-10 😭',
  edit: {
    caption: 'rate my pixel art 1-10 😭', dropAt: 'boom',
    startAt: 'build0:0.9',          // r:r0f3da0: frame 0 on the black eyes and mouth already up (tuned on the take)
    speed: [['build0:0.1', 'built0:-0.4', 2], ['complete:0.4', 'hiss', 2]],   // the build's lapse (pixel_art's own), and the pull-back after the reveal x2 (r:r188b46)
    endAfter: 'clear:0.8',          // r:r188b46: 0.8 s after the chain's last blast (a blast holds only its first 0.3 s)
    subs: [['hiss', 'wait...', 1.3]],
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
    ctx.sound('entity.tnt.primed', 1, 1)
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
