// Material palettes for the parametric pieces: `variant: { palette: 'spruce' }` (or a palette object, or overrides:
// `variant: { palette: 'oak', roof: 'deepslate_tile_stairs' }`).
const PALETTES = {
  // warm oak walls, spruce roof, cobble footing: the default storybook look
  oak: { wall: 'oak_planks', frame: 'oak_log', beam: 'stripped_oak_log', roof: 'spruce_stairs', gable: 'oak_planks', floor: 'spruce_planks', footing: 'cobblestone', footing2: 'mossy_cobblestone', fence: 'oak_fence', gate: 'oak_fence_gate', door: 'oak', trap: 'spruce_trapdoor', slab: 'spruce_slab', stair: 'oak_stairs', glass: 'glass_pane' },
  // darker northern look
  spruce: { wall: 'spruce_planks', frame: 'stripped_spruce_log', beam: 'spruce_log', roof: 'dark_oak_stairs', gable: 'spruce_planks', floor: 'dark_oak_planks', footing: 'cobblestone', footing2: 'andesite', fence: 'spruce_fence', gate: 'spruce_fence_gate', door: 'spruce', trap: 'dark_oak_trapdoor', slab: 'dark_oak_slab', stair: 'spruce_stairs', glass: 'glass_pane' },
  // pale birch with a dark roof
  birch: { wall: 'birch_planks', frame: 'stripped_dark_oak_log', beam: 'dark_oak_log', roof: 'dark_oak_stairs', gable: 'birch_planks', floor: 'oak_planks', footing: 'stone_bricks', footing2: 'mossy_stone_bricks', fence: 'dark_oak_fence', gate: 'dark_oak_fence_gate', door: 'dark_oak', trap: 'dark_oak_trapdoor', slab: 'dark_oak_slab', stair: 'birch_stairs', glass: 'glass_pane' },
  // white plaster and dark timber (Tudor), slate roof
  plaster: { wall: 'calcite', frame: 'stripped_dark_oak_log', beam: 'dark_oak_log', roof: 'deepslate_tile_stairs', gable: 'calcite', floor: 'spruce_planks', footing: 'stone_bricks', footing2: 'cracked_stone_bricks', fence: 'dark_oak_fence', gate: 'dark_oak_fence_gate', door: 'dark_oak', trap: 'dark_oak_trapdoor', slab: 'deepslate_tile_slab', stair: 'dark_oak_stairs', glass: 'glass_pane' },
  // a stone house: cobble walls, oak trim, a mossy roof of stone bricks
  stone: { wall: 'cobblestone', frame: 'stripped_oak_log', beam: 'oak_log', roof: 'stone_brick_stairs', gable: 'oak_planks', floor: 'oak_planks', footing: 'stone_bricks', footing2: 'mossy_stone_bricks', fence: 'oak_fence', gate: 'oak_fence_gate', door: 'oak', trap: 'oak_trapdoor', slab: 'stone_brick_slab', stair: 'oak_stairs', glass: 'glass_pane' },
  // a sandstone house for desert sets
  sand: { wall: 'smooth_sandstone', frame: 'cut_sandstone', beam: 'stripped_jungle_log', roof: 'sandstone_stairs', gable: 'smooth_sandstone', floor: 'jungle_planks', footing: 'sandstone', footing2: 'chiseled_sandstone', fence: 'jungle_fence', gate: 'jungle_fence_gate', door: 'jungle', trap: 'jungle_trapdoor', slab: 'sandstone_slab', stair: 'jungle_stairs', glass: 'glass_pane' }
}

function palette (v = {}) {
  const base = typeof v.palette === 'object' ? v.palette : (PALETTES[v.palette || 'oak'] || PALETTES.oak)
  const out = { ...PALETTES.oak, ...base }
  for (const k of Object.keys(PALETTES.oak)) if (v[k]) out[k] = v[k]
  return out
}

module.exports = { PALETTES, palette }
