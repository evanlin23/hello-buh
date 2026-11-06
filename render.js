// Frame-exact renderer for a bot recording (bot.js RECORD=...). Meshes the world in Node with the
// real client jar's models/textures (renderer/), draws each frame in headless Chromium with
// three.js (renderer/page.js), screenshots it. Smoothness doesn't depend on CPU speed.
// usage: node render.js recording.json outDir [fps=60] [width=1080] [height=1011]
const fs = require('fs')
const path = require('path')
const http = require('http')
const express = require('express')
const { chromium } = require('playwright')
const { Mesher } = require('./renderer/mesher')
const { Vec3 } = require('vec3')

const [recPath, outDir, fpsArg, wArg, hArg] = process.argv.slice(2)
const FPS = Number(fpsArg || 60), W = Number(wArg || 1080), H = Number(hArg || 1011)
const EYE = 1.62
const rec = JSON.parse(fs.readFileSync(recPath))
const P = rec.poses

function lerpAngle (a, b, f) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * f }

// Vanilla view bobbing (GameRenderer.bobView): walkDist advances with horizontal movement on the
// ground; bob eases toward min(0.1, speed) on the ground and 0 in the air.
const bobState = []
{
  let walk = 0, bob = 0
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[i]
    const h = Math.hypot(b[1] - a[1], b[3] - a[3])
    const onGround = Math.abs(b[2] - a[2]) < 1e-4
    walk += h * 0.6
    bob += ((onGround ? Math.min(0.1, h) : 0) - bob) * 0.4
    bobState.push({ walk, bob })
  }
}

function camAt (t) {
  const i = Math.min(P.length - 2, Math.max(0, Math.floor(t))), f = Math.min(1, Math.max(0, t - i))
  const a = P[i], b = P[i + 1], A = bobState[i], B = bobState[i + 1]
  const g = A.walk + (B.walk - A.walk) * f, h = A.bob + (B.bob - A.bob) * f
  return {
    x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f + EYE, z: a[3] + (b[3] - a[3]) * f,
    yaw: lerpAngle(a[4], b[4], f), pitch: a[5] + (b[5] - a[5]) * f,
    bobX: Math.sin(g * Math.PI) * h * 0.5,
    bobY: -Math.abs(Math.cos(g * Math.PI) * h),
    roll: Math.sin(g * Math.PI) * h * 3 * Math.PI / 180,
    bobPitch: Math.abs(Math.cos(g * Math.PI - 0.2) * h) * 5 * Math.PI / 180
  }
}

;(async () => {
  const mesher = new Mesher(rec.version)
  mesher.addColumns(rec.columns)

  const app = express()
  const blobs = new Map(); let blobId = 0
  app.get('/mesh/:id', (req, res) => { const b = blobs.get(req.params.id); blobs.delete(req.params.id); res.type('application/octet-stream').send(b) })
  app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'page.html')))
  app.get('/page.js', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'page.js')))
  app.use('/three', express.static(path.join(__dirname, 'node_modules', 'three', 'build')))
  app.use('/assets', express.static(path.join(__dirname, 'work', 'assets', rec.version)))
  const server = http.createServer(app)
  await new Promise(r => server.listen(0, '127.0.0.1', r))

  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  page.on('pageerror', e => console.error('page error:', e.message))
  page.on('console', m => { if (m.type() === 'error') console.error('page:', m.text()) })
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForFunction(() => window.HB_READY)
  await page.evaluate((o) => window.HB.init(o), { renderDistance: Number(process.env.RENDER_DISTANCE || 8) })

  const send = async (list) => {
    const id = String(blobId++)
    blobs.set(id, mesher.pack(list))
    await page.evaluate((u) => window.HB.loadMeshes(u), `/mesh/${id}`)
  }
  const t0 = Date.now()
  const minVisibleY = rec.set ? rec.set.y - 24 : -64
  console.log(`light computed in ${(mesher.computeLight(minVisibleY) / 1000).toFixed(1)} s`)
  await send(mesher.sections(minVisibleY))
  console.log(`meshed + uploaded world in ${((Date.now() - t0) / 1000).toFixed(1)} s`)

  fs.mkdirSync(outDir, { recursive: true })
  const ticks = P.length - 1, frames = Math.floor(ticks / 20 * FPS)
  // ONLY=t1,t2,... renders just those ticks (for checking looks quickly)
  const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null
  let bi = 0
  const t1 = Date.now()
  for (let f = 0; f < (only ? only.length : frames); f++) {
    const t = only ? only[f] : f * 20 / FPS
    // block changes due by this frame -> re-mesh the touched sections (and neighbours at edges)
    const dirty = new Map()
    while (bi < rec.blocks.length && rec.blocks[bi][0] <= t) {
      const [, x, y, z, stateId] = rec.blocks[bi++]
      mesher.setBlock(x, y, z, stateId)
      for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const sx = Math.floor((x + dx) / 16) * 16, sy = Math.floor((y + dy) / 16) * 16, sz = Math.floor((z + dz) / 16) * 16
        dirty.set(`${sx},${sy},${sz}`, { key: `${sx},${sy},${sz}`, sx, sy, sz })
      }
    }
    if (dirty.size) await send([...dirty.values()])
    const cam = camAt(t)
    const inBlock = mesher.world.getBlock(new Vec3(cam.x, cam.y, cam.z))
    cam.underwater = !!(inBlock && inBlock.name === 'water')
    const bio = inBlock && inBlock.biome && mesher.biomes[inBlock.biome.name]
    if (bio) { cam.sky = bio.sky; cam.fog = bio.fog; cam.waterFog = bio.water_fog }
    await page.evaluate(([c, tick]) => window.HB.frame(c, tick), [cam, t])
    await page.screenshot({ path: `${outDir}/f${String(f).padStart(5, '0')}.png` })
    if (f % 60 === 0) console.log(`frame ${f}/${frames}`)
  }
  const secs = (Date.now() - t1) / 1000
  console.log(`rendered ${frames} frames (${(frames / FPS).toFixed(2)} s of video) in ${secs.toFixed(1)} s = ${(secs / (frames / FPS)).toFixed(1)} s per video second`)
  await browser.close(); server.close(); process.exit(0)
})()
