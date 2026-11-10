// Does a recording's lightning light the world without look.smoothLight? (render.js LIGHTNING_LIGHT; the visual audit
// 2026-11-10, dog_hill: under the default look a bolt only tinted the sky.) The flash needs the shader light (the
// baked light can't change for 2-4 ticks without re-meshing the world), so a recording with a bolt turns it on for the
// flash alone. Rule zero: on for rec.engine >= 3 (new recordings), stunt.lightningLight: true or LIGHTNING_LIGHT=1 for
// an older one; LIGHTNING_LIGHT=0 or SHADER_LIGHT=0 turn it off. A look with smoothLight has it already.
function lightningLight ({ engine = 0, bolts = 0, lookShader = false, stunt = {}, env = {} } = {}) {
  if (lookShader || !bolts || env.SHADER_LIGHT === '0') return false
  if (env.LIGHTNING_LIGHT) return env.LIGHTNING_LIGHT === '1'
  return !!((stunt && stunt.lightningLight) ?? (engine >= 3))
}

module.exports = { lightningLight }
