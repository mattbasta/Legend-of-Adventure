import * as comm from "./comm";
import * as sound from "./sound";

let health = 100;
let lowHealth: NodeJS.Timer | null = null;

comm.messages.on("hea", function (body) {
  var newHealth = parseInt(body, 10);

  if (newHealth < health) {
    sound.playSound("hit_grunt" + ((Math.random() * 4) | 0), 0);
  }

  health = newHealth;

  if (healthIsLow()) {
    if (!lowHealth)
      lowHealth = setInterval(require("./playerStatsOverlay").redraw, 100);
  } else {
    clearInterval(lowHealth!);
    lowHealth = null;
  }

  require("./playerStatsOverlay").redraw();
});

export const getHealth = () => health;
export const healthIsLow = () => health < 30;
