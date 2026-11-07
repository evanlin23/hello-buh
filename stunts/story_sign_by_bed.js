// Story Short "which sign do I TRUST? 😳" (stories/sign_by_bed), the "Who do you trust?" format
// (docs/stories.md): a world rule, proof bursts, our message with a contradiction, we hide, a second
// message saying the opposite, and the question card. The Short never answers.
//
// Rule: every player finds a sign from their future self on their first night. Proof: my cousin's
// said DON'T DIG DOWN (lava under him), my friend's said SLEEP IN THE HAY (a creeper blew up her bed).
// Mine: "DON'T OPEN THE CHEST UNDER YOUR BED. -BUH". I never placed a chest. The sign stood by the
// door, right where Mom stands; she's smiling and hasn't blinked all night. I lock the door, the
// chest knocks, and a second sign is inside my locked room, in my handwriting: "OPEN IT. THAT ISN'T
// MOM. SHE'S IN THE CHEST. -BHU". It spelled my name wrong. Sign one, or sign two?
//
// THE INTENDED ANSWER (for a possible part 2; never said in this Short): trust sign 1. Villagers never
// blink, so that clue is just Minecraft. The thing in the chest wrote sign 2: it can put a sign
// through a locked door, it copied my handwriting from watching me, but it has never seen my name
// written down, so it spelled it BHU. Clues for 1: sign 2 got through a locked door; it misspells my
// name; the knocking starts the moment I lock the door. Clues for 2: sign 1 stood where only Mom
// could reach; Mom never blinks; something in the chest knocks like it wants out. Both ways: sign 2
// is in my handwriting.
//
// Real signs (text in the game font), a real bed on a real chest; each sign's text is also a card.
const path = require('path')
const { storyLines, storyKit, house, clearSet, plainsBiome, resendChunks } = require('../lib/story')

const STORY = path.join(__dirname, '..', 'stories', 'sign_by_bed')
const CAPTION = 'which sign do I TRUST? 😳'
const SIGN1 = "DON'T OPEN THE CHEST UNDER YOUR BED. -BUH"
const SIGN2 = "OPEN IT. THAT ISN'T MOM. SHE'S IN THE CHEST. -BHU"

module.exports = {
  name: 'story_sign_by_bed',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: CAPTION,
  edit: {
    caption: CAPTION, red: 'TRUST?', story: 'stories/sign_by_bed', startAt: 'line:0', endAfter: 'story_end:0',
    cards: [
      ['sign_cousin', "DON'T DIG DOWN.", 2.2, 'white'],
      ['sign_friend', 'SLEEP IN THE HAY.', 2.0, 'white'],
      ['sign_mine', SIGN1, 2.4, 'yellow'],
      ['sign_two', SIGN2, 2.6, 'red'],
      ['name_wrong', 'BUH? ...BHU?', 1.5, 'red'],
      ['question', 'WHO DO YOU TRUST? 1 OR 2? COMMENT 👇', 1.8, 'gold']
    ],
    sfx: [['scratch', 'chest_none'], ['impact', 'knock'], ['dip', 'question', 0.3]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const c = (s) => ctx.cmd(s)
    const A = (dx, dy, dz) => `${X + dx} ${F + dy} ${Z + dz}`
    await ctx.defaultRules()
    await c('/gamerule log_admin_commands false')
    await c('/difficulty normal')                      // the creeper needs it (spawn_mobs stays off)
    await clearSet(ctx, A, 64, 28)
    await plainsBiome(ctx, A, 80, -4, 30)
    await c('/kill @e[type=!player]')
    // a real sign (1.21.11: messages are literal strings); glowing text so it reads at night
    const sign = (x, z, rot, lines, glow = false) => c(`/setblock ${A(x, 1, z)} oak_sign[rotation=${rot}]{front_text:{${glow ? 'has_glowing_text:1b,' : ''}messages:[${lines.map(t => JSON.stringify(t)).join(',')}]}}`)

    // --- my cousin's sign (L01, L02): in a field, by a 1x1 hole with lava two blocks down
    await sign(-20, -20, 0, ["DON'T", 'DIG DOWN', '', '-SAM'])
    await c(`/fill ${A(-19, -3, -21)} ${A(-17, -1, -19)} stone`)
    await c(`/setblock ${A(-18, 0, -20)} air`); await c(`/setblock ${A(-18, -1, -20)} air`)
    await c(`/setblock ${A(-18, -2, -20)} lava`)
    // --- my friend's sign (L03): her bed by a hay pile in the open
    await sign(20, -20, 0, ['SLEEP IN', 'THE HAY', '', '-MIA'])
    await c(`/fill ${A(22, 1, -21)} ${A(23, 1, -21)} red_wool`)
    await c(`/fill ${A(20, 1, -24)} ${A(21, 2, -23)} hay_block`)
    // --- my room (L04-L15): a little house, door on the south wall; my bed against the north wall,
    // its head on a chest (the chest under my bed), its foot on planks
    await house(ctx, A, -3, -8, 0, -3, 'south', true, 'oak_planks')
    await c(`/setblock ${A(-1, 1, -7)} chest[facing=south]`)
    await c(`/setblock ${A(0, 1, -7)} oak_planks`)
    await c(`/setblock ${A(-1, 2, -7)} red_bed[facing=west,part=head]`)
    await c(`/setblock ${A(0, 2, -7)} red_bed[facing=west,part=foot]`)
    await c(`/setblock ${A(1, 1, -7)} crafting_table`)
    await c(`/setblock ${A(-2, 1, -7)} bookshelf`)
    await sign(1, -4, 6, ["DON'T OPEN", 'THE CHEST', 'UNDER YOUR BED', '-BUH'], true)   // sign 1: inside, by the door
    for (const [dx, dz, b] of [[-2, -2, 'poppy'], [2, -2, 'dandelion']]) await c(`/setblock ${A(dx, 1, dz)} ${b}`)

    const mob = (type, x, y, z, yaw, tag, more = '') => c(`/summon ${type} ${(X + x).toFixed(2)} ${(F + y).toFixed(2)} ${(Z + z).toFixed(2)} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Tags:["${tag}"],Rotation:[${yaw}f,0f]${more}}`)
    await mob('villager', 0.5, 1, -1.8, 180, 'mom', ',VillagerData:{profession:"minecraft:cleric",type:"minecraft:plains",level:2},Xp:1')
    await mob('creeper', 25, 1, -18, 90, 'creeper')

    await resendChunks(ctx, X, Z)
    await c('/clear @s')
    await ctx.tpCheck(X - 20, F + 1, Z - 16, 180, 0)
    await bot.waitForChunksToLoad()
    await c('/gamemode survival')
    await bot.waitForTicks(40)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot } = ctx
    const { X, Z, F } = this
    const S = storyLines(STORY)
    const K = storyKit(ctx, S, { X, Z, F })
    const { P, say, line } = K
    const ctl = (name, on) => bot.setControlState(name, on)
    const go = (on) => ctl('forward', on)
    const tp = (tag, x, y, z, yaw) => say(`/tp @e[tag=${tag},limit=1] ${(X + x).toFixed(3)} ${(F + y).toFixed(3)} ${(Z + z).toFixed(3)} ${yaw.toFixed(1)} 0`)
    let g = 0, since = 0
    const look = (k, dyaw = 0, dpitch = 0) => {
      g++; since++
      const a = Math.min(1, since / 14)
      return bot.look(K.base.yaw + dyaw + Math.sin(g / 21) * 0.08 * a, K.base.pitch + dpitch + Math.sin(g / 29 + 1) * 0.03 * a, true)
    }
    const cut = async (dx, dz, target, dy = 1) => {
      for (const c of ['forward', 'back', 'left', 'right', 'sprint']) ctl(c, false)
      since = 0
      await K.cut(dx, dz, target, dy)
    }
    const aimAt = (p) => { K.base = K.aim(p) }
    const turn = (from, p, u) => K.turnTo(from, p, Math.max(0, Math.min(1, u)))
    const MOM = P(0.5, 2.6, -1.8)
    // keep the cast warm (an idle mob's first move reaches the client late)
    let jig = 0
    const cast = () => { jig++; const j = jig % 4 < 2 ? 0.004 : -0.004; tp('creeper', creeper.x + j, 1, creeper.z, creeper.yaw) }
    const creeper = { x: 25, z: -18, yaw: 90 }

    // L01: the rule, over my cousin's sign in the field (a push in)
    await cut(-20.5, -16.6, P(-19.5, 2.2, -19.5))
    await line('L01', async (k) => { cast(); go(k > 2 && k < 14); aimAt(P(-19.5, 2.2, -19.5)); look(k) })
    // L02: his said DON'T DIG DOWN (card). Under him was lava (look down the hole)
    ctx.mark('sign_cousin')
    let from = null
    await line('L02', async (k, at) => {
      cast()
      if (k >= at(3) - 4) { from = from || { ...K.base }; turn(from, P(-17.5, -1.5, -19.5), (k - at(3) + 5) / 10) }
      look(k)
    })
    // L03: my friend's said SLEEP IN THE HAY (card). That night a creeper blew up her bed.
    creeper.x = 22.5; creeper.z = -19.0; creeper.yaw = 0
    await cut(19.5, -15.0, P(21.5, 1.5, -20.5))
    ctx.mark('sign_friend')
    await line('L03', async (k, at) => {
      cast()
      if (k === at(5)) {
        ctx.particles('explosion', P(22.6, 1.5, -20.6), { radius: 3 }); ctx.sound('entity.generic.explode', 0.8, 1)
        creeper.x = 60; creeper.z = 60
        say(`/fill ${X + 21} ${F} ${Z - 22} ${X + 24} ${F + 1} ${Z - 20} air`)
        say(`/fill ${X + 21} ${F - 1} ${Z - 22} ${X + 24} ${F - 1} ${Z - 20} coarse_dirt`)
      }
      if (k === at(4) - 4) ctx.sound('entity.creeper.primed', 0.8, 1)
      look(k, k > at(5) && k < at(5) + 8 ? Math.sin(k * 1.9) * 0.03 : 0)
    })
    // L04: tonight I found mine (night falls; my room; the sign by the door)
    await ctx.setTime(18000)
    await cut(-0.5, -6.0, P(1.5, 2.2, -4.5))
    await line('L04', async (k) => { cast(); go(k > 2 && bot.entity.position.z < Z - 5.0); aimAt(P(1.5, 2.2, -4.5)); look(k) })
    // L05: DON'T OPEN THE CHEST UNDER YOUR BED (card, yellow)
    ctx.mark('sign_mine')
    await line('L05', async (k, at) => {
      cast()
      if (k === at(1)) { from = { ...K.base } }
      if (k >= at(1)) turn(from, P(-0.5, 1.5, -6.5), (k - at(1)) / 10)   // down at the chest under the bed
      look(k)
    })
    // L06: I never placed a chest (closer, the scratch)
    await cut(-0.4, -5.3, P(-0.5, 1.4, -6.5))
    ctx.mark('chest_none')
    await line('L06', async (k) => { cast(); look(k) })
    // L07: the sign was by the door, right where Mom stands (she's there, in the doorway)
    await cut(-1.0, -5.0, P(1.5, 2.0, -4.0))
    ctx.mark('face_on', { near: [X + 0.5, Z - 1.8, 1], head: true })
    from = null
    await line('L07', async (k, at) => {
      cast()
      if (k >= at(3) - 3) { from = from || { ...K.base }; turn(from, MOM, (k - at(3) + 4) / 9) }
      look(k)
    })
    // L08: she was smiling; she hasn't blinked all night (close on her face)
    await cut(0.5, -4.4, MOM)
    await line('L08', async (k) => { cast(); look(k) })
    // L09: so I locked the door
    await line('L09', async (k, at) => {
      cast()
      if (k === at(1)) {
        say(`/setblock ${X} ${F + 2} ${Z - 3} oak_door[half=upper,facing=south,open=false]`)
        say(`/setblock ${X} ${F + 1} ${Z - 3} oak_door[half=lower,facing=south,open=false]`)
        ctx.sound('block.wooden_door.close', 1, 0.8)
      }
      look(k)
    })
    // L10: then the chest knocked (a snap turn to it)
    from = null
    await line('L10', async (k, at) => {
      cast()
      if (k === at(1) - 4) { from = { ...K.base } }
      if (k >= at(1) - 4) turn(from, P(-0.5, 1.5, -6.5), (k - at(1) + 5) / 5)
      for (const kk of [at(2), at(2) + 5, at(2) + 10]) if (k === kk) { ctx.sound('entity.zombie.attack_wooden_door', 0.5, 1.4); if (kk === at(2)) ctx.mark('knock') }
      look(k)
    })
    // L11: and a second sign was on the wall, inside my locked room
    say(`/setblock ${X - 2} ${F + 2} ${Z - 5} oak_wall_sign[facing=east]{front_text:{has_glowing_text:1b,color:"red",messages:["OPEN IT.","THAT ISN'T MOM.","SHE'S IN THE","CHEST. -BHU"]}}`)
    await cut(0.8, -5.0, P(-1.5, 2.0, -4.5))
    await line('L11', async (k) => { cast(); go(k > 4 && bot.entity.position.x > X - 0.2); look(k) })
    // L12: in my handwriting (closer)
    await cut(-0.6, -4.2, P(-1.5, 2.4, -4.5))
    await line('L12', async (k) => { cast(); look(k) })
    // L13: OPEN IT. THAT ISN'T MOM. SHE'S IN THE CHEST. (card, red)
    ctx.mark('sign_two')
    await line('L13', async (k) => { cast(); look(k, Math.sin(k / 10) * 0.04) })
    // L14: but it spelled my name wrong (BUH? BHU?) and Mom, through the door's window
    await cut(-0.6, -5.6, P(0.5, 2.5, -3))
    ctx.mark('name_wrong')
    await line('L14', async (k) => { cast(); go(k > 4 && bot.entity.position.z < Z - 4.6); aimAt(P(0.5, 2.5, -3)); look(k) })
    // L15: sign one (by the door), or sign two (on the wall)? Then the question card.
    from = null
    await line('L15', async (k, at) => {
      cast()
      if (k === at(0)) aimAt(P(1.5, 2.2, -4.5))
      if (k === at(1)) from = { ...K.base }
      if (k >= at(1)) turn(from, P(-1.5, 2.2, -4.8), (k - at(1)) / 10)
      look(k)
    })
    ctx.mark('question')
    for (let k = 0; k < 34; k++) { cast(); look(k, Math.sin(k / 8) * 0.06); await bot.waitForTicks(1) }   // the card's reading time (1.7 s), still moving
    ctx.mark('story_end')
    await bot.waitForTicks(4)
    return true
  }
}
