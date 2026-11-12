// The "cooked" format (family `cooked`; docs/formats.md, STANDARDS r:r5ee125, r:r12cb71): the player does something
// impossible, the screen goes dark as the music cuts out, and on the drop the chat floods with "X joined the game"
// (the people who'd come for you, escalating) over the war-movie soldier meme photo. The music timing IS the joke
// (owner: "this is music speciifc too"), so the format pins one NCS track and times everything on it:
//   dark   the feat lands (the bedrock breaks...): the view fades to black; the track goes quiet
//   flood  the track's drop: the meme photo fills the view and the first "X joined the game" line appears
//   joins  one line a beat, then twice a beat (the flood speeds up), the last one alone a beat later
//   cooked the last join (the punchline): a punch-in on the photo, a game hit (thunder), the end 0.9 s later
// Each episode swaps the feat (ep.build: the set; ep.feat: the impossible act, which must ctx.mark('dark') at the
// moment it lands) and the guest list; this module does the rest: the flood's timing, the edit (still + chat + the
// pinned track's drop on 'flood'), the shared setup.
//   makeStunt(ep)  ep: { name, caption, red, subs, joins: [names, last = the punchline], build(ctx, H), feat(ctx, H),
//                        start: [x, y, z, yawDeg, pitchDeg] (local), hotbar, select, brightness, edit (extra keys),
//                        track (an NCS file in TRACKS), meme (lib/memes.json key) }
// H (in build/feat): H.O the local origin (world block), H.at(x, y, z) -> Vec3, H.A(x, y, z) -> "x y z", H.cmd,
//   H.act (lib/act.js), H.hold(ticks)
const act = require('./act')

// the pinned tracks: where the drop is (scripts/song_drop.py), how long the quiet before it lasts (the dark), the beat
// (onset autocorrelation after the drop). The cooked drop must be OMINOUS (owner r:rcefdcc, on cooked_bedrock's upbeat
// bed: "need to have the ominous music"): a dark track that builds dread, never an upbeat one.
//   executioner (DJ FKU, NCS phonk, ncs.io mood Dark; the default): 7 s of dark build at -13 dB, then the drop at 7.0 s
//     (+11 dB), 160 bpm. It has no quiet of its own: dip makes it (the bed ducked to -24 dB for `quiet` s before the
//     flood), and loop repeats one bar of its build (edit.songLoop, scripts/add_song.py) until its early drop lands on the
//     flood, so the track plays from frame 0 (owner 2026-11-12 on cooked_bedrock v3: "why does the music start late?";
//     the old edit.songLate started it 1.25 s in, after silence)
//   industry_kiss (an upbeat funk, the first cut; owner: not ominous): 1.5 s of near silence before its drop at 39.75 s
const TRACKS = {
  // (bar: its build's accents fall at 1.0, 3.0, 5.0 and 7.0 s, a 2.0 s bar: the loop repeats 1.0-3.0 s; a 1.5 s "bar" from
  // the flood's 0.375 s beat dropped a beat at the seam, fix-check 2026-11-12. The flood keeps its recorded 0.375 s.)
  // (quiet 0.7: owner 2026-11-12 on cooked_bedrock v4, "I think it falls ot black for too long": v4's 1.5 s gave ~1.2 s of
  // black; 0.7 s leaves ~0.4 s, a beat to see the hole and hear the silence before the drop)
  'executioner.mp3': { drop: 7.0, quiet: 0.7, beat: 0.375, bar: 2.0, dip: true, loop: true },
  'industry_kiss.mp3': { drop: 39.75, quiet: 1.5, beat: 0.39 }
}
// the flood's rhythm in beats from the drop: 4 on the beat, 5 on the half beat, the punchline a beat after the rest
const RHYTHM = [0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6.5]

function floodTicks (track, n = RHYTHM.length) {
  const t = TRACKS[track]
  if (!t) throw new Error(`cooked: no timing for track ${track} (lib/cooked.js TRACKS)`)
  const r = RHYTHM.slice(0, n - 1).concat([RHYTHM[n - 2] + 1])
  return r.map(b => Math.round(b * t.beat * 20))
}

function cookedEdit ({ caption, red, subs = [], track, meme = 'war_soldier', extra = {} }) {
  const t = TRACKS[track]
  if (!t) throw new Error(`cooked: no timing for track ${track} (lib/cooked.js TRACKS)`)
  const sfx = [['dip', 'cooked', 0.4], ['impact', 'cooked']]
  if (t.dip) sfx.unshift(['dip', 'flood', t.quiet])   // the silence on the black, the drop un-ducked on the flood
  return {
    caption, red,
    startAt: 'go:-0.05',
    endAfter: 'cooked:0.9',                     // (a held still past 1.0 s blocks in rec_check)
    dropAt: 'flood', ncs: track,                 // add_song.py: this track (edit.ncs), its drop on the flood
    ...(t.loop ? { songLoop: t.bar || 4 * t.beat } : {}),   // (a drop earlier in the track than the flood: a bar of the build repeats)
    still: { at: 'flood', dark: 'dark:0.35', meme,   // (the black 0.35 s after the break: the hole and the drop show; review r1)
      punch: ['cooked', 1.12], dim: 0.12, fade: 0.25 },
    chatScale: 4,                                // vanilla's bottom-left chat, phone-readable
    subs,
    ...extra,
    sfx: [...sfx, ...(extra.sfx || [])]
  }
}

function makeStunt (ep) {
  const track = ep.track || 'executioner.mp3'
  const joins = ep.joins
  if (!joins || joins.length < 3 || joins.length > RHYTHM.length) throw new Error(`cooked: 3-${RHYTHM.length} joins (vanilla's closed chat shows 10 lines)`)
  return {
    name: ep.name,
    family: 'cooked',
    biome: process.env.BIOME || ep.biome || 'minecraft:plains',
    caption: ep.caption,
    time: ep.time ?? 6000,
    brightness: ep.brightness ?? 1,
    edit: cookedEdit({ caption: ep.caption, red: ep.red, subs: ep.subs, track, meme: ep.meme, extra: ep.edit || {} }),

    async setup (ctx) {
      const { bot } = ctx
      await ctx.defaultRules()
      for (const c of ['/gamerule random_tick_speed 0', '/gamerule fall_damage false', '/gamerule keep_inventory true', '/difficulty peaceful']) await ctx.cmd(c)
      await ctx.cmd('/kill @e[type=!player]', { mayFail: true })
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z) || sp
      this.O = { x: g.x, y: ep.depth ?? -40, z: g.z }
      const H = this.H = helpers(ctx, this.O)
      await ep.build(ctx, H)
      await ctx.cmd('/kill @e[type=item]', { mayFail: true })
      await ctx.hotbar(ep.hotbar || ['diamond_pickaxe'])
      const [x, y, z, yaw, pitch] = ep.start
      const s = H.at(x, y, z)
      await ctx.tpCheck(s.x, s.y, s.z, yaw, pitch)
      await ctx.cmd('/gamemode survival')
      ctx.select(ep.select ?? 0)
      await bot.waitForTicks(30)
      return { x: s.x, y: s.y, z: s.z }
    },

    async perform (ctx) {
      const { bot } = ctx
      const H = this.H
      H.act = act(ctx)
      ctx.mark('go')
      await ep.feat(ctx, H)
      // the quiet before the drop: the view is black (the edit), the track has gone silent
      await bot.waitForTicks(Math.round(TRACKS[track].quiet * 20))
      ctx.mark('flood')
      const ticks = floodTicks(track, joins.length)
      let k0 = 0
      for (let i = 0; i < joins.length; i++) {
        if (ticks[i] > k0) { await bot.waitForTicks(ticks[i] - k0); k0 = ticks[i] }
        ctx.mark('syschat', { text: `${joins[i]} joined the game`, color: 'yellow' })
        ctx.mark('join', { n: i, who: joins[i] })
        if (i === joins.length - 1) {
          ctx.mark('cooked')
          ctx.vanillaSound(ep.hitSound || 'entity.lightning_bolt.thunder', 1)
        }
      }
      await bot.waitForTicks(40)   // the recording runs past the end (cooked + 1.0 s)
      return true
    }
  }
}

function helpers (ctx, O) {
  const V = (x, y, z) => new ctx.Vec3(O.x + x, O.y + y, O.z + z)
  return {
    O,
    at: V,
    A: (x, y, z) => `${O.x + x} ${O.y + y} ${O.z + z}`,
    cmd: (s, o) => ctx.cmd(s, o),
    hold: async (ticks) => { await ctx.bot.waitForTicks(ticks) }
  }
}

module.exports = { makeStunt, cookedEdit, floodTicks, TRACKS, RHYTHM }
