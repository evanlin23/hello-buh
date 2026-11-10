// Story Short "why does grandpa wait at an empty rail" (stories/broken_rail, story.json v2, continuous takes).
// Every evening for 22 years Grandpa has met an empty line at the station's buffer stop: "She's on her way." Mom says
// Grandma left him for her sister's and kept the cart. Our pig lives in his own minecart and won't get out, even for
// a carrot. The night Buh turns ten (never named aloud) he works it out: if she's on her way, the rail's broken. He
// walks the line 3,000 blocks to a grassed-over creeper crater; past it, Grandma sits in her minecart on a dark
// powered rail, still facing home. He bridges the hole, lays rails, relights the rail and pushes. That evening her cart
// rolls into the buffer stop where Grandpa is waiting: "Sorry I'm late, dear."
//
// Two canonical places (docs/world/map.json, day 8400; world.build builds both): rail_town on the High Meadow (the
// station, our cottage and yard, the bridge over the ravine) and rail_crater 1,900 blocks west (the line over a ridge
// into a basin; the crater, the dark rail). O = (X, F, Z) is the buffer stop at bed level (rails at F + 1); the valley
// is V(x, y, z) = O + (VX + x, VF + y, VZ + z), its origin the crater's centre at bed level. All shots are O offsets.
// The cast are NoAI villagers and a pig, /tp'd every tick when they move; riders are drawn seated (the 'seated' pose:
// renderer/entities.js), since the recording can't see vanilla passengers move.
// SET_ONLY=1 (or no voice yet): setup, then every camera shot held 1.5 s, for stills of the sets.
const fs = require('fs')
const path = require('path')
const world = require('../lib/world')
const { storyLines, storyKit } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'broken_rail')
const CAPTION = 'why does grandpa wait at an empty rail 🛤️'
const X = -318, Z = -770, F = 116                 // the buffer stop (map.json rail_town station: buffer at -318,117,-770)
const VX = -1798, VZ = 674, VF = -38               // the crater's centre (-2116, 78, -96) from O (bed level; rails at 79)
const DUSK = 12500, LATE_DUSK = 12850, MIDNIGHT = 18000, SUNRISE = 23300, MORNING = 4700
const v = (x, y, z) => [VX + x, VF + y, VZ + z]    // a valley point as an O offset
const POCKET = [-6, -5, 6], VPOCKET = [-6, -5, 9]  // where Buh waits while the shot is a camera (under the platform / the valley floor)
// the cast's marks
const GPA = [0.5, 1.5, -0.5]                       // Grandpa on the apron, just north of the buffer
const MOM = [-26.6, 2, 13.5]                       // at the yard's gate, facing the station
const PIG = [-30.5, 2, 11.5]                       // in his cart on the yard loop's north row
const GMA = [0.5, 1, 4.5]                          // (valley) in her cart on the dark rail at the crater's far lip

module.exports = {
  name: 'story_broken_rail',
  caption: CAPTION,
  botName: 'Buh',
  time: DUSK,
  botTimeout: 900,
  renderDistance: 12, recordRadius: 1950, entityRadius: 72,
  wideMaster: true,
  idleLife: true,
  hideHand: false,
  look: 'auto',
  edit: { caption: CAPTION, red: 'rail', story: 'stories/broken_rail', startAt: 'line:0', endAfter: 'story_end:0' },
  // the town, the line south to the bridge and beyond, the valley (the ridge and the crater)
  chunkStops (set) {
    return [[0, 0], [-30, 10], [0, 40], [0, 90], [10, -40], [VX, VZ], [VX, VZ - 60], [VX, VZ + 40]].map(([dx, dz]) => ({ x: set.x + dx, z: set.z + dz }))
  },

  async setup (ctx) {
    const { bot } = ctx
    const c = (s) => ctx.cmd(s)
    const n = (q) => String(+q.toFixed(3))
    const A = (dx, dy, dz) => `${n(X + dx)} ${n(F + dy)} ${n(Z + dz)}`
    await ctx.defaultRules()
    for (const g of ['log_admin_commands false', 'random_tick_speed 0', 'mob_griefing false']) await c(`/gamerule ${g}`)
    await c(`/setworldspawn ${X} ${F + 3} ${Z - 6}`)
    await c('/gamerule respawn_radius 0')
    const W = await world.build(ctx, { story: 'broken_rail' })
    for (const [k, p] of Object.entries(W.places)) ctx.log(`world: ${k} origin ${JSON.stringify(p.origin)} pieces ${Object.keys(p.pieces).join(' ')} stamps ${p.stamps.join(' ')}`)
    const st = W.places.rail_town.pieces.station
    if (st && st.anchors && st.anchors.buffer) ctx.log(`station buffer at ${JSON.stringify(st.anchors.buffer)} (stunt O ${X},${F + 1},${Z})`)
    // story-only: no mobs but ours
    for (const [x0, z0] of [[X, Z], [X + VX, Z + VZ]]) await c(`/kill @e[type=!player,x=${x0},y=${F},z=${z0},distance=..90]`)
    // the pockets Buh waits in during camera shots
    for (const [x, y, z] of [POCKET, v(...VPOCKET)]) {
      await c(`/fill ${A(x - 1, y - 1, z - 1)} ${A(x + 1, y + 2, z + 1)} stone`)
      await c(`/fill ${A(x, y, z)} ${A(x, y + 1, z)} air`)
    }
    // the cast, NoAI, tagged; carts are plain minecarts placed under their riders (the riders are /tp'd with them)
    const vd = (prof) => `VillagerData:{profession:"minecraft:${prof}",type:"minecraft:plains",level:2},Xp:1`
    const base = (tag) => `NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}","warm"]`
    await c(`/summon villager ${A(...GPA)} {${base('gpa')},${vd('toolsmith')},Rotation:[35f,0f]}`)
    await c(`/summon villager ${A(...MOM)} {${base('mom')},${vd('cleric')},Rotation:[-117f,0f]}`)
    await c(`/summon minecart ${A(...PIG)} {Tags:["pigcart"],Rotation:[0f,0f]}`)
    await c(`/summon pig ${A(...PIG)} {${base('pig')},NoGravity:1b,Rotation:[0f,0f]}`)
    await c(`/summon minecart ${A(...v(...GMA))} {Tags:["gcart"],Rotation:[90f,0f]}`)
    await c(`/summon villager ${A(...v(...GMA))} {${base('gma')},NoGravity:1b,${vd('farmer')},Rotation:[180f,0f]}`)
    // her cart again for the ending (the same cart, home): parked high over the town until S13
    await c(`/summon minecart ${A(22, 6, -24)} {Tags:["gcart2"],NoGravity:1b}`)
    await c(`/summon villager ${A(22, 6, -24)} {${base('gma2')},NoGravity:1b,${vd('farmer')},Rotation:[180f,0f]}`)
    // Buh: carrot, dirt, a redstone torch; full hearts; no rails until L08
    await c('/clear @s')
    await c('/item replace entity @s hotbar.1 with carrot 1')
    await c('/item replace entity @s hotbar.2 with dirt 64')
    await c('/item replace entity @s hotbar.3 with redstone_torch 8')
    await c('/effect give @s resistance infinite 255 true')
    await c('/effect give @s saturation infinite 255 true')
    await ctx.tpCheck(X + POCKET[0] + 0.5, F + POCKET[1], Z + POCKET[2] + 0.5, 0, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const setOnly = process.env.SET_ONLY === '1' || !fs.existsSync(path.join(STORY, 'voice', 'voice.json'))
    const S = setOnly ? { ids: [], gap: 0.3, line () { throw new Error('no voice') } } : storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F }, { warm: null })
    const { P, say, line } = K
    const n = (q) => String(+q.toFixed(3))   // whole numbers stay whole (/setblock refuses '-2116.000')
    const A = (dx, dy, dz) => `${n(X + dx)} ${n(F + dy)} ${n(Z + dz)}`
    const ent = (name, at) => Object.values(bot.entities).filter(e => e.name === name).sort((a, b) => a.position.distanceTo(at) - b.position.distanceTo(at))[0]
    const at3 = (p) => P(...p)
    // the riders: their ids for the seated pose (Grandma 2 and her cart come up in S13)
    const ids = []
    const seat = (name, p) => { const e = ent(name, at3(p)); if (e && e.position.distanceTo(at3(p)) < 1.5) { ids.push(e.id); ctx.mark('pose', { ids: [e.id], seated: true }); return e } ctx.log(`no ${name} at ${p} (the bot is too far to see it?) ${Object.values(bot.entities).filter(q => q.name === name).map(q => `${q.id}@${q.position.x.toFixed(1)},${q.position.y.toFixed(1)},${q.position.z.toFixed(1)}`).join(' ')}`); return null }
    seat('pig', PIG)
    // a rider and its cart moved together (an actor state per tag, /tp'd every tick)
    const cart = (cartTag, riderTag, s) => {
      const st = { ...s }
      return {
        st,
        put () {
          say(`/tp @e[tag=${cartTag},limit=1] ${A(st.x, st.y, st.z)} ${(st.yaw + 90).toFixed(1)} 0`)
          say(`/tp @e[tag=${riderTag},limit=1] ${A(st.x, st.y, st.z)} ${st.yaw.toFixed(1)} ${(st.pitch || 0).toFixed(1)}`)
        }
      }
    }
    const pocket = (valley, o = {}) => valley ? K.cut(VX + VPOCKET[0] + 0.5, VZ + VPOCKET[2] + 0.5, P(VX, VF + VPOCKET[1] + 1.6, VZ + VPOCKET[2] + 3), VF + VPOCKET[1], o)
      : K.cut(POCKET[0] + 0.5, POCKET[2] + 0.5, P(POCKET[0], POCKET[1] + 1.6, POCKET[2] + 3), POCKET[1], o)

    if (setOnly) {
      // the sets, every camera held 1.5 s (stills: ./hb still story_broken_rail tick:N)
      const town = ['s01', 's02', 's03', 's04', 's05', 's07', 's14']
      const valley = ['s09', 's11b', 's12b']
      for (const name of town) { ctx.log(`SET_ONLY shot ${name} at tick ${ctx.tick}`); K.shot(name); for (let k = 0; k < 30; k++) { K.look(k); await bot.waitForTicks(1) } }
      await K.cut(0.5, 29.5, P(0.5, 1.6, 45), 1, { time: MIDNIGHT, shot: 'pov' })
      ctx.log(`SET_ONLY pov bridge at tick ${ctx.tick}`); for (let k = 0; k < 30; k++) { K.look(k); await bot.waitForTicks(1) }
      await K.cut(VX + 0.5, VZ - 8, P(VX + 0.5, VF + 1.2, VZ + 4.5), VF + 1, { time: MORNING })
      ctx.log(`SET_ONLY pov crater at tick ${ctx.tick}`); for (let k = 0; k < 30; k++) { K.look(k); await bot.waitForTicks(1) }
      await pocket(true)
      for (const name of valley) { ctx.log(`SET_ONLY shot ${name} at tick ${ctx.tick}`); K.shot(name); for (let k = 0; k < 30; k++) { K.look(k); await bot.waitForTicks(1) } }
      ctx.mark('story_end')
      await bot.waitForTicks(4)
      return true
    }

    const gpa = K.actor('gpa', { x: GPA[0], y: GPA[1], z: GPA[2], yaw: 35, pitch: 0 })
    const pig = K.actor('pig', { x: PIG[0], y: PIG[1], z: PIG[2], yaw: 0, pitch: 0 })

    // L01 (S01): dusk, the station. Behind Grandpa's right shoulder, the empty line running south over the bridge
    K.shot('s01')
    await K.preroll(10, (k) => { gpa.yaw = 35 + 3 * Math.sin(k / 9) })
    await line('L01', async (k) => { gpa.yaw = 35 + 4 * Math.sin((k + 10) / 11); gpa.pitch = 3 * Math.sin(k / 13) })

    // L02 (S02): the crane up and back off the platform: the whole station small, the line south, nothing on it
    K.shot('s02')
    await line('L02', async (k, at) => { gpa.yaw = 35 + 4 * Math.sin((k + 40) / 11); if (k === at(3)) gpa.yaw = 0 })

    // L03 (S03): our yard: Mom at the gate looking at the station, the pig's cart in front
    K.shot('s03')
    K.setTime(12600)
    await line('L03', async (k) => { pig.yaw = 10 * Math.sin(k / 15) })

    // L04 (S04): the sidings: JUNE's spur, empty; OTTO's cart at the left
    K.shot('s04')
    K.setTime(12650)
    await line('L04', async () => {})

    // L05 (S05): the pig sitting in his cart on the yard loop, the cottage behind
    K.shot('s05')
    await line('L05', async (k, at) => { pig.yaw = k < at(3) ? 15 * Math.sin(k / 8) : 0; pig.pitch = k >= at(3) ? -10 : 0 })

    // L06 (S06): POV with the carrot: his head follows it, his body stays in the cart
    await K.cut(PIG[0], PIG[2] + 2.6, K.face(at3(PIG), 'pig'), 2, { shot: 'pov' })
    bot.setQuickBarSlot(1)
    await line('L06', async (k, at, n) => {
      const sw = Math.sin(k / 9)                      // the carrot swung slowly left and right (the camera's yaw)
      K.look(k, 0.22 * sw, 0)
      pig.yaw = -28 * sw; pig.pitch = 8
      if (k === at(2)) ctx.sound('entity.pig.ambient', 0.8, 1.1)
    })

    // L07 (S07): Grandpa at the buffer, then the crane up over the station to the bridge
    await pocket(false, { shot: 's07', time: LATE_DUSK })
    await line('L07', async (k, at) => { gpa.yaw = 5 + 3 * Math.sin(k / 12); if (k === at(2)) K.shot('s07b') })

    // L08 (S08): midnight, POV at the bridge's north foot. On 'RAILS' the stack lands in slot 1 and he steps on
    await K.cut(0.5, 29.5, P(0.5, 1.4, 45), 1, { time: MIDNIGHT, shot: 'pov' })
    bot.setQuickBarSlot(1)
    await line('L08', async (k, at) => {
      if (k === at(4)) { say('/item replace entity @s hotbar.0 with rail 64'); bot.setQuickBarSlot(0); ctx.sound('entity.item.pickup', 0.5, 1) }
      K.go(k > at(4) + 3)
      K.look(k)
    })
    K.stop()

    // L09 (S09): sunrise, the valley: a high crane down the line over the ridge, Buh tiny on it walking south
    await K.cut(VX + 0.5, VZ - 29.5, P(VX + 0.5, VF - 4, VZ - 8), 101 - F,   // the rail's y there (the line stamp's profile)
      { time: SUNRISE, shot: 's09', lift: 0 })
    await line('L09', async (k) => { K.go(true); K.look(k) })
    K.stop()

    // L10 (S10): POV walking south along the rail on the basin floor; stops at the lip on 'STOPPED'; tilts down
    const lip = -4.3, speed = 0.2155
    let from = null
    {
      const L10 = S.line('L10')
      const z0 = lip - speed * L10.at(1)
      await K.cut(VX + 0.5, VZ + z0, P(VX + 0.5, VF + 1.3, VZ + 6), VF + 1, { time: MORNING, shot: 'pov' })
      if (!ids.some(id => bot.entities[id] && bot.entities[id].name === 'villager')) seat('villager', v(...GMA))
      bot.setQuickBarSlot(0)
      await line('L10', async (k, at) => {
        K.go(k < at(1) && bot.entity.position.z < Z + VZ + lip)
        if (k === at(1)) ctx.sound('block.gravel.step', 0.6, 0.8)
        if (k >= at(2) - 6) { from = from || { ...K.base }; K.turnTo(from, P(VX + 0.5, VF - 1.5, VZ + 0.5), (k - at(2) + 6) / 10) }
        K.look(k)
      })
      K.stop()
    }

    // L11 (S11a then S11b): the same take tilts up to the far lip: her cart on the dark rail; on 'GRANDMA' the close-up
    from = null
    const gma = K.actor('gma', { x: VX + GMA[0], y: VF + GMA[1], z: VZ + GMA[2], yaw: 180, pitch: 0 })
    await line('L11', async (k, at) => {
      if (k < at(2)) { from = from || { ...K.base }; K.turnTo(from, P(VX + 0.5, VF + 1.6, VZ + 4.5), k / 9); K.look(k) }
      if (k === at(2)) K.shot('s11b')
      gma.pitch = k >= at(2) ? 4 * Math.sin((k - at(2)) / 10) : 0
      gma.yaw = 180 + 3 * Math.sin(k / 14)
    })

    // L12 (S12a then S12b): a jump cut in: 3 dirt already across. The last 4 go in, 7 rails, the torch: the gold rail
    // lights. Then from the side: he walks into her cart and the rail fires it north, home
    K.actors.delete('gma')
    for (let i = 0; i < 3; i++) say(`/setblock ${A(VX, VF, VZ - 3 + i)} dirt`)
    await K.cut(VX + 0.5, VZ - 1.3, K.top(P(VX, VF, VZ + 0)), VF + 1, { shot: 'pov' })
    bot.setQuickBarSlot(2)
    const g1 = cart('gcart', 'gma', { x: VX + GMA[0], y: VF + GMA[1], z: VZ + GMA[2], yaw: 180 })
    let placed = 0, railed = 0, torch = false, pushT = null
    from = null
    await line('L12', async (k, at, n) => {
      const pushK = at(3) - 6
      if (k < at(1) + 8) {
        // the dirt: one block every 4 ticks, walking forward along the row
        const want = Math.min(4, Math.floor(k / 4) + 1)
        while (placed < want) { say(`/setblock ${A(VX, VF, VZ + placed)} dirt`); bot.swingArm('right'); ctx.sound('block.gravel.place', 0.8, 0.9); placed++ }
        K.base = K.aim(K.top(P(VX, VF, VZ + Math.min(3, placed))))
        K.go(bot.entity.position.z < Z + VZ + 1.2)
      } else if (k < at(2) + 14) {
        if (railed === 0) { bot.setQuickBarSlot(0) }
        const want = Math.min(7, Math.floor((k - at(1) - 8) / 2) + 1)
        while (railed < want) { say(`/setblock ${A(VX, VF + 1, VZ - 3 + railed)} rail[shape=north_south]`); bot.swingArm('right'); ctx.sound('block.metal.place', 0.7, 1.1); railed++ }
        K.base = K.aim(K.top(P(VX, VF + 1, VZ + Math.min(3, railed - 3))))
        K.go(bot.entity.position.z < Z + VZ + 3.2)
      } else if (!torch) {
        K.stop(); bot.setQuickBarSlot(3)
        from = from || { ...K.base }
        K.turnTo(from, K.top(P(VX + 1, VF + 1, VZ + 4)), (k - at(2) - 14) / 4)
        if (k >= at(2) + 18) {
          torch = true; bot.swingArm('right')
          say(`/setblock ${A(VX + 1, VF + 1, VZ + 4)} redstone_torch`)
          say(`/setblock ${A(VX, VF + 1, VZ + 4)} powered_rail[shape=north_south,powered=true]`)
          ctx.sound('block.wood.place', 0.8, 1)
        }
      }
      if (k <= pushK - 1 || !torch) K.look(k)
      // S12b: from the west, side-on; he walks into the cart from the south, the lit rail launches it north
      if (k === pushK) {
        K.shot('s12b'); K.stop()
        say(`/tp @s ${A(VX + 0.5, VF + 1, VZ + 6.3)} 180 0`)
      }
      if (k > pushK) K.go(k < at(3) + 4)
      if (k === at(3)) { pushT = k; ctx.sound('entity.minecart.riding', 0.6, 1.2) }
      if (pushT !== null) {
        const t = k - pushT, sp = Math.min(0.39, 0.12 + t * 0.05)
        g1.st.z -= sp; g1.put()
      } else g1.put()
    })
    K.stop()

    // L13 (S13): dusk again, the S01 frame: on 'waiting' her cart rolls off the bridge toward us
    await pocket(false, { time: 12800, shot: 's13' })
    const g2 = cart('gcart2', 'gma2', { x: 0.5, y: 1, z: 33.5, yaw: 180 })
    let rolling = false
    let g2e = null
    await line('L13', async (k, at) => {
      gpa.yaw = 35 + 4 * Math.sin(k / 11)
      if (!g2e && k >= 2 && k % 4 === 2 && k < at(2) - 4) g2e = seat('villager', [0.5, 1, 33.5]) || seat('villager', [22, 6, -24])   // parked, or already at her cart's start (the town's entities come back to the bot a few ticks after the cut home)
      if (k === at(2) - 2) { rolling = true; ctx.sound('entity.minecart.riding', 0.25, 1) }
      if (rolling) { g2.st.z -= 0.39; g2.put() }
      if (k === 0) g2.put()
    })

    // L14 (S14): side-on from the platform: the cart hops in from the right, knocks the buffer, the activator sets her
    // down; she says it; his head tips toward her on 'dear'
    K.shot('s14')
    g2.st.z = 4.3; g2.put()
    let knocked = false
    const gma2 = { x: 0.5, y: 1, z: 1.5, yaw: 180, pitch: 0 }
    await line('L14', async (k, at, n) => {
      if (!knocked) {
        g2.st.z = Math.max(1.5, g2.st.z - 0.39); g2.put()
        if (g2.st.z <= 1.5) {
          knocked = true
          ctx.sound('entity.minecart.inside', 0.0, 1)
          ctx.sound('block.stone.hit', 1, 0.6); ctx.sound('block.wood.hit', 0.8, 0.8)
          if (g2e) ctx.mark('pose_off', { ids: [g2e.id] })
          Object.assign(gma2, { x: -0.6, y: 1.5, z: 1.4, yaw: 150, pitch: 0 })
          K.actors.set('gma2', gma2)
        }
      }
      gpa.yaw = knocked ? Math.max(-150, gpa.yaw - 12) : gpa.yaw
      gpa.pitch = k >= at(1) ? 12 * Math.min(1, (k - at(1)) / 6) : 0
    }, 0)
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return true
  }
}

// the rail's y (O offset) at a valley line cell: the bed the rails stamp laid (falls back to the pinned crater height)
function lineY (ctx, dx, dz) {
  const b = ctx.surface(X + dx, Z + dz)
  return b ? b.position.y - F + (/rail/.test(b.name) ? 0 : 1) : VF + 1
}

// The camera shots (O offsets; the valley ones through v()). Compose for the centre crop (1080 of the 1920 master).
module.exports.shots = {
  pov: { pov: true },
  // S01 / S13: 5 behind and 2 west of Grandpa, 1.8 above his feet, looking south past his right shoulder down the line
  s01: { at: [-0.6, 3.4, -5.6], look: [2.8, 2.4, 22], fov: 50, push: 0.3, dof: false, subject: [[0.5, 2.6, -0.5]] },
  s13: { at: [-0.6, 3.4, -5.6], look: [2.8, 2.4, 22], fov: 50, push: 0.15, dof: false, subject: [[0.5, 2.6, -0.5]] },
  // S02: side-on from the west, the crane up and back: the whole station small, the line running right (south)
  s02: { at: [1.4, 2.3, 30.5], look: [0.3, 1.4, 6], fov: 50, push: 0.6, dof: false, subject: [[0.5, 1.2, 14]], ease: true, fov: 50, dof: false },
  // S03: behind Mom over the yard, looking east-north-east to the station
  s03: { at: [-39, 4.3, 16.5], look: [-12, 2.6, 7], fov: 50, push: 0.25, dof: false, subject: [[MOM[0], 3.4, MOM[2]]] },
  // S04: 4 south of JUNE's buffer, looking north up her empty spur
  s04: { at: [4.5, 2.6, 9.6], look: [4.5, 2.0, 4.5], fov: 50, push: 0.25, dof: false, subject: [[4.5, 2, 4.5]] },
  // S05: from behind the yard's south fence, looking north at the pig's cart, the cottage behind
  s05: { at: [-30.5, 4.5, 19.5], look: [-30.5, 2.4, 8], fov: 50, push: 0.25, dof: false, subject: [[PIG[0], 2.6, PIG[2]]] },
  // S07: a crane from just behind Grandpa's shoulder up over the station, looking south to the bridge
  s07: { at: [-1.4, 3.3, -3.8], look: [0.5, 2.9, -0.5], fov: 50, push: 0.2, dof: false, subject: [[0.5, 2.6, -0.5]] },
  // S07b ('And I wasn't allowed past the BRIDGE'): the bridge side-on from the ravine's west rim, its lamps lit, a slow crane up
  s07b: { path: [[0, -15, -4, 43.5], [2.2, -13, -3, 43]], lookPath: [[0, 0, -2, 43], [2.2, 0, -1.5, 43]], ease: true, fov: 50, dof: false, subject: [[0, 1, 43]] },
  // S09: a high crane over the ridge, looking south down the line into the basin
  s09: { path: [[0, ...v(-4, 42, -48)], [3, ...v(-3, 38, -42)]], lookPath: [[0, ...v(0, 16, -12)], [3, ...v(0, 12, -4)]], ease: true, fov: 55, dof: false },
  // S11b: the only close-up: Grandma in her cart, facing the lens (home)
  s11b: { at: v(0.5, 2.5, 1.1), look: v(0.5, 2.0, 4.5), fov: 50, push: 0.12, dof: { aperture: 0.7 }, subject: [v(0.5, 1.9, 4.5)] },
  // S12b: from the west, side-on: the cart shoots left (north) over the new rails
  s12b: { at: v(-11, 4.6, 3.4), lookPath: [[0, ...v(0.5, 1.5, 3.4)], [0.4, ...v(0.5, 1.5, 3.4)], [1.4, ...v(0.5, 1.5, 0.6)]], fov: 50, dof: false, subject: [v(0.5, 1.5, 4.5)] },
  // S14: side-on from the platform's west edge, looking east: Grandpa left, the cart in from the right
  s14: { at: [-6, 2.9, 0.4], look: [0.5, 2.1, 0.4], fov: 50, push: 0.08, dof: false, subject: [[0.5, 2.4, -0.5], [0.5, 2.0, 1.5]] }
}
