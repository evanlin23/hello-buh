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
const { lightmap, setBrightness, setDayTime, setDimension, particleTint, dayInfo } = require('./renderer/models')
const particles = require('./renderer/particles')
const { Vec3 } = require('vec3')

const [recPath, outDir, fpsArg, wArg, hArg] = process.argv.slice(2)
const FPS = Number(fpsArg || 60), W = Number(wArg || 1080), H = Number(hArg || 1011)
const EYE = 1.62
const rec = JSON.parse(fs.readFileSync(recPath))
// The stunt module's render options (hideHand, brightness, fovZoom, dimension, weather...). A stunt file that fails
// to load stops the render: swallowed, it rendered with a first-person hand, the default brightness and no zoom, and
// said nothing (pipeline test gap 11: a hand in every still of story_nitwit). STUNT_OPTIONAL=1 renders without it.
let STUNT_MOD = {}
// the stunt module carries render options (hideHand, brightness, fovZoom, dimension, weather...): a stunt that
// fails to load used to be skipped silently, and the render came out with a hand and the wrong light (story_nitwit
// stills 3). Exit 2, unless STUNT_OPTIONAL=1 (ALLOW_NO_STUNT=1 is the same) renders without its options, said loudly.
{
  const f = path.join(__dirname, 'stunts', `${rec.stunt}.js`)
  if (!rec.stunt || !fs.existsSync(f)) console.log(`render.js: no stunts/${rec.stunt}.js: rendering with the default options`)
  else {
    try { STUNT_MOD = require(f) } catch (e) {
      console.error(`\n*** render.js: stunts/${rec.stunt}.js failed to load, so its render options (hideHand, brightness, fovZoom...) would be lost ***\n${(e && e.stack || String(e)).split('\n').slice(0, 6).join('\n')}`)
      if (!process.env.STUNT_OPTIONAL && process.env.ALLOW_NO_STUNT !== '1') { console.error('*** stopping: fix the stunt (node -e "require(\'./stunts/' + rec.stunt + '\')"), or STUNT_OPTIONAL=1 to render without its options ***\n'); process.exit(2) }
      console.error('*** STUNT_OPTIONAL: rendering WITHOUT the stunt\'s options ***\n')
    }
  }
}
const FOV_ZOOM = []   // [startTick, endTick, scale] from stunt.fovZoom (see the frame loop)
for (const [sa, sb, sc] of STUNT_MOD.fovZoom || []) {
  const at = (spec) => { const [ev, off] = String(spec).split(':'); const e = (rec.timeline || []).find(m => m.event === ev); return e ? e.t / 50 + Number(off || 0) * 20 : null }
  const a0 = at(sa), b0 = at(sb)
  if (a0 !== null && b0 !== null && b0 > a0) FOV_ZOOM.push([a0, b0, Number(sc)])
}
setBrightness(process.env.BRIGHTNESS ?? STUNT_MOD.brightness ?? 0.5)   // the Brightness option (renderer/models.js)
// `hideHand: true`: no first-person hand or held item (vanilla F1), for narrators who aren't Steve
const HIDE_HAND = !!STUNT_MOD.hideHand
// F1 (hide GUI) between f1_on / f1_off marks: edit.py drops the HUD there, and vanilla F1 hides the
// hand too (worker 6, lapse_castle)
const F1 = []
{ let on = null; for (const e of rec.timeline || []) { if (e.event === 'f1_on' && on === null) on = e.t / 50; if (e.event === 'f1_off' && on !== null) { F1.push([on, e.t / 50]); on = null } } if (on !== null) F1.push([on, Infinity]) }
const P = rec.poses
// Dropped ticks in the recording: after a far teleport the bot's event loop can block on chunk
// decoding, physicsTicks bunch up and a pose repeats the one before it while the look is mid-turn
// (every_clutch: 3-frame freezes inside a fast easeLook). A run of 1-3 poses identical to the one before,
// with motion into the run and out of it, is filled in linearly from its neighbours. Holds (no motion on
// one side), cuts, respawns and teleport-sized steps are left alone.
{
  const cutT = new Set((rec.timeline || []).filter(e => e.event === 'cut' || e.event === 'respawn').map(e => Math.round(e.t / 50)))
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  const same = (a, b) => a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5]
  const step = (a, b) => Math.max(Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]), Math.abs(wrap(b[4] - a[4])), Math.abs(b[5] - a[5]))
  const near = (a, b) => Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) < 3
  let fixed = []
  for (let a = 2; a < P.length - 1; a++) {
    if (!same(P[a], P[a - 1])) continue
    let b = a; while (b + 1 < P.length && b - a < 3 && same(P[b + 1], P[a])) b++
    if (b - a >= 3 || b + 1 >= P.length) { a = b; continue }
    const p0 = P[a - 1], p1 = P[b + 1], pre = P[a - 2]
    let cut = false
    for (let k = P[a - 2][0]; k <= p1[0]; k++) if (cutT.has(k)) cut = true
    if (!cut && step(pre, p0) > 1e-3 && step(P[b], p1) > 1e-3 && near(p0, p1) && near(pre, p0)) {
      const n = b - a + 2
      for (let i = a; i <= b; i++) {
        const u = (i - a + 1) / n, q = P[i]
        q[1] = p0[1] + (p1[1] - p0[1]) * u; q[2] = p0[2] + (p1[2] - p0[2]) * u; q[3] = p0[3] + (p1[3] - p0[3]) * u
        q[4] = p0[4] + wrap(p1[4] - p0[4]) * u; q[5] = p0[5] + (p1[5] - p0[5]) * u
        fixed.push(q[0])
      }
    }
    a = b
  }
  if (fixed.length) console.log(`filled ${fixed.length} dropped pose tick(s): ${fixed.slice(0, 20).join(' ')}${fixed.length > 20 ? ' ...' : ''}`)
}
// client-side placement prediction: a stunt can mark('place', {x, y, z}) on the tick it uses an item
// on a block. The block change the server sends back 1-3 ticks later is moved to that tick, as
// BlockItem.place predicts on the client; an eye of ender is not predicted (EnderEyeItem.useOn returns
// early client-side), so it lands one tick after the use (worker 4, end_portal_job)
if (rec.blocks && rec.timeline) {
  const END_PORTAL_IDS = new Set()
  { const ep = require('minecraft-data')(rec.version).blocksByName.end_portal; if (ep) for (let i = ep.minStateId; i <= ep.maxStateId; i++) END_PORTAL_IDS.add(i) }
  for (const m of rec.timeline.filter(e => e.event === 'place' && Number.isFinite(e.x))) {
    // (an eye's frame update can reach the recording on the use tick itself: it showed before the
    // swing started; it goes in one tick after the use either way: worker 4, end_portal_job v7)
    const t0 = m.t / 50 + (m.eye ? 1 : 0), x = Math.floor(m.x), y = Math.floor(m.y), z = Math.floor(m.z)
    // every update of that block in the window: the server can send the same frame update twice (an
    // eye recorded frame, air above, frame again: the duplicate stayed on the use tick, worker 4)
    // (only updates to the same state as the first: a later break in the window stays where it was)
    let st = null
    for (const b of rec.blocks) {
      if (!(b[1] === x && b[2] === y && b[3] === z && (m.eye ? b[0] >= m.t / 50 : b[0] > t0) && b[0] <= t0 + 5)) continue
      if (st === null) st = b[4]
      if (b[4] === st) b[0] = Math.ceil(t0)
    }
    // the 12th eye opens the portal: the server builds the end_portal blocks in the same tick as that
    // frame's update, so they move with the eye (they opened 3 frames before it: worker 4)
    if (m.eye) {
      for (const b of rec.blocks) if (b[0] >= m.t / 50 && b[0] <= t0 + 5 && Math.abs(b[1] - x) <= 4 && Math.abs(b[3] - z) <= 4 && Math.abs(b[2] - y) <= 1 && END_PORTAL_IDS.has(b[4])) b[0] = Math.max(b[0], Math.ceil(t0))
    }
  }
  rec.blocks.sort((a, b) => a[0] - b[0])
}
// the dimension (harness: rec.dimension; DIMENSION= overrides): the Nether and the End light, sky and fog
const DIM = String(process.env.DIMENSION || rec.dimension || STUNT_MOD.dimension || 'overworld').replace(/^minecraft:/, '')
setDimension(DIM)

function lerpAngle (a, b, f) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * f }

// Vanilla view bobbing (GameRenderer.bobView): walkDist advances with horizontal movement on the
// ground; bob eases toward min(0.1, speed) on the ground and 0 in the air.
const bobState = []
{
  let walk = 0, bob = 0
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[i]
    // a teleport (a cut: over a block in one tick, faster than any sprint) moves the player without
    // move(), so vanilla adds no walkDist; counting it bobbed the view for a few ticks after every cut
    // and the whole frame swayed (worker 5, story_runaway f297-300, f939-942)
    let h = Math.hypot(b[1] - a[1], b[3] - a[3])
    if (h > 1) h = 0
    const onGround = Math.abs(b[2] - a[2]) < 1e-4
    walk += h * 0.6
    bob += ((onGround ? Math.min(0.1, h) : 0) - bob) * 0.4
    bobState.push({ walk, bob })
  }
}

// Entities by tick: Map(tick -> Map(id -> row)); rows are [tick, id, name, x, y, z, yaw, pitch, headYaw, extra]
const ENT = new Map()
for (const row of rec.entities || []) { if (!ENT.has(row[0])) ENT.set(row[0], new Map()); ENT.get(row[0]).set(row[1], row) }
// Pistons (PistonBaseBlock.moveBlocks / PistonMovingBlockEntity): the server never sends the
// moving_piston blocks (setBlock flag 68 hides them from clients); the client runs the move itself
// from the block event and slides each block in over 2 ticks, and the server's final blocks arrive
// 2-3 ticks after the event. Rebuild it from the block_action mark (a 0 extend / 1 retract, b the
// facing): every block change on the piston's line within 13 blocks and 5 ticks is a destination,
// sliding in from one block back along the move; the positions involved are cleared from the event
// tick until their final block lands, and a retracting head slides back into the base. Without
// this, pushed blocks sat still and then jumped (worker 17, chain reactions).
{
  const Block = require('prismarine-block')(rec.version)
  const nameOf = new Map()
  const nm = (id) => { if (!nameOf.has(id)) { let n = null; try { n = Block.fromStateId(id, 0).name } catch (e) {} nameOf.set(id, n) } return nameOf.get(id) }
  const DIRS = [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]]
  const FACES = ['down', 'up', 'north', 'south', 'west', 'east']
  const blocks = rec.blocks || []
  const extra = []
  let nid = -100000
  for (const act of (rec.timeline || []).filter(e => e.event === 'block_action' && (e.a === 0 || e.a === 1) && e.b >= 0 && e.b < 6)) {
    const t0 = Math.round(act.t / 50), d = DIRS[act.b]
    const near = blocks.filter(b => b[0] >= t0 && b[0] <= t0 + 5)
    const base = near.find(b => b[1] === act.x && b[2] === act.y && b[3] === act.z && /piston$/.test(nm(b[4]) || ''))
    if (!base) continue
    const sticky = nm(base[4]) === 'sticky_piston'
    const onLine = (b) => { const v = [b[1] - act.x, b[2] - act.y, b[3] - act.z]; const k = v[0] * d[0] + v[1] * d[1] + v[2] * d[2]; return k >= 1 && k <= 13 && v.every((c, q) => c === d[q] * k) }
    const dests = near.filter(b => onLine(b) && !/^(air|cave_air)$/.test(nm(b[4]) || ''))
    const m = act.a === 0 ? d : d.map(c => -c)
    const clear = new Set()
    const slide = (state, from, to, t1) => {
      const id = nid--
      for (let tk = t0; tk <= t1; tk++) {
        const f = Math.min(1, (tk - t0) / Math.max(1, Math.min(2, t1 - t0)))
        if (!ENT.has(tk)) ENT.set(tk, new Map())
        ENT.get(tk).set(id, [tk, id, 'moving_block', from[0] + (to[0] - from[0]) * f + 0.5, from[1] + (to[1] - from[1]) * f, from[2] + (to[2] - from[2]) * f + 0.5, 0, 0, null, { state }])
      }
    }
    for (const b of dests) {
      const to = [b[1], b[2], b[3]], from = to.map((c, q) => c - m[q])
      slide(b[4], from, to, b[0])
      clear.add(to.join(',')); if (!(from[0] === act.x && from[1] === act.y && from[2] === act.z)) clear.add(from.join(','))
    }
    if (act.a === 1) {   // the head slides back into the base
      let hs = null
      try { hs = Block.fromProperties('piston_head', { facing: FACES[act.b], short: false, type: sticky ? 'sticky' : 'normal' }, 0).stateId } catch (e) {}
      const hp = [act.x + d[0], act.y + d[1], act.z + d[2]]
      if (hs !== null) { slide(hs, hp, [act.x, act.y, act.z], base[0]); clear.add(hp.join(',')) }
    }
    // hide the blocks being moved from the event tick (their final blocks restore them)
    for (const k of clear) { const [x, y, z] = k.split(',').map(Number); extra.push([t0, x, y, z, 0]) }
  }
  // a stunt's block slide (lib/movie.js slideBlocks: a 'slide_blocks' mark, then one /clone ... move): the server moves
  // the blocks in one tick, so a sliding Well popped one block over, 2 px at 30 blocks (reel 1 review v2, B1). They
  // slide over `ticks` (eased) as moving_block entities; each destination's own update lands when its block arrives.
  for (const ev of (rec.timeline || []).filter(e => e.event === 'slide_blocks' && Array.isArray(e.blocks) && Array.isArray(e.by))) {
    const t0 = Math.round(ev.t / 50), n = Math.max(1, ev.ticks || 4), [mx, my, mz] = ev.by
    const MCD = require('minecraft-data')(rec.version)
    for (const [x, y, z, name] of ev.blocks) {
      const bl = MCD.blocksByName[String(name).replace(/^minecraft:/, '')]
      if (!bl) continue
      const id = nid--
      for (let tk = t0; tk <= t0 + n; tk++) {
        const u = (tk - t0) / n, f = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
        if (!ENT.has(tk)) ENT.set(tk, new Map())
        ENT.get(tk).set(id, [tk, id, 'moving_block', x + mx * f + 0.5, y + my * f, z + mz * f + 0.5, 0, 0, null, { state: bl.defaultState }])
      }
      for (const b of blocks) if (b[1] === x + mx && b[2] === y + my && b[3] === z + mz && b[0] >= t0 - 1 && b[0] <= t0 + 4) b[0] = t0 + n
      extra.push([t0, x, y, z, 0])   // the source is empty from the first tick of the slide
    }
  }
  if (extra.length || (rec.timeline || []).some(e => e.event === 'slide_blocks')) { rec.blocks = blocks.concat(extra).sort((a, b) => a[0] - b[0]) }
}
// The server sends mob moves every few ticks, so recorded positions are steps (a creeper "glided"
// in 0.4-block hops). The vanilla client eases toward each new position over 3 ticks
// (Entity.lerpTo / lerpSteps); do the same, per tick, before the per-frame interpolation.
{
  const cur = new Map()   // id -> { x, y, z, tx, ty, tz, steps }
  for (const tick of [...ENT.keys()].sort((a, b) => a - b)) {
    for (const [id, row] of ENT.get(tick)) {
      if (row[2] === 'falling_block' || row[2] === 'item' || row[2] === 'moving_block') continue
      let c = cur.get(id)
      if (!c || c.last !== tick - 1) c = { x: row[3], y: row[4], z: row[5], tx: row[3], ty: row[4], tz: row[5], steps: 0 }
      if (Math.hypot(row[3] - c.tx, row[4] - c.ty, row[5] - c.tz) > 4) { c.x = c.tx = row[3]; c.y = c.ty = row[4]; c.z = c.tz = row[5]; c.steps = 0 }   // teleport: no easing
      else if (row[3] !== c.tx || row[4] !== c.ty || row[5] !== c.tz) { c.tx = row[3]; c.ty = row[4]; c.tz = row[5]; c.steps = 3 }
      if (c.steps > 0) { c.x += (c.tx - c.x) / c.steps; c.y += (c.ty - c.y) / c.steps; c.z += (c.tz - c.z) / c.steps; c.steps-- }
      // rotation: lerpTo / lerpHeadTo ease yaw and head yaw over the same 3 steps (wrapped), so a
      // /tp ... facing half turn reads over 3 ticks instead of snapping (worker 5, story_runaway f393)
      const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
      if (c.yaw === undefined || c.last !== tick - 1) { c.yaw = c.tyaw = row[6]; c.ysteps = 0; c.head = c.thead = row[8]; c.hsteps = 0 }
      if (row[6] !== c.tyaw) { c.tyaw = row[6]; c.ysteps = 3 }
      if (c.ysteps > 0) { c.yaw += wrap(c.tyaw - c.yaw) / c.ysteps; c.ysteps-- }
      if (row[8] !== null && row[8] !== undefined) {
        if (c.head === null || c.head === undefined) c.head = c.thead = row[8]
        if (row[8] !== c.thead) { c.thead = row[8]; c.hsteps = 3 }
        if (c.hsteps > 0) { c.head += wrap(c.thead - c.head) / c.hsteps; c.hsteps-- }
      }
      c.last = tick; cur.set(id, c)
      const r = row.slice(); r[3] = c.x; r[4] = c.y; r[5] = c.z; r[6] = c.yaw; if (row[8] !== null && row[8] !== undefined) r[8] = c.head; ENT.get(tick).set(id, r)
    }
  }
}
// Dropped items: the server syncs an item's position only every ~20 ticks (ItemEntity is client-
// simulated in vanilla), so the recording holds each item still, then jumps. Between two synced
// positions (under 2 s apart, under 8 blocks), move it smoothly: a straight line plus the arc a
// thrown item makes (gravity 0.04/tick) when it went up then down, instead of freeze-and-jump.
{
  const keys = new Map()   // id -> [[tick, x, y, z]] where the position changed
  for (const tick of [...ENT.keys()].sort((a, b) => a - b)) {
    for (const [id, row] of ENT.get(tick)) {
      if (row[2] !== 'item') continue
      if (!keys.has(id)) keys.set(id, [])
      const k = keys.get(id), last = k[k.length - 1]
      if (!last || last[1] !== row[3] || last[2] !== row[4] || last[3] !== row[5]) k.push([tick, row[3], row[4], row[5]])
    }
  }
  for (const [id, k] of keys) {
    for (let i = 0; i + 1 < k.length; i++) {
      const [t0, x0, y0, z0] = k[i], [t1, x1, y1, z1] = k[i + 1], n = t1 - t0
      if (n <= 1 || n > 40 || Math.hypot(x1 - x0, y1 - y0, z1 - z0) > 8) continue
      // coming down (a drop from a broken block, Block.popResource): vanilla's ItemEntity goes up at
      // ~0.2 a tick, gravity 0.04, drag 0.98, about half a block, then rests where the next sync puts
      // it. The old fixed arc 0.02 * a * (n - a) peaked ~2 blocks high on a 20-tick sync gap.
      const ys = []
      let land = -1
      if (y1 < y0 - 0.1) {
        let y = y0, vy = 0.2
        for (let k = 1; k < n; k++) { vy -= 0.04; y += vy; vy *= 0.98; if (vy < 0 && y <= y1) { y = y1; if (land < 0) land = k } ys.push(land >= 0 ? y1 : y) }
      }
      for (let tt = t0 + 1; tt < t1; tt++) {
        const row = ENT.get(tt) && ENT.get(tt).get(id); if (!row) continue
        const k = tt - t0, f = k / n
        const r = row.slice()
        if (land > 0) { const h = Math.min(1, k / land); r[3] = x0 + (x1 - x0) * h; r[4] = ys[k - 1]; r[5] = z0 + (z1 - z0) * h } else { r[3] = x0 + (x1 - x0) * f; r[4] = y0 + (y1 - y0) * f; r[5] = z0 + (z1 - z0) * f }
        ENT.get(tt).set(id, r)
      }
    }
  }
}
// entity heights (EntityType sizes) for the light probe at the eye
const ENT_H = { zombie: 1.95, husk: 1.95, drowned: 1.95, zombie_villager: 1.95, skeleton: 1.99, stray: 1.99, wither_skeleton: 2.4, creeper: 1.7, villager: 1.95, wandering_trader: 1.95, witch: 1.95, pillager: 1.95, vindicator: 1.95, evoker: 1.95, enderman: 2.9, iron_golem: 2.7, snow_golem: 1.9, cow: 1.4, mooshroom: 1.4, sheep: 1.3, pig: 0.9, goat: 1.3, chicken: 0.7, spider: 0.9, cave_spider: 0.5, wolf: 0.85, cat: 0.7, ocelot: 0.7, fox: 0.7, rabbit: 0.5, horse: 1.6, donkey: 1.5, mule: 1.6, llama: 1.87, camel: 2.375, polar_bear: 1.4, panda: 1.25, warden: 2.9, blaze: 1.8, bee: 0.6, frog: 0.55, axolotl: 0.42, turtle: 0.4, parrot: 0.9, allay: 0.6, sniffer: 1.75, armadillo: 0.65, piglin: 1.95, zombified_piglin: 1.95, hoglin: 1.4, strider: 1.7, player: 1.9, mannequin: 1.9 }
function entitiesAt (t, mesher) {
  const i = Math.floor(t), f = t - i
  const a = ENT.get(i) || new Map(), b = ENT.get(i + 1) || a
  const out = []
  for (const [id, ra] of a) {
    let rb = b.get(id) || ra
    if (Math.hypot(rb[3] - ra[3], rb[4] - ra[4], rb[5] - ra[5]) > 4) rb = ra   // teleport: hold, then snap on the next tick
    const L = (k) => ra[k] + (rb[k] - ra[k]) * f
    const pos = { x: L(3), y: L(4), z: L(5) }
    // EntityRenderer.getPackedLightCoords samples at getLightProbePosition = the eye (0.85 x height
    // for most mobs). At the feet (+0.5), a bear stepping onto a torch's block read light 14 there
    // (whiter, lightmap.fsh) instead of 13 at its eye: the colour popped (worker 13, guess_sound f953)
    const hh = ENT_H[ra[2]]
    const cell = new Vec3(Math.floor(pos.x), Math.floor(pos.y + (hh ? hh * 0.85 : 0.5)), Math.floor(pos.z))
    const inBlock = mesher.world.getBlock(cell)
    // primed TNT (and a falling block) can arrive a tick before its block is removed: the block still
    // shows, so skip the entity; drawn over it, it z-fought in black and white (tnt_1000 f459)
    if (inBlock && ((ra[2] === 'tnt' && inBlock.name === 'tnt') || ((ra[2] === 'falling_block' || ra[2] === 'moving_block') && ra[9] && inBlock.stateId === ra[9].state))) continue
    let [sky, blk] = mesher.world.getLight(cell)
    // a cell that is still solid (or not yet relit) reads light 0: take the brightest neighbour
    if (inBlock && inBlock.boundingBox === 'block' && sky === 0 && blk === 0) {
      for (const [dx, dy, dz] of [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
        const [s2, b2] = mesher.world.getLight(cell.offset(dx, dy, dz)); sky = Math.max(sky, s2); blk = Math.max(blk, b2)
      }
    }
    // BlazeRenderer / MagmaCubeRenderer.getBlockLightLevel: always 15 (they glow in the dark)
    if (ra[2] === 'blaze' || ra[2] === 'magma_cube' || ra[2] === 'allay' || ra[2] === 'vex') blk = 15   // (AllayRenderer / VexRenderer too)
    out.push({ id, name: ra[2], ...pos, yaw: lerpAngle(ra[6], rb[6], f), pitch: L(7), headYaw: ra[8] === null ? null : lerpAngle(ra[8], rb[8] ?? ra[8], f), extra: ra[9], light: lightmap(sky, blk) })
  }
  return out
}

// Death, as the vanilla client shows it in first person (GameRenderer.bobHurt + Pose.DYING):
// the eye stays at 1.62 (the dying pose keeps the eye height), the view rolls by
// 40 - 8000/(deathTime + 200) degrees (0 -> 3.6 over a second), and the body keeps its
// physics (it falls, or sinks in lava/water) until the respawn. mineflayer teleports the bot to
// the respawn point the same tick, so the camera is simulated from the death pose on.
// first tick each entity was seen (TNT fuse timing) and the TNT block state
// a thrown potion's colour: the splash (LevelEvent 2002) it makes where it was last seen
const POTION_COLOR = new Map()
{
  const last = new Map()
  for (const r of rec.entities || []) if (/^(splash|lingering)_potion$/.test(r[2])) last.set(r[1], r)
  const splashes = (rec.timeline || []).filter(e => e.event === 'particles' && e.type === 'potion')
  for (const [id, r] of last) {
    const sp = splashes.find(e => e.t / 50 >= r[0] - 1 && e.t / 50 <= r[0] + 4 && Math.hypot(e.x - r[3], e.z - r[5]) < 3)
    if (sp && typeof sp.color === 'number') POTION_COLOR.set(id, sp.color & 0xFFFFFF)
  }
}
const FIRST_SEEN = new Map()
for (const r of rec.entities || []) if (!FIRST_SEEN.has(r[1])) FIRST_SEEN.set(r[1], r[0])
// Lightning (LightningBoltRenderer, drawn by the page): lightning_bolt entities while they exist, and
// `lightning` marks {x, y, z, ticks?} for a stunt's own bolt (default 6 ticks). Storms had the thunder
// sound only (worker 18). The sky flashes while a bolt is out (ClientLevel.skyFlashTime 2, fading
// over the next 2 ticks).
const BOLTS = []
{
  const span = new Map()
  for (const r of rec.entities || []) if (r[2] === 'lightning_bolt') { const s0 = span.get(r[1]); if (!s0) span.set(r[1], { a: r[0], b: r[0] + 1, x: r[3], y: r[4], z: r[5], seed: r[1] }); else s0.b = r[0] + 1 }
  BOLTS.push(...span.values())
  for (const e of rec.timeline || []) if (e.event === 'lightning' && Number.isFinite(e.x)) BOLTS.push({ a: e.t / 50, b: e.t / 50 + (e.ticks || 6), x: e.x, y: e.y, z: e.z, seed: Math.round(e.t) })
}
function boltsAt (t) {
  const bolts = BOLTS.filter(b => t >= b.a && t < b.b).map(b => ({ x: b.x, y: b.y, z: b.z, seed: b.seed }))
  let flash = 0
  for (const b of BOLTS) if (t >= b.a) flash = Math.max(flash, t < b.b ? 1 : Math.min(1, Math.max(0, b.b + 2 - t)))
  return { bolts, flash: flash * 0.45 }
}
const TNT_FUSE = {}   // fuse when first seen (chain-lit TNT gets 10-30 ticks, a lit one 80)
for (const r of rec.entities || []) if (r[2] === 'tnt' && r[9] && r[9].fuse !== undefined && TNT_FUSE[r[1]] === undefined && FIRST_SEEN.get(r[1]) === r[0]) TNT_FUSE[r[1]] = r[9].fuse
const TNT_STATE = require('minecraft-data')(rec.version).blocksByName.tnt.defaultState
const MC = require('minecraft-data')(rec.version)
const FALL_START = new Map()   // falling_block id -> where it appeared
for (const r of rec.entities || []) if (r[2] === 'falling_block' && !FALL_START.has(r[1])) FALL_START.set(r[1], { t: r[0], x: r[3], y: r[4], z: r[5], vy: 0 })
const FACE = []
const PRE_FACE = new Map()   // entity id -> [tick, yaw, headYaw, pitch] last seen outside a face_on window
// [start tick, end tick, which]: which = { ids: [...] } or { near: [x, z, r] } from the face_on mark,
// or null for every villager (older recordings)
{ let a = null; for (const e of rec.timeline || []) { if (e.event === 'face_on') a = [e.t / 50, e.ids || e.near ? { ids: e.ids, near: e.near, head: e.head } : null]; if (e.event === 'face_off' && a !== null) { FACE.push([a[0], e.t / 50, a[1]]); a = null } } if (a !== null) FACE.push([a[0], Infinity, a[1]]) }
// mobs hit and killed (harness mob_hurt / mob_death marks): the red flash lasts 10 ticks
// (hurtTime), the death animation runs from the death on (deathTime, removed at 20)
const MOB_HURT = new Map(), MOB_DEATH = new Map()
for (const e of rec.timeline || []) {
  if (e.event === 'mob_hurt') { if (!MOB_HURT.has(e.id)) MOB_HURT.set(e.id, []); MOB_HURT.get(e.id).push(e.t / 50) }
  if (e.event === 'mob_death' && !MOB_DEATH.has(e.id)) MOB_DEATH.set(e.id, e.t / 50)
}
// EntityRenderer.shadowRadius per renderer (vanilla); slimes x size, babies x 0.5, boats 0.8
const SHADOW_R = { player: 0.5, villager: 0.5, wandering_trader: 0.5, zombie: 0.5, zombie_villager: 0.5, husk: 0.5, drowned: 0.5, skeleton: 0.5, stray: 0.5, wither_skeleton: 0.7, creeper: 0.5, enderman: 0.5, witch: 0.5, pillager: 0.5, vindicator: 0.5, evoker: 0.5, cow: 0.7, mooshroom: 0.7, sheep: 0.7, pig: 0.7, goat: 0.7, chicken: 0.3, iron_golem: 0.7, snow_golem: 0.5, spider: 0.8, cave_spider: 0.7, wolf: 0.5, cat: 0.4, ocelot: 0.4, fox: 0.4, rabbit: 0.3, horse: 0.75, donkey: 0.75, mule: 0.75, skeleton_horse: 0.75, zombie_horse: 0.75, llama: 0.7, camel: 0.7, slime: 0.25, magma_cube: 0.25, blaze: 0.5, warden: 0.9, bee: 0.4, panda: 0.9, polar_bear: 0.9, frog: 0.3, axolotl: 0.3, turtle: 0.7, item: 0.15, tnt: 0.5, falling_block: 0.5, armor_stand: 0.0 }
const EXPLOSIONS = (rec.timeline || []).filter(e => e.event === 'particles' && e.type === 'explosion').map(e => ({ t: e.t / 50, x: e.x, y: e.y, z: e.z }))
// per creeper with recorded swell data: Creeper.tick's swell counter per tick (0..30)
const CREEPER_SWELL = new Map()
{
  const ids = new Set((rec.entities || []).filter(r => r[2] === 'creeper' && r[9] && (r[9].swellDir !== undefined || r[9].ignited)).map(r => r[1]))
  const last = Math.max(0, ...[...ENT.keys()])
  for (const id of ids) {
    const out = []; let sw = 0, dir = -1
    for (let tk = 0; tk <= last + 1; tk++) {
      const row = ENT.get(tk) && ENT.get(tk).get(id)
      if (row) dir = row[9] && (row[9].ignited || row[9].swellDir === 1) ? 1 : -1
      sw = Math.max(0, Math.min(30, sw + dir)); out.push(sw)
    }
    CREEPER_SWELL.set(id, out)
  }
}
const ASSETS_DIR = path.join(__dirname, 'work', 'assets', rec.version)
// Held item over time: hotbar contents + selected slot from the timeline, the tick the held item last
// changed (equip animation) and the arm swings (6-tick attack animation).
const HELD = []          // [tick, itemName|null]
const GLINTS = []        // [tick, glint] for the selected stack
let curGlint = false
// items that always shine (enchantment_glint_override in their default components)
const GLINT_ITEMS = new Set(['enchanted_golden_apple', 'experience_bottle', 'nether_star', 'enchanted_book', 'end_crystal', 'debug_stick', 'written_book'])
const SWINGS = []
{
  let items = null, slot = 0, cur
  for (const e of rec.timeline || []) {
    if (e.event === 'hotbar') items = e.items
    if (e.slot !== undefined) slot = e.slot
    // LivingEntity.swing: a new swing restarts the animation only once the current one is at least
    // half done (3 of 6 ticks); a swing every tick (block placing) used to strobe the hand
    if (e.event === 'swing' && !(SWINGS.length && e.t / 50 - SWINGS[SWINGS.length - 1] < 3)) SWINGS.push(e.t / 50)
    if (!items) continue
    const it = items[slot], name = it ? (Array.isArray(it) ? it[0] : it) : null
    if (name !== cur) { HELD.push([e.t / 50, name]); cur = name }
    const g = !!(it && ((Array.isArray(it) && it[2]) || GLINT_ITEMS.has(name)))
    if (g !== curGlint) { GLINTS.push([e.t / 50, g]); curGlint = g }
  }
}
// A bucket use swings the arm (BucketItem.use succeeds and the client swings), but mineflayer's
// activateItem sends no swing, so recordings only had one when the stunt called swingArm (worker 3).
// The held stack turning from a bucket to a filled one or back, in the same slot, is a use: swing on
// that tick unless a swing mark is already within 3 ticks.
{
  const BUCKET = /^(bucket|water_bucket|lava_bucket|powder_snow_bucket|milk_bucket|(cod|salmon|pufferfish|tropical_fish|axolotl|tadpole)_bucket)$/
  let items = null, slot = 0, prev = null, prevSlot = null
  const add = []
  for (const e of rec.timeline || []) {
    if (e.event === 'hotbar') items = e.items
    if (e.slot !== undefined) slot = e.slot
    if (!items) continue
    const it = items[slot], name = it ? (Array.isArray(it) ? it[0] : it) : null
    if (e.event === 'hotbar' && slot === prevSlot && name !== prev && BUCKET.test(name || '') && BUCKET.test(prev || '') && (name === 'bucket' || prev === 'bucket') && name !== 'milk_bucket') {
      const t = e.t / 50
      if (!SWINGS.some(s => Math.abs(s - t) < 3) && !add.some(s => Math.abs(s - t) < 3)) add.push(t)
    }
    prev = name; prevSlot = slot
  }
  if (add.length) { SWINGS.push(...add); SWINGS.sort((a, b) => a - b) }
}
// the held stack's enchantment glint over time (hotbar entries [name, count, 1] are enchanted)
function glintAt (t) { let g = false; for (const [a, v] of GLINTS) if (a <= t) g = v; return g }
// Equip animation, per tick like ItemInHandRenderer.tick: the shown item's height moves toward 1
// (shown == wanted) or 0 (a different item wanted) by at most 0.4 a tick, and the shown item only
// swaps once the height is under 0.1. So the old item lowers, then the new one rises (instead of
// the old one vanishing and the hand sitting empty for 6 frames: frame review, speed_build).
const HAND = []          // per tick: [shownItem, height]
{
  const last = Math.ceil((rec.poses && rec.poses.length ? rec.poses[rec.poses.length - 1][0] : 0)) + 2
  let shown = HELD.length ? HELD[0][1] : null, h = 1, k = 0, want = shown
  // a respawn is a new player: the hand comes up fresh with the current item (no lowering of the
  // previous life's item first: worker 3, tries f717)
  const RESP = (rec.timeline || []).filter(e => e.event === 'respawn').map(e => Math.ceil(e.t / 50))
  let lastResp = -Infinity, respWant = null
  for (let tick = 0; tick <= last; tick++) {
    while (k < HELD.length && HELD[k][0] <= tick) want = HELD[k++][1]
    // the respawned player's inventory can arrive a tick or two after the respawn mark (an /item
    // replace at the death): for 3 ticks after a respawn the hand wants what is held at its end, so
    // the fresh hand comes up with that item, no lower-and-raise of the old life's (worker 3, tries
    // f678: empty bucket -> water bucket)
    if (RESP.includes(tick)) { h = 0; lastResp = tick; respWant = want; for (let j = k; j < HELD.length && HELD[j][0] <= tick + 3; j++) respWant = HELD[j][1]; shown = respWant }
    const w = tick - lastResp <= 3 ? respWant : want
    h += Math.max(-0.4, Math.min(0.4, (shown === w ? 1 : 0) - h))
    if (h < 0.1) shown = w
    HAND.push([shown, h])
  }
}
// eating / drinking (harness use_start / use_stop marks): [startTick, stopTick, useDuration]
const EAT_ITEMS = /^(.*_stew|.*_soup|apple|golden_apple|enchanted_golden_apple|bread|.*cookie|cake|melon_slice|.*carrot|.*potato|beetroot|.*_beef|.*_porkchop|.*_mutton|.*_chicken|.*_rabbit|.*_cod|.*_salmon|tropical_fish|pufferfish|sweet_berries|glow_berries|dried_kelp|chorus_fruit|pumpkin_pie|rotten_flesh|spider_eye|poisonous_potato|suspicious_stew|potion|milk_bucket|honey_bottle|ominous_bottle)$/
const USES = []
{
  let open = null
  for (const e of rec.timeline || []) {
    if (e.event === 'use_start') open = e.t / 50
    if ((e.event === 'use_stop' || e.event === 'death') && open !== null) { USES.push([open, e.t / 50]); open = null }
  }
  if (open !== null) USES.push([open, Infinity])
}
function useAt (t, name) {
  if (!name || !EAT_ITEMS.test(name)) return null
  const u = USES.find(([a, b]) => t >= a && t < b)
  if (!u) return null
  return { e: t - u[0], d: name === 'honey_bottle' ? 40 : name === 'dried_kelp' ? 16 : 32 }
}
function handAt (t) {
  if (!HAND.length) return null
  const i = Math.max(0, Math.min(HAND.length - 2, Math.floor(t))), f = Math.min(1, Math.max(0, t - i))
  const [name, h0] = HAND[i], h1 = HAND[i + 1][1]
  const h = HAND[i + 1][0] === name ? h0 + (h1 - h0) * f : h0
  let swing = 0
  // a death or respawn makes a new player entity, which starts at rest: no swing carries over (tries)
  const reset = DEATHS.reduce((m, [a, b]) => Math.max(m, a <= t ? a : -1, b <= t ? b : -1), -1)
  for (const s of SWINGS) if (s <= t && t - s < 6 && s >= reset) swing = (t - s) / 6
  return { name, equip: 1 - h, swing }
}
// Digging (from the harness's block_dig marks): [startTick, endTick, x, y, z, digTicks]. The client
// shows destroy_stage_(floor(progress * 10) - 1) on the block, like LevelRenderer.destroyBlockProgress.
const DIGS = []
{
  let cur = null
  for (const e of rec.timeline || []) {
    // (a stunt's own 'dig' mark without coordinates isn't a dig: it opened a window to Infinity that hid every crack: fortune)
    if (e.event === 'dig' && e.x !== undefined) { if (cur) DIGS.push(cur); cur = [e.t / 50, Infinity, e.x, e.y, e.z, Math.max(1, e.ms / 50)] }
    if (e.event === 'dig_end' && cur) {
      cur[1] = e.t / 50
      // a finished dig reaches stage 9 when the block breaks: bot.digTime's estimate can be far off (4550 ms
      // for a 600 ms break: fortune ores 2-8 stayed at stage 0). Older recordings have no ok flag: a
      // dig_end before the estimate is almost always the break
      if (e.ok !== false) cur[5] = Math.max(1, Math.min(cur[5], cur[1] - cur[0]))
      DIGS.push(cur); cur = null
    }
  }
  if (cur) DIGS.push(cur)
}
const ATLAS_UV = (() => { try { const a = JSON.parse(fs.readFileSync(path.join(__dirname, 'work', 'assets', rec.version, 'atlas.json'))); return a.textures || a } catch (e) { return {} } })()
// the block under the crosshair within reach (4.5, survival): vanilla outlines it in black
// hitbox [width, height] of mobs that can be targeted (EntityType sizes); an entity under the crosshair
// within the 3-block entity reach is the target, and vanilla draws no outline for it
const HITBOX = { villager: [0.6, 1.95], zombie: [0.6, 1.95], zombie_villager: [0.6, 1.95], skeleton: [0.6, 1.99], creeper: [0.6, 1.7], cow: [0.9, 1.4], sheep: [0.9, 1.3], pig: [0.9, 0.9], chicken: [0.4, 0.7], iron_golem: [1.4, 2.7], enderman: [0.6, 2.9], spider: [1.4, 0.9], wandering_trader: [0.6, 1.95], witch: [0.6, 1.95] }
// outline shapes (Block.getShape) where they differ from the collision shape: fences, walls and
// gates outline 1 block tall (their collision is 1.5), and blocks you walk through still get targeted
// and outlined: crops by age, plants, torches (a ray used to pass through wheat and outline the
// fence behind it, 1.5 tall: worker 5, story_runaway)
const px16 = (a, b, c, d, e, f) => [[a / 16, b / 16, c / 16, d / 16, e / 16, f / 16]]
function outlineShape (b) {
  const n = b.name, pr = (b.getProperties && b.getProperties()) || {}
  if (/(_fence|_wall|_fence_gate)$/.test(n) && b.shapes && b.shapes.length) return b.shapes.map(q => [q[0], q[1], q[2], q[3], Math.min(1, q[4]), q[5]])
  if (b.shapes && b.shapes.length) return null
  const age = Number(pr.age || 0)
  if (/^(wheat|carrots|potatoes)$/.test(n)) return px16(0, 0, 0, 16, (age + 1) * 2, 16)
  if (n === 'beetroots') return px16(0, 0, 0, 16, (age + 1) * 2, 16)
  if (/^(short_grass|fern|dead_bush|short_dry_grass)$/.test(n)) return px16(2, 0, 2, 14, 13, 14)
  if (/^(tall_grass|large_fern|tall_dry_grass)$/.test(n)) return px16(2, 0, 2, 14, 16, 14)
  if (/_sapling$/.test(n)) return px16(2, 0, 2, 14, 12, 14)
  if (/^(dandelion|poppy|blue_orchid|allium|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|torchflower|open_eyeblossom|closed_eyeblossom)$|_tulip$/.test(n)) return px16(5, 0, 5, 11, 10, 11)
  if (/^(torch|soul_torch|redstone_torch|copper_torch)$/.test(n)) return px16(6, 0, 6, 10, 10, 10)
  if (/^(sunflower|lilac|rose_bush|peony)$/.test(n)) return px16(0, 0, 0, 16, 16, 16)
  if (n === 'sugar_cane') return px16(2, 0, 2, 14, 16, 14)
  return null
}
function targetBlock (cam, world, ents = []) {
  const d = { x: -Math.sin(cam.yaw) * Math.cos(cam.pitch), y: Math.sin(cam.pitch), z: -Math.cos(cam.yaw) * Math.cos(cam.pitch) }
  const v = new Vec3(0, 0, 0)
  const mobs = ents.filter(e => HITBOX[e.name] && !e.hidden)
  for (let s = 0.05; s <= 4.5; s += 0.05) {
    if (s <= 3.0) {
      const qx = cam.x + d.x * s, qy = cam.y + d.y * s, qz = cam.z + d.z * s
      for (const e of mobs) {
        const [w, h] = HITBOX[e.name]
        if (Math.abs(qx - e.x) <= w / 2 && Math.abs(qz - e.z) <= w / 2 && qy >= e.y && qy <= e.y + h) return { entity: e.id }
      }
    }
    v.x = Math.floor(cam.x + d.x * s); v.y = Math.floor(cam.y + d.y * s); v.z = Math.floor(cam.z + d.z * s)
    const b = world.getBlock(v)
    if (!b || /^(air|cave_air|void_air|water|lava|light|bubble_column)$/.test(b.name)) continue
    let sh = outlineShape(b) || (b.shapes && b.shapes.length ? b.shapes : null)
    if (!sh && b.name === 'nether_portal') {   // no collision, but vanilla outlines its slab-shaped outline shape
      const ax = (b.getProperties && b.getProperties().axis) || 'x'
      sh = [ax === 'z' ? [0.375, 0, 0, 0.625, 1, 1] : [0, 0, 0.375, 1, 1, 0.625]]
    }
    if (!sh) continue
    const box = [Math.min(...sh.map(q => q[0])), Math.min(...sh.map(q => q[1])), Math.min(...sh.map(q => q[2])), Math.max(...sh.map(q => q[3])), Math.max(...sh.map(q => q[4])), Math.max(...sh.map(q => q[5]))]
    const px = cam.x + d.x * s - v.x, py = cam.y + d.y * s - v.y, pz = cam.z + d.z * s - v.z
    if (px < box[0] - 0.01 || px > box[3] + 0.01 || py < box[1] - 0.01 || py > box[4] + 0.01 || pz < box[2] - 0.01 || pz > box[5] + 0.01) continue
    return { x: v.x, y: v.y, z: v.z, box }
  }
  return null
}
// Time of day: the recording's start time (harness: stunt.time, default noon) and `time` marks
// (ctx.setTime) - [tick, dayTime]. A change re-lights the whole world (the lightmap's sky factor).
const TIMES = [[0, rec.time ?? 6000], ...(rec.timeline || []).filter(e => e.event === 'time').map(e => [e.t / 50, e.time])]
// (DAY_TIME=n renders the whole recording at that time of day: try a look or the shadows at another hour)
const dayTimeAt = (t) => { if (process.env.DAY_TIME) return Number(process.env.DAY_TIME); let v = TIMES[0][1]; for (const [a, d] of TIMES) if (t >= a) v = d; return v }
// Weather (Level.getRainLevel / getThunderLevel): the recording's start weather (harness: stunt.weather)
// and `weather` marks (ctx.setWeather); the client moves each level 0.01 a tick toward its target.
// WEATHER=clear|rain|thunder overrides the whole recording.
const RAIN = [], THUNDER = []
{
  const w0 = DIM !== 'overworld' ? 'clear' : (process.env.WEATHER || rec.weather || STUNT_MOD.weather || 'clear')
  // a mark with `cut: true` lands the new weather at once (a montage cut to another day: not a 5 s fade on screen)
  const marks = process.env.WEATHER ? [] : (rec.timeline || []).filter(e => e.event === 'weather').map(e => [e.t / 50, e.weather, !!e.cut])
  let r = w0 !== 'clear' ? 1 : 0, th = w0 === 'thunder' ? 1 : 0, w = w0, k = 0
  for (let i = 0; i <= P.length + 2; i++) {
    while (k < marks.length && marks[k][0] <= i) { w = marks[k][1]; if (marks[k][2]) { r = w !== 'clear' ? 1 : 0; th = w === 'thunder' ? 1 : 0 } k++ }
    if (i > 0) { r = Math.max(0, Math.min(1, r + (w !== 'clear' ? 0.01 : -0.01))); th = Math.max(0, Math.min(1, th + (w === 'thunder' ? 0.01 : -0.01))) }
    RAIN.push(r); THUNDER.push(th)
  }
}
const levelAt = (A, t) => { const i = Math.max(0, Math.min(A.length - 2, Math.floor(t))), f = Math.min(1, Math.max(0, t - i)); return A[i] + (A[i + 1] - A[i]) * f }
// the lightmap's sky darkening follows the rain in 1/16 steps (each step re-lights the whole world)
const weatherLight = (t) => [Math.round(levelAt(RAIN, t) * 16) / 16, Math.round(levelAt(THUNDER, t) * 16) / 16]
const weatherKey = (t) => `${Math.round(levelAt(RAIN, t) * 16)},${Math.round(levelAt(THUNDER, t) * 16)}`
setDayTime(dayTimeAt(0), ...weatherLight(0))
// LevelRenderer rain: columns within 10 blocks (fancy) of the camera, from the MOTION_BLOCKING
// heightmap up to camera + 10, a texture that scrolls per column, and splash particles where drops land.
const HMAP = new Map()
let hmapWorld = null
function motionBlockingY (x, z) {
  const key = `${x},${z}`
  if (HMAP.has(key)) return HMAP.get(key)
  let y = 319, out = -64
  const v = new Vec3(x, 0, z)
  for (; y > -64; y--) {
    v.y = y
    const b = hmapWorld.getBlock(v)
    if (!b || b.name === 'air' || b.name === 'cave_air' || b.name === 'void_air') continue
    if (b.boundingBox === 'block' || b.name === 'water' || b.name === 'lava' || /_leaves$/.test(b.name) || (b.getProperties && b.getProperties().waterlogged)) { out = y + 1; break }
  }
  const bio = hmapWorld.getBlock(new Vec3(x, Math.max(-63, out), z))
  const bd = bio && bio.biome && MC.biomesByName[bio.biome.name]
  const r = { y: out, rain: !bd || bd.has_precipitation !== false, snow: !!(bd && bd.temperature < 0.15), top: bio }
  HMAP.set(key, r)
  return r
}
// java.util.Random (LegacyRandomSource) nextFloat, for the per-column streak speed
const JRAND = new Map()
function columnRand (x, z) {
  const key = `${x},${z}`
  if (JRAND.has(key)) return JRAND.get(key)
  const seed32 = ((Math.imul(Math.imul(x, x), 3121) + Math.imul(x, 45238971)) | 0) ^ ((Math.imul(Math.imul(z, z), 418711) + Math.imul(z, 13761)) | 0)
  const M = (1n << 48n) - 1n
  let sd = (BigInt(seed32) ^ 0x5DEECE66Dn) & M
  const next = (bits) => { sd = (sd * 0x5DEECE66Dn + 0xBn) & M; return Number(sd >> BigInt(48 - bits)) }
  const f = [next(24) / (1 << 24), next(24) / (1 << 24), next(24) / (1 << 24)]
  const j = (Math.imul(Math.imul(x, x), 3121) + Math.imul(x, 45238971) + Math.imul(Math.imul(z, z), 418711) + Math.imul(z, 13761)) & 255
  const out = { f, j }
  JRAND.set(key, out)
  return out
}
function weatherColumns (cam, t, rain) {
  if (rain <= 0) return null
  const R = 10, cx = Math.floor(cam.x), cy = Math.floor(cam.y), cz = Math.floor(cam.z), out = []
  const ticks = Math.floor(t), part = t - ticks
  for (let z = cz - R; z <= cz + R; z++) {
    for (let x = cx - R; x <= cx + R; x++) {
      const h = motionBlockingY(x, z)
      if (!h.rain) continue
      const bottom = Math.max(cy - R, h.y), top = Math.max(cy + R, h.y)
      if (top === bottom) continue
      const dx = x + 0.5 - cam.x, dz = z + 0.5 - cam.z, d2 = dx * dx + dz * dz
      const { f, j } = columnRand(x, z)
      const [ls, lb] = hmapWorld.getLight(new Vec3(x, Math.max(cy, h.y), z))
      let u = 0, v, a
      if (h.snow) {   // snow: slow fall (512 ticks per texture), a slight per-column drift
        v = -((ticks & 511) + part) / 512 + (f[1] - 0.5) * 0.002 * (ticks & 511)
        u = f[0] + (f[2] - 0.5) * 0.01 * (ticks & 511) * 0.01
        a = ((1 - d2 / (R * R)) * 0.3 + 0.5) * rain
      } else {
        v = (-(((ticks & 131071) + j) + part) / 32 * (3 + f[0])) % 32
        a = ((1 - d2 / (R * R)) * 0.5 + 0.5) * rain
      }
      if (a <= 0) continue
      out.push([x, z, bottom, top, u, v, a, h.snow ? 1 : 0, ...lightmap(h.snow ? Math.min(15, (ls * 3 + 15) / 4) : ls, lb)])
    }
  }
  return out
}
// rain splashes (LevelRenderer.tickRainParticles): 100 * rain^2 a tick at random heightmap spots
// within 10 blocks, if within 10 blocks of the camera's height; WaterDropParticle (splash_0..3):
// up at 0.1-0.3, gravity 0.06, gone when it lands back or after 8 / (r * 0.8 + 0.2) ticks
function rainSplashes (t, camOf) {
  const out = []
  for (let k = Math.max(0, Math.floor(t) - 12); k <= Math.floor(t); k++) {
    const rain = levelAt(RAIN, k)
    if (rain <= 0) continue
    const c = camOf(k), cx = Math.floor(c.x), cy = Math.floor(c.y), cz = Math.floor(c.z)
    let sd = (k * 2654435761) >>> 0
    const rnd = () => { sd ^= sd << 13; sd >>>= 0; sd ^= sd >>> 17; sd ^= sd << 5; sd >>>= 0; return sd / 4294967296 }
    const n = Math.floor(100 * rain * rain)
    for (let i = 0; i < n; i++) {
      const x = cx + Math.floor(rnd() * 21) - 10, z = cz + Math.floor(rnd() * 21) - 10
      const ox = rnd(), oz = rnd(), vy = rnd() * 0.2 + 0.1, life = Math.floor(8 / (rnd() * 0.8 + 0.2)), vx = (rnd() - 0.5) * 0.04, vz = (rnd() - 0.5) * 0.04, size = 0.1 * (rnd() * 0.5 + 0.5) * 2, tex = Math.floor(rnd() * 4)
      const a = t - k
      if (a < 0 || a >= life) continue
      const h = motionBlockingY(x, z)
      if (!h.rain || h.snow || h.y - 1 < cy - 10 || h.y - 1 > cy + 10) continue
      const tb = h.top, name = tb ? tb.name : ''
      if (/^(lava|magma_block|campfire|soul_campfire)$/.test(name)) continue
      const sh = tb && tb.shapes && tb.shapes.length ? Math.max(...tb.shapes.map(q => q[4])) : (name === 'water' ? 0.89 : 1)
      const y0 = h.y - 1 + sh, y = y0 + vy * a - 0.03 * a * a
      if (y < y0 - 0.01) continue
      out.push({ x: x + ox + vx * a, y, z: z + oz + vz * a, size, tex: `particle/splash_${tex}`, color: [1, 1, 1] })
    }
  }
  return out
}
const DEATHS = []
{
  let open = null
  // same rule as edit.py death_windows: each death runs to the next respawn (any length), and
  // windows that touch (the next death within 5 ticks of a respawn) are one death
  for (const e of rec.timeline || []) {
    const t = e.t / 50
    if (e.event === 'death' && open === null) open = t
    else if (e.event === 'death' && t - open > 30) { DEATHS.push([open, open + 1]); open = t }   // older recordings: no respawn mark
    if (e.event === 'respawn' && open !== null) { DEATHS.push([open, t]); open = null }
  }
  if (open !== null) DEATHS.push([open, Infinity])
  for (let k = DEATHS.length - 1; k > 0; k--) if (DEATHS[k][0] - DEATHS[k - 1][1] < 5) { DEATHS[k - 1][1] = DEATHS[k][1]; DEATHS.splice(k, 1) }
  // a missing respawn mark (older recordings): the death ends where the pose jumps (respawn teleport)
  const hasRespawnMarks = (rec.timeline || []).some(e => e.event === 'respawn')
  // with a mark: the same rule as edit.py's _snap_respawn, which ends the death screen on the last
  // pose jump over 4 blocks at or up to 3 ticks before the mark, so the death camera ends with it
  // (3 frames of the living HUD over the death spot otherwise: story_respawn_tax f342)
  if (hasRespawnMarks) {
    for (const d of DEATHS) {
      if (!Number.isFinite(d[1])) continue
      const m = Math.floor(d[1] + 1e-6)
      for (let i = Math.min(m, P.length - 1); i > Math.max(0, m - 4); i--) {
        const a = P[i - 1], b = P[i]
        if ((b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2 + (b[3] - a[3]) ** 2 > 16) { d[1] = Math.min(d[1], i); break }
      }
    }
  }
  for (const d of hasRespawnMarks ? [] : DEATHS) {
    for (let i = Math.ceil(d[0]) + 1; i < Math.min(P.length, d[1]); i++) {
      const a = P[i - 1], b = P[i]
      if ((b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2 + (b[3] - a[3]) ** 2 > 64) { d[1] = i; break }
    }
  }
  // while dead, vanilla keeps drawing the world's entities (frozen once updates stop), but the server
  // stops tracking them for a dead player ~18 ticks after the death, so the recording loses them and
  // every mob popped out behind the death screen (worker 5, story_runaway). Hold the last row of
  // anything that vanishes 10+ ticks into a death (earlier removals are real: an exploded creeper).
  for (const [a, b] of DEATHS) {
    const end = Math.min(b, P.length)
    let prev = ENT.get(Math.floor(a)) || new Map()
    for (let tk = Math.floor(a) + 1; tk < end; tk++) {
      let cur = ENT.get(tk)
      if (!cur) { cur = new Map(); ENT.set(tk, cur) }
      if (tk - a >= 10) for (const [id, row] of prev) if (!cur.has(id)) { const r2 = row.slice(); r2[0] = tk; cur.set(id, r2) }
      prev = cur
    }
  }
  // the respawn teleport carries the spawn's default look; a stunt that turns the view on its
  // forcedMove lands that look 1-2 ticks later, which flashed the sky or a mountain for 3 frames
  // (worker 3, tries f219). Give the teleport tick the look of the first forced turn after it.
  for (const [, b] of DEATHS) {
    if (!Number.isFinite(b)) continue
    const J = Math.ceil(b)
    if (J < 1 || J + 2 >= P.length) continue
    for (const k of [1, 2]) {
      const q = P[J + k], p0 = P[J]
      let dy = Math.abs(q[4] - p0[4]) % (2 * Math.PI); if (dy > Math.PI) dy = 2 * Math.PI - dy
      if (Math.hypot(q[1] - p0[1], q[2] - p0[2], q[3] - p0[3]) < 0.5 && (dy > 0.3 || Math.abs(q[5] - p0[5]) > 0.3)) {
        for (let j = J; j < J + k; j++) { P[j] = P[j].slice(); P[j][4] = q[4]; P[j][5] = q[5] }
        break
      }
    }
  }
  // after a respawn the server re-sends every tracked entity (a new ServerPlayer starts tracking), and
  // mineflayer's rows come back a few ticks late; the vanilla client keeps its level and shows them.
  // Back-fill an entity first seen within 4 ticks after the respawn to the respawn tick (the golem on
  // the gold block popped in 2 ticks late: worker 5, story_respawn_tax f342)
  for (const [, b] of DEATHS) {
    if (!Number.isFinite(b)) continue
    const b0 = Math.ceil(b), seen = new Set()
    for (let tk = Math.floor(b) - 30; tk < b0; tk++) for (const id of (ENT.get(tk) || new Map()).keys()) seen.add(id)
    for (let tk = b0; tk <= b0 + 4; tk++) {
      for (const [id, row] of ENT.get(tk) || new Map()) {
        if (seen.has(id)) continue
        seen.add(id)
        for (let k = b0; k < tk; k++) { if (!ENT.has(k)) ENT.set(k, new Map()); if (!ENT.get(k).has(id)) { const r2 = row.slice(); r2[0] = k; ENT.get(k).set(id, r2) } }
      }
    }
  }
  // short dropouts (an entity's rows missing for up to 6 ticks, e.g. the re-send after a respawn):
  // bridge them when it comes back within 2 blocks, so it doesn't blink out and back
  {
    const byId = new Map()
    for (const [tk, m] of ENT) for (const [id, row] of m) { if (!byId.has(id)) byId.set(id, []); byId.get(id).push(row) }
    for (const rows of byId.values()) {
      rows.sort((x, y) => x[0] - y[0])
      for (let k = 1; k < rows.length; k++) {
        const r0 = rows[k - 1], r1 = rows[k], gap = r1[0] - r0[0]
        if (gap <= 1 || gap > 7 || r0[2] === 'item' || Math.hypot(r1[3] - r0[3], r1[4] - r0[4], r1[5] - r0[5]) > 2) continue
        for (let tk = r0[0] + 1; tk < r1[0]; tk++) {
          const f = (tk - r0[0]) / gap, r2 = r0.slice()
          r2[0] = tk; r2[3] = r0[3] + (r1[3] - r0[3]) * f; r2[4] = r0[4] + (r1[4] - r0[4]) * f; r2[5] = r0[5] + (r1[5] - r0[5]) * f
          if (!ENT.has(tk)) ENT.set(tk, new Map())
          ENT.get(tk).set(r0[1], r2)
        }
      }
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
  // a respawn is a new player with hurtTime 0: the killing hit's tilt stops at the respawn
  const reset = DEATHS.reduce((m, [, b]) => (Number.isFinite(b) && b <= t ? Math.max(m, b) : m), -Infinity)
  for (const h of HURTS) {
    const e = t - h.t
    if (e < 0 || e >= 10 || h.t < reset) continue
    let k = (10 - e) / 10
    k = Math.sin(k * k * k * k * Math.PI)
    const j = -k * 14 * Math.PI / 180
    roll += j * Math.cos(h.dir); pitch += -j * Math.sin(h.dir)
  }
  return { roll, pitch }
}

// The player seen from outside (third person: any CAM= override, or SHOW_PLAYER=1). Per tick like
// LivingEntity.tick: the body turns 0.3 of the way toward the walking direction (walking backwards
// keeps it facing forward; swinging faces the look direction) and never more than 50 degrees from
// the head (tickHeadTurn); the limb swing follows WalkAnimationState (speed eases 0.4 toward
// min(1, horizontal distance * 4), position advances by speed).
// The Darkness effect (warden, sculk shrieker) from the harness's effect marks. MobEffectInstance's
// blend factor steps toward 1 while the effect is on and back to 0 after, 1/22 a tick (darkness
// fades in and out over 22 ticks). LightTexture.calculateDarknessScale pulses the lightmap down by
// max(0, cos(tickCount * PI * 0.025) * 0.45 * blend) (a 4 s period).
const DARK = []
{
  const evs = (rec.timeline || []).filter(e => (e.event === 'effect' || e.event === 'effect_end') && e.effect === 'darkness').map(e => ({ k: Math.round(e.t / 50), on: e.event === 'effect', dur: e.dur })).sort((a, b) => a.k - b.k)
  if (evs.length) {
    let f = 0, until = -1, j = 0
    for (let k = 0; k <= P.length + 1; k++) {
      while (j < evs.length && evs[j].k <= k) { const e = evs[j++]; until = e.on ? (e.dur < 0 ? Infinity : k + e.dur) : k }
      const target = k < until ? 1 : 0
      f = target > f ? Math.min(1, f + 1 / 22) : Math.max(0, f - 1 / 22)
      DARK[k] = f
    }
  }
}
// stunt.aimMarker: the 'aim' marks {x, y, z, tier} (the landing point if nobody steers, one per falling
// tick) drawn as a marker on the floor, interpolated between ticks; it fades in over 4 ticks from a
// tier's first aim mark and out over 4 ticks from its last one (the stunt stops marking 8 ticks before
// the splash, so the marker is gone well before the zoomed-in view reaches the water; holding it to
// the splash made the 1-block square fill the screen and tint the landing water red)
const AIMS = []
if (STUNT_MOD.aimMarker || process.env.AIM_MARKER === '1') {
  const byTier = new Map()
  for (const e of rec.timeline || []) if (e.event === 'aim' && Number.isFinite(e.x)) { if (!byTier.has(e.tier)) byTier.set(e.tier, []); byTier.get(e.tier).push({ t: e.t / 50, x: e.x, y: e.y, z: e.z }) }
  for (const [tier, pts] of byTier) {
    pts.sort((a, b) => a.t - b.t)
    const sp = (rec.timeline || []).find(e => e.event === `splash${tier}`)
    AIMS.push({ pts, t0: pts[0].t, t1: Math.min(pts[pts.length - 1].t, sp ? sp.t / 50 - 16 : Infinity) })   // gone 12 ticks before the splash: fading over the zoomed-in water tinted it purple (review v9)
  }
}
function aimAt (t) {
  for (const A of AIMS) {
    if (t < A.t0 || t > A.t1 + 4) continue
    const a = Math.min(1, (t - A.t0) / 4) * (t > A.t1 ? Math.max(0, 1 - (t - A.t1) / 4) : 1)
    const pts = A.pts
    let i = 0; while (i + 1 < pts.length && pts[i + 1].t <= t) i++
    const p = pts[i], q = pts[i + 1]
    if (!q || q.t <= p.t) return { x: p.x, y: p.y, z: p.z, a }
    const u = Math.min(1, Math.max(0, (t - p.t) / (q.t - p.t)))
    return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u, z: p.z + (q.z - p.z) * u, a }
  }
  return null
}
function darknessAt (t) {
  if (!DARK.length) return { darkBlend: 0, darkScale: 0 }
  const k = Math.max(0, Math.floor(t)), u = t - k
  const b = (DARK[k] || 0) * (1 - u) + (DARK[k + 1] ?? DARK[k] ?? 0) * u
  return { darkBlend: b, darkScale: Math.max(0, Math.cos(t * Math.PI * 0.025) * 0.45 * b) }
}
// a warden's roar: the tick each run of the roar flag starts (the animation runs from there)
const ROAR_START = new Map()   // id -> [[startTick, endTick]]
{
  const open = new Map()
  for (const row of rec.entities || []) {
    if (row[2] !== 'warden') continue
    const on = !!(row[9] && row[9].roar), cur = open.get(row[1])
    if (on && !cur) { const run = [row[0], Infinity]; open.set(row[1], run); if (!ROAR_START.has(row[1])) ROAR_START.set(row[1], []); ROAR_START.get(row[1]).push(run) }
    if (!on && cur) { cur[1] = row[0]; open.delete(row[1]) }
  }
  // staged by a stunt: ctx.mark('pose', { ids: [id], roar: true }) .. ctx.mark('pose_off', { ids })
  // (a summoned warden won't roar on cue)
  const staged = new Map()
  for (const e of rec.timeline || []) {
    if (e.event === 'pose' && e.roar) for (const id of e.ids || []) staged.set(id, e.t / 50)
    if (e.event === 'pose_off') for (const id of e.ids || []) if (staged.has(id)) { if (!ROAR_START.has(id)) ROAR_START.set(id, []); ROAR_START.get(id).push([staged.get(id), e.t / 50]); staged.delete(id) }
  }
  for (const [id, a] of staged) { if (!ROAR_START.has(id)) ROAR_START.set(id, []); ROAR_START.get(id).push([a, a + 84]) }   // no pose_off: the 4.2 s roar
}
// staged poses (NoAI mobs posed on cue): ctx.mark('pose', { ids, creepy | standing: true }) until a
// 'pose_off' for those ids: an enderman's scream, a polar bear rearing up (the roar is above)
const STAGED = new Map()   // id -> [[a, b, flags]]
{
  const open = new Map()
  for (const e of rec.timeline || []) {
    if (e.event === 'pose') {
      const fl = {}; if (e.creepy) fl.creepy = true; if (e.standing) fl.standing = true
      if (Object.keys(fl).length) for (const id of e.ids || []) { const run = [e.t / 50, Infinity, fl]; if (!STAGED.has(id)) STAGED.set(id, []); STAGED.get(id).push(run); open.set(id, run) }
    }
    if (e.event === 'pose_off') for (const id of e.ids || []) if (open.has(id)) { open.get(id)[1] = e.t / 50; open.delete(id) }
  }
}
// TNT minecarts primed (harness cart_primed marks, entity status 10): id -> tick
const CART_PRIMED = new Map()
for (const e of rec.timeline || []) if (e.event === 'cart_primed' && !CART_PRIMED.has(e.id)) CART_PRIMED.set(e.id, e.t / 50)
if (!CART_PRIMED.size) {
  // recordings from before the mark: a TNT minecart that ends in an explosion was primed 80 ticks before
  const span = new Map()
  for (const row of rec.entities || []) if (row[2] === 'tnt_minecart') { const s = span.get(row[1]); if (!s) span.set(row[1], { a: row[0], b: row[0], x: row[3], y: row[4], z: row[5] }); else Object.assign(s, { b: row[0], x: row[3], y: row[4], z: row[5] }) }
  const booms = (rec.timeline || []).filter(e => (e.event === 'explosion' || (e.event === 'particles' && e.type === 'explosion')) && Number.isFinite(e.x))
  for (const [id, s] of span) {
    const ex = booms.find(e => Math.abs(e.t / 50 - s.b) <= 3 && Math.hypot(e.x - s.x, e.y - s.y, e.z - s.z) < 1.5)
    if (ex) CART_PRIMED.set(id, Math.max(s.a, ex.t / 50 - 80))
  }
}
const THIRD = !!process.env.CAM || process.env.SHOW_PLAYER === '1'
const PBODY = [], PWALK = []
{
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  let body = P.length ? P[0][4] : 0, wpos = 0, wspd = 0
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[i]
    const dx = b[1] - a[1], dz = b[3] - a[3], d2 = dx * dx + dz * dz
    let target = body
    if (d2 > 0.0025 && d2 < 16) {
      target = 1.5 * Math.PI - Math.atan2(dz, dx)
      if (Math.abs(wrap(b[4] - target)) > 95 * Math.PI / 180) target += Math.PI
    }
    if (SWINGS.some(s => i >= s && i - s < 6)) target = b[4]
    if (d2 >= 16) body = b[4]
    body += wrap(target - body) * 0.3
    const off = wrap(b[4] - body), MAX = 50 * Math.PI / 180
    if (Math.abs(off) > MAX) body += off - Math.sign(off) * MAX
    body = wrap(body)
    PBODY.push(body)
    if (d2 < 16) { wspd += (Math.min(1, Math.sqrt(d2) * 4) - wspd) * 0.4; wpos += wspd }
    PWALK.push([wpos, wspd])
  }
}
// Actors (docs/movie_engine.md): the other players in a recording, i.e. extra bots playing cast members
// (lib/movie.js). The same body turn and limb swing as the player's own above, per actor and per tick,
// from their recorded positions; their arm swings come from the harness's ent_swing marks, and their
// skins from stunt.cast (username -> skin), the recording bot's from cast.self.
const ENT_SWINGS = new Map()
for (const e of rec.timeline || []) if (e.event === 'ent_swing') { if (!ENT_SWINGS.has(e.id)) ENT_SWINGS.set(e.id, []); ENT_SWINGS.get(e.id).push(e.t / 50) }
const ACTOR = new Map(), ACTOR_ID = new Map()   // id -> { user, ticks: Map(tick -> [body, walkPos, walkSpeed]) }; username -> id
{
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  const byId = new Map()
  for (const row of rec.entities || []) if (row[2] === 'player' || row[2] === 'mannequin') { if (!byId.has(row[1])) byId.set(row[1], []); byId.get(row[1]).push(row) }
  for (const [id, rows] of byId) {
    rows.sort((a, b) => a[0] - b[0])
    const sw = ENT_SWINGS.get(id) || [], ticks = new Map()
    let body = rows[0][8] ?? rows[0][6], wpos = 0, wspd = 0, prev = rows[0]
    for (const r of rows) {
      const look = r[8] ?? r[6], dx = r[3] - prev[3], dz = r[5] - prev[5], d2 = dx * dx + dz * dz
      let target = body
      if (d2 > 0.0025 && d2 < 16) {
        target = 1.5 * Math.PI - Math.atan2(dz, dx)
        if (Math.abs(wrap(look - target)) > 95 * Math.PI / 180) target += Math.PI
      }
      if (sw.some(s => r[0] >= s && r[0] - s < 6)) target = look
      if (d2 >= 16) body = look
      body += wrap(target - body) * 0.3
      const off = wrap(look - body), MAX = 50 * Math.PI / 180
      if (Math.abs(off) > MAX) body += off - Math.sign(off) * MAX
      body = wrap(body)
      if (d2 < 16) { wspd += (Math.min(1, Math.sqrt(d2) * 4) - wspd) * 0.4; wpos += wspd }
      ticks.set(r[0], [body, wpos, wspd])
      prev = r
    }
    const named = rows.find(r => r[9] && (r[9].user || r[9].name))   // a bot's username, or a Mannequin's custom name
    const user = named ? (named[9].user || named[9].name) : null
    ACTOR.set(id, { user, ticks })
    if (user) ACTOR_ID.set(user, id)
  }
}
// Dialogue (lib/movie.js line marks): who speaks when, for the talking head below. A line lasts its reading
// time (0.8 s + 0.06 s a character, 1-4.5 s, as scripts/longform_build.py's subtitles) or until the next line.
const LINES = []
{
  const ls = (rec.timeline || []).filter(e => e.event === 'line').map(e => ({ who: e.who, t0: e.t / 50, text: e.text || '', dur: e.dur })).sort((a, b) => a.t0 - b.t0)
  ls.forEach((l, k) => {
    const want = l.dur || Math.max(1, Math.min(4.5, 0.8 + 0.06 * l.text.length))
    const next = k + 1 < ls.length ? ls[k + 1].t0 : Infinity
    LINES.push({ who: l.who, t0: l.t0, t1: Math.min(l.t0 + want * 20, next - 1) })
  })
}
const SELF_NAME = STUNT_MOD.selfName || null   // the recording bot's character name in line marks ('Ash')
const HAND_LOOK = process.env.LOOK_OFF || process.env.LOOK === '0' ? null : (process.env.LOOK_JSON ? JSON.parse(process.env.LOOK_JSON) : STUNT_MOD.look)
// Idle life (docs/movie_engine.md): nobody stands perfectly still. Two slow sines per entity (periods of
// 6-24 s, phases from its id), in [-1, 1]; deterministic, so frames render in any order.
function idleNoise (id, t) {
  const a = (Math.abs(id) * 2.399) % (2 * Math.PI), b = (Math.abs(id) * 1.618 + 1) % (2 * Math.PI)
  return [0.65 * Math.sin(t * 0.045 + a) + 0.35 * Math.sin(t * 0.019 + b), 0.6 * Math.sin(t * 0.037 + b) + 0.4 * Math.sin(t * 0.013 + a)]
}
// A speaking head: a small nod-and-turn rhythm while the line is up, easing in and out over 4 ticks.
function talkMotion (who, t) {
  if (!who) return null
  const l = LINES.find(x => x.who === who && t >= x.t0 && t < x.t1)
  if (!l) return null
  const env = Math.min(1, (t - l.t0) / 4, (l.t1 - t) / 4)
  return { pitch: (Math.sin(t * 0.62) * 0.05 + Math.sin(t * 1.31) * 0.02) * env, yaw: Math.sin(t * 0.27) * 0.045 * env }   // (0.035/0.03 read as still: reel 1 review v2)
}
// The camera director (docs/movie_engine.md). stunt.shots = { NAME: spec }; a 'shot' mark ({name}, from
// lib/movie.js shot()) switches to that spec until the next one. Before the first mark, and on a
// { pov: true } shot, the camera is the player's own eyes (HUD and hand). A camera spec:
//   at: TARGET                        a fixed camera
//   path: [[sec, dx, dy, dz], ...]    keyframes, seconds from the shot's start, smoothstep between each pair
//   follow: TARGET, offset: [dx, dy, dz], lag: TICKS   ride along with a target (its position LAG ticks back)
//   look: TARGET  |  yaw: deg, pitch: deg               where it points (mineflayer convention: yaw 0 = north)
//   lookPath: [[sec, dx, dy, dz], ...]                  a moving look target, keyframed like path
//   fov: degrees (default 70), roll: degrees, push: blocks/s toward the subject on `at` shots (default 0.2), drift (default 1)
//   two: [A, B] | ots: S, over: A | single: S, toward: B   auto-framed from where they stand (renderer/framing.js):
//                                     side (compass), size (close|medium|wide), anchor (start|live), height
// TARGET is [dx, dy, dz] from the set origin, 'self' (the player's eye), 'actor:NAME' (that actor's eye)
// or { of: TARGET, offset: [dx, dy, dz] }. Everything is a function of the time alone, so frames can be
// rendered in any order (FRAMES=) and a camera can be re-tuned without re-recording.
const SHOTS = { ...(STUNT_MOD.shots || {}), ...(process.env.SHOTS_JSON ? JSON.parse(process.env.SHOTS_JSON) : {}) }   // (SHOTS_JSON='{"name": {...}}': try a camera without editing the stunt)
// stunt.self = { model, eye, extra }: who the narrator is when not a player (lib/story.js docs). A 'self' mark
// ({ eye?, model?, extra? }) changes it from that tick on (a wolf sitting down: { extra: { sitting: true }, eye: 0.5 })
const SELF_MARKS = (rec.timeline || []).filter(e => e.event === 'self').sort((a, b) => a.t - b.t)
function selfAt (t) {
  if (!STUNT_MOD.self) return null
  const s = { ...STUNT_MOD.self, extra: { ...(STUNT_MOD.self.extra || {}) } }
  for (const m of SELF_MARKS) { if (m.t / 50 > t) break; if (m.eye !== undefined) s.eye = m.eye; if (m.model) s.model = m.model; if (m.extra) Object.assign(s.extra, m.extra) }
  return s
}
// stunt.wideMaster (or WIDE_MASTER=1): render a 16:9 master at the output height (1797x1011 for a Short) and write
// the W x H output cropped from it: the centre, or a camera shot's `cropX` (-1 left edge .. 1 right edge). Same
// vertical field of view and scale, so a POV frame (hand included) is the same picture as a W x H render. WIDE_DIR=dir
// also saves every master frame (trailers, 16:9 cuts). Owner, 2026-11-10: "we should have the full wide, but then
// crop it or smth for the final video"
let cropNow = 0
const MW = (STUNT_MOD.wideMaster || process.env.WIDE_MASTER) ? Math.max(W, Math.round(H * 16 / 9)) : W
const SHOT_MARKS = (rec.timeline || []).filter(e => e.event === 'shot' && e.name).map(e => ({ t: e.t / 50, name: e.name })).sort((a, b) => a.t - b.t)
for (const m of SHOT_MARKS) if (!SHOTS[m.name]) console.log(`shot '${m.name}' is marked but not in stunt.shots: that stretch stays first person`)
function shotAt (t) {
  let s = null
  for (const m of SHOT_MARKS) { if (m.t <= t + 1e-6) s = m; else break }
  return s && SHOTS[s.name] ? { ...SHOTS[s.name], name: s.name, t0: s.t } : null
}
function entityPosAt (id, t) {
  const i = Math.floor(t), f = t - i, a = ENT.get(i) && ENT.get(i).get(id)
  if (!a) return null
  let b = (ENT.get(i + 1) && ENT.get(i + 1).get(id)) || a
  if (Math.hypot(b[3] - a[3], b[4] - a[4], b[5] - a[5]) > 4) b = a
  return { x: a[3] + (b[3] - a[3]) * f, y: a[4] + (b[4] - a[4]) * f, z: a[5] + (b[5] - a[5]) * f, sneak: !!(a[9] && a[9].sneak) }
}
function targetAt (tg, t) {
  if (tg === 'self') { const c = camAt(Math.max(0, t)); return { x: c.x, y: c.y, z: c.z } }
  if (typeof tg === 'string' && tg.startsWith('actor:')) {
    const id = ACTOR_ID.get(tg.slice(6)), p = id !== undefined ? entityPosAt(id, Math.max(0, t)) : null
    return p ? { x: p.x, y: p.y + (p.sneak ? 1.27 : 1.62), z: p.z } : null
  }
  if (Array.isArray(tg)) return { x: rec.set.x + tg[0], y: rec.set.y + tg[1], z: rec.set.z + tg[2] }
  if (tg && tg.of) { const p = targetAt(tg.of, t), o = tg.offset || [0, 0, 0]; return p ? { x: p.x + o[0], y: p.y + o[1], z: p.z + o[2] } : null }
  return null
}
// [[sec, dx, dy, dz], ...] at u seconds: a Catmull-Rom curve through every key (no stop at the middle keys), the
// move as a whole easing in and out (ease: 'linear' for a constant speed). Two keys: a plain eased move.
function keyed (keys, u, ease = 'smooth') {
  const T0 = keys[0][0], T1 = keys[keys.length - 1][0]
  if (u <= T0 || keys.length === 1) return keys[0].slice(1)
  if (u >= T1) return keys[keys.length - 1].slice(1)
  if (ease !== 'linear') { const x = (u - T0) / (T1 - T0); u = T0 + (T1 - T0) * x * x * (3 - 2 * x) }
  let k = 0
  while (k < keys.length - 2 && u > keys[k + 1][0]) k++
  const p1 = keys[k], p2 = keys[k + 1], p0 = keys[Math.max(0, k - 1)], p3 = keys[Math.min(keys.length - 1, k + 2)]
  const s = (u - p1[0]) / Math.max(1e-6, p2[0] - p1[0]), s2 = s * s, s3 = s2 * s
  return [1, 2, 3].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * s + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * s2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * s3))
}
const FRAMING = require('./renderer/framing')
// the helpers renderer/framing.js (auto-framed shots) and renderer/lint.js share with the render
function actorsAt (t) {
  const out = []
  for (const [name, id] of ACTOR_ID) { const p = entityPosAt(id, t); if (p) out.push({ name: `actor:${name}`, eye: { x: p.x, y: p.y + (p.sneak ? 1.27 : 1.62), z: p.z } }) }
  const c = camAt(Math.max(0, t)); out.push({ name: 'self', eye: { x: c.x, y: c.y, z: c.z } })
  return out
}
const FRAME_HELP = (solidAt) => ({ targetAt, solidAt: solidAt || (() => false), actors: actorsAt, side: STUNT_MOD.coverage && STUNT_MOD.coverage.side })
function shotCam (sh, t, solidAt) {
  const u = (t - sh.t0) / 20
  let pos = null
  const auto = FRAMING.frame(sh, t, FRAME_HELP(solidAt))   // { two | ots | single }: placed from the actors (renderer/framing.js)
  if (auto) pos = { ...auto.pos }
  if (auto) {}
  else if (sh.path) { const d = keyed(sh.path, u, sh.ease); pos = { x: rec.set.x + d[0], y: rec.set.y + d[1], z: rec.set.z + d[2] } }
  else if (sh.orbit) {   // orbit: TARGET, radius, height, startDeg (0 = south of it), degPerSec
    const c = targetAt(sh.orbit, t)
    if (c) { const a = ((sh.startDeg || 0) + (sh.degPerSec || 6) * u) * Math.PI / 180, r = sh.radius || 6; pos = { x: c.x + Math.sin(a) * r, y: c.y + (sh.height || 1), z: c.z + Math.cos(a) * r } }
  }
  else if (auto) {}
  else if (sh.follow) { const p = targetAt(sh.follow, t - (sh.lag || 0)), o = sh.offset || [0, 0, 0]; if (p) pos = { x: p.x + o[0], y: p.y + o[1], z: p.z + o[2] } }
  else if (sh.at) pos = targetAt(sh.at, t)
  if (!pos) return null
  let yaw = (sh.yaw || 0) * Math.PI / 180, pitch = (sh.pitch || 0) * Math.PI / 180
  const lk = auto ? auto.look : sh.lookPath ? (() => { const d = keyed(sh.lookPath, u, sh.ease); return { x: rec.set.x + d[0], y: rec.set.y + d[1], z: rec.set.z + d[2] } })()
    : sh.look ? targetAt(sh.look, t) : sh.orbit ? targetAt(sh.orbit, t) : null
  // the slow push-in: a fixed camera eases toward its subject, `push` blocks a second (default 0.2; push: 0 locks
  // it), at most a quarter of the way: dialogue shots read as frozen without it (reel 1 QA: stuck 1.6-2.4 s; 0.12
  // still read as frozen, review v2)
  if ((sh.at || auto) && lk && (sh.push ?? 0.2) > 0) {
    const dx = lk.x - pos.x, dy = lk.y - pos.y, dz = lk.z - pos.z, L = Math.hypot(dx, dy, dz)
    const e = Math.min((sh.push ?? 0.2) * u, L * 0.25) / Math.max(L, 1e-6)
    pos = { x: pos.x + dx * e, y: pos.y + dy * e, z: pos.z + dz * e }
  }
  // never inside a block: slide toward the subject (or back along the view) until clear, 0.25 a step
  if (solidAt && solidAt(pos.x, pos.y, pos.z)) {
    const to = lk || { x: pos.x - Math.sin(yaw), y: pos.y, z: pos.z - Math.cos(yaw) }
    const L = Math.max(1e-6, Math.hypot(to.x - pos.x, to.y - pos.y, to.z - pos.z)), dir = [(to.x - pos.x) / L, (to.y - pos.y) / L, (to.z - pos.z) / L]
    for (let k = 0; k < 48 && solidAt(pos.x, pos.y, pos.z); k++) { pos.x += dir[0] * 0.25; pos.y += dir[1] * 0.25; pos.z += dir[2] * 0.25 }
  }
  // handheld drift (1 = a few centimetres and a fraction of a degree; drift: 0 locks the camera off)
  const dr = sh.drift ?? 1
  if (dr) {
    pos = { x: pos.x + Math.sin(t * 0.031 + 1) * 0.045 * dr, y: pos.y + Math.sin(t * 0.023 + 2) * 0.03 * dr, z: pos.z + Math.sin(t * 0.027 + 3) * 0.045 * dr }
  }
  let focus = 0
  if (lk) { const dx = lk.x - pos.x, dy = lk.y - pos.y, dz = lk.z - pos.z; yaw = Math.atan2(-dx, -dz); pitch = Math.atan2(dy, Math.hypot(dx, dz)); focus = Math.hypot(dx, dy, dz) }
  // focus: the shot's dof.focus, else the subject it follows, else what it looks at (a follow looking just past its
  // subject put the subject itself out of focus: reel 1 walk-out)
  const ft = (sh.dof && sh.dof.focus) || sh.follow || null
  if (ft) { const f = targetAt(ft, t); if (f) focus = Math.hypot(f.x - pos.x, f.y - pos.y, f.z - pos.z) }
  else if (auto && auto.focus) focus = Math.hypot(auto.focus.x - pos.x, auto.focus.y - pos.y, auto.focus.z - pos.z)
  if (dr) { yaw += Math.sin(t * 0.041) * 0.0035 * dr; pitch += Math.sin(t * 0.035 + 1) * 0.0025 * dr }
  return { x: pos.x, y: pos.y, z: pos.z, yaw, pitch, bobX: 0, bobY: 0, roll: (sh.roll || 0) * Math.PI / 180, bobPitch: 0, fov: sh.fov || (auto ? 50 : undefined), focusDist: focus }
}
// the model an item draws with: its item definition (items/<name>.json, 1.21.4+; many block items
// have no models/item/<name>.json, e.g. lectern -> block/lectern), else item/<name>
const jarJson = (p) => { try { return JSON.parse(require('child_process').execFileSync('unzip', ['-p', path.join(__dirname, 'work', 'client', `${rec.version}.jar`), p], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()) } catch (e) { return null } }
function itemModel (item) {
  const def = jarJson(`assets/minecraft/items/${item}.json`)
  const find = (o) => {
    if (!o || typeof o !== 'object') return null
    if (typeof o.model === 'string') return o.model
    for (const v of Object.values(o)) { const r = find(v); if (r) return r }
    return null
  }
  return ((def && find(def)) || `item/${item}`).replace(/^minecraft:/, '')
}
// special item models (beds, chests, shulker boxes, heads, banners): renderer/specialitems.js
const specialItem = require('./renderer/specialitems').specialItems(jarJson)
// an item's display.fixed (item frames), following the model's parents
const FIXED_DISPLAY = new Map()
function fixedDisplay (item) {
  if (FIXED_DISPLAY.has(item)) return FIXED_DISPLAY.get(item)
  let name = itemModel(item), out = null
  for (let k = 0; k < 8 && name && !out; k++) {
    const m = jarJson(`assets/minecraft/models/${name.replace(/^minecraft:/, '')}.json`)
    if (!m) break
    if (m.display && m.display.fixed) out = m.display.fixed
    name = m.parent
  }
  FIXED_DISPLAY.set(item, out)
  return out
}
// an item's display.thirdperson_righthand, following the model's parents in the client jar
const DISPLAY = new Map()
function thirdPersonDisplay (item) {
  if (DISPLAY.has(item)) return DISPLAY.get(item)
  const jar = path.join(__dirname, 'work', 'client', `${rec.version}.jar`)
  let name = itemModel(item), out = null
  for (let k = 0; k < 8 && name && !out; k++) {
    let m = null
    try { m = JSON.parse(require('child_process').execFileSync('unzip', ['-p', jar, `assets/minecraft/models/${name.replace(/^minecraft:/, '')}.json`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()) } catch (e) { break }
    if (m.display && m.display.thirdperson_righthand) out = m.display.thirdperson_righthand
    name = m.parent
  }
  DISPLAY.set(item, out)
  return out
}
// an item's flat sprite ('item/<texture>'), or null for block items: its own name, else the
// layer0 of its item model in the jar (enchanted_golden_apple draws item/golden_apple)
const SPRITE = new Map()
const TINT_CACHE = new Map()
function TINTED_STATE (state) {
  if (!TINT_CACHE.has(state)) { let n = ''; try { n = require('prismarine-block')(rec.version).fromStateId(state, 0).name } catch (e) {} TINT_CACHE.set(state, /^(grass_block|short_grass|tall_grass|fern|large_fern|vine|sugar_cane)$|_leaves$/.test(n) && !/^(cherry|azalea|flowering_azalea)_leaves$/.test(n)) }
  return TINT_CACHE.get(state)
}
const EMPTY_MODEL = new Map()
function blockModelEmpty (state) {
  if (!EMPTY_MODEL.has(state)) { let empty = true; try { empty = !(mesherRef && mesherRef.meshSingle(state).positions.length) } catch (e) {} EMPTY_MODEL.set(state, empty) }
  return EMPTY_MODEL.get(state)
}
let mesherRef = null
function spriteOf (item) {
  if (SPRITE.has(item)) return SPRITE.get(item)
  let out = fs.existsSync(path.join(ASSETS_DIR, 'env', 'item', `${item}.png`)) ? `item/${item}` : null
  if (!out) {
    try {
      const m = jarJson(`assets/minecraft/models/${itemModel(item)}.json`) || {}
      const l0 = m.textures && m.textures.layer0 && m.textures.layer0.replace(/^minecraft:/, '')
      if (l0 && l0.startsWith('item/') && fs.existsSync(path.join(ASSETS_DIR, 'env', `${l0}.png`))) out = l0
    } catch (e) {}
  }
  SPRITE.set(item, out)
  return out
}
// The item frame's block model (models/block/template_item_frame.json: the back plate and four
// sticks, 'wood' = birch planks, 'back' = item_frame / glow_item_frame) as geometry on the block atlas,
// 0..1 in block units, faces shaded like blocks
function frameGeometry (name) {
  const tpl = jarJson('assets/minecraft/models/block/template_item_frame.json')
  if (!tpl) return null
  const tex = { wood: ATLAS_UV.birch_planks, back: ATLAS_UV[name] || ATLAS_UV.item_frame }
  const out = { positions: [], colors: [], uvs: [], indices: [] }
  for (const e of tpl.elements) {
    const [x0, y0, z0] = e.from.map(v => v / 16), [x1, y1, z1] = e.to.map(v => v / 16)
    const C = { north: [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]], south: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]],
      west: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]], east: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]],
      up: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], down: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]] }
    const SH = { up: 1, down: 0.5, north: 0.8, south: 0.8, west: 0.6, east: 0.6 }
    for (const [dir, f] of Object.entries(e.faces)) {
      const U = tex[f.texture.replace('#', '')]; if (!U) continue
      const [u0, v0, u1, v1] = f.uv || [0, 0, 16, 16], n = out.positions.length / 3
      const uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
      C[dir].forEach((c, k) => { out.positions.push(...c); out.colors.push(SH[dir], SH[dir], SH[dir]); out.uvs.push(U.u + uv[k][0] / 16 * U.su, U.v + uv[k][1] / 16 * U.sv) })
      out.indices.push(n, n + 1, n + 2, n, n + 2, n + 3)
    }
  }
  return out
}
// the vanilla F5 camera (Camera.setup, detached): back along the look, or in front looking back,
// pulled in so it stays out of blocks (getMaxZoom)
// Camera.getMaxZoom: from the eye back along -f, the nearest hit of 8 rays offset +-0.1 (corners)
function pullIn (eye, f, dist, world) {
  for (let s = 0.05; s <= dist; s += 0.05) {
    for (const [ox, oy, oz] of [[-0.1, -0.1, -0.1], [0.1, -0.1, -0.1], [-0.1, 0.1, -0.1], [0.1, 0.1, -0.1], [-0.1, -0.1, 0.1], [0.1, -0.1, 0.1], [-0.1, 0.1, 0.1], [0.1, 0.1, 0.1]]) {
      const b = world.getBlock(new Vec3(Math.floor(eye.x - f.x * s + ox), Math.floor(eye.y - f.y * s + oy), Math.floor(eye.z - f.z * s + oz)))
      if (b && b.boundingBox === 'block') return Math.max(0, s - 0.05)
    }
  }
  return dist
}
function detachedCam (eye, mode, dist, world) {
  const yaw = mode === 'front' ? eye.yaw + Math.PI : eye.yaw, pitch = mode === 'front' ? -eye.pitch : eye.pitch
  const f = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) }
  let d = pullIn(eye, f, dist, world)
  // replays: a collision pulls the camera in at once (Camera.getMaxZoom), but it comes back out at
  // most 0.25 blocks a tick, so a released pull-in eases out instead of jumping from 2 to 6 blocks
  // (boat_clutch v4 replay f2031). Needs the frame time (detachedCam.t), set by the caller.
  const st = detachedCam.state, tNow = detachedCam.t
  if (st && tNow !== undefined && tNow > st.t && tNow - st.t < 2 && d > st.d) d = Math.min(d, st.d + 0.25 * (tNow - st.t))
  if (tNow !== undefined) detachedCam.state = { t: tNow, d }
  const c = { x: eye.x - f.x * d, y: eye.y - f.y * d, z: eye.z - f.z * d, yaw, pitch }
  // replays (not vanilla F5): keep the camera at least 1 block above the ground or a water/lava
  // surface under it, and re-aim at the eye so the player stays framed (worker 10: boat_clutch
  // landed with the camera 0.3 above the grass). The lifted line is pulled in again like
  // getMaxZoom, so the lift can't put terrain between the camera and the player (boat_clutch v3 f2053).
  if (d > 0.5) {
    let top = null
    for (let y = Math.floor(c.y); y >= Math.floor(c.y) - 3 && top === null; y--) {
      const b = world.getBlock(new Vec3(Math.floor(c.x), y, Math.floor(c.z)))
      if (!b) continue
      if (/^(water|lava)$/.test(b.name)) top = y + 0.9
      else if (b.boundingBox === 'block') top = y + Math.max(...(b.shapes && b.shapes.length ? b.shapes.map(q => q[4]) : [1]))
    }
    if (top !== null && c.y < top + 1) {
      const v = { x: c.x - eye.x, y: top + 1 - eye.y, z: c.z - eye.z }, L = Math.hypot(v.x, v.y, v.z)
      if (L > 0.1) {
        const g = { x: -v.x / L, y: -v.y / L, z: -v.z / L }, d2 = pullIn(eye, g, L, world)
        c.x = eye.x - g.x * d2; c.y = eye.y - g.y * d2; c.z = eye.z - g.z * d2
        const hd = Math.hypot(eye.x - c.x, eye.z - c.z)
        if (hd > 0.1) c.pitch = Math.atan2(eye.y - c.y, hd)
      }
    }
  }
  return c
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
    // a last step no player moves on its own (a /tp of a block or so on the death tick: over 0.6
    // sideways or 0.5 up) is not speed: start the body at rest (it launched ~11 blocks up a lane,
    // worker 5, story_respawn_tax)
    if (Math.hypot(vx, vz) > 0.6 || vy > 0.5) { vx = 0; vy = 0; vz = 0 }
    // a blast that kills: the explosion packet's player knockback is added to the (dead) local player
    // (ClientPacketListener.handleExplode -> addDeltaMovement), so the body is flung. Older recordings
    // without the packet's value: ServerExplosion's (1 - dist / (2 r)) x exposure (taken as 1) along
    // centre -> eye (worker 5, story_runaway: the dead view ignored the creeper's blast)
    for (const e of (rec.timeline || [])) {
      if (e.event !== 'particles' || e.type !== 'explosion' || Math.abs(e.t / 50 - d[0]) > 1) continue
      let kb = e.kb
      if (!kb) {
        // ServerExplosion: strength from the feet distance (distanceToSqr), direction toward the eye
        const q = Math.hypot(start[1] - e.x, start[2] - e.y, start[3] - e.z) / (2 * (e.radius || 4))
        const ex = start[1] - e.x, ey = start[2] + EYE - e.y, ez = start[3] - e.z, dist = Math.hypot(ex, ey, ez)
        if (q <= 1 && dist > 1e-4) { const k = 1 - q; kb = [ex / dist * k, ey / dist * k, ez / dist * k] }
      }
      if (kb) { vx += kb[0]; vy += kb[1]; vz += kb[2] }
    }
    const pts = [[x, y, z]]
    const blk = (x, y, z) => { const bl = solidWorld && solidWorld.getBlock(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z))); return bl ? bl.name : 'air' }
    const solid = (x, y, z) => { const bl = solidWorld && solidWorld.getBlock(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z))); return !!(bl && bl.boundingBox === 'block') }
    // the highest collision box top under (x, z) at or below y, in this block and the one below: a
    // cauldron's inner floor is 0.25 up, not the block top (the body sank into it: respawn_tax f1536)
    const groundBelow = (x, y, z) => {
      const fx = x - Math.floor(x), fz = z - Math.floor(z)
      for (const cy of [Math.floor(y), Math.floor(y) - 1]) {
        const bl = solidWorld && solidWorld.getBlock(new Vec3(Math.floor(x), cy, Math.floor(z)))
        if (!bl || bl.boundingBox !== 'block') continue
        const sh = bl.shapes && bl.shapes.length ? bl.shapes : [[0, 0, 0, 1, 1, 1]]
        let top = null
        for (const q of sh) if (fx >= q[0] - 1e-3 && fx <= q[3] + 1e-3 && fz >= q[2] - 1e-3 && fz <= q[5] + 1e-3 && cy + q[4] <= y + 1e-3) top = Math.max(top ?? -Infinity, cy + q[4])
        if (top !== null) return top
      }
      return null
    }
    // LivingEntity.travel order: move with the current velocity (collisions), then gravity and drag;
    // the horizontal drag uses the friction of the block under it from the previous tick's onGround
    // (0.6 x 0.91 on most blocks, 0.91 in the air). Fluids: x 0.5/0.8 (lava) or 0.8 (water), gravity 0.02.
    let onGround = (() => { const g = groundBelow(x, y + 0.001, z); return g !== null && y - g < 0.01 })()
    for (let k = 0; k < 400; k++) {
      const m = blk(x, y + 0.1, z)
      if (solid(x + vx, y, z)) vx = 0
      if (solid(x, y, z + vz)) vz = 0
      x += vx; z += vz
      let landed = false
      if (vy < 0) { const g = groundBelow(x, y, z); if (g !== null && y + vy <= g) { y = g; vy = 0; landed = true } else y += vy } else y += vy
      if (m === 'lava') { vx *= 0.5; vy *= 0.8; vz *= 0.5; vy -= 0.02 } else if (m === 'water') { vx *= 0.8; vy *= 0.8; vz *= 0.8; vy -= 0.02 } else { const fr = onGround ? 0.546 : 0.91; vy -= 0.08; vy *= 0.98; vx *= fr; vz *= fr }
      onGround = landed || (vy <= 0 && (() => { const g = groundBelow(x, y + 0.001, z); return g !== null && y - g < 0.01 })())
      pts.push([x, y, z])
    }
    if (process.env.DEBUG_DEATH) console.log('death body', JSON.stringify(pts.slice(0, 20).map(q => q.map(v => +v.toFixed(2)))))
    deathSim = { d, pts, yaw: start[4], pitch: start[5] }
  }
  const e = Math.max(0, t - d[0]), i = Math.min(deathSim.pts.length - 2, Math.floor(e)), f = e - i
  const A = deathSim.pts[i], B = deathSim.pts[i + 1]
  return { x: A[0] + (B[0] - A[0]) * f, y: A[1] + (B[1] - A[1]) * f, z: A[2] + (B[2] - A[2]) * f, yaw: deathSim.yaw, pitch: deathSim.pitch }
}
// Dropped items and XP orbs between the server's position syncs (every ~20 ticks): vanilla runs their
// physics on the client from the velocity in the spawn / entity_velocity packets (harness 'vel'
// marks). ItemEntity: gravity 0.04, drag 0.98 (ground: slipperiness 0.6 x 0.98), a -0.5 bounce;
// ExperienceOrb: gravity 0.03, pulled toward a player within 8 blocks ((1 - d/8)^2 x 0.1), a -0.9
// bounce. A synced position snaps. A pickup ('collect') flies the item to the collector over 3 ticks
// (ItemPickupParticle), then it's gone: they froze at the spawn and blinked out (fortune f1613).
const THROWN = new Set(['ender_pearl', 'snowball', 'egg', 'splash_potion', 'lingering_potion', 'experience_bottle', 'potion'])
function simulateDrops (world) {
  const tl = rec.timeline || []
  const vel = new Map(), coll = new Map()
  for (const e of tl) {
    if (e.event === 'vel') { if (!vel.has(e.id)) vel.set(e.id, []); vel.get(e.id).push([Math.round(e.t / 50), e.vx, e.vy, e.vz]) }
    if (e.event === 'collect' && !coll.has(e.id)) coll.set(e.id, { t: Math.round(e.t / 50), by: e.by })
  }
  if (!vel.size) return
  const Block = require('prismarine-block')(rec.version)
  const changes = new Map()
  for (const b of rec.blocks || []) { const k = `${b[1]},${b[2]},${b[3]}`; if (!changes.has(k)) changes.set(k, []); changes.get(k).push(b) }
  const solid = (x, y, z, tick) => {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z)
    let b = null
    const ch = changes.get(`${bx},${by},${bz}`)
    if (ch) { for (const c of ch) if (c[0] <= tick) { try { b = Block.fromStateId(c[4], 0) } catch (e) {} } }
    if (!b) b = world.getBlock(new Vec3(bx, by, bz))
    return !!(b && b.boundingBox === 'block')
  }
  const rowsOf = new Map()
  for (const tick of [...ENT.keys()].sort((a, b) => a - b)) for (const [id, row] of ENT.get(tick)) if (vel.has(id) && (row[2] === 'item' || row[2] === 'experience_orb' || THROWN.has(row[2]))) { if (!rowsOf.has(id)) rowsOf.set(id, []); rowsOf.get(id).push(row) }
  let n = 0
  for (const [id, rows] of rowsOf) {
    const orb = rows[0][2] === 'experience_orb', thrown = THROWN.has(rows[0][2]), vs = vel.get(id)
    let x = rows[0][3], y = rows[0][4], z = rows[0][5], vx = 0, vy = 0, vz = 0, onGround = false, vi = 0, last = rows[0]
    const t0 = rows[0][0], t1 = rows[rows.length - 1][0]
    const byTick = new Map(rows.map(r => [r[0], r]))
    for (let tick = t0; tick <= t1; tick++) {
      while (vi < vs.length && vs[vi][0] <= tick) { [, vx, vy, vz] = vs[vi++] }
      const row = byTick.get(tick)
      if (row && (row[3] !== last[3] || row[4] !== last[4] || row[5] !== last[5])) { x = row[3]; y = row[4]; z = row[5] }   // a sync
      if (row) last = row
      if (row) { const r = row.slice(); r[3] = x; r[4] = y; r[5] = z; ENT.get(tick).set(id, r) }
      // the tick's physics. Thrown projectiles (ThrowableProjectile.tick): move by the velocity, then
      // x 0.99 and y - 0.03; it stops where it hits (the server removes it a tick later). They sat at
      // the thrower's eye until the first position sync, ~9 ticks (worker 15, noob_pro_hacker)
      if (thrown) {
        if (solid(x + vx, y + vy, z + vz, tick)) { vx = vy = vz = 0; continue }
        x += vx; y += vy; z += vz; vx *= 0.99; vy = vy * 0.99 - 0.03; vz *= 0.99
        continue
      }
      if (orb) {
        vy -= 0.03
        const p = P[Math.min(P.length - 1, tick)]
        if (p) { const dx = p[1] - x, dy = p[2] + EYE / 2 - y, dz = p[3] - z, d = Math.hypot(dx, dy, dz); if (d < 8 && d > 1e-6) { const k = (1 - d / 8) ** 2 * 0.1; vx += dx / d * k; vy += dy / d * k; vz += dz / d * k } }
      } else vy -= 0.04
      if (solid(x + vx, y + 0.05, z, tick)) vx = 0
      if (solid(x, y + 0.05, z + vz, tick)) vz = 0
      x += vx; z += vz
      onGround = false
      if (vy < 0 && solid(x, y + vy, z, tick)) { y = Math.floor(y + vy) + 1; onGround = true } else if (vy > 0 && solid(x, y + 0.25 + vy, z, tick)) vy = 0; else y += vy
      const f = onGround ? 0.6 * 0.98 : 0.98
      vx *= f; vy *= 0.98; vz *= f
      if (onGround && vy < 0) vy *= orb ? -0.9 : -0.5
      if (onGround && Math.abs(vy) < 0.005) vy = 0
    }
    // picked up: ItemPickupParticle, 3 ticks from the item to the collector's position + 0.5 (eased f^2)
    const c = coll.get(id)
    if (c) {
      const from = [x, y, z]
      for (let k = 0; k <= 3; k++) {
        const tick = c.t + k
        let tx, ty, tz
        if (c.by === 'self') { const p = P[Math.min(P.length - 1, tick)]; if (!p) break; [tx, ty, tz] = [p[1], p[2] + 0.5, p[3]] } else { const cr = ENT.get(tick) && ENT.get(tick).get(c.by); if (!cr) break; [tx, ty, tz] = [cr[3], cr[4] + 0.5, cr[5]] }
        const f = (k / 3) ** 2
        if (!ENT.has(tick)) ENT.set(tick, new Map())
        const r = last.slice(); r[0] = tick; r[3] = from[0] + (tx - from[0]) * f; r[4] = from[1] + (ty - from[1]) * f; r[5] = from[2] + (tz - from[2]) * f
        if (k < 3) ENT.get(tick).set(id, r); else ENT.get(tick).delete(id)
      }
    }
    n++
  }
  if (n) console.log(`simulated ${n} dropped item / xp orb paths`)
}
let solidWorld = null   // set once the mesher exists

// after a respawn mark the respawn teleport can land a few ticks late: until it does, the pose is
// still the death spot (in lava, at the bottom of the fall), which showed for 1-2 frames after the
// death screen closed (worker 5, story_respawn_tax f367, f641). Show the spawn pose from the mark on.
const RESPAWN_SNAP = []
for (const d of DEATHS) {
  if (!Number.isFinite(d[1])) continue
  const R = d[1]
  for (let i = Math.floor(R) + 1; i < Math.min(P.length, Math.floor(R) + 12); i++) {
    const a = P[i - 1], b = P[i]
    if ((b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2 + (b[3] - a[3]) ** 2 > 64) { RESPAWN_SNAP.push([R, i]); break }
  }
}
function camAt (t) {
  const snap = RESPAWN_SNAP.find(([a, b]) => t >= a && t < b)
  if (snap) {
    const q = P[snap[1]]
    return { x: q[1], y: q[2] + EYE, z: q[3], yaw: q[4], pitch: q[5], roll: 0, bobX: 0, bobY: 0, bobPitch: 0 }
  }
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

// cut marks (harness: every /tp while recording; stunts may mark 'cut' themselves): a pose step of
// more than 0.8 blocks within 4 ticks after one is a hard cut, never a glide (below the 4-block rule)
const CUT_TICKS = (rec.timeline || []).filter(e => e.event === 'cut' || e.event === 'respawn').map(e => e.t / 50)
// ...and a turn of over 20 degrees in one tick right after a cut or respawn is the server's
// rotation landing a tick late: snap it too (tries: the view whipped down from the sky on respawn)
const isCutStep = (i, a, b) => {
  const d = Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3])
  if (d > 4) return true
  if (!CUT_TICKS.some(c => i + 1 >= c && i + 1 <= c + 4)) return false
  let dy = Math.abs(b[4] - a[4]) % (2 * Math.PI); if (dy > Math.PI) dy = 2 * Math.PI - dy
  return d > 0.8 || dy > 0.35 || Math.abs(b[5] - a[5]) > 0.35
}
// slow pans: the recorded yaw/pitch of a slow look steps unevenly (held for 1-3 ticks, then a
// catch-up; sometimes a tick back), which froze the view for 3-9 frames mid-pan (worker 5,
// story_runaway r4). Where every step in a +-2 tick window is under 0.03 rad (1.7 degrees) and there
// is no cut, the camera uses a 1-2-3-2-1 average; fast turns and cuts stay as recorded
const SMOOTH = (() => {
  const n = P.length, yaw = new Float64Array(n), pitch = new Float64Array(n)
  const uw = [P[0][4]]
  for (let i = 1; i < n; i++) { let d = P[i][4] - P[i - 1][4]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; uw.push(uw[i - 1] + d) }
  const W = [1, 2, 3, 2, 1]
  for (let i = 0; i < n; i++) {
    yaw[i] = P[i][4]; pitch[i] = P[i][5]
    if (i < 2 || i > n - 3) continue
    let ok = true
    for (let k = i - 1; k <= i + 2 && ok; k++) {
      const a = P[k - 1], b = P[k]
      if (Math.abs(uw[k] - uw[k - 1]) >= 0.03 || Math.abs(b[5] - a[5]) >= 0.03 || Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) > 0.8) ok = false
    }
    if (!ok) continue
    let sy = 0, sp = 0
    for (let k = -2; k <= 2; k++) { sy += W[k + 2] * uw[i + k]; sp += W[k + 2] * P[i + k][5] }
    yaw[i] = P[i][4] + (sy / 9 - uw[i]); pitch[i] = sp / 9
  }
  return { yaw, pitch }
})()
// sneaking and sprinting (pose field 7 flags: 1 sneak, 2 sprint). Camera: the eye height eases
// halfway to its target each tick (standing 1.62, crouching 1.27); GameRenderer: the FOV modifier eases
// the same way toward getFieldOfViewModifier (sprinting: (1.3 + 1) / 2 = 1.15, only while moving)
const HAS_FLAGS = P.some(q => q[7])
const EYEH = [], FOVM = []
{
  let eh = EYE, fm = 1
  for (let i = 0; i < P.length; i++) {
    const fl = P[i][7] || 0, moving = i > 0 && Math.hypot(P[i][1] - P[i - 1][1], P[i][3] - P[i - 1][3]) > 0.05
    eh += ((fl & 1 ? 1.27 : EYE) - eh) * 0.5
    fm += ((fl & 2 && moving ? 1.15 : 1) - fm) * 0.5
    EYEH.push(eh); FOVM.push(fm)
  }
}
function camAtLive (t) {
  const i = Math.min(P.length - 2, Math.max(0, Math.floor(t)))
  let a = P[i], b = P[i + 1], A = bobState[i], B = bobState[i + 1]
  let yaw0 = SMOOTH.yaw[i], yaw1 = SMOOTH.yaw[i + 1], pit0 = SMOOTH.pitch[i], pit1 = SMOOTH.pitch[i + 1]
  // a teleport (over 4 blocks in one tick) is a cut, never a glide through the in-between spots. The
  // tick before it keeps the motion going (extrapolated from i-1 -> i): holding pose i froze 3
  // frames before every hard cut (worker 5, story_runaway f1374)
  if (isCutStep(i, a, b)) {
    const p0 = i > 0 ? P[i - 1] : null
    if (p0 && !isCutStep(i - 1, p0, a)) {
      b = a.map((v, k) => k >= 1 && k <= 5 ? v + (v - p0[k]) : v)
      let dy = SMOOTH.yaw[i] - SMOOTH.yaw[i - 1]; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      yaw1 = yaw0 + dy; pit1 = pit0 + (pit0 - SMOOTH.pitch[i - 1])
      const A0 = bobState[i - 1]; B = { walk: A.walk + (A.walk - A0.walk), bob: A.bob + (A.bob - A0.bob) }
    } else { b = a; B = A; yaw1 = yaw0; pit1 = pit0 }
  }
  const f = Math.min(1, Math.max(0, t - i))
  const g = A.walk + (B.walk - A.walk) * f, h = A.bob + (B.bob - A.bob) * f
  return {
    x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f + (HAS_FLAGS ? EYEH[i] + (EYEH[Math.min(EYEH.length - 1, i + 1)] - EYEH[i]) * f : EYE), z: a[3] + (b[3] - a[3]) * f,
    fov: HAS_FLAGS ? 70 * (FOVM[i] + (FOVM[Math.min(FOVM.length - 1, i + 1)] - FOVM[i]) * f) : undefined,
    yaw: lerpAngle(yaw0, yaw1, f), pitch: pit0 + (pit1 - pit0) * f,
    bobX: Math.sin(g * Math.PI) * h * 0.5,
    bobY: -Math.abs(Math.cos(g * Math.PI) * h),
    roll: Math.sin(g * Math.PI) * h * 3 * Math.PI / 180,
    bobPitch: Math.abs(Math.cos(g * Math.PI - 0.2) * h) * 5 * Math.PI / 180
  }
}

;(async () => {
  const mesher = new Mesher(rec.version)
  mesher.noSky = DIM === 'the_nether' || DIM === 'the_end'
  mesher.addColumns(rec.columns)
  solidWorld = mesher.world
  hmapWorld = mesher.world
  simulateDrops(mesher.world)
  mesherRef = mesher
  // LINT=1: check every shot's geometry against the recording and stop, no browser (renderer/lint.js)
  if (process.env.LINT) {
    const n = require('./renderer/lint').run({ rec, stunt: STUNT_MOD, marks: SHOT_MARKS, shots: SHOTS, shotCam, camAt, targetAt, actorsAt, lines: LINES, mesher, Vec3 })
    process.exit(n ? 1 : 0)
  }
  // CAM_PROBE=all|t1,t2,...: print the camera of those ticks (one JSON line each) and stop, no browser. The same
  // director the frames use (shot marks, shotCam, auto-framing, stunt.self's eye), so lib/hb (hb describe /
  // continuity / framing) can reason about camera shots it can't compute itself. Block changes aren't applied:
  // a camera pulled out of a block placed mid-recording may differ slightly.
  if (process.env.CAM_PROBE) {
    const solidAt = (x, y, z) => { const b = mesher.world.getBlock(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z))); return !!(b && b.boundingBox === 'block') }
    const ticks = process.env.CAM_PROBE === 'all' ? P.map((_, i) => i) : process.env.CAM_PROBE.split(',').map(Number)
    const r3 = (v) => Math.round(v * 1000) / 1000
    const lines = []
    for (const t of ticks) {
      const sh = shotAt(t)
      let c = sh && !sh.pov ? shotCam(sh, t, solidAt) : null
      const mode = c ? `shot ${sh.name}` : sh ? `shot ${sh.name} (pov)` : 'pov'
      if (!c) { c = camAt(t); const s = selfAt(t); if (s && s.eye) c = { ...c, y: c.y - (EYE - s.eye) } }
      lines.push(JSON.stringify({ t, mode, x: r3(c.x), y: r3(c.y), z: r3(c.z), yaw: r3(c.yaw), pitch: r3(c.pitch), fov: c.fov || 70 }))
    }
    process.stdout.write(lines.join('\n') + '\n')
    process.exit(0)
  }

  const app = express()
  const blobs = new Map(); let blobId = 0
  app.get('/mesh/:id', (req, res) => { const b = blobs.get(req.params.id); blobs.delete(req.params.id); res.type('application/octet-stream').send(b) })
  app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'page.html')))
  app.get('/page.js', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'page.js')))
  app.get('/entities.js', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'entities.js')))
  app.get('/blockentities.js', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'blockentities.js')))
  app.get('/entity_models.json', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'entity_models.json')))
  app.use('/three', express.static(path.join(__dirname, 'node_modules', 'three', 'build')))
  // our own player skins (skins/, scripts/make_skins.py) beside the jar's: stunt.cast names either; <skin>_glow.png lights a part full bright
  app.use('/assets/env/entity/player/wide', express.static(path.join(__dirname, 'skins')))
  app.use('/assets', express.static(path.join(__dirname, 'work', 'assets', rec.version)))
  const server = http.createServer(app)
  await new Promise(r => server.listen(0, '127.0.0.1', r))

  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const page = await browser.newPage({ viewport: { width: MW, height: H }, deviceScaleFactor: 1 })
  page.on('pageerror', e => console.error('page error:', e.message))
  page.on('console', m => { if (m.type() === 'error') console.error('page:', m.text()) })
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForFunction(() => window.HB_READY)
  if (process.env.DEBUG_MAGENTA) await page.evaluate(() => { window.DEBUG_MAGENTA = true })

  if (process.env.DEBUG_NOSUN) await page.evaluate(() => { window.DEBUG_NOSUN = true })
  if (process.env.DEBUG_NOFAN) await page.evaluate(() => { window.DEBUG_NOFAN = true })
  { // the enchantment glint texture (not in the asset build)
    const gl = path.join(ASSETS_DIR, 'env', 'misc', 'enchanted_glint_item.png')
    if (!fs.existsSync(gl)) {
      try { fs.mkdirSync(path.dirname(gl), { recursive: true }); require('child_process').execFileSync('python3', ['-c', `import zipfile,sys;open(sys.argv[2],'wb').write(zipfile.ZipFile(sys.argv[1]).read('assets/minecraft/textures/misc/enchanted_glint_item.png'))`, path.join(__dirname, 'work', 'client', `${rec.version}.jar`), gl]) } catch (e) { console.error('no glint texture:', e.message) }
    }
  }
  { // the vanilla font (sign text; not in the asset build)
    const fnt = path.join(ASSETS_DIR, 'env', 'font', 'ascii.png')
    if (!fs.existsSync(fnt)) {
      try { fs.mkdirSync(path.dirname(fnt), { recursive: true }); require('child_process').execFileSync('python3', ['-c', `import zipfile,sys;open(sys.argv[2],'wb').write(zipfile.ZipFile(sys.argv[1]).read('assets/minecraft/textures/font/ascii.png'))`, path.join(__dirname, 'work', 'client', `${rec.version}.jar`), fnt]) } catch (e) { console.error('no font texture:', e.message) }
    }
  }
  { // the entity shadow texture (not in the asset build)
    const sh = path.join(ASSETS_DIR, 'env', 'misc', 'shadow.png')
    if (!fs.existsSync(sh)) {
      try { fs.mkdirSync(path.dirname(sh), { recursive: true }); require('child_process').execFileSync('python3', ['-c', `import zipfile,sys;open(sys.argv[2],'wb').write(zipfile.ZipFile(sys.argv[1]).read('assets/minecraft/textures/misc/shadow.png'))`, path.join(__dirname, 'work', 'client', `${rec.version}.jar`), sh]) } catch (e) { console.error('no shadow texture:', e.message) }
    }
  }
  { // the End sky texture (not in the asset build)
    const es = path.join(ASSETS_DIR, 'env', 'end_sky.png')
    if (!fs.existsSync(es)) {
      try { require('child_process').execFileSync('python3', ['-c', `import zipfile,sys;open(sys.argv[2],'wb').write(zipfile.ZipFile(sys.argv[1]).read('assets/minecraft/textures/environment/end_sky.png'))`, path.join(__dirname, 'work', 'client', `${rec.version}.jar`), es]) } catch (e) { console.error('no end sky texture:', e.message) }
    }
  }
  { // the snow texture (weather; not in the asset build)
    const snow = path.join(ASSETS_DIR, 'env', 'snow.png')
    if (!fs.existsSync(snow)) {
      try { require('child_process').execFileSync('python3', ['-c', `import zipfile,sys;open(sys.argv[2],'wb').write(zipfile.ZipFile(sys.argv[1]).read('assets/minecraft/textures/environment/snow.png'))`, path.join(__dirname, 'work', 'client', `${rec.version}.jar`), snow]) } catch (e) { console.error('no snow texture:', e.message) }
    }
  }
  { // the moon texture (assets built before night support lack it)
    const moon = path.join(ASSETS_DIR, 'env', 'moon.png')
    if (!fs.existsSync(moon)) {
      try { require('child_process').execFileSync('python3', ['-c', `import zipfile,sys;open(sys.argv[2],'wb').write(zipfile.ZipFile(sys.argv[1]).read('assets/minecraft/textures/environment/celestial/moon/full_moon.png'))`, path.join(__dirname, 'work', 'client', `${rec.version}.jar`), moon]) } catch (e) { console.error('no moon texture:', e.message) }
    }
  }
// look.reflect is given from the set origin (dy, center [dx, dz]); the page wants world coordinates
  function worldLook (L) {
    if (!L || !L.reflect || !rec.set) return L
    const r = L.reflect, c = r.center || [0, 0]
    return { ...L, reflect: { ...r, y: rec.set.y + (r.dy ?? 1), cx: rec.set.x + c[0] + 0.5, cz: rec.set.z + c[1] + 0.5 } }
  }
  await page.evaluate((o) => window.HB.init(o), { renderDistance: Number(process.env.RENDER_DISTANCE || STUNT_MOD.renderDistance || 8), clouds: STUNT_MOD.clouds !== false, fogSea: STUNT_MOD.fogSea || null, look: worldLook((process.env.LOOK === '0' ? null : process.env.LOOK_JSON ? JSON.parse(process.env.LOOK_JSON) : STUNT_MOD.look) || null) })

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
  // the whole area meshed again (the first mesh, and every change of the lightmap's sky factor: time of
  // day, rain), split over worker threads (MESH_WORKERS, default: the core count, at most 4); each slice is
  // byte-identical to meshing it here. 1 = the old single thread. A worker rebuilds the world from the
  // recording plus the first `blocksDone` block changes, so it meshes the world as it is now (one full
  // re-mesh was ~38 s on one core for story_nitwit's 391 columns, and its sunset had 14 of them).
  const sendAll = async (blocksDone, t) => {
    const list = mesher.sections(minVisibleY)
    const nw = Math.max(1, Math.min(list.length, Number(process.env.MESH_WORKERS || Math.min(4, require('os').cpus().length))))
    if (nw > 1) {
      const blobsOut = await mesher.packParallel(list, nw, { recPath: path.resolve(recPath), minVisibleY, brightness: Number(process.env.BRIGHTNESS ?? STUNT_MOD.brightness ?? 0.5), dayTime: dayTimeAt(t), rain: weatherLight(t)[0], thunder: weatherLight(t)[1], dimension: DIM, blocksDone })
      for (const b of blobsOut) { const id = String(blobId++); blobs.set(id, b); await page.evaluate((u) => window.HB.loadMeshes(u), `/mesh/${id}`) }
    } else await send(list)
  }
  await sendAll(0, 0)
  console.log(`meshed + uploaded world in ${((Date.now() - t0) / 1000).toFixed(1)} s`)

  // particles from recorded events (block crumbs use the block's particle texture in the atlas)
  const PARTS = []
  const mcDataR = require('minecraft-data')(rec.version)
  for (let ev of (rec.timeline || []).filter(e => e.event === 'particles')) {
    // a drip (obsidian tear) falls to the first solid block below its face
    if (ev.type === 'obsidian_tear' && ev.floorY === undefined) {
      let fy = null
      for (let y = Math.floor(ev.y) - (ev.y % 1 === 0 ? 1 : 0); y > ev.y - 64; y--) { const b = mesher.world.getBlock(new Vec3(Math.floor(ev.x), y, Math.floor(ev.z))); if (b && b.boundingBox === 'block') { fy = y + 1; break } }
      ev = { ...ev, floorY: fy }
    }
    let bt = null
    if (ev.block) {
      const st = mesher.blockStates[ev.block]; const v = st && (st.variants ? Object.values(st.variants)[0] : st.multipart && st.multipart[0].apply); const m = Array.isArray(v) ? v[0] : v; bt = m && m.model && m.model.textures && m.model.textures.particle
      // TerrainParticle multiplies the crumbs by the block's tint (leaves foliage-green; worker 16)
      const tinted = !!(m && m.model && (m.model.elements || []).some(el => Object.values(el.faces || {}).some(f => f.tintindex !== undefined)))
      const tint = particleTint(mesher.world, new Vec3(Math.floor(ev.x), Math.floor(ev.y), Math.floor(ev.z)), ev.block, tinted)
      if (tint) ev = { ...ev, tint }
    }
    // an explosion from before the harness kept the packet's blockCount / particle: count the blocks
    // the recording turned to air within its radius over the next 3 ticks. None broken = the blast
    // kept its blocks (mobGriefing false), so the small explosion particle, not the emitter.
    if (ev.type === 'explosion' && (ev.blocks === undefined || ev.particle === undefined)) {
      const t0 = ev.t / 50, R = (ev.radius || 4) + 1
      const AIR = new Set(['air', 'cave_air', 'void_air'].map(n => mcDataR.blocksByName[n] && mcDataR.blocksByName[n].defaultState))
      const broke = (rec.blocks || []).filter(b => b[0] >= t0 - 1 && b[0] <= t0 + 3 && AIR.has(b[4]) && Math.hypot(b[1] + 0.5 - ev.x, b[2] + 0.5 - ev.y, b[3] + 0.5 - ev.z) <= R).length
      ev = { ...ev, blocks: ev.blocks ?? broke, particle: ev.particle ?? ((ev.radius || 4) >= 2 && broke > 0 ? 'explosion_emitter' : 'explosion') }
    }
    PARTS.push(...particles.spawn(ev, bt))
  }
  // firework rockets trail sparks while they fly (one per tick, from the recorded positions)
  // (the server sends a rocket's position only every few ticks: interpolate between the changes)
  {
    const byId = new Map()
    for (const row of rec.entities || []) if (row[2] === 'firework_rocket') { if (!byId.has(row[1])) byId.set(row[1], []); byId.get(row[1]).push(row) }
    for (const rows of byId.values()) {
      const keys = [rows[0]]
      for (const row of rows) { const l = keys[keys.length - 1]; if (row[3] !== l[3] || row[4] !== l[4] || row[5] !== l[5]) keys.push(row) }
      const last = rows[rows.length - 1]
      for (let i = 0; i + 1 < keys.length; i++) {
        const a = keys[i], b = keys[i + 1], n = b[0] - a[0]
        if (n <= 0) continue
        const vy = (b[4] - a[4]) / n
        for (let k = 0; k < n; k++) {
          const u = k / n
          PARTS.push(...particles.spawn({ type: 'firework_trail', t: (a[0] + k) * 50, x: a[3] + (b[3] - a[3]) * u, y: a[4] + (b[4] - a[4]) * u, z: a[5] + (b[5] - a[5]) * u, vy }))
        }
      }
      // after the last move, keep going at the last speed until the rocket is gone
      if (keys.length >= 2) {
        const a = keys[keys.length - 2], b = keys[keys.length - 1], n = Math.max(1, b[0] - a[0])
        for (let k = b[0]; k <= last[0]; k++) { const u = (k - b[0]) / n; PARTS.push(...particles.spawn({ type: 'firework_trail', t: k * 50, x: b[3] + (b[3] - a[3]) * u, y: b[4] + (b[4] - a[4]) * u, z: b[5] + (b[5] - a[5]) * u, vy: (b[4] - a[4]) / n })) }
      }
    }
  }
  // an eye going into a portal frame (LevelEvent 1503 END_PORTAL_FRAME_FILL): 16 small smoke puffs on
  // the frame top (x, z at (5 + r * 6) / 16, y + 0.8125), when the eye appears (use tick + 1)
  for (const m of (rec.timeline || []).filter(e => e.event === 'place' && e.eye && Number.isFinite(e.x))) {
    for (let k = 0; k < 16; k++) PARTS.push(...particles.spawn({ type: 'tnt_smoke', t: m.t + 50, x: Math.floor(m.x) + (5 + Math.random() * 6) / 16, y: Math.floor(m.y) + 0.8125, z: Math.floor(m.z) + (5 + Math.random() * 6) / 16 }))
  }
  // Blaze.aiStep (client): two large_smoke puffs a tick at random spots in its box (0.6 x 1.8)
  for (const row of rec.entities || []) {
    if (row[2] !== 'blaze') continue
    for (let k = 0; k < 2; k++) PARTS.push(...particles.spawn({ type: 'smoke', t: row[0] * 50, x: row[3], y: row[4] + Math.random() * 1.8 - 0.15, z: row[5], count: 1 }))
  }
  // note blocks (block action at a note_block): a note particle above it, hued by its pitch, unless the
  // instrument is a mob head (not tunable: NoteBlockInstrument.isTunable)
  {
    const Block = require('prismarine-block')(rec.version)
    const changes = new Map()
    for (const b of rec.blocks || []) { const k = `${b[1]},${b[2]},${b[3]}`; if (!changes.has(k)) changes.set(k, []); changes.get(k).push(b) }
    for (const e of (rec.timeline || []).filter(x => x.event === 'block_action')) {
      const tk = e.t / 50, k = `${e.x},${e.y},${e.z}`
      let blk = mesher.world.getBlock(new Vec3(e.x, e.y, e.z))
      for (const b of changes.get(k) || []) if (b[0] <= tk) { try { blk = Block.fromStateId(b[4], 0) } catch (err) {} }
      if (!blk || blk.name !== 'note_block') continue
      const pr = blk.getProperties()
      if (/^(skeleton|zombie|creeper|dragon|wither_skeleton|piglin|custom_head)$/.test(pr.instrument)) continue
      PARTS.push(...particles.spawn({ type: 'note', t: e.t, x: e.x + 0.5, y: e.y + 1.2, z: e.z + 0.5, note: Number(pr.note) || 0 }))
    }
  }
  // primed TNT puffs smoke every tick on the client (PrimedTnt.tick: ParticleTypes.SMOKE at y + 0.5);
  // so does a primed TNT minecart while its fuse runs (MinecartTNT.tick, 80 ticks from status 10)
  {
    for (const row of rec.entities || []) {
      const cp = row[2] === 'tnt_minecart' ? CART_PRIMED.get(row[1]) : undefined
      if (row[2] !== 'tnt' && !(cp !== undefined && row[0] >= cp && row[0] < cp + 80)) continue
      PARTS.push(...particles.spawn({ type: 'tnt_smoke', t: row[0] * 50, x: row[3], y: row[4] + 0.5, z: row[5] }))
    }
  }
  // an item breaking (LivingEntity.breakItem -> spawnItemParticles(stack, 5)): crumbs of the item's
  // sprite thrown from in front of the eye, on the entity.item.break sound
  for (const ev of (rec.timeline || []).filter(e => e.event === 'sound' && e.sound === 'entity.item.break')) {
    const t0 = ev.t / 50
    let name = null; for (const [tk, n] of HELD) { if (tk <= t0) name = n; else break }
    if (!name) for (const [tk, n] of HELD) if (tk < t0 + 2 && n) { name = n; break }
    const sp = name && spriteOf(name)
    const pose = P[Math.max(0, Math.min(P.length - 1, Math.floor(t0)))]
    if (!sp || !pose) continue
    PARTS.push(...particles.spawn({ type: 'item_break', t: ev.t, tex: sp, x: pose[1], y: pose[2] + EYE, z: pose[3], jyaw: Math.PI - pose[4], jpitch: -pose[5] }))
  }
  // starting to mine redstone ore (RedStoneOreBlock.attack -> spawnParticles): one redstone dust speck
  // 0.5625 out from the centre of each face not against a solid block, at a random spot on that face
  // (mining it showed nothing: worker 3)
  {
    const stateAt = (x, y, z, t) => { let s = null; for (const b of rec.blocks || []) { if (b[0] > t) break; if (b[1] === x && b[2] === y && b[3] === z) s = b[4] } if (s !== null) return mcDataR.blocks[require('prismarine-block')(rec.version).fromStateId(s, 0).type]; const b = mesher.world.getBlock(new Vec3(x, y, z)); return b }
    const solidR = (b) => !!(b && b.boundingBox === 'block' && !b.transparent)
    let k = 0
    for (const [a, , x, y, z] of DIGS) {
      const b = stateAt(x, y, z, a)
      if (!b || !/^(deepslate_)?redstone_ore$/.test(b.name)) continue
      for (const [dx, dy, dz] of [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]]) {
        if (solidR(stateAt(x + dx, y + dy, z + dz, a))) continue
        const rr = () => ((Math.sin((++k) * 12.9898 + a * 78.233) * 43758.5453) % 1 + 1) % 1
        const px = dx ? 0.5 + 0.5625 * dx : rr(), py = dy ? 0.5 + 0.5625 * dy : rr(), pz = dz ? 0.5 + 0.5625 * dz : rr()
        PARTS.push(...particles.spawn({ type: 'dust', t: a * 50, x: x + px, y: y + py, z: z + pz, color: [1, 0, 0] }))
      }
    }
  }
  PARTS.sort((a, b) => a.t0 - b.t0)
  const MAXLIFE = PARTS.reduce((m, p) => Math.max(m, p.life || 0), 0) + 1
  const solidAt = (x, y, z) => { const b = mesher.world.getBlock(new Vec3(x, y, z)); return !!(b && b.isCube && !b.transparent) }
  const partsAt = (t, cam) => {
    const out = []
    if (process.env.NOPARTS) return out   // debug: frames without particles
    // PARTS is sorted by start tick: only those started within MAXLIFE ticks can be alive
    let lo = 0, hi = PARTS.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (PARTS[mid].t0 < t - MAXLIFE) lo = mid + 1; else hi = mid }
    for (let pi = lo; pi < PARTS.length && PARTS[pi].t0 <= t; pi++) {
      const p = PARTS[pi]
      const s = particles.state(p, t, solidAt); if (!s) continue
      // too close: a big sprite would fill the screen. Small ones (splash drops, crumbs) are fine up
      // to 0.25 blocks, or a splash right under the eye was culled away entirely
      if (cam && Math.hypot(s.x - cam.x, s.y - cam.y, s.z - cam.z) < (s.size <= 0.2 ? 0.25 : 1.0)) continue
      // light is computed once, before the stunt's block changes: crumbs of a just-broken block sit
      // in what was a solid (light 0) cell, so take the brightest of the cell and its neighbours
      let ls = 0, lb = 0
      for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const [sky, blk] = mesher.world.getLight(new Vec3(s.x + dx, s.y + dy, s.z + dz))
        ls = Math.max(ls, sky); lb = Math.max(lb, blk)
      }
      // still unlit (a hole dug into a wall: every neighbour was solid when light was computed):
      // light spreads in once the block is gone, so take the brightest within 2 blocks, minus the distance
      if (ls === 0 && lb === 0) {
        for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
          const [sky, blk] = mesher.world.getLight(new Vec3(s.x + dx, s.y + dy, s.z + dz))
          const d = Math.abs(dx) + Math.abs(dy) + Math.abs(dz)
          ls = Math.max(ls, sky - d); lb = Math.max(lb, blk - d)
        }
      }
      const l = p.bright ? [1, 1, 1] : lightmap(ls, lb)
      out.push({ x: s.x, y: s.y, z: s.z, size: s.size, tex: s.tex || p.tex, uv: p.uv, color: p.color.map((c, i) => c * l[i]) })
    }
    return out
  }
  if (PARTS.length) console.log(`${PARTS.length} particles`)
  fs.mkdirSync(outDir, { recursive: true })
  const ticks = P.length - 1, frames = Math.floor(ticks / 20 * FPS)
  // ONLY=t1,t2,... renders just those ticks (for checking looks quickly)
  // FRAMES=f1,f2,... renders just those video frames (at FPS) under their real numbers: f01234.png
  // stays frame 1234, so a sparse render drops into a full frames dir (worker 6, time-lapse edits)
  const frameList = process.env.FRAMES ? process.env.FRAMES.split(',').map(Number) : null
  const only = frameList ? frameList.map(f => f * 20 / FPS) : process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null
  let bi = 0
  const sentBlocks = new Set()
  let relightBB = null, lastRelight = -99
  // the baked vertex light only depends on the lightmap's sky factor (getSkyDarken from the time of day,
  // rain and thunder: models.setDayTime), so the world is re-meshed only when that changes. From noon to
  // ~11200 it stays 1: story_nitwit's 43-step sunset re-meshed the world 43 times (~38 s each on one
  // core), of which 29 drew exactly the same, and its last Actions slice took 12 min
  // A rain step (weatherKey: rain/thunder in 1/16ths) always re-lights. DAY_LIGHT_STEP=0.025 (scripts/cinematic.py) also
  // rounds the darkening at dusk and dawn to steps, re-meshing a moving sunset a few times instead of every frame.
  const DAY_STEP = Number(process.env.DAY_LIGHT_STEP || 0)
  const skyKey = (t) => { const d = dayInfo(dayTimeAt(t), ...weatherLight(t)).dark; return `${DAY_STEP ? Math.round(d / DAY_STEP) : d.toFixed(6)}|${weatherKey(t)}` }
  let curDayTime = dayTimeAt(0), curWeather = weatherKey(0), curSky = skyKey(0)
  const t1 = Date.now()
  // Block entities drawn by entity renderers (renderer/blockentities.js): signs with their text,
  // chests (lid from block_action marks), beds. Signs carry NBT in the chunk data and in
  // block_entity marks; chests and beds have none, so they're found by block state (sections whose
  // palette can't hold one are skipped).
  const BE = new Map()   // 'x,y,z' -> { x, y, z, nbt }
  const SKULL_TEX = { skeleton: ['entity/skeleton/skeleton', false], wither_skeleton: ['entity/skeleton/wither_skeleton', false], zombie: ['entity/zombie/zombie', true], creeper: ['entity/creeper/creeper', false], player: ['entity/player/wide/steve', true] }
  const skullOf = (name) => { const m = /^(skeleton|wither_skeleton|zombie|creeper|player)_(wall_)?(skull|head)$/.exec(name); return m && SKULL_TEX[m[1]] }
  const beKind = (name) => name === 'bell' ? 'bell' : /shulker_box$/.test(name) ? 'shulker' : /_wall_banner$/.test(name) ? 'wall_banner' : /_banner$/.test(name) ? 'banner' : skullOf(name) ? (/_wall_/.test(name) ? 'wall_skull' : 'skull') : /_wall_hanging_sign$/.test(name) ? 'wall_hanging' : /_hanging_sign$/.test(name) ? 'hanging' : /_wall_sign$/.test(name) ? 'wall_sign' : /_sign$/.test(name) ? 'sign' : /^(chest|trapped_chest|ender_chest)$/.test(name) ? 'chest' : /_bed$/.test(name) ? 'bed' : null
  const BE_STATES = new Set()
  for (const b of MC.blocksArray) if (beKind(b.name)) for (let sid = b.minStateId; sid <= b.maxStateId; sid++) BE_STATES.add(sid)
  {
    const v = new Vec3(0, 0, 0)
    for (const [key, col] of Object.entries(mesher.world.columns)) {
      const [cx, cz] = key.split(',').map(Number)
      ;(col.sections || []).forEach((sec, si) => {
        if (!sec || (sec.palette && !sec.palette.some(id => BE_STATES.has(id)))) return
        const y0 = mesher.minY + si * 16
        for (let y = y0; y < y0 + 16; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
          v.x = x; v.y = y; v.z = z
          if (BE_STATES.has(col.getBlockStateId(v))) BE.set(`${cx + x},${y},${cz + z}`, { x: cx + x, y, z: cz + z, nbt: null })
        }
      })
      for (const [k, nbt] of Object.entries(col.blockEntities || {})) {
        const [x, y, z] = k.split(',').map(Number), wk = `${cx + x},${y},${cz + z}`
        if (BE.has(wk)) BE.get(wk).nbt = nbt
      }
    }
  }
  const BE_MARKS = (rec.timeline || []).filter(e => e.event === 'block_entity').map(e => ({ t: e.t / 50, key: `${e.x},${e.y},${e.z}`, nbt: e.nbt }))
  let beMi = 0
  // ChestLidController: openness moves 0.1 a tick toward 1 while anyone looks in (block action b > 0)
  const LID = new Map()
  {
    const acts = new Map()
    for (const e of rec.timeline || []) if (e.event === 'block_action' && e.a === 1) { const k = `${e.x},${e.y},${e.z}`; if (!acts.has(k)) acts.set(k, []); acts.get(k).push([e.t / 50, e.b > 0]) }
    for (const [k, list] of acts) {
      const arr = []; let o = 0, open = false, i = 0
      for (let tick = 0; tick <= P.length + 2; tick++) { while (i < list.length && list[i][0] <= tick) open = list[i++][1]; arr.push(o); o = Math.max(0, Math.min(1, o + (open ? 0.1 : -0.1))) }
      LID.set(k, arr)
    }
  }
  // BellBlockEntity: a ring (block action 1, param = the struck face's 3D data value) shakes the bell
  // for 50 ticks; BellRenderer tips the body by sin(f / pi) / (4 + f / 3) toward that face's axis
  const BELL_RINGS = new Map()
  for (const e of rec.timeline || []) if (e.event === 'block_action' && e.a === 1) { const k = `${e.x},${e.y},${e.z}`; if (!BELL_RINGS.has(k)) BELL_RINGS.set(k, []); BELL_RINGS.get(k).push([e.t / 50, e.b]) }
  const bellSwing = (k, t) => {
    const list = BELL_RINGS.get(k); if (!list) return null
    let r = null; for (const x of list) if (x[0] <= t) r = x
    if (!r || t - r[0] >= 50) return null
    const f = t - r[0], f3 = Math.sin(f / Math.PI) / (4 + f / 3)
    const dir = ['down', 'up', 'north', 'south', 'west', 'east'][r[1]]
    const xr = dir === 'north' ? -f3 : dir === 'south' ? f3 : 0, zr = dir === 'east' ? -f3 : dir === 'west' ? f3 : 0
    return [+xr.toFixed(4), +zr.toFixed(4)]
  }
  const lidAt = (k, t) => { const a = LID.get(k); if (!a) return 0; const i = Math.max(0, Math.min(a.length - 2, Math.floor(t))), f = t - i; return a[i] + (a[i + 1] - a[i]) * Math.max(0, Math.min(1, f)) }
  // DyeColor.getTextColor; a sign without glowing text darkens it to 0.4 (SignRenderer.getDarkColor)
  const DYE_TEXT = { white: 0xFFFFFF, orange: 0xFF681F, magenta: 0xFF00FF, light_blue: 0x9AC0CD, yellow: 0xFFFF00, lime: 0xBFFF00, pink: 0xFF69B4, gray: 0x808080, light_gray: 0xD3D3D3, cyan: 0x00FFFF, purple: 0xA020F0, blue: 0x0000FF, brown: 0x8B4513, green: 0x00FF00, red: 0xFF0000, black: 0x000000 }
  const nbtVal = (n) => n && typeof n === 'object' && 'value' in n && 'type' in n ? n.value : n
  const plainText = (c) => {   // a text component (1.21.5+: a string is literal text) -> plain text
    c = nbtVal(c)
    if (typeof c === 'string') return c
    if (Array.isArray(c)) return c.map(plainText).join('')
    if (c && typeof c === 'object') return (plainText(c.text) || '') + (c.extra ? plainText(c.extra) : '')
    return ''
  }
  const signFace = (nbt) => {
    const ft = nbtVal(nbtVal(nbt) && nbtVal(nbt).front_text) || {}
    let msgs = nbtVal(ft.messages); msgs = msgs && (Array.isArray(msgs) ? msgs : nbtVal(msgs)) || []
    const glow = !!nbtVal(ft.has_glowing_text), hex = DYE_TEXT[nbtVal(ft.color) || 'black'] ?? 0
    const k = glow ? 1 : 0.4
    return { text: [0, 1, 2, 3].map(i => plainText(msgs[i] ?? '').slice(0, 30)), textColor: [((hex >> 16) & 255) / 255 * k, ((hex >> 8) & 255) / 255 * k, (hex & 255) / 255 * k] }
  }
  const FACING_DEG = { south: 0, west: 90, north: 180, east: 270 }
  const BANNER_DYE = { white: 0xF9FFFE, orange: 0xF9801D, magenta: 0xC74EBD, light_blue: 0x3AB3DA, yellow: 0xFED83D, lime: 0x80C71F, pink: 0xF38BAA, gray: 0x474F52, light_gray: 0x9D9D97, cyan: 0x169C9C, purple: 0x8932B8, blue: 0x3C44AA, brown: 0x835432, green: 0x5E7C16, red: 0xB02E26, black: 0x1D1D21 }
  let beLast = ''
  const blockEntitiesAt = (t, cam) => {
    while (beMi < BE_MARKS.length && BE_MARKS[beMi].t <= t) { const m = BE_MARKS[beMi++]; if (BE.has(m.key)) BE.get(m.key).nbt = m.nbt; else BE.set(m.key, { ...m, x: +m.key.split(',')[0], y: +m.key.split(',')[1], z: +m.key.split(',')[2] }) }
    const out = []
    for (const [key, e] of BE) {
      if (Math.abs(e.x - cam.x) > 96 || Math.abs(e.z - cam.z) > 96) continue
      const b = mesher.world.getBlock(new Vec3(e.x, e.y, e.z)), kind = b && beKind(b.name)
      if (!kind) continue
      const pr = b.getProperties ? b.getProperties() : {}
      const [ls, lb] = mesher.world.getLight(new Vec3(e.x, e.y, e.z))
      const o = { key, kind, x: e.x, y: e.y, z: e.z, light: lightmap(ls, lb).map(v => +v.toFixed(3)) }
      if (kind === 'sign') Object.assign(o, { rot: Number(pr.rotation || 0) * 22.5, wood: b.name.replace(/_sign$/, '') }, signFace(e.nbt))
      if (kind === 'wall_sign') Object.assign(o, { rot: FACING_DEG[pr.facing] || 0, wood: b.name.replace(/_wall_sign$/, '') }, signFace(e.nbt))
      if (kind === 'hanging') Object.assign(o, { rot: Number(pr.rotation || 0) * 22.5, attached: pr.attached === true || pr.attached === 'true', wood: b.name.replace(/_hanging_sign$/, '') }, signFace(e.nbt))
      if (kind === 'wall_hanging') Object.assign(o, { rot: FACING_DEG[pr.facing] || 0, wood: b.name.replace(/_wall_hanging_sign$/, '') }, signFace(e.nbt))
      if (kind === 'bell') { const sw = bellSwing(key, t); if (sw) o.swing = sw }
      if (kind === 'chest') {
        const type = pr.type || 'single', base = b.name === 'trapped_chest' ? 'trapped' : b.name === 'ender_chest' ? 'ender' : 'normal'
        // a double chest opens both halves (DoubleBlockCombiner): the brighter of the two lids
        let open = lidAt(key, t)
        if (type !== 'single') for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) open = Math.max(open, lidAt(`${e.x + dx},${e.y},${e.z + dz}`, t))
        Object.assign(o, { rot: FACING_DEG[pr.facing] || 0, type, tex: type === 'single' || base === 'ender' ? base : `${base}_${type}`, open: +open.toFixed(3) })
      }
      if (kind === 'skull') Object.assign(o, { rot: (Number(pr.rotation || 0) * 22.5 + 180) % 360, tex: skullOf(b.name)[0], humanoid: skullOf(b.name)[1] })
      // skull yaw in our chain (checked by eye): the face points north at 0, so a floor skull adds 180 to
      // its rotation (rotation 8 faces north) and a wall skull adds 180 to its facing
      if (kind === 'wall_skull') Object.assign(o, { rot: ((FACING_DEG[pr.facing] || 0) + 180) % 360, facing: pr.facing, tex: skullOf(b.name)[0], humanoid: skullOf(b.name)[1] })
      if (kind === 'shulker') Object.assign(o, { facing: pr.facing || 'up', tex: b.name === 'shulker_box' ? 'shulker' : 'shulker_' + b.name.replace(/_shulker_box$/, '') })
      // DyeColor.getTextureDiffuseColor for the flag; the wave runs on game time (one cycle per 100 ticks, stepped by 5 ticks to limit rebuilds)
      if (kind === 'banner' || kind === 'wall_banner') {
        const col = BANNER_DYE[b.name.replace(/_(wall_)?banner$/, '')] ?? 0xF9FFFE
        Object.assign(o, { rot: kind === 'banner' ? Number(pr.rotation || 0) * 22.5 : FACING_DEG[pr.facing] || 0, tint: [((col >> 16) & 255) / 255, ((col >> 8) & 255) / 255, (col & 255) / 255], wave: Math.floor(t / 5) * 5 % 100 })
      }
      if (kind === 'bed') Object.assign(o, { rot: FACING_DEG[pr.facing] || 0, head: pr.part === 'head', color: b.name.replace(/_bed$/, '') })
      out.push(o)
    }
    const j = JSON.stringify(out)
    if (j === beLast) return undefined
    beLast = j
    return out
  }
  // PROFILE=1: where the time goes, per section, printed at the end
  const PROF = {}; let profT = 0
  const prof = (k) => { if (!process.env.PROFILE) return; const n = performance.now(); if (k) PROF[k] = (PROF[k] || 0) + n - profT; profT = n }
  for (let f = 0; f < (only ? only.length : frames); f++) {
    prof()
    const t = only ? only[f] : f * 20 / FPS
    // block changes due by this frame -> re-mesh the touched sections (and neighbours at edges)
    const dirty = new Map()
    let nChanged = 0, bb = null
    while (bi < rec.blocks.length && rec.blocks[bi][0] <= t) {
      const [, x, y, z, stateId] = rec.blocks[bi++]
      mesher.setBlock(x, y, z, stateId)
      HMAP.delete(`${x},${z}`)
      if (BE_STATES.has(stateId)) { if (!BE.has(`${x},${y},${z}`)) BE.set(`${x},${y},${z}`, { x, y, z, nbt: null }) } else BE.delete(`${x},${y},${z}`)
      nChanged++
      bb = bb ? [Math.min(bb[0], x), Math.min(bb[1], y), Math.min(bb[2], z), Math.max(bb[3], x), Math.max(bb[4], y), Math.max(bb[5], z)] : [x, y, z, x, y, z]
      for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const sx = Math.floor((x + dx) / 16) * 16, sy = Math.floor((y + dy) / 16) * 16, sz = Math.floor((z + dz) / 16) * 16
        dirty.set(`${sx},${sy},${sz}`, { key: `${sx},${sy},${sz}`, sx, sy, sz })
      }
    }
    // relight after block changes: light from before is wrong around them (a dug shaft stayed
    // pitch black, lava placed during a stunt lit nothing, crater walls stayed black). Any change
    // marks the light dirty; it's recomputed at once for big changes, else at most every 4 ticks.
    if (bb) relightBB = relightBB ? [Math.min(relightBB[0], bb[0]), Math.min(relightBB[1], bb[1]), Math.min(relightBB[2], bb[2]), Math.max(relightBB[3], bb[3]), Math.max(relightBB[4], bb[4]), Math.max(relightBB[5], bb[5])] : bb
    if (relightBB && (nChanged >= 24 || t - lastRelight >= 4)) {
      bb = relightBB; relightBB = null; lastRelight = t
      const Lw = mesher.world.light
      const L0 = Lw && { sky: Lw.sky, blk: Lw.blk, x0: Lw.x0, z0: Lw.z0, yMin: Lw.yMin }   // propagate() makes new arrays
      mesher.computeLight(minVisibleY)
      const L1 = mesher.world.light
      const mark = (sx, sy, sz) => { if (sy + 16 >= minVisibleY) dirty.set(`${sx},${sy},${sz}`, { key: `${sx},${sy},${sz}`, sx, sy, sz }) }
      if (L0 && L0.sky.length === L1.sky.length && L0.x0 === L1.x0 && L0.z0 === L1.z0 && L0.yMin === L1.yMin) {
        // re-mesh only the sections whose light changed (a section's mesh reads light one block past
        // its edges, so a changed cell marks the sections of its 26 neighbours too). Re-meshing the
        // bounding box of all changes re-did ~2000 sections per relight when a recording had block
        // changes scattered far apart (water_clutch: 12 s per relight)
        // (the arrays are ~35M cells for a 20x20-chunk recording: compare 4 kB blocks with memcmp first,
        // and only walk the blocks that differ; the plain loop was ~2 s per relight)
        const { SX, SZ, x0, z0, yMin } = L1, plane = SX * SZ, a0 = L0.sky, b0 = L0.blk, a1 = L1.sky, b1 = L1.blk
        const A0 = Buffer.from(a0.buffer, a0.byteOffset, a0.length), A1 = Buffer.from(a1.buffer, a1.byteOffset, a1.length)
        const B0 = Buffer.from(b0.buffer, b0.byteOffset, b0.length), B1 = Buffer.from(b1.buffer, b1.byteOffset, b1.length)
        const seen = new Set()
        const near = (v) => (v & 15) === 0 ? [(v - 1) >> 4, v >> 4] : (v & 15) === 15 ? [v >> 4, (v + 1) >> 4] : [v >> 4]
        for (let s0 = 0; s0 < a1.length; s0 += 4096) {
          const s1 = Math.min(a1.length, s0 + 4096)
          if (A1.compare(A0, s0, s1, s0, s1) === 0 && B1.compare(B0, s0, s1, s0, s1) === 0) continue
          for (let i = s0; i < s1; i++) {
            if (a0[i] === a1[i] && b0[i] === b1[i]) continue
            const x = x0 + i % SX, z = z0 + Math.floor(i / SX) % SZ, y = yMin + Math.floor(i / plane)
            // the sections of its 26 neighbours = its own, plus the next one over where it sits on an edge
            for (const qx of near(x)) for (const qy of near(y)) for (const qz of near(z)) {
              const k = `${qx},${qy},${qz}`
              if (!seen.has(k)) { seen.add(k); mark(qx * 16, qy * 16, qz * 16) }
            }
          }
        }
      } else {
        for (let sx = Math.floor((bb[0] - 16) / 16) * 16; sx <= bb[3] + 16; sx += 16) {
          for (let sy = Math.floor((bb[1] - 16) / 16) * 16; sy <= bb[4] + 16; sy += 16) {
            for (let sz = Math.floor((bb[2] - 16) / 16) * 16; sz <= bb[5] + 16; sz += 16) mark(sx, sy, sz)
          }
        }
      }
    }
    curDayTime = dayTimeAt(t); curWeather = weatherKey(t)   // the sky, sun, stars, fog and rain follow them every frame (page.js)
    if (skyKey(t) !== curSky) {   // the baked light changed (sky darkening from the time of day or the rain): re-light everything
      curSky = skyKey(t); setDayTime(curDayTime, ...weatherLight(t)); dirty.clear()
      const tr = Date.now()
      await sendAll(bi, t)
      if (process.env.PROFILE) console.log('sky factor', curSky, 'at', t.toFixed(1), ': re-meshed the world in', Date.now() - tr, 'ms')
    }
    prof('blocks+relight')
    if (dirty.size && process.env.PROFILE) console.log("send", t.toFixed(1), dirty.size)
    if (dirty.size) await send([...dirty.values()])
    prof('remesh+upload')
    const cam = camAt(t)
    cam.dayTime = curDayTime
    cam.rain = levelAt(RAIN, t); cam.thunder = levelAt(THUNDER, t)
    Object.assign(cam, darknessAt(t))
    cam.aim = AIMS.length && !process.env.CAM ? aimAt(t) : null   // first person only: in the third-person replay it showed as red bars under the player
    const eye = { ...cam }   // the player's own eye (the CAM override moves only the camera)
    // stunt.self.eye: the narrator isn't a player (story_good_boy: a wolf, eye 0.68): the POV camera sits at that
    // height over the feet. Only the camera moves; targeting and the body keep the player's eye.
    const selfNow = selfAt(t)
    if (selfNow && selfNow.eye) cam.y -= EYE - selfNow.eye
    // stunt.fovZoom [[EVENT[:s], EVENT[:s], SCALE]]: a sharp zoom rendered as a narrower FOV (a 2.2x crop
    // of the finished frame was a bicubic blur). Recording time; eases in 0.4 s, out 0.25 s after the end.
    // The first-person hand keeps its own camera, so it doesn't zoom. Not with CAM= (the replay pass).
    if (FOV_ZOOM.length && !process.env.CAM) {
      let z = 1
      for (const [a0, b0, sc] of FOV_ZOOM) {
        const u = t < a0 ? 0 : t < a0 + 8 ? (t - a0) / 8 : t <= b0 ? 1 : t < b0 + 5 ? 1 - (t - b0) / 5 : 0
        z = Math.max(z, 1 + (sc - 1) * u * u * (3 - 2 * u))
      }
      if (z > 1) cam.fov = 2 * Math.atan(Math.tan((cam.fov || 70) * Math.PI / 360) / z) * 180 / Math.PI
    }
    // CAM="dx,dy,dz,yawDeg,pitchDeg": a fixed camera relative to the set origin (no bob)
    // CAM=back[:dist] / CAM=front[:dist]: vanilla's F5 views (default 4 blocks), bob and hurt tilt kept
    if (process.env.CAM) {
      const m = /^(back|front)(?::([\d.]+))?$/.exec(process.env.CAM)
      if (m) { detachedCam.t = t; Object.assign(cam, detachedCam(eye, m[1], Number(m[2] || 4), mesher.world)) }
      else {
        const [dx, dy, dz, yw, pt] = process.env.CAM.split(',').map(Number)
        Object.assign(cam, { x: rec.set.x + dx, y: rec.set.y + dy, z: rec.set.z + dz, yaw: yw * Math.PI / 180, pitch: pt * Math.PI / 180, bobX: 0, bobY: 0, roll: 0, bobPitch: 0, fov: undefined })
      }
    }
    // the camera director (stunt.shots + 'shot' marks, above): a camera shot draws the player's body and
    // no hand, like CAM=; a POV shot is the plain first-person view
    const shotNow = process.env.CAM ? null : shotAt(t)
    cropNow = shotNow && !shotNow.pov && shotNow.cropX ? Math.max(-1, Math.min(1, shotNow.cropX)) : 0
    const camShot = !!(shotNow && !shotNow.pov)
    if (camShot) {
      const solidAt = (x, y, z) => { const b = mesher.world.getBlock(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z))); return !!(b && b.boundingBox === 'block') }
      const c = shotCam(shotNow, t, solidAt); if (c) Object.assign(cam, c); cam.aim = null
      // the cinematic look (stunt.look): letterbox bars and depth of field on camera shots (a shot's dof: false,
      // or { aperture, focus: TARGET }; the stunt's look.dof turns it on for every camera shot)
      const LK = process.env.LOOK_JSON ? JSON.parse(process.env.LOOK_JSON) : STUNT_MOD.look   // (LOOK_JSON='{...}': try a look on any recording)
      if (LK && !process.env.LOOK_OFF) {
        if (LK.letterbox && !process.env.NO_BARS) cam.bars = LK.letterbox   // (NO_BARS=1: a vertical Short from a movie scene)
        const dof = shotNow.dof ?? LK.dof
        // (NO_DOF=1: a quick render without depth of field)
        if (dof && c && c.focusDist && !process.env.NO_DOF) { cam.focus = c.focusDist; cam.aperture = (typeof dof === 'object' && dof.aperture) || (typeof LK.dof === 'object' && LK.dof.aperture) || 1 }
      }
    }
    const third = THIRD || camShot
    const inBlock = mesher.world.getBlock(new Vec3(cam.x, cam.y, cam.z))
    cam.underwater = !!(inBlock && inBlock.name === 'water')
    cam.inLava = !!(inBlock && inBlock.name === 'lava')
    const bio = inBlock && inBlock.biome && mesher.biomes[inBlock.biome.name]
    if (bio) { cam.sky = bio.sky; cam.fog = bio.fog; cam.waterFog = bio.water_fog }
    // block outline under the crosshair + the crack overlay while digging
    if (!DEATHS.find(([a, b]) => t >= a && t < b)) {
      cam.target = targetBlock(eye, mesher.world, entitiesAt(t, mesher))
      if (cam.target && cam.target.entity !== undefined) { cam.targetEntity = cam.target.entity; cam.target = null }
      if (third) cam.target = null   // (the hit outline is a first-person thing: a camera shot drew the player's targeted block, a box over the hole: ai_thin_ice)
      // an eye inside the targeted shape (a respawn inside a lantern post): the block is culled from
      // in there, and its outline's edges ran past the eye as lines from sky to ground (respawn_tax f1647)
      if (cam.target) {
        const [x0, y0, z0, x1, y1, z1] = cam.target.box, ex = eye.x - cam.target.x, ey = eye.y - cam.target.y, ez = eye.z - cam.target.z
        if (ex > x0 - 0.05 && ex < x1 + 0.05 && ey > y0 - 0.05 && ey < y1 + 0.05 && ez > z0 - 0.05 && ez < z1 + 0.05) cam.target = null
      }
      if (process.env.DEBUG_TARGET && cam.target) console.log("target", t, cam.target.x, cam.target.y, cam.target.z, JSON.stringify(cam.target.box), mesher.world.getBlock(new Vec3(cam.target.x, cam.target.y, cam.target.z))?.name)
      const dg = DIGS.find(([a, b]) => t >= a && t < b)
      if (dg) {
        const stage = Math.floor(Math.min(1, (t - dg[0]) / dg[5]) * 10) - 1
        // only on a block that's still there: under Haste the block breaks before the dig_end mark
        // arrives, and the overlay drawn over empty air read as lace with the sky through it
        const db = mesher.world.getBlock(new Vec3(dg[2], dg[3], dg[4]))
        if (stage >= 0 && db && !/^(air|cave_air|void_air|water|lava)$/.test(db.name)) cam.crack = { x: dg[2], y: dg[3], z: dg[4], uv: ATLAS_UV[`destroy_stage_${Math.min(9, stage)}`] }
      }
    }
    prof('camera+target')
    const ents = entitiesAt(t, mesher)
    // first-person held item
    const hd = HIDE_HAND || third || F1.some(([a, b]) => t >= a && t < b) ? null : handAt(t)
    if (hd) {
      const bl = MC.blocksByName[hd.name]
      const hasSprite = !!spriteOf(hd.name)
      const [hs, hb] = mesher.world.getLight(new Vec3(cam.x, cam.y, cam.z))
      // look.handLift (0..1): lift the first-person hand's light toward white, so a held item reads at night (at
      // midnight sky light 15 is about (0.22, 0.22, 0.45): reel 1's bucket read as a dark sleeve, review v2 B2)
      const lift = (HAND_LOOK && HAND_LOOK.handLift) || 0
      cam.hand = { key: hd.name, equip: hd.equip, swing: hd.swing, light: lightmap(hs, hb).map(v => v + (1 - v) * lift), glint: !!hd.name && glintAt(t), use: useAt(t, hd.name) }
      if (hasSprite) cam.hand.tex = spriteOf(hd.name)
      else if (specialItem(hd.name)) cam.hand.special = specialItem(hd.name)
      else if (bl) {
        cam.hand.state = bl.defaultState
        if (!sentBlocks.has(bl.defaultState)) { sentBlocks.add(bl.defaultState); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [bl.defaultState, mesher.meshSingle(bl.defaultState)]) }
      }
      // the hand goes with the death screen, which edit.py starts up to a frame before the death
      // tick and on the output frame grid: edit.py's death_start takes the first frame whose source time
      // is within one frame of the death, so hide it exactly 1 frame early (0: it showed under the screen,
      // drops f1972; 2: it vanished a frame before the screen, drops f1938)
      // (only when a death screen shows, a death of 0.5 s or more: with immediate respawn there is
      // none, and the hand vanished before each cut with the hearts still full: worker 3, tries f214)
      cam.dead = !!DEATHS.find(([a, b]) => t >= (b - a >= 10 ? a - 20 / FPS - 1e-6 : a) && t < b)
    }
    if (third) {   // the player's own body at the eye (the dead body until it's removed at deathTime 20)
      const dw = DEATHS.find(([a, b]) => t >= a && t < b), deathTime = dw ? t - dw[0] + 1 : 0
      // ItemInHandLayer draws the entity's current main-hand item at once: no first-person lowering
      // and raising (the placed boat stayed in the replay hand for ~3 ticks: boat_clutch v3 f1993)
      const ph = handAt(t)
      if (ph) { let cur = HELD.length ? HELD[0][1] : null; for (const [tk, n] of HELD) { if (tk <= t) cur = n; else break } ph.name = cur }
      if (deathTime < 21) {
        const i = Math.max(0, Math.min(P.length - 2, Math.floor(t))), f = Math.min(1, Math.max(0, t - i))
        const body = lerpAngle(PBODY[i], PBODY[i + 1], f), wk = [0, 1].map(k => PWALK[i][k] + (PWALK[i + 1][k] - PWALK[i][k]) * f)
        const [ls, lb] = mesher.world.getLight(new Vec3(eye.x, eye.y - EYE + 0.5, eye.z))
        let held = null
        if (ph && ph.name) {
          held = { key: ph.name + (glintAt(t) ? '#glint' : ''), display: thirdPersonDisplay(ph.name), glint: glintAt(t) }
          const bl = MC.blocksByName[ph.name]
          if (spriteOf(ph.name)) held.tex = spriteOf(ph.name)
          else if (specialItem(ph.name)) held.special = specialItem(ph.name)
          else if (bl) {
            held.state = bl.defaultState
            if (!sentBlocks.has(bl.defaultState)) { sentBlocks.add(bl.defaultState); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [bl.defaultState, mesher.meshSingle(bl.defaultState)]) }
          }
        }
        const sw = SWINGS.find(s0 => s0 <= t && t - s0 < 6)
        // stunt.self.model: seen from a camera shot, the narrator is that mob (a wolf with its collar), not a player
        if (selfNow && selfNow.model) ents.push({ id: -1, name: selfNow.model, x: eye.x, y: eye.y - (P[i][7] & 1 ? 1.27 : EYE), z: eye.z, yaw: body, pitch: eye.pitch, headYaw: eye.yaw, extra: selfNow.extra || null, light: lightmap(ls, lb), hurt: HURTS.some(h => t >= h.t && t - h.t < 10) })
        else ents.push({
          id: -1, name: 'player', x: eye.x, y: eye.y - (P[i][7] & 1 ? 1.27 : EYE), z: eye.z, yaw: dw ? PBODY[Math.min(PBODY.length - 1, Math.floor(dw[0]))] : body,
          pitch: eye.pitch + ((talkMotion(SELF_NAME, t) || {}).pitch || 0), headYaw: eye.yaw + ((talkMotion(SELF_NAME, t) || {}).yaw || 0),
          extra: { skin: process.env.SKIN || (STUNT_MOD.cast && STUNT_MOD.cast.self) || 'steve' }, light: lightmap(ls, lb),
          player: { walkPos: wk[0], walkSpeed: dw ? 0 : wk[1], attack: sw !== undefined ? (t - sw) / 6 : 0, holding: !!held, held, age: t, deathTime, hurt: HURTS.some(h => t >= h.t && t - h.t < 10), crouch: !!(P[i][7] & 1) }
        })
      }
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
      // the camera inside the block (it fell onto the player's head): vanilla culls the faces you'd
      // see from inside, so draw nothing rather than a screen of the block's dark underside
      if (Math.abs(cam.x - e.x) < 0.5 && Math.abs(cam.z - e.z) < 0.5 && cam.y > e.y - 0.05 && cam.y < e.y + 1.05) e.hidden = true
    }
    // dropped items right at the camera (a death scatters the inventory from the eyes): vanilla
    // throws them out of view at once; our 3-tick easing kept them in the lens for half a second
    for (const e of ents) if (e.name === 'item' && Math.hypot(e.x - cam.x, e.y + 0.25 - cam.y, e.z - cam.z) < 1.2) e.hidden = true
    // dropped items (ItemEntityRenderer): items with a flat sprite stay sprites; block items are a
    // quarter-size 3D block, bobbing sin(age/10)*0.1+0.1 and spinning age/20 rad
    for (const e of ents) {
      if (e.name !== 'item' || !e.extra || !e.extra.item) continue
      const it = e.extra.item
      if (spriteOf(it)) { e.extra = { ...e.extra, tex: spriteOf(it) }; if (GLINT_ITEMS.has(it)) e.extra.glint = true; continue }
      const bl = MC.blocksByName[it]
      const age = t - (FIRST_SEEN.get(e.id) ?? t)
      // special item models (beds, chests, heads, banners, shulker boxes): their block-entity model with
      // the 'ground' display (ItemEntityRenderer: bob sin(age/10)*0.1+0.1, plus the model's ground-scaled
      // lift, spin age/20 rad about y); the shadow stays the item's
      if (specialItem(it)) {
        const sp = specialItem(it), gs = (sp.display.ground && sp.display.ground.scale) || [1, 1, 1]
        e.shadowName = 'item'; e.shadowY = e.y
        e.y += Math.sin(age / 10 + (e.id % 7)) * 0.1 + 0.1 + 0.25 * gs[1]
        e.yaw = age / 20 + (e.id % 7)
        e.extra = { item: it, special: sp }
        continue
      }
      // an item we can't draw (shields, ...; no sprite and an empty block model): no model, so no
      // shadow either (a red bed was a lone shadow: every_clutch)
      if (!bl || blockModelEmpty(bl.defaultState)) { e.hidden = true; continue }
      // the shadow stays the item's (ItemEntityRenderer.shadowRadius 0.15, from the entity's own y,
      // not the bobbing model): drawn as a falling block it cast a 0.5 one, 3x vanilla (lapse_statue)
      e.shadowName = 'item'; e.shadowY = e.y
      e.name = 'falling_block'
      e.y += Math.sin(age / 10 + (e.id % 7)) * 0.1 + 0.1 + 0.125
      e.yaw = age / 20 + (e.id % 7)
      e.extra = { state: bl.defaultState, scale: 0.25, spin: true, glint: !!(e.extra.glint || GLINT_ITEMS.has(it)) }
    }
    for (const e of ents) if (POTION_COLOR.has(e.id)) e.extra = { ...(e.extra || {}), color: POTION_COLOR.get(e.id) }
    // an enderman's carried block: its model, sent once
    for (const e of ents) if (e.name === 'enderman' && e.extra && e.extra.carried && !sentBlocks.has(e.extra.carried)) { sentBlocks.add(e.extra.carried); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [e.extra.carried, mesher.meshSingle(e.extra.carried)]) }
    // item frames: the frame model (sent once per kind) and the held item with its 'fixed' display
    for (const e of ents) {
      if (e.name !== 'item_frame' && e.name !== 'glow_item_frame') continue
      const key = `frame:${e.name}`
      if (!sentBlocks.has(key)) { sentBlocks.add(key); const g = frameGeometry(e.name); if (g) await page.evaluate(([id, gg]) => window.HB.addBlockModel(id, gg), [key, g]) }
      const it = e.extra && e.extra.item
      let held = null
      if (it) {
        held = { key: it }
        const bl = MC.blocksByName[it]
        if (spriteOf(it)) held.tex = spriteOf(it)
        else if (specialItem(it)) held.special = specialItem(it)
        else if (bl) { held.state = bl.defaultState; if (!sentBlocks.has(bl.defaultState)) { sentBlocks.add(bl.defaultState); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [bl.defaultState, mesher.meshSingle(bl.defaultState)]) } }
        held.display = fixedDisplay(it)
      }
      e.frame = { model: key, dir: (e.extra && e.extra.dir) ?? 3, rot: (e.extra && e.extra.rot) || 0, held }
    }
    // mobs made to face the player by command (tp facing entity <bot> eyes) between face_on and
    // face_off marks: the recorded entity yaw lags the server by seconds, so face them here
    // the turn has to ease from the yaw the mob had BEFORE face_on: the bot sends tp facing every
    // tick, so the recorded yaw is already turned at face_on and easing from it did nothing (the
    // crowd still snapped in 3 frames: worker 2, staring_villagers). Remember each mob's last yaw
    // outside a face window, and the one it had when the window opened.
    for (const e of ents) {
      const inFace = FACE.some(([fa, fb]) => t > fa - 1 && t < fb)   // (fa - 1: frames between ticks already lerp toward the turned yaw)
      if (!inFace) { PRE_FACE.set(e.id, [t, e.yaw, e.headYaw ?? e.yaw, e.pitch]) }
    }
    for (const [fa0, fb, which] of FACE) {
      const fa = fa0 - 1   // from the last tick before face_on: the frames after it already interpolate toward the turned yaw
      // after face_off the mobs turn back to their recorded look over the same 3 ticks (head 2): the
      // party ring flipped away in one frame (worker 5, story_runaway f1931)
      if (t >= fb && t < fb + 3) {
        for (const e of ents) {
          if (which ? !((which.ids && which.ids.includes(e.id)) || (which.near && Math.hypot(e.x - which.near[0], e.z - which.near[1]) <= which.near[2])) : e.name !== 'villager') continue
          const dx = cam.x - e.x, dz = cam.z - e.z, dy = cam.y - (e.y + 1.62)
          const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz))
          const kb = Math.min(1, (t - fb) / 3), kh = Math.min(1, (t - fb) / 2)
          if (!(which && which.head)) e.yaw = lerpAngle(yaw, e.yaw, kb)
          e.headYaw = lerpAngle(yaw, e.headYaw ?? e.yaw, kh)
          e.pitch = pitch + (e.pitch - pitch) * kh
        }
        continue
      }
      if (t <= fa || t >= fb) continue
      for (const e of ents) {
        if (which ? !((which.ids && which.ids.includes(e.id)) || (which.near && Math.hypot(e.x - which.near[0], e.z - which.near[1]) <= which.near[2])) : e.name !== 'villager') continue
        const dx = cam.x - e.x, dz = cam.z - e.z, dy = cam.y - (e.y + 1.62)
        const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz))
        // the turn eases like Entity.lerpTo (3 ticks), head leading the body (2 ticks): a one-frame
        // 180 flip of the whole crowd read as a glitch (frame review, staring_villagers)
        const fb = Math.min(1, (t - fa) / 3), fh = Math.min(1, (t - fa) / 2)
        // the start: the mob's look on the last frame before face_on (within a second of it), else as recorded
        const pre = PRE_FACE.get(e.id), ok = pre && pre[0] <= fa && fa - pre[0] <= 20
        const by = ok ? pre[1] : e.yaw, hy = ok ? pre[2] : (e.headYaw ?? e.yaw), p0 = ok ? pre[3] : e.pitch
        if (!(which && which.head)) e.yaw = lerpAngle(by, yaw, fb)   // head: true = LookAtPlayerGoal, only the head follows
        e.headYaw = lerpAngle(hy, yaw, fh)
        e.pitch = p0 + (pitch - p0) * fh
      }
    }
    // mobs never walk into the player: the server and client push overlapping entities apart, but
    // the bot (mineflayer) has no entity push, so a creeper could end up inside the camera. Keep
    // mobs at least their half width + the player's (0.3 + 0.3) plus a little, horizontally.
    for (const e of ents) {
      if (['player', 'mannequin', 'item_frame', 'glow_item_frame', 'falling_block', 'item', 'tnt', 'ender_pearl', 'snowball', 'egg', 'experience_orb', 'splash_potion', 'lingering_potion', 'experience_bottle', 'firework_rocket'].includes(e.name)) continue
      if (/_boat$|_raft$|minecart$|^boat$/.test(e.name)) continue   // vehicles: the camera may be riding one (it stays under the camera)
      const dx = e.x - cam.x, dz = e.z - cam.z, d = Math.hypot(dx, dz), min = 0.85
      if (d < min && d > 1e-6 && Math.abs(e.y - (cam.y - 1.62)) < 2) { e.x = cam.x + dx / d * min; e.z = cam.z + dz / d * min }
    }
    // creeper swelling (CreeperRenderer.scale / getWhiteOverlayProgress): from the creeper's own
    // entity data when recorded (Creeper.tick: swell += swellDir, ignited forces 1, clamped 0..30,
    // shown as swell / 28); older recordings: a 30-tick fuse ending in an explosion at that creeper
    // (3D, within 1.5 blocks). Any blast within 3 blocks horizontally used to whiten a creeper falling
    // past a TNT and hide survivors for 10 ticks (worker 9, it_rains f1026).
    for (const e of ents) {
      if (e.name !== 'creeper') continue
      const sw = CREEPER_SWELL.get(e.id)
      if (sw) {
        const i = Math.max(0, Math.min(sw.length - 2, Math.floor(t))), f = t - i
        const v = (sw[i] + (sw[i + 1] - sw[i]) * f) / 28
        if (v > 0) e.swell = Math.min(1, v)
      } else if (!CREEPER_SWELL.size) {   // a recording with swell data: creepers without any never swelled
        const ex = EXPLOSIONS.find(x => x.t >= t && x.t - t <= 30 && Math.hypot(x.x - e.x, x.y - e.y, x.z - e.z) < 1.5)
        if (ex) e.swell = Math.min(1, Math.max(0, 1 - (ex.t - t) / 30))
      }
      // gone on the tick it blows (the entity's removal reaches the recording a tick or two later)
      if (EXPLOSIONS.some(x => t >= x.t && t - x.t < 10 && Math.hypot(x.x - e.x, x.y - e.y, x.z - e.z) < 1.5)) e.hidden = true
    }
    // primed TNT (TntRenderer): the TNT block, white flash while (fuse / 5) % 2 == 0, swelling 30%
    // over the last 10 ticks. Fuse from when the entity appeared (80 ticks by default).
    for (const e of ents) {
      if (e.name !== 'tnt') continue
      const fuse = (TNT_FUSE[e.id] ?? 80) - (t - (FIRST_SEEN.get(e.id) ?? t))
      let k = fuse < 10 ? 1 - Math.max(0, fuse) / 10 : 0; k *= k; k *= k
      e.name = 'falling_block'
      e.extra = { state: TNT_STATE, flash: Math.floor(Math.max(0, fuse) / 5) % 2 === 0, scale: 1 + k * 0.3 }
      // the camera inside the (swelling) block: back faces are culled in vanilla, nothing shows; drawn,
      // it filled the screen with red, white and pink planes (worker 14, which_door f1317)
      const hs = 0.5 * e.extra.scale
      if (Math.abs(cam.x - e.x) < hs && Math.abs(cam.z - e.z) < hs && cam.y > e.y - 0.05 - (hs - 0.5) && cam.y < e.y + 1.05 + (hs - 0.5)) e.hidden = true
    }
    // mobs' main-hand items (harness: entity_equipment -> extra.held): the same item objects as the
    // player's (ItemInHandLayer), drawn in the right arm
    for (const e of ents) {
      if (!e.extra || !e.extra.held || e.name === 'player') continue
      const n = e.extra.held, held = { key: n, display: thirdPersonDisplay(n) }
      const bl = MC.blocksByName[n]
      if (spriteOf(n)) held.tex = spriteOf(n)
      else if (bl) {
        held.state = bl.defaultState
        if (!sentBlocks.has(bl.defaultState)) { sentBlocks.add(bl.defaultState); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [bl.defaultState, mesher.meshSingle(bl.defaultState)]) }
      }
      e.mobHeld = held
    }
    // actors (other players: the movie cast, lib/movie.js): the skin from stunt.cast, the body turn and
    // walk from their recorded positions (ACTOR), the arm swing from ent_swing marks, the main-hand item
    for (const e of ents) {
      if ((e.name !== 'player' && e.name !== 'mannequin') || e.id === -1) continue
      const A = ACTOR.get(e.id), user = (e.extra && (e.extra.user || e.extra.name)) || (A && A.user)
      e.extra = { ...(e.extra || {}), skin: (STUNT_MOD.cast && user && STUNT_MOD.cast[user]) || 'steve' }
      let wp = 0, ws = 0
      if (A) {
        const i = Math.floor(t), f = t - i, a = A.ticks.get(i), b = A.ticks.get(i + 1) || a
        if (a) { e.headYaw = e.headYaw ?? e.yaw; e.yaw = lerpAngle(a[0], b[0], f); wp = a[1] + (b[1] - a[1]) * f; ws = a[2] + (b[2] - a[2]) * f }
      }
      let held = null
      const n = e.extra.held
      if (n) {
        held = { key: n, display: thirdPersonDisplay(n) }
        const bl = MC.blocksByName[n]
        if (spriteOf(n)) held.tex = spriteOf(n)
        else if (bl) {
          held.state = bl.defaultState
          if (!sentBlocks.has(bl.defaultState)) { sentBlocks.add(bl.defaultState); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [bl.defaultState, mesher.meshSingle(bl.defaultState)]) }
        }
      }
      const sw = (ENT_SWINGS.get(e.id) || []).find(s0 => s0 <= t && t - s0 < 6)
      e.player = { walkPos: wp, walkSpeed: ws, attack: sw !== undefined ? (t - sw) / 6 : 0, holding: !!held, held, age: t, deathTime: 0, hurt: (MOB_HURT.get(e.id) || []).some(h => t >= h && t - h < 10), crouch: !!e.extra.sneak }
      // idle life (standing still: a slow head drift) and the talking head (lines marked with this name)
      const still = Math.max(0, 1 - ws * 8), nz = idleNoise(e.id, t), tk = talkMotion(user, t)
      e.headYaw = (e.headYaw ?? e.yaw) + nz[0] * 0.09 * still + (tk ? tk.yaw : 0)
      e.pitch = (e.pitch || 0) + nz[1] * 0.05 * still + (tk ? tk.pitch : 0)
    }
    // idle life for mobs (stunt.idleLife: true; story casts are no-AI mobs that otherwise freeze between their
    // moves): a slow look-around while a mob stands still, up to ~12 degrees across and ~5 up or down
    if (STUNT_MOD.idleLife) {
      for (const e of ents) {
        if (e.headYaw === null || e.headYaw === undefined || !ENT_H[e.name] || e.name === 'player' || e.name === 'mannequin') continue
        const a = entityPosAt(e.id, t), b = entityPosAt(e.id, Math.max(0, t - 6))
        const still = a && b ? Math.max(0, 1 - Math.hypot(a.x - b.x, a.z - b.z) * 2) : 1
        const n = idleNoise(e.id, t)
        e.headYaw += n[0] * 0.2 * still; e.pitch = (e.pitch || 0) + n[1] * 0.09 * still
      }
    }
    for (const e of ents) {
      const st = STAGED.get(e.id); if (!st) continue
      const run = st.find(([a, b]) => t >= a && t < b)
      if (run) e.extra = { ...(e.extra || {}), ...run[2] }
    }
    for (const e of ents) {
      if (e.name !== 'warden' || !ROAR_START.has(e.id)) continue
      const run = ROAR_START.get(e.id).find(([a, b]) => t >= a && t < b)
      if (run) e.extra = { ...(e.extra || {}), roar: true, roarT: run[0] }
    }
    for (const e of ents) {   // falling blocks: send each block type's mesh once
      // minecart contents (MinecartRenderer display block)
      const CART = { tnt_minecart: 'tnt', hopper_minecart: 'hopper', furnace_minecart: 'furnace', command_block_minecart: 'command_block', spawner_minecart: 'spawner' }[e.name]
      if (CART && MC.blocksByName[CART]) {
        const st = MC.blocksByName[CART].defaultState
        e.extra = { ...(e.extra || {}), content: st }
        // TntMinecartRenderer: a primed cart's TNT flashes white while (fuse / 5) % 2 == 0 and swells
        // 30% over the last 10 ticks, like primed TNT
        const cp = e.name === 'tnt_minecart' ? CART_PRIMED.get(e.id) : undefined
        if (cp !== undefined && t >= cp) {
          const fuse = 80 - (t - cp)
          let k = fuse < 10 ? 1 - Math.max(0, fuse) / 10 : 0; k *= k; k *= k
          e.extra.flash = Math.floor(Math.max(0, fuse) / 5) % 2 === 0
          e.extra.scale = 1 + k * 0.3
        }
        if (!sentBlocks.has(st)) { sentBlocks.add(st); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [st, mesher.meshSingle(st)]) }
      }
      if ((e.name === 'falling_block' || e.name === 'moving_block') && e.extra && e.extra.state !== undefined) {
        // tinted blocks (grass, leaves, vines) get their spot's biome colour: one model per state + biome
        let key = e.extra.state, biome = 'plains'
        if (typeof key === 'number' && !e.extra.spin && TINTED_STATE(key)) {
          const b = mesher.world.getBlock(new Vec3(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)))
          biome = (b && b.biome && b.biome.name) || 'plains'
          if (biome !== 'plains') { key = `${e.extra.state}@${biome}`; e.extra = { ...e.extra, state: key } }
        }
        if (!sentBlocks.has(key)) { sentBlocks.add(key); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [key, mesher.meshSingle(typeof key === 'number' ? key : Number(String(key).split('@')[0]), biome)]) }
      }
    }
    prof('entities+hand')
    cam.blockEntities = blockEntitiesAt(t, cam)
    if (BOLTS.length) { const bl = boltsAt(t); cam.bolts = bl.bolts; cam.skyFlash = bl.flash }
    cam.dimension = DIM
    cam.weather = cam.underwater ? [] : weatherColumns(cam, t, cam.rain)   // (precipitation stops at the surface: snow fell under the ice)
    const parts = partsAt(t, cam)
    if (cam.rain > 0 && !process.env.NOPARTS) {
      for (const p of rainSplashes(t, camAt)) {
        if (Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z) < 0.25) continue
        const [ls, lb] = mesher.world.getLight(new Vec3(p.x, p.y + 0.1, p.z))
        const l = lightmap(ls, lb)
        p.color = l
        parts.push(p)
      }
    }
    prof('particles+weather')
    // nameplates (EntityRenderer.renderNameTag): a custom-named mob under the crosshair, or any with
    // CustomNameVisible, within 64 blocks; anchored 0.5 above its hitbox top
    for (const e of ents) {
      if (!e.extra || !(e.extra.name || e.extra.jeb)) continue
      if (!e.extra.name) e.extra = { ...e.extra, name: 'jeb_' }   // recordings from before names were recorded
      const near = Math.hypot(e.x - cam.x, e.y - cam.y, e.z - cam.z) < 64
      if (near && (e.extra.nameVisible || e.id === cam.targetEntity)) { e.nameTag = e.extra.name; e.nameY = (HITBOX[e.name] ? HITBOX[e.name][1] : 1.8) + 0.5 }
    }
    for (const e of ents) {
      const hs = MOB_HURT.get(e.id); if (hs && hs.some(h => t >= h && t < h + 10)) e.hurt = true
      const dt = MOB_DEATH.get(e.id); if (dt !== undefined && t >= dt) e.deathTime = t - dt + 1
    }
    // entity shadows (EntityRenderDispatcher: within 16 blocks of the camera, strength 1 - d^2/256;
    // ShadowRenderer: on the ground up to 2 blocks below, alpha (strength - drop / 2) x 0.5)
    cam.shadows = []
    {
      const shadowOf = (x, y, z, r) => {
        const d2 = (x - cam.x) ** 2 + (y - cam.y) ** 2 + (z - cam.z) ** 2
        const st = 1 - d2 / 256
        if (st <= 0) return
        for (let by = Math.floor(y); by >= Math.floor(y) - 2; by--) {
          const b = mesher.world.getBlock(new Vec3(Math.floor(x), by, Math.floor(z)))
          if (!b || b.boundingBox !== 'block') continue
          const top = by + Math.max(...(b.shapes && b.shapes.length ? b.shapes.map(q => q[4]) : [1]))
          if (top > y + 0.01) continue
          const a = (st - (y - top) / 2) * 0.5
          if (a > 0) { const [ls, lb] = mesher.world.getLight(new Vec3(Math.floor(x), Math.floor(top + 0.01), Math.floor(z))); cam.shadows.push({ x, y: top, z, r, a: Math.min(1, a), l: Math.max(...lightmap(ls, lb)) }) }
          return
        }
      }
      for (const e of ents) {
        if (e.hidden) continue
        const sn = e.shadowName || e.name
        const r = SHADOW_R[sn] ?? (/_boat$|^boat$/.test(sn) ? 0.8 : null)
        if (r) shadowOf(e.x, e.shadowY ?? e.y, e.z, r * (e.name === 'slime' || e.name === 'magma_cube' ? (e.extra && e.extra.size || 1) : 1) * (e.extra && e.extra.baby ? 0.5 : 1))
      }
    }
    await page.evaluate(([c, tick, e, pt]) => window.HB.frame(c, tick, e, pt), [cam, t, ents.filter(e => !e.hidden), parts])
    prof('page frame (GL)')
    if (process.env.PROFILE) { await page.evaluate(() => { const c = document.querySelector('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); const px = new Uint8Array(4); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px) }); prof('gl finish (1px read)') }
    // let the compositor present the finished frame before capturing (else: tearing lines)
    const outPng = `${outDir}/f${String(frameList ? frameList[f] : f).padStart(5, '0')}.png`
    if (process.env.SCREENSHOT) {   // the old capture: let the compositor present the frame, then screenshot
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
      await page.screenshot({ path: outPng, clip: { x: Math.round((MW - W) / 2 * (1 + cropNow)), y: 0, width: W, height: H } })
    } else if (MW > W) {   // stunt.wideMaster: the output is a crop of the wide master (and the master itself with WIDE_DIR)
      const [crop, wide] = await page.evaluate(([x0, w, h, keep]) => {
        const c = document.querySelector('canvas'), o = document.createElement('canvas'); o.width = w; o.height = h
        o.getContext('2d').drawImage(c, x0, 0, w, h, 0, 0, w, h)
        return [o.toDataURL('image/png'), keep ? c.toDataURL('image/png') : null]
      }, [Math.round((MW - W) / 2 * (1 + cropNow)), W, H, !!process.env.WIDE_DIR])
      fs.writeFileSync(outPng, Buffer.from(crop.slice(crop.indexOf(',') + 1), 'base64'))
      if (wide) { fs.mkdirSync(process.env.WIDE_DIR, { recursive: true }); fs.writeFileSync(`${process.env.WIDE_DIR}/${path.basename(outPng)}`, Buffer.from(wide.slice(wide.indexOf(',') + 1), 'base64')) }
    } else {
      // read the WebGL drawing buffer itself (preserveDrawingBuffer, alpha off). A screenshot comes
      // from the compositor, and on a busy machine it sometimes returned the previous frame: walks
      // juddered with 1-3 repeated ticks (worker 5, story_runaway, rendered next to a bot run)
      const url = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))
      fs.writeFileSync(outPng, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))
    }
    prof('capture+png')
    if (f % 60 === 0) console.log(`frame ${f}/${frames}`)
  }
  const secs = (Date.now() - t1) / 1000
  if (process.env.PROFILE) { const tot = Object.values(PROF).reduce((x, y) => x + y, 0); for (const [k, v] of Object.entries(PROF).sort((x, y) => y[1] - x[1])) console.log(`  ${k.padEnd(20)} ${(v / 1000).toFixed(1)} s  ${(v / tot * 100).toFixed(0)}%`) }
  // (a sparse render, FRAMES= / ONLY=, said "rendered 2583 frames" for 200: count what it drew)
  const nDrawn = only ? only.length : frames
  console.log(`rendered ${nDrawn} frames${only ? ` of ${frames}` : ''} (${(nDrawn / FPS).toFixed(2)} s of video) in ${secs.toFixed(1)} s = ${(secs / Math.max(1e-9, nDrawn / FPS)).toFixed(1)} s per video second`)
  await browser.close(); server.close(); process.exit(0)
})()
