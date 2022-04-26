import { WEAPON_RAW_PREFIXES } from "./entities/constants";
import { ChestEntity, PotEntity, VirtualEntity } from "./entity";
import { Event, EventType } from "./events";
import { Player } from "./player";
import { RNG } from "./rng";
import { getCoordOption, getCoordRNG, getTileset, Terrain } from "./terrain";
import { RegionType, WorldType } from "./terrainGen/constants";
import { Entity, EntityType } from "./types";

export type RegionData = [
  world: WorldType,
  regionType: RegionType,
  x: number,
  y: number
];

const DEFAULT_REGION_DATA: RegionData = [
  WorldType.Overworld,
  RegionType.Field,
  0,
  0,
];
const ODDS_DUNGEON = 14;
const ODDS_TOWN = 9;
const CLEANUP_TTL = 60 * 1000;

export const MAX_ENTITIES_PER_FIELD = 5;
export const MAX_ENTITIES_PER_DUNGEON = 4;
export const MAX_SOLDIERS_PER_TOWN = 3;
export const MIN_SOLDIERS_PER_TOWN = 1;
export const SOLDIER_IN_HOUSE_ODDS = 2;
export const TRADER_IN_HOUSE_ODDS = 4;
export const WOLF_ODDS = 4;
export const DEATH_WAKER_ODDS = 4;

export const MAX_ITEMS_PER_SHOP_CHEST = 10;
export const MIN_ITEMS_PER_SHOP_CHEST = 1;
export const ODDS_SHOP_CHEST_EMPTY = 2; // out of 10
export const ODDS_SHOP_CHEST_POTION = 2; // out of 10
export const ODDS_SHOP_CHEST_SWORD = 2; // out of 10
export const ODDS_SHOP_CHEST_GUARD = 1; // out of 10
export const SHOP_CHEST_SWORD_MAX_LEV = 10;

export const TICK_INTERVAL = 100;

const regionCache: Record<string, Region> = {};

export class Region {
  id: string;
  type: RegionType;
  parentID: string | WorldType;
  x: number;
  y: number;

  cleanup: null | NodeJS.Timer = null;

  terrain: Terrain;
  entities: Set<Entity> = new Set();
  entityMap: Map<string, Entity> = new Map();

  ticker: NodeJS.Timer;

  constructor(
    parent: string | WorldType,
    type: RegionType,
    x: number,
    y: number
  ) {
    this.parentID = parent;
    this.type = type;
    this.x = x;
    this.y = y;

    this.id = getRegionID(parent, type, x, y);
    regionCache[this.id] = this;

    this.terrain = new Terrain(this);

    this.populateEntities();

    this.ticker = setInterval(this.tick, TICK_INTERVAL);
  }

  prepForDeletion() {
    this.cleanup = setTimeout(() => {
      delete regionCache[this.id];
      clearInterval(this.ticker);
    }, CLEANUP_TTL);
  }

  tick = () => {
    let hasPlayers = false;
    for (let entity of this.entities.values()) {
      if (entity instanceof Player) {
        hasPlayers = true;
      }
      entity.tick();
    }

    if (!hasPlayers && !this.cleanup) {
      this.prepForDeletion();
    }
  };

  broadcast(event: Event) {
    for (let entity of this.entities) {
      if (entity === event.origin) {
        continue;
      }
      entity.onEvent(event);
    }
  }

  isDungeonEntrance() {
    if (
      this.parentID !== WorldType.Overworld &&
      this.parentID !== WorldType.Ether
    ) {
      return false;
    }

    return isDungeonPos(this.x, this.y);
  }
  isTown() {
    if (
      this.parentID !== WorldType.Overworld &&
      this.parentID !== WorldType.Ether &&
      this.type !== RegionType.Field
    ) {
      return false;
    }

    return isTownPos(this.x, this.y);
  }
  populateEntities() {
    const rng = getCoordRNG(this.x, this.y);

    const placeEntity = (entType: EntityType) => {
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
      case RegionType.Field:
        this.populateFieldEntities(rng, placeEntity);
        break;

      case RegionType.Shop:
        placeEntity(EntityType.homely);
        placeEntity(EntityType.homely);

      case RegionType.House:
        placeEntity(EntityType.homely);
        placeEntity(EntityType.homely);
        this.populateHouseEntities(rng, placeEntity);
        break;

      case RegionType.Dungeon:
        this.populateDungeonEntities(rng, placeEntity);
        break;
    }
  }

  populateFieldEntities(rng: RNG, placeEntity: (type: EntityType) => void) {
    const entCount = rng.uniform() * MAX_ENTITIES_PER_FIELD;
    for (let i = 0; i < entCount; i++) {
      placeEntity(i % WOLF_ODDS === 0 ? EntityType.wolf : EntityType.sheep);
    }

    if (this.isTown()) {
      const soldierCount = rng.range(
        MIN_SOLDIERS_PER_TOWN,
        MAX_SOLDIERS_PER_TOWN
      );
      for (let i = 0; i < soldierCount; i++) {
        placeEntity(EntityType.soldier);
      }

      placeEntity(EntityType.bully);
      placeEntity(EntityType.child);
      placeEntity(EntityType.child);
      placeEntity(EntityType.child);

      placeEntity(EntityType.trader);
    }
  }

  populateHouseEntities(rng: RNG, placeEntity: (type: EntityType) => void) {
    if (rng.range(0, SOLDIER_IN_HOUSE_ODDS) === 0) {
      placeEntity(EntityType.soldier);
    }
    if (rng.range(0, TRADER_IN_HOUSE_ODDS) === 0) {
      placeEntity(EntityType.trader);
    }

    const totalTiles = this.terrain.tiles.length;

    for (let i = 0; i < totalTiles; i++) {
      const tile = this.terrain.tiles[i];
      if (tile === 58) {
        this.placeChestShop(
          i % this.terrain.height,
          i / this.terrain.width,
          rng
        );
      } else if (tile === 59) {
        this.placePotShop(i % this.terrain.height, i / this.terrain.width, rng);
      }
    }
  }

  populateDungeonEntities(rng: RNG, placeEntity: (type: EntityType) => void) {
    const entCount = rng.range(0, MAX_ENTITIES_PER_DUNGEON);
    for (let i = 0; i < entCount; i++) {
      placeEntity(
        i % DEATH_WAKER_ODDS === 0 ? EntityType.deathWaker : EntityType.zombie
      );
    }
  }

  placeChestShop(x: number, y: number, rng: RNG) {
    const chest = new ChestEntity(this, x, y);
    this.addEntity(chest);

    const items = rng.range(MIN_ITEMS_PER_SHOP_CHEST, MAX_ITEMS_PER_SHOP_CHEST);
    for (let i = 0; i < items; i++) {
      let code;
      if (rng.range(0, 10) < ODDS_SHOP_CHEST_SWORD) {
        code = `wsw.${
          WEAPON_RAW_PREFIXES[rng.range(0, WEAPON_RAW_PREFIXES.length - 1)]
        }.${rng.range(1, SHOP_CHEST_SWORD_MAX_LEV)}`;
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
  placePotShop(x: number, y: number, rng: RNG) {
    const pot = new PotEntity(this, x, y, rng.range(0, 3));
    this.addEntity(pot);

    if (rng.range(0, 10) < ODDS_SHOP_CHEST_EMPTY) {
      return;
    } else if (rng.range(0, 10) < ODDS_SHOP_CHEST_GUARD) {
      pot.addEntity(EntityType.soldier);
      return;
    } else if (rng.range(0, 10) < ODDS_SHOP_CHEST_SWORD) {
      pot.addItem(
        `wsw.${
          WEAPON_RAW_PREFIXES[rng.range(0, WEAPON_RAW_PREFIXES.length - 1)]
        }.${rng.range(0, SHOP_CHEST_SWORD_MAX_LEV)}`
      );
    } else {
      if (rng.range(0, 10) < ODDS_SHOP_CHEST_POTION) {
        pot.addItem(`p${rng.range(0, 10)}`);
      } else {
        pot.addItem(`f${rng.range(0, 9)}`);
      }
    }
  }

  addEntity(entity: Entity) {
    // console.log(`Adding ${entity.eid} (${entity.type}) to ${this.id}`);
    this.entities.add(entity);
    this.entityMap.set(entity.eid, entity);

    this.broadcast(
      new Event(
        EventType.REGION_ENTRANCE,
        `${entity}\n${entity.x} ${entity.y}`,
        entity
      )
    );

    for (let exEnt of this.entities) {
      if (exEnt === entity) {
        continue;
      }

      entity.onEvent(
        new Event(EventType.REGION_ENTRANCE, `${exEnt}\n${exEnt.x} ${exEnt.y}`)
      );
    }

    if (entity instanceof Player && this.cleanup) {
      clearTimeout(this.cleanup);
      this.cleanup = null;
    }
  }

  removeEntity(entity: Entity) {
    this.entities.delete(entity);
    this.entityMap.delete(entity.eid);
    this.broadcast(new Event(EventType.REGION_EXIT, entity.eid, entity));
  }

  getEntity(eid: string) {
    return this.entityMap.get(eid) || null;
  }

  spawn(entType: EntityType, x: number, y: number) {
    const ent = new VirtualEntity(entType, this);
    ent.setPosition(x, y);
    this.addEntity(ent);
    return ent.eid;
  }

  getRoot() {
    let parent = this.parentID;
    while (parent !== WorldType.Overworld && parent !== WorldType.Ether) {
      parent = exports.getRegionData(parent)[0];
    }
    return parent;
  }

  toString() {
    return JSON.stringify({
      level: this.terrain.renderDownTilemap(),
      hitmap: this.terrain.hitmap.toArray(),
      // rd: this.terrain.roundingOut && [...this.terrain.roundingOut],
      tileset: getTileset(this.getRoot(), this.type),
      can_slide: true,
      h: this.terrain.height,
      w: this.terrain.width,
      x: this.terrain.x,
      y: this.terrain.y,
    });
  }
}

function getRegionID(parent: string, type: string, x: number, y: number) {
  return `${parent},${type}:${x}:${y}`;
}

export function getRegion(
  parent: string | WorldType,
  type: RegionType,
  x: number,
  y: number
) {
  const regionID = getRegionID(parent, type, x, y);

  if (!isValidRegionID(regionID)) {
    console.error(`Invalid region ID requested: ${regionID}`);
    return null;
  }

  if (regionID in regionCache) {
    if (regionCache[regionID].cleanup) {
      clearTimeout(regionCache[regionID].cleanup!);
    }
    return regionCache[regionID];
  }

  return new Region(parent, type, x, y);
}

export function getRegionData(id: string): RegionData {
  const split = id.split(",");
  if (split.length < 2) {
    return DEFAULT_REGION_DATA;
  }

  const regSplit = split[split.length - 1].split(":");
  if (regSplit.length !== 3) {
    return DEFAULT_REGION_DATA;
  }

  const parent = split.slice(0, -1).join(",") as RegionData[0];
  const x = parseFloat(regSplit[1]);
  const y = parseFloat(regSplit[2]);
  return [parent, regSplit[0] as RegionData[1], x, y];
}

function isDungeonPos(x: number, y: number): boolean {
  return (x === 1 && y === 0) || getCoordOption(x, y, ODDS_DUNGEON);
}

function isTownPos(x: number, y: number): boolean {
  return (x === 0 && y === 0) || getCoordOption(x, y, ODDS_TOWN);
}

function isValidRegionID(id: string): boolean {
  const [parent, type] = getRegionData(id);
  if (parent === WorldType.Overworld || parent === WorldType.Ether) {
    return type === RegionType.Field;
  }

  if (!isValidRegionID(parent)) {
    return false;
  }

  const [parentWorldType, parentType, parentX, parentY] = getRegionData(parent);
  if (type === RegionType.Dungeon) {
    return (
      parentType === RegionType.Dungeon ||
      (parentType === RegionType.Field && isDungeonPos(parentX, parentY))
    );
  }
  if (type === RegionType.Field) {
    return (
      parentWorldType === WorldType.Overworld ||
      parentWorldType === WorldType.Ether
    );
  }

  return true;
}
