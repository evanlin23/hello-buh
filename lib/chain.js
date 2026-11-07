// Helpers for the chain-reaction Shorts (worker 17): the contraption is real vanilla redstone,
// built with commands before the recording; nothing is triggered by command during the take.
//
// relaySounds: the server's own sound packets (pistons, note blocks, dispensers, arrows, rails,
//   bells, anvils, TNT fuses...) become `sound` marks, so audio.py plays exactly what vanilla
//   played. Our sound marks aren't distance-attenuated, so this applies vanilla's falloff
//   (SoundEngine: linear to 0 at 16 x max(volume, 1) blocks from the listener).
// watch: fires a mark the first time a block at a position matches a test (the chain's beats:
//   the target block lit, the anvil landed, the detector rail clicked...), so the camera and the
//   edit follow what the server really did, whenever it happened.
const SKIP = /^(entity\.generic\.explode|block\.grass\.step|block\.stone\.step|entity\.player\.)/

function soundName (mcd, holder) {
  if (!holder) return null
  if (holder.soundId > 0) { const s = mcd.sounds[holder.soundId - 1]; return s ? s.name : null }
  const d = holder.data || holder.soundEvent || holder
  const n = d.soundName || d.resource || d.sound_id || d.soundEvent
  return n ? String(n).replace(/^minecraft:/, '') : null
}

function relaySounds (ctx, { log = false } = {}) {
  const { bot } = ctx
  const mcd = require('minecraft-data')(bot.version)
  const play = (name, pos, volume, pitch) => {
    if (!name || SKIP.test(name)) return
    const eye = bot.entity.position.offset(0, 1.62, 0)
    const d = pos ? eye.distanceTo(pos) : 0
    const range = 16 * Math.max(1, volume)
    const v = Math.min(1, volume) * Math.max(0, 1 - d / range)
    if (v < 0.02) return
    if (log) ctx.log('sound', name, d.toFixed(1), v.toFixed(2), pitch.toFixed(2))
    ctx.sound(name, +v.toFixed(3), +pitch.toFixed(3))
  }
  const onPos = (p) => play(soundName(mcd, p.sound), new ctx.Vec3(p.x / 8, p.y / 8, p.z / 8), p.volume, p.pitch)
  const onEnt = (p) => { const e = bot.entities[p.entityId]; play(soundName(mcd, p.sound), e ? e.position : null, p.volume, p.pitch) }
  bot._client.on('sound_effect', onPos)
  bot._client.on('entity_sound_effect', onEnt)
  return () => { bot._client.removeListener('sound_effect', onPos); bot._client.removeListener('entity_sound_effect', onEnt) }
}

// One mark per watched step, on the tick the block first matches. steps: [{ name, pos: Vec3, test(block) }]
function watch (ctx, steps) {
  const { bot } = ctx
  const done = new Map()
  const check = () => {
    for (const s of steps) {
      if (done.has(s.name)) continue
      const b = bot.blockAt(s.pos)
      if (b && s.test(b)) { done.set(s.name, ctx.tick); ctx.mark(s.name); if (s.on) s.on() }
    }
  }
  bot.on('physicsTick', check)
  return { done, stop: () => bot.removeListener('physicsTick', check) }
}

// Kill the mobs a set clear leaves wandering about (wolves, cows, villagers from a nearby village).
async function clearMobs (ctx, x, z, r = 96) {
  await ctx.cmd(`/kill @e[type=!player,x=${x - r},y=-64,z=${z - r},dx=${2 * r},dy=400,dz=${2 * r}]`)
}

module.exports = { relaySounds, watch, clearMobs, soundName }

// The camera rig every chain Short uses: an aim point eased toward `focus` every physics tick (a
// slow loop pass can never freeze the shot), and steering toward `steer` by strafing whichever way
// the camera faces, sprinting when asked (only forward movement sprints, as in vanilla).
//   const r = rig(ctx, steps)       steps as for watch()
//   r.focus = vec; r.k = 0.15; r.steer = vec | null; r.sprint = true
//   await r.until(() => r.at('name'), maxTicks); await r.follow('minecart', [dx, dy, dz], done, max)
//   r.markOnce('name'); r.stop()
function rig (ctx, steps = []) {
  const { bot } = ctx
  const y0 = bot.entity.yaw, p0 = bot.entity.pitch
  const r = {
    aim: bot.entity.position.offset(-Math.sin(y0) * Math.cos(p0) * 4, 1.62 + Math.sin(p0) * 4, -Math.cos(y0) * Math.cos(p0) * 4),
    focus: null, k: 0.16, steer: null, sprint: false, onTick: null
  }
  r.focus = r.aim
  const w = watch(ctx, steps)
  r.done = w.done
  r.at = (name) => w.done.get(name)
  r.markOnce = (name) => { if (!w.done.has(name)) { w.done.set(name, ctx.tick); ctx.mark(name) } }
  const keys = ['forward', 'back', 'left', 'right', 'sprint']
  const tick = () => {
    r.aim = r.aim.plus(r.focus.minus(r.aim).scaled(r.k))
    const eye = bot.entity.position.offset(0, 1.62, 0), d = r.aim.minus(eye)
    bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
    const p = bot.entity.position
    if (r.steer) {
      const dx = r.steer.x - p.x, dz = r.steer.z - p.z, yw = bot.entity.yaw
      const f = -Math.sin(yw) * dx - Math.cos(yw) * dz, s = Math.cos(yw) * dx - Math.sin(yw) * dz
      const far = Math.hypot(dx, dz) > 0.5
      bot.setControlState('forward', far && f > 0.3); bot.setControlState('back', far && f < -0.3)
      bot.setControlState('right', far && s > 0.3); bot.setControlState('left', far && s < -0.3)
      bot.setControlState('sprint', far && r.sprint && f > 0.3)
    } else for (const c of keys) bot.setControlState(c, false)
    if (r.onTick) r.onTick()
  }
  bot.on('physicsTick', tick)
  r.until = async (cond, max = 200) => { for (let i = 0; i < max && !cond(); i++) await bot.waitForTicks(1) }
  r.ent = (name, pick) => {
    const all = Object.values(bot.entities).filter(e => e.name === name)
    return pick ? all.reduce((a, e) => (!a || pick(e, a)) ? e : a, null) : all[0]
  }
  r.follow = async (name, off, done, max = 200, pick) => {
    for (let i = 0; i < max && !done(); i++) { const e = r.ent(name, pick); if (e) r.focus = e.position.offset(...off); await bot.waitForTicks(1) }
  }
  r.stop = () => { bot.removeListener('physicsTick', tick); for (const c of keys) bot.setControlState(c, false); w.stop() }
  return r
}

module.exports.rig = rig
