// TEMPLATE for a narrated story Short (docs/stories.md "Make one"). Copy it, don't run it:
//   cp stunts/_story_template.js stunts/story_<name>.js     and replace every <name>
//
// How a story stunt works
//   1. The script is stories/<name>/story.json: `lines` [{ "id": "L01", "text": "All FOURTEEN / villagers / RUN
//      from ME." }], ` / ` splits the caption chunks (2-3 words), CAPS are key words. scripts/voice.py turns it into
//      stories/<name>/voice/*.wav + voice.json: every line's spoken length and when each chunk starts.
//   2. `setup` builds EVERY scene and summons the whole cast up front (lib/story.js setKit: NoAI, silent,
//      invulnerable, tagged per scene). Per-line code only moves things, so a cut costs 1-3 ticks.
//   3. `perform` is one block per line: a cut (K.cut: a teleport that arrives already aimed), then K.line(id, scene),
//      which marks the line (edit.py lays its wav and captions on that tick) and calls scene(k, at, n) every tick for
//      exactly the line's spoken length + the story's gap. at(i) is the tick where caption chunk i starts: land
//      actions on the word ("They SLAM the door" -> the door shuts at at(1)).
//   4. The ending: the payoff, then ctx.mark('story_end'); edit.endAfter trims the Short there. The last line loops
//      into the first (house rules in docs/stories.md).
//
// What the kit already does for you (lib/story.js), so don't hand-roll it again:
//   - cuts arrive aimed, wait for the landing (position AND angle), keep the old shot swaying while they land, and
//     release the movement keys; K.cut(..., { time }) changes the time of day on the cut's own frame
//   - the camera always sways (K.look every tick), on the recording's clock, so it doesn't jump between lines
//   - mobs tagged 'warm' get an invisible nudge every tick (idle mobs' first moves reach the client ~1 s late)
//   - K.actor: a mob /tp'd every tick from a state object you edit; K.preroll: motion already going on frame 0
//   - K.knockback (hits on the bot actually push it), K.dig (vanilla dig speed), clearSet also sweeps the gravel
//     and sand a cut hillside leaves hanging over the set
// Staging rules that still are yours: nothing still for more than ~1 s, no held pauses around cuts (lines run
// back to back, the next cut comes straight after K.line returns), face_on/face_off one at a time, no block
// entities without checking a still (docs/engine_features.md: what renders, and how to add what doesn't),
// /difficulty normal before summoning monsters.
const path = require('path')
const { storyLines, storyKit, setKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', '<name>')   // stories/<name>/story.json + voice/
const CAPTION = 'every night my sheep moves one block 😳'           // the hook in the top band (also story.json "caption")

module.exports = {
  name: 'story_<name>',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  // red: the caption word drawn in red. startAt/endAfter: from the first line to the end mark.
  // Optional: deathScreen + expectDeath (a death ending), zoom/punch (push-ins on marks), story.json "meter".
  // A payoff that is a blast or a fall (TNT, falling sand, a death): endAfter: 'settle:0.5', 0.5 s after the harness's
  // settle mark, once the action is over (lib/settle.js: smoke and particles don't count, owner r:r24d99a, r:r188b46);
  // story_end must not come before it.
  edit: { caption: CAPTION, red: 'sheep', story: 'stories/<name>', startAt: 'line:0', endAfter: 'story_end:0', punchStress: true },
  hideHand: true,          // the narrator isn't Steve: no first-person arm
  // time: 18000,          // the opening time of day (night); change it later with K.cut(..., { time }) or K.setTime
  look: { mood: 'bright', rolloff: 0.8 },   // owner 2026-11-11: stories are bright and punchy (r:rd13834); rolloff 0.8 keeps the daytime sky blue with clouds (bright alone clips it cyan-white; Light Sleeper A/B 2026-11-11); 'auto' follows the time of day (renderer/looks.js, docs/look.md); a shot's mood: 'tense' for one shot

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y           // the set's origin: everything below is relative to it
    Object.assign(this, { X, Z, F })
    const { c, A, mob, vil } = setKit(ctx, { X, Z, F })
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')   // per-tick `execute as ... tp` would flood the bot with op broadcasts
    await c('/difficulty normal')                   // monsters (creepers, zombies) are refused on peaceful
    await clearSet(ctx, A, 64, 24)                  // a wide flat clearing, terraced edges, no hanging gravel
    await c('/kill @e[type=!player]')
    await plainsBiome(ctx, A, 80, -4, 28)           // one grass colour over the set

    // --- the sets: one place per scene, far enough apart that each shot only sees its own
    await house(ctx, A, 6, -3, 6, -1, 'west')       // L01-L02: my house, the door facing the pen
    await c(`/fill ${A(-6, 1, -4)} ${A(-2, 1, 4)} oak_fence hollow`)   // L01: the pen
    await c(`/fill ${A(-5, 0, -3)} ${A(-3, 0, 3)} coarse_dirt`)

    // --- the cast, all NoAI and tagged per scene ('warm' for anything that stands idle a while)
    await mob('sheep', -4.5, 1, 0.5, 90, ['sheep', 'warm'], 'Color:0b')
    await vil(1.5, 6.5, 180, 'farmer', ['farmer', 'warm'])

    await c('/clear @s')                            // the story.json "hotbar" goes on after setup (lib/harness.js), before frame 0
    await resendChunks(ctx, X, Z)                   // mineflayer ignores biome updates: get the chunks again
    await ctx.tpCheck(X + 0.5, F + 1, Z + 8.5, 180, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { X, Z, F } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, look, line, cut } = K

    // L01: the hook, over the picture it describes, moving on the first frame
    await cut(-0.5, 0.5, K.face(P(-4.5, 1, 0.5), 'sheep'))         // stand at (dx, dz), aim at the sheep's eyes (K.face; a plain point gets a 2 deg lift)
    const sheep = K.actor('sheep', { x: -4.5, z: 0.5, yaw: 90 })   // now /tp'd every tick from this object
    await K.preroll(8, () => K.step(sheep, 0.02, 0))               // already walking when the line starts
    await line('L01', async (k, at) => {
      K.step(sheep, k >= at(2) ? 0.06 : 0.02, 0)                   // it speeds up on chunk 2's word
      K.go(k > 4 && k < 20)                                        // a few steps in: no shot holds still
      look(k)
    })

    // L02: a cut to another place, at night (the light changes on the cut's own frame)
    await cut(2.5, 5.5, P(1.5, 1.6, 6.5), 1, { time: 18000 })
    let from = null
    await line('L02', async (k, at) => {
      if (k === at(1)) ctx.sound('entity.villager.no', 1, 1)
      if (k >= at(2)) { from = from || { ...K.base }; K.turnTo(from, K.face(P(-4.5, 1, sheep.z), 'sheep'), (k - at(2)) / 12) }   // an eased turn to the pen, ~0.6 s
      look(k)
    })

    // ... one block per line. Pattern: await cut(...); await line(id, (k, at, n) => { move things; look(k) })
    // Mid-line cuts (a jump cut on a word): `if (k === at(3) - 1) await cut(...)` inside the scene.

    // the ending: the payoff lands on the last word, then the end mark (edit.endAfter trims here)
    ctx.mark('story_end')
    await ctx.bot.waitForTicks(4)
    return true
  }
}
