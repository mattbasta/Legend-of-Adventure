const crc32 = require('crc32');
const rng = require('rng');

const pairing = require('./terrainGen/pairing')
const perlin = require('./terrainGen/perlin');
const rounding = require('./terrainGen/rounding');
const townGen = require('./terrainGen/towns');


exports.DUNGEON_MIN_SIZE         = 3;
exports.DUNGEON_MAX_SIZE         = 7;
exports.DUNGEON_STAIRS_DOWN_ODDS = 7; // out of 10
exports.DUNGEON_BOSS_ODDS        = 3; // out of 10
exports.DUNGEON_ANGEL_ODDS       = 3; // out of 10

exports.DUNGEON_STATUE_ODDS = 6; // out of 10

exports.WORLD_OVERWORLD = "overworld";
exports.WORLD_ETHER     = "ether";

exports.REGIONTYPE_FIELD   = "field";
exports.REGIONTYPE_DUNGEON = "dungeon";
exports.REGIONTYPE_SHOP    = "shop";
exports.REGIONTYPE_HOUSE   = "house";

exports.SHOP_LOBBY_CRATE_ODDS   = 3; // out of 10
exports.SHOP_LOBBY_POT_ODDS     = 6; // out of 10
exports.STORAGE_ROOM_MAX_CHESTS = 7;


function getNameInt(name) {
  const hash = crc32(name);
  return parseInt(hash, 16);
}


exports.getCoordOption = (x, y, odds) => pairing.getCoordInt(x, y) % odds === 0;
exports.getCoordRNG = (x, y) => new rng.MT(pairing.getCoordInt(x, y));

exports.getNameRNG = name => new rng.MT(getNameInt(name));
exports.getNameChance = (name, odds) => getNameInt(name) % odds === 0;

exports.chance = rng => rng.uniform() < 0.5;


const regionSizes = {
  [exports.REGIONTYPE_FIELD]: [100, 100],
  [exports.REGIONTYPE_DUNGEON]: [28, 28],
  [exports.REGIONTYPE_SHOP]: [52, 52],
  [exports.REGIONTYPE_HOUSE]: [52, 52],
};


const HM_BUFF_DIST = 0.00001;

class Hitmap {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    this.body = new Uint8Array((this.width * this.height / 8 | 0) + 1);
  }

  set(x, y) {
    const linearIndex = y * this.width + x;
    const index = linearIndex / 8 | 0;
    const offset = 1 << (linearIndex % 8 | 0);
    this.body[index] = this.body[index] | offset;
  }

  unset(x, y) {
    const linearIndex = y * this.width + x;
    const index = linearIndex / 8 | 0;
    const offset = 1 << (linearIndex % 8 | 0);
    this.body[index] = this.body[index] & (~offset);
  }

  get(x, y) {
    const linearIndex = y * this.width + x;
    return Boolean(this.body[linearIndex / 8 | 0] & (1 << (linearIndex % 8)));
  }

  fits(x, y, w, h) {
    if (
      x < 1 ||
      y - h < 1 ||
      x > this.width - w - 1 ||
      y > this.height - 1
    ) {
      return false;
    }

    return !(
      this.get(y - HM_BUFF_DIST, x) ||
      this.get(y - h + HM_BUFF_DIST, x) ||
      this.get(y - HM_BUFF_DIST, x + w - HM_BUFF_DIST) ||
      this.get(y - h + HM_BUFF_DIST, x + w - HM_BUFF_DIST)
    );
  }

  apply(hitmap, x, y) {
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
exports.Hitmap = Hitmap;


class Terrain {
  constructor(region) {
    [this.width, this.height] = regionSizes[region.type];
    this.x = region.x;
    this.y = region.y;

    this.tiles = new Uint16Array(this.width * this.height);
    // TODO: Replace this with something more sane
    this.hitmap = new Hitmap(this.width, this.height);

    this.portals = new Set();

    if (region.type === exports.REGIONTYPE_FIELD) {
      const ng = new perlin.NoiseGenerator(125);
      ng.fillGrid(
        this.x * this.width,
        this.y * this.height,
        this.tiles,
        this.width,
        this.height
      );

      const tileset = require('./terrainGen/tilesets').FIELD;
      const roundingOut = rounding.round(this, tileset);
      // this.roundingOut = roundingOut;
    }

    if (region.isTown()) {
      townGen(this);
    } else if (region.isDungeonEntrance()) {
      this.applyDungeonEntrance();
    } else if (region.type === exports.REGIONTYPE_DUNGEON) {
      this.applyDungeon();
    } else if (
      region.type === exports.REGIONTYPE_HOUSE ||
      region.type === exports.REGIONTYPE_SHOP
    ) {
      this.applyBuildingInterior();
    }

  }

  applyDungeonEntrance() {}
  applyDungeon() {}
  applyBuildingInterior() {}

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

}
exports.Terrain = Terrain;

exports.getTileset = function(world, type) {
  if (world !== exports.WORLD_OVERWORLD) {
    throw new Error('not implemented');
  }

  switch (type) {
    case exports.REGIONTYPE_SHOP:
    case exports.REGIONTYPE_HOUSE:
      return 'tileset_interiors';
    case exports.REGIONTYPE_DUNGEON:
      return 'tileset_dungeons';
    case exports.REGIONTYPE_FIELD:
      return 'tileset_default';
  }
};
