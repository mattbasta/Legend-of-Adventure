import { Event, EventType } from "./events";
import { Entity } from "./types";

function sayToPlayer(message: string, player: Entity) {
  player.onEvent(new Event(EventType.CHAT, `0 0\n${message}`, null));
}

export function handleCheat(message: string, player: Entity) {
  throw new Error("not implemented");
}
