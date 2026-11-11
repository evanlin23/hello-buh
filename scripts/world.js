#!/usr/bin/env node
// The shared world's tools (docs/world/canon.md). Also ./hb world <cmd>.
//   node scripts/world.js check                      validate docs/world/map.json (+ every story stunt that uses it)
//   node scripts/world.js list                       places, stories and their days, cameos
//   node scripts/world.js where <x> <z> [--dimension the_nether]   which place holds a point, and the nearest places
//   node scripts/world.js story <name>               a story's places, day, cameos, origins (what world.build builds)
//   node scripts/world.js claim <place> --name "..." --at x,y,z --footprint x0,z0,x1,z1 --story <story> --day N
//                                                    [--kind homestead] [--region <region>] [--about "..."]
//                                                    [--dimension the_nether] (x, z then in that dimension)
//        adds a new place (and the story's entry) to map.json; refuses an overlap. Commit it before building.
//   node scripts/world.js map                        out/world/world_map.png + world_map_hub.png (needs the survey grid)
//   node scripts/world.js stunt <stunt>              is this story stunt canon-safe (no site search, no clearing)?
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const world = require('../lib/world')

const ROOT = path.join(__dirname, '..')
const args = process.argv.slice(2)
const flag = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined }
const nums = (s) => s.split(',').map(Number)

function stuntIssues (name) {
  const f = path.join(ROOT, 'stunts', name.endsWith('.js') ? name : `${name}.js`)
  if (!fs.existsSync(f)) return [`no ${path.relative(ROOT, f)}`]
  const src = fs.readFileSync(f, 'utf8')
  if (!/require\(['"]\.\.\/lib\/world['"]\)/.test(src)) return ['does not use lib/world (not in the shared world: fine for stunts, not for a story made after 2026-11-10)']
  const out = []
  for (const [re, why] of [[/sets\.(planSite|findSite|findShore)\(/, 'searches for a site: a canonical place never moves (world.origin / the map)'],
    [/clearSet\(/, 'clears a flat set: the superflat look is banned, and it wipes canonical places'],
    [/stunt\.near|near:\s*\[/, 'uses `near` + /locate: the world map already says where the place is'],
    [/\/locate /, 'uses /locate: read the place from docs/world/map.json']]) if (re.test(src)) out.push(why)
  const m = /world\.build\(ctx,\s*\{\s*story:\s*['"]([a-z0-9_]+)['"]/.exec(src)
  if (m && !world.loadMap().stories[m[1]]) out.push(`builds story "${m[1]}", which isn't in map.json stories`)
  return out
}

function main () {
  const cmd = args[0] || 'check'
  const M = world.loadMap(true)
  if (cmd === 'check') {
    const errs = world.check(M)
    for (const f of fs.readdirSync(path.join(ROOT, 'stunts')).filter(f => /^story_.*\.js$/.test(f))) {
      const src = fs.readFileSync(path.join(ROOT, 'stunts', f), 'utf8')
      if (/require\(['"]\.\.\/lib\/world['"]\)/.test(src)) for (const i of stuntIssues(f)) errs.push(`stunts/${f}: ${i}`)
    }
    console.log(errs.length ? errs.map(e => 'FAIL ' + e).join('\n') : `ok: ${Object.keys(M.places).length} places, ${Object.keys(M.stories).length} stories, ${Object.keys(M.cameos || {}).length} cameos (seed "${M.seed}")`)
    return errs.length ? 1 : 0
  }
  if (cmd === 'list') {
    console.log(`seed "${M.seed}"`)
    console.log('\nplaces:')
    for (const [k, p] of Object.entries(M.places)) console.log(`  ${k.padEnd(16)} ${p.name.padEnd(24)} at ${p.at.join(',').padEnd(16)} ${p.kind || ''}${p.within ? ' in ' + p.within : ''}${p.dimension && world.dimName(p.dimension) !== 'overworld' ? ' [' + world.dimName(p.dimension) + ']' : ''}  ${(p.stories || []).join(', ')}`)
    console.log('\nstories (world day):')
    for (const [k, s] of Object.entries(M.stories).sort((a, b) => a[1].day - b[1].day)) console.log(`  day ${String(s.day).padStart(5)}  ${k.padEnd(18)} ${s.places.join(', ').padEnd(28)} ${s.status || ''}`)
    console.log('\ncameos:')
    for (const [k, c] of Object.entries(M.cameos || {})) console.log(`  ${k.padEnd(18)} at ${c.place.padEnd(14)} ${c.what}`)
    return 0
  }
  if (cmd === 'where') {
    const x = Number(args[1]), z = Number(args[2])
    const dim = world.dimName(flag('dimension'))
    const here = world.at(x, z, dim)
    const near = Object.entries(M.places).filter(([, p]) => world.dimName(p.dimension) === dim).map(([k, p]) => [k, Math.round(Math.hypot(p.at[0] - x, p.at[2] - z))]).sort((a, b) => a[1] - b[1]).slice(0, 5)
    console.log(`(${x}, ${z})${dim !== 'overworld' ? ' in ' + dim : ''}: ${here ? 'in ' + here : 'no place'}; nearest: ${near.map(([k, d]) => `${k} ${d}`).join(', ')}`)
    return 0
  }
  if (cmd === 'story') {
    const s = world.storyOf(args[1])
    console.log(JSON.stringify({ ...s, origins: Object.fromEntries(s.places.map(p => [p, world.origin(p)])) }, null, 1))
    return 0
  }
  if (cmd === 'claim') {
    const key = args[1]
    if (!key || !/^[a-z0-9_]+$/.test(key)) { console.error('claim <place_key> (lower_snake)'); return 2 }
    if (M.places[key]) { console.error(`${key} is already in the map (${M.places[key].name}): use it, or pick another key`); return 1 }
    const at = flag('at') && nums(flag('at')), fp = flag('footprint') && nums(flag('footprint'))
    if (!at || at.length !== 3 || !fp || fp.length !== 4) { console.error('--at x,y,z and --footprint x0,z0,x1,z1 are required (read the ground y off the world map / survey grid)'); return 2 }
    const story = flag('story'), day = flag('day') !== undefined ? Number(flag('day')) : undefined
    M.places[key] = { name: flag('name') || key, kind: flag('kind') || 'place', region: flag('region') || null, at, footprint: fp, about: flag('about') || '', pieces: [], stamps: [], stories: story ? [story] : [], status: `claimed ${new Date().toISOString().slice(0, 10)}${story ? ' by ' + story : ''}` }
    if (flag('dimension') && world.dimName(flag('dimension')) !== 'overworld') M.places[key].dimension = world.dimName(flag('dimension'))
    if (story) {
      if (day === undefined) { console.error('--day N (the story\'s day on the world timeline) is required with --story'); delete M.places[key]; return 2 }
      const s = M.stories[story] || { day, places: [], cameos: [], status: 'claimed' }
      if (!s.places.includes(key)) s.places.push(key)
      M.stories[story] = s
    }
    const errs = world.check(M)
    if (errs.length) { console.error(errs.join('\n')); return 1 }
    fs.writeFileSync(world.MAP_FILE, JSON.stringify(M, null, 1) + '\n')
    console.log(`claimed ${key} at ${at.join(',')} (${fp.join(',')}) -> docs/world/map.json. Commit and push it before building; add its pieces/stamps with canonical x, y, z.`)
    return 0
  }
  if (cmd === 'map') {
    for (const v of ['view', 'hub']) {
      if (!M[v]) continue
      const r = spawnSync('python3', [path.join(ROOT, 'scripts', 'world_map.py'), '--view', v, '--out', path.join(ROOT, 'out', 'world', v === 'view' ? 'world_map.png' : `world_map_${v}.png`)], { stdio: 'inherit' })
      if (r.status) return r.status
    }
    return 0
  }
  if (cmd === 'stunt') {
    const issues = stuntIssues(args[1] || '')
    console.log(issues.length ? issues.map(i => '- ' + i).join('\n') : 'ok: canon-safe')
    return issues.length ? 1 : 0
  }
  console.error(`unknown: ${cmd}\n` + fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 12).join('\n'))
  return 2
}
process.exitCode = main()
