// Special item models (items/<name>.json type 'minecraft:special': beds, chests, shulker boxes, heads,
// banners): drawn by their block-entity renderer (renderer/blockentities.js) in the model's 0..1 space,
// after the base model's display transform for the context. Returns { pieces: [block-entity entries at
// the origin], display: { gui, firstperson_righthand, thirdperson_righthand, ground } } or null.
// (BedRenderer.renderInHand: the head at z 0 and the foot at z -1, facing south; ChestSpecialRenderer
// and ShulkerBoxRenderer.renderInHand: the block's own transform facing south / up; SkullSpecialRenderer:
// a floor skull at yRot 180; BannerRenderer.renderInHand: a standing banner at rotation 0)
const SPECIAL_SKULL = { skeleton: ['entity/skeleton/skeleton', false], wither_skeleton: ['entity/skeleton/wither_skeleton', false], zombie: ['entity/zombie/zombie', true], creeper: ['entity/creeper/creeper', false], player: ['entity/player/wide/steve', true] }
const SPECIAL_DYE = { white: 0xF9FFFE, orange: 0xF9801D, magenta: 0xC74EBD, light_blue: 0x3AB3DA, yellow: 0xFED83D, lime: 0x80C71F, pink: 0xF38BAA, gray: 0x474F52, light_gray: 0x9D9D97, cyan: 0x169C9C, purple: 0x8932B8, blue: 0x3C44AA, brown: 0x835432, green: 0x5E7C16, red: 0xB02E26, black: 0x1D1D21 }
// specialItems(jarJson) -> specialItem(name), cached; jarJson(path in the client jar) -> parsed JSON or null
function specialItems (jarJson) {
  const SPECIAL = new Map()
  return function specialItem (item) {
    if (SPECIAL.has(item)) return SPECIAL.get(item)
    let m = (jarJson(`assets/minecraft/items/${item}.json`) || {}).model, out = null
    for (let k = 0; k < 4 && m && m.type !== 'minecraft:special'; k++) m = m.fallback || m.on_false || null   // select / condition: the default case
    const sp = m && m.type === 'minecraft:special' && m.model, tex = sp && String(sp.texture || '').replace(/^minecraft:/, '')
    let pieces = null
    if (sp && sp.type === 'minecraft:bed') pieces = [{ kind: 'bed', x: 0, y: 0, z: 0, rot: 0, head: true, color: tex }, { kind: 'bed', x: 0, y: 0, z: -1, rot: 0, head: false, color: tex }]
    else if (sp && sp.type === 'minecraft:chest' && /^(normal|trapped|ender)$/.test(tex)) pieces = [{ kind: 'chest', x: 0, y: 0, z: 0, rot: 0, type: 'single', tex, open: 0 }]
    else if (sp && sp.type === 'minecraft:shulker_box') pieces = [{ kind: 'shulker', x: 0, y: 0, z: 0, facing: 'up', tex }]
    else if (sp && sp.type === 'minecraft:head' && SPECIAL_SKULL[sp.kind]) pieces = [{ kind: 'skull', x: 0, y: 0, z: 0, rot: 180, tex: SPECIAL_SKULL[sp.kind][0], humanoid: SPECIAL_SKULL[sp.kind][1] }]   // face to the south (+z), toward the GUI view
    else if (sp && sp.type === 'minecraft:banner' && SPECIAL_DYE[sp.color] !== undefined) { const c = SPECIAL_DYE[sp.color]; pieces = [{ kind: 'banner', x: 0, y: 0, z: 0, rot: 0, tint: [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255], wave: 0 }] }
    if (pieces) {
      const display = {}
      let name = String(m.base || '').replace(/^minecraft:/, '')
      for (let k = 0; k < 8 && name; k++) {
        const md = jarJson(`assets/minecraft/models/${name}.json`)
        if (!md) break
        for (const [ctx, d] of Object.entries(md.display || {})) if (!display[ctx]) display[ctx] = d
        name = md.parent && md.parent.replace(/^minecraft:/, '')
      }
      out = { key: `special:${item}`, pieces, display }
    }
    SPECIAL.set(item, out)
    return out
  }
}

module.exports = { specialItems }
