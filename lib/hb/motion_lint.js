// The motion lint (owner, 2026-11-10: "the processes should be such that the movement is [smooth] in the first place
// ... this check later on shouldn't be the main way"): a story's `perform` moves the camera, the player and the cast
// only through the story kit's primitives (lib/story.js, lib/motion.js), which move like a player by construction.
// This reads the stunt's source, before anything is recorded, and names each raw call with the primitive to use.
// A line that has to stay raw says why with a `// motion-ok: <reason>` comment on it.
// Runs in `./hb record` (before the server starts: a hit stops the recording), `./hb check` and `./hb motion <stunt>`.
const RULES = [
  { re: /\bbot\.(look|lookAt)\s*\(/, what: 'a raw bot.look / bot.lookAt', use: 'K.aimAt(p) (waits until the turn lands), K.turnTo / K.base = K.aim(p) + K.look(k) (the governor eases it)' },
  { re: /\bbot\.entity\.(yaw|pitch)\s*=(?!=)/, what: 'the view set directly (bot.entity.yaw/pitch =)', use: 'K.base = K.aim(p) or K.aimAt(p)' },
  // the actions (owner r:rffba12, 2026-11-11: places, breaks, the torch and the dye happened off-aim): every one goes
  // through lib/act.js (A.place / A.dig / A.use / A.useOn: turn at <= 220 deg/s, act only with the crosshair on it) or
  // the story kit's K.place / K.dig / K.use / K.useOn. kind 'action': an error for every stunt, not only stories
  { re: /\bbot\.dig\s*\(/, kind: 'action', what: 'a raw bot.dig (no turn onto the block, no destroyDelay)', use: 'A.dig(block) (lib/act.js) or K.dig(block)' },
  { re: /\bbot\.(placeBlock|activateBlock|_placeBlockWithOptions)\s*\(/, kind: 'action', what: 'a raw place / use (snaps onto the block)', use: 'A.place(pos) / A.use(pos) (lib/act.js), or K.place(pos, block) / K.use(pos) / K.open(pos)' },
  { re: /\bbot\.(activateEntity|activateEntityAt|useOn|attack)\s*\(/, kind: 'action', what: 'a raw use on a mob (snaps to its feet + 1, never checks the crosshair is on it)', use: 'A.useOn(entity) / A.hit(entity) (lib/act.js) or K.useOn(entity)' },
  { re: /_client\.write\s*\(\s*['"](block_place|use_item_on)['"]/, kind: 'action', what: 'a raw block_place packet (placed wherever the view is)', use: 'A.place(pos) / A.use(pos) (lib/act.js) or K.place(pos, block)' },
  { re: /_client\.write\s*\(\s*['"]block_dig['"]\s*,\s*\{\s*status\s*:\s*[0-2]\b/, kind: 'action', what: 'a raw block_dig packet (broken wherever the view is)', use: 'A.dig(block) / A.dig(block, { instant: true }) (lib/act.js) or K.dig(block)' },
  { re: /_client\.write\s*\(\s*['"]use_entity['"]/, kind: 'action', what: 'a raw use_entity packet (the mob used wherever the view is)', use: 'A.useOn(entity) / A.hit(entity) (lib/act.js) or K.useOn(entity)' },
  { re: /\bbot\.(openContainer|openChest|openBlock)\s*\(/, what: 'a raw container open (no turn onto it first)', use: 'K.open(pos) ... K.close(w) (the view holds still while it is open)' },
  // a cast member moved by the stunt itself: the client gets a raw per-tick /tp only every 3rd tick (the server's
  // tracker), so it reads as teleporting (dog_hill's beg hop), and a placement lands after the cut (docs/STANDARDS.md 3b.2)
  { re: /\/(tp|teleport)\s+@e\b/, what: 'a /tp of a cast member (a raw /tp loop reaches the client every 3rd tick: it reads as teleporting)', use: 'K.actor(tag, state) (walks to its mark at 20 Hz; jumps only on a cut: K.cutShot / K.cut), K.park(tag) / K.bury(tag), or K.warp(tag) off screen' },
  { re: /\bexecute\b[^'"`]*\brun\s+(tp|teleport)\s/, what: 'a /tp of a cast member through /execute ... run tp', use: 'K.actor(tag, state) (walks to its mark at 20 Hz; jumps only on a cut: K.cutShot / K.cut), or K.flee(tag, speed)' },
  { re: /\/data\s+(merge|modify)\s+entity\s+@e\S*\s+[^'"`]*\bPos\b/, what: 'a cast member moved with /data ... Pos', use: 'K.actor(tag, state) (walks to its mark at 20 Hz; jumps only on a cut: K.cutShot / K.cut)' },
  { re: /\bK\.tp\s*\(/, what: 'a one-tick K.tp of a cast member (a pop if it is on screen)', use: 'K.actor(tag, state) (walks to its mark; jumps only on a K.cut) or K.warp(tag) off screen' },
  { re: /\/(tp|teleport)\s+@s\b/, what: 'a raw /tp of the player', use: 'K.cut / K.cutTo (a cut the renderer snaps, arriving already aimed)' },
  { re: /-\s*S\.gap\b|-\s*\(\s*S\.gap/, what: 'a timing hack on the gap (-S.gap)', use: 'a continuous take (story.json "voice_takes": "beat") or the line\'s own gap; no negative extra' },
  { re: /\bbot\.setControlState\s*\(\s*['"](forward|back|left|right)['"]/, what: 'raw movement keys', use: 'K.walkTo(points) (path-checked, looks ahead) or K.go(on)' }
]

// A story's own line clock (2026-11-10: dog_hill timed its lines with `dur + 0.08` of its own and drifted 1.4 s off the
// voice by the payoff, outside K.line's beat clock). Only for a stunt on the story kit or a story's voice: elsewhere
// (the ai_* Shorts) a `line` mark of its own is the design. The good pattern: `await K.line('L03', (k, at, n) => ...)`.
const CLOCK_RULES = [
  { re: /\bmark\s*\(\s*['"]line['"]/, what: 'a line mark of its own (the line runs on the stunt\'s clock, not the voice\'s)', use: 'await K.line(id, scene) (marks it and runs the scene for the line\'s length on the take\'s clock)' },
  { re: /\bdur\b\s*\+\s*[\w.(]/, what: 'a line length computed from its voice dur plus a gap (its own line clock: dog_hill\'s dur + 0.08 drifted 1.4 s)', use: 'K.line(id, scene) (the scene gets k and n, the line\'s own ticks)' },
  { re: /\bwaitForTicks\s*\([^)]*\bdur\b/, what: 'a wait computed from a voice duration (its own line clock)', use: 'K.line(id, scene) (the scene runs every tick for the line\'s length)' },
  { re: /require\s*\([^)]*voice\/voice\.json/, what: 'voice.json read by the stunt (line times off the kit\'s clock)', use: 'K.line(id, scene) / storyLines(dir).line(id) (the kit reads voice.json, beats and takes included)' },
  { re: /\b(const|let|var|function)\s+(line|say1|sayLine|speak)\s*(=\s*(async\s*)?\(|\()/, what: 'a line() wrapper of its own', use: 'K.line(id, scene)' }
]
// A cut fired on the tick a word starts (`if (k === at(i)) await K.cut(...)`): K.cut/K.shot take a few ticks to land, so
// the picture changed 60-323 ms after the word (Gold take 1: 6 of 21 cuts split a word). at.cut(i) starts it early
// enough to land just before the word (lib/story.js cutTick). Checked on the condition's line, and the 2 after it when it opens a block.
const AT_CUT = {
  cond: /[=!]==?\s*at\s*\(|\bat\s*\([^)]*\)\s*[=!]==?/,
  cut: /\b(K\.)?(cut|cutTo|cutShot|shot)\s*\(/,
  what: 'a cut fired on at(i), the tick the word starts (the cut lands a few ticks later: it splits the word)',
  use: 'at.cut(i): the tick to start the cut so it lands just before the word (lib/story.js cutTick)'
}
const usesKit = (src) => /\bstoryKit\s*\(|['"`/]stories\/[\w-]+/.test(src)

// -> [{ line, col, text, what, use }] for the source's `perform` (and anything after it); setup may build freely
function lintSource (src) {
  const lines = src.split('\n')
  const rules = usesKit(src) ? [...RULES, ...CLOCK_RULES] : RULES
  let start = lines.findIndex(l => /\basync\s+perform\s*\(|\bperform\s*:\s*async|\bperform\s*\(/.test(l))
  if (start < 0) start = 0
  const out = []
  for (let i = start; i < lines.length; i++) {
    const l = lines[i]
    if (/\/\/\s*motion-ok\b/.test(l)) continue
    const code = l.replace(/\/\/.*$/, '')   // a comment that names a raw call is not one
    if (/^\s*\/\//.test(l) || !code.trim()) continue
    for (const r of rules) {
      const m = r.re.exec(code)
      if (m) out.push({ line: i + 1, col: m.index + 1, text: l.trim().slice(0, 140), what: r.what, use: r.use, ...(r.kind ? { kind: r.kind } : {}) })
    }
    const cm = AT_CUT.cond.exec(code)
    if (cm) {
      const near = /\{\s*$/.test(code) ? [code, ...lines.slice(i + 1, i + 3).map(x => x.replace(/\/\/.*$/, ''))].join('\n') : code   // a block: its first lines
      if (AT_CUT.cut.test(near.replace(/\bat\.cut\s*\(/g, ''))) out.push({ line: i + 1, col: cm.index + 1, text: l.trim().slice(0, 140), what: AT_CUT.what, use: AT_CUT.use })
    }
  }
  return out
}

function lintFile (file) { return lintSource(require('fs').readFileSync(file, 'utf8')) }

// a stunt whose payoff is a blast or a fall should end once it settles (owner r:r24d99a: which_door, villager_fired,
// pickaxe_race and sand_tower ended or cut with TNT, debris or falling sand still moving). The harness marks `settle`
// (lib/settle.js): endAfter 'settle:0.6'. -> a warning, or null (a reviewed hand-timed end says why: // settle-ok: <reason>)
const BLAST = /\bsummon\s+(minecraft:)?(tnt|tnt_minecart|end_crystal|falling_block)\b|['"`](minecraft:)?tnt(\[[^'"`]*\])?['"`]|\bfalling_block\b|\bwith\s+(minecraft:)?tnt\b/
function settleHint (src) {
  const code = src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')   // a comment that names TNT is not one
  if (!BLAST.test(code) || /settle-ok\b/.test(src)) return null
  const m = /endAfter\s*:\s*['"`]([^'"`]+)['"`]/.exec(src)
  if (m && /^settle/.test(m[1])) return null   // settle, or a stunt's own settled mark
  return { what: `a blast / fall in the stunt, and the Short ends ${m ? `on '${m[1]}'` : 'on the recording\'s end'}, not once it settles`, use: "endAfter: 'settle:0.6' (the harness's settle mark: lib/settle.js), or // settle-ok: <reason> for a reviewed end" }
}

module.exports = { lintSource, lintFile, settleHint, RULES, CLOCK_RULES, AT_CUT }
