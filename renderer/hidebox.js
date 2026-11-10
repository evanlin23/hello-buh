// stunt.hideBoxes (render.js HIDE_BOXES): world boxes left out of the drawn world. Shared by render.js and the mesh
// workers, which rebuild the world from the recording and must leave out exactly the same blocks.
const { Vec3 } = require('vec3')
function inHideBoxes (boxes, x, y, z) {
  for (const b of boxes) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]) return true
  return false
}
// air in the boxes (the recording's chunks; its block changes are filtered by the caller)
function hideInWorld (mesher, boxes) {
  const v = new Vec3(0, 0, 0)
  for (const b of boxes) {
    for (v.x = b[0]; v.x <= b[3]; v.x++) for (v.y = b[1]; v.y <= b[4]; v.y++) for (v.z = b[2]; v.z <= b[5]; v.z++) {
      if (mesher.world.getColumn && !mesher.world.getColumn(Math.floor(v.x / 16) * 16, Math.floor(v.z / 16) * 16)) continue
      const bl = mesher.world.getBlock(v)
      if (bl && bl.name !== 'air') mesher.world.setBlockStateId(v, 0)
    }
  }
}
module.exports = { inHideBoxes, hideInWorld }
