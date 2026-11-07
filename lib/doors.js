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
  // wide and tall: the opening looks up at the facade from 20 blocks out, and a cut tree's canopy
  // floated in its sky
  const cx0 = x0 - 26, cx1 = x1 + 26, cz0 = Z - DEPTH - 8, cz1 = Z + 26
  for (let z0 = cz0; z0 <= cz1; z0 += 8) {
    const z1 = Math.min(z0 + 7, cz1)
    for (let y0 = F + 1; y0 <= F + 40; y0 += 8) { await ctx.cmd(`/fill ${cx0} ${y0} ${z0} ${cx1} ${y0 + 7} ${z1} air`); await nap() }
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
  // the digits are one block thick: back each with wall inside, or the "5" reads as a mirrored "2"
  // from inside the room
  for (let i = 0; i < n; i++) { const dx = doorX(X, n, i); await ctx.cmd(`/fill ${dx - 1} ${F + 4} ${Z - 1} ${dx + 1} ${F + 8} ${Z - 1} ${WALL}`) }
  // the doors last (a door needs both halves; the upper half first, then the lower one with its update)
  for (let i = 0; i < n; i++) await placeDoor(ctx, doorX(X, n, i), F + 1, Z)
}

async function placeDoor (ctx, x, y, z) {
  await ctx.cmd(`/setblock ${x} ${y} ${z} air`)
  await ctx.cmd(`/setblock ${x} ${y + 1} ${z} air`)
  await ctx.cmd(`/setblock ${x} ${y} ${z} spruce_door[facing=north,half=lower,hinge=left,open=false]`)
  await ctx.cmd(`/setblock ${x} ${y + 1} ${z} spruce_door[facing=north,half=upper,hinge=left,open=false]`)
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
    mob: 'zombie',
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'stone_bricks'))
      await ctx.cmd(box(dx, Z, F + 5, F + 5, WALL))
      for (const dz of [-2, -5, -8, -11]) for (const ddx of [-1, 1]) await ctx.cmd(`/setblock ${dx + ddx} ${F + 5} ${Z + dz} glowstone`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    async populate (ctx, dx, Z, F) {
      let k = 0
      for (const dz of [-3, -4, -5, -6]) for (const ddx of [-2, -1, 1, 2]) {
        if ((k++) % 2 && dz < -4) continue
        ctx.bot.chat(`/summon zombie ${dx + ddx + 0.5} ${F + 1} ${Z + dz + 0.5} {PersistenceRequired:1b,IsBaby:0b,CanBreakDoors:0b,NoAI:1b,Rotation:[0f,0f]}`)
      }
      await ctx.bot.waitForTicks(4)
    }
  },
  // a pressure plate just inside, open sky above: anvils come down when it clicks
  anvils: {
    async build (ctx, dx, Z, F) {
      const T = F + 12
      for (const side of [-3, 3]) await ctx.cmd(`/fill ${dx + side} ${F + 6} ${Z - DEPTH - 1} ${dx + side} ${T + 1} ${Z - 1} ${WALL}`)
      await ctx.cmd(`/fill ${dx - 3} ${F + 6} ${Z - DEPTH - 1} ${dx + 3} ${T + 1} ${Z - DEPTH - 1} ${WALL}`)
      await ctx.cmd(`/fill ${dx - 3} ${F + 11} ${Z} ${dx + 3} ${T + 1} ${Z} ${WALL}`)
      await ctx.cmd(box(dx, Z, F, F, 'smooth_stone'))
      await ctx.cmd(box(dx, Z, T, T, 'spruce_trapdoor[half=top,facing=north,open=false]'))   // a trapdoor roof holding the anvils
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 2} stone_pressure_plate`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
      // the anvils sit on the glass roof, denser near the door
      let seed = 3
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
      this.anvilAt = this.anvilAt || {}
      const at = this.anvilAt[dx] = []
      for (let z = 2; z <= 12; z++) for (let ox = -2; ox <= 2; ox++) if (rnd() < (z <= 5 ? 0.85 : 0.5)) { await ctx.cmd(`/setblock ${dx + ox} ${T + 1} ${Z - z} anvil[facing=east]`); at.push([dx + ox, T + 1, Z - z]) }
    },
    // the trap: the trapdoor roof swings open (its redstone is behind the wall), the anvils drop
    // (an open trapdoor still holds an anvil in vanilla, so each anvil becomes a falling anvil in the
    // same tick, as FallingBlock does when its support goes: the redstone would pull the floor under them)
    async trigger (ctx, dx, Z, F) {
      ctx.bot.chat(`/fill ${dx - 2} ${F + 12} ${Z - DEPTH} ${dx + 2} ${F + 12} ${Z - 1} spruce_trapdoor[half=top,facing=north,open=true] replace spruce_trapdoor`)
      for (const [x, y, z] of (this.anvilAt || {})[dx] || []) {
        ctx.bot.chat(`/setblock ${x} ${y} ${z} air`)
        ctx.bot.chat(`/summon falling_block ${x + 0.5} ${(y - 0.05).toFixed(2)} ${z + 0.5} {BlockState:{Name:"minecraft:anvil",Properties:{facing:"east"}},Time:1,HurtEntities:1b,FallHurtAmount:2f,FallHurtMax:40}`)
      }
    }
  },
  // a room full of creepers (open sky, grass)
  creepers: {
    mob: 'creeper',
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
  // "the safe one": a cosy bedroom (red carpet, flowers, bookshelves, a bed, open to the sky)
  // whose floor is TNT under the carpet; a wooden pressure plate halfway in is the trigger
  safe: {
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F - 2, F - 2, 'stone'))
      await ctx.cmd(box(dx, Z, F - 1, F, 'tnt'))
      await ctx.cmd(`/fill ${dx - 2} ${F - 1} ${Z - 2} ${dx + 2} ${F} ${Z - 1} oak_planks`)   // the doormat strip
      await ctx.cmd(box(dx, Z, F + 1, F + 1, 'red_carpet'))
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 5} oak_pressure_plate`)
      // furniture: bookshelves along the sides, flowers, the bed and the diamonds at the back
      for (const side of [-2, 2]) await ctx.cmd(`/fill ${dx + side} ${F + 1} ${Z - 9} ${dx + side} ${F + 2} ${Z - 8} bookshelf`)
      await ctx.cmd(`/setblock ${dx - 2} ${F + 1} ${Z - 12} red_bed[facing=north,part=head]`)
      await ctx.cmd(`/setblock ${dx - 2} ${F + 1} ${Z - 11} red_bed[facing=north,part=foot]`)
      await ctx.cmd(`/setblock ${dx + 2} ${F + 1} ${Z - 12} diamond_block`)
      for (const [ddx, dz, f] of [[-2, -3, 'potted_poppy'], [2, -3, 'potted_dandelion'], [2, -10, 'potted_blue_orchid'], [-2, -5, 'potted_allium'], [2, -5, 'potted_oxeye_daisy']]) {
        await ctx.cmd(`/setblock ${dx + ddx} ${F + 1} ${Z + dz} ${f}`)
      }
    }
  },
  // no floor: a 25-block shaft (the fall kills), diamonds at the bottom
  drop: {
    async build (ctx, dx, Z, F) {
      for (let y0 = F - 27; y0 <= F - 1; y0 += 9) await ctx.cmd(`/fill ${dx - 3} ${y0} ${Z - DEPTH - 1} ${dx + 3} ${Math.min(y0 + 8, F - 1)} ${Z - 1} stone`)
      for (let y0 = F - 25; y0 <= F; y0 += 9) await ctx.cmd(box(dx, Z, y0, Math.min(y0 + 8, F), 'air'))
      await ctx.cmd(`/fill ${dx - 1} ${F - 26} ${Z - 4} ${dx + 1} ${F - 26} ${Z - 2} diamond_block`)
    }
  },
  // endermen under a roof (in the sun they teleport about); nothing happens unless you look at one
  endermen: {
    mob: 'enderman',
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'quartz_block'))   // light floor: black endermen on a dark one never read
      await ctx.cmd(box(dx, Z, F + 5, F + 5, WALL))
      for (const dz of [-2, -5, -8, -11]) for (const ddx of [-1, 1]) await ctx.cmd(`/setblock ${dx + ddx} ${F + 5} ${Z + dz} glowstone`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    async populate (ctx, dx, Z, F) {
      for (const [ddx, dz, r] of [[-2, -3, 40], [2, -4, 200], [-1, -6, 120], [2, -8, 300], [-2, -9, 80], [0, -10, 170]]) {
        ctx.bot.chat(`/summon enderman ${dx + ddx + 0.5} ${F + 1} ${Z + dz + 0.5} {PersistenceRequired:1b,NoAI:1b,Rotation:[${r}f,0f]}`)
      }
      await ctx.bot.waitForTicks(4)
    }
  },
  // big magma cubes on netherrack, open sky
  magma: {
    mob: 'magma_cube',
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'netherrack'))
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    async populate (ctx, dx, Z, F) {
      // size 2 (Size:1): a size-4 cube is 2 blocks wide and never fit through the doorway
      for (const [ddx, dz] of [[-1, -3], [1, -4], [0, -6], [-2, -7], [2, -8], [-1, -10], [1, -11]]) {
        ctx.bot.chat(`/summon magma_cube ${dx + ddx + 0.5} ${F + 1} ${Z + dz + 0.5} {PersistenceRequired:1b,NoAI:1b,Size:1,Rotation:[0f,0f]}`)
      }
      await ctx.bot.waitForTicks(4)
    }
  },
  // a tall dripstone cave: stalactites hang from a dripstone layer under the roof; a plate just
  // inside drops them (the layer above each one goes, and vanilla drops the stalactite)
  dripstone: {
    async build (ctx, dx, Z, F) {
      const T = F + 13
      for (const side of [-3, 3]) await ctx.cmd(`/fill ${dx + side} ${F + 6} ${Z - DEPTH - 1} ${dx + side} ${T + 1} ${Z - 1} ${WALL}`)
      await ctx.cmd(`/fill ${dx - 3} ${F + 6} ${Z - DEPTH - 1} ${dx + 3} ${T + 1} ${Z - DEPTH - 1} ${WALL}`)
      await ctx.cmd(`/fill ${dx - 3} ${F + 11} ${Z} ${dx + 3} ${T + 1} ${Z} ${WALL}`)
      await ctx.cmd(box(dx, Z, F, F, 'dripstone_block'))
      await ctx.cmd(box(dx, Z, T + 1, T + 1, 'tuff'))
      await ctx.cmd(box(dx, Z, T, T, 'dripstone_block'))
      // light: glowstone in the dripstone layer itself between the stalactites, and up the walls
      // (above the layer it lit nothing)
      for (let z = 1; z <= 11; z++) for (const ox of [-2, -1, 0, 1, 2]) {
        if ((z + ox * 3) % 3 === 0 || (ox === 0 && z <= 3)) {
          await ctx.cmd(`/setblock ${dx + ox} ${T - 1} ${Z - z} pointed_dripstone[vertical_direction=down,thickness=base]`)
          await ctx.cmd(`/setblock ${dx + ox} ${T - 2} ${Z - z} pointed_dripstone[vertical_direction=down,thickness=frustum]`)
          await ctx.cmd(`/setblock ${dx + ox} ${T - 3} ${Z - z} pointed_dripstone[vertical_direction=down,thickness=tip]`)
        }
      }
      for (let z = 1; z <= 11; z++) for (const ox of [-2, -1, 0, 1, 2]) {
        if (!((z + ox * 3) % 3 === 0 || (ox === 0 && z <= 3)) && (z + ox) % 2 === 0) await ctx.cmd(`/setblock ${dx + ox} ${T} ${Z - z} glowstone`)
      }
      for (const dz of [-3, -7, -11]) for (const side of [-3, 3]) await ctx.cmd(`/setblock ${dx + side} ${F + 6} ${Z + dz} glowstone`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 2} stone_pressure_plate`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    // the drop: the dripstone layer over every stalactite goes (out of shot, behind the roof line)
    async trigger (ctx, dx, Z, F) {
      const T = F + 13
      ctx.bot.chat(`/fill ${dx - 2} ${T} ${Z - DEPTH} ${dx + 2} ${T} ${Z - 1} air replace dripstone_block`)
    }
  },
  // "the safe one", part 2: a cosy room with a cat, the floor spruce trapdoors over a 12-deep pit
  // with lava at the bottom; they all swing open halfway across
  trapdoor: {
    async build (ctx, dx, Z, F) {
      for (let y0 = F - 14; y0 <= F - 1; y0 += 7) await ctx.cmd(`/fill ${dx - 3} ${y0} ${Z - DEPTH - 1} ${dx + 3} ${y0 + 6} ${Z - 1} stone`)
      await ctx.cmd(`/fill ${dx - 2} ${F - 13} ${Z - 10} ${dx + 2} ${F} ${Z - 2} air`)
      await ctx.cmd(`/fill ${dx - 2} ${F - 13} ${Z - 10} ${dx + 2} ${F - 13} ${Z - 2} lava`)
      await ctx.cmd(`/fill ${dx - 2} ${F} ${Z - 10} ${dx + 2} ${F} ${Z - 2} spruce_trapdoor[half=top,open=false,facing=north]`)
      await ctx.cmd(`/fill ${dx - 2} ${F} ${Z - 1} ${dx + 2} ${F} ${Z - 1} spruce_planks`)
      await ctx.cmd(`/fill ${dx - 2} ${F} ${Z - 12} ${dx + 2} ${F} ${Z - 11} spruce_planks`)
      // open to the sky (the replay looks down into the pit from above)
      await ctx.cmd(`/setblock ${dx - 1} ${F + 1} ${Z - 12} light_blue_bed[facing=north,part=head]`)
      await ctx.cmd(`/setblock ${dx - 1} ${F + 1} ${Z - 11} light_blue_bed[facing=north,part=foot]`)
      await ctx.cmd(`/setblock ${dx + 2} ${F + 1} ${Z - 12} diamond_block`)
      await ctx.cmd(`/fill ${dx - 2} ${F + 1} ${Z - 12} ${dx - 2} ${F + 2} ${Z - 11} bookshelf`)
      for (const [ddx, dz, f] of [[-2, -1, 'potted_cornflower'], [2, -1, 'potted_pink_tulip'], [1, -12, 'potted_lily_of_the_valley'], [2, -11, 'potted_red_tulip']]) await ctx.cmd(`/setblock ${dx + ddx} ${F + 1} ${Z + dz} ${f}`)
    },
    async populate (ctx, dx, Z, F) {
      ctx.bot.chat(`/summon cat ${dx + 0.5} ${F + 1} ${Z - 11.5} {PersistenceRequired:1b,NoAI:1b,variant:"minecraft:red",Rotation:[0f,0f]}`)
      await ctx.bot.waitForTicks(4)
    },
    async trigger (ctx, dx, Z, F) {
      ctx.bot.chat(`/fill ${dx - 2} ${F} ${Z - 10} ${dx + 2} ${F} ${Z - 2} spruce_trapdoor[half=top,open=true,facing=north] replace spruce_trapdoor`)
    }
  }
  ,
  // a ravager in a dirt pen (open sky)
  ravager: {
    mob: 'ravager',
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'coarse_dirt'))
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    async populate (ctx, dx, Z, F) {
      ctx.bot.chat(`/summon ravager ${dx + 0.5} ${F + 1} ${Z - 7.5} {PersistenceRequired:1b,NoAI:1b,Rotation:[0f,0f]}`)
      await ctx.bot.waitForTicks(4)
    }
  },
  // packed with TNT both sides of a 1-wide path, three high: harmless without a spark
  tnt_room: {
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'smooth_stone'))
      await ctx.cmd(`/fill ${dx - 2} ${F + 1} ${Z - 11} ${dx + 2} ${F + 3} ${Z - 2} tnt`)
      await ctx.cmd(`/fill ${dx} ${F + 1} ${Z - 11} ${dx} ${F + 3} ${Z - 2} air`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    }
  },
  // hoglins on crimson nylium (immune to zombifying, so they don't shake)
  hoglins: {
    mob: 'hoglin',
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'crimson_nylium'))
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    async populate (ctx, dx, Z, F) {
      for (const [ddx, dz, r] of [[-1, -4, 20], [1, -7, 340], [-1, -10, 10]]) {
        ctx.bot.chat(`/summon hoglin ${dx + ddx + 0.5} ${F + 1} ${Z + dz + 0.5} {PersistenceRequired:1b,NoAI:1b,IsImmuneToZombification:1b,Rotation:[${r}f,0f]}`)
      }
      await ctx.bot.waitForTicks(4)
    }
  },
  // a corridor lined with dispensers in both walls; a plate just inside sets them off
  arrows: {
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'mossy_stone_bricks'))
      await ctx.cmd(box(dx, Z, F + 5, F + 5, WALL))
      for (const dz of [-2, -5, -8, -11]) await ctx.cmd(`/setblock ${dx} ${F + 5} ${Z + dz} glowstone`)
      for (let z = 2; z <= 11; z += 2) for (const y of [F + 1, F + 2]) {
        await ctx.cmd(`/setblock ${dx - 3} ${y} ${Z - z} dispenser[facing=east]`)
        await ctx.cmd(`/setblock ${dx + 3} ${y} ${Z - z} dispenser[facing=west]`)
      }
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 2} stone_pressure_plate`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    // a volley: an arrow out of each dispenser face (vanilla: power 1.1, spread 6), with the click
    // (the row level with the plate holds fire: hits knocked the bot sideways into the door frame)
    volley (ctx, dx, Z, F, rnd) {
      for (let z = 4; z <= 11; z += 2) for (const y of [F + 1, F + 2]) for (const side of [-1, 1]) {
        const vx = -side * 1.1, vy = 0.1 + (rnd() - 0.5) * 0.1, vz = (rnd() - 0.5) * 0.12
        ctx.bot.chat(`/summon arrow ${(dx + 0.5 + side * 2.4).toFixed(2)} ${y + 0.5} ${(Z - z + 0.5).toFixed(2)} {Motion:[${vx.toFixed(3)},${vy.toFixed(3)},${vz.toFixed(3)}],pickup:0b}`)
      }
      ctx.sound('block.dispenser.launch', 1, 1)
    }
  }
  ,
  // "the empty one": a dark, quiet room (moss floor, no lights); a warden waits at the very back
  warden: {
    mob: 'warden',
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'moss_block'))
      await ctx.cmd(box(dx, Z, F + 5, F + 5, WALL))
      await ctx.cmd(`/fill ${dx - 2} ${F + 1} ${Z - 10} ${dx + 2} ${F + 1} ${Z - 2} moss_carpet`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 3} sculk_sensor`)
    },
    async populate (ctx, dx, Z, F) {
      ctx.bot.chat(`/summon warden ${dx + 0.5} ${F + 1} ${Z - 11.5} {PersistenceRequired:1b,NoAI:1b,Rotation:[0f,0f]}`)
      await ctx.bot.waitForTicks(4)
    }
  }
  ,
  // an iron golem in a garden pen (it's angry at you: it launches you on a hit)
  golem: {
    mob: 'iron_golem',
    async build (ctx, dx, Z, F) {
      await ctx.cmd(box(dx, Z, F, F, 'grass_block'))
      for (const [ddx, dz, f] of [[-2, -4, 'poppy'], [2, -6, 'poppy'], [-2, -9, 'dandelion'], [2, -10, 'poppy']]) await ctx.cmd(`/setblock ${dx + ddx} ${F + 1} ${Z + dz} ${f}`)
      await ctx.cmd(`/setblock ${dx} ${F + 1} ${Z - 12} diamond_block`)
    },
    async populate (ctx, dx, Z, F) {
      ctx.bot.chat(`/summon iron_golem ${dx + 0.5} ${F + 1} ${Z - 5.5} {PersistenceRequired:1b,NoAI:1b,Rotation:[0f,0f]}`)
      await ctx.bot.waitForTicks(4)
    }
  }
}

// A room's mobs stand still (NoAI) until their door opens, so nothing wanders to the door or out of
// another room first; this turns their AI on (the mobs look idle until then, and the room is closed).
function wake (ctx, type, dx, Z, F) {
  ctx.bot.chat(`/execute as @e[type=${type},x=${dx - 2},y=${F},z=${Z - DEPTH},dx=4,dy=4,dz=${DEPTH - 1}] run data merge entity @s {NoAI:0b}`)
}

module.exports = { GAP, DEPTH, doorX, build, ROOMS, placeDoor, wake }
