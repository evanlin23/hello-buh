// The "secret herobrine" format (family `herobrine`; docs/formats.md, STANDARDS r:r047388): a PvP fight with an
// ordinary-looking player in the default Steve skin whose "lag" (freezes, rubber-banding, hits that don't register,
// standing on nothing) grows until the reveal that it never was lag: the white eyes, then he drifts off and leaves.
// The caption plays it as a normal complaint. Each episode swaps the arena and the lag script; this module is what
// stays the same:
//   arena(b)        the void arena: a 1-wide wool bridge (ours blue, his red) between two small sky islands, high over
//                   a world whose ground is not drawn (stunt.hideBoxes: a void map, as bridge-fight servers use)
//   makeStunt(ep)   a stunt module: the arena, the cast (one extra player bot, `ep.name`-less username HEROBRINE, in
//                   creative so hits don't register and he never falls, his own physics off: he is /tp'd every tick
//                   by the story kit's actor loop), the hotbar, then ep.perform(ctx, H); and the edit every episode
//                   shares (caption, a dip + flash + punch on the payoff, the end 1.0 s after it: pace's payoff rule)
// The camera player stays 56e (r:re5019b). The white eyes are the jar's Steve with its eye pixels painted white in
// memory by the renderer (skin 'steve+white_eyes', renderer/entities.js whiteEyesTexture): no third-party skin.
// Local frame: the bridge runs along +z at x 0, its top at y 0 (feet y 1). We stand at (0.5, 1, 0.5) facing +z
// (Minecraft yaw 0; his yaw 180 faces us); our wool is z -2..8, his z 9..19; our island z -9..-3, his z 20..26.
// H, in perform:
//   H.K, H.A            the story kit (sway, eased looks) and lib/act.js on it (every hit and break aimed)
//   H.at(x, y, z)       a local point -> world Vec3
//   H.hb                his actor state (local x, y (feet), z, yaw, pitch in degrees, the kit's convention)
//   H.hold(ticks)       keep the camera alive (the kit's sway); his state is sent every tick
//   H.walk(to, ticks)   move him to a local { x, y, z, yaw, pitch } in a straight, even line over `ticks` (a real walk)
//   H.freeze(ticks)     lag: no update at all (he stops mid-step, the limbs stop), the camera keeps going
//   H.snap(to)          lag: the catch-up jump (the client glides it in 3 ticks, as vanilla interpolates a
//                       late position packet); under 1.7 blocks so it reads as a rubber band, not a teleport
//   H.turn(yaw, ticks, pitch)  turn his head and body (eased)
//   H.swing()           his arm swing (an attack at nothing, a placement)
//   H.hit(o)            our sword swing at him (A.hit): the crosshair on him first; creative: no damage, no knockback
//   H.whiteEyes()       from this tick his skin is 'steve+white_eyes' (do it while his face is turned away)
//   H.chat(text)        our own chat line: '<56e> text'
//   H.leave()           he quits: 'HEROBRINE left the game' (the logout vanish the owner gate allows), the payoff
const { storyKit } = require('./story')
const M = require('./movie')
const act = require('./act')

const HEROBRINE = 'Herobrine'
const TAG = 'hb_lagger'
const F_Y = 160              // the bridge's top: high over the (hidden) ground, under the cloud layer (192)
const RECORD_R = 48
const START = [0.5, 1, 0.5]
const SKIN = 'steve'
const EYES = 'steve+white_eyes'

// the arena as /fill commands (local -> world by the caller): small, so plain fills are fine
function arena () {
  const out = []
  const f = (x0, y0, z0, x1, y1, z1, b) => out.push([x0, y0, z0, x1, y1, z1, b])
  // our island (z -9..-3): grass over dirt, a skirt of dirt hanging under it, a blue wool hut corner
  f(-3, -3, -9, 3, -1, -3, 'dirt'); f(-2, -4, -8, 2, -4, -4, 'dirt'); f(-1, -5, -7, 1, -5, -5, 'dirt')
  f(-3, 0, -9, 3, 0, -3, 'grass_block')
  f(-3, 1, -9, -2, 3, -9, 'blue_wool'); f(-3, 1, -8, -3, 3, -7, 'blue_wool'); f(3, 1, -9, 3, 1, -8, 'blue_wool')
  // the bridge: ours blue to z 8, his red from z 9 to his island
  f(0, 0, -2, 0, 0, 8, 'blue_wool')
  f(0, 0, 9, 0, 0, 19, 'red_wool')
  // his island (z 20..26): the same shape, a red bed and a red wool wall
  f(-3, -3, 20, 3, -1, 26, 'dirt'); f(-2, -4, 21, 2, -4, 25, 'dirt'); f(-1, -5, 22, 1, -5, 24, 'dirt')
  f(-3, 0, 20, 3, 0, 26, 'grass_block')
  f(-3, 1, 26, 3, 2, 26, 'red_wool'); f(3, 1, 23, 3, 2, 25, 'red_wool')
  return out
}

// the edit every episode shares. subs: [mark, text, secs] per episode
function herobrineEdit ({ caption, red, subs = [], extra = {} }) {
  const sfx = [['dip', 'payoff', 0.4]]
  return {
    caption, red, startAt: 'go:-0.05', endAfter: 'payoff:1.0', dropAt: 'payoff',
    subs, flash: [['payoff', 0, 0.35]], punch: [['reveal', 0, 1.12], ['payoff', 0, 1.06]],
    sfx, ...extra, ...(extra.sfx ? { sfx: [...sfx, ...extra.sfx] } : {})
  }
}

// ep: { name, caption, red, subs, time, hotbar, select, perform(ctx, H) -> ok, edit (extra) }
function makeStunt (ep) {
  return {
    name: ep.name,
    biome: process.env.BIOME || ep.biome || 'minecraft:plains',
    caption: ep.caption,
    time: ep.time ?? 6000,
    hideHand: false,
    settle: false,           // the payoff is a logout, not a blast or a fall: nothing to wait for
    cast: { [HEROBRINE]: SKIN },
    recordRadius: RECORD_R,
    renderDistance: 6,
    // a void map: nothing under the islands is drawn (the ground 90 blocks down, inside the recorded radius)
    hideBoxes: [[-RECORD_R - 16, -F_Y - 70, -RECORD_R - 16, RECORD_R + 16, -6, RECORD_R + 16]],
    // ep.fovZoom: render.js's sharp push-in (a narrower FOV between two marks), e.g. onto his face at the reveal
    ...(ep.fovZoom ? { fovZoom: ep.fovZoom } : {}),
    edit: herobrineEdit({ caption: ep.caption, red: ep.red, subs: ep.subs, extra: ep.edit || {} }),
    async setup (ctx) {
      const { bot } = ctx
      await ctx.defaultRules()
      await ctx.cmd('/gamerule random_tick_speed 0')
      await ctx.cmd('/gamerule show_death_messages false')
      await ctx.cmd('/gamerule block_drops false')   // a sheared wool block drops nothing to float in the void
      await ctx.cmd('/difficulty peaceful')
      const p = bot.entity.position
      const O = this.O = { x: Math.floor(p.x), y: F_Y, z: Math.floor(p.z) }
      await ctx.cmd(`/forceload add ${O.x - 16} ${O.z - 16} ${O.x + 16} ${O.z + 32}`)
      await ctx.waitChunks({ x0: O.x - 16, z0: O.z - 16, x1: O.x + 16, z1: O.z + 32 })
      await ctx.cmd(`/fill ${O.x - 6} ${F_Y - 6} ${O.z - 12} ${O.x + 6} ${F_Y + 12} ${O.z + 30} air`)
      for (const [x0, y0, z0, x1, y1, z1, b] of arena()) await ctx.cmd(`/fill ${O.x + x0} ${F_Y + y0} ${O.z + z0} ${O.x + x1} ${F_Y + y1} ${O.z + z1} ${b}`)
      await ctx.cmd(`/setblock ${O.x + 1} ${F_Y + 1} ${O.z + 23} red_bed[facing=north,part=head]`)
      await ctx.cmd(`/setblock ${O.x + 1} ${F_Y + 1} ${O.z + 22} red_bed[facing=north,part=foot]`)
      await ctx.cmd('/kill @e[type=!player]')
      // the cast: one more player, in creative (a creative player takes no hit and no knockback, and may hover:
      // the server never kicks him for flying), his own physics off (he goes where the /tp puts him)
      const cast = await M.spawnActors(ctx, [HEROBRINE])
      const hb = this.hbBot = cast[HEROBRINE]
      hb.physicsEnabled = false
      await ctx.cmd(`/gamemode creative ${HEROBRINE}`)
      await ctx.cmd(`/tag ${HEROBRINE} add ${TAG}`)
      await ctx.cmd(`/item replace entity ${HEROBRINE} weapon.mainhand with ${ep.hisItem || 'red_wool 64'}`)
      const s0 = ep.hisStart || { x: 0.5, y: 1, z: 4.5, yaw: 180, pitch: 0 }
      await M.place(ctx, HEROBRINE, O.x + s0.x, F_Y + s0.y, O.z + s0.z, s0.yaw, s0.pitch)
      await ctx.hotbar(ep.hotbar || ['stone_sword', 'shears', ['blue_wool', 48]])
      await ctx.tpCheck(O.x + START[0], F_Y + START[1], O.z + START[2], 0, ep.pitch ?? 6)   // facing +z (Minecraft yaw 0: south)
      await ctx.cmd('/gamemode survival')
      ctx.select(ep.select ?? 0)
      await bot.waitForTicks(30)
      return { x: O.x, y: F_Y, z: O.z }
    },
    async perform (ctx) {
      const O = this.O
      const K = storyKit(ctx, { line: () => ({ dur: 0, gap: 0 }), gap: 0 }, { X: O.x, Z: O.z, F: O.y }, { warm: null })
      K.base = { yaw: ctx.bot.entity.yaw, pitch: ctx.bot.entity.pitch }
      K.sway = ep.sway ?? 0.35   // a steady PvP hand; the kit's full sway (+-5.7 deg of yaw) kept act.js's aim off a player 3 blocks away
      const H = helpers(ctx, O, K, this.hbBot, ep.hisStart || { x: 0.5, y: 1, z: 4.5, yaw: 180, pitch: 0 })
      try { return await ep.perform(ctx, H) } finally { if (!H._left) H.stop() }
    }
  }
}

function helpers (ctx, O, K, hbBot, s0) {
  const { bot } = ctx
  const A = act(ctx, { K })
  const V = (x, y, z) => new ctx.Vec3(O.x + x, O.y + y, O.z + z)
  const hb = K.actor(TAG, { ...s0 }, { sync: false })
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  const wrapDeg = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a }
  let frozen = false
  const H = {
    O, K, A, at: V, hb, bot: hbBot,
    entity: () => { const p = bot.players[HEROBRINE]; return p && p.entity },
    tick: async (fn) => { if (fn) fn(); K.look(0); await bot.waitForTicks(1); K._clock++ },
    async hold (ticks) { for (let k = 0; k < ticks; k++) await H.tick() },
    async walk (to, ticks) {
      const a = { x: hb.x, y: hb.y, z: hb.z, yaw: hb.yaw, pitch: hb.pitch }
      for (let k = 1; k <= ticks; k++) {
        const t = k / ticks
        await H.tick(() => {
          const px = hb.x, pz = hb.z
          for (const c of ['x', 'y', 'z']) if (to[c] !== undefined) hb[c] = a[c] + (to[c] - a[c]) * t
          H._stepped(Math.hypot(hb.x - px, hb.z - pz))
          if (to.yaw !== undefined) hb.yaw = a.yaw + wrapDeg(to.yaw - a.yaw) * ease(t)
          if (to.pitch !== undefined) hb.pitch = a.pitch + (to.pitch - a.pitch) * ease(t)
        })
      }
    },
    // lag: his updates stop. The kit sends the same spot every tick (the server has nothing new to send), so on the
    // client he stops dead mid-step; marked for the review ('lag' { kind, ticks })
    async freeze (ticks) {
      ctx.mark('lag', { kind: 'freeze', ticks })
      frozen = true
      try { await H.hold(ticks) } finally { frozen = false }
    },
    async snap (to) {
      const d = Math.hypot((to.x ?? hb.x) - hb.x, (to.y ?? hb.y) - hb.y, (to.z ?? hb.z) - hb.z)
      if (d > 1.7) throw new Error(`herobrine: a lag snap of ${d.toFixed(2)} blocks reads as a teleport (keep it under 1.7: a rubber band)`)
      ctx.mark('lag', { kind: 'snap', blocks: +d.toFixed(2) })
      Object.assign(hb, to)
      hb._warp = true
      await H.tick()
    },
    // his footsteps on the bridge (vanilla: a step sound every 1/0.6 blocks walked on the ground; the client plays
    // other players' steps itself, so the recording has no sound for them)
    _walked: 0.6,
    _stepped (d) {
      H._walked += d * 0.6
      if (H._walked < 1 || hb.y > 1.01) return
      H._walked = 0
      const under = bot.blockAt(V(hb.x, 0, hb.z))
      if (under && under.name !== 'air') ctx.sound(`block.${ctx.soundGroup(under.name)}.step`, 0.15, 1, { x: O.x + hb.x, y: O.y + 1, z: O.z + hb.z })
    },
    // break a bridge block (A.dig, aimed), with the digging sounds the client makes (hit every 4 ticks, the break)
    async breakBlock (rel, o = {}) {
      const blk = bot.blockAt(V(...rel))
      const grp = ctx.soundGroup(blk.name)
      let on = true, k = 0
      const stop = K.every(() => { if (on && bot.targetDigBlock && k++ % 4 === 0) ctx.sound(`block.${grp}.hit`, 0.25, 0.5) })
      // vanilla: shears on wool are 5x (hardness 0.8: 5 ticks); mineflayer's dig time doesn't know shears and took 24
      const held = bot.heldItem && bot.heldItem.name
      const ms = o.ms ?? (held === 'shears' && /_wool$/.test(blk.name) ? 250 : undefined)
      // a steady hand while mining: K.dig's point can sit near the face's edge, and the sway tipped the crosshair onto
      // the block in front (the sight check)
      const sway = K.sway; K.sway = 0
      try { await A.dig(blk, { ...o, ...(ms !== undefined ? { ms } : {}) }) } finally { on = false; stop(); K.sway = sway }
      ctx.sound(`block.${grp}.break`, 1, 0.8)
      ctx.mark('broke', { at: rel })
    },
    async turn (yaw, ticks, pitch) { await H.walk({ yaw, ...(pitch !== undefined ? { pitch } : {}) }, ticks) },
    swing () { if (hbBot && hbBot.entity) hbBot.swingArm('right') },
    async hit (o = {}) {
      const e = H.entity()
      if (!e) throw new Error('herobrine: he is not in view')
      await A.hit(e, { max: 20, ...o })
      // a creative player takes no damage: no red flash, no knockback, the no-damage swoosh (Player.attack)
      ctx.sound('entity.player.attack.nodamage', 1, 1)
      ctx.mark('hit_him')
    },
    whiteEyes (o = {}) {
      ctx.mark('cast_skin', { user: HEROBRINE, skin: EYES })
      if (o.emptyHand !== false) ctx.cmd(`/item replace entity ${HEROBRINE} weapon.mainhand with air`)
    },
    // a slow look (eased, `ticks` long) to a local point: the camera after he is gone
    async drift (x, y, z, ticks) {
      const e = bot.entity.position.offset(0, K.eyeNow(), 0), p = V(x, y, z)
      const want = { yaw: Math.atan2(-(p.x - e.x), -(p.z - e.z)), pitch: Math.atan2(p.y - e.y, Math.hypot(p.x - e.x, p.z - e.z)) }
      const a = { ...K.base }
      let dy = want.yaw - a.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      for (let k = 1; k <= ticks; k++) {
        const t = ease(k / ticks)
        K.base = { yaw: a.yaw + dy * t, pitch: a.pitch + (want.pitch - a.pitch) * t }
        await H.tick()
      }
    },
    chat (text) { ctx.mark('syschat', { text: `<${bot.username}> ${text}` }) },
    stop () { K.actors.delete(TAG) },
    async leave () {
      H.stop(); H._left = true
      ctx.mark('syschat', { text: `${HEROBRINE} left the game`, color: 'yellow' })
      ctx.mark('payoff')
      try { hbBot.quit() } catch (e) {}
      await H.hold(1)
    },
    get frozen () { return frozen }
  }
  return H
}

module.exports = { arena, herobrineEdit, makeStunt, HEROBRINE, TAG, F_Y, START, SKIN, EYES }
