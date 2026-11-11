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
    let worst = 0, low = 0, wet = 0, n = 0, far = 0
    for (let dx = -152; dx <= 152; dx += 12) {
      for (let dz = -152; dz <= 152; dz += 12) {
        const b = ctx.surface(g.x + dx, g.z + dz)
        if (!b) continue
        far = Math.max(far, b.position.y - g.y)   // out to the terraces' edge: how high clearField must go
        if (Math.abs(dx) > radius || Math.abs(dz) > radius) continue
        n++
        if (/water|ice|lava/.test(b.name)) wet++
        worst = Math.max(worst, b.position.y - g.y)
        low = Math.max(low, g.y - b.position.y)
      }
    }
    const score = worst + Math.max(0, low - 4) + wet * 2
    ctx.log('site', g.x, g.y, g.z, 'hill', worst, 'low', low, 'wet', wet, 'of', n)
    if (!best || score < best.score) best = { g, score, hill: far }
    if (worst <= maxHill && low <= 4 && wet <= 2) break
  }
  if (!best) throw new Error('no dry land')
  ctx.log('flat site', best.g, 'score', best.score)
  return { X: best.g.x, Z: best.g.z, F: best.g.y, hill: best.hill }
}

// Score a site: the highest rise and deepest drop within `far` blocks (step 12), and wet samples
// within `near` of it. Hills out to the terraces' edge matter: they showed sliced, or floated.
function scoreSite (ctx, g, { near = 96, far = 152 } = {}) {
  let hill = 0, low = 0, wet = 0, n = 0
  for (let dx = -far; dx <= far; dx += 12) {
    for (let dz = -far; dz <= far; dz += 12) {
      const b = ctx.surface(g.x + dx, g.z + dz)
      if (!b) continue
      n++
      const w = /water|ice|lava/.test(b.name)
      if (w && Math.abs(dx) <= near && Math.abs(dz) <= near) wet++
      if (!w) { hill = Math.max(hill, b.position.y - g.y); low = Math.max(low, g.y - b.position.y) }
    }
  }
  return { hill, low, wet, n, score: hill + Math.max(0, low - 6) + wet * 2 }
}

// A genuinely flat site of `biome`: /locate it from several starting points far apart and keep the
// flattest (the plains near spawn sit among snowy mountains, and no clearing hid them: reviews 1-5).
async function findSite (ctx, biome, { tries = 8, good = 8 } = {}) {
  const { bot } = ctx
  const home = bot.entity.position.floored()
  let best = null
  await ctx.cmd('/gamerule send_command_feedback true')   // /locate answers as command feedback
  for (let k = 0; k < tries; k++) {
    const a = k * 2.4, r = k === 0 ? 0 : 1200 + 400 * k
    await ctx.cmd(`/tp @s ${Math.round(home.x + r * Math.cos(a))} 200 ${Math.round(home.z + r * Math.sin(a))}`)
    await bot.waitForTicks(20)
    const loc = await ctx.locateBiome(biome)   // teleports there
    if (!loc) continue
    await bot.waitForTicks(80)                 // let the chunks out to ~150 blocks arrive before judging
    try { await bot.waitForChunksToLoad() } catch (e) {}
    // try the located spot and a few around it
    for (const [ox, oz] of [[0, 0], [64, 0], [-64, 0], [0, 64], [0, -64]]) {
      const g = ctx.findLand(loc[0] + ox, loc[1] + oz)
      if (!g) continue
      const sc = scoreSite(ctx, g)
      ctx.log('site', g.x, g.y, g.z, 'hill', sc.hill, 'low', sc.low, 'wet', sc.wet, 'of', sc.n, 'score', sc.score)
      const judged = sc.n >= 300                 // (chunks loaded far enough to judge)
      if (!best || (judged && !best.judged) || (judged === best.judged && sc.score < best.score)) best = { g, score: sc.score, hill: sc.hill, judged }
      if (!judged) continue
      if (sc.score <= good) break
    }
    if (best && best.judged && best.score <= good) break
  }
  await ctx.cmd('/gamerule send_command_feedback false')
  if (!best) throw new Error('no site')
  ctx.log('flat site', best.g, 'score', best.score)
  return { X: best.g.x, Z: best.g.z, F: best.g.y, hill: best.hill }
}

// Clear a flat field of +-r around the site (air above, grass at F, dirt below), one biome.
async function clearField (ctx, { X, Z, F, hill = 24 }, { r = 72, biome = 'minecraft:plains', top = 'grass_block', under = 'dirt', taper = 0 } = {}) {
  const { bot } = ctx
  await ctx.cmd(`/tp @s ${X} ${F + 40} ${Z}`); await bot.waitForTicks(20)
  const heavy = async (c) => { bot.chat(c); await ctx.sleep(450) }
  // everything above the ground is cleared up to the highest hill the site search saw (+ trees and
  // margin): fixed heights left hill tops floating in the sky (review)
  const top_ = F + Math.max(30, hill + 24)
  await heavy(`/forceload add ${X - r} ${Z - r} ${X + r} ${Z + r}`)
  for (let z0 = Z - r; z0 <= Z + r; z0 += 6) {
    const z1 = Math.min(z0 + 5, Z + r)
    await heavy(`/fill ${X - r} ${F + 1} ${z0} ${X + r} ${F + 6} ${z1} air`)
    for (let y = F + 7; y <= top_; y += 30) await heavy(`/fill ${X - r} ${y} ${z0} ${X + r} ${Math.min(top_, y + 29)} ${z1} air`)
    await heavy(`/fill ${X - r} ${F} ${z0} ${X + r} ${F} ${z1} ${top}`)
    await heavy(`/fill ${X - r} ${F - 4} ${z0} ${X + r} ${F - 1} ${z1} ${under}`)
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
        for (let y = h + 1; y <= top_; y += dy) await heavy(`/fill ${x0} ${y} ${z0} ${x1} ${Math.min(top_, y + dy - 1)} ${z1} air`)
        for (const b of ['#minecraft:base_stone_overworld', 'dirt', 'gravel']) await heavy(`/fill ${x0} ${h} ${z0} ${x1} ${h} ${z1} ${top} replace ${b}`)
        // (no /fillbiome out here: the terraces keep their natural biome, which is what borders the field anyway)
      }
    }
    await ctx.sleep(2000)
  }
}

// Village pieces replace the ground layer with their own bottom layer, and where that is air (porch
// corners) the ground had holes the bot fell into: refill any air at ground level with the top block.
async function fixGround (ctx, { X, Z, F }, { r = 72, top = 'grass_block' } = {}) {
  await ctx.cmd(`/fill ${X - r} ${F} ${Z - r} ${X + r} ${F} ${Z + r} ${top} replace air`)
  // snowy pieces carry snow layers in their bottom layer: at ground level that was a 1-deep pit
  await ctx.cmd(`/fill ${X - r} ${F} ${Z - r} ${X + r} ${F} ${Z + r} ${top} replace snow`)
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
  // a followable camera (owner 2026-11-11: "the camera moves around so quickly some of the time. It's a little bit
  // confusing to try and follow", r:r38374d): every turn is lib/act.js's governor at TURN deg/s (well under the whip cap of 240), eased in and out
  // (it was up to 367 deg/s on a walk and 0.35 of the way per tick on a face: 600+ deg/s), and every look rests
  // HOLD ticks on what it found before the next move. The pace comes from the round cuts, not from whips.
  const TURN = 180, ACCEL = 900, HOLD = 6   // the story kit's governor (180 deg/s); a 0.3 s rest (the whip check's minimum). 140 / 9 ticks ran the Short to 52 s
  const A = require('./act')(ctx, { turnSpeed: TURN, turnAccel: ACCEL })   // the aimed actions and the governed view
  const W = (dx, dy, dz) => new Vec3(X + dx, F + dy, Z + dz)
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  const MOVES = ['forward', 'back', 'left', 'right', 'sprint', 'jump']
  // a rest on what the look found: a slow drift (never a frozen frame), the governor easing out of the turn
  const rest = async (ticks, target) => { for (let i = 0; i < ticks; i++) { if (target) await A.view(target); await bot.waitForTicks(1) } }
  const m = {
    W, A,
    // Go to (dx, dz). Without `face` the camera turns toward where it goes (governed; the feet wait while it turns
    // more than ~45 deg away); with face: [x, y, z] it stays on that point and the bot walks there sideways or
    // backwards as needed (strafing).
    async go (dx, dz, { sprint = true, pitch = -0.08, stop = 0.45, maxTicks = 160, face = null } = {}) {
      const tx = X + dx, tz = Z + dz
      let i = 0
      for (; i < maxTicks; i++) {
        const p = bot.entity.position, mx = tx - p.x, mz = tz - p.z, d = Math.hypot(mx, mz)
        if (d < stop) break
        if (face) {
          await A.view(W(face[0], face[1], face[2]))
          const y = bot.entity.yaw, fwd = (-Math.sin(y) * mx - Math.cos(y) * mz) / d, rgt = (Math.cos(y) * mx - Math.sin(y) * mz) / d
          bot.setControlState('forward', fwd > 0.35); bot.setControlState('back', fwd < -0.35)   // motion-ok: strafing toward a mark
          bot.setControlState('right', rgt > 0.35); bot.setControlState('left', rgt < -0.35)   // motion-ok: strafing toward a mark
        } else {
          const want = Math.atan2(-mx, -mz)
          await A.view({ yaw: want, pitch })
          const off = Math.abs(wrap(want - bot.entity.yaw))
          bot.setControlState('forward', off < 0.8); bot.setControlState('sprint', sprint && d > 1.4 && off < 0.4)   // motion-ok: walks where it looks
        }
        bot.setControlState('jump', !!bot.entity.isCollidedHorizontally)   // motion-ok
        await bot.waitForTicks(1)
      }
      for (const c of MOVES) bot.setControlState(c, false)   // motion-ok
      if (i >= maxTicks) ctx.log('go: did not reach', dx, dz, 'at', (bot.entity.position.x - X).toFixed(2), (bot.entity.position.z - Z).toFixed(2))
    },
    // look at a point: the governed turn (ms is ignored: the turn takes what a hand takes), then a rest on it
    async look (dx, dy, dz, ms, { hold = HOLD } = {}) {
      const p = W(dx, dy, dz)
      await A.aimAt(p, { strict: false, tol: 0.02, max: 80 })
      await rest(hold, p)
    },
    async openDoor (dx, dz) {
      await m.look(dx + 0.5, 1.5, dz + 0.5, 200, { hold: 2 })
      const loc = { x: X + dx, y: F + 1, z: Z + dz }
      await A.click(loc, 4, [0.5, 0.5, 0.5], { target: { blocks: [loc, { x: loc.x, y: loc.y + 1, z: loc.z }] }, swing: true, also: () => ctx.sound('block.wooden_door.open', 1, 0.95 + Math.random() * 0.1) })
    },
    // an eased turn to (yaw, pitch) (mineflayer radians), then a rest
    async turn (yaw, pitch, { hold = HOLD } = {}) {
      for (let i = 0; i < 80; i++) {
        const c = { yaw: bot.entity.yaw, pitch: bot.entity.pitch }
        if (Math.hypot(wrap(yaw - c.yaw), pitch - c.pitch) < 0.02) break
        await A.view({ yaw, pitch }); await bot.waitForTicks(1)
      }
      await rest(hold, { yaw, pitch })
    },
    // break a block at its real speed (ticks), with crumbs and the break sound (sound group name)
    async dig (dx, dy, dz, ticks, block, sound) {
      const loc = { x: X + dx, y: F + dy, z: Z + dz }
      // the crosshair ON the block, no angular slack (a step back left the ray on the path block beside it: rec_check sight)
      await A.aimAt(new Vec3(loc.x + 0.5, loc.y + 0.9, loc.z + 0.5), { strict: false, tol: 0.02, max: 30 })   // the top face's middle, not a grazing ray past the block beside it
      await A.breakStart(loc, 1, { deg: 0 })
      for (let i = 0; i < ticks; i++) { if (i % 4 === 0) { bot.swingArm(); ctx.sound(`block.${sound}.hit`, 0.5) } await bot.waitForTicks(1) }
      await A.breakFinish(loc, 1, { deg: 0 })
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

module.exports = { findFlat, findSite, scoreSite, clearField, fixGround, set, moves }
