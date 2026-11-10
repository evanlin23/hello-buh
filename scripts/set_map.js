// A top-down map of a recording's world around its set origin, from the recorded blocks (no render): every column's
// top block coloured by kind and shaded by height, a grid every 4 blocks labelled in set offsets. For placing scenes
// on real terrain without guessing (story_good_boy put a "sea" swim on land and a run inside a village tower).
//   node scripts/set_map.js work/<name>.rec.json out.png [radius=64] [scale=8]
//   -> out.png, and out.png.json: { "dx,dz": [y, block] } for every column (feet stand at y + 1)
const fs = require('fs')
const zlib = require('zlib')
const { Vec3 } = require('vec3')
const { Mesher } = require('../renderer/mesher')

const [recPath, out, rArg, sArg] = process.argv.slice(2)
const raw = fs.readFileSync(recPath)
const rec = JSON.parse(recPath.endsWith('.gz') ? zlib.gunzipSync(raw) : raw)
const R = Number(rArg || 64), S = Number(sArg || 8)
const mesher = new Mesher(rec.version)
mesher.addColumns(rec.columns)
const W = mesher.world
const { x: X, y: Y, z: Z } = rec.set
const skip = /^(air|cave_air|short_grass|tall_grass|fern|large_fern|snow|dandelion|poppy|vine|torch|wall_torch)$|flower|tulip|orchid|allium|bluet|daisy|lily_of|bush|sapling/
const col = (n) => /water/.test(n) ? [50, 90, 200] : /lava/.test(n) ? [230, 90, 20] : /leaves/.test(n) ? [40, 110, 40]
  : /log|planks|wood|door|fence|stairs|slab|trapdoor|barrel|bed/.test(n) ? [140, 95, 50] : /dirt_path|farmland|gravel/.test(n) ? [200, 170, 100]
  : /wheat|carrot|potato|beetroot/.test(n) ? [220, 200, 60] : /sand/.test(n) ? [230, 215, 150] : /grass_block|dirt|podzol|moss/.test(n) ? [90, 160, 70]
  : /snow|ice/.test(n) ? [240, 240, 250] : [130, 130, 130]
const N = 2 * R + 1
const { createCanvas } = (() => { try { return require('canvas') } catch (e) { return {} } })()
const px = Buffer.alloc(N * S * N * S * 3)
const data = {}
for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
  let y = 160, b = null
  for (; y > -60; y--) { b = W.getBlock(new Vec3(X + dx, y, Z + dz)); if (b && !skip.test(b.name)) break }
  if (!b) continue
  data[`${dx},${dz}`] = [y, b.name]
  const c = col(b.name), k = Math.max(0.55, Math.min(1.35, 1 + (y - Y) * 0.04))
  for (let a = 0; a < S; a++) for (let e = 0; e < S; e++) {
    const gx = (dx + R) * S + e, gy = (dz + R) * S + a
    const grid = (e === 0 && (dx % 4 === 0)) || (a === 0 && (dz % 4 === 0))
    const axis = (e === 0 && dx === 0) || (a === 0 && dz === 0)
    const i = (gy * N * S + gx) * 3
    for (let q = 0; q < 3; q++) px[i + q] = axis ? [255, 0, 0][q] : grid ? Math.min(255, c[q] * k * 0.6) : Math.min(255, c[q] * k)
  }
}
fs.writeFileSync(out + '.json', JSON.stringify(data))
// write a PPM and let ffmpeg turn it into a PNG (no image library needed)
const ppm = Buffer.concat([Buffer.from(`P6 ${N * S} ${N * S} 255\n`), px])
fs.writeFileSync(out + '.ppm', ppm)
require('child_process').execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out + '.ppm', out])
fs.unlinkSync(out + '.ppm')
console.log(`${out}: ${N}x${N} columns around (${X}, ${Y}, ${Z}), ${S} px a block, grid every 4, red = the origin's axes`)
