// The "faketrick" format (family `faketrick`; docs/formats.md, STANDARDS r:rfcab11): an impossible "secret trick"
// played completely straight, as a tutorial ("step 1 ... step 2 ... it works"). The fake is the comment bait. The
// trick alone is exempt from the vanilla rule: every visible action is a real, aimed player action through
// lib/act.js (r:rffba12), and only the impossible RESULT is staged with commands (F.fake), on the tick the action
// that "causes" it lands. Everything around the trick (the set, the sounds, the HUD, the hand) is vanilla.
// Each episode swaps the trick; this module is the part that stays the same:
//   makeStunt(ep)   a stunt module: finds a flat, dry site with trees round it, grades a grass pad (local frame:
//                   the pad's centre block is (0, 0, 0), floor y 0, feet y 1; mineflayer yaw 0 looks north, -z),
//                   runs ep.build(ctx, F) (commands: the pre-built part of the trick), the hotbar, puts the player at
//                   ep.start, then ep.perform(ctx, F); and the edit every episode shares (below).
//   trickEdit(o)    the caption from frame 0, a "step n" sub + pop on each step, the payoff: a dip, an impact, a
//                   flash and a punch, the drop of the NCS bed on it, the end 1.2 s after it (a text payoff: the sub).
// F, in build and perform:
//   F.at(x, y, z)          a local point -> world Vec3        F.A(x, y, z)   the same as a command's "x y z"
//   F.act                  lib/act.js (aimed place / use / click / turnTo / back)
//   F.place(x, y, z, o)    put the held block there (aimed; o.against)
//   F.click(x, y, z, face) a right-click on that face of the block (aimed): flint and steel on a top face, ...
//   F.look(x, y, z, o)     a governed look at a local point (no action), o.hold ticks resting on it
//   F.step(n)              the nth tutorial step starts (its sub and a pop)
//   F.fake(cmds)           the impossible part: commands run on this tick, marked 'fake' (the review knows)
//   F.payoff()             the payoff mark
//   F.portal(box)          the portal's ambient particles and hum, every few ticks, until F.stop()
const sets = require('./sets')
const act = require('./act')

// the shared edit. steps: the subs, one per step ('step 1: gold blocks'); payoff: the payoff's sub
function trickEdit ({ caption, red, steps = [], payoff = null, extra = {} }) {
  const subs = steps.map((t, i) => ['step', t, 1.5, i])
  if (payoff) subs.push(['payoff', payoff, 1.2, 0])
  const sfx = [['pop', 'go', { gain: 0.5 }], ['air', 'go', 'payoff', { gain: 0.1 }]]   // a sound by 0.3 s (pace's audio hook)
  for (let i = 0; i < steps.length; i++) sfx.push(['pop', 'step', { nth: i, gain: 0.45 }])
  sfx.push(['dip', 'payoff', 0.4], ['impact', 'payoff'])
  const e = {
    caption, red, startAt: 'go:-0.05', endAfter: 'payoff:1.2', dropAt: 'payoff',   // settle-ok: nothing falls or blows up; the payoff is a sub (1.2 s to read it)
    subs, flash: [['payoff', 0, 0.45]], punch: [['payoff', 0, 1.08]], sfx
  }
  return { ...e, ...extra, ...(extra.sfx ? { sfx: [...sfx, ...extra.sfx] } : {}), ...(extra.subs ? { subs: [...subs, ...extra.subs] } : {}) }
}

// ep: { name, caption, red, steps, payoffSub, pad (half width, 7), build(ctx, F), hotbar, select, start: [x, y, z,
// yawDeg, pitchDeg], reach (block interaction range), perform(ctx, F) -> ok, time, biome, edit (extra) }
function makeStunt (ep) {
  return {
    name: ep.name,
    biome: process.env.BIOME || ep.biome || 'minecraft:plains',
    caption: ep.caption,
    time: ep.time ?? 6000,
    hideHand: false,
    edit: trickEdit({ caption: ep.caption, red: ep.red, steps: ep.steps, payoff: ep.payoffSub, extra: ep.edit || {} }),

    async setup (ctx) {
      const { bot } = ctx
      await ctx.defaultRules()
      for (const c of ['/gamerule random_tick_speed 0', '/gamerule fire_spread_radius_around_player 0', '/difficulty peaceful',
        '/gamerule keep_inventory true', '/gamerule block_drops false', '/gamerule allow_entering_nether_using_portals false', '/kill @e[type=!player]']) await ctx.cmd(c, { mayFail: true })
      const R = ep.pad ?? 7
      const site = await sets.findSite(ctx, { w: 2 * R + 6, d: 2 * R + 6, maxRange: 2, maxTrees: 0.1 })
      const p = bot.entity.position.floored()
      const cx = site ? site.x : p.x, cz = site ? site.z : p.z
      await ctx.forceload({ x0: cx - R - 24, z0: cz - R - 24, x1: cx + R + 24, z1: cz + R + 24 })
      const g = ctx.surface(cx, cz)
      if (!g) throw new Error('faketrick: no ground at the site')
      const O = this.O = { x: cx, y: site ? site.y : g.position.y, z: cz }
      // the pad: real terrain round it, graded flat (dirt under grass), clear of trees and plants above
      await ctx.cmd(`/fill ${O.x - R} ${O.y + 1} ${O.z - R} ${O.x + R} ${O.y + 14} ${O.z + R} air`)
      await ctx.cmd(`/fill ${O.x - R} ${O.y - 3} ${O.z - R} ${O.x + R} ${O.y - 1} ${O.z + R} dirt`)
      await ctx.cmd(`/fill ${O.x - R} ${O.y} ${O.z - R} ${O.x + R} ${O.y} ${O.z + R} grass_block`)
      const F = this.F = helpers(ctx, O)
      if (ep.build) await ep.build(ctx, F)
      await ctx.cmd('/kill @e[type=item]')
      await ctx.cmd(`/attribute @s minecraft:block_interaction_range base set ${ep.reach ?? 6}`)
      await ctx.hotbar(ep.hotbar)
      const [x, y, z, yaw, pitch] = ep.start
      const s = F.at(x, y, z)
      await ctx.tpCheck(+s.x.toFixed(2), s.y, +s.z.toFixed(2), yaw, pitch)
      await ctx.cmd('/gamemode survival')
      ctx.select(ep.select ?? 0)
      await bot.waitForTicks(20)
      return { x: O.x, y: O.y, z: O.z }
    },

    async perform (ctx) {
      const F = this.F
      F.act = act(ctx)
      try { return await ep.perform(ctx, F) } finally { F.stop() }
    }
  }
}

function helpers (ctx, O) {
  const { bot } = ctx
  const V = (x, y, z) => new ctx.Vec3(O.x + x, O.y + y, O.z + z)
  let steps = 0, ambient = null
  const F = {
    O,
    at: V,
    A: (x, y, z) => `${O.x + x} ${O.y + y} ${O.z + z}`,
    cmd: (s, o) => ctx.cmd(s, o),
    // put the held block there, then wait (up to 8 ticks) for the server to have it: the next place goes against it
    place: async (x, y, z, o = {}) => {
      await F.act.place(V(x, y, z), { ...o, ...(o.against ? { against: V(...o.against) } : {}) })
      for (let k = 0; k < 8; k++) { const b = bot.blockAt(V(x, y, z)); if (b && b.boundingBox === 'block') return true; await bot.waitForTicks(1) }
      throw new Error(`faketrick: the block at ${x} ${y} ${z} never appeared`)
    },
    click: (x, y, z, face = 1, o = {}) => {
      const n = [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]][face]
      const cur = [0.5 + n[0] * 0.5, 0.5 + n[1] * 0.5, 0.5 + n[2] * 0.5]
      return F.act.click(V(x, y, z), face, cur, { swing: true, max: 40, ...o })
    },
    look: (x, y, z, o = {}) => F.act.turnTo(V(x, y, z), o),
    step: () => { ctx.mark('step', { n: steps++ }); return steps },
    fake: async (cmds, info = {}) => { ctx.mark('fake', info); for (const c of [].concat(cmds)) await ctx.cmd(c) },
    payoff: () => ctx.mark('payoff'),
    // a lit portal's look and sound (NetherPortalBlock.animateTick: particles every tick, the hum 1 in 100):
    // box = [x0, y0, x1, y1, z] in local blocks (the portal's inside, inclusive)
    portal: ([x0, y0, x1, y1, z]) => {
      let k = 0
      ambient = () => {
        if (k++ % 3 === 0) ctx.particles('portal', V(x0 + Math.random() * (x1 - x0 + 1), y0 + Math.random() * (y1 - y0 + 1), z + 0.5), { count: 4, face: true })
        if (k % 70 === 1) ctx.sound('block.portal.ambient', 0.45, 0.9 + Math.random() * 0.2)
      }
      bot.on('physicsTick', ambient)
    },
    stop: () => { if (ambient) bot.removeListener('physicsTick', ambient); ambient = null },
    hold: async (ticks) => { for (let k = 0; k < ticks; k++) await bot.waitForTicks(1) }
  }
  return F
}

module.exports = { makeStunt, trickEdit }
