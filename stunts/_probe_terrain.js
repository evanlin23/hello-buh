// Not a Short: sample the seed's ground heights over boxes (PROBE_BOXES="x0,z0,x1,z1;..." step PROBE_STEP) and write
// them to work/probe_terrain.json: {boxes: [{box, step, rows: [[y or null, top block]...]}]}. Scratch tool.
const fs = require('fs')
const path = require('path')
const BOXES = (process.env.PROBE_BOXES || '-360,-830,-240,-640').split(';').map(s => s.split(',').map(Number))
const STEP = Number(process.env.PROBE_STEP || 4)
module.exports = {
  name: '_probe_terrain',
  time: 6000, hideHand: true, botTimeout: 1500, recordRadius: 16, renderDistance: 8, shots: {}, edit: {},
  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const out = { boxes: [] }
    for (const [x0, z0, x1, z1] of BOXES) {
      await ctx.cmd(`/tp @s ${(x0 + x1) / 2} 200 ${(z0 + z1) / 2}`)
      await ctx.cmd('/gamemode spectator')
      await ctx.forceload({ x0, z0, x1, z1 }, 300000)
      const rows = []
      for (let z = z0; z <= z1; z += STEP) {
        const row = []
        for (let x = x0; x <= x1; x += STEP) {
          const b = ctx.surface(x, z)
          row.push(b ? [b.position.y, b.name.replace('minecraft:', '')] : null)
        }
        rows.push(row)
      }
      out.boxes.push({ box: [x0, z0, x1, z1], step: STEP, rows })
      ctx.log(`probed ${x0},${z0} .. ${x1},${z1}`)
      await ctx.cmd('/forceload remove all', { mayFail: true })
    }
    fs.writeFileSync(path.join(__dirname, '..', 'work', 'probe_terrain.json'), JSON.stringify(out))
    return { x: BOXES[0][0], y: 100, z: BOXES[0][1] }
  },
  async perform (ctx) { await ctx.bot.waitForTicks(5); return true }
}
