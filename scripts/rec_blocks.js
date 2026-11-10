// Block names for scripts/onscreen_sfx.py: every block change in a recording with the block it replaced, and the
// block at given positions and ticks. Reads JSON on stdin: { rec: <path .rec.json[.gz]>, at: [[tick, x, y, z], ...] }.
// Prints JSON: { changes: [[tick, x, y, z, from, to, fromProps, toProps], ...], at: [name, ...] }
// (names without "minecraft:"; props: the block state's properties, e.g. { open: 'true', half: 'lower' }).
const fs = require('fs')
const zlib = require('zlib')

const inp = JSON.parse(fs.readFileSync(0, 'utf8'))
const buf = fs.readFileSync(inp.rec)
const rec = JSON.parse((inp.rec.endsWith('.gz') ? zlib.gunzipSync(buf) : buf).toString())
const Chunk = require('prismarine-chunk')(rec.version)
const md = require('minecraft-data')(rec.version)
const Block = require('prismarine-block')(rec.version)
const { Vec3 } = require('vec3')

const cols = new Map()
for (const c of rec.columns || []) cols.set(`${c.x},${c.z}`, Chunk.fromJson(c.chunk))
let minY = -64, maxY = 320
{ const f = cols.values().next().value; if (f && typeof f.minY === 'number') { minY = f.minY; maxY = f.minY + f.worldHeight } }
const colOf = (x, z) => cols.get(`${Math.floor(x / 16) * 16},${Math.floor(z / 16) * 16}`)
const get = (x, y, z) => {
  if (y < minY || y >= maxY) return 0
  const c = colOf(x, z)
  return c ? c.getBlockStateId(new Vec3(x & 15, y, z & 15)) : -1
}
const set = (x, y, z, s) => { const c = colOf(x, z); if (c && y >= minY && y < maxY) c.setBlockStateId(new Vec3(x & 15, y, z & 15), s) }
const nameOf = (s) => s < 0 ? 'unknown' : ((md.blocksByStateId[s] || {}).name || String(s))
const props = (s) => { try { return s < 0 ? {} : Block.fromStateId(s, 0).getProperties() } catch (e) { return {} } }

// queries are answered in tick order while the changes are applied
const at = (inp.at || []).map((q, i) => ({ q, i })).sort((a, b) => a.q[0] - b.q[0])
const out = new Array(at.length)
const changes = []
const bl = (rec.blocks || []).slice().sort((a, b) => a[0] - b[0])
let j = 0
for (const b of bl) {
  while (j < at.length && at[j].q[0] < b[0]) { const [, x, y, z] = at[j].q; out[at[j].i] = nameOf(get(x, y, z)); j++ }
  const [tick, x, y, z, s] = b
  const from = get(x, y, z)
  if (from === s) continue
  changes.push([tick, x, y, z, nameOf(from), nameOf(s), props(from), props(s)])
  set(x, y, z, s)
}
while (j < at.length) { const [, x, y, z] = at[j].q; out[at[j].i] = nameOf(get(x, y, z)); j++ }
process.stdout.write(JSON.stringify({ changes, at: out }))
