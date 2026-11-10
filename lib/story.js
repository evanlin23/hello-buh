// Narrated story Shorts (docs/stories.md): the narration's timing for a story stunt.
// stories/<name>/voice/voice.json comes from scripts/voice.py: each line's spoken length and its
// caption chunks' start/end (seconds from the start of the line's wav).
//   const S = storyLines('stories/<name>')
//   S.line('L03').dur        seconds of the line's wav
//   S.line('L03').at(4)      tick (from the line's mark) where caption chunk 4 starts
//   S.gap                    seconds of air after each line
const fs = require('fs')
const path = require('path')

function storyLines (dir) {
  const vf = path.join(dir, 'voice', 'voice.json')
  if (!fs.existsSync(vf)) throw new Error(`no ${vf}: run scripts/voice.py ${dir} first`)
  const v = JSON.parse(fs.readFileSync(vf, 'utf8'))
  const story = JSON.parse(fs.readFileSync(path.join(dir, 'story.json'), 'utf8'))
  return {
    gap: story.gap ?? v.gap ?? 0.12,
    ids: story.lines.map(l => l.id),
    line (id) {
      const l = v.lines[id]
      if (!l) throw new Error(`line ${id} has no voice: run scripts/voice.py ${dir}`)
      return { ...l, at: (k) => Math.round(l.chunks[Math.min(k, l.chunks.length - 1)][0] * 20) }
    }
  }
}

module.exports = { storyLines }

// ---- small helpers every story re-wrote (plain functions, also on the kit as K.ease, K.mcYaw, ...)

// ease in-out on u, clamped to 0..1 (past 1 the curve falls again and the camera swung back: worker 8)
const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2 }
// Minecraft yaw in degrees (0 = south, 90 = west) of a walking direction (dx, dz): the yaw for a mob /tp
const mcYaw = (dx, dz) => -Math.atan2(dx, dz) * 180 / Math.PI
// the absolute difference of two angles in radians, wrapped to 0..PI
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI; return Math.abs(d) }

// The building helpers for `setup`, relative to the set's origin (X, F, Z):
//   const { c, A, P, mob, vil } = setKit(ctx, { X, Z, F })
//   await c('/gamerule ...')                       ctx.cmd (waits 4 ticks)
//   A(dx, dy, dz)                                  "x y z" for /fill, /setblock
//   P(dx, dy, dz)                                  a Vec3
//   await mob('sheep', dx, dy, dz, yaw, ['main', 'warm'], 'Color:3b')
//   await vil(dx, dz, yaw, 'librarian', 'lib', { type: 'taiga', y: 1 })
// The cast is NoAI, Silent, Invulnerable and PersistenceRequired: it moves only when a scene moves it.
// Tag anything that stands idle for a while 'warm' (the kit nudges it every tick: a long-idle mob's first
// move reaches the client ~1 s late). `yaw` can be [yaw, pitch].
function setKit (ctx, { X, Z, F }) {
  const c = (s) => ctx.cmd(s)
  const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
  const P = (dx, dy, dz) => new ctx.Vec3(X + dx, F + dy, Z + dz)
  const nbtTags = (tags) => [].concat(tags || []).map(t => `"${t}"`).join(',')
  const mob = (type, x, y, z, yaw = 0, tags = [], more = '') => {
    const [yw, pt] = Array.isArray(yaw) ? yaw : [yaw, 0]
    more = String(more || '').replace(/^,/, '')
    return c(`/summon ${type} ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:[${nbtTags(tags)}],Rotation:[${yw}f,${pt}f]${more ? ',' + more : ''}}`)
  }
  const vil = (x, z, yaw, prof, tags = [], { type = 'plains', y = 1, more = '' } = {}) =>
    mob('villager', x, y, z, yaw, tags, `VillagerData:{profession:"minecraft:${prof}",type:"minecraft:${type}",level:2},Xp:1${more ? ',' + String(more).replace(/^,/, '') : ''}`)
  return { c, A, P, mob, vil }
}

// Vanilla's dig time (ms) for the held item on a block: hardness x 30 (or x 100 without the right tool)
// over the tool's speed. mineflayer's own bot.digTime came out as a bare hand's on 1.21.11 (an iron
// pickaxe on gold ore took 4.55 s, not 0.75: Minecraft audit, story_respawn_voice). No enchantments/haste.
const TIER_SPEED = { wooden: 2, stone: 4, copper: 5, iron: 6, diamond: 8, netherite: 9, golden: 12 }
function vanillaDigMs (bot, block, item = bot.heldItem) {
  const info = block && bot.registry.blocksByName[block.name]
  if (!info) return 1000
  const hardness = info.hardness ?? block.hardness ?? 1
  if (hardness < 0) return Infinity
  if (hardness === 0) return 0
  const m = item && /^([a-z]+)_(pickaxe|axe|shovel|hoe)$/.exec(item.name)
  const right = !!(m && String(info.material || '').split(';').includes(`mineable/${m[2]}`))
  const speed = right ? (TIER_SPEED[m[1]] || 1) : 1
  const harvest = !info.harvestTools || !!(item && info.harvestTools[item.type])
  const dmg = speed / hardness / (harvest ? 30 : 100)
  return dmg >= 1 ? 0 : Math.ceil(1 / dmg) * 50
}

// The per-line machinery every story stunt needs (stunts/_story_template.js shows it all in use):
//   const K = storyKit(ctx, S, { X, Z, F })
//   await K.cut(dx, dz, K.P(dx, dy, dz))       teleport (a cut in the renderer), arriving already aimed
//   await K.cut(dx, dz, target, 1, { time: 18000 })   ...and the time of day changes on the cut's own frame
//   await K.cutTo(dx, y, dz, target)           the same with an absolute feet y (a cut on the spot, a pillar)
//   await K.line('L03', (k, at, n) => {...})    mark the line, run the scene every tick for dur + gap (n ticks)
//   await K.preroll(10, (k) => {...})          motion that must already be moving on the line's first frame
//   K.look(k, dyaw, dpitch)                     aim + a slow sway (no shot is ever still)
//   K.turnTo(from, p, u)                        an eased turn toward a point, u 0..1
//   K.flee(tag, speed)                          a tagged group steps away from the camera, facing away
//   K.actor(tag, {x, z, yaw}) / K.step / K.bury a mob /tp'd every tick from a state object you edit
//   K.tp(tag, dx, dy, dz, yaw, pitch)           one /tp of a tagged mob, set-relative
//   K.go(on) / K.ctl(key, on) / K.stop()        movement keys
//   K.setTime(n)  K.setMeter(v)  K.groan()      time of day, the edit's rule meter, a zombie's groan
//   K.knockback(() => attackerPos)              apply vanilla knockback to hits (mineflayer drops it)
//   await K.dig(block)                          dig at vanilla speed (mineflayer's digTime is off on 1.21.11)
//   K.every(fn)                                 run fn every tick (ambient motion), until the returned stop()
// Options (4th argument): { warm: 'warm' } the tag nudged every tick (null: none), { stopOnCut: true }
// movement keys released on every cut (sneak is kept: a crouch that changed on a cut showed as stray frames).
function storyKit (ctx, S, { X, Z, F }, opts = {}) {
  const { bot } = ctx
  const set = setKit(ctx, { X, Z, F })
  const MOVE = ['forward', 'back', 'left', 'right', 'sprint', 'jump']
  const K = {
    base: { yaw: 0, pitch: 0 },
    sway: 1,
    stopOnCut: opts.stopOnCut ?? true,
    meter: null,
    X, Z, F,
    A: set.A,
    c: set.c,
    mob: set.mob,
    vil: set.vil,
    P: set.P,
    ease,
    mcYaw,
    angDiff,
    say: (s) => bot.chat(s),                    // ops aren't chat-limited: per-tick commands are fine
    T: (id) => Math.round((S.line(id).dur + S.gap) * 20),   // a line's length in ticks
    aim (p) {
      const eye = bot.entity.position.offset(0, 1.62, 0), d = p.minus(eye)
      return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
    },
    swayY: () => Math.sin(ctx.tick / 19) * 0.1 * K.sway,
    swayP: () => Math.sin(ctx.tick / 27) * 0.04 * K.sway,
    look (k, dyaw = 0, dpitch = 0) {
      // the sway runs on the recording's clock (a per-line k restarted it and the camera jumped between lines of
      // one shot); reviewers read a smaller sway as a frozen shot
      return bot.look(K.base.yaw + dyaw + K.swayY(), K.base.pitch + dpitch + K.swayP(), true)
    },
    // movement keys
    ctl: (key, on) => bot.setControlState(key, on),
    go: (on, key = 'forward') => bot.setControlState(key, on),
    stop (keys = MOVE) { for (const k of keys) bot.setControlState(k, false) },
    // a cut to (X + dx, F + dy, Z + dz), arriving aimed at `target`. opts (or a function = opts.during):
    //   during()  every tick while the teleport lands (the old shot keeps moving)
    //   after()   once, right after the /tp is sent (grow a pillar, move the cast with the cut)
    //   time      the time of day of the new shot, set on the cut's own frame
    //   stop      release the movement keys first (default K.stopOnCut)
    cut (dx, dz, target, dy = 1, o = {}) { return K.cutTo(dx, F + dy, dz, target, o) },
    async cutTo (dx, y, dz, target, o = {}) {
      if (typeof o === 'function') o = { during: o }
      const { during = null, after = null, time, stop = K.stopOnCut } = o
      if (stop) K.stop()
      const x = X + dx, z = Z + dz
      // always decimals: /tp centres a whole-number x/z on the block (+0.5) and the arrival check never matched
      // arrive already aimed (the rotation rides on the teleport): aiming after it showed the new
      // place at the old angle for 2 frames, then a snap (frame review, story_runaway)
      const d = target.minus(new ctx.Vec3(x, y + 1.62, z))
      const nb = { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
      const yaw = nb.yaw + K.swayY(), pitch = nb.pitch + K.swayP()
      // the landing: mineflayer applies the teleport (position and rotation together) and emits forcedMove. That
      // is the tick the new pose is recorded, so a time change is marked there: set before the cut the new sky
      // showed on the old shot, marked after the cut returned it came a tick late (story_sheep_stares)
      let landed = false
      const near = () => { const p = bot.entity.position; return Math.abs(p.x - x) < 0.05 && Math.abs(p.z - z) < 0.05 && Math.abs(p.y - y) < 0.6 }
      const onMove = () => {
        if (landed || !near()) return
        landed = true
        if (time !== undefined) ctx.mark('time', { time })
      }
      bot.on('forcedMove', onMove)
      if (time !== undefined) { ctx.dayTime = time; K.say(`/time set ${time}`) }
      ctx.mark('cut')   // the renderer snaps to the new spot at any distance (short cuts glided; worker 8)
      K.say(`/tp @s ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)} ${(180 - yaw * 180 / Math.PI).toFixed(2)} ${(-pitch * 180 / Math.PI).toFixed(2)}`)
      if (after) after()
      // the old shot keeps swaying (on its old aim) while the teleport lands: it froze for 2-4 frames before
      // every cut; a look at the new aim before the landing would turn the old shot instead. Arrival compares
      // y and the angle too (x/z alone passed at once on a cut on the spot, and the new aim snapped in late:
      // story_one_block_higher)
      try {
        for (let i = 0; i < 10; i++) {
          await bot.waitForTicks(1)
          if (landed || (near() && angDiff(bot.entity.yaw, yaw) < 0.03 && Math.abs(bot.entity.pitch - pitch) < 0.03)) break
          K.look(0); if (during) during()
        }
      } finally { bot.removeListener('forcedMove', onMove) }
      if (!landed && time !== undefined) ctx.mark('time', { time })
      K.base = nb
      await K.look(0)
    },
    flee (tag, speed) { K.say(`/execute as @e[tag=${tag}] at @s facing entity ${bot.username} feet rotated ~180 0 positioned ^ ^ ^${speed} run tp @s ~ ${F + 1} ~ facing ^ ^ ^5`) },
    // turn the camera to a point over n ticks (eased), from inside a scene: call every tick with u = (k - start) / n
    turnTo (from, p, u) {
      const to = K.aim(p), e = ease(u)
      let dy = to.yaw - from.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy <= -Math.PI) dy += 2 * Math.PI
      K.base = { yaw: from.yaw + dy * e, pitch: from.pitch + (to.pitch - from.pitch) * e }
    },
    // one line: mark it, run scene(k, at, n) every tick for its spoken length + gap + extra seconds (n ticks).
    // o.tail(): runs once, o.tailAt (8) ticks before the end (bring the next shot's cast up out of view)
    async line (id, scene, extra = 0, o = {}) {
      const L = S.line(id)
      const ticks = Math.round((L.dur + S.gap + extra) * 20)
      ctx.mark('line', { id })
      for (let k = 0; k < ticks; k++) {
        if (o.tail && k === ticks - (o.tailAt ?? 8)) o.tail()
        await scene(k, L.at, ticks); await bot.waitForTicks(1)
      }
    },
    // ticks before a line's mark: entity moves reach the client a few ticks late, so motion that must be
    // moving on the line's first frame starts here (~10 ticks). fn(k) moves things; the camera keeps swaying
    async preroll (ticks, fn) {
      for (let k = 0; k < ticks; k++) { if (fn) await fn(k); K.look(k); await bot.waitForTicks(1) }
    },
    // fn() every tick (physics ticks, also while dead and during cuts) until the returned stop() is called
    every (fn) {
      const h = () => { try { fn() } catch (e) { ctx.log('every:', e.message) } }
      bot.on('physicsTick', h)
      return () => bot.removeListener('physicsTick', h)
    },
    // one /tp of a tagged mob, set-relative (limit=1)
    tp (tag, x, y, z, yaw = 0, pitch = 0) { K.say(`/tp @e[tag=${tag},limit=1] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${(+yaw).toFixed(1)} ${(+pitch).toFixed(1)}`) },
    // actors: a mob /tp'd every tick from a state object { x, y = 1, z, yaw, pitch } that scenes just edit, so
    // it never goes idle (an idle mob's first move reaches the client ~1 s late; a rotation only reaches it
    // with a move, so a still actor jitters by 0.002)
    actors: new Map(),
    actor (tag, state) {
      const a = Object.assign({ y: 1, yaw: 0, pitch: 0 }, state)
      K.actors.set(tag, a)
      if (!K._actorTick) K._actorTick = K.every(() => {
        const j = ctx.tick % 2 ? 0.002 : -0.002
        for (const [t, s] of K.actors) K.tp(t, s.x + j, s.y, s.z, s.yaw, s.pitch)
      })
      return a
    },
    // walk an actor by (dx, dz) and face the way it walks
    step (a, dx, dz) { a.x += dx; a.z += dz; if (dx || dz) a.yaw = mcYaw(dx, dz) },
    // stop moving an actor and put it `depth` blocks under the set, out of sight
    bury (tag, depth = 30) { const a = K.actors.get(tag); K.actors.delete(tag); K.say(`/tp @e[tag=${tag}] ${a ? (X + a.x).toFixed(3) : X} ${F - depth} ${a ? (Z + a.z).toFixed(3) : Z}`) },
    // the time of day now (renderer `time` mark; no 4-tick wait like ctx.setTime, which stalled the shot).
    // On a cut, pass { time } to K.cut instead so the light changes on the cut's frame
    setTime (n) { n = Math.round(n); if (n === ctx.dayTime) return; ctx.dayTime = n; K.say(`/time set ${n}`); ctx.mark('time', { time: n }) },
    // the rule meter edit.py draws (story.json "meter": {"label": ...})
    setMeter (v) { K.meter = v; ctx.mark('meter', { value: v }) },
    groan (vol = 0.7, pitch = 1, who = 'zombie') { ctx.sound(`entity.${who}.ambient`, vol, pitch) },
    // vanilla knockback for hits on the bot: the server sends it as the player's velocity, which mineflayer
    // scales away to nothing on 1.21.11, so apply LivingEntity.knockback(strength) ourselves when that packet
    // comes: half the old speed plus `strength` away from the attacker, and up from the ground.
    // from(): the attacker's absolute position ({x, z} or a Vec3). Returns a function that turns it off.
    knockback (from, strength = 0.4) {
      const on = (p) => {
        if (!bot.entity || p.entityId !== bot.entity.id || ctx.died) return
        setImmediate(() => {
          const a = typeof from === 'function' ? from() : from
          if (!a) return
          const e = bot.entity, dx = e.position.x - a.x, dz = e.position.z - a.z, d = Math.hypot(dx, dz) || 1, v = e.velocity
          v.x = v.x / 2 + dx / d * strength; v.z = v.z / 2 + dz / d * strength
          if (e.onGround) v.y = Math.min(0.4, v.y / 2 + strength)
        })
      }
      bot._client.on('entity_velocity', on)
      return () => bot._client.removeListener('entity_velocity', on)
    },
    // dig a block at vanilla speed for the held item (or `ms`): bot.digTime is swapped for the dig, so the
    // crack the renderer draws (the harness's `dig` mark) and the break both use it. Not awaited, the scene
    // keeps ticking: `K.dig(b).then(...)`
    dig (block, ms = vanillaDigMs(bot, block)) {
      const dt = bot.digTime
      bot.digTime = () => ms
      return bot.dig(block, 'ignore').finally(() => { bot.digTime = dt })
    }
  }
  // idle cast tagged `warm` gets a tiny move every tick (a long-idle mob's first move reaches the client ~1 s
  // late). An `execute as` that matches nothing is silent. 0.003, not the 0.002 stunts used for their own nudge:
  // the two together never cancel out to no move in a tick
  const warm = opts.warm === undefined ? 'warm' : opts.warm
  if (warm) K.every(() => K.say(`/execute as @e[tag=${warm}] at @s run tp @s ~${ctx.tick % 2 ? 0.003 : -0.003} ~ ~`))
  return K
}

// A little house: cobble floor, plank walls with log corners, a spruce roof, glass windows on the
// x-running walls, a hanging lantern, and a door (open or shut) at (doorX, doorZ) facing `facing`.
async function house (ctx, A, x0, z0, doorX, doorZ, facing, open = true, wall = 'oak_planks') {
  const c = (s) => ctx.cmd(s), x1 = x0 + 5, z1 = z0 + 5
  await c(`/fill ${A(x0, 0, z0)} ${A(x1, 4, z1)} ${wall} hollow`)   // a room y1-y3 (a hollow fill from y1 left one air layer)
  await c(`/fill ${A(x0, 0, z0)} ${A(x1, 0, z1)} cobblestone`)
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) await c(`/fill ${A(x, 1, z)} ${A(x, 3, z)} oak_log`)
  await c(`/fill ${A(x0 - 1, 4, z0 - 1)} ${A(x1 + 1, 4, z1 + 1)} spruce_planks`)
  await c(`/fill ${A(x0, 5, z0)} ${A(x1, 5, z1)} spruce_slab`)
  await c(`/setblock ${A(x0 + 2, 4, z0 + 2)} glowstone`); await c(`/setblock ${A(x0 + 3, 4, z0 + 3)} glowstone`)   // lit inside
  await c(`/fill ${A(x0 + 2, 2, z0)} ${A(x0 + 3, 2, z0)} glass`)
  await c(`/fill ${A(x0 + 2, 2, z1)} ${A(x0 + 3, 2, z1)} glass`)
  await c(`/setblock ${A(doorX, 2, doorZ)} oak_door[half=upper,facing=${facing},open=${open}]`)
  await c(`/setblock ${A(doorX, 1, doorZ)} oak_door[half=lower,facing=${facing},open=${open}]`)
}

// Clear a flat set: air from y1 to `top`, grass at y0, dirt below, over (2r+1)^2 blocks in /fill-sized slabs.
// r 64 keeps the cut edge of the natural terrain far back in the fog: at r 40 a sliced hill stood behind
// the party as a flat-sided dirt tower (Minecraft audit, story_runaway).
// Then (unless { hanging: false }) the gravel and sand left hanging over the set by a hill the clearing cut
// is swept out (clearHanging below).
async function clearSet (ctx, A, r = 64, top = 24, skirt = 16, { hanging = true } = {}) {
  const c = (s) => ctx.cmd(s)
  // every chunk of the clearing has to be loaded first: right after the biome search's teleport the far edge
  // wasn't, five whole-layer /fills failed with "That position is not loaded" and a snowy hill stood in the set
  // (story_nitwit, recording 2)
  try { await ctx.bot.waitForChunksToLoad() } catch (e) {}
  await ctx.bot.waitForTicks(20)
  const per = Math.max(1, Math.floor(32768 / ((2 * r + 1) * (2 * r + 1))))
  for (let y0 = 1; y0 <= top; y0 += per) await c(`/fill ${A(-r, y0, -r)} ${A(r, Math.min(top, y0 + per - 1), r)} air`)
  await c(`/fill ${A(-r, 0, -r)} ${A(r, 0, r)} grass_block`)
  for (let y0 = -4; y0 <= -1; y0 += per) await c(`/fill ${A(-r, y0, -r)} ${A(r, Math.min(-1, y0 + per - 1), r)} dirt`)
  // a terraced skirt around it: rings of 2 blocks, each a block higher, capped with grass, so a hill the clearing
  // cut reads as a slope down to the plain, not a sheer wall of dirt and stone (Minecraft audit, story_runaway)
  for (let i = 1; i <= skirt / 2; i++) {
    const a0 = r + 2 * i - 1, a1 = r + 2 * i, h = i
    for (const [x0, z0, x1, z1] of [[-a1, -a1, a1, -a0], [-a1, a0, a1, a1], [-a1, -a0, -a0, a0], [a0, -a0, a1, a0]]) {
      await c(`/fill ${A(x0, h + 1, z0)} ${A(x1, top, z1)} air`)
      for (const b of ['#minecraft:base_stone_overworld', 'dirt']) await c(`/fill ${A(x0, h, z0)} ${A(x1, h, z1)} grass_block replace ${b}`)
    }
  }
  if (hanging) await clearHanging(ctx, A, { r, top })
}

// Gravel and sand hanging over the set: a hill higher than the clearing's top is left floating, and its gravel
// and sand fall later, as grey heaps in the street (story_sheep_stares: the L11 cut landed inside one and he
// suffocated; story_more_golems, story_one_block_higher). Take them out of the air from top + 1 to top + above,
// wait for what is already falling, then sweep any that landed on the set (y 1 to `floor`). Call it before
// building anything of gravel or sand above the ground (clearSet does, unless { hanging: false }).
async function clearHanging (ctx, A, { r = 64, top = 24, above = 72, floor = 4 } = {}) {
  const FALL = ['gravel', 'sand', 'red_sand']
  // whole layers fit the 32768 /fill cap up to r 90; wider sets go in strips along x
  const strip = Math.max(1, Math.floor(32768 / (2 * r + 1)))
  const layer = (y, cmd) => { for (let x0 = -r; x0 <= r; x0 += strip) cmd(`/fill ${A(x0, y, -r)} ${A(Math.min(r, x0 + strip - 1), y, r)}`) }
  // fast (bot.chat, no 4-tick wait per fill: a few hundred fills)
  for (let y = top + 1; y <= top + above; y++) for (const b of FALL) layer(y, (f) => ctx.bot.chat(`${f} air replace ${b}`))
  await ctx.sleep(3000)
  for (let i = 0; i < 2; i++) { await ctx.cmd('/kill @e[type=falling_block]'); await ctx.bot.waitForTicks(10) }
  for (let y = 1; y <= floor; y++) for (const b of FALL) layer(y, (f) => ctx.bot.chat(`${f} air replace ${b}`))
  await ctx.bot.waitForTicks(10)
}

// One biome (plains grass and water colours) over the set. /fillbiome is capped like /fill but counts whole
// biome cells (4x4x4), so a thin slab of 81x81 still counted 81x81x5: fill 3x3 tiles, 4 rows at a time.
// mineflayer ignores the chunk_biomes packet, so call `resendChunks` afterwards.
async function plainsBiome (ctx, A, r = 80, bottom = -4, top = 28) {
  const step = Math.ceil((2 * r + 1) / 3)   // 3x3 tiles: even rounded out to whole cells, well under the cap
  for (let x0 = -r; x0 <= r; x0 += step) for (let z0 = -r; z0 <= r; z0 += step) {
    for (let y0 = bottom; y0 <= top; y0 += 4) await ctx.cmd(`/fillbiome ${A(x0, y0, z0)} ${A(Math.min(r, x0 + step - 1), Math.min(top, y0 + 3), Math.min(r, z0 + step - 1))} minecraft:plains`)
  }
}

// Go out of range and back so the chunks come again (with the new biomes); physics ticks stop while far
// chunks load, so wait on the wall clock.
async function resendChunks (ctx, X, Z) {
  await ctx.cmd(`/tp @s ${X + 600} 200 ${Z}`)
  await ctx.sleep(3000)
}

module.exports.storyKit = storyKit
module.exports.house = house
module.exports.clearSet = clearSet
module.exports.plainsBiome = plainsBiome
module.exports.resendChunks = resendChunks
module.exports.clearHanging = clearHanging
module.exports.setKit = setKit
module.exports.vanillaDigMs = vanillaDigMs
module.exports.ease = ease
module.exports.mcYaw = mcYaw
module.exports.angDiff = angDiff
