// "every block I mine deletes the world 💀" (docs/ideas.md #1, ~20 s): the bot mines one grass
// block at a time with a shovel, and each block it breaks deletes more of the world, down to the
// void: 1 chunk, 10 chunks, the whole south, everything but its own chunk, its own chunk down to
// 3x3, and finally the 8 blocks around it (mined by hand) until it stands on 1 block: skyblock.
// The mining is real survival digging; the deletions are commands (the scale nobody can do by hand).
//
// Set: the underground below the top 8 blocks is hollowed out before recording (so a deleted
// chunk opens onto the void and only ~8 layers change per chunk, not 130). The recording radius
// matches the deleted area, so nothing is left at the horizon.
process.env.RECORD_RADIUS = process.env.RECORD_RADIUS || '132'   // with the set centred on the bot's chunk: exactly the 17x17 chunks rebuilt below
const R = 8          // chunks deleted around the bot's chunk: cx-R..cx+R
const CRUST = 5      // layers kept under the surface (floor-4..floor): thinner, so the fills land sooner
const TOP = 14       // and this much above (trees)

const SUBS = [
  ['gone', '1 block = 1 chunk', 1.9, 0],
  ['gone', '4 chunks', 1.9, 1],
  ['gone', '10 chunks', 1.9, 2],
  ['gone', '24 chunks', 1.9, 3],
  ['gone', '50 chunks', 2.2, 4],
  ['gone', '100 chunks', 2.2, 5],
  ['gone', 'the whole world', 3.2, 6],
  ['gone', 'half my chunk', 1.9, 7],
  ['gone', '5x5', 1.9, 8],
  ['gone', '3x3', 1.9, 9],
  ['last', 'skyblock', 1.6, 0],
  ['final', 'the last block', 9, 0]
]

module.exports = {
  name: 'world_delete',
  expectDeath: true,
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'every block I mine deletes the world 💀',
  edit: {
    caption: 'every block I mine deletes the world 💀', red: 'world', song: 'songs/funk_abnormal.mp3', dropAt: 'gone',
    startAt: 'beat:-0.05', endAfter: 'death:1.0', subs: SUBS, deathScreen: true,
    punch: [['death', 0, 1.15]],              // the death screen lands with a kick (it holds still otherwise)
    speed: [['cut_a', 'death', 'cut']]     // the empty fall through the void, cut to the death (the void kills slowly)
  },

  async setup (ctx) {
    const { bot, Vec3 } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const floor = g.y
    const cx = Math.floor(g.x / 16), cz = Math.floor(g.z / 16)
    // the bot stands one block in from the north-west corner of its chunk, so the chunks to the
    // north and west are both within reach
    const X0 = cx * 16 + 1, Z0 = cz * 16 + 1
    Object.assign(this, { cx, cz, X0, Z0, floor })
    await ctx.defaultRules()
    await ctx.cmd('/gamerule block_drops false')    // no dirt items (they hovered while the server lagged)
    // the ground under the bot is about to go: hover (mineflayer simulates gravity in every game
    // mode, and the void kills even in creative)
    await ctx.cmd(`/tp @s ${X0 + 0.5} ${floor + 20} ${Z0 + 0.5}`)
    bot.physicsEnabled = false
    const clock = setInterval(() => bot.emit('physicsTick'), 50)     // waitForTicks counts physicsTick, which stops with physics
    // The land is rebuilt flat inside the area (the real terrain here had mountains and a frozen
    // ocean: peaks stuck out of the deleted area and the ocean poured into the void). Each chunk:
    // everything from the bottom of the world to its highest block becomes air (one /fill is
    // capped at 32768 blocks), then a 5-deep crust of stone, dirt and grass goes back, so a
    // deleted chunk opens onto the void and only ~10 layers change per chunk.
    const top = (x1, z1) => {
      let m = floor + 4
      for (let dx = 0; dx < 16; dx += 2) for (let dz = 0; dz < 16; dz += 2) {
        for (let y = 250; y > m; y--) {
          const b = bot.blockAt(new Vec3(x1 + dx, y, z1 + dz))
          if (!b) return 310                  // not loaded here yet: clear the lot (a village was left floating)
          if (b.name !== 'air') { m = y; break }
        }
      }
      return Math.min(m + 24, 310)          // margin: a steep peak can fall between the samples
    }
    await bot.waitForTicks(40)
    await bot.waitForChunksToLoad()
    const tops = {}
    for (let i = -R; i <= R; i++) for (let k = -R; k <= R; k++) tops[`${i},${k}`] = top((cx + i) * 16, (cz + k) * 16)
    const yMax = Math.max(...Object.values(tops))
    // a barrier wall just outside the area, so oceans and aquifers outside can't pour in under
    // the crust (outside the recording, so it's never drawn)
    const lo = (cx - R) * 16 - 1, hi = (cx + R + 1) * 16, loz = (cz - R) * 16 - 1, hiz = (cz + R + 1) * 16
    for (let y0 = -64; y0 <= yMax; y0 += 100) {
      const y1 = Math.min(y0 + 99, yMax)
      for (let a = lo; a <= hi; a += 300) {
        const b = Math.min(a + 299, hi)
        bot.chat(`/fill ${lo} ${y0} ${a} ${lo} ${y1} ${b} barrier`); bot.chat(`/fill ${hi} ${y0} ${a} ${hi} ${y1} ${b} barrier`)
        bot.chat(`/fill ${a} ${y0} ${loz} ${b} ${y1} ${loz} barrier`); bot.chat(`/fill ${a} ${y0} ${hiz} ${b} ${y1} ${hiz} barrier`)
        await bot.waitForTicks(1)
      }
    }
    await bot.waitForTicks(10)
    for (let pass = 0; pass < 2; pass++) {    // twice: water still flowing during the first pass gets cleared by the second
      for (let i = -R; i <= R; i++) {
        for (let k = -R; k <= R; k++) {
          const x1 = (cx + i) * 16, z1 = (cz + k) * 16, yTop = pass ? floor : tops[`${i},${k}`]
          for (let y0 = -64; y0 <= yTop; y0 += 120) bot.chat(`/fill ${x1} ${y0} ${z1} ${x1 + 15} ${Math.min(y0 + 119, yTop)} ${z1 + 15} air`)
          await bot.waitForTicks(pass ? 1 : 2)
        }
      }
      await bot.waitForTicks(60)
    }
    // check every chunk really is empty (a clearing /fill was silently lost once: a snowy hillside
    // was left standing at the edge) and clear again any that isn't
    for (let round = 0; round < 3; round++) {
      const bad = []
      for (let i = -R; i <= R; i++) {
        for (let k = -R; k <= R; k++) {
          const x1 = (cx + i) * 16, z1 = (cz + k) * 16
          let full = false
          for (let dx = 1; dx < 16 && !full; dx += 3) for (let dz = 1; dz < 16 && !full; dz += 3) {
            for (const y of [floor - 20, floor - 6, floor + 1, floor + 3, floor + 6, floor + 10, floor + 16, floor + 24, floor + 34]) {
              const b = bot.blockAt(new Vec3(x1 + dx, y, z1 + dz))
              if (b && b.name !== 'air') { full = true; break }
            }
          }
          if (full) bad.push([x1, z1])
        }
      }
      ctx.log('chunks still holding terrain:', bad.length)
      if (!bad.length) break
      for (const [x1, z1] of bad) {
        for (let y0 = -64; y0 <= 310; y0 += 120) bot.chat(`/fill ${x1} ${y0} ${z1} ${x1 + 15} ${Math.min(y0 + 119, 310)} ${z1 + 15} air`)
        await bot.waitForTicks(3)
      }
      await bot.waitForTicks(60)
    }
    await bot.waitForTicks(40)
    for (let i = -R; i <= R; i += 4) {
      for (let k = -R; k <= R; k += 4) {
        const x1 = (cx + i) * 16, z1 = (cz + k) * 16
        const x2 = Math.min(x1 + 63, (cx + R) * 16 + 15), z2 = Math.min(z1 + 63, (cz + R) * 16 + 15)
        await ctx.cmd(`/fill ${x1} ${floor - CRUST + 1} ${z1} ${x2} ${floor - 4} ${z2} stone`)
        await ctx.cmd(`/fill ${x1} ${floor - 3} ${z1} ${x2} ${floor - 1} ${z2} dirt`)
        await ctx.cmd(`/fill ${x1} ${floor} ${z1} ${x2} ${floor} ${z2} grass_block`)
      }
    }
    // trees and flowers, kept out of the bot's own chunk and the two it mines first
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const span = (2 * R + 1) * 16, x0 = (cx - R) * 16, z0 = (cz - R) * 16
    for (let n = 0; n < 90; n++) {
      const tx = x0 + Math.floor(rnd() * span), tz = z0 + Math.floor(rnd() * span)
      if (Math.abs(tx - X0) < 22 && Math.abs(tz - Z0) < 22) continue
      bot.chat(`/place feature minecraft:${rnd() < 0.8 ? 'oak' : 'birch'} ${tx} ${floor + 1} ${tz}`)
      await bot.waitForTicks(1)
    }
    for (let n = 0; n < 60; n++) {
      const tx = x0 + Math.floor(rnd() * span), tz = z0 + Math.floor(rnd() * span)
      if (Math.abs(tx - X0) < 6 && Math.abs(tz - Z0) < 6) continue
      bot.chat(`/place feature minecraft:${n % 2 ? 'flower_plain' : 'patch_grass'} ${tx} ${floor + 1} ${tz}`)
      await bot.waitForTicks(1)
    }
    await bot.waitForTicks(200)                     // let the server finish lighting before the stunt
    clearInterval(clock); bot.physicsEnabled = true
    // reach 6 (invisible on screen): the far blocks keep the horizon in frame as the world goes
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 6')
    await ctx.hotbar(['stone_shovel'])
    await ctx.tpCheck(X0 + 0.5, floor + 1, Z0 + 0.5, 180, 30)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(30)
    return { x: cx * 16 + 8, y: floor, z: cz * 16 + 8 }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { cx, cz, X0, Z0, floor } = this
    const yLo = floor - CRUST + 1, yHi = floor + TOP
    const gone = new Set()
    const key = (i, k) => `${i},${k}`
    const own = key(cx, cz)
    const range = (a, b) => { const o = []; for (let v = a; v <= b; v++) o.push(v); return o }
    const chunksIn = (i0, i1, k0, k1) => { const o = []; for (const i of range(i0, i1)) for (const k of range(k0, k1)) o.push([i, k]); return o }
    const fresh = (list) => list.filter(([i, k]) => key(i, k) !== own && !gone.has(key(i, k)))

    // The camera is driven from a physicsTick handler, one step per game tick. When the client
    // falls behind (thousands of block updates arriving) mineflayer runs several ticks back to
    // back; an awaited look per tick then froze for those ticks and jumped (a stutter). Here each
    // tick gets its own pose. A segment eases from where the camera is to (yaw, pitch).
    let seg = null
    const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
    bot.on('physicsTick', () => {
      if (!seg) return
      const k = Math.min(1, (ctx.tick - seg.t0) / seg.n), e = seg.linear ? k : (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
      bot.look(seg.y0 + seg.dy * e, seg.p0 + (seg.p1 - seg.p0) * e, true)
      if (k >= 1 && !seg.hold) seg = null
    })
    const glide = async (yaw, pitch, ms, opts = {}) => {
      const n = Math.max(1, Math.round(ms / 50))
      seg = { y0: bot.entity.yaw, p0: bot.entity.pitch, dy: opts.abs ? yaw - bot.entity.yaw : wrap(yaw - bot.entity.yaw), p1: pitch, t0: ctx.tick, n, linear: opts.linear, hold: false }
      if (opts.noWait) return
      const t0 = ctx.tick
      while (ctx.tick - t0 < n) await bot.waitForTicks(1)
    }
    const aimAt = (p) => { const eye = bot.entity.position.offset(0, 1.62, 0), d = p.minus(eye); return [Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))] }
    const drift = (dyaw, dpitch, ms) => glide(bot.entity.yaw + dyaw, bot.entity.pitch + dpitch, ms, { linear: true, noWait: true })

    // One beat: start aiming at the block, send the deletion right then (the server applies big
    // fills 1-2 s late), dig the block for real, and keep at it until the deletion arrives, then
    // break: the block and the chunks go together. The dug block goes with the deletion's
    // commands (it's in the same order on the server).
    const isGone = ([i, k]) => { const b = bot.blockAt(new Vec3(i * 16 + 8, floor, k * 16 + 8)); return !b || b.name === 'air' }
    const beat = async (n, bx, bz, chunks, extra = [], lookMs = 400) => {
      ctx.mark('beat', { n })
      const p = new Vec3(bx, floor, bz)
      const [ya, pa] = aimAt(p.offset(0.5, 0.9, 0.5))
      const aim = glide(ya, pa, lookMs)
      const list = fresh(chunks)
      const d = ([i, k]) => Math.hypot(i * 16 + 8 - X0, k * 16 + 8 - Z0)
      list.sort((a, b) => d(b) - d(a))
      // big waves go out while aiming (they land 1-2 s later); small ones at the end of the dig
      // (they land at once: sent early, the block vanished before the crack finished)
      const send = () => {
        for (const [i, k] of list) { gone.add(key(i, k)); bot.chat(`/fill ${i * 16} ${yLo} ${k * 16} ${i * 16 + 15} ${yHi} ${k * 16 + 15} air`) }
        for (const c of extra) bot.chat(c)
        bot.chat(`/setblock ${bx} ${floor} ${bz} air`)
      }
      const early = list.length > 0
      if (early) send()
      await aim
      const b = bot.blockAt(p)
      const need = b ? Math.max(1, Math.ceil(bot.digTime(b) / 50)) : 4
      bot._client.write('block_dig', { status: 0, location: p, face: 1, sequence: 0 })
      const watch = list.length ? list : null
      for (let t = 0; t < 70; t++) {
        if (t % 4 === 0) { bot.swingArm(); ctx.sound('block.grass.hit', 0.25, 0.5) }
        if (t % 8 === 0) drift((t % 16 ? -1 : 1) * 0.03, 0, 400)       // the small fidget of someone holding the button
        if (!early && t === need - 1) send()
        await bot.waitForTicks(1)
        const nb = bot.blockAt(p)
        const arrived = (!nb || nb.name === 'air') && (!watch || watch.some(isGone))
        if (t >= need && arrived) break
      }
      bot._client.write('block_dig', { status: 2, location: p, face: 1, sequence: 0 })
      bot.swingArm()
      ctx.sound('block.grass.break', 1, 0.8); ctx.particles('block', p, { block: 'grass_block' })
      ctx.mark('gone', { n, chunks: list.length })
      return list
    }
    // wait (moving) until every chunk in the list has arrived
    const settle = async (list, max = 40) => { for (let t = 0; t < max && !list.every(isGone); t++) await bot.waitForTicks(1) }
    const N = 0, W = Math.PI / 2, S = Math.PI, E = -Math.PI / 2

    // 1. north: one chunk
    let list = await beat(0, X0, Z0 - 2, [[cx, cz - 1]], [], 250)
    await glide(N + 0.15, -1.0, 600)            // down into the hole: the void
    await glide(N - 0.2, -0.6, 500)
    // 2. west: the 4 chunks beside it
    list = await beat(1, X0 - 2, Z0, chunksIn(cx - 1, cx - 1, cz - 2, cz + 1), [], 450)
    await glide(W + 0.35, -0.45, 600)
    // 3. further west: 10 chunks (an edge block of my own chunk, facing west)
    list = await beat(2, X0 - 1, Z0 + 3, chunksIn(cx - 3, cx - 2, cz - 2, cz + 2), [], 450)
    await glide(W + 0.4, -0.25, 600)            // sweep along the cut edge
    await glide(W - 0.3, -0.2, 600)
    // 4. north: 24 chunks out to the horizon
    list = await beat(3, X0 + 2, Z0 - 1, chunksIn(cx - 3, cx, cz - R, cz - 3), [], 500)
    await glide(N + 0.2, -0.12, 550)
    await settle(list)
    // 5. east: a 3-chunk band, north to south (51)
    list = await beat(4, X0 + 4, Z0, chunksIn(cx + 1, cx + 3, cz - R, cz + R), [], 550)
    await glide(E + 0.4, -0.12, 600)
    await settle(list)
    await glide(E - 0.4, -0.15, 700)
    // 6. south: everything south of my chunk row (~100), then up to the empty horizon
    list = await beat(5, X0, Z0 + 4, chunksIn(cx - R, cx + R, cz + 1, cz + R), [], 600)
    await glide(S - 0.3, -0.12, 550)
    await settle(list)
    await glide(S + 0.35, -0.2, 700)
    // 7. the whole world but my chunk (watching the far east go); then all the way round
    list = await beat(6, X0 + 4, Z0 + 3, chunksIn(cx - R, cx + R, cz - R, cz + R), [], 550)
    await glide(E + 0.5, -0.1, 500)
    await settle(list)
    await glide(bot.entity.yaw + 2 * Math.PI, -0.35, 2800, { abs: true })
    // 8-10. my own chunk, in three cuts: half (8x8), 5x5, 3x3 (I stand one block in from its corner)
    const x1 = cx * 16, z1 = cz * 16, f = (xa, za, xb, zb) => `/fill ${xa} ${yLo} ${za} ${xb} ${yHi} ${zb} air`
    const cuts = [
      { n: 7, b: [X0 + 5, Z0 + 2], fills: [f(X0 + 7, z1, x1 + 15, z1 + 15), f(x1, Z0 + 7, X0 + 6, z1 + 15)], probe: [X0 + 10, Z0 + 10] },
      { n: 8, b: [X0 + 3, Z0 + 4], fills: [f(X0 + 4, z1, X0 + 6, Z0 + 6), f(x1, Z0 + 4, X0 + 3, Z0 + 6)], probe: [X0 + 5, Z0 + 5] },
      { n: 9, b: [X0 + 2, Z0 + 2], fills: [f(X0 + 2, z1, X0 + 3, Z0 + 3), f(x1, Z0 + 2, X0 + 1, Z0 + 3)], probe: [X0 + 3, Z0 + 3] }
    ]
    for (const c of cuts) {
      await beat(c.n, c.b[0], c.b[1], [], c.fills, 450)
      for (let t = 0; t < 40; t++) { const bb = bot.blockAt(new Vec3(c.probe[0], floor, c.probe[1])); if (!bb || bb.name === 'air') break; await bot.waitForTicks(1) }
      await glide(bot.entity.yaw + 0.9, -0.65, 650)     // the new edge, the void past it
    }
    await glide(bot.entity.yaw + 1.0, -0.75, 500)
    // 6. the 8 blocks around me, each taking its column with it; the last takes mine
    const ring = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]
    for (let j = 0; j < ring.length; j++) {
      const [dx, dz] = ring[j]
      const extra = [`/fill ${X0 + dx} ${yLo} ${Z0 + dz} ${X0 + dx} ${floor - 1} ${Z0 + dz} air`]
      if (j === ring.length - 1) extra.push(`/fill ${X0} ${yLo} ${Z0} ${X0} ${floor - 1} ${Z0} air`)
      await beat(10 + j, X0 + dx, Z0 + dz, [], extra, j === 0 ? 400 : 420)
      if (j === ring.length - 1) ctx.mark('last')
    }
    // skyblock: look down at the one block left, then out over the void
    await glide(bot.entity.yaw + 0.3, -1.45, 450)
    await glide(bot.entity.yaw + 0.6, -0.9, 800)
    let left = 0
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = yLo; y <= floor; y++) { const b = bot.blockAt(new Vec3(X0 + dx, y, Z0 + dz)); if (b && b.name !== 'air') left++ }
    ctx.log('blocks left around the bot:', left)
    // 7. ...and the last block, the one I'm standing on
    ctx.mark('final')
    await beat(18, X0, Z0, [], [], 450)
    ctx.mark('fall')
    glide(bot.entity.yaw + 0.8, 1.2, 1400, { noWait: true })   // looking up as I drop: nothing up there either
    for (let t = 0; t < 22; t++) await bot.waitForTicks(1)
    ctx.mark('cut_a')
    for (let t = 0; t < 200 && !ctx.died && bot.entity.position.y > -112; t++) await bot.waitForTicks(1)
    ctx.mark('cut_b')
    for (let t = 0; t < 120 && !ctx.died; t++) await bot.waitForTicks(1)
    ctx.log('fell out of the world:', ctx.died)
    await bot.waitForTicks(40)
    return left === 1 && ctx.died
  }
}
