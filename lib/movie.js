// Movie kit (docs/movie_engine.md): cast members played by extra bots, the camera director's shot
// marks, and dialogue marks. A movie scene is an ordinary stunt module (setup/perform/edit) that also
// exports `cast` and `shots`:
//
//   cast:  { Highkeeper: 'efe', self: 'kai' }   username -> one of the jar's wide player skins
//                                                (steve alex ari efe kai makena noor sunny zuri);
//                                                `self` is the recording bot (the POV character)
//   shots: { wide: { path: [[0, 40, 10, -30], [5, 30, 6, -20]], look: [0, 0, 0] },
//            ots:  { follow: 'actor:Highkeeper', offset: [2, 0.4, 3], look: 'self' },
//            pov:  { pov: true } }                (render.js has the full spec)
//
// In perform:  const M = require('../lib/movie')
//              const cast = await M.spawnActors(ctx, ['Highkeeper'])
//              await M.place(ctx, 'Highkeeper', x, y, z, yawDeg, pitchDeg)
//              M.shot(ctx, 'wide')          // switches the camera (and the HUD, on POV shots only)
//              M.line(ctx, 'Highkeeper', 'How many in your family?')
//              await M.lookAt(cast.Highkeeper, ctx.bot.entity.position.offset(0, 1.62, 0), 400)
//              M.swing(cast.Highkeeper)     // a gesture on a line, or a hand-over
const mineflayer = require('mineflayer')

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// One extra bot per cast member, on the same local server (offline mode, so any username works).
// They aren't ops: the recording bot moves them with /tp and equips them with /item.
async function spawnActors (ctx, names) {
  const out = {}
  for (const name of names) {
    const b = mineflayer.createBot({ host: '127.0.0.1', port: Number(process.env.MC_PORT || 25565), username: name, auth: 'offline', viewDistance: 'tiny', respawn: true, version: process.env.MC_VERSION || '1.21.11' })
    b.on('kicked', r => ctx.log(`actor ${name} kicked`, r))
    b.on('error', e => ctx.log(`actor ${name} error`, e && e.message))
    await new Promise((resolve, reject) => { b.once('spawn', resolve); setTimeout(() => reject(new Error(`actor ${name} did not spawn`)), 30000) })
    ctx.log('actor spawned', name)
    out[name] = b
  }
  ctx.actors = Object.assign(ctx.actors || {}, out)
  return out
}

function quitActors (ctx) { for (const b of Object.values(ctx.actors || {})) { try { b.quit() } catch (e) {} } }

// Put a cast member somewhere, already facing a way (mineflayer's /tp: yaw 0 = south, degrees).
// Not a camera cut: only the recording bot's own /tp @s is one (lib/harness.js ctx.cmd).
async function place (ctx, name, x, y, z, yawDeg = 0, pitchDeg = 0) {
  await ctx.cmd(`/tp ${name} ${x} ${y} ${z} ${yawDeg} ${pitchDeg}`)
}

// Turn an actor's head (and body, by the renderer's tickHeadTurn) toward a point, eased over ms.
async function lookAt (actor, p, ms = 300) {
  const eye = actor.entity.position.offset(0, 1.62, 0)
  const d = p.minus(eye)
  const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
  const y0 = actor.entity.yaw, p0 = actor.entity.pitch, steps = Math.max(1, Math.round(ms / 50))
  let dy = yaw - y0; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    await actor.look(y0 + dy * e, p0 + (pitch - p0) * e, true)
    await sleep(50)
  }
}

// A nod: the head dips and comes back (pitch only), about 0.6 s.
async function nod (actor) {
  const y = actor.entity.yaw, p = actor.entity.pitch
  for (const dp of [0.15, 0.3, 0.35, 0.25, 0.1, 0]) { await actor.look(y, p + dp, true); await sleep(100) }
}

function swing (actor) { actor.swingArm('right') }

// More acting (each eased, about half a second unless said):
// a head shake (no), a look away (yaw degrees, held), a point (swing + look at a point), a step back.
async function shake (actor) {
  const y = actor.entity.yaw, p = actor.entity.pitch
  for (const dy of [0.25, -0.25, 0.2, -0.15, 0]) { await actor.look(y + dy, p, true); await sleep(90) }
}
async function lookAway (actor, deg = 60, ms = 500) {
  const p = actor.entity.position.offset(0, 1.62, 0), y = actor.entity.yaw + deg * Math.PI / 180
  await lookAt(actor, p.offset(-Math.sin(y) * 5, 0, -Math.cos(y) * 5), ms)
}
async function point (actor, at, ms = 300) { await lookAt(actor, at, ms); actor.swingArm('right') }
async function stepBack (actor, ticks = 6) {
  actor.setControlState('back', true); await sleep(ticks * 50); actor.setControlState('back', false)
}

// A shot that starts `ticks` from now, so a scene can get its actors moving first: never open a shot on a cast
// standing still (owner, 2026-11-08: "the scenes would start with everyone motionless ... there should be no pause").
//   M.shotIn(ctx, 'two', 8); M.walkTo(hk, x, z)   // the cut lands 8 ticks into the walk
function shotIn (ctx, name, ticks) { ctx.bot.waitForTicks(Math.max(0, ticks)).then(() => shot(ctx, name)) }

// Keep an actor's head on a moving point (another actor walking away, the recording bot) until stop() is called:
// a listener who watches someone leave (reel 1 review v2: the Highkeeper stared at the empty deck while Ash walked
// out). `p` is a function returning the point; the head eases a third of the way there every 2 ticks.
function track (actor, p, { every = 100 } = {}) {
  let on = true
  ;(async () => {
    while (on) {
      try {
        const eye = actor.entity.position.offset(0, 1.62, 0), d = p().minus(eye)
        const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        let dy = yaw - actor.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        await actor.look(actor.entity.yaw + dy / 3, actor.entity.pitch + (pitch - actor.entity.pitch) / 3, true)
      } catch (e) {}
      await sleep(every)
    }
  })()
  return () => { on = false }
}

// Slide blocks one way, as a set piece the viewer watches (a Well sliding off its cap): the server moves them in
// one tick (/clone ... move), the renderer slides them over `ticks` (render.js 'slide_blocks'). box = [x0, y0, z0,
// x1, y1, z1] (inclusive), by = [dx, dy, dz], names = the blocks in the box, [[x, y, z, 'water'], ...]. Sent with
// bot.chat so it runs on this tick (ctx.cmd waits for the reply: a tick or two late at terminal velocity).
function slideBlocks (ctx, box, by, names, ticks = 4) {
  ctx.mark('slide_blocks', { blocks: names, by, ticks })
  const [x0, y0, z0, x1, y1, z1] = box
  ctx.bot.chat(`/clone ${x0} ${y0} ${z0} ${x1} ${y1} ${z1} ${x0 + by[0]} ${y0 + by[1]} ${z0 + by[2]} replace move`)
}

// Walk an actor in a straight line to (x, z) with real player physics (forward key held, facing the
// target); stops within 0.25 blocks or after `maxMs`. sprint: true for a run.
async function walkTo (actor, x, z, { sprint = false, maxMs = 15000 } = {}) {
  const t0 = Date.now()
  actor.setControlState('sprint', sprint)
  for (;;) {
    const p = actor.entity.position, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz)
    if (d < 0.25 || Date.now() - t0 > maxMs) break
    await actor.look(Math.atan2(-dx, -dz), actor.entity.pitch, true)
    actor.setControlState('forward', true)
    await sleep(50)
  }
  actor.setControlState('forward', false); actor.setControlState('sprint', false)
}

// Main-hand items, through the recording bot's commands (recorded as entity equipment).
async function give (ctx, name, item) { await ctx.cmd(`/item replace entity ${name} weapon.mainhand with ${item}`) }
async function empty (ctx, name) { await ctx.cmd(`/item replace entity ${name} weapon.mainhand with air`) }

// The camera director: a 'shot' mark switches render.js to stunt.shots[name] from this tick on. The
// HUD and the first-person hand show only on POV shots (f1_on / f1_off: edit.py and render.js F1).
function shot (ctx, name) {
  const spec = (ctx.stunt && ctx.stunt.shots && ctx.stunt.shots[name]) || null
  if (!spec) ctx.log(`shot ${name}: not in stunt.shots`)
  const pov = !!(spec && spec.pov)
  if (pov && ctx._f1) { ctx.mark('f1_off'); ctx._f1 = false }
  if (!pov && !ctx._f1) { ctx.mark('f1_on'); ctx._f1 = true }
  ctx.mark('shot', { name })
}

// A line WITH its acting, the way to write dialogue (docs/movie_engine.md): marks the line, the speaker talks (a turn
// toward the listener, a nod in the middle, a gesture on a question or an exclamation), every listener turns to the
// speaker and nods as it ends, and the call returns after the line's reading time, so the next beat starts as the
// line ends. Without it, dialogue was people standing still (the lint's "nobody moves", review v2 V1).
//   await M.say(ctx, 'Highkeeper', 'How many in your family?', { to: 'Ash' })
// who / to: an actor's name, or the recording bot's character name (stunt.selfName) or 'self'. to defaults to
// everyone else in the cast within 8 blocks. gesture: 'auto' | 'swing' | 'none'. hold: extra ticks after the line.
const readingMs = (text) => 1000 * Math.max(1, Math.min(4.5, 0.8 + 0.06 * String(text).length))
function who2 (ctx, name) {
  if (!name || name === 'self' || name === (ctx.stunt && ctx.stunt.selfName)) return { self: true, bot: ctx.bot }
  const b = ctx.actors && ctx.actors[name]
  return b ? { self: false, bot: b } : null
}
async function headTo (w, p, ms) {
  if (w.self) { const e = w.bot.entity.position.offset(0, 1.62, 0), d = p.minus(e); await w.bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true); return }
  await lookAt(w.bot, p, ms)
}
async function say (ctx, who, text, { to = null, gesture = 'auto', hold = 0 } = {}) {
  line(ctx, who, text)
  const sp = who2(ctx, who), ms = readingMs(text), t0 = Date.now()
  const eye = (w) => w.bot.entity.position.offset(0, w.self ? 1.62 : (w.bot.entity.metadata && (w.bot.entity.metadata[0] & 2) ? 1.27 : 1.62), 0)
  const names = [ctx.stunt && ctx.stunt.selfName ? ctx.stunt.selfName : 'self', ...Object.keys(ctx.actors || {})].filter(n => n !== who && !(who === 'self' && n === (ctx.stunt && ctx.stunt.selfName)))
  const listeners = (to ? [].concat(to) : names).map(n => who2(ctx, n)).filter(w => w && sp && w.bot !== sp.bot && w.bot.entity.position.distanceTo(sp.bot.entity.position) < 8)
  const jobs = []
  // the listeners turn to the speaker (the recording bot eases; it's the camera on POV shots)
  for (const w of listeners) jobs.push(w.self ? w.bot.lookAt(eye(sp), false).catch(() => {}) : lookAt(w.bot, eye(sp), 300))
  // the speaker: toward the first listener, a nod in the middle, a gesture on a question or an exclamation
  if (sp) {
    jobs.push((async () => {
      if (listeners[0]) await headTo(sp, eye(listeners[0]), 250)
      await sleep(Math.max(0, ms * 0.35 - 250))
      const y = sp.bot.entity.yaw, p = sp.bot.entity.pitch
      for (const dp of [0.12, 0.22, 0.25, 0.15, 0.05, 0]) { await sp.bot.look(y, p + dp, true); await sleep(70) }
      if (gesture === 'swing' || (gesture === 'auto' && /[?!]\s*$/.test(text))) sp.bot.swingArm('right')
      await sp.bot.look(y + (/[?]\s*$/.test(text) ? 0.12 : -0.08), p, true)
    })())
  }
  await Promise.all(jobs)
  await sleep(Math.max(0, ms - (Date.now() - t0) - 350))
  // the listeners nod as it ends: they heard it
  await Promise.all(listeners.filter(w => !w.self).map(w => nod(w.bot)))
  if (hold) await ctx.bot.waitForTicks(hold)
}

// A line of dialogue: the edit shows it as a subtitle (scripts/longform_build.py) and, later, places the
// actor's recorded voice on it. dur: seconds on screen (default: until the next line, at most 3.5 s).
function line (ctx, who, text, dur) { ctx.mark('line', { who, text, ...(dur ? { dur } : {}) }) }

module.exports = { spawnActors, quitActors, place, lookAt, track, nod, swing, shake, lookAway, point, stepBack, walkTo, give, empty, shot, shotIn, line, say, readingMs, slideBlocks, sleep }
