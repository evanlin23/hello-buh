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
const CRUST = 8      // layers kept under the surface (floor-7..floor)
const TOP = 14       // and this much above (trees)

const SUBS = [
  ['gone', '1 block = 1 chunk', 2.2, 0],
  ['gone', '10 chunks', 2.2, 1],
  ['gone', '130 chunks', 2.2, 2],
  ['gone', 'the whole world', 3.0, 3],
  ['gone', 'my own chunk', 2.0, 4],
  ['last', 'skyblock', 2.0, 0]
]

module.exports = {
  name: 'world_delete',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'every block I mine deletes the world 💀',
  edit: {
    caption: 'every block I mine deletes the world 💀', red: 'world', song: 'songs/funk_abnormal.mp3', dropAt: 'gone',
    startAt: 'beat:-0.1', endAfter: 'last:1.6', subs: SUBS
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
    // the ground under the bot is about to go: hover (mineflayer simulates gravity in every game
    // mode, and the void kills even in creative)
    await ctx.cmd(`/tp @s ${X0 + 0.5} ${floor + 20} ${Z0 + 0.5}`)
    bot.physicsEnabled = false
    const clock = setInterval(() => bot.emit('physicsTick'), 50)     // waitForTicks counts physicsTick, which stops with physics
    // The land is rebuilt flat inside the area (the real terrain here had mountains and a frozen
    // ocean: peaks stuck out of the deleted area and the ocean poured into the void). Each chunk:
    // everything from the bottom of the world to its highest block becomes air (one /fill is
    // capped at 32768 blocks), then an 8-deep crust of stone, dirt and grass goes back, so a
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
    await ctx.hotbar(['stone_shovel'])
    await ctx.tpCheck(X0 + 0.5, floor + 1, Z0 + 0.5, 180, 12)
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
    // delete a list of chunks as a wave: farthest first, spread over `ticks`
    const wave = async (chunks, ticks) => {
      const list = chunks.filter(([i, k]) => !gone.has(key(i, k)) && key(i, k) !== own)
      const d = ([i, k]) => Math.hypot(i * 16 + 8 - X0, k * 16 + 8 - Z0)
      list.sort((a, b) => d(b) - d(a))
      const per = Math.max(1, Math.ceil(list.length / Math.max(1, ticks)))
      for (let n = 0; n < list.length; n += per) {
        for (const [i, k] of list.slice(n, n + per)) {
          gone.add(key(i, k))
          bot.chat(`/fill ${i * 16} ${yLo} ${k * 16} ${i * 16 + 15} ${yHi} ${k * 16 + 15} air`)
        }
        await bot.waitForTicks(1)
      }
      return list.length
    }
    const range = (a, b) => { const o = []; for (let v = a; v <= b; v++) o.push(v); return o }
    const chunksIn = (i0, i1, k0, k1) => { const o = []; for (const i of range(i0, i1)) for (const k of range(k0, k1)) o.push([i, k]); return o }
    // a real survival dig (start, the vanilla dig time, finish), without waiting on the server's
    // confirmation: under the deletions' lighting load it came back up to 2 s late and the camera
    // froze. The deletion that follows includes the dug block either way.
    const mine = async (x, z, lookMs = 250) => {
      const p = new Vec3(x, floor, z)
      await ctx.easeLookAt(p.offset(0.5, 0.9, 0.5), lookMs)
      const b = bot.blockAt(p)
      if (!b || b.name === 'air') return false
      const n = Math.max(1, Math.ceil(bot.digTime(b) / 50))
      bot._client.write('block_dig', { status: 0, location: p, face: 1, sequence: 0 })
      for (let k = 0; k < n; k++) { if (k % 4 === 0) { bot.swingArm(); ctx.sound('block.grass.hit', 0.25, 0.5) } await bot.waitForTicks(1) }
      bot._client.write('block_dig', { status: 2, location: p, face: 1, sequence: 0 })
      bot.swingArm()
      ctx.sound('block.grass.break', 1, 0.8); ctx.particles('block', new Vec3(x, floor, z), { block: 'grass_block' })
      return true
    }
    const look = (yaw, pitch, ms) => ctx.easeLook(yaw, pitch, ms)
    const N = 0, W = Math.PI / 2, S = Math.PI, E = -Math.PI / 2

    // 1. north: one chunk
    ctx.mark('beat', { n: 0 })
    await look(N + 0.12, -0.2, 250)            // the world, out to the horizon
    await mine(X0, Z0 - 2, 300)
    let n = await wave([[cx, cz - 1]], 1)
    ctx.mark('gone', { n: 0, chunks: n })
    await bot.waitForTicks(3)
    await look(N + 0.15, -1.0, 500)            // down into the hole: the void
    await look(N - 0.15, -0.75, 450)
    // 2. west: ten chunks
    ctx.mark('beat', { n: 1 })
    await mine(X0 - 2, Z0, 450)
    n = await wave(chunksIn(cx - 2, cx - 1, cz - 2, cz + 2), 4)
    ctx.mark('gone', { n: 1, chunks: n })
    await look(W + 0.35, -0.35, 600)            // sweep along the cut edge
    await look(W - 0.3, -0.25, 600)
    // 3. south: everything south of the bot's chunk row
    ctx.mark('beat', { n: 2 })
    await mine(X0, Z0 + 2, 550)
    const south = chunksIn(cx - R, cx + R, cz + 1, cz + R)
    const p3 = wave(south, 10)
    ctx.mark('gone', { n: 2, chunks: south.filter(([i, k]) => !gone.has(key(i, k))).length })
    await look(S - 0.1, -0.12, 500)           // up to watch the horizon go
    await p3
    await look(S + 0.3, -0.18, 500)
    // 4. east: the whole world (but my own chunk)
    ctx.mark('beat', { n: 3 })
    await mine(X0 + 2, Z0, 600)
    const all = chunksIn(cx - R, cx + R, cz - R, cz + R)
    const p4 = wave(all, 16)
    ctx.mark('gone', { n: 3, chunks: all.length })
    await look(E + 0.05, -0.1, 500)
    await p4
    // turn all the way round: void everywhere
    for (let s = 1; s <= 4; s++) await look(E + s * Math.PI / 2 - (s === 4 ? 0.0 : 0), -0.22 - 0.06 * s, 420)
    // 5. my own chunk, down to 3x3
    ctx.mark('beat', { n: 4 })
    await mine(X0 + 3, Z0 + 2, 400)
    const x1 = cx * 16, z1 = cz * 16
    bot.chat(`/fill ${X0 + 2} ${yLo} ${z1} ${x1 + 15} ${yHi} ${z1 + 15} air`)
    bot.chat(`/fill ${x1} ${yLo} ${Z0 + 2} ${X0 + 1} ${yHi} ${z1 + 15} air`)
    ctx.mark('gone', { n: 4, chunks: 1 })
    await bot.waitForTicks(4)
    await look(E + 0.9, -0.9, 500)
    await look(E + 2.2, -0.75, 600)
    // 6. the 8 blocks around me, each one taking its column with it; the last takes mine
    ctx.mark('beat', { n: 5 })
    const ring = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]
    for (let j = 0; j < ring.length; j++) {
      const [dx, dz] = ring[j]
      await mine(X0 + dx, Z0 + dz, j === 0 ? 300 : 160)
      bot.chat(`/fill ${X0 + dx} ${yLo} ${Z0 + dz} ${X0 + dx} ${floor} ${Z0 + dz} air`)
      if (j === ring.length - 1) { bot.chat(`/fill ${X0} ${yLo} ${Z0} ${X0} ${floor - 1} ${Z0} air`); ctx.mark('last') }
      await bot.waitForTicks(1)
    }
    // payoff: look down at the one block left, then drift out over the void
    await look(bot.entity.yaw + 0.3, -1.45, 500)
    await look(bot.entity.yaw + 0.5, -1.1, 900)
    await bot.waitForTicks(6)
    let left = 0
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = yLo; y <= floor; y++) { const b = bot.blockAt(new Vec3(X0 + dx, y, Z0 + dz)); if (b && b.name !== 'air') left++ }
    ctx.log('blocks left around the bot:', left)
    return left === 1 && !ctx.died
  }
}
