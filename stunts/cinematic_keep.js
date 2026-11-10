// THE KEEP: a cinematic re-shoot of the lapse_castle recording (docs/cinematic.md). No server, no new
// recording: scripts/cinematic.py renders each clip from that recording with its own camera (a render.js shot
// spec), its own hour (time marks) and its own look, passed in CINE_CLIP. This module only carries the shared
// look and turns CINE_CLIP into the stunt fields render.js reads (look, fogSea, renderDistance).
const clip = process.env.CINE_CLIP ? JSON.parse(process.env.CINE_CLIP) : {}

// the base look: a golden-hour grade, soft bloom, film grain, 2.39:1 bars, depth of field, sun shadows, god rays
// and the shader-pack pass (AO, warm/cool haze and light split; reflections on the moat)
const LOOK = {
  grade: 'dawn', bloom: 0.55, bloomThreshold: 0.8, vignette: 0.42, grain: 0.035, letterbox: 2.39,
  dof: { aperture: 0.35 }, shadows: { radius: 96, size: 2048, strength: 0.75 }, rays: 0.8, cloudNight: 0.32,
  shade: { ao: 0.7, haze: 0.22, hazeDist: 90, split: 0.35, glow: 0.6 },
  // the moat (and the courtyard well): water surface at y 67.89 inside a 37-block circle round the castle centre
  // (render.js worldLook: center [dx, dz] from the set origin, plane at set.y + dy)
  reflect: { center: [0, -45], dy: 1, radius: [37, 37], strength: 0.75 }
}
const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? merge(a[k], v) : v; return o }

module.exports = {
  name: 'cinematic_keep',
  look: merge(LOOK, clip.look),
  fogSea: clip.fogSea || null,
  renderDistance: clip.renderDistance || 12,
  shots: {}
}
