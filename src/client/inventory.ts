import * as comm from "./comm.ts";
import * as keys from "./keys.ts";

type ItemSlot = string | null;
const slots: [ItemSlot, ItemSlot, ItemSlot, ItemSlot, ItemSlot] = [
  null,
  null,
  null,
  null,
  null,
];
const count = [0, 0, 0, 0, 0];
let selected = 0;

// Inventory update
comm.messages.on("inv", (body) => {
  body.split("\n").forEach(function (item) {
    const lined = item.split(":") as [string, string, string];
    const position = parseInt(lined[0], 10);
    slots[position] = lined[1] || null;
    count[position] = parseInt(lined[2], 10);
  });
});

function incrSel(incr: number) {
  // Wrap in [0, slots.length) even for negative increments.
  selected = (selected + incr + slots.length) % slots.length;
}

keys.up.on("KeyK", function () {
  comm.send("cyc", "f");
  incrSel(1);
});
keys.up.on("KeyJ", function () {
  comm.send("cyc", "b");
  incrSel(-1);
});

function useSelected() {
  comm.send("use", "0");
}
keys.up.on("KeyL", useSelected);
keys.up.on("Space", useSelected);

function dropSelected() {
  comm.send("dro", "0");
}
keys.up.on("KeyQ", dropSelected);
keys.up.on("KeyU", dropSelected);

export const activateSelected = () => {
  if (!slots[selected]) return;
  comm.send("use", String(selected));
};
export const getSelected = () => {
  return selected;
};
export const setSelected = (sel: number) => {
  selected = sel;
};
export const getContents = () => [...slots];
export const getCount = (i: number) => count[i]!;
