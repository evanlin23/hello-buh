// One slice of a whole-world mesh (the first, or a re-mesh when the sky light factor changes), in a worker thread (render.js meshes the whole recorded area
// before the first frame: ~19 s on one core for a typical recording). Same inputs as the main
// thread (columns, light, Brightness, time of day, weather), so the blob is byte-identical.
const { parentPort, workerData } = require('worker_threads')
const fs = require('fs')
const { Mesher } = require('./mesher')
const { setBrightness, setDayTime, setDimension } = require('./models')

const { recPath, minVisibleY, brightness, dayTime, rain, thunder, list, dimension, blocksDone } = workerData
setBrightness(brightness)
setDimension(dimension)
setDayTime(dayTime, rain, thunder)
const rec = JSON.parse(fs.readFileSync(recPath))
const m = new Mesher(rec.version)
m.noSky = dimension === 'the_nether' || dimension === 'the_end'
m.addColumns(rec.columns)
// a re-mesh later in the recording: the world as it is after the first blocksDone block changes
for (let i = 0; i < (blocksDone || 0); i++) { const [, x, y, z, st] = rec.blocks[i]; m.setBlock(x, y, z, st) }
m.changed = []
m.computeLight(minVisibleY)
const b = m.pack(list)
const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length)
parentPort.postMessage(ab, [ab])
