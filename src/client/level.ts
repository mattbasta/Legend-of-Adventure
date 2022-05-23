import * as canvases from "./canvases";
import * as comm from "./comm";
import * as entities from "./entities";
import EventTarget from "./events";
import { GameImages } from "./images";
import settings from "./settings";

let offsetX = 0;
let offsetY = 0;
let offsetW = document.body.offsetWidth;
let offsetH = document.body.offsetHeight;

const tilesize = settings.tilesize;

export type LevelData = {
  h: number;
  w: number;
  x: number;
  y: number;

  can_slide: boolean;

  tileset: GameImages;
  level: Array<Array<number>>;
  hitmap: Array<Array<0 | 1>>;
  portals: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    target: string;
  }>;
};

const levelEvents = new EventTarget<{
  pause: [];
  unload: [];
  unpause: [];
  redraw: [];
  newLevel: [number, number, LevelData["hitmap"]];
  stateUpdated: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];
}>();

window.addEventListener("resize", () => {
  offsetW = document.body.offsetWidth;
  offsetH = document.body.offsetHeight;
  setCenterPosition();
});

let levelData: LevelData;

export function setCenterPosition() {
  var level_h = levelData.h * tilesize;
  var level_w = levelData.w * tilesize;

  // Resize the terrain canvas if the window size has changed.
  var output_buffer = canvases.getCanvas("output");
  output_buffer.height = offsetH;
  output_buffer.width = offsetW;

  if (offsetH > level_h) offsetY = ((offsetH / 2 - level_h / 2) | 0) * -1;
  if (offsetW > level_w) offsetX = ((offsetW / 2 - level_w / 2) | 0) * -1;

  var avatar = entities.getFollowing();
  var x = avatar.x * tilesize;
  var y = avatar.y * tilesize;

  var c_offsetw = offsetW,
    c_offseth = offsetH;

  var temp;

  if (level_w > c_offsetw) {
    // The scene isn't narrower than the canvas

    var half_w = c_offsetw / 2;

    if (x < half_w) {
      offsetX = 0;
    } else if (x > (temp = level_w - half_w)) {
      offsetX = temp - half_w;
    } else {
      offsetX = x - half_w;
    }
  } else {
    offsetX = (c_offsetw / 2 - level_w / 2) * -1;
  }

  offsetX = offsetX | 0;

  if (level_h > c_offseth) {
    // The scene isn't narrower than the canvas

    var half_h = c_offseth / 2;

    if (y < half_h) {
      offsetY = 0;
    } else if (y > (temp = level_h - half_h)) {
      offsetY = temp - half_h;
    } else {
      offsetY = y - half_h;
    }
  } else {
    offsetY = (c_offseth / 2 - level_h / 2) * -1;
  }

  offsetY = offsetY | 0;

  var n_x = offsetX * -1;
  var n_y = offsetY * -1;

  levelEvents.fire(
    "stateUpdated",
    offsetX,
    offsetY,
    Math.min(output_buffer.clientWidth, level_w),
    Math.min(output_buffer.clientHeight, level_h),
    Math.max(n_x, 0),
    Math.max(n_y, 0),
    Math.min(output_buffer.clientWidth, level_w),
    Math.min(output_buffer.clientHeight, level_h)
  );
}

let alreadyListening = false;
async function registerLevel(position?: string) {
  if (alreadyListening) {
    return;
  }
  unload();
  alreadyListening = true;
  await comm.ready;
  if (position) {
    comm.send("lev", position);
  }
  const [body] = await comm.messages.waitFor("lev");
  alreadyListening = false;
  prepare(JSON.parse(body));
}

// Location change notification
comm.messages.on("flv", function () {
  registerLevel(); // We want to strip the args.
  unload();
});

function prepare(data: LevelData) {
  levelData = data;
  canvases.setSizes(data.w * tilesize, data.h * tilesize);
  levelEvents.fire("newLevel", data.w, data.h, data.hitmap);

  init();
}

function init() {
  setCenterPosition();
  levelEvents.fire("redraw");
  // Start everything back up
  setCenterPosition();
  console.log("Unpausing game");
  levelEvents.fire("unpause");
}

function unload() {
  // Remove everything level-specific
  console.log("Pausing game");
  levelEvents.fire("pause");
  levelEvents.fire("unload");
}

// Bind initial startup handlers.
registerLevel();

export const load = (x: number, y: number) => {
  registerLevel(`${x}:${y}`);
};
export const canSlide = () => levelData.can_slide;
export const getTileset = () => levelData.tileset;
export const getHitmap = () => levelData.hitmap;
export const getTerrain = () => levelData.level;
export const getX = () => levelData.x;
export const getY = () => levelData.y;
export const getW = () => levelData.w;
export const getH = () => levelData.h;
export const getPortals = () => levelData.portals;

export const on = levelEvents.endpoint().on;
