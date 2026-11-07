// "Which door would you pick? 🚪" (worker 14, docs/ideas.md "New formats" #3): a row of numbered
// doors in one facade; each opens on a different danger and the bot walks in. Every room is real
// vanilla: lava, mobs with their own AI (difficulty normal), falling anvils, primed TNT. Commands
// only build the rooms and stand in for hidden redstone under the floor (a trap's wiring is never
// on camera).
//
// Layout (facing north = -z, mineflayer yaw 0): the facade is the wall at z = Z, doors at
// x = X + (i - (n-1)/2) * GAP, each 2 high at y F+1..F+2. Room i's inside is x dx-2..dx+2,
// z Z-1..Z-DEPTH, with walls at dx±3 (shared) and z = Z-DEPTH-1. A 3x5 digit above each door.
const GAP = 6
const DEPTH = 12
const WALL = 'deepslate_bricks'
const DIGITS = {
  1: ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  2: ['XXX', '..X', 'XXX', 'X..', 'XXX'],
  3: ['XXX', '..X', 'XXX', '..X', 'XXX'],
  4: ['X.X', 'X.X', 'XXX', '..X', '..X'],
  5: ['XXX', 'X..', 'XXX', '..X', 'XXX']
}

function doorX (X, n, i) { return X + Math.round((i - (n - 1) / 2) * GAP) }

// The facade, the room shells and the front yard. rooms: list of room ids (builders below).
async function build (ctx, X, Z, F, rooms) {
  const n = rooms.length
  const x0 = doorX(X, n, 0) - 3, x1 = doorX(X, n, n - 1) + 3
  const nap = () => new Promise(resolve => setTimeout(resolve, 120))
  // clear the whole site (rooms behind, yard in front), slabs under the /fill cap
  const cx0 = x0 - 14, cx1 = x1 + 14, cz0 = Z - DEPTH - 8, cz1 = Z + 22
  for (let z0 = cz0; z0 <= cz1; z0 += 8) {
    const z1 = Math.min(z0 + 7, cz1)
    for (let y0 = F + 1; y0 <= F + 24; y0 += 8) { await ctx.cmd(`/fill ${cx0} ${y0} ${z0} ${cx1} ${y0 + 7} ${z1} air`); await nap() }
    await ctx.cmd(`/fill ${cx0} ${F} ${z0} ${cx1} ${F} ${z1} grass_block`)
    await ctx.cmd(`/fill ${cx0} ${F - 6} ${z0} ${cx1} ${F - 1} ${z1} dirt`)
  }
  // the shells: floor, walls, back wall
  await ctx.cmd(`/fill ${x0} ${F - 3} ${Z - DEPTH - 1} ${x1} ${F} ${Z} stone`)
  await ctx.cmd(`/fill ${x0} ${F + 1} ${Z - DEPTH - 1} ${x1} ${F + 5} ${Z - DEPTH - 1} ${WALL}`)
  for (let i = 0; i <= n; i++) {
    const wx = doorX(X, n, 0) - 3 + i * GAP
    await ctx.cmd(`/fill ${wx} ${F + 1} ${Z - DEPTH - 1} ${wx} ${F + 5} ${Z} ${WALL}`)
  }
  // the facade: 9 high with a dark top band, the digits above the doors
  await ctx.cmd(`/fill ${x0} ${F + 1} ${Z} ${x1} ${F + 9} ${Z} ${WALL}`)
  await ctx.cmd(`/fill ${x0} ${F + 10} ${Z} ${x1} ${F + 10} ${Z} polished_blackstone_brick_wall`)
  await ctx.cmd(`/fill ${x0} ${F} ${Z + 1} ${x1} ${F} ${Z + 2} polished_andesite`)   // a step of path in front
  for (let i = 0; i < n; i++) {
    const dx = doorX(X, n, i)
    const rows = DIGITS[i + 1]
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) if (rows[r][c] === 'X') await ctx.cmd(`/setblock ${dx - 1 + c} ${F + 8 - r} ${Z} white_concrete`)
    }
  }
  // each room's inside
  for (let i = 0; i < n; i++) await ROOMS[rooms[i]].build(ctx, doorX(X, n, i), Z, F)
  // the doors last (a door needs both halves; the upper half first, then the lower one with its update)
  for (let i = 0; i < n; i++) await placeDoor(ctx, doorX(X, n, i), F + 1, Z)
}

async function placeDoor (ctx, x, y, z) {
  await ctx.cmd(`/setblock ${x} ${y} ${z} air`)
  await ctx.cmd(`/setblock ${x} ${y + 1} ${z} air`)
  await ctx.cmd(`/setblock ${x} ${y} ${z} oak_door[facing=north,half=lower,hinge=left,open=false]`)
  await ctx.cmd(`/setblock ${x} ${y + 1} ${z} oak_door[facing=north,half=upper,hinge=left,open=false]`)
}

// Room builders: build (ctx, dx, Z, F) fills the inside x dx-2..dx+2, z Z-1..Z-DEPTH.
const IN = (dx, Z) => `${dx - 2} ? ${Z - DEPTH} ${dx + 2} ? ${Z - 1}`
const box = (dx, Z, y0, y1, what) => `/fill ${IN(dx, Z).replace('?', y0).replace('?', y1)} ${what}`
const ROOMS = {
  // a 1-wide stone bridge over a lava pit (1 deep: the eye stays above it), a 1-block gap, then a
  // 4-block gap nobody walks across; diamonds on the far side
  lava: {
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F - 2, F - 2, 'stone'))
      await ctx.cmd(box(dx, Z, F - 1, F, 'air'))
      await ctx.cmd(box(dx, Z, F - 1, F - 1, 'lava'))
      await ctx.cmd(`/fill ${dx - 2} ${F - 1} ${Z - 1} ${dx + 2} ${F} ${Z - 1} stone`)        // the landing inside the door
      for (const [a, b] of [[2, 4], [6, 7], [12, 12]]) await ctx.cmd(`/fill ${dx} ${F - 1} ${Z - b} ${dx} ${F} ${Z - a} stone`)
      await ctx.cmd(`/fill ${dx - 2} ${F - 1} ${Z - 12} ${dx + 2} ${F} ${Z - 12} stone`)       // the far landing
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    }
  },
  // a horde of zombies at the back (roofed: zombies burn in daylight), lit by glowstone
  zombies: {
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'stone_bricks'))
      await ctx.cmd(box(dx, Z, F + 5, F + 5, WALL))
      for (const dz of [-2, -5, -8, -11]) for (const ddx of [-1, 1]) await ctx.cmd(`/setblock ${dx + ddx} ${F + 5} ${Z + dz} glowstone`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    async populate (ctx, dx, Z, F) {
      let k = 0
      for (const dz of [-5, -6, -7, -8]) for (const ddx of [-2, -1, 1, 2]) {
        if ((k++) % 2 && dz < -6) continue
        ctx.bot.chat(`/summon zombie ${dx + ddx + 0.5} ${F + 1} ${Z + dz + 0.5} {PersistenceRequired:1b,IsBaby:0b,CanBreakDoors:0b,NoAI:1b,Rotation:[0f,0f]}`)
      }
      await ctx.bot.waitForTicks(4)
    }
  },
  // a pressure plate just inside, open sky above: anvils come down when it clicks
  anvils: {
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'smooth_stone'))
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 2} stone_pressure_plate`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    }
  },
  // a room full of creepers (open sky, grass)
  creepers: {
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'grass_block'))
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    async populate (ctx, dx, Z, F) {
      for (const dz of [-3, -5, -7, -9]) for (const ddx of [-2, 0, 2]) {
        ctx.bot.chat(`/summon creeper ${dx + ddx + 0.5} ${F + 1} ${Z + dz + 0.5} {PersistenceRequired:1b,NoAI:1b,Rotation:[0f,0f]}`)
      }
      await ctx.bot.waitForTicks(4)
    }
  },
  // "the safe one": a cosy bedroom (red carpet, flowers, bookshelves, a bed, glowstone ceiling)
  // whose floor is TNT under the carpet; a wooden pressure plate halfway in is the trigger
  safe: {
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F - 1, F - 1, 'stone'))
      await ctx.cmd(box(dx, Z, F, F, 'tnt'))
      await ctx.cmd(`/fill ${dx - 2} ${F} ${Z - 2} ${dx + 2} ${F} ${Z - 1} oak_planks`)   // the doormat strip
      await ctx.cmd(box(dx, Z, F + 1, F + 1, 'red_carpet'))
      await ctx.cmd(`/setblock ${dx} ${F} ${Z - 5} oak_planks`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 5} oak_pressure_plate`)
      await ctx.cmd(box(dx, Z, F + 5, F + 5, 'oak_planks'))
      for (const dz of [-3, -7, -11]) for (const ddx of [-1, 1]) await ctx.cmd(`/setblock ${dx + ddx} ${F + 5} ${Z + dz} glowstone`)
      // furniture: bookshelves along the sides, flowers, the bed and the diamonds at the back
      for (const side of [-2, 2]) await ctx.cmd(`/fill ${dx + side} ${F + 1} ${Z - 9} ${dx + side} ${F + 2} ${Z - 8} bookshelf`)
      await ctx.cmd(`/setblock ${dx - 2} ${F + 1} ${Z - 12} red_bed[facing=north,part=head]`)
      await ctx.cmd(`/setblock ${dx - 2} ${F + 1} ${Z - 11} red_bed[facing=north,part=foot]`)
      await ctx.cmd(`/setblock ${dx + 2} ${F + 1} ${Z - 12} diamond_block`)
      for (const [ddx, dz, f] of [[-2, -3, 'potted_poppy'], [2, -3, 'potted_dandelion'], [2, -10, 'potted_blue_orchid'], [-2, -5, 'potted_allium'], [2, -5, 'potted_oxeye_daisy']]) {
        await ctx.cmd(`/setblock ${dx + ddx} ${F + 1} ${Z + dz} ${f}`)
      }
    }
  }
}

// A room's mobs stand still (NoAI) until their door opens, so nothing wanders to the door or out of
// another room first; this turns their AI on (the mobs look idle until then, and the room is closed).
function wake (ctx, type, dx, Z, F) {
  ctx.bot.chat(`/execute as @e[type=${type},x=${dx - 2},y=${F},z=${Z - DEPTH},dx=4,dy=4,dz=${DEPTH - 1}] run data merge entity @s {NoAI:0b}`)
}

module.exports = { GAP, DEPTH, doorX, build, ROOMS, placeDoor, wake }
