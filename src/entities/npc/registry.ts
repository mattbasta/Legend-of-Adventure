import type { Region } from "../../regions.ts";
import type { EntityType } from "../../types.ts";
import type { BehaviorClass } from "./behavior.ts";
import { NpcEntity } from "./npcEntity.ts";
import { Sheep } from "./species/sheep.ts";

/** Species with ported behaviors. Grows as species are ported. */
const SPECIES: Partial<Record<EntityType, BehaviorClass>> = {
  sheep: Sheep,
};

/**
 * Instantiates a behavior-driven NPC for `type`, or null when the species'
 * behaviors haven't been ported yet (callers fall back to the inert
 * VirtualEntity placeholder).
 */
export function createNpc(type: EntityType, region: Region): NpcEntity | null {
  const species = SPECIES[type];
  if (!species) {
    return null;
  }
  return new NpcEntity(type, region, species);
}
