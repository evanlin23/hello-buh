// Entity models for the page: Bedrock-style geometry (renderer/entity_models.json, converted
// by prismarine-viewer, MIT) built into three.js bone groups, textured with the client jar's
// own entity textures. Unlit like Minecraft: per-face fixed shading x light at the entity.
import * as THREE from 'three'

// box-UV layout per face (same as prismarine-viewer's Entity.js, Bedrock/Java box mapping)
const FACES = {
  up: { dir: [0, 1, 0], u0: [0, 0, 1], v0: [0, 0, 0], u1: [1, 0, 1], v1: [0, 0, 1], corners: [[0, 1, 1, 0, 0], [1, 1, 1, 1, 0], [0, 1, 0, 0, 1], [1, 1, 0, 1, 1]] },
  down: { dir: [0, -1, 0], u0: [1, 0, 1], v0: [0, 0, 0], u1: [2, 0, 1], v1: [0, 0, 1], corners: [[1, 0, 1, 0, 0], [0, 0, 1, 1, 0], [1, 0, 0, 0, 1], [0, 0, 0, 1, 1]] },
  east: { dir: [1, 0, 0], u0: [0, 0, 0], v0: [0, 0, 1], u1: [0, 0, 1], v1: [0, 1, 1], corners: [[1, 1, 1, 0, 0], [1, 0, 1, 0, 1], [1, 1, 0, 1, 0], [1, 0, 0, 1, 1]] },
  west: { dir: [-1, 0, 0], u0: [1, 0, 1], v0: [0, 0, 1], u1: [1, 0, 2], v1: [0, 1, 1], corners: [[0, 1, 0, 0, 0], [0, 0, 0, 0, 1], [0, 1, 1, 1, 0], [0, 0, 1, 1, 1]] },
  north: { dir: [0, 0, -1], u0: [0, 0, 1], v0: [0, 0, 1], u1: [1, 0, 1], v1: [0, 1, 1], corners: [[1, 0, 0, 0, 1], [0, 0, 0, 1, 1], [1, 1, 0, 0, 0], [0, 1, 0, 1, 0]] },
  south: { dir: [0, 0, 1], u0: [1, 0, 2], v0: [0, 0, 1], u1: [2, 0, 2], v1: [0, 1, 1], corners: [[0, 0, 1, 0, 1], [1, 0, 1, 1, 1], [0, 1, 1, 0, 0], [1, 1, 1, 1, 0]] }
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const SHADE = (d) => d[1] > 0.5 ? 1.0 : d[1] < -0.5 ? 0.5 : Math.abs(d[2]) > 0.5 ? 0.8 : 0.6

let MODELS = null
const texCache = new Map()

async function img (url) {
  return new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = url })
}
// Composite several texture layers (e.g. villager base + biome outfit + profession outfit).
async function texture (layers) {
  const key = layers.join('|')
  if (texCache.has(key)) return texCache.get(key)
  const imgs = (await Promise.all(layers.map(l => img(`/assets/env/${l}.png`)))).filter(Boolean)
  if (!imgs.length) { texCache.set(key, null); return null }
  const c = document.createElement('canvas'); c.width = imgs[0].width; c.height = imgs[0].height
  const g = c.getContext('2d')
  for (const i of imgs) g.drawImage(i, 0, 0, c.width, c.height)
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = false
  t.colorSpace = THREE.NoColorSpace
  const out = { tex: t, w: c.width, h: c.height }
  texCache.set(key, out)
  return out
}

function cubeGeometry (cube, pivot, texW, texH, mirror) {
  const pos = [], uv = [], col = [], idx = []
  const inf = cube.inflate || 0
  const rot = cube.rotation ? new THREE.Euler(-cube.rotation[0] * Math.PI / 180, -cube.rotation[1] * Math.PI / 180, -cube.rotation[2] * Math.PI / 180) : null
  const cpiv = cube.pivot ? new THREE.Vector3(...cube.pivot) : null
  for (const f of Object.values(FACES)) {
    const n = pos.length / 3
    for (const c of f.corners) {
      const u = (cube.uv[0] + dot(c[3] ? f.u1 : f.u0, cube.size)) / texW
      const v = (cube.uv[1] + dot(c[4] ? f.v1 : f.v0, cube.size)) / texH
      let p = new THREE.Vector3(
        cube.origin[0] + c[0] * cube.size[0] + (c[0] ? inf : -inf),
        cube.origin[1] + c[1] * cube.size[1] + (c[1] ? inf : -inf),
        cube.origin[2] + c[2] * cube.size[2] + (c[2] ? inf : -inf))
      if (rot) { const o = cpiv || new THREE.Vector3(); p = p.sub(o).applyEuler(rot).add(o) }
      p.sub(pivot)
      pos.push(p.x, p.y, p.z)
      uv.push(u, v)
      const s = SHADE(f.dir); col.push(s, s, s)
    }
    idx.push(n, n + 1, n + 2, n + 2, n + 1, n + 3)
  }
  return { pos, uv, col, idx }
}

// Build a model: returns { root, bones } with bones as THREE.Groups pivoting like the game.
function build (geo, texInfo, extraCubes = {}) {
  const root = new THREE.Group()
  const inner = new THREE.Group(); inner.scale.setScalar(1 / 16); root.add(inner)
  const mat = new THREE.MeshBasicMaterial({ map: texInfo.tex, vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide, fog: true })
  const bones = {}
  const defs = {}
  for (const b of geo.bones) defs[b.name] = b
  const make = (b) => {
    if (bones[b.name]) return bones[b.name]
    const g = new THREE.Group()
    const piv = new THREE.Vector3(...(b.pivot || [0, 0, 0]))
    const parent = b.parent && defs[b.parent] ? make(defs[b.parent]) : null
    const ppiv = parent ? parent.userData.pivot : new THREE.Vector3()
    g.position.copy(piv.clone().sub(ppiv))
    g.userData.pivot = piv
    const r = b.bind_pose_rotation || b.rotation
    if (r) g.rotation.set(-r[0] * Math.PI / 180, -r[1] * Math.PI / 180, -r[2] * Math.PI / 180)
    g.userData.rest = g.rotation.clone()
    const cubes = [...(b.cubes || []), ...(extraCubes[b.name] || [])]
    if (cubes.length) {
      const all = { pos: [], uv: [], col: [], idx: [] }
      for (const c of cubes) {
        const cg = cubeGeometry(c, piv, texInfo.w, texInfo.h, b.mirror || c.mirror)
        const base = all.pos.length / 3
        all.pos.push(...cg.pos); all.uv.push(...cg.uv); all.col.push(...cg.col); all.idx.push(...cg.idx.map(i => i + base))
      }
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.Float32BufferAttribute(all.pos, 3))
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(all.uv, 2))
      geom.setAttribute('color', new THREE.Float32BufferAttribute(all.col, 3))
      geom.setIndex(all.idx)
      g.add(new THREE.Mesh(geom, mat))
    }
    ;(parent || inner).add(g)
    bones[b.name] = g
    return g
  }
  for (const b of geo.bones) make(b)
  return { root, bones, mat }
}

// What to draw for an entity: texture layers + model key + extra cubes.
function look (name, extra, regs) {
  if (name === 'villager') {
    const t = regs['minecraft:villager_type']?.[String(extra?.type)] || 'plains'
    const p = regs['minecraft:villager_profession']?.[String(extra?.profession)] || 'none'
    const layers = ['entity/villager/villager', `entity/villager/type/${t}`]
    if (p !== 'none') layers.push(`entity/villager/profession/${p}`)
    // VillagerModel: crossed arms rest at xRot -0.75 (tilted out from the chest)
    // the converted model lacks the hat layer that profession outfits draw on
    return { model: 'villager', layers, rest: { arms: [0.75, 0, 0] }, extra: { head: [{ origin: [-4, 24, -4], size: [8, 10, 8], uv: [32, 0], inflate: 0.5 }] } }
  }
  const tex = { zombie: 'entity/zombie/zombie', skeleton: 'entity/skeleton/skeleton', creeper: 'entity/creeper/creeper', pig: 'entity/pig/temperate_pig', iron_golem: 'entity/iron_golem/iron_golem', enderman: 'entity/enderman/enderman', spider: 'entity/spider/spider' }[name]
  if (tex) return { model: name, layers: [tex] }
  return null
}

export class EntityLayer {
  constructor (scene, regs) { this.scene = scene; this.regs = regs || {}; this.live = new Map(); this.pending = new Set(); this.blockModels = new Map() }
  static async loadModels () { if (!MODELS) MODELS = await (await fetch('/entity_models.json')).json() }

  async ensure (id, name, extra) {
    const key = `${id}|${name}|${JSON.stringify(extra)}`
    const cur = this.live.get(id)
    if (cur && cur.key === key) return cur
    if (cur) { this.scene.remove(cur.obj); this.live.delete(id) }
    let obj = null, bones = {}, mat = null
    if (name === 'falling_block' && extra && this.blockModels.has(extra.state)) {
      const bm = this.blockModels.get(extra.state)
      const m = new THREE.Mesh(bm.geo, bm.mat.clone()); m.position.set(-0.5, 0, -0.5)
      obj = new THREE.Group(); obj.add(m); mat = m.material
      if (extra.flash !== undefined) {   // primed TNT: white overlay that blinks
        const w = new THREE.Mesh(bm.geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthFunc: THREE.LessEqualDepth }))
        w.position.set(-0.5, 0, -0.5); w.visible = !!extra.flash; obj.add(w)
      }
      if (extra.scale) obj.scale.setScalar(extra.scale)
    } else if (name === 'ender_pearl' || name === 'snowball' || name === 'egg' || name === 'item') {
      const itemName = name === 'item' ? (extra?.item || 'stone') : name
      const t = await texture([`item/${itemName}`])
      if (t) {
        mat = new THREE.SpriteMaterial({ map: t.tex, alphaTest: 0.1, fog: true })
        obj = new THREE.Sprite(mat); obj.scale.setScalar(name === 'item' ? 0.35 : 0.5)
      }
    } else {
      const l = look(name, extra, this.regs)
      const geo = l && MODELS[l.model]?.geometry?.default
      const t = l && await texture(l.layers)
      if (geo && t) {
        const b = build(geo, t, l.extra); obj = b.root; bones = b.bones; mat = b.mat
        for (const [bn, r] of Object.entries(l.rest || {})) if (bones[bn]) { bones[bn].rotation.set(...r); bones[bn].userData.rest = bones[bn].rotation.clone() }
      }
    }
    const rec = { key, obj, bones, mat, walk: 0, last: null }
    if (obj) this.scene.add(obj)
    this.live.set(id, rec)
    return rec
  }

  // states: [{id, name, x, y, z, yaw, pitch, headYaw, extra, light}]
  async update (states) {
    const seen = new Set()
    for (const s of states) {
      seen.add(s.id)
      const r = await this.ensure(s.id, s.name, s.extra)
      if (!r.obj) continue
      r.obj.position.set(s.x, s.y + (r.obj.isSprite ? 0.15 : 0), s.z)
      if (r.mat) r.mat.color.setScalar(s.light ?? 1)
      if (s.name === 'falling_block' && s.extra && s.extra.spin) { r.obj.rotation.set(0, s.yaw, 0); continue }
      if (r.obj.isSprite || s.name === 'falling_block') continue
      r.obj.rotation.set(0, s.yaw, 0)
      if (s.swell !== undefined) {   // CreeperRenderer.scale
        let f = s.swell; const g = 1 + Math.sin(f * 100) * f * 0.01
        f = Math.min(1, Math.max(0, f)); f *= f; f *= f
        r.obj.scale.set((1 + f * 0.4) * g, (1 + f * 0.1) / g, (1 + f * 0.4) * g)
      } else if (r.obj.scale.x !== 1 && s.name !== 'falling_block') r.obj.scale.setScalar(1)
      // limb swing from horizontal speed, like LivingEntity.walkAnimation
      if (r.last) { const sp = Math.hypot(s.x - r.last.x, s.z - r.last.z); r.walk += sp * 4; r.amt = Math.min(1, sp * 4) } else r.amt = 0
      r.last = { x: s.x, z: s.z }
      const swing = Math.cos(r.walk * 0.6662) * 1.4 * (r.amt || 0)
      const B = r.bones
      for (const [n, sign] of [['leg0', 1], ['rightLeg', 1], ['leg1', -1], ['leftLeg', -1]]) if (B[n]) B[n].rotation.x = B[n].userData.rest.x + swing * sign
      for (const [n, sign] of [['rightArm', -1], ['leftArm', 1]]) if (B[n]) B[n].rotation.x = B[n].userData.rest.x + swing * sign
      if (B.head) {
        let dy = (s.headYaw ?? s.yaw) - s.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        B.head.rotation.set(B.head.userData.rest.x + s.pitch, B.head.userData.rest.y + dy, B.head.userData.rest.z)
      }
    }
    for (const [id, r] of this.live) if (!seen.has(id)) { if (r.obj) this.scene.remove(r.obj); this.live.delete(id) }
  }
}
