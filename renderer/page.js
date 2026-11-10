// Renders pre-meshed Minecraft sections the way the game's default settings look, one frame on
// demand. Driven by render.js through window.HB; nothing animates on its own.
import * as THREE from 'three'
import { EntityLayer } from '/entities.js'
import { BlockEntityLayer } from '/blockentities.js'
// Render-distance fog uses fog_cylindrical_distance from the jar's shaders/include/fog.glsl:
// max(length(xz), abs(y)). three.js fogs by view depth. An earlier version here used length(xz) alone
// ("cylindrical" read as horizontal only), so high drops showed a recorded-terrain disc floating in
// pale sky (worker 3, drops). In vanilla the ground under a 150+ block drop fogs out at render
// distance 8, and stunts that want it seen raise renderDistance (with recordRadius to match).
// Computed per FRAGMENT from the interpolated camera-relative position: max() of an interpolated
// per-vertex distance isn't linear across a face, and on large faces (far terrain, greedy quads) it
// left a grey-blue haze patch over flat grass (worker 6, lapse_castle). Vanilla's linear_fog_value is
// linear between start and end (three.js uses smoothstep).
THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
	varying vec3 vFogRel;
#endif
`
THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
	vFogRel = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz - cameraPosition;
#endif
`
THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying vec3 vFogRel;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif
`
THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
	#ifdef FOG_EXP2
		float vFogDepth = length( vFogRel );
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		// a negative near marks environmental fog (lava, water, the Nether): vanilla measures it
		// spherically, length(pos); render-distance fog is max(xz, |y|) (see envFog)
		bool fogSph = fogNear < 0.0;
		float fogN = fogSph ? -fogNear - 0.001 : fogNear;
		float vFogDepth = fogSph ? length( vFogRel ) : max( length( vFogRel.xz ), abs( vFogRel.y ) );
		float fogFactor = clamp( ( vFogDepth - fogN ) / ( fogFar - fogN ), 0.0, 1.0 );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`
// sprites (dropped items, pearls, thrown potions, rockets) have no 'transformed' in their vertex
// shader: measure to the sprite's centre
THREE.ShaderLib.sprite.vertexShader = THREE.ShaderLib.sprite.vertexShader.replace('#include <fog_vertex>', `#ifdef USE_FOG
	vFogRel = ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz - cameraPosition;
#endif`)

// FogRenderer: render-distance fog starts at end - clamp(end / 10, 4, 64) (it was 0.8 x end, tuned for
// three's smoothstep); environmental fog (lava, water, Nether) is flagged by a negative near
const rdFogStart = (end) => end - Math.min(64, Math.max(4, end / 10))
const envFog = (near) => -near - 0.001

const W = window.innerWidth, H = window.innerHeight
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(W, H)
// Minecraft multiplies colours (textures x tint x shading) straight in sRGB; no colour management.
THREE.ColorManagement.enabled = false
renderer.outputColorSpace = THREE.LinearSRGBColorSpace
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
// vanilla FOV 70 (vertical); far plane GameRenderer.getDepthFar: max(renderDistance x 64, Cloud Distance x 16)
const camera = new THREE.PerspectiveCamera(70, W / H, 0.05, 2048)
camera.rotation.order = 'YXZ'
const sections = new Map()
let opaqueMat, translucentMat, clouds, sky, sun, moon, stars, entities, blockEntities
let fogSea = null

// The cinematic look (docs/movie_engine.md; stunt.look): what shader packs add on top of the game, as a post chain.
// The world, the hand and the darkness quad draw into an off-screen target; then bloom (bright pixels blurred at
// quarter size), depth of field (camera shots with a focus distance), and one finishing pass: exposure, a colour
// grade (lift / gamma / gain, saturation, an S-curve), vignette, grain, and letterbox bars (camera shots). The HUD
// is drawn later by edit.py, so it stays clean. Off unless a stunt sets `look`.
const GRADES = {
  neutral: { lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], sat: 1.04, contrast: 0.08, exposure: 1 },
  night: { lift: [0.0, 0.012, 0.03], gamma: [1.0, 1.0, 1.04], gain: [1.07, 1.0, 0.9], sat: 1.06, contrast: 0.14, exposure: 1.06 },
  dawn: { lift: [0.02, 0.008, 0.015], gamma: [0.97, 1.0, 1.03], gain: [1.09, 1.0, 0.88], sat: 1.12, contrast: 0.1, exposure: 1.03 },
  day: { lift: [0.0, 0.0, 0.01], gamma: [1, 1, 1], gain: [1.04, 1.01, 0.96], sat: 1.1, contrast: 0.1, exposure: 1.02 }
}
let POST = null

// Sun and moon shadows (stunt.look.shadows: true or { radius, size, strength }; docs/movie_engine.md). Not vanilla:
// what shader packs add. A depth map of the world's opaque blocks from the sun (or the moon at night), an
// orthographic box of `radius` blocks around the camera, and the block material darkened where a texel is behind
// something. Cached: it re-renders only when blocks change, the time changes or the camera moves to another 16-block
// cell, so a still scene pays for it once. v1: blocks cast shadows, entities don't (they keep their shadow discs).
let SHADOW = null
function makeShadow (spec, atlas) {
  const o = typeof spec === 'object' ? spec : {}
  const size = o.size || 2048, R = o.radius || 72
  const rt = new THREE.WebGLRenderTarget(size, size)
  rt.depthTexture = new THREE.DepthTexture(size, size)
  const cam = new THREE.OrthographicCamera(-R, R, R, -R, 1, 700)
  cam.layers.set(1)   // only the shadow casters (opaque block sections)
  const depthMat = new THREE.MeshBasicMaterial({ map: atlas, alphaTest: 0.1, colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 })
  const uniforms = { shadowMap: { value: rt.depthTexture }, shadowMatrix: { value: new THREE.Matrix4() }, shadowStrength: { value: 0 }, shadowTexel: { value: 1 / size } }
  return { rt, cam, depthMat, uniforms, R, size, strength: o.strength ?? 0.45, key: '', dirty: true }
}
function shadowMaterial (mat) {   // the block material reads the shadow map (a 4-tap PCF), darkening the lit colour
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, SHADOW.uniforms)
    sh.vertexShader = 'varying vec3 vShWorld;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vShWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = 'uniform sampler2D shadowMap; uniform mat4 shadowMatrix; uniform float shadowStrength; uniform float shadowTexel; varying vec3 vShWorld;\n' +
      sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  if (shadowStrength > 0.0) {
    vec4 sc = shadowMatrix * vec4(vShWorld, 1.0);
    if (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0) {
      float lit = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 o = vec2(i == 1 || i == 3 ? 1.0 : -1.0, i >= 2 ? 1.0 : -1.0) * 0.75 * shadowTexel;
        lit += step(sc.z - 0.0015, texture2D(shadowMap, sc.xy + o).x);
      }
      diffuseColor.rgb *= 1.0 - shadowStrength * (1.0 - lit / 4.0);
    }
  }`)
  }
  mat.needsUpdate = true
}
function updateShadow (dayTime, rain) {
  const S = SHADOW
  const a = dayInfo(dayTime).angle * Math.PI * 2
  let dir = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0)   // toward the sun (placeSun)
  let k = 1
  if (dir.y < 0.06) { dir = dir.clone().negate(); k = 0.35 }   // the sun is down: the moon, fainter
  const elev = Math.max(0, dir.y)
  const strength = S.strength * k * Math.min(1, elev * 4) * (1 - (rain || 0))
  S.uniforms.shadowStrength.value = strength
  if (strength <= 0.001) return
  const cx = Math.floor(camera.position.x / 16) * 16 + 8, cy = Math.floor(camera.position.y / 16) * 16 + 8, cz = Math.floor(camera.position.z / 16) * 16 + 8
  const key = `${cx},${cy},${cz},${dayTime},${sections.size}`
  if (!S.dirty && key === S.key) return
  S.key = key; S.dirty = false
  const c = new THREE.Vector3(cx, cy, cz)
  S.cam.position.copy(c).addScaledVector(dir, 350)
  S.cam.up.set(0, 0, 1)
  S.cam.lookAt(c)
  S.cam.updateMatrixWorld(); S.cam.updateProjectionMatrix()
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
  S.uniforms.shadowMatrix.value.copy(bias).multiply(S.cam.projectionMatrix).multiply(S.cam.matrixWorldInverse)
  const prevBg = scene.background, prevFog = scene.fog, prevOver = scene.overrideMaterial, prevTarget = renderer.getRenderTarget()
  scene.background = null; scene.fog = null; scene.overrideMaterial = S.depthMat
  renderer.setRenderTarget(S.rt); renderer.clear(); renderer.render(scene, S.cam)
  scene.background = prevBg; scene.fog = prevFog; scene.overrideMaterial = prevOver
  renderer.setRenderTarget(prevTarget)
}
function makePost (look, w, h) {
  const g = typeof look.grade === 'object' ? { ...GRADES.neutral, ...look.grade } : (GRADES[look.grade] || GRADES.neutral)
  const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true })
  rt.depthTexture = new THREE.DepthTexture(w, h)
  const bw = Math.max(1, Math.floor(w / 4)), bh = Math.max(1, Math.floor(h / 4))
  const ba = new THREE.WebGLRenderTarget(bw, bh), bb = new THREE.WebGLRenderTarget(bw, bh)
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene()
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quadScene.add(quad)
  const vs = 'varying vec2 vUv; void main () { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
  const mk = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false })
  const bright = mk(`uniform sampler2D src; uniform float thr; varying vec2 vUv;
    void main () { vec3 c = texture2D(src, vUv).rgb; float l = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c * max(0.0, l - thr) / max(1e-3, (1.0 - thr) * l), 1.0); }`, { src: { value: null }, thr: { value: look.bloomThreshold ?? 0.7 } })
  const blur = mk(`uniform sampler2D src; uniform vec2 dir; varying vec2 vUv;
    void main () { vec3 c = texture2D(src, vUv).rgb * 0.2270;
      c += (texture2D(src, vUv + dir * 1.3846).rgb + texture2D(src, vUv - dir * 1.3846).rgb) * 0.3162;
      c += (texture2D(src, vUv + dir * 3.2308).rgb + texture2D(src, vUv - dir * 3.2308).rgb) * 0.0703;
      gl_FragColor = vec4(c, 1.0); }`, { src: { value: null }, dir: { value: new THREE.Vector2() } })
  const COC = `uniform sampler2D depth; uniform vec2 res; uniform float near; uniform float far; uniform float focus; uniform float aperture;
    float lin (float d) { return near * far / (far - d * (far - near)); }
    // the circle of confusion in pixels at 540 high, scaled to the frame: the preview and the final match
    float coc (vec2 uv) { float z = lin(texture2D(depth, uv).x); float k = res.y / 540.0; return clamp(aperture * abs(z - focus) / max(z, 0.1) * 12.0 * k, 0.0, 14.0 * k); }`
  // depth of field at half size (blur hides it; a quarter of the cost): a 24-tap golden-angle disc gather, each tap
  // weighted by its own blur so a sharp subject in front doesn't bleed into the background behind it
  const rd = new THREE.WebGLRenderTarget(Math.max(1, Math.floor(w / 2)), Math.max(1, Math.floor(h / 2)))
  const dofMat = mk(`uniform sampler2D src; ${COC} varying vec2 vUv;
    void main () {
      float r = coc(vUv); vec3 c = texture2D(src, vUv).rgb;
      if (r > 0.5) {
        vec3 acc = c; float wsum = 1.0;
        for (int k = 0; k < 24; k++) {
          float a = float(k) * 2.39996, rr = sqrt((float(k) + 0.5) / 24.0);
          vec2 o = vec2(cos(a), sin(a)) * rr * r / res;
          float w = clamp(coc(vUv + o) / max(0.5, rr * r), 0.0, 1.0);
          acc += texture2D(src, vUv + o).rgb * w; wsum += w;
        }
        c = acc / wsum;
      }
      gl_FragColor = vec4(c, 1.0);
    }`, { src: { value: rt.texture }, depth: { value: rt.depthTexture }, res: { value: new THREE.Vector2(w, h) }, near: { value: 0.05 }, far: { value: 1000 }, focus: { value: 0 }, aperture: { value: 1 } })
  // god rays (look.rays: strength): the bright open sky (depth at the far plane) streaked toward the sun's place
  // on screen, at quarter size; added in the finishing pass, fading as the sun leaves the frame
  const rr = new THREE.WebGLRenderTarget(bw, bh)
  const rayMat = mk(`uniform sampler2D src; uniform sampler2D depth; uniform vec2 sun; uniform float sunOn; varying vec2 vUv;
    void main () {
      vec2 d = (sun - vUv) / 32.0; vec2 uv = vUv; vec3 acc = vec3(0.0); float decay = 1.0;
      for (int i = 0; i < 32; i++) {
        float sky = step(0.9999, texture2D(depth, uv).x);
        vec3 c = texture2D(src, uv).rgb;
        // only the sun and its glow give light (luminance near white, close to the sun): with the whole bright
        // sky as the source, a clear day washed out white (test frame, boat_clutch)
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float near = smoothstep(0.35, 0.0, distance(uv, sun));
        acc += c * sky * smoothstep(0.86, 1.0, l) * near * decay;
        decay *= 0.96; uv += d;
      }
      gl_FragColor = vec4(acc / 32.0 * sunOn, 1.0);
    }`, { src: { value: rt.texture }, depth: { value: rt.depthTexture }, sun: { value: new THREE.Vector2(0.5, 0.5) }, sunOn: { value: 0 } })
  // the shader-pack pass (look.shade, look.reflect): screen-space reflections on the lake (a plane y inside an ellipse:
  // ice and the water in its holes), ambient occlusion from the depth buffer, haze glowing warm toward the sun and cool
  // away from it, a warm/cool light split. Runs on the rendered frame before bloom and depth of field.
  const rs = new THREE.WebGLRenderTarget(w, h)
  const SH = look.shade || {}, RF = look.reflect || null
  const shadeMat = mk(`uniform sampler2D src; uniform sampler2D depth; uniform vec2 res; uniform mat4 projInv; uniform mat4 proj; uniform mat4 camWorld; uniform mat4 view;
    uniform vec3 sunDir; uniform vec3 warm; uniform vec3 cool; uniform float aoK; uniform float hazeK; uniform float hazeDist; uniform float split; uniform float glow;
    uniform float reflK; uniform float iceOn; uniform float planeY; uniform vec2 ctr; uniform vec2 rad; uniform float under; varying vec2 vUv;
    vec3 vpos (vec2 uv) { float d = texture2D(depth, uv).x; vec4 q = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return q.xyz / q.w; }
    float hash (vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    void main () {
      vec3 c = texture2D(src, vUv).rgb;
      float d = texture2D(depth, vUv).x;
      vec3 P = vpos(vUv);
      vec3 Vw = normalize((camWorld * vec4(P, 0.0)).xyz);
      float sunA = max(dot(Vw, normalize(sunDir)), 0.0);
      if (d >= 0.99999) {   // sky: a glow round the sun
        c += warm * pow(sunA, 18.0) * glow;
        gl_FragColor = vec4(c, 1.0); return;
      }
      vec3 W = (camWorld * vec4(P, 1.0)).xyz;
      vec3 N = normalize(cross(dFdx(P), dFdy(P)));
      if (dot(N, P) > 0.0) N = -N;
      // ambient occlusion: 12 taps in a spiral, a world radius of ~0.9 blocks
      float occ = 0.0;
      if (aoK > 0.0) {
        float r = clamp(0.9 * res.y * proj[1][1] * 0.5 / max(0.3, -P.z), 2.0, 60.0);
        float a0 = hash(vUv * res) * 6.283;
        for (int k = 0; k < 12; k++) {
          float fk = float(k) + 0.5, a = a0 + fk * 2.39996;
          vec2 o = vec2(cos(a), sin(a)) * r * sqrt(fk / 12.0) / res;
          vec3 v = vpos(vUv + o) - P;
          float dd = dot(v, v);
          occ += max(0.0, dot(v, N) - 0.02 * -P.z) / (dd + 0.05) * smoothstep(4.0, 0.5, dd);
        }
        occ = clamp(occ / 12.0 * 1.6, 0.0, 1.0);
        c *= mix(vec3(1.0), cool * 1.25, occ * aoK);
      }
      // reflections on the lake
      if (reflK > 0.0 && under < 0.5) {
        vec2 e = (W.xz - ctr) / rad;
        bool onIce = iceOn > 0.5 && abs(W.y - planeY) < 0.04, onWater = abs(W.y - (planeY - 0.111)) < 0.05;
        if ((onIce || onWater) && dot(e, e) < 1.0 && N.y > -2.0) {
          vec3 Nv = normalize((view * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
          vec3 Vv = normalize(P), R = reflect(Vv, Nv);
          float fres = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(-Vv, Nv)), 5.0);
          vec3 Rw = normalize((camWorld * vec4(R, 0.0)).xyz);
          // the sky it would see, if the march finds nothing: the haze colours and the sun
          vec3 refl = mix(cool * 0.9, warm, pow(max(dot(Rw, normalize(sunDir)), 0.0), 3.0)) * (0.6 + 0.4 * smoothstep(0.0, 0.4, Rw.y));
          float hit = 0.0;
          for (int i = 1; i <= 40; i++) {
            float t = 0.15 * float(i) + 0.012 * float(i * i);
            vec3 Q = P + R * t;
            vec4 cq = proj * vec4(Q, 1.0); vec2 uq = cq.xy / cq.w * 0.5 + 0.5;
            if (uq.x < 0.0 || uq.x > 1.0 || uq.y < 0.0 || uq.y > 1.0) break;
            float sd = texture2D(depth, uq).x;
            if (sd >= 0.99999) continue;
            float sz = vpos(uq).z;
            if (Q.z < sz && sz - Q.z < 0.6 + t * 0.12) {
              float edge = smoothstep(0.0, 0.08, min(min(uq.x, 1.0 - uq.x), min(uq.y, 1.0 - uq.y)));
              refl = mix(refl, texture2D(src, uq).rgb, edge); hit = 1.0; break;
            }
          }
          float k = reflK * (onWater ? 0.9 : 0.62) * (0.5 + 0.5 * fres);
          c = mix(c, refl, clamp(k, 0.0, 0.9));
        }
      }
      // haze: warm toward the sun, cool away, thicker with distance
      float dist = length(P);
      float hz = (1.0 - exp(-dist / hazeDist)) * hazeK;
      vec3 hcol = mix(cool, warm, pow(sunA, 4.0));
      c = mix(c, hcol, hz);
      // the light split: warm highlights, cool shadows
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c *= mix(mix(vec3(1.0), cool * 1.35, split), mix(vec3(1.0), warm * 1.2, split), smoothstep(0.15, 0.7, l));
      gl_FragColor = vec4(c, 1.0);
    }`, { src: { value: rt.texture }, depth: { value: rt.depthTexture }, res: { value: new THREE.Vector2(w, h) }, projInv: { value: new THREE.Matrix4() }, proj: { value: new THREE.Matrix4() },
    camWorld: { value: new THREE.Matrix4() }, view: { value: new THREE.Matrix4() }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
    warm: { value: new THREE.Vector3(...(SH.warm || [1.0, 0.66, 0.38])) }, cool: { value: new THREE.Vector3(...(SH.cool || [0.42, 0.52, 0.72])) },
    aoK: { value: SH.ao ?? 0 }, hazeK: { value: SH.haze ?? 0 }, hazeDist: { value: SH.hazeDist ?? 60 }, split: { value: SH.split ?? 0 }, glow: { value: SH.glow ?? 0 },
    reflK: { value: RF ? (RF.strength ?? 0.8) : 0 }, iceOn: { value: RF && RF.ice === false ? 0 : 1 },   // (ice: false: water only; grass level with the plane mirrored the whole courtyard)
    planeY: { value: RF ? RF.y : 0 }, ctr: { value: new THREE.Vector2(RF ? RF.cx : 0, RF ? RF.cz : 0) }, rad: { value: new THREE.Vector2(...(RF && RF.radius ? RF.radius : [1, 1])) }, under: { value: 0 } })
  shadeMat.extensions = { derivatives: true }
  const shadeOn = !!(look.shade || look.reflect)
  const fin = mk(`uniform sampler2D src; uniform sampler2D bloom; uniform sampler2D dof; uniform sampler2D rays; uniform float raysK; uniform sampler2D depth; uniform vec2 res;
    uniform float near; uniform float far; uniform float focus; uniform float aperture; uniform float bloomK;
    uniform vec3 lift; uniform vec3 gam; uniform vec3 gain; uniform float sat; uniform float contrast; uniform float exposure;
    uniform float vig; uniform float grain; uniform float seed; uniform float bars; varying vec2 vUv;
    float lin (float d) { return near * far / (far - d * (far - near)); }
    float coc (vec2 uv) { float z = lin(texture2D(depth, uv).x); float k = res.y / 540.0; return clamp(aperture * abs(z - focus) / max(z, 0.1) * 12.0 * k, 0.0, 14.0 * k); }
    float hash (vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main () {
      vec3 c = texture2D(src, vUv).rgb;
      if (focus > 0.0) c = mix(c, texture2D(dof, vUv).rgb, smoothstep(0.5, 2.5, coc(vUv)));   // the half-size blur where it's out of focus
      c += texture2D(bloom, vUv).rgb * bloomK;
      c += texture2D(rays, vUv).rgb * raysK;
      c *= exposure;
      c = pow(max(vec3(0.0), c * gain + lift * (1.0 - c)), 1.0 / gam);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat);
      // (clamped first: the S-curve on a value over 1 goes negative, and a blown sky near the sun lost its red: cyan blotches)
      c = clamp(c, 0.0, 1.0);
      c = mix(c, c * c * (3.0 - 2.0 * c), contrast);
      vec2 q = vUv - 0.5; q.x *= res.x / res.y;
      c *= mix(1.0, smoothstep(0.95, 0.25, length(q)), vig);
      c += (hash(vUv * res) - 0.5) * grain;
      if (bars > 0.0 && abs(vUv.y - 0.5) > 0.5 * (res.x / res.y) / bars) c = vec3(0.0);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`, {
    src: { value: rt.texture }, bloom: { value: ba.texture }, dof: { value: rd.texture }, rays: { value: rr.texture }, raysK: { value: look.rays || 0 }, depth: { value: rt.depthTexture }, res: { value: new THREE.Vector2(w, h) },
    near: { value: 0.05 }, far: { value: 1000 }, focus: { value: 0 }, aperture: { value: 1 }, bloomK: { value: look.bloom ?? 0.6 },
    lift: { value: new THREE.Vector3(...g.lift) }, gam: { value: new THREE.Vector3(...g.gamma) }, gain: { value: new THREE.Vector3(...g.gain) },
    sat: { value: g.sat }, contrast: { value: g.contrast }, exposure: { value: g.exposure ?? 1 },
    vig: { value: look.vignette ?? 0.35 }, grain: { value: look.grain ?? 0.03 }, seed: { value: 0 }, bars: { value: 0 }
  })
  return { rt, ba, bb, rd, rr, rs, shadeMat, shadeOn, quad, quadScene, quadCam, bright, blur, dofMat, rayMat, fin, bw, bh, rays: look.rays || 0, underwater: look.underwater || 1 }
}
function runPost (cam, tick) {
  const P = POST, pass = (mat, target) => { P.quad.material = mat; renderer.setRenderTarget(target); renderer.render(P.quadScene, P.quadCam) }
  let frame = P.rt.texture
  if (P.shadeOn) {
    const su = P.shadeMat.uniforms
    su.projInv.value.copy(camera.projectionMatrixInverse); su.proj.value.copy(camera.projectionMatrix)
    su.camWorld.value.copy(camera.matrixWorld); su.view.value.copy(camera.matrixWorldInverse)
    if (sun) su.sunDir.value.copy(sun.position).sub(camera.position).normalize()
    su.under.value = cam.underwater || cam.inLava ? 1 : 0
    pass(P.shadeMat, P.rs); frame = P.rs.texture
  }
  P.dofMat.uniforms.src.value = frame; P.fin.uniforms.src.value = frame; if (P.rayMat) P.rayMat.uniforms.src.value = frame
  P.bright.uniforms.src.value = frame; pass(P.bright, P.ba)
  for (let i = 0; i < 2; i++) {   // two blur rounds at quarter size: a wide, soft glow
    P.blur.uniforms.src.value = P.ba.texture; P.blur.uniforms.dir.value.set(1 / P.bw, 0); pass(P.blur, P.bb)
    P.blur.uniforms.src.value = P.bb.texture; P.blur.uniforms.dir.value.set(0, 1 / P.bh); pass(P.blur, P.ba)
  }
  if (P.rays > 0 && sun && sun.visible) {   // the sun's place on screen: on (or just off) the frame, in front of the camera
    const v = sun.position.clone().project(camera), on = v.z < 1 && Math.abs(v.x) < 1.6 && Math.abs(v.y) < 1.6 ? 1 - Math.max(0, Math.max(Math.abs(v.x), Math.abs(v.y)) - 1) / 0.6 : 0
    P.rayMat.uniforms.sun.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5); P.rayMat.uniforms.sunOn.value = Math.max(0, on) * (sun.material.opacity ?? 1)
    if (on > 0) pass(P.rayMat, P.rr)
    P.fin.uniforms.raysK.value = on > 0 ? P.rays : 0
  }
  const u = P.fin.uniforms
  u.near.value = camera.near; u.far.value = camera.far
  u.focus.value = cam.focus || 0; u.aperture.value = cam.aperture ?? 1
  if (cam.focus > 0) {
    const d = P.dofMat.uniforms
    d.near.value = camera.near; d.far.value = camera.far; d.focus.value = cam.focus; d.aperture.value = cam.aperture ?? 1
    pass(P.dofMat, P.rd)
  }
  // look.underwater: an exposure lift while the camera is in water (the cold-biome water fog graded to near black: ai_thin_ice)
  if (P.exp0 === undefined) P.exp0 = u.exposure.value
  u.exposure.value = P.exp0 * (cam.underwater ? (P.underwater ?? 1) : 1)
  u.bars.value = cam.bars || 0; u.seed.value = ((tick || 0) * 0.6180339) % 1 * 100
  pass(P.fin, null)
}

// The fog sea (docs/movie_engine.md; stunt.fogSea = { y0, y1, layers, density, color, fade, night }): a white
// band between y0 and y1 that reads as a sea of fog from above, as an overcast ceiling from below, and
// that you can fall through. Not vanilla (no block looks like that and lets you through): stacked
// translucent sheets centred on the camera, bunched toward the top so the surface is soft, with
// `density` (default 0.97) of the light stopped by the whole stack. Inside the band the scene fog closes
// in to a white-out over `fade` blocks (default 4). Its colour follows the daylight, down to `night` (0.34) of it.
function makeFogSea (spec, blocks) {
  const n = spec.layers || 14, dens = spec.density ?? 0.97
  const alpha = 1 - Math.pow(1 - dens, 1 / n)
  const grp = new THREE.Group(); grp.userData = { spec }
  const geo = new THREE.PlaneGeometry(blocks * 3, blocks * 3)
  for (let k = 0; k < n; k++) {
    const u = n === 1 ? 1 : k / (n - 1)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: alpha, depthWrite: false, side: THREE.DoubleSide, fog: true })
    const m = new THREE.Mesh(geo, mat)
    m.rotation.x = -Math.PI / 2; m.position.y = spec.y0 + (spec.y1 - spec.y0) * Math.pow(u, 0.6); m.renderOrder = 3; m.frustumCulled = false
    grp.add(m)
  }
  return grp
}
const env = { skyColor: 0x78a7ff, fogColor: 0xc0d8ff, renderDistance: 12, cloudHeight: 192.33, time: 6000 }

function srgb (hex) { return new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace) }

async function loadTexture (url) {
  const t = await new THREE.TextureLoader().loadAsync(url)
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestMipmapLinearFilter   // vanilla mipmapping (level 4 by default)
  t.generateMipmaps = true
  t.colorSpace = THREE.NoColorSpace
  t.flipY = false
  return t
}

// Sky: vanilla draws a flat sky colour that fades to the fog colour at the horizon.
function makeSky () {
  const geo = new THREE.SphereGeometry(500, 32, 16)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: srgb(env.skyColor) }, horizon: { value: srgb(env.fogColor) }, below: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform float below; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y, -1.0, 1.0);
        float t = smoothstep(-0.02, 0.35, h);
        vec3 c = mix(horizon, top, t);
        // LevelRenderer's dark disc: with the eye below the horizon height (y 63) the sky under the
        // horizon is black (the disc sits 4 blocks below the eye, 512 out)
        if (below > 0.5 && h < -0.0078) c = vec3(0.0);
        gl_FragColor = vec4(c, 1.0);
      }`
  })
  const m = new THREE.Mesh(geo, mat)
  m.renderOrder = -10
  m.frustumCulled = false
  return m
}

const CLOUDS_END = 128 * 16
// Fancy clouds: the game's 256x256 clouds.png, 12 blocks per pixel, 4 blocks thick, one shell
// mesh (only faces next to empty pixels), vanilla face tints, 80% opaque.
async function makeClouds (url) {
  const img = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = url })
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const g = c.getContext('2d'); g.drawImage(img, 0, 0)
  const px = g.getImageData(0, 0, img.width, img.height).data
  const N = img.width, S = 12, T = 4
  const filled = (x, z) => px[(((z % N) + N) % N * N + ((x % N) + N) % N) * 4 + 3] > 128
  const pos = [], col = []
  const quad = (a, b, c2, d, shade) => { for (const v of [a, b, c2, a, c2, d]) { pos.push(...v); col.push(shade, shade, shade) } }
  // segments of 32 cells along a row, in buffer order: [firstVertex, vertexCount, local box]
  const segs = []
  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      if (x % 32 === 0) segs.push([pos.length / 3, 0, new THREE.Box3(new THREE.Vector3(x * S, 0, z * S), new THREE.Vector3((x + 32) * S, T, (z + 1) * S))])
      if (!filled(x, z)) continue
      const x0 = x * S, x1 = x0 + S, z0 = z * S, z1 = z0 + S
      quad([x0, T, z0], [x0, T, z1], [x1, T, z1], [x1, T, z0], 1.0)        // top
      quad([x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], 0.7)        // bottom
      if (!filled(x - 1, z)) quad([x0, 0, z0], [x0, 0, z1], [x0, T, z1], [x0, T, z0], 0.9)
      if (!filled(x + 1, z)) quad([x1, 0, z1], [x1, 0, z0], [x1, T, z0], [x1, T, z1], 0.9)
      if (!filled(x, z - 1)) quad([x1, 0, z0], [x0, 0, z0], [x0, T, z0], [x1, T, z0], 0.8)
      if (!filled(x, z + 1)) quad([x0, 0, z1], [x1, 0, z1], [x1, T, z1], [x0, T, z1], 0.8)
    }
  }
  for (let k = 0; k < segs.length; k++) segs[k][1] = (k + 1 < segs.length ? segs[k + 1][0] : pos.length / 3) - segs[k][0]
  const P = new THREE.Float32BufferAttribute(pos, 3), C = new THREE.Float32BufferAttribute(col, 3)
  // rendertype_clouds.fsh: clouds take no fog colour; they fade out by alpha over the spherical
  // distance, 0 to FogCloudsEnd (Cloud Distance x 16, default 128 chunks). With the scene fog they took
  // the dusk fog colour, orange toward the sun and grey away from it (story_sun_wont_set)
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: true, fog: false })
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCloudsEnd = { value: CLOUDS_END }
    sh.vertexShader = 'varying float vCloudDist;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vCloudDist = length((modelMatrix * vec4(transformed, 1.0)).xyz - cameraPosition);')
    sh.fragmentShader = 'varying float vCloudDist;\nuniform float uCloudsEnd;\n' + sh.fragmentShader.replace('#include <fog_fragment>', '#include <fog_fragment>\n  gl_FragColor.a *= 1.0 - clamp(vCloudDist / uCloudsEnd, 0.0, 1.0);')
  }
  mat.customProgramCacheKey = () => 'clouds'
  const grp = new THREE.Group()
  for (const dx of [-1, 0]) for (const dz of [-1, 0]) {   // tile 2x2 so the camera is always covered
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', P); geo.setAttribute('color', C)   // shared buffers
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(pos.length / 3), 1))
    const m = new THREE.Mesh(geo, mat); m.position.set(dx * N * S, 0, dz * N * S); m.frustumCulled = false; grp.add(m)
  }
  grp.position.y = env.cloudHeight
  grp.userData.segs = segs
  return grp
}
// Draw only the cloud segments inside the view frustum (the far plane is at 2048 blocks; the four
// tiles cover 6144 blocks). The visible segments' vertices go into the index buffer in buffer order and
// the mesh stays one render item: three draws a transparent double-sided mesh in two passes (back
// faces, then front), and geometry groups interleaved those passes and shifted the blend (1-3 levels).
// The frame stays pixel-identical, and the clouds went from ~45% of the GL time to a few percent.
const _frustum = new THREE.Frustum(), _m4 = new THREE.Matrix4(), _box = new THREE.Box3()
function cullClouds () {
  if (!clouds || !clouds.visible) return
  camera.updateMatrixWorld(); clouds.updateMatrixWorld(true)
  _frustum.setFromProjectionMatrix(_m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
  const segs = clouds.userData.segs
  for (const m of clouds.children) {
    const g = m.geometry, idx = g.index.array
    let n = 0
    for (const [first, count, box] of segs) {
      if (!count) continue
      if (!_frustum.intersectsBox(_box.copy(box).applyMatrix4(m.matrixWorld))) continue
      for (let v = first; v < first + count; v++) idx[n++] = v
    }
    g.setDrawRange(0, n); g.index.needsUpdate = true
    m.visible = n > 0
  }
}

async function makeSun (url) {
  const t = await loadTexture(url); t.generateMipmaps = false; t.minFilter = THREE.NearestFilter; t.flipY = true
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  // vanilla SkyRenderer: the sun quad is +-30 at 100 (moon +-20), about 33 degrees across; placeSun
  // puts it at 400, so 240 wide. It was 60 wide there, a quarter size (worker 4, boat_clutch)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), mat)
  m.renderOrder = -9
  return m
}

// Vanilla time of day (same maths as renderer/models.js dayInfo; the node side bakes the lightmap).
function dayInfo (dayTime) {
  const d = (((dayTime / 24000) - 0.25) % 1 + 1) % 1
  const angle = (d * 2 + (0.5 - Math.cos(d * Math.PI) / 2)) / 3
  const c = Math.cos(angle * Math.PI * 2)
  const cl = (v) => Math.min(1, Math.max(0, v))
  return { angle, bright: cl(c * 2 + 0.5), star: cl(1 - (c * 2 + 0.25)) ** 2 * 0.5 }
}
// Stars (LevelRenderer.buildStarsBuffer): 1500 random points on a sphere, small quads, drawn
// white x star brightness and turned with the sky.
function makeStars () {
  let seed = 10842
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  const pos = []
  for (let i = 0; i < 1500; i++) {
    let x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1
    const sz = 0.15 + rnd() * 0.1, l = x * x + y * y + z * z
    if (l < 0.01 || l >= 1) continue
    const n = Math.sqrt(l); x /= n; y /= n; z /= n
    const c = new THREE.Vector3(x, y, z).multiplyScalar(100)
    const u = new THREE.Vector3(0, 1, 0).cross(c).normalize(); if (u.lengthSq() < 0.5) u.set(1, 0, 0)
    const v = new THREE.Vector3().crossVectors(c, u).normalize()
    const a = rnd() * Math.PI * 2, cu = u.clone().multiplyScalar(Math.cos(a)).add(v.clone().multiplyScalar(Math.sin(a))), cv = new THREE.Vector3().crossVectors(c.clone().normalize(), cu)
    const s4 = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]
    for (const [p, q] of s4) { const w = c.clone().addScaledVector(cu, p * sz).addScaledVector(cv, q * sz); pos.push(w.x, w.y, w.z) }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }))
  m.renderOrder = -9; m.frustumCulled = false
  return m
}
// Sunrise / sunset glow (DimensionSpecialEffects.getSunriseOrSunsetColor + SkyRenderer
// renderSunriseAndSunset): while cos(angle * 2pi) is within +-0.4, a triangle fan centred on the
// horizon at the sun's side, colour (f*0.3+0.7, f*f*0.7+0.2, 0.2) with alpha (1-(1-sin(f*pi))*0.99)^2
// at the centre and 0 at the rim, f = cos/0.4*0.5+0.5. Scaled out to sit behind the terrain.
// The fan surrounds the camera and its centre lies nearly in the camera plane when looking sideways;
// swiftshader then interpolated the centre's colour over everything (a hard orange edge looking
// north at sunrise), so each triangle is cut into 12 radial strips (the same surface and colours).
function sunriseColor (angle) {
  const c = Math.cos(angle * Math.PI * 2)
  if (c < -0.4 || c > 0.4) return null
  const f = c / 0.4 * 0.5 + 0.5, a = (1 - (1 - Math.sin(f * Math.PI)) * 0.99) ** 2
  return [f * 0.3 + 0.7, f * f * 0.7 + 0.2, 0.2, a]
}
let sunriseFan = null
function drawSunrise () {
  const angle = dayInfo(env.time).angle, sc = sunriseColor(angle)
  const N = 12
  if (!sunriseFan) {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(17 * (N + 1) * 3), 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(17 * (N + 1) * 4), 4))
    const idx = []
    for (let j = 0; j < 16; j++) for (let k = 0; k < N; k++) { const p = j * (N + 1) + k, q = (j + 1) * (N + 1) + k; idx.push(p, q, q + 1, p, q + 1, p + 1) }
    g.setIndex(idx)
    sunriseFan = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }))
    sunriseFan.renderOrder = -9.5; sunriseFan.frustumCulled = false; sunriseFan.matrixAutoUpdate = false
    scene.add(sunriseFan)
  }
  sunriseFan.visible = !!sc && sky.visible && !window.DEBUG_MAGENTA && !window.DEBUG_NOFAN
  if (!sunriseFan.visible) return
  const pos = sunriseFan.geometry.attributes.position.array, col = sunriseFan.geometry.attributes.color.array
  for (let j = 0; j <= 16; j++) {
    const f2 = j * Math.PI * 2 / 16, s = Math.sin(f2), c = Math.cos(f2), R = [s * 120, c * 120, -c * 40 * sc[3]]
    for (let k = 0; k <= N; k++) {
      const t = k / N, i = j * (N + 1) + k
      pos.set([R[0] * t, 100 + (R[1] - 100) * t, R[2] * t], i * 3); col.set([sc[0], sc[1], sc[2], sc[3] * (1 - t)], i * 4)
    }
  }
  sunriseFan.geometry.attributes.position.needsUpdate = true; sunriseFan.geometry.attributes.color.needsUpdate = true
  // PoseStack: Rx(90) Rz(sin(sunAngle) < 0 ? 180 : 0) Rz(90), around the camera, x3.4 out
  const flip = Math.sin(angle * Math.PI * 2) < 0 ? Math.PI : 0
  sunriseFan.matrix.makeTranslation(camera.position.x, camera.position.y, camera.position.z)
    .multiply(new THREE.Matrix4().makeScale(3.4, 3.4, 3.4)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new THREE.Matrix4().makeRotationZ(flip)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2))
  sunriseFan.matrixWorldNeedsUpdate = true
}
// SkyRenderer.renderEndSky: six faces of a 200-block cube around the camera, end_sky.png repeated 16
// times on each, colour 0x282828, no fog
let endSky = null
async function makeEndSky () {
  const t = await new THREE.TextureLoader().loadAsync('/assets/env/end_sky.png').catch(() => null)
  if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; t.repeat.set(16, 16) }
  const m = new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200), new THREE.MeshBasicMaterial({ map: t, color: srgb(0x282828), side: THREE.BackSide, fog: false, depthWrite: false }))
  m.renderOrder = -10; m.frustumCulled = false
  scene.add(m)
  return m
}
function placeSun () {
  // the celestial angle: 0 = noon (sun straight up); the sky turns around the X axis, east to west.
  // The moon is opposite the sun; stars turn with them.
  const a = dayInfo(env.time).angle * Math.PI * 2
  const d = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0).multiplyScalar(400)
  sun.position.copy(camera.position).add(d); sun.lookAt(camera.position)
  if (moon) { moon.position.copy(camera.position).sub(d); moon.lookAt(camera.position) }
  if (stars) { stars.position.copy(camera.position); stars.rotation.set(0, 0, a) }
}

// The block atlas as a canvas, so animated textures (water, lava, kelp, fire...) can be redrawn
// in place: frames and timings come from each texture's .mcmeta (build_assets.py -> anims.json).
let ANIM = null
async function loadAnimatedAtlas () {
  const base = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = '/assets/atlas.png' })
  const c = document.createElement('canvas'); c.width = base.width; c.height = base.height
  const g = c.getContext('2d'); g.drawImage(base, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.generateMipmaps = true
  t.colorSpace = THREE.NoColorSpace; t.flipY = false
  try {
    const meta = await (await fetch('/assets/anims.json')).json()
    const strips = {}
    await Promise.all(Object.keys(meta.anims).map(k => new Promise((resolve) => { const i = new Image(); i.onload = () => { strips[k] = i; resolve() }; i.onerror = resolve; i.src = `/assets/env/anim/${k}.png` })))
    ANIM = { meta, strips, g, tex: t, shown: {} }
  } catch (e) { ANIM = null }
  return t
}
function animate (tick) {
  if (!ANIM) return
  const { meta, strips, g, shown } = ANIM
  const T = meta.tile, P = meta.pad
  let dirty = false
  for (const [k, a] of Object.entries(meta.anims)) {
    const img = strips[k]; if (!img) continue
    const total = a.frames.reduce((s, f) => s + f[1], 0)
    let tt = Math.floor(tick) % total, idx = a.frames[0][0]
    for (const [fi, ft] of a.frames) { if (tt < ft) { idx = fi; break } tt -= ft }
    if (shown[k] === idx) continue
    shown[k] = idx; dirty = true
    const [cx, cy] = a.cell
    g.clearRect(cx, cy, meta.cell, meta.cell)
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      // wrap-padded copy of the frame, clipped to this cell
      g.save(); g.beginPath(); g.rect(cx, cy, meta.cell, meta.cell); g.clip()
      g.drawImage(img, 0, idx * T, T, T, cx + P + ox * T, cy + P + oy * T, T, T)
      g.restore()
    }
  }
  if (dirty) ANIM.tex.needsUpdate = true
}

// Particles: camera-facing quads, one batch per texture, rebuilt every frame.
const partTex = new Map(); const partMeshes = []
async function particleMaterial (tex) {
  if (partTex.has(tex)) return partTex.get(tex)
  let map
  if (tex === 'atlas') map = opaqueMat.map
  else {
    map = await new THREE.TextureLoader().loadAsync(`/assets/env/${tex}.png`).catch(() => null)
    if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; map.colorSpace = THREE.NoColorSpace; map.flipY = false }
  }
  const m = map ? new THREE.MeshBasicMaterial({ map, vertexColors: true, alphaTest: 0.1, side: THREE.DoubleSide, fog: true }) : null
  partTex.set(tex, m)
  return m
}
// Lightning bolts (LightningBoltRenderer.render): 8 segments of 16 blocks, a jagged main path from a
// java.util.Random seeded by the bolt (nextInt(11) - 5 per segment) and two forks (nextInt(31) - 15),
// four nested shells 0.1 + 0.2j wide, colour (0.45, 0.45, 0.5) at alpha 0.3, blended SRC_ALPHA, ONE
function javaRandom (seed) {
  const M = (1n << 48n) - 1n
  let s = (BigInt(seed) ^ 0x5DEECE66Dn) & M
  const next = (bits) => { s = (s * 0x5DEECE66Dn + 0xBn) & M; return Number(s >> BigInt(48 - bits)) }
  return {
    nextInt (bound) {
      if ((bound & -bound) === bound) return Number((BigInt(bound) * BigInt(next(31))) >> 31n)
      let bits, val
      do { bits = next(31); val = bits % bound } while (bits - val + (bound - 1) >= 2 ** 31)
      return val
    }
  }
}
function boltGeometry (seed) {
  const pos = []
  const xs = new Array(8), zs = new Array(8)
  let f = 0, f1 = 0
  { const r = javaRandom(seed); for (let i = 7; i >= 0; i--) { xs[i] = f; zs[i] = f1; f += r.nextInt(11) - 5; f1 += r.nextInt(11) - 5 } }
  const quad = (x1, z1, idx, x2, z2, o2, o1, ox1, oz1, ox2, oz2) => {
    const v = [[x1 + (ox1 ? o1 : -o1), idx * 16, z1 + (oz1 ? o1 : -o1)], [x2 + (ox1 ? o2 : -o2), (idx + 1) * 16, z2 + (oz1 ? o2 : -o2)],
      [x2 + (ox2 ? o2 : -o2), (idx + 1) * 16, z2 + (oz2 ? o2 : -o2)], [x1 + (ox2 ? o1 : -o1), idx * 16, z1 + (oz2 ? o1 : -o1)]]
    for (const k of [0, 1, 2, 0, 2, 3]) pos.push(...v[k])
  }
  for (let j = 0; j < 4; j++) {
    const r1 = javaRandom(seed)
    for (let k = 0; k < 3; k++) {
      let l = 7, i1 = 0
      if (k > 0) { l = 7 - k; i1 = l - 2 }
      let f2 = xs[l] - f, f3 = zs[l] - f1
      for (let j1 = l; j1 >= i1; j1--) {
        const f4 = f2, f5 = f3
        if (k === 0) { f2 += r1.nextInt(11) - 5; f3 += r1.nextInt(11) - 5 } else { f2 += r1.nextInt(31) - 15; f3 += r1.nextInt(31) - 15 }
        let f10 = 0.1 + j * 0.2; if (k === 0) f10 *= j1 * 0.1 + 1
        let f11 = 0.1 + j * 0.2; if (k === 0) f11 *= (j1 - 1) * 0.1 + 1
        quad(f2, f3, j1, f4, f5, f10, f11, false, false, true, false)
        quad(f2, f3, j1, f4, f5, f10, f11, true, false, true, true)
        quad(f2, f3, j1, f4, f5, f10, f11, true, true, false, true)
        quad(f2, f3, j1, f4, f5, f10, f11, false, true, false, false)
      }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return g
}
let boltMat = null
const boltMeshes = []
function drawBolts (list) {
  for (const m of boltMeshes) { scene.remove(m); m.geometry.dispose() }
  boltMeshes.length = 0
  if (!list || !list.length) return
  if (!boltMat) boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.45, 0.5), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true })
  for (const b of list) {
    const m = new THREE.Mesh(boltGeometry(b.seed), boltMat)
    m.position.set(b.x, b.y, b.z); m.frustumCulled = false; m.renderOrder = 2
    scene.add(m); boltMeshes.push(m)
  }
}

// Entity shadows (EntityRenderDispatcher.renderShadow): misc/shadow.png flat on the ground under each
// entity, radius per renderer, alpha from render.js (height above the ground, camera distance)
let shadowMat = null, shadowMesh = null
async function drawShadows (list) {
  if (shadowMesh) { scene.remove(shadowMesh); shadowMesh.geometry.dispose(); shadowMesh = null }
  if (!list || !list.length) return
  if (!shadowMat) {
    const t = await new THREE.TextureLoader().loadAsync('/assets/env/misc/shadow.png').catch(() => null)
    if (!t) return
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace
    shadowMat = new THREE.MeshBasicMaterial({ map: t, vertexColors: true, transparent: true, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  }
  const pos = [], uv = [], col = [], idx = []
  for (const s of list) {
    const n = pos.length / 3, y = s.y + 0.002
    pos.push(s.x - s.r, y, s.z - s.r, s.x + s.r, y, s.z - s.r, s.x + s.r, y, s.z + s.r, s.x - s.r, y, s.z + s.r)
    uv.push(0, 0, 1, 0, 1, 1, 0, 1)
    for (let k = 0; k < 4; k++) col.push(s.l, s.l, s.l, s.a)
    idx.push(n, n + 2, n + 1, n, n + 3, n + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
  g.setIndex(idx)
  shadowMesh = new THREE.Mesh(g, shadowMat); shadowMesh.frustumCulled = false; shadowMesh.renderOrder = 1
  scene.add(shadowMesh)
}
async function drawParticles (parts) {
  for (const m of partMeshes) { scene.remove(m); m.geometry.dispose() }
  partMeshes.length = 0
  if (!parts || !parts.length) return
  camera.updateMatrixWorld()
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
  const groups = new Map()
  for (const p of parts) { if (!groups.has(p.tex)) groups.set(p.tex, []); groups.get(p.tex).push(p) }
  for (const [tex, list] of groups) {
    const mat = await particleMaterial(tex); if (!mat) continue
    const pos = [], uv = [], col = [], idx = []
    for (const p of list) {
      const n = pos.length / 3, h = p.size
      const [u, v, su, sv] = p.uv || [0, 0, 1, 1]
      for (const [a, b, uu, vv] of [[-1, -1, u, v + sv], [1, -1, u + su, v + sv], [1, 1, u + su, v], [-1, 1, u, v]]) {
        pos.push(p.x + (right.x * a + up.x * b) * h, p.y + (right.y * a + up.y * b) * h, p.z + (right.z * a + up.z * b) * h)
        uv.push(uu, vv); col.push(...p.color)
      }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 2
    scene.add(mesh); partMeshes.push(mesh)
  }
}

window.HB = {
  async init (opts) {
    Object.assign(env, opts || {})
    const atlas = await loadAnimatedAtlas()
    opaqueMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, alphaTest: 0.1, fog: true })
    translucentMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, depthWrite: false, fog: true })
    const blocks = env.renderDistance * 16
    scene.fog = new THREE.Fog(srgb(env.fogColor), rdFogStart(blocks), blocks)
    scene.background = srgb(env.fogColor)
    sky = makeSky(); scene.add(sky)
    sun = await makeSun('/assets/env/sun.png'); scene.add(sun)
    try { moon = await makeSun('/assets/env/moon.png'); moon.scale.setScalar(20 / 30); scene.add(moon) } catch (e) { moon = null }
    stars = makeStars(); scene.add(stars)
    clouds = await makeClouds('/assets/env/clouds.png'); scene.add(clouds)
    if (env.fogSea) { fogSea = makeFogSea(env.fogSea, blocks); scene.add(fogSea) }
    if (env.look) POST = makePost(env.look, W, H)
    if (env.look && env.look.shadows) { SHADOW = makeShadow(env.look.shadows, atlas); shadowMaterial(opaqueMat) }
    await EntityLayer.loadModels()
    const regs = await (await fetch('/assets/registries.json')).json().catch(() => ({}))
    entities = new EntityLayer(scene, regs); entities.camera = camera
    blockEntities = new BlockEntityLayer(scene)
    entities.itemFactory = thirdPersonItem
    entities.glintify = glintify
    await loadGlint()
    return true
  },

  // Fetch a binary blob from Mesher.pack and install every section in it.
  async loadMeshes (url) {
    const buf = await (await fetch(url)).arrayBuffer()
    const hlen = new DataView(buf).getUint32(0, true)
    const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hlen)))
    const base = 4 + hlen + ((4 - ((4 + hlen) % 4)) % 4)
    const view = ([off, n], T) => new T(buf, base + off, n)
    for (const h of header) {
      if (!h.o) { this.removeSection(h.key); continue }
      const part = (p) => ({ positions: view(p[0], Float32Array), colors: view(p[1], Float32Array), uvs: view(p[2], Float32Array), indices: view(p[3], Uint32Array) })
      this.setSection(h.key, { x: h.x, y: h.y, z: h.z, opaque: part(h.o), translucent: part(h.t), endPortal: h.e ? { positions: view(h.e[0], Float32Array), indices: view(h.e[1], Uint32Array) } : null })
    }
    return header.length
  },

  addBlockModel (id, g) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(g.colors, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uvs, 2))
    geo.setIndex(g.indices)
    if (entities) entities.blockModels.set(id, { geo, mat: g.translucent ? translucentMat : opaqueMat })
  },

  setSection (key, s) {
    this.removeSection(key)
    const grp = new THREE.Group()
    grp.position.set(s.x, s.y, s.z)
    for (const [part, mat] of [['opaque', opaqueMat], ['translucent', translucentMat]]) {
      const d = s[part]
      if (!d.positions.length) continue
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(d.positions, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(d.colors, 3))
      geo.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2))
      geo.setIndex(new THREE.BufferAttribute(d.indices, 1))
      const m = new THREE.Mesh(geo, mat)
      if (part === 'translucent') m.renderOrder = 1
      else m.layers.enable(1)   // a shadow caster (SHADOW)
      grp.add(m)
    }
    if (s.endPortal && s.endPortal.positions.length) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(s.endPortal.positions, 3))
      geo.setIndex(new THREE.BufferAttribute(s.endPortal.indices, 1))
      grp.add(new THREE.Mesh(geo, endPortalMaterial()))
    }
    scene.add(grp)
    sections.set(key, grp)
    if (SHADOW) SHADOW.dirty = true
  },

  removeSection (key) {
    const g = sections.get(key)
    if (!g) return
    scene.remove(g)
    g.traverse(o => { if (o.geometry) o.geometry.dispose() })
    sections.delete(key)
  },

  // pos = eye position; yaw/pitch in mineflayer convention; bob = {x,y,roll,pitch} offsets
  async frame (cam, tick, ents, parts) {
    if (END_LOADS.length) await Promise.all(END_LOADS)   // the portal's textures before its first frame (it drew black for one)
    animate(tick || 0)
    if (entities) await entities.update(ents || [], tick || 0)
    if (blockEntities && cam.blockEntities) await blockEntities.update(cam.blockEntities)
    camera.position.set(cam.x, cam.y, cam.z)
    camera.rotation.set(cam.pitch - (cam.bobPitch || 0), cam.yaw, cam.roll || 0)
    if (cam.bobX) camera.translateX(cam.bobX)
    if (cam.bobY) camera.translateY(cam.bobY)
    { const fv = cam.fov || 70; if (camera.fov !== fv) { camera.fov = fv; camera.updateProjectionMatrix() } }
    camera.updateMatrixWorld()
    // Underwater: vanilla swaps to the biome's water fog colour and a short fog distance.
    const blocks = env.renderDistance * 16
    if (cam.sky !== undefined) { env.skyColor = cam.sky; env.fogColor0 = cam.fog }
    // time of day: sky colour x brightness, fog colour x (0.94|0.91)b + (0.06|0.09) (FogRenderer),
    // clouds (getCloudColor) x (0.9b + 0.1), stars fade in at dusk
    env.time = cam.dayTime ?? 6000
    const day = dayInfo(env.time), fog0 = srgb(env.fogColor0 ?? env.fogColor)
    const skyC = srgb(env.skyColor).multiplyScalar(day.bright)
    const fogC = new THREE.Color(fog0.r * (day.bright * 0.94 + 0.06), fog0.g * (day.bright * 0.94 + 0.06), fog0.b * (day.bright * 0.91 + 0.09))
    // weather (ClientLevel.getSkyColor / getCloudColor, FogRenderer): rain pulls the sky toward 0.6 x its
    // grey by rain * 0.75 (thunder: 0.2 x grey), the fog dims (rg x (1 - rain/2), b x (1 - 0.4 rain),
    // thunder x (1 - thunder/2)), clouds go grey by 0.95, and the sun, moon and stars fade by 1 - rain
    const rain = cam.rain || 0, thunder = cam.thunder || 0
    const grey = (c, k, lv, s) => { const g = (c.r * 0.3 + c.g * 0.59 + c.b * 0.11) * k, f = 1 - lv * s; c.setRGB(c.r * f + g * (1 - f), c.g * f + g * (1 - f), c.b * f + g * (1 - f)) }
    if (rain > 0) { grey(skyC, 0.6, rain, 0.75); fogC.setRGB(fogC.r * (1 - rain * 0.5), fogC.g * (1 - rain * 0.5), fogC.b * (1 - rain * 0.4)) }
    if (thunder > 0) { grey(skyC, 0.2, thunder, 0.75); fogC.multiplyScalar(1 - thunder * 0.5) }
    // ClientLevel.getSkyColor: a lightning flash pulls the sky toward (0.8, 0.8, 1) by skyFlash (<= 0.45)
    if (cam.skyFlash > 0) { const k = cam.skyFlash; skyC.setRGB(skyC.r * (1 - k) + 0.8 * k, skyC.g * (1 - k) + 0.8 * k, skyC.b * (1 - k) + k) }
    sky.material.uniforms.top.value.copy(skyC); sky.material.uniforms.horizon.value.copy(fogC)
    // FogRenderer: looking toward the sunrise/sunset side tints the fog by its colour (x the glow alpha)
    {
      const ang = day.angle * Math.PI * 2, sc = sunriseColor(day.angle)
      if (sc) {
        camera.updateMatrixWorld()
        const look = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        let k = look.x * (Math.sin(ang) > 0 ? -1 : 1)
        if (k > 0) { k *= sc[3]; fogC.setRGB(fogC.r * (1 - k) + sc[0] * k, fogC.g * (1 - k) + sc[1] * k, fogC.b * (1 - k) + sc[2] * k) }
        sky.material.uniforms.horizon.value.copy(fogC)
      }
    }
    // FogRenderer: near the bottom of the world the clear/fog colour darkens by ((y - minY) / 32)^2
    if ((cam.dimension || 'overworld') === 'overworld') {
      // (DarknessFogFunction.getModifiedVoidDarkness replaces it with 1 - blend: the fog fades to black)
      const d = cam.darkBlend > 0 ? 1 - cam.darkBlend : (cam.y - (env.minY ?? -64)) / 32
      if (d < 1) fogC.multiplyScalar(Math.max(0, d) ** 2)
    }
    sky.material.uniforms.below.value = (cam.dimension || 'overworld') === 'overworld' && cam.y < 63 ? 1 : 0
    env.fogColorC = fogC
    const cloudC = new THREE.Color().setScalar(day.bright * 0.9 + 0.1)
    // look.cloudNight (a movie scene's choice, not vanilla): moonlit clouds at least this bright. At vanilla's 0.1 they
    // were black holes over a moonlit fog sea (reel 1 v3)
    if (env.look && env.look.cloudNight) { const k = env.look.cloudNight; cloudC.setRGB(Math.max(cloudC.r, k * 0.85), Math.max(cloudC.g, k * 0.9), Math.max(cloudC.b, k)) }
    if (rain > 0) grey(cloudC, 0.6, rain, 0.95)
    if (thunder > 0) grey(cloudC, 0.2, thunder, 0.95)
    // darkness: the short fog swallows the clouds, sun, moon and stars (they fade with the blend)
    const db = cam.darkBlend || 0
    if (db > 0) cloudC.lerp(fogC, db)
    clouds.traverse(o => { if (o.material) o.material.color.copy(cloudC) })
    if (stars) stars.material.opacity = day.star * (1 - rain) * (1 - db)
    sun.material.opacity = (1 - rain) * (1 - db); if (moon) moon.material.opacity = (1 - rain) * (1 - db)
    // FogRenderer: lava 0.25..1.0. (This else chain once sat behind a // comment on one line, so
    // underwater fog never applied and lava fog was never cleared.)
    if (cam.inLava) { scene.fog.color.copy(srgb(0x991a00)); scene.fog.near = envFog(0.25); scene.fog.far = 1.0 } else if (cam.underwater) { scene.fog.color.copy(srgb(cam.waterFog ?? 0x050533)); scene.fog.near = envFog(0); scene.fog.far = 24 } else { scene.fog.color.copy(env.fogColorC); scene.fog.near = rdFogStart(blocks); scene.fog.far = blocks }
    // FogRenderer DarknessFogFunction: the fog end closes in to lerp(blend, renderDistance, 15), start
    // at 0.75 of it (the sky's at 0: it fades to the fog colour)
    if (cam.darkBlend > 0 && !cam.inLava && !cam.underwater) {
      const b = cam.darkBlend, end = blocks + (15 - blocks) * b
      scene.fog.far = Math.min(scene.fog.far, end); scene.fog.near = Math.min(scene.fog.near, end * 0.75)
      sky.material.uniforms.top.value.lerp(fogC, b); sky.material.uniforms.horizon.value.lerp(fogC, b)
    }
    const under = cam.underwater || cam.inLava; sky.visible = !under; clouds.visible = !under && env.clouds !== false;   // a stunt can set `clouds: false` (Video Settings > Clouds: OFF)
    sun.visible = !under && !window.DEBUG_NOSUN; if (moon) moon.visible = sun.visible; if (stars) stars.visible = !under
    scene.background = cam.inLava ? srgb(0x991a00) : cam.underwater ? srgb(cam.waterFog ?? 0x050533) : env.fogColorC.clone()
    if (fogSea) {   // (makeFogSea above)
      const sp = fogSea.userData.spec
      const c = srgb(sp.color ?? 0xeef2ff).multiplyScalar((sp.night ?? 0.34) + (1 - (sp.night ?? 0.34)) * day.bright * (1 - rain * 0.4))   // (at 0.16 the night sea was black on black: test reel)
      fogSea.position.set(camera.position.x, 0, camera.position.z)
      // a sheet fades as the camera nears it, so passing through one is smooth (each sheet is ~23% of the haze: crossing
      // them popped the Below's POV twice on the way out, QA f22 and f42)
      for (const m of fogSea.children) {
        m.material.color.copy(c)
        const base = m.userData.alpha ?? (m.userData.alpha = m.material.opacity)
        m.material.opacity = base * Math.min(1, Math.abs(m.position.y - camera.position.y) / 3)
      }
      const depth = sp.y1 - cam.y
      if (depth > 0 && cam.y > sp.y0 - 2 && !cam.underwater && !cam.inLava) {
        // (and out again over the band's last `fade` blocks: you come out of its floor gradually; the white held until
        // the eye was 2 below it, 2 s of white at the start of the Below's POV)
        const k = Math.max(0, Math.min(1, depth / (sp.fade ?? 4), (cam.y - sp.y0) / (sp.fade ?? 4)))
        // (from the full distance at k = 0, so the edges of the band don't pop: a fixed 32 left a haze that vanished in one
        // frame as the camera left the band's floor, QA f42)
        if (k > 0.001) { scene.fog.color.lerp(c, k); scene.fog.near = envFog((1 - k) * (1 - k) * blocks); scene.fog.far = blocks * (1 - k) + 3 * k }
        scene.background.lerp(c, k)
        if (k > 0.9) { sky.visible = false; clouds.visible = false; sun.visible = false; if (moon) moon.visible = false; if (stars) stars.visible = false }
      }
    }
    sky.position.copy(camera.position)
    // the Nether (DimensionSpecialEffects NETHER: no sky, sun or clouds; the clear colour is the biome
    // fog colour, not darkened by time; thick fog from renderDistance * 0.05 to min(renderDistance,
    // 192) / 2) and the End (the end_sky box tinted 0x282828; fog = biome fog x 0.15; no clouds or sun)
    const dim = cam.dimension || 'overworld'
    if (endSky) endSky.visible = false
    if (dim !== 'overworld' && !cam.inLava && !cam.underwater) {
      // (the End's biome fog is 0xA080A0; our biome table only has the overworld default for it)
      const fc = dim === 'the_end' ? srgb(0xA080A0).multiplyScalar(0.15) : srgb(env.fogColor0 ?? env.fogColor)
      scene.fog.color.copy(fc); scene.background = fc.clone()
      if (dim === 'the_nether') { scene.fog.near = envFog(blocks * 0.05); scene.fog.far = Math.min(blocks, 192) * 0.5 }
      sky.visible = false; clouds.visible = false; sun.visible = false; if (moon) moon.visible = false; if (stars) stars.visible = false
      if (dim === 'the_end') { if (!endSky) endSky = await makeEndSky(); endSky.visible = true; endSky.position.copy(camera.position) }
    } else if (dim !== 'overworld') { clouds.visible = false; sun.visible = false; if (moon) moon.visible = false; if (stars) stars.visible = false }
    if (window.DEBUG_MAGENTA) { sky.visible = false; scene.background = new THREE.Color(1, 0, 1) }
    placeSun()
    drawSunrise()
    // clouds drift +X at vanilla speed (0.03 blocks/tick); keep them centered on the camera
    const span = 256 * 12
    const drift = (tick || 0) * 0.03
    clouds.position.x = Math.floor((camera.position.x - drift) / span) * span + drift + span / 2
    clouds.position.z = Math.floor(camera.position.z / span) * span + span / 2
    await drawShadows(cam.shadows)
    drawBolts(cam.bolts)
    await drawParticles(parts)
    await drawWeather(cam)
    GLINT.ms.value = (tick || 0) * 50
    END_TIME.value = ((tick || 0) % 24000) / 24000   // GameTime: the game time as a fraction of a day
    drawSelection(cam)
    drawAim(cam)
    cullClouds()
    if (SHADOW) updateShadow(env.time, rain)
    if (POST) renderer.setRenderTarget(POST.rt)   // the cinematic look: everything below draws off screen first
    renderer.render(scene, camera)
    // vanilla's mipmap chain stops at level 4 (Options mipmapLevels: 16 px -> 1 px per tile); three
    // builds it down to 1x1, where the 32 px atlas cells (8 px padding) blend into their neighbours
    // far away. Cap the atlas at level 4 once it is on the GPU (texParameter sticks to the texture).
    if (opaqueMat && opaqueMat.map && !opaqueMat.map.userData.maxLevel) {
      const tp = renderer.properties.get(opaqueMat.map)
      if (tp && tp.__webglTexture) {
        const gl = renderer.getContext()
        gl.bindTexture(gl.TEXTURE_2D, tp.__webglTexture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 4); gl.bindTexture(gl.TEXTURE_2D, null)
        renderer.state.reset(); opaqueMat.map.userData.maxLevel = true
      }
    }
    if (POST) renderer.setRenderTarget(POST.rt)   // (state.reset above can unbind it)
    if (await drawHand(cam)) {
      const ac = renderer.autoClear; renderer.autoClear = false
      renderer.clearDepth(); renderer.render(handScene, handCam)
      renderer.autoClear = ac
    }
    // the Darkness pulse: the lightmap minus darknessScale. Our light is baked into the vertex
    // colours, so this darkens the finished world + hand by (1 - scale) (exact in full light,
    // a bit brighter than vanilla in the dark). The HUD is drawn later, by edit.py, unaffected.
    if (cam.darkScale > 0) {
      if (!darkQuad) {
        darkQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthTest: false, depthWrite: false }))
        darkScene = new THREE.Scene(); darkScene.add(darkQuad); darkCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      }
      darkQuad.material.opacity = Math.min(1, cam.darkScale)
      const ac = renderer.autoClear; renderer.autoClear = false
      renderer.render(darkScene, darkCam); renderer.autoClear = ac
    }
    if (POST) runPost(cam, tick)
    return true
  }
}

// Rain and snow columns (WeatherEffectRenderer): one quad per column, 1 block wide, turned to face
// the camera, from the heightmap to camera + 10. The texture spans the quad's width; v runs 0.25 per
// block plus the column's scroll; alpha fades with distance. Columns come from render.js.
let weatherMats = null, weatherMeshes = []
async function drawWeather (cam) {
  for (const m of weatherMeshes) { scene.remove(m); m.geometry.dispose() }
  weatherMeshes = []
  const cols = cam.weather
  if (!cols || !cols.length) return
  if (!weatherMats) {   // the weather pipeline uses particle.fsh: discards alpha below 0.1
    weatherMats = []
    for (const n of ['rain', 'snow']) {
      const t = await new THREE.TextureLoader().loadAsync(`/assets/env/${n}.png`).catch(() => null)
      if (t) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping }
      weatherMats.push(t ? new THREE.MeshBasicMaterial({ map: t, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true, alphaTest: 0.1 }) : null)
    }
  }
  for (const kind of [0, 1]) {
    const mat = weatherMats[kind]; if (!mat) continue
    const pos = [], uv = [], col = [], idx = []
    for (const [x, z, b, t, u, v, a, snow, lr, lg, lbl] of cols) {
      if (snow !== kind) continue
      const dx = x + 0.5 - cam.x, dz = z + 0.5 - cam.z, d = Math.hypot(dx, dz) || 1
      const hx = -dz / d * 0.5, hz = dx / d * 0.5, n = pos.length / 3
      pos.push(x + 0.5 - hx, t, z + 0.5 - hz, x + 0.5 + hx, t, z + 0.5 + hz, x + 0.5 + hx, b, z + 0.5 + hz, x + 0.5 - hx, b, z + 0.5 - hz)
      uv.push(u, b * 0.25 + v, u + 1, b * 0.25 + v, u + 1, t * 0.25 + v, u, t * 0.25 + v)
      for (let k = 0; k < 4; k++) col.push(lr, lg, lbl, a)
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
    }
    if (!pos.length) continue
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
    g.setIndex(idx)
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 3
    scene.add(m); weatherMeshes.push(m)
  }
}

// The end portal surface (TheEndPortalRenderer + the rendertype_end_portal shader): end_sky.png
// darkness plus 15 layers of end_portal.png sampled in screen space, each scaled, rotated and
// drifting with time, tinted with the shader's colour table. Double-sided (seen from below too).
let END_MAT = null
const END_TIME = { value: 0 }
const END_LOADS = []
function endPortalMaterial () {
  if (END_MAT) return END_MAT
  const load = (url) => {
    const t = new THREE.TextureLoader().load(url)
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace
    END_LOADS.push(new Promise((resolve) => { const i = setInterval(() => { if (t.image && t.image.complete !== false) { clearInterval(i); resolve() } }, 10) }))
    return t
  }
  END_MAT = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { sky: { value: load('/assets/env/end_sky.png') }, tex: { value: load('/assets/env/entity/end_portal.png') }, time: END_TIME },
    // texProj0 = projection_from_position(gl_Position): (xy + w) / 2, zw kept
    vertexShader: `varying vec4 vProj;
      void main() { vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p; vProj = vec4((p.xy + p.w) * 0.5, p.zw); }`,
    // rendertype_end_portal.fsh as written: end_sky x COLORS[0], then 15 layers of end_portal.png
    // through end_portal_layer(i) = mat4(scale * rotate) * translate * SCALE_TRANSLATE (GLSL
    // column-major: the translate and the 0.25 terms act through w), sampled with textureProj
    fragmentShader: `
      uniform sampler2D sky; uniform sampler2D tex; uniform float time; varying vec4 vProj;
      const vec3 C[16] = vec3[](vec3(0.022087,0.098399,0.110818), vec3(0.011892,0.095924,0.089485), vec3(0.027636,0.101689,0.100326), vec3(0.046564,0.109883,0.114838),
        vec3(0.064901,0.117696,0.097189), vec3(0.063761,0.086895,0.123646), vec3(0.084817,0.111994,0.166380), vec3(0.097489,0.154120,0.091064),
        vec3(0.106152,0.131144,0.195191), vec3(0.097721,0.110188,0.187229), vec3(0.133516,0.138278,0.148582), vec3(0.070006,0.243332,0.235792),
        vec3(0.196766,0.142899,0.214696), vec3(0.047281,0.315338,0.321970), vec3(0.204675,0.390010,0.302066), vec3(0.080955,0.314821,0.661491));
      const mat4 SCALE_TRANSLATE = mat4(0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.25, 0.25, 0.0, 1.0);
      mat2 rotZ(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      mat4 layerM(float layer) {
        mat4 translate = mat4(1.0, 0.0, 0.0, 17.0 / layer, 0.0, 1.0, 0.0, (2.0 + layer / 1.5) * (time * 1.5), 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
        mat2 rs = mat2((4.5 - layer / 4.0) * 2.0) * rotZ(radians((layer * layer * 4321.0 + layer * 9.0) * 2.0));
        return mat4(rs) * translate * SCALE_TRANSLATE;
      }
      vec3 proj(sampler2D s, vec4 q) { return texture2D(s, q.xy / q.w).rgb; }
      void main() {
        vec3 col = proj(sky, vProj) * C[0];
        for (int i = 0; i < 15; i++) col += proj(tex, vProj * layerM(float(i + 1))).rgb * C[i];
        gl_FragColor = vec4(col, 1.0);
      }`
  })
  return END_MAT
}

// Block outline (LevelRenderer.renderHitOutline: black lines, alpha 0.4, the block's shape grown by
// 0.002) and the crack overlay while mining (ModelBakery.DESTROY_TYPES: destroy_stage_N drawn over
// the block with DST_COLOR x SRC_COLOR x 2 blending, so the cracks darken and the rest is unchanged)
// Editorial landing marker (stunt.aimMarker; one_in_a_million): a translucent red square with a
// brighter rim, 1 block wide, lying flat on the floor at cam.aim {x, y, z, a}. Drawn after the
// water and over it (no depth write, polygon offset), fogged like the world so it sits in it.
let aimMesh = null
function drawAim (cam) {
  const a = cam.aim
  if (!a || !(a.a > 0)) { if (aimMesh) aimMesh.visible = false; return }
  if (!aimMesh) {
    const c = document.createElement('canvas'); c.width = c.height = 32
    const g = c.getContext('2d')
    g.fillStyle = 'rgba(255,40,40,0.25)'; g.fillRect(0, 0, 32, 32)
    g.strokeStyle = 'rgba(255,50,50,1)'; g.lineWidth = 6; g.strokeRect(3, 3, 26, 26)   // a rim of ~1/5 of the width
    const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.colorSpace = THREE.NoColorSpace
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
    aimMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
    aimMesh.rotation.x = -Math.PI / 2; aimMesh.renderOrder = 4; scene.add(aimMesh)
  }
  aimMesh.visible = true
  aimMesh.position.set(a.x, a.y + 0.01, a.z)
  // never under ~48 px across on a 1080-wide frame: from 60-120 blocks up a 1-block square was a
  // 6-10 px speck. Size in blocks for that fraction of the width at this distance and FOV
  const d = camera.position.distanceTo(aimMesh.position)
  const minS = 2 * d * Math.tan(camera.fov * Math.PI / 360) * camera.aspect * (48 / 1080)
  aimMesh.scale.setScalar(Math.max(1, minS))
  aimMesh.material.opacity = Math.min(1, a.a)
}
let outline = null, crack = null
function drawSelection (cam) {
  if (!outline) {
    outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, fog: false }))
    outline.renderOrder = 2; scene.add(outline)
    const mat = new THREE.MeshBasicMaterial({ map: opaqueMat.map, transparent: true, alphaTest: 0.1, depthWrite: false, fog: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.SrcColorFactor,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
    crack = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), mat)
    crack.userData.uv0 = Float32Array.from(crack.geometry.attributes.uv.array)
    crack.renderOrder = 2; scene.add(crack)
  }
  const tg = cam.target
  outline.visible = !!tg
  if (tg) {
    const [x0, y0, z0, x1, y1, z1] = tg.box
    outline.scale.set(x1 - x0 + 0.004, y1 - y0 + 0.004, z1 - z0 + 0.004)
    outline.position.set(tg.x + (x0 + x1) / 2, tg.y + (y0 + y1) / 2, tg.z + (z0 + z1) / 2)
  }
  const ck = cam.crack
  crack.visible = !!(ck && ck.uv)
  if (crack.visible) {
    crack.position.set(ck.x + 0.5, ck.y + 0.5, ck.z + 0.5)
    const a = crack.geometry.attributes.uv, u0 = crack.userData.uv0, { u, v, su, sv } = ck.uv
    for (let i = 0; i < a.count; i++) { a.array[i * 2] = u + u0[i * 2] * su; a.array[i * 2 + 1] = v + (1 - u0[i * 2 + 1]) * sv }
    a.needsUpdate = true
  }
}

// First-person held item (ItemInHandRenderer, right hand). Drawn in its own scene after the world
// with the depth buffer cleared, from a camera that only carries the view bob / hurt roll.
// the hand sits where vanilla puts it relative to a 16:9 view: same fraction of the half-width from
// the centre. Unscaled, our near-square game view cut tools and torches down to a sliver at the
// edge (every frame review flagged it).
const HAND_X = Math.min(1, (W / H) / (16 / 9))
// ...but moved by turning the whole rig about the eye, not by sliding it sideways: a slide changes the
// angle we see the item from, so tools went edge-on and the swing stretched toward the crosshair.
// Turning keeps vanilla's exact view of the item (its rest point lands where HAND_X puts it).
const HAND_TURN = new THREE.Matrix4().makeRotationY(Math.atan(0.56 / 0.72) - Math.atan(0.56 * HAND_X / 0.72))
const handScene = new THREE.Scene()
const handCam = new THREE.PerspectiveCamera(70, W / H, 0.05, 10)
const handCache = new Map()
const D2R = Math.PI / 180
let handObj = null
// ItemModelGenerator: a generated item is 1 pixel thick: the sprite front and back, plus a 1-pixel-wide
// side quad on every opaque pixel edge that borders transparency. A flat plane turned edge-on in the
// swing and vanished to a sliver (nether_portal review, flint and steel).
function extrudedItemGeometry (img) {
  const W0 = img.width, H0 = img.height, F = Math.min(W0, H0)   // animated sprites: first frame
  const c = document.createElement('canvas'); c.width = W0; c.height = H0
  const cx = c.getContext('2d'); cx.drawImage(img, 0, 0)
  const px = cx.getImageData(0, 0, F, F).data
  const opaque = (x, y) => x >= 0 && y >= 0 && x < F && y < F && px[(y * F + x) * 4 + 3] > 25
  const pos = [], uv = [], nor = [], idx = []
  const T = 0.5 / 16, s = 1 / F
  // pixel (x, y) from the top-left -> plane coords in [-0.5, 0.5], +y up; uv with flipY: v = 1 - y/H0
  const U = x => x / W0, V = y => 1 - y / H0
  function quad (a, b, cc, d, n, uvs) {
    const i = pos.length / 3
    for (const p of [a, b, cc, d]) pos.push(...p)
    for (let k = 0; k < 4; k++) nor.push(...n)
    uv.push(...uvs); idx.push(i, i + 1, i + 2, i, i + 2, i + 3)
  }
  const X = x => -0.5 + x * s, Y = y => 0.5 - y * s
  // front and back faces
  quad([X(0), Y(F), T], [X(F), Y(F), T], [X(F), Y(0), T], [X(0), Y(0), T], [0, 0, 1], [U(0), V(F), U(F), V(F), U(F), V(0), U(0), V(0)])
  quad([X(F), Y(F), -T], [X(0), Y(F), -T], [X(0), Y(0), -T], [X(F), Y(0), -T], [0, 0, -1], [U(F), V(F), U(0), V(F), U(0), V(0), U(F), V(0)])
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    if (!opaque(x, y)) continue
    const uc = (x + 0.5) / W0, vc = 1 - (y + 0.5) / H0, cu = [uc, vc, uc, vc, uc, vc, uc, vc]
    if (!opaque(x, y - 1)) quad([X(x), Y(y), T], [X(x + 1), Y(y), T], [X(x + 1), Y(y), -T], [X(x), Y(y), -T], [0, 1, 0], cu)
    if (!opaque(x, y + 1)) quad([X(x), Y(y + 1), -T], [X(x + 1), Y(y + 1), -T], [X(x + 1), Y(y + 1), T], [X(x), Y(y + 1), T], [0, -1, 0], cu)
    if (!opaque(x - 1, y)) quad([X(x), Y(y + 1), -T], [X(x), Y(y + 1), T], [X(x), Y(y), T], [X(x), Y(y), -T], [-1, 0, 0], cu)
    if (!opaque(x + 1, y)) quad([X(x + 1), Y(y + 1), T], [X(x + 1), Y(y + 1), -T], [X(x + 1), Y(y), -T], [X(x + 1), Y(y), T], [1, 0, 0], cu)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}
// A special item model (beds, chests, shulker boxes, heads, banners: render.js specialItem): its
// block-entity pieces in the model's 0..1 space, moved by -0.5 like ItemRenderer does after the display
// transform. Returns { obj, mat } with one mat that lights every piece.
const _beBuilder = new BlockEntityLayer(null)
async function specialItemObject (sp, d) {
  const model = new THREE.Group(), mats = []
  for (const b of sp.pieces) { const r = await _beBuilder.build(b); model.add(r.obj); mats.push(...r.mats) }
  model.position.set(-0.5, -0.5, -0.5)
  const obj = new THREE.Group(), tr = (d && d.translation) || [0, 0, 0], ro = (d && d.rotation) || [0, 0, 0], sc = (d && d.scale) || [1, 1, 1]
  obj.position.set(tr[0] / 16, tr[1] / 16, tr[2] / 16)
  obj.rotation.set(ro[0] * D2R, ro[1] * D2R, ro[2] * D2R, 'XYZ')
  obj.scale.set(sc[0], sc[1], sc[2])
  obj.add(model)
  return { obj, mat: { userData: {}, color: { setRGB: (...c) => { for (const m of mats) m.color.setRGB(...c) } } } }
}
async function handObject (h) {
  const ck = h.key + (h.glint ? '#glint' : '')
  if (handCache.has(ck)) return handCache.get(ck)
  let inner = null, mat = null
  if (h.special) {
    // the model's display.firstperson_righthand (item/template_bed: rotation [30, 160, 0], translation [0, 3, 0], scale 0.375)
    const r = await specialItemObject(h.special, h.special.display.firstperson_righthand)
    inner = r.obj; mat = r.mat
  } else if (h.state !== undefined && entities && entities.blockModels.has(h.state)) {
    const bm = entities.blockModels.get(h.state)
    const m = new THREE.Mesh(bm.geo, bm.mat.clone()); m.position.set(-0.5, -0.5, -0.5); mat = m.material
    inner = new THREE.Group(); inner.add(m)
    // models/block/block.json display.firstperson_righthand: rotation [0, 45, 0], scale 0.4
    inner.rotation.set(0, 45 * D2R, 0); inner.scale.setScalar(0.4)
  } else if (h.tex) {
    let t = null
    try { t = await loadTexture(`/assets/env/${h.tex}.png`) } catch (e) {}
    if (t) {
      t.flipY = true; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true
      mat = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.1, side: THREE.DoubleSide })
      const q = new THREE.Mesh(extrudedItemGeometry(t.image), mat)
      inner = new THREE.Group(); inner.add(q)
      // models/item/generated.json display.firstperson_righthand: rotation [0, -90, 25],
      // translation [1.13, 3.2, 1.13] (pixels), scale 0.68
      inner.position.set(1.13 / 16, 3.2 / 16, 1.13 / 16)
      inner.rotation.set(0, -90 * D2R, 25 * D2R, 'XYZ'); inner.scale.setScalar(0.68)
    }
  }
  const out = inner ? { obj: new THREE.Group(), mat } : null
  if (out) { out.obj.add(inner); out.obj.matrixAutoUpdate = false }
  if (out && h.glint && mat && !h.special) glintify(mat, h.state !== undefined ? 8 : 0.25)
  handCache.set(ck, out)
  return out
}
// Enchantment glint (RenderType.glint: glint.fsh + GLINT_TEXTURING): enchanted_glint_item.png (blur:
// linear filtering), uv = translate(-fx, fy) * rotZ(10 deg) * scale(8) * the item's atlas uv, with
// ms * glintSpeed 0.5 * 8 giving fx = (t % 110000) / 110000 and fy = (t % 30000) / 30000; blended
// SRC_COLOR, ONE (adds glint^2) and faded by fog. Our sprites have their own 0..1 uv instead of the
// item atlas's 16/512, so they scale by 8 * 16/512 = 0.25; block items keep the atlas uv x 8.
const GLINT = { tex: null, ms: { value: 0 } }
async function loadGlint () {   // at init: a texture still loading when a frame is drawn samples black
  try { GLINT.tex = await new THREE.TextureLoader().loadAsync('/assets/env/misc/enchanted_glint_item.png') } catch (e) { GLINT.tex = new THREE.Texture() }
  GLINT.tex.wrapS = GLINT.tex.wrapT = THREE.RepeatWrapping; GLINT.tex.colorSpace = THREE.NoColorSpace
  GLINT.tex.magFilter = THREE.LinearFilter; GLINT.tex.minFilter = THREE.LinearFilter; GLINT.tex.generateMipmaps = false
}
function glintify (mat, scale) {
  if (!GLINT.tex) {
    GLINT.tex = new THREE.TextureLoader().load('/assets/env/misc/enchanted_glint_item.png')
    GLINT.tex.wrapS = GLINT.tex.wrapT = THREE.RepeatWrapping; GLINT.tex.colorSpace = THREE.NoColorSpace
    GLINT.tex.magFilter = THREE.LinearFilter; GLINT.tex.minFilter = THREE.LinearFilter; GLINT.tex.generateMipmaps = false
  }
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlint = { value: GLINT.tex }; sh.uniforms.uGlintMs = GLINT.ms; sh.uniforms.uGlintS = { value: scale }
    sh.fragmentShader = 'uniform sampler2D uGlint;\nuniform float uGlintMs;\nuniform float uGlintS;\n' + sh.fragmentShader.replace('#include <fog_fragment>', `{
      float gt = uGlintMs * 4.0;
      vec2 guv = vMapUv * uGlintS;
      float gc = cos(0.17453), gs = sin(0.17453);
      guv = vec2(gc * guv.x - gs * guv.y, gs * guv.x + gc * guv.y) + vec2(-mod(gt, 110000.0) / 110000.0, mod(gt, 30000.0) / 30000.0);
      vec3 gl = texture2D(uGlint, guv).rgb * 0.75;   // glint.fsh x GlintAlpha (Glint Strength, default 0.75), then SRC_COLOR squares it
      gl_FragColor.rgb += gl * gl;
    }
    #include <fog_fragment>`)
  }
  mat.customProgramCacheKey = () => `glint${scale}`
  mat.needsUpdate = true
  return mat
}
// Third-person held item (ItemInHandLayer -> ItemRenderer, ItemDisplayContext.THIRD_PERSON_RIGHT_HAND):
// the model's display transform (translation in pixels, rotation XYZ in degrees, scale; resolved from
// the jar's model parents by render.js), then translate(-0.5) for block models. Sprite items use the
// same 1-pixel-thick extruded geometry as the first-person hand (already centred).
async function thirdPersonItem (h) {
  if (h.special) return specialItemObject(h.special, h.display || h.special.display.thirdperson_righthand)
  const d = h.display || { rotation: [0, 0, 0], translation: [0, 3, 1], scale: [0.55, 0.55, 0.55] }
  let inner = null, mat = null
  if (h.state !== undefined && entities && entities.blockModels.has(h.state)) {
    const bm = entities.blockModels.get(h.state)
    const m = new THREE.Mesh(bm.geo, bm.mat.clone()); m.position.set(-0.5, -0.5, -0.5); mat = m.material
    inner = new THREE.Group(); inner.add(m)
  } else if (h.tex) {
    let t = null
    try { t = await loadTexture(`/assets/env/${h.tex}.png`) } catch (e) {}
    if (!t) return null
    t.flipY = true; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true
    mat = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.1, side: THREE.DoubleSide, fog: true })
    inner = new THREE.Group(); inner.add(new THREE.Mesh(extrudedItemGeometry(t.image), mat))
  }
  if (!inner) return null
  if (h.glint && mat) glintify(mat, h.state !== undefined ? 8 : 0.25)
  const obj = new THREE.Group(), tr = d.translation || [0, 0, 0], ro = d.rotation || [0, 0, 0], sc = d.scale || [1, 1, 1]
  obj.position.set(tr[0] / 16, tr[1] / 16, tr[2] / 16)
  obj.rotation.set(ro[0] * D2R, ro[1] * D2R, ro[2] * D2R, 'XYZ')
  obj.scale.set(sc[0], sc[1], sc[2])
  obj.add(inner)
  return { obj, mat }
}
// The bare arm when nothing is held (ItemInHandRenderer.renderPlayerArm + PlayerModel.rightArm,
// default wide Steve skin). Model units are pixels (1/16 block), used as-is like the game does.
let ARM = null
async function armObject () {
  if (ARM) return ARM
  const t = await loadTexture('/assets/env/entity/player/wide/steve.png')
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace
  const g = new THREE.BoxGeometry(4 / 16, 12 / 16, 4 / 16)
  // box UV at (40,16), size 4x12x4 on a 64x64 skin; BoxGeometry face order: +x, -x, +y, -y, +z, -z
  // model space is y-down: y=0 (the shoulder, the skin's sleeve rows) is our -y end, so side faces run
  // top-down from -y and the 'top' rect goes on -y, the 'bottom' (the fist) on +y
  const rect = { px: [48, 20, 4, 12], nx: [40, 20, 4, 12], py: [48, 16, 4, 4], ny: [44, 16, 4, 4], pz: [44, 20, 4, 12], nz: [52, 20, 4, 12] }
  const uv = g.attributes.uv, order = ['px', 'nx', 'py', 'ny', 'pz', 'nz']
  for (let f = 0; f < 6; f++) {
    const [u, v, w, h] = rect[order[f]]
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k, a = uv.array[i * 2], b = uv.array[i * 2 + 1]
      uv.array[i * 2] = (u + a * w) / 64; uv.array[i * 2 + 1] = (v + (f === 2 || f === 3 ? 1 - b : b) * h) / 64   // flipY off: v runs top-down; sides flipped (y-down model)
    }
  }
  uv.needsUpdate = true
  const mat = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.1 })
  const mesh = new THREE.Mesh(g, mat)
  mesh.position.set(-6 / 16, 6 / 16, 0)      // the cube's centre: pivot (-5,2,0) + (-3..1, -2..10, -2..2)
  const obj = new THREE.Group(); obj.add(mesh); obj.matrixAutoUpdate = false
  ARM = { obj, mat }
  return ARM
}

let darkQuad = null, darkScene = null, darkCam = null
async function drawHand (cam) {
  if (handObj) { handScene.remove(handObj.obj); handObj = null }
  const h = cam.hand
  if (!h || cam.dead) return false
  if (!h.key) {   // empty hand: the arm
    const r = await armObject()
    const a = h.swing || 0, g = Math.sqrt(a)
    const M = HAND_TURN.clone().multiply(new THREE.Matrix4().makeTranslation(-0.3 * Math.sin(g * Math.PI) + 0.64, 0.4 * Math.sin(g * Math.PI * 2) - 0.6 + (h.equip || 0) * -0.6, -0.4 * Math.sin(a * Math.PI) - 0.72))
    M.multiply(new THREE.Matrix4().makeRotationY(45 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationY(Math.sin(g * Math.PI) * 70 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationZ(Math.sin(a * a * Math.PI) * -20 * D2R))
    M.multiply(new THREE.Matrix4().makeTranslation(-1, 3.6, 3.5))
    M.multiply(new THREE.Matrix4().makeRotationZ(120 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationX(200 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationY(-135 * D2R))
    M.multiply(new THREE.Matrix4().makeTranslation(5.6, 0, 0))
    r.obj.matrix.copy(M)
    r.mat.color.setRGB(...(Array.isArray(h.light) ? h.light : [h.light ?? 1, h.light ?? 1, h.light ?? 1]))
    handScene.add(r.obj); handObj = { obj: r.obj }
    handCam.position.set(0, 0, 0)
    handCam.rotation.set(-(cam.bobPitch || 0), 0, cam.roll || 0)
    if (cam.bobX) handCam.translateX(cam.bobX)
    if (cam.bobY) handCam.translateY(cam.bobY)
    handCam.updateMatrixWorld()
    return true
  }
  const r = await handObject(h)
  if (!r) return false
  // swing (renderArmWithItem + applyItemArmAttackTransform), equip drop (applyItemArmTransform)
  // eating / drinking (applyEatTransform before applyItemArmTransform, no swing): f = remaining use
  // ticks + 1, g = f / duration; a bob of |cos(f / 4 pi)| x 0.1 while g < 0.8, and h = 1 - g^27 raises
  // the item to the mouth: T(0.6 h, -0.5 h, 0) Ry(90 h) Rx(10 h) Rz(30 h)
  const use = h.use
  const a = use ? 0 : (h.swing || 0), sa = Math.sin(Math.sqrt(a) * Math.PI)
  const M = HAND_TURN.clone().multiply(new THREE.Matrix4().makeTranslation(-0.4 * sa, 0.2 * Math.sin(Math.sqrt(a) * Math.PI * 2), -0.2 * Math.sin(a * Math.PI)))
  if (use) {
    const f = Math.max(0, use.d - use.e) + 1, g = f / use.d
    if (g < 0.8) M.multiply(new THREE.Matrix4().makeTranslation(0, Math.abs(Math.cos(f / 4 * Math.PI) * 0.1), 0))
    const k = 1 - Math.pow(Math.min(1, g), 27)
    M.multiply(new THREE.Matrix4().makeTranslation(k * 0.6, k * -0.5, 0))
    M.multiply(new THREE.Matrix4().makeRotationY(k * 90 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationX(k * 10 * D2R))
    M.multiply(new THREE.Matrix4().makeRotationZ(k * 30 * D2R))
  }
  M.multiply(new THREE.Matrix4().makeTranslation(0.56, -0.52 + (h.equip || 0) * -0.6, -0.72))
  const f = Math.sin(a * a * Math.PI)
  M.multiply(new THREE.Matrix4().makeRotationY((45 + f * -20) * D2R))
  M.multiply(new THREE.Matrix4().makeRotationZ(sa * -20 * D2R))
  M.multiply(new THREE.Matrix4().makeRotationX(sa * -80 * D2R))
  M.multiply(new THREE.Matrix4().makeRotationY(-45 * D2R))
  r.obj.matrix.copy(M)
  if (r.mat) r.mat.color.setRGB(...(Array.isArray(h.light) ? h.light : [h.light ?? 1, h.light ?? 1, h.light ?? 1]))
  handScene.add(r.obj); handObj = r
  handCam.position.set(0, 0, 0)
  handCam.rotation.set(-(cam.bobPitch || 0), 0, cam.roll || 0)
  if (cam.bobX) handCam.translateX(cam.bobX)
  if (cam.bobY) handCam.translateY(cam.bobY)
  handCam.updateMatrixWorld()
  return true
}
window.HB_READY = true
