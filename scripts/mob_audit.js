#!/usr/bin/env node
// Mob coverage audit (docs/engine_requests.md backlog #10): every living entity in the recording version's
// minecraft-data, and what the renderer has for it: a model (renderer/entity_models.json, or a hand-built one in
// renderer/entities.js) and any animation code beyond the generic walk swing and head turn.
//   node scripts/mob_audit.js [version]      (default 1.21.11, or the newest minecraft-data knows below it)
const fs = require('fs')
const path = require('path')
const ver = process.argv[2] || '1.21.11'
let md = require('minecraft-data')(ver)
if (!md) md = require('minecraft-data')('1.21.4')
const MODELS = require('../renderer/entity_models.json')
const src = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'entities.js'), 'utf8')
const living = md.entitiesArray.filter(e => ['mob', 'animal', 'hostile', 'passive', 'water_creature', 'ambient', 'living'].includes(e.type) && !/^(player|armor_stand|mannequin)$/.test(e.name))
// how entities.js refers to a mob: name === 'x', /^(...|x|...)$/ lists, B.x bone tests, poseX functions
const mentions = (n) => {
  const re = new RegExp(`(['"\`]${n}['"\`]|[(|^]${n}[|)$]|\\b${n}:)`, 'g')
  return (src.match(re) || []).length
}
const poseFn = (n) => new RegExp(`function pose${n.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')}\\b`).test(src)
const rows = living.map(e => {
  const model = MODELS[e.name] ? 'converted' : mentions(e.name) ? 'code' : '-'
  const anim = poseFn(e.name) ? 'pose fn' : mentions(e.name) > 1 ? 'special' : 'walk/head'
  return { name: e.name, model, anim }
}).sort((a, b) => (a.model === '-') - (b.model === '-') || a.name.localeCompare(b.name))
const missing = rows.filter(r => r.model === '-')
if (process.argv.includes('--json')) { console.log(JSON.stringify({ version: md.version.minecraftVersion, rows, missing: missing.map(r => r.name) })); process.exit(0) }
console.log(`${rows.length} living entities in minecraft-data ${md.version.minecraftVersion}; ${rows.length - missing.length} drawn, ${missing.length} not`)
for (const r of rows) console.log(`${r.name.padEnd(22)} ${r.model.padEnd(10)} ${r.anim}`)
console.log(`\nNOT DRAWN: ${missing.map(r => r.name).join(', ')}`)
