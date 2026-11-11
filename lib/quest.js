// The "quest" format (family `quest`; docs/formats.md, STANDARDS r:r4b458d): the whole Short is the way down to ONE
// secret chest, opened only at the very end. Owner: "fake secret chest in desert pyramid that takes like the entire
// video to get to and theres like parkour and tunnels etc." Every stage is a different trick (a hidden button, a
// tunnel, parkour over lava, an arrow trap...) and each one is harder than the last; the camera stays followable
// through the parkour because the whole course runs straight north: the yaw stays at 0, only the pitch moves.
//
// A new episode is a list of stages (and its own loot, theme and captions):
//   makeQuest({ name, caption, red, stages: [...], loot: [[slot, item, count], ...], subs })
// Stage kinds (each builds its own cells onto the course and plays itself):
//   { kind: 'tunnel', plug, drop }         a torch-lit 1x2 tunnel; plug: a dead end of `plug` blocks he mines through
//                                          (z offset from the stage start); drop: steps down at its end (0-3)
//   { kind: 'parkour', jumps: [g | { gap, up }], lava }   1x1 pillars over a lava pit: each jump a gap of g blocks
//                                          (2 = an easy sprint jump, 3 = a real one), up: the pillar 1 higher
//   { kind: 'arrows', n }                  a 3-wide corridor with n dispensers in its west wall: volleys across it
//                                          while he waits, then he sprints through between them (real dispensers)
//   { kind: 'vault' }                      the end wall: a creeper face with the hidden button in its eye, a piston
//                                          door, and the gold room with the ONE chest on a pedestal (the payoff)
// The start is always the same: the pyramid's hall, the blue terracotta dug, the drop into the vanilla-style treasure
// room (its four chests: "everyone loots these"), and the hidden button beside the north wall that opens the way.
//
// Local frame: x east, z south, the pyramid's floor block y 0 (feet y 1), its centre (0, 0). The course axis is x 2
// (block centre 2.5); it runs north (-z) from the treasure room's north wall (z -3). mineflayer yaw 0 looks north.
// Marks: go, dug, drop, land, room, press, open, stage (one per stage start, nth = the stage), jump / hop_land, volley,
// run, mine, face, press2, door2, vault, payoff.
const sets = require('./sets')
const PIECES = require('./sets/pieces')
const { Voxels } = require('./sets/voxel')
const { storyKit } = require('./story')
const { relaySounds } = require('./chain')

const AX = 2                        // the course's x (block); its centre line is AX + 0.5
const ROOM_F = -8                   // the treasure room's floor (feet -7): the drop from the hall is 8 blocks
const WALL = (b) => b.mix({ sandstone: 6, cut_sandstone: 2, smooth_sandstone: 1 })
const ENVELOPE = 'sandstone'

// ---- the pyramid: stepped sandstone over the hall, the treasure room below, the shaft between
function pyramid (b) {
  // foundation and the body, layers y 1..11 (half-size 11 - y), the floor at y 0
  b.fill(-10, -14, -10, 10, -1, 10, ENVELOPE)
  b.fill(-10, 0, -10, 10, 0, 10, 'sandstone')
  for (let y = 1; y <= 11; y++) { const h = 11 - y; b.fill(-h, y, -h, h, y, h, y % 3 === 0 ? 'cut_sandstone' : 'sandstone') }
  for (let y = 1; y <= 10; y++) { const h = 11 - y; for (const z of [-h, h]) b.fill(-h, y, z, h, y, z, y % 3 === 0 ? 'cut_sandstone' : 'smooth_sandstone') }
  // the hall: x, z -5..5, y 1..4; orange stripes on the walls, pillars at the corners
  b.fill(-5, 1, -5, 5, 4, 5, 'air')
  b.fill(-6, 1, -6, 6, 1, 6, 'cut_sandstone', 'walls')
  b.fill(-6, 3, -6, 6, 3, 6, 'orange_terracotta', 'walls')
  b.fill(-6, 4, -6, 6, 4, 6, 'chiseled_sandstone', 'walls')
  for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) b.fill(x, 1, z, x, 4, z, 'cut_sandstone')
  b.fill(-5, 5, -5, 5, 5, 5, 'smooth_sandstone')
  // the doorway south (daylight in): x -1..1, z 6..10
  b.fill(-1, 1, 6, 1, 3, 10, 'air')
  b.fill(-1, 1, 6, 1, 1, 6, 'air')
  // the floor: sandstone, the vanilla diamond of orange terracotta round the blue one in the middle
  b.fill(-5, 0, -5, 5, 0, 5, 'sandstone')
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    const d = Math.abs(x) + Math.abs(z)
    if (d === 1 || d === 2) b.set(x, 0, z, 'orange_terracotta')
  }
  b.set(0, 0, 0, 'blue_terracotta')
  for (const [x, z] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) b.set(x, 0, z, 'orange_terracotta')
  // torches on the hall's pillars (lit for the opening shot)
  for (const [x, z, f] of [[-4, -3, 'south'], [4, -3, 'south'], [-4, 3, 'north'], [4, 3, 'north']]) b.set(x, 2, z, `wall_torch[facing=${f}]`)
  // the treasure room: x, z -2..2, y -7..-4, ceiling -3, floor -8; four chests in alcoves (vanilla's four)
  const F = ROOM_F
  b.fill(-3, F, -3, 3, F + 5, 3, 'cut_sandstone')
  b.fill(-2, F + 1, -2, 2, F + 4, 2, 'air')
  b.fill(-2, F, -2, 2, F, 2, 'sandstone')
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if ((Math.abs(x) + Math.abs(z)) === 2) b.set(x, F, z, 'orange_terracotta')
  b.set(0, F, 0, 'blue_terracotta')
  b.fill(-3, F + 3, -3, 3, F + 3, 3, 'chiseled_sandstone', 'walls')
  for (const [x, z, f] of [[0, 3, 'north'], [-3, 0, 'east'], [3, 0, 'west'], [0, -3, 'south']]) b.set(x, F + 1, z, `chest[facing=${f}]`)
  // torches either side of the south chest, and on the west wall
  b.set(-1, F + 3, 2, 'wall_torch[facing=north]'); b.set(1, F + 3, 2, 'wall_torch[facing=north]')
  b.set(-2, F + 3, -1, 'wall_torch[facing=east]')
  // a two-row band along the north wall (z -2, rows F+3..F+4): the hidden door's top piston head sits behind it
  b.fill(-2, F + 3, -2, 2, F + 3, -2, 'chiseled_sandstone'); b.fill(-2, F + 4, -2, 2, F + 4, -2, 'cut_sandstone')
  // the door's column (x 2, z -3) from F-2 to F+5 is left empty: the pistons and their power go in live
  b.fill(AX, F - 2, -3, AX, F + 5, -3, 'air')
  // the hidden button: a birch button (sandstone's colour) low on the north wall, left of the hidden door at x 2
  b.set(1, F + 2, -2, 'birch_button[face=wall,facing=south]')
  // the shaft under the blue terracotta, down through the room's ceiling
  b.fill(0, F + 5, 0, 0, -1, 0, 'air')
}

// the piston door: a 1x2 opening at (x, f+1..f+2, z) closed by two blocks held in it by extended sticky pistons
// (one under, one over) that a redstone block powers. Opening = the redstone blocks swapped out (cmds, live).
// Placed live after the template (an extended piston in a template retracts before its power arrives).
// topPower: where the top piston's redstone block goes (default right over it; the vault's is behind it, north, in
// a 2-thick wall, so nothing red shows in the face)
function pistonDoor (x, f, z, door, { topPower = [x, f + 5, z] } = {}) {
  const at = (y) => `${x} ${y} ${z}`
  return {
    x, f, z,
    build: [
      ['setblock', [x, f - 2, z], 'redstone_block'], ['setblock', [x, f - 1, z], 'sticky_piston[facing=up]'],
      ['setblock', topPower, 'redstone_block'], ['setblock', [x, f + 4, z], 'sticky_piston[facing=down]'],
      ['wait', 6],
      ['setblock', [x, f + 1, z], door], ['setblock', [x, f + 2, z], door]
    ],
    open: [['setblock', [x, f - 2, z], ENVELOPE], ['setblock', topPower, ENVELOPE]],
    at
  }
}

// ---- the stages. Each gets the voxels and the cursor { z: the first z of the stage (north of the last), f: the floor
// y under the feet } and returns { end: cursor, play(Q), setup?(Q), doors? }. The whole course sits in a solid
// envelope (buildCourse), so a stage only carves its spaces and dresses them; it never writes south of its z.
const STAGES = {
  tunnel (b, cur, st) {
    const z0 = cur.z, len = st.len || 9, f = cur.f
    b.fill(AX, f + 1, z0 - len + 1, AX, f + 2, z0, 'air')
    b.fill(AX, f, z0 - len + 1, AX, f, z0, b.mix({ sandstone: 3, smooth_sandstone: 1 }))
    // torches in niches in the west wall, every 4 blocks
    for (let z = z0 - 1; z > z0 - len + 1; z -= 4) b.set(AX - 1, f + 2, z, 'wall_torch[facing=east]')
    // the dead end he mines through
    const pz = z0 - (st.plug ?? 4)
    if (st.plug !== undefined) { b.set(AX, f + 1, pz, 'sandstone'); b.set(AX, f + 2, pz, 'sandstone') }
    // steps down at the end
    let ff = f, z = z0 - len + 1
    for (let i = 0; i < (st.drop || 0); i++) {
      z--; ff--
      b.fill(AX, ff + 1, z, AX, f + 2, z, 'air')   // headroom to the tunnel's own ceiling (he is still falling into the next step)
      b.set(AX, ff, z, 'sandstone')
    }
    const end = { z: z - 1, f: ff }
    return {
      end,
      async play (Q) {
        const { K, at, bot, ctx } = Q
        if (st.plug !== undefined) {
          await Q.dash(pz + 1.7, { sprint: true, pitch: -0.1 })
          ctx.mark('mine')
          await Q.dig(at(AX, f + 2, pz))
          await Q.dig(at(AX, f + 1, pz))
          ctx.mark('dug_through')
        }
        K.base.pitch = -0.15
        await Q.dash(end.z + 1.5, { sprint: true, pitch: -0.2, settle: 0, stop: 0, keep: true })
      }
    }
  },

  parkour (b, cur, st) {
    const f = cur.f, z0 = cur.z
    const jumps = st.jumps.map(j => typeof j === 'number' ? { gap: j, up: 0 } : { up: 0, ...j })
    // the near ledge (2 deep: z0, z0-1), each pillar gap + 1 further on, then the far ledge (3 deep)
    const pillars = []
    let z = z0 - 1, top = f
    for (const j of jumps) { z -= j.gap + 1; top += j.up; pillars.push({ z, top }) }
    const farZ = z - (st.lastGap ?? 2) - 1, farTop = top, zEnd = farZ - 2
    const lava = Math.min(f, farTop) - 3, ceil = Math.max(f, farTop) + 5
    b.fill(AX - 3, lava + 1, zEnd, AX + 3, ceil, z0, 'air')
    b.fill(AX - 3, lava, zEnd + 3, AX + 3, lava, z0 - 2, 'lava')
    b.fill(AX - 3, lava - 1, zEnd + 3, AX + 3, lava - 1, z0 - 2, 'magma_block')
    b.fill(AX - 3, lava, z0 - 1, AX + 3, f, z0, 'sandstone'); b.fill(AX - 3, f, z0 - 1, AX + 3, f, z0, 'cut_sandstone')
    b.fill(AX - 3, lava, zEnd, AX + 3, farTop, farZ, 'sandstone'); b.fill(AX - 3, farTop, zEnd, AX + 3, farTop, farZ, 'cut_sandstone')
    for (const p of pillars) { b.fill(AX, lava - 1, p.z, AX, p.top, p.z, 'sandstone'); b.set(AX, p.top, p.z, 'chiseled_sandstone') }
    // lit: the lava below, glowstone set into the ceiling, lanterns on the ledges
    for (let zz = z0 - 1; zz >= zEnd; zz -= 3) { b.set(AX - 2, ceil + 1, zz, 'glowstone'); b.set(AX + 2, ceil + 1, zz, 'glowstone') }
    b.set(AX - 3, f + 1, z0 - 1, 'lantern'); b.set(AX + 3, f + 1, z0 - 1, 'lantern')
    b.set(AX - 3, farTop + 1, zEnd, 'lantern'); b.set(AX + 3, farTop + 1, zEnd, 'lantern')
    const end = { z: zEnd - 1, f: farTop }
    return {
      end,
      pit: { x0: AX - 3, x1: AX + 3, lava, top: ceil, z0: zEnd + 3, z1: z0 - 2 },
      async play (Q) {
        const { ctx } = Q
        Q.K.base.pitch = -0.3
        await Q.dash(z0 + 0.4, { sprint: true, pitch: -0.35, settle: 0, stop: 0, keep: true })
        const targets = [...pillars.map(p => ({ z: p.z + 0.5, f: p.top })), { z: farZ + 0.5, f: farTop, last: true }]
        await Q.hops(targets)
        ctx.mark('made_it')
        await Q.dash(zEnd + 0.5, { sprint: true, pitch: -0.1, settle: 0 })
      }
    }
  },

  arrows (b, cur, st) {
    const f = cur.f, z0 = cur.z, n = st.n || 3, step = st.step || 3, wait = st.wait ?? 3
    const first = z0 - wait - 1, last = first - (n - 1) * step, zEnd = last - 3
    b.fill(AX - 1, f + 1, zEnd, AX + 1, f + 3, z0, 'air')
    b.fill(AX - 1, f, zEnd, AX + 1, f, z0, b.mix({ cut_sandstone: 3, sandstone: 1 }))
    b.fill(AX + 2, f + 1, zEnd, AX + 2, f + 3, z0, b.mix({ cut_sandstone: 2, chiseled_sandstone: 1 }))
    const disp = []
    for (let i = 0; i < n; i++) {
      const z = first - i * step
      b.set(AX - 2, f + 2, z, 'dispenser[facing=east]')
      b.set(AX - 2, f + 3, z, 'chiseled_sandstone'); b.set(AX - 2, f + 1, z, 'chiseled_sandstone')
      b.fill(AX - 1, f, z, AX + 1, f, z, 'smooth_sandstone')     // a line across the floor under each one
      disp.push(z)
    }
    for (let zz = z0 - 1; zz >= zEnd; zz -= 3) b.set(AX + 2, f + 3, zz, 'glowstone')
    const end = { z: zEnd - 1, f }
    return {
      end,
      async setup (Q) { for (const z of disp) await Q.cmd(`/item replace block ${Q.A(AX - 2, f + 2, z)} container.4 with arrow 64`) },
      async play (Q) {
        const { ctx, K, bot } = Q
        const fire = (zs) => { for (const z of zs) K.say(`/setblock ${Q.A(AX - 3, f + 2, z)} redstone_block`); ctx.mark('volley') }
        const reset = (zs) => { for (const z of zs) K.say(`/setblock ${Q.A(AX - 3, f + 2, z)} sandstone`) }
        // walk up to the line, eyes down the corridor: a volley in front of him, he stops; another; then he runs
        K.base.pitch = -0.05
        let k0 = 0
        await Q.dash(z0 - 0.5, { pitch: -0.05, during: async () => { k0++; if (k0 === 4) fire(disp); if (k0 === 7) reset(disp) } })
        await Q.hold(12)
        fire(disp); await Q.hold(3); reset(disp)
        await Q.hold(12)
        ctx.mark('run')
        // the run: each dispenser fires once he is past it (the arrows behind him, the sound at his back)
        const fired = new Map()
        await Q.dash(zEnd + 0.4, {
          sprint: true,
          keep: true,
          stop: 0,
          settle: 0,
          pitch: -0.05,
          during: async () => {
            const pz = bot.entity.position.z - Q.O.z
            for (const z of disp) if (!fired.has(z) && pz < z - 0.7) { fired.set(z, ctx.tick); fire([z]) }
            for (const [z, t] of fired) if (t !== null && ctx.tick - t >= 3) { reset([z]); fired.set(z, null) }
          }
        })
        for (const [z, t] of fired) if (t !== null) reset([z])
        ctx.mark('safe')
      }
    }
  },

  vault (b, cur, st) {
    const f = cur.f, z0 = cur.z
    const wz = z0 - (st.approach || 6)              // the end wall
    // the antechamber: 7 wide, 7 high. On the end wall a 5x6 creeper face (the pyramid's own motif) in orange and blue
    // terracotta; its mouth is the door (x AX, rows f+1..f+2), its left eye carries the button. The mouth's top
    // row and the nose (f+3, f+4) stand out a block (z wz+1): they hide the door's top piston (head and base); its power
    // is behind it in the 2-thick wall
    b.fill(AX - 3, f + 1, wz + 1, AX + 3, f + 7, z0, 'air')
    b.fill(AX - 3, f, wz + 1, AX + 3, f, z0, 'cut_sandstone')
    b.fill(AX - 3, f + 1, wz, AX + 3, f + 7, wz, 'cut_sandstone')
    for (const x of [AX - 3, AX + 3]) b.set(x, f + 1, wz + 1, 'lantern')
    const FACE = ['OBOBO', 'OBOBO', 'OOBOO', 'OBBBO', 'OBDBO', 'OBDBO']   // rows f+6 .. f+1
    FACE.forEach((row, r) => {
      const y = f + 6 - r
      for (let i = 0; i < 5; i++) {
        const x = AX - 2 + i, c = row[i]
        const blk = c === 'O' ? 'orange_terracotta' : 'blue_terracotta'
        const relief = y === f + 3 || y === f + 4
        b.set(x, y, relief ? wz + 1 : wz, blk)
        if (relief) b.set(x, y, wz, 'orange_terracotta')
      }
    })
    b.fill(AX, f - 2, wz, AX, f + 4, wz, 'air')   // the door's column: pistons and power go in live
    b.fill(AX - 3, f, wz - 1, AX + 3, f + 7, wz - 1, 'sandstone')   // the wall's second layer
    b.fill(AX, f + 1, wz - 1, AX, f + 2, wz - 1, 'air')            // the passage through it
    b.set(AX, f + 4, wz - 1, 'air')                                 // the top piston's power (live)
    // the button on the left eye's top block: the lower one touches the block over the top piston, and a pressed
    // button there kept that piston powered (quasi-connectivity), so it never pulled its half of the door up
    const eye = { x: AX - 1, y: f + 6, z: wz + 1 }
    b.set(eye.x, eye.y, eye.z, `${st.button || 'birch'}_button[face=wall,facing=south]`)
    // the vault behind: gold floor, gold pillars, the ONE chest on a gold pedestal in the middle
    const vz0 = wz - 2, vz1 = wz - 8
    b.fill(AX - 3, f + 1, vz1, AX + 3, f + 5, vz0, 'air')
    b.fill(AX - 3, f, vz1, AX + 3, f, vz0, b.mix({ gold_block: 3, cut_sandstone: 2 }))
    b.fill(AX - 3, f + 6, vz1, AX + 3, f + 6, vz0, 'smooth_sandstone')
    for (const [x, z] of [[AX - 3, vz0], [AX + 3, vz0], [AX - 3, vz1], [AX + 3, vz1]]) b.fill(x, f + 1, z, x, f + 5, z, 'gold_block')
    for (const x of [AX - 2, AX + 2]) for (const z of [vz0 - 1, vz1 + 1]) b.set(x, f + 6, z, 'glowstone')
    b.set(AX - 2, f + 1, vz1, 'lantern'); b.set(AX + 2, f + 1, vz1, 'lantern')
    const cz = vz1 + 2
    b.set(AX, f + 1, cz, 'gold_block')
    b.set(AX, f + 2, cz, 'chest[facing=south]')
    b.set(AX, f + 6, cz, 'sea_lantern')
    const door = pistonDoor(AX, f, wz, 'blue_terracotta', { topPower: [AX, f + 4, wz - 1] })
    return {
      end: { z: vz1 - 1, f },
      doors: [door],
      async setup (Q) {
        for (const [slot, item, count] of Q.ep.loot) await Q.cmd(`/item replace block ${Q.A(AX, f + 2, cz)} container.${slot} with ${item} ${count}`)
      },
      async play (Q) {
        const { ctx, K, bot } = Q
        K.base.pitch = 0
        await Q.dash(wz + 5.6, { pitch: 0.3 })
        ctx.mark('face')
        // the whole face (just a wall?), then its eye
        await Q.look(AX + 0.5, f + 3.6, wz + 1, { max: 14 })
        await Q.hold(6)
        const sway = K.sway
        K.sway = 0.3
        await K.use(Q.at(eye.x, eye.y, eye.z), { sound: 'block.wooden_button.click_on', volume: 0.8, max: 60 })
        K.sway = sway
        ctx.mark('press2')
        await Q.hold(3)
        await Q.openDoor(door)
        ctx.mark('door2')
        await Q.look(AX + 0.5, f + 1.8, wz - 2, { max: 12 })
        await Q.dash(cz + 1.8, { pitch: -0.25 })
        ctx.mark('vault')
        {
          const p = bot.entity.position, col = []
          for (let y = f - 2; y <= f + 4; y++) for (const zz of [wz, wz - 1]) { const q = bot.blockAt(Q.at(AX, y, zz)); col.push(`${y},${zz}:${q ? q.name : '?'}`) }
          ctx.log(`vault: at ${(p.x - Q.O.x).toFixed(2)} ${(p.y - Q.O.y).toFixed(2)} ${(p.z - Q.O.z).toFixed(2)}; chest z ${cz}; door ${col.join(' ')}`)
        }
        const w = await K.open(Q.at(AX, f + 2, cz))
        ctx.mark('payoff')
        ctx.sound('block.chest.open', 0.9, 1, { key: true })
        await bot.waitForTicks(40)
        return !!w
      }
    }
  }
}

// the whole set as one piece: the pyramid, the envelope, then the stages in order north of the treasure room
function buildCourse (ep) {
  // a dry run finds where the course ends (the envelope must be down before the stages carve it)
  let cur = { z: -4, f: ROOM_F }, minF = ROOM_F
  { const d = new Voxels('dry').seed(1); for (const st of ep.stages) { cur = STAGES[st.kind](d, cur, st).end; minF = Math.min(minF, cur.f) } }
  const zMin = cur.z - 2
  const b = new Voxels(`quest_${ep.name}`).seed(ep.seed || 11)
  // (its top 3+ blocks over every ceiling: parkour 2's ceiling at -4 met natural ground, an aquifer flooded the
  // ledge and turned the lava to stone)
  b.fill(AX - 9, minF - 9, zMin, AX + 9, -1, -4, WALL(b))
  pyramid(b)
  const plan = []
  cur = { z: -4, f: ROOM_F }
  const door1 = pistonDoor(AX, ROOM_F, -3, 'cut_sandstone')
  for (const st of ep.stages) {
    const s = STAGES[st.kind](b, cur, st)
    plan.push({ st, ...s, start: cur })
    cur = s.end
  }
  return { b, plan, doors: [door1, ...plan.flatMap(p => p.doors || [])], door1 }
}
function register (name, buildFn) {
  PIECES[name] = { name, about: `quest episode ${name}`, variants: {}, build: () => buildFn() }
  return name
}

// the edit every episode shares: the title up top, a sub per stage, the chest's screen at GUI 4, the payoff hit
function questEdit (ep) {
  return {
    caption: ep.caption,
    red: ep.red,
    startAt: 'go:-0.05',
    endAfter: 'payoff:0.9',
    dropAt: 'payoff',
    guiScale: 4,
    subs: ep.subs,
    sfx: [['pop', 'go', { gain: 0.45 }], ['whoosh', 'drop', { gain: 0.35 }], ['dip', 'payoff', 0.4]],
    ...(ep.edit || {})
  }
}

// ep: { name, caption, red, biome, stages, loot, subs, edit, roomLoot }
function makeQuest (ep) {
  return {
    name: ep.name,
    biome: process.env.BIOME || ep.biome || 'minecraft:desert',
    caption: ep.caption,
    time: ep.time ?? 6000,
    hideHand: false,
    edit: questEdit(ep),

    async setup (ctx) {
      const { bot } = ctx
      await ctx.defaultRules()
      await ctx.cmd('/gamerule random_tick_speed 0')
      await ctx.cmd('/difficulty peaceful')
      await ctx.cmd('/gamerule keep_inventory true')
      await ctx.cmd('/gamerule block_drops false', { mayFail: true })
      await ctx.cmd('/kill @e[type=!player]')
      const { b, plan, doors, door1 } = buildCourse(ep)
      const id = register(`quest_${ep.name}`, () => b)
      const vox = sets.build(id)
      const { lo, hi } = vox.bounds()
      // the pyramid's centre on the ground where we stand
      // the site: where the bot stands, or where an earlier attempt of this episode built (a retry respawns where the
      // last one ended, inside that course: a second pyramid on top of the first was a mess)
      const me = bot.entity.position
      const siteFile = require('path').join(__dirname, '..', 'work', 'hb', `quest_site_${ep.name}.json`)
      let X = Math.floor(me.x), Z = Math.floor(me.z)
      try { const s0 = JSON.parse(require('fs').readFileSync(siteFile, 'utf8')); if (Math.hypot(s0.x - X, s0.z - Z) < 200) { X = s0.x; Z = s0.z } } catch (e) {}
      try { require('fs').mkdirSync(require('path').dirname(siteFile), { recursive: true }); require('fs').writeFileSync(siteFile, JSON.stringify({ x: X, z: Z })) } catch (e) {}
      await sets.forceload(ctx, X + lo[0] - 8, Z + lo[2] - 8, X + hi[0] + 8, Z + hi[2] + 8)
      await bot.waitForTicks(20)
      // the ground: the lowest of four probes outside the pyramid's footprint (a retry stands on the last attempt's
      // pyramid, whose top is 11 blocks up)
      const ys = []
      for (const [dx, dz] of [[14, 14], [-14, 14], [14, -14], [-14, -14], [0, 16], [16, 0], [-16, 0]]) {
        for (let y = 120; y > 40; y--) { const q = bot.blockAt(new ctx.Vec3(X + dx, y, Z + dz)); if (q && /sand|sandstone|terracotta|dirt|grass|stone/.test(q.name)) { ys.push(y); break } }
      }
      ys.sort((a, b) => a - b)
      const Y = ys.length ? ys[Math.floor(ys.length / 2)] : 63
      this.O = { x: X, y: Y, z: Z }
      ctx.log(`quest: pyramid floor at ${X} ${Y} ${Z} (ground probes ${ys.join(' ')}); course ${lo.join(',')} .. ${hi.join(',')}`)
      // the dunes in the hall's way: clear the air over the pyramid's footprint first (sand would fall in)
      for (let y = Y + 1; y <= Y + 16; y += 4) await ctx.cmd(`/fill ${X - 12} ${y} ${Z - 12} ${X + 12} ${Math.min(Y + 16, y + 3)} ${Z + 12} air`)
      const tid = sets.install(id, vox)
      await ctx.cmd(`/place template ${tid} ${X + lo[0]} ${Y + lo[1]} ${Z + lo[2]}`)
      // water in the course (an aquifer flooded parkour 4's lava, round 1 review): find it, clear it, place again
      const wet = async () => {
        await bot.waitForTicks(40)
        return bot.findBlocks({ matching: b => b && /water|obsidian/.test(b.name), maxDistance: 160, count: 400 })
          .filter(p => Math.abs(p.x - X - AX) <= 6 && p.y >= Y + lo[1] && p.y <= Y - 1 && p.z >= Z + lo[2] && p.z <= Z - 4)   // inside the envelope (a pond on the surface is not the course)
      }
      for (let pass = 0; pass < 3; pass++) {
        const w = await wet()
        if (!w.length) break
        ctx.log(`quest: ${w.length} water/obsidian cells in the course (pass ${pass}), e.g. ${w.slice(0, 6).map(p => `${p.x - X},${p.y - Y},${p.z - Z}`).join(' ')}`)
        for (let y = Y + lo[1]; y <= Y + hi[1]; y += 4) {
          for (let z = Z + lo[2]; z <= Z + hi[2]; z += 32) {
            const a = `${X + lo[0]} ${y} ${z} ${X + hi[0]} ${Math.min(Y + hi[1], y + 3)} ${Math.min(Z + hi[2], z + 31)}`
            await ctx.cmd(`/fill ${a} air replace water`, { mayFail: true })
            await ctx.cmd(`/fill ${a} air replace obsidian`, { mayFail: true })
          }
        }
        await ctx.cmd(`/place template ${tid} ${X + lo[0]} ${Y + lo[1]} ${Z + lo[2]}`)
        if (pass === 2 && (await wet()).length) throw new Error('quest: the course keeps flooding')
      }
      await ctx.cmd('/kill @e[type=item]')
      await ctx.cmd('/kill @e[type=falling_block]', { mayFail: true })
      const Q = this.Q = helpers(ctx, this.O, ep, this)
      // the doors: pistons and their power, live
      for (const d of doors) await Q.run(d.build)
      // the chests' contents: the four in the treasure room (bones and gold, as vanilla's), the stages' own
      const roomLoot = ep.roomLoot || [[4, 'bone', 5], [10, 'gold_ingot', 3], [13, 'rotten_flesh', 7], [20, 'string', 2]]
      for (const [x, z] of [[0, 3], [-3, 0], [3, 0], [0, -3]]) for (const [s, it, n] of roomLoot) await Q.cmd(`/item replace block ${Q.A(x, ROOM_F + 1, z)} container.${(s + x * 3 + z) & 15 | 0} with ${it} ${n}`)
      for (const p of plan) if (p.setup) await p.setup(Q)
      this.plan = plan; this.door1 = door1
      await ctx.cmd('/kill @e[type=item]')
      await ctx.hotbar(ep.hotbar || ['iron_pickaxe', ['torch', 64], ['bread', 12], ['sandstone', 48], 'water_bucket', ['arrow', 16], 'bow', ['ladder', 24], 'compass'])
      ctx.select(0)
      // the start: in the hall, a block south of the blue terracotta, looking down at it
      const s = Q.at(0.5, 1, 1.75)
      await ctx.tpCheck(s.x, s.y, s.z, 180, 36)
      await ctx.cmd('/gamemode survival')
      await ctx.cmd('/effect give @s minecraft:saturation 5 1 true', { mayFail: true })
      await bot.waitForTicks(30)
      return { x: s.x, y: s.y, z: s.z }
    },

    async perform (ctx) {
      const Q = this.Q
      const { bot } = ctx
      Q.K = storyKit(ctx, { line: () => ({ dur: 0, gap: 0 }), gap: 0 }, { X: this.O.x, Z: this.O.z, F: this.O.y }, { warm: null })
      Q.K.base = { yaw: bot.entity.yaw, pitch: bot.entity.pitch }
      relaySounds(ctx)
      const K = Q.K
      ctx.mark('go')
      // 1. dig the blue terracotta, step in, fall into the treasure room
      await Q.dig(Q.at(0, 0, 0))
      ctx.mark('dug')
      // a step forward onto the hole, released so the slide stops over it (walking across a 1x1 hole never drops you)
      const sway = K.sway
      K.sway = 0
      K.base = { yaw: 0, pitch: -1.2 }
      let fell = false
      for (let k = 0; k < 80; k++) {
        K.look(k)
        const lz = bot.entity.position.z - this.O.z
        if (!fell) K.go(lz > 0.66)
        if (!fell && bot.entity.position.y < this.O.y + 0.6) { fell = true; K.go(false); ctx.mark('drop') }
        if (fell && bot.entity.onGround) break
        await bot.waitForTicks(1)
      }
      K.sway = sway
      if (!fell) throw new Error('quest: never fell into the shaft')
      K.go(false)
      ctx.mark('land')
      ctx.sound('entity.player.big_fall', 0.9)
      // 2. the treasure room: the four chests everyone loots (a look at the north one), then the button nobody presses
      K.base = { yaw: 0, pitch: -0.25 }
      await Q.look(0.5, ROOM_F + 1.5, -2.5, { max: 14 })
      ctx.mark('room')
      await Q.hold(6)
      await K.use(Q.at(1, ROOM_F + 2, -2), { sound: 'block.wooden_button.click_on', volume: 0.8 })
      ctx.mark('press')
      await Q.hold(2)
      await Q.openDoor(this.door1)
      ctx.mark('open')
      await Q.look(AX + 0.5, ROOM_F + 1.6, -4, { max: 10 })
      // walk to the doorway's line (x 2.5) and through it
      await Q.walk([[AX + 0.5, ROOM_F + 1, -0.4], [AX + 0.5, ROOM_F + 1, -1.8], [AX + 0.5, ROOM_F + 1, -3.6]], { pitch: -0.1 })
      // 3. the stages
      let ok = true
      try {
      for (const [i, p] of this.plan.entries()) {
        // the pits stay lava: water that seeps in during the run (round 2 review: an aquifer flooded parkour 5 after
        // the build-time scan was clean) is cleared before every stage, while the pits are still out of view
        await Q.dry(this.plan.filter(q => q.pit).map(q => q.pit))
        if (i === 0) Q.keepDry(this.plan.filter(q => q.pit).map(q => q.pit))
        ctx.mark('stage', { n: i, kind: p.st.kind })
        const r = await p.play(Q)
        if (r === false) ok = false
      }
      } finally { Q.dryOn = false }
      return ok && bot.health > 0
    }
  }
}

function helpers (ctx, O, ep, stunt) {
  const { bot } = ctx
  const V = (x, y, z) => new ctx.Vec3(O.x + x, O.y + y, O.z + z)
  const A = (x, y, z) => `${O.x + x} ${O.y + y} ${O.z + z}`
  const Q = {
    ctx, bot, O, ep, at: V, A,
    cmd: (s, o) => ctx.cmd(s, o),
    async run (steps) {
      for (const [op, p, blk] of steps) {
        if (op === 'wait') { await bot.waitForTicks(p); continue }
        await ctx.cmd(`/setblock ${A(...p)} ${blk}`)
      }
    },
    // the door opens: the power swapped out (both pistons retract on the same tick, the blocks pulled into the
    // floor and the ceiling); the pistons' own sounds come from the server (relaySounds)
    // all through the run: water anywhere in the envelope is logged where it first shows (to find the leak) and the
    // pits are dried every 10 ticks, so a seep never gets to spread on camera
    keepDry (pits) {
      Q.dryOn = true
      const seen = new Set()
      ;(async () => {
        while (Q.dryOn) {
          await bot.waitForTicks(10)
          if (!Q.dryOn) break
          const w = bot.findBlocks({ matching: b => b && /water|obsidian/.test(b.name), maxDistance: 128, count: 4000 })
            .filter(q => Math.abs(q.x - O.x - AX) <= 9 && q.y < O.y - 1 && q.z < O.z - 4)
          const fresh = w.filter(q => !seen.has(`${q}`))
          for (const q of w) seen.add(`${q}`)
          if (fresh.length) ctx.log(`quest: water seeps in: ${fresh.slice(0, 8).map(q => `${q.x - O.x},${q.y - O.y},${q.z - O.z}:${bot.blockAt(q)?.name}`).join(' ')}`)
          if (w.length) await Q.dry(pits, true)
        }
      })().catch(e => ctx.log(`quest: keepDry ${e.message}`))
    },
    async dry (pits, quiet) {
      for (const t of pits) {
        const inPit = q => q.x >= O.x + t.x0 - 1 && q.x <= O.x + t.x1 + 1 && q.y >= O.y + t.lava - 1 && q.y <= O.y + t.top && q.z >= O.z + Math.min(t.z0, t.z1) - 1 && q.z <= O.z + Math.max(t.z0, t.z1) + 1
        const wet = bot.findBlocks({ matching: b => b && /water|obsidian|cobblestone/.test(b.name), maxDistance: 128, count: 4000 }).filter(inPit)
        if (wet.length && !quiet) ctx.log(`quest: pit z ${t.z0}..${t.z1}: ${wet.length} water/obsidian cells, e.g. ${wet.slice(0, 5).map(q => `${q.x - O.x},${q.y - O.y},${q.z - O.z}`).join(' ')}`)
        const box = (y0, y1) => `${A(t.x0 - 1, y0, t.z0 - 1)} ${A(t.x1 + 1, y1, t.z1 + 1)}`
        Q.K.say(`/fill ${box(t.lava + 1, t.top)} air replace water`)
        for (const blk of ['water', 'obsidian', 'cobblestone']) Q.K.say(`/fill ${A(t.x0, t.lava, t.z0)} ${A(t.x1, t.lava, t.z1)} lava replace ${blk}`)
      }
      await bot.waitForTicks(1)
    },
    async openDoor (d) { for (const [, p, blk] of d.open) Q.K.say(`/setblock ${A(...p)} ${blk}`); await bot.waitForTicks(1) },
    // a dig with vanilla's sounds: the hit sound every 4 ticks while the crack grows, the break sound on the break
    // (K.dig itself is silent: the opening dig left the first 1.8 s without a sound)
    async dig (pos) {
      const blk = bot.blockAt(pos), grp = ctx.soundGroup(blk.name)
      let on = true
      const hits = (async () => { await bot.waitForTicks(2); while (on) { ctx.sound(`block.${grp}.hit`, 0.5, 0.5); await bot.waitForTicks(4) } })()
      try { await Q.K.dig(blk) } finally { on = false }
      await hits
      ctx.sound(`block.${grp}.break`, 1, 0.8, { key: true })
    },
    walk: (pts, o = {}) => Q.K.walkTo(pts.map(p => V(...p)), o),
    // a straight run north along the course axis to local z (the forward key released o.stop early: the slide), the
    // eyes ahead down the axis, so the player stays on its centre line in a 1-wide tunnel (K.walkTo's planner wants
    // more than the 0.2 block a side a 1-wide tunnel leaves). o: { sprint, pitch, during(k), sway }
    async dash (zT, o = {}) {
      const K = Q.K, sway = K.sway
      K.sway = o.sway ?? 0.25
      if (o.sprint) K.ctl('sprint', true)
      const stop = o.stop ?? (o.sprint ? 0.55 : 0.3)
      let k = 0
      try {
        for (; k < 400; k++) {
          const p = bot.entity.position
          if (p.z - O.z <= zT + stop) break
          const yaw = Math.atan2(-(O.x + AX + 0.5 - p.x), 3)
          K.base = { yaw, pitch: o.pitch ?? K.base.pitch }
          K.look(k)
          K.go(true)
          if (o.during) await o.during(k)
          await bot.waitForTicks(1)
        }
      } finally { if (!o.keep) K.stop(['forward', 'sprint']) }
      for (let j = 0; j < (o.settle ?? 4); j++) { K.look(k + j); if (o.during) await o.during(k + j); await bot.waitForTicks(1) }
      K.sway = sway
    },
    look: (x, y, z, o = {}) => Q.K.aimAt(Object.assign(V(x, y, z), { exact: true }), o),
    hold: async (ticks) => { for (let k = 0; k < ticks; k++) { Q.K.look(k); await bot.waitForTicks(1) } },
    // sprint-jumps along the course (yaw 0: north) onto each target { z (local, block centre), f (its floor y) }:
    // a jump off the front of the block, the forward key in the air only while the landing would fall short of the
    // target's middle (vanilla air drag 0.91, gravity 0.08 * 0.98), the camera on the next block's top, eased
    async hops (targets) {
      const K = Q.K
      const landZ = (floorTop) => {
        let { z, y } = bot.entity.position, vz = bot.entity.velocity.z, vy = bot.entity.velocity.y
        for (let i = 0; i < 60; i++) { vy = (vy - 0.08) * 0.98; y += vy; vz *= 0.91; z += vz; if (vy < 0 && y <= floorTop) break }
        return z
      }
      K.ctl('sprint', true); K.go(true)
      const sway = K.sway
      K.sway = 0
      let air = false, i = 0, k = 0, from = bot.entity.position.y
      for (; k < 400 && i < targets.length; k++) {
        const t = targets[i], p = bot.entity.position
        const tz = O.z + t.z, top = O.y + t.f + 1
        // the look: the target's top, a little past its middle (the eye leads the jump)
        const eye = p.y + 1.62, dz = Math.max(1.2, p.z - (tz - 0.6))
        // the yaw at the target's centre line (the walk follows the look: the sway's 0.1 rad drifted a 3.5-block jump
        // 0.35 off a 1-wide pillar), the sway off while jumping
        const cx = O.x + AX + 0.5
        K.base = { yaw: Math.atan2(-(cx - p.x), Math.max(1.5, p.z - tz)), pitch: Math.max(-0.75, Math.atan2(top - eye, dz)) }
        K.look(k)
        if (bot.entity.onGround) {
          if (air) {
            air = false
            K.go(false, 'back')
            if (p.y < O.y + t.f + 0.9) {
              const col = []
              for (let y = t.f - 5; y <= t.f + 1; y++) { const q = bot.blockAt(new ctx.Vec3(O.x + AX, O.y + y, Math.floor(tz))); col.push(`${y}:${q ? q.name : '?'}`) }
              ctx.log(`the target column (z ${Math.floor(tz) - O.z}): ${col.join(' ')}; path ${(Q._path || []).join(' ')}`)
            }
            if (p.y < O.y + t.f + 0.9) throw new Error(`quest hops: jump ${i} came down at y ${(p.y - O.y).toFixed(2)} z ${(p.z - O.z).toFixed(2)}, not on its block (target z ${t.z}, floor ${t.f})`)
            ctx.mark('hop_land', { n: i })
            ctx.log(`hop ${i}: off ${(from - O.z).toFixed(2)} -> ${(p.z - O.z).toFixed(2)} (target ${t.z}, y ${(p.y - O.y).toFixed(2)})`)
            ctx.sound(`block.${ctx.soundGroup('sandstone')}.step`, 0.35)
            i++
            if (i >= targets.length) break
            continue
          }
          // the block under us: jump off its front (north) edge, or right away from a pillar's middle
          // (only off the last block: a ledge's inner row has floor ahead)
          const zb = Math.floor(p.z)
          const ahead = bot.blockAt(new ctx.Vec3(Math.floor(p.x), Math.floor(p.y) - 1, zb - 1))
          const edge = !(ahead && ahead.boundingBox === 'block')
          const fromPillar = i > 0
          K.go(true); K.ctl('sprint', true)
          K.ctl('jump', edge && (fromPillar ? p.z <= zb + 0.62 : p.z <= zb + 0.3))
        } else {
          if (air) (Q._path || (Q._path = [])).push(`${(p.x - O.x).toFixed(2)},${(p.z - O.z).toFixed(2)}/${(p.y - O.y).toFixed(2)}${bot.getControlState('back') ? 'B' : bot.getControlState('forward') ? 'F' : ''}`)
          if (!air) { Q._path = []; air = true; from = p.z; ctx.mark('jump', { n: i }); ctx.log(`jump ${i}: vz ${bot.entity.velocity.z.toFixed(3)} sprint ${bot.controlState.sprint} fwd ${bot.controlState.forward}`) }
          K.ctl('jump', false)
          // forward while the landing (with no keys) would fall short of the target's middle; the back key (air braking,
          // as a player does) when it would pass it by more than 0.25: chained sprint-jumps gain speed and overshoot
          const lz = landZ(top - 0.01)
          K.go(lz > tz + 0.2)
          K.go(lz < tz - 0.5, 'back')
        }
        await bot.waitForTicks(1)
      }
      K.stop(['forward', 'back', 'sprint', 'jump'])
      // the slide on the landing: let it settle
      for (let j = 0; j < 3; j++) { K.look(k + j); await bot.waitForTicks(1) }
      K.sway = sway
      if (i < targets.length) throw new Error(`quest hops: stuck before target ${i} (at ${bot.entity.position})`)
      const p = bot.entity.position
      const last = targets[targets.length - 1]
      if (Math.abs(p.y - (O.y + last.f + 1)) > 0.1) throw new Error(`quest hops: landed at y ${p.y.toFixed(2)}, not on the ledge`)
    }
  }
  return Q
}

module.exports = { makeQuest, STAGES, buildCourse, pyramid, AX, ROOM_F }
