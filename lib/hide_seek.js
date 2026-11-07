// Shared set-building and seeker moves for the "hide and seek but the villagers cheated" series
// (worker 16): stunts/hide_seek.js was the first; hide_seek_2.js, hide_seek_3.js build on this.
//   const hs = require('../lib/hide_seek')
//   setup:   const site = await hs.findFlat(ctx); await hs.clearField(ctx, site, { biome: 'minecraft:snowy_plains' })
//            const S = hs.set(ctx, site)  -> S.P(dx,dy,dz) (command coords), S.tpl(...), S.hider(...)
//   perform: const m = hs.moves(ctx, site) -> m.go / m.look / m.openDoor / m.dig / m.drift / m.everyTick / m.rise / m.tp / m.found / m.hmm
// Coordinates are relative to the site: (X, F, Z), F = the ground's grass level (feet stand at F + 1).

// A flat, dry site near the bot: hills sliced by the clearing fill showed as cut cliffs behind the set.
const RING = [[0, 0], [160, 0], [-160, 0], [0, 160], [0, -160], [160, 160], [-160, -160], [160, -160], [-160, 160], [320, 0], [-320, 0], [0, 320], [0, -320]]
// wide: 7x7 spots 160 apart, nearest first (biomes like snowy plains are hillier near spawn)
const WIDE = []
for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) WIDE.push([a * 160, b * 160])
WIDE.sort((p, q) => Math.hypot(...p) - Math.hypot(...q))

async function findFlat (ctx, { radius = 96, maxHill = 5, wide = false, biomeAt = null } = {}) {
  const { bot } = ctx
  const sp = bot.entity.position.floored()
  let best = null
  for (const [ox, oz] of (wide ? WIDE : RING)) {
    const cx = sp.x + ox, cz = sp.z + oz
    await ctx.cmd(`/tp @s ${cx} 200 ${cz}`)
    await bot.waitForTicks(40)
    try { await bot.waitForChunksToLoad() } catch (e) {}
    const g = ctx.findLand(cx, cz)
    if (!g) continue
    if (biomeAt && !biomeAt(g)) { ctx.log('site', g.x, g.z, 'wrong biome'); continue }
    let worst = 0, low = 0, wet = 0, n = 0
    for (let dx = -radius; dx <= radius; dx += 12) {
      for (let dz = -radius; dz <= radius; dz += 12) {
        const b = ctx.surface(g.x + dx, g.z + dz)
        if (!b) continue
        n++
        if (/water|ice|lava/.test(b.name)) wet++
        worst = Math.max(worst, b.position.y - g.y)
        low = Math.max(low, g.y - b.position.y)
      }
    }
    const score = worst + Math.max(0, low - 4) + wet * 2
    ctx.log('site', g.x, g.y, g.z, 'hill', worst, 'low', low, 'wet', wet, 'of', n)
    if (!best || score < best.score) best = { g, score }
    if (worst <= maxHill && low <= 4 && wet <= 2) break
  }
  if (!best) throw new Error('no dry land')
  ctx.log('flat site', best.g, 'score', best.score)
  return { X: best.g.x, Z: best.g.z, F: best.g.y }
}

// Clear a flat field of +-r around the site (air above, grass at F, dirt below), one biome.
async function clearField (ctx, { X, Z, F }, { r = 72, biome = 'minecraft:plains', top = 'grass_block', taper = 0 } = {}) {
  const { bot } = ctx
  await ctx.cmd(`/tp @s ${X} ${F + 40} ${Z}`); await bot.waitForTicks(20)
  const heavy = async (c) => { bot.chat(c); await ctx.sleep(450) }
  await heavy(`/forceload add ${X - r} ${Z - r} ${X + r} ${Z + r}`)
  for (let z0 = Z - r; z0 <= Z + r; z0 += 6) {
    const z1 = Math.min(z0 + 5, Z + r)
    await heavy(`/fill ${X - r} ${F + 1} ${z0} ${X + r} ${F + 6} ${z1} air`)
    await heavy(`/fill ${X - r} ${F + 7} ${z0} ${X + r} ${F + 30} ${z1} air`)
    await heavy(`/fill ${X - r} ${F} ${z0} ${X + r} ${F} ${z1} ${top}`)
    await heavy(`/fill ${X - r} ${F - 4} ${z0} ${X + r} ${F - 1} ${z1} dirt`)
    await heavy(`/fillbiome ${X - r} ${F - 4} ${z0} ${X + r} ${F + 12} ${z1} ${biome}`)
  }
  // past the field, hills are cut down in terraces (4 up every 8 out) instead of one vertical wall:
  // the edge of a single cut showed as a sliced cliff on the horizon (review). Each terrace's new top
  // turns to grass.
  if (taper) {
    const strips = (r0, r1) => [[X - r1, Z - r1, X + r1, Z - r0], [X - r1, Z + r0, X + r1, Z + r1], [X - r1, Z - r0 + 1, X - r0, Z + r0 - 1], [X + r0, Z - r0 + 1, X + r1, Z + r0 - 1]]
    for (let k = 1; k <= taper; k++) {
      const r0 = r + 8 * (k - 1) + 1, r1 = r + 8 * k, h = F + 4 * k
      for (const [x0, z0, x1, z1] of strips(r0, r1)) {
        const area = (x1 - x0 + 1) * (z1 - z0 + 1), dy = Math.max(1, Math.floor(30000 / area))
        for (let y = h + 1; y <= F + 70; y += dy) await heavy(`/fill ${x0} ${y} ${z0} ${x1} ${Math.min(F + 70, y + dy - 1)} ${z1} air`)
        for (const b of ['#minecraft:base_stone_overworld', 'dirt', 'gravel']) await heavy(`/fill ${x0} ${h} ${z0} ${x1} ${h} ${z1} ${top} replace ${b}`)
        await heavy(`/fillbiome ${x0} ${F - 4} ${z0} ${x1} ${h + 12} ${z1} ${biome}`)
      }
    }
    await ctx.sleep(2000)
  }
}

// Village pieces replace the ground layer with their own bottom layer, and where that is air (porch
// corners) the ground had holes the bot fell into: refill any air at ground level with the top block.
async function fixGround (ctx, { X, Z, F }, { r = 72, top = 'grass_block' } = {}) {
  await ctx.cmd(`/fill ${X - r} ${F} ${Z - r} ${X + r} ${F} ${Z + r} ${top} replace air`)
}

function set (ctx, { X, Z, F }) {
  const P = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
  return {
    P,
    // a vanilla village piece (rot 'none' | '180'), then its jigsaw blocks' final states (template coords)
    async tpl (piece, dx, dz, rot, jig = []) {
      await ctx.cmd(`/place template minecraft:village/${piece} ${P(dx, 0, dz)} ${rot}`)
      for (const [lx, ly, lz, b] of jig) {
        const [wx, wz] = rot === '180' ? [dx - lx, dz - lz] : [dx + lx, dz + lz]
        await ctx.cmd(`/setblock ${P(wx, ly, wz)} ${b}`)
      }
    },
    // a hider: NoAI, NoGravity, Invulnerable villager (yaw/pitch in vanilla degrees)
    hider (tag, x, y, z, yaw, pitch, prof, type = 'plains') {
      return ctx.cmd(`/summon villager ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} {NoAI:1b,NoGravity:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b,Rotation:[${yaw}f,${pitch}f],Tags:["${tag}"],VillagerData:{profession:"minecraft:${prof}",type:"minecraft:${type}",level:2},Xp:1}`)
    }
  }
}

function moves (ctx, { X, Z, F }) {
  const { bot, Vec3 } = ctx
  const W = (dx, dy, dz) => new Vec3(X + dx, F + dy, Z + dz)
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  const MOVES = ['forward', 'back', 'left', 'right', 'sprint', 'jump']
  const m = {
    W,
    // Go to (dx, dz). Without `face` the camera turns toward where it goes (eased); with face: [x, y, z]
    // it stays on that point and the bot walks there sideways or backwards as needed (strafing).
    async go (dx, dz, { sprint = true, pitch = -0.08, stop = 0.45, maxTicks = 120, face = null } = {}) {
      const tx = X + dx, tz = Z + dz
      let i = 0
      for (; i < maxTicks; i++) {
        const p = bot.entity.position, mx = tx - p.x, mz = tz - p.z, d = Math.hypot(mx, mz)
        if (d < stop) break
        const cur = bot.entity.yaw
        if (face) {
          const fx = X + face[0] - p.x, fy = F + face[1] - (p.y + 1.62), fz = Z + face[2] - p.z
          const want = Math.atan2(-fx, -fz), wantP = Math.atan2(fy, Math.hypot(fx, fz))
          await bot.look(cur + wrap(want - cur) * 0.35, bot.entity.pitch + (wantP - bot.entity.pitch) * 0.35, true)
          const y = bot.entity.yaw, fwd = (-Math.sin(y) * mx - Math.cos(y) * mz) / d, rgt = (Math.cos(y) * mx - Math.sin(y) * mz) / d
          bot.setControlState('forward', fwd > 0.35); bot.setControlState('back', fwd < -0.35)
          bot.setControlState('right', rgt > 0.35); bot.setControlState('left', rgt < -0.35)
        } else {
          const want = Math.atan2(-mx, -mz)
          await bot.look(cur + Math.max(-0.32, Math.min(0.32, wrap(want - cur) * 0.45)), bot.entity.pitch + (pitch - bot.entity.pitch) * 0.25, true)
          bot.setControlState('forward', true); bot.setControlState('sprint', sprint && d > 1.4)
        }
        bot.setControlState('jump', !!bot.entity.isCollidedHorizontally)
        await bot.waitForTicks(1)
      }
      for (const c of MOVES) bot.setControlState(c, false)
      if (i >= maxTicks) ctx.log('go: did not reach', dx, dz, 'at', (bot.entity.position.x - X).toFixed(2), (bot.entity.position.z - Z).toFixed(2))
    },
    look: (dx, dy, dz, ms) => ctx.easeLookAt(W(dx, dy, dz), ms),
    async openDoor (dx, dz) {
      await m.look(dx + 0.5, 1.5, dz + 0.5, 200)
      const loc = { x: X + dx, y: F + 1, z: Z + dz }
      bot._client.write('block_place', { hand: 0, location: loc, direction: 4, cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.wooden_door.open', 1, 0.95 + Math.random() * 0.1)
    },
    // break a block at its real speed (ticks), with crumbs and the break sound (sound group name)
    async dig (dx, dy, dz, ticks, block, sound) {
      const loc = { x: X + dx, y: F + dy, z: Z + dz }
      bot._client.write('block_dig', { status: 0, location: loc, face: 1, sequence: 0 })
      for (let i = 0; i < ticks; i++) { if (i % 4 === 0) { bot.swingArm(); ctx.sound(`block.${sound}.hit`, 0.5) } await bot.waitForTicks(1) }
      bot._client.write('block_dig', { status: 2, location: loc, face: 1, sequence: 0 })
      bot.swingArm()
      ctx.sound(`block.${sound}.break`, 1); ctx.particles('block', new Vec3(loc.x, loc.y, loc.z), { block })
    },
    hmm: (pitch = 1) => ctx.sound('entity.villager.ambient', 1, pitch),
    found (n) { ctx.mark(`r${n}_found`); ctx.sound('entity.villager.yes', 1, 1); ctx.sound('entity.player.levelup', 0.5, 1.4) },
    // a drift after a find, so the shot never freezes while the card is up
    async drift (ticks, amt = 0.1) { const y0 = bot.entity.yaw, p0 = bot.entity.pitch; for (let i = 1; i <= ticks; i++) { await bot.look(y0 + amt * Math.sin(i / ticks * Math.PI), p0 + amt * 0.5 * (i / ticks), true); await bot.waitForTicks(1) } },
    // run something every tick while the bot does other things (giveaway particles, a hider rising)
    everyTick: (n, fn) => (async () => { for (let i = 0; i < n; i++) { fn(i); await bot.waitForTicks(1) } })(),
    // a hider rising by teleports (NoGravity): `dy` blocks over `n` ticks
    rise: (tag, dy, n) => m.everyTick(n, () => bot.chat(`/execute as @e[tag=${tag},limit=1] at @s run tp @s ~ ~${(dy / n).toFixed(3)} ~`)),
    tp: (dx, dz, yaw, pitch, dy = 1) => ctx.tpCheck(X + dx, F + dy, Z + dz, yaw, pitch),
    // a round's cut: mark, set things up off camera, teleport, mark
    async cut (n, dx, dz, yaw, pitch, before = async () => {}) {
      ctx.mark(`cut${n}a`)
      await before()
      await m.tp(dx, dz, yaw, pitch)
      await bot.waitForTicks(6)
      ctx.mark(`cut${n}b`)
    }
  }
  return m
}

module.exports = { findFlat, clearField, fixGround, set, moves }
