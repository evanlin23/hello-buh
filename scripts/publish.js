// Package reviewed Shorts onto the `videos` branch with everything that made them:
//   shorts/<name>/short.mp4            the upload
//   shorts/<name>/metadata.json        title, description, hashtags, song credit + drop, video
//                                      specs + sha256, recording summary, code commit, edit args
//   shorts/<name>/recording.json.gz    the bot recording (with the code commit this re-renders the
//                                      exact video: node render.js / audio.py / edit.py)
//   shorts/<name>/game_audio.flac      the game sound mix (before the song)
//   shorts/<name>/source/*.js          the stunt module(s) as they were
//   shorts/<name>/build.log            bot + render + edit log
// and regenerates the branch README index. The song file itself is not stored (owner-supplied,
// in songs/); metadata names it and its sha256.
// usage: node scripts/publish.js <name> [<name>...] [--pass] [--notes "text"] [--no-push]
//   --pass: the Short passed the frame review (docs/qa.md); without it the package is pending-qa
//   and the uploader skips it
//   (the videos branch must be checked out as a worktree at ../hb-videos)
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const VID = path.resolve(ROOT, '..', 'hb-videos')
const SONGS = {
  'misery.mp3': { title: 'misery.', artist: 'pupsies' },
  'payphone.mp3': { title: 'Payphone', artist: 'Radio Top Singers' },
  'funk_abnormal.mp3': { title: 'FUNK ABNORMAL (ULTRA SLOWED)', artist: '' }
}
const HASHTAGS = ['#minecraft', '#shorts', '#minecraftmemes', '#funny']

const args = process.argv.slice(2)
const notesI = args.indexOf('--notes')
const notes = notesI >= 0 ? args.splice(notesI, 2)[1] : ''
const push = !args.includes('--no-push')
const names = args.filter(a => !a.startsWith('--'))
if (!names.length) { console.error('usage: node scripts/publish.js <name>... [--notes text] [--no-push]'); process.exit(1) }
if (!fs.existsSync(path.join(VID, '.git'))) { console.error(`no videos worktree at ${VID}: git worktree add ../hb-videos videos`); process.exit(1) }

const sh = (cmd, a, opts = {}) => execFileSync(cmd, a, { cwd: ROOT, encoding: 'utf8', ...opts }).trim()
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const quiet = (cmd, a) => { try { return execFileSync(cmd, a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch (e) { return null } }
// the code a video was made with:
// - rendered on Actions (scripts/render_on_actions.sh --fetch wrote out/<name>.render.json): the commit the run
//   rendered, on its render/<name> branch (it carries the stunt as recorded, uncommitted edits included)
// - rendered here: the last commit of the branch checked out (HEAD, not main: a branch's stunt isn't on main
//   yet, and `git show <main commit>:stunts/<name>.js` failed) from before the render; uncommitted work at
//   render time can't be seen
const head = sh('git', ['rev-parse', 'HEAD'])
const headBranch = quiet('git', ['rev-parse', '--abbrev-ref', 'HEAD']) || 'HEAD'
function codeOf (name, mp4) {
  const side = path.join(ROOT, 'out', `${name}.render.json`)
  if (fs.existsSync(side)) {
    try {
      const r = JSON.parse(fs.readFileSync(side, 'utf8'))
      if (r.commit && r.sha256 === sha256(mp4) && quiet('git', ['cat-file', '-e', `${r.commit}^{commit}`]) !== null) return { commit: r.commit, branch: r.branch, run: r.run, where: 'actions' }
      console.error(`${name}: out/${name}.render.json doesn't match out/${name}.mp4 (or its commit isn't here): using HEAD`)
    } catch (e) { console.error(`${name}: unreadable out/${name}.render.json: ${e.message}`) }
  }
  const c = quiet('git', ['log', '-1', '--format=%H', `--until=${fs.statSync(mp4).mtime.toISOString()}`, 'HEAD']) || head
  return { commit: c, branch: headBranch, where: 'local' }
}

for (const name of names) {
  const mp4 = path.join(ROOT, 'out', `${name}.mp4`)
  if (!fs.existsSync(mp4)) { console.error(`skip ${name}: no out/${name}.mp4`); continue }
  // GitHub rejects files over 100 MB (GH001): a rejected push leaves a local package commit that blocks
  // every later publish (worker 4, boat_clutch at 106 MB). edit.py caps the bitrate at 18 Mbit/s now.
  if (fs.statSync(mp4).size > 95e6) { console.error(`skip ${name}: out/${name}.mp4 is ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB (GitHub's limit is 100 MB): re-edit it (scripts/reedit.sh) to get the bitrate cap`); continue }
  const code = codeOf(name, mp4), commit = code.commit
  const dir = path.join(VID, 'shorts', name)
  fs.mkdirSync(path.join(dir, 'source'), { recursive: true })
  fs.copyFileSync(mp4, path.join(dir, 'short.mp4'))
  // the same Short with game audio only, for adding the song in the YouTube app's Shorts audio
  // picker (licensed, no Content ID claim): research/music_and_length_2026-11-06.md
  const frames = path.join(ROOT, 'work', `${name}.frames`)
  const recFile = path.join(ROOT, 'work', `${name}.rec.json`), wavFile = path.join(ROOT, 'work', `${name}.wav`)
  if (fs.existsSync(frames) && fs.existsSync(recFile) && fs.existsSync(wavFile)) {
    try {
      const a = execFileSync('node', ['scripts/edit_args.js', name], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, SONG: 'none' } }).trim().split('\n').filter(Boolean)
      execFileSync('python3', ['edit.py', '--frames', path.join(frames, 'f%05d.png'), '--fps', '60', '--out_fps', '60', '--timeline', recFile, '--audio', wavFile, ...a, '--out', path.join(dir, 'short_nosong.mp4')], { cwd: ROOT, stdio: 'ignore' })
    } catch (e) { console.error(`no-song version of ${name} failed: ${e.message}`) }
  } else {
    // rendered on Actions (scripts/render_on_actions.sh): no frames or game wav here, so add_song.py had neither
    // short_nosong.mp4 nor game_audio.flac and baked no song in. A stunt without a reference song (every story)
    // was edited song-less, so its out/<name>.mp4 already is the no-song version (voice + game audio).
    let e0 = {}
    try { e0 = require(path.join(ROOT, 'stunts', `${name}.js`)).edit || {} } catch (e) {}
    if (!e0.song || !fs.existsSync(path.join(ROOT, e0.song))) fs.copyFileSync(mp4, path.join(dir, 'short_nosong.mp4'))
    else console.error(`no-song version of ${name}: no work/${name}.frames (rendered elsewhere?) and out/ has its reference song`)
  }

  // stunt module + the local stunt/lib modules it requires
  const stuntFile = path.join(ROOT, 'stunts', `${name}.js`)
  const seen = new Set()
  const copySrc = (f) => {
    if (seen.has(f) || !fs.existsSync(f)) return
    seen.add(f)
    // the file as of the video's commit (fall back to the working copy for files added since)
    let text
    // (quiet: git's 'fatal: path ... exists on disk, but not in <commit>' is expected for a file added since)
    const atCommit = quiet('git', ['show', `${commit}:${path.relative(ROOT, f)}`])
    if (atCommit !== null) text = atCommit + '\n'
    else { text = fs.readFileSync(f, 'utf8'); console.error(`${name}: ${path.relative(ROOT, f)} is not in ${commit.slice(0, 9)}: packaged the working copy`) }
    fs.writeFileSync(path.join(dir, 'source', path.basename(f)), text)
    for (const m of text.matchAll(/require\('(\.{1,2}\/[^']+)'\)/g)) copySrc(path.resolve(path.dirname(f), m[1].endsWith('.js') ? m[1] : m[1] + '.js'))
  }
  copySrc(stuntFile)
  let stunt = {}
  try { stunt = require(stuntFile) } catch (e) {}
  const edit = stunt.edit || {}
  const editArgs = sh('node', ['scripts/edit_args.js', name]).split('\n').filter(Boolean)

  // recording + game audio
  const recF = path.join(ROOT, 'work', `${name}.rec.json`)
  let recording = null
  if (fs.existsSync(recF)) {
    const raw = fs.readFileSync(recF)
    fs.writeFileSync(path.join(dir, 'recording.json.gz'), zlib.gzipSync(raw, { level: 9 }))
    const rec = JSON.parse(raw)
    const tl = rec.timeline || []
    const marks = tl.filter(e => !['health', 'sound', 'hotbar', 'slot', 'hurt_dir', 'particles'].includes(e.event))
      .map(e => ({ t: +(e.t / 1000).toFixed(2), event: e.event, ...(e.type ? { type: e.type } : {}) }))
    const msg = tl.find(e => e.event === 'death_message')
    recording = {
      file: 'recording.json.gz', minecraft: rec.version, world: { seed: 'hellobuh', level_type: 'minecraft:normal' },
      set: rec.set, biome: stunt.biome, ticks: (rec.poses || []).length, seconds: +((rec.poses || []).length / 20).toFixed(2),
      deaths: tl.filter(e => e.event === 'death').length,
      death_message: msg ? msg.message : undefined,
      events: marks.filter(e => e.event !== 'death_message')
    }
  }
  const wav = path.join(ROOT, 'work', `${name}.wav`)
  if (fs.existsSync(wav)) sh('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, path.join(dir, 'game_audio.flac')])

  // build log, without the per-frame progress lines
  const logF = path.join(ROOT, 'work', `${name}.log`)
  let log = ''
  if (fs.existsSync(logF)) {
    log = fs.readFileSync(logF, 'utf8').split('\n').filter(l => !/^frame |PartialRead/.test(l)).join('\n')
    fs.writeFileSync(path.join(dir, 'build.log'), log)
  }
  const drop = (log.match(/song drop at ([\d.]+)s lands on ([\d.]+)s of the Short \(song starts at ([\d.]+)s\)/) || [])

  // video specs
  const probe = JSON.parse(sh('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', mp4]))
  const v = probe.streams.find(s => s.codec_type === 'video') || {}
  const songFile = edit.song ? path.basename(edit.song) : null
  const songPath = edit.song ? path.join(ROOT, edit.song) : null
  const song = songFile ? {
    file: songFile, ...(SONGS[songFile] || {}), sha256: songPath && fs.existsSync(songPath) ? sha256(songPath) : null,
    drop_on_event: edit.dropAt || null,
    ...(drop.length ? { drop_in_song_s: +drop[1], drop_in_short_s: +drop[2], song_start_s: +drop[3] } : {})
  } : null
  const caption = edit.caption || stunt.caption || name
  const credit = song && song.title ? `\n\nSong: ${song.title}${song.artist ? ' · ' + song.artist : ''}` : ''
  const prev = fs.existsSync(path.join(dir, 'metadata.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8')) : {}
  const meta = {
    name,
    caption,
    youtube: {
      title: `${caption} ${HASHTAGS.slice(0, 2).join(' ')}`.slice(0, 100),
      description: `${caption}${credit}\n\n${HASHTAGS.join(' ')}`,
      hashtags: HASHTAGS,
      made_for_kids: false
    },
    song,
    video: {
      file: 'short.mp4', duration_s: +(+probe.format.duration).toFixed(2), width: v.width, height: v.height,
      fps: v.r_frame_rate, codec: v.codec_name, bytes: +probe.format.size, sha256: sha256(mp4)
    },
    edit: { ...edit, args: editArgs },
    recording,
    code: { repo: 'evanlin23/hello-buh', branch: code.branch, commit, rendered: code.where, ...(code.run ? { run: code.run } : {}), rendered_at: fs.statSync(mp4).mtime.toISOString(), head_at_publish: head, stunt: `stunts/${name}.js`, source_snapshot: [...seen].map(f => 'source/' + path.basename(f)) },
    rebuild: [
      `git checkout ${commit.slice(0, 12)}`,
      `gunzip -c shorts/${name}/recording.json.gz > work/${name}.rec.json`,
      `node render.js work/${name}.rec.json work/${name}.frames 60 1080 1011`,
      `python3 audio.py work/${name}.rec.json work/${name}.wav`,
      `python3 edit.py --frames work/${name}.frames/f%05d.png --fps 60 --out_fps 60 --timeline work/${name}.rec.json --audio work/${name}.wav ${editArgs.map(a => /\s/.test(a) ? JSON.stringify(a) : a).join(' ')} --out out/${name}.mp4`
    ],
    // ready only after a frame review passed (docs/qa.md). A story is "held" until the OWNER okays it in person
    // (owner 2026-11-10: "none of these new stories should go out until i've OKed them"): --owner-ok marks it ready,
    // and only the lead session passes it, after the owner said so for that story by name.
    status: !args.includes('--pass') ? 'pending-qa' : (name.startsWith('story_') && !args.includes('--owner-ok') ? 'held' : 'ready'),
    notes: notes || prev.notes || '',
    published_at: new Date().toISOString()
  }
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(meta, null, 2) + '\n')
  // drop a stale top-level copy from before this layout
  const old = path.join(VID, `${name}.mp4`)
  if (fs.existsSync(old)) fs.rmSync(old)
  console.log(`packaged ${name}: ${(meta.video.bytes / 1e6).toFixed(1)} MB, ${meta.video.duration_s}s, recording ${recording ? 'yes' : 'MISSING'}`)
  // the upload gets an NCS track with its official credit, never the stunt's reference song
  // (that one stays in out/ for review only): see README "Music"
  if (!fs.existsSync(path.join(ROOT, 'songs', 'ncs')) || !fs.readdirSync(path.join(ROOT, 'songs', 'ncs')).length) execFileSync('python3', ['scripts/ncs.py', '--download'], { cwd: ROOT, stdio: 'inherit' })
  execFileSync('python3', ['scripts/add_song.py', name, '--ncs'], { cwd: ROOT, stdio: 'inherit' })
}

// README index from every package
const rows = fs.readdirSync(path.join(VID, 'shorts')).sort().map(n => {
  const f = path.join(VID, 'shorts', n, 'metadata.json')
  if (!fs.existsSync(f)) return null
  const m = JSON.parse(fs.readFileSync(f, 'utf8'))
  const s = m.song ? `${m.song.title || m.song.file}${m.song.artist ? ' · ' + m.song.artist : ''}` : '-'
  return `| [${n}](shorts/${n}/short.mp4) | ${m.caption} | ${m.video.duration_s}s | ${s} | ${m.status} | ${m.code.commit.slice(0, 7)} | ${m.notes || ''} |`
}).filter(Boolean)
fs.writeFileSync(path.join(VID, 'README.md'), `# HelloBuh Shorts (finished renders)

Reviewed Shorts from the pipeline on \`main\`, each with everything that made it. The code lives on
\`main\`; this branch only holds packages, so \`main\` stays small.

Each \`shorts/<name>/\` has: \`short.mp4\` (the upload), \`metadata.json\` (YouTube title, description,
hashtags, song credit and drop, video specs and sha256, recording summary, code commit, exact edit
arguments, rebuild steps), \`recording.json.gz\` (the bot recording: with the commit it re-renders
the same video), \`game_audio.flac\`, \`source/\` (the stunt module as it was) and \`build.log\`.
Song files are not stored (owner-supplied, \`songs/\` on main); the metadata names each one and its sha256.

Add or refresh one: \`node scripts/publish.js <name> [--notes "..."]\` from main, with this branch
checked out at \`../hb-videos\`.

| Short | Caption | Length | Song | Status | Commit | Notes |
|---|---|---|---|---|---|---|
${rows.join('\n')}
`)

if (push) {
  const g = (a) => execFileSync('git', a, { cwd: VID, encoding: 'utf8' }).trim()
  g(['add', '-A'])
  if (g(['status', '--porcelain'])) {
    g(['commit', '-q', '-m', `Package ${names.join(', ')}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_019n1tKFAZAV7uPEWDxhJzEt`])
    // other sessions publish too: rebase onto theirs and retry (README conflicts: regenerate it)
    for (let i = 0; ; i++) {
      try { g(['push', '-q', 'origin', 'videos']); break } catch (e) {
        if (i === 3) throw e
        try { g(['pull', '-q', '--rebase', 'origin', 'videos']) } catch (_) {
          g(['checkout', '--theirs', 'README.md']); g(['add', 'README.md'])
          execFileSync('git', ['-c', 'core.editor=true', 'rebase', '--continue'], { cwd: VID })
        }
      }
    }
    console.log('pushed videos branch:', g(['log', '--oneline', '-1']))
  } else console.log('nothing new to push')
}
