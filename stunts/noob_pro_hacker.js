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

const TASKS = ['climb the mountain', 'cross the lava', 'escape the pit']
const ROLES = [['NOOB', 'green'], ['PRO', 'blue'], ['HACKER', 'red']]
const CMDS = ['/effect give @s levitation 5 39', '/fill ~-6 ~-1 ~-1 ~6 ~ ~-8 diamond_block replace lava', '/summon tnt ~ ~ ~']
const FEEDBACK = ['Applied effect Levitation to HelloBuh', 'Successfully filled 208 block(s)', 'Summoned new Primed TNT']

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
  edit: {
    caption: 'noob vs pro vs hacker 💀', red: 'hacker', song: 'songs/funk_abnormal.mp3', dropAt: 'hack',
    startAt: 'seg:0', endAfter: 'boom:0.95', deathScreen: true, onFire: 'in_lava:death', subsY: 0.3,
    // the role as a label for the whole beat (top centre), the task on its noob beat, and the
    // hacker's command typed into the vanilla chat bar (Enter on the 'typed' mark) with its feedback
    tags: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => ['seg', null, ROLES[i % 3][0], ROLES[i % 3][1], i]),
    subs: TASKS.map((t, i) => ['seg', `task ${i + 1}: ${t}`, 1.6, i * 3]),
    chat: CMDS.map((c, i) => [`typed${i}`, c, 0.9, 0.5, FEEDBACK[i]]),
    // a preview of the finale before beat 1 (the launch, cut before it lands)
    hook: { at: 'boom', before: 0.3, after: 0.9, text: 'wait for the hacker 💀' },
    punch: [['hack', 0, 1.08], ['hack', 1, 1.08], ['boom', 0, 1.18]],
    shake: [['boom', 0, 22]],
    flash: [['boom', 0, 0.35]],
    // the noob burning in the lava, cut to the death; every change of beat is a hard cut straight
    // from the end of one beat's action (x<k>) to the start of the next (g<k>): no teleport waits
    speed: [['burn_a', 'death:-0.2', 'cut'], ['pearl:0.35', 'summit:-0.25', 2],   // the pearl's long climb at 2x
      ...[1, 2, 3, 4, 5, 6, 7, 8].map(k => [`x${k}`, `g${k}`, 'cut'])]
  },

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
    // its dirt floor, 12 deeper (the noob digs into it) ---
    const px = x + 34, pz = z - 24
    Object.assign(this, { px, pz })
    await ctx.cmd(`/fill ${px - 4} ${F - 22} ${pz - 4} ${px + 4} ${F - 3} ${pz + 4} stone`)
    await ctx.cmd(`/fill ${px - 1} ${F - 6} ${pz - 1} ${px + 1} ${F} ${pz + 1} air`)
    await ctx.cmd(`/fill ${px - 1} ${F - 7} ${pz - 1} ${px + 1} ${F - 7} ${pz + 1} dirt`)
    await ctx.cmd(`/fill ${px} ${F - 19} ${pz} ${px} ${F - 8} ${pz} air`)

    await ctx.cmd('/effect give @s saturation infinite 1 true')
    await ctx.hotbar([['ladder', 8]])
    // the noob's start: a step back from the cliff, facing it (north)
    await ctx.tpCheck(this.startX, F + 1, this.startZ, this.startYaw, -28)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: F, z }
  },

  // a hard cut to a new start (the /tp carries the aim), healed, without tpCheck's 1 s stand
  async cutTo (ctx, X, Y, Z, yawDeg, pitchDeg) {
    const { bot } = ctx
    await ctx.cmd('/effect clear @s levitation')
    bot.chat('/effect give @s instant_health 1 10 true')
    for (let k = 0; ; k++) {
      ctx.mark('cut')
      bot.chat(`/tp @s ${X} ${Y} ${Z} ${yawDeg} ${pitchDeg}`)
      for (let w = 0; w < 10 && bot.entity.position.distanceTo(new ctx.Vec3(X, Y, Z)) > 0.1; w++) await bot.waitForTicks(1)
      await bot.waitForTicks(1)
      if (bot.entity.position.distanceTo(new ctx.Vec3(X, Y, Z)) < 0.15) break
      if (k === 4) throw new Error('teleport did not stick')
    }
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
    let seg = 0
    const beat = (extra = {}) => { if (seg > 0) ctx.mark(`g${seg}`); ctx.mark('seg', { n: seg++, ...extra }) }
    const endBeat = () => ctx.mark(`x${seg}`)     // the next beat's cut starts here
    const look = (yaw, pitch, ms) => ctx.easeLook(yaw, pitch, ms)
    const N = 0                                    // mineflayer yaw: north (-z)
    const placeAt = (ref, face, cursor, at) => {   // a real right-click on a block face
      bot._client.write('block_place', { hand: 0, location: ref, direction: face, cursorX: cursor[0], cursorY: cursor[1], cursorZ: cursor[2], insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm()
      ctx.mark('place', { x: at.x, y: at.y, z: at.z })
    }
    const typed = async (i) => {                   // the hacker hits Enter on his command
      ctx.mark('typed', { n: i }); ctx.mark(`typed${i}`)   // chat takes an event's first occurrence
      ctx.sound('ui.button.click', 0.4, 1.4)
    }

    // move toward a world direction whatever way I'm looking: the forward/back/left/right combination
    // that points closest to (dirX, dirZ) (the camera looks out while the feet climb)
    const steer = (dirX, dirZ) => {
      const yaw = bot.entity.yaw
      const fw = [-Math.sin(yaw), -Math.cos(yaw)], lf = [-Math.sin(yaw + Math.PI / 2), -Math.cos(yaw + Math.PI / 2)]
      let best = null
      for (const f of [-1, 0, 1]) {
        for (const l of [-1, 0, 1]) {
          if (!f && !l) continue
          const vx = f * fw[0] + l * lf[0], vz = f * fw[1] + l * lf[1]
          const d = (vx * dirX + vz * dirZ) / Math.hypot(vx, vz)
          if (!best || d > best.d) best = { f, l, d }
        }
      }
      bot.setControlState('forward', best.f === 1); bot.setControlState('back', best.f === -1)
      bot.setControlState('left', best.l === 1); bot.setControlState('right', best.l === -1)
    }
    const angTo = (q) => { const e = bot.entity.position.offset(0, 1.62, 0), d = q.minus(e); return [Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))] }
    const lerpLook = (yaw, pitch, k) => {         // one tick of a smooth follow
      let dy = yaw - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      bot.look(bot.entity.yaw + dy * k, bot.entity.pitch + (pitch - bot.entity.pitch) * k, true)
    }

    // ================= task 1: the mountain =================
    // NOOB: walks up to the cliff, ladders by hand, runs out a third of the way up, lets go
    beat({ task: 0 })
    ctx.select(0)
    const lz = wallZ + 1                           // the ladder column (mx, lz)
    const col = new Vec3(mx + 0.5, F + 1, lz + 0.5)
    let placed = 0, turned = false
    for (let w = 0; w < 260 && placed < 8; w++) {
      const p = bot.entity.position
      const dx = col.x - p.x, dz = col.z - p.z
      if (placed === 0) {                           // the walk in: eyes up the cliff
        const n = Math.hypot(dx, dz) || 1
        steer(dx / n, dz / n)
        bot.setControlState('sprint', n > 2.5)       // runs at it (the whole mountain in shot)
        if (w === 0) ctx.easeLook(bot.entity.yaw, 0.55, 900)
      } else steer(Math.max(-0.5, Math.min(0.5, dx * 2)), -1)   // into the ladders, centred on the column
      const fy = p.y
      const want = Math.floor(fy + 0.35) + (placed === 0 ? 0 : 1)   // the cell the feet climb into next
      if (Math.hypot(dx, dz) < 1.4 && p.z < lz + 1.7 && want >= F + 1 + placed) {
        const y = F + 1 + placed
        placeAt(new Vec3(mx, y, wallZ), 3, [0.5, 0.5, 1], { x: mx, y, z: lz })
        ctx.sound('block.ladder.place', 1, 0.9)
        placed++
      }
      if (placed === 2 && !turned) { turned = true; ctx.easeLook(-1.25, -0.95, 1300) }   // looks out and down: the ground dropping away
      await bot.waitForTicks(1)
    }
    ctx.mark('ladders_out')
    // out of ladders at the top one: looks down... and lets go
    for (let w = 0; w < 30 && bot.entity.position.y < F + placed - 0.2; w++) { steer(0, -1); await bot.waitForTicks(1) }
    bot.clearControlStates()
    await look(-0.6, -1.0, 300)
    ctx.log('noob at', (bot.entity.position.y - F).toFixed(1), 'blocks up')
    ctx.easeLook(-0.5, -1.3, 400)
    for (let w = 0; w < 14 && bot.entity.position.z < lz + 1.45; w++) { steer(0, 1); await bot.waitForTicks(1) }
    bot.clearControlStates()
    for (let w = 0; w < 60 && !bot.entity.onGround; w++) await bot.waitForTicks(1)
    ctx.mark('noob_fell')
    await look(-0.2, 0.85, 500)                    // and looks back up at the ladders he fell off
    await bot.waitForTicks(3)
    endBeat()

    // PRO: an ender pearl onto the summit, the camera following it
    const sz = wallZ + 10
    await this.cutTo(ctx, mx + 0.5, F + 1, sz + 0.5, 180, -20)
    await ctx.cmd(`/fill ${mx} ${F + 1} ${lz} ${mx} ${F + 12} ${lz} air replace ladder`)
    await ctx.hotbar([['ender_pearl', 16]])
    ctx.select(0)
    beat()
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
      if (q) { const [ya, pa] = angTo(new Vec3(q.x, q.y, q.z)); lerpLook(ya, pa, 0.35) }   // eyes on the pearl
      await bot.waitForTicks(1)
    }
    ctx.sound('entity.player.teleport', 1); ctx.particles('portal', bot.entity.position, { count: 40 })
    ctx.mark('summit')
    ctx.log('pro at', bot.entity.position.x.toFixed(1), bot.entity.position.z.toFixed(1), 'y+', (bot.entity.position.y - F).toFixed(1))
    if (bot.entity.position.y < F + MH - 1) { ctx.log('pearl missed the summit'); return false }
    // on top: a look over the far side, the whole mountain under my feet
    await look(N + 0.45, -0.6, 700)
    await bot.waitForTicks(3)
    endBeat()

    // HACKER: /effect give @s levitation, eyes on the peak as he shoots past it
    await this.cutTo(ctx, this.startX, F + 1, this.startZ, this.startYaw, -28)
    await ctx.hotbar([])
    beat()
    const peak = new Vec3(mx + 0.5, F + MH + 1, mz + 0.5)
    ctx.easeLook(bot.entity.yaw, 0.45, 600)
    await bot.waitForTicks(20)
    await typed(0)
    bot.chat('/effect give @s levitation 5 39 true')
    ctx.mark('hack')
    ctx.sound('entity.player.levelup', 0.6, 1.4)
    for (let w = 0; w < 48; w++) {
      const [ya, pa] = angTo(peak)
      lerpLook(ya, Math.max(-1.45, pa - 0.15), 0.18)
      await bot.waitForTicks(1)
      if (bot.entity.position.y - F > 85) break
    }
    ctx.log('hacker up', (bot.entity.position.y - F).toFixed(1))
    ctx.mark('lev_top')
    endBeat()

    // ================= task 2: the lava lake =================
    const lmx = (lx0 + lx1) / 2 + 0.5
    const bank = lz1 + 1                                          // the south bank's last row
    // NOOB: sprint-jumps at it
    await this.cutTo(ctx, lmx, F + 1, bank + 4.5, 180, 15)
    await ctx.cmd('/effect clear @s levitation')
    await ctx.hotbar([])
    // the respawn after the noob's death is the pro's start, the bank
    bot.chat(`/spawnpoint @s ${Math.floor(lmx)} ${F + 1} ${bank + 1} 180 30`)
    bot.chat(`/setworldspawn ${Math.floor(lmx)} ${F + 1} ${bank + 1} 180 30`)
    beat({ task: 1 })
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
    ctx.mark('noob_dead')
    await bot.waitForTicks(18)                                    // the death screen
    endBeat()
    ctx.revive(); ctx.respawn()
    await new Promise(r => bot.once('spawn', r))
    await bot.waitForTicks(4)

    // PRO: bridges across with cobblestone
    await this.cutTo(ctx, lmx, F + 1, bank + 1.5, 180, 50)
    await ctx.hotbar([['cobblestone', 64]])
    ctx.select(0)
    beat()
    const stone = bot.registry.blocksByName.cobblestone.defaultState
    const bx = Math.floor(lmx)
    bot.setControlState('forward', true)
    const LW = lz1 - lz0 + 1
    for (let k = 0; k < LW; k++) {
      const ref = new Vec3(bx, F, bank - k)                       // the block the new one goes against
      for (let w = 0; w < 40 && bot.entity.position.z > ref.z + 1.55; w++) await bot.waitForTicks(1)
      const at = ref.offset(0, 0, -1)
      placeAt(ref, 2, [0.5, 0.5, 0], at)
      bot.world.setBlockStateId(at, stone)                       // the client predicts its own placement
      ctx.sound('block.stone.place', 1, 0.8)
      if (k === 2) ctx.easeLook(N, -0.75, 600)
    }
    for (let w = 0; w < 40 && bot.entity.position.z > lz0 - 1.4; w++) await bot.waitForTicks(1)
    bot.clearControlStates()
    ctx.mark('bridged')
    if (bot.entity.position.y < F + 0.9 || ctx.died) { ctx.log('pro fell', bot.entity.position); return false }
    await look(N + 0.3, -0.6, 400)                                // across: lava on both sides of the last block
    endBeat()

    // HACKER: /fill ... diamond_block
    await this.cutTo(ctx, lmx, F + 1, bank + 3.5, 180, 20)
    await ctx.cmd(`/fill ${lx0} ${F - 1} ${lz0} ${lx1} ${F} ${lz1} lava replace cobblestone`)
    await ctx.hotbar([])
    beat()
    ctx.easeLook(N, -0.5, 500)                                    // the lava he isn't going to bridge
    await bot.waitForTicks(20)
    await typed(1)
    bot.chat(`/fill ${lx0} ${F - 1} ${lz0} ${lx1} ${F} ${lz1} diamond_block replace lava`)
    ctx.mark('hack')
    ctx.sound('entity.player.levelup', 0.6, 1.4); ctx.sound('block.amethyst_block.chime', 1, 1)
    await bot.waitForTicks(6)
    bot.setControlState('forward', true); bot.setControlState('sprint', true)
    ctx.easeLook(N - 0.15, -0.35, 700)
    for (let w = 0; w < 60 && bot.entity.position.z > lz0 + 2; w++) {
      if (w % 9 === 4) bot.setControlState('jump', true); else bot.setControlState('jump', false)
      await bot.waitForTicks(1)
    }
    bot.clearControlStates()
    bot.removeListener('physicsTick', onTick)
    ctx.mark('diamond_run')
    endBeat()

    // ================= task 3: the pit =================
    const pfx = px + 0.5, pfz = pz + 0.5
    // NOOB: jumps, can't get out... digs DOWN
    await this.cutTo(ctx, pfx, F - 6, pfz, 180, -60)
    await ctx.hotbar([])
    beat({ task: 2 })
    ctx.easeLook(N + 0.4, 1.05, 500)                              // the sky, way up there
    for (let j = 0; j < 2; j++) {
      bot.setControlState('jump', true); await bot.waitForTicks(3); bot.setControlState('jump', false)
      for (let w = 0; w < 14 && !bot.entity.onGround; w++) await bot.waitForTicks(1)
    }
    await look(N, -1.45, 400)                                     // ...the floor then
    const floorB = bot.blockAt(new Vec3(px, F - 7, pz))
    ctx.log('pit floor', floorB && floorB.name)
    try { await bot.dig(floorB, 'ignore') } catch (e) { ctx.log('dig failed', e.message); return false }
    ctx.mark('dug')
    for (let w = 0; w < 60 && !bot.entity.onGround; w++) { if (w === 2) ctx.easeLook(N, -1.2, 300); await bot.waitForTicks(1) }
    for (let w = 0; w < 50 && (bot.entity.onGround === false || bot.entity.position.y > F - 18.5); w++) await bot.waitForTicks(1)
    ctx.mark('noob_deeper', { hp: bot.health })
    ctx.log('noob in the shaft at', (bot.entity.position.y - F).toFixed(1), 'health', bot.health)
    await look(N + 0.2, 1.45, 650)                                // the tiny square of sky, now even further
    await bot.waitForTicks(4)
    endBeat()

    // PRO: pillars up and jumps out
    await this.cutTo(ctx, pfx, F - 6, pfz, 180, 55)
    await ctx.cmd(`/setblock ${px} ${F - 7} ${pz} dirt`)
    await ctx.hotbar([['cobblestone', 64]])
    ctx.select(0)
    beat()
    await bot.waitForTicks(3)
    for (let k = 0; k < 7; k++) {
      const base = F - 7 + k                                      // the block I stand on
      bot.setControlState('jump', true)
      ctx.easeLook(N + 0.35 * Math.sin(k * 1.1), -1.0 + 0.1 * Math.cos(k * 0.8), 420)
      for (let i = 0; i < 20 && bot.entity.position.y < base + 2.1; i++) await bot.waitForTicks(1)
      bot.setControlState('jump', false)
      placeAt(new Vec3(px, base, pz), 1, [0.5, 1, 0.5], { x: px, y: base + 1, z: pz })
      ctx.sound('block.stone.place', 1, 0.9)
      for (let i = 0; i < 20 && !bot.entity.onGround; i++) await bot.waitForTicks(1)
    }
    ctx.mark('pillared')
    await look(N, -0.2, 300)                                      // the rim
    bot.setControlState('forward', true); bot.setControlState('jump', true)
    await bot.waitForTicks(5)
    bot.setControlState('jump', false)
    for (let w = 0; w < 30 && !(bot.entity.onGround && bot.entity.position.z < pz - 1); w++) await bot.waitForTicks(1)
    bot.clearControlStates()
    ctx.mark('out')
    ctx.log('pro out at', bot.entity.position, 'y', (bot.entity.position.y - F).toFixed(1))
    if (bot.entity.position.y < F + 0.9) return false
    endBeat()

    // HACKER: /summon tnt ~ ~ ~
    await ctx.cmd(`/fill ${px - 1} ${F - 6} ${pz - 1} ${px + 1} ${F} ${pz + 1} air`)   // the pro's pillar (before the cut: it stood where I land)
    await this.cutTo(ctx, pfx, F - 6, pfz, 180, 30)
    await ctx.hotbar([])
    beat()
    ctx.easeLook(N, -0.75, 600)                                   // where the TNT goes: at my feet
    await bot.waitForTicks(20)
    await typed(2)
    const fp = bot.entity.position
    for (let k = 0; k < 3; k++) bot.chat(`/summon tnt ${fp.x.toFixed(2)} ${fp.y.toFixed(2)} ${fp.z.toFixed(2)} {fuse:16}`)
    // and a ring round the rim, out of shot: the crater has to read from 40 blocks up (a 3x3 pit didn't)
    for (const [a, b] of [[-3, -3], [0, -3], [3, -3], [-3, 0], [3, 0], [-3, 3], [0, 3], [3, 3]]) bot.chat(`/summon tnt ${px + a + 0.5} ${F - 2} ${pz + b + 0.5} {fuse:16}`)
    ctx.sound('entity.tnt.primed', 1)
    ctx.mark('hack')
    let boomed = false
    const onBoom = () => { if (!boomed) { boomed = true; ctx.mark('boom') } }
    bot._client.on('explosion', onBoom)
    for (let w = 0; w < 40 && !boomed; w++) await bot.waitForTicks(1)
    if (!boomed) { ctx.log('no explosion'); return false }
    ctx.easeLook(N + 0.15, -1.45, 300)                            // launched: the crater falling away below
    for (let w = 0; w < 40; w++) await bot.waitForTicks(1)
    bot._client.removeListener('explosion', onBoom)
    ctx.log('hacker launched to', (bot.entity.position.y - F).toFixed(1))
    return bot.entity.position.y > F + 20
  }
}
