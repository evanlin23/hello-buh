// Vendored from prismarine-viewer (MIT, see LICENSE.prismarine-viewer). Changes for HelloBuh:
// vanilla face shading + AO curve baked into vertex colors, no y<0 culling, shade:false support.
const { Vec3 } = require('vec3')

const tints = require('minecraft-data')('1.16.2').tints   // only redstone + constant tints are used now

// Biome colours from the client jar (build_assets.py -> biomes.json), blended over a 5x5 area like
// vanilla's default biome blend (radius 2).
let BIOMES = {}
function setBiomeColors (b) { BIOMES = b }
const tintCache = new Map()
function hexToGl (c) { return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255] }
function biomeTint (world, pos, kind) {
  const key = `${kind}|${pos.x}|${pos.y}|${pos.z}`
  let v = tintCache.get(key)
  if (v) return v
  let r = 0, g = 0, b = 0, n = 0
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const bl = world.getBlock(pos.offset(dx, 0, dz))
      const bio = bl && bl.biome && BIOMES[bl.biome.name]
      if (!bio) continue
      const c = hexToGl(bio[kind]); r += c[0]; g += c[1]; b += c[2]; n++
    }
  }
  v = n ? [r / n, g / n, b / n] : hexToGl(kind === 'water' ? 0x3f76e4 : kind === 'grass' ? 0x91bd59 : 0x77ab2f)
  tintCache.set(key, v)
  return v
}
// Fixed foliage colours (FoliageColor): evergreen, birch, mangrove; lily pad.
const FIXED = { spruce_leaves: 0x619961, birch_leaves: 0x80a755, mangrove_leaves: 0x92c648, lily_pad: 0x208030 }

// Lightmap: light level -> brightness, as LightTexture does at noon with default gamma (0.5).
function lightmap (level) {
  const f = level / 15
  const b = f / (4 - 3 * f)
  const g = 1 - Math.pow(1 - b, 4)
  return Math.max(0.04, (b + (g - b) * 0.5) * 0.96 + 0.04)
}
function lightOf (world, pos) { const [s, b] = world.getLight(pos); return Math.max(s, b) }

for (const key of Object.keys(tints)) {
  tints[key] = prepareTints(tints[key])
}

function prepareTints (tints) {
  const map = new Map()
  const defaultValue = tintToGl(tints.default)
  for (let { keys, color } of tints.data) {
    color = tintToGl(color)
    for (const key of keys) {
      map.set(`${key}`, color)
    }
  }
  return new Proxy(map, {
    get: (target, key) => {
      return target.has(key) ? target.get(key) : defaultValue
    }
  })
}

function tintToGl (tint) {
  const r = (tint >> 16) & 0xff
  const g = (tint >> 8) & 0xff
  const b = tint & 0xff
  return [r / 255, g / 255, b / 255]
}

const elemFaces = {
  up: {
    dir: [0, 1, 0],
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [0, 1, 1, 0, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 0, 0, 0],
      [1, 1, 0, 1, 0]
    ]
  },
  down: {
    dir: [0, -1, 0],
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 1, 0, 1],
      [0, 0, 1, 1, 1],
      [1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0]
    ]
  },
  east: {
    dir: [1, 0, 0],
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1]
    ]
  },
  west: {
    dir: [-1, 0, 0],
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 1, 1]
    ]
  },
  north: {
    dir: [0, 0, -1],
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0],
      [0, 1, 0, 1, 0]
    ]
  },
  south: {
    dir: [0, 0, 1],
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0]
    ]
  }
}

function getLiquidRenderHeight (world, block, type) {
  if (!block || block.type !== type) return 1 / 9
  if (block.metadata === 0) { // source block
    const blockAbove = world.getBlock(block.position.offset(0, 1, 0))
    if (blockAbove && blockAbove.type === type) return 1
    return 8 / 9
  }
  return ((block.metadata >= 8 ? 8 : 7 - block.metadata) + 1) / 9
}

// Vanilla LiquidBlockRenderer heights: a block's own height (source 8/9, flowing (8-level)/9,
// 1 with the same fluid above), 0 for non-solid non-fluid, -1 for solid (ignored). Each surface
// corner is the weighted average of the 4 blocks sharing it (sources weigh 10x).
// Blocks that hold water in vanilla (fluid state = water): water itself, the always-waterlogged
// plants, and anything with waterlogged=true. They render water and never get water walls.
const WATER_PLANTS = new Set(['kelp', 'kelp_plant', 'seagrass', 'tall_seagrass', 'bubble_column'])
function isWaterish (b) {
  if (!b) return false
  if (b.name === 'water' || WATER_PLANTS.has(b.name)) return true
  const p = b.getProperties()
  return p.waterlogged === true || p.waterlogged === 'true'
}
function sameFluid (b, type, water) { return b && (water ? isWaterish(b) : b.type === type) }

function fluidHeight (world, pos, type, water) {
  const b = world.getBlock(pos)
  if (!b) return 0
  if (sameFluid(b, type, water)) {
    const above = world.getBlock(pos.offset(0, 1, 0))
    if (sameFluid(above, type, water)) return 1
    if (b.name !== 'water' && b.name !== 'lava') return 8 / 9
    const lvl = b.metadata
    return lvl === 0 || lvl >= 8 ? 8 / 9 : (8 - lvl) / 9
  }
  return b.isCube && !b.transparent ? -1 : 0
}
function cornerHeight (center, a, b, cornerFn) {
  if (a >= 1 || b >= 1) return 1
  let sum = 0, w = 0
  const add = (h) => { if (h >= 0.8) { sum += h * 10; w += 10 } else if (h >= 0) { sum += h; w += 1 } }
  if (a > 0 || b > 0) { const c = cornerFn(); if (c >= 1) return 1; add(c) }
  add(center); add(a); add(b)
  return w ? sum / w : 0
}

function renderLiquid (world, cursor, texture, type, biome, water, attr) {
  const h = (dx, dz) => fluidHeight(world, cursor.offset(dx, 0, dz), type, water)
  const own = h(0, 0)
  const hN = h(0, -1), hS = h(0, 1), hE = h(1, 0), hW = h(-1, 0)
  // cornerHeights index = z*2 + x  (x,z in {0,1})
  const cornerHeights = [
    cornerHeight(own, hN, hW, () => h(-1, -1)),
    cornerHeight(own, hN, hE, () => h(1, -1)),
    cornerHeight(own, hS, hW, () => h(-1, 1)),
    cornerHeight(own, hS, hE, () => h(1, 1))
  ].map(v => Math.min(1, v) - (v < 1 ? 0.001 : 0))

  for (const face in elemFaces) {
    const { dir, corners } = elemFaces[face]
    const isUp = dir[1] === 1

    const neighbor = world.getBlock(cursor.offset(...dir))
    if (!neighbor) continue
    if (sameFluid(neighbor, type, water)) continue
    // vanilla isFaceOccludedByNeighbor: a full opaque block hides the face, the top one included
    // (a lava top under stone was drawn, lit 0 = black, and showed through from below)
    if (neighbor.isCube && !neighbor.transparent) continue

    let tint = [1, 1, 1]
    const lm = lightmap(lightOf(world, isUp ? cursor.offset(0, 1, 0) : cursor))
    if (water) {
      const m = faceShade(dir) * lm
      tint = biomeTint(world, cursor, 'water')
      tint = [tint[0] * m, tint[1] * m, tint[2] * m]
    } else {
      tint = [lm, lm, lm]
    }

    const u = texture.u
    const v = texture.v
    const su = texture.su
    const sv = texture.sv

    // lava is opaque in vanilla (solid render type): draw it in the opaque pass so depth sorts
    // it; water stays translucent
    const opaque = !water
    const P = opaque ? attr.positions : attr.t_positions, N = opaque ? attr.normals : attr.t_normals
    const UV = opaque ? attr.uvs : attr.t_uvs, C = opaque ? attr.colors : attr.t_colors
    const n0 = P.length / 3
    // vanilla LiquidBlockRenderer: sides and bottom face outward only (culled from inside); the
    // top surface also gets its backward face so it shows from underwater
    if (!opaque && isUp) { if (!attr.t_double) attr.t_double = new Set(); attr.t_double.add(n0 / 4) }
    for (const pos of corners) {
      const height = cornerHeights[pos[2] * 2 + pos[0]]
      P.push(
        (pos[0] ? 1 : 0) + (cursor.x & 15) - 8,
        (pos[1] ? height : 0) + (cursor.y & 15) - 8,
        (pos[2] ? 1 : 0) + (cursor.z & 15) - 8)
      N.push(...dir)
      UV.push(pos[3] * su + u, pos[4] * sv * (pos[1] ? 1 : height) + v)
      C.push(tint[0], tint[1], tint[2])
    }
    if (opaque) attr.indices.push(n0, n0 + 1, n0 + 2, n0 + 2, n0 + 1, n0 + 3, n0, n0 + 2, n0 + 1, n0 + 2, n0 + 3, n0 + 1)
  }
}

function vecadd3 (a, b) {
  if (!b) return a
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function vecsub3 (a, b) {
  if (!b) return a
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function matmul3 (matrix, vector) {
  if (!matrix) return vector
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
  ]
}

function matmulmat3 (a, b) {
  const te = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]

  const a11 = a[0][0]; const a12 = a[1][0]; const a13 = a[2][0]
  const a21 = a[0][1]; const a22 = a[1][1]; const a23 = a[2][1]
  const a31 = a[0][2]; const a32 = a[1][2]; const a33 = a[2][2]

  const b11 = b[0][0]; const b12 = b[1][0]; const b13 = b[2][0]
  const b21 = b[0][1]; const b22 = b[1][1]; const b23 = b[2][1]
  const b31 = b[0][2]; const b32 = b[1][2]; const b33 = b[2][2]

  te[0][0] = a11 * b11 + a12 * b21 + a13 * b31
  te[1][0] = a11 * b12 + a12 * b22 + a13 * b32
  te[2][0] = a11 * b13 + a12 * b23 + a13 * b33

  te[0][1] = a21 * b11 + a22 * b21 + a23 * b31
  te[1][1] = a21 * b12 + a22 * b22 + a23 * b32
  te[2][1] = a21 * b13 + a22 * b23 + a23 * b33

  te[0][2] = a31 * b11 + a32 * b21 + a33 * b31
  te[1][2] = a31 * b12 + a32 * b22 + a33 * b32
  te[2][2] = a31 * b13 + a32 * b23 + a33 * b33

  return te
}

function buildRotationMatrix (axis, degree) {
  const radians = degree / 180 * Math.PI
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const axis0 = { x: 0, y: 1, z: 2 }[axis]
  const axis1 = (axis0 + 1) % 3
  const axis2 = (axis0 + 2) % 3

  const matrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]

  matrix[axis0][axis0] = 1
  matrix[axis1][axis1] = cos
  matrix[axis1][axis2] = -sin
  matrix[axis2][axis1] = +sin
  matrix[axis2][axis2] = cos

  return matrix
}

// Vanilla's fixed per-face brightness (ClientLevel.getShade): up 1.0, down 0.5, N/S 0.8, E/W 0.6.
function faceShade (dir) {
  if (dir[1] > 0.5) return 1.0
  if (dir[1] < -0.5) return 0.5
  if (Math.abs(dir[2]) > 0.5) return 0.8
  return 0.6
}
// Vanilla smooth-lighting AO: each solid occluder darkens a corner (0.2 per block, like
// Block.getShadeBrightness); ao = number of open neighbours (3 = fully open).
const AO_CURVE = [0.4, 0.6, 0.8, 1.0]

function renderElement (world, cursor, element, doAO, attr, globalMatrix, globalShift, block, biome) {
  const cullIfIdentical = block.name.indexOf('glass') >= 0

  for (const face in element.faces) {
    const eFace = element.faces[face]
    const { corners, mask1, mask2 } = elemFaces[face]
    const dir = matmul3(globalMatrix, elemFaces[face].dir)

    if (eFace.cullface) {
      const neighbor = world.getBlock(cursor.plus(new Vec3(...dir)))
      if (!neighbor) continue
      if (cullIfIdentical && neighbor.type === block.type) continue
      if (!neighbor.transparent && neighbor.isCube) continue
    }

    const minx = element.from[0]
    const miny = element.from[1]
    const minz = element.from[2]
    const maxx = element.to[0]
    const maxy = element.to[1]
    const maxz = element.to[2]

    const u = eFace.texture.u
    const v = eFace.texture.v
    const su = eFace.texture.su
    const sv = eFace.texture.sv

    const ndx = Math.floor(attr.positions.length / 3)
    const shade = element.shade === false ? 1 : faceShade(dir)
    // Smooth lighting: light is sampled outside the face (the neighbour it faces) for faces on
    // the block boundary, and at the block itself for inner faces (plants, etc).
    const centerPos = eFace.cullface ? cursor.offset(...dir) : cursor
    const centerLight = lightOf(world, centerPos)

    let tint = [1, 1, 1]
    if (eFace.tintindex !== undefined) {
      if (eFace.tintindex === 0) {
        if (block.name === 'redstone_wire') {
          tint = tints.redstone[`${block.getProperties().power}`]
        } else if (FIXED[block.name] !== undefined) {
          tint = hexToGl(FIXED[block.name])
        } else if (block.name.includes('leaves') || block.name === 'vine') {
          tint = biomeTint(world, cursor, 'foliage')
        } else {
          tint = biomeTint(world, cursor, 'grass')
        }
      }
    }

    // UV rotation
    const r = eFace.rotation || 0
    const uvcs = Math.cos(r * Math.PI / 180)
    const uvsn = -Math.sin(r * Math.PI / 180)

    let localMatrix = null
    let localShift = null

    if (element.rotation) {
      localMatrix = buildRotationMatrix(
        element.rotation.axis,
        element.rotation.angle
      )

      localShift = vecsub3(
        element.rotation.origin,
        matmul3(
          localMatrix,
          element.rotation.origin
        )
      )
    }

    const aos = []
    for (const pos of corners) {
      let vertex = [
        (pos[0] ? maxx : minx),
        (pos[1] ? maxy : miny),
        (pos[2] ? maxz : minz)
      ]

      vertex = vecadd3(matmul3(localMatrix, vertex), localShift)
      vertex = vecadd3(matmul3(globalMatrix, vertex), globalShift)
      vertex = vertex.map(v => v / 16)

      attr.positions.push(
        vertex[0] + (cursor.x & 15) - 8,
        vertex[1] + (cursor.y & 15) - 8,
        vertex[2] + (cursor.z & 15) - 8
      )

      attr.normals.push(...dir)

      const baseu = (pos[3] - 0.5) * uvcs - (pos[4] - 0.5) * uvsn + 0.5
      const basev = (pos[3] - 0.5) * uvsn + (pos[4] - 0.5) * uvcs + 0.5
      attr.uvs.push(baseu * su + u, basev * sv + v)

      let light = 1
      let vlight = lightmap(centerLight)
      if (doAO) {
        const dx = pos[0] * 2 - 1
        const dy = pos[1] * 2 - 1
        const dz = pos[2] * 2 - 1
        const cornerDir = matmul3(globalMatrix, [dx, dy, dz])
        const side1Dir = matmul3(globalMatrix, [dx * mask1[0], dy * mask1[1], dz * mask1[2]])
        const side2Dir = matmul3(globalMatrix, [dx * mask2[0], dy * mask2[1], dz * mask2[2]])
        const side1 = world.getBlock(cursor.offset(...side1Dir))
        const side2 = world.getBlock(cursor.offset(...side2Dir))
        const corner = world.getBlock(cursor.offset(...cornerDir))

        const side1Block = (side1 && side1.isCube) ? 1 : 0
        const side2Block = (side2 && side2.isCube) ? 1 : 0
        const cornerBlock = (corner && corner.isCube) ? 1 : 0
        // vanilla blend: average the 4 light samples, opaque ones borrow the centre's light
        const ls = [centerLight,
          side1Block ? centerLight : lightOf(world, cursor.offset(...side1Dir)),
          side2Block ? centerLight : lightOf(world, cursor.offset(...side2Dir)),
          (cornerBlock || (side1Block && side2Block)) ? centerLight : lightOf(world, cursor.offset(...cornerDir))]
        vlight = lightmap((ls[0] + ls[1] + ls[2] + ls[3]) / 4)

        // TODO: correctly interpolate ao light based on pos (evaluate once for each corner of the block)

        const ao = (side1Block && side2Block) ? 0 : (3 - (side1Block + side2Block + cornerBlock))
        light = AO_CURVE[ao]
        aos.push(ao)
      }

      attr.colors.push(tint[0] * light * shade * vlight, tint[1] * light * shade * vlight, tint[2] * light * shade * vlight)
    }

    if (doAO && aos[0] + aos[3] >= aos[1] + aos[2]) {
      attr.indices.push(
        ndx, ndx + 3, ndx + 2,
        ndx, ndx + 1, ndx + 3
      )
    } else {
      attr.indices.push(
        ndx, ndx + 1, ndx + 2,
        ndx + 2, ndx + 1, ndx + 3
      )
    }
  }
}

function getSectionGeometry (sx, sy, sz, world, blocksStates) {
  const attr = {
    sx: sx + 8,
    sy: sy + 8,
    sz: sz + 8,
    positions: [],
    normals: [],
    colors: [],
    uvs: [],
    t_positions: [],
    t_normals: [],
    t_colors: [],
    t_uvs: [],
    indices: []
  }

  const cursor = new Vec3(0, 0, 0)
  for (cursor.y = sy; cursor.y < sy + 16; cursor.y++) {
    for (cursor.z = sz; cursor.z < sz + 16; cursor.z++) {
      for (cursor.x = sx; cursor.x < sx + 16; cursor.x++) {
        const block = world.getBlock(cursor)
        const biome = block.biome.name
        if (block.variant === undefined) {
          block.variant = getModelVariants(block, blocksStates)
        }

        if (block.name !== 'water' && isWaterish(block) && blocksStates.water) {
          const wv = getModelVariants(world.getBlock(cursor).name === 'water' ? block : { name: 'water', getProperties: () => ({ level: '0' }) }, blocksStates)[0]
          if (wv && wv.model) renderLiquid(world, cursor, wv.model.textures.particle, world.getBlock(cursor).type, biome, true, attr)
        }
        for (const variant of block.variant) {
          if (!variant || !variant.model) continue

          if (block.name === 'water') {
            renderLiquid(world, cursor, variant.model.textures.particle, block.type, biome, true, attr)
          } else if (block.name === 'lava') {
            renderLiquid(world, cursor, variant.model.textures.particle, block.type, biome, false, attr)
          } else {
            let globalMatrix = null
            let globalShift = null

            for (const axis of ['x', 'y', 'z']) {
              if (axis in variant) {
                if (!globalMatrix) globalMatrix = buildRotationMatrix(axis, -variant[axis])
                else globalMatrix = matmulmat3(globalMatrix, buildRotationMatrix(axis, -variant[axis]))
              }
            }

            if (globalMatrix) {
              globalShift = [8, 8, 8]
              globalShift = vecsub3(globalShift, matmul3(globalMatrix, globalShift))
            }

            // translucent blocks (nether portal): their quads go to the blended pass
            let A = attr
            if (block.name === 'nether_portal') {
              A = { positions: attr.t_positions, normals: attr.t_normals, uvs: attr.t_uvs, colors: attr.t_colors, indices: [] }
            }
            for (const element of variant.model.elements) {
              renderElement(world, cursor, element, variant.model.ao, A, globalMatrix, globalShift, block, biome)
            }
          }
        }
      }
    }
  }

  // Keep translucent quads separate so the page can draw them blended, after the opaque pass.
  // One winding (outward), except water top surfaces, which get both (seen from underwater too).
  // Both windings everywhere showed a lone water block's inside walls from above, like a glass box.
  attr.t_indices = []
  let ndx = 0
  for (let i = 0; i < attr.t_positions.length / 12; i++) {
    attr.t_indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3)
    if (attr.t_double && attr.t_double.has(i)) attr.t_indices.push(ndx, ndx + 2, ndx + 1, ndx + 2, ndx + 3, ndx + 1)
    ndx += 4
  }
  delete attr.t_double
  return attr
}

function parseProperties (properties) {
  if (typeof properties === 'object') { return properties }

  const json = {}
  for (const prop of properties.split(',')) {
    const [key, value] = prop.split('=')
    json[key] = value
  }
  return json
}

function matchProperties (block, properties) {
  if (!properties) { return true }

  properties = parseProperties(properties)
  const blockProps = block.getProperties()
  if (properties.OR) {
    return properties.OR.some((or) => matchProperties(block, or))
  }
  for (const prop in blockProps) {
    if (typeof properties[prop] === 'string' && !properties[prop].split('|').some((value) => value === blockProps[prop] + '')) {
      return false
    }
  }
  return true
}

function getModelVariants (block, blockStates) {
  // air, cave_air, void_air and so on...
  if (block.name.includes('air')) return []
  const state = blockStates[block.name] ?? blockStates.missing_texture
  if (!state) return []
  if (state.variants) {
    for (const [properties, variant] of Object.entries(state.variants)) {
      if (!matchProperties(block, properties)) continue
      if (variant instanceof Array) return [variant[0]]
      return [variant]
    }
  }
  if (state.multipart) {
    const parts = state.multipart.filter(multipart => matchProperties(block, multipart.when))
    let variants = []
    for (const part of parts) {
      if (part.apply instanceof Array) {
        variants = [...variants, ...part.apply]
      } else {
        variants = [...variants, part.apply]
      }
    }

    return variants
  }

  return []
}

module.exports = { getSectionGeometry, setBiomeColors, lightmap }
