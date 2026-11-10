// Render the 'shot' marks of a recording as small jpg stills (set catalog / demo stills).
//   node scripts/set_stills.js <stunt|rec.json> <outdir> [WxH]   reads work/<stunt>.rec.json, writes <outdir>/<name>.jpg
// Each still is taken 4 ticks after its mark (the cut has landed and the chunks are in).
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const [stunt, outDir, size = '540x506'] = process.argv.slice(2)
const [W, H] = size.split('x')
const recPath = stunt.endsWith('.json') ? stunt : path.join(__dirname, '..', 'work', `${stunt}.rec.json`)   // a stunt name or a recording
const rec = JSON.parse(fs.readFileSync(recPath, 'utf8'))
const shots = rec.timeline.filter(e => e.event === 'shot').map(e => ({ name: e.name, t: Math.round(e.t / 50) + 4 }))
const frames = path.join(__dirname, '..', 'work', `${path.basename(stunt, '.json')}.stills`)
fs.rmSync(frames, { recursive: true, force: true })
execFileSync('node', [path.join(__dirname, '..', 'render.js'), recPath, frames, '20', W, H], { env: { ...process.env, ONLY: shots.map(s => s.t).join(',') }, stdio: 'inherit' })
fs.mkdirSync(outDir, { recursive: true })
shots.forEach((s, i) => {
  const f = path.join(frames, `f${String(i).padStart(5, '0')}.png`)
  const out = path.join(outDir, `${s.name}.jpg`)
  if (fs.existsSync(f)) { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-q:v', '6', out]); console.log(out) } else console.log('missing', s.name)
})
fs.rmSync(frames, { recursive: true, force: true })
