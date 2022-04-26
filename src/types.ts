import type { Event } from "./events";
import type { Inventory } from "./inventory";
import type { Region } from "./regions";

export enum EntityType {
  player = "player",
  item = "item",
  chest = "chest",
  pot = "pot",

  homely = "homely",
  soldier = "soldier",
  child = "child",
  bully = "bully",
  trader = "trader",

  deathWaker = "death_waker",
  zombie = "zombie",

  wolf = "wolf",
  sheep = "sheep",
}

export type Entity = {
  // Entity ID
  eid: string;

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
