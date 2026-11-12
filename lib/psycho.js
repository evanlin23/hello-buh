// The "psycho" format (docs/formats.md `psycho`, r:rc40696; owner 2026-11-11: "fake psycho house"): a calm,
// first-person house tour played completely straight. From the yard it is almost a normal cottage, except the wheat
// field round it is on fire and the front door is ringed with flames. Inside it is a nether-brick mansion over an open
// lava lake: every room is a one-wide walkway or a small island over the lava (the couch, the kitchen's furnaces, the
// bathroom with a lava cauldron and a lavafall shower), and the tour ends on the bedroom: a bed on a pillar one jump
// across the lava. Each room gets a calm lower-third label, like an estate agent's tour.
//
// An episode is a stunt module:
//   module.exports = require('../lib/psycho').makeStunt({ name, caption, red, rooms: ['living_room', 'kitchen', ...],
//                                                          finale: 'bed_jump', edit })
// A new episode swaps the rooms (add a kind to ROOMS: build it on its island, say where the camera looks) or the
// finale. Everything is vanilla and static: fire with do_fire_tick off neither spreads nor burns out, the lava is a
// real lake (striders wander it), the furnaces are really smelting.
//
// Layout (x = east, z = south; the tour walks north, -z). The front wall is z = 0 with the door at x = 0; the hall
// inside is x -7..7, z -1..zN, floor walkways at y = F (the player's feet at F + 1), open air under them at F - 1 and
// the lava lake at F - 2. The spine walkway runs north along x = 0. Room i sits at z = -6 - 5i, on the west (-1)
// first and then alternating; its branch walkway leaves the spine at that z and its island is 4..6 blocks out.
// Invisible barriers line every walkway the player walks (never seen: the renderer skips them), so the walk is safe.
const { relaySounds } = require('./chain')
const { stepTurn, DEG } = require('./motion')
const makeAct = require('./act')

// The walking camera (as lib/cells.js): the aim follows `focus` through lib/motion.js's governor (a top speed, eased),
// the feet walk toward `steer` with the movement keys. `hold` pauses it while lib/act.js aims for an action.
function camera (ctx) {
  const { bot } = ctx
  const r = { focus: null, steer: null, hold: false, lim: { speed: 120 * DEG / 20, accel: 600 * DEG / 400 } }
  let cur = null, vel = { yaw: 0, pitch: 0 }
  const want = () => {
    const eye = bot.entity.position.offset(0, 1.62, 0), d = r.focus.minus(eye)
    return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
  }
  const keys = ['forward', 'back', 'left', 'right']
  const tick = () => {
    if (r.hold) { cur = null; return }
    if (!cur) { cur = { yaw: bot.entity.yaw, pitch: bot.entity.pitch }; vel = { yaw: 0, pitch: 0 } }
    if (r.focus) { const st = stepTurn(cur, vel, want(), r.lim); cur = st.cur; vel = st.vel }
    bot.look(cur.yaw, cur.pitch, true)   // motion-ok: the governor above eases every turn (lib/motion.js stepTurn)
    const p = bot.entity.position
    if (r.steer) {
      const dx = r.steer.x - p.x, dz = r.steer.z - p.z, yw = bot.entity.yaw
      const f = -Math.sin(yw) * dx - Math.cos(yw) * dz, sd = Math.cos(yw) * dx - Math.sin(yw) * dz
      const far = Math.hypot(dx, dz) > 0.3
      bot.setControlState('forward', far && f > 0.2 && f > 0.4 * Math.abs(sd)); bot.setControlState('back', far && f < -0.2 && -f > 0.4 * Math.abs(sd))
      bot.setControlState('right', far && sd > 0.2 && sd > 0.4 * Math.abs(f)); bot.setControlState('left', far && sd < -0.2 && -sd > 0.4 * Math.abs(f))
    } else if (!r.free) for (const c of keys) bot.setControlState(c, false)
  }
  bot.on('physicsTick', tick)
  r.until = async (cond, max = 200) => { for (let i = 0; i < max && !cond(); i++) await bot.waitForTicks(1) }
  r.stop = () => { bot.removeListener('physicsTick', tick); for (const c of keys) bot.setControlState(c, false) }
  return r
}

const SPACING = 5
const HALL = 7                       // the hall's half width (inside)
const H = 8                          // air above the walkways (the ceiling at F + 9)
const WALK = 'nether_bricks'

// --- the rooms ----------------------------------------------------------------------------------------------------
// build(r): r.put(x, y, z, block) / r.fill(...) in hall coords where x is mirrored to the room's side: x > 0 is away
// from the spine (r.s says which side), y above the walkway level, z along +z from the room's centre line.
// focus(r): where the camera looks from the spine (a Vec3). label: the lower-third text.
const ROOMS = {
  // a couch of nether-brick stairs on an island, a red rug, and a lit campfire for a coffee table
  living_room: {
    label: 'living room',
    build: async (r) => {
      await r.fill(1, 0, 0, 3, 0, 0, WALK)                       // the branch walkway
      await r.fill(4, 0, -1, 6, 0, 1, WALK)                      // the island
      await r.fill(6, 1, -1, 6, 1, 1, `nether_brick_stairs[facing=${r.out}]`)
      await r.fill(4, 1, -1, 5, 1, 1, 'red_carpet')
      await r.put(5, 1, 0, 'campfire[lit=true]')
      await r.put(4, 1, 1, 'potted_crimson_fungus')
    },
    focus: (r) => r.pt(5, 1.3, 0.5)
  },
  // a one-wide walkway out over the lava with the whole kitchen on it: a crafting table, three furnaces really
  // smelting, a smoker at the end
  kitchen: {
    label: 'kitchen',
    build: async (r) => {
      await r.fill(1, 0, 0, 7, 0, 0, WALK)
      await r.put(2, 1, 0, 'crafting_table')
      const fuel = '{Items:[{Slot:0b,id:"minecraft:porkchop",count:64},{Slot:1b,id:"minecraft:coal",count:64}]}'
      for (let x = 3; x <= 5; x++) await r.put(x, 1, 0, `furnace[facing=south,lit=true]${fuel}`)
      await r.put(6, 1, 0, `smoker[facing=south,lit=true]${fuel}`)
      await r.put(7, 1, 0, 'barrel[facing=up]')
    },
    focus: (r) => r.pt(4.5, 1.2, 0.5)
  },
  // a small island: a lava cauldron for a bath, a hopper, and a shower: lava pouring from the ceiling into the lake
  bathroom: {
    label: 'bathroom',
    shower: true,
    build: async (r) => {
      await r.fill(1, 0, 0, 3, 0, 0, WALK)
      await r.fill(4, 0, -1, 5, 0, 1, WALK)
      await r.put(4, 1, -1, 'lava_cauldron')
      await r.put(5, 1, -1, 'lava_cauldron')
      await r.put(5, 1, 1, 'hopper')
      await r.put(4, 1, 1, 'potted_crimson_roots')
    },
    // the shower: a lava source in the ceiling over the lake, just past the island (placed first: it takes ~15 s to
    // pour down to the lake)
    showerAt: (r) => r.xyz(6, H, 0),
    focus: (r) => r.pt(5, 1.6, 0.5)
  },
  // a crafting corner: an enchanting table, bookshelves and an anvil on a one-wide walkway
  study: {
    label: 'office',
    build: async (r) => {
      await r.fill(1, 0, 0, 6, 0, 0, WALK)
      await r.put(3, 1, 0, 'enchanting_table')
      await r.put(4, 1, 0, 'anvil[facing=east]')
      await r.fill(5, 1, 0, 6, 2, 0, 'bookshelf')
    },
    focus: (r) => r.pt(4, 1.4, 0.5)
  }
}

// --- the finale: the bedroom -------------------------------------------------------------------------------------
// The spine ends one block short of a pillar with the bed on it: the player walks and jumps the gap over the lava,
// lands on the bed and bounces (vanilla BedBlock: a falling entity bounces back up at 0.66 of its speed).
// bed_anchor: the same jump, then the bed's "night light", a charged respawn anchor in the wall at its head: 56e
// right-clicks it to set his spawn and it explodes (vanilla: a respawn anchor used outside the Nether blows up, power 5,
// with fire; the death message is "56e was killed by [Intentional Game Design]"). The bed goes with it.
const FINALES = {
  bed_jump: { label: 'bedroom' },
  bed_anchor: { label: 'bedroom', anchor: true }
}

// --- the build ----------------------------------------------------------------------------------------------------
function makeStunt (opts) {
  const kinds = opts.rooms
  for (const k of kinds) if (!ROOMS[k]) throw new Error(`psycho: no room kind ${k} (have ${Object.keys(ROOMS).join(', ')})`)
  const fin = FINALES[opts.finale || 'bed_jump']
  const n = kinds.length
  const roomZ = (i) => -6 - SPACING * i
  const zEnd = roomZ(n - 1) - 3        // the spine's last block
  const zGap = zEnd - 1, zBed = zEnd - 2, zHead = zEnd - 3, zN = zEnd - 3   // zN: the hall's last row inside
  const labels = [['open', 'front yard', 2.6], ['door', 'front door', 1.8], ['inside', 'hallway', 2.2]]
    .concat(kinds.map((k, i) => ['room', ROOMS[k].label, 3.0, i])).concat([['finale', fin.label, 3.0]])
  const subs = labels.map(([m, t, d, i]) => i === undefined ? [m, t, d] : [m, t, d, i])
  return {
    name: opts.name,
    biome: process.env.BIOME || opts.biome || 'minecraft:plains',
    caption: opts.caption,
    hideHand: true,                   // no hand: the tour looks, it doesn't hold anything
    lerpMobs: true,
    campfireSmoke: true,
    recordRadius: 64,
    expectDeath: !!fin.anchor,
    edit: { caption: opts.caption, red: opts.red, subs, subsY: 0.7, ...(opts.edit || {}) },

    async setup (ctx) {
      const { bot, Vec3 } = ctx
      const { plateau } = require('./plateau')
      const sp = bot.entity.position.floored()
      const g = ctx.findLand(sp.x, sp.z)
      if (!g) throw new Error('no dry land')
      const X = g.x, Z = g.z
      await ctx.defaultRules()
      await ctx.cmd('/difficulty peaceful')
      await ctx.cmd('/gamerule fire_spread_radius_around_player 0')
      await ctx.cmd('/gamerule random_tick_speed 0')
      await ctx.cmd('/gamerule mob_griefing false')
      await ctx.cmd('/time set 6000')
      await ctx.cmd('/weather clear')
      const F = await plateau(ctx, { x0: X - 16, x1: X + 16, z0: Z + zN - 6, z1: Z + 18, below: 6, biome: 'minecraft:plains', trees: 10 })
      Object.assign(this, { X, Z, F })
      await ctx.forceload({ x0: X - 20, z0: Z + zN - 10, x1: X + 20, z1: Z + 22 })
      const at = (x, y, z) => `${X + x} ${F + y} ${Z + z}`
      const c = (s) => ctx.cmd(s)
      const fill = (a, b, block) => c(`/fill ${at(...a)} ${at(...b)} ${block}`)
      const set = (a, block) => c(`/setblock ${at(...a)} ${block}`)

      // ---- the shell: one solid nether-brick box, the hall carved out of it, the lava lake on its floor
      const W = HALL + 1
      for (let y = -4; y <= H + 1; y += 2) await fill([-W, y, 0], [W, Math.min(H + 1, y + 1), zN - 1], 'nether_bricks')
      for (let y = -2; y <= H; y += 3) await fill([-HALL, y, -1], [HALL, Math.min(H, y + 2), zN], 'air')
      await fill([-HALL, -2, -1], [HALL, -2, zN], 'lava')
      // the mansion: red nether-brick columns down both walls and a chiseled band, soul lanterns from the ceiling
      for (let z = -2; z >= zN; z -= 4) for (const s of [-1, 1]) await fill([s * HALL, -1, z], [s * HALL, H, z], 'red_nether_bricks')
      for (const s of [-1, 1]) await fill([s * HALL, 5, -1], [s * HALL, 5, zN], 'chiseled_nether_bricks')
      await fill([-HALL, H, -1], [HALL, H, -1], 'red_nether_bricks')
      for (let z = -4; z >= zN + 1; z -= 6) {
        for (const x of [-3, 3]) { await set([x, H, z], 'iron_chain[axis=y]'); await set([x, H - 1, z], 'soul_lantern[hanging=true]') }
      }
      // the rooms (their showers first: lava takes ~30 ticks a block to pour down)
      const showers = []
      this.rooms = []
      for (let i = 0; i < n; i++) {
        const s = i % 2 === 0 ? -1 : 1, rz = roomZ(i)
        const r = this.roomCtx(ctx, s, rz)
        this.rooms.push(r)
        if (ROOMS[kinds[i]].shower) showers.push(ROOMS[kinds[i]].showerAt(r))
      }
      for (const p of showers) await c(`/setblock ${p} lava`)
      // the entry landing and the spine
      await fill([-1, 0, -1], [1, 0, -2], WALK)
      await fill([0, 0, -3], [0, 0, zEnd], WALK)
      for (let i = 0; i < n; i++) await ROOMS[kinds[i]].build(this.rooms[i])
      // the bedroom: a pillar with the bed, one block of lava past the end of the spine; the bed's head on the wall
      await fill([0, -2, zBed], [0, 0, zHead], WALK)
      await set([0, 1, zHead], 'red_bed[facing=north,part=head]')
      await set([0, 1, zBed], 'red_bed[facing=north,part=foot]')
      await fill([-1, H, zHead], [1, H, zHead], 'red_nether_bricks')
      for (const x of [-1, 1]) { await set([x, H - 1, zHead], 'iron_chain[axis=y]'); await set([x, H - 2, zHead], 'lantern[hanging=true]') }
      if (fin.anchor) {
        // the night light: a fully charged respawn anchor set in the wall at the bed's head; explosions hurt on normal
        // (peaceful has no hostile mobs to spawn either way: spawn_mobs is off), the blast drops nothing to float and
        // the inventory stays put on the death
        await set([0, 1, zHead - 1], 'respawn_anchor[charges=4]')
        await c('/difficulty normal')
        await c('/gamerule block_drops false')
        await c('/gamerule keep_inventory true')
      }
      // the barriers: invisible rails along everything the player walks, and round the gap and the bed
      await fill([-2, 1, -1], [-2, 2, -2], 'barrier'); await fill([2, 1, -1], [2, 2, -2], 'barrier')
      await fill([-1, 1, -3], [-1, 3, zHead], 'barrier'); await fill([1, 1, -3], [1, 3, zHead], 'barrier')
      // the striders: the family pets, out in the lake
      for (const [x, z] of [[-4, -9], [4, -14]]) await c(`/summon strider ${at(x, -1, z)} {PersistenceRequired:1b,Tags:["psycho"]}`)

      // ---- the outside: a plain cottage front over the hall's nether brick
      await fill([-W, 0, 0], [W, 0, 0], 'cobblestone')
      await fill([-W, 1, 0], [W, H + 1, 0], 'spruce_planks')
      for (const s of [-1, 1]) await fill([s * W, 1, 0], [s * W, H + 1, 0], 'oak_log')   // the corners (the side walls stay nether brick: they are the hall's walls)
      await fill([-W, H + 1, 0], [W, H + 1, 0], 'oak_log[axis=x]')
      // the roof: a spruce gable along the hall, its front filled with planks
      for (let i = 0; i <= W; i++) {
        const y = H + 2 + i
        if (i < W) {
          await fill([-W - 1 + i, y, 1], [-W - 1 + i, y, zN - 2], 'spruce_stairs[facing=east]')
          await fill([W + 1 - i, y, 1], [W + 1 - i, y, zN - 2], 'spruce_stairs[facing=west]')
          await fill([-W + i, y, 0], [W - i, y, zN - 1], 'spruce_planks')
        } else await fill([0, y, 1], [0, y, zN - 2], 'spruce_slab')
      }
      // windows (the glow of the lava shows through them) with trapdoor shutters
      for (const x of [-5, -4, 4, 5]) await fill([x, 2, 0], [x, 3, 0], 'glass_pane[east=true,west=true]')
      for (const x of [-6, 3]) await fill([x, 2, 1], [x, 3, 1], 'spruce_trapdoor[facing=south,open=true,half=bottom]')
      for (const x of [-3, 6]) await fill([x, 2, 1], [x, 3, 1], 'spruce_trapdoor[facing=south,open=true,half=bottom]')
      for (const x of [-5, -4, 4, 5]) await set([x, 1, 1], 'spruce_trapdoor[facing=north,half=top,open=false]')
      // the door, its oak frame, and the ring of fire round it (fire on the planks' face: flammable, so it stays)
      await fill([-1, 1, 0], [1, 3, 0], 'stripped_oak_log')
      await set([0, 1, 0], 'spruce_door[facing=south,half=lower,hinge=left,open=false]')
      await set([0, 2, 0], 'spruce_door[facing=south,half=upper,hinge=left,open=false]')
      await set([0, 0, 1], 'cobblestone_slab[type=top]')
      // the path, the burning wheat field on both sides
      await fill([0, 0, 2], [0, 0, 16], 'dirt_path')
      await fill([-1, 1, 2], [1, 4, 18], 'air')
      let seed = 11
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
      this.fires = []
      for (let y = 1; y <= 4; y++) for (const x of [-2, 2]) this.fires.push([x, y, 1])
      for (let x = -1; x <= 1; x++) this.fires.push([x, 4, 1])
      for (const s of [-1, 1]) {
        await fill([s * 2, 0, 2], [s * 10, 0, 14], 'farmland[moisture=7]')
        await fill([s * 2, 1, 2], [s * 10, 1, 14], 'wheat[age=7]')
        await fill([s * 2, 0, 15], [s * 10, 0, 15], 'water')
        for (let x = 2; x <= 10; x++) {
          for (let z = 2; z <= 14; z++) {
            // the field burns hardest round the door; elsewhere enough wheat shows that it reads as a wheat field
            const odds = z <= 5 && x <= 4 ? 0.6 : x === 2 ? 0.4 : 0.25
            if (rnd() < odds) {
              // netherrack under it first (infiniburn: the fire never burns out; fire placed over farmland is removed
              // at once, BaseFireBlock.onPlace); the popped crop is killed with the other items below
              bot.chat(`/setblock ${at(s * x, 0, z)} netherrack`)
              bot.chat(`/setblock ${at(s * x, 1, z)} fire`)
              this.fires.push([s * x, 1, z])
            }
          }
          await bot.waitForTicks(2)
        }
      }
      await c('/kill @e[type=item]')
      await ctx.hotbar(opts.hotbar || [['wheat_seeds', 12], 'bread', ['torch', 16], 'oak_sapling'])
      ctx.select(8)
      // wait for the showers to reach the lake
      await bot.waitForTicks(showers.length ? 340 : 20)
      // the ring of fire on the planks' face round the door, last: it is flammable so it stays, and placed now it is
      // far from burning out (a fire not on netherrack goes out after ~80 s)
      for (let y = 1; y <= 4; y++) for (const x of [-2, 2]) await set([x, y, 1], 'fire[north=true]')
      for (let x = -1; x <= 1; x++) await set([x, 4, 1], 'fire[north=true]')
      const start = new Vec3(X + 0.5, F + 1, Z + 12.5)
      const look = this.lookFrom(start, this.doorFocus())
      await ctx.tpCheck(start.x, start.y, start.z, 180 - look.yaw / DEG, -look.pitch / DEG)
      await c('/gamemode survival')
      await bot.waitForTicks(20)
      return { x: X, y: F, z: Z - 6 }
    },

    doorFocus () { return new (require('vec3').Vec3)(this.X + 0.5, this.F + 2.6, this.Z + 0.5) },
    lookFrom (from, to) {
      const d = to.minus(from.offset(0, 1.62, 0))
      return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
    },

    // a room's coordinate helpers: x mirrored to its side (x > 0 away from the spine), y above the walkway level,
    // z from the room's centre line
    roomCtx (ctx, s, rz) {
      const { X, Z, F } = this
      const bx = (x) => X + s * x
      const r = {
        s, rz,
        out: s > 0 ? 'east' : 'west',
        xyz: (x, y, z) => `${bx(x)} ${F + y} ${Z + rz + z}`,
        put: (x, y, z, b) => ctx.cmd(`/setblock ${r.xyz(x, y, z)} ${b}`),
        fill: (x0, y0, z0, x1, y1, z1, b) => ctx.cmd(`/fill ${r.xyz(x0, y0, z0)} ${r.xyz(x1, y1, z1)} ${b}`),
        // a point: x is a block's distance out (its centre at x + 0.5 away from the spine's centre line)
        pt: (x, y, z) => new ctx.Vec3(X + 0.5 + s * x, F + y, Z + rz + z)
      }
      return r
    },

    async perform (ctx) {
      const { bot, Vec3 } = ctx
      const { X, Z, F } = this
      const A = makeAct(ctx)
      const stopSounds = relaySounds(ctx)
      // the client's own ambience: fire crackle (FireBlock.animateTick) and lava pops (LiquidBlock), by distance
      const lava = []
      for (let x = -HALL; x <= HALL; x += 2) for (let z = -1; z >= zN; z -= 2) lava.push([x, -1, z])
      const amb = () => {
        const eye = bot.entity.position.offset(0, 1.62, 0)
        const near = (p, r) => { const d = eye.distanceTo(new Vec3(X + p[0] + 0.5, F + p[1] + 0.5, Z + p[2] + 0.5)); return d < r ? 1 - d / r : 0 }
        const play = (name, v, pitch) => { if (v >= 0.05) ctx.sound(name, +v.toFixed(3), +pitch.toFixed(3)) }   // fainter is inaudible under the mix
        for (const p of this.fires) {
          const v = near(p, 16)
          if (v > 0 && Math.random() < 1 / 160) play('block.fire.ambient', v * (0.6 + Math.random() * 0.6), 0.7 + Math.random() * 0.3)
        }
        if (bot.entity.position.z < Z) {
          for (const p of lava) {
            const v = near(p, 16)
            if (v <= 0) continue
            if (Math.random() < 1 / 900) play('block.lava.pop', v * (0.3 + Math.random() * 0.3), 0.9 + Math.random() * 0.15)
            if (Math.random() < 1 / 1800) play('block.lava.ambient', v * (0.3 + Math.random() * 0.3), 0.9 + Math.random() * 0.15)
          }
        }
      }
      bot.on('physicsTick', amb)
      const rig = camera(ctx)
      const P = (x, y, z) => new Vec3(X + x, F + y, Z + z)
      const walkTo = async (p, max = 120) => { rig.steer = p; await rig.until(() => Math.hypot(bot.entity.position.x - p.x, bot.entity.position.z - p.z) < 0.35, max); rig.steer = null }
      rig.focus = this.doorFocus()
      await bot.waitForTicks(2)
      ctx.mark('open')
      // ---- the yard: walk up the path to the burning door
      await walkTo(P(0.5, 1, 4.6), 80)
      ctx.mark('door')
      await walkTo(P(0.45, 1, 1.75), 60)
      // open the door (lib/act.js aims at it first)
      rig.hold = true
      await A.use(P(0, 1, 0), { sound: 'block.wooden_door.open' })
      ctx.mark('door_open')
      rig.hold = false
      // ---- in: the hallway, looking down the spine at the lava
      rig.focus = P(0.5, -0.5, -9)
      await walkTo(P(0.45, 1, -1.2), 40)   // x 0.45: past the open door's panel (x 13/16..1)
      ctx.mark('inside')
      // ---- the rooms: stop a step short of each branch, look out at the room, hold, look back up the spine
      for (let i = 0; i < n; i++) {
        const r = this.rooms[i], K = ROOMS[kinds[i]]
        rig.focus = P(0.5, 0.4, roomZ(i) - 6)
        await walkTo(P(0.5, 1, roomZ(i) + 2.5), 100)
        // the look settles on the room and then drifts slowly along it (a held still view reads as a pause)
        const f0 = K.focus(r), hold = K.hold ?? 30
        rig.focus = f0.offset(0, 0, 0.9)
        ctx.mark('room', { n: i, kind: kinds[i] })
        for (let k = 0; k < hold; k++) { rig.focus = f0.offset(0, 0, 0.9 - 1.8 * k / hold); await bot.waitForTicks(1) }
      }
      // ---- the bedroom: up the spine, a walking jump across the lava onto the bed
      // (the look stays on the bed's head against the wall: a point the player never gets near, so the yaw holds)
      rig.focus = P(0.5, 0.3, zHead - 0.5)
      ctx.mark('finale')
      await walkTo(P(0.5, 1, zEnd + 2.5), 100)
      await bot.waitForTicks(6)
      // a walking jump: it clears the one-block gap and lands mid-bed, short of the wall
      rig.free = true
      bot.setControlState('forward', true)
      await rig.until(() => bot.entity.position.z < Z + zEnd + 0.45, 30)
      bot.setControlState('jump', true)
      ctx.mark('jump')
      await bot.waitForTicks(2)
      bot.setControlState('jump', false)
      // the landing on the bed, and its bounce
      let lastVy = 0, landed = false
      for (let k = 0; k < 30 && !landed; k++) {
        const e = bot.entity
        if (e.onGround && e.position.z < Z + zBed + 1.2 && k > 2) {
          landed = true
          bot.setControlState('forward', false)
          ctx.mark('land')
          ctx.sound('block.wood.fall', 0.8, 0.9)
          if (lastVy < -0.1) { e.velocity.y = -lastVy * 0.66; e.onGround = false }
          break
        }
        lastVy = e.velocity.y
        await bot.waitForTicks(1)
      }
      if (!landed) { ctx.log('psycho: no landing on the bed'); bot.setControlState('forward', false) }
      rig.free = false
      let ok = landed
      if (fin.anchor && landed) {
        // the bounce settles, then a right-click on the night light (lib/act.js aims at it): boom
        await bot.waitForTicks(fin.wait ?? 8)
        rig.hold = true
        ctx.mark('anchor')
        await A.use(P(0, 1, zHead - 1), { max: 20 })
        for (let k = 0; k < 20 && !ctx.died; k++) await bot.waitForTicks(1)
        ctx.mark('boom')
        ok = !!ctx.died
        if (!ok) ctx.log('psycho: the anchor did not kill', bot.health)
        await bot.waitForTicks(40)        // the death screen
      } else await bot.waitForTicks(30)
      rig.stop()
      bot.removeListener('physicsTick', amb)
      stopSounds()
      return ok
    }
  }
}

module.exports = { makeStunt, ROOMS, FINALES }
