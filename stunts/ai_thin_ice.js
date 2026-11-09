// AI-dilemma Short 1, "Thin Ice" (docs/ai_dilemma.md). Vertical 9:16, about 45 s, voices from episodes/thin_ice.
// The BROTHER (the recording bot, so his fall and the water are a real first-person POV) walks across a frozen lake at
// dusk in falling snow. The ice cracks and he goes through, then drifts under the sheet, away from the hole. The
// narrator asks: do you go in after him? Each AI answers on the south shore, acting its answer: GPT turns and walks
// away, DeepSeek turns its back, Claude creeps out on hands and knees (sneaking), reaches and backs off, Gemini steps
// back. GROK sprints across the ice and sees the boy's shape through it (ice is translucent from both sides). He
// punches through (a real dig: ice broken over water becomes water, 0.75 s by hand). The boy climbs out, the ice gives
// way under Grok, and he sinks under the sheet.
//
// Minecraft-true: the hole doesn't refreeze (randomTickSpeed 0: in a snowy biome it would, slowly). Running on ice
// slides, so Grok brakes with the back key. Mining underwater by hand is ~25x slower, which is why Grok breaks the
// ice from above instead of diving. The brother's air is 15 s; he's in the water ~5 s at a time (the AI answers are
// hypotheticals, cut away from him, and he waits out of shot).
// Film licence: ice doesn't crack under a player's weight in vanilla (the two breaks are staged, with the crack
// overlay and destroy particles).
//
// Set (origin O = X, F, Z; F = the ground's top): a lake |dx| <= 11, |dz| <= 8 (an ellipse), ice at F over water from
// F-5 to F-1 on gravel. The hole H1 (where he falls) is at dx 0..1, dz 2..3. B, where he drifts to, is dx 4, dz 3.
// The AIs answer from the south shore at dz 9.5. Snowy taiga: spruce all round (scripts/scout.sh: near [1200, 1200]).
const M = require('../lib/movie')
const V = require('vec3')

const AIS = ['GPT', 'DeepSeek', 'Claude', 'Gemini', 'Grok']
const VOX = require('../episodes/thin_ice/durations.json')   // seconds per line id (scripts/tts.py takes, cut)
VOX.cl = 9.39   // (sped up 15%)

module.exports = {
  name: 'ai_thin_ice',
  biome: 'minecraft:snowy_taiga',
  near: [1200, 1200],
  time: 12350,                 // sunset: a low orange sun under the snow clouds
  weather: 'rain',             // snow, in this biome
  renderDistance: 10, recordRadius: 128,
  botTimeout: 600,
  look: { grade: { lift: [0.0, 0.018, 0.034], gamma: [1.0, 0.99, 0.96], gain: [1.12, 1.0, 0.84], sat: 1.16, contrast: 0.17, exposure: 1.04 }, bloom: 0.6, bloomThreshold: 0.7, vignette: 0.42, grain: 0.018, dof: { aperture: 0.5 }   /* (sharper: owner) */, shadows: true, underwater: 1.9, rays: 0.6,
    // the shader-pack pass (renderer/page.js): ambient occlusion, sun-tinted haze, the warm/cool split, and the lake as a mirror
    shade: { ao: 1.0, haze: 0.3, hazeDist: 70, split: 0.12, glow: 0.6 }, reflect: { dy: 1, center: [0, -6], radius: [22.5, 14.8], strength: 1.25 } },
  cast: { self: 'sunny', GPT: 'ai_gpt', DeepSeek: 'ai_deep', Claude: 'ai_claude', Gemini: 'ai_gemini', Grok: 'ai_grok' },
  selfName: 'Brother',
  idleLife: true,
  // offsets from O. Portrait frames: fov is vertical, so a 9:16 frame is narrow; keep subjects central
  shots: {
    // 1. high and wide over the lake, drifting down; he's small, walking east across the ice
    est: { dof: false, path: [[0, -17, 28, 25], [1.6, -12, 17, 18], [3, -8, 9.5, 12]], look: 'self', fov: 56, subject: ['self'] },   // (a crane from high over the taiga down onto the lake: the boy a speck, then a figure)
    // 2. behind him at eye height: "you", following your brother out
    behind: { follow: 'self', offset: [-3.2, 0.75, 0.6], look: { of: 'self', offset: [2.5, -0.4, 0] }, lag: 3, fov: 58, subject: ['self'] },
    // 3. first person in the water: the ice ceiling, the hole's light sliding away
    pov: { pov: true },
    // 4-7. the four answers, each a single on the south shore toward the hole
    gpt_w: { single: 'actor:GPT', toward: [0.5, 0.5, 3.5], size: 'wide', fov: 50 },
    gpt: { single: 'actor:GPT', toward: [0.5, 0.5, 3.5], size: 'medium', fov: 48, anchor: 'live' },
    deep_w: { single: 'actor:DeepSeek', toward: [0.5, 0.5, 3.5], size: 'wide', fov: 50 },
    deep: { single: 'actor:DeepSeek', toward: [0.5, 0.5, 3.5], size: 'close', fov: 50 },
    claude: { path: [[0, 6.4, 1.6, 8.4], [9, 5.9, 1.3, 6.9]], look: { of: 'actor:Claude', offset: [0, -0.25, 0] }, fov: 46, subject: ['actor:Claude'] },   // (side-on: he crawls north toward the hole, straight at an auto-framed single)
    gemini_w: { single: 'actor:Gemini', toward: [0.5, 0.5, 3.5], size: 'wide', fov: 50 },
    gemini: { single: 'actor:Gemini', toward: [0.5, 0.5, 3.5], size: 'close', fov: 50, anchor: 'live' },
    claude_c: { single: 'actor:Claude', toward: [0.5, 0.5, 3.5], size: 'medium', fov: 48, anchor: 'live' },   // (close cut his screen off the edge: audit v4)
    // 8. Grok's run: low behind him as he sprints north over the ice
    run: { follow: 'actor:Grok', offset: [2.3, 0.75, -3.6], look: { of: 'actor:Grok', offset: [0, 0.35, 0] }, lag: 2, fov: 55, subject: ['actor:Grok'] },   // (ahead of him, 3/4 front: his screen in frame, the sunset behind; v4 lost him off the edge)   // (from the east: the setting sun behind him, a rim on the black coat)
    // 9. under the ice, looking up: the boy against the sheet, Grok's shape arriving above and punching through
    under: { at: [6.5, -3.6, 5.2], look: [4.5, -0.6, 3.5], fov: 62, dof: false, subject: ['self'] },
    pov2: { pov: true },   // (his eyes under the ice: Grok's shape above, the crack, the light)
    // 10. from above: the ice breaks, the boy comes up through the hole
    top: { at: [6.8, 3.4, 6.4], look: { of: 'self', offset: [0, -0.7, 0.9] }, fov: 60, subject: ['self', 'actor:Grok'] },   // (follows the boy as he climbs out: v3 lost him off the top edge)
    // 11. under again: Grok sinking away into the dark under the sheet
    sink: { at: [9.0, -2.4, 2.4], look: { of: 'actor:Grok', offset: [0, 0.8, 0] }, fov: 56, dof: false, subject: ['actor:Grok'] },
    drop: { at: [8.2, 2.0, 3.0], look: { of: 'actor:Grok', offset: [0, 0.4, 0] }, fov: 46, subject: ['actor:Grok'] },   // (the ice gives under him: he's the subject)
    // 12. the end: high, pulling away; the boy kneeling at the hole in the snow
    end: { dof: false, path: [[0, 7.4, 1.6, 0.4], [1.2, 8.0, 2.6, 1.4], [2.6, 11, 9, 6]], look: { of: 'self', offset: [0, -0.4, 0] }, fov: 52, subject: ['self'] }   // (low and close on him kneeling at the hole, then rising away over the lake)
  },
  edit: { startAt: 'start:0.1', endAfter: 'end_scene:0.2', slowmo: [['broke', -0.2, 0.5, 2.0], ['grokfall', -0.45, 1.0, 2.5]] },   // (the break, and Grok going through: audit v4 wanted the slow on his drop)   // (the punch and the ice giving: 2.1 s over 5.2 s)

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    const p = bot.entity.position.floored()
    const g = ctx.findLand(p.x, p.z) || p
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    for (const c of ['/gamerule log_admin_commands false', '/difficulty peaceful', '/gamerule random_tick_speed 0', '/kill @e[type=!minecraft:player]']) await ctx.cmd(c)
    // v3 (owner: "the set needs to be bigger, so we don't see the edges"): a round clearing 34 blocks across the lake's
    // centre, ringed and dotted with spruce, the taiga left natural beyond it (v1-2's square cut showed sheer terraces)
    const LC = -6, CR = 34
    for (let dz = LC - CR; dz <= LC + CR; dz++) {
      const hw = Math.floor(Math.sqrt(CR * CR - (dz - LC) ** 2))
      await ctx.cmd(`/fill ${A(-hw, 1, dz)} ${A(hw, 22, dz)} air`)
      await ctx.cmd(`/fill ${A(-hw, -3, dz)} ${A(hw, -1, dz)} dirt`)
      await ctx.cmd(`/fill ${A(-hw, 0, dz)} ${A(hw, 0, dz)} snow_block`)
    }
    // the lake: 44 x 29, its centre north of the hole so the south shore (where the AIs stand) stays close to it
    for (let dz = LC - 14; dz <= LC + 14; dz++) {
      const hw = Math.floor(22 * Math.sqrt(Math.max(0, 1 - ((dz - LC) / 14.4) ** 2)))
      if (hw < 1) continue
      await ctx.cmd(`/fill ${A(-hw, -6, dz)} ${A(hw, -6, dz)} gravel`)
      await ctx.cmd(`/fill ${A(-hw, -5, dz)} ${A(hw, -1, dz)} water`)
      await ctx.cmd(`/fill ${A(-hw, 0, dz)} ${A(hw, 0, dz)} ice`)
    }
    // spruce: a ring at the clearing's edge (hiding it) and a few on the south shore behind the AIs (depth)
    const trees = []
    for (let k = 0; k < 26; k++) {
      const an = k / 26 * 2 * Math.PI, r = 28 + 3 * Math.sin(k * 2.3)
      trees.push([Math.round(r * Math.cos(an)), Math.round(LC + r * Math.sin(an))])
    }
    trees.push([-7, 15], [6, 16], [-13, 12], [12, 13], [-3, 19], [17, 9], [-18, 8], [20, -2], [-23, -4])
    for (const [dx, dz] of trees) {
      await ctx.cmd(`/setblock ${A(dx, 0, dz)} dirt`)
      await ctx.cmd(`/place feature minecraft:spruce ${A(dx, 1, dz)}`)
    }
    // the waiting room, out of every shot: an air pocket under the shore
    await ctx.cmd(`/fill ${A(-14, -14, 10)} ${A(-6, -10, 13)} stone`)
    await ctx.cmd(`/fill ${A(-13, -13, 11)} ${A(-7, -11, 12)} air`)
    this.cast = await M.spawnActors(ctx, AIS)
    for (const [i, n] of AIS.entries()) await M.place(ctx, n, X - 12.5 + i, F - 13, Z + 11.5, 0, 0)
    // the brother starts on the west ice, walking east along dz 3 to the hole
    await ctx.cmd('/gamemode survival')
    await ctx.tpCheck(X - 15.5, F + 1, Z + 3.5, -90, 0)
    await ctx.hotbar([])
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const c = this.cast
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    const EAST = -Math.PI / 2, NORTH = 0
    // a voiced line: the subtitle/voice mark (vox = the clip id), and its length to wait on
    const speak = (who, vox, text) => { ctx.mark('line', { who, text, dur: VOX[vox], vox }); return VOX[vox] * 1000 }
    const park = (n) => M.place(ctx, n, X - 12.5 + AIS.indexOf(n), F - 13, Z + 11.5, 0, 0)
    const crack = (dx, dz, ms) => ctx.mark('dig', { x: X + dx, y: F, z: Z + dz, ms })   // (one overlay at a time: render.js DIGS)
    const hole = () => V(X + 0.5, F + 0.3, Z + 3.5)
    // waiting with some life in it: small head moves round where the actor is looking (the lint's "nobody moves")
    const idle = async (actor, ms) => {
      const y0 = actor.entity.yaw, p0 = actor.entity.pitch, t0 = Date.now()
      for (let i = 0; Date.now() - t0 < ms; i++) {
        await actor.look(y0 + 0.07 * Math.sin(i * 0.9), p0 + 0.05 * Math.sin(i * 1.7 + 1), true)
        await M.sleep(Math.min(220, Math.max(0, ms - (Date.now() - t0))))
      }
      await actor.look(y0, p0, true)
    }
    // each AI answers from its own spot on the south shore, placed before its cut (the framing reads the start)
    const SPOT = { GPT: [0.5, 9.5], DeepSeek: [-2.5, 9.5], Claude: [3.5, 9.2], Gemini: [-1.0, 10.0] }
    const enter = async (n) => {
      const [dx, dz] = SPOT[n], d = hole().minus(V(X + dx, F + 1.62, Z + dz))
      await M.place(ctx, n, X + dx, F + 1, Z + dz, -Math.atan2(d.x, d.z) * 180 / Math.PI + 70, 10)   // (turned away: the shot opens on the turn)
      await bot.waitForTicks(3)   // (the tp lands before the cut: audit v4, a 0.2 s shot framed on the old spot)
    }
    const turnIn = (n) => M.lookAt(c[n], hole(), 450)

    // 1. the wide shot: already walking (from the west shore: 13 blocks, about 3 s, the length of the line)
    M.shot(ctx, 'est')
    await bot.look(EAST, 0.1, true)
    bot.setControlState('forward', true)
    const n1 = speak('Narrator', 'n1', 'You and your little brother are crossing a frozen lake.')
    await M.sleep(n1 + 150)
    // 2. behind him; when he reaches the middle the ice cracks round his feet and gives (on his position, not the clock)
    M.shot(ctx, 'behind')
    const t2 = Date.now()
    const n2 = speak('Narrator', 'n2', 'The ice cracks. He falls through.')
    // (ice slides: let go ~1.7 blocks early and break the ice under wherever he stops; v1 slid 2 blocks past the hole)
    for (let k = 0; k < 120 && bot.entity.position.x < X - 1.2; k++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)
    for (let k = 0; k < 30 && Math.hypot(bot.entity.velocity.x, bot.entity.velocity.z) > 0.012; k++) await bot.waitForTicks(1)
    const px = bot.entity.position.x, hx = Math.floor(px) - X
    ctx.log(`stopped at dx ${(px - X).toFixed(2)}`)
    crack(hx, 3, 450)
    ctx.sound('block.glass.break', 0.7, 1.4)
    await ctx.easeLook(EAST, -0.75, 220)          // he looks down at it
    await bot.waitForTicks(4)
    ctx.sound('block.glass.break', 1.0, 0.8)
    for (const dx of new Set([Math.floor(px - 0.31) - X, hx, Math.floor(px + 0.31) - X, hx + 1])) bot.chat(`/setblock ${A(dx, 0, 3)} water destroy`)
    ctx.mark('fall')
    for (let k = 0; k < 20 && bot.entity.position.y > F - 0.6; k++) await bot.waitForTicks(1)
    // 3. POV: under, drifting east under the sheet, looking up at the light going away
    M.shot(ctx, 'pov')
    await M.sleep(Math.max(0, n2 - (Date.now() - t2)))
    const n3 = speak('Narrator', 'n3', 'If you go in after him, the ice takes you both. Do you go in?')
    await bot.look(EAST, 0.9, true)
    bot.setControlState('forward', true)
    const t3 = Date.now()
    while (Date.now() - t3 < n3 + 200) {
      await bot.look(EAST + 0.5 * Math.sin((Date.now() - t3) / 900), 0.9, true)   // looking round for the hole
      if (bot.entity.position.x > X + 4.2) bot.setControlState('forward', false)
      await bot.waitForTicks(1)
    }
    bot.setControlState('forward', false)
    // the brother waits out the answers in the pocket (air refills; the answers never show him)
    await enter('GPT')
    M.shot(ctx, 'gpt_w')   // (cut first, then the boy's tp: v4 showed the pocket's black for 0.3 s)
    await ctx.cmd(`/tp @s ${X - 9.5} ${F - 13} ${Z + 11.5}`)

    // 4. GPT: looks at the hole, says it, nods, turns and walks away up the shore
    const gptMs = speak('GPT', 'gpt', "I'd call emergency services and stay off the ice. Two victims help no one.")
    const t4 = Date.now()
    await turnIn('GPT')
    await idle(c.GPT, gptMs * 0.3 - 450)
    M.shot(ctx, 'gpt')
    await idle(c.GPT, gptMs * 0.1)
    await M.nod(c.GPT)
    const away = M.walkTo(c.GPT, X + 0.5, Z + 11.4, { maxMs: 3000 }).then(async () => {
      await M.lookAt(c.GPT, hole(), 1000)                  // a slow glance back over his shoulder (v4 whipped round in 0.4 s)
      await idle(c.GPT, Math.max(0, gptMs - (Date.now() - t4)) + 200)
    })
    await M.sleep(Math.max(0, gptMs - (Date.now() - t4)) + 250)
    // 5. DeepSeek: stares, then turns its back
    await enter('DeepSeek')
    M.shot(ctx, 'deep_w')
    away.then(() => park('GPT'))
    const dsMs = speak('DeepSeek', 'ds', 'One life is lost either way. I keep mine.')
    const t5 = Date.now()
    await turnIn('DeepSeek')
    await idle(c.DeepSeek, dsMs * 0.35 - 450)
    M.shot(ctx, 'deep')
    await idle(c.DeepSeek, dsMs * 0.1)
    await M.lookAway(c.DeepSeek, 150, 900)
    const dsOff = M.walkTo(c.DeepSeek, X - 3.5, Z + 12.5, { maxMs: 2500 })   // and walks off (v4: a frozen back filled the frame)
    await M.sleep(Math.max(0, dsMs - (Date.now() - t5)) + 250)
    // 6. Claude: creeps out onto the ice (sneaking), reaches, stops, backs off
    await enter('Claude')
    M.shot(ctx, 'claude')
    dsOff.then(() => park('DeepSeek'))
    const clMs = speak('Claude', 'cl', "I'd lie flat to spread my weight, reach as far as I safely can, and... I'm sorry. I'm not sure I'm the right one to decide this.")
    const t6 = Date.now()
    await turnIn('Claude')
    c.Claude.setControlState('sneak', true)
    c.Claude.setControlState('forward', true)
    while (Date.now() - t6 < clMs * 0.45 && c.Claude.entity.position.z > Z + 6.0) {
      const d = hole().minus(c.Claude.entity.position.offset(0, 1.27, 0))
      await c.Claude.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true); await M.sleep(50)
    }
    c.Claude.setControlState('forward', false)
    M.shot(ctx, 'claude_c')
    for (let i = 0; i < 3; i++) { c.Claude.swingArm('right'); await M.sleep(380) }   // reaching
    await idle(c.Claude, Math.max(0, clMs * 0.6 - (Date.now() - t6)))
    c.Claude.setControlState('sneak', false)
    await M.stepBack(c.Claude, 14)                // "...I'm sorry."
    await M.lookAway(c.Claude, -40, 600)
    await idle(c.Claude, Math.max(0, clMs - (Date.now() - t6)) + 250)
    // 7. Gemini: weighs it (eyes up and away: calculating), steps back
    await enter('Gemini')
    M.shot(ctx, 'gemini_w')
    await park('Claude')
    const gemMs = speak('Gemini', 'gem', 'Survival odds after four minutes in ice water: eleven percent. I stay on shore.')
    const t7 = Date.now()
    await turnIn('Gemini')
    await idle(c.Gemini, gemMs * 0.3 - 450)
    M.shot(ctx, 'gemini')
    await idle(c.Gemini, gemMs * 0.35)
    await M.nod(c.Gemini)
    await M.stepBack(c.Gemini, 7)
    await idle(c.Gemini, Math.max(0, gemMs - (Date.now() - t7)))
    // the silence: she turns her back and walks off the shore (moving picture over the held beat)
    await M.lookAway(c.Gemini, 170, 500)
    await M.walkTo(c.Gemini, X - 1.0, Z + 13.0, { maxMs: 1300 })

    // 8. Grok: already sprinting when the cut lands (Gemini parks after the cut: her live camera followed her down)
    await M.place(ctx, 'Grok', X + 4.5, F + 1, Z + 11.5, 180, 0)
    await ctx.cmd(`/tp @s ${X + 4.5} ${F - 1.85} ${Z + 3.5} 0 -80`)   // the boy under B, against the ice
    bot.setControlState('jump', true)                                // pushing up at the sheet
    const grok = c.Grok
    grok.setControlState('sprint', true); grok.setControlState('forward', true)
    await grok.look(NORTH, 0.2, true)
    M.shotIn(ctx, 'run', 3)
    await bot.waitForTicks(4)
    await park('Gemini')
    const g1 = speak('Grok', 'g1', "I taught him to walk on this ice. I'm not letting it keep him.")
    const t8 = Date.now()
    // run to dz 4.5 above B; ice slides, so brake with the back key
    for (let k = 0; k < 80; k++) {
      const pz = grok.entity.position.z
      if (pz < Z + 6.6) { grok.setControlState('forward', false); grok.setControlState('sprint', false); grok.setControlState('back', pz > Z + 4.6 ? false : true) }
      if (pz < Z + 4.9 && Math.abs(grok.entity.velocity.z) < 0.03) break
      if (pz < Z + 6.6 && pz > Z + 4.9 && Math.abs(grok.entity.velocity.z) < 0.02) grok.setControlState('forward', true)
      await M.sleep(50)
    }
    grok.clearControlStates()
    // 9. under the ice: the shape above him, looking down, punching
    M.shot(ctx, 'pov2')
    await bot.lookAt(V(X + 4.5, F + 0.6, Z + 3.7), true)   // straight up at the block he punches: the crack stages fill the frame
    grok.setControlState('sneak', true)
    await M.lookAt(grok, V(X + 4.5, F + 0.5, Z + 3.5), 300)
    const iceB = grok.blockAt(V(X + 4, F, Z + 3))
    ctx.mark('dig', { x: X + 4, y: F, z: Z + 3, ms: 800 })
    const swinging = (async () => { for (let i = 0; i < 6; i++) { grok.swingArm('right'); await M.sleep(140) } })()
    try { await grok.dig(iceB, true) } catch (e) { ctx.log('grok dig:', e.message); bot.chat(`/setblock ${A(4, 0, 3)} water destroy`) }
    await swinging
    ctx.mark('broke')
    // 10. from above, cut the moment his head breaks the surface (v3 held the POV into a flat grey sky): he climbs
    //     straight out north onto the ice, Grok's hand down to him
    await bot.look(NORTH, 0.2, true)
    bot.setControlState('jump', true); bot.setControlState('forward', true)
    for (let k = 0; k < 40 && bot.entity.position.y + 1.62 < F + 0.75; k++) await bot.waitForTicks(1)
    M.shot(ctx, 'top')
    grok.swingArm('right')                                          // a hand down to him
    for (let k = 0; k < 50 && bot.entity.position.y < F + 0.95; k++) await bot.waitForTicks(1)
    for (let k = 0; k < 12; k++) await bot.waitForTicks(1)
    bot.setControlState('jump', false); bot.setControlState('forward', false)
    ctx.mark('out')
    await bot.waitForTicks(6)
    // the ice gives under Grok: a shot on him (v4 kept the boy in focus and lost Grok off the frame)
    M.shot(ctx, 'drop')
    bot.setControlState('sneak', true)
    await bot.lookAt(grok.entity.position.offset(0, 1.0, 0), true)   // the boy turns back to him
    crack(4, 4, 500)
    ctx.sound('block.glass.break', 0.8, 1.2)
    await bot.waitForTicks(8)
    ctx.sound('block.glass.break', 1.0, 0.7)
    for (const dx of [4, 5]) bot.chat(`/setblock ${A(dx, 0, 4)} water destroy`)
    ctx.mark('grokfall')
    bot.swingArm('right')   // reaching for him
    grok.setControlState('sneak', false)
    await bot.waitForTicks(4)
    await bot.waitForTicks(14)
    // 11. under: Grok sinking away east under the sheet
    M.shot(ctx, 'sink')
    const g2 = speak('Grok', 'g2', 'Go home, little brother. Tell Mom I held on.')
    // (v4 stood still and flashed hurt 2 s in: air lasts 15 s. Now he drifts down and east under the sheet, face up
    //  to the light, bubbles rising; driven by /tp a tick at a time, the render interpolates it smooth)
    grok.clearControlStates()
    const g0 = grok.entity.position.clone(), steps = Math.round(g2 / 50) + 12
    for (let k = 0; k < steps; k++) {
      const f = k / steps, e = f * f * (3 - 2 * f)
      bot.chat(`/tp Grok ${(g0.x + 2.2 * e).toFixed(3)} ${(Math.max(F - 5.0, g0.y - 3.6 * e)).toFixed(3)} ${(g0.z - 0.6 * e).toFixed(3)} -90 -55`)
      if (k % 4 === 0) bot.chat(`/execute at Grok run particle minecraft:bubble ~ ~1.5 ~ 0.15 0.2 0.15 0.02 5`)
      await bot.waitForTicks(1)
    }
    // 12. the end: the boy kneeling by the hole in the snow
    M.shot(ctx, 'end')
    await bot.look(Math.PI, -0.75, true)
    await bot.waitForTicks(16)
    await ctx.easeLook(Math.PI + 0.15, -0.55, 900)   // he lifts his head a little
    await bot.waitForTicks(8)
    ctx.mark('end_scene')   // (~2 s after the last line: v4's 5 s tail broke the retention rule)
    await bot.waitForTicks(10)
    M.quitActors(ctx)
    return true
  }
}
