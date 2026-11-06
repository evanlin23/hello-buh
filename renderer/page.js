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

window.HB = {
  async init (opts) {
    Object.assign(env, opts || {})
    const atlas = await loadTexture('/assets/atlas.png')
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
      this.setSection(h.key, { x: h.x, y: h.y, z: h.z, opaque: part(h.o), translucent: part(h.t) })
    }
    return header.length
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
  async frame (cam, tick, ents) {
    if (entities) await entities.update(ents || [])
    camera.position.set(cam.x, cam.y, cam.z)
    camera.rotation.set(cam.pitch - (cam.bobPitch || 0), cam.yaw, cam.roll || 0)
    if (cam.bobX) camera.translateX(cam.bobX)
    if (cam.bobY) camera.translateY(cam.bobY)
    if (cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix() }
    camera.updateMatrixWorld()
    // Underwater: vanilla swaps to the biome's water fog colour and a short fog distance.
    const blocks = env.renderDistance * 16
    if (cam.sky !== undefined) { sky.material.uniforms.top.value.copy(srgb(cam.sky)); env.fogColor = cam.fog; sky.material.uniforms.horizon.value.copy(srgb(cam.fog)) }
    if (cam.underwater) { scene.fog.color.copy(srgb(cam.waterFog ?? 0x050533)); scene.fog.near = 0; scene.fog.far = 24 } else { scene.fog.color.copy(srgb(env.fogColor)); scene.fog.near = blocks * 0.8; scene.fog.far = blocks }
    sky.visible = !cam.underwater; clouds.visible = !cam.underwater; sun.visible = !cam.underwater
    scene.background = cam.underwater ? srgb(0x050533) : srgb(env.fogColor)
    sky.position.copy(camera.position)
    if (window.DEBUG_MAGENTA) { sky.visible = false; scene.background = new THREE.Color(1, 0, 1) }
    placeSun()
    // clouds drift +X at vanilla speed (0.03 blocks/tick); keep them centered on the camera
    const span = 256 * 12
    const drift = (tick || 0) * 0.03
    clouds.position.x = Math.floor((camera.position.x - drift) / span) * span + drift + span / 2
    clouds.position.z = Math.floor(camera.position.z / span) * span + span / 2
    renderer.render(scene, camera)
    return true
  }
}
window.HB_READY = true
