// Dilemma 1, "the mace and the dog" (format `dilemma`, docs/formats.md; STANDARDS r:r9dcf73). Hardcore. You step off
// your 37-block pillar with a mace in your hand, and your sitting dog is right where you'll land. A mace smash on the
// way down cancels the fall (hit the dog, live); no hit, 34 fall damage against 10 hearts (die). The fall freezes
// and plays from five angles (your face and the mace, the dog looking up, a wide of the pillar, the ground rushing up,
// your eyes with the dog in the crosshair), then real speed: you land without swinging and live on a heart and a
// half. The twist: the boots shine. Feather Falling IV.
//
// Minecraft-true (1.21, checked on the server, the log prints the health after the landing):
// - fall damage = ceil(fall distance - 3) = ceil(37 - 3) = 34 (safe_fall_distance 3, fall_damage_multiplier 1).
//   Fall damage bypasses armour, so the iron armour does nothing; only enchantment protection counts.
// - Feather Falling IV = 3 protection a level against falls = 12 (cap 20): 34 x (1 - 12/25) = 34 x 0.52 = 17.68.
//   20 - 17.68 = 2.32 health: ceil -> 3 half hearts on the HUD. Without the boots: 34 >= 20, dead (hardcore: over).
// - The mace: a smash attack (falling over 1.5 blocks) resets the attacker's fall distance (MaceItem.hurtEnemy), so
//   hitting the dog on the way down would cancel all of it. Players can hit their own tamed wolf. Not shown: we don't.
// - The dog: a tamed (Owner = the bot's UUID), sitting wolf with a red collar; it stays sitting while its owner falls
//   next to it and turns its head to the owner (LookAtPlayerGoal). It is never hit.
// Film licence: the server isn't in hardcore mode (a death would end the bot's session); the HUD draws the hardcore
// hearts (edit.hardcore) and the difficulty is hard, as hardcore locks it. Nothing in the clip plays differently.
//
// Set (origin O = X, F, Z; F = the grass's top): a cobblestone pillar at (0, 0) from F+1 to F+37, the player on top
// at the north edge. The dog sits at (0.5, -3.1), facing the pillar. Plains, noon.
const M = require('../lib/movie')
const D = require('../lib/dilemma')
const { plateau } = require('../lib/plateau')

const H = 37          // pillar height = fall distance (blocks)
const DOG = [0.5, -3.1]
// the frozen fall: beat i plays `ticks` of the recording at `factor` speed (lib/dilemma.js); ~12.6 s on screen
const BEATS = [
  { shot: 'dog', ticks: 5, factor: 0.12 },    // 2.1 s: the dog sitting below, head up at you
  { shot: 'face', ticks: 5, factor: 0.12 },   // 2.1 s: you, the mace in your hand, the pillar rushing past
  { shot: 'top', ticks: 4, factor: 0.1 },     // 2.0 s: over your shoulder, the ground and the dog coming up
  { shot: 'wide', ticks: 4, factor: 0.1 },    // 2.0 s: the whole pillar, you nearly down, the dog at its foot
  { shot: 'pov', ticks: 3, factor: 0.07 }     // up to 2.1 s: your eyes, the dog in the crosshair; ends a tick before touchdown
]
// real-speed falling before the freeze (the hook). No-op audit (r:r4607fa, r:r0f3da0): frame 0 shows the stakes, the
// dog AND the mace: the POV crash-zooms onto the dog 34 blocks below (stunt.fovZoom: the hand keeps its own camera, so
// the mace stays in hand at full size) under the first choice card; a wide POV made the dog a speck under a ring
const START_TICKS = 12

module.exports = {
  name: 'dilemma_mace',
  biome: 'minecraft:plains',
  time: 6000,
  renderDistance: 10, recordRadius: 96,
  // the opening's zoom: x13 (70 -> ~6 deg) from 0.25 s before the drop (frame 0 already ~x9, the last of the crash-zoom by 0.15 s) to the cut
  fovZoom: [['drop:-0.25', 'beat0', 13]],
  selfArmor: ['diamond_boots', 'iron_leggings', 'iron_chestplate', 'iron_helmet'],
  selfArmorGlint: [true, false, false, false],   // only the boots are enchanted (Feather Falling IV)
  shots: {
    pov: { pov: true },
    // close on the face and the mace from the side, a slow orbit toward the front (recording seconds: 0.3 s = 2.5 s)
    // (from below-front on the left: the face looking down at the camera, the mace in the right hand beyond, sky behind)
    face: { follow: 'self', offset: [-1.5, -1.5, -1.7], lag: 0, look: { of: 'self', offset: [0.15, -0.5, 0] }, fov: 54, subject: ['self'] },
    // the dog: low and close in front of it, sitting at the pillar's foot, head up at you (a slow push in)
    dog: { path: [[0, 2.2, 1.55, -1.3], [0.3, 1.9, 1.5, -1.6]], look: [0.5, 1.5, -3.1], fov: 52, subject: [[0.5, 1.45, -3.1]] },
    // wide from the side: the pillar's full height, you on its face, the dog at its foot
    // (render 1: from 16 blocks it was all sky and no dog; now far enough for the pillar's foot and the dog too)
    wide: { path: [[0, 21, 12, -14], [0.25, 20.2, 11.6, -13.4]], look: [0.5, 9, -2], fov: 62, dof: false, eyeTrace: false, subject: ['self', [0.5, 1.4, -3.1]] },
    // above and behind you, looking down past your shoulder: the ground and the dog coming up at you
    top: { follow: 'self', offset: [1.4, 2.6, 1.2], lag: 0, look: { of: 'self', offset: [0, -12, -1.6] }, fov: 64, subject: [[0.5, 1.4, -3.1]] },
    // the reveal: low on the boots as you stand up from the landing, the dog behind
    boots: { follow: 'self', offset: [-1.9, -0.85, 1.3], lag: 0, look: { of: 'self', offset: [0.2, -1.15, -0.4] }, fov: 50, subject: [{ of: 'self', offset: [0, -1.2, 0] }] }
  },
  edit: D.edit({
    beats: BEATS,
    caption: 'hit your dog 🐕 or lose hardcore?',
    red: 'hardcore',
    colors: 'dog=yellow',
    start: 'drop:0',   // (render 1 opened 0.25 s early on the pillar's top block, which hid the dog)
    // on frame 0 (the zoomed POV on the dog, the mace in hand) through the dog's beat, then on you
    // (high in the view: at the default 0.36 it covered the dog's head in both shots)
    choices: [['HIT THE DOG = LIVE', 'green', 'drop', 2.6, { y: 0.17 }], ["DON'T = HARDCORE OVER", 'red', 'beat1', 2.08, { y: 0.21, size: 112 }]],   // (beat 1's 2.08 s; high: it sat on your face; review r1: at the default size it wrapped to 3 lines under the caption band)
    openHit: 0.9,   // a hit on frame 0 with the card (pace: the whoosh alone was 7.9 dB under the peak)
    land: 'land',
    reveal: 'reveal',
    card: ['FEATHER FALLING IV', 'blue'],
    endAfter: 1.5,
    hardcore: true,
    armor: 16,   // iron helmet 2 + chestplate 6 + leggings 5 + diamond boots 3
    // the hearts crash on the landing (no-op audit: "hearts visibly dropping"): a ring on the HUD's heart row while
    // they blink down to 1.5; the reveal's camera keeps the HUD on (F5-style), so the 1.5 hearts stay in view
    extra: { ring: [['land:0.05', 0.75, 0.365, 0.885, 135]] }
  }),

  async setup (ctx) {
    const { bot } = ctx
    await ctx.defaultRules()
    // a field levelled at the terrain's high percentile with tapered edges (lib/plateau: no cut walls, no pit); the
    // first take's cleared box sat in a snowy terrace and read as a green square from the top of the pillar
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z
    const F = await plateau(ctx, { x0: X - 36, x1: X + 36, z0: Z - 40, z1: Z + 32, above: H + 10, biome: null, pct: 0.995, taper: 14, trees: 14 })
    Object.assign(this, { X, Z, F })
    for (const c of ['/gamerule log_admin_commands false', '/difficulty hard', '/gamerule fall_damage true',
      '/kill @e[type=!minecraft:player,distance=..120]']) await ctx.cmd(c)
    await ctx.cmd(`/fill ${X} ${F + 1} ${Z} ${X} ${F + H} ${Z} cobblestone`)
    // the dog: tamed (owner = us), sitting, red collar, facing the pillar (south)
    await ctx.cmd(`/summon wolf ${X + DOG[0]} ${F + 1} ${Z + DOG[1]} {PersistenceRequired:1b,Sitting:1b,Tags:["dog"],Rotation:[0f,0f],CollarColor:14b}`)
    await ctx.cmd('/execute as @s run data modify entity @e[tag=dog,limit=1] Owner set from entity @s UUID')
    await ctx.hotbar(['mace', ['cobblestone', 23], ['bread', 9], ['torch', 14]])   // (its /clear empties the armour slots too)
    // full iron, diamond boots with Feather Falling IV (nothing else enchanted)
    await ctx.cmd('/item replace entity @s armor.head with iron_helmet')
    await ctx.cmd('/item replace entity @s armor.chest with iron_chestplate')
    await ctx.cmd('/item replace entity @s armor.legs with iron_leggings')
    await ctx.cmd('/item replace entity @s armor.feet with diamond_boots[enchantments={feather_falling:4}]')
    await bot.waitForTicks(4)
    const boots = bot.inventory.slots[8]
    ctx.log('boots', boots && boots.name, JSON.stringify(boots && boots.enchants))
    if (!boots || boots.name !== 'diamond_boots') throw new Error('no boots on')
    ctx.select(0)
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    // on the pillar's north edge (its hitbox still on the block), looking down at the dog
    await ctx.tpCheck(X + 0.5, F + H + 1, Z + 0.32, 180, 80)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F } = this
    const dog = new Vec3(X + DOG[0], F + 1.35, Z + DOG[1])
    const aim = () => bot.lookAt(dog, true)
    ctx.log('health', bot.health, 'armor', bot.entity.position)
    await aim()
    await bot.waitForTicks(6)
    ctx.mark('edge')
    // a small step off the north edge (released at once: air drag carries it ~1 block out)
    bot.setControlState('forward', true)
    const y0 = bot.entity.position.y
    for (let k = 0; k < 20 && bot.entity.position.y > y0 - 0.01; k++) { await aim(); await bot.waitForTicks(1) }
    bot.setControlState('forward', false)
    ctx.mark('drop')
    for (let k = 0; k < START_TICKS; k++) { await aim(); await bot.waitForTicks(1) }
    // the eyes follow the dog until the last beat, then hold (the last metres turned the view 18 deg in 2 ticks)
    // the freeze ends about a tick before touchdown, so the landing (the hit, the hearts, the shake) plays at real speed
    const ground = F + 1
    const until = () => bot.entity.position.y + 1.2 * bot.entity.velocity.y <= ground   // (about a tick out)
    await D.runBeats(ctx, BEATS, (i) => { if (i < BEATS.length - 1) aim() }, { until })
    // real speed again: the landing
    let landed = false
    for (let k = 0; k < 60 && !landed; k++) {
      if (bot.entity.onGround) landed = true
      else await bot.waitForTicks(1)
    }
    ctx.mark('land', { above: +(bot.entity.position.y - (F + 1)).toFixed(2) })
    ctx.log('landed at', bot.entity.position, 'dog at', dog)
    await bot.waitForTicks(15)   // the hearts drop on the HUD (ringed in the edit)
    ctx.log('health after the fall', bot.health)
    ctx.mark('reveal')
    M.shot(ctx, 'boots')
    ctx.mark('f1_off'); ctx._f1 = false   // the HUD stays on over the twist: the 1.5 hearts next to the shining boots
    await ctx.easeLookAt(dog, 600)
    await bot.waitForTicks(30)
    return !ctx.died && bot.health > 0 && bot.health < 10   // (alive and hurt; saturation regen can add a heart or two by now)
  }
}
