import { BaseEntity } from "./entities/BaseEntity";
import { ItemEntity } from "./entities/itemEntity";
import { Event, EventType } from "./events";
import { Inventory } from "./inventory";
import { Region } from "./regions";
import { EntityType } from "./types";

export const ATTACK_WIGGLE_ROOM = 0.5;

const CHEST_HIT_WIGGLE_ROOM_X = 0.35;
const CHEST_HIT_WIGGLE_ROOM_Y = 1.25;
const POT_HIT_WIGGLE_ROOM_X = 0.3;
const POT_HIT_WIGGLE_ROOM_Y = 0.4;


export class ChestEntity extends BaseEntity {
  static CHEST_INV_SIZE = 10;

  inventory: Inventory;

  constructor(region: Region, x: number, y: number) {
    super(EntityType.chest, region, x, y);
    this.inventory = new Inventory(this, ChestEntity.CHEST_INV_SIZE);
  }
  addItem(code: string) {
    this.inventory.give(code);
  }

  onEvent(event: Event) {
    if (event.type !== EventType.DIRECT_ATTACK) {
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
        new Event(
          EventType.SOUND,
          `chest_smash:${this.x}:${this.y}`,
          this
        )
      );
      this.region.removeEntity(this);
    }

  }

  getMetadata = () => {
    return {proto: 'chest'};
  }
}



export class PotEntity extends BaseEntity {
  item: string | null = null;
  entity: EntityType | null = null;
  potType: number;

  constructor(region: Region, x: number, y: number, potType: number = 0) {
    super(EntityType.pot, region, x, y + 0.25);
    this.item = null;
    this.entity = null;
    this.potType = potType;
  }
  addEntity(type: EntityType) {
    this.entity = type;
  }
  addItem(code: string) {
    this.item = code;
  }

  onEvent(event: Event) {
    if (event.type !== EventType.DIRECT_ATTACK) {
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
        const newEnt = this.region.entityMap.get(newEID);
        newEnt!.onEvent(
          new Event(
            EventType.DIRECT_ATTACK,
            event.body,
            event.origin
          )
        );
      }
    }

    const sound = this.potType > 1 ? 'chest_smash' : 'pot_smash';
    this.region.broadcast(
      new Event(
        EventType.SOUND,
        `${sound}:${this.x}:${this.y}`,
        this
      )
    );

    this.region.removeEntity(this);
  }

  getMetadata = () => {
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

export class VirtualEntity extends BaseEntity {
  constructor(type: EntityType, region: Region) {
    super(type, region);
  }

  onEvent() {}
};
