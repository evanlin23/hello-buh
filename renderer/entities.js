// Entity models for the page: Bedrock-style geometry (renderer/entity_models.json, converted
// by prismarine-viewer, MIT) built into three.js bone groups, textured with the client jar's
// own entity textures. Unlit like Minecraft: per-face fixed shading x light at the entity.
import * as THREE from 'three'
import { nameTagTexture } from '/blockentities.js'
import { applyPoses } from '/poses.js'

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
  // a layer 'path#rrggbb' is tinted (multiplied) by that colour, keeping its alpha: a wolf's collar (WolfCollarLayer)
  const imgs = (await Promise.all(layers.map(async l => {
    if (l.includes('@')) return trimImage(...l.split('@'))
    const [p, tint] = l.split('#'); const im = await img(`/assets/env/${p}.png`)
    if (!im || !tint) return im
    const o = document.createElement('canvas'); o.width = im.width; o.height = im.height
    const og = o.getContext('2d'); og.drawImage(im, 0, 0)
    og.globalCompositeOperation = 'multiply'; og.fillStyle = '#' + tint; og.fillRect(0, 0, o.width, o.height)
    og.globalCompositeOperation = 'destination-in'; og.drawImage(im, 0, 0)
    return o
  }))).filter(Boolean)
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

// an armour trim (PalettedPermutations atlas source): the greyscale pattern's pixels matching trims/color_palettes/
// trim_palette's 8 keys are replaced by the material palette's 8 colours, alpha kept
async function trimImage (pattern, material) {
  const [im, key, pal] = await Promise.all([img(`/assets/env/${pattern}.png`), img('/assets/env/trims/color_palettes/trim_palette.png'), img(`/assets/env/trims/color_palettes/${material}.png`)])
  if (!im || !key || !pal) return null
  const px = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return [c, g, g.getImageData(0, 0, i.width, i.height)] }
  const [, , K] = px(key), [, , M] = px(pal), [c, g, D] = px(im)
  const map = new Map(); for (let i = 0; i < K.data.length / 4 && i < M.data.length / 4; i++) map.set((K.data[i * 4] << 16) | (K.data[i * 4 + 1] << 8) | K.data[i * 4 + 2], i)
  for (let i = 0; i < D.data.length; i += 4) {
    if (!D.data[i + 3]) continue
    const j = map.get((D.data[i] << 16) | (D.data[i + 1] << 8) | D.data[i + 2]); if (j === undefined) continue
    D.data[i] = M.data[j * 4]; D.data[i + 1] = M.data[j * 4 + 1]; D.data[i + 2] = M.data[j * 4 + 2]
  }
  g.putImageData(D, 0, 0)
  return c
}

async function potionTexture (name, color) {
  const key = `potion|${name}|${color}`
  if (texCache.has(key)) return texCache.get(key)
  const [base, ov] = await Promise.all([img(`/assets/env/item/${name}.png`), img('/assets/env/item/potion_overlay.png')])
  if (!base) { texCache.set(key, null); return null }
  const c = document.createElement('canvas'); c.width = base.width; c.height = base.height
  const g = c.getContext('2d')
  if (ov) {
    const o = document.createElement('canvas'); o.width = ov.width; o.height = ov.height
    const og = o.getContext('2d'); og.drawImage(ov, 0, 0); og.globalCompositeOperation = 'multiply'
    og.fillStyle = '#' + color.toString(16).padStart(6, '0'); og.fillRect(0, 0, o.width, o.height)
    og.globalCompositeOperation = 'destination-in'; og.drawImage(ov, 0, 0)
    g.drawImage(o, 0, 0, c.width, c.height)
  }
  g.drawImage(base, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = false; t.colorSpace = THREE.NoColorSpace
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
  // white overlay (creeper fuse flash, LivingEntityRenderer overlay): OverlayTexture's white row has
  // alpha 1 - u/15 x 0.75, mixed into the texture before the lightmap: at most 75% white, still lit
  // and shaded (a full-white flat creeper at the peak: worker 14, which_door f1086)
  mat.userData.white = { value: 0 }
  mat.userData.red = { value: 0 }
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWhite = mat.userData.white
    sh.uniforms.uRed = mat.userData.red
    // OverlayTexture: hurt / dying mixes 30% red into the (lit) colour, the creeper flash toward white
    sh.fragmentShader = 'uniform float uWhite;\nuniform float uRed;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.0, 0.0) * diffuse * vColor.rgb, uRed * 0.302);\n  diffuseColor.rgb = mix(diffuseColor.rgb, diffuse * vColor.rgb, floor(uWhite * 15.0) / 15.0 * 0.75);')
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
    g.position.copy(piv.clone().sub(ppiv)); g.userData.restPos = g.position.clone()
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
function look (name, extra, regs, engine = 0) {
  if (name === 'villager') {
    const t = regs['minecraft:villager_type']?.[String(extra?.type)] || 'plains'
    const p = regs['minecraft:villager_profession']?.[String(extra?.profession)] || 'none'
    const layers = ['entity/villager/villager', `entity/villager/type/${t}`]
    if (p !== 'none') layers.push(`entity/villager/profession/${p}`)
    // VillagerModel: crossed arms rest at xRot -0.75 (tilted out from the chest)
    // the converted model lacks the hat layer that profession outfits draw on
    return { model: 'villager', layers, rest: { arms: [0.75, 0, 0] }, extra: { head: [{ origin: [-4, 24, -4], size: [8, 10, 8], uv: [32, 0], inflate: 0.5 },
      // VillagerModel hat_rim: 16x16x1 at texOffs(30, 47), xRot -90 deg: the flat brim of the farmer's
      // straw hat (transparent for the other professions). Without it the hat vanished from behind.
      { origin: [-8, 16, -6], size: [16, 16, 1], uv: [30, 47], rotation: [-90, 0, 0], pivot: [0, 24, 0] }] } }
  }
  // a zombie villager keeps its villager's biome outfit, profession outfit and hat (ZombieVillagerModel: the
  // villager head and hat on a zombie's body); only the profession overlay drew before, as black boxes
  if (name === 'zombie_villager') {
    const t = regs['minecraft:villager_type']?.[String(extra?.type)] || 'plains'
    const p = regs['minecraft:villager_profession']?.[String(extra?.profession)] || 'none'
    const layers = ['entity/zombie_villager/zombie_villager', `entity/zombie_villager/type/${t}`]
    if (p !== 'none') layers.push(`entity/zombie_villager/profession/${p}`)
    return { model: 'zombie_villager', layers, extra: { head: [{ origin: [-4, 24, -4], size: [8, 10, 8], uv: [32, 0], inflate: 0.5 },
      { origin: [-8, 16, -6], size: [16, 16, 1], uv: [30, 47], rotation: [-90, 0, 0], pivot: [0, 24, 0] }] } }
  }
  if (/_boat$|^boat$/.test(name)) return { model: 'boat', layers: [`entity/boat/${name === 'boat' ? 'oak' : name.replace(/_boat$/, '')}`], yOff: -1.0 }   // the Bedrock boat geometry sits its hull ~15 px up; Java's hull bottom is at the entity's feet
  if (name === 'parrot') return { model: 'parrot', layers: [`entity/parrot/parrot_${['red_blue', 'blue', 'green', 'yellow_blue', 'grey'][(extra && extra.variant) || 0] || 'red_blue'}`] }   // Parrot.Variant
  if (name === 'cow') return { model: 'cow', layers: ['entity/cow/temperate_cow'] }
  if (name === 'chicken') return { model: 'chicken', layers: ['entity/chicken/temperate_chicken'] }
  if (name === 'sheep') return { model: 'sheep', geo: 'sheared', layers: ['entity/sheep/sheep'], wool: extra && !extra.sheared }
  // a wolf: tame or angry eyes, and a tamed one's collar in its dye colour (extra { tame, angry, collar: dye id })
  if (name === 'wolf') {
    const layers = [`entity/wolf/${extra?.angry ? 'wolf_angry' : extra?.tame ? 'wolf_tame' : 'wolf'}`]
    if (extra && extra.collar !== undefined && extra.collar !== null) layers.push(`entity/wolf/wolf_collar#${(DYE[extra.collar] ?? DYE[14]).toString(16).padStart(6, '0')}`)
    return { model: 'wolf', layers }
  }
  const tex = { zombie: 'entity/zombie/zombie', skeleton: 'entity/skeleton/skeleton', creeper: 'entity/creeper/creeper', pig: 'entity/pig/temperate_pig', iron_golem: 'entity/iron_golem/iron_golem', enderman: 'entity/enderman/enderman', spider: 'entity/spider/spider' }[name]
  if (tex) return { model: name, layers: [tex] }
  // mobs that share another's model (scripts/mob_audit.js), drawn from recordings made from 2026-11-10 on (engine 2;
  // older recordings never showed them, and must render as published): the skeleton family (BoggedRenderer,
  // ParchedRenderer: SkeletonModel), the illusioner (IllagerModel), the glow squid (SquidModel) and the trader llama
  // (LlamaModel + LlamaDecorLayer's trader blanket)
  if (engine >= 2) {
    const A = { bogged: ['skeleton', 'entity/skeleton/bogged'], parched: ['skeleton', 'entity/skeleton/parched'], illusioner: ['vindicator', 'entity/illager/illusioner'], glow_squid: ['squid', 'entity/squid/glow_squid'] }[name]
    if (A && MODELS && MODELS[A[0]]) return { model: A[0], layers: [A[1]] }
    if (name === 'trader_llama' && MODELS && MODELS.llama) return { model: 'llama', layers: ['entity/llama/creamy', 'entity/equipment/llama_body/trader_llama'] }
  }
  // any other mob with converted geometry: its default texture (checked by eye in a line-up render)
  // not yet: the witch draws only its hat and the horse family gets stray saddle/bag parts (their
  // converted geometry needs animation-placed bones); better hidden than broken
  const m = MODELS && MODELS[name]
  const t = m && m.textures && (m.textures.default || Object.values(m.textures)[0])
  if (t && m.geometry && m.geometry.default) return { model: name, layers: [FALLBACK_TEX[name] || t.replace(/^textures\//, '')] }
  return null
}
// textures that moved since the converted models were made
const FALLBACK_TEX = { squid: 'entity/squid/squid', cat: 'entity/cat/tabby', ocelot: 'entity/cat/ocelot', wolf: 'entity/wolf/wolf', horse: 'entity/horse/horse_brown', fox: 'entity/fox/fox', rabbit: 'entity/rabbit/brown', parrot: 'entity/parrot/parrot_red_blue', llama: 'entity/llama/creamy', panda: 'entity/panda/panda' }

// ---------------------------------------------------------------------------------------------
// The player (third person): built in Java model space so PlayerRenderer's pose chain,
// HumanoidModel.setupAnim and ItemInHandLayer apply exactly as written in the game.
// ModelPart.Cube box UVs (down, up, west, north, east, south), positions in pixels relative to the
// part's pivot, y down. Model space -> world: T(pos) Ry(180 - bodyYaw) Rz(death flip)
// S(-1,-1,1) S(0.9375) T(0,-1.501,0), then pixels/16.
const PSHADE = { down: 1.0, up: 0.5, north: 0.8, south: 0.8, west: 0.6, east: 0.6 }   // visual top is model -y
function javaCube (min, size, uv, grow, texW, texH, out, mirror = false) {
  let [x0, y0, z0] = min.map(v => v - grow), [x1, y1, z1] = [min[0] + size[0] + grow, min[1] + size[1] + grow, min[2] + size[2] + grow]
  if (mirror) [x0, x1] = [x1, x0]   // ModelPart.Cube with mirror: x swapped, each face's texture flipped (below)
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
    const uvs = mirror ? [[u1, v1], [u2, v1], [u2, v2], [u1, v2]] : [[u2, v1], [u1, v1], [u1, v2], [u2, v2]]
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
function buildPlayer (texInfo, parts = PLAYER_PARTS, scale = 0.9375, eyes = null) {
  const root = new THREE.Group()            // world: position + Ry + death Rz
  const model = new THREE.Group()           // S(-1,-1,1) S(0.9375) T(0,-1.501,0) S(1/16)
  model.matrixAutoUpdate = false
  model.matrix.makeScale(-scale, -scale, scale).multiply(new THREE.Matrix4().makeTranslation(0, -1.501, 0)).multiply(new THREE.Matrix4().makeScale(1 / 16, 1 / 16, 1 / 16))
  root.add(model)
  // the overlay layers (hat, jacket, sleeves, pants) are cut out by alpha; draw both sides
  const mat = new THREE.MeshBasicMaterial({ map: texInfo.tex, vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide, fog: true })
  mat.userData.red = { value: 0 }
  mat.onBeforeCompile = (sh) => {   // OverlayTexture red (hurt / dying): mix(red, colour, 178/255)
    sh.uniforms.uRed = mat.userData.red
    sh.fragmentShader = 'uniform float uRed;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.0, 0.0) * diffuse * vColor.rgb, uRed * 0.302);')
  }
  // an emissive layer over the same geometry (EnderEyesLayer: full bright, cut out)
  // eyes: one texture, or a list of { tex, parts (names drawn, all if null), opacity } layers whose
  // materials come back as bones.layers (LivingEntityEmissiveLayer with onlyDrawSelectedParts)
  const layers = !eyes ? [] : Array.isArray(eyes) ? eyes : [{ tex: eyes }]
  const layerMats = layers.map((l) => new THREE.MeshBasicMaterial({ map: l.tex.tex || l.tex, transparent: true, opacity: l.opacity ?? 1, alphaTest: 0.05, depthWrite: false, side: THREE.DoubleSide, fog: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }))
  const bones = {}
  for (const [name, parent, pivot, cubes, rest] of parts) {
    const g = new THREE.Group(); g.rotation.order = 'ZYX'   // ModelPart: rotationZYX(zRot, yRot, xRot)
    g.position.set(...pivot)
    if (rest) g.rotation.set(...rest)
    g.userData.rest = g.rotation.clone()
    const all = { pos: [], uv: [], col: [], idx: [] }
    for (const [min, size, uv, grow] of cubes) javaCube(min, size, uv, grow, texInfo.w, texInfo.h, all)
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(all.pos, 3))
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(all.uv, 2))
    geom.setAttribute('color', new THREE.Float32BufferAttribute(all.col, 3))
    geom.setIndex(all.idx)
    g.add(new THREE.Mesh(geom, mat))
    layers.forEach((l, i) => { if (!l.parts || l.parts.includes(name)) { const em = new THREE.Mesh(geom, layerMats[i]); em.renderOrder = 1 + i; g.add(em) } })
    ;(parent ? bones[parent] : model).add(g)
    bones[name] = g
  }
  if (layers.length) bones.layers = layerMats
  if (!bones.rightArm) return { root, bones, mat }
  // ItemInHandLayer: the arm's transform, then Rx(-90) Ry(180) T(1/16, 0.125, -0.625) (blocks)
  const hand = new THREE.Group(); hand.matrixAutoUpdate = false
  hand.matrix.makeRotationX(-Math.PI / 2).multiply(new THREE.Matrix4().makeRotationY(Math.PI)).multiply(new THREE.Matrix4().makeScale(16, 16, 16)).multiply(new THREE.Matrix4().makeTranslation(1 / 16, 0.125, -0.625))
  bones.rightArm.add(hand)
  bones.hand = hand
  // the off hand (ItemInHandLayer for the left arm: T(-1/16, 0.125, -0.625)); empty unless something is held there
  if (bones.leftArm) {
    const handL = new THREE.Group(); handL.matrixAutoUpdate = false
    handL.matrix.makeRotationX(-Math.PI / 2).multiply(new THREE.Matrix4().makeRotationY(Math.PI)).multiply(new THREE.Matrix4().makeScale(16, 16, 16)).multiply(new THREE.Matrix4().makeTranslation(-1 / 16, 0.125, -0.625))
    bones.leftArm.add(handL)
    bones.handL = handL
  }
  return { root, bones, mat }
}
// Armour on a player model (HumanoidArmorLayer): HumanoidModel's parts again, grown 1.0 (helmet, chestplate, boots)
// or 0.5 (leggings), textured from entity/equipment/humanoid[_leggings]/<material>, on the player's own bones so
// they follow every pose. armor = [feet, legs, chest, head] item names (harness: equipment slots 2-5).
const ARMOR_PARTS = {   // [bone, cube min, size, uv, mirror]
  head: [['head', [-4, -8, -4], [8, 8, 8], [0, 0]], ['head', [-4, -8, -4], [8, 8, 8], [32, 0], false, 0.5]],
  chest: [['body', [-4, 0, -2], [8, 12, 4], [16, 16]], ['rightArm', [-3, -2, -2], [4, 12, 4], [40, 16]], ['leftArm', [-1, -2, -2], [4, 12, 4], [40, 16], true]],
  legs: [['body', [-4, 0, -2], [8, 12, 4], [16, 16]], ['rightLeg', [-2, 0, -2], [4, 12, 4], [0, 16]], ['leftLeg', [-2, 0, -2], [4, 12, 4], [0, 16], true]],
  feet: [['rightLeg', [-2, 0, -2], [4, 12, 4], [0, 16]], ['leftLeg', [-2, 0, -2], [4, 12, 4], [0, 16], true]]
}
const ARMOR_MATERIAL = (item) => { const m = /^(leather|chainmail|iron|golden|diamond|netherite|copper|turtle)_(helmet|chestplate|leggings|boots)$/.exec(item || ''); return m ? (m[1] === 'golden' ? 'gold' : m[1] === 'turtle' ? 'turtle_scute' : m[1]) : null }
// the armour texture layers for one slot: the material, then its trim (TrimmedArmorLayer: trims/entity/<humanoid|
// humanoid_leggings>/<pattern> in the material's palette; extra.trims[i] = 'pattern/material')
function armorLayers (mat, dir, trim) {
  const L = mat === 'leather' ? [`entity/equipment/${dir}/leather#a06540`, `entity/equipment/${dir}/leather_overlay`] : [`entity/equipment/${dir}/${mat}`]
  const m = trim && /^([a-z_]+)\/([a-z_]+)$/.exec(trim)
  // the material's darker palette on armour of its own metal (TrimMaterial override_armor_assets: gold on gold)
  if (m) L.push(`trims/entity/${dir}/${m[1]}@${m[2] === mat || (m[2] === 'gold' && mat === 'gold') ? m[2] + '_darker' : m[2]}`)
  return L
}
async function addArmor (bones, armor, trims) {
  const slots = ['feet', 'legs', 'chest', 'head']
  for (let i = 0; i < 4; i++) {
    const mat = ARMOR_MATERIAL(armor[i]); if (!mat) continue
    const legs = slots[i] === 'legs', dir = legs ? 'humanoid_leggings' : 'humanoid'
    // leather: the dyed base (default leather colour A06540) under the undyed overlay (DyedItemColor)
    const t = await texture(armorLayers(mat, dir, trims && trims[i]))
    if (!t) continue
    const m = new THREE.MeshBasicMaterial({ map: t.tex, vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide, fog: true })
    for (const [bone, min, size, uv, mirror, extra] of ARMOR_PARTS[slots[i]]) {
      if (!bones[bone]) continue
      const all = { pos: [], uv: [], col: [], idx: [] }
      javaCube(min, size, uv, (legs ? 0.5 : 1.0) + (extra || 0), t.w, t.h, all, !!mirror)
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.Float32BufferAttribute(all.pos, 3))
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(all.uv, 2))
      geom.setAttribute('color', new THREE.Float32BufferAttribute(all.col, 3))
      geom.setIndex(all.idx)
      bones[bone].add(new THREE.Mesh(geom, m))
    }
    ;(bones.armorMats = bones.armorMats || []).push(m)
  }
}
// Armour on a humanoid mob (HumanoidArmorLayer on a zombie, skeleton, piglin...): the converted (Bedrock) geometry's
// own bones, the armour cubes taken from each bone's first cube (the helmet is the 8x8x8 humanoid head on the head's
// pivot: a piglin's 10-wide snout head gets the plain helmet, PiglinModel's armour set), grown 1.0 (piglins 1.02:
// LayerDefinitions PIGLIN_OUTER_ARMOR) or 0.5 for leggings, textured from entity/equipment/humanoid[_leggings].
const MOB_ARMOR_BONES = { head: ['head'], chest: ['body', 'rightarm', 'leftarm'], legs: ['body', 'rightleg', 'leftleg'], feet: ['rightleg', 'leftleg'] }
async function addMobArmor (geo, bones, armor, trims) {
  const slots = ['feet', 'legs', 'chest', 'head']
  const defs = {}; for (const b of geo.bones) defs[b.name.toLowerCase()] = b
  const piglin = !!defs.leftear
  for (let i = 0; i < 4; i++) {
    const mat = ARMOR_MATERIAL(armor[i]); if (!mat) continue
    const legs = slots[i] === 'legs', dir = legs ? 'humanoid_leggings' : 'humanoid'
    const t = await texture(armorLayers(mat, dir, trims && trims[i])); if (!t) continue
    const grow = legs ? 0.5 : (piglin ? 1.02 : 1.0)
    const mini = []
    for (const bn of MOB_ARMOR_BONES[slots[i]]) {
      const d = defs[bn]; if (!d || !bones[d.name]) continue
      const c0 = (d.cubes || [])[0]
      let cube
      if (bn === 'head') cube = { origin: [-4, d.pivot[1], -4], size: [8, 8, 8], uv: [0, 0], inflate: grow }
      else if (c0) {
        const uv = bn === 'body' ? (legs ? [16, 16] : [16, 16]) : /arm/.test(bn) ? [40, 16] : [0, 16]
        cube = { origin: c0.origin, size: c0.size, uv, inflate: grow, mirror: /^left/.test(bn) }
      }
      if (cube) mini.push({ name: d.name, pivot: d.pivot, cubes: [cube] })
    }
    if (!mini.length) continue
    const a = build({ bones: mini }, t)
    for (const [bn, g] of Object.entries(a.bones)) if (bones[bn]) for (const m of [...g.children].filter(c => c.isMesh)) bones[bn].add(m)
    ;(bones.armorMats = bones.armorMats || []).push(a.mat)
  }
}
// WitchModel.createBodyLayer: VillagerModel's body (texture 64x128) with the bent four-piece hat and
// a mole on the nose instead of the villager hat. The converted geometry held only the hat pieces.
const WITCH_PARTS = [
  ['head', null, [0, 0, 0], [[[-4, -10, -4], [8, 10, 8], [0, 0], 0]]],
  ['hat', 'head', [-5, -10.03125, -5], [[[0, 0, 0], [10, 2, 10], [0, 64], 0]]],
  ['hat2', 'hat', [1.75, -4, 2], [[[0, 0, 0], [7, 4, 7], [0, 76], 0]], [-0.05235988, 0, 0.02617994]],
  ['hat3', 'hat2', [1.75, -4, 2], [[[0, 0, 0], [4, 4, 4], [0, 87], 0]], [-0.10471976, 0, 0.05235988]],
  ['hat4', 'hat3', [1.75, -2, 2], [[[0, 0, 0], [1, 2, 1], [0, 95], 0.25]], [-0.20943952, 0, 0.10471976]],
  ['nose', 'head', [0, -2, 0], [[[-1, -1, -6], [2, 4, 2], [24, 0], 0]]],
  ['mole', 'nose', [0, -2, 0], [[[0, 3, -6.75], [1, 1, 1], [0, 0], -0.25]]],
  ['body', null, [0, 0, 0], [[[-4, 0, -3], [8, 12, 6], [16, 20], 0]]],
  ['jacket', 'body', [0, 0, 0], [[[-4, 0, -3], [8, 20, 6], [0, 38], 0.5]]],
  ['arms', null, [0, 3, -1], [[[-8, -2, -2], [4, 8, 4], [44, 22], 0], [[4, -2, -2], [4, 8, 4], [44, 22], 0], [[-4, 2, -2], [8, 4, 4], [40, 38], 0]], [-0.75, 0, 0]],
  ['rightLeg', null, [-2, 12, 0], [[[-2, 0, -2], [4, 12, 4], [0, 22], 0]]],
  ['leftLeg', null, [2, 12, 0], [[[-2, 0, -2], [4, 12, 4], [0, 22], 0]]]
]
// VillagerModel.setupAnim: head look, legs swing at half the humanoid amount, crossed arms still
function poseWitch (r, s, walkPos, walkSpeed) {
  const B = r.bones
  let net = -((s.headYaw ?? s.yaw) - s.yaw); while (net > Math.PI) net -= 2 * Math.PI; while (net < -Math.PI) net += 2 * Math.PI
  r.obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationY(s.yaw).multiply(new THREE.Matrix4().makeRotationZ(r.tilt || 0)))
  B.head.rotation.set(-(s.pitch || 0), net, 0)
  B.rightLeg.rotation.set(Math.cos(walkPos * 0.6662) * 1.4 * walkSpeed * 0.5, 0, 0)
  B.leftLeg.rotation.set(Math.cos(walkPos * 0.6662 + Math.PI) * 1.4 * walkSpeed * 0.5, 0, 0)
}
// AbstractEquineModel.createBodyMesh + HorseModel ears (64x64, HorseRenderer scale 1.1). Coat and
// markings default to brown (variant isn't recorded yet)
const HORSE_PARTS = [
  ['body', null, [0, 11, 5], [[[-5, -8, -17], [10, 10, 22], [0, 32], 0.05]]],
  ['tail', 'body', [0, -5, 2], [[[-1.5, 0, 0], [3, 14, 4], [42, 36], 0]], [Math.PI / 6, 0, 0]],
  ['neck', null, [0, 4, -12], [[[-2.05, -6, -2], [4, 12, 7], [0, 35], 0]], [Math.PI / 6, 0, 0]],
  ['head', 'neck', [0, 0, 0], [[[-3, -11, -2], [6, 5, 7], [0, 13], 0], [[0.55, -13, 4], [2, 3, 1], [19, 16], -0.001], [[-2.55, -13, 4], [2, 3, 1], [19, 16], -0.001]]],
  ['mane', 'neck', [0, 0, 0], [[[-1, -11, 5.01], [2, 16, 2], [56, 36], 0]]],
  ['mouth', 'neck', [0, 0, 0], [[[-2, -11, -7], [4, 5, 5], [0, 25], 0]]],
  ['leftHindLeg', null, [4, 14, 7], [[[-3, -1.01, -1], [4, 11, 4], [48, 21], 0]]],
  ['rightHindLeg', null, [-4, 14, 7], [[[-1, -1.01, -1], [4, 11, 4], [48, 21], 0]]],
  ['leftFrontLeg', null, [4, 14, -12], [[[-3, -1.01, -1.9], [4, 11, 4], [48, 21], 0]]],
  ['rightFrontLeg', null, [-4, 14, -12], [[[-1, -1.01, -1.9], [4, 11, 4], [48, 21], 0]]]
]
// AbstractEquineModel.setupAnim (walking): diagonal leg pairs, the neck carries the head look
function poseHorse (r, s, walkPos, walkSpeed) {
  const B = r.bones
  let net = -((s.headYaw ?? s.yaw) - s.yaw); while (net > Math.PI) net -= 2 * Math.PI; while (net < -Math.PI) net += 2 * Math.PI
  r.obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationY(s.yaw).multiply(new THREE.Matrix4().makeRotationZ(r.tilt || 0)))
  B.neck.rotation.set(Math.PI / 6 - (s.pitch || 0), Math.max(-0.9, Math.min(0.9, net)), 0)
  const a = Math.cos(walkPos * 0.6662) * 1.4 * walkSpeed, b = Math.cos(walkPos * 0.6662 + Math.PI) * 1.4 * walkSpeed
  B.rightHindLeg.rotation.set(a, 0, 0); B.leftFrontLeg.rotation.set(a, 0, 0)
  B.leftHindLeg.rotation.set(b, 0, 0); B.rightFrontLeg.rotation.set(b, 0, 0)
  B.tail.rotation.set(Math.PI / 6 + walkSpeed * 0.75, 0, 0)
}
// WardenModel.createBodyLayer (128x128): a root bone at y 24 carrying the body (ribcage panels, head
// with the two tendrils, 28 px arms) and the legs; about 3 blocks tall
const WARDEN_PARTS = [
  ['bone', null, [0, 24, 0], []],
  ['body', 'bone', [0, -21, 0], [[[-9, -13, -4], [18, 21, 11], [0, 0], 0]]],
  ['rightRibcage', 'body', [-7, -2, -4], [[[-2, -11, -0.1], [9, 21, 0], [90, 11], 0]]],
  ['leftRibcage', 'body', [7, -2, -4], [[[-7, -11, -0.1], [9, 21, 0], [90, 11], 0]]],
  ['head', 'body', [0, -13, 0], [[[-8, -16, -5], [16, 16, 10], [0, 32], 0]]],
  ['rightTendril', 'head', [-8, -12, 0], [[[-16, -13, 0], [16, 16, 0], [52, 32], 0]]],
  ['leftTendril', 'head', [8, -12, 0], [[[0, -13, 0], [16, 16, 0], [58, 0], 0]]],
  ['rightArm', 'body', [-13, -13, 1], [[[-4, 0, -4], [8, 28, 8], [44, 50], 0]]],
  ['leftArm', 'body', [13, -13, 1], [[[-4, 0, -4], [8, 28, 8], [0, 58], 0]]],
  ['rightLeg', 'bone', [-5.9, -13, 0], [[[-3.1, 0, -3], [6, 13, 6], [76, 48], 0]]],
  ['leftLeg', 'bone', [5.9, -13, 0], [[[-2.9, 0, -3], [6, 13, 6], [76, 76], 0]]]
]
// WardenModel.animateWalk (simplified): legs and arms swing against each other, the head looks, the
// tendrils sway with time
function poseWarden (r, s, walkPos, walkSpeed, tick) {
  const B = r.bones
  let net = -((s.headYaw ?? s.yaw) - s.yaw); while (net > Math.PI) net -= 2 * Math.PI; while (net < -Math.PI) net += 2 * Math.PI
  r.obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationY(s.yaw).multiply(new THREE.Matrix4().makeRotationZ(r.tilt || 0)))
  B.head.rotation.set(-(s.pitch || 0), net, 0)
  const sw = Math.cos(walkPos * 0.6662) * Math.min(1, walkSpeed * 2), f = 0.5
  B.rightLeg.rotation.set(sw * 1.4 * f, 0, 0); B.leftLeg.rotation.set(-sw * 1.4 * f, 0, 0)
  B.rightArm.rotation.set(-sw * f, 0, 0); B.leftArm.rotation.set(sw * f, 0, 0)
  const tw = Math.sin((tick || 0) * 0.15) * 0.1
  B.rightTendril.rotation.set(0, tw, 0); B.leftTendril.rotation.set(0, -tw, 0)
  // roaring (Pose.ROARING, WardenAnimation.WARDEN_ROAR, 4.2 s): leans back, the head thrown up and
  // the arms flung out and up; eases in over 0.5 s, holds, eases out over the last 0.7 s
  if (s.extra && s.extra.roar) { if (r.roarT === undefined) r.roarT = s.extra.roarT ?? tick } else r.roarT = undefined
  if (r.roarT !== undefined) {
    const e = (tick - r.roarT) / 20
    const k = e < 0.5 ? e / 0.5 : e < 3.5 ? 1 : Math.max(0, 1 - (e - 3.5) / 0.7)
    const q = k * k * (3 - 2 * k)
    B.body.rotation.x = -0.25 * q
    B.head.rotation.x += -0.3 * q
    B.rightArm.rotation.set(-0.5 * q, 0, 1.1 * q); B.leftArm.rotation.set(-0.5 * q, 0, -1.1 * q)
    const shake = q * Math.sin(tick * 2.1) * 0.04
    B.head.rotation.z = shake
  } else if (B.body) B.body.rotation.x = 0
  // emerging (Pose.EMERGING, WardenAnimation.WARDEN_EMERGE, 6.68 s) and digging back down (Pose.DIGGING, 5 s): the
  // body rises out of the ground in three heaves, the arms reaching up and then pushing on the ground; digging plays
  // it backwards and faster. extra.emerge / extra.dig = { t: the start tick } (render.js: recorded poses, or a
  // staged ctx.mark('pose', { ids, emerge: true })).
  const ed = s.extra && (s.extra.emerge || s.extra.dig)
  if (ed) {
    const dig = !s.extra.emerge, len = dig ? 5 : 6.68
    let e = Math.max(0, Math.min(1, ((tick || 0) - (ed.t ?? tick)) / 20 / len))
    if (dig) e = 1 - e
    // the height out of the ground, 0..1, in heaves (each a quick pull then a hold)
    const heave = (u, a, b) => { const v = Math.max(0, Math.min(1, (u - a) / (b - a))); return v * v * (3 - 2 * v) }
    const up = 0.3 * heave(e, 0.08, 0.22) + 0.35 * heave(e, 0.3, 0.5) + 0.35 * heave(e, 0.58, 0.85)
    r.obj.position.y -= 3.1 * (1 - up)
    const reach = 1 - heave(e, 0.45, 0.7), push = heave(e, 0.4, 0.55) * (1 - heave(e, 0.85, 1))
    B.rightArm.rotation.set(-2.6 * reach - 0.9 * push, 0, 0.25 * reach); B.leftArm.rotation.set(-2.6 * reach - 0.9 * push, 0, -0.25 * reach)
    B.body.rotation.x = 0.3 * (1 - heave(e, 0.8, 1))
    B.head.rotation.x += -0.35 * reach
  }
  if (B.layers) {
    // spots: max(0, cos(age * 0.045) * 0.25) and its opposite phase; the heart flashes to 1 every
    // 40 ticks (a calm warden's heartbeat) and fades over 10
    const t = tick || 0
    B.layers[1].opacity = Math.max(0, Math.cos(t * 0.045) * 0.25)
    B.layers[2].opacity = Math.max(0, Math.cos(t * 0.045 + Math.PI) * 0.25)
    B.layers[3].opacity = Math.max(0, 10 - (t % 40)) / 10
  }
}
// BoatModel.createBoatModel (texture 128x64): the hull from five planks and the two oars. Built in
// Java space; BoatRenderer's T(0, 0.375, 0) S(-1, -1, 1) Ry(90) replaces the living-entity transform
const BH = Math.PI / 2
const BOAT_PARTS = [
  ['bottom', null, [0, 3, 1], [[[-14, -9, -3], [28, 16, 3], [0, 0], 0]], [BH, 0, 0]],
  ['back', null, [-15, 4, 4], [[[-13, -7, -1], [18, 6, 2], [0, 19], 0]], [0, 3 * BH, 0]],
  ['front', null, [15, 4, 0], [[[-8, -7, -1], [16, 6, 2], [0, 27], 0]], [0, BH, 0]],
  ['right', null, [0, 4, -9], [[[-14, -7, -1], [28, 6, 2], [0, 35], 0]], [0, Math.PI, 0]],
  ['left', null, [0, 4, 9], [[[-14, -7, -1], [28, 6, 2], [0, 43], 0]]],
  ['leftPaddle', null, [3, -5, 9], [[[-1, 0, -5], [2, 2, 18], [62, 0], 0], [[-1.001, -3, 8], [1, 6, 7], [62, 0], 0]], [0, 0, Math.PI / 16]],
  // water_patch (RenderType.waterMask: depth only): hides the water inside the hull
  ['waterPatch', null, [0, -3, 1], [[[-14, -9, -3], [28, 16, 3], [0, 0], 0]], [BH, 0, 0]],
  ['rightPaddle', null, [3, -5, -9], [[[-1, 0, -5], [2, 2, 18], [62, 20], 0], [[0.001, -3, 8], [1, 6, 7], [62, 20], 0]], [0, Math.PI, Math.PI / 16]]
]
// BoatModel.animatePaddle: rowing time f (0 when not paddling, + PI/8 a tick while paddling)
function poseBoatPaddle (part, f, right) {
  const L = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t))
  const x = L(-Math.PI / 3, -Math.PI / 12, (Math.sin(-f) + 1) / 2)
  let y = L(-Math.PI / 4, Math.PI / 4, (Math.sin(-f + 1) + 1) / 2)
  if (right) y = Math.PI - y
  part.rotation.set(x, y, Math.PI / 16)
}
// FoxModel.createBodyLayer (48x32; the converted Bedrock fox was laid out for a 64x32 texture, so
// its head and body showed the wrong texels): head with ears and nose, the body turned flat (pi/2)
// carrying the tail, four legs
const FOX_PARTS = [
  ['head', null, [-1, 16.5, -3], [[[-3, -2, -5], [8, 6, 6], [1, 5], 0], [[-3, -4, -4], [2, 2, 1], [8, 1], 0], [[3, -4, -4], [2, 2, 1], [15, 1], 0], [[-1, 2.01, -8], [4, 2, 3], [6, 18], 0]]],
  ['body', null, [0, 16, -6], [[[-3, 3.999, -3.5], [6, 11, 6], [24, 15], 0]], [Math.PI / 2, 0, 0]],
  ['tail', 'body', [-4, 15, -1], [[[2, 0, -1], [4, 9, 5], [30, 0], 0]], [-0.05235988, 0, 0]],
  ['rightHindLeg', null, [-5, 17.5, 7], [[[2, 0.5, -1], [2, 6, 2], [13, 24], 0.001]]],
  ['leftHindLeg', null, [-1, 17.5, 7], [[[2, 0.5, -1], [2, 6, 2], [4, 24], 0.001]]],
  ['rightFrontLeg', null, [-5, 17.5, 0], [[[2, 0.5, -1], [2, 6, 2], [13, 24], 0.001]]],
  ['leftFrontLeg', null, [-1, 17.5, 0], [[[2, 0.5, -1], [2, 6, 2], [4, 24], 0.001]]]
]
// WolfModel.createBodyLayer (texture 64x32): the head (with ears and snout), the body and the mane turned flat
// (xRot pi/2), four 8 px legs and the tail. The converted Bedrock geometry needs its wolf_setup animation for that
// turn, which we never ran: the body stood upright
const WL = [[[0, 0, -1], [2, 8, 2], [0, 18], 0]]
const WOLF_PARTS = [
  ['head', null, [-1, 13.5, -7], [[[-2, -3, -2], [6, 6, 4], [0, 0], 0], [[-2, -5, 0], [2, 2, 1], [16, 14], 0], [[2, -5, 0], [2, 2, 1], [16, 14], 0], [[-0.5, -0.001, -5], [3, 3, 4], [0, 10], 0]]],
  ['body', null, [0, 14, 2], [[[-3, -2, -3], [6, 9, 6], [18, 14], 0]], [Math.PI / 2, 0, 0]],
  ['upperBody', null, [-1, 14, -3], [[[-3, -3, -3], [8, 6, 7], [21, 0], 0]], [Math.PI / 2, 0, 0]],
  ['rightHindLeg', null, [-2.5, 16, 7], WL], ['leftHindLeg', null, [0.5, 16, 7], WL],
  ['rightFrontLeg', null, [-2.5, 16, -4], WL], ['leftFrontLeg', null, [0.5, 16, -4], WL],
  ['tail', null, [-1, 12, 8], [[[0, 0, -1], [2, 8, 2], [9, 18], 0]], [Math.PI / 5, 0, 0]]
]
// WolfModel.prepareMobModel + setupAnim: sitting (extra.sitting) folds the hind legs under and tips the body up;
// walking swings the legs; a tamed wolf at full health holds its tail high (0.55 pi), a wild one at pi/5; the tail
// wags with the walk unless angry
function poseWolf (r, s, walkPos, walkSpeed) {
  const B = r.bones, x = s.extra || {}
  let net = -((s.headYaw ?? s.yaw) - s.yaw); while (net > Math.PI) net -= 2 * Math.PI; while (net < -Math.PI) net += 2 * Math.PI
  r.obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationY(s.yaw))
  B.head.rotation.set(-(s.pitch || 0), net, 0)
  const tail = x.tame ? 0.55 * Math.PI : Math.PI / 5
  B.tail.rotation.set(tail, x.angry ? 0 : Math.cos(walkPos * 0.6662) * 1.4 * walkSpeed, 0)
  if (x.sitting) {
    B.upperBody.position.set(-1, 16, -3); B.upperBody.rotation.set(1.2566371, 0, 0)
    B.body.position.set(0, 18, 0); B.body.rotation.set(Math.PI / 4, 0, 0)
    B.tail.position.set(-1, 21, 6)
    B.rightHindLeg.position.set(-2.5, 22.7, 2); B.rightHindLeg.rotation.set(4.712389, 0, 0)
    B.leftHindLeg.position.set(0.5, 22.7, 2); B.leftHindLeg.rotation.set(4.712389, 0, 0)
    B.rightFrontLeg.position.set(-2.49, 17, -4); B.rightFrontLeg.rotation.set(5.811947, 0, 0)
    B.leftFrontLeg.position.set(0.51, 17, -4); B.leftFrontLeg.rotation.set(5.811947, 0, 0)
  } else {
    B.body.position.set(0, 14, 2); B.body.rotation.set(Math.PI / 2, 0, 0)
    B.upperBody.position.set(-1, 14, -3); B.upperBody.rotation.set(Math.PI / 2, 0, 0)
    B.tail.position.set(-1, 12, 8)
    const a = Math.cos(walkPos * 0.6662) * 1.4 * walkSpeed, b = Math.cos(walkPos * 0.6662 + Math.PI) * 1.4 * walkSpeed
    B.rightHindLeg.position.set(-2.5, 16, 7); B.leftHindLeg.position.set(0.5, 16, 7)
    B.rightFrontLeg.position.set(-2.5, 16, -4); B.leftFrontLeg.position.set(0.5, 16, -4)
    B.rightHindLeg.rotation.set(a, 0, 0); B.leftHindLeg.rotation.set(b, 0, 0)
    B.rightFrontLeg.rotation.set(b, 0, 0); B.leftFrontLeg.rotation.set(a, 0, 0)
  }
}
// FoxModel.setupAnim: the head looks; quadruped legs (hind and front pairs opposite)
function poseFox (r, s, walkPos, walkSpeed) {
  const B = r.bones
  let net = -((s.headYaw ?? s.yaw) - s.yaw); while (net > Math.PI) net -= 2 * Math.PI; while (net < -Math.PI) net += 2 * Math.PI
  r.obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationY(s.yaw).multiply(new THREE.Matrix4().makeRotationZ(r.tilt || 0)))
  B.head.rotation.set(-(s.pitch || 0), net, 0)
  const a = Math.cos(walkPos * 0.6662) * 1.4 * walkSpeed, b = Math.cos(walkPos * 0.6662 + Math.PI) * 1.4 * walkSpeed
  B.rightHindLeg.rotation.set(a, 0, 0); B.leftHindLeg.rotation.set(b, 0, 0)
  B.rightFrontLeg.rotation.set(b, 0, 0); B.leftFrontLeg.rotation.set(a, 0, 0)
}
// SpiderModel.createSpiderBodyLayer (texture 64x32): head, neck, abdomen and eight 16 px legs out to
// the sides from the neck. The converted Bedrock geometry kept its leg spread in an animation we
// never applied: the legs stuck straight out level, stacked (worker 13, guess_sound_2)
const SL = [[[-15, -1, -1], [16, 2, 2], [18, 0], 0]], SR = [[[-1, -1, -1], [16, 2, 2], [18, 0], 0]]
const SPIDER_PARTS = [
  ['head', null, [0, 15, -3], [[[-4, -4, -8], [8, 8, 8], [32, 4], 0]]],
  ['neck', null, [0, 15, 0], [[[-3, -3, -3], [6, 6, 6], [0, 0], 0]]],
  ['abdomen', null, [0, 15, 9], [[[-5, -4, -6], [10, 8, 12], [0, 12], 0]]],
  ['rightHindLeg', null, [-4, 15, 2], SL], ['leftHindLeg', null, [4, 15, 2], SR],
  ['rightMiddleHindLeg', null, [-4, 15, 1], SL], ['leftMiddleHindLeg', null, [4, 15, 1], SR],
  ['rightMiddleFrontLeg', null, [-4, 15, 0], SL], ['leftMiddleFrontLeg', null, [4, 15, 0], SR],
  ['rightFrontLeg', null, [-4, 15, -1], SL], ['leftFrontLeg', null, [4, 15, -1], SR]
]
// SpiderModel.setupAnim: the legs angled down (zRot +-pi/4, the middle pairs x 0.74) and fanned
// (yRot +-pi/8 steps), then the walk: yRot swings and zRot lifts in four phases
function poseSpider (r, s, walkPos, walkSpeed) {
  const B = r.bones
  let net = -((s.headYaw ?? s.yaw) - s.yaw); while (net > Math.PI) net -= 2 * Math.PI; while (net < -Math.PI) net += 2 * Math.PI
  r.obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationY(s.yaw).multiply(new THREE.Matrix4().makeRotationZ(r.tilt || 0)))
  B.head.rotation.set(-(s.pitch || 0), net, 0)
  const f = Math.PI / 4, f1 = Math.PI / 8, p = walkPos * 0.6662, v = walkSpeed
  const sw = (o) => -(Math.cos(p * 2 + o) * 0.4) * v, up = (o) => Math.abs(Math.sin(p + o) * 0.4) * v
  const legs = [['HindLeg', 1, 2, 0], ['MiddleHindLeg', 0.74, 1, Math.PI], ['MiddleFrontLeg', 0.74, -1, Math.PI / 2], ['FrontLeg', 1, -2, Math.PI * 1.5]]
  for (const [n, zk, yk, o] of legs) {
    const y = yk * f1 + sw(o), z = zk * f + up(o)
    B['right' + n].rotation.set(0, y, -z)
    B['left' + n].rotation.set(0, -y, z)
  }
}
// MagmaCubeModel (1.21 texture, 64x64): eight 8x1x8 slices down the cube (strips at (0, 9i) for the
// top four, (32, 9(i-4)) for the rest; the eyes are on slices 2 and 3) and a 4x4x4 core at (24, 40).
// The converted Bedrock geometry used the old 64x32 layout: a dark block in two offset halves
const MAGMA_PARTS = [...Array(8).keys()].map(i => [`cube${i}`, null, [0, 0, 0], [[[-4, 16 + i, -4], [8, 1, 8], [i < 4 ? 0 : 32, i < 4 ? 9 * i : 9 * (i - 4)], 0]]])
  .concat([['insideCube', null, [0, 0, 0], [[[-2, 18, -2], [4, 4, 4], [24, 40], 0]]]])
// EndermanModel.createBodyLayer (HumanoidModel.createMesh at y offset -14; texture 64x32): the head
// on top of the 12 px body, 30 px arms from the shoulders, 30 px legs. Built in Java space like the
// player (the converted Bedrock geometry had the head sunk into the body and the arms poking above it)
const ENDERMAN_PARTS = [
  ['head', null, [0, -13, 0], [[[-4, -8, -4], [8, 8, 8], [0, 0], 0]]],
  ['hat', 'head', [0, 0, 0], [[[-4, -8, -4], [8, 8, 8], [0, 16], -0.5]]],
  ['body', null, [0, -14, 0], [[[-4, 0, -2], [8, 12, 4], [32, 16], 0]]],
  ['rightArm', null, [-5, -12, 0], [[[-1, -2, -1], [2, 30, 2], [56, 0], 0]]],
  ['leftArm', null, [5, -12, 0], [[[-1, -2, -1], [2, 30, 2], [56, 0], 0]]],
  ['rightLeg', null, [-2, -5, 0], [[[-1, 0, -1], [2, 30, 2], [56, 0], 0]]],
  ['leftLeg', null, [2, -5, 0], [[[-1, 0, -1], [2, 30, 2], [56, 0], 0]]]
]
// EndermanModel.setupAnim: the humanoid walk, then arms and legs x 0.5 clamped to +-0.4 rad
function poseEnderman (r, s, walkPos, walkSpeed) {
  const B = r.bones
  let net = -((s.headYaw ?? s.yaw) - s.yaw); while (net > Math.PI) net -= 2 * Math.PI; while (net < -Math.PI) net += 2 * Math.PI
  r.obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationY(s.yaw).multiply(new THREE.Matrix4().makeRotationZ(r.tilt || 0)))
  B.head.rotation.set(-(s.pitch || 0), net, 0)
  const c = (v) => Math.max(-0.4, Math.min(0.4, v * 0.5))
  B.rightArm.rotation.set(c(Math.cos(walkPos * 0.6662 + Math.PI) * walkSpeed), 0, 0)
  B.leftArm.rotation.set(c(Math.cos(walkPos * 0.6662) * walkSpeed), 0, 0)
  if (B.carried) { B.rightArm.rotation.set(-0.5, 0, 0.05); B.leftArm.rotation.set(-0.5, 0, -0.05) }   // carrying: arms out
  B.rightLeg.rotation.set(c(Math.cos(walkPos * 0.6662) * 1.4 * walkSpeed), 0, 0)
  B.leftLeg.rotation.set(c(Math.cos(walkPos * 0.6662 + Math.PI) * 1.4 * walkSpeed), 0, 0)
  // creepy (screaming at you, EnderMan.DATA_CREEPY): the head rises 5 px off the jaw (the hat layer
  // stays: the mouth gapes), and EndermanRenderer.getRenderOffset shakes it by gaussian x 0.02
  const creepy = !!(s.extra && s.extra.creepy)
  B.head.position.y = -13 - (creepy ? 5 : 0)
  if (B.hat) B.hat.position.y = creepy ? 5 : 0
  if (creepy) {
    const g = () => { const u = Math.random() || 1e-9; return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()) }
    r.obj.position.x += g() * 0.02; r.obj.position.z += g() * 0.02
  }
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
  B.head.position.set(0, 0, 0); B.body.position.set(0, 0, 0); B.rightLeg.position.set(-1.9, 12, 0); B.leftLeg.position.set(1.9, 12, 0)
  B.head.rotation.y = net; B.head.rotation.x = -(s.pitch || 0)
  const pos = p.walkPos || 0, spd = p.walkSpeed || 0
  B.rightArm.rotation.x = Math.cos(pos * 0.6662 + Math.PI) * 2 * spd * 0.5
  B.leftArm.rotation.x = Math.cos(pos * 0.6662) * 2 * spd * 0.5
  B.rightLeg.rotation.x = Math.cos(pos * 0.6662) * 1.4 * spd
  B.leftLeg.rotation.x = Math.cos(pos * 0.6662 + Math.PI) * 1.4 * spd
  if (p.holding) B.rightArm.rotation.x = B.rightArm.rotation.x * 0.5 - Math.PI / 10   // ArmPose.ITEM
  if (p.offHeld) B.leftArm.rotation.x = B.leftArm.rotation.x * 0.5 - Math.PI / 10      // the off hand's ArmPose.ITEM
  // HumanoidModel.setupAnim, crouching (movie actors and the player seen from outside, docs/movie_engine.md): the body
  // leans 0.5, the arms come forward 0.4, the legs step back 4 px, everything above the hips drops; PlayerRenderer
  // lowers the whole model 0.125 blocks (getRenderOffset)
  if (p.crouch) {
    B.body.rotation.x = 0.5; B.rightArm.rotation.x += 0.4; B.leftArm.rotation.x += 0.4
    B.rightLeg.position.set(-1.9, 12.2, 4); B.leftLeg.position.set(1.9, 12.2, 4)
    B.head.position.y = 4.2; B.body.position.y = 3.2; B.rightArm.position.y = 5.2; B.leftArm.position.y = 5.2
    r.obj.position.y -= 0.125
  }
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
  // staged poses (renderer/poses.js: sit, drink, wave, lie...), eased in by render.js; nothing changes without one
  if (p.poses && p.poses.length) {
    const { drop, root } = applyPoses(B, p.poses, age)
    r.obj.position.y -= drop
    if (root) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(root.rot[0], root.rot[1], root.rot[2], 'XYZ'))
      const off = new THREE.Vector3(...root.off).applyQuaternion(r.obj.quaternion)
      r.obj.quaternion.multiply(q); r.obj.position.add(off)
    }
  }
  r.mat.userData.red.value = (p.hurt || p.deathTime > 0) ? 1 : 0
}

function sheepColor (s, tick) {
  if (s.extra?.jeb) {
    const k = Math.floor(tick / 25) + s.id, f = (tick % 25) / 25
    const a = woolColor(k % 16), b = woolColor((k + 1) % 16)
    return a.map((v, i) => v * (1 - f) + b[i] * f)
  }
  return woolColor(s.extra?.color || 0)
}
// hitbox width / height (EntityType sizes) for the fire overlay
const HITBOX_W = { zombie: 0.6, skeleton: 0.6, creeper: 0.6, villager: 0.6, cow: 0.9, sheep: 0.9, pig: 0.9, chicken: 0.4, spider: 1.4, enderman: 0.6, iron_golem: 1.4, wolf: 0.6, horse: 1.3965, slime: 0.52, husk: 0.6, drowned: 0.6, witch: 0.6, pillager: 0.6, blaze: 0.6, warden: 0.9 }
const HITBOX_H = { zombie: 1.95, skeleton: 1.99, creeper: 1.7, villager: 1.95, cow: 1.4, sheep: 1.3, pig: 0.9, chicken: 0.7, spider: 0.9, enderman: 2.9, iron_golem: 2.7, wolf: 0.85, horse: 1.6, slime: 0.52, husk: 1.95, drowned: 1.95, witch: 1.95, pillager: 1.95, blaze: 1.8, warden: 2.9 }
// Baby models (AgeableListModel / BabyModelTransform): [scaleHead, yHeadOffset, zHeadOffset,
// babyHeadScale, babyBodyScale]. The body draws at 1/bodyScale from the ground; the head parts at
// f = scaleHead ? 1.5 / headScale : 1 (adult size when false: piglets and calves have big heads),
// moved by the offsets (Java px, y down) before scaling. Villagers just draw at half size.
// Mobs not listed: half size with the head at 0.75 of the adult's.
const BABY = {
  pig: [false, 4, 4, 2, 2], cow: [false, 10, 4, 2, 2], mooshroom: [false, 10, 4, 2, 2], sheep: [false, 8, 4, 2, 2],
  chicken: [false, 5, 2, 2, 2], polar_bear: [true, 16, 4, 2.25, 2], panda: [true, 23, 4.8, 2.7, 3], turtle: [true, 120, 0, 9, 6],
  cat: [true, 10, 4, 2, 2], ocelot: [true, 10, 4, 2, 2],
  zombie: [true, 16, 0, 2, 2], husk: [true, 16, 0, 2, 2], drowned: [true, 16, 0, 2, 2], zombie_villager: [true, 16, 0, 2, 2], zombified_piglin: [true, 16, 0, 2, 2], piglin: [true, 16, 0, 2, 2],
  villager: 'uniform', wandering_trader: 'uniform'
}
function poseBaby (r, name) {
  const t = BABY[name] || [true, 0, 0, 2, 2]
  if (t === 'uniform') { r.obj.scale.multiplyScalar(0.5); return }
  const [scaleHead, yOff, zOff, hs, bs] = t
  r.obj.scale.multiplyScalar(1 / bs)
  const h = r.bones.head
  if (!h || !h.userData.pivot) return
  if (!h.userData.babyPos) {
    // the head's pivot in model px (Bedrock y up from the ground; Java y = 24 - y), moved and scaled
    // as Java does, then back into the body's 1/bs space, relative to the parent bone's pivot
    const f = scaleHead ? 1.5 / hs : 1, p = h.userData.pivot
    const ppiv = h.parent && h.parent.userData.pivot ? h.parent.userData.pivot : new THREE.Vector3()
    const q = new THREE.Vector3(p.x * f, 24 - (24 - p.y + yOff) * f, (p.z + zOff) * f).multiplyScalar(bs)
    h.userData.babyPos = q.sub(ppiv); h.userData.babyScale = f * bs
  }
  h.position.copy(h.userData.babyPos); h.scale.setScalar(h.userData.babyScale)
}

function B_isBlock (n) { return n === 'falling_block' || n === 'moving_block' || n === 'item_frame' || n === 'glow_item_frame' }

export class EntityLayer {
  constructor (scene, regs) { this.scene = scene; this.regs = regs || {}; this.live = new Map(); this.pending = new Set(); this.blockModels = new Map() }
  static async loadModels () { if (!MODELS) MODELS = await (await fetch('/entity_models.json')).json() }

  async ensure (id, name, extra) {
    // (an extra left empty once the animated-only keys are dropped is the same as none: a pose_off
    // rebuilt the bear and lost its stand animation, so it snapped down: worker 13)
    let ek = JSON.stringify(extra, (k, v) => k === 'paddle' || k === 'standing' || k === 'sleep' || k === 'shake' || k === 'converting' || k === 'roar' || k === 'roarT' || k === 'emerge' || k === 'dig' ? undefined : v)
    if (ek === '{}' || ek === undefined) ek = 'null'
    const key = `${id}|${name}|${ek}`
    const cur = this.live.get(id)
    if (cur && cur.key === key) return cur
    if (cur) { this.scene.remove(cur.obj); if (cur.tag) this.scene.remove(cur.tag); if (cur.fire) this.scene.remove(cur.fire); this.live.delete(id) }
    let obj = null, bones = {}, mat = null, woolMat = null, underMat = null
    if ((name === 'falling_block' || name === 'moving_block') && extra && this.blockModels.has(extra.state)) {
      const bm = this.blockModels.get(extra.state)
      const m = new THREE.Mesh(bm.geo, bm.mat.clone()); m.position.set(-0.5, 0, -0.5)
      obj = new THREE.Group(); obj.add(m); mat = m.material
      if (extra.flash !== undefined) {   // primed TNT: white overlay that blinks
        const w = new THREE.Mesh(bm.geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthFunc: THREE.LessEqualDepth }))
        w.position.set(-0.5, 0, -0.5); w.visible = !!extra.flash; obj.add(w); bones.flashMat = w.material
      }
      if (extra.scale) obj.scale.setScalar(extra.scale)
    } else if ((name === 'item_frame' || name === 'glow_item_frame') && this.blockModels.has(`frame:${name}`)) {
      const bm = this.blockModels.get(`frame:${name}`)
      mat = bm.mat.clone(); mat.side = THREE.DoubleSide
      const m = new THREE.Mesh(bm.geo, mat); m.position.set(-0.5, -0.5, -0.5)
      obj = new THREE.Group(); obj.matrixAutoUpdate = false
      const inner = new THREE.Group(); inner.add(m); obj.add(inner); bones = { inner }
    } else if (/^(horse|donkey|mule|skeleton_horse|zombie_horse)$/.test(name)) {
      const tex = { horse: 'entity/horse/horse_brown', donkey: 'entity/horse/donkey', mule: 'entity/horse/mule', skeleton_horse: 'entity/horse/horse_skeleton', zombie_horse: 'entity/horse/horse_zombie' }[name]
      const t = await texture([tex])
      if (t) { const b = buildPlayer(t, HORSE_PARTS, name === 'horse' ? 1.1 : name === 'mule' ? 0.92 : name === 'donkey' ? 0.87 : 1.0); obj = b.root; bones = b.bones; mat = b.mat }
    } else if (/^[a-z_]+_boat$/.test(name) && !/chest_boat$/.test(name) || name === 'boat') {
      const t = await texture([`entity/boat/${name === 'boat' ? 'oak' : name.replace(/_boat$/, '')}`])
      if (t) {
        const b = buildPlayer(t, BOAT_PARTS, 1); obj = b.root; bones = b.bones; mat = b.mat
        const M = obj.children[0].matrix
        M.makeTranslation(0, 0.375, 0).multiply(new THREE.Matrix4().makeScale(-1, -1, 1)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(1 / 16, 1 / 16, 1 / 16))
        bones.boat = true
        // the water mask writes depth only, before the translucent water, so the water inside the boat
        // fails the depth test and the floor shows (vanilla RenderType.waterMask)
        if (bones.waterPatch) for (const m of bones.waterPatch.children) if (m.isMesh) { m.material = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }); m.renderOrder = 0.5 }
        poseBoatPaddle(bones.leftPaddle, 0, false); poseBoatPaddle(bones.rightPaddle, 0, true)
      }
    } else if (name === 'spider' || name === 'cave_spider') {
      // SpiderEyesLayer: the eyes full bright (RenderType.eyes); CaveSpiderRenderer scales by 0.7
      const t = await texture([name === 'spider' ? 'entity/spider/spider' : 'entity/spider/cave_spider']), te = await texture(['entity/spider_eyes'])
      if (t) { const b = buildPlayer(t, SPIDER_PARTS, name === 'spider' ? 1 : 0.7, te ? [{ tex: te, parts: ['head'] }] : null); obj = b.root; bones = b.bones; mat = b.mat; bones.spider = true }
    } else if (name === 'magma_cube') {
      const t = await texture(['entity/slime/magmacube'])
      if (t) { const b = buildPlayer(t, MAGMA_PARTS, 1); obj = b.root; bones = b.bones; mat = b.mat; bones.magma = true }
    } else if (name === 'wolf') {
      const t = await texture(look('wolf', extra, this.regs).layers)
      if (t) { const b = buildPlayer(t, WOLF_PARTS, 1); obj = b.root; bones = b.bones; mat = b.mat; bones.wolf = true }
    } else if (name === 'fox') {
      const t = await texture([(extra && extra.snow) ? 'entity/fox/snow_fox' : 'entity/fox/fox'])
      if (t) { const b = buildPlayer(t, FOX_PARTS, 1); obj = b.root; bones = b.bones; mat = b.mat; bones.fox = true }
    } else if (name === 'warden') {
      const t = await texture(['entity/warden/warden'])
      // WardenRenderer's emissive layers (full bright, translucent): the bioluminescent layer on the
      // head, arms and legs; two sets of pulsating spots; the heart on the body
      const lay = async (n) => texture([`entity/warden/${n}`])
      const limbs = ['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']
      const ls = [
        { tex: await lay('warden_bioluminescent_layer'), parts: limbs },
        { tex: await lay('warden_pulsating_spots_1'), parts: ['body', ...limbs], opacity: 0 },
        { tex: await lay('warden_pulsating_spots_2'), parts: ['body', ...limbs], opacity: 0 },
        { tex: await lay('warden_heart'), parts: ['body'], opacity: 0 }
      ].filter((l) => l.tex)
      if (t) { const b = buildPlayer(t, WARDEN_PARTS, 1, ls.length === 4 ? ls : null); obj = b.root; bones = b.bones; mat = b.mat }
    } else if (name === 'witch') {
      const t = await texture(['entity/witch'])
      if (t) { const b = buildPlayer(t, WITCH_PARTS, 0.9375); obj = b.root; bones = b.bones; mat = b.mat }
    } else if (name === 'enderman') {
      const t = await texture(['entity/enderman/enderman']), te = await texture(['entity/enderman/enderman_eyes'])
      if (t) {
        const b = buildPlayer(t, ENDERMAN_PARTS, 1, te); obj = b.root; bones = b.bones; mat = b.mat
        // CarriedBlockLayer: in model space (blocks) T(0, 0.6875, -0.75) Rx(20) Ry(45) T(0.25, 0.1875, 0.25)
        // S(-0.5, -0.5, 0.5) Ry(90), then the block model
        if (extra && extra.carried && this.blockModels.has(extra.carried)) {
          const bm = this.blockModels.get(extra.carried), m = new THREE.Mesh(bm.geo, bm.mat.clone())
          const g = new THREE.Group(); g.matrixAutoUpdate = false
          g.matrix.makeScale(16, 16, 16).multiply(new THREE.Matrix4().makeTranslation(0, 0.6875, -0.75)).multiply(new THREE.Matrix4().makeRotationX(20 * Math.PI / 180))
            .multiply(new THREE.Matrix4().makeRotationY(45 * Math.PI / 180)).multiply(new THREE.Matrix4().makeTranslation(0.25, 0.1875, 0.25))
            .multiply(new THREE.Matrix4().makeScale(-0.5, -0.5, 0.5)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))
          g.add(m); b.root.children[0].add(g); bones.carried = g; bones.carriedMat = m.material
        }
      }
    } else if (name === 'arrow' || name === 'spectral_arrow') {
      // ArrowRenderer: two crossed 16x4 px planes and a 5x5 fin at the back, 0.05625 blocks a pixel,
      // turned by Ry(yRot - 90) Rz(xRot) (set in update from the recorded yaw/pitch)
      const t = await texture([name === 'arrow' ? 'entity/projectiles/arrow' : 'entity/projectiles/spectral_arrow'])
      if (t) {
        const pos = [], uv = [], idx = []
        const quad = (pts, u0, v0, u1, v1) => {
          const n = pos.length / 3
          for (const p of pts) pos.push(...p)
          uv.push(u0, v1, u1, v1, u1, v0, u0, v0)
          idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
        }
        for (const a of [0, Math.PI / 2]) {   // the two crossed planes along x
          const c = Math.cos(a + Math.PI / 4), sn = Math.sin(a + Math.PI / 4)
          const P2 = (x, y) => [x - 4, y * c, y * sn]
          quad([P2(-8, -2), P2(8, -2), P2(8, 2), P2(-8, 2)], 0, 0, 0.5, 5 / 32)
        }
        quad([[-11, -2, -2], [-11, -2, 2], [-11, 2, 2], [-11, 2, -2]], 0, 5 / 32, 5 / 32, 10 / 32)   // the fin
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos.map(v => v * 0.05625), 3))
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx)
        mat = new THREE.MeshBasicMaterial({ map: t.tex, alphaTest: 0.1, side: THREE.DoubleSide, fog: true })
        const inner = new THREE.Group(); inner.add(new THREE.Mesh(g, mat)); inner.rotation.order = 'YZX'
        obj = new THREE.Group(); obj.add(inner); bones = { arrow: inner }
      }
    } else if (name === 'experience_orb') {
      // ExperienceOrbRenderer: one 16x16 icon of experience_orb.png picked by the orb's value
      // (getIcon), a camera-facing quad 0.3 across from -0.25 to 0.75 of its height, alpha 128
      const t = await texture(['entity/experience_orb'])
      if (t) {
        const v = (extra && extra.value) || 1
        const icon = [2477, 1237, 617, 307, 149, 73, 37, 17, 7, 3].findIndex(x => v >= x)
        const i = icon < 0 ? 0 : 10 - icon
        const c = document.createElement('canvas'); c.width = 16; c.height = 16
        const S = t.w / 4
        c.getContext('2d').drawImage(t.tex.image, (i % 4) * S, Math.floor(i / 4) * S, S, S, 0, 0, 16, 16)
        const tx = new THREE.CanvasTexture(c); tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter; tx.generateMipmaps = false; tx.colorSpace = THREE.NoColorSpace
        mat = new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 128 / 255, alphaTest: 0.05, depthWrite: false, fog: true })
        obj = new THREE.Sprite(mat); obj.scale.setScalar(0.3); obj.center.set(0.5, 0.25)
        bones = { orb: true }
      }
    } else if (name === 'player' || name === 'mannequin') {   // (a Mannequin is the player model: movie extras)
      const skin = (extra && extra.skin) || 'steve'
      const t = await texture([`entity/player/wide/${skin}`])
      // a lit part (the AI characters' TV screens, skins/<skin>_glow.png): drawn full bright like EnderEyesLayer
      const glow = skin === 'steve' || !/^[a-z0-9_]+$/.test(skin) || ['alex', 'ari', 'efe', 'kai', 'makena', 'noor', 'sunny', 'zuri'].includes(skin) ? null : await texture([`entity/player/wide/${skin}_glow`])
      if (t) { const b = buildPlayer(t, undefined, undefined, glow); obj = b.root; bones = b.bones; mat = b.mat; if (extra && extra.armor) await addArmor(bones, extra.armor, extra.trims) }
    } else if (name === 'item' && extra && extra.special && this.itemFactory) {
      // a dropped special item (bed, chest, head, banner, shulker box): its model with the 'ground'
      // display, turned about y by the spin (render.js)
      const r = await this.itemFactory({ special: extra.special, display: extra.special.display.ground })
      if (r) { obj = new THREE.Group(); obj.add(r.obj); mat = r.mat }
    } else if (name === 'item' && extra && extra.dropped && this.itemFactory) {
      // a dropped item (motion fixes, render.js): its extruded model with the 'ground' display, standing, turned
      // about y by the spin (ItemEntityRenderer), not a camera-facing sprite (which drew it upside down)
      const r = await this.itemFactory(extra.dropped)
      if (r) { obj = new THREE.Group(); obj.add(r.obj); mat = r.mat }
      // a stack: more copies (ItemEntityRenderer.renderMultipleFromCount), at the offsets render.js worked out
      // (lib/item_stack.js), in the item's spinning frame
      if (r && extra.dropped.offsets) {
        const base = r.obj.position.clone()
        extra.dropped.offsets.forEach((o, i) => { const c = i ? r.obj.clone() : r.obj; c.position.set(base.x + o[0], base.y + o[1], base.z + o[2]); if (i) obj.add(c) })
      }
    } else if (/^(ender_pearl|snowball|egg|item|splash_potion|lingering_potion|experience_bottle|firework_rocket)$/.test(name)) {
      const itemName = name === 'item' ? (extra?.item || 'stone') : name
      // thrown potions: the bottle plus potion_overlay tinted with the potion colour (ThrownItemRenderer)
      const t = /_potion$/.test(name) ? await potionTexture(name, extra?.color ?? 0x385DC6) : await texture([(name === 'item' && extra?.tex) || `item/${itemName}`])
      if (t) {
        mat = new THREE.SpriteMaterial({ map: t.tex, alphaTest: 0.1, fog: true })
        obj = new THREE.Sprite(mat); obj.scale.setScalar(name === 'item' ? 0.35 : 0.5)
        // the entity textures load unflipped (the models' UVs run top-down), so a sprite showed the item upside down;
        // ThrownItemRenderer draws it upright (motion fixes only: older Shorts stay as published)
        if (this.motionFixes) obj.scale.y *= -1
      }
    } else {
      const l = look(name, extra, this.regs, this.engine)
      const geo = l && MODELS[l.model]?.geometry?.[l.geo || 'default']
      const t = l && await texture(l.layers)
      if (geo && t) {
        const b = build(geo, t, l.extra); obj = b.root; bones = b.bones; mat = b.mat
        for (const [bn, r] of Object.entries(l.rest || {})) if (bones[bn]) { bones[bn].rotation.set(...r); bones[bn].userData.rest = bones[bn].rotation.clone() }
        if (extra && extra.armor) await addMobArmor(geo, bones, extra.armor, extra.trims)
        if (name === 'sheep' && extra && (extra.jeb || extra.color)) {
          // SheepWoolUndercoatLayer (1.21.5+): a dyed or jeb_ sheep's body gets the undercoat over
          // the skin, tinted with the wool colour, sheared or not (the coloured stubble)
          const ut = await texture(['entity/sheep/sheep_wool_undercoat'])
          if (ut) {
            const u = build(geo, ut, l.extra)
            u.mat.polygonOffset = true; u.mat.polygonOffsetFactor = -1; u.mat.polygonOffsetUnits = -1
            for (const [bn, g] of Object.entries(u.bones)) if (bones[bn]) for (const m of [...g.children].filter(c => c.isMesh)) bones[bn].add(m)
            underMat = u.mat
          }
        }
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
    // chested llamas / donkeys / mules only (AbstractChestedHorse.DATA_ID_CHEST): the converted
    // geometry always carried the chest bags
    for (const n of ['chest1', 'chest2', 'Bag1', 'Bag2']) if (bones[n]) bones[n].visible = !!(extra && extra.chest)
    // MinecartRenderer: the display block (TNT, hopper, furnace...) scaled 0.75 at
    // (-0.5, (offset - 8) / 16, 0.5) of the cart, default offset 6
    if (obj && /minecart$/.test(name) && extra && extra.content !== undefined && this.blockModels.has(extra.content)) {
      const bm = this.blockModels.get(extra.content)
      const m = new THREE.Mesh(bm.geo, bm.mat.clone())
      const g = new THREE.Group(); g.scale.setScalar(0.75); g.position.set(-0.375, 0.375 + 0.75 * (6 - 8) / 16, -0.375); g.add(m)
      // a primed TNT minecart: the block swells about its centre and blinks white (TntMinecartRenderer)
      if (extra.scale && extra.scale !== 1) { const s = extra.scale; m.position.set(-(s - 1) / 2, -(s - 1) / 2, -(s - 1) / 2); m.scale.setScalar(s) }
      if (extra.flash) {
        const w = new THREE.Mesh(bm.geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthFunc: THREE.LessEqualDepth }))
        w.position.copy(m.position); w.scale.copy(m.scale); g.add(w); bones.flashMat = w.material
      }
      obj.add(g); bones.contentMat = m.material
    }
    if (extra && extra.glint && mat && this.glintify) this.glintify(mat, name === 'falling_block' ? 8 : 0.25)
    const rec = { key, obj, bones, mat, woolMat, underMat, yOff: bones.boat ? 0 : (name && look(name, extra, this.regs, this.engine) || {}).yOff || 0, walk: 0, last: null }
    if (obj) this.scene.add(obj)
    this.live.set(id, rec)
    return rec
  }

  // states: [{id, name, x, y, z, yaw, pitch, headYaw, extra, light}]
  async update (states, tick = 0) {
    const seen = new Set()
    for (let s of states) {
      seen.add(s.id)
      const r = await this.ensure(s.id, s.name, s.extra)
      if (!r.obj) continue
      r.obj.position.set(s.x, s.y + (r.obj.isSprite ? 0.15 : 0) + (r.yOff || 0), s.z)
      const LL = Array.isArray(s.light) ? s.light : [s.light ?? 1, s.light ?? 1, s.light ?? 1]
      if (r.mat) r.mat.color.setRGB(...LL)
      if (r.bones.armorMats && !(s.name === 'player' || s.name === 'mannequin')) for (const m of r.bones.armorMats) m.color.setRGB(...LL)
      // zombifying outside the Nether (Piglin/Hoglin.isConverting -> LivingEntityRenderer.isShaking): the whole body
      // turns by cos(age x 3.25) x PI x 0.4 degrees every frame (a staged pose mark { converting: true })
      if (s.extra && s.extra.converting) { const d = Math.cos(tick * 3.25) * Math.PI * 0.4 * Math.PI / 180; s = { ...s, yaw: (s.yaw || 0) + d, headYaw: s.headYaw != null ? s.headYaw + d : s.headYaw } }
      // the white flash (OverlayTexture) is mixed in before the lightmap: it darkens with the light too
      // (a primed TNT flashed full white under a thunderstorm sky: worker 18, worse_sky)
      if (r.bones.flashMat) r.bones.flashMat.color.setRGB(...LL)
      // on fire (EntityRenderDispatcher.renderFlame): fire_0 / fire_1 layers facing the camera, scale
      // 1.4 x width, each 1 x 1.4 of that, 0.45 higher and 0.9 x smaller than the last, up the height
      if (s.extra && s.extra.fire && !s.player) {
        if (!r.fire) {
          r.fire = new THREE.Group(); r.fireMats = []
          const strips = [await texture(['anim/fire_0']), await texture(['anim/fire_1'])]
          const W = (HITBOX_W[s.name] || 0.6) * 1.4, Hh = (HITBOX_H[s.name] || 1.8) / W
          let g = 0.5, j = 0, i = Hh, l = 0
          while (i > 0 && l < 8) {
            const st = strips[l % 2]; if (!st) break
            const tx = st.tex.clone(); tx.needsUpdate = true; tx.repeat.set(1, -st.w / st.h)   // (flipY false: frame k runs from (k+1)/n at the bottom to k/n at the top)
            const m = new THREE.SpriteMaterial({ map: tx, transparent: true, alphaTest: 0.1, depthWrite: false, fog: true })
            const sp = new THREE.Sprite(m); sp.scale.set(2 * g * W, 1.4 * W * (g / 0.5), 1); sp.center.set(0.5, 0); sp.position.y = -j * W
            r.fire.add(sp); r.fireMats.push([m, st.h / st.w]); i -= 0.45; j -= 0.45; g *= 0.9; l++
          }
          this.scene.add(r.fire)
        }
        // translate(0, 0, 0.3 - layers x 0.02) toward the camera, so the flames sit in front of the body
        r.fire.visible = true; r.fire.position.set(s.x, s.y, s.z)
        if (this.camera) { const dx = this.camera.position.x - s.x, dz = this.camera.position.z - s.z, d = Math.hypot(dx, dz) || 1, k = (HITBOX_W[s.name] || 0.6) * 1.4 * 0.3; r.fire.position.x += dx / d * k; r.fire.position.z += dz / d * k }
        for (const [m, n] of r.fireMats) m.map.offset.y = (Math.floor(tick) % n + 1) / n
      } else if (r.fire) r.fire.visible = false
      // mobs: hurt (10 ticks) and dying turn red; the death tips the body over min(1, sqrt((deathTime - 1)
      // / 20 x 1.6)) x 90 degrees (LivingEntityRenderer.setupRotations; spiders 180)
      if (!s.player) {
        const red = (s.hurt || s.deathTime > 0) ? 1 : 0
        for (const m of [r.mat, r.woolMat, r.underMat]) if (m && m.userData.red) m.userData.red.value = red
        r.tilt = s.deathTime > 0 ? Math.min(1, Math.sqrt(Math.max(0, (s.deathTime - 1) / 20 * 1.6))) * (/spider$/.test(s.name) ? Math.PI : Math.PI / 2) : 0
      }
      if (r.bones.arrow) {
        // Ry(javaYaw - 90) Rz(javaPitch): an arrow's yRot is atan2(vx, vz), mineflayer yaw = pi - yRot
        r.obj.rotation.set(0, 0, 0)
        r.bones.arrow.rotation.set(0, (Math.PI - s.yaw) - Math.PI / 2, -(s.pitch || 0))
        continue
      }
      if (r.bones.contentMat) r.bones.contentMat.color.setRGB(...LL)
      if (r.bones.orb) {
        // 0.1 up; colour (sin(age/2) + 1) / 2, 1, (sin(age/2 + 4.19) + 1) / 10, lit at block light + 7
        r.obj.position.set(s.x, s.y + 0.1, s.z)
        const age = (tick + (s.id % 97)) / 2, b = Math.min(1, Math.max(...LL) + 0.35)
        r.mat.color.setRGB((Math.sin(age) + 1) * 0.5 * b, b, (Math.sin(age + 4.1887903) + 1) * 0.1 * b)
        continue
      }
      if (r.woolMat) {   // Sheep.getColor: dye colour x 0.75 (white x 0.9); jeb_ blends through all 16, 25 ticks each
        const c = sheepColor(s, tick)
        r.woolMat.color.setRGB(c[0] * LL[0], c[1] * LL[1], c[2] * LL[2])
      }
      // nameplate: screen-aligned (the camera's orientation), 0.025 blocks a font pixel, the text's
      // top 0.5 above the hitbox (render.js sets nameTag / nameY)
      if (s.nameTag || r.tag) {
        if (s.nameTag && (!r.tag || r.tagText !== s.nameTag)) {
          if (r.tag) { this.scene.remove(r.tag); r.tag.material.map?.dispose(); r.tag.material.dispose() }
          r.tag = null; r.tagText = s.nameTag
          const nt = await nameTagTexture(s.nameTag)
          if (nt) {
            r.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: nt.tex, transparent: true, depthWrite: false, fog: false }))
            r.tag.scale.set(nt.w * 0.025, nt.h * 0.025, 1); r.tag.center.set(0.5, 1 - 1 / nt.h); r.tag.renderOrder = 3
            this.scene.add(r.tag)
          }
        }
        if (r.tag) {
          r.tag.visible = !!s.nameTag
          r.tag.position.set(s.x, s.y + (s.nameY || 2.3), s.z)
          r.tag.material.color.setRGB(...LL)
          if (s.nameDim !== undefined) r.tag.material.opacity = s.nameDim ? 0.6 : 1   // a crouching player's plate (stunt.playerNames)
        }
      }
      if (r.underMat) r.underMat.color.setRGB(...sheepColor(s, tick).map((v, i) => v * LL[i]))
      if ((s.name === 'item_frame' || s.name === 'glow_item_frame') && r.bones.inner) {
        // ItemFrameRenderer: back to the block centre (+dir * 0.46875), Rx(xRot) Ry(180 - yRot); the item
        // at z 0.4375, turned rotation * 45 degrees, scale 0.5, with its 'fixed' display
        const f = s.frame || {}, D = [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]][f.dir ?? 3] || [0, 0, 1]
        const yRot = { 2: 180, 3: 0, 4: 90, 5: 270 }[f.dir] ?? 0, xRot = f.dir === 1 ? -90 : f.dir === 0 ? 90 : 0
        // the spawn packet carries the frame's block position (integers): its centre; a real entity
        // position (block centre - dir * 0.46875) goes back to the centre
        const blockPos = Number.isInteger(s.x) && Number.isInteger(s.y) && Number.isInteger(s.z)
        r.obj.matrix.makeTranslation(...(blockPos ? [s.x + 0.5, s.y + 0.5, s.z + 0.5] : [s.x + D[0] * 0.46875, s.y + D[1] * 0.46875, s.z + D[2] * 0.46875]))
          .multiply(new THREE.Matrix4().makeRotationX(xRot * Math.PI / 180)).multiply(new THREE.Matrix4().makeRotationY((180 - yRot) * Math.PI / 180))
        r.obj.matrixWorldNeedsUpdate = true
        const held = f.held, hk = held ? held.key + '|' + (f.rot || 0) : null
        if (r.heldKey !== hk) {
          if (r.heldObj) r.obj.remove(r.heldWrap)
          r.heldObj = held && this.itemFactory ? await this.itemFactory({ ...held, display: held.display || { rotation: [0, 180, 0], translation: [0, 0, 0], scale: [1, 1, 1] } }) : null
          if (r.heldObj) {
            r.heldWrap = new THREE.Group(); r.heldWrap.position.set(0, 0, 0.4375); r.heldWrap.rotation.z = (f.rot || 0) * Math.PI / 4; r.heldWrap.scale.setScalar(0.5)
            r.heldWrap.add(r.heldObj.obj); r.obj.add(r.heldWrap)
          }
          r.heldKey = hk
        }
        if (r.heldObj && r.heldObj.mat) r.heldObj.mat.color.setRGB(...LL)
        continue
      }
      if (s.name === 'player' || s.name === 'mannequin') {
        posePlayer(r, s)
        if (r.bones.armorMats) for (const m of r.bones.armorMats) m.color.setRGB(...LL)
        // the held item (ItemInHandLayer), built by the page (block models / extruded sprites)
        const held = s.player && s.player.held, hk = held ? held.key : null
        if (r.heldKey !== hk) {
          if (r.heldObj) r.bones.hand.remove(r.heldObj.obj)
          r.heldObj = hk && this.itemFactory ? await this.itemFactory(held) : null
          if (r.heldObj) r.bones.hand.add(r.heldObj.obj)
          r.heldKey = hk
        }
        if (r.heldObj && r.heldObj.mat) r.heldObj.mat.color.setRGB(...LL)
        // the off-hand item (ItemInHandLayer, left arm)
        const off = s.player && s.player.offHeld, ok = off ? off.key : null
        if (r.offKey !== ok && r.bones.handL) {
          if (r.offObj) r.bones.handL.remove(r.offObj.obj)
          r.offObj = ok && this.itemFactory ? await this.itemFactory(off) : null
          if (r.offObj) r.bones.handL.add(r.offObj.obj)
          r.offKey = ok
        }
        if (r.offObj && r.offObj.mat) r.offObj.mat.color.setRGB(...LL)
        continue
      }
      if ((s.name === 'falling_block' && s.extra && s.extra.spin) || (s.name === 'item' && s.extra && (s.extra.special || s.extra.dropped))) { r.obj.rotation.set(0, s.yaw, 0); continue }
      if (r.obj.isSprite || s.name === 'falling_block') continue
      // BodyRotationControl: the body is dragged so the head never turns more than 75° from it
      // (a fast turn had heads spun round while bodies still faced away: staring_villagers review)
      if (s.headYaw != null) {
        let d = s.headYaw - s.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
        const MAXD = 75 * Math.PI / 180
        if (Math.abs(d) > MAXD) s.yaw = s.headYaw - Math.sign(d) * MAXD
      }
      r.obj.rotation.set(0, s.yaw, r.tilt || 0)   // (XYZ order with x 0: Ry then the death tip Rz)
      // asleep (a staged ctx.mark('pose', { ids, sleep: true }); LivingEntityRenderer.setupRotations for Pose.SLEEPING):
      // on its side, raised by half its width so it lies on the floor, not in it
      if (s.extra && s.extra.sleep) { r.obj.rotation.set(0, s.yaw, Math.PI / 2); r.obj.position.y += (HITBOX_W[s.name] || 0.6) / 2 }
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
      if (s.extra && s.extra.baby && !B_isBlock(s.name)) poseBaby(r, s.name)
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
      // VillagerModel.setupAnim swings the legs at half the humanoid amount (max ~40 degrees); the full
      // swing put a /tp-circled nitwit in the splits (worker 5, story_runaway f834)
      const swing = Math.cos(r.walk * 0.6662) * 1.4 * (r.amt || 0) * (/^(villager|wandering_trader)$/.test(s.name) ? 0.5 : 1)
      const B = r.bones
      if (s.name === 'enderman' && B.hat) { poseEnderman(r, s, r.walk, r.amt || 0); if (B.carriedMat) B.carriedMat.color.setRGB(...LL); continue }
      if (s.name === 'witch' && B.hat4) { poseWitch(r, s, r.walk, r.amt || 0); continue }
      if (B.mane && B.rightHindLeg) { poseHorse(r, s, r.walk, r.amt || 0); continue }
      if (B.boat) {
        // Boat.tick: a paddle's position advances PI/8 a tick while its paddle state is set, else 0
        const pd = s.extra?.paddle || [false, false], dt = Math.max(0, Math.min(5, tick - (r.rowT ?? tick)))
        r.row = (r.row || [0, 0]).map((v, i) => pd[i] ? v + dt * Math.PI / 8 : 0); r.rowT = tick
        poseBoatPaddle(B.leftPaddle, r.row[0], false); poseBoatPaddle(B.rightPaddle, r.row[1], true)
        continue
      }
      if (B.fox) { poseFox(r, s, r.walk, r.amt || 0); continue }
      if (B.wolf) { poseWolf(r, s, r.walk, r.amt || 0); continue }
      if (B.spider) { poseSpider(r, s, r.walk, r.amt || 0); continue }
      // AllayModel.setupAnim: the wings swept back 35 degrees (yRot +-0.61, xRot 0.44) and flapping with
      // the age (cos(age x 20 deg) x 0.15 pi), NoAI too; the arms angled out a little. The converted
      // geometry's wing planes sat edge-on to the camera and never moved (worker 13, guess_sound_2)
      if (s.name === 'allay' && B.left_wing && B.right_wing) {
        const age = tick + (s.id % 97) * 3, f1 = Math.cos(age * 20 * Math.PI / 180) * Math.PI * 0.15 + (r.amt || 0)
        B.right_wing.rotation.set(0.436, -(-0.611 + f1), 0)
        B.left_wing.rotation.set(0.436, -(0.611 - f1), 0)
        const ab = Math.sin(age * 9 * Math.PI / 180) * 0.1
        if (B.right_arm) B.right_arm.rotation.set(0.3, 0, 0.35 + ab)
        if (B.left_arm) B.left_arm.rotation.set(0.3, 0, -0.35 - ab)
        if (B.head) { let dy = (s.headYaw ?? s.yaw) - s.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; B.head.rotation.set(s.pitch || 0, -dy, 0) }
        continue
      }
      if (s.name === 'warden' && B.rightTendril) { poseWarden(r, s, r.walk, r.amt || 0, tick); continue }
      if (s.name === 'blaze' && B.upperBodyParts0) {
        // BlazeModel.setupAnim: three rings of four rods (radius 9, 7, 5) circling and bobbing. Java
        // part positions are y-down from 24 px up; the converted rods sit at that origin
        const age = tick + (s.id % 97) * 3
        const ring = (i0, f0, r, yOf) => { let f = f0; for (let i = i0; i < i0 + 4; i++, f++) { const b = B['upperBodyParts' + i]; if (b) b.position.set(b.userData.restPos.x + Math.cos(f) * r, b.userData.restPos.y - yOf(i), b.userData.restPos.z + Math.sin(f) * r) } }
        ring(0, age * Math.PI * -0.1, 9, (i) => -2 + Math.cos((i * 2 + age) * 0.25))
        ring(4, Math.PI / 4 + age * Math.PI * 0.03, 7, (i) => 2 + Math.cos((i * 2 + age) * 0.25))
        ring(8, 0.47123894 + age * Math.PI * -0.05, 5, (i) => 11 + Math.cos((i * 1.5 + age) * 0.5))
      }
      // SlimeRenderer.scale: 0.999 x size (metadata), drawn from the size-1 model
      if ((s.name === 'slime' || s.name === 'magma_cube') && s.extra && s.extra.size) r.obj.scale.setScalar(0.999 * s.extra.size)
      // bipeds: legs opposite, arms against the legs. Quadrupeds (QuadrupedModel: creeper, pig):
      // leg0/leg1 hind right/left, leg2/leg3 front right/left; diagonal pairs move together.
      if (!B.leg4) for (const [n, sign] of [['leg0', 1], ['rightLeg', 1], ['leg1', -1], ['leftLeg', -1], ['leg2', -1], ['leg3', 1]]) if (B[n]) B[n].rotation.x = B[n].userData.rest.x + swing * sign
      // zombies hold their arms out (AnimationUtils.animateZombieArms: xRot -pi/2.25, replacing the
      // walk swing; the converted space flips the sign), with the vanilla idle bob
      if (/^(zombie|husk|drowned|zombie_villager)$/.test(s.name)) {
        const age = tick + (s.id % 97) * 3
        for (const [n, k] of [['rightArm', 1], ['leftArm', -1]]) if (B[n]) { B[n].rotation.x = Math.PI / 2.25 - k * Math.sin(age * 0.067) * 0.05; B[n].rotation.z = B[n].userData.rest.z + k * (Math.cos(age * 0.09) * 0.05 + 0.05) }
      } else for (const [n, sign] of [['rightArm', -1], ['leftArm', 1], ['arm0', -1], ['arm1', 1]]) if (B[n]) B[n].rotation.x = B[n].userData.rest.x + swing * sign
      if (B.head) {
        let dy = (s.headYaw ?? s.yaw) - s.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        B.head.rotation.set(B.head.userData.rest.x + s.pitch, B.head.userData.rest.y - dy, B.head.userData.rest.z)
        // VillagerModel.setupAnim while unhappy (a refused trade): the head shakes no, zRot 0.3 sin(0.45 age), xRot 0.4
        // (staged: ctx.mark('pose', { ids, shake: true }), any mob with a head)
        if (s.extra && s.extra.shake) { B.head.rotation.z = B.head.userData.rest.z + 0.3 * Math.sin(0.45 * (tick || 0)); B.head.rotation.x = B.head.userData.rest.x + 0.4 }
      }
      // a polar bear rearing up (PolarBear.DATA_STANDING_ID; clientSideStandAnimation moves 1 a tick
      // toward 6). PolarBearModel: the body tips back by f x 0.35 pi about the hips, the front legs reach
      // forward (0.45 pi), the head tips down 0.15 pi. Here the legs and head hang from the body, so
      // the hind legs turn back by the body's angle to stay on the ground
      if (s.name === 'polar_bear' && B.body) {
        const dt = Math.max(0, Math.min(6, tick - (r.standT ?? tick))); r.standT = tick
        const want = s.extra && s.extra.standing ? 1 : 0, cur = r.stand || 0
        r.stand = want > cur ? Math.min(want, cur + dt / 6) : Math.max(want, cur - dt / 6)
        const f = r.stand, a = f * Math.PI * 0.35
        B.body.rotation.x = B.body.userData.rest.x + a
        // rear up on the hind feet: the body turns about its own pivot (15 px up, at the back), which
        // lifts and moves the hips (the hind legs hang 5 px lower and 6 px forward of it). Shift the body
        // so the hips, and the vertical hind legs under them, stay where they were (it floated 0.5-1 block)
        const hy = -5 * Math.cos(a) + 6 * Math.sin(a), hz = -5 * Math.sin(a) - 6 * Math.cos(a)
        const rp = B.body.userData.restPos || (B.body.userData.restPos = B.body.position.clone())
        B.body.position.set(rp.x, rp.y - (hy + 5), rp.z - (hz + 6))
        for (const n of ['leg0', 'leg1']) if (B[n]) B[n].rotation.x -= a
        for (const n of ['leg2', 'leg3']) if (B[n]) B[n].rotation.x = B[n].userData.rest.x * (1 - f) + f * Math.PI * 0.1
        if (B.head) B.head.rotation.x -= f * Math.PI * 0.15 + a
      }
      // a mob's main-hand item (ItemInHandLayer): the Java hand transform Rx(-90) Ry(180)
      // T(1/16, 0.125, -0.625) under the right arm, with the Bedrock bone's y-up flipped to Java's y-down
      const mh = s.mobHeld, mk = mh ? mh.key : null
      // a villager's item over its crossed arms (CrossedArmsItemLayer: VillagerModel.translateToArms, then
      // T(0, 0.4, -0.4) Rx(180), ItemDisplayContext.GROUND), Java's y-down flipped to the bone's y-up
      if (r.heldKey !== mk && !B.rightArm && B.arms && mh && mh.crossed) {
        if (r.heldObj) r.heldGrp.remove(r.heldObj.obj)
        if (!r.heldGrp) {
          r.heldGrp = new THREE.Group(); r.heldGrp.matrixAutoUpdate = false
          r.heldGrp.matrix.makeScale(1, -1, 1).multiply(new THREE.Matrix4().makeScale(16, 16, 16)).multiply(new THREE.Matrix4().makeTranslation(0, 0.4, -0.4)).multiply(new THREE.Matrix4().makeRotationX(Math.PI))
          B.arms.add(r.heldGrp)
        }
        r.heldObj = mk && this.itemFactory ? await this.itemFactory(mh) : null
        if (r.heldObj) r.heldGrp.add(r.heldObj.obj)
        r.heldKey = mk
      }
      // a mob's off-hand item (ItemInHandLayer, the left arm: T(-1/16, 0.125, -0.625))
      const mo = s.mobOff, mok = mo ? mo.key : null
      if (r.offKey !== mok && B.leftArm) {
        if (r.offObj) r.offGrp.remove(r.offObj.obj)
        if (!r.offGrp) {
          r.offGrp = new THREE.Group(); r.offGrp.matrixAutoUpdate = false
          r.offGrp.matrix.makeScale(1, -1, 1).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI)).multiply(new THREE.Matrix4().makeScale(16, 16, 16)).multiply(new THREE.Matrix4().makeTranslation(-1 / 16, 0.125, -0.625))
          B.leftArm.add(r.offGrp)
        }
        r.offObj = mok && this.itemFactory ? await this.itemFactory(mo) : null
        if (r.offObj) r.offGrp.add(r.offObj.obj)
        r.offKey = mok
      }
      if (r.offObj && r.offObj.mat) r.offObj.mat.color.setRGB(...LL)
      if (r.heldKey !== mk && B.rightArm) {
        if (r.heldObj) r.heldGrp.remove(r.heldObj.obj)
        if (!r.heldGrp) {
          r.heldGrp = new THREE.Group(); r.heldGrp.matrixAutoUpdate = false
          r.heldGrp.matrix.makeScale(1, -1, 1).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI)).multiply(new THREE.Matrix4().makeScale(16, 16, 16)).multiply(new THREE.Matrix4().makeTranslation(1 / 16, 0.125, -0.625))
          B.rightArm.add(r.heldGrp)
        }
        r.heldObj = mk && this.itemFactory ? await this.itemFactory(mh) : null
        if (r.heldObj) r.heldGrp.add(r.heldObj.obj)
        r.heldKey = mk
      }
      if (r.heldObj && r.heldObj.mat) r.heldObj.mat.color.setRGB(...LL)
    }
    for (const [id, r] of this.live) if (!seen.has(id)) { if (r.obj) this.scene.remove(r.obj); if (r.tag) this.scene.remove(r.tag); if (r.fire) this.scene.remove(r.fire); this.live.delete(id) }
  }
}
