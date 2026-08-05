import * as comm from "./comm.ts";
// Circular with playerStatsOverlay (it draws our health); safe because both
// modules only dereference each other inside event handlers, never at
// module-evaluation time.
import * as playerStatsOverlay from "./playerStatsOverlay.ts";
import * as sound from "./sound.ts";

let health = 100;
let lowHealth: ReturnType<typeof setInterval> | null = null;

comm.messages.on("hea", function (body) {
  var newHealth = parseInt(body, 10);

  if (newHealth < health) {
    sound.playSound("hit_grunt" + ((Math.random() * 4) | 0), 0);
  }

  health = newHealth;

  if (healthIsLow()) {
    if (!lowHealth)
      lowHealth = setInterval(() => playerStatsOverlay.redraw(), 100);
  } else {
    if (lowHealth) clearInterval(lowHealth);
    lowHealth = null;
  }

  playerStatsOverlay.redraw();
});

export const getHealth = () => health;
export const healthIsLow = () => health < 30;
