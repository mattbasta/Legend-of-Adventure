import type { Event } from "./events.ts";
import type { Inventory } from "./inventory.ts";
import type { Region } from "./regions.ts";

export const EntityType = {
  player: "player",
  item: "item",
  chest: "chest",
  pot: "pot",

  homely: "homely",
  soldier: "soldier",
  child: "child",
  bully: "bully",
  trader: "trader",

  deathWaker: "death_waker",
  zombie: "zombie",

  wolf: "wolf",
  sheep: "sheep",
} as const;
export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export type Entity = {
  // Entity ID
  eid: string;
  type: EntityType;

  // Position
  x: number;
  y: number;
  // Size
  height: number;
  width: number;
  // Facing direction
  dirX: number;
  dirY: number;

  region: Region;

  inventory?: Inventory;
  updateInventory(): void;

  tick: () => void;
  onEvent: (event: Event) => void;

  setEffect(effect: string, ttl: number): void;

  getMetadata(): Record<string, any>;
};
