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

// A line of dialogue: the edit shows it as a subtitle (scripts/longform_build.py) and, later, places the
// actor's recorded voice on it. dur: seconds on screen (default: until the next line, at most 3.5 s).
function line (ctx, who, text, dur) { ctx.mark('line', { who, text, ...(dur ? { dur } : {}) }) }

module.exports = { spawnActors, quitActors, place, lookAt, nod, swing, walkTo, give, empty, shot, line, sleep }
