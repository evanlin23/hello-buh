// "1 in a million landing, but it gets harder 😳": five drops, each one higher and smaller, each
// onto its own landing column, and the last one from build limit into a 1x1 of water in the middle
// of a lava lake, at night. Landing in water cancels fall damage (vanilla), so every one is a real
// survival landing; the only commands build the set and teleport to the next top.
// Between drops: a teleport cut (edit.speed "cut" between cutNa/cutNb), so there's no wait on screen.
// Owner rules: 30 s minimum from more beats, no dead space, end <= 1 s after the payoff.
// off: how far out from the pool the jump starts (it has to be steered in mid-air); bias: the
// mid-air drift toward the edge that gets corrected late (owner: "we just break but theres no
// movement so theres no tension about making it"). Steering simulated in lib/air_steer.js with
// a vanilla air sim, incl. a tick of input lag: the drift peaks 2.3-3.5 degrees off the crosshair
// 50-70 blocks up (air control can't undo more at terminal velocity) and lands within 0.1.
const TIERS = [
  { h: 40, pool: 5, off: 3, bias: 2, label: '40 blocks, 5x5' },
  { h: 100, pool: 3, off: 5, bias: -3, label: '100 blocks, 3x3' },
  { h: 160, pool: 1, off: 7, bias: 4, label: '160 blocks, 1x1' },
  { h: 'max', pool: 1, off: 9, bias: -4.5, cactus: true, label: 'BUILD LIMIT, 1x1... IN CACTUS' },   // its own look: tiers 3 and 4 read the same (review)
  { h: 'max', pool: 1, off: 11, bias: 4.5, lava: true, night: true, dz: 110, label: 'BUILD LIMIT... INTO LAVA' }   // dz: off to the side, out of the earlier tiers' downward shots (the bright lava pulled the eye from the target)
]
const { steer, ticksToFall } = require('../lib/air_steer')
const YAW = Math.PI / 2   // facing -x (west), toward the pool; MC yaw 90
const GAP = 34          // blocks between landing columns (x): separate pads with real ground between (at 26 they merged into one 134-block runway: review)
const R = 14            // cleared radius around each column (the jump starts up to 11 out)
const TOP_Y = 316       // glass at 316, eyes at ~318.6 (build limit 319)

const subs = TIERS.map((t, i) => [`look${i + 1}`, t.label, 2.6, 0])   // the stakes before each drop

module.exports = {
  name: 'one_in_a_million',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 in a million landing, but it gets harder 😳',
  // fog is max(xz, |y|) (fog.glsl): at 12 chunks (192) the ground under build limit (246 up) was
  // fully fogged, 2 s of blank white on tier 4 (beat audit PAUSE/LOW). 16 chunks (256) shows it;
  // the recording has to reach 256 past the camera, so the chunk refresh also stops around the sets
  // 18 chunks: the fog starts at 259 (end - end/10), past the 246 blocks down from build limit; at 16
  // the first ~15 blocks of each top drop were still ~60% fogged (review). Straight down from 246 up the
  // view spans about +-172 x +-97 blocks; the opening looks reach the fog (288) toward -x. The chunk
  // refresh loads every tier's landing (each covers the server's 192) plus 96 past the first one
  renderDistance: 18, recordRadius: 360,
  chunkStops: set => [...TIERS.map((t, i) => ({ x: set.x + (i - 2) * GAP, z: set.z + (t.dz || 0) })), { x: set.x - 2 * GAP - 96, z: set.z }],
  clouds: false,   // Video Settings > Clouds: OFF (vanilla). At y 192 the falls went through a white cloud wall, and from build limit the clouds hid the target
  edit: {
    caption: '1 in a million landing, but it gets harder 😳', red: 'harder',
    song: 'songs/ncs/fearless_funk.mp3', dropAt: 'splash5',   // its drop (29.5 s) comes after splash5 (~25.5 s): misery's 16.25 s drop played on tier 4
    startAt: 'drop1:-0.85', endAfter: 'splash5:0.9',
    subs,
    speed: [...TIERS.slice(1).map((_, i) => [`cut${i + 1}a`, `cut${i + 1}b`, 'cut']),
      ['look5:0.15', 'look5:0.95', 'cut'],      // the finale's first glance at -0.7 was black night sky (beat audit PAUSE 0.8 s)
      ['drop4:0.5', 'drop4:2.4', 2],           // the high part of the build-limit fall: from 250 up the target barely changes (review: LOW 1.2 s)
      ['drop5:-0.6', 'drop5:0.6', 2],          // the held breath and the jump's rise before the last fall (PAUSE 0.6 s)
      ['drop5:0.6', 'drop5:3.3', 2.5]],        // the high, dark part of the last fall (review: LOW 1.9 s); the lava rushing up stays real-time
    // retention toolkit (scripts/retention.py, scripts/sfx.py; worker 10)
    // a slow push-in on the crosshair through each fall from tier 2 (worker 10's zoom spans): a 1x1 at
    // 160+ blocks is a few px, and the drift (physics caps it near 3-4 degrees at terminal velocity) only
    // reads magnified (review)
    zoom: TIERS.slice(1).map((_, i) => [`drop${i + 2}:0.4`, `splash${i + 2}:-0.2`, 2.2]),
    hook: { at: 'splash5', before: 1.7, after: -0.2, text: 'wait for the last one 😳' },   // a flash of the finale before tier 1: 1.5 s (owner: 0.5 s was "too quick")
    counter: { at: TIERS.map((_, i) => `look${i + 1}`), total: TIERS.length },
    fallen: TIERS.map((_, i) => [`drop${i + 1}`, `splash${i + 1}`, 'blocks', -1]),   // live blocks-fallen count; -1: the splash mark fires with the feet in the water block
    punch: TIERS.map((_, i) => `splash${i + 1}`),
    shake: ['splash5'], flash: [['splash5', 0, 0.5]],
    slowmo: [['splash5', 0.25, 0.25]],                                       // 0.5 s of the 1x1 entry over 1 s
    cards: [['splash1', 'EASY', 0.8, 'green'], ['splash2', 'CLEAN', 0.8, 'green'], ['splash3', 'TIGHT 😬', 0.8, 'yellow'],
      ['splash4', 'INSANE', 0.8, 'orange'], ['splash5', '1 IN A MILLION', 1.2, 'red', 0, 'stamp']],
    replay: { at: 'splash5', before: 0.8, after: 0.45, cam: 'back:6', speed: 0.6 },   // third-person, after the payoff
    loop: true,
    sfx: [
      ...TIERS.slice(1).map((_, i) => ['whoosh', `cut${i + 1}b`]),
      ...TIERS.map((_, i) => ['wind', `drop${i + 1}`, `splash${i + 1}`]),
      ['riser', 'drop5', 'splash5'],
      ...TIERS.slice(0, 4).map((_, i) => ['impact', `splash${i + 1}`, { gain: 0.5 + 0.1 * i }]),
      ['boom', 'splash5'], ['dip', 'splash5', 0.3], ['pops'],
      ...TIERS.slice(1).map((_, i) => ['whoosh', `drift${i + 2}`, { gain: 0.6 }])   // a cue as the target slides furthest off the crosshair
    ]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    this.x0 = g.x; this.z = g.z; this.floor = g.y
    await ctx.defaultRules()
    const z = this.z, floor = this.floor
    // stand over the middle tier while building: the recording keeps the chunks the bot has loaded,
    // and the far tiers need terrain out to the fog in every direction
    // (a plain /tp: tpCheck fails mid-air because the bot falls in creative; position doesn't matter here)
    await ctx.cmd(`/tp @s ${this.x0 + 2 * GAP + 0.5} ${floor + 30} ${z + 0.5}`)
    await bot.waitForTicks(60)
    for (let i = 0; i < TIERS.length; i++) {
      const t = TIERS[i], x = this.x0 + i * GAP, z = this.z + (t.dz || 0)
      t.x = x; t.z = z; t.top = t.h === 'max' ? TOP_Y : floor + t.h
      // a flat grass pad, everything above it cleared to the top
      await ctx.cmd(`/fill ${x - R} ${floor - 3} ${z - R} ${x + R} ${floor - 1} ${z + R} dirt`)
      await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R} grass_block`)
      for (let y0 = floor + 1; y0 <= t.top + 3; y0 += 30) await ctx.cmd(`/fill ${x - R} ${y0} ${z - R} ${x + R} ${Math.min(y0 + 29, t.top + 3)} ${z + R} air`)
      if (t.lava) {   // a lava lake, a 1-block grass ring, the 1x1 of water in the middle
        await ctx.cmd(`/fill ${x - R} ${floor - 1} ${z - R} ${x + R} ${floor - 1} ${z + R} stone`)
        await ctx.cmd(`/fill ${x - R + 1} ${floor} ${z - R + 1} ${x + R - 1} ${floor} ${z + R - 1} lava`)
        await ctx.cmd(`/fill ${x - 1} ${floor} ${z - 1} ${x + 1} ${floor} ${z + 1} grass_block`)
      }
      if (t.cactus) {   // a sand pad, cactus every other block (cactus breaks beside any block), 1-3 tall
        await ctx.cmd(`/fill ${x - R} ${floor} ${z - R} ${x + R} ${floor} ${z + R} sand`)
        for (let dx = -R + 1; dx <= R - 1; dx += 2) {
          for (let dz = -R + 1; dz <= R - 1; dz += 2) {
            if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) continue
            const hgt = 1 + ((dx * 7 + dz * 13 + 99) % 3)
            await ctx.cmd(`/fill ${x + dx} ${floor + 1} ${z + dz} ${x + dx} ${floor + hgt} ${z + dz} cactus`)
          }
        }
        await ctx.cmd(`/fill ${x + t.off - 1} ${floor + 1} ${z - 1} ${x + t.off + 1} ${floor + 3} ${z + 1} air`)   // not under the jump-off block
      }
      const k = (t.pool - 1) / 2   // the pool: one block deep, water sources
      await ctx.cmd(`/fill ${x - k} ${floor - 1} ${z - k} ${x + k} ${floor - 1} ${z + k} stone`)
      await ctx.cmd(`/fill ${x - k} ${floor} ${z - k} ${x + k} ${floor} ${z + k} water`)
      await ctx.cmd(`/setblock ${x + t.off} ${t.top} ${z} glass`)   // the jump-off block, off to the side
    }
    await ctx.hotbar([null, ['cobblestone', 64], ['bread', 16], 'diamond_pickaxe'])   // slot 0 empty: the falls are filmed with a bare hand, not a sword across the view
    await ctx.tpCheck(TIERS[0].x + TIERS[0].off + 0.5, TIERS[0].top + 1, z + 0.5, 90, 30)
    await ctx.cmd('/gamemode survival'); await ctx.cmd('/effect give @s instant_health 1 10 true')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x: this.x0 + 2 * GAP, y: floor, z: this.z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const z = this.z, floor = this.floor
    for (let i = 0; i < TIERS.length; i++) {
      const t = TIERS[i], n = i + 1
      if (i > 0) {   // cut: teleport to the next top (and to night for the finale), settle, go
        ctx.mark(`cut${i}a`)
        if (t.night) await ctx.setTime(18000)
        await ctx.tpCheck(t.x + t.off + 0.5, t.top + 1, t.z + 0.5, 90, 30)
        await ctx.cmd('/effect give @s instant_health 1 10 true')
        await bot.waitForTicks(6)
        ctx.mark(`cut${i}b`)
      }
      // the stakes: from the edge, the pool far below and off ahead; then eyes straight down
      // before the jump, and they stay down for the whole fall (owner: "we don't face downward when
      // we are going down")
      ctx.mark(`look${n}`)
      if (t.lava) { await ctx.easeLook(YAW, -1.2, 600); await bot.waitForTicks(4) }   // steep: at -0.7 the night shot was black sky   // the finale: the lava lake first
      await ctx.easeLook(YAW, -0.95, 400)
      await ctx.easeLook(YAW, -Math.PI / 2 + 0.002, 450)
      // run and jump off toward the pool, then steer in the air (movement keys only)
      ctx.mark(`drop${n}`)
      const startY = bot.entity.position.y
      bot.setControlState('sprint', true); bot.setControlState('forward', true); bot.setControlState('jump', true)
      let splashed = false, k0 = 0, driftMarked = false
      const onTick = () => {
        k0++
        if (k0 === 4) bot.setControlState('jump', false)
        const e = bot.entity
        if (splashed || k0 < 3 || e.position.y > startY - 0.5) return
        if (!driftMarked && ticksToFall(e.position.y, e.velocity.y, floor + 1) <= 36) { driftMarked = true; ctx.mark(`drift${n}`) }   // the drift's peak (lib/air_steer LP)
        const c = steer({ yaw: YAW, px: e.position.x, pz: e.position.z, vx: e.velocity.x, vz: e.velocity.z, y: e.position.y, vy: e.velocity.y, tx: t.x + 0.5, tz: t.z + 0.5, floorY: floor + 1, startY, bias: t.bias })
        for (const key of ['forward', 'back', 'left', 'right']) bot.setControlState(key, c[key])
      }
      bot.on('physicsTick', onTick)
      await bot.look(YAW, -Math.PI / 2 + 0.002, true)
      for (let k = 0; k < 400 && !ctx.died; k++) {
        await bot.waitForTicks(1)
        if (!splashed && bot.entity.position.y < floor + 1.2) {
          splashed = true; bot.removeListener('physicsTick', onTick); bot.clearControlStates()
          ctx.mark(`splash${n}`); ctx.sound('entity.player.splash.high_speed')
          const p = bot.entity.position
          ctx.particles('splash', { x: p.x, y: floor + 0.95, z: p.z }, { count: 30 })
          ctx.log(`tier ${n} landed ${(p.x - t.x - 0.5).toFixed(2)}, ${(p.z - t.z - 0.5).toFixed(2)} from the centre`)
        }
        if (splashed && k > 4 && (bot.entity.onGround || bot.entity.isInWater)) break
      }
      bot.removeListener('physicsTick', onTick); bot.clearControlStates()
      if (!splashed || ctx.died) return false
      // straight into a look-up: no held shot on the water after the splash
      await ctx.easeLook(bot.entity.yaw + 0.5, -0.35, 800)
    }
    await bot.waitForTicks(6)
    return !ctx.died
  }
}
