// Movie engine test reel 2 (docs/movie_engine.md): BUILD LIMIT scenes 16-17, "the Below". BUH (the recording bot)
// climbs down Fen's ladder out of the fog. Under it, at dawn, is a whole green world: a lake right under the
// Needle, a camp of the "missed" (Mannequins, the 1.21.9 player-shaped mob, as extras), and ASH (an actor bot) at
// the shore with a fishing rod. Buh walks over: "Ash?" Ash turns: "Took you long enough, Buh." and leads him into
// the camp: "Come meet the ones who missed." (v1 ended on a 3 s two-shot where nobody moved: QA stuck 12.9-15.9 s)
//
// What it proves beyond reel 1: the fog sea from inside and from below (a ceiling), dawn light, natural terrain,
// a first-person ladder descent, an actor holding an item, Mannequin extras, the cinematic look in daylight.
//
// Set (origin O = the ground under the Needle on plains, F = its surface y): the Needle, a 1x1 stone pillar from
// the lake up into the fog (y 130), with the ladder on its south face; a lake around it with a small island and a
// plank bridge south; the camp on the south shore: two houses, three campfires, extras around them.
const M = require('../lib/movie')
const { house } = require('../lib/story')

const FOG0 = 96, FOG1 = 126

module.exports = {
  name: 'movie_below',
  biome: 'minecraft:plains',
  near: [1200, 0],              // (the plains nearest spawn on this seed is a quarter snow and ice: the POV saw it from 30 up)
  time: 23300,                  // just before sunrise: the sun on the horizon under the fog ceiling
  renderDistance: 12, recordRadius: 192,
  botTimeout: 600,
  fogSea: { y0: FOG0, y1: FOG1, layers: 16, density: 0.985, fade: 5 },
  look: { grade: 'dawn', bloom: 0.5, bloomThreshold: 0.72, vignette: 0.4, grain: 0.03, letterbox: 2.39, dof: { aperture: 0.8 }, shadows: true },
  cast: { self: 'steve', Ash: 'noor', Mira: 'alex', Tobin: 'ari', Wren: 'makena', Oslo: 'kai', Pell: 'sunny', Juno: 'zuri' },   // (Ash as in reel 1; kai's back of head reads as a face)
  selfName: 'Buh',
  coverage: { line: ['self', 'actor:Ash'], side: 'south' },   // (renderer/lint.js checks every shot of the two of them stays south)
  idleLife: true,
  // offsets from O = (X, F, Z)
  shots: {
    pov: { pov: true },
    // the reveal: low across the camp, the Needle and its ladder coming down out of the fog ceiling
    // (east of both houses: v1's path ended inside the first house's roof and filled the frame with planks)
    reveal: { dof: false, path: [[0, 6, 4.5, 26], [4.3, 2, 5.5, 20]], lookPath: [[0, 0, 5, 0], [4.3, 0, 15, 0]] },   // (tilting up from the lake to the fog)
    // he crosses the bridge toward Ash (who has his back to him, fishing)
    follow: { follow: 'self', offset: [-2.6, 1.1, -2.4], look: { of: 'self', offset: [1.0, -0.3, 3.0] }, lag: 3, fov: 62 },
    // Ash turns to him: from Buh's side, his shoulder at the frame's edge
    ash: { at: { of: 'actor:Ash', offset: [1.3, 0.15, 2.3] }, look: 'actor:Ash', fov: 48 },
    // behind the two of them as Ash leads him into the camp: the fires and the missed ahead
    walk: { follow: 'actor:Ash', offset: [-0.6, 2.6, -4.2], look: { of: 'actor:Ash', offset: [0.4, -0.8, 4.0] }, lag: 4, fov: 62, crossLine: true }   // (a new axis: their walk; high behind both: at eye height Buh's head filled the foreground, scripts/try_shots.py)
  },
  edit: { startAt: 'start:0.3', endAfter: 'end_scene:0.6' },

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const p = bot.entity.position.floored()
    const ground = ctx.findLand(p.x, p.z) || p
    const X = ground.x, Z = ground.z
    const F = ground.y
    Object.assign(this, { X, Z, F })
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/difficulty peaceful')
    await ctx.cmd('/kill @e[type=!minecraft:player]')   // the world's own fish, squid, bats and bears (in the reveal)
    await ctx.cmd('/tick freeze')   // the lake and the fires stay put
    // a wide level clearing first: the plains here roll from y 51 to 97, and v2's 27-block patch left the camp at the
    // bottom of a pit with dirt walls, plain to see from the POV. 80x80, so the hills start beyond the POV's view
    for (const [x0, z0] of [[-40, -40], [0, -40], [-40, 0], [0, 0]]) {
      await ctx.cmd(`/fill ${A(x0, 1, z0)} ${A(x0 + 39, 20, z0 + 39)} air`)
      await ctx.cmd(`/fill ${A(x0, 21, z0)} ${A(x0 + 39, 40, z0 + 39)} air`)
      await ctx.cmd(`/fill ${A(x0, -6, z0)} ${A(x0 + 39, -1, z0 + 39)} dirt replace air`)
      await ctx.cmd(`/fill ${A(x0, 0, z0)} ${A(x0 + 39, 0, z0 + 39)} grass_block`)
    }
    // a level patch for the lake and the camp
    await ctx.cmd(`/fill ${A(-12, 1, -10)} ${A(14, 12, 22)} air`)
    await ctx.cmd(`/fill ${A(-12, 0, -10)} ${A(14, 0, 22)} grass_block`)
    // the lake (round-ish), the island and the Needle with its ladder
    await ctx.cmd(`/fill ${A(-6, -2, -6)} ${A(6, 0, 6)} water`)
    for (const [dx, dz] of [[-6, -6], [-6, 6], [6, -6], [6, 6], [-6, -5], [-5, -6], [6, 5], [5, 6], [-6, 5], [-5, 6], [6, -5], [5, -6]]) await ctx.cmd(`/fill ${A(dx, -2, dz)} ${A(dx, 0, dz)} grass_block`)
    await ctx.cmd(`/fill ${A(-1, -2, -1)} ${A(1, 0, 1)} stone_bricks`)
    await ctx.cmd(`/fill ${A(0, 1, 0)} ${A(0, FOG1 + 4 - F, 0)} stone_bricks`)
    await ctx.cmd(`/fill ${A(0, 1, 1)} ${A(0, FOG1 + 2 - F, 1)} ladder[facing=south]`)
    await ctx.cmd(`/fill ${A(0, 0, 2)} ${A(0, 0, 7)} oak_planks`)   // the bridge to the south shore
    // the camp: two houses, three campfires, a lantern post
    await house(ctx, A, -9, 12, -6, 12, 'north', true)
    await house(ctx, A, 6, 14, 9, 14, 'north', true)
    for (const [dx, dz] of [[-2, 13], [3, 16], [-6, 19]]) await ctx.cmd(`/setblock ${A(dx, 1, dz)} campfire[lit=true]`)
    await ctx.cmd(`/fill ${A(1, 1, 9)} ${A(1, 2, 9)} oak_fence`); await ctx.cmd(`/setblock ${A(1, 3, 9)} lantern`)
    // the extras: the missed, around the fires (Mannequins: no AI, named for stunt.cast's skins)
    const extras = [['Mira', -3.5, 12.5, 200], ['Tobin', -0.5, 13.5, 100], ['Wren', 2.5, 17.5, 20], ['Oslo', 4.5, 16.0, 120], ['Pell', -6.5, 20.5, 210], ['Juno', -4.8, 18.2, 300]]
    for (const [n, dx, dz, yaw] of extras) await ctx.cmd(`/summon minecraft:mannequin ${X + dx} ${F + 1} ${Z + dz} {CustomName:"${n}",Rotation:[${yaw}f,0f],immovable:1b}`)
    // Ash on the south shore west of the bridge, fishing (a rod in hand), facing the lake: Buh comes up behind him
    this.cast = await M.spawnActors(ctx, ['Ash'])
    await M.place(ctx, 'Ash', X - 4.5, F + 1, Z + 7.6, 180, 12)   // Minecraft yaw 180 = north, over the lake
    await M.give(ctx, 'Ash', 'fishing_rod')
    // Buh starts on the ladder inside the fog, looking out (south) and down
    await ctx.cmd('/gamemode survival')
    // (sneaking holds you on a ladder: without it he slid down before the teleport check, 'did not stick')
    bot.setControlState('sneak', true)
    await ctx.cmd(`/tp @s ${X + 0.5} ${FOG0 + 1.5} ${Z + 1.5} 0 35`)   // (1.5 above the fog's foot: at 7 the POV was 2.5 s of white, at 4 still 2.2 s)
    await bot.waitForTicks(20)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const ash = this.cast.Ash
    const SOUTH = Math.PI, WEST = Math.PI / 2   // mineflayer yaw: 0 = north, pi/2 = west, pi = south
    // 1. POV: sliding down the ladder through the fog (no keys: a ladder lets you down at 0.15 a tick), already
    //    moving on the first frame, facing out (south, away from the pillar) and down
    M.shot(ctx, 'pov')
    await bot.look(SOUTH, -0.55, true)
    bot.setControlState('sneak', false)   // let go: down the ladder
    let out = false
    for (let k = 0; k < 160 && bot.entity.position.y > FOG0 - 8; k++) {
      if (!out && bot.entity.position.y < FOG0) { out = true; ctx.mark('out_of_fog') }
      await bot.waitForTicks(1)
    }
    // 2. the reveal, from the camp; he keeps sliding down
    M.shot(ctx, 'reveal')
    await bot.waitForTicks(55)   // (80 held on the empty fog ceiling for its last 2 s)
    // 3. a cut to the foot of the ladder (the reveal hides the jump), then over the bridge and along the shore
    await ctx.cmd(`/tp @s ${X + 0.5} ${F + 1} ${Z + 1.5} 0 10`)
    M.shotIn(ctx, 'follow', 2)
    bot.setControlState('forward', true)
    for (let k = 0; k < 120 && bot.entity.position.z < Z + 7.6; k++) { await bot.look(SOUTH, 0.05, true); await bot.waitForTicks(1) }
    for (let k = 0; k < 120 && bot.entity.position.x > X - 2.7; k++) { await bot.look(WEST, 0.05, true); await bot.waitForTicks(1) }
    bot.setControlState('forward', false)
    M.line(ctx, 'Buh', 'Ash?')
    // 4. Ash turns around (cut on the turn), and the line is acted: M.say turns him to Buh and nods
    M.shot(ctx, 'ash')
    await M.lookAt(ash, bot.entity.position.offset(0, 1.62, 0), 600)
    ash.swingArm('right')   // the rod comes up as he turns
    await M.say(ctx, 'Ash', 'Took you long enough, Buh.', { to: 'Buh' })
    // 5. he leads him into the camp, talking as they go (the scene ends on the move, not on a held two-shot)
    M.line(ctx, 'Ash', 'Come meet the ones who missed.')
    const walking = M.walkTo(ash, X + 0.4, Z + 15.4)   // (between the fires: at X - 1.6 he walked under the west house's eaves and the camera hit its roof)
    M.shotIn(ctx, 'walk', 6)
    await bot.waitForTicks(4)
    bot.setControlState('forward', true)
    for (let k = 0; k < 70; k++) {
      const a = ash.entity.position, p = bot.entity.position
      const gx = a.x + 1.1, gz = a.z - 1.2   // a step behind him, on his left
      await bot.look(Math.atan2(-(gx - p.x), -(gz - p.z)), 0.05, true)
      bot.setControlState('forward', Math.hypot(gx - p.x, gz - p.z) > 0.5)
      if (k === 36) ctx.mark('end_scene')
      await bot.waitForTicks(1)
    }
    bot.setControlState('forward', false)
    await walking
    M.quitActors(ctx)
    return true
  }
}
