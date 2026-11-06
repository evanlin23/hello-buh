// Runs one stunt on the local server and records it: STUNT=<name> RECORD=work/x.rec.json node bot.js
// Stunts live in stunts/<name>.js; the shared harness (recording, helpers) is lib/harness.js.
const { run } = require('./lib/harness')
const name = process.env.STUNT || 'water_clutch'
run(require(`./stunts/${name}`))
