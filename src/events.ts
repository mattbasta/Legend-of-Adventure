import { Entity } from "./types";

export enum EventType {
  // A new entity has entered the region.
  //   Body: Entity description information
  REGION_ENTRANCE = "add",
  // An entity has left the region.
  //   Body: empty
  REGION_EXIT = "del",
  // An entity has spawned another entity. An appropriate spawning behavior
  // should be implemented by the client. The Origin is the spawning entity.
  //   Body: New entity information
  SPAWN = "spn",
  // The Origin entity has died. An appropriate death behavior should be
  // implemented by the client. This event extends `REGION_EXIT`.
  //   Body: empty
  DEATH = "ded",
  // A property update for an entity.
  ENTITY_UPDATE = "epu",
  // A communication between two entities. If the Origin is nil, the message
  // is a console message.
  //   Body: x y body
  CHAT = "cha",
  // An event which signifies damage to nearby entities caused by an entity
  // attack. Damage is to be calculated by those within the radius.
  //   Body: x y radius spread item_code
  //     radius: Radius is tile units of the attack (splash radius)
  //     spread: {0: linear, 1: solid}
  //     item_code: The full code for the item producing the attack
  SPLASH_ATTACK = "sak",
  // An event which signifies damage to a single point caused by an entity
  // attack. Damage is to be calculated by the attacked.
  //    Body: x y item_code
  DIRECT_ATTACK = "dak",
  // A sound command.
  //   Body: sound_id:x:y
  //     sound_id: The ID of the sound to play
  //     (other properties are the same as `SPLASH_ATTACK`)
  SOUND = "snd",
  // Inventory update command. The `target_id` entity is expected to collect
  // the item. If the item cannot be given, the target should spawn the item
  // as an entity.
  //   Body: target_id item_code
  GIVE = "giv",
  // Particle spawn command.
  //   Body: x y color diameter ticks constructor[ entity][\n ...]
  PARTICLE = "par",
  // Particle macro command.
  //   Body: x y macro repeat[ entity][\n ...]
  PARTICLE_MACRO = "pma",
  // Effect set command
  //   Body: <effect name>
  EFFECT = "efx",
  // Effect set command
  EFFECT_CLEAR = "efc",
}

export class Event {
  type: EventType;
  body: string;
  origin: Entity | null;

  constructor(type: EventType, body: string, origin: Entity | null = null) {
    this.type = type;
    this.body = body;
    this.origin = origin;
  }

  toString() {
    return `${this.type}evt:${this.origin?.eid ?? ""}\n${this.body}`;
  }
}
