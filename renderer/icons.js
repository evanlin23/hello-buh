// Inventory icons for the HUD, the way the game draws them:
//  - items whose definition (assets/minecraft/items/<name>.json) points at a block model are
//    drawn as a small 3D block from the GUI angle (rotation 30 / 225, orthographic, 0.625
//    scale), using our block mesher, so non-cube blocks (lectern, ...) look right
//  - everything else uses its flat item texture (edit.py draws those)
// Writes work/assets/<ver>/icons/<name>.png (48x48 = 16px at GUI scale 3, transparent).
// usage: node renderer/icons.js <version> name1 name2 ...
const fs = require('fs')
const path = require('path')
const http = require('http')
const express = require('express')
const zlib = require('zlib')
const { chromium } = require('playwright')
const { Vec3 } = require('vec3')
const { getSectionGeometry, setBiomeColors } = require('./models')
const { World } = require('./world')

const [ver, ...names] = process.argv.slice(2)
const ROOT = path.join(__dirname, '..')
const A = path.join(ROOT, 'work', 'assets', ver)
const SIZE = Number(process.env.ICON_SIZE || 48)

function itemModel (name) {
  // read the item definition straight from the client jar
  const jar = path.join(ROOT, 'work', 'client', `${ver}.jar`)
  const { execFileSync } = require('child_process')
  try {
    const j = JSON.parse(execFileSync('unzip', ['-p', jar, `assets/minecraft/items/${name}.json`]).toString())
    // a plain model is {type: 'minecraft:model', model: 'minecraft:block/...'}; 'special' models (beds,
    // chests, heads, banners, shulker boxes) have model: {type: 'minecraft:bed', ...} and the icon's
    // model in .base, and select/condition models have neither (every_clutch crashed on red_bed)
    const m = j.model || {}
    const r = typeof m.model === 'string' ? m.model : typeof m.base === 'string' ? m.base : null
    return r
  } catch { return null }
}

;(async () => {
  const blockStates = JSON.parse(fs.readFileSync(path.join(A, 'resolved.json')))
  setBiomeColors(JSON.parse(fs.readFileSync(path.join(A, 'biomes.json'))))
  const mcData = require('minecraft-data')(ver)
  const Chunk = require('prismarine-chunk')(ver)
  const todo = names.filter(n => (itemModel(n) || '').startsWith('minecraft:block/') && mcData.blocksByName[n])
  if (!todo.length) { console.log('no 3D block icons needed'); return }

  const app = express()
  app.get('/', (_, res) => res.type('html').send(`<!doctype html><html><body style="margin:0;background:transparent">
<script type="importmap">{"imports":{"three":"/three/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three'
THREE.ColorManagement.enabled = false
const r = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true })
r.setPixelRatio(1); r.setSize(${SIZE}, ${SIZE}); r.setClearColor(0x000000, 0); r.outputColorSpace = THREE.LinearSRGBColorSpace
document.body.appendChild(r.domElement)
const tex = await new THREE.TextureLoader().loadAsync('/assets/atlas.png')
tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false; tex.colorSpace = THREE.NoColorSpace
const mat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide })
// translucent blocks (honey, slime, stained glass, ice): blended like the GUI's translucent item render type
const tmat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false })
window.icon = (d) => {
  const scene = new THREE.Scene()
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(d.positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(d.colors, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uvs, 2))
  g.setIndex(d.indices)
  const m = new THREE.Mesh(g, d.translucent ? tmat : mat)
  // block centred on the origin, then the GUI display transform: rotate y 225, x 30, scale 0.625
  const grp = new THREE.Group(); grp.add(m); m.position.set(-0.5, -0.5, -0.5)
  grp.rotation.order = 'XYZ'; grp.rotation.set(30 * Math.PI / 180, 225 * Math.PI / 180, 0); grp.scale.setScalar(0.625)
  scene.add(grp)
  const cam = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10, 10)
  cam.position.set(0, 0, 5); cam.lookAt(0, 0, 0)
  r.render(scene, cam)
  return r.domElement.toDataURL('image/png')
}
window.READY = true
</script></body></html>`))
  app.use('/three', express.static(path.join(ROOT, 'node_modules', 'three', 'build')))
  app.use('/assets', express.static(A))
  const server = http.createServer(app)
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } })
  page.on('pageerror', e => console.error('page error:', e.message))
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForFunction(() => window.READY)
  fs.mkdirSync(path.join(A, 'icons'), { recursive: true })
  for (const name of todo) {
    // one block, default state, in an otherwise empty chunk (fully sky-lit)
    const world = new World(ver)
    const col = new Chunk({ minY: -64, worldHeight: 384 })
    col.setBlockStateId(new Vec3(8, 64, 8), mcData.blocksByName[name].defaultState)
    for (let y = -64; y < 320; y++) for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) col.setSkyLight(new Vec3(x, y, z), 15)
    // inventory icons use the default (plains) grass/foliage colours
    const plains = mcData.biomesByName.plains.id
    for (let y = 48; y < 80; y += 4) for (let x = 0; x < 16; x += 4) for (let z = 0; z < 16; z += 4) col.setBiome(new Vec3(x, y, z), plains)
    world.addColumn(0, 0, col.toJson())
    const g = getSectionGeometry(0, 64, 0, world, blockStates)
    // section-relative -> block-relative (block at local 8,0,8 -> section offset -8)
    // the translucent quads (honey, slime, stained glass, ice) are kept apart by the mesher: append them
    const nv = g.positions.length / 3
    const pos = Array.from(g.positions).concat(Array.from(g.t_positions || [])); for (let i = 0; i < pos.length; i += 3) { pos[i] -= 0; pos[i + 1] += 8; pos[i + 2] -= 0 }
    const tIdx = Array.from(g.t_indices || []).map(i => i + nv)
    const d = { positions: pos, colors: Array.from(g.colors).concat(Array.from(g.t_colors || [])), uvs: Array.from(g.uvs).concat(Array.from(g.t_uvs || [])), indices: Array.from(g.indices).concat(tIdx), translucent: tIdx.length > 0 }
    const url = await page.evaluate((d) => window.icon(d), d)
    fs.writeFileSync(path.join(A, 'icons', `${name}.png`), Buffer.from(url.split(',')[1], 'base64'))
    console.log('icon', name)
  }
  await browser.close(); server.close()
})()
