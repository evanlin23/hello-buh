// Pixel-art reveal factory: the bot builds pixel art on a wall block by block (real survival
// placements, camera sweeping smoothly), in an order chosen so it looks odd until the end.
//   art     rows of characters, '.' = empty
//   palette char -> block
//   first   chars placed first (e.g. the features), the rest fill from the outside in
const DIST = 7

module.exports = function pixelArt ({ name, art, palette, first = '', caption, edit, wall = 'stone_bricks', biome = 'minecraft:forest' }) {
  const ART = art
  const PALETTE = palette
  const WALL = wall
  const chars = Object.keys(PALETTE)
  return {
    name,
    biome: process.env.BIOME || biome,
    caption,
    edit,
  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land near spawn')
    const { x, z } = g, floor = g.y
    const H = ART.length, Wd = ART[0].length
    const zw = z - DIST - 1           // wall plane (north of the player); art sits at zw + 1
    this.x = x; this.z = z; this.floor = floor; this.zw = zw
    await ctx.defaultRules()
    // small flat clearing: from behind the wall to behind the player
    const x0 = x - 8, x1 = x + 8, z0 = zw - 2, z1 = z + 3
    await ctx.cmd(`/fill ${x0} ${floor - 2} ${z0} ${x1} ${floor - 1} ${z1} dirt`)
    await ctx.cmd(`/fill ${x0} ${floor} ${z0} ${x1} ${floor} ${z1} grass_block`)
    await ctx.cmd(`/fill ${x0} ${floor + 1} ${z0} ${x1} ${floor + 16} ${z1} air`)
    // the wall, 2 wider and taller than the art
    const base = floor + 1
    await ctx.cmd(`/fill ${x - (Wd >> 1) - 1} ${base} ${zw} ${x + (Wd >> 1) + 1} ${base + H + 1} ${zw} ${WALL}`)
    this.base = base + 1                              // bottom row of the art
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 10')
    await ctx.hotbar([...chars.map(c => [PALETTE[c], 64]), 'diamond_pickaxe', ['bread', 12]].slice(0, 9))
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 0)   // vanilla yaw 180 = facing north
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    // look at the middle of the art
    await ctx.easeLookAt(new ctx.Vec3(x + 0.5, this.base + H / 2, zw + 1), 50)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const H = ART.length, Wd = ART[0].length
    const cells = []
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < Wd; c++) {
        const ch = ART[r][c]
        if (!PALETTE[ch]) continue
        const p = new Vec3(this.x - (Wd >> 1) + c, this.base + (H - 1 - r), this.zw + 1)
        // outer cells first (distance from the centre, largest first), features before fill
        const ring = Math.max(Math.abs(c - (Wd >> 1)), Math.abs(r - (H >> 1)))
        cells.push({ p, ch, ring })
      }
    }
    const byRing = (a, b) => b.ring - a.ring || (b.p.y - a.p.y) || (a.p.x - b.p.x)
    const groups = []
    for (const ch of first) groups.push([cells.filter(c => c.ch === ch).sort((a, b) => b.p.y - a.p.y || a.p.x - b.p.x), chars.indexOf(ch)])
    const rest = cells.filter(c => !first.includes(c.ch)).sort(byRing)
    for (const ch of chars.filter(c => !first.includes(c))) groups.push([rest.filter(c => c.ch === ch), chars.indexOf(ch)])
    await bot.waitForTicks(10)
    let placed = 0
    // The camera follows a smoothed aim point that trails the block being placed (like a player
    // sweeping across the wall), instead of snapping onto every block.
    const center = new Vec3(this.x + 0.5, this.base + H / 2, this.zw + 1)
    let aim = center.clone()
    const lookToward = async (target, ticks) => {
      for (let i = 0; i < ticks; i++) {
        aim = aim.plus(target.minus(aim).scaled(0.25))
        const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
        await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
        await bot.waitForTicks(1)
      }
    }
    for (const [group, slot] of groups) {
      if (!group.length) continue
      ctx.select(slot)
      await bot.waitForTicks(3)
      for (const cell of group) {
        const ref = bot.blockAt(cell.p.offset(0, 0, -1))             // the wall block behind it
        await lookToward(cell.p.offset(0.5, 0.5, 0), 1)
        bot._client.write('block_place', {
          hand: 0, location: ref.position, direction: 3,              // face 3 = south (+z)
          cursorX: 0.5, cursorY: 0.5, cursorZ: 1, insideBlock: false, worldBorderHit: false, sequence: 0
        })
        bot.swingArm()
        ctx.sound(`block.${ctx.soundGroup(PALETTE[cell.ch])}.place`, 1.0, 0.8)
        await lookToward(cell.p.offset(0.5, 0.5, 0), 1)
        placed++
      }
    }
    ctx.mark('complete')
    await bot.waitForTicks(6)
    // check the result
    let ok = 0
    for (const cell of cells) { const b = bot.blockAt(cell.p); if (b && b.name === PALETTE[cell.ch]) ok++ }
    ctx.log(`placed ${placed}, correct ${ok}/${cells.length}`)
    // hold on the finished face, slight drift back to centre
    await lookToward(center, 16)
    await bot.waitForTicks(10)
    return ok === cells.length
  }
}
}
