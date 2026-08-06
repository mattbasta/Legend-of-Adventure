import type { EntityType } from "../../types.ts";
import type { BehaviorClass } from "./behavior.ts";
import { Sheep } from "./species/sheep.ts";

/**
 * Species whose behaviors have been ported. Types absent from this map still
 * spawn, but as inert placeholders (see Region.spawn) until their behaviors
 * land.
 */
const SPECIES: Partial<Record<EntityType, BehaviorClass>> = {
  sheep: Sheep,
};

export function behaviorFor(type: EntityType): BehaviorClass | undefined {
  return SPECIES[type];
}
