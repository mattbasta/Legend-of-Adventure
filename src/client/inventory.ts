import * as comm from "./comm";
import * as keys from "./keys";

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
    count[position] = parseInt(lined[2], 0);
  });
});

function incrSel(incr: number) {
  selected += incr;
  selected %= slots.length;
}

keys.up.on(75, function () {
  // K
  comm.send("cyc", "f");
  incrSel(1);
});
keys.up.on(74, function () {
  // J
  comm.send("cyc", "b");
  incrSel(-1);
});

function useSelected() {
  comm.send("use", "0");
}
keys.up.on(76, useSelected); // L
keys.up.on(32, useSelected); // Space

function dropSelected() {
  comm.send("dro", "0");
}
keys.up.on(81, dropSelected); // Q
keys.up.on(85, dropSelected); // U

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
export const getCount = (i: number) => count[i];
