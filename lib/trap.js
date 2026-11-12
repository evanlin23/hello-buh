// The "trap" format (family `trap`; docs/formats.md, STANDARDS r:refc733; owner: "trapping friend"): build an
// irresistible bait over a REAL vanilla trap, show just enough of how it works to be clever, hide, and the friend (a
// second player, never 56e, never the owner's name) walks straight into it: the payoff. Every part of the trap works
// in vanilla on its own (minecraft-audit): the friend is a real player bot on mineflayer's physics, so when the floor
// goes he falls because the floor is gone. No command makes the trap go off; commands only grade the set and move
// the friend while he is out of view.
// Each episode swaps the bait and the trap; this module is the part that stays the same:
//   makeStunt(ep)   a stunt module: a flat grass pad on real plains (local frame: the pad's centre block (0, 0, 0),
//                   floor y 0, feet y 1; mineflayer yaw 0 looks north, -z), ep.set(ctx, T) (commands: the pre-built
//                   part of the set), the friend spawned and parked out of sight, the hotbar, the player at ep.start,
//                   then ep.perform(ctx, T); and the edit every episode shares (trapEdit).
//   trapEdit(o)     the caption from frame 0, a "step n" sub + pop on each build step, the friend's chat lines (the
//                   marks), the payoff: a dip, an impact, a flash, a punch, the drop of the NCS bed on it; the end on `still`.
// T, in set and perform:
//   T.at(x, y, z) / T.A(x, y, z)   a local point -> world Vec3 / a command's "x y z"
//   T.K, T.act                     the story kit (eased looks, walks, the sway) and lib/act.js on it
//   T.place(x, y, z, state, item)  put a block (aimed, K.place; o.against) and take one `item` out of the hotbar
//   T.dig(x, y, z)                 break it at vanilla speed for the held tool (aimed)
//   T.look(x, y, z, o) / T.walk(pts, o) / T.hold(ticks) / T.drift(ticks, dyaw, dpitch) / T.sneak(on)
//   T.step()                       the nth build step starts (its sub and a pop)
//   T.payoff() / T.still()         the payoff mark / the final hold starts (the edit ends `still` + o.endHold)
//   T.friend                       the friend (below)
// T.friend: a real player (lib/movie.js spawnActors) on his own physics; his look turns eased, at most 12 deg a tick
//   .name / .bot / .entity()       his username, his mineflayer bot, his entity as the camera sees it
//   .enter(x, y, z, yawDeg)        put him somewhere out of the camera's view (a /tp: rec_check warns on one near the
//                                  frame; prefer ep.park at his entrance)
//   .join()                        "<name> joined the game" in the chat (yellow), as the server says it
//   .say(text)                     his chat line "<name> text"
//   .walk(pts, o)                  walk through local points [[x, z], ...] with the forward key, looking where he goes;
//                                  stops on the last one (o.tol, 0.18): throws if he doesn't get there
//   .lookAt(x, y, z, ticks)        an eased head turn to a local point
//   .open(x, y, z)                 a real right-click on that block (a chest): his own client sends it
//   .waitFall(o)                   the ticks until he has fallen and landed (o.minDrop blocks, 1.5)
const sets = require('./sets')
const act = require('./act')
const M = require('./movie')
const { storyKit } = require('./story')

const FRIEND_TURN = 12 * Math.PI / 180   // rad a tick: a head turn at 240 deg/s at most, eased in by the distance left
const WALK_COAST = 0.26                  // blocks a walk coasts after the forward key is let go (0.216 b/t, friction 0.546)

// the shared edit. steps: the build subs; chat: [mark, nth] lines are marks (friend.say / join), so nothing here
function trapEdit ({ caption, red, steps = [], payoffSub = null, endHold = 1.0, hookText = 'he fell for it', hookBefore = 0.45, extra = {} }) {
  // subs draw text only (no Twemoji, unlike the caption): an emoji in a step renders as a NO GLYPH box (review round 1)
  const bad = steps.find(t => /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t))
  if (bad) throw new Error(`trap: no emoji in step subs (they render as a NO GLYPH box): "${bad}"`)
  const subs = steps.map((t, i) => ['step', t, 1.6, i])
  if (payoffSub) subs.push(['payoff', payoffSub, 1.2, 0])
  const sfx = [['pop', 'go', { gain: 0.5 }]]   // a sound by 0.3 s (pace's audio hook)
  for (let i = 0; i < steps.length; i++) sfx.push(['pop', 'step', { nth: i, gain: 0.45 }])
  sfx.push(['pop', `payoff:${-(hookBefore - 0.05)}`, { gain: 1.0 }])   // the opening flash-forward starts hookBefore s before the payoff: a sound by 0.3 s there too (pace hook)
  sfx.push(['dip', 'payoff', 0.4], ['impact', 'payoff', { gain: 1.4 }])   // mixcheck: a real hit on the final mix, not only the bed's drop
  const e = {
    caption, red, startAt: 'go:-0.05', endAfter: `payoff:${endHold}`, dropAt: 'payoff', chatScale: 5,   // settle-ok: the payoff is a player dropping 2 blocks into a pit (landed ~0.45 s later); no blocks or debris move
    subs, flash: [['payoff', 0, 0.35]], punch: [['payoff', 0, 1.06]], sfx,
    // the opening (owner r:r0f3da0: frame 0 shows the subject, never the bare pad): a flash-forward of the friend at the
    // bait as the floor goes, with a reaction line, then the build from step 1 (retention.hook_prepend; plain text)
    hook: { at: 'payoff', before: hookBefore, after: 0.45, text: hookText }   // short: the friend at the bait, the floor going; it must not reach back past an edit cut (a jump cut 0.5 s before the payoff stuttered at 0.22 s), one line so it sits above his head
  }
  return { ...e, ...extra, ...(extra.sfx ? { sfx: [...sfx, ...extra.sfx] } : {}), ...(extra.subs ? { subs: [...subs, ...extra.subs] } : {}) }
}

// ep: { name, caption, red, steps, payoffSub, hookText (the opening's reaction line), friend: { name, skin }, pad (half width, 9), set(ctx, T), hotbar,
// select, start: [x, y, z, yawDeg, pitchDeg], park: [x, y, z, yawDeg] (where the friend waits for his entrance: a spot
// the camera never sees before he joins), perform(ctx, T) -> ok, time, biome, edit (extra) }
function makeStunt (ep) {
  const FRIEND = ep.friend.name
  if (/^56e$/i.test(FRIEND)) throw new Error('trap: the friend is a second player, never 56e (r:refc733)')
  return {
    name: ep.name,
    biome: process.env.BIOME || ep.biome || 'minecraft:plains',
    caption: ep.caption,
    time: ep.time ?? 6000,
    hideHand: false,
    settle: false,                 // the payoff is a player falling into a pit: no blast, no falling blocks
    cast: { [FRIEND]: ep.friend.skin || 'kai' },
    playerNames: true,             // vanilla draws another player's name over his head
    recordRadius: ep.recordRadius ?? 40,
    edit: trapEdit({ caption: ep.caption, red: ep.red, steps: ep.steps, payoffSub: ep.payoffSub, endHold: ep.endHold, hookText: ep.hookText, hookBefore: ep.hookBefore, extra: ep.edit || {} }),

    async setup (ctx) {
      const { bot } = ctx
      await ctx.defaultRules()
      for (const c of ['/gamerule random_tick_speed 0', '/gamerule fire_spread_radius_around_player 0', '/difficulty peaceful',
        '/gamerule keep_inventory true', '/gamerule block_drops false', '/gamerule show_death_messages false', '/kill @e[type=!player]']) await ctx.cmd(c, { mayFail: true })
      const R = ep.pad ?? 9
      const site = await sets.findSite(ctx, { w: 2 * R + 6, d: 2 * R + 6, maxRange: 2, maxTrees: 0.1 })
      const p = bot.entity.position.floored()
      const cx = site ? site.x : p.x, cz = site ? site.z : p.z
      await ctx.forceload({ x0: cx - R - 24, z0: cz - R - 24, x1: cx + R + 24, z1: cz + R + 24 })
      const g = ctx.surface(cx, cz)
      if (!g) throw new Error('trap: no ground at the site')
      const O = this.O = { x: cx, y: site ? site.y : g.position.y, z: cz }
      // the pad: real terrain round it, graded flat (dirt under grass, stone under that), clear above
      await ctx.cmd(`/fill ${O.x - R} ${O.y + 1} ${O.z - R} ${O.x + R} ${O.y + 14} ${O.z + R} air`)
      await ctx.cmd(`/fill ${O.x - R} ${O.y - 6} ${O.z - R} ${O.x + R} ${O.y - 4} ${O.z + R} stone`)
      await ctx.cmd(`/fill ${O.x - R} ${O.y - 3} ${O.z - R} ${O.x + R} ${O.y - 1} ${O.z + R} dirt`)
      await ctx.cmd(`/fill ${O.x - R} ${O.y} ${O.z - R} ${O.x + R} ${O.y} ${O.z + R} grass_block`)
      const T = this.T = helpers(ctx, O, FRIEND)
      if (ep.set) await ep.set(ctx, T)
      // the friend: a second player, waiting at his entrance (ep.park: [x, y, z, yawDeg], where the camera never looks
      // before he joins), so he walks the whole way in: no teleport anywhere near the frame
      const park = ep.park || [0, 1, R + 6, 180]
      await ctx.cmd(`/setworldspawn ${T.A(Math.floor(park[0]), park[1], Math.floor(park[2]))}`)
      await ctx.cmd('/gamerule respawn_radius 0', { mayFail: true })
      const cast = await M.spawnActors(ctx, [FRIEND])
      T.friend.bot = cast[FRIEND]
      await ctx.cmd(`/gamemode survival ${FRIEND}`)
      await ctx.cmd(`/effect give ${FRIEND} resistance infinite 4 true`)
      await ctx.cmd(`/effect give ${FRIEND} saturation infinite 1 true`)
      await ctx.cmd(`/clear ${FRIEND}`)
      if (ep.friend.item) await ctx.cmd(`/item replace entity ${FRIEND} weapon.mainhand with ${ep.friend.item}`)
      await ctx.cmd(`/tp ${FRIEND} ${T.A(park[0], park[1], park[2])} ${park[3] ?? 180} 0`)
      await ctx.cmd('/kill @e[type=item]', { mayFail: true })
      await ctx.cmd(`/attribute @s minecraft:block_interaction_range base set ${ep.reach ?? 5}`)
      await ctx.hotbar(ep.hotbar)
      const [x, y, z, yaw, pitch] = ep.start
      const s = T.at(x, y, z)
      await ctx.tpCheck(+s.x.toFixed(2), s.y, +s.z.toFixed(2), yaw, pitch)
      await ctx.cmd('/gamemode survival')
      ctx.select(ep.select ?? 0)
      await bot.waitForTicks(30)
      return { x: O.x, y: O.y, z: O.z }
    },

    async perform (ctx) {
      const T = this.T
      T.K = storyKit(ctx, { line: () => ({ dur: 0, gap: 0 }), gap: 0 }, { X: this.O.x, Z: this.O.z, F: this.O.y }, { warm: null })
      T.K.base = { yaw: ctx.bot.entity.yaw, pitch: ctx.bot.entity.pitch }
      T.K.sway = ep.sway ?? 0.35   // a steady hand: the full sway took the aim off a floor block's centre (a grazing ray)
      T.act = act(ctx, { K: T.K })
      return ep.perform(ctx, T)
    }
  }
}

function helpers (ctx, O, FRIEND) {
  const { bot } = ctx
  const V = (x, y, z) => new ctx.Vec3(O.x + x, O.y + y, O.z + z)
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  let steps = 0
  // one tick of the scene: the camera's sway / governed turn, the friend's per-tick work, then the tick
  const tick = async (fn) => { if (fn) fn(); T.K.look(0); await bot.waitForTicks(1); T.K._clock = (T.K._clock || 0) + 1 }
  const T = {
    O,
    at: V,
    A: (x, y, z) => `${O.x + x} ${O.y + y} ${O.z + z}`,
    cmd: (s, o) => ctx.cmd(s, o),
    tick,
    async place (x, y, z, state, item, o = {}) {
      const name = String(state).split('[')[0]
      await T.K.place(V(x, y, z), state, { ...o, sound: o.sound ?? `block.${ctx.soundGroup(name)}.place`, ...(o.against ? { against: V(...o.against) } : {}) })
      ctx.mark('placed', { x, y, z, block: name })
      if (item) await ctx.cmd(`/clear @s ${item} 1`)   // the hotbar count goes down by one, as a real place takes it
      for (let k = 0; k < 8; k++) { const b = bot.blockAt(V(x, y, z)); if (b && b.name === name) return true; await tick() }
      throw new Error(`trap: the ${name} at ${x} ${y} ${z} never appeared`)
    },
    async dig (x, y, z, o = {}) {
      const b = bot.blockAt(V(x, y, z))
      if (!b || b.name === 'air') throw new Error(`trap: nothing to dig at ${x} ${y} ${z}`)
      const grp = ctx.soundGroup(b.name)
      ctx.sound(`block.${grp}.hit`, 0.25, 0.5)   // the client's dig sounds: a hit as the crack starts, the break
      await T.K.dig(b, undefined, o)
      ctx.sound(`block.${grp}.break`, 1, 0.8)
      ctx.mark('dug', { x, y, z })
      for (let k = 0; k < 8; k++) { const q = bot.blockAt(V(x, y, z)); if (q && q.name === 'air') return true; await tick() }
      throw new Error(`trap: the block at ${x} ${y} ${z} did not break`)
    },
    look: (x, y, z, o = {}) => T.K.aimAt(Object.assign(V(x, y, z), { exact: true }), o),
    walk: (pts, o = {}) => T.K.walkTo(pts.map(p => V(...p)), o),
    async hold (ticks, fn) { for (let k = 0; k < ticks; k++) await tick(fn ? () => fn(k) : null) },
    // a pause that still lives: the view drifts (dyaw, dpitch degrees, eased) over the ticks, a player taking it in
    // (rec_check blocks a held pause: a camera under 2.5 deg/s with nothing changing in view for 1 s)
    async drift (ticks, dyaw = 0, dpitch = 0) {
      const b0 = { ...T.K.base }, R = Math.PI / 180
      for (let k = 1; k <= ticks; k++) {
        const t = k / ticks, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        T.K.base = { yaw: b0.yaw + dyaw * R * e, pitch: b0.pitch + dpitch * R * e }
        await tick()
      }
    },
    sneak (on) { bot.setControlState('sneak', on) },
    step: () => { ctx.mark('step', { n: steps++ }); return steps },
    payoff: () => ctx.mark('payoff'),
    still: () => ctx.mark('still'),
    friend: null
  }

  const F = T.friend = {
    name: FRIEND,
    bot: null,
    entity: () => { const p = bot.players[FRIEND]; return p && p.entity },
    pos: () => F.bot.entity.position,
    async enter (x, y, z, yawDeg = 0) {
      await ctx.cmd(`/tp ${FRIEND} ${T.A(x, y, z)} ${yawDeg} 0`)
      for (let k = 0; k < 20; k++) { if (F.bot.entity.position.distanceTo(V(x, y, z)) < 0.2) break; await tick() }
      ctx.mark('friend_enter', { x, y, z })
    },
    join () { ctx.mark('syschat', { text: `${FRIEND} joined the game`, color: 'yellow' }) },
    say (text) { ctx.mark('syschat', { text: `<${FRIEND}> ${text}` }); ctx.mark('friend_says', { text }) },
    // his look, one eased step a tick toward (yaw, pitch) in mineflayer radians
    _turn (yaw, pitch) {
      const e = F.bot.entity
      const dy = wrap(yaw - e.yaw), dp = pitch - e.pitch
      const k = Math.min(1, FRIEND_TURN / Math.max(1e-6, Math.hypot(dy, dp)), 0.45)
      F.bot.look(e.yaw + dy * k, e.pitch + dp * k, true)
      return Math.hypot(dy, dp)
    },
    // footsteps (the client plays another player's steps itself: the recording has none) every 1/0.6 blocks on the ground
    _walked: 0.6,
    _stepped (d) {
      F._walked += d * 0.6
      if (F._walked < 1 || !F.bot.entity.onGround) return
      F._walked = 0
      const p = F.pos(), under = bot.blockAt(p.offset(0, -0.5, 0))
      if (under && under.name !== 'air') ctx.sound(`block.${ctx.soundGroup(under.name)}.step`, 0.2, 1)   // (sound marks aren't positional: quieter than my own)
    },
    async walk (pts, o = {}) {
      const tol = o.tol ?? 0.18, pitch = o.pitch ?? 0
      const W = pts.map(([x, z]) => ({ x: O.x + x, z: O.z + z }))
      let i = 0, last = F.pos().clone()
      ctx.mark('friend_walk', { to: pts[pts.length - 1] })
      for (let k = 0; k < (o.max ?? 400); k++) {
        const p = F.pos(), w = W[i], final = i === W.length - 1
        const dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz)
        if (!final && d < 0.6) { i++; continue }
        const yaw = Math.atan2(-dx, -dz)
        let go = false
        await tick(() => {
          const off = Math.abs(wrap(yaw - F.bot.entity.yaw))
          if (!(final && d < WALK_COAST + 0.04)) F._turn(yaw, pitch)
          go = !(final && d < WALK_COAST + 0.04) && off < 0.6
          F.bot.setControlState('forward', go)
          F._stepped(Math.hypot(p.x - last.x, p.z - last.z)); last = p.clone()
          if (o.during) o.during(k)
        })
        if (final && !go && d < WALK_COAST + 0.04) break
      }
      F.bot.setControlState('forward', false)
      // the coast, then a player's last little shuffle onto the spot: crouched taps of forward / back along his facing
      // (a crouch walk moves ~0.03 b/tick and barely coasts), until he is within o.fine (0.06) of it
      for (let k = 0; k < 10; k++) await tick(() => { if (o.during) o.during(-1) })
      const w = W[W.length - 1]
      for (let n = 0; n < (o.shuffles ?? 6); n++) {
        const q = F.pos(), yaw = F.bot.entity.yaw
        const along = -(w.x - q.x) * Math.sin(yaw) - (w.z - q.z) * Math.cos(yaw)   // + : the spot is ahead of him
        if (Math.abs(along) < (o.fine ?? 0.06)) break
        const key = along > 0 ? 'forward' : 'back', ticks = Math.max(1, Math.min(6, Math.round(Math.abs(along) / 0.045)))
        F.bot.setControlState('sneak', true)
        for (let k = 0; k < ticks; k++) await tick(() => { F.bot.setControlState(key, true); if (o.during) o.during(-1) })
        F.bot.setControlState(key, false)
        for (let k = 0; k < 4; k++) await tick(() => { if (o.during) o.during(-1) })
        F.bot.setControlState('sneak', false)
        ctx.mark('friend_shuffle', { key, ticks })
      }
      const p = F.pos(), d = Math.hypot(w.x - p.x, w.z - p.z)
      ctx.log(`trap: ${FRIEND} stopped ${d.toFixed(2)} from (${pts[pts.length - 1].join(', ')}) at ${(p.x - O.x).toFixed(3)} ${(p.z - O.z).toFixed(3)}`)
      if (d > tol) throw new Error(`trap: ${FRIEND} stopped ${d.toFixed(2)} blocks from his mark (tolerance ${tol})`)
      return d
    },
    async lookAt (x, y, z, ticks = 10) {
      const t = V(x, y, z)
      for (let k = 0; k < ticks; k++) {
        await tick(() => {
          const e = F.bot.entity, eye = e.position.offset(0, 1.62, 0)
          const dx = t.x - eye.x, dy = t.y - eye.y, dz = t.z - eye.z
          F._turn(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)))
        })
      }
    },
    // a real right-click from his own client (his look is already on it: F.lookAt first, so nothing snaps)
    async open (x, y, z) {
      const b = F.bot.blockAt(V(x, y, z))
      if (!b) throw new Error(`trap: ${FRIEND} sees no block at ${x} ${y} ${z}`)
      ctx.mark('friend_open', { x, y, z, block: b.name })
      F.bot.swingArm('right')
      return F.bot.openContainer(b)   // motion-ok: the friend's own click, his look eased onto it first (F.lookAt)
    },
    async waitFall (o = {}) {
      const y0 = F.pos().y
      let fell = false
      for (let k = 0; k < (o.max ?? 40); k++) {
        await tick(o.during)
        const y = F.pos().y
        if (y0 - y > (o.minDrop ?? 1.5) && F.bot.entity.onGround) { fell = true; break }
      }
      ctx.log(`trap: ${FRIEND} fell ${(y0 - F.pos().y).toFixed(2)} blocks (landed: ${fell})`)
      return fell
    }
  }
  return T
}

module.exports = { makeStunt, trapEdit, helpers }
