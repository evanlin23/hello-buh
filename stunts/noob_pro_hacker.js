// "noob vs pro vs hacker 💀" (docs/ideas.md, new formats #4; worker 15). The same task done three
// ways, back to back, labelled: the NOOB fails or does it clumsily, the PRO does it with a clean
// survival technique, the HACKER types a command on camera (the joke is that he cheats). Three
// tasks, nine beats, each one a hard cut back to the same start:
//   1. get to the top of a mountain: ladders by hand, runs out halfway and falls off (noob) / an
//      ender pearl onto the summit (pro) / /effect levitation, straight past the peak (hacker)
//   2. cross a lava lake: sprint-jumps at it and lands in the middle (noob) / bridges across with
//      cobblestone (pro) / /fill turns the whole lake to diamond blocks and he runs over (hacker)
//   3. get out of a pit: digs DOWN, falls into a deeper shaft (noob) / pillars up and jumps out
//      (pro) / /summon tnt at his feet, launched out of the pit into the sky (hacker)
// Every on-camera action is a real player action (walking, placing, digging, throwing, the
// explosion's knockback); commands only build the sets out of shot, except the hacker's own,
// which are the joke (shown as his typed command).
const { plateau } = require('../lib/plateau')

const nph = require('../lib/nph')

const TASKS = ['climb the mountain', 'cross the lava', 'escape the pit']
const LADDERS = 10
// the hacker's commands as typed (relative to where he stands when he hits Enter); the TNT one is
// re-sent twice with the up arrow
const TNT = '/summon tnt ~ ~ ~ {fuse:20,explosion_power:6}'
const CMDS = ['/effect give @s levitation 5 39', '/fill ~-6 ~-2 ~-11 ~6 ~-1 ~-4 diamond_block replace lava', TNT, [TNT, 0.1], [TNT, 0.1]]
const FEEDBACK = ['Applied effect Levitation to HelloBuh', 'Successfully filled 208 block(s)', 'Summoned new Primed TNT', 'Summoned new Primed TNT', 'Summoned new Primed TNT']

// the mountain: an uneven peak (lobed outline, ridges down the flanks) of stone with grass, gravel and
// snow on top, cut by a sheer cliff on the side we start at (where the noob puts his ladders), with a
// flat summit (the pro's pearl lands on it). Heights are relative to the field (floor).
// (A plain cone read as a stepped stone pyramid in the frame review.)
const MR = 18, MH = 24, MB = 24              // MB: the loop's bounding half-width
function mh (dx, dz) {
  if (dz > cliff(dx)) return 0
  const r = Math.hypot(dx, dz)
  if (r < 3.2) return MH
  const th = Math.atan2(dz, dx)
  const R = MR * (1 + 0.18 * Math.sin(3 * th + 1.3) + 0.1 * Math.sin(5 * th + 0.4))
  if (r > R) return 0
  const t = r / R
  const ridge = 2.2 * Math.abs(Math.sin(th * 4 + r * 0.25)) * (1 - t)
  const h = MH * Math.pow(1 - t, 1.25) + ridge + 1.4 * Math.sin(dx * 0.7 + 0.3) * Math.cos(dz * 0.6) + 0.9 * Math.sin((dx - dz) * 1.1)
  return Math.max(0, Math.min(MH - 1, Math.round(h)))
}
function cliff (dx) { return dx === 0 ? 3 : 3 + Math.round(0.6 * Math.sin(dx * 0.9) + 0.8 * Math.sin(dx * 0.37 + 1)) }
const hash = (X, Z) => Math.abs(Math.sin(X * 12.9898 + Z * 78.233) * 43758.5453) % 1

module.exports = {
  name: 'noob_pro_hacker',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'noob vs pro vs hacker 💀',
  botTimeout: 400,
  edit: nph.edit({
    caption: 'noob vs pro vs hacker 💀', red: 'hacker', tasks: TASKS, cmds: CMDS, feedback: FEEDBACK,
    dropAt: 'hack', endAfter: 'boom:0.95',
    // the ladder climb at 1.6x, the pearl's long climb at 3x, the noob burning in the lava cut to the death
    speed: [['climb_a', 'ladders_out', 1.6], ['pearl:0.35', 'summit:-0.25', 3], ['burn_a', 'death:-0.2', 'cut']],
    extra: {
      deathScreen: true, onFire: 'in_lava:death',
      // a preview of the finale before beat 1 (the launch, cut before it lands)
      hook: { at: 'boom', before: 0.3, after: 0.9, text: 'wait for the hacker 💀' },
      punch: [['hack', 0, 1.08], ['hack', 1, 1.08], ['boom', 0, 1.18]],
      shake: [['boom', 0, 22]]
    }
  }),

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const x = sp.x, z = sp.z
    const F = await plateau(ctx, { x0: x - 62, x1: x + 52, z0: z - 52, z1: z + 12, above: 40, below: 24, biome: 'minecraft:plains' })
    Object.assign(this, { x, z, F })
    await ctx.defaultRules()
    for (const c of ['/gamerule random_tick_speed 0', '/gamerule fire_spread_radius_around_player 0', '/gamerule fall_damage true',
      '/gamerule keep_inventory true', '/gamerule respawn_radius 0', '/gamerule log_admin_commands false', '/gamerule spawn_mobs false',
      // hearts only move on real damage (peaceful refilled them in 0.4 s)
      '/gamerule natural_health_regeneration false']) await ctx.cmd(c)

    // --- 1. the mountain (column by column; ops aren't chat-rate-limited) ---
    const mx = x - 36, mz = z - 24
    Object.assign(this, { mx, mz })
    const H = (dx, dz) => mh(dx, dz)
    let n = 0
    const trees = []
    for (let dx = -MB; dx <= MB; dx++) {
      for (let dz = -MB; dz <= MB; dz++) {
        const h = H(dx, dz)
        if (h < 1) continue
        const X = mx + dx, Z = mz + dz
        const steep = Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => h - H(dx + a, dz + b)))
        const hv = hash(X, Z)
        const top = h >= 20 ? 'snow_block' : steep > 2 ? (hv < 0.3 ? 'andesite' : hv < 0.4 ? 'gravel' : 'stone') : (hv < 0.12 ? 'coarse_dirt' : 'grass_block')
        if (h >= 2) bot.chat(`/fill ${X} ${F + 1} ${Z} ${X} ${F + h - 1} ${Z} stone`)
        if (h >= 3 && /grass|dirt|snow/.test(top)) bot.chat(`/setblock ${X} ${F + h - 1} ${Z} ${top === 'snow_block' ? 'snow_block' : 'dirt'}`)
        bot.chat(`/setblock ${X} ${F + h} ${Z} ${top}`)
        if (top === 'grass_block' && steep <= 1 && h < 16 && dz < cliff(dx) - 4 && hv > 0.965) trees.push([X, F + h + 1, Z])
        if (++n % 6 === 0) await bot.waitForTicks(1)
      }
    }
    await bot.waitForTicks(20)
    for (const [X, Y, Z] of trees.slice(0, 14)) await ctx.cmd(`/place feature minecraft:spruce ${X} ${Y} ${Z}`)
    ctx.log('trees', trees.length)
    this.wallZ = mz + cliff(0)                 // the cliff's face block row at dx 0
    this.cliffH = H(0, cliff(0))
    // the noob's (and the hacker's) start: back from the cliff and off to the side, looking up at it
    this.startX = mx + 3.5; this.startZ = this.wallZ + 10.5
    this.startYaw = 180 - Math.atan2(3, 9) * 180 / Math.PI
    ctx.log('mountain: summit', H(0, 0), 'cliff at dx0', this.cliffH, 'wall z', this.wallZ)

    // --- 2. the lava lake: two deep on stone, flush with the grass ---
    const lx0 = x - 6, lx1 = x + 6, lz0 = z - 27, lz1 = z - 20
    Object.assign(this, { lx0, lx1, lz0, lz1 })
    await ctx.cmd(`/fill ${lx0 - 2} ${F - 4} ${lz0 - 2} ${lx1 + 2} ${F - 1} ${lz1 + 2} stone`)
    await ctx.cmd(`/fill ${lx0} ${F - 1} ${lz0} ${lx1} ${F} ${lz1} lava`)

    // --- 3. the pit: 3x3, 7 deep, stone walls under two layers of dirt; a hidden 1x1 shaft under
    // its dirt floor, 24 deeper (the noob digs into it: a fall that kills) ---
    const px = x + 20, pz = z - 24          // well inside the field: its edge showed from the launch
    Object.assign(this, { px, pz })
    await ctx.cmd(`/fill ${px - 4} ${F - 34} ${pz - 4} ${px + 4} ${F - 3} ${pz + 4} stone`)
    await ctx.cmd(`/fill ${px - 1} ${F - 6} ${pz - 1} ${px + 1} ${F} ${pz + 1} air`)
    await ctx.cmd(`/fill ${px - 1} ${F - 7} ${pz - 1} ${px + 1} ${F - 7} ${pz + 1} dirt`)
    await ctx.cmd(`/fill ${px} ${F - 31} ${pz} ${px} ${F - 8} ${pz} air`)

    await ctx.cmd('/effect give @s saturation infinite 1 true')
    await ctx.hotbar([['ladder', LADDERS]])
    // the noob's start: a step back from the cliff, facing it (north)
    await ctx.tpCheck(this.startX, F + 1, this.startZ, this.startYaw, -28)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: F, z }
  },

  // vanilla thrown-pearl flight against the world: where it lands (on a top face), or null
  pearlHit (bot, Vec3, eye, yaw, pitch) {
    const dir = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) }
    let p = { x: eye.x, y: eye.y - 0.1, z: eye.z }
    let v = { x: dir.x * 1.5, y: dir.y * 1.5, z: dir.z * 1.5 }
    const path = []
    const solid = (q) => { const b = bot.blockAt(new Vec3(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z))); return b && b.boundingBox === 'block' }
    for (let t = 0; t < 200; t++) {
      for (let s = 1; s <= 10; s++) {
        const q = { x: p.x + v.x * s / 10, y: p.y + v.y * s / 10, z: p.z + v.z * s / 10 }
        if (solid(q)) {
          const pq = { x: p.x + v.x * (s - 1) / 10, y: p.y + v.y * (s - 1) / 10, z: p.z + v.z * (s - 1) / 10 }
          const top = Math.floor(pq.y) > Math.floor(q.y) && Math.floor(pq.x) === Math.floor(q.x) && Math.floor(pq.z) === Math.floor(q.z)
          return { x: q.x, y: Math.floor(q.y) + 1, z: q.z, top, t, path }
        }
      }
      p = { x: p.x + v.x, y: p.y + v.y, z: p.z + v.z }
      path.push(p)
      v = { x: v.x * 0.99, y: v.y * 0.99 - 0.03, z: v.z * 0.99 }
    }
    return null
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { F, mx, mz, wallZ, lx0, lx1, lz0, lz1, px, pz } = this
    const k = nph.kit(ctx)
    const look = k.look
    const N = 0                                    // mineflayer yaw: north (-z)

    // ================= task 1: the mountain =================
    // NOOB: runs at the cliff, ladders by hand looking up the column, runs out a third of the way up,
    // looks down... and jumps off sideways
    k.beat({ task: 0 })
    const lz = wallZ + 1                           // the ladder column (mx, lz)
    const col = new Vec3(mx + 0.5, F + 1, lz + 0.5)
    let placed = 0
    for (let w = 0; w < 300 && placed < LADDERS; w++) {
      const p = bot.entity.position
      const dx = col.x - p.x, dz = col.z - p.z
      if (placed === 0) {                           // the run in: eyes up the cliff
        const n = Math.hypot(dx, dz) || 1
        k.steer(dx / n, dz / n)
        bot.setControlState('sprint', n > 2.5)
        if (w === 0) ctx.easeLook(bot.entity.yaw, 0.55, 900)
      } else k.steer(Math.max(-0.5, Math.min(0.5, dx * 2)), -1)   // into the ladders, centred on the column
      const want = Math.floor(p.y + 0.35) + (placed === 0 ? 0 : 1)   // the cell the feet climb into next
      if (Math.hypot(dx, dz) < 1.4 && p.z < lz + 1.7 && want >= F + 1 + placed) {
        const y = F + 1 + placed
        k.placeAt(new Vec3(mx, y, wallZ), 3, [0.5, 0.5, 1], { x: mx, y, z: lz })
        ctx.sound('block.ladder.place', 1, 0.9)
        if (placed === 0) { ctx.mark('climb_a'); ctx.easeLook(N + 0.15, 1.05, 900) }   // up the ladder column, the cliff above
        placed++
      }
      await bot.waitForTicks(1)
    }
    for (let w = 0; w < 30 && bot.entity.position.y < F + placed - 0.2; w++) { k.steer(0, -1); await bot.waitForTicks(1) }
    bot.clearControlStates()
    ctx.mark('ladders_out')
    await look(N - 0.35, -1.2, 450)                // out of ladders: looks down. That's high.
    ctx.log('noob at', (bot.entity.position.y - F).toFixed(1), 'blocks up')
    // ...and jumps off sideways, clear of the ladders (sliding down them only cost half a heart)
    bot.setControlState('jump', true)
    for (let w = 0; w < 10 && Math.abs(bot.entity.position.x - col.x) < 1.0; w++) { k.steer(1, 0.3); await bot.waitForTicks(1) }
    bot.clearControlStates()
    ctx.mark('let_go')
    ctx.easeLook(N - 0.5, -1.4, 400)
    for (let w = 0; w < 60 && !bot.entity.onGround; w++) await bot.waitForTicks(1)
    ctx.mark('noob_fell', { hp: bot.health })
    ctx.log('noob fell, health', bot.health)
    await bot.waitForTicks(3)
    await look(N - 0.1, 0.85, 500)                 // and looks back up at the ladders he fell off
    k.endBeat()

    // PRO: an ender pearl onto the summit, the camera following it
    const sz = wallZ + 10
    await ctx.cmd(`/fill ${mx} ${F + 1} ${lz} ${mx} ${F + 14} ${lz} air replace ladder`)
    await k.cutTo(mx + 0.5, F + 1, sz + 0.5, 180, -20, { hotbar: [['ender_pearl', 16]] })
    k.beat()
    const eye = bot.entity.position.offset(0, 1.62, 0)
    let best = null
    for (let pitch = 0.35; pitch <= 1.4; pitch += 0.002) {
      const hit = this.pearlHit(bot, Vec3, eye, N, pitch)
      if (!hit || !hit.top) continue
      const err = Math.hypot(hit.x - (mx + 0.5), hit.z - (mz + 0.5))
      if (!best || err < best.err) best = { pitch, err, hit }   // the middle of the flat summit (the flattest one clipped the cliff's edge)
    }
    if (!best || best.err > 3) { ctx.log('no pearl solution', best); return false }
    ctx.log('pearl: pitch', best.pitch.toFixed(3), 'lands', best.hit.x.toFixed(1), best.hit.y, best.hit.z.toFixed(1), 'err', best.err.toFixed(2))
    await look(N, best.pitch, 350)
    bot.activateItem(); bot.swingArm(); ctx.sound('entity.ender_pearl.throw', 1, 0.5)
    ctx.mark('pearl')
    const p0 = bot.entity.position.clone()
    const path = best.hit.path
    for (let w = 0; w < 120 && bot.entity.position.distanceTo(p0) < 4; w++) {
      const q = path[Math.min(path.length - 1, w + 2)]
      if (q) { const [ya, pa] = k.angTo(new Vec3(q.x, q.y, q.z)); k.lerpLook(ya, Math.min(pa, 1.15), 0.35) }   // eyes on the pearl, the cliff top kept in frame
      await bot.waitForTicks(1)
    }
    ctx.sound('entity.player.teleport', 1); ctx.particles('portal', bot.entity.position, { count: 40 })
    ctx.mark('summit')
    ctx.log('pro at', bot.entity.position.x.toFixed(1), bot.entity.position.z.toFixed(1), 'y+', (bot.entity.position.y - F).toFixed(1))
    if (bot.entity.position.y < F + MH - 1) { ctx.log('pearl missed the summit'); return false }
    await look(N + 0.45, -0.6, 700)                // on top: over the far side, the mountain under my feet
    k.endBeat()

    // HACKER: /effect give @s levitation, eyes on the peak as he shoots past it
    await k.cutTo(this.startX, F + 1, this.startZ, this.startYaw, -28)
    k.beat()
    const peak = new Vec3(mx + 0.5, F + MH + 1, mz + 0.5)
    ctx.easeLook(bot.entity.yaw - 0.15, 0.5, 1000)    // up at the peak while he types
    await bot.waitForTicks(20)
    k.typed()
    bot.chat('/effect give @s levitation 5 39 true')
    ctx.mark('hack')
    ctx.sound('entity.player.levelup', 0.6, 1.4)
    for (let w = 0; w < 48; w++) {
      const [ya, pa] = k.angTo(peak)
      k.lerpLook(ya, Math.max(-1.45, pa - 0.15), 0.18)
      await bot.waitForTicks(1)
      if (bot.entity.position.y - F > 50) break      // higher, and the field's edges show
    }
    ctx.log('hacker up', (bot.entity.position.y - F).toFixed(1))
    k.endBeat()

    // ================= task 2: the lava lake =================
    const lmx = (lx0 + lx1) / 2 + 0.5
    const bank = lz1 + 1                                          // the south bank's last row
    // NOOB: sprint-jumps at it
    bot.chat(`/spawnpoint @s ${Math.floor(lmx)} ${F + 1} ${bank + 4} 180 30`)
    bot.chat(`/setworldspawn ${Math.floor(lmx)} ${F + 1} ${bank + 4} 180 30`)
    await k.cutTo(lmx, F + 1, bank + 4.5, 180, 15)
    k.beat({ task: 1 })
    let amb = 0
    const onTick = () => { if (++amb % 19 === 0) ctx.sound(amb % 3 === 0 ? 'block.lava.pop' : 'block.lava.ambient', 0.5, 0.9 + (amb % 5) * 0.05) }
    bot.on('physicsTick', onTick)
    await bot.waitForTicks(4)
    bot.setControlState('forward', true); bot.setControlState('sprint', true)
    let inLava = false, burn = 0
    for (let w = 0; w < 160 && !ctx.died; w++) {
      const p = bot.entity.position
      if (p.z < bank + 0.45 && !inLava) bot.setControlState('jump', true)
      if (!inLava && p.z < bank && p.y < F + 0.9) { inLava = true; ctx.mark('in_lava'); ctx.sound('block.lava.extinguish', 0.5); bot.setControlState('jump', false) }
      if (inLava && w % 10 === 0) bot.setControlState('jump', true)   // swimming for the far bank
      if (w === 6) ctx.easeLook(N, 0.0, 500)
      await bot.waitForTicks(1)
      if (inLava && ++burn === 16) ctx.mark('burn_a')
    }
    bot.clearControlStates()
    if (!ctx.died) { ctx.log('noob did not die in the lava'); return false }
    await bot.waitForTicks(18)                                    // the death screen
    k.endBeat()
    ctx.revive(); ctx.respawn()
    await new Promise(r => bot.once('spawn', r))
    await bot.waitForTicks(4)

    // PRO: speed-bridges across backwards (facing back, walking off the edge, each block placed on the
    // exposed face of the one I'm on: the face you can actually see from there)
    await k.cutTo(lmx, F + 1, bank + 0.7, 0, 72, { hotbar: [['cobblestone', 64]] })
    k.beat()
    const stone = bot.registry.blocksByName.cobblestone.defaultState
    const bx = Math.floor(lmx)
    bot.setControlState('back', true)
    const LW = lz1 - lz0 + 1
    for (let i = 0; i < LW; i++) {
      const ref = new Vec3(bx, F, bank - i)                       // the block I'm on; the new one goes on its north face
      for (let w = 0; w < 40 && bot.entity.position.z > ref.z + 0.62; w++) await bot.waitForTicks(1)
      const at = ref.offset(0, 0, -1)
      k.placeAt(ref, 2, [0.5, 0.5, 0], at)
      bot.world.setBlockStateId(at, stone)                       // the client predicts its own placement
      ctx.sound('block.stone.place', 1, 0.8)
      if (i === 1) ctx.easeLook(Math.PI + 0.12, -1.2, 900)       // a touch to the side: lava both ways
    }
    for (let w = 0; w < 40 && bot.entity.position.z > lz0 - 1.4; w++) await bot.waitForTicks(1)
    bot.clearControlStates()
    ctx.mark('bridged')
    if (bot.entity.position.y < F + 0.9 || ctx.died) { ctx.log('pro fell', bot.entity.position); return false }
    await look(Math.PI + 0.1, -0.75, 450)                         // the bridge he came over
    k.endBeat()

    // HACKER: /fill ... diamond_block
    await ctx.cmd(`/fill ${lx0} ${F - 1} ${lz0} ${lx1} ${F} ${lz1} lava replace cobblestone`)
    await k.cutTo(lmx, F + 1, bank + 3.5, 180, 20)
    k.beat()
    ctx.easeLook(N + 0.2, -0.5, 1000)                             // the lava he isn't going to bridge
    await bot.waitForTicks(20)
    k.typed()
    bot.chat(`/fill ${lx0} ${F - 1} ${lz0} ${lx1} ${F} ${lz1} diamond_block replace lava`)
    ctx.mark('hack')
    ctx.sound('entity.player.levelup', 0.6, 1.4); ctx.sound('block.amethyst_block.chime', 1, 1)
    await bot.waitForTicks(6)
    bot.setControlState('forward', true); bot.setControlState('sprint', true)
    ctx.easeLook(N - 0.15, -0.35, 700)
    for (let w = 0; w < 60 && bot.entity.position.z > lz0 + 2; w++) {
      bot.setControlState('jump', w % 9 === 4)
      await bot.waitForTicks(1)
    }
    bot.clearControlStates()
    bot.removeListener('physicsTick', onTick)
    ctx.mark('diamond_run')
    k.endBeat()

    // ================= task 3: the pit =================
    const pfx = px + 0.5, pfz = pz + 0.5
    // NOOB: jumps, can't get out... digs DOWN, into a shaft deep enough to kill him
    bot.chat(`/spawnpoint @s ${px + 4} ${F + 1} ${pz + 4} 180 0`)   // on the field: in the pit, the respawn fell down the open shaft
    bot.chat(`/setworldspawn ${px + 4} ${F + 1} ${pz + 4} 180 0`)
    await k.cutTo(pfx, F - 6, pfz, 180, -60)
    k.beat({ task: 2 })
    ctx.easeLook(N + 0.4, 1.05, 500)                              // the sky, way up there
    for (let j = 0; j < 2; j++) {
      bot.setControlState('jump', true); await bot.waitForTicks(3); bot.setControlState('jump', false)
      for (let w = 0; w < 14 && !bot.entity.onGround; w++) await bot.waitForTicks(1)
    }
    await look(N, -1.45, 400)                                     // ...the floor then
    const floorB = bot.blockAt(new Vec3(px, F - 7, pz))
    try { await bot.dig(floorB, 'ignore') } catch (e) { ctx.log('dig failed', e.message); return false }
    ctx.mark('dug')
    ctx.easeLook(N + 0.2, 1.45, 700)                              // falling: the square of sky shrinking
    for (let w = 0; w < 80 && !ctx.died; w++) await bot.waitForTicks(1)
    if (!ctx.died) { ctx.log('noob survived the shaft'); return false }
    await bot.waitForTicks(18)
    k.endBeat()
    bot.chat(`/setblock ${px} ${F - 7} ${pz} dirt`)
    ctx.revive(); ctx.respawn()
    await new Promise(r => bot.once('spawn', r))
    await bot.waitForTicks(4)

    // PRO: pillars up (looking down at the block under his feet) and jumps out
    await ctx.cmd(`/setblock ${px} ${F - 7} ${pz} dirt`)
    await k.cutTo(pfx, F - 6, pfz, 180, 70, { hotbar: [['cobblestone', 64]] })
    k.beat()
    await bot.waitForTicks(3)
    for (let i = 0; i < 7; i++) {
      const base = F - 7 + i                                      // the block I stand on
      bot.setControlState('jump', true)
      ctx.easeLook(N + 0.3 * Math.sin(i * 1.1), -1.3 + 0.08 * Math.cos(i * 0.8), 420)
      for (let w = 0; w < 20 && bot.entity.position.y < base + 2.1; w++) await bot.waitForTicks(1)
      bot.setControlState('jump', false)
      k.placeAt(new Vec3(px, base, pz), 1, [0.5, 1, 0.5], { x: px, y: base + 1, z: pz })
      ctx.sound('block.stone.place', 1, 0.9)
      for (let w = 0; w < 20 && !bot.entity.onGround; w++) await bot.waitForTicks(1)
    }
    ctx.mark('pillared')
    await look(N, -0.2, 300)                                      // the rim
    bot.setControlState('forward', true); bot.setControlState('jump', true)
    await bot.waitForTicks(5)
    bot.setControlState('jump', false)
    for (let w = 0; w < 30 && !(bot.entity.onGround && bot.entity.position.z < pz - 1); w++) await bot.waitForTicks(1)
    bot.clearControlStates()
    ctx.mark('out')
    ctx.log('pro out, y', (bot.entity.position.y - F).toFixed(1))
    if (bot.entity.position.y < F + 0.9) return false
    k.endBeat()

    // HACKER: /summon tnt at his feet, three times (up arrow, Enter), launched out of the pit
    await ctx.cmd(`/fill ${px - 1} ${F - 6} ${pz - 1} ${px + 1} ${F} ${pz + 1} air`)   // the pro's pillar (before the cut: it stood where I land)
    await ctx.cmd(`/fill ${px} ${F - 31} ${pz} ${px} ${F - 8} ${pz} stone`)            // the noob's shaft (the blast opened it and he fell in)
    await k.cutTo(pfx, F - 6, pfz, 180, 30)
    k.beat()
    ctx.easeLook(N + 0.35, -0.75, 1100)                           // looking for a spot at his feet while he types
    await bot.waitForTicks(20)
    let boomed = false
    const onBoom = () => { if (!boomed) { boomed = true; ctx.mark('boom') } }
    bot._client.on('explosion', onBoom)
    const fp = bot.entity.position
    for (let i = 0; i < 3; i++) {
      if (i) await bot.waitForTicks(3)
      k.typed()
      bot.chat(`/summon tnt ${fp.x.toFixed(2)} ${fp.y.toFixed(2)} ${fp.z.toFixed(2)} {fuse:20,explosion_power:6}`)
      if (!i) { ctx.sound('entity.tnt.primed', 1); ctx.mark('hack') }
    }
    for (let w = 0; w < 40 && !boomed; w++) await bot.waitForTicks(1)
    if (!boomed) { ctx.log('no explosion'); return false }
    ctx.easeLook(N + 0.15, -1.45, 300)                            // launched: the crater falling away below
    let peakY = -99
    for (let w = 0; w < 40; w++) { await bot.waitForTicks(1); peakY = Math.max(peakY, bot.entity.position.y - F) }
    ctx.log('hacker peak', peakY.toFixed(1))
    bot._client.removeListener('explosion', onBoom)
    ctx.log('hacker launched to', (bot.entity.position.y - F).toFixed(1))
    return peakY > 5                                              // out of the pit and above the field
  }
}
