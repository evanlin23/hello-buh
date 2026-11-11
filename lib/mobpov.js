// The "mobpov" format (family `mobpov`; docs/formats.md, STANDARDS r:r8048f1): an annoying mob trait blown up into an
// unstoppable, absurdly fast POV chase. The narrator IS the mob (render.js stunt.self: a baby zombie's model and eye
// height), and it tears in a straight line through walls, pens, mobs and houses. Each episode swaps the mob, the trait
// and the course; this module is the part that stays the same.
//
// How the speed is made (no physics, no whips):
//   - The recording bot's client position is driven directly, one step a tick (rusher().dash): 1.0-1.5 blocks a tick
//     is 20-30 blocks/s, 4-5x a sprint. The camera only TRAVELS fast; it never turns fast. Turns go through R.turn
//     (smoothstep, capped at R.maxTurn deg/s, default 150, under the followable-camera rule r:r38374d's 220), and the
//     legs of the chase are joined by hard cuts (R.cut: a 'cut' mark, so render.js snaps and the whip check skips it).
//   - The server never sees those moves: the bot's movement packets are held back while the rusher runs (the server
//     would reject 30 blocks/s, and a /tp a tick floods the chat). The server-side player stays parked over the course
//     (R.park), close enough that every chunk and mob on the course is sent and simulated.
//   - What the mob runs into breaks: a bore (w x h blocks) ahead of it is cleared with /fill ... air, each block with
//     its crumbs (a 'particles' block mark) and one break sound a tick (no drops: block_drops off, /fill drops nothing).
//   - Mobs in the way are flung: /damage (the red hurt flash) and a Motion kick up and to the side, their hurt sound.
//
// R (rusher(ctx, o)) in perform:
//   R.start(parkAt)          take over: physics off, movement packets held, a 50 ms tick clock (physicsTick, so the
//                            harness records every tick and waitForTicks works); parks the server-side player first
//   R.cut(pos, yaw, pitch)   a hard cut to a new spot (radians, mineflayer convention: yaw 0 north, -PI/2 east)
//   R.shot(name)             a camera shot from stunt.shots ({ pov: true } = the mob's own eyes again)
//   await R.hold(n)          n ticks in place
//   await R.turn(yaw, pitch, n)   an eased turn over n ticks (throws if it would go over maxTurn deg/s)
//   await R.dash(to, o)      run in a straight line to `to` (Vec3, feet). o: speed (blocks/tick), accel / decel
//                            (ticks of ease in / out), bore { w, h, lead } (blocks cleared ahead, 0 = none), knock
//                            (fling mobs in the way: true), steps (footstep sound every n ticks, 0 = none), onTick(k, p)
//   R.hit(entity, kick)      fling one entity now: kick = [vx, vy, vz] (blocks/tick)
//   R.pos, R.yaw, R.pitch    where the narrator is
// The narrator's eye height comes from stunt.self.eye (render.js); R works in feet positions like the bot.
const MOVE_PACKETS = new Set(['position', 'position_look', 'look', 'flying'])
const AIR = new Set(['air', 'cave_air', 'void_air'])

// a block's break sound (vanilla sound events)
function breakSound (name) {
  if (/netherrack|nether_.*_ore/.test(name)) return 'block.netherrack.break'
  if (/deepslate/.test(name)) return 'block.deepslate.break'
  if (/glass/.test(name)) return 'block.glass.break'
  if (/grass_block|dirt|podzol|farmland|short_grass|tall_grass|fern|flower|poppy|dandelion|tulip|daisy|bluet|cornflower|hay/.test(name)) return 'block.grass.break'
  if (/gravel/.test(name)) return 'block.gravel.break'
  if (/planks|_log|_wood|fence|door|chest|crafting_table|bookshelf|stairs|slab|barrel|trapdoor|bed|sign|lectern/.test(name) && !/stone|brick|cobble|deepslate|blackstone/.test(name)) return 'block.wood.break'
  if (/wool|carpet/.test(name)) return 'block.wool.break'
  return 'block.stone.break'
}

const HURT = { pig: 'entity.pig.hurt', cow: 'entity.cow.hurt', sheep: 'entity.sheep.hurt', chicken: 'entity.chicken.hurt', villager: 'entity.villager.hurt', iron_golem: 'entity.iron_golem.hurt', mannequin: 'entity.player.hurt', zombified_piglin: 'entity.zombified_piglin.hurt', piglin: 'entity.piglin.hurt', horse: 'entity.horse.hurt', goat: 'entity.goat.hurt', cat: 'entity.cat.hurt', wolf: 'entity.wolf.hurt' }

const ease = (u) => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u)
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
const yawTo = (d) => Math.atan2(-d.x, -d.z)

function rusher (ctx, o = {}) {
  const { bot, Vec3 } = ctx
  const R = {
    maxTurn: o.maxTurn || 150,          // deg/s: under r:r38374d's 220 (and the whip check's 240), eased
    pos: null, yaw: 0, pitch: 0,
    hitIds: new Set(),
    tick: 0,
    async start (parkAt) {
      // park the server-side player over the course (creative: no fall damage, no mobs targeting it)
      await ctx.cmd('/gamemode creative')
      await ctx.cmd(`/tp @s ${parkAt.x.toFixed(2)} ${parkAt.y.toFixed(2)} ${parkAt.z.toFixed(2)}`)
      await bot.waitForTicks(6)
      R.pos = bot.entity.position.clone(); R.yaw = bot.entity.yaw; R.pitch = bot.entity.pitch
      // hold back movement packets from here on (the server keeps the parked spot), then drive the clock ourselves
      const write = bot._client.write.bind(bot._client)
      bot._client.write = (name, params) => { if (MOVE_PACKETS.has(name)) return; return write(name, params) }
      bot.physicsEnabled = false
      bot.entity.velocity.set(0, 0, 0)
      R.clock = setInterval(() => {
        if (R.pos) { bot.entity.position.set(R.pos.x, R.pos.y, R.pos.z); bot.entity.yaw = R.yaw; bot.entity.pitch = R.pitch; bot.entity.onGround = true }
        R.tick++
        bot.emit('physicsTick')
      }, 50)
      await bot.waitForTicks(1)
    },
    // apply the state on the next clock tick and wait for it
    async step () {
      await bot.waitForTicks(1)
      // staged kicks (R.hit): a flung mob speeds up over 3 entity syncs, never from rest to 1 block a tick at once
      for (const q of R.kicks.splice(0)) { if (R.tick >= q.at) bot.chat(q.cmd); else R.kicks.push(q) }
      // scripted flights (R.fling): one /tp a tick along the path
      for (const f of R.flights.splice(0)) {
        f.k++
        const p = f.path(Math.min(1, f.k / f.n))
        bot.chat(`/tp ${f.who} ${p.x.toFixed(3)} ${p.y.toFixed(3)} ${p.z.toFixed(3)}`)
        if (f.k < f.n) R.flights.push(f)
      }
    },
    flights: [],
    // fly one entity along path(u) (u 0..1, world Vec3s) over n ticks, a /tp a tick: a knock-back that has to land
    // somewhere exact (56e through his portal). Ease the path's start (the motion check: from rest to over 0.6
    // blocks a tick reads as a teleport)
    fling (e, path, n, { sound = true } = {}) {
      if (!e || !e.uuid) { ctx.log(`mobpov: fling: no entity/uuid`); return }
      R.hitIds.add(e.id)
      bot.chat(`/damage ${e.uuid} 1 minecraft:generic`)
      if (sound) ctx.sound(HURT[e.name] || 'entity.player.hurt', 1, 1)
      R.flights.push({ who: e.uuid, path, n, k: 0 })
      ctx.mark('mob_hit', { id: e.id, name: e.name, fling: n })
    },
    kicks: [],
    cutTick: -99,
    // render.js / rec_check snap the camera on any step over 0.8 blocks within 4 ticks of a cut mark: a dash
    // that starts on a cut keeps under it for its first CUT_EASE ticks (lib/mobpov.js dash)
    cut (pos, yaw, pitch = 0) {
      ctx.mark('cut')
      R.cutTick = R.tick
      R.pos = pos.clone(); R.yaw = yaw; R.pitch = pitch
    },
    shot (name) {
      const spec = (ctx.stunt.shots || {})[name]
      if (!spec) throw new Error(`mobpov: shot '${name}' is not in stunt.shots`)
      ctx.mark('shot', { name, eyeTrace: false })
    },
    async hold (n, onTick) { for (let k = 0; k < n; k++) { if (onTick) onTick(k); await R.step() } },
    async turn (yaw, pitch, n) {
      const y0 = R.yaw, p0 = R.pitch, dy = wrap(yaw - y0), dp = pitch - p0
      // smoothstep's peak speed is 1.5x the mean
      const peak = 1.5 * Math.hypot(dy, dp) * 180 / Math.PI / (n / 20)
      if (peak > R.maxTurn + 1e-6) throw new Error(`mobpov: a ${(Math.hypot(dy, dp) * 180 / Math.PI).toFixed(0)} deg turn in ${n} ticks peaks at ${peak.toFixed(0)} deg/s (cap ${R.maxTurn}): give it more ticks or cut`)
      for (let k = 1; k <= n; k++) { const e = ease(k / n); R.yaw = y0 + dy * e; R.pitch = p0 + dp * e; await R.step() }
    },
    // fling one entity (server side): the hurt flash, its hurt sound, a kick
    hit (e, kick, { sound = true, damage = 1 } = {}) {
      if (!e || R.hitIds.has(e.id)) return
      R.hitIds.add(e.id)
      const who = e.uuid || null
      if (!who) { ctx.log(`mobpov: no uuid for ${e.name} #${e.id}`); return }
      if (damage) bot.chat(`/damage ${who} ${damage} minecraft:generic`)
      // the motion check (lib/hb/motion.js visibleJumps) reads a mob going from rest to over 0.6 blocks a tick, or
      // more than doubling its speed in a tick, as a teleport; the server syncs a mob's position every 3 ticks, so
      // the kick builds over five syncs (0.3 .. 1): each step well under double the last (0.4 / 0.7 / 1 still
      // spiked now and then: mobpov_baby_zombie take 5)
      const merge = (f) => `/data merge entity ${who} {NoAI:0b,Motion:[${kick.map(v => (v * f).toFixed(3) + 'd').join(',')}]}`
      bot.chat(merge(0.3))
      ;[0.45, 0.62, 0.8, 1].forEach((f, i) => R.kicks.push({ at: R.tick + 3 * (i + 1), cmd: merge(f) }))
      if (sound) {
        ctx.sound(HURT[e.name] || 'entity.player.attack.knockback', 1, +(0.9 + Math.random() * 0.25).toFixed(3))
        ctx.sound('entity.player.attack.knockback', 0.8, 1)
      }
      ctx.mark('mob_hit', { id: e.id, name: e.name, kick })
    },
    // the blocks in the box (world coords, inclusive) that aren't air: [{ x, y, z, name }]
    solidIn (x0, y0, z0, x1, y1, z1) {
      const out = []
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        const b = bot.blockAt(new Vec3(x, y, z))
        if (b && !AIR.has(b.name) && b.name !== 'lava' && b.name !== 'water') out.push({ x, y, z, name: b.name })
      }
      return out
    },
    // clear a box: one /fill, crumbs for every block, one break sound for the box (the commonest kind)
    smash (x0, y0, z0, x1, y1, z1, { volume = 1 } = {}) {
      const bs = R.solidIn(x0, y0, z0, x1, y1, z1)
      if (!bs.length) return 0
      bot.chat(`/fill ${x0} ${y0} ${z0} ${x1} ${y1} ${z1} air`)
      const kinds = {}
      for (const b of bs) {
        ctx.particles('block', { x: b.x, y: b.y, z: b.z }, { block: b.name })
        const s = breakSound(b.name); kinds[s] = (kinds[s] || 0) + 1
      }
      const s = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0][0]
      ctx.sound(s, volume, +(0.7 + Math.random() * 0.25).toFixed(3))
      if (bs.some(b => /_door$/.test(b.name))) ctx.sound('entity.zombie.break_wooden_door', 1, 1)
      ctx.mark('smash', { n: bs.length, x: x0, y: y0, z: z0 })
      return bs.length
    },
    async dash (to, opt = {}) {
      const { speed = 1.25, accel = 3, decel = 0, bore = { w: 3, h: 3, lead: 2.5 }, knock = true, steps = 3, onTick = null, kick = null, faceIt = true } = opt
      const from = R.pos.clone(), d = to.minus(from), L = d.norm()
      if (L < 1e-6) return
      const u = d.scaled(1 / L)
      const vertical = Math.abs(u.y) > 0.7
      if (faceIt && !vertical) {
        const want = yawTo(u)
        if (Math.abs(wrap(want - R.yaw)) > 0.02) throw new Error(`mobpov: dash heading ${(want * 180 / Math.PI).toFixed(0)} but the view looks ${(R.yaw * 180 / Math.PI).toFixed(0)}: turn (R.turn) or cut first`)
      }
      // the distance covered by tick k: ease in over `accel` ticks, out over `decel`
      let s = 0, k = 0, v = 0
      const smashed = { done: 0 }   // the bore starts at the feet (a dive's first block, the grass, was skipped: the shaft stayed capped and black)
      while (s < L - 1e-6) {
        k++
        const remain = L - s
        v = Math.min(speed, speed * Math.min(1, k / Math.max(1, accel)))
        if (R.tick - R.cutTick <= 5) v = Math.min(v, 0.75)   // just after a cut: under rec_check's 0.8 snap step
        if (decel > 0) v = Math.min(v, Math.max(speed * 0.18, speed * Math.sqrt(Math.min(1, remain / (speed * decel * 0.5)))))
        s = Math.min(L, s + v)
        R.pos = from.plus(u.scaled(s))
        // the bore: everything between `lead` and `lead + v + 1` blocks ahead
        if (bore && bore.w) {
          const a = s + bore.lead, b = Math.min(L + (bore.past ?? 0), s + bore.lead + v + 1)
          if (b > smashed.done && a < L + (bore.past ?? 0) + 1) {
            const p0 = from.plus(u.scaled(Math.max(a, smashed.done))), p1 = from.plus(u.scaled(b))
            const hw = Math.floor(bore.w / 2)
            if (vertical) {
              const cx = Math.floor(from.x), cz = Math.floor(from.z)
              const yLo = Math.floor(Math.min(p0.y, p1.y)), yHi = Math.floor(Math.max(p0.y, p1.y))
              R.smash(cx - hw, yLo, cz - hw, cx + hw - (bore.w % 2 ? 0 : 1), yHi, cz + hw - (bore.w % 2 ? 0 : 1))
            } else {
              const fy = Math.floor(from.y + 0.01)
              const along = Math.abs(u.x) >= Math.abs(u.z) ? 'x' : 'z'
              const lo = Math.floor(Math.min(p0[along], p1[along])), hi = Math.floor(Math.max(p0[along], p1[along]))
              if (along === 'x') { const cz = Math.floor(from.z); R.smash(lo, fy, cz - hw, hi, fy + bore.h - 1, cz + hw) } else { const cx = Math.floor(from.x); R.smash(cx - hw, fy, lo, cx + hw, fy + bore.h - 1, hi) }
            }
            smashed.done = b
          }
        }
        // mobs in the way: ahead within 3 blocks, within the bore's half width (+0.6) to the side
        if (knock) {
          for (const e of Object.values(bot.entities)) {
            if (!e || e === bot.entity || R.hitIds.has(e.id) || !HURT[e.name] || e.name === 'mannequin') continue
            const r = e.position.minus(R.pos), ahead = r.x * u.x + r.y * u.y + r.z * u.z
            const side = r.minus(u.scaled(ahead)), lat = Math.hypot(side.x, side.z)
            if (ahead < -0.3 || ahead > 3.0 || lat > ((bore && bore.w) ? bore.w / 2 + 0.6 : 1.4) || Math.abs(r.y) > 2.5) continue
            // up, and away to the side it stands on (straight ahead: a coin flip), a little forward
            const sx = -u.z, sz = u.x, sgn = (side.x * sx + side.z * sz) >= 0 ? 1 : -1
            // (kick sizes: |kick| <= 1.25 blocks/tick, so the first stage stays under the motion check's 0.6)
            const sideKick = 0.5 + Math.random() * 0.15, f = 0.4 + Math.random() * 0.15
            R.hit(e, kick ? kick(e) : [u.x * f + sx * sgn * sideKick, 0.72 + Math.random() * 0.12, u.z * f + sz * sgn * sideKick])
          }
        }
        if (steps && k % steps === 0 && !vertical) ctx.sound(opt.stepSound || 'entity.zombie.step', 0.45, +(1.35 + Math.random() * 0.2).toFixed(3))
        if (onTick) onTick(k, R.pos, s / L)
        await R.step()
      }
    }
  }
  return R
}

// the edit every episode shares: the caption, a whoosh on every cut between legs, the subs, and the payoff (a dip, an
// impact on the busy game track, a flash and a punch-in, the end 1.0 s after: pace's payoff rule)
function mobpovEdit ({ caption, red, subs = [], whooshes = 0, extra = {} }) {
  const sfx = []
  for (let i = 0; i < whooshes; i++) sfx.push(['whoosh', 'leg', { nth: i, gain: 0.35 }])
  sfx.push(['dip', 'payoff', 0.4], ['impact', 'payoff'])
  return {
    caption, red, startAt: 'go:-0.05', endAfter: 'payoff:1.0', dropAt: 'payoff',
    subs, flash: [['payoff', 0, 0.4]], punch: [['payoff', 0, 1.08]],
    ...extra, sfx: [...sfx, ...(extra.sfx || [])]
  }
}

module.exports = { rusher, mobpovEdit, breakSound, HURT, ease, wrap, yawTo }
