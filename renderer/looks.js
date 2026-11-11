// The HelloBuh grade per mood (owner, 2026-11-10: "the best color grading and visuals ... the best lighting").
// A stunt sets `look: 'auto'` (the grade follows the time of day: the default for stories), `look: 'golden_hour'`
// (one mood for every frame), a shot `mood: 'tense'` (that camera shot's grade), or `look: { mood: 'eerie_night', bloom: 0.3, grade: { exposure: 1.3 } }`
// (the mood, then any field overridden; `grade` merges field by field). A look without `mood` is used as written, so
// every existing stunt renders exactly as before. Numbers, reasons and the before/after stills: docs/look.md and
// .claude/skills/cinematic-style/SKILL.md "Standards".
//
// A mood sets only colour: exposure, contrast, saturation, temperature (lift/gamma/gain) and the vignette, plus two
// night readability aids (cloudNight, handLift). It never sets bloom, god rays, haze, depth of field or grain: those
// soften block edges (owner, 2026-11-10, on THE KEEP: "some parts with the light are a bit blurry"), and their sharp
// defaults belong to the cinematic look (renderer/page.js makePost). Sharpness is a hard rule: see the skill.
//
// Shared targets (phone viewing; scripts/look_stats.py measures them): contrast and saturation a little over neutral
// (a 6-inch screen in daylight flattens a picture), the subject 0.35-0.70 luma by day and >= 0.25 at night, the black
// point (1st percentile) >= 0.015 (crushed shadows band in YouTube's encode), < 2% clipped outside the sky.

const MOODS = {
  // a warm village day: the default for daytime stories. Neutral-warm (gain R/B 1.11, ~5500 K), clean, readable.
  village_day: {
    grade: { lift: [0.012, 0.012, 0.018], gamma: [1.0, 1.0, 1.0], gain: [1.05, 1.02, 0.95], sat: 1.06, contrast: 0.14, exposure: 1.07 },
    vignette: 0.22
  },
  // golden hour (time 12000-12600 or 23200-23600): the pilot's grade (story_good_boy) with saturation 1.14 -> 1.08
  // (vanilla is already saturated: mean HSV saturation 0.50-0.57 ungraded), gain R/B 1.27 (~3500 K)
  golden_hour: {
    grade: { lift: [0.02, 0.01, 0.018], gamma: [0.97, 1.0, 1.04], gain: [1.12, 1.02, 0.88], sat: 1.08, contrast: 0.12, exposure: 1.06 },
    vignette: 0.32
  },
  // eerie night (time 18000): moonlit blue (gain R/B 0.85), a little desaturated, lifted so faces read on a phone
  eerie_night: {
    grade: { lift: [0.015, 0.022, 0.045], gamma: [1.12, 1.14, 1.18], gain: [0.95, 1.0, 1.12], sat: 0.9, contrast: 0.14, exposure: 1.35 },
    vignette: 0.38, cloudNight: 0.42, handLift: 0.35
  },
  // tense (a threat, a chase, the beat before the twist): harder contrast, less colour, a heavier vignette, cool-neutral.
  // At night: { mood: 'eerie_night', grade: { contrast: 0.22 }, vignette: 0.48 }
  tense: {
    grade: { lift: [0.006, 0.01, 0.02], gamma: [0.98, 1.0, 1.03], gain: [1.0, 1.0, 1.03], sat: 0.88, contrast: 0.24, exposure: 1.04 },
    vignette: 0.45
  },
  // a flashback (a shot's mood: 'flashback'): warm and faded, the blacks lifted like an old photo, less colour, a soft
  // heavy vignette (gold_for_the_portal S06-S07). Lift keeps the black point well over 0.015.
  flashback: {
    grade: { lift: [0.06, 0.045, 0.028], gamma: [1.02, 1.0, 0.98], gain: [1.1, 1.0, 0.84], sat: 0.68, contrast: 0.05, exposure: 1.2 },
    vignette: 0.5
  }
}

// look 'bright' (owner, 2026-11-10, on the biggest Minecraft story channels: "very bright, exagerated movements";
// opt-in, house rule 7952f67): 'auto' by time of day (and every shot mood), then each frame's grade pushed bright and
// punchy: exposure up, saturation to ~1.3, more contrast, the white balance pulled toward a clean daylight, vignette
// <= 0.1, nights lifted further so faces read. render.js also drops depth of field and speeds up camera pushes for it.
function brighten (g) {
  const night = g.exposure >= 1.25 && g.gain && g.gain[2] > g.gain[0]
  const faded = g.sat < 0.8   // a flashback keeps its fade, only a little less
  const clean = [1.04, 1.02, 0.98]
  return {
    ...g,
    exposure: g.exposure * (night ? 1.25 : 1.15),
    sat: faded ? g.sat * 1.25 : Math.max(1.3, g.sat * 1.2),
    contrast: (g.contrast ?? 0.12) + 0.1,
    gain: g.gain ? g.gain.map((v, i) => v + (clean[i] - v) * 0.6) : clean,
    gamma: g.gamma ? g.gamma.map(v => night ? v * 1.06 : v) : g.gamma,
    vignette: Math.min(0.1, g.vignette ?? 0.1)
  }
}

// look 'auto' (or { mood: 'auto', ... }): the grade follows the time of day, frame by frame, so a story that cuts
// between day and night needs no per-scene look. Keys on the game clock (ticks, 0-24000), linear between them; a cut
// that changes the time changes the grade on its own frame, a time-lapse glides through them.
const AUTO_KEYS = [[600, 'village_day'], [11000, 'village_day'], [12000, 'golden_hour'], [12700, 'golden_hour'], [13600, 'eerie_night'],
  [22400, 'eerie_night'], [23200, 'golden_hour'], [23600, 'golden_hour'], [24600, 'village_day']]
const lerp = (a, b, u) => Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * u) : a + (b - a) * u
function moodGrade (name) { const m = MOODS[name]; return { ...m.grade, vignette: m.vignette } }
function autoGrade (dayTime) {
  let t = ((dayTime % 24000) + 24000) % 24000
  if (t < 600) t += 24000
  for (let i = 1; i < AUTO_KEYS.length; i++) {
    const [t0, a] = AUTO_KEYS[i - 1], [t1, b] = AUTO_KEYS[i]
    if (t <= t1) {
      const u = t1 > t0 ? (t - t0) / (t1 - t0) : 0, A = moodGrade(a), B = moodGrade(b), out = {}
      for (const k of Object.keys(A)) out[k] = lerp(A[k], B[k], u)
      return out
    }
  }
  return moodGrade('village_day')
}
// the grade for one frame, or null to keep the look's own: a shot's mood wins, then 'auto' by time of day
// shot: the camera shot's spec; its `grade` ({ exposure: 1.2 }) and `vignette` override the shot's mood (or the auto
// grade) for that shot only, as docs/look.md's night variant asks: { mood: 'eerie_night', grade: { contrast: 0.22 }, vignette: 0.48 }
function gradeAt (L, dayTime, shotMood, shot) {
  let g
  if (shotMood) {
    if (!MOODS[shotMood]) throw new Error(`shot mood '${shotMood}': not one of ${Object.keys(MOODS).join(', ')}`)
    g = moodGrade(shotMood)
  } else g = L && L.auto ? autoGrade(dayTime ?? 6000) : null
  if (g && shot && (shot.grade || shot.vignette != null)) g = { ...g, ...(shot.grade || {}), ...(shot.vignette != null ? { vignette: shot.vignette } : {}) }
  if (L && L.bright) g = brighten(g || moodGrade('village_day'))
  return g
}

function resolveLook (L) {
  if (!L) return L
  if (typeof L === 'string') L = { mood: L }
  if (!L.mood) return L
  if (L.mood === 'auto' || L.mood === 'bright') {
    const { mood, ...rest } = L
    const b = mood === 'bright' || rest.bright
    return { grade: { ...MOODS.village_day.grade }, vignette: b ? 0.1 : MOODS.village_day.vignette, cloudNight: 0.42, ...rest, auto: true, ...(b ? { bright: true, dof: false } : {}) }
  }
  const m = MOODS[L.mood]
  if (!m) throw new Error(`look.mood '${L.mood}': not one of ${Object.keys(MOODS).join(', ')}`)
  const { mood, ...rest } = L
  const out = { ...m, ...rest }
  if (rest.grade && typeof rest.grade === 'object') out.grade = { ...m.grade, ...rest.grade }
  return out
}

module.exports = { MOODS, resolveLook, gradeAt, autoGrade, brighten }
