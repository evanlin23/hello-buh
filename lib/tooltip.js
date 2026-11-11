// An item's tooltip lines as vanilla draws them (ItemStack.getTooltipLines, default (non-advanced) tooltips):
// the hover name in its rarity colour, then one line per enchantment (stored enchantments on a book), gray, a curse
// red. -> [[text, '#RRGGBB'], ...]. Used by the harness's merchant marks (edit.py draws the tooltip box).
//
//   tooltipLines(item, registry)       item: a prismarine-item (name, count, components) or { name, ench: [[id, lvl]] }

// Item.getRarity defaults (DataComponents.RARITY; Items.java): the items whose name isn't white
const RARITY = {
  uncommon: ['enchanted_book', 'experience_bottle', 'dragon_breath', 'totem_of_undying', 'nether_star', 'creeper_head',
    'zombie_head', 'skeleton_skull', 'wither_skeleton_skull', 'player_head', 'piglin_head', 'dragon_head', 'elytra',
    'heart_of_the_sea', 'trial_key', 'ominous_trial_key', 'ominous_bottle',
    'music_disc_13', 'music_disc_cat', 'music_disc_blocks', 'music_disc_chirp', 'music_disc_far', 'music_disc_mall',
    'music_disc_mellohi', 'music_disc_stal', 'music_disc_strad', 'music_disc_ward', 'music_disc_11', 'music_disc_wait',
    'music_disc_otherside', 'music_disc_5', 'music_disc_pigstep', 'music_disc_relic', 'music_disc_creator',
    'music_disc_creator_music_box', 'music_disc_precipice', 'music_disc_tears', 'music_disc_lava_chicken'],
  rare: ['beacon', 'conduit', 'end_crystal', 'golden_apple'],
  epic: ['enchanted_golden_apple', 'command_block', 'chain_command_block', 'repeating_command_block', 'structure_block',
    'structure_void', 'jigsaw', 'barrier', 'light', 'debug_stick', 'dragon_egg', 'knowledge_book', 'mace', 'heavy_core', 'trident']
}
// ChatFormatting: COMMON white, UNCOMMON yellow, RARE aqua, EPIC light purple
const COLOR = { common: '#FFFFFF', uncommon: '#FFFF55', rare: '#55FFFF', epic: '#FF55FF' }
const BUMP = { common: 'rare', uncommon: 'rare', rare: 'epic', epic: 'epic' }   // ItemStack.getRarity when enchanted

function baseRarity (name) {
  for (const r of ['epic', 'rare', 'uncommon']) if (RARITY[r].includes(name)) return r
  return 'common'
}

// Enchantment.getFullname: the level as enchantment.level.N (I..X), left out for a max-level-1 enchantment
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
const titleCase = (id) => String(id).replace(/^minecraft:/, '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

function enchantName (id, lvl, registry) {
  const name = typeof id === 'number' ? (registry && registry.enchantments && registry.enchantments[id] && registry.enchantments[id].name) : String(id).replace(/^minecraft:/, '')
  const e = registry && registry.enchantmentsByName ? registry.enchantmentsByName[name] : null
  const base = (e && e.displayName) || titleCase(name || '?')
  const max = e ? e.maxLevel : 0
  const lv = lvl === 1 && max === 1 ? '' : ' ' + (ROMAN[lvl] || String(lvl))
  return [base + lv, (e && e.curse) || /curse/.test(name || '') ? '#FF5555' : '#AAAAAA']
}

// the enchantment list of a component's data, whatever shape the protocol library gives it
function enchList (data) {
  if (!data) return []
  const arr = Array.isArray(data) ? data : Array.isArray(data.enchantments) ? data.enchantments : Array.isArray(data.levels) ? data.levels : null
  if (arr) return arr.map(x => [x.id ?? x.name ?? x.enchantment, x.level ?? x.lvl ?? 1])
  if (typeof data === 'object') return Object.entries(data.enchantments || data.levels || data).map(([k, v]) => [k, Number(v)])
  return []
}

function itemEnchants (item) {
  if (item.ench) return { list: item.ench, stored: item.name === 'enchanted_book' }
  const comps = item.components || []
  const get = (t) => { const c = comps.find(x => x && String(x.type).replace(/^minecraft:/, '') === t); return c ? c.data : null }
  const stored = enchList(get('stored_enchantments'))
  const ench = enchList(get('enchantments'))
  return { list: ench.length ? ench : stored, stored: !ench.length && stored.length > 0, enchanted: ench.length > 0 }
}

function customName (item) {
  const c = (item.components || []).find(x => x && String(x.type).replace(/^minecraft:/, '') === 'custom_name')
  if (!c) return null
  const flat = (x) => typeof x === 'string' ? x : Array.isArray(x) ? x.map(flat).join('') : x && typeof x === 'object' ? ('value' in x && Object.keys(x).length <= 2 ? flat(x.value) : flat(x.text ?? x[''] ?? '') + (x.extra ? flat(x.extra) : '')) : ''
  return flat(c.data) || null
}

function tooltipLines (item, registry) {
  if (!item || !item.name) return []
  const en = itemEnchants(item)
  let r = baseRarity(item.name)
  if (en.enchanted || (item.ench && item.name !== 'enchanted_book')) r = BUMP[r]   // isEnchanted: the ENCHANTMENTS component, not a book's stored ones
  const reg = registry && registry.itemsByName ? registry.itemsByName[item.name] : null
  const title = customName(item) || (reg && reg.displayName) || titleCase(item.name)
  return [[title, COLOR[r]], ...en.list.map(([id, lvl]) => enchantName(id, lvl, registry))]
}

module.exports = { tooltipLines, enchantName, enchList }
