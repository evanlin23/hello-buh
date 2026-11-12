// Not a Short: the live test of the camera_world engine piece (docs/engine_features.md "Flying-mob POV, the crane, the
// Nether"; brief docs/engine_briefs/camera_world.md). On a real server:
//   - a bee narrator (stunt.self: the bee model, its 0.3 eye) hovers (R.hover('bee'): the model's own bob), then flies
//     low and fast along a curve over a meadow (R.fly, 1.5 over the ground, looking ahead), spots a far player
//     (stunt.fovZoom: the POV narrows to ~28 degrees) and flies at him;
//   - on 'tell' the camera lifts off the bee (shot.crane from: 'pov') to 90 blocks straight up, looking straight down,
//     the fov easing 28 -> 70 in the same move, and settles ('top');
//   - the meadow is a flower readability test: 7 x 7 patches of every flower kind on grass, read from that top-down
//     still (scripts/flower_readability.py ranks them).
//   ./hb record _test_camera_world && ./hb still _test_camera_world tell-0.5 tell+1 top+0.5 --size 1080x1920
const { rusher } = require('../lib/mobpov')

const DEG = Math.PI / 180
// the readability patches, west to east, north to south (7 x 7 each, 2 grass between): [block, top-down note]
const FLOWERS = [
  'dandelion', 'poppy', 'oxeye_daisy', 'lily_of_the_valley', 'cornflower',
  'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip',
  'pink_tulip', 'blue_orchid', 'torchflower', 'wildflowers[flower_amount=4]', 'pink_petals[flower_amount=4]',
  'rose_bush', 'peony', 'lilac', 'sunflower', 'podzol'
]
const COLS = 5, PATCH = 7, GAP = 2
const GRID = { x0: -22, z0: -18 }   // the grid's north-west corner (local)
function patchBox (i) {
  const c = i % COLS, r = Math.floor(i / COLS)
  const x0 = GRID.x0 + c * (PATCH + GAP), z0 = GRID.z0 + r * (PATCH + GAP)
  return { x0, z0, x1: x0 + PATCH - 1, z1: z0 + PATCH - 1 }
}
const GIANT = [0.5, 1, -31.5]   // the far player (a mannequin) the bee flies at: the story's giant at the crown

module.exports = {
  name: '_test_camera_world',
  biome: 'minecraft:plains',
  time: 3000,
  botTimeout: 400,
  hideHand: true,
  hud: false,
  recordRadius: 112,
  renderDistance: 12,   // a top-down from 90 up sees ground 90-115 blocks away: 8 chunks fogged it
  self: { model: 'bee', eye: 0.3 },
  flowers: FLOWERS.map((f, i) => ({ block: f, ...patchBox(i) })),   // (scripts/flower_readability.py reads these)
  fovZoom: [['spot', 'top', 2.8]],   // tan(35) / tan(14): the POV narrows to ~28 degrees (story S10)
  shots: {
    pov: { pov: true },
    crane: { crane: { from: 'pov', to: [0.5, 90, -6.5], yaw: 0, pitch: -90, fov: 70, secs: 2.5 } },
    tilt75: { at: [0.5, 88, 18], look: [0.5, 0, -6.5], fov: 70, push: 0, drift: 0 }   // the ~75 degree alternative
  },
  edit: { caption: 'camera_world test' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const X = g.x, Z = g.z, F = g.y
    Object.assign(this, { X, Z, F })
    const A = (x, y, z) => `${X + x} ${F + y} ${Z + z}`
    const c = (s) => ctx.cmd(s)
    await ctx.defaultRules()
    await ctx.forceload({ x0: X - 64, z0: Z - 72, x1: X + 64, z1: Z + 64 })
    // a flat meadow 81 x 86 (a test patch: the flatness is the point of the measurement)
    for (let x = -40; x <= 40; x += 8) {
      await c(`/fill ${A(x, 1, -45)} ${A(Math.min(40, x + 7), 30, 40)} air`)
      await c(`/fill ${A(x, -2, -45)} ${A(Math.min(40, x + 7), -1, 40)} dirt`)
      await c(`/fill ${A(x, 0, -45)} ${A(Math.min(40, x + 7), 0, 40)} grass_block`)
    }
    for (const [i, f] of FLOWERS.entries()) {
      const b = patchBox(i)
      if (f === 'podzol') { await c(`/fill ${A(b.x0, 0, b.z0)} ${A(b.x1, 0, b.z1)} podzol`); continue }
      const tall = /^(rose_bush|peony|lilac|sunflower)$/.test(f)
      if (tall) { await c(`/fill ${A(b.x0, 1, b.z0)} ${A(b.x1, 1, b.z1)} ${f}[half=lower]`); await c(`/fill ${A(b.x0, 2, b.z0)} ${A(b.x1, 2, b.z1)} ${f}[half=upper]`) } else await c(`/fill ${A(b.x0, 1, b.z0)} ${A(b.x1, 1, b.z1)} ${f}`)
    }
    await c(`/summon minecraft:mannequin ${A(...GIANT)} {CustomName:"giant",Rotation:[180f,0f],immovable:1b,Invulnerable:1b}`)
    await c('/kill @e[type=item]')
    await ctx.tpCheck(X + 30.5, F + 1, Z + 26.5, 135, 0)
    await bot.waitForChunksToLoad()
    await bot.waitForTicks(20)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F } = this
    const at = (x, y, z) => new Vec3(X + x, F + y, Z + z)
    const R = rusher(ctx, { maxTurn: 150 })
    await R.start(at(0, 40, 0))
    // the bee by the meadow's south-east corner, 2 up, looking north-west over the flowers
    R.cut(at(30.5, 2.2, 26.5), 45 * DEG, -6 * DEG)
    R.hover('bee')
    R.shot('pov')
    ctx.mark('go')
    await R.hold(30)                                                  // the hover bob, in place
    // fast and low (1.5 over the ground) on a curve west, then north
    await R.fly([at(18, 2, 22), at(4, 2, 16), at(-12, 2, 4), at(-14, 2, -10)], { speed: 0.55, accel: 8, decel: 0, above: 1.5, lead: 4 })
    ctx.mark('spot')                                                  // she spots him: the POV narrows (fovZoom)
    const giant = at(GIANT[0], GIANT[1] + 1.4, GIANT[2])
    await R.fly([at(-8, 2, -18), at(-2, 2, -24)], { speed: 0.45, accel: 10, decel: 0, above: 1.6, look: giant, blend: 14 })
    ctx.mark('tell'); R.shot('crane')                                 // the camera lifts off her; she flies on
    await R.fly([at(0, 2, -27.5)], { speed: 0.45, accel: 1, decel: 12, above: 1.4, look: giant })
    await R.hold(30)
    ctx.mark('top')
    await R.hold(30)
    R.shot('tilt75')
    await R.hold(20)
    return true
  }
}
