import * as level from "./level";
import settings from "./settings";

const HITMAP_BUFFER = 1 / settings.tilesize;

type Avatar = {
  height: number;
  width: number;
  x: number;
  y: number;
  hitmap: [number, number, number, number];
};

export function updateAvatarX(
  avatar: Avatar,
  hitmap: level.LevelData["hitmap"] = level.getHitmap()
) {
  const y = (avatar.y - (avatar.height * 0.5) / settings.tilesize) | 0;
  const xLeft = (avatar.x + HITMAP_BUFFER) | 0;
  const xRight =
    (avatar.x + avatar.width / settings.tilesize - HITMAP_BUFFER) | 0;

  let yMin = 0;
  let yMax = hitmap.length;

  for (let i = y; i >= 0; i--) {
    if (hitmap[i][xLeft] || hitmap[i][xRight]) {
      yMin = i + 1;
      break;
    }
  }
  for (let i = y + 1, maplen = hitmap.length; i < maplen; i++) {
    if (hitmap[i][xLeft] || hitmap[i][xRight]) {
      yMax = i;
      break;
    }
  }
  avatar.hitmap[0] = yMin;
  avatar.hitmap[2] = yMax;
}

export function updateAvatarY(
  avatar: Avatar,
  hitmap: level.LevelData["hitmap"] = level.getHitmap()
) {
  const yBottom = (avatar.y - HITMAP_BUFFER) | 0;
  const yTop = (avatar.y - avatar.height / settings.tilesize + HITMAP_BUFFER) | 0;

  const x = (avatar.x + HITMAP_BUFFER) | 0;

  let xMin = 0;
  let xMax = hitmap[yBottom].length;

  for (let i = x - 1; i >= 0; i--) {
    if (hitmap[yBottom][i] || hitmap[yTop][i]) {
      xMin = i + 1;
      break;
    }
  }
  for (let i = x + 1, rowlen = hitmap[yBottom].length; i < rowlen; i++) {
    if (hitmap[yBottom][i] || hitmap[yTop][i]) {
      xMax = i;
      break;
    }
  }
  avatar.hitmap[3] = xMin;
  avatar.hitmap[1] = xMax;
}
