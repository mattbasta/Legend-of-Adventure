import { Event, EventType } from "./events";
import { Entity } from "./types";

function sayToPlayer(message: string, player: Entity) {
  player.onEvent(new Event(EventType.CHAT, `0 0\n${message}`, null));
}

export function handleCheat(message: string, player: Entity) {
  if (!message.startsWith("/")) {
    return false;
  }
  // Command handling is not yet ported from legacy/cheats.go. Swallow the
  // message so it is neither broadcast as chat nor crashes the ws handler.
  sayToPlayer("Unknown command", player);
  return true;
}
