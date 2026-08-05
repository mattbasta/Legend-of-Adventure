/**
 * The hook vocabulary for NPC behaviors.
 *
 * This is the typed successor to the otto-era `trigger(name, ...)` protocol
 * (resources/entities/framework.js). Each hook may be implemented by any
 * behavior in an entity's chain; implementations receive a `next` callback
 * (the old `sup`) that delegates to the next behavior down the chain and
 * returns its result.
 */

/** Client-facing entity description, merged into the entity's `add` JSON. */
export interface EntityDescription {
  proto?: "avatar" | "animal";
  image?: string;
  width?: number;
  height?: number;
  speed?: number;
  nametag?: string;
  movement?: string | null;
}

/** The payload of an ENTITY_UPDATE frame. */
export interface LocationUpdate {
  x: number;
  y: number;
  velocity: [number, number];
  direction: [number, number];
  movement?: string | null;
}

export interface Hooks {
  // Lifecycle
  setup(): void;
  tick(now: number, delta: number): void;
  setPosition(x: number, y: number): void;

  // Movement
  startMoving(dirX: number, dirY: number): void;
  stopMoving(): void;
  wander(): void;
  stopWandering(): void;
  chase(id: string): void;
  stopChasing(): void;
  flee(id: string): void;

  // Perception (fed from region events by NpcEntity)
  seenEntity(id: string, dist: number): void;
  seenAttack(from: string, damage: number, item: string): void;
  attacked(from: string, damage: number, item: string): void;
  heard(x: number, y: number, message: string): void;
  forget(id: string): void;

  // Combat / damage
  wasHurt(): void;
  beforeDie(): void;
  bloodspatter(): void;

  // Pathing
  stagePathElements(x: number, y: number): void;
  /** Returns an index into pathing DIRECTIONS, or null for "stay put". */
  getDirectionToBestTile(wandering: boolean): number | null;

  // Queries (return values flow back up the chain)
  describe(): EntityDescription;
  getLocationUpdate(): LocationUpdate;
  getWidth(): number;
  getHeight(): number;
  getHealth(): number;
  getPreferredBehavior(): "chase" | "flee";
  doesAttack(): boolean;
  holdingWeapon(): string | null;
  getDrops(): string[];
  nametag(): string;
}

export type HookName = keyof Hooks;

/**
 * `next` delegates to the next implementation down the chain. Unlike the
 * otto framework's `sup(...)` (which silently ignored its arguments and
 * re-applied the originals), `next` takes no arguments by design.
 */
export type Next<K extends HookName> = () => ReturnType<Hooks[K]> | undefined;

export type HookImpl<K extends HookName> = (
  next: Next<K>,
  ...args: Parameters<Hooks[K]>
) => ReturnType<Hooks[K]> | undefined;

export type BehaviorHooks = {
  readonly [K in HookName]?: HookImpl<K>;
};
