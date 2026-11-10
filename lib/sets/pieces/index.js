// Every parametric piece by name (lib/sets/index.js place/build; docs/sets.md lists them with anchors).
module.exports = {
  cottage: require('./cottage'),
  house2: require('./house2'),
  farmhouse: require('./farmhouse'),
  ...require('./small'),      // well, camp, graveyard
  ...require('./town'),       // market, church, watchtower
  ...require('./land'),       // lighthouse, bridge, mine
  ...require('./inside'),     // basement, room
  ...require('./more'),       // tavern, windmill, dock
  ...require('./station')     // station (a rail station at the end of a line)
}
