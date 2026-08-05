import { Event, EventType } from "../events.ts";
import { getRegion } from "../regions.ts";
import { RegionType, WorldType } from "../terrainGen/constants.ts";
import type { Entity } from "../types.ts";

export function sendEntityToLocation(
  entity: Entity,
  parentID: string | WorldType,
  type: RegionType,
  x: number,
  y: number,
  newX: number,
  newY: number,
) {
  const newRegion = getRegion(parentID, type, x, y);

  if (!newRegion) {
    console.error("Requested region that does not exist", parentID, type, x);
    return;
  }

  entity.x = newX;
  entity.y = newY;

  if (newRegion === entity.region) {
    entity.region.broadcast(
      new Event(
        EventType.ENTITY_UPDATE,
        `${entity}\n${entity.x} ${entity.y}`,
        entity,
      ),
    );
    return;
  }

  entity.region.removeEntity(entity);

  entity.region = newRegion;
  newRegion.addEntity(entity);
}
