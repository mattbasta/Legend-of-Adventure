import { z } from "zod";

import { type Event, EventType } from "./events.ts";

/**
 * Runtime parsers for event bodies.
 *
 * Events arrive as opaque strings in the wire format documented on
 * `EventBodies`. Rather than scattering `split`/`parseFloat` (and the
 * `isNaN` checks that have to follow each one) across every consumer, each
 * event type declares a schema that turns its body into structured data.
 * The result is a discriminated union, so `switch (parsed.type)` narrows the
 * body to that type's fields.
 */

/** parseFloat semantics (not Number's), so "" and "abc" are rejected. */
const asFloat = (raw: string | undefined) => parseFloat(raw ?? "");
const isFinitePair = ({ x, y }: { x: number; y: number }) =>
  Number.isFinite(x) && Number.isFinite(y);

/** `<json>\n<x> <y>` — an entity description plus its position. */
const positionedBody = z
  .string()
  .transform((body) => {
    const newline = body.indexOf("\n");
    const [x, y] = (newline === -1 ? "" : body.slice(newline + 1)).split(" ");
    return {
      description: newline === -1 ? body : body.slice(0, newline),
      x: asFloat(x),
      y: asFloat(y),
    };
  })
  .refine(isFinitePair, "expected trailing `<x> <y>` coordinates");

/** `<x> <y> <item_code>` */
const directAttackBody = z
  .string()
  .transform((body) => {
    const [x, y, item] = body.split(" ");
    return { x: asFloat(x), y: asFloat(y), item: item ?? "null" };
  })
  .refine(isFinitePair, "expected `<x> <y> <item_code>`");

/** `<x> <y>\n<message>` */
const chatBody = z
  .string()
  .transform((body) => {
    const newline = body.indexOf("\n");
    const [x, y] = body.slice(0, newline === -1 ? 0 : newline).split(" ");
    return {
      x: asFloat(x),
      y: asFloat(y),
      message: newline === -1 ? "" : body.slice(newline + 1),
    };
  })
  .refine(isFinitePair, "expected `<x> <y>\\n<message>`");

const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(EventType.REGION_ENTRANCE),
    body: positionedBody,
  }),
  z.object({ type: z.literal(EventType.SPAWN), body: positionedBody }),
  z.object({ type: z.literal(EventType.ENTITY_UPDATE), body: positionedBody }),
  z.object({ type: z.literal(EventType.REGION_EXIT), body: z.string() }),
  z.object({ type: z.literal(EventType.DEATH), body: z.string() }),
  z.object({ type: z.literal(EventType.CHAT), body: chatBody }),
  z.object({
    type: z.literal(EventType.DIRECT_ATTACK),
    body: directAttackBody,
  }),
  z.object({ type: z.literal(EventType.SPLASH_ATTACK), body: z.string() }),
  z.object({ type: z.literal(EventType.SOUND), body: z.string() }),
  z.object({ type: z.literal(EventType.GIVE), body: z.string() }),
  z.object({ type: z.literal(EventType.PARTICLE), body: z.string() }),
  z.object({ type: z.literal(EventType.PARTICLE_MACRO), body: z.string() }),
  z.object({ type: z.literal(EventType.EFFECT), body: z.string() }),
  z.object({ type: z.literal(EventType.EFFECT_CLEAR), body: z.string() }),
]);

export type ParsedEvent = z.infer<typeof eventSchema>;

// Broadcasts fan out to every entity in a region, so the same event is
// parsed by many recipients; memoize per event object.
const parseCache = new WeakMap<Event, ParsedEvent | null>();

/**
 * Convenience for the many entities that only care about being hit: returns
 * the attack's coordinates and weapon, or null for any other event.
 */
export function parseDirectAttack(
  event: Event,
): { x: number; y: number; item: string } | null {
  const parsed = parseEvent(event);
  return parsed?.type === EventType.DIRECT_ATTACK ? parsed.body : null;
}

/** Returns the event's structured body, or null if it is malformed. */
export function parseEvent(event: Event): ParsedEvent | null {
  const cached = parseCache.get(event);
  if (cached !== undefined) {
    return cached;
  }
  const result = eventSchema.safeParse({ type: event.type, body: event.body });
  const parsed = result.success ? result.data : null;
  parseCache.set(event, parsed);
  return parsed;
}
