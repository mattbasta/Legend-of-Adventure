import { Event, EventType } from "../events";
import { getRegion, getRegionData, Region } from "../regions";
import { RegionType, WorldType } from "../terrainGen/constants";
import { Entity, EntityType } from "../types";

let eid = 0;

export abstract class BaseEntity implements Entity {
  type: EntityType;
  eid: string;
  region: Region;

  x: number;
  y: number;
  velX: number;
  velY: number;
  dirX: number;
  dirY: number;

  coordStack: Array<[number, number]>;

  height: number = 1;
  width: number = 1;

  constructor(type: EntityType, region: Region, x: number = 0, y: number = 0) {
    this.type = type;
    this.eid = `e${eid++}`;
    this.region = region;

    this.x = x;
    this.y = y;
    this.velX = 0;
    this.velY = 0;
    this.dirX = 0;
    this.dirY = 1;

    // FIXME: For non-players, this should populate with the full coordstack
    // for the generated entity.
    this.coordStack = [[this.x, this.y]];
  }
  setLocation(region: Region) {
    this.region = region;
  }
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  setEffect = (effect: string, ttl: number) => {};

  abstract onEvent(event: Event): void;

  tick() {
    if (!this.region) {
      return;
    }

    for (let portal of this.region.terrain.portals) {
      if (!portal.collidingWithEntity(this)) {
        continue;
      }

      console.log(`${this.eid} in contact with portal`);
      const currentCoords: [number, number] = [this.x, this.y];
      let { destX, destY, target } = portal;

      if (target === "..") {
        target = this.region.parentID;
        [destX, destY] = this.coordStack.pop()!;
        destY += 1;
      } else if (target === ".") {
        target = this.region.id;
        this.coordStack.pop();
        this.coordStack.push(currentCoords);
      } else {
        target = this.region.id + "," + target;
        this.coordStack.push(currentCoords);
      }

      this.sendToLocation(...getRegionData(target), destX, destY);
      break;
    }
  }

  sendToLocation(
    parentID: string | WorldType,
    type: RegionType,
    x: number,
    y: number,
    newX: number,
    newY: number
  ) {
    const newRegion = getRegion(parentID, type, x, y);

    if (!newRegion) {
      console.error("Requested region that does not exist", parentID, type, x);
      return;
    }

    this.x = newX;
    this.y = newY;

    if (newRegion === this.region) {
      this.region.broadcast(
        new Event(EventType.ENTITY_UPDATE, `${this}\n${this.x} ${this.y}`, this)
      );
      return;
    }

    if (this.region) {
      this.region.removeEntity(this);
    }

    this.region = newRegion;
    newRegion.addEntity(this);
  }

  updateInventory() {} // stub

  getMetadata = () => {
    return {};
  }
  toString() {
    return JSON.stringify(
      Object.assign(
        {
          eid: this.eid,
          type: this.type,
          x: this.x,
          y: this.y,
          velocity: [this.velX, this.velY],
          direction: [this.dirX, this.dirY],
          height: this.height,
          width: this.width,
        },
        this.getMetadata()
      )
    );
  }
}

export abstract class KillableEntity extends BaseEntity {
  abstract health: number;
  abstract maxHealth: number;
  godMode: boolean = false;

  isAtMaxHealth() {
    return this.health === this.maxHealth;
  }

  incrementHealth(amount: number) {
    const newHealth = this.health + amount;
    if (newHealth > this.maxHealth) {
      this.health = this.maxHealth;
    } else if (newHealth <= 0) {
      this.health = 0;
      if (!this.godMode) {
        this.death();
      }
    } else {
      if (newHealth < this.health) {
        this.region.broadcast(
          new Event(
            EventType.SOUND,
            `grunt${(Math.random() * 3) | 0}:${this.x}:${this.y}`
          )
        );
      }
      this.health = newHealth;
    }
  }
  death() {}
}
