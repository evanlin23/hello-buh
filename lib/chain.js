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
