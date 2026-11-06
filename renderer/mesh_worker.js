// One slice of the initial world mesh, in a worker thread (render.js meshes the whole recorded area
// before the first frame: ~19 s on one core for a typical recording). Same inputs as the main
// thread (columns, light, Brightness, time of day, weather), so the blob is byte-identical.
const { parentPort, workerData } = require('worker_threads')
const fs = require('fs')
const { Mesher } = require('./mesher')
const { setBrightness, setDayTime } = require('./models')

const { recPath, minVisibleY, brightness, dayTime, rain, thunder, list } = workerData
setBrightness(brightness)
setDayTime(dayTime, rain, thunder)
const rec = JSON.parse(fs.readFileSync(recPath))
const m = new Mesher(rec.version)
m.addColumns(rec.columns)
m.computeLight(minVisibleY)
const b = m.pack(list)
const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length)
parentPort.postMessage(ab, [ab])
