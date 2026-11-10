// The set library: full-scale, dressed set pieces for story stunts (docs/sets.md has the catalog).
//
//   const sets = require('../lib/sets')
//   const site = await sets.findSite(ctx, { w: 40, d: 40 })            // a good natural spot near the bot
//   const home = await sets.place(ctx, 'cottage', { x: site.x, z: site.z, facing: 'east', variant: { palette: 'spruce' } })
//   home.anchors.door        { x, y, z, yaw, face }   (block centre, feet height: ready for /tp, K.cutTo, mob summons)
//   home.at(3, 1, 4)         a piece-local point in world coordinates
//   home.shots.wide          { pos, look } a camera that sees the whole piece (front three-quarter)
//   await sets.vanilla(ctx, 'village_plains', { x, z })    a whole vanilla village (or outpost, ruined portal...)
//   await sets.dress.flowers(ctx, { x, z, r: 12, n: 60 })   dressing on the real terrain (lib/sets/dress.js)
//
// How a piece lands: its voxels (lib/sets/pieces/*.js, built in code and validated against minecraft-data) are
// written as a vanilla structure template into the server's world/generated/hellobuh/structures/, then one
// `/place template hellobuh:<id> x y z <rotation>` puts it down: the game rotates every block state and recomputes
// fence, pane, wall and stair shapes. `fit` (default on) sinks a foundation under it down to the ground and grades the
// terrain round it in terraces, so a piece sits on a slope instead of floating or standing in a cut box.
// The default variant of every piece is also baked to assets/sets/<name>.nbt (scripts/bake_sets.js): our own builds.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const PIECES = require('./pieces')
const dress = require('./dress')
const vanillaMod = require('./vanilla')
const { findSite, ground, forceload, freshLand } = require('./site')

const ROOT = path.join(__dirname, '..', '..')
const WORLD = () => process.env.MC_WORLD || path.join(ROOT, 'work', 'server', 'world')

const FACES = ['south', 'west', 'north', 'east']            // the piece's front after 0..3 clockwise quarter turns
const ROTS = ['none', 'clockwise_90', '180', 'counterclockwise_90']
const YAW = { south: 0, west: 90, north: 180, east: -90 }  // Minecraft yaw (degrees) looking that way
const VEC = { south: [0, 1], west: [-1, 0], north: [0, -1], east: [1, 0] }
// (dx, dz) turned k clockwise quarter turns, as StructureTemplate.transform does about the template's origin
const rotXZ = (dx, dz, k) => [[dx, dz], [-dz, dx], [-dx, -dz], [dz, -dx]][k & 3]
const turnFace = (face, k) => { const i = FACES.indexOf(face); return i < 0 ? face : FACES[(i + k) & 3] }

function list () {
  return Object.values(PIECES).map(p => ({ name: p.name, about: p.about, variants: p.variants }))
}

// build a piece's voxels (no server): sets.build('cottage', { palette: 'spruce' })
function build (name, variant = {}) {
  const p = PIECES[name]
  if (!p) throw new Error(`no set piece "${name}" (have: ${Object.keys(PIECES).join(', ')})`)
  return p.build(variant)
}

// write the template where the server looks for generated structures; the id carries a hash of the content
// (the server caches a lookup forever, misses included, so a changed piece needs a new id)
function install (name, vox) {
  const buf = vox.toNbt()
  const id = `${name}_${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10)}`
  const dir = path.join(WORLD(), 'generated', 'hellobuh', 'structures')
  fs.mkdirSync(dir, { recursive: true })
  const f = path.join(dir, `${id}.nbt`)
  if (!fs.existsSync(f)) fs.writeFileSync(f, buf)
  return `hellobuh:${id}`
}

// send many commands fast (no 4-tick wait each; ops are not chat-limited), a tick's breath every 40
async function burst (ctx, cmds) {
  let i = 0
  for (const c of cmds) { ctx.bot.chat(c); if (++i % 40 === 0) await ctx.bot.waitForTicks(1) }
  await ctx.bot.waitForTicks(4)
}

// place a piece. opts:
//   x, z       the centre of its footprint (default: the bot)
//   y          the ground level its floor replaces (default: the ground there, median over the footprint)
//   facing     the way its front looks: 'south' (default), 'west', 'north', 'east'   (or rot: quarter turns clockwise)
//   variant    the piece's options (materials, sizes, names: docs/sets.md)
//   fit        foundation + graded terrain round it (default true); grade: rings of terracing (default 4)
async function place (ctx, name, opts = {}) {
  const vox = build(name, opts.variant || {})
  const { lo, hi } = vox.bounds()
  const k = opts.rot !== undefined ? ((Math.round(opts.rot / 90) % 4) + 4) % 4 : Math.max(0, FACES.indexOf(opts.facing || 'south'))
  const me = ctx.bot.entity.position
  const cx = opts.x ?? Math.floor(me.x), cz = opts.z ?? Math.floor(me.z)
  // the footprint's centre (local) lands on (cx, cz)
  const [ox, oz] = rotXZ(Math.floor((hi[0] - lo[0]) / 2), Math.floor((hi[2] - lo[2]) / 2), k)
  const px = cx - ox, pz = cz - oz
  const W = (lx, lz) => { const [a, b] = rotXZ(lx - lo[0], lz - lo[2], k); return [px + a, pz + b] }
  const corners = [[lo[0], lo[2]], [hi[0], lo[2]], [lo[0], hi[2]], [hi[0], hi[2]]].map(([a, b]) => W(a, b))
  const box = { x0: Math.min(...corners.map(c => c[0])), x1: Math.max(...corners.map(c => c[0])), z0: Math.min(...corners.map(c => c[1])), z1: Math.max(...corners.map(c => c[1])) }
  let y = opts.y
  if (y === undefined || y === 'ground') y = ground(ctx, box) ?? Math.floor(me.y) - 1
  box.y0 = y + lo[1]; box.y1 = y + hi[1]
  await forceload(ctx, box.x0 - 8, box.z0 - 8, box.x1 + 8, box.z1 + 8)
  const id = install(name, vox)
  const c = (s) => ctx.cmd(s)
  if (opts.fit !== false) await fitGround(ctx, box, y, opts.grade ?? 10)
  await c(`/place template ${id} ${px} ${y + lo[1]} ${pz} ${ROTS[k]}`)
  // live extras (entities can't ride in our templates): a minecart, item frames...
  const set = makeSet(name, vox, { k, lo, W, y, box, id, px, pz })
  for (const e of vox.entities) { const [x, z] = W(e.x, e.z); await c(e.cmd({ x: x + 0.5, y: y + e.y, z: z + 0.5 })) }
  await burst(ctx, ['/kill @e[type=item]'])
  ctx.log(`set: ${name} at ${px} ${y + lo[1]} ${pz} facing ${FACES[k]} (${vox.count()} blocks, box ${box.x0}..${box.x1} x ${box.z0}..${box.z1})`)
  return set
}

function makeSet (name, vox, { k, lo, W, y, box, id }) {
  const facing = FACES[k]
  const at = (lx, ly, lz) => { const [x, z] = W(lx, lz); return { x: x + 0.5, y: y + ly, z: z + 0.5 } }
  const anchors = {}
  for (const [n, a] of Object.entries(vox.anchors)) {
    const p = at(a.x, a.y, a.z), face = turnFace(a.face, k)
    anchors[n] = { ...p, face, yaw: YAW[face] ?? 0, block: [Math.floor(p.x), p.y, Math.floor(p.z)] }
    if (a.look) anchors[n].look = at(...a.look)
  }
  const cx = (box.x0 + box.x1 + 1) / 2, cz = (box.z0 + box.z1 + 1) / 2, h = box.y1 - y
  const [fx, fz] = VEC[facing], [sx, sz] = [-fz, fx]    // front, and the side to its right as you face it
  const s = Math.max(box.x1 - box.x0, box.z1 - box.z0) + 1
  const shot = (dist, side, up, lookUp) => ({ pos: { x: cx + fx * dist + sx * side, y: y + up, z: cz + fz * dist + sz * side }, look: { x: cx, y: y + lookUp, z: cz } })
  const shots = {
    wide: shot(Math.max(s, h * 1.15) * 0.95 + 6, s * 0.45, Math.max(4, h * 0.45), h * 0.3),   // front three-quarter, high: the establishing shot
    front: shot(Math.max(s, h * 0.9) * 0.75 + 4, 0, 2.2, h * 0.3),                           // straight on, eye height
    low: shot(s * 0.55 + 3, -s * 0.35, 1.1, h * 0.45)                     // low, from the other side, foreground grass
  }
  return { name, id, facing, rot: k * 90, yaw: YAW[facing], box, y, anchors, at, shots, front: { x: fx, z: fz }, right: { x: sx, z: sz } }
}

// a foundation down to the ground under the footprint, and terraces round it: ring i (1..rings) is cleared from
// y + i + 1 up and filled from below up to y - i, each capped with grass, so a hill reads as a slope down to the
// lot and a dip as a bank up to it (not a cut wall or a floating pad)
async function fitGround (ctx, box, y, rings) {
  const cmds = []
  const { x0, x1, z0, z1 } = box
  // a stone plinth where the ground falls away under the edge (the first 2 layers down), earth below it
  cmds.push(`/fill ${x0} ${y - 2} ${z0} ${x1} ${y - 1} ${z1} cobblestone replace #minecraft:replaceable`)
  cmds.push(`/fill ${x0} ${y - 2} ${z0} ${x1} ${y - 2} ${z1} mossy_cobblestone replace cobblestone`)
  cmds.push(`/fill ${x0} ${y - 12} ${z0} ${x1} ${y - 3} ${z1} dirt replace #minecraft:replaceable`)
  cmds.push(`/fill ${x0} ${y - 10} ${z0} ${x1} ${y - 1} ${z1} dirt replace #minecraft:logs`)
  // trees standing on the footprint go (a slice at a time: /fill takes 32768 blocks)
  const per = Math.max(1, Math.floor(32768 / ((x1 - x0 + 1) * (z1 - z0 + 1))))
  for (let yy = y; yy <= y + 40; yy += per) for (const t of ['#minecraft:logs', '#minecraft:leaves']) cmds.push(`/fill ${x0} ${yy} ${z0} ${x1} ${Math.min(y + 40, yy + per - 1)} ${z1} air replace ${t}`)
  for (let i = 1; i <= rings; i++) {
    const a0 = x0 - i, a1 = x1 + i, b0 = z0 - i, b1 = z1 + i
    const strips = [[a0, b0, a1, b0], [a0, b1, a1, b1], [a0, b0 + 1, a0, b1 - 1], [a1, b0 + 1, a1, b1 - 1]]
    for (const [p0, q0, p1, q1] of strips) {
      cmds.push(`/fill ${p0} ${y + i + 1} ${q0} ${p1} ${y + i + 24} ${q1} air replace #minecraft:base_stone_overworld`)
      cmds.push(`/fill ${p0} ${y + i + 1} ${q0} ${p1} ${y + i + 24} ${q1} air replace #minecraft:dirt`)
      cmds.push(`/fill ${p0} ${y + i} ${q0} ${p1} ${y + i} ${q1} grass_block replace #minecraft:base_stone_overworld`)
      cmds.push(`/fill ${p0} ${y + i} ${q0} ${p1} ${y + i} ${q1} grass_block replace dirt`)
      if (i > 5) continue   // banks below the lot only 5 deep: more made a stepped pyramid on a hilltop (choose flatter ground)
      cmds.push(`/fill ${p0} ${y - 14} ${q0} ${p1} ${y - i - 1} ${q1} dirt replace #minecraft:replaceable`)
      cmds.push(`/fill ${p0} ${y - i} ${q0} ${p1} ${y - i} ${q1} grass_block replace #minecraft:replaceable`)
    }
  }
  await burst(ctx, cmds)
}

// a camera cut for set stills and establishing shots: the bot (in spectator, so it hangs in the air) is put at
// shot.pos looking at shot.look, kept clear of the ground (min 1.2 above it), and held `ticks`
async function shoot (ctx, shot, ticks = 10, name = null) {
  const { bot } = ctx
  const p = clearSpot(ctx, shot.pos)
  const d = { x: shot.look.x - p.x, y: shot.look.y - (p.y + 1.62), z: shot.look.z - p.z }
  const yaw = Math.atan2(-d.x, d.z) * 180 / Math.PI, pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI
  const cmd = `/tp @s ${p.x.toFixed(3)} ${p.y.toFixed(3)} ${p.z.toFixed(3)} ${yaw.toFixed(2)} ${pitch.toFixed(2)}`
  // a long hop can be dropped (the client hasn't the chunks yet): check it landed, and send it again
  for (let i = 0; i < 4; i++) {
    await ctx.cmd(cmd)
    await bot.waitForTicks(4)
    const q = bot.entity.position
    if (Math.abs(q.x - p.x) < 0.5 && Math.abs(q.z - p.z) < 0.5) break
    ctx.log(`shoot: ${name || ''} did not land (${cmd}); again`)
    await bot.waitForTicks(20)
  }
  if (name) ctx.mark('shot', { name })
  await bot.waitForTicks(ticks)
}

// a camera spot whose feet and head cells are free (raised a block at a time out of the ground or a wall; interiors
// stay inside: only the blocks at the spot count, not whatever roof is above it)
function clearSpot (ctx, pos) {
  const { bot, Vec3 } = ctx
  const p = { ...pos }
  const solid = (y) => { const b = bot.blockAt(new Vec3(p.x, y, p.z)); return b && (b.boundingBox === 'block' || /leaves/.test(b.name)) }
  for (let i = 0; i < 12 && (solid(p.y) || solid(p.y + 1)); i++) p.y = Math.floor(p.y) + 1.05
  return p
}

// what fraction of the line from a camera to its target is blocked (leaves, trunks, hills): sampled every 0.5 block
// in the bot's world (fresh in perform: the harness re-sends the chunks after setup). The last `skip` blocks before
// the target don't count (that's the subject itself).
function blocked (ctx, from, to, skip = 4) {
  const { bot, Vec3 } = ctx
  const d = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }, L = Math.hypot(d.x, d.y, d.z)
  let n = 0, hit = 0
  for (let t = 0.5; t < L - skip; t += 0.5) {
    const b = bot.blockAt(new Vec3(from.x + d.x * t / L, from.y + d.y * t / L, from.z + d.z * t / L))
    n++
    if (b && b.boundingBox === 'block' && !/glass|pane|fence|bars/.test(b.name)) hit++
    else if (b && /leaves/.test(b.name)) hit++
  }
  return n ? hit / n : 0
}

// the clearest version of one of a set's shots: the shot itself, then the same swung round the piece (up to 75
// degrees either way), nearer and further, a little higher; the first with a clear line wins (else the least blocked)
function frame (ctx, set, kind = 'wide') {
  const base = set.shots[kind]
  const c = base.look, p = base.pos
  const dx = p.x - c.x, dz = p.z - c.z, r0 = Math.hypot(dx, dz), a0 = Math.atan2(dz, dx)
  let best = null
  for (const da of [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75]) {
    for (const k of [1, 0.8, 1.2, 0.65]) {
      for (const up of [0, 3, 7]) {
        const a = a0 + da * Math.PI / 180, r = r0 * k
        const pos = clearSpot(ctx, { x: c.x + Math.cos(a) * r, y: p.y + up, z: c.z + Math.sin(a) * r })
        const eye = { x: pos.x, y: pos.y + 1.62, z: pos.z }
        const bl = blocked(ctx, eye, c) + Math.abs(da) / 900 + Math.abs(1 - k) / 20 + up / 200
        if (!best || bl < best.bl) best = { pos, look: c, bl }
        if (bl < 0.02) return best
      }
    }
  }
  return best
}

// a shot from an anchor: stand there (eye height) and look its way, or at its `look` point
function anchorShot (a, { back = 0, up = 0 } = {}) {
  const v = VEC[a.face] || [0, 1]
  const pos = { x: a.x - v[0] * back, y: a.y + up, z: a.z - v[1] * back }
  const look = a.look ? { x: a.look.x, y: a.look.y + 1, z: a.look.z } : { x: a.x + v[0] * 10, y: a.y + 1.4, z: a.z + v[1] * 10 }
  return { pos, look }
}

module.exports = {
  shoot, anchorShot, frame, blocked, fitGround,
  place, build, list, install, findSite, ground, forceload, freshLand, burst,
  vanilla: (ctx, id, o) => vanillaMod.vanilla(ctx, id, o),
  VANILLA: vanillaMod.VANILLA,
  dress,
  PIECES, FACES, YAW, rotXZ
}
