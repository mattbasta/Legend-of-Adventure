import { Region } from "./regions";
import * as rng from "./rng";
import { RegionType, WorldType } from "./terrainGen/constants";

import * as pairing from "./terrainGen/pairing";
import * as perlin from "./terrainGen/perlin";
import * as rounding from "./terrainGen/rounding";
import { Portal } from "./terrainGen/portal";
import { FIELD } from "./terrainGen/tilesets";
import { generateBuildings } from "./terrainGen/buildings";
import { generateTown } from "./terrainGen/towns";

export const DUNGEON_MIN_SIZE = 3;
export const DUNGEON_MAX_SIZE = 7;
export const DUNGEON_STAIRS_DOWN_ODDS = 7; // out of 10
export const DUNGEON_BOSS_ODDS = 3; // out of 10
export const DUNGEON_ANGEL_ODDS = 3; // out of 10

export const DUNGEON_STATUE_ODDS = 6; // out of 10

export const getCoordOption = (x: number, y: number, odds: number) =>
  pairing.getCoordInt(x, y) % odds === 0;
export const getCoordRNG = (x: number, y: number) =>
  new rng.MT(pairing.getCoordInt(x, y));

export const getNameRNG = (name: string) =>
  new rng.MT(pairing.getNameInt(name));
export const getNameChance = (name: string, odds: number) =>
  pairing.getNameInt(name) % odds === 0;

export const chance = (rng: rng.RNG) => rng.uniform() < 0.5;

const regionSizes: Record<RegionType, [number, number]> = {
  [RegionType.Field]: [100, 100],
  [RegionType.Dungeon]: [28, 28],
  [RegionType.Shop]: [52, 52],
  [RegionType.House]: [52, 52],
};

const HM_BUFF_DIST = 0.00001;

export class Hitmap {
  height: number;
  width: number;

  body: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.body = new Uint8Array((((this.width * this.height) / 8) | 0) + 1);
  }

  set(x: number, y: number) {
    const linearIndex = y * this.width + x;
    const index = (linearIndex / 8) | 0;
    const offset = 1 << (linearIndex % 8 | 0);
    this.body[index] = this.body[index] | offset;
  }

  unset(x: number, y: number) {
    const linearIndex = y * this.width + x;
    const index = (linearIndex / 8) | 0;
    const offset = 1 << (linearIndex % 8 | 0);
    this.body[index] = this.body[index] & ~offset;
  }

  fillArea(x: number, y: number, width: number, height: number) {
    x = x | 0;
    y = y | 0;
    width = width | 0;
    height = height | 0;
    const ey = y + height;
    const ex = x + width;
    for (let i = y; i < ey; i++) {
      for (let j = x; j < ex; j++) {
        this.set(j, i);
      }
    }
  }
  clearArea(x: number, y: number, width: number, height: number) {
    x = x | 0;
    y = y | 0;
    width = width | 0;
    height = height | 0;
    const ey = y + height;
    const ex = x + width;
    for (let i = y; i < ey; i++) {
      for (let j = x; j < ex; j++) {
        this.unset(j, i);
      }
    }
  }

  get(x: number, y: number): boolean {
    const linearIndex = y * this.width + x;
    return Boolean(this.body[(linearIndex / 8) | 0] & (1 << linearIndex % 8));
  }

  fits(x: number, y: number, w: number, h: number) {
    if (x < 1 || y - h < 1 || x > this.width - w - 1 || y > this.height - 1) {
      return false;
    }

    return !(
      this.get(y - HM_BUFF_DIST, x) ||
      this.get(y - h + HM_BUFF_DIST, x) ||
      this.get(y - HM_BUFF_DIST, x + w - HM_BUFF_DIST) ||
      this.get(y - h + HM_BUFF_DIST, x + w - HM_BUFF_DIST)
    );
  }

  apply(hitmap: Hitmap, x: number, y: number) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        if (this.get(j, i)) {
          hitmap.set(x + j, i + y);
        } else {
          hitmap.unset(x + j, i + y);
        }
      }
    }
  }

  toArray() {
    const output = new Array(this.height);
    for (let i = 0; i < this.height; i++) {
      output[i] = new Array(this.width);
      for (let j = 0; j < this.width; j++) {
        output[i][j] = this.get(j, i) ? 1 : 0;
      }
    }
    return output;
  }
}

export class Terrain {
  height: number;
  width: number;
  x: number;
  y: number;

  tiles: Uint16Array;
  hitmap: Hitmap;
  portals: Set<Portal> = new Set();

  constructor(region: Region) {
    [this.width, this.height] = regionSizes[region.type];
    this.x = region.x;
    this.y = region.y;

    this.tiles = new Uint16Array(this.width * this.height);
    // TODO: Replace this with something more sane
    this.hitmap = new Hitmap(this.width, this.height);

    this.portals = new Set();

    if (region.type === RegionType.Field) {
      const ng = new perlin.NoiseGenerator(125);
      ng.fillGrid(
        this.x * this.width,
        this.y * this.height,
        this.tiles,
        this.width,
        this.height
      );

      const tileset = FIELD;
      const roundingOut = rounding.round(this, tileset);
      // this.roundingOut = roundingOut;
    }

    if (region.isTown()) {
      generateTown(this);
    } else if (region.isDungeonEntrance()) {
      this.applyDungeonEntrance();
    } else if (region.type === RegionType.Dungeon) {
      this.applyDungeon();
    } else if (
      region.type === RegionType.House ||
      region.type === RegionType.Shop
    ) {
      generateBuildings(this, region.type, region.parentID);
    }
  }

  applyDungeonEntrance() {}
  applyDungeon() {}

  renderDownTilemap() {
    const output = new Array(this.height);
    for (let i = 0; i < this.height; i++) {
      const row = new Array(this.width);
      for (let j = 0; j < this.width; j++) {
        row[j] = this.tiles[i * this.height + j];
      }
      output[i] = row;
    }
    return output;
  }

  fillArea(
    x: number,
    y: number,
    width: number,
    height: number,
    material: number
  ) {
    x = x | 0;
    y = y | 0;
    width = width | 0;
    height = height | 0;
    for (let i = y; i < y + height; i++) {
      for (let j = x; j < x + width; j++) {
        this.tiles[i * this.width + j] = material;
      }
    }
  }
}

export function getTileset(world: WorldType, type: RegionType) {
  if (world !== WorldType.Overworld) {
    throw new Error("not implemented");
  }

  switch (type) {
    case RegionType.Shop:
    case RegionType.House:
      return "tileset_interiors";
    case RegionType.Dungeon:
      return "tileset_dungeons";
    case RegionType.Field:
      return "tileset_default";
  }
}
