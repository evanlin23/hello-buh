// "the town REALLY hates this shortcut 💀" (format "desire", lib/desire.js, r:r2e0a32): one locked high-angle camera
// on two cottages either side of a road. A dirt shortcut is worn across the lawn from door to door; the town answers
// with a fence, bushes, a tree, a boulder, a pond, walls along the road, a whole shed, and at last floods the lawn with
// lava. The path never gives an inch (owner r:r81cb9c): each obstacle lands on it and the path breaks straight
// through it (a slot cut through the fence, the bushes, the tree, the boulder, a causeway across the pond, gaps in the
// walls, a hole through the shed); the next one replaces the wreck on that side of the road. After the lava it comes
// back dead straight across it.
const { makeStunt, SHAPES } = require('../lib/desire')

const LEAVES = ['azalea_leaves[persistent=true]', 'flowering_azalea_leaves[persistent=true]', 'oak_leaves[persistent=true]']

module.exports = makeStunt({
  name: 'desire_town',
  caption: 'the town REALLY hates this shortcut 💀',
  red: 'REALLY',
  rounds: [
    { id: 'fence', card: 'FENCE', c: [-5, -5], slot: 'N', shape: SHAPES.fence(9, 'dark_oak_fence', 2), sound: [['block.wood.place', 1, 1], ['block.wood.place', 1, 0.8]] },
    { id: 'bush', card: 'BUSHES', c: [5, 5], slot: 'S', shape: SHAPES.blob(3, 3, LEAVES), sound: [['block.azalea_leaves.place', 1, 1], ['block.grass.place', 1, 0.8]] },
    { id: 'tree', card: 'A TREE', c: [-6, -6], slot: 'N', shape: SHAPES.tree(), sound: [['block.wood.place', 1, 0.7], ['block.grass.place', 1, 0.9]] },
    { id: 'boulder', card: 'A BOULDER', c: [5, 5], slot: 'S', shape: SHAPES.blob(3.4, 4, ['stone', 'cobblestone', 'andesite', 'mossy_cobblestone']), sound: [['block.stone.place', 1, 0.6], ['block.anvil.land', 0.5, 0.6]], color: 'yellow' },
    { id: 'pond', card: 'A POND', c: [-6, -6], slot: 'N', shape: SHAPES.pond(3.2), sound: [['item.bucket.empty', 1, 1], ['item.bucket.empty', 1, 0.8]], color: 'yellow' },
    { id: 'walls', card: 'WALLS', cardY: 0.14, shape: SHAPES.roadWalls(-18, 18, 3), sound: [['block.stone.place', 1, 0.8], ['block.stone.place', 1, 1.1]], color: 'orange' },
    { id: 'shed', card: 'A WHOLE SHED', c: [6, 6], slot: 'S', shape: SHAPES.shed(7, 5, 3), sound: [['block.wood.place', 1, 0.7], ['block.wood.place', 1, 1], ['block.anvil.land', 0.4, 0.8]], color: 'orange' },
    { id: 'lava', card: 'LAVA 🔥', flood: 'lava', color: 'red', cardSecs: 1.0, hold: 14 }
  ]
})
