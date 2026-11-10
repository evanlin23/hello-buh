// The motion lint (owner, 2026-11-10: "the processes should be such that the movement is [smooth] in the first place
// ... this check later on shouldn't be the main way"): a story's `perform` moves the camera, the player and the cast
// only through the story kit's primitives (lib/story.js, lib/motion.js), which move like a player by construction.
// This reads the stunt's source, before anything is recorded, and names each raw call with the primitive to use.
// A line that has to stay raw says why with a `// motion-ok: <reason>` comment on it.
// Runs in `./hb record` (before the server starts: a hit stops the recording), `./hb check` and `./hb motion <stunt>`.
const RULES = [
  { re: /\bbot\.(look|lookAt)\s*\(/, what: 'a raw bot.look / bot.lookAt', use: 'K.aimAt(p) (waits until the turn lands), K.turnTo / K.base = K.aim(p) + K.look(k) (the governor eases it)' },
  { re: /\bbot\.entity\.(yaw|pitch)\s*=(?!=)/, what: 'the view set directly (bot.entity.yaw/pitch =)', use: 'K.base = K.aim(p) or K.aimAt(p)' },
  { re: /\bbot\.dig\s*\(/, what: 'a raw bot.dig (snaps onto the block, no destroyDelay)', use: 'K.dig(block)' },
  { re: /\bbot\.(placeBlock|activateBlock)\s*\(/, what: 'a raw place / use (snaps onto the block)', use: 'K.place(pos, block) / K.open(pos)' },
  { re: /\bbot\.(openContainer|openChest|openBlock)\s*\(/, what: 'a raw container open (no turn onto it first)', use: 'K.open(pos) ... K.close(w) (the view holds still while it is open)' },
  { re: /\/(tp|teleport)\s+@e\b/, what: 'a /tp of a cast member', use: 'K.actor(tag, state) (walks to its mark; jumps only on a K.cut), K.park(tag) / K.bury(tag), or K.warp(tag) off screen' },
  { re: /\bK\.tp\s*\(/, what: 'a one-tick K.tp of a cast member (a pop if it is on screen)', use: 'K.actor(tag, state) (walks to its mark; jumps only on a K.cut) or K.warp(tag) off screen' },
  { re: /\/(tp|teleport)\s+@s\b/, what: 'a raw /tp of the player', use: 'K.cut / K.cutTo (a cut the renderer snaps, arriving already aimed)' },
  { re: /-\s*S\.gap\b|-\s*\(\s*S\.gap/, what: 'a timing hack on the gap (-S.gap)', use: 'a continuous take (story.json "voice_takes": "beat") or the line\'s own gap; no negative extra' },
  { re: /\bbot\.setControlState\s*\(\s*['"](forward|back|left|right)['"]/, what: 'raw movement keys', use: 'K.walkTo(points) (path-checked, looks ahead) or K.go(on)' }
]

// -> [{ line, col, text, what, use }] for the source's `perform` (and anything after it); setup may build freely
function lintSource (src) {
  const lines = src.split('\n')
  let start = lines.findIndex(l => /\basync\s+perform\s*\(|\bperform\s*:\s*async|\bperform\s*\(/.test(l))
  if (start < 0) start = 0
  const out = []
  for (let i = start; i < lines.length; i++) {
    const l = lines[i]
    if (/\/\/\s*motion-ok\b/.test(l)) continue
    const code = l.replace(/\/\/.*$/, '')   // a comment that names a raw call is not one
    if (/^\s*\/\//.test(l) || !code.trim()) continue
    for (const r of RULES) {
      const m = r.re.exec(code)
      if (m) out.push({ line: i + 1, col: m.index + 1, text: l.trim().slice(0, 140), what: r.what, use: r.use })
    }
  }
  return out
}

function lintFile (file) { return lintSource(require('fs').readFileSync(file, 'utf8')) }

module.exports = { lintSource, lintFile, RULES }
