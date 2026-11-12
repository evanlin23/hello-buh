// Mega builds (format "mega", owner 2026-11-11, r:r8bb1e3): a huge mathematical structure placed fast with server
// commands, for a fly-around Short. A generator returns a plan: a list of boxes, each { box: [x0, y0, z0, x1, y1, z1]
// (inclusive, local coordinates from the structure's min corner), block }, applied in order (later boxes overwrite
// earlier ones, so a solid fill followed by air carves is the cheap way to describe a fractal). `place` sends the
// plan as /fill commands, split to vanilla's 32768-block limit, several a tick (the bot is op: ops are exempt from the
// command spam kick), then checks a sample of the blocks and re-sends any box that didn't land.
//
//   const mega = require('../lib/mega')
//   const plan = mega.menger(4, { body: 'deepslate_tiles', edges: 'sea_lantern', core: 'ochre_froglight' })
//   await mega.place(ctx, plan, { x: ox, y: oy, z: oz })      // ~2.8k commands, ~20 s for a 81-block sponge
//
// Generators (each also returns its size and the points a camera wants: centre, holes):
//   menger(level, palette)          Menger sponge, 3^level blocks a side (level 4 = 81: 160,000 blocks)
//   sierpinskiTetra(level, palette) Sierpinski tetrahedron on a square grid (2^level a side, each cell a box)
//   rings(n, palette)               nested gyroscope rings (concentric circles in alternating planes)
// Test without a server: node lib/mega.js menger 4 (counts the commands and the solid blocks).
const FILL_MAX = 32768

// split an inclusive box into pieces of at most FILL_MAX blocks (along its longest axis first)
function split (b) {
  const [x0, y0, z0, x1, y1, z1] = b
  const n = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1)
  if (n <= FILL_MAX) return [b]
  const len = [x1 - x0, y1 - y0, z1 - z0], ax = len.indexOf(Math.max(...len))
  const lo = b.slice(), hi = b.slice(), mid = Math.floor((b[ax] + b[ax + 3]) / 2)
  lo[ax + 3] = mid; hi[ax] = mid + 1
  return [...split(lo), ...split(hi)]
}

// --------------------------------------------------------------------------- Menger sponge
// A cell (x, y, z) in 0..3^L-1 is removed when, at some digit position (base 3), two or more of its digits are 1.
// So the holes are prisms: for digit position j (j = 0 the biggest), the cells whose x and y digits are both 1 form
// 3^j x 3^j prisms of side 3^(L-1-j) running the full length along z; the same for (x, z) and (y, z). Carving them all
// is 3 x (1 + 9 + 81 + ...) boxes: 2460 for level 4, against 160,000 single blocks.
// Glow lines (palette.edges): the 12 edges of each solid sub-cube at `edgeLevel` (1: the 20 cubes of side 27 at level
// 4). An edge cell has two coordinates at its cube's extremes (all digits 0 or all 2 below that level), so no finer
// carve ever reaches it: placed before the carves, they survive. palette.edges2 does the same one level finer.
// palette.core: a smaller sponge (level - 2) hung in the empty middle (the "sponge inside the sponge").
function menger (L, palette = {}) {
  const N = 3 ** L, body = palette.body || 'deepslate_tiles'
  const plan = [...split([0, 0, 0, N - 1, N - 1, N - 1])].map(box => ({ box, block: body }))
  const edges = (lvl, block) => {
    if (!block || lvl < 1 || lvl >= L) return
    const s = 3 ** (L - lvl)                     // side of a sub-cube at that level
    const k = 3 ** lvl
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) for (let m = 0; m < k; m++) {
      if (!solidAt([i, j, m], lvl)) continue
      const x0 = i * s, y0 = j * s, z0 = m * s, x1 = x0 + s - 1, y1 = y0 + s - 1, z1 = z0 + s - 1
      for (const a of [x0, x1]) for (const b of [y0, y1]) plan.push({ box: [a, b, z0, a, b, z1], block })
      for (const a of [x0, x1]) for (const c of [z0, z1]) plan.push({ box: [a, y0, c, a, y1, c], block })
      for (const b of [y0, y1]) for (const c of [z0, z1]) plan.push({ box: [x0, b, c, x1, b, c], block })
    }
  }
  edges(palette.edgeLevel || 1, palette.edges)
  edges((palette.edgeLevel || 1) + 1, palette.edges2)
  for (let j = 0; j < L; j++) {
    const s = 3 ** (L - 1 - j), cells = 3 ** j
    const ones = []                               // the ranges whose digit j is 1
    for (let c = 0; c < cells; c++) ones.push([c * 3 * s + s, c * 3 * s + 2 * s - 1])
    for (const [a0, a1] of ones) for (const [b0, b1] of ones) {
      for (const box of [[a0, b0, 0, a1, b1, N - 1], [a0, 0, b0, a1, N - 1, b1], [0, a0, b0, N - 1, a1, b1]]) {
        for (const p of split(box)) plan.push({ box: p, block: 'air' })
      }
    }
  }
  const c = (N - 1) / 2
  const out = { name: `menger${L}`, size: [N, N, N], plan, center: [c, c, c], holes: { side: 3 ** (L - 1) } }
  if (palette.core && L >= 3) {                   // a level L-2 sponge in the middle of the central void
    const inner = menger(L - 2, { body: palette.core, edges: palette.coreEdges })
    const off = (N - inner.size[0]) / 2
    for (const p of inner.plan) {
      const b = p.box
      plan.push({ box: [b[0] + off, b[1] + off, b[2] + off, b[3] + off, b[4] + off, b[5] + off], block: p.block })
    }
    out.core = { min: off, side: inner.size[0], hole: 3 ** (L - 3) }
  }
  return out
}

// is the cell (in units of sub-cubes at level `lvl`) part of the sponge? (no digit position with two 1s)
function solidAt (cell, lvl) {
  const d = cell.slice()
  for (let j = 0; j < lvl; j++) {
    let ones = 0
    for (let a = 0; a < 3; a++) { if (d[a] % 3 === 1) ones++; d[a] = Math.floor(d[a] / 3) }
    if (ones >= 2) return false
  }
  return true
}

// --------------------------------------------------------------------------- Sierpinski tetrahedron (voxel)
// Pascal's tetrahedron mod 2 on a grid: the cell (x, y, z) at height y is kept when x & z & y-free bits don't collide,
// i.e. (x & z) === 0 && ((x | z) & y) === 0 for a "corner" tetrahedron of side 2^L. `cell` scales each cell up.
function sierpinskiTetra (L, palette = {}, cell = 1) {
  const N = 2 ** L, plan = [], block = palette.body || 'quartz_block'
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let z0 = null
    for (let z = 0; z <= N; z++) {
      const on = z < N && (x & z) === 0 && ((x | z) & y) === 0 && x + z + y < N
      if (on && z0 === null) z0 = z
      if (!on && z0 !== null) {
        plan.push({ box: [x * cell, y * cell, z0 * cell, x * cell + cell - 1, y * cell + cell - 1, z * cell - 1], block })
        z0 = null
      }
    }
  }
  return { name: `tetra${L}`, size: [N * cell, N * cell, N * cell], plan: plan.flatMap(p => split(p.box).map(box => ({ box, block: p.block }))), center: [N * cell / 3, N * cell / 4, N * cell / 3] }
}

// --------------------------------------------------------------------------- nested rings
// n concentric rings (radius 6 + 5k), each tilted to its own plane (XY, YZ, XZ in turn), one block thick and two wide
function rings (n, palette = {}) {
  const plan = [], R = 6 + 5 * (n - 1), C = R + 1
  const blocks = palette.blocks || ['gold_block', 'sea_lantern', 'copper_block']
  for (let k = 0; k < n; k++) {
    const r = 6 + 5 * k, block = blocks[k % blocks.length], seen = new Set()
    for (let a = 0; a < 2 * Math.PI; a += 0.5 / r) {
      for (const w of [0, 1]) {
        const u = Math.round(Math.cos(a) * r), v = Math.round(Math.sin(a) * r)
        const p = k % 3 === 0 ? [C + u, C + v, C + w] : k % 3 === 1 ? [C + w, C + u, C + v] : [C + u, C + w, C + v]
        const key = p.join(',')
        if (!seen.has(key)) { seen.add(key); plan.push({ box: [...p, ...p], block }) }
      }
    }
  }
  return { name: `rings${n}`, size: [2 * C + 1, 2 * C + 1, 2 * C + 1], plan, center: [C, C, C] }
}

// --------------------------------------------------------------------------- cells to boxes
// Cells [[x, y, z, block], ...] -> the fewest-ish boxes [{ box, block }]: runs along x in each (y, z) row, then runs
// with the same x span stacked along z merged into one rectangle (a square wall layer is 4 boxes, a disc ~2r), and the
// same rectangle on consecutive layers into one box.
// Later cells win where two land on the same spot. Used by lib/mega_lapse.js for each step of a time-lapse.
function runs (cells) {
  const at = new Map()
  for (const [x, y, z, block] of cells) at.set(`${x},${y},${z}`, [x, y, z, block])
  const rows = new Map()                                  // "y|block|z" -> sorted xs
  for (const [x, y, z, block] of at.values()) { const k = `${y}|${block}|${z}`; if (!rows.has(k)) rows.set(k, []); rows.get(k).push(x) }
  const spans = new Map()                                 // "y|block|x0|x1" -> zs
  for (const [k, xs] of rows) {
    const [y, block, z] = k.split('|')
    xs.sort((a, b) => a - b)
    for (let i = 0; i < xs.length;) {
      let j = i
      while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++
      const sk = `${y}|${block}|${xs[i]}|${xs[j]}`
      if (!spans.has(sk)) spans.set(sk, [])
      spans.get(sk).push(+z)
      i = j + 1
    }
  }
  const rects = new Map()                                 // "block|x0|x1|z0|z1" -> ys (the same rectangle on several layers)
  for (const [k, zs] of spans) {
    const [y, block, x0, x1] = k.split('|')
    zs.sort((a, b) => a - b)
    for (let i = 0; i < zs.length;) {
      let j = i
      while (j + 1 < zs.length && zs[j + 1] === zs[j] + 1) j++
      const rk = `${block}|${x0}|${x1}|${zs[i]}|${zs[j]}`
      if (!rects.has(rk)) rects.set(rk, [])
      rects.get(rk).push(+y)
      i = j + 1
    }
  }
  const out = []
  for (const [k, ys] of rects) {                          // ... stacked into one box where the layers are consecutive
    const [block, x0, x1, z0, z1] = k.split('|')
    ys.sort((a, b) => a - b)
    for (let i = 0; i < ys.length;) {
      let j = i
      while (j + 1 < ys.length && ys[j + 1] === ys[j] + 1) j++
      for (const box of split([+x0, ys[i], +z0, +x1, ys[j], +z1])) out.push({ box, block })
      i = j + 1
    }
  }
  return out
}

// --------------------------------------------------------------------------- placing
// Commands for a plan at the world point `at` (its min corner).
function commands (s, at) {
  return s.plan.map(({ box: b, block }) => `/fill ${at.x + b[0]} ${at.y + b[1]} ${at.z + b[2]} ${at.x + b[3]} ${at.y + b[4]} ${at.z + b[5]} ${block}`)
}

// Place a plan: `perTick` commands a tick, then spot-check each box's corner and re-send any that missed (a lost
// chat command is silent). Returns the number of commands sent.
async function place (ctx, s, at, { perTick = 6, check = true } = {}) {
  const { bot } = ctx
  const cmds = commands(s, at)
  const t0 = Date.now()
  for (let i = 0; i < cmds.length; i++) {
    bot.chat(cmds[i])
    if (i % perTick === perTick - 1) await bot.waitForTicks(1)
    if (i % 600 === 599) { await bot.waitForTicks(10); ctx.log(`mega ${s.name}: ${i + 1}/${cmds.length} commands`) }
  }
  await bot.waitForTicks(40)
  let resent = 0
  if (check) {
    for (let round = 0; round < 3; round++) {
      // each box's far corner should hold what the LAST box covering that spot wrote (later boxes overwrite)
      const inside = (b, x, y, z) => x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]
      const miss = []
      s.plan.forEach((p, i) => {
        const [x, y, z] = p.box.slice(3)
        let want = null
        for (let k = s.plan.length - 1; k >= 0; k--) if (inside(s.plan[k].box, x, y, z)) { want = s.plan[k].block; break }
        const blk = bot.blockAt(new ctx.Vec3(at.x + x, at.y + y, at.z + z))
        if (blk && blk.name !== want) miss.push(i)
      })
      if (!miss.length) break
      ctx.log(`mega ${s.name}: ${miss.length} boxes missed, re-sending (round ${round + 1})`)
      // re-send from the earliest missed box on: later boxes depend on the earlier ones being there
      const from = Math.min(...miss)
      for (let i = from; i < cmds.length; i++) { bot.chat(cmds[i]); resent++; if (i % perTick === perTick - 1) await bot.waitForTicks(1) }
      await bot.waitForTicks(40)
    }
  }
  ctx.log(`mega ${s.name}: ${cmds.length} commands (+${resent} re-sent) in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  return cmds.length
}

// Solid cells of a plan, counted on a grid (tests and the block budget). Slow for big plans: fine for level <= 4.
function count (s) {
  const [X, Y, Z] = s.size, g = new Uint8Array(X * Y * Z), id = new Map([['air', 0]])
  for (const { box: b, block } of s.plan) {
    if (!id.has(block)) id.set(block, id.size)
    const v = id.get(block)
    for (let x = b[0]; x <= b[3]; x++) for (let y = b[1]; y <= b[4]; y++) for (let z = b[2]; z <= b[5]; z++) g[(x * Y + y) * Z + z] = v
  }
  const by = {}
  const name = [...id.keys()]
  for (const v of g) if (v) by[name[v]] = (by[name[v]] || 0) + 1
  return { grid: g, by, solid: Object.values(by).reduce((a, b) => a + b, 0) }
}

module.exports = { menger, sierpinskiTetra, rings, commands, place, count, split, solidAt, runs, FILL_MAX }

if (require.main === module) {
  const [kind = 'menger', lvl = '4'] = process.argv.slice(2)
  const s = kind === 'menger' ? menger(+lvl, { edges: 'sea_lantern', core: 'ochre_froglight' }) : kind === 'tetra' ? sierpinskiTetra(+lvl) : rings(+lvl)
  const c = count(s)
  console.log(`${s.name}: ${s.size.join('x')}, ${s.plan.length} commands, solid ${c.solid}`, c.by)
}
