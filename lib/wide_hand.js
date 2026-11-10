'use strict'
// Where the first-person hand sits when a wide master is cropped to a narrower game view (stunt.wideMaster).
// The page places the held item at HAND_X of the half-width from the centre, HAND_X = min(1, aspect / (16/9)), so a
// near-square game view keeps vanilla's 16:9 hand position. With a wide master the page's aspect is the master's
// (16:9 -> HAND_X 1) and the crop to the 1080-wide game view cut the hand and every held item off at the right edge
// (visual audit 2026-11-10: the music disc in light_sleeper L10, the bare hand on every POV line).
// Fixed: HAND_X from the OUTPUT width. Same vertical fov, so the rest point lands on the same pixel as in a render at
// the output size. On for recordings the harness marks `wideHand: true` (from 2026-11-10), or stunt.wideHand / WIDE_HAND=1;
// published recordings (no flag) render exactly as before.
function handX (w, h) { return Math.min(1, (w / h) / (16 / 9)) }
// -> the handX to pass to the page, or null (keep the page's own, from the master size)
function wideHandX ({ outW, masterW, H, rec = {}, stunt = {}, env = {} }) {
  if (!(masterW > outW)) return null
  const on = env.WIDE_HAND !== undefined && env.WIDE_HAND !== '' ? env.WIDE_HAND === '1' : (stunt.wideHand ?? !!rec.wideHand)
  return on ? handX(outW, H) : null
}
// the item's rest point: its horizontal angle off the view axis (radians) after the page's HAND_TURN, and where that
// lands in pixels from the centre for a frame W x H at a vertical fov (degrees). Used by the tests.
function restAngle (hx) { return Math.atan(0.56 * hx / 0.72) }
function restPixels (hx, w, h, fovDeg = 70) { const tx = Math.tan(fovDeg * Math.PI / 360) * (w / h); return Math.tan(restAngle(hx)) / tx * (w / 2) }
module.exports = { handX, wideHandX, restAngle, restPixels }
