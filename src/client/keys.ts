import EventTarget from "./events.ts";

const keyUpHandler = new EventTarget<Record<string, []>>();
const keyDownHandler = new EventTarget<Record<string, []>>();

export const keys = {
  leftArrow: false,
  upArrow: false,
  rightArrow: false,
  downArrow: false,
};

function keypress(e: KeyboardEvent, set: boolean) {
  switch (e.code) {
    case "ArrowLeft":
    case "KeyA":
      keys.leftArrow = set;
      break;
    case "ArrowUp":
    case "KeyW":
      keys.upArrow = set;
      break;
    case "ArrowRight":
    case "KeyD":
      keys.rightArrow = set;
      break;
    case "ArrowDown":
    case "KeyS":
      keys.downArrow = set;
      break;

    default:
      (set ? keyDownHandler : keyUpHandler).fire(e.code);
  }
}
window.addEventListener("keydown", function (e) {
  keypress(e, true);
});
window.addEventListener("keyup", function (e) {
  keypress(e, false);
});

export const up = keyUpHandler;
export const down = keyDownHandler;
