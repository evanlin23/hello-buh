// Block entities the game draws with entity models instead of block models: signs (with their text
// in the vanilla font), chests (with the lid animation) and beds. render.js sends one entry per block
// entity (renderer: HB.frame cam.blockEntities); geometry follows the Java renderers' pose chains
// (SignRenderer, ChestRenderer, BedRenderer) and ModelPart.Cube box UVs. Faces are shaded like blocks
// (up 1, down 0.5, north/south 0.8, east/west 0.6) from their world normal, times the light.
import * as THREE from 'three'

const D = Math.PI / 180
const texCache = new Map()
function tex (url) {
  if (texCache.has(url)) return texCache.get(url)
  const p = new THREE.TextureLoader().loadAsync(url).then(t => {
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false
    t.colorSpace = THREE.NoColorSpace; t.flipY = false
    return t
  }).catch(() => null)
  texCache.set(url, p)
  return p
}

// ModelPart.Cube: [verts(4 x vec3), uv(4 x [u, v])] per face, positions in pixels
function box (min, size, uv) {
  const [x0, y0, z0] = min, [x1, y1, z1] = [min[0] + size[0], min[1] + size[1], min[2] + size[2]]
  const [dx, dy, dz] = size, [u, v] = uv
  const V = { a: [x0, y0, z0], b: [x1, y0, z0], c: [x1, y1, z0], d: [x0, y1, z0], e: [x0, y0, z1], f: [x1, y0, z1], g: [x1, y1, z1], h: [x0, y1, z1] }
  const f4 = u, f5 = u + dz, f6 = u + dz + dx, f7 = u + dz + dx + dx, f8 = u + dz + dx + dz, f9 = u + dz + dx + dz + dx
  const f10 = v, f11 = v + dz, f12 = v + dz + dy
  return [
    [[V.f, V.e, V.a, V.b], f5, f10, f6, f11],
    [[V.c, V.d, V.h, V.g], f6, f11, f7, f10],
    [[V.a, V.e, V.h, V.d], f4, f11, f5, f12],
    [[V.b, V.a, V.d, V.c], f5, f11, f6, f12],
    [[V.f, V.b, V.c, V.g], f6, f11, f8, f12],
    [[V.e, V.f, V.g, V.h], f8, f11, f9, f12]
  ].map(([vs, u1, v1, u2, v2]) => [vs, [[u2, v1], [u1, v1], [u1, v2], [u2, v2]]])
}

// parts: [{ cubes: [[min, size, uv]], pivot, rot: [x, y, z] (ModelPart rotationZYX) }], M: model -> block
function buildGeometry (parts, M, texW, texH) {
  const pos = [], uv = [], col = [], idx = []
  const v = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3()
  for (const p of parts) {
    const PM = new THREE.Matrix4().makeTranslation(...(p.pivot || [0, 0, 0]))
    if (p.rot) PM.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(p.rot[0], p.rot[1], p.rot[2], 'ZYX')))
    const W = M.clone().multiply(PM)
    for (const [min, size, uvo] of p.cubes) {
      for (const [vs, uvs] of box(min, size, uvo)) {
        const base = pos.length / 3, q = vs.map(c => v.set(...c).applyMatrix4(W).clone())
        e1.subVectors(q[1], q[0]); e2.subVectors(q[2], q[0]); n.crossVectors(e1, e2)
        if (n.lengthSq() < 1e-12) { e1.subVectors(q[2], q[1]); e2.subVectors(q[3], q[1]); n.crossVectors(e1, e2) }
        n.normalize()
        const s = Math.abs(n.y) > 0.5 ? (n.y > 0 ? 1.0 : 0.5) : Math.abs(n.z) >= Math.abs(n.x) ? 0.8 : 0.6
        for (let k = 0; k < 4; k++) { pos.push(q[k].x, q[k].y, q[k].z); uv.push(uvs[k][0] / texW, uvs[k][1] / texH); col.push(s, s, s) }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}

const M4 = () => new THREE.Matrix4()
const T = (x, y, z) => M4().makeTranslation(x, y, z)
const S = (x, y, z) => M4().makeScale(x, y, z)
const RY = (deg) => M4().makeRotationY(deg * D)

// --- the vanilla font (font/ascii.png: 16x16 cells of 8x8, glyph width = last opaque column + 1,
// advance = width + 1, space = 4)
let FONT = null
async function font () {
  if (FONT) return FONT
  const img = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = '/assets/env/font/ascii.png' })
  if (!img) return (FONT = { img: null })
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const g = c.getContext('2d'); g.drawImage(img, 0, 0)
  const px = g.getImageData(0, 0, img.width, img.height).data, cw = img.width / 16
  const widths = []
  for (let ch = 0; ch < 256; ch++) {
    const cx = (ch % 16) * cw, cy = Math.floor(ch / 16) * cw
    let w = 0
    for (let x = cw - 1; x >= 0 && !w; x--) for (let y = 0; y < cw; y++) if (px[((cy + y) * img.width + cx + x) * 4 + 3] > 0) { w = x + 1; break }
    widths.push(w)
  }
  FONT = { img: c, cw, widths }
  return FONT
}
const advance = (F, ch) => ch === ' ' ? 4 : (ch.charCodeAt(0) < 256 ? F.widths[ch.charCodeAt(0)] + 1 : 0)
// The four lines (SignRenderer.renderSignText): line i at y = i * 10 - 20, centred, 90 px max
async function textTexture (lines, rgb) {
  const F = await font()
  if (!F.img) return null
  const SC = 4, c = document.createElement('canvas'); c.width = 96 * SC; c.height = 40 * SC
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false
  const tint = document.createElement('canvas'); tint.width = F.img.width; tint.height = F.img.height
  const tg = tint.getContext('2d'); tg.drawImage(F.img, 0, 0); tg.globalCompositeOperation = 'source-in'
  tg.fillStyle = `rgb(${rgb.map(v => Math.round(v * 255)).join(',')})`; tg.fillRect(0, 0, tint.width, tint.height)
  lines.forEach((line, i) => {
    const w = [...line].reduce((s, ch) => s + advance(F, ch), 0)
    let x = 48 - w / 2
    for (const ch of line) {
      const code = ch.charCodeAt(0)
      if (code < 256 && ch !== ' ') g.drawImage(tint, (code % 16) * F.cw, Math.floor(code / 16) * F.cw, F.cw, F.cw, Math.round(x * SC), i * 10 * SC, 8 * SC, 8 * SC)
      x += advance(F, ch)
    }
  })
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; t.flipY = false
  return t
}

// --- models (pixels, as the Java model layers define them)
function signParts (standing) {
  const p = [{ cubes: [[[-12, -14, -1], [24, 12, 2], [0, 0]]] }]
  if (standing) p.push({ cubes: [[[-1, -2, -1], [2, 14, 2], [0, 14]]] })
  return p
}
function chestParts (type, open) {
  // ChestLidController: f = 1 - (1 - openness)^3, lid xRot = -(f * pi / 2)
  const f = 1 - Math.pow(1 - open, 3), rot = [-(f * Math.PI / 2), 0, 0]
  if (type === 'left') return [{ cubes: [[[0, 0, 1], [15, 10, 14], [0, 19]]] }, { pivot: [0, 9, 1], rot, cubes: [[[0, 0, 0], [15, 5, 14], [0, 0]], [[0, -2, 14], [1, 4, 1], [0, 0]]] }]
  if (type === 'right') return [{ cubes: [[[1, 0, 1], [15, 10, 14], [0, 19]]] }, { pivot: [0, 9, 1], rot, cubes: [[[1, 0, 0], [15, 5, 14], [0, 0]], [[15, -2, 14], [1, 4, 1], [0, 0]]] }]
  return [{ cubes: [[[1, 0, 1], [14, 10, 14], [0, 19]]] }, { pivot: [0, 9, 1], rot, cubes: [[[1, 0, 0], [14, 5, 14], [0, 0]], [[7, -2, 14], [2, 4, 1], [0, 0]]] }]
}
function bedParts (head) {
  if (head) return [{ cubes: [[[0, 0, 0], [16, 16, 6], [0, 0]]] }, { rot: [Math.PI / 2, 0, Math.PI / 2], cubes: [[[0, 6, 0], [3, 3, 3], [50, 6]]] }, { rot: [Math.PI / 2, 0, Math.PI], cubes: [[[-16, 6, 0], [3, 3, 3], [50, 18]]] }]
  return [{ cubes: [[[0, 0, 0], [16, 16, 6], [0, 22]]] }, { rot: [Math.PI / 2, 0, 0], cubes: [[[0, 6, -16], [3, 3, 3], [50, 0]]] }, { rot: [Math.PI / 2, 0, Math.PI * 3 / 2], cubes: [[[-16, 6, -16], [3, 3, 3], [50, 12]]] }]
}

export class BlockEntityLayer {
  constructor (scene) { this.scene = scene; this.live = new Map() }

  async build (b) {
    const grp = new THREE.Group(), mats = []
    const add = async (geo, url) => {
      const t = await tex(url); if (!t) return
      const m = new THREE.MeshBasicMaterial({ map: t, vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide, fog: true })
      grp.add(new THREE.Mesh(geo, m)); mats.push(m)
    }
    const at = T(b.x, b.y, b.z)
    if (b.kind === 'sign' || b.kind === 'wall_sign') {
      // SignRenderer.translateSign: T(0.5, 0.5, 0.5) Ry(-yRot) [wall: T(0, -0.3125, -0.4375)]; the
      // model scale(2/3, -2/3, -2/3); the text T(0, 1/3, 0.0467) scale(1/96, -1/96, 1/96)
      const base = at.clone().multiply(T(0.5, 0.5, 0.5)).multiply(RY(-b.rot))
      if (b.kind === 'wall_sign') base.multiply(T(0, -0.3125, -0.4375))
      await add(buildGeometry(signParts(b.kind === 'sign'), base.clone().multiply(S(2 / 3 / 16, -2 / 3 / 16, -2 / 3 / 16)), 64, 32), `/assets/env/entity/signs/${b.wood}.png`)
      if (b.text && b.text.some(l => l)) {
        const t = await textTexture(b.text, b.textColor || [0, 0, 0])
        if (t) {
          const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.1, depthWrite: false, side: THREE.DoubleSide, fog: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
          const q = new THREE.Mesh(new THREE.PlaneGeometry(96, 40), m)
          q.geometry.attributes.uv.array.set([0, 0, 1, 0, 0, 1, 1, 1])   // canvas top-left at (-48, -20) in text space (y down)
          q.geometry.translate(0, 0, 0)
          q.matrixAutoUpdate = false
          q.matrix.copy(base.clone().multiply(T(0, 1 / 3, 0.046666667)).multiply(S(0.010416667, -0.010416667, 0.010416667)).multiply(S(1, -1, 1)))
          grp.add(q); mats.push(m); m.userData.text = true
        }
      }
    } else if (b.kind === 'chest') {
      // ChestRenderer: T(0.5) Ry(-facing) T(-0.5), the model y-up in pixels
      const M = at.clone().multiply(T(0.5, 0.5, 0.5)).multiply(RY(-b.rot)).multiply(T(-0.5, -0.5, -0.5)).multiply(S(1 / 16, 1 / 16, 1 / 16))
      await add(buildGeometry(chestParts(b.type, b.open || 0), M, 64, 64), `/assets/env/entity/chest/${b.tex}.png`)
    } else if (b.kind === 'bed') {
      // BedRenderer.renderPiece: T(0, 0.5625, 0) Rx(90) T(0.5) Rz(180 + facing) T(-0.5)
      const M = at.clone().multiply(T(0, 0.5625, 0)).multiply(M4().makeRotationX(90 * D)).multiply(T(0.5, 0.5, 0.5))
        .multiply(M4().makeRotationZ((180 + b.rot) * D)).multiply(T(-0.5, -0.5, -0.5)).multiply(S(1 / 16, 1 / 16, 1 / 16))
      await add(buildGeometry(bedParts(b.head), M, 64, 64), `/assets/env/entity/bed/${b.color}.png`)
    }
    return { obj: grp, mats }
  }

  // list: [{ key, kind, x, y, z, rot, ..., light: [r, g, b] }]; the full current list each time it changes
  async update (list) {
    const seen = new Set()
    for (const b of list) {
      seen.add(b.key)
      const sig = JSON.stringify({ ...b, light: undefined })
      let r = this.live.get(b.key)
      if (!r || r.sig !== sig) {
        if (r) { this.scene.remove(r.obj); r.obj.traverse(o => { if (o.geometry) o.geometry.dispose() }) }
        r = { ...(await this.build(b)), sig }
        this.scene.add(r.obj); this.live.set(b.key, r)
      }
      for (const m of r.mats) m.color.setRGB(...b.light)
    }
    for (const [k, r] of this.live) if (!seen.has(k)) { this.scene.remove(r.obj); this.live.delete(k) }
  }
}
