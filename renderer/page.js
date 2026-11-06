// Renders pre-meshed Minecraft sections the way the game's default settings look, one frame on
// demand. Driven by render.js through window.HB; nothing animates on its own.
import * as THREE from 'three'
import { EntityLayer } from '/entities.js'

const W = window.innerWidth, H = window.innerHeight
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(W, H)
// Minecraft multiplies colours (textures x tint x shading) straight in sRGB; no colour management.
THREE.ColorManagement.enabled = false
renderer.outputColorSpace = THREE.LinearSRGBColorSpace
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(70, W / H, 0.05, 1000)   // vanilla FOV 70 (vertical)
camera.rotation.order = 'YXZ'
const sections = new Map()
let opaqueMat, translucentMat, clouds, sky, sun, entities
const env = { skyColor: 0x78a7ff, fogColor: 0xc0d8ff, renderDistance: 12, cloudHeight: 192.33, time: 6000 }

function srgb (hex) { return new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace) }

async function loadTexture (url) {
  const t = await new THREE.TextureLoader().loadAsync(url)
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestMipmapLinearFilter   // vanilla mipmapping (level 4 by default)
  t.generateMipmaps = true
  t.colorSpace = THREE.NoColorSpace
  t.flipY = false
  return t
}

// Sky: vanilla draws a flat sky colour that fades to the fog colour at the horizon.
function makeSky () {
  const geo = new THREE.SphereGeometry(500, 32, 16)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: srgb(env.skyColor) }, horizon: { value: srgb(env.fogColor) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y, -1.0, 1.0);
        float t = smoothstep(-0.02, 0.35, h);
        vec3 c = mix(horizon, top, t);
        gl_FragColor = vec4(c, 1.0);
      }`
  })
  const m = new THREE.Mesh(geo, mat)
  m.renderOrder = -10
  m.frustumCulled = false
  return m
}

// Fancy clouds: the game's 256x256 clouds.png, 12 blocks per pixel, 4 blocks thick, one shell
// mesh (only faces next to empty pixels), vanilla face tints, 80% opaque.
async function makeClouds (url) {
  const img = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = url })
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const g = c.getContext('2d'); g.drawImage(img, 0, 0)
  const px = g.getImageData(0, 0, img.width, img.height).data
  const N = img.width, S = 12, T = 4
  const filled = (x, z) => px[(((z % N) + N) % N * N + ((x % N) + N) % N) * 4 + 3] > 128
  const pos = [], col = []
  const quad = (a, b, c2, d, shade) => { for (const v of [a, b, c2, a, c2, d]) { pos.push(...v); col.push(shade, shade, shade) } }
  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      if (!filled(x, z)) continue
      const x0 = x * S, x1 = x0 + S, z0 = z * S, z1 = z0 + S
      quad([x0, T, z0], [x0, T, z1], [x1, T, z1], [x1, T, z0], 1.0)        // top
      quad([x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], 0.7)        // bottom
      if (!filled(x - 1, z)) quad([x0, 0, z0], [x0, 0, z1], [x0, T, z1], [x0, T, z0], 0.9)
      if (!filled(x + 1, z)) quad([x1, 0, z1], [x1, 0, z0], [x1, T, z0], [x1, T, z1], 0.9)
      if (!filled(x, z - 1)) quad([x1, 0, z0], [x0, 0, z0], [x0, T, z0], [x1, T, z0], 0.8)
      if (!filled(x, z + 1)) quad([x0, 0, z1], [x1, 0, z1], [x1, T, z1], [x0, T, z1], 0.8)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: true, fog: true })
  const grp = new THREE.Group()
  for (const dx of [-1, 0]) for (const dz of [-1, 0]) {   // tile 2x2 so the camera is always covered
    const m = new THREE.Mesh(geo, mat); m.position.set(dx * N * S, 0, dz * N * S); m.frustumCulled = false; grp.add(m)
  }
  grp.position.y = env.cloudHeight
  return grp
}

async function makeSun (url) {
  const t = await loadTexture(url); t.generateMipmaps = false; t.minFilter = THREE.NearestFilter; t.flipY = true
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat)
  m.renderOrder = -9
  return m
}

function placeSun () {
  // time 6000 = noon (sun straight up); the sun moves around the X axis, east to west.
  const a = ((env.time - 6000) / 24000) * Math.PI * 2
  const d = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0).multiplyScalar(400)
  sun.position.copy(camera.position).add(d)
  sun.lookAt(camera.position)
}

// The block atlas as a canvas, so animated textures (water, lava, kelp, fire...) can be redrawn
// in place: frames and timings come from each texture's .mcmeta (build_assets.py -> anims.json).
let ANIM = null
async function loadAnimatedAtlas () {
  const base = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = '/assets/atlas.png' })
  const c = document.createElement('canvas'); c.width = base.width; c.height = base.height
  const g = c.getContext('2d'); g.drawImage(base, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.generateMipmaps = true
  t.colorSpace = THREE.NoColorSpace; t.flipY = false
  try {
    const meta = await (await fetch('/assets/anims.json')).json()
    const strips = {}
    await Promise.all(Object.keys(meta.anims).map(k => new Promise((resolve) => { const i = new Image(); i.onload = () => { strips[k] = i; resolve() }; i.onerror = resolve; i.src = `/assets/env/anim/${k}.png` })))
    ANIM = { meta, strips, g, tex: t, shown: {} }
  } catch (e) { ANIM = null }
  return t
}
function animate (tick) {
  if (!ANIM) return
  const { meta, strips, g, shown } = ANIM
  const T = meta.tile, P = meta.pad
  let dirty = false
  for (const [k, a] of Object.entries(meta.anims)) {
    const img = strips[k]; if (!img) continue
    const total = a.frames.reduce((s, f) => s + f[1], 0)
    let tt = Math.floor(tick) % total, idx = a.frames[0][0]
    for (const [fi, ft] of a.frames) { if (tt < ft) { idx = fi; break } tt -= ft }
    if (shown[k] === idx) continue
    shown[k] = idx; dirty = true
    const [cx, cy] = a.cell
    g.clearRect(cx, cy, meta.cell, meta.cell)
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      // wrap-padded copy of the frame, clipped to this cell
      g.save(); g.beginPath(); g.rect(cx, cy, meta.cell, meta.cell); g.clip()
      g.drawImage(img, 0, idx * T, T, T, cx + P + ox * T, cy + P + oy * T, T, T)
      g.restore()
    }
  }
  if (dirty) ANIM.tex.needsUpdate = true
}

// Particles: camera-facing quads, one batch per texture, rebuilt every frame.
const partTex = new Map(); const partMeshes = []
async function particleMaterial (tex) {
  if (partTex.has(tex)) return partTex.get(tex)
  let map
  if (tex === 'atlas') map = opaqueMat.map
  else {
    map = await new THREE.TextureLoader().loadAsync(`/assets/env/${tex}.png`).catch(() => null)
    if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; map.colorSpace = THREE.NoColorSpace; map.flipY = false }
  }
  const m = map ? new THREE.MeshBasicMaterial({ map, vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide, fog: true }) : null
  partTex.set(tex, m)
  return m
}
async function drawParticles (parts) {
  for (const m of partMeshes) { scene.remove(m); m.geometry.dispose() }
  partMeshes.length = 0
  if (!parts || !parts.length) return
  camera.updateMatrixWorld()
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
  const groups = new Map()
  for (const p of parts) { if (!groups.has(p.tex)) groups.set(p.tex, []); groups.get(p.tex).push(p) }
  for (const [tex, list] of groups) {
    const mat = await particleMaterial(tex); if (!mat) continue
    const pos = [], uv = [], col = [], idx = []
    for (const p of list) {
      const n = pos.length / 3, h = p.size
      const [u, v, su, sv] = p.uv || [0, 0, 1, 1]
      for (const [a, b, uu, vv] of [[-1, -1, u, v + sv], [1, -1, u + su, v + sv], [1, 1, u + su, v], [-1, 1, u, v]]) {
        pos.push(p.x + (right.x * a + up.x * b) * h, p.y + (right.y * a + up.y * b) * h, p.z + (right.z * a + up.z * b) * h)
        uv.push(uu, vv); col.push(...p.color)
      }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 2
    scene.add(mesh); partMeshes.push(mesh)
  }
}

window.HB = {
  async init (opts) {
    Object.assign(env, opts || {})
    const atlas = await loadAnimatedAtlas()
    opaqueMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, alphaTest: 0.1, fog: true })
    translucentMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, depthWrite: false, fog: true })
    const blocks = env.renderDistance * 16
    scene.fog = new THREE.Fog(srgb(env.fogColor), blocks * 0.8, blocks)
    scene.background = srgb(env.fogColor)
    sky = makeSky(); scene.add(sky)
    sun = await makeSun('/assets/env/sun.png'); scene.add(sun)
    clouds = await makeClouds('/assets/env/clouds.png'); scene.add(clouds)
    await EntityLayer.loadModels()
    const regs = await (await fetch('/assets/registries.json')).json().catch(() => ({}))
    entities = new EntityLayer(scene, regs)
    return true
  },

  // Fetch a binary blob from Mesher.pack and install every section in it.
  async loadMeshes (url) {
    const buf = await (await fetch(url)).arrayBuffer()
    const hlen = new DataView(buf).getUint32(0, true)
    const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hlen)))
    const base = 4 + hlen + ((4 - ((4 + hlen) % 4)) % 4)
    const view = ([off, n], T) => new T(buf, base + off, n)
    for (const h of header) {
      if (!h.o) { this.removeSection(h.key); continue }
      const part = (p) => ({ positions: view(p[0], Float32Array), colors: view(p[1], Float32Array), uvs: view(p[2], Float32Array), indices: view(p[3], Uint32Array) })
      this.setSection(h.key, { x: h.x, y: h.y, z: h.z, opaque: part(h.o), translucent: part(h.t), endPortal: h.e ? { positions: view(h.e[0], Float32Array), indices: view(h.e[1], Uint32Array) } : null })
    }
    return header.length
  },

  addBlockModel (id, g) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(g.colors, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uvs, 2))
    geo.setIndex(g.indices)
    if (entities) entities.blockModels.set(id, { geo, mat: opaqueMat })
  },

  setSection (key, s) {
    this.removeSection(key)
    const grp = new THREE.Group()
    grp.position.set(s.x, s.y, s.z)
    for (const [part, mat] of [['opaque', opaqueMat], ['translucent', translucentMat]]) {
      const d = s[part]
      if (!d.positions.length) continue
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(d.positions, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(d.colors, 3))
      geo.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2))
      geo.setIndex(new THREE.BufferAttribute(d.indices, 1))
      const m = new THREE.Mesh(geo, mat)
      if (part === 'translucent') m.renderOrder = 1
      grp.add(m)
    }
    if (s.endPortal && s.endPortal.positions.length) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(s.endPortal.positions, 3))
      geo.setIndex(new THREE.BufferAttribute(s.endPortal.indices, 1))
      grp.add(new THREE.Mesh(geo, endPortalMaterial()))
    }
    scene.add(grp)
    sections.set(key, grp)
  },

  removeSection (key) {
    const g = sections.get(key)
    if (!g) return
    scene.remove(g)
    g.traverse(o => { if (o.geometry) o.geometry.dispose() })
    sections.delete(key)
  },

  // pos = eye position; yaw/pitch in mineflayer convention; bob = {x,y,roll,pitch} offsets
  async frame (cam, tick, ents, parts) {
    animate(tick || 0)
    if (entities) await entities.update(ents || [], tick || 0)
    camera.position.set(cam.x, cam.y, cam.z)
    camera.rotation.set(cam.pitch - (cam.bobPitch || 0), cam.yaw, cam.roll || 0)
    if (cam.bobX) camera.translateX(cam.bobX)
    if (cam.bobY) camera.translateY(cam.bobY)
    if (cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix() }
    camera.updateMatrixWorld()
    // Underwater: vanilla swaps to the biome's water fog colour and a short fog distance.
    const blocks = env.renderDistance * 16
    if (cam.sky !== undefined) { sky.material.uniforms.top.value.copy(srgb(cam.sky)); env.fogColor = cam.fog; sky.material.uniforms.horizon.value.copy(srgb(cam.fog)) }
    // FogRenderer: lava 0.25..1.0. (This else chain once sat behind a // comment on one line, so
    // underwater fog never applied and lava fog was never cleared.)
    if (cam.inLava) { scene.fog.color.copy(srgb(0x991a00)); scene.fog.near = 0.25; scene.fog.far = 1.0 } else if (cam.underwater) { scene.fog.color.copy(srgb(cam.waterFog ?? 0x050533)); scene.fog.near = 0; scene.fog.far = 24 } else { scene.fog.color.copy(srgb(env.fogColor)); scene.fog.near = blocks * 0.8; scene.fog.far = blocks }
    const under = cam.underwater || cam.inLava; sky.visible = !under; clouds.visible = !under; sun.visible = !under && !window.DEBUG_NOSUN
    scene.background = cam.inLava ? srgb(0x991a00) : cam.underwater ? srgb(cam.waterFog ?? 0x050533) : srgb(env.fogColor)
    sky.position.copy(camera.position)
    if (window.DEBUG_MAGENTA) { sky.visible = false; scene.background = new THREE.Color(1, 0, 1) }
    placeSun()
    // clouds drift +X at vanilla speed (0.03 blocks/tick); keep them centered on the camera
    const span = 256 * 12
    const drift = (tick || 0) * 0.03
    clouds.position.x = Math.floor((camera.position.x - drift) / span) * span + drift + span / 2
    clouds.position.z = Math.floor(camera.position.z / span) * span + span / 2
    await drawParticles(parts)
    END_TIME.value = ((tick || 0) % 4000) / 4000 * 0.6   // the shader's GameTime drift, slow
    drawSelection(cam)
    renderer.render(scene, camera)
    if (await drawHand(cam)) {
      const ac = renderer.autoClear; renderer.autoClear = false
      renderer.clearDepth(); renderer.render(handScene, handCam)
      renderer.autoClear = ac
    }
    return true
  }
}

// The end portal surface (TheEndPortalRenderer + the rendertype_end_portal shader): end_sky.png
// darkness plus 15 layers of end_portal.png sampled in screen space, each scaled, rotated and
// drifting with time, tinted with the shader's colour table. Double-sided (seen from below too).
let END_MAT = null
const END_TIME = { value: 0 }
function endPortalMaterial () {
  if (END_MAT) return END_MAT
  const tex = new THREE.TextureLoader().load('/assets/env/entity/end_portal.png')
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.NoColorSpace
  END_MAT = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { tex: { value: tex }, time: END_TIME, res: { value: new THREE.Vector2(W, H) } },
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tex; uniform float time; uniform vec2 res;
      const vec3 C[16] = vec3[](vec3(0.022087,0.098399,0.110818), vec3(0.011892,0.095924,0.089485), vec3(0.027636,0.101689,0.100326), vec3(0.046564,0.109883,0.114838),
        vec3(0.064901,0.117696,0.097189), vec3(0.063761,0.086895,0.123646), vec3(0.084817,0.111994,0.166380), vec3(0.097489,0.154120,0.091064),
        vec3(0.106152,0.131144,0.195191), vec3(0.097721,0.110188,0.187229), vec3(0.133516,0.138278,0.148582), vec3(0.070006,0.243332,0.235792),
        vec3(0.196766,0.142899,0.214696), vec3(0.047281,0.315338,0.321970), vec3(0.204675,0.390010,0.302066), vec3(0.080955,0.314821,0.661491));
      mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      void main() {
        vec2 p = gl_FragCoord.xy / res.y;
        vec3 col = vec3(0.07, 0.09, 0.10) * 0.3;
        for (int i = 0; i < 15; i++) {
          float fi = float(i + 1);
          vec2 q = rot(radians((fi * fi * 4321.0 + fi * 9.0) * 2.0)) * p * (4.5 - fi / 4.0);
          q += vec2(17.0 / fi, (2.0 + fi / 1.5) * (time * 1.5));
          col += texture2D(tex, q).rgb * C[i];
        }
        gl_FragColor = vec4(col, 1.0);
      }`
  })
  return END_MAT
}

// Block outline (LevelRenderer.renderHitOutline: black lines, alpha 0.4, the block's shape grown by
// 0.002) and the crack overlay while mining (ModelBakery.DESTROY_TYPES: destroy_stage_N drawn over
// the block with DST_COLOR x SRC_COLOR x 2 blending, so the cracks darken and the rest is unchanged)
let outline = null, crack = null
function drawSelection (cam) {
  if (!outline) {
    outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, fog: false }))
    outline.renderOrder = 2; scene.add(outline)
    const mat = new THREE.MeshBasicMaterial({ map: opaqueMat.map, transparent: true, alphaTest: 0.1, depthWrite: false, fog: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.SrcColorFactor,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
    crack = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), mat)
    crack.userData.uv0 = Float32Array.from(crack.geometry.attributes.uv.array)
    crack.renderOrder = 2; scene.add(crack)
  }
  const tg = cam.target
  outline.visible = !!tg
  if (tg) {
    const [x0, y0, z0, x1, y1, z1] = tg.box
    outline.scale.set(x1 - x0 + 0.004, y1 - y0 + 0.004, z1 - z0 + 0.004)
    outline.position.set(tg.x + (x0 + x1) / 2, tg.y + (y0 + y1) / 2, tg.z + (z0 + z1) / 2)
  }
  const ck = cam.crack
  crack.visible = !!(ck && ck.uv)
  if (crack.visible) {
    crack.position.set(ck.x + 0.5, ck.y + 0.5, ck.z + 0.5)
    const a = crack.geometry.attributes.uv, u0 = crack.userData.uv0, { u, v, su, sv } = ck.uv
    for (let i = 0; i < a.count; i++) { a.array[i * 2] = u + u0[i * 2] * su; a.array[i * 2 + 1] = v + (1 - u0[i * 2 + 1]) * sv }
    a.needsUpdate = true
  }
}

// First-person held item (ItemInHandRenderer, right hand). Drawn in its own scene after the world
// with the depth buffer cleared, from a camera that only carries the view bob / hurt roll.
// the hand sits where vanilla puts it relative to a 16:9 view: same fraction of the half-width from
// the centre. Unscaled, our near-square game view cut tools and torches down to a sliver at the
// edge (every frame review flagged it).
const HAND_X = Math.min(1, (W / H) / (16 / 9))
// ...but moved by turning the whole rig about the eye, not by sliding it sideways: a slide changes the
// angle we see the item from, so tools went edge-on and the swing stretched toward the crosshair.
// Turning keeps vanilla's exact view of the item (its rest point lands where HAND_X puts it).
const HAND_TURN = new THREE.Matrix4().makeRotationY(Math.atan(0.56 / 0.72) - Math.atan(0.56 * HAND_X / 0.72))
const handScene = new THREE.Scene()
const handCam = new THREE.PerspectiveCamera(70, W / H, 0.05, 10)
const handCache = new Map()
const D2R = Math.PI / 180
let handObj = null
// ItemModelGenerator: a generated item is 1 pixel thick: the sprite front and back, plus a 1-pixel-wide
// side quad on every opaque pixel edge that borders transparency. A flat plane turned edge-on in the
// swing and vanished to a sliver (nether_portal review, flint and steel).
function extrudedItemGeometry (img) {
  const W0 = img.width, H0 = img.height, F = Math.min(W0, H0)   // animated sprites: first frame
  const c = document.createElement('canvas'); c.width = W0; c.height = H0
  const cx = c.getContext('2d'); cx.drawImage(img, 0, 0)
  const px = cx.getImageData(0, 0, F, F).data
  const opaque = (x, y) => x >= 0 && y >= 0 && x < F && y < F && px[(y * F + x) * 4 + 3] > 25
  const pos = [], uv = [], nor = [], idx = []
  const T = 0.5 / 16, s = 1 / F
  // pixel (x, y) from the top-left -> plane coords in [-0.5, 0.5], +y up; uv with flipY: v = 1 - y/H0
  const U = x => x / W0, V = y => 1 - y / H0
  function quad (a, b, cc, d, n, uvs) {
    const i = pos.length / 3
    for (const p of [a, b, cc, d]) pos.push(...p)
    for (let k = 0; k < 4; k++) nor.push(...n)
    uv.push(...uvs); idx.push(i, i + 1, i + 2, i, i + 2, i + 3)
  }
  const X = x => -0.5 + x * s, Y = y => 0.5 - y * s
  // front and back faces
  quad([X(0), Y(F), T], [X(F), Y(F), T], [X(F), Y(0), T], [X(0), Y(0), T], [0, 0, 1], [U(0), V(F), U(F), V(F), U(F), V(0), U(0), V(0)])
  quad([X(F), Y(F), -T], [X(0), Y(F), -T], [X(0), Y(0), -T], [X(F), Y(0), -T], [0, 0, -1], [U(F), V(F), U(0), V(F), U(0), V(0), U(F), V(0)])
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    if (!opaque(x, y)) continue
    const uc = (x + 0.5) / W0, vc = 1 - (y + 0.5) / H0, cu = [uc, vc, uc, vc, uc, vc, uc, vc]
    if (!opaque(x, y - 1)) quad([X(x), Y(y), T], [X(x + 1), Y(y), T], [X(x + 1), Y(y), -T], [X(x), Y(y), -T], [0, 1, 0], cu)
    if (!opaque(x, y + 1)) quad([X(x), Y(y + 1), -T], [X(x + 1), Y(y + 1), -T], [X(x + 1), Y(y + 1), T], [X(x), Y(y + 1), T], [0, -1, 0], cu)
    if (!opaque(x - 1, y)) quad([X(x), Y(y + 1), -T], [X(x), Y(y + 1), T], [X(x), Y(y), T], [X(x), Y(y), -T], [-1, 0, 0], cu)
    if (!opaque(x + 1, y)) quad([X(x + 1), Y(y + 1), T], [X(x + 1), Y(y + 1), -T], [X(x + 1), Y(y), -T], [X(x + 1), Y(y), T], [1, 0, 0], cu)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}
async function handObject (h) {
  if (handCache.has(h.key)) return handCache.get(h.key)
  let inner = null, mat = null
  if (h.state !== undefined && entities && entities.blockModels.has(h.state)) {
    const bm = entities.blockModels.get(h.state)
    const m = new THREE.Mesh(bm.geo, bm.mat.clone()); m.position.set(-0.5, -0.5, -0.5); mat = m.material
    inner = new THREE.Group(); inner.add(m)
    // models/block/block.json display.firstperson_righthand: rotation [0, 45, 0], scale 0.4
    inner.rotation.set(0, 45 * D2R, 0); inner.scale.setScalar(0.4)
  } else if (h.tex) {
    let t = null
    try { t = await loadTexture(`/assets/env/${h.tex}.png`) } catch (e) {}
    if (t) {
      t.flipY = true; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true
      mat = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.1, side: THREE.DoubleSide })
      const q = new THREE.Mesh(extrudedItemGeometry(t.image), mat)
      inner = new THREE.Group(); inner.add(q)
      // models/item/generated.json display.firstperson_righthand: rotation [0, -90, 25],
      // translation [1.13, 3.2, 1.13] (pixels), scale 0.68
      inner.position.set(1.13 / 16, 3.2 / 16, 1.13 / 16)
      inner.rotation.set(0, -90 * D2R, 25 * D2R, 'XYZ'); inner.scale.setScalar(0.68)
    }
  }
  const out = inner ? { obj: new THREE.Group(), mat } : null
  if (out) { out.obj.add(inner); out.obj.matrixAutoUpdate = false }
  handCache.set(h.key, out)
  return out
}
// The bare arm when nothing is held (ItemInHandRenderer.renderPlayerArm + PlayerModel.rightArm,
// default wide Steve skin). Model units are pixels (1/16 block), used as-is like the game does.
let ARM = null
async function armObject () {
  if (ARM) return ARM
  const t = await loadTexture('/assets/env/entity/player/wide/steve.png')
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace
  const g = new THREE.BoxGeometry(4 / 16, 12 / 16, 4 / 16)
  // box UV at (40,16), size 4x12x4 on a 64x64 skin; BoxGeometry face order: +x, -x, +y, -y, +z, -z
  // model space is y-down: y=0 (the shoulder, the skin's sleeve rows) is our -y end, so side faces run
  // top-down from -y and the 'top' rect goes on -y, the 'bottom' (the fist) on +y
  const rect = { px: [48, 20, 4, 12], nx: [40, 20, 4, 12], py: [48, 16, 4, 4], ny: [44, 16, 4, 4], pz: [44, 20, 4, 12], nz: [52, 20, 4, 12] }
  const uv = g.attributes.uv, order = ['px', 'nx', 'py', 'ny', 'pz', 'nz']
  for (let f = 0; f < 6; f++) {
    const [u, v, w, h] = rect[order[f]]
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k, a = uv.array[i * 2], b = uv.array[i * 2 + 1]
      uv.array[i * 2] = (u + a * w) / 64; uv.array[i * 2 + 1] = (v + (f === 2 || f === 3 ? 1 - b : b) * h) / 64   // flipY off: v runs top-down; sides flipped (y-down model)
    }
  }
  uv.needsUpdate = true
  const mat = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.1 })
  const mesh = new THREE.Mesh(g, mat)
  mesh.position.set(-6 / 16, 6 / 16, 0)      // the cube's centre: pivot (-5,2,0) + (-3..1, -2..10, -2..2)
  const obj = new THREE.Group(); obj.add(mesh); obj.matrixAutoUpdate = false
  ARM = { obj, mat }
  return ARM
}

async function drawHand (cam) {
  if (handObj) { handScene.remove(handObj.obj); handObj = null }
  const h = cam.hand
  if (!h || cam.dead) return false
  if (!h.key) {   // empty hand: the arm
    const r = await armObject()
    const a = h.swing || 0, g = Math.sqrt(a)
    const M = HAND_TURN.clone().multiply(new THREE.Matrix4().makeTranslation(-0.3 * Math.sin(g * Math.PI) + 0.64, 0.4 * Math.sin(g * Math.PI * 2) - 0.6 + (h.equip || 0) * -0.6, -0.4 * Math.sin(a * Math.PI) - 0.72))
    M.multiply(new THREE.Matrix4().makeRotationY(45 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationY(Math.sin(g * Math.PI) * 70 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationZ(Math.sin(a * a * Math.PI) * -20 * D2R))
    M.multiply(new THREE.Matrix4().makeTranslation(-1, 3.6, 3.5))
    M.multiply(new THREE.Matrix4().makeRotationZ(120 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationX(200 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationY(-135 * D2R))
    M.multiply(new THREE.Matrix4().makeTranslation(5.6, 0, 0))
    r.obj.matrix.copy(M)
    r.mat.color.setRGB(...(Array.isArray(h.light) ? h.light : [h.light ?? 1, h.light ?? 1, h.light ?? 1]))
    handScene.add(r.obj); handObj = { obj: r.obj }
    handCam.position.set(0, 0, 0)
    handCam.rotation.set(-(cam.bobPitch || 0), 0, cam.roll || 0)
    if (cam.bobX) handCam.translateX(cam.bobX)
    if (cam.bobY) handCam.translateY(cam.bobY)
    handCam.updateMatrixWorld()
    return true
  }
  const r = await handObject(h)
  if (!r) return false
  // swing (renderArmWithItem + applyItemArmAttackTransform), equip drop (applyItemArmTransform)
  const a = h.swing || 0, sa = Math.sin(Math.sqrt(a) * Math.PI)
  const M = HAND_TURN.clone().multiply(new THREE.Matrix4().makeTranslation(-0.4 * sa, 0.2 * Math.sin(Math.sqrt(a) * Math.PI * 2), -0.2 * Math.sin(a * Math.PI)))
  M.multiply(new THREE.Matrix4().makeTranslation(0.56, -0.52 + (h.equip || 0) * -0.6, -0.72))
  const f = Math.sin(a * a * Math.PI)
  M.multiply(new THREE.Matrix4().makeRotationY((45 + f * -20) * D2R))
  M.multiply(new THREE.Matrix4().makeRotationZ(sa * -20 * D2R))
  M.multiply(new THREE.Matrix4().makeRotationX(sa * -80 * D2R))
  M.multiply(new THREE.Matrix4().makeRotationY(-45 * D2R))
  r.obj.matrix.copy(M)
  if (r.mat) r.mat.color.setRGB(...(Array.isArray(h.light) ? h.light : [h.light ?? 1, h.light ?? 1, h.light ?? 1]))
  handScene.add(r.obj); handObj = r
  handCam.position.set(0, 0, 0)
  handCam.rotation.set(-(cam.bobPitch || 0), 0, cam.roll || 0)
  if (cam.bobX) handCam.translateX(cam.bobX)
  if (cam.bobY) handCam.translateY(cam.bobY)
  handCam.updateMatrixWorld()
  return true
}
window.HB_READY = true
