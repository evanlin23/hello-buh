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
// DyeColor texture diffuse colours, by id (white, orange, magenta, ... black)
const DYE = [0xF9FFFE, 0xF9801D, 0xC74EBD, 0x3AB3DA, 0xFED83D, 0x80C71F, 0xF38BAA, 0x474F52, 0x9D9D97, 0x169C9C, 0x8932B8, 0x3C44AA, 0x835432, 0x5E7C16, 0xB02E26, 0x1D1D21]
const woolColor = (i) => { const d = DYE[i] ?? DYE[0], m = i === 0 ? 0.9 : 0.75; return [((d >> 16) & 255) / 255 * m, ((d >> 8) & 255) / 255 * m, (d & 255) / 255 * m] }
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
  // Bedrock: a cube without its own pivot rotates about its centre (the chicken's body is the only user)
  const cpiv = cube.pivot ? new THREE.Vector3(...cube.pivot) : new THREE.Vector3(cube.origin[0] + cube.size[0] / 2, cube.origin[1] + cube.size[1] / 2, cube.origin[2] + cube.size[2] / 2)
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
  // Java renders entity models through S(-1,-1,1) (LivingEntityRenderer); Bedrock geometry shares
  // Java's y-up-flipped coordinates, so x has to be negated too, or every mob is drawn as its mirror
  // image (the right arm on the left, profession badges and faces flipped). Turns about y made on top
  // of the rest pose (head yaw) change sign inside the mirror.
  const inner = new THREE.Group(); inner.scale.set(-1 / 16, 1 / 16, 1 / 16); root.add(inner)
  const mat = new THREE.MeshBasicMaterial({ map: texInfo.tex, vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide, fog: true })
  // white overlay (creeper fuse flash, LivingEntityRenderer overlay): mix toward white by uWhite
  mat.userData.white = { value: 0 }
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWhite = mat.userData.white
    sh.fragmentShader = 'uniform float uWhite;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), uWhite);')
  }
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
    // bind_pose_rotation turns only this bone's own cubes (Bedrock legacy geometry: a pig's body
    // lies flat, its legs and head don't); rotation turns the bone with its children
    if (b.rotation) g.rotation.set(-b.rotation[0] * Math.PI / 180, -b.rotation[1] * Math.PI / 180, -b.rotation[2] * Math.PI / 180)
    const bind = b.bind_pose_rotation
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
      const mesh = new THREE.Mesh(geom, mat)
      if (bind) mesh.rotation.set(-bind[0] * Math.PI / 180, -bind[1] * Math.PI / 180, -bind[2] * Math.PI / 180)
      g.add(mesh)
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
  if (/_boat$|^boat$/.test(name)) return { model: 'boat', layers: [`entity/boat/${name === 'boat' ? 'oak' : name.replace(/_boat$/, '')}`], yOff: -1.0 }   // the Bedrock boat geometry sits its hull ~15 px up; Java's hull bottom is at the entity's feet
  if (name === 'cow') return { model: 'cow', layers: ['entity/cow/temperate_cow'] }
  if (name === 'chicken') return { model: 'chicken', layers: ['entity/chicken/temperate_chicken'] }
  if (name === 'sheep') return { model: 'sheep', geo: 'sheared', layers: ['entity/sheep/sheep'], wool: extra && !extra.sheared }
  const tex = { zombie: 'entity/zombie/zombie', skeleton: 'entity/skeleton/skeleton', creeper: 'entity/creeper/creeper', pig: 'entity/pig/temperate_pig', iron_golem: 'entity/iron_golem/iron_golem', enderman: 'entity/enderman/enderman', spider: 'entity/spider/spider' }[name]
  if (tex) return { model: name, layers: [tex] }
  return null
}

// ---------------------------------------------------------------------------------------------
// The player (third person): built in Java model space so PlayerRenderer's pose chain,
// HumanoidModel.setupAnim and ItemInHandLayer apply exactly as written in the game.
// ModelPart.Cube box UVs (down, up, west, north, east, south), positions in pixels relative to the
// part's pivot, y down. Model space -> world: T(pos) Ry(180 - bodyYaw) Rz(death flip)
// S(-1,-1,1) S(0.9375) T(0,-1.501,0), then pixels/16.
const PSHADE = { down: 1.0, up: 0.5, north: 0.8, south: 0.8, west: 0.6, east: 0.6 }   // visual top is model -y
function javaCube (min, size, uv, grow, texW, texH, out) {
  const [x0, y0, z0] = min.map(v => v - grow), [x1, y1, z1] = [min[0] + size[0] + grow, min[1] + size[1] + grow, min[2] + size[2] + grow]
  const [dx, dy, dz] = size, [u, v] = uv
  const V = { a: [x0, y0, z0], b: [x1, y0, z0], c: [x1, y1, z0], d: [x0, y1, z0], e: [x0, y0, z1], f: [x1, y0, z1], g: [x1, y1, z1], h: [x0, y1, z1] }
  const f4 = u, f5 = u + dz, f6 = u + dz + dx, f7 = u + dz + dx + dx, f8 = u + dz + dx + dz, f9 = u + dz + dx + dz + dx
  const f10 = v, f11 = v + dz, f12 = v + dz + dy
  // Polygon(verts, u1, v1, u2, v2): verts[0] (u2,v1), [1] (u1,v1), [2] (u1,v2), [3] (u2,v2)
  const polys = [
    ['down', [V.f, V.e, V.a, V.b], f5, f10, f6, f11],
    ['up', [V.c, V.d, V.h, V.g], f6, f11, f7, f10],
    ['west', [V.a, V.e, V.h, V.d], f4, f11, f5, f12],
    ['north', [V.b, V.a, V.d, V.c], f5, f11, f6, f12],
    ['east', [V.f, V.b, V.c, V.g], f6, f11, f8, f12],
    ['south', [V.e, V.f, V.g, V.h], f8, f11, f9, f12]
  ]
  for (const [face, vs, u1, v1, u2, v2] of polys) {
    const n = out.pos.length / 3
    const uvs = [[u2, v1], [u1, v1], [u1, v2], [u2, v2]]
    for (let k = 0; k < 4; k++) { out.pos.push(...vs[k]); out.uv.push(uvs[k][0] / texW, uvs[k][1] / texH); const s = PSHADE[face]; out.col.push(s, s, s) }
    out.idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
}
// PlayerModel parts (wide arms): [name, parent, pivot, cubes [[min, size, uv, grow]]]
const PLAYER_PARTS = [
  ['head', null, [0, 0, 0], [[[-4, -8, -4], [8, 8, 8], [0, 0], 0]]],
  ['hat', 'head', [0, 0, 0], [[[-4, -8, -4], [8, 8, 8], [32, 0], 0.5]]],
  ['body', null, [0, 0, 0], [[[-4, 0, -2], [8, 12, 4], [16, 16], 0]]],
  ['jacket', 'body', [0, 0, 0], [[[-4, 0, -2], [8, 12, 4], [16, 32], 0.25]]],
  ['rightArm', null, [-5, 2, 0], [[[-3, -2, -2], [4, 12, 4], [40, 16], 0]]],
  ['rightSleeve', 'rightArm', [0, 0, 0], [[[-3, -2, -2], [4, 12, 4], [40, 32], 0.25]]],
  ['leftArm', null, [5, 2, 0], [[[-1, -2, -2], [4, 12, 4], [32, 48], 0]]],
  ['leftSleeve', 'leftArm', [0, 0, 0], [[[-1, -2, -2], [4, 12, 4], [48, 48], 0.25]]],
  ['rightLeg', null, [-1.9, 12, 0], [[[-2, 0, -2], [4, 12, 4], [0, 16], 0]]],
  ['rightPants', 'rightLeg', [0, 0, 0], [[[-2, 0, -2], [4, 12, 4], [0, 32], 0.25]]],
  ['leftLeg', null, [1.9, 12, 0], [[[-2, 0, -2], [4, 12, 4], [16, 48], 0]]],
  ['leftPants', 'leftLeg', [0, 0, 0], [[[-2, 0, -2], [4, 12, 4], [0, 48], 0.25]]]
]
function buildPlayer (texInfo) {
  const root = new THREE.Group()            // world: position + Ry + death Rz
  const model = new THREE.Group()           // S(-1,-1,1) S(0.9375) T(0,-1.501,0) S(1/16)
  model.matrixAutoUpdate = false
  model.matrix.makeScale(-0.9375, -0.9375, 0.9375).multiply(new THREE.Matrix4().makeTranslation(0, -1.501, 0)).multiply(new THREE.Matrix4().makeScale(1 / 16, 1 / 16, 1 / 16))
  root.add(model)
  // the overlay layers (hat, jacket, sleeves, pants) are cut out by alpha; draw both sides
  const mat = new THREE.MeshBasicMaterial({ map: texInfo.tex, vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide, fog: true })
  mat.userData.red = { value: 0 }
  mat.onBeforeCompile = (sh) => {   // OverlayTexture red (hurt / dying): mix(red, colour, 178/255)
    sh.uniforms.uRed = mat.userData.red
    sh.fragmentShader = 'uniform float uRed;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.0, 0.0) * diffuse * vColor.rgb, uRed * 0.302);')
  }
  const bones = {}
  for (const [name, parent, pivot, cubes] of PLAYER_PARTS) {
    const g = new THREE.Group(); g.rotation.order = 'ZYX'   // ModelPart: rotationZYX(zRot, yRot, xRot)
    g.position.set(...pivot)
    const all = { pos: [], uv: [], col: [], idx: [] }
    for (const [min, size, uv, grow] of cubes) javaCube(min, size, uv, grow, texInfo.w, texInfo.h, all)
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(all.pos, 3))
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(all.uv, 2))
    geom.setAttribute('color', new THREE.Float32BufferAttribute(all.col, 3))
    geom.setIndex(all.idx)
    g.add(new THREE.Mesh(geom, mat))
    ;(parent ? bones[parent] : model).add(g)
    bones[name] = g
  }
  // ItemInHandLayer: the arm's transform, then Rx(-90) Ry(180) T(1/16, 0.125, -0.625) (blocks)
  const hand = new THREE.Group(); hand.matrixAutoUpdate = false
  hand.matrix.makeRotationX(-Math.PI / 2).multiply(new THREE.Matrix4().makeRotationY(Math.PI)).multiply(new THREE.Matrix4().makeScale(16, 16, 16)).multiply(new THREE.Matrix4().makeTranslation(1 / 16, 0.125, -0.625))
  bones.rightArm.add(hand)
  bones.hand = hand
  return { root, bones, mat }
}
// HumanoidModel.setupAnim (+ setupAttackAnimation, ArmPose.ITEM, AnimationUtils.bobModelPart) and
// LivingEntityRenderer.setupRotations for a player state s: yaw = body yaw, headYaw, pitch
// (mineflayer radians), s.player = { walkPos, walkSpeed, attack, holding, age, deathTime, hurt }
function posePlayer (r, s) {
  const B = r.bones, p = s.player || {}
  let net = -((s.headYaw ?? s.yaw) - s.yaw); while (net > Math.PI) net -= 2 * Math.PI; while (net < -Math.PI) net += 2 * Math.PI
  // setupRotations: Ry(180 - javaYaw) with javaYaw = PI - mineflayer yaw is a three.js Ry(s.yaw);
  // dying: Rz(min(1, sqrt((deathTime - 1) / 20 * 1.6)) * 90 degrees)
  const death = p.deathTime > 0 ? Math.min(1, Math.sqrt(Math.max(0, (p.deathTime - 1) / 20 * 1.6))) * Math.PI / 2 : 0
  r.obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationY(s.yaw).multiply(new THREE.Matrix4().makeRotationZ(death)))
  for (const k of ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg']) B[k].rotation.set(0, 0, 0)
  B.rightArm.position.set(-5, 2, 0); B.leftArm.position.set(5, 2, 0)
  B.head.rotation.y = net; B.head.rotation.x = -(s.pitch || 0)
  const pos = p.walkPos || 0, spd = p.walkSpeed || 0
  B.rightArm.rotation.x = Math.cos(pos * 0.6662 + Math.PI) * 2 * spd * 0.5
  B.leftArm.rotation.x = Math.cos(pos * 0.6662) * 2 * spd * 0.5
  B.rightLeg.rotation.x = Math.cos(pos * 0.6662) * 1.4 * spd
  B.leftLeg.rotation.x = Math.cos(pos * 0.6662 + Math.PI) * 1.4 * spd
  if (p.holding) B.rightArm.rotation.x = B.rightArm.rotation.x * 0.5 - Math.PI / 10   // ArmPose.ITEM
  const a = p.attack || 0
  if (a > 0) {
    const by = Math.sin(Math.sqrt(a) * Math.PI * 2) * 0.2
    B.body.rotation.y = by
    B.rightArm.position.set(-Math.cos(by) * 5, 2, Math.sin(by) * 5)
    B.leftArm.position.set(Math.cos(by) * 5, 2, -Math.sin(by) * 5)
    B.rightArm.rotation.y += by; B.leftArm.rotation.y += by; B.leftArm.rotation.x += by
    let f = 1 - a; f *= f; f *= f; f = 1 - f
    const f2 = Math.sin(f * Math.PI), f3 = Math.sin(a * Math.PI) * -(B.head.rotation.x - 0.7) * 0.75
    B.rightArm.rotation.x -= f2 * 1.2 + f3
    B.rightArm.rotation.y += by * 2
    B.rightArm.rotation.z += Math.sin(a * Math.PI) * -0.4
  }
  const age = p.age || 0
  B.rightArm.rotation.z += Math.cos(age * 0.09) * 0.05 + 0.05; B.rightArm.rotation.x += Math.sin(age * 0.067) * 0.05
  B.leftArm.rotation.z -= Math.cos(age * 0.09) * 0.05 + 0.05; B.leftArm.rotation.x -= Math.sin(age * 0.067) * 0.05
  r.mat.userData.red.value = (p.hurt || p.deathTime > 0) ? 1 : 0
}

export class EntityLayer {
  constructor (scene, regs) { this.scene = scene; this.regs = regs || {}; this.live = new Map(); this.pending = new Set(); this.blockModels = new Map() }
  static async loadModels () { if (!MODELS) MODELS = await (await fetch('/entity_models.json')).json() }

  async ensure (id, name, extra) {
    const key = `${id}|${name}|${JSON.stringify(extra)}`
    const cur = this.live.get(id)
    if (cur && cur.key === key) return cur
    if (cur) { this.scene.remove(cur.obj); this.live.delete(id) }
    let obj = null, bones = {}, mat = null, woolMat = null
    if (name === 'falling_block' && extra && this.blockModels.has(extra.state)) {
      const bm = this.blockModels.get(extra.state)
      const m = new THREE.Mesh(bm.geo, bm.mat.clone()); m.position.set(-0.5, 0, -0.5)
      obj = new THREE.Group(); obj.add(m); mat = m.material
      if (extra.flash !== undefined) {   // primed TNT: white overlay that blinks
        const w = new THREE.Mesh(bm.geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthFunc: THREE.LessEqualDepth }))
        w.position.set(-0.5, 0, -0.5); w.visible = !!extra.flash; obj.add(w)
      }
      if (extra.scale) obj.scale.setScalar(extra.scale)
    } else if (name === 'player') {
      const t = await texture([`entity/player/wide/${(extra && extra.skin) || 'steve'}`])
      if (t) { const b = buildPlayer(t); obj = b.root; bones = b.bones; mat = b.mat }
    } else if (name === 'ender_pearl' || name === 'snowball' || name === 'egg' || name === 'item') {
      const itemName = name === 'item' ? (extra?.item || 'stone') : name
      const t = await texture([(name === 'item' && extra?.tex) || `item/${itemName}`])
      if (t) {
        mat = new THREE.SpriteMaterial({ map: t.tex, alphaTest: 0.1, fog: true })
        obj = new THREE.Sprite(mat); obj.scale.setScalar(name === 'item' ? 0.35 : 0.5)
      }
    } else {
      const l = look(name, extra, this.regs)
      const geo = l && MODELS[l.model]?.geometry?.[l.geo || 'default']
      const t = l && await texture(l.layers)
      if (geo && t) {
        const b = build(geo, t, l.extra); obj = b.root; bones = b.bones; mat = b.mat
        for (const [bn, r] of Object.entries(l.rest || {})) if (bones[bn]) { bones[bn].rotation.set(...r); bones[bn].userData.rest = bones[bn].rotation.clone() }
        if (l.wool) {   // SheepWoolLayer: same bones and pivots, inflated cubes, Java wool texture (Bedrock uv minus 32 rows)
          const wt = await texture(['entity/sheep/sheep_wool'])
          const fur = MODELS.sheep.geometry.default
          const wgeo = { bones: fur.bones.map(bo => ({ ...bo, cubes: (bo.cubes || []).map(c => ({ ...c, uv: [c.uv[0], c.uv[1] - 32] })) })) }
          if (wt) {
            const w = build(wgeo, wt)
            for (const [bn, g] of Object.entries(w.bones)) if (bones[bn]) for (const m of [...g.children].filter(c => c.isMesh)) bones[bn].add(m)
            woolMat = w.mat
          }
        }
      }
    }
    if (extra && extra.glint && mat && this.glintify) this.glintify(mat, name === 'falling_block' ? 8 : 0.25)
    const rec = { key, obj, bones, mat, woolMat, yOff: (name && look(name, extra, this.regs) || {}).yOff || 0, walk: 0, last: null }
    if (obj) this.scene.add(obj)
    this.live.set(id, rec)
    return rec
  }

  // states: [{id, name, x, y, z, yaw, pitch, headYaw, extra, light}]
  async update (states, tick = 0) {
    const seen = new Set()
    for (const s of states) {
      seen.add(s.id)
      const r = await this.ensure(s.id, s.name, s.extra)
      if (!r.obj) continue
      r.obj.position.set(s.x, s.y + (r.obj.isSprite ? 0.15 : 0) + (r.yOff || 0), s.z)
      const LL = Array.isArray(s.light) ? s.light : [s.light ?? 1, s.light ?? 1, s.light ?? 1]
      if (r.mat) r.mat.color.setRGB(...LL)
      if (r.woolMat) {   // Sheep.getColor: dye colour x 0.75 (white x 0.9); jeb_ blends through all 16, 25 ticks each
        let c
        if (s.extra?.jeb) {
          const k = Math.floor(tick / 25) + s.id, f = (tick % 25) / 25
          const a = woolColor(k % 16), b = woolColor((k + 1) % 16)
          c = a.map((v, i) => v * (1 - f) + b[i] * f)
        } else c = woolColor(s.extra?.color || 0)
        r.woolMat.color.setRGB(c[0] * LL[0], c[1] * LL[1], c[2] * LL[2])
      }
      if (s.name === 'player') {
        posePlayer(r, s)
        // the held item (ItemInHandLayer), built by the page (block models / extruded sprites)
        const held = s.player && s.player.held, hk = held ? held.key : null
        if (r.heldKey !== hk) {
          if (r.heldObj) r.bones.hand.remove(r.heldObj.obj)
          r.heldObj = hk && this.itemFactory ? await this.itemFactory(held) : null
          if (r.heldObj) r.bones.hand.add(r.heldObj.obj)
          r.heldKey = hk
        }
        if (r.heldObj && r.heldObj.mat) r.heldObj.mat.color.setRGB(...LL)
        continue
      }
      if (s.name === 'falling_block' && s.extra && s.extra.spin) { r.obj.rotation.set(0, s.yaw, 0); continue }
      if (r.obj.isSprite || s.name === 'falling_block') continue
      // BodyRotationControl: the body is dragged so the head never turns more than 75° from it
      // (a fast turn had heads spun round while bodies still faced away: staring_villagers review)
      if (s.headYaw != null) {
        let d = s.headYaw - s.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
        const MAXD = 75 * Math.PI / 180
        if (Math.abs(d) > MAXD) s.yaw = s.headYaw - Math.sign(d) * MAXD
      }
      r.obj.rotation.set(0, s.yaw, 0)
      if (s.swell !== undefined) {   // CreeperRenderer.scale
        let f = s.swell; const g = 1 + Math.sin(f * 100) * f * 0.01
        f = Math.min(1, Math.max(0, f)); f *= f; f *= f
        r.obj.scale.set((1 + f * 0.4) * g, (1 + f * 0.1) / g, (1 + f * 0.4) * g)
        // CreeperRenderer.getWhiteOverlayProgress: blinks with (int)(swell * 10) odd, strength swell in [0.5, 1]
        if (r.mat?.userData.white) r.mat.userData.white.value = Math.floor(s.swell * 10) % 2 ? Math.min(1, Math.max(0.5, s.swell)) : 0
      } else {
        if (r.obj.scale.x !== 1 && s.name !== 'falling_block') r.obj.scale.setScalar(1)
        if (r.mat?.userData.white) r.mat.userData.white.value = 0
      }
      // limb swing like WalkAnimationState: per game tick, target = min(1, distance * 4), speed eases
      // toward it by 0.4 and the phase advances by speed. Frames come at 60 fps (3 per tick), so
      // measure over elapsed ticks, not per frame (per frame read a third of the speed).
      if (r.last) {
        const dt = tick - r.last.t
        if (dt > 0) {
          const per = Math.hypot(s.x - r.last.x, s.z - r.last.z) / dt
          const target = s.swell !== undefined ? 0 : Math.min(1, per * 4)   // a swelling creeper stands still (SwellGoal stops its navigation)
          r.amt = (r.amt || 0) + (target - (r.amt || 0)) * Math.min(1, 0.4 * dt)
          r.walk += (r.amt || 0) * dt
        }
      } else r.amt = 0
      r.last = { x: s.x, z: s.z, t: tick }
      const swing = Math.cos(r.walk * 0.6662) * 1.4 * (r.amt || 0)
      const B = r.bones
      // bipeds: legs opposite, arms against the legs. Quadrupeds (QuadrupedModel: creeper, pig):
      // leg0/leg1 hind right/left, leg2/leg3 front right/left; diagonal pairs move together.
      if (!B.leg4) for (const [n, sign] of [['leg0', 1], ['rightLeg', 1], ['leg1', -1], ['leftLeg', -1], ['leg2', -1], ['leg3', 1]]) if (B[n]) B[n].rotation.x = B[n].userData.rest.x + swing * sign
      for (const [n, sign] of [['rightArm', -1], ['leftArm', 1], ['arm0', -1], ['arm1', 1]]) if (B[n]) B[n].rotation.x = B[n].userData.rest.x + swing * sign
      if (B.head) {
        let dy = (s.headYaw ?? s.yaw) - s.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        B.head.rotation.set(B.head.userData.rest.x + s.pitch, B.head.userData.rest.y - dy, B.head.userData.rest.z)
      }
    }
    for (const [id, r] of this.live) if (!seen.has(id)) { if (r.obj) this.scene.remove(r.obj); this.live.delete(id) }
  }
}
