import type { Logger } from "pino";

import { Event, type EventBodies, EventType } from "../../events.ts";
import { parseEvent } from "../../eventParsing.ts";
import { logger } from "../../logger.ts";
import type { RNG } from "../../rng.ts";
import { getNameRNG } from "../../terrain.ts";
import type { Region } from "../../regions.ts";
import type { EntityType } from "../../types.ts";
import { entityUpdateBody } from "../../wire.ts";
import { BaseEntity } from "../BaseEntity.ts";
import { ATTACK_WIGGLE_ROOM, ENTITY_VISION } from "../constants.ts";
import { ItemEntity } from "../itemEntity.ts";
import { type Behavior, type BehaviorClass, linearize } from "./behavior.ts";
import type { HookImpl, HookName, Hooks } from "./hooks.ts";
import { distanceFromCoords, PathingHelper } from "./pathing.ts";
import { behaviorFor } from "./registry.ts";
import { getCoordRNG } from "../../terrain.ts";

// TODO: Weapon-aware damage; the Go original hardcoded 10 everywhere too.
const NPC_DAMAGE = 10;

const SPAWN_FIT_MAX_TRIES = 1000;

export interface NpcEntityOptions {
  /**
   * Behavior stack to use instead of the registry's entry for this type.
   * Mainly for tests, which exercise species in isolation.
   */
  species?: BehaviorClass;
  rng?: RNG;
  clock?: () => number;
}

/**
 * A behavior-driven NPC. Successor to the Go VirtualEntity + otto VM pair:
 * the behavior chain replaces the scripts, and the host API the VM exposed
 * as globals lives here as methods.
 *
 * Events arrive via an inbox and are processed on the region tick (the Go
 * original consumed a channel on its tick loop); handling them synchronously
 * inside Region.broadcast would recurse into nested broadcasts.
 */
export class NpcEntity extends BaseEntity {
  readonly log: Logger;
  readonly rng: RNG;
  readonly pathing: PathingHelper;
  /** Movement speed in tiles/ms; behaviors override via describe().speed. */
  speed = 0.0075;
  /** Injectable time source so behavior tests can run on a fake clock. */
  clock: () => number = Date.now;

  private readonly chain: ReadonlyArray<Behavior>;
  private readonly implCache = new Map<
    HookName,
    ReadonlyArray<HookImpl<HookName>>
  >();
  private inbox: Array<Event> = [];
  private scheduled: Array<{ at: number; cb: () => void }> = [];
  private lastTick: number;
  private dead = false;

  /**
   * Builds an NPC for `type`, or returns null when that species' behaviors
   * have not been ported yet (callers fall back to an inert placeholder).
   */
  static create(
    type: EntityType,
    region: Region,
    options: NpcEntityOptions = {},
  ): NpcEntity | null {
    const species = options.species ?? behaviorFor(type);
    if (!species) {
      return null;
    }
    return new NpcEntity(type, region, species, options);
  }

  private constructor(
    type: EntityType,
    region: Region,
    species: BehaviorClass,
    options: NpcEntityOptions,
  ) {
    super(type, region);
    this.log = logger.child({ eid: this.eid, species: type });
    if (options.clock) {
      this.clock = options.clock;
    }
    this.rng = options.rng ?? getNameRNG(`${region.id}:${this.eid}`);
    this.pathing = new PathingHelper({
      rng: this.rng,
      getHitmap: () => this.region.terrain.hitmap,
      getEntityPosition: (eid) => {
        const entity = this.region.getEntity(eid);
        return entity ? [entity.x, entity.y] : null;
      },
    });
    this.chain = linearize(species).map(
      (BehaviorImpl) => new BehaviorImpl(this),
    );
    this.lastTick = this.clock();
    this.trigger("setup");
  }

  /**
   * Runs the hook chain for `hook`. Errors are logged and swallowed per
   * implementation, like the otto framework: a broken behavior must not
   * take down the region tick.
   */
  trigger<K extends HookName>(
    hook: K,
    ...args: Parameters<Hooks[K]>
  ): ReturnType<Hooks[K]> | undefined {
    const impls = this.implsFor(hook);
    const invoke = (depth: number): ReturnType<Hooks[K]> | undefined => {
      const impl = impls[depth] as HookImpl<K> | undefined;
      if (!impl) {
        return undefined;
      }
      try {
        return impl(() => invoke(depth + 1), ...args);
      } catch (err) {
        this.log.error({ err, hook }, "behavior hook error");
        return undefined;
      }
    };
    return invoke(0);
  }

  private implsFor(hook: HookName): ReadonlyArray<HookImpl<HookName>> {
    let impls = this.implCache.get(hook);
    if (!impls) {
      impls = this.chain
        .map((behavior) => behavior.hooks[hook])
        .filter((impl): impl is HookImpl<HookName> => impl !== undefined);
      this.implCache.set(hook, impls);
    }
    return impls;
  }

  override setPosition(x: number, y: number) {
    super.setPosition(x, y);
    this.trigger("setPosition", x, y);
  }

  override onEvent(event: Event) {
    if (this.dead) {
      return;
    }
    this.inbox.push(event);
  }

  override tick(now: number = this.clock()) {
    if (this.dead) {
      return;
    }

    if (this.inbox.length) {
      const events = this.inbox;
      this.inbox = [];
      for (const event of events) {
        this.handleEvent(event);
        if (this.dead) {
          return;
        }
      }
    }

    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      const task = this.scheduled[i]!;
      if (task.at < now) {
        this.scheduled.splice(i, 1);
        try {
          task.cb();
        } catch (err) {
          this.log.error({ err }, "scheduled behavior callback error");
        }
        if (this.dead) {
          return;
        }
      }
    }

    this.trigger("tick", now, now - this.lastTick);
    this.lastTick = now;
  }

  override getMetadata = () => this.trigger("describe") ?? {};

  // ----- Host API (the otto VM's injected globals) -----

  sendEvent<T extends EventType>(type: T, body: EventBodies[T]) {
    this.region.broadcast(new Event(type, body, this));
  }

  /** Broadcasts the current position/velocity as an ENTITY_UPDATE. */
  sendLocationUpdate() {
    const update = this.trigger("getLocationUpdate");
    if (!update) {
      return;
    }
    this.sendEvent(
      EventType.ENTITY_UPDATE,
      entityUpdateBody(update, this.x, this.y),
    );
  }

  say(message: string) {
    const nametag = this.trigger("nametag");
    const body = nametag
      ? `<span class="nametag">${nametag}:</span> ${message}`
      : message;
    this.sendEvent(EventType.CHAT, `${this.x} ${this.y}\n${body}`);
  }

  schedule(cb: () => void, inMs: number) {
    this.scheduled.push({ at: this.clock() + inMs, cb });
  }

  die() {
    if (this.dead) {
      return;
    }
    this.dead = true;
    this.log.debug("entity death");

    this.sendEvent(EventType.DEATH, "");

    for (const itemCode of this.trigger("getDrops") ?? []) {
      this.log.debug({ itemCode }, "dropping item");
      const item = new ItemEntity(itemCode, this);
      item.setPosition(
        this.x + (this.rng.uniform() * 3 - 1.5),
        this.y + (this.rng.uniform() * 3 - 1.5),
      );
      this.region.addEntity(item);
    }

    this.scheduled = [];
    this.inbox = [];
    this.region.removeEntity(this);
  }

  spawnNearby(type: EntityType, radius: number) {
    const rng = getCoordRNG(this.x, this.y);
    const hitmap = this.region.terrain.hitmap;

    for (let tries = 0; tries < SPAWN_FIT_MAX_TRIES; tries++) {
      const x = this.x + (rng.uniform() - 0.5) * radius * 2;
      const y = this.y + (rng.uniform() - 0.5) * radius * 2;
      if (!hitmap.fits(x, y, this.width, this.height)) {
        continue;
      }
      this.log.debug({ type, x, y }, "spawning entity");
      this.region.spawn(type, x, y);
      return;
    }
    this.log.warn({ type }, "found no space to spawn entity");
  }

  typeOf(eid: string): EntityType | null {
    return this.region.getEntity(eid)?.type ?? null;
  }

  distanceTo(eid: string): number | null {
    const entity = this.region.getEntity(eid);
    if (!entity) {
      return null;
    }
    return distanceFromCoords(this.x, this.y, entity.x, entity.y);
  }

  distanceToCoords(x: number, y: number): number {
    return distanceFromCoords(this.x, this.y, x, y);
  }

  get levelWidth(): number {
    return this.region.terrain.width;
  }

  get levelHeight(): number {
    return this.region.terrain.height;
  }

  get isDead(): boolean {
    return this.dead;
  }

  // ----- Region event ingress (ports virtualentity.go handle()) -----

  private handleEvent(event: Event) {
    const parsed = parseEvent(event);
    if (!parsed) {
      this.log.debug({ type: event.type }, "ignoring malformed event");
      return;
    }
    const originEid = event.origin?.eid ?? null;

    switch (parsed.type) {
      case EventType.SPAWN:
      case EventType.REGION_ENTRANCE:
      case EventType.ENTITY_UPDATE: {
        if (!originEid || !this.region.getEntity(originEid)) {
          return;
        }
        const dist = this.distanceToCoords(parsed.body.x, parsed.body.y);
        if (dist > ENTITY_VISION) {
          return;
        }
        this.trigger("seenEntity", originEid, dist);
        return;
      }

      case EventType.DEATH: {
        if (originEid) {
          this.trigger("forget", originEid);
        }
        return;
      }
      case EventType.REGION_EXIT: {
        this.trigger("forget", parsed.body);
        return;
      }

      case EventType.DIRECT_ATTACK: {
        const { x, y, item } = parsed.body;
        const from = originEid ?? "";
        if (
          x < this.x - ATTACK_WIGGLE_ROOM ||
          x > this.x + this.width + ATTACK_WIGGLE_ROOM ||
          y < this.y - this.height - ATTACK_WIGGLE_ROOM ||
          y > this.y + ATTACK_WIGGLE_ROOM
        ) {
          this.trigger("seenAttack", from, NPC_DAMAGE, item);
          return;
        }
        this.log.debug({ from }, "direct hit");
        this.trigger("attacked", from, NPC_DAMAGE, item);
        return;
      }

      case EventType.CHAT: {
        const { x, y, message } = parsed.body;
        this.trigger("heard", x, y, message);
        return;
      }
    }
  }
}
