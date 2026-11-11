// Mob poses and held items (docs/engine_features.md "Mob poses and held items"): the renderer's pure parts, in node
// (render.js); the bone angles themselves are in renderer/entities.js. Numbers from the 1.21.11 client classes named.

// SpellcasterIllager.IllagerSpell: id -> particle colour (a staged { spell } mark takes the name or the id)
const SPELL_IDS = { vex: 1, summon_vex: 1, fangs: 2, wololo: 3, disappear: 4, blindness: 5 }
const SPELL_COLORS = { 1: [0.7, 0.7, 0.8], 2: [0.4, 0.3, 0.35], 3: [0.7, 0.5, 0.2], 4: [0.3, 0.3, 0.8], 5: [0.1, 0.1, 0.2] }
// EvokerWololoSpellGoal: the cast lasts 60 ticks (getCastingTime), the spell lands 40 ticks in (getCastWarmupTime)
const CAST_TICKS = 60, CAST_WARMUP = 40
const spellId = (v) => { const n = SPELL_IDS[v] ?? Number(v); return n > 0 && SPELL_COLORS[n] ? n : null }

// the bow skeletons (AbstractSkeleton with SkeletonModel / its renderers)
const SKELETON_BOW = /^(skeleton|stray|bogged|parched)$/
// items/bow.json while using it: use_duration x 0.05 >= 0.9 pulling_2, >= 0.65 pulling_1, else pulling_0
function bowPull (ticks) { const d = Math.max(0, ticks) * 0.05; return d >= 0.9 ? 2 : d >= 0.65 ? 1 : 0 }

// the piglin_loved item tag (data/minecraft/tags/item/piglin_loved.json, #gold_ores expanded): a piglin holding one in
// its off hand admires it (Piglin.getArmPose -> PiglinArmPose.ADMIRING_ITEM)
const PIGLIN_LOVED = /^(gold_ore|deepslate_gold_ore|nether_gold_ore|gold_block|gilded_blackstone|light_weighted_pressure_plate|gold_ingot|bell|clock|golden_carrot|glistering_melon_slice|golden_apple|enchanted_golden_apple|golden_(helmet|chestplate|leggings|boots|horse_armor|nautilus_armor|sword|spear|pickaxe|shovel|axe|hoe)|raw_gold|raw_gold_block)$/

// runs of a recorded flag per entity: rows [tick, id, name, x, y, z, yaw, pitch, headYaw, extra] -> Map id -> [[first, last]]
function recordedRuns (rows, on) {
  const M = new Map()
  for (const row of rows || []) {
    if (!on(row[9] || {}, row)) continue
    const runs = M.get(row[1]), last = runs && runs[runs.length - 1]
    if (last && last[1] >= row[0] - 1) last[1] = row[0]
    else { if (!runs) M.set(row[1], []); M.get(row[1]).push([row[0], row[0]]) }
  }
  return M
}
// the first tick of the run holding tick t (a tick past its last too: the frames between two samples)
const runStart = (M, id, t) => { const r = (M.get(id) || []).find(([a, b]) => t >= a && t <= b + 1); return r ? r[0] : null }

// SpellcasterIllager.tick (client): where a casting illager's two particles start this tick. yaw is mineflayer's
// (Java yBodyRot = PI - yaw), age the entity's tick count: f3 = yBodyRot + cos(age x 0.6662) x 0.25, the hands at
// +-(cos f3, sin f3) x 0.6, 1.8 up (x the mob's scale)
function spellHands (x, y, z, yaw, age, scale = 1) {
  const f3 = (Math.PI - yaw) + Math.cos(age * 0.6662) * 0.25, c = Math.cos(f3) * 0.6 * scale, s = Math.sin(f3) * 0.6 * scale
  return [[x + c, y + 1.8 * scale, z + s], [x - c, y + 1.8 * scale, z - s]]
}

module.exports = { SPELL_IDS, SPELL_COLORS, CAST_TICKS, CAST_WARMUP, spellId, SKELETON_BOW, bowPull, PIGLIN_LOVED, recordedRuns, runStart, spellHands }
