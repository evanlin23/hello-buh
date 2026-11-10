// A potion's colour, as the vanilla client tints it (PotionContents.getColor, 1.21.11): the custom colour if the stack
// has one, else the average of its effects' colours weighted by amplifier + 1 (getColorOptional: visible effects only),
// else BASE_POTION_COLOR (0x385DC6, the water bottle's blue). Used for the potion overlay of potions, splash and
// lingering potions and the head of tipped arrows in the HUD and container screens (lib/harness.js records the colour,
// edit.py tints `item/potion_overlay` with it, like renderer/entities.js does for thrown potions).
const BASE = 0x385DC6

// MobEffects colours (1.21.11)
const EFFECT_COLOR = {
  speed: 0x33EBFF, slowness: 0x8BAFE0, haste: 0xD9C043, mining_fatigue: 0x4A4217, strength: 0xFFC700, instant_health: 0xF82423,
  instant_damage: 0xA9656A, jump_boost: 0xFDFF84, nausea: 0x551D4A, regeneration: 0xCD5CAB, resistance: 0x9146F0, fire_resistance: 0xFF9900,
  water_breathing: 0x98DAC0, invisibility: 0xF6F6F6, blindness: 0x1F1F23, night_vision: 0xC2FF66, hunger: 0x587653, weakness: 0x484D48,
  poison: 0x87A363, wither: 0x736156, health_boost: 0xF87D23, absorption: 0x2552A5, saturation: 0xF82423, glowing: 0x94A061,
  levitation: 0xCEFFFF, luck: 0x59C106, unluck: 0xC0A44D, slow_falling: 0xF3CFB9, conduit_power: 0x1DC2D1, dolphins_grace: 0x88A3BE,
  bad_omen: 0x0B6138, hero_of_the_village: 0x44FF44, darkness: 0x292721, trial_omen: 0x16A6A6, raid_omen: 0xDE4058, wind_charged: 0xBDC9FF,
  weaving: 0x78695A, oozing: 0x99FFA3, infested: 0x8C9B8C
}
// the mob_effect registry's network ids (the server's registries report, 1.21.11): a custom effect names its effect by id
const EFFECT_IDS = ['speed', 'slowness', 'haste', 'mining_fatigue', 'strength', 'instant_health', 'instant_damage', 'jump_boost', 'nausea',
  'regeneration', 'resistance', 'fire_resistance', 'water_breathing', 'invisibility', 'blindness', 'night_vision', 'hunger', 'weakness',
  'poison', 'wither', 'health_boost', 'absorption', 'saturation', 'glowing', 'levitation', 'luck', 'unluck', 'slow_falling', 'conduit_power',
  'dolphins_grace', 'bad_omen', 'hero_of_the_village', 'darkness', 'trial_omen', 'raid_omen', 'wind_charged', 'weaving', 'oozing', 'infested',
  'breath_of_the_nautilus']
// the potion registry's network ids (1.21.11), the id potion_contents carries
const POTION_IDS = ['water', 'mundane', 'thick', 'awkward', 'night_vision', 'long_night_vision', 'invisibility', 'long_invisibility', 'leaping',
  'long_leaping', 'strong_leaping', 'fire_resistance', 'long_fire_resistance', 'swiftness', 'long_swiftness', 'strong_swiftness', 'slowness',
  'long_slowness', 'strong_slowness', 'turtle_master', 'long_turtle_master', 'strong_turtle_master', 'water_breathing', 'long_water_breathing',
  'healing', 'strong_healing', 'harming', 'strong_harming', 'poison', 'long_poison', 'strong_poison', 'regeneration', 'long_regeneration',
  'strong_regeneration', 'strength', 'long_strength', 'strong_strength', 'weakness', 'long_weakness', 'luck', 'slow_falling', 'long_slow_falling',
  'wind_charged', 'weaving', 'oozing', 'infested']
// Potions: each potion's effects as [effect, amplifier] (only the colour matters here: long_ variants are the base's)
const POTION_EFFECTS = {
  night_vision: [['night_vision', 0]], invisibility: [['invisibility', 0]], leaping: [['jump_boost', 0]], strong_leaping: [['jump_boost', 1]],
  fire_resistance: [['fire_resistance', 0]], swiftness: [['speed', 0]], strong_swiftness: [['speed', 1]], slowness: [['slowness', 0]],
  strong_slowness: [['slowness', 3]], turtle_master: [['slowness', 3], ['resistance', 2]], strong_turtle_master: [['slowness', 5], ['resistance', 3]],
  water_breathing: [['water_breathing', 0]], healing: [['instant_health', 0]], strong_healing: [['instant_health', 1]],
  harming: [['instant_damage', 0]], strong_harming: [['instant_damage', 1]], poison: [['poison', 0]], strong_poison: [['poison', 1]],
  regeneration: [['regeneration', 0]], strong_regeneration: [['regeneration', 1]], strength: [['strength', 0]], strong_strength: [['strength', 1]],
  weakness: [['weakness', 0]], luck: [['luck', 0]], slow_falling: [['slow_falling', 0]], wind_charged: [['wind_charged', 0]],
  weaving: [['weaving', 0]], oozing: [['oozing', 0]], infested: [['infested', 0]]
}
const strip = (s) => String(s).replace(/^minecraft:/, '')
const potionName = (p) => p === undefined || p === null ? null : typeof p === 'number' ? (POTION_IDS[p] || null) : strip(p)
const effectName = (e) => e === undefined || e === null ? null : typeof e === 'number' ? (EFFECT_IDS[e] || null) : strip(e)

// effects [[name, amplifier], ...] -> the weighted average colour, or null (none visible)
function mix (effects) {
  let r = 0, g = 0, b = 0, n = 0
  for (const [e, amp] of effects) {
    const c = EFFECT_COLOR[e]
    if (c === undefined) continue
    const w = (amp || 0) + 1
    r += w * ((c >> 16) & 255); g += w * ((c >> 8) & 255); b += w * (c & 255); n += w
  }
  return n ? (Math.floor(r / n) << 16) | (Math.floor(g / n) << 8) | Math.floor(b / n) : null
}

// potion_contents (as mineflayer gives the component's data, or as a /give string's fields) -> 0xRRGGBB
//   { potionId | potion, customColor, customEffects: [{ id | effect, details: { amplifier, showParticles } }] }
function potionColor (pc) {
  if (!pc) return BASE
  const custom = pc.customColor ?? pc.custom_color
  if (typeof custom === 'number') return custom & 0xFFFFFF
  const name = potionName(pc.potionId ?? pc.potion)
  const effects = [...(POTION_EFFECTS[(name || '').replace(/^long_/, '')] || [])]
  for (const ce of pc.customEffects || pc.custom_effects || []) {
    const d = ce.details || ce
    if (d.showParticles === false || d.show_particles === false) continue   // MobEffectInstance.isVisible
    const e = effectName(ce.id ?? ce.effect ?? ce.type)
    if (e) effects.push([e, d.amplifier || 0])
  }
  const m = mix(effects)
  return m === null ? BASE : m
}

const TINTED = /^(potion|splash_potion|lingering_potion|tipped_arrow)$/
module.exports = { potionColor, potionName, BASE, EFFECT_COLOR, POTION_EFFECTS, POTION_IDS, EFFECT_IDS, TINTED }
