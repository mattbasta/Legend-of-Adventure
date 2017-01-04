const BaseEntity = require('./entities/BaseEntity');
const events = require('./events');
const Inventory = require('./inventory');
const ItemEntity = require('./entities/itemEntity');

exports.ATTACK_WIGGLE_ROOM = 0.5;

const CHEST_HIT_WIGGLE_ROOM_X = 0.35;
const CHEST_HIT_WIGGLE_ROOM_Y = 1.25;
const POT_HIT_WIGGLE_ROOM_X = 0.3;
const POT_HIT_WIGGLE_ROOM_Y = 0.4;


class ChestEntity extends BaseEntity {
  constructor(region, x, y) {
    super('chest', region, x, y);
    this.inventory = new Inventory(this, ChestEntity.CHEST_INV_SIZE);
  }
  addItem(code) {
    this.inventory.give(code);
  }

  onEvent(event) {
    if (event.type !== events.DIRECT_ATTACK) {
      return;
    }

    const [x, y] = event.body.split(' ').map(x => parseFloat(x));

    if (
      x < this.x - CHEST_HIT_WIGGLE_ROOM_X ||
      x > this.x + this.width + CHEST_HIT_WIGGLE_ROOM_X ||
      y < this.y - this.height - CHEST_HIT_WIGGLE_ROOM_Y ||
      y > this.y + CHEST_HIT_WIGGLE_ROOM_Y
    ) {
      return;
    }

    this.inventory.drop(this);

    if (!this.inventory.numItems()) {
      this.region.broadcast(
        new events.Event(
          events.SOUND,
          `chest_smash:${this.x}:${this.y}`,
          this
        )
      );
      this.region.removeEntity(this);
    }

  }

  getMetadata() {
    return {proto: 'chest'};
  }
}
ChestEntity.CHEST_INV_SIZE = 10;

exports.ChestEntity = ChestEntity;


exports.PotEntity = class PotEntity extends BaseEntity {
  constructor(region, x, y, potType = 0) {
    super('pot', region, x, y + 0.25);
    this.item = null;
    this.entity = null;
    this.potType = potType;
  }
  addEntity(type) {
    this.entity = type;
  }
  addItem(code) {
    this.item = code;
  }

  onEvent(event) {
    if (event.type !== events.DIRECT_ATTACK) {
      return;
    }

    const [x, y] = event.body.split(' ').map(x => parseFloat(x));

    if (
      x < this.x - POT_HIT_WIGGLE_ROOM_X ||
      x > this.x + this.width + POT_HIT_WIGGLE_ROOM_X ||
      y < this.y - this.height - POT_HIT_WIGGLE_ROOM_Y ||
      y > this.y + POT_HIT_WIGGLE_ROOM_Y
    ) {
      return;
    }

    if (this.item) {
      const item = new ItemEntity(this.item, this);
      item.setLocation(this.region);
      item.setPosition(this.x + (this.width - item.width) / 2, this.y);
      this.region.addEntity(item);

    } else if (this.entity) {
      const newEID = this.region.spawn(this.entity, this.x, this.y);
      if (event.origin) {
        const newEnt = this.region.entitiesMap.get(newEID);
        newEnt.onEvent(
          new events.Event(
            events.DIRECT_ATTACK,
            event.body,
            event.origin
          )
        );
      }
    }

    const sound = this.potType > 1 ? 'chest_smash' : 'pot_smash';
    this.region.broadcast(
      new events.Event(
        events.SOUND,
        `${sound}:${this.x}:${this.y}`,
        this
      )
    );

    this.region.removeEntity(this);
  }

  getMetadata() {
    return {
      image: 'pots',
      clip: {
        x: 0,
        y: this.potType * 32,
        width: 32,
        height: 32,
      },
    };
  }
};

exports.VirtualEntity = class VirtualEntity extends BaseEntity {
  constructor(type) {
    super(type);
  }
};
