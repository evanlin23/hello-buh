#!/usr/bin/env node
// A tiny test recording for the actor poses and effects, made without the Minecraft server: a short static shot
// cut from a published recording, with player actors, a warden and a campfire written in front of the camera.
// Used to check the renderer (docs/agent_guide.md "Engine: poses and effects"):
//
//   node scripts/pose_fixture.js                       # work/_poses_test.rec.json: actors standing, nothing staged
//   node scripts/pose_fixture.js --staged              # + sit, drink, off-hand, warden emerge, lit campfire
//   ./hb still _poses_test tick:5 tick:40 --out /tmp/x # render it (stunts/_poses_test.js reads it)
//
// --life (with --stunt _life_test): villagers asleep / shaking their heads, a line spoken (heads turn), a look_at mark.
// --armor: armour on mobs (piglin, zombie, skeleton), armour trims, a converting (shaking) piglin.
// --mobs: a line-up of the mobs drawn since the mob audit (bogged, parched, illusioner, glow squid, trader llama).
// --skins: the original skins (scripts/make_story_skins.py) in a line-up, no other actors (stunt _test_skins): ticks
//   0-19 all ten facing the camera, 20-39 all ten turned 3/4; 40-79 the first five closer (facing, then 3/4), 80-119 the
//   other five; 120-139 the neighbour plain, the neighbour in diamond without a helmet, the barter player in iron and
//   gold boots (the faces must match with and without armour); 140-159 the skins already taken (the jar's nine and
//   hellobuh), framed as ticks 0-19, to compare. Batch 4 (skins-2): 160-179 the five new ones facing (sorry_aunt,
//   statue_dad, statue_mom, _1, _2), 180-199 at 3/4, 200-219 from behind (the ponytail streaks, S11); 220-239 the
//   aunt's size at entity scale 0.3 (no player scale in the renderer yet, so she stands 1/0.3 as far as spare_boy:
//   the same size on screen); 240-259 the three Moms close (S08/S10's CU: each state must read apart).
// --stunt NAME the stunt module the recording names (default _poses_test; _light_test has a fog sea and a moon phase).
// --src PATH  the recording to cut (default: the published story_nitwit), --out PATH, --ticks N (default 80).
// Light tests (look.smoothLight): --time N (the time of day, e.g. 18000 midnight), --lights (the Girl holds a lantern,
// the Grandpa a torch), --bolt TICK (a lightning mark 10 blocks ahead at that tick), --sunset (time marks every
// tick from 12000 to 13800 over the recording: the relight steps vs the shader's smooth dusk), --whip (the camera
// pans 0.25 rad a tick over ticks 20-30: look.motionBlur).
const fs = require('fs')
const path = require('path')
const { Scene, loadRec, ROOT } = require('../lib/hb/scene')

const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d }
const STAGED = args.includes('--staged')
const src = opt('src', path.join(ROOT, '..', 'hb-videos', 'shorts', 'story_nitwit', 'recording.json.gz'))
const outPath = path.resolve(opt('out', path.join(ROOT, 'work', '_poses_test.rec.json')))
const SKINS = args.includes('--skins')
const N = Number(opt('ticks', SKINS ? 260 : 80))

const rec = loadRec(src)
const p0 = rec.poses[0]
const sc = new Scene(rec)
// the ground under a column: the top non-air block at or below the camera's feet + 3
const ground = (x, z) => { for (let y = Math.floor(p0[2]) + 3; y > p0[2] - 12; y--) { const n = sc.blockName(x, y, z); if (n && !/air$|^short_grass$|^tall_grass$|^dandelion$|^poppy$/.test(n)) return y + 1 } return Math.floor(p0[2]) }
// the camera looks along its yaw (mineflayer: yaw 0 = north (-z), PI = south): place things ahead of it
const fx = -Math.sin(p0[4]), fz = -Math.cos(p0[4]), rx = -fz, rz = fx   // forward and right (on the ground)
const at = (ahead, right) => { const x = p0[1] + fx * ahead + rx * right, z = p0[3] + fz * ahead + rz * right; return [x, ground(x, z), z] }
const faceCam = Math.atan2(fx, fz)   // a yaw that looks back at the camera

const out = { version: rec.version, engine: 2, stunt: opt('stunt', '_poses_test'), time: Number(opt('time', 6000)), weather: 'clear', columns: rec.columns, blocks: [], entities: [], timeline: [] }
out.set = { x: Math.floor(p0[1]), y: Math.floor(p0[2]), z: Math.floor(p0[3]) }   // (CAM=dx,dy,dz,yaw,pitch is relative to it)
out.poses = Array.from({ length: N }, (_, i) => [i, ...p0.slice(1)])
const cast = SKINS ? [] : [['Grandpa', 4, -1.6], ['Boy', 4.2, 0.2], ['Girl', 4, 1.8]].concat(STAGED ? [['Kid', 7, -2.6], ['Mum', 7.5, 2.6]] : [])
cast.forEach(([user, ahead, right], k) => {
  const [x, y, z] = at(ahead, right)
  for (let t = 0; t < N; t++) out.entities.push([t, 9001 + k, 'player', +x.toFixed(3), y, +z.toFixed(3), +faceCam.toFixed(4), 0, +faceCam.toFixed(4), { user, held: user === 'Boy' ? 'potion' : user === 'Grandpa' ? 'crossbow' : null, sneak: false }])
})
const [wx, wy, wz] = at(8, -1.4)
for (let t = 0; t < N; t++) out.entities.push([t, 9100, 'warden', +wx.toFixed(3), wy, +wz.toFixed(3), +faceCam.toFixed(4), 0, +faceCam.toFixed(4), null])
if (STAGED) {
  // Grandpa sits on the ground with the crossbow, a bottle in his off hand; the Boy drinks; the warden emerges
  // the Boy drinks then eats then looks at an item; the Girl puts her hands up, waves, lies down; the Kid (in
  // diamond) points then kneels; Mum sits with her knees up, then on the floor. Off-hand items and armour too.
  const more = { 9001: { offhand: 'glass_bottle', armor: [null, null, 'leather_chestplate', 'iron_helmet'] }, 9002: { offhand: 'torch' },
    9003: { armor: ['golden_boots', null, null, null] }, 9004: { held: 'stick', armor: ['diamond_boots', 'diamond_leggings', 'diamond_chestplate', 'diamond_helmet'] }, 9005: { held: 'bread' } }
  for (const e of out.entities) if (more[e[1]]) e[9] = { ...e[9], ...more[e[1]] }
  const P = (tick, id, pose, extra = {}) => out.timeline.push({ t: tick * 50, event: 'pose', ids: [id], pose, ...extra })
  out.timeline.push({ t: 0, event: 'pose', ids: [9001], sit: true })   // the flag form
  P(5, 9002, 'drink'); P(70, 9002, 'eat'); P(110, 9002, 'look_item')
  P(20, 9003, 'hands_up'); out.timeline.push({ t: 50 * 50, event: 'pose_off', ids: [9003] }); P(60, 9003, 'wave'); P(100, 9003, 'lie')
  P(0, 9004, 'point'); P(60, 9004, 'kneel')
  P(0, 9005, 'crouch_sit'); P(90, 9005, 'sit_ground')
  out.timeline.push({ t: 0, event: 'pose', ids: [9100], emerge: true })
  const [cx, cy, cz] = at(6.5, 1)
  const md = require('minecraft-data')(rec.version)
  const camp = md.blocksByName.campfire
  // campfire states: facing x lit x signal_fire x waterlogged; lit=true, signal=false, waterlogged=false facing=north
  const Block = require('prismarine-block')(rec.version)
  let sid = null
  for (let s = camp.minStateId; s <= camp.maxStateId; s++) { const p = Block.fromStateId(s, 0).getProperties(); if (p.lit === true && p.signal_fire === false && p.waterlogged === false && p.facing === 'north') { sid = s; break } }
  out.blocks.push([0, Math.floor(cx), cy, Math.floor(cz), sid])
}
if (args.includes('--lights')) for (const e of out.entities) { if (e[1] === 9003) e[9] = { ...e[9], held: 'lantern' }; if (e[1] === 9001) e[9] = { ...e[9], held: 'torch' } }
if (opt('bolt')) { const [bx, by, bz] = at(10, -3); out.timeline.push({ t: Number(opt('bolt')) * 50, event: 'lightning', x: bx, y: by, z: bz, ticks: 6 }) }
if (args.includes('--sunset')) for (let t = 1; t < N; t++) out.timeline.push({ t: t * 50, event: 'time', time: Math.round(12000 + 1800 * t / (N - 1)) })
if (args.includes('--whip')) out.poses.forEach((p, t) => { p[4] = +(p[4] + 0.25 * Math.min(10, Math.max(0, t - 20))).toFixed(5) })   // a whip pan: 0.25 rad a tick over ticks 20-30
if (args.includes('--life')) {   // villagers: one asleep, one shaking its head, one watching; the Girl speaks over ticks 10-40, the Boy looks at the warden
  const vs = [[9200, 5.5, -3.2, {}], [9201, 2, 1.6, {}], [9202, 3, 3.2, {}]]
  for (const [id, ahead, right] of vs) { const [x, y, z] = at(ahead, right); for (let t = 0; t < N; t++) out.entities.push([t, id, 'villager', +x.toFixed(3), y, +z.toFixed(3), +(faceCam + 1.2).toFixed(4), 0, +(faceCam + 1.2).toFixed(4), { type: 2, profession: 5 }]) }
  out.timeline.push({ t: 0, event: 'pose', ids: [9201], sleep: true }, { t: 0, event: 'pose', ids: [9202], shake: true })
  out.timeline.push({ t: 10 * 50, event: 'line', who: 'Girl', text: 'Did everyone hear that? Something is under the well.', dur: 1.5 })
  out.timeline.push({ t: 5 * 50, event: 'look_at', ids: [9002], at: 9100 })
}
if (args.includes('--mobs')) {   // the mobs scripts/mob_audit.js found missing that share a model: a line-up across the street
  ;['bogged', 'parched', 'illusioner', 'glow_squid', 'trader_llama'].forEach((n, k) => { const [x, y, z] = at(3, -3.2 + k * 1.6); for (let t = 0; t < N; t++) out.entities.push([t, 9300 + k, n, +x.toFixed(3), y + (n === 'glow_squid' ? 0.5 : 0), +z.toFixed(3), +faceCam.toFixed(4), 0, +faceCam.toFixed(4), null]) })
}
if (args.includes('--armor')) {   // armour on mobs and trims: a piglin in a sentry/lapis gold helmet, shaking (converting);
  // a zombie in iron with a gold-trimmed chestplate; a skeleton in a chain helmet; the Grandpa actor in the same trimmed helmet
  const ms = [[9400, 'piglin', 3, -1.2, { armor: [null, null, null, 'golden_helmet'], trims: [null, null, null, 'sentry/lapis'] }],
    [9401, 'zombie', 4, 1.2, { armor: ['iron_boots', 'iron_leggings', 'iron_chestplate', 'iron_helmet'], trims: [null, null, 'coast/gold', null] }],
    [9402, 'skeleton', 5, 3, { armor: [null, null, null, 'chainmail_helmet'] }]]
  for (const [id, n, ahead, right, ex] of ms) { const [x, y, z] = at(ahead, right); for (let t = 0; t < N; t++) out.entities.push([t, id, n, +x.toFixed(3), y, +z.toFixed(3), +faceCam.toFixed(4), 0, +faceCam.toFixed(4), ex]) }
  for (const e of out.entities) if (e[1] === 9001) e[9] = { ...e[9], armor: [null, null, null, 'golden_helmet'], trims: [null, null, null, 'sentry/lapis'] }
  out.timeline.push({ t: 0, event: 'pose', ids: [9400], converting: true })
}
if (SKINS) {   // the line-ups (see --skins above); the actors' usernames are the skin names (stunts/_test_skins.js casts them)
  out.poses.forEach(p => { p[5] = 0 })   // a level camera (the faces at eye height)
  const NAMES = ['grandpa_gullwick', 'grandma_island', 'walk_kid', 'pulled_man', 'hall_player', 'miner_girl', 'neighbour', 'barter_player', 'spare_boy', 'spare_girl']
  const OLD = ['steve', 'alex', 'ari', 'efe', 'kai', 'makena', 'noor', 'sunny', 'zuri', 'hellobuh']   // the skins already taken
  const NEW = ['sorry_aunt', 'statue_dad', 'statue_mom', 'statue_mom_1', 'statue_mom_2']   // batch 4 (skins-2)
  out.entities = out.entities.filter(e => e[2] !== 'warden')
  const turn = 0.9   // the 3/4 view: bodies and heads turned this far from the camera (to the camera's left)
  const put = (t, id, user, ahead, right, yaw, extra = {}) => { const [x, y, z] = at(ahead, right); out.entities.push([t, id, 'player', +x.toFixed(3), y, +z.toFixed(3), +yaw.toFixed(4), 0, +yaw.toFixed(4), { user, sneak: false, ...extra }]) }
  const row = (t, names, ahead, gap, yaw, extras = []) => names.forEach((n, k) => put(t, 9500 + k, n, ahead, (k - (names.length - 1) / 2) * gap, yaw, extras[k]))
  const DIAMOND = { armor: ['diamond_boots', 'diamond_leggings', 'diamond_chestplate', null], held: 'diamond_pickaxe' }
  const BARTER = { armor: ['golden_boots', 'iron_leggings', 'iron_chestplate', null] }
  for (let t = 0; t < N; t++) {
    const yaw = faceCam + (Math.floor(t / 20) % 2 ? turn : 0)
    if (t < 40) row(t, NAMES, 9, 1.05, yaw)
    else if (t < 80) row(t, NAMES.slice(0, 5), 8, 1.05, yaw)
    else if (t < 120) row(t, NAMES.slice(5), 8, 1.05, yaw)
    else if (t < 140) row(t, ['neighbour', 'neighbour', 'barter_player'], 5.5, 1.2, faceCam + (t < 130 ? 0 : turn), [{}, DIAMOND, BARTER])
    else if (t < 160) row(t, OLD, 9, 1.05, faceCam)
    else if (t < 200) row(t, NEW, 6, 1.05, yaw)
    else if (t < 220) row(t, NEW, 6, 1.05, faceCam + Math.PI)
    else if (t < 240) { put(t, 9500, 'spare_boy', 4, -0.5, faceCam); put(t, 9501, 'sorry_aunt', 4 / 0.3, 0.6 / 0.3, faceCam) }
    else row(t, NEW.slice(2), 3.2, 0.9, faceCam)
  }
  // the second neighbour is another entity with the same username: give it its own id
  for (const e of out.entities) if (e[0] >= 120 && e[0] < 140 && e[1] === 9501) e[1] = 9511
}
if (args.includes('--mobposes')) {   // mob poses and held items (docs/engine_features.md "Mob poses"), left to right:
  // a skeleton drawing its bow on a staged mark (tick 10) and one recorded aggressive + using its bow (from tick 20); an
  // evoker standing (crossed arms only), one casting on a staged mark (ticks 10-70), one recorded casting (40-59); a sheep
  // blue turning red at 50 and one white turning blue at 30; a baby and an adult piglin admiring a gold ingot in the off
  // hand, an adult with none; an allay holding a diamond and one empty-handed
  const ms = [[9500, 'skeleton', 4, -4.2, { held: 'bow' }], [9501, 'skeleton', 4, -3.2, { held: 'bow' }], [9502, 'evoker', 4, -2, null], [9503, 'evoker', 4, -1, null],
    [9504, 'evoker', 4, 0, null], [9505, 'sheep', 4, 1.2, { color: 11 }], [9506, 'sheep', 5.2, 1.2, { color: 0 }], [9507, 'piglin', 3, 2.4, { baby: true, offhand: 'gold_ingot' }],
    [9508, 'piglin', 4, 3.2, { offhand: 'gold_ingot' }], [9509, 'piglin', 4, 4.2, null], [9510, 'allay', 2.4, -0.6, { held: 'diamond' }], [9511, 'allay', 2.4, 0.4, null]]
  for (const [id, n, ahead, right, ex] of ms) {
    const [x, y, z] = at(ahead, right)
    for (let t = 0; t < N; t++) {
      let e = ex ? { ...ex } : null
      if (id === 9501 && t >= 20) e = { ...e, aggressive: true, usingItem: true }
      if (id === 9504 && t >= 40 && t < 60) e = { ...(e || {}), spell: 3 }
      if (id === 9505 && t >= 50) e = { ...e, color: 14 }
      if (id === 9506 && t >= 30) e = { ...e, color: 11 }
      const yaw = faceCam + (n === 'evoker' || n === 'skeleton' ? Number(process.env.FIX_TURN || 0.5) : 0)
      out.entities.push([t, id, n, +x.toFixed(3), y + (n === 'allay' ? 0.3 : 0), +z.toFixed(3), +yaw.toFixed(4), n === 'skeleton' ? 0.15 : 0, +yaw.toFixed(4), e])
    }
  }
  out.timeline.push({ t: 10 * 50, event: 'pose', ids: [9500], bow: true }, { t: 10 * 50, event: 'pose', ids: [9503], spell: 'wololo' })
}
fs.writeFileSync(outPath, JSON.stringify(out))
console.log(`${path.relative(process.cwd(), outPath)}: ${N} ticks, camera at ${p0.slice(1, 4).join(' ')} yaw ${p0[4]}${STAGED ? ', staged poses + campfire' : ''}`)
