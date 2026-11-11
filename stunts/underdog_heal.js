// "you can heal every mob in Minecraft..." (format "underdog", lib/underdog.js, r:r8dcdb4): a fast list in a desert,
// one station a beat, each mob already hurt (summoned at low health: no hit with no cause) and really healed in vanilla: a tamed wolf eats steak (its tail comes back
// up), a tamed cat eats cod, a horse eats a whole hay bale, a cracked iron golem gets three iron ingots (the cracks go
// one level each), a zombie villager is cured (weakness, a golden apple, the shaking, a villager). Then the flip:
// "...but who heals him?" over a snow golem alone in the desert sun. Offered a snow block, nothing happens; the desert
// melts it (vanilla: snow golems take damage in hot biomes), on a soft sad NCS track. (No pumpkin: the renderer has no
// SnowGolemHeadLayer yet, so it is summoned sheared, which vanilla allows, and shows its face.)
const { makeStunt } = require('../lib/underdog')

module.exports = makeStunt({
  name: 'underdog_heal',
  caption: 'you can heal every mob in Minecraft...',
  red: 'every',
  twist: '...but who heals HIM?',
  beats: [
    { id: 'wolf', card: 'WOLF + STEAK', mob: 'wolf', nbt: '{Owner:{owner},Sitting:1b,NoAI:1b,CollarColor:14b,Silent:1b,attributes:[{id:"minecraft:max_health",base:40}],Health:12f}', dist: 2.3, aimY: 0.6, yaw: 45,
      beatSound: ['entity.wolf.whine', 1, 1],
      feeds: [['cooked_beef', ['entity.generic.eat', 1, 1]], ['cooked_beef', ['entity.generic.eat', 1, 1.1]]],
      fixedSound: ['entity.wolf.pant', 1, 1] },
    { id: 'cat', card: 'CAT + FISH', mob: 'cat', nbt: '{Owner:{owner},Sitting:1b,NoAI:1b,variant:"minecraft:tabby",CollarColor:3b,Silent:1b,Health:4f}', dist: 2.1, aimY: 0.6,
      beatSound: ['entity.cat.stray_ambient', 1, 0.9],
      feeds: [['cod', ['entity.cat.eat', 1, 1]], ['cod', ['entity.cat.eat', 1, 1.1]]],
      fixedSound: ['entity.cat.purreow', 1, 1] },
    { id: 'horse', card: 'HORSE + HAY BALE', mob: 'horse', nbt: '{Tame:1b,Variant:3,NoAI:1b,Silent:1b,Health:8f}', dist: 3.6, aimY: 0.6,
      beatSound: ['entity.horse.breathe', 1, 0.8],
      feeds: [['hay_block', ['entity.horse.eat', 1, 1]]],
      fixedSound: ['entity.horse.ambient', 0.8, 1] },
    { id: 'golem', card: 'IRON GOLEM + IRON', mob: 'iron_golem', nbt: '{NoAI:1b,PlayerCreated:1b,Silent:1b,Health:20f}', dist: 4.2, aimY: 0.55, color: 'yellow',
      beatSound: ['entity.iron_golem.damage', 0.8, 1],
      feeds: [['iron_ingot', ['entity.iron_golem.repair', 1, 1]], ['iron_ingot', ['entity.iron_golem.repair', 1, 1.1]], ['iron_ingot', ['entity.iron_golem.repair', 1, 1.2]]] },
    { id: 'zombie', card: 'ZOMBIE VILLAGER', cardY: 0.12, cardSize: 84, mob: 'zombie_villager', nbt: '{NoAI:1b,Silent:1b,VillagerData:{type:"minecraft:desert",profession:"minecraft:farmer",level:1}}',
      dist: 3.4, aimY: 0.6, roof: true, cure: true, color: 'orange', later: '5 minutes later...' }
  ],
  forgotten: { mob: 'snow_golem', nbt: '{NoAI:1b,Pumpkin:0b}', dist: 3.4, tryItem: 'snow_block', calm: 20 }
})
