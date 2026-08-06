import type { Logger } from "pino";
import type * as websocket from "ws";

import { handleCheat } from "./cheats.ts";
import { KillableEntity } from "./entities/BaseEntity.ts";
import { ATTACK_WIGGLE_ROOM } from "./entities/constants.ts";
import { sendEntityToLocation } from "./entities/moveEntity.ts";
import { Event, EventType } from "./events.ts";
import { Inventory } from "./inventory.ts";
import { logger } from "./logger.ts";
import { parseClientCommand } from "./protocol.ts";
import { getRegion, getRegionData } from "./regions.ts";
import { RegionType, WorldType } from "./terrainGen/constants.ts";
import { EntityType } from "./types.ts";
import { entityUpdateBody } from "./wire.ts";

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

    const parsed = parseClientCommand(message.toString("utf-8"));
    if (!parsed) {
      return;
    }
    if (!parsed.ok) {
      // Well-formed bodies are the client's job; anything else is either a
      // bug or a cheat attempt.
      this.log.warn(
        { cmd: parsed.cmd, issues: parsed.error.issues },
        "rejected malformed client command",
      );
      return;
    }

    const command = parsed.command;
    switch (command.cmd) {
      case "cyc": // cycle inventory
        this.inventory.cycle(command.body);
        return;

      case "cha": // chat
        if (handleCheat(command.body, this)) {
          return;
        }
        this.region.broadcast(
          new Event(
            EventType.CHAT,
            `${this.x} ${this.y}\n${command.body}`,
            this,
          ),
        );
        return;

      case "loc": {
        // TODO: do more cheat testing here
        const { x, y, velX, velY, dirX, dirY } = command.body;
        if (
          x < 0 ||
          x > this.region.terrain.width ||
          y < 0 ||
          y > this.region.terrain.height
        ) {
          this.log.warn("player attempted to exceed bounds of the level");
          return;
        }

        this.x = x;
        this.y = y;
        this.velX = velX;
        this.velY = velY;
        this.dirX = dirX;
        this.dirY = dirY;

        this.lastUpdate = Date.now();

        this.region.broadcast(
          new Event(
            EventType.ENTITY_UPDATE,
            entityUpdateBody(
              {
                x: this.x,
                y: this.y,
                velocity: [this.velX, this.velY],
                direction: [this.dirX, this.dirY],
              },
              this.x,
              this.y,
            ),
            this,
          ),
        );
        return;
      }

      case "use":
        this.inventory.use(command.body, this);
        return;

      case "dro":
        this.inventory.drop(this);
        return;

      case "lev": {
        // Only accept slides into one of the four adjacent regions.
        const { x, y } = command.body;
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
    }
  };

  onClose = () => {
    this.region.removeEntity(this);
  };

  onEvent(event: Event) {
    switch (event.type) {
      case EventType.DEATH: {
        // Rewrite deaths as region exits: the client removes the entity by
        // eid (stringifying the entity here would embed its whole JSON blob).
        const eid = event.origin?.eid ?? "";
        this.send(`delevt:${eid}\n${eid}`);
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
        `${this.x} ${this.y} deathflake 25`,
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
