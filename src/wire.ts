/**
 * Builders for wire-protocol event bodies shared by entity code.
 *
 * ENTITY_UPDATE (`epu`) bodies are `<json>\n<x> <y>`: the JSON carries the
 * property patch and the trailing coordinates let observers do cheap
 * distance gating without parsing the JSON.
 */
export function entityUpdateBody(update: object, x: number, y: number): string {
  return `${JSON.stringify(update)}\n${x} ${y}`;
}
