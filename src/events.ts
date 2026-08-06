import type { Entity } from "./types.ts";

export const EventType = {
  // A new entity has entered the region.
  //   Body: Entity description information
  REGION_ENTRANCE: "add",
  // An entity has left the region.
  //   Body: empty
  REGION_EXIT: "del",
  // An entity has spawned another entity. An appropriate spawning behavior
  // should be implemented by the client. The Origin is the spawning entity.
  //   Body: New entity information
  SPAWN: "spn",
  // The Origin entity has died. An appropriate death behavior should be
  // implemented by the client. This event extends `REGION_EXIT`.
  //   Body: empty
  DEATH: "ded",
  // A property update for an entity.
  ENTITY_UPDATE: "epu",
  // A communication between two entities. If the Origin is nil, the message
  // is a console message.
  //   Body: x y body
  CHAT: "cha",
  // An event which signifies damage to nearby entities caused by an entity
  // attack. Damage is to be calculated by those within the radius.
  //   Body: x y radius spread item_code
  //     radius: Radius is tile units of the attack (splash radius)
  //     spread: {0: linear, 1: solid}
  //     item_code: The full code for the item producing the attack
  SPLASH_ATTACK: "sak",
  // An event which signifies damage to a single point caused by an entity
  // attack. Damage is to be calculated by the attacked.
  //    Body: x y item_code
  DIRECT_ATTACK: "dak",
  // A sound command.
  //   Body: sound_id:x:y
  //     sound_id: The ID of the sound to play
  //     (other properties are the same as `SPLASH_ATTACK`)
  SOUND: "snd",
  // Inventory update command. The `target_id` entity is expected to collect
  // the item. If the item cannot be given, the target should spawn the item
  // as an entity.
  //   Body: target_id item_code
  GIVE: "giv",
  // Particle spawn command.
  //   Body: x y color diameter ticks constructor[ entity][\n ...]
  PARTICLE: "par",
  // Particle macro command.
  //   Body: x y macro repeat[ entity][\n ...]
  PARTICLE_MACRO: "pma",
  // Effect set command
  //   Body: <effect name>
  EFFECT: "efx",
  // Effect set command
  EFFECT_CLEAR: "efc",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

/**
 * The body format each event type carries on the wire, as far as the type
 * system can usefully express it. Types whose bodies are free-form or may
 * repeat over several newline-separated lines stay `string`; the rest get a
 * template literal type so malformed bodies are a compile error rather than
 * a client-side parse failure at runtime.
 *
 * `src/eventParsing.ts` holds the matching runtime parsers.
 */
export interface EventBodies {
  // <entity json>\n<x> <y>
  [EventType.REGION_ENTRANCE]: `${string}\n${number} ${number}`;
  [EventType.SPAWN]: `${string}\n${number} ${number}`;
  [EventType.ENTITY_UPDATE]: `${string}\n${number} ${number}`;
  // The eid of the departed entity.
  [EventType.REGION_EXIT]: string;
  [EventType.DEATH]: "";
  // <x> <y>\n<message>
  [EventType.CHAT]: `${number} ${number}\n${string}`;
  // x y radius spread item_code
  [EventType.SPLASH_ATTACK]: `${number} ${number} ${number} ${number} ${string}`;
  // x y item_code
  [EventType.DIRECT_ATTACK]: `${number} ${number} ${string}`;
  // sound_id:x:y
  [EventType.SOUND]: `${string}:${number}:${number}`;
  // target_id item_code
  [EventType.GIVE]: `${string} ${string}`;
  // One or more newline-separated particle specs.
  [EventType.PARTICLE]: string;
  [EventType.PARTICLE_MACRO]: string;
  // The effect's name.
  [EventType.EFFECT]: string;
  [EventType.EFFECT_CLEAR]: "";
}

/**
 * A single event on the wire.
 *
 * The type parameter is inferred from the constructor's first argument, so
 * each event type only accepts bodies in its own format. Consumers that hold
 * arbitrary events can keep writing `Event`, which defaults to "any type"
 * and whose body is the union of every format.
 */
export class Event<T extends EventType = EventType> {
  readonly type: T;
  readonly body: EventBodies[T];
  readonly origin: Entity | null;

  constructor(type: T, body: EventBodies[T], origin: Entity | null = null) {
    this.type = type;
    this.body = body;
    this.origin = origin;
  }

  toString() {
    return `${this.type}evt:${this.origin?.eid ?? ""}\n${this.body}`;
  }
}
