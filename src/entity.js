const BaseEntity = require('./entities/BaseEntity');
const Inventory = require('./inventory');

exports.ATTACK_WIGGLE_ROOM = 0.5;


exports.WEAPONS = {
  'sw': 0,
  'bo': 1,
  'ma': 2,
  'ax': 3,
  'ha': 4,
  'st': 5,
};
exports.WEAPON_RAW_PREFIXES = [
  'plain',
  'forged',
  'sharp',
  'broad',
  'old',
  'leg',
  'fla',
  'agile',
  'bane',
  'ench',
  'evil',
  'spite',
  'ether',
  'ancie',
];
exports.WEAPON_PREFIXES = {
  'plain':  0,
  'forged': 1,
  'sharp':  2,
  'broad':  3,
  'old':    4,
  'leg':    5,
  'fla':    6,
  'agile':  7,
  'bane':   8,
  'ench':   9,
  'evil':   10,
  'spite':  11,
  'ether':  12,
  'ancie':  13,
};


exports.ChestEntity = class ChestEntity extends BaseEntity {
  constructor(region, x, y) {
    super('chest', region, x, y);
    this.inventory = new Inventory(this, CHEST_INV_SIZE);
  }
  addItem(code) {
    this.inventory.give(code);
  }
};

exports.PotEntity = class PotEntity extends BaseEntity {
  constructor(region, x, y) {
    super('pot', region, x, y);
    this.item = null;
    this.entity = null;
  }
  addEntity(type) {
    this.entity = type;
  }
  addItem(code) {
    this.item = code;
  }
};

exports.VirtualEntity = class VirtualEntity extends BaseEntity {
  constructor(type) {
    super(type);
  }
};
