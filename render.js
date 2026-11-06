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
const { lightmap } = require('./renderer/models')
const particles = require('./renderer/particles')
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

// Entities by tick: Map(tick -> Map(id -> row)); rows are [tick, id, name, x, y, z, yaw, pitch, headYaw, extra]
const ENT = new Map()
for (const row of rec.entities || []) { if (!ENT.has(row[0])) ENT.set(row[0], new Map()); ENT.get(row[0]).set(row[1], row) }
// The server sends mob moves every few ticks, so recorded positions are steps (a creeper "glided"
// in 0.4-block hops). The vanilla client eases toward each new position over 3 ticks
// (Entity.lerpTo / lerpSteps); do the same, per tick, before the per-frame interpolation.
{
  const cur = new Map()   // id -> { x, y, z, tx, ty, tz, steps }
  for (const tick of [...ENT.keys()].sort((a, b) => a - b)) {
    for (const [id, row] of ENT.get(tick)) {
      if (row[2] === 'falling_block' || row[2] === 'item') continue
      let c = cur.get(id)
      if (!c || c.last !== tick - 1) c = { x: row[3], y: row[4], z: row[5], tx: row[3], ty: row[4], tz: row[5], steps: 0 }
      if (Math.hypot(row[3] - c.tx, row[4] - c.ty, row[5] - c.tz) > 4) { c.x = c.tx = row[3]; c.y = c.ty = row[4]; c.z = c.tz = row[5]; c.steps = 0 }   // teleport: no easing
      else if (row[3] !== c.tx || row[4] !== c.ty || row[5] !== c.tz) { c.tx = row[3]; c.ty = row[4]; c.tz = row[5]; c.steps = 3 }
      if (c.steps > 0) { c.x += (c.tx - c.x) / c.steps; c.y += (c.ty - c.y) / c.steps; c.z += (c.tz - c.z) / c.steps; c.steps-- }
      c.last = tick; cur.set(id, c)
      const r = row.slice(); r[3] = c.x; r[4] = c.y; r[5] = c.z; ENT.get(tick).set(id, r)
    }
  }
}
function entitiesAt (t, mesher) {
  const i = Math.floor(t), f = t - i
  const a = ENT.get(i) || new Map(), b = ENT.get(i + 1) || a
  const out = []
  for (const [id, ra] of a) {
    let rb = b.get(id) || ra
    if (Math.hypot(rb[3] - ra[3], rb[4] - ra[4], rb[5] - ra[5]) > 4) rb = ra   // teleport: hold, then snap on the next tick
    const L = (k) => ra[k] + (rb[k] - ra[k]) * f
    const pos = { x: L(3), y: L(4), z: L(5) }
    const [sky, blk] = mesher.world.getLight(new Vec3(pos.x, pos.y + 0.5, pos.z))
    out.push({ id, name: ra[2], ...pos, yaw: lerpAngle(ra[6], rb[6], f), pitch: L(7), headYaw: ra[8] === null ? null : lerpAngle(ra[8], rb[8] ?? ra[8], f), extra: ra[9], light: lightmap(Math.max(sky, blk)) })
  }
  return out
}

// Death, as the vanilla client shows it in first person (GameRenderer.bobHurt + Pose.DYING):
// the eye stays at 1.62 (the dying pose keeps the eye height), the view rolls by
// 40 - 8000/(deathTime + 200) degrees (0 -> 3.6 over a second), and the body keeps its
// physics (it falls, or sinks in lava/water) until the respawn. mineflayer teleports the bot to
// the respawn point the same tick, so the camera is simulated from the death pose on.
// first tick each entity was seen (TNT fuse timing) and the TNT block state
const FIRST_SEEN = new Map()
for (const r of rec.entities || []) if (!FIRST_SEEN.has(r[1])) FIRST_SEEN.set(r[1], r[0])
const TNT_FUSE = {}   // fuse when first seen (chain-lit TNT gets 10-30 ticks, a lit one 80)
for (const r of rec.entities || []) if (r[2] === 'tnt' && r[9] && r[9].fuse !== undefined && TNT_FUSE[r[1]] === undefined && FIRST_SEEN.get(r[1]) === r[0]) TNT_FUSE[r[1]] = r[9].fuse
const TNT_STATE = require('minecraft-data')(rec.version).blocksByName.tnt.defaultState
const MC = require('minecraft-data')(rec.version)
const FALL_START = new Map()   // falling_block id -> where it appeared
for (const r of rec.entities || []) if (r[2] === 'falling_block' && !FALL_START.has(r[1])) FALL_START.set(r[1], { t: r[0], x: r[3], y: r[4], z: r[5], vy: 0 })
const FACE = []
// [start tick, end tick, which]: which = { ids: [...] } or { near: [x, z, r] } from the face_on mark,
// or null for every villager (older recordings)
{ let a = null; for (const e of rec.timeline || []) { if (e.event === 'face_on') a = [e.t / 50, e.ids || e.near ? { ids: e.ids, near: e.near } : null]; if (e.event === 'face_off' && a !== null) { FACE.push([a[0], e.t / 50, a[1]]); a = null } } if (a !== null) FACE.push([a[0], Infinity, a[1]]) }
const EXPLOSIONS = (rec.timeline || []).filter(e => e.event === 'particles' && e.type === 'explosion').map(e => ({ t: e.t / 50, x: e.x, z: e.z }))
const ASSETS_DIR = path.join(__dirname, 'work', 'assets', rec.version)
// Held item over time: hotbar contents + selected slot from the timeline, the tick the held item last
// changed (equip animation) and the arm swings (6-tick attack animation).
const HELD = []          // [tick, itemName|null]
const SWINGS = []
{
  let items = null, slot = 0, cur
  for (const e of rec.timeline || []) {
    if (e.event === 'hotbar') items = e.items
    if (e.slot !== undefined) slot = e.slot
    if (e.event === 'swing') SWINGS.push(e.t / 50)
    if (!items) continue
    const it = items[slot], name = it ? (Array.isArray(it) ? it[0] : it) : null
    if (name !== cur) { HELD.push([e.t / 50, name]); cur = name }
  }
}
function handAt (t) {
  let h = null
  for (const x of HELD) { if (x[0] <= t) h = x; else break }
  if (!h || !h[1]) return null
  const since = t - h[0]
  const equip = HELD[0] === h ? 0 : Math.max(0, 1 - since / 3)     // ~3 ticks to raise a new item
  let swing = 0
  for (const s of SWINGS) if (s <= t && t - s < 6) swing = (t - s) / 6
  return { name: h[1], equip, swing }
}
const DEATHS = []
{
  let open = null
  for (const e of rec.timeline || []) {
    if (e.event === 'death' && open === null) open = e.t / 50
    if (e.event === 'respawn' && open !== null) { DEATHS.push([open, e.t / 50]); open = null }
  }
  if (open !== null) DEATHS.push([open, Infinity])
  // a missing respawn mark (older recordings): the death ends where the pose jumps (respawn teleport)
  for (const d of DEATHS) {
    for (let i = Math.ceil(d[0]) + 1; i < Math.min(P.length, d[1]); i++) {
      const a = P[i - 1], b = P[i]
      if ((b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2 + (b[3] - a[3]) ** 2 > 64) { d[1] = i; break }
    }
  }
}
// Hurt tilt (bobHurt): each hit sets hurtTime = 10; the view rolls by -sin(h^4 pi) * 14 degrees
// around the hit direction (yaw from the hurt_animation packet, 0 for undirected damage).
const HURTS = []
{
  const tl = rec.timeline || []
  const hasHurt = tl.some(e => e.event === 'hurt')
  let hp = 20
  for (const e of tl) {
    if (hasHurt && e.event === 'hurt') {
      const d = tl.find(x => x.event === 'hurt_dir' && Math.abs(x.t - e.t) <= 50)
      HURTS.push({ t: e.t / 50, dir: d ? d.yaw * Math.PI / 180 : 0 })
    }
    if (!hasHurt && e.event === 'health' && e.health < hp - 0.01 && e.health > 0) HURTS.push({ t: e.t / 50, dir: 0 })
    if (e.event === 'health' && e.health > 0) hp = e.health
    if (!hasHurt && e.event === 'death') HURTS.push({ t: e.t / 50, dir: 0 })
  }
}
function hurtTilt (t) {
  let roll = 0, pitch = 0
  for (const h of HURTS) {
    const e = t - h.t
    if (e < 0 || e >= 10) continue
    let k = (10 - e) / 10
    k = Math.sin(k * k * k * k * Math.PI)
    const j = -k * 14 * Math.PI / 180
    roll += j * Math.cos(h.dir); pitch += -j * Math.sin(h.dir)
  }
  return { roll, pitch }
}

let deathSim = null
function bodyAfterDeath (d, t) {
  // vanilla LivingEntity.travel for a body with no input: gravity 0.08 and drag 0.98 in air,
  // (0.5, 0.8, 0.5) and gravity 0.02 in lava, 0.8 and gravity 0.02 in water; stops on blocks
  if (!deathSim || deathSim.d !== d) {
    const i = Math.max(1, Math.min(P.length - 1, Math.floor(d[0])))
    const a = P[i - 1], b = P[i]
    // older recordings: mineflayer auto-respawned on the death tick, so b may be the respawn point
    const tele = (b[1] - a[1]) ** 2 + (b[3] - a[3]) ** 2 > 64
    const start = tele ? a : b
    const prev = tele ? P[Math.max(0, i - 2)] : a
    let x = start[1], y = start[2], z = start[3], vx = start[1] - prev[1], vy = start[2] - prev[2], vz = start[3] - prev[3]
    const pts = [[x, y, z]]
    const blk = (x, y, z) => { const bl = solidWorld && solidWorld.getBlock(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z))); return bl ? bl.name : 'air' }
    const solid = (x, y, z) => { const bl = solidWorld && solidWorld.getBlock(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z))); return !!(bl && bl.boundingBox === 'block') }
    for (let k = 0; k < 400; k++) {
      const m = blk(x, y + 0.1, z)
      if (m === 'lava') { vx *= 0.5; vy *= 0.8; vz *= 0.5; vy -= 0.02 } else if (m === 'water') { vx *= 0.8; vy *= 0.8; vz *= 0.8; vy -= 0.02 } else { vy -= 0.08; vy *= 0.98; vx *= 0.91; vz *= 0.91 }
      if (solid(x + vx, y, z)) vx = 0
      if (solid(x, y, z + vz)) vz = 0
      x += vx; z += vz
      if (vy < 0 && solid(x, y + vy, z)) { y = Math.floor(y + vy) + 1; vy = 0 } else y += vy
      pts.push([x, y, z])
    }
    deathSim = { d, pts, yaw: start[4], pitch: start[5] }
  }
  const e = Math.max(0, t - d[0]), i = Math.min(deathSim.pts.length - 2, Math.floor(e)), f = e - i
  const A = deathSim.pts[i], B = deathSim.pts[i + 1]
  return { x: A[0] + (B[0] - A[0]) * f, y: A[1] + (B[1] - A[1]) * f, z: A[2] + (B[2] - A[2]) * f, yaw: deathSim.yaw, pitch: deathSim.pitch }
}
let solidWorld = null   // set once the mesher exists

function camAt (t) {
  const d = DEATHS.find(([a, b]) => t >= a && t < b)
  const h = hurtTilt(t)
  if (d) {
    const b = bodyAfterDeath(d, t)
    const g = Math.min(t - d[0], 20)
    return { ...b, y: b.y + EYE, roll: (40 - 8000 / (g + 200)) * Math.PI / 180 + h.roll, bobX: 0, bobY: 0, bobPitch: h.pitch }
  }
  const c = camAtLive(t)
  return { ...c, roll: c.roll + h.roll, bobPitch: c.bobPitch + h.pitch }
}

function camAtLive (t) {
  const i = Math.min(P.length - 2, Math.max(0, Math.floor(t)))
  const a = P[i], b = P[i + 1], A = bobState[i], B = bobState[i + 1]
  // a teleport (over 4 blocks in one tick) is a cut, never a glide through the in-between spots
  const f = Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) > 4 ? 0 : Math.min(1, Math.max(0, t - i))
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
  solidWorld = mesher.world

  const app = express()
  const blobs = new Map(); let blobId = 0
  app.get('/mesh/:id', (req, res) => { const b = blobs.get(req.params.id); blobs.delete(req.params.id); res.type('application/octet-stream').send(b) })
  app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'page.html')))
  app.get('/page.js', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'page.js')))
  app.get('/entities.js', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'entities.js')))
  app.get('/entity_models.json', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'entity_models.json')))
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
  if (process.env.DEBUG_MAGENTA) await page.evaluate(() => { window.DEBUG_MAGENTA = true })
  if (process.env.DEBUG_NOSUN) await page.evaluate(() => { window.DEBUG_NOSUN = true })
  await page.evaluate((o) => window.HB.init(o), { renderDistance: Number(process.env.RENDER_DISTANCE || 8) })

  const send = async (list) => {
    const id = String(blobId++)
    blobs.set(id, mesher.pack(list))
    await page.evaluate((u) => window.HB.loadMeshes(u), `/mesh/${id}`)
  }
  const t0 = Date.now()
  // the lowest surface, or deeper when the player goes underground (caves)
  const minVisibleY = Math.min(mesher.lowestSurface(), Math.floor(Math.min(...P.map(p => p[2]))) - 24) - 8
  console.log('meshing from y', minVisibleY)
  console.log(`light computed in ${(mesher.computeLight(minVisibleY) / 1000).toFixed(1)} s`)
  await send(mesher.sections(minVisibleY))
  console.log(`meshed + uploaded world in ${((Date.now() - t0) / 1000).toFixed(1)} s`)

  // particles from recorded events (block crumbs use the block's particle texture in the atlas)
  const PARTS = []
  for (const ev of (rec.timeline || []).filter(e => e.event === 'particles')) {
    let bt = null
    if (ev.block) { const st = mesher.blockStates[ev.block]; const v = st && (st.variants ? Object.values(st.variants)[0] : st.multipart && st.multipart[0].apply); const m = Array.isArray(v) ? v[0] : v; bt = m && m.model && m.model.textures && m.model.textures.particle }
    PARTS.push(...particles.spawn(ev, bt))
  }
  const solidAt = (x, y, z) => { const b = mesher.world.getBlock(new Vec3(x, y, z)); return !!(b && b.isCube && !b.transparent) }
  const partsAt = (t, cam) => {
    const out = []
    if (process.env.NOPARTS) return out   // debug: frames without particles
    for (const p of PARTS) {
      const s = particles.state(p, t, solidAt); if (!s) continue
      if (cam && Math.hypot(s.x - cam.x, s.y - cam.y, s.z - cam.z) < 1.0) continue   // too close: would fill the screen
      // light is computed once, before the stunt's block changes: crumbs of a just-broken block sit
      // in what was a solid (light 0) cell, so take the brightest of the cell and its neighbours
      let lv = 0
      for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const [sky, blk] = mesher.world.getLight(new Vec3(s.x + dx, s.y + dy, s.z + dz))
        lv = Math.max(lv, sky, blk)
      }
      // still unlit (a hole dug into a wall: every neighbour was solid when light was computed):
      // light spreads in once the block is gone, so take the brightest within 2 blocks, minus the distance
      if (lv === 0) {
        for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
          const [sky, blk] = mesher.world.getLight(new Vec3(s.x + dx, s.y + dy, s.z + dz))
          lv = Math.max(lv, Math.max(sky, blk) - Math.abs(dx) - Math.abs(dy) - Math.abs(dz))
        }
      }
      const l = p.bright ? 1 : lightmap(lv)
      out.push({ x: s.x, y: s.y, z: s.z, size: s.size, tex: s.tex || p.tex, uv: p.uv, color: p.color.map(c => c * l) })
    }
    return out
  }
  if (PARTS.length) console.log(`${PARTS.length} particles`)
  fs.mkdirSync(outDir, { recursive: true })
  const ticks = P.length - 1, frames = Math.floor(ticks / 20 * FPS)
  // ONLY=t1,t2,... renders just those ticks (for checking looks quickly)
  const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null
  let bi = 0
  const sentBlocks = new Set()
  const t1 = Date.now()
  for (let f = 0; f < (only ? only.length : frames); f++) {
    const t = only ? only[f] : f * 20 / FPS
    // block changes due by this frame -> re-mesh the touched sections (and neighbours at edges)
    const dirty = new Map()
    let nChanged = 0, bb = null
    while (bi < rec.blocks.length && rec.blocks[bi][0] <= t) {
      const [, x, y, z, stateId] = rec.blocks[bi++]
      mesher.setBlock(x, y, z, stateId)
      nChanged++
      bb = bb ? [Math.min(bb[0], x), Math.min(bb[1], y), Math.min(bb[2], z), Math.max(bb[3], x), Math.max(bb[4], y), Math.max(bb[5], z)] : [x, y, z, x, y, z]
      for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const sx = Math.floor((x + dx) / 16) * 16, sy = Math.floor((y + dy) / 16) * 16, sz = Math.floor((z + dz) / 16) * 16
        dirty.set(`${sx},${sy},${sz}`, { key: `${sx},${sy},${sz}`, sx, sy, sz })
      }
    }
    // a big change at once (an explosion, a crater): light from before is badly wrong there (the
    // exposed walls stayed black), so relight the world and re-mesh everything around the change
    if (nChanged >= 24) {
      mesher.computeLight(minVisibleY)
      for (let sx = Math.floor((bb[0] - 16) / 16) * 16; sx <= bb[3] + 16; sx += 16) {
        for (let sy = Math.floor((bb[1] - 16) / 16) * 16; sy <= bb[4] + 16; sy += 16) {
          for (let sz = Math.floor((bb[2] - 16) / 16) * 16; sz <= bb[5] + 16; sz += 16) {
            if (sy + 16 < minVisibleY) continue
            dirty.set(`${sx},${sy},${sz}`, { key: `${sx},${sy},${sz}`, sx, sy, sz })
          }
        }
      }
    }
    if (dirty.size) await send([...dirty.values()])
    const cam = camAt(t)
    if (process.env.CAM) {   // debug: CAM="dx,dy,dz,yawDeg,pitchDeg" relative to the set origin
      const [dx, dy, dz, yw, pt] = process.env.CAM.split(',').map(Number)
      Object.assign(cam, { x: rec.set.x + dx, y: rec.set.y + dy, z: rec.set.z + dz, yaw: yw * Math.PI / 180, pitch: pt * Math.PI / 180, bobX: 0, bobY: 0, roll: 0, bobPitch: 0 })
    }
    const inBlock = mesher.world.getBlock(new Vec3(cam.x, cam.y, cam.z))
    cam.underwater = !!(inBlock && inBlock.name === 'water')
    cam.inLava = !!(inBlock && inBlock.name === 'lava')
    const bio = inBlock && inBlock.biome && mesher.biomes[inBlock.biome.name]
    if (bio) { cam.sky = bio.sky; cam.fog = bio.fog; cam.waterFog = bio.water_fog }
    const ents = entitiesAt(t, mesher)
    // first-person held item
    const hd = handAt(t)
    if (hd) {
      const bl = MC.blocksByName[hd.name]
      const hasSprite = fs.existsSync(path.join(ASSETS_DIR, 'env', 'item', `${hd.name}.png`))
      const [hs, hb] = mesher.world.getLight(new Vec3(cam.x, cam.y, cam.z))
      cam.hand = { key: hd.name, equip: hd.equip, swing: hd.swing, light: lightmap(Math.max(hs, hb)) }
      if (hasSprite) cam.hand.tex = `item/${hd.name}`
      else if (bl) {
        cam.hand.state = bl.defaultState
        if (!sentBlocks.has(bl.defaultState)) { sentBlocks.add(bl.defaultState); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [bl.defaultState, mesher.meshSingle(bl.defaultState)]) }
      }
      cam.dead = !!DEATHS.find(([a, b]) => t >= a && t < b)
    }
    // falling blocks (sand, anvils): the server sends their position about once a second, so the
    // recording hovers then jumps. Simulate vanilla's fall from where each appeared: gravity 0.04,
    // drag 0.98, stopping on a solid block.
    for (const e of ents) {
      if (e.name !== 'falling_block') continue
      const s0 = FALL_START.get(e.id); if (!s0) continue
      let y = s0.y, vy = s0.vy, landed = false
      const steps = Math.max(0, t - s0.t), whole = Math.floor(steps)
      for (let k = 0; k <= whole; k++) {   // whole ticks, then the fraction of the next (60 fps between 20 Hz ticks)
        const part = k < whole ? 1 : steps - whole
        if (part <= 0) break
        const nvy = (vy - 0.04) * 0.98
        const ny = y + nvy * part
        const below = mesher.world.getBlock(new Vec3(Math.floor(s0.x), Math.floor(ny), Math.floor(s0.z)))
        if (below && below.boundingBox === 'block' && Math.floor(ny) < Math.floor(y)) { y = Math.floor(y); landed = true; break }
        y = ny; if (part === 1) vy = nvy
      }
      e.x = s0.x; e.z = s0.z; e.y = Math.min(e.y, y)
    }
    // dropped items (ItemEntityRenderer): items with a flat sprite stay sprites; block items are a
    // quarter-size 3D block, bobbing sin(age/10)*0.1+0.1 and spinning age/20 rad
    for (const e of ents) {
      if (e.name !== 'item' || !e.extra || !e.extra.item) continue
      const it = e.extra.item
      if (fs.existsSync(path.join(ASSETS_DIR, 'env', 'item', `${it}.png`))) continue
      const bl = MC.blocksByName[it]
      if (!bl) continue
      const age = t - (FIRST_SEEN.get(e.id) ?? t)
      e.name = 'falling_block'
      e.y += Math.sin(age / 10 + (e.id % 7)) * 0.1 + 0.1 + 0.125
      e.yaw = age / 20 + (e.id % 7)
      e.extra = { state: bl.defaultState, scale: 0.25, spin: true }
    }
    // mobs made to face the player by command (tp facing entity <bot> eyes) between face_on and
    // face_off marks: the recorded entity yaw lags the server by seconds, so face them here
    for (const [fa, fb, which] of FACE) {
      if (t < fa || t >= fb) continue
      for (const e of ents) {
        if (which ? !((which.ids && which.ids.includes(e.id)) || (which.near && Math.hypot(e.x - which.near[0], e.z - which.near[1]) <= which.near[2])) : e.name !== 'villager') continue
        const dx = cam.x - e.x, dz = cam.z - e.z, dy = cam.y - (e.y + 1.62)
        e.yaw = Math.atan2(-dx, -dz); e.headYaw = e.yaw
        e.pitch = Math.atan2(dy, Math.hypot(dx, dz))
      }
    }
    // mobs never walk into the player: the server and client push overlapping entities apart, but
    // the bot (mineflayer) has no entity push, so a creeper could end up inside the camera. Keep
    // mobs at least their half width + the player's (0.3 + 0.3) plus a little, horizontally.
    for (const e of ents) {
      if (['falling_block', 'item', 'tnt', 'ender_pearl', 'snowball', 'egg', 'experience_orb'].includes(e.name)) continue
      const dx = e.x - cam.x, dz = e.z - cam.z, d = Math.hypot(dx, dz), min = 0.85
      if (d < min && d > 1e-6 && Math.abs(e.y - (cam.y - 1.62)) < 2) { e.x = cam.x + dx / d * min; e.z = cam.z + dz / d * min }
    }
    // creeper swelling (CreeperRenderer.scale): 30-tick fuse ending in its explosion
    for (const e of ents) {
      if (e.name !== 'creeper') continue
      const ex = EXPLOSIONS.find(x => x.t >= t && x.t - t <= 30 && Math.hypot(x.x - e.x, x.z - e.z) < 3)
      if (ex) e.swell = Math.min(1, Math.max(0, 1 - (ex.t - t) / 30))
    }
    // primed TNT (TntRenderer): the TNT block, white flash while (fuse / 5) % 2 == 0, swelling 30%
    // over the last 10 ticks. Fuse from when the entity appeared (80 ticks by default).
    for (const e of ents) {
      if (e.name !== 'tnt') continue
      const fuse = (TNT_FUSE[e.id] ?? 80) - (t - (FIRST_SEEN.get(e.id) ?? t))
      let k = fuse < 10 ? 1 - Math.max(0, fuse) / 10 : 0; k *= k; k *= k
      e.name = 'falling_block'
      e.extra = { state: TNT_STATE, flash: Math.floor(Math.max(0, fuse) / 5) % 2 === 0, scale: 1 + k * 0.3 }
    }
    for (const e of ents) {   // falling blocks: send each block type's mesh once
      if (e.name === 'falling_block' && e.extra && e.extra.state !== undefined && !sentBlocks.has(e.extra.state)) {
        sentBlocks.add(e.extra.state)
        await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [e.extra.state, mesher.meshSingle(e.extra.state)])
      }
    }
    await page.evaluate(([c, tick, e, pt]) => window.HB.frame(c, tick, e, pt), [cam, t, ents, partsAt(t, cam)])
    // let the compositor present the finished frame before capturing (else: tearing lines)
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    await page.screenshot({ path: `${outDir}/f${String(f).padStart(5, '0')}.png` })
    if (f % 60 === 0) console.log(`frame ${f}/${frames}`)
  }
  const secs = (Date.now() - t1) / 1000
  console.log(`rendered ${frames} frames (${(frames / FPS).toFixed(2)} s of video) in ${secs.toFixed(1)} s = ${(secs / (frames / FPS)).toFixed(1)} s per video second`)
  await browser.close(); server.close(); process.exit(0)
})()
