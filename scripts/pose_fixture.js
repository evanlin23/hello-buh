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
// --mobs: a line-up of the mobs drawn since the mob audit (bogged, parched, illusioner, glow squid, trader llama).
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
const N = Number(opt('ticks', 80))

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
const cast = [['Grandpa', 4, -1.6], ['Boy', 4.2, 0.2], ['Girl', 4, 1.8]].concat(STAGED ? [['Kid', 7, -2.6], ['Mum', 7.5, 2.6]] : [])
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
fs.writeFileSync(outPath, JSON.stringify(out))
console.log(`${path.relative(process.cwd(), outPath)}: ${N} ticks, camera at ${p0.slice(1, 4).join(' ')} yaw ${p0[4]}${STAGED ? ', staged poses + campfire' : ''}`)
