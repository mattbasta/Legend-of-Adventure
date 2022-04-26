import { KillableEntity } from "./entities/BaseEntity";
import { ItemEntity } from "./entities/itemEntity";
import { Event, EventType } from "./events";
import { Entity } from "./types";

const FOOD_HEALTH_INCREASE = 75;
const INV_MAX_STACK = 32;

export class Inventory {
  owner: Entity;
  capacity: number;

  slots: Array<null | string>;
  counts: Array<number>;

  constructor(owner: Entity, capacity: number) {
    this.owner = owner;
    this.capacity = capacity;

    this.slots = new Array(capacity);
    this.counts = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.slots[i] = null;
      this.counts[i] = 0;
    }
  }

  numItems() {
    return this.slots.reduce((acc, cur) => acc + (cur ? 1 : 0), 0);
  }

  isFull() {
    return this.slots.every((x) => x);
  }

  give(item: string) {
    for (let i = 0; i < this.capacity; i++) {
      if (this.slots[i] === item && this.counts[i] < INV_MAX_STACK) {
        this.counts[i] += 1;
        this.owner.updateInventory();
        return [true, i];
      }
    }

    if (this.isFull()) {
      return [false, null];
    }

    for (let i = 0; i < this.capacity; i++) {
      if (this.slots[i]) {
        continue;
      }
      this.slots[i] = item;
      this.counts[i] = 1;
      this.owner.updateInventory();
      return [true, i];
    }

    return [false, null];
  }

  clear() {
    for (let i = 0; i < this.capacity; i++) {
      this.clearSlot(i);
    }
  }

  clearSlot(i: number) {
    this.slots[i] = null;
    this.counts[i] = 0;
  }

  consolidate() {
    for (let i = 0; i < this.capacity - 1; i++) {
      if (this.slots[i]) {
        continue;
      }

      for (let j = i + 1; j < this.capacity; j++) {
        if (!this.slots[j]) {
          continue;
        }

        this.slots[i] = this.slots[j];
        this.counts[i] = this.counts[j];
        this.clearSlot(j);
        break;
      }
      if (!this.slots[i]) {
        break;
      }
    }
  }

  cycle(command: string) {
    this.consolidate();
    const count = this.numItems();

    if (command === "b") {
      const firstItem = this.slots[0];
      const firstCount = this.counts[0];
      for (let i = 0; i < count - 1; i++) {
        this.slots[i] = this.slots[i + 1];
        this.counts[i] = this.counts[i + 1];
      }
      this.slots[count - 1] = firstItem;
      this.counts[count - 1] = firstCount;
    } else {
      const lastItem = this.slots[count - 1];
      const lastCount = this.counts[count - 1];
      for (let i = count - 1; i > 0; i--) {
        this.slots[i] = this.slots[i - 1];
        this.counts[i] = this.counts[i - 1];
      }
      this.slots[0] = lastItem;
      this.counts[0] = lastCount;
    }
    this.owner.updateInventory();
  }

  use(i: number, holder: Entity) {
    if (i >= this.capacity) {
      return;
    }
    const contents = this.slots[i];
    if (contents == null) {
      return;
    }

    console.log(`${holder} using ${this.slots[i]}`);

    const x = holder.x;
    const y = holder.y;

    switch (contents[0]) {
      case "f":
        if (!(holder instanceof KillableEntity)) {
          return;
        }
        console.log(holder.eid, holder.health, holder.maxHealth);
        if (holder.isAtMaxHealth()) {
          return;
        }
        holder.incrementHealth(FOOD_HEALTH_INCREASE);
        this.remove(i);

        holder.onEvent(
          new Event(EventType.PARTICLE_MACRO, "0.5 -0.5 eatfood 10 local")
        );
        holder.region.broadcast(
          new Event(
            EventType.PARTICLE_MACRO,
            `0.5, -0.5, eatfood 10 ${holder.eid}`,
            holder
          )
        );
        break;

      case "w":
        holder.region.broadcast(
          new Event(
            EventType.DIRECT_ATTACK,
            `${x} ${y} ${this.slots[i]}`,
            holder
          )
        );
        break;

      case "p":
        this.remove(i);

        const effectN = (Math.random() * 4) | 0;
        const effectDuration = ((Math.random() * 10) | 0) + 10;
        switch (effectN) {
          case 0:
            holder.setEffect("flip", effectDuration);
            break;
          case 1:
            holder.setEffect("invincible", effectDuration);
            break;
          case 2:
            holder.setEffect("blindness", effectDuration);
            break;
          case 3:
            holder.setEffect("drained", effectDuration);
            break;
        }
        holder.region.broadcast(
          new Event(
            EventType.SOUND,
            `potion${(Math.random() * 2) | 0}:${x}:${y}`,
            null
          )
        );
        break;
    }
  }

  remove(i: number) {
    this.counts[i] -= 1;
    if (!this.counts[i]) {
      this.slots[i] = null;
    }
    this.consolidate();
    this.owner.updateInventory();
  }
  drop(dropper: Entity) {
    if (!this.slots[0]) {
      return;
    }

    console.log(`${dropper} dropping ${this.slots[0]}`);

    const region = dropper.region;
    const item = new ItemEntity(this.slots[0], dropper);
    this.counts[0] -= 1;

    if (!this.counts[0]) {
      this.slots[0] = null;
    }
    region.addEntity(item);
    this.consolidate();
    this.owner.updateInventory();
  }
}
