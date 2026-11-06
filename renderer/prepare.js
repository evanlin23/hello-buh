// Resolve the jar's blockstates + models against our atlas into the mesher's format.
// usage: node renderer/prepare.js 1.21.11   (after build_assets.py)
const fs = require('fs')
const path = require('path')
const { prepareBlocksStates } = require('./modelsBuilder')
const ver = process.argv[2]
const dir = path.join(__dirname, '..', 'work', 'assets', ver)
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f)))
const assets = { blocksStates: read('blockstates.json'), blocksModels: read('models.json') }
const atlas = { json: read('atlas.json') }
const out = prepareBlocksStates(assets, atlas)
fs.writeFileSync(path.join(dir, 'resolved.json'), JSON.stringify(out))
console.log('resolved', Object.keys(out).length, 'blockstates')
