// Bake every set piece's default variant to assets/sets/<name>.nbt (vanilla structure templates, our own builds).
// Load one in any 1.21.11 world: copy it to <world>/generated/hellobuh/structures/ and `/place template hellobuh:<name>`,
// or put it in a datapack under data/hellobuh/structure/. lib/sets/place() doesn't need these (it writes fresh ones).
//   node scripts/bake_sets.js
const fs = require('fs')
const path = require('path')
const sets = require('../lib/sets')
const out = path.join(__dirname, '..', 'assets', 'sets')
fs.mkdirSync(out, { recursive: true })
for (const { name } of sets.list()) {
  const v = sets.build(name)
  const buf = v.toNbt()
  fs.writeFileSync(path.join(out, `${name}.nbt`), buf)
  console.log(`${name}.nbt  ${v.bounds().size.join('x')}  ${v.count()} blocks  ${(buf.length / 1024).toFixed(1)} KB`)
}
