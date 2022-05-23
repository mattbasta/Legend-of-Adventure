import * as comm from "./comm";
import settings from "./settings";

const outputCanvas = document.getElementById(
  "output_full"
) as HTMLCanvasElement;

// Effects
comm.messages.on("efx", (body) => {
  outputCanvas.style.transform = "";
  outputCanvas.style.webkitTransform = "";
  settings.effect = body;

  if (body === "flip") {
    outputCanvas.style.transform = "scale(1, -1)";
  }
});
// Clear Effects
comm.messages.on("efc", () => {
  settings.effect = null;
  outputCanvas.style.transform = "";
});
