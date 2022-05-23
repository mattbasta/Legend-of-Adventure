import * as comm from "./comm";
import * as inventory from "./inventory";
import * as images from "./images";
import * as level from "./level";
import * as keys from "./keys";
import * as player from "./player";

const canvas = document.getElementById("canvas_inventory") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;
ctx.font = "20px VT323";
ctx.fillStyle = "white";

var selected = false;
var hovering = -1;

canvas.addEventListener("mouseleave", function (e) {
  hovering = -1;
  redraw();
});
canvas.addEventListener("mousemove", function (e) {
  var oldHover = hovering;
  var x = e.clientX,
    y = window.innerHeight - e.pageY;
  if (x < 80) {
    hovering = 0;
  } else if (y > 14) {
    hovering = ((x - 26) / 64) | 0;
  } else {
    hovering = -1;
  }
  if (hovering === oldHover) return;
  if (hovering !== -1) inventory.setSelected(hovering);
  redraw();
});

comm.messages.on("inv", function () {
  redraw();
});

function useDown() {
  selected = true;
  redraw();
}
function useUp() {
  selected = false;
  redraw();
}
canvas.addEventListener("mousedown", useDown);
canvas.addEventListener("mouseup", function () {
  inventory.activateSelected();
  useUp();
});

keys.down.on(76, useDown); // L
keys.up.on(76, useUp);

keys.down.on(32, useDown); // Space
keys.up.on(32, useUp);

var weapon_prefixes = {
  plain: ["Plain", 0],
  forged: ["Forged", 1],
  sharp: ["Sharp", 2],
  broad: ["Broad", 3],
  old: ["Old", 4],
  leg: ["Legendary", 5],
  fla: ["Flaming", 6],
  agile: ["Agile", 7],
  bane: ["Baneful", 8],
  ench: ["Enchanted", 9],
  evil: ["Evil", 10],
  spite: ["Spiteful", 11],
  ether: ["Ether", 12],
  ancie: ["Ancient", 13],
};
var weapon_order = ["sw", "bo", "ma", "ax", "ha", "st"];
var weapon_prefixes_order = [
  "plain",
  "forged",
  "sharp",
  "broad",
  "old",
  "leg",
  "fla",
  "agile",
  "bane",
  "ench",
  "evil",
  "spite",
  "ether",
  "ancie",
];

function doRedraw(inventoryImg: HTMLImageElement, itemsImg: HTMLImageElement) {
  ctx.clearRect(0, 0, 374, 85);

  function draw_item(
    x: number,
    y: number,
    h: number,
    w: number,
    code: string | null
  ) {
    if (!code) return;
    let sy = 0;
    let sx = 0;
    let modifier;
    if (code[0] == "w") {
      // Weapons have special codes to allow modifiers
      const attributes = code.substr(1).split(".");
      sx = weapon_prefixes_order.indexOf(attributes[1]) * 24 + 5 * 24;
      sy = weapon_order.indexOf(attributes[0]) * 24;

      modifier = attributes[2];
    } else {
      const c = parseInt(code.substr(1), 10);
      sx = (c % 5) * 24;
      sy = Math.floor(c / 5) * 24;
      if (code[0] === "p") {
        sy += 120;
      }
    }
    ctx.drawImage(itemsImg, sx, sy, 24, 24, x, y, w, h);

    if (modifier) {
      const modifierWidth = ctx.measureText(modifier);
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(
        34 + x - modifierWidth.width - 19,
        51,
        modifierWidth.width + 9,
        19
      );
      ctx.fillStyle = "#fff";
      ctx.fillText(modifier, 34 + x - modifierWidth.width - 15, 66);
    }
  }

  const slots = inventory.getContents();

  for (let i = 0; i < 5; i++) {
    let sx = 0;

    let countWidth = { width: 0 };
    const count = inventory.getCount(i);
    if (count > 0) {
      countWidth = ctx.measureText(String(count));
    }

    if (i === 0) {
      if (hovering === 0) sx = selected ? 240 : 160;
      // else if (s == i)
      //     sx = 80;
      else if (hovering === -1 && selected) sx = 240;
      ctx.drawImage(inventoryImg, sx, 0, 80, 80, 0, 0, 80, 80);
      if (slots[i]) {
        draw_item(10, 10, 60, 60, slots[i]);
        if (count && count !== 1) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          ctx.fillRect(
            10 + 76 - countWidth.width - 25,
            9,
            countWidth.width + 10,
            19
          );
          ctx.fillStyle = "#fff";
          ctx.fillText(String(count), 10 + 76 - countWidth.width - 20, 24);
        }
      }
    } else {
      if (hovering === i) sx = selected ? 192 : 128;
      // else if(s == i)
      //     sx = 64;
      ctx.drawImage(
        inventoryImg,
        sx + (i > 1 ? 32 : 0),
        80,
        16,
        64,
        26 + i * 64,
        14,
        16,
        64
      );
      ctx.drawImage(
        inventoryImg,
        sx + (i < 4 ? 16 : 48),
        80,
        16,
        64,
        74 + i * 64,
        14,
        16,
        64
      );
      if (slots[i]) {
        draw_item(34 + i * 64, 22, 48, 48, slots[i]);
        if (count && count !== 1) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          ctx.fillRect(
            34 + i * 64 + 64 - countWidth.width - 20,
            19,
            countWidth.width + 10,
            19
          );
          ctx.fillStyle = "#fff";
          ctx.fillText(
            String(count),
            34 + i * 64 + 64 - countWidth.width - 15,
            34
          );
        }
      }
    }
  }

  // Redraw the health bar.
  let health = (player.getHealth() / 10) * 14;
  let health_x = 0;
  function get_y() {
    if (!player.healthIsLow()) return 2;
    return Math.random() * 10 < 3 ? Math.random() * 4 - 2 : 2;
  }
  while (health - 14 > 0) {
    ctx.drawImage(
      inventoryImg,
      65,
      144,
      13,
      13,
      84 + health_x,
      get_y(),
      13,
      13
    );
    health_x += 14;
    health -= 14;
  }
  ctx.drawImage(
    inventoryImg,
    65,
    144,
    health,
    13,
    84 + health_x,
    get_y(),
    health,
    13
  );
}

var waiting = false;
export async function redraw() {
  if (waiting) return;
  waiting = true;
  const [inventoryImg, itemsImg] = await images.waitFor("inventory", "items");
  waiting = false;
  doRedraw(inventoryImg, itemsImg);
}

redraw();

level.on("redraw", redraw);
