'use strict'
// A dropped stack draws more than one item (vanilla ItemEntityRenderer): 1 model for 1 item, 2 for 2-16, 3 for 17-32,
// 4 for 33-48, 5 for 49+ (getRenderedAmount). We drew one for any count (visual audit 2026-11-10: the 64 gold
// ingots thrown in gold_for_the_portal read as one ingot).
function renderedAmount (count) {
  const n = Number(count) || 1
  return n > 48 ? 5 : n > 32 ? 4 : n > 16 ? 3 : n > 1 ? 2 : 1
}
// renderMultipleFromCount: a flat (non-3D) item's copies sit 0.09375 x the ground scale apart along its depth (z),
// centred on the stack; every copy after the first is jittered by up to 0.15 * 0.5 in x and y; a block item's copies
// by up to 0.15 in x, y and z. The jitter comes from a Random seeded per item (here: the entity id, deterministic, so a
// frame renders the same every time). Offsets in blocks, in the item's own (spinning) frame. null for one item.
function stackOffsets (count, seed, scale = [1, 1, 1], block = false) {
  const n = renderedAmount(count)
  if (n < 2) return null
  let st = (Math.abs(Math.floor(seed)) * 2654435761 + 12345) % 2147483647 || 1
  const rnd = () => { st = (st * 16807) % 2147483647; return st / 2147483647 }
  const sx = scale[0] || 1, sy = scale[1] || 1, sz = scale[2] || 1
  const out = []
  const z0 = block ? 0 : -0.09375 * (n - 1) * 0.5 * sz
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = block ? 0 : z0 + 0.09375 * i * sz
    if (i > 0) {
      if (block) { x = (rnd() * 2 - 1) * 0.15 * sx; y = (rnd() * 2 - 1) * 0.15 * sy; z = (rnd() * 2 - 1) * 0.15 * sz } else { x = (rnd() * 2 - 1) * 0.15 * 0.5 * sx; y = (rnd() * 2 - 1) * 0.15 * 0.5 * sy }
    }
    out.push([+x.toFixed(4), +y.toFixed(4), +z.toFixed(4)])
  }
  return out
}
module.exports = { renderedAmount, stackOffsets }
