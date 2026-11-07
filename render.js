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
const { lightmap, setBrightness, setDayTime, setDimension } = require('./renderer/models')
const particles = require('./renderer/particles')
const { Vec3 } = require('vec3')

const [recPath, outDir, fpsArg, wArg, hArg] = process.argv.slice(2)
const FPS = Number(fpsArg || 60), W = Number(wArg || 1080), H = Number(hArg || 1011)
const EYE = 1.62
const rec = JSON.parse(fs.readFileSync(recPath))
let STUNT_MOD = {}
try { STUNT_MOD = require(`./stunts/${rec.stunt}`) } catch (e) {}
setBrightness(process.env.BRIGHTNESS ?? STUNT_MOD.brightness ?? 0.5)   // the Brightness option (renderer/models.js)
// `hideHand: true`: no first-person hand or held item (vanilla F1), for narrators who aren't Steve
const HIDE_HAND = !!STUNT_MOD.hideHand
// F1 (hide GUI) between f1_on / f1_off marks: edit.py drops the HUD there, and vanilla F1 hides the
// hand too (worker 6, lapse_castle)
const F1 = []
{ let on = null; for (const e of rec.timeline || []) { if (e.event === 'f1_on' && on === null) on = e.t / 50; if (e.event === 'f1_off' && on !== null) { F1.push([on, e.t / 50]); on = null } } if (on !== null) F1.push([on, Infinity]) }
const P = rec.poses
// client-side placement prediction: a stunt can mark('place', {x, y, z}) on the tick it uses an item
// on a block. The block change the server sends back 1-3 ticks later is moved to that tick, as
// BlockItem.place predicts on the client; an eye of ender is not predicted (EnderEyeItem.useOn returns
// early client-side), so it lands one tick after the use (worker 4, end_portal_job)
if (rec.blocks && rec.timeline) {
  for (const m of rec.timeline.filter(e => e.event === 'place' && Number.isFinite(e.x))) {
    const t0 = m.t / 50 + (m.eye ? 1 : 0), x = Math.floor(m.x), y = Math.floor(m.y), z = Math.floor(m.z)
    const b = rec.blocks.find(b => b[1] === x && b[2] === y && b[3] === z && b[0] > t0 && b[0] <= t0 + 5)
    if (b) b[0] = Math.ceil(t0)
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
function entitiesAt (t, mesher) {
  const i = Math.floor(t), f = t - i
  const a = ENT.get(i) || new Map(), b = ENT.get(i + 1) || a
  const out = []
  for (const [id, ra] of a) {
    let rb = b.get(id) || ra
    if (Math.hypot(rb[3] - ra[3], rb[4] - ra[4], rb[5] - ra[5]) > 4) rb = ra   // teleport: hold, then snap on the next tick
    const L = (k) => ra[k] + (rb[k] - ra[k]) * f
    const pos = { x: L(3), y: L(4), z: L(5) }
    const cell = new Vec3(Math.floor(pos.x), Math.floor(pos.y + 0.5), Math.floor(pos.z))
    const inBlock = mesher.world.getBlock(cell)
    // primed TNT (and a falling block) can arrive a tick before its block is removed: the block still
    // shows, so skip the entity; drawn over it, it z-fought in black and white (tnt_1000 f459)
    if (inBlock && ((ra[2] === 'tnt' && inBlock.name === 'tnt') || (ra[2] === 'falling_block' && ra[9] && inBlock.stateId === ra[9].state))) continue
    let [sky, blk] = mesher.world.getLight(cell)
    // a cell that is still solid (or not yet relit) reads light 0: take the brightest neighbour
    if (inBlock && inBlock.boundingBox === 'block' && sky === 0 && blk === 0) {
      for (const [dx, dy, dz] of [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
        const [s2, b2] = mesher.world.getLight(cell.offset(dx, dy, dz)); sky = Math.max(sky, s2); blk = Math.max(blk, b2)
      }
    }
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
const EXPLOSIONS = (rec.timeline || []).filter(e => e.event === 'particles' && e.type === 'explosion').map(e => ({ t: e.t / 50, x: e.x, z: e.z }))
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
  for (let tick = 0; tick <= last; tick++) {
    while (k < HELD.length && HELD[k][0] <= tick) want = HELD[k++][1]
    h += Math.max(-0.4, Math.min(0.4, (shown === want ? 1 : 0) - h))
    if (h < 0.1) shown = want
    HAND.push([shown, h])
  }
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
    if (e.event === 'dig') { if (cur) DIGS.push(cur); cur = [e.t / 50, Infinity, e.x, e.y, e.z, Math.max(1, e.ms / 50)] }
    if (e.event === 'dig_end' && cur) { cur[1] = e.t / 50; DIGS.push(cur); cur = null }
  }
  if (cur) DIGS.push(cur)
}
const ATLAS_UV = (() => { try { const a = JSON.parse(fs.readFileSync(path.join(__dirname, 'work', 'assets', rec.version, 'atlas.json'))); return a.textures || a } catch (e) { return {} } })()
// the block under the crosshair within reach (4.5, survival): vanilla outlines it in black
// hitbox [width, height] of mobs that can be targeted (EntityType sizes); an entity under the crosshair
// within the 3-block entity reach is the target, and vanilla draws no outline for it
const HITBOX = { villager: [0.6, 1.95], zombie: [0.6, 1.95], skeleton: [0.6, 1.99], creeper: [0.6, 1.7], cow: [0.9, 1.4], sheep: [0.9, 1.3], pig: [0.9, 0.9], chicken: [0.4, 0.7], iron_golem: [1.4, 2.7], enderman: [0.6, 2.9], spider: [1.4, 0.9], wandering_trader: [0.6, 1.95], witch: [0.6, 1.95] }
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
const dayTimeAt = (t) => { let v = TIMES[0][1]; for (const [a, d] of TIMES) if (t >= a) v = d; return v }
// Weather (Level.getRainLevel / getThunderLevel): the recording's start weather (harness: stunt.weather)
// and `weather` marks (ctx.setWeather); the client moves each level 0.01 a tick toward its target.
// WEATHER=clear|rain|thunder overrides the whole recording.
const RAIN = [], THUNDER = []
{
  const w0 = DIM !== 'overworld' ? 'clear' : (process.env.WEATHER || rec.weather || STUNT_MOD.weather || 'clear')
  const marks = process.env.WEATHER ? [] : (rec.timeline || []).filter(e => e.event === 'weather').map(e => [e.t / 50, e.weather])
  let r = w0 !== 'clear' ? 1 : 0, th = w0 === 'thunder' ? 1 : 0, w = w0, k = 0
  for (let i = 0; i <= P.length + 2; i++) {
    while (k < marks.length && marks[k][0] <= i) w = marks[k++][1]
    if (i > 0) { r = Math.max(0, Math.min(1, r + (w !== 'clear' ? 0.01 : -0.01))); th = Math.max(0, Math.min(1, th + (w === 'thunder' ? 0.01 : -0.01))) }
    RAIN.push(r); THUNDER.push(th)
  }
}
const levelAt = (A, t) => { const i = Math.max(0, Math.min(A.length - 2, Math.floor(t))), f = Math.min(1, Math.max(0, t - i)); return A[i] + (A[i + 1] - A[i]) * f }
// the lightmap's sky darkening follows the rain in 1/16 steps (each step re-lights the whole world)
const weatherKey = (t) => `${Math.round(levelAt(RAIN, t) * 16)},${Math.round(levelAt(THUNDER, t) * 16)}`
const weatherLight = (t) => [Math.round(levelAt(RAIN, t) * 16) / 16, Math.round(levelAt(THUNDER, t) * 16) / 16]
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
  // a missing respawn mark (older recordings): the death ends where the pose jumps (respawn teleport).
  // Only then: with a mark, the respawn teleport reaches the pose a tick before it, and cutting there
  // showed the spawn point under the death screen for 3 frames (worker 5, story_respawn_tax f324)
  const hasRespawnMarks = (rec.timeline || []).some(e => e.event === 'respawn')
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

// The player seen from outside (third person: any CAM= override, or SHOW_PLAYER=1). Per tick like
// LivingEntity.tick: the body turns 0.3 of the way toward the walking direction (walking backwards
// keeps it facing forward; swinging faces the look direction) and never more than 50 degrees from
// the head (tickHeadTurn); the limb swing follows WalkAnimationState (speed eases 0.4 toward
// min(1, horizontal distance * 4), position advances by speed).
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
  const d = pullIn(eye, f, dist, world)
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
        const ex = start[1] - e.x, ey = start[2] + EYE - e.y, ez = start[3] - e.z, dist = Math.hypot(ex, ey, ez), q = dist / (2 * (e.radius || 4))
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
    for (let k = 0; k < 400; k++) {
      const m = blk(x, y + 0.1, z)
      if (m === 'lava') { vx *= 0.5; vy *= 0.8; vz *= 0.5; vy -= 0.02 } else if (m === 'water') { vx *= 0.8; vy *= 0.8; vz *= 0.8; vy -= 0.02 } else { const fr = groundBelow(x, y - 0.001, z) !== null && y - groundBelow(x, y - 0.001, z) < 0.01 ? 0.546 : 0.91; vy -= 0.08; vy *= 0.98; vx *= fr; vz *= fr }   // on the ground: block friction 0.6 x 0.91
      if (solid(x + vx, y, z)) vx = 0
      if (solid(x, y, z + vz)) vz = 0
      x += vx; z += vz
      if (vy < 0) { const g = groundBelow(x, y, z); if (g !== null && y + vy <= g) { y = g; vy = 0 } else y += vy } else y += vy
      pts.push([x, y, z])
    }
    deathSim = { d, pts, yaw: start[4], pitch: start[5] }
  }
  const e = Math.max(0, t - d[0]), i = Math.min(deathSim.pts.length - 2, Math.floor(e)), f = e - i
  const A = deathSim.pts[i], B = deathSim.pts[i + 1]
  return { x: A[0] + (B[0] - A[0]) * f, y: A[1] + (B[1] - A[1]) * f, z: A[2] + (B[2] - A[2]) * f, yaw: deathSim.yaw, pitch: deathSim.pitch }
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
    x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f + EYE, z: a[3] + (b[3] - a[3]) * f,
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

  const app = express()
  const blobs = new Map(); let blobId = 0
  app.get('/mesh/:id', (req, res) => { const b = blobs.get(req.params.id); blobs.delete(req.params.id); res.type('application/octet-stream').send(b) })
  app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'page.html')))
  app.get('/page.js', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'page.js')))
  app.get('/entities.js', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'entities.js')))
  app.get('/blockentities.js', (_, res) => res.sendFile(path.join(__dirname, 'renderer', 'blockentities.js')))
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
  await page.evaluate((o) => window.HB.init(o), { renderDistance: Number(process.env.RENDER_DISTANCE || STUNT_MOD.renderDistance || 8), clouds: STUNT_MOD.clouds !== false })

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
  {
    // the first mesh of the whole area, split over worker threads (MESH_WORKERS, default: the core
    // count, at most 4); each slice is byte-identical to meshing it here. 1 = the old single thread.
    const list = mesher.sections(minVisibleY)
    const nw = Math.max(1, Math.min(list.length, Number(process.env.MESH_WORKERS || Math.min(4, require('os').cpus().length))))
    if (nw > 1) {
      const blobsOut = await mesher.packParallel(list, nw, { recPath: path.resolve(recPath), minVisibleY, brightness: Number(process.env.BRIGHTNESS ?? STUNT_MOD.brightness ?? 0.5), dayTime: dayTimeAt(0), rain: weatherLight(0)[0], thunder: weatherLight(0)[1], dimension: DIM })
      for (const b of blobsOut) { const id = String(blobId++); blobs.set(id, b); await page.evaluate((u) => window.HB.loadMeshes(u), `/mesh/${id}`) }
    } else await send(list)
  }
  console.log(`meshed + uploaded world in ${((Date.now() - t0) / 1000).toFixed(1)} s`)

  // particles from recorded events (block crumbs use the block's particle texture in the atlas)
  const PARTS = []
  const mcDataR = require('minecraft-data')(rec.version)
  for (let ev of (rec.timeline || []).filter(e => e.event === 'particles')) {
    let bt = null
    if (ev.block) { const st = mesher.blockStates[ev.block]; const v = st && (st.variants ? Object.values(st.variants)[0] : st.multipart && st.multipart[0].apply); const m = Array.isArray(v) ? v[0] : v; bt = m && m.model && m.model.textures && m.model.textures.particle }
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
  const solidAt = (x, y, z) => { const b = mesher.world.getBlock(new Vec3(x, y, z)); return !!(b && b.isCube && !b.transparent) }
  const partsAt = (t, cam) => {
    const out = []
    if (process.env.NOPARTS) return out   // debug: frames without particles
    for (const p of PARTS) {
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
  let curDayTime = dayTimeAt(0), curWeather = weatherKey(0)
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
        const { SX, SZ, x0, z0, yMin } = L1, plane = SX * SZ, a0 = L0.sky, b0 = L0.blk, a1 = L1.sky, b1 = L1.blk
        const seen = new Set()
        for (let i = 0; i < a1.length; i++) {
          if (a0[i] === a1[i] && b0[i] === b1[i]) continue
          const x = x0 + i % SX, z = z0 + Math.floor(i / SX) % SZ, y = yMin + Math.floor(i / plane)
          for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
            const sx = Math.floor((x + dx) / 16) * 16, sy = Math.floor((y + dy) / 16) * 16, sz = Math.floor((z + dz) / 16) * 16
            const k = `${sx},${sy},${sz}`
            if (!seen.has(k)) { seen.add(k); mark(sx, sy, sz) }
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
    if (dayTimeAt(t) !== curDayTime || weatherKey(t) !== curWeather) {   // the time or the rain changed: re-light everything
      curDayTime = dayTimeAt(t); curWeather = weatherKey(t); setDayTime(curDayTime, ...weatherLight(t)); dirty.clear()
      await send(mesher.sections(minVisibleY))
    }
    prof('blocks+relight')
    if (dirty.size && process.env.PROFILE) console.log("send", t.toFixed(1), dirty.size)
    if (dirty.size) await send([...dirty.values()])
    prof('remesh+upload')
    const cam = camAt(t)
    cam.dayTime = curDayTime
    cam.rain = levelAt(RAIN, t); cam.thunder = levelAt(THUNDER, t)
    const eye = { ...cam }   // the player's own eye (the CAM override moves only the camera)
    // CAM="dx,dy,dz,yawDeg,pitchDeg": a fixed camera relative to the set origin (no bob)
    // CAM=back[:dist] / CAM=front[:dist]: vanilla's F5 views (default 4 blocks), bob and hurt tilt kept
    if (process.env.CAM) {
      const m = /^(back|front)(?::([\d.]+))?$/.exec(process.env.CAM)
      if (m) Object.assign(cam, detachedCam(eye, m[1], Number(m[2] || 4), mesher.world))
      else {
        const [dx, dy, dz, yw, pt] = process.env.CAM.split(',').map(Number)
        Object.assign(cam, { x: rec.set.x + dx, y: rec.set.y + dy, z: rec.set.z + dz, yaw: yw * Math.PI / 180, pitch: pt * Math.PI / 180, bobX: 0, bobY: 0, roll: 0, bobPitch: 0 })
      }
    }
    const inBlock = mesher.world.getBlock(new Vec3(cam.x, cam.y, cam.z))
    cam.underwater = !!(inBlock && inBlock.name === 'water')
    cam.inLava = !!(inBlock && inBlock.name === 'lava')
    const bio = inBlock && inBlock.biome && mesher.biomes[inBlock.biome.name]
    if (bio) { cam.sky = bio.sky; cam.fog = bio.fog; cam.waterFog = bio.water_fog }
    // block outline under the crosshair + the crack overlay while digging
    if (!DEATHS.find(([a, b]) => t >= a && t < b)) {
      cam.target = targetBlock(eye, mesher.world, entitiesAt(t, mesher))
      if (cam.target && cam.target.entity !== undefined) { cam.targetEntity = cam.target.entity; cam.target = null }
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
        if (stage >= 0 && db && !/^(air|cave_air|void_air)$/.test(db.name)) cam.crack = { x: dg[2], y: dg[3], z: dg[4], uv: ATLAS_UV[`destroy_stage_${Math.min(9, stage)}`] }
      }
    }
    prof('camera+target')
    const ents = entitiesAt(t, mesher)
    // first-person held item
    const hd = HIDE_HAND || THIRD || F1.some(([a, b]) => t >= a && t < b) ? null : handAt(t)
    if (hd) {
      const bl = MC.blocksByName[hd.name]
      const hasSprite = !!spriteOf(hd.name)
      const [hs, hb] = mesher.world.getLight(new Vec3(cam.x, cam.y, cam.z))
      cam.hand = { key: hd.name, equip: hd.equip, swing: hd.swing, light: lightmap(hs, hb), glint: !!hd.name && glintAt(t) }
      if (hasSprite) cam.hand.tex = spriteOf(hd.name)
      else if (bl) {
        cam.hand.state = bl.defaultState
        if (!sentBlocks.has(bl.defaultState)) { sentBlocks.add(bl.defaultState); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [bl.defaultState, mesher.meshSingle(bl.defaultState)]) }
      }
      // the hand goes with the death screen, which edit.py starts up to a frame before the death
      // tick and on the output frame grid: hide it 2 frames early (it showed under the screen, drops f1972)
      cam.dead = !!DEATHS.find(([a, b]) => t >= a - 2 * 20 / FPS && t < b)
    }
    if (THIRD) {   // the player's own body at the eye (the dead body until it's removed at deathTime 20)
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
          else if (bl) {
            held.state = bl.defaultState
            if (!sentBlocks.has(bl.defaultState)) { sentBlocks.add(bl.defaultState); await page.evaluate(([id, g]) => window.HB.addBlockModel(id, g), [bl.defaultState, mesher.meshSingle(bl.defaultState)]) }
          }
        }
        const sw = SWINGS.find(s0 => s0 <= t && t - s0 < 6)
        ents.push({
          id: -1, name: 'player', x: eye.x, y: eye.y - EYE, z: eye.z, yaw: dw ? PBODY[Math.min(PBODY.length - 1, Math.floor(dw[0]))] : body, pitch: eye.pitch, headYaw: eye.yaw,
          extra: { skin: process.env.SKIN || 'steve' }, light: lightmap(ls, lb),
          player: { walkPos: wk[0], walkSpeed: dw ? 0 : wk[1], attack: sw !== undefined ? (t - sw) / 6 : 0, holding: !!held, held, age: t, deathTime, hurt: HURTS.some(h => t >= h.t && t - h.t < 10) }
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
      if (!bl) continue
      const age = t - (FIRST_SEEN.get(e.id) ?? t)
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
      if (['player', 'item_frame', 'glow_item_frame', 'falling_block', 'item', 'tnt', 'ender_pearl', 'snowball', 'egg', 'experience_orb', 'splash_potion', 'lingering_potion', 'experience_bottle', 'firework_rocket'].includes(e.name)) continue
      if (/_boat$|_raft$|minecart$|^boat$/.test(e.name)) continue   // vehicles: the camera may be riding one (it stays under the camera)
      const dx = e.x - cam.x, dz = e.z - cam.z, d = Math.hypot(dx, dz), min = 0.85
      if (d < min && d > 1e-6 && Math.abs(e.y - (cam.y - 1.62)) < 2) { e.x = cam.x + dx / d * min; e.z = cam.z + dz / d * min }
    }
    // creeper swelling (CreeperRenderer.scale): 30-tick fuse ending in its explosion
    for (const e of ents) {
      if (e.name !== 'creeper') continue
      const ex = EXPLOSIONS.find(x => x.t >= t && x.t - t <= 30 && Math.hypot(x.x - e.x, x.z - e.z) < 3)
      if (ex) e.swell = Math.min(1, Math.max(0, 1 - (ex.t - t) / 30))
      // gone on the tick it blows (the entity's removal reaches the recording a tick or two later)
      if (EXPLOSIONS.some(x => t >= x.t && t - x.t < 10 && Math.hypot(x.x - e.x, x.z - e.z) < 3)) e.hidden = true
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
    prof('entities+hand')
    cam.blockEntities = blockEntitiesAt(t, cam)
    cam.dimension = DIM
    cam.weather = weatherColumns(cam, t, cam.rain)
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
    await page.evaluate(([c, tick, e, pt]) => window.HB.frame(c, tick, e, pt), [cam, t, ents.filter(e => !e.hidden), parts])
    prof('page frame (GL)')
    if (process.env.PROFILE) { await page.evaluate(() => { const c = document.querySelector('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); const px = new Uint8Array(4); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px) }); prof('gl finish (1px read)') }
    // let the compositor present the finished frame before capturing (else: tearing lines)
    const outPng = `${outDir}/f${String(frameList ? frameList[f] : f).padStart(5, '0')}.png`
    if (process.env.SCREENSHOT) {   // the old capture: let the compositor present the frame, then screenshot
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
      await page.screenshot({ path: outPng })
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
  console.log(`rendered ${frames} frames (${(frames / FPS).toFixed(2)} s of video) in ${secs.toFixed(1)} s = ${(secs / (frames / FPS)).toFixed(1)} s per video second`)
  await browser.close(); server.close(); process.exit(0)
})()
