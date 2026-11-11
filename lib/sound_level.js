// Sound levels at record time (the harness's ctx.sound / ctx.vanillaSound): the level a `sound` mark is mixed at is
// its play volume x the event's sounds.json FILE volume (audio.py's Mixer; vanilla clamps the product to 1). A few
// events have tiny file volumes because the game plays them far louder than 1: the raid horn's file volume is 0.01 and
// the game plays it at 64 (2026-11-11: thirty_one_raids played its payoff horn at 2.2 = 0.022 in the mix: silent).
//
//   const SL = require('./sound_level')
//   SL.gain('event.raid.horn', 2.2)          -> 0.022
//   SL.vanillaVolume('event.raid.horn')       -> 64 (what the game itself passes)
//   SL.audible('event.raid.horn', 2.2)        -> false (under FLOOR, ambience aside)
//
// The table is lib/sound_volumes.json (python3 scripts/sound_levels.py --gen); the check is scripts/sound_levels.py
// (rec_check BLOCKs any mark under the floor: ./hb record stops, ./hb check fails).
const fs = require('fs')
const path = require('path')

let TAB = null
function table () {
  if (!TAB) {
    try { TAB = JSON.parse(fs.readFileSync(path.join(__dirname, 'sound_volumes.json'), 'utf8')) } catch (e) { TAB = { file: {}, play: {}, floor: 0.04, key_warn: 0.15 } }
  }
  return TAB
}
const FLOOR = () => table().floor || 0.04
const KEY_WARN = () => table().key_warn || 0.15
const AMBIENT = /^(weather\.|ambient\.|music\.|music_disc\.)/

function fileVolume (event) { const v = table().file[event]; return v === undefined ? 1 : v }
function gain (event, volume = 1) { return Math.min(1, volume * fileVolume(event)) }
function vanillaVolume (event) { return table().play[event] || 1 }
function audible (event, volume = 1) { return AMBIENT.test(event) || gain(event, volume) >= FLOOR() }

// -> null, or a warning line for a sound that would be inaudible (or quiet for a key sound) in the mix
function warning (event, volume = 1, key = false) {
  const g = gain(event, volume)
  if (AMBIENT.test(event) && !key) return null
  const fix = vanillaVolume(event) * fileVolume(event) >= FLOOR() ? `ctx.vanillaSound('${event}') plays it as the game does (volume ${vanillaVolume(event)})` : `raise the volume to >= ${(FLOOR() / Math.max(fileVolume(event), 1e-6)).toPrecision(2)}`
  const what = `${event} at volume ${volume} x file volume ${fileVolume(event)} = ${g.toFixed(3)} (${(20 * Math.log10(Math.max(g, 1e-6))).toFixed(0)} dB)`
  if (g < FLOOR()) return `INAUDIBLE${key ? ' KEY' : ''} SOUND: ${what}, under the floor ${FLOOR()}: ${fix} (rec_check blocks this)`
  if (key && g < KEY_WARN()) return `quiet key sound: ${what}, under ${KEY_WARN()}: ${fix}`
  return null
}

// a key sound's volume: at least what the game itself uses, so a payoff sound is never under the floor
function keyVolume (event, volume) {
  const v = volume === undefined ? vanillaVolume(event) : volume
  return gain(event, v) >= FLOOR() ? v : Math.max(v, vanillaVolume(event), FLOOR() / Math.max(fileVolume(event), 1e-6))
}

module.exports = { table, fileVolume, gain, vanillaVolume, audible, warning, keyVolume, FLOOR, KEY_WARN, AMBIENT }
