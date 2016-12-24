const entity = require('./entity');
const events = require('./events');
const player = require('./player');
const terrain = require('./terrain');


const DEFAULT_REGION_DATA = [terrain.WORLD_OVERWORLD, terrain.REGIONTYPE_FIELD, 0, 0];
const ODDS_DUNGEON = 14;
const ODDS_TOWN = 14;
const CLEANUP_TTL = 60 * 1000;

const MAX_ENTITIES_PER_FIELD = 5;
const MAX_ENTITIES_PER_DUNGEON = 4;
const MAX_SOLDIERS_PER_TOWN = 3;
const MIN_SOLDIERS_PER_TOWN = 1;
const SOLDIER_IN_HOUSE_ODDS = 2;
const TRADER_IN_HOUSE_ODDS = 4;
const WOLF_ODDS = 4;
const DEATH_WAKER_ODDS = 4;

const MAX_ITEMS_PER_SHOP_CHEST = 10;
const MIN_ITEMS_PER_SHOP_CHEST = 1;
const ODDS_SHOP_CHEST_EMPTY = 2;  // out of 10
const ODDS_SHOP_CHEST_POTION = 2; // out of 10
const ODDS_SHOP_CHEST_SWORD = 2;  // out of 10
const ODDS_SHOP_CHEST_GUARD = 1;  // out of 10
const SHOP_CHEST_SWORD_MAX_LEV = 10;

const TICK_INTERVAL = 100;

const regionCache = {};


class Region {
  constructor(parent, type, x, y) {
    this.parentID = parent;
    this.type = type;
    this.x = x;
    this.y = y;

    this.id = getRegionID(parent, type, x, y);
    regionCache[this.id] = this;

    this.terrain = new terrain.Terrain(this);

    this.entities = new Set();
    this.entityMap = new Map();

    this.populateEntities();

    this.cleanup = null;

    this.ticker = setInterval(this.tick.bind(this), TICK_INTERVAL);
  }

  prepForDeletion() {
    this.cleanup = setTimeout(() => {
      delete regionCache[this.id];
      clearInterval(this.ticker);
    }, CLEANUP_TTL);
  }

  tick() {
    let hasPlayers = false;
    for (let entity of this.entities.values()) {
      if (entity instanceof player.Player) {
        hasPlayers = true;
      }
      entity.tick();
    }

    if (!hasPlayers && !this.cleanup) {
      this.prepForDeletion();
    }
  }

  broadcast(event) {
    for (let entity of this.entities) {
      if (entity === event.origin) {
        continue;
      }
      entity.onEvent(event);
    }
  }

  isDungeonEntrance() {
    if (this.parentID !== terrain.WORLD_OVERWORLD && this.parentID !== terrain.WORLD_ETHER) {
      return false;
    }

    return isDungeonPos(this.x, this.y);
  }
  isTown() {
    if (
      this.parentID !== terrain.WORLD_OVERWORLD &&
      this.parentID !== terrain.WORLD_ETHER &&
      this.type !== terrain.REGIONTYPE_FIELD
    ) {
      return false;
    }

    return isTownPos(this.x, this.y);
  }
  populateEntities() {
    const rng = terrain.getCoordRNG(this.x, this.y);

    const placeEntity = entType => {
      let entW = 1;
      let entH = 1;
      while (true) {
        const x = rng.uniform() * (this.terrain.width - 2 - entW) + 1;
        const y = rng.uniform() * (this.terrain.height - 2 - entH) + 1;
        if (!this.terrain.hitmap.fits(x, y, entW, entH)) {
          continue;
        }
        this.spawn(entType, x, y);
        break;
      }
    };

    switch (this.type) {
      case terrain.REGIONTYPE_FIELD:
        this.populateFieldEntities(rng, placeEntity);
        break;

      case terrain.REGIONTYPE_SHOP:
        placeEntity('homely');
        placeEntity('homely');

      case terrain.REGIONTYPE_HOUSE:
        placeEntity('homely');
        placeEntity('homely');
        this.populateHouseEntities(rng, placeEntity);
        break;

      case terrain.REGIONTYPE_DUNGEON:
        this.populateDungeonEntities(rng, placeEntity);
        break;
    }
  }

  populateFieldEntities(rng, placeEntity) {
    const entCount = rng.uniform() * MAX_ENTITIES_PER_FIELD;
    for (let i = 0; i < entCount; i++) {
      placeEntity(i % WOLF_ODDS === 0 ? 'wolf' : 'sheep');
    }

    if (this.isTown()) {
      const soldierCount = rng.range(MIN_SOLDIERS_PER_TOWN, MAX_SOLDIERS_PER_TOWN);
      for (let i = 0; i < soldierCount; i++) {
        placeEntity('soldier');
      }

      placeEntity('bully');
      placeEntity('child');
      placeEntity('child');
      placeEntity('child');

      placeEntity('trader');
    }
  }

  populateHouseEntities(rng, placeEntity) {
    if (rng.range(0, SOLDIER_IN_HOUSE_ODDS) === 0) {
      placeEntity('soldier');
    }
    if (rng.range(0, TRADER_IN_HOUSE_ODDS) === 0) {
      placeEntity('trader');
    }

    const totalTiles = this.terrain.width * this.terrain.height;

    for (let i = 0; i < totalTiles; i++) {
      const tile = this.terrain.tiles[i % this.terrain.height][i / this.terrain.width];
      if (tile === 58) {
        this.placeChestShop(
          i / this.terrain.width,
          i % this.terrain.height + 0.75,
          rng
        );
      } else if (tile === 59) {
        this.placePotShop(
          i / this.terrain.width,
          i % this.terrain.height + 1,
          rng
        );
      }
    }
  }

  populateDungeonEntities(rng, placeEntity) {
    const entCount = rng.range(0, MAX_ENTITIES_PER_DUNGEON);
    for (let i = 0; i < entCount; i++) {
      placeEntity(i % DEATH_WAKER_ODDS === 0 ? 'death_waker' : 'zombie');
    }
  }

  placeChestShop(x, y, rng) {
    const chest = new entity.ChestEntity(this, x, y);
    this.addEntity(chest);

    const items = rng.range(MIN_ITEMS_PER_SHOP_CHEST, MAX_ITEMS_PER_SHOP_CHEST);
    for (let i = 0; i < items; i++) {
      let code;
      if (rng.range(0, 10) < ODDS_SHOP_CHEST_SWORD) {
        code = `wsw.${
          entity.WEAPON_RAW_PREFIXES[rng.range(0, entities.WEAPON_RAW_PREFIXES.length - 1)]
        }.${
          rng.range(0, SHOP_CHEST_SWORD_MAX_LEV)
        }`;

      } else {
        if (rng.range(0, 10) < ODDS_SHOP_CHEST_POTION) {
          code = `p${rng.range(0, 10)}`;
        } else {
          code = `f${rng.range(0, 9)}`;
        }
      }
      chest.addItem(code);
    }
  }
  placePotShop(x, y, rng) {
    const pot = new entity.PotEntity(this, x, y);
    this.addEntity(pot);

    if (rng.rnage(0, 10) < ODDS_SHOP_CHEST_EMPTY) {
      return;

    } else if (rng.range(0, 10) < ODDS_SHOP_CHEST_GUARD) {
      pot.addEntity('soldier');
      return;

    } else if (rng.range(0, 10) < ODDS_SHOP_CHEST_SWORD) {
      pot.addItem(
        `wsw.${
          entity.WEAPON_RAW_PREFIXES[rng.range(0, entities.WEAPON_RAW_PREFIXES.length - 1)]
        }.${
          rng.range(0, SHOP_CHEST_SWORD_MAX_LEV)
        }`
      );

    } else {
      if (rng.range(0, 10) < ODDS_SHOP_CHEST_POTION) {
        pot.addItem(`p${rng.range(0, 10)}`);
      } else {
        pot.addItem(`f${rng.range(0, 9)}`);
      }
    }
  }

  addEntity(entity) {
    this.entities.add(entity);
    this.entityMap.set(entity.eid, entity);

    this.broadcast(
      new events.Event(
        events.REGION_ENTRANCE,
        `${entity}\n${entity.x} ${entity.y}`,
        entity
      )
    );

    for (let exEnt of this.entities) {
      if (exEnt === entity) {
        continue;
      }

      entity.onEvent(
        new events.Event(
          events.REGION_ENTRANCE,
          `${exEnt}\n${exEnt.x} ${exEnt.y}`
        )
      );
    }

    if (entity instanceof player.Player && this.cleanup) {
      clearTimeout(this.cleanup);
      this.cleanup = null;
    }

  }

  removeEntity(entity) {
    this.entities.delete(entity);
    this.entityMap.delete(entity.eid);
    this.broadcast(
      new events.Event(events.REGION_EXIT, entity.eid, entity)
    );
  }

  getEntity(eid) {
    return this.entityMap.get(eid) || null;
  }

  spawn(entType, x, y) {
    const ent = new entity.VirtualEntity(entType);
    ent.setLocation(this);
    ent.setPosition(x, y);
    this.addEntity(ent);
    return ent.eid;
  }

  getRoot() {
    let parent = this.parentID;
    while (parent !== terrain.WORLD_OVERWORLD && parent !== terrain.WORLD_ETHER) {
      parent = exports.getRegionData(parent)[0];
    }
    return parent;
  }

  toString() {
    return JSON.stringify({
      level: this.terrain.renderDownTilemap(),
      hitmap: this.terrain.hitmap.toArray(),
      tileset: terrain.getTileset(this.getRoot(), this.type),
      can_slide: true,
      h: this.terrain.height,
      w: this.terrain.width,
      x: this.terrain.x,
      y: this.terrain.y,
    });
  }
}


function getRegionID(parent, type, x, y) {
  return `${parent},${type}:${x}:${y}`;
}


exports.getRegion = function(parent, type, x, y) {
  const regionID = getRegionID(parent, type, x, y);

  if (!isValidRegionID(regionID)) {
    console.error(`Invalid region ID requested: ${regionID}`);
    return null;
  }

  if (regionID in regionCache) {
    if (regionCache[regionID].cleanup) {
      clearTimeout(regionCache[regionID].cleanup);
    }
    return regionCache[regionID];
  }

  return new Region(parent, type, x, y);
};

const getRegionData = exports.getRegionData = function(id) {
  const split = id.split(',');
  if (split.length < 2) {
    return DEFAULT_REGION_DATA;
  }

  const regSplit = split[split.length - 1].split(':');
  if (regSplit.length !== 3) {
    return DEFAULT_REGION_DATA;
  }

  const parent = split.slice(0, -1).join(',');
  const x = parseFloat(regSplit[1]);
  const y = parseFloat(regSplit[2]);
  return [parent, regSplit[0], x, y];
};


function isDungeonPos(x, y) {
  return x === 1 && y === 0 || terrain.getCoordOption(x, y, ODDS_DUNGEON);
}

function isTownPos(x, y) {
  return x === 0 && y === 0 || terrain.getCoordOption(x, y, ODDS_TOWN);
}


function isValidRegionID(id) {
  const [parent, type] = getRegionData(id);
  if (parent === terrain.WORLD_OVERWORLD || parent === terrain.WORLD_ETHER) {
    return type === terrain.REGIONTYPE_FIELD;
  }

  if (!isValidRegionID(parent)) {
    return false;
  }

  const [, parentType, parentX, parentY] = getRegionData(parent);
  if (type === terrain.REGIONTYPE_DUNGEON) {
    return parentType === terrain.REGIONTYPE_DUNGEON || parentType === terrain.REGIONTYPE_FIELD && isDungeonPos(parentX, parentY);
  }
  if (type === terrain.REGIONTYPE_FIELD) {
    return parentType === terrain.WORLD_OVERWORLD || parentType === terrain.WORLD_ETHER;
  }

  return true;
}
