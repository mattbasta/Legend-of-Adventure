import type { Logger } from "pino";
import type * as websocket from "ws";

import { handleCheat } from "./cheats.ts";
import { KillableEntity } from "./entities/BaseEntity.ts";
import { ATTACK_WIGGLE_ROOM } from "./entities/constants.ts";
import { sendEntityToLocation } from "./entities/moveEntity.ts";
import { Event, EventType } from "./events.ts";
import { Inventory } from "./inventory.ts";
import { logger } from "./logger.ts";
import { parseClientMessage } from "./protocol.ts";
import { getRegion, getRegionData } from "./regions.ts";
import { RegionType, WorldType } from "./terrainGen/constants.ts";
import { EntityType } from "./types.ts";

export const MAX_HEALTH = 100;
export const PLAYER_INVENTORY_SIZE = 5;
export const PLAYER_SPEED = 0.0075;

export class Player extends KillableEntity {
  ws: websocket.WebSocket;
  log: Logger;

  name: string = "Player";
  lastUpdate: number;

  effectTTL: number = 0;
  movementEffect: string | null = null;

  override godMode: boolean = false;

  health = MAX_HEALTH;
  maxHealth = MAX_HEALTH;

  inventory: Inventory;

  constructor(connection: websocket.WebSocket) {
    // The spawn region is always a valid ID, so getRegion cannot return null.
    super(
      EntityType.player,
      getRegion(WorldType.Overworld, RegionType.Field, 0, 0)!,
    );

    this.lastUpdate = Date.now();
    this.ws = connection;
    this.log = logger.child({ eid: this.eid });

    connection.on("message", this.onMessage);
    connection.on("close", this.onClose);

    this.send("haldo");

    this.inventory = new Inventory(this, PLAYER_INVENTORY_SIZE);
    this.inventory.give("wsw.sharp.12");
    this.inventory.give("f5");
    this.inventory.give("f5");

    this.region.addEntity(this);
    this.send(`lev${this.region}`);
  }

  onMessage = (message: Buffer, isBinary: boolean) => {
    if (isBinary) {
      return;
    }
    // console.log('> ' + message)

    const { cmd, body } = parseClientMessage(message.toString("utf-8"));
    switch (cmd) {
      case "cyc": // cycle inventory
        this.inventory.cycle(body);
        return;

      case "cha": // chat
        if (handleCheat(body, this)) {
          return;
        }
        this.region.broadcast(
          new Event(EventType.CHAT, `${this.x} ${this.y}\n${body}`, this),
        );
        return;

      case "loc":
        const posData = body.split(":");
        if (posData.length < 4) {
          return;
        }
        // TODO: do more cheat testing here
        const newX = parseFloat(posData[0]!);
        const newY = parseFloat(posData[1]!);
        if (isNaN(newX) || isNaN(newY)) {
          return;
        }

        if (
          newX < 0 ||
          newX > this.region.terrain.width ||
          newY < 0 ||
          newY > this.region.terrain.height
        ) {
          this.log.warn("player attempted to exceed bounds of the level");
          return;
        }

        const velX = parseFloat(posData[2]!);
        const velY = parseFloat(posData[3]!);
        if (isNaN(velX) || isNaN(velY)) {
          return;
        }
        if (velX < -1 || velX > 1 || velY > 1 || velX > 1) {
          this.log.warn("player attempted to go faster than possible");
          return;
        }

        const dirX = parseFloat(posData[4]!);
        const dirY = parseFloat(posData[5]!);
        if (isNaN(dirX) || isNaN(dirY)) {
          return;
        }
        if (dirX < -1 || dirX > 1 || dirY > 1 || dirX > 1) {
          this.log.warn("player attempted to face invalid direction");
          return;
        }

        this.x = newX;
        this.y = newY;
        this.velX = velX;
        this.velY = velY;
        this.dirX = dirX;
        this.dirY = dirY;

        this.lastUpdate = Date.now();

        this.region.broadcast(
          new Event(
            EventType.ENTITY_UPDATE,
            `${JSON.stringify({
              x: this.x,
              y: this.y,
              velocity: [this.velX, this.velY],
              direction: [this.dirX, this.dirY],
            })}\n${this.x} ${this.y}`,
            this,
          ),
        );

        break;

      case "use":
        const slot = parseInt(body, 10);
        if (isNaN(slot)) {
          return;
        }
        this.inventory.use(slot, this);
        return;

      case "dro":
        this.inventory.drop(this);
        return;

      case "lev":
        const pos = body.split(":");
        const x = parseFloat(pos[0]!);
        const y = parseFloat(pos[1]!);
        const iXPos = this.region.x - x;
        const iYPos = this.region.y - y;
        if (
          iYPos > 1 ||
          iYPos < -1 ||
          iXPos > 1 ||
          iXPos < -1 ||
          (iXPos && iYPos)
        ) {
          return;
        }

        // console.log(`${this.eid} sliding to ${x}:${y}`);
        this.sendToLocation(
          this.region.parentID,
          this.region.type,
          x,
          y,
          this.x,
          this.y,
        );
        return;
    }
  };

  onClose = () => {
    this.region.removeEntity(this);
  };

  onEvent(event: Event) {
    switch (event.type) {
      case EventType.DEATH: {
        this.send(`delevt:${event.origin}\n${event.origin}`);
        return;
      }
      case EventType.DIRECT_ATTACK: {
        const [x, y] = event.body
          .split(" ")
          .slice(0, 2)
          .map((x) => parseFloat(x));

        const AWR = ATTACK_WIGGLE_ROOM;
        if (
          x! < this.x - AWR ||
          x! > this.x + this.width + AWR ||
          y! < this.y - this.height - AWR ||
          y! > this.y + AWR
        ) {
          return;
        }

        // TODO: Figure out how to calculate this
        const damage = 10;

        this.incrementHealth(-1 * damage);

        this.onEvent(
          new Event(
            EventType.PARTICLE_MACRO,
            "0.5 0 bloodspatter 5 local",
            null,
          ),
        );
        this.region.broadcast(
          new Event(
            EventType.PARTICLE_MACRO,
            `0.5 0 bloodspatter 5 ${this.eid}`,
            this,
          ),
        );
        return;
      }
    }

    this.send(event.toString());
  }

  send(data: string) {
    this.ws.send(data);
  }

  override tick() {
    super.tick();

    if (!this.region) {
      return;
    }

    const now = Date.now();
    const delta = (now - this.lastUpdate) / 1000;

    if (this.velX || this.velY) {
      let { velX, velY } = this;
      if (velX && velY) {
        velX *= Math.SQRT1_2;
        velY *= Math.SQRT1_2;
      }

      this.x += velX * PLAYER_SPEED * delta;
      this.y += velY * PLAYER_SPEED * delta;

      this.lastUpdate = now;
    }

    if (this.godMode && ((Math.random() * 3) | 0) === 0) {
      this.onEvent(
        new Event(EventType.PARTICLE_MACRO, "0.5 -0.5 godmode 3 local", null),
      );
      this.region.broadcast(
        new Event(
          EventType.PARTICLE_MACRO,
          `0.5 -0.5 godmode 3 ${this.eid}`,
          this,
        ),
      );
    }

    if (this.effectTTL) {
      this.effectTTL -= 1;
      if (!this.effectTTL) {
        this.onEvent(new Event(EventType.EFFECT_CLEAR, "", null));
      }
    }

    for (let portal of this.region.terrain.portals) {
      if (!portal.collidingWithEntity(this)) {
        continue;
      }

      this.log.debug("in contact with portal");
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

  override setEffect = (effect: string, ttl: number) => {
    this.effectTTL = ttl;
    this.onEvent(new Event(EventType.EFFECT, effect, null));
  };

  sendToLocation(
    parentID: string | WorldType,
    type: RegionType,
    x: number,
    y: number,
    newX: number,
    newY: number,
  ) {
    const oldRegion = this.region;
    this.send("flv");
    sendEntityToLocation(this, parentID, type, x, y, newX, newY);

    if (this.region === oldRegion) {
      this.send(`epuevt:local\n${JSON.stringify({ x: this.x, y: this.y })}`);
      return;
    }

    this.send(`epuevt:local\n${JSON.stringify({ x: this.x, y: this.y })}`);
    this.send(`lev${this.region.toString()}`);
  }

  override incrementHealth(amount: number) {
    super.incrementHealth(amount);
    this.send(`hea${this.health}`);
  }
  override death() {
    this.region.broadcast(
      new Event(
        EventType.PARTICLE_MACRO,
        `${this.x} ${this.y} deathFlake 25`,
        this,
      ),
    );

    while (this.inventory.numItems()) {
      this.inventory.drop(this);
    }

    this.sendToLocation(WorldType.Overworld, RegionType.Field, 0, 0, 50, 50);
    this.health = MAX_HEALTH;
    this.send("dea");
  }

  override updateInventory() {
    const inv = this.inventory;
    this.send(
      `inv${inv.slots.map((x, i) => `${i}:${x}:${inv.counts[i]}`).join("\n")}`,
    );
  }

  override getMetadata = () => {
    return {
      nametag: this.name,
    };
  };
}
