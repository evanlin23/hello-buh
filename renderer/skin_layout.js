// Pure pixel work on a 64x64 player skin (RGBA bytes, row-major), shared by the page (entities.js) and the tests.
// No three.js, no DOM: `px` is { data: Uint8ClampedArray|Uint8Array, width } like an ImageData.

// the four arm boxes (box UV origin): right arm, right sleeve, left arm, left sleeve; 12 high, 4 deep
export const ARM_BOXES = [[40, 16], [40, 32], [32, 48], [48, 48]]

const at = (px, x, y) => (y * px.width + x) * 4

// A skin painted for slim (3 px) arms but uploaded as classic leaves the wide arm's 4th column empty: the right
// arm's back face x 54-55 and bottom x 50-51, the left arm's x 46-47 and 42-43 (all transparent), while its slim
// faces are painted (x 50-53 rows 20-31).
export function isSlimLayout (px) {
  const k = px.width / 64
  const clear = (x, y, w, h) => { for (let j = y * k; j < (y + h) * k; j++) for (let i = x * k; i < (x + w) * k; i++) if (px.data[at(px, i, j) + 3]) return false; return true }
  return clear(54, 20, 2, 12) && clear(50, 16, 2, 4) && clear(46, 52, 2, 12) && clear(42, 48, 2, 4) && !clear(50, 20, 4, 12)
}

// Slim art -> the classic (wide) layout, in place, the way skin editors convert it: each arm box (both arms, base
// and sleeve) is rebuilt 4 px wide. The 3-px faces (top, bottom, front, back) get their middle column doubled
// (a b c -> a b b c), so their edge columns (beside the side faces) are kept; the two 4-px side faces are moved
// unchanged. Only 64x64 skins (k = 1).
export function slimToWide (px) {
  if (px.width !== 64) return false
  const d = 4, h = 12, ws = 3
  for (const [u, v] of ARM_BOXES) {
    const src = (x, y) => px.data.slice(at(px, x, y), at(px, x, y) + 4)
    // slim face rects [x, y, w, rows] -> wide x
    const faces = [
      [u + d, v, ws, d, u + d],                    // top
      [u + d + ws, v, ws, d, u + d + 4],           // bottom
      [u, v + d, d, h, u],                         // outer side (unchanged)
      [u + d, v + d, ws, h, u + d],                // front
      [u + d + ws, v + d, d, h, u + d + 4],        // inner side (moved right by 1)
      [u + 2 * d + ws, v + d, ws, h, u + 2 * d + 4] // back
    ]
    const cols = faces.map(([x, y, w, rows]) => { const c = []; for (let i = 0; i < w; i++) { const col = []; for (let j = 0; j < rows; j++) col.push(src(x + i, y + j)); c.push(col) } return c })
    // clear the box's rows (top strip: 16 wide from u + d; body: 16 wide from u)
    for (let j = v; j < v + d; j++) for (let x = u + d; x < u + d + 8; x++) px.data.fill(0, at(px, x, j), at(px, x, j) + 4)
    for (let j = v + d; j < v + d + h; j++) for (let x = u; x < u + 16; x++) px.data.fill(0, at(px, x, j), at(px, x, j) + 4)
    faces.forEach(([, y, w, rows, nx], fi) => {
      const c = cols[fi], out = w === ws ? [c[0], c[1], c[1], c[2]] : c
      out.forEach((col, i) => col.forEach((p, j) => px.data.set(p, at(px, nx + i, y + j))))
    })
  }
  return true
}

// A downloaded skin's base layer is opaque (SkinTextureDownloader.processLegacySkin setNoAlpha on (0,0)-(32,16),
// (0,16)-(64,32), (16,48)-(48,64)): a transparent base pixel shows its colour, never a hole; only the overlays
// (hat, jacket, sleeves, pants) are cut out by alpha.
export function opaqueBase (px) {
  const k = px.width / 64
  for (const [x0, y0, x1, y1] of [[0, 0, 32, 16], [0, 16, 64, 32], [16, 48, 48, 64]]) {
    for (let j = y0 * k; j < y1 * k; j++) for (let i = x0 * k; i < x1 * k; i++) px.data[at(px, i, j) + 3] = 255
  }
}
