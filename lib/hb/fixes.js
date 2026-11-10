// Known failures -> the fix, from the 2026-11-10 run reports (docs/runs/, docs/pipeline_test_nitwit.md, the Dog on the
// Hill report on claude/story-cine-2) and session notes. Every long `./hb` step keeps its output in work/hb/logs/ and,
// when it fails, prints the matching fixes; `hb make` stores them as the stage's blockers. Add a row whenever a
// session loses time to an error whose fix it had to work out.
const FIXES = [
  // the Minecraft server and the bot
  [/Timeout waiting for \d+ ticks/, 'the known flaky setup right after the biome teleport (1 in 2-3 tries; heavy CPU work next to a recording makes it worse): run.sh retries; run again with more tries: ./hb record <stunt> --tries 8, and keep renders/Whisper off the box while it records'],
  [/server did not start/, 'the Minecraft server never printed "Done (": a stale server may hold the port or 2 GB of RAM: ./hb doctor (then --fix for a stale one); its log is work/server.log'],
  [/another run has the Minecraft server|the Minecraft server is in use/, 'one server batch at a time on this box: ./hb status says whose; wait for it (./hb make resumes where it stopped), or ./hb doctor --fix if it is stale'],
  [/stunt failed \d+ times/, 'every bot attempt failed: read the last attempt\'s error above. Usual causes: a stunt exception (node -e "require(\'./stunts/<stunt>\')"), cast parked in an unloaded chunk or in stone (crash in chunk ticking: K.park / clearSet forceloads), a busy box'],
  [/That position is not loaded/, 'a /fill before the chunks arrived: wait for them in setup (clearSet does; await ctx.forceload({ x0, z0, x1, z1 }) for your own sets), then re-record and look at a sheet: the recording still "passes"'],
  [/Exception ticking world|Chunk ticking|ticking entity/i, 'the server crashed in chunk ticking: usually mobs parked inside stone or in an unloaded chunk: park cast in the air inside the set (K.park), K.bury carves a pocket'],
  [/rec_check: blockers/, 'rec_check blockers are fixed by changing the stunt and re-recording: ./hb record <stunt> (each blocker above names the time and the cause)'],
  // git pushes (render branches, publish)
  [/render\/[\w-]+ was refused/, 'this session may only push its own prefix: the render went to <prefix>/render-<name> instead (fine; --wait/--fetch find it)'],
  [/(remote: Permission to .* denied|The requested URL returned error: 403|\[remote rejected\]|refusing to allow|denied to)/, 'the push was refused: this session may push only its own branch prefix. Render: RENDER_BRANCH=<your-prefix>/render-<name> ./hb render <stunt> (render_on_actions.sh tries <prefix>/render-<name> itself when the branch is unset). Never push main/videos by hand'],
  [/non-fast-forward|\(fetch first\)|Updates were rejected/, 'someone pushed first: git pull --rebase (in ../hb-videos for a publish) and run the step again'],
  [/Could not resolve host|unable to access 'https|Connection reset by peer|RPC failed|407 Proxy/, 'the network/proxy: curl -sS "$HTTPS_PROXY/__agentproxy/status" (and /root/.ccr/README.md), then retry'],
  // Actions renders
  [/still rendering/, 'the Actions render is not done: ./hb make <stunt> again later (it resumes at fetch), or ./hb render <stunt> --wait in the background'],
  [/result from another queue|stale result/, 'the render branch carries an older result than the job you queued: wait for the new run (./hb render <stunt> --wait), never review the old mp4'],
  [/no render branch for/, 'nothing queued for this name on origin: ./hb render <stunt> (needs work/<stunt>.rec.json)'],
  [/: failed \(https:\/\/github.com\/[^)]+\/actions\/runs\/\d+\)/, 'the Actions render failed: open the run URL above; a failed reused-frames run (--reuse) re-renders with ./hb render <stunt> --no-reuse'],
  [/uncommitted changes the Actions render would not get/, 'commit render.js / renderer / edit.py / scripts / audio.py first (Actions renders HEAD plus your working stunts/, lib/, stories/)'],
  // voices (Gemini TTS, Whisper)
  [/: 429 '|HTTP Error 429|429 Too Many|RESOURCE_EXHAUSTED|every model refused \(quota/, 'the shared Gemini TTS quota is used up (it reset at 08:00 UTC on 2026-11-10): stop here, push, and leave the story for the next run (story-make 2). Never fall back to the old sped-up narrator'],
  [/SAFETY|finishReason.*(PROHIBITED|BLOCK)/, 'the TTS model refused the text (SAFETY): gemini-3.1-flash-tts-preview does this; gemini-3.8-flash-tts worked (docs/stories.md House rules); also re-read the line for an out-of-context reading (docs/STANDARDS.md Script 6)'],
  [/gemini[\w.-]*: 50[23] /i, 'a transient Gemini error: retry once'],
  [/No module named '?(whisper|faster_whisper)'?/, 'no Whisper module: voice_check.py runs on faster-whisper or transformers too (scripts/whisper_compat.py): ~/.hb-tts/bin/pip install transformers (never openai-whisper just for this: it pulls torch)'],
  [/No module named '?transformers'?/, '~/.hb-tts/bin/pip install transformers (Whisper word times for align.py and the checks)'],
  [/No module named '?resemblyzer'?|install --no-deps resemblyzer/, '~/.hb-tts/bin/pip install --no-deps resemblyzer (the speaker check, 17 MB)'],
  [/no TTS venv|\.hb-tts\/bin\/python.*No such file/, 'set up the TTS venv once per container: docs/stories.md "Setup" (./hb doctor)'],
  [/CUT at the (start|end)/, 'a voice take is cut off (docs/STANDARDS.md Voice 5): re-cut from the raw take with padding (>= 80 ms before, >= 200 ms after, 10-20 ms fades: voice_check.py --resplit), or re-take the line'],
  // the box
  [/Unable to locate package/, 'apt-get update first (a fresh container\'s apt lists are empty)'],
  [/Cannot find module '(mineflayer|playwright|three|vec3|prismarine|minecraft-data|express)/, 'node_modules missing: npm ci (in a worktree: ln -s /home/user/hello-buh/node_modules .)'],
  [/ENOSPC|No space left on device/, 'the disk is full: delete work/*.frames, work/preview_* and work/hb/ you are done with (./hb doctor shows the free space); render on Actions, not here'],
  [/stunts\/[\w.]+\.js failed to load|\*\*\* stopping: fix the stunt/, 'the stunt module throws on require: node -e "require(\'./stunts/<stunt>\')" shows the error'],
  [/Executable doesn't exist|chromium.*not found/i, 'npx playwright install chromium'],
  [/ffmpeg: not found|ffprobe: not found/, 'apt-get update && apt-get install -y ffmpeg']
]

// every distinct fix whose pattern appears in the text, in table order
function fixesFor (text) {
  const s = String(text || '')
  const out = []
  for (const [re, fix] of FIXES) if (re.test(s) && !out.includes(fix)) out.push(fix)
  return out
}

module.exports = { FIXES, fixesFor }
