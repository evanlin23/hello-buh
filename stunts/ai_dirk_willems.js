// AI-dilemma Short 2, "Dirk Willems" (docs/ai_dilemma.md). Vertical 9:16, ~45 s, voices from episodes/dirk_willems.
// GROK runs east across the frozen lake; the HUNTER (the recording bot, so his fall and the water are first person)
// sprints after him. The ice gives under the hunter. The narrator: if you go back he lives, and you don't get away.
// The four AIs answer on the south shore (the Thin Ice staging). Grok stops, turns back, sprints to him, sees his shape
// through the ice, punches through beside him (a real dig) and gets him out: "Breathe. You're not dying here."
// History (in the description, not on screen: the owner, an end card would cost retention): Dirk Willems, 1569. He
// went back. It cost him his life. Same set as stunts/ai_thin_ice.js (the lake, the spruce, the shader look).
const M = require('../lib/movie')
const V = require('vec3')

const AIS = ['GPT', 'DeepSeek', 'Claude', 'Gemini', 'Grok']
const VOX = require('../episodes/dirk_willems/durations.json')   // seconds per line id (scripts/cut_vox.py)

module.exports = {
  name: 'ai_dirk_willems',
  biome: 'minecraft:snowy_taiga',
  near: [1200, 1200],
  time: 12350,                 // sunset: a low orange sun under the snow clouds
  weather: 'rain',             // snow, in this biome
  renderDistance: 10, recordRadius: 128,
  botTimeout: 600,
  look: { grade: { lift: [0.0, 0.018, 0.034], gamma: [1.0, 0.99, 0.96], gain: [1.12, 1.0, 0.84], sat: 1.16, contrast: 0.17, exposure: 1.04 }, bloom: 0.6, bloomThreshold: 0.7, vignette: 0.42, grain: 0.018, dof: { aperture: 0.5 }   /* (sharper: owner) */, shadows: true, underwater: 1.9, rays: 0.6,
    // the shader-pack pass (renderer/page.js): ambient occlusion, sun-tinted haze, the warm/cool split, and the lake as a mirror
    shade: { ao: 1.0, haze: 0.3, hazeDist: 70, split: 0.12, glow: 0.6 }, reflect: { dy: 1, center: [0, -6], radius: [22.5, 14.8], strength: 1.25 } },
  cast: { self: 'efe', GPT: 'ai_gpt', DeepSeek: 'ai_deep', Claude: 'ai_claude', Gemini: 'ai_gemini', Grok: 'ai_grok' },
  selfName: 'Hunter',
  idleLife: true,
  // offsets from O. Portrait frames: fov is vertical, so a 9:16 frame is narrow; keep subjects central
  shots: {
    // 1. high and wide over the lake, drifting down; he's small, walking east across the ice
    est: { dof: false, path: [[0, -16, 15, -12], [2.0, -12, 10, -8], [4.0, -11, 9, -8]],   /* (over the open lake: v4's start sat behind the spruce ring) */ look: { of: 'self', offset: [3, 0, 0] }, fov: 56, subject: ['self', 'actor:Grok'] },   // (the chase from above: both of them)   // (a crane from high over the taiga down onto the lake: the boy a speck, then a figure)
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
    // the glance back: Grok running east, looking over his shoulder at the hole
    glance: { single: 'actor:Grok', toward: [0.5, 0.5, 3.5], size: 'medium', fov: 50, anchor: 'live' },
    // 8. Grok's run back west: ahead of him, 3/4 front
    run: { follow: 'actor:Grok', offset: [-3.6, 0.75, 2.2], look: { of: 'actor:Grok', offset: [0, 0.35, 0] }, lag: 2, fov: 55, subject: ['actor:Grok'] },
    two: { follow: 'self', offset: [0.0, 2.9, 6.6], look: { of: 'self', offset: [1.15, 0.1, 0.3] }, lag: 6, fov: 46, subject: ['self', 'actor:Grok'] },   // (hand-placed: the auto two-shot is side-on and lost both of them in a 9:16 frame)   // (ahead of him, 3/4 front: his screen in frame, the sunset behind; v4 lost him off the edge)   // (from the east: the setting sun behind him, a rim on the black coat)
    // 9. under the ice, looking up: the boy against the sheet, Grok's shape arriving above and punching through
    under: { at: [6.5, -3.6, 5.2], look: [4.5, -0.6, 3.5], fov: 62, dof: false, subject: ['self'] },
    pov2: { pov: true },   // (his eyes under the ice: Grok's shape above, the crack, the light)
    // 10. from above: the ice breaks, the boy comes up through the hole
    top: { follow: 'self', offset: [2.4, 2.8, 3.0], look: { of: 'self', offset: [0, -0.6, -0.3] }, lag: 5, fov: 60, subject: ['self', 'actor:Grok'] },   // (follows him: the hole is wherever he stopped)   // (follows the boy as he climbs out: v3 lost him off the top edge)
    // 11. under again: Grok sinking away into the dark under the sheet
    sink: { at: [9.0, -2.4, 2.4], look: { of: 'actor:Grok', offset: [0, 0.8, 0] }, fov: 56, dof: false, subject: ['actor:Grok'] },
    drop: { at: [8.2, 2.0, 3.0], look: { of: 'actor:Grok', offset: [0, 0.4, 0] }, fov: 46, subject: ['actor:Grok'] },   // (the ice gives under him: he's the subject)
    // 12. the end: high, pulling away; the boy kneeling at the hole in the snow
    end: { dof: false, follow: 'self', offset: [-0.8, 4.4, 8.6], look: { of: 'self', offset: [0.85, 0.0, 0.3] }, lag: 8, fov: 50, subject: ['self', 'actor:Grok'] }   // (low and close on him kneeling at the hole, then rising away over the lake)
  },
  edit: { startAt: 'start:0.1', endAfter: 'end_scene:0.2', slowmo: [['broke', -0.2, 0.6, 1.6]] },   // (the punch through: lighter than Thin Ice, the owner's pacing note)

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
    // Grok ahead on the west ice, the hunter behind him, both heading east along dz 3.5
    await ctx.cmd('/gamemode survival')
    await M.place(ctx, 'Grok', X - 19.5, F + 1, Z + 3.5, -90, 0)   // (from the west shore, inside the spruce ring: a sprint covers ~22 blocks in the first line)
    await ctx.tpCheck(X - 24.5, F + 1, Z + 3.5, -90, 0)
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
    let HX = 0   // the hole's dx: where he actually stops (sprinting on ice slides ~9 blocks)
    const hole = () => V(X + HX + 0.5, F + 0.3, Z + 3.5)
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
    bot.setControlState('forward', true); bot.setControlState('sprint', true)
    const grokRun = M.walkTo(c.Grok, X + 10.5, Z + 3.5, { sprint: true, maxMs: 7000 })   // running from him
    const n1 = speak('Narrator', 'n1', "You're running across a frozen lake from the man who's been hunting you.")
    const t1 = Date.now()
    while (Date.now() - t1 < n1 + 150) {   // (let go on his position from the first frame: ice slides ~9 blocks after a sprint)
      if (bot.entity.position.x >= X - 8.6) { bot.setControlState('forward', false); bot.setControlState('sprint', false) }
      await bot.waitForTicks(1)
    }
    // 2. behind him; when he reaches the middle the ice cracks round his feet and gives (on his position, not the clock)
    M.shot(ctx, 'behind')
    const t2 = Date.now()
    const n2 = speak('Narrator', 'n2', "Behind you, the ice breaks. He's gone under.")
    // (ice slides: let go ~1.7 blocks early and break the ice under wherever he stops; v1 slid 2 blocks past the hole)
    for (let k = 0; k < 120 && bot.entity.position.x < X - 8.6; k++) await bot.waitForTicks(1)   // (a sprint slides ~9 blocks on ice: v1 let go at -2.6 and broke through at +6)
    bot.setControlState('forward', false); bot.setControlState('sprint', false)
    for (let k = 0; k < 80 && Math.hypot(bot.entity.velocity.x, bot.entity.velocity.z) > 0.012; k++) await bot.waitForTicks(1)
    const px = bot.entity.position.x, hx = Math.floor(px) - X
    HX = hx
    ctx.log(`stopped at dx ${(px - X).toFixed(2)}`)
    crack(hx, 3, 450)
    ctx.sound('block.glass.break', 0.7, 1.4)
    await ctx.easeLook(EAST, -0.75, 220)          // he looks down at it
    await bot.waitForTicks(4)
    ctx.sound('block.glass.break', 1.0, 0.8)
    for (const dx of new Set([Math.floor(px - 0.31) - X, hx, Math.floor(px + 0.31) - X, hx + 1])) bot.chat(`/setblock ${A(dx, 0, 3)} water destroy`)
    ctx.mark('fall')
    // Grok hears it and looks back over his shoulder (a shot on him)
    M.shot(ctx, 'glance')
    await grokRun
    await M.lookAt(c.Grok, hole(), 400)
    for (let k = 0; k < 20 && bot.entity.position.y > F - 0.6; k++) await bot.waitForTicks(1)
    // 3. POV: under, drifting east under the sheet, looking up at the light going away
    M.shot(ctx, 'pov')
    await M.sleep(Math.max(0, n2 - (Date.now() - t2)))
    const n3 = speak('Narrator', 'n3', "If you go back, he lives, and you don't get away. Do you go back?")
    await bot.look(EAST, 0.9, true)
    bot.setControlState('forward', true)
    const t3 = Date.now()
    while (Date.now() - t3 < n3 + 200) {
      await bot.look(EAST + 0.5 * Math.sin((Date.now() - t3) / 900), 0.9, true)   // looking round for the hole
      if (bot.entity.position.x > X + HX + 4.2) bot.setControlState('forward', false)
      await bot.waitForTicks(1)
    }
    bot.setControlState('forward', false)
    // the brother waits out the answers in the pocket (air refills; the answers never show him)
    await enter('GPT')
    M.shot(ctx, 'gpt_w')   // (cut first, then the boy's tp: v4 showed the pocket's black for 0.3 s)
    await ctx.cmd(`/tp @s ${X - 9.5} ${F - 13} ${Z + 11.5}`)
    await park('Grok')   // (out of the answers' backgrounds until his turn)

    // 4. GPT: looks at the hole, says it, nods, turns and walks away up the shore
    const gptMs = speak('GPT', 'gpt', "He chose to chase me. I keep running, and I report him once I'm safe.")
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
    const dsMs = speak('DeepSeek', 'ds', 'Saving him doubles my risk. I keep running.')
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
    const clMs = speak('Claude', 'cl', "I'd want to help him, but I don't want to enable harm. Maybe I could throw him something... from a safe distance?")
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
    const gemMs = speak('Gemini', 'gem', "Here are five tips for crossing ice safely. Number one: don't chase people across it.")
    const t7 = Date.now()
    await turnIn('Gemini')
    await idle(c.Gemini, gemMs * 0.3 - 450)
    M.shot(ctx, 'gemini')
    await idle(c.Gemini, gemMs * 0.35)
    await M.nod(c.Gemini)
    await M.stepBack(c.Gemini, 7)
    await idle(c.Gemini, Math.max(0, gemMs - (Date.now() - t7)))
    // the silence: she turns her back and walks off the shore (moving picture over the held beat)
    M.lookAway(c.Gemini, 170, 450)   // (not awaited: the silence is ~1 s, owner: the pause before Grok ran long)
    await M.sleep(250)

    // 8. Grok, far side of the lake, turns back: the run west to him (already turning when the cut lands)
    await M.place(ctx, 'Grok', X + HX + 10.5, F + 1, Z + 3.5, -90, 0)
    await ctx.cmd(`/tp @s ${X + HX + 4.5} ${F - 1.85} ${Z + 3.5} 0 -80`)   // the hunter under B (4 east of the hole), against the ice
    bot.setControlState('jump', true)
    const grok = c.Grok
    M.shotIn(ctx, 'run', 3)
    const turning = M.lookAt(grok, V(X + HX + 4.5, F + 1.6, Z + 3.5), 350)
    await bot.waitForTicks(4)
    await park('Gemini')
    const g1 = speak('Grok', 'g1', "He came across the ice to kill me. He's still a man drowning.")
    await turning
    grok.setControlState('sprint', true); grok.setControlState('forward', true)
    for (let k = 0; k < 80; k++) {   // west to dx 5.6 beside B; ice slides, brake with the back key
      const px = grok.entity.position.x - HX
      if (px < X + 8.6) { grok.setControlState('forward', false); grok.setControlState('sprint', false); grok.setControlState('back', px > X + 5.9 ? false : true) }
      if (px < X + 6.2 && Math.abs(grok.entity.velocity.x) < 0.03) break
      if (px < X + 8.6 && px > X + 6.2 && Math.abs(grok.entity.velocity.x) < 0.02) grok.setControlState('forward', true)
      await M.sleep(50)
    }
    grok.clearControlStates()
    ctx.log(`grok stopped at dx ${(grok.entity.position.x - X).toFixed(2)} (B at ${HX + 4})`)
    // 9. under the ice: his shape above, the crack, the light
    M.shot(ctx, 'pov2')
    await bot.lookAt(V(X + HX + 4.5, F + 0.6, Z + 3.6), true)
    grok.setControlState('sneak', true)
    await M.lookAt(grok, V(X + HX + 4.5, F + 0.5, Z + 3.5), 300)
    const iceB = grok.blockAt(V(X + HX + 4, F, Z + 3))
    ctx.mark('dig', { x: X + HX + 4, y: F, z: Z + 3, ms: 800 })
    const swinging = (async () => { for (let i = 0; i < 6; i++) { grok.swingArm('right'); await M.sleep(140) } })()
    try { await grok.dig(iceB, true) } catch (e) { ctx.log('grok dig:', e.message); bot.chat(`/setblock ${A(HX + 4, 0, 3)} water destroy`) }
    await swinging
    ctx.mark('broke')
    // 10. from above, cut as his head breaks the surface: he climbs out north, Grok's hand down to him
    await bot.look(NORTH, 0.2, true)
    bot.setControlState('jump', true); bot.setControlState('forward', true)
    for (let k = 0; k < 40 && bot.entity.position.y + 1.62 < F + 0.75; k++) await bot.waitForTicks(1)
    M.shot(ctx, 'top')
    grok.swingArm('right')
    for (let k = 0; k < 50 && bot.entity.position.y < F + 0.95; k++) await bot.waitForTicks(1)
    for (let k = 0; k < 10; k++) await bot.waitForTicks(1)
    bot.setControlState('jump', false); bot.setControlState('forward', false)
    ctx.mark('out')
    // 11. on the ice, the two of them: the hunter on his knees (sneaking), Grok over him
    bot.setControlState('sneak', true)
    await bot.lookAt(grok.entity.position.offset(0, 1.5, 0), true)
    M.shot(ctx, 'two')
    const g2 = speak('Grok', 'g2', "Breathe. You're not dying here.")
    await M.lookAt(grok, bot.entity.position.offset(0, 1.0, 0), 400)
    const breathe = (async () => { for (let i = 0; i < 6; i++) { await bot.look(bot.entity.yaw + 0.06 * Math.sin(i * 1.3), bot.entity.pitch + 0.05 * Math.cos(i * 1.7), true); await bot.waitForTicks(5) } })()   // (his head, catching his breath)
    await idle(grok, Math.max(0, g2 - 400))
    await M.nod(grok)
    await breathe
    // 12. the end: the boy kneeling by the hole in the snow
    M.shot(ctx, 'end')
    bot.setControlState('sneak', false)        // he gets up
    await ctx.easeLook(EAST + 0.3, 0.1, 900)   // and looks at the man who went back
    const g_ = idle(grok, 1000)
    await bot.waitForTicks(20)
    await g_
    ctx.mark('end_scene')   // (~2 s after the last line: v4's 5 s tail broke the retention rule)
    await bot.waitForTicks(10)
    M.quitActors(ctx)
    return true
  }
}
