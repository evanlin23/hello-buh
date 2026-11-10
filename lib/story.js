// Narrated story Shorts (docs/stories.md): the narration's timing for a story stunt.
// stories/<name>/voice/voice.json comes from scripts/voice.py: each line's spoken length and its
// caption chunks' start/end (seconds from the start of the line's wav).
//   const S = storyLines('stories/<name>')
//   S.line('L03').dur        seconds of the line's wav
//   S.line('L03').at(4)      tick (from the line's mark) where caption chunk 4 starts
//   S.gap                    seconds of air after each line
//   S.line('L03').gap        the air after this line: S.gap, or 0 inside a continuous take
// Continuous takes (story.json "voice_takes": "beat", docs/voices.md "Continuous takes"; STANDARDS 2b.4): a beat's
// lines are slices of ONE take that the narration plays whole from the beat's first mark. Each line then carries
// `beat` and `offset` (s into the take), `inner` (not the beat's last line: no gap after it) and `last`; K.line times
// every mark from the take's own offsets, so the picture follows the voice.
const fs = require('fs')
const path = require('path')
const MOTION = require('./motion')
const SIGHT = require('./sight')

function storyLines (dir) {
  const vf = path.join(dir, 'voice', 'voice.json')
  if (!fs.existsSync(vf)) throw new Error(`no ${vf}: run scripts/voice.py ${dir} first`)
  return linesFrom(JSON.parse(fs.readFileSync(vf, 'utf8')), JSON.parse(fs.readFileSync(path.join(dir, 'story.json'), 'utf8')), dir)
}

// the same from voice.json and story.json already read (the tests build them by hand)
function linesFrom (v, story, dir = 'the story') {
  const gap = story.gap ?? v.gap ?? 0.08   // owner: "the narrator just yaps on and on" (reference: ~0.1 s after a sentence)
  return {
    gap,
    ids: story.lines.map(l => l.id),
    line (id) {
      const l = v.lines[id]
      if (!l) throw new Error(`line ${id} has no voice: run scripts/voice.py ${dir}`)
      const b = l.beat !== undefined && v.beats ? v.beats[l.beat] : null
      const inner = !!b && b.lines[b.lines.length - 1] !== id
      // the next line of the take: where its first word starts (the next cut lands just before it: K.line)
      const nx = inner ? v.lines[b.lines[b.lines.indexOf(id) + 1]] : null
      const next = nx && nx.offset !== undefined ? { offset: nx.offset, onset: nx.onset ?? (nx.chunks && nx.chunks[0] ? nx.chunks[0][0] : 0) } : null
      const end = l.end ?? (l.chunks && l.chunks.length ? l.chunks[l.chunks.length - 1][1] : l.dur)
      // a take's last line: the next story line, when it opens another take (or is a line of its own), starts with
      // its own lead of silence; the gap is measured word to word, so that lead counts toward it (beatTicks)
      const sid = story.lines.map(x => x.id), nid = sid[sid.indexOf(id) + 1]
      const nl = !inner && nid ? v.lines[nid] : null
      const nextLead = nl && (!nl.beat || (nl.offset ?? 0) === 0) && nl.chunks && nl.chunks[0] ? nl.chunks[0][0] : 0
      return { ...l, gap: inner ? 0 : gap, inner, last: !!b && !inner, next, end, nextLead, at: (k) => Math.round(l.chunks[Math.min(k, l.chunks.length - 1)][0] * 20) }
    }
  }
}

// the voice a recording was staged to: a hash of the story's voice/voice.json (null when there is none). The harness
// stamps it into the recording; ./hb check BLOCKs a recording whose stamp differs from today's voice.json, because its
// cuts and holds were timed to line lengths that no longer exist (Runaway's clean cuts came from recording AFTER the voice).
function voiceStamp (dir) {
  const vf = path.join(dir, 'voice', 'voice.json')
  if (!fs.existsSync(vf)) return null
  return require('crypto').createHash('sha1').update(fs.readFileSync(vf)).digest('hex').slice(0, 12)
}

module.exports = { storyLines, linesFrom, voiceStamp }

// How many ticks a line of a continuous take runs (K.line): the take started at tick beat.t0 (the beat's first
// mark, minus the first marked line's offset when a line was skipped); this line ends where the next line starts in
// the take, or for the beat's last line where the take ends, plus the gap and `extra`. `now` is the tick of this
// line's mark. -> { ticks, beat, late }: late = ticks the mark comes after the voice's own start of the line.
//
// o.cut = { lead, lat } (K.line passes it): an inner line ends early enough that a cut made right after it (taking
// `lat` ticks to land) shows `lead` s before the next line's first word (docs/cinematic.md "Invisible cuts": the
// picture a frame or two ahead of the word, never after it: sound ahead of picture is noticed from ~45 ms). Never
// earlier than this line's own last word (+30 ms) and never later than the next line's start in the take.
const CUT_LEAD = 0.033
function beatTicks (L, now, beat, extra = 0, o = {}) {
  const b = beat && beat.id === L.beat ? beat : { id: L.beat, t0: now - Math.round(L.offset * 20) }
  let end = b.t0 + Math.round((L.offset + L.dur) * 20) + (L.inner ? 0 : Math.round(((L.gap ?? 0) + extra) * 20))
  // a take's last line: the next line's word lands `gap` after this one's last word, not after this file's tail of
  // silence plus the next file's lead (Gold for the Portal: 0.6-0.76 s between takes with a 0.08 gap). Never before
  // this line's own last word (+30 ms: the cut there doesn't clip it). Only when the take's speech end is known.
  if (!L.inner && L.end !== undefined && L.end < L.dur) {
    const tight = b.t0 + Math.round((L.offset + L.end + (L.gap ?? 0) + extra - (L.nextLead || 0)) * 20)
    const floor = b.t0 + Math.ceil((L.offset + L.end + 0.03) * 20)
    end = Math.min(end, Math.max(tight, floor))
  }
  if (o.cut && L.inner && L.next) {
    const want = b.t0 + Math.floor((L.next.offset + L.next.onset - (o.cut.lead ?? CUT_LEAD)) * 20) - (o.cut.lat || 0)
    const floor = b.t0 + Math.ceil((L.offset + (L.end ?? L.dur) + 0.03) * 20)
    end = Math.min(end, Math.max(want, floor))
  }
  return { ticks: Math.max(1, end - now), beat: b, late: now - (b.t0 + Math.round(L.offset * 20)) }
}
module.exports.beatTicks = beatTicks

// The tick (from the line's mark) to START a cut inside a line so the picture lands `lead` s before caption chunk k's
// first word: K.cut/K.shot take `lat` ticks to land (K.cutLat, measured on the last cut). at(k) alone is the word's own
// start, so `if (k === at(i)) await K.cut(...)` landed 100-500 ms AFTER the word (Gold take 1: 6 of 21 cuts split a
// word; Runaway's cuts sat ~220 ms before theirs). Never before the previous chunk's last word has ended (+30 ms):
// a cut must not clip a word either. Scenes get it as at.cut(k).
function cutTick (chunks, k, lead = CUT_LEAD, lat = 0) {
  k = Math.min(k, chunks.length - 1)
  const want = Math.floor((chunks[k][0] - lead) * 20) - lat
  const floor = k > 0 ? Math.ceil((chunks[k - 1][1] + 0.03) * 20) : 0
  return Math.max(0, Math.max(floor, want))
}
module.exports.cutTick = cutTick

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

// Vanilla eye heights (EntityType eyeHeight, blocks over the feet), for K.face: a look at a cast member lands on its eyes
const EYE_H = { player: 1.62, villager: 1.62, wandering_trader: 1.62, witch: 1.62, pillager: 1.62, vindicator: 1.62, evoker: 1.62, illusioner: 1.62,
  zombie: 1.74, husk: 1.74, drowned: 1.74, zombie_villager: 1.74, skeleton: 1.74, stray: 1.74, bogged: 1.74, wither_skeleton: 2.1,
  piglin: 1.79, piglin_brute: 1.79, zombified_piglin: 1.79, creeper: 1.445, enderman: 2.55, iron_golem: 2.29, snow_golem: 1.7, blaze: 1.53,
  wolf: 0.68, cat: 0.35, ocelot: 0.35, fox: 0.4, cow: 1.3, mooshroom: 1.3, sheep: 1.235, pig: 0.765, goat: 1.105, chicken: 0.644, horse: 1.52,
  donkey: 1.425, llama: 1.7765, camel: 2.275, spider: 0.65, allay: 0.36, armor_stand: 1.7775 }
// entities that are never cast (dropped items, orbs, projectiles): K.actor's entity lookup skips them
const DROP_NAMES = new Set(['item', 'experience_orb', 'arrow', 'spectral_arrow', 'trident', 'snowball', 'egg', 'ender_pearl', 'potion', 'splash_potion', 'lingering_potion', 'experience_bottle', 'falling_block', 'firework_rocket'])
const SNEAK_DROP = 0.35   // a crouching player's eye: 1.27, not 1.62 (render.js eases the camera to it, ~3 ticks)
// The look's headroom (owner, 2026-11-10: "when we 'look' at things, it feels we are looking slightly too low"): every
// K.aim / K.cut / K.turnTo aim is raised by this many degrees. Measured on 5 stories (docs/look.md "Where a look lands"):
// first-person looks landed a median 1.9 deg (0.2 blocks) below the subject's eyes, because the hand-picked points sat at
// chests, feet and block centres. K.face / K.top points are exact (no lift). stunt.aimLift sets it (0: off), K.lift too.
const AIM_LIFT = 2

// The per-line machinery every story stunt needs (stunts/_story_template.js shows it all in use):
//   const K = storyKit(ctx, S, { X, Z, F })
//   await K.cut(dx, dz, K.P(dx, dy, dz))       teleport (a cut in the renderer), arriving already aimed
//   await K.cut(dx, dz, target, 1, { time: 18000 })   ...and the time of day changes on the cut's own frame
//   await K.cutTo(dx, y, dz, target)           the same with an absolute feet y (a cut on the spot, a pillar)
//   await K.line('L03', (k, at, n) => {...})    mark the line, run the scene every tick for dur + gap (n ticks)
//   await K.preroll(10, (k) => {...})          motion that must already be moving on the line's first frame
//   K.look(k, dyaw, dpitch)                     aim + a slow sway (no shot is ever still)
//   K.turnTo(from, p, u)                        an eased turn toward a point, u 0..1
//   K.face(feet, 'villager') / K.face(entity)  the point to look at for a cast member: its eyes (exact, no lift)
//   K.top(x, y, z)                              a block's visible face (its top when it's below the eye), exact
//   every aim (K.aim, K.cut, K.turnTo) is lifted K.lift degrees (2; stunt.aimLift; 0 or { lift: 0 } per cut: off)
//   K.flee(tag, speed)                          a tagged group steps away from the camera, facing away
//   K.actor(tag, {x, z, yaw}) / K.step / K.bury a mob /tp'd every tick from a state object you edit (20 Hz on the client)
//   await K.cutShot(name, () => {...moves}, { time })   a camera cut with the cast placed for it: the shot mark waits
//                                               until every moved actor is on its mark (never a stunt's own /tp @e)
//   K.park(tag)                                 a cast member out of shot: in the air off the set (never in stone)
//   K.tp(tag, dx, dy, dz, yaw, pitch)           one /tp of a tagged mob, set-relative
//   K.go(on) / K.ctl(key, on) / K.stop()        movement keys
//   K.setTime(n)  K.setMeter(v)  K.groan()      time of day, the edit's rule meter, a zombie's groan
//   K.knockback(() => attackerPos)              apply vanilla knockback to hits (mineflayer drops it)
//   await K.dig(block)                          dig at vanilla speed (mineflayer's digTime is off on 1.21.11), after
//                                               the aim glides onto it and vanilla's 5-tick destroyDelay
//   await K.aimAt(p) / K.aimAt(blockPos, { block: true })   turn and wait until the turn has landed
//   await K.place(pos, 'jukebox')               turn onto the spot, 4-tick use delay, swing, set it, its sound
//   K.dig / K.place aim at a point the eye can see (lib/sight.js: the face toward the eye first; a place, the clicked
//   face of a block it can go against). Nothing visible from where the bot stands: they throw, naming the block, what
//   is in the way and a spot that sees it (or { walk: true } walks there first). STANDARDS 3b.4
//   const w = await K.open(pos) ... K.close(w)  a container: the camera holds still from open to close
//   await K.walkTo([p1, p2], { sprint })        walk a path: look-ahead, step-ups, jumps; a leg into a block throws
//   K.warp(tag)                                 an actor's next move is a jump (off screen only; else: on a cut)
//   await K.blink(tag | 'self', to?)            an on-screen teleport that is the story (a tamed wolf to its owner):
//                                               no cut, a teleport_ok mark, the renderer snaps it (no lerp, no particles)
//   K.darkPeak(offset)                          the Darkness pulse peaks on this tick (+ offset): "DARK" on the word
//   K.hurt(entity|id)                           a staged hit's red flash (Invulnerable cast send no damage event)
// Motion is a player's by construction (lib/motion.js, docs/engine_features.md "Motion by construction"): every look
// (K.look, K.aim, K.turnTo, K.cut's arrival, and raw bot.look / bot.lookAt too) is a target the camera turns to at
// <= 180 deg/s with eased acceleration; actors walk to where a scene puts them (<= 0.3 blocks and 20 deg a tick)
// unless a cut or K.warp moves them; while a window is open the view does not move.
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
    T: (id) => { const L = S.line(id); return Math.round((L.dur + (L.gap ?? S.gap)) * 20) },   // a line's length in ticks
    // the POV camera's height over the feet: 1.62, or stunt.self.eye for a narrator who isn't a player (a wolf: 0.68)
    eye: (ctx.stunt && ctx.stunt.self && ctx.stunt.self.eye) || 1.62,
    // the camera's height over the feet right now: crouching lowers it 0.35 (an aim from 1.62 while sneaking landed
    // 0.35 blocks low: the renderer draws the crouched eye)
    eyeNow: () => K.eye - (bot.controlState && bot.controlState.sneak ? SNEAK_DROP : 0),
    lift: (ctx.stunt && ctx.stunt.aimLift !== undefined ? ctx.stunt.aimLift : AIM_LIFT),
    // cut timing (docs/cinematic.md "Invisible cuts"): inside a continuous take a line ends so that the next cut shows
    // cutLead s before the next line's first word (stunt.cutLead; null: end on the take's offset as before); cutLat is
    // the ticks the last K.cut took to land (a K.shot alone lands on its own tick)
    cutLead: ctx.stunt && ctx.stunt.cutLead !== undefined ? ctx.stunt.cutLead : CUT_LEAD,
    cutLat: 0,
    // yaw/pitch from an eye point to p, lifted K.lift degrees (or `lift`) unless p is exact (K.face, K.top)
    aimFrom (eye, p, lift = K.lift) {
      const d = p.minus(eye), up = p.exact ? 0 : (lift || 0) * Math.PI / 180
      return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.min(Math.PI / 2, Math.atan2(d.y, Math.hypot(d.x, d.z)) + up) }
    },
    aim (p, lift) { return K.aimFrom(bot.entity.position.offset(0, K.eyeNow(), 0), p, lift) },
    // where to look at a cast member: its eyes. who = a mineflayer entity, or feet (a Vec3) + type ('villager', 'zombie'...)
    // o: { sneak, baby, sitting } (a sitting wolf/cat: eye 0.5 / 0.25 lower)
    face (who, type = 'player', o = {}) {
      const ent = who && who.position ? who : null
      const feet = ent ? ent.position : who
      const name = ent ? ent.name || type : type
      let h = EYE_H[name] ?? ((ent && ent.height) || 1.95) * 0.85
      if (o.sneak || (ent && ent.metadata && typeof ent.metadata[0] === 'number' && (ent.metadata[0] & 2))) h -= SNEAK_DROP
      if (o.baby) h *= 0.5
      if (o.sitting) h -= name === 'wolf' ? 0.18 : 0.15
      const p = new ctx.Vec3(feet.x, feet.y + h, feet.z); p.exact = true
      return p
    },
    // a block's visible face: its top when it is below the eye (the face the camera sees), else its middle
    top (x, y, z) {
      const b = x && x.x !== undefined ? x : new ctx.Vec3(x, y, z)
      const bx = Math.floor(b.x), by = Math.floor(b.y), bz = Math.floor(b.z)
      const below = by + 1 <= bot.entity.position.y + K.eyeNow()
      const p = new ctx.Vec3(bx + 0.5, by + (below ? 1 : 0.5), bz + 0.5); p.exact = true
      return p
    },
    swayY: () => Math.sin(ctx.tick / 19) * 0.1 * K.sway,
    swayP: () => Math.sin(ctx.tick / 27) * 0.04 * K.sway,
    look (k, dyaw = 0, dpitch = 0) {
      // the sway runs on the recording's clock (a per-line k restarted it and the camera jumped between lines of
      // one shot); reviewers read a smaller sway as a frozen shot. The aim is the governor's target: the camera
      // turns to it like a hand on a mouse (lib/motion.js stepTurn, every tick), never in a snap
      K._looked = true
      return bot.look(K.base.yaw + dyaw + K.swayY(), K.base.pitch + dpitch + K.swayP(), true)
    },
    // the sway goes on while the kit awaits something that takes ticks (a dig, a container opening): with nothing calling
    // K.look the camera stopped dead for the dig's 2-3 ticks, then went on (motiontest: 2 held poses a dig, which render.js
    // took for dropped ticks). A scene that keeps looking itself wins (its look comes after this, in the same tick)
    // (before the governor's turn in the same tick, else the first tick of it still held)
    async _swaying (promise) {
      K._looked = false
      const h = () => { try { if (!K._looked) K.look(0); K._looked = false } catch (e) { ctx.log('sway:', e.message) } }
      if (bot.prependListener) bot.prependListener('physicsTick', h); else bot.on('physicsTick', h)
      try { return await promise } finally { bot.removeListener('physicsTick', h) }
    },
    // movement keys
    ctl: (key, on) => bot.setControlState(key, on),
    go: (on, key = 'forward') => bot.setControlState(key, on),
    stop (keys = MOVE) { for (const k of keys) bot.setControlState(k, false) },
    // a cut to (X + dx, F + dy, Z + dz), arriving aimed at `target`. opts (or a function = opts.during):
    //   during()  every tick while the teleport lands (the old shot keeps moving)
    //   after()   once, right after the /tp is sent (grow a pillar, move the cast with the cut)
    //   time      the time of day of the new shot, set on the cut's own frame
    //   shot      a stunt.shots name to switch to on the landing tick (the old camera never shows the cast already moved)
    //   self      [extra, eye]: K.self(extra, eye) on the landing tick (the old shot keeps its eye height)
    //   stop      release the movement keys first (default K.stopOnCut)
    cut (dx, dz, target, dy = 1, o = {}) { return K.cutTo(dx, F + dy, dz, target, o) },
    async cutTo (dx, y, dz, target, o = {}) {
      if (typeof o === 'function') o = { during: o }
      const { during = null, after = null, time, shot, self, stop = K.stopOnCut, lift, eyeTrace } = o
      if (stop) K.stop()
      K._cutting = true   // actors may jump to their new marks while the cut lands (K.actor), and nothing else may
      const x = X + dx, z = Z + dz
      // always decimals: /tp centres a whole-number x/z on the block (+0.5) and the arrival check never matched
      // arrive already aimed (the rotation rides on the teleport): aiming after it showed the new
      // place at the old angle for 2 frames, then a snap (frame review, story_runaway)
      const eyeAt = self && self[1] !== undefined ? self[1] - (K.eye - K.eyeNow()) : K.eyeNow()
      const nb = K.aimFrom(new ctx.Vec3(x, y + eyeAt, z), target, lift)
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
        if (self) K.self(self[0], self[1])   // o.self: [extra, eye] from the landing tick (set before the cut, the old
        // shot's camera dropped to the new eye height while the teleport landed: under the water, story_good_boy)
        if (shot) K.shot(shot, { eyeTrace })   // o.shot: the new shot starts on the landing tick (switched after the cut returned, the old
        // camera ran on for 2-6 frames with the cast already gone: story_good_boy review)
      }
      bot.on('forcedMove', onMove)
      if (time !== undefined) { ctx.dayTime = time; K.say(`/time set ${time}`) }
      ctx.mark('cut')   // the renderer snaps to the new spot at any distance (short cuts glided; worker 8)
      const called = K.now()
      K.say(`/tp @s ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)} ${(180 - yaw * 180 / Math.PI).toFixed(2)} ${(-pitch * 180 / Math.PI).toFixed(2)}`)
      if (after) after()
      const cast = K._placed()   // the cast moved with the cut: the cut is over when they are on their marks too
      // the old shot keeps swaying (on its old aim) while the teleport lands: it froze for 2-4 frames before
      // every cut; a look at the new aim before the landing would turn the old shot instead. Arrival compares
      // y and the angle too (x/z alone passed at once on a cut on the spot, and the new aim snapped in late:
      // story_one_block_higher)
      try {
        for (let i = 0; i < 10; i++) {
          await bot.waitForTicks(1)
          if ((landed || (near() && angDiff(bot.entity.yaw, yaw) < 0.03 && Math.abs(bot.entity.pitch - pitch) < 0.03)) && cast.every(w => K._onMark(w))) break
          K.look(0); if (during) during()
        }
      } finally { bot.removeListener('forcedMove', onMove) }
      // how long a cut takes to show (the teleport landing): K.line ends the line before a cut this much early
      K.cutLat = Math.max(0, Math.min(4, K.now() - called))
      if (!landed && time !== undefined) ctx.mark('time', { time })
      K.base = nb
      await K.look(0)
      K._govSnap()   // a cut is a cut: the new shot starts on its aim (no turn from the old shot's)
      // the cast's teleports reach the client up to 3 ticks after the player's (a mob's update interval): the warp
      // window stays open one more tick, and the renderer snaps a cast member that lands within 6 ticks of a cut onto
      // the cut (gold_for_the_portal L07: Grandma dashed 3.2 blocks across the new shot 3 ticks after the cut)
      await bot.waitForTicks(1); K._clock++
      K._cutting = false
    },
    flee (tag, speed) { K.say(`/execute as @e[tag=${tag}] at @s facing entity ${bot.username} feet rotated ~180 0 positioned ^ ^ ^${speed} run tp @s ~ ${F + 1} ~ facing ^ ^ ^5`) },
    // turn the camera to a point over n ticks (eased), from inside a scene: call every tick with u = (k - start) / n
    turnTo (from, p, u, lift) {
      const to = K.aim(p, lift), e = ease(u)
      let dy = to.yaw - from.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy <= -Math.PI) dy += 2 * Math.PI
      K.base = { yaw: from.yaw + dy * e, pitch: from.pitch + (to.pitch - from.pitch) * e }
    },
    // the cinematic camera (docs/stories.md "Cinematic stories"): switch the picture to stunt.shots[name] from this
    // tick (render.js camera director). A camera shot hides the HUD and draws the narrator from outside (the player,
    // or stunt.self.model); a { pov: true } shot is the first-person view again, with the HUD unless stunt.hud is false.
    // Shots are a pure function of time: re-tune them in the stunt and re-render, no re-recording.
    // o.eyeTrace false: this cut is a deliberate jump (a shock cut, a reveal); otherwise the renderer eye-traces it
    // (a camera shot, and a first-person shot that follows a camera shot: render.js eyeTraceOffset)
    shot (name, o = {}) {
      const spec = (ctx.stunt.shots || {})[name]
      if (!spec) throw new Error(`shot '${name}' is not in stunt.shots`)
      const hud = !!spec.pov && ctx.stunt.hud !== false
      if (hud && ctx._f1) { ctx.mark('f1_off'); ctx._f1 = false }
      if (!hud && !ctx._f1) { ctx.mark('f1_on'); ctx._f1 = true }
      ctx.mark('shot', { name, ...(o.eyeTrace === false ? { eyeTrace: false } : {}) })
      K.shotName = name
    },
    // the narrator's look from outside, from this tick (stunt.self.model): K.self({ sitting: true }, 0.5)
    self (extra, eye) { ctx.mark('self', { extra, ...(eye !== undefined ? { eye } : {}) }); if (eye !== undefined) K.eye = eye },
    // one line: mark it, run scene(k, at, n) every tick for its spoken length + gap + extra seconds (n ticks).
    // o.tail(): runs once, o.tailAt (8) ticks before the end (bring the next shot's cast up out of view)
    // A line of a continuous take (voice.json `beat`): its mark and its end come from the take's own offsets on
    // the recording's clock (ctx.tick), so the picture follows the voice: anything that ran between two lines of
    // the beat (a preroll, a cut, a wait) shortens the next line instead of pushing the rest of the take late, and
    // `extra` only counts on the beat's last line (inside a take there is no room for it: the voice goes on).
    async line (id, scene, extra = 0, o = {}) {
      const L = S.line(id)
      let ticks = Math.round((L.dur + (L.gap ?? S.gap) + extra) * 20)
      if (L.beat !== undefined && L.offset !== undefined) {
        const r = beatTicks(L, K.now(), K._beat, extra, K.cutLead === null ? {} : { cut: { lead: K.cutLead, lat: K.cutLat } })
        K._beat = r.beat
        ticks = r.ticks
        if (r.late > 2) ctx.log(`${id}: the picture is ${r.late} ticks behind the continuous take: this line is shortened to catch up`)
        if (L.inner && extra) ctx.log(`${id}: extra ${extra} s ignored inside a continuous take (the voice goes on); put it on the beat's last line`)
      }
      ctx.mark('line', { id })
      // at(k): the tick chunk k's first word starts; at.cut(k): the tick to start a cut so it lands just before it
      const at = Object.assign((k) => L.at(k), { cut: (k) => cutTick(L.chunks, k, K.cutLead ?? CUT_LEAD, K.cutLat) })
      // runs on the recording's clock, not on loop iterations: a scene that awaits inside the line (an awaited K.cut,
      // a waitForTicks) used to push every later line late (Gold L04 +0.33 s). k is the line's tick, so it can skip
      // past a value: test ranges (k >= at.cut(i)) or fire once, and keep in-line awaits short.
      const t0 = K.now()
      let tailed = false, lastK = -1
      while (lastK < ticks - 1) {
        const k = Math.max(lastK + 1, Math.min(K.now() - t0, ticks - 1))
        if (k > lastK + 1) ctx.log(`${id}: ${k - lastK - 1} tick(s) passed inside the line at tick ${lastK + 1} (an await, or a slow server tick): the scene is run for each one now, so \`k === X\` steps never get skipped`)
        // every k reaches the scene exactly once, in order, even when the clock jumped (a slow tick or an await): a
        // one-shot \`k === at.cut(i)\` can't be dropped (Gold: 3-4 skipped ticks per recording with no awaits at all)
        for (let kk = lastK + 1; kk <= k; kk++) {
          if (o.tail && !tailed && kk >= ticks - (o.tailAt ?? 8)) { tailed = true; o.tail() }
          await scene(kk, at, ticks)
        }
        lastK = k
        await bot.waitForTicks(1); K._clock++
      }
      if (L.last) K._beat = null
    },
    _beat: null,
    _clock: 0,
    now: () => (typeof ctx.tick === 'number' ? ctx.tick : K._clock),   // the recording's tick (the line marks' clock)
    // ticks before a line's mark: entity moves reach the client a few ticks late, so motion that must be
    // moving on the line's first frame starts here (~10 ticks). fn(k) moves things; the camera keeps swaying
    async preroll (ticks, fn) {
      for (let k = 0; k < ticks; k++) { if (fn) await fn(k); K.look(k); await bot.waitForTicks(1); K._clock++ }
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
    // The client sees a mob move only when the server's entity tracker sends it: every 3rd tick for a mob
    // (EntityType updateInterval 3; players 2), unless the entity's synced data changed that tick
    // (ServerEntity.sendChanges: tickCount % updateInterval == 0 || hasImpulse || entityData.isDirty()). A /tp every
    // tick therefore reached the recording as 3-tick stair steps (dog_hill's beg hop: 6.7 Hz, "the villager keeps
    // teleporting"), and a placement landed up to 3 ticks after the cut. So every tick the kit also changes the actor's
    // air supply (synced data, invisible: a mob on land refills it to 300 in its own tick), and the tracker sends the
    // move that same tick: 20 Hz motion, and a placement lands on the next tick. o.sync false: the old cadence (tests).
    actors: new Map(),
    actor (tag, state, o = {}) {
      const a = Object.assign({ y: 1, yaw: 0, pitch: 0 }, state)
      if (o.sync === false) Object.defineProperty(a, '_nosync', { value: true, enumerable: false })
      K.actors.set(tag, a)
      if (!K._actorTick) K._actorTick = K.every(() => {
        const j = ctx.tick % 2 ? 0.002 : -0.002
        for (const [t, s] of K.actors) {
          // the scene says where it should be; it gets there at walking speed and turns its head at a mob's rate
          // (lib/motion.js stepActor). A jump happens at once only on a cut, on the first placement or after
          // K.warp(tag); anything else is walked, and said loudly (an on-screen reposition read as a teleport)
          const warp = !s._at || K._cutting || s._warp
          const r = MOTION.stepActor(s._at, s, warp)
          if (r.clamped > 1 && !s._warned) {
            s._warned = true
            ctx.log(`K.actor ${t}: the scene moved it ${r.clamped.toFixed(1)} blocks in one tick with no cut: walking it there instead (K.warp('${t}') for an off-screen reposition, or move it with the cut)`)
            ctx.mark('motion_warn', { kind: 'actor_jump', tag: t, blocks: +r.clamped.toFixed(2) })
          }
          if (!r.clamped) s._warned = false
          s._at = r.at; s._warp = false
          K.tp(t, r.at.x + j, r.at.y, r.at.z, r.at.yaw, r.at.pitch)   // motion-ok: the kit's own actor move
          if (!s._nosync) K.say(`/data merge entity @e[tag=${t},limit=1] {Air:${ctx.tick % 2 ? 298 : 299}s}`)
          K._resolve(t, s, { x: X + r.at.x + j, y: F + r.at.y, z: Z + r.at.z })
        }
      })
      return a
    },
    // which client entity an actor is: the non-player entity standing where the kit put it in the last few ticks.
    // Marked once ('actor' { tag, id }): rec_check's cast checks read it, and K.cutShot waits on that entity
    _resolve (t, s, abs) {
      const h = s._hist || (s._hist = [])
      h.push(abs); if (h.length > 6) h.shift()
      if (s._id !== undefined && bot.entities[s._id]) return
      for (const id in bot.entities) {
        const e = bot.entities[id]
        if (!e || e === bot.entity || e.type === 'player' || !e.position || DROP_NAMES.has(e.name)) continue
        if (h.some(p => Math.abs(e.position.x - p.x) < 0.006 && Math.abs(e.position.z - p.z) < 0.006 && Math.abs(e.position.y - p.y) < 0.02)) {
          s._id = e.id
          ctx.mark('actor', { tag: t, id: e.id, name: e.name })
          return
        }
      }
    },
    // is the client's copy of an actor on the mark w = { s, x, y, z } (absolute)? (its resolved entity, else any mob there)
    _onMark (w) {
      const near = (p) => Math.abs(p.x - w.x) < 0.05 && Math.abs(p.z - w.z) < 0.05 && Math.abs(p.y - w.y) < 0.1
      const e = w.s._id !== undefined ? bot.entities[w.s._id] : null
      if (e && e.position) return near(e.position)
      for (const id in bot.entities) {
        const en = bot.entities[id]
        if (en && en !== bot.entity && en.type !== 'player' && en.position && near(en.position)) return true
      }
      return false
    },
    // the actors a scene just moved off their last sent spot (they jump there: a cut is a cut), as marks to wait on
    _placed () {
      const out = []
      for (const [, s] of K.actors) {
        if (s._at && Math.hypot(s.x - s._at.x, s.y - s._at.y, s.z - s._at.z) <= 0.05) continue
        s._warp = true
        out.push({ s, x: X + s.x, y: F + s.y, z: Z + s.z })
      }
      return out
    },
    // a camera cut (stunt.shots[name]) with the cast placed for it, by construction: moves() sets the actors' new marks
    // (their K.actor states); each one it moves jumps there (no walk), and the shot mark waits until the client has every
    // one of them on its mark (the old shot holds meanwhile; <= o.max ticks, 8), so the new shot's first frame already
    // has the cast in place (dog_hill: the cast landed 1-2 ticks after the shot mark and the first frames showed them in
    // the old spot, then gliding). o.time: the new shot's time of day (on its frame); o.at(): once, on the cut's tick
    // (a weather mark, a sound); o.during(k): every tick of the wait (the old shot's scene). -> the ticks it waited
    async cutShot (name, moves, o = {}) {
      if (!(ctx.stunt.shots || {})[name]) throw new Error(`shot '${name}' is not in stunt.shots`)
      const called = K.now()
      if (moves) moves()
      const want = K._placed()
      if (o.time !== undefined && o.time !== ctx.dayTime) { ctx.dayTime = o.time; K.say(`/time set ${Math.round(o.time)}`) } else o = { ...o, time: undefined }
      let done = false
      const go = () => {
        if (done) return
        done = true
        if (o.time !== undefined) ctx.mark('time', { time: Math.round(o.time) })
        if (o.at) o.at()
        K.shot(name)
        K.cutLat = Math.max(0, Math.min(4, K.now() - called))   // (K.line ends the line before the next cut this much early)
      }
      const check = () => { if (!done && want.every(w => K._onMark(w))) go() }
      if (!want.length) { go(); return 0 }
      bot.on('entityMoved', check)   // on the packet: the mark lands on the tick the recording first has them there
      let k = 0
      try {
        for (; k < (o.max ?? 8) && !done; k++) {
          await bot.waitForTicks(1); K._clock++
          check()
          if (!done && o.during) o.during(k)
        }
      } finally { bot.removeListener('entityMoved', check) }
      if (!done) {
        const late = want.filter(w => !K._onMark(w)).map(w => [...K.actors].find(([, s]) => s === w.s)?.[0])
        ctx.log(`K.cutShot ${name}: ${late.join(', ')} not on the mark after ${k} ticks: cutting anyway`)
        ctx.mark('motion_warn', { kind: 'cast_late', shot: name, tags: late })
        go()
      }
      return k
    },
    // the next move of an actor is a jump (it is off screen, or a hidden swap): the only way to reposition a cast
    // member without a cut
    warp (tag) { const a = K.actors.get(tag); if (a) a._warp = true },
    // an on-screen teleport that IS the story (vanilla: a tamed wolf more than 12 blocks from its owner teleports to
    // within 1-2 blocks of him: TamableAnimal.tryToTeleportToOwner; no particles, it just appears). `who`: an actor's
    // tag (K.actor) or 'self' (the player: a wolf narrator). `to`: set-relative { x, y?, z, yaw? } or [dx, dy, dz]; left
    // out, 1.5 blocks to the player's right, facing the way he faces. It jumps on the next tick, inside the shot, with no
    // cut mark, and marks `teleport_ok` (absolute x, y, z) so the owner gate accepts the jump and the renderer snaps it
    // (no client lerp at any distance). Returns the absolute spot.
    async blink (who, to, o = {}) {
      const self = who === 'self'
      const a = self ? null : K.actors.get(who)
      if (!self && !a) throw new Error(`K.blink: '${who}' is not an actor (K.actor('${who}', {...}) first) and not 'self'`)
      const pp = bot.entity.position, pyaw = bot.entity.yaw
      let rel
      if (Array.isArray(to)) rel = { x: to[0], y: to[1], z: to[2] }
      else if (to) rel = { ...to }
      else {   // beside the player (to his right: (cos yaw, -sin yaw) in mineflayer's yaw), on his feet's level, facing his way
        rel = { x: pp.x - X + Math.cos(pyaw) * 1.5, y: pp.y - F, z: pp.z - Z - Math.sin(pyaw) * 1.5, yaw: 180 - pyaw * 180 / Math.PI }
      }
      if (rel.y === undefined || rel.y === null) rel.y = self ? pp.y - F : (a.y ?? 1)
      const abs = { x: X + rel.x, y: F + rel.y, z: Z + rel.z }
      ctx.mark('teleport_ok', { tag: self ? null : who, self, x: +abs.x.toFixed(3), y: +abs.y.toFixed(3), z: +abs.z.toFixed(3) })
      if (self) {
        let landed = false
        const onMove = () => { landed = true }
        bot.on('forcedMove', onMove)
        try {
          K.say(`/tp @s ${abs.x.toFixed(3)} ${abs.y.toFixed(3)} ${abs.z.toFixed(3)} ~ ~`)   // motion-ok: K.blink is the sanctioned on-screen teleport
          for (let i = 0; i < 10 && !landed; i++) { await bot.waitForTicks(1); K._clock++ }
        } finally { bot.removeListener('forcedMove', onMove) }
      } else {
        a.x = rel.x; a.y = rel.y; a.z = rel.z
        if (rel.yaw !== undefined) a.yaw = rel.yaw
        a._warp = true
        if (o.wait !== false) { await bot.waitForTicks(1); K._clock++ }
      }
      return abs
    },
    // the warden's Darkness pulse peaks on this tick (+ offset ticks), and every 4 s either side (lib/darkness.js): time
    // "the lights went DARK" onto the word. Vanilla's pulse follows the player's age, which nobody can see.
    darkPeak (offset = 0) { ctx.mark('darkness_phase', { offset: Math.round(offset) }) },
    // walk an actor by (dx, dz) and face the way it walks
    step (a, dx, dz) { a.x += dx; a.z += dz; if (dx || dz) a.yaw = mcYaw(dx, dz) },
    // stop moving an actor and put it `depth` blocks under the set (negative: above it), out of sight. Under the set
    // it goes into an air pocket carved there on first use: mobs parked inside stone crashed the server in chunk
    // ticking (docs/runs/2026-11-10_dog_hill.md)
    bury (tag, depth = 30) {
      const a = K.actors.get(tag); K.actors.delete(tag)
      const x = a ? X + a.x : X, z = a ? Z + a.z : Z, y = F - depth
      if (depth > 0) {
        const key = `${Math.floor(x)},${y},${Math.floor(z)}`
        K._pockets = K._pockets || new Set()
        if (!K._pockets.has(key)) { K._pockets.add(key); K.say(`/fill ${Math.floor(x) - 1} ${y} ${Math.floor(z) - 1} ${Math.floor(x) + 1} ${y + 2} ${Math.floor(z) + 1} air`) }
      }
      K.say(`/tp @e[tag=${tag}] ${x.toFixed(3)} ${y} ${z.toFixed(3)}`)
    },
    // park a cast member (or a tagged group) out of shot, in the air 60 blocks east and 40 up from the set: inside the
    // forceloaded area (clearSet), never in stone, >64 blocks from the action so the next /tp in is a pop, not a glide.
    // Summon cast with NoGravity:1b if they aren't NoAI (setKit's mob() is NoAI: they hang where put). Zombies and
    // skeletons burn up there in daylight: park those under a roof, or bury them.
    park (tag) { K.actors.delete(tag); K.say(`/tp @e[tag=${tag}] ${X + 60} ${F + 40} ${Z}`) },
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
    // dig a block at vanilla speed for the held item (or `ms`), like a player (lib/motion.js): the mouse glides onto
    // the block first (the dig starts once the crosshair is on it), and the next block waits vanilla's destroyDelay
    // (5 ticks after a break; back to back, 3 wool blocks broke in 15 ticks and read "sped up": light_sleeper L06).
    // bot.digTime is swapped for the dig, so the crack the renderer draws (the harness's `dig` mark) and the break
    // both use it. Not awaited, the scene keeps ticking: `K.dig(b).then(...)`
    // The aim is a point on a face the eye can see (K.reachSight; o.walk: step to a spot that sees it first)
    async dig (block, ms = vanillaDigMs(bot, block), o = {}) {
      const s = await K._sightFor('K.dig', [{ pos: block.position }], o)
      // the mouse moves to the next block during the delay, as a player's does (one after the other, 3 digs in a row
      // had 10-11-tick gaps: motiontest)
      await K.aimAt(K._sightAim(s), { on: block.position, until: K._lastBreak + MOTION.DESTROY_DELAY })
      const dt = bot.digTime
      bot.digTime = () => ms
      try { return await K._swaying(bot.dig(block, 'ignore')) } finally { bot.digTime = dt; K._lastBreak = K.now() }
    },
    // ---- line of sight (lib/sight.js, STANDARDS 3b.4): a block's collision boxes in the live world
    _shapes: (x, y, z) => { const q = bot.blockAt && bot.blockAt(new ctx.Vec3(x, y, z)); return q && q.shapes && q.shapes.length ? q.shapes : null },
    _blockName: (p) => {
      const v = [Math.floor(p.x ?? p[0]), Math.floor(p.y ?? p[1]), Math.floor(p.z ?? p[2])], q = bot.blockAt && bot.blockAt(new ctx.Vec3(...v))
      return `${q ? q.name : 'block'} at ${v.join(' ')}`
    },
    _eyeAt: () => { const e = bot.entity.position; return [e.x, e.y + K.eyeNow(), e.z] },
    // the best point on one of `targets` ({ pos, faces?, skip? }) the eye can see; -> lib/sight.js bestOf
    sightOf (targets) { return SIGHT.bestOf(K._eyeAt(), targets, K._shapes) },
    // as sightOf, but nothing visible throws (who: 'K.dig' / 'K.place'), naming the block, what is in the way and the
    // nearest spot that sees it; with o.walk: true it returns { walk: [x, y, z] } (feet) instead when there is one
    reachSight (who, targets, o = {}) {
      const s = K.sightOf(targets)
      if (s.point) return s
      const e = bot.entity.position
      const spot = SIGHT.standSpot([e.x, e.y, e.z], K.eyeNow(), targets, K._shapes)
      if (spot && o.walk) return { walk: spot.feet }
      const nm = K._blockName
      const what = o.what || `face of ${nm(targets[0].pos)}`
      throw new Error(`${who}: no ${what} is visible from the eye at ${fmt(new ctx.Vec3(...K._eyeAt()))}` +
        (s.blocker ? ` (${nm([s.blocker.x, s.blocker.y, s.blocker.z])} is in the way)` : '') +
        (spot ? `: stand at ${spot.feet.map((v) => +v.toFixed(1)).join(' ')} first (or pass { walk: true })` : ': no spot within 3 blocks sees it, change the scene') +
        ' (STANDARDS 3b.4: a clear line of sight to every dig and place)')
    },
    async _sightFor (who, targets, o = {}) {
      let s = K.reachSight(who, targets, o)
      if (s.walk) {
        ctx.log(`${who}: nothing to see from here, stepping to ${s.walk.map((v) => v.toFixed(1)).join(' ')}`)
        await K.walkTo([new ctx.Vec3(...s.walk)])
        s = K.reachSight(who, targets, { ...o, walk: false })
      }
      return s
    },
    // the aim point for a sight: on the visible face, exact (no lift: the point is already where the crosshair goes)
    _sightAim (s) { const p = new ctx.Vec3(...s.point); p.exact = true; return p },
    _lastBreak: -99,
    _lastUse: -99,
    // turn to a point (or a block: { block: true } aims at its centre and waits for the crosshair to be on it)
    // and wait until the turn has landed. p: a Vec3 (a block position with { block: true }). o.lift as K.aim; o.max
    // ticks at most (40); the scene's own per-tick work through o.during(k); o.until: not before this tick (K.now())
    // either (a use / break delay the turn overlaps). o.on: a block position the crosshair must be on, with nothing in
    // front of it (lib/sight.js), when aiming at a point on it (K.dig / K.place)
    async aimAt (p, o = {}) {
      const on = o.on && !o.block ? new ctx.Vec3(Math.floor(o.on.x), Math.floor(o.on.y), Math.floor(o.on.z)) : null
      const blk = o.block ? new ctx.Vec3(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)) : on
      // a block: its centre. The ray to it always passes through the block; the top face's centre, from a few blocks
      // off, is a grazing ray that clips the block's far edge, and the sway took the crosshair off it: the turn never
      // "landed" (40-tick timeouts, 31-tick gaps between digs: motiontest)
      const at = blk ? Object.assign(new ctx.Vec3(blk.x + 0.5, blk.y + 0.5, blk.z + 0.5), { exact: true }) : p
      K.base = K.aim(at, o.lift)
      for (let k = 0; k < (o.max ?? 40); k++) {
        K.look(0)
        const g = K._gov, t = g.target || g.cur
        const err = Math.hypot(MOTION.wrap(t.yaw - g.cur.yaw), t.pitch - g.cur.pitch)
        const eye = bot.entity.position.offset(0, K.eyeNow(), 0)
        const hit = !blk ? true : on
          ? SIGHT.crosshair(eye, g.cur.yaw, g.cur.pitch, [[on.x, on.y, on.z]], K._shapes, { shrink: 0.05, skip: o.skip }).on
          : MOTION.rayHitsBlock([eye.x, eye.y, eye.z], g.cur.yaw, g.cur.pitch, blk.x, blk.y, blk.z, 6, 0.1)
        if (hit && err < 0.03 && Math.hypot(g.vel.yaw, g.vel.pitch) < 0.01 && !(o.until > K.now())) return true
        if (o.during) await o.during(k)
        await bot.waitForTicks(1); K._clock++
      }
      ctx.log(`K.aimAt: the turn to ${fmt(at)} didn't land in ${o.max ?? 40} ticks`)
      return false
    },
    // place a block like a player: turn onto the block it goes against (below it, or o.against), wait vanilla's 4-tick
    // use delay, swing, set it, play its place sound (o.sound; null: none). pos: a Vec3, the block position
    // The aim is the clicked face of a block it goes against that the eye can see (o.against: that block; else the one
    // below, or any beside or above it: lib/sight.js supportsOf); o.walk as K.dig. A 'place_on' mark says which
    // (scripts/rec_sight.js checks the line of sight from the recording)
    async place (pos, block, o = {}) {
      const b = new ctx.Vec3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z))
      const bp = [b.x, b.y, b.z]
      let cands
      if (o.against) {
        const a = [Math.floor(o.against.x), Math.floor(o.against.y), Math.floor(o.against.z)], n = [b.x - a[0], b.y - a[1], b.z - a[2]]
        cands = [{ pos: a, faces: Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]) === 1 ? [n] : null, skip: [bp] }]
      } else {
        cands = SIGHT.supportsOf(bp, K._shapes)
        // nothing to go against (a /setblock in the air): the spot itself
        if (!cands.length) cands = [{ pos: bp }]
      }
      const s = await K._sightFor('K.place', cands, { ...o, what: `face to place ${block} at ${bp.join(' ')} against (${cands.map((c) => K._blockName(c.pos)).join(', ')})` })
      const a = s.target.pos
      await K.aimAt(K._sightAim(s), { on: new ctx.Vec3(...a), skip: [bp], until: K._lastUse + MOTION.USE_DELAY })
      ctx.mark('place_on', { x: b.x, y: b.y, z: b.z, ax: a[0], ay: a[1], az: a[2] })
      bot.swingArm('right')
      K.say(`/setblock ${b.x} ${b.y} ${b.z} ${block}`)
      if (o.sound !== null && ctx.sound) ctx.sound(o.sound || (/wool|carpet/.test(String(block)) ? 'block.wool.place' : 'block.wood.place'), 0.9, 1)
      K._lastUse = K.now()
    },
    // open a container (chest, barrel...) like a player: turn onto it, then open it. While any window is open the
    // camera does not move at all (the mouse drives the cursor, as in vanilla); K.close(w) shuts it, and the aim eases
    // back into motion from rest
    async open (pos) {
      await K.aimAt(pos, { block: true, until: K._lastUse + MOTION.USE_DELAY })
      K._lastUse = K.now()
      return K._swaying(bot.openContainer(bot.blockAt(pos)))
    },
    close (w) { if (w || bot.currentWindow) bot.closeWindow(w || bot.currentWindow) },
    // a staged hit on a cast member (Invulnerable cast send no damage event, so no red flash: names_in_the_woods'
    // eggs): its hurt flash, 10 ticks (LivingEntity.hurtTime). who: a mineflayer entity or an entity id
    hurt (who) { const id = who && who.id !== undefined ? who.id : who; if (id !== undefined && id !== null) ctx.mark('mob_hurt', { id, staged: true }) },
    // walk a path like a player: through each point in turn (Vec3s, absolute), the camera looking ahead along the path
    // (2 blocks from where the walker is on it: lib/motion.js walkSteer), the forward key only while facing the way (no
    // strafing into walls), a jump for a full-block step (slabs, carpets, stairs and paths step up by themselves). The
    // path is checked first, twice: each leg for a 0.6-wide player pushing into a block, then a dry run of the walk
    // itself (the same steering, turn speed and vanilla ground movement: lib/motion.js walkPlan), which catches a corner
    // the look-ahead cuts into the very block the points went around. Either throws, naming the block: add a point
    // around it, or move one further from it. A walk that stalls is marked 'stuck' and logged; one that does not get
    // there throws (it used to return false and the story went on from the wrong place).
    // o: { sprint, pitch (radians; default the current aim's), during(k), max ticks (400) }
    async walkTo (points, o = {}) {
      const pts = [].concat(points)
      const start = bot.entity.position.clone()
      let from = start
      for (const q of pts) { const hit = K.pathBlocked(from, q); if (hit) throw new Error(`K.walkTo: the leg ${fmt(from)} -> ${fmt(q)} runs into ${hit}: add a point around it`); from = q }
      const solid = (x, y, z) => { const q = bot.blockAt(new ctx.Vec3(x, y, z)); return q && q.boundingBox === 'block' ? q.name : null }
      const plan = MOTION.walkPlan(start, pts, K._gov, solid, { sprint: o.sprint, pitch: o.pitch ?? K.base.pitch, max: o.max ?? 400, lim })
      if (plan) throw new Error(`K.walkTo ${pts.map(fmt).join(' -> ')}: the walk ${plan}: move that point further from it or add one`)
      const left = (i, p) => { let d = Math.hypot(pts[i].x - p.x, pts[i].z - p.z); for (let j = i + 1; j < pts.length; j++) d += Math.hypot(pts[j].x - pts[j - 1].x, pts[j].z - pts[j - 1].z); return d }
      let i = 0, slow = 0, k = 0, best = Infinity, bestAt = 0
      if (o.sprint) K.ctl('sprint', true)
      try {
        for (; k < (o.max ?? 400); k++) {
          const p = bot.entity.position
          const st = MOTION.walkSteer(start, pts, i, p); i = st.i
          if (i >= pts.length) break
          const ahead = st.ahead
          const yaw = Math.atan2(-(ahead.x - p.x), -(ahead.z - p.z))
          K.base = { yaw, pitch: o.pitch ?? K.base.pitch }
          K.look(k)
          const off = Math.abs(MOTION.wrap(yaw - K._gov.cur.yaw))
          bot.setControlState('forward', off < 0.6)
          // a full block in the way at the feet with room over it: jump it (a player taps space; no autojump)
          const fx = p.x - Math.sin(K._gov.cur.yaw) * 0.6, fz = p.z - Math.cos(K._gov.cur.yaw) * 0.6
          const foot = bot.blockAt(new ctx.Vec3(fx, p.y + 0.55, fz)), above = bot.blockAt(new ctx.Vec3(fx, p.y + 1.55, fz))
          bot.setControlState('jump', !!(foot && foot.boundingBox === 'block' && !(above && above.boundingBox === 'block')))
          const v = bot.entity.velocity ? Math.hypot(bot.entity.velocity.x, bot.entity.velocity.z) : 1
          slow = off < 0.6 && k > 5 && v < 0.04 ? slow + 1 : 0
          // no progress along the path for 1.5 s (turning in place, pushing into something) is a stall too
          const rest = left(i, p)
          if (rest < best - 0.05) { best = rest; bestAt = k }
          if (slow === 4 || k - bestAt === 30) { ctx.mark('stuck', { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }); ctx.log(`K.walkTo: stuck at ${fmt(p)} (heading for ${fmt(pts[i])})`) }
          if (slow > 40 || k - bestAt > 60) throw new Error(`K.walkTo: stuck at ${fmt(p)} for ${slow > 40 ? 2 : 3} s (heading for ${fmt(pts[i])})`)
          if (o.during) await o.during(k)
          await bot.waitForTicks(1); K._clock++
        }
      } finally { K.stop(['forward', 'jump', 'sprint']) }
      if (i < pts.length) {
        const p = bot.entity.position
        ctx.mark('stuck', { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) })
        throw new Error(`K.walkTo: didn't get to ${fmt(pts[pts.length - 1])} in ${o.max ?? 400} ticks (at ${fmt(p)}, heading for ${fmt(pts[i])})`)
      }
      return true
    },
    // the first block a 0.6-wide, 1.8-tall player walking from feet a to feet b would push into ("name at x y z"), or
    // null. Anything up to half a block high at the feet is a step (slab, carpet, stairs, path); a full block is a jump
    // only when the leg climbs (b.y > a.y)
    pathBlocked (a, b) {
      const ux = b.x - a.x, uz = b.z - a.z, L = Math.hypot(ux, uz) || 1, n = Math.max(1, Math.ceil(L / 0.1))
      const sx = -uz / L * 0.3, sz = ux / L * 0.3
      for (let k = 1; k <= n; k++) {
        const f = k / n, x = a.x + ux * f + ux / L * 0.3, z = a.z + uz * f + uz / L * 0.3, y = a.y + (b.y - a.y) * f
        for (const s of [-1, 0, 1]) for (const dy of b.y > a.y + 0.5 ? [1.2, 1.7] : [0.55, 1.2, 1.7]) {
          const q = bot.blockAt(new ctx.Vec3(x + sx * s * 0.99, y + dy, z + sz * s * 0.99))
          if (q && q.boundingBox === 'block') return `${q.name} at ${q.position.x} ${q.position.y} ${q.position.z}`
        }
      }
      return null
    }
  }
  const fmt = (v) => `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.z.toFixed(1)}`
  // ---- the aim governor (lib/motion.js): every look the story asks for is a target; once a tick the camera turns
  // toward it at a player's speed and acceleration (stunt.motion { turnSpeed, turnAccel } in deg/s, deg/s^2).
  // bot.look / bot.lookAt are routed here too, so a raw call eases as well (the lint in ./hb check still flags them).
  // While a container window is open the camera holds still. A teleport (a cut, a respawn) puts the aim where the
  // server says, at rest.
  const lim = (() => {
    const m = (ctx.stunt && ctx.stunt.motion) || {}
    return { speed: (m.turnSpeed ?? 180) * MOTION.DEG / 20, accel: (m.turnAccel ?? 900) * MOTION.DEG / 400 }
  })()
  const raw = { look: typeof bot.look === 'function' ? bot.look.bind(bot) : null }
  K._gov = { cur: { yaw: bot.entity.yaw, pitch: bot.entity.pitch }, vel: { yaw: 0, pitch: 0 }, target: null }
  K._govSnap = () => {
    const g = K._gov
    if (g.target) g.cur = { ...g.target }
    g.vel = { yaw: 0, pitch: 0 }
    if (raw.look) raw.look(g.cur.yaw, g.cur.pitch, true)
  }
  bot.look = (yaw, pitch) => { K._gov.target = { yaw, pitch }; return Promise.resolve() }
  bot.lookAt = (p) => { K._gov.target = K.aimFrom(bot.entity.position.offset(0, K.eyeNow(), 0), p, 0); return Promise.resolve() }
  K.gui = () => !!bot.currentWindow
  let lastSeen = null, frozen = false
  const govTick = () => {
    const g = K._gov, e = bot.entity
    if (!e) return
    // a teleport turned the view (the server's rotation): start from there, at rest
    // and that is where it stays until a look asks for another aim: the old target (the old shot's aim, still set while
    // a cut lands) turned the new shot 2.3 deg back toward it for a tick, then K.cut's snap jumped it back (motiontest)
    if (lastSeen && (Math.abs(MOTION.wrap(e.yaw - lastSeen.yaw)) > 1e-4 || Math.abs(e.pitch - lastSeen.pitch) > 1e-4)) { g.cur = { yaw: e.yaw, pitch: e.pitch }; g.vel = { yaw: 0, pitch: 0 }; g.target = { ...g.cur } }
    if (K.gui()) {   // vanilla: the mouse drives the cursor; the view does not move from open to close
      if (!frozen) { frozen = true; ctx.mark('gui_freeze') }
      g.vel = { yaw: 0, pitch: 0 }
      lastSeen = { yaw: e.yaw, pitch: e.pitch }
      return
    }
    if (frozen) { frozen = false; ctx.mark('gui_thaw') }
    if (g.target) {
      const r = MOTION.stepTurn(g.cur, g.vel, g.target, lim)
      g.cur = r.cur; g.vel = r.vel
      if (raw.look) raw.look(g.cur.yaw, g.cur.pitch, true)
    }
    lastSeen = { yaw: e.yaw, pitch: e.pitch }
  }
  K.every(govTick)
  // a stall: the forward key held on the ground and the player slowed to under 60% of its walk (a block corner, a door
  // frame): marked 'stuck' and logged at once (lib/hb/owner.js reads it; K.walkTo paths around blocks)
  let walkV = 0, stall = 0
  K.every(() => {
    const e = bot.entity
    if (!e || !e.velocity || !bot.controlState) return
    const v = Math.hypot(e.velocity.x, e.velocity.z)
    if (bot.controlState.forward && e.onGround && !bot.controlState.sneak && !K._cutting && walkV > 0.15 && v < 0.6 * walkV) stall++
    else { stall = 0; walkV = bot.controlState.forward ? Math.max(walkV * 0.9, v) : 0 }
    if (stall === 3) { ctx.mark('stuck', { x: +e.position.x.toFixed(2), y: +e.position.y.toFixed(2), z: +e.position.z.toFixed(2) }); ctx.log(`walking into something at ${fmt(e.position)}: use K.walkTo with a point around it`) }
  })

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
async function clearSet (ctx, A, r = 64, top = 24, skirt = 16, { hanging = true, checkTerrain = true } = {}) {
  const c = (s) => ctx.cmd(s)
  // the cleared box goes into the recording (rec.cleared) for rec_check's "terrain left in the set" check;
  // checkTerrain: false for a set that builds hills or rock back into it on purpose
  if (checkTerrain) {
    const [x0, y0, z0] = A(-r, 1, -r).split(' ').map(Number), [x1, y1, z1] = A(r, top, r).split(' ').map(Number)
    ;(ctx.cleared || (ctx.cleared = [])).push({ x0, x1, z0, z1, y0, y1 })
  }
  // every chunk of the clearing has to be loaded first: right after the biome search's teleport the far edge
  // wasn't, five whole-layer /fills failed with "That position is not loaded" and a snowy hill stood in the set
  // (story_nitwit, recording 2)
  // (ctx.waitChunks waits for every chunk of the clearing and its skirt, up to a minute; a /fill that still hits an
  // unloaded chunk now fails the attempt: lib/harness.js set-up errors)
  {
    const [ax, , az] = A(-r - skirt, 0, -r - skirt).split(' ').map(Number), [bx, , bz] = A(r + skirt, 0, r + skirt).split(' ').map(Number)
    // forceloaded for the whole attempt (generated once, never unloaded: the chunk refresh and a far camera
    // can't drop a parked cast or a set's far edge)
    if (ctx.forceload) await ctx.forceload({ x0: ax, z0: az, x1: bx, z1: bz })
    else if (ctx.waitChunks) await ctx.waitChunks({ x0: ax, z0: az, x1: bx, z1: bz }); else { try { await ctx.bot.waitForChunksToLoad() } catch (e) {} }
  }
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
module.exports.EYE_H = EYE_H
module.exports.AIM_LIFT = AIM_LIFT

// ---- the story's hotbar (story.json "hotbar", docs/STANDARDS.md 3.6; owner, 2026-11-10: "Can we also fill our hotbar
// with like ridiculous items? like buckets of milk for example"). Up to 9 entries, slot 0 first:
//   "milk_bucket"                       one of it
//   ["egg", 67]                         a stack; over the item's own maximum (eggs: 16) the kit adds the 1.21
//                                       max_stack_size=99 component, so the server takes it and the HUD reads "67"
//                                       (owner, 2026-11-10: "make it 67 eggs")
//   ["diamond_pickaxe", 1, true]        enchanted: the glint (enchantment_glint_override); or a string of real
//                                       enchantments: ["diamond_pickaxe", 1, "efficiency:5,unbreaking:3"]
//   { "item": "cake", "count": 1, "enchanted": false }   the same as an object
//   null                                an empty slot (a bare hand on purpose)
// The story's own tools first, then 1-3 ridiculous items that fit the world. The harness applies it once, after the
// stunt's setup and before the recording starts (applyStoryHotbar), so the first recorded frame already has it; a stunt
// that calls ctx.hotbar itself replaces it from that moment (mergeHotbar keeps the story's items around its own).
// The selected slot is never touched: the stunt's own ctx.select / bot.setQuickBarSlot decides what is held.
const HOTBAR_MIN = 7          // fewer filled slots than this: a WARN (./hb check before recording, rec_check after)
const STACK_MAX = 99          // the max_stack_size component's ceiling (1.21)
// items the HUD draws no icon for (3D special item models edit.py/renderer/specialitems.js don't render yet): an
// empty-looking slot in a 'full' hotbar. Measured 2026-11-10 over every 1.21.11 item (docs/engine_features.md).
const NO_HUD_ICON = /^(shield|decorated_pot|player_head|dragon_head|piglin_head|(waxed_)?((exposed|weathered|oxidized)_)?copper_(chest|golem_statue))$/
let _md = null
function mcData (version) {
  if (_md && (!version || _md.version.minecraftVersion === version)) return _md
  if (!version) {
    try { version = (fs.readFileSync(path.join(__dirname, '..', 'versions.env'), 'utf8').match(/^MC_VERSION=(.*)$/m) || [])[1] } catch (e) {}
    version = (version || process.env.MC_VERSION || '1.21.11').trim()
  }
  const md = require('minecraft-data')(version)
  if (!md) throw new Error(`minecraft-data has no ${version}`)
  _md = md
  return md
}
// one entry -> { id, components, count, enchanted } (id without the minecraft: prefix; a hand-written [components]
// part kept in `components`), or null for an empty slot; throws on a shape it can't read
function hotbarEntry (e) {
  if (e === null || e === undefined || e === '') return null
  let item, count = 1, ench = false
  if (typeof e === 'string') item = e
  else if (Array.isArray(e)) [item, count = 1, ench = false] = e
  else if (typeof e === 'object') { item = e.item || e.name || e.id; count = e.count ?? 1; ench = e.enchanted ?? false }
  if (typeof item !== 'string' || !item) throw new Error(`hotbar entry ${JSON.stringify(e)}: no item name`)
  const m = /^(?:minecraft:)?([a-z0-9_./-]+)(\[.*\])?$/.exec(item.trim())
  if (!m) throw new Error(`hotbar entry ${JSON.stringify(e)}: '${item}' is not an item id`)
  return { id: m[1], components: m[2] ? m[2].slice(1, -1) : '', count: Number(count), enchanted: ench }
}
// the problems with a story.json "hotbar": [{ level: 'BLOCK' | 'WARN', msg }]. BLOCK: an unknown item id for the repo's
// version (versions.env), a bad count, more than 9 entries, an entry it can't read. WARN: no "hotbar", or fewer than
// HOTBAR_MIN filled slots.
function checkHotbar (hotbar, version) {
  const out = [], md = mcData(version), ver = md.version.minecraftVersion
  if (hotbar === undefined || hotbar === null) return [{ level: 'WARN', msg: 'story.json has no "hotbar": fill all 9 slots, the story\'s tools first, then 1-3 ridiculous items (milk buckets, cake, 67 eggs) (STANDARDS 3.6)' }]
  if (!Array.isArray(hotbar)) return [{ level: 'BLOCK', msg: 'story.json "hotbar" must be a list of up to 9 entries' }]
  if (hotbar.length > 9) out.push({ level: 'BLOCK', msg: `story.json "hotbar" has ${hotbar.length} entries: the hotbar has 9 slots` })
  let filled = 0
  hotbar.slice(0, 9).forEach((raw, i) => {
    let e
    try { e = hotbarEntry(raw) } catch (err) { out.push({ level: 'BLOCK', msg: `slot ${i}: ${err.message}` }); return }
    if (!e) return
    filled++
    const it = md.itemsByName[e.id]
    if (!it) { out.push({ level: 'BLOCK', msg: `slot ${i}: '${e.id}' is not a ${ver} item id (/item replace would fail)` }); return }
    if (NO_HUD_ICON.test(e.id)) out.push({ level: 'BLOCK', msg: `slot ${i}: the HUD draws no icon for ${e.id} yet (a 3D special model): pick another item, or add it to renderer/specialitems.js` })
    if (!Number.isInteger(e.count) || e.count < 1 || e.count > STACK_MAX) out.push({ level: 'BLOCK', msg: `slot ${i}: ${e.id} x${e.count}: a count is 1-${STACK_MAX}` })
    else if (e.count > it.stackSize && it.maxDurability) out.push({ level: 'BLOCK', msg: `slot ${i}: ${e.id} x${e.count}: a tool with durability can't stack (1.21 refuses max_stack_size on a damageable item)` })
    if (e.enchanted !== true && e.enchanted !== false && !(typeof e.enchanted === 'string' && /^[a-z_]+:\d+(,[a-z_]+:\d+)*$/.test(e.enchanted))) {
      out.push({ level: 'BLOCK', msg: `slot ${i}: enchanted is true/false or "name:level,..." (got ${JSON.stringify(e.enchanted)})` })
    } else if (typeof e.enchanted === 'string' && md.enchantmentsByName) {
      for (const en of e.enchanted.split(',')) { const n = en.split(':')[0]; if (!md.enchantmentsByName[n]) out.push({ level: 'BLOCK', msg: `slot ${i}: '${n}' is not a ${ver} enchantment` }) }
    }
  })
  if (filled < HOTBAR_MIN) out.push({ level: 'WARN', msg: `story.json "hotbar" fills ${filled}/9 slots (at least ${HOTBAR_MIN}; all 9 is the standard): the story's tools, then 1-3 ridiculous items (STANDARDS 3.6)` })
  return out
}
// story.json "hotbar" -> ctx.hotbar's items: [id with components, count] per slot (null: empty). Over the item's own
// stack size the max_stack_size component goes on (vanilla refuses "egg 67" otherwise).
function hotbarItems (hotbar, version) {
  const md = mcData(version)
  return (hotbar || []).slice(0, 9).map(raw => {
    const e = hotbarEntry(raw)
    if (!e) return null
    const it = md.itemsByName[e.id]
    if (!it) throw new Error(`hotbar: '${e.id}' is not a ${md.version.minecraftVersion} item id`)
    const comps = e.components ? [e.components] : []
    if (e.count > it.stackSize && !/max_stack_size/.test(e.components)) comps.push(`max_stack_size=${STACK_MAX}`)
    if (e.enchanted === true && !/enchant/.test(e.components)) comps.push('enchantment_glint_override=true')
    else if (typeof e.enchanted === 'string' && e.enchanted) comps.push(`enchantments={${e.enchanted}}`)
    return [comps.length ? `${e.id}[${comps.join(',')}]` : e.id, e.count]
  })
}
// a stunt's own hotbar over the story's: its non-empty slots win, the story's items fill the rest
//   await ctx.hotbar(mergeHotbar(ctx.storyHotbar, ['iron_shovel', 'iron_pickaxe']))
function mergeHotbar (base, over) {
  const out = []
  for (let i = 0; i < 9; i++) out.push((over && over[i]) || (base && base[i]) || null)
  while (out.length && !out[out.length - 1]) out.pop()
  return out
}
// The kit's start-of-stunt step: the story's hotbar through ctx.hotbar (/item replace; a 'hotbar' mark for the HUD).
// lib/harness.js calls it after stunt.setup, before the chunk refresh and the recording, so the first recorded frame
// has it (startRecording's own 'hotbar' mark). story: the parsed story.json, or the stories/<name> dir.
// -> the items applied (also on ctx.storyHotbar), or null when the story has none.
async function applyStoryHotbar (ctx, story) {
  if (typeof story === 'string') {
    const f = path.join(story, 'story.json')
    if (!fs.existsSync(f)) return null
    story = JSON.parse(fs.readFileSync(f, 'utf8'))
  }
  if (!story || !Array.isArray(story.hotbar) || !story.hotbar.some(Boolean)) return null
  const bad = checkHotbar(story.hotbar).filter(f => f.level === 'BLOCK')
  if (bad.length) throw new Error(`story.json "hotbar": ${bad.map(f => f.msg).join('; ')}`)
  const items = hotbarItems(story.hotbar)
  await ctx.hotbar(items)
  ctx.storyHotbar = items
  if (ctx.log) ctx.log(`story hotbar: ${items.map(x => x ? `${x[0]}${x[1] > 1 ? ' x' + x[1] : ''}` : '-').join(', ')}`)
  return items
}
module.exports.HOTBAR_MIN = HOTBAR_MIN
module.exports.hotbarEntry = hotbarEntry
module.exports.checkHotbar = checkHotbar
module.exports.hotbarItems = hotbarItems
module.exports.mergeHotbar = mergeHotbar
module.exports.applyStoryHotbar = applyStoryHotbar
