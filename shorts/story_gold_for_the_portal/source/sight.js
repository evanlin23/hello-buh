// Line of sight to the blocks a player breaks or places on (owner, 2026-11-10: "sometimes there will be a block in
// the way. we need to ensure there is a clear line of sight to the stuff we are placing or breaking", STANDARDS 3b.4).
// Pure geometry over a block world given as shapesAt(x, y, z) -> the block's collision boxes there, block-local
// [[x0, y0, z0, x1, y1, z1], ...] (mineflayer's block.shapes, prismarine-block's Block.shapes), or null / [] for none.
// Used by the story kit (lib/story.js K.dig / K.place pick the face and point the eye can see, and the stand spot
// that sees one when none does) and by the recording check (scripts/rec_sight.js, run by scripts/rec_check.py).
//   rayFirst      the first block a ray from o along d hits within maxT (a DDA walk through the voxels)
//   crosshair     the crosshair from an eye along (yaw, pitch): does it reach `target` with nothing in front of it?
//   visiblePoint  the best point on a block's face the eye can see (the face toward the eye first), or the blocker
//   bestOf        the best visible point over several candidate targets (a place: each block it can go against)
//   standSpot     the nearest place to stand from which one of them is visible
// Angles in radians, mineflayer's convention (yaw 0 = north (-z), increasing to the west; pitch up positive).

const FULL = [0, 0, 0, 1, 1, 1]
const FACES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
// vanilla survival block reach (Player.blockInteractionRange, 1.20.5+): 4.5 from the eye
const REACH = 4.5

const dirOf = (yaw, pitch) => [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)]
const key = (x, y, z) => `${x},${y},${z}`
const flo = (p) => [Math.floor(p.x ?? p[0]), Math.floor(p.y ?? p[1]), Math.floor(p.z ?? p[2])]
const arr = (p) => Array.isArray(p) ? p : [p.x, p.y, p.z]

// slab test of the ray o + t d against box b (world coords [x0, y0, z0, x1, y1, z1]) -> [tIn, tOut, axis of entry] or null
function slab (o, d, b) {
  let t0 = -Infinity, t1 = Infinity, ax = -1
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-12) { if (o[k] < b[k] || o[k] > b[k + 3]) return null; continue }
    let u = (b[k] - o[k]) / d[k], v = (b[k + 3] - o[k]) / d[k]
    if (u > v) [u, v] = [v, u]
    if (u > t0) { t0 = u; ax = k }
    if (v < t1) t1 = v
    if (t0 > t1) return null
  }
  return [t0, t1, ax]
}

// the first block hit by the ray o + t d (d a unit vector) for t in [0, maxT].
// skip(x, y, z) -> true leaves a block out (the target itself). -> { x, y, z, t, normal } or null. A box the eye is
// inside of doesn't count (it can't be "in the way").
function rayFirst (o, d, maxT, shapesAt, skip = null) {
  o = arr(o)
  let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2])
  const step = d.map((v) => v > 0 ? 1 : v < 0 ? -1 : 0)
  const tD = d.map((v) => v !== 0 ? Math.abs(1 / v) : Infinity)
  const cell = [x, y, z]
  const tMax = [0, 1, 2].map((k) => d[k] > 0 ? (cell[k] + 1 - o[k]) / d[k] : d[k] < 0 ? (cell[k] - o[k]) / d[k] : Infinity)
  let tCell = 0
  for (let n = 0; n < 256 && tCell <= maxT; n++) {
    if (!(skip && skip(x, y, z))) {
      const sh = shapesAt(x, y, z)
      if (sh && sh.length) {
        let best = null
        for (const s of sh) {
          const h = slab(o, d, [x + s[0], y + s[1], z + s[2], x + s[3], y + s[4], z + s[5]])
          if (!h || h[0] < 1e-9 || h[0] > maxT) continue
          if (!best || h[0] < best.t) { const nrm = [0, 0, 0]; nrm[h[2]] = d[h[2]] > 0 ? -1 : 1; best = { x, y, z, t: h[0], normal: nrm } }
        }
        if (best) return best
      }
    }
    // the next voxel along the ray
    const k = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2)
    tCell = tMax[k]
    if (k === 0) x += step[0]; else if (k === 1) y += step[1]; else z += step[2]
    tMax[k] += tD[k]
  }
  return null
}

// the target's box for aiming (the union of its shapes; a full cube when it has none: air, a plant, the cell a block
// is placed into), world coords
function boxOf (pos, shapesAt) {
  const [x, y, z] = flo(pos)
  const sh = shapesAt(x, y, z)
  const b = sh && sh.length ? sh.reduce((m, s) => [Math.min(m[0], s[0]), Math.min(m[1], s[1]), Math.min(m[2], s[2]), Math.max(m[3], s[3]), Math.max(m[4], s[4]), Math.max(m[5], s[5])], [1, 1, 1, 0, 0, 0]) : FULL
  return [x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5]]
}

// The crosshair from eye along (yaw, pitch): { enters, on, blocker }. targets: block positions. enters: the ray reaches
// one of their boxes within reach; on: it does and no other block is hit before it; blocker: that other block ({ x, y, z, t }).
// o.skip: more cells that don't count as in the way (the cell a block is placed into)
function crosshair (eye, yaw, pitch, targets, shapesAt, o = {}) {
  const e = arr(eye), d = dirOf(yaw, pitch), reach = o.reach ?? 6, sh = o.shrink ?? 0
  const T = targets.map(flo)
  let tIn = Infinity, hitT = null
  for (const p of T) {
    const b = boxOf(p, shapesAt), h = slab(e, d, [b[0] + sh, b[1] + sh, b[2] + sh, b[3] - sh, b[4] - sh, b[5] - sh])
    if (h && h[1] >= 0 && Math.max(0, h[0]) <= reach && Math.max(0, h[0]) < tIn) { tIn = Math.max(0, h[0]); hitT = p }
  }
  if (!hitT) return { enters: false, on: false, blocker: null }
  const skipK = new Set([...T, ...(o.skip || []).map(flo)].map((p) => key(...p)))
  const b = rayFirst(e, d, tIn, shapesAt, (x, y, z) => skipK.has(key(x, y, z)))
  return { enters: true, on: !b, blocker: b, target: hitT }
}

// The best point the eye can see on a target block. t: { pos, faces? (normals allowed: a place's clicked face), skip? }
// -> { point: [x, y, z], normal, pos, score } or { point: null, blocker } (blocker: what the ray to the nearest face's
// centre hits first, or null when no face faces the eye at all)
function visiblePoint (eye, t, shapesAt, o = {}) {
  const e = arr(eye), [x, y, z] = flo(t.pos), box = boxOf(t.pos, shapesAt)
  const skipK = new Set([[x, y, z], ...(t.skip || []).map(flo)].map((p) => key(...p)))
  const skip = (a, b, c) => skipK.has(key(a, b, c))
  const reach = o.reach ?? Infinity
  const c = [(box[0] + box[3]) / 2, (box[1] + box[4]) / 2, (box[2] + box[5]) / 2]
  const faces = (t.faces || FACES).map((n) => {
    const k = n[0] ? 0 : n[1] ? 1 : 2, plane = n[k] > 0 ? box[k + 3] : box[k]
    const out = (e[k] - plane) * n[k]   // > 0: the eye is on the outside of this face (it faces the eye)
    const toEye = Math.hypot(e[0] - c[0], e[1] - c[1], e[2] - c[2]) || 1
    return { n, k, plane, out, cos: ((e[0] - c[0]) * n[0] + (e[1] - c[1]) * n[1] + (e[2] - c[2]) * n[2]) / toEye }
  }).filter((f) => f.out > 1e-3).sort((a, b) => b.cos - a.cos)
  if (!faces.length) return { point: null, blocker: null }
  const G = [0.5, 0.3, 0.7, 0.15, 0.85]
  const ptOn = (f, u, v) => {
    const [a, b] = [0, 1, 2].filter((q) => q !== f.k), p = [0, 0, 0]
    p[f.k] = f.plane; p[a] = box[a] + (box[a + 3] - box[a]) * u; p[b] = box[b] + (box[b + 3] - box[b]) * v
    return p
  }
  const sees = (p) => {
    const d = [p[0] - e[0], p[1] - e[1], p[2] - e[2]], L = Math.hypot(...d)
    if (L > reach) return { ok: false, L }
    const u = d.map((q) => q / L)
    const b = rayFirst(e, u, L - 1e-4, shapesAt, skip)
    const h = slab(e, u, box)
    return { ok: !b, blocker: b, chord: h ? h[1] - L : 0, L }
  }
  let best = null, firstBlocker
  for (const f of faces) {
    for (const u of G) {
      for (const v of G) {
        const p = ptOn(f, u, v), s = sees(p)
        if (firstBlocker === undefined) firstBlocker = s.blocker || null
        if (!s.ok) continue
        // around it: the sway (and a hand) moves the crosshair ~0.15 off the point; a point whose neighbours are hidden
        // sits on the edge of what is visible
        const nb = [[0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15]].filter(([du, dv]) => sees(ptOn(f, Math.min(1, Math.max(0, u + du)), Math.min(1, Math.max(0, v + dv)))).ok).length
        const score = 0.6 * f.cos + Math.min(s.chord, 0.5) + 0.4 * (1 - 2 * Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5))) + 0.1 * nb
        if (!best || score > best.score) best = { point: p, normal: f.n, pos: [x, y, z], score }
      }
    }
    // the face toward the eye is the one to use when its centre area is clear: don't trade it for a grazing one
    if (best && best.normal === f.n && best.score > 1.2) break
  }
  return best || { point: null, blocker: firstBlocker || null }
}

// the best visible point over several targets (each { pos, faces?, skip? }); -> as visiblePoint, with `target`
function bestOf (eye, targets, shapesAt, o = {}) {
  let best = null, blocker = null
  for (const t of targets) {
    const r = visiblePoint(eye, t, shapesAt, o)
    if (r.point && (!best || r.score > best.score)) best = { ...r, target: t }
    if (!r.point && blocker === null) blocker = r.blocker
  }
  return best || { point: null, blocker }
}

// the nearest place to stand (feet: the middle of a cell with nothing in the feet and head cells and a block under
// them) within `radius` blocks of `feet` from which one of the targets is visible within vanilla reach. eyeH: the eye
// over the feet. -> { feet: [x, y, z], sight } or null
function standSpot (feet, eyeH, targets, shapesAt, o = {}) {
  const [fx, fy, fz] = flo(feet), R = o.radius ?? 3
  const empty = (x, y, z) => { const s = shapesAt(x, y, z); return !(s && s.length) }
  const busy = new Set(targets.flatMap((t) => [t.pos, ...(t.skip || [])]).map((p) => key(...flo(p))))
  const cand = []
  for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) for (const dy of [0, 1, -1]) {
    const x = fx + dx, y = fy + dy, z = fz + dz
    if (busy.has(key(x, y, z)) || busy.has(key(x, y + 1, z))) continue
    if (!empty(x, y, z) || !empty(x, y + 1, z) || empty(x, y - 1, z)) continue
    cand.push([x + 0.5, y, z + 0.5, Math.hypot(x + 0.5 - (feet.x ?? feet[0]), z + 0.5 - (feet.z ?? feet[2])) + Math.abs(dy) * 0.5])
  }
  cand.sort((a, b) => a[3] - b[3])
  for (const c of cand) {
    const s = bestOf([c[0], c[1] + eyeH, c[2]], targets, shapesAt, { reach: o.reach ?? REACH })
    if (s.point) return { feet: c.slice(0, 3), sight: s }
  }
  return null
}

// the cells next to `pos` a block placed there can go against (those with a block), each with the one face it is
// clicked on (the face toward pos), the one below first
function supportsOf (pos, shapesAt) {
  const [x, y, z] = flo(pos), out = []
  for (const n of [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) {
    const a = [x + n[0], y + n[1], z + n[2]], s = shapesAt(...a)
    if (s && s.length) out.push({ pos: a, faces: [[-n[0], -n[1], -n[2]]], skip: [[x, y, z]] })
  }
  return out
}

module.exports = { rayFirst, crosshair, visiblePoint, bestOf, standSpot, supportsOf, boxOf, dirOf, REACH, FACES }
